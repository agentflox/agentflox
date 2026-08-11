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
 * Agent Builder init rate limiter (per userId).
 * Covers only the /agents/:id/builder/initialize endpoint — a cheap DB lookup
 * triggered on every page mount. No LLM involved.
 * Default: 120 requests per minute. Override via AGENT_BUILDER_INIT_RL_POINTS / _DURATION.
 */
export const agentBuilderInitRateLimiter = createRateLimiter({
    points: parseInt(process.env.AGENT_BUILDER_INIT_RL_POINTS ?? '120', 10),
    duration: parseInt(process.env.AGENT_BUILDER_INIT_RL_DURATION ?? '60', 10),
    blockDuration: 10,
    keyPrefix: 'rl:agent:builder:init',
});

/**
 * Agent Builder rate limiter (per userId).
 *
 * Each builder message triggers an LLM call — limit to 20 per minute per user.
 * Covers builder/message and builder/message-stream only (not initialize).
 * Override via env vars AGENT_BUILDER_RL_POINTS / AGENT_BUILDER_RL_DURATION.
 */
export const agentBuilderRateLimiter = createRateLimiter({
    points: parseInt(process.env.AGENT_BUILDER_RL_POINTS ?? '20', 10),
    duration: parseInt(process.env.AGENT_BUILDER_RL_DURATION ?? '60', 10),
    blockDuration: 30,
    keyPrefix: 'rl:agent:builder',
});

/**
 * Tool Builder init rate limiter (per userId).
 * Covers only the /tools/:id/builder/initialize endpoint, which is a cheap
 * DB lookup triggered on every page mount — no LLM involved.
 * Default: 120 requests per minute. Override via TOOL_BUILDER_INIT_RL_POINTS / _DURATION.
 */
export const toolBuilderInitRateLimiter = createRateLimiter({
    points: parseInt(process.env.TOOL_BUILDER_INIT_RL_POINTS ?? '120', 10),
    duration: parseInt(process.env.TOOL_BUILDER_INIT_RL_DURATION ?? '60', 10),
    blockDuration: 10,
    keyPrefix: 'rl:tool:builder:init',
});

/**
 * Tool Builder rate limiter (per userId).
 * Covers LLM-backed endpoints: builder/message, builder/message-stream,
 * editor-assistant/message-stream, editor-assistant/message.
 * Default: 20 requests per minute. Override via TOOL_BUILDER_RL_POINTS / _DURATION.
 */
export const toolBuilderRateLimiter = createRateLimiter({
    points: parseInt(process.env.TOOL_BUILDER_RL_POINTS ?? '20', 10),
    duration: parseInt(process.env.TOOL_BUILDER_RL_DURATION ?? '60', 10),
    blockDuration: 30,
    keyPrefix: 'rl:tool:builder',
});

/**
 * Workforce rate limiter (per userId).
 * Covers /workforces/:id/run, run-stream, swarm message, and editor assistant.
 */
export const workforceRateLimiter = createRateLimiter({
    points: parseInt(process.env.WORKFORCE_RL_POINTS ?? '15', 10),
    duration: parseInt(process.env.WORKFORCE_RL_DURATION ?? '60', 10),
    blockDuration: 30,
    keyPrefix: 'rl:workforce',
});

/**
 * Support chat rate limiter (per userId).
 * Each message calls an LLM — limit to 30 per minute.
 */
export const supportRateLimiter = createRateLimiter({
    points: parseInt(process.env.SUPPORT_RL_POINTS ?? '30', 10),
    duration: parseInt(process.env.SUPPORT_RL_DURATION ?? '60', 10),
    blockDuration: 30,
    keyPrefix: 'rl:support',
});

/**
 * General AI features rate limiter (per userId).
 * Covers /ai/listing/generate and /ai/text — lightweight LLM calls.
 */
export const aiFeaturesRateLimiter = createRateLimiter({
    points: parseInt(process.env.AI_FEATURES_RL_POINTS ?? '30', 10),
    duration: parseInt(process.env.AI_FEATURES_RL_DURATION ?? '60', 10),
    blockDuration: 30,
    keyPrefix: 'rl:ai:features',
});

/**
 * Command API rate limiter (per userId).
 * Covers /command/parse, /command/suggest, and /command/execute.
 */
export const commandRateLimiter = createRateLimiter({
    points: parseInt(process.env.COMMAND_RL_POINTS ?? '30', 10),
    duration: parseInt(process.env.COMMAND_RL_DURATION ?? '60', 10),
    blockDuration: 60,
    keyPrefix: 'rl:command',
});

/**
 * Tool execution rate limiter.
 *
 * Uses rate-limiter-flexible which internally issues atomic INCR + EXPIRE
 * pipelines to Redis — never a read-then-write — so concurrent requests under
 * load cannot race past the limit.
 *
 * Defaults: 60 tool runs per user per minute, blocked for 60s on violation.
 * Override via env vars TOOL_EXEC_RL_POINTS / TOOL_EXEC_RL_DURATION.
 */
export const toolExecutionRateLimiter = createRateLimiter({
    points: parseInt(process.env.TOOL_EXEC_RL_POINTS ?? '60', 10),
    duration: parseInt(process.env.TOOL_EXEC_RL_DURATION ?? '60', 10),
    blockDuration: 60,
    keyPrefix: 'rl:tool:exec',
});


/**
 * Helper to consume rate limit and handle errors.
 *
 * rate-limiter-flexible rejects with RateLimiterRes on a real limit hit, but
 * with a plain Error when Redis is unavailable. Treat store failures as
 * fail-open so outages don't masquerade as 429s with a bogus retryAfter.
 */
export async function consumeRateLimit(
    limiter: RateLimiterRedis,
    userId: string,
    eventName: string
): Promise<{ allowed: boolean; retryAfter?: number; error?: string }> {
    try {
        await limiter.consume(userId);
        return { allowed: true };
    } catch (rejRes: unknown) {
        // Redis / store failure — not a quota hit
        if (rejRes instanceof Error) {
            const msg = String(rejRes?.message || '');
            if (msg.includes('max requests limit exceeded')) {
                // Upstash monthly quota exhausted — avoid log spam; fail open.
                return { allowed: true };
            }
            console.warn(`[rateLimiter] Store error for ${eventName}, failing open:`, rejRes.message);
            return { allowed: true };
        }

        const msBeforeNext = Number((rejRes as { msBeforeNext?: number })?.msBeforeNext);
        const retryAfter = Number.isFinite(msBeforeNext) && msBeforeNext > 0
            ? Math.ceil(msBeforeNext / 1000)
            : 60;
        return {
            allowed: false,
            retryAfter,
            error: `Rate limit exceeded for ${eventName}. Try again in ${retryAfter}s`,
        };
    }
}
