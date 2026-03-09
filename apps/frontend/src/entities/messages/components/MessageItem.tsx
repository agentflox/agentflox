'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Copy, Trash2, Reply, MoreVertical, Smile, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { trpc } from '@/lib/trpc';
import { useSession } from 'next-auth/react';
import { MessageContent } from './MessageContent';
import { MessageReplyTo } from './MessageReplyTo';
import { useMessages } from '../hooks/useMessages';
import { useToast } from '@/hooks/useToast';

interface MessageItemProps {
  message: {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    attachments?: string[];
    createdAt: Date | string;
    isRead?: boolean;
    isPending?: boolean;
    replyTo?: {
      id: string;
      content: string;
      senderId: string;
      senderName?: string;
    };
  };
  currentUserId: string;
  onReply?: (message: { id: string; content: string; senderId: string }) => void;
}

export function MessageItem({ message, currentUserId, onReply }: MessageItemProps) {
  const [showActions, setShowActions] = useState(false);
  // Reactions now come from server via message.reactions
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const hasMarkedRead = useRef(false);
  const { toast } = useToast();
  const { data: session } = useSession();
  const { markAsRead, toggleReaction } = useMessages({
    userId: message.senderId === currentUserId ? message.receiverId : message.senderId,
  });

  const utils = trpc.useUtils();
  const deleteMessage = trpc.messages.delete.useMutation({
    onMutate: async ({ messageId }) => {
      const otherUserId = message.senderId === currentUserId ? message.receiverId : message.senderId;
      await utils.messages.listWithUser.cancel({ userId: otherUserId });
      const previous = utils.messages.listWithUser.getData({ userId: otherUserId });
      if (previous) {
        if (Array.isArray(previous)) {
          utils.messages.listWithUser.setData(
            { userId: otherUserId },
            () => (previous as any[]).filter((m: any) => m.id !== messageId) as any,
          );
        } else if (previous && Array.isArray((previous as any).items)) {
          const next = {
            ...(previous as any),
            items: (previous as any).items.filter((m: any) => m.id !== messageId),
          };
          utils.messages.listWithUser.setData({ userId: otherUserId }, next as any);
        }
      }
      return { previous, otherUserId };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        utils.messages.listWithUser.setData({ userId: context.otherUserId }, context.previous as any);
      }
      toast({ title: 'Failed to delete message', description: error.message, variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ title: 'Message deleted', variant: 'default' });
      utils.messages.listWithUser.invalidate({
        userId: message.senderId === currentUserId ? message.receiverId : message.senderId,
      });
      utils.messages.listConversations.invalidate();
    },
  });

  const isOwnMessage = message.senderId === currentUserId;
  const isUnread = !message.isRead && !isOwnMessage;

  useEffect(() => {
    if (isUnread && itemRef.current && !hasMarkedRead.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && !hasMarkedRead.current) {
            hasMarkedRead.current = true;
            markAsRead(message.senderId);
          }
        },
        { threshold: 0.5 },
      );
      observer.observe(itemRef.current);
      return () => observer.disconnect();
    }
  }, [isUnread, message.senderId, markAsRead]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast({ title: 'Copied to clipboard', variant: 'default' });
    setShowMoreMenu(false);
    setShowActions(false);
  };

  const handleDelete = () => {
    setConfirmOpen(true);
    setShowMoreMenu(false);
    setShowActions(false);
  };

  const confirmDelete = () => {
    deleteMessage.mutate({ messageId: message.id });
    setConfirmOpen(false);
  };

  const handleReply = () => {
    const payload = { id: message.id, content: message.content, senderId: message.senderId };
    onReply?.(payload);
    const otherUserId = message.senderId === currentUserId ? message.receiverId : message.senderId;
    window.dispatchEvent(new CustomEvent('messages:reply', { detail: { userId: otherUserId, message: payload } }));
    setShowMoreMenu(false);
    setShowActions(false);
  };

  const handleQuickReaction = (emoji: string) => {
    void toggleReaction(message.id, emoji);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    handleQuickReaction(emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleRemoveReaction = (emoji: string, e: React.MouseEvent) => {
    e.stopPropagation();
    handleQuickReaction(emoji);
  };

  const messageReactionsRaw = (message as any).reactions as Array<{ userId: string; emoji: string }> | undefined;
  const reactionCounts = (messageReactionsRaw || []).reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const userId = session?.user?.id;
  const userReactionsForMsg = useMemo(() => {
    return (messageReactionsRaw || []).filter((r) => r.userId === userId).map((r) => r.emoji);
  }, [messageReactionsRaw, userId]);

  if (message.isPending) {
    return (
      <div className={`group relative flex mb-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`flex items-end max-w-[75%] ${
            isOwnMessage ? 'flex-row-reverse ml-auto pr-2' : 'flex-row mr-auto pl-2'
          }`}
        >
          <div className="relative w-full opacity-60">
            <div
              className={`rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm ${
                isOwnMessage
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
              }`}
            >
              <MessageContent
                content={message.content}
                attachments={message.attachments}
                isOwnMessage={isOwnMessage}
              />
            </div>
            <div className="text-[11px] mt-1 px-1 text-gray-400">{'Sending...'}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={itemRef}
      className={`group relative flex mb-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
        setShowMoreMenu(false);
      }}
    >
        <div
        className={`relative flex items-end max-w-[75%] ${
          isOwnMessage ? 'flex-row-reverse ml-auto pr-2' : 'flex-row mr-auto pl-2'
        }`}
      >
        {/* Action buttons outside bubble */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 flex gap-1 transition-opacity duration-200 ${
            showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'
          } ${isOwnMessage ? 'right-full mr-3' : 'left-full ml-3'}`}
          >
          {/* Emoji Picker */}
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <button
                className="w-8 h-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="React"
              >
                <Smile className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 border-0 shadow-2xl"
              align={isOwnMessage ? 'end' : 'start'}
              side={isOwnMessage ? 'right' : 'left'}
              sideOffset={4}
            >
              <div className="max-w-[340px]">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme={Theme.LIGHT}
                  searchPlaceHolder="Search emoji..."
                  width={320}
                  height={360}
                  previewConfig={{ showPreview: false }}
                />
                {userReactionsForMsg.length > 0 && (
                  <div className="p-3 pt-2 border-t bg-gray-50 dark:bg-gray-800">
                    <div className="text-xs text-muted-foreground mb-2 font-medium">Your reactions</div>
                    <div className="flex flex-wrap gap-1.5">
                      {userReactionsForMsg.map((e) => (
                        <button
                          key={e}
                          onClick={(event) => handleRemoveReaction(e, event)}
                          className="text-sm px-2.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all hover:scale-105 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-300 text-gray-700 hover:text-red-600 dark:bg-gray-700 dark:hover:bg-red-900/30 dark:border-gray-600 dark:hover:border-red-700 dark:text-gray-100 shadow-sm"
                          title="Click to remove"
                        >
                          <span className="text-base">{e}</span>
                          <X className="h-3.5 w-3.5 stroke-[2.5]" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Reply Button */}
          <button
            onClick={handleReply}
            className="w-8 h-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-all duration-200 hover:scale-110"
            title="Reply"
          >
            <Reply className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>

          {/* More Button */}
          <Popover open={showMoreMenu} onOpenChange={setShowMoreMenu}>
            <PopoverTrigger asChild>
              <button
                className="w-8 h-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="More"
              >
                <MoreVertical className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-48 p-1 shadow-xl border border-gray-200 dark:border-gray-700"
              align={isOwnMessage ? 'end' : 'start'}
              side={isOwnMessage ? 'right' : 'left'}
              sideOffset={10}
            >
              <div className="flex flex-col">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors text-left"
                >
                  <Copy className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Copy</span>
                </button>
                {isOwnMessage && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md transition-colors text-left"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="font-medium">Delete</span>
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Message bubble */}
        <div className="relative flex flex-col w-full">
          {message?.replyTo && (
            <MessageReplyTo replyTo={message.replyTo} isOwnMessage={isOwnMessage} />
          )}
          <div
            className={`relative rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm transition-all duration-200 ${
              isOwnMessage
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
            } ${isUnread ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}`}
          >
            <MessageContent
              content={message.content}
              attachments={message.attachments}
              isOwnMessage={isOwnMessage}
            />

            {/* Reactions */}
            {Object.keys(reactionCounts).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 -mb-1">
                {Object.entries(reactionCounts).map(([emoji, count]) => {
                  const userHasReacted = userReactionsForMsg.includes(emoji);
                  return (
                    <button
                      key={emoji}
                      className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 transition-all hover:scale-110 ${
                        userHasReacted
                          ? isOwnMessage
                            ? 'bg-white/30 hover:bg-white/40 ring-1 ring-white/40'
                            : 'bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 border border-blue-300 dark:border-blue-700'
                          : isOwnMessage
                            ? 'bg-white/20 hover:bg-white/30'
                            : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                      }`}
                      onClick={() => handleQuickReaction(emoji)}
                      title={userHasReacted ? 'Click to remove' : 'Click to react'}
                    >
                      <span>{emoji}</span>
                      {count > 1 && (
                        <span className={isOwnMessage ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div
            className={`flex items-center gap-1 text-[11px] mt-1 px-1 ${
              isOwnMessage ? 'justify-end' : 'justify-start'
            }`}
          >
            <span className="text-gray-500 dark:text-gray-400">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isOwnMessage && message.isRead && <span className="text-blue-500" title="Seen">✓✓</span>}
            {isOwnMessage && !message.isRead && <span className="text-gray-400" title="Delivered">✓</span>}
          </div>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete message?</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">This action cannot be undone.</div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="px-4 h-9 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="px-4 h-9 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
