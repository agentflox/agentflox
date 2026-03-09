import React, { useState } from "react";
import {
    Star, Copy, Clock, BellOff, Mail, Plus, GitMerge, ArrowRight,
    Printer, Link, PenTool, Archive, Trash2, UserPlus,
    Shield, Edit3, Link2, ExternalLink, Type, ChevronRight
} from "lucide-react";
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
import { TaskCreationModal } from "./TaskCreationModal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ShareModal } from "@/components/permissions/ShareModal";
import { TaskPermissionsModal } from "./TaskPermissionsModal";
import { DuplicateTaskModal } from "./DuplicateTaskModal";
import { TaskEmailModal } from "./TaskEmailModal";
import { TaskDependenciesModal } from "./TaskDependenciesModal";
import { MoveTaskModal } from "./MoveTaskModal";
import { MergeTaskModal } from "./MergeTaskModal";
import { RemindMePopover } from "./RemindMePopover";

export interface TaskActionsProps {
    task: any;
    context: 'SPACE' | 'PROJECT' | 'GENERAL';
    contextId?: string;
    workspaceId: string;
    users: any[];
    lists: any[];
    defaultListId?: string;
    availableStatuses: any[];
    onDelete: (taskId: string) => void;
    onUpdate: (taskId: string, data: any) => Promise<void>;
    onAction?: (action: string) => void;
    getTaskUrl?: (task: any) => string;
    tooltip?: string;
}

interface TaskActionsPopoverProps extends TaskActionsProps {
    children: React.ReactNode;
}

