"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AddViewModal, ViewType } from "@/features/dashboard/components/modals/AddViewModal";
import { ViewTabsOverflow } from "@/features/dashboard/components/shared/ViewTabsOverflow";
import { SpaceViewContextMenu } from "@/features/dashboard/components/space/SpaceViewContextMenu";
import ListView from "@/features/dashboard/views/generic/ListView";
import { BoardView } from "@/features/dashboard/views/generic/BoardView";
import { TableView } from "@/features/dashboard/views/generic/TableView";
import { PeopleView } from "@/features/dashboard/views/generic/PeopleView ";
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
    Edit,
    Copy,
    Shield,
    EyeOff,
    Save,
    CopyPlus,
    Trash2,
    MoreHorizontal,
    Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FolderDashboardViewProps {
    folderId: string;
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
    LIST: { label: "List", icon: ListIcon, description: "List view" },
    BOARD: { label: "Board", icon: Kanban, description: "Kanban board" },
    TABLE: { label: "Table", icon: ClipboardList, description: "Table view" },
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

export default function FolderDashboardView({ folderId, spaceId, projectId, teamId, workspaceId, selectedTaskIdFromParent, onTaskSelect }: FolderDashboardViewProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const utils = trpc.useUtils();

    // Dialog states
    const [addViewModalOpen, setAddViewModalOpen] = useState(false);
    const [viewToRename, setViewToRename] = useState<{ id: string, name: string } | null>(null);
    const [viewToDelete, setViewToDelete] = useState<{ id: string, name: string } | null>(null);
    const [viewToShare, setViewToShare] = useState<{ id: string, name: string } | null>(null);
    const [viewToTemplate, setViewToTemplate] = useState<any | null>(null);

    // Fetch folder data with views
    const { data: foldersData } = trpc.folder.byContext.useQuery(
        { spaceId, projectId, teamId, workspaceId },
        { enabled: !!(spaceId || projectId || teamId || workspaceId) }
    );

    const folder = foldersData?.items?.find((f: any) => f.id === folderId);
    const views = useMemo(() => {
        if (!folder?.views) return [];
        return [...folder.views].sort((a: any, b: any) => {
            if (a.isPinned !== b.isPinned) {
                return a.isPinned ? -1 : 1;
            }
            return a.position - b.position;
        });
    }, [folder?.views]);

    // Mutations
    const createViewMutation = trpc.view.create.useMutation({
        onSuccess: async () => {
            await utils.folder.byContext.invalidate();
        },
        onError: (err) => toast.error(`Failed to add view: ${err.message}`)
    });

    const deleteViewMutation = trpc.view.delete.useMutation({
        onSuccess: async () => {
            await utils.folder.byContext.invalidate();
            toast.success("View deleted");
        },
        onError: (err) => toast.error(`Failed to delete view: ${err.message}`)
    });

    const updateViewMutation = trpc.view.update.useMutation({
        onSuccess: async () => {
            await utils.folder.byContext.invalidate();
        },
        onError: (err) => toast.error(`Failed to update view: ${err.message}`)
    });

    const createFromTemplateMutation = trpc.view.createFromTemplate.useMutation({
        onSuccess: async (data) => {
            await utils.folder.byContext.invalidate();
            toast.success("View created from template");

            const params = new URLSearchParams(searchParams.toString());
            params.set("fv", data.id);
            router.push(`?${params.toString()}`, { scroll: false });
        },
        onError: (err) => toast.error(`Failed to create view: ${err.message}`)
    });

    const reorderViewsMutation = trpc.view.reorder.useMutation({
        onSuccess: async () => utils.folder.byContext.invalidate(),
        onError: (err) => toast.error(`Failed to reorder views: ${err.message}`)
    });

    // Active Tab Logic
    const urlViewId = searchParams.get("fv");
    const activeView = views.find(v => v.id === urlViewId) || views[0];
    const activeTab = activeView?.id;

    const handleTabChange = useCallback((viewId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("fv", viewId);
        router.push(`?${params.toString()}`, { scroll: false });
    }, [searchParams, router]);

    const handleRenameView = (name: string) => {
        if (viewToRename) {
            const viewId = viewToRename.id;
            const trimmed = name.trim();
            const patchViews = (views: any[]) => views.map((v: any) => v.id === viewId ? { ...v, name: trimmed } : v);

            utils.folder.byContext.setData({ spaceId, projectId, teamId, workspaceId }, (old: any) => {
                if (!old || !old.items) return old;
                return {
                    ...old,
                    items: old.items.map((f: any) => f.id === folderId ? { ...f, views: patchViews(f.views ?? []) } : f)
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
        const url = `${window.location.origin}${window.location.pathname}?folder=${folderId}&fv=${view.id}`;
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
                    folderId: folderId
                });
                lastCreatedViewId = result.id;
                toast.success(`View "${config.label}" added`);
            } catch (err) {
                console.error(`Failed to create view ${type}:`, err);
            }
        }

        if (lastCreatedViewId) {
            await utils.folder.byContext.invalidate();
            const params = new URLSearchParams(searchParams.toString());
            params.set("fv", lastCreatedViewId);
            router.push(`?${params.toString()}`, { scroll: false });
        }
    };

    const handleAddFromTemplate = (templateId: string) => {
        createFromTemplateMutation.mutate({
            templateId,
            folderId
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
            params.set("fv", views[0].id);
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    }, [urlViewId, views, searchParams, router]);

    const renderViewContent = (view: any) => {
        if (!view) return null;
        const viewType = view.type as ViewType;

        switch (viewType) {
            case "LIST":
                return (
                    <ListView
                        folderId={folderId}
                        spaceId={spaceId}
                        projectId={projectId}
                        teamId={teamId}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "BOARD":
                return (
                    <BoardView
                        folderId={folderId}
                        spaceId={spaceId}
                        projectId={projectId}
                        teamId={teamId}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "TABLE":
                return (
                    <TableView
                        folderId={folderId}
                        spaceId={spaceId}
                        viewId={view.id}
                        initialConfig={view.config}
                    />
                );
            case "CALENDAR":
                return (
                    <CalendarView
                        folderId={folderId}
                        spaceId={spaceId}
                        projectId={projectId}
                        teamId={teamId}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "GANTT":
                return (
                    <GanttView
                        folderId={folderId}
                        spaceId={spaceId}
                        projectId={projectId}
                        teamId={teamId}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "TIMELINE":
                return (
                    <TimelineView
                        folderId={folderId}
                        spaceId={spaceId}
                        projectId={projectId}
                        teamId={teamId}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "FORM":
                return (
                    <FormView
                        workspaceId={workspaceId}
                        folderId={folderId}
                        spaceId={spaceId}
                        projectId={projectId}
                        teamId={teamId}
                        viewId={view.id}
                        initialConfig={view.config}
                    />
                );
            case "PEOPLE":
                return (
                    <PeopleView
                        folderId={folderId}
                        spaceId={spaceId}
                        projectId={projectId}
                        teamId={teamId}
                        viewId={view.id}
                        initialConfig={view.config}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                    />
                );
            case "MIND_MAP":
                return (
                    <MindMapView
                        folderId={folderId}
                        spaceId={spaceId}
                        viewId={view.id}
                        initialConfig={view.config}
                    />
                );
            case "WORKLOAD":
                return (
                    <WorkloadView
                        folderId={folderId}
                        spaceId={spaceId}
                        viewId={view.id}
                        initialConfig={view.config}
                    />
                );
            case "WHITEBOARD":
                return (
                    <WhiteboardView
                        folderId={folderId}
                        spaceId={spaceId}
                        viewId={view.id}
                        initialConfig={view.config}
                    />
                );
            case "MAP":
                return (
                    <MapView
                        folderId={folderId}
                        spaceId={spaceId}
                        viewId={view.id}
                        initialConfig={view.config}
                    />
                );
            case "DASHBOARD":
                return (
                    <GenericDashboardView
                        folderId={folderId}
                        spaceId={spaceId}
                        viewId={view.id}
                        initialConfig={view.config}
                    />
                );
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
                return <EmbedView
                    key={view.id}
                    viewId={view.id}
                    folderId={folderId}
                    spaceId={spaceId}
                    projectId={projectId}
                    teamId={teamId}
                    initialConfig={view.config as any}
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

    if (!folder) {
        return (
            <div className="flex items-center justify-center py-12 h-full">
                <p className="text-sm text-muted-foreground">Folder not found</p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex h-full flex-col">
                <div className="dashboard-tabs-container border-b border-slate-200 bg-white px-4 transition-all">
                    <div className="flex items-center gap-1 min-w-0 overflow-hidden h-10">
                        <TabsList className="h-auto bg-transparent p-0 flex-1 min-w-0 flex items-center overflow-hidden">
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
                                    utils.folder.byContext.setData({ spaceId, projectId, teamId, workspaceId }, (old: any) => {
                                        if (!old) return old;
                                        return {
                                            ...old,
                                            items: old.items?.map((f: any) =>
                                                f.id === folderId ? { ...f, views: newSortedViews } : f
                                            )
                                        };
                                    });
                                    reorderViewsMutation.mutate(newSortedViews.map((v: any, i: number) => ({ id: v.id, position: i * 1000 })));
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
                                                <div role="button" className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); createViewMutation.mutate({ name: `${view.name} Copy`, type: view.type, folderId }); }}>
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
                                            onDuplicate={(v) => createViewMutation.mutate({ name: `${v.name} Copy`, type: v.type, folderId })}
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
                                                            <div className="group relative flex items-center gap-1.5 h-10 px-3 py-2 text-sm cursor-pointer whitespace-nowrap data-[state=active]:bg-slate-100 rounded-md hover:bg-slate-50 transition-colors">
                                                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                                                <span className="inline-block max-w-[120px] truncate align-bottom">{view.name}</span>
                                                                {view.isPinned && <Pin className="h-3 w-3 shrink-0 rotate-45 text-muted-foreground" />}
                                                                {view.isPrivate && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}
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
                                                onDuplicate={(v) => createViewMutation.mutate({ name: `${v.name} Copy`, type: v.type, folderId })}
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
                                        <div className="flex items-center gap-1.5 h-10 px-3 py-2 text-sm whitespace-nowrap">
                                            <Icon className="h-3.5 w-3.5 shrink-0" />
                                            <span className="max-w-[120px] truncate">{view.name}</span>
                                            {view.isPinned && <Pin className="h-3 w-3 shrink-0 rotate-45" />}
                                            {view.isPrivate && <Lock className="h-3 w-3 shrink-0" />}
                                        </div>
                                    );
                                }}
                            />
                        </TabsList>
                    </div>
                </div>

                <div className={cn(
                    "relative min-h-0 flex-1",
                    (activeView && ["LIST", "BOARD", "TABLE", "CALENDAR", "GANTT", "TIMELINE", "WORKLOAD", "WHITEBOARD", "MIND_MAP", "MAP", "EMBED", "SPREADSHEET", "FILE", "VIDEO", "DESIGN", "DOC", "FORM", "DASHBOARD", "PEOPLE", "GOOGLE_CALENDAR", "GOOGLE_DOCS", "GOOGLE_MAPS", "GOOGLE_SLIDES", "GOOGLE_FORMS", "GOOGLE_DRIVE"].includes(activeView.type))
                        ? "overflow-hidden"
                        : "overflow-y-auto px-6 py-6"
                )}>
                    {activeView && (
                        <TabsContent value={activeView.id} className="mt-0 h-full min-h-0">
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
                        <Button variant="outline" onClick={() => setViewToDelete(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => viewToDelete && handleDeleteView(viewToDelete.id)}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {viewToShare && (
                <ShareViewPermissionModal
                    viewId={viewToShare.id}
                    workspaceId={workspaceId || folder.workspaceId as string}
                    open={!!viewToShare}
                    onOpenChange={(open) => !open && setViewToShare(null)}
                />
            )}

            {viewToTemplate && folder && (
                <SaveTemplateModal
                    open={!!viewToTemplate}
                    onOpenChange={(open) => !open && setViewToTemplate(null)}
                    view={viewToTemplate}
                    workspaceId={folder.workspaceId || ""}
                />
            )}
        </div>
    );
}
