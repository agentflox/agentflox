import { redis } from '@/lib/redis';
import { logger } from '@agentflox/logger';

/**
 * CollaborationService
 * 
 * Manages collaborative editing sessions using Yjs CRDT.
 * Stores document states in Redis with version history.
 * 
 * NOTE: This service requires yjs, y-protocols, and lib0 packages.
 * Install with: pnpm --filter service-server add yjs y-protocols lib0
 */

interface DocumentMetadata {
    documentId: string;
    documentType: string;
    createdAt: number;
    lastModified: number;
    version: number;
}

export class CollaborationService {
    private static DOCUMENT_STATE_PREFIX = 'yjs:doc:';
    private static DOCUMENT_METADATA_PREFIX = 'yjs:meta:';
    private static DOCUMENT_HISTORY_PREFIX = 'yjs:history:';
    private static AWARENESS_PREFIX = 'yjs:awareness:';
    private static ACTIVE_USERS_PREFIX = 'yjs:users:';

    // TTL for document states (7 days)
    private static STATE_TTL = 60 * 60 * 24 * 7;

    // TTL for awareness (5 minutes)
    private static AWARENESS_TTL = 60 * 5;

    /**
     * Get document state from Redis
     */
    static async getDocumentState(documentId: string): Promise<string | null> {
        try {
            const key = `${this.DOCUMENT_STATE_PREFIX}${documentId}`;
            const state = await redis.get(key);

            if (state) {
                // Refresh TTL on access
                await redis.expire(key, this.STATE_TTL);
            }

            return state;
        } catch (error) {
            logger.error('Failed to get document state', { documentId, error });
            return null;
        }
    }

    /**
     * Store document state in Redis
     */
    static async storeDocumentState(
        documentId: string,
        state: string,
        documentType: string,
        userId: string
    ): Promise<void> {
        try {
            const stateKey = `${this.DOCUMENT_STATE_PREFIX}${documentId}`;
            const metaKey = `${this.DOCUMENT_METADATA_PREFIX}${documentId}`;
            const historyKey = `${this.DOCUMENT_HISTORY_PREFIX}${documentId}`;

            const now = Date.now();

            // Get current metadata or create new
            const existingMetaStr = await redis.get(metaKey);
            const metadata: DocumentMetadata = existingMetaStr
                ? JSON.parse(existingMetaStr)
                : {
                    documentId,
                    documentType,
                    createdAt: now,
                    lastModified: now,
                    version: 0,
                };

            // Increment version
            metadata.version += 1;
            metadata.lastModified = now;

            // Use pipeline for atomic operations
            const pipeline = redis.pipeline();

            // Store document state
            pipeline.setex(stateKey, this.STATE_TTL, state);

            // Store metadata
            pipeline.setex(metaKey, this.STATE_TTL, JSON.stringify(metadata));

            // Store in history (keep last 50 versions)
            const historyEntry = JSON.stringify({
                version: metadata.version,
                timestamp: now,
                userId,
                stateSnapshot: state,
            });

            pipeline.zadd(historyKey, now, historyEntry);
            pipeline.zremrangebyrank(historyKey, 0, -51); // Keep only last 50
            pipeline.expire(historyKey, this.STATE_TTL);

            await pipeline.exec();

            logger.debug('Stored document state', {
                documentId,
                version: metadata.version,
            });
        } catch (error) {
            logger.error('Failed to store document state', { documentId, error });
            throw error;
        }
    }

    /**
     * Get document metadata
     */
    static async getDocumentMetadata(documentId: string): Promise<DocumentMetadata | null> {
        try {
            const key = `${this.DOCUMENT_METADATA_PREFIX}${documentId}`;
            const metaStr = await redis.get(key);

            return metaStr ? JSON.parse(metaStr) : null;
        } catch (error) {
            logger.error('Failed to get document metadata', { documentId, error });
            return null;
        }
    }

    /**
     * Get document history
     */
    static async getDocumentHistory(
        documentId: string,
        limit: number = 10,
        offset: number = 0
    ): Promise<any[]> {
        try {
            const key = `${this.DOCUMENT_HISTORY_PREFIX}${documentId}`;

            // Get entries in reverse chronological order
            const entries = await redis.zrevrange(key, offset, offset + limit - 1);

            return entries.map(entry => JSON.parse(entry));
        } catch (error) {
            logger.error('Failed to get document history', { documentId, error });
            return [];
        }
    }

    /**
     * Store awareness state (cursor positions, selections, user info)
     */
    static async storeAwareness(
        documentId: string,
        userId: string,
        awareness: any
    ): Promise<void> {
        try {
            const key = `${this.AWARENESS_PREFIX}${documentId}`;

            // Store as hash field (userId -> awareness state)
            await redis.hset(key, userId, JSON.stringify(awareness));
            await redis.expire(key, this.AWARENESS_TTL);

            logger.debug('Stored awareness', { documentId, userId });
        } catch (error) {
            logger.error('Failed to store awareness', { documentId, userId, error });
        }
    }

    /**
     * Get all awareness states for a document
     */
    static async getAwarenessStates(documentId: string): Promise<Record<string, any>> {
        try {
            const key = `${this.AWARENESS_PREFIX}${documentId}`;
            const states = await redis.hgetall(key);

            const parsed: Record<string, any> = {};
            for (const [userId, stateStr] of Object.entries(states)) {
                try {
                    parsed[userId] = JSON.parse(stateStr);
                } catch {
                    // Skip malformed entries
                }
            }

            return parsed;
        } catch (error) {
            logger.error('Failed to get awareness states', { documentId, error });
            return {};
        }
    }

    /**
     * Remove awareness state for a user
     */
    static async removeAwareness(documentId: string, userId: string): Promise<void> {
        try {
            const key = `${this.AWARENESS_PREFIX}${documentId}`;
            await redis.hdel(key, userId);

            logger.debug('Removed awareness', { documentId, userId });
        } catch (error) {
            logger.error('Failed to remove awareness', { documentId, userId, error });
        }
    }

    /**
     * Track active users in a document
     */
    static async addActiveUser(documentId: string, userId: string, socketId: string): Promise<void> {
        try {
            const key = `${this.ACTIVE_USERS_PREFIX}${documentId}`;
            const userData = JSON.stringify({ userId, socketId, joinedAt: Date.now() });

            await redis.hset(key, userId, userData);
            await redis.expire(key, this.AWARENESS_TTL);
        } catch (error) {
            logger.error('Failed to add active user', { documentId, userId, error });
        }
    }

    /**
     * Remove active user from a document
     */
    static async removeActiveUser(documentId: string, userId: string): Promise<void> {
        try {
            const key = `${this.ACTIVE_USERS_PREFIX}${documentId}`;
            await redis.hdel(key, userId);
        } catch (error) {
            logger.error('Failed to remove active user', { documentId, userId, error });
        }
    }

    /**
     * Get active users in a document
     */
    static async getActiveUsers(documentId: string): Promise<string[]> {
        try {
            const key = `${this.ACTIVE_USERS_PREFIX}${documentId}`;
            const users = await redis.hgetall(key);

            return Object.keys(users);
        } catch (error) {
            logger.error('Failed to get active users', { documentId, error });
            return [];
        }
    }

    /**
     * Cleanup stale awareness and user data
     */
    static async cleanupStaleData(documentId: string): Promise<void> {
        try {
            const awarenessKey = `${this.AWARENESS_PREFIX}${documentId}`;
            const usersKey = `${this.ACTIVE_USERS_PREFIX}${documentId}`;

            // Check if keys exist
            const awarenessExists = await redis.exists(awarenessKey);
            const usersExists = await redis.exists(usersKey);

            if (!awarenessExists && !usersExists) {
                return; // Nothing to clean
            }

            // Get current time
            const now = Date.now();
            const staleThreshold = now - (this.AWARENESS_TTL * 1000);

            // Get all users
            const users = await redis.hgetall(usersKey);

            // Remove stale users
            const pipeline = redis.pipeline();
            for (const [userId, userDataStr] of Object.entries(users)) {
                try {
                    const userData = JSON.parse(userDataStr);
                    if (userData.joinedAt < staleThreshold) {
                        pipeline.hdel(usersKey, userId);
                        pipeline.hdel(awarenessKey, userId);
                    }
                } catch {
                    // Remove malformed entries
                    pipeline.hdel(usersKey, userId);
                }
            }

            await pipeline.exec();
        } catch (error) {
            logger.error('Failed to cleanup stale data', { documentId, error });
        }
    }
}
