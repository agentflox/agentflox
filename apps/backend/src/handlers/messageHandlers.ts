import { Socket } from 'socket.io';
import { redis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { socketRateLimiters, consumeRateLimit } from '@/lib/rateLimiter';
import { MessageCreateSchema, MessageReactSchema, MessageReadSchema } from '@/schemas/socketSchemas';
import { canSendMessage, getConversationId } from '@/utils/socket/authorization';
import { ZodError } from 'zod';
import { enqueueMessageDelivery } from '@/services/messageDeliveryQueue';
import { executeDbOperation, executeRedisOperation, isSystemDegraded } from '@/lib/circuitBreaker';
import { metrics } from '@/monitoring/metrics';

export function registerMessageHandlers(io: any, socket: Socket) {
  console.log('🔌 Message handlers registered for user:', socket.data.userId);

  socket.on('message:create', async (rawData: any, ack?: (err: any, response?: any) => void) => {
    console.log('📥 message:create received:', { from: socket.data.userId, to: rawData?.toUserId });

    try {
      const userId = socket.data.userId;

      // 1. Input Validation
      let data;
      try {
        data = MessageCreateSchema.parse(rawData);
      } catch (error) {
        if (error instanceof ZodError) {
          const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          const err = { message: `Validation error: ${errorMessage}`, code: 'VALIDATION_ERROR' };
          console.error('❌ Validation error:', errorMessage);
          if (ack) return ack(err);
          return socket.emit('error', err);
        }
        throw error;
      }

      // 2. System Health Check
      const systemHealth = isSystemDegraded();
      if (!systemHealth.canWrite) {
        const err = {
          message: 'System in degraded mode: messages temporarily unavailable',
          code: 'SYSTEM_DEGRADED',
          canRead: systemHealth.canRead,
        };
        console.warn('⚠️ System degraded, rejecting message', err);
        if (ack) return ack(err);
        return socket.emit('error', err);
      }

      // 3. Rate Limiting
      const rateLimitResult = await consumeRateLimit(
        socketRateLimiters.message,
        userId,
        'message creation'
      );

      if (!rateLimitResult.allowed) {
        const err = {
          message: rateLimitResult.error,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitResult.retryAfter,
        };
        console.warn('⚠️ Rate limit exceeded for user:', userId);
        metrics.rateLimitHits.inc({ operation: 'message_create' });
        if (ack) return ack(err);
        return socket.emit('error', err);
      }

      // 4. Authorization
      const authorized = await canSendMessage(userId, data.toUserId, data.marketplaceListingId);
      if (!authorized) {
        const err = {
          message: 'Not authorized to send message to this user',
          code: 'UNAUTHORIZED',
        };
        console.error('❌ Authorization denied:', { from: userId, to: data.toUserId });
        if (ack) return ack(err);
        return socket.emit('error', err);
      }

      // 5. Deduplication cache check
      const cachedMessage = await executeRedisOperation(
        () => redis.get(`msg:${data.id}`),
        null
      );

      if (cachedMessage) {
        console.log('✅ Returning cached message (duplicate request):', data.id);
        const cached = JSON.parse(cachedMessage);
        if (ack) return ack(null, cached);
        return;
      }

      const now = new Date();

      // 6. Atomic DB Transaction
      const result = await executeDbOperation(async () => {
        return await prisma.$transaction(async (tx) => {
          const participantIds = [userId, data.toUserId].sort();
          const marketplaceListingId = data.marketplaceListingId ?? null;

          let conversation = await tx.conversation.findFirst({
            where: {
              participantIds: { equals: participantIds },
              marketplaceListingId,
            },
          });

          if (!conversation) {
            conversation = await tx.conversation.create({
              data: {
                participantIds,
                marketplaceListingId,
                messageSequence: 0,
              },
            });
          }

          const sequenceNumber = BigInt(conversation.messageSequence) + 1n;

          const message = await tx.message.create({
            data: {
              id: data.id,
              conversationId: conversation.id,
              senderId: userId,
              receiverId: data.toUserId,
              content: data.content || '',
              type: data.type || 'MESSAGE',
              attachments: data.attachments || [],
              replyToId: data.replyTo?.id ?? null,
              isRead: false,
              reactions: [],
              sequenceNumber,
              deliveryStatus: 'PERSISTED',
              createdAt: now,
            },
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  avatar: true,
                },
              },
              replyTo: {
                select: {
                  id: true,
                  content: true,
                  senderId: true,
                },
              },
            },
          });

          await tx.messageDelivery.create({
            data: {
              messageId: message.id,
              userId: data.toUserId,
              status: 'PENDING',
            },
          });

          await tx.conversation.update({
            where: { id: conversation.id },
            data: {
              messageSequence: sequenceNumber,
              updatedAt: now,
            },
          });

          return message;
        });
      });

      // 7. Format payload
      // IMPORTANT: sequenceNumber is a BigInt from Prisma.
      // JSON.stringify (used by Socket.IO internally) cannot serialize BigInt —
      // convert to string to avoid "Do not know how to serialize a BigInt" crash.
      const payload = {
        id: result.id,
        conversationId: result.conversationId,
        senderId: result.sender.id,
        toUserId: data.toUserId,
        from: {
          id: result.sender.id,
          username: result.sender.username,
          name: result.sender.name,
          avatar: result.sender.avatar,
        },
        content: result.content,
        type: result.type,
        attachments: result.attachments,
        reactions: result.reactions,
        replyTo: result.replyTo,
        isRead: result.isRead,
        marketplaceListingId: data.marketplaceListingId ?? null,
        createdAt: result.createdAt,
        sequenceNumber: result.sequenceNumber?.toString() ?? '0', // ✅ BigInt → string
      };

      // 8. Cache for deduplication
      await executeRedisOperation(
        () => redis.setex(`msg:${data.id}`, 3600, JSON.stringify(payload)),
        null
      );

      // 9. Enqueue for delivery
      await enqueueMessageDelivery(result.id, data.toUserId, userId, 1);

      metrics.messagesCreated.inc({ status: 'success' });

      // 10. Echo back to sender
      socket.emit('message:sent', payload);
      console.log('📤 Emitted message:sent to sender');

      if (typeof ack === 'function') {
        ack(null, payload);
        console.log('✅ Ack sent to sender');
      }
    } catch (err: any) {
      console.error('❌ message:create error:', err);
      metrics.messagesCreated.inc({ status: 'failed' });

      if (typeof ack === 'function') {
        return ack({
          message: err?.message || 'Failed to create message',
          code: 'MESSAGE_CREATE_FAILED',
        });
      }
      socket.emit('error', { message: 'Failed to create message', code: 'MESSAGE_CREATE_FAILED' });
    }
  });

  // Toggle reaction on a message
  socket.on('message:react', async (rawData: any, ack?: (err: any, response?: any) => void) => {
    try {
      const userId = socket.data.userId as string;

      let data;
      try {
        data = MessageReactSchema.parse(rawData);
      } catch (error) {
        if (error instanceof ZodError) {
          const err = { message: 'Invalid reaction data', code: 'VALIDATION_ERROR' };
          if (ack) return ack(err);
          return socket.emit('error', err);
        }
        throw error;
      }

      const rateLimitResult = await consumeRateLimit(
        socketRateLimiters.reaction,
        userId,
        'reactions'
      );

      if (!rateLimitResult.allowed) {
        const err = { message: rateLimitResult.error, code: 'RATE_LIMIT_EXCEEDED' };
        if (ack) return ack(err);
        return socket.emit('error', err);
      }

      // Atomic reaction toggle via Lua script
      const luaScript = `
        local key = KEYS[1]
        local userId = ARGV[1]
        local emoji = ARGV[2]
        
        local reactions = redis.call('GET', key)
        reactions = reactions and cjson.decode(reactions) or {}
        
        local found_same = false
        for i = #reactions, 1, -1 do
          if reactions[i].userId == userId then
            if reactions[i].emoji == emoji then
              found_same = true
            end
            table.remove(reactions, i)
          end
        end
        
        if not found_same then
          table.insert(reactions, {userId = userId, emoji = emoji})
        end
        
        redis.call('SETEX', key, 3600, cjson.encode(reactions))
        return cjson.encode(reactions)
      `;

      const reactionsJson = await executeRedisOperation(
        () => redis.eval(
          luaScript,
          1,
          `msg:reactions:${data.messageId}`,
          userId,
          data.emoji
        ) as Promise<string>,
        '[]'
      );

      const reactions = JSON.parse(reactionsJson || '[]');

      const updated = await executeDbOperation(async () => {
        const message = await prisma.message.findUnique({
          where: { id: data.messageId },
          select: { id: true, senderId: true, receiverId: true, conversationId: true },
        });

        if (!message) throw new Error('Message not found');

        await prisma.message.update({
          where: { id: data.messageId },
          data: { reactions },
        });

        return message;
      });

      const payload = {
        messageId: data.messageId,
        conversationId: updated.conversationId,
        reactions,
      };

      io.to(`user:${updated.senderId}`).emit('message:reaction', payload);
      io.to(`user:${updated.receiverId}`).emit('message:reaction', payload);

      if (ack) return ack(null, payload);
    } catch (err: any) {
      console.error('❌ message:react error:', err);
      if (typeof ack === 'function') {
        return ack({ message: err?.message || 'Failed to react', code: 'MESSAGE_REACT_FAILED' });
      }
      socket.emit('error', { message: 'Failed to react to message', code: 'MESSAGE_REACT_FAILED' });
    }
  });

  socket.on('message:read', async (rawData: any) => {
    console.log('📥 message:read received:', { reader: socket.data.userId, from: rawData?.fromUserId });

    try {
      const systemHealth = isSystemDegraded();
      if (!systemHealth.canWrite) {
        console.warn('⚠️ Skipping message:read in degraded mode');
        return;
      }

      let data;
      try {
        data = MessageReadSchema.parse(rawData);
      } catch (error) {
        console.error('❌ Invalid read receipt data');
        return;
      }

      const me = socket.data.userId;
      const now = new Date();

      const updated = await executeDbOperation(async () => {
        return await prisma.$transaction(async (tx) => {
          const messages = await tx.message.findMany({
            where: {
              senderId: data.fromUserId,
              receiverId: me,
              isRead: false,
            },
            select: { id: true },
          });

          if (messages.length === 0) return [];

          await tx.message.updateMany({
            where: { id: { in: messages.map((m) => m.id) } },
            data: { isRead: true, readAt: now },
          });

          await tx.messageDelivery.updateMany({
            where: {
              messageId: { in: messages.map((m) => m.id) },
              userId: me,
            },
            data: { status: 'READ', timestamp: now },
          });

          return messages;
        });
      });

      const messageIds = updated.map((m) => m.id);
      console.log('✅ Marked as read:', messageIds.length, 'messages');

      io.to(`user:${data.fromUserId}`).emit('message:read:ack', {
        byUserId: me,
        at: now.toISOString(),
        messageIds,
      });
      console.log('📤 Emitted message:read:ack to:', `user:${data.fromUserId}`);
    } catch (err) {
      console.error('❌ message:read error:', err);
      socket.emit('error', {
        message: 'Failed to relay read receipt',
        code: 'MESSAGE_READ_FAILED',
      });
    }
  });
}