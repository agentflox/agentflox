import Redis, { RedisOptions } from 'ioredis';
import env from '@/config/env';

/**
 * Get Redis connection configuration for BullMQ queues
 * Supports Upstash, traditional Redis, and local development
 */
export function getRedisConnection() {
  const redisUrl = env.REDIS_URL;

  // If REDIS_URL is provided (Upstash or traditional Redis)
  if (redisUrl && redisUrl.includes('://')) {
    try {
      const url = new URL(redisUrl);

      return {
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
        password: url.password || undefined,
        username: url.username || undefined,
        // Enable TLS for rediss:// protocol (Upstash uses this)
        ...(url.protocol === 'rediss:' && {
          tls: {
            rejectUnauthorized: false,
          },
        }),
        maxRetriesPerRequest: null, // Required for BullMQ
        db: url.pathname ? parseInt(url.pathname.slice(1)) || 0 : 0,
      };
    } catch (error) {
      console.error('❌ Failed to parse REDIS_URL:', error);
      // Fallback to localhost
    }
  }

  // Fallback: Local development Redis
  return {
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: null, // Required for BullMQ
  };
}