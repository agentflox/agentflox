import { redis, redisPub, redisSub, redisNotificationsSub } from '@/lib/redis';

/**
 * Service lifecycle phases
 */
export enum LifecyclePhase {
    INITIALIZING = 'initializing',
    READY = 'ready',
    SHUTTING_DOWN = 'shutting_down',
    STOPPED = 'stopped',
}

/**
 * Lifecycle hook types
 */
interface LifecycleHook {
    name: string;
    priority: number;
    handler: () => Promise<void>;
}

/**
 * Distributed lock for singleton operations
 */
async function acquireLock(lockKey: string, ttlMs: number = 30000): Promise<boolean> {
    const lockValue = `${process.pid}-${Date.now()}`;
    const result = await redis.set(lockKey, lockValue, 'PX', ttlMs, 'NX');
    return result === 'OK';
}

async function releaseLock(lockKey: string): Promise<void> {
    await redis.del(lockKey);
}

/**
 * LifecycleManager - Orchestrates service startup and shutdown
 * Replaces the monolithic bootstrap() function with organized phases
 */
export class LifecycleManager {
    private phase: LifecyclePhase = LifecyclePhase.INITIALIZING;
    private startupHooks: LifecycleHook[] = [];
    private shutdownHooks: LifecycleHook[] = [];
    private singletonHooks: LifecycleHook[] = [];
    private intervalHandles: NodeJS.Timeout[] = [];
    private io?: any;
    private serviceName: string;

    constructor(serviceName: string) {
        this.serviceName = serviceName;
        this.setupSignalHandlers();
    }

    /**
     * Register a startup hook
     */
    onStartup(name: string, handler: () => Promise<void>, priority: number = 50): this {
        this.startupHooks.push({ name, handler, priority });
        return this;
    }

    /**
     * Register a shutdown hook
     */
    onShutdown(name: string, handler: () => Promise<void>, priority: number = 50): this {
        this.shutdownHooks.push({ name, handler, priority });
        return this;
    }

    /**
     * Register singleton hook (runs on only one instance using distributed lock)
     */
    onSingleton(name: string, handler: () => Promise<void>, priority: number = 50): this {
        this.singletonHooks.push({ name, handler, priority });
        return this;
    }

    /**
     * Register an interval task
     */
    registerInterval(name: string, handler: () => Promise<void>, intervalMs: number): this {
        const handle = setInterval(async () => {
            if (this.phase !== LifecyclePhase.READY) return;
            try {
                await handler();
            } catch (error) {
                console.error(`[${this.serviceName}] Error in interval task "${name}":`, error);
            }
        }, intervalMs);
        this.intervalHandles.push(handle);
        return this;
    }

    /**
     * Set Socket.IO instance for shutdown handling
     */
    setSocketIO(io: any): this {
        this.io = io;
        return this;
    }

    /**
     * Execute all startup hooks in priority order
     */
    async start(): Promise<void> {
        console.log(`[${this.serviceName}] Starting lifecycle manager...`);

        // Sort by priority (lower = first)
        const sortedHooks = [...this.startupHooks].sort((a, b) => a.priority - b.priority);

        for (const hook of sortedHooks) {
            try {
                console.log(`[${this.serviceName}] Running startup hook: ${hook.name}`);
                await hook.handler();
                console.log(`[${this.serviceName}] ✓ ${hook.name} completed`);
            } catch (error) {
                console.error(`[${this.serviceName}] ✗ ${hook.name} failed:`, error);
                throw error;
            }
        }

        // Run singleton hooks with distributed locking
        await this.runSingletonHooks();

        this.phase = LifecyclePhase.READY;
        console.log(`[${this.serviceName}] 🚀 Service is ready`);
    }

