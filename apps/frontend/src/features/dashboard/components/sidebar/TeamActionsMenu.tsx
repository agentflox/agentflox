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
import { DuplicateTeamModal } from "../modals/DuplicateTeamModal";
import { TeamGeneralSettingsModal } from "@/entities/teams/components/TeamGeneralSettingsModal";
import { TeamPermissionsModal } from "@/entities/teams/components/TeamPermissionsModal";
import { TeamArchiveModal } from "@/entities/teams/components/TeamArchiveModal";
import { TeamDeleteModal } from "@/entities/teams/components/TeamDeleteModal";
import { TeamTransferModal } from "@/entities/teams/components/TeamTransferModal";

interface TeamActionsMenuProps {
    workspaceId: string;
    teamId: string;
    trigger?: React.ReactNode;
}

export function TeamActionsMenu({ workspaceId, teamId, trigger }: TeamActionsMenuProps) {
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

    const { data: team } = trpc.team.get.useQuery({ id: teamId }, { enabled: !!teamId });

    const renameTeam = trpc.team.update.useMutation({
        onMutate: async (variables) => {
            // Optimistic update for instant UI feedback
            queryClient.setQueriesData({ queryKey: [['team', 'listInfinite']] }, (oldData: any) => {
                if (!oldData || !oldData.pages) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: any) => ({
                        ...page,
                        items: page.items.map((item: any) =>
                            item.id === teamId
                                ? { ...item, name: variables.name }
                                : item
                        )
                    }))
                };
            });
        },
        onSuccess: () => {
            toast({ title: "Team renamed" });
            utils.team.get.invalidate({ id: teamId });
            utils.team.list.invalidate();
            utils.team.listInfinite.invalidate();
            if (team?.workspaceId) {
                utils.workspace.get.invalidate({ id: team.workspaceId });
            }
        },
        onError: () => toast({ title: "Failed to rename team", variant: "destructive" })
    });

    const updateIconColor = trpc.team.update.useMutation({
        onMutate: async (variables) => {
            // Optimistic update for instant UI feedback
            queryClient.setQueriesData({ queryKey: [['team', 'listInfinite']] }, (oldData: any) => {
                if (!oldData || !oldData.pages) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: any) => ({
                        ...page,
                        items: page.items.map((item: any) =>
                            item.id === teamId
                                ? { ...item, icon: variables.icon, color: variables.color }
                                : item
                        )
                    }))
                };
            });
        },
        onSuccess: () => {
            toast({ title: "Icon and color updated" });
            utils.team.get.invalidate({ id: teamId });
            utils.team.list.invalidate();
            utils.team.listInfinite.invalidate();
            if (team?.workspaceId) {
                utils.workspace.get.invalidate({ id: team.workspaceId });
            }
        },
        onError: () => toast({ title: "Failed to update", variant: "destructive" })
    });

    const toggleVisibility = trpc.team.toggleSidebarVisibility.useMutation({
        onSuccess: (data) => {
            const status = data.isHidden ? "hidden from" : "visible in";
            toast({ title: `Team ${status} sidebar` });
            utils.team.list.invalidate();
            utils.team.listInfinite.invalidate();
            if (team?.workspaceId) {
                utils.workspace.get.invalidate({ id: team.workspaceId });
            }
        },
        onError: () => toast({ title: "Failed to update visibility", variant: "destructive" })
    });

    const handleCopyLink = () => {
        const url = `${window.location.origin}/dashboard/t/${teamId}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Link copied to clipboard" });
    };

    const handleRename = () => {
        setRenameDialogOpen(true);
    };

    const handleSaveRename = (newName: string) => {
        renameTeam.mutate({ id: teamId, name: newName });
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
                                    icon={team?.icon || "Users"}
                                    color={team?.color || "#8B5CF6"}
                                    teamId={teamId}
                                    entityName={team?.name || "Team"}
                                    onIconChange={(newIcon) => updateIconColor.mutate({ id: teamId, icon: newIcon, color: team?.color || "#8B5CF6" })}
                                    onColorChange={(newColor) => updateIconColor.mutate({ id: teamId, icon: team?.icon || "Users", color: newColor })}
                                />
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => toggleVisibility.mutate({ teamId })}>
                        <EyeOff className="mr-2 h-4 w-4" /> Hide Team
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
                currentName={team?.name || ""}
                entityType="team"
                onSave={handleSaveRename}
                isSaving={renameTeam.isPending}
            />

            <DuplicateTeamModal
                open={duplicateModalOpen}
                onOpenChange={setDuplicateModalOpen}
                teamId={teamId}
                teamName={team?.name || ""}
                teamIcon={team?.icon || "👥"}
                teamColor={team?.color || "#8B5CF6"}
            />

            <TeamGeneralSettingsModal
                teamId={teamId}
                open={generalSettingsOpen}
                onOpenChange={setGeneralSettingsOpen}
            />

            {team && (
                <ShareModal
                    isOpen={shareModalOpen}
                    onClose={() => setShareModalOpen(false)}
                    itemType="team"
                    itemId={teamId}
                    itemName={team.name}
                    workspaceId={team.workspaceId}
                />
            )}

            <TeamPermissionsModal
                workspaceId={workspaceId}
                teamId={teamId}
                open={permissionsModalOpen}
                onOpenChange={setPermissionsModalOpen}
            />

            <TeamTransferModal
                teamId={teamId}
                teamName={team?.name || ""}
                open={transferModalOpen}
                onOpenChange={setTransferModalOpen}
            />

            <TeamArchiveModal
                teamId={teamId}
                teamName={team?.name || ""}
                open={archiveModalOpen}
                onOpenChange={setArchiveModalOpen}
            />

            <TeamDeleteModal
                teamId={teamId}
                teamName={team?.name || ""}
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
            />
        </>
    );
}
