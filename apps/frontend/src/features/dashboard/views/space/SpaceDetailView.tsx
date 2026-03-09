"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    CheckSquare, Hash, FileCheck, Wrench, Package, LayoutDashboard,
    Activity, MessageSquare, MessageCircle,
    Pin, Lock, Plus, FolderKanban, Users, FileText
} from "lucide-react";
import { VerticalToolRail } from "@/features/dashboard/components/VerticalToolRail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    ContextMenu,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { AddViewModal, ViewType } from "@/features/dashboard/components/modals/AddViewModal";
import { SpaceItemSidebar } from "@/features/dashboard/layouts/space/SpaceItemSidebar";
import { SpaceSettingsSidebar } from "@/features/dashboard/layouts/space/SpaceSettingsSidebar";
import { cn } from "@/lib/utils";
import { SpaceProjectsTab } from "@/features/dashboard/components/space/SpaceProjectsTab";
import { SpaceTeamsTab } from "@/features/dashboard/components/space/SpaceTeamsTab";
import { SpaceToolsTab } from "@/features/dashboard/components/space/SpaceToolsTab";
import { SpaceMaterialsTab } from "@/features/dashboard/components/space/SpaceMaterialsTab";
import { SpaceDocumentsTab } from "@/features/dashboard/components/space/SpaceDocumentsTab";
import { SpaceTasksTab } from "@/features/dashboard/components/space/SpaceTasksTab";
import { SpaceOverviewTab } from "./SpaceOverviewTab";
import { SpaceViewContextMenu } from "@/features/dashboard/components/space/SpaceViewContextMenu";
import { ShareModal } from "@/components/permissions/ShareModal";
import { toast } from "sonner";

interface SpaceDetailViewProps {
    spaceId: string;
    workspaceId: string;
}

const viewConfig: Record<
    ViewType,
    {
        label: string;
        icon: React.ComponentType<{ className?: string; size?: number }>;
        description: string;
    }
> = {
    OVERVIEW: { label: "Overview", icon: LayoutDashboard, description: "Overview of the space" },
    PROJECTS: { label: "Projects", icon: FolderKanban, description: "View and manage projects" },
    TEAMS: { label: "Teams", icon: Users, description: "View and manage teams" },
    DOCS: { label: "Docs", icon: FileText, description: "View and manage documents" },
    TASKS: { label: "Tasks", icon: CheckSquare, description: "View and manage tasks" },
    CHANNELS: { label: "Channels", icon: Hash, description: "View and manage channels" },
    PROPOSALS: { label: "Proposals", icon: FileCheck, description: "View and manage proposals" },
    TOOLS: { label: "Tools", icon: Wrench, description: "View and manage tools" },
    MATERIALS: { label: "Materials", icon: Package, description: "View and manage materials" },
    DASHBOARD: { label: "Dashboard", icon: LayoutDashboard, description: "Space dashboard" },
    ACTIVITY: { label: "Activity", icon: Activity, description: "Activity log" },
    POSTS: { label: "Posts", icon: MessageSquare, description: "Space posts" },
    DISCUSSIONS: { label: "Discussions", icon: MessageCircle, description: "Discussions" },
};

