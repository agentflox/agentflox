"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronDown, ChevronRight, ChevronUp, Folder, Layers, List, Search, Users, X, Zap, UserRound, Play, Briefcase } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { AutomationScope } from "../types";
import { ACTION_META } from "../actionCatalog";
import { TRIGGER_META } from "../triggerCatalog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { WorkspaceIcon } from "@/entities/workspace/components/WorkspaceIcon";
import { SpaceIcon } from "@/entities/spaces/components/SpaceIcon";
import { ProjectIcon } from "@/entities/projects/components/ProjectIcon";
import { AutomationBuilderContent } from "./builders/AutomationBuilderContent";
import { AutomationListItem } from "./shared/AutomationListItem";
import { BrowseAutomations } from "./BrowseAutomations";
import type { BrowseTemplate } from "../browseCatalog";
import { ActivityAutomations } from "./ActivityAutomations";
import { RecurringAutomations } from "./RecurringAutomations";
import { WebhooksTab } from "./WebhooksTab";
import { CreateWebhookContent } from "./builders/CreateWebhookContent";

function AgentIcon({ className }: { className?: string }) {
  return (
    <img
      src="/images/ai-agent-removebg-preview.png"
      alt=""
      aria-hidden
      className={cn("h-5 w-5 shrink-0", className)}
    />
  );
}

const TAB_ITEMS = [
  { value: "browse", label: "Browse" },
  { value: "manage", label: "Manage" },
  { value: "activity", label: "Activity" },
  { value: "webhooks", label: "Webhooks" },
  { value: "recurring", label: "Recurring" },
];

type BuilderState = {
  mode: "classic" | "agent";
  editingId?: string | null;
  initialTemplate?: BrowseTemplate | null;
};

type WebhookBuilderState = {
  editingId?: string | null;
};

function LocationPickerContent({
  currentWorkspaceId,
  selectedScope,
  workspaces,
  spaces,
  projects,
  folders,
  lists,
  teams,
  search,
  onSearch,
  onSelect,
}: {
  currentWorkspaceId?: string;
  selectedScope: AutomationScope;
  workspaces: any[];
  spaces: any[];
  projects: any[];
  folders: any[];
  lists: any[];
  teams: any[];
  search: string;
  onSearch: (value: string) => void;
  onSelect: (scope: AutomationScope) => void;
}) {
  const [collapsedRows, setCollapsedRows] = useState<Record<string, boolean>>({});
  const filteredWorkspaces = workspaces
    .filter((w) => !currentWorkspaceId || w.id === currentWorkspaceId)
    .filter((w) => !search || w.name.toLowerCase().includes(search.toLowerCase()));

  const toggleRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderItem = (
    item: any,
    type: AutomationScope["contextType"],
    icon: React.ReactNode,
    indentLevel = 1,
    children: React.ReactNode = null,
    hasChildren = false,
    rowId: string,
    extra?: Partial<AutomationScope>,
  ) => {
    const isExpanded = !collapsedRows[rowId] || !!search;
    const isSelected = selectedScope.contextType === type && selectedScope.contextId === item.id;
    return (
      <div key={`${type}-${item.id}`} className="space-y-0.5 w-full">
        <div
          className={cn(
            "group/item w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-left transition-all cursor-pointer relative",
            indentLevel === 1 && "pl-6",
            indentLevel === 2 && "pl-10",
            indentLevel === 3 && "pl-14",
            isSelected ? "bg-zinc-100 text-zinc-900 font-semibold" : "hover:bg-zinc-100/80 text-zinc-600 hover:text-zinc-900 font-medium",
          )}
          onClick={() =>
            onSelect({
              workspaceId: extra?.workspaceId,
              teamId: type === "TEAM" ? item.id : extra?.teamId,
              spaceId: type === "SPACE" ? item.id : extra?.spaceId,
              projectId: type === "PROJECT" ? item.id : extra?.projectId,
              folderId: type === "FOLDER" ? item.id : extra?.folderId,
              listId: type === "LIST" || type === "PERSONAL" ? item.id : extra?.listId,
              contextType: type,
              contextId: item.id,
              contextName: item.name,
            })
          }
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="relative flex items-center justify-center h-5 w-5 shrink-0">
              <span className={cn("flex items-center justify-center", hasChildren && "group-hover/item:hidden")}>
                {icon}
              </span>
              {hasChildren && (
                <div
                  className="hidden group-hover/item:flex items-center justify-center h-5 w-5 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors"
                  onClick={(e) => toggleRow(rowId, e)}
                >
                  <Play className={cn("h-2.5 w-2.5 fill-zinc-700 text-zinc-700 transition-transform duration-200", isExpanded && "rotate-90")} />
                </div>
              )}
            </div>
            <span className="truncate">{item.name}</span>
          </div>
        </div>
        {isExpanded && children && <div className="space-y-0.5">{children}</div>}
      </div>
    );
  };

  return (
    <div className="flex flex-col max-h-[400px]">
      <div className="p-3 border-b border-zinc-100 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2 px-3 h-8 bg-zinc-50 border border-zinc-200 rounded-lg transition-colors focus-within:border-zinc-400">
          <Search className="h-3.5 w-3.5 text-zinc-400" />
          <Input
            variant="ghost"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search locations..."
            className="border-0 bg-transparent p-0 h-full focus:outline-none focus:ring-0 text-xs shadow-none"
          />
        </div>
      </div>
      <div className="overflow-y-auto p-2 space-y-1" onWheel={(e) => e.stopPropagation()}>
        {lists
          .filter((l) => !l.spaceId && !l.projectId && !l.folderId)
          .slice(0, 1)
          .map((personal) => (
            <div key={`personal-${personal.id}`} className="space-y-0.5 w-full">
              <div
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer",
                  selectedScope.contextType === "PERSONAL" && selectedScope.contextId === personal.id
                    ? "bg-zinc-100 text-zinc-900 font-semibold"
                    : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900",
                )}
                onClick={() =>
                  onSelect({
                    workspaceId: currentWorkspaceId,
                    listId: personal.id,
                    contextType: "PERSONAL",
                    contextId: personal.id,
                    contextName: "Personal List",
                  })
                }
              >
                <div className="h-4 w-4 rounded bg-purple-50 flex items-center justify-center shrink-0">
                  <Users className="h-3 w-3 text-purple-600 shrink-0" />
                </div>
                <span>Personal List</span>
              </div>
            </div>
          ))}
        {filteredWorkspaces.map((ws: any) => {
          const wsTeams = teams?.filter((t: any) => t.workspaceId === ws.id) || [];
          const wsSpaces = spaces.filter((s: any) => s.workspaceId === ws.id);
          const wsProjects = projects.filter((p: any) => p.workspaceId === ws.id && !p.spaceId);
          const wsFolders = folders?.filter((f: any) => f.workspaceId === ws.id && !f.spaceId && !f.projectId) || [];
          const wsLists = lists?.filter((l: any) => l.workspaceId === ws.id && !l.spaceId && !l.projectId && !l.folderId) || [];
          const hasChildren = wsTeams.length > 0 || wsSpaces.length > 0 || wsProjects.length > 0 || wsFolders.length > 0 || wsLists.length > 0;
          const isExpanded = !collapsedRows[ws.id] || !!search;
          return (
            <div key={ws.id} className="space-y-0.5 w-full">
              <div
                className="group/ws w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-left transition-all cursor-pointer relative hover:bg-zinc-100/80 text-zinc-600 hover:text-zinc-900 font-medium"
                onClick={() =>
                  onSelect({
                    workspaceId: ws.id,
                    contextType: "WORKSPACE",
                    contextId: ws.id,
                    contextName: ws.name,
                  })
                }
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="relative flex items-center justify-center h-5 w-5 shrink-0">
                    <span className={cn("flex items-center justify-center", hasChildren && "group-hover/ws:hidden")}>
                      <WorkspaceIcon icon={ws.avatar ?? null} size={18} className="text-zinc-400" />
                    </span>
                    {hasChildren && (
                      <div
                        className="hidden group-hover/ws:flex items-center justify-center h-5 w-5 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors"
                        onClick={(e) => toggleRow(ws.id, e)}
                      >
                        <Play className={cn("h-2.5 w-2.5 fill-zinc-700 text-zinc-700 transition-transform duration-200", isExpanded && "rotate-90")} />
                      </div>
                    )}
                  </div>
                  <span className="truncate">{ws.name}</span>
                </div>
              </div>
              {isExpanded && (
                <div className="space-y-0.5">
                  {wsTeams.map((team: any) =>
                    renderItem(
                      team,
                      "TEAM",
                      <div className="h-4 w-4 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                        <Users size={12} className="text-emerald-600" />
                      </div>,
                      1,
                      null,
                      false,
                      team.id,
                      { workspaceId: ws.id }
                    ),
                  )}
                  {wsSpaces.map((space: any) => {
                    const spaceProjects = projects.filter((p: any) => p.spaceId === space.id);
                    const spaceFolders = folders?.filter((f: any) => f.spaceId === space.id && !f.projectId) || [];
                    const spaceLists = lists?.filter((l: any) => l.spaceId === space.id && !l.projectId && !l.folderId) || [];
                    const renderFolder = (folder: any, level: number) => {
                      const folderLists = lists?.filter((l: any) => l.folderId === folder.id) || [];
                      return renderItem(
                        folder,
                        "FOLDER",
                        <div className="h-4 w-4 rounded bg-blue-50 flex items-center justify-center shrink-0">
                          <Folder size={12} className="text-blue-600" />
                        </div>,
                        level,
                        folderLists.map((list: any) =>
                          renderItem(
                            list,
                            "LIST",
                            <div className="h-4 w-4 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                              <List size={12} className="text-emerald-600" />
                            </div>,
                            level + 1,
                            null,
                            false,
                            list.id,
                            {
                              workspaceId: ws.id,
                              spaceId: space.id,
                              folderId: folder.id,
                            }
                          ),
                        ),
                        folderLists.length > 0,
                        folder.id,
                        { workspaceId: ws.id, spaceId: space.id },
                      );
                    };
                    const renderProject = (project: any, level: number) => {
                      const projectFolders = folders?.filter((f: any) => f.projectId === project.id) || [];
                      const projectLists = lists?.filter((l: any) => l.projectId === project.id && !l.folderId) || [];
                      return renderItem(
                        project,
                        "PROJECT",
                        <div className="h-4 w-4 rounded bg-purple-50 flex items-center justify-center shrink-0">
                          <Briefcase size={12} className="text-purple-600" />
                        </div>,
                        level,
                        <>
                          {projectFolders.map((f: any) => renderFolder(f, level + 1))}
                          {projectLists.map((l: any) =>
                            renderItem(
                              l,
                              "LIST",
                              <div className="h-4 w-4 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                                <List size={12} className="text-emerald-600" />
                              </div>,
                              level + 1,
                              null,
                              false,
                              l.id,
                              {
                                workspaceId: ws.id,
                                spaceId: space.id,
                                projectId: project.id,
                              }
                            ),
                          )}
                        </>,
                        projectFolders.length > 0 || projectLists.length > 0,
                        project.id,
                        { workspaceId: ws.id, spaceId: space.id },
                      );
                    };
                    return renderItem(
                      space,
                      "SPACE",
                      <div className="relative h-4 w-4 rounded shrink-0 flex items-center justify-center">
                        <span
                          className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center bg-indigo-500 text-white"
                          style={{ backgroundColor: space.color || "#6366f1" }}
                        >
                          <SpaceIcon icon={space.icon} size={11} className="text-white" fill />
                        </span>
                      </div>,
                      1,
                      <>
                        {spaceProjects.map((p: any) => renderProject(p, 2))}
                        {spaceFolders.map((f: any) => renderFolder(f, 2))}
                        {spaceLists.map((l: any) =>
                          renderItem(
                            l,
                            "LIST",
                            <div className="h-4 w-4 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                              <List size={12} className="text-emerald-600" />
                            </div>,
                            2,
                            null,
                            false,
                            l.id,
                            {
                              workspaceId: ws.id,
                              spaceId: space.id,
                            }
                          ),
                        )}
                      </>,
                      spaceProjects.length > 0 || spaceFolders.length > 0 || spaceLists.length > 0,
                      space.id,
                      { workspaceId: ws.id },
                    );
                  })}
                  {wsProjects.map((project: any) =>
                    renderItem(
                      project,
                      "PROJECT",
                      <div className="h-4 w-4 rounded bg-purple-50 flex items-center justify-center shrink-0">
                        <Briefcase size={12} className="text-purple-600" />
                      </div>,
                      1,
                      null,
                      false,
                      project.id,
                      { workspaceId: ws.id },
                    ),
                  )}
                  {wsFolders.map((folder: any) =>
                    renderItem(
                      folder,
                      "FOLDER",
                      <div className="h-4 w-4 rounded bg-blue-50 flex items-center justify-center shrink-0">
                        <Folder size={12} className="text-blue-600" />
                      </div>,
                      1,
                      null,
                      false,
                      folder.id,
                      { workspaceId: ws.id }
                    ),
                  )}
                  {wsLists.map((list: any) =>
                    renderItem(
                      list,
                      "LIST",
                      <div className="h-4 w-4 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                        <List size={12} className="text-emerald-600" />
                      </div>,
                      1,
                      null,
                      false,
                      list.id,
                      { workspaceId: ws.id }
                    ),
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  children,
}: {
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 h-8 rounded-full border px-3 text-xs font-medium cursor-pointer",
            active ? "bg-zinc-200 border-zinc-300 text-zinc-800" : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200",
          )}
        >
          {label}
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ManageAutomationsModal({
  open,
  onOpenChange,
  scope,
  builderRequest,
  onBuilderRequestHandled,
  onAskBrain,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  scope: AutomationScope;
  builderRequest?: BuilderState | null;
  onBuilderRequestHandled?: () => void;
  onAskBrain?: () => void;
}) {
  const [tab, setTab] = useState("browse");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [builder, setBuilder] = useState<BuilderState | null>(null);
  const [webhookBuilder, setWebhookBuilder] = useState<WebhookBuilderState | null>(null);
  const [isActive, setIsActive] = useState<boolean | undefined>(true);
  const [triggerTypes, setTriggerTypes] = useState<string[]>([]);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [updatedByIds, setUpdatedByIds] = useState<string[]>([]);
  const [sort, setSort] = useState<"updated" | "name" | "created">("updated");
  const [sortDesc, setSortDesc] = useState(true);
  const [sortSearchQuery, setSortSearchQuery] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedScope, setSelectedScope] = useState<AutomationScope>(scope);
  const [activityLocation, setActivityLocation] = useState<AutomationScope | null>(scope);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const list = trpc.automation.list.useQuery(
    {
      workspaceId: scope.workspaceId || "",
      spaceId: selectedScope.spaceId,
      teamId: selectedScope.teamId,
      projectId: selectedScope.projectId,
      folderId: selectedScope.folderId,
      listId: selectedScope.listId,
      search: search || undefined,
      isActive,
      triggerTypes: triggerTypes.length > 0 ? (triggerTypes as any) : undefined,
      actionTypes: actionTypes.length > 0 ? (actionTypes as any) : undefined,
      ownerIds: updatedByIds.length > 0 ? (updatedByIds as any) : undefined,
      sort,
      sortDesc,
    },
    { enabled: open && !!scope.workspaceId && !builder },
  );
  const locationQueriesEnabled = open && (tab === "manage" || tab === "activity") && !!scope.workspaceId && !builder;
  const workspacesListData = trpc.workspace.list.useQuery(
    { scope: "all", page: 1, pageSize: 50 } as any,
    { enabled: locationQueriesEnabled },
  );
  const spacesData = trpc.space.list.useQuery(
    { workspaceId: scope.workspaceId, includeCounts: false } as any,
    { enabled: locationQueriesEnabled },
  );
  const projectsData = trpc.project.list.useQuery(
    { workspaceId: scope.workspaceId } as any,
    { enabled: locationQueriesEnabled },
  );
  const foldersData = trpc.folder.byContext.useQuery(
    { workspaceId: scope.workspaceId, archived: false } as any,
    { enabled: locationQueriesEnabled },
  );
  const listsData = trpc.list.byContext.useQuery(
    { workspaceId: scope.workspaceId, archived: false } as any,
    { enabled: locationQueriesEnabled },
  );
  const teamsData = trpc.team.list.useQuery(
    { workspaceId: scope.workspaceId } as any,
    { enabled: locationQueriesEnabled },
  );
  const workspaceMembers = trpc.workspace.getMembers.useQuery(
    { id: scope.workspaceId || "" },
    { enabled: open && tab === "manage" && !!scope.workspaceId && !builder },
  );
  const people = (workspaceMembers.data ?? []).map((m: any) => m.user).filter(Boolean);
  const workspaces = (workspacesListData.data?.items ?? []) as any[];
  const spaces = (spacesData.data?.items ?? []) as any[];
  const projects = (projectsData.data?.items ?? []) as any[];
  const folders = (foldersData.data?.items ?? []) as any[];
  const lists = (listsData.data?.items ?? []) as any[];
  const teams = (teamsData.data?.items ?? []) as any[];

  useEffect(() => {
    if (open && builderRequest) {
      setBuilder(builderRequest);
      onBuilderRequestHandled?.();
    }
  }, [open, builderRequest, onBuilderRequestHandled]);

  useEffect(() => {
    if (!open) {
      setBuilder(null);
      setWebhookBuilder(null);
      setTab("browse");
      setSearch("");
      setSearchOpen(false);
      setLocationSearch("");
      setSelectedScope(scope);
      setActivityLocation(scope);
    }
  }, [open, scope]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const openCreate = (mode: "classic" | "agent", initialTemplate?: BrowseTemplate | null) => {
    setBuilder({ mode, editingId: null, initialTemplate: initialTemplate ?? null });
  };

  const openEdit = (id: string, mode: "classic" | "agent") => {
    setBuilder({ mode, editingId: id, initialTemplate: null });
  };

  const closeBuilder = () => {
    setBuilder(null);
    list.refetch();
  };

  const openWebhookCreate = () => {
    setWebhookBuilder({ editingId: null });
  };

  const openWebhookEdit = (id: string) => {
    setWebhookBuilder({ editingId: id });
  };

  const closeWebhookBuilder = () => {
    setWebhookBuilder(null);
  };

  const allCount = list.data?.items?.length ?? 0;
  const activeCount = (list.data?.items ?? []).filter((a: any) => a.isActive).length;
  const inactiveCount = allCount - activeCount;

  const triggerLabel =
    triggerTypes.length === 1
      ? TRIGGER_META.find((t) => t.type === triggerTypes[0])?.label ?? "Trigger"
      : "Triggers";
  const actionLabel =
    actionTypes.length === 1
      ? ACTION_META.find((a) => a.type === actionTypes[0])?.label ?? "Action"
      : actionTypes.length > 1
        ? `Actions (${actionTypes.length})`
        : "Actions";
  const updatedByLabel = updatedByIds.length === 0 ? "Updated by" : `Updated by (${updatedByIds.length})`;
  const activeLabel =
    isActive === true
      ? `Active (${list.data?.activeCount ?? 0})`
      : isActive === false
        ? "Inactive"
        : "All";
  const sortLabel = sort === "name" ? "Task name" : sort === "created" ? "Date created" : "Date updated";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("p-0 overflow-hidden", "max-w-7xl sm:max-w-7xl")} showCloseButton={false}>
        <VisuallyHidden>
          <DialogTitle>
            {builder ? "Automation builder" : webhookBuilder ? "Create webhook" : "Automations"}
          </DialogTitle>
        </VisuallyHidden>

        {builder ? (
          <AutomationBuilderContent
            scope={selectedScope}
            mode={builder.mode}
            editingId={builder.editingId}
            initialTemplate={builder.initialTemplate}
            onBack={closeBuilder}
            onSaved={closeBuilder}
            onAskBrain={onAskBrain}
          />
        ) : webhookBuilder ? (
          <CreateWebhookContent
            scope={scope}
            editingId={webhookBuilder.editingId}
            onBack={closeWebhookBuilder}
            onSaved={closeWebhookBuilder}
          />
        ) : (
          <div className="flex flex-col h-[640px]">
            {/* Header: title left, tabs centered, close button right */}
            <div className="relative flex items-center h-12 px-5 border-b">
              <div className="flex items-center gap-2 shrink-0">
                <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                <h2 className="font-semibold text-sm">Automations</h2>
              </div>

              <Tabs value={tab} onValueChange={setTab} className="absolute left-1/2 -translate-x-1/2 gap-0">
                <TabsList className="h-auto w-auto justify-center rounded-none bg-transparent p-0 gap-5">
                  {TAB_ITEMS.map((item) => (
                    <TabsTrigger
                      key={item.value}
                      value={item.value}
                      className="rounded-none border-0 border-b-2 border-transparent bg-transparent shadow-none px-0 py-1.5 text-sm font-medium cursor-pointer data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-zinc-500 hover:text-zinc-800 data-[state=active]:text-zinc-800"
                    >
                      <span className="rounded-md px-2 py-2 hover:bg-zinc-100">{item.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="ml-auto shrink-0 h-6 w-6 rounded-full border border-zinc-200 bg-white flex items-center justify-center text-zinc-500 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <Tabs value={tab} onValueChange={setTab} className="flex-1 min-h-0 gap-0">
              <TabsContent value="browse" className="mt-0 h-full overflow-hidden">
                <BrowseAutomations
                  scope={scope}
                  onCreate={openCreate}
                  onApplied={(id, mode) => openEdit(id, mode)}
                />
              </TabsContent>

              <TabsContent value="manage" className="mt-0 h-full overflow-y-auto px-5 pb-5 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-between min-w-[220px] h-9 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                      >
                        <span className="truncate">{selectedScope.contextName}</span>
                        <ChevronDown className="h-4 w-4 ml-3 shrink-0 text-zinc-500" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[420px] p-0">
                      <LocationPickerContent
                        currentWorkspaceId={scope.workspaceId}
                        selectedScope={selectedScope}
                        workspaces={workspaces}
                        spaces={spaces}
                        projects={projects}
                        folders={folders}
                        lists={lists}
                        teams={teams}
                        search={locationSearch}
                        onSearch={setLocationSearch}
                        onSelect={setSelectedScope}
                      />
                    </PopoverContent>
                  </Popover>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="bg-zinc-900 hover:bg-zinc-700 text-white h-8 cursor-pointer">
                        Add Automation <ChevronDown className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => openCreate("classic")}>
                        <Zap className="h-4 w-4 text-sky-600" />
                        Classic
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer justify-between" onClick={() => openCreate("agent")}>
                        <span className="flex items-center gap-2">
                          <AgentIcon className="h-4 w-4 text-violet-600" />
                          Agent
                        </span>
                        <Badge variant="secondary" className="text-[10px] px-1 py-1 h-4 bg-violet-100 text-violet-700 border-0">
                          New
                        </Badge>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-2 mt-3 mb-3 flex-wrap">
                  <FilterChip label={activeLabel} active={isActive !== true}>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => setIsActive(undefined)}>All ({allCount})</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => setIsActive(true)}>Active ({activeCount})</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => setIsActive(false)}>Inactive ({inactiveCount})</DropdownMenuItem>
                  </FilterChip>
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="flex items-center gap-2 flex-wrap cursor-pointer">
                        {triggerTypes.length === 0 ? (
                          <div className="inline-flex items-center gap-1 h-8 rounded-full border px-3 text-xs font-medium cursor-pointer bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200">
                            {triggerLabel}
                            <ChevronDown className="h-3 w-3" />
                          </div>
                        ) : (
                          <>
                            {triggerTypes.map((tt) => {
                              const lbl = TRIGGER_META.find((t) => t.type === tt)?.label ?? tt;
                              return (
                                <button
                                  key={tt}
                                  type="button"
                                  className="inline-flex items-center gap-1 h-8 rounded-full border px-3 text-xs font-medium cursor-pointer bg-zinc-200 border-zinc-300 text-zinc-800"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span>{lbl}</span>
                                  <span
                                    role="button"
                                    aria-label="Remove trigger"
                                    className="ml-1 h-5 w-5 rounded-full inline-flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTriggerTypes((prev) => prev.filter((x) => x !== tt));
                                    }}
                                  >
                                    ×
                                  </span>
                                </button>
                              );
                            })}
                            <div className="inline-flex items-center gap-1 h-8 rounded-full border px-3 text-xs font-medium cursor-pointer bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200">
                              <ChevronDown className="h-3 w-3" />
                            </div>
                          </>
                        )}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-72 p-0">
                      <div className="p-3 border-b flex items-center justify-between">
                        <p className="text-xs font-semibold text-zinc-500 uppercase">Triggers</p>
                        <button
                          type="button"
                          className="text-xs text-violet-700 hover:text-violet-900 cursor-pointer"
                          onClick={() => {
                            if (triggerTypes.length === 0) setTriggerTypes(TRIGGER_META.map((t) => t.type));
                            else setTriggerTypes([]);
                          }}
                        >
                          {triggerTypes.length === 0 ? "Select all" : "Unselect all"}
                        </button>
                      </div>
                      <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                        {TRIGGER_META.map((t) => {
                          const checked = triggerTypes.includes(t.type);
                          return (
                            <label
                              key={t.type}
                              className="flex items-center gap-2 px-2 py-2 rounded cursor-pointer hover:bg-zinc-50"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const on = e.target.checked;
                                  setTriggerTypes((prev) => {
                                    if (on) return Array.from(new Set([...prev, t.type]));
                                    return prev.filter((x) => x !== t.type);
                                  });
                                }}
                              />
                              <span className="text-sm text-zinc-700">{t.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="flex items-center gap-2 flex-wrap cursor-pointer">
                        {actionTypes.length === 0 ? (
                          <div className="inline-flex items-center gap-1 h-8 rounded-full border px-3 text-xs font-medium cursor-pointer bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200">
                            Actions
                            <ChevronDown className="h-3 w-3" />
                          </div>
                        ) : (
                          <>
                            {actionTypes.map((aa) => {
                              const lbl = ACTION_META.find((a) => a.type === aa)?.label ?? aa;
                              return (
                                <button
                                  key={aa}
                                  type="button"
                                  className="inline-flex items-center gap-1 h-8 rounded-full border px-3 text-xs font-medium cursor-pointer bg-zinc-200 border-zinc-300 text-zinc-800"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span>{lbl}</span>
                                  <span
                                    role="button"
                                    aria-label="Remove action"
                                    className="ml-1 h-5 w-5 rounded-full inline-flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActionTypes((prev) => prev.filter((x) => x !== aa));
                                    }}
                                  >
                                    ×
                                  </span>
                                </button>
                              );
                            })}
                            <div className="inline-flex items-center gap-1 h-8 rounded-full border px-3 text-xs font-medium cursor-pointer bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200">
                              <ChevronDown className="h-3 w-3" />
                            </div>
                          </>
                        )}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-80 p-0">
                      <div className="p-3 border-b flex items-center justify-between">
                        <p className="text-xs font-semibold text-zinc-500 uppercase">Actions</p>
                        <button
                          type="button"
                          className="text-xs text-violet-700 hover:text-violet-900 cursor-pointer"
                          onClick={() => {
                            const options = ACTION_META.filter((a) => !a.comingSoon).map((a) => a.type);
                            if (actionTypes.length === 0) setActionTypes(options);
                            else setActionTypes([]);
                          }}
                        >
                          {actionTypes.length === 0 ? "Select all" : "Unselect all"}
                        </button>
                      </div>
                      <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                        {ACTION_META.filter((a) => !a.comingSoon).map((a) => {
                          const checked = actionTypes.includes(a.type);
                          return (
                            <label
                              key={a.type}
                              className="flex items-center gap-2 px-2 py-2 rounded cursor-pointer hover:bg-zinc-50"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const on = e.target.checked;
                                  setActionTypes((prev) => {
                                    if (on) return Array.from(new Set([...prev, a.type]));
                                    return prev.filter((x) => x !== a.type);
                                  });
                                }}
                              />
                              <span className="text-sm text-zinc-700">{a.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="flex items-center gap-2 flex-wrap cursor-pointer">
                        {updatedByIds.length === 0 ? (
                          <div className="inline-flex items-center gap-1 h-8 rounded-full border px-3 text-xs font-medium cursor-pointer bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200">
                            {updatedByLabel}
                            <UserRound className="h-3.5 w-3.5 opacity-70" />
                          </div>
                        ) : (
                          <>
                            {updatedByIds.map((userId) => {
                              const person = people.find((p: any) => p.id === userId);
                              const label = person?.name || "Unknown";
                              return (
                                <button
                                  key={userId}
                                  type="button"
                                  className="inline-flex items-center gap-2 h-8 rounded-full border px-2.5 text-xs font-medium cursor-pointer bg-zinc-200 border-zinc-300 text-zinc-800"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage src={person?.image || undefined} />
                                    <AvatarFallback className="text-[9px] font-semibold bg-zinc-200 text-zinc-700">
                                      {label.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{label}</span>
                                  <span
                                    role="button"
                                    aria-label="Remove updated by filter"
                                    className="h-5 w-5 rounded-full inline-flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setUpdatedByIds((prev) => prev.filter((x) => x !== userId));
                                    }}
                                  >
                                    ×
                                  </span>
                                </button>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[360px] p-0">
                      <Command>
                        <div className="p-2 pb-0">
                          <CommandInput
                            placeholder="Search or enter email..."
                            className="h-8 text-xs outline-none focus:ring-0"
                            wrapperClassName="border border-zinc-200 rounded-md focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 bg-white"
                          />
                        </div>
                        <CommandList className="max-h-[350px] overflow-y-auto py-2">
                          <CommandEmpty>No people found.</CommandEmpty>
                          <CommandGroup>
                            {people.map((person: any, idx: number) => {
                              const selected = updatedByIds.includes(person.id);
                              const colorClasses = [
                                { bg: "bg-blue-100", text: "text-blue-700", ring: "ring-blue-200" },
                                { bg: "bg-purple-100", text: "text-purple-700", ring: "ring-purple-200" },
                                { bg: "bg-pink-100", text: "text-pink-700", ring: "ring-pink-200" },
                                { bg: "bg-green-100", text: "text-green-700", ring: "ring-green-200" },
                                { bg: "bg-orange-100", text: "text-orange-700", ring: "ring-orange-200" },
                              ];
                              const colorSet = colorClasses[idx % colorClasses.length];
                              return (
                                <CommandItem
                                  key={person.id}
                                  value={`${person.name || ""} ${person.email || ""} ${person.id}`}
                                  onSelect={() =>
                                    setUpdatedByIds((prev) =>
                                      prev.includes(person.id)
                                        ? prev.filter((x) => x !== person.id)
                                        : [...prev, person.id],
                                    )
                                  }
                                  className="mx-2 flex items-center justify-between rounded-md px-3 py-2 cursor-pointer"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <Avatar className={cn("h-7 w-7 ring-2 shrink-0", colorSet.ring)}>
                                      <AvatarImage src={person.image || undefined} />
                                      <AvatarFallback className={cn("text-[10px] font-semibold", colorSet.bg, colorSet.text)}>
                                        {(person.name || "Me").substring(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm text-zinc-900">{person.name || "Me"}</p>
                                      {person.email && <p className="truncate text-[11px] text-zinc-400">{person.email}</p>}
                                    </div>
                                  </div>
                                  {selected && <Check className="h-4 w-4 text-violet-600 shrink-0" />}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <div className="h-5 w-px bg-zinc-200 mx-1" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 h-8 rounded-full border border-zinc-200 bg-zinc-100 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-200 cursor-pointer"
                      >
                        {sortDesc ? (
                          <ArrowDown className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowUp className="h-3.5 w-3.5" />
                        )}
                        <span>{`Sort: ${sortLabel}`}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="bottom" align="start" className="w-[240px] p-1.5 rounded-xl shadow-xl border-zinc-200/60" sideOffset={10}>
                      <div className="px-2 py-1.5">
                        <span className="text-xs font-medium text-zinc-400 tracking-widest">Sort By</span>
                      </div>
                      <div className="px-1 mb-2.5">
                        <div className="relative border border-zinc-300 rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-violet-500 focus-within:border-violet-500">
                          <input
                            type="text"
                            placeholder="Search..."
                            value={sortSearchQuery}
                            onChange={(e) => setSortSearchQuery(e.target.value)}
                            className="w-full text-sm pl-2 pr-2 py-1.5 outline-none placeholder:text-zinc-400"
                          />
                        </div>
                      </div>
                      <div className="h-px bg-zinc-100" />
                      <ScrollArea className="h-[220px] py-3">
                        <div className="space-y-0.5 px-1">
                          {[
                            { id: "created" as const, label: "Date created" },
                            { id: "updated" as const, label: "Date updated" },
                            { id: "name" as const, label: "Task name" },
                          ]
                            .filter((opt) => opt.label.toLowerCase().includes(sortSearchQuery.toLowerCase()))
                            .map((opt) => {
                              const isSelected = sort === opt.id;
                              return (
                                <div
                                  key={opt.id}
                                  className="flex items-center justify-between px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors group/item text-zinc-700 bg-white hover:bg-zinc-100"
                                  onClick={() => {
                                    if (sort !== opt.id) {
                                      setSort(opt.id);
                                      setSortDesc(opt.id === "name" ? false : true);
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    {isSelected && (
                                      <div
                                        className="flex flex-col items-center justify-center h-[18px] w-[18px] bg-zinc-100 rounded hover:bg-zinc-200 transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSortDesc((d) => !d);
                                        }}
                                      >
                                        <div className="flex flex-col items-center -space-y-1">
                                          <ChevronUp
                                            className={cn(
                                              "h-[14px] w-[14px]",
                                              sortDesc ? "text-violet-300" : "text-violet-500",
                                            )}
                                          />
                                          <ChevronDown
                                            className={cn(
                                              "h-[14px] w-[14px]",
                                              sortDesc ? "text-violet-500" : "text-violet-300",
                                            )}
                                          />
                                        </div>
                                      </div>
                                    )}
                                    {!isSelected && <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400" />}
                                    <span>{opt.label}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-zinc-500">
                                    {isSelected && <Check className="h-4 w-4 text-violet-600" />}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                  <div className="ml-auto">
                    {searchOpen ? (
                      <div className="flex items-center gap-2 px-3 h-8 w-64 bg-white border border-zinc-200 rounded-md focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20">
                        <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <Input
                          ref={searchInputRef}
                          variant="ghost"
                          className="flex-1 h-full border-0 p-0 shadow-none focus-visible:ring-0 text-sm bg-transparent placeholder:text-zinc-400 border-transparent focus:outline-none focus:ring-0"
                          placeholder="Search automations..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                        <button
                          type="button"
                          className="cursor-pointer p-1 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                          onClick={() => {
                            setSearch("");
                            setSearchOpen(false);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSearchOpen(true)}
                        className="inline-flex items-center gap-1.5 h-8 rounded-md border border-zinc-200 bg-zinc-100 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-200 cursor-pointer"
                      >
                        <Search className="h-3.5 w-3.5" />
                        Search
                      </button>
                    )}
                  </div>
                </div>

                <div className="divide-y border rounded-lg">
                  {(list.data?.items ?? []).map((rule: any) => (
                    <AutomationListItem
                      key={rule.id}
                      rule={rule}
                      onEdit={() => openEdit(rule.id, rule.kind === "AGENT" ? "agent" : "classic")}
                    />
                  ))}
                  {(list.data?.items ?? []).length === 0 && (
                    <p className="p-8 text-sm text-center text-zinc-500">No automations yet</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="activity" className="mt-0 h-full overflow-hidden">
                <ActivityAutomations
                  workspaceId={scope.workspaceId}
                  locationScope={activityLocation}
                  onLocationChange={setActivityLocation}
                  locationPicker={
                    <LocationPickerContent
                      currentWorkspaceId={scope.workspaceId}
                      selectedScope={activityLocation ?? {
                        workspaceId: scope.workspaceId,
                        contextType: "WORKSPACE",
                        contextId: scope.workspaceId || "",
                        contextName: "",
                      }}
                      workspaces={workspaces}
                      spaces={spaces}
                      projects={projects}
                      folders={folders}
                      lists={lists}
                      teams={teams}
                      search={locationSearch}
                      onSearch={setLocationSearch}
                      onSelect={(next) => setActivityLocation(next)}
                    />
                  }
                />
              </TabsContent>

              <TabsContent value="webhooks" className="mt-0 h-full overflow-hidden">
                <WebhooksTab
                  onCreate={openWebhookCreate}
                  onEdit={openWebhookEdit}
                />
              </TabsContent>

              <TabsContent value="recurring" className="mt-0 h-full overflow-hidden">
                <RecurringAutomations workspaceId={scope.workspaceId} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}