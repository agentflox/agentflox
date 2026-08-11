/**
 * Tests for SwarmOrchestrationService and utility functions
 */
jest.mock('@agentflox/database', () => ({
  AgentTaskStatus: {
    PENDING: 'PENDING',
    QUEUED: 'QUEUED',
    RUNNING: 'RUNNING',
    BLOCKED: 'BLOCKED',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
  },
}));

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

jest.mock('../../src/lib/inngest', () => ({
  inngest: { createFunction: jest.fn(), send: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    agentTask: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    aiAgent: { findMany: jest.fn(), findUnique: jest.fn() },
    task: { findUnique: jest.fn() },
  },
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
    hkeys: jest.fn(),
    expire: jest.fn(),
  },
  redisPub: { publish: jest.fn() },
  redisSub: { subscribe: jest.fn(), on: jest.fn() },
  redisConnectionOptions: { host: 'localhost', port: 6379 },
}));

jest.mock('../../src/services/agents/orchestration/agentTaskOrchestrator', () => ({
  agentTaskOrchestrator: {
    getAvailableTasks: jest.fn(),
    completeTask: jest.fn(),
  },
}));

jest.mock('../../src/services/agents/orchestration/swarmMessageBuffer', () => ({
  swarmMessageBuffer: {
    start: jest.fn(),
    stop: jest.fn(),
    append: jest.fn(),
    flush: jest.fn(),
  },
}));

jest.mock('../../src/monitoring/metrics', () => ({
  metrics: {
    swarmTaskBacklog: { set: jest.fn() },
    swarmCycleDuration: { observe: jest.fn() },
    swarmSessionsActive: { inc: jest.fn(), dec: jest.fn() },
  },
}));

jest.mock('../../src/lib/openai', () => ({ openai: {} }));

jest.mock('../../src/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createContextLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.mock('bullmq', () => {
  const queueInstance = {
    add: jest.fn().mockResolvedValue(undefined),
    getJob: jest.fn().mockResolvedValue(null),
    close: jest.fn(),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  return {
    Queue: jest.fn().mockImplementation(() => queueInstance),
    Worker: jest.fn().mockImplementation(() => ({ on: jest.fn(), close: jest.fn() })),
  };
});

import {
  determineBestPipelineForTask,
  findAgentForType,
  SwarmOrchestrationService,
  swarmCycleQueue,
} from '../../src/services/agents/orchestration/swarmOrchestrationService';
import { redis } from '../../src/lib/redis';
import { prisma } from '../../src/lib/prisma';
import { agentTaskOrchestrator } from '../../src/services/agents/orchestration/agentTaskOrchestrator';
import { AgentTaskStatus } from '@agentflox/database';

