import { redis } from '@/lib/redis';

export interface RateLimitConfig {
    RPM?: number;
    RPD?: number;
}

export interface RateLimitResult {
    limitPerMinute?: number;
    remainingPerMinute?: number;
    resetPerMinute?: number;
    limitPerDay?: number;
    remainingPerDay?: number;
    resetPerDay?: number;
}

export async function checkRateLimit(ip: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const result: RateLimitResult = {};

    if (config.RPM) {
        const key = `ratelimit:${ip}:min`;
        const current = await redis.incr(key);
        if (current === 1) {
            await redis.expire(key, 60);
        }
        const ttl = await redis.ttl(key);

        result.limitPerMinute = config.RPM;
        result.remainingPerMinute = Math.max(0, config.RPM - current);
        result.resetPerMinute = Date.now() + (ttl * 1000);
    }

    if (config.RPD) {
        const key = `ratelimit:${ip}:day`;
        const current = await redis.incr(key);
        if (current === 1) {
            await redis.expire(key, 86400);
        }
        const ttl = await redis.ttl(key);

        result.limitPerDay = config.RPD;
        result.remainingPerDay = Math.max(0, config.RPD - current);
        result.resetPerDay = Date.now() + (ttl * 1000);
    }

    return result;
}
