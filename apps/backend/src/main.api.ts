/**
 * API Server Entry Point
 * Handles HTTP API and WebSocket connections
 * Run with: node dist/main.api.js
 */
import 'reflect-metadata';
import cors from 'cors';
import { json } from 'express';
import { createAdapter } from '@socket.io/redis-adapter';
import { NestFactory } from '@nestjs/core';
import { Server } from 'socket.io';
import env from './config/env';
import { redis, redisPub, redisSub, redisNotificationsSub } from '@/lib/redis';
import { metrics, getMetrics, contentType } from '@/monitoring/metrics';
import { authMiddleware } from './middleware/auth';
import { registerPostHandlers } from './handlers/postHandlers';
import { registerCommentHandlers } from './handlers/commentHandlers';
import { registerFeedHandlers } from './handlers/feedHandlers';
import { registerNotificationHandlers } from './handlers/notificationHandlers';
import { registerMessageHandlers } from './handlers/messageHandlers';
import { registerChannelHandlers } from './handlers/channelHandlers';
import { registerCollaborationHandlers } from './handlers/collaborationHandlers';
import { PresenceService } from './services/socket/presenceService';
import { getFriendIds, getTeamMemberIds } from './utils/socket/authorization';
import { AppModule } from './app.module';
import { inngestHandler } from './inngest/serve';
import { createHealthRouter } from './services/matching/routes/health';
import { Pool } from 'pg';
import { createLifecycleManager } from './lib/lifecycleManager';
import type {
    ServerToClientEvents,
    ClientToServerEvents,
    InterServerEvents,
    SocketData
} from '@agentflox/types';
import { execSync } from 'child_process';

const lifecycle = createLifecycleManager('api-server');

async function bootstrapApiServer() {
    const app = await NestFactory.create(AppModule, {
        cors: false,
    });

    app.use(json({ limit: '1mb' }));
    app.use(
        cors({
            origin: env.CORS_ORIGIN.split(','),
            credentials: true,
        })
    );

    // Inngest webhook endpoint
    app.use('/api/inngest', inngestHandler);

    const httpServer = app.getHttpServer();

    const io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> = new Server(httpServer, {
        cors: {
            origin: env.CORS_ORIGIN.split(','),
            methods: ['GET', 'POST'],
            credentials: true,
        },
        transports: ['websocket', 'polling'],

        // Optimize for 5k concurrent users
        pingTimeout: 30000,        // Reduce from 60s (faster disconnect detection)
        pingInterval: 25000,
        maxHttpBufferSize: 1e6,    // 1MB limit per message
        perMessageDeflate: false,  // Disable compression (saves CPU)

        // Connection timeouts
        connectTimeout: 45000,     // Connection establishment timeout
        upgradeTimeout: 10000,     // WebSocket upgrade timeout
    });

    // Connection Limiter
    const MAX_CONNECTIONS_PER_INSTANCE = 6000; // Increased to 6k for 5k user goal
    io.use((socket, next) => {
        const currentConnections = io.sockets.sockets.size;

        if (currentConnections >= MAX_CONNECTIONS_PER_INSTANCE) {
            console.warn(`⚠️ Connection limit reached: ${currentConnections}/${MAX_CONNECTIONS_PER_INSTANCE}`);
            return next(new Error('Server at capacity, please try again'));
        }

        next();
    });

    io.adapter(createAdapter(redisPub, redisSub));
    io.use(authMiddleware);

    const { scopeAuthMiddleware } = await import('./middleware/socket/scopeAuth');
    io.use(scopeAuthMiddleware as any);

    lifecycle.setSocketIO(io);

    const expressApp = app.getHttpAdapter().getInstance();

    // Health check endpoints
    expressApp.get('/health', async (req: any, res: any) => {
        const checks = {
            redis: redis.status === 'ready',
            redisPub: redisPub.status === 'ready',
            redisSub: redisSub.status === 'ready',
            socketio: io.sockets.sockets.size >= 0,
            uptime: process.uptime(),
            phase: lifecycle.getPhase(),
        };

        const healthy = checks.redis && checks.redisPub && checks.redisSub && lifecycle.isReady();
        res.status(healthy ? 200 : 503).json({
            status: healthy ? 'healthy' : 'degraded',
            checks,
            timestamp: new Date().toISOString()
        });
    });

    // Liveness probe (is the process responding?)
    expressApp.get('/health/live', (req: any, res: any) => {
        res.status(200).json({ status: 'alive' });
    });

    // Readiness probe (is the service ready for traffic?)
    expressApp.get('/health/ready', async (req: any, res: any) => {
        const ready = lifecycle.isReady() && redis.status === 'ready';
        res.status(ready ? 200 : 503).json({
            status: ready ? 'ready' : 'not_ready',
            phase: lifecycle.getPhase()
        });
    });

    expressApp.get('/metrics', async (req: any, res: any) => {
        res.set('Content-Type', contentType);
        res.end(await getMetrics());
    });

    // Sync system tools (for populating system_tools when empty)
    expressApp.post('/api/sync-tools', async (_req: any, res: any) => {
        try {
            const { syncSkillsAndTools } = await import('./services/agents/registry/sync');
            await syncSkillsAndTools();
            res.status(200).json({ ok: true, message: 'Tools synced successfully' });
        } catch (err: any) {
            console.error('[api-server] Sync tools error:', err);
            res.status(500).json({ ok: false, error: err?.message || 'Sync failed' });
        }
    });

    // Matching service health checks
    // Matching service health checks and db pool optimization
    const matchingDbPool = new Pool({
        connectionString: env.DATABASE_URL,
        max: 20, // Increase pool size (20 connections)
        idleTimeoutMillis: 30000, // Close idle connections after 30s
        connectionTimeoutMillis: 5000, // Fail if no connection available after 5s
    });
    app.use('/api', createHealthRouter(matchingDbPool));

    // Redis pub/sub for notifications
    redisNotificationsSub.subscribe('notifications').catch((err) => {
        console.error('[api-server] Failed to subscribe to notifications channel', err);
    });

    redisNotificationsSub.on('message', (channel, message) => {
        if (channel !== 'notifications') return;
        try {
            const payload = JSON.parse(message);
            const { userId, notification } = payload;
            if (!userId || !notification) return;
            io.to(`user:${userId}`).emit('notification:new', { notification });
        } catch (err) {
            console.error('[api-server] Error handling notification message', err);
        }
    });

    // Socket connection handler
    io.on('connection', async (socket) => {
        metrics.socketConnections.inc();
        console.log(`[api-server] ✅ User connected: ${socket.data.userId} (${socket.id})`);

        try {
            await PresenceService.setUserOnline(socket.data.userId, socket.id);

            // Only join workspace-specific rooms if workspace context exists
            if (socket.data.workspaceId) {
                const { ShardingService } = await import('./services/socket/shardingService');
                const userRoom = ShardingService.getShardedWorkspaceUserRoom(
                    socket.data.workspaceId,
                    socket.data.userId
                );
                await socket.join(userRoom);
            }

            // Always join user-specific room
            await socket.join(`user:${socket.data.userId}`);

            // 🧪 SKIP HEAVY OPERATIONS FOR LOAD TESTING
            const isLoadTestUser = socket.data.userId.startsWith('load-test-');

            if (!isLoadTestUser && socket.data.workspaceId) {
                const { PresenceBroadcastService } = await import('./services/socket/presenceBroadcast');
                const shouldBroadcast = await PresenceBroadcastService.shouldBroadcastPresence(
                    socket.data.userId,
                    'online',
                    5
                );

                if (shouldBroadcast) {
                    const targets = await PresenceBroadcastService.getPresenceBroadcastTargets(
                        socket.data.userId,
                        getFriendIds,
                        getTeamMemberIds
                    );

                    await PresenceBroadcastService.broadcastPresenceUpdate(io, targets, {
                        userId: socket.data.userId,
                        username: socket.data.username,
                        status: 'online',
                        workspaceId: socket.data.workspaceId,
                    });

                    await redisPub.publish(
                        'presence:updates',
                        JSON.stringify({
                            userId: socket.data.userId,
                            username: socket.data.username,
                            status: 'online',
                            workspaceId: socket.data.workspaceId,
                            timestamp: new Date().toISOString(),
                        })
                    );
                }

                // Deliver pending messages
                const { deliverPendingMessages } = await import('./services/messageDeliveryQueue');
                await deliverPendingMessages(socket.data.userId, io);
            }


            // Heartbeat handler
            socket.on('heartbeat', async (callback?: () => void) => {
                if (!isLoadTestUser) {
                    await PresenceService.updatePresence(socket.data.userId, socket.id);
                }
                if (callback) callback(); // ACK for load test latency tracking
            });

            // Register all handlers
            registerPostHandlers(io, socket);
            registerCommentHandlers(io, socket);
            registerFeedHandlers(io, socket);

            const { registerEnhancedTypingHandlers } = await import('./handlers/typingHandlers');
            registerEnhancedTypingHandlers(io, socket);

            registerNotificationHandlers(io, socket);
            registerMessageHandlers(io, socket);
            registerChannelHandlers(io, socket);
            registerCollaborationHandlers(io, socket);

            // Disconnect handler
            socket.on('disconnect', async (reason: string) => {
                metrics.socketConnections.dec();
                console.log(`[api-server] ❌ User disconnected: ${socket.data.userId} (${reason})`);

                try {
                    if (!isLoadTestUser) {
                        await PresenceService.setUserOffline(socket.data.userId, socket.id);
                        const isStillOnline = await PresenceService.isUserOnline(socket.data.userId);

                        // Only broadcast presence updates if user has workspace context
                        if (!isStillOnline && socket.data.workspaceId) {
                            const { PresenceBroadcastService } = await import('./services/socket/presenceBroadcast');
                            const shouldBroadcastOffline = await PresenceBroadcastService.shouldBroadcastPresence(
                                socket.data.userId,
                                'offline',
                                5
                            );

                            if (shouldBroadcastOffline) {
                                const targets = await PresenceBroadcastService.getPresenceBroadcastTargets(
                                    socket.data.userId,
                                    getFriendIds,
                                    getTeamMemberIds
                                );

                                await PresenceBroadcastService.broadcastPresenceUpdate(io, targets, {
                                    userId: socket.data.userId,
                                    username: socket.data.username,
                                    status: 'offline',
                                    workspaceId: socket.data.workspaceId,
                                });

                                await redisPub.publish(
                                    'presence:updates',
                                    JSON.stringify({
                                        userId: socket.data.userId,
                                        username: socket.data.username,
                                        status: 'offline',
                                        workspaceId: socket.data.workspaceId,
                                        timestamp: new Date().toISOString(),
                                    })
                                );
                            }
                        }
                    }
                } catch (error) {
                    console.error('[api-server] Error handling disconnect:', error);
                }
            });
        } catch (error) {
            console.error('[api-server] Error in connection handler:', error);
            socket.disconnect();
        }
    });

    // Register lifecycle hooks

    // Singleton hooks (run on only one instance)
    lifecycle.onSingleton('syncTools', async () => {
        const { syncSkillsAndTools } = await import('./services/agents/registry/sync');
        await syncSkillsAndTools();
    }, 10);

    //lifecycle.onSingleton('syncTriggers', async () => {
    //     const { syncTriggersToDatabase } = await import('./services/agents/registry/triggerRegistry');
    //     await syncTriggersToDatabase();
    //     console.log('[api-server] Triggers synced to database');
    // }, 20);

    //lifecycle.onSingleton('syncTemplates', async () => {
    //     const { syncTemplatesToDatabase } = await import('./services/agents/prompts/templateRegistry');
    //     await syncTemplatesToDatabase();
    //     console.log('[api-server] Templates synced to database');
    // }, 30);

    // Interval tasks (cleanup, maintenance)
    lifecycle.registerInterval('cleanStalePresence', async () => {
        const cleaned = await PresenceService.cleanupStaleEntries();
        if (cleaned > 0) {
            console.log(`[api-server] Cleaned ${cleaned} stale presence entries`);
        }
    }, 60000);

    // Monitor Performance Metrics
    lifecycle.registerInterval('logMetrics', async () => {
        try {
            const metrics = {
                connections: io.sockets.sockets.size,
                redisMemory: await redis.info('memory').then(info => {
                    const match = info.match(/used_memory_human:(\S+)/);
                    return match ? match[1] : 'unknown';
                }).catch(() => 'error'),
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage().rss / 1024 / 1024 + ' MB', // RSS in MB
            };

            // Log metrics periodically
            console.log('[metrics]', JSON.stringify(metrics));

            // Alert if approaching limits
            if (metrics.connections > 5400) { // 90% of 6000
                console.warn('⚠️ Approaching connection limit!');
            }
        } catch (error) {
            console.error('[metrics] Error collecting metrics', error);
        }
    }, 30000); // Every 30s

    // Shutdown hooks
    lifecycle.onShutdown('closeMatchingPool', async () => {
        await matchingDbPool.end();
        console.log('[api-server] Database pool closed');
    }, 10);

    // Start everything
    await lifecycle.start();

    const PORT = parseInt(env.PORT, 10);

    // In development on Windows, tsx watch often leaves zombie processes holding the port.
    // We forcefully clear the port if it's in use by someone else.
    if (env.NODE_ENV === 'development' && process.platform === 'win32') {
        try {
            const stdout = execSync(`netstat -ano | findstr :${PORT} | findstr LISTENING`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
            const pid = stdout.split('\n')[0].trim().split(/\s+/).pop();
            if (pid && pid !== process.pid.toString()) {
                console.log(`[api-server] � Killing zombie process ${pid} on port ${PORT}`);
                execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
                // Small delay to allow OS to release the socket
                await new Promise(r => setTimeout(r, 200));
            }
        } catch (e) {
            // Port not in use or netstat failed, either way we're good to try listening
        }
    }

    await app.listen(PORT, '127.0.0.1');
    console.log(`[api-server] 🚀 Server running on port ${PORT} (bound to 127.0.0.1)`);

    console.log(`[api-server] 📡 Environment: ${env.NODE_ENV}`);
}

bootstrapApiServer().catch((error) => {
    console.error('[api-server] Fatal error during startup:', error);
    process.exit(1);
});
