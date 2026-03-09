"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import SpaceNavigationSidebar, { type SpaceView } from "@/features/dashboard/layouts/space/SpaceNavigationSidebar";
import { SpaceOverviewTab } from "@/features/dashboard/views/space/SpaceOverviewTab";
import { SpaceProjectsTab } from "@/features/dashboard/components/space/SpaceProjectsTab";
import { SpaceTeamsTab } from "@/features/dashboard/components/space/SpaceTeamsTab";
import { SpaceToolsTab } from "@/features/dashboard/components/space/SpaceToolsTab";
import { SpaceMaterialsTab } from "@/features/dashboard/components/space/SpaceMaterialsTab";
import { SpaceDocumentsTab } from "@/features/dashboard/components/space/SpaceDocumentsTab";
import { SpaceTasksTab } from "@/features/dashboard/components/space/SpaceTasksTab";
import WorkspaceChatView from "@/features/dashboard/views/workspace/WorkspaceChatView";
import WorkspaceAIChatView from "@/features/dashboard/views/workspace/WorkspaceAIChatView";
import SpaceProjectView from "@/features/dashboard/views/space/SpaceProjectView";
import SpaceTeamView from "@/features/dashboard/views/space/SpaceTeamView";
import SpacePersonalView from "@/features/dashboard/views/space/SpacePersonalView";
import SpaceListView from "@/features/dashboard/views/space/SpaceListView";
import { ShareModal } from "@/components/permissions/ShareModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AddViewModal, ViewType } from "@/features/dashboard/components/modals/AddViewModal";
import { SpaceViewContextMenu } from "@/features/dashboard/components/space/SpaceViewContextMenu";
import ListView from "@/features/dashboard/views/generic/ListView";
import { BoardView } from "@/features/dashboard/views/generic/BoardView";
import { TableView } from "@/features/dashboard/views/generic/TableView";
import { CalendarView } from "@/features/dashboard/views/generic/CalendarView";
import { GanttView } from "@/features/dashboard/views/generic/GanttView";
import { TimelineView } from "@/features/dashboard/views/generic/TimelineView";
import FormView from "@/features/dashboard/views/generic/FormView";
import { MindMapView } from "@/features/dashboard/views/generic/MindMapView";
import { WorkloadView } from "@/features/dashboard/views/generic/WorkloadView";
import WhiteboardView from "@/features/dashboard/views/generic/WhiteboardView";
import { MapView } from "@/features/dashboard/views/generic/MapView";
import { DashboardView as GenericDashboardView } from "@/features/dashboard/views/generic/DashboardView";
import { EmbedView } from "@/features/dashboard/views/generic/EmbedView";
import {
    ContextMenu,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ShareViewPermissionModal } from "@/features/dashboard/components/shared/ShareViewPermissionModal";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { SaveTemplateModal } from "@/features/dashboard/components/modals/SaveTemplateModal";
import { Input } from "@/components/ui/input";
import { DashboardHeader } from "@/features/dashboard/components/shared/DashboardHeader";
import { QuickAgentModal } from "@/features/dashboard/components/modals/QuickAgentModal";
import { ResizableSplitLayout, SidePanelContainer } from "@/components/layout/ResizableSplitLayout";
import { TaskDetailContent, TaskDetailModal, TaskLayoutMode } from "@/entities/task/components/TaskDetailModal";
import { ChatView } from "@/features/dashboard/views/project/ChatView";
import { SpaceActionsMenu } from "@/features/dashboard/components/sidebar/SpaceActionsMenu";

import {
    LayoutDashboard,
    FolderKanban,
    Users,
    MessageSquare,
    Bot,
    User,
    Sidebar,
    LayoutPanelTop,
    CheckSquare,
    Hash,
    FileCheck,
    Wrench,
    Package,
    Activity,
    MessageCircle,
    FileText,
    Pin,
    Lock,
    Plus,
    List,
    Kanban,
    Calendar,
    Network,
    Link as LinkIcon,
    Sheet,
    Video,
    Image,
    PenTool,
    Map,
    Clock,
    ClipboardList,
    BarChart3,
    Layers,
    Settings,
    ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LayoutMode = "sidebar" | "top";

interface SpaceDashboardViewProps {
    spaceId: string;
}

const viewConfig: Record<
    ViewType,
    {
        label: string;
        icon: React.ComponentType<{ className?: string; size?: number }>;
        description: string;
    }
> = {
    // Existing
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

    // Generic
    LIST: { label: "List", icon: List, description: "List view" },
    BOARD: { label: "Board", icon: Kanban, description: "Kanban board" },
    CALENDAR: { label: "Calendar", icon: Calendar, description: "Calendar view" },
    GANTT: { label: "Gantt", icon: Network, description: "Gantt chart" },
    DOC: { label: "Doc", icon: FileText, description: "Document" },
    FORM: { label: "Form", icon: LayoutDashboard, description: "Form" },
    TABLE: { label: "Table", icon: ClipboardList, description: "Table view" },
    TIMELINE: { label: "Timeline", icon: Clock, description: "Timeline view" },
    WORKLOAD: { label: "Workload", icon: BarChart3, description: "Workload view" },
    WHITEBOARD: { label: "Whiteboard", icon: PenTool, description: "Whiteboard" },
    MIND_MAP: { label: "Mind Map", icon: Network, description: "Mind map" },
    MAP: { label: "Map", icon: Map, description: "Map view" },

    // Embeds
    EMBED: { label: "Embed", icon: LinkIcon, description: "Embed view" },
    SPREADSHEET: { label: "Sheet", icon: Sheet, description: "Spreadsheet" },
    FILE: { label: "File", icon: FileText, description: "File" },
    VIDEO: { label: "Video", icon: Video, description: "Video" },
    DESIGN: { label: "Design", icon: Image, description: "Design" },

    // Fallbacks
    VIEWS: { label: "Views", icon: LayoutDashboard, description: "Views" },
    LOGS: { label: "Logs", icon: FileText, description: "Logs" },
    APPEAL: { label: "Appeal", icon: FileText, description: "Appeal" },
    GOVERNANCE: { label: "Governance", icon: FileText, description: "Governance" },
    ANALYTICS: { label: "Analytics", icon: BarChart3, description: "Analytics" },
    WAR_ROOM: { label: "War Room", icon: LayoutDashboard, description: "War Room" },
    MARKETPLACE: { label: "Marketplace", icon: LayoutDashboard, description: "Marketplace" },
    MEMBERS: { label: "Members", icon: Users, description: "Members" },
};

export default function SpaceDashboardView({ spaceId }: SpaceDashboardViewProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const utils = trpc.useUtils();

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [layoutMode, setLayoutMode] = useState<LayoutMode>("sidebar");

    // Item selection states
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    // URL-based selection states
    const selectedProjectId = searchParams.get("pj");
    const selectedTeamId = searchParams.get("tm");
    const selectedChannelId = searchParams.get("ch");
    const selectedAiChatId = searchParams.get("ai");
    const selectedTaskId = searchParams.get("task");
    const selectedListId = searchParams.get("list");

    // Dialog states
    const [addViewModalOpen, setAddViewModalOpen] = useState(false);
    const [viewToRename, setViewToRename] = useState<{ id: string, name: string } | null>(null);
    const [viewToDelete, setViewToDelete] = useState<{ id: string, name: string } | null>(null);
    const [viewToShare, setViewToShare] = useState<{ id: string, name: string } | null>(null);
    const [viewToTemplate, setViewToTemplate] = useState<any | null>(null);
    const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
    const [isAskAIOpen, setIsAskAIOpen] = useState(false);
    const [taskViewMode, setTaskViewMode] = useState<TaskLayoutMode>("modal");

    // Fetch Data
    const { data: space, isLoading: isSpaceLoading } = trpc.space.get.useQuery({ id: spaceId });
    const workspaceId = space?.workspaceId;

    const { data: workspace, isLoading: isWorkspaceLoading } = trpc.workspace.get.useQuery(
        { id: workspaceId! },
        { enabled: !!workspaceId }
    );

    const { data: selectedList } = trpc.list.get.useQuery(
        { id: selectedListId || "" },
        { enabled: !!selectedListId }
    );

    const isLoading = isSpaceLoading || (!!workspaceId && isWorkspaceLoading);

    // Type assertion for space data that includes tools and materials
    const spaceWithTools = space as any;

    // Mutations
    const createViewMutation = trpc.view.create.useMutation({
        onSuccess: async () => {
            // Refetch to ensure views are updated
            await utils.space.get.refetch({ id: spaceId });
        },
        onError: (err) => toast.error(`Failed to add view: ${err.message}`)
    });

    const deleteViewMutation = trpc.view.delete.useMutation({
        onSuccess: async () => {
            await utils.space.get.refetch({ id: spaceId });
            toast.success("View deleted");
        },
        onError: (err) => toast.error(`Failed to delete view: ${err.message}`)
    });

    const updateViewMutation = trpc.view.update.useMutation({
        onSuccess: async () => {
            await utils.space.get.refetch({ id: spaceId });
        },
        onError: (err) => toast.error(`Failed to update view: ${err.message}`)
    });

    const createFromTemplateMutation = trpc.view.createFromTemplate.useMutation({
        onSuccess: async (data) => {
            // Refetch to ensure views are updated
            await utils.space.get.refetch({ id: spaceId });
            toast.success("View created from template");

            // Automatically switch to the new view
            const params = new URLSearchParams(searchParams.toString());
            params.set("tab", "views");
            params.set("v", data.id);
            router.push(`?${params.toString()}`, { scroll: false });
        },
        onError: (err) => toast.error(`Failed to create view: ${err.message}`)
    });

    // Derived Data
    const spaceProjects = useMemo(() => {
        return (workspace?.projects ?? []).filter((p: any) => p.spaceId === spaceId);
    }, [workspace?.projects, spaceId]);

    const spaceTeams = useMemo(() => {
        return (workspace?.teams ?? []).filter((t: any) => t.spaceId === spaceId);
    }, [workspace?.teams, spaceId]);

    // Derived views from DB
    const views = useMemo(() => {
        if (!space?.views) return [];
        return [...space.views].sort((a: any, b: any) => {
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

    // Check tabs
    const currentTab = searchParams.get("tab");
    const isViewsTab = (currentTab === "views" || !currentTab) && !selectedListId;
    const isListsTab = currentTab === "lists" || !!selectedListId;

    // Active Tab Logic - use view ID for the tab value
    const urlTabId = searchParams.get("v");
    const activeView = views.find(v => v.id === urlTabId) || views[0];
    const activeTab = activeView?.id;

    const handleTabChange = useCallback((viewId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        // Only keep existing non-conflicting params, but for simplicity we rely on current params
        // Ensure we are in views mode visually too if not set
        if (!params.get("tab")) {
            params.set("tab", "views");
        }
        params.set("v", viewId);
        router.push(`?${params.toString()}`, { scroll: false });
    }, [searchParams, router]);

    const handleChatSelect = (chatId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (chatId) params.set("ch", chatId);
        else params.delete("ch");
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleAIChatSelect = (chatId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (chatId) params.set("ai", chatId);
        else params.delete("ai");
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleProjectSelect = (projectId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (projectId) params.set("pj", projectId);
        else params.delete("pj");
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleTeamSelect = (teamId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (teamId) params.set("tm", teamId);
        else params.delete("tm");
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleListSelect = (listId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (listId) params.set("list", listId);
        else params.delete("list");
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleTaskSelect = (taskId: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (taskId) params.set("task", taskId);
        else params.delete("task");
        router.push(`?${params.toString()}`, { scroll: false });
    };

    // Helper functions for view management
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
        const url = `${window.location.origin}${window.location.pathname}?v=${view.id}`;
        navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
    };

    const handleAddViews = async (selectedTypes: ViewType[]) => {
        if (selectedTypes.length === 0) return;

        // Create views sequentially to avoid race conditions
        let lastCreatedViewId: string | null = null;

        for (const type of selectedTypes) {
            const config = viewConfig[type];
            if (!config) continue;

            try {
                const result = await createViewMutation.mutateAsync({
                    name: config.label,
                    type: type as any,
                    spaceId: spaceId
                });
                lastCreatedViewId = result.id;
                toast.success(`View "${config.label}" added`);
            } catch (err) {
                console.error(`Failed to create view ${type}:`, err);
            }
        }

        // Navigate to the last created view after all are created
        if (lastCreatedViewId) {
            // Ensure views are refetched (mutations already refetch, but double-check)
            await utils.space.get.refetch({ id: spaceId });
            const params = new URLSearchParams(searchParams.toString());
            params.set("tab", "views");
            params.set("v", lastCreatedViewId);
            router.push(`?${params.toString()}`, { scroll: false });
        }
    };

    const handleAddFromTemplate = (templateId: string) => {
        createFromTemplateMutation.mutate({
            templateId,
            spaceId
        });
    };

    const handleDeleteView = (viewId: string) => {
        deleteViewMutation.mutate({ id: viewId });
        setViewToDelete(null);
    };

    // Toggle Helpers
    const togglePin = (view: any) => updateViewMutation.mutate({ id: view.id, isPinned: !view.isPinned });
    const togglePrivate = (view: any) => updateViewMutation.mutate({ id: view.id, isPrivate: !view.isPrivate });
    const toggleLock = (view: any) => updateViewMutation.mutate({ id: view.id, isLocked: !view.isLocked });
    const toggleDefault = (view: any) => updateViewMutation.mutate({ id: view.id, isDefault: !view.isDefault });

    // Determine if we can add items based on active view type


    useEffect(() => {
        if (isViewsTab && !urlTabId && views.length > 0) {
            // Use replace instead of push to avoid history clutter on default load
            const params = new URLSearchParams(searchParams.toString());
            if (!params.get("tab")) params.set("tab", "views");
            params.set("v", views[0].id);
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    }, [urlTabId, views, isViewsTab, searchParams, router]);

    // Auto-select Project if none selected but available
    useEffect(() => {
        if (currentTab === "projects" && !selectedProjectId && spaceProjects.length > 0) {
            const params = new URLSearchParams(searchParams.toString());
            params.set("pj", spaceProjects[0].id);
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    }, [currentTab, selectedProjectId, spaceProjects, searchParams, router]);

    // Auto-select Team if none selected but available
    useEffect(() => {
        if (currentTab === "teams" && !selectedTeamId && spaceTeams.length > 0) {
            const params = new URLSearchParams(searchParams.toString());
            params.set("tm", spaceTeams[0].id);
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    }, [currentTab, selectedTeamId, spaceTeams, searchParams, router]);

    // For Chats and AI Chats, we can do similar if we had access to the list here easily.
    // WorkspaceChatView handles internal selection, but we want URL reflection.
    // If WorkspaceChatView selects a default, it calls onChatSelect, which updates URL.
    // So we don't strictly need a useEffect here for chats if the child component is well behaved.

    // Check if we're in "views" tab mode (from sidebar)
    // moved up

    const renderViewContent = (view: any) => {
        if (!view || !workspaceId) return null;
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

                    />
                );

            case "TEAMS":
                return (
                    <SpaceTeamsTab
                        workspaceId={workspaceId}
                        spaceId={spaceId}
                        teams={spaceTeams}

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

                    />
                );

            case "MATERIALS":
                return (
                    <SpaceMaterialsTab
                        workspaceId={workspaceId}
                        spaceId={spaceId}
                        materials={spaceWithTools?.materials}

                    />
                );

            // Generic Vews
            case "LIST":
                return (
                    <ListView
                        spaceId={spaceId}
                        viewId={view.id}
                        initialConfig={view.config}
                        selectedTaskIdFromParent={selectedTaskId}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "BOARD":
                return (
                    <BoardView
                        spaceId={spaceId}
                        viewId={view.id}
                        initialConfig={view.config}
                        selectedTaskIdFromParent={selectedTaskId}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "TABLE":
                return (
                    <TableView
                        spaceId={spaceId}
                        viewId={view.id}
                        initialConfig={view.config}
                        selectedTaskIdFromParent={selectedTaskId}
                        onTaskSelect={handleTaskSelect}
                        entity={space}
                        context="space"
                    />
                );
            case "CALENDAR":
                return <CalendarView spaceId={spaceId} />;
            case "GANTT":
                return <GanttView spaceId={spaceId} />;
            case "TIMELINE":
                return <TimelineView spaceId={spaceId} viewId={view.id} initialConfig={view.config} />;
            case "FORM":
                return <FormView spaceId={spaceId} viewId={view.id} initialConfig={view.config} />;
            case "MIND_MAP":
                return (
                    <MindMapView
                        spaceId={spaceId}
                        viewId={view.id}
                        initialConfig={view.config}
                        selectedTaskIdFromParent={selectedTaskId}
                        onTaskSelect={handleTaskSelect}
                        entity={space}
                        context="space"
                    />
                );
            case "MAP":
                return (
                    <MapView
                        spaceId={spaceId}
                        viewId={view.id}
                        initialConfig={view.config}
                        selectedTaskIdFromParent={selectedTaskId}
                        onTaskSelect={handleTaskSelect}
                        entity={space}
                        context="space"
                    />
                );
            case "WORKLOAD":
                return <WorkloadView spaceId={spaceId} viewId={view.id} initialConfig={view.config} />;
            case "WHITEBOARD":
                return <WhiteboardView spaceId={spaceId} viewId={view.id} initialConfig={view.config} />;
            case "DASHBOARD":
                return <GenericDashboardView spaceId={spaceId} viewId={view.id} initialConfig={view.config} />;

            // Embeds
            case "EMBED":
            case "SPREADSHEET":
            case "FILE":
            case "VIDEO":
            case "DESIGN":
            case "DOC":
                return <EmbedView
                    url={(view as any).config?.url}
                    onUrlSave={(url) => {
                        updateViewMutation.mutate({
                            id: view.id,
                            config: { ...(view as any).config, url } as any
                        });
                    }}
                />;

            default: {
                const Icon = viewConfig[viewType]?.icon || LayoutDashboard;
                return (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-12 px-4 text-center h-full">
                        <div className="h-12 w-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4 text-slate-400">
                            <Icon className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                            {view.name || viewConfig[viewType]?.label || viewType}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                            {viewConfig[viewType]?.description || "This view type is currently being implemented."}
                        </p>
                    </div>
                );
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12 h-screen">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
                    <p className="text-sm text-muted-foreground">Loading space...</p>
                </div>
            </div>
        );
    }

    if (!space) {
        return (
            <div className="flex items-center justify-center py-12 h-screen">
                <p className="text-sm text-muted-foreground">Space not found</p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            {/* Dashboard Header */}
            {/* DashboardHeader moved inside content area */}

            {/* Main Layout - Sidebar visibility controlled by layoutMode */}
            <div className="flex h-full gap-1 flex-1 overflow-hidden">
                {/* Navigation Sidebar - Show only when layoutMode is "sidebar" */}
                {layoutMode === "sidebar" && (
                    <SpaceNavigationSidebar
                        spaceId={spaceId}
                        activeView={(isListsTab ? "lists" : currentTab || "views") as SpaceView}
                        onViewChange={(view: SpaceView) => {
                            const params = new URLSearchParams(searchParams.toString());
                            params.delete("v"); // Always clear view ID when switching main contexts
                            params.delete("pj");
                            params.delete("tm");
                            params.delete("list");
                            params.delete("ch");
                            params.delete("ai");

                            // Special handling for "views" tab - show tab-based interface
                            if (view === "views") {
                                params.set("tab", "views");
                                if (views.length > 0) {
                                    params.set("v", views[0].id);
                                }
                                router.push(`?${params.toString()}`, { scroll: false });
                                return;
                            }

                            params.set("tab", view);

                            // Handle auto-selection for projects and teams (client side optimistic)
                            if (view === "projects" && spaceProjects.length > 0) {
                                params.set("pj", spaceProjects[0].id);
                            } else if (view === "teams" && spaceTeams.length > 0) {
                                params.set("tm", spaceTeams[0].id);
                            }

                            router.push(`?${params.toString()}`, { scroll: false });
                        }}
                        collapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
                    />
                )}

                {/* Main Content */}
                {/* Main Content */}
                <div className="flex-1 overflow-hidden w-full max-w-full h-full bg-slate-50 flex flex-col">
                    <DashboardHeader
                        entityName={
                            selectedListId && selectedList ? (
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="truncate text-muted-foreground hover:text-foreground transition-colors cursor-pointer" onClick={() => router.push(`?tab=overview`)}>{space.name || "Untitled Space"}</span>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div className="flex items-center gap-1.5">
                                        <List className="h-4 w-4 shrink-0" style={{ color: selectedList.color || undefined }} />
                                        <span className="truncate font-semibold text-foreground">{selectedList.name}</span>
                                    </div>
                                </div>
                            ) : (
                                space.name || "Untitled Space"
                            )
                        }
                        entityType="space"
                        entityIcon={<Layers className="h-4 w-4" />}
                        shareUrl={`${window.location.origin}${window.location.pathname}?spaceId=${spaceId}`}
                        showSettings={false}
                        onAskAIClick={() => setIsAskAIOpen(!isAskAIOpen)}
                        onShareClick={() => setIsShareModalOpen(true)}
                        agentPopoverContent={
                            <QuickAgentModal
                                contextId={spaceId}
                                contextType="SPACE"
                                onOpenChange={setIsAgentModalOpen}
                            />
                        }
                        agentOpen={isAgentModalOpen}
                        onAgentOpenChange={setIsAgentModalOpen}
                        leftActions={[
                            {
                                id: "settings",
                                label: "Settings",
                                icon: Settings,
                                onClick: () => { },
                                render: () => (
                                    <SpaceActionsMenu
                                        workspaceId={workspaceId!}
                                        spaceId={spaceId}
                                        trigger={
                                            <Button variant="ghost" size="sm" className="h-8 relative group transition-all duration-200 ease-in-out w-8 hover:w-auto px-0 hover:px-3 justify-center hover:justify-start">
                                                <div className="flex items-center justify-center w-8 h-8 shrink-0">
                                                    <Settings className="h-4 w-4" />
                                                </div>
                                                <span className="hidden group-hover:inline overflow-hidden whitespace-nowrap transition-all duration-200">Settings</span>
                                            </Button>
                                        }
                                    />
                                )
                            },
                            {
                                id: "layout-mode",
                                label: layoutMode === "sidebar" ? "Sidebar" : "Top",
                                icon: layoutMode === "sidebar" ? Sidebar : LayoutPanelTop,
                                onClick: () => { },
                                tooltip: "Switch layout mode",
                                dropdownItems: [
                                    {
                                        id: "sidebar",
                                        label: "Sidebar",
                                        icon: Sidebar,
                                        onClick: () => setLayoutMode("sidebar")
                                    },
                                    {
                                        id: "top",
                                        label: "Top",
                                        icon: LayoutPanelTop,
                                        onClick: () => setLayoutMode("top")
                                    }
                                ]
                            }
                        ]}
                    />
                    <div className="flex-1 overflow-hidden relative">
                        <ResizableSplitLayout
                            MainContent={
                                selectedTaskId && taskViewMode === 'fullscreen' ? (
                                    <div className="h-full w-full bg-white">
                                        <TaskDetailContent
                                            taskId={selectedTaskId}
                                            layoutMode="fullscreen"
                                            onLayoutModeChange={setTaskViewMode}
                                            onClose={() => {
                                                const params = new URLSearchParams(searchParams.toString());
                                                params.delete("task");
                                                router.push(`?${params.toString()}`);
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        {/* Render dedicated view components for sidebar items */}
                                        {isListsTab ? (
                                            <SpaceListView
                                                spaceId={spaceId}
                                                workspaceId={workspaceId!}
                                                selectedListId={selectedListId || undefined}
                                                onListSelect={handleListSelect}
                                            />
                                        ) : currentTab === "projects" ? (
                                            <SpaceProjectView
                                                spaceId={spaceId}
                                                workspaceId={workspaceId!}
                                                selectedProjectId={selectedProjectId || undefined}
                                                onProjectSelect={handleProjectSelect}
                                            />
                                        ) : currentTab === "teams" ? (
                                            <SpaceTeamView
                                                spaceId={spaceId}
                                                workspaceId={workspaceId!}
                                                selectedTeamId={selectedTeamId || undefined}
                                                onTeamSelect={handleTeamSelect}
                                            />
                                        ) : currentTab === "personal" ? (
                                            <SpacePersonalView
                                                spaceId={spaceId}
                                                workspaceId={workspaceId!}
                                            />
                                        ) : currentTab === "chats" ? (
                                            <WorkspaceChatView
                                                workspaceId={workspaceId!}
                                                selectedChatId={selectedChannelId || undefined}
                                                onChatSelect={handleChatSelect}
                                            />
                                        ) : currentTab === "ai-chat" ? (
                                            <WorkspaceAIChatView
                                                workspaceId={workspaceId!}
                                                selectedAIChatId={selectedAiChatId || undefined}
                                                onAIChatSelect={handleAIChatSelect}
                                            />
                                        ) : isViewsTab ? (
                                            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex h-full flex-col">
                                                <div className="border-b border-slate-200 bg-white px-6 py-1">
                                                    <div className="flex items-center justify-start gap-2">
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
                                                                                <div className="group relative flex items-center gap-2 h-10 px-4 py-2.5 text-base data-[state=active]:bg-slate-100">
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
                                                                            onSaveTemplate={(v) => setViewToTemplate(v)}
                                                                        />
                                                                    </ContextMenu>
                                                                );
                                                            })}
                                                        </TabsList>
                                                        <div className="flex items-center">
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => setAddViewModalOpen(true)}
                                                                className="h-10 px-4 text-base font-medium"
                                                            >
                                                                <Plus className="mr-2 h-4 w-4" />
                                                                View
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className={cn(
                                                    "relative flex-1 min-w-0 max-w-full",
                                                    (activeView && ["TASKS", "LIST", "BOARD", "TABLE", "CALENDAR", "GANTT", "TIMELINE", "WORKLOAD", "WHITEBOARD", "MIND_MAP", "MAP", "EMBED", "SPREADSHEET", "FILE", "VIDEO", "DESIGN", "DOC", "FORM", "DASHBOARD"].includes(activeView.type))
                                                        ? "overflow-hidden"
                                                        : "overflow-y-auto px-6 py-6"
                                                )}>
                                                    {activeView && (
                                                        <TabsContent value={activeView.id} className="mt-0 h-full min-w-0 w-full max-w-full">
                                                            {renderViewContent(activeView)}
                                                        </TabsContent>
                                                    )}
                                                </div>
                                            </Tabs>
                                        ) : (
                                            <div className={cn("relative h-full overflow-y-auto px-6 py-6 min-w-0 max-w-full")}>
                                                {activeView && renderViewContent(activeView)}
                                            </div>
                                        )}
                                    </>
                                )
                            }
                            SidePanelContent={
                                <>
                                    {isAskAIOpen && (
                                        <SidePanelContainer
                                            onClose={() => setIsAskAIOpen(false)}
                                            title={<span className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">AI Assistant</span>}
                                            icon={<div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />}
                                        >
                                            <ChatView
                                                contextType="SPACE"
                                                contextId={spaceId}
                                                contextName={space.name || "Space"}
                                                hideSidebar={true}
                                            />
                                        </SidePanelContainer>
                                    )}
                                    {selectedTaskId && !isAskAIOpen && taskViewMode === 'sidebar' && (
                                        <div className="h-full border-l border-zinc-200 bg-white">
                                            <TaskDetailContent
                                                taskId={selectedTaskId}
                                                layoutMode="sidebar"
                                                onLayoutModeChange={setTaskViewMode}
                                                onClose={() => {
                                                    const params = new URLSearchParams(searchParams.toString());
                                                    params.delete("task");
                                                    router.push(`?${params.toString()}`);
                                                }}
                                            />
                                        </div>
                                    )}
                                </>
                            }
                            isPanelOpen={isAskAIOpen || (!!selectedTaskId && taskViewMode === 'sidebar')}
                        />
                    </div>
                </div>
            </div>

            {/* Task Detail Modal */}
            {selectedTaskId && taskViewMode === 'modal' && (
                <TaskDetailModal
                    taskId={selectedTaskId}
                    open={true}
                    onOpenChange={(open) => {
                        if (!open) {
                            const params = new URLSearchParams(searchParams.toString());
                            params.delete("task");
                            router.push(`?${params.toString()}`);
                        }
                    }}
                    layoutMode={taskViewMode}
                    onLayoutModeChange={setTaskViewMode}
                />
            )}

            {/* Add View Modal */}
            <AddViewModal
                open={addViewModalOpen}
                onOpenChange={setAddViewModalOpen}
                existingViews={views.map(v => v.type as ViewType)}
                onAddViews={handleAddViews}
                onAddFromTemplate={handleAddFromTemplate}
            />

            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                itemType="space"
                itemId={spaceId}
                itemName={space.name || "Space"}
                workspaceId={workspaceId!}
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
                        <Button variant="destructive" onClick={() => viewToDelete && handleDeleteView(viewToDelete.id)}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {
                viewToShare && (
                    <ShareViewPermissionModal
                        viewId={viewToShare.id}
                        workspaceId={workspaceId as string}
                        open={!!viewToShare}
                        onOpenChange={(open) => !open && setViewToShare(null)}
                    />
                )
            }

            {
                viewToTemplate && (
                    <SaveTemplateModal
                        open={!!viewToTemplate}
                        onOpenChange={(open) => !open && setViewToTemplate(null)}
                        view={viewToTemplate}
                        workspaceId={space?.workspaceId || ""}
                    />
                )
            }

        </div >
    );
}
