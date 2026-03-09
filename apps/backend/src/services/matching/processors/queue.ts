import { Queue, QueueOptions } from 'bullmq';
import { matchingQueueOptions } from '@/services/matching/config/queue';

export interface MatchingJobData {
  type: 'full' | 'project' | 'proposal' | 'team' | 'profile';
  entityId?: string;
}

const queueOptions: QueueOptions = matchingQueueOptions;

// Create queue instance
export const matchingQueue = new Queue<MatchingJobData>('matching', queueOptions);

/**
 * Add a matching job to the queue
 */
export async function addMatchingJob(data: MatchingJobData, options?: { priority?: number; delay?: number }) {
  return matchingQueue.add('process-matching', data, {
    priority: options?.priority || 0,
    delay: options?.delay || 0,
  });
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    matchingQueue.getWaitingCount(),
    matchingQueue.getActiveCount(),
    matchingQueue.getCompletedCount(),
    matchingQueue.getFailedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
  };
}

