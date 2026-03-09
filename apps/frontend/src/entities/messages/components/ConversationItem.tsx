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
      // **Sleek & Professional Styling:**
      // Increased padding (p-4), rounded corners (rounded-lg),
      // subtle background for hover (hover:bg-accent/50),
      // distinct background for active state (bg-primary/10),
      // smooth transition (duration-150)
      className={`
        flex w-full items-center gap-4 p-4 text-left transition-all duration-150
        rounded-xl
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
        ${isActive 
          ? 'bg-primary/10 text-primary hover:bg-primary/15' 
          : 'hover:bg-muted/60'
        }
      `}
    >
      {/* 1. Avatar - Consistent and slightly larger (h-12 w-12) */}
      <Avatar className="h-12 w-12 shrink-0 border-2 border-transparent group-hover:border-primary/20 transition-colors">
        <AvatarImage src={conversation.avatar || undefined} alt={conversation.name} />
        <AvatarFallback className={conversation.isGroup ? 'bg-indigo-500/80 text-white' : ''}>
          {(conversation.name || 'U').slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      {/* 2. Content Area - Optimized flex layout */}
      <div className="min-w-0 flex-1 overflow-hidden">
        {/* Top Row: Name and Timestamp */}
        <div className="flex items-center justify-between gap-2">
          {/* Name: Stronger font-weight (font-semibold) for clarity */}
          <div className={`truncate text-base font-semibold ${isActive ? 'text-primary' : 'text-foreground'}`}>
            {conversation.name}
          </div>
          {/* Timestamp: Subtle and aligned to the right, only visible when unread count is zero for cleaner look */}
          {!showUnread && formattedTimestamp && (
            <div className="text-xs text-muted-foreground/80 shrink-0">
              {formattedTimestamp}
            </div>
          )}
        </div>
        
        {/* Bottom Row: Last Message and Unread/Mute Indicator */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          {/* Last Message: Subtler text color, italic if no message */}
          <div className={`truncate text-sm ${showUnread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
            {conversation.lastMessage || (conversation.isGroup ? 'No messages yet' : 'Start a conversation...')}
          </div>
          
          {/* Unread/Mute Indicator: Right-aligned block */}
          <div className="shrink-0 flex items-center gap-1">
            {/* Mute Icon (if applicable, using a placeholder for an icon) */}
            {conversation.isMuted && (
                <span className="text-muted-foreground/50 h-3 w-3 inline-flex items-center justify-center" title="Muted">
                    {/* [Icon of a muted speaker] */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" x2="17" y1="11" y2="17"></line><line x1="17" x2="23" y1="11" y2="17"></line></svg>
                </span>
            )}

            {/* Unread Badge: Minimalist and visually impactful (dot/badge) */}
            {showUnread && (
              <Badge 
                variant="default" 
                className={`
                  h-6 min-w-[24px] rounded-full px-2 py-0
                  ${isActive ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground'}
                  font-bold text-xs
                `}
              >
                {unreadCount}
              </Badge>
            )}
            
            {/* A simple unread dot for maximum sleekness (alternative to the badge) */}
            {/* {showUnread && (
              <span className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-primary' : 'bg-red-500'} shrink-0`} />
            )} */}
          </div>
        </div>
      </div>
    </button>
  );
});

ConversationItem.displayName = 'ConversationItem';
