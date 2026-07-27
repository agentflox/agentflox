"use client";

import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import {
    MessageSquare, Plus, Paperclip, AtSign, Smile, Send, Pencil,
    Reply, MoreHorizontal, SmilePlus, ThumbsUp, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import EmojiPicker, { EmojiClickData, Theme, Emoji } from "emoji-picker-react";
import { renderCommentText } from "@/features/dashboard/components/comments/CommentsPanel";

interface TaskCommentPopoverProps {
    taskId: string;
    commentCount?: number;
    workspaceMembers?: Array<{ id: string; name: string; image?: string | null }>;
    trigger?: React.ReactNode;
}

function emojiToUnified(emoji: string): string {
    return Array.from(emoji)
        .map((c) => c.codePointAt(0)!.toString(16).padStart(4, "0"))
        .join("-");
}

export function TaskCommentPopover({
    taskId,
    commentCount = 0,
    workspaceMembers = [],
    trigger,
}: TaskCommentPopoverProps) {
    const [open, setOpen] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    const [replyingToId, setReplyingToId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [reactionPickerId, setReactionPickerId] = useState<string | null>(null);
    const [activePopoverId, setActivePopoverId] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { data: session } = useSession();
    const currentUserId = session?.user?.id ?? "";
    const utils = trpc.useUtils();

    const { data: taskData } = trpc.task.get.useQuery(
        { id: taskId },
        { enabled: open && !!taskId }
    );

    const comments: any[] = (taskData?.comments ?? []).filter((c: any) => !c.parentId);

    const mentionItems = workspaceMembers.map((m) => ({ title: m.name, type: "user" as const }));

    const invalidate = useCallback(() => utils.task.get.invalidate({ id: taskId }), [utils, taskId]);

    const createComment = trpc.task.comment.create.useMutation({ onSuccess: invalidate });
    const updateComment = trpc.task.comment.update.useMutation({ onSuccess: invalidate });
    const deleteComment = trpc.task.comment.delete.useMutation({ onSuccess: invalidate });
    const reactComment = trpc.task.comment.react.useMutation({ onSuccess: invalidate });

    const formatTime = (date: string | Date) =>
        formatDistanceToNow(new Date(date), { addSuffix: true });

    // ── Reaction footer ───────────────────────────────────────────────────────
    const renderReactionFooter = (comment: any) => {
        const reactions: any[] = comment.reactions ?? [];
        const seenEmojis = new Set<string>();
        const orderedEmojis: string[] = [];
        for (const r of reactions) {
            if (!seenEmojis.has(r.emoji)) { seenEmojis.add(r.emoji); orderedEmojis.push(r.emoji); }
        }
        const reactionMap = reactions.reduce((acc: any, r: any) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {});
        const hasLiked = reactions.some((r: any) => r.emoji === "👍" && r.userId === currentUserId);

        return (
            <div className="flex items-center gap-1 flex-wrap">
                {orderedEmojis.map((emoji) => {
                    const count = reactionMap[emoji];
                    const hasReacted = reactions.some((r: any) => r.emoji === emoji && r.userId === currentUserId);
                    return (
                        <Button
                            key={emoji}
                            variant="outline"
                            size="sm"
                            className={cn(
                                "h-6 px-1.5 py-0 text-xs gap-1 rounded-full border transition-colors",
                                hasReacted
                                    ? "border-indigo-300 bg-indigo-50 text-indigo-700 font-medium"
                                    : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                            )}
                            onClick={() => reactComment.mutate({ commentId: comment.id, emoji })}
                        >
                            <Emoji unified={emojiToUnified(emoji)} size={12} />
                            <span>{count as React.ReactNode}</span>
                        </Button>
                    );
                })}
                {!hasLiked && !reactionMap["👍"] && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full"
                        onClick={() => reactComment.mutate({ commentId: comment.id, emoji: "👍" })}
                    >
                        <ThumbsUp className="h-3.5 w-3.5" />
                    </Button>
                )}
                <Popover
                    open={reactionPickerId === comment.id}
                    onOpenChange={(o) => setReactionPickerId(o ? comment.id : null)}
                >
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full">
                            <SmilePlus className="h-3.5 w-3.5" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" side="top" className="w-auto p-0 border-none shadow-none bg-transparent">
                        <EmojiPicker
                            onEmojiClick={(data) => {
                                reactComment.mutate({ commentId: comment.id, emoji: data.emoji });
                                setReactionPickerId(null);
                            }}
                            theme={Theme.LIGHT}
                        />
                    </PopoverContent>
                </Popover>
            </div>
        );
    };

    // ── Single comment card ───────────────────────────────────────────────────
    const renderCommentCard = (comment: any, isReply = false) => {
        const isOwn = comment.userId === currentUserId;
        const replies: any[] = comment.replies ?? [];
        const isExpanded = expandedReplies.has(comment.id);
        const isReplyingHere = replyingToId === comment.id;

        return (
            <div key={comment.id} className="space-y-2">
                <div className={cn("bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm group", isReply && "border-zinc-100 shadow-none")}>
                    {/* Body */}
                    <div className="p-3 pb-2 relative">
                        <div className="flex items-center justify-between mb-2 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <Avatar className="h-6 w-6 shrink-0">
                                    <AvatarImage src={comment.user?.image ?? undefined} />
                                    <AvatarFallback className="bg-slate-600 text-white text-[10px]">
                                        {(comment.user?.name || "U").substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-semibold text-zinc-900 truncate">{comment.user?.name || "Unknown"}</span>
                                <span className="text-xs text-zinc-400 group-hover:hidden shrink-0 whitespace-nowrap">{formatTime(comment.createdAt)}</span>
                                {comment.isEdited && <span className="text-[10px] text-zinc-400 italic shrink-0">(edited)</span>}
                            </div>

                            {/* Hover actions */}
                            <div className={cn(
                                "items-center gap-1 bg-white/90 backdrop-blur-sm rounded-md border border-zinc-100 shadow-sm px-1 py-0.5 absolute right-3 top-2 z-10",
                                activePopoverId === `more-${comment.id}` ? "flex" : "hidden group-hover:flex"
                            )}>
                                {isOwn && (
                                    <Button
                                        variant="ghost" size="icon"
                                        className="h-6 w-6 text-zinc-500 hover:bg-zinc-100 rounded-sm"
                                        onClick={() => { setEditingCommentId(comment.id); setEditText(comment.content || ""); }}
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                                {!isReply && (
                                    <Button
                                        variant="ghost" size="icon"
                                        className="h-6 w-6 text-zinc-500 hover:bg-zinc-100 rounded-sm"
                                        onClick={() => {
                                            setReplyingToId(replyingToId === comment.id ? null : comment.id);
                                            setReplyText("");
                                            setExpandedReplies((prev) => new Set([...prev, comment.id]));
                                        }}
                                    >
                                        <Reply className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                                {isOwn && (
                                    <Popover
                                        open={activePopoverId === `more-${comment.id}`}
                                        onOpenChange={(o) => setActivePopoverId(o ? `more-${comment.id}` : null)}
                                    >
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:bg-zinc-100 rounded-sm">
                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent align="end" className="w-[150px] p-1 rounded-xl shadow-lg border-zinc-200">
                                            <div
                                                className="px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-md cursor-pointer font-medium"
                                                onClick={() => { deleteComment.mutate({ commentId: comment.id }); setActivePopoverId(null); }}
                                            >
                                                Delete comment
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                )}
                            </div>
                        </div>

                        {/* Content / edit */}
                        {editingCommentId === comment.id ? (
                            <div className="mt-1 flex flex-col gap-2">
                                <textarea
                                    className="w-full text-sm resize-none border border-zinc-200 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    rows={3}
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setEditingCommentId(null)}>Cancel</Button>
                                    <Button
                                        size="sm"
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                        onClick={() => {
                                            if (editText.trim()) updateComment.mutate({ commentId: comment.id, content: editText });
                                            setEditingCommentId(null);
                                        }}
                                    >
                                        Save
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                                {renderCommentText(comment.content || "", mentionItems, true)}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-3 py-2 border-t border-zinc-100 flex items-center justify-between gap-2">
                        {renderReactionFooter(comment)}
                        {!isReply && (
                            replies.length > 0 ? (
                                <Button
                                    variant="ghost" size="sm"
                                    className="h-6 text-xs text-zinc-500 hover:text-zinc-800 px-2 rounded-sm font-semibold gap-2 shrink-0"
                                    onClick={() => setExpandedReplies((prev) => {
                                        const next = new Set(prev);
                                        if (isExpanded) next.delete(comment.id); else next.add(comment.id);
                                        return next;
                                    })}
                                >
                                    {replies.length} {replies.length === 1 ? "reply" : "replies"}
                                </Button>
                            ) : (
                                <Button
                                    variant="ghost" size="sm"
                                    className="h-6 text-xs text-zinc-500 hover:text-zinc-800 px-2 rounded-sm font-semibold shrink-0"
                                    onClick={() => { setReplyingToId(comment.id); setExpandedReplies((prev) => new Set([...prev, comment.id])); }}
                                >
                                    Reply
                                </Button>
                            )
                        )}
                    </div>
                </div>

                {/* Replies */}
                {!isReply && isExpanded && replies.length > 0 && (
                    <div className="ml-5 space-y-2">
                        {replies.map((reply: any) => renderCommentCard(reply, true))}
                    </div>
                )}

                {/* Reply composer */}
                {!isReply && isReplyingHere && (
                    <div className="ml-5">
                        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm focus-within:ring-1 focus-within:ring-zinc-300 relative">
                            <div className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words overflow-hidden p-3 text-[13px]">
                                {replyText
                                    ? renderCommentText(replyText, mentionItems)
                                    : <span className="text-zinc-400">Reply…</span>}
                            </div>
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                className="w-full resize-none border-0 focus:outline-none focus:ring-0 bg-transparent text-transparent caret-zinc-900 relative z-10 max-h-[100px] min-h-[48px] p-3 text-[13px]"
                                rows={2}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        if (replyText.trim()) {
                                            createComment.mutate({ taskId, content: replyText, parentId: comment.id });
                                            setReplyText(""); setReplyingToId(null);
                                        }
                                    }
                                    if (e.key === "Escape") { setReplyingToId(null); setReplyText(""); }
                                }}
                            />
                            <div className="flex items-center justify-end p-1.5 pt-0 gap-2">
                                <Button
                                    variant="ghost" size="sm"
                                    className="h-6 text-xs text-zinc-500"
                                    onClick={() => { setReplyingToId(null); setReplyText(""); }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="icon"
                                    className={cn("h-6 w-6 rounded-full transition-colors", replyText.trim() ? "bg-indigo-600 text-white hover:bg-indigo-700" : "text-zinc-400 hover:bg-zinc-100")}
                                    onClick={() => {
                                        if (replyText.trim()) {
                                            createComment.mutate({ taskId, content: replyText, parentId: comment.id });
                                            setReplyText(""); setReplyingToId(null);
                                        }
                                    }}
                                >
                                    <Send className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {trigger ? (
                    trigger
                ) : (
                    <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                            "flex items-center gap-1.5 text-xs rounded-md px-1.5 py-1 transition-colors cursor-pointer",
                            commentCount > 0
                                ? "text-zinc-700 hover:bg-zinc-100"
                                : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
                        )}
                    >
                        <MessageSquare className="h-3.5 w-3.5" />
                        {commentCount > 0 && <span className="font-medium">{commentCount}</span>}
                    </button>
                )}
            </PopoverTrigger>

            <PopoverContent
                side="left"
                align="start"
                sideOffset={12}
                collisionPadding={20}
                className="w-[400px] p-0 rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-white shrink-0">
                    <span className="text-sm font-semibold text-zinc-900">
                        Comments {comments.length > 0 && (
                            <span className="ml-1.5 text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-full font-semibold">{comments.length}</span>
                        )}
                    </span>
                    <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                        onClick={() => setOpen(false)}
                    >
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>

                {/* Comments list */}
                <ScrollArea className="flex-1 min-h-0">
                    <div className="p-3 space-y-3 bg-zinc-50/50">
                        {comments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <MessageSquare className="h-10 w-10 text-zinc-200 stroke-1 mb-3" />
                                <p className="text-sm font-medium text-zinc-500">No comments yet</p>
                                <p className="text-xs text-zinc-400 mt-1">Be the first to leave a comment</p>
                            </div>
                        ) : (
                            comments.map((comment: any) => renderCommentCard(comment))
                        )}
                    </div>
                </ScrollArea>

                {/* Composer */}
                <div className="p-3 border-t border-zinc-100 bg-white shrink-0">
                    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm focus-within:ring-1 focus-within:ring-zinc-300 focus-within:border-zinc-300 transition-shadow relative">
                        <div className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words overflow-hidden p-3 text-[13px]">
                            {commentText
                                ? renderCommentText(commentText, mentionItems)
                                : <span className="text-zinc-400">Comment or type '/' for commands and AI actions</span>}
                        </div>
                        <textarea
                            ref={textareaRef}
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            className="w-full resize-none border-0 focus:outline-none focus:ring-0 bg-transparent text-transparent caret-zinc-900 relative z-10 max-h-[120px] min-h-[56px] p-3 text-[13px]"
                            placeholder=""
                            rows={2}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    if (commentText.trim()) {
                                        createComment.mutate({ taskId, content: commentText });
                                        setCommentText("");
                                    }
                                }
                            }}
                        />
                        <div className="flex items-center justify-between p-2 pt-0">
                            <div className="flex items-center text-zinc-400 gap-0.5">
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-zinc-100 hover:text-zinc-700">
                                    <Plus className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-zinc-100 hover:text-zinc-700">
                                    <Paperclip className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-zinc-100 hover:text-zinc-700">
                                    <AtSign className="h-3.5 w-3.5" />
                                </Button>
                                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-zinc-100 hover:text-zinc-700">
                                            <Smile className="h-3.5 w-3.5" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent side="top" align="start" sideOffset={8} className="p-0 border-none shadow-xl w-auto bg-transparent">
                                        <EmojiPicker
                                            theme={Theme.LIGHT}
                                            onEmojiClick={(data: EmojiClickData) => {
                                                setCommentText((prev) => prev + data.emoji);
                                                setShowEmojiPicker(false);
                                                textareaRef.current?.focus();
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <Button
                                size="icon"
                                className={cn(
                                    "h-7 w-7 rounded-full transition-colors",
                                    commentText.trim()
                                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                        : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                                )}
                                onClick={() => {
                                    if (commentText.trim()) {
                                        createComment.mutate({ taskId, content: commentText });
                                        setCommentText("");
                                    }
                                }}
                                disabled={createComment.isPending}
                            >
                                {createComment.isPending
                                    ? <div className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    : <Send className="h-3.5 w-3.5" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