export function TaskActionsPopover({
    task,
    context,
    contextId,
    workspaceId,
    users,
    lists,
    defaultListId,
    availableStatuses,
    onDelete,
    onUpdate,
    onAction,
    getTaskUrl,
    children,
    tooltip
}: TaskActionsPopoverProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [dependenciesModalOpen, setDependenciesModalOpen] = useState(false);
    const [moveModalOpen, setMoveModalOpen] = useState(false);
    const [mergeModalOpen, setMergeModalOpen] = useState(false);

    const taskUrl = getTaskUrl
        ? getTaskUrl(task)
        : (typeof window !== "undefined"
            ? `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.search ? "&" : "?"}taskId=${task.id}`
            : "");

    const handleCopyLink = () => {
        navigator.clipboard.writeText(taskUrl || `${window.location?.origin || ""}/task/${task.customId || task.id}`);
        toast.success("Link copied to clipboard");
        setIsOpen(false);
    };

    const handleCopyId = () => {
        navigator.clipboard.writeText(task.customId || task.id);
        toast.success("Task ID copied to clipboard");
        setIsOpen(false);
    };

    const handleOpenInNewTab = () => {
        const url = taskUrl || `${window.location?.origin || ""}/task/${task.customId || task.id}`;
        window.open(url, "_blank");
        setIsOpen(false);
    };

    const handleToggleFavorite = async () => {
        try {
            await onUpdate(task.id, { isStarred: !task.isStarred });
            toast.success(task.isStarred ? "Removed from favorites" : "Added to favorites");
            setIsOpen(false);
        } catch {
            toast.error("Failed to update favorite");
        }
    };

    const handleUnfollow = async () => {
        try {
            await onUpdate(task.id, { isStarred: false });
            toast.success("Unfollowed task");
            setIsOpen(false);
        } catch {
            toast.error("Failed to unfollow");
        }
    };

    const ActionItem = ({ icon: Icon, label, shortcut, onClick, className, variant = "default" }: any) => {
        return (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onClick(e);
                }}
                className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors text-left",
                    variant === "danger"
                        ? "text-red-600 hover:bg-red-50"
                        : "text-zinc-700 hover:bg-zinc-100",
                    className
                )}
            >
                <Icon className={cn("h-3.5 w-3.5", variant === "danger" ? "text-red-500" : "text-zinc-500")} />
                <span className="flex-1">{label}</span>
                {shortcut && <span className="text-[10px] text-zinc-400">{shortcut}</span>}
            </button>
        );
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            {tooltip ? (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                                {children}
                            </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent>{tooltip}</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ) : (
                <PopoverTrigger asChild>
                    {children}
                </PopoverTrigger>
            )}
            <PopoverContent align="start" side="right" className="w-64 p-1 animate-in fade-in-0 zoom-in-95 duration-100">
                <div className="max-h-[80vh] overflow-y-auto overflow-x-hidden">
                    <ActionItem
                        icon={Edit3}
                        label="Rename"
                        onClick={() => {
                            setIsOpen(false);
                            onAction?.("rename");
                        }}
                    />

                    <ActionItem
                        icon={Star}
                        label={task.isStarred ? "Remove from favorites" : "Favorite"}
                        className={task.isStarred ? "text-amber-500" : ""}
                        onClick={handleToggleFavorite}
                    />

                    <ActionItem
                        icon={UserPlus}
                        label="Invite"
                        onClick={() => { setShareModalOpen(true); setIsOpen(false); }}
                    />

                    <ActionItem
                        icon={Shield}
                        label="Manage Access"
                        onClick={() => { setPermissionsModalOpen(true); setIsOpen(false); }}
                    />

                    <ActionItem
                        icon={Copy}
                        label="Duplicate"
                        onClick={() => { setDuplicateModalOpen(true); setIsOpen(false); }}
                    />

                    <RemindMePopover taskId={task.id}>
                        <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-zinc-100 transition-colors text-left text-zinc-700">
                            <Clock className="h-3.5 w-3.5 text-zinc-500" />
                            <span className="flex-1">Remind me in Inbox</span>
                            <ChevronRight className="h-3 w-3 text-zinc-400" />
                        </button>
                    </RemindMePopover>

                    {task.isStarred && (
                        <ActionItem
                            icon={BellOff}
                            label="Unfollow task"
                            onClick={handleUnfollow}
                        />
                    )}

                    <ActionItem
                        icon={Mail}
                        label="Send email to task"
                        onClick={() => { setEmailModalOpen(true); setIsOpen(false); }}
                    />

                    <ActionItem
                        icon={GitMerge}
                        label="Merge"
                        onClick={() => { setMergeModalOpen(true); setIsOpen(false); }}
                    />

                    <ActionItem
                        icon={ArrowRight}
                        label="Move"
                        onClick={() => { setMoveModalOpen(true); setIsOpen(false); }}
                    />

                    <ActionItem
                        icon={Printer}
                        label="Print"
                        onClick={() => { window.print(); setIsOpen(false); }}
                    />

                    <div className="my-1 h-[1px] bg-zinc-100" />

                    <div className="px-2 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Link
                    </div>
                    <ActionItem icon={Link2} label="Copy link" onClick={handleCopyLink} />
                    <ActionItem icon={Type} label="Copy task ID" onClick={handleCopyId} />
                    <ActionItem icon={ExternalLink} label="Open in new tab" onClick={handleOpenInNewTab} />

                    <div className="my-1 h-[1px] bg-zinc-100" />

                    <div className="px-2 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Advanced
                    </div>

                    <ActionItem
                        icon={Link}
                        label="Relationships"
                        onClick={() => { setDependenciesModalOpen(true); setIsOpen(false); }}
                    />

                    <ActionItem
                        icon={PenTool}
                        label="Custom Fields"
                        onClick={() => { toast.info("Custom Fields coming soon"); setIsOpen(false); }}
                    />

                    <div className="my-1 h-[1px] bg-zinc-100" />

                    <TaskCreationModal
                        context={context}
                        contextId={contextId}
                        workspaceId={workspaceId}
                        users={users}
                        lists={lists}
                        defaultListId={defaultListId}
                        availableStatuses={availableStatuses}
                        defaultParentId={task.id}
                        trigger={
                            <div className="flex select-none items-center rounded-md px-2 py-1.5 text-xs outline-none hover:bg-zinc-100 cursor-pointer text-zinc-700">
                                <Plus className="h-3.5 w-3.5 mr-2 text-zinc-500" />
                                Add Subtask
                            </div>
                        }
                    />

                    <ActionItem
                        icon={Archive}
                        label="Archive"
                        onClick={async () => {
                            if (onAction) {
                                onAction("archive");
                                setIsOpen(false);
                                return;
                            }
                            try {
                                await onUpdate(task.id, { isArchived: true });
                                toast.success("Task archived");
                                setIsOpen(false);
                            } catch {
                                toast.error("Failed to archive");
                            }
                        }}
                    />

                    <ActionItem
                        icon={Trash2}
                        label="Delete"
                        variant="danger"
                        onClick={() => {
                            setIsOpen(false);
                            onDelete(task.id);
                        }}
                    />
                </div>
            </PopoverContent>

            <DuplicateTaskModal
                open={duplicateModalOpen}
                onOpenChange={setDuplicateModalOpen}
                task={task}
                workspaceId={workspaceId}
            />
            <TaskEmailModal
                open={emailModalOpen}
                onOpenChange={setEmailModalOpen}
                task={task}
            />
            <TaskDependenciesModal
                open={dependenciesModalOpen}
                onOpenChange={setDependenciesModalOpen}
                task={task}
            />
            <MoveTaskModal
                open={moveModalOpen}
                onOpenChange={setMoveModalOpen}
                task={task}
                workspaceId={workspaceId}
            />
            <MergeTaskModal
                open={mergeModalOpen}
                onOpenChange={setMergeModalOpen}
                task={task}
                workspaceId={workspaceId}
            />
            <TaskPermissionsModal
                taskId={task.id}
                workspaceId={workspaceId}
                open={permissionsModalOpen}
                onOpenChange={setPermissionsModalOpen}
            />
            <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                itemType="task"
                itemId={task.id}
                itemName={task.title}
                workspaceId={workspaceId}
            />
        </Popover>
    );
}
