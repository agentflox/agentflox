/**
 * API Server Entry Point
 * Handles HTTP API and WebSocket connections
 * Run with: node dist/main.api.js
 */
import 'reflect-metadata';
import cors from 'cors';
import helmet from 'helmet';
import { json, raw, type Request, type Response, type NextFunction } from 'express';
import { createAdapter } from '@socket.io/redis-adapter';
import { NestFactory } from '@nestjs/core';
import { Server } from 'socket.io';
import env from './config/env';
import { redis, redisPub, redisSub, redisNotificationsSub } from '@/lib/redis';
import { metrics, getMetrics, contentType } from '@/monitoring/metrics';
import { authMiddleware } from './middleware/auth';
import { registerPostHandlers } from './handlers/postHandlers';
import { registerCommentHandlers } from './handlers/commentHandlers';
import { registerListingCommentHandlers } from './handlers/listingCommentHandlers';
import { registerFeedHandlers } from './handlers/feedHandlers';
import { registerNotificationHandlers } from './handlers/notificationHandlers';
import { registerMessageHandlers } from './handlers/messageHandlers';
import { registerChannelHandlers } from './handlers/channelHandlers';
import { registerCollaborationHandlers } from './handlers/collaborationHandlers';
import { registerToolExecutionHandlers } from './handlers/toolExecutionHandlers';
import { PresenceService } from './services/socket/presenceService';
import { getFriendIds, getTeamMemberIds } from './utils/socket/authorization';
import { AppModule } from './app.module';
import { inngestHandler } from './inngest-handlers/serve';
import { createLifecycleManager } from './lib/lifecycleManager';
import { metricsAuthMiddleware, requestTimeoutMiddleware } from './middleware/httpSecurity';
import { PRESENCE_CONFIG } from './lib/presenceConfig';
import type {
    ServerToClientEvents,
    ClientToServerEvents,
    InterServerEvents,
    SocketData
} from '@agentflox/types';
import { execSync } from 'child_process';

const lifecycle = createLifecycleManager('api-server');

