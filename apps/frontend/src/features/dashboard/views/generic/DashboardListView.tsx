"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
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
import {
    FileText,
    Pin,
    Lock,
    Plus,
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
    ClipboardList,
    BarChart3,
    LayoutDashboard,
    MoreHorizontal,
    Edit,
    Copy,
    Shield,
    EyeOff,
    Star,
    CopyPlus,
    Save,
    Table,
    Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DashboardEntityProvider } from "@/features/dashboard/context/DashboardEntityContext";

interface DashboardListViewProps {
    listId: string;
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    workspaceId?: string;
    viewId?: string;
    selectedTaskIdFromParent?: string | null;
    onTaskSelect?: (taskId: string | null) => void;
    context?: "workspace" | "space" | "project" | "team" | "folder" | "list";
}

const viewConfig: Record<
    ViewType,
    {
        label: string;
        icon: React.ComponentType<{ className?: string; size?: number }>;
        description: string;
    }
> = {
    LIST: { label: "List", icon: ListIcon, description: "List view" },
    BOARD: { label: "Board", icon: Kanban, description: "Kanban board" },
    TABLE: { label: "Table", icon: Table, description: "Table view" },
    CALENDAR: { label: "Calendar", icon: Calendar, description: "Calendar view" },
    GANTT: { label: "Gantt", icon: Network, description: "Gantt chart" },
    TIMELINE: { label: "Timeline", icon: Clock, description: "Timeline view" },
    WORKLOAD: { label: "Workload", icon: BarChart3, description: "Workload view" },
    WHITEBOARD: { label: "Whiteboard", icon: PenTool, description: "Whiteboard" },
    MIND_MAP: { label: "Mind Map", icon: Network, description: "Mind map" },
    MAP: { label: "Map", icon: Map, description: "Map view" },
    DASHBOARD: { label: "Dashboard", icon: LayoutDashboard, description: "Dashboard" },
    FORM: { label: "Form", icon: LayoutDashboard, description: "Form" },
    PEOPLE: { label: "People", icon: LayoutDashboard, description: "People" },
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
    DOC: { label: "Doc", icon: FileText, description: "Document" },

    // Fallbacks
    OVERVIEW: { label: "Overview", icon: LayoutDashboard, description: "Overview" },
    PROJECTS: { label: "Projects", icon: LayoutDashboard, description: "Projects" },
    TEAMS: { label: "Teams", icon: LayoutDashboard, description: "Teams" },
    DOCS: { label: "Docs", icon: FileText, description: "Docs" },
    TASKS: { label: "Tasks", icon: ClipboardList, description: "Tasks" },
    CHANNELS: { label: "Channels", icon: LayoutDashboard, description: "Channels" },
    PROPOSALS: { label: "Proposals", icon: FileText, description: "Proposals" },
    TOOLS: { label: "Tools", icon: LayoutDashboard, description: "Tools" },
    MATERIALS: { label: "Materials", icon: LayoutDashboard, description: "Materials" },
    ACTIVITY: { label: "Activity", icon: LayoutDashboard, description: "Activity" },
    POSTS: { label: "Posts", icon: LayoutDashboard, description: "Posts" },
    DISCUSSIONS: { label: "Discussions", icon: LayoutDashboard, description: "Discussions" },
    VIEWS: { label: "Views", icon: LayoutDashboard, description: "Views" },
    LOGS: { label: "Logs", icon: FileText, description: "Logs" },
    APPEAL: { label: "Appeal", icon: FileText, description: "Appeal" },
    GOVERNANCE: { label: "Governance", icon: FileText, description: "Governance" },
    ANALYTICS: { label: "Analytics", icon: BarChart3, description: "Analytics" },
    WAR_ROOM: { label: "War Room", icon: LayoutDashboard, description: "War Room" },
    MARKETPLACE: { label: "Marketplace", icon: LayoutDashboard, description: "Marketplace" },
    MEMBERS: { label: "Members", icon: LayoutDashboard, description: "Members" },
};

