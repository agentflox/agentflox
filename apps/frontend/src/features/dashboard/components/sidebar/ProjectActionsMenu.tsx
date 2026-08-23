"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    SquareArrowOutUpRight,
    Briefcase,
    Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import { EntityRenameDialog } from "@/entities/shared/components/EntityRenameDialog";
import { DuplicateProjectModal } from "@/entities/projects/components/DuplicateProjectModal";
import { ProjectGeneralSettingsModal } from "@/entities/projects/components/ProjectGeneralSettingsModal";
import { ProjectPermissionsModal } from "@/entities/projects/components/ProjectPermissionsModal";
import { ProjectArchiveModal } from "@/entities/projects/components/ProjectArchiveModal";
import { ProjectDeleteModal } from "@/entities/projects/components/ProjectDeleteModal";
import { ProjectTransferModal } from "@/entities/projects/components/ProjectTransferModal";
import { ProjectMoveToPopover } from "@/entities/projects/components/ProjectMoveToPopover";
import { TemplateMenuPopover } from "@/entities/templates/components/TemplateMenuPopover";
import { CustomFieldsManagerModal } from "@/entities/customfields/components/CustomFieldsManagerModal";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProjectActionsMenuProps {
    workspaceId: string;
    projectId: string;
    trigger?: React.ReactNode;
    className?: string;
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
    sideOffset?: number;
}

export function ProjectActionsMenu({
    workspaceId,
    projectId,
    trigger,
    className,
    side = "right",
    align = "start",
    sideOffset = 6,
}: ProjectActionsMenuProps) {
    const router = useRouter();
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

    const { data: project } = trpc.project.get.useQuery({ id: projectId }, { enabled: !!projectId });

    const renameProject = trpc.project.update.useMutation({
        onMutate: async (variables) => {
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
            if (project?.workspaceId) {
                utils.workspace.get.invalidate({ id: project.workspaceId });
            }
        },
        onError: () => toast({ title: "Failed to rename project", variant: "destructive" })
    });

    const updateIconColor = trpc.project.update.useMutation({
        onMutate: async (variables) => {
            queryClient.setQueriesData({ queryKey: [['project', 'listInfinite']] }, (oldData: any) => {
                if (!oldData || !oldData.pages) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: any) => ({
                        ...page,
                        items: page.items.map((item: any) =>
                            item.id === projectId
                                ? { ...item, icon: (variables as any).icon, color: (variables as any).color }
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
            if (project?.workspaceId) {
                utils.workspace.get.invalidate({ id: project.workspaceId });
            }
        },
        onError: () => toast({ title: "Failed to update", variant: "destructive" })
    });

    const toggleVisibility = (trpc.project as any).toggleSidebarVisibility.useMutation({
        onSuccess: (data: { isHidden?: boolean }) => {
            const status = data.isHidden ? "hidden from" : "visible in";
            toast({ title: `Project ${status} sidebar` });
            utils.project.list.invalidate();
            if (project?.workspaceId) {
                utils.workspace.get.invalidate({ id: project.workspaceId });
            }
        },
        onError: () => toast({ title: "Failed to update visibility", variant: "destructive" })
    });

    const projectMeta = project as { icon?: string; color?: string; workspaceId?: string | null; name?: string } | undefined;

    const handleCopyLink = () => {
        const url = `${window.location.origin}/dashboard/p/${projectId}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Link copied to clipboard" });
        setPopoverOpen(false);
    };

    const handleRename = () => {
        setRenameDialogOpen(true);
        setPopoverOpen(false);
    };

    const handleSaveRename = (newName: string) => {
        renameProject.mutate({ id: projectId, name: newName });
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
                            <p>Project settings</p>
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
                        onClick={() => {
                            setPopoverOpen(false);
                            router.push(`/dashboard/projects/${projectId}`);
                        }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                        title="View in project page"
                    >
                        <SquareArrowOutUpRight className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>View in project page</span>
                    </button>

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
                        entityType={"PROJECT" as any}
                        workspaceId={workspaceId}
                        contentToSave={{
                            id: projectId,
                            workspaceId: project?.workspaceId ?? workspaceId,
                            spaceId: project?.spaceId ?? undefined,
                            projectId,
                            name: project?.name ?? "Project",
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
                                <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent side="right" align="start" className="p-0 border-0 bg-transparent shadow-none w-auto" sideOffset={12}>
                            <EnhancedIconPicker
                                icon={projectMeta?.icon || "Briefcase"}
                                color={projectMeta?.color || "#4F46E5"}
                                entityName={project?.name || "Project"}
                                onIconChange={(newIcon) => updateIconColor.mutate({ id: projectId, icon: newIcon, color: projectMeta?.color || "#4F46E5" } as any)}
                                onColorChange={(newColor) => updateIconColor.mutate({ id: projectId, icon: projectMeta?.icon || "Briefcase", color: newColor } as any)}
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
                        onClick={() => { setPopoverOpen(false); toggleVisibility.mutate({ projectId }); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
                    >
                        <EyeOff className="h-4 w-4 shrink-0 text-zinc-500" />
                        <span>Hide Project</span>
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

                    <ProjectMoveToPopover
                        projectId={projectId}
                        projectName={project?.name || ""}
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
                projectIcon={projectMeta?.icon || "💼"}
                projectColor={projectMeta?.color || "#4F46E5"}
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
                    workspaceId={project.workspaceId ?? workspaceId ?? ""}
                />
            )}

            <ProjectPermissionsModal
                workspaceId={workspaceId}
                projectId={projectId}
                open={permissionsModalOpen}
                onOpenChange={setPermissionsModalOpen}
            />

            <CustomFieldsManagerModal
                open={customFieldsModalOpen}
                onOpenChange={setCustomFieldsModalOpen}
                workspaceId={workspaceId}
                initialLocation={`project:${projectId}`}
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
