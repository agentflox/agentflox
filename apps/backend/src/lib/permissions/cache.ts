/**
 * Permission Cache
 * Redis-based caching for permission resolution with intelligent invalidation
 */

import { PermissionLevel } from '@agentflox/database';
import type { ItemType } from './types';

interface CachedPermission {
    permission: PermissionLevel | null;
    timestamp: number;
}

class PermissionCache {
    private cache: Map<string, CachedPermission>;
    private readonly TTL = 5 * 60 * 1000; // 5 minutes

    constructor() {
        this.cache = new Map();
    }

    /**
     * Generate cache key
     */
    private getCacheKey(userId: string, itemType: ItemType, itemId: string): string {
        return `perm:${userId}:${itemType}:${itemId}`;
    }

    /**
     * Get cached permission
     */
    get(userId: string, itemType: ItemType, itemId: string): PermissionLevel | null | undefined {
        const key = this.getCacheKey(userId, itemType, itemId);
        const cached = this.cache.get(key);

        if (!cached) {
            return undefined;
        }

        // Check if expired
        if (Date.now() - cached.timestamp > this.TTL) {
            this.cache.delete(key);
            return undefined;
        }

        return cached.permission;
    }

    /**
     * Set permission in cache
     */
    set(userId: string, itemType: ItemType, itemId: string, permission: PermissionLevel | null): void {
        const key = this.getCacheKey(userId, itemType, itemId);
        this.cache.set(key, {
            permission,
            timestamp: Date.now(),
        });
    }

    /**
     * Invalidate specific permission
     */
    invalidate(userId: string, itemType: ItemType, itemId: string): void {
        const key = this.getCacheKey(userId, itemType, itemId);
        this.cache.delete(key);
    }

    /**
     * Alias for invalidate
     */
    delete(userId: string, itemType: ItemType, itemId: string): void {
        this.invalidate(userId, itemType, itemId);
    }

    /**
     * Invalidate all permissions for a user
     */
    invalidateUser(userId: string): void {
        const prefix = `perm:${userId}:`;
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Invalidate all permissions for an item
     */
    invalidateItem(itemType: ItemType, itemId: string): void {
        const suffix = `:${itemType}:${itemId}`;
        for (const key of this.cache.keys()) {
            if (key.endsWith(suffix)) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear entire cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            ttl: this.TTL,
        };
    }
}

// Singleton instance
export const permissionCache = new PermissionCache();