const sessionPayload = {
  id: 'sess-1',
  workspaceId: 'ws-1',
  coordinatorId: 'coord-1',
  status: 'running',
  conversationId: 'sess-1',
  config: { tickInterval: 5000, agentIds: ['agent-1'] },
};

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
    (swarmCycleQueue.getJob as jest.Mock).mockResolvedValue(null);
    (swarmCycleQueue.add as jest.Mock).mockResolvedValue(undefined);
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

  describe('scheduleCycle', () => {
    it('adds a delayed tick with stable jobId', async () => {
      await service.scheduleCycle('sess-1', 1500);

      expect(swarmCycleQueue.getJob).toHaveBeenCalledWith('tick-sess-1');
      expect(swarmCycleQueue.add).toHaveBeenCalledWith(
        'tick',
        { sessionId: 'sess-1' },
        expect.objectContaining({ delay: 1500, jobId: 'tick-sess-1', removeOnComplete: true })
      );
    });

    it('upserts: removes delayed job and uses min(existing, new) delay', async () => {
      const existing = {
        opts: { delay: 5000 },
        getState: jest.fn().mockResolvedValue('delayed'),
        remove: jest.fn().mockResolvedValue(undefined),
      };
      (swarmCycleQueue.getJob as jest.Mock).mockResolvedValue(existing);

      await service.scheduleCycle('sess-1', 1500);

      expect(existing.remove).toHaveBeenCalled();
      expect(swarmCycleQueue.add).toHaveBeenCalledWith(
        'tick',
        { sessionId: 'sess-1' },
        expect.objectContaining({ delay: 1500, jobId: 'tick-sess-1' })
      );
    });
  });

  describe('recordTaskCompleted intermediate pipeline', () => {
    it('advances step, emits INTER_AGENT_MSG, and scheduleCycle(1500)', async () => {
      (redis.hget as jest.Mock).mockImplementation(async (key: string) => {
        if (key === 'swarm:sessions') return JSON.stringify(sessionPayload);
        if (key === 'swarm:taskresults') return null;
        return null;
      });
      (prisma.aiAgent.findUnique as jest.Mock).mockResolvedValue({ name: 'Writer' });
      (prisma.agentTask.findUnique as jest.Mock).mockResolvedValue({
        metadata: {
          sessionId: 'sess-1',
          pipeline: ['writer', 'reviewer'],
          currentStepIndex: 0,
        },
      });
      (prisma.agentTask.update as jest.Mock).mockResolvedValue({});

      const mockPersist = jest.spyOn(service as any, 'persistAndEmit').mockResolvedValue(undefined);
      const mockSchedule = jest.spyOn(service, 'scheduleCycle').mockResolvedValue(undefined);

      await service.recordTaskCompleted('sess-1', 'task-1', 'Draft blog', 'agent-1', 'draft body');

      expect(prisma.agentTask.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task-1' },
          data: expect.objectContaining({
            agentId: null,
            status: AgentTaskStatus.PENDING,
            metadata: expect.objectContaining({ currentStepIndex: 1 }),
          }),
        })
      );
      expect(mockPersist).toHaveBeenCalledWith(
        expect.any(Object),
        'INTER_AGENT_MSG',
        expect.objectContaining({ taskId: 'task-1' })
      );
      expect(mockSchedule).toHaveBeenCalledWith('sess-1', 1500);
      expect(agentTaskOrchestrator.completeTask).not.toHaveBeenCalled();
    });
  });

  describe('runWatchdogForSession', () => {
    it('requeues stuck QUEUED tasks and schedules immediate cycle', async () => {
      (prisma.agentTask.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'task-stuck',
          title: 'Stuck task',
          status: AgentTaskStatus.QUEUED,
          updatedAt: new Date(Date.now() - 11 * 60 * 1000),
          metadata: { sessionId: 'sess-1', currentStepIndex: 0 },
        },
      ]);
      (redis.incr as jest.Mock).mockResolvedValue(1);
      (redis.expire as jest.Mock).mockResolvedValue(1);
      (prisma.agentTask.update as jest.Mock).mockResolvedValue({});

      const mockPersist = jest.spyOn(service as any, 'persistAndEmit').mockResolvedValue(undefined);
      const mockSchedule = jest.spyOn(service, 'scheduleCycle').mockResolvedValue(undefined);

      await service.runWatchdogForSession(sessionPayload as any);

      expect(prisma.agentTask.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task-stuck' },
          data: expect.objectContaining({
            agentId: null,
            status: AgentTaskStatus.PENDING,
          }),
        })
      );
      expect(mockPersist).toHaveBeenCalledWith(
        expect.any(Object),
        'COORDINATOR_THINK',
        expect.objectContaining({ taskId: 'task-stuck' })
      );
      expect(mockSchedule).toHaveBeenCalledWith('sess-1', 0);
    });

    it('abandons after max unsticks and stops auto-reschedule', async () => {
      (prisma.agentTask.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'task-wedged',
          title: 'Wedged task',
          status: AgentTaskStatus.RUNNING,
          updatedAt: new Date(Date.now() - 11 * 60 * 1000),
          metadata: { sessionId: 'sess-1', currentStepIndex: 1 },
        },
      ]);
      (redis.incr as jest.Mock).mockResolvedValue(4); // > WATCHDOG_MAX_UNSTICKS (3)
      (prisma.agentTask.update as jest.Mock).mockResolvedValue({});

      const mockPersist = jest.spyOn(service as any, 'persistAndEmit').mockResolvedValue(undefined);
      const mockSchedule = jest.spyOn(service, 'scheduleCycle').mockResolvedValue(undefined);

      await service.runWatchdogForSession(sessionPayload as any);

      expect(mockPersist).toHaveBeenCalledWith(
        expect.any(Object),
        'CYCLE_ERROR',
        expect.objectContaining({ taskId: 'task-wedged', watchdogAbandoned: true })
      );
      expect(prisma.agentTask.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({ watchdogAbandoned: true }),
          }),
        })
      );
      expect(mockSchedule).not.toHaveBeenCalled();
    });
  });

  describe('executeCycle', () => {
    it('does nothing if session not found or not running', async () => {
      (redis.hget as jest.Mock).mockResolvedValue(null);
      await service.executeCycle('non-existent');
      expect(agentTaskOrchestrator.getAvailableTasks).not.toHaveBeenCalled();
    });

    it('processes unassigned tasks and circuit breaks tripped agents', async () => {
      (redis.hget as jest.Mock).mockResolvedValue(
        JSON.stringify({
          id: 'sess-1',
          workspaceId: 'ws-1',
          status: 'running',
          config: { agentIds: ['11111111-1111-1111-1111-111111111111'] },
        })
      );
      (agentTaskOrchestrator.getAvailableTasks as jest.Mock).mockResolvedValue([
        {
          id: 'task-1',
          metadata: { sessionId: 'sess-1', pipeline: ['code_agent'], currentStepIndex: 0 },
          title: 'Task 1',
        },
      ]);
      (prisma.agentTask.count as jest.Mock).mockResolvedValue(0);
      (prisma.agentTask.findMany as jest.Mock).mockResolvedValue([]);
      (redis.incr as jest.Mock).mockResolvedValue(1);
      (prisma.aiAgent.findMany as jest.Mock).mockResolvedValue([
        { id: '11111111-1111-1111-1111-111111111111', agentType: 'DEVELOPER', name: 'Dev' },
      ]);

      const mockIsBroken = jest.spyOn(service, 'isAgentCircuitBroken').mockResolvedValue(false);
      jest.spyOn(service as any, 'persistAndEmit').mockResolvedValue(undefined);
      jest.spyOn(service, 'runWatchdogForSession').mockResolvedValue(undefined);

      await service.executeCycle('sess-1');

      expect(redis.incr).toHaveBeenCalledWith('swarm:ratelimit:ws-1');
      expect(mockIsBroken).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111', 'sess-1');
    });
  });
});
