"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import { useSocket } from "@/components/providers/SocketProvider";
import {
    Bell,
    BellOff,
    X,
    MessageSquare,
    Plus,
    Paperclip,
    AtSign,
    Users,
    Smile,
    Video,
    Mic,
    Send,
    Search,
    Check,
    FileIcon,
    Sparkles,
    Bookmark,
    Pencil,
    Reply,
    Undo,
    MoreHorizontal,
    FileText,
    LayoutDashboard,
    MapPin,
    Hash,
    CheckSquare,
    UserPlus,
    SmilePlus,
    ThumbsUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import EmojiPicker, { EmojiClickData, Theme, Emoji } from 'emoji-picker-react';
import { useParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { storageUtils } from "@/utils/storage/storageUtils";
import { renderCommentText } from "@/utils/textRendering";

export { renderCommentText };

interface CommentsPanelProps {
    documentId: string;
    onClose?: () => void;
    scope?: "workspace" | "space" | "project" | "team";
    workspaceId?: string;
    spaceId?: string;
    projectId?: string;
    teamId?: string;
}

export function CommentsPanel({ documentId, onClose, scope = "workspace", workspaceId, spaceId, projectId, teamId }: CommentsPanelProps) {
    const [activeTab, setActiveTab] = useState("open");
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    const [reactionPickerCommentId, setReactionPickerCommentId] = useState<string | null>(null);
    const [activePopoverId, setActivePopoverId] = useState<string | null>(null);

    const { data: session } = useSession();
    const currentUserId = session?.user?.id;

    const { data: workspace } = trpc.workspace.get.useQuery({ id: workspaceId || "" }, { enabled: scope === "workspace" && !!workspaceId });
    const { data: space } = trpc.space.get.useQuery({ id: spaceId || "" }, { enabled: scope === "space" && !!spaceId });
    const { data: project } = trpc.project.get.useQuery({ id: projectId || "" }, { enabled: scope === "project" && !!projectId });
    const { data: team } = trpc.team.get.useQuery({ id: teamId || "" }, { enabled: scope === "team" && !!teamId });

    let members: any[] = [];
    let teams: any[] = [];

    if (scope === "workspace" && workspace) {
        members = workspace.members.map((m: any) => ({ id: m.user.id, name: m.user.name, image: m.user.image }));
        teams = workspace.teams.map((t: any) => ({ id: t.id, name: t.name, _count: t._count }));
    } else if (scope === "space" && space) {
        members = space.members?.map((m: any) => ({ id: m.user.id, name: m.user.name, image: m.user.image })) || [];
        teams = space.teams?.map((t: any) => ({ id: t.id, name: t.name, _count: t._count }));
    } else if (scope === "project" && project) {
        members = project.members.map((m: any) => ({ id: m.user.id, name: m.user.name, image: m.user.image }));
        teams = project.teams.map((t: any) => ({ id: t.team.id, name: t.team.name, _count: { members: 0 } }));
    } else if (scope === "team" && team) {
        members = team.members.map((m: any) => ({ id: m.user.id, name: m.user.name, image: m.user.image || null }));
        teams = [];
    }

    const { data: tasksData } = trpc.task.list.useQuery(
        { workspaceId, spaceId, projectId, teamId, pageSize: 20, scope: "all", includeRelations: true },
        { enabled: !!(workspaceId || spaceId || projectId || teamId) }
    );
    const { data: docsData } = trpc.document.list.useQuery(
        { workspaceId, spaceId, projectId, teamId, pageSize: 20 },
        { enabled: !!(workspaceId || spaceId || projectId || teamId) }
    );
    const { data: relationships = [] } = trpc.document.listRelationships.useQuery(
        { documentId },
        { enabled: !!documentId }
    );

    const linkedDocs = relationships.filter((r: any) => r.targetType === "DOCUMENT" && r.target).map((r: any) => r.target);
    const linkedTasks = relationships.filter((r: any) => r.targetType === "TASK" && r.target).map((r: any) => r.target);

    const allTasksMap = new Map();
    linkedTasks.forEach(t => allTasksMap.set(t.id, t));
    (tasksData?.items || []).forEach(t => allTasksMap.set(t.id, t));
    const scopedTasks = Array.from(allTasksMap.values());

    const allDocsMap = new Map();
    linkedDocs.forEach(d => allDocsMap.set(d.id, d));
    (docsData?.items || []).forEach(d => allDocsMap.set(d.id, d));
    const scopedDocs = Array.from(allDocsMap.values());

    const mentionItems = useMemo(() => {
        const items: { title: string, type: string, status?: string }[] = [];
        members.forEach(m => {
            if (m.name) items.push({ title: m.name, type: "user" });
        });
        scopedTasks.forEach(t => {
            if (t.title) items.push({ title: t.title, type: "task", status: t.status?.name });
        });
        scopedDocs.forEach(d => {
            if (d.title) items.push({ title: d.title, type: "doc" });
        });
        return items.sort((a, b) => b.title.length - a.title.length);
    }, [members, scopedTasks, scopedDocs]);

    const utils = trpc.useUtils();
    const { socket } = useSocket();
    const { data: commentsResult } = trpc.document.listComments.useQuery(
        { documentId, pageSize: 100 },
        { enabled: !!documentId }
    );
    const allComments = commentsResult?.items ?? [];

    const createComment = trpc.document.createComment.useMutation({
        onSuccess: (data) => {
            utils.document.listComments.invalidate({ documentId });
            if (data?.notifiedUserIds?.length && socket) {
                data.notifiedUserIds.forEach(uid => {
                    socket.emit('notification:send', { userId: uid });
                });
            }
        }
    });
    const updateComment = trpc.document.updateComment.useMutation({
        onSuccess: () => utils.document.listComments.invalidate({ documentId })
    });
    const resolveMutation = trpc.document.resolveComment.useMutation({
        onSuccess: () => utils.document.listComments.invalidate({ documentId })
    });
    const assignMutation = trpc.document.assignComment.useMutation({
        onSuccess: () => utils.document.listComments.invalidate({ documentId })
    });
    const deleteMutation = trpc.document.deleteComment.useMutation({
        onSuccess: () => utils.document.listComments.invalidate({ documentId })
    });
    const reactMutation = trpc.document.reactComment.useMutation({
        onSuccess: () => utils.document.listComments.invalidate({ documentId })
    });

    const rootComments = allComments.filter((c: any) => c.parentId === null);

    const comments = rootComments.filter((c: any) => !c.isResolved && (!c.assigneeId || c.assigneeId !== currentUserId));
    const assignedComments = rootComments.filter((c: any) => !c.isResolved && c.assigneeId === currentUserId);
    const resolvedComments = rootComments.filter((c: any) => c.isResolved);

    const displayComments = activeTab === "open" ? comments : activeTab === "assigned" ? assignedComments : resolvedComments;

    const formatTime = (date: Date | string) => {
        return formatDistanceToNow(new Date(date), { addSuffix: true });
    };

    // Convert emoji character to unified code for Emoji component
    const emojiToUnified = (emoji: string): string => {
        return Array.from(emoji)
            .map((c) => c.codePointAt(0)!.toString(16).padStart(4, '0'))
            .join('-');
    };

    // Reusable reaction footer renderer
    const renderReactionFooter = (target: any) => {
        const reactions: any[] = target.reactions || [];

        // Build ordered unique emoji list by first occurrence (preserves click order)
        const seenEmojis = new Set<string>();
        const orderedEmojis: string[] = [];
        for (const r of reactions) {
            if (!seenEmojis.has(r.emoji)) {
                seenEmojis.add(r.emoji);
                orderedEmojis.push(r.emoji);
            }
        }

        // Count per emoji
        const reactionMap = reactions.reduce((acc: any, r: any) => {
            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
            return acc;
        }, {});

        const hasLiked = reactions.some(
            (r: any) => r.emoji === "👍" && r.userId === currentUserId
        );

        return (
            <div className="flex items-center gap-1 flex-wrap">
                {/* Reaction pills — in first-click / insertion order */}
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
                                "h-7 px-2 py-0 text-xs gap-1 rounded-full border transition-colors",
                                hasReacted
                                    ? "border-indigo-300 bg-indigo-50 text-indigo-700 font-medium"
                                    : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                            )}
                            onClick={() => reactMutation.mutate({ commentId: target.id, emoji })}
                        >
                            <Emoji unified={emojiToUnified(emoji)} size={14} />
                            <span>{count as React.ReactNode}</span>
                        </Button>
                    );
                })}

                {/* Thumbs-up icon button — only when no 👍 reaction yet */}
                {!hasLiked && !reactionMap["👍"] && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full"
                        onClick={() => reactMutation.mutate({ commentId: target.id, emoji: "👍" })}
                    >
                        <ThumbsUp className="h-3.5 w-3.5" />
                    </Button>
                )}

                {/* Emoji picker */}
                <Popover
                    open={reactionPickerCommentId === target.id}
                    onOpenChange={(open) => setReactionPickerCommentId(open ? target.id : null)}
                >
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full"
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
                                reactMutation.mutate({ commentId: target.id, emoji: data.emoji });
                                setReactionPickerCommentId(null);
                            }}
                            theme={Theme.LIGHT}
                        />
                    </PopoverContent>
                </Popover>
            </div>
        );
    };

    return (
        <div className="w-full h-full flex flex-col bg-white overflow-hidden">
            {/* Header */}
            <div className="flex flex-col pt-3 px-4 border-b border-zinc-200">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-zinc-900 tracking-tight">Comments</h3>
                    <div className="flex items-center gap-1">
                        <FollowersPopover
                            documentId={documentId}
                            members={members}
                            teams={teams}
                            currentUserId={currentUserId}
                        />
                        {onClose && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer transition-colors" onClick={onClose}>
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="h-auto p-0 bg-transparent gap-5 justify-start w-full border-none">
                        <TabsTrigger
                            value="open"
                            className="relative p-0 pb-2.5 text-[13px] font-medium rounded-none cursor-pointer bg-transparent shadow-none data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:text-zinc-900 data-[state=inactive]:text-zinc-400 hover:text-zinc-700 transition-colors after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-t-full after:bg-zinc-900 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-200"
                        >
                            Open {comments.length > 0 && <span className="ml-1.5 text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-full font-semibold">{comments.length}</span>}
                        </TabsTrigger>
                        <TabsTrigger
                            value="assigned"
                            className="relative p-0 pb-2.5 text-[13px] font-medium rounded-none cursor-pointer bg-transparent shadow-none data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:text-zinc-900 data-[state=inactive]:text-zinc-400 hover:text-zinc-700 transition-colors after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-t-full after:bg-indigo-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-200"
                        >
                            Assigned {assignedComments.length > 0 && <span className="ml-1.5 text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-semibold">{assignedComments.length}</span>}
                        </TabsTrigger>
                        <TabsTrigger
                            value="resolved"
                            className="relative p-0 pb-2.5 text-[13px] font-medium rounded-none cursor-pointer bg-transparent shadow-none data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:text-zinc-900 data-[state=inactive]:text-zinc-400 hover:text-zinc-700 transition-colors after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-t-full after:bg-emerald-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-200"
                        >
                            Resolved {resolvedComments.length > 0 && <span className="ml-1.5 text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-semibold">{resolvedComments.length}</span>}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-zinc-50/50">
                {displayComments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-6 text-center">
                        <div className="relative mb-4">
                            <MessageSquare className="h-12 w-12 text-zinc-200 stroke-1" />
                            <MessageSquare className="h-8 w-8 text-zinc-300 stroke-[1.5] absolute -bottom-1 -right-2 bg-white rounded-full" />
                        </div>
                        <h4 className="text-[15px] font-semibold text-zinc-700 mb-2">No comments on this page</h4>
                        <p className="text-sm text-zinc-500 max-w-[250px]">
                            Start a discussion by highlighting text or clicking the comment field below
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col p-3 gap-3">
                        {displayComments.map((comment) => (
                            <div key={comment.id} className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm group">
                                {/* Comment Header */}
                                <div className={cn(
                                    "flex items-center justify-between px-3 py-2 border-b",
                                    (comment.assigneeId === currentUserId && !comment.isResolved) ? "bg-indigo-50/50 border-indigo-100" :
                                        comment.isResolved ? "bg-white border-zinc-100" :
                                            "bg-zinc-50/50 border-zinc-100"
                                )}>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {comment.isResolved ? (
                                            <>
                                                <div onClick={() => resolveMutation.mutate({ commentId: comment.id, isResolved: false })} className="w-4 h-4 rounded-[4px] bg-emerald-500 text-white flex items-center justify-center cursor-pointer shadow-sm">
                                                    <Check className="h-3 w-3 stroke-[3]" />
                                                </div>
                                                <span className="text-xs font-medium text-emerald-600">Resolved by {comment.resolvedBy?.name || 'Unknown'}</span>
                                            </>
                                        ) : (
                                            <>
                                                <div onClick={() => resolveMutation.mutate({ commentId: comment.id, isResolved: true })} className={cn(
                                                    "w-4 h-4 rounded-[4px] border cursor-pointer",
                                                    (comment.assigneeId === currentUserId && !comment.isResolved) ? "border-indigo-300 bg-transparent" : "border-zinc-300 bg-white"
                                                )} />
                                                <span className={cn(
                                                    "text-xs font-medium",
                                                    (comment.assigneeId === currentUserId && !comment.isResolved) ? "text-indigo-600" : "text-zinc-500"
                                                )}>Resolve</span>
                                            </>
                                        )}
                                    </div>
                                    <span className={cn(
                                        "text-xs flex items-center gap-1 min-w-0 ml-2",
                                        (comment.assigneeId === currentUserId && !comment.isResolved) ? "text-indigo-600" :
                                            comment.isResolved ? "text-emerald-700 line-through decoration-emerald-700/60" :
                                                "text-zinc-500"
                                    )}>
                                        <span className="shrink-0">Assigned to</span>
                                        <span className={cn(
                                            "font-semibold truncate",
                                            (comment.assigneeId === currentUserId && !comment.isResolved) ? "text-indigo-600" :
                                                comment.isResolved ? "text-emerald-700" :
                                                    "text-zinc-900"
                                        )}>{comment.assignee?.name || 'Anyone'}</span>
                                        {!(comment.assigneeId === currentUserId && !comment.isResolved) && <span className={cn(
                                            "shrink-0 whitespace-nowrap",
                                            comment.isResolved ? "text-emerald-700" : "text-zinc-500"
                                        )}>by {comment.user?.name || 'Unknown'}</span>}
                                    </span>
                                </div>

                                {/* Comment Body */}
                                <div className="p-3 pb-2 relative">
                                    <div className="flex items-center justify-between mb-2 min-w-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Avatar className="h-6 w-6 shrink-0">
                                                <AvatarFallback className="bg-slate-600 text-white text-[10px]">{(comment.user?.name || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-semibold text-zinc-900 truncate">{comment.user?.name || 'Unknown'}</span>
                                            <span className="text-xs text-zinc-400 group-hover:hidden shrink-0 whitespace-nowrap">{formatTime(comment.createdAt)}</span>
                                        </div>

                                        {/* Hover Actions */}
                                        <div className={cn(
                                            "items-center gap-1 bg-white/90 backdrop-blur-sm rounded-md border border-zinc-100 shadow-sm px-1 py-0.5 absolute right-3 top-2 z-10",
                                            (activePopoverId === `assign-${comment.id}` || activePopoverId === `more-${comment.id}`) ? "flex" : "hidden group-hover:flex"
                                        )}>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:bg-zinc-100 rounded-sm" onClick={() => { setEditingCommentId(comment.id); setEditText(comment.content || ""); }}>
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Popover
                                                open={activePopoverId === `assign-${comment.id}`}
                                                onOpenChange={(open) => setActivePopoverId(open ? `assign-${comment.id}` : null)}
                                            >
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:bg-zinc-100 rounded-sm">
                                                        <UserPlus className="h-3.5 w-3.5" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent align="end" className="w-[200px] p-0 rounded-xl shadow-lg border-zinc-200">
                                                    <div className="p-2">
                                                        <div className="text-[11px] font-medium text-zinc-500 px-2 py-1 mb-1">Assign To</div>
                                                        <div className="flex items-center gap-3 p-1.5 hover:bg-zinc-50 rounded-lg cursor-pointer bg-zinc-100/80 mb-1" onClick={() => { assignMutation.mutate({ commentId: comment.id, assigneeId: null }); setActivePopoverId(null); }}>
                                                            <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-white border-2 border-white shadow-sm shrink-0">
                                                                <Users className="h-3.5 w-3.5" />
                                                            </div>
                                                            <span className="text-sm font-medium text-zinc-900">Anyone</span>
                                                        </div>
                                                        {workspace?.members?.map((member: any) => (
                                                            <div key={member.id} className="flex items-center gap-3 p-1.5 hover:bg-zinc-50 rounded-lg cursor-pointer mb-1" onClick={() => { assignMutation.mutate({ commentId: comment.id, assigneeId: member.user.id }); setActivePopoverId(null); }}>
                                                                <Avatar className="h-7 w-7">
                                                                    <AvatarFallback className="bg-slate-700 text-white text-[10px]">{(member.user.name || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-sm text-zinc-700">{member.user.id === currentUserId ? 'Me' : member.user.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-zinc-500 hover:bg-zinc-100 rounded-sm"
                                                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                            >
                                                <Reply className="h-3.5 w-3.5" />
                                            </Button>
                                            <Popover
                                                open={activePopoverId === `more-${comment.id}`}
                                                onOpenChange={(open) => setActivePopoverId(open ? `more-${comment.id}` : null)}
                                            >
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:bg-zinc-100 rounded-sm">
                                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent align="end" className="w-[150px] p-1 rounded-xl shadow-lg border-zinc-200">
                                                    <div className="flex flex-col">
                                                        <div onClick={() => { deleteMutation.mutate({ commentId: comment.id }); setActivePopoverId(null); }} className="px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-md cursor-pointer font-medium">
                                                            Delete comment
                                                        </div>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>

                                    {/* Attachments */}
                                    {comment.attachments && comment.attachments.length > 0 && (
                                        <div className="mt-2 mb-1 flex flex-col gap-1.5">
                                            {comment.attachments.map((att: any, idx: number) => {
                                                const isImage = att.mimeType?.startsWith('image/');
                                                return (
                                                    <div key={att.id || idx}>
                                                        {isImage ? (
                                                            <a href={att.url} target="_blank" rel="noopener noreferrer">
                                                                <div className="rounded-lg overflow-hidden border border-zinc-200 cursor-pointer hover:opacity-90 transition-opacity">
                                                                    <img src={att.url} alt={att.filename} className="w-full object-cover max-h-[240px]" />
                                                                    <div className="px-2 py-1 bg-zinc-50 border-t border-zinc-200">
                                                                        <span className="text-[11px] text-zinc-500 truncate block">{att.filename}</span>
                                                                    </div>
                                                                </div>
                                                            </a>
                                                        ) : (
                                                            <a
                                                                href={att.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                download={att.filename}
                                                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 transition-colors group/att"
                                                            >
                                                                <FileTypeIcon filename={att.filename} className="w-8 h-8 shrink-0" />
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="text-xs font-medium text-zinc-800 truncate group-hover/att:text-indigo-700 transition-colors">{att.filename}</div>
                                                                    {att.size && <div className="text-[10px] text-zinc-400">{formatBytes(Number(att.size))}</div>}
                                                                </div>
                                                                <Paperclip className="h-3.5 w-3.5 text-zinc-300 group-hover/att:text-indigo-400 shrink-0 transition-colors" />
                                                            </a>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {editingCommentId === comment.id ? (
                                        <div className="mt-2 flex flex-col gap-2">
                                            <textarea
                                                className="w-full text-sm resize-none border border-zinc-200 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                value={editText}
                                                onChange={(e) => setEditText(e.target.value)}
                                                rows={3}
                                                autoFocus
                                            />
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => setEditingCommentId(null)}>Cancel</Button>
                                                <Button size="sm" onClick={() => {
                                                    updateComment.mutate({ commentId: comment.id, content: editText });
                                                    setEditingCommentId(null);
                                                }}>Save</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                                            {renderCommentText(comment.content || '', mentionItems, true)}
                                        </div>
                                    )}
                                </div>

                                {/* Comment Footer */}
                                <div className="px-3 py-2 border-t border-zinc-100 flex items-center justify-between">
                                    {renderReactionFooter(comment)}

                                    {(() => {
                                        const replies = allComments.filter((c: any) => c.parentId === comment.id);
                                        const isExpanded = replyingTo === comment.id;

                                        if (replies.length > 0) {
                                            const repliers = Array.from(new Map(replies.map((r: any) => [r.user?.id, r.user])).values()).filter(Boolean);

                                            return (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 text-xs text-zinc-500 hover:text-zinc-800 px-2 rounded-sm font-semibold transition-colors cursor-pointer flex items-center gap-2"
                                                    onClick={() => setReplyingTo(isExpanded ? null : comment.id)}
                                                >
                                                    <span>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
                                                    <div className="flex -space-x-1.5 overflow-hidden ml-1">
                                                        {repliers.slice(0, 3).map((u: any) => (
                                                            <TooltipProvider key={u.id}>
                                                                <Tooltip delayDuration={300}>
                                                                    <TooltipTrigger asChild>
                                                                        <Avatar className="inline-block h-5 w-5 ring-2 ring-white cursor-help">
                                                                            <AvatarImage src={u.image || undefined} />
                                                                            <AvatarFallback className="text-[9px] bg-zinc-200 text-zinc-700 font-medium">
                                                                                {(u.name || 'U').substring(0, 2).toUpperCase()}
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="bottom">
                                                                        <p className="text-xs">{u.name}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
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
                                                className="h-6 text-xs text-zinc-500 hover:text-zinc-800 px-2 rounded-sm font-semibold transition-colors cursor-pointer"
                                                onClick={() => setReplyingTo(isExpanded ? null : comment.id)}
                                            >
                                                Reply
                                            </Button>
                                        );
                                    })()}
                                </div>

                                {/* Replies List */}
                                {replyingTo === comment.id && (() => {
                                    const replies = allComments.filter((c: any) => c.parentId === comment.id);
                                    if (replies.length === 0) return null;
                                    return (
                                        <div className="flex flex-col gap-2 px-3 pb-3 bg-zinc-50/50 border-t border-zinc-100 pt-3">
                                            {replies.map((reply: any) => (
                                                <div key={reply.id} className="group bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                                                    {/* Resolve / Assign bar */}
                                                    <div className={cn(
                                                        "flex items-center justify-between px-3 py-2 border-b",
                                                        (reply.assigneeId === currentUserId && !reply.isResolved) ? "bg-indigo-50/50 border-indigo-100" :
                                                            reply.isResolved ? "bg-white border-zinc-100" :
                                                                "bg-zinc-50/50 border-zinc-100"
                                                    )}>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {reply.isResolved ? (
                                                                <>
                                                                    <div onClick={() => resolveMutation.mutate({ commentId: reply.id, isResolved: false })} className="w-4 h-4 rounded-[4px] bg-emerald-500 text-white flex items-center justify-center cursor-pointer shadow-sm">
                                                                        <Check className="h-3 w-3 stroke-[3]" />
                                                                    </div>
                                                                    <span className="text-xs font-medium text-emerald-600">Resolved by {reply.resolvedBy?.name || 'Unknown'}</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div onClick={() => resolveMutation.mutate({ commentId: reply.id, isResolved: true })} className={cn(
                                                                        "w-4 h-4 rounded-[4px] border cursor-pointer",
                                                                        (reply.assigneeId === currentUserId && !reply.isResolved) ? "border-indigo-300 bg-transparent" : "border-zinc-300 bg-white"
                                                                    )} />
                                                                    <span className={cn(
                                                                        "text-xs font-medium",
                                                                        (reply.assigneeId === currentUserId && !reply.isResolved) ? "text-indigo-600" : "text-zinc-500"
                                                                    )}>Resolve</span>
                                                                </>
                                                            )}
                                                        </div>
                                                        <span className={cn(
                                                            "text-xs flex items-center gap-1 min-w-0 ml-2",
                                                            (reply.assigneeId === currentUserId && !reply.isResolved) ? "text-indigo-600" :
                                                                reply.isResolved ? "text-emerald-700 line-through decoration-emerald-700/60" :
                                                                    "text-zinc-500"
                                                        )}>
                                                            <span className="shrink-0">Assigned to</span>
                                                            <span className={cn(
                                                                "font-semibold truncate",
                                                                (reply.assigneeId === currentUserId && !reply.isResolved) ? "text-indigo-600" :
                                                                    reply.isResolved ? "text-emerald-700" :
                                                                        "text-zinc-900"
                                                            )}>{reply.assignee?.name || 'Anyone'}</span>
                                                            {!(reply.assigneeId === currentUserId && !reply.isResolved) && <span className={cn(
                                                                "shrink-0 whitespace-nowrap",
                                                                reply.isResolved ? "text-emerald-700" : "text-zinc-500"
                                                            )}>by {reply.user?.name || 'Unknown'}</span>}
                                                        </span>
                                                    </div>

                                                    {/* Reply Body */}
                                                    <div className="p-3 pb-2 relative">
                                                        <div className="flex items-center justify-between mb-2 min-w-0">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <Avatar className="h-6 w-6 shrink-0">
                                                                    <AvatarFallback className="bg-slate-600 text-white text-[10px]">{(reply.user?.name || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-sm font-semibold text-zinc-900 truncate">{reply.user?.name || 'Unknown'}</span>
                                                                <span className="text-xs text-zinc-400 group-hover:hidden shrink-0 whitespace-nowrap">{formatTime(reply.createdAt)}</span>
                                                            </div>

                                                            {/* Hover Actions */}
                                                            <div className={cn(
                                                                "items-center gap-1 bg-white/90 backdrop-blur-sm rounded-md border border-zinc-100 shadow-sm px-1 py-0.5 absolute right-3 top-2 z-10",
                                                                (activePopoverId === `assign-${reply.id}` || activePopoverId === `more-${reply.id}`) ? "flex" : "hidden group-hover:flex"
                                                            )}>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:bg-zinc-100 rounded-sm" onClick={() => { setEditingCommentId(reply.id); setEditText(reply.content || ""); }}>
                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Popover
                                                                    open={activePopoverId === `assign-${reply.id}`}
                                                                    onOpenChange={(open) => setActivePopoverId(open ? `assign-${reply.id}` : null)}
                                                                >
                                                                    <PopoverTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:bg-zinc-100 rounded-sm">
                                                                            <UserPlus className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent align="end" className="w-[200px] p-0 rounded-xl shadow-lg border-zinc-200">
                                                                        <div className="p-2">
                                                                            <div className="text-[11px] font-medium text-zinc-500 px-2 py-1 mb-1">Assign To</div>
                                                                            <div className="flex items-center gap-3 p-1.5 hover:bg-zinc-50 rounded-lg cursor-pointer bg-zinc-100/80 mb-1" onClick={() => { assignMutation.mutate({ commentId: reply.id, assigneeId: null }); setActivePopoverId(null); }}>
                                                                                <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-white border-2 border-white shadow-sm shrink-0">
                                                                                    <Users className="h-3.5 w-3.5" />
                                                                                </div>
                                                                                <span className="text-sm font-medium text-zinc-900">Anyone</span>
                                                                            </div>
                                                                            {workspace?.members?.map((member: any) => (
                                                                                <div key={member.id} className="flex items-center gap-3 p-1.5 hover:bg-zinc-50 rounded-lg cursor-pointer mb-1" onClick={() => { assignMutation.mutate({ commentId: reply.id, assigneeId: member.user.id }); setActivePopoverId(null); }}>
                                                                                    <Avatar className="h-7 w-7">
                                                                                        <AvatarFallback className="bg-slate-700 text-white text-[10px]">{(member.user.name || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                                                                                    </Avatar>
                                                                                    <span className="text-sm text-zinc-700">{member.user.id === currentUserId ? 'Me' : member.user.name}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Popover>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-zinc-500 hover:bg-zinc-100 rounded-sm"
                                                                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                                                >
                                                                    <Reply className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Popover
                                                                    open={activePopoverId === `more-${reply.id}`}
                                                                    onOpenChange={(open) => setActivePopoverId(open ? `more-${reply.id}` : null)}
                                                                >
                                                                    <PopoverTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:bg-zinc-100 rounded-sm">
                                                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent align="end" className="w-[150px] p-1 rounded-xl shadow-lg border-zinc-200">
                                                                        <div className="flex flex-col">
                                                                            <div onClick={() => { deleteMutation.mutate({ commentId: reply.id }); setActivePopoverId(null); }} className="px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-md cursor-pointer font-medium">
                                                                                Delete comment
                                                                            </div>
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Popover>
                                                            </div>
                                                        </div>

                                                        {editingCommentId === reply.id ? (
                                                            <div className="mt-2 flex flex-col gap-2">
                                                                <textarea
                                                                    className="w-full text-sm resize-none border border-zinc-200 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                    value={editText}
                                                                    onChange={(e) => setEditText(e.target.value)}
                                                                    rows={3}
                                                                    autoFocus
                                                                />
                                                                <div className="flex justify-end gap-2">
                                                                    <Button variant="ghost" size="sm" onClick={() => setEditingCommentId(null)}>Cancel</Button>
                                                                    <Button size="sm" onClick={() => {
                                                                        updateComment.mutate({ commentId: reply.id, content: editText });
                                                                        setEditingCommentId(null);
                                                                    }}>Save</Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                                                                {renderCommentText(reply.content || '', mentionItems, true)}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Reply Footer */}
                                                    <div className="px-3 pb-3 pt-1">
                                                        {renderReactionFooter(reply)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}

                                {/* Reply Composer */}
                                {replyingTo === comment.id && (
                                    <div className="border-t border-zinc-100">
                                        <div className="px-3 py-3 bg-zinc-100">
                                            <CommentComposer
                                                documentId={documentId}
                                                parentId={comment.id}
                                                workspace={workspace}
                                                currentUserId={currentUserId}
                                                createComment={createComment}
                                                placeholder="Reply..."
                                                size="compact"
                                                autoFocus
                                                onSent={() => setReplyingTo(null)}
                                                members={members}
                                                scope={scope}
                                                workspaceId={workspaceId}
                                                spaceId={spaceId}
                                                projectId={projectId}
                                                teamId={teamId}
                                            />
                                        </div>
                                        <div className="py-2 text-center bg-white border-t border-zinc-100">
                                            <button
                                                className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-600 hover:underline cursor-pointer transition-colors"
                                                onClick={() => setReplyingTo(null)}
                                            >
                                                Collapse
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-3 bg-zinc-50 border-t border-zinc-200 relative">
                <CommentComposer
                    documentId={documentId}
                    parentId={null}
                    workspace={workspace}
                    currentUserId={currentUserId}
                    createComment={createComment}
                    placeholder="Comment or type '/' for commands and AI actions"
                    size="full"
                    members={members}
                    scope={scope}
                    workspaceId={workspaceId}
                    spaceId={spaceId}
                    projectId={projectId}
                    teamId={teamId}
                />
            </div>
        </div>
    );
}

interface CommentComposerProps {
    documentId: string;
    parentId: string | null;
    workspace: any;
    currentUserId: string | undefined;
    createComment: any;
    placeholder: string;
    size: "full" | "compact";
    autoFocus?: boolean;
    onSent?: () => void;
    // Scope-related props for mention/assign modals
    members?: { id: string; name: string; image?: string | null }[];
    scope?: "workspace" | "space" | "project" | "team";
    workspaceId?: string;
    spaceId?: string;
    projectId?: string;
    teamId?: string;
}

function CommentComposer({
    documentId,
    parentId,
    workspace,
    currentUserId,
    createComment,
    placeholder,
    size,
    autoFocus,
    onSent,
    members,
    scope = "workspace",
    workspaceId,
    spaceId,
    projectId,
    teamId,
}: CommentComposerProps) {
    const { data: tasksData } = trpc.task.list.useQuery(
        { workspaceId, spaceId, projectId, teamId, pageSize: 20, scope: "all", includeRelations: true },
        { enabled: !!(workspaceId || spaceId || projectId || teamId) }
    );
    // Fetch docs scoped to the current context
    const { data: docsData } = trpc.document.list.useQuery(
        { workspaceId, spaceId, projectId, teamId, pageSize: 20 },
        { enabled: !!(workspaceId || spaceId || projectId || teamId) }
    );
    // Fetch relationships linked to this document
    const { data: relationships = [] } = trpc.document.listRelationships.useQuery(
        { documentId },
        { enabled: !!documentId }
    );

    const linkedDocs = relationships.filter((r: any) => r.targetType === "DOCUMENT" && r.target).map((r: any) => r.target);
    const linkedTasks = relationships.filter((r: any) => r.targetType === "TASK" && r.target).map((r: any) => r.target);

    // Merge tasks
    const allTasksMap = new Map();
    linkedTasks.forEach(t => allTasksMap.set(t.id, t));
    (tasksData?.items || []).forEach(t => allTasksMap.set(t.id, t));
    const scopedTasks = Array.from(allTasksMap.values());

    // Merge docs
    const allDocsMap = new Map();
    linkedDocs.forEach(d => allDocsMap.set(d.id, d));
    (docsData?.items || []).forEach(d => allDocsMap.set(d.id, d));
    const scopedDocs = Array.from(allDocsMap.values());
    // Members for People tab and assign modal
    const scopedMembers = members || workspace?.members?.map((m: any) => ({ id: m.user.id, name: m.user.name, image: m.user.image })) || [];

    const mentionItems = useMemo(() => {
        const items: { title: string; type: string; status?: string }[] = [];
        scopedMembers.forEach(m => {
            if (m.name) items.push({ title: m.name, type: "user" });
        });
        scopedTasks.forEach(t => {
            if (t.title) items.push({ title: t.title, type: "task", status: t.status?.name });
        });
        scopedDocs.forEach(d => {
            if (d.title) items.push({ title: d.title, type: "doc" });
        });
        // Sort by length descending to match longer titles first (e.g. "Nguyen Dat" before "Nguyen")
        return items.sort((a, b) => b.title.length - a.title.length);
    }, [scopedMembers, scopedTasks, scopedDocs]);

    const [commentText, setCommentText] = useState("");
    const [showMentionModal, setShowMentionModal] = useState(false);
    const [mentionTab, setMentionTab] = useState("tasks");
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignee, setAssignee] = useState<string>("Anyone");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [pendingAttachments, setPendingAttachments] = useState<{ file: File; preview: string }[]>([]);
    const [isSending, setIsSending] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const isCompact = size === "compact";

    const addCommentAttachment = trpc.document.addCommentAttachment.useMutation();
    const utils = trpc.useUtils();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files).map(file => ({
                file,
                preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
            }));
            setPendingAttachments(prev => [...prev, ...newFiles]);
            // reset input so same file can be re-selected
            e.target.value = '';
        }
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setCommentText(val);
        if (val.endsWith('@') || val.endsWith('@@')) {
            setShowMentionModal(true);
        } else if (val === '' || !val.includes('@')) {
            setShowMentionModal(false);
        }
    };

    const handleSend = async () => {
        if (!commentText.trim() && pendingAttachments.length === 0) return;
        setIsSending(true);
        try {
            const result = await createComment.mutateAsync({
                documentId,
                content: commentText,
                assigneeId: assignee !== "Anyone" ? assignee : null,
                parentId: parentId
            });

            const commentId = result?.comment?.id;
            if (commentId && pendingAttachments.length > 0) {
                await Promise.all(pendingAttachments.map(async (att) => {
                    const path = storageUtils.generateUniquePath(att.file.name, `comments/${documentId}`);
                    const uploadResult = await storageUtils.upload({
                        file: att.file,
                        bucket: 'attachments',
                        path,
                        upsert: true,
                    });
                    if (uploadResult.success && uploadResult.url) {
                        await addCommentAttachment.mutateAsync({
                            commentId,
                            filename: att.file.name,
                            url: uploadResult.url,
                            mimeType: att.file.type,
                            size: att.file.size,
                        });
                    }
                }));
                // Re-fetch after attachments are persisted so the file chips appear
                utils.document.listComments.invalidate({ documentId });
            }

            // revoke object URLs
            pendingAttachments.forEach(a => { if (a.preview) URL.revokeObjectURL(a.preview); });
            setCommentText("");
            setPendingAttachments([]);
            setShowMentionModal(false);
            setAssignee("Anyone");
            onSent?.();
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="relative">
            {/* Mention Popover */}
            {showMentionModal && (
                <div className="absolute bottom-[100%] left-0 right-0 mb-2 bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden z-20 flex flex-col">
                    <div className="flex items-center px-2 pt-2 border-b border-zinc-100 overflow-x-auto no-scrollbar">
                        {['People', 'Tasks', 'Docs'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setMentionTab(tab.toLowerCase())}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer",
                                    mentionTab === tab.toLowerCase() ? "border-indigo-500 text-indigo-600" : "border-transparent text-zinc-500 hover:text-zinc-700"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    <div className="p-0 max-h-[220px] overflow-y-auto">
                        {mentionTab === "people" && (
                            scopedMembers.length === 0 ? (
                                <div className="px-4 py-6 text-center text-xs text-zinc-400">No members found</div>
                            ) : scopedMembers.map((m: any) => (
                                <div
                                    key={m.id}
                                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-50 cursor-pointer"
                                    onClick={() => {
                                        setCommentText(prev => prev.replace(/@+$/, '') + `@${m.name} `);
                                        setShowMentionModal(false);
                                        textareaRef.current?.focus();
                                    }}
                                >
                                    <Avatar className="h-5 w-5">
                                        <AvatarImage src={m.image || ""} />
                                        <AvatarFallback className="bg-slate-600 text-white text-[9px]">{(m.name || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-medium text-zinc-700 truncate flex-1">
                                        {m.id === currentUserId ? 'Me' : m.name}
                                    </span>
                                </div>
                            ))
                        )}
                        {mentionTab === "tasks" && (
                            scopedTasks.length === 0 ? (
                                <div className="px-4 py-6 text-center text-xs text-zinc-400">No tasks found</div>
                            ) : scopedTasks.map((task: any) => {
                                const statusName = task.status?.name?.toLowerCase() || "";
                                let statusIcon = (
                                    <div className="w-3 h-3 rounded-full border-[1.5px] border-zinc-400 border-dashed flex items-center justify-center shrink-0"></div>
                                );
                                if (statusName === "done" || statusName === "completed") {
                                    statusIcon = (
                                        <div className="w-3 h-3 rounded-full bg-[#10b981] relative shrink-0">
                                            <Check className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 text-white" strokeWidth={4} />
                                        </div>
                                    );
                                } else if (statusName === "in progress" || statusName === "doing") {
                                    statusIcon = (
                                        <div className="w-3 h-3 rounded-full bg-[#3b82f6] relative shrink-0">
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-white"></div>
                                        </div>
                                    );
                                }

                                return (
                                    <div
                                        key={task.id}
                                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-50 cursor-pointer"
                                        onClick={() => {
                                            setCommentText(prev => prev.replace(/@+$/, '') + `@${task.title} `);
                                            setShowMentionModal(false);
                                            textareaRef.current?.focus();
                                        }}
                                    >
                                        {statusIcon}
                                        <span className="text-xs font-medium text-zinc-700 truncate flex-1">{task.title}</span>
                                    </div>
                                );
                            })
                        )}
                        {mentionTab === "docs" && (
                            scopedDocs.length === 0 ? (
                                <div className="px-4 py-6 text-center text-xs text-zinc-400">No docs found</div>
                            ) : scopedDocs.map((doc: any) => (
                                <div
                                    key={doc.id}
                                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-50 cursor-pointer"
                                    onClick={() => {
                                        setCommentText(prev => prev.replace(/@+$/, '') + `@${doc.title} `);
                                        setShowMentionModal(false);
                                        textareaRef.current?.focus();
                                    }}
                                >
                                    <FileText className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                    <span className="text-xs font-medium text-zinc-700 truncate flex-1">{doc.title}</span>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="bg-zinc-50 p-2 text-[10px] text-zinc-400 border-t border-zinc-100 text-center">
                        '@' People | '@@' Tasks | '@@@' Docs
                    </div>
                </div>
            )}

            {/* Pending Attachments */}
            {pendingAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 pb-2">
                    {pendingAttachments.map((att, idx) => {
                        const isImage = att.file.type.startsWith('image/');
                        return (
                            <div key={idx} className="relative group">
                                {isImage ? (
                                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100 shrink-0">
                                        <img src={att.preview} alt="preview" className="object-cover w-full h-full" />
                                        <button
                                            className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                            onClick={() => {
                                                URL.revokeObjectURL(att.preview);
                                                setPendingAttachments(prev => prev.filter((_, i) => i !== idx));
                                            }}
                                        >
                                            <X className="h-2.5 w-2.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative flex items-center gap-2 px-2.5 py-1.5 pr-7 bg-white border border-zinc-200 rounded-lg max-w-[180px]">
                                        <FileTypeIcon filename={att.file.name} className="w-6 h-6 shrink-0" />
                                        <div className="min-w-0">
                                            <div className="text-[11px] font-medium text-zinc-700 truncate">{att.file.name}</div>
                                            <div className="text-[10px] text-zinc-400">{formatBytes(att.file.size)}</div>
                                        </div>
                                        <button
                                            className="absolute top-0.5 right-0.5 bg-zinc-200 hover:bg-red-500 text-zinc-600 hover:text-white rounded-full p-0.5 transition-colors cursor-pointer"
                                            onClick={() => setPendingAttachments(prev => prev.filter((_, i) => i !== idx))}
                                        >
                                            <X className="h-2.5 w-2.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <div className={cn(
                "bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm focus-within:ring-1 focus-within:ring-zinc-300 focus-within:border-zinc-300 transition-shadow relative",
            )}>
                <div className={cn(
                    "absolute inset-0 pointer-events-none whitespace-pre-wrap break-words overflow-hidden",
                    isCompact ? "p-2 text-[13px]" : "p-4 text-sm"
                )}>
                    {commentText ? renderCommentText(commentText, mentionItems) : <span className="text-zinc-400">{placeholder}</span>}
                </div>
                <textarea
                    ref={textareaRef}
                    value={commentText}
                    onChange={handleTextChange}
                    className={cn(
                        "w-full resize-none border-0 focus:outline-none focus:ring-0 bg-transparent text-transparent caret-zinc-900 relative z-10",
                        isCompact ? "max-h-[100px] min-h-[36px] p-2 text-[13px]" : "max-h-[250px] min-h-[80px] p-4 text-sm"
                    )}
                    placeholder=""
                    rows={isCompact ? 1 : 3}
                    autoFocus={autoFocus}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                />
                <div className={cn("flex items-center justify-between", isCompact ? "p-1.5 pt-0" : "p-2 pt-0")}>
                    <div className={cn("flex items-center text-zinc-400", isCompact ? "gap-0.5" : "gap-1")}>
                        {!isCompact && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600">
                                <Plus className="h-4 w-4" />
                            </Button>
                        )}

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.csv,.zip"
                            multiple
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(isCompact ? "h-6 w-6 rounded-full hover:bg-zinc-100" : "h-7 w-7 rounded-full hover:bg-zinc-100 hover:text-zinc-700")}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Paperclip className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(isCompact ? "h-6 w-6 rounded-full hover:bg-zinc-100" : "h-7 w-7 rounded-full hover:bg-zinc-100 hover:text-zinc-700")}
                            onClick={() => setShowMentionModal(!showMentionModal)}
                        >
                            <AtSign className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                        </Button>

                        <Popover open={showAssignModal} onOpenChange={setShowAssignModal}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        isCompact ? "h-6 w-6 rounded-full" : "h-7 w-7 rounded-full",
                                        "transition-colors",
                                        assignee !== "Anyone" ? "border-[1.5px] border-blue-600 bg-blue-50" : "hover:bg-zinc-100 hover:text-zinc-700"
                                    )}
                                >
                                    {assignee !== "Anyone" ? (() => {
                                        const member = scopedMembers.find((m: any) => m.id === assignee);
                                        return (
                                            <Avatar className={isCompact ? "h-4 w-4" : "h-5 w-5"}>
                                                <AvatarImage src={member?.image || ""} />
                                                <AvatarFallback className="bg-blue-600 text-white text-[9px] font-semibold">
                                                    {(member?.name || 'U').substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        );
                                    })() : (
                                        <Users className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="center" className="w-[240px] p-0 rounded-xl shadow-xl border-zinc-200">
                                <div className="p-2 border-b border-zinc-100">
                                    <div className="flex items-center px-2 py-1 gap-2 text-zinc-500">
                                        <Search className="h-3.5 w-3.5" />
                                        <input placeholder="Search or enter email..." className="flex-1 border-0 text-xs focus:ring-0 outline-none placeholder:text-zinc-400" />
                                    </div>
                                </div>
                                <ScrollArea className="max-h-[300px]">
                                    <div className="p-2">
                                        <div className="text-[11px] font-medium text-zinc-500 px-2 py-1 mb-1">People</div>
                                        <div className="flex items-center gap-3 p-1.5 hover:bg-zinc-50 rounded-lg cursor-pointer bg-zinc-100/80 mb-1" onClick={() => { setAssignee("Anyone"); setShowAssignModal(false); }}>
                                            <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-white border-2 border-white shadow-sm shrink-0">
                                                <Users className="h-3.5 w-3.5" />
                                            </div>
                                            <span className="text-sm font-medium text-zinc-900">Anyone</span>
                                        </div>
                                        {scopedMembers.map((m: any) => (
                                            <div key={m.id} className="flex items-center gap-3 p-1.5 hover:bg-zinc-50 rounded-lg cursor-pointer mb-1" onClick={() => { setAssignee(m.id); setShowAssignModal(false); }}>
                                                <Avatar className="h-7 w-7">
                                                    <AvatarImage src={m.image || ""} />
                                                    <AvatarFallback className="bg-slate-700 text-white text-[10px]">{(m.name || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm text-zinc-700">{m.id === currentUserId ? 'Me' : m.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </PopoverContent>
                        </Popover>

                        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className={cn(isCompact ? "h-6 w-6 rounded-full hover:bg-zinc-100" : "h-7 w-7 rounded-full hover:bg-zinc-100 hover:text-zinc-700")}>
                                    <Smile className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                side="top"
                                align="center"
                                sideOffset={16}
                                className="p-0 border-none shadow-xl w-auto bg-transparent"
                            >
                                <EmojiPicker
                                    theme={Theme.LIGHT}
                                    onEmojiClick={(emoji: EmojiClickData) => {
                                        setCommentText(prev => prev + emoji.emoji);
                                        setShowEmojiPicker(false);
                                        textareaRef.current?.focus();
                                    }}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            isCompact ? "h-6 w-6 rounded-full" : "h-7 w-7 rounded-full",
                            "transition-colors",
                            commentText.trim() || pendingAttachments.length > 0
                                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                        )}
                        onClick={handleSend}
                        disabled={isSending}
                    >
                        {isSending ? (
                            <div className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Send className="h-3.5 w-3.5" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function FollowersPopover({ documentId, members, teams, currentUserId }: {
    documentId: string;
    members: { id: string; name: string; image?: string | null }[];
    teams: { id: string; name: string; _count?: { members: number } }[];
    currentUserId?: string;
}) {
    const utils = trpc.useUtils();
    const { data: watchers } = trpc.document.getWatchers.useQuery({ documentId });
    const toggleWatcher = trpc.document.toggleWatcher.useMutation({
        onSuccess: () => {
            utils.document.getWatchers.invalidate({ documentId });
        }
    });

    const followerIds = new Set(watchers?.userIds || []);
    const followedTeamIds = new Set(watchers?.teamIds || []);

    const isFollowing = currentUserId ? followerIds.has(currentUserId) : false;

    const [search, setSearch] = useState("");
    const q = search.toLowerCase();

    const followers = members.filter(m => followerIds.has(m.id));
    const nonFollowers = members.filter(m => !followerIds.has(m.id));
    const followedTeams = teams.filter(t => followedTeamIds.has(t.id));
    const nonFollowedTeams = teams.filter(t => !followedTeamIds.has(t.id));

    const filteredFollowers = followers.filter(m => m.name && m.name.toLowerCase().includes(q));
    const filteredPeople = nonFollowers.filter(m => m.name && m.name.toLowerCase().includes(q));
    const filteredFollowedTeams = followedTeams.filter(t => t.name && t.name.toLowerCase().includes(q));
    const filteredNonFollowedTeams = nonFollowedTeams.filter(t => t.name && t.name.toLowerCase().includes(q));

    const totalFollowers = followerIds.size + followedTeamIds.size;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-medium text-xs flex items-center gap-1.5 transition-colors">
                    <Bell className="h-3.5 w-3.5" />
                    <span>{totalFollowers}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[300px] p-0 rounded-xl shadow-lg border-zinc-200 overflow-hidden">
                <div className="flex flex-col">
                    {/* Follow / Unfollow mode buttons */}
                    <div className="p-1.5 border-b border-zinc-100">
                        <div
                            className={cn(
                                "p-2.5 cursor-pointer transition-colors rounded-lg",
                                isFollowing ? "bg-indigo-50/70 hover:bg-indigo-100/50" : "hover:bg-zinc-50"
                            )}
                            onClick={() => {
                                if (currentUserId && !isFollowing) {
                                    toggleWatcher.mutate({ documentId, targetId: currentUserId, targetType: "USER", action: "FOLLOW" });
                                }
                            }}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Bell className={cn("h-4 w-4 shrink-0", isFollowing ? "text-indigo-700" : "text-zinc-500")} />
                                    <span className={cn("text-sm font-semibold leading-tight", isFollowing ? "text-indigo-700" : "text-zinc-700")}>Follow</span>
                                </div>
                                {isFollowing && <Check className="h-3 w-3 text-indigo-600 shrink-0" strokeWidth={3} />}
                            </div>
                            <span className={cn("text-xs font-normal mt-1 block", isFollowing ? "text-indigo-600/80" : "text-zinc-500")}>
                                Notify me on all new comments for this page.
                            </span>
                        </div>
                        <div
                            className={cn(
                                "p-2.5 cursor-pointer transition-colors rounded-lg mt-1",
                                !isFollowing ? "bg-indigo-50/70 hover:bg-indigo-100/50" : "hover:bg-zinc-50"
                            )}
                            onClick={() => {
                                if (currentUserId && isFollowing) {
                                    toggleWatcher.mutate({ documentId, targetId: currentUserId, targetType: "USER", action: "UNFOLLOW" });
                                }
                            }}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <BellOff className={cn("h-4 w-4 shrink-0", !isFollowing ? "text-indigo-700" : "text-zinc-600")} />
                                    <span className={cn("text-sm font-medium leading-tight", !isFollowing ? "text-indigo-700 font-semibold" : "text-zinc-700")}>Unfollow</span>
                                </div>
                                {!isFollowing && <Check className="h-3 w-3 text-indigo-600 shrink-0" strokeWidth={3} />}
                            </div>
                            <span className={cn("text-xs font-normal mt-1 block", !isFollowing ? "text-indigo-600/80" : "text-zinc-500")}>
                                Notify me only on @mentions.
                            </span>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="p-2 border-b border-zinc-100 flex items-center gap-2 text-zinc-400">
                        <Search className="h-4 w-4 ml-1" />
                        <Input
                            variant="ghost"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search Watchers..."
                            className="h-7 text-xs w-full border-none shadow-none focus-visible:ring-0 focus:outline-none focus:ring-0 focus-visible:ring-0 p-0 placeholder:text-zinc-400"
                        />
                    </div>

                    {/* Lists */}
                    <ScrollArea className="max-h-[280px]">
                        <div className="p-2 pb-3 flex flex-col gap-1">

                            {/* ── Followers section ── */}
                            {(filteredFollowers.length > 0 || filteredFollowedTeams.length > 0) && (
                                <>
                                    <div className="text-[11px] font-medium text-zinc-500 px-2 py-1">
                                        {(filteredFollowers.length + filteredFollowedTeams.length)} {(filteredFollowers.length + filteredFollowedTeams.length) === 1 ? "follower" : "followers"}
                                    </div>
                                    {filteredFollowers.map(m => (
                                        <div
                                            key={m.id}
                                            className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 cursor-pointer group"
                                            onClick={() => toggleWatcher.mutate({ documentId, targetId: m.id, targetType: "USER", action: "UNFOLLOW" })}
                                        >
                                            <div className="flex items-center gap-3 relative w-full">
                                                <div className="relative ml-1 shrink-0">
                                                    <div className="rounded-full ring-2 ring-indigo-600 ring-offset-2 ring-offset-white">
                                                        <Avatar className="h-[30px] w-[30px]">
                                                            <AvatarImage src={m.image || ""} />
                                                            <AvatarFallback className="bg-slate-600 text-white text-xs font-semibold">{m.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                    </div>
                                                    <div className="absolute -bottom-1.5 -right-1 ring-2 ring-white bg-red-500 text-white rounded-full p-[1px] shadow-sm opacity-0 group-hover:opacity-100 transition-all">
                                                        <X className="h-3 w-3 text-white" />
                                                    </div>
                                                </div>
                                                <div className="flex flex-col ml-1 min-w-0">
                                                    <span className="text-[13px] font-semibold text-zinc-900 leading-tight truncate">
                                                        {m.id === currentUserId ? "Me" : m.name}
                                                    </span>
                                                    {m.id === currentUserId && (
                                                        <span className="text-[11px] text-zinc-500 leading-tight">Following</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredFollowedTeams.map(t => (
                                        <div
                                            key={t.id}
                                            className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 cursor-pointer group"
                                            onClick={() => toggleWatcher.mutate({ documentId, targetId: t.id, targetType: "TEAM", action: "UNFOLLOW" })}
                                        >
                                            <div className="flex items-center gap-3 relative w-full">
                                                <div className="relative ml-1 shrink-0">
                                                    <div className="rounded-full ring-2 ring-indigo-600 ring-offset-2 ring-offset-white">
                                                        <Avatar className="h-[30px] w-[30px]">
                                                            <AvatarFallback className="bg-zinc-400 text-white text-xs font-semibold">{t.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                    </div>
                                                    <div className="absolute -bottom-1.5 -right-1 ring-2 ring-white bg-red-500 text-white rounded-full p-[1px] shadow-sm opacity-0 group-hover:opacity-100 transition-all">
                                                        <X className="h-3 w-3 text-white" />
                                                    </div>
                                                </div>
                                                <span className="text-[13px] font-semibold text-zinc-900 ml-1 truncate">{t.name}</span>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* ── People section (non-followers) ── */}
                            {filteredPeople.length > 0 && (
                                <>
                                    <div className="text-[11px] font-medium text-zinc-500 px-2 py-1 mt-1">People</div>
                                    {filteredPeople.map(m => (
                                        <div
                                            key={m.id}
                                            className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 cursor-pointer"
                                            onClick={() => toggleWatcher.mutate({ documentId, targetId: m.id, targetType: "USER", action: "FOLLOW" })}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-[30px] w-[30px] ml-1 shrink-0">
                                                    <AvatarImage src={m.image || ""} />
                                                    <AvatarFallback className="bg-zinc-600 text-white text-xs font-semibold">{m.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col ml-1 min-w-0">
                                                    <span className="text-[13px] font-medium text-zinc-800 leading-tight truncate">
                                                        {m.id === currentUserId ? "Me" : m.name}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* ── Teams section (non-followed) ── */}
                            {filteredNonFollowedTeams.length > 0 && (
                                <>
                                    <div className="text-[11px] font-medium text-zinc-500 px-2 py-1 mt-1">Teams</div>
                                    {filteredNonFollowedTeams.map(t => (
                                        <div
                                            key={t.id}
                                            className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 cursor-pointer"
                                            onClick={() => toggleWatcher.mutate({ documentId, targetId: t.id, targetType: "TEAM", action: "FOLLOW" })}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="relative ml-1 shrink-0">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback className="bg-zinc-400 text-white text-xs font-semibold">{t.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                                                        <Users className="h-3.5 w-3.5 text-zinc-500" />
                                                    </div>
                                                </div>
                                                <span className="text-[13px] text-zinc-800">{t.name}</span>
                                            </div>
                                            {t._count !== undefined && (
                                                <span className="text-[11px] text-zinc-400 pr-1">{t._count.members} {t._count.members === 1 ? "person" : "people"}</span>
                                            )}
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* Empty state */}
                            {filteredFollowers.length === 0 && filteredPeople.length === 0 && filteredFollowedTeams.length === 0 && filteredNonFollowedTeams.length === 0 && (
                                <div className="text-[12px] text-zinc-400 text-center py-4">No results found</div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </PopoverContent>
        </Popover>
    );
}



function FileTypeIcon({ filename, className = "h-8 w-8" }: { filename: string, className?: string }) {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    
    if (ext === 'pdf') {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
                <path d="M7 2h8l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M15 2v5h5" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round"/>
                <rect x="4" y="12" width="16" height="7" rx="1.5" fill="#ef4444" />
                <text x="12" y="16.5" fill="white" fontSize="4.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle" dominantBaseline="middle">PDF</text>
            </svg>
        );
    }
    
    if (['doc', 'docx'].includes(ext)) {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
                <path d="M7 2h8l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M15 2v5h5" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round"/>
                <rect x="4" y="12" width="16" height="7" rx="1.5" fill="#3b82f6" />
                <text x="12" y="16.5" fill="white" fontSize="4.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle" dominantBaseline="middle">DOC</text>
            </svg>
        );
    }
    
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
                <path d="M7 2h8l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#dcfce7" stroke="#22c55e" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M15 2v5h5" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinejoin="round"/>
                <rect x="4" y="12" width="16" height="7" rx="1.5" fill="#22c55e" />
                <text x="12" y="16.5" fill="white" fontSize="4.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle" dominantBaseline="middle">XLS</text>
            </svg>
        );
    }
    
    if (['zip', 'rar', '7z'].includes(ext)) {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
                <path d="M7 2h8l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#fef9c3" stroke="#eab308" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M15 2v5h5" fill="none" stroke="#eab308" strokeWidth="1.5" strokeLinejoin="round"/>
                <rect x="4" y="12" width="16" height="7" rx="1.5" fill="#eab308" />
                <text x="12" y="16.5" fill="white" fontSize="4.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle" dominantBaseline="middle">ZIP</text>
            </svg>
        );
    }
    
    if (['txt', 'md', 'json'].includes(ext)) {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
                <path d="M7 2h8l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#f4f4f5" stroke="#71717a" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M15 2v5h5" fill="none" stroke="#71717a" strokeWidth="1.5" strokeLinejoin="round"/>
                <rect x="4" y="12" width="16" height="7" rx="1.5" fill="#71717a" />
                <text x="12" y="16.5" fill="white" fontSize="4.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle" dominantBaseline="middle">TXT</text>
            </svg>
        );
    }

    const typeText = ext.toUpperCase().substring(0, 3) || 'FILE';
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
            <path d="M7 2h8l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M15 2v5h5" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinejoin="round"/>
            <rect x="4" y="12" width="16" height="7" rx="1.5" fill="#6366f1" />
            <text x="12" y="16.5" fill="white" fontSize="4.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle" dominantBaseline="middle">{typeText}</text>
        </svg>
    );
}

function formatBytes(bytes: number, decimals = 1): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}