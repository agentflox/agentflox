/**
 * Tests for agentBuilderWorkflow (Inngest)
 */
import { agentBuilderWorkflow } from '../../src/inngest/functions/agent-builder';
import { agentBuilderService } from '../../src/services/agents/arch/agentBuilderService';
import { redis } from '../../src/lib/redis';

jest.mock('../../src/lib/inngest', () => ({
  inngest: {
    createFunction: jest.fn().mockImplementation((config, handler) => ({ config, handler })),
  },
}));

jest.mock('../../src/services/agents/arch/agentBuilderService', () => ({
  agentBuilderService: {
    processMessage: jest.fn(),
  },
}));

jest.mock('../../src/lib/redis', () => ({
  redis: {
    setex: jest.fn(),
  },
}));

describe('agentBuilderWorkflow', () => {
  it('calls processMessage and sets redis state to completed on success', async () => {
    (agentBuilderService.processMessage as jest.Mock).mockResolvedValue({ some: 'result' });
    
    // Extract the handler
    const handler = (agentBuilderWorkflow as any).handler;
    
    const event = {
      data: {
        runId: 'run-123',
        conversationId: 'conv-123',
        message: 'hello',
        userId: 'user-123',
      }
    };

    const res = await handler({ event });
    
    expect(agentBuilderService.processMessage).toHaveBeenCalledWith(
      'conv-123', 'hello', 'user-123', undefined, undefined, undefined, undefined
    );
    expect(redis.setex).toHaveBeenCalledWith('agent_run:run-123', 3600, expect.stringContaining('completed'));
    expect(res).toEqual({ some: 'result' });
  });

  it('sets redis state to error when processMessage throws', async () => {
    (agentBuilderService.processMessage as jest.Mock).mockRejectedValue(new Error('Test error'));
    
    const handler = (agentBuilderWorkflow as any).handler;
    const event = {
      data: {
        runId: 'run-123',
        conversationId: 'conv-123',
        message: 'hello',
        userId: 'user-123',
      }
    };

    await expect(handler({ event })).rejects.toThrow('Test error');
    expect(redis.setex).toHaveBeenCalledWith('agent_run:run-123', 3600, expect.stringContaining('error'));
  });
});
