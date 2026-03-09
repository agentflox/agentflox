/**
 * Agent Builder Queue
 * 
 * Handles async processing of agent builder messages using BullMQ.
 * Processes messages in background to avoid timeouts.
 */

import { Queue, QueueOptions, Job } from 'bullmq';
import { getRedisConnection } from '@/utils/utilities/getRedisConnection';

export interface AgentBuilderJobData {
  conversationId: string;
  message: string;
  userId: string;
  timestamp: string;
}

const queueOptions: QueueOptions = {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 24 * 3600, count: 1000 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
};

// Create queue instance
export const agentBuilderQueue = new Queue<AgentBuilderJobData>(
  'agent-builder',
  queueOptions
);

/**
 * Add a message processing job to the queue
 */
export async function addAgentBuilderJob(
  data: AgentBuilderJobData,
  options?: { priority?: number; delay?: number }
): Promise<string> {
  const job = await agentBuilderQueue.add(
    'process-message',
    {
      ...data,
      timestamp: new Date().toISOString(),
    },
    {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    }
  );

  return job.id || '';
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<{
  id: string;
  state: string;
  progress?: number;
  result?: any;
  error?: string;
}> {
  const job = await agentBuilderQueue.getJob(jobId);
  if (!job) {
    throw new Error('Job not found');
  }

  const state = await job.getState();

  return {
    id: job.id || '',
    state,
    progress: job.progress as number,
    result: job.returnvalue,
    error: job.failedReason,
  };
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string): Promise<void> {
  const job = await agentBuilderQueue.getJob(jobId);
  if (job) {
    await job.remove();
  }
}

