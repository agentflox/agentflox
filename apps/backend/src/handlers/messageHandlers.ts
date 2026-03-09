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

      // 2. System Health Check - Enforce Degraded Mode
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
      const authorized = await canSendMessage(userId, data.toUserId);
      if (!authorized) {
        const err = {
          message: 'Not authorized to send message to this user',
          code: 'UNAUTHORIZED',
        };
        console.error('❌ Authorization denied:', { from: userId, to: data.toUserId });
        if (ack) return ack(err);
        return socket.emit('error', err);
      }

      // 5. Check cache for deduplication (with circuit breaker)
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

      const conversationId = getConversationId(userId, data.toUserId);
      const now = new Date();

      // 6. Atomic Database Transaction - Create message + delivery tracking
      const result = await executeDbOperation(async () => {
        return await prisma.$transaction(async (tx) => {
          // Get or create conversation
          let conversation = await tx.conversation.findUnique({
            where: {
              participantIds: [userId, data.toUserId].sort(), // Ensure consistent ordering
            },
          });

          if (!conversation) {
            conversation = await tx.conversation.create({
              data: {
                participantIds: [userId, data.toUserId].sort(),
                messageSequence: 0,
              },
            });
          }

          // Increment sequence number
          const sequenceNumber = conversation.messageSequence + 1;

          // Create message
          const message = await tx.message.create({
            data: {
              id: data.id,
              conversationId: conversation.id,
              senderId: userId,
              receiverId: data.toUserId,
              content: data.content || '',
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

          // Create delivery tracking
          await tx.messageDelivery.create({
            data: {
              messageId: message.id,
              userId: data.toUserId,
              status: 'PENDING',
            },
          });

          // Update conversation sequence
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
      const payload = {
        id: result.id,
        conversationId: result.conversationId,
        from: {
          id: result.sender.id,
          username: result.sender.username,
          name: result.sender.name,
          avatar: result.sender.avatar,
        },
        content: result.content,
        attachments: result.attachments,
        reactions: result.reactions,
        replyTo: result.replyTo,
        isRead: result.isRead,
        createdAt: result.createdAt,
        sequenceNumber: result.sequenceNumber,
      };

      // 8. Cache for deduplication (with circuit breaker)
      await executeRedisOperation(
        () => redis.setex(`msg:${data.id}`, 3600, JSON.stringify(payload)),
        null
      );

      // 9. Enqueue for delivery via BullMQ
      await enqueueMessageDelivery(result.id, data.toUserId, userId, 1);

      metrics.messagesCreated.inc({ status: 'success' });

      // 10. Echo back to sender immediately
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

  // Toggle reaction on a message with atomic operation
  socket.on('message:react', async (rawData: any, ack?: (err: any, response?: any) => void) => {
    try {
      const userId = socket.data.userId as string;

      // 1. Validate input
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

      // 2. Rate limiting
      const rateLimitResult = await consumeRateLimit(
        socketRateLimiters.reaction,
        userId,
        'reactions'
      );

      if (!rateLimitResult.allowed) {
        const err = {
          message: rateLimitResult.error,
          code: 'RATE_LIMIT_EXCEEDED',
        };
        if (ack) return ack(err);
        return socket.emit('error', err);
      }

      // 3. Use Lua script for atomic reaction toggle in Redis (with circuit breaker)
      const luaScript = `
        local key = KEYS[1]
        local userId = ARGV[1]
        local emoji = ARGV[2]
        
        local reactions = redis.call('GET', key)
        reactions = reactions and cjson.decode(reactions) or {}
        
        local found = false
        for i = #reactions, 1, -1 do
          if reactions[i].userId == userId and reactions[i].emoji == emoji then
            table.remove(reactions, i)
            found = true
            break
          end
        end
        
        if not found then
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

      // 4. Update database asynchronously with transaction
      const updated = await executeDbOperation(async () => {
        const message = await prisma.message.findUnique({
          where: { id: data.messageId },
          select: { id: true, senderId: true, receiverId: true, conversationId: true },
        });

        if (!message) {
          throw new Error('Message not found');
        }

        // Update reactions in database
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

      // 5. Broadcast to both users in the conversation
      const roomA = `user:${updated.senderId}`;
      const roomB = `user:${updated.receiverId}`;
      io.to(roomA).emit('message:reaction', payload);
      io.to(roomB).emit('message:reaction', payload);

      if (ack) return ack(null, payload);
    } catch (err: any) {
      console.error('❌ message:react error:', err);
      if (typeof ack === 'function') {
        return ack({
          message: err?.message || 'Failed to react',
          code: 'MESSAGE_REACT_FAILED',
        });
      }
      socket.emit('error', { message: 'Failed to react to message', code: 'MESSAGE_REACT_FAILED' });
    }
  });

  socket.on('message:read', async (rawData: any) => {
    console.log('📥 message:read received:', { reader: socket.data.userId, from: rawData?.fromUserId });

    try {
      // 1. Validate input
      let data;
      try {
        data = MessageReadSchema.parse(rawData);
      } catch (error) {
        console.error('❌ Invalid read receipt data');
        return;
      }

      const me = socket.data.userId;
      const now = new Date();

      // 2. Update messages as read (with transaction)
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

          if (messages.length === 0) {
            return [];
          }

          // Update all as read
          await tx.message.updateMany({
            where: {
              id: { in: messages.map((m) => m.id) },
            },
            data: {
              isRead: true,
              readAt: now,
            },
          });

          // Update delivery status
          await tx.messageDelivery.updateMany({
            where: {
              messageId: { in: messages.map((m) => m.id) },
              userId: me,
            },
            data: {
              status: 'READ',
              timestamp: now,
            },
          });

          return messages;
        });
      });

      const messageIds = updated.map((m) => m.id);
      console.log('✅ Marked as read:', messageIds.length, 'messages');

      // 3. Notify sender
      const senderRoom = `user:${data.fromUserId}`;
      io.to(senderRoom).emit('message:read:ack', {
        byUserId: me,
        at: now.toISOString(),
        messageIds,
      });
      console.log('📤 Emitted message:read:ack to:', senderRoom);
    } catch (err) {
      console.error('❌ message:read error:', err);
      socket.emit('error', {
        message: 'Failed to relay read receipt',
        code: 'MESSAGE_READ_FAILED',
      });
    }
  });
}
