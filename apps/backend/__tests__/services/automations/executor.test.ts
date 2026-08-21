jest.mock('@/lib/inngest', () => ({
  inngest: { send: jest.fn() },
}));

const prisma = {
  automation: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  automationLog: { create: jest.fn() },
  automationIdempotencyKey: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  customField: { findUnique: jest.fn() },
  customFieldValue: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
  taskComment: { create: jest.fn() },
  taskStatus: { findUnique: jest.fn() },
  task: { update: jest.fn() },
  taskAssignee: { createMany: jest.fn() },
  taskWatcher: { upsert: jest.fn() },
  aiAgent: { findUnique: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma }));

import { executeAutomation, mapRunStatus } from '@/services/automations/executor';
import { createCascadeContext } from '@/services/automations/cascade';

describe('automation executor status', () => {
  it('maps FAILED when nothing succeeded', () => {
    expect(mapRunStatus(0, true, 2)).toBe('FAILED');
  });

  it('maps PARTIAL when some actions succeeded then stopOnError', () => {
    expect(mapRunStatus(1, true, 2)).toBe('PARTIAL');
  });

  it('maps SUCCESS when nothing failed', () => {
    expect(mapRunStatus(2, false, 2)).toBe('SUCCESS');
  });
});

describe('executeAutomation', () => {
  const cascade = createCascadeContext({ rootEventId: 'ae_test' });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.automation.update.mockResolvedValue({});
    prisma.automationLog.create.mockResolvedValue({});
    prisma.automationIdempotencyKey.create.mockResolvedValue({ key: 'k', status: 'PENDING' });
    prisma.automationIdempotencyKey.update.mockResolvedValue({});
  });

  it('fails SET_AI_FIELD when the custom field is missing', async () => {
    prisma.automation.findUnique.mockResolvedValue({
      id: 'auto-1',
      isActive: true,
      ownerId: 'user-1',
      workspaceId: 'ws',
      agentId: null,
      actions: [{ type: 'SET_AI_FIELD', input: { customFieldId: 'missing' } }],
      aiAgent: null,
    });
    prisma.customField.findUnique.mockResolvedValue(null);

    const result = await executeAutomation({
      automationId: 'auto-1',
      taskId: 'task-1',
      cascade,
    });

    expect(result.status).toBe('FAILED');
    expect(result.error).toBe('custom_field_missing');
  });

  it('does not duplicate a comment when the action idempotency key already completed', async () => {
    prisma.automation.findUnique.mockResolvedValue({
      id: 'auto-2',
      isActive: true,
      ownerId: 'user-1',
      workspaceId: 'ws',
      agentId: null,
      actions: [{ type: 'ADD_COMMENT', input: { content: 'hello' } }],
      aiAgent: null,
    });
    prisma.automationIdempotencyKey.create.mockRejectedValue(new Error('unique'));
    prisma.automationIdempotencyKey.findUnique.mockResolvedValue({
      key: 'k',
      status: 'COMPLETED',
      result: { ok: true, detail: { posted: true } },
    });

    const result = await executeAutomation({
      automationId: 'auto-2',
      taskId: 'task-1',
      cascade,
    });

    expect(result.status).toBe('SUCCESS');
    expect(prisma.taskComment.create).not.toHaveBeenCalled();
  });

  it('returns PARTIAL when the first action succeeds and the next fails with stopOnError', async () => {
    prisma.automation.findUnique.mockResolvedValue({
      id: 'auto-3',
      isActive: true,
      ownerId: 'user-1',
      workspaceId: 'ws',
      agentId: null,
      actions: [
        { type: 'ADD_COMMENT', input: { content: 'ok' } },
        { type: 'SET_AI_FIELD', input: { customFieldId: 'missing' } },
      ],
      aiAgent: null,
    });
    prisma.taskComment.create.mockResolvedValue({ id: 'c1' });
    prisma.customField.findUnique.mockResolvedValue(null);

    const result = await executeAutomation({
      automationId: 'auto-3',
      taskId: 'task-1',
      cascade,
      stopOnError: true,
    });

    expect(result.status).toBe('PARTIAL');
    expect(prisma.taskComment.create).toHaveBeenCalledTimes(1);
  });

  it('executes LAUNCH_AI_AGENT and dispatches inngest event', async () => {
    const { inngest } = await import('@/lib/inngest');
    prisma.automation.findUnique.mockResolvedValue({
      id: 'auto-agent',
      isActive: true,
      ownerId: 'user-1',
      workspaceId: 'ws-1',
      agentId: 'agent-123',
      actions: [{ type: 'LAUNCH_AI_AGENT', input: { prompt: 'Auto triage this task' } }],
      aiAgent: { id: 'agent-123', isActive: true, isPaused: false },
    });
    prisma.aiAgent.findUnique.mockResolvedValue({ id: 'agent-123', isActive: true, isPaused: false });

    const result = await executeAutomation({
      automationId: 'auto-agent',
      taskId: 'task-99',
      cascade,
    });

    expect(result.status).toBe('SUCCESS');
    expect(inngest.send).toHaveBeenCalledWith({
      name: 'agent/executor.requested',
      data: expect.objectContaining({
        agentId: 'agent-123',
        message: expect.stringContaining('Auto triage this task'),
        userId: 'user-1',
      }),
    });
  });

  it('executes UPDATE_STATUS action', async () => {
    prisma.automation.findUnique.mockResolvedValue({
      id: 'auto-status',
      isActive: true,
      ownerId: 'user-1',
      workspaceId: 'ws',
      actions: [{ type: 'UPDATE_STATUS', input: { statusId: 'status-done' } }],
      aiAgent: null,
    });
    prisma.taskStatus.findUnique.mockResolvedValue({ id: 'status-done' });

    const result = await executeAutomation({
      automationId: 'auto-status',
      taskId: 'task-1',
      cascade,
    });

    expect(result.status).toBe('SUCCESS');
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { statusId: 'status-done' },
    });
  });

  it('executes ADD_ASSIGNEE action', async () => {
    prisma.automation.findUnique.mockResolvedValue({
      id: 'auto-assign',
      isActive: true,
      ownerId: 'user-1',
      workspaceId: 'ws',
      actions: [{ type: 'ADD_ASSIGNEE', input: { userId: 'user-2' } }],
      aiAgent: null,
    });

    const result = await executeAutomation({
      automationId: 'auto-assign',
      taskId: 'task-1',
      cascade,
    });

    expect(result.status).toBe('SUCCESS');
    expect(prisma.taskAssignee.createMany).toHaveBeenCalledWith({
      data: [{ taskId: 'task-1', assigned_by: 'user-1', userId: 'user-2' }],
      skipDuplicates: true,
    });
  });

  it('executes UPDATE_PRIORITY and UPDATE_TAGS actions', async () => {
    prisma.automation.findUnique.mockResolvedValue({
      id: 'auto-priority-tags',
      isActive: true,
      ownerId: 'user-1',
      workspaceId: 'ws',
      actions: [
        { type: 'UPDATE_PRIORITY', input: { priority: 'URGENT' } },
        { type: 'UPDATE_TAGS', input: { tags: 'frontend, urgent' } },
      ],
      aiAgent: null,
    });

    const result = await executeAutomation({
      automationId: 'auto-priority-tags',
      taskId: 'task-1',
      cascade,
    });

    expect(result.status).toBe('SUCCESS');
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { priority: 'URGENT' },
    });
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { tags: ['frontend', 'urgent'] },
    });
  });

  it('executes MOVE_TO_LIST action', async () => {
    prisma.automation.findUnique.mockResolvedValue({
      id: 'auto-move',
      isActive: true,
      ownerId: 'user-1',
      workspaceId: 'ws',
      actions: [{ type: 'MOVE_TO_LIST', input: { listId: 'list-target' } }],
      aiAgent: null,
    });

    const result = await executeAutomation({
      automationId: 'auto-move',
      taskId: 'task-1',
      cascade,
    });

    expect(result.status).toBe('SUCCESS');
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { listId: 'list-target' },
    });
  });
});
