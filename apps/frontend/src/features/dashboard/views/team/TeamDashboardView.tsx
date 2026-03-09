"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import TeamNavigationSidebar, { type TeamView } from "@/features/dashboard/layouts/team/TeamNavigationSidebar";
import { TeamOverviewTab } from "@/features/dashboard/views/team/TeamOverviewTab";
import { DiscussionsView } from "@/features/dashboard/views/team/DiscussionsView";
import { ActivitiesView } from "@/features/dashboard/views/team/ActivitiesView";
import { MembersView } from "@/features/dashboard/views/team/MembersView";
import TeamListView from "@/features/dashboard/views/team/TeamListView";
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
import { ShareModal } from "@/components/permissions/ShareModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AddViewModal, ViewType } from "@/features/dashboard/components/modals/AddViewModal";
import { TeamViewContextMenu } from "@/features/dashboard/components/team/TeamViewContextMenu";
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
import { TeamActionsMenu } from "@/features/dashboard/components/sidebar/TeamActionsMenu";
import { VerticalToolRail } from "@/features/dashboard/components/VerticalToolRail";
import TeamItemSidebar from "@/features/dashboard/layouts/team/TeamItemSidebar";
import TeamSettingsSidebar from "@/features/dashboard/layouts/team/TeamSettingsSidebar";
import {
  LayoutDashboard,
  MessageSquare,
  Activity,
  Users,
  Calendar,
  FileText,
  Sidebar,
  LayoutPanelTop,
  Pin,
  Lock,
  Plus,
  CheckSquare,
  List,
  Kanban,
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
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LayoutMode = "sidebar" | "top";

interface TeamDashboardViewProps {
  teamId: string;
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
  OVERVIEW: { label: "Overview", icon: LayoutDashboard, description: "Team overview" },
  DISCUSSIONS: { label: "Discussions", icon: MessageSquare, description: "Team discussions" },
  ACTIVITY: { label: "Activities", icon: Activity, description: "Activity log" },
  MEMBERS: { label: "Members", icon: Users, description: "Team members" },

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
  TASKS: { label: "Tasks", icon: CheckSquare, description: "Team tasks" },
  PROJECTS: { label: "Projects", icon: LayoutDashboard, description: "Projects" },
  TEAMS: { label: "Sub-Teams", icon: Users, description: "Sub-teams" },
  CHANNELS: { label: "Channels", icon: MessageSquare, description: "Chat channels" },
  PROPOSALS: { label: "Proposals", icon: FileText, description: "Proposals" },
  TOOLS: { label: "Tools", icon: LayoutDashboard, description: "Tools" },
  MATERIALS: { label: "Materials", icon: LayoutDashboard, description: "Materials" },
  DASHBOARD: { label: "Dashboard", icon: LayoutDashboard, description: "Dashboard" },
  POSTS: { label: "Posts", icon: MessageSquare, description: "Posts" },
  VIEWS: { label: "Views", icon: LayoutDashboard, description: "Views" },
  LOGS: { label: "Logs", icon: FileText, description: "Logs" },
  APPEAL: { label: "Appeal", icon: FileText, description: "Appeal" },
  GOVERNANCE: { label: "Governance", icon: FileText, description: "Governance" },
  ANALYTICS: { label: "Analytics", icon: BarChart3, description: "Analytics" },
  WAR_ROOM: { label: "War Room", icon: LayoutDashboard, description: "War Room" },
  MARKETPLACE: { label: "Marketplace", icon: LayoutDashboard, description: "Marketplace" },
};

export default function TeamDashboardView({ teamId }: TeamDashboardViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const utils = trpc.useUtils();

  const selectedTaskId = searchParams.get("task");

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("sidebar");

  // Item selection states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [selectedListId, setSelectedListId] = useState<string | null>(searchParams.get("list"));
  const [addViewModalOpen, setAddViewModalOpen] = useState(false);
  const [viewToRename, setViewToRename] = useState<{ id: string, name: string } | null>(null);
  const [viewToDelete, setViewToDelete] = useState<{ id: string, name: string } | null>(null);
  const [viewToShare, setViewToShare] = useState<{ id: string, name: string } | null>(null);
  const [viewToTemplate, setViewToTemplate] = useState<any | null>(null);
  const [selectedAIChatId, setSelectedAIChatId] = useState<string | null>(null);
  const [taskViewMode, setTaskViewMode] = useState<TaskLayoutMode>("sidebar");

  // URL-based selection statesAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isAskAIOpen, setIsAskAIOpen] = useState(false);
  const [itemSidebarOpen, setItemSidebarOpen] = useState(false);
  const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(false);

  const openItemSidebar = () => setItemSidebarOpen(true);
  const openSettingsSidebar = () => setSettingsSidebarOpen(true);

  // Fetch Data
  const { data: team, isLoading: isTeamLoading } = trpc.team.get.useQuery({ id: teamId });

  const workspaceId = team?.workspaceId || undefined;
  const isLoading = isTeamLoading;

  // Mutations
  const createViewMutation = trpc.view.create.useMutation({
    onSuccess: () => {
      utils.team.get.invalidate({ id: teamId });
      toast.success("View added");
    },
    onError: (err) => toast.error(`Failed to add view: ${err.message}`)
  });

  const deleteViewMutation = trpc.view.delete.useMutation({
    onSuccess: () => {
      utils.team.get.invalidate({ id: teamId });
      toast.success("View deleted");
    },
    onError: (err) => toast.error(`Failed to delete view: ${err.message}`)
  });

  const updateViewMutation = trpc.view.update.useMutation({
    onSuccess: () => {
      utils.team.get.invalidate({ id: teamId });
    },
    onError: (err) => toast.error(`Failed to update view: ${err.message}`)
  });

  const createFromTemplateMutation = trpc.view.createFromTemplate.useMutation({
    onSuccess: () => {
      utils.team.get.invalidate({ id: teamId });
      toast.success("View created from template");
    },
    onError: (err) => toast.error(`Failed to create view: ${err.message}`)
  });

  // Derived views from DB
  const views = useMemo(() => {
    if (!team?.views || team.views.length === 0) {
      return [];
    }
    return [...team.views].sort((a: any, b: any) => {
      if (a.type === "OVERVIEW") return -1;
      if (b.type === "OVERVIEW") return 1;
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return a.position - b.position;
    });
  }, [team?.views]);

  const currentTab = searchParams.get("tab");
  const selectedListIdFromUrl = searchParams.get("list");
  const isViewsTab = currentTab === "views" || !currentTab;
  const isListsTab = currentTab === "lists" || !!selectedListIdFromUrl;

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
        teamId: teamId
      });
    });
  };

  const handleAddFromTemplate = (templateId: string) => {
    createFromTemplateMutation.mutate({
      templateId,
      teamId
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

  const togglePin = (view: any) => updateViewMutation.mutate({ id: view.id, isPinned: !view.isPinned });
  const togglePrivate = (view: any) => updateViewMutation.mutate({ id: view.id, isPrivate: !view.isPrivate });
  const toggleLock = (view: any) => updateViewMutation.mutate({ id: view.id, isLocked: !view.isLocked });
  const toggleDefault = (view: any) => updateViewMutation.mutate({ id: view.id, isDefault: !view.isDefault });

  const handleListSelect = useCallback((listId: string) => {
    setSelectedListId(listId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "lists");
    params.set("list", listId);
    params.delete("folder"); // If a list is selected, folder should be cleared in main view
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);



  useEffect(() => {
    if (isViewsTab && !urlTabId && views.length > 0) {
      const params = new URLSearchParams(searchParams.toString());
      if (!params.get("tab")) params.set("tab", "views");
      params.set("v", views[0].id);
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [urlTabId, views, isViewsTab, searchParams, router]);

  const renderViewContent = (view: any) => {
    if (!view || !team) return null;
    const viewType = view.type as ViewType;

    switch (viewType) {
      case "OVERVIEW":
        return <TeamOverviewTab team={team} />;
      case "DISCUSSIONS":
        return <DiscussionsView teamId={teamId} />;
      case "ACTIVITY":
        return <ActivitiesView teamId={teamId} />;
      case "MEMBERS":
        return <MembersView teamId={teamId} />;

      // Generic Views
      case "TASKS":
      case "LIST":
        return <ListView teamId={teamId} selectedTaskIdFromParent={selectedTaskId} onTaskSelect={handleTaskSelect} />;
      case "BOARD":
        return <BoardView teamId={teamId} />;
      case "TABLE":
        return <TableView teamId={teamId} viewId={view.id} initialConfig={view.config} />;
      case "CALENDAR":
        return <CalendarView teamId={teamId} />;
      case "GANTT":
        return <GanttView teamId={teamId} />;
      case "TIMELINE":
        return <TimelineView teamId={teamId} viewId={view.id} initialConfig={view.config} />;
      case "FORM":
        return <FormView teamId={teamId} viewId={view.id} initialConfig={view.config} />;
      case "MIND_MAP":
        return <MindMapView teamId={teamId} viewId={view.id} initialConfig={view.config} />;
      case "WORKLOAD":
        return <WorkloadView teamId={teamId} viewId={view.id} initialConfig={view.config} />;
      case "WHITEBOARD":
        return <WhiteboardView teamId={teamId} viewId={view.id} initialConfig={view.config} />;
      case "MAP":
        return <MapView teamId={teamId} viewId={view.id} initialConfig={view.config} />;
      case "DASHBOARD":
        return <GenericDashboardView teamId={teamId} viewId={view.id} initialConfig={view.config} />;

      // Embeds
      case "DOC":
      case "EMBED":
      case "SPREADSHEET":
      case "FILE":
      case "VIDEO":
      case "DESIGN":
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
          <p className="text-sm text-muted-foreground">Loading team...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex items-center justify-center py-12 h-screen">
        <p className="text-sm text-muted-foreground">Team not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Main Layout - Sidebar visibility controlled by layoutMode */}
      <div className="flex h-full gap-1 flex-1 overflow-hidden">
        {layoutMode === "sidebar" && (
          <TeamNavigationSidebar
            teamId={teamId}
            activeView={(isListsTab ? 'lists' : activeView?.type?.toLowerCase() || 'overview') as any}
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

        {/* Main Content */}
        <div className="flex-1 overflow-hidden w-full h-full bg-slate-50 flex flex-col">
          <DashboardHeader
            entityName={team.name || "Untitled Team"}
            entityType="team"
            entityIcon={<Users className="h-4 w-4" />}
            isStarred={team.isStarred}
            onToggleStar={() => {
              toast.info("Star toggle coming soon");
            }}
            shareUrl={`${window.location.origin}${window.location.pathname}?teamId=${teamId}`}
            showSettings={false}
            onAskAIClick={() => setIsAskAIOpen(!isAskAIOpen)}
            onShareClick={() => setIsShareModalOpen(true)}
            agentPopoverContent={
              <QuickAgentModal
                contextId={teamId}
                contextType="TEAM"
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
                  <TeamActionsMenu
                    workspaceId={workspaceId!}
                    teamId={teamId}
                    trigger={
                      <Button variant="ghost" size="sm" className="h-8 gap-2">
                        <Settings className="h-4 w-4" />
                        <span className="hidden sm:inline">Settings</span>
                      </Button>
                    }
                  />
                )
              },
            ]}
          />
          <div className="flex-1 overflow-hidden relative">
            {isListsTab ? (
              <TeamListView
                teamId={teamId}
                workspaceId={workspaceId}
                selectedListId={selectedListId || undefined}
                onListSelect={handleListSelect}
                selectedTaskIdFromParent={selectedTaskId}
                onTaskSelect={handleTaskSelect}
              />
            ) : (
              <ResizableSplitLayout
                MainContent={
                  <Tabs value={activeTab} onValueChange={handleTabChange} className="flex h-full flex-col">
                    <div className="border-b border-slate-200 bg-white px-6">
                      <div className="flex items-center justify-start gap-2">
                        <TabsList className="h-auto bg-transparent p-0">
                          {views.map((view: any) => {
                            const viewType = view.type as ViewType;
                            const config = viewConfig[viewType] || { label: view.name, icon: FileText };
                            const Icon = config.icon;

                            return (
                              <ContextMenu key={view.id}>
                                <ContextMenuTrigger>
                                  <TabsTrigger value={view.id} asChild>
                                    <div className="group relative flex items-center gap-2 data-[state=active]:bg-slate-100">
                                      <Icon className="h-4 w-4" />
                                      <span>{view.name}</span>
                                      {view.isPinned && <Pin className="h-3 w-3 -mr-1 rotate-45 text-muted-foreground" />}
                                      {view.isPrivate && <Lock className="h-3 w-3 -mr-1 text-muted-foreground" />}
                                    </div>
                                  </TabsTrigger>
                                </ContextMenuTrigger>
                                <TeamViewContextMenu
                                  view={view}
                                  onRename={(v) => setViewToRename({ id: v.id, name: v.name })}
                                  onDelete={(v) => setViewToDelete({ id: v.id, name: v.name })}
                                  onDuplicate={(v) => {
                                    createViewMutation.mutate({
                                      name: `${v.name} Copy`,
                                      type: v.type,
                                      teamId: teamId,
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
                          <Button variant="outline" onClick={() => setAddViewModalOpen(true)} className="h-9 px-3 text-sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Add View
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="relative flex-1 overflow-y-auto px-6 py-6">
                      {activeView && (
                        <TabsContent value={activeView.id} className="mt-0 h-full">
                          {renderViewContent(activeView)}
                        </TabsContent>
                      )}

                      {!activeView && views.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                          <p>No views configured for this team.</p>
                          <Button variant="link" onClick={() => setAddViewModalOpen(true)}>Add a view</Button>
                        </div>
                      )}

                      {/* Vertical tool rail */}
                      <VerticalToolRail
                        onAddClick={openItemSidebar}
                        onSettingsClick={openSettingsSidebar}
                        className="right-0"
                      />
                      <TeamItemSidebar teamId={teamId} workspaceId={team?.workspaceId || undefined} type={activeView?.type as any} open={itemSidebarOpen} onClose={() => setItemSidebarOpen(false)} inline />
                      <TeamSettingsSidebar teamId={teamId} workspaceId={team?.workspaceId || undefined} open={settingsSidebarOpen} onClose={() => setSettingsSidebarOpen(false)} inline />
                    </div>
                  </Tabs>
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
                          contextType="TEAM"
                          contextId={teamId}
                          contextName={team.name || "Team"}
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
        itemType="team"
        itemId={teamId}
        itemName={team.name || "Team"}
        workspaceId={team?.workspaceId || ""}
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
          workspaceId={team?.workspaceId || ""}
        />
      )}
    </div>
  );
}

