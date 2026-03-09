/**
 * Enterprise Feed Service
 * Implements hybrid fan-out with multi-layer caching and selective invalidation
 */

import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { circuitBreakerManager } from '@/lib/circuitBreaker';
import { LRUCache } from 'lru-cache';

interface UserInfo {
    id: string;
    name: string | null;
    avatar: string | null;
    username: string | null;
}

interface PostCount {
    likes: number;
    comments: number;
}

interface Post {
    id: string;
    userId: string;
    title: string;
    content: string;
    visibility: string;
    projectId?: string | null;
    teamId?: string | null;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    createdAt: Date;
    user?: UserInfo | null;
    _count?: PostCount;
}

interface FeedOptions {
    limit?: number;
    cursor?: string;
    cacheStrategy?: 'aggressive' | 'normal' | 'fresh';
}

interface FeedResult {
    items: Post[];
    nextCursor?: string;
    fromCache: boolean;
}

// L1: In-memory LRU cache for hot posts (100MB max)
const postCache = new LRUCache<string, Post>({
    max: 10000,
    maxSize: 100 * 1024 * 1024, // 100MB
    sizeCalculation: (post) => JSON.stringify(post).length,
    ttl: 300000 // 5 minutes
});

// L1: In-memory LRU cache for feed pages (50MB max)
const feedPageCache = new LRUCache<string, FeedResult>({
    max: 1000,
    maxSize: 50 * 1024 * 1024, // 50MB
    sizeCalculation: (feed) => JSON.stringify(feed).length,
    ttl: 60000 // 1 minute
});

export class FeedService {
    private readonly CACHE_TTL = 300; // 5 minutes for Redis cache
    private readonly FEED_CACHE_TTL = 60; // 1 minute for feed cache
    private readonly HIGH_PROFILE_THRESHOLD = 10000; // Followers count

    /**
     * Get global feed with multi-layer caching
     */
    async getGlobalFeed(options: FeedOptions = {}): Promise<FeedResult> {
        const { limit = 20, cursor, cacheStrategy = 'normal' } = options;
        const cacheKey = `feed:global:${limit}:${cursor || 'start'}`;

        // L1: Check memory cache (only for first page)
        if (!cursor && cacheStrategy !== 'fresh') {
            const cached = feedPageCache.get(cacheKey);
            if (cached) {
                return { ...cached, fromCache: true };
            }
        }

        // L2: Check Redis cache
        if (cacheStrategy !== 'fresh') {
            const breaker = circuitBreakerManager.getBreaker('redis-feed');
            const redisResult = await breaker.execute(
                async () => {
                    const cached = await redis.get(cacheKey);
                    if (!cached) return null;
                    try {
                        return JSON.parse(cached) as FeedResult;
                    } catch (error) {
                        console.error('[FeedService] Failed to parse cached feed:', error);
                        return null;
                    }
                },
                async () => null
            );

            if (redisResult) {
                // Populate L1 cache
                feedPageCache.set(cacheKey, redisResult);
                return { ...redisResult, fromCache: true };
            }
        }

        // L3: Query database
        const result = await this.queryGlobalFeed(limit, cursor);

        // Cache result
        if (!cursor && cacheStrategy !== 'fresh') {
            // L1 cache
            feedPageCache.set(cacheKey, result);

            // L2 cache (Redis)
            const breaker = circuitBreakerManager.getBreaker('redis-feed');
            await breaker.execute(
                async () => {
                    await redis.setex(cacheKey, this.FEED_CACHE_TTL, JSON.stringify(result));
                },
                async () => {
                    console.log('[FeedService] Skipped Redis cache (circuit open)');
                }
            );
        }

        return { ...result, fromCache: false };
    }

    /**
     * Get user feed with personalization
     */
    async getUserFeed(userId: string, options: FeedOptions = {}): Promise<FeedResult> {
        const { limit = 20, cursor } = options;
        const cacheKey = `feed:user:${userId}:${limit}:${cursor || 'start'}`;

        // Check memory cache first
        if (!cursor) {
            const cached = feedPageCache.get(cacheKey);
            if (cached) {
                return { ...cached, fromCache: true };
            }
        }

        // Check if we need to use materialized feed
        const followerCount = await this.getFollowerCount(userId);

        if (followerCount > this.HIGH_PROFILE_THRESHOLD) {
            // High-profile user: Use materialized feed
            return this.getMaterializedFeed(userId, limit, cursor);
        } else {
            // Regular user: Fan-out on read
            return this.getFanOutOnReadFeed(userId, limit, cursor);
        }
    }

    /**
     * Get entity feed (project, team, etc.)
     */
    async getEntityFeed(
        entityType: 'project' | 'team',
        entityId: string,
        options: FeedOptions = {}
    ): Promise<FeedResult> {
        const { limit = 20, cursor } = options;
        const cacheKey = `feed:${entityType}:${entityId}:${limit}:${cursor || 'start'}`;

        // Check cache
        if (!cursor) {
            const cached = feedPageCache.get(cacheKey);
            if (cached) {
                return { ...cached, fromCache: true };
            }
        }

        // Query database
        const where: any = {};
        if (entityType === 'project') where.projectId = entityId;
        if (entityType === 'team') where.teamId = entityId;

        const posts = await prisma.post.findMany({
            take: limit + 1,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                        username: true
                    }
                },
                _count: {
                    select: { likes: true, comments: true }
                }
            }
        }) as Post[];

        let nextCursor: string | undefined;
        if (posts.length > limit) {
            const nextItem = posts.pop();
            nextCursor = nextItem?.id;
        }

        const result = { items: posts, nextCursor, fromCache: false };

        // Cache first page
        if (!cursor) {
            feedPageCache.set(cacheKey, result);
        }

        return result;
    }

    /**
     * Selective cache invalidation
     */
    async invalidatePostCache(postId: string, affectedUserIds: string[] = []): Promise<void> {
        // Invalidate post from L1 cache
        postCache.delete(postId);

        // Invalidate affected user feeds from L1
        affectedUserIds.forEach(userId => {
            const pattern = `feed:user:${userId}:`;
            for (const key of feedPageCache.keys()) {
                if (key.startsWith(pattern)) {
                    feedPageCache.delete(key);
                }
            }
        });

        // Invalidate Redis cache (selective)
        const breaker = circuitBreakerManager.getBreaker('redis-feed');
        await breaker.execute(
            async () => {
                // Delete global feed first page only
                await redis.del('feed:global:20:start');

                // Delete affected user feeds
                for (const userId of affectedUserIds) {
                    const pattern = `feed:user:${userId}:*`;
                    const keys = await redis.keys(pattern);
                    if (keys.length > 0) {
                        await redis.del(keys);
                    }
                }
            },
            async () => {
                console.log('[FeedService] Skipped cache invalidation (circuit open)');
            }
        );
    }

    /**
     * Invalidate entity feed cache
     */
    async invalidateEntityFeed(entityType: 'project' | 'team', entityId: string): Promise<void> {
        // Invalidate L1 cache
        const pattern = `feed:${entityType}:${entityId}:`;
        for (const key of feedPageCache.keys()) {
            if (key.startsWith(pattern)) {
                feedPageCache.delete(key);
            }
        }

        // Invalidate Redis cache
        const breaker = circuitBreakerManager.getBreaker('redis-feed');
        await breaker.execute(
            async () => {
                const keys = await redis.keys(`feed:${entityType}:${entityId}:*`);
                if (keys.length > 0) {
                    await redis.del(keys);
                }
            },
            async () => {
                console.log('[FeedService] Skipped Redis invalidation (circuit open)');
            }
        );
    }

    /**
     * Get affected user IDs for cache invalidation
     */
    async getAffectedUserIds(post: { projectId?: string | null; teamId?: string | null; userId: string }): Promise<string[]> {
        const userIds: string[] = [post.userId]; // Post author

        // Get project members
        if (post.projectId) {
            const members = await prisma.projectMember.findMany({
                where: { projectId: post.projectId },
                select: { userId: true }
            });
            userIds.push(...members.map(m => m.userId));
        }

        // Get team members
        if (post.teamId) {
            const members = await prisma.teamMember.findMany({
                where: { teamId: post.teamId },
                select: { userId: true }
            });
            userIds.push(...members.map(m => m.userId));
        }

        return Array.from(new Set(userIds));
    }

    /**
     * Query global feed from database
     */
    private async queryGlobalFeed(limit: number, cursor?: string): Promise<FeedResult> {
        const posts = await prisma.post.findMany({
            take: limit + 1,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            where: {
                visibility: 'PUBLIC'
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                        username: true
                    }
                },
                _count: {
                    select: { likes: true, comments: true }
                }
            }
        }) as Post[];

        let nextCursor: string | undefined;
        if (posts.length > limit) {
            const nextItem = posts.pop();
            nextCursor = nextItem?.id;
        }

        // Cache individual posts in L1
        posts.forEach(post => postCache.set(post.id, post));

        return { items: posts, nextCursor, fromCache: false };
    }

    /**
     * Get follower count
     */
    private async getFollowerCount(userId: string): Promise<number> {
        const cacheKey = `user:followers:${userId}`;

        // Try cache
        const cached = await redis.get(cacheKey);
        if (cached) {
            return parseInt(cached, 10);
        }

        // Query database
        const count = await prisma.userLike.count({
            where: { targetUserId: userId }
        });

        // Cache for 1 hour
        await redis.setex(cacheKey, 3600, count.toString());

        return count;
    }

    /**
     * Get materialized feed (fan-out on write)
     */
    private async getMaterializedFeed(
        userId: string,
        limit: number,
        cursor?: string
    ): Promise<FeedResult> {
        // Query from materialized feed table
        const feedItems = await prisma.userFeedCache.findMany({
            where: { userId },
            take: limit + 1,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { score: 'desc' },
            include: {
                post: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                avatar: true,
                                username: true
                            }
                        },
                        _count: {
                            select: { likes: true, comments: true }
                        }
                    }
                }
            }
        });

        const posts = feedItems.map(item => item.post) as Post[];

        let nextCursor: string | undefined;
        if (posts.length > limit) {
            const nextItem = posts.pop();
            nextCursor = nextItem?.id;
        }

        return { items: posts, nextCursor, fromCache: false };
    }

    /**
     * Get fan-out on read feed
     */
    private async getFanOutOnReadFeed(
        userId: string,
        limit: number,
        cursor?: string
    ): Promise<FeedResult> {
        // Get users the person follows
        const following = await prisma.userLike.findMany({
            where: { userId },
            select: { targetUserId: true }
        });

        const followingIds = following.map(f => f.targetUserId);
        followingIds.push(userId); // Include self

        // Query posts from followed users
        const posts = await prisma.post.findMany({
            take: limit + 1,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            where: {
                userId: { in: followingIds },
                NOT: {
                    visibility: 'PRIVATE'
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                        username: true
                    }
                },
                _count: {
                    select: { likes: true, comments: true }
                }
            }
        }) as Post[];

        let nextCursor: string | undefined;
        if (posts.length > limit) {
            const nextItem = posts.pop();
            nextCursor = nextItem?.id;
        }

        return { items: posts, nextCursor, fromCache: false };
    }

    /**
     * Materialize feed for high-profile users
     */
    async materializeFeed(userId: string): Promise<void> {
        // This would be called by a background job
        // Implementation details would depend on specific requirements
        console.log(`[FeedService] Materializing feed for user ${userId}`);
    }

    /**
     * Get cache stats
     */
    getCacheStats() {
        return {
            l1: {
                posts: {
                    size: postCache.size,
                    maxSize: postCache.max,
                    calculatedSize: postCache.calculatedSize
                },
                feeds: {
                    size: feedPageCache.size,
                    maxSize: feedPageCache.max,
                    calculatedSize: feedPageCache.calculatedSize
                }
            }
        };
    }
}

export const feedService = new FeedService();
