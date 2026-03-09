/**
 * Async Executor Service
 * 
 * BullMQ-based asynchronous execution engine for agents.
 * Provides job queuing, retry logic, and execution orchestration.
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { redis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { metrics } from '@/monitoring/metrics';
import { createAgentGraph, type AgentGraphState } from '../orchestration/agentGraph';

export interface AgentExecutionJobData {
  executionId: string;
  agentId: string;
  userId: string;
  workspaceId?: string;
  inputData?: Record<string, any>;
  executionContext?: Record<string, any>;
  isResume?: boolean;
}

export interface AgentExecutionResult {
  executionId: string;
  status: 'COMPLETED' | 'FAILED' | 'PENDING_APPROVAL' | 'CANCELLED';
  result?: any;
  error?: string;
  stepsCompleted: number;
}

// Queue configuration
const QUEUE_NAME = 'agent-executions';
const QUEUE_OPTIONS = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      count: 1000, // Keep last 1000 failed jobs for debugging
    },
  },
};

// Create queue
export const executionQueue = new Queue<AgentExecutionJobData>(QUEUE_NAME, QUEUE_OPTIONS);

// Create queue events for monitoring
export const executionQueueEvents = new QueueEvents(QUEUE_NAME, {
  connection: redis,
});

/**
 * Process an agent execution job
 */
async function processExecution(job: Job<AgentExecutionJobData>): Promise<AgentExecutionResult> {
  const { executionId, agentId, userId, workspaceId, inputData, executionContext, isResume } = job.data;

  console.log(`[AsyncExecutor] Processing execution ${executionId} (resume: ${isResume})`);

  const startTime = Date.now();

  try {
    // Load execution from DB
    const execution = await prisma.agentExecution.findUnique({
      where: { id: executionId },
      include: {
        aiAgent: true,
        agentExecutionSteps: {
          orderBy: { stepNumber: 'asc' },
        },
      },
    });

    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    // Check if execution is cancelled
    if (execution.status === 'CANCELLED') {
      return {
        executionId,
        status: 'CANCELLED',
        error: 'Execution was cancelled',
        stepsCompleted: execution.agentExecutionSteps.length,
      };
    }

    // Update status to RUNNING
    await prisma.agentExecution.update({
      where: { id: executionId },
      data: { status: 'RUNNING' },
    });

    // Build initial graph state
    const initialState: Partial<AgentGraphState> = {
      executionId,
      agentId,
      userId,
      workspaceId,
      messages: [],
      intent: inputData?.intent,
      plan: executionContext?.plan || undefined,
      status: 'RUNNING',
    };

    // If resuming, load previous state from executionContext
    if (isResume && executionContext) {
      Object.assign(initialState, {
        plan: executionContext.plan,
        intent: executionContext.intent,
        verificationResult: executionContext.verificationResult,
      });
    }

    // Execute the agent graph
    const graph = createAgentGraph();
    const result = await graph.invoke(initialState);

    // Handle different outcomes
    if (result.status === 'WAITING_APPROVAL') {
      // Update execution status
      await prisma.agentExecution.update({
        where: { id: executionId },
        data: {
          status: 'PENDING_APPROVAL',
          approvalStatus: 'PENDING',
          executionContext: {
            ...(executionContext || {}),
            plan: result.plan,
            intent: result.intent,
            verificationResult: result.verificationResult,
          },
        },
      });

      // Track metrics
      const duration = (Date.now() - startTime) / 1000;
      metrics.agentExecutions.inc({ agent_id: agentId, status: 'pending_approval', trigger: 'manual' });
      metrics.agentExecutionDuration.observe({ agent_id: agentId, status: 'pending_approval' }, duration);

      return {
        executionId,
        status: 'PENDING_APPROVAL',
        result: result.response,
        stepsCompleted: result.executionResults?.length || 0,
      };
    }

    if (result.status === 'FAILED') {
      // Update execution status
      await prisma.agentExecution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          error: result.error || 'Execution failed',
          completedAt: new Date(),
        },
      });

      // Track metrics
      const duration = (Date.now() - startTime) / 1000;
      metrics.agentExecutions.inc({ agent_id: agentId, status: 'failed', trigger: 'manual' });
      metrics.agentExecutionDuration.observe({ agent_id: agentId, status: 'failed' }, duration);

      throw new Error(result.error || 'Execution failed');
    }

    // Success
    await prisma.agentExecution.update({
      where: { id: executionId },
      data: {
        status: 'COMPLETED',
        result: result.response,
        completedAt: new Date(),
      },
    });

    // Track metrics
    const duration = (Date.now() - startTime) / 1000;
    metrics.agentExecutions.inc({ agent_id: agentId, status: 'completed', trigger: 'manual' });
    metrics.agentExecutionDuration.observe({ agent_id: agentId, status: 'completed' }, duration);
    metrics.agentExecutionSteps.observe({ agent_id: agentId }, result.executionResults?.length || 0);

    return {
      executionId,
      status: 'COMPLETED',
      result: result.response,
      stepsCompleted: result.executionResults?.length || 0,
    };
  } catch (error) {
    console.error(`[AsyncExecutor] Execution ${executionId} failed:`, error);

    // Update execution status
    await prisma.agentExecution.update({
      where: { id: executionId },
      data: {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      },
    }).catch(() => {
      // If update fails, just log
      console.error(`[AsyncExecutor] Failed to update execution ${executionId} status`);
    });

    // Track metrics
    const duration = (Date.now() - startTime) / 1000;
    metrics.agentExecutions.inc({ agent_id: agentId, status: 'failed', trigger: 'manual' });
    metrics.agentExecutionDuration.observe({ agent_id: agentId, status: 'failed' }, duration);

    throw error;
  }
}

