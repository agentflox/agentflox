/**
 * Health Check Service
 * Enterprise-grade liveness, readiness, and dependency health checks
 */

import { redis, redisPub, redisSub, redisNotificationsSub } from '@/lib/redis';
import { prisma } from '@agentflox/database';

export interface HealthCheckResult {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    uptime: number;
    checks: Record<string, DependencyCheck>;
}

export interface DependencyCheck {
    status: 'up' | 'down' | 'degraded';
    latencyMs?: number;
    message?: string;
    lastCheck?: string;
}

interface HealthThresholds {
    redisLatencyWarnMs: number;
    redisLatencyCriticalMs: number;
    dbLatencyWarnMs: number;
    dbLatencyCriticalMs: number;
}

const DEFAULT_THRESHOLDS: HealthThresholds = {
    redisLatencyWarnMs: 50,
    redisLatencyCriticalMs: 200,
    dbLatencyWarnMs: 100,
    dbLatencyCriticalMs: 500,
};

class HealthCheckService {
    private thresholds: HealthThresholds;
    private lastResults: Map<string, DependencyCheck> = new Map();
    private version: string;

    constructor(thresholds: Partial<HealthThresholds> = {}) {
        this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
        this.version = process.env.npm_package_version || '1.0.0';
    }

    /**
     * Liveness check - is the process responding?
     * This should be fast and not check external dependencies
     */
    async liveness(): Promise<{ status: 'alive'; pid: number; uptime: number }> {
        return {
            status: 'alive',
            pid: process.pid,
            uptime: process.uptime(),
        };
    }

    /**
     * Readiness check - is the service ready to accept traffic?
     * Checks critical dependencies
     */
    async readiness(): Promise<{ ready: boolean; checks: Record<string, DependencyCheck> }> {
        const checks: Record<string, DependencyCheck> = {};

        // Check Redis (critical)
        checks.redis = await this.checkRedis();

        // Check Database (critical)
        checks.database = await this.checkDatabase();

        // Service is ready only if all critical checks pass
        const ready = checks.redis.status === 'up' && checks.database.status === 'up';

        return { ready, checks };
    }

    /**
     * Full health check - detailed status of all dependencies
     */
    async fullHealth(): Promise<HealthCheckResult> {
        const checks: Record<string, DependencyCheck> = {};

        // Check all Redis connections
        checks.redis = await this.checkRedis();
        checks.redisPub = await this.checkRedisPub();
        checks.redisSub = await this.checkRedisSub();
        checks.redisNotificationsSub = await this.checkRedisNotificationsSub();

        // Check database
        checks.database = await this.checkDatabase();

        // Check memory
        checks.memory = await this.checkMemory();

        // Check event loop
        checks.eventLoop = await this.checkEventLoop();

        // Determine overall status
        const statuses = Object.values(checks).map(c => c.status);
        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

        if (statuses.some(s => s === 'down')) {
            status = 'unhealthy';
        } else if (statuses.some(s => s === 'degraded')) {
            status = 'degraded';
        }

        return {
            status,
            timestamp: new Date().toISOString(),
            version: this.version,
            uptime: process.uptime(),
            checks,
        };
    }

    /**
     * Check main Redis connection
     */
    private async checkRedis(): Promise<DependencyCheck> {
        const start = Date.now();
        try {
            if (redis.status !== 'ready') {
                return { status: 'down', message: `Status: ${redis.status}` };
            }

            await redis.ping();
            const latencyMs = Date.now() - start;

            return {
                status: latencyMs > this.thresholds.redisLatencyCriticalMs ? 'degraded' : 'up',
                latencyMs,
                lastCheck: new Date().toISOString(),
            };
        } catch (error: any) {
            return { status: 'down', message: error.message };
        }
    }

    /**
     * Check Redis pub connection
     */
    private async checkRedisPub(): Promise<DependencyCheck> {
        try {
            if (redisPub.status !== 'ready') {
                return { status: 'down', message: `Status: ${redisPub.status}` };
            }
            return { status: 'up', lastCheck: new Date().toISOString() };
        } catch (error: any) {
            return { status: 'down', message: error.message };
        }
    }

