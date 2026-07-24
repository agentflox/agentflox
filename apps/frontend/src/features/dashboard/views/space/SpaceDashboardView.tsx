"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import SpaceNavigationSidebar, { type SpaceView } from "@/features/dashboard/layouts/space/SpaceNavigationSidebar";
import dynamic from "next/dynamic";
import { SpaceOverviewTab } from "@/features/dashboard/views/space/SpaceOverviewTab";
import { DashboardEntityProvider } from "@/features/dashboard/context/DashboardEntityContext";
import { DashboardLoadingState, DashboardErrorState } from "@/features/dashboard/components/shared/DashboardStates";

const ChatView = dynamic(() => import("@/features/dashboard/views/shared/ChatView"));
const AIChatView = dynamic(() => import("@/features/dashboard/views/shared/AIChatView"));
const SharedAIChatView = dynamic(() => import("@/features/dashboard/views/shared/SharedAIChatView").then(mod => mod.ChatView));
const SpaceProjectView = dynamic(() => import("@/features/dashboard/views/space/SpaceProjectView"));
const SpaceTeamView = dynamic(() => import("@/features/dashboard/views/space/SpaceTeamView"));
const SpacePersonalView = dynamic(() => import("@/features/dashboard/views/space/SpacePersonalView"));
const SpaceListView = dynamic(() => import("@/features/dashboard/views/space/SpaceListView"));
const SpaceDocsView = dynamic(() => import("@/features/dashboard/views/space/SpaceDocsView"));

import { ShareModal } from "@/components/permissions/ShareModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ViewTabsOverflow } from "@/features/dashboard/components/shared/ViewTabsOverflow";
import { AddViewModal, ViewType } from "@/features/dashboard/components/modals/AddViewModal";
import { SpaceViewContextMenu } from "@/features/dashboard/components/space/SpaceViewContextMenu";

import {
    ListView,
    BoardView,
    TableView,
    PeopleView,
    ActivityView,
    CalendarView,
    GanttView,
    TimelineView,
    FormView,
    MindMapView,
    WorkloadView,
    WhiteboardView,
    MapView,
    GenericDashboardView,
    EmbedView,
    DocView,
} from "@/features/dashboard/views/generic/dashboardViewDynamics";
import {
    ContextMenu,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuPortal,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
    Edit,
    Star,
    Copy,
    Shield,
    EyeOff,
    Save,
    CopyPlus,
    Trash2,
    Table,
    MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LayoutMode = "sidebar" | "top";

interface SpaceDashboardViewProps {
    listId?: string;
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    workspaceId?: string;
    selectedTaskIdFromParent?: string | null;
    onTaskSelect?: (taskId: string | null) => void;
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
    TABLE: { label: "Table", icon: Table, description: "Table view" },
    TIMELINE: { label: "Timeline", icon: Clock, description: "Timeline view" },
    WORKLOAD: { label: "Workload", icon: BarChart3, description: "Workload view" },
    WHITEBOARD: { label: "Whiteboard", icon: PenTool, description: "Whiteboard" },
    MIND_MAP: { label: "Mind Map", icon: Network, description: "Mind map" },
    MAP: { label: "Map", icon: Map, description: "Map view" },
    PEOPLE: { label: "People", icon: Users, description: "People" },

    // Embeds
    EMBED: { label: "Embed", icon: LinkIcon, description: "Embed view" },
    GOOGLE_CALENDAR: { label: "Google Calendar", icon: Calendar, description: "Google Calendar embed" },
    GOOGLE_DOCS: { label: "Google Docs", icon: FileText, description: "Google Docs embed" },
    GOOGLE_MAPS: { label: "Google Maps", icon: Map, description: "Google Maps embed" },
    GOOGLE_SLIDES: { label: "Google Slides", icon: LayoutDashboard, description: "Google Slides embed" },
    GOOGLE_FORMS: { label: "Google Forms", icon: LayoutDashboard, description: "Google Forms embed" },
    GOOGLE_DRIVE: { label: "Google Drive", icon: Sheet, description: "Google Drive embed" },
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

export default function SpaceDashboardView({ listId, spaceId, projectId, teamId, workspaceId, selectedTaskIdFromParent, onTaskSelect }: SpaceDashboardViewProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const utils = trpc.useUtils();

    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
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
    const { data: space, isLoading: isSpaceLoading } = trpc.space.get.useQuery(
        { id: spaceId! },
        { enabled: !!spaceId, staleTime: 60_000, gcTime: 5 * 60_000 }
    );

    const resolvedWorkspaceId: string | undefined = (workspaceId || space?.workspaceId) ?? undefined;

    const { data: selectedList } = trpc.list.get.useQuery(
        { id: selectedListId || "" },
        { enabled: !!selectedListId, staleTime: 60_000, gcTime: 5 * 60_000 }
    );

    const isLoading = isSpaceLoading;

    // Type assertion for space data that includes tools and materials
    const spaceWithTools = space as any;

    // Mutations
    const createViewMutation = trpc.view.create.useMutation({
        onSuccess: async () => {
            // Refetch to ensure views are updated
            await utils.space.get.refetch({ id: spaceId! });
        },
        onError: (err) => toast.error(`Failed to add view: ${err.message}`)
    });

    const deleteViewMutation = trpc.view.delete.useMutation({
        onSuccess: async () => {
            await utils.space.get.refetch({ id: spaceId! });
            toast.success("View deleted");
        },
        onError: (err) => toast.error(`Failed to delete view: ${err.message}`)
    });

    const updateViewMutation = trpc.view.update.useMutation({
        onSuccess: async () => {
            await utils.space.get.invalidate({ id: spaceId! });
        },
        onError: (err) => toast.error(`Failed to update view: ${err.message}`)
    });

    const reorderViewsMutation = trpc.view.reorder.useMutation({
        onSuccess: async () => {
            await utils.space.get.invalidate({ id: spaceId! });
        },
        onError: (err) => toast.error(`Failed to reorder views: ${err.message}`)
    });

    const createFromTemplateMutation = trpc.view.createFromTemplate.useMutation({
        onSuccess: async (data) => {
            // Refetch to ensure views are updated
            await utils.space.get.refetch({ id: spaceId! });
            toast.success("View created from template");

            // Automatically switch to the new view
            const params = new URLSearchParams(searchParams.toString());
            params.set("tab", "overview");
            params.set("v", data.id);
            router.push(`?${params.toString()}`, { scroll: false });
        },
        onError: (err) => toast.error(`Failed to create view: ${err.message}`)
    });

    // Derived Data
    const spaceProjects = useMemo(() => {
        return space?.projects ?? [];
    }, [space?.projects]);

    const spaceTeams = useMemo(() => {
        return space?.teams ?? [];
    }, [space?.teams]);

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
    const isViewsTab = (currentTab === "overview" || !currentTab) && !selectedListId;
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
            params.set("tab", "overview");
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
        if (listId) params.set("lt", listId);
        else params.delete("lt");
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
            const viewId = viewToRename.id;
            const trimmed = name.trim();
            const patchViews = (views: any[]) => views.map((v: any) => v.id === viewId ? { ...v, name: trimmed } : v);

            utils.space.get.setData({ id: spaceId! }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);

            updateViewMutation.mutate({
                id: viewId,
                name: trimmed
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
            await utils.space.get.refetch({ id: spaceId! });
            const params = new URLSearchParams(searchParams.toString());
            params.set("tab", "overview");
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
            if (!params.get("tab")) params.set("tab", "overview");
            params.set("v", views[0].id);
            history.replaceState(null, "", `?${params.toString()}`);
        }
    }, [urlTabId, views, isViewsTab, searchParams, router]);

    // Auto-select Project if none selected but available
    useEffect(() => {
        if (currentTab === "projects" && !selectedProjectId && spaceProjects.length > 0) {
            const params = new URLSearchParams(searchParams.toString());
            params.set("pj", spaceProjects[0].id);
            history.replaceState(null, "", `?${params.toString()}`);
        }
    }, [currentTab, selectedProjectId, spaceProjects, searchParams, router]);

    // Auto-select Team if none selected but available
    useEffect(() => {
        if (currentTab === "teams" && !selectedTeamId && spaceTeams.length > 0) {
            const params = new URLSearchParams(searchParams.toString());
            params.set("tm", spaceTeams[0].id);
            history.replaceState(null, "", `?${params.toString()}`);
        }
    }, [currentTab, selectedTeamId, spaceTeams, searchParams, router]);

    // For Chats and AI Chats, we can do similar if we had access to the list here easily.
    // ChatView handles internal selection, but we want URL reflection.
    // If ChatView selects a default, it calls onChatSelect, which updates URL.
    // So we don't strictly need a useEffect here for chats if the child component is well behaved.

    // Check if we're in "views" tab mode (from sidebar)
    // moved up

    const renderViewContent = (view: any) => {
        if (!view) return null;
        const viewType = view.type as ViewType;

        switch (viewType) {
            case "OVERVIEW":
                return <SpaceOverviewTab space={space} />;

            // Generic Vews
            case "LIST":
                return (
                    <ListView
                        context="space"
                        workspaceId={resolvedWorkspaceId}
                        spaceId={spaceId!}
                        viewId={view.id}
                        initialConfig={view.config}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "BOARD":
                return (
                    <BoardView
                        context="space"
                        workspaceId={resolvedWorkspaceId}
                        spaceId={spaceId!}
                        viewId={view.id}
                        initialConfig={view.config}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "TABLE":
                return (
                    <TableView
                        context="space"
                        workspaceId={resolvedWorkspaceId}
                        spaceId={spaceId!}
                        viewId={view.id}
                        initialConfig={view.config}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "CALENDAR":
                return (
                    <CalendarView
                        context="space"
                        workspaceId={resolvedWorkspaceId}
                        spaceId={spaceId!}
                        viewId={view.id}
                        initialConfig={view.config}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "GANTT":
                return (
                    <GanttView
                        context="space"
                        workspaceId={resolvedWorkspaceId}
                        spaceId={spaceId!}
                        viewId={view.id}
                        initialConfig={view.config}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "TIMELINE":
                return (
                    <TimelineView
                        context="space"
                        workspaceId={resolvedWorkspaceId}
                        spaceId={spaceId!}
                        viewId={view.id}
                        initialConfig={view.config}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "FORM":
                return (
                    <FormView
                        context="space"
                        workspaceId={workspaceId}
                        spaceId={spaceId!}
                        viewId={view.id}
                        initialConfig={view.config}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "PEOPLE":
                return (
                    <PeopleView
                        context="space"
                        workspaceId={resolvedWorkspaceId}
                        spaceId={spaceId!}
                        viewId={view.id}
                        initialConfig={view.config}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "ACTIVITY":
                return (
                    <ActivityView
                        context="space"
                        workspaceId={resolvedWorkspaceId}
                        spaceId={spaceId!}
                        viewId={view.id}
                        initialConfig={view.config}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "MIND_MAP":
                return (
                    <MindMapView
                        context="space"
                        workspaceId={resolvedWorkspaceId}
                        spaceId={spaceId!}
                        viewId={view.id}
                        initialConfig={view.config}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "MAP":
                return (
                    <MapView
                        context="space"
                        workspaceId={resolvedWorkspaceId}
                        spaceId={spaceId!}
                        viewId={view.id}
                        initialConfig={view.config}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}

                    />
                );
            case "WORKLOAD":
                return (
                    <WorkloadView
                        context="space"
                        workspaceId={resolvedWorkspaceId}
                        spaceId={spaceId!}
                        viewId={view.id}
                        initialConfig={view.config}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "WHITEBOARD":
                return (
                    <WhiteboardView
                        context="space"
                        spaceId={spaceId!}
                        viewId={view.id}
                        initialConfig={view.config}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "DASHBOARD":
                return (
                    <GenericDashboardView
                        context="space"
                        spaceId={spaceId!}
                        viewId={view.id}
                        initialConfig={view.config}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );

            case "DOC":
                return (
                    <DocView
                        context="space"
                        listId={listId}
                        spaceId={spaceId!}
                        projectId={projectId}
                        teamId={teamId}
                        viewId={view.id}
                        initialConfig={view.config}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );

            // Embeds
            case "EMBED":
            case "SPREADSHEET":
            case "FILE":
            case "VIDEO":
            case "DESIGN":
            case "GOOGLE_CALENDAR":
            case "GOOGLE_DOCS":
            case "GOOGLE_MAPS":
            case "GOOGLE_SLIDES":
            case "GOOGLE_FORMS":
            case "GOOGLE_DRIVE":
                return (
                    <EmbedView
                        context="space"
                        listId={listId}
                        spaceId={spaceId!}
                        projectId={projectId}
                        teamId={teamId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );

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
        return <DashboardLoadingState message="Loading space..." />;
    }

    if (!space) {
        return <DashboardErrorState title="Space not found" message="We couldn't find the space you're looking for." />;
    }

    return (
        <DashboardEntityProvider
            workspaceId={resolvedWorkspaceId}
            spaceId={spaceId}
            projectId={projectId}
            teamId={teamId}
        >
            <div className="flex h-full flex-col">
                {/* Dashboard Header */}
                {/* DashboardHeader moved inside content area */}

                {/* Main Layout - Sidebar visibility controlled by layoutMode */}
                <div className="flex h-full flex-1 overflow-hidden">
                    {/* Navigation Sidebar - Show only when layoutMode is "sidebar" */}
                    {layoutMode === "sidebar" && (
                        <SpaceNavigationSidebar
                            spaceId={spaceId!}
                            activeView={(isListsTab ? "lists" : currentTab || "overview") as SpaceView}
                            onViewChange={(view: SpaceView) => {
                                const params = new URLSearchParams(searchParams.toString());
                                params.delete("v"); // Always clear view ID when switching main contexts
                                params.delete("pj");
                                params.delete("tm");
                                params.delete("lt");
                                params.delete("ch");
                                params.delete("ai");

                                // Special handling for "overview" tab - show tab-based interface
                                if (view === "overview") {
                                    params.set("tab", "overview");
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
                            showExit={true}
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
                                            spaceId={spaceId!}
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
                                                    spaceId={spaceId!}
                                                    workspaceId={workspaceId!}
                                                    selectedListId={selectedListId || undefined}
                                                    onListSelect={handleListSelect}
                                                />
                                            ) : currentTab === "projects" ? (
                                                <SpaceProjectView
                                                    spaceId={spaceId!}
                                                    workspaceId={workspaceId!}
                                                    selectedProjectId={selectedProjectId || undefined}
                                                    onProjectSelect={handleProjectSelect}
                                                />
                                            ) : currentTab === "teams" ? (
                                                <SpaceTeamView
                                                    spaceId={spaceId!}
                                                    workspaceId={workspaceId!}
                                                    selectedTeamId={selectedTeamId || undefined}
                                                    onTeamSelect={handleTeamSelect}
                                                />
                                            ) : currentTab === "personal" ? (
                                                <SpacePersonalView spaceId={spaceId!} workspaceId={workspaceId!} />
                                            ) : currentTab === "docs" ? (
                                                <SpaceDocsView spaceId={spaceId!} workspaceId={workspaceId!} />
                                            ) : currentTab === "chats" ? (
                                                <ChatView
                                                    workspaceId={workspaceId!}
                                                    selectedChatId={selectedChannelId || undefined}
                                                    onChatSelect={handleChatSelect}
                                                />
                                            ) : currentTab === "ai-chat" ? (
                                                <SharedAIChatView
                                                    contextType="SPACE"
                                                    contextId={spaceId!}
                                                    contextName={space?.name || "Space"}
                                                />
                                            ) : isViewsTab ? (
                                                <Tabs value={activeTab} onValueChange={handleTabChange} className="flex h-full flex-col gap-0">
                                                    <div className="border-b border-slate-200 bg-white px-4 py-1">
                                                        <div className="flex items-center gap-1 min-w-0 overflow-visible">
                                                            <TabsList className="h-auto bg-transparent p-0 flex-1 min-w-0 flex items-center overflow-visible">
                                                                <ViewTabsOverflow
                                                                    views={views}
                                                                    activeTab={activeTab}
                                                                    onTabChange={handleTabChange}
                                                                    onAddView={() => setAddViewModalOpen(true)}
                                                                    onReorderViews={(activeId, overId, dropPosition) => {
                                                                        const activeView = views.find((v: any) => v.id === activeId);
                                                                        const overView = views.find((v: any) => v.id === overId);
                                                                        if (!activeView || !overView || activeId === overId) return;
                                                                        const otherViews = views.filter((v: any) => v.id !== activeId);
                                                                        let targetViewId: string | null = overId;
                                                                        if (dropPosition === "after") {
                                                                            const idx = otherViews.findIndex((v: any) => v.id === overId);
                                                                            targetViewId = idx >= 0 && idx < otherViews.length - 1 ? otherViews[idx + 1].id : null;
                                                                        }
                                                                        let newSortedViews: any[];
                                                                        if (targetViewId) {
                                                                            const idx = otherViews.findIndex((v: any) => v.id === targetViewId);
                                                                            newSortedViews = [...otherViews.slice(0, idx), activeView, ...otherViews.slice(idx)];
                                                                        } else {
                                                                            newSortedViews = [...otherViews, activeView];
                                                                        }
                                                                        const moved = newSortedViews.find((v: any) => v.id === activeId);
                                                                        if (moved) moved.isPinned = overView.isPinned;
                                                                        newSortedViews.forEach((v: any, i: number) => { v.position = i * 1000; });
                                                                        utils.space.get.setData({ id: spaceId! }, (old: any) => old ? { ...old, views: newSortedViews } : old);
                                                                        reorderViewsMutation.mutate(newSortedViews.map((v: any, i: number) => ({ id: v.id, position: i * 1000 })));
                                                                    }}
                                                                    renderMoreAction={(view) => (
                                                                        <Popover modal={false}>
                                                                            <PopoverTrigger asChild>
                                                                                <div role="button" className="h-6 w-6 p-0 flex items-center justify-center rounded hover:bg-slate-200" onClick={e => e.stopPropagation()}>
                                                                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground shrink-0 m-auto" />
                                                                                </div>
                                                                            </PopoverTrigger>
                                                                            <PopoverContent className="w-56 p-1" sideOffset={8} side="right" align="start">
                                                                                <div className="flex flex-col">
                                                                                    <div role="button" className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); setViewToRename({ id: view.id, name: view.name }); }}>
                                                                                        <Edit className="h-4 w-4 shrink-0" /> Rename
                                                                                    </div>
                                                                                    <div role="button" className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); handleCopyViewLink(view); }}>
                                                                                        <Copy className="h-4 w-4 shrink-0" /> Copy link to view
                                                                                    </div>
                                                                                    <div role="button" className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); setViewToShare({ id: view.id, name: view.name }); }}>
                                                                                        <Shield className="h-4 w-4 shrink-0" /> Permissions
                                                                                    </div>
                                                                                    <div className="h-px bg-slate-100 my-1 mx-2" />
                                                                                    <div role="button" className="flex items-center justify-between px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); togglePin(view); }}>
                                                                                        <div className="flex items-center gap-2"><Pin className="h-4 w-4 shrink-0" /> Pin view</div>
                                                                                        <Switch checked={view.isPinned} />
                                                                                    </div>
                                                                                    <div role="button" className="flex items-center justify-between px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); togglePrivate(view); }}>
                                                                                        <div className="flex items-center gap-2"><EyeOff className="h-4 w-4 shrink-0" /> Private view</div>
                                                                                        <Switch checked={view.isPrivate} />
                                                                                    </div>
                                                                                    <div role="button" className="flex items-center justify-between px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); toggleLock(view); }}>
                                                                                        <div className="flex items-center gap-2"><Lock className="h-4 w-4 shrink-0" /> Protect view</div>
                                                                                        <Switch checked={view.isLocked} />
                                                                                    </div>
                                                                                    <div role="button" className="flex items-center justify-between px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); toggleDefault(view); }}>
                                                                                        <div className="flex items-center gap-2"><Star className="h-4 w-4 shrink-0" /> Set as default view</div>
                                                                                        <Switch checked={view.isDefault} />
                                                                                    </div>
                                                                                    <div className="h-px bg-slate-100 my-1 mx-2" />
                                                                                    <div role="button" className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); createViewMutation.mutate({ name: `${view.name} Copy`, type: view.type as any, spaceId: spaceId! }); }}>
                                                                                        <CopyPlus className="h-4 w-4 shrink-0" /> Duplicate view
                                                                                    </div>
                                                                                    <div role="button" className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); setViewToTemplate(view); }}>
                                                                                        <Save className="h-4 w-4 shrink-0" /> Save as template
                                                                                    </div>
                                                                                    <div className="h-px bg-slate-100 my-1 mx-2" />
                                                                                    <div role="button" className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-red-50 hover:text-red-700 rounded-sm text-red-600 w-full text-left items-start cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); setViewToDelete({ id: view.id, name: view.name }); }}>
                                                                                        <Trash2 className="h-4 w-4 shrink-0" /> Delete view
                                                                                    </div>
                                                                                </div>
                                                                            </PopoverContent>
                                                                        </Popover>
                                                                    )}
                                                                    getIcon={(view) => {
                                                                        const viewType = view.type as ViewType;
                                                                        const config = viewConfig[viewType] || { icon: FileText };
                                                                        const Icon = config.icon;
                                                                        return <Icon className="h-full w-full" />;
                                                                    }}
                                                                    onTogglePin={(view) => togglePin(view)}
                                                                    renderDropdownItem={(view, trigger) => (
                                                                        <ContextMenu key={`dd-${view.id}`}>
                                                                            <ContextMenuTrigger asChild>
                                                                                {trigger}
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
                                                                    )}
                                                                    renderTab={(view, isActive) => {
                                                                        const viewType = view.type as ViewType;
                                                                        const config = viewConfig[viewType] || { label: view.name, icon: FileText };
                                                                        const Icon = config.icon;
                                                                        return (
                                                                            <ContextMenu key={view.id}>
                                                                                <ContextMenuTrigger>
                                                                                    <Tooltip>
                                                                                        <TooltipTrigger asChild>
                                                                                            <TabsTrigger value={view.id} asChild>
                                                                                                <div className={cn(
                                                                                                    "group relative flex items-center gap-1.5 h-10 px-3 py-2 text-sm cursor-pointer whitespace-nowrap transition-colors rounded-md",
                                                                                                    activeTab === view.id
                                                                                                        ? "text-primary font-medium"
                                                                                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                                                                )}>
                                                                                                    <Icon className={cn("h-4 w-4 shrink-0", activeTab === view.id ? "text-primary" : "text-slate-500 group-hover:text-slate-700")} />
                                                                                                    <span className="inline-block max-w-[120px] truncate align-bottom">{view.name}</span>
                                                                                                    {view.isPinned && <Pin className="h-3 w-3 shrink-0 rotate-45 text-muted-foreground" />}
                                                                                                    {view.isPrivate && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}

                                                                                                    {activeTab === view.id && (
                                                                                                        <div className="absolute left-0 right-0 h-0.5 bg-primary rounded-t-full" style={{ bottom: "-5px" }} />
                                                                                                    )}
                                                                                                </div>
                                                                                            </TabsTrigger>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent>{view.name}</TooltipContent>
                                                                                    </Tooltip>
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
                                                                    }}
                                                                    renderMeasureTab={(view) => {
                                                                        const viewType = view.type as ViewType;
                                                                        const config = viewConfig[viewType] || { icon: FileText };
                                                                        const Icon = config.icon;
                                                                        return (
                                                                            <div className="flex items-center gap-1.5 h-10 px-3 py-2 text-sm whitespace-nowrap font-medium">
                                                                                <Icon className="h-4 w-4 shrink-0" />
                                                                                <span className="max-w-[120px] truncate">{view.name}</span>
                                                                                {view.isPinned && <Pin className="h-3 w-3 shrink-0 rotate-45" />}
                                                                                {view.isPrivate && <Lock className="h-3 w-3 shrink-0" />}
                                                                            </div>
                                                                        );
                                                                    }}
                                                                />
                                                            </TabsList>
                                                            <div className="flex items-center shrink-0">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setAddViewModalOpen(true)}
                                                                    className="h-8 px-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                                                                >
                                                                    <Plus className="h-4 w-4 mr-1" />
                                                                    View
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className={cn(
                                                        "relative min-h-0 flex-1 min-w-0 max-w-full",
                                                        (activeView && ["TASKS", "LIST", "BOARD", "TABLE", "CALENDAR", "GANTT", "TIMELINE", "WORKLOAD", "WHITEBOARD", "MIND_MAP", "MAP", "EMBED", "SPREADSHEET", "FILE", "VIDEO", "DESIGN", "DOC", "FORM", "DASHBOARD", "PEOPLE", "GOOGLE_CALENDAR", "GOOGLE_DOCS", "GOOGLE_MAPS", "GOOGLE_SLIDES", "GOOGLE_FORMS", "GOOGLE_DRIVE"].includes(activeView.type))
                                                            ? "overflow-hidden"
                                                            : "overflow-y-auto"
                                                    )}>
                                                        {activeView && (
                                                            <TabsContent value={activeView.id} className="mt-0 h-full min-h-0 min-w-0 w-full max-w-full">
                                                                {renderViewContent(activeView)}
                                                            </TabsContent>
                                                        )}

                                                        {views.length === 0 && (
                                                            <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in zoom-in-95 duration-700 ease-out fill-mode-both">
                                                                <div className="relative mb-6 group">
                                                                    <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full transition-all duration-700 group-hover:bg-primary/20 group-hover:blur-3xl" />
                                                                    <div className="relative h-20 w-20 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 shadow-lg shadow-slate-200/20 rounded-3xl flex items-center justify-center text-primary transform transition-transform duration-500 group-hover:scale-105 group-hover:-translate-y-1">
                                                                        <LayoutDashboard className="h-9 w-9 stroke-[1.5]" />
                                                                    </div>
                                                                </div>
                                                                <h3 className="text-xl font-semibold text-slate-900 tracking-tight mb-2">No views configured</h3>
                                                                <p className="text-sm text-slate-500 max-w-md mb-8 leading-relaxed">
                                                                    Your space is currently a blank canvas. Add a view to start visualizing your data, tracking tasks, and organizing your workflow.
                                                                </p>
                                                                <Button
                                                                    size="default"
                                                                    onClick={() => setAddViewModalOpen(true)}
                                                                    className="shadow-sm hover:shadow-md transition-all group rounded-full px-6"
                                                                >
                                                                    <Plus className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-90" />
                                                                    Create your first view
                                                                </Button>
                                                            </div>
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
                                                <AIChatView
                                                    workspaceId={workspaceId!}
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
                                sidePanelDefaultSize={50}
                                sidePanelMinSize={40}
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
                            <Button
                                className="flex-1 sm:flex-none inline-flex items-center justify-center h-9 px-4 rounded-lg border border-zinc-200 bg-white text-[13.5px] font-medium text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-800 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1"
                                onClick={() => setViewToDelete(null)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => viewToDelete && handleDeleteView(viewToDelete.id)}
                                className="flex-1 sm:flex-none h-9 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-[13.5px] font-medium shadow-sm shadow-red-900/10 transition-all duration-150">
                                Delete
                            </Button>
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
        </DashboardEntityProvider>
    );
}
