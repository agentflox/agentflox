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
    Crown,
    FolderPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import { EntityRenameDialog } from "../modals/EntityRenameDialog";
import { ShareModal } from "@/components/permissions/ShareModal";
import { ListCreationModal } from "@/entities/task/components/ListCreationModal";

interface FolderActionsMenuProps {
    workspaceId: string;
    spaceId: string;
    folderId: string;
    folderName: string;
    folderIcon?: string;
    folderColor?: string;
    trigger?: React.ReactNode;
}

export function FolderActionsMenu({
    workspaceId,
    spaceId,
    folderId,
    folderName,
    folderIcon,
    folderColor,
    trigger
}: FolderActionsMenuProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const queryClient = useQueryClient();

    // Dialog States
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [isCreateListOpen, setIsCreateListOpen] = useState(false);

    const updateFolder = trpc.folder.update.useMutation({
        onSuccess: () => {
            toast({ title: "Folder updated" });
            utils.folder.byContext.invalidate();
        },
        onError: () => toast({ title: "Failed to update folder", variant: "destructive" })
    });

    const handleCopyLink = () => {
        // Assuming a route structure, modify as needed
        const url = `${window.location.origin}/dashboard/s/${spaceId}/folder/${folderId}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Link copied to clipboard" });
    };

    const handleRename = () => {
        setRenameDialogOpen(true);
    };

    const handleSaveRename = (newName: string) => {
        updateFolder.mutate({ id: folderId, name: newName });
    };

    const handlePlaceholder = (feature: string) => {
        toast({ title: `${feature} coming soon`, description: "This feature is not yet implemented." });
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

                    <DropdownMenuItem onClick={() => setIsCreateListOpen(true)}>
                        <FolderPlus className="mr-2 h-4 w-4" /> Create List
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

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
                                    icon={folderIcon || "Folder"}
                                    color={folderColor || "#5e5f61ff"}
                                    spaceId={spaceId} // Using spaceId as fallback context
                                    entityName={folderName || "Folder"}
                                    onIconChange={(newIcon) => updateFolder.mutate({ id: folderId, icon: newIcon as any, color: folderColor })} // Casting icon if necessary
                                    onColorChange={(newColor) => updateFolder.mutate({ id: folderId, icon: (folderIcon as any) || "Folder", color: newColor })}
                                />
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>

                    <DropdownMenuItem onClick={() => handlePlaceholder("Hide Folder")}>
                        <EyeOff className="mr-2 h-4 w-4" /> Hide Folder
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setShareModalOpen(true)}>
                        <Shield className="mr-2 h-4 w-4" /> Manage Access
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => handlePlaceholder("Duplicate")}>
                        <CopyPlus className="mr-2 h-4 w-4" /> Duplicate
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => handlePlaceholder("Transfer Ownership")}>
                        <Crown className="mr-2 h-4 w-4" /> Transfer Ownership
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => handlePlaceholder("Archive")}>
                        <Archive className="mr-2 h-4 w-4" /> Archive
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => handlePlaceholder("Delete")} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => handlePlaceholder("Settings")}>
                        <Settings className="mr-2 h-4 w-4" /> Settings
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Modals */}
            <EntityRenameDialog
                open={renameDialogOpen}
                onOpenChange={setRenameDialogOpen}
                currentName={folderName}
                entityType="folder" // Assuming EntityRenameDialog supports 'folder' or just strict string
                onSave={handleSaveRename}
                isSaving={updateFolder.isPending}
            />

            <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                itemType="folder" // Assuming ShareModal supports 'folder'
                itemId={folderId}
                itemName={folderName}
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
        </>
    );
}
