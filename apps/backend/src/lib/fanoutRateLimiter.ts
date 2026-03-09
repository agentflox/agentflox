/**
 * Fan-out Rate Limiter
 * Implements batched broadcasting with backpressure handling for Socket.IO
 */

import { Server, Socket } from 'socket.io';

interface BroadcastOptions {
    batchSize?: number;      // Number of rooms to broadcast to per batch
    delayMs?: number;        // Delay between batches (ms)
    maxRetries?: number;     // Maximum retry attempts
    timeout?: number;        // Timeout per broadcast (ms)
    priority?: 'high' | 'normal' | 'low';
}

interface BroadcastMetrics {
    totalRooms: number;
    successfulBroadcasts: number;
    failedBroadcasts: number;
    averageLatency: number;
    batchCount: number;
}

export class FanoutRateLimiter {
    private metrics = new Map<string, BroadcastMetrics>();

    constructor(private readonly io: Server) { }

    /**
     * Broadcast to multiple rooms with rate limiting and backpressure
     */
    async broadcastWithBackpressure(
        rooms: string[],
        event: string,
        data: any,
        options: BroadcastOptions = {}
    ): Promise<BroadcastMetrics> {
        const {
            batchSize = 100,
            delayMs = 10,
            maxRetries = 3,
            timeout = 5000,
            priority = 'normal'
        } = options;

        const metrics: BroadcastMetrics = {
            totalRooms: rooms.length,
            successfulBroadcasts: 0,
            failedBroadcasts: 0,
            averageLatency: 0,
            batchCount: 0
        };

        let totalLatency = 0;

        // Split rooms into batches
        const batches = this.createBatches(rooms, batchSize);

        for (const batch of batches) {
            metrics.batchCount++;
            const startTime = Date.now();

            try {
                await this.broadcastBatch(batch, event, data, timeout);
                const latency = Date.now() - startTime;
                totalLatency += latency;
                metrics.successfulBroadcasts += batch.length;
            } catch (error) {
                console.error(`[FanoutRateLimiter] Batch broadcast failed:`, error);
                metrics.failedBroadcasts += batch.length;
            }

            // Add delay between batches to prevent overwhelming the system
            if (metrics.batchCount < batches.length) {
                await this.delay(delayMs);
            }
        }

        metrics.averageLatency = metrics.batchCount > 0 ? totalLatency / metrics.batchCount : 0;

        // Store metrics for monitoring
        this.metrics.set(event, metrics);

        return metrics;
    }

    /**
     * Broadcast to a single room with retry logic
     */
    async broadcastToRoom(
        room: string,
        event: string,
        data: any,
        retries: number = 3
    ): Promise<boolean> {
        let attempt = 0;

        while (attempt < retries) {
            try {
                this.io.to(room).emit(event, data);
                return true;
            } catch (error) {
                attempt++;
                if (attempt >= retries) {
                    console.error(`[FanoutRateLimiter] Failed to broadcast to ${room} after ${retries} attempts`);
                    return false;
                }
                // Exponential backoff
                await this.delay(Math.pow(2, attempt) * 100);
            }
        }

        return false;
    }

    /**
     * Intelligent fan-out based on room size
     * Small rooms: immediate broadcast
     * Large rooms: batched broadcast
     */
    async intelligentFanout(
        rooms: string[],
        event: string,
        data: any
    ): Promise<void> {
        const roomSizes = await this.getRoomSizes(rooms);

        const smallRooms: string[] = [];
        const largeRooms: string[] = [];

        rooms.forEach(room => {
            const size = roomSizes.get(room) || 0;
            if (size < 100) {
                smallRooms.push(room);
            } else {
                largeRooms.push(room);
            }
        });

        // Broadcast to small rooms immediately
        if (smallRooms.length > 0) {
            await this.broadcastBatch(smallRooms, event, data);
        }

        // Broadcast to large rooms with rate limiting
        if (largeRooms.length > 0) {
            await this.broadcastWithBackpressure(largeRooms, event, data, {
                batchSize: 50,
                delayMs: 20
            });
        }
    }

    /**
     * Get size of each room (number of connected sockets)
     */
    private async getRoomSizes(rooms: string[]): Promise<Map<string, number>> {
        const sizes = new Map<string, number>();

        for (const room of rooms) {
            try {
                const sockets = await this.io.in(room).fetchSockets();
                sizes.set(room, sockets.length);
            } catch (error) {
                console.error(`[FanoutRateLimiter] Error getting room size for ${room}:`, error);
                sizes.set(room, 0);
            }
        }

        return sizes;
    }

