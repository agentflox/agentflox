/**
 * Integration tests for CompositeToolExecutionService
 *
 * Run with: pnpm --filter service-server exec jest compositeToolExecutionService
 */

import {
  CompositeToolExecutionService,
  sliceSteps,
} from '../../src/services/agents/execution/compositeToolExecutionService';
import type { CompositeToolStep } from '../../src/services/agents/execution/compositeToolExecutionService';

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    compositeTool: { findUnique: jest.fn() },
    aiModel: { findUnique: jest.fn() },
  },
}));
jest.mock('../../src/lib/openai', () => ({
  initializeOpenAI: jest.fn().mockReturnValue({ chat: { completions: { create: jest.fn() } } }),
  openai: { chat: { completions: { create: jest.fn() } } },
}));
jest.mock('../../src/utils/ai/agentUsageTracking', () => ({
  updateAgentUsage: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/services/agents/execution/codeExecutor');
jest.mock('../../src/services/agents/execution/apiIntegrationExecutor', () => ({
  executeApiIntegrationTool: jest.fn(),
}));
jest.mock('../../src/services/models', () => ({
  getModelBySlug: jest.fn(),
  invokeWithModel: jest.fn(),
}));

jest.mock('../../src/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { prisma } from '../../src/lib/prisma';
import { CodeExecutorService } from '../../src/services/agents/execution/codeExecutor';
import { executeApiIntegrationTool } from '../../src/services/agents/execution/apiIntegrationExecutor';
import { getModelBySlug, invokeWithModel } from '../../src/services/models';

const mockLlm = (content: string) =>
  (invokeWithModel as jest.Mock).mockResolvedValueOnce({ content });

const mockTool = (steps: CompositeToolStep[]) =>
  (prisma.compositeTool.findUnique as jest.Mock).mockResolvedValue({
    id: 'tool-001',
    name: 'Test Tool',
    steps,
    functionSchema: { parameters: { properties: {} } },
  });

const USER = 'user-test-001';

describe('sliceSteps', () => {
  const steps = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

  it('returns all steps when no bounds are set', () => {
    expect(sliceSteps(steps).map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('starts at startStepId inclusive', () => {
    expect(sliceSteps(steps, 'b').map((s) => s.id)).toEqual(['b', 'c', 'd']);
  });

  it('ends at endStepId inclusive', () => {
    expect(sliceSteps(steps, undefined, 'c').map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('runs a single step when start and end match', () => {
    expect(sliceSteps(steps, 'c', 'c').map((s) => s.id)).toEqual(['c']);
  });

  it('returns empty when start is after end', () => {
    expect(sliceSteps(steps, 'd', 'a')).toEqual([]);
  });

  it('ignores unknown ids', () => {
    expect(sliceSteps(steps, 'missing', 'also-missing').map((s) => s.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });
});

describe('CompositeToolExecutionService', () => {
  let svc: CompositeToolExecutionService;
  let mockExecute: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecute = jest.fn();
    (CodeExecutorService as jest.Mock).mockImplementation(() => ({
      execute: mockExecute,
    }));
    (prisma.aiModel.findUnique as jest.Mock).mockResolvedValue(null);
    (getModelBySlug as jest.Mock).mockResolvedValue({ id: 'model-gpt' });
    svc = new CompositeToolExecutionService();
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
    mockTool([
      { id: 's1', name: 'S1', type: 'LLM', config: { prompt: 'Hello', model: 'gpt-4o-mini' } },
    ]);
    mockLlm('Hello back!');
    const r = await svc.execute('tool-001', {}, USER);
    expect(r.success).toBe(true);
    expect(r.steps['s1']).toBe('Hello back!');
  });

  it('resolves template placeholders in LLM prompts from input params', async () => {
    mockTool([
      {
        id: 's1',
        name: 'S1',
        type: 'LLM',
        config: { prompt: 'Hi {{params.name}}', model: 'gpt-4o-mini' },
      },
    ]);
    mockLlm('Hi Alice');
    await svc.execute('tool-001', { name: 'Alice' }, USER);
    const call = (invokeWithModel as jest.Mock).mock.calls[0][0];
    const userMsg = call.messages.find((m: any) => m.role === 'user');
    expect(userMsg?.content).toBe('Hi Alice');
  });

  it('executes a JAVASCRIPT step and stores the result', async () => {
    mockTool([
      { id: 'compute', name: 'Compute', type: 'JAVASCRIPT', config: { code: 'result = 84;' } },
    ]);
    mockExecute.mockResolvedValue({ success: true, result: 84, logs: [] });
    const r = await svc.execute('tool-001', {}, USER);
    expect(r.success).toBe(true);
    expect(r.steps['compute']).toBe(84);
  });

  it('returns a failed result when a JAVASCRIPT step errors', async () => {
    mockTool([{ id: 'bad', name: 'Bad', type: 'JAVASCRIPT', config: { code: 'throw err' } }]);
    mockExecute.mockResolvedValue({
      success: false,
      logs: [],
      error: { type: 'RUNTIME', message: 'boom' },
    });
    const r = await svc.execute('tool-001', {}, USER);
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/boom/);
  });

  it('executes a PYTHON step and stores the result', async () => {
    mockTool([{ id: 'py', name: 'Py', type: 'PYTHON', config: { code: 'result = {"x": 1}' } }]);
    mockExecute.mockResolvedValue({ success: true, result: { x: 1 }, logs: [] });
    const r = await svc.execute('tool-001', {}, USER);
    expect(r.success).toBe(true);
    expect(r.steps['py']).toEqual({ transformed: { x: 1 }, x: 1 });
  });

  it('executes an API step', async () => {
    mockTool([
      {
        id: 'api1',
        name: 'Api',
        type: 'API',
        config: { method: 'GET', url: 'https://example.com' },
      },
    ]);
    (executeApiIntegrationTool as jest.Mock).mockResolvedValue({
      body: { ok: true, status: 200 },
    });
    const r = await svc.execute('tool-001', {}, USER);
    expect(r.success).toBe(true);
    expect(r.steps['api1']).toEqual({ transformed: { ok: true, status: 200 }, ok: true, status: 200 });
    expect(executeApiIntegrationTool).toHaveBeenCalled();
  });

  it('executes BRANCH and LOOP stubs without failing the pipeline', async () => {
    mockTool([
      { id: 'br', name: 'Branch', type: 'BRANCH', config: {} },
      { id: 'lp', name: 'Loop', type: 'LOOP', config: {} },
    ]);
    const r = await svc.execute('tool-001', {}, USER);
    expect(r.success).toBe(true);
    expect(r.steps['br']).toEqual({ status: 'BRANCH stub', transformed: { status: 'BRANCH stub' } });
    expect(r.steps['lp']).toEqual({ status: 'LOOP stub', transformed: { status: 'LOOP stub' } });
  });

  it('runs a mixed pipeline of JS → LLM → Python', async () => {
    mockTool([
      { id: 'js', name: 'js', type: 'JAVASCRIPT', config: { code: 'result = { n: 2 }' } },
      {
        id: 'llm',
        name: 'llm',
        type: 'LLM',
        config: { prompt: 'Double {{params.js.n}}', model: 'gpt-4o-mini' },
      },
      { id: 'py', name: 'py', type: 'PYTHON', config: { code: 'result = {"ok": True}' } },
    ]);
    mockExecute
      .mockResolvedValueOnce({ success: true, result: { n: 2 }, logs: [] })
      .mockResolvedValueOnce({ success: true, result: { ok: true }, logs: [] });
    mockLlm('4');
    const r = await svc.execute('tool-001', {}, USER);
    expect(r.success).toBe(true);
    expect(r.steps['js']).toEqual({ n: 2, transformed: { n: 2 } });
    expect(r.steps['llm']).toBe('4');
    expect(r.steps['py']).toEqual({ transformed: { ok: true }, ok: true });
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(invokeWithModel).toHaveBeenCalledTimes(1);
  });

  it('passes step 1 output into step 2 via params and variable resolution', async () => {
    mockTool([
      { id: 's1', name: 's1', type: 'JAVASCRIPT', config: { code: "result = { val: 'hello' }" } },
      {
        id: 's2',
        name: 's2',
        type: 'LLM',
        config: { prompt: 'Got: {{params.s1.val}}', model: 'gpt-4o-mini' },
      },
    ]);
    mockExecute.mockResolvedValueOnce({ success: true, result: { val: 'hello' }, logs: [] });
    mockLlm('Got: hello');
    const r = await svc.execute('tool-001', {}, USER);
    expect(r.success).toBe(true);
    const llmCall = (invokeWithModel as jest.Mock).mock.calls[0][0];
    const userMsg = llmCall.messages.find((m: any) => m.role === 'user');
    expect(userMsg?.content).toBe('Got: hello');
  });

  it('runs a foreach step once per item in the source array', async () => {
    mockTool([
      { id: 'list', name: 'list', type: 'JAVASCRIPT', config: { code: "result = ['a','b','c']" } },
      {
        id: 'each',
        name: 'each',
        type: 'LLM',
        config: { prompt: 'Item', model: 'gpt-4o-mini' },
        foreach: '{{steps.list}}',
      },
    ]);
    mockExecute.mockResolvedValueOnce({ success: true, result: ['a', 'b', 'c'], logs: [] });
    mockLlm('done-a');
    mockLlm('done-b');
    mockLlm('done-c');
    const r = await svc.execute('tool-001', {}, USER);
    expect(r.success).toBe(true);
    expect(Array.isArray(r.steps['each'])).toBe(true);
    expect((r.steps['each'] as any[]).length).toBe(3);
    expect(invokeWithModel).toHaveBeenCalledTimes(3);
  });

  it('emits thinking and complete progress events', async () => {
    mockTool([
      { id: 's1', name: 'S1', type: 'LLM', config: { prompt: 'Hi', model: 'gpt-4o-mini' } },
    ]);
    mockLlm('Hi!');
    const types: string[] = [];
    await svc.execute('tool-001', {}, USER, (e) => types.push(e.type));
    expect(types).toContain('thinking');
    expect(types).toContain('complete');
  });

  it('emits an error event when a step fails', async () => {
    mockTool([{ id: 'bad', name: 'Bad', type: 'JAVASCRIPT', config: { code: 'fail' } }]);
    mockExecute.mockResolvedValue({
      success: false,
      logs: [],
      error: { type: 'RUNTIME', message: 'fail' },
    });
    const types: string[] = [];
    await svc.execute('tool-001', {}, USER, (e) => types.push(e.type));
    expect(types).toContain('error');
  });

  describe('partial runs (startStepId / endStepId)', () => {
    const threeSteps: CompositeToolStep[] = [
      { id: 'a', name: 'a', type: 'JAVASCRIPT', config: { code: 'result = 1' } },
      { id: 'b', name: 'b', type: 'JAVASCRIPT', config: { code: 'result = 2' } },
      { id: 'c', name: 'c', type: 'JAVASCRIPT', config: { code: 'result = 3' } },
    ];

    it('runs from startStepId to the end', async () => {
      mockTool(threeSteps);
      mockExecute
        .mockResolvedValueOnce({ success: true, result: 2, logs: [] })
        .mockResolvedValueOnce({ success: true, result: 3, logs: [] });
      const r = await svc.execute('tool-001', {}, USER, undefined, { startStepId: 'b' });
      expect(r.success).toBe(true);
      expect(r.steps['a']).toBeUndefined();
      expect(r.steps['b']).toBe(2);
      expect(r.steps['c']).toBe(3);
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    it('runs up to endStepId from the beginning', async () => {
      mockTool(threeSteps);
      mockExecute
        .mockResolvedValueOnce({ success: true, result: 1, logs: [] })
        .mockResolvedValueOnce({ success: true, result: 2, logs: [] });
      const r = await svc.execute('tool-001', {}, USER, undefined, { endStepId: 'b' });
      expect(r.success).toBe(true);
      expect(r.steps['a']).toBe(1);
      expect(r.steps['b']).toBe(2);
      expect(r.steps['c']).toBeUndefined();
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    it('runs only a specific step when start and end match', async () => {
      mockTool(threeSteps);
      mockExecute.mockResolvedValueOnce({ success: true, result: 2, logs: [] });
      const r = await svc.execute('tool-001', {}, USER, undefined, {
        startStepId: 'b',
        endStepId: 'b',
      });
      expect(r.success).toBe(true);
      expect(Object.keys(r.steps).filter((k) => ['a', 'b', 'c'].includes(k))).toEqual(['b']);
      expect(r.steps['b']).toBe(2);
      expect(r.output).toBe(2);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('executeOneStep — dispatch table', () => {
    const ctx = () => ({ input: {}, inputs: {}, params: {}, steps: {} });

    it('dispatches JAVASCRIPT type', async () => {
      mockExecute.mockResolvedValue({ success: true, result: 7, logs: [] });
      const r = await svc.executeOneStep(
        { id: 's', name: 'S', type: 'JAVASCRIPT', config: { code: 'result = 7;' } },
        ctx(),
        {},
        USER,
      );
      expect(r).toBe(7);
    });

    it('dispatches PYTHON type', async () => {
      mockExecute.mockResolvedValue({ success: true, result: 'py', logs: [] });
      const r = await svc.executeOneStep(
        { id: 's', name: 'S', type: 'PYTHON', config: { code: '' } },
        ctx(),
        {},
        USER,
      );
      expect(r).toBe('py');
    });

    it('dispatches API type', async () => {
      (executeApiIntegrationTool as jest.Mock).mockResolvedValue({ body: { status: 201 } });
      const r = await svc.executeOneStep(
        { id: 's', name: 'S', type: 'API', config: { method: 'POST', url: 'https://x.test' } },
        ctx(),
        {},
        USER,
      );
      expect(r).toEqual({ status: 201 });
    });

    it('dispatches BRANCH and LOOP stubs', async () => {
      await expect(
        svc.executeOneStep({ id: 's', name: 'S', type: 'BRANCH', config: {} }, ctx(), {}, USER),
      ).resolves.toEqual({ status: 'BRANCH stub' });
      await expect(
        svc.executeOneStep({ id: 's', name: 'S', type: 'LOOP', config: {} }, ctx(), {}, USER),
      ).resolves.toEqual({ status: 'LOOP stub' });
    });

    it('maps Relevance AI alias python_code_transformation to PYTHON', async () => {
      mockExecute.mockResolvedValue({ success: true, result: 'rai', logs: [] });
      const r = await svc.executeOneStep(
        { id: 's', name: 'S', type: 'python_code_transformation' as any, config: { code: '' } },
        ctx(),
        {},
        USER,
      );
      expect(r).toBe('rai');
    });

    it('maps Relevance AI alias prompt_completion to LLM', async () => {
      mockLlm('alias!');
      const r = await svc.executeOneStep(
        {
          id: 's',
          name: 's',
          type: 'prompt_completion' as any,
          config: { prompt: 'x', model: 'gpt-4o-mini' },
        },
        ctx(),
        {},
        USER,
      );
      expect(r).toBe('alias!');
    });

    it('returns null without throwing for unknown step types', async () => {
      const r = await svc.executeOneStep(
        { id: 's', name: 'S', type: 'TOTALLY_UNKNOWN' as any, config: {} },
        ctx(),
        {},
        USER,
      );
      expect(r).toBeNull();
    });
  });
});
