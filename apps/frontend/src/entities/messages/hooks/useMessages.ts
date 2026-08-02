'use client';

import { useCallback, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useSocket } from '@/components/providers/SocketProvider';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { acquireMessageEventListeners } from '@/lib/socketRefCount';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: Date | string;
  isRead?: boolean;
  isPending?: boolean;
  clientId?: string;
  type?: string;
  attachments?: string[];
  replyTo?: {
    id: string;
    content: string;
    senderId: string;
  };
  marketplaceListingId?: string | null;
}

interface Conversation {
  user_id: string;
  name?: string;
  username?: string;
  avatar?: string;
  email?: string;
  unread: number;
  lastMessage?: string;
  lastMessageAt?: string;
}

export function useMessages(params?: {
  userId?: string;
  conversationId?: string | null;
  marketplaceListingId?: string | null;
  fetchConversations?: boolean;
  /** When false, skips per-instance socket listeners (use at feed/thread level only). */
  enableSocketListeners?: boolean;
}) {
  const { socket, isConnected, waitForConnection } = useSocket();
  const utils = trpc.useUtils();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const queryClient = useQueryClient();
  const paramsRef = useRef(params);
  const processedMessages = useRef(new Set<string>());

  useEffect(() => {
    paramsRef.current = params;
  }, [params?.userId, params?.conversationId]);

  // ✅ Reactive tRPC queries with staleTime: Infinity so React Query
  //    never background-refetches and never flashes a loading state.
  //    All updates flow in via socket → setData calls below.
  const { data: threadData } = trpc.messages.listWithUser.useQuery(
    { userId: params?.userId ?? "", marketplaceListingId: params?.marketplaceListingId, page: 1, pageSize: 100 },
    {
      enabled: !!params?.userId,
      staleTime: Infinity,  // ✅ All updates flow via socket → setData; never background-refetch
      gcTime: Infinity,  // Keep data in cache forever
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,  // Prevent background polling
    }
  );

  const fetchConversations = params?.fetchConversations !== false;
  const enableSocketListeners =
    params?.enableSocketListeners ?? (fetchConversations && !params?.userId);

  const { data: conversationsData } = trpc.messages.listConversations.useQuery(
    { page: 1, pageSize: 50 },
    {
      enabled: fetchConversations,
      // Allow refetches so new peers (e.g. accepted connections) appear; thread still uses socket + setData.
      staleTime: 60_000,
      gcTime: Infinity,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchInterval: false,
    }
  );

  const thread = (threadData?.items ?? []) as unknown as Message[];
  const conversations = (conversationsData?.items ?? []) as unknown as Conversation[];

  // ✅ On mount: purge any stale isPending messages left over from previous sessions
  useEffect(() => {
    if (!params?.userId) return;
    utils.messages.listWithUser.setData(
      { userId: params.userId, marketplaceListingId: params.marketplaceListingId, page: 1, pageSize: 100 },
      (old: any) => {
        const base = old
          ? Array.isArray(old)
            ? { items: old, total: old.length }
            : old
          : null;
        if (!base?.items) return old;
        const cleaned = base.items.filter((m: any) => !m.isPending);
        return { ...base, items: cleaned, total: cleaned.length };
      }
    );
  }, [params?.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ Update conversation cache helper
  const updateConversationCache = useCallback(
    (targetUserId: string, updates: any) => { // Using any for flexible updates
      utils.messages.listConversations.setData(
        { page: 1, pageSize: 50 },
        (old: any) => {
          if (!old) return old;
          const list = Array.isArray(old) ? { items: old } : old;
          const items = [...(list.items || [])];

          // We use user_id + listing_id as the primary identification key in the UI
          const targetListingId = updates.marketplaceListingId || null;

          const idx = items.findIndex(
            (c: any) =>
              String(c.user_id) === String(targetUserId) &&
              (c.marketplace_listing_id || null) === targetListingId
          );

          if (idx >= 0) {
            // Update existing
            const conv = items.splice(idx, 1)[0];
            items.unshift({ ...conv, ...updates });
          } else {
            // Add new skeletal conversation
            items.unshift({
              id: targetListingId ? `${targetUserId}:${targetListingId}` : targetUserId,
              user_id: targetUserId,
              name: updates.name || "User", // Fallback name
              avatar: updates.avatar || null,
              marketplace_listing_id: targetListingId,
              marketplace_listing_title: updates.marketplaceListingTitle || null,
              last_at: updates.lastMessageAt || new Date(),
              content: updates.lastMessage || "",
              unread: updates.unread || 0,
              connection_only: false,
              ...updates
            });
          }

          return Array.isArray(old) ? items : { ...list, items };
        }
      );
    },
    [utils]
  );

  // ✅ Update thread cache helper
  const updateThreadCache = useCallback(
    (
      userId: string,
      message: Message,
      mode: 'add' | 'update' | 'replace-temp' = 'add'
    ) => {
      const marketplaceListingId = paramsRef.current?.marketplaceListingId;
      const conversationId = paramsRef.current?.conversationId;

      const applyUpdate = (old: any) => {
        const base = old
          ? Array.isArray(old)
            ? { items: old, total: old.length }
            : old
          : { items: [], total: 0 };
        if (!base.items) base.items = [];

        const items = [...base.items];

        if (mode === 'replace-temp') {
          const tempIdx = items.findIndex((m: any) => m.clientId === message.clientId || (m.isPending && m.id === message.clientId));
          if (tempIdx >= 0) {
            items[tempIdx] = message;
          } else if (!items.some((m) => m.id === message.id)) {
            items.push(message);
          }
        } else if (mode === 'update') {
          const idx = items.findIndex((m: Message) => m.id === message.id);
          if (idx >= 0) {
            items[idx] = { ...items[idx], ...message };
          } else {
            items.push(message);
          }
        } else {
          // 'add'
          if (!items.some((m) => m.id === message.id)) {
            items.push(message);
          }
        }

        return {
          ...base,
          items,
          total: Math.max(base.total || 0, items.length),
        };
      };

      // Update the listWithUser cache (used by sidebar/hook)
      utils.messages.listWithUser.setData(
        { userId, marketplaceListingId, page: 1, pageSize: 100 },
        applyUpdate
      );

      // ✅ CRITICAL: Also update the listByConversationId cache that Thread.tsx reads from
      if (conversationId) {
        utils.messages.listByConversationId.setData(
          { conversationId, page: 1, pageSize: 100 },
          applyUpdate
        );
      }
    },
    [utils]
  );

  // ✅ Handle received messages
  const handleMessageReceived = useCallback(
    (data: any) => {
      const messageId = data?.id || data?.messageId;
      const fromUserId = data?.senderId || data?.fromUserId;

      if (!messageId || !fromUserId || !currentUserId) return;
      if (processedMessages.current.has(messageId)) return;

      processedMessages.current.add(messageId);
      setTimeout(() => processedMessages.current.delete(messageId), 5000);

      const marketplaceListingId = data.marketplaceListingId || null;
      let marketplaceListingTitle = null;
      if (data.content?.startsWith('__AF_MARKETPLACE_SUBMISSION__')) {
        try {
          const payload = JSON.parse(data.content.replace('__AF_MARKETPLACE_SUBMISSION__', ''));
          marketplaceListingTitle = payload.listing?.title;
        } catch (e) {
          // Ignore parse errors
        }
      }

      updateConversationCache(fromUserId, {
        unread: 0,
        lastMessage: data.content?.substring(0, 100),
        lastMessageAt: data.createdAt,
        marketplaceListingId,
        marketplaceListingTitle,
        name: data.from?.name,
        avatar: data.from?.avatar,
      });

      const currentViewingUserId = paramsRef.current?.userId;
      const currentViewingListingId = paramsRef.current?.marketplaceListingId;
      if (currentViewingUserId === fromUserId && (marketplaceListingId || null) === (currentViewingListingId || null)) {
        const newMessage: Message = {
          id: messageId,
          content: data.content,
          senderId: fromUserId,
          receiverId: currentUserId,
          createdAt: data.createdAt,
          isRead: false,
          attachments: data.attachments,
          replyTo: data.replyTo,
          marketplaceListingId: data.marketplaceListingId,
        };
        updateThreadCache(fromUserId, newMessage, 'update');
      }
    },
    [currentUserId, updateConversationCache, updateThreadCache]
  );

  // ✅ Handle sent messages
  const handleMessageSent = useCallback(
    (data: any) => {
      const messageId = data?.id || data?.messageId;
      const toUserId = data?.receiverId || data?.toUserId;

      if (!messageId || !toUserId || !currentUserId) return;

      const marketplaceListingId = data.marketplaceListingId || null;
      let marketplaceListingTitle = null;
      if (data.content?.startsWith('__AF_MARKETPLACE_SUBMISSION__')) {
        try {
          const payload = JSON.parse(data.content.replace('__AF_MARKETPLACE_SUBMISSION__', ''));
          marketplaceListingTitle = payload.listing?.title;
        } catch (e) {
          // Ignore
        }
      }

      updateConversationCache(toUserId, {
        lastMessage: data.content?.substring(0, 100),
        lastMessageAt: data.createdAt,
        marketplaceListingId,
        marketplaceListingTitle,
      });

      const currentViewingUserId = paramsRef.current?.userId;
      const currentViewingListingId = paramsRef.current?.marketplaceListingId;
      if (currentViewingUserId === toUserId && (marketplaceListingId || null) === (currentViewingListingId || null)) {
        const newMessage: Message = {
          id: messageId,
          content: data.content,
          senderId: currentUserId,
          receiverId: toUserId,
          createdAt: data.createdAt,
          isRead: false,
          attachments: data.attachments,
          replyTo: data.replyTo,
          marketplaceListingId: data.marketplaceListingId,
        };
        updateThreadCache(toUserId, newMessage, 'update');
      }
    },
    [currentUserId, updateConversationCache, updateThreadCache]
  );

  // ✅ Handle read acknowledgments
  const handleReadAck = useCallback(
    (data: any) => {
      const byUserId = data?.byUserId;
      const messageIds = data?.messageIds || [];

      if (!byUserId) return;

      updateConversationCache(byUserId, { unread: 0 });

      const currentViewingUserId = paramsRef.current?.userId;
      const marketplaceListingId = paramsRef.current?.marketplaceListingId;
      if (currentViewingUserId === byUserId && messageIds.length) {
        utils.messages.listWithUser.setData(
          { userId: byUserId, marketplaceListingId, page: 1, pageSize: 100 },
          (old: any) => {
            const base = old
              ? Array.isArray(old)
                ? { items: old, total: old.length }
                : old
              : null;
            if (!base?.items) return old;
            const idSet = new Set(messageIds);
            return {
              ...base,
              items: base.items.map((m: Message) =>
                idSet.has(m.id) ? { ...m, isRead: true } : m
              ),
            };
          }
        );
      }
    },
    [updateConversationCache, utils]
  );

  // ✅ Update a single message's reactions in both caches
  const updateReactionInCache = useCallback(
    (messageId: string, userId: string, emoji: string, options?: { add?: boolean }) => {
      const applyReactionUpdate = (old: any) => {
        const base = old
          ? Array.isArray(old)
            ? { items: old, total: old.length }
            : old
          : null;
        if (!base?.items) return old;

        const items = base.items.map((m: any) => {
          if (m.id !== messageId) return m;
          const existing: Array<{ userId: string; emoji: string }> = Array.isArray(m.reactions) ? [...m.reactions] : [];

          if (options?.add === true) {
            const withoutUser = existing.filter((r) => r.userId !== userId);
            const alreadyHasEmoji = existing.some((r) => r.userId === userId && r.emoji === emoji);
            if (alreadyHasEmoji) return m;
            return { ...m, reactions: [...withoutUser, { userId, emoji }] };
          }

          if (options?.add === false) {
            const next = existing.filter((r) => !(r.userId === userId && r.emoji === emoji));
            if (next.length === existing.length) return m;
            return { ...m, reactions: next };
          }

          let hadSameEmoji = false;
          const withoutUser = existing.filter(r => {
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

      queryClient.setQueriesData(
        { queryKey: [['messages', 'listWithUser']] },
        applyReactionUpdate
      );
      
      queryClient.setQueriesData(
        { queryKey: [['messages', 'listByConversationId']] },
        applyReactionUpdate
      );
    },
    [queryClient]
  );

  // ✅ Toggle reaction — optimistic update first, then socket sync
  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!currentUserId) return;

      // Determine current state to toggle
      const marketplaceListingId = paramsRef.current?.marketplaceListingId;
      const conversationId = paramsRef.current?.conversationId;
      const peerUserId = paramsRef.current?.userId;

      let alreadyReacted = false;
      const cacheData1 = queryClient.getQueriesData({ queryKey: [['messages', 'listWithUser']] });
      const cacheData2 = queryClient.getQueriesData({ queryKey: [['messages', 'listByConversationId']] });
      
      const allCaches = [...cacheData1, ...cacheData2];
      
      for (const [_, cacheData] of allCaches) {
        if (!cacheData) continue;
        const items = Array.isArray(cacheData) ? cacheData : (cacheData as any).items ?? [];
        const msg = items.find((m: any) => m.id === messageId);
        if (msg && Array.isArray(msg.reactions)) {
          alreadyReacted = msg.reactions.some((r: any) => r.userId === currentUserId && r.emoji === emoji);
          break;
        }
      }

      // Optimistic update
      updateReactionInCache(messageId, currentUserId, emoji);

      try {
        const s = await waitForConnection();
        if (!s) throw new Error('Socket not connected');
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Request timeout')), 10000);
          s.emit('message:react', { messageId, emoji }, (err: any) => {
            clearTimeout(timeout);
            if (err) {
              // Rollback optimistic update on error
              updateReactionInCache(messageId, currentUserId, emoji, { add: alreadyReacted });
              return reject(new Error(err?.message || 'Failed to react'));
            }
            resolve();
          });
        });
      } catch (error) {
        // Already rolled back above
        throw error;
      }
    },
    [currentUserId, waitForConnection, updateReactionInCache, utils]
  );

  // ✅ Register socket listeners (ref-counted globally)
  useEffect(() => {
    if (!enableSocketListeners || !socket || !isConnected) return;

    const handleReactionEvent = (data: any) => {
      const { messageId, userId: reactUserId, emoji, add } = data || {};
      if (!messageId || !reactUserId || !emoji) return;
      updateReactionInCache(messageId, reactUserId, emoji, { add: add !== false });
    };

    return acquireMessageEventListeners(socket, {
      onReceived: handleMessageReceived,
      onSent: handleMessageSent,
      onReadAck: handleReadAck,
      onReacted: handleReactionEvent,
    });
  }, [enableSocketListeners, socket, isConnected, handleMessageReceived, handleMessageSent, handleReadAck, updateReactionInCache]);

  // ✅ Send message with INSTANT optimistic update
  const sendMessage = useCallback(
    async (variables: {
      id: string;
      toUserId: string;
      content: string;
      type?: string;
      attachments?: string[];
      replyTo?: { id: string; content: string; senderId: string };
      marketplaceListingId?: string;
    }) => {
      if (!currentUserId) throw new Error('Not authenticated');

      const normalizedToUserId = String(variables.toUserId || '').trim();
      if (!normalizedToUserId) {
        throw new Error('Invalid recipient ID format');
      }

      const payload = { ...variables, toUserId: normalizedToUserId };

      const tempMessage: Message = {
        id: variables.id,
        clientId: variables.id,
        content: variables.content,
        type: variables.type || 'MESSAGE',
        senderId: currentUserId,
        receiverId: normalizedToUserId,
        createdAt: new Date().toISOString(),
        isPending: true,
        attachments: variables.attachments,
        replyTo: variables.replyTo,
      };

      // ✅ INSTANT optimistic update (synchronous)
      updateThreadCache(normalizedToUserId, tempMessage, 'add');
      updateConversationCache(normalizedToUserId, {
        lastMessage: variables.content.substring(0, 100),
        lastMessageAt: tempMessage.createdAt,
      });

      try {
        const s = await waitForConnection();
        if (!s) throw new Error('Socket not connected');

        const response = await new Promise<any>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error('Request timeout')),
            10000
          );

          s.emit('message:create', payload, (err: any, resp?: any) => {
            clearTimeout(timeout);
            if (err) {
              const errorWithCode = new Error(
                err?.message || 'Failed to send'
              ) as Error & { code?: string };
              errorWithCode.code = err?.code;
              return reject(errorWithCode);
            }
            resolve(resp);
          });
        });

        // ✅ Confirm temp message on server ack
        const confirmedMessage: Message = {
          id: response?.id ?? variables.id,
          clientId: variables.id,
          content: variables.content,
          type: response?.type ?? variables.type ?? 'MESSAGE',
          senderId: currentUserId,
          receiverId: normalizedToUserId,
          createdAt: response?.createdAt ?? tempMessage.createdAt,
          isRead: false,
          attachments: variables.attachments,
          replyTo: variables.replyTo,
          isPending: false,
        };
        updateThreadCache(normalizedToUserId, confirmedMessage, 'replace-temp');

        return response;
      } catch (error) {
        // ✅ Remove optimistic message on error from both caches
        const mlId = paramsRef.current?.marketplaceListingId;
        const convId = paramsRef.current?.conversationId;
        const rollback = (old: any) => {
          const base = old
            ? Array.isArray(old)
              ? { items: old, total: old.length }
              : old
            : null;
          if (!base?.items) return old;
          return {
            ...base,
            items: base.items.filter((m: any) => m.id !== variables.id),
          };
        };
        utils.messages.listWithUser.setData(
          { userId: normalizedToUserId, marketplaceListingId: mlId, page: 1, pageSize: 100 },
          rollback
        );
        if (convId) {
          utils.messages.listByConversationId.setData(
            { conversationId: convId, page: 1, pageSize: 100 },
            rollback
          );
        }
        throw error;
      }
    },
    [currentUserId, updateThreadCache, updateConversationCache, waitForConnection, utils]
  );

  // ✅ Mark as read (instant)
  const markAsRead = useCallback(
    (fromUserId: string) => {
      if (!socket || !isConnected) return;

      updateConversationCache(fromUserId, { unread: 0 });
      socket.emit('message:read', { fromUserId });
    },
    [socket, isConnected, updateConversationCache]
  );

  return {
    sendMessage: { mutateAsync: sendMessage, isPending: false },
    markAsRead,
    thread,
    conversations,
    toggleReaction,
  };
}