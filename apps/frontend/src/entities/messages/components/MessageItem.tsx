'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Trash2, MoreHorizontal, Reply, SmilePlus,
  Copy, ListTodo, Flag, Pin, Forward, Heart, Plus, X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { trpc } from '@/lib/trpc';
import { useSession } from 'next-auth/react';
import { MessageContent } from './MessageContent';
import { MessageReplyTo } from './MessageReplyTo';
import { useMessageActions } from '../hooks/useMessageActions';
import { useMessages } from '../hooks/useMessages';
import { useToast } from '@/hooks/useToast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { v4 as uuidv4 } from 'uuid';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageInlineTaskCreate } from './MessageTaskCreateModal';

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
    sender?: { id: string; name?: string | null; avatar?: string | null };
    replyTo?: {
      id: string;
      content: string;
      senderId: string;
      senderName?: string;
    };
    isPinned?: boolean;
  };
  currentUserId: string;
  onReply?: (message: { id: string; content: string; senderId: string }) => void;
}

export function MessageItem({ message, currentUserId, onReply }: MessageItemProps) {
  // Reactions now come from server via message.reactions
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showReactionMenu, setShowReactionMenu] = useState(false);
  const [showFullPicker, setShowFullPicker] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'everyone' | 'for_me'>('for_me');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const hasMarkedRead = useRef(false);
  const { toast } = useToast();
  const { data: session } = useSession();
  const { markAsRead, toggleReaction } = useMessageActions();
  const { sendMessage: { mutateAsync: sendDirectMessage } } = useMessages();

  const [isForwardOpen, setIsForwardOpen] = useState(false);
  const [forwardQuery, setForwardQuery] = useState('');
  const [isForwarding, setIsForwarding] = useState(false);

  const { data: convData, isLoading: isForwardLoading } = trpc.messages.listConversations.useQuery(
    { page: 1, pageSize: 50 },
    { enabled: isForwardOpen, staleTime: 30000 }
  );



  const forwardList = useMemo(() => {
    if (!convData?.items) return [];
    let items = convData.items;
    if (forwardQuery.trim()) {
      const q = forwardQuery.trim().toLowerCase();
      items = items.filter((i: any) =>
        (i.name || i.username || '').toLowerCase().includes(q) ||
        (i.marketplace_listing_title || '').toLowerCase().includes(q)
      );
    }
    return items;
  }, [convData, forwardQuery]);

  const handleForwardToUser = async (conv: any) => {
    setIsForwarding(true);
    try {
      const fwdContent = JSON.stringify({
        optionalMessage: null,
        originalMessageId: message.id,
        originalContent: message.content,
        originalUser: {
          name: message.sender?.name || 'Unknown',
          image: message.sender?.avatar || null,
        },
        originalCreatedAt: message.createdAt,
        originalChannelName: null,
      });
      await sendDirectMessage({
        id: uuidv4(),
        toUserId: conv.user_id,
        content: fwdContent,
        type: 'FORWARD',
        marketplaceListingId: conv.marketplace_listing_id ?? undefined,
      });
      toast({ title: 'Message forwarded successfully!' });
      setIsForwardOpen(false);
      setForwardQuery('');
    } catch (err: any) {
      toast({ title: 'Failed to forward', description: err.message, variant: 'destructive' });
    } finally {
      setIsForwarding(false);
    }
  };

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

  const handleDelete = () => {
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    deleteMessage.mutate({ messageId: message.id, mode: isOwnMessage ? deleteMode : 'for_me' });
    setConfirmOpen(false);
  };

  const messageAction = trpc.messages.messageAction.useMutation({
    onSuccess: () => {
      toast({ title: 'Message updated' });
      utils.messages.listWithUser.invalidate({
        userId: message.senderId === currentUserId ? message.receiverId : message.senderId,
      });
      utils.messages.listByConversationId.invalidate();
    }
  });

  const handlePin = () => {
    messageAction.mutate({ messageId: message.id, action: message.isPinned ? 'unpin' : 'pin' });
  };

  const handleReply = () => {
    const payload = { id: message.id, content: message.content, senderId: message.senderId };
    onReply?.(payload);
    const otherUserId = message.senderId === currentUserId ? message.receiverId : message.senderId;
    window.dispatchEvent(new CustomEvent('messages:reply', { detail: { userId: otherUserId, message: payload } }));
  };

  const handleQuickReaction = (emoji: string) => {
    void toggleReaction(message.id, emoji);
  };

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(message.content).then(() => {
        toast({ title: 'Copied to clipboard' });
      }).catch(() => {
        toast({ title: 'Failed to copy', variant: 'destructive' });
      });
    }
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

  const renderEmoji = (emoji: string, sizeClass = 'h-4 w-4') => {
    if (emoji === '\u2764\uFE0F' || emoji === '❤️') {
      return <Heart className={`${sizeClass} fill-red-500 text-red-500`} />;
    }
    return (
      <span style={{ fontSize: sizeClass.includes('w-6') ? '20px' : '14px', lineHeight: 1, fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}>
        {emoji}
      </span>
    );
  };

  return (
    <div
      ref={itemRef}
      className={`group relative flex mb-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-300 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`relative flex items-end w-full gap-2 ${isOwnMessage ? 'flex-row-reverse ml-auto' : 'flex-row mr-auto'
          }`}
      >
        {!isOwnMessage && (
          <Avatar className="h-8 w-8 shrink-0 mb-6">
            <AvatarImage src={message.sender?.avatar || undefined} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-[10px] font-bold text-white tracking-wider">
              {(message.sender?.name || "U").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Message bubble container */}
        <div className={`relative flex flex-col ${message.content?.startsWith('__AF_MARKETPLACE_SUBMISSION__')
          ? 'w-full sm:max-w-[calc(95%-40px)]'
          : 'max-w-[calc(85%-40px)] sm:max-w-[calc(75%-40px)]'
          }`}>
          {message?.replyTo && (
            <MessageReplyTo
              replyTo={message.replyTo}
              isOwnMessage={isOwnMessage}
              currentSenderName={isOwnMessage ? 'You' : (message.sender?.name || 'Someone')}
              repliedToName={message.replyTo.senderId === currentUserId ? (isOwnMessage ? 'yourself' : 'you') : (message.replyTo.senderName || 'Someone')}
            />
          )}
          {!isOwnMessage && message.sender?.name && (
            <div className="px-3 mb-1 text-[12px] font-semibold tracking-tight text-zinc-500 dark:text-zinc-400">
              {message.sender.name}
            </div>
          )}

          <div className="relative flex items-center gap-2 group/inner z-10">
            <div
              className={`group/bubble relative rounded-3xl px-4 py-3 text-[15px] leading-relaxed shadow-sm transition-all duration-300 ease-out flex-1 ${isOwnMessage
                ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-500 text-white shadow-indigo-500/20 shadow-md ring-1 ring-white/10'
                : 'bg-white dark:bg-[#1a1a1a] text-zinc-900 dark:text-zinc-100 shadow-md shadow-zinc-200/50 dark:shadow-black/50 border border-zinc-200/60 dark:border-zinc-800/60'
                } ${isUnread ? 'ring-2 ring-indigo-400/60 dark:ring-indigo-500/50' : ''}`}
            >
              <MessageContent
                content={message.content}
                type={message.type}
                attachments={message.attachments}
                isOwnMessage={isOwnMessage}
              />

              {/* Reactions */}
              {!message.isPending && Object.keys(reactionCounts).length > 0 && (
                <div className={`absolute -bottom-3 ${isOwnMessage ? 'right-0' : 'right-0'} flex flex-wrap gap-0.5 bg-white dark:bg-[#1a1a1a] shadow-sm ring-1 ring-black/5 dark:ring-white/10 rounded-full z-10 overflow-hidden ${Object.keys(reactionCounts).length === 1 && Object.values(reactionCounts)[0] === 1 ? 'w-[22px] h-[22px] items-center justify-center shrink-0' : 'px-1 py-0.5'}`}>
                  {Object.entries(reactionCounts).map(([emoji, count]) => {
                    const userHasReacted = userReactionsForMsg.includes(emoji);
                    const isSingle = Object.keys(reactionCounts).length === 1 && count === 1;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        className={`rounded-full flex items-center justify-center gap-1 transition-all duration-200 hover:scale-110 ${isSingle ? 'w-full h-full shrink-0' : 'h-5 px-1.5'} ${userHasReacted
                          ? 'bg-indigo-50 dark:bg-indigo-500/20 cursor-pointer'
                          : 'bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer'
                          }`}
                        onClick={() => handleQuickReaction(emoji)}
                        title={userHasReacted ? 'Click to remove' : 'Click to react'}
                      >
                        {renderEmoji(emoji, isSingle ? 'h-3.5 w-3.5' : 'h-3.5 w-3.5')}
                        {count > 1 && (
                          <span className={`text-[10px] font-bold leading-none ${userHasReacted ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action Menu */}
            {!message.isPending && (
              <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ${isOwnMessage ? 'order-first' : ''}`}>

                {/* Reaction Picker */}
                <div className="relative">
                  <Popover
                    open={showReactionMenu}
                    onOpenChange={(open) => {
                      setShowReactionMenu(open);
                      if (!open) setTimeout(() => setShowFullPicker(false), 200);
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button type="button" className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer outline-none" title="Add reaction">
                        <SmilePlus className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align={isOwnMessage ? 'end' : 'start'}
                      side="top"
                      sideOffset={4}
                      className={`p-1.5 min-w-0 ${showFullPicker ? 'w-auto' : 'w-auto flex items-center gap-0.5'}`}
                    >
                      {!showFullPicker ? (
                        <>
                          {['👍', '\u2764\uFE0F', '😂', '😮', '😢', '😡'].map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                handleQuickReaction(emoji);
                                setShowReactionMenu(false);
                              }}
                              className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:scale-125 transition-all duration-150 cursor-pointer"
                              title={emoji}
                            >
                              {renderEmoji(emoji, 'h-5 w-5')}
                            </button>
                          ))}
                          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1" />
                          <button
                            type="button"
                            onClick={() => setShowFullPicker(true)}
                            className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-500"
                            title="More reactions"
                          >
                            <Plus className="h-5 w-5" />
                          </button>
                        </>
                      ) : (
                        <EmojiPicker
                          onEmojiClick={(data: EmojiClickData) => {
                            handleQuickReaction(data.emoji);
                            setShowReactionMenu(false);
                          }}
                          theme={Theme.LIGHT}
                          previewConfig={{ showPreview: false }}
                        />
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                {/* More Options */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer outline-none" title="More options">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isOwnMessage ? 'end' : 'start'} side="top" className="w-48">
                    <DropdownMenuItem onClick={handleReply} className="gap-2 text-[13px] font-normal cursor-pointer">
                      <Reply className="h-3.5 w-3.5 text-zinc-500" /> Reply
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopy} className="gap-2 text-[13px] font-normal cursor-pointer">
                      <Copy className="h-3.5 w-3.5 text-zinc-500" /> Copy
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handlePin} className="gap-2 text-[13px] font-normal cursor-pointer">
                      <Pin className="h-3.5 w-3.5 text-zinc-500" /> {message.isPinned ? 'Unpin' : 'Pin'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2 text-[13px] font-normal cursor-pointer"
                      onSelect={(e) => {
                        e.preventDefault();
                        setTimeout(() => setIsForwardOpen(true), 150);
                      }}
                    >
                      <Forward className="h-3.5 w-3.5 text-zinc-500" /> Forward
                    </DropdownMenuItem>

                    <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />

                    <DropdownMenuItem
                      className="gap-2 text-[13px] font-normal cursor-pointer"
                      onClick={() => setTaskModalOpen(true)}
                    >
                      <ListTodo className="h-3.5 w-3.5 text-indigo-500" /> Create a task
                    </DropdownMenuItem>


                    {!isOwnMessage && (
                      <DropdownMenuItem className="gap-2 text-[13px] font-normal cursor-pointer text-orange-600 dark:text-orange-400">
                        <Flag className="h-3.5 w-3.5" /> Report
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleDelete} className="gap-2 text-[13px] font-normal text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 cursor-pointer">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

              </div>
            )}
          </div>

          {/* Timestamp or Pending */}
          <div
            className={`flex items-center gap-1.5 text-[10px] mt-1.5 px-3 font-medium ${isOwnMessage ? 'justify-end' : 'justify-start'
              }`}
          >
            {message.isPending ? (
              <span className="text-zinc-400 dark:text-zinc-500 italic animate-pulse">Sending...</span>
            ) : (
              <>
                <span className="text-zinc-400 dark:text-zinc-500">
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {isOwnMessage && message.isRead && <span className="text-blue-500 font-bold tracking-tighter" title="Seen">✓✓</span>}
                {isOwnMessage && !message.isRead && <span className="text-zinc-400 font-bold" title="Delivered">✓</span>}
              </>
            )}
          </div>
          {/* Inline Task Create — renders below the bubble, same alignment */}
          {taskModalOpen && (
            <MessageInlineTaskCreate
              messageContent={message.content}
              isOwnMessage={isOwnMessage}
              onClose={() => setTaskModalOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete message?</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {isOwnMessage ? (
              <div className="flex flex-col gap-3">
                <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                  <input type="radio" name="deleteMode" checked={deleteMode === 'everyone'} onChange={() => setDeleteMode('everyone')} className="mt-1" />
                  <div>
                    <div className="font-medium text-sm">Delete for everyone</div>
                    <div className="text-xs text-muted-foreground mt-0.5">This message will be deleted for all members.</div>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                  <input type="radio" name="deleteMode" checked={deleteMode === 'for_me'} onChange={() => setDeleteMode('for_me')} className="mt-1" />
                  <div>
                    <div className="font-medium text-sm">Delete for you</div>
                    <div className="text-xs text-muted-foreground mt-0.5">This message will be deleted for you. Other chat members will still be able to see it.</div>
                  </div>
                </label>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                This message will be deleted for you. Other chat members will still be able to see it.
              </div>
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="px-4 h-9 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="px-4 h-9 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forward Message Popover */}
      <Popover open={isForwardOpen} onOpenChange={(open) => {
        setIsForwardOpen(open);
        if (!open) setForwardQuery('');
      }}>
        <PopoverAnchor className="absolute top-1/2 right-1/2" />
        <PopoverContent 
          side="left" 
          align="start" 
          sideOffset={16}
          className="w-[340px] p-0 shadow-2xl border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl"
        >
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-zinc-900 dark:text-zinc-100">Forward to</h3>
            <button onClick={() => setIsForwardOpen(false)} className="p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
              <X className="h-4 w-4 text-zinc-500" />
            </button>
          </div>
          <div className="px-4 py-2 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <input
              className="flex-1 outline-none text-[13px] bg-transparent placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100"
              placeholder="Search conversations..."
              value={forwardQuery}
              onChange={(e) => setForwardQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-[320px] overflow-y-auto py-1.5 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
            {isForwardLoading ? (
              <div className="flex justify-center p-6">
                <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : forwardList.length > 0 ? (
              forwardList.map((c: any) => (
                <button
                  key={c.id}
                  disabled={isForwarding}
                  onClick={() => handleForwardToUser(c)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left cursor-pointer group/forward"
                >
                  <Avatar className="h-8 w-8 border border-black/5 dark:border-white/10 shrink-0">
                    <AvatarImage src={c.avatar || undefined} className="object-cover" />
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 text-[10px] font-bold dark:bg-indigo-900 dark:text-indigo-300">
                      {(c.name || c.username || 'U').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {c.marketplace_listing_title || c.name || c.username}
                    </div>
                  </div>
                  {isForwarding ? (
                    <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center opacity-0 group-hover/forward:opacity-100 transition-all scale-90 group-hover/forward:scale-100">
                      <Forward className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className="p-6 text-center text-[13px] text-zinc-500 font-medium">
                No conversations found.
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
