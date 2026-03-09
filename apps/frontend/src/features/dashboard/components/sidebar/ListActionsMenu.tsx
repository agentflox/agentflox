"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import { EntityRenameDialog } from "../modals/EntityRenameDialog";
import { DuplicateListModal } from "@/entities/lists/components/DuplicateListModal";
import { ListArchiveModal } from "@/entities/lists/components/ListArchiveModal";
import { ListSettingsModal } from "@/entities/lists/components/ListSettingsModal";
import { ListDeleteModal } from "@/entities/lists/components/ListDeleteModal";
import { ShareModal } from "@/components/permissions/ShareModal";

interface ListActionsMenuProps {
    workspaceId: string;
    spaceId?: string;
    listId: string;
    trigger?: React.ReactNode;
}

export function ListActionsMenu({ workspaceId, spaceId, listId, trigger }: ListActionsMenuProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const queryClient = useQueryClient();

    // Dialog States
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
    const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);

    const { data: listsData } = trpc.list.byContext.useQuery(
        { spaceId, workspaceId },
        { enabled: !!(spaceId || workspaceId) }
    );

    const list = listsData?.items?.find((l: any) => l.id === listId);

    const updateList = trpc.list.update.useMutation({
        onSuccess: () => {
            toast({ title: "List updated" });
            utils.list.byContext.invalidate();
            if (spaceId) {
                utils.space.get.invalidate({ id: spaceId });
            }
        },
        onError: () => toast({ title: "Failed to update list", variant: "destructive" })
    });

    const handleCopyLink = () => {
        const url = `${window.location.origin}${window.location.pathname}?list=${listId}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Link copied to clipboard" });
    };

    const handleRename = () => {
        setRenameDialogOpen(true);
    };

    const handleSaveRename = (newName: string) => {
        updateList.mutate({ id: listId, name: newName });
    };

    const handleHideList = () => {
        // Placeholder for future implementation
        toast({ title: "Hide list functionality coming soon", description: "You can archive the list to hide it from everyone." });
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    {trigger || (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-zinc-900 focus-visible:ring-0">
                            <MoreHorizontal size={16} />
                        </Button>
                    )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuLabel className="text-xs text-zinc-400 uppercase tracking-wider">Actions</DropdownMenuLabel>

                    <DropdownMenuItem onClick={() => setShareModalOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" /> Invite
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={handleRename}>
                        <Pencil className="mr-2 h-4 w-4" /> Rename
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={handleCopyLink}>
                        <Copy className="mr-2 h-4 w-4" /> Copy Link
                    </DropdownMenuItem>

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Palette className="mr-2 h-4 w-4" /> Color & Icon
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent className="p-0 border-0 bg-transparent shadow-none w-auto" sideOffset={12}>
                                <EnhancedIconPicker
                                    icon={list?.icon || "List"}
                                    color={list?.color || "#5e5f61ff"}
                                    spaceId={listId}
                                    entityName={list?.name || "List"}
                                    onIconChange={(newIcon) => updateList.mutate({ id: listId, icon: newIcon, color: list?.color || "#3B82F6" })}
                                    onColorChange={(newColor) => updateList.mutate({ id: listId, icon: list?.icon || "List", color: newColor })}
                                />
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>

                    <DropdownMenuItem onClick={handleHideList}>
                        <EyeOff className="mr-2 h-4 w-4" /> Hide List
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setShareModalOpen(true)}>
                        <Shield className="mr-2 h-4 w-4" /> Manage Access
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => setDuplicateDialogOpen(true)}>
                        <CopyPlus className="mr-2 h-4 w-4" /> Duplicate
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setArchiveDialogOpen(true)}>
                        <Archive className="mr-2 h-4 w-4" /> Archive
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => setSettingsDialogOpen(true)}>
                        <Settings className="mr-2 h-4 w-4" /> Settings
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

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
                listIcon={list?.icon || ""}
                listColor={list?.color || ""}
            />

            <ListArchiveModal
                open={archiveDialogOpen}
                onOpenChange={setArchiveDialogOpen}
                listId={listId}
                listName={list?.name || ""}
            />

            <ListSettingsModal
                workspaceId={workspaceId}
                spaceId={spaceId}
                listId={listId}
                open={settingsDialogOpen}
                onOpenChange={setSettingsDialogOpen}
            />

            <ListDeleteModal
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                listId={listId}
                listName={list?.name || ""}
            />

            <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                itemType="list"
                itemId={listId}
                itemName={list?.name || "List"}
                workspaceId={workspaceId}
            />
        </>
    );
}
