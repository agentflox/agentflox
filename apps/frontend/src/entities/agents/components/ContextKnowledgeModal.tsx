"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Briefcase,
  Folder,
  FolderOpen,
  Users,
  FileText,
  Search,
  Loader2,
  ListTodo,
  CheckSquare,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const PAGE_SIZE = 20;

type ContextTab =
  | "workspaces"
  | "spaces"
  | "projects"
  | "teams"
  | "folders"
  | "lists"
  | "tasks"
  | "documents";

interface ContextKnowledgeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedContexts: Record<string, any[]>;
  onSelect: (contexts: Record<string, any[]>) => void;
}

function useAccumulatedPage<T extends { id: string }>(
  page: number,
  data: { items: T[]; total: number; page: number; pageSize: number } | undefined,
  resetKey: string,
) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setItems([]);
    setTotal(0);
  }, [resetKey]);

  useEffect(() => {
    if (!data || data.page !== page) return;
    setTotal(data.total);
    setItems((prev) => {
      if (data.page <= 1) return data.items;
      const seen = new Set(prev.map((i) => i.id));
      const next = [...prev];
      for (const item of data.items) {
        if (!seen.has(item.id)) next.push(item);
      }
      return next;
    });
  }, [data, page]);

  const hasMore = items.length < total;
  return { items, hasMore };
}

