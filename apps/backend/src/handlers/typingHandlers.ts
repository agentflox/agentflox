import { Server } from 'socket.io';
import type { TypingData } from '@agentflox/types';

/**
 * Typing Indicator Aggregator
 * Batches typing events to prevent network floods
 */

interface TypingState {
  userIds: Set<string>;
  timer: NodeJS.Timeout | null;
}

export class TypingAggregator {
  private typingStates = new Map<string, TypingState>(); // room → typing state
  private readonly FLUSH_DELAY_MS = 300; // Batch typing events for 300ms

  /**
   * Add user to typing state for a room
   * Automatically flushes after delay
   */
  addTypingUser(room: string, userId: string, io: Server): void {
    if (!this.typingStates.has(room)) {
      this.typingStates.set(room, {
        userIds: new Set(),
        timer: null,
      });
    }

    const state = this.typingStates.get(room)!;
    state.userIds.add(userId);

    // Clear existing timer
    if (state.timer) {
      clearTimeout(state.timer);
    }

    // Set new timer to flush after delay
    state.timer = setTimeout(() => {
      this.flushRoom(room, io);
    }, this.FLUSH_DELAY_MS);
  }

  /**
   * Remove user from typing state
   */
  removeTypingUser(room: string, userId: string, io: Server): void {
    const state = this.typingStates.get(room);
    if (!state) return;

    state.userIds.delete(userId);

    // If no users typing, flush immediately
    if (state.userIds.size === 0) {
      this.flushRoom(room, io);
    }
  }

  /**
   * Flush aggregated typing state to room
   */
  private flushRoom(room: string, io: Server): void {
    const state = this.typingStates.get(room);
    if (!state) return;

    // Clear timer
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }

    // Broadcast aggregated typing state
    const userIds = Array.from(state.userIds);

    if (userIds.length > 0) {
      io.to(room).emit('users:typing', {
        room,
        userIds,
        count: userIds.length,
      });
      console.log(`[TypingAggregator] Flushed ${userIds.length} typing users to ${room}`);
    } else {
      // Send empty state (everyone stopped typing)
      io.to(room).emit('users:typing', {
        room,
        userIds: [],
        count: 0,
      });
    }

    // Clean up if empty
    if (state.userIds.size === 0) {
      this.typingStates.delete(room);
    }
  }

  /**
   * Force flush all rooms (useful for shutdown)
   */
  flushAll(io: Server): void {
    for (const room of this.typingStates.keys()) {
      this.flushRoom(room, io);
    }
  }
}

// Singleton instance
export const typingAggregator = new TypingAggregator();

/**
 * Enhanced typing handlers with server-side aggregation
 */
export function registerEnhancedTypingHandlers(io: Server, socket: any) {
  socket.on('typing:start', (data: TypingData) => {
    try {
      const room = data.postId
        ? `post:${data.postId}`
        : data.commentId
          ? `comment:${data.commentId}`
          : data.channelId
            ? `channel:${data.channelId}`
            : null;

      if (!room) {
        console.warn('[TypingHandlers] Invalid typing data - no room specified');
        return;
      }

      typingAggregator.addTypingUser(room, socket.data.userId, io);
    } catch (error) {
      console.error('[TypingHandlers] Error handling typing:start:', error);
    }
  });

  socket.on('typing:stop', (data: TypingData) => {
    try {
      const room = data.postId
        ? `post:${data.postId}`
        : data.commentId
          ? `comment:${data.commentId}`
          : data.channelId
            ? `channel:${data.channelId}`
            : null;

      if (!room) {
        console.warn('[TypingHandlers] Invalid typing data - no room specified');
        return;
      }

      typingAggregator.removeTypingUser(room, socket.data.userId, io);
    } catch (error) {
      console.error('[TypingHandlers] Error handling typing:stop:', error);
    }
  });

  // Auto-stop typing on disconnect
  socket.on('disconnect', () => {
    // Remove user from all typing states
    for (const room of typingAggregator['typingStates'].keys()) {
      typingAggregator.removeTypingUser(room, socket.data.userId, io);
    }
  });
}