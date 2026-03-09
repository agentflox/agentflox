import { logger } from './logger';

export interface RetryOptions {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: any) => boolean;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxAttempts = 3,
        initialDelayMs = 1000,
        maxDelayMs = 30000,
        backoffMultiplier = 2,
        shouldRetry = isTransientError,
    } = options;

    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            // Don't retry on last attempt or if error is not transient
            if (attempt === maxAttempts || !shouldRetry(error)) {
                logger.error({
                    attempt,
                    maxAttempts,
                    error: error.message,
                    shouldRetry: shouldRetry(error),
                }, 'Retry failed - throwing error');
                throw error;
            }

            // Calculate delay with exponential backoff
            const baseDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
            const cappedDelay = Math.min(baseDelay, maxDelayMs);

            // Add jitter to prevent thundering herd (±10%)
            const jitter = Math.random() * cappedDelay * 0.2 - (cappedDelay * 0.1);
            const totalDelay = Math.max(0, cappedDelay + jitter);

            logger.warn({
                attempt,
                maxAttempts,
                delayMs: Math.round(totalDelay),
                error: error.message,
                errorCode: error.code,
            }, 'Retrying after error');

            await sleep(totalDelay);
        }
    }

    throw lastError;
}

/**
 * Determine if an error is transient and should be retried
 */
export function isTransientError(error: any): boolean {
    // Network errors
    const transientCodes = [
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'ECONNREFUSED',
        'ENETUNREACH',
    ];

    // API rate limit / availability errors
    const transientMessages = [
        'rate_limit_exceeded',
        'service_unavailable',
        'temporarily_unavailable',
        'timeout',
        'too many requests',
        '429',
        '503',
        '504',
    ];

    const errorString = (error.message || '').toLowerCase();
    const errorCode = (error.code || '').toLowerCase();

    return (
        transientCodes.some(code => errorCode.includes(code.toLowerCase())) ||
        transientMessages.some(msg => errorString.includes(msg))
    );
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry specific to database operations
 */
export async function retryDatabaseOperation<T>(
    fn: () => Promise<T>,
    operation: string
): Promise<T> {
    return retryWithBackoff(fn, {
        maxAttempts: 3,
        initialDelayMs: 500,
        maxDelayMs: 5000,
        shouldRetry: (error) => {
            // Retry on connection errors but not on constraint violations
            const shouldRetry = isTransientError(error) &&
                !error.message?.includes('constraint') &&
                !error.message?.includes('duplicate key');

            if (!shouldRetry) {
                logger.debug({ operation, error: error.message }, 'Not retrying database error');
            }

            return shouldRetry;
        },
    });
}

/**
 * Retry specific to API calls
 */
export async function retryApiCall<T>(
    fn: () => Promise<T>,
    apiName: string
): Promise<T> {
    return retryWithBackoff(fn, {
        maxAttempts: 3,
        initialDelayMs: 2000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
        shouldRetry: isTransientError,
    });
}
