import fs from 'fs';

const testContent = `/**
 * Integration tests for CompositeToolExecutionService
 *
 * Run with: pnpm --filter service-server exec jest compositeToolExecutionService
 */

import { CompositeToolExecutionService } from '../../src/services/agents/execution/compositeToolExecutionService';
import type { CompositeToolStep } from '../../src/services/agents/execution/compositeToolExecutionService';

jest.mock('../../src/lib/prisma', () => ({
  prisma: { compositeTool: { findUnique: jest.fn() } },
}));
jest.mock('../../src/lib/openai', () => ({
  openai: { chat: { completions: { create: jest.fn() } } },
}));
jest.mock('../../src/utils/ai/agentUsageTracking', () => ({
  updateAgentUsage: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/services/agents/execution/codeExecutor', () => ({
  CodeExecutorService: jest.fn().mockImplementation(() => ({ execute: jest.fn() })),
}));
jest.mock('../../src/lib/logger', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { prisma } from '../../src/lib/prisma';
import { openai } from '../../src/lib/openai';
import { CodeExecutorService } from '../../src/services/agents/execution/codeExecutor';

const mockLlm = (content: string) =>
  (openai.chat.completions.create as jest.Mock).mockResolvedValueOnce({
    choices: [{ message: { content } }],
    usage: { prompt_tokens: 5, completion_tokens: 5 },
  });

const mockTool = (steps: CompositeToolStep[]) =>
  (prisma.compositeTool.findUnique as jest.Mock).mockResolvedValue({
    id: 'tool-001',
    name: 'Test Tool',
    steps,
    functionSchema: { parameters: { properties: {} } },
  });

const USER = 'user-test-001';

describe('CompositeToolExecutionService', () => {
  let svc: CompositeToolExecutionService;
  let codeExec: { execute: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new CompositeToolExecutionService();
    codeExec = (CodeExecutorService as jest.Mock).mock.instances[0] as any;
  });

  it('throws when the tool does not exist', async () => {
    (prisma.compositeTool.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(svc.execute('ghost', {}, USER)).rejects.toThrow('not found');
  });

  it('returns success with null output when steps array is empty', async () => {
    mockTool([]);
    const r = await svc.execute('tool-001', {}, USER);
    expect(r.success).toBe(true);
    expect(r.output).toBeNull();
    expect(r.steps).toEqual({});
  });

  it('executes an LLM step and stores the completion result', async () => {
    mockTool([{ id: 's1', name: 'S1', type: 'LLM', config: { prompt: 'Hello', model: 'gpt-4o-mini' } }]);
    mockLlm('Hello back!');
    const r = await svc.execute('tool-001', {}, USER);
    expect(r.success).toBe(true);
    expect(r.steps['s1']).toBe('Hello back!');
  });

  it('resolves template placeholders in LLM prompts from input params', async () => {
    mockTool([{ id: 's1', name: 'S1', type: 'LLM', config: { prompt: 'Hi {{params.name}}', model: 'gpt-4o-mini' } }]);
    mockLlm('Hi Alice');
    await svc.execute('tool-001', { name: 'Alice' }, USER);
    const call = (openai.chat.completions.create as jest.Mock).mock.calls[0][0];
    const userMsg = call.messages.find((m: any) => m.role === 'user');
    expect(userMsg?.content).toBe('Hi Alice');
  });

  it('executes a JAVASCRIPT step and stores the result', async () => {
    mockTool([{ id: 'compute', name: 'Compute', type: 'JAVASCRIPT', config: { code: 'result = 84;' } }]);
    codeExec.execute.mockResolvedValue({ success: true, result: 84, logs: [] });
    const r = await svc.execute('tool-001', {}, USER);
    expect(r.success).toBe(true);
    expect(r.steps['compute']).toBe(84);
  });

  it('returns a failed result when a JAVASCRIPT step errors', async () => {
    mockTool([{ id: 'bad', name: 'Bad', type: 'JAVASCRIPT', config: { code: 'throw err' } }]);
    codeExec.execute.mockResolvedValue({ success: false, logs: [], error: { type: 'RUNTIME', message: 'boom' } });
    const r = await svc.execute('tool-001', {}, USER);
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/boom/);
  });

  it('executes a PYTHON step and stores the result', async () => {
    mockTool([{ id: 'py', name: 'Py', type: 'PYTHON', config: { code: 'result = {"x": 1}' } }]);
    codeExec.execute.mockResolvedValue({ success: true, result: { x: 1 }, logs: [] });
    const r = await svc.execute('tool-001', {}, USER);
    expect(r.success).toBe(true);
    expect(r.steps['py']).toEqual({ x: 1 });
  });

  it('passes step 1 output into step 2 via params and variable resolution', async () => {
    mockTool([
      { id: 's1', name: 'S1', type: 'JAVASCRIPT', config: { code: "result = { val: 'hello' }" } },
      { id: 's2', name: 'S2', type: 'LLM', config: { prompt: 'Got: {{params.s1.val}}', model: 'gpt-4o-mini' } },
    ]);
    codeExec.execute.mockResolvedValueOnce({ success: true, result: { val: 'hello' }, logs: [] });
    mockLlm('Got: hello');
    const r = await svc.execute('tool-001', {}, USER);
    expect(r.success).toBe(true);
    const llmCall = (openai.chat.completions.create as jest.Mock).mock.calls[0][0];
    const userMsg = llmCall.messages.find((m: any) => m.role === 'user');
    expect(userMsg?.content).toBe('Got: hello');
  });

  it('runs a foreach step once per item in the source array', async () => {
    mockTool([
      { id: 'list', name: 'List', type: 'JAVASCRIPT', config: { code: "result = ['a','b','c']" } },
      { id: 'each', name: 'Each', type: 'LLM', config: { prompt: 'Item', model: 'gpt-4o-mini' }, foreach: '{{steps.list}}' },
    ]);
    codeExec.execute.mockResolvedValueOnce({ success: true, result: ['a', 'b', 'c'], logs: [] });
    mockLlm('done-a');
    mockLlm('done-b');
    mockLlm('done-c');
    const r = await svc.execute('tool-001', {}, USER);
    expect(r.success).toBe(true);
    expect(Array.isArray(r.steps['each'])).toBe(true);
    expect((r.steps['each'] as any[]).length).toBe(3);
    expect(openai.chat.completions.create).toHaveBeenCalledTimes(3);
  });

  it('emits thinking and complete progress events', async () => {
    mockTool([{ id: 's1', name: 'S1', type: 'LLM', config: { prompt: 'Hi', model: 'gpt-4o-mini' } }]);
    mockLlm('Hi!');
    const types: string[] = [];
    await svc.execute('tool-001', {}, USER, (e) => types.push(e.type));
    expect(types).toContain('thinking');
    expect(types).toContain('complete');
  });

  it('emits an error event when a step fails', async () => {
    mockTool([{ id: 'bad', name: 'Bad', type: 'JAVASCRIPT', config: { code: 'fail' } }]);
    codeExec.execute.mockResolvedValue({ success: false, logs: [], error: { type: 'RUNTIME', message: 'fail' } });
    const types: string[] = [];
    await svc.execute('tool-001', {}, USER, (e) => types.push(e.type));
    expect(types).toContain('error');
  });

  describe('executeOneStep — dispatch table', () => {
    const ctx = () => ({ input: {}, inputs: {}, params: {}, steps: {} });

    it('dispatches JAVASCRIPT type', async () => {
      codeExec.execute.mockResolvedValue({ success: true, result: 7, logs: [] });
      const r = await svc.executeOneStep({ id: 's', name: 'S', type: 'JAVASCRIPT', config: { code: 'result = 7;' } }, ctx(), {}, USER);
      expect(r).toBe(7);
    });

    it('dispatches PYTHON type', async () => {
      codeExec.execute.mockResolvedValue({ success: true, result: 'py', logs: [] });
      const r = await svc.executeOneStep({ id: 's', name: 'S', type: 'PYTHON', config: { code: '' } }, ctx(), {}, USER);
      expect(r).toBe('py');
    });

    it('maps Relevance AI alias python_code_transformation to PYTHON', async () => {
      codeExec.execute.mockResolvedValue({ success: true, result: 'rai', logs: [] });
      const r = await svc.executeOneStep({ id: 's', name: 'S', type: 'python_code_transformation' as any, config: { code: '' } }, ctx(), {}, USER);
      expect(r).toBe('rai');
    });

    it('maps Relevance AI alias prompt_completion to LLM', async () => {
      mockLlm('alias!');
      const r = await svc.executeOneStep({ id: 's', name: 'S', type: 'prompt_completion' as any, config: { prompt: 'x', model: 'gpt-4o-mini' } }, ctx(), {}, USER);
      expect(r).toBe('alias!');
    });

    it('returns null without throwing for unknown step types', async () => {
      const r = await svc.executeOneStep({ id: 's', name: 'S', type: 'TOTALLY_UNKNOWN' as any, config: {} }, ctx(), {}, USER);
      expect(r).toBeNull();
    });
  });
});
`;

fs.writeFileSync(
  'c:/Users/datng/agentflox/apps/backend/__tests__/services/compositeToolExecutionService.test.ts',
  testContent,
  'utf8'
);
console.log('Written');
