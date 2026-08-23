"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
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
    ChevronRight,
    SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import { EntityRenameDialog } from "@/entities/shared/components/EntityRenameDialog";
import { DuplicateSpaceModal } from "@/entities/spaces/components/DuplicateSpaceModal";
import { SpaceGeneralSettingsModal } from "@/entities/spaces/components/SpaceGeneralSettingsModal";
import { SpacePermissionsModal } from "@/entities/spaces/components/SpacePermissionsModal";
import { SpaceArchiveModal } from "@/entities/spaces/components/SpaceArchiveModal";
import { SpaceDeleteModal } from "@/entities/spaces/components/SpaceDeleteModal";
import { SpaceTransferModal } from "@/entities/spaces/components/SpaceTransferModal";
import { SpaceMoveToPopover } from "@/entities/spaces/components/SpaceMoveToPopover";
import { TemplateMenuPopover } from "@/entities/templates/components/TemplateMenuPopover";
import { CustomFieldsManagerModal } from "@/entities/customfields/components/CustomFieldsManagerModal";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface SpaceActionsMenuProps {
    workspaceId: string;
    spaceId: string;
    trigger?: React.ReactNode;
    className?: string;
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
    sideOffset?: number;
}

export function SpaceActionsMenu({
    workspaceId,
    spaceId,
    trigger,
    className,
    side = "right",
    align = "start",
    sideOffset = 6,
}: SpaceActionsMenuProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const queryClient = useQueryClient();
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
    const [generalSettingsOpen, setGeneralSettingsOpen] = useState(false);
    const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [archiveModalOpen, setArchiveModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [customFieldsModalOpen, setCustomFieldsModalOpen] = useState(false);

    const { data: space } = trpc.space.get.useQuery({ id: spaceId }, { enabled: !!spaceId });

    const renameSpace = trpc.space.update.useMutation({
        onMutate: async (variables) => {
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
            if (space?.workspaceId) {
                utils.workspace.get.invalidate({ id: space.workspaceId });
            }
        },
        onError: () => toast({ title: "Failed to rename space", variant: "destructive" })
    });

    const updateIconColor = trpc.space.update.useMutation({
        onMutate: async (variables) => {
            queryClient.setQueriesData({ queryKey: [['space', 'listInfinite']] }, (oldData: any) => {
                if (!oldData || !oldData.pages) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: any) => ({
                        ...page,
                        items: page.items.map((item: any) =>
                            item.id === spaceId
                                ? { ...item, icon: (variables as any).icon, color: (variables as any).color }
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
            if (space?.workspaceId) {
                utils.workspace.get.invalidate({ id: space.workspaceId });
            }
        },
        onError: () => toast({ title: "Failed to update", variant: "destructive" })
    });

    const toggleVisibility = (trpc.space as any).toggleSidebarVisibility.useMutation({
        onSuccess: (data: { isHidden?: boolean }) => {
            const status = data.isHidden ? "hidden from" : "visible in";
            toast({ title: `Space ${status} sidebar` });
            utils.space.list.invalidate();
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
        setPopoverOpen(false);
    };

    const handleRename = () => {
        setRenameDialogOpen(true);
        setPopoverOpen(false);
    };

    const handleSaveRename = (newName: string) => {
        renameSpace.mutate({ id: spaceId, name: newName });
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
                            <p>Space settings</p>
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
                        entityType="SPACE"
                        workspaceId={workspaceId}
                        contentToSave={{
                            id: spaceId,
                            workspaceId: space?.workspaceId ?? workspaceId,
                            spaceId,
                            name: space?.name ?? "Space",
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
                                icon={space?.icon || "Rocket"}
                                color={space?.color || "#5e5f61ff"}
                                spaceId={spaceId}
                                entityName={space?.name || "Space"}
                                onIconChange={(newIcon) => updateIconColor.mutate({ id: spaceId, icon: newIcon, color: space?.color || "#3B82F6" })}
                                onColorChange={(newColor) => updateIconColor.mutate({ id: spaceId, icon: space?.icon || "Rocket", color: newColor })}
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

                    <div className="h-px bg-zinc-100 my-1 mx-1" />

                    <button
                        type="button"
                        onClick={() => { setPopoverOpen(false); toggleVisibility.mutate({ spaceId }); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <EyeOff className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Hide Space</span>
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

                    <SpaceMoveToPopover
                        spaceId={spaceId}
                        spaceName={space?.name || ""}
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
                        onClick={() => { setPopoverOpen(false); setGeneralSettingsOpen(true); }}
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
                    workspaceId={space.workspaceId ?? workspaceId ?? ""}
                />
            )}

            <SpacePermissionsModal
                workspaceId={workspaceId}
                spaceId={spaceId}
                open={permissionsModalOpen}
                onOpenChange={setPermissionsModalOpen}
            />

            <CustomFieldsManagerModal
                open={customFieldsModalOpen}
                onOpenChange={setCustomFieldsModalOpen}
                workspaceId={workspaceId}
                initialLocation={`space:${spaceId}`}
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
