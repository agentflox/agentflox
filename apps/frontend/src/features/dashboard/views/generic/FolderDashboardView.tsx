"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
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
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    }, [urlViewId, views, searchParams, router]);

    const renderViewContent = (view: any) => {
        if (!view) return null;
        const viewType = view.type as ViewType;

        switch (viewType) {
            case "LIST":
                return <ListView folderId={folderId} spaceId={spaceId} projectId={projectId} teamId={teamId} selectedTaskIdFromParent={selectedTaskIdFromParent} onTaskSelect={onTaskSelect} />;
            case "BOARD":
                return <BoardView folderId={folderId} spaceId={spaceId} projectId={projectId} teamId={teamId} selectedTaskIdFromParent={selectedTaskIdFromParent} onTaskSelect={onTaskSelect} />;
            case "TABLE":
                return <TableView folderId={folderId} spaceId={spaceId} viewId={view.id} initialConfig={view.config} />;
            case "CALENDAR":
                return <CalendarView folderId={folderId} spaceId={spaceId} />;
            case "GANTT":
                return <GanttView folderId={folderId} spaceId={spaceId} />;
            case "TIMELINE":
                return <TimelineView folderId={folderId} spaceId={spaceId} viewId={view.id} initialConfig={view.config} />;
            case "FORM":
                return <FormView folderId={folderId} spaceId={spaceId} viewId={view.id} initialConfig={view.config} />;
            case "MIND_MAP":
                return <MindMapView folderId={folderId} spaceId={spaceId} viewId={view.id} initialConfig={view.config} />;
            case "WORKLOAD":
                return <WorkloadView folderId={folderId} spaceId={spaceId} viewId={view.id} initialConfig={view.config} />;
            case "WHITEBOARD":
                return <WhiteboardView folderId={folderId} spaceId={spaceId} viewId={view.id} initialConfig={view.config} />;
            case "MAP":
                return <MapView folderId={folderId} spaceId={spaceId} viewId={view.id} initialConfig={view.config} />;
            case "DASHBOARD":
                return <GenericDashboardView folderId={folderId} spaceId={spaceId} viewId={view.id} initialConfig={view.config} />;
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
                                                <div className="group relative flex items-center gap-2 h-10 px-4 py-2.5 text-base cursor-pointer data-[state=active]:bg-slate-100">
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
                        : "overflow-y-auto px-6 py-6"
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
