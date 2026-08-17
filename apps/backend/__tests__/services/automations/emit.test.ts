jest.mock('@/lib/inngest', () => ({
  inngest: { send: jest.fn() },
}));

const prisma = {
  workspace: { findUnique: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma }));

import { emitTaskEvent } from '@/services/automations/emit';
import { inngest } from '@/lib/inngest';

describe('emitTaskEvent flag gate', () => {
  const orig = process.env.AUTOMATIONS_V1_KILL_SWITCH;

  afterEach(() => {
    if (orig === undefined) delete process.env.AUTOMATIONS_V1_KILL_SWITCH;
    else process.env.AUTOMATIONS_V1_KILL_SWITCH = orig;
    jest.clearAllMocks();
  });

  it('does not enqueue when the workspace flag is off', async () => {
    delete process.env.AUTOMATIONS_V1_KILL_SWITCH;
    prisma.workspace.findUnique.mockResolvedValue({ settings: {} });
    const result = await emitTaskEvent({
      type: 'TASK_OR_SUBTASK_CREATED',
      taskId: 't1',
      workspaceId: 'ws',
    });
    expect(result).toEqual({ skipped: true, reason: 'flag_off' });
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it('does not enqueue when the kill switch is off', async () => {
    process.env.AUTOMATIONS_V1_KILL_SWITCH = 'off';
    const result = await emitTaskEvent({
      type: 'TASK_OR_SUBTASK_CREATED',
      taskId: 't1',
      workspaceId: 'ws',
    });
    expect(result).toEqual({ skipped: true, reason: 'kill_switch' });
    expect(inngest.send).not.toHaveBeenCalled();
  });
});
