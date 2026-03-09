/**
 * Standard error codes used across the platform
 */
export enum ErrorCode {
    // Authentication & Authorization (1xxx)
    UNAUTHORIZED = 'E1001',
    FORBIDDEN = 'E1002',
    TOKEN_EXPIRED = 'E1003',
    INVALID_TOKEN = 'E1004',
    SESSION_EXPIRED = 'E1005',

    // Validation (2xxx)
    VALIDATION_ERROR = 'E2001',
    INVALID_INPUT = 'E2002',
    MISSING_REQUIRED_FIELD = 'E2003',
    INVALID_FORMAT = 'E2004',

    // Resource (3xxx)
    NOT_FOUND = 'E3001',
    ALREADY_EXISTS = 'E3002',
    CONFLICT = 'E3003',
    GONE = 'E3004',

    // Rate Limiting (4xxx)
    RATE_LIMITED = 'E4001',
    QUOTA_EXCEEDED = 'E4002',
    TOO_MANY_REQUESTS = 'E4003',

    // External Services (5xxx)
    EXTERNAL_SERVICE_ERROR = 'E5001',
    DATABASE_ERROR = 'E5002',
    REDIS_ERROR = 'E5003',
    AI_SERVICE_ERROR = 'E5004',
    PAYMENT_ERROR = 'E5005',

    // Business Logic (6xxx)
    BUSINESS_RULE_VIOLATION = 'E6001',
    INSUFFICIENT_PERMISSIONS = 'E6002',
    OPERATION_NOT_ALLOWED = 'E6003',
    PRECONDITION_FAILED = 'E6004',

    // Agent-specific (7xxx)
    AGENT_EXECUTION_FAILED = 'E7001',
    AGENT_TIMEOUT = 'E7002',
    AGENT_SAFETY_VIOLATION = 'E7003',
    TOOL_EXECUTION_FAILED = 'E7004',

    // Internal (9xxx)
    INTERNAL_ERROR = 'E9001',
    NOT_IMPLEMENTED = 'E9002',
    SERVICE_UNAVAILABLE = 'E9003',
    CIRCUIT_BREAKER_OPEN = 'E9004',
}

/**
 * HTTP status code mapping
 */
