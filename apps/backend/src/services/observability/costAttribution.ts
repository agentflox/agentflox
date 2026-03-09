import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { executeDbOperation, executeRedisOperation } from '@/lib/circuitBreaker';

/**
 * Cost Attribution Service
 * Tracks usage and costs per workspace/tenant for billing and analytics
 */

export interface CostMetrics {
    workspaceId: string;
    period: Date;
    messagesCreated: number;
    messagesBroadcast: number;
    socketConnections: number;
    socketMinutes: number;
    redisOperations: number;
    databaseQueries: number;
    storageBytes: number;
    bandwidthBytes: number;
    estimatedCost: number;
}

export interface UsageBreakdown {
    workspaceId: string;
    userId?: string;
    resourceType: 'message' | 'connection' | 'storage' | 'bandwidth' | 'compute';
    quantity: number;
    unit: string;
    timestamp: Date;
}

class CostAttributionService {
    private readonly COST_PER_MESSAGE = 0.0001; // $0.0001 per message
    private readonly COST_PER_SOCKET_MINUTE = 0.00001; // $0.00001 per socket minute
    private readonly COST_PER_GB_STORAGE = 0.023; // $0.023 per GB/month
    private readonly COST_PER_GB_BANDWIDTH = 0.12; // $0.12 per GB

    /**
     * Track message creation for cost attribution
     */
    async trackMessageCreation(
        workspaceId: string,
        userId: string,
        messageSize: number
    ): Promise<void> {
        const key = `cost:ws:${workspaceId}:messages:${this.getCurrentHour()}`;

        await executeRedisOperation(
            () => redis.hincrby(key, 'count', 1),
            null
        );

        await executeRedisOperation(
            () => redis.hincrby(key, 'bytes', messageSize),
            null
        );

        await executeRedisOperation(
            () => redis.expire(key, 86400 * 7), // Keep for 7 days
            null
        );

        // Track user-level attribution
        const userKey = `cost:user:${userId}:messages:${this.getCurrentHour()}`;
        await executeRedisOperation(() => redis.incr(userKey), null);
        await executeRedisOperation(() => redis.expire(userKey, 86400 * 7), null);
    }

    /**
     * Track socket connection time
     */
    async trackSocketConnection(
        workspaceId: string,
        userId: string,
        connectionId: string
    ): Promise<void> {
        const key = `cost:socket:${connectionId}`;

        await executeRedisOperation(
            () => redis.hset(key, {
                workspaceId,
                userId,
                connectedAt: Date.now(),
            }),
            null
        );

        await executeRedisOperation(
            () => redis.expire(key, 86400), // Auto-cleanup after 24h
            null
        );
    }

    /**
     * Track socket disconnection and calculate connection time
     */
    async trackSocketDisconnection(connectionId: string): Promise<void> {
        const key = `cost:socket:${connectionId}`;

        const data = await executeRedisOperation(
            () => redis.hgetall(key),
            null
        );

        if (!data || !data.workspaceId) return;

        const connectedAt = parseInt(data.connectedAt);
        const disconnectedAt = Date.now();
        const durationMinutes = Math.ceil((disconnectedAt - connectedAt) / 60000);

        // Track workspace connection minutes
        const wsKey = `cost:ws:${data.workspaceId}:socket-minutes:${this.getCurrentHour()}`;
        await executeRedisOperation(
            () => redis.hincrby(wsKey, 'minutes', durationMinutes),
            null
        );

        await executeRedisOperation(
            () => redis.expire(wsKey, 86400 * 7),
            null
        );

        // Cleanup connection tracking
        await executeRedisOperation(() => redis.del(key), null);
    }

    /**
     * Track broadcast operation
     */
    async trackBroadcast(
        workspaceId: string,
        recipientCount: number,
        payloadSize: number
    ): Promise<void> {
        const key = `cost:ws:${workspaceId}:broadcasts:${this.getCurrentHour()}`;

        await executeRedisOperation(
            () => redis.hincrby(key, 'count', 1),
            null
        );

        await executeRedisOperation(
            () => redis.hincrby(key, 'recipients', recipientCount),
            null
        );

        await executeRedisOperation(
            () => redis.hincrby(key, 'bytes', payloadSize * recipientCount),
            null
        );

        await executeRedisOperation(
            () => redis.expire(key, 86400 * 7),
            null
        );
    }

