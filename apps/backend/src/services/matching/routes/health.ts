import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { openai } from '@/lib/openai';
import { logger } from '../lib/logger';

export function createHealthRouter(pool: Pool) {
    const router = Router();

    interface HealthCheck {
        status: 'up' | 'down' | 'degraded';
        latency?: number;
        error?: string;
    }

    interface HealthResponse {
        status: 'healthy' | 'degraded' | 'unhealthy';
        timestamp: string;
        checks: {
            database: HealthCheck;
            redis?: HealthCheck;
            openai?: HealthCheck;
        };
    }

    /**
     * Overall health check
     */
    router.get('/health/matching', async (req: Request, res: Response) => {
        const checks: HealthResponse['checks'] = {
            database: await checkDatabase(pool),
            redis: await checkRedis(),
            openai: await checkOpenAI(),
        };

        const allHealthy = Object.values(checks).every(check => check.status === 'up');
        const anyDown = Object.values(checks).some(check => check.status === 'down');

        const status: HealthResponse['status'] = allHealthy
            ? 'healthy'
            : anyDown
                ? 'unhealthy'
                : 'degraded';

        const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;

        res.status(statusCode).json({
            status,
            timestamp: new Date().toISOString(),
            checks,
        });
    });

    /**
     * Database health check
     */
    router.get('/health/matching/database', async (req: Request, res: Response) => {
        const check = await checkDatabase(pool);
        const statusCode = check.status === 'up' ? 200 : 503;
        res.status(statusCode).json(check);
    });

    /**
     * Redis health check
     */
    router.get('/health/matching/redis', async (req: Request, res: Response) => {
        const check = await checkRedis();
        const statusCode = check.status === 'up' ? 200 : 503;
        res.status(statusCode).json(check);
    });

    /**
     * OpenAI health check
     */
    router.get('/health/matching/openai', async (req: Request, res: Response) => {
        const check = await checkOpenAI();
        const statusCode = check.status === 'up' ? 200 : 503;
        res.status(statusCode).json(check);
    });

    return router;
}

/**
 * Check database connectivity
 */
async function checkDatabase(pool: Pool): Promise<HealthCheck> {
    const start = Date.now();
    try {
        await pool.query('SELECT 1');
        return {
            status: 'up',
            latency: Date.now() - start,
        };
    } catch (error: any) {
        logger.error({ error: error.message }, 'Database health check failed');
        return {
            status: 'down',
            latency: Date.now() - start,
            error: error.message,
        };
    }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<HealthCheck> {
    const start = Date.now();
    try {
        // Import redis dynamically to avoid circular dependencies
        const { redisPub } = await import('@/lib/redis');
        await redisPub.ping();
        return {
            status: 'up',
            latency: Date.now() - start,
        };
    } catch (error: any) {
        logger.error({ error: error.message }, 'Redis health check failed');
        return {
            status: 'down',
            latency: Date.now() - start,
            error: error.message,
        };
    }
}

/**
 * Check OpenAI API availability
 */
async function checkOpenAI(): Promise<HealthCheck> {
    const start = Date.now();
    try {
        // Just check if we can list models (lightweight check)
        await openai.models.retrieve('text-embedding-3-large');
        return {
            status: 'up',
            latency: Date.now() - start,
        };
    } catch (error: any) {
        logger.error({ error: error.message }, 'OpenAI health check failed');

        // Treat as degraded if it's a rate limit, down if unreachable
        const status = error.code === 'rate_limit_exceeded' ? 'degraded' : 'down';

        return {
            status,
            latency: Date.now() - start,
            error: error.message,
        };
    }
}
