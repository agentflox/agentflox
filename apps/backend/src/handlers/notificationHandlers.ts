import { Socket } from 'socket.io';
import { notificationService } from '@/services/notification/notificationService';
import { getConnectionPoolManager } from '@/lib/fanoutRateLimiter';

export function registerNotificationHandlers(io: any, socket: Socket) {
  const connectionPool = getConnectionPoolManager();
  const userId = socket.data.userId;

  // Join user's private notification channel
  if (userId) {
    const room = `user:${userId}`;
    if (connectionPool.joinRoom(socket.id, room)) {
      socket.join(room);
    }
  }

  socket.on('disconnect', () => {
    // Connection pool handles cleanup via global listener in feedHandlers usually,
    // but specific room cleanup is automatic by Socket.IO.
    // The pool manager weak references or explicit cleanup is needed if we persist state.
    // We called unregisterConnection in feedHandlers already for this socket.
  });

  socket.on('notification:mark_read', async (data: { notificationId: string }) => {
    try {
      if (!userId) return;
      await notificationService.markAsRead(data.notificationId, userId);
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  });

  socket.on('notification:mark_all_read', async () => {
    try {
      if (!userId) return;
      await notificationService.markAllAsRead(userId);
    } catch (error) {
      console.error('Error marking all notifications read:', error);
    }
  });

  socket.on('notification:fetch', async (data: { limit?: number; cursor?: string; unreadOnly?: boolean }, ack) => {
    try {
      if (!userId) throw new Error("Unauthorized");
      const result = await notificationService.getNotifications(userId, data);
      if (typeof ack === 'function') ack(null, result);
      else socket.emit('notification:fetched', result);
    } catch (err) {
      if (typeof ack === 'function') ack({ message: 'Failed to fetch' });
    }
  });

  socket.on('notification:count', async (data, ack) => {
    try {
      if (!userId) return;
      const count = await notificationService.getUnreadCount(userId);
      if (typeof ack === 'function') ack(null, { count });
      else socket.emit('notification:count', { count });
    } catch (err) {
      // ignore
    }
  });
}
