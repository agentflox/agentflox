"use client";

import React, { useMemo } from "react";
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronUp,
  Building2,
  LayoutDashboard,
  FolderKanban,
  Users,
  Folder,
  List,
  Layers,
  MapPin,
  Globe,
  User,
  Circle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export type LocationSelection = {
  type: "workspace" | "space" | "project" | "team" | "folder" | "list";
  id: string;
  name: string;
} | null;

export function useLocationHierarchy() {
  const workspacesQuery = trpc.workspace.list.useQuery(
    { scope: "all", page: 1, pageSize: 100 } as any,
    { staleTime: 60_000 }
  );
  const spacesQuery = trpc.space.list.useQuery(
    { includeCounts: false } as any,
    { staleTime: 60_000 }
  );
  const projectsQuery = trpc.project.list.useQuery(
    {} as any,
    { staleTime: 60_000 }
  );
  const teamsQuery = trpc.team.list.useQuery(
    {} as any,
    { staleTime: 60_000 }
  );
  const foldersQuery = trpc.folder.byContext.useQuery(
    { archived: false } as any,
    { staleTime: 60_000 }
  );
  const listsQuery = trpc.list.byContext.useQuery(
    { archived: false } as any,
    { staleTime: 60_000 }
  );

  const workspaces = (workspacesQuery.data?.items ?? []) as any[];
  const spaces = (spacesQuery.data?.items ?? spacesQuery.data ?? []) as any[];
  const projects = (projectsQuery.data?.items ?? projectsQuery.data ?? []) as any[];
  const teams = (teamsQuery.data?.items ?? teamsQuery.data ?? []) as any[];
  const folders = (foldersQuery.data ?? []) as any[];
  const lists = (listsQuery.data ?? []) as any[];

  const tree = useMemo(() => {
    return workspaces.map((ws) => {
      const wsSpaces = spaces.filter((s) => s.workspaceId === ws.id);
      const wsProjects = projects.filter((p) => p.workspaceId === ws.id);
      const wsTeams = teams.filter((t) => t.workspaceId === ws.id);
      const wsFolders = folders.filter((f) => f.workspaceId === ws.id);
      const wsLists = lists.filter((l) => l.workspaceId === ws.id);

      return {
        ...ws,
        spaces: wsSpaces.map((sp) => {
          const spProjects = wsProjects.filter((p) => p.spaceId === sp.id);
          const spFolders = wsFolders.filter((f) => f.spaceId === sp.id && !f.projectId);
          const spLists = wsLists.filter((l) => l.spaceId === sp.id && !l.projectId && !l.folderId);

          return {
            ...sp,
            projects: spProjects.map((p) => {
              const pFolders = wsFolders.filter((f) => f.projectId === p.id);
              const pLists = wsLists.filter((l) => l.projectId === p.id && !l.folderId);
              return {
                ...p,
                folders: pFolders.map((f) => ({
                  ...f,
                  lists: wsLists.filter((l) => l.folderId === f.id),
                })),
                lists: pLists,
              };
            }),
            folders: spFolders.map((f) => ({
              ...f,
              lists: wsLists.filter((l) => l.folderId === f.id),
            })),
            lists: spLists,
          };
        }),
        projects: wsProjects
          .filter((p) => !p.spaceId && !p.teamId)
          .map((p) => {
            const pFolders = wsFolders.filter((f) => f.projectId === p.id);
            const pLists = wsLists.filter((l) => l.projectId === p.id && !l.folderId);
            return {
              ...p,
              folders: pFolders.map((f) => ({
                ...f,
                lists: wsLists.filter((l) => l.folderId === f.id),
              })),
              lists: pLists,
            };
          }),
        teams: wsTeams.map((tm) => {
          const tmProjects = wsProjects.filter((p) => p.teamId === tm.id);
          const tmFolders = wsFolders.filter((f) => f.teamId === tm.id && !f.projectId);
          const tmLists = wsLists.filter((l) => l.teamId === tm.id && !l.projectId && !l.folderId);
          return {
            ...tm,
            projects: tmProjects.map((p) => {
              const pFolders = wsFolders.filter((f) => f.projectId === p.id);
              const pLists = wsLists.filter((l) => l.projectId === p.id && !l.folderId);
              return {
                ...p,
                folders: pFolders.map((f) => ({
                  ...f,
                  lists: wsLists.filter((l) => l.folderId === f.id),
                })),
                lists: pLists,
              };
            }),
            folders: tmFolders.map((f) => ({
              ...f,
              lists: wsLists.filter((l) => l.folderId === f.id),
            })),
            lists: tmLists,
          };
        }),
        folders: wsFolders
          .filter((f) => !f.spaceId && !f.projectId && !f.teamId)
          .map((f) => ({
            ...f,
            lists: wsLists.filter((l) => l.folderId === f.id),
          })),
        lists: wsLists.filter((l) => !l.spaceId && !l.projectId && !l.teamId && !l.folderId),
      };
    });
  }, [workspaces, spaces, projects, teams, folders, lists]);

  return { tree, isLoading: workspacesQuery.isLoading };
}

