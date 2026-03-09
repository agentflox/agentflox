/**
 * Agent Builder Worker
 * 
 * Processes agent builder jobs from the queue in the background.
 */

import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '@/utils/utilities/getRedisConnection';
import { agentBuilderService } from '@/services/agents/arch/agentBuilderService';
import { AgentBuilderJobData } from '@/services/agents/queue/agentBuilderQueue';

const workerOptions = {
  connection: getRedisConnection(),
  concurrency: 5, // Process up to 5 jobs concurrently
  limiter: {
    max: 20, // Max 20 jobs
    duration: 60000, // per minute
  },
  drainDelay: 10, // Wait 10s when queue is empty
  stalledInterval: 60000,
  lockDuration: 30000,
};

// Create worker
export const agentBuilderWorker = new Worker<AgentBuilderJobData>(
  'agent-builder',
  async (job: Job<AgentBuilderJobData>) => {
    const { conversationId, message, userId } = job.data;

    console.log(`[AgentBuilderWorker] Processing job ${job.id} for conversation ${conversationId}`);

    try {
      // Update job progress
      await job.updateProgress(10);

      // Process message
      const result = await agentBuilderService.processMessage(
        conversationId,
        message,
        userId
      );

      await job.updateProgress(100);

      // Return result (will be stored in job.returnvalue)
      return {
        success: true,
        result,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`[AgentBuilderWorker] Job ${job.id} failed:`, error);

      // Update job with error
      await job.updateProgress(100);

      throw error; // Will trigger retry if attempts remain
    }
  },
  workerOptions
);

// Event handlers
agentBuilderWorker.on('completed', (job) => {
  console.log(`[AgentBuilderWorker] Job ${job.id} completed`);
});

agentBuilderWorker.on('failed', (job, error) => {
  console.error(`[AgentBuilderWorker] Job ${job?.id} failed:`, error);
});

agentBuilderWorker.on('error', (error) => {
  console.error('[AgentBuilderWorker] Worker error:', error);
});