export default function DashboardListView({ listId, spaceId, projectId, teamId, workspaceId, selectedTaskIdFromParent, onTaskSelect, context = "list" }: DashboardListViewProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const utils = trpc.useUtils();

    // Dialog states
    const [addViewModalOpen, setAddViewModalOpen] = useState(false);
    const [viewToRename, setViewToRename] = useState<{ id: string, name: string } | null>(null);
    const [viewToDelete, setViewToDelete] = useState<{ id: string, name: string } | null>(null);
    const [viewToShare, setViewToShare] = useState<{ id: string, name: string } | null>(null);
    const [viewToTemplate, setViewToTemplate] = useState<any | null>(null);

    // Fetch list data with views
    const { data: listsData } = trpc.list.byContext.useQuery(
        { spaceId, projectId, teamId, workspaceId },
        { enabled: !!(spaceId || projectId || teamId || workspaceId), staleTime: 60_000, gcTime: 5 * 60_000 }
    );

    const { data: listData } = trpc.list.get.useQuery({ id: listId }, { enabled: !!listId, staleTime: 60_000, gcTime: 5 * 60_000 });

    const listFromContext = listsData?.items?.find((l: any) => l.id === listId);
    // `list.get` can return a shape without populated `views`; merge with context list
    // so tabs still render when views are available from `list.byContext`.
    const list = useMemo(() => {
        if (!listData) return listFromContext;
        if (Array.isArray((listData as any).views)) return listData;
        if (!listFromContext) return listData;
        return {
            ...listFromContext,
            ...listData,
            views: (listFromContext as any).views ?? [],
        } as any;
    }, [listData, listFromContext]);
    const effectiveWorkspaceId = workspaceId || (list as any)?.workspaceId;
    const views = useMemo(() => {
        if (!list?.views) return [];
        return [...list.views].sort((a: any, b: any) => {
            if (a.isPinned !== b.isPinned) {
                return a.isPinned ? -1 : 1;
            }
            return a.position - b.position;
        });
    }, [list?.views]);

    // Mutations
    const createViewMutation = trpc.view.create.useMutation({
        onSuccess: async () => {
            await utils.list.byContext.invalidate();
            await utils.list.get.invalidate({ id: listId });
        },
        onError: (err) => toast.error(`Failed to add view: ${err.message}`)
    });

    const deleteViewMutation = trpc.view.delete.useMutation({
        onSuccess: async () => {
            await utils.list.byContext.invalidate();
            await utils.list.get.invalidate({ id: listId });
            toast.success("View deleted");
        },
        onError: (err) => toast.error(`Failed to delete view: ${err.message}`)
    });

    const updateViewMutation = trpc.view.update.useMutation({
        onSuccess: async () => {
            await utils.list.byContext.invalidate();
            await utils.list.get.invalidate({ id: listId });
        },
        onError: (err) => toast.error(`Failed to update view: ${err.message}`)
    });

    const reorderViewsMutation = trpc.view.reorder.useMutation({
        onSuccess: async () => {
            await utils.list.byContext.invalidate();
            await utils.list.get.invalidate({ id: listId });
        },
        onError: (err) => toast.error(`Failed to reorder views: ${err.message}`)
    });

    const createFromTemplateMutation = trpc.view.createFromTemplate.useMutation({
        onSuccess: async (data) => {
            await utils.list.byContext.invalidate();
            await utils.list.get.invalidate({ id: listId });
            toast.success("View created from template");

            const params = new URLSearchParams(searchParams.toString());
            params.set("lv", data.id);
            router.push(`?${params.toString()}`, { scroll: false });
        },
        onError: (err) => toast.error(`Failed to create view: ${err.message}`)
    });

    // Active Tab Logic
    const urlViewId = searchParams.get("lv");
    const activeView = views.find(v => v.id === urlViewId) || views[0];
    const activeTab = activeView?.id;

    const handleTabChange = useCallback((viewId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("lv", viewId);
        router.push(`?${params.toString()}`, { scroll: false });
    }, [searchParams, router]);

    const handleRenameView = (name: string) => {
        if (viewToRename) {
            const viewId = viewToRename.id;
            const trimmed = name.trim();
            const patchViews = (views: any[]) => views.map((v: any) => v.id === viewId ? { ...v, name: trimmed } : v);

            utils.list.get.setData({ id: listId }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);
            utils.list.byContext.setData({ spaceId, projectId, teamId, workspaceId }, (old: any) => {
                if (!old || !old.items) return old;
                return {
                    ...old,
                    items: old.items.map((l: any) => l.id === listId ? { ...l, views: patchViews(l.views ?? []) } : l)
                };
            });

            updateViewMutation.mutate({
                id: viewId,
                name: trimmed
            });
            setViewToRename(null);
        }
    };

    const handleCopyViewLink = (view: any) => {
        const url = `${window.location.origin}${window.location.pathname}?list=${listId}&lv=${view.id}`;
        navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
    };

    const handleAddViews = async (selectedTypes: ViewType[]) => {
        if (selectedTypes.length === 0) return;

        let lastCreatedViewId: string | null = null;

        for (const type of selectedTypes) {
            const config = viewConfig[type];
            if (!config) continue;

            try {
                const result = await createViewMutation.mutateAsync({
                    name: config.label,
                    type: type as any,
                    listId: listId
                });
                lastCreatedViewId = result.id;
                toast.success(`View "${config.label}" added`);
            } catch (err) {
                console.error(`Failed to create view ${type}:`, err);
            }
        }

        if (lastCreatedViewId) {
            await utils.list.byContext.invalidate();
            const params = new URLSearchParams(searchParams.toString());
            params.set("lv", lastCreatedViewId);
            router.push(`?${params.toString()}`, { scroll: false });
        }
    };

    const handleAddFromTemplate = (templateId: string) => {
        createFromTemplateMutation.mutate({
            templateId,
            listId
        });
    };

    const handleDeleteView = (viewId: string) => {
        deleteViewMutation.mutate({ id: viewId });
        setViewToDelete(null);
    };

    const togglePin = (view: any) => updateViewMutation.mutate({ id: view.id, isPinned: !view.isPinned });
    const togglePrivate = (view: any) => updateViewMutation.mutate({ id: view.id, isPrivate: !view.isPrivate });
    const toggleLock = (view: any) => updateViewMutation.mutate({ id: view.id, isLocked: !view.isLocked });
    const toggleDefault = (view: any) => updateViewMutation.mutate({ id: view.id, isDefault: !view.isDefault });

    useEffect(() => {
        if (!urlViewId && views.length > 0) {
            const params = new URLSearchParams(searchParams.toString());
            params.set("lv", views[0].id);
            history.replaceState(null, "", `?${params.toString()}`);
        }
    }, [urlViewId, views, searchParams, router]);

    const renderViewContent = (view: any) => {
        if (!view) return null;
        const viewType = view.type as ViewType;

        switch (viewType) {
            case "LIST":
                return (
                    <ListView
                        workspaceId={effectiveWorkspaceId}
                        listId={listId}
                        spaceId={spaceId}
                        projectId={projectId}
                        teamId={teamId}
                        viewId={view.id}
                        context={context as any}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "BOARD":
                return (
                    <BoardView
                        workspaceId={effectiveWorkspaceId}
                        listId={listId}
                        spaceId={spaceId}
                        projectId={projectId}
                        teamId={teamId}
                        viewId={view.id}
                        context={context as any}
                        initialConfig={view.config as any}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "TABLE":
                return (
                    <TableView
                        context={context as any}
                        workspaceId={effectiveWorkspaceId}
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
                        context={context as any}
                        workspaceId={effectiveWorkspaceId}
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
                        context={context as any}
                        workspaceId={effectiveWorkspaceId}
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
                        context={context as any}
                        workspaceId={effectiveWorkspaceId}
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
                        context={context as any}
                        workspaceId={effectiveWorkspaceId}
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
                        context={context as any}
                        workspaceId={effectiveWorkspaceId}
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
            case "ACTIVITY":
                return (
                    <ActivityView
                        context={context as any}
                        workspaceId={effectiveWorkspaceId}
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
                        context={context as any}
                        workspaceId={effectiveWorkspaceId}
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
                        context={context as any}
                        workspaceId={effectiveWorkspaceId}
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
                        context={context as any}
                        workspaceId={effectiveWorkspaceId}
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
                        context={context as any}
                        workspaceId={effectiveWorkspaceId}
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
            case "DOC":
                return (
                    <DocView
                        context={context as any}
                        workspaceId={effectiveWorkspaceId}
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
                        context={context as any}
                        workspaceId={effectiveWorkspaceId}
                        listId={listId}
                        spaceId={spaceId}
                        projectId={projectId}
                        teamId={teamId}
                        viewId={view.id}
                        initialConfig={view.config as any}
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

    if (!list) {
        return (
            <div className="flex h-full flex-col items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-6 max-w-sm text-center">
                    {/* Icon lockup */}
                    <div className="relative">
                        <div className="h-16 w-16 rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center shadow-sm">
                            <svg
                                className="h-7 w-7 text-slate-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.5}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                            </svg>
                        </div>
                        {/* Subtle ping indicator */}
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400/40" />
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400" />
                        </span>
                    </div>

                    {/* Text */}
                    <div className="space-y-1.5">
                        <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                            List unavailable
                        </h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            This list doesn't exist or you don't have permission to access it. Check the URL or ask your workspace admin.
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="w-full h-px bg-slate-100" />

                    {/* Action row */}
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        <span>List ID: <code className="font-mono text-slate-500">{listId ?? "—"}</code></span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <DashboardEntityProvider
            workspaceId={effectiveWorkspaceId}
            spaceId={spaceId}
            projectId={projectId}
            teamId={teamId}
        >
            <div className="flex h-full flex-col">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="flex h-full flex-col gap-0">
                    <div className="dashboard-tabs-container border-b border-slate-200 bg-white px-4 py-1 transition-all">
                        <div className="flex items-center gap-1 min-w-0 overflow-visible">
                            <TabsList className="h-auto bg-transparent p-0 flex-1 min-w-0 flex items-center overflow-visible">
                                <ViewTabsOverflow
                                    views={views}
                                    activeTab={activeTab}
                                    onTabChange={handleTabChange}
                                    onAddView={() => setAddViewModalOpen(true)}
                                    onReorderViews={(activeId, overId, dropPosition) => {
                                        const activeView = views.find((v) => v.id === activeId);
                                        const overView = views.find((v) => v.id === overId);
                                        if (!activeView || !overView || activeId === overId) return;

                                        const otherViews = views.filter((v: any) => v.id !== activeId);

                                        let targetViewId: string | null = overId;

                                        if (dropPosition === "after") {
                                            const overIdxInOther = otherViews.findIndex(v => v.id === overId);
                                            if (overIdxInOther >= 0 && overIdxInOther < otherViews.length - 1) {
                                                targetViewId = otherViews[overIdxInOther + 1].id;
                                            } else {
                                                targetViewId = null; // Drop at the end
                                            }
                                        }

                                        let newSortedViews: any[] = [];
                                        if (targetViewId) {
                                            const idx = otherViews.findIndex(v => v.id === targetViewId);
                                            newSortedViews = [
                                                ...otherViews.slice(0, idx),
                                                activeView,
                                                ...otherViews.slice(idx)
                                            ];
                                        } else {
                                            newSortedViews = [...otherViews, activeView];
                                        }

                                        const newActiveView = newSortedViews.find((v) => v.id === activeId);
                                        if (newActiveView) {
                                            newActiveView.isPinned = overView.isPinned;
                                        }

                                        newSortedViews.forEach((v, i) => {
                                            v.position = i * 1000;
                                        });

                                        utils.list.get.setData({ id: listId }, (old: any) => {
                                            if (!old) return old;
                                            return { ...old, views: newSortedViews };
                                        });

                                        utils.list.byContext.setData({ spaceId, projectId, teamId, workspaceId }, (old: any) => {
                                            if (!old) return old;

                                            const oldLists = [...old.items];
                                            const listIndex = oldLists.findIndex((l: any) => l.id === listId);
                                            if (listIndex === -1) return old;

                                            oldLists[listIndex] = { ...oldLists[listIndex], views: newSortedViews };
                                            return { ...old, items: oldLists };
                                        });

                                        reorderViewsMutation.mutate(
                                            newSortedViews.map((v, i) => ({ id: v.id, position: i * 1000 }))
                                        );
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
                                                    <div role="button" className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); createViewMutation.mutate({ name: `${view.name} Copy`, type: view.type as any, listId: listId }); }}>
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
                                                        listId: listId,
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
                                                            listId: listId,
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
                        (activeView && ["LIST", "BOARD", "TABLE", "CALENDAR", "GANTT", "TIMELINE", "WORKLOAD", "WHITEBOARD", "MIND_MAP", "MAP", "EMBED", "SPREADSHEET", "FILE", "VIDEO", "DESIGN", "DOC", "FORM", "DASHBOARD", "PEOPLE", "ACTIVITY", "GOOGLE_CALENDAR", "GOOGLE_DOCS", "GOOGLE_MAPS", "GOOGLE_SLIDES", "GOOGLE_FORMS", "GOOGLE_DRIVE"].includes(activeView.type))
                            ? "overflow-hidden"
                            : "overflow-y-auto px-6 py-6"
                    )}>
                        {activeView && (
                            <TabsContent value={activeView.id} className="mt-0 h-full min-h-0 min-w-0 w-full max-w-full">
                                {renderViewContent(activeView)}
                            </TabsContent>
                        )}
                    </div>
                </Tabs>

                {/* Add View Modal */}
                <AddViewModal
                    open={addViewModalOpen}
                    onOpenChange={setAddViewModalOpen}
                    existingViews={views.map(v => v.type as ViewType)}
                    onAddViews={handleAddViews}
                    onAddFromTemplate={handleAddFromTemplate}
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

                {viewToShare && (
                    <ShareViewPermissionModal
                        viewId={viewToShare.id}
                        workspaceId={effectiveWorkspaceId || list.workspaceId as string}
                        open={!!viewToShare}
                        onOpenChange={(open) => !open && setViewToShare(null)}
                    />
                )}

                {viewToTemplate && list && (
                    <SaveTemplateModal
                        open={!!viewToTemplate}
                        onOpenChange={(open) => !open && setViewToTemplate(null)}
                        view={viewToTemplate}
                        workspaceId={list.workspaceId || ""}
                    />
                )}
            </div>
        </DashboardEntityProvider>
    );
}
