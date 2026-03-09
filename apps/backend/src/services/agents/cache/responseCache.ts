/**
 * Response Cache
 * 
 * Caches AI responses and extracted configurations to reduce token usage
 * and improve response times.
 */

import { redis } from '@/lib/redis';
import { createHash } from 'crypto';
import { ExtractedConfiguration } from '../validation/configurationValidator';
import { UserContext } from '../state/agentBuilderContextService';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyPrefix?: string;
}

export class ResponseCache {
  private readonly defaultTTL = 3600; // 1 hour
  private readonly keyPrefix = 'agent_builder:cache:';

  /**
   * Generate cache key from message and context
   */
  generateCacheKey(
    message: string,
    context?: UserContext | Record<string, any>
  ): string {
    // Normalize message (lowercase, trim)
    const normalizedMessage = message.toLowerCase().trim();

    // Create hash of message + relevant context
    const contextHash = context
      ? createHash('sha256')
        .update(JSON.stringify({
          workspaces: (context as UserContext).workspaces?.map(w => w.id) || [],
          projects: (context as UserContext).projects?.map(p => p.id) || [],
        }))
        .digest('hex')
        .substring(0, 8)
      : '';

    const messageHash = createHash('sha256')
      .update(normalizedMessage)
      .digest('hex')
      .substring(0, 16);

    return `${this.keyPrefix}${messageHash}:${contextHash}`;
  }

  /**
   * Get cached response
   */
  async getCachedResponse<T>(
    cacheKey: string
  ): Promise<T | null> {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as T;
      }
      return null;
    } catch (error) {
      console.error('[ResponseCache] Failed to get cached response:', error);
      return null;
    }
  }

  /**
   * Cache response
   */
  async cacheResponse<T>(
    cacheKey: string,
    response: T,
    ttl: number = this.defaultTTL
  ): Promise<void> {
    try {
      await redis.setex(cacheKey, ttl, JSON.stringify(response));
    } catch (error) {
      console.error('[ResponseCache] Failed to cache response:', error);
      // Don't throw - caching failure shouldn't break the flow
    }
  }

  /**
   * Cache user context
   */
  async cacheUserContext(
    userId: string,
    context: UserContext,
    ttl: number = 300 // 5 minutes
  ): Promise<void> {
    const key = `${this.keyPrefix}user_context:${userId}`;
    await this.cacheResponse(key, context, ttl);
  }

  /**
   * Get cached user context
   */
  async getCachedUserContext(
    userId: string
  ): Promise<UserContext | null> {
    const key = `${this.keyPrefix}user_context:${userId}`;
    return await this.getCachedResponse<UserContext>(key);
  }

  /**
   * Cache extracted configuration
   */
  async cacheExtractedConfiguration(
    cacheKey: string,
    config: ExtractedConfiguration,
    ttl: number = 3600 // 1 hour
  ): Promise<void> {
    await this.cacheResponse(cacheKey, config, ttl);
  }

  /**
   * Invalidate cache for a key
   */
  async invalidate(cacheKey: string): Promise<void> {
    try {
      await redis.del(cacheKey);
    } catch (error) {
      console.error('[ResponseCache] Failed to invalidate cache:', error);
    }
  }

  /**
   * Invalidate all caches for a user
   */
  async invalidateUserCache(userId: string): Promise<void> {
    try {
      const pattern = `${this.keyPrefix}user_context:${userId}*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('[ResponseCache] Failed to invalidate user cache:', error);
    }
  }

  /**
   * Clear all caches (use with caution)
   */
  async clearAll(): Promise<void> {
    try {
      const keys = await redis.keys(`${this.keyPrefix}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('[ResponseCache] Failed to clear all caches:', error);
    }
  }
}

