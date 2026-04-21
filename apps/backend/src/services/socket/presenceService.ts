import { redis } from '@/lib/redis';
import { PRESENCE_CONFIG } from '@/lib/presenceConfig';

export class PresenceService {
  private static PRESENCE_TTL = PRESENCE_CONFIG.TTL_SECONDS;
  private static PRESENCE_KEY_PREFIX = 'presence:user:';
  private static SOCKET_KEY_PREFIX = 'presence:socket:';
  private static SOCKET_SET_PREFIX = 'presence:sockets:';

  /**
   * Set user online with a specific socket.
   * Supports multiple concurrent connections.
   */
  static async setUserOnline(userId: string, socketId: string): Promise<void> {
    if (redis.status !== 'ready') {
      console.warn(`⚠️ User ${userId}: Redis not ready (${redis.status}). Skipping presence update.`);
      return;
    }

    const userKey = `${this.PRESENCE_KEY_PREFIX}${userId}`;
    const socketSetKey = `${this.SOCKET_SET_PREFIX}${userId}`;
    const socketKey = `${this.SOCKET_KEY_PREFIX}${socketId}`;

    const data = {
      userId,
      socketId,
      timestamp: Date.now(),
      status: 'online',
    };

    try {
      const pipeline = redis.pipeline();
      pipeline.setex(userKey, this.PRESENCE_TTL, JSON.stringify(data));
      pipeline.setex(socketKey, this.PRESENCE_TTL, JSON.stringify({ userId, timestamp: Date.now() }));
      pipeline.sadd(socketSetKey, socketId);
      pipeline.expire(socketSetKey, this.PRESENCE_TTL);
      pipeline.sadd('online_users', userId);
      await pipeline.exec();

      console.log(`✅ User ${userId} set online (socket: ${socketId})`);
    } catch (error) {
      console.error(`❌ Failed to set user ${userId} online:`, error);
    }
  }

  /**
   * Remove a specific socket connection.
   * Only marks user offline if they have no remaining connections.
   */
  static async setUserOffline(userId: string, socketId?: string): Promise<void> {
    const userKey = `${this.PRESENCE_KEY_PREFIX}${userId}`;
    const socketSetKey = `${this.SOCKET_SET_PREFIX}${userId}`;

    if (socketId) {
      const socketKey = `${this.SOCKET_KEY_PREFIX}${socketId}`;
      const pipeline = redis.pipeline();
      pipeline.srem(socketSetKey, socketId);
      pipeline.del(socketKey);
      await pipeline.exec();

      const remainingSockets = await redis.scard(socketSetKey);
      if (remainingSockets > 0) {
        // User still has other active connections — stay online
        return;
      }
    }

    // No more connections — mark fully offline
    const pipeline = redis.pipeline();
    pipeline.del(userKey);
    pipeline.del(socketSetKey);
    pipeline.srem('online_users', userId);
    await pipeline.exec();

    console.log(`👋 User ${userId} set offline`);
  }

  /**
   * Check if user is online.
   */
  static async isUserOnline(userId: string): Promise<boolean> {
    const key = `${this.PRESENCE_KEY_PREFIX}${userId}`;
    const exists = await redis.exists(key);
    return exists === 1;
  }

  /**
   * Update presence TTL on heartbeat.
   *
   * IMPORTANT: If the key has already expired (race between TTL and heartbeat),
   * re-creates it via setUserOnline rather than silently doing nothing.
   */
  static async updatePresence(userId: string, socketId: string): Promise<void> {
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
    } else {
      // Key expired between heartbeats — re-create presence
      console.warn(`⚠️ Presence key expired for user ${userId}, re-creating...`);
      await this.setUserOnline(userId, socketId);
    }
  }

  /**
   * Get list of online users, cleaning up stale entries.
   */
  static async getOnlineUsers(): Promise<string[]> {
    const userIds = await redis.smembers('online_users');
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

    if (staleUsers.length > 0) {
      redis.srem('online_users', ...staleUsers).catch((err) =>
        console.error('Error cleaning stale users:', err)
      );
    }

    return validUsers;
  }

  /**
   * Get approximate count of online users.
   */
  static async getOnlineUserCount(): Promise<number> {
    return redis.scard('online_users');
  }

  /**
   * Get accurate count by validating all entries.
   */
  static async getAccurateOnlineUserCount(): Promise<number> {
    const users = await this.getOnlineUsers();
    return users.length;
  }

  /**
   * Get user's active socket IDs.
   */
  static async getUserSockets(userId: string): Promise<string[]> {
    const socketSetKey = `${this.SOCKET_SET_PREFIX}${userId}`;
    return redis.smembers(socketSetKey);
  }

  /**
   * Cleanup stale presence entries.
   * Run periodically via lifecycle interval.
   */
  static async cleanupStaleEntries(): Promise<number> {
    const allUsers = await redis.smembers('online_users');
    if (!allUsers || allUsers.length === 0) return 0;

    let staleUsersCleaned = 0;
    let staleSocketsCleaned = 0;

    // Batch-check all users and their sockets
    const checkPipeline = redis.pipeline();
    for (const userId of allUsers) {
      checkPipeline.exists(`${this.PRESENCE_KEY_PREFIX}${userId}`);
      checkPipeline.smembers(`${this.SOCKET_SET_PREFIX}${userId}`);
    }
    const results = await checkPipeline.exec();
    if (!results) return 0;

    const cleanupPipeline = redis.pipeline();
    const socketChecks: Array<{ userId: string; socketId: string }> = [];

    for (let i = 0; i < allUsers.length; i++) {
      const userId = allUsers[i];
      const userExists = results[i * 2][1] === 1;
      const socketIds = results[i * 2 + 1][1] as string[];

      if (!userExists) {
        cleanupPipeline.srem('online_users', userId);
        cleanupPipeline.del(`${this.SOCKET_SET_PREFIX}${userId}`);
        staleUsersCleaned++;
      } else if (socketIds?.length > 0) {
        for (const socketId of socketIds) {
          cleanupPipeline.exists(`${this.SOCKET_KEY_PREFIX}${socketId}`);
          socketChecks.push({ userId, socketId });
        }
      }
    }

    const socketResults = await cleanupPipeline.exec();
    if (!socketResults) return staleUsersCleaned;

    // socketResults starts after the srem/del entries for stale users
    const socketResultOffset = staleUsersCleaned * 2;
    const finalPipeline = redis.pipeline();

    for (let i = 0; i < socketChecks.length; i++) {
      const { userId, socketId } = socketChecks[i];
      const socketExists = socketResults[socketResultOffset + i]?.[1] === 1;

      if (!socketExists) {
        finalPipeline.srem(`${this.SOCKET_SET_PREFIX}${userId}`, socketId);
        staleSocketsCleaned++;
      }
    }

    if (staleSocketsCleaned > 0 || staleUsersCleaned > 0) {
      await finalPipeline.exec();
      console.log(`🧹 Cleaned up ${staleUsersCleaned} stale users and ${staleSocketsCleaned} stale sockets`);
    }

    return staleUsersCleaned + staleSocketsCleaned;
  }
}