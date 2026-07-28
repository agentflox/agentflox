"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { Briefcase, ChevronDown, ChevronRight, Filter, Folder, Layers, List, Plus, Search, Settings2, Sparkles, User, X, Info, Trash2, Check, MoreHorizontal, PlusCircle, Pencil, Copy, RefreshCw, Layout, CopyPlus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SingleDateCalendar } from "@/components/ui/date-picker";
import { MultiDateCalendar } from "@/components/ui/multi-date-picker";
import { CalendarIcon } from "lucide-react";
import { ALL_FIELDS, type FieldTypeOption } from "../../task/constants/fieldTypes";
import { CustomFieldSidebarPanel } from "./CustomFieldSidebarPanel";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import { SpaceIcon } from "@/entities/spaces/components/SpaceIcon";
import { ProjectIcon } from "@/entities/projects/components/ProjectIcon";
import { WorkspaceIcon } from "@/entities/workspace/components/WorkspaceIcon";

type ContextPathPart = {
    icon: React.ReactNode;
    name: string;
    isLast?: boolean;
};

type LeftViewKey =
    | "all"
    | "workspace"
    | `workspace:${string}`
    | "personal"
    | `space:${string}`
    | `project:${string}`
    | `folder:${string}`
    | `list:${string}`
    | `team:${string}`
    | "standalone-projects"
    | "standalone-lists";

interface CustomFieldsManagerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceId: string;
    onCreateNew?: () => void;
    onAddExisting?: () => void;
    initialFieldId?: string;
    initialLocation?: LeftViewKey;
}

type LocationType = "WORKSPACE" | "SPACE" | "PROJECT" | "TEAM" | "FOLDER" | "LIST" | "PERSONAL";

const EMPTY_ARRAY = [] as any[];

