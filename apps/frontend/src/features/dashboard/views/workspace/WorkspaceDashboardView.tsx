"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { DashboardEntityProvider } from "@/features/dashboard/context/DashboardEntityContext";
import { DashboardLoadingState, DashboardErrorState } from "@/features/dashboard/components/shared/DashboardStates";
import NavigationSidebar, { type WorkspaceView as WorkspaceViewType } from "@/features/dashboard/layouts/workspace/NavigationSidebar";
import dynamic from "next/dynamic";
const WorkspaceOverviewView = dynamic(() => import("@/features/dashboard/views/workspace/WorkspaceOverviewView"));
const WorkspaceSpaceView = dynamic(() => import("@/features/dashboard/views/workspace/WorkspaceSpaceView"));
const ChatView = dynamic(() => import("@/features/dashboard/views/shared/ChatView"));
const AIChatView = dynamic(() => import("@/features/dashboard/views/shared/AIChatView"));
const SharedAIChatView = dynamic(() => import("@/features/dashboard/views/shared/SharedAIChatView").then(mod => mod.ChatView));
const WorkspaceProjectView = dynamic(() => import("@/features/dashboard/views/workspace/WorkspaceProjectView"));
const WorkspaceTeamView = dynamic(() => import("@/features/dashboard/views/workspace/WorkspaceTeamView"));
const WorkspacePersonalView = dynamic(() => import("@/features/dashboard/views/workspace/WorkspacePersonalView"));
const WorkspaceDocsView = dynamic(() => import("@/features/dashboard/views/workspace/WorkspaceDocsView"));
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
import { ShareModal } from "@/components/permissions/ShareModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ViewTabsOverflow } from "@/features/dashboard/components/shared/ViewTabsOverflow";
import { AddViewModal, ViewType } from "@/features/dashboard/components/modals/AddViewModal";
import { SpaceViewContextMenu } from "@/features/dashboard/components/space/SpaceViewContextMenu";
import {
    ContextMenu,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
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
import { TaskDetailPanel, TaskLayoutMode } from "@/entities/task/components/TaskDetailPanel";
import {
    LayoutDashboard,
    FolderKanban,
    Users,
    MessageSquare,
    User,
    CheckSquare,
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
    UsersRound,
    Settings,
    Edit,
    Copy,
    Shield,
    EyeOff,
    Save,
    CopyPlus,
    Trash2,
    MoreHorizontal,
    Star,
    Briefcase,
    Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LayoutMode = "sidebar" | "top";

interface WorkspaceViewProps {
    workspaceId: string;
}

const viewConfig: Partial<Record<
    ViewType,
    {
        label: string;
        icon: React.ComponentType<{ className?: string; size?: number }>;
        description: string;
    }
>> = {
    OVERVIEW: { label: "Overview", icon: LayoutDashboard, description: "Workspace overview" },

    // Generic
    LIST: { label: "List", icon: List, description: "List view" },
    BOARD: { label: "Board", icon: Kanban, description: "Kanban board" },
    CALENDAR: { label: "Calendar", icon: Calendar, description: "Calendar view" },
    GANTT: { label: "Gantt", icon: Network, description: "Gantt chart" },
    DOC: { label: "Doc", icon: FileText, description: "Document" },
    DOCS: { label: "Docs", icon: FileText, description: "Documents" },
    FORM: { label: "Form", icon: LayoutDashboard, description: "Form" },
    TABLE: { label: "Table", icon: ClipboardList, description: "Table view" },
    TIMELINE: { label: "Timeline", icon: Clock, description: "Timeline view" },
    WORKLOAD: { label: "Workload", icon: BarChart3, description: "Workload view" },
    WHITEBOARD: { label: "Whiteboard", icon: PenTool, description: "Whiteboard" },
    MIND_MAP: { label: "Mind Map", icon: Network, description: "Mind map" },
    MAP: { label: "Map", icon: Map, description: "Map view" },
    PEOPLE: { label: "People", icon: UsersRound, description: "People" },

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
    TASKS: { label: "Tasks", icon: CheckSquare, description: "Workspace tasks" },
    PROJECTS: { label: "Projects", icon: FolderKanban, description: "Projects" },
    SPACES: { label: "Spaces", icon: Briefcase, description: "Spaces" },
    TEAMS: { label: "Teams", icon: Users, description: "Teams" },
    CHANNELS: { label: "Channels", icon: MessageSquare, description: "Chat channels" },
    DASHBOARD: { label: "Dashboard", icon: LayoutDashboard, description: "Dashboard" },
    ANALYTICS: { label: "Analytics", icon: BarChart3, description: "Analytics" },
    ACTIVITY: { label: "Activity", icon: Activity, description: "Activity" },
    MEMBERS: { label: "Members", icon: UsersRound, description: "Members" },
    VIEWS: { label: "Views", icon: LayoutDashboard, description: "Views" },
    LOGS: { label: "Logs", icon: FileText, description: "Logs" },
    POSTS: { label: "Posts", icon: MessageSquare, description: "Posts" },
    MATERIALS: { label: "Materials", icon: LayoutDashboard, description: "Materials" },
    TOOLS: { label: "Tools", icon: LayoutDashboard, description: "Tools" },
    WAR_ROOM: { label: "War Room", icon: LayoutDashboard, description: "War Room" },
    MARKETPLACE: { label: "Marketplace", icon: LayoutDashboard, description: "Marketplace" },
    PROPOSALS: { label: "Proposals", icon: FileText, description: "Proposals" },
    APPEAL: { label: "Appeal", icon: FileText, description: "Appeal" },
    GOVERNANCE: { label: "Governance", icon: FileText, description: "Governance" },
} as Partial<Record<ViewType, { label: string; icon: React.ComponentType<{ className?: string; size?: number }>; description: string }>>;

export default function WorkspaceDashboardView({ workspaceId }: WorkspaceViewProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const utils = trpc.useUtils();

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [layoutMode, setLayoutMode] = useState<LayoutMode>("sidebar");

    // Item selection states
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
    const [isAskAIOpen, setIsAskAIOpen] = useState(false);
    const [taskViewMode, setTaskViewMode] = useState<TaskLayoutMode>("sidebar");

    // Dialog states
    const [addViewModalOpen, setAddViewModalOpen] = useState(false);
    const [viewToRename, setViewToRename] = useState<{ id: string; name: string } | null>(null);
    const [viewToDelete, setViewToDelete] = useState<{ id: string; name: string } | null>(null);
    const [viewToShare, setViewToShare] = useState<{ id: string; name: string } | null>(null);
    const [viewToTemplate, setViewToTemplate] = useState<any | null>(null);

    // URL-based selection states
    const selectedSpaceId = searchParams.get("sid") || undefined;
    const selectedProjectId = searchParams.get("pj") || undefined;
    const selectedTeamId = searchParams.get("tm") || undefined;
    const selectedChatId = searchParams.get("ch") || undefined;
    const selectedAIChatId = searchParams.get("ai") || undefined;
    const selectedTaskId = searchParams.get("task");
    const currentTab = searchParams.get("tab") || "overview";

    // Fetch Data
    const { data: workspace, isLoading } = trpc.workspace.get.useQuery(
        { id: workspaceId },
        { enabled: !!workspaceId, staleTime: 60_000, gcTime: 5 * 60_000 }
    );
    
    console.log("[WorkspaceDashboard] Render tick - isLoading:", isLoading, "views:", (workspace as any)?.views?.length);

    // Mutations
    const createViewMutation = trpc.view.create.useMutation({
        onSuccess: () => {
            utils.workspace.get.invalidate({ id: workspaceId });
            toast.success("View added");
        },
        onError: (err) => toast.error(`Failed to add view: ${err.message}`),
    });

    const deleteViewMutation = trpc.view.delete.useMutation({
        onSuccess: () => {
            utils.workspace.get.invalidate({ id: workspaceId });
            toast.success("View deleted");
        },
        onError: (err) => toast.error(`Failed to delete view: ${err.message}`),
    });

    const updateViewMutation = trpc.view.update.useMutation({
        onSuccess: () => {
            utils.workspace.get.invalidate({ id: workspaceId });
        },
        onError: (err) => toast.error(`Failed to update view: ${err.message}`),
    });

    const reorderViewsMutation = trpc.view.reorder.useMutation({
        onSuccess: () => utils.workspace.get.invalidate({ id: workspaceId }),
        onError: (err) => toast.error(`Failed to reorder views: ${err.message}`),
    });

    const createFromTemplateMutation = trpc.view.createFromTemplate.useMutation({
        onSuccess: () => {
            utils.workspace.get.invalidate({ id: workspaceId });
            toast.success("View created from template");
        },
        onError: (err) => toast.error(`Failed to create view: ${err.message}`),
    });

    // Derived views from DB
    const views = useMemo(() => {
        const raw = (workspace as any)?.views;
        if (!raw || raw.length === 0) return [];
        return [...raw].sort((a: any, b: any) => {
            if (a.type === "OVERVIEW") return -1;
            if (b.type === "OVERVIEW") return 1;
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            return a.position - b.position;
        });
    }, [(workspace as any)?.views]);

    // Determine which context we are in
    const isViewsTab = (currentTab === "overview" || !currentTab);
    const urlTabId = searchParams.get("v");
    const activeView = views.find((v: any) => v.id === urlTabId) || views[0];
    const activeTab = activeView?.id;

    const handleTabChange = useCallback(
        (viewId: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (!params.get("tab")) params.set("tab", "overview");
            params.set("v", viewId);
            router.push(`?${params.toString()}`, { scroll: false });
        },
        [searchParams, router]
    );

    const handleViewChange = (view: WorkspaceViewType) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", view);
        params.delete("v");
        params.delete("sid");
        params.delete("pj");
        params.delete("tm");
        params.delete("ch");
        params.delete("ai");
        if (view === "overview") {
            params.set("tab", "overview");
            if (views.length > 0) params.set("v", views[0].id);
        }
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleRenameView = (name: string) => {
        if (!viewToRename) return;
        const viewId = viewToRename.id;
        const trimmed = name.trim();
        const patchViews = (vs: any[]) =>
            vs.map((v: any) => (v.id === viewId ? { ...v, name: trimmed } : v));
        utils.workspace.get.setData({ id: workspaceId }, (old: any) =>
            old ? { ...old, views: patchViews(old.views ?? []) } : old
        );
        updateViewMutation.mutate({ id: viewId, name: trimmed });
        setViewToRename(null);
    };

    const handleCopyViewLink = (view: any) => {
        const url = `${window.location.origin}${window.location.pathname}?v=${view.id}`;
        navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
    };

    const handleAddViews = (selectedTypes: ViewType[]) => {
        selectedTypes.forEach((type) => {
            const config = viewConfig[type];
            createViewMutation.mutate({
                name: config?.label || type,
                type: type as any,
                workspaceId,
            });
        });
    };

    const handleAddFromTemplate = (templateId: string) => {
        createFromTemplateMutation.mutate({ templateId, workspaceId });
    };

    const handleDeleteView = (viewId: string) => {
        deleteViewMutation.mutate({ id: viewId });
        setViewToDelete(null);
    };

    const handleTaskSelect = useCallback(
        (taskId: string | null) => {
            const params = new URLSearchParams(searchParams.toString());
            if (taskId) params.set("task", taskId);
            else params.delete("task");
            router.push(`?${params.toString()}`, { scroll: false });
        },
        [searchParams, router]
    );

    const togglePin = (view: any) =>
        updateViewMutation.mutate({ id: view.id, isPinned: !view.isPinned });
    const togglePrivate = (view: any) =>
        updateViewMutation.mutate({ id: view.id, isPrivate: !view.isPrivate });
    const toggleLock = (view: any) =>
        updateViewMutation.mutate({ id: view.id, isLocked: !view.isLocked });
    const toggleDefault = (view: any) =>
        updateViewMutation.mutate({ id: view.id, isDefault: !view.isDefault });

    useEffect(() => {
        if (isViewsTab && !urlTabId && views.length > 0) {
            console.log("[WorkspaceDashboard] Fixing URL state with history.replaceState");
            const params = new URLSearchParams(searchParams.toString());
            if (!params.get("tab")) params.set("tab", "overview");
            params.set("v", views[0].id);
            history.replaceState(null, "", `?${params.toString()}`);
        }
    }, [urlTabId, views, isViewsTab, searchParams]);

    const renderViewContent = (view: any) => {
        if (!view) return null;
        const viewType = view.type as ViewType;

        switch (viewType) {
            case "OVERVIEW":
                return <WorkspaceOverviewView workspaceId={workspaceId} />;

            case "LIST":
            case "TASKS":
                return (
                    <ListView
                        workspaceId={workspaceId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "BOARD":
                return (
                    <BoardView
                        workspaceId={workspaceId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "TABLE":
                return (
                    <TableView
                        workspaceId={workspaceId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "CALENDAR":
                return (
                    <CalendarView
                        workspaceId={workspaceId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "GANTT":
                return (
                    <GanttView
                        workspaceId={workspaceId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "TIMELINE":
                return (
                    <TimelineView
                        workspaceId={workspaceId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "FORM":
                return (
                    <FormView
                        workspaceId={workspaceId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "PEOPLE":
                return (
                    <PeopleView
                        workspaceId={workspaceId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "ACTIVITY":
                return (
                    <ActivityView
                        workspaceId={workspaceId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "MIND_MAP":
                return (
                    <MindMapView
                        workspaceId={workspaceId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "WORKLOAD":
                return (
                    <WorkloadView
                        workspaceId={workspaceId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "WHITEBOARD":
                return (
                    <WhiteboardView
                        workspaceId={workspaceId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "MAP":
                return (
                    <MapView
                        workspaceId={workspaceId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "DASHBOARD":
                return (
                    <GenericDashboardView
                        workspaceId={workspaceId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
            case "DOC":
                return (
                    <DocView
                        workspaceId={workspaceId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                    />
                );
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
                        workspaceId={workspaceId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
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

    const renderMainContent = () => {
        return (
            <ResizableSplitLayout
                MainContent={
                    <>
                        {currentTab === "personal" ? (
                            <WorkspacePersonalView workspaceId={workspaceId} />
                        ) : currentTab === "spaces" ? (
                            <WorkspaceSpaceView
                                workspaceId={workspaceId}
                                selectedSpaceId={selectedSpaceId}
                                onSpaceSelect={(spaceId) => {
                                    const params = new URLSearchParams(searchParams.toString());
                                    params.set("sid", spaceId);
                                    router.push(`?${params.toString()}`, { scroll: false });
                                }}
                            />
                        ) : currentTab === "projects" ? (
                            <WorkspaceProjectView
                                workspaceId={workspaceId}
                                selectedProjectId={selectedProjectId}
                                onProjectSelect={(id) => {
                                    const params = new URLSearchParams(searchParams.toString());
                                    params.set("pj", id);
                                    router.push(`?${params.toString()}`, { scroll: false });
                                }}
                            />
                        ) : currentTab === "teams" ? (
                            <WorkspaceTeamView
                                workspaceId={workspaceId}
                                selectedTeamId={selectedTeamId}
                                onTeamSelect={(id) => {
                                    const params = new URLSearchParams(searchParams.toString());
                                    params.set("tm", id);
                                    router.push(`?${params.toString()}`, { scroll: false });
                                }}
                            />
                        ) : currentTab === "docs" ? (
                            <WorkspaceDocsView workspaceId={workspaceId} />
                        ) : currentTab === "chats" ? (
                            <ChatView
                                workspaceId={workspaceId}
                                selectedChatId={selectedChatId}
                                onChatSelect={(id) => {
                                    const params = new URLSearchParams(searchParams.toString());
                                    params.set("ch", id);
                                    router.push(`?${params.toString()}`, { scroll: false });
                                }}
                            />
                        ) : currentTab === "ai-chat" ? (
                            <SharedAIChatView
                                contextType="WORKSPACE"
                                contextId={workspaceId}
                                contextName={workspace?.name || "Workspace"}
                            />
                        ) : (
                            <Tabs value={activeTab || undefined} onValueChange={handleTabChange} className="h-full flex flex-col">
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
                                                    utils.workspace.get.setData({ id: workspaceId }, (old: any) =>
                                                        old ? { ...old, views: newSortedViews } : old
                                                    );
                                                    reorderViewsMutation.mutate(
                                                        newSortedViews.map((v: any, i: number) => ({ id: v.id, position: i * 1000 }))
                                                    );
                                                }}
                                                getIcon={(view) => {
                                                    const viewType = view.type as ViewType;
                                                    const config = viewConfig[viewType] || { icon: FileText };
                                                    const Icon = config.icon;
                                                    return <Icon className="h-full w-full" />;
                                                }}
                                                onTogglePin={(view) => togglePin(view)}
                                                renderMoreAction={(view) => (
                                                    <Popover modal={false}>
                                                        <PopoverTrigger asChild>
                                                            <div role="button" className="h-6 w-6 p-0 flex items-center justify-center rounded hover:bg-slate-200" onClick={(e) => e.stopPropagation()}>
                                                                <MoreHorizontal className="h-4 w-4 text-muted-foreground shrink-0 m-auto" />
                                                            </div>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-56 p-1" sideOffset={8} side="right" align="start">
                                                            <div className="flex flex-col">
                                                                <div role="button" className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); setViewToRename({ id: view.id, name: view.name }); }}>
                                                                    <Edit className="h-4 w-4 shrink-0" /> Rename
                                                                </div>
                                                                <div role="button" className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); handleCopyViewLink(view); }}>
                                                                    <Copy className="h-4 w-4 shrink-0" /> Copy link
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
                                                                    <div className="flex items-center gap-2"><EyeOff className="h-4 w-4 shrink-0" /> Private</div>
                                                                    <Switch checked={view.isPrivate} />
                                                                </div>
                                                                <div role="button" className="flex items-center justify-between px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); toggleDefault(view); }}>
                                                                    <div className="flex items-center gap-2"><Star className="h-4 w-4 shrink-0" /> Set default</div>
                                                                    <Switch checked={view.isDefault} />
                                                                </div>
                                                                <div className="h-px bg-slate-100 my-1 mx-2" />
                                                                <div role="button" className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); createViewMutation.mutate({ name: `${view.name} Copy`, type: view.type as any, workspaceId }); }}>
                                                                    <CopyPlus className="h-4 w-4 shrink-0" /> Duplicate
                                                                </div>
                                                                <div role="button" className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); setViewToTemplate(view); }}>
                                                                    <Save className="h-4 w-4 shrink-0" /> Save as template
                                                                </div>
                                                                <div className="h-px bg-slate-100 my-1 mx-2" />
                                                                <div role="button" className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-red-50 hover:text-red-700 rounded-sm text-red-600 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); setViewToDelete({ id: view.id, name: view.name }); }}>
                                                                    <Trash2 className="h-4 w-4 shrink-0" /> Delete view
                                                                </div>
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                )}
                                                renderDropdownItem={(view, trigger) => (
                                                    <ContextMenu key={`dd-${view.id}`}>
                                                        <ContextMenuTrigger asChild>{trigger}</ContextMenuTrigger>
                                                        <SpaceViewContextMenu
                                                            view={view}
                                                            onRename={(v) => setViewToRename({ id: v.id, name: v.name })}
                                                            onDelete={(v) => setViewToDelete({ id: v.id, name: v.name })}
                                                            onDuplicate={(v) => createViewMutation.mutate({ name: `${v.name} Copy`, type: v.type as any, workspaceId })}
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
                                                                onDuplicate={(v) => createViewMutation.mutate({ name: `${v.name} Copy`, type: v.type as any, workspaceId })}
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
                                                        <div className={cn(
                                                            "flex items-center gap-1.5 h-10 px-3 py-2 text-sm whitespace-nowrap font-medium",
                                                            activeTab === view.id ? "text-primary" : "text-slate-600"
                                                        )}>
                                                            <Icon className="h-4 w-4 shrink-0" />
                                                            <span className="max-w-[120px] truncate">{view.name}</span>
                                                            {view.isPinned && <Pin className="h-3 w-3 shrink-0 rotate-45" />}
                                                            {view.isPrivate && <Lock className="h-3 w-3 shrink-0" />}
                                                        </div>
                                                    );
                                                }}
                                            />
                                        </TabsList>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 rounded-md hover:bg-slate-100 shrink-0 self-center"
                                            onClick={() => setAddViewModalOpen(true)}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className={cn(
                                    "relative min-h-0 flex-1 min-w-0 max-w-full",
                                    (activeView && ["TASKS", "LIST", "BOARD", "TABLE", "CALENDAR", "GANTT", "TIMELINE", "WORKLOAD", "WHITEBOARD", "MIND_MAP", "MAP", "EMBED", "SPREADSHEET", "FILE", "VIDEO", "DESIGN", "DOC", "FORM", "DASHBOARD", "PEOPLE", "GOOGLE_CALENDAR", "GOOGLE_DOCS", "GOOGLE_MAPS", "GOOGLE_SLIDES", "GOOGLE_FORMS", "GOOGLE_DRIVE"].includes(activeView.type))
                                        ? "overflow-hidden"
                                        : "overflow-y-auto px-6 py-6"
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
                                                Your workspace is currently a blank canvas. Add a view to start visualizing your data, tracking tasks, and organizing your workflow.
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
                        )}
                    </>
                }
                SidePanelContent={
                    <>
                        {isAskAIOpen && (
                            <SidePanelContainer
                                onClose={() => setIsAskAIOpen(false)}
                                title={<span className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">AI Assistant</span>}
                                icon={<div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />}
                            >
                                <AIChatView workspaceId={workspaceId} />
                            </SidePanelContainer>
                        )}
                        {selectedTaskId && !isAskAIOpen && taskViewMode === "sidebar" && (
                            <div className="h-full border-l border-zinc-200 bg-white">
                                <TaskDetailPanel
                                    taskId={selectedTaskId}
                                    layoutMode="sidebar"
                                    onLayoutChange={setTaskViewMode}
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
                isPanelOpen={isAskAIOpen || (!!selectedTaskId && taskViewMode === "sidebar")}
            />
        );
    };

    if (isLoading) {
        return <DashboardLoadingState message="Loading workspace..." />;
    }

    return (
        <DashboardEntityProvider workspaceId={workspaceId}>
        <div className="flex h-full flex-col">
            <div className="flex h-full gap-1 flex-1 overflow-hidden">
                {/* Navigation Sidebar */}
                {layoutMode === "sidebar" && (
                    <NavigationSidebar
                        workspaceId={workspaceId}
                        activeView={currentTab as WorkspaceViewType}
                        onViewChange={handleViewChange}
                        collapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
                    />
                )}

                {/* Main Content */}
                <div className="flex-1 overflow-hidden w-full h-full bg-slate-50 flex flex-col">
                    <DashboardHeader
                        entityName={workspace?.name || "Untitled Workspace"}
                        entityType="workspace"
                        entityIcon={<Briefcase className="h-4 w-4" />}
                        shareUrl={`${window.location.origin}${window.location.pathname}`}
                        showSettings={false}
                        onAskAIClick={() => setIsAskAIOpen(!isAskAIOpen)}
                        onShareClick={() => setIsShareModalOpen(true)}
                        agentPopoverContent={
                            <QuickAgentModal
                                contextId={workspaceId}
                                contextType="WORKSPACE"
                                onOpenChange={setIsAgentModalOpen}
                            />
                        }
                        agentOpen={isAgentModalOpen}
                        onAgentOpenChange={setIsAgentModalOpen}
                    />
                    <div className="flex-1 overflow-hidden relative">
                        {renderMainContent()}
                    </div>
                </div>
            </div>

            {/* Task Detail Modal / Fullscreen */}
            {selectedTaskId && taskViewMode !== "sidebar" && (
                <Dialog open={true} onOpenChange={(open) => {
                    if (!open) {
                        const params = new URLSearchParams(searchParams.toString());
                        params.delete("task");
                        router.push(`?${params.toString()}`);
                    }
                }}>
                    <DialogContent className={cn(
                        "p-0 gap-0 overflow-hidden bg-white",
                        taskViewMode === "fullscreen" ? "max-w-[95vw] w-[95vw] h-[95vh]" : "max-w-4xl w-full h-[85vh]"
                    )}>
                        <TaskDetailPanel
                            taskId={selectedTaskId}
                            layoutMode={taskViewMode}
                            onLayoutChange={setTaskViewMode}
                            onClose={() => {
                                const params = new URLSearchParams(searchParams.toString());
                                params.delete("task");
                                router.push(`?${params.toString()}`);
                            }}
                        />
                    </DialogContent>
                </Dialog>
            )}

            {/* Add View Modal */}
            <AddViewModal
                open={addViewModalOpen}
                onOpenChange={setAddViewModalOpen}
                existingViews={views.map((v: any) => v.type as ViewType)}
                onAddViews={handleAddViews}
                onAddFromTemplate={handleAddFromTemplate}
            />

            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                itemType="workspace"
                itemId={workspaceId}
                itemName={workspace?.name || "Workspace"}
                workspaceId={workspaceId}
            />

            {/* Rename View Dialog */}
            <Dialog open={!!viewToRename} onOpenChange={(open) => !open && setViewToRename(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename View</DialogTitle>
                        <DialogDescription>Enter a new name for this view.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={viewToRename?.name || ""}
                            onChange={(e) => setViewToRename((prev) => prev ? { ...prev, name: e.target.value } : null)}
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

            {/* Delete View Dialog */}
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

            {/* Share View Permission Modal */}
            {viewToShare && (
                <ShareViewPermissionModal
                    open={!!viewToShare}
                    onOpenChange={(open) => !open && setViewToShare(null)}
                    viewId={viewToShare.id}
                    workspaceId={workspaceId}
                />
            )}

            {/* Save Template Modal */}
            {viewToTemplate && (
                <SaveTemplateModal
                    open={!!viewToTemplate}
                    onOpenChange={(open) => !open && setViewToTemplate(null)}
                    view={viewToTemplate}
                    workspaceId={workspaceId}
                />
            )}
        </div>
        </DashboardEntityProvider>
    );
}
