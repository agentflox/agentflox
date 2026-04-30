"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import ProjectNavigationSidebar, { type ProjectView } from "@/features/dashboard/layouts/project/ProjectNavigationSidebar";
import { ProjectOverviewTab } from "@/features/dashboard/views/project/ProjectOverviewTab";
import { DiscussionsView } from "@/features/dashboard/views/project/DiscussionsView";
import { LogsView } from "@/features/dashboard/views/project/LogsView";
import { ActivitiesView } from "@/features/dashboard/views/project/ActivitiesView";
import { AppealView } from "@/features/dashboard/views/project/AppealView";
import { GovernanceView } from "@/features/dashboard/views/project/GovernanceView";
import { TasksView } from "@/features/dashboard/views/project/TasksView";
import { MembersView } from "@/features/dashboard/views/project/MembersView";
import { AnalyticsView } from "@/features/dashboard/views/project/AnalyticsView";
import { WarRoomView } from "@/features/dashboard/views/project/WarRoomView";
import { MarketplaceView } from "@/features/dashboard/views/project/MarketplaceView";
import ListView from "@/features/dashboard/views/generic/ListView";
import { BoardView } from "@/features/dashboard/views/generic/BoardView";
import { TableView } from "@/features/dashboard/views/generic/TableView";
import { PeopleView } from "@/features/dashboard/views/generic/PeopleView ";
import { CalendarView } from "@/features/dashboard/views/generic/CalendarView";
import { GanttView } from "@/features/dashboard/views/generic/GanttView";
import { TimelineView } from "@/features/dashboard/views/generic/TimelineView";
import { FormView } from "@/features/dashboard/views/generic/FormView";
import { MindMapView } from "@/features/dashboard/views/generic/MindMapView";
import { WorkloadView } from "@/features/dashboard/views/generic/WorkloadView";
import WhiteboardView from "@/features/dashboard/views/generic/WhiteboardView";
import { MapView } from "@/features/dashboard/views/generic/MapView";
import { DashboardView as GenericDashboardView } from "@/features/dashboard/views/generic/DashboardView";
import { EmbedView } from "@/features/dashboard/views/generic/EmbedView";
import ProjectListView from "@/features/dashboard/views/project/ProjectListView";
import { ShareModal } from "@/components/permissions/ShareModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ViewTabsOverflow } from "@/features/dashboard/components/shared/ViewTabsOverflow";
import { AddViewModal, ViewType } from "@/features/dashboard/components/modals/AddViewModal";
import { ProjectViewContextMenu } from "@/features/dashboard/components/project/ProjectViewContextMenu";
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
import { TaskDetailPanel, TaskLayoutMode } from "@/entities/task/components/TaskDetailPanel";
import { ChatView } from "@/features/dashboard/views/project/ChatView";
import { ProjectActionsMenu } from "@/features/dashboard/components/sidebar/ProjectActionsMenu";
import { VerticalToolRail } from "@/features/dashboard/components/VerticalToolRail";
import ProjectItemSidebar from "@/features/dashboard/layouts/project/ProjectItemSidebar";
import ProjectSettingsSidebar from "@/features/dashboard/layouts/project/ProjectSettingsSidebar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
    LayoutDashboard,
    MessageSquare,
    ClipboardList,
    Activity,
    Gavel,
    Shield,
    CheckSquare,
    Users,
    BarChart3,
    Swords,
    Store,
    Sidebar,
    LayoutPanelTop,
    FileText,
    Pin,
    Lock,
    Plus,
    List,
    List as ListIcon,
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
    FolderKanban,
    Settings,
    Edit,
    Copy,
    EyeOff,
    Save,
    CopyPlus,
    Trash2,
    MoreHorizontal,
    Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LayoutMode = "sidebar" | "top";

interface ProjectDashboardViewProps {
    projectId: string;
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
    OVERVIEW: { label: "Overview", icon: LayoutDashboard, description: "Project overview" },
    DISCUSSIONS: { label: "Discussions", icon: MessageSquare, description: "Project discussions" },
    LOGS: { label: "Audit Logs", icon: ClipboardList, description: "View audit logs" },
    ACTIVITY: { label: "Activities", icon: Activity, description: "Activity log" },
    APPEAL: { label: "Appeal", icon: Gavel, description: "Appeal requests" },
    GOVERNANCE: { label: "Governance", icon: Shield, description: "Governance and compliance" },
    TASKS: { label: "Tasks", icon: CheckSquare, description: "Manage tasks" },
    MEMBERS: { label: "Members", icon: Users, description: "Project members" },
    ANALYTICS: { label: "Analytics", icon: BarChart3, description: "Project analytics" },
    WAR_ROOM: { label: "War Room", icon: Swords, description: "Critical operations center" },
    MARKETPLACE: { label: "Marketplace", icon: Store, description: "Project marketplace" },

    // Generic / New
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
    PROJECTS: { label: "Sub-Projects", icon: LayoutDashboard, description: "Sub-projects" },
    TEAMS: { label: "Teams", icon: Users, description: "Associated teams" },
    DOCS: { label: "Docs", icon: FileText, description: "Documentation" },
    CHANNELS: { label: "Channels", icon: MessageSquare, description: "Chat channels" },
    PROPOSALS: { label: "Proposals", icon: FileText, description: "Proposals" },
    TOOLS: { label: "Tools", icon: LayoutDashboard, description: "Tools" },
    MATERIALS: { label: "Materials", icon: LayoutDashboard, description: "Materials" },
    DASHBOARD: { label: "Dashboard", icon: LayoutDashboard, description: "Dashboard" },
    POSTS: { label: "Posts", icon: MessageSquare, description: "Posts" },
    VIEWS: { label: "Views", icon: LayoutDashboard, description: "Views" },
};

export default function ProjectDashboardView({ projectId }: ProjectDashboardViewProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const utils = trpc.useUtils();

    const selectedTaskId = searchParams.get("task");
    const selectedListId = searchParams.get("list");

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [layoutMode, setLayoutMode] = useState<LayoutMode>("sidebar");

    // Item selection states
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    // Dialog states
    const [addViewModalOpen, setAddViewModalOpen] = useState(false);
    const [viewToRename, setViewToRename] = useState<{ id: string, name: string } | null>(null);
    const [viewToDelete, setViewToDelete] = useState<{ id: string, name: string } | null>(null);
    const [viewToShare, setViewToShare] = useState<{ id: string, name: string } | null>(null);
    const [viewToTemplate, setViewToTemplate] = useState<any | null>(null);
    const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
    const [isAskAIOpen, setIsAskAIOpen] = useState(false);
    const [taskViewMode, setTaskViewMode] = useState<TaskLayoutMode>("sidebar");
    const [itemSidebarOpen, setItemSidebarOpen] = useState(false);
    const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(false);

    const openItemSidebar = () => setItemSidebarOpen(true);
    const openSettingsSidebar = () => setSettingsSidebarOpen(true);

    // Fetch Data
    const { data: project, isLoading: isProjectLoading } = trpc.project.get.useQuery({ id: projectId });

    const isLoading = isProjectLoading;
    const workspaceId = project?.workspaceId || undefined;

    // Mutations
    const createViewMutation = trpc.view.create.useMutation({
        onSuccess: () => {
            utils.project.get.invalidate({ id: projectId });
            toast.success("View added");
        },
        onError: (err) => toast.error(`Failed to add view: ${err.message}`)
    });

    const deleteViewMutation = trpc.view.delete.useMutation({
        onSuccess: () => {
            utils.project.get.invalidate({ id: projectId });
            toast.success("View deleted");
        },
        onError: (err) => toast.error(`Failed to delete view: ${err.message}`)
    });

    const updateViewMutation = trpc.view.update.useMutation({
        onSuccess: () => {
            utils.project.get.invalidate({ id: projectId });
        },
        onError: (err) => toast.error(`Failed to update view: ${err.message}`)
    });

    const createFromTemplateMutation = trpc.view.createFromTemplate.useMutation({
        onSuccess: () => {
            utils.project.get.invalidate({ id: projectId });
            toast.success("View created from template");
        },
        onError: (err) => toast.error(`Failed to create view: ${err.message}`)
    });

    const reorderViewsMutation = trpc.view.reorder.useMutation({
        onSuccess: () => utils.project.get.invalidate({ id: projectId }),
        onError: (err) => toast.error(`Failed to reorder views: ${err.message}`)
    });

    const duplicateViewMutation = trpc.view.create.useMutation({
        onSuccess: () => {
            utils.project.get.invalidate({ id: projectId });
            toast.success("View duplicated");
        },
        onError: (err) => toast.error(`Failed to duplicate view: ${err.message}`)
    });

    // Derived views from DB
    const views = useMemo(() => {
        if (!project?.views || project.views.length === 0) {
            return [];
        }
        return [...project.views].sort((a: any, b: any) => {
            if (a.type === "OVERVIEW") return -1;
            if (b.type === "OVERVIEW") return 1;
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            return a.position - b.position;
        });
    }, [project?.views]);

    // Check tabs
    const currentTab = searchParams.get("tab");
    const isViewsTab = currentTab === "views" || !currentTab;
    const isListsTab = currentTab === "lists" || !!selectedListId;

    // Active Tab Logic
    const urlTabId = searchParams.get("v");
    const activeView = views.find((v: any) => v.id === urlTabId) || views[0];
    const activeTab = activeView?.id;

    const handleTabChange = useCallback((viewId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (!params.get("tab")) {
            params.set("tab", "views");
        }
        params.set("v", viewId);
        router.push(`?${params.toString()}`, { scroll: false });
    }, [searchParams, router]);

    const handleRenameView = (name: string) => {
        if (viewToRename) {
            const viewId = viewToRename.id;
            const trimmed = name.trim();
            const patchViews = (views: any[]) => views.map((v: any) => v.id === viewId ? { ...v, name: trimmed } : v);

            utils.project.get.setData({ id: projectId }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);

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

    const handleAddViews = (selectedTypes: ViewType[]) => {
        selectedTypes.forEach(type => {
            const config = viewConfig[type];
            createViewMutation.mutate({
                name: config.label,
                type: type,
                projectId: projectId
            });
        });
    };

    const handleAddFromTemplate = (templateId: string) => {
        createFromTemplateMutation.mutate({
            templateId,
            projectId
        });
    };

    const handleDeleteView = (viewId: string) => {
        deleteViewMutation.mutate({ id: viewId });
        setViewToDelete(null);
    };

    const handleTaskSelect = useCallback((taskId: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (taskId) params.set("task", taskId);
        else params.delete("task");
        router.push(`?${params.toString()}`, { scroll: false });
    }, [searchParams, router]);

    const handleListSelect = useCallback((listId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (listId) params.set("list", listId);
        else params.delete("list");
        router.push(`?${params.toString()}`, { scroll: false });
    }, [searchParams, router]);

    const togglePin = (view: any) => updateViewMutation.mutate({ id: view.id, isPinned: !view.isPinned });
    const togglePrivate = (view: any) => updateViewMutation.mutate({ id: view.id, isPrivate: !view.isPrivate });
    const toggleLock = (view: any) => updateViewMutation.mutate({ id: view.id, isLocked: !view.isLocked });
    const toggleDefault = (view: any) => updateViewMutation.mutate({ id: view.id, isDefault: !view.isDefault });


    useEffect(() => {
        if (isViewsTab && !urlTabId && views.length > 0) {
            const params = new URLSearchParams(searchParams.toString());
            if (!params.get("tab")) params.set("tab", "views");
            params.set("v", views[0].id);
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    }, [urlTabId, views, isViewsTab, searchParams, router]);

    const renderViewContent = (view: any) => {
        if (!view || !project) return null;
        const viewType = view.type as ViewType;

        switch (viewType) {
            case "OVERVIEW":
                return <ProjectOverviewTab project={project} />;
            case "DISCUSSIONS":
                return <DiscussionsView projectId={projectId} />;
            case "LOGS":
                return <LogsView />;
            case "ACTIVITY":
                return <ActivitiesView projectId={projectId} />;
            case "APPEAL":
                return <AppealView />;
            case "GOVERNANCE":
                return <GovernanceView />;
            case "MEMBERS":
                return <MembersView projectId={projectId} />;
            case "ANALYTICS":
                return <AnalyticsView projectId={projectId} />;
            case "WAR_ROOM":
                return <WarRoomView projectId={projectId} />;
            case "MARKETPLACE":
                return <MarketplaceView projectId={projectId} />;

            // Generic Vews
            case "TASKS":
            case "LIST":
                return (
                    <ListView
                        listId={listId}
                        spaceId={spaceId}
                        projectId={projectId}
                        teamId={teamId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "BOARD":
                return (
                    <BoardView
                        listId={listId}
                        spaceId={spaceId}
                        projectId={projectId}
                        teamId={teamId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "TABLE":
                return (
                    <TableView
                        listId={listId}
                        spaceId={spaceId}
                        projectId={projectId}
                        teamId={teamId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "CALENDAR":
                return (
                    <CalendarView
                        listId={listId}
                        spaceId={spaceId}
                        projectId={projectId}
                        teamId={teamId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "GANTT":
                return (
                    <GanttView
                        listId={listId}
                        spaceId={spaceId}
                        projectId={projectId}
                        teamId={teamId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "TIMELINE":
                return (
                    <TimelineView
                        listId={listId}
                        spaceId={spaceId}
                        projectId={projectId}
                        teamId={teamId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "FORM":
                return (
                    <FormView
                        workspaceId={workspaceId}
                        listId={listId}
                        spaceId={spaceId}
                        projectId={projectId}
                        teamId={teamId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "PEOPLE":
                return (
                    <PeopleView
                        listId={listId}
                        spaceId={spaceId}
                        projectId={projectId}
                        teamId={teamId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "MIND_MAP":
                return (
                    <MindMapView
                        listId={listId}
                        spaceId={spaceId}
                        projectId={projectId}
                        teamId={teamId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "WORKLOAD":
                return (
                    <WorkloadView
                        listId={listId}
                        spaceId={spaceId}
                        projectId={projectId}
                        teamId={teamId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "WHITEBOARD":
                return (
                    <WhiteboardView
                        listId={listId}
                        spaceId={spaceId}
                        projectId={projectId}
                        teamId={teamId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "MAP":
                return (
                    <MapView
                        listId={listId}
                        spaceId={spaceId}
                        projectId={projectId}
                        teamId={teamId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "DASHBOARD":
                return (
                    <GenericDashboardView
                        listId={listId}
                        spaceId={spaceId}
                        projectId={projectId}
                        teamId={teamId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );

            // Embeds
            case "EMBED":
            case "SPREADSHEET":
            case "FILE":
            case "VIDEO":
            case "DESIGN":
            case "DOC":
            case "GOOGLE_CALENDAR":
            case "GOOGLE_DOCS":
            case "GOOGLE_MAPS":
            case "GOOGLE_SLIDES":
            case "GOOGLE_FORMS":
            case "GOOGLE_DRIVE":
                return (
                    <EmbedView
                        listId={listId}
                        spaceId={spaceId}
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
        return (
            <div className="flex items-center justify-center py-12 h-screen">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
                    <p className="text-sm text-muted-foreground">Loading project...</p>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex items-center justify-center py-12 h-screen">
                <p className="text-sm text-muted-foreground">Project not found</p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex h-full gap-1 flex-1 overflow-hidden">
                {layoutMode === "sidebar" && (
                    <ProjectNavigationSidebar
                        projectId={projectId}
                        activeView={(currentTab as any) || (activeView?.type?.toLowerCase() || 'overview') as any}
                        onViewChange={(viewId) => {
                            const params = new URLSearchParams(searchParams.toString());

                            if (viewId === "lists") {
                                params.set("tab", "lists");
                                router.push(`?${params.toString()}`, { scroll: false });
                                return;
                            }

                            const type = viewId.toUpperCase();
                            const targetView = views.find((v: any) => v.type === type);
                            if (targetView) {
                                params.set("tab", "views");
                                params.set("v", targetView.id);
                                router.push(`?${params.toString()}`, { scroll: false });
                            } else {
                                params.set("tab", viewId);
                                router.push(`?${params.toString()}`, { scroll: false });
                            }
                        }}
                        collapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
                    />
                )}

                <div className="flex-1 overflow-hidden w-full max-w-full h-full bg-slate-50 flex flex-col">
                    <div className="flex-1 overflow-hidden relative">
                        {isListsTab ? (
                            <ProjectListView
                                projectId={projectId}
                                workspaceId={workspaceId}
                                selectedListId={selectedListId || undefined}
                                onListSelect={handleListSelect}
                                selectedTaskIdFromParent={selectedTaskId}
                                onTaskSelect={handleTaskSelect}
                            />
                        ) : (
                            <ResizableSplitLayout
                                MainContent={
                                    <div className="flex h-full flex-col">
                                        <DashboardHeader
                                            entityName={project.name || "Untitled Project"}
                                            entityType="project"
                                            entityIcon={<FolderKanban className="h-4 w-4" />}
                                            shareUrl={`${window.location.origin}${window.location.pathname}?projectId=${projectId}`}
                                            showSettings={false}
                                            onAskAIClick={() => setIsAskAIOpen(!isAskAIOpen)}
                                            onShareClick={() => setIsShareModalOpen(true)}
                                            showExit={true}
                                            agentPopoverContent={
                                                <QuickAgentModal
                                                    contextId={projectId}
                                                    contextType="PROJECT"
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
                                                        <ProjectActionsMenu
                                                            workspaceId={workspaceId!}
                                                            projectId={projectId}
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

                                        {isViewsTab && activeView ? (
                                            <div className="flex-1 overflow-hidden relative">
                                                <Tabs value={activeTab || undefined} onValueChange={handleTabChange} className="h-full flex flex-col">
                                                    <div className="flex items-center gap-1 border-b border-slate-200 px-4 bg-white shrink-0 h-10 min-w-0 overflow-hidden">
                                                        <TabsList className="h-9 bg-transparent p-0 border-none flex-1 min-w-0 flex items-center overflow-hidden">
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
                                                                    utils.project.get.setData({ id: projectId }, (old: any) => old ? { ...old, views: newSortedViews } : old);
                                                                    reorderViewsMutation.mutate(newSortedViews.map((v: any, i: number) => ({ id: v.id, position: i * 1000 })));
                                                                }}
                                                                getIcon={(view) => {
                                                                    const viewType = view.type as ViewType;
                                                                    const config = viewConfig[viewType] || { icon: FileText };
                                                                    const Icon = config.icon;
                                                                    return <Icon className="h-full w-full" />;
                                                                }}
                                                                onTogglePin={(view) => updateViewMutation.mutate({ id: view.id, isPinned: !view.isPinned })}
                                                                renderMoreAction={(view) => (
                                                                    <Popover modal={false}>
                                                                        <PopoverTrigger asChild>
                                                                            <div role="button" className="h-6 w-6 p-0 flex items-center justify-center rounded hover:bg-slate-200" onClick={e => e.stopPropagation()}>
                                                                                <MoreHorizontal className="h-4 w-4 text-muted-foreground shrink-0 m-auto" />
                                                                            </div>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-56 p-1" sideOffset={8} side="right" align="start">
                                                                            <div className="flex flex-col">
                                                                                <div role="button" className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); setViewToRename({ id: view.id, name: view.name || "" }); }}>
                                                                                    <Edit className="h-4 w-4 shrink-0" /> Rename
                                                                                </div>
                                                                                <div role="button" className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); handleCopyViewLink(view); }}>
                                                                                    <Copy className="h-4 w-4 shrink-0" /> Copy link
                                                                                </div>
                                                                                <div role="button" className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); setViewToShare({ id: view.id, name: view.name || "" }); }}>
                                                                                    <Shield className="h-4 w-4 shrink-0" /> Permissions
                                                                                </div>
                                                                                <div className="h-px bg-slate-100 my-1 mx-2" />
                                                                                <div role="button" className="flex items-center justify-between px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); updateViewMutation.mutate({ id: view.id, isPinned: !view.isPinned }); }}>
                                                                                    <div className="flex items-center gap-2"><Pin className="h-4 w-4 shrink-0" /> Pin view</div>
                                                                                    <Switch checked={view.isPinned} />
                                                                                </div>
                                                                                <div role="button" className="flex items-center justify-between px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); updateViewMutation.mutate({ id: view.id, isPrivate: !view.isPrivate }); }}>
                                                                                    <div className="flex items-center gap-2"><EyeOff className="h-4 w-4 shrink-0" /> Private</div>
                                                                                    <Switch checked={view.isPrivate} />
                                                                                </div>
                                                                                <div role="button" className="flex items-center justify-between px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); updateViewMutation.mutate({ id: view.id, isDefault: !view.isDefault }); }}>
                                                                                    <div className="flex items-center gap-2"><Star className="h-4 w-4 shrink-0" /> Set default</div>
                                                                                    <Switch checked={view.isDefault} />
                                                                                </div>
                                                                                <div className="h-px bg-slate-100 my-1 mx-2" />
                                                                                <div role="button" className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); duplicateViewMutation.mutate({ name: `${view.name} (Copy)`, type: view.type, projectId, config: view.config || {} }); }}>
                                                                                    <CopyPlus className="h-4 w-4 shrink-0" /> Duplicate
                                                                                </div>
                                                                                <div role="button" className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); setViewToTemplate(view); }}>
                                                                                    <Save className="h-4 w-4 shrink-0" /> Save as template
                                                                                </div>
                                                                                <div className="h-px bg-slate-100 my-1 mx-2" />
                                                                                <div role="button" className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-red-50 hover:text-red-700 rounded-sm text-red-600 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); setViewToDelete({ id: view.id, name: view.name || "" }); }}>
                                                                                    <Trash2 className="h-4 w-4 shrink-0" /> Delete view
                                                                                </div>
                                                                            </div>
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                )}
                                                                renderDropdownItem={(view, trigger) => (
                                                                    <ContextMenu key={`dd-${view.id}`}>
                                                                        <ContextMenuTrigger asChild>
                                                                            {trigger}
                                                                        </ContextMenuTrigger>
                                                                        <ProjectViewContextMenu
                                                                            view={view}
                                                                            onRename={() => setViewToRename({ id: view.id, name: view.name || "" })}
                                                                            onDelete={() => setViewToDelete({ id: view.id, name: view.name || "" })}
                                                                            onShare={() => setViewToShare({ id: view.id, name: view.name || "" })}
                                                                            onPin={() => updateViewMutation.mutate({ id: view.id, isPinned: !view.isPinned })}
                                                                            onDuplicate={() => duplicateViewMutation.mutate({
                                                                                name: `${view.name} (Copy)`,
                                                                                type: view.type,
                                                                                projectId: projectId,
                                                                                config: view.config || {}
                                                                            })}
                                                                            onCopyLink={() => handleCopyViewLink(view)}
                                                                            onSaveAsTemplate={() => setViewToTemplate(view)}
                                                                        />
                                                                    </ContextMenu>
                                                                )}
                                                                renderTab={(view, isActive) => {
                                                                    const viewType = view.type as ViewType;
                                                                    const config = viewConfig[viewType] || { icon: FileText };
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
                                                                                                <span className="inline-block max-w-[120px] truncate align-bottom">{view.name || viewConfig[viewType]?.label || viewType}</span>
                                                                                                {view.isPinned && <Pin className="h-3 w-3 shrink-0 rotate-45 text-muted-foreground" />}
                                                                                                {view.isPrivate && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}
                                                                                                
                                                                                                {activeTab === view.id && (
                                                                                                    <div className="absolute left-0 right-0 h-0.5 bg-primary rounded-t-full" style={{ bottom: "-5px" }} />
                                                                                                )}
                                                                                            </div>
                                                                                        </TabsTrigger>
                                                                                    </TooltipTrigger>
                                                                                    <TooltipContent>{view.name || viewConfig[viewType]?.label || viewType}</TooltipContent>
                                                                                </Tooltip>
                                                                            </ContextMenuTrigger>
                                                                        <ProjectViewContextMenu
                                                                            view={view}
                                                                            onRename={() => setViewToRename({ id: view.id, name: view.name || "" })}
                                                                            onDelete={() => setViewToDelete({ id: view.id, name: view.name || "" })}
                                                                            onShare={() => setViewToShare({ id: view.id, name: view.name || "" })}
                                                                            onPin={() => updateViewMutation.mutate({ id: view.id, isPinned: !view.isPinned })}
                                                                            onDuplicate={() => duplicateViewMutation.mutate({
                                                                                name: `${view.name} (Copy)`,
                                                                                type: view.type,
                                                                                projectId: projectId,
                                                                                config: view.config || {}
                                                                            })}
                                                                            onCopyLink={() => handleCopyViewLink(view)}
                                                                            onSaveAsTemplate={() => setViewToTemplate(view)}
                                                                        />
                                                                    );
                                                                }}
                                                                renderMeasureTab={(view) => {
                                                                    const viewType = view.type as ViewType;
                                                                    const config = viewConfig[viewType] || { icon: FileText };
                                                                    const Icon = config.icon;
                                                                    return (
                                                                        <div className="flex items-center gap-1.5 h-10 px-3 py-2 text-sm whitespace-nowrap font-medium">
                                                                            <Icon className="h-4 w-4 shrink-0" />
                                                                            <span className="max-w-[120px] truncate">{view.name || viewConfig[viewType]?.label || viewType}</span>
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

                                                    <div className="relative min-h-0 flex-1 overflow-hidden">
                                                        {views.map(view => (
                                                            <TabsContent key={view.id} value={view.id} className="h-full min-h-0 m-0 p-0 focus-visible:outline-none data-[state=active]:block hidden">
                                                                {renderViewContent(view)}
                                                            </TabsContent>
                                                        ))}

                                                        {views.length === 0 && (
                                                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
                                                                <div className="h-12 w-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4 text-slate-400">
                                                                    <LayoutDashboard className="h-6 w-6" />
                                                                </div>
                                                                <p className="text-sm font-medium text-foreground">No views configured</p>
                                                                <p className="mt-1 text-xs text-muted-foreground max-w-xs mb-4">
                                                                    Create your first view to start organizing your project.
                                                                </p>
                                                                <Button variant="outline" size="sm" onClick={() => setAddViewModalOpen(true)}>
                                                                    <Plus className="h-4 w-4 mr-2" />
                                                                    Add View
                                                                </Button>
                                                            </div>
                                                        )}

                                                        <VerticalToolRail
                                                            onAddClick={openItemSidebar}
                                                            onSettingsClick={openSettingsSidebar}
                                                            className="right-0"
                                                        />
                                                        <ProjectItemSidebar projectId={projectId} workspaceId={workspaceId!} type={activeView?.type as any} open={itemSidebarOpen} onClose={() => setItemSidebarOpen(false)} inline />
                                                        <ProjectSettingsSidebar projectId={projectId} workspaceId={workspaceId!} open={settingsSidebarOpen} onClose={() => setSettingsSidebarOpen(false)} inline />
                                                    </div>
                                                </Tabs>
                                            </div>
                                        ) : (
                                            <div className="flex-1 overflow-y-auto p-4">
                                                {currentTab === "MEMBERS" ? (
                                                    <MembersView projectId={projectId} />
                                                ) : currentTab === "DISCUSSIONS" ? (
                                                    <DiscussionsView projectId={projectId} />
                                                ) : currentTab === "CHANNELS" ? (
                                                    <ChatView projectId={projectId} />
                                                ) : (
                                                    <ProjectOverviewTab projectId={projectId} />
                                                )}
                                            </div>
                                        )}
                                    </div>
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
                                                    contextType="PROJECT"
                                                    contextId={projectId}
                                                    contextName={project.name || "Project"}
                                                    hideSidebar={true}
                                                />
                                            </SidePanelContainer>
                                        )}
                                        {selectedTaskId && !isAskAIOpen && taskViewMode === 'sidebar' && (
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
                                isPanelOpen={isAskAIOpen || (!!selectedTaskId && taskViewMode === 'sidebar')}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Task Detail Modal / Fullscreen */}
            {selectedTaskId && taskViewMode !== 'sidebar' && (
                <Dialog open={true} onOpenChange={(open) => {
                    if (!open) {
                        const params = new URLSearchParams(searchParams.toString());
                        params.delete("task");
                        router.push(`?${params.toString()}`);
                    }
                }}>
                    <DialogContent className={cn(
                        "p-0 gap-0 overflow-hidden bg-white",
                        taskViewMode === 'fullscreen' ? "max-w-[95vw] w-[95vw] h-[95vh]" : "max-w-4xl w-full h-[85vh]"
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
                itemType="project"
                itemId={projectId}
                itemName={project.name || "Project"}
                workspaceId={workspaceId!}
            />

            <Dialog open={!!viewToRename} onOpenChange={(open) => !open && setViewToRename(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename View</DialogTitle>
                        <DialogDescription>Enter a new name for this view.</DialogDescription>
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

            <Dialog open={!!viewToDelete} onOpenChange={(open) => !open && setViewToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete View?</DialogTitle>
                        <DialogDescription>Are you sure you want to delete <strong>{viewToDelete?.name}</strong>? This action cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewToDelete(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => viewToDelete && handleDeleteView(viewToDelete.id)}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {viewToShare && (
                <ShareViewPermissionModal
                    viewId={viewToShare.id}
                    workspaceId={workspaceId as string}
                    open={!!viewToShare}
                    onOpenChange={(open) => !open && setViewToShare(null)}
                />
            )}

            {viewToTemplate && (
                <SaveTemplateModal
                    open={!!viewToTemplate}
                    onOpenChange={(open) => !open && setViewToTemplate(null)}
                    view={viewToTemplate}
                    workspaceId={project?.workspaceId || ""}
                />
            )}
        </div>
    );
}
