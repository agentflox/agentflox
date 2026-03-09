import { Server } from 'socket.io';
import { redis } from '@/lib/redis';
import { executeRedisOperation } from '@/lib/circuitBreaker';

/**
 * Presence Broadcasting Service
 * Implements batched + capped broadcasts to prevent fan-out explosions
 */

export interface PresenceBroadcastOptions {
    userId: string;
    username?: string;
    status: 'online' | 'offline' | 'away';
    workspaceId?: string;
}

export class PresenceBroadcastService {
    private static readonly BATCH_SIZE = 100; // Broadcast to 100 users per batch
    private static readonly MAX_BROADCASTS = 1000; // Hard cap to prevent overload
    private static readonly BATCH_DELAY_MS = 50; // Delay between batches for backpressure

    /**
     * Broadcast presence update with batching and capping
     */
    static async broadcastPresenceUpdate(
        io: Server,
        targetUserIds: string[],
        payload: PresenceBroadcastOptions
    ): Promise<{ sent: number; capped: number }> {
        // Apply hard cap
        const cappedTargets = targetUserIds.slice(0, this.MAX_BROADCASTS);
        const capped = Math.max(0, targetUserIds.length - this.MAX_BROADCASTS);

        if (capped > 0) {
            console.warn(
                `⚠️ Presence broadcast capped: ${targetUserIds.length} targets reduced to ${this.MAX_BROADCASTS}`
            );
        }

        let sent = 0;

        // Process in batches
        for (let i = 0; i < cappedTargets.length; i += this.BATCH_SIZE) {
            const batch = cappedTargets.slice(i, i + this.BATCH_SIZE);

            // Emit to each user in batch
            batch.forEach((targetUserId) => {
                const room = payload.workspaceId
                    ? `ws:${payload.workspaceId}:user:${targetUserId}`
                    : `user:${targetUserId}`;

                io.to(room).emit(`user:${payload.status}`, {
                    userId: payload.userId,
                    username: payload.username,
                    status: payload.status,
                    timestamp: new Date().toISOString(),
                });
            });

            sent += batch.length;

            // Backpressure: Add delay between batches
            if (i + this.BATCH_SIZE < cappedTargets.length) {
                await new Promise((resolve) => setTimeout(resolve, this.BATCH_DELAY_MS));
            }
        }

        return { sent, capped };
    }

    /**
     * Get targeted broadcast recipients (friends + team members)
     * with built-in caching and deduplication
     */
    static async getPresenceBroadcastTargets(
        userId: string,
        getFriendIds: (userId: string) => Promise<string[]>,
        getTeamMemberIds: (userId: string) => Promise<string[]>
    ): Promise<string[]> {
        // Check cache first
        const cacheKey = `presence:targets:${userId}`;
        const cached = await executeRedisOperation(
            () => redis.get(cacheKey),
            null
        );

        if (cached) {
            return JSON.parse(cached);
        }

        // Fetch friends and team members in parallel
        const [friendIds, teamMemberIds] = await Promise.all([
            getFriendIds(userId),
            getTeamMemberIds(userId),
        ]);

        // Deduplicate
        const targets = [...new Set([...friendIds, ...teamMemberIds])];

        // Cache for 5 minutes
        await executeRedisOperation(
            () => redis.setex(cacheKey, 300, JSON.stringify(targets)),
            null
        );

        return targets;
    }

    /**
     * Throttled presence broadcast - prevents spam
     * Uses Redis to ensure only one broadcast per N seconds per user
     */
    static async shouldBroadcastPresence(
        userId: string,
        status: 'online' | 'offline',
        throttleSeconds: number = 5
    ): Promise<boolean> {
        const throttleKey = `presence:throttle:${status}:${userId}`;

        const canBroadcast = await executeRedisOperation(
            () => redis.set(throttleKey, '1', 'EX', throttleSeconds, 'NX'),
            null
        );

        return canBroadcast === 'OK';
    }

    /**
     * Clear presence broadcast cache when relationships change
     */
    static async invalidatePresenceCache(userId: string): Promise<void> {
        const cacheKey = `presence:targets:${userId}`;
        await executeRedisOperation(() => redis.del(cacheKey), null);
    }
}