    /**
     * Check Redis sub connection
     */
    private async checkRedisSub(): Promise<DependencyCheck> {
        try {
            if (redisSub.status !== 'ready') {
                return { status: 'down', message: `Status: ${redisSub.status}` };
            }
            return { status: 'up', lastCheck: new Date().toISOString() };
        } catch (error: any) {
            return { status: 'down', message: error.message };
        }
    }

    /**
     * Check Redis notifications sub connection
     */
    private async checkRedisNotificationsSub(): Promise<DependencyCheck> {
        try {
            if (redisNotificationsSub.status !== 'ready') {
                return { status: 'down', message: `Status: ${redisNotificationsSub.status}` };
            }
            return { status: 'up', lastCheck: new Date().toISOString() };
        } catch (error: any) {
            return { status: 'down', message: error.message };
        }
    }

    /**
     * Check database connection
     */
    private async checkDatabase(): Promise<DependencyCheck> {
        const start = Date.now();
        try {
            await prisma.$queryRaw`SELECT 1`;
            const latencyMs = Date.now() - start;

            return {
                status: latencyMs > this.thresholds.dbLatencyCriticalMs ? 'degraded' : 'up',
                latencyMs,
                lastCheck: new Date().toISOString(),
            };
        } catch (error: any) {
            return { status: 'down', message: error.message };
        }
    }

    /**
     * Check memory usage
     */
    private async checkMemory(): Promise<DependencyCheck> {
        const usage = process.memoryUsage();
        const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
        const rssGB = Math.round(usage.rss / 1024 / 1024 / 1024 * 100) / 100;

        const heapUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;

        return {
            status: heapUsagePercent > 90 ? 'degraded' : 'up',
            message: `Heap: ${heapUsedMB}/${heapTotalMB}MB (${Math.round(heapUsagePercent)}%), RSS: ${rssGB}GB`,
            lastCheck: new Date().toISOString(),
        };
    }

    /**
     * Check event loop lag
     */
    private async checkEventLoop(): Promise<DependencyCheck> {
        const start = Date.now();
        await new Promise(resolve => setImmediate(resolve));
        const lagMs = Date.now() - start;

        return {
            status: lagMs > 100 ? 'degraded' : 'up',
            latencyMs: lagMs,
            message: `Event loop lag: ${lagMs}ms`,
            lastCheck: new Date().toISOString(),
        };
    }

    /**
     * Cache last result for a check
     */
    private cacheResult(name: string, result: DependencyCheck): void {
        this.lastResults.set(name, result);
    }

    /**
     * Get cached result (for throttling checks)
     */
    getCachedResult(name: string): DependencyCheck | undefined {
        return this.lastResults.get(name);
    }
}

// Singleton export
export const healthCheck = new HealthCheckService();

/**
 * Express middleware for health endpoints
 */
export function createHealthRoutes(app: any): void {
    // Liveness probe - is the process alive?
    app.get('/health/live', async (req: any, res: any) => {
        try {
            const result = await healthCheck.liveness();
            res.status(200).json(result);
        } catch (error) {
            res.status(503).json({ status: 'dead' });
        }
    });

    // Readiness probe - is the service ready for traffic?
    app.get('/health/ready', async (req: any, res: any) => {
        try {
            const result = await healthCheck.readiness();
            res.status(result.ready ? 200 : 503).json(result);
        } catch (error) {
            res.status(503).json({ ready: false, error: 'Health check failed' });
        }
    });

    // Full health check - detailed status
    app.get('/health', async (req: any, res: any) => {
        try {
            const result = await healthCheck.fullHealth();
            const statusCode = result.status === 'healthy' ? 200 :
                result.status === 'degraded' ? 200 : 503;
            res.status(statusCode).json(result);
        } catch (error) {
            res.status(503).json({
                status: 'unhealthy',
                error: 'Health check failed',
                timestamp: new Date().toISOString(),
            });
        }
    });
}
