"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { buildCleanDashboardParams, parseDashboardState, buildDashboardPath } from "@/features/dashboard/utils/dashboardUrl";
import { trpc } from "@/lib/trpc";
import { DashboardLoadingState, DashboardErrorState } from "@/features/dashboard/components/shared/DashboardStates";
import ProjectNavigationSidebar, { type ProjectView } from "@/features/dashboard/layouts/project/ProjectNavigationSidebar";
import dynamic from "next/dynamic";
const ProjectOverviewTab = dynamic(() => import("@/features/dashboard/views/project/ProjectOverviewTab").then(mod => mod.ProjectOverviewTab));
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
const ProjectListView = dynamic(() => import("@/features/dashboard/views/project/ProjectListView"));
import { ShareModal } from "@/components/permissions/ShareModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ViewTabsOverflow } from "@/features/dashboard/components/shared/ViewTabsOverflow";
import { AddViewModal, ViewType } from "@/features/dashboard/components/modals/AddViewModal";
import { ViewContextMenu } from "@/features/dashboard/components/shared/ViewContextMenu";
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
import { ProjectHeaderBreadcrumbs } from "@/features/dashboard/components/shared/ProjectHeaderBreadcrumbs";
import { ResizableSplitLayout, SidePanelContainer } from "@/components/layout/ResizableSplitLayout";
import { AgentsPopover } from "@/features/automations/components/AgentsPopover";
import { AutomationsHubPopover } from "@/features/automations/components/AutomationsHubPopover";
import { DashboardAutomationOverlays } from "@/features/automations/components/DashboardAutomationOverlays";
import { AgentTabbedPanel } from "@/entities/agents/components/panels/AgentTabbedPanel";
import { useDashboardAutomations } from "@/features/automations/hooks/useDashboardAutomations";
import type { AutomationScope } from "@/features/automations/types";
import type { TaskLayoutMode } from "@/entities/task/components/TaskDetailModal";
import { TaskDetailModal, TaskDetailContent } from "@/entities/task/components/TaskDetailModal";
const ChatView = dynamic(() => import("@/features/dashboard/views/shared/ChatView"));
const AIChatView = dynamic(() => import("@/features/dashboard/views/shared/AIChatView").then(mod => mod.AIChatView));
const ProjectTeamView = dynamic(() => import("@/features/dashboard/views/project/ProjectTeamView"));
const ProjectPersonalView = dynamic(() => import("@/features/dashboard/views/project/ProjectPersonalView"));
const ProjectDocsView = dynamic(() => import("@/features/dashboard/views/project/ProjectDocsView"));
import { ProjectActionsMenu } from "@/features/dashboard/components/sidebar/ProjectActionsMenu";
import { VerticalToolRail } from "@/features/dashboard/components/shared/VerticalToolRail";
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
    Star,
    Table,
    Loader2
} from "lucide-react";
import { DashboardEntityProvider } from "@/features/dashboard/context/DashboardEntityContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LayoutMode = "sidebar" | "top";

interface ProjectDashboardViewProps {
    projectId?: string;
    selectedTaskIdFromParent?: string | null;
    onTaskSelect?: (taskId: string | null) => void;
}

const viewConfig: Partial<Record<
    ViewType,
    {
        label: string;
        icon: React.ComponentType<{ className?: string; size?: number }>;
        description: string;
    }
