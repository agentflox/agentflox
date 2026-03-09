/**
 * Worker Entry Point
 * Handles BullMQ background jobs and Inngest functions
 * Run with: node dist/main.worker.js
 */
import 'reflect-metadata';
import env from './config/env';
import { redis } from '@/lib/redis';
import { createLifecycleManager } from './lib/lifecycleManager';
import { PresenceService } from './services/socket/presenceService';
import { execSync } from 'child_process';

const lifecycle = createLifecycleManager('worker');

async function bootstrapWorker() {
    console.log('[worker] Starting background worker...');

    // Register startup hooks
    lifecycle.onStartup('validateRedis', async () => {
        // Wait for Redis to be ready
        let retries = 0;
        while (redis.status !== 'ready' && retries < 10) {
            console.log(`[worker] Waiting for Redis connection... (attempt ${retries + 1})`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
            retries++;
        }

        if (redis.status !== 'ready') {
            throw new Error('Failed to connect to Redis');
        }
        console.log('[worker] Redis connected');
    }, 1);

    // Start message delivery worker
    lifecycle.onStartup('messageDeliveryWorker', async () => {
        const { startMessageDeliveryWorker } = await import('./services/messageDeliveryQueue');
        // Pass null for io since worker doesn't have socket access
        // Messages get routed through Redis pub/sub instead
        startMessageDeliveryWorker(null as any);
        console.log('[worker] Message delivery worker started');
    }, 50);

    // Start matching scheduler (singleton - only one instance should run this)
    lifecycle.onSingleton('matchingScheduler', async () => {
        const { startMatchingScheduler } = await import('./services/matching/processors/schedule');
        await startMatchingScheduler();
        console.log('[worker] Matching scheduler started');
    }, 10);

    // Register interval tasks
    lifecycle.registerInterval('cleanStalePresence', async () => {
        const cleaned = await PresenceService.cleanupStaleEntries();
        if (cleaned > 0) {
            console.log(`[worker] Cleaned ${cleaned} stale presence entries`);
        }
    }, 60000);

    // Health check endpoint for worker (optional - can be enabled for k8s)
    if (env.WORKER_HEALTH_PORT) {
        const http = await import('http');
        const port = parseInt(env.WORKER_HEALTH_PORT, 10);

        const server = http.createServer((req, res) => {
            if (req.url === '/health/live') {
                res.writeHead(200);
                res.end(JSON.stringify({ status: 'alive' }));
            } else if (req.url === '/health/ready') {
                const ready = lifecycle.isReady() && redis.status === 'ready';
                res.writeHead(ready ? 200 : 503);
                res.end(JSON.stringify({
                    status: ready ? 'ready' : 'not_ready',
                    phase: lifecycle.getPhase()
                }));
            } else {
                res.writeHead(404);
                res.end();
            }
        });

        lifecycle.onStartup('healthServer', async () => {
            // In development on Windows, tsx watch often leaves zombie processes holding the port.
            if (env.NODE_ENV === 'development' && process.platform === 'win32') {
                try {
                    const stdout = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
                    const pid = stdout.split('\n')[0].trim().split(/\s+/).pop();
                    if (pid && pid !== process.pid.toString()) {
                        console.log(`[worker] 🔫 Killing zombie process ${pid} on port ${port}`);
                        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
                        await new Promise(r => setTimeout(r, 200));
                    }
                } catch (e) {
                    // Port clean
                }
            }

            await new Promise<void>((resolve) => {
                server.listen(port, '127.0.0.1', () => {
                    console.log(`[worker] Health check server running on port ${port} (bound to 127.0.0.1)`);
                    resolve();
                });
            });
        }, 100);

        lifecycle.onShutdown('healthServer', async () => {
            await new Promise<void>((resolve) => {
                server.close(() => resolve());
            });
        }, 100);
    }

    // Start lifecycle
    await lifecycle.start();

    console.log('[worker] 🏃 Worker is running');
    console.log(`[worker] 📡 Environment: ${env.NODE_ENV}`);

    // Keep the process alive
    await new Promise(() => { });
}

bootstrapWorker().catch((error) => {
    console.error('[worker] Fatal error during startup:', error);
    process.exit(1);
});
