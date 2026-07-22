"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { DashboardEntityProvider } from "@/features/dashboard/context/DashboardEntityContext";
import { DashboardLoadingState, DashboardErrorState } from "@/features/dashboard/components/shared/DashboardStates";
import TeamNavigationSidebar, { type TeamView } from "@/features/dashboard/layouts/team/TeamNavigationSidebar";
import dynamic from "next/dynamic";
const TeamOverviewTab = dynamic(() => import("@/features/dashboard/views/team/TeamOverviewTab").then(mod => mod.TeamOverviewTab));
const TeamListView = dynamic(() => import("@/features/dashboard/views/team/TeamListView"));
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
import type { TaskLayoutMode } from "@/entities/task/components/TaskDetailModal";
import { TaskDetailModal, TaskDetailContent } from "@/entities/task/components/TaskDetailModal";
const ChatView = dynamic(() => import("@/features/dashboard/views/shared/ChatView"));
const AIChatView = dynamic(() => import("@/features/dashboard/views/shared/AIChatView"));
const SharedAIChatView = dynamic(() => import("@/features/dashboard/views/shared/SharedAIChatView").then(mod => mod.ChatView));
const TeamPersonalView = dynamic(() => import("@/features/dashboard/views/team/TeamPersonalView"));
const TeamProjectView = dynamic(() => import("@/features/dashboard/views/team/TeamProjectView"));
const TeamDocsView = dynamic(() => import("@/features/dashboard/views/team/TeamDocsView"));
import { TeamActionsMenu } from "@/features/dashboard/components/sidebar/TeamActionsMenu";
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
  Settings,
  Edit,
  Copy,
  Shield,
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