>> = {
    // Existing
    OVERVIEW: { label: "Overview", icon: LayoutDashboard, description: "Project overview" },

    // Generic / New
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

export default function ProjectDashboardView({ projectId, selectedTaskIdFromParent, onTaskSelect }: ProjectDashboardViewProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const utils = trpc.useUtils();

    const selectedTaskId = searchParams.get("task");
    const selectedListId = searchParams.get("list");
    const selectedFolderId = searchParams.get("folder");
    const selectedTeamId = searchParams.get("tm") || searchParams.get("team") || undefined;
    const selectedAIChatId = searchParams.get("aid") || undefined;
    const selectedChatId = searchParams.get("ch") || undefined;

    const clearSubParams = (params: URLSearchParams) => {
        [
            "v", "sid", "sp", "pj", "tm", "team", "ch", "ai", "aid", "nv", "docView", "list", "folder", "fv", "lt", "task", "taskId", "scope", "status", "page", "ptab", "ttab"
        ].forEach((p) => params.delete(p));
    };

    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [layoutMode, setLayoutMode] = useState<LayoutMode>("sidebar");

    // Item selection states
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    // Dialog states
    const [addViewModalOpen, setAddViewModalOpen] = useState(false);
    const [viewToRename, setViewToRename] = useState<{ id: string, name: string } | null>(null);
    const [viewToDelete, setViewToDelete] = useState<{ id: string, name: string } | null>(null);
    const [viewToShare, setViewToShare] = useState<{ id: string, name: string } | null>(null);
    const [viewToTemplate, setViewToTemplate] = useState<any | null>(null);
    const [isAskAIOpen, setIsAskAIOpen] = useState(false);
    const [taskViewMode, setTaskViewMode] = useState<TaskLayoutMode>("modal");
    const [itemSidebarOpen, setItemSidebarOpen] = useState(false);
    const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(false);

    const openItemSidebar = () => setItemSidebarOpen(true);
    const openSettingsSidebar = () => setSettingsSidebarOpen(true);

    // Fetch Data
    const { data: project, isLoading: isProjectLoading } = trpc.project.get.useQuery(
        { id: projectId ?? "" },
        { enabled: !!projectId, staleTime: 60_000, gcTime: 5 * 60_000 }
    );

    const isLoading = isProjectLoading;
    const resolvedWorkspaceId: string | undefined = project?.workspaceId ?? undefined;

    const automationScope = useMemo<AutomationScope | null>(() => {
        if (!projectId || !resolvedWorkspaceId) return null;
        return {
            workspaceId: resolvedWorkspaceId,
            projectId,
            spaceId: (project as any)?.spaceId || undefined,
            contextType: "PROJECT",
            contextId: projectId,
            contextName: project?.name || "Project",
        };
    }, [projectId, resolvedWorkspaceId, project]);
    const automations = useDashboardAutomations(automationScope);

    // Derive the most specific AI chat context from active selections
    const aiChatContext = useMemo(() => {
        if (selectedFolderId) return { contextType: "FOLDER" as const, contextId: selectedFolderId, contextName: "Folder" };
        if (selectedListId) return { contextType: "LIST" as const, contextId: selectedListId, contextName: "List" };
        if (selectedTeamId) return { contextType: "TEAM" as const, contextId: selectedTeamId, contextName: "Team" };
        return { contextType: "PROJECT" as const, contextId: projectId!, contextName: project?.name || "Project" };
    }, [selectedFolderId, selectedListId, selectedTeamId, projectId, project?.name]);

    // Refs for tracking multi-view creation so we redirect to the last created view
    const pendingViewCreatesRef = useRef(0);
    const lastCreatedViewIdRef = useRef<string | null>(null);

    // Mutations
    const createViewMutation = trpc.view.create.useMutation({
        onSuccess: (data) => {
            utils.project.get.invalidate({ id: projectId! });
            lastCreatedViewIdRef.current = (data as any)?.id ?? null;
            pendingViewCreatesRef.current = Math.max(0, pendingViewCreatesRef.current - 1);
            if (pendingViewCreatesRef.current === 0 && lastCreatedViewIdRef.current) {
                const params = new URLSearchParams(window.location.search);
                if (!params.get("tab")) params.set("tab", "overview");
                params.set("v", lastCreatedViewIdRef.current);
                router.push(`?${params.toString()}`, { scroll: false });
            }
            toast.success("View added");
        },
        onError: (err) => {
            pendingViewCreatesRef.current = Math.max(0, pendingViewCreatesRef.current - 1);
            toast.error(`Failed to add view: ${err.message}`);
        }
    });

    const deleteViewMutation = trpc.view.delete.useMutation({
        onSuccess: () => {
            utils.project.get.invalidate({ id: projectId! });
            toast.success("View deleted");
        },
        onError: (err) => toast.error(`Failed to delete view: ${err.message}`)
    });

    const updateViewMutation = trpc.view.update.useMutation({
        onSuccess: () => {
            utils.project.get.invalidate({ id: projectId! });
        },
        onError: (err) => toast.error(`Failed to update view: ${err.message}`)
    });

    const createFromTemplateMutation = trpc.view.createFromTemplate.useMutation({
        onSuccess: (data) => {
            utils.project.get.invalidate({ id: projectId! });
            const newId = (data as any)?.id ?? null;
            if (newId) {
                const params = new URLSearchParams(window.location.search);
                if (!params.get("tab")) params.set("tab", "overview");
                params.set("v", newId);
                router.push(`?${params.toString()}`, { scroll: false });
            }
            toast.success("View created from template");
        },
        onError: (err) => toast.error(`Failed to create view: ${err.message}`)
    });

    const reorderViewsMutation = trpc.view.reorder.useMutation({
        onSuccess: () => utils.project.get.invalidate({ id: projectId! }),
        onError: (err) => toast.error(`Failed to reorder views: ${err.message}`)
    });

    const duplicateViewMutation = trpc.view.create.useMutation({
        onSuccess: () => {
            utils.project.get.invalidate({ id: projectId! });
            toast.success("View duplicated");
        },
        onError: (err) => toast.error(`Failed to duplicate view: ${err.message}`)
    });

    // Derived views from DB - only show views with sidebarView false
    const views = useMemo(() => {
        if (!project?.views || project.views.length === 0) {
            return [];
        }
        const nonSidebarViews = project.views.filter((v: any) => !v.sidebarView);
        return [...nonSidebarViews].sort((a: any, b: any) => {
            if (a.type === "OVERVIEW") return -1;
            if (b.type === "OVERVIEW") return 1;
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            return a.position - b.position;
        });
    }, [project?.views]);

    // Check tabs
    const parsedState = useMemo(() => parseDashboardState(searchParams), [searchParams]);
    const currentTab = parsedState.tab;
    const isViewsTab = currentTab === "overview" || !currentTab;
    const isListsTab = currentTab === "lists" || !!selectedListId;

    // Active Tab Logic
    const urlTabId = parsedState.viewId;
    const activeView = views.find((v: any) => v.id === urlTabId) || views[0];
    const activeTab = activeView?.id;

    const handleTabChange = useCallback((viewId: string) => {
        if (projectId) {
            router.push(buildDashboardPath({ basePath: `/dashboard/projects/${projectId}`, viewId, taskId: parsedState.taskId }), { scroll: false });
        } else {
            const clean = buildCleanDashboardParams(searchParams, {
                tab: "overview",
                viewId,
                keepTask: true,
            });
            router.push(`?${clean.toString()}`, { scroll: false });
        }
    }, [projectId, searchParams, router, parsedState.taskId]);

    const handleRenameView = (name: string) => {
        if (viewToRename) {
            const viewId = viewToRename.id;
            const trimmed = name.trim();
            const patchViews = (views: any[]) => views.map((v: any) => v.id === viewId ? { ...v, name: trimmed } : v);

            utils.project.get.setData({ id: projectId! }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);

            updateViewMutation.mutate({
                id: viewId,
                name: trimmed
            });
            setViewToRename(null);
        }
    };

    const handleCopyViewLink = (view: any) => {
        const url = `${window.location.origin}/dashboard/projects/${projectId}/v/${view.id}`;
        navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
    };

    const handleAddViews = (selectedTypes: ViewType[]) => {
        if (selectedTypes.length === 0) return;
        pendingViewCreatesRef.current = selectedTypes.length;
        lastCreatedViewIdRef.current = null;
        selectedTypes.forEach(type => {
            const config = viewConfig[type];
            createViewMutation.mutate({
                name: config?.label || type,
                type: type as any,
                projectId: projectId!
            });
        });
    };

    const handleAddFromTemplate = (templateId: string) => {
        createFromTemplateMutation.mutate({
            templateId,
            projectId: projectId!
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
        const clean = buildCleanDashboardParams(searchParams, {
            tab: "lists",
            entityKey: "list",
            entityId: listId,
            keepTask: true,
        });
        router.push(`?${clean.toString()}`, { scroll: false });
    }, [searchParams, router]);

    const handleTeamSelect = useCallback((teamId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        clearSubParams(params);
        params.set("tab", "teams");
        if (teamId) params.set("tm", teamId);
        router.push(`?${params.toString()}`, { scroll: false });
    }, [searchParams, router]);

    const togglePin = (view: any) => updateViewMutation.mutate({ id: view.id, isPinned: !view.isPinned });
    const togglePrivate = (view: any) => updateViewMutation.mutate({ id: view.id, isPrivate: !view.isPrivate });
    const toggleLock = (view: any) => updateViewMutation.mutate({ id: view.id, isLocked: !view.isLocked });
    const toggleDefault = (view: any) => updateViewMutation.mutate({ id: view.id, isDefault: !view.isDefault });


    useEffect(() => {
        if (isViewsTab && !urlTabId && views.length > 0) {
            if (projectId) {
                history.replaceState(null, "", buildDashboardPath({ basePath: `/dashboard/projects/${projectId}`, viewId: views[0].id, taskId: parsedState.taskId }));
            } else {
                const clean = buildCleanDashboardParams(searchParams, {
                    tab: "overview",
                    viewId: views[0].id,
                    keepTask: true,
                });
                history.replaceState(null, "", `?${clean.toString()}`);
            }
        }
    }, [urlTabId, views, isViewsTab, projectId, parsedState.taskId, searchParams]);

    const renderViewContent = (view: any) => {
        if (!view || !project) return null;
        const viewType = view.type as ViewType;

        switch (viewType) {
            case "OVERVIEW":
                return <ProjectOverviewTab project={project} />;
            // Generic Vews
            case "TASKS":
            case "LIST":
                return (
                    <ListView
                        context="project"
                        workspaceId={resolvedWorkspaceId}
                        projectId={projectId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "BOARD":
                return (
                    <BoardView
                        context="project"
                        workspaceId={resolvedWorkspaceId}
                        projectId={projectId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "TABLE":
                return (
                    <TableView
                        context="project"
                        workspaceId={resolvedWorkspaceId}
                        projectId={projectId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "CALENDAR":
                return (
                    <CalendarView
                        context="project"
                        workspaceId={resolvedWorkspaceId}
                        projectId={projectId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "GANTT":
                return (
                    <GanttView
                        context="project"
                        workspaceId={resolvedWorkspaceId}
                        projectId={projectId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "TIMELINE":
                return (
                    <TimelineView
                        context="project"
                        workspaceId={resolvedWorkspaceId}
                        projectId={projectId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "FORM":
                return (
                    <FormView
                        context="project"
                        workspaceId={resolvedWorkspaceId}
                        projectId={projectId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "PEOPLE":
                return (
                    <PeopleView
                        context="project"
                        workspaceId={resolvedWorkspaceId}
                        projectId={projectId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "ACTIVITY":
                return (
                    <ActivityView
                        context="project"
                        workspaceId={resolvedWorkspaceId}
                        projectId={projectId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "MIND_MAP":
                return (
                    <MindMapView
                        context="project"
                        workspaceId={resolvedWorkspaceId}
                        projectId={projectId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "WORKLOAD":
                return (
                    <WorkloadView
                        context="project"
                        workspaceId={resolvedWorkspaceId}
                        projectId={projectId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "WHITEBOARD":
                return (
                    <WhiteboardView
                        context="project"
                        workspaceId={resolvedWorkspaceId}
                        projectId={projectId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "MAP":
                return (
                    <MapView
                        context="project"
                        workspaceId={resolvedWorkspaceId}
                        projectId={projectId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "DASHBOARD":
                return (
                    <GenericDashboardView
                        context="project"
                        workspaceId={resolvedWorkspaceId}
                        projectId={projectId}
                        viewId={view.id}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );

            case "DOC":
                return (
                    <DocView
                        context="project"
                        workspaceId={resolvedWorkspaceId}
                        projectId={projectId}
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
            case "GOOGLE_CALENDAR":
            case "GOOGLE_DOCS":
            case "GOOGLE_MAPS":
            case "GOOGLE_SLIDES":
            case "GOOGLE_FORMS":
            case "GOOGLE_DRIVE":
                return (
                    <EmbedView
                        context="project"
                        workspaceId={resolvedWorkspaceId}
                        projectId={projectId}
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
        return <DashboardLoadingState message="Loading project..." />;
    }

    if (!project) {
        return <DashboardErrorState title="Project not found" message="We couldn't find the project you're looking for." />;
    }

    return (
        <DashboardEntityProvider
            workspaceId={resolvedWorkspaceId}
            projectId={projectId}
        >
            <div className="flex h-full flex-col">
                <div className="flex h-full gap-1 flex-1 overflow-hidden">
                    {layoutMode === "sidebar" && (
                        <ProjectNavigationSidebar
                            projectId={projectId!}
                            activeView={(currentTab as any) || (activeView?.type?.toLowerCase() || 'overview') as any}
                            onViewChange={(viewId) => {
                                const targetTab = (viewId as string) === "team" ? "teams" : viewId;

                                if (targetTab === "overview") {
                                    const clean = buildCleanDashboardParams(searchParams, {
                                        tab: "overview",
                                        viewId: views.length > 0 ? views[0].id : null,
                                        keepTask: true,
                                    });
                                    router.push(`?${clean.toString()}`, { scroll: false });
                                    return;
                                }

                                const entityKey = targetTab === "teams" ? "tm" : undefined;
                                const entityId = targetTab === "teams" && (project as any)?.teams?.length > 0
                                    ? (project as any).teams[0].id
                                    : null;

                                const clean = buildCleanDashboardParams(searchParams, {
                                    tab: targetTab,
                                    entityKey,
                                    entityId,
                                    keepTask: true,
                                });
                                router.push(`?${clean.toString()}`, { scroll: false });
                            }}
                            collapsed={sidebarCollapsed}
                            onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
                        />
                    )}

                    <div className="flex-1 overflow-hidden w-full max-w-full h-full bg-slate-50 flex flex-col">
                        <DashboardHeader
                            entityName={project.name || "Untitled Project"}
                            entityType="project"
                            entityIcon={<FolderKanban className="h-4 w-4" />}
                            breadcrumbs={
                                <ProjectHeaderBreadcrumbs
                                    workspaceId={resolvedWorkspaceId!}
                                    projectId={projectId!}
                                    projectName={project.name || "Untitled Project"}
                                    currentTab={currentTab ?? ""}
                                    selectedTeamId={selectedTeamId || undefined}
                                    selectedListId={selectedListId || undefined}
                                    selectedFolderId={selectedFolderId || undefined}
                                    selectedChatId={selectedChatId || undefined}
                                    selectedAiChatId={selectedAIChatId || undefined}
                                    onSelectTeam={(id) => {
                                        const params = new URLSearchParams(searchParams.toString());
                                        clearSubParams(params);
                                        params.set("tab", "teams");
                                        params.set("tm", id);
                                        router.push(`?${params.toString()}`, { scroll: false });
                                    }}
                                    onSelectList={(id) => {
                                        const params = new URLSearchParams(searchParams.toString());
                                        clearSubParams(params);
                                        params.set("tab", "lists");
                                        params.set("list", id);
                                        router.push(`?${params.toString()}`, { scroll: false });
                                    }}
                                    onSelectFolder={(id) => {
                                        const params = new URLSearchParams(searchParams.toString());
                                        clearSubParams(params);
                                        params.set("tab", "lists");
                                        params.set("folder", id);
                                        router.push(`?${params.toString()}`, { scroll: false });
                                    }}
                                    onSelectChat={(id) => {
                                        const params = new URLSearchParams(searchParams.toString());
                                        clearSubParams(params);
                                        params.set("tab", "chats");
                                        params.set("ch", id);
                                        router.push(`?${params.toString()}`, { scroll: false });
                                    }}
                                    onSelectAiChat={(id) => {
                                        const params = new URLSearchParams(searchParams.toString());
                                        clearSubParams(params);
                                        params.set("tab", "ai-chat");
                                        params.set("aid", id);
                                        router.push(`?${params.toString()}`, { scroll: false });
                                    }}
                                    onNavigateProject={() => {
                                        const params = new URLSearchParams(searchParams.toString());
                                        clearSubParams(params);
                                        params.set("tab", "overview");
                                        if (views.length > 0) params.set("v", views[0].id);
                                        router.push(`?${params.toString()}`, { scroll: false });
                                    }}
                                />
                            }
                            shareUrl={`${window.location.origin}${window.location.pathname}?projectId=${projectId}`}
                            showSettings={false}
                            workspaceId={resolvedWorkspaceId || project.workspaceId || undefined}
                            spaceId={project.spaceId || undefined}
                            projectId={projectId}
                            teamId={selectedTeamId || undefined}
                            currentScope="project"
                            askAIDisabled={currentTab === "ai-chat"}
                            onAskAIClick={() => {
                                automations.closeAgentPanel();
                                setIsAskAIOpen(!isAskAIOpen);
                            }}
                            onShareClick={() => setIsShareModalOpen(true)}
                            showExit={true}
                            agentPopoverContent={automationScope ? (
                                <AgentsPopover
                                    scope={automationScope}
                                    onOpenAgentPanel={(req) => {
                                        setIsAskAIOpen(false);
                                        automations.openAgentPanel(req);
                                    }}
                                />
                            ) : undefined}
                            agentOpen={automations.agentOpen}
                            onAgentOpenChange={automations.setAgentOpen}
                            automationsPopoverContent={automationScope ? (
                                <AutomationsHubPopover
                                    scope={automationScope}
                                    onManage={automations.openManage}
                                    onCreate={(mode) => automations.openBuilder(mode)}
                                />
                            ) : undefined}
                            automationsOpen={automations.hubOpen}
                            onAutomationsOpenChange={automations.setHubOpen}
                            leftActions={[
                                {
                                    id: "settings",
                                    label: "Settings",
                                    icon: Settings,
                                    onClick: () => { },
                                    render: () => (
                                        <ProjectActionsMenu
                                            workspaceId={resolvedWorkspaceId!}
                                            projectId={projectId!}
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
                                    <>
                                        {selectedTaskId && taskViewMode === 'fullscreen' ? (
                                            <div className="h-full bg-white flex flex-col">
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
                                        ) : isListsTab ? (
                                            <ProjectListView
                                                projectId={projectId!}
                                                workspaceId={resolvedWorkspaceId}
                                                selectedListId={selectedListId || undefined}
                                                onListSelect={handleListSelect}
                                                selectedTaskIdFromParent={selectedTaskId ?? undefined}
                                                onTaskSelect={handleTaskSelect}
                                            />
                                        ) : isViewsTab && activeView ? (
                                            <div className="flex-1 overflow-hidden relative">
                                                <Tabs value={activeTab || undefined} onValueChange={handleTabChange} className="h-full flex flex-col gap-0">
                                                    <div className="border-b border-slate-200 bg-white px-4 py-2 h-[57px] flex items-center shrink-0">
                                                        <div className="flex items-center gap-1 min-w-0 overflow-visible w-full">
                                                            <TabsList className="h-10 bg-transparent p-0 flex-1 min-w-0 flex items-center overflow-visible transition-all duration-200">
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
                                                                        utils.project.get.setData({ id: projectId! }, (old: any) => old ? { ...old, views: newSortedViews } : old);
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
                                                                                    <div role="button" className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); duplicateViewMutation.mutate({ name: `${view.name} (Copy)`, type: view.type as any, projectId, config: view.config || {} }); }}>
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
                                                                            <ViewContextMenu
                                                                                view={view}
                                                                                onRename={() => setViewToRename({ id: view.id, name: view.name || "" })}
                                                                                onDelete={() => setViewToDelete({ id: view.id, name: view.name || "" })}
                                                                                onShare={() => setViewToShare({ id: view.id, name: view.name || "" })}
                                                                                onTogglePin={() => updateViewMutation.mutate({ id: view.id, isPinned: !view.isPinned })}
                                                                                onTogglePrivate={() => updateViewMutation.mutate({ id: view.id, isPrivate: !view.isPrivate })}
                                                                                onToggleLock={() => updateViewMutation.mutate({ id: view.id, isLocked: !view.isLocked })}
                                                                                onToggleDefault={() => updateViewMutation.mutate({ id: view.id, isDefault: !view.isDefault })}
                                                                                onDuplicate={() => duplicateViewMutation.mutate({
                                                                                    name: `${view.name} (Copy)`,
                                                                                    type: view.type as any,
                                                                                    projectId: projectId,
                                                                                    config: view.config || {}
                                                                                })}
                                                                                onCopyLink={() => handleCopyViewLink(view)}
                                                                                onSaveTemplate={() => setViewToTemplate(view)}
                                                                            />
                                                                        </ContextMenu>
                                                                    )}
                                                                    renderTab={(view, isActive) => {
                                                                        const viewType = view.type as ViewType;
                                                                        const config = viewConfig[viewType] || { icon: FileText };
                                                                        const Icon = config.icon;
                                                                        return (
                                                                            <Tooltip key={view.id}>
                                                                                <ContextMenu>
                                                                                    <ContextMenuTrigger asChild>
                                                                                        <TooltipTrigger asChild>
                                                                                            <TabsTrigger value={view.id} asChild>
                                                                                                <div className={cn(
                                                                                                    "group relative flex items-center gap-1.5 h-10 px-3 py-2 text-sm cursor-pointer whitespace-nowrap transition-colors rounded-md",
                                                                                                    activeTab === view.id
                                                                                                        ? "text-primary font-medium"
                                                                                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
                                                                                    </ContextMenuTrigger>
                                                                                    <ViewContextMenu
                                                                                        view={view}
                                                                                        onRename={() => setViewToRename({ id: view.id, name: view.name || "" })}
                                                                                        onDelete={() => setViewToDelete({ id: view.id, name: view.name || "" })}
                                                                                        onShare={() => setViewToShare({ id: view.id, name: view.name || "" })}
                                                                                        onTogglePin={() => updateViewMutation.mutate({ id: view.id, isPinned: !view.isPinned })}
                                                                                        onTogglePrivate={() => updateViewMutation.mutate({ id: view.id, isPrivate: !view.isPrivate })}
                                                                                        onToggleLock={() => updateViewMutation.mutate({ id: view.id, isLocked: !view.isLocked })}
                                                                                        onToggleDefault={() => updateViewMutation.mutate({ id: view.id, isDefault: !view.isDefault })}
                                                                                        onDuplicate={() => duplicateViewMutation.mutate({
                                                                                            name: `${view.name} (Copy)`,
                                                                                            type: view.type as any,
                                                                                            projectId: projectId,
                                                                                            config: view.config || {}
                                                                                        })}
                                                                                        onCopyLink={() => handleCopyViewLink(view)}
                                                                                        onSaveTemplate={() => setViewToTemplate(view)}
                                                                                    />
                                                                                </ContextMenu>
                                                                                <TooltipContent>{view.name || viewConfig[viewType]?.label || viewType}</TooltipContent>
                                                                            </Tooltip>
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
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => setAddViewModalOpen(true)}
                                                                        className="h-8 px-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                                                                    >
                                                                        <Plus className="h-4 w-4 mr-1" />
                                                                        View
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top">
                                                                    <p className="text-xs">Add view</p>
                                                                </TooltipContent>
                                                            </Tooltip>
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
                                                                    Your project is currently a blank canvas. Add a view to start visualizing your data, tracking tasks, and organizing your workflow.
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
                                            </div>
                                        ) : (currentTab === "docs" || currentTab === "doc") ? (
                                            <ProjectDocsView projectId={projectId!} />
                                        ) : currentTab === "personal" ? (
                                            <ProjectPersonalView projectId={projectId!} workspaceId={resolvedWorkspaceId!} />
                                        ) : (currentTab === "teams" || currentTab === "team") ? (
                                            <ProjectTeamView
                                                projectId={projectId!}
                                                workspaceId={resolvedWorkspaceId!}
                                                selectedTeamId={selectedTeamId}
                                                onTeamSelect={handleTeamSelect}
                                            />
                                        ) : (currentTab === "chats" || currentTab === "chat") ? (
                                            <ChatView
                                                workspaceId={resolvedWorkspaceId!}
                                                projectId={projectId!}
                                                selectedChatId={selectedChatId}
                                                onChatSelect={(id) => {
                                                    const params = new URLSearchParams(searchParams.toString());
                                                    clearSubParams(params);
                                                    params.set("tab", "chats");
                                                    params.set("ch", id);
                                                    router.push(`?${params.toString()}`, { scroll: false });
                                                }}
                                            />
                                        ) : currentTab === "ai-chat" ? (
                                            <AIChatView
                                                contextType={aiChatContext.contextType}
                                                contextId={aiChatContext.contextId}
                                                contextName={aiChatContext.contextName}
                                                chatId={selectedAIChatId}
                                                onChatIdChange={(id) => {
                                                    const params = new URLSearchParams(searchParams.toString());
                                                    if (id) params.set("aid", id);
                                                    else params.delete("aid");
                                                    router.push(`?${params.toString()}`, { scroll: false });
                                                }}
                                            />
                                        ) : (
                                            <div className="flex-1 overflow-y-auto p-4">
                                                <ProjectOverviewTab project={project} />
                                            </div>
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
                                                <AIChatView
                                                    contextType={aiChatContext.contextType}
                                                    contextId={aiChatContext.contextId}
                                                    contextName={aiChatContext.contextName}
                                                    chatId={selectedAIChatId}
                                                    onChatIdChange={(id) => {
                                                        const params = new URLSearchParams(searchParams.toString());
                                                        if (id) params.set("aid", id);
                                                        else params.delete("aid");
                                                        router.push(`?${params.toString()}`, { scroll: false });
                                                    }}
                                                    hideSidebar
                                                />
                                            </SidePanelContainer>
                                        )}
                                        {automations.agentPanel && !isAskAIOpen && (
                                            <AgentTabbedPanel
                                                request={automations.agentPanel}
                                                onClose={automations.closeAgentPanel}
                                            />
                                        )}
                                        {selectedTaskId && !isAskAIOpen && !automations.agentPanel && taskViewMode === 'sidebar' && (
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
                                isPanelOpen={isAskAIOpen || !!automations.agentPanel || (!!selectedTaskId && taskViewMode === 'sidebar' && !automations.agentPanel)}
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
                    workspaceId={resolvedWorkspaceId!}
                />

                <DashboardAutomationOverlays
                    scope={automationScope}
                    manageOpen={automations.manageOpen}
                    onManageOpenChange={automations.setManageOpen}
                    builderRequest={automations.builderRequest}
                    onBuilderRequestHandled={automations.clearBuilderRequest}
                    onAskBrain={() => {
                        automations.closeAgentPanel();
                        setIsAskAIOpen(true);
                    }}
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

                {viewToShare && (
                    <ShareViewPermissionModal
                        viewId={viewToShare.id}
                        workspaceId={resolvedWorkspaceId as string}
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
        </DashboardEntityProvider>
    );
}