    /**
     * Broadcast to a batch of rooms
     */
    private async broadcastBatch(
        rooms: string[],
        event: string,
        data: any,
        timeout: number = 5000
    ): Promise<void> {
        return Promise.race([
            Promise.all(
                rooms.map(room =>
                    new Promise<void>((resolve) => {
                        try {
                            this.io.to(room).emit(event, data);
                            resolve();
                        } catch (error) {
                            console.error(`[FanoutRateLimiter] Error broadcasting to room ${room}:`, error);
                            resolve(); // Don't fail entire batch
                        }
                    })
                )
            ),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Broadcast timeout')), timeout)
            )
        ]).then(() => { });
    }

    /**
     * Create batches from array
     */
    private createBatches<T>(items: T[], batchSize: number): T[][] {
        const batches: T[][] = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Delay helper
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get metrics for monitoring
     */
    getMetrics(event?: string): BroadcastMetrics | Map<string, BroadcastMetrics> {
        if (event) {
            return this.metrics.get(event) || {
                totalRooms: 0,
                successfulBroadcasts: 0,
                failedBroadcasts: 0,
                averageLatency: 0,
                batchCount: 0
            };
        }
        return this.metrics;
    }

    /**
     * Clear metrics
     */
    clearMetrics(): void {
        this.metrics.clear();
    }
}

let fanoutRateLimiter: FanoutRateLimiter | null = null;

/**
 * Singleton getter for FanoutRateLimiter
 */
export function getFanoutRateLimiter(io?: Server): FanoutRateLimiter {
    if (!fanoutRateLimiter) {
        if (!io) {
            throw new Error('FanoutRateLimiter must be initialized with Socket.IO Server first');
        }
        fanoutRateLimiter = new FanoutRateLimiter(io);
    }
    return fanoutRateLimiter;
}

/**
 * Connection Pool Manager
 * Manages Socket.IO connections and prevents memory leaks
 */
export class ConnectionPoolManager {
    private userConnections = new Map<string, Set<string>>(); // userId -> socketIds
    private socketUsers = new Map<string, string>();          // socketId -> userId
    private roomConnections = new Map<string, Set<string>>(); // room -> socketIds

    private maxConnectionsPerUser = 10;
    private maxRoomsPerSocket = 50;

    /**
     * Register a new socket connection
     */
    registerConnection(socketId: string, userId: string): boolean {
        // Check if user has too many connections
        const userSockets = this.userConnections.get(userId) || new Set();
        if (userSockets.size >= this.maxConnectionsPerUser) {
            console.warn(`[ConnectionPool] User ${userId} exceeded max connections (${this.maxConnectionsPerUser})`);
            return false;
        }

        userSockets.add(socketId);
        this.userConnections.set(userId, userSockets);
        this.socketUsers.set(socketId, userId);

        return true;
    }

    /**
     * Unregister a socket connection
     */
    unregisterConnection(socketId: string): void {
        const userId = this.socketUsers.get(socketId);
        if (userId) {
            const userSockets = this.userConnections.get(userId);
            userSockets?.delete(socketId);
            if (userSockets?.size === 0) {
                this.userConnections.delete(userId);
            }
        }
        this.socketUsers.delete(socketId);

        // Clean up room connections
        this.roomConnections.forEach((sockets, room) => {
            sockets.delete(socketId);
            if (sockets.size === 0) {
                this.roomConnections.delete(room);
            }
        });
    }

    /**
     * Register socket joining a room
     */
    joinRoom(socketId: string, room: string): boolean {
        // Check if socket is in too many rooms
        let roomCount = 0;
        this.roomConnections.forEach(sockets => {
            if (sockets.has(socketId)) roomCount++;
        });

        if (roomCount >= this.maxRoomsPerSocket) {
            console.warn(`[ConnectionPool] Socket ${socketId} exceeded max rooms (${this.maxRoomsPerSocket})`);
            return false;
        }

        const sockets = this.roomConnections.get(room) || new Set();
        sockets.add(socketId);
        this.roomConnections.set(room, sockets);

        return true;
    }

    /**
     * Unregister socket leaving a room
     */
    leaveRoom(socketId: string, room: string): void {
        const sockets = this.roomConnections.get(room);
        sockets?.delete(socketId);
        if (sockets?.size === 0) {
            this.roomConnections.delete(room);
        }
    }

    /**
     * Get all socket IDs for a user
     */
    getUserSockets(userId: string): Set<string> {
        return this.userConnections.get(userId) || new Set();
    }

    /**
     * Get stats for monitoring
     */
    getStats() {
        return {
            totalUsers: this.userConnections.size,
            totalSockets: this.socketUsers.size,
            totalRooms: this.roomConnections.size,
            averageSocketsPerUser: this.socketUsers.size / Math.max(1, this.userConnections.size),
            averageSocketsPerRoom: Array.from(this.roomConnections.values())
                .reduce((sum, sockets) => sum + sockets.size, 0) / Math.max(1, this.roomConnections.size)
        };
    }
}

let connectionPoolManager: ConnectionPoolManager | null = null;

/**
 * Singleton getter for ConnectionPoolManager
 */
export function getConnectionPoolManager(): ConnectionPoolManager {
    if (!connectionPoolManager) {
        connectionPoolManager = new ConnectionPoolManager();
    }
    return connectionPoolManager;
}
