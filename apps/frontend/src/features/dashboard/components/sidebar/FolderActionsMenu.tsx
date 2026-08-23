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
    Crown,
    FolderPlus,
    SlidersHorizontal,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import { EntityRenameDialog } from "@/entities/shared/components/EntityRenameDialog";
import { ShareModal } from "@/components/permissions/ShareModal";
import { ListCreationModal } from "@/entities/lists/components/ListCreationModal";
import { FolderMoveToPopover } from "@/entities/folders/components/FolderMoveToPopover";
import { TemplateMenuPopover } from "@/entities/templates/components/TemplateMenuPopover";
import { CustomFieldsManagerModal } from "@/entities/customfields/components/CustomFieldsManagerModal";
import { DuplicateFolderModal } from "@/entities/folders/components/DuplicateFolderModal";
import { FolderArchiveModal } from "@/entities/folders/components/FolderArchiveModal";
import { FolderDeleteModal } from "@/entities/folders/components/FolderDeleteModal";
import { FolderTransferModal } from "@/entities/folders/components/FolderTransferModal";
import { FolderSettingsModal } from "@/entities/folders/components/FolderSettingsModal";
import { FolderPermissionsModal } from "@/entities/folders/components/FolderPermissionsModal";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface FolderActionsMenuProps {
    workspaceId: string;
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    folderId: string;
    folderName?: string;
    folderIcon?: string;
    folderColor?: string;
    trigger?: React.ReactNode;
    className?: string;
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
    sideOffset?: number;
}

export function FolderActionsMenu({
    workspaceId,
    spaceId,
    projectId,
    teamId,
    folderId,
    folderName,
    folderIcon,
    folderColor,
    trigger,
    className,
    side = "right",
    align = "start",
    sideOffset = 6,
}: FolderActionsMenuProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const queryClient = useQueryClient();
    const [popoverOpen, setPopoverOpen] = useState(false);

    const { data: folderData } = trpc.folder.get.useQuery(
        { id: folderId },
        { enabled: !folderName && !!folderId }
    );
    const effectiveFolderName = folderName || folderData?.name || "Folder";

    // Dialog States
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [isCreateListOpen, setIsCreateListOpen] = useState(false);
    const [customFieldsModalOpen, setCustomFieldsModalOpen] = useState(false);
    const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
    const [archiveModalOpen, setArchiveModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);
    const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);

    const updateFolder = trpc.folder.update.useMutation({
        onSuccess: () => {
            toast({ title: "Folder updated" });
            utils.folder.byContext.invalidate();
        },
        onError: () => toast({ title: "Failed to update folder", variant: "destructive" })
    });

    const handleCopyLink = () => {
        const url = projectId
            ? `${window.location.origin}/dashboard/projects/${projectId}?folder=${folderId}`
            : `${window.location.origin}/dashboard/s/${spaceId}/folder/${folderId}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Link copied to clipboard" });
        setPopoverOpen(false);
    };

    const handleRename = () => {
        setRenameDialogOpen(true);
        setPopoverOpen(false);
    };

    const handleSaveRename = (newName: string) => {
        updateFolder.mutate({ id: folderId, name: newName });
    };

    const handleHideFolder = () => {
        updateFolder.mutate({ id: folderId, isHidden: true } as any);
        toast({ title: "Folder hidden from sidebar" });
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
                            <p>Folder settings</p>
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
                        onClick={() => { setPopoverOpen(false); setIsCreateListOpen(true); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <FolderPlus className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Create List</span>
                    </button>

                    <div className="h-px bg-zinc-100 my-1 mx-1" />

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
                        entityType="FOLDER"
                        workspaceId={workspaceId}
                        contentToSave={{
                            id: folderId,
                            workspaceId,
                            spaceId,
                            projectId,
                            folderId,
                            name: folderName,
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
                                icon={folderIcon || "Folder"}
                                color={folderColor || "#5e5f61ff"}
                                spaceId={spaceId}
                                entityName={folderName || "Folder"}
                                onIconChange={(newIcon) => updateFolder.mutate({ id: folderId, icon: newIcon as any, color: folderColor })}
                                onColorChange={(newColor) => updateFolder.mutate({ id: folderId, icon: (folderIcon as any) || "Folder", color: newColor })}
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
                        onClick={handleHideFolder}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <EyeOff className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Hide Folder</span>
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

                    <FolderMoveToPopover
                        folderId={folderId}
                        folderName={effectiveFolderName}
                        workspaceId={workspaceId}
                    />

                    <button
                        type="button"
                        onClick={() => { setPopoverOpen(false); setDuplicateModalOpen(true); }}
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
                        onClick={() => { setPopoverOpen(false); setArchiveModalOpen(true); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <Archive className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Archive</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setPopoverOpen(false); setDeleteModalOpen(true); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <Trash2 className="h-4 w-4 shrink-0 text-red-500" />
                        <span>Delete</span>
                    </button>

                    <div className="h-px bg-zinc-100 my-1 mx-1" />

                    <button
                        type="button"
                        onClick={() => { setPopoverOpen(false); setSettingsModalOpen(true); }}
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
                currentName={effectiveFolderName}
                entityType="folder"
                onSave={handleSaveRename}
                isSaving={updateFolder.isPending}
            />

            <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                itemType="folder"
                itemId={folderId}
                itemName={effectiveFolderName}
                workspaceId={workspaceId}
            />

            <ListCreationModal
                context="SPACE"
                contextId={spaceId}
                folderId={folderId}
                workspaceId={workspaceId}
                open={isCreateListOpen}
                onOpenChange={setIsCreateListOpen}
            />

            <DuplicateFolderModal
                open={duplicateModalOpen}
                onOpenChange={setDuplicateModalOpen}
                folderId={folderId}
                folderName={effectiveFolderName}
                folderIcon={folderIcon}
                folderColor={folderColor}
            />

            <FolderSettingsModal
                open={settingsModalOpen}
                onOpenChange={setSettingsModalOpen}
                folderId={folderId}
                workspaceId={workspaceId}
                spaceId={spaceId}
            />

            <FolderArchiveModal
                open={archiveModalOpen}
                onOpenChange={setArchiveModalOpen}
                folderId={folderId}
                folderName={effectiveFolderName}
            />

            <FolderDeleteModal
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                folderId={folderId}
                folderName={effectiveFolderName}
            />

            <FolderTransferModal
                open={transferModalOpen}
                onOpenChange={setTransferModalOpen}
                folderId={folderId}
                folderName={effectiveFolderName}
            />

            <FolderPermissionsModal
                open={permissionsModalOpen}
                onOpenChange={setPermissionsModalOpen}
                folderId={folderId}
                workspaceId={workspaceId}
            />

            <CustomFieldsManagerModal
                open={customFieldsModalOpen}
                onOpenChange={setCustomFieldsModalOpen}
                workspaceId={workspaceId}
                initialLocation={`folder:${folderId}`}
            />
        </>
    );
}
