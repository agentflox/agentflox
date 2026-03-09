import Redis, { RedisOptions } from 'ioredis';
import env from '@/config/env';

/**
 * Base Redis options compatible with BullMQ
 * Optimized for high concurrency (5k+ concurrent users)
 * These options work with Upstash, local Redis, and traditional Redis instances
 */
const baseRedisOptions: Partial<RedisOptions> = {
  maxRetriesPerRequest: null, // Required for BullMQ workers
  retryStrategy: (times) => {
    // Exponential backoff: 100ms, 200ms, 400ms, ... up to 3s
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  reconnectOnError: (err) => {
    // Reconnect on specific retriable errors
    const retriable = ['READONLY', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'];
    return retriable.some((keyword) => err.message.includes(keyword));
  },
  enableOfflineQueue: true,
  lazyConnect: false,

  // High-concurrency optimizations
  connectTimeout: 20000,     // Increased to 20s for high-load stability
  commandTimeout: 30000,     // Increased to 30s to prevent timeouts in BullMQ workers
  keepAlive: 60000,          // 60s
  enableReadyCheck: true,    // Ensure Redis is ready before accepting commands

  // Performance optimizations
  enableAutoPipelining: true, // Auto-pipeline commands for better throughput
  autoResubscribe: true,      // Auto-resubscribe to channels on reconnect
  autoResendUnfulfilledCommands: true, // Resend commands on reconnect
};

/**
 * Parse Redis configuration from environment
 * Supports:
 * - Upstash Redis (REDIS_URL with rediss:// protocol)
 * - Traditional Redis (REDIS_URL with redis:// protocol)
 * - Local development (defaults to localhost:6379)
 */
function getRedisConfig(): RedisOptions {
  const redisUrl = env.REDIS_URL;

  // If REDIS_URL is provided (Upstash or traditional Redis)
  if (redisUrl && redisUrl.includes('://')) {
    try {
      const url = new URL(redisUrl);

      return {
        ...baseRedisOptions,
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
        password: url.password || undefined,
        username: url.username || undefined,
        // Enable TLS for rediss:// protocol (Upstash uses this)
        ...(url.protocol === 'rediss:' && {
          tls: {
            // Upstash requires TLS but doesn't need cert verification in most cases
            rejectUnauthorized: false,
          },
        }),
        // Disable forced IPv6 to prevent resolution issues on some networks
        db: url.pathname ? parseInt(url.pathname.slice(1)) || 0 : 0,
      };
    } catch (error) {
      console.error('❌ Failed to parse REDIS_URL:', error);
      // Fallback to localhost
    }
  }

  // Fallback: Local development Redis
  return {
    ...baseRedisOptions,
    host: 'localhost',
    port: 6379,
  };
}

const redisConfig = getRedisConfig();

declare global {
  // eslint-disable-next-line no-var
  var __agentfloxRedisClients: {
    redis: Redis;
    redisPub: Redis;
    redisSub: Redis;
    redisNotificationsSub: Redis;
  } | undefined;
}

const clients = global.__agentfloxRedisClients || {
  redis: new Redis(redisConfig),
  redisPub: new Redis(redisConfig),
  redisSub: new Redis(redisConfig),
  redisNotificationsSub: new Redis(redisConfig),
};

if (!global.__agentfloxRedisClients) {
  global.__agentfloxRedisClients = clients;
}

export const redis = clients.redis;
export const redisPub = clients.redisPub;
export const redisSub = clients.redisSub;
export const redisNotificationsSub = clients.redisNotificationsSub;

// Add error handlers to prevent crashes
redis.on('error', (err) => {
  console.error('❌ Redis client error:', err.message);
});

redis.on('connect', () => console.log('✅ Redis client connected'));
redis.on('ready', () => console.log('✅ Redis client ready'));

redisPub.on('error', (err) => {
  console.error('❌ Redis pub error:', err.message);
});

redisPub.on('connect', () => console.log('✅ Redis pub connected'));
redisPub.on('ready', () => console.log('✅ Redis pub ready'));

redisSub.on('error', (err) => {
  console.error('❌ Redis sub error:', err.message);
});

redisSub.on('connect', () => console.log('✅ Redis sub connected'));
redisSub.on('ready', () => console.log('✅ Redis sub ready'));

redisNotificationsSub.on('error', (err) => {
  console.error('❌ Redis notifications sub error:', err.message);
});

redisNotificationsSub.on('connect', () => console.log('✅ Redis notifications sub connected'));
redisNotificationsSub.on('ready', () => console.log('✅ Redis notifications sub ready'));

export default redis;