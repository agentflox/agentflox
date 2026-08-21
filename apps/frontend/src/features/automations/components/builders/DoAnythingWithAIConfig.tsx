"use client";

import React, { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sparkles, Info, Plus, Users, ChevronDown, ChevronRight, CheckCircle2, MinusCircle, FileText, CircleDot, Check, Hash, Clock, Network, Briefcase, Building2, Folder as FolderIconLucide, Globe, Wrench, User, ListChecks, Lock, X, Database, Trash2, Search, AtSign, Flag, BookOpen } from "lucide-react";
import { IntegrationBrandImage } from "@/features/integrations/components/IntegrationBrandImage";
import { useIntegrationCatalog } from "@/features/integrations/hooks/useIntegrationCatalog";
import { trpc } from "@/lib/trpc";
import type { AutomationScope } from "../../types";
import { Popover as EmojiPopover, PopoverContent as EmojiPopoverContent, PopoverTrigger as EmojiPopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { ToolsSelectionModal } from "@/entities/agents/components/tabs/ToolsSelectionModal";
import { cn } from "@/lib/utils";
import type { ActionConfigState } from "./action-config-types";
import { ToolBlockCard } from "./ToolBlockCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

export function DoAnythingWithAIConfig({
  config,
  onChange,
  scope,
  onAskBrain,
}: {
  config: ActionConfigState;
  onChange: (next: ActionConfigState) => void;
  scope: AutomationScope;
  onAskBrain?: () => void;
}) {
  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  const [spacesPopoverOpen, setSpacesPopoverOpen] = useState(false);
  const [itemsPopoverOpen, setItemsPopoverOpen] = useState(false);
  const [addConnectionOpen, setAddConnectionOpen] = useState(false);
  const [spaceSearch, setSpaceSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [itemTab, setItemTab] = useState<"tasks" | "docs" | "chats">("tasks");
  const [browseMode, setBrowseMode] = useState(false);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  const { data: spacesData } = trpc.space.list.useQuery(
    { workspaceId: scope.workspaceId || "" },
    { enabled: !!scope.workspaceId }
  );
  const spaces = spacesData?.items || [];

  const { data: tasksData } = trpc.task.list.useQuery(
    { workspaceId: scope.workspaceId || undefined, scope: "all", pageSize: 50, includeRelations: true },
    { enabled: !!scope.workspaceId }
  );

  const { data: browseTasksData } = trpc.task.list.useQuery(
    { workspaceId: scope.workspaceId || undefined, scope: "all", pageSize: 500, includeRelations: true },
    { enabled: !!scope.workspaceId && itemsPopoverOpen && browseMode }
  );
  const { data: projectsData } = trpc.project.list.useQuery(
    { workspaceId: scope.workspaceId || "" },
    { enabled: !!scope.workspaceId && itemsPopoverOpen && browseMode }
  );
  const { data: teamsData } = trpc.team.list.useQuery(
    { workspaceId: scope.workspaceId || "" },
    { enabled: !!scope.workspaceId && itemsPopoverOpen && browseMode }
  );
  const { data: foldersData } = trpc.folder.byContext.useQuery(
    { workspaceId: scope.workspaceId || "" } as any,
    { enabled: !!scope.workspaceId && itemsPopoverOpen && browseMode }
  );

  const { data: docsData } = trpc.document.list.useQuery(
    { workspaceId: scope.workspaceId || undefined, pageSize: 100 },
    { enabled: !!scope.workspaceId }
  );

  const { data: channelsData } = trpc.channel.list.useQuery(
    { workspaceId: scope.workspaceId || "" } as any,
    { enabled: !!scope.workspaceId, staleTime: 60_000 }
  );

  const { data: listsData } = trpc.list.byContext.useQuery(
    { workspaceId: scope.workspaceId || "" } as any,
    { enabled: !!scope.workspaceId }
  );

  const { data: workspaceData } = trpc.workspace.get.useQuery(
    { id: scope.workspaceId || "" },
    { enabled: !!scope.workspaceId }
  );
  const workspaceName = workspaceData?.name || (workspaceData as any)?.workspace?.name || "Dat nguyen's Workspace";
  const workspaceInitial = (workspaceName || "D").trim().charAt(0).toUpperCase() || "D";

  const { data: systemToolsData } = trpc.tool.systemList.useQuery(undefined, {
    staleTime: 60_000,
  });
  const { data: compositeToolsData } = trpc.compositeTool.list.useQuery(
    { page: 1, pageSize: 100 },
    { staleTime: 60_000 }
  );
  const { providers: catalogProviders = [] } = useIntegrationCatalog();

  const workspaceAccess = config.workspaceAccess ?? true;
  const teamSpaceAccess = config.teamSpaceAccess ?? true;
  const gptSearch = config.externalSearch?.gpt ?? true;
  const clickupHelpSearch = config.externalSearch?.clickupHelp ?? false;
  const webSearch = config.externalSearch?.webSearch ?? false;

  const selectedToolIds = config.toolIds || [];

  const toggleSpace = (spaceId: string) => {
    const current = config.selectedSpaces || [];
    const next = current.includes(spaceId)
      ? current.filter((id) => id !== spaceId)
      : [...current, spaceId];
    onChange({ ...config, selectedSpaces: next });
  };

  const toggleKnowledgeItem = (itemId: string) => {
    const current = config.selectedKnowledgeItems || [];
    const next = current.includes(itemId)
      ? current.filter((id) => id !== itemId)
      : [...current, itemId];
    onChange({ ...config, selectedKnowledgeItems: next });
  };

  const toggleNode = (nodeKey: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeKey)) next.delete(nodeKey);
      else next.add(nodeKey);
      return next;
    });
  };

  const hierarchy = useMemo(() => {
    const allTasks = browseTasksData?.items ?? [];
    const spacesList = spacesData?.items || [];
    const projectsList = projectsData?.items || [];
    const teamsList = teamsData?.items || [];
    const foldersList = Array.isArray(foldersData) ? foldersData : [];
    const listsList = listsData?.items || [];

    // Index tasks by listId
    const tasksByListId = new Map<string, any[]>();
    allTasks.forEach((t: any) => {
      const listId = t.listId ?? t.list?.id;
      if (!listId) return;
      if (!tasksByListId.has(listId)) tasksByListId.set(listId, []);
      tasksByListId.get(listId)!.push(t);
    });

    type TreeNode = {
      kind: "space" | "project" | "team" | "folder" | "list";
      id: string;
      name: string;
      depth: number;
      tasks?: any[];
      children?: TreeNode[];
    };

    const buildListNode = (l: any, depth: number): TreeNode => ({
      kind: "list",
      id: l.id,
      name: l.name,
      depth,
      tasks: tasksByListId.get(l.id) ?? [],
    });

    const buildFolderNode = (f: any, depth: number): TreeNode => ({
      kind: "folder",
      id: f.id,
      name: f.name,
      depth,
      children: listsList.filter((l: any) => l.folderId === f.id).map((l: any) => buildListNode(l, depth + 1)),
    });

    const buildProjectNode = (p: any, depth: number): TreeNode => {
      const pFolders = foldersList.filter((f: any) => f.projectId === p.id);
      const pLists = listsList.filter((l: any) => l.projectId === p.id && !l.folderId);
      return {
        kind: "project",
        id: p.id,
        name: p.name,
        depth,
        children: [
          ...pFolders.map((f: any) => buildFolderNode(f, depth + 1)),
          ...pLists.map((l: any) => buildListNode(l, depth + 1)),
        ],
      };
    };

    const buildTeamNode = (t: any, depth: number): TreeNode => {
      const tProjects = projectsList.filter((p: any) => p.teamId === t.id);
      const tFolders = foldersList.filter((f: any) => f.teamId === t.id && !f.projectId);
      const tLists = listsList.filter((l: any) => l.teamId === t.id && !l.projectId && !l.folderId);
      return {
        kind: "team",
        id: t.id,
        name: t.name,
        depth,
        children: [
          ...tProjects.map((p: any) => buildProjectNode(p, depth + 1)),
          ...tFolders.map((f: any) => buildFolderNode(f, depth + 1)),
          ...tLists.map((l: any) => buildListNode(l, depth + 1)),
        ],
      };
    };

    // Space nodes
    const spaceNodes: TreeNode[] = spacesList.map((space: any) => {
      const spaceFolders = foldersList.filter((f: any) => f.spaceId === space.id && !f.projectId && !f.teamId);
      const spaceProjects = projectsList.filter((p: any) => p.spaceId === space.id && !p.teamId);
      const spaceTeams = teamsList.filter((t: any) => t.spaceId === space.id);
      const spaceLists = listsList.filter((l: any) => l.spaceId === space.id && !l.projectId && !l.teamId && !l.folderId);
      return {
        kind: "space" as const,
        id: space.id,
        name: space.name,
        depth: 0,
        children: [
          ...spaceFolders.map((f: any) => buildFolderNode(f, 1)),
          ...spaceProjects.map((p: any) => buildProjectNode(p, 1)),
          ...spaceTeams.map((t: any) => buildTeamNode(t, 1)),
          ...spaceLists.map((l: any) => buildListNode(l, 1)),
        ],
      };
    });

    // Root nodes
    const rootNodes: TreeNode[] = [
      ...projectsList.filter((p: any) => !p.spaceId && !p.teamId).map((p: any) => buildProjectNode(p, 0)),
      ...teamsList.filter((t: any) => !t.spaceId).map((t: any) => buildTeamNode(t, 0)),
      ...foldersList.filter((f: any) => !f.spaceId && !f.projectId && !f.teamId).map((f: any) => buildFolderNode(f, 0)),
      ...listsList.filter((l: any) => !l.spaceId && !l.projectId && !l.teamId && !l.folderId).map((l: any) => buildListNode(l, 0)),
    ];

    return { spaceNodes, rootNodes };
  }, [browseTasksData?.items, spacesData?.items, projectsData?.items, teamsData?.items, foldersData, listsData?.items]);

  const filteredSpaces = spaces.filter((s: any) =>
    !spaceSearch.trim() || s.name.toLowerCase().includes(spaceSearch.toLowerCase())
  );

  const filteredTasks = (tasksData?.items || []).filter((t: any) =>
    !itemSearch.trim() || (t.title || t.name || "").toLowerCase().includes(itemSearch.toLowerCase())
  );

  const filteredDocs = (docsData?.items || []).filter((d: any) =>
    !itemSearch.trim() || (d.title || d.name || "").toLowerCase().includes(itemSearch.toLowerCase())
  );

  const filteredChannels = (Array.isArray(channelsData) ? channelsData : []).filter((ch: any) =>
    !itemSearch.trim() || (ch.name || "").toLowerCase().includes(itemSearch.toLowerCase())
  );

  const renderBrowseTask = (t: any) => {
    const isSelected = config.selectedKnowledgeItems?.includes(t.id);
    const statusColor = t.status?.color || "#3b82f6";
    return (
      <button
        key={t.id}
        type="button"
        onClick={() => toggleKnowledgeItem(t.id)}
        className={cn(
          "w-full flex items-center gap-2 py-1.5 text-left hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer",
          isSelected && "bg-zinc-100 font-medium"
        )}
        style={{ paddingLeft: "12px", paddingRight: "8px" }}
      >
        <div
          className="w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center"
          style={{ borderColor: statusColor }}
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
        </div>
        <span className="text-[13px] text-zinc-700 truncate flex-1">{t.title || t.name}</span>
        {isSelected && <Check className="h-3.5 w-3.5 text-zinc-900 shrink-0 mr-1" />}
      </button>
    );
  };

  const renderNode = (node: any): React.ReactNode => {
    const nodeKey = `${node.kind}-${node.id}`;
    const isCollapsed = collapsedNodes.has(nodeKey);
    const indent = node.depth * 14 + 8;

    if (node.kind === "list") {
      const hasTasks = node.tasks && node.tasks.length > 0;
      return (
        <div key={nodeKey}>
          <button
            type="button"
            onClick={() => hasTasks && toggleNode(nodeKey)}
            className={cn(
              "w-full flex items-center gap-1.5 py-1.5 text-left rounded transition-colors",
              hasTasks ? "hover:bg-zinc-50 cursor-pointer" : "cursor-default opacity-60"
            )}
            style={{ paddingLeft: `${indent}px`, paddingRight: "8px" }}
          >
            {hasTasks ? (
              isCollapsed ? (
                <ChevronRight className="h-3 w-3 text-zinc-400 shrink-0" />
              ) : (
                <ChevronDown className="h-3 w-3 text-zinc-400 shrink-0" />
              )
            ) : (
              <span className="w-3 shrink-0" />
            )}
            <ListChecks className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span className="text-[12px] font-medium text-zinc-700 truncate flex-1">{node.name}</span>
            {hasTasks && (
              <span className="text-[11px] text-zinc-400 shrink-0 pr-1">{node.tasks.length}</span>
            )}
          </button>
          {hasTasks && !isCollapsed && (
            <div style={{ paddingLeft: `${indent + 12}px` }}>
              {node.tasks.map(renderBrowseTask)}
            </div>
          )}
        </div>
      );
    }

    const hasChildren = node.children && node.children.length > 0;
    const Icon =
      node.kind === "space"
        ? Network
        : node.kind === "project"
          ? Briefcase
          : node.kind === "team"
            ? Building2
            : FolderIconLucide;
    const iconColor =
      node.kind === "space"
        ? "text-indigo-500"
        : node.kind === "project"
          ? "text-indigo-400"
          : node.kind === "team"
            ? "text-blue-400"
            : "text-zinc-400";

    if (node.kind === "space") {
      return (
        <div key={nodeKey} className="space-y-0.5 pt-1">
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-2">
            SPACE
          </div>
          <button
            type="button"
            onClick={() => hasChildren && toggleNode(nodeKey)}
            className="w-full flex items-center justify-between px-2 py-1 text-left rounded-md hover:bg-zinc-50 cursor-pointer"
          >
            <span className="text-[14px] font-bold text-zinc-900">{node.name}</span>
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          </button>
          {hasChildren && !isCollapsed && (
            <div className="space-y-0.5">{node.children.map(renderNode)}</div>
          )}
        </div>
      );
    }

    return (
      <div key={nodeKey}>
        <button
          type="button"
          onClick={() => hasChildren && toggleNode(nodeKey)}
          className={cn(
            "w-full flex items-center gap-1.5 py-1.5 text-left rounded transition-colors",
            hasChildren ? "hover:bg-zinc-50 cursor-pointer" : "cursor-default"
          )}
          style={{ paddingLeft: `${indent}px`, paddingRight: "8px" }}
        >
          {hasChildren ? (
            isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            )
          ) : (
            <span className="w-3.5 shrink-0" />
          )}
          <Icon className={cn("h-3.5 w-3.5 shrink-0", iconColor)} />
          <span className="text-[12px] font-medium text-zinc-700 truncate flex-1">{node.name}</span>
        </button>
        {hasChildren && !isCollapsed && (
          <div>{node.children.map(renderNode)}</div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Instructions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="!text-sm !font-semibold text-zinc-900 !mb-0">
            Instructions<span className="text-red-500">*</span>
          </Label>
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Tell your Agent what to do. Explain how it should use selected Tools and Knowledge, and when and how it should reply.
        </p>

        <div className="rounded-lg border border-zinc-200 bg-white focus-within:border-zinc-300 shadow-xs overflow-hidden">
          <textarea
            className="w-full min-h-[95px] p-3 text-sm outline-none placeholder:text-zinc-400 bg-transparent resize-none"
            placeholder="e.g. Search the Workspace for relevant info and post your answer in a thread"
            value={config.prompt || ""}
            onChange={(e) => onChange({ ...config, prompt: e.target.value })}
          />
          <div className="flex items-center justify-between px-3 py-2 bg-zinc-50/50 border-t border-zinc-100">
            <span className="text-xs text-zinc-400">
              Reference tasks, Docs, people to guide your agent
            </span>
            <button
              type="button"
              className="h-6 w-6 rounded-full border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-800 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
              title="Mention"
            >
              <AtSign className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Knowledge */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
          <Database className="h-4 w-4 text-zinc-500" />
          <span>Knowledge</span>
        </div>
        <p className="text-xs text-zinc-500">
          Specify the data your Agent may search.
        </p>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-4 shadow-xs">
          {/* Workspace Access */}
          <div className="space-y-2.5">
            <div className="text-xs !font-medium text-zinc-900 tracking-wide">
              Workspace Access
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between py-1 hover:bg-zinc-100 px-2 rounded-md cursor-pointer">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-800">
                  <div className="h-4 w-4 rounded bg-emerald-600 flex items-center justify-center text-white text-[9px] font-bold">
                    {workspaceInitial}
                  </div>
                  <span>{workspaceName}</span>
                </div>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center cursor-not-allowed">
                      <Switch
                        className="data-[state=checked]:bg-indigo-600 data-[state=unchecked]:bg-zinc-200 pointer-events-none h-4 w-7"
                        thumbClassName="size-3.5"
                        checked={true}
                        disabled
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={6} className="text-center font-medium max-w-[260px]">
                    Public Workspace knowledge is required for Agents
                  </TooltipContent>
                </Tooltip>
              </div>

              <div
                className="flex items-center justify-between py-1 hover:bg-zinc-100 px-2 rounded-md cursor-pointer"
                onClick={() => onChange({ ...config, teamSpaceAccess: !teamSpaceAccess })}
              >
                <div className="flex items-center gap-2 text-xs text-zinc-700">
                  <Users className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span>
                    <strong className="font-semibold text-zinc-900">Team Space</strong> ﾂｷ tasks, Docs, and Chats
                  </span>
                </div>
                <Switch
                  className="data-[state=checked]:bg-indigo-600 data-[state=unchecked]:bg-zinc-200 pointer-events-none h-4 w-7"
                  thumbClassName="size-3.5"
                  checked={teamSpaceAccess}
                  onCheckedChange={(checked) => onChange({ ...config, teamSpaceAccess: checked })}
                />
              </div>

              {/* Added Spaces, Lists, Tasks, Docs, Chats List */}
              {((config.selectedSpaces && config.selectedSpaces.length > 0) ||
                (config.selectedKnowledgeItems && config.selectedKnowledgeItems.length > 0)) && (
                  <div className="space-y-0.5 pt-0.5">
                    {/* Selected Spaces / Lists */}
                    {(config.selectedSpaces || []).map((spaceId) => {
                      if (spaceId === "personal") {
                        return (
                          <div
                            key="space-personal"
                            className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-zinc-100/80 transition-colors group cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 text-xs text-zinc-800 min-w-0">
                              <svg
                                className="h-4 w-4 text-zinc-600 shrink-0"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <line x1="19" y1="8" x2="21" y2="8" />
                                <line x1="19" y1="12" x2="21" y2="12" />
                                <line x1="19" y1="16" x2="21" y2="16" />
                              </svg>
                              <span className="truncate text-[13px] font-medium text-zinc-900">Personal List</span>
                            </div>
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSpace("personal");
                                    }}
                                    className="h-6 w-6 inline-flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 cursor-pointer transition-colors"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  sideOffset={4}
                                >
                                  Remove
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        );
                      }

                      const matchedSpace = spaces.find((s: any) => s.id === spaceId);
                      const matchedList = (listsData?.items || []).find((l: any) => l.id === spaceId);
                      const name = matchedSpace?.name || matchedList?.name || spaceId;

                      return (
                        <div
                          key={`space-${spaceId}`}
                          className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-zinc-100/80 transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 text-xs text-zinc-800 min-w-0">
                            <svg
                              className="h-4 w-4 text-zinc-600 shrink-0"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 6h10M11 12h10M11 18h10M3 5l2 2 4-4M3 11l2 2 4-4M3 17l2 2 4-4" />
                            </svg>
                            <span className="truncate text-[13px] font-medium text-zinc-900">{name}</span>
                          </div>
                          <TooltipProvider delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSpace(spaceId);
                                  }}
                                  className="h-6 w-6 inline-flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 cursor-pointer transition-colors"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                sideOffset={4}
                              >
                                Remove
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      );
                    })}

                    {/* Selected Knowledge Items (Tasks, Docs, Chats) */}
                    {(config.selectedKnowledgeItems || []).map((itemId) => {
                      const matchedTask =
                        (tasksData?.items || []).find((t: any) => t.id === itemId) ||
                        (browseTasksData?.items || []).find((t: any) => t.id === itemId);
                      const matchedDoc = (docsData?.items || []).find((d: any) => d.id === itemId);
                      const matchedChannel = (Array.isArray(channelsData) ? channelsData : []).find(
                        (ch: any) => ch.id === itemId
                      );

                      let icon = (
                        <CircleDot className="h-4 w-4 text-sky-500 shrink-0" />
                      );
                      let name = itemId;

                      if (matchedTask) {
                        name = matchedTask.title || matchedTask.name || "Untitled Task";
                        const statusColor = matchedTask.status?.color || "#0284c7";
                        icon = (
                          <div
                            className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                            style={{ borderColor: statusColor }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                          </div>
                        );
                      } else if (matchedDoc) {
                        name = matchedDoc.title || matchedDoc.name || "Untitled Doc";
                        icon = (
                          <div className="h-4 w-4 rounded bg-sky-500 text-white flex items-center justify-center shrink-0">
                            <FileText className="h-2.5 w-2.5 text-white" />
                          </div>
                        );
                      } else if (matchedChannel) {
                        name = matchedChannel.name || "Chat";
                        icon = <Hash className="h-4 w-4 text-zinc-700 shrink-0" />;
                      }

                      return (
                        <div
                          key={`item-${itemId}`}
                          className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-zinc-100/80 transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 text-xs text-zinc-800 min-w-0">
                            {icon}
                            <span className="truncate text-[13px] font-medium text-zinc-900">{name}</span>
                          </div>
                          <TooltipProvider delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleKnowledgeItem(itemId);
                                  }}
                                  className="h-6 w-6 inline-flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 cursor-pointer transition-colors"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                sideOffset={4}
                              >
                                Remove
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>

            {/* Sub-actions for Spaces & Task/Doc/Chat */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Add from Spaces */}
              <EmojiPopover
                open={spacesPopoverOpen}
                onOpenChange={(isOpen) => {
                  setSpacesPopoverOpen(isOpen);
                  if (!isOpen) setSpaceSearch("");
                }}
              >
                <EmojiPopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 cursor-pointer shadow-2xs transition-colors"
                  >
                    <Plus className="h-3 w-3 text-zinc-400" />
                    <span>Add from Spaces</span>
                  </button>
                </EmojiPopoverTrigger>
                <EmojiPopoverContent
                  align="start"
                  side="bottom"
                  sideOffset={6}
                  className="w-[290px] p-3 rounded-2xl shadow-xl border-zinc-200 bg-white space-y-2.5"
                >
                  {/* Search */}
                  <div className="flex h-9 items-center rounded-xl border border-zinc-300 bg-white px-3 focus-within:border-zinc-500 focus-within:ring-1 focus-within:ring-zinc-400">
                    <Search className="h-4 w-4 text-zinc-400 shrink-0 mr-2" />
                    <input
                      type="text"
                      value={spaceSearch}
                      onChange={(e) => setSpaceSearch(e.target.value)}
                      placeholder="Search..."
                      className="w-full bg-transparent border-0 p-0 text-sm outline-none placeholder:text-zinc-400 text-zinc-800"
                      autoFocus
                    />
                  </div>

                  {/* Personal List */}
                  <div
                    className={cn(
                      "flex items-center gap-2.5 px-1.5 py-1 rounded-lg hover:bg-zinc-50 cursor-pointer transition-colors text-zinc-800 select-none",
                      config.selectedSpaces?.includes("personal") && "bg-zinc-50"
                    )}
                    onClick={() => toggleSpace("personal")}
                  >
                    <svg className="h-4 w-4 text-zinc-700 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <line x1="19" y1="8" x2="21" y2="8" />
                      <line x1="19" y1="12" x2="21" y2="12" />
                      <line x1="19" y1="16" x2="21" y2="16" />
                    </svg>
                    <span className="text-[13px] font-medium text-zinc-900">Personal List</span>
                  </div>

                  <Separator className="bg-zinc-100" />

                  {/* Spaces & Lists */}
                  <div className="space-y-1">
                    <div className="text-[13px] font-medium text-zinc-500 px-1 py-0.5">
                      Spaces & Lists
                    </div>
                    <div className="space-y-1 max-h-[220px] overflow-y-auto pr-0.5">
                      {filteredSpaces.map((s: any) => {
                        const isChecked = config.selectedSpaces?.includes(s.id);
                        const isTeamSpace = s.isTeam || s.name.toLowerCase().includes("team space");
                        const isPrivate = s.isPrivate || s.private || s.access === "PRIVATE";
                        return (
                          <div
                            key={s.id}
                            onClick={() => toggleSpace(s.id)}
                            className={cn(
                              "flex items-center justify-between px-1.5 py-1.5 rounded-lg hover:bg-zinc-50 cursor-pointer text-xs transition-colors",
                              isChecked && "bg-zinc-50/80"
                            )}
                          >
                            <div className="flex items-center gap-2.5 truncate min-w-0 pr-2">
                              {isTeamSpace ? (
                                <div className="h-6 w-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                                  <Users className="h-3.5 w-3.5 text-white" />
                                </div>
                              ) : (
                                <div
                                  className="h-6 w-6 rounded-lg text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs"
                                  style={{ backgroundColor: s.color || "#6366f1" }}
                                >
                                  {s.name.substring(0, 1).toUpperCase()}
                                </div>
                              )}
                              <span className="truncate text-[13px] font-medium text-zinc-800">{s.name}</span>
                              {isPrivate && <Lock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />}
                            </div>
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleSpace(s.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-5 w-5 rounded-[6px] border-zinc-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 shrink-0 cursor-pointer"
                            />
                          </div>
                        );
                      })}
                      {filteredSpaces.length === 0 && (
                        <div className="text-center text-xs text-zinc-400 py-4">No spaces found</div>
                      )}
                    </div>
                  </div>
                </EmojiPopoverContent>
              </EmojiPopover>

              {/* Add task, Doc, Chat */}
              <EmojiPopover
                open={itemsPopoverOpen}
                onOpenChange={(isOpen) => {
                  setItemsPopoverOpen(isOpen);
                  if (!isOpen) {
                    setBrowseMode(false);
                    setItemSearch("");
                  }
                }}
              >
                <EmojiPopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 cursor-pointer shadow-2xs transition-colors"
                  >
                    <Plus className="h-3 w-3 text-zinc-400" />
                    <span>Add task, Doc, Chat</span>
                  </button>
                </EmojiPopoverTrigger>
                <EmojiPopoverContent align="start" side="bottom" sideOffset={4} className="w-[360px] p-0 rounded-2xl shadow-xl border-zinc-200 bg-white overflow-hidden space-y-0">
                  {/* Search bar */}
                  <div className="p-3 pb-2">
                    <div className="flex h-9 items-center rounded-xl border border-zinc-200 bg-white px-3 focus-within:border-zinc-400 focus-within:ring-1 focus-within:ring-zinc-400">
                      <Search className="h-4 w-4 text-zinc-400 shrink-0 mr-2" />
                      <input
                        type="text"
                        value={itemSearch}
                        onChange={(e) => {
                          setItemSearch(e.target.value);
                          if (browseMode) setBrowseMode(false);
                        }}
                        placeholder="Search..."
                        className="w-full bg-transparent border-0 p-0 text-sm outline-none placeholder:text-zinc-400 text-zinc-800"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center gap-6 px-4 border-b border-zinc-100 text-sm font-medium">
                    <button
                      type="button"
                      onClick={() => { setItemTab("tasks"); setBrowseMode(false); }}
                      className={cn(
                        "py-2 relative transition-colors cursor-pointer text-[13px]",
                        itemTab === "tasks" ? "text-zinc-900 font-semibold" : "text-zinc-500 hover:text-zinc-800"
                      )}
                    >
                      Tasks
                      {itemTab === "tasks" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 rounded-full" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setItemTab("docs"); setBrowseMode(false); }}
                      className={cn(
                        "py-2 relative transition-colors cursor-pointer text-[13px]",
                        itemTab === "docs" ? "text-zinc-900 font-semibold" : "text-zinc-500 hover:text-zinc-800"
                      )}
                    >
                      Docs
                      {itemTab === "docs" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 rounded-full" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setItemTab("chats"); setBrowseMode(false); }}
                      className={cn(
                        "py-2 relative transition-colors cursor-pointer text-[13px]",
                        itemTab === "chats" ? "text-zinc-900 font-semibold" : "text-zinc-500 hover:text-zinc-800"
                      )}
                    >
                      Chats
                      {itemTab === "chats" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 rounded-full" />
                      )}
                    </button>
                  </div>

                  {/* Tab 1: Tasks */}
                  {itemTab === "tasks" && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between px-3 pt-2.5 pb-1 text-xs">
                        <span className="font-semibold text-[11px] text-zinc-400 uppercase tracking-wide">
                          {browseMode ? (
                            <button
                              type="button"
                              onClick={() => setBrowseMode(false)}
                              className="text-violet-600 font-medium hover:underline cursor-pointer lowercase first-letter:uppercase"
                            >
                              Recent/Search
                            </button>
                          ) : (
                            itemSearch.trim() ? "Results" : "Recent"
                          )}
                        </span>
                        {!browseMode && (
                          <button
                            type="button"
                            onClick={() => setBrowseMode(true)}
                            className="text-violet-600 font-medium hover:underline cursor-pointer text-xs"
                          >
                            Browse tasks
                          </button>
                        )}
                      </div>

                      <div className="max-h-[220px] overflow-y-auto px-1.5 pb-2 space-y-0.5">
                        {browseMode ? (
                          /* Browse hierarchy tree view */
                          hierarchy.spaceNodes.length === 0 && hierarchy.rootNodes.length === 0 ? (
                            <div className="py-6 text-center text-xs text-zinc-400">No tasks found</div>
                          ) : (
                            <>
                              {hierarchy.spaceNodes.map(renderNode)}
                              {hierarchy.rootNodes.map(renderNode)}
                            </>
                          )
                        ) : (
                          /* Recent / Flat Search view */
                          filteredTasks.length === 0 ? (
                            <div className="py-6 text-center text-xs text-zinc-400">No tasks found</div>
                          ) : (
                            filteredTasks.map((t: any) => {
                              const isSelected = config.selectedKnowledgeItems?.includes(t.id);
                              const statusColor = t.status?.color || "#3b82f6";
                              const initials = t.assignee?.name
                                ? t.assignee.name.substring(0, 2).toUpperCase()
                                : (t.assignees?.[0]?.user?.name
                                  ? t.assignees[0].user.name.substring(0, 2).toUpperCase()
                                  : "DN");
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => toggleKnowledgeItem(t.id)}
                                  className={cn(
                                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left hover:bg-zinc-100/70 cursor-pointer transition-colors group",
                                    isSelected ? "bg-zinc-100 font-medium" : "text-zinc-700"
                                  )}
                                >
                                  <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                                    <div
                                      className="w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center border-2"
                                      style={{ borderColor: statusColor }}
                                    >
                                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                                    </div>
                                    <span className="truncate text-zinc-800 text-[13px]">{t.title || t.name || "Untitled Task"}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                    <Avatar className="h-5 w-5 shrink-0 ring-1 ring-zinc-200">
                                      <AvatarFallback className="text-[9px] bg-slate-700 text-white font-medium">{initials}</AvatarFallback>
                                    </Avatar>
                                    {isSelected && <Check className="h-3.5 w-3.5 text-zinc-900 shrink-0" />}
                                  </div>
                                </button>
                              );
                            })
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Docs */}
                  {itemTab === "docs" && (
                    <div className="max-h-[240px] overflow-y-auto p-2 space-y-0.5">
                      {filteredDocs.length === 0 ? (
                        <div className="py-6 text-center text-xs text-zinc-400">No documents found</div>
                      ) : (
                        filteredDocs.map((d: any) => {
                          const isSelected = config.selectedKnowledgeItems?.includes(d.id);
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => toggleKnowledgeItem(d.id)}
                              className={cn(
                                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-zinc-100/70 transition-colors cursor-pointer group",
                                isSelected ? "bg-zinc-100 font-medium text-zinc-900" : "text-zinc-700"
                              )}
                            >
                              <FileText className="h-4 w-4 text-zinc-500 shrink-0" />
                              <span className="text-[13px] text-zinc-800 truncate flex-1">{d.title || d.name || "Untitled"}</span>
                              {isSelected && <Check className="h-3.5 w-3.5 text-zinc-900 shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Tab 3: Chats */}
                  {itemTab === "chats" && (
                    <div className="max-h-[240px] overflow-y-auto p-2 space-y-0.5">
                      {filteredChannels.length === 0 ? (
                        <div className="py-6 text-center text-xs text-zinc-400">No chats found</div>
                      ) : (
                        filteredChannels.map((ch: any) => {
                          const isSelected = config.selectedKnowledgeItems?.includes(ch.id);
                          const subtitle = ch.space?.name
                            ? `in ${ch.space.name}`
                            : ch.spaceId
                              ? `in Team Space`
                              : `in ${workspaceName}`;
                          return (
                            <button
                              key={ch.id}
                              type="button"
                              onClick={() => toggleKnowledgeItem(ch.id)}
                              className={cn(
                                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-zinc-100/70 transition-colors cursor-pointer group",
                                isSelected ? "bg-zinc-100 font-medium text-zinc-900" : "text-zinc-700"
                              )}
                            >
                              <Hash className="h-4 w-4 text-zinc-500 shrink-0" />
                              <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                                <span className="text-[13px] font-medium text-zinc-900 truncate">{ch.name}</span>
                                <span className="text-[12px] text-zinc-400 font-normal truncate">{subtitle}</span>
                              </div>
                              {isSelected && <Check className="h-3.5 w-3.5 text-zinc-900 shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="py-2.5 px-3 border-t border-zinc-100 text-[11px] text-zinc-400 text-center select-none bg-zinc-50/50">
                    Add tasks, Docs, and Chats as knowledge.
                  </div>
                </EmojiPopoverContent>
              </EmojiPopover>
            </div>
          </div>

          <Separator />

          {/* External Search */}
          <div className="space-y-2.5">
            <div className="text-xs font-medium text-zinc-900 tracking-wide">
              External Search
            </div>

            <div className="space-y-2">

              <div className="flex items-center justify-between py-1 hover:bg-zinc-100 px-2 rounded-md cursor-pointer">
                <div className="flex items-center gap-2 text-xs text-zinc-700">
                  <span className="text-zinc-400">⚙️</span>
                  <span>GPT-4.1 by OpenAI</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400 font-medium">Required</span>
                  <Switch
                    className="data-[state=checked]:bg-indigo-600 data-[state=unchecked]:bg-zinc-200 pointer-events-none h-4 w-7"
                    thumbClassName="size-3.5"
                    checked={gptSearch}
                    disabled
                  />
                </div>
              </div>

              <div
                className="flex items-center justify-between py-1 hover:bg-zinc-100 px-2 rounded-md cursor-pointer"
                onClick={() =>
                  onChange({
                    ...config,
                    externalSearch: { ...config.externalSearch, webSearch: !webSearch },
                  })
                }
              >
                <div className="flex items-center gap-2 text-xs text-zinc-700">
                  <Globe className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Web Search</span>
                </div>
                <Switch
                  className="data-[state=checked]:bg-indigo-600 data-[state=unchecked]:bg-zinc-200 pointer-events-none h-4 w-7"
                  thumbClassName="size-3.5"
                  checked={webSearch}
                  onCheckedChange={(checked) =>
                    onChange({
                      ...config,
                      externalSearch: { ...config.externalSearch, webSearch: checked },
                    })
                  }
                />
              </div>

              {/* Dynamic Connections */}
              {(config.externalSearch?.connections || []).map((conn) => {
                const opt = [
                  { kind: "google_drive", label: "Google Drive", brandKey: "google_drive" },
                  { kind: "github", label: "GitHub", brandKey: "github" },
                  { kind: "slack", label: "Slack", brandKey: "slack" },
                  { kind: "gmail", label: "Gmail", brandKey: "gmail" },
                  { kind: "notion", label: "Notion", brandKey: "notion" },
                  { kind: "website", label: "Import website", icon: "globe" },
                  { kind: "markdown", label: "Markdown", icon: "file" },
                ].find((o) => o.kind === conn.kind);

                return (
                  <div
                    key={conn.kind}
                    className="flex items-center justify-between py-1 hover:bg-zinc-100 px-2 rounded-md cursor-pointer"
                    onClick={() => {
                      const next = (config.externalSearch?.connections || []).map((c) =>
                        c.kind === conn.kind ? { ...c, enabled: !c.enabled } : c
                      );
                      onChange({
                        ...config,
                        externalSearch: { ...config.externalSearch, connections: next },
                      });
                    }}
                  >
                    <div className="flex items-center gap-2 text-xs text-zinc-700 min-w-0">
                      {opt?.brandKey ? (
                        <IntegrationBrandImage provider={opt.brandKey} size={15} />
                      ) : opt?.icon === "globe" ? (
                        <Globe className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      )}
                      <span className="truncate">{opt?.label || conn.kind}</span>
                    </div>
                    <Switch
                      className="data-[state=checked]:bg-indigo-600 data-[state=unchecked]:bg-zinc-200 pointer-events-none h-4 w-7"
                      thumbClassName="size-3.5"
                      checked={conn.enabled}
                      onCheckedChange={(enabled) => {
                        const next = (config.externalSearch?.connections || []).map((c) =>
                          c.kind === conn.kind ? { ...c, enabled } : c
                        );
                        onChange({
                          ...config,
                          externalSearch: { ...config.externalSearch, connections: next },
                        });
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div>
              <EmojiPopover open={addConnectionOpen} onOpenChange={setAddConnectionOpen}>
                <EmojiPopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center px-2.5 py-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 cursor-pointer shadow-2xs transition-colors"
                  >
                    Connect an app
                  </button>
                </EmojiPopoverTrigger>
                <EmojiPopoverContent
                  align="start"
                  side="bottom"
                  sideOffset={4}
                  className="w-56 p-1.5 rounded-xl shadow-xl border-zinc-200 bg-white space-y-0.5"
                >
                  {[
                    { kind: "google_drive", label: "Google Drive", brandKey: "google_drive" },
                    { kind: "github", label: "GitHub", brandKey: "github" },
                    { kind: "slack", label: "Slack", brandKey: "slack" },
                    { kind: "gmail", label: "Gmail", brandKey: "gmail" },
                    { kind: "notion", label: "Notion", brandKey: "notion" },
                    { kind: "website", label: "Import website", icon: "globe" },
                    { kind: "markdown", label: "Markdown", icon: "file" },
                  ]
                    .filter(
                      (opt) =>
                        !(config.externalSearch?.connections || []).some(
                          (c) => c.kind === opt.kind
                        )
                    )
                    .map((opt) => (
                      <button
                        key={opt.kind}
                        type="button"
                        onClick={() => {
                          const next = [
                            ...(config.externalSearch?.connections || []),
                            { kind: opt.kind, enabled: true },
                          ];
                          onChange({
                            ...config,
                            externalSearch: { ...config.externalSearch, connections: next },
                          });
                          setAddConnectionOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-zinc-50 cursor-pointer text-xs transition-colors"
                      >
                        {opt.brandKey ? (
                          <IntegrationBrandImage provider={opt.brandKey} size={16} />
                        ) : opt.icon === "globe" ? (
                          <Globe className="h-3.5 w-3.5 text-zinc-500" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 text-zinc-500" />
                        )}
                        <span className="text-zinc-800 font-medium">{opt.label}</span>
                      </button>
                    ))}
                  {[
                    { kind: "google_drive", label: "Google Drive" },
                    { kind: "github", label: "GitHub" },
                    { kind: "slack", label: "Slack" },
                    { kind: "gmail", label: "Gmail" },
                    { kind: "notion", label: "Notion" },
                    { kind: "website", label: "Import website" },
                    { kind: "markdown", label: "Markdown" },
                  ].every((opt) =>
                    (config.externalSearch?.connections || []).some((c) => c.kind === opt.kind)
                  ) && (
                      <p className="px-2 py-3 text-xs text-zinc-400 text-center">
                        All connections added
                      </p>
                    )}
                </EmojiPopoverContent>
              </EmojiPopover>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Only available for apps with Workspace-level connected search enabled.
            </p>
          </div>
        </div>
      </div>

      {/* Tools Pipeline */}
      <div className="flex flex-col items-center w-full relative">
        {/* Connector from previous section */}
        <div className="absolute w-px -top-5 left-1/2 -translate-x-1/2 h-5 border-l-2 border-dashed border-zinc-200 pointer-events-none" />

        {/* Add tool button */}
        <button
          type="button"
          onClick={() => setToolsModalOpen(true)}
          className="px-3.5 py-2 rounded-md bg-zinc-950 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors cursor-pointer shadow-sm relative z-10"
        >
          Add tool
        </button>

        <div className="h-5 w-px border-l-2 border-dashed border-zinc-200" />

        {/* Selected Tool Blocks */}
        {selectedToolIds.map((toolId) => (
          <div key={toolId} className="w-full flex flex-col items-center">
            <div className="w-full relative z-10">
              <ToolBlockCard
                toolId={toolId}
                config={config.toolConfigs?.[toolId] || {}}
                onChangeConfig={(patch) => {
                  const current = config.toolConfigs?.[toolId] || {};
                  onChange({
                    ...config,
                    toolConfigs: {
                      ...config.toolConfigs,
                      [toolId]: { ...current, ...patch },
                    },
                  });
                }}
                onRemove={() =>
                  onChange({
                    ...config,
                    toolIds: selectedToolIds.filter((id) => id !== toolId),
                  })
                }
                systemTools={systemToolsData ?? []}
                compositeTools={compositeToolsData?.items ?? []}
                providers={catalogProviders ?? []}
                spaces={spaces}
              />
            </div>
            <div className="h-5 w-px border-l-2 border-dashed border-zinc-200 relative z-0" />
          </div>
        ))}

        {/* Default Tools Card */}
        <div className="w-full rounded-xl border border-zinc-200 bg-white p-3.5 space-y-2 shadow-xs relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded flex items-center justify-center shrink-0">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M4 9.5L12 4.5L20 9.5" stroke="url(#cu-grad1)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 16.5L12 11.5L20 16.5" stroke="url(#cu-grad2)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <defs>
                    <linearGradient id="cu-grad1" x1="4" y1="4" x2="20" y2="10">
                      <stop stopColor="#ff4b72" />
                      <stop offset="1" stopColor="#ec4899" />
                    </linearGradient>
                    <linearGradient id="cu-grad2" x1="4" y1="11" x2="20" y2="17">
                      <stop stopColor="#7928ca" />
                      <stop offset="1" stopColor="#0070f3" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span className="text-xs font-bold text-zinc-900">Default tools</span>
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setToolsModalOpen(true)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e0f2fe] text-[#0284c7] hover:bg-[#bae6fd] text-xs font-semibold cursor-pointer transition-colors"
                    >
                      <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                      </svg>
                      <span>7 tools</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    align="center"
                    sideOffset={8}
                    className="bg-zinc-900 text-white rounded-xl p-3 shadow-2xl max-w-[280px] border border-zinc-800 text-left z-50"
                  >
                    <div className="text-xs font-bold text-white mb-1">7 tools included</div>
                    <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                      Load assets and objects, Load Custom Fields, Retrieve Chat messages, Retrieve task list, Search activity, Search users and teams, Search Workspace
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className="text-[11px] text-zinc-400 font-medium">Required</span>
          </div>
          <p className="text-xs text-zinc-500">
            Tools required for basic Agent functionality.
          </p>
        </div>
      </div>

      {/* ToolsSelectionModal */}
      <ToolsSelectionModal
        open={toolsModalOpen}
        onOpenChange={setToolsModalOpen}
        selectedToolIds={selectedToolIds}
        onSelect={(toolIds) => onChange({ ...config, toolIds })}
        workspaceId={scope.workspaceId}
      />
    </div>
  );
}
