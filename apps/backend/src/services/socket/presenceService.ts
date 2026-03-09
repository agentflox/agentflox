import { redis } from '@/lib/redis';

export class PresenceService {
  private static PRESENCE_TTL = 30; // 30 seconds (updated from 300 for faster cleanup)
  private static PRESENCE_KEY_PREFIX = 'presence:user:';
  private static SOCKET_KEY_PREFIX = 'presence:socket:'; // Per-socket tracking
  private static SOCKET_SET_PREFIX = 'presence:sockets:'; // Track all sockets per user

  /**
   * Set user online with a specific socket
   * Supports multiple concurrent connections
   */
  static async setUserOnline(userId: string, socketId: string) {
    const userKey = `${this.PRESENCE_KEY_PREFIX}${userId}`;
    const socketSetKey = `${this.SOCKET_SET_PREFIX}${userId}`;
    const socketKey = `${this.SOCKET_KEY_PREFIX}${socketId}`;
    const data = {
      userId,
      socketId,
      timestamp: Date.now(),
      status: 'online',
    };

    if (redis.status !== 'ready') {
      console.warn(`⚠️ User ${userId}: Redis is not READY (Status: ${redis.status}). Aborting presence update.`);
      return;
    }
    // Use pipeline for atomic operations
    const pipeline = redis.pipeline();

    // Store presence data
    pipeline.setex(userKey, this.PRESENCE_TTL, JSON.stringify(data));

    // Track this specific socket with TTL
    pipeline.setex(socketKey, this.PRESENCE_TTL, JSON.stringify({ userId, timestamp: Date.now() }));

    // Track this socket for the user
    pipeline.sadd(socketSetKey, socketId);
    pipeline.expire(socketSetKey, this.PRESENCE_TTL);

    // Add to online users set
    pipeline.sadd('online_users', userId);
    try {
      const results = await pipeline.exec();

      // Log the success and the results of the pipeline commands
      console.log(`✅ Success: User ${userId} set to online. Pipeline results:`, results);

    } catch (error) {
      // Log the failure if the Redis connection or command execution fails
      console.error(`❌ Failure: Could not set user ${userId} online. Error:`, error);
    }
  }

  /**
   * Remove a specific socket connection
   * Only marks user offline if they have no remaining connections
   */
  static async setUserOffline(userId: string, socketId?: string) {
    const userKey = `${this.PRESENCE_KEY_PREFIX}${userId}`;
    const socketSetKey = `${this.SOCKET_SET_PREFIX}${userId}`;

    if (socketId) {
      // Remove this specific socket
      await redis.srem(socketSetKey, socketId);

      // Check if user has any remaining connections
      const remainingSockets = await redis.scard(socketSetKey);

      if (remainingSockets > 0) {
        // User still has other active connections
        return;
      }
    }

    // No more connections - mark user as offline
    const pipeline = redis.pipeline();
    pipeline.del(userKey);
    pipeline.del(socketSetKey);
    pipeline.srem('online_users', userId);
    await pipeline.exec();
  }

  /**
   * Check if user is online
   */
  static async isUserOnline(userId: string): Promise<boolean> {
    const key = `${this.PRESENCE_KEY_PREFIX}${userId}`;
    const exists = await redis.exists(key);
    return exists === 1;
  }

  /**
   * Get list of online users
   * Automatically cleans up stale entries
   */
  static async getOnlineUsers(): Promise<string[]> {
    const userIds = await redis.smembers('online_users');

    // Validate and clean up stale entries
    const validUsers: string[] = [];
    const staleUsers: string[] = [];

    for (const userId of userIds) {
      const isOnline = await this.isUserOnline(userId);
      if (isOnline) {
        validUsers.push(userId);
      } else {
        staleUsers.push(userId);
      }
    }

    // Clean up stale entries in background
    if (staleUsers.length > 0) {
      redis.srem('online_users', ...staleUsers).catch(err =>
        console.error('Error cleaning stale users:', err)
      );
    }

    return validUsers;
  }

  /**
   * Get count of online users (approximate)
   */
  static async getOnlineUserCount(): Promise<number> {
    return redis.scard('online_users');
  }

