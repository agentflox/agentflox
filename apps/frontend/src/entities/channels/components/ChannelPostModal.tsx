"use client";

import { useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, Share, MoreHorizontal, Lightbulb, Bell, Megaphone, MessageCircle, Pencil, BookMarked, Link2, AlarmClock, BellRing, Trash2, ThumbsUp, SmilePlus, ChevronRight } from "lucide-react";
import { renderCommentText } from "@/utils/textRendering";
import { useChannels } from "../hooks/useChannels";
import { ChannelMessageItem } from "./ChannelMessageItem";
import { ChannelMessageComposer } from "./ChannelMessageComposer";
import { ForwardMessageModal } from "./ForwardMessageModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createPortal } from "react-dom";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChannelPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: any;
  mentionItems: any[];
  channelName: string;
}

export default function ChannelPostModal({ isOpen, onClose, message, mentionItems, channelName }: ChannelPostModalProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const [alsoSend, setAlsoSend] = useState(false);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const { messages: threadMessages, toggleReaction } = useChannels({ channelId: message.channelId });
  const replies = (threadMessages || []).filter(m => m.parentId === message.id);
  const currentMessage = threadMessages?.find(m => m.id === message.id) || message;

  const reactionCounts = useMemo(() => {
    const raw = Array.isArray(currentMessage.reactions) ? (currentMessage.reactions as Array<{ userId: string; emoji: string }>) : [];
    return raw.reduce((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [currentMessage.reactions]);

  const userReactions = useMemo(() => {
    const raw = Array.isArray(currentMessage.reactions) ? (currentMessage.reactions as Array<{ userId: string; emoji: string }>) : [];
    return raw.filter((r) => r.userId === currentUserId).map((r) => r.emoji);
  }, [currentMessage.reactions, currentUserId]);

  const displayLabel = currentMessage.user?.name || currentMessage.user?.email || "Member";
  const initials = displayLabel.slice(0, 2).toUpperCase();
  const t = currentMessage.type?.toLowerCase() || 'message';

  const isAnnouncement = t === 'announcement';
  const isDiscussion = t === 'discussion';
  const isIdea = t === 'idea';
  const isUpdate = t === 'update';

  if (!isOpen) return null;

  const modalRoot = typeof document !== 'undefined' ? document.getElementById("channel-post-modal-root") : null;

  const modalContent = (
    <>
      {/* Backdrop — absolute so it fills only the message container */}
      <div
        className="absolute inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Modal card — centered inside the container */}
      <div className="absolute inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-[840px] max-h-[90%] flex flex-col bg-white rounded-2xl shadow-2xl border-0 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
              <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-md transition-colors cursor-pointer">
                <ChevronDown className="h-4 w-4 rotate-90" />
              </button>
              <span className="text-slate-400">{channelName}</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-800 font-semibold">{message.title || "Post"}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500">
              <Button onClick={() => setIsForwardModalOpen(true)} variant="ghost" size="icon" className="h-8 w-8 rounded-md cursor-pointer">
                <Share className="h-4 w-4" />
              </Button>

              <Popover open={showMoreMenu} onOpenChange={setShowMoreMenu}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md cursor-pointer">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-1 shadow-xl border border-gray-200" align="end" sideOffset={4}>
                  <div className="flex flex-col">
                    {currentMessage.userId === currentUserId && (
                      <button
                        onClick={() => { toast.info('Edit clicked'); setShowMoreMenu(false); }}
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
                      onClick={() => { toast.info('Marked as unread'); setShowMoreMenu(false); }}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-gray-100 rounded-md transition-colors text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-3">
                        <BookMarked className="h-3.5 w-3.5 text-gray-500" />
                        <span className="font-normal text-gray-700">Mark as unread</span>
                      </span>
                      <span className="text-[11px] text-gray-400">U</span>
                    </button>

                    <button
                      onClick={() => { navigator.clipboard.writeText(currentMessage.content); toast.success('Copied link'); setShowMoreMenu(false); }}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-gray-100 rounded-md transition-colors text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-3">
                        <Link2 className="h-3.5 w-3.5 text-gray-500" />
                        <span className="font-normal text-gray-700">Copy link</span>
                      </span>
                      <span className="text-[11px] text-gray-400">C</span>
                    </button>

                    <div className="my-1 h-px bg-gray-100" />

                    <button
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-gray-100 rounded-md transition-colors text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-3">
                        <AlarmClock className="h-3.5 w-3.5 text-gray-500" />
                        <span className="font-normal text-gray-700">Remind me in Inbox</span>
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                    </button>

                    <button
                      className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-100 rounded-md transition-colors text-left cursor-pointer"
                    >
                      <BellRing className="h-3.5 w-3.5 text-gray-500" />
                      <span className="font-normal text-gray-700">Turn off notifications for replies</span>
                    </button>

                    {currentMessage.userId === currentUserId && (
                      <>
                        <div className="my-1 h-px bg-gray-100" />
                        <button
                          onClick={() => { toast.error('Delete clicked'); setShowMoreMenu(false); }}
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
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto bg-white px-8 py-4">
            <div className="max-w-3xl mx-auto">
              {/* Title */}
              <h1 className="text-md font-bold text-slate-900 mb-2">{message.title}</h1>

              {/* Author & Meta */}
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={message.user?.image || undefined} />
                  <AvatarFallback className="bg-slate-800 text-white">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <div className="font-semibold text-slate-900 text-xs">{displayLabel}</div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span>in {channelName}</span>
                    <span>·</span>
                    <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <span>·</span>
                    {isIdea && <span className="flex items-center gap-1 text-amber-600 font-medium"><Lightbulb className="h-3.5 w-3.5" /> Idea</span>}
                    {isAnnouncement && <span className="flex items-center gap-1 text-red-600 font-medium"><Megaphone className="h-3.5 w-3.5" /> Announcement</span>}
                    {isDiscussion && <span className="flex items-center gap-1 text-pink-600 font-medium"><MessageCircle className="h-3.5 w-3.5" /> Discussion</span>}
                    {isUpdate && <span className="flex items-center gap-1 text-blue-600 font-medium"><Bell className="h-3.5 w-3.5" /> Update</span>}
                  </div>
                </div>
              </div>

              {/* Reactions */}
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(reactionCounts).map(([emoji, count]) => {
                  const userHasReacted = userReactions.includes(emoji);
                  return (
                    <button
                      key={emoji}
                      onClick={() => void toggleReaction(currentMessage.id, emoji)}
                      className={cn(
                        "text-[13px] px-2 py-1 rounded-full flex items-center gap-1.5 transition-colors",
                        userHasReacted
                          ? "bg-indigo-50 border border-indigo-200 text-indigo-700"
                          : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <span>{emoji}</span>
                      <span className="font-medium">{count}</span>
                    </button>
                  );
                })}

                {!reactionCounts['👍'] && (
                  <button
                    onClick={() => void toggleReaction(currentMessage.id, '👍')}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                )}

                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <PopoverTrigger asChild>
                    <button
                      onClick={() => setShowEmojiPicker(true)}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                      <SmilePlus className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" side="top" className="p-0 w-auto border-none shadow-none z-50">
                    <EmojiPicker
                      theme={Theme.LIGHT}
                      onEmojiClick={(emojiData) => {
                        void toggleReaction(currentMessage.id, emojiData.emoji);
                        setShowEmojiPicker(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Separator className="my-4" />

              {/* Post Body */}
              <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed mb-6">
                {renderCommentText(message.content, mentionItems, true)}
              </div>

              <Separator className="my-4" />

              {/* Replies Section */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-900">{replies.length} Reply</h3>
              </div>

              {/* List of Replies */}
              <div className="flex flex-col gap-4">
                {replies.map((reply: any) => (
                  <ChannelMessageItem key={reply.id} message={reply} mentionItems={mentionItems} />
                ))}
              </div>

              {/* Thread Composer */}
              <ChannelMessageComposer
                className="w-full p-0 pt-6"
                channelId={message.channelId}
                mentionItems={mentionItems}
                placeholder="Reply, press 'space' for AI, '/' for commands"
                parentId={message.id}
                alsoSendToChannel={alsoSend}
                bottomSlot={
                  <div className="px-3 pb-2 flex items-center gap-2">
                    <input type="checkbox" id="also-send" checked={alsoSend} onChange={e => setAlsoSend(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                    <label htmlFor="also-send" className="text-xs text-slate-600 font-normal cursor-pointer">Also send to #{channelName}</label>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      </div>

      {isForwardModalOpen && (
        <ForwardMessageModal
          isOpen={isForwardModalOpen}
          onClose={() => setIsForwardModalOpen(false)}
          message={currentMessage}
        />
      )}
    </>
  );

  if (modalRoot) {
    return createPortal(modalContent, modalRoot);
  }

  // Fallback if portal root not found
  return modalContent;
}
