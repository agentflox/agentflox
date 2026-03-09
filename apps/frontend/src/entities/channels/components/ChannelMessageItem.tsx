"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { MessageReplyTo } from "./MessageReplyTo";
import { MessageContent } from "./MessageContent";
import { useChannels } from "../hooks/useChannels";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmojiPicker, { Theme, EmojiClickData } from "emoji-picker-react";
import { Copy, Reply, MoreVertical, Smile, X } from "lucide-react";

export interface ChannelMessageItemProps {
  message: {
    id: string;
    channelId: string;
    content: string;
    createdAt: string | Date;
    userId: string;
    attachments?: any[];
    reactions?: Array<{ userId: string; emoji: string }> | any[];
    parentId?: string | null;
    parent?: {
      id: string;
      content: string;
      userId: string;
      user?: { id: string; name: string | null; email: string | null; image: string | null };
    } | null;
    user?: { id: string; name: string | null; email: string | null; image: string | null } | null;
  };
}

export function ChannelMessageItem({ message }: ChannelMessageItemProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const { toggleReaction } = useChannels({});
  const itemRef = useRef<HTMLDivElement>(null);
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const reactionCounts = useMemo(() => {
    const raw = Array.isArray(message.reactions) ? (message.reactions as Array<{ userId: string; emoji: string }>) : [];
    return raw.reduce((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [message.reactions]);

  const userReactions = useMemo(() => {
    const raw = Array.isArray(message.reactions) ? (message.reactions as Array<{ userId: string; emoji: string }>) : [];
    return raw.filter((r) => r.userId === currentUserId).map((r) => r.emoji);
  }, [message.reactions, currentUserId]);

  const isOwnMessage = message.userId === currentUserId;
  const displayLabel = (message.user?.name || message.user?.email || "Member") || "Member";
  const initials = (message.user?.name || message.user?.email || "?").slice(0, 2).toUpperCase();

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
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

  const handleReply = useCallback(() => {
    const payload = { id: message.id, content: message.content, senderId: message.userId };
    window.dispatchEvent(
      new CustomEvent("channel:message:reply", { detail: { channelId: message.channelId, message: payload } })
    );
    setShowMoreMenu(false);
    setShowActions(false);
  }, [message.id, message.content, message.userId, message.channelId]);

  return (
    <div
      ref={itemRef}
      className="group relative flex mb-3"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
        setShowMoreMenu(false);
      }}
    >
      <Avatar className="h-8 w-8 mt-0.5">
        <AvatarImage src={message.user?.image || undefined} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{displayLabel}</p>
          <span className="text-[11px] text-muted-foreground">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* Action rail */}
        <div
          className={`absolute right-0 -translate-y-1/2 top-6 flex gap-1 transition-opacity duration-200 ${
            showActions ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <button
                className="w-7 h-7 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="React"
              >
                <Smile className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-0 shadow-2xl" align="end" sideOffset={4}>
              <div className="max-w-[320px]">
                <EmojiPicker onEmojiClick={handleEmojiClick} theme={Theme.LIGHT} previewConfig={{ showPreview: false }} />
                {userReactions.length > 0 && (
                  <div className="p-3 pt-2 border-t bg-gray-50 dark:bg-gray-800">
                    <div className="text-xs text-muted-foreground mb-2 font-medium">Your reactions</div>
                    <div className="flex flex-wrap gap-1.5">
                      {userReactions.map((e) => (
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

          <button
            onClick={handleReply}
            className="w-7 h-7 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-all duration-200 hover:scale-110"
            title="Reply"
          >
            <Reply className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>

          <Popover open={showMoreMenu} onOpenChange={setShowMoreMenu}>
            <PopoverTrigger asChild>
              <button
                className="w-7 h-7 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="More"
              >
                <MoreVertical className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1 shadow-xl border border-gray-200 dark:border-gray-700" align="end" sideOffset={10}>
              <div className="flex flex-col">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors text-left"
                >
                  <Copy className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Copy</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {message.parent && (
          <div className="mt-1">
            <MessageReplyTo
              replyTo={{ id: message.parent.id, content: message.parent.content, senderId: message.parent.userId }}
              isOwnMessage={isOwnMessage}
            />
          </div>
        )}

        <div className="mt-1">
          <MessageContent content={message.content} attachments={message.attachments} />
        </div>

        {Object.keys(reactionCounts).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(reactionCounts).map(([emoji, count]) => {
              const userHasReacted = userReactions.includes(emoji);
              return (
                <button
                  key={emoji}
                  onClick={() => void toggleReaction(message.id, emoji)}
                  className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 transition-all hover:scale-110 ${
                    userHasReacted
                      ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-200'
                      : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-100'
                  }`}
                  title={userHasReacted ? 'Click to remove' : 'Click to react'}
                >
                  <span>{emoji}</span>
                  {count > 1 && <span className="text-gray-600 dark:text-gray-400">{count}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChannelMessageItem;
