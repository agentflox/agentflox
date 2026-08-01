'use client';

import { useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useSocket } from "@/components/providers/SocketProvider";
import { useSession } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";
import type { JsonValue } from "@prisma/client/runtime/library";
import { acquireChannelRoom, acquireChannelEventListeners } from "@/lib/socketRefCount";
import { toast } from "sonner";

export interface ChannelMessage {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  type?: string;
  title?: string | null;
  createdAt: string | Date;
  attachments?: any[];
  reactions?: any[];
  contexts?: any[];
  mentions?: any[];
  parentId?: string | null;
  user: { id: string; name: string | null; email: string; image: string | null };
  parent: { id: string; content: string; userId: string; user: { id: string; name: string | null; email: string; image: string | null } } | null;
  isPending?: boolean;
}

const MESSAGE_TAKE = 50;
const LIST_INPUT = (channelId: string) => ({ channelId, take: MESSAGE_TAKE });

function toCacheMessage(msg: ChannelMessage) {
  const { isPending: _isPending, ...rest } = msg;
  return { ...rest, parent: msg.parent ?? null };
}

/** Socket emit helpers only — no query observers or channel subscriptions. */
export function useChannelActions() {
  const { waitForConnection } = useSocket();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const utils = trpc.useUtils();

  const addMessageToCache = useCallback(
    (msg: ChannelMessage) => {
      utils.channelMessage.list.setData(LIST_INPUT(msg.channelId), ((old) => {
        const base = (old as { items: ChannelMessage[]; nextCursor: string | null } | undefined) ?? {
          items: [] as ChannelMessage[],
          nextCursor: null as string | null,
        };
        if (base.items.some((m) => m.id === msg.id)) return base as typeof old;
        const items = [...base.items, toCacheMessage(msg) as (typeof base.items)[number]];
        return { ...base, items } as typeof old;
      }) as any);
    },
    [utils.channelMessage.list]
  );

  const replaceTemp = useCallback(
    (msg: ChannelMessage) => {
      utils.channelMessage.list.setData(LIST_INPUT(msg.channelId), ((old) => {
        const base = (old as { items: ChannelMessage[]; nextCursor: string | null } | undefined) ?? {
          items: [] as ChannelMessage[],
          nextCursor: null as string | null,
        };
        const items = base.items.map((m) => (m.id === msg.id ? toCacheMessage({ ...msg, isPending: false }) : m));
        return { ...base, items } as typeof old;
      }) as any);
    },
    [utils.channelMessage.list]
  );

  const sendMessage = useCallback(
    async (input: { channelId: string; content: string; type?: string; title?: string; attachments?: any[]; contexts?: any[]; mentions?: any[]; parentId?: string }) => {
      if (!currentUserId) throw new Error("Not authenticated");
      const id = uuidv4();
      const temp: ChannelMessage = {
        id,
        channelId: input.channelId,
        userId: currentUserId,
        content: input.content,
        type: input.type,
        title: input.title,
        attachments: input.attachments ?? [],
        contexts: input.contexts,
        mentions: input.mentions,
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
        parent: null,
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
            type: input.type,
            title: input.title,
            attachments: input.attachments ?? [],
            contexts: input.contexts,
            mentions: input.mentions,
            replyTo: input.parentId ? { id: input.parentId } : undefined,
          },
          (err: any, resp?: any) => {
            clearTimeout(timeout);
            if (err) {
              const msg = err?.message || "Failed to send";
              toast.error(msg);
              reject(new Error(msg));
              return;
            }
            const cached = utils.channelMessage.list.getData(LIST_INPUT(input.channelId)) as
              | { items?: ChannelMessage[] }
              | undefined;
            let enriched = toCacheMessage(resp as ChannelMessage) as ChannelMessage;
            if (!enriched.parent && enriched.parentId && cached?.items?.length) {
              const p = cached.items!.find((m) => m.id === enriched.parentId);
              if (p) {
                enriched = toCacheMessage({
                  ...enriched,
                  parent: { id: p.id, content: p.content, userId: p.userId, user: p.user },
                }) as ChannelMessage;
              }
            }
            replaceTemp(enriched);
            resolve();
          }
        );
      });
    },
    [currentUserId, session?.user?.name, session?.user?.email, session?.user?.image, addMessageToCache, replaceTemp, waitForConnection, utils.channelMessage.list]
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

  const editMessage = useCallback(
    async (messageId: string, content: string, title?: string) => {
      const s = await waitForConnection();
      if (!s) throw new Error("Socket not connected");
      return await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Request timeout")), 10000);
        s.emit("channel:message:edit", { messageId, content, title }, (err: any, resp?: any) => {
          clearTimeout(timeout);
          if (err) {
            const msg = err?.message || "Failed to edit message";
            toast.error(msg);
            reject(new Error(msg));
            return;
          }
          resolve(resp);
        });
      });
    },
    [waitForConnection]
  );

  return { sendMessage, toggleReaction, editMessage };
}

