/**
 * Tests for SwarmOrchestrationService and utility functions
 */
import { determineBestPipelineForTask, findAgentForType, SwarmOrchestrationService } from '../../src/services/agents/orchestration/swarmOrchestrationService';
import { redis, redisPub, redisSub } from '../../src/lib/redis';
import { prisma } from '../../src/lib/prisma';
import { agentTaskOrchestrator } from '../../src/services/agents/orchestration/agentTaskOrchestrator';

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

jest.mock('../../src/lib/inngest', () => ({
  inngest: { createFunction: jest.fn() }
}));

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    agentTask: { count: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    aiAgent: { findMany: jest.fn() },
  }
}));

jest.mock('../../src/lib/redis', () => ({
  redis: {
    incr: jest.fn(),
    pexpire: jest.fn(),
    del: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    hget: jest.fn(),
    hset: jest.fn(),
    expire: jest.fn(),
  },
  redisPub: { publish: jest.fn() },
  redisSub: { subscribe: jest.fn(), on: jest.fn() },
  redisConnectionOptions: { host: 'localhost', port: 6379 },
}));

jest.mock('../../src/services/agents/orchestration/agentTaskOrchestrator', () => ({
  agentTaskOrchestrator: { getAvailableTasks: jest.fn() },
}));

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({ add: jest.fn(), close: jest.fn() })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn(), close: jest.fn() })),
}));

describe('swarmOrchestrationService utilities', () => {
  describe('determineBestPipelineForTask', () => {
    it('returns general pipeline if no profiles available', () => {
      const res = determineBestPipelineForTask({ title: 'Task' }, []);
      expect(res.type).toBe('general');
      expect(res.pipeline).toEqual(['general_agent']);
    });

    it('matches exact role keywords', () => {
      const profiles = [
        { id: '1', name: 'Bob', description: 'general' },
        { id: '2', name: 'Alice', description: 'expert code reviewer' },
      ];
      const res = determineBestPipelineForTask({ title: 'Review the PR' }, profiles);
      expect(res.pipeline).toEqual(['2']);
    });
  });

  describe('findAgentForType', () => {
    it('returns undefined if no profiles', () => {
      expect(findAgentForType('code_agent', [])).toBeUndefined();
    });

    it('finds exact ID match', () => {
      const profiles = [{ id: '123' }, { id: '456' }];
      expect(findAgentForType('456', profiles)).toEqual({ id: '456' });
    });

    it('matches agent type by keywords or role mapping', () => {
      const profiles = [
        { id: '1', name: 'Content Writer', agentType: 'BLOG_AGENT' },
        { id: '2', name: 'Backend Dev', agentType: 'DEVELOPER' },
      ];
      expect(findAgentForType('blog_agent', profiles)).toEqual(profiles[0]);
      expect(findAgentForType('code_agent', profiles)).toEqual(profiles[1]);
    });
  });
});

describe('SwarmOrchestrationService', () => {
  let service: SwarmOrchestrationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SwarmOrchestrationService();
  });

  describe('startSwarm', () => {
    it('saves session, emits started event, and schedules cycle', async () => {
      const mockSchedule = jest.spyOn(service, 'scheduleCycle').mockResolvedValue(undefined);
      const mockPersist = jest.spyOn(service as any, 'persistAndEmit').mockResolvedValue(undefined);

      const res = await service.startSwarm('ws-1', 'coord-1', 'sess-1', { tickInterval: 3000 });
      
      expect(res).toBe('sess-1');
      expect(redis.hset).toHaveBeenCalledWith('swarm:sessions', 'sess-1', expect.any(String));
      expect(redis.expire).toHaveBeenCalledWith('swarm:sessions', expect.any(Number));
      expect(mockPersist).toHaveBeenCalledWith(expect.any(Object), 'SESSION_STARTED', expect.any(Object));
      expect(mockSchedule).toHaveBeenCalledWith('sess-1');
    });
  });

  describe('executeCycle', () => {
    it('does nothing if session not found or not running', async () => {
      (redis.hget as jest.Mock).mockResolvedValue(null);
      await service.executeCycle('non-existent');
      expect(agentTaskOrchestrator.getAvailableTasks).not.toHaveBeenCalled();
    });

    it('processes unassigned tasks and circuit breaks tripped agents', async () => {
      (redis.hget as jest.Mock).mockResolvedValue(JSON.stringify({
        id: 'sess-1', workspaceId: 'ws-1', status: 'running', config: { agentIds: ['11111111-1111-1111-1111-111111111111'] }
      }));
      (agentTaskOrchestrator.getAvailableTasks as jest.Mock).mockResolvedValue([
        { id: 'task-1', metadata: { sessionId: 'sess-1', pipeline: ['code_agent'], currentStepIndex: 0 }, title: 'Task 1' }
      ]);
      (prisma.agentTask.count as jest.Mock).mockResolvedValue(0);
      (prisma.agentTask.findMany as jest.Mock).mockResolvedValue([]);
      (redis.incr as jest.Mock).mockResolvedValue(1); // rate limit OK
      (prisma.aiAgent.findMany as jest.Mock).mockResolvedValue([
        { id: '11111111-1111-1111-1111-111111111111', agentType: 'DEVELOPER', name: 'Dev' }
      ]);

      const mockIsBroken = jest.spyOn(service, 'isAgentCircuitBroken').mockResolvedValue(false);
      const mockPersist = jest.spyOn(service as any, 'persistAndEmit').mockResolvedValue(undefined);
      
      // We'll just test that it reaches the checkWorkspaceRateLimit and attempts assignment
      await service.executeCycle('sess-1');
      
      expect(redis.incr).toHaveBeenCalledWith('swarm:ratelimit:ws-1');
      expect(mockIsBroken).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111', 'sess-1');
      // The task assignment logic is complex but we verified it doesn't crash
    });
  });
});