export default function SpaceDetailView({ spaceId, workspaceId }: SpaceDetailViewProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const utils = trpc.useUtils();

    const { data: space, isLoading } = trpc.space.get.useQuery({ id: spaceId });
    const { data: workspace } = trpc.workspace.get.useQuery({ id: workspaceId });

    // Mutations
    const createViewMutation = trpc.view.create.useMutation({
        onSuccess: () => {
            utils.space.get.invalidate({ id: spaceId });
            toast.success("View added");
        },
        onError: (err) => toast.error(`Failed to add view: ${err.message}`)
    });

    const deleteViewMutation = trpc.view.delete.useMutation({
        onSuccess: () => {
            utils.space.get.invalidate({ id: spaceId });
            toast.success("View deleted");
        },
        onError: (err) => toast.error(`Failed to delete view: ${err.message}`)
    });

    const updateViewMutation = trpc.view.update.useMutation({
        onSuccess: () => {
            utils.space.get.invalidate({ id: spaceId });
        },
        onError: (err) => toast.error(`Failed to update view: ${err.message}`)
    });

    // Type assertion for space data that includes tools and materials
    const spaceWithTools = space as any;

    // Get projects and teams for this space from workspace
    const spaceProjects = useMemo(() => {
        return (workspace?.projects ?? []).filter((p: any) => p.spaceId === spaceId);
    }, [workspace?.projects, spaceId]);

    const spaceTeams = useMemo(() => {
        return (workspace?.teams ?? []).filter((t: any) => t.spaceId === spaceId);
    }, [workspace?.teams, spaceId]);

    // Derived views from DB
    const views = useMemo(() => {
        if (!space?.views) return [];
        return [...space.views].sort((a, b) => {
            // 1. Overview always first
            if (a.type === "OVERVIEW") return -1;
            if (b.type === "OVERVIEW") return 1;

            // 2. Sort by pinned status (pinned views at the top after overview)
            if (a.isPinned !== b.isPinned) {
                return a.isPinned ? -1 : 1;
            }
            // 3. Then sort by position
            return a.position - b.position;
        });
    }, [space?.views]);

    // Active Tab Logic
    // We use view ID for the tab value
    // When inside a workspace context (workspaceId + spaceId), we use 'sview' param.
    // When standalone, we might use 'tab' but let's standardize on 'sview' for consistency if this component is used in workspace context.
    const urlTabId = searchParams.get("sview");

    // Find view by ID matching URL, or find view by specific "name/type" if user used a friendly URL in past,
    // but better to stick to ID. 
    // Fallback: If URL param not found in views, default to first view.
    const activeView = views.find(v => v.id === urlTabId) || views[0];
    const activeTab = activeView?.id;

    const [addViewModalOpen, setAddViewModalOpen] = useState(false);
    const [itemSidebarOpen, setItemSidebarOpen] = useState(false);
    const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(false);

    // Dialog Binding States
    const [viewToRename, setViewToRename] = useState<{ id: string, name: string } | null>(null);
    const [viewToDelete, setViewToDelete] = useState<{ id: string, name: string } | null>(null);
    const [viewToShare, setViewToShare] = useState<{ id: string, name: string } | null>(null);

    const handleRenameView = (name: string) => {
        if (viewToRename) {
            updateViewMutation.mutate({
                id: viewToRename.id,
                name: name
            });
            setViewToRename(null);
        }
    };

    const handleCopyViewLink = (view: any) => {
        const url = `${window.location.origin}${window.location.pathname}?v=spaces&sid=${spaceId}&sview=${view.id}`;
        navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
    };

    // Toggle Helpers
    const togglePin = (view: any) => updateViewMutation.mutate({ id: view.id, isPinned: !view.isPinned });
    const togglePrivate = (view: any) => updateViewMutation.mutate({ id: view.id, isPrivate: !view.isPrivate });
    const toggleLock = (view: any) => updateViewMutation.mutate({ id: view.id, isLocked: !view.isLocked });
    const toggleDefault = (view: any) => updateViewMutation.mutate({ id: view.id, isDefault: !view.isDefault });

    // Determine if we can add items based on active view type
    const canAddForTab = (type: ViewType) => ["PROJECTS", "TEAMS", "TOOLS", "MATERIALS"].includes(type);
    const openItemSidebar = () => {
        if (activeView && canAddForTab(activeView.type as ViewType)) {
            setItemSidebarOpen(true);
        }
    };
    const openSettingsSidebar = () => setSettingsSidebarOpen(true);

    const handleTabChange = useCallback((viewId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("sview", viewId);
        router.push(`?${params.toString()}`, { scroll: false });
    }, [searchParams, router]);

    const handleAddViews = (selectedTypes: ViewType[]) => {
        // Create views sequentially or in parallel
        // For simplicity, we fire them off. 
        // Note: Realworld app might want batch create or sequential to preserve order.
        selectedTypes.forEach(type => {
            const config = viewConfig[type];
            createViewMutation.mutate({
                name: config.label,
                type: type,
                spaceId: spaceId
            });
        });
    };

    const handleDeleteView = (viewId: string) => {
        deleteViewMutation.mutate({ id: viewId });
        // If deleting active view, let the fallback logic in render pick the next one (useEffect?)
        // The component re-renders when data changes, so activeTab calculation will update.
    };

    useEffect(() => {
        if (!urlTabId && views.length > 0) {
            handleTabChange(views[0].id);
        }
    }, [urlTabId, views, handleTabChange]);


    const renderViewContent = (view: any) => {
        if (!view) return null;
        const viewType = view.type as ViewType;

        switch (viewType) {
            case "OVERVIEW":
                return <SpaceOverviewTab spaceId={spaceId} workspaceId={workspaceId} />;

            case "PROJECTS":
                return (
                    <SpaceProjectsTab
                        workspaceId={workspaceId}
                        spaceId={spaceId}
                        projects={spaceProjects}
                        onAddClick={openItemSidebar}
                    />
                );

            case "TEAMS":
                return (
                    <SpaceTeamsTab
                        workspaceId={workspaceId}
                        spaceId={spaceId}
                        teams={spaceTeams}
                        onAddClick={openItemSidebar}
                    />
                );

            case "DOCS":
                return <SpaceDocumentsTab />;

            case "TASKS":
                return (
                    <SpaceTasksTab
                        spaceId={spaceId}
                        workspaceId={workspaceId}
                    />
                );

            case "TOOLS":
                return (
                    <SpaceToolsTab
                        workspaceId={workspaceId}
                        spaceId={spaceId}
                        tools={spaceWithTools?.tools}
                        onAddClick={openItemSidebar}
                    />
                );

            case "MATERIALS":
                return (
                    <SpaceMaterialsTab
                        workspaceId={workspaceId}
                        spaceId={spaceId}
                        materials={spaceWithTools?.materials}
                        onAddClick={openItemSidebar}
                    />
                );

            default:
                return (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-12 px-4 text-center">
                        <p className="text-sm font-medium text-foreground">
                            {view.name || viewConfig[viewType]?.label || viewType}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {viewConfig[viewType]?.description || "This view is coming soon"}
                        </p>
                    </div>
                );
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
                    <p className="text-sm text-muted-foreground">Loading space...</p>
                </div>
            </div>
        );
    }

    if (!space) {
        return (
            <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">Space not found</p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b border-slate-200 bg-white px-6 py-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{space.name}</h1>
                        {space.description && (
                            <p className="mt-1.5 text-sm text-slate-500">{space.description}</p>
                        )}
                    </div>
                    <Badge
                        variant={space.isActive ? "default" : "secondary"}
                        className={space.isActive ? "bg-emerald-100 text-emerald-700" : ""}
                    >
                        {space.isActive ? "Active" : "Archived"}
                    </Badge>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex-1 overflow-hidden bg-slate-50">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="flex h-full flex-col">
                    <div className="border-b border-slate-200 bg-white px-6">
                        <div className="flex items-center justify-between">
                            <TabsList className="h-auto bg-transparent p-0">
                                {views.map((view) => {
                                    const viewType = view.type as ViewType;
                                    const config = viewConfig[viewType] || { label: view.name, icon: FileText };
                                    const Icon = config.icon;

                                    return (
                                        <ContextMenu key={view.id}>
                                            <ContextMenuTrigger>
                                                <TabsTrigger
                                                    value={view.id}
                                                    asChild
                                                >
                                                    <div className="group relative flex items-center gap-2 data-[state=active]:bg-slate-100">
                                                        <Icon className="h-4 w-4" />
                                                        <span>{view.name}</span>
                                                        {view.isPinned && <Pin className="h-3 w-3 -mr-1 rotate-45 text-muted-foreground" />}
                                                        {view.isPrivate && <Lock className="h-3 w-3 -mr-1 text-muted-foreground" />}
                                                    </div>
                                                </TabsTrigger>
                                            </ContextMenuTrigger>
                                            <SpaceViewContextMenu
                                                view={view}
                                                onRename={(v) => setViewToRename({ id: v.id, name: v.name })}
                                                onDelete={(v) => setViewToDelete({ id: v.id, name: v.name })}
                                                onDuplicate={(v) => {
                                                    createViewMutation.mutate({
                                                        name: `${v.name} Copy`,
                                                        type: v.type,
                                                        spaceId: v.spaceId,
                                                    });
                                                }}
                                                onTogglePin={togglePin}
                                                onTogglePrivate={togglePrivate}
                                                onToggleLock={toggleLock}
                                                onToggleDefault={toggleDefault}
                                                onCopyLink={handleCopyViewLink}
                                                onShare={(v) => setViewToShare({ id: v.id, name: v.name })}
                                            />
                                        </ContextMenu>
                                    );
                                })}
                            </TabsList>
                            <div className="flex items-center">
                                <Button
                                    variant="outline"
                                    onClick={() => setAddViewModalOpen(true)}
                                    className="h-9 px-3 text-sm"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add View
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className={cn("relative flex-1 overflow-y-auto px-6 py-6", {
                        'lg:pr-[22rem]': itemSidebarOpen || settingsSidebarOpen,
                        'lg:pr-16': !itemSidebarOpen && !settingsSidebarOpen
                    })}>
                        {activeView && (
                            <TabsContent value={activeView.id} className="mt-0">
                                {renderViewContent(activeView)}
                            </TabsContent>
                        )}

                        {/* Vertical tool rail */}
                        <VerticalToolRail
                            onAddClick={openItemSidebar}
                            onSettingsClick={openSettingsSidebar}
                            className={cn({
                                'right-0': itemSidebarOpen || settingsSidebarOpen,
                                'right-0': !itemSidebarOpen && !settingsSidebarOpen
                            })}
                        />
                        <SpaceItemSidebar spaceId={spaceId} workspaceId={workspaceId} type={activeView?.type as any} open={itemSidebarOpen} onClose={() => setItemSidebarOpen(false)} inline />
                        <SpaceSettingsSidebar spaceId={spaceId} workspaceId={workspaceId} open={settingsSidebarOpen} onClose={() => setSettingsSidebarOpen(false)} inline />
                    </div>
                </Tabs>
            </div>

            <AddViewModal
                open={addViewModalOpen}
                onOpenChange={setAddViewModalOpen}
                existingViews={views.map(v => v.type as ViewType)}
                onAddViews={handleAddViews}
            />

            {/* Rename Dialog */}
            <Dialog open={!!viewToRename} onOpenChange={(open) => !open && setViewToRename(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename View</DialogTitle>
                        <DialogDescription>
                            Enter a new name for this view.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={viewToRename?.name || ""}
                            onChange={(e) => setViewToRename(prev => prev ? { ...prev, name: e.target.value } : null)}
                            onKeyDown={(e) => e.key === "Enter" && handleRenameView(viewToRename?.name || "")}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewToRename(null)}>Cancel</Button>
                        <Button onClick={() => handleRenameView(viewToRename?.name || "")}>Rename</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={!!viewToDelete} onOpenChange={(open) => !open && setViewToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete View?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{viewToDelete?.name}</strong>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewToDelete(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteView}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Share View Modal */}
            {viewToShare && (
                <ShareModal
                    isOpen={!!viewToShare}
                    onClose={() => setViewToShare(null)}
                    itemType="view"
                    itemId={viewToShare.id}
                    itemName={viewToShare.name}
                    workspaceId={workspaceId}
                />
            )}
        </div>
    );
}
