import pino from 'pino';
import { context, trace } from '@opentelemetry/api';

// Create structured logger with trace context
export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
        level: (label) => ({ level: label }),
    },
    mixin: () => {
        const span = trace.getActiveSpan();
        if (!span) return {};

        const spanContext = span.spanContext();
        return {
            traceId: spanContext.traceId,
            spanId: spanContext.spanId,
            traceFlags: spanContext.traceFlags,
        };
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
        service: 'matching-service',
        env: process.env.NODE_ENV || 'development',
    },
});

// Child logger for specific operations
export function createOperationLogger(operation: string, context?: Record<string, any>) {
    return logger.child({
        operation,
        ...context,
    });
}

// Log levels
export const log = {
    debug: (obj: any, msg?: string) => logger.debug(obj, msg),
    info: (obj: any, msg?: string) => logger.info(obj, msg),
    warn: (obj: any, msg?: string) => logger.warn(obj, msg),
    error: (obj: any, msg?: string) => logger.error(obj, msg),
    fatal: (obj: any, msg?: string) => logger.fatal(obj, msg),
};
