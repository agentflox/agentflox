import pino, { Logger as PinoLogger, LoggerOptions } from 'pino';

/**
 * Logging context that can be attached to log entries
 */
export interface LogContext {
    traceId?: string;
    spanId?: string;
    userId?: string;
    workspaceId?: string;
    agentId?: string;
    requestId?: string;
    service?: string;
    [key: string]: unknown;
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
    level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    service: string;
    environment?: string;
    pretty?: boolean;
}

/**
 * Enterprise-grade JSON logger with context propagation
 * Supports OpenTelemetry trace context and structured logging
 */
class Logger {
    private logger: PinoLogger;
    private context: LogContext;
    private service: string;

    constructor(config: LoggerConfig) {
        this.service = config.service;
        this.context = { service: config.service };

        const options: LoggerOptions = {
            level: config.level || 'info',
            base: {
                service: config.service,
                env: config.environment || process.env.NODE_ENV || 'development',
                pid: process.pid,
                hostname: process.env.HOSTNAME,
            },
            timestamp: pino.stdTimeFunctions.isoTime,
            formatters: {
                level: (label) => ({ level: label }),
                bindings: (bindings) => ({
                    ...bindings,
                    node_version: process.version,
                }),
            },
            redact: {
                paths: ['password', 'token', 'authorization', 'cookie', 'secret', '*.password', '*.token'],
                censor: '[REDACTED]',
            },
        };

        // Use pino-pretty in development for readable output
        if (config.pretty || (config.environment === 'development' && process.env.LOG_PRETTY !== 'false')) {
            this.logger = pino({
                ...options,
                transport: {
                    target: 'pino-pretty',
                    options: {
                        colorize: true,
                        translateTime: 'SYS:standard',
                        ignore: 'pid,hostname',
                    },
                },
            });
        } else {
            this.logger = pino(options);
        }
    }

    /**
     * Create a child logger with additional context
     */
    child(context: LogContext): Logger {
        const childLogger = Object.create(this) as Logger;
        childLogger.context = { ...this.context, ...context };
        childLogger.logger = this.logger.child(context);
        return childLogger;
    }

    /**
     * Set trace context from OpenTelemetry
     */
    withTrace(traceId: string, spanId: string): Logger {
        return this.child({ traceId, spanId });
    }

    /**
     * Set user context for request scoping
     */
    withUser(userId: string, workspaceId?: string): Logger {
        return this.child({ userId, workspaceId });
    }

    /**
     * Set request ID for request correlation
     */
    withRequestId(requestId: string): Logger {
        return this.child({ requestId });
    }

    // Standard log methods
    trace(msg: string, data?: Record<string, unknown>): void {
        this.logger.trace(data, msg);
    }

    debug(msg: string, data?: Record<string, unknown>): void {
        this.logger.debug(data, msg);
    }

    info(msg: string, data?: Record<string, unknown>): void {
        this.logger.info(data, msg);
    }

    warn(msg: string, data?: Record<string, unknown>): void {
        this.logger.warn(data, msg);
    }

    error(msg: string, error?: Error | Record<string, unknown>, data?: Record<string, unknown>): void {
        if (error instanceof Error) {
            this.logger.error(
                {
                    ...data,
                    err: {
                        message: error.message,
                        name: error.name,
                        stack: error.stack,
                        ...(error as unknown as Record<string, unknown>),
                    },
                },
                msg
            );
        } else {
            this.logger.error({ ...error, ...data }, msg);
        }
    }

    fatal(msg: string, error?: Error | Record<string, unknown>, data?: Record<string, unknown>): void {
        if (error instanceof Error) {
            this.logger.fatal(
                {
                    ...data,
                    err: {
                        message: error.message,
                        name: error.name,
                        stack: error.stack,
                    },
                },
                msg
            );
        } else {
            this.logger.fatal({ ...error, ...data }, msg);
        }
    }

    /**
     * Log HTTP request (incoming)
     */
    logRequest(req: {
        method: string;
        url: string;
        headers?: Record<string, unknown>;
        ip?: string;
    }): void {
        this.info('HTTP Request', {
            http: {
                method: req.method,
                url: req.url,
                ip: req.ip,
            },
        });
    }

    /**
     * Log HTTP response (outgoing)
     */
    logResponse(res: {
        statusCode: number;
        durationMs: number;
        size?: number;
    }): void {
        const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
        this[level]('HTTP Response', {
            http: {
                statusCode: res.statusCode,
                durationMs: res.durationMs,
                size: res.size,
            },
        });
    }

    /**
     * Log database query
     */
    logQuery(query: {
        operation: string;
        model?: string;
        durationMs: number;
        success: boolean;
    }): void {
        this.debug('Database Query', {
            db: query,
        });
    }

    /**
     * Log external API call
     */
    logExternalCall(call: {
        service: string;
        method: string;
        url?: string;
        durationMs: number;
        statusCode?: number;
        success: boolean;
    }): void {
        const level = call.success ? 'debug' : 'warn';
        this[level]('External API Call', {
            external: call,
        });
    }

    /**
     * Log agent execution
     */
    logAgentExecution(execution: {
        agentId: string;
        executionId: string;
        status: string;
        durationMs?: number;
        tokenUsage?: number;
        error?: string;
    }): void {
        const level = execution.status === 'failed' ? 'error' : 'info';
        this[level]('Agent Execution', {
            agent: execution,
        });
    }

    /**
     * Get the underlying pino logger for advanced use cases
     */
    getPinoLogger(): PinoLogger {
        return this.logger;
    }
}

/**
 * Create a new logger instance
 */
export function createLogger(config: LoggerConfig): Logger {
    return new Logger(config);
}

/**
 * Default logger instance for the service-server
 */
let defaultLogger: Logger | null = null;

export function getLogger(): Logger {
    if (!defaultLogger) {
        defaultLogger = createLogger({
            service: 'agentflox',
            environment: process.env.NODE_ENV,
            level: (process.env.LOG_LEVEL as LoggerConfig['level']) || 'info',
            pretty: process.env.NODE_ENV === 'development',
        });
    }
    return defaultLogger;
}

export function initLogger(config: LoggerConfig): Logger {
    defaultLogger = createLogger(config);
    return defaultLogger;
}

export const logger = getLogger();
export type { Logger };
export default Logger;