    /**
     * Get cost metrics for a workspace in a time period
     */
    async getWorkspaceCosts(
        workspaceId: string,
        startDate: Date,
        endDate: Date
    ): Promise<CostMetrics> {
        const hours = this.getHoursBetween(startDate, endDate);

        let totalMessages = 0;
        let totalBroadcasts = 0;
        let totalSocketMinutes = 0;
        let totalBandwidth = 0;

        // Aggregate from hourly buckets
        for (const hour of hours) {
            const messageKey = `cost:ws:${workspaceId}:messages:${hour}`;
            const messageData = await executeRedisOperation(
                () => redis.hgetall(messageKey),
                {}
            );

            if (messageData.count) {
                totalMessages += parseInt(messageData.count);
                totalBandwidth += parseInt(messageData.bytes || '0');
            }

            const broadcastKey = `cost:ws:${workspaceId}:broadcasts:${hour}`;
            const broadcastData = await executeRedisOperation(
                () => redis.hgetall(broadcastKey),
                {}
            );

            if (broadcastData.count) {
                totalBroadcasts += parseInt(broadcastData.count);
                totalBandwidth += parseInt(broadcastData.bytes || '0');
            }

            const socketKey = `cost:ws:${workspaceId}:socket-minutes:${hour}`;
            const socketData = await executeRedisOperation(
                () => redis.hgetall(socketKey),
                {}
            );

            if (socketData.minutes) {
                totalSocketMinutes += parseInt(socketData.minutes);
            }
        }

        // Get storage from database
        const workspace = await executeDbOperation(() =>
            prisma.workspace.findUnique({
                where: { id: workspaceId },
                select: { storageUsed: true },
            })
        );

        const storageGB = workspace ? Number(workspace.storageUsed) / (1024 ** 3) : 0;
        const bandwidthGB = totalBandwidth / (1024 ** 3);

        // Calculate costs
        const messageCost = totalMessages * this.COST_PER_MESSAGE;
        const socketCost = totalSocketMinutes * this.COST_PER_SOCKET_MINUTE;
        const storageCost = storageGB * this.COST_PER_GB_STORAGE;
        const bandwidthCost = bandwidthGB * this.COST_PER_GB_BANDWIDTH;

        const estimatedCost = messageCost + socketCost + storageCost + bandwidthCost;

        return {
            workspaceId,
            period: startDate,
            messagesCreated: totalMessages,
            messagesBroadcast: totalBroadcasts,
            socketConnections: 0, // TODO: Track from connection events
            socketMinutes: totalSocketMinutes,
            redisOperations: 0, // TODO: Track from circuit breaker
            databaseQueries: 0, // TODO: Track from Prisma middleware
            storageBytes: workspace ? Number(workspace.storageUsed) : 0,
            bandwidthBytes: totalBandwidth,
            estimatedCost,
        };
    }

    /**
     * Persist hourly costs to database for long-term analytics
     */
    async persistHourlyCosts(): Promise<void> {
        const currentHour = this.getCurrentHour();
        const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

        // Scan for all workspace cost keys from the previous hour
        const pattern = `cost:ws:*:*:${oneHourAgo}`;
        const keys = await executeRedisOperation(
            () => this.scanKeys(pattern),
            []
        );

        const workspaceData = new Map<string, any>();

        // Aggregate data by workspace
        for (const key of keys) {
            const parts = key.split(':');
            const workspaceId = parts[2];
            const metricType = parts[3];

            if (!workspaceData.has(workspaceId)) {
                workspaceData.set(workspaceId, {
                    messages: 0,
                    broadcasts: 0,
                    socketMinutes: 0,
                    bandwidth: 0,
                });
            }

            const data = await executeRedisOperation(
                () => redis.hgetall(key),
                {}
            );

            const ws = workspaceData.get(workspaceId);

            if (metricType === 'messages' && data?.count) {
                ws.messages = parseInt(data.count, 10);
                ws.bandwidth += parseInt(data.bytes || '0', 10);
            } else if (metricType === 'broadcasts' && data?.count) {
                ws.broadcasts = parseInt(data.count, 10);
                ws.bandwidth += parseInt(data.bytes || '0', 10);
            } else if (metricType === 'socket-minutes' && data?.minutes) {
                ws.socketMinutes = parseInt(data.minutes, 10);
            }
        }

        // Persist to database
        for (const [workspaceId, metrics] of workspaceData.entries()) {
            await executeDbOperation(() =>
                prisma.usage.create({
                    data: {
                        userId: 'system', // System-level tracking
                        date: new Date(oneHourAgo),
                        metadata: metrics,
                    },
                })
            );
        }

        console.log(`💰 Persisted costs for ${workspaceData.size} workspaces (hour: ${oneHourAgo})`);
    }

    /**
     * Helper: Get current hour bucket
     */
    private getCurrentHour(): string {
        const now = new Date();
        now.setMinutes(0, 0, 0);
        return now.toISOString();
    }

    /**
     * Helper: Get hours between two dates
     */
    private getHoursBetween(start: Date, end: Date): string[] {
        const hours: string[] = [];
        const current = new Date(start);
        current.setMinutes(0, 0, 0);

        while (current <= end) {
            hours.push(current.toISOString());
            current.setHours(current.getHours() + 1);
        }

        return hours;
    }

    /**
     * Helper: Scan Redis keys (handles cursor pagination)
     */
    private async scanKeys(pattern: string): Promise<string[]> {
        const keys: string[] = [];
        let cursor = '0';

        do {
            const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = result[0];
            keys.push(...result[1]);
        } while (cursor !== '0');

        return keys;
    }
}

// Singleton instance
export const costAttribution = new CostAttributionService();