/** One list query + optional socket subscription per channel. Prefer subscribe at list/view level only. */
export function useChannels(params: { channelId?: string; subscribe?: boolean }) {
  const { channelId, subscribe = true } = params;
  const { socket, isConnected } = useSocket();
  const utils = trpc.useUtils();
  const processed = useRef(new Set<string>());
  const actions = useChannelActions();

  const messages = trpc.channelMessage.list.useQuery(
    LIST_INPUT(channelId ?? ""),
    {
      enabled: Boolean(channelId),
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    }
  );

  useEffect(() => {
    if (!subscribe || !socket || !isConnected || !channelId) return;

    const releaseRoom = acquireChannelRoom(socket, channelId);

    const handleReceived = (data: ChannelMessage) => {
      if (!data?.id || data.channelId !== channelId) return;
      if (processed.current.has(data.id)) return;
      processed.current.add(data.id);
      setTimeout(() => processed.current.delete(data.id), 5000);
      const cached = utils.channelMessage.list.getData(LIST_INPUT(data.channelId)) as
        | { items?: ChannelMessage[] }
        | undefined;
      let enriched: ChannelMessage = toCacheMessage(data) as ChannelMessage;
      if (!data.parent && data.parentId && cached?.items?.length) {
        const p = cached.items!.find((m) => m.id === data.parentId);
        if (p) {
          enriched = toCacheMessage({
            ...data,
            parent: { id: p.id, content: p.content, userId: p.userId, user: p.user },
          }) as ChannelMessage;
        }
      }
      utils.channelMessage.list.setData(LIST_INPUT(data.channelId), ((old) => {
        const base = (old as { items: ChannelMessage[]; nextCursor: string | null } | undefined) ?? {
          items: [] as ChannelMessage[],
          nextCursor: null as string | null,
        };
        const exists = base.items.some((m) => m.id === enriched.id);
        let items = exists
          ? base.items.map((m) => (m.id === enriched.id ? toCacheMessage({ ...enriched, isPending: false }) : m))
          : [...base.items, enriched];
        // Cap in-memory growth from live updates
        if (items.length > MESSAGE_TAKE * 2) {
          items = items.slice(-MESSAGE_TAKE);
        }
        return { ...base, items } as typeof old;
      }) as any);
    };

    const handleReaction = (data: { messageId: string; reactions: JsonValue[] }) => {
      if (!data?.messageId) return;
      utils.channelMessage.list.setData(LIST_INPUT(channelId), ((old) => {
        const base = (old as { items: ChannelMessage[]; nextCursor: string | null } | undefined) ?? {
          items: [] as ChannelMessage[],
          nextCursor: null as string | null,
        };
        const items = base.items.map((m) =>
          m.id === data.messageId ? { ...m, reactions: data.reactions as JsonValue[] } : m
        );
        return { ...base, items } as typeof old;
      }) as any);
    };

    const handleEdited = (data: any) => {
      if (!data?.id) return;
      utils.channelMessage.list.setData(LIST_INPUT(data.channelId ?? channelId), ((old) => {
        const base = (old as { items: ChannelMessage[]; nextCursor: string | null } | undefined) ?? {
          items: [] as ChannelMessage[],
          nextCursor: null as string | null,
        };
        const items = base.items.map((m) =>
          m.id === data.id ? { ...m, content: data.content, title: data.title ?? m.title, isEdited: true } : m
        );
        return { ...base, items } as typeof old;
      }) as any);
    };

    const releaseListeners = acquireChannelEventListeners(socket, channelId, {
      onReceived: (data) => handleReceived(data as ChannelMessage),
      onReaction: (data) => handleReaction(data as { messageId: string; reactions: JsonValue[] }),
      onEdited: (data) => handleEdited(data),
    });

    return () => {
      releaseListeners();
      releaseRoom();
      processed.current.clear();
    };
  }, [subscribe, socket, isConnected, utils.channelMessage.list, channelId]);

  return {
    messages: messages.data?.items ?? [],
    isLoading: messages.isLoading,
    sendMessage: actions.sendMessage,
    toggleReaction: actions.toggleReaction,
    editMessage: actions.editMessage,
  };
}
