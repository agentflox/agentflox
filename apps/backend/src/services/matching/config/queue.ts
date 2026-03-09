import type { QueueOptions } from 'bullmq'
import { getRedisConnection } from '@/utils/utilities/getRedisConnection'

export const matchingQueueOptions: QueueOptions = {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 24 * 3600, count: 1000 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
}

