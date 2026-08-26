"use client";

import React, { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronUp,
  Building2,
  FolderKanban,
  Folder,
  List,
  Layers,
  MapPin,
  Filter,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { TeamIcon } from "@/entities/teams/components/TeamIcon";
import { SpaceIcon } from "@/entities/spaces/components/SpaceIcon";
import { WorkspaceIcon } from "@/entities/workspace/components/WorkspaceIcon";
import { ProjectIcon } from "@/entities/projects/components/ProjectIcon";
import { FolderIcon } from "@/entities/folders/components/FolderIcon";
import { ListEntityIcon } from "@/entities/lists/components/ListEntityIcon";
import { DestinationTreeRow, ENTITY_TREE_NEST } from "@/features/dashboard/components/shared/breadcrumbTreeUi";

export type LocationType = "workspace" | "space" | "project" | "team" | "folder" | "list";

export type LocationSelection = {
  type: LocationType;
  id: string;
  name: string;
} | null;

/* -------------------------------------------------------------------------- */
/*  Data fetching + tree building                                             */
/* -------------------------------------------------------------------------- */

export function useLocationHierarchy() {
  const workspacesQuery = trpc.workspace.list.useQuery(
    { scope: "all", page: 1, pageSize: 100 } as any,
    { staleTime: 60_000 }
  );
  const spacesQuery = trpc.space.list.useQuery({ includeCounts: false } as any, { staleTime: 60_000 });
  const projectsQuery = trpc.project.list.useQuery({} as any, { staleTime: 60_000 });
  const teamsQuery = trpc.team.list.useQuery({} as any, { staleTime: 60_000 });
  const foldersQuery = trpc.folder.byContext.useQuery({ archived: false } as any, { staleTime: 60_000 });
  const listsQuery = trpc.list.byContext.useQuery({ archived: false } as any, { staleTime: 60_000 });

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
          const spFolders = wsFolders.filter((f) => f.spaceId === sp.id && !f.projectId && !f.teamId);
          const spLists = wsLists.filter((l) => l.spaceId === sp.id && !l.projectId && !l.teamId && !l.folderId);
          return {
            ...sp,
            projects: spProjects.map((p) => {
              const pFolders = wsFolders.filter((f) => f.projectId === p.id && !f.teamId);
              const pLists = wsLists.filter((l) => l.projectId === p.id && !l.folderId && !l.teamId);
              return {
                ...p,
                folders: pFolders.map((f) => ({ ...f, lists: wsLists.filter((l) => l.folderId === f.id) })),
                lists: pLists,
              };
            }),
            folders: spFolders.map((f) => ({ ...f, lists: wsLists.filter((l) => l.folderId === f.id) })),
            lists: spLists,
          };
        }),
        // Root projects: no space (teams are siblings, not parents)
        projects: wsProjects
          .filter((p) => !p.spaceId)
          .map((p) => {
            const pFolders = wsFolders.filter((f) => f.projectId === p.id && !f.teamId);
            const pLists = wsLists.filter((l) => l.projectId === p.id && !l.folderId && !l.teamId);
            return {
              ...p,
              folders: pFolders.map((f) => ({ ...f, lists: wsLists.filter((l) => l.folderId === f.id) })),
              lists: pLists,
            };
          }),
        // Teams only nest folders + lists (not projects)
        teams: wsTeams.map((tm) => {
          const tmFolders = wsFolders.filter((f) => f.teamId === tm.id && !f.projectId);
          const tmLists = wsLists.filter((l) => l.teamId === tm.id && !l.projectId && !l.folderId);
          return {
            ...tm,
            folders: tmFolders.map((f) => ({ ...f, lists: wsLists.filter((l) => l.folderId === f.id) })),
            lists: tmLists,
          };
        }),
        folders: wsFolders
          .filter((f) => !f.spaceId && !f.projectId && !f.teamId)
          .map((f) => ({ ...f, lists: wsLists.filter((l) => l.folderId === f.id) })),
        lists: wsLists.filter((l) => !l.spaceId && !l.projectId && !l.teamId && !l.folderId),
      };
    });
  }, [workspaces, spaces, projects, teams, folders, lists]);

  return { tree, isLoading: workspacesQuery.isLoading };
}

/* -------------------------------------------------------------------------- */
/*  Nested location tree node normalization + rendering                       */
/* -------------------------------------------------------------------------- */

type TreeNode = {
  type: LocationType;
  id: string;
  name: string;
  raw: any;
  children: TreeNode[];
};

