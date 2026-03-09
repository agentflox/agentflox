import { Socket } from 'socket.io';
import { prisma } from '@/lib/prisma';
import { notificationService, NotificationEventType } from '@/services/notification/notificationService';
import { getFanoutRateLimiter } from '@/lib/fanoutRateLimiter';
import type {
  CreateCommentData,
  UpdateCommentData,
  DeleteCommentData,
  VoteCommentData,
} from '@agentflox/types';

export function registerCommentHandlers(io: any, socket: Socket) {
  // Initialize standard limiter
  try { getFanoutRateLimiter(io); } catch (e) { }

  socket.on('comment:create', async (data: CreateCommentData) => {
    try {
      const userId = socket.data.userId;
      if (!userId) return;

      const comment = await prisma.$transaction(async (tx) => {
        // 1. Create Comment
        const newComment = await tx.postComment.create({
          data: {
            id: data.id,
            postId: data.postId,
            userId: userId,
            parentId: data.parentId,
            content: data.content,
          },
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        });

        // 2. Increment Post Comment Count
        const post = await tx.post.update({
          where: { id: data.postId },
          data: { commentCount: { increment: 1 } },
          select: { userId: true, id: true }
        });

        return { newComment, postAuthorId: post.userId };
      });

      // Broadcast to post room
      io.to(`post:${data.postId}`).emit('comment:created', { comment: comment.newComment });

      // Notify Post Author
      if (comment.postAuthorId !== userId) {
        notificationService.publishEvent({
          eventType: NotificationEventType.POST_COMMENTED,
          actorId: userId,
          entityType: 'comment',
          entityId: comment.newComment.id,
          recipientId: comment.postAuthorId,
          aggregateKey: `post_comment:${data.postId}`, // Group comments on same post
          metadata: { postId: data.postId }
        });
      }

      // Notify Parent Comment Author (if reply)
      if (data.parentId) {
        const parentComment = await prisma.postComment.findUnique({
          where: { id: data.parentId },
          select: { userId: true }
        });
        if (parentComment && parentComment.userId !== userId) {
          notificationService.publishEvent({
            eventType: NotificationEventType.COMMENT_REPLIED,
            actorId: userId,
            entityType: 'comment',
            entityId: comment.newComment.id,
            recipientId: parentComment.userId,
            aggregateKey: `comment_reply:${data.parentId}`,
            metadata: { postId: data.postId, commentId: data.parentId }
          });
        }
      }

    } catch (error) {
      console.error('Error creating comment:', error);
      socket.emit('error', { message: 'Failed to create comment' });
    }
  });

  socket.on('comment:update', async (data: UpdateCommentData) => {
    try {
      const userId = socket.data.userId;

      const comment = await prisma.postComment.update({
        where: {
          id: data.commentId,
          userId: userId // Ownership check
        },
        data: {
          content: data.content,
          isEdited: true,
          editedAt: new Date(),
        },
        select: { postId: true, editedAt: true }
      });

      // Broadcast update
      io.to(`post:${comment.postId}`).emit('comment:updated', {
        commentId: data.commentId,
        content: data.content,
        isEdited: true,
        editedAt: comment.editedAt,
      });

    } catch (error) {
      console.error('Error updating comment:', error);
      socket.emit('error', { message: 'Failed to update comment' });
    }
  });

  socket.on('comment:delete', async (data: DeleteCommentData) => {
    try {
      const userId = socket.data.userId;

      const comment = await prisma.$transaction(async (tx) => {
        const deleted = await tx.postComment.delete({
          where: {
            id: data.commentId,
            userId: userId,
          },
          select: { postId: true }
        });

        await tx.post.update({
          where: { id: deleted.postId },
          data: { commentCount: { decrement: 1 } }
        });

        return deleted;
      });

      // Broadcast deletion
      io.to(`post:${comment.postId}`).emit('comment:deleted', {
        commentId: data.commentId,
        postId: comment.postId,
      });

    } catch (error) {
      console.error('Error deleting comment:', error);
      socket.emit('error', { message: 'Failed to delete comment' });
    }
  });

  socket.on('comment:vote', async (data: VoteCommentData) => {
    try {
      const userId = socket.data.userId;

      await prisma.postCommentVote.upsert({
        where: {
          commentId_userId: {
            commentId: data.commentId,
            userId: userId
          }
        },
        create: {
          commentId: data.commentId,
          userId: userId,
          voteType: data.voteType as any
        },
        update: {
          voteType: data.voteType as any
        }
      });

      // OPTIMIZED: Count in DB
      const [upvotes, downvotes] = await Promise.all([
        prisma.postCommentVote.count({ where: { commentId: data.commentId, voteType: 'UPVOTE' } }),
        prisma.postCommentVote.count({ where: { commentId: data.commentId, voteType: 'DOWNVOTE' } })
      ]);

      // Update comment stats
      const comment = await prisma.postComment.update({
        where: { id: data.commentId },
        data: { upvotes, downvotes },
        select: { postId: true, userId: true }
      });

      // Broadcast vote update
      io.to(`post:${comment.postId}`).emit('comment:voted', {
        commentId: data.commentId,
        userId,
        voteType: data.voteType,
        upvotes,
        downvotes,
      });

      // Notify if useful (e.g. upvote threshold)
      if (data.voteType === 'UPVOTE' && comment.userId !== userId) {
        notificationService.publishEvent({
          eventType: NotificationEventType.COMMENT_LIKED,
          actorId: userId,
          entityType: 'comment',
          entityId: data.commentId,
          recipientId: comment.userId,
          aggregateKey: `comment_vote:${data.commentId}`
        });
      }

    } catch (error) {
      console.error('Error voting on comment:', error);
      socket.emit('error', { message: 'Failed to vote on comment' });
    }
  });
}