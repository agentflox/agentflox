/**
 * Tests for agentExecutorWorkflow
 */
import { agentExecutorWorkflow } from '../../src/inngest/functions/agent-executor';
import { agentExecutorService } from '../../src/services/agents/arch/agentExecutorService';
import { prisma } from '../../src/lib/prisma';

jest.mock('../../src/lib/inngest', () => ({
  inngest: {
    createFunction: jest.fn().mockImplementation((config, handler) => ({ config, handler })),
  },
}));

jest.mock('../../src/services/agents/arch/agentExecutorService', () => ({
  agentExecutorService: {
    executeWorkflow: jest.fn(),
  },
}));

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    agentTask: { findUnique: jest.fn(), update: jest.fn() },
    task: { findUnique: jest.fn(), update: jest.fn() },
    taskStatus: { findFirst: jest.fn() },
    taskActivity: { create: jest.fn() },
    taskComment: { create: jest.fn() },
    $transaction: jest.fn(async (cb) => cb(prisma)),
  },
}));

describe('agentExecutorWorkflow', () => {
  let step: any;
  beforeEach(() => {
    step = {
      run: jest.fn(async (name, cb) => cb()),
    };
    jest.clearAllMocks();
  });

  it('executes agent workflow and returns result without swarm logic when no swarm idempotency key', async () => {
    (agentExecutorService.executeWorkflow as jest.Mock).mockResolvedValue({ success: true, response: 'Output' });
    
    const handler = (agentExecutorWorkflow as any).handler;
    const event = {
      data: {
        runId: 'r-1',
        conversationId: 'c-1',
        agentId: 'a-1',
        message: 'hello',
        userId: 'u-1'
      }
    };

    const res = await handler({ event, step });
    
    expect(agentExecutorService.executeWorkflow).toHaveBeenCalledWith(step, event.data);
    expect(res).toEqual({ success: true, response: 'Output' });
    expect(step.run).not.toHaveBeenCalled();
  });

  it('runs swarm logic if idempotency key starts with swarm-task-', async () => {
    (agentExecutorService.executeWorkflow as jest.Mock).mockResolvedValue({ success: true, response: 'Swarm Output' });
    (prisma.agentTask.findUnique as jest.Mock).mockResolvedValue({
      metadata: { pipeline: ['code_agent'], currentStepIndex: 0 }
    });

    // Mock agentTaskOrchestrator lazily
    jest.mock('../../src/services/agents/orchestration/agentTaskOrchestrator', () => ({
      agentTaskOrchestrator: { completeTask: jest.fn() }
    }), { virtual: true });
    
    const handler = (agentExecutorWorkflow as any).handler;
    const event = {
      data: {
        runId: 'r-1',
        conversationId: 'c-1',
        agentId: 'a-1',
        message: 'hello',
        userId: 'u-1',
        idempotencyKey: 'swarm-task-t-123',
      }
    };

    const res = await handler({ event, step });
    
    expect(agentExecutorService.executeWorkflow).toHaveBeenCalledWith(step, event.data);
    expect(step.run).toHaveBeenCalledWith('mark-swarm-task-complete-t-123', expect.any(Function));
    // It should hit the final step logic because pipeline length is 1 and currentStepIndex is 0
  });
});
