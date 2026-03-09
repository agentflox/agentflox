'use client';

import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { useSocket } from '@/components/providers/SocketProvider';
import { useSession } from 'next-auth/react';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  isRead?: boolean;
  isPending?: boolean;
  attachments?: string[];
  replyTo?: {
    id: string;
    content: string;
    senderId: string;
  };
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

export function useMessages(params?: { userId?: string }) {
  const { socket, isConnected, waitForConnection } = useSocket();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const paramsRef = useRef(params);
  const processedMessages = useRef(new Set<string>());

  useEffect(() => {
    paramsRef.current = params;
  }, [params?.userId]);

  // ✅ Update conversation cache helper
  const updateConversationCache = useCallback((userId: string, updates: Partial<Conversation>) => {
    utils.messages.listConversations.setData({ page: 1, pageSize: 50 }, (old: any) => {
      if (!old) return old;
      const list = Array.isArray(old) ? { items: old } : old;
      if (!list.items) return old;

      const items = [...list.items];
      const idx = items.findIndex((c: Conversation) => (c.user_id ?? (c as any).id) === userId);
      
      if (idx >= 0) {
        const conv = items.splice(idx, 1)[0];
        items.unshift({ ...conv, ...updates });
      }
      
      return Array.isArray(old) ? items : { ...list, items };
    });
  }, [utils]);

  // ✅ Live selectors (thread + conversations)
  const threadQueryKey = useMemo(() => (
    paramsRef.current?.userId ? ['messages.listWithUser', { userId: paramsRef.current.userId, page: 1, pageSize: 100 }] as const : null
  ), [paramsRef.current?.userId]);

  const thread = useMemo(() => {
    if (!threadQueryKey) return [] as Message[];
    const cached = queryClient.getQueryData(threadQueryKey) as any;
    return (cached?.items || []) as Message[];
  }, [threadQueryKey ? (queryClient.getQueryState(threadQueryKey as any)?.dataUpdatedAt) : undefined]);

  const conversations = useMemo(() => {
    const key = ['messages.listConversations', { page: 1, pageSize: 50 }] as const;
    const cached = queryClient.getQueryData(key) as any;
    return (cached?.items || []) as any[];
  }, [queryClient.getQueryState(['messages.listConversations', { page: 1, pageSize: 50 }] as any)?.dataUpdatedAt]);

  // ✅ Update thread cache helper
  const updateThreadCache = useCallback((userId: string, message: Message, mode: 'add' | 'update' | 'replace-temp' = 'add') => {
    utils.messages.listWithUser.setData({ userId, page: 1, pageSize: 100 }, (old: any) => {
      const base = old ? (Array.isArray(old) ? { items: old, total: old.length } : old) : { items: [], total: 0 };
      if (!base.items) base.items = [];

      const items = [...base.items];
      
      if (mode === 'replace-temp') {
        // Replace temp message with real one
        const tempIdx = items.findIndex((m: any) => m.isPending);
        if (tempIdx >= 0) {
          items[tempIdx] = message;
        } else if (!items.some(m => m.id === message.id)) {
          items.push(message);
        }
      } else if (mode === 'update') {
        // Update existing message
        const idx = items.findIndex((m: Message) => m.id === message.id);
        if (idx >= 0) {
          items[idx] = { ...items[idx], ...message };
        } else {
          items.push(message);
        }
      } else {
        // Add if doesn't exist
        if (!items.some(m => m.id === message.id)) {
          items.push(message);
        }
      }

      return { ...base, items, total: Math.max(base.total || 0, items.length) };
    });
  }, [utils]);

  // Handle received messages
  const handleMessageReceived = useCallback((data: any) => {
    const messageId = data?.id || data?.messageId;
    const fromUserId = data?.senderId || data?.fromUserId;
    
    if (!messageId || !fromUserId || !currentUserId) return;
    if (processedMessages.current.has(messageId)) return;
    
    processedMessages.current.add(messageId);
    setTimeout(() => processedMessages.current.delete(messageId), 5000);

    // Update conversation
    updateConversationCache(fromUserId, {
      unread: 0, // Will be calculated properly
      lastMessage: data.content?.substring(0, 100),
      lastMessageAt: data.createdAt,
    });

    // Update thread if viewing this conversation
    const currentViewingUserId = paramsRef.current?.userId;
    if (currentViewingUserId === fromUserId) {
      const newMessage: Message = {
        id: messageId,
        content: data.content,
        senderId: fromUserId,
        receiverId: currentUserId,
        createdAt: data.createdAt,
        isRead: false,
        attachments: data.attachments,
        replyTo: data.replyTo,
      };
      
      updateThreadCache(fromUserId, newMessage, 'update');
    }
  }, [currentUserId, updateConversationCache, updateThreadCache]);

  // Handle sent messages
  const handleMessageSent = useCallback((data: any) => {
    const messageId = data?.id || data?.messageId;
    const toUserId = data?.receiverId || data?.toUserId;
    
    if (!messageId || !toUserId || !currentUserId) return;

    // Update conversation
    updateConversationCache(toUserId, {
      lastMessage: data.content?.substring(0, 100),
      lastMessageAt: data.createdAt,
    });

    // Update thread if viewing
    const currentViewingUserId = paramsRef.current?.userId;
    if (currentViewingUserId === toUserId) {
      const newMessage: Message = {
        id: messageId,
        content: data.content,
        senderId: currentUserId,
        receiverId: toUserId,
        createdAt: data.createdAt,
        isRead: false,
        attachments: data.attachments,
        replyTo: data.replyTo,
      };
      
      updateThreadCache(toUserId, newMessage, 'replace-temp');
    }
  }, [currentUserId, updateConversationCache, updateThreadCache]);

  // Handle read acknowledgments
  const handleReadAck = useCallback((data: any) => {
    const byUserId = data?.byUserId;
    const messageIds = data?.messageIds || [];
    
    if (!byUserId) return;

    updateConversationCache(byUserId, { unread: 0 });

    const currentViewingUserId = paramsRef.current?.userId;
    if (currentViewingUserId === byUserId && messageIds.length) {
      utils.messages.listWithUser.setData({ userId: byUserId, page: 1, pageSize: 100 }, (old: any) => {
        const base = old ? (Array.isArray(old) ? { items: old, total: old.length } : old) : null;
        if (!base?.items) return old;
        const idSet = new Set(messageIds);
        return {
          ...base,
          items: base.items.map((m: Message) => idSet.has(m.id) ? { ...m, isRead: true } : m),
        };
      });
    }
  }, [updateConversationCache, utils]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    const s = await waitForConnection();
    if (!s) throw new Error('Socket not connected');
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Request timeout')), 10000);
      s.emit('message:react', { messageId, emoji }, (err: any, resp?: any) => {
        clearTimeout(timeout);
        if (err) return reject(new Error(err?.message || 'Failed to react'));
        resolve(resp);
      });
    });
  }, [waitForConnection]);
  
  // Register socket listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on('message:received', handleMessageReceived);
    socket.on('message:sent', handleMessageSent);
    socket.on('message:read:ack', handleReadAck);

    return () => {
      socket.off('message:received', handleMessageReceived);
      socket.off('message:sent', handleMessageSent);
      socket.off('message:read:ack', handleReadAck);
    };
  }, [socket, isConnected, handleMessageReceived, handleMessageSent, handleReadAck]);

  // ✅ Send message with INSTANT optimistic update
  const sendMessage = useCallback(async (variables: { 
    id: string;
    toUserId: string; 
    content: string; 
    attachments?: string[]; 
    replyTo?: { id: string; content: string; senderId: string } 
  }) => {
    if (!currentUserId) throw new Error('Not authenticated');
    const tempMessage: Message = {
      id: variables.id,
      content: variables.content,
      senderId: currentUserId,
      receiverId: variables.toUserId,
      createdAt: new Date().toISOString(),
      isPending: true,
      attachments: variables.attachments,
      replyTo: variables.replyTo,
    };
    
    // ✅ INSTANT optimistic update (synchronous)
    updateThreadCache(variables.toUserId, tempMessage, 'add');
    updateConversationCache(variables.toUserId, {
      lastMessage: variables.content.substring(0, 100),
      lastMessageAt: tempMessage.createdAt,
    });

    try {
      const s = await waitForConnection();
      if (!s) throw new Error('Socket not connected');

      const response = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Request timeout')), 10000);
        
        s.emit('message:create', variables, (err: any, resp?: any) => {
          clearTimeout(timeout);
          if (err) return reject(new Error(err?.message || 'Failed to send'));
          resolve(resp);
        });
      });

      return response;
    } catch (error) {
      // ✅ Remove optimistic message on error
      utils.messages.listWithUser.setData({ userId: variables.toUserId, page: 1, pageSize: 100 }, (old: any) => {
        const base = old ? (Array.isArray(old) ? { items: old, total: old.length } : old) : null;
        if (!base?.items) return old;
        return { ...base, items: base.items.filter((m: any) => m.id !== variables.id) };
      });
      
      throw error;
    }
  }, [currentUserId, updateThreadCache, updateConversationCache, waitForConnection, utils]);

  // ✅ Mark as read (instant)
  const markAsRead = useCallback((fromUserId: string) => {
    if (!socket || !isConnected) return;
    
    updateConversationCache(fromUserId, { unread: 0 });
    socket.emit('message:read', { fromUserId });
  }, [socket, isConnected, updateConversationCache]);

  return {
    sendMessage: { mutateAsync: sendMessage, isPending: false },
    markAsRead,
    thread,
    conversations,
    toggleReaction
  };
}
