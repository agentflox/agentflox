import React, { useState } from "react";
import {
    Star, Copy, Clock, BellOff, Mail, Plus, GitMerge, ArrowRight,
    Printer, History, Link, LayoutTemplate, PenTool, Archive, Trash2,
    Shield, MoreHorizontal, Edit3, FileText, Repeat, EyeOff, FolderInput,
    Share2, Link2, ExternalLink, Type, Smartphone, ListPlus, UserPlus, ChevronRight
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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

interface TaskActionsDropdownProps {
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
    /** e.g. 'rename' (open detail), 'archive' (move to archived list) */
    onAction?: (action: string) => void;
    /** Optional shareable task URL; if not provided, uses current origin + pathname + ?taskId= */
    getTaskUrl?: (task: any) => string;
    trigger?: React.ReactNode;
    tooltip?: string;
}

export function TaskActionsDropdown({
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
    trigger,
    tooltip
}: TaskActionsDropdownProps) {
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

    // Helper to render consistent menu items
    const MenuItem = ({ icon: Icon, label, shortcut, onClick, className, subMenu }: any) => {
        if (subMenu) {
            return (
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-xs py-1.5 focus:bg-zinc-100 data-[state=open]:bg-zinc-100">
                        <Icon className="h-3.5 w-3.5 mr-2 text-zinc-500" />
                        {label}
                    </DropdownMenuSubTrigger>
                    {subMenu}
                </DropdownMenuSub>
            );
        }
        return (
            <DropdownMenuItem
                onClick={onClick}
                className={cn("text-xs py-1.5 focus:bg-zinc-100 cursor-pointer", className)}
            >
                <Icon className={cn("h-3.5 w-3.5 mr-2 text-zinc-500", className?.includes('text-red') && "text-red-500")} />
                {label}
                {shortcut && <span className="ml-auto text-[10px] text-zinc-400">{shortcut}</span>}
            </DropdownMenuItem>
        );
    };

    const TriggerElement = trigger || (
        <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-900 group-data-[state=open]:opacity-100"
        >
            <MoreHorizontal className="h-4 w-4" />
        </Button>
    );

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            {tooltip ? (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                {TriggerElement}
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>{tooltip}</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ) : (
                <DropdownMenuTrigger asChild>
                    {TriggerElement}
                </DropdownMenuTrigger>
            )}
            <DropdownMenuContent align="end" className="w-64 p-0 animate-in fade-in-0 zoom-in-95 duration-100">
                {/* Top Actions Bar */}
                <div className="p-1 max-h-[80vh] overflow-y-auto overflow-x-hidden">
                    <MenuItem
                        icon={Edit3}
                        label="Rename"
                        onClick={() => {
                            setIsOpen(false);
                            onAction?.("rename");
                        }}
                    />

                    <MenuItem
                        icon={Star}
                        label={task.isStarred ? "Remove from favorites" : "Favorite"}
                        className={task.isStarred ? "text-amber-500" : ""}
                        onClick={handleToggleFavorite}
                    />

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="text-xs py-1.5 focus:bg-zinc-100 data-[state=open]:bg-zinc-100">
                            <Repeat className="h-3.5 w-3.5 mr-2 text-zinc-500" />
                            Convert to
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-48">
                            <DropdownMenuItem className="text-xs" onClick={() => { onAction?.("convertToTask"); setIsOpen(false); }}>Task</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs" onClick={() => { onAction?.("convertToList"); toast.info("Coming soon"); setIsOpen(false); }}>List</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs" onClick={() => { onAction?.("convertToSubtask"); toast.info("Coming soon"); setIsOpen(false); }}>Subtask</DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <MenuItem
                        icon={UserPlus}
                        label="Invite"
                        onClick={() => { setShareModalOpen(true); setIsOpen(false); }}
                    />

                    <MenuItem
                        icon={Shield}
                        label="Manage Access"
                        onClick={() => { setPermissionsModalOpen(true); setIsOpen(false); }}
                    />

                    <MenuItem
                        icon={Copy}
                        label="Duplicate"
                        onClick={() => { setDuplicateModalOpen(true); setIsOpen(false); }}
                    />

                    <RemindMePopover taskId={task.id}>
                        <DropdownMenuItem className="text-xs py-1.5 focus:bg-zinc-100 cursor-pointer">
                            <Clock className="h-3.5 w-3.5 mr-2 text-zinc-500" />
                            Remind me in Inbox
                            <ChevronRight className="h-3 w-3 ml-auto text-zinc-400" />
                        </DropdownMenuItem>
                    </RemindMePopover>

                    {task.isStarred && (
                        <MenuItem
                            icon={BellOff}
                            label="Unfollow task"
                            onClick={handleUnfollow}
                        />
                    )}

                    <MenuItem
                        icon={Mail}
                        label="Send email to task"
                        onClick={() => { setEmailModalOpen(true); setIsOpen(false); }}
                    />

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="text-xs py-1.5 focus:bg-zinc-100 data-[state=open]:bg-zinc-100">
                            <ListPlus className="h-3.5 w-3.5 mr-2 text-zinc-500" />
                            Add to
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-48">
                            <DropdownMenuItem className="text-xs" onClick={() => { setMoveModalOpen(true); setIsOpen(false); }}>Another List</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs" onClick={() => { handleToggleFavorite(); }}>Favorites</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs" onClick={() => { toast.info("LineUp coming soon"); setIsOpen(false); }}>LineUp</DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <MenuItem
                        icon={GitMerge}
                        label="Merge"
                        onClick={() => { setMergeModalOpen(true); setIsOpen(false); }}
                    />

                    <MenuItem
                        icon={ArrowRight}
                        label="Move"
                        onClick={() => { setMoveModalOpen(true); setIsOpen(false); }}
                    />

                    <MenuItem
                        icon={Printer}
                        label="Print"
                        onClick={() => { window.print(); setIsOpen(false); }}
                    />

                    <DropdownMenuSeparator className="my-1 bg-zinc-100" />

                    <div className="px-2 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Link
                    </div>
                    <MenuItem icon={Link2} label="Copy link" onClick={handleCopyLink} />
                    <MenuItem icon={Type} label="Copy task ID" onClick={handleCopyId} />
                    <MenuItem icon={ExternalLink} label="Open in new tab" onClick={handleOpenInNewTab} />

                    <DropdownMenuSeparator className="my-1 bg-zinc-100" />

                    <MenuItem
                        icon={History}
                        label="Description history"
                        onClick={() => { toast.info("History coming soon"); setIsOpen(false); }}
                    />

                    <DropdownMenuSeparator className="my-1 bg-zinc-100" />

                    <div className="px-2 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Advanced
                    </div>

                    <MenuItem
                        icon={Link}
                        label="Relationships"
                        subMenu={
                            <DropdownMenuSubContent className="w-48">
                                <DropdownMenuItem className="text-xs" onClick={() => { setDependenciesModalOpen(true); setIsOpen(false); }}>Dependency</DropdownMenuItem>
                                <DropdownMenuItem className="text-xs" onClick={() => { setDependenciesModalOpen(true); setIsOpen(false); }}>Link to task</DropdownMenuItem>
                                <DropdownMenuItem className="text-xs" onClick={() => { toast.info("Reference coming soon"); setIsOpen(false); }}>Reference</DropdownMenuItem>
                            </DropdownMenuSubContent>
                        }
                    />

                    <MenuItem
                        icon={PenTool}
                        label="Custom Fields"
                        onClick={() => { toast.info("Custom Fields coming soon"); setIsOpen(false); }}
                    />

                    <DropdownMenuSeparator className="my-1 bg-zinc-100" />

                    {/* Task Creation Modal Trigger for Subtask */}
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
                            <div className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-zinc-100 cursor-pointer text-zinc-900 focus:bg-zinc-100">
                                <Plus className="h-3.5 w-3.5 mr-2 text-zinc-500" />
                                Add Subtask
                            </div>
                        }
                    />

                    <DropdownMenuItem
                        onClick={async (e) => {
                            e.preventDefault();
                            if (onAction) {
                                onAction("archive");
                                setIsOpen(false);
                                return;
                            }
                            try {
                                await onUpdate(task.id, { statusId: "archived" });
                                toast.success("Task archived");
                                setIsOpen(false);
                            } catch {
                                toast.error("Failed to archive. Use a list with an Archived status or handle via parent.");
                            }
                        }}
                        className="text-xs py-1.5 focus:bg-zinc-100 cursor-pointer"
                    >
                        <Archive className="h-3.5 w-3.5 mr-2 text-zinc-500" />
                        Archive
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={(e) => {
                            e.preventDefault();
                            setIsOpen(false);
                            onDelete(task.id);
                        }}
                        className="text-xs py-1.5 focus:bg-red-50 focus:text-red-600 text-red-600 cursor-pointer"
                    >
                        <Trash2 className="h-3.5 w-3.5 mr-2 text-red-500" />
                        Delete
                    </DropdownMenuItem>
                </div>
            </DropdownMenuContent>

            {/* Modals */}
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
        </DropdownMenu >
    );
}