async function bootstrapApiServer() {
    const redisRealtimeDisabled = String(env.DISABLE_REDIS_REALTIME || '').toLowerCase() === 'true';
    const apiSingletonsDisabled = String(env.DISABLE_API_SINGLETON_HOOKS || '').toLowerCase() === 'true';

    const app = await NestFactory.create(AppModule, { cors: false });

    app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    }));
    app.use(requestTimeoutMiddleware);

    const captureWebhookRawBody = (req: Request, _res: Response, next: NextFunction) => {
        const buf = req.body;
        (req as any).rawBody = Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf ?? '');
        try {
            req.body = JSON.parse((req as any).rawBody);
        } catch {
            req.body = {};
        }
        next();
    };
    app.use('/api/billing/paypal/webhook', raw({ type: 'application/json' }), captureWebhookRawBody);
    app.use('/api/billing/stripe/webhook', raw({ type: 'application/json' }), (req: Request, _res: Response, next: NextFunction) => {
        const buf = req.body;
        (req as any).rawBody = Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf ?? '');
        next();
    });

    app.use(json({ limit: '1mb' }));
    app.enableCors({
        origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
        credentials: true,
    });

    app.use('/api/inngest', inngestHandler);

    const httpServer = app.getHttpServer();

    const io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> = new Server(httpServer, {
        cors: {
            origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
            methods: ['GET', 'POST'],
            credentials: true,
        },
        transports: ['websocket', 'polling'],

        // Keep these in sync with PRESENCE_CONFIG
        pingTimeout: PRESENCE_CONFIG.PING_TIMEOUT_MS,
        pingInterval: PRESENCE_CONFIG.PING_INTERVAL_MS,
        maxHttpBufferSize: 1e6,
        perMessageDeflate: false,

        connectTimeout: 45000,
        upgradeTimeout: 30000, // Increased from 10s — allows auth middleware time to complete
    });

    // Connection limiter
    const MAX_CONNECTIONS_PER_INSTANCE = 6000;
    io.use((socket, next) => {
        const currentConnections = io.sockets.sockets.size;
        if (currentConnections >= MAX_CONNECTIONS_PER_INSTANCE) {
            console.warn(`⚠️ Connection limit reached: ${currentConnections}/${MAX_CONNECTIONS_PER_INSTANCE}`);
            return next(new Error('Server at capacity, please try again'));
        }
        next();
    });

    if (!redisRealtimeDisabled) {
        io.adapter(createAdapter(redisPub, redisSub));
    } else {
        console.warn('[api-server] Redis Socket.IO adapter disabled. Running single-instance in-memory mode.');
    }

    io.use(authMiddleware);
    const { scopeAuthMiddleware } = await import('./middleware/socket/scopeAuth');
    io.use(scopeAuthMiddleware as any);

    lifecycle.setSocketIO(io);

    const expressApp = app.getHttpAdapter().getInstance();

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
            timestamp: new Date().toISOString(),
        });
    });

    expressApp.get('/health/live', (_req: any, res: any) => {
        res.status(200).json({ status: 'alive' });
    });

    expressApp.get('/health/ready', async (_req: any, res: any) => {
        const ready = lifecycle.isReady() && redis.status === 'ready';
        res.status(ready ? 200 : 503).json({
            status: ready ? 'ready' : 'not_ready',
            phase: lifecycle.getPhase(),
        });
    });

    expressApp.get('/metrics', metricsAuthMiddleware, async (_req: any, res: any) => {
        res.set('Content-Type', contentType);
        res.end(await getMetrics());
    });

    // Redis pub/sub for notifications
    if (!redisRealtimeDisabled) {
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
    }

    // Pre-import dynamic modules to avoid per-connection import overhead
    const [
        { ShardingService },
        { PresenceBroadcastService },
        { deliverPendingMessages },
        { registerEnhancedTypingHandlers },
    ] = await Promise.all([
        import('./services/socket/shardingService'),
        import('./services/socket/presenceBroadcast'),
        import('./services/messageDeliveryQueue'),
        import('./handlers/typingHandlers'),
    ]);

    // Socket connection handler
    io.on('connection', async (socket) => {
        metrics.socketConnections.inc();
        console.log(`[api-server] ✅ User connected: ${socket.data.userId} (${socket.id})`);

        try {
            await PresenceService.setUserOnline(socket.data.userId, socket.id);

            if (socket.data.workspaceId) {
                const userRoom = ShardingService.getShardedWorkspaceUserRoom(
                    socket.data.workspaceId,
                    socket.data.userId
                );
                await socket.join(userRoom);
            }

            // Always join user-specific room — required for direct message delivery
            await socket.join(`user:${socket.data.userId}`);

            const isLoadTestUser = socket.data.userId.startsWith('load-test-');

            if (!isLoadTestUser && socket.data.workspaceId) {
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

                    if (!redisRealtimeDisabled) {
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
                }

                await deliverPendingMessages(socket.data.userId, io);
            }

            // Heartbeat — refreshes Redis presence TTL
            // Client must emit 'heartbeat' every PRESENCE_CONFIG.HEARTBEAT_MS ms
            socket.on('heartbeat', async (callback?: () => void) => {
                if (!isLoadTestUser) {
                    await PresenceService.updatePresence(socket.data.userId, socket.id);
                }
                if (typeof callback === 'function') callback();
            });

            // Register all event handlers
            registerPostHandlers(io, socket);
            registerCommentHandlers(io, socket);
            registerListingCommentHandlers(io, socket);
            registerFeedHandlers(io, socket);
            registerEnhancedTypingHandlers(io, socket);
            registerNotificationHandlers(io, socket);
            registerMessageHandlers(io, socket);
            registerChannelHandlers(io, socket);
            registerCollaborationHandlers(io, socket);
            registerToolExecutionHandlers(io, socket as any);

            socket.on('disconnect', async (reason: string) => {
                metrics.socketConnections.dec();
                console.log(`[api-server] ❌ User disconnected: ${socket.data.userId} (${reason})`);

                try {
                    if (!isLoadTestUser) {
                        await PresenceService.setUserOffline(socket.data.userId, socket.id);
                        const isStillOnline = await PresenceService.isUserOnline(socket.data.userId);

                        if (!isStillOnline && socket.data.workspaceId) {
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

                                if (!redisRealtimeDisabled) {
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

    // Singleton lifecycle hooks
    //if (!apiSingletonsDisabled) {
    //    lifecycle.onSingleton('syncTools', async () => {
    //        const { syncSkillsAndTools } = await import('./services/agents/registry/sync');
    //        await syncSkillsAndTools();
    //    }, 10);
    //} else {
    //    console.warn('[api-server] API singleton hooks disabled (DISABLE_API_SINGLETON_HOOKS=true)');
    // }

    lifecycle.registerInterval('cleanStalePresence', async () => {
    const cleaned = await PresenceService.cleanupStaleEntries();
    if (cleaned > 0) {
        console.log(`[api-server] Cleaned ${cleaned} stale presence entries`);
    }
}, PRESENCE_CONFIG.CLEANUP_INTERVAL_MS);

lifecycle.registerInterval('logMetrics', async () => {
    try {
        const snapshot = {
            connections: io.sockets.sockets.size,
            redisMemory: await redis.info('memory').then((info) => {
                const match = info.match(/used_memory_human:(\S+)/);
                return match ? match[1] : 'unknown';
            }).catch(() => 'error'),
            uptime: process.uptime(),
            memoryUsage: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)} MB`,
        };
        console.log('[metrics]', JSON.stringify(snapshot));
        if (snapshot.connections > 5400) {
            console.warn('⚠️ Approaching connection limit!');
        }
    } catch (error) {
        console.error('[metrics] Error collecting metrics', error);
    }
}, 30000);

// Start lifecycle (background jobs, singletons) without blocking port binding
lifecycle.start().catch((err) => {
    console.error('[api-server] Lifecycle startup error:', err);
});

const PORT = parseInt(env.PORT, 10);

// In development on Windows, tsx watch can leave zombie processes holding the port.
if (env.NODE_ENV === 'development' && process.platform === 'win32') {
    try {
        const stdout = execSync(
            `netstat -ano | findstr :${PORT} | findstr LISTENING`,
            { stdio: ['pipe', 'pipe', 'ignore'] }
        ).toString();
        const pid = stdout.split('\n')[0].trim().split(/\s+/).pop();
        if (pid && pid !== process.pid.toString()) {
            console.log(`[api-server] 🔫 Killing zombie process ${pid} on port ${PORT}`);
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            await new Promise((r) => setTimeout(r, 200));
        }
    } catch {
        // Port not in use — safe to proceed
    }
}

// Bind the port FIRST so the socket server accepts connections immediately,
// before lifecycle hooks (tool sync, etc.) have finished warming up.
await app.listen(PORT, '0.0.0.0');
console.log(`[api-server] 🚀 Server running on port ${PORT}`);
console.log(`[api-server] 📡 Environment: ${env.NODE_ENV}`);
console.log(`[api-server] 🕐 Presence TTL: ${PRESENCE_CONFIG.TTL_SECONDS}s | Heartbeat: ${PRESENCE_CONFIG.HEARTBEAT_MS}ms`);
}

bootstrapApiServer().catch((error) => {
    console.error('[api-server] Fatal error during startup:', error);
    process.exit(1);
});