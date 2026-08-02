"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { MessageReplyTo } from "./MessageReplyTo";
import { MessageContent } from "./MessageContent";
import { useChannelActions } from "../hooks/useChannels";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import EmojiPicker, { Theme, EmojiClickData } from "emoji-picker-react";
import { Copy, Reply, MoreVertical, Smile, Megaphone, Lightbulb, Bell, MessageCircle, Pencil, BookMarked, Link2, AlarmClock, GitBranch, BellRing, Trash2, ChevronRight, X, Share, ThumbsUp, SmilePlus } from "lucide-react";
import { renderCommentText } from "@/utils/textRendering";
import { ChannelMessageComposer } from "./ChannelMessageComposer";
import { ForwardMessageModal } from "./ForwardMessageModal";
import ChannelPostModal from "./ChannelPostModal";
import { PostEditModal } from "./PostEditModal";
import ChannelThreadModal from "./ChannelThreadModal";
import { toast } from "sonner";

export interface ChannelMessageItemProps {
  message: {
    id: string;
    channelId: string;
    content: string;
    type?: string;
    title?: string | null;
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
  mentionItems?: { title: string; type: string; status?: string }[];
  channelName?: string;
  replyCount?: number;
  lastReply?: any;
  allMessages?: any[];
}

export function ChannelMessageItem({ message, mentionItems = [], channelName = "General", replyCount, lastReply, allMessages }: ChannelMessageItemProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const { toggleReaction, editMessage, deleteMessage } = useChannelActions();
  const itemRef = useRef<HTMLDivElement>(null);
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showBottomEmojiPicker, setShowBottomEmojiPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPostEditModalOpen, setIsPostEditModalOpen] = useState(false);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);


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
    toast.success('Copied to clipboard');
    setShowMoreMenu(false);
    setShowActions(false);
  };

  const handleEditStart = () => {
    setShowMoreMenu(false);
    setShowActions(false);
    // Defer so the Popover fully closes before the modal mounts
    setTimeout(() => {
      if (isPost) {
        setIsPostEditModalOpen(true);
      } else {
        setIsEditing(true);
      }
    }, 0);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
  };

  const handleEditSave = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed === message.content) {
      handleEditCancel();
      return;
    }
    try {
      await editMessage(message.id, trimmed);
      toast.success('Message updated');
    } catch {
      // Error already shown via toast in useChannels
    }
    setIsEditing(false);
  };

  const handlePostEditSave = async (title: string, content: string) => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedContent && !trimmedTitle) return;

    try {
      await editMessage(message.id, trimmedContent, trimmedTitle);
      toast.success('Post updated');
    } catch {
      // Error already handled
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?message=${message.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied');
    setShowMoreMenu(false);
    setShowActions(false);
  };

  const handleMarkUnread = () => {
    toast.info('Marked as unread');
    setShowMoreMenu(false);
    setShowActions(false);
  };

  const handleDelete = async () => {
    try {
      await deleteMessage(message.id);
      toast.success('Message deleted');
    } catch {
      // error handled in useChannels
    }
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

  const t = message.type?.toLowerCase() || 'message';
  const isAnnouncement = t === 'announcement';
  const isDiscussion = t === 'discussion';
  const isIdea = t === 'idea';
  const isUpdate = t === 'update';
  const isForward = t === 'forward';
  const isPost = isAnnouncement || isDiscussion || isIdea || isUpdate;

  let forwardData: any = null;
  if (isForward) {
    try {
      forwardData = JSON.parse(message.content);
    } catch (e) {
      // ignore parsing errors
    }
  }

  const handleReply = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isAnnouncement || isDiscussion || isIdea || isUpdate) {
      setIsModalOpen(true);
    } else {
      setIsThreadOpen(true);
    }
    setShowMoreMenu(false);
    setShowActions(false);
  }, [isAnnouncement, isDiscussion, isIdea, isUpdate]);

  let displayContent = message.content;

  const derivedReplies = useMemo(() => {
    if (replyCount !== undefined) return [];
    if (!allMessages) return [];
    return allMessages.filter((m: any) => m.parentId === message.id);
  }, [replyCount, allMessages, message.id]);

  const effectiveReplyCount = replyCount !== undefined ? replyCount : derivedReplies.length;
  const effectiveLastReply = lastReply !== undefined ? lastReply : (derivedReplies.length > 0 ? derivedReplies[derivedReplies.length - 1] : null);
  const lastReplyInitials = effectiveLastReply ? (effectiveLastReply.user?.name || effectiveLastReply.user?.email || "?").slice(0, 2).toUpperCase() : "";

  return (
    <div
      ref={itemRef}
      className="group relative flex flex-col mb-1 hover:bg-slate-50/70 p-3 -mx-3 rounded-xl transition-colors cursor-pointer"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
        setShowMoreMenu(false);
      }}
    >
      <div className="flex w-full">
        <Avatar className="h-9 w-9 mt-0.5 mr-3 shrink-0">
          <AvatarImage src={message.user?.image || undefined} />
          <AvatarFallback className="bg-slate-800 text-white text-xs">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 pr-12 relative">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-slate-900 text-[15px]">{displayLabel}</span>
            {isPost && <span className="text-sm text-slate-500">made a new Post!</span>}
            <span className="text-xs text-slate-400">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          {message.type === 'THREAD_BROADCAST' && message.parent && (
            <div className="text-[13px] text-slate-500 mb-0.5 flex items-center gap-1">
              Replied to a thread: <span className="font-medium text-blue-600 truncate max-w-[250px] cursor-pointer hover:underline" onClick={handleReply}>{message.parent.content}</span>
            </div>
          )}

          {/* Action rail — regular (non-post) messages only */}
          {!isPost && (
            <div
              className={`absolute right-10 top-0 flex items-center gap-0.5 bg-white border border-slate-200 shadow-sm rounded-lg p-0.5 transition-opacity duration-200 z-10 ${showActions ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            >
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleQuickReaction('👍')}
                      className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer text-base"
                    >
                      👍
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 text-white text-xs border-0">Thumbs up</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleQuickReaction('👎')}
                      className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer text-base"
                    >
                      👎
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 text-white text-xs border-0">Thumbs down</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleQuickReaction('👏')}
                      className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer text-base"
                    >
                      👏
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 text-white text-xs border-0">Clap</TooltipContent>
                </Tooltip>

                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <button
                          className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Smile className="h-4 w-4 text-slate-500" />
                        </button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-900 text-white text-xs border-0">Add reaction</TooltipContent>
                  </Tooltip>
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
                                className="text-sm px-2.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all hover:scale-105 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-300 text-gray-700 hover:text-red-600 dark:bg-gray-700 dark:hover:bg-red-900/30 dark:border-gray-600 dark:hover:border-red-700 dark:text-gray-100 shadow-sm cursor-pointer"
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

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleReply}
                      className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Reply className="h-4 w-4 text-slate-500" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 text-white text-xs border-0">Reply in thread</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsForwardModalOpen(true);
                        setShowActions(false);
                      }}
                      className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Share className="h-4 w-4 text-slate-500" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 text-white text-xs border-0">Forward message</TooltipContent>
                </Tooltip>

                <Popover open={showMoreMenu} onOpenChange={setShowMoreMenu}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <button
                          className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <MoreVertical className="h-4 w-4 text-slate-500" />
                        </button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-900 text-white text-xs border-0">More actions</TooltipContent>
                  </Tooltip>
                  <PopoverContent className="w-64 p-1 shadow-xl border border-gray-200" align="end" sideOffset={4}>
                    <div className="flex flex-col">
                      {/* Edit — own messages only */}
                      {isOwnMessage && (
                        <button
                          onClick={handleEditStart}
                          className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-gray-100 rounded-md transition-colors text-left cursor-pointer"
                        >
                          <span className="flex items-center gap-3">
                            <Pencil className="h-3.5 w-3.5 text-gray-500" />
                            <span className="font-normal text-gray-700">Edit</span>
                          </span>
                          <span className="text-[11px] text-gray-400">E</span>
                        </button>
                      )}

                      <button
                        onClick={handleMarkUnread}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-gray-100 rounded-md transition-colors text-left cursor-pointer"
                      >
                        <span className="flex items-center gap-3">
                          <BookMarked className="h-3.5 w-3.5 text-gray-500" />
                          <span className="font-normal text-gray-700">Mark as unread</span>
                        </span>
                        <span className="text-[11px] text-gray-400">U</span>
                      </button>

                      <button
                        onClick={handleCopyLink}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-gray-100 rounded-md transition-colors text-left cursor-pointer"
                      >
                        <span className="flex items-center gap-3">
                          <Link2 className="h-3.5 w-3.5 text-gray-500" />
                          <span className="font-normal text-gray-700">Copy link</span>
                        </span>
                        <span className="text-[11px] text-gray-400">C</span>
                      </button>

                      <div className="my-1 h-px bg-gray-100" />

                      {/* Delete — own messages only */}
                      {isOwnMessage && (
                        <>
                          <div className="my-1 h-px bg-gray-100" />
                          <button
                            onClick={handleDelete}
                            className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-red-50 rounded-md transition-colors text-left cursor-pointer group/del"
                          >
                            <span className="flex items-center gap-3">
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              <span className="font-normal text-red-500">Delete</span>
                            </span>
                            <span className="text-[11px] text-gray-400">Del</span>
                          </button>
                        </>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </TooltipProvider>
            </div>
          )}

          {/* Content Wrapper */}
          <div
            className={isPost ? "mt-1.5 relative bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded-xl p-4 transition-colors cursor-pointer" : "mt-0.5 relative"}
            onClick={() => { if (isPost) setIsModalOpen(true); }}
          >

            {/* Action rail — post messages only, inside card */}
            {isPost && (
              <div
                onClick={(e) => e.stopPropagation()}
                className={`absolute right-3 top-3 flex items-center gap-0.5 bg-white border border-slate-200 shadow-sm rounded-lg p-0.5 transition-opacity duration-200 z-10 ${showActions ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              >
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleQuickReaction('👍')}
                        className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer text-base"
                      >
                        👍
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-900 text-white text-xs border-0">Thumbs up</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleQuickReaction('👎')}
                        className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer text-base"
                      >
                        👎
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-900 text-white text-xs border-0">Thumbs down</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleQuickReaction('👏')}
                        className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer text-base"
                      >
                        👏
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-900 text-white text-xs border-0">Clap</TooltipContent>
                  </Tooltip>

                  <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <button
                            className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Smile className="h-4 w-4 text-slate-500" />
                          </button>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-900 text-white text-xs border-0">Add reaction</TooltipContent>
                    </Tooltip>
                    <PopoverContent className="w-auto p-0 border-0 shadow-2xl" align="end" sideOffset={4}>
                      <EmojiPicker onEmojiClick={handleEmojiClick} theme={Theme.LIGHT} previewConfig={{ showPreview: false }} />
                    </PopoverContent>
                  </Popover>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleReply}
                        className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Reply className="h-4 w-4 text-slate-500" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-900 text-white text-xs border-0">Reply in thread</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsForwardModalOpen(true);
                          setShowActions(false);
                        }}
                        className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Share className="h-4 w-4 text-slate-500" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-900 text-white text-xs border-0">Forward message</TooltipContent>
                  </Tooltip>

                  <Popover open={showMoreMenu} onOpenChange={setShowMoreMenu}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <button
                            className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <MoreVertical className="h-4 w-4 text-slate-500" />
                          </button>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-900 text-white text-xs border-0">More actions</TooltipContent>
                    </Tooltip>
                    <PopoverContent className="w-64 p-1 shadow-xl border border-gray-200" align="end" sideOffset={4}>
                      <div className="flex flex-col">
                        {isOwnMessage && (
                          <button
                            onClick={handleEditStart}
                            className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-gray-100 rounded-md transition-colors text-left cursor-pointer"
                          >
                            <span className="flex items-center gap-3">
                              <Pencil className="h-3.5 w-3.5 text-gray-500" />
                              <span className="font-normal text-gray-700">Edit</span>
                            </span>
                            <span className="text-[11px] text-gray-400">E</span>
                          </button>
                        )}
                        <button
                          onClick={handleMarkUnread}
                          className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-gray-100 rounded-md transition-colors text-left cursor-pointer"
                        >
                          <span className="flex items-center gap-3">
                            <BookMarked className="h-3.5 w-3.5 text-gray-500" />
                            <span className="font-normal text-gray-700">Mark as unread</span>
                          </span>
                          <span className="text-[11px] text-gray-400">U</span>
                        </button>
                        <button
                          onClick={handleCopyLink}
                          className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-gray-100 rounded-md transition-colors text-left cursor-pointer"
                        >
                          <span className="flex items-center gap-3">
                            <Link2 className="h-3.5 w-3.5 text-gray-500" />
                            <span className="font-normal text-gray-700">Copy link</span>
                          </span>
                          <span className="text-[11px] text-gray-400">C</span>
                        </button>
                        <div className="my-1 h-px bg-gray-100" />
                        {isOwnMessage && (
                          <>
                            <div className="my-1 h-px bg-gray-100" />
                            <button
                              onClick={handleDelete}
                              className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-red-50 rounded-md transition-colors text-left cursor-pointer"
                            >
                              <span className="flex items-center gap-3">
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                <span className="font-normal text-red-500">Delete</span>
                              </span>
                              <span className="text-[11px] text-gray-400">Del</span>
                            </button>
                          </>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </TooltipProvider>
              </div>
            )}

            {message.parent && (
              <div className="mb-2">
                <MessageReplyTo
                  replyTo={{ id: message.parent.id, content: message.parent.content, senderId: message.parent.userId }}
                  isOwnMessage={isOwnMessage}
                />
              </div>
            )}

            {isAnnouncement && (
              <div className="flex items-center gap-1.5 text-red-600 bg-red-50 border border-red-200/50 w-fit px-2 py-0.5 rounded-md text-xs font-semibold mb-3">
                <Megaphone className="h-3.5 w-3.5" />
                Announcement
              </div>
            )}
            {isDiscussion && (
              <div className="flex items-center gap-1.5 text-pink-600 bg-pink-50 border border-pink-200/50 w-fit px-2 py-0.5 rounded-md text-xs font-semibold mb-3">
                <MessageCircle className="h-3.5 w-3.5" />
                Discussion
              </div>
            )}
            {isIdea && (
              <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-200/50 w-fit px-2 py-0.5 rounded-md text-xs font-semibold mb-3">
                <Lightbulb className="h-3.5 w-3.5" />
                Idea
              </div>
            )}
            {isUpdate && (
              <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 border border-blue-200/50 w-fit px-2 py-0.5 rounded-md text-xs font-semibold mb-3">
                <Bell className="h-3.5 w-3.5" />
                Update
              </div>
            )}

            {isEditing ? (
              <div className="mt-1">
                <ChannelMessageComposer
                  channelId={message.channelId}
                  mentionItems={mentionItems}
                  editMode
                  initialContent={message.content}
                  onCancel={handleEditCancel}
                  onSave={async (text) => { await handleEditSave(text); }}
                />
              </div>
            ) : (
              <>
                {message.title && (
                  <div className="font-bold text-slate-900 text-[15px] mb-1">{message.title}</div>
                )}

                <div className="text-[15px] text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {isForward && forwardData ? (
                    <div className="flex flex-col gap-3 mt-1">
                      {forwardData.optionalMessage && (
                        <div className="text-[15px]">
                          {renderCommentText(forwardData.optionalMessage, mentionItems, true)}
                        </div>
                      )}
                      <div className="pl-3 border-l-[3px] border-slate-300/80">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Avatar className="h-5 w-5 shrink-0">
                            <AvatarImage src={forwardData.originalUser?.image || undefined} />
                            <AvatarFallback className="bg-slate-800 text-white text-[10px]">
                              {(forwardData.originalUser?.name || "?").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-slate-900 text-[13px]">{forwardData.originalUser?.name || "Unknown"}</span>
                          <span className="text-xs text-slate-400">
                            {new Date(forwardData.originalCreatedAt || message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="text-[15px] text-slate-700">
                          {renderCommentText(forwardData.originalContent || "", mentionItems, true)}
                        </div>
                        <div className="mt-2.5 text-xs text-slate-500 flex items-center gap-1">
                          Forwarded from #{forwardData.originalChannelName} <span className="mx-0.5">&middot;</span>
                          <span className="text-blue-600 hover:underline cursor-pointer font-medium">View message</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    renderCommentText(displayContent, mentionItems, true)
                  )}
                </div>

                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-3">
                    <MessageContent content={""} attachments={message.attachments} />
                  </div>
                )}
              </>
            )}

            {isPost ? (
              <div className="flex items-center justify-between mt-4 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {Object.entries(reactionCounts).map(([emoji, count]) => {
                    const userHasReacted = userReactions.includes(emoji);
                    return (
                      <button
                        key={emoji}
                        onClick={(e) => { e.stopPropagation(); void toggleReaction(message.id, emoji); }}
                        className={`text-[13px] px-2 py-1 rounded-full flex items-center gap-1.5 transition-colors ${userHasReacted
                          ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                          : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                      >
                        <span>{emoji}</span>
                        <span className="font-medium">{count}</span>
                      </button>
                    );
                  })}

                  {!reactionCounts['👍'] && (
                    <button
                      onClick={(e) => { e.stopPropagation(); void toggleReaction(message.id, '👍'); }}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                  )}

                  <Popover open={showBottomEmojiPicker} onOpenChange={setShowBottomEmojiPicker}>
                    <PopoverTrigger asChild>
                      <button
                        onClick={(e) => { e.stopPropagation(); }}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      >
                        <SmilePlus className="w-4 h-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" side="top" className="p-0 w-auto border-none shadow-none z-50">
                      <div onClick={(e) => e.stopPropagation()}>
                        <EmojiPicker
                          theme={Theme.LIGHT}
                          onEmojiClick={(emojiData) => {
                            void toggleReaction(message.id, emojiData.emoji);
                            setShowBottomEmojiPicker(false);
                          }}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div
                  className="flex items-center gap-2 cursor-pointer group/reply"
                  onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
                >
                  {effectiveReplyCount > 0 ? (
                    <>
                      <Avatar className="w-6 h-6 shrink-0">
                        <AvatarImage src={effectiveLastReply?.user?.image || undefined} />
                        <AvatarFallback className="bg-slate-800 text-white text-[10px]">{lastReplyInitials}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-slate-600 group-hover/reply:text-slate-900 group-hover/reply:underline transition-colors">
                        {effectiveReplyCount} {effectiveReplyCount === 1 ? 'reply' : 'replies'}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-slate-500 group-hover/reply:text-slate-900 flex items-center gap-1.5 transition-colors">
                      <MessageCircle className="w-4 h-4" /> Reply
                    </span>
                  )}
                </div>
              </div>
            ) : (
              Object.keys(reactionCounts).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {Object.entries(reactionCounts).map(([emoji, count]) => {
                    const userHasReacted = userReactions.includes(emoji);
                    return (
                      <button
                        key={emoji}
                        onClick={() => void toggleReaction(message.id, emoji)}
                        className={`text-[13px] px-2 py-1 rounded-full flex items-center gap-1.5 transition-colors ${userHasReacted
                          ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                          : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        title={userHasReacted ? 'Click to remove' : 'Click to react'}
                      >
                        <span>{emoji}</span>
                        {count > 1 && <span className="font-medium">{count}</span>}
                      </button>
                    );
                  })}
                </div>
              )
            )}
          </div>

        </div>
      </div>

      {effectiveReplyCount > 0 && effectiveLastReply && (
        <div className="flex items-center mt-1 ml-[17px]" onClick={handleReply}>
          <div className="w-8 h-6 border-l-2 border-b-2 border-slate-300/70 rounded-bl-xl shrink-0 -mt-6 mr-2"></div>
          <div className="flex items-center gap-1.5 z-10 pt-1">
            <Avatar className="w-5 h-5 shrink-0">
              <AvatarImage src={effectiveLastReply.user?.image || undefined} />
              <AvatarFallback className="bg-slate-800 text-white text-[10px]">{lastReplyInitials}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-semibold text-slate-700 hover:underline">{effectiveReplyCount} {effectiveReplyCount === 1 ? 'reply' : 'replies'}</span>
            <span className="text-xs text-slate-400">
              {new Date(effectiveLastReply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}

      {isPost && isModalOpen && (
        <ChannelPostModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          message={message}
          mentionItems={mentionItems}
          channelName={channelName}
          allMessages={allMessages}
        />
      )}

      {!isPost && isThreadOpen && (
        <ChannelThreadModal
          isOpen={isThreadOpen}
          onClose={() => setIsThreadOpen(false)}
          message={message}
          mentionItems={mentionItems}
          channelName={channelName}
          allMessages={allMessages}
        />
      )}

      {isForwardModalOpen && (
        <ForwardMessageModal
          isOpen={isForwardModalOpen}
          onClose={() => setIsForwardModalOpen(false)}
          message={message}
        />
      )}

      {isPostEditModalOpen && (
        <PostEditModal
          isOpen={isPostEditModalOpen}
          onClose={() => setIsPostEditModalOpen(false)}
          message={message}
          onSave={handlePostEditSave}
        />
      )}
    </div>
  );
}

export default ChannelMessageItem;