export function LocationTypeFilterSubmenu({
  selectedType,
  onSelectType,
  allowedTypes,
}: {
  selectedType?: string;
  onSelectType: (type: string) => void;
  allowedTypes?: Array<"workspace" | "space" | "project" | "team" | "folder" | "list">;
}) {
  const types = [
    { id: "workspace", label: "Workspace", icon: Building2, color: "text-indigo-500" },
    { id: "space", label: "Space", icon: LayoutDashboard, color: "text-blue-500" },
    { id: "project", label: "Project", icon: FolderKanban, color: "text-violet-500" },
    { id: "team", label: "Team", icon: Users, color: "text-emerald-500" },
    { id: "folder", label: "Folder", icon: Folder, color: "text-amber-500" },
    { id: "list", label: "List", icon: List, color: "text-teal-500" },
  ].filter((t) => !allowedTypes || allowedTypes.includes(t.id as any));

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-zinc-500" />
        <span>Location Type</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent className="w-52">
          <DropdownMenuCheckboxItem
            checked={!selectedType || selectedType === "all"}
            onCheckedChange={() => onSelectType("all")}
            className="flex items-center gap-2"
          >
            <Layers className="h-4 w-4 text-zinc-400" />
            <span>All Location Types</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {types.map((t) => {
            const Icon = t.icon;
            return (
              <DropdownMenuCheckboxItem
                key={t.id}
                checked={selectedType === t.id}
                onCheckedChange={() => onSelectType(t.id)}
                className="flex items-center gap-2"
              >
                <Icon className={cn("h-4 w-4", t.color)} />
                <span>{t.label}</span>
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}

export function NestedLocationFilterSubmenu({
  selectedLocation,
  onSelectLocation,
}: {
  selectedLocation: LocationSelection;
  onSelectLocation: (loc: LocationSelection) => void;
}) {
  const { tree } = useLocationHierarchy();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-zinc-500" />
        <span>Location</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent className="w-60 max-h-[380px] overflow-y-auto">
          <DropdownMenuCheckboxItem
            checked={!selectedLocation}
            onCheckedChange={() => onSelectLocation(null)}
            className="flex items-center gap-2"
          >
            <Layers className="h-4 w-4 text-zinc-400" />
            <span>All Locations</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />

          {tree.map((ws) => (
            <DropdownMenuSub key={ws.id}>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-500 shrink-0" />
                <span className="truncate">{ws.name}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-60 max-h-[380px] overflow-y-auto">
                  <DropdownMenuCheckboxItem
                    checked={selectedLocation?.type === "workspace" && selectedLocation.id === ws.id}
                    onCheckedChange={() => onSelectLocation({ type: "workspace", id: ws.id, name: ws.name })}
                    className="flex items-center gap-2"
                  >
                    <Building2 className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span className="truncate">All in {ws.name}</span>
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />

                  {/* Spaces */}
                  {ws.spaces?.map((sp: any) => (
                    <DropdownMenuSub key={sp.id}>
                      <DropdownMenuSubTrigger className="flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4 text-blue-500 shrink-0" />
                        <span className="truncate">{sp.name}</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent className="w-56 max-h-[380px] overflow-y-auto">
                          <DropdownMenuCheckboxItem
                            checked={selectedLocation?.type === "space" && selectedLocation.id === sp.id}
                            onCheckedChange={() => onSelectLocation({ type: "space", id: sp.id, name: sp.name })}
                            className="flex items-center gap-2"
                          >
                            <LayoutDashboard className="h-4 w-4 text-blue-500 shrink-0" />
                            <span className="truncate">All in {sp.name}</span>
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuSeparator />

                          {/* Projects in Space */}
                          {sp.projects?.map((pj: any) => (
                            <DropdownMenuSub key={pj.id}>
                              <DropdownMenuSubTrigger className="flex items-center gap-2">
                                <FolderKanban className="h-4 w-4 text-violet-500 shrink-0" />
                                <span className="truncate">{pj.name || pj.title}</span>
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent className="w-56 max-h-[380px] overflow-y-auto">
                                  <DropdownMenuCheckboxItem
                                    checked={selectedLocation?.type === "project" && selectedLocation.id === pj.id}
                                    onCheckedChange={() => onSelectLocation({ type: "project", id: pj.id, name: pj.name || pj.title })}
                                    className="flex items-center gap-2"
                                  >
                                    <FolderKanban className="h-4 w-4 text-violet-500 shrink-0" />
                                    <span className="truncate">All in {pj.name || pj.title}</span>
                                  </DropdownMenuCheckboxItem>
                                  <DropdownMenuSeparator />

                                  {/* Folders in Project */}
                                  {pj.folders?.map((fd: any) => (
                                    <DropdownMenuSub key={fd.id}>
                                      <DropdownMenuSubTrigger className="flex items-center gap-2">
                                        <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                                        <span className="truncate">{fd.name}</span>
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuPortal>
                                        <DropdownMenuSubContent className="w-56 max-h-[380px] overflow-y-auto">
                                          <DropdownMenuCheckboxItem
                                            checked={selectedLocation?.type === "folder" && selectedLocation.id === fd.id}
                                            onCheckedChange={() => onSelectLocation({ type: "folder", id: fd.id, name: fd.name })}
                                            className="flex items-center gap-2"
                                          >
                                            <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                                            <span className="truncate">All in {fd.name}</span>
                                          </DropdownMenuCheckboxItem>
                                          <DropdownMenuSeparator />
                                          {fd.lists?.map((ls: any) => (
                                            <DropdownMenuCheckboxItem
                                              key={ls.id}
                                              checked={selectedLocation?.type === "list" && selectedLocation.id === ls.id}
                                              onCheckedChange={() => onSelectLocation({ type: "list", id: ls.id, name: ls.name })}
                                              className="flex items-center gap-2"
                                            >
                                              <List className="h-4 w-4 text-teal-500 shrink-0" />
                                              <span className="truncate">{ls.name}</span>
                                            </DropdownMenuCheckboxItem>
                                          ))}
                                        </DropdownMenuSubContent>
                                      </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                  ))}

                                  {/* Direct Lists in Project */}
                                  {pj.lists?.map((ls: any) => (
                                    <DropdownMenuCheckboxItem
                                      key={ls.id}
                                      checked={selectedLocation?.type === "list" && selectedLocation.id === ls.id}
                                      onCheckedChange={() => onSelectLocation({ type: "list", id: ls.id, name: ls.name })}
                                      className="flex items-center gap-2"
                                    >
                                      <List className="h-4 w-4 text-teal-500 shrink-0" />
                                      <span className="truncate">{ls.name}</span>
                                    </DropdownMenuCheckboxItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                            </DropdownMenuSub>
                          ))}

                          {/* Direct Folders in Space */}
                          {sp.folders?.map((fd: any) => (
                            <DropdownMenuSub key={fd.id}>
                              <DropdownMenuSubTrigger className="flex items-center gap-2">
                                <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                                <span className="truncate">{fd.name}</span>
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent className="w-56 max-h-[380px] overflow-y-auto">
                                  <DropdownMenuCheckboxItem
                                    checked={selectedLocation?.type === "folder" && selectedLocation.id === fd.id}
                                    onCheckedChange={() => onSelectLocation({ type: "folder", id: fd.id, name: fd.name })}
                                    className="flex items-center gap-2"
                                  >
                                    <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                                    <span className="truncate">All in {fd.name}</span>
                                  </DropdownMenuCheckboxItem>
                                  <DropdownMenuSeparator />
                                  {fd.lists?.map((ls: any) => (
                                    <DropdownMenuCheckboxItem
                                      key={ls.id}
                                      checked={selectedLocation?.type === "list" && selectedLocation.id === ls.id}
                                      onCheckedChange={() => onSelectLocation({ type: "list", id: ls.id, name: ls.name })}
                                      className="flex items-center gap-2"
                                    >
                                      <List className="h-4 w-4 text-teal-500 shrink-0" />
                                      <span className="truncate">{ls.name}</span>
                                    </DropdownMenuCheckboxItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                            </DropdownMenuSub>
                          ))}

                          {/* Direct Lists in Space */}
                          {sp.lists?.map((ls: any) => (
                            <DropdownMenuCheckboxItem
                              key={ls.id}
                              checked={selectedLocation?.type === "list" && selectedLocation.id === ls.id}
                              onCheckedChange={() => onSelectLocation({ type: "list", id: ls.id, name: ls.name })}
                              className="flex items-center gap-2"
                            >
                              <List className="h-4 w-4 text-teal-500 shrink-0" />
                              <span className="truncate">{ls.name}</span>
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                  ))}

                  {/* Direct Projects in Workspace */}
                  {ws.projects?.map((pj: any) => (
                    <DropdownMenuSub key={pj.id}>
                      <DropdownMenuSubTrigger className="flex items-center gap-2">
                        <FolderKanban className="h-4 w-4 text-violet-500 shrink-0" />
                        <span className="truncate">{pj.name || pj.title}</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent className="w-56 max-h-[380px] overflow-y-auto">
                          <DropdownMenuCheckboxItem
                            checked={selectedLocation?.type === "project" && selectedLocation.id === pj.id}
                            onCheckedChange={() => onSelectLocation({ type: "project", id: pj.id, name: pj.name || pj.title })}
                            className="flex items-center gap-2"
                          >
                            <FolderKanban className="h-4 w-4 text-violet-500 shrink-0" />
                            <span className="truncate">All in {pj.name || pj.title}</span>
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuSeparator />
                          {pj.folders?.map((fd: any) => (
                            <DropdownMenuCheckboxItem
                              key={fd.id}
                              checked={selectedLocation?.type === "folder" && selectedLocation.id === fd.id}
                              onCheckedChange={() => onSelectLocation({ type: "folder", id: fd.id, name: fd.name })}
                              className="flex items-center gap-2"
                            >
                              <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                              <span className="truncate">{fd.name}</span>
                            </DropdownMenuCheckboxItem>
                          ))}
                          {pj.lists?.map((ls: any) => (
                            <DropdownMenuCheckboxItem
                              key={ls.id}
                              checked={selectedLocation?.type === "list" && selectedLocation.id === ls.id}
                              onCheckedChange={() => onSelectLocation({ type: "list", id: ls.id, name: ls.name })}
                              className="flex items-center gap-2"
                            >
                              <List className="h-4 w-4 text-teal-500 shrink-0" />
                              <span className="truncate">{ls.name}</span>
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                  ))}

                  {/* Teams in Workspace */}
                  {ws.teams?.map((tm: any) => (
                    <DropdownMenuSub key={tm.id}>
                      <DropdownMenuSubTrigger className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="truncate">{tm.name}</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent className="w-56 max-h-[380px] overflow-y-auto">
                          <DropdownMenuCheckboxItem
                            checked={selectedLocation?.type === "team" && selectedLocation.id === tm.id}
                            onCheckedChange={() => onSelectLocation({ type: "team", id: tm.id, name: tm.name })}
                            className="flex items-center gap-2"
                          >
                            <Users className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span className="truncate">All in {tm.name}</span>
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuSeparator />
                          {tm.projects?.map((pj: any) => (
                            <DropdownMenuCheckboxItem
                              key={pj.id}
                              checked={selectedLocation?.type === "project" && selectedLocation.id === pj.id}
                              onCheckedChange={() => onSelectLocation({ type: "project", id: pj.id, name: pj.name || pj.title })}
                              className="flex items-center gap-2"
                            >
                              <FolderKanban className="h-4 w-4 text-violet-500 shrink-0" />
                              <span className="truncate">{pj.name || pj.title}</span>
                            </DropdownMenuCheckboxItem>
                          ))}
                          {tm.folders?.map((fd: any) => (
                            <DropdownMenuCheckboxItem
                              key={fd.id}
                              checked={selectedLocation?.type === "folder" && selectedLocation.id === fd.id}
                              onCheckedChange={() => onSelectLocation({ type: "folder", id: fd.id, name: fd.name })}
                              className="flex items-center gap-2"
                            >
                              <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                              <span className="truncate">{fd.name}</span>
                            </DropdownMenuCheckboxItem>
                          ))}
                          {tm.lists?.map((ls: any) => (
                            <DropdownMenuCheckboxItem
                              key={ls.id}
                              checked={selectedLocation?.type === "list" && selectedLocation.id === ls.id}
                              onCheckedChange={() => onSelectLocation({ type: "list", id: ls.id, name: ls.name })}
                              className="flex items-center gap-2"
                            >
                              <List className="h-4 w-4 text-teal-500 shrink-0" />
                              <span className="truncate">{ls.name}</span>
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                  ))}

                  {/* Direct Folders in Workspace */}
                  {ws.folders?.map((fd: any) => (
                    <DropdownMenuSub key={fd.id}>
                      <DropdownMenuSubTrigger className="flex items-center gap-2">
                        <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                        <span className="truncate">{fd.name}</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent className="w-56 max-h-[380px] overflow-y-auto">
                          <DropdownMenuCheckboxItem
                            checked={selectedLocation?.type === "folder" && selectedLocation.id === fd.id}
                            onCheckedChange={() => onSelectLocation({ type: "folder", id: fd.id, name: fd.name })}
                            className="flex items-center gap-2"
                          >
                            <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                            <span className="truncate">All in {fd.name}</span>
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuSeparator />
                          {fd.lists?.map((ls: any) => (
                            <DropdownMenuCheckboxItem
                              key={ls.id}
                              checked={selectedLocation?.type === "list" && selectedLocation.id === ls.id}
                              onCheckedChange={() => onSelectLocation({ type: "list", id: ls.id, name: ls.name })}
                              className="flex items-center gap-2"
                            >
                              <List className="h-4 w-4 text-teal-500 shrink-0" />
                              <span className="truncate">{ls.name}</span>
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                  ))}

                  {/* Direct Lists in Workspace */}
                  {ws.lists?.map((ls: any) => (
                    <DropdownMenuCheckboxItem
                      key={ls.id}
                      checked={selectedLocation?.type === "list" && selectedLocation.id === ls.id}
                      onCheckedChange={() => onSelectLocation({ type: "list", id: ls.id, name: ls.name })}
                      className="flex items-center gap-2"
                    >
                      <List className="h-4 w-4 text-teal-500 shrink-0" />
                      <span className="truncate">{ls.name}</span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}

export interface SortOptionItem {
  id: string;
  label: string;
}

export function DashboardSortPopover({
  sort,
  onSortChange,
  options,
}: {
  sort: Array<{ id: string; desc: boolean }>;
  onSortChange: (sort: Array<{ id: string; desc: boolean }> | ((prev: Array<{ id: string; desc: boolean }>) => Array<{ id: string; desc: boolean }>)) => void;
  options: SortOptionItem[];
}) {
  const fullOptions = useMemo(() => {
    const defaultSorts = [
      { id: "createdAt", label: "Date Created" },
      { id: "updatedAt", label: "Last Modified" },
    ];
    const existingIds = new Set(options.map((o) => o.id));
    const toAdd = defaultSorts.filter((d) => !existingIds.has(d.id));
    return [...options, ...toAdd];
  }, [options]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-1.5 px-3 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 transition-all cursor-pointer rounded-md outline-hidden focus:ring-0 focus-visible:ring-0"
        >
          <ArrowUpDown className="h-4 w-4" />
          <span>Sort</span>
          {sort.length > 0 && (
            <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-200/70 px-1.5 text-xs font-semibold text-zinc-700">
              {sort.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[240px] p-1.5 rounded-xl shadow-xl border-zinc-200" sideOffset={8}>
        <div className="px-2 py-1.5 mb-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Sort By</span>
        </div>
        <div className="space-y-0.5">
          <div
            className="flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-zinc-50 transition-colors text-zinc-600"
            onClick={() => onSortChange([])}
          >
            <div className="h-5 w-5 shrink-0" />
            <span className="flex-1">None</span>
            {sort.length === 0 && <Check className="h-3.5 w-3.5 text-zinc-900" />}
          </div>
          {fullOptions.map((opt) => {
            const currentSortIndex = sort.findIndex((s) => s.id === opt.id);
            const isSelected = currentSortIndex >= 0;
            const currentSort = isSelected ? sort[currentSortIndex] : null;
            return (
              <div
                key={opt.id}
                className={cn(
                  "flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors",
                  isSelected ? "bg-zinc-50 text-zinc-900" : "text-zinc-600 hover:bg-zinc-100"
                )}
                onClick={() => {
                  if (isSelected) onSortChange((s) => s.filter((i) => i.id !== opt.id));
                  else onSortChange((s) => [...s, { id: opt.id, desc: false }]);
                }}
              >
                <div
                  className="h-5 w-5 flex items-center justify-center rounded hover:bg-zinc-200 transition-colors shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isSelected) onSortChange((s) => s.map((i) => (i.id === opt.id ? { ...i, desc: !i.desc } : i)));
                    else onSortChange((s) => [...s, { id: opt.id, desc: false }]);
                  }}
                >
                  {isSelected && (
                    <div className="flex flex-col items-center -space-y-1">
                      <ChevronUp className={`h-3.5 w-3.5 ${currentSort?.desc ? "text-zinc-800" : "text-zinc-300"}`} />
                      <ChevronDown className={`h-3.5 w-3.5 ${currentSort?.desc ? "text-zinc-300" : "text-zinc-800"}`} />
                    </div>
                  )}
                </div>
                <span className="flex-1">{opt.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-zinc-900" />}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
