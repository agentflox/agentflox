"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AddViewModal, ViewType } from "@/features/dashboard/components/modals/AddViewModal";
import { SpaceViewContextMenu } from "@/features/dashboard/components/space/SpaceViewContextMenu";
import {
    ListView,
    BoardView,
    TableView,
    CalendarView,
    GanttView,
    TimelineView,
    FormView,
    PeopleView,
    ActivityView,
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
    Table,
    LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DashboardEntityProvider } from "@/features/dashboard/context/DashboardEntityContext";

interface DashboardFolderViewProps {
    folderId: string;
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    workspaceId?: string;
    viewId?: string;
    selectedTaskIdFromParent?: string | null;
    onTaskSelect?: (taskId: string | null) => void;
    context?: "workspace" | "space" | "project" | "team" | "folder" | "list";
}

const viewConfig: Partial<Record<
    ViewType,
    {
        label: string;
        icon: React.ComponentType<{ className?: string; size?: number }>;
        description: string;
    }
>> = {
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
    EMBED: { label: "Embed", icon: LinkIcon, description: "Embed view" },
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

export default function DashboardFolderView({ folderId, spaceId, projectId, teamId, workspaceId, selectedTaskIdFromParent, onTaskSelect, context = "folder" }: DashboardFolderViewProps) {
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
        { enabled: !!(spaceId || projectId || teamId || workspaceId), staleTime: 60_000, gcTime: 5 * 60_000 }
    );

    const folder = foldersData?.items?.find((f: any) => f.id === folderId);
    const effectiveWorkspaceId = workspaceId || (folder as any)?.workspaceId;
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
            updateViewMutation.mutate({
                id: viewToRename.id,
                name: name
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
            history.replaceState(null, "", `?${params.toString()}`);
        }
    }, [urlViewId, views, searchParams, router]);

    const renderViewContent = (view: any) => {
        if (!view) return null;
        const viewType = view.type as ViewType;

        switch (viewType) {
            case "LIST":
                return <ListView workspaceId={effectiveWorkspaceId} folderId={folderId} spaceId={spaceId} projectId={projectId} teamId={teamId} context={context} selectedTaskIdFromParent={selectedTaskIdFromParent} onTaskSelect={onTaskSelect} />;
            case "BOARD":
                return <BoardView workspaceId={effectiveWorkspaceId} folderId={folderId} spaceId={spaceId} projectId={projectId} teamId={teamId} context={context} selectedTaskIdFromParent={selectedTaskIdFromParent} onTaskSelect={onTaskSelect} />;
            case "TABLE":
                return <TableView context={context} workspaceId={effectiveWorkspaceId} folderId={folderId} spaceId={spaceId} projectId={projectId} teamId={teamId} viewId={view.id} initialConfig={view.config} selectedTaskIdFromParent={selectedTaskIdFromParent} onTaskSelect={onTaskSelect} />;
            case "CALENDAR":
                return <CalendarView context={context} workspaceId={effectiveWorkspaceId} folderId={folderId} spaceId={spaceId} projectId={projectId} teamId={teamId} viewId={view.id} initialConfig={view.config} selectedTaskIdFromParent={selectedTaskIdFromParent} onTaskSelect={onTaskSelect} />;
            case "GANTT":
                return <GanttView context={context} workspaceId={effectiveWorkspaceId} folderId={folderId} spaceId={spaceId} projectId={projectId} teamId={teamId} viewId={view.id} initialConfig={view.config} selectedTaskIdFromParent={selectedTaskIdFromParent} onTaskSelect={onTaskSelect} />;
            case "TIMELINE":
                return <TimelineView context={context} workspaceId={effectiveWorkspaceId} folderId={folderId} spaceId={spaceId} projectId={projectId} teamId={teamId} viewId={view.id} initialConfig={view.config} selectedTaskIdFromParent={selectedTaskIdFromParent} onTaskSelect={onTaskSelect} />;
            case "FORM":
                return <FormView context={context} workspaceId={effectiveWorkspaceId} folderId={folderId} spaceId={spaceId} projectId={projectId} teamId={teamId} viewId={view.id} initialConfig={view.config} selectedTaskIdFromParent={selectedTaskIdFromParent} onTaskSelect={onTaskSelect} />;
            case "PEOPLE":
                return <PeopleView context={context} workspaceId={effectiveWorkspaceId} folderId={folderId} spaceId={spaceId} viewId={view.id} initialConfig={view.config as any} selectedTaskIdFromParent={selectedTaskIdFromParent} onTaskSelect={onTaskSelect} />;
            case "ACTIVITY":
                return <ActivityView context={context} workspaceId={effectiveWorkspaceId} folderId={folderId} spaceId={spaceId} viewId={view.id} initialConfig={view.config as any} selectedTaskIdFromParent={selectedTaskIdFromParent} onTaskSelect={onTaskSelect} />;
            case "MIND_MAP":
                return <MindMapView context={context} workspaceId={effectiveWorkspaceId} folderId={folderId} spaceId={spaceId} viewId={view.id} initialConfig={view.config} />;
            case "WORKLOAD":
                return <WorkloadView context={context} workspaceId={effectiveWorkspaceId} folderId={folderId} spaceId={spaceId} viewId={view.id} initialConfig={view.config} />;
            case "WHITEBOARD":
                return <WhiteboardView folderId={folderId} spaceId={spaceId} viewId={view.id} initialConfig={view.config} />;
            case "MAP":
                return <MapView context={context} workspaceId={effectiveWorkspaceId} folderId={folderId} spaceId={spaceId} viewId={view.id} initialConfig={view.config} />;
            case "DASHBOARD":
                return <GenericDashboardView context={context} workspaceId={effectiveWorkspaceId} folderId={folderId} spaceId={spaceId} viewId={view.id} initialConfig={view.config} />;
            case "DOC":
                return (
                    <DocView context={context} workspaceId={effectiveWorkspaceId}
                        folderId={folderId}
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
                return <EmbedView context={context} workspaceId={effectiveWorkspaceId}
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

    if (!folder) {
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
                            Folder unavailable
                        </h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            This folder doesn't exist or you don't have permission to access it. Check the URL or ask your workspace admin.
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="w-full h-px bg-slate-100" />

                    {/* Action row */}
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        <span>Folder ID: <code className="font-mono text-slate-500">{folderId ?? "—"}</code></span>
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
                                            </ContextMenuTrigger>
                                            <SpaceViewContextMenu
                                                view={view}
                                                onRename={(v) => setViewToRename({ id: v.id, name: v.name })}
                                                onDelete={(v) => setViewToDelete({ id: v.id, name: v.name })}
                                                onDuplicate={(v) => {
                                                    createViewMutation.mutate({
                                                        name: `${v.name} Copy`,
                                                        type: v.type,
                                                        folderId: folderId,
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
                        "relative flex-1",
                        (activeView && ["LIST", "BOARD", "TABLE", "CALENDAR", "GANTT", "TIMELINE", "WORKLOAD", "WHITEBOARD", "MIND_MAP", "MAP", "EMBED", "SPREADSHEET", "FILE", "VIDEO", "DESIGN", "DOC", "FORM", "DASHBOARD"].includes(activeView.type))
                            ? "overflow-hidden"
                            : "overflow-y-auto"
                    )}>
                        {activeView && (
                            <TabsContent value={activeView.id} className="mt-0 h-full">
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
        </DashboardEntityProvider>
    );
}
