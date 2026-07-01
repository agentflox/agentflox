import type { Request, Response, NextFunction } from 'express';
import env from '@/config/env';

const DEFAULT_TIMEOUT_MS = 120_000;
const STREAMING_PATH_PREFIXES = ['/api/inngest', '/chat'];
const STREAMING_PATH_INCLUDES = ['message-stream'];

function isStreamingPath(path: string): boolean {
    return (
        STREAMING_PATH_PREFIXES.some((prefix) => path.startsWith(prefix)) ||
        STREAMING_PATH_INCLUDES.some((segment) => path.includes(segment))
    );
}

export function requestTimeoutMiddleware(req: Request, res: Response, next: NextFunction) {
    if (isStreamingPath(req.path)) {
        return next();
    }

    const timeoutMs = Number(env.HTTP_REQUEST_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
    const timer = setTimeout(() => {
        if (!res.headersSent) {
            res.status(408).json({ error: 'Request timeout' });
        }
    }, timeoutMs);

    const clear = () => clearTimeout(timer);
    res.on('finish', clear);
    res.on('close', clear);
    next();
}

export function metricsAuthMiddleware(req: Request, res: Response, next: NextFunction) {
    const token = env.METRICS_TOKEN;

    if (!token) {
        if (env.NODE_ENV === 'production') {
            return res.status(503).json({ error: 'Metrics endpoint is not configured' });
        }
        console.warn('[metrics] METRICS_TOKEN not set — allowing unauthenticated access in non-production');
        return next();
    }

    const authHeader = req.headers.authorization;
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (bearer !== token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    return next();
}
