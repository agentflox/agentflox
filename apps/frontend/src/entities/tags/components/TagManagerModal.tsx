"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  Filter,
  Plus,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  Tag as TagIcon,
  Sparkles,
  Info,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ConfirmDeleteModal } from "@/components/modals/ConfirmDeleteModal";
import { ThemeColorPicker } from "@/entities/shared/components/ThemeColorPicker";
import {
  DestinationTreeRow,
  ENTITY_TREE_NEST,
  EntityTreeIcon,
} from "@/features/dashboard/components/shared/breadcrumbTreeUi";

export interface TagItem {
  id: string;
  name: string;
  color: string;
  usageCount: number;
  locationType?: string;
  workspaceId?: string | null;
  spaceId?: string | null;
  projectId?: string | null;
  folderId?: string | null;
  listId?: string | null;
  teamId?: string | null;
  visibility?: "PUBLIC" | "PRIVATE" | "ADMINS" | "MEMBERS" | "EVERYONE";
  createdAt?: string;
  createdBy: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

export type LocationKey = {
  id: string;
  type: "WORKSPACE" | "SPACE" | "PROJECT" | "FOLDER" | "LIST" | "TEAM";
  name: string;
};

export type FilterRule = {
  id: string;
  field: "Created by" | "Date Created" | "Location" | "Visibility" | "Usage count";
  operator: string;
  value: string;
  dateInput?: string;
  dateUnit?: string;
};

export interface TagManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId?: string;
  initialLocation?: LocationKey;
  onTagDeleted?: (tagId: string) => void;
  onTagCreated?: (tag: TagItem) => void;
  onTagUpdated?: (tag: TagItem) => void;
}

export const TAG_COLOR_PALETTE = [
  { name: "Mint", hex: "#5eead4", bg: "#ccfbf1", text: "#0f766e" },
  { name: "Danger Red", hex: "#ef4444", bg: "#fee2e2", text: "#b91c1c" },
  { name: "Magenta", hex: "#ec4899", bg: "#fce7f3", text: "#be185d" },
  { name: "Teal", hex: "#0d9488", bg: "#ccfbf1", text: "#115e59" },
  { name: "Lavender", hex: "#c4b5fd", bg: "#ede9fe", text: "#6d28d9" },
  { name: "Vivid Blue", hex: "#2563eb", bg: "#dbeafe", text: "#1e40af" },
  { name: "Sky Blue", hex: "#3b82f6", bg: "#e0f2fe", text: "#0369a1" },
  { name: "Yellow", hex: "#eab308", bg: "#fef9c3", text: "#a16207" },
  { name: "Emerald", hex: "#10b981", bg: "#d1fae5", text: "#047857" },
  { name: "Purple", hex: "#8b5cf6", bg: "#f3e8ff", text: "#6b21a8" },
  { name: "Orange", hex: "#f97316", bg: "#ffedd5", text: "#c2410c" },
  { name: "Dark", hex: "#18181b", bg: "#27272a", text: "#ffffff" },
];

function TagColorPickerContent({
  currentColor,
  onSelectColor,
}: {
  currentColor: string;
  onSelectColor: (hex: string) => void;
}) {
  const [colorView, setColorView] = useState<"preset" | "custom">("preset");
  const [customColor, setCustomColor] = useState(currentColor || "#5eead4");
  const [colorMode, setColorMode] = useState<"RGB" | "HEX" | "HSL">("HEX");
  const colorItem = TAG_COLOR_PALETTE.find((p) => p.hex.toLowerCase() === currentColor.toLowerCase());

  const openCustom = () => {
    setCustomColor(currentColor || "#5eead4");
    setColorView("custom");
  };

  const saveCustomColor = () => {
    onSelectColor(customColor);
    setColorView("preset");
  };

  return (
    <div
      className="p-3 shadow-xl rounded-xl border border-zinc-200 bg-white"
      style={{ width: colorView === "custom" ? "250px" : "210px" }}
    >
      {colorView === "preset" ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase text-zinc-500 tracking-wider">
              Color
            </p>
            {colorItem && (
              <span className="text-xs font-medium text-zinc-400">
                {colorItem.name}
              </span>
            )}
          </div>
          <div className="grid grid-cols-6 gap-1.5 mb-3">
            {TAG_COLOR_PALETTE.map((item) => (
              <button
                key={item.hex}
                type="button"
                onClick={() => onSelectColor(item.hex)}
                className={cn(
                  "h-6 w-6 rounded-full border border-zinc-200/50 hover:scale-110 transition-transform focus:outline-none cursor-pointer flex items-center justify-center",
                  currentColor.toLowerCase() === item.hex.toLowerCase() && "ring-2 ring-offset-1 ring-purple-600"
                )}
                style={{ backgroundColor: item.hex }}
                title={item.name}
              >
                {currentColor.toLowerCase() === item.hex.toLowerCase() && (
                  <Check className="h-3 w-3 text-white drop-shadow-xs cursor-pointer" />
                )}
              </button>
            ))}
          </div>
          <div className="border-t border-zinc-100 pt-2.5">
            <button
              type="button"
              onClick={openCustom}
              className="flex w-full p-1.5 rounded-md items-center gap-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-zinc-500" />
              Add custom color
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
            <button
              type="button"
              onClick={() => setColorView("preset")}
              className="text-xs text-zinc-500 hover:text-zinc-800 font-medium rounded-md px-1.5 py-1 hover:bg-zinc-100 flex items-center gap-1 cursor-pointer"
            >
              ← Back
            </button>
            <span className="text-xs font-semibold text-zinc-700">Custom Color</span>
          </div>
          <ThemeColorPicker
            color={customColor}
            mode={colorMode}
            onModeChange={setColorMode}
            onColorChange={setCustomColor}
            onSave={saveCustomColor}
          />
        </div>
      )}
    </div>
  );
}

const FILTER_FIELD_OPTIONS: FilterRule["field"][] = [
  "Created by",
  "Date Created",
  "Location",
  "Visibility",
  "Usage count",
];

