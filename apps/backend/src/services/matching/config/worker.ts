import { getRedisConnection } from '@/utils/utilities/getRedisConnection'
import env from '@/config/env'

export const workerQueueOptions = {
  connection: getRedisConnection(),
  concurrency: Number.parseInt(env.MATCHING_WORKER_CONCURRENCY || '5', 10),
  limiter: {
    max: Number.parseInt(env.MATCHING_WORKER_LIMITER_MAX || '200', 10),
    duration: Number.parseInt(env.MATCHING_WORKER_LIMITER_DURATION_MS || '60000', 10),
  },
  drainDelay: 10, // Wait 10s when queue is empty to reduce Upstash requests
  stalledInterval: 60000,
  lockDuration: 30000,
};
