import { Socket } from 'socket.io';
import { feedService } from '@/services/feed/feedService';
import { getConnectionPoolManager } from '@/lib/fanoutRateLimiter';
import { validateProjectAccess, validateTeamAccess } from '@/utils/socket/granularAuth';
import type { SubscribeFeedData, UnsubscribeFeedData } from '@agentflox/types';

interface FetchFeedData {
  feedType: 'global' | 'user' | 'project' | 'team' | 'proposal';
  feedId?: string;
  cursor?: string;
  limit?: number;
  forceRefresh?: boolean;
}

export function registerFeedHandlers(io: any, socket: Socket) {
  const connectionPool = getConnectionPoolManager();

  // Register connection
  if (socket.data.userId) {
    connectionPool.registerConnection(socket.id, socket.data.userId);
  }

  socket.on('disconnect', () => {
    connectionPool.unregisterConnection(socket.id);
  });

  // ENTERPRISE: Optimized Subscription Handler
  socket.on('feed:subscribe', async (data: SubscribeFeedData) => {
    try {
      let room: string;
      const userId = socket.data.userId;

      // Validate inputs strictly
      if (!userId) throw new Error('Unauthorized');

      switch (data.feedType) {
        case 'global':
          room = 'feed:global';
          break;
        case 'user':
          // Security: Can only subscribe to own feed or feeds of users you follow (handled by posts fan-out logic mostly)
          // For realtime updates, usually you subscribe to your OWN feed channel to get updates relevant to YOU
          room = `feed:user:${data.feedId || userId}`;
          break;
        case 'project':
          if (!data.feedId) throw new Error('Project ID required');
          const projectAuth = await validateProjectAccess(socket, data.feedId, socket.data.workspaceId);
          if (!projectAuth.authorized) {
            throw new Error(projectAuth.reason || 'Not authorized to access this project');
          }
          room = `feed:project:${data.feedId}`;
          break;
        case 'team':
          if (!data.feedId) throw new Error('Team ID required');
          const teamAuth = await validateTeamAccess(socket, data.feedId, socket.data.workspaceId);
          if (!teamAuth.authorized) {
            throw new Error(teamAuth.reason || 'Not authorized to access this team');
          }
          room = `feed:team:${data.feedId}`;
          break;
        case 'proposal':
          if (!data.feedId) throw new Error('Proposal ID required');
          room = `feed:proposal:${data.feedId}`;
          break;
        default:
          throw new Error('Invalid feed type');
      }

      // Connection Pool Management (Prevent memory leaks)
      if (connectionPool.joinRoom(socket.id, room)) {
        await socket.join(room);
        // console.log(`Socket ${socket.id} joined ${room}`);
      } else {
        socket.emit('error', { message: 'Too many active subscriptions' });
      }

    } catch (error) {
      console.error('Error subscribing to feed:', error);
      socket.emit('error', {
        message: error instanceof Error ? error.message : 'Failed to subscribe to feed'
      });
    }
  });

  socket.on('feed:unsubscribe', async (data: UnsubscribeFeedData) => {
    try {
      let room: string;
      switch (data.feedType) {
        case 'global': room = 'feed:global'; break;
        case 'user': room = `feed:user:${data.feedId || socket.data.userId}`; break;
        case 'project': room = `feed:project:${data.feedId}`; break;
        case 'team': room = `feed:team:${data.feedId}`; break;
        case 'proposal': room = `feed:proposal:${data.feedId}`; break;
        default: return;
      }

      connectionPool.leaveRoom(socket.id, room);
      await socket.leave(room);
    } catch (error) {
      console.error('Error unsubscribing:', error);
    }
  });

  // ENTERPRISE: High-Performance Feed Fetch
  socket.on('feed:fetch', async (data: FetchFeedData, ack?: (err: any, response?: any) => void) => {
    const startTime = Date.now();
    try {
      let result;
      const limit = Math.min(data.limit || 20, 50); // Hard cap size
      const cacheStrategy = data.forceRefresh ? 'fresh' : 'normal';

      switch (data.feedType) {
        case 'global':
          result = await feedService.getGlobalFeed({
            limit,
            cursor: data.cursor,
            cacheStrategy
          });
          break;
        case 'user':
          const userId = data.feedId || socket.data.userId;
          if (!userId) throw new Error('User ID required');
          result = await feedService.getUserFeed(userId, {
            limit,
            cursor: data.cursor,
            cacheStrategy
          });
          break;
        case 'project':
          if (!data.feedId) throw new Error('Project ID required');
          const projectAuth = await validateProjectAccess(socket, data.feedId, socket.data.workspaceId);
          if (!projectAuth.authorized) {
            throw new Error(projectAuth.reason || 'Not authorized to access this project');
          }
          result = await feedService.getEntityFeed('project', data.feedId, {
            limit,
            cursor: data.cursor,
            cacheStratesgy
          });
          break;
        case 'team':
          if (!data.feedId) throw new Error('Team ID required');
          const teamAuth = await validateTeamAccess(socket, data.feedId, socket.data.workspaceId);
          if (!teamAuth.authorized) {
            throw new Error(teamAuth.reason || 'Not authorized to access this team');
          }
          result = await feedService.getEntityFeed('team', data.feedId, {
            limit,
            cursor: data.cursor,
            cacheStrategy
          });
          break;
        default:
          throw new Error('Invalid feed type');
      }

      // Add performance metadata
      const response = {
        ...result,
        feedType: data.feedType,
        feedId: data.feedId,
        meta: {
          latency: Date.now() - startTime,
          cached: result.fromCache
        }
      };

      if (typeof ack === 'function') {
        ack(null, response);
      } else {
        socket.emit('feed:fetched', response);
      }

    } catch (error) {
      console.error('Error fetching feed:', error);
      const errResponse = { message: error instanceof Error ? error.message : 'Failed to fetch feed' };

      if (typeof ack === 'function') {
        ack(errResponse);
      } else {
        socket.emit('error', errResponse);
      }
    }
  });
}