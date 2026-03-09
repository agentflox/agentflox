import Redis from 'ioredis';
import env from '@/config/env';
import { logger } from './logger';
import { cacheHitRate } from './metrics';
import type { MatchResult } from '../types';

export class MatchingCache {
    private redis: Redis;

    constructor() {
        this.redis = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
            keyPrefix: 'matching:',
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                logger.warn({ times, delay }, 'Redis connection retry');
                return delay;
            },
            maxRetriesPerRequest: 3,
            enableOfflineQueue: false,
        });

        this.redis.on('error', (error) => {
            logger.error({ error: error.message }, 'Redis connection error');
        });

        this.redis.on('connect', () => {
            logger.info('Redis connected for matching cache');
        });
    }

    /**
     * Get cached match results for a user/entity
     */
    async getCachedMatches(
        entityId: string,
        entityType: string
    ): Promise<MatchResult[] | null> {
        try {
            const key = `matches:${entityId}:${entityType}`;
            const cached = await this.redis.get(key);

            if (cached) {
                cacheHitRate.inc({ cache_type: 'matches', status: 'hit' });
                logger.debug({ entityId, entityType, cacheKey: key }, 'Cache hit for matches');
                return JSON.parse(cached);
            }

            cacheHitRate.inc({ cache_type: 'matches', status: 'miss' });
            return null;
        } catch (error: any) {
            logger.warn({ entityId, entityType, error: error.message }, 'Failed to get cached matches');
            cacheHitRate.inc({ cache_type: 'matches', status: 'error' });
            return null; // Fail gracefully
        }
    }

    /**
     * Cache match results with TTL
     */
    async cacheMatches(
        entityId: string,
        entityType: string,
        matches: MatchResult[],
        ttlSeconds: number = 900 // 15 minutes default
    ): Promise<void> {
        try {
            const key = `matches:${entityId}:${entityType}`;
            await this.redis.setex(key, ttlSeconds, JSON.stringify(matches));

            logger.debug({
                entityId,
                entityType,
                matchCount: matches.length,
                ttl: ttlSeconds,
            }, 'Cached match results');
        } catch (error: any) {
            logger.warn({ entityId, entityType, error: error.message }, 'Failed to cache matches');
            // Don't throw - caching failure shouldn't break matching
        }
    }

    /**
     * Get cached embedding
     */
    async getCachedEmbedding(
        entityType: string,
        entityId: string
    ): Promise<number[] | null> {
        try {
            const key = `embedding:${entityType}:${entityId}`;
            const cached = await this.redis.get(key);

            if (cached) {
                cacheHitRate.inc({ cache_type: 'embedding', status: 'hit' });
                logger.debug({ entityType, entityId }, 'Cache hit for embedding');
                return JSON.parse(cached);
            }

            cacheHitRate.inc({ cache_type: 'embedding', status: 'miss' });
            return null;
        } catch (error: any) {
            logger.warn({ entityType, entityId, error: error.message }, 'Failed to get cached embedding');
            cacheHitRate.inc({ cache_type: 'embedding', status: 'error' });
            return null;
        }
    }

    /**
     * Cache embedding with 24 hour TTL
     */
    async cacheEmbedding(
        entityType: string,
        entityId: string,
        embedding: number[]
    ): Promise<void> {
        try {
            const key = `embedding:${entityType}:${entityId}`;
            const ttl = 24 * 3600; // 24 hours
            await this.redis.setex(key, ttl, JSON.stringify(embedding));

            logger.debug({ entityType, entityId, embeddingDim: embedding.length }, 'Cached embedding');
        } catch (error: any) {
            logger.warn({ entityType, entityId, error: error.message }, 'Failed to cache embedding');
        }
    }

    /**
     * Invalidate all matches for a user/entity
     */
    async invalidateMatches(entityId: string): Promise<void> {
        try {
            const pattern = `matching:matches:${entityId}:*`;
            let cursor = '0';
            let deleted = 0;

            const prefix = 'matching:';

            do {
                const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 1000);
                cursor = nextCursor;

                if (keys.length > 0) {
                    const keysWithoutPrefix = keys.map((k) => (k.startsWith(prefix) ? k.slice(prefix.length) : k));
                    deleted += await this.redis.del(...keysWithoutPrefix);
                }
            } while (cursor !== '0');

            if (deleted > 0) {
                logger.info({ entityId, deleted }, 'Invalidated match cache');
            }
        } catch (error: any) {
            logger.error({ entityId, error: error.message }, 'Failed to invalidate matches');
        }
    }

    /**
     * Invalidate embedding cache
     */
    async invalidateEmbedding(entityType: string, entityId: string): Promise<void> {
        try {
            const key = `embedding:${entityType}:${entityId}`;
            await this.redis.del(key);
            logger.debug({ entityType, entityId }, 'Invalidated embedding cache');
        } catch (error: any) {
            logger.warn({ entityType, entityId, error: error.message }, 'Failed to invalidate embedding');
        }
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<{
        keys: number;
        memory: string;
        hitRate: number;
    }> {
        try {
            const info = await this.redis.info('stats');
            const keys = await this.redis.dbsize();

            // Parse hit rate from info string
            const hitsMatch = info.match(/keyspace_hits:(\d+)/);
            const missesMatch = info.match(/keyspace_misses:(\d+)/);

            const hits = hitsMatch ? parseInt(hitsMatch[1]) : 0;
            const misses = missesMatch ? parseInt(missesMatch[1]) : 0;
            const hitRate = hits + misses > 0 ? hits / (hits + misses) : 0;

            return {
                keys,
                memory: info.match(/used_memory_human:(.+)/)?.[1] || 'unknown',
                hitRate,
            };
        } catch (error: any) {
            logger.error({ error: error.message }, 'Failed to get cache stats');
            return { keys: 0, memory: 'unknown', hitRate: 0 };
        }
    }

    /**
     * Close Redis connection
     */
    async close(): Promise<void> {
        await this.redis.quit();
        logger.info('Redis connection closed for matching cache');
    }
}

// Singleton instance
let cacheInstance: MatchingCache | null = null;

export function getMatchingCache(): MatchingCache {
    if (!cacheInstance) {
        cacheInstance = new MatchingCache();
    }
    return cacheInstance;
}