export const ContextKnowledgeModal: React.FC<ContextKnowledgeModalProps> = ({
  open,
  onOpenChange,
  selectedContexts,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ContextTab>("projects");
  const [localSelected, setLocalSelected] = useState<Record<string, any[]>>(
    selectedContexts || {},
  );

  const [pages, setPages] = useState<Record<ContextTab, number>>({
    workspaces: 1,
    spaces: 1,
    projects: 1,
    teams: 1,
    folders: 1,
    lists: 1,
    tasks: 1,
    documents: 1,
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (!open) return;
    setLocalSelected(selectedContexts || {});
    setSearchQuery("");
    setDebouncedQuery("");
    setPages({
      workspaces: 1,
      spaces: 1,
      projects: 1,
      teams: 1,
      folders: 1,
      lists: 1,
      tasks: 1,
      documents: 1,
    });
  }, [open, selectedContexts]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPages({
      workspaces: 1,
      spaces: 1,
      projects: 1,
      teams: 1,
      folders: 1,
      lists: 1,
      tasks: 1,
      documents: 1,
    });
  }, [debouncedQuery]);

  const { data: user } = trpc.user.me.useQuery(undefined, { enabled: open });
  const userId = user?.id;
  const enabled = open && !!userId;

  const workspacesQuery = trpc.workspace.list.useQuery(
    {
      scope: "owned",
      page: pages.workspaces,
      pageSize: PAGE_SIZE,
      query: debouncedQuery || undefined,
    },
    { enabled },
  );
  const spacesQuery = trpc.space.list.useQuery(
    {
      page: pages.spaces,
      pageSize: PAGE_SIZE,
      query: debouncedQuery || undefined,
    },
    { enabled },
  );
  const projectsQuery = trpc.project.list.useQuery(
    {
      scope: "owned",
      page: pages.projects,
      pageSize: PAGE_SIZE,
      query: debouncedQuery || undefined,
    },
    { enabled },
  );
  const teamsQuery = trpc.team.list.useQuery(
    {
      scope: "owned",
      page: pages.teams,
      pageSize: PAGE_SIZE,
      query: debouncedQuery || undefined,
    },
    { enabled },
  );
  const foldersQuery = trpc.folder.list.useQuery(
    {
      scope: "owned",
      page: pages.folders,
      pageSize: PAGE_SIZE,
      query: debouncedQuery || undefined,
    },
    { enabled },
  );
  const listsQuery = trpc.list.list.useQuery(
    {
      scope: "owned",
      page: pages.lists,
      pageSize: PAGE_SIZE,
      query: debouncedQuery || undefined,
    },
    { enabled },
  );
  const tasksQuery = trpc.task.list.useQuery(
    {
      scope: "owned",
      page: pages.tasks,
      pageSize: PAGE_SIZE,
      query: debouncedQuery || undefined,
    },
    { enabled },
  );

  const resetKey = `${open ? "open" : "closed"}:${debouncedQuery}`;

  const workspaces = useAccumulatedPage(pages.workspaces, workspacesQuery.data as any, resetKey);
  const spaces = useAccumulatedPage(pages.spaces, spacesQuery.data as any, resetKey);
  const projects = useAccumulatedPage(pages.projects, projectsQuery.data as any, resetKey);
  const teams = useAccumulatedPage(pages.teams, teamsQuery.data as any, resetKey);
  const folders = useAccumulatedPage(pages.folders, foldersQuery.data as any, resetKey);
  const lists = useAccumulatedPage(pages.lists, listsQuery.data as any, resetKey);
  const tasks = useAccumulatedPage(pages.tasks, tasksQuery.data as any, resetKey);

  const handleToggleItem = (type: string, item: any) => {
    const current = localSelected[type] || [];
    const exists = current.some((i: any) => i.id === item.id);

    const updated = {
      ...localSelected,
      [type]: exists
        ? current.filter((i: any) => i.id !== item.id)
        : [...current, { id: item.id, name: item.name || item.title, title: item.title }],
    };

    if (updated[type].length === 0) {
      delete updated[type];
    }

    setLocalSelected(updated);
  };

  const handleApply = () => {
    onSelect(localSelected);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setLocalSelected(selectedContexts || {});
    onOpenChange(false);
  };

  const loadMore = (tab: ContextTab) => {
    setPages((prev) => ({ ...prev, [tab]: prev[tab] + 1 }));
  };

  const renderItemList = (
    items: any[],
    isLoading: boolean,
    isFetchingMore: boolean,
    type: string,
    icon: React.ElementType,
    hasMore: boolean,
    tab: ContextTab,
  ) => {
    if (isLoading && items.length === 0) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      );
    }

    const selected = localSelected[type] || [];

    if (items.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No items found
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {items.map((item: any) => {
          const isSelected = selected.some((s: any) => s.id === item.id);
          const Icon = icon;
          return (
            <div
              key={item.id}
              className={`group flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => handleToggleItem(type, item)}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => handleToggleItem(type, item)}
                className="cursor-pointer"
              />
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {item.name || item.title}
                </p>
                {item.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {item.description}
                  </p>
                )}
              </div>

              {isSelected ? (
                <Badge variant="secondary" className="text-xs shrink-0">
                  Selected
                </Badge>
              ) : (
                <span className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 whitespace-nowrap">
                  + Add
                </span>
              )}
            </div>
          );
        })}

        {hasMore && (
          <div className="flex justify-center pt-3 pb-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFetchingMore}
              onClick={() => loadMore(tab)}
              className="rounded-lg"
            >
              {isFetchingMore ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Loading…
                </>
              ) : (
                "Load more"
              )}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const totalSelected = useMemo(
    () => Object.values(localSelected).reduce((sum, arr) => sum + arr.length, 0),
    [localSelected],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl sm:max-w-5xl h-[85vh] max-h-[85vh] flex flex-col p-0 overflow-hidden gap-0">
        <DialogHeader className="p-6 pb-4 shrink-0">
          <DialogTitle>Add Knowledge / Context</DialogTitle>
          <DialogDescription>
            Select items from your workspace to provide context to your agent
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col px-6">
          <div className="flex items-center gap-2 px-3 h-9 bg-white border border-zinc-200 rounded-md focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all overflow-hidden cursor-text shrink-0">
            <Search className="h-4 w-4 text-zinc-400 shrink-0" />
            <Input
              variant="ghost"
              className="flex-1 h-full border-0 p-0 shadow-none focus-visible:ring-0 text-sm bg-transparent placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus-visible:ring-0"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as ContextTab)}
            className="w-full flex-1 min-h-0 flex flex-col mt-4"
          >
            <div className="overflow-x-auto shrink-0 -mx-1 px-1">
              <TabsList className="inline-flex w-max min-w-full h-auto gap-1 p-1">
                <TabsTrigger value="workspaces" className="cursor-pointer">
                  <Folder className="h-4 w-4 mr-1" />
                  Workspaces
                </TabsTrigger>
                <TabsTrigger value="spaces" className="cursor-pointer">
                  <Folder className="h-4 w-4 mr-1" />
                  Spaces
                </TabsTrigger>
                <TabsTrigger value="projects" className="cursor-pointer">
                  <Briefcase className="h-4 w-4 mr-1" />
                  Projects
                </TabsTrigger>
                <TabsTrigger value="teams" className="cursor-pointer">
                  <Users className="h-4 w-4 mr-1" />
                  Teams
                </TabsTrigger>
                <TabsTrigger value="folders" className="cursor-pointer">
                  <FolderOpen className="h-4 w-4 mr-1" />
                  Folders
                </TabsTrigger>
                <TabsTrigger value="lists" className="cursor-pointer">
                  <ListTodo className="h-4 w-4 mr-1" />
                  Lists
                </TabsTrigger>
                <TabsTrigger value="tasks" className="cursor-pointer">
                  <CheckSquare className="h-4 w-4 mr-1" />
                  Tasks
                </TabsTrigger>
                <TabsTrigger value="documents" className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-1" />
                  Docs
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 min-h-0 mt-4">
              <TabsContent value="workspaces" className="mt-0 pr-4">
                {renderItemList(
                  workspaces.items,
                  workspacesQuery.isLoading,
                  workspacesQuery.isFetching && pages.workspaces > 1,
                  "workspaces",
                  Folder,
                  workspaces.hasMore,
                  "workspaces",
                )}
              </TabsContent>

              <TabsContent value="spaces" className="mt-0 pr-4">
                {renderItemList(
                  spaces.items,
                  spacesQuery.isLoading,
                  spacesQuery.isFetching && pages.spaces > 1,
                  "spaces",
                  Folder,
                  spaces.hasMore,
                  "spaces",
                )}
              </TabsContent>

              <TabsContent value="projects" className="mt-0 pr-4">
                {renderItemList(
                  projects.items,
                  projectsQuery.isLoading,
                  projectsQuery.isFetching && pages.projects > 1,
                  "projects",
                  Briefcase,
                  projects.hasMore,
                  "projects",
                )}
              </TabsContent>

              <TabsContent value="teams" className="mt-0 pr-4">
                {renderItemList(
                  teams.items,
                  teamsQuery.isLoading,
                  teamsQuery.isFetching && pages.teams > 1,
                  "teams",
                  Users,
                  teams.hasMore,
                  "teams",
                )}
              </TabsContent>

              <TabsContent value="folders" className="mt-0 pr-4">
                {renderItemList(
                  folders.items,
                  foldersQuery.isLoading,
                  foldersQuery.isFetching && pages.folders > 1,
                  "folders",
                  FolderOpen,
                  folders.hasMore,
                  "folders",
                )}
              </TabsContent>

              <TabsContent value="lists" className="mt-0 pr-4">
                {renderItemList(
                  lists.items,
                  listsQuery.isLoading,
                  listsQuery.isFetching && pages.lists > 1,
                  "lists",
                  ListTodo,
                  lists.hasMore,
                  "lists",
                )}
              </TabsContent>

              <TabsContent value="tasks" className="mt-0 pr-4">
                {renderItemList(
                  tasks.items,
                  tasksQuery.isLoading,
                  tasksQuery.isFetching && pages.tasks > 1,
                  "tasks",
                  CheckSquare,
                  tasks.hasMore,
                  "tasks",
                )}
              </TabsContent>

              <TabsContent value="documents" className="mt-0 pr-4">
                {renderItemList([], false, false, "documents", FileText, false, "documents")}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        <div className="flex items-center justify-between p-6 pt-4 border-t shrink-0">
          <div className="text-sm text-muted-foreground">
            {totalSelected} item{totalSelected !== 1 ? "s" : ""} selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleApply}>Add ({totalSelected})</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