// Create worker
export const executionWorker = new Worker<AgentExecutionJobData, AgentExecutionResult>(
  QUEUE_NAME,
  processExecution,
  {
    connection: redis,
    concurrency: 5, // Process up to 5 jobs concurrently
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000, // per second
    },
    drainDelay: 10, // Wait 10s when queue is empty
    stalledInterval: 60000,
    lockDuration: 30000,
  }
);

// Worker event handlers
executionWorker.on('completed', (job) => {
  console.log(`[AsyncExecutor] Job ${job.id} completed for execution ${job.data.executionId}`);
});

executionWorker.on('failed', (job, error) => {
  console.error(`[AsyncExecutor] Job ${job?.id} failed for execution ${job?.data.executionId}:`, error);
});

executionWorker.on('error', (error) => {
  console.error('[AsyncExecutor] Worker error:', error);
});

/**
 * Enqueue an agent execution
 */
export async function enqueueExecution(
  data: AgentExecutionJobData
): Promise<{ jobId: string; executionId: string }> {
  const job = await executionQueue.add('execute-agent', data, {
    jobId: `exec-${data.executionId}`, // Use execution ID as job ID for idempotency
  });

  console.log(`[AsyncExecutor] Enqueued execution ${data.executionId} as job ${job.id}`);

  return {
    jobId: job.id!,
    executionId: data.executionId,
  };
}

/**
 * Get execution job status
 */
export async function getExecutionJobStatus(executionId: string) {
  const jobId = `exec-${executionId}`;
  const job = await executionQueue.getJob(jobId);

  if (!job) {
    return { status: 'not_found' };
  }

  const state = await job.getState();
  const progress = job.progress;

  return {
    status: state,
    progress,
    attemptsMade: job.attemptsMade,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    data: job.data,
  };
}

/**
 * Cancel an execution job
 */
export async function cancelExecution(executionId: string): Promise<boolean> {
  const jobId = `exec-${executionId}`;
  const job = await executionQueue.getJob(jobId);

  if (!job) {
    return false;
  }

  // Remove job from queue
  await job.remove();

  // Update execution status in DB
  await prisma.agentExecution.update({
    where: { id: executionId },
    data: {
      status: 'CANCELLED',
      completedAt: new Date(),
    },
  });

  console.log(`[AsyncExecutor] Cancelled execution ${executionId}`);
  return true;
}

/**
 * Get queue metrics
 */
export async function getQueueMetrics() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    executionQueue.getWaitingCount(),
    executionQueue.getActiveCount(),
    executionQueue.getCompletedCount(),
    executionQueue.getFailedCount(),
    executionQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[AsyncExecutor] Shutting down worker gracefully...');
  await executionWorker.close();
  await executionQueue.close();
  await executionQueueEvents.close();
});
