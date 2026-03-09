'use client';

import { useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useSocket } from "@/components/providers/SocketProvider";
import { useSession } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";
import type { JsonValue } from "@prisma/client/runtime/library";

export interface ChannelMessage {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  createdAt: string | Date;
  attachments?: any[];
  reactions?: any[];
  parentId?: string | null;
  user: { id: string; name: string | null; email: string; image: string | null };
  parent?: { id: string; content: string; userId: string; user?: { id: string; name: string | null; email: string; image: string | null } } | null;
  isPending?: boolean;
}

export function useChannels(params: { channelId?: string }) {
  const { channelId } = params;
  const { socket, isConnected, waitForConnection } = useSocket();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const utils = trpc.useUtils();
  const processed = useRef(new Set<string>());

  const messages = trpc.channelMessage.list.useQuery(
    { channelId: channelId ?? "", take: 100 },
    { enabled: Boolean(channelId) }
  );

  // Helpers to update cache
  const addMessageToCache = useCallback(
    (msg: ChannelMessage) => {
      utils.channelMessage.list.setData({ channelId: msg.channelId, take: 100 }, (old) => {
        const base = (old as { items: ChannelMessage[]; nextCursor: string | null } | undefined) ?? {
          items: [] as ChannelMessage[],
          nextCursor: null as string | null,
        };
        if (base.items.some((m) => m.id === msg.id)) return base;
        const items = [...base.items, msg];
        return { ...base, items };
      });
    },
    [utils.channelMessage.list]
  );

  const replaceTemp = useCallback(
    (msg: ChannelMessage) => {
      utils.channelMessage.list.setData({ channelId: msg.channelId, take: 100 }, (old) => {
        const base = (old as { items: ChannelMessage[]; nextCursor: string | null } | undefined) ?? {
          items: [] as ChannelMessage[],
          nextCursor: null as string | null,
        };
        const items = base.items.map((m) => (m.id === msg.id ? { ...msg, isPending: false } : m));
        return { ...base, items };
      });
    },
    [utils.channelMessage.list]
  );

  // Socket listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleReceived = (data: ChannelMessage) => {
      if (!data?.id || !data.channelId) return;
      if (processed.current.has(data.id)) return;
      processed.current.add(data.id);
      setTimeout(() => processed.current.delete(data.id), 5000);
      const cached = utils.channelMessage.list.getData({ channelId: data.channelId, take: 100 }) as
        | { items?: ChannelMessage[] }
        | undefined;
      let enriched: ChannelMessage = data;
      if (!data.parent && data.parentId && cached?.items?.length) {
        const p = cached.items!.find((m) => m.id === data.parentId);
        if (p) {
          enriched = {
            ...data,
            parent: { id: p.id, content: p.content, userId: p.userId, user: p.user },
          } as ChannelMessage;
        }
      }
      utils.channelMessage.list.setData({ channelId: data.channelId, take: 100 }, (old) => {
        const base = (old as { items: ChannelMessage[]; nextCursor: string | null } | undefined) ?? {
          items: [] as ChannelMessage[],
          nextCursor: null as string | null,
        };
        const exists = base.items.some((m) => m.id === enriched.id);
        const items = exists
          ? base.items.map((m) => (m.id === enriched.id ? { ...enriched, isPending: false } : m))
          : [...base.items, enriched];
        return { ...base, items };
      });
    };

    const handleReaction = (data: { messageId: string; reactions: any[] }) => {
      if (!data?.messageId) return;
      utils.channelMessage.list.setData({ channelId: channelId ?? "", take: 100 }, (old) => {
        const base = (old as { items: ChannelMessage[]; nextCursor: string | null } | undefined) ?? {
          items: [] as ChannelMessage[],
          nextCursor: null as string | null,
        };
        const items = base.items.map((m) =>
          m.id === data.messageId ? { ...m, reactions: data.reactions as JsonValue[] } : m
        );
        return { ...base, items };
      });
    };

    socket.on("channel:message:received", handleReceived);
    socket.on("channel:message:sent", handleReceived);
    socket.on("channel:message:reaction", handleReaction);

    if (channelId) {
      socket.emit("channel:join", { channelId });
    }

    return () => {
      socket.off("channel:message:received", handleReceived);
      socket.off("channel:message:sent", handleReceived);
      socket.off("channel:message:reaction", handleReaction);
    };
  }, [socket, isConnected, utils.channelMessage.list, channelId]);

  const sendMessage = useCallback(
    async (input: { channelId: string; content: string; attachments?: any[]; parentId?: string }) => {
      if (!currentUserId) throw new Error("Not authenticated");
      const id = uuidv4();
      const temp: ChannelMessage = {
        id,
        channelId: input.channelId,
        userId: currentUserId,
        content: input.content,
        attachments: input.attachments ?? [],
        parentId: input.parentId,
        createdAt: new Date().toISOString(),
        isPending: true,
        user: {
          id: currentUserId,
          name: session?.user?.name ?? null,
          email: session?.user?.email ?? "",
          image: session?.user?.image ?? null,
        },
        reactions: [],
      };
      addMessageToCache(temp);

      const s = await waitForConnection();
      if (!s) throw new Error("Socket not connected");

      return await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Request timeout")), 10000);
        s.emit(
          "channel:message:create",
          {
            id,
            channelId: input.channelId,
            content: input.content,
            attachments: input.attachments ?? [],
            replyTo: input.parentId ? { id: input.parentId } : undefined,
          },
          (err: any, resp?: any) => {
            clearTimeout(timeout);
            if (err) {
              reject(new Error(err?.message || "Failed to send"));
              return;
            }
            const cached = utils.channelMessage.list.getData({ channelId: input.channelId, take: 100 }) as
              | { items?: ChannelMessage[] }
              | undefined;
            let enriched = resp as ChannelMessage;
            if (!enriched.parent && enriched.parentId && cached?.items?.length) {
              const p = cached.items!.find((m) => m.id === enriched.parentId);
              if (p) {
                enriched = { ...enriched, parent: { id: p.id, content: p.content, userId: p.userId, user: p.user } };
              }
            }
            replaceTemp(enriched);
            resolve();
          }
        );
      });
    },
    [currentUserId, addMessageToCache, replaceTemp, waitForConnection]
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      const s = await waitForConnection();
      if (!s) throw new Error("Socket not connected");
      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Request timeout")), 10000);
        s.emit("channel:message:react", { messageId, emoji }, (err: any, resp?: any) => {
          clearTimeout(timeout);
          if (err) return reject(new Error(err?.message || "Failed to react"));
          resolve(resp);
        });
      });
    },
    [waitForConnection]
  );

  return {
    messages: messages.data?.items ?? [],
    isLoading: messages.isLoading,
    sendMessage,
    toggleReaction,
  };
}
