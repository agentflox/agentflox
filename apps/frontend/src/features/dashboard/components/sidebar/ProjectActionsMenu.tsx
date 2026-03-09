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
import { DuplicateProjectModal } from "../modals/DuplicateProjectModal";
import { ProjectGeneralSettingsModal } from "@/entities/projects/components/ProjectGeneralSettingsModal";
import { ProjectPermissionsModal } from "@/entities/projects/components/ProjectPermissionsModal";
import { ProjectArchiveModal } from "@/entities/projects/components/ProjectArchiveModal";
import { ProjectDeleteModal } from "@/entities/projects/components/ProjectDeleteModal";
import { ProjectTransferModal } from "@/entities/projects/components/ProjectTransferModal";

interface ProjectActionsMenuProps {
    workspaceId: string;
    projectId: string;
    trigger?: React.ReactNode;
}

export function ProjectActionsMenu({ workspaceId, projectId, trigger }: ProjectActionsMenuProps) {
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

    const { data: project } = trpc.project.get.useQuery({ id: projectId }, { enabled: !!projectId });

    const renameProject = trpc.project.update.useMutation({
        onMutate: async (variables) => {
            // Optimistic update for instant UI feedback
            queryClient.setQueriesData({ queryKey: [['project', 'listInfinite']] }, (oldData: any) => {
                if (!oldData || !oldData.pages) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: any) => ({
                        ...page,
                        items: page.items.map((item: any) =>
                            item.id === projectId
                                ? { ...item, name: variables.name }
                                : item
                        )
                    }))
                };
            });
        },
        onSuccess: () => {
            toast({ title: "Project renamed" });
            utils.project.get.invalidate({ id: projectId });
            utils.project.list.invalidate();
            utils.project.listInfinite.invalidate();
            if (project?.workspaceId) {
                utils.workspace.get.invalidate({ id: project.workspaceId });
            }
        },
        onError: () => toast({ title: "Failed to rename project", variant: "destructive" })
    });

    const updateIconColor = trpc.project.update.useMutation({
        onMutate: async (variables) => {
            // Optimistic update for instant UI feedback
            queryClient.setQueriesData({ queryKey: [['project', 'listInfinite']] }, (oldData: any) => {
                if (!oldData || !oldData.pages) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: any) => ({
                        ...page,
                        items: page.items.map((item: any) =>
                            item.id === projectId
                                ? { ...item, icon: variables.icon, color: variables.color }
                                : item
                        )
                    }))
                };
            });
        },
        onSuccess: () => {
            toast({ title: "Icon and color updated" });
            utils.project.get.invalidate({ id: projectId });
            utils.project.list.invalidate();
            utils.project.listInfinite.invalidate();
            if (project?.workspaceId) {
                utils.workspace.get.invalidate({ id: project.workspaceId });
            }
        },
        onError: () => toast({ title: "Failed to update", variant: "destructive" })
    });

    const toggleVisibility = trpc.project.toggleSidebarVisibility.useMutation({
        onSuccess: (data) => {
            const status = data.isHidden ? "hidden from" : "visible in";
            toast({ title: `Project ${status} sidebar` });
            utils.project.list.invalidate();
            utils.project.listInfinite.invalidate();
            if (project?.workspaceId) {
                utils.workspace.get.invalidate({ id: project.workspaceId });
            }
        },
        onError: () => toast({ title: "Failed to update visibility", variant: "destructive" })
    });

    const handleCopyLink = () => {
        const url = `${window.location.origin}/dashboard/p/${projectId}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Link copied to clipboard" });
    };

    const handleRename = () => {
        setRenameDialogOpen(true);
    };

    const handleSaveRename = (newName: string) => {
        renameProject.mutate({ id: projectId, name: newName });
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
                                    icon={project?.icon || "Briefcase"}
                                    color={project?.color || "#4F46E5"}
                                    projectId={projectId}
                                    entityName={project?.name || "Project"}
                                    onIconChange={(newIcon) => updateIconColor.mutate({ id: projectId, icon: newIcon, color: project?.color || "#4F46E5" })}
                                    onColorChange={(newColor) => updateIconColor.mutate({ id: projectId, icon: project?.icon || "Briefcase", color: newColor })}
                                />
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => toggleVisibility.mutate({ projectId })}>
                        <EyeOff className="mr-2 h-4 w-4" /> Hide Project
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
                currentName={project?.name || ""}
                entityType="project"
                onSave={handleSaveRename}
                isSaving={renameProject.isPending}
            />

            <DuplicateProjectModal
                open={duplicateModalOpen}
                onOpenChange={setDuplicateModalOpen}
                projectId={projectId}
                projectName={project?.name || ""}
                projectIcon={project?.icon || "💼"}
                projectColor={project?.color || "#4F46E5"}
            />

            <ProjectGeneralSettingsModal
                projectId={projectId}
                open={generalSettingsOpen}
                onOpenChange={setGeneralSettingsOpen}
            />

            {project && (
                <ShareModal
                    isOpen={shareModalOpen}
                    onClose={() => setShareModalOpen(false)}
                    itemType="project"
                    itemId={projectId}
                    itemName={project.name}
                    workspaceId={project.workspaceId}
                />
            )}

            <ProjectPermissionsModal
                workspaceId={workspaceId}
                projectId={projectId}
                open={permissionsModalOpen}
                onOpenChange={setPermissionsModalOpen}
            />

            <ProjectTransferModal
                projectId={projectId}
                projectName={project?.name || ""}
                open={transferModalOpen}
                onOpenChange={setTransferModalOpen}
            />

            <ProjectArchiveModal
                projectId={projectId}
                projectName={project?.name || ""}
                open={archiveModalOpen}
                onOpenChange={setArchiveModalOpen}
            />

            <ProjectDeleteModal
                projectId={projectId}
                projectName={project?.name || ""}
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
            />
        </>
    );
}
