import { Counter, Histogram, Gauge, register } from 'prom-client';

// Match request latency histogram
export const matchLatency = new Histogram({
    name: 'matching_request_duration_seconds',
    help: 'Match request latency distribution',
    labelNames: ['entity_type', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
    registers: [register],
});

// Embedding generation time
export const embeddingGenerationTime = new Histogram({
    name: 'embedding_generation_duration_seconds',
    help: 'Embedding generation latency',
    labelNames: ['entity_type', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
    registers: [register],
});

// Error counter
export const matchingErrors = new Counter({
    name: 'matching_errors_total',
    help: 'Total matching errors by type',
    labelNames: ['entity_type', 'error_type', 'operation'],
    registers: [register],
});

// Queue depth gauge
export const queueDepth = new Gauge({
    name: 'matching_queue_depth',
    help: 'Current matching queue depth',
    labelNames: ['queue_name'],
    registers: [register],
});

// Cache hit/miss counter
export const cacheHitRate = new Counter({
    name: 'matching_cache_operations_total',
    help: 'Cache hit/miss counter',
    labelNames: ['cache_type', 'status'],
    registers: [register],
});

// Database pool metrics
export const dbPoolConnections = new Gauge({
    name: 'matching_db_pool_connections',
    help: 'Database pool connection stats',
    labelNames: ['state'],
    registers: [register],
});

// Batch processing metrics
export const batchProcessedEntities = new Counter({
    name: 'matching_batch_entities_processed_total',
    help: 'Total entities processed in batch jobs',
    labelNames: ['entity_type', 'status'],
    registers: [register],
});

export const batchDuration = new Histogram({
    name: 'matching_batch_duration_seconds',
    help: 'Batch processing duration',
    labelNames: ['batch_type'],
    buckets: [1, 5, 10, 30, 60, 120, 300, 600],
    registers: [register],
});

// Circuit breaker state
export const circuitBreakerState = new Gauge({
    name: 'matching_circuit_breaker_state',
    help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
    labelNames: ['service'],
    registers: [register],
});

// Helper to track operation timing
export function trackOperation<T>(
    metric: Histogram,
    labels: Record<string, string>,
    operation: () => Promise<T>
): Promise<T> {
    const end = metric.startTimer(labels);
    return operation()
        .then(result => {
            end({ status: 'success' });
            return result;
        })
        .catch(error => {
            end({ status: 'error' });
            throw error;
        });
}
