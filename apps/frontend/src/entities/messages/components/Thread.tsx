'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Store, MessageCircle, ChevronsDown, PanelRight, MoreHorizontal, Pin, PinOff, Archive, VolumeX, EyeOff, Ban, Trash2, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Button from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/useToast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMessages } from '@/entities/messages/hooks/useMessages';
import { MessageItem } from '@/entities/messages/components/MessageItem';
import { MessageComposer } from '@/entities/messages/components/MessageComposer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const MessageSkeletonList = () => (
  <div className="flex flex-col space-y-8 p-2 overflow-hidden w-full max-w-full">
    {[
      { isSender: false, lines: [100, 80], width: 'max-w-[85%] sm:max-w-[70%]' },
      { isSender: false, lines: [100], width: 'max-w-[60%] sm:max-w-[45%]' },
      { isSender: true, lines: [100, 90, 70], width: 'max-w-[85%] sm:max-w-[75%]' },
      { isSender: false, lines: [100, 60], width: 'max-w-[75%] sm:max-w-[60%]' },
      { isSender: true, lines: [100], width: 'max-w-[55%] sm:max-w-[40%]' },
    ].map((msg, i) => (
      <div key={i} className={`flex w-full ${msg.isSender ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-700`} style={{ animationDelay: `${i * 120}ms`, animationFillMode: 'both' }}>
        {!msg.isSender && (
          <div className="mr-3 flex-shrink-0 mt-1">
            <div className="h-9 w-9 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          </div>
        )}
        <div className={`flex flex-col gap-2 ${msg.isSender ? 'items-end' : 'items-start'} w-full ${msg.width}`}>
          <div className="flex items-center gap-2 px-1">
            {!msg.isSender && <div className="h-3 w-28 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />}
            <div className="h-3 w-12 rounded-full bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
          </div>
          <div 
            className={`w-full rounded-2xl p-4 flex flex-col gap-3 animate-pulse border shadow-sm ${
              msg.isSender 
                ? 'rounded-tr-sm bg-indigo-50/80 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20' 
                : 'rounded-tl-sm bg-white dark:bg-zinc-800/40 border-zinc-100 dark:border-zinc-700/50'
            }`}
          >
            {msg.lines.map((lineWidth, lineIdx) => (
              <div 
                key={lineIdx} 
                className={`h-2.5 rounded-full ${
                  msg.isSender 
                    ? 'bg-indigo-200/80 dark:bg-indigo-400/30' 
                    : 'bg-zinc-200 dark:bg-zinc-700/60'
                }`}
                style={{ width: `${lineWidth}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    ))}
  </div>
);

export function Thread({
  conversationId,
  userId,
  peerName,
  marketplaceListingId,
  marketplaceListingTitle,
  peerAvatar,
  onToggleSidebar,
  isSidebarOpen,
  conversation,
}: {
  conversationId: string;
  userId: string;
  peerName: string | null;
  marketplaceListingId: string | null;
  marketplaceListingTitle: string | null;
  peerAvatar: string | null;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  conversation?: any;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id || '';
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isNew = searchParams.get('isNew') === 'true';
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const prevLengthRef = useRef(0);
  const [, forceUpdate] = useState({});
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; senderId: string } | null>(null);
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(false);
  
  const messageAction = trpc.messages.messageAction.useMutation({
    onSuccess: () => {
      utils.messages.listWithUser.invalidate();
      utils.messages.listByConversationId.invalidate();
    }
  });

  const handleUnpin = (e: React.MouseEvent, messageId: string) => {
    e.stopPropagation();
    messageAction.mutate({ messageId, action: 'unpin' });
  };
  // ✅ Define query key using conversationId
  const queryKey = ['messages.listByConversationId', { conversationId, page: 1, pageSize: 100 }] as const;

  const convAction = trpc.messages.conversationAction.useMutation({
    onError: (err) => toast({ title: 'Action failed', description: err.message, variant: 'destructive' }),
    onSuccess: () => utils.messages.listConversations.invalidate(),
  });

  const handleConvAction = (action: 'pin' | 'archive' | 'mute' | 'hide_status' | 'delete' | 'block', currentValue: boolean) => {
    convAction.mutate({ conversationId, action, value: !currentValue });
  };

  // ✅ Initialize socket listeners
  const { markAsRead } = useMessages({ userId, conversationId, marketplaceListingId, fetchConversations: false });

  // ✅ Fetch messages initially
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<any[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [showJump, setShowJump] = useState(false);

  const { data, isLoading, isFetching } = trpc.messages.listByConversationId.useQuery(
    { conversationId, page, pageSize: 100 },
    {
      enabled: !!conversationId,
      staleTime: Infinity,
      gcTime: Infinity,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );

  // Subscribe to cache changes
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.type === 'updated' && 
          event?.query?.queryKey?.[0] === 'messages.listByConversationId' &&
          event?.query?.queryKey?.[1]?.conversationId === conversationId) {
        forceUpdate({});
      }
    });
    return () => unsubscribe();
  }, [queryClient, conversationId]);

  useEffect(() => {
    const pageItems = (data?.items || []).slice();
    if (page === 1) {
      setItems(pageItems);
    } else if (pageItems.length) {
      const el = scrollContainerRef.current;
      const previousScrollHeight = el?.scrollHeight || 0;
      
      setItems((prev) => {
        const existing = new Set(prev.map((m: any) => String(m.id)));
        return [...pageItems.filter((m: any) => !existing.has(String(m.id))), ...prev];
      });

      requestAnimationFrame(() => {
        if (el) {
          const newScrollHeight = el.scrollHeight;
          el.scrollTop = el.scrollTop + (newScrollHeight - previousScrollHeight);
        }
      });
    }
  }, [data?.items, page]);

  const cachedData = queryClient.getQueryData(queryKey) as any;
  const messages = useMemo(() => {
    return (cachedData?.items || items || []) as any[];
  }, [cachedData?.items, items]);

  const pinnedMessages = useMemo(() => {
    return messages.filter((m: any) => m.is_pinned ?? m.isPinned);
  }, [messages]);

  useEffect(() => {
    if (userId) {
      const timer = setTimeout(() => markAsRead(userId), 500);
      return () => clearTimeout(timer);
    }
  }, [userId, markAsRead]);

  useEffect(() => {
    if (messages.length === 0) return;
    const currentLength = messages.length;
    if (currentLength > prevLengthRef.current) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
    prevLengthRef.current = currentLength;
  }, [messages.length]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' });
      }, 150);
    }
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
        {isNew ? (
          <div className="flex flex-1 flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[15px] text-zinc-900 dark:text-zinc-100">New message</span>
              <button onClick={() => router.replace(`/dashboard/messages/${conversationId}`)} className="p-1 rounded-full text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">To:</span>
              <div className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-md text-sm font-medium">
                {peerName}
                <button onClick={() => router.replace(`/dashboard/messages/${conversationId}`)} className="hover:bg-indigo-200 dark:hover:bg-indigo-500/40 rounded-full p-0.5 transition-colors cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ) : marketplaceListingTitle ? (
          <>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-violet-200/80 bg-violet-50 dark:border-violet-800/60 dark:bg-violet-950/40">
              <Store className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{marketplaceListingTitle}</div>
              {peerName ? (
                <div className="truncate text-xs text-muted-foreground">with {peerName}</div>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={peerAvatar || undefined} />
              <AvatarFallback>{(peerName || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="truncate flex-1 text-sm font-semibold">{peerName || "Conversation"}</div>
          </>
        )}

        {/* Right side actions - only show if not new message */}
        {!isNew && (
          <div className="ml-auto flex items-center gap-1 shrink-0">
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => handleConvAction('pin', conversation?.isPinned || false)}
              >
                <Pin className="h-4 w-4 text-zinc-500" /> {conversation?.isPinned ? 'Unpin' : 'Pin'}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => handleConvAction('archive', conversation?.isArchived || false)}
              >
                <Archive className="h-4 w-4 text-zinc-500" /> {conversation?.isArchived ? 'Unarchive' : 'Archive'}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => handleConvAction('mute', conversation?.isMuted || false)}
              >
                <VolumeX className="h-4 w-4 text-zinc-500" /> {conversation?.isMuted ? 'Unmute notifications' : 'Turn off notification'}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => handleConvAction('hide_status', conversation?.isHiddenStatus || false)}
              >
                <EyeOff className="h-4 w-4 text-zinc-500" /> {conversation?.isHiddenStatus ? 'Show message status' : 'Hide message status'}
              </DropdownMenuItem>
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
              <DropdownMenuItem className="gap-2 cursor-pointer text-red-600 dark:text-red-400" onClick={() => setShowBlockModal(true)}>
                <Ban className="h-4 w-4" /> Block
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer text-red-600 dark:text-red-400" onClick={() => setShowDeleteModal(true)}>
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors cursor-pointer ${
                isSidebarOpen
                  ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'
                  : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
              title={isSidebarOpen ? 'Hide listing details' : 'Show listing details'}
            >
              <PanelRight className="h-4 w-4" />
            </button>
          )}
        </div>
        )}
      </div>
      <div className="relative flex flex-1 flex-col min-h-0 bg-white dark:bg-[#111]">
        {/* Floating Pinned Messages Banner */}
        {pinnedMessages.length > 0 && (
          <div className="absolute top-0 left-0 right-0 z-20 px-4 py-2">
            <div className="flex flex-col w-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm rounded-2xl overflow-hidden transition-all duration-300">
              {/* Header / Collapsed View */}
              <div 
                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
                onClick={() => setIsPinnedExpanded(!isPinnedExpanded)}
              >
                <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <Pin className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    Pinned Messages
                    <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {pinnedMessages.length}
                    </span>
                  </div>
                  {!isPinnedExpanded && (
                    <div className="text-[12px] text-zinc-500 dark:text-zinc-400 truncate">
                      {pinnedMessages[pinnedMessages.length - 1].content}
                    </div>
                  )}
                </div>
                <ChevronsDown className={`h-4 w-4 text-zinc-400 transition-transform duration-300 ${isPinnedExpanded ? 'rotate-180' : ''}`} />
              </div>

              {/* Expanded View */}
              {isPinnedExpanded && (
                <div className="border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <div className="max-h-[240px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
                    {pinnedMessages.map((pm: any) => (
                      <div key={pm.id} className="group relative p-4 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Avatar className="h-5 w-5 shrink-0">
                            <AvatarImage src={pm.sender?.avatar || undefined} />
                            <AvatarFallback className="text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                              {(pm.sender?.name || "U").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300">{pm.sender?.name || "User"}</span>
                          <span className="text-[10px] text-zinc-400 ml-auto">
                            {new Date(pm.created_at || pm.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-[13px] text-zinc-600 dark:text-zinc-400 line-clamp-3 pr-8">
                          {pm.content}
                        </div>
                        {/* Unpin button appears on hover */}
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => handleUnpin(e, pm.id)}
                            className="bg-white dark:bg-zinc-800 shadow-md border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 h-8 px-2.5 rounded-md text-[11px] font-semibold tracking-wide uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <PinOff className="h-3.5 w-3.5" />
                            Unpin
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div
          ref={scrollContainerRef}
          className={`flex-1 flex flex-col space-y-2 overflow-y-auto p-4 ${pinnedMessages.length > 0 ? 'pt-[76px]' : ''}`}
          onScroll={() => {
            const el = scrollContainerRef.current;
            if (!el) return;
            const hasMore = (data?.total || 0) > items.length;
            if (el.scrollTop < 60 && !isFetching && hasMore) setPage((p) => p + 1);
            const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 80;
            setShowJump(!nearBottom && messages.length > 0);
          }}
        >
          {isLoading ? (
            <MessageSkeletonList />
          ) : messages.length > 0 ? (
            <>
              {messages.map((m: any) => (
                <MessageItem
                  key={m.clientId || m.id}
                  message={{
                    id: m.id,
                    senderId: m.sender_id || m.senderId,
                    receiverId: m.receiver_id || m.receiverId,
                    content: m.content,
                    attachments: m.attachments,
                    createdAt: m.created_at || m.createdAt,
                    isRead: m.is_read ?? m.isRead,
                    isPending: m.isPending,
                    isPinned: m.is_pinned ?? m.isPinned,
                    sender: m.sender ? { id: m.sender.id, name: m.sender.name, avatar: m.sender.avatar } : undefined,
                    replyTo: m.replyTo ? {
                      id: m.replyTo.id,
                      content: m.replyTo.content,
                      senderId: m.replyTo.senderId,
                      senderName: m.replyTo.sender?.name || m.replyTo.sender?.username,
                    } : (m.reply_to ? {
                      id: m.reply_to.id,
                      content: m.reply_to.content,
                      senderId: m.reply_to.sender_id || m.reply_to.senderId,
                      senderName: m.reply_to.sender?.name || m.reply_to.sender?.username,
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
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
              <div className="rounded-full bg-muted/80 p-5 ring-1 ring-border/60">
                <MessageCircle className="h-10 w-10 text-muted-foreground" aria-hidden />
              </div>
              <div className="max-w-sm space-y-1.5">
                <p className="text-sm font-semibold text-foreground">No messages yet</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This conversation is empty. Send a message below to get started.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {showJump && (
          <button
            type="button"
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="absolute bottom-4 right-6 h-8 w-8 z-50 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-md hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all flex items-center justify-center cursor-pointer animate-in fade-in zoom-in-95 duration-200"
            title="Jump to latest"
          >
            <ChevronsDown className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="border-t p-3">
        <MessageComposer
          toUserId={userId}
          conversationId={conversationId}
          marketplaceListingId={marketplaceListingId || undefined}
          replyTo={replyingTo ?? undefined}
          onCancelReply={() => setReplyingTo(null)}
          onSent={() => {
            setReplyingTo(null);
            if (isNew) {
              router.replace(`/dashboard/messages/${conversationId}`);
            }
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          }}
        />
      </div>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This will hide it from your messages list. You can still access the messages if the other person replies.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                handleConvAction('delete', false);
                setShowDeleteModal(false);
                router.replace('/dashboard/messages');
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBlockModal} onOpenChange={setShowBlockModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block {peerName}?</DialogTitle>
            <DialogDescription>
              They will not be able to send you messages. This conversation will be hidden from your inbox. You can unblock them later in settings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowBlockModal(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                handleConvAction('block', false);
                setShowBlockModal(false);
                router.replace('/dashboard/messages');
              }}
            >
              Block User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