function normalizeList(l: any): TreeNode {
  return { type: "list", id: l.id, name: l.name, raw: l, children: [] };
}

function normalizeFolder(f: any): TreeNode {
  return {
    type: "folder",
    id: f.id,
    name: f.name,
    raw: f,
    children: (f.lists ?? []).map(normalizeList),
  };
}

function normalizeProject(p: any): TreeNode {
  return {
    type: "project",
    id: p.id,
    name: p.name || p.title,
    raw: p,
    children: [...(p.folders ?? []).map(normalizeFolder), ...(p.lists ?? []).map(normalizeList)],
  };
}

function normalizeTeam(t: any): TreeNode {
  return {
    type: "team",
    id: t.id,
    name: t.name,
    raw: t,
    children: [
      ...(t.folders ?? []).map(normalizeFolder),
      ...(t.lists ?? []).map(normalizeList),
    ],
  };
}

function normalizeSpace(s: any): TreeNode {
  return {
    type: "space",
    id: s.id,
    name: s.name,
    raw: s,
    children: [
      ...(s.projects ?? []).map(normalizeProject),
      ...(s.folders ?? []).map(normalizeFolder),
      ...(s.lists ?? []).map(normalizeList),
    ],
  };
}

function normalizeWorkspace(ws: any): TreeNode {
  return {
    type: "workspace",
    id: ws.id,
    name: ws.name,
    raw: ws,
    children: [
      ...(ws.spaces ?? []).map(normalizeSpace),
      ...(ws.projects ?? []).map(normalizeProject),
      ...(ws.teams ?? []).map(normalizeTeam),
      ...(ws.folders ?? []).map(normalizeFolder),
      ...(ws.lists ?? []).map(normalizeList),
    ],
  };
}

export function LocationTreeIcon({
  node,
  className,
}: {
  node: { type: LocationType; raw?: any };
  className?: string;
}) {
  switch (node.type) {
    case "workspace":
      return <WorkspaceIcon icon={node.raw?.icon} className={cn("h-4 w-4 shrink-0", className)} />;
    case "space":
      return <SpaceIcon icon={node.raw?.icon} className={cn("h-4 w-4 shrink-0", className)} />;
    case "team":
      return <TeamIcon icon={node.raw?.icon} className={cn("h-4 w-4 shrink-0", className)} />;
    case "project":
      return <ProjectIcon icon={node.raw?.icon} className={cn("h-4 w-4 shrink-0", className)} />;
    case "folder":
      return <FolderIcon icon={node.raw?.icon} className={cn("h-4 w-4 shrink-0", className)} />;
    case "list":
      return (
        <span
          className={cn("h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center", className)}
          style={{ backgroundColor: node.raw?.color || "#6366f1" }}
        >
          {node.raw?.icon ? (
            <ListEntityIcon icon={node.raw.icon} className="text-white" size={12} fill />
          ) : (
            <div className="h-1.5 w-1.5 rounded-full shrink-0 bg-white/80" />
          )}
        </span>
      );
    default:
      return null;
  }
}

