'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { trpc } from '@/lib/trpc';
import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useMessages } from '@/entities/messages/hooks/useMessages';
import { ConversationItem } from './ConversationItem';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUser: (userId: string) => void;
}

export default function MessageListModal({ open, onOpenChange, onSelectUser }: Props) {
    // ✅ Get live conversations from useMessages hook
    const { conversations: liveConversations } = useMessages();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [page, setPage] = useState(1);
    const [items, setItems] = useState<any[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const { data, isLoading, isFetching } = trpc.messages.listConversations.useQuery(
      { page, pageSize: 50 },
      {
        staleTime: 30000,
        gcTime: 300000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      }
    );

    // Accumulate pages locally for a smooth infinite scroll
    useEffect(() => {
      const pageItems = data?.items ?? [];
      if (page === 1) {
        setItems(pageItems);
      } else if (pageItems.length) {
        setItems(prev => {
          const existing = new Set(prev.map((it: any) => String(it.user_id ?? it.id)));
          const merged = [...prev, ...pageItems.filter((it: any) => !existing.has(String(it.user_id ?? it.id)))];
          return merged;
        });
      }
      setHasMore(pageItems.length === 50);
    }, [data?.items, page]);
  
    // ✅ Merge live conversations with paginated items to ensure real-time updates
    const conversations = useMemo(() => {
      // Create a map of live conversations for quick lookup
      const liveMap = new Map(
        liveConversations.map((conv: any) => [
          String(conv.user_id ?? conv.id), 
          conv
        ])
      );

      // Merge: prioritize live data, fall back to paginated items
      const merged = items.map((it: any) => {
        const userId = String(it.user_id ?? it.id);
        const live = liveMap.get(userId);
        
        // If we have live data for this conversation, use it
        if (live) {
          return {
            id: userId,
            name: live.name || live.username || 'Unknown User',
            avatar: live.avatar,
            unread: Number(live.unread || 0),
            lastMessage: live.lastMessage,
            lastMessageAt: live.lastMessageAt,
          };
        }
        
        // Otherwise use paginated data
        return {
          id: userId,
          name: it.name || it.username || 'Unknown User',
          avatar: it.avatar,
          unread: Number(it.unread || 0),
          lastMessage: it.lastMessage,
          lastMessageAt: it.lastMessageAt,
        };
      });

      // Add any new conversations from live data that aren't in paginated results yet
      liveConversations.forEach((live: any) => {
        const userId = String(live.user_id ?? live.id);
        if (!merged.some(c => c.id === userId)) {
          merged.unshift({
            id: userId,
            name: live.name || live.username || 'Unknown User',
            avatar: live.avatar,
            unread: Number(live.unread || 0),
            lastMessage: live.lastMessage,
            lastMessageAt: live.lastMessageAt,
          });
        }
      });

      // Sort by most recent message
      return merged.sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
      });
    }, [items, liveConversations]);
  
    const handleSelectUser = useCallback((userId: string) => {
      onSelectUser(userId);
      onOpenChange(false);
    }, [onSelectUser, onOpenChange]);

    const handleScroll = useCallback(() => {
      const el = scrollRef.current;
      if (!el || isFetching || isLoadingMore || !hasMore) return;
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 80;
      if (nearBottom) {
        setIsLoadingMore(true);
        setPage(p => p + 1);
        setTimeout(() => setIsLoadingMore(false), 200);
      }
    }, [isFetching, isLoadingMore, hasMore]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Messages</DialogTitle>
        </DialogHeader>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="max-h-[60vh] overflow-y-auto px-1 pb-2"
        >
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : conversations.length > 0 ? (
            conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                onSelect={handleSelectUser}
                isActive={false}
              />
            ))
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No conversations yet.
            </div>
          )}
          {hasMore && (
            <div className="flex items-center justify-center py-3">
              <button
                type="button"
                onClick={() => setPage(p => p + 1)}
                className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md hover:shadow-lg transition-all hover:scale-105 flex items-center justify-center"
                title="Load more"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
