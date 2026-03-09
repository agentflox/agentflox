import { Socket } from 'socket.io';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redis } from '@/lib/redis';

export function createRateLimiter(eventName: string, points: number, duration: number) {
    const limiter = new RateLimiterRedis({
        storeClient: redis,
        points,
        duration,
        keyPrefix: `rl:${eventName}`,
        blockDuration: 60 // 1 minute block on violation
    });

    return async (socket: Socket, data: any, next: Function) => {
        try {
            await limiter.consume(socket.data.userId);
            next();
        } catch (rejRes: any) {
            socket.emit('error', {
                code: 'RATE_LIMIT_EXCEEDED',
                message: `Too many ${eventName} events. Try again in ${Math.ceil(rejRes.msBeforeNext / 1000)}s`,
                retryAfter: rejRes.msBeforeNext
            });
        }
    };
}