    /**
     * Run singleton hooks with distributed locking
     */
    private async runSingletonHooks(): Promise<void> {
        const sortedHooks = [...this.singletonHooks].sort((a, b) => a.priority - b.priority);

        for (const hook of sortedHooks) {
            const lockKey = `lock:singleton:${this.serviceName}:${hook.name}`;
            const acquired = await acquireLock(lockKey, 60000);

            if (acquired) {
                try {
                    console.log(`[${this.serviceName}] Running singleton hook: ${hook.name} (lock acquired)`);
                    await hook.handler();
                    console.log(`[${this.serviceName}] ✓ ${hook.name} completed`);
                } catch (error) {
                    console.error(`[${this.serviceName}] ✗ ${hook.name} failed:`, error);
                } finally {
                    await releaseLock(lockKey);
                }
            } else {
                console.log(`[${this.serviceName}] ⏭ Skipping singleton hook: ${hook.name} (another instance has lock)`);
            }
        }
    }

    /**
     * Execute graceful shutdown
     */
    async shutdown(reason: string = 'unknown'): Promise<void> {
        if (this.phase === LifecyclePhase.SHUTTING_DOWN || this.phase === LifecyclePhase.STOPPED) {
            return;
        }

        console.log(`[${this.serviceName}] Shutdown initiated (reason: ${reason})`);
        this.phase = LifecyclePhase.SHUTTING_DOWN;

        // Clear all intervals
        for (const handle of this.intervalHandles) {
            clearInterval(handle);
        }
        this.intervalHandles = [];

        // Close Socket.IO if available
        if (this.io) {
            await new Promise<void>((resolve) => {
                this.io!.close(() => {
                    console.log(`[${this.serviceName}] Socket.IO server closed`);
                    resolve();
                });
            });
        }

        // Run shutdown hooks in reverse priority order
        const sortedHooks = [...this.shutdownHooks].sort((a, b) => b.priority - a.priority);

        for (const hook of sortedHooks) {
            try {
                console.log(`[${this.serviceName}] Running shutdown hook: ${hook.name}`);
                await Promise.race([
                    hook.handler(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                ]);
                console.log(`[${this.serviceName}] ✓ ${hook.name} completed`);
            } catch (error) {
                console.error(`[${this.serviceName}] ✗ ${hook.name} failed:`, error);
            }
        }

        // Close Redis connections
        await this.closeRedisConnections();

        this.phase = LifecyclePhase.STOPPED;
        console.log(`[${this.serviceName}] Shutdown complete`);
    }

    /**
     * Close Redis connections gracefully
     */
    private async closeRedisConnections(): Promise<void> {
        try {
            await Promise.all([
                redis.quit().catch(() => { }),
                redisPub.quit().catch(() => { }),
                redisSub.quit().catch(() => { }),
                redisNotificationsSub.quit().catch(() => { }),
            ]);
            console.log(`[${this.serviceName}] Redis connections closed`);
        } catch (error) {
            console.error(`[${this.serviceName}] Error closing Redis connections:`, error);
        }
    }

    /**
     * Setup signal handlers for graceful shutdown
     */
    private setupSignalHandlers(): void {
        const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

        for (const signal of signals) {
            process.on(signal, async () => {
                await this.shutdown(signal);
                process.exit(0);
            });
        }

        // Handle uncaught exceptions
        process.on('uncaughtException', async (error) => {
            console.error(`[${this.serviceName}] Uncaught exception:`, error);
            await this.shutdown('uncaughtException');
            process.exit(1);
        });

        // Handle unhandled rejections
        process.on('unhandledRejection', async (reason) => {
            console.error(`[${this.serviceName}] Unhandled rejection:`, reason);
            await this.shutdown('unhandledRejection');
            process.exit(1);
        });
    }

    /**
     * Get current lifecycle phase
     */
    getPhase(): LifecyclePhase {
        return this.phase;
    }

    /**
     * Check if service is ready
     */
    isReady(): boolean {
        return this.phase === LifecyclePhase.READY;
    }
}

/**
 * Create a new lifecycle manager instance
 */
export function createLifecycleManager(serviceName: string): LifecycleManager {
    return new LifecycleManager(serviceName);
}