export function CustomFieldsManagerModal({
    open,
    onOpenChange,
    workspaceId,
    onCreateNew,
    onAddExisting,
    initialFieldId,
    initialLocation,
}: CustomFieldsManagerModalProps) {
    const utils = trpc.useUtils();
    const [query, setQuery] = React.useState("");
    const [selectedView, setSelectedView] = React.useState<LeftViewKey>(initialLocation ?? "all");
    const [locationSearchQuery, setLocationSearchQuery] = React.useState("");
    const [showLocationSearch, setShowLocationSearch] = React.useState(false);
    const [groupBy, setGroupBy] = React.useState<"type" | "locationType" | null>(null);
    const [filters, setFilters] = React.useState<{ id: string, field: string, operator: string, value: string, dateInput?: string, dateUnit?: string }[]>([]);
    const [filterOperator, setFilterOperator] = React.useState<"AND" | "OR">("AND");
    const [isFilterOpen, setIsFilterOpen] = React.useState(false);
    const [creatorSearchQuery, setCreatorSearchQuery] = React.useState<Record<string, string>>({});
    const [dateSearchQuery, setDateSearchQuery] = React.useState<Record<string, string>>({});
    const [expandedLocations, setExpandedLocations] = React.useState<Record<string, boolean>>({});
    const [createSearch, setCreateSearch] = React.useState("");
    const [isCreateSidebarOpen, setIsCreateSidebarOpen] = React.useState(false);
    const [sidebarMode, setSidebarMode] = React.useState<"create" | "edit">("create");
    const [selectedTypeForCreation, setSelectedTypeForCreation] = React.useState<FieldTypeOption | null>(null);
    const [fieldToEdit, setFieldToEdit] = React.useState<any | null>(null);
    const [isTopCreateOpen, setIsTopCreateOpen] = React.useState(false);
    const [isEmptyCreateOpen, setIsEmptyCreateOpen] = React.useState(false);
    const locationSearchWrapRef = React.useRef<HTMLDivElement | null>(null);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
        inheritedFrom: false,
        visibility: false,
        isPinnedResolved: false,
        isRequiredInTasks: false,
        isVisibleToGuestsResolved: false,
    });
    const [table, setTable] = React.useState<import("@tanstack/react-table").Table<any> | null>(null);
    const [fieldToRemove, setFieldToRemove] = React.useState<any | null>(null);
    const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = React.useState(false);
    const [deleteFromWorkspace, setDeleteFromWorkspace] = React.useState(false);
    const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({});
    const [isAddExistingMode, setIsAddExistingMode] = React.useState(false);
    const [addExistingSelection, setAddExistingSelection] = React.useState<Record<string, boolean>>({});

    React.useEffect(() => {
        if (open && initialLocation) {
            setSelectedView(initialLocation);
        }
    }, [open, initialLocation]);

    React.useEffect(() => {
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

    const handleSelectType = (field: FieldTypeOption) => {
        setSidebarMode("create");
        setFieldToEdit(null);
        setSelectedTypeForCreation(field);
        setIsCreateSidebarOpen(true);
        setIsTopCreateOpen(false);
        setIsEmptyCreateOpen(false);
    };

    const handleEditField = React.useCallback((field: any) => {
        setSidebarMode("edit");
        setFieldToEdit(field);
        setIsCreateSidebarOpen(true);
        setIsTopCreateOpen(false);
        setIsEmptyCreateOpen(false);
    }, []);


    const activeFilterCount = filters.filter(f => f.value && f.value.trim() !== "").length;

    const defaultFields = [
        "Created by",
        "Date Created",
        "Field type",
        "Inherited From",
        "Location",
        "Pinned",
        "Required in tasks",
        "Task Type",
        "Visibility",
        "Visible to guests"
    ];

    const dateOptions = [
        "Last", "Next", "Next year", "This year", "Last year",
        "Last week", "Today", "Yesterday", "Last 7 days", "This week",
        "This month", "Last month", "Last quarter", "This quarter",
        "Exact date", "Before date", "After date", "Date range",
        "Any date", "No date"
    ];

    const { data: workspace } = trpc.workspace.get.useQuery(
        { id: workspaceId },
        { enabled: open && !!workspaceId, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
    );

    // For the manager modal, load across all workspaces the user owns or is a member of.
    // This lets the left "By Location" tree show real structure without relying on the
    // passed-in `workspaceId` prop.
    const { data: workspacesListData } = trpc.workspace.list.useQuery(
        { scope: "all", page: 1, pageSize: 50 },
        { enabled: open, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
    );

    const { data: spacesData } = trpc.space.list.useQuery(
        { scope: "all", page: 1, pageSize: 50, includeCounts: false },
        { enabled: open, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
    );
    const { data: projectsData } = trpc.project.list.useQuery(
        { scope: "all", page: 1, pageSize: 50 },
        { enabled: open, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
    );
    const { data: foldersData } = trpc.folder.byContext.useQuery(
        { workspaceId, archived: false },
        { enabled: open && !!workspaceId, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
    );
    const { data: listsData } = trpc.list.byContext.useQuery(
        { workspaceId, archived: false },
        { enabled: open && !!workspaceId, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
    );
    const { data: teamsData } = trpc.team.list.useQuery(
        { workspaceId },
        { enabled: open && !!workspaceId, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
    );
    const { data: customFieldsRaw = EMPTY_ARRAY, isLoading: isLoadingCustomFields, isFetching: isFetchingCustomFields } = trpc.customFields.list.useQuery(
        {},
        { enabled: open, staleTime: 2 * 60 * 1000, refetchOnWindowFocus: false }
    );
    // Fetch all workspace fields for "Add Existing" view
    const { data: allWorkspaceFieldsRaw = EMPTY_ARRAY } = trpc.customFields.list.useQuery(
        { workspaceId },
        { enabled: open && isAddExistingMode, staleTime: 2 * 60 * 1000, refetchOnWindowFocus: false }
    );

    const availableTaskTypes = EMPTY_ARRAY; // Assuming availableTaskTypes was supposed to be here or loaded elsewhere

    const workspaces = (workspacesListData?.items ?? EMPTY_ARRAY) as any[];

    const spaces = (spacesData?.items ?? EMPTY_ARRAY) as any[];
    const workspaceProjects = (projectsData?.items ?? EMPTY_ARRAY) as any[];
    // Reuse workspaceProjects for allProjects to avoid duplicate queries
    const allProjects = workspaceProjects;
    const folders = (foldersData?.items ?? EMPTY_ARRAY) as any[];
    const lists = (listsData?.items ?? EMPTY_ARRAY) as any[];
    const teams = (teamsData?.items ?? EMPTY_ARRAY) as any[];
    const customFields = customFieldsRaw as any[];
    const deleteCustomField = trpc.customFields.delete.useMutation({
        onSuccess: async () => {
            await utils.customFields.list.invalidate({});
        },
    });

    const projectsOutsideWorkspace = React.useMemo(
        () => allProjects.filter((p) => !p.workspaceId),
        [allProjects]
    );
    const standaloneLists = React.useMemo(
        () => lists.filter((l) => !l.spaceId && !l.workspaceId),
        [lists]
    );

    const spaceMap = React.useMemo(() => new Map(spaces.map((s) => [s.id, s])), [spaces]);
    const projectMap = React.useMemo(() => new Map(workspaceProjects.map((p) => [p.id, p])), [workspaceProjects]);
    const workspaceMap = React.useMemo(() => new Map(workspaces.map((w) => [w.id, w])), [workspaces]);
    const folderMap = React.useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);
    const listMap = React.useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);

    // Auto-expand sidebar tree for initial location
    React.useEffect(() => {
        if (!open || !initialLocation) return;

        let shouldExpand = false;
        const newExpanded: Record<string, boolean> = {};

        if (initialLocation.startsWith("list:")) {
            const listId = initialLocation.replace("list:", "");
            const list = listMap.get(listId);
            if (list) {
                if (list.folderId) newExpanded[`folder:${list.folderId}`] = true;
                if (list.projectId) newExpanded[`project:${list.projectId}`] = true;
                if (list.spaceId) newExpanded[`space:${list.spaceId}`] = true;
                if (list.workspaceId) newExpanded[`workspace:${list.workspaceId}`] = true;
                shouldExpand = true;
            }
        } else if (initialLocation.startsWith("folder:")) {
            const folderId = initialLocation.replace("folder:", "");
            const folder = folderMap.get(folderId);
            if (folder) {
                if (folder.projectId) newExpanded[`project:${folder.projectId}`] = true;
                if (folder.spaceId) newExpanded[`space:${folder.spaceId}`] = true;
                if (folder.workspaceId) newExpanded[`workspace:${folder.workspaceId}`] = true;
                shouldExpand = true;
            }
        } else if (initialLocation.startsWith("project:")) {
            const projectId = initialLocation.replace("project:", "");
            const project = projectMap.get(projectId);
            if (project) {
                if (project.spaceId) newExpanded[`space:${project.spaceId}`] = true;
                if (project.workspaceId) newExpanded[`workspace:${project.workspaceId}`] = true;
                shouldExpand = true;
            }
        } else if (initialLocation.startsWith("space:")) {
            const spaceId = initialLocation.replace("space:", "");
            const space = spaceMap.get(spaceId);
            if (space) {
                if (space.workspaceId) newExpanded[`workspace:${space.workspaceId}`] = true;
                shouldExpand = true;
            }
        }

        if (shouldExpand) {
            setExpandedLocations(prev => ({ ...prev, ...newExpanded }));
        }
    }, [open, initialLocation, listMap, folderMap, projectMap, spaceMap]);

    const isPersonalField = React.useCallback((field: any) => {
        return field.locationType === "PERSONAL" || (
            !field.workspaceId &&
            !field.spaceId &&
            !field.projectId &&
            !field.teamId &&
            !field.folderId &&
            !field.listId
        );
    }, []);

    const getLocationLabel = React.useCallback(
        (field: any) => {
            if (field.listId) return listMap.get(field.listId)?.name ?? "List";
            if (field.folderId) return folderMap.get(field.folderId)?.name ?? "Folder";
            if (field.projectId) return projectMap.get(field.projectId)?.name ?? "Project";
            if (field.spaceId) return spaceMap.get(field.spaceId)?.name ?? "Space";
            if (isPersonalField(field)) return "Personal List";
            if (field.workspaceId) return workspaceMap.get(field.workspaceId)?.name ?? "Workspace";
            if (field.locationType === "WORKSPACE") return workspace?.name ?? "Workspace";
            return field.locationType ?? "Unknown";
        },
        [folderMap, isPersonalField, listMap, projectMap, spaceMap, workspace?.name, workspaceMap]
    );

    const getFieldTypeLabel = React.useCallback((field: any) => {
        const displayType = field?.config?.fieldType ?? field?.type;
        return ALL_FIELDS.find((opt) => opt.type === displayType)?.label
            ?? displayType
            ?? "Unknown";
    }, []);

    const managerFields = React.useMemo(
        () => customFields.map((field) => ({
            ...field,
            createdByLabel: field.creator?.name ?? field.creator?.email ?? "-",
            locationLabel: getLocationLabel(field),
            typeLabel: getFieldTypeLabel(field),
            isPinnedResolved: Boolean(field.isPinned ?? field.config?.pinned ?? false),
            isVisibleToGuestsResolved: Boolean(field.isVisibleToGuests ?? field.config?.visibleToGuests ?? true),
            isPersonalResolved: isPersonalField(field),
        })),
        [customFields, getFieldTypeLabel, getLocationLabel, isPersonalField]
    );

    const hasAttemptedAutoOpen = React.useRef<string | null>(null);

    // Auto-open sidebar when initialFieldId is provided
    React.useEffect(() => {
        if (open && initialFieldId && managerFields.length > 0) {
            // Only trigger if we haven't already attempted to auto-open THIS specific ID in this session
            if (hasAttemptedAutoOpen.current !== initialFieldId) {
                const field = managerFields.find(f => f.id === initialFieldId);
                if (field) {
                    handleEditField(field);
                    hasAttemptedAutoOpen.current = initialFieldId;
                }
            }
        } else if (!open) {
            // Reset when modal closes
            hasAttemptedAutoOpen.current = null;
        }
    }, [open, initialFieldId, managerFields, handleEditField]);

    const filteredFields = React.useMemo(() => {
        let fields = [...managerFields];
        const lowerQuery = query.trim().toLowerCase();

        if (selectedView.startsWith("workspace:")) {
            const id = selectedView.split(":")[1];
            fields = fields.filter((f) => f.workspaceId === id);
        } else if (selectedView === "workspace") {
            fields = fields.filter((f) => f.locationType === "WORKSPACE" || Boolean(f.workspaceId));
        } else if (selectedView === "personal") {
            fields = fields.filter((f) => f.isPersonalResolved);
        } else if (selectedView.startsWith("space:")) {
            const id = selectedView.split(":")[1];
            fields = fields.filter((f) => f.spaceId === id);
        } else if (selectedView.startsWith("project:")) {
            const id = selectedView.split(":")[1];
            fields = fields.filter((f) => f.projectId === id);
        } else if (selectedView.startsWith("folder:")) {
            const id = selectedView.split(":")[1];
            fields = fields.filter((f) => f.folderId === id);
        } else if (selectedView.startsWith("list:")) {
            const id = selectedView.split(":")[1];
            fields = fields.filter((f) => f.listId === id);
        } else if (selectedView === "standalone-projects") {
            const standaloneProjectIds = new Set(projectsOutsideWorkspace.map((p) => p.id));
            fields = fields.filter((f) => f.projectId && standaloneProjectIds.has(f.projectId));
        } else if (selectedView === "standalone-lists") {
            const standaloneListIds = new Set(standaloneLists.map((l) => l.id));
            fields = fields.filter((f) => f.listId && standaloneListIds.has(f.listId));
        }

        if (lowerQuery) {
            fields = fields.filter((f) => {
                const name = String(f.name ?? "").toLowerCase();
                const type = String(f.typeLabel ?? f.type ?? "").toLowerCase();
                const loc = String(f.locationLabel ?? "").toLowerCase();
                return name.includes(lowerQuery) || type.includes(lowerQuery) || loc.includes(lowerQuery);
            });
        }

        if (filters.length > 0) {
            const activeFilters = filters.filter(f => f.value && f.value.trim() !== "");
            if (activeFilters.length > 0) {
                fields = fields.filter((f) => {
                    const matchResults = activeFilters.map(filter => {
                        const isIs = filter.operator === "Is";
                        if (filter.field === "Created by") {
                            const match = filter.value === "Me" ? false : (f.createdByLabel === filter.value);
                            return isIs ? match : !match;
                        }
                        if (filter.field === "Task Type") {
                            return true;
                        }
                        if (filter.field === "Visibility") {
                            const match = String(f.visibility ?? "").toLowerCase() === String(filter.value ?? "").toLowerCase();
                            return isIs ? match : !match;
                        }
                        if (filter.field === "Field type") {
                            const match = f.type === filter.value || f.config?.fieldType === filter.value;
                            return isIs ? match : !match;
                        }
                        if (filter.field === "Pinned") {
                            const match = f.isPinnedResolved === (filter.value === "true");
                            return isIs ? match : !match;
                        }
                        if (filter.field === "Visible to guests") {
                            const match = f.isVisibleToGuestsResolved === (filter.value === "true");
                            return isIs ? match : !match;
                        }
                        if (filter.field === "Required in tasks") {
                            const match = Boolean(f.isRequiredInTasks ?? f.isRequired ?? false) === (filter.value === "true");
                            return isIs ? match : !match;
                        }
                        if (filter.field === "Location") {
                            const params = filter.value?.split(":");
                            if (!params || params.length !== 2) return true;
                            const locType = params[0];
                            const locId = params[1];
                            let match = false;
                            if (locType === "workspace") match = f.locationType === "WORKSPACE" || Boolean(f.workspaceId);
                            else if (locType === "space") match = f.spaceId === locId;
                            else if (locType === "project") match = f.projectId === locId;
                            else if (locType === "folder") match = f.folderId === locId;
                            else if (locType === "list") match = f.listId === locId;
                            else if (locType === "personal") match = f.isPersonalResolved;
                            return isIs ? match : !match;
                        }
                        if (filter.field === "Date Created") {
                            if (!f.createdAt) return false;
                            const cDate = new Date(f.createdAt);
                            const now = new Date();
                            if (filter.value === "Last" || filter.value === "Next") {
                                const num = parseInt(filter.dateInput || "1", 10);
                                if (Number.isNaN(num)) return true;
                                const isNext = filter.value === "Next";
                                const multiplier = filter.dateUnit === "years" ? 365 : filter.dateUnit === "months" ? 30 : filter.dateUnit === "weeks" ? 7 : 1;
                                const daysDiff = (cDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
                                const match = isNext ? (daysDiff > 0 && daysDiff <= num * multiplier) : (daysDiff < 0 && Math.abs(daysDiff) <= num * multiplier);
                                return isIs ? match : !match;
                            } else if (filter.value === "Exact date") {
                                if (!filter.dateInput) return true;
                                const match = cDate.toDateString() === new Date(filter.dateInput).toDateString();
                                return isIs ? match : !match;
                            } else if (filter.value === "Before date") {
                                if (!filter.dateInput) return true;
                                const match = cDate < new Date(filter.dateInput);
                                return isIs ? match : !match;
                            } else if (filter.value === "After date") {
                                if (!filter.dateInput) return true;
                                const match = cDate > new Date(filter.dateInput);
                                return isIs ? match : !match;
                            } else if (filter.value === "Date range") {
                                if (!filter.dateInput || !filter.dateUnit) return true;
                                const start = new Date(filter.dateInput);
                                const end = new Date(filter.dateUnit);
                                const match = cDate >= start && cDate <= end;
                                return isIs ? match : !match;
                            }
                        }
                        return true;
                    });
                    return filterOperator === "AND" ? matchResults.every(m => m) : matchResults.some(m => m);
                });
            }
        }

        return fields;
    }, [filterOperator, filters, managerFields, projectsOutsideWorkspace, query, selectedView, standaloneLists]);

    const addExistingFields = React.useMemo(() => {
        const currentFieldIds = new Set(customFieldsRaw.map((f: any) => f.id));
        return (allWorkspaceFieldsRaw as any[])
            .map((field) => ({
                ...field,
                createdByLabel: field.creator?.name ?? field.creator?.email ?? "-",
                locationLabel: getLocationLabel(field),
                typeLabel: getFieldTypeLabel(field),
            }))
            .filter((f) => !currentFieldIds.has(f.id));
    }, [allWorkspaceFieldsRaw, customFieldsRaw, getFieldTypeLabel, getLocationLabel]);

    const handleAddExisting = () => {
        setIsAddExistingMode(true);
        setAddExistingSelection({});
    };

    const handleCancelAddExisting = () => {
        setIsAddExistingMode(false);
        setAddExistingSelection({});
    };

    const bulkAddMutation = trpc.customFields.addToLocation.useMutation({
        onSuccess: async () => {
            await utils.customFields.list.invalidate({});
            setIsAddExistingMode(false);
            setAddExistingSelection({});
        },
    });

    const onConfirmAddFields = () => {
        const fieldIds = Object.keys(addExistingSelection).filter(id => addExistingSelection[id]);
        if (fieldIds.length === 0) return;

        const location = selectedView.split(":");
        const type = location[0].toUpperCase() as any;
        const id = location[1];

        bulkAddMutation.mutate({
            fieldIds,
            locationType: type,
            locationId: id,
        });
    };

    const handleRowSelectionChange = React.useCallback((rows: Record<string, boolean>) => {
        const newSelection: Record<string, boolean> = {};
        Object.keys(rows).forEach(key => {
            const fieldId = addExistingFields[parseInt(key)]?.id;
            if (fieldId) newSelection[fieldId] = true;
        });
        setAddExistingSelection(newSelection);
    }, [addExistingFields]);

    const groupedFields = React.useMemo(() => {
        if (!groupBy) return null;
        const result: Record<string, { label: string; icon: any; color: string; items: any[] }> = {};
        for (const field of filteredFields) {
            const key = groupBy === "type" ? (field.typeLabel || "Unknown Type") : field.locationLabel;
            if (!result[key]) {
                let icon: any = Settings2;
                let color = "bg-zinc-100 text-zinc-500";

                if (groupBy === "type") {
                    const opt = ALL_FIELDS.find(f => f.label === key);
                    if (opt) {
                        icon = opt.icon;
                        color = opt.color;
                    }
                } else {
                    // Location icons
                    if (key.toLowerCase().includes("personal")) icon = User;
                    else if (key.toLowerCase().includes("workspace")) icon = Briefcase;
                    else if (key.toLowerCase().includes("list")) icon = List;
                    else if (field.spaceId) icon = Layers;
                    else icon = Folder;
                    color = "bg-indigo-50 text-indigo-700";
                }

                result[key] = { label: key, icon, color, items: [] };
            }
            result[key].items.push(field);
        }
        return Object.fromEntries(Object.entries(result).sort((a, b) => a[0].localeCompare(b[0])));
    }, [filteredFields, groupBy]);

    const createContext = React.useMemo(() => {
        if (selectedView === "workspace") {
            return { workspaceId, locationType: "WORKSPACE" as const };
        }
        if (selectedView.startsWith("workspace:")) {
            const id = selectedView.split(":")[1];
            return { workspaceId: id, locationType: "WORKSPACE" as const };
        }
        if (selectedView === "personal") {
            return { workspaceId: undefined, locationType: "PERSONAL" as const };
        }
        if (selectedView.startsWith("space:")) {
            const id = selectedView.split(":")[1];
            const s = spaceMap.get(id);
            return { workspaceId: s?.workspaceId ?? null, spaceId: id, locationType: "SPACE" as const };
        }
        if (selectedView.startsWith("project:")) {
            const id = selectedView.split(":")[1];
            const p = projectMap.get(id);
            return { workspaceId: p?.workspaceId ?? null, projectId: id, locationType: "PROJECT" as const };
        }
        if (selectedView.startsWith("folder:")) {
            const id = selectedView.split(":")[1];
            const f = folderMap.get(id);
            return { workspaceId: f?.workspaceId ?? null, folderId: id, locationType: "FOLDER" as const };
        }
        if (selectedView.startsWith("list:")) {
            const id = selectedView.split(":")[1];
            const l = listMap.get(id);
            return { workspaceId: l?.workspaceId ?? null, listId: id, locationType: "LIST" as const };
        }
        return { workspaceId, locationType: "WORKSPACE" as const };
    }, [selectedView, workspaceId, spaceMap, projectMap, folderMap, listMap]);

    const columns = React.useMemo<ColumnDef<any>[]>(() => [
        {
            id: "select",
            meta: {
                className: "sticky left-0 bg-white z-20 min-w-[44px] w-[44px] border-r border-zinc-100 group-hover/row:bg-zinc-50 group-data-[state=selected]/row:bg-indigo-50/50 transition-colors",
            },
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                    className="translate-y-[2px]"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                    className="translate-y-[2px]"
                    onClick={(e) => e.stopPropagation()}
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "name",
            meta: {
                className: "sticky left-[44px] bg-white z-20 min-w-[200px] border-r border-zinc-100 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] group-hover/row:bg-zinc-50 group-data-[state=selected]/row:bg-indigo-50/50 transition-colors",
            },
            header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
            cell: ({ row }) => (
                <button
                    type="button"
                    className="font-normal text-zinc-800 hover:underline cursor-pointer text-left"
                    onClick={() => handleEditField(row.original)}
                >
                    {row.original.name}
                </button>
            ),
            enableHiding: false,
        },
        {
            accessorKey: "typeLabel",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
            cell: ({ row }) => {
                const type = row.original.type;
                const fieldInfo = ALL_FIELDS.find(f => f.id === type);
                const Icon = fieldInfo?.icon || Settings2;
                return (
                    <div className="flex items-center gap-2">
                        {!isAddExistingMode && (
                            <div className={cn("h-6 w-6 rounded-md flex items-center justify-center", fieldInfo?.color || "bg-zinc-100 text-zinc-500")}>
                                <Icon className="h-3.5 w-3.5" />
                            </div>
                        )}
                        <span className={cn("text-sm text-zinc-600 font-normal", isAddExistingMode && "text-zinc-900 font-medium")}>
                            {fieldInfo?.label || row.getValue("typeLabel")}
                        </span>
                    </div>
                );
            },
            enableHiding: false,
        },
        {
            accessorKey: "createdByLabel",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Created by" />,
            cell: ({ row }) => <span className="text-zinc-600">{row.original.createdByLabel}</span>,
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Date created" />,
            cell: ({ row }) => (
                <span className="text-zinc-600">
                    {row.original.createdAt ? formatDistanceToNow(new Date(row.original.createdAt), { addSuffix: true }) : "-"}
                </span>
            ),
        },
        {
            accessorKey: "locationLabel",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Location(s)" />,
            cell: ({ row }) => {
                const f = row.original;

                let view: LeftViewKey | null = null;
                let icon: React.ReactNode = null;

                if (f.isPersonalResolved || f.locationType === "PERSONAL") {
                    view = "personal";
                } else if (f.workspaceId) {
                    view = `workspace:${f.workspaceId}` as LeftViewKey;
                    const w = workspaceMap.get(f.workspaceId);
                    icon = <WorkspaceIcon icon={w?.avatar ?? null} size={14} className="text-indigo-500" />;
                } else if (f.spaceId) {
                    view = `space:${f.spaceId}` as LeftViewKey;
                    const s = spaceMap.get(f.spaceId);
                    icon = <SpaceIcon icon={s?.icon ?? null} size={14} className="text-violet-500" />;
                } else if (f.projectId) {
                    view = `project:${f.projectId}` as LeftViewKey;
                    const p = projectMap.get(f.projectId);
                    icon = <ProjectIcon icon={p?.logo ?? null} size={14} className="text-indigo-500" />;
                } else if (f.folderId) {
                    view = `folder:${f.folderId}` as LeftViewKey;
                    icon = <Folder className="h-3.5 w-3.5 text-zinc-500" />;
                } else if (f.listId) {
                    view = `list:${f.listId}` as LeftViewKey;
                    icon = <List className="h-3.5 w-3.5 text-zinc-500" />;
                }

                return (
                    <button
                        type="button"
                        className="flex items-center gap-2 text-zinc-600 hover:text-indigo-700 cursor-pointer w-full"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (view) setSelectedView(view);
                        }}
                    >
                        {!isAddExistingMode && icon}
                        <span className={cn("truncate", isAddExistingMode && "text-zinc-600")}>{f.locationLabel}</span>
                    </button>
                );
            },
        },
        {
            accessorKey: "inheritedFrom",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Inherited From" />,
            cell: ({ row }) => <span className="text-zinc-600">{row.original.inheritedFrom || "-"}</span>,
        },
        {
            accessorKey: "visibility",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Visibility" />,
            cell: ({ row }) => <span className="text-zinc-600 capitalize">{row.original.visibility || "public"}</span>,
        },
        {
            accessorKey: "isPinnedResolved",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Pinned" />,
            cell: ({ row }) => <span className="text-zinc-600 font-medium">{row.original.isPinnedResolved ? "Yes" : "No"}</span>,
        },
        {
            accessorKey: "isRequiredInTasks",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Required in tasks" />,
            cell: ({ row }) => <span className="text-zinc-600 font-medium">{row.original.isRequiredInTasks ? "Yes" : "No"}</span>,
        },
        {
            accessorKey: "isVisibleToGuestsResolved",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Visible to guests" />,
            cell: ({ row }) => <span className="text-zinc-600 font-medium">{row.original.isVisibleToGuestsResolved ? "Yes" : "No"}</span>,
        },
        {
            id: "actions",
            enableSorting: false,
            enableHiding: false,
            size: 48,
            header: ({ table }) => {
                const shownColumns = table.getAllColumns().filter(col => col.getCanHide() && col.getIsVisible());
                const hiddenColumns = table.getAllColumns().filter(col => col.getCanHide() && !col.getIsVisible());

                const labelMap: Record<string, string> = {
                    "createdByLabel": "Created by",
                    "createdAt": "Date Created",
                    "locationLabel": "Location(s)",
                    "inheritedFrom": "Inherited From",
                    "visibility": "Visibility",
                    "isPinnedResolved": "Pinned",
                    "isRequiredInTasks": "Required in tasks",
                    "isVisibleToGuestsResolved": "Visible to guests",
                };

                const renderColumnItem = (col: any, isShown: boolean) => {
                    const title = typeof col.columnDef.header === "string" ? col.columnDef.header : col.id;
                    const label = labelMap[col.id] || title;

                    return (
                        <div
                            key={col.id}
                            className="flex items-center justify-between px-3 py-1 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer group"
                            onClick={() => col.toggleVisibility(!col.getIsVisible())}
                        >
                            <span className="text-sm font-normal text-zinc-800 group-hover:text-zinc-900 transition-colors">
                                {label}
                            </span>
                            {isShown && <Check className="h-4 w-4 text-indigo-600" />}
                        </div>
                    );
                };

                return (
                    <div className="flex items-center justify-center w-full h-full min-h-[44px]">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-all rounded-full flex items-center justify-center"
                                >
                                    <PlusCircle className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                align="end"
                                className="w-[240px] p-0 rounded-2xl shadow-2xl border-zinc-200 overflow-hidden"
                                sideOffset={8}
                            >
                                <div className="p-1.5">
                                    <div className="px-3 py-2">
                                        <span className="text-[11px] font-bold text-zinc-400 tracking-widest">Show columns</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        {shownColumns.map(col => renderColumnItem(col, true))}
                                    </div>
                                </div>

                                {hiddenColumns.length > 0 && (
                                    <>
                                        <div className="h-px bg-zinc-100" />
                                        <div className="p-1.5">
                                            <div className="px-3 py-2">
                                                <span className="text-[11px] font-bold text-zinc-400 tracking-widest">Available</span>
                                            </div>
                                            <div className="space-y-0.5">
                                                {hiddenColumns.map(col => renderColumnItem(col, false))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </PopoverContent>
                        </Popover>
                    </div>
                );
            },
            cell: ({ row }) => (
                <div className="flex items-center justify-center w-full h-full min-h-[44px]">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-600 flex items-center justify-center"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px] p-1.5 rounded-xl shadow-xl border-zinc-200">
                            <DropdownMenuItem
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors"
                                onClick={() => handleEditField(row.original)}
                            >
                                <Layout className="h-4 w-4 text-zinc-500" />
                                <span className="text-sm font-normal text-zinc-700">Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors"
                                onClick={() => handleEditField(row.original)}
                            >
                                <Pencil className="h-4 w-4 text-zinc-500" />
                                <span className="text-sm font-normal text-zinc-700">Rename</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-not-allowed opacity-50 transition-colors"
                                disabled
                            >
                                <CopyPlus className="h-4 w-4 text-zinc-400" />
                                <span className="text-sm font-normal text-zinc-400">Duplicate</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors"
                            >
                                <RefreshCw className="h-4 w-4 text-zinc-500" />
                                <span className="text-sm font-normal text-zinc-700">Convert</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors"
                                onClick={() => {
                                    navigator.clipboard.writeText(row.original.id);
                                }}
                            >
                                <Copy className="h-4 w-4 text-zinc-500" />
                                <span className="text-sm font-normal text-zinc-700">Copy field ID</span>
                            </DropdownMenuItem>

                            <div className="h-px bg-zinc-100 my-1" />

                            <DropdownMenuItem
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-zinc-700 hover:text-red-600 hover:bg-red-50 group"
                                onSelect={(e) => {
                                    e.preventDefault();
                                    setFieldToRemove(row.original);
                                    setIsRemoveConfirmOpen(true);
                                }}
                            >
                                <Trash2 className="h-4 w-4 text-zinc-500 group-hover:text-red-600 transition-colors" />
                                <span className="text-sm font-normal group-hover:text-red-600">Remove from this List</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
        },
    ], [handleEditField, workspaceMap, spaceMap, projectMap]);

    const leftItemClass = (isActive: boolean, indent = false) =>
        cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-left transition-all cursor-pointer group relative overflow-hidden",
            indent && "pl-9",
            isActive
                ? "bg-indigo-50 text-indigo-700 font-semibold shadow-sm border-indigo-100/50 border"
                : "text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-900 font-medium"
        );

    const toggleLocation = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedLocations(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const locationSearchLower = locationSearchQuery.trim().toLowerCase();
    const isSearchingLocation = locationSearchLower.length > 0;

    const currentContextPathParts = React.useMemo(() => {
        if (selectedView === "all") {
            return [{ icon: <Sparkles className="h-4 w-4 text-indigo-500" />, name: "All Custom Fields", isLast: true }];
        }
        if (selectedView === "workspace") {
            return [{ icon: <Briefcase className="h-4 w-4 text-indigo-500" />, name: "Workspace", isLast: true }];
        }
        if (selectedView.startsWith("workspace:")) {
            const id = selectedView.split(":")[1];
            const w = workspaceMap.get(id);
            return [{ icon: <Briefcase className="h-4 w-4 text-indigo-500" />, name: w?.name ?? "Workspace", isLast: true }];
        }
        if (selectedView === "personal") {
            return [{ icon: <User className="h-4 w-4 text-indigo-500" />, name: "Personal List", isLast: true }];
        }
        if (selectedView === "standalone-projects") {
            return [{ icon: <Briefcase className="h-4 w-4 text-indigo-500" />, name: "Projects (No Workspace)", isLast: true }];
        }
        if (selectedView === "standalone-lists") {
            return [{ icon: <List className="h-4 w-4 text-indigo-500" />, name: "Lists (No Space)", isLast: true }];
        }

        if (selectedView.startsWith("space:")) {
            const id = selectedView.split(":")[1];
            const space = spaceMap.get(id);
            const w = space?.workspaceId ? workspaceMap.get(space.workspaceId) : null;
            const parts: ContextPathPart[] = [];
            if (w) parts.push({ icon: <WorkspaceIcon icon={w.avatar} size={14} className="text-indigo-400" />, name: w.name });
            parts.push({
                icon: space?.icon ? <span className="text-[14px] leading-none">{space.icon}</span> : <div className="p-0.5 rounded-sm bg-violet-500 text-white flex items-center justify-center"><Briefcase className="h-3 w-3" /></div>,
                name: space?.name ?? "Space",
                isLast: true
            });
            return parts;
        }

        if (selectedView.startsWith("project:")) {
            const id = selectedView.split(":")[1];
            const project = projectMap.get(id);
            if (!project) return [{ icon: <Briefcase className="h-4 w-4 text-indigo-500" />, name: "Project", isLast: true }];

            const space = project.spaceId ? spaceMap.get(project.spaceId) : null;
            const w = project.workspaceId ? workspaceMap.get(project.workspaceId) : (space?.workspaceId ? workspaceMap.get(space.workspaceId) : null);
            const parts: ContextPathPart[] = [];
            if (w) parts.push({ icon: <WorkspaceIcon icon={w.avatar} size={14} className="text-indigo-400" />, name: w.name });
            if (space) parts.push({ icon: space.icon ? <span className="text-[14px] leading-none">{space.icon}</span> : <Briefcase className="h-3.5 w-3.5 text-violet-500" />, name: space.name });
            parts.push({ icon: <ProjectIcon icon={project.logo} size={16} className="text-indigo-500" />, name: project.name, isLast: true });
            return parts;
        }

        if (selectedView.startsWith("folder:")) {
            const id = selectedView.split(":")[1];
            const folder = folderMap.get(id);
            if (!folder) return [{ icon: <Folder className="h-4 w-4 text-indigo-500" />, name: "Folder", isLast: true }];

            const space = folder.spaceId ? spaceMap.get(folder.spaceId) : null;
            const w = space?.workspaceId ? workspaceMap.get(space.workspaceId) : null;
            const parts: ContextPathPart[] = [];
            if (w) parts.push({ icon: <WorkspaceIcon icon={w.avatar} size={14} className="text-indigo-400" />, name: w.name });
            if (space) parts.push({ icon: space.icon ? <span className="text-[14px] leading-none">{space.icon}</span> : <Briefcase className="h-3.5 w-3.5 text-violet-500" />, name: space.name });
            parts.push({ icon: <Folder className="h-4 w-4 text-amber-500" />, name: folder.name, isLast: true });
            return parts;
        }

        if (selectedView.startsWith("list:")) {
            const id = selectedView.split(":")[1];
            const list = listMap.get(id);
            if (!list) return [{ icon: <List className="h-4 w-4 text-indigo-500" />, name: "List", isLast: true }];

            const folder = list.folderId ? folderMap.get(list.folderId) : null;
            const project = list.projectId ? projectMap.get(list.projectId) : null;
            const space = list.spaceId ? spaceMap.get(list.spaceId) : (folder?.spaceId ? spaceMap.get(folder.spaceId) : (project?.spaceId ? spaceMap.get(project.spaceId) : null));
            const w = list.workspaceId ? workspaceMap.get(list.workspaceId) : (space?.workspaceId ? workspaceMap.get(space.workspaceId) : null);

            const parts: ContextPathPart[] = [];
            if (w) parts.push({ icon: <WorkspaceIcon icon={w.avatar} size={14} className="text-indigo-400" />, name: w.name });
            if (space) parts.push({ icon: space.icon ? <span className="text-[14px] leading-none">{space.icon}</span> : <Briefcase className="h-3.5 w-3.5 text-violet-500" />, name: space.name });
            if (project) parts.push({ icon: <ProjectIcon icon={project.logo} size={16} className="text-indigo-500" />, name: project.name });
            if (folder) parts.push({ icon: <Folder className="h-4 w-4 text-amber-500" />, name: folder.name });
            parts.push({ icon: <List className="h-4 w-4 text-indigo-500" />, name: list.name, isLast: true });
            return parts;
        }

        return [];
    }, [selectedView, workspaceMap, spaceMap, projectMap, folderMap, listMap]);

    const currentContextPathText = React.useMemo(() => {
        if (currentContextPathParts.length === 0) return "Custom Fields";
        return currentContextPathParts.map(p => p.name).join(' / ');
    }, [currentContextPathParts]);

    const currentContextLabel = React.useMemo(() => {
        if (currentContextPathParts.length === 0) {
            return <span className="font-semibold text-zinc-800 text-sm">Custom Fields</span>;
        }

        return (
            <div className="flex items-center gap-2.5 text-sm">
                {currentContextPathParts.map((part, i) => (
                    <React.Fragment key={i}>
                        <div className={cn(
                            "flex items-center gap-1.5 whitespace-nowrap",
                            part.isLast ? "text-zinc-900 font-bold" : "text-zinc-500 font-medium"
                        )}>
                            {part.icon}
                            <span>{part.name}</span>
                        </div>
                        {i < currentContextPathParts.length - 1 && (
                            <span className="text-zinc-300 font-light translate-y-[0.5px]">/</span>
                        )}
                    </React.Fragment>
                ))}
            </div>
        );
    }, [currentContextPathParts]);;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent showCloseButton={false} className="sm:max-w-[1280px] h-[86vh] p-0 gap-0 overflow-hidden">
                    <DialogTitle className="sr-only">Custom Field Manager</DialogTitle>
                    <DialogDescription className="sr-only">
                        Manage custom fields by workspace, personal list, and location hierarchy.
                    </DialogDescription>

                    <div className="h-full w-full flex relative min-w-0 overflow-hidden">
                        <aside className="w-[260px] border-r bg-zinc-50/50 flex flex-col pt-4">
                            <div className="px-5 pb-3">
                                <h2 className="text-[15px] font-semibold text-zinc-800 tracking-tight">Custom Field Manager</h2>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-2 pt-0 space-y-1.5">
                                    <div className="space-y-1.5 pb-2">
                                        <button
                                            type="button"
                                            className={leftItemClass(selectedView === "all")}
                                            onClick={() => setSelectedView("all")}
                                        >
                                            <Sparkles className="h-4 w-4 text-zinc-500" />
                                            All Custom Fields
                                        </button>
                                        <button
                                            type="button"
                                            className={leftItemClass(selectedView === "workspace")}
                                            onClick={() => setSelectedView("workspace")}
                                        >
                                            <Briefcase className="h-4 w-4 text-zinc-500" />
                                            Workspace
                                        </button>
                                        <button
                                            type="button"
                                            className={leftItemClass(selectedView === "personal")}
                                            onClick={() => setSelectedView("personal")}
                                        >
                                            <User className="h-4 w-4 text-zinc-500" />
                                            Personal List
                                        </button>
                                    </div>

                                    <div ref={locationSearchWrapRef} className="pt-4 border-t border-zinc-200">
                                        <div className="w-full flex items-center justify-between px-2 py-1.5">
                                            <span className="text-[12px] font-semibold tracking-wide text-zinc-600">
                                                By Location
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowLocationSearch((v) => !v);
                                                    if (showLocationSearch) setLocationSearchQuery("");
                                                }}
                                                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
                                            >
                                                <Search className="h-3.5 w-3.5" />
                                            </button>
                                        </div>

                                        {showLocationSearch && (
                                            <div className="px-2 pb-2">
                                                <div className="flex h-8 items-center rounded-md border border-zinc-200 bg-white px-3 shadow-sm transition-colors focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10">
                                                    <Search className="h-3 w-3 shrink-0 text-zinc-400 mr-1.5" />
                                                    <Input
                                                        variant="ghost"
                                                        value={locationSearchQuery}
                                                        onChange={(e) => setLocationSearchQuery(e.target.value)}
                                                        placeholder="Search locations..."
                                                        className="h-full w-full bg-transparent p-0 focus:outline-none focus:ring-0 focus-visible:ring-0 text-sm shadow-none border-0 placeholder:text-zinc-400"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-1 pt-1">
                                            {workspaces.map((ws) => {
                                                const wsSpaces = spaces.filter(
                                                    (s) =>
                                                        (!isSearchingLocation || s.name?.toLowerCase().includes(locationSearchLower)) &&
                                                        s.workspaceId === ws.id
                                                );
                                                const wsProjects = workspaceProjects.filter(
                                                    (p) =>
                                                        (!isSearchingLocation || p.name?.toLowerCase().includes(locationSearchLower)) &&
                                                        p.workspaceId === ws.id
                                                );

                                                const isExpanded = !!expandedLocations[ws.id];
                                                const hasChildren = wsSpaces.length > 0 || wsProjects.length > 0;

                                                if (!hasChildren && isSearchingLocation) return null;

                                                return (
                                                    <div key={ws.id} className="space-y-0.5 w-full">
                                                        <button
                                                            type="button"
                                                            className={leftItemClass(selectedView === `workspace:${ws.id}`)}
                                                            onClick={() => setSelectedView(`workspace:${ws.id}`)}
                                                        >
                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                <div className="relative flex items-center justify-center h-5 w-5 shrink-0">
                                                                    {hasChildren && (
                                                                        <div
                                                                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-white shadow-sm border border-zinc-200 rounded-md cursor-pointer z-10 hover:bg-zinc-50 hover:scale-105 active:scale-95"
                                                                            onClick={(e) => toggleLocation(ws.id, e)}
                                                                        >
                                                                            {isExpanded ? (
                                                                                <ChevronDown className="h-3.5 w-3.5 text-zinc-600" />
                                                                            ) : (
                                                                                <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    <WorkspaceIcon icon={ws.avatar ?? null} size={18} className="text-indigo-500" />
                                                                </div>
                                                                <span className="truncate">{ws.name}</span>
                                                            </div>
                                                        </button>

                                                        {(isExpanded || isSearchingLocation) && (
                                                            <div className="space-y-0.5">
                                                                {wsSpaces.map((space) => (
                                                                    <button
                                                                        key={space.id}
                                                                        type="button"
                                                                        className={leftItemClass(selectedView === `space:${space.id}`, true)}
                                                                        onClick={() => setSelectedView(`space:${space.id}`)}
                                                                    >
                                                                        <SpaceIcon icon={space.icon} size={16} className="text-violet-500" />
                                                                        <span className="truncate">{space.name}</span>
                                                                    </button>
                                                                ))}
                                                                {wsProjects.map((project) => (
                                                                    <button
                                                                        key={project.id}
                                                                        type="button"
                                                                        className={leftItemClass(selectedView === `project:${project.id}`, true)}
                                                                        onClick={() => setSelectedView(`project:${project.id}`)}
                                                                    >
                                                                        <ProjectIcon icon={project.logo ?? null} size={16} className="text-indigo-500" />
                                                                        <span className="truncate">{project.name}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {workspaceProjects
                                                .filter((p) => !p.workspaceId)
                                                .filter((p) => !isSearchingLocation || p.name?.toLowerCase().includes(locationSearchLower))
                                                .map((project) => (
                                                    <button
                                                        key={project.id}
                                                        type="button"
                                                        className={leftItemClass(selectedView === `project:${project.id}`)}
                                                        onClick={() => setSelectedView(`project:${project.id}`)}
                                                    >
                                                        <ProjectIcon icon={project.logo ?? null} size={16} className="text-indigo-500" />
                                                        {project.name}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                        </aside>

                        <section className="flex-1 min-w-0 flex flex-col bg-white overflow-hidden">
                            <div className="px-6 h-14 border-b flex items-center justify-between gap-3 bg-white">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-zinc-800 text-sm">
                                        {currentContextLabel}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onOpenChange(false)}
                                    className="h-8 w-8 rounded-full text-zinc-500 hover:bg-zinc-100 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {isAddExistingMode && (
                                <div className="px-6 pt-7 pb-4 bg-white">
                                    <h2 className="text-xl font-semibold text-zinc-900 flex items-center gap-2">
                                        <span className="text-zinc-500 font-normal">Add existing fields to</span>
                                        <span className="text-indigo-600 truncate">{currentContextPathText}</span>
                                    </h2>
                                </div>
                            )}

                            <div className="px-6 py-3 border-b flex items-center justify-between gap-2 bg-white">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-[280px] items-center rounded-md border border-zinc-200 bg-white px-2.5 shadow-sm transition-colors focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10">
                                        <Search className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                                        <Input
                                            variant="ghost"
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            placeholder="Search fields..."
                                            className="h-full bg-transparent pl-2 pr-0 focus:outline-none focus:ring-0 focus-visible:ring-0 text-xs"
                                        />
                                    </div>
                                    <div className="flex items-center">
                                        {groupBy ? (
                                            <div className="flex items-center h-8 rounded-md border border-zinc-200 bg-zinc-50/80 hover:bg-cyan-50 text-zinc-700 px-1 shadow-sm">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="flex items-center h-full px-2 rounded-l-md transition-colors cursor-pointer text-xs font-medium">
                                                            <Layers className="h-3.5 w-3.5 mr-1.5 text-zinc-500" />
                                                            <span className="text-zinc-500 font-normal mr-1">Group:</span>
                                                            {groupBy === "type" ? "Field type" : "Location type"}
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start" className="w-44 p-1 rounded-xl shadow-md border-zinc-200">
                                                        <DropdownMenuItem onClick={() => setGroupBy("type")} className="text-[13px] py-1.5 cursor-pointer">
                                                            Field type
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setGroupBy("locationType")} className="text-[13px] py-1.5 cursor-pointer">
                                                            Location type
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <button
                                                    type="button"
                                                    className="mr-1 h-4 w-4 flex items-center justify-center rounded-sm hover:bg-zinc-200/60 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer border-none"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setGroupBy(null);
                                                    }}
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 text-xs font-medium border-dashed hover:bg-zinc-100/80 border-zinc-300 text-zinc-500 hover:text-zinc-700 bg-white px-2.5 shadow-sm"
                                                    >
                                                        <Layers className="h-3.5 w-3.5 mr-1.5 opacity-80" />
                                                        Group
                                                        <ChevronDown className="h-3 w-3 ml-1.5 opacity-60" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" className="w-44 p-1 rounded-xl shadow-md border-zinc-200">
                                                    <DropdownMenuItem onClick={() => setGroupBy("type")} className="text-[13px] py-1.5 cursor-pointer">
                                                        Field type
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setGroupBy("locationType")} className="text-[13px] py-1.5 cursor-pointer">
                                                        Location type
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>

                                    <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={cn(
                                                    "h-8 text-xs font-normal transition-colors shadow-sm group px-2.5",
                                                    activeFilterCount > 0
                                                        ? "border-zinc-200 bg-zinc-50/80 text-zinc-700"
                                                        : "border-dashed border-zinc-300 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100/80 bg-white"
                                                )}
                                            >
                                                <Filter className={cn("h-3.5 w-3.5 mr-1.5", activeFilterCount > 0 ? "text-zinc-500" : "opacity-80")} />
                                                {activeFilterCount > 0 ? (
                                                    <div className="flex items-center">
                                                        Filter: {activeFilterCount}
                                                        <div
                                                            className="ml-2 -mr-1 h-4 w-4 flex items-center justify-center rounded-sm hover:bg-zinc-200/60 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setFilters([]);
                                                            }}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center">
                                                        Filter
                                                        <ChevronDown className="h-3 w-3 ml-1.5 opacity-60" />
                                                    </div>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent align="start" className="w-[700px] p-0 rounded-xl shadow-lg border-zinc-200" sideOffset={8}>
                                            <div className="flex items-center justify-between p-3.5 border-b border-zinc-100">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-[15px] text-zinc-800">Filters</span>
                                                    <Info className="h-3.5 w-3.5 text-zinc-400" />
                                                </div>
                                                <button
                                                    onClick={() => setIsFilterOpen(false)}
                                                    className="h-6 w-6 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-500 transition-colors cursor-pointer"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                {filters.map((filter, index) => (
                                                    <div key={filter.id} className="flex items-center gap-2">
                                                        {filters.length > 1 && (
                                                            <div className="w-[85px] shrink-0 text-right pr-2 flex items-center justify-end">
                                                                {index === 0 ? (
                                                                    <span className="text-zinc-500 text-[13px] font-medium mr-1.5">Where</span>
                                                                ) : index === 1 ? (
                                                                    <button
                                                                        onClick={() => setFilterOperator(prev => prev === "AND" ? "OR" : "AND")}
                                                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-zinc-200 text-zinc-900 text-[13px] font-semibold hover:bg-zinc-50 shadow-sm transition-colors cursor-pointer"
                                                                    >
                                                                        {filterOperator} <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-0.5" />
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-zinc-400 text-[13px] font-semibold mr-1.5 uppercase">{filterOperator}</span>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className="w-[150px] shrink-0">
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <button className="flex h-9 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 shadow-sm text-[13px] font-normal cursor-pointer hover:border-zinc-300 transition-colors">
                                                                        <span className="text-zinc-700 truncate">{filter.field}</span>
                                                                        <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0 ml-2" />
                                                                    </button>
                                                                </PopoverTrigger>
                                                                <PopoverContent align="start" className="w-[200px] p-1 rounded-xl shadow-md border-zinc-200 max-h-[400px] overflow-y-auto" onWheel={(e) => e.stopPropagation()}>
                                                                    {defaultFields.map(f => (
                                                                        <button
                                                                            key={f}
                                                                            onClick={() => setFilters(filters.map(item => item.id === filter.id ? { ...item, field: f } : item))}
                                                                            className="w-full flex items-center justify-between text-[13px] text-zinc-700 font-normal py-1.5 px-2 rounded-md hover:bg-zinc-100 cursor-pointer transition-colors"
                                                                        >
                                                                            {f}
                                                                            {filter.field === f && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                                                                        </button>
                                                                    ))}
                                                                </PopoverContent>
                                                            </Popover>
                                                        </div>

                                                        {!["Pinned", "Visible to guests", "Visibility"].includes(filter.field) && (
                                                            <div className="w-[100px] shrink-0">
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <div className="flex h-9 items-center justify-between rounded-md border border-zinc-200 bg-white px-3 shadow-sm text-[13px] font-normal cursor-pointer hover:border-zinc-300 transition-colors">
                                                                            <span className="text-zinc-700">{filter.operator}</span>
                                                                            <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0 ml-2" />
                                                                        </div>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent align="start" className="w-[100px] p-1 rounded-xl shadow-md border-zinc-200">
                                                                        <button
                                                                            className="w-full text-left text-[13px] text-zinc-700 font-normal py-1.5 px-2 rounded-md hover:bg-zinc-100 cursor-pointer transition-colors"
                                                                            onClick={() => setFilters(filters.map(item => item.id === filter.id ? { ...item, operator: "Is" } : item))}
                                                                        >
                                                                            Is
                                                                        </button>
                                                                        <button
                                                                            className="w-full text-left text-[13px] text-zinc-700 font-normal py-1.5 px-2 rounded-md hover:bg-zinc-100 cursor-pointer transition-colors"
                                                                            onClick={() => setFilters(filters.map(item => item.id === filter.id ? { ...item, operator: "Is not" } : item))}
                                                                        >
                                                                            Is not
                                                                        </button>
                                                                    </PopoverContent>
                                                                </Popover>
                                                            </div>
                                                        )}

                                                        <div className="flex-1 min-w-0">
                                                            {filter.field === "Created by" && (filter.operator === "Is" || filter.operator === "Is not") ? (() => {
                                                                const query = (creatorSearchQuery[filter.id] || "").toLowerCase();
                                                                const filteredMembers = workspace?.members?.filter((m: any) =>
                                                                    m.user.name?.toLowerCase().includes(query) ||
                                                                    m.user.email?.toLowerCase().includes(query)
                                                                ) || [];
                                                                return (
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <div className="flex h-9 items-center justify-between rounded-md border border-zinc-200 bg-white px-3 shadow-sm text-sm text-zinc-600 cursor-pointer hover:border-zinc-300 transition-colors">
                                                                                <div className="flex items-center gap-2 truncate">
                                                                                    {filter.value ? (
                                                                                        filter.value === "Me" ? (
                                                                                            <div className="h-5 w-5 rounded-full bg-zinc-600 text-white flex items-center justify-center text-[8px] font-medium shrink-0">ME</div>
                                                                                        ) : (() => {
                                                                                            const selectedMember = workspace?.members?.find((m: any) => m.user.name === filter.value || m.user.email === filter.value);
                                                                                            if (selectedMember?.user.image) {
                                                                                                return <img src={selectedMember.user.image} alt={filter.value} className="h-5 w-5 rounded-full object-cover shrink-0" />;
                                                                                            }
                                                                                            return (
                                                                                                <div className="h-5 w-5 rounded-full bg-zinc-600 text-white flex items-center justify-center text-[8px] font-medium shrink-0">
                                                                                                    {(filter.value || "U").substring(0, 2).toUpperCase()}
                                                                                                </div>
                                                                                            );
                                                                                        })()
                                                                                    ) : (
                                                                                        <>
                                                                                            <User className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                                                                            <span className="text-zinc-400">Select creator</span>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                                <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0 ml-2" />
                                                                            </div>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent align="start" className="w-[300px] p-0 rounded-xl shadow-lg border-zinc-200" sideOffset={8}>
                                                                            <div className="p-2 border-b border-zinc-100">
                                                                                <div className="flex h-8 items-center rounded-md border border-zinc-200 bg-white px-2.5 shadow-sm transition-colors focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10">
                                                                                    <Search className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                                                                                    <Input
                                                                                        variant="ghost"
                                                                                        value={creatorSearchQuery[filter.id] || ""}
                                                                                        onChange={(e) => setCreatorSearchQuery(prev => ({ ...prev, [filter.id]: e.target.value }))}
                                                                                        className="h-full w-full bg-transparent p-0 pl-1.5 focus:outline-none focus:ring-0 focus-visible:ring-0 text-[13px] shadow-none border-0"
                                                                                        placeholder="Search or enter email..."
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <div className="p-1 max-h-[400px] overflow-y-auto" onWheel={(e) => e.stopPropagation()}>
                                                                                <button
                                                                                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-zinc-100 transition-colors text-left text-[13px] text-zinc-700 cursor-pointer"
                                                                                    onClick={() => setFilters(filters.map(item => item.id === filter.id ? { ...item, value: "Me" } : item))}
                                                                                >
                                                                                    <div className="h-6 w-6 rounded-full bg-zinc-600 text-white flex items-center justify-center text-[10px] font-medium shrink-0">ME</div>
                                                                                    Me
                                                                                </button>
                                                                                {filteredMembers.map((member: any) => (
                                                                                    <button
                                                                                        key={member.id}
                                                                                        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-zinc-100 transition-colors text-left text-[13px] text-zinc-700 cursor-pointer"
                                                                                        onClick={() => setFilters(filters.map(item => item.id === filter.id ? { ...item, value: member.user.name || member.user.email } : item))}
                                                                                    >
                                                                                        {member.user.image ? (
                                                                                            <img src={member.user.image} alt={member.user.name || "User"} className="h-6 w-6 rounded-full object-cover shrink-0" />
                                                                                        ) : (
                                                                                            <div className="h-6 w-6 rounded-full bg-zinc-600 text-white flex items-center justify-center text-[10px] font-medium shrink-0">
                                                                                                {(member.user.name || member.user.email || "U").substring(0, 2).toUpperCase()}
                                                                                            </div>
                                                                                        )}
                                                                                        <span className="truncate">{member.user.name || member.user.email}</span>
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                );
                                                            })() : filter.field === "Date Created" ? (() => {
                                                                const query = (dateSearchQuery[filter.id] || "").toLowerCase();
                                                                const filteredOptions = dateOptions.filter(o => o.toLowerCase().includes(query));
                                                                const isLastOrNext = filter.value === "Last" || filter.value === "Next";
                                                                const isSingleDate = filter.value === "Exact date" || filter.value === "Before date" || filter.value === "After date";
                                                                const isMultiDate = filter.value === "Date range";
                                                                return (
                                                                    <div className="flex gap-1.5 w-full">
                                                                        <div className={isSingleDate || isMultiDate ? "w-[124px] shrink-0" : "flex-1 min-w-[100px]"}>
                                                                            <Popover>
                                                                                <PopoverTrigger asChild>
                                                                                    <div className="flex w-full h-9 items-center justify-between rounded-md border border-zinc-200 bg-white px-3 shadow-sm text-[13px] text-zinc-600 cursor-pointer hover:border-zinc-300 transition-colors">
                                                                                        <span className={filter.value ? "text-zinc-900 truncate" : "text-zinc-400 truncate"}>
                                                                                            {filter.value || "Select option"}
                                                                                        </span>
                                                                                        <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0 ml-2" />
                                                                                    </div>
                                                                                </PopoverTrigger>
                                                                                <PopoverContent align="start" className="w-[240px] p-0 rounded-xl shadow-lg border-zinc-200" sideOffset={8}>
                                                                                    <div className="p-2 border-b border-zinc-100">
                                                                                        <div className="flex h-8 items-center rounded-md border border-zinc-200 bg-white px-2.5 shadow-sm transition-colors focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10">
                                                                                            <Search className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                                                                                            <Input
                                                                                                variant="ghost"
                                                                                                value={dateSearchQuery[filter.id] || ""}
                                                                                                onChange={(e) => setDateSearchQuery(prev => ({ ...prev, [filter.id]: e.target.value }))}
                                                                                                className="h-full w-full bg-transparent p-0 pl-1.5 focus:outline-none focus:ring-0 focus-visible:ring-0 text-[13px] shadow-none border-0"
                                                                                                placeholder="Search..."
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="p-1 max-h-[400px] overflow-y-auto" onWheel={(e) => e.stopPropagation()}>
                                                                                        {filteredOptions.map((opt) => (
                                                                                            <button
                                                                                                key={opt}
                                                                                                className="w-full flex items-center px-2 py-1.5 rounded-md hover:bg-zinc-100 transition-colors text-left text-[13px] text-zinc-700 cursor-pointer"
                                                                                                onClick={() => setFilters(filters.map(item => {
                                                                                                    if (item.id !== filter.id) return item;
                                                                                                    let dInput = item.dateInput;
                                                                                                    let dUnit = item.dateUnit;
                                                                                                    const isLastOrNext = opt === "Last" || opt === "Next";
                                                                                                    const isAbsolute = ["Exact date", "Before date", "After date", "Date range"].includes(opt);
                                                                                                    const wasLastOrNext = filter.value === "Last" || filter.value === "Next";
                                                                                                    const wasAbsolute = ["Exact date", "Before date", "After date", "Date range"].includes(filter.value);

                                                                                                    if (isLastOrNext && !wasLastOrNext) {
                                                                                                        dInput = "1";
                                                                                                        dUnit = "days";
                                                                                                    } else if (isAbsolute && !wasAbsolute) {
                                                                                                        dInput = undefined;
                                                                                                        dUnit = undefined;
                                                                                                    } else if (isLastOrNext && dInput === undefined) {
                                                                                                        dInput = "1";
                                                                                                        dUnit = "days";
                                                                                                    }

                                                                                                    return { ...item, value: opt, dateInput: dInput, dateUnit: dUnit };
                                                                                                }))}
                                                                                            >
                                                                                                {opt}
                                                                                            </button>
                                                                                        ))}
                                                                                    </div>
                                                                                </PopoverContent>
                                                                            </Popover>
                                                                        </div>
                                                                        {isLastOrNext && (
                                                                            <>
                                                                                <div className="w-[48px] shrink-0">
                                                                                    <Input
                                                                                        type="number"
                                                                                        min={1}
                                                                                        value={filter.dateInput || "1"}
                                                                                        onChange={(e) => setFilters(filters.map(item => item.id === filter.id ? { ...item, dateInput: e.target.value } : item))}
                                                                                        className="h-9 px-0 text-center text-[13px] shadow-sm border-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-300 rounded-md bg-white"
                                                                                    />
                                                                                </div>
                                                                                <div className="w-[100px] shrink-0">
                                                                                    <Popover>
                                                                                        <PopoverTrigger asChild>
                                                                                            <div className="flex w-full h-9 items-center justify-between rounded-md border border-zinc-200 bg-white px-2.5 shadow-sm text-[13px] text-zinc-700 cursor-pointer hover:border-zinc-300 transition-colors">
                                                                                                <span className="truncate">{filter.dateUnit || "days"}</span>
                                                                                                <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0 ml-1" />
                                                                                            </div>
                                                                                        </PopoverTrigger>
                                                                                        <PopoverContent align="start" className="w-[100px] p-1 rounded-xl shadow-md border-zinc-200" sideOffset={4}>
                                                                                            {["days", "weeks", "months", "years"].map((unit) => (
                                                                                                <button
                                                                                                    key={unit}
                                                                                                    className="w-full text-left text-[13px] text-zinc-700 font-medium py-1.5 px-2 rounded-md hover:bg-zinc-100 cursor-pointer transition-colors"
                                                                                                    onClick={() => setFilters(filters.map(item => item.id === filter.id ? { ...item, dateUnit: unit } : item))}
                                                                                                >
                                                                                                    {unit}
                                                                                                </button>
                                                                                            ))}
                                                                                        </PopoverContent>
                                                                                    </Popover>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                        {isSingleDate && (
                                                                            <div className="flex-1 flex min-w-0">
                                                                                <Popover>
                                                                                    <PopoverTrigger asChild>
                                                                                        <div className="flex w-full h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-[13px] text-zinc-600 cursor-pointer hover:border-zinc-300 transition-colors text-nowrap">
                                                                                            <CalendarIcon className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                                                                            <span className={filter.dateInput && !Number.isNaN(Date.parse(filter.dateInput)) ? "text-zinc-900 truncate flex-1 text-left" : "text-zinc-400 truncate flex-1 text-left"}>
                                                                                                {filter.dateInput && !Number.isNaN(Date.parse(filter.dateInput)) ? new Date(filter.dateInput).toLocaleDateString() : "Select date"}
                                                                                            </span>
                                                                                        </div>
                                                                                    </PopoverTrigger>
                                                                                    <PopoverContent align="center" className="w-auto p-0 rounded-xl shadow-lg border-zinc-200" sideOffset={8}>
                                                                                        <SingleDateCalendar
                                                                                            selectedDate={filter.dateInput && !Number.isNaN(Date.parse(filter.dateInput)) ? new Date(filter.dateInput) : undefined}
                                                                                            onDateChange={(date) => setFilters(filters.map(item => item.id === filter.id ? { ...item, dateInput: date ? date.toISOString() : undefined } : item))}
                                                                                            showTimeInput={false}
                                                                                            className="border-none shadow-none rounded-xl"
                                                                                        />
                                                                                    </PopoverContent>
                                                                                </Popover>
                                                                            </div>
                                                                        )}
                                                                        {isMultiDate && (
                                                                            <div className="flex-1 flex min-w-0">
                                                                                <Popover>
                                                                                    <PopoverTrigger asChild>
                                                                                        <div className="flex w-full h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-[13px] text-zinc-600 cursor-pointer hover:border-zinc-300 transition-colors text-nowrap">
                                                                                            <CalendarIcon className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                                                                            <span className={(filter.dateInput && !Number.isNaN(Date.parse(filter.dateInput))) || (filter.dateUnit && !Number.isNaN(Date.parse(filter.dateUnit))) ? "text-zinc-900 truncate flex-1 text-left" : "text-zinc-400 truncate flex-1 text-left"}>
                                                                                                {filter.dateInput && filter.dateUnit && !Number.isNaN(Date.parse(filter.dateInput)) && !Number.isNaN(Date.parse(filter.dateUnit)) ? `${new Date(filter.dateInput).toLocaleDateString()} - ${new Date(filter.dateUnit).toLocaleDateString()}` : filter.dateInput && !Number.isNaN(Date.parse(filter.dateInput)) ? new Date(filter.dateInput).toLocaleDateString() : "Select dates"}
                                                                                            </span>
                                                                                        </div>
                                                                                    </PopoverTrigger>
                                                                                    <PopoverContent align="center" className="w-auto p-0 rounded-xl shadow-lg border-zinc-200" sideOffset={8}>
                                                                                        <MultiDateCalendar
                                                                                            startDate={filter.dateInput && !Number.isNaN(Date.parse(filter.dateInput)) ? new Date(filter.dateInput) : undefined}
                                                                                            endDate={filter.dateUnit && !Number.isNaN(Date.parse(filter.dateUnit)) ? new Date(filter.dateUnit) : undefined}
                                                                                            onStartDateChange={(date) => setFilters(filters.map(item => item.id === filter.id ? { ...item, dateInput: date ? date.toISOString() : undefined } : item))}
                                                                                            onEndDateChange={(date) => setFilters(filters.map(item => item.id === filter.id ? { ...item, dateUnit: date ? date.toISOString() : undefined } : item))}
                                                                                            showTimeInputs={false}
                                                                                            className="border-none shadow-none rounded-xl"
                                                                                        />
                                                                                    </PopoverContent>
                                                                                </Popover>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })() : filter.field === "Location" ? (() => {
                                                                // Build nested location tree: workspace → spaces → projects/folders → lists
                                                                const locationTree: { type: string; id: string; name: string; icon: React.ReactNode; children?: { type: string; id: string; name: string; icon: React.ReactNode }[] }[] = [
                                                                    {
                                                                        type: "workspace", id: "workspace", name: workspace?.name ?? "Workspace", icon: <Briefcase className="h-3.5 w-3.5 text-zinc-400 shrink-0" />,
                                                                        children: [
                                                                            ...spaces.map((s: any) => ({
                                                                                type: "space", id: s.id, name: s.name, icon: <Layers className="h-3.5 w-3.5 text-violet-500 shrink-0" />,
                                                                                children: [
                                                                                    ...workspaceProjects.filter((p: any) => p.spaceId === s.id).map((p: any) => ({
                                                                                        type: "project", id: p.id, name: p.name, icon: <Folder className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                                                                    })),
                                                                                    ...folders.filter((f: any) => f.spaceId === s.id).map((f: any) => ({
                                                                                        type: "folder", id: f.id, name: f.name, icon: <Folder className="h-3.5 w-3.5 text-amber-500 shrink-0" />,
                                                                                    })),
                                                                                    ...lists.filter((l: any) => l.spaceId === s.id && !l.projectId && !l.folderId).map((l: any) => ({
                                                                                        type: "list", id: l.id, name: l.name, icon: <List className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                                                                                    })),
                                                                                ]
                                                                            })),
                                                                            ...lists.filter((l: any) => !l.spaceId).map((l: any) => ({
                                                                                type: "list", id: l.id, name: l.name, icon: <List className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                                                                            })),
                                                                        ]
                                                                    }
                                                                ];
                                                                const selectedLoc = filter.value ? filter.value.split(":") : null;
                                                                const selectedLocName = selectedLoc ? (selectedLoc[0] === "workspace" ? (workspace?.name ?? "Workspace") : [...spaces, ...workspaceProjects, ...folders, ...lists].find((x: any) => x.id === selectedLoc[1])?.name ?? filter.value) : null;
                                                                const renderLocNode = (node: any, depth: number = 0): React.ReactNode => {
                                                                    const locKey = `${filter.id}-${node.id}`;
                                                                    const isExpanded = expandedLocations[locKey] ?? (node.id === "workspace");
                                                                    return (
                                                                        <div key={node.id}>
                                                                            <button
                                                                                className={cn("w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-zinc-100 text-left text-[13px] text-zinc-700 cursor-pointer transition-colors", filter.value === `${node.type}:${node.id}` && "bg-zinc-100 font-medium")}
                                                                                style={{ paddingLeft: `${8 + depth * 16}px` }}
                                                                                onClick={() => setFilters(filters.map(item => item.id === filter.id ? { ...item, value: `${node.type}:${node.id}` } : item))}
                                                                            >
                                                                                {node.children?.length ? (
                                                                                    <span onClick={(e) => { e.stopPropagation(); setExpandedLocations(p => ({ ...p, [locKey]: !isExpanded })); }} className="flex items-center justify-center h-4 w-4 shrink-0">
                                                                                        <ChevronRight className={cn("h-3 w-3 text-zinc-400 transition-transform", isExpanded && "rotate-90")} />
                                                                                    </span>
                                                                                ) : <span className="w-4 shrink-0" />}
                                                                                {node.icon}
                                                                                <span className="truncate">{node.name}</span>
                                                                                {filter.value === `${node.type}:${node.id}` && <Check className="h-3.5 w-3.5 text-indigo-600 ml-auto shrink-0" />}
                                                                            </button>
                                                                            {node.children && isExpanded && node.children.map((c: any) => renderLocNode(c, depth + 1))}
                                                                        </div>
                                                                    );
                                                                };
                                                                return (
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <div className="flex h-9 items-center justify-between rounded-md border border-zinc-200 bg-white px-3 shadow-sm text-[13px] text-zinc-600 cursor-pointer hover:border-zinc-300 transition-colors">
                                                                                <span className={selectedLocName ? "text-zinc-900 truncate" : "text-zinc-400 truncate"}>{selectedLocName ?? "Select location"}</span>
                                                                                <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0 ml-2" />
                                                                            </div>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent align="start" className="w-[260px] p-1 rounded-xl shadow-lg border-zinc-200 overflow-y-auto" sideOffset={8} style={{ maxHeight: 'min(400px, var(--radix-popover-content-available-height) - 16px)' }} onWheel={(e) => e.stopPropagation()}>
                                                                            {locationTree.map(n => renderLocNode(n, 0))}
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                );
                                                            })() : filter.field === "Task Type" ? (() => {
                                                                const taskTypeOptions = (availableTaskTypes as any[]).map((t: any) => ({ value: t.id ?? t.value ?? t, label: t.name ?? t.label ?? t }));
                                                                const selectedTaskType = taskTypeOptions.find(t => t.value === filter.value);
                                                                return (
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <div className="flex h-9 items-center justify-between rounded-md border border-zinc-200 bg-white px-3 shadow-sm text-[13px] text-zinc-600 cursor-pointer hover:border-zinc-300 transition-colors">
                                                                                <span className={selectedTaskType ? "text-zinc-900 truncate" : "text-zinc-400 truncate"}>{selectedTaskType?.label ?? "Select type"}</span>
                                                                                <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0 ml-2" />
                                                                            </div>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent align="start" className="w-[200px] p-1 rounded-xl shadow-lg border-zinc-200 overflow-y-auto" sideOffset={8} style={{ maxHeight: 'min(400px, var(--radix-popover-content-available-height) - 16px)' }} onWheel={(e) => e.stopPropagation()}>
                                                                            {taskTypeOptions.map(t => (
                                                                                <button key={t.value} className={cn("w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-zinc-100 text-left text-[13px] text-zinc-700 cursor-pointer transition-colors", filter.value === t.value && "bg-zinc-50 font-medium")} onClick={() => setFilters(filters.map(item => item.id === filter.id ? { ...item, value: t.value } : item))}>
                                                                                    {t.label}
                                                                                    {filter.value === t.value && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                                                                                </button>
                                                                            ))}
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                );
                                                            })() : filter.field === "Field type" ? (() => {
                                                                const fieldTypes = [
                                                                    { value: "text", label: "Text" },
                                                                    { value: "textarea", label: "Long Text" },
                                                                    { value: "number", label: "Number" },
                                                                    { value: "email", label: "Email" },
                                                                    { value: "phone", label: "Phone" },
                                                                    { value: "url", label: "URL" },
                                                                    { value: "date", label: "Date" },
                                                                    { value: "time", label: "Time" },
                                                                    { value: "datetime", label: "Date & Time" },
                                                                    { value: "select", label: "Dropdown" },
                                                                    { value: "multiselect", label: "Multi-select" },
                                                                    { value: "radio", label: "Radio" },
                                                                    { value: "checkbox", label: "Checkbox" },
                                                                    { value: "file", label: "File Attach" },
                                                                    { value: "rating", label: "Rating" },
                                                                    { value: "currency", label: "Currency" },
                                                                    { value: "percentage", label: "Percentage" },
                                                                    { value: "user", label: "People" },
                                                                    { value: "tags", label: "Labels" },
                                                                    { value: "progress", label: "Progress" },
                                                                    { value: "voting", label: "Voting" },
                                                                    { value: "location", label: "Location" },
                                                                    { value: "signature", label: "Signature" },
                                                                ];
                                                                const selectedFieldType = fieldTypes.find(t => t.value === filter.value);
                                                                return (
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <div className="flex h-9 items-center justify-between rounded-md border border-zinc-200 bg-white px-3 shadow-sm text-[13px] text-zinc-600 cursor-pointer hover:border-zinc-300 transition-colors">
                                                                                <span className={selectedFieldType ? "text-zinc-900 truncate" : "text-zinc-400 truncate"}>{selectedFieldType?.label ?? "Select field type"}</span>
                                                                                <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0 ml-2" />
                                                                            </div>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent align="start" className="w-[200px] p-1 rounded-xl shadow-lg border-zinc-200 overflow-y-auto" sideOffset={8} style={{ maxHeight: 'min(400px, var(--radix-popover-content-available-height) - 16px)' }} onWheel={(e) => e.stopPropagation()}>
                                                                            {fieldTypes.map(t => (
                                                                                <button key={t.value} className={cn("w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-zinc-100 text-left text-[13px] text-zinc-700 cursor-pointer transition-colors", filter.value === t.value && "bg-zinc-50 font-medium")} onClick={() => setFilters(filters.map(item => item.id === filter.id ? { ...item, value: t.value } : item))}>
                                                                                    {t.label}
                                                                                    {filter.value === t.value && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                                                                                </button>
                                                                            ))}
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                );
                                                            })() : filter.field === "Visibility" ? (() => {
                                                                const opts = [{ value: "public", label: "Is public" }, { value: "private", label: "Is private" }];
                                                                return (
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <div className="flex h-9 items-center justify-between rounded-md border border-zinc-200 bg-white px-3 shadow-sm text-[13px] text-zinc-600 cursor-pointer hover:border-zinc-300 transition-colors">
                                                                                <span className={filter.value ? "text-zinc-900 capitalize truncate" : "text-zinc-400 truncate"}>{filter.value ? opts.find(o => o.value === filter.value)?.label : "Select visibility"}</span>
                                                                                <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0 ml-2" />
                                                                            </div>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent align="start" className="w-[160px] p-1 rounded-xl shadow-md border-zinc-200" sideOffset={8} style={{ maxHeight: 'min(400px, var(--radix-popover-content-available-height) - 16px)' }}>
                                                                            {opts.map(o => (
                                                                                <button key={o.value} className={cn("w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-zinc-100 text-left text-[13px] text-zinc-700 cursor-pointer transition-colors")} onClick={() => setFilters(filters.map(item => item.id === filter.id ? { ...item, value: o.value } : item))}>
                                                                                    {o.label}
                                                                                    {filter.value === o.value && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                                                                                </button>
                                                                            ))}
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                );
                                                            })() : filter.field === "Inherited From" ? (() => {
                                                                const opts = [
                                                                    { value: "workspace", label: "Workspace", icon: <Briefcase className="h-3.5 w-3.5 text-zinc-400" /> },
                                                                    { value: "project", label: "Project", icon: <Folder className="h-3.5 w-3.5 text-blue-500" /> },
                                                                    { value: "folder", label: "Folder", icon: <Folder className="h-3.5 w-3.5 text-amber-500" /> },
                                                                    { value: "list", label: "List", icon: <List className="h-3.5 w-3.5 text-zinc-500" /> },
                                                                ];
                                                                const selected = opts.find(o => o.value === filter.value);
                                                                return (
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <div className="flex h-9 items-center justify-between rounded-md border border-zinc-200 bg-white px-3 shadow-sm text-[13px] text-zinc-600 cursor-pointer hover:border-zinc-300 transition-colors">
                                                                                <div className="flex items-center gap-1.5 truncate">
                                                                                    {selected?.icon}
                                                                                    <span className={filter.value ? "text-zinc-900 truncate" : "text-zinc-400 truncate"}>{selected?.label ?? "Select source"}</span>
                                                                                </div>
                                                                                <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0 ml-2" />
                                                                            </div>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent align="start" className="w-[170px] p-1 rounded-xl shadow-md border-zinc-200" sideOffset={8} style={{ maxHeight: 'min(400px, var(--radix-popover-content-available-height) - 16px)' }}>
                                                                            {opts.map(o => (
                                                                                <button key={o.value} className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 text-left text-[13px] text-zinc-700 cursor-pointer transition-colors")} onClick={() => setFilters(filters.map(item => item.id === filter.id ? { ...item, value: o.value } : item))}>
                                                                                    {o.icon}
                                                                                    {o.label}
                                                                                    {filter.value === o.value && <Check className="h-3.5 w-3.5 text-indigo-600 ml-auto shrink-0" />}
                                                                                </button>
                                                                            ))}
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                );
                                                            })() : (filter.field === "Required in tasks" || filter.field === "Pinned" || filter.field === "Visible to guests") ? (() => {
                                                                const optMap: Record<string, { true: string; false: string }> = {
                                                                    "Required in tasks": { true: "Is required", false: "Is not required" },
                                                                    "Pinned": { true: "Is pinned", false: "Is not pinned" },
                                                                    "Visible to guests": { true: "Is visible to guests", false: "Is not visible to guests" },
                                                                };
                                                                const opts = optMap[filter.field];
                                                                return (
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <div className="flex h-9 items-center justify-between rounded-md border border-zinc-200 bg-white px-3 shadow-sm text-[13px] text-zinc-600 cursor-pointer hover:border-zinc-300 transition-colors">
                                                                                <span className={filter.value ? "text-zinc-900 truncate" : "text-zinc-400 truncate"}>
                                                                                    {filter.value === "true" ? opts.true : filter.value === "false" ? opts.false : "Select option"}
                                                                                </span>
                                                                                <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0 ml-2" />
                                                                            </div>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent align="start" className="w-[200px] p-1 rounded-xl shadow-md border-zinc-200" sideOffset={8} style={{ maxHeight: 'min(400px, var(--radix-popover-content-available-height) - 16px)' }}>
                                                                            <button className={cn("w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-zinc-100 text-left text-[13px] text-zinc-700 cursor-pointer transition-colors")} onClick={() => setFilters(filters.map(item => item.id === filter.id ? { ...item, value: "true" } : item))}>
                                                                                {opts.true}
                                                                                {filter.value === "true" && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                                                                            </button>
                                                                            <button className={cn("w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-zinc-100 text-left text-[13px] text-zinc-700 cursor-pointer transition-colors")} onClick={() => setFilters(filters.map(item => item.id === filter.id ? { ...item, value: "false" } : item))}>
                                                                                {opts.false}
                                                                                {filter.value === "false" && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                                                                            </button>
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                );
                                                            })() : (
                                                                <div className="flex h-9 items-center justify-between rounded-md border border-zinc-200 bg-white px-3 shadow-sm text-sm text-zinc-400 cursor-pointer hover:border-zinc-300 transition-colors">
                                                                    <span className="truncate">Select option</span>
                                                                    <ChevronDown className="h-3.5 w-3.5 shrink-0 ml-2" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        <button
                                                            onClick={() => setFilters(filters.filter(f => f.id !== filter.id))}
                                                            className="shrink-0 h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors ml-1 cursor-pointer"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}

                                                <div className="pt-1">
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <button
                                                                className="text-[13px] font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 px-2 py-1 -ml-2 rounded-md hover:bg-indigo-50 transition-colors focus:outline-none cursor-pointer"
                                                            >
                                                                + Add filter
                                                            </button>
                                                        </PopoverTrigger>
                                                        <PopoverContent align="start" className="w-56 p-1 rounded-xl shadow-md border-zinc-200" sideOffset={6}>
                                                            {defaultFields.map(f => (
                                                                <button
                                                                    key={f}
                                                                    onClick={() => setFilters([...filters, { id: Math.random().toString(), field: f, operator: "Is", value: "" }])}
                                                                    className="w-full text-left text-[13px] text-zinc-700 font-normal py-1.5 px-2 rounded-md hover:bg-zinc-100 cursor-pointer transition-colors"
                                                                >
                                                                    {f}
                                                                </button>
                                                            ))}
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedView !== "all" && (
                                        <Button variant="outline" size="sm" className="h-8 text-xs shadow-sm bg-white border-zinc-300 shadow-none text-zinc-600 hover:bg-zinc-200/80" onClick={handleAddExisting}>
                                            Add existing
                                        </Button>
                                    )}
                                    <Popover open={isTopCreateOpen} onOpenChange={(open) => {
                                        setIsTopCreateOpen(open);
                                        if (!open) setCreateSearch("");
                                    }}>

                                        <PopoverTrigger asChild>
                                            <Button size="sm" className="h-8 text-xs shadow-sm">
                                                <Plus className="h-3.5 w-3.5 mr-1" />
                                                Create new
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-[280px] p-0 flex flex-col overflow-hidden shadow-xl border-zinc-200 z-[100]"
                                            align="end"
                                            sideOffset={8}
                                            collisionPadding={16}
                                            style={{ maxHeight: 'min(480px, calc(var(--radix-popover-content-available-height) - 16px))' }}
                                        >
                                            <div className="p-3 border-b border-zinc-100 bg-white shrink-0">
                                                <div className="flex items-center gap-2.5 px-3 h-9 bg-zinc-50/50 border border-zinc-200 rounded-lg group focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10 transition-all">
                                                    <Search className="h-4 w-4 text-zinc-400 shrink-0 group-focus-within:text-violet-500 transition-colors" />
                                                    <Input
                                                        variant="ghost"
                                                        value={createSearch}
                                                        onChange={(e) => setCreateSearch(e.target.value)}
                                                        placeholder="Search..."
                                                        className="border-0 bg-transparent p-0 h-full focus:outline-none focus:ring-0 focus-visible:ring-0 shadow-none text-sm placeholder:text-zinc-400"
                                                    />
                                                </div>
                                            </div>

                                            <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent" onWheel={(e) => e.stopPropagation()}>

                                                <div className="p-2">
                                                    {(() => {
                                                        const filteredAll = ALL_FIELDS.filter(f => !createSearch.trim() || f.label.toLowerCase().includes(createSearch.toLowerCase()));
                                                        return (
                                                            <>
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-3 py-2">All Fields</p>
                                                                    <div className="space-y-0.5 px-0.5">
                                                                        {filteredAll.map((field) => (
                                                                            <button
                                                                                key={field.id}
                                                                                type="button"
                                                                                onClick={() => handleSelectType(field as any)}
                                                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:border-violet-200 hover:bg-violet-50/50 transition-all text-left group cursor-pointer"
                                                                            >
                                                                                <div className={cn("h-6 w-6 rounded-md flex items-center justify-center transition-all", field.isAi ? "bg-purple-50" : "bg-zinc-100 group-hover:bg-white group-hover:shadow-sm", field.color)}><field.icon className="h-3.5 w-3.5" /></div>
                                                                                <span className="text-sm text-zinc-700 group-hover:text-violet-900 transition-colors flex-1">{field.label}</span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                        </PopoverContent>
                                    </Popover>

                                </div>
                            </div>

                            <div className="flex-1 px-6 py-4 overflow-hidden relative">
                                {isLoadingCustomFields && (customFieldsRaw?.length ?? 0) === 0 ? (
                                    <DataTableSkeleton columnCount={6} rowCount={8} />
                                ) : filteredFields.length > 0 ? (
                                    isAddExistingMode ? (
                                        <div className="flex flex-col h-full w-full min-w-0">

                                            <div className="flex-1 w-full max-w-full overflow-y-auto">
                                                <div className="pb-24 w-full max-w-full">
                                                    <DataTable
                                                        columns={columns}
                                                        data={addExistingFields}
                                                        hideToolbar={true}
                                                        hideHeader={false}
                                                        columnVisibility={columnVisibility}
                                                        onColumnVisibilityChange={setColumnVisibility}
                                                        onRowSelectionChange={handleRowSelectionChange}
                                                    />
                                                </div>
                                            </div>

                                            {/* Bottom Sticky Action Bar */}
                                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t flex items-center justify-between z-10 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)]">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-normal text-zinc-600">
                                                        {Object.keys(addExistingSelection).length} items selected
                                                    </span>
                                                    {Object.keys(addExistingSelection).length > 0 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setAddExistingSelection({})}
                                                            className="text-xs h-7 text-zinc-400 hover:text-zinc-600"
                                                        >
                                                            Cancel selection
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleCancelAddExisting}
                                                        className="h-9 px-4 text-sm font-semibold border-none text-zinc-600 shadow-none hover:bg-zinc-200/80"
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={onConfirmAddFields}
                                                        disabled={Object.keys(addExistingSelection).length === 0}
                                                        className="h-9 px-6 text-sm font-semibold shadow-sm shadow-violet-200"
                                                    >
                                                        Add fields
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : groupBy ? (
                                        <div className="h-full w-full max-w-full overflow-y-auto toolbar-scroll-x">
                                            <div className="space-y-4 pb-20 w-full max-w-full">
                                                <DataTable
                                                    columns={columns}
                                                    data={[]}
                                                    hideToolbar={true}
                                                    onlyHeader={true}
                                                    columnVisibility={columnVisibility}
                                                    onColumnVisibilityChange={setColumnVisibility}
                                                />
                                                {Object.entries(groupedFields || {}).map(([key, group]) => {
                                                    const isCollapsed = collapsedGroups[key];
                                                    const Icon = group.icon;
                                                    return (
                                                        <div key={key} className="group/section pt-2">
                                                            <div
                                                                className="flex items-center justify-between px-1 py-1 cursor-pointer hover:bg-zinc-50 rounded-lg transition-colors mb-2"
                                                                onClick={() => setCollapsedGroups(prev => ({ ...prev, [key]: !isCollapsed }))}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <div className={cn(
                                                                        "h-4 w-4 rounded-md flex items-center justify-center transition-transform duration-200",
                                                                        isCollapsed ? "-rotate-90" : "rotate-0"
                                                                    )}>
                                                                        <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                                                                    </div>
                                                                    <div className={cn("h-6 w-6 rounded-md flex items-center justify-center shadow-sm border border-black/5", group.color)}>
                                                                        <Icon className="h-3.5 w-3.5" />
                                                                    </div>
                                                                    <h3 className="text-[13px] font-medium text-zinc-700 tracking-tight">{group.label}</h3>
                                                                    <span className="text-[11px] font-medium text-zinc-400">
                                                                        {group.items.length}
                                                                    </span>
                                                                </div>
                                                                <div className="h-px flex-1 bg-zinc-100 mx-4 opacity-50 group-hover/section:bg-zinc-200 transition-colors" />
                                                            </div>

                                                            {!isCollapsed && (
                                                                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                                                    <DataTable
                                                                        columns={columns}
                                                                        data={group.items}
                                                                        onDeleteSelected={(rows) => {
                                                                            rows.forEach((row: any) => deleteCustomField.mutate({ id: row.id }));
                                                                        }}
                                                                        hideToolbar={true}
                                                                        hideHeader={true}
                                                                        columnVisibility={columnVisibility}
                                                                        onColumnVisibilityChange={setColumnVisibility}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full max-w-full min-w-0">
                                            <DataTable
                                                columns={columns}
                                                data={filteredFields}
                                                onDeleteSelected={(rows) => {
                                                    rows.forEach((row: any) => deleteCustomField.mutate({ id: row.id }));
                                                }}
                                                onTableReady={setTable}
                                                columnVisibility={columnVisibility}
                                                onColumnVisibilityChange={setColumnVisibility}
                                                hideToolbar={true}
                                            />
                                        </div>
                                    )
                                ) : (
                                    <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-4 rounded-md border border-zinc-200 bg-white">
                                        <div className="relative">
                                            <div className="h-16 w-16 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center shadow-sm">
                                                <Settings2 className="h-7 w-7 text-zinc-400" />
                                            </div>
                                            <div className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-white border border-zinc-200 shadow-sm flex items-center justify-center">
                                                <Search className="h-3 w-3 text-zinc-400" />
                                            </div>
                                        </div>
                                        <div className="text-center space-y-1">
                                            <p className="text-sm font-medium text-zinc-700">
                                                {query || filters.length > 0 ? "No matching results found" : "No custom fields yet"}
                                            </p>
                                            <p className="text-xs text-zinc-400 max-w-[240px]">
                                                {query || filters.length > 0
                                                    ? "Try adjusting your search or filters"
                                                    : "Create your first custom field to get started"}
                                            </p>
                                        </div>
                                        <Popover open={isEmptyCreateOpen} onOpenChange={(open) => {
                                            setIsEmptyCreateOpen(open);
                                            if (!open) setCreateSearch("");
                                        }}>
                                            <PopoverTrigger asChild>
                                                <Button size="sm" className="h-8 text-xs shadow-sm px-4">
                                                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                                                    Create new
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                className="w-[280px] p-0 flex flex-col overflow-hidden shadow-xl border-zinc-200 z-[100]"
                                                align="center"
                                                sideOffset={12}
                                                collisionPadding={16}
                                                style={{ maxHeight: 'min(480px, calc(var(--radix-popover-content-available-height) - 16px))' }}
                                            >
                                                <div className="p-3 border-b border-zinc-100 bg-white shrink-0">
                                                    <div className="flex items-center gap-2.5 px-3 h-9 bg-zinc-50/50 border border-zinc-200 rounded-lg group focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/10 transition-all">
                                                        <Search className="h-4 w-4 text-zinc-400 shrink-0 group-focus-within:text-violet-500 transition-colors" />
                                                        <Input
                                                            variant="ghost"
                                                            value={createSearch}
                                                            onChange={(e) => setCreateSearch(e.target.value)}
                                                            placeholder="Search..."
                                                            className="border-0 bg-transparent p-0 h-full focus:outline-none focus:ring-0 focus-visible:ring-0 shadow-none text-sm placeholder:text-zinc-400"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent" onWheel={(e) => e.stopPropagation()}>
                                                    <div className="p-2">
                                                        {(() => {
                                                            const filteredAll = ALL_FIELDS.filter(f => !createSearch.trim() || f.label.toLowerCase().includes(createSearch.toLowerCase()));
                                                            return (
                                                                <>
                                                                    <div>
                                                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-3 py-2">All Fields</p>
                                                                        <div className="space-y-0.5 px-0.5">
                                                                            {filteredAll.map((field) => (
                                                                                <button
                                                                                    key={field.id}
                                                                                    type="button"
                                                                                    onClick={() => handleSelectType(field as any)}
                                                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:border-violet-200 hover:bg-violet-50/50 transition-all text-left group cursor-pointer"
                                                                                >
                                                                                    <div className={cn("h-6 w-6 rounded-md flex items-center justify-center transition-all", field.isAi ? "bg-purple-50" : "bg-zinc-100 group-hover:bg-white group-hover:shadow-sm", field.color)}><field.icon className="h-3.5 w-3.5" /></div>
                                                                                    <span className="text-sm text-zinc-700 group-hover:text-violet-900 transition-colors flex-1">{field.label}</span>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                )}
                            </div>
                        </section>

                        <CustomFieldSidebarPanel
                            open={isCreateSidebarOpen}
                            onClose={() => {
                                setIsCreateSidebarOpen(false);
                                setFieldToEdit(null);
                                setSidebarMode("create");
                            }}
                            workspaceId={workspaceId}
                            mode={sidebarMode}
                            initialType={selectedTypeForCreation}
                            fieldToEdit={fieldToEdit}
                            locationLabel={fieldToEdit ? getLocationLabel(fieldToEdit) : null}
                            workspaces={workspaces}
                            spaces={spaces}
                            projects={workspaceProjects}
                            folders={folders}
                            lists={lists}
                            teams={teams}
                            createContext={createContext}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isRemoveConfirmOpen} onOpenChange={setIsRemoveConfirmOpen}>
                <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden rounded-2xl border-none shadow-xl bg-white [&>button]:hidden">
                    <div className="relative px-7 pt-7 pb-5">
                        {/* Close button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-4 top-4 h-7 w-7 rounded-full hover:bg-zinc-100 text-zinc-400"
                            onClick={() => setIsRemoveConfirmOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>

                        {/* Trash icon */}
                        <div className="h-14 w-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-5">
                            <Trash2 className="h-6 w-6 text-red-400" />
                        </div>

                        {/* Title */}
                        <DialogTitle className="text-[18px] font-bold text-zinc-900 leading-snug mb-1.5">
                            Delete {fieldToRemove?.name} from this location?
                        </DialogTitle>

                        {/* Description */}
                        <DialogDescription className="text-[13px] text-zinc-500 leading-relaxed">
                            This action will delete this Custom Field from{" "}
                            <span className="text-zinc-900 font-semibold">1 Location</span>.
                        </DialogDescription>

                        {/* Checkbox */}
                        <div className="flex items-center gap-2.5 mt-5">
                            <Checkbox
                                id="delete-workspace-option"
                                checked={deleteFromWorkspace}
                                onCheckedChange={(checked) => setDeleteFromWorkspace(!!checked)}
                                className="h-4 w-4 rounded border-zinc-300 data-[state=checked]:bg-zinc-800 data-[state=checked]:border-zinc-800"
                            />
                            <label
                                htmlFor="delete-workspace-option"
                                className="text-[13px] font-medium text-zinc-600 cursor-pointer select-none"
                            >
                                Delete from Workspace
                            </label>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-zinc-100 mx-0" />

                    {/* Action buttons */}
                    <div className="flex items-center gap-3 px-7 py-5">
                        <Button
                            variant="outline"
                            className="flex-1 h-11 rounded-xl border border-zinc-200 text-zinc-700 font-semibold text-[14px] hover:bg-zinc-50 transition-all"
                            onClick={() => setIsRemoveConfirmOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-[14px] transition-all border-none shadow-none"
                            onClick={() => {
                                if (fieldToRemove) {
                                    deleteCustomField.mutate({ id: fieldToRemove.id });
                                }
                                setIsRemoveConfirmOpen(false);
                            }}
                        >
                            Remove from List
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