interface TeamDashboardViewProps {
  listId?: string;
  spaceId?: string;
  projectId?: string;
  teamId?: string;
  workspaceId?: string;
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
  OVERVIEW: { label: "Overview", icon: LayoutDashboard, description: "Team overview" },

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

export default function TeamDashboardView({ listId, spaceId, projectId, teamId, workspaceId, selectedTaskIdFromParent, onTaskSelect }: TeamDashboardViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const utils = trpc.useUtils();

  const selectedTaskId = searchParams.get("task");

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("sidebar");

  // Item selection states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [selectedListId, setSelectedListId] = useState<string | null>(searchParams.get("list"));
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(searchParams.get("pj"));
  const [addViewModalOpen, setAddViewModalOpen] = useState(false);
  const [viewToRename, setViewToRename] = useState<{ id: string, name: string } | null>(null);
  const [viewToDelete, setViewToDelete] = useState<{ id: string, name: string } | null>(null);
  const [viewToShare, setViewToShare] = useState<{ id: string, name: string } | null>(null);
  const [viewToTemplate, setViewToTemplate] = useState<any | null>(null);
  const [selectedAIChatId, setSelectedAIChatId] = useState<string | null>(null);
  const [taskViewMode, setTaskViewMode] = useState<TaskLayoutMode>("modal");

  // URL-based selection statesAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isAskAIOpen, setIsAskAIOpen] = useState(false);
  const [itemSidebarOpen, setItemSidebarOpen] = useState(false);
  const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(false);

  const openItemSidebar = () => setItemSidebarOpen(true);
  const openSettingsSidebar = () => setSettingsSidebarOpen(true);

  // Fetch Data
  const { data: team, isLoading: isTeamLoading } = trpc.team.get.useQuery({ id: teamId ?? "" }, { enabled: !!teamId, staleTime: 60_000, gcTime: 5 * 60_000 });

  const resolvedWorkspaceId: string | undefined = (team?.workspaceId || workspaceId) ?? undefined;
  const isLoading = isTeamLoading;

  // Mutations
  const createViewMutation = trpc.view.create.useMutation({
    onSuccess: () => {
      utils.team.get.invalidate({ id: teamId! });
      toast.success("View added");
    },
    onError: (err) => toast.error(`Failed to add view: ${err.message}`)
  });

  const deleteViewMutation = trpc.view.delete.useMutation({
    onSuccess: () => {
      utils.team.get.invalidate({ id: teamId! });
      toast.success("View deleted");
    },
    onError: (err) => toast.error(`Failed to delete view: ${err.message}`)
  });

  const updateViewMutation = trpc.view.update.useMutation({
    onSuccess: () => {
      utils.team.get.invalidate({ id: teamId! });
    },
    onError: (err) => toast.error(`Failed to update view: ${err.message}`)
  });

  const createFromTemplateMutation = trpc.view.createFromTemplate.useMutation({
    onSuccess: () => {
      utils.team.get.invalidate({ id: teamId! });
      toast.success("View created from template");
    },
    onError: (err) => toast.error(`Failed to create view: ${err.message}`)
  });

  const reorderViewsMutation = trpc.view.reorder.useMutation({
    onSuccess: () => utils.team.get.invalidate({ id: teamId! }),
    onError: (err) => toast.error(`Failed to reorder views: ${err.message}`)
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

  const currentTab = searchParams.get("tab") || "overview";
  const selectedListIdFromUrl = searchParams.get("list");
  const isOverviewTab = currentTab === "overview" || (!searchParams.get("tab") && !selectedListIdFromUrl);
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
      const viewId = viewToRename.id;
      const trimmed = name.trim();
      const patchViews = (views: any[]) => views.map((v: any) => v.id === viewId ? { ...v, name: trimmed } : v);

      utils.team.get.setData({ id: teamId! }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);

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
        name: config?.label || type,
        type: type as any,
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
    if (isOverviewTab && !urlTabId && views.length > 0) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "overview");
      params.set("v", views[0].id);
      history.replaceState(null, "", `?${params.toString()}`);
    }
  }, [urlTabId, views, isOverviewTab, searchParams, router]);

  const renderViewContent = (view: any) => {
    if (!view || !team) return null;
    const viewType = view.type as ViewType;

    switch (viewType) {
      case "OVERVIEW":
        return <TeamOverviewTab team={team} />;
      // Generic Views
      case "TASKS":
      case "LIST":
        return (
          <ListView
            workspaceId={resolvedWorkspaceId}
            listId={listId || undefined}
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
            workspaceId={resolvedWorkspaceId}
            listId={listId || undefined}
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
            workspaceId={resolvedWorkspaceId}
            listId={listId || undefined}
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
            workspaceId={resolvedWorkspaceId}
            listId={listId || undefined}
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
            workspaceId={resolvedWorkspaceId}
            listId={listId || undefined}
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
            workspaceId={resolvedWorkspaceId}
            listId={listId || undefined}
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
            workspaceId={resolvedWorkspaceId}
            listId={listId || undefined}
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
            workspaceId={resolvedWorkspaceId}
            listId={listId || undefined}
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
            workspaceId={resolvedWorkspaceId}
            listId={listId || undefined}
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
            workspaceId={resolvedWorkspaceId}
            listId={listId || undefined}
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
            workspaceId={resolvedWorkspaceId}
            listId={listId || undefined}
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
            listId={listId || undefined}
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
            listId={listId || undefined}
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
            listId={listId || undefined}
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
            listId={listId || undefined}
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
      case "GOOGLE_CALENDAR":
      case "GOOGLE_DOCS":
      case "GOOGLE_MAPS":
      case "GOOGLE_SLIDES":
      case "GOOGLE_FORMS":
      case "GOOGLE_DRIVE":
        return (
          <EmbedView
            listId={listId || undefined}
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
    return <DashboardLoadingState message="Loading team..." />;
  }

  if (!team) {
    return <DashboardErrorState title="Team not found" message="We couldn't find the team you're looking for." />;
  }

  const activeTeamId = team.id;
  const activeWorkspaceId = team.workspaceId ?? workspaceId ?? "";

  return (
    <DashboardEntityProvider
      workspaceId={activeWorkspaceId}
      spaceId={spaceId}
      projectId={projectId}
      teamId={activeTeamId}
    >
      <div className="flex h-full flex-col">
        {/* Main Layout - Sidebar visibility controlled by layoutMode */}
        <div className="flex h-full gap-1 flex-1 overflow-hidden">
          {layoutMode === "sidebar" && (
            <TeamNavigationSidebar
              teamId={activeTeamId}
              activeView={(isListsTab ? "lists" : currentTab) as any}
              onViewChange={(viewId) => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete("v");
                params.delete("ptab");
                if (viewId === "lists") {
                  params.set("tab", "lists");
                } else if (viewId === "overview") {
                  params.set("tab", "overview");
                  if (views.length > 0) params.set("v", views[0].id);
                } else {
                  params.set("tab", viewId);
                }
                router.push(`?${params.toString()}`, { scroll: false });
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
              isStarred={false}
              onToggleStar={() => {
                toast.info("Star toggle coming soon");
              }}
              shareUrl={`${window.location.origin}${window.location.pathname}?teamId=${teamId}`}
              showSettings={false}
              onAskAIClick={() => setIsAskAIOpen(!isAskAIOpen)}
              onShareClick={() => setIsShareModalOpen(true)}
              showExit={true}
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
                      workspaceId={activeWorkspaceId}
                      teamId={activeTeamId}
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
                      <TeamListView
                        teamId={activeTeamId}
                        workspaceId={activeWorkspaceId}
                        selectedListId={selectedListId || undefined}
                        onListSelect={handleListSelect}
                        selectedTaskIdFromParent={selectedTaskId ?? undefined}
                        onTaskSelect={handleTaskSelect}
                      />
                    ) : isOverviewTab && activeView ? (
                      <div className="flex-1 overflow-hidden relative">
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
                                    utils.team.get.setData({ id: teamId! }, (old: any) => old ? { ...old, views: newSortedViews } : old);
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
                                          <div role="button" className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm text-slate-700 w-full text-left cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); createViewMutation.mutate({ name: `${view.name} Copy`, type: view.type as any, teamId: teamId! }); }}>
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
                                      <TeamViewContextMenu
                                        view={view}
                                        onRename={(v) => setViewToRename({ id: v.id, name: v.name })}
                                        onDelete={(v) => setViewToDelete({ id: v.id, name: v.name })}
                                        onDuplicate={(v) => createViewMutation.mutate({ name: `${v.name} Copy`, type: v.type as any, teamId })}
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
                                        <TeamViewContextMenu
                                          view={view}
                                          onRename={(v) => setViewToRename({ id: v.id, name: v.name })}
                                          onDelete={(v) => setViewToDelete({ id: v.id, name: v.name })}
                                          onDuplicate={(v) => createViewMutation.mutate({ name: `${v.name} Copy`, type: v.type as any, teamId })}
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
                                  Your team is currently a blank canvas. Add a view to start visualizing your data, tracking tasks, and organizing your workflow.
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
                    ) : currentTab === "personal" ? (
                      <TeamPersonalView teamId={teamId!} workspaceId={resolvedWorkspaceId!} />
                    ) : currentTab === "projects" ? (
                      <TeamProjectView
                        teamId={teamId!}
                        workspaceId={resolvedWorkspaceId!}
                        selectedProjectId={selectedProjectId || undefined}
                        onProjectSelect={(id) => setSelectedProjectId(id)}
                        selectedTaskIdFromParent={selectedTaskIdFromParent}
                        onTaskSelect={onTaskSelect}
                      />
                    ) : currentTab === "docs" ? (
                      <TeamDocsView teamId={teamId!} workspaceId={resolvedWorkspaceId!} />
                    ) : currentTab === "chats" ? (
                      <ChatView workspaceId={activeWorkspaceId} />
                    ) : currentTab === "ai-chat" ? (
                      <SharedAIChatView
                        contextType="TEAM"
                        contextId={teamId!}
                        contextName={team?.name || "Team"}
                      />
                    ) : (
                      <div className="flex-1 overflow-y-auto p-4">
                        <TeamOverviewTab team={team} />
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
                          workspaceId={resolvedWorkspaceId!}
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
          workspaceId={resolvedWorkspaceId || ""}
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
            workspaceId={resolvedWorkspaceId || ""}
          />
        )}
      </div>
    </DashboardEntityProvider>
  );
}

