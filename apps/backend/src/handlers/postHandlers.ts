import { Socket } from 'socket.io';
import { redis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { feedService } from '@/services/feed/feedService';
import { notificationService, NotificationEventType } from '@/services/notification/notificationService';
import { getFanoutRateLimiter } from '@/lib/fanoutRateLimiter';
import { circuitBreakerManager } from '@/lib/circuitBreaker';
import {
  CreatePostData,
  UpdatePostData,
  DeletePostData,
  LikePostData,
  UnlikePostData,
} from '@agentflox/types';
import { validateProjectAccess, validateTeamAccess } from '@/utils/socket/granularAuth';

export function registerPostHandlers(io: any, socket: Socket) {
  // Initialize singleton if needed
  try { getFanoutRateLimiter(io); } catch (e) { }
  const fanoutLimiter = getFanoutRateLimiter(io);

  socket.on('post:create', async (data: CreatePostData, ack?: (err: any, response?: any) => void) => {
    try {
      const userId = socket.data.userId;
      if (!userId) throw new Error('Unauthorized');

      // 1. Authorization & Validation
      if (data.projectId) {
        const projectAuth = await validateProjectAccess(socket, data.projectId, socket.data.workspaceId);
        if (!projectAuth.authorized) {
          throw new Error(projectAuth.reason || 'Not authorized to post to this project');
        }
      }

      if (data.teamId) {
        const teamAuth = await validateTeamAccess(socket, data.teamId, socket.data.workspaceId);
        if (!teamAuth.authorized) {
          throw new Error(teamAuth.reason || 'Not authorized to post to this team');
        }
      }

      // 2. Create Post (DB)
      // Use circuit breaker for DB writes under load
      const dbBreaker = circuitBreakerManager.getBreaker('database-write');

      const post = await dbBreaker.execute(async () => {
        return prisma.post.create({
          data: {
            id: data.id,
            userId: userId,
            title: data.title,
            content: data.content,
            tags: data.tags || [],
            topic: data.topic as any,
            type: data.type as any,
            visibility: data.visibility as any,
            projectId: data.projectId,
            teamId: data.teamId,
            attachments: data.attachments || [],
          },
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          }
        });
      });

      // 2. Selective Cache Invalidation (Prevent Cache Storms)
      // Determine who needs to see this new post and invalidate ONLY their feed caches
      // And global feed if public
      const affectedUsers = await feedService.getAffectedUserIds(post);
      await feedService.invalidatePostCache(post.id, affectedUsers);

      // 3. Intelligent Fan-out (Batched & Rate Limited)
      const targetRooms: string[] = [];

      // Always to author
      targetRooms.push(`feed:user:${userId}`);

      // Determine visibility targets
      if (post.visibility === 'PUBLIC') {
        targetRooms.push('feed:global');
      }

      if (post.projectId) {
        targetRooms.push(`feed:project:${post.projectId}`);
      }

      if (post.teamId) {
        targetRooms.push(`feed:team:${post.teamId}`);
      }

      // Fan-out to followers (if not huge celebrity)
      // This part is tricky; usually we don't emit to 10k rooms.
      // We rely on "feed:global" or specific context rooms.
      // For user's followers, we might want to emit to them if fan-out-on-write is active
      // But for <50k scale, usually just invalidating cache is safer, 
      // and let them fetch fresh data on next poll/scroll/socket-pull.
      // However, for "Real-time" feel, we push to active connections.

      // Let's rely on `feed:global` or Context rooms for broad updates.
      // Pushing to every single follower's private feed room is expensive.

      await fanoutLimiter.broadcastWithBackpressure(
        targetRooms,
        'post:created',
        { post },
        { priority: 'high' }
      );

      // 4. Trigger Notifications (Async Event Sourced)
      // e.g. Notify mentioned users, or team members
      if (post.teamId) {
        // Example: Notify team members (should be done via background worker really)
        // For now, let's assume specific logic in notification service later
      }

      if (typeof ack === 'function') {
        ack(null, { post });
      }

    } catch (error) {
      console.error('❌ Error creating post:', error);
      if (typeof ack === 'function') {
        ack(error instanceof Error ? { message: error.message } : { message: 'Failed to create post' });
      } else {
        socket.emit('error', { message: 'Failed to create post' });
      }
    }
  });

  socket.on('post:like', async (data: LikePostData) => {
    try {
      const userId = socket.data.userId;
      if (!userId) return;

      // 1. Transactional Like
      await prisma.$transaction(async (tx) => {
        try {
          // Idempotent creation
          await tx.postLike.create({
            data: {
              postId: data.postId,
              userId: userId,
            }
          });
        } catch (e: any) {
          if (e.code === 'P2002') return; // Already liked
          throw e;
        }

        // Atomic Increment
        const post = await tx.post.update({
          where: { id: data.postId },
          data: { likeCount: { increment: 1 } },
          select: { likeCount: true, userId: true, id: true }
        });

        // 2. Broadcast Update (Debounced/Batched logic handled by client usually, but here we emit)
        // Ideally we shouldn't emit for every like on viral posts.
        // But for <50k users, it's okay if we don't have 10k likes/sec.
        // We use the fanout limiter just in case.
        await fanoutLimiter.broadcastWithBackpressure(
          [`post:${data.postId}`], // Only people watching this post specifically
          'post:liked',
          {
            postId: data.postId,
            userId,
            likeCount: post.likeCount,
          },
          { batchSize: 1, delayMs: 0 } // Immediate for single room
        );

        // 3. Async Notification
        if (post.userId !== userId) {
          notificationService.publishEvent({
            eventType: NotificationEventType.POST_LIKED,
            actorId: userId,
            entityType: 'post',
            entityId: post.id,
            recipientId: post.userId,
            aggregateKey: `post_like:${post.id}` // Aggregate likes on same post
          });
        }
      });

    } catch (error) {
      console.error('Error liking post:', error);
      socket.emit('error', { message: 'Failed to like post' });
    }
  });

  socket.on('post:unlike', async (data: UnlikePostData) => {
    try {
      const userId = socket.data.userId;
      if (!userId) return;

      await prisma.$transaction(async (tx) => {
        try {
          await tx.postLike.delete({
            where: {
              postId_userId: {
                postId: data.postId,
                userId: userId,
              }
            }
          });
        } catch (e: any) {
          if (e.code === 'P2025') return; // Not found
          throw e;
        }

        const post = await tx.post.update({
          where: { id: data.postId },
          data: { likeCount: { decrement: 1 } },
          select: { likeCount: true }
        });

        io.to(`post:${data.postId}`).emit('post:unliked', {
          postId: data.postId,
          userId,
          likeCount: Math.max(0, post.likeCount),
        });
      });

    } catch (error) {
      console.error('Error unliking post:', error);
      socket.emit('error', { message: 'Failed to unlike post' });
    }
  });

  // ... (Update/Delete handlers would follow similar patterns of using fanoutLimiter and cache invalidation)

  socket.on('post:delete', async (data: DeletePostData) => {
    try {
      const userId = socket.data.userId;

      const post = await prisma.post.findUnique({ where: { id: data.postId } });
      if (!post || post.userId !== userId) {
        throw new Error('Not found or unauthorized');
      }

      await prisma.post.delete({ where: { id: data.postId } });

      // Invalidate selectively
      const affectedUsers = await feedService.getAffectedUserIds(post);
      await feedService.invalidatePostCache(data.postId, affectedUsers);

      io.to(`post:${data.postId}`).emit('post:deleted', { postId: data.postId });

    } catch (err) {
      socket.emit('error', { message: 'Failed to delete' });
    }
  });
}