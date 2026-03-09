import CircuitBreaker from 'opossum';
import { redis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { metrics } from '@/monitoring/metrics';

/**
 * Circuit Breakers for Critical Infrastructure
 * Implements fail-closed behavior to prevent cascading failures
 */

// Redis Circuit Breaker
export const redisBreaker = new CircuitBreaker(
    async <T>(operation: () => Promise<T>): Promise<T> => {
        return await operation();
    },
    {
        timeout: 3000, // 3s timeout
        errorThresholdPercentage: 50, // Open after 50% errors
        resetTimeout: 30000, // Try again after 30s
        rollingCountTimeout: 10000, // 10s window
        rollingCountBuckets: 10,
        name: 'redis',
    }
);

// Database Circuit Breaker
export const dbBreaker = new CircuitBreaker(
    async <T>(operation: () => Promise<T>): Promise<T> => {
        return await operation();
    },
    {
        timeout: 5000, // 5s timeout
        errorThresholdPercentage: 50,
        resetTimeout: 60000, // Try again after 60s
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        name: 'database',
    }
);

// Supabase Circuit Breaker
export const supabaseBreaker = new CircuitBreaker(
    async <T>(operation: () => Promise<T>): Promise<T> => {
        return await operation();
    },
    {
        timeout: 5000,
        errorThresholdPercentage: 50,
        resetTimeout: 60000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        name: 'supabase',
    }
);

// Event handlers for circuit breakers
redisBreaker.on('open', () => {
    console.error('🔴 Redis circuit breaker OPEN - entering degraded mode');
    metrics.circuitBreakerState.set({ service: 'redis' }, 1);
});

redisBreaker.on('halfOpen', () => {
    console.warn('🟡 Redis circuit breaker HALF-OPEN - testing recovery');
    metrics.circuitBreakerState.set({ service: 'redis' }, 0.5);
});

redisBreaker.on('close', () => {
    console.log('🟢 Redis circuit breaker CLOSED - service recovered');
    metrics.circuitBreakerState.set({ service: 'redis' }, 0);
});

dbBreaker.on('open', () => {
    console.error('🔴 Database circuit breaker OPEN - entering read-only mode');
    metrics.circuitBreakerState.set({ service: 'database' }, 1);
    // Emit degraded mode event to all connected clients
    // io.emit('system:degraded', { reason: 'database_unavailable', readOnly: true });
});

dbBreaker.on('halfOpen', () => {
    console.warn('🟡 Database circuit breaker HALF-OPEN - testing recovery');
    metrics.circuitBreakerState.set({ service: 'database' }, 0.5);
});

dbBreaker.on('close', () => {
    console.log('🟢 Database circuit breaker CLOSED - service recovered');
    metrics.circuitBreakerState.set({ service: 'database' }, 0);
});

supabaseBreaker.on('open', () => {
    console.error('🔴 Supabase circuit breaker OPEN');
    metrics.circuitBreakerState.set({ service: 'supabase' }, 1);
});

supabaseBreaker.on('halfOpen', () => {
    console.warn('🟡 Supabase circuit breaker HALF-OPEN');
    metrics.circuitBreakerState.set({ service: 'supabase' }, 0.5);
});

supabaseBreaker.on('close', () => {
    console.log('🟢 Supabase circuit breaker CLOSED');
    metrics.circuitBreakerState.set({ service: 'supabase' }, 0);
});

// Fallback handlers
redisBreaker.fallback(() => {
    console.warn('⚠️ Redis fallback: operation skipped (degraded mode)');
    return null;
});

dbBreaker.fallback(() => {
    throw new Error('Database unavailable - system in read-only mode');
});

/**
 * Helper: Execute Redis operation with circuit breaker
 */
export async function executeRedisOperation<T>(
    operation: () => Promise<T>
): Promise<T | null>;
export async function executeRedisOperation<T>(
    operation: () => Promise<T>,
    fallbackValue: T
): Promise<T>;
export async function executeRedisOperation<T>(
    operation: () => Promise<T>,
    fallbackValue?: T
): Promise<T | null> {
    try {
        return await redisBreaker.fire(operation);
    } catch (error) {
        console.error('[CircuitBreaker] Redis operation failed:', error);
        return fallbackValue !== undefined ? fallbackValue : null;
    }
}

/**
 * Helper: Execute DB operation with circuit breaker
 */
export async function executeDbOperation<T>(
    operation: () => Promise<T>
): Promise<T> {
    return await dbBreaker.fire(operation);
}

/**
 * Check if system is in degraded mode
 */
export function isSystemDegraded(): { degraded: boolean; canWrite: boolean; canRead: boolean } {
    const redisOpen = redisBreaker.opened;
    const dbOpen = dbBreaker.opened;

    return {
        degraded: redisOpen || dbOpen,
        canWrite: !redisOpen && !dbOpen, // Need both for writes
        canRead: !dbOpen, // Only need DB for reads
    };
}

/**
 * Circuit Breaker Manager for dynamic breaker access
 */
export class CircuitBreakerManager {
    private breakers: Map<string, any> = new Map();

    constructor() {
        this.breakers.set('redis', redisBreaker);
        this.breakers.set('database', dbBreaker);
        this.breakers.set('supabase', supabaseBreaker);
    }

    getBreaker(name: string): any {
        let breaker = this.breakers.get(name);
        if (!breaker) {
            // Create a default breaker if not found
            breaker = new CircuitBreaker(async (op: any) => {
                if (typeof op === 'function') {
                    return await op();
                }
                return op;
            }, {
                timeout: 10000,
                errorThresholdPercentage: 50,
                resetTimeout: 30000,
                name,
            });
            this.breakers.set(name, breaker);

            breaker.on('open', () => {
                console.error(`🔴 Circuit breaker ${name} OPEN`);
                metrics.circuitBreakerState.set({ service: name }, 1);
            });
            breaker.on('close', () => {
                console.log(`🟢 Circuit breaker ${name} CLOSED`);
                metrics.circuitBreakerState.set({ service: name }, 0);
            });
        }
        return breaker;
    }
}

export const circuitBreakerManager = new CircuitBreakerManager();
