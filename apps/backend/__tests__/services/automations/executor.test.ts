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
});
