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
import { ShareModal } from "@/components/permissions/ShareModal";
import {
    MoreHorizontal,
    Pencil,
    Copy,
    Palette,
    EyeOff,
    Settings,
    CopyPlus,
    Archive,
    Trash2,
    Shield,
    Crown,
    UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import { EntityRenameDialog } from "../modals/EntityRenameDialog";
import { DuplicateSpaceModal } from "../modals/DuplicateSpaceModal";
import { SpaceGeneralSettingsModal } from "@/entities/spaces/components/SpaceGeneralSettingsModal";
import { SpacePermissionsModal } from "@/entities/spaces/components/SpacePermissionsModal";
import { SpaceArchiveModal } from "@/entities/spaces/components/SpaceArchiveModal";
import { SpaceDeleteModal } from "@/entities/spaces/components/SpaceDeleteModal";
import { SpaceTransferModal } from "@/entities/spaces/components/SpaceTransferModal";

interface SpaceActionsMenuProps {
    workspaceId: string;
    spaceId: string;
    trigger?: React.ReactNode;
}

export function SpaceActionsMenu({ workspaceId, spaceId, trigger }: SpaceActionsMenuProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const queryClient = useQueryClient();
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
    const [generalSettingsOpen, setGeneralSettingsOpen] = useState(false);
    const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [archiveModalOpen, setArchiveModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [transferModalOpen, setTransferModalOpen] = useState(false);

    const { data: space } = trpc.space.get.useQuery({ id: spaceId }, { enabled: !!spaceId });

    const renameSpace = trpc.space.update.useMutation({
        onMutate: async (variables) => {
            // Optimistic update for instant UI feedback
            queryClient.setQueriesData({ queryKey: [['space', 'listInfinite']] }, (oldData: any) => {
                if (!oldData || !oldData.pages) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: any) => ({
                        ...page,
                        items: page.items.map((item: any) =>
                            item.id === spaceId
                                ? { ...item, name: variables.name }
                                : item
                        )
                    }))
                };
            });
        },
        onSuccess: () => {
            toast({ title: "Space renamed" });
            utils.space.get.invalidate({ id: spaceId });
            utils.space.list.invalidate();
            utils.space.listInfinite.invalidate();
            if (space?.workspaceId) {
                utils.workspace.get.invalidate({ id: space.workspaceId });
            }
        },
        onError: () => toast({ title: "Failed to rename space", variant: "destructive" })
    });

    const updateIconColor = trpc.space.update.useMutation({
        onMutate: async (variables) => {
            // Optimistic update for instant UI feedback
            queryClient.setQueriesData({ queryKey: [['space', 'listInfinite']] }, (oldData: any) => {
                if (!oldData || !oldData.pages) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: any) => ({
                        ...page,
                        items: page.items.map((item: any) =>
                            item.id === spaceId
                                ? { ...item, icon: variables.icon, color: variables.color }
                                : item
                        )
                    }))
                };
            });
        },
        onSuccess: () => {
            toast({ title: "Icon and color updated" });
            utils.space.get.invalidate({ id: spaceId });
            utils.space.list.invalidate();
            utils.space.listInfinite.invalidate();
            if (space?.workspaceId) {
                utils.workspace.get.invalidate({ id: space.workspaceId });
            }
        },
        onError: () => toast({ title: "Failed to update", variant: "destructive" })
    });

    const toggleVisibility = trpc.space.toggleSidebarVisibility.useMutation({
        onSuccess: (data) => {
            const status = data.isHidden ? "hidden from" : "visible in";
            toast({ title: `Space ${status} sidebar` });
            utils.space.list.invalidate();
            utils.space.listInfinite.invalidate();
            if (space?.workspaceId) {
                utils.workspace.get.invalidate({ id: space.workspaceId });
            }
        },
        onError: () => toast({ title: "Failed to update visibility", variant: "destructive" })
    });

    const handleCopyLink = () => {
        const url = `${window.location.origin}/dashboard/s/${spaceId}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Link copied to clipboard" });
    };

    const handleRename = () => {
        setRenameDialogOpen(true);
    };

    const handleSaveRename = (newName: string) => {
        renameSpace.mutate({ id: spaceId, name: newName });
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
                                    icon={space?.icon || "Rocket"}
                                    color={space?.color || "#5e5f61ff"}
                                    spaceId={spaceId}
                                    entityName={space?.name || "Space"}
                                    onIconChange={(newIcon) => updateIconColor.mutate({ id: spaceId, icon: newIcon, color: space?.color || "#3B82F6" })}
                                    onColorChange={(newColor) => updateIconColor.mutate({ id: spaceId, icon: space?.icon || "Rocket", color: newColor })}
                                />
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => toggleVisibility.mutate({ spaceId })}>
                        <EyeOff className="mr-2 h-4 w-4" /> Hide Space
                    </DropdownMenuItem>

                    {/* Permissions Modal separate from Share for granular control */}
                    <DropdownMenuItem onClick={() => setPermissionsModalOpen(true)}>
                        <Shield className="mr-2 h-4 w-4" /> Manage Access
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => setDuplicateModalOpen(true)}>
                        <CopyPlus className="mr-2 h-4 w-4" /> Duplicate
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setTransferModalOpen(true)}>
                        <Crown className="mr-2 h-4 w-4" /> Transfer Ownership
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setArchiveModalOpen(true)}>
                        <Archive className="mr-2 h-4 w-4" /> Archive
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setDeleteModalOpen(true)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => setGeneralSettingsOpen(true)}>
                        <Settings className="mr-2 h-4 w-4" /> Settings
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Modals */}
            <EntityRenameDialog
                open={renameDialogOpen}
                onOpenChange={setRenameDialogOpen}
                currentName={space?.name || ""}
                entityType="space"
                onSave={handleSaveRename}
                isSaving={renameSpace.isPending}
            />

            <DuplicateSpaceModal
                open={duplicateModalOpen}
                onOpenChange={setDuplicateModalOpen}
                spaceId={spaceId}
                spaceName={space?.name || ""}
                spaceIcon={space?.icon || "🚀"}
                spaceColor={space?.color || "#3B82F6"}
            />

            <SpaceGeneralSettingsModal
                spaceId={spaceId}
                open={generalSettingsOpen}
                onOpenChange={setGeneralSettingsOpen}
            />

            {space && (
                <ShareModal
                    isOpen={shareModalOpen}
                    onClose={() => setShareModalOpen(false)}
                    itemType="space"
                    itemId={spaceId}
                    itemName={space.name}
                    workspaceId={space.workspaceId}
                />
            )}

            <SpacePermissionsModal
                workspaceId={workspaceId}
                spaceId={spaceId}
                open={permissionsModalOpen}
                onOpenChange={setPermissionsModalOpen}
            />

            <SpaceTransferModal
                spaceId={spaceId}
                spaceName={space?.name || ""}
                open={transferModalOpen}
                onOpenChange={setTransferModalOpen}
            />

            <SpaceArchiveModal
                spaceId={spaceId}
                spaceName={space?.name || ""}
                open={archiveModalOpen}
                onOpenChange={setArchiveModalOpen}
            />

            <SpaceDeleteModal
                spaceId={spaceId}
                spaceName={space?.name || ""}
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
            />
        </>
    );
}
