'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, formatDistanceToNow } from 'date-fns';
import {
    Search, Bell, SlidersHorizontal, ChevronRight, Bot,
    LayoutList, Smile, Send, Paperclip, AtSign, Plus,
    Pencil, MoreHorizontal, Reply, ThumbsUp, SmilePlus, X,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import EmojiPicker, { Theme, EmojiClickData, Emoji } from 'emoji-picker-react';
import { cn } from '@/lib/utils';
import { ACTIVITY_FILTER_OPTIONS } from './TaskDetailModal';
import { renderCommentText } from '@/features/dashboard/components/comments/CommentsPanel';
import { trpc } from '@/lib/trpc';

export interface TaskActivityPanelProps {
    task: any;
    workspaceMembers: any[];
    currentUserId: string;
    filteredActivity: any[];
    activityFilterOpen: boolean;
    setActivityFilterOpen: (open: boolean) => void;
    activityFilterTypes: Set<string>;
    setActivityFilterTypes: React.Dispatch<React.SetStateAction<Set<string>>>;
    createComment: any;
    commentText: string;
    setCommentText: (text: string) => void;
    showEmojiPicker: boolean;
    setShowEmojiPicker: (show: boolean) => void;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    handleEmojiClick: (emojiData: EmojiClickData) => void;
}

/** Convert emoji character to unified code for the Emoji display component. */
function emojiToUnified(emoji: string): string {
    return Array.from(emoji)
        .map((c) => c.codePointAt(0)!.toString(16).padStart(4, '0'))
        .join('-');
}

export function TaskActivityPanel({
    task,
    workspaceMembers,
    currentUserId,
    filteredActivity,
    activityFilterOpen,
    setActivityFilterOpen,
    activityFilterTypes,
    setActivityFilterTypes,
    createComment,
    commentText,
    setCommentText,
    showEmojiPicker,
    setShowEmojiPicker,
    textareaRef,
    handleEmojiClick,
}: TaskActivityPanelProps) {
    const utils = trpc.useUtils();

    // Per-comment UI state
    const [editingCommentId, setEditingCommentId] = React.useState<string | null>(null);
    const [editText, setEditText] = React.useState('');
    const [replyingToId, setReplyingToId] = React.useState<string | null>(null);
    const [replyText, setReplyText] = React.useState('');
    const [reactionPickerId, setReactionPickerId] = React.useState<string | null>(null);
    const [activePopoverId, setActivePopoverId] = React.useState<string | null>(null);
    const [expandedReplies, setExpandedReplies] = React.useState<Set<string>>(new Set());

    const mentionItems = workspaceMembers.map((m) => ({ title: m.name, type: 'user' as const }));

    const formatTime = (date: Date | string) =>
        formatDistanceToNow(new Date(date), { addSuffix: true });

    const invalidate = () => utils.task.get.invalidate({ id: task.id });

    // Mutations
    const updateComment = trpc.task.comment.update.useMutation({ onSuccess: invalidate });
    const deleteComment = trpc.task.comment.delete.useMutation({ onSuccess: invalidate });
    const reactComment = trpc.task.comment.react.useMutation({ onSuccess: invalidate });

    // ── Reaction footer ───────────────────────────────────────────────────────
    const renderReactionFooter = (comment: any) => {
        const reactions: any[] = comment.reactions || [];

        const seenEmojis = new Set<string>();
        const orderedEmojis: string[] = [];
        for (const r of reactions) {
            if (!seenEmojis.has(r.emoji)) {
                seenEmojis.add(r.emoji);
                orderedEmojis.push(r.emoji);
            }
        }

        const reactionMap = reactions.reduce((acc: any, r: any) => {
            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
            return acc;
        }, {});

        const hasLiked = reactions.some((r: any) => r.emoji === '👍' && r.userId === currentUserId);

        return (
            <div className="flex items-center gap-1 flex-wrap">
                {orderedEmojis.map((emoji) => {
                    const count = reactionMap[emoji];
                    const hasReacted = reactions.some(
                        (r: any) => r.emoji === emoji && r.userId === currentUserId
                    );
                    return (
                        <Button
                            key={emoji}
                            variant="outline"
                            size="sm"
                            className={cn(
                                'h-6 px-1.5 py-0 text-xs gap-1 rounded-full border transition-colors',
                                hasReacted
                                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700 font-medium'
                                    : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                            )}
                            onClick={() => reactComment.mutate({ commentId: comment.id, emoji })}
                        >
                            <Emoji unified={emojiToUnified(emoji)} size={13} />
                            <span>{count as React.ReactNode}</span>
                        </Button>
                    );
                })}

                {!hasLiked && !reactionMap['👍'] && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full"
                        onClick={() => reactComment.mutate({ commentId: comment.id, emoji: '👍' })}
                    >
                        <ThumbsUp className="h-3.5 w-3.5" />
                    </Button>
                )}

                <Popover
                    open={reactionPickerId === comment.id}
                    onOpenChange={(open) => setReactionPickerId(open ? comment.id : null)}
                >
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full"
                        >
                            <SmilePlus className="h-3.5 w-3.5" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent
                        align="start"
                        side="top"
                        className="w-auto p-0 border-none shadow-none bg-transparent"
                    >
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

        return (
            <div
                key={comment.id}
                className={cn(
                    'bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm group',
                    isReply && 'border-zinc-100 shadow-none'
                )}
            >
                {/* Body */}
                <div className="p-3 pb-2 relative">
                    <div className="flex items-center justify-between mb-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-6 w-6 shrink-0">
                                <AvatarImage src={comment.user?.image ?? undefined} />
                                <AvatarFallback className="bg-slate-600 text-white text-[10px]">
                                    {(comment.user?.name || 'U').substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-semibold text-zinc-900 truncate">
                                {comment.user?.name || 'Unknown'}
                            </span>
                            <span className="text-xs text-zinc-400 group-hover:hidden shrink-0 whitespace-nowrap">
                                {formatTime(comment.createdAt)}
                            </span>
                            {comment.isEdited && (
                                <span className="text-[10px] text-zinc-400 italic shrink-0">(edited)</span>
                            )}
                        </div>

                        {/* Hover actions */}
                        <div
                            className={cn(
                                'items-center gap-1 bg-white/90 backdrop-blur-sm rounded-md border border-zinc-100 shadow-sm px-1 py-0.5 absolute right-3 top-2 z-10',
                                activePopoverId === `more-${comment.id}` ? 'flex' : 'hidden group-hover:flex'
                            )}
                        >
                            {isOwn && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-zinc-500 hover:bg-zinc-100 rounded-sm"
                                    onClick={() => {
                                        setEditingCommentId(comment.id);
                                        setEditText(comment.content || '');
                                    }}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                            )}
                            {!isReply && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-zinc-500 hover:bg-zinc-100 rounded-sm"
                                    onClick={() => {
                                        setReplyingToId(replyingToId === comment.id ? null : comment.id);
                                        setReplyText('');
                                        // auto-expand replies
                                        setExpandedReplies((prev) => new Set([...prev, comment.id]));
                                    }}
                                >
                                    <Reply className="h-3.5 w-3.5" />
                                </Button>
                            )}
                            {isOwn && (
                                <Popover
                                    open={activePopoverId === `more-${comment.id}`}
                                    onOpenChange={(open) =>
                                        setActivePopoverId(open ? `more-${comment.id}` : null)
                                    }
                                >
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-zinc-500 hover:bg-zinc-100 rounded-sm"
                                        >
                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        align="end"
                                        className="w-[150px] p-1 rounded-xl shadow-lg border-zinc-200"
                                    >
                                        <div
                                            className="px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-md cursor-pointer font-medium"
                                            onClick={() => {
                                                deleteComment.mutate({ commentId: comment.id });
                                                setActivePopoverId(null);
                                            }}
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
                                <Button variant="ghost" size="sm" onClick={() => setEditingCommentId(null)}>
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                    onClick={() => {
                                        if (editText.trim()) {
                                            updateComment.mutate({
                                                commentId: comment.id,
                                                content: editText,
                                            });
                                        }
                                        setEditingCommentId(null);
                                    }}
                                >
                                    Save
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                            {renderCommentText(comment.content || '', mentionItems, true)}
                        </div>
                    )}
                </div>

                {/* Footer: reactions + reply toggle */}
                {!isReply && (
                    <div className="px-3 py-2 border-t border-zinc-100 flex items-center justify-between gap-2">
                        {renderReactionFooter(comment)}

                        {/* Reply toggle */}
                        {(() => {
                            const replies: any[] = comment.replies || [];
                            const isExpanded = expandedReplies.has(comment.id);

                            if (replies.length > 0) {
                                const repliers = Array.from(
                                    new Map(replies.map((r: any) => [r.user?.id, r.user])).values()
                                ).filter(Boolean);
                                return (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs text-zinc-500 hover:text-zinc-800 px-2 rounded-sm font-semibold gap-2 shrink-0"
                                        onClick={() =>
                                            setExpandedReplies((prev) => {
                                                const next = new Set(prev);
                                                if (isExpanded) next.delete(comment.id);
                                                else next.add(comment.id);
                                                return next;
                                            })
                                        }
                                    >
                                        <span>
                                            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                                        </span>
                                        <div className="flex -space-x-1.5">
                                            {repliers.slice(0, 3).map((u: any) => (
                                                <Avatar key={u.id} className="h-5 w-5 ring-2 ring-white">
                                                    <AvatarImage src={u.image ?? undefined} />
                                                    <AvatarFallback className="text-[9px] bg-zinc-200 text-zinc-700">
                                                        {(u.name || 'U').substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                            ))}
                                            {repliers.length > 3 && (
                                                <div className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 ring-2 ring-white text-[8px] font-medium text-zinc-600">
                                                    +{repliers.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    </Button>
                                );
                            }

                            return (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs text-zinc-500 hover:text-zinc-800 px-2 rounded-sm font-semibold shrink-0"
                                    onClick={() => {
                                        setReplyingToId(comment.id);
                                        setExpandedReplies((prev) => new Set([...prev, comment.id]));
                                    }}
                                >
                                    Reply
                                </Button>
                            );
                        })()}
                    </div>
                )}

                {/* Reaction footer for replies */}
                {isReply && (
                    <div className="px-3 py-2 border-t border-zinc-100">
                        {renderReactionFooter(comment)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            {/* Header */}
            <div className="p-3 border-b border-zinc-100 flex items-center justify-between bg-white shrink-0">
                <span className="text-base font-semibold text-zinc-900">Activity</span>
                <div className="flex items-center gap-0.5">
                    <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Search">
                        <Search className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 relative" aria-label="Notifications">
                        <Bell className="h-4 w-4" />
                        {filteredActivity.length > 0 && (
                            <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-purple-500 px-1 text-[10px] font-medium text-white">
                                {filteredActivity.length > 99 ? '99+' : filteredActivity.length}
                            </span>
                        )}
                    </Button>
                    <Popover open={activityFilterOpen} onOpenChange={setActivityFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Filter activities">
                                <SlidersHorizontal className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-0" align="end">
                            <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
                                <span className="text-sm font-semibold text-zinc-900">Activities</span>
                                <button
                                    type="button"
                                    className="text-xs text-zinc-500 hover:text-zinc-700 cursor-pointer"
                                    onClick={() => setActivityFilterTypes(new Set())}
                                >
                                    Unselect All
                                </button>
                            </div>
                            <ScrollArea className="max-h-[280px]">
                                <div className="p-2 space-y-0.5">
                                    {ACTIVITY_FILTER_OPTIONS.map((opt) => {
                                        const Icon = opt.icon;
                                        const checked = activityFilterTypes.has(opt.id);
                                        return (
                                            <label
                                                key={opt.id}
                                                className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-zinc-50 cursor-pointer"
                                            >
                                                <Checkbox
                                                    checked={checked}
                                                    onCheckedChange={(c) => {
                                                        setActivityFilterTypes((prev) => {
                                                            const next = new Set(prev);
                                                            if (c) next.add(opt.id);
                                                            else next.delete(opt.id);
                                                            return next;
                                                        });
                                                    }}
                                                />
                                                <Icon className="h-4 w-4 text-zinc-500 shrink-0" />
                                                <span className="text-sm text-zinc-900 truncate">{opt.label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Feed */}
            <div className="flex-1 min-h-0 bg-zinc-50/50">
                <ScrollArea className="h-full">
                    <div className="p-4">
                        {activityFilterTypes.size === 0 && (
                            <p className="text-sm text-zinc-500 py-4">
                                Select activity types in the filter to view activities.
                            </p>
                        )}
                        {activityFilterTypes.size > 0 && filteredActivity.length > 3 && (
                            <button
                                type="button"
                                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 mb-3 cursor-pointer"
                            >
                                <ChevronRight className="h-3.5 w-3.5" /> Show more
                            </button>
                        )}
                        <div className="space-y-4">
                            {filteredActivity.map((item: any, i: number) => {
                                const isAgent = !!(item.agentId ?? item.agentName ?? item.sourceType === 'AGENT');
                                const displayName = isAgent
                                    ? item.agentName || 'Automation Agent'
                                    : item.user?.name ?? 'Someone';

                                // ── Comment card ─────────────────────────────
                                if (item.type === 'comment') {
                                    const replies: any[] = item.replies || [];
                                    const isExpanded = expandedReplies.has(item.id);
                                    const isReplyingHere = replyingToId === item.id;

                                    return (
                                        <div key={item.id || i} className="space-y-2">
                                            {renderCommentCard(item)}

                                            {/* Replies list */}
                                            {isExpanded && replies.length > 0 && (
                                                <div className="ml-6 space-y-2">
                                                    {replies.map((reply: any) => renderCommentCard(reply, true))}
                                                </div>
                                            )}

                                            {/* Reply composer */}
                                            {isReplyingHere && (
                                                <div className="ml-6">
                                                    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm focus-within:ring-1 focus-within:ring-zinc-300 focus-within:border-zinc-300 transition-shadow relative">
                                                        <div className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words overflow-hidden p-3 text-[13px]">
                                                            {replyText ? (
                                                                renderCommentText(replyText, mentionItems)
                                                            ) : (
                                                                <span className="text-zinc-400">Reply…</span>
                                                            )}
                                                        </div>
                                                        <textarea
                                                            value={replyText}
                                                            onChange={(e) => setReplyText(e.target.value)}
                                                            className="w-full resize-none border-0 focus:outline-none focus:ring-0 bg-transparent text-transparent caret-zinc-900 relative z-10 max-h-[120px] min-h-[52px] p-3 text-[13px]"
                                                            rows={2}
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    if (replyText.trim()) {
                                                                        createComment.mutate({
                                                                            taskId: task.id,
                                                                            content: replyText,
                                                                            parentId: item.id,
                                                                        });
                                                                        setReplyText('');
                                                                        setReplyingToId(null);
                                                                    }
                                                                }
                                                                if (e.key === 'Escape') {
                                                                    setReplyingToId(null);
                                                                    setReplyText('');
                                                                }
                                                            }}
                                                        />
                                                        <div className="flex items-center justify-end p-1.5 pt-0 gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 text-xs text-zinc-500"
                                                                onClick={() => {
                                                                    setReplyingToId(null);
                                                                    setReplyText('');
                                                                }}
                                                            >
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                className={cn(
                                                                    'h-6 w-6 rounded-full transition-colors',
                                                                    replyText.trim()
                                                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                                        : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
                                                                )}
                                                                onClick={() => {
                                                                    if (replyText.trim()) {
                                                                        createComment.mutate({
                                                                            taskId: task.id,
                                                                            content: replyText,
                                                                            parentId: item.id,
                                                                        });
                                                                        setReplyText('');
                                                                        setReplyingToId(null);
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
                                }

                                // ── Activity row ─────────────────────────────
                                if (item.action === 'COMMENTED') return null;

                                return (
                                    <div key={item.id || i} className="flex gap-3 text-sm px-1">
                                        {isAgent ? (
                                            <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center mt-0.5 shrink-0">
                                                <Bot className="h-3.5 w-3.5 text-purple-600" />
                                            </div>
                                        ) : (
                                            <div className="h-6 w-6 rounded-full bg-zinc-100 flex items-center justify-center mt-0.5 shrink-0">
                                                <LayoutList className="h-3 w-3 text-zinc-500" />
                                            </div>
                                        )}
                                        <div className="space-y-1 min-w-0 flex-1">
                                            <div className="text-zinc-600">
                                                <span className="font-medium">{displayName}</span>
                                                {' '}
                                                {item.action === 'CREATED'
                                                    ? 'created the task'
                                                    : item.action === 'ASSIGNED'
                                                    ? 'assigned'
                                                    : item.action === 'UNASSIGNED'
                                                    ? 'unassigned'
                                                    : item.action === 'STATUS_CHANGED'
                                                    ? 'updated status'
                                                    : item.action === 'PRIORITY_CHANGED'
                                                    ? 'updated priority'
                                                    : item.action === 'DUE_DATE_CHANGED'
                                                    ? 'updated due date'
                                                    : item.action === 'ATTACHED'
                                                    ? 'added an attachment'
                                                    : item.action === 'COMMENTED'
                                                    ? 'commented'
                                                    : item.action === 'MOVED'
                                                    ? 'moved'
                                                    : 'updated'}
                                                {' '}
                                                {item.field
                                                    ? item.field === 'title'
                                                        ? 'name'
                                                        : item.field === 'statusId'
                                                        ? 'status'
                                                        : item.field === 'listId'
                                                        ? 'list'
                                                        : item.field
                                                    : 'the task'}
                                            </div>
                                            <div className="text-[10px] text-zinc-400">
                                                {format(new Date(item.createdAt), 'MMM d, h:mm a')}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </ScrollArea>
            </div>

            {/* Composer */}
            <div className="p-4 border-t border-zinc-100 bg-white shrink-0">
                <div
                    className={cn(
                        'bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm focus-within:ring-1 focus-within:ring-zinc-300 focus-within:border-zinc-300 transition-shadow relative mt-1'
                    )}
                >
                    <div className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words overflow-hidden p-3 text-[13px]">
                        {commentText ? (
                            renderCommentText(commentText, mentionItems)
                        ) : (
                            <span className="text-zinc-400">Write a comment… @mention for AI</span>
                        )}
                    </div>
                    <textarea
                        ref={textareaRef}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className={cn(
                            'w-full resize-none border-0 focus:outline-none focus:ring-0 bg-transparent text-transparent caret-zinc-900 relative z-10',
                            'max-h-[150px] min-h-[60px] p-3 text-[13px]'
                        )}
                        placeholder=""
                        rows={2}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (commentText.trim()) {
                                    createComment.mutate({ taskId: task.id, content: commentText });
                                    setCommentText('');
                                }
                            }
                        }}
                    />
                    <div className={cn('flex items-center justify-between p-1.5 pt-0')}>
                        <div className={cn('flex items-center text-zinc-400 gap-0.5')}>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-zinc-100 hover:text-zinc-700">
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-zinc-100 hover:text-zinc-700">
                                <Paperclip className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-zinc-100 hover:text-zinc-700">
                                <AtSign className="h-3.5 w-3.5" />
                            </Button>
                            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-zinc-100 hover:text-zinc-700">
                                        <Smile className="h-3.5 w-3.5" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    side="top"
                                    align="center"
                                    sideOffset={16}
                                    className="p-0 border-none shadow-xl w-auto bg-transparent"
                                >
                                    <EmojiPicker theme={Theme.LIGHT} onEmojiClick={handleEmojiClick} />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                'h-6 w-6 rounded-full transition-colors',
                                commentText.trim()
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
                            )}
                            onClick={() => {
                                if (commentText.trim()) {
                                    createComment.mutate({ taskId: task.id, content: commentText });
                                    setCommentText('');
                                }
                            }}
                            disabled={createComment.isPending}
                        >
                            {createComment.isPending ? (
                                <div className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Send className="h-3.5 w-3.5" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