export const errorCodeToHttpStatus: Record<ErrorCode, number> = {
    [ErrorCode.UNAUTHORIZED]: 401,
    [ErrorCode.FORBIDDEN]: 403,
    [ErrorCode.TOKEN_EXPIRED]: 401,
    [ErrorCode.INVALID_TOKEN]: 401,
    [ErrorCode.SESSION_EXPIRED]: 401,
    [ErrorCode.VALIDATION_ERROR]: 400,
    [ErrorCode.INVALID_INPUT]: 400,
    [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
    [ErrorCode.INVALID_FORMAT]: 400,
    [ErrorCode.NOT_FOUND]: 404,
    [ErrorCode.ALREADY_EXISTS]: 409,
    [ErrorCode.CONFLICT]: 409,
    [ErrorCode.GONE]: 410,
    [ErrorCode.RATE_LIMITED]: 429,
    [ErrorCode.QUOTA_EXCEEDED]: 429,
    [ErrorCode.TOO_MANY_REQUESTS]: 429,
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
    [ErrorCode.DATABASE_ERROR]: 503,
    [ErrorCode.REDIS_ERROR]: 503,
    [ErrorCode.AI_SERVICE_ERROR]: 502,
    [ErrorCode.PAYMENT_ERROR]: 502,
    [ErrorCode.BUSINESS_RULE_VIOLATION]: 422,
    [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
    [ErrorCode.OPERATION_NOT_ALLOWED]: 403,
    [ErrorCode.PRECONDITION_FAILED]: 412,
    [ErrorCode.AGENT_EXECUTION_FAILED]: 500,
    [ErrorCode.AGENT_TIMEOUT]: 504,
    [ErrorCode.AGENT_SAFETY_VIOLATION]: 422,
    [ErrorCode.TOOL_EXECUTION_FAILED]: 500,
    [ErrorCode.INTERNAL_ERROR]: 500,
    [ErrorCode.NOT_IMPLEMENTED]: 501,
    [ErrorCode.SERVICE_UNAVAILABLE]: 503,
    [ErrorCode.CIRCUIT_BREAKER_OPEN]: 503,
};

/**
 * Error metadata for logging and debugging
 */
export interface ErrorMetadata {
    traceId?: string;
    requestId?: string;
    userId?: string;
    workspaceId?: string;
    agentId?: string;
    [key: string]: unknown;
}

/**
 * Base application error class
 */
export class AppError extends Error {
    public readonly code: ErrorCode;
    public readonly httpStatus: number;
    public readonly isOperational: boolean;
    public readonly metadata: ErrorMetadata;
    public readonly timestamp: Date;
    public readonly cause?: Error;

    constructor(
        code: ErrorCode,
        message: string,
        options?: {
            cause?: Error;
            metadata?: ErrorMetadata;
            isOperational?: boolean;
        }
    ) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.httpStatus = errorCodeToHttpStatus[code] || 500;
        this.isOperational = options?.isOperational ?? true;
        this.metadata = options?.metadata ?? {};
        this.timestamp = new Date();
        this.cause = options?.cause;

        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Convert to JSON for API responses
     */
    toJSON(): Record<string, unknown> {
        return {
            error: {
                code: this.code,
                message: this.message,
                timestamp: this.timestamp.toISOString(),
                ...(this.metadata.requestId && { requestId: this.metadata.requestId }),
                ...(this.metadata.traceId && { traceId: this.metadata.traceId }),
            },
        };
    }

    /**
     * Convert to detailed JSON for logging
     */
    toLogJSON(): Record<string, unknown> {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            httpStatus: this.httpStatus,
            isOperational: this.isOperational,
            metadata: this.metadata,
            stack: this.stack,
            cause: this.cause?.message,
            timestamp: this.timestamp.toISOString(),
        };
    }
}

// Specific error classes

export class ValidationError extends AppError {
    public readonly fields?: Record<string, string[]>;

    constructor(message: string, fields?: Record<string, string[]>, metadata?: ErrorMetadata) {
        super(ErrorCode.VALIDATION_ERROR, message, { metadata });
        this.fields = fields;
    }

    toJSON(): Record<string, unknown> {
        return {
            ...super.toJSON(),
            error: {
                ...(super.toJSON() as { error: Record<string, unknown> }).error,
                fields: this.fields,
            },
        };
    }
}

export class NotFoundError extends AppError {
    public readonly resource: string;
    public readonly resourceId?: string;

    constructor(resource: string, resourceId?: string, metadata?: ErrorMetadata) {
        super(ErrorCode.NOT_FOUND, `${resource} not found${resourceId ? `: ${resourceId}` : ''}`, { metadata });
        this.resource = resource;
        this.resourceId = resourceId;
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized', metadata?: ErrorMetadata) {
        super(ErrorCode.UNAUTHORIZED, message, { metadata });
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Access denied', metadata?: ErrorMetadata) {
        super(ErrorCode.FORBIDDEN, message, { metadata });
    }
}

export class RateLimitError extends AppError {
    public readonly retryAfter?: number;

    constructor(message: string = 'Rate limit exceeded', retryAfter?: number, metadata?: ErrorMetadata) {
        super(ErrorCode.RATE_LIMITED, message, { metadata });
        this.retryAfter = retryAfter;
    }
}

export class ConflictError extends AppError {
    constructor(message: string, metadata?: ErrorMetadata) {
        super(ErrorCode.CONFLICT, message, { metadata });
    }
}

export class ExternalServiceError extends AppError {
    public readonly service: string;

    constructor(service: string, message: string, cause?: Error, metadata?: ErrorMetadata) {
        super(ErrorCode.EXTERNAL_SERVICE_ERROR, `${service}: ${message}`, { cause, metadata });
        this.service = service;
    }
}

export class DatabaseError extends AppError {
    constructor(message: string, cause?: Error, metadata?: ErrorMetadata) {
        super(ErrorCode.DATABASE_ERROR, message, { cause, metadata, isOperational: false });
    }
}

export class AgentError extends AppError {
    public readonly agentId?: string;
    public readonly executionId?: string;

    constructor(
        code: ErrorCode.AGENT_EXECUTION_FAILED | ErrorCode.AGENT_TIMEOUT | ErrorCode.AGENT_SAFETY_VIOLATION | ErrorCode.TOOL_EXECUTION_FAILED,
        message: string,
        options?: { agentId?: string; executionId?: string; cause?: Error; metadata?: ErrorMetadata }
    ) {
        super(code, message, { cause: options?.cause, metadata: options?.metadata });
        this.agentId = options?.agentId;
        this.executionId = options?.executionId;
    }
}

export class InternalError extends AppError {
    constructor(message: string, cause?: Error, metadata?: ErrorMetadata) {
        super(ErrorCode.INTERNAL_ERROR, message, { cause, metadata, isOperational: false });
    }
}

/**
 * Check if error is operational (expected, can be handled gracefully)
 */
export function isOperationalError(error: unknown): boolean {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
}

/**
 * Wrap unknown errors into AppError
 */
export function wrapError(error: unknown, defaultMessage: string = 'An unexpected error occurred'): AppError {
    if (error instanceof AppError) {
        return error;
    }

    if (error instanceof Error) {
        return new InternalError(error.message || defaultMessage, error);
    }

    return new InternalError(defaultMessage);
}

/**
 * Create error response for HTTP
 */
export function createErrorResponse(error: AppError): {
    status: number;
    body: Record<string, unknown>;
    headers?: Record<string, string>;
} {
    const response: {
        status: number;
        body: Record<string, unknown>;
        headers?: Record<string, string>;
    } = {
        status: error.httpStatus,
        body: error.toJSON(),
    };

    if (error instanceof RateLimitError && error.retryAfter) {
        response.headers = {
            'Retry-After': String(error.retryAfter),
        };
    }

    return response;
}