export function TagManagerModal({
  open,
  onOpenChange,
  workspaceId,
  initialLocation,
  onTagDeleted,
  onTagCreated,
  onTagUpdated,
}: TagManagerModalProps) {
  const utils = trpc.useUtils();

  // 1. Real Workspaces Query
  const { data: workspacesListData } = trpc.workspace.list.useQuery(
    { scope: "all", page: 1, pageSize: 50 },
    { enabled: open, staleTime: 5 * 60 * 1000 }
  );

  const { data: workspaceData } = trpc.workspace.get.useQuery(
    { id: workspaceId || "" },
    { enabled: open && !!workspaceId, staleTime: 5 * 60 * 1000 }
  );

  const workspaces = useMemo(() => {
    const list = (workspacesListData?.items ?? []) as any[];
    if (workspaceData && !list.some((w) => w.id === workspaceData.id)) {
      return [workspaceData, ...list];
    }
    return list;
  }, [workspacesListData, workspaceData]);

  const activeWorkspaceId = workspaceId || (workspaces[0]?.id as string | undefined);

  // 2. Real Spaces Query
  const { data: spacesData } = trpc.space.list.useQuery(
    { scope: "all", page: 1, pageSize: 50, includeCounts: false },
    { enabled: open, staleTime: 5 * 60 * 1000 }
  );
  const spaces = useMemo(() => (spacesData?.items ?? []) as any[], [spacesData]);

  // 3. Real Projects Query
  const { data: projectsData } = trpc.project.list.useQuery(
    { scope: "all", page: 1, pageSize: 50 },
    { enabled: open, staleTime: 5 * 60 * 1000 }
  );
  const projects = useMemo(() => (projectsData?.items ?? []) as any[], [projectsData]);

  // 4. Real Folders Query
  const { data: foldersData } = trpc.folder.byContext.useQuery(
    { workspaceId: activeWorkspaceId ?? "", archived: false },
    { enabled: open && Boolean(activeWorkspaceId), staleTime: 5 * 60 * 1000 }
  );
  const folders = useMemo(() => (foldersData?.items ?? []) as any[], [foldersData]);

  // 5. Real Lists Query
  const { data: listsData } = trpc.list.byContext.useQuery(
    { workspaceId: activeWorkspaceId ?? "", archived: false },
    { enabled: open && Boolean(activeWorkspaceId), staleTime: 5 * 60 * 1000 }
  );
  const lists = useMemo(() => (listsData?.items ?? []) as any[], [listsData]);

  // 6. Real Teams Query
  const { data: teamsData } = trpc.team.list.useQuery(
    { workspaceId: activeWorkspaceId ?? "" } as any,
    { enabled: open && Boolean(activeWorkspaceId), staleTime: 5 * 60 * 1000 }
  );
  const teams = useMemo(() => (teamsData?.items ?? teamsData ?? []) as any[], [teamsData]);

  // 7. Real Tags Query
  const { data: realTags = [], isLoading: isLoadingTags } = trpc.tags.list.useQuery(
    {},
    { enabled: open }
  );

  // Mutations
  const createTagMutation = trpc.tags.create.useMutation({
    onSuccess: (newTag) => {
      utils.tags.list.invalidate();
      setNewTagName("");
      setIsCreatingInline(false);
      if (onTagCreated) onTagCreated(newTag as any);
    },
  });

  const updateTagMutation = trpc.tags.update.useMutation({
    onSuccess: (updatedTag) => {
      utils.tags.list.invalidate();
      setEditingTagId(null);
      if (onTagUpdated) onTagUpdated(updatedTag as any);
    },
  });

  const deleteTagMutation = trpc.tags.delete.useMutation({
    onSuccess: (_, variables) => {
      utils.tags.list.invalidate();
      if (onTagDeleted) onTagDeleted(variables.id);
    },
  });

  // Selected Location State
  const [selectedLocation, setSelectedLocation] = useState<LocationKey | null>(initialLocation || null);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const locationSearchWrapRef = useRef<HTMLDivElement | null>(null);
  const newTagInputRef = useRef<HTMLInputElement | null>(null);
  const inlineAddRowRef = useRef<HTMLTableRowElement | null>(null);

  // Auto select the first item in "By Location" if none selected
  useEffect(() => {
    if (!open) return;

    if (initialLocation) {
      setSelectedLocation(initialLocation);
      return;
    }

    if (!selectedLocation) {
      if (workspaces.length > 0) {
        const firstWs = workspaces[0];
        const wsSpaces = spaces.filter((s) => s.workspaceId === firstWs.id);
        if (wsSpaces.length > 0) {
          setSelectedLocation({
            id: wsSpaces[0].id,
            type: "SPACE",
            name: wsSpaces[0].name,
          });
        } else {
          setSelectedLocation({
            id: firstWs.id,
            type: "WORKSPACE",
            name: firstWs.name,
          });
        }
      } else if (spaces.length > 0) {
        setSelectedLocation({
          id: spaces[0].id,
          type: "SPACE",
          name: spaces[0].name,
        });
      }
    }
  }, [open, initialLocation, workspaces, spaces, selectedLocation]);

  useEffect(() => {
    if (!showLocationSearch) return;

    const onPointerDown = (e: PointerEvent) => {
      const el = locationSearchWrapRef.current;
      if (!el) return;
      const target = e.target;
      if (!(target instanceof Node)) return;

      if (!el.contains(target)) {
        setShowLocationSearch(false);
        setLocationSearchQuery("");
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [showLocationSearch]);

  
  const [tagSearch, setTagSearch] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const lastSelectedIndexRef = useRef<number | null>(null);
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#5eead4");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Delete Confirmation State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isBulkDelete, setIsBulkDelete] = useState(false);

  // Sort State
  type SortField = "name" | "color" | "usageCount" | "createdBy";
  const [sortConfig, setSortConfig] = useState<{
    field: SortField | null;
    direction: "asc" | "desc";
  }>({
    field: null,
    direction: "asc",
  });

  const handleSort = (field: SortField) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        if (prev.direction === "asc") {
          return { field, direction: "desc" };
        }
        return { field: null, direction: "asc" };
      }
      return { field, direction: "asc" };
    });
  };

  // Advanced Filter System
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterRule[]>([]);

  const toggleCollapse = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleOpenInlineCreate = () => {
    setIsCreatingInline(true);
    setNewTagName("");
    setTimeout(() => {
      newTagInputRef.current?.focus();
    }, 60);
  };

  // Resolved current location object
  const activeLocation: LocationKey = useMemo(() => {
    if (selectedLocation) return selectedLocation;
    if (workspaces[0]) return { id: workspaces[0].id, type: "WORKSPACE", name: workspaces[0].name };
    return { id: "workspace", type: "WORKSPACE", name: "Workspace" };
  }, [selectedLocation, workspaces]);

  useEffect(() => {
    if (!isCreatingInline) return;

    const onPointerDown = (e: PointerEvent) => {
      const el = inlineAddRowRef.current;
      if (!el) return;
      const target = e.target;
      if (!(target instanceof Node)) return;

      if (el.contains(target)) return;

      const isInsidePopover = (target as Element).closest?.(
        "[data-radix-popper-content-wrapper], [data-slot='popover-content']"
      );
      if (isInsidePopover) return;

      if (newTagName.trim()) {
        handleCreateTag();
      } else {
        setIsCreatingInline(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isCreatingInline, newTagName, newTagColor, activeLocation, activeWorkspaceId]);

  // Filter tags by selected location, search query, and advanced filters
  const currentLocationTags = useMemo(() => {
    return realTags.filter((tag: any) => {
      // Location matching
      if (activeLocation.type === "WORKSPACE") {
        if (tag.workspaceId && tag.workspaceId !== activeLocation.id) return false;
      } else if (activeLocation.type === "SPACE") {
        if (tag.spaceId !== activeLocation.id) return false;
      } else if (activeLocation.type === "PROJECT") {
        if (tag.projectId !== activeLocation.id) return false;
      } else if (activeLocation.type === "FOLDER") {
        if (tag.folderId !== activeLocation.id) return false;
      } else if (activeLocation.type === "LIST") {
        if (tag.listId !== activeLocation.id) return false;
      } else if (activeLocation.type === "TEAM") {
        if (tag.teamId !== activeLocation.id) return false;
      }

      // Search term filter
      if (tagSearch && !tag.name.toLowerCase().includes(tagSearch.toLowerCase())) {
        return false;
      }

      // Advanced filters evaluation
      if (filters.length > 0) {
        const activeFilters = filters.filter((f) => f.value && f.value.trim() !== "");
        if (activeFilters.length > 0) {
          return activeFilters.every((filter) => {
            const isIs = filter.operator === "Is" || filter.operator === "Equals";

            if (filter.field === "Created by") {
              const match =
                filter.value.toLowerCase() === "me"
                  ? tag.createdBy?.id === "me"
                  : tag.createdBy?.name?.toLowerCase().includes(filter.value.toLowerCase());
              return isIs ? match : !match;
            }

            if (filter.field === "Visibility") {
              const match = String(tag.visibility || "PUBLIC").toLowerCase() === filter.value.toLowerCase();
              return isIs ? match : !match;
            }

            if (filter.field === "Usage count") {
              if (filter.value === "used") return (tag.usageCount || 0) > 0;
              if (filter.value === "unused") return (tag.usageCount || 0) === 0;
              const num = parseInt(filter.value, 10);
              if (isNaN(num)) return true;
              if (filter.operator === "Greater than") return (tag.usageCount || 0) > num;
              if (filter.operator === "Less than") return (tag.usageCount || 0) < num;
              return isIs ? (tag.usageCount || 0) === num : (tag.usageCount || 0) !== num;
            }

            if (filter.field === "Location") {
              const parts = filter.value.split(":");
              const locId = parts.length > 1 ? parts[1] : filter.value;
              const match =
                tag.locationId === locId ||
                tag.spaceId === locId ||
                tag.projectId === locId ||
                tag.folderId === locId ||
                tag.listId === locId ||
                activeLocation.id === locId;
              return isIs ? match : !match;
            }

            return true;
          });
        }
      }

      return true;
    });
  }, [realTags, activeLocation, tagSearch, filters]);

  // Sort tags by chosen field and direction
  const sortedLocationTags = useMemo(() => {
    if (!sortConfig.field) return currentLocationTags;

    return [...currentLocationTags].sort((a: any, b: any) => {
      let comparison = 0;

      if (sortConfig.field === "name") {
        comparison = (a.name || "").localeCompare(b.name || "", undefined, { numeric: true, sensitivity: "base" });
      } else if (sortConfig.field === "color") {
        comparison = (a.color || "").localeCompare(b.color || "");
      } else if (sortConfig.field === "usageCount") {
        comparison = (a.usageCount || 0) - (b.usageCount || 0);
      } else if (sortConfig.field === "createdBy") {
        const nameA = a.createdBy?.name || "";
        const nameB = b.createdBy?.name || "";
        comparison = nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" });
      }

      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [currentLocationTags, sortConfig]);

  // Handlers for Tag Operations
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTagIds(sortedLocationTags.map((t: any) => t.id));
    } else {
      setSelectedTagIds([]);
    }
  };

  const handleToggleSelectTag = (id: string, index: number, event?: React.MouseEvent) => {
    const isShiftKey = event?.shiftKey;

    if (isShiftKey && lastSelectedIndexRef.current !== null) {
      const startIndex = Math.min(lastSelectedIndexRef.current, index);
      const endIndex = Math.max(lastSelectedIndexRef.current, index);
      const rangeTagIds = sortedLocationTags.slice(startIndex, endIndex + 1).map((t: any) => t.id);

      setSelectedTagIds((prev) => {
        const next = new Set(prev);
        rangeTagIds.forEach((rangeId) => next.add(rangeId));
        return Array.from(next);
      });
    } else {
      setSelectedTagIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
      lastSelectedIndexRef.current = index;
    }
  };

  const handleOpenDeleteSingle = (tag: { id: string; name: string }) => {
    setTagToDelete(tag);
    setIsBulkDelete(false);
    setDeleteModalOpen(true);
  };

  const handleOpenDeleteBulk = () => {
    if (selectedTagIds.length === 0) return;
    setTagToDelete(null);
    setIsBulkDelete(true);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (isBulkDelete) {
      const idsToDelete = [...selectedTagIds];
      setSelectedTagIds([]);
      await Promise.all(idsToDelete.map((id) => deleteTagMutation.mutateAsync({ id })));
      utils.tags.list.invalidate();
    } else if (tagToDelete) {
      await deleteTagMutation.mutateAsync({ id: tagToDelete.id });
      setSelectedTagIds((prev) => prev.filter((id) => id !== tagToDelete.id));
      utils.tags.list.invalidate();
    }
  };

  const handleCreateTag = () => {
    if (!newTagName.trim() || createTagMutation.isPending) return;

    createTagMutation.mutate({
      name: newTagName.trim(),
      color: newTagColor,
      workspaceId: activeWorkspaceId,
      spaceId: activeLocation.type === "SPACE" ? activeLocation.id : undefined,
      projectId: activeLocation.type === "PROJECT" ? activeLocation.id : undefined,
      folderId: activeLocation.type === "FOLDER" ? activeLocation.id : undefined,
      listId: activeLocation.type === "LIST" ? activeLocation.id : undefined,
      teamId: activeLocation.type === "TEAM" ? activeLocation.id : undefined,
      visibility: "PUBLIC",
    });
  };

  const handleUpdateColor = (tagId: string, newColor: string) => {
    updateTagMutation.mutate({
      id: tagId,
      color: newColor,
    });
  };

  const handleStartRename = (tag: any) => {
    setEditingTagId(tag.id);
    setEditingName(tag.name);
  };

  const handleSaveRename = (tagId: string) => {
    if (editingTagId !== tagId) return;
    setEditingTagId(null);
    const trimmed = editingName.trim();
    if (!trimmed) {
      return;
    }
    updateTagMutation.mutate({
      id: tagId,
      name: trimmed,
    });
  };

  const getTagPillStyle = (colorHex: string) => {
    const paletteItem = TAG_COLOR_PALETTE.find((p) => p.hex === colorHex);
    if (paletteItem) {
      return {
        backgroundColor: paletteItem.bg,
        color: paletteItem.text,
      };
    }
    return {
      backgroundColor: `${colorHex}20`,
      color: colorHex,
    };
  };

  const allSelected =
    sortedLocationTags.length > 0 && selectedTagIds.length === sortedLocationTags.length;
  const activeFilterCount = filters.filter((f) => f.value && f.value.trim() !== "").length;

  const renderSortableHeader = (field: SortField, title: string, className?: string) => {
    const isSorted = sortConfig.field === field ? sortConfig.direction : false;
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className={cn(
          "group -ml-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer select-none",
          isSorted && "text-purple-700 bg-purple-50/80 hover:bg-purple-100/80",
          className
        )}
      >
        <span>{title}</span>
        <div className="flex flex-col items-center -space-y-1">
          <ChevronUp
            className={cn(
              "h-3 w-3 transition-colors",
              isSorted === "asc" ? "text-purple-600" : "text-zinc-300 group-hover:text-zinc-400"
            )}
          />
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-colors",
              isSorted === "desc" ? "text-purple-600" : "text-zinc-300 group-hover:text-zinc-400"
            )}
          />
        </div>
      </button>
    );
  };

  const getLocationIcon = (type: LocationKey["type"]) => {
    return <EntityTreeIcon kind={type.toLowerCase()} />;
  };

  // Helper to count tags in a location
  const getTagCountForLocation = (type: LocationKey["type"], id: string) => {
    return realTags.filter((t: any) => {
      if (type === "WORKSPACE") return t.workspaceId === id;
      if (type === "SPACE") return t.spaceId === id;
      if (type === "PROJECT") return t.projectId === id;
      if (type === "FOLDER") return t.folderId === id;
      if (type === "LIST") return t.listId === id;
      if (type === "TEAM") return t.teamId === id;
      return false;
    }).length;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-7xl max-w-7xl w-[90vw] h-[85vh] p-0 gap-0 overflow-hidden bg-white rounded-2xl shadow-2xl border-0 z-[55]"
        showCloseButton={false}
      >
        <TooltipProvider delayDuration={150}>
          <DialogTitle className="sr-only">Tag Manager</DialogTitle>

        <div className="flex flex-row w-full h-full overflow-hidden">
          {/* ── LEFT SIDEBAR: BY LOCATION (NESTED STRUCTURE) ── */}
          <div className="w-[270px] shrink-0 border-r border-zinc-100 bg-[#fafafa] flex flex-col h-full">
            {/* Header */}
            <div className="p-3 pb-3">
              <h2 className="text-base font-semibold text-zinc-900 tracking-tight pb-4 border-b border-zinc-200/80">
                Tag Manager
              </h2>
            </div>

            {/* Search / Filter Location Label */}
            <div ref={locationSearchWrapRef} className="px-3 pb-1">
              <div className="w-full flex items-center justify-between py-1.5">
                <span className="text-[12px] font-semibold tracking-wide text-zinc-600">By Location</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowLocationSearch((v) => !v);
                    if (showLocationSearch) setLocationSearchQuery("");
                  }}
                  className="text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200/70 p-1 rounded-md cursor-pointer transition-colors"
                  title="Search locations"
                >
                  <Search className="h-3.5 w-3.5 cursor-pointer" />
                </button>
              </div>

              {showLocationSearch && (
                <div className="pb-2">
                  <div className="flex h-8 items-center rounded-md border border-zinc-200 bg-white px-3 shadow-sm transition-colors focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10">
                    <Search className="h-3 w-3 shrink-0 text-zinc-400 mr-1.5" />
                    <Input
                      variant="ghost"
                      value={locationSearchQuery}
                      onChange={(e) => setLocationSearchQuery(e.target.value)}
                      placeholder="Search locations..."
                      autoFocus
                      className="h-full w-full bg-transparent p-0 focus:outline-none focus:ring-0 focus-visible:ring-0 text-xs shadow-none border-0 placeholder:text-zinc-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Hierarchical Location Tree */}
            <ScrollArea className="flex-1 px-2">
              <div className="space-y-0.5 py-1">
                {workspaces.map((ws) => {
                  const locationSearchLower = locationSearchQuery.toLowerCase();
                  const isSearching = !!locationSearchQuery;
                  const isWsExpanded = !collapsedNodes[ws.id] || isSearching;
                  const wsSpaces = spaces.filter(
                    (s) =>
                      s.workspaceId === ws.id &&
                      (!isSearching || s.name?.toLowerCase().includes(locationSearchLower))
                  );
                  const wsProjects = projects.filter(
                    (p) =>
                      p.workspaceId === ws.id &&
                      !p.spaceId &&
                      (!isSearching || p.name?.toLowerCase().includes(locationSearchLower))
                  );
                  const wsTeams = teams.filter(
                    (t) =>
                      t.workspaceId === ws.id &&
                      (!isSearching || t.name?.toLowerCase().includes(locationSearchLower))
                  );
                  const wsFolders = folders.filter(
                    (f) =>
                      f.workspaceId === ws.id &&
                      !f.spaceId &&
                      !f.projectId &&
                      !f.teamId &&
                      (!isSearching || f.name?.toLowerCase().includes(locationSearchLower))
                  );
                  const wsLists = lists.filter(
                    (l) =>
                      l.workspaceId === ws.id &&
                      !l.spaceId &&
                      !l.projectId &&
                      !l.teamId &&
                      !l.folderId &&
                      (!isSearching || l.name?.toLowerCase().includes(locationSearchLower))
                  );
                  const hasWsChildren =
                    wsSpaces.length > 0 ||
                    wsProjects.length > 0 ||
                    wsTeams.length > 0 ||
                    wsFolders.length > 0 ||
                    wsLists.length > 0;
                  const isWsSelected = activeLocation.id === ws.id && activeLocation.type === "WORKSPACE";
                  const wsTagCount = getTagCountForLocation("WORKSPACE", ws.id);
                  const pick = (id: string, type: LocationKey["type"], name: string) => {
                    setSelectedLocation({ id, type, name });
                    setSelectedTagIds([]);
                    setIsCreatingInline(false);
                  };

                  const renderFolderBranch = (fold: any) => {
                    const foldLists = lists.filter((l) => l.folderId === fold.id);
                    const foldHasChildren = foldLists.length > 0;
                    const isFoldExpanded = !collapsedNodes[fold.id] || isSearching;
                    return (
                      <div key={fold.id} className="space-y-0.5">
                        <DestinationTreeRow
                          selected={activeLocation.id === fold.id && activeLocation.type === "FOLDER"}
                          kind="folder"
                          entity={fold}
                          label={fold.name}
                          hasChildren={foldHasChildren}
                          expanded={isFoldExpanded}
                          onToggle={(e) => toggleCollapse(fold.id, e)}
                          onClick={() => pick(fold.id, "FOLDER", fold.name)}
                          trailing={<span className="text-[10px] text-zinc-400">{getTagCountForLocation("FOLDER", fold.id)}</span>}
                        />
                        {isFoldExpanded && foldHasChildren && (
                          <div className={ENTITY_TREE_NEST}>
                            {foldLists.map((lst) => (
                              <DestinationTreeRow
                                key={lst.id}
                                selected={activeLocation.id === lst.id && activeLocation.type === "LIST"}
                                kind="list"
                                entity={lst}
                                label={lst.name}
                                onClick={() => pick(lst.id, "LIST", lst.name)}
                                trailing={<span className="text-[10px] text-zinc-400">{getTagCountForLocation("LIST", lst.id)}</span>}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  };

                  const renderProjectBranch = (proj: any) => {
                    const projFolders = folders.filter((f) => f.projectId === proj.id && !f.teamId);
                    const projLists = lists.filter((l) => l.projectId === proj.id && !l.folderId && !l.teamId);
                    const hasProjChildren = projFolders.length > 0 || projLists.length > 0;
                    const isProjExpanded = !collapsedNodes[proj.id] || isSearching;
                    return (
                      <div key={proj.id} className="space-y-0.5">
                        <DestinationTreeRow
                          selected={activeLocation.id === proj.id && activeLocation.type === "PROJECT"}
                          kind="project"
                          entity={proj}
                          label={proj.name}
                          hasChildren={hasProjChildren}
                          expanded={isProjExpanded}
                          onToggle={(e) => toggleCollapse(proj.id, e)}
                          onClick={() => pick(proj.id, "PROJECT", proj.name)}
                          trailing={<span className="text-[10px] text-zinc-400">{getTagCountForLocation("PROJECT", proj.id)}</span>}
                        />
                        {isProjExpanded && hasProjChildren && (
                          <div className={ENTITY_TREE_NEST}>
                            {projFolders.map(renderFolderBranch)}
                            {projLists.map((lst) => (
                              <DestinationTreeRow
                                key={lst.id}
                                selected={activeLocation.id === lst.id && activeLocation.type === "LIST"}
                                kind="list"
                                entity={lst}
                                label={lst.name}
                                onClick={() => pick(lst.id, "LIST", lst.name)}
                                trailing={<span className="text-[10px] text-zinc-400">{getTagCountForLocation("LIST", lst.id)}</span>}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  };

                  if (isSearching && !hasWsChildren && !ws.name?.toLowerCase().includes(locationSearchLower)) {
                    return null;
                  }

                  return (
                    <div key={ws.id} className="space-y-0.5">
                      <DestinationTreeRow
                        selected={isWsSelected}
                        kind="workspace"
                        entity={{ logo: ws.logo ?? ws.avatarUrl, color: ws.color }}
                        label={ws.name}
                        hasChildren={hasWsChildren}
                        expanded={isWsExpanded}
                        onToggle={(e) => toggleCollapse(ws.id, e)}
                        onClick={() => pick(ws.id, "WORKSPACE", ws.name)}
                        trailing={<span className="text-[11px] font-medium text-zinc-400">{wsTagCount}</span>}
                      />
                      {isWsExpanded && hasWsChildren && (
                        <div className={ENTITY_TREE_NEST}>
                          {wsSpaces.map((space) => {
                            const isSpaceExpanded = !collapsedNodes[space.id] || isSearching;
                            const spaceProjects = projects.filter((p) => p.spaceId === space.id);
                            const spaceFolders = folders.filter((f) => f.spaceId === space.id && !f.projectId && !f.teamId);
                            const spaceLists = lists.filter(
                              (l) => l.spaceId === space.id && !l.folderId && !l.projectId && !l.teamId
                            );
                            const hasSpaceChildren =
                              spaceProjects.length > 0 || spaceFolders.length > 0 || spaceLists.length > 0;
                            const isSpaceSelected =
                              activeLocation.id === space.id && activeLocation.type === "SPACE";
                            const spaceTagCount = getTagCountForLocation("SPACE", space.id);
                            return (
                              <div key={space.id} className="space-y-0.5">
                                <DestinationTreeRow
                                  selected={isSpaceSelected}
                                  kind="space"
                                  entity={space}
                                  label={space.name}
                                  hasChildren={hasSpaceChildren}
                                  expanded={isSpaceExpanded}
                                  onToggle={(e) => toggleCollapse(space.id, e)}
                                  onClick={() => pick(space.id, "SPACE", space.name)}
                                  trailing={<span className="text-[11px] font-medium text-zinc-400">{spaceTagCount}</span>}
                                />
                                {isSpaceExpanded && hasSpaceChildren && (
                                  <div className={ENTITY_TREE_NEST}>
                                    {spaceProjects.map(renderProjectBranch)}
                                    {spaceFolders.map(renderFolderBranch)}
                                    {spaceLists.map((lst) => (
                                      <DestinationTreeRow
                                        key={lst.id}
                                        selected={activeLocation.id === lst.id && activeLocation.type === "LIST"}
                                        kind="list"
                                        entity={lst}
                                        label={lst.name}
                                        onClick={() => pick(lst.id, "LIST", lst.name)}
                                        trailing={<span className="text-[10px] text-zinc-400">{getTagCountForLocation("LIST", lst.id)}</span>}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {wsProjects.map(renderProjectBranch)}
                          {wsTeams.map((team) => {
                            const teamFolders = folders.filter((f) => f.teamId === team.id && !f.projectId);
                            const teamLists = lists.filter((l) => l.teamId === team.id && !l.projectId && !l.folderId);
                            const hasTeamChildren = teamFolders.length > 0 || teamLists.length > 0;
                            const isTeamExpanded = !collapsedNodes[team.id] || isSearching;
                            return (
                              <div key={team.id} className="space-y-0.5">
                                <DestinationTreeRow
                                  selected={activeLocation.id === team.id && activeLocation.type === "TEAM"}
                                  kind="team"
                                  entity={team}
                                  label={team.name}
                                  hasChildren={hasTeamChildren}
                                  expanded={isTeamExpanded}
                                  onToggle={(e) => toggleCollapse(team.id, e)}
                                  onClick={() => pick(team.id, "TEAM", team.name)}
                                  trailing={<span className="text-[10px] text-zinc-400">{getTagCountForLocation("TEAM", team.id)}</span>}
                                />
                                {isTeamExpanded && hasTeamChildren && (
                                  <div className={ENTITY_TREE_NEST}>
                                    {teamFolders.map(renderFolderBranch)}
                                    {teamLists.map((lst) => (
                                      <DestinationTreeRow
                                        key={lst.id}
                                        selected={activeLocation.id === lst.id && activeLocation.type === "LIST"}
                                        kind="list"
                                        entity={lst}
                                        label={lst.name}
                                        onClick={() => pick(lst.id, "LIST", lst.name)}
                                        trailing={<span className="text-[10px] text-zinc-400">{getTagCountForLocation("LIST", lst.id)}</span>}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {wsFolders.map(renderFolderBranch)}
                          {wsLists.map((lst) => (
                            <DestinationTreeRow
                              key={lst.id}
                              selected={activeLocation.id === lst.id && activeLocation.type === "LIST"}
                              kind="list"
                              entity={lst}
                              label={lst.name}
                              onClick={() => pick(lst.id, "LIST", lst.name)}
                              trailing={<span className="text-[10px] text-zinc-400">{getTagCountForLocation("LIST", lst.id)}</span>}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* ── MAIN CONTENT AREA ── */}
          <div className="flex-1 flex flex-col h-full bg-white overflow-hidden relative">
            {/* Top Bar Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center shrink-0">
                  {getLocationIcon(activeLocation.type)}
                </div>
                <h3 className="text-base font-semibold text-zinc-900 tracking-tight">
                  {activeLocation.name}
                </h3>
              </div>

              <button
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4 cursor-pointer" />
              </button>
            </div>

            {/* Action Toolbar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                {/* Search tags input */}
                <div className="flex h-8 w-64 items-center rounded-md border border-zinc-200 bg-white px-2.5 transition-colors focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10">
                  <Search className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  <Input
                    variant="ghost"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    placeholder="Search tags..."
                    className="h-full w-full bg-transparent p-0 pl-1.5 focus:outline-none focus:ring-0 focus-visible:ring-0 text-[13px] shadow-none border-0 placeholder:text-zinc-400"
                  />
                </div>

                {/* Advanced Filter Popover */}
                <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 text-xs gap-1.5 border-zinc-200 hover:bg-zinc-50 rounded-lg text-zinc-700 font-medium transition-colors shadow-2xs cursor-pointer",
                        activeFilterCount > 0 && "border-purple-200 bg-purple-50 text-purple-700 font-semibold"
                      )}
                    >
                      <Filter className="h-3.5 w-3.5 text-zinc-500 cursor-pointer" />
                      <span>Filter</span>
                      {activeFilterCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.2 bg-purple-200 text-purple-800 text-[10px] rounded-full font-bold">
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[620px] p-0 rounded-2xl shadow-xl border-zinc-200 bg-white z-[200]" sideOffset={8}>
                    <div className="flex items-center justify-between p-3.5 border-b border-zinc-100">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-zinc-900">Tag Filters</span>
                        <Info className="h-3.5 w-3.5 text-zinc-400" />
                      </div>
                      <button
                        onClick={() => setIsFilterOpen(false)}
                        className="h-6 w-6 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-500 transition-colors cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5 cursor-pointer" />
                      </button>
                    </div>

                    <div className="p-4 space-y-3">
                      {filters.map((filter) => (
                        <div key={filter.id} className="flex items-center gap-2">
                          {/* Field Selector */}
                          <div className="w-[140px] shrink-0">
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="flex h-8 w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-2.5 text-xs text-zinc-700 cursor-pointer hover:border-zinc-300 shadow-2xs">
                                  <span>{filter.field}</span>
                                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400 cursor-pointer" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent align="start" className="w-[160px] p-1 rounded-xl shadow-md border-zinc-200 z-[200]">
                                {FILTER_FIELD_OPTIONS.map((f) => (
                                  <button
                                    key={f}
                                    onClick={() =>
                                      setFilters(
                                        filters.map((item) =>
                                          item.id === filter.id ? { ...item, field: f, value: "" } : item
                                        )
                                      )
                                    }
                                    className="w-full flex items-center justify-between text-xs text-zinc-700 py-1.5 px-2 rounded-md hover:bg-zinc-100 cursor-pointer"
                                  >
                                    <span>{f}</span>
                                    {filter.field === f && <Check className="h-3.5 w-3.5 text-purple-600" />}
                                  </button>
                                ))}
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Operator Selector */}
                          <div className="w-[95px] shrink-0">
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="flex h-8 w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-2.5 text-xs text-zinc-700 cursor-pointer hover:border-zinc-300 shadow-2xs">
                                  <span>{filter.operator}</span>
                                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400 cursor-pointer" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent align="start" className="w-[110px] p-1 rounded-xl shadow-md border-zinc-200 z-[200]">
                                {["Is", "Is not", "Greater than", "Less than", "Equals"].map((op) => (
                                  <button
                                    key={op}
                                    onClick={() =>
                                      setFilters(
                                        filters.map((item) =>
                                          item.id === filter.id ? { ...item, operator: op } : item
                                        )
                                      )
                                    }
                                    className="w-full text-left text-xs text-zinc-700 py-1.5 px-2 rounded-md hover:bg-zinc-100 cursor-pointer"
                                  >
                                    {op}
                                  </button>
                                ))}
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Value Input */}
                          <div className="flex-1 min-w-0">
                            {filter.field === "Created by" ? (
                              <Input
                                placeholder="e.g. Caroline or Me"
                                value={filter.value}
                                onChange={(e) =>
                                  setFilters(
                                    filters.map((item) =>
                                      item.id === filter.id ? { ...item, value: e.target.value } : item
                                    )
                                  )
                                }
                                className="h-8 text-xs bg-white border-zinc-200 rounded-lg"
                              />
                            ) : filter.field === "Usage count" ? (
                              <Input
                                type="number"
                                placeholder="Tasks count (e.g. 0)"
                                value={filter.value}
                                onChange={(e) =>
                                  setFilters(
                                    filters.map((item) =>
                                      item.id === filter.id ? { ...item, value: e.target.value } : item
                                    )
                                  )
                                }
                                className="h-8 text-xs bg-white border-zinc-200 rounded-lg"
                              />
                            ) : filter.field === "Visibility" ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="flex h-8 w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-2.5 text-xs text-zinc-700 cursor-pointer hover:border-zinc-300 shadow-2xs">
                                    <span>
                                      {filter.value === "public"
                                        ? "Public"
                                        : filter.value === "private"
                                          ? "Private / Admins"
                                          : "Select visibility"}
                                    </span>
                                    <ChevronDown className="h-3.5 w-3.5 text-zinc-400 cursor-pointer" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-[150px] p-1 rounded-xl shadow-md border-zinc-200 z-[200]">
                                  <button
                                    onClick={() =>
                                      setFilters(
                                        filters.map((item) =>
                                          item.id === filter.id ? { ...item, value: "public" } : item
                                        )
                                      )
                                    }
                                    className="w-full text-left text-xs text-zinc-700 py-1.5 px-2 rounded-md hover:bg-zinc-100 cursor-pointer"
                                  >
                                    Public
                                  </button>
                                  <button
                                    onClick={() =>
                                      setFilters(
                                        filters.map((item) =>
                                          item.id === filter.id ? { ...item, value: "private" } : item
                                        )
                                      )
                                    }
                                    className="w-full text-left text-xs text-zinc-700 py-1.5 px-2 rounded-md hover:bg-zinc-100 cursor-pointer"
                                  >
                                    Private / Admins
                                  </button>
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <Input
                                placeholder="Value..."
                                value={filter.value}
                                onChange={(e) =>
                                  setFilters(
                                    filters.map((item) =>
                                      item.id === filter.id ? { ...item, value: e.target.value } : item
                                    )
                                  )
                                }
                                className="h-8 text-xs bg-white border-zinc-200 rounded-lg"
                              />
                            )}
                          </div>

                          {/* Remove Rule */}
                          <button
                            onClick={() => setFilters(filters.filter((f) => f.id !== filter.id))}
                            className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 cursor-pointer" />
                          </button>
                        </div>
                      ))}

                      {/* Add Filter Action */}
                      <button
                        onClick={() =>
                          setFilters([
                            ...filters,
                            { id: Math.random().toString(), field: "Created by", operator: "Is", value: "" },
                          ])
                        }
                        className="text-xs font-medium text-purple-700 hover:text-purple-800 flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5 cursor-pointer" />
                        <span>Add filter</span>
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Top Right "New Tag" Button */}
              <Button
                onClick={handleOpenInlineCreate}
                className="h-8 text-xs bg-[#7b38d8] hover:bg-[#6c2ec2] text-white shadow-xs rounded-lg font-medium px-3.5 gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Plus className="h-3.5 w-3.5 cursor-pointer" />
                <span>New tag</span>
              </Button>
            </div>

            {/* Table Container or Empty State */}
            <div className="flex-1 overflow-auto flex flex-col">
              {isLoadingTags ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-zinc-400">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  <span className="text-xs font-medium text-zinc-500">Loading tags...</span>
                </div>
              ) : sortedLocationTags.length === 0 && !isCreatingInline ? (
                /* PREMIUM EMPTY STATE */
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in-50 duration-300">
                  <div className="relative mb-4">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-purple-100 via-indigo-50 to-purple-50 flex items-center justify-center ring-8 ring-purple-50/50 shadow-inner">
                      <TagIcon className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white shadow-md border border-purple-100 flex items-center justify-center">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    </div>
                  </div>

                  <h4 className="text-base font-semibold text-zinc-900 mb-1">
                    {tagSearch ? "No tags matching search" : `No tags in ${activeLocation.name}`}
                  </h4>
                  <p className="text-xs text-zinc-500 max-w-sm mb-5 leading-relaxed">
                    {tagSearch
                      ? "Try adjusting your search query or clear the filter to see all tags."
                      : `Organize, categorize, and filter tasks across your workspace by creating tags in this ${activeLocation.type.toLowerCase()}.`}
                  </p>

                  <Button
                    onClick={handleOpenInlineCreate}
                    className="h-8 text-xs bg-[#7b38d8] hover:bg-[#6c2ec2] text-white shadow-md rounded-lg font-medium px-4 gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
                  >
                    <Plus className="h-3.5 w-3.5 cursor-pointer" />
                    <span>Create tag</span>
                  </Button>
                </div>
              ) : (
                <div className="w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-100 text-[11px] font-medium text-zinc-400 tracking-wider bg-zinc-50/40 sticky top-0 z-10 backdrop-blur-xs">
                        <th className="py-2.5 px-6 w-12 text-center">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={handleSelectAll}
                            className="border-zinc-300 rounded cursor-pointer"
                          />
                        </th>
                        <th className="py-2 px-4 font-semibold text-zinc-500">
                          {renderSortableHeader("name", "Tag Name")}
                        </th>
                        <th className="py-2 px-4 font-semibold text-zinc-500">
                          {renderSortableHeader("color", "Color")}
                        </th>
                        <th className="py-2 px-4 font-semibold text-zinc-500">
                          {renderSortableHeader("usageCount", "Usage")}
                        </th>
                        <th className="py-2 px-4 font-semibold text-zinc-500">
                          {renderSortableHeader("createdBy", "Created by")}
                        </th>
                        <th className="py-2.5 px-6 text-right font-semibold text-zinc-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-xs">
                      {sortedLocationTags.map((tag: any, index: number) => {
                        const isChecked = selectedTagIds.includes(tag.id);
                        const isEditing = editingTagId === tag.id;
                        const style = getTagPillStyle(tag.color);

                        return (
                          <tr
                            key={tag.id}
                            className={cn(
                              "group transition-colors hover:bg-zinc-50/80",
                              isChecked && "bg-purple-50/30"
                            )}
                          >
                            {/* Checkbox with Shift + Click support */}
                            <td className="py-2.5 px-6 text-center">
                              <Checkbox
                                checked={isChecked}
                                onClick={(e) => handleToggleSelectTag(tag.id, index, e)}
                                className="border-zinc-300 rounded cursor-pointer"
                              />
                            </td>

                            {/* Tag Name Pill */}
                            <td className="py-2.5 px-4 font-medium text-zinc-800">
                              {isEditing ? (
                                <div className="flex items-center gap-1.5">
                                  <Input
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onBlur={() => handleSaveRename(tag.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSaveRename(tag.id);
                                      if (e.key === "Escape") setEditingTagId(null);
                                    }}
                                    autoFocus
                                    className="h-7 text-xs w-44 rounded-md border-purple-300 focus:ring-1 focus:ring-purple-500"
                                  />
                                </div>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      onClick={() => handleStartRename(tag)}
                                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:opacity-90 shadow-2xs select-none"
                                      style={style}
                                    >
                                      {tag.name}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs py-1 px-2 bg-zinc-900 text-white rounded z-[200]">
                                    Click to edit tag name
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </td>

                            {/* Color Picker Indicator with Custom Color Support */}
                            <td className="py-2.5 px-4">
                              <Popover>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center">
                                      <PopoverTrigger asChild>
                                        <button
                                          type="button"
                                          className="flex items-center gap-2 group/color p-1 rounded-md hover:bg-zinc-100 transition-colors cursor-pointer"
                                        >
                                          <span
                                            className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10 shrink-0 shadow-2xs transition-transform group-hover/color:scale-110 cursor-pointer"
                                            style={{ backgroundColor: tag.color }}
                                          />
                                        </button>
                                      </PopoverTrigger>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs py-1 px-2 bg-zinc-900 text-white rounded z-[200]">
                                    Edit color ({TAG_COLOR_PALETTE.find((p) => p.hex.toLowerCase() === tag.color.toLowerCase())?.name || tag.color})
                                  </TooltipContent>
                                </Tooltip>
                                <PopoverContent align="start" className="p-0 rounded-xl shadow-xl w-full border-0 bg-transparent z-[200]" sideOffset={6}>
                                  <TagColorPickerContent
                                    currentColor={tag.color}
                                    onSelectColor={(hex) => handleUpdateColor(tag.id, hex)}
                                  />
                                </PopoverContent>
                              </Popover>
                            </td>

                            {/* Usage Count */}
                            <td className="py-2.5 px-4 text-zinc-500 font-medium">
                              {tag.usageCount > 0 ? (
                                <span>{tag.usageCount} {tag.usageCount === 1 ? "task" : "tasks"}</span>
                              ) : (
                                <span className="text-zinc-400">-</span>
                              )}
                            </td>

                            {/* Created By User */}
                            <td className="py-2.5 px-4">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-2 cursor-pointer w-fit">
                                    <Avatar className="h-5 w-5 ring-1 ring-zinc-200 cursor-pointer">
                                      {tag.createdBy?.avatarUrl && (
                                        <AvatarImage src={tag.createdBy.avatarUrl} alt={tag.createdBy.name} />
                                      )}
                                      <AvatarFallback className="text-[9px] bg-purple-100 text-purple-700 font-bold">
                                        {tag.createdBy?.name ? tag.createdBy.name.charAt(0).toUpperCase() : "U"}
                                      </AvatarFallback>
                                    </Avatar>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs py-1 px-2 bg-zinc-900 text-white rounded z-[200]">
                                  Created by {tag.createdBy?.name || "User"}
                                </TooltipContent>
                              </Tooltip>
                            </td>

                            {/* Actions */}
                            <td className="py-2.5 px-6 text-right">
                              <button
                                onClick={() => handleOpenDeleteSingle({ id: tag.id, name: tag.name })}
                                className="text-zinc-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                title="Delete tag"
                              >
                                <Trash2 className="h-3.5 w-3.5 cursor-pointer" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Inline Creation Row */}
                      {isCreatingInline && (
                        <tr ref={inlineAddRowRef} className="bg-purple-50/40 border-b border-purple-100">
                          <td className="py-2.5 px-6 text-center">
                            <div className="h-3.5 w-3.5 rounded bg-purple-300 mx-auto animate-pulse" />
                          </td>
                          <td className="py-2.5 px-4" colSpan={2}>
                            <div className="flex items-center gap-2 min-w-0">
                              <Input
                                ref={newTagInputRef}
                                placeholder="Tag Name"
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleCreateTag();
                                  if (e.key === "Escape") setIsCreatingInline(false);
                                }}
                                autoFocus
                                className="h-8 text-xs w-56 rounded-lg border-purple-300 focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                              />

                              {/* Color selection popover for new tag with custom color support */}
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center">
                                        <PopoverTrigger asChild>
                                          <button type="button" className="h-8 px-2.5 rounded-lg border border-zinc-200 bg-white flex items-center gap-1.5 text-xs text-zinc-600 hover:bg-zinc-50 shadow-2xs cursor-pointer">
                                            <span
                                              className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10"
                                              style={{ backgroundColor: newTagColor }}
                                            />
                                            <ChevronDown className="h-3 w-3 text-zinc-500 cursor-pointer" />
                                          </button>
                                        </PopoverTrigger>
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs py-1 px-2 bg-zinc-900 text-white rounded z-[200]">
                                      Add Color
                                    </TooltipContent>
                                  </Tooltip>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="p-0 rounded-xl shadow-xl border-0 bg-transparent z-[200]" sideOffset={6}>
                                  <TagColorPickerContent
                                    currentColor={newTagColor}
                                    onSelectColor={setNewTagColor}
                                  />
                                </PopoverContent>
                              </Popover>

                              <Button
                                size="sm"
                                onClick={handleCreateTag}
                                disabled={!newTagName.trim() || createTagMutation.isPending}
                                className="h-8 text-xs bg-zinc-900 hover:bg-zinc-700 text-white px-3 rounded-lg font-medium shadow-2xs cursor-pointer"
                              >
                                {createTagMutation.isPending ? "Saving..." : "Save"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setIsCreatingInline(false)}
                                className="h-8 text-xs text-zinc-500 hover:bg-zinc-100 px-2 rounded-lg cursor-pointer"
                              >
                                Cancel
                              </Button>
                            </div>
                          </td>
                          <td colSpan={3} />
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Bottom "+ New tag" Button */}
                  {!isCreatingInline && (
                    <div className="p-2 px-6 border-t border-zinc-100">
                      <button
                        onClick={handleOpenInlineCreate}
                        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 px-2.5 py-1.5 rounded-lg font-medium transition-colors group cursor-pointer -ml-2.5"
                      >
                        <Plus className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-700 transition-colors cursor-pointer" />
                        <span>New tag</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── FIXED POPUP MODAL BAR WHEN CHECKBOXES ARE SELECTED ── */}
            {selectedTagIds.length > 0 && (
              <div className="absolute bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-4 rounded-xl border border-zinc-200 bg-white/95 px-5 py-3 shadow-2xl shadow-zinc-400/20 backdrop-blur-md ring-1 ring-zinc-100 animate-in fade-in slide-in-from-bottom-4 duration-200">
                <span className="text-sm font-medium text-zinc-700">
                  {selectedTagIds.length} {selectedTagIds.length === 1 ? "tag" : "tags"} selected
                </span>
                <div className="h-4 w-px bg-zinc-200" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTagIds([])}
                  className="h-8 gap-1.5 px-3 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5 cursor-pointer" /> Deselect
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleOpenDeleteBulk}
                  disabled={deleteTagMutation.isPending}
                  className="h-8 gap-1.5 px-3 cursor-pointer bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="h-3.5 w-3.5 cursor-pointer" />
                  Delete Selected
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmDeleteModal
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          itemName={tagToDelete?.name}
          count={isBulkDelete ? selectedTagIds.length : 1}
          entityLabel="tag"
          onConfirm={handleConfirmDelete}
          isLoading={deleteTagMutation.isPending}
        />
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
