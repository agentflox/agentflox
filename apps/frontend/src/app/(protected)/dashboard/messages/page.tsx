"use client";
import Shell from "@/components/layout/Shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useMemo, useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAppDispatch, useAppSelector } from "@/hooks/useReduxStore";
import { selectUser } from "@/stores/slices/messages.slice";
import { useMessages } from "@/entities/messages/hooks/useMessages";
import { MessageItem } from "@/entities/messages/components/MessageItem";
import { MessageComposer } from "@/entities/messages/components/MessageComposer";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";

export default function MessagesPage() {
  useMessages();
  const dispatch = useAppDispatch();
  const selectedUserId = useAppSelector((s) => s.messagesUI.selectedUserId);
  const [query, setQuery] = useState("");
  const { data, isLoading } = trpc.messages.listConversations.useQuery({ page: 1, pageSize: 50 });

  const conversations = useMemo(() => {
    const items = (data?.items || []).map((it: any) => ({
      id: it.user_id as string,
      name: it.name || it.username,
      avatar: it.avatar as string | null,
      unread: Number(it.unread || 0),
      lastAt: it.last_at,
    }));
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter((i: any) => (i.name || "").toLowerCase().includes(q));
  }, [data, query]);

  return (
    <Shell>
      <div className="grid h-[calc(100vh-10rem)] grid-cols-1 gap-4 md:grid-cols-[20rem_1fr]">
        <div className="flex min-h-0 flex-col rounded-md border">
          <div className="border-b p-3">
            <Input placeholder="Search messages" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading...</div>
            ) : conversations.length ? (
              conversations.map((c: any) => (
                <button key={c.id} onClick={() => dispatch(selectUser(c.id))} className="flex w-full items-center gap-3 border-b p-3 text-left hover:bg-muted">
                  <Avatar>
                    <AvatarImage src={c.avatar || undefined} />
                    <AvatarFallback>{(c.name || "U").slice(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.name}</div>
                    {c.unread > 0 && <div className="text-xs text-primary">{c.unread} unread</div>}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-sm text-muted-foreground">No conversations yet.</div>
            )}
          </div>
        </div>

        <div className="min-h-0 rounded-md border">
          {selectedUserId ? (
            <Thread userId={selectedUserId} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Select a conversation to view messages</div>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Thread({ userId }: { userId: string }) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id || '';
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const prevLengthRef = useRef(0);
  const [, forceUpdate] = useState({});
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; senderId: string } | null>(null);
  
  // ✅ Define query key
  const queryKey = ['messages.listWithUser', { userId, page: 1, pageSize: 100 }] as const;

  // ✅ Initialize socket listeners
  const { markAsRead } = useMessages({ userId });

  // ✅ Fetch messages initially
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<any[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [showJump, setShowJump] = useState(false);

  const { data, isLoading, isFetching } = trpc.messages.listWithUser.useQuery(
    { userId, page, pageSize: 100 },
    {
      enabled: !!userId,
      staleTime: 30000,
      gcTime: 300000,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );

  // 🔥 CRITICAL: Subscribe to cache changes and force re-render
  useEffect(() => {
    console.log('👂 Subscribing to cache changes for user:', userId);

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.type === 'updated' && 
          event?.query?.queryKey?.[0] === 'messages.listWithUser' &&
          event?.query?.queryKey?.[1]?.userId === userId) {
        
        const newData = event.query.state.data as any;
        console.log('🔥 Cache changed! New message count:', newData?.items?.length);
        
        forceUpdate({});
      }
    });

    return () => {
      console.log('👋 Unsubscribing from cache changes');
      unsubscribe();
    };
  }, [queryClient, userId]);

  // ✅ Accumulate pages in-memory
  useEffect(() => {
    const pageItems = (data?.items || []).slice();
    if (page === 1) {
      setItems(pageItems);
    } else if (pageItems.length) {
      setItems((prev) => {
        const existing = new Set(prev.map((m: any) => String(m.id)));
        return [...pageItems.filter((m: any) => !existing.has(String(m.id))), ...prev];
      });
    }
  }, [data?.items, page]);

  // ✅ Get messages from cache with fallback to accumulated
  const cachedData = queryClient.getQueryData(queryKey) as any;
  const messages = useMemo(() => {
    return (cachedData?.items || items || []) as any[];
  }, [cachedData?.items, items]);

  console.log('🎨 Rendering with', messages.length, 'messages');

  // ✅ Mark as read when modal opens
  useEffect(() => {
    if (userId) {
      const timer = setTimeout(() => {
        markAsRead(userId);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [userId, markAsRead]);

  // ✅ Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length === 0) return;

    const currentLength = messages.length;
    if (currentLength > prevLengthRef.current) {
      console.log('📜 New message, scrolling...', { prev: prevLengthRef.current, current: currentLength });
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
    prevLengthRef.current = currentLength;
  }, [messages.length]);

  // ✅ Initial scroll when modal opens
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' });
      }, 150);
    }
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4 relative"
        onScroll={() => {
          const el = scrollContainerRef.current;
          if (!el) return;
          if (el.scrollTop < 60 && !isFetching) setPage((p) => p + 1);
          const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 80;
          setShowJump(!nearBottom);
        }}
      >
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (items || []).length ? (
          <>
            {(items || []).map((m: any) => (
              <MessageItem
                key={m.id}
                message={{
                  id: m.id,
                  senderId: m.sender_id || m.senderId,
                  receiverId: m.receiver_id || m.receiverId,
                  content: m.content,
                  attachments: m.attachments,
                  createdAt: m.created_at || m.createdAt,
                  isRead: m.is_read ?? m.isRead,
                  isPending: m.isPending,
                  replyTo: m.replyTo || (m.reply_to ? {
                    id: m.reply_to.id,
                    content: m.reply_to.content,
                    senderId: m.reply_to.sender_id || m.reply_to.senderId,
                  } : undefined),
                  reactions: m.reactions,
                } as any}
                currentUserId={currentUserId}
                onReply={(message) => setReplyingTo(message)}
              />
            ))}
            <div ref={bottomRef} />
          </>
        ) : (
          <div className="text-center text-sm text-muted-foreground">No messages yet. Say hello!</div>
        )}
      </div>
      {showJump && (
        <button
          type="button"
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-24 right-6 h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
          title="Jump to latest"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
      <div className="border-t p-3">
        <MessageComposer
          toUserId={userId}
          replyTo={replyingTo ?? undefined}
          onCancelReply={() => setReplyingTo(null)}
          onSent={() => {
            setReplyingTo(null);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          }}
        />
      </div>
    </div>
  );
}


