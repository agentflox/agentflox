'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { memo, useCallback } from 'react';

// Define a proper type for conversation data for better type-safety and clarity
interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  unread: number;
  lastMessage?: string;
  lastMessageTimestamp?: string; // Added for professional touch
  isMuted?: boolean; // Added for professional feature
  isGroup?: boolean; // Added for better visual distinction
}

interface ConversationItemProps {
  conversation: Conversation;
  onSelect: (id: string) => void;
  isActive: boolean; // Prop to indicate if this item is currently selected
}

export const ConversationItem = memo(({ 
  conversation, 
  onSelect, 
  isActive 
}: ConversationItemProps) => {
  const handleClick = useCallback(() => {
    onSelect(conversation.id);
  }, [conversation.id, onSelect]);

  // Determine the appearance of the unread badge
  const unreadCount = conversation.unread > 99 ? '99+' : conversation.unread;
  const showUnread = conversation.unread > 0;
  
  // Use a custom style for the timestamp (if available)
  const formattedTimestamp = conversation.lastMessageTimestamp 
    ? new Date(conversation.lastMessageTimestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) 
    : '';

  return (
    <button
      onClick={handleClick}
      className={`
        group relative flex w-full items-center gap-4 p-4 text-left transition-all duration-300 ease-out
        rounded-2xl
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50
        ${isActive 
          ? 'bg-indigo-50/80 shadow-sm ring-1 ring-indigo-100/50 dark:bg-indigo-500/10 dark:ring-indigo-500/20 text-indigo-950 dark:text-indigo-100' 
          : 'hover:bg-zinc-50 dark:hover:bg-white/5 active:scale-[0.98]'
        }
      `}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
      )}

      {/* 1. Avatar */}
      <Avatar className={`h-12 w-12 shrink-0 transition-all duration-300 group-hover:scale-105 ${isActive ? 'shadow-md ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-zinc-950' : 'shadow-sm ring-1 ring-black/5 dark:ring-white/10'}`}>
        <AvatarImage src={conversation.avatar || undefined} alt={conversation.name} className="object-cover" />
        <AvatarFallback className={`bg-gradient-to-br ${conversation.isGroup ? 'from-purple-500 to-indigo-600' : 'from-indigo-500 to-purple-600'} text-sm font-bold text-white tracking-wider`}>
          {(conversation.name || 'U').slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      {/* 2. Content Area - Optimized flex layout */}
      <div className="min-w-0 flex-1 overflow-hidden">
        {/* Top Row: Name and Timestamp */}
        <div className="flex items-center justify-between gap-2">
          {/* Name: Stronger font-weight (font-semibold) for clarity */}
          <div className={`truncate text-[15px] font-bold tracking-tight ${isActive ? 'text-indigo-950 dark:text-indigo-100' : 'text-zinc-900 dark:text-zinc-100'}`}>
            {conversation.name}
          </div>
          {/* Timestamp: Subtle and aligned to the right, only visible when unread count is zero for cleaner look */}
          {!showUnread && formattedTimestamp && (
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 shrink-0">
              {formattedTimestamp}
            </div>
          )}
        </div>
        
        {/* Bottom Row: Last Message and Unread/Mute Indicator */}
        <div className="flex items-center justify-between gap-2 mt-1">
          {/* Last Message: Subtler text color, italic if no message */}
          <div className={`truncate text-[13px] ${showUnread ? 'font-medium text-zinc-900 dark:text-zinc-200' : 'text-zinc-500 dark:text-zinc-400'}`}>
            {conversation.lastMessage || (conversation.isGroup ? 'No messages yet' : 'Start a conversation...')}
          </div>
          
          {/* Unread/Mute Indicator: Right-aligned block */}
          <div className="shrink-0 flex items-center gap-1.5">
            {/* Mute Icon */}
            {conversation.isMuted && (
                <span className="text-zinc-400 dark:text-zinc-500 h-3 w-3 inline-flex items-center justify-center" title="Muted">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" x2="17" y1="11" y2="17"></line><line x1="17" x2="23" y1="11" y2="17"></line></svg>
                </span>
            )}

            {/* Unread Badge */}
            {showUnread && (
              <Badge 
                variant="default" 
                className={`
                  h-5 min-w-[20px] rounded-full px-1.5 py-0 flex items-center justify-center
                  ${isActive ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-white dark:ring-zinc-950' : 'bg-indigo-500 text-white shadow-sm'}
                  font-bold text-[10px] tracking-tight
                `}
              >
                {unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
});

ConversationItem.displayName = 'ConversationItem';
