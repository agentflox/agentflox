'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMessages } from '@/entities/messages/hooks/useMessages';
import { MessageItem } from './MessageItem';
import { MessageComposer } from './MessageComposer';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  userId: string;
  open: boolean;
  onClose: () => void;
}

export default function MessageItemModal({ userId, open, onClose }: Props) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id || '';
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; senderId: string } | null>(null);
  const [showJump, setShowJump] = useState(false);
  const isNearBottomRef = useRef(true);
  const prevLengthRef = useRef(0);
  
  const queryKey = ['messages.listWithUser', { userId, page: 1, pageSize: 100 }] as const;

  const { markAsRead } = useMessages({ userId });

  // ✅ Fetch with optimized settings
  const { data, isLoading } = trpc.messages.listWithUser.useQuery(
    { userId, page: 1, pageSize: 100 },
    {
      enabled: open && !!userId,
      staleTime: Infinity, // Never auto-refetch
      gcTime: 300000,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    }
  );

  // ✅ INSTANT: Subscribe to cache changes
  const messages = useMemo(() => {
    const cached = queryClient.getQueryData(queryKey) as any;
    return (cached?.items || data?.items || []) as any[];
  }, [queryClient.getQueryState(queryKey)?.dataUpdatedAt, data]); // Re-run on cache update

  // ✅ Mark as read instantly
  useEffect(() => {
    if (open && userId) {
      markAsRead(userId);
    }
  }, [open, userId, markAsRead]);

  // ✅ INSTANT scroll on new messages
  useEffect(() => {
    if (!open || messages.length === 0) return;

    const hasNewMessage = messages.length > prevLengthRef.current;
    
    if (hasNewMessage && isNearBottomRef.current) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' });
      });
    }
    
    prevLengthRef.current = messages.length;
  }, [messages.length, open]);

  // ✅ Initial scroll
  useEffect(() => {
    if (open && messages.length > 0) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' });
        isNearBottomRef.current = true;
      }, 0);
    }
  }, [open]);

  // ✅ Track scroll position
  const handleScroll = useMemo(() => {
    let timeout: NodeJS.Timeout;
    return () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        
        const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 80;
        isNearBottomRef.current = nearBottom;
        setShowJump(!nearBottom);
      }, 100);
    };
  }, []);

  const handleReply = (message: { id: string; content: string; senderId: string }) => {
    setReplyingTo(message);
  };

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      isNearBottomRef.current = true;
      setShowJump(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Messages</DialogTitle>
        </DialogHeader>

        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto px-2 py-3"
          onScroll={handleScroll}
        >
          {isLoading && messages.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <>
              {messages.map((m: any) => (
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
                    replyTo: m.replyTo,
                  }}
                  currentUserId={currentUserId}
                  onReply={handleReply}
                />
              ))}
              <div ref={bottomRef} className="h-1" />
            </>
          )}
          
          {showJump && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="fixed bottom-24 right-6 h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center z-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        <div className="px-4 pb-4 pt-3 border-t bg-gray-50/50 dark:bg-gray-900/50">
          <MessageComposer
            toUserId={userId}
            replyTo={replyingTo ?? undefined}
            onCancelReply={() => setReplyingTo(null)}
            onSent={scrollToBottom}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