function LocationTreeItem({
  node,
  selectedLocation,
  onSelectLocation,
  expanded,
  toggleExpanded,
  onClose,
}: {
  node: TreeNode;
  depth?: number;
  selectedLocation: LocationSelection;
  onSelectLocation: (loc: LocationSelection) => void;
  expanded: Record<string, boolean>;
  toggleExpanded: (key: string) => void;
  onClose?: () => void;
}) {
  const key = `${node.type}-${node.id}`;
  const isExpanded = !!expanded[key];
  const hasChildren = node.children.length > 0;
  const isSelected = selectedLocation?.type === node.type && selectedLocation.id === node.id;

  return (
    <div className="space-y-0.5">
      <DestinationTreeRow
        selected={isSelected}
        kind={node.type}
        entity={node.raw}
        label={node.name}
        hasChildren={hasChildren}
        expanded={isExpanded}
        onToggle={() => toggleExpanded(key)}
        onClick={() => {
          onSelectLocation({ type: node.type, id: node.id, name: node.name });
          onClose?.();
        }}
      />
      {hasChildren && isExpanded && (
        <div className={ENTITY_TREE_NEST}>
          {node.children.map((child) => (
            <LocationTreeItem
              key={`${child.type}-${child.id}`}
              node={child}
              selectedLocation={selectedLocation}
              onSelectLocation={onSelectLocation}
              expanded={expanded}
              toggleExpanded={toggleExpanded}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Dashboard Filter Popover (Trigger with active count & hover clear X) */
/* -------------------------------------------------------------------------- */

export function DashboardFilterPopover({
  activeFiltersCount = 0,
  onClearAllFilters,
  children,
  align = "end",
  className,
}: {
  activeFiltersCount?: number;
  onClearAllFilters?: () => void;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 px-3 gap-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 transition-all font-medium text-sm flex items-center select-none"
        >
          <Filter className="h-4 w-4" />
          <span>Filter</span>
          {activeFiltersCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onClearAllFilters?.();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      e.preventDefault();
                      onClearAllFilters?.();
                    }
                  }}
                  className="group/badge relative ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200/80 hover:bg-violet-600 text-xs font-semibold text-zinc-700 hover:text-white transition-all cursor-pointer"
                >
                  <span className="group-hover/badge:hidden">{activeFiltersCount}</span>
                  <X className="hidden group-hover/badge:block h-3.5 w-3.5 text-white stroke-[2.5]" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">Clear all filters</TooltipContent>
            </Tooltip>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={8}
        className={cn(
          "w-96 p-2 rounded-xl shadow-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950",
          className
        )}
      >
        <div className="flex items-center gap-1.5 px-2 pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800/80">
          <Filter className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Filter by
          </span>
        </div>
        <div className="space-y-1">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

/* -------------------------------------------------------------------------- */
/*  Reusable Filter Item Row with Sub-Popover & Hover Clear Button            */
/* -------------------------------------------------------------------------- */

export function DashboardFilterRow({
  icon,
  label,
  valueLabel,
  valueIcon,
  onClear,
  children,
  popoverClassName,
}: {
  icon: React.ReactNode;
  label: string;
  valueLabel?: string | null;
  valueIcon?: React.ReactNode;
  onClear?: () => void;
  children: (props: { close: () => void }) => React.ReactNode;
  popoverClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const isSelected = !!valueLabel;

  return (
    <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors">
      <div className="flex items-center gap-2 text-sm font-normal text-zinc-700 dark:text-zinc-300">
        {icon}
        <span>{label}</span>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <div className="relative flex items-center group/filteritem">
          <PopoverTrigger asChild>
            {isSelected ? (
              <button
                type="button"
                className="flex items-center gap-1.5 max-w-[130px] pl-2 pr-7 py-1 text-sm text-zinc-700 bg-zinc-100 hover:bg-zinc-200/90 border border-zinc-300/80 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700/60 rounded-md transition-colors cursor-pointer text-left"
              >
                {valueIcon && <span className="shrink-0 flex items-center">{valueIcon}</span>}
                <span className="truncate">{valueLabel}</span>
              </button>
            ) : (
              <button
                type="button"
                className="flex items-center gap-1 px-2.5 py-1 text-sm text-zinc-500 hover:text-zinc-800 bg-zinc-100/90 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-md transition-colors cursor-pointer"
              >
                <span>Select</span>
                <ChevronDown className="h-3 w-3 text-zinc-400" />
              </button>
            )}
          </PopoverTrigger>

          {isSelected && onClear && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onClear();
                  }}
                  className="absolute right-1 hidden group-hover/filteritem:flex h-5 w-5 items-center justify-center rounded-full bg-zinc-300/80 hover:bg-zinc-400 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer z-10"
                >
                  <X className="h-3 w-3 stroke-[2.5]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Clear filter</TooltipContent>
            </Tooltip>
          )}
        </div>

        <PopoverContent
          side="right"
          align="start"
          sideOffset={8}
          className={cn(
            "p-1.5 rounded-xl shadow-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950",
            popoverClassName
          )}
        >
          {children({ close: () => setOpen(false) })}
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Location Type Filter Row                                                  */
/* -------------------------------------------------------------------------- */

const LOCATION_TYPE_CONFIG = [
  { id: "workspace", label: "Workspace", icon: Building2, color: "text-indigo-500" },
  { id: "space", label: "Space", icon: Layers, color: "text-blue-500" },
  { id: "project", label: "Project", icon: FolderKanban, color: "text-violet-500" },
  { id: "team", label: "Team", icon: Building2, color: "text-rose-500" },
  { id: "folder", label: "Folder", icon: Folder, color: "text-amber-500" },
  { id: "list", label: "List", icon: List, color: "text-teal-500" },
];

export function LocationTypeFilterRow({
  selectedType,
  onSelectType,
  allowedTypes,
}: {
  selectedType?: string;
  onSelectType: (type: string) => void;
  allowedTypes?: LocationType[];
}) {
  const types = useMemo(() => {
    const list = allowedTypes
      ? LOCATION_TYPE_CONFIG.filter((t) => allowedTypes.includes(t.id as any))
      : [
        { id: "workspace", label: "Workspace", icon: Building2, color: "text-indigo-500" },
        { id: "project", label: "Project", icon: FolderKanban, color: "text-violet-500" },
        { id: "folder", label: "Folder", icon: Folder, color: "text-amber-500" },
        { id: "list", label: "List", icon: List, color: "text-teal-500" },
      ];
    return list;
  }, [allowedTypes]);

  const selectedItem = types.find((t) => t.id === selectedType && selectedType !== "all");
  const SelectedIcon = selectedItem?.icon;

  return (
    <DashboardFilterRow
      icon={<Layers className="h-4 w-4 text-zinc-500" />}
      label="Location type"
      valueLabel={selectedItem?.label}
      valueIcon={SelectedIcon ? <SelectedIcon className={cn("h-3.5 w-3.5", selectedItem.color)} /> : null}
      onClear={() => onSelectType("all")}
      popoverClassName="w-48"
    >
      {({ close }) => (
        <div className="space-y-0.5">
          {types.map((t) => {
            const Icon = t.icon;
            const isSelected = selectedType === t.id;
            return (
              <div
                key={t.id}
                onClick={() => {
                  onSelectType(t.id);
                  close();
                }}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg cursor-pointer transition-colors",
                  isSelected
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800/60 dark:text-zinc-200"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", t.color)} />
                <span className="flex-1 truncate">{t.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400 shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </DashboardFilterRow>
  );
}

// Alias for compatibility
export const LocationTypeFilterSubmenu = LocationTypeFilterRow;

/* -------------------------------------------------------------------------- */
/*  Nested Location Filter Row                                                */
/* -------------------------------------------------------------------------- */

export function NestedLocationFilterRow({
  selectedLocation,
  onSelectLocation,
}: {
  selectedLocation: LocationSelection;
  onSelectLocation: (loc: LocationSelection) => void;
}) {
  const { tree } = useLocationHierarchy();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const normalizedTree = useMemo(() => tree.map(normalizeWorkspace), [tree]);

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <DashboardFilterRow
      icon={<MapPin className="h-4 w-4 text-zinc-500" />}
      label="Location"
      valueLabel={selectedLocation?.name}
      valueIcon={selectedLocation ? <LocationTreeIcon node={{ type: selectedLocation.type }} /> : null}
      onClear={() => onSelectLocation(null)}
      popoverClassName="w-72 max-h-[380px] overflow-y-auto"
    >
      {({ close }) => (
        <div className="space-y-0.5">
          {normalizedTree.map((ws) => (
            <LocationTreeItem
              key={`workspace-${ws.id}`}
              node={ws}
              selectedLocation={selectedLocation}
              onSelectLocation={onSelectLocation}
              expanded={expanded}
              toggleExpanded={toggleExpanded}
              onClose={close}
            />
          ))}
        </div>
      )}
    </DashboardFilterRow>
  );
}

// Alias for compatibility
export const NestedLocationFilterSubmenu = NestedLocationFilterRow;

/* -------------------------------------------------------------------------- */
/*  Generic Select Filter Row (for Status, Scope, Type, etc.)                 */
/* -------------------------------------------------------------------------- */

export interface FilterOptionItem {
  id: string;
  label: string;
  icon?: React.ComponentType<any> | React.ReactNode;
  color?: string;
  fill?: string;
  iconClass?: string;
}

export function FilterSelectRow({
  icon,
  label,
  value,
  values,
  options,
  onChange,
  onMultiChange,
  onClear,
  popoverClassName = "w-48",
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  values?: string[];
  options: FilterOptionItem[];
  onChange?: (value: string) => void;
  onMultiChange?: (values: string[]) => void;
  onClear?: () => void;
  popoverClassName?: string;
}) {
  // Filter out any "all" options if passed
  const displayOptions = useMemo(() => options.filter((o) => o.id !== "all" && o.id !== ""), [options]);

  const isMulti = !!values || !!onMultiChange;
  const currentValues = values || (value && value !== "all" && value !== "" ? [value] : []);

  const selectedOption = !isMulti && currentValues.length === 1
    ? displayOptions.find((o) => o.id === currentValues[0])
    : null;

  const valueLabel = useMemo(() => {
    if (currentValues.length === 0) return null;
    if (currentValues.length === 1) {
      return displayOptions.find((o) => o.id === currentValues[0])?.label || currentValues[0];
    }
    return `${currentValues.length} selected`;
  }, [currentValues, displayOptions]);

  const renderOptionIcon = (opt: FilterOptionItem) => {
    if (!opt.icon) return null;
    if (React.isValidElement(opt.icon)) {
      return opt.icon;
    }
    const IconComp = opt.icon as React.ComponentType<any>;
    return (
      <IconComp
        className={cn(
          "h-4 w-4 shrink-0",
          opt.color,
          opt.fill && `fill-${opt.fill}`,
          opt.iconClass
        )}
      />
    );
  };

  const handleSelect = (id: string, close: () => void) => {
    if (isMulti && onMultiChange) {
      const next = currentValues.includes(id)
        ? currentValues.filter((v) => v !== id)
        : [...currentValues, id];
      onMultiChange(next);
    } else if (onChange) {
      onChange(id);
      close();
    }
  };

  return (
    <DashboardFilterRow
      icon={icon}
      label={label}
      valueLabel={valueLabel}
      valueIcon={selectedOption ? renderOptionIcon(selectedOption) : null}
      onClear={onClear || (() => (isMulti && onMultiChange ? onMultiChange([]) : onChange?.("all")))}
      popoverClassName={popoverClassName}
    >
      {({ close }) => (
        <div className="space-y-0.5">
          {displayOptions.map((opt) => {
            const isSelected = currentValues.includes(opt.id);
            return (
              <div
                key={opt.id}
                onClick={() => handleSelect(opt.id, close)}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg cursor-pointer transition-colors",
                  isSelected
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800/60 dark:text-zinc-200"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                )}
              >
                {renderOptionIcon(opt)}
                <span className="flex-1 truncate">{opt.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400 shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </DashboardFilterRow>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sort Popover                                                              */
/* -------------------------------------------------------------------------- */

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
  onSortChange: (
    sort: Array<{ id: string; desc: boolean }> | ((prev: Array<{ id: string; desc: boolean }>) => Array<{ id: string; desc: boolean }>)
  ) => void;
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

  const effectiveSort = sort && sort.length > 0 ? sort : [{ id: "updatedAt", desc: true }];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-1.5 px-3 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 transition-all font-medium text-sm cursor-pointer rounded-md outline-hidden focus:ring-0 focus-visible:ring-0"
        >
          <ArrowUpDown className="h-4 w-4" />
          <span>Sort</span>
          {effectiveSort.length > 0 && (
            <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-200/70 px-1.5 text-xs font-semibold text-zinc-700">
              {effectiveSort.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[240px] p-1.5 rounded-xl shadow-xl border-zinc-200" sideOffset={8}>
        <div className="flex items-center gap-1.5 px-2 pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800/80">
          <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Sort by
          </span>
        </div>
        <div className="space-y-0.5">
          {fullOptions.map((opt) => {
            const currentSortIndex = effectiveSort.findIndex((s) => s.id === opt.id);
            const isSelected = currentSortIndex >= 0;
            const currentSort = isSelected ? effectiveSort[currentSortIndex] : null;
            return (
              <div
                key={opt.id}
                className={cn(
                  "flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors",
                  isSelected ? "bg-zinc-50 text-zinc-900 font-normal" : "text-zinc-600 hover:bg-zinc-100"
                )}
                onClick={() => {
                  if (isSelected) {
                    onSortChange((s) => {
                      const base = s && s.length > 0 ? s : [{ id: "updatedAt", desc: true }];
                      return base.map((i) => (i.id === opt.id ? { ...i, desc: !i.desc } : i));
                    });
                  } else {
                    onSortChange([{ id: opt.id, desc: true }]);
                  }
                }}
              >
                <div
                  className="h-5 w-5 flex items-center justify-center rounded hover:bg-zinc-200 transition-colors shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isSelected) {
                      onSortChange((s) => {
                        const base = s && s.length > 0 ? s : [{ id: "updatedAt", desc: true }];
                        return base.map((i) => (i.id === opt.id ? { ...i, desc: !i.desc } : i));
                      });
                    } else {
                      onSortChange([{ id: opt.id, desc: true }]);
                    }
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