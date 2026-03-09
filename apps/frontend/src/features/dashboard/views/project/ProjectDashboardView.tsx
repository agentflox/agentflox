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
import ProjectListView from "@/features/dashboard/views/project/ProjectListView";
import { ShareModal } from "@/components/permissions/ShareModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
    Settings
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

    // Embeds
    EMBED: { label: "Embed", icon: LinkIcon, description: "Embed view" },
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
                return <ListView projectId={projectId} selectedTaskIdFromParent={selectedTaskId} onTaskSelect={handleTaskSelect} />;
            case "BOARD":
                return <BoardView projectId={projectId} />;
            case "TABLE":
                return <TableView projectId={projectId} viewId={view.id} initialConfig={view.config} />;
            case "CALENDAR":
                return <CalendarView projectId={projectId} />;
            case "GANTT":
                return <GanttView projectId={projectId} />;
            case "TIMELINE":
                return <TimelineView projectId={projectId} viewId={view.id} initialConfig={view.config} />;
            case "FORM":
                return <FormView projectId={projectId} viewId={view.id} initialConfig={view.config} />;
            case "MIND_MAP":
                return <MindMapView projectId={projectId} viewId={view.id} initialConfig={view.config} />;
            case "WORKLOAD":
                return <WorkloadView projectId={projectId} viewId={view.id} initialConfig={view.config} />;
            case "WHITEBOARD":
                return <WhiteboardView projectId={projectId} viewId={view.id} initialConfig={view.config} />;
            case "MAP":
                return <MapView projectId={projectId} viewId={view.id} initialConfig={view.config} />;
            case "DASHBOARD":
                return <GenericDashboardView projectId={projectId} viewId={view.id} initialConfig={view.config} />;

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
                                                    <div className="flex items-center justify-between border-b border-slate-200 px-4 bg-white shrink-0 h-10">
                                                        <TabsList className="h-9 bg-transparent p-0 gap-1 border-none justify-start overflow-x-auto no-scrollbar max-w-[calc(100vw-400px)]">
                                                            {views.map(view => (
                                                                <ContextMenu key={view.id}>
                                                                    <ContextMenuTrigger>
                                                                        <TabsTrigger
                                                                            value={view.id}
                                                                            className={cn(
                                                                                "h-9 px-3 text-xs font-medium transition-all duration-200",
                                                                                "data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary",
                                                                                "hover:bg-slate-50 hover:text-slate-900 border-none rounded-none"
                                                                            )}
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                {view.isPinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                                                                                {view.isPrivate && <Lock className="h-3 w-3 text-slate-400 shrink-0" />}
                                                                                <span className="truncate max-w-[120px]">{view.name || viewConfig[view.type as ViewType]?.label || view.type}</span>
                                                                            </div>
                                                                        </TabsTrigger>
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
                                                            ))}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 rounded-md hover:bg-slate-100 shrink-0 self-center"
                                                                onClick={() => setAddViewModalOpen(true)}
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                        </TabsList>
                                                    </div>

                                                    <div className="flex-1 overflow-hidden relative">
                                                        {views.map(view => (
                                                            <TabsContent key={view.id} value={view.id} className="h-full m-0 p-0 focus-visible:outline-none data-[state=active]:block hidden">
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
