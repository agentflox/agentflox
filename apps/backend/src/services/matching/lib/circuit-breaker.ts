import CircuitBreaker from 'opossum';
import { openai } from '@/lib/openai';
import env from '@/config/env';
import { logger } from './logger';
import { circuitBreakerState } from './metrics';
import { getMatchingCache } from './cache';

const cache = getMatchingCache();

/**
 * Fallback function when OpenAI API fails
 */
async function fallbackEmbeddingGeneration(
    text: string,
    entityType?: string,
    entityId?: string
): Promise<number[]> {
    logger.warn({ entityType, entityId }, 'Circuit breaker fallback triggered');

    // Try to get cached embedding as fallback
    if (entityType && entityId) {
        const cached = await cache.getCachedEmbedding(entityType, entityId);
        if (cached) {
            logger.info({ entityType, entityId }, 'Using cached embedding as fallback');
            return cached;
        }
    }

    throw new Error('Embedding service unavailable and no cached embedding found');
}

/**
 * Core embedding generation function (without circuit breaker)
 */
async function generateEmbeddingCore(
    text: string,
    entityType?: string,
    entityId?: string
): Promise<number[]> {
    const model = env.EMBEDDING_MODEL || 'text-embedding-3-large';

    try {
        const response = await openai.embeddings.create({
            model,
            input: text,
        });

        const embedding = response.data[0].embedding;

        // Cache the embedding for future use
        if (entityType && entityId) {
            await cache.cacheEmbedding(entityType, entityId, embedding);
        }

        return embedding;
    } catch (error: any) {
        logger.error({
            error: error.message,
            errorCode: error.code,
            entityType,
            entityId,
        }, 'OpenAI embedding generation failed');
        throw error;
    }
}

/**
 * Circuit breaker for embedding generation
 */
export const embeddingBreaker = new CircuitBreaker(generateEmbeddingCore, {
    timeout: 30000, // 30s timeout
    errorThresholdPercentage: 50, // Open circuit after 50% errors
    resetTimeout: 60000, // Try again after 1 minute
    rollingCountTimeout: 10000, // Window for error calculation (10s)
    rollingCountBuckets: 10,
    name: 'embedding-generation',

    // Fallback function when circuit is open
    fallback: fallbackEmbeddingGeneration,
});

// Monitor circuit breaker state
embeddingBreaker.on('open', () => {
    circuitBreakerState.set({ service: 'embedding' }, 1); // Open = 1
    logger.error('Circuit breaker OPENED - OpenAI embedding API is degraded');
    // TODO: Send alert to ops team via Slack/PagerDuty
});

embeddingBreaker.on('halfOpen', () => {
    circuitBreakerState.set({ service: 'embedding' }, 2); // Half-open = 2
    logger.warn('Circuit breaker HALF-OPEN - Testing OpenAI API recovery');
});

embeddingBreaker.on('close', () => {
    circuitBreakerState.set({ service: 'embedding' }, 0); // Closed = 0
    logger.info('Circuit breaker CLOSED - OpenAI embedding API recovered');
});

embeddingBreaker.on('success', () => {
    logger.debug('Circuit breaker: Successful embedding generation');
});

embeddingBreaker.on('failure', (error) => {
    logger.warn({ error: error.message }, 'Circuit breaker: Embedding generation failed');
});

embeddingBreaker.on('timeout', () => {
    logger.error('Circuit breaker: Embedding generation timed out (>30s)');
});

embeddingBreaker.on('reject', () => {
    logger.error('Circuit breaker: Request rejected (circuit open)');
});

/**
 * Generate embedding with circuit breaker protection
 */
export async function generateEmbeddingWithCircuitBreaker(
    text: string,
    entityType?: string,
    entityId?: string
): Promise<number[]> {
    return embeddingBreaker.fire(text, entityType, entityId);
}

/**
 * Get circuit breaker statistics
 */
export function getCircuitBreakerStats() {
    return {
        state: ['CLOSED', 'OPEN', 'HALF_OPEN'][embeddingBreaker.opened ? 1 : embeddingBreaker.halfOpen ? 2 : 0],
        stats: embeddingBreaker.stats,
        isOpen: embeddingBreaker.opened,
        isHalfOpen: embeddingBreaker.halfOpen,
    };
}
