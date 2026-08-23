"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { EnhancedIconPicker } from "@/components/ui/enhanced-icon-picker";
import {
    MoreHorizontal,
    Pencil,
    Copy,
    Palette,
    Archive,
    Trash2,
    Settings,
    CopyPlus,
    UserPlus,
    EyeOff,
    Shield,
    SlidersHorizontal,
    Crown,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import { EntityRenameDialog } from "@/entities/shared/components/EntityRenameDialog";
import { DuplicateListModal } from "@/entities/lists/components/DuplicateListModal";
import { ListArchiveModal } from "@/entities/lists/components/ListArchiveModal";
import { ListSettingsModal } from "@/entities/lists/components/ListSettingsModal";
import { ListDeleteModal } from "@/entities/lists/components/ListDeleteModal";
import { ListTransferModal } from "@/entities/lists/components/ListTransferModal";
import { ListPermissionsModal } from "@/entities/lists/components/ListPermissionsModal";
import { ShareModal } from "@/components/permissions/ShareModal";
import { ListMoveToPopover } from "@/entities/lists/components/ListMoveToPopover";
import { TemplateMenuPopover } from "@/entities/templates/components/TemplateMenuPopover";
import { CustomFieldsManagerModal } from "@/entities/customfields/components/CustomFieldsManagerModal";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface ListActionsMenuProps {
    workspaceId: string;
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    listId: string;
    trigger?: React.ReactNode;
    className?: string;
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
    sideOffset?: number;
}

export function ListActionsMenu({
    workspaceId,
    spaceId,
    projectId,
    teamId,
    listId,
    trigger,
    className,
    side = "right",
    align = "start",
    sideOffset = 6,
}: ListActionsMenuProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const queryClient = useQueryClient();
    const [popoverOpen, setPopoverOpen] = useState(false);

    // Dialog States
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
    const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [customFieldsModalOpen, setCustomFieldsModalOpen] = useState(false);
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);

    const { data: listsData } = trpc.list.byContext.useQuery(
        { spaceId, projectId, workspaceId },
        { enabled: !!(spaceId || projectId || workspaceId) }
    );

    const list = listsData?.items?.find((l: any) => l.id === listId);

    const updateList = trpc.list.update.useMutation({
        onSuccess: () => {
            utils.list.byContext.invalidate();
            if (spaceId) {
                utils.space.get.invalidate({ id: spaceId });
            }
            if (projectId) {
                utils.project.get.invalidate({ id: projectId });
            }
        },
        onError: () => toast({ title: "Failed to update list", variant: "destructive" })
    });

    const handleCopyLink = () => {
        const url = projectId
            ? `${window.location.origin}${window.location.pathname}?pj=${projectId}&list=${listId}`
            : `${window.location.origin}${window.location.pathname}?list=${listId}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Link copied to clipboard" });
        setPopoverOpen(false);
    };

    const handleRename = () => {
        setRenameDialogOpen(true);
        setPopoverOpen(false);
    };

    const handleSaveRename = (newName: string) => {
        updateList.mutate({ id: listId, name: newName });
    };

    const handleHideList = () => {
        updateList.mutate({ id: listId, isHidden: true } as any);
        toast({ title: "List hidden from sidebar" });
        setPopoverOpen(false);
    };

    return (
        <>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                {trigger ? (
                    <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                        {trigger}
                    </PopoverTrigger>
                ) : (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 inline-flex items-center justify-center rounded-sm hover:bg-zinc-200 text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                    <MoreHorizontal size={16} />
                                </Button>
                            </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>List settings</p>
                        </TooltipContent>
                    </Tooltip>
                )}
                <PopoverContent
                    side={side}
                    align={align}
                    sideOffset={sideOffset}
                    className={cn("w-56 p-1.5 bg-white rounded-xl shadow-xl border border-zinc-200/90 flex flex-col gap-0.5 z-50", className)}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={() => { setPopoverOpen(false); setShareModalOpen(true); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <UserPlus className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Invite</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleRename}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <Pencil className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Rename</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleCopyLink}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <Copy className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Copy Link</span>
                    </button>

                    <TemplateMenuPopover
                        entityType="LIST"
                        workspaceId={workspaceId}
                        contentToSave={{
                            id: listId,
                            workspaceId,
                            spaceId: list?.spaceId ?? spaceId ?? undefined,
                            projectId: list?.projectId ?? projectId ?? undefined,
                            teamId: list?.teamId ?? undefined,
                            folderId: list?.folderId ?? undefined,
                            listId,
                            name: list?.name ?? "List",
                        }}
                        triggerClassName="text-sm font-normal"
                    />

                    <Popover>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className="flex items-center justify-between px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                            >
                                <div className="flex items-center gap-2">
                                    <Palette className="h-4 w-4 shrink-0 text-zinc-500" />
                                    <span>Color & Icon</span>
                                </div>
                                <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent side="right" align="start" className="p-0 border-0 bg-transparent shadow-none w-auto" sideOffset={12}>
                            <EnhancedIconPicker
                                icon={list?.icon || "List"}
                                color={list?.color || "#5e5f61ff"}
                                spaceId={listId}
                                entityName={list?.name || "List"}
                                onIconChange={(newIcon) => updateList.mutate({ id: listId, icon: newIcon, color: list?.color || "#3B82F6" })}
                                onColorChange={(newColor) => updateList.mutate({ id: listId, icon: list?.icon || "List", color: newColor })}
                            />
                        </PopoverContent>
                    </Popover>

                    <button
                        type="button"
                        onClick={() => { setPopoverOpen(false); setCustomFieldsModalOpen(true); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <SlidersHorizontal className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Custom Fields</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleHideList}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <EyeOff className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Hide List</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setPopoverOpen(false); setPermissionsModalOpen(true); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <Shield className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Manage Access</span>
                    </button>

                    <div className="h-px bg-zinc-100 my-1 mx-1" />

                    <ListMoveToPopover
                        listId={listId}
                        listName={list?.name || ""}
                        workspaceId={workspaceId}
                    />

                    <button
                        type="button"
                        onClick={() => { setPopoverOpen(false); setDuplicateDialogOpen(true); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <CopyPlus className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Duplicate</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setPopoverOpen(false); setTransferModalOpen(true); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <Crown className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Transfer Ownership</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setPopoverOpen(false); setArchiveDialogOpen(true); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <Archive className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Archive</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setPopoverOpen(false); setDeleteDialogOpen(true); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <Trash2 className="h-4 w-4 shrink-0 text-red-500" />
                        <span>Delete</span>
                    </button>

                    <div className="h-px bg-zinc-100 my-1 mx-1" />

                    <button
                        type="button"
                        onClick={() => { setPopoverOpen(false); setSettingsDialogOpen(true); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <Settings className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Settings</span>
                    </button>
                </PopoverContent>
            </Popover>

            {/* Modals */}
            <EntityRenameDialog
                open={renameDialogOpen}
                onOpenChange={setRenameDialogOpen}
                currentName={list?.name || ""}
                entityType="list"
                onSave={handleSaveRename}
                isSaving={updateList.isPending}
            />

            <DuplicateListModal
                open={duplicateDialogOpen}
                onOpenChange={setDuplicateDialogOpen}
                listId={listId}
                listName={list?.name || ""}
                listIcon={list?.icon || "📋"}
                listColor={list?.color || "#5e5f61ff"}
            />

            <ListSettingsModal
                open={settingsDialogOpen}
                onOpenChange={setSettingsDialogOpen}
                listId={listId}
                workspaceId={workspaceId}
                spaceId={spaceId}
            />

            <ListArchiveModal
                open={archiveDialogOpen}
                onOpenChange={setArchiveDialogOpen}
                listId={listId}
                listName={list?.name || ""}
            />

            <ListDeleteModal
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                listId={listId}
                listName={list?.name || ""}
            />

            <ListTransferModal
                open={transferModalOpen}
                onOpenChange={setTransferModalOpen}
                listId={listId}
                listName={list?.name || ""}
            />

            <ListPermissionsModal
                open={permissionsModalOpen}
                onOpenChange={setPermissionsModalOpen}
                listId={listId}
                workspaceId={workspaceId}
            />

            {workspaceId && (
                <ShareModal
                    isOpen={shareModalOpen}
                    onClose={() => setShareModalOpen(false)}
                    itemType="list"
                    itemId={listId}
                    itemName={list?.name || "List"}
                    workspaceId={workspaceId}
                />
            )}

            <CustomFieldsManagerModal
                open={customFieldsModalOpen}
                onOpenChange={setCustomFieldsModalOpen}
                workspaceId={workspaceId}
                initialLocation={`list:${listId}`}
            />
        </>
    );
}
