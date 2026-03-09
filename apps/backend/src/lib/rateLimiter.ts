import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redis } from '@/lib/redis';

export interface RateLimitConfig {
    points: number;
    duration: number;
    blockDuration?: number;
    keyPrefix: string;
}

/**
 * Create a Redis-backed rate limiter
 * @param config Rate limit configuration
 * @returns RateLimiterRedis instance
 */
export function createRateLimiter(config: RateLimitConfig) {
    return new RateLimiterRedis({
        storeClient: redis,
        points: config.points,
        duration: config.duration,
        blockDuration: config.blockDuration || 60,
        keyPrefix: config.keyPrefix,
        execEvenly: false,
        execEvenlyMinDelayMs: 0,
    });
}

/**
 * Pre-configured rate limiters for socket events
 */
export const socketRateLimiters = {
    message: createRateLimiter({
        points: 100,        // 100 messages
        duration: 60,       // per minute
        blockDuration: 60,  // block for 1 minute on violation
        keyPrefix: 'rl:msg',
    }),

    reaction: createRateLimiter({
        points: 200,        // 200 reactions
        duration: 60,
        blockDuration: 30,
        keyPrefix: 'rl:react',
    }),

    typing: createRateLimiter({
        points: 50,         // 50 typing events
        duration: 60,
        blockDuration: 30,
        keyPrefix: 'rl:typing',
    }),

    channelMessage: createRateLimiter({
        points: 150,        // 150 channel messages
        duration: 60,
        blockDuration: 60,
        keyPrefix: 'rl:channel',
    }),

    presence: createRateLimiter({
        points: 30,         // 30 presence updates
        duration: 60,
        blockDuration: 30,
        keyPrefix: 'rl:presence',
    }),
};

/**
 * Helper to consume rate limit and handle errors
 */
export async function consumeRateLimit(
    limiter: RateLimiterRedis,
    userId: string,
    eventName: string
): Promise<{ allowed: boolean; retryAfter?: number; error?: string }> {
    try {
        await limiter.consume(userId);
        return { allowed: true };
    } catch (rejRes: any) {
        const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000);
        return {
            allowed: false,
            retryAfter,
            error: `Rate limit exceeded for ${eventName}. Try again in ${retryAfter}s`,
        };
    }
}
