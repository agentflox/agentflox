'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { useSocket } from '@/components/providers/SocketProvider';
import { useSession } from 'next-auth/react';

/**
 * Lightweight message actions without socket listeners or thread queries.
 * Use in MessageItem; register socket listeners once at the Thread/layout level.
 */
export function useMessageActions() {
  const { socket, isConnected, waitForConnection } = useSocket();
  const utils = trpc.useUtils();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const queryClient = useQueryClient();

  const updateConversationCache = useCallback(
    (targetUserId: string, updates: Record<string, unknown>) => {
      utils.messages.listConversations.setData({ page: 1, pageSize: 50 }, (old: any) => {
        if (!old) return old;
        const list = Array.isArray(old) ? { items: old } : old;
        const items = [...(list.items || [])];
        const targetListingId = (updates.marketplaceListingId as string | null) || null;
        const idx = items.findIndex(
          (c: any) =>
            c.user_id === targetUserId &&
            ((c.marketplace_listing_id ?? c.marketplaceListingId ?? null) === targetListingId)
        );
        if (idx >= 0) {
          items[idx] = { ...items[idx], ...updates };
        }
        return { ...list, items };
      });
    },
    [utils]
  );

  const updateReactionInCache = useCallback(
    (messageId: string, userId: string, emoji: string) => {
      const applyReactionUpdate = (old: any) => {
        const base = old
          ? Array.isArray(old)
            ? { items: old, total: old.length }
            : old
          : null;
        if (!base?.items) return old;

        const items = base.items.map((m: any) => {
          if (m.id !== messageId) return m;
          const existing: Array<{ userId: string; emoji: string }> = Array.isArray(m.reactions)
            ? [...m.reactions]
            : [];

          let hadSameEmoji = false;
          const withoutUser = existing.filter((r) => {
            if (r.userId === userId) {
              if (r.emoji === emoji) hadSameEmoji = true;
              return false;
            }
            return true;
          });

          if (!hadSameEmoji) {
            return { ...m, reactions: [...withoutUser, { userId, emoji }] };
          }
          return { ...m, reactions: withoutUser };
        });

        return { ...base, items };
      };

      queryClient.setQueriesData({ queryKey: [['messages', 'listWithUser']] }, applyReactionUpdate);
      queryClient.setQueriesData({ queryKey: [['messages', 'listByConversationId']] }, applyReactionUpdate);
    },
    [queryClient]
  );

  const markAsRead = useCallback(
    (fromUserId: string) => {
      if (!socket || !isConnected) return;
      updateConversationCache(fromUserId, { unread: 0 });
      socket.emit('message:read', { fromUserId });
    },
    [socket, isConnected, updateConversationCache]
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!currentUserId) return;

      updateReactionInCache(messageId, currentUserId, emoji);

      try {
        const s = await waitForConnection();
        if (!s) throw new Error('Socket not connected');
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Request timeout')), 10000);
          s.emit('message:react', { messageId, emoji }, (err: any) => {
            clearTimeout(timeout);
            if (err) return reject(new Error(err?.message || 'Failed to react'));
            resolve();
          });
        });
      } catch (error) {
        updateReactionInCache(messageId, currentUserId, emoji);
        throw error;
      }
    },
    [currentUserId, waitForConnection, updateReactionInCache]
  );

  return { markAsRead, toggleReaction };
}