  /**
   * Get accurate count by validating entries
   */
  static async getAccurateOnlineUserCount(): Promise<number> {
    const users = await this.getOnlineUsers();
    return users.length;
  }

  /**
   * Update presence timestamp (heartbeat)
   */
  static async updatePresence(userId: string, socketId: string) {
    const userKey = `${this.PRESENCE_KEY_PREFIX}${userId}`;
    const socketSetKey = `${this.SOCKET_SET_PREFIX}${userId}`;
    const socketKey = `${this.SOCKET_KEY_PREFIX}${socketId}`;

    const exists = await redis.exists(userKey);

    if (exists) {
      const pipeline = redis.pipeline();
      pipeline.expire(userKey, this.PRESENCE_TTL);
      pipeline.expire(socketSetKey, this.PRESENCE_TTL);
      pipeline.expire(socketKey, this.PRESENCE_TTL);
      await pipeline.exec();
    }
  }

  /**
   * Get user's active socket IDs
   */
  static async getUserSockets(userId: string): Promise<string[]> {
    const socketSetKey = `${this.SOCKET_SET_PREFIX}${userId}`;
    return redis.smembers(socketSetKey);
  }

  /**
   * Cleanup stale entries (run periodically via cron/background job)
   * Enhanced to scan socket keys for proper cleanup
   */
  static async cleanupStaleEntries(): Promise<number> {
    const allUsers = await redis.smembers('online_users');
    if (!allUsers || allUsers.length === 0) return 0;

    let staleUsersCleaned = 0;
    let staleSocketsCleaned = 0;

    // Use a pipeline to check presence for all users at once
    const pipeline = redis.pipeline();
    for (const userId of allUsers) {
      pipeline.exists(`${this.PRESENCE_KEY_PREFIX}${userId}`);
      pipeline.smembers(`${this.SOCKET_SET_PREFIX}${userId}`);
    }

    const results = await pipeline.exec();
    if (!results) return 0;

    const cleanupPipeline = redis.pipeline();

    // Process results
    for (let i = 0; i < allUsers.length; i++) {
      const userId = allUsers[i];
      const userExistsResult = results[i * 2];
      const socketIdsResult = results[i * 2 + 1];

      const userExists = userExistsResult[1] === 1;
      const socketIds = socketIdsResult[1] as string[];

      if (!userExists) {
        // User has no presence key - they are offline
        cleanupPipeline.srem('online_users', userId);
        cleanupPipeline.del(`${this.SOCKET_SET_PREFIX}${userId}`);
        staleUsersCleaned++;
      } else if (socketIds && socketIds.length > 0) {
        // User is "online", but check if their sockets are still valid
        // To save requests, we'll only check a subset of sockets or use a more efficient check
        // For now, let's just mark which sockets to check
        for (const socketId of socketIds) {
          cleanupPipeline.exists(`${this.SOCKET_KEY_PREFIX}${socketId}`);
        }
      }
    }

    // If we have many sockets to check, this might still be big, but it's one roundtrip
    const socketResults = await cleanupPipeline.exec();
    if (!socketResults) return staleUsersCleaned;

    const finalPipeline = redis.pipeline();
    let socketResultIdx = staleUsersCleaned; // Offset by the SREM/DEL calls above

    // We need to re-iterate and find which sockets failed
    for (let i = 0; i < allUsers.length; i++) {
      const userId = allUsers[i];
      const userExists = results[i * 2][1] === 1;
      const socketIds = results[i * 2 + 1][1] as string[];

      if (userExists && socketIds && socketIds.length > 0) {
        for (const socketId of socketIds) {
          const socketExists = socketResults[socketResultIdx][1] === 1;
          socketResultIdx++;

          if (!socketExists) {
            finalPipeline.srem(`${this.SOCKET_SET_PREFIX}${userId}`, socketId);
            staleSocketsCleaned++;
          }
        }
      }
    }

    if (staleSocketsCleaned > 0 || staleUsersCleaned > 0) {
      await finalPipeline.exec();
      console.log(`🧹 Cleaned up ${staleUsersCleaned} stale users and ${staleSocketsCleaned} stale sockets`);
    }

    return staleUsersCleaned + staleSocketsCleaned;
  }
}