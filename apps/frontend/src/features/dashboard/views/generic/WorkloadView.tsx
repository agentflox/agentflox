"use client";

import { TASK_LIST_PAGE_SIZE } from "@/features/dashboard/constants";
import { useGenericTaskViewData } from "@/features/dashboard/hooks/useGenericTaskViewData";
import { TaskListLoadMore } from "@/features/dashboard/components/shared/TaskListLoadMore";
import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ChevronLeft, ChevronRight, Plus, Filter, Settings, Users, Clock, Search, Layout,
    ChevronDown, MoreHorizontal, Calendar as CalendarIcon, CheckCircle2, X, Minus,
    ListFilter, ArrowUpDown, Settings2, User, Check, ChevronsUpDown, CalendarDays,
    MoreVertical, AlertCircle, Clock3, Ban, BarChart3, PanelRight, ChevronUp, UserRound, RefreshCcw,
    Maximize2, PlusCircle, LayoutList, Pin, Trash2, Info, MapPin, CalendarRange, Star, Lock, EyeOff, Save, Tag,
    Circle, Flag, Box, Calendar, GripVertical, SlidersHorizontal, ArrowRight,
    Type, Hash, CheckSquare, AlignLeft, Target, Mail, Phone, Globe, DollarSign, FunctionSquare,
    Paperclip, Link2, ListTodo, TrendingUp, FileText, MessageSquare, Heart, PanelRightClose,
    Eye, Hourglass, Percent, AlertTriangle, ArrowRightToLine, ZoomIn, ZoomOut, CheckCheck,
    GitCommit, PenTool, ShieldCheck, Home, Share2, Wand2
} from "lucide-react";
import { TemplateMenuPopover } from "@/entities/templates/components/TemplateMenuPopover";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
    DropdownMenuGroup,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TaskCreationModal } from "@/entities/task/components/TaskCreationModal";
import { LazyTaskDetailModal as TaskDetailModal } from "@/entities/task/components/LazyTaskDetailModal";
import { ViewToolbarSaveDropdown } from "@/features/dashboard/components/shared/ViewToolbarSaveDropdown";
import { ViewToolbarClosedPopover } from "@/features/dashboard/components/shared/ViewToolbarClosedPopover";
import { ShareViewPermissionModal } from "@/features/dashboard/components/shared/ShareViewPermissionModal";
import { SidePanel } from "@/features/dashboard/components/shared/SidePanel";
import { FieldsPanelSlideout } from "@/features/dashboard/components/shared/FieldsPanelSlideout";
import { AssigneesPanelSlideout } from "@/features/dashboard/components/shared/AssigneesPanelSlideout";
import { CustomFieldsManagerModal } from "@/entities/customfields/components/CustomFieldsManagerModal";
import { getCustomFieldIcon, collectUsedCustomFieldIds } from "@/features/dashboard/utils/taskViewUtils";
import { useSensors, useSensor, PointerSensor } from "@dnd-kit/core";
import { Checkbox } from "@/components/ui/checkbox";
import { SingleDateCalendar } from "@/components/ui/date-picker";
import { DestinationPicker } from "@/entities/task/components/DestinationPicker";
import { TaskTypeIcon } from "@/entities/task/components/TaskTypeIcon";
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    addDays,
    subDays,
    startOfDay,
    endOfDay,
    isToday as isTodayFns,
    isSameDay,
    isWeekend as isWeekendFns,
    startOfWeek,
    endOfWeek,
    differenceInDays,
    isBefore,
    isAfter
} from "date-fns";
import { FILTER_OPTIONS, FIELD_OPERATORS, STANDARD_FIELD_CONFIG } from "./viewConstants";
import { evaluateGroup, hasFilterValue, hasAnyValueInGroup, evaluateCondition } from "./filterUtils";
import type { FilterGroup, FilterCondition } from "./viewTypes";
import { parseEncodedTag } from "@/entities/task/utils/tags";
import { ViewFilterPopoverContent } from "./ViewFilterPopoverContent";

interface WorkloadViewProps {
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    listId?: string;
    folderId?: string;
    viewId?: string;
    workspaceId?: string;
    initialConfig?: any;
    selectedTaskIdFromParent?: string | null;
    onTaskSelect?: (taskId: string | null) => void;
    refetchViewData?: () => void;
    context?: "workspace" | "space" | "project" | "team" | "folder" | "list";
}

const CREATE_FIELD_TYPES = [
    { id: "TEXT", label: "Text", icon: Type, type: "TEXT" },
    { id: "NUMBER", label: "Number", icon: Hash, type: "NUMBER" },
    { id: "DATE", label: "Date", icon: Calendar, type: "DATE" },
    { id: "CHECKBOX", label: "Checkbox", icon: CheckSquare, type: "CHECKBOX" },
    { id: "DROPDOWN", label: "Dropdown", icon: LayoutList, type: "DROPDOWN" },
    { id: "TEXT_AREA", label: "Text area (Long Text)", icon: AlignLeft, type: "TEXT_AREA" },
    { id: "LONG_TEXT", label: "Long Text", icon: AlignLeft, type: "LONG_TEXT" },
    { id: "CUSTOM_TEXT", label: "Custom Text", icon: Type, type: "CUSTOM_TEXT" },
    { id: "LABELS", label: "Labels", icon: Tag, type: "LABELS" },
    { id: "CUSTOM_DROPDOWN", label: "Custom Dropdown", icon: LayoutList, type: "CUSTOM_DROPDOWN" },
    { id: "CATEGORIZE", label: "Categorize", icon: Target, type: "CATEGORIZE" },
    { id: "TSHIRT_SIZE", label: "T-Shirt Size", icon: Users, type: "TSHIRT_SIZE" },
    { id: "EMAIL", label: "Email", icon: Mail, type: "EMAIL" },
    { id: "PHONE", label: "Phone", icon: Phone, type: "PHONE" },
    { id: "URL", label: "Website", icon: Globe, type: "URL" },
    { id: "MONEY", label: "Money", icon: DollarSign, type: "MONEY" },
    { id: "FORMULA", label: "Formula", icon: FunctionSquare, type: "FORMULA" },
    { id: "FILES", label: "Files", icon: Paperclip, type: "FILES" },
    { id: "RELATIONSHIP", label: "Relationship", icon: Link2, type: "RELATIONSHIP" },
    { id: "PEOPLE", label: "People", icon: Users, type: "PEOPLE" },
    { id: "TASKS", label: "Tasks", icon: ListTodo, type: "TASKS" },
    { id: "PROGRESS_AUTO", label: "Progress (Auto)", icon: TrendingUp, type: "PROGRESS_AUTO" },
    { id: "PROGRESS_MANUAL", label: "Progress (Manual)", icon: SlidersHorizontal, type: "PROGRESS_MANUAL" },
    { id: "SUMMARY", label: "Summary", icon: FileText, type: "SUMMARY" },
    { id: "PROGRESS_UPDATES", label: "Progress Updates", icon: MessageSquare, type: "PROGRESS_UPDATES" },
    { id: "TRANSLATION", label: "Translation", icon: Globe, type: "TRANSLATION" },
    { id: "SENTIMENT", label: "Sentiment", icon: Heart, type: "SENTIMENT" },
];

export type WorkloadMetric = "tasks" | "time_estimate" | "sprint_points" | "percent_capacity";
export type Timeframe = "7" | "14" | "days" | "weeks" | "months";
export type WorkloadGrouping = "daily_scheduled" | "daily_availability" | "weekly_capacity" | "weekly_availability";

export function WorkloadView({
    spaceId,
    projectId,
    teamId,
    listId,
    folderId,
    viewId,
    workspaceId,
    initialConfig,
    onTaskSelect,
    refetchViewData
}: WorkloadViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const utils = trpc.useUtils();

    // Workload Specific State
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [timeframe, setTimeframe] = useState<Timeframe>("14");
    const [workloadMetric, setWorkloadMetric] = useState<WorkloadMetric>("tasks");
    const [capacityMode, setCapacityMode] = useState<WorkloadGrouping>("daily_scheduled");
    const [groupBy, setGroupBy] = useState<string>("assignee");
    const [groupDirection, setGroupDirection] = useState<"asc" | "desc">("asc");
    const [showEmptyGroups, setShowEmptyGroups] = useState<boolean>(false);
    const [allExpanded, setAllExpanded] = useState<boolean>(true);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [isBacklogOpen, setIsBacklogOpen] = useState<boolean>(false);
    const [backlogTab, setBacklogTab] = useState<"unscheduled" | "overdue" | "unassigned">("unscheduled");
    const [backlogSearch, setBacklogSearch] = useState<string>("");
    const [backlogSort, setBacklogSort] = useState<"status" | "priority" | "dueDate" | "name">("status");
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [cellWidth, setCellWidth] = useState<number>(76); // Zoom level for day columns

    // View Meta State
    const [viewAutosave, setViewAutosave] = useState<boolean>(false);
    const [pinView, setPinView] = useState<boolean>(false);
    const [privateView, setPrivateView] = useState<boolean>(false);
    const [protectView, setProtectView] = useState<boolean>(false);
    const [defaultView, setDefaultView] = useState<boolean>(false);
    const [viewNameDraft, setViewNameDraft] = useState<string>("");
    const [showCompleted, setShowCompleted] = useState<boolean>(false);
    const [showCompletedSubtasks, setShowCompletedSubtasks] = useState<boolean>(false);
    const [showTaskLocations, setShowTaskLocations] = useState<boolean>(false);
    const [showSubtaskParentNames, setShowSubtaskParentNames] = useState<boolean>(false);
    const [expandTaskNames, setExpandTaskNames] = useState<boolean>(false);
    const [showWeekends, setShowWeekends] = useState<boolean>(true);
    const [showWeekNumbers, setShowWeekNumbers] = useState<boolean>(false);
    const [showTrackedTimeNextToEstimated, setShowTrackedTimeNextToEstimated] = useState<boolean>(true);
    const [showTasksFromOtherLists, setShowTasksFromOtherLists] = useState<boolean>(true);
    const [showSubtasksFromOtherLists, setShowSubtasksFromOtherLists] = useState<boolean>(true);
    const [defaultToMeMode, setDefaultToMeMode] = useState<boolean>(false);
    const [colorTasksBy, setColorTasksBy] = useState<string>("status");

    // Panels and modals
    const [filtersPanelOpen, setFiltersPanelOpen] = useState<boolean>(false);
    const [fieldsPanelOpen, setFieldsPanelOpen] = useState<boolean>(false);
    const [fieldsSearch, setFieldsSearch] = useState<string>("");
    const [createFieldModalOpen, setCreateFieldModalOpen] = useState<boolean>(false);
    const [createFieldSearch, setCreateFieldSearch] = useState<string>("");
    const [assigneesPanelOpen, setAssigneesPanelOpen] = useState<boolean>(false);
    const [assigneesSearch, setAssigneesSearch] = useState<string>("");
    const [customizePanelOpen, setCustomizePanelOpen] = useState<boolean>(false);
    const [layoutOptionsOpen, setLayoutOptionsOpen] = useState<boolean>(false);
    const [customizeViewFilterOpen, setCustomizeViewFilterOpen] = useState<boolean>(false);
    const [customizeViewGroupOpen, setCustomizeViewGroupOpen] = useState<boolean>(false);
    const [customizeViewSubtasksOpen, setCustomizeViewSubtasksOpen] = useState<boolean>(false);
    const [expandedSubtaskMode, setExpandedSubtaskMode] = useState<"collapsed" | "expanded" | "separate">("collapsed");
    const [filterAssignee, setFilterAssignee] = useState<string[]>([]);
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
        new Set(["name", "status", "assignee", "priority", "dueDate", "tags"])
    );
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
    const [filterGroups, setFilterGroups] = useState<FilterGroup>(() => ({
        id: "root",
        operator: "AND",
        conditions: [],
    }));
    const [savedFiltersPanelOpen, setSavedFiltersPanelOpen] = useState<boolean>(false);
    const [savedFiltersSearch, setSavedFiltersSearch] = useState<string>("");
    const [savedFilterName, setSavedFilterName] = useState<string>("");
    const [savedFilters, setSavedFilters] = useState<{ id: string; name: string; config: FilterGroup }[]>(() => {
        if (typeof window !== "undefined") {
            try {
                return JSON.parse(localStorage.getItem("agentflox_saved_filters") ?? "[]");
            } catch { return []; }
        }
        return [];
    });
    const [filterSearch, setFilterSearch] = useState<string>("");

    // Data Fetching
    const updateViewMutation = trpc.view.update.useMutation();
    const createViewMutation = trpc.view.create.useMutation();
    const updateTaskMutation = trpc.task.update.useMutation({
        onSuccess: () => {
            void utils.task.list.invalidate();
        }
    });

    const { data: viewData } = trpc.view.get.useQuery(
        { id: viewId as string },
        { staleTime: 60_000, gcTime: 5 * 60_000, enabled: !!viewId }
    );

    const {
        resolvedWorkspaceId,
        space,
        workspaceMembers,
        customFields,
        availableTaskTypes,
        projectParticipants,
        teamParticipants,
        listsData,
        currentList,
        tasks,
        isTasksLoading,
        hasMore: hasMoreTasks,
        isFetchingNextPage,
        loadMoreRef,
        total: taskTotal,
    } = useGenericTaskViewData({
        spaceId,
        projectId,
        teamId,
        listId,
        workspaceId,
        taskListEnabled: true,
    });

    const [managerModalOpen, setManagerModalOpen] = useState(false);
    const [columnOrder, setColumnOrder] = useState<string[]>(() => Array.from(visibleColumns));
    const fieldSensors = useSensors(useSensor(PointerSensor));
    const usedCustomFieldIds = useMemo(() => collectUsedCustomFieldIds(tasks as any[]), [tasks]);

    const FIELD_CONFIG = useMemo(() => {
        const standardFields = STANDARD_FIELD_CONFIG.map(f => ({ ...f, isCustom: false }));
        const customFieldsConfig = (customFields as any[])
            .map((cf: any) => {
                const IconComponent = getCustomFieldIcon(cf.type);
                return {
                    id: cf.id,
                    label: cf.name,
                    icon: IconComponent,
                    isCustom: true,
                    customField: cf,
                };
            });
        return [...standardFields, ...customFieldsConfig];
    }, [customFields]);

    const allAvailableStatuses = useMemo(() => {
        if (listId && currentList?.statuses) {
            return (currentList.statuses as { id: string; name: string; color: string }[]).map((s: any) => ({ ...s, listId: currentList.id }));
        }
        if (listsData?.items) {
            const statusMap = new Map<string, { id: string; name: string; color: string; listId: string }>();
            (listsData.items as any[]).forEach((list: any) => {
                (list.statuses || []).forEach((s: any) => {
                    if (!statusMap.has(s.id)) statusMap.set(s.id, { ...s, listId: list.id });
                });
            });
            return Array.from(statusMap.values());
        }
        return [];
    }, [tasks, listId, currentList, listsData]);

    const allAvailableTags = useMemo(() => {
        const tagSet = new Set<string>();
        tasks.forEach(t => {
            (t.tags || []).forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet);
    }, [tasks]);

    const viewContentToSave = useMemo(() => {
        return {
            id: viewId,
            name: viewData?.name || "Workload",
            type: "WORKLOAD",
            workspaceId: (workspaceId || resolvedWorkspaceId || viewData?.workspaceId) ?? undefined,
            spaceId: (spaceId || viewData?.spaceId) ?? undefined,
            projectId: (projectId || viewData?.projectId) ?? undefined,
            folderId: (folderId || viewData?.folderId) ?? undefined,
            listId: (listId || viewData?.listId) ?? undefined,
            teamId: (teamId || viewData?.teamId) ?? undefined,
            config: {
                workloadView: {
                    viewAutosave,
                    timeframe,
                    workloadMetric,
                    capacityMode,
                    showCompleted,
                    showCompletedSubtasks,
                    showTaskLocations,
                    showWeekends,
                    showEmptyGroups,
                    groupBy,
                    groupDirection,
                    filterGroups,
                    defaultToMeMode,
                    expandedSubtaskMode,
                    showTasksFromOtherLists,
                    showSubtasksFromOtherLists,
                }
            },
            grouping: { groupBy, groupDirection },
            filters: filterGroups,
            columns: Array.from(visibleColumns),
        };
    }, [
        viewId, viewData, workspaceId, resolvedWorkspaceId, spaceId, projectId, folderId, listId, teamId,
        viewAutosave, timeframe, workloadMetric, capacityMode, showCompleted,
        showCompletedSubtasks, showTaskLocations, showWeekends, showEmptyGroups,
        groupBy, groupDirection, filterGroups, defaultToMeMode, expandedSubtaskMode,
        showTasksFromOtherLists, showSubtasksFromOtherLists, visibleColumns
    ]);

    useEffect(() => {
        if (viewData) {
            setViewNameDraft(viewData.name || "");
            setPinView(viewData.isPinned || false);
            setPrivateView(viewData.isPrivate || false);
            setProtectView(viewData.isLocked || false);
            setDefaultView(viewData.isDefault || false);
            const cfg = (viewData.config as any)?.workloadView;
            if (cfg) {
                if (typeof cfg.viewAutosave === "boolean") setViewAutosave(cfg.viewAutosave);
                if (cfg.timeframe) setTimeframe(cfg.timeframe);
                if (cfg.workloadMetric) setWorkloadMetric(cfg.workloadMetric);
                if (cfg.capacityMode) setCapacityMode(cfg.capacityMode);
                if (cfg.groupBy) setGroupBy(cfg.groupBy);
                if (cfg.groupDirection) setGroupDirection(cfg.groupDirection);
                if (typeof cfg.showEmptyGroups === "boolean") setShowEmptyGroups(cfg.showEmptyGroups);
                if (typeof cfg.showCompleted === "boolean") setShowCompleted(cfg.showCompleted);
                if (typeof cfg.showCompletedSubtasks === "boolean") setShowCompletedSubtasks(cfg.showCompletedSubtasks);
                if (typeof cfg.showTaskLocations === "boolean") setShowTaskLocations(cfg.showTaskLocations);
                if (typeof cfg.showWeekends === "boolean") setShowWeekends(cfg.showWeekends);
                if (cfg.filterGroups) setFilterGroups(cfg.filterGroups);
            }
        }
    }, [viewData]);

    const isViewDirty = useMemo(() => {
        if (!viewData) return false;
        const currentCfg = {
            workloadView: {
                viewAutosave,
                timeframe,
                workloadMetric,
                capacityMode,
                showCompleted,
                showCompletedSubtasks,
                showTaskLocations,
                showWeekends,
                showEmptyGroups,
                groupBy,
                groupDirection,
                filterGroups
            }
        };
        return JSON.stringify(currentCfg) !== JSON.stringify(viewData.config);
    }, [
        viewData,
        viewAutosave,
        timeframe,
        workloadMetric,
        capacityMode,
        showCompleted,
        showCompletedSubtasks,
        showTaskLocations,
        showWeekends,
        showEmptyGroups,
        groupBy,
        groupDirection,
        filterGroups
    ]);

    const saveViewConfig = async (isAutosave = false) => {
        if (!viewId) return;
        const config = {
            workloadView: {
                viewAutosave: isAutosave ? true : viewAutosave,
                timeframe,
                workloadMetric,
                capacityMode,
                showCompleted,
                showCompletedSubtasks,
                showTaskLocations,
                showWeekends,
                showEmptyGroups,
                groupBy,
                groupDirection,
                filterGroups
            }
        };
        try {
            await updateViewMutation.mutateAsync({ id: viewId, config });
            void utils.view.get.invalidate({ id: viewId });
            if (!isAutosave) toast.success("View saved");
        } catch (e) {
            toast.error("Failed to save view");
        }
    };

    const handleToggleAutosave = async () => {
        const next = !viewAutosave;
        setViewAutosave(next);
        if (next) await saveViewConfig(true);
    };

    const saveAsNewView = async (name?: string) => {
        toast.info(name ? `Save as new view "${name}"` : "Save as new view");
    };

    const revertViewChanges = () => {
        if (!viewData) return;
        const cfg = (viewData.config as any)?.workloadView;
        if (cfg) {
            if (cfg.timeframe) setTimeframe(cfg.timeframe);
            if (cfg.workloadMetric) setWorkloadMetric(cfg.workloadMetric);
            if (cfg.capacityMode) setCapacityMode(cfg.capacityMode);
            if (typeof cfg.showCompleted === "boolean") setShowCompleted(cfg.showCompleted);
            if (typeof cfg.showCompletedSubtasks === "boolean") setShowCompletedSubtasks(cfg.showCompletedSubtasks);
            if (typeof cfg.showTaskLocations === "boolean") setShowTaskLocations(cfg.showTaskLocations);
            if (typeof cfg.showWeekends === "boolean") setShowWeekends(cfg.showWeekends);
            if (typeof cfg.showEmptyGroups === "boolean") setShowEmptyGroups(cfg.showEmptyGroups);
            if (cfg.groupBy) setGroupBy(cfg.groupBy);
            if (cfg.groupDirection) setGroupDirection(cfg.groupDirection);
            if (cfg.filterGroups) setFilterGroups(cfg.filterGroups);
        }
    };

    const updateViewName = async (newName: string) => {
        if (!viewId || !newName.trim()) return;
        const trimmed = newName.trim();
        const oldName = viewData?.name || "";
        setViewNameDraft(trimmed);
        try {
            await updateViewMutation.mutateAsync({ id: viewId, name: trimmed });
            if (utils.view?.get) await utils.view.get.invalidate({ id: viewId });
            if (utils.view?.list) await utils.view.list.invalidate();
            if (typeof refetchViewData === 'function') void refetchViewData();
        } catch (e) {
            setViewNameDraft(oldName);
        }
    };

    const updateViewProperty = async (property: string, value: any) => {
        if (!viewId) return;
        try {
            await updateViewMutation.mutateAsync({ id: viewId, [property]: value });
            void utils.view.get.invalidate({ id: viewId });
            if (typeof value === 'boolean') {
                const label = property.replace('is', '');
                toast.success(`View ${label.toLowerCase()} ${value ? 'enabled' : 'disabled'}`);
            }
        } catch (e) {
            toast.error(`Failed to update ${property}`);
        }
    };

    const resetViewToDefaults = () => {
        setTimeframe("14");
        setWorkloadMetric("tasks");
        setCapacityMode("daily_scheduled");
        setGroupBy("assignee");
        setGroupDirection("asc");
        setShowCompleted(false);
        setShowCompletedSubtasks(false);
        setShowTaskLocations(false);
        setShowSubtaskParentNames(false);
        setExpandTaskNames(false);
        setShowWeekends(true);
        setShowWeekNumbers(false);
        setShowTrackedTimeNextToEstimated(true);
        setShowTasksFromOtherLists(true);
        setShowSubtasksFromOtherLists(true);
        setDefaultToMeMode(false);
        setColorTasksBy("status");
        toast.success("View reset to defaults");
    };

    const toggleColumn = (col: string) => {
        if (col === "name") return;
        setVisibleColumns(prev => {
            const next = new Set(prev);
            if (next.has(col)) {
                next.delete(col);
            } else {
                next.add(col);
            }
            return next;
        });
    };

    const workspaceUserById = useMemo(() => {
        const map = new Map<string, { id: string; name: string; email?: string | null; image?: string | null }>();
        for (const m of workspaceMembers ?? []) {
            const u = (m as any).user;
            if (u) map.set(u.id, { id: u.id, name: u.name || u.email || "Unknown", image: u.image, email: u.email });
        }
        return map;
    }, [workspaceMembers]);

    const users = useMemo(() => {
        if (teamId && teamParticipants?.users?.length) {
            return (teamParticipants.users as any[]).map((u: any) => ({
                id: u.id,
                name: workspaceUserById.get(u.id)?.name || u.name || u.email || "Unknown",
                image: workspaceUserById.get(u.id)?.image ?? null,
                email: u.email ?? null,
            }));
        }
        if (projectId && projectParticipants?.users?.length) {
            return (projectParticipants.users as any[]).map((u: any) => ({
                id: u.id,
                name: workspaceUserById.get(u.id)?.name || u.name || u.email || "Unknown",
                image: workspaceUserById.get(u.id)?.image ?? null,
                email: u.email ?? null,
            }));
        }
        return Array.from(workspaceUserById.values()).map(u => ({
            id: u.id,
            name: u.name,
            image: u.image ?? null,
            email: u.email ?? null
        }));
    }, [teamId, teamParticipants?.users, projectId, projectParticipants?.users, workspaceUserById]);

    const groupLabel = useMemo(() => {
        if (groupBy === "none") return "None";
        const found = [
            { id: "status", label: "Status" },
            { id: "assignee", label: "Assignee" },
            { id: "priority", label: "Priority" },
            { id: "tags", label: "Tags" },
            { id: "dueDate", label: "Due date" },
            { id: "taskType", label: "Task type" },
            ...FIELD_CONFIG
        ].find(f => f.id === groupBy);
        return found?.label || (typeof groupBy === 'string' ? groupBy.charAt(0).toUpperCase() + groupBy.slice(1) : groupBy);
    }, [groupBy, FIELD_CONFIG]);

    // Priority styles helper
    const getPriorityStyles = (p?: string | null) => {
        const priority = p?.toUpperCase() || "NONE";
        if (priority === "URGENT") return { badge: "text-red-700 bg-red-50 border-red-200", icon: "text-red-600", color: "#ef4444" };
        if (priority === "HIGH") return { badge: "text-orange-700 bg-orange-50 border-orange-200", icon: "text-orange-600", color: "#f97316" };
        if (priority === "NORMAL") return { badge: "text-blue-700 bg-blue-50 border-blue-200", icon: "text-blue-600", color: "#3b82f6" };
        if (priority === "LOW") return { badge: "text-slate-600 bg-slate-100 border-slate-200", icon: "text-slate-500", color: "#64748b" };
        return { badge: "text-slate-600 bg-slate-50 border-slate-200", icon: "text-slate-400", color: "#94a3b8" };
    };

    // Filter condition handlers
    const updateFilterGroupOperator = (groupId: string, operator: "AND" | "OR") => {
        const updateRecursive = (group: FilterGroup): FilterGroup => {
            if (group.id === groupId) return { ...group, operator };
            return { ...group, conditions: group.conditions.map(c => ("conditions" in c ? updateRecursive(c as FilterGroup) : c)) };
        };
        setFilterGroups(prev => (groupId === "root" ? { ...prev, operator } : updateRecursive(prev)));
    };

    const addFilterGroup = () => {
        setFilterGroups(prev => ({
            ...prev,
            conditions: [...prev.conditions, {
                id: Math.random().toString(36).substring(7),
                operator: "AND",
                conditions: [{ id: Math.random().toString(36).substring(7), field: "status", operator: "is", value: [] }]
            } as FilterGroup]
        }));
    };

    const addFilterCondition = (groupId?: string) => {
        const targetId = groupId || "root";
        const addRecursive = (group: FilterGroup): FilterGroup => {
            if (group.id === targetId) return { ...group, conditions: [...group.conditions, { id: Math.random().toString(36).substring(7), field: "status", operator: "is", value: [] }] };
            return { ...group, conditions: group.conditions.map(c => "conditions" in c ? addRecursive(c as FilterGroup) : c) };
        };
        setFilterGroups(prev => addRecursive(prev));
    };

    const removeFilterItem = (itemId: string) => {
        const removeRecursive = (group: FilterGroup): FilterGroup => ({
            ...group, conditions: group.conditions.filter(c => c.id !== itemId).map(c => "conditions" in c ? removeRecursive(c as FilterGroup) : c)
        });
        setFilterGroups(prev => removeRecursive(prev));
    };

    const updateFilterCondition = (conditionId: string, updates: Partial<FilterCondition>) => {
        const updateRecursive = (group: FilterGroup): FilterGroup => ({
            ...group, conditions: group.conditions.map(c => {
                if ("conditions" in c) return updateRecursive(c as FilterGroup);
                if (c.id === conditionId) return { ...c, ...updates };
                return c;
            })
        });
        setFilterGroups(prev => updateRecursive(prev));
    };

    const saveNewFilter = useCallback(async () => {
        if (!savedFilterName.trim()) return;
        const newFilter = {
            id: Math.random().toString(36).substring(7),
            name: savedFilterName.trim(),
            config: JSON.parse(JSON.stringify(filterGroups)),
        };
        setSavedFilters(prev => {
            const next = [...prev, newFilter];
            if (viewId && initialConfig != null) {
                const raw = (initialConfig ?? {}) as Record<string, any>;
                const workloadView = raw.workloadView ?? {};
                void updateViewMutation.mutateAsync({ id: viewId, config: { ...raw, workloadView: { ...workloadView, savedFilterPresets: next } } });
            } else if (typeof window !== "undefined") {
                localStorage.setItem("agentflox_saved_filters", JSON.stringify(next));
            }
            return next;
        });
        setSavedFilterName("");
    }, [savedFilterName, filterGroups, viewId, initialConfig]);

    const deleteSavedFilter = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSavedFilters(prev => {
            const next = prev.filter(f => f.id !== id);
            if (viewId && initialConfig != null) {
                const raw = (initialConfig ?? {}) as Record<string, any>;
                const workloadView = raw.workloadView ?? {};
                void updateViewMutation.mutateAsync({ id: viewId, config: { ...raw, workloadView: { ...workloadView, savedFilterPresets: next } } });
            } else if (typeof window !== "undefined") {
                localStorage.setItem("agentflox_saved_filters", JSON.stringify(next));
            }
            return next;
        });
    }, [viewId, initialConfig]);

    const applySavedFilter = (config: FilterGroup) => {
        setFilterGroups(config);
        setSavedFiltersPanelOpen(false);
    };

    const appliedFilterCount = useMemo(() => {
        if (filterGroups.conditions.length === 0) return 0;
        return filterGroups.conditions.filter(c => ("conditions" in c ? hasAnyValueInGroup(c as FilterGroup) : hasFilterValue(c as FilterCondition))).length;
    }, [filterGroups]);

    // Filtered Tasks
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            if (!showCompleted && task.status?.type === 'CLOSED') return false;
            if (filterAssignee.length > 0) {
                const hasAssignee = (task.assignees || []).some((a: any) => filterAssignee.includes(a.user.id)) ||
                    (task.assigneeId && filterAssignee.includes(task.assigneeId));
                if (!hasAssignee) return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchesSearch = (task.title || task.name || "").toLowerCase().includes(q) || (task.id || "").toLowerCase().includes(q);
                if (!matchesSearch) return false;
            }
            return filterGroups.conditions.length > 0 ? evaluateGroup(task, filterGroups) : true;
        });
    }, [tasks, filterGroups, showCompleted, filterAssignee, searchQuery]);

    // Backlog tasks (unscheduled, overdue, unassigned)
    const backlogTasks = useMemo(() => {
        const todayStart = startOfDay(new Date());
        return tasks.filter(task => {
            if (!showCompleted && task.status?.type === 'CLOSED') return false;
            if (backlogSearch.trim()) {
                const q = backlogSearch.toLowerCase();
                const matches = (task.title || task.name || "").toLowerCase().includes(q);
                if (!matches) return false;
            }
            if (backlogTab === "unscheduled") {
                return !task.dueDate && !task.startDate;
            }
            if (backlogTab === "overdue") {
                if (!task.dueDate) return false;
                return isBefore(startOfDay(new Date(task.dueDate)), todayStart) && task.status?.type !== 'CLOSED';
            }
            if (backlogTab === "unassigned") {
                return (!task.assignees || task.assignees.length === 0) && !task.assigneeId;
            }
            return true;
        }).sort((a, b) => {
            if (backlogSort === "status") {
                return (a.status?.name || "").localeCompare(b.status?.name || "");
            }
            if (backlogSort === "priority") {
                return (a.priority || "").localeCompare(b.priority || "");
            }
            if (backlogSort === "dueDate") {
                const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                return aTime - bTime;
            }
            return (a.title || a.name || "").localeCompare(b.title || b.name || "");
        });
    }, [tasks, backlogTab, backlogSearch, backlogSort, showCompleted]);

    // Timeline Days
    const timelineDays = useMemo(() => {
        let start: Date;
        let numDays: number;

        if (timeframe === "7") {
            start = startOfWeek(currentDate, { weekStartsOn: 0 });
            numDays = 7;
        } else if (timeframe === "14") {
            start = startOfWeek(currentDate, { weekStartsOn: 0 });
            numDays = 14;
        } else if (timeframe === "days") {
            start = subDays(currentDate, 3);
            numDays = 7;
        } else if (timeframe === "weeks") {
            start = startOfWeek(currentDate, { weekStartsOn: 0 });
            numDays = 28;
        } else {
            // Months
            start = startOfMonth(currentDate);
            const end = endOfMonth(currentDate);
            numDays = differenceInDays(end, start) + 1;
        }

        const rawDays = Array.from({ length: numDays }, (_, i) => addDays(start, i));
        if (!showWeekends) {
            return rawDays.filter(d => !isWeekendFns(d));
        }
        return rawDays;
    }, [currentDate, timeframe, showWeekends]);

    interface WorkloadGroup {
        id: string;
        name: string;
        image?: string | null;
        color?: string;
        type: string;
        capacity: number;
        capacityPoints: number;
        capacityTasks: number;
    }

    // Grouping computation
    const groups: WorkloadGroup[] = useMemo(() => {
        if (groupBy === 'assignee') {
            const userGroups: WorkloadGroup[] = users.map(u => ({
                id: u.id,
                name: u.name,
                image: u.image,
                type: 'user',
                capacity: 8, // 8 hours per day default capacity
                capacityPoints: 5, // 5 sprint points default
                capacityTasks: 4, // 4 tasks per day
            }));
            return [
                { id: 'unassigned', name: 'Unassigned', image: null, type: 'unassigned', capacity: 8, capacityPoints: 5, capacityTasks: 4 },
                ...userGroups
            ];
        }
        if (groupBy === 'status') {
            const statusMap = new Map<string, { id: string; name: string; color: string }>();
            tasks.forEach(t => {
                if (t.status) statusMap.set(t.status.id, t.status);
            });
            const statusGroups: WorkloadGroup[] = Array.from(statusMap.values()).map(s => ({
                id: s.id,
                name: s.name,
                color: s.color,
                image: null,
                type: 'status',
                capacity: 8,
                capacityPoints: 5,
                capacityTasks: 4,
            }));
            return [
                ...statusGroups,
                { id: 'unassigned', name: 'No Status', type: 'status', color: '#94a3b8', image: null, capacity: 8, capacityPoints: 5, capacityTasks: 4 }
            ];
        }
        if (groupBy === 'priority') {
            return ['URGENT', 'HIGH', 'NORMAL', 'LOW', 'NONE'].map((p): WorkloadGroup => ({
                id: p.toLowerCase(),
                name: p.charAt(0) + p.slice(1).toLowerCase(),
                type: 'priority',
                color: getPriorityStyles(p).color,
                image: null,
                capacity: 8,
                capacityPoints: 5,
                capacityTasks: 4,
            }));
        }
        // Fallback or none
        return users.map((u): WorkloadGroup => ({
            id: u.id,
            name: u.name,
            image: u.image,
            type: 'user',
            capacity: 8,
            capacityPoints: 5,
            capacityTasks: 4,
        }));
    }, [groupBy, users, tasks]);

    // Calculate workload metrics per group and per day
    const getGroupTasksForDay = useCallback((groupId: string, date: Date) => {
        const dayStart = startOfDay(date);
        return filteredTasks.filter(t => {
            if (!t.dueDate && !t.startDate) return false;
            const tStart = t.startDate ? startOfDay(new Date(t.startDate)) : startOfDay(new Date(t.dueDate!));
            const tEnd = t.dueDate ? startOfDay(new Date(t.dueDate)) : startOfDay(new Date(t.startDate!));

            const minDate = tStart <= tEnd ? tStart : tEnd;
            const maxDate = tEnd >= tStart ? tEnd : tStart;

            if (dayStart < minDate || dayStart > maxDate) return false;

            // Check group membership
            if (groupBy === 'assignee') {
                if (groupId === 'unassigned') {
                    return (!t.assignees || t.assignees.length === 0) && !t.assigneeId;
                }
                return (t.assignees || []).some((a: any) => a.user.id === groupId) || (t.assigneeId === groupId);
            }
            if (groupBy === 'status') {
                if (groupId === 'unassigned') return !t.status;
                return t.status?.id === groupId;
            }
            if (groupBy === 'priority') {
                const p = (t.priority || 'NONE').toLowerCase();
                return p === groupId;
            }
            return true;
        });
    }, [filteredTasks, groupBy]);

    const getGroupTasksInPeriod = useCallback((groupId: string) => {
        if (timelineDays.length === 0) return [];
        const start = startOfDay(timelineDays[0]);
        const end = endOfDay(timelineDays[timelineDays.length - 1]);

        return filteredTasks.filter(t => {
            if (!t.dueDate && !t.startDate) return false;
            const tStart = t.startDate ? startOfDay(new Date(t.startDate)) : startOfDay(new Date(t.dueDate!));
            const tEnd = t.dueDate ? startOfDay(new Date(t.dueDate)) : startOfDay(new Date(t.startDate!));

            const minDate = tStart <= tEnd ? tStart : tEnd;
            const maxDate = tEnd >= tStart ? tEnd : tStart;

            // Overlaps with timeline range
            if (maxDate < start || minDate > end) return false;

            if (groupBy === 'assignee') {
                if (groupId === 'unassigned') {
                    return (!t.assignees || t.assignees.length === 0) && !t.assigneeId;
                }
                return (t.assignees || []).some((a: any) => a.user.id === groupId) || (t.assigneeId === groupId);
            }
            if (groupBy === 'status') {
                if (groupId === 'unassigned') return !t.status;
                return t.status?.id === groupId;
            }
            if (groupBy === 'priority') {
                const p = (t.priority || 'NONE').toLowerCase();
                return p === groupId;
            }
            return true;
        });
    }, [timelineDays, filteredTasks, groupBy]);

    const calculateDayWorkload = useCallback((groupId: string, date: Date, capacity = 8) => {
        const dayTasks = getGroupTasksForDay(groupId, date);
        const count = dayTasks.length;

        // Calculate hours and sprint points
        let totalHours = 0;
        let totalPoints = 0;

        dayTasks.forEach(t => {
            const tStart = t.startDate ? startOfDay(new Date(t.startDate)) : startOfDay(new Date(t.dueDate!));
            const tEnd = t.dueDate ? startOfDay(new Date(t.dueDate)) : startOfDay(new Date(t.startDate!));
            const daysSpanned = Math.max(1, differenceInDays(tEnd, tStart) + 1);

            // Raw time estimate (could be ms or minutes or hours; normalize to hours)
            let estimateHours = 0;
            if (t.timeEstimate) {
                estimateHours = t.timeEstimate > 3600000 ? t.timeEstimate / 3600000 : t.timeEstimate > 100 ? t.timeEstimate / 60 : t.timeEstimate;
            } else {
                estimateHours = 2; // Default 2h per task if not specified
            }

            totalHours += estimateHours / daysSpanned;
            totalPoints += 1 / daysSpanned;
        });

        // Determine capacity mode value
        let metricDisplay = "0 tasks";
        let isOverloaded = false;
        let isOptimal = false;

        if (workloadMetric === "tasks") {
            metricDisplay = `${count} task${count !== 1 ? 's' : ''}`;
            isOverloaded = count > 4;
            isOptimal = count > 0 && count <= 4;
        } else if (workloadMetric === "time_estimate") {
            const roundedHours = Math.round(totalHours * 10) / 10;
            metricDisplay = `${roundedHours}h`;
            isOverloaded = totalHours > capacity;
            isOptimal = totalHours > 0 && totalHours <= capacity;
        } else if (workloadMetric === "sprint_points") {
            const roundedPoints = Math.round(totalPoints * 10) / 10;
            metricDisplay = `${roundedPoints} pts`;
            isOverloaded = totalPoints > 5;
            isOptimal = totalPoints > 0 && totalPoints <= 5;
        } else if (workloadMetric === "percent_capacity") {
            const pct = Math.round((totalHours / capacity) * 100);
            metricDisplay = `${pct}%`;
            isOverloaded = pct > 100;
            isOptimal = pct > 0 && pct <= 100;
        }

        return {
            count,
            totalHours: Math.round(totalHours * 10) / 10,
            metricDisplay,
            isOverloaded,
            isOptimal,
            dayTasks
        };
    }, [getGroupTasksForDay, workloadMetric]);

    const toggleGroupCollapse = (id: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAllExpand = () => {
        if (allExpanded) {
            setCollapsedGroups(new Set(groups.map(g => g.id)));
            setAllExpanded(false);
        } else {
            setCollapsedGroups(new Set());
            setAllExpanded(true);
        }
    };

    const navigatePeriod = (direction: number) => {
        const daysToJump = timeframe === "7" ? 7 : timeframe === "14" ? 14 : timeframe === "weeks" ? 28 : 14;
        setCurrentDate(prev => addDays(prev, direction * daysToJump));
    };

    // Filter empty groups count
    const emptyGroupsCount = useMemo(() => {
        return groups.filter(g => getGroupTasksInPeriod(g.id).length === 0).length;
    }, [groups, getGroupTasksInPeriod]);

    const visibleGroups = useMemo(() => {
        if (showEmptyGroups) return groups;
        return groups.filter(g => getGroupTasksInPeriod(g.id).length > 0);
    }, [groups, showEmptyGroups, getGroupTasksInPeriod]);

    // Range display text
    const dateRangeLabel = useMemo(() => {
        if (timelineDays.length === 0) return "";
        const first = timelineDays[0];
        const last = timelineDays[timelineDays.length - 1];
        return `${format(first, "MMM d")} - ${format(last, "MMM d")}`;
    }, [timelineDays]);

    const monthHeaderLabel = useMemo(() => {
        if (timelineDays.length === 0) return "";
        const first = timelineDays[0];
        const last = timelineDays[timelineDays.length - 1];
        if (first.getMonth() === last.getMonth()) {
            return format(first, "MMMM yyyy");
        }
        return `${format(first, "MMM yyyy")} - ${format(last, "MMM yyyy")}`;
    }, [timelineDays]);

    // Render filter popover content
    const renderFilterContent = (opts?: { onClose?: () => void }) => (
        <ViewFilterPopoverContent
            onClose={opts?.onClose ?? (() => setFiltersPanelOpen(false))}
            savedFiltersPanelOpen={savedFiltersPanelOpen}
            setSavedFiltersPanelOpen={setSavedFiltersPanelOpen}
            savedFiltersSearch={savedFiltersSearch}
            setSavedFiltersSearch={setSavedFiltersSearch}
            savedFilterName={savedFilterName}
            setSavedFilterName={setSavedFilterName}
            savedFilters={savedFilters}
            saveNewFilter={saveNewFilter}
            deleteSavedFilter={deleteSavedFilter}
            applySavedFilter={applySavedFilter}
            filterGroups={filterGroups}
            setFilterGroups={setFilterGroups}
            addFilterGroup={addFilterGroup}
            addFilterCondition={addFilterCondition}
            removeFilterItem={removeFilterItem}
            updateFilterCondition={updateFilterCondition}
            updateFilterGroupOperator={updateFilterGroupOperator}
            filterSearch={filterSearch}
            setFilterSearch={setFilterSearch}
            assigneesSearch={assigneesSearch}
            setAssigneesSearch={setAssigneesSearch}
            FIELD_CONFIG={FIELD_CONFIG}
            users={users}
            allAvailableStatuses={allAvailableStatuses}
            allAvailableTags={allAvailableTags}
            availableTaskTypes={availableTaskTypes}
            resolvedWorkspaceId={resolvedWorkspaceId}
        />
    );

    if (isTasksLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-white rounded-xl border border-zinc-200 p-20">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-800" />
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Loading Workload...</span>
                </div>
            </div>
        );
    }

    return (
        <TooltipProvider delayDuration={150}>
            <div className="h-full flex flex-col bg-white border border-zinc-200 shadow-sm overflow-hidden text-[13px] relative font-sans select-none">
                {/* 1. PRIMARY TOOLBAR */}
                <div className="bg-white min-h-[50px] z-30 flex items-center justify-between px-3 gap-2 overflow-x-auto toolbar-scroll-x">
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Today Button */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs font-medium text-zinc-700 border-zinc-200 shadow-none px-3 rounded-lg hover:bg-zinc-50 transition-all active:scale-95 cursor-pointer"
                                    onClick={() => setCurrentDate(new Date())}
                                >
                                    Today
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Jump to today</TooltipContent>
                        </Tooltip>

                        {/* Workload Unit Dropdown */}
                        <DropdownMenu>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium text-zinc-700 border-zinc-200 shadow-none px-2.5 rounded-lg hover:bg-zinc-50 transition-all cursor-pointer">
                                            <span>
                                                {workloadMetric === "tasks" ? "Tasks" :
                                                    workloadMetric === "time_estimate" ? "Time Estimates" :
                                                        workloadMetric === "sprint_points" ? "Sprint Points" : "% Time Estimates"}
                                            </span>
                                            <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Workload Unit</TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="start" className="w-56 p-1.5 rounded-xl shadow-xl border-zinc-200 z-50">
                                <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                                    Workload Unit
                                </div>
                                <DropdownMenuItem
                                    onClick={() => setWorkloadMetric("sprint_points")}
                                    className="flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs"
                                >
                                    <div className="flex items-center gap-2 text-zinc-700">
                                        <Target className="h-4 w-4 text-zinc-400" />
                                        <span>Sprint Points</span>
                                    </div>
                                    {workloadMetric === "sprint_points" && <Check className="h-4 w-4 text-zinc-800" />}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setWorkloadMetric("tasks")}
                                    className="flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs"
                                >
                                    <div className="flex items-center gap-2 text-zinc-700 font-medium">
                                        <CheckCircle2 className="h-4 w-4 text-zinc-600" />
                                        <span>Tasks</span>
                                    </div>
                                    {workloadMetric === "tasks" && <Check className="h-4 w-4 text-zinc-800" />}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setWorkloadMetric("time_estimate")}
                                    className="flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs"
                                >
                                    <div className="flex items-center gap-2 text-zinc-700">
                                        <Hourglass className="h-4 w-4 text-zinc-400" />
                                        <span>Time Estimates</span>
                                    </div>
                                    {workloadMetric === "time_estimate" && <Check className="h-4 w-4 text-zinc-800" />}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setWorkloadMetric("percent_capacity")}
                                    className="flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs"
                                >
                                    <div className="flex items-center gap-2 text-zinc-700">
                                        <Percent className="h-4 w-4 text-zinc-400" />
                                        <div className="flex flex-col">
                                            <span>% Time Estimates</span>
                                            <span className="text-[10px] text-zinc-400">% out of capacity</span>
                                        </div>
                                    </div>
                                    {workloadMetric === "percent_capacity" && <Check className="h-4 w-4 text-zinc-800" />}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Time Frame Dropdown */}
                        <DropdownMenu>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium text-zinc-700 border-zinc-200 shadow-none px-2.5 rounded-lg hover:bg-zinc-50 transition-all cursor-pointer">
                                            <span>
                                                {timeframe === "7" ? "7 days" :
                                                    timeframe === "14" ? "14 days" :
                                                        timeframe === "days" ? "Days" :
                                                            timeframe === "weeks" ? "Weeks" : "Months"}
                                            </span>
                                            <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Time frame</TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="start" className="w-44 p-1.5 rounded-xl shadow-xl border-zinc-200 z-50">
                                <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                                    Time frame
                                </div>
                                <DropdownMenuItem onClick={() => setTimeframe("7")} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs">
                                    <span>7 days</span>
                                    {timeframe === "7" && <Check className="h-3.5 w-3.5 text-zinc-800" />}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTimeframe("14")} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs">
                                    <span>14 days</span>
                                    {timeframe === "14" && <Check className="h-3.5 w-3.5 text-zinc-800" />}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTimeframe("days")} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs">
                                    <span>Days</span>
                                    {timeframe === "days" && <Check className="h-3.5 w-3.5 text-zinc-800" />}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTimeframe("weeks")} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs">
                                    <span>Weeks</span>
                                    {timeframe === "weeks" && <Check className="h-3.5 w-3.5 text-zinc-800" />}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTimeframe("months")} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs">
                                    <span>Months</span>
                                    {timeframe === "months" && <Check className="h-3.5 w-3.5 text-zinc-800" />}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Workload Grouping / Capacity Mode Dropdown */}
                        <DropdownMenu>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium text-zinc-700 border-zinc-200 shadow-none px-2.5 rounded-lg hover:bg-zinc-50 transition-all cursor-pointer">
                                            <span>
                                                {capacityMode === "daily_scheduled" ? "Daily Scheduled" :
                                                    capacityMode === "daily_availability" ? "Daily Availability" :
                                                        capacityMode === "weekly_capacity" ? "Weekly Capacity" : "Weekly Availability"}
                                            </span>
                                            <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Workload Grouping</TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="start" className="w-72 p-1.5 rounded-xl shadow-xl border-zinc-200 z-50">
                                <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                                    Workload Grouping
                                </div>
                                <DropdownMenuItem
                                    onClick={() => setCapacityMode("daily_scheduled")}
                                    className="flex items-start justify-between px-2.5 py-2 rounded-lg cursor-pointer"
                                >
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-zinc-800">Daily Scheduled</span>
                                        <span className="text-[11px] text-zinc-500">Hours scheduled each day</span>
                                    </div>
                                    {capacityMode === "daily_scheduled" && <Check className="h-4 w-4 text-zinc-800 shrink-0 mt-0.5" />}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setCapacityMode("daily_availability")}
                                    className="flex items-start justify-between px-2.5 py-2 rounded-lg cursor-pointer"
                                >
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-zinc-800">Daily Availability</span>
                                        <span className="text-[11px] text-zinc-500">Remaining hours per day grouped by adjacent days with same availability</span>
                                    </div>
                                    {capacityMode === "daily_availability" && <Check className="h-4 w-4 text-zinc-800 shrink-0 mt-0.5" />}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setCapacityMode("weekly_capacity")}
                                    className="flex items-start justify-between px-2.5 py-2 rounded-lg cursor-pointer"
                                >
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-zinc-800">Weekly Capacity</span>
                                        <span className="text-[11px] text-zinc-500">Whole week hours & percentage capacity</span>
                                    </div>
                                    {capacityMode === "weekly_capacity" && <Check className="h-4 w-4 text-zinc-800 shrink-0 mt-0.5" />}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setCapacityMode("weekly_availability")}
                                    className="flex items-start justify-between px-2.5 py-2 rounded-lg cursor-pointer"
                                >
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-zinc-800">Weekly Availability</span>
                                        <span className="text-[11px] text-zinc-500">Remaining hours each week</span>
                                    </div>
                                    {capacityMode === "weekly_availability" && <Check className="h-4 w-4 text-zinc-800 shrink-0 mt-0.5" />}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Middle / Right Toolbar actions */}
                    <div className="flex items-center gap-2">
                        {/* Save View Dropdown */}
                        <ViewToolbarSaveDropdown
                            show={isViewDirty && !viewAutosave}
                            isViewDirty={isViewDirty}
                            viewAutosave={viewAutosave}
                            isPending={updateViewMutation.isPending}
                            onSave={() => void saveViewConfig()}
                            onToggleAutosave={handleToggleAutosave}
                            onSaveAsNewView={saveAsNewView}
                            onRevertChanges={revertViewChanges}
                            isSaveAsNewPending={createViewMutation.isPending}
                        />

                        {/* Group: Assignee */}
                        <DropdownMenu>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={cn(
                                                "h-8 gap-1.5 px-2.5 text-xs font-medium border-zinc-200 transition-colors cursor-pointer rounded-lg bg-white hover:bg-zinc-100 shadow-none",
                                                groupBy !== "none" ? "text-violet-700 border-violet-200" : "text-zinc-700"
                                            )}
                                        >
                                            <LayoutList className="h-3.5 w-3.5 text-violet-600" />
                                            <span>
                                                {groupBy === "none" ? "Group" : `Group: ${groupLabel}`}
                                            </span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Group by: {groupLabel}</TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-xl border-zinc-200 z-50">
                                <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                                    Group by
                                </div>
                                {[
                                    { id: "assignee", label: "Assignee", icon: Users },
                                    { id: "status", label: "Status", icon: Circle },
                                    { id: "priority", label: "Priority", icon: Flag },
                                    { id: "tags", label: "Tags", icon: Tag },
                                    { id: "dueDate", label: "Due date", icon: Calendar },
                                    { id: "taskType", label: "Task type", icon: Box },
                                ].map((opt) => (
                                    <DropdownMenuItem
                                        key={opt.id}
                                        className={cn(
                                            "flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-lg cursor-pointer",
                                            groupBy === opt.id ? "bg-violet-50 text-violet-700 font-medium" : "text-zinc-700 hover:bg-zinc-50"
                                        )}
                                        onClick={() => setGroupBy(opt.id)}
                                    >
                                        <opt.icon className="h-4 w-4 text-zinc-400" />
                                        <span className="flex-1">{opt.label}</span>
                                        {groupBy === opt.id && <Check className="h-3.5 w-3.5 text-violet-600" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Filter */}
                        <Popover open={filtersPanelOpen} onOpenChange={setFiltersPanelOpen}>
                            <PopoverTrigger asChild>
                                <div className="relative inline-flex">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={cn(
                                                    "h-8 text-xs font-medium bg-white hover:bg-zinc-100 shadow-none px-2.5 rounded-lg",
                                                    appliedFilterCount > 0 ? "border-violet-200 text-violet-700" : "text-zinc-700 border-zinc-200"
                                                )}
                                                onClick={() => {
                                                    if (!filtersPanelOpen && filterGroups.conditions.length === 0) {
                                                        addFilterGroup();
                                                    }
                                                }}
                                            >
                                                <Filter className="h-3.5 w-3.5" />
                                                <span className="ml-1.5">
                                                    {appliedFilterCount > 0 ? `${appliedFilterCount} Filter${appliedFilterCount !== 1 ? "s" : ""}` : "Filter"}
                                                </span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">Filter tasks</TooltipContent>
                                    </Tooltip>
                                </div>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-[500px] p-0 overflow-hidden shadow-2xl rounded-2xl border border-zinc-200">
                                {renderFilterContent({ onClose: () => setFiltersPanelOpen(false) })}
                            </PopoverContent>
                        </Popover>

                        {/* Closed Popover */}
                        <ViewToolbarClosedPopover
                            showCompleted={showCompleted}
                            showCompletedSubtasks={showCompletedSubtasks}
                            onShowCompletedChange={setShowCompleted}
                            onShowCompletedSubtasksChange={setShowCompletedSubtasks}
                        />

                        {/* Assignee Filter / Me Mode */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "h-8 text-xs font-medium bg-white hover:bg-zinc-100 shadow-none px-2.5 rounded-lg gap-1.5",
                                        filterAssignee.length > 0 ? "text-violet-700 border-violet-200" : "text-zinc-700 border-zinc-200"
                                    )}
                                    onClick={() => setAssigneesPanelOpen(true)}
                                >
                                    <User className="h-3.5 w-3.5" />
                                    <span>Assignee</span>
                                    <div className="h-5 w-5 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-bold">
                                        D
                                    </div>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Filter by Assignee</TooltipContent>
                        </Tooltip>

                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                            <Input
                                placeholder="Search..."
                                className="h-8 w-36 pl-8 text-xs bg-zinc-50 border-zinc-200 focus:bg-white focus:w-48 transition-all rounded-lg font-medium"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Customize Button */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-100 border-zinc-200 shadow-none px-2.5 rounded-lg gap-1.5 cursor-pointer"
                                    onClick={() => setCustomizePanelOpen(true)}
                                >
                                    <Settings className="h-3.5 w-3.5" />
                                    <span>Customize</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Customize view</TooltipContent>
                        </Tooltip>

                        {/* Add Task Split Button */}
                        <div className="flex items-center rounded-lg overflow-hidden border border-zinc-900 shadow-sm bg-zinc-900">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        className="h-8 bg-zinc-900 text-white hover:bg-zinc-800 font-medium text-xs px-3 rounded-none border-r border-white/10"
                                        onClick={() => setIsCreateModalOpen(true)}
                                    >
                                        Add Task
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Create new task</TooltipContent>
                            </Tooltip>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="icon" className="h-8 w-6 bg-zinc-900 text-white hover:bg-zinc-800 rounded-none p-0">
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40 p-1 rounded-xl shadow-xl z-50">
                                    <DropdownMenuItem onClick={() => setIsCreateModalOpen(true)} className="text-xs">
                                        New Task
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsBacklogOpen(true)} className="text-xs">
                                        Open Backlog
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Backlog Button */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "h-8 gap-1.5 px-3 text-xs font-medium border-zinc-200 rounded-lg shadow-none transition-all bg-white hover:bg-zinc-100 cursor-pointer",
                                        isBacklogOpen ? "text-violet-700 border-violet-200 bg-violet-50/50" : "text-zinc-700"
                                    )}
                                    onClick={() => setIsBacklogOpen(!isBacklogOpen)}
                                >
                                    <PanelRightClose className="h-3.5 w-3.5" />
                                    <span>Backlog</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Toggle backlog panel</TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                {/* 2. SUB-HEADER (DATE RANGE & TIMELINE DAYS) */}
                <div className="flex border-b border-zinc-200 bg-white min-h-[44px] z-20">
                    {/* Left Column Controls */}
                    <div className="w-[280px] shrink-0 border-r border-zinc-200 px-3 py-2 flex items-center justify-between bg-zinc-50/30">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-zinc-800">
                                {dateRangeLabel}
                            </span>
                            <div className="flex items-center gap-0.5 ml-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded"
                                    onClick={() => navigatePeriod(-1)}
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded"
                                    onClick={() => navigatePeriod(1)}
                                >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            {/* Eye Tooltip: Show empty groups */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "h-7 w-7 rounded-md text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 cursor-pointer",
                                            showEmptyGroups && "bg-zinc-100 text-zinc-900"
                                        )}
                                        onClick={() => setShowEmptyGroups(!showEmptyGroups)}
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    {showEmptyGroups ? "Hide empty groups" : "Show empty groups"}
                                </TooltipContent>
                            </Tooltip>

                            {/* Expand all / Collapse all */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "h-7 w-7 rounded-md text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 cursor-pointer",
                                            !allExpanded && "bg-zinc-100 text-zinc-900"
                                        )}
                                        onClick={toggleAllExpand}
                                    >
                                        {allExpanded ? (
                                            <ChevronsUpDown className="h-3.5 w-3.5 rotate-90" />
                                        ) : (
                                            <ChevronsUpDown className="h-3.5 w-3.5" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    {allExpanded ? "Collapse all" : "Expand all"}
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Right Timeline Header */}
                    <div className="flex-1 overflow-x-hidden relative bg-white flex flex-col justify-between">
                        {/* Month banner */}
                        <div className="px-4 pt-1.5 text-xs font-semibold text-zinc-800">
                            {monthHeaderLabel}
                        </div>

                        {/* Day Columns */}
                        <div className="flex items-center border-t border-zinc-100">
                            {timelineDays.map((day) => {
                                const isToday = isTodayFns(day);
                                const isWeekend = isWeekendFns(day);
                                const dayLetter = format(day, "EEEEE"); // S, M, T, W, T, F, S
                                const dayNumber = format(day, "d");

                                return (
                                    <div
                                        key={day.toISOString()}
                                        style={{ minWidth: `${cellWidth}px`, width: `${cellWidth}px` }}
                                        className={cn(
                                            "flex flex-col items-center justify-center py-1 border-r border-zinc-100 shrink-0 relative transition-colors",
                                            isWeekend && "bg-zinc-50/60 bg-[linear-gradient(45deg,#f4f4f5_25%,transparent_25%,transparent_50%,#f4f4f5_50%,#f4f4f5_75%,transparent_75%,transparent)] bg-[length:8px_8px]"
                                        )}
                                    >
                                        <span className="text-[11px] font-medium text-zinc-400">
                                            {dayLetter}
                                        </span>
                                        <div className="flex items-center justify-center mt-0.5 relative">
                                            {isToday ? (
                                                <div className="h-5 w-5 rounded-full bg-red-500 text-white font-bold text-[11px] flex items-center justify-center shadow-sm">
                                                    {dayNumber}
                                                </div>
                                            ) : (
                                                <span className="text-xs font-medium text-zinc-700">
                                                    {dayNumber}
                                                </span>
                                            )}
                                        </div>
                                        {isToday && (
                                            <div className="absolute -bottom-1 h-1 w-1 rounded-full bg-red-500" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Floating Zoom Buttons (+ / -) */}
                        <div className="absolute right-3 top-2 flex flex-col rounded-lg border border-zinc-200 bg-white shadow-sm overflow-hidden z-20">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        className="h-6 w-6 flex items-center justify-center text-zinc-600 hover:bg-zinc-50 border-b border-zinc-100 cursor-pointer"
                                        onClick={() => setCellWidth(prev => Math.min(prev + 12, 140))}
                                    >
                                        <Plus className="h-3 w-3" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left">Zoom in</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        className="h-6 w-6 flex items-center justify-center text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                                        onClick={() => setCellWidth(prev => Math.max(prev - 12, 52))}
                                    >
                                        <Minus className="h-3 w-3" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left">Zoom out</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                </div>

                {/* 3. MAIN WORKLOAD BODY & BACKLOG SPLIT */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Main Scrollable Grid Area */}
                    <div className="flex-1 flex flex-col overflow-y-auto">
                        {visibleGroups.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                <div className="h-12 w-12 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center mb-3">
                                    <Users className="h-6 w-6 text-zinc-400" />
                                </div>
                                <h4 className="text-sm font-semibold text-zinc-900">No scheduled tasks in this period</h4>
                                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                                    Tasks scheduled between {dateRangeLabel} will appear here. Toggle empty groups to view all assignees.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-4 text-xs font-medium"
                                    onClick={() => setShowEmptyGroups(true)}
                                >
                                    Show all assignees
                                </Button>
                            </div>
                        ) : (
                            <div className="divide-y divide-zinc-100">
                                {visibleGroups.map((group) => {
                                    const isCollapsed = collapsedGroups.has(group.id);
                                    const groupTasks = getGroupTasksInPeriod(group.id);

                                    return (
                                        <div key={group.id} className="group/row flex flex-col">
                                            {/* Group Header Row */}
                                            <div className="flex items-center min-h-[52px] hover:bg-zinc-50/50 transition-colors">
                                                {/* Left Group Column */}
                                                <div className="w-[280px] shrink-0 border-r border-zinc-200 px-3 py-2 flex items-center justify-between">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        {group.type === 'unassigned' ? (
                                                            <div className="h-7 w-7 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                                                                <UserRound className="h-4 w-4 text-zinc-400" />
                                                            </div>
                                                        ) : group.type === 'user' ? (
                                                            <Avatar className="h-7 w-7 border border-zinc-200 shrink-0">
                                                                <AvatarImage src={group.image || undefined} />
                                                                <AvatarFallback className="text-[10px] bg-zinc-100 text-zinc-600 font-semibold">
                                                                    {group.name.slice(0, 2).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        ) : (
                                                            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: group.color || '#6366f1' }} />
                                                        )}
                                                        <span className="text-xs font-semibold text-zinc-800 truncate">
                                                            {group.name}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded"
                                                            onClick={() => toggleGroupCollapse(group.id)}
                                                        >
                                                            {isCollapsed ? (
                                                                <ChevronRight className="h-3.5 w-3.5" />
                                                            ) : (
                                                                <ChevronDown className="h-3.5 w-3.5" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Right Day Capacity Cells */}
                                                <div className="flex-1 flex items-center overflow-x-hidden">
                                                    {timelineDays.map((day) => {
                                                        const isWeekend = isWeekendFns(day);
                                                        const { count, totalHours, metricDisplay, isOverloaded, dayTasks } = calculateDayWorkload(group.id, day, group.capacity);

                                                        return (
                                                            <div
                                                                key={day.toISOString()}
                                                                style={{ minWidth: `${cellWidth}px`, width: `${cellWidth}px` }}
                                                                className={cn(
                                                                    "h-full min-h-[52px] border-r border-zinc-100 shrink-0 p-1.5 flex items-center justify-center relative",
                                                                    isWeekend && "bg-zinc-50/40"
                                                                )}
                                                            >
                                                                {/* Hover Popover Tooltip */}
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <button
                                                                            type="button"
                                                                            className={cn(
                                                                                "w-full py-1 px-1.5 rounded-lg border text-center text-xs font-medium transition-all cursor-pointer select-none",
                                                                                count === 0
                                                                                    ? "bg-zinc-50/80 border-zinc-200/70 text-zinc-400 hover:bg-white hover:text-zinc-700 hover:border-zinc-300"
                                                                                    : isOverloaded
                                                                                        ? "bg-red-50 border-red-200 text-red-700 font-semibold hover:bg-red-100"
                                                                                        : "bg-emerald-50/80 border-emerald-200 text-emerald-800 font-semibold hover:bg-emerald-100"
                                                                            )}
                                                                        >
                                                                            <span className="truncate block text-[11px]">
                                                                                {metricDisplay}
                                                                            </span>
                                                                        </button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent
                                                                        side="top"
                                                                        align="center"
                                                                        className="w-64 p-3 bg-zinc-900 text-white rounded-xl shadow-2xl border-none z-50 text-xs"
                                                                    >
                                                                        <div className="font-semibold text-zinc-100 mb-1.5">
                                                                            {format(day, "EEEE, MMM d")}
                                                                        </div>
                                                                        {count === 0 ? (
                                                                            <div className="flex items-center gap-2 text-zinc-300">
                                                                                <div className="h-3 w-1 rounded bg-emerald-500" />
                                                                                <span>Nothing scheduled</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="space-y-1.5">
                                                                                <div className="flex items-center gap-2 text-zinc-300 mb-1">
                                                                                    <div className="h-3 w-1 rounded bg-emerald-500" />
                                                                                    <span>{count} task{count !== 1 ? 's' : ''} ({totalHours}h scheduled)</span>
                                                                                </div>
                                                                                <div className="space-y-1 pt-1 border-t border-zinc-800 max-h-32 overflow-y-auto">
                                                                                    {dayTasks.map(t => (
                                                                                        <div
                                                                                            key={t.id}
                                                                                            className="flex items-center justify-between text-[11px] hover:text-white cursor-pointer"
                                                                                            onClick={() => {
                                                                                                setSelectedTaskId(t.id);
                                                                                                if (onTaskSelect) onTaskSelect(t.id);
                                                                                            }}
                                                                                        >
                                                                                            <span className="truncate mr-2 text-zinc-200">{t.title || t.name}</span>
                                                                                            <span className="text-zinc-400 shrink-0">{t.status?.name}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </PopoverContent>
                                                                </Popover>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Expanded Tasks List */}
                                            {!isCollapsed && groupTasks.length > 0 && (
                                                <div className="bg-zinc-50/30 divide-y divide-zinc-100/80 border-t border-zinc-100">
                                                    {groupTasks.map((task) => {
                                                        const tStart = task.startDate ? startOfDay(new Date(task.startDate)) : startOfDay(new Date(task.dueDate!));
                                                        const tEnd = task.dueDate ? startOfDay(new Date(task.dueDate)) : startOfDay(new Date(task.startDate!));

                                                        return (
                                                            <div
                                                                key={task.id}
                                                                className="flex items-center min-h-[38px] hover:bg-zinc-100/60 transition-colors cursor-pointer"
                                                                onClick={() => {
                                                                    setSelectedTaskId(task.id);
                                                                    if (onTaskSelect) onTaskSelect(task.id);
                                                                }}
                                                            >
                                                                {/* Task info in left column */}
                                                                <div className="w-[280px] shrink-0 border-r border-zinc-200 px-4 py-1.5 flex items-center justify-between">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <div
                                                                            className="h-2 w-2 rounded-full shrink-0"
                                                                            style={{ backgroundColor: task.status?.color || '#94a3b8' }}
                                                                        />
                                                                        <span className="text-xs text-zinc-700 truncate font-medium">
                                                                            {task.title || task.name}
                                                                        </span>
                                                                    </div>
                                                                    {task.priority && (
                                                                        <Flag className={cn("h-3 w-3 shrink-0 ml-1.5", getPriorityStyles(task.priority).icon)} />
                                                                    )}
                                                                </div>

                                                                {/* Task spanning bar across days */}
                                                                <div className="flex-1 flex items-center overflow-x-hidden">
                                                                    {timelineDays.map((day) => {
                                                                        const dayStart = startOfDay(day);
                                                                        const isInside = dayStart >= tStart && dayStart <= tEnd;
                                                                        const isStart = isSameDay(dayStart, tStart);
                                                                        const isEnd = isSameDay(dayStart, tEnd);

                                                                        return (
                                                                            <div
                                                                                key={day.toISOString()}
                                                                                style={{ minWidth: `${cellWidth}px`, width: `${cellWidth}px` }}
                                                                                className="h-[38px] border-r border-zinc-100/60 shrink-0 p-1 flex items-center justify-center relative"
                                                                            >
                                                                                {isInside && (
                                                                                    <div
                                                                                        className={cn(
                                                                                            "w-full h-5 rounded flex items-center px-1.5 text-[10px] font-medium text-white shadow-xs truncate",
                                                                                            isStart && "rounded-l-md",
                                                                                            isEnd && "rounded-r-md"
                                                                                        )}
                                                                                        style={{ backgroundColor: task.status?.color || '#6366f1' }}
                                                                                    >
                                                                                        {isStart && <span className="truncate">{task.title || task.name}</span>}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Bottom message: Show X people without scheduled tasks */}
                                {!showEmptyGroups && emptyGroupsCount > 0 && (
                                    <div className="p-4 bg-zinc-50/50 text-center border-t border-zinc-200">
                                        <button
                                            type="button"
                                            className="text-xs text-zinc-500 hover:text-zinc-800 font-medium hover:underline cursor-pointer"
                                            onClick={() => setShowEmptyGroups(true)}
                                        >
                                            Show {emptyGroupsCount} people without scheduled tasks in this period
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        <TaskListLoadMore
                            loadMoreRef={loadMoreRef}
                            hasMore={hasMoreTasks}
                            isFetchingNextPage={isFetchingNextPage}
                            loaded={tasks.length}
                            total={taskTotal}
                        />
                    </div>

                    {/* Backlog Slide-over Panel */}
                    {isBacklogOpen && (
                        <div className="w-[320px] shrink-0 border-l border-zinc-200 bg-white flex flex-col animate-in slide-in-from-right duration-200 z-20">
                            {/* Backlog Header */}
                            <div className="p-3 border-b border-zinc-200 flex items-center justify-between">
                                <h3 className="font-bold text-zinc-900 text-sm">Tasks</h3>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-zinc-400 hover:text-zinc-700"
                                        onClick={() => setIsBacklogOpen(false)}
                                    >
                                        <ArrowRightToLine className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Backlog Tabs */}
                            <div className="flex items-center border-b border-zinc-200 px-3 bg-zinc-50/50">
                                <button
                                    type="button"
                                    className={cn(
                                        "py-2 px-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer",
                                        backlogTab === "unscheduled"
                                            ? "border-zinc-900 text-zinc-900"
                                            : "border-transparent text-zinc-400 hover:text-zinc-600"
                                    )}
                                    onClick={() => setBacklogTab("unscheduled")}
                                >
                                    Unscheduled
                                </button>
                                <button
                                    type="button"
                                    className={cn(
                                        "py-2 px-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer",
                                        backlogTab === "overdue"
                                            ? "border-zinc-900 text-zinc-900"
                                            : "border-transparent text-zinc-400 hover:text-zinc-600"
                                    )}
                                    onClick={() => setBacklogTab("overdue")}
                                >
                                    Overdue
                                </button>
                                <button
                                    type="button"
                                    className={cn(
                                        "py-2 px-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer",
                                        backlogTab === "unassigned"
                                            ? "border-zinc-900 text-zinc-900"
                                            : "border-transparent text-zinc-400 hover:text-zinc-600"
                                    )}
                                    onClick={() => setBacklogTab("unassigned")}
                                >
                                    Unassigned
                                </button>
                            </div>

                            {/* Sort row */}
                            <div className="px-3 py-2 flex items-center justify-between border-b border-zinc-100 text-xs">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button type="button" className="text-zinc-500 hover:text-zinc-800 font-medium flex items-center gap-1 cursor-pointer">
                                            Sort by <span className="underline font-semibold capitalize">{backlogSort}</span>
                                            <ChevronUp className="h-3 w-3" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-36 p-1 text-xs">
                                        <DropdownMenuItem onClick={() => setBacklogSort("status")}>Status</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setBacklogSort("priority")}>Priority</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setBacklogSort("dueDate")}>Due date</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setBacklogSort("name")}>Name</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <span className="text-zinc-400 font-medium">{backlogTasks.length} tasks</span>
                            </div>

                            {/* Backlog Tasks List */}
                            <ScrollArea className="flex-1 p-2">
                                {backlogTasks.length === 0 ? (
                                    <div className="p-8 text-center text-zinc-400 text-xs">
                                        No {backlogTab} tasks found
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {backlogTasks.map(task => (
                                            <div
                                                key={task.id}
                                                className="group flex items-center gap-2.5 p-2 rounded-lg hover:bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all cursor-pointer"
                                                onClick={() => {
                                                    setSelectedTaskId(task.id);
                                                    if (onTaskSelect) onTaskSelect(task.id);
                                                }}
                                            >
                                                {task.status?.type === 'CLOSED' ? (
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                                ) : (
                                                    <Circle className="h-4 w-4 text-zinc-400 shrink-0" style={{ color: task.status?.color }} />
                                                )}
                                                <span className="text-xs text-zinc-800 font-medium truncate flex-1">
                                                    {task.title || task.name}
                                                </span>
                                                {task.priority && (
                                                    <Flag className={cn("h-3 w-3 shrink-0", getPriorityStyles(task.priority).icon)} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    )}
                </div>
                {/* 4. CUSTOMIZE VIEW PANEL (ClickUp-style) */}
                <SidePanel
                    open={customizePanelOpen && !layoutOptionsOpen}
                    onClose={() => setCustomizePanelOpen(false)}
                    className="absolute bottom-0 right-0 h-full w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col"
                >
                    <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                        <h3 className="font-semibold text-zinc-900">Customize view</h3>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCustomizePanelOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <ScrollArea className="flex-1 min-h-0">
                        <div className="p-3 space-y-2 pb-24">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex items-center justify-center h-10 w-10 rounded-lg border border-zinc-200 bg-zinc-50 shrink-0">
                                    <BarChart3 className="h-5 w-5 text-zinc-600" />
                                </div>
                                <Input
                                    value={viewNameDraft}
                                    onChange={(e) => setViewNameDraft(e.target.value)}
                                    onBlur={() => updateViewName(viewNameDraft)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            updateViewName(viewNameDraft);
                                            (e.target as HTMLInputElement).blur();
                                        }
                                    }}
                                    className="h-10 text-sm font-medium border-zinc-200"
                                    placeholder="View name"
                                />
                            </div>

                            <div className="space-y-1">
                                {/* Workload Unit Popover */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-zinc-50 cursor-pointer group">
                                            <span className="text-zinc-800 text-sm">Workload</span>
                                            <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                {workloadMetric === "tasks" ? "Tasks" :
                                                    workloadMetric === "time_estimate" ? "Time Estimates" :
                                                        workloadMetric === "sprint_points" ? "Sprint Points" : "% Time Estimates"}
                                                <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                                            </span>
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent side="left" align="start" className="w-56 p-2 rounded-xl shadow-xl border-zinc-200 z-50">
                                        <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                                            Workload Unit
                                        </div>
                                        <div className="space-y-0.5">
                                            <div
                                                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 cursor-pointer text-xs"
                                                onClick={() => setWorkloadMetric("sprint_points")}
                                            >
                                                <div className="flex items-center gap-2 text-zinc-700">
                                                    <Target className="h-4 w-4 text-zinc-400" />
                                                    <span>Sprint Points</span>
                                                </div>
                                                {workloadMetric === "sprint_points" && <Check className="h-4 w-4 text-zinc-800" />}
                                            </div>
                                            <div
                                                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 cursor-pointer text-xs"
                                                onClick={() => setWorkloadMetric("tasks")}
                                            >
                                                <div className="flex items-center gap-2 text-zinc-700 font-medium">
                                                    <CheckCircle2 className="h-4 w-4 text-zinc-600" />
                                                    <span>Tasks</span>
                                                </div>
                                                {workloadMetric === "tasks" && <Check className="h-4 w-4 text-zinc-800" />}
                                            </div>
                                            <div
                                                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 cursor-pointer text-xs"
                                                onClick={() => setWorkloadMetric("time_estimate")}
                                            >
                                                <div className="flex items-center gap-2 text-zinc-700">
                                                    <Hourglass className="h-4 w-4 text-zinc-400" />
                                                    <span>Time Estimates</span>
                                                </div>
                                                {workloadMetric === "time_estimate" && <Check className="h-4 w-4 text-zinc-800" />}
                                            </div>
                                            <div
                                                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 cursor-pointer text-xs"
                                                onClick={() => setWorkloadMetric("percent_capacity")}
                                            >
                                                <div className="flex items-center gap-2 text-zinc-700">
                                                    <Percent className="h-4 w-4 text-zinc-400" />
                                                    <div className="flex flex-col">
                                                        <span>% Time Estimates</span>
                                                        <span className="text-[10px] text-zinc-400">% out of capacity</span>
                                                    </div>
                                                </div>
                                                {workloadMetric === "percent_capacity" && <Check className="h-4 w-4 text-zinc-800" />}
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                {/* Color tasks by Popover */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-zinc-50 cursor-pointer group">
                                            <span className="text-zinc-800 text-sm">Color tasks by</span>
                                            <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                {colorTasksBy === "none" ? "None" :
                                                    colorTasksBy === "list" ? "List" :
                                                        colorTasksBy === "priority" ? "Priority" : "Task status"}
                                                <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                                            </span>
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent side="left" align="start" className="w-56 p-2 rounded-xl shadow-xl border-zinc-200 z-50">
                                        <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                                            Color tasks by
                                        </div>
                                        <div className="space-y-0.5">
                                            {[
                                                { id: "none", label: "None" },
                                                { id: "list", label: "List" },
                                                { id: "status", label: "Task status" },
                                                { id: "priority", label: "Priority" },
                                            ].map(opt => (
                                                <div
                                                    key={opt.id}
                                                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 cursor-pointer text-xs"
                                                    onClick={() => setColorTasksBy(opt.id)}
                                                >
                                                    <span className="text-zinc-700">{opt.label}</span>
                                                    {colorTasksBy === opt.id && <Check className="h-4 w-4 text-zinc-800" />}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pt-2 mt-1 border-t border-zinc-100">
                                            <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                                                Settings
                                            </div>
                                            <div className="flex items-center justify-between px-2 py-1.5">
                                                <span className="text-xs text-zinc-700 flex items-center gap-1">
                                                    Improved colors
                                                    <Info className="h-3 w-3 text-zinc-400" />
                                                </span>
                                                <Switch defaultChecked />
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                <div className="flex items-center justify-between py-1 px-2">
                                    <span className="text-sm text-zinc-800">Show task locations</span>
                                    <Switch checked={showTaskLocations} onCheckedChange={setShowTaskLocations} />
                                </div>
                                <div className="flex items-center justify-between py-1 px-2">
                                    <span className="text-sm text-zinc-800">Show subtask parent names</span>
                                    <Switch checked={showSubtaskParentNames} onCheckedChange={setShowSubtaskParentNames} />
                                </div>
                                <div className="flex items-center justify-between py-1 px-2">
                                    <span className="text-sm text-zinc-800">Expand task names</span>
                                    <Switch checked={expandTaskNames} onCheckedChange={setExpandTaskNames} />
                                </div>
                                <div className="flex items-center justify-between py-1 px-2">
                                    <span className="text-sm text-zinc-800">Show closed tasks</span>
                                    <Switch checked={showCompleted} onCheckedChange={setShowCompleted} />
                                </div>
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer"
                                    onClick={() => setLayoutOptionsOpen(true)}
                                >
                                    <span>More options</span>
                                    <ChevronRight className="h-3 w-3 text-zinc-400" />
                                </button>
                            </div>

                            <div className="h-px bg-zinc-100 my-2" />

                            {/* Fields, Filter, Group, Subtasks */}
                            <div className="space-y-1">
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer"
                                    onClick={() => { setFieldsPanelOpen(true); setCustomizePanelOpen(false); }}
                                >
                                    <span className="flex items-center gap-2">
                                        <SlidersHorizontal className="h-4 w-4 text-zinc-400" />
                                        Fields
                                    </span>
                                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                                        {visibleColumns.size} shown
                                        <ChevronRight className="h-3 w-3 text-zinc-400" />
                                    </span>
                                </button>

                                <Popover open={customizeViewFilterOpen} onOpenChange={setCustomizeViewFilterOpen}>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer"
                                            onClick={() => { if (filterGroups.conditions.length === 0) { addFilterGroup(); } }}
                                        >
                                            <span className="flex items-center gap-2">
                                                <Filter className="h-4 w-4 text-zinc-400" />
                                                Filter
                                            </span>
                                            <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                {appliedFilterCount > 0 ? `${appliedFilterCount} applied` : "None"}
                                                <ChevronRight className="h-3 w-3 text-zinc-400" />
                                            </span>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent side="left" align="start" className="w-[500px] max-w-[90vw] p-0 overflow-hidden shadow-2xl rounded-2xl border border-zinc-200/80" sideOffset={16}>
                                        {renderFilterContent({ onClose: () => setCustomizeViewFilterOpen(false) })}
                                    </PopoverContent>
                                </Popover>

                                <Popover open={customizeViewGroupOpen} onOpenChange={setCustomizeViewGroupOpen}>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <LayoutList className="h-4 w-4 text-zinc-400" />
                                                Group
                                            </span>
                                            <span className="text-xs text-zinc-500 flex items-center gap-1 capitalize">
                                                {groupLabel}
                                                <ChevronRight className="h-3 w-3 text-zinc-400" />
                                            </span>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent side="left" align="start" className="w-[240px] p-1.5 rounded-xl shadow-xl border-zinc-200/60" sideOffset={16}>
                                        <div className="px-2 py-1.5 mb-1">
                                            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Group by</span>
                                        </div>
                                        <div className="space-y-0.5">
                                            {[
                                                { id: "assignee", label: "Assignee", icon: Users },
                                                { id: "status", label: "Status", icon: Circle },
                                                { id: "priority", label: "Priority", icon: Flag },
                                                { id: "tags", label: "Tags", icon: Tag },
                                                { id: "dueDate", label: "Due date", icon: Calendar },
                                                { id: "taskType", label: "Task type", icon: Box },
                                            ].map((opt) => (
                                                <div
                                                    key={opt.id}
                                                    className={cn(
                                                        "flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors",
                                                        groupBy === opt.id ? "bg-violet-50 text-violet-700" : "text-zinc-600 hover:bg-zinc-100"
                                                    )}
                                                    onClick={() => { setGroupBy(opt.id); setCustomizeViewGroupOpen(false); }}
                                                >
                                                    <opt.icon className={cn("h-4 w-4", groupBy === opt.id ? "text-violet-500" : "text-zinc-400")} />
                                                    <span className="flex-1">{opt.label}</span>
                                                    {groupBy === opt.id && <div className="h-1.5 w-1.5 rounded-full bg-violet-600" />}
                                                </div>
                                            ))}
                                            {groupBy !== "none" && (
                                                <>
                                                    <div className="h-px bg-zinc-100 my-1.5" />
                                                    <div className="flex items-center gap-1 p-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className={cn("flex-1 h-7 text-[10px] uppercase tracking-wider font-bold", groupDirection === "asc" ? "bg-white shadow-sm border border-zinc-200 text-zinc-900" : "text-zinc-500")}
                                                            onClick={() => setGroupDirection("asc")}
                                                        >
                                                            Ascending
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className={cn("flex-1 h-7 text-[10px] uppercase tracking-wider font-bold", groupDirection === "desc" ? "bg-white shadow-sm border border-zinc-200 text-zinc-900" : "text-zinc-500")}
                                                            onClick={() => setGroupDirection("desc")}
                                                        >
                                                            Descending
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                <Popover open={customizeViewSubtasksOpen} onOpenChange={setCustomizeViewSubtasksOpen}>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <GitCommit className="h-4 w-4 text-zinc-400" />
                                                Subtasks
                                            </span>
                                            <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                {expandedSubtaskMode === "collapsed" ? "Collapsed" : expandedSubtaskMode === "expanded" ? "Expanded" : "Separate"}
                                                <ChevronRight className="h-3 w-3 text-zinc-400" />
                                            </span>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent side="left" align="start" className="w-56" sideOffset={16}>
                                        <div className="text-xs px-2 pb-2 font-semibold text-zinc-900">Show subtasks</div>
                                        <div className="space-y-1">
                                            <button
                                                type="button"
                                                className={cn(
                                                    "w-full text-left text-xs px-2 py-1.5 rounded cursor-pointer",
                                                    expandedSubtaskMode === "collapsed" ? "bg-zinc-100 text-zinc-900 font-medium" : "text-zinc-700 hover:bg-zinc-50"
                                                )}
                                                onClick={() => {
                                                    setExpandedSubtaskMode("collapsed");
                                                    setCustomizeViewSubtasksOpen(false);
                                                }}
                                            >
                                                Collapsed (default)
                                            </button>
                                            <button
                                                type="button"
                                                className={cn(
                                                    "w-full text-left text-xs px-2 py-1.5 rounded cursor-pointer",
                                                    expandedSubtaskMode === "expanded" ? "bg-zinc-100 text-zinc-900 font-medium" : "text-zinc-700 hover:bg-zinc-50"
                                                )}
                                                onClick={() => {
                                                    setExpandedSubtaskMode("expanded");
                                                    setCustomizeViewSubtasksOpen(false);
                                                }}
                                            >
                                                Expanded
                                            </button>
                                            <button
                                                type="button"
                                                className={cn(
                                                    "w-full text-left text-xs px-2 py-1.5 rounded cursor-pointer",
                                                    expandedSubtaskMode === "separate" ? "bg-zinc-100 text-zinc-900 font-medium" : "text-zinc-700 hover:bg-zinc-50"
                                                )}
                                                onClick={() => {
                                                    setExpandedSubtaskMode("separate");
                                                    setCustomizeViewSubtasksOpen(false);
                                                }}
                                            >
                                                As separate items
                                            </button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <TemplateMenuPopover
                                    entityType="VIEW"
                                    workspaceId={(workspaceId || resolvedWorkspaceId || viewData?.workspaceId) ?? undefined}
                                    contentToSave={viewContentToSave}
                                >
                                    <button
                                        type="button"
                                        className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Wand2 className="h-4 w-4 text-zinc-400" />
                                            Templates
                                        </span>
                                        <ChevronRight className="inline h-3 w-3 ml-1 text-zinc-400" />
                                    </button>
                                </TemplateMenuPopover>
                            </div>

                            <div className="h-px bg-zinc-100 my-2" />

                            {/* View Settings Toggles */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Save className="h-4 w-4 text-zinc-400" />
                                        <span className="text-sm text-zinc-800">Autosave for me</span>
                                    </div>
                                    <Switch checked={viewAutosave} onCheckedChange={handleToggleAutosave} />
                                </div>
                                <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Pin className="h-4 w-4 text-zinc-400" />
                                        <span className="text-sm text-zinc-800">Pin view</span>
                                    </div>
                                    <Switch checked={pinView} onCheckedChange={(val) => { setPinView(val); updateViewProperty('isPinned', val); }} />
                                </div>
                                <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Lock className="h-4 w-4 text-zinc-400" />
                                        <span className="text-sm text-zinc-800">Private view</span>
                                    </div>
                                    <Switch checked={privateView} onCheckedChange={(val) => { setPrivateView(val); updateViewProperty('isPrivate', val); }} />
                                </div>
                                <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="h-4 w-4 text-zinc-400" />
                                        <span className="text-sm text-zinc-800">Protect view</span>
                                    </div>
                                    <Switch checked={protectView} onCheckedChange={(val) => { setProtectView(val); updateViewProperty('isLocked', val); }} />
                                </div>
                                <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Home className="h-4 w-4 text-zinc-400" />
                                        <span className="text-sm text-zinc-800">Set as default view</span>
                                    </div>
                                    <Switch checked={defaultView} onCheckedChange={(val) => { setDefaultView(val); updateViewProperty('isDefault', val); }} />
                                </div>
                            </div>

                            <div className="h-px bg-zinc-100 my-2" />

                            {/* Action Links */}
                            <div className="space-y-1">
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer"
                                    onClick={() => {
                                        if (typeof window !== 'undefined') {
                                            const url = `${window.location.origin}${window.location.pathname}?v=${viewId}`;
                                            navigator.clipboard?.writeText(url);
                                            toast.success("Link copied to clipboard");
                                        }
                                    }}
                                >
                                    <span className="flex items-center gap-2">
                                        <Link2 className="h-4 w-4 text-zinc-400" />
                                        Copy link to view
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer"
                                    onClick={() => setIsShareModalOpen(true)}
                                >
                                    <span className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-zinc-400" />
                                        Sharing & Permissions
                                    </span>
                                    <ChevronRight className="h-3 w-3 text-zinc-400" />
                                </button>
                            </div>
                        </div>
                    </ScrollArea>
                </SidePanel>

                {/* Layout Options Sub-Page */}
                <SidePanel
                    open={layoutOptionsOpen}
                    onClose={() => { setLayoutOptionsOpen(false); setCustomizePanelOpen(false); }}
                    className="absolute bottom-0 right-0 h-full w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col"
                >
                    <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 -ml-1 cursor-pointer"
                            onClick={() => { setLayoutOptionsOpen(false); setCustomizePanelOpen(true); }}
                        >
                            <ArrowRight className="h-4 w-4 rotate-180" />
                        </Button>
                        <h3 className="font-semibold text-zinc-900">Layout options</h3>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer"
                            onClick={() => { setLayoutOptionsOpen(false); setCustomizePanelOpen(false); }}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <ScrollArea className="flex-1 min-h-0">
                        <div className="p-3 space-y-4 pb-24">
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Page & card layout</p>
                                <div className="flex items-center justify-between py-1 px-2">
                                    <span className="text-sm text-zinc-800">Show weekends</span>
                                    <Switch checked={showWeekends} onCheckedChange={setShowWeekends} />
                                </div>
                                <div className="flex items-center justify-between py-1 px-2">
                                    <span className="text-sm text-zinc-800">Show week numbers</span>
                                    <Switch checked={showWeekNumbers} onCheckedChange={setShowWeekNumbers} />
                                </div>
                                <div className="flex items-center justify-between py-1 px-2">
                                    <span className="text-sm text-zinc-800">Show task locations</span>
                                    <Switch checked={showTaskLocations} onCheckedChange={setShowTaskLocations} />
                                </div>
                                <div className="flex items-center justify-between py-1 px-2">
                                    <span className="text-sm text-zinc-800">Show subtask parent names</span>
                                    <Switch checked={showSubtaskParentNames} onCheckedChange={setShowSubtaskParentNames} />
                                </div>
                                <div className="flex items-center justify-between py-1 px-2">
                                    <span className="text-sm text-zinc-800">Expand task names</span>
                                    <Switch checked={expandTaskNames} onCheckedChange={setExpandTaskNames} />
                                </div>
                                <div className="flex items-center justify-between py-1 px-2">
                                    <span className="text-sm text-zinc-800">Show tracked time next to estimated</span>
                                    <Switch checked={showTrackedTimeNextToEstimated} onCheckedChange={setShowTrackedTimeNextToEstimated} />
                                </div>
                            </div>

                            <div className="h-px bg-zinc-100" />

                            <div className="space-y-2">
                                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Task visibility</p>
                                <div className="flex items-center justify-between py-1 px-2">
                                    <span className="text-sm text-zinc-800">Show closed tasks</span>
                                    <Switch checked={showCompleted} onCheckedChange={setShowCompleted} />
                                </div>
                                <div className="flex items-center justify-between py-1 px-2">
                                    <span className="text-sm text-zinc-700">Show closed subtasks</span>
                                    <Switch checked={showCompletedSubtasks} onCheckedChange={setShowCompletedSubtasks} />
                                </div>
                                <div className="flex items-center justify-between py-1 px-2">
                                    <span className="text-sm text-zinc-800">Show tasks from other Lists</span>
                                    <Switch checked={showTasksFromOtherLists} onCheckedChange={setShowTasksFromOtherLists} />
                                </div>
                                <div className="flex items-center justify-between py-1 px-2">
                                    <span className="text-sm text-zinc-800">Show subtasks from other Lists</span>
                                    <Switch checked={showSubtasksFromOtherLists} onCheckedChange={setShowSubtasksFromOtherLists} />
                                </div>
                            </div>

                            <div className="h-px bg-zinc-100" />

                            <div className="space-y-2">
                                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">View settings</p>
                                <div className="flex items-center justify-between py-1 px-2">
                                    <span className="text-sm flex items-center gap-2">
                                        <UserRound className="h-4 w-4 text-zinc-400" />
                                        Default to Me Mode
                                    </span>
                                    <Switch checked={defaultToMeMode} onCheckedChange={setDefaultToMeMode} />
                                </div>
                                <div
                                    className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded cursor-pointer"
                                    onClick={resetViewToDefaults}
                                >
                                    <span className="text-sm flex items-center gap-2">
                                        <RefreshCcw className="h-4 w-4 text-zinc-400" />
                                        Reset view to defaults
                                    </span>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </SidePanel>

                {/* 5. FIELDS PANEL SLIDEOUT */}
                <FieldsPanelSlideout
                    open={fieldsPanelOpen}
                    onClose={() => setFieldsPanelOpen(false)}
                    onOpenManagerModal={() => setManagerModalOpen(true)}
                    workspaceId={resolvedWorkspaceId}
                    spaceId={spaceId}
                    projectId={projectId}
                    folderId={folderId}
                    teamId={teamId}
                    listId={listId}
                    listName={currentList?.name}
                    fieldConfig={FIELD_CONFIG}
                    visibleColumns={visibleColumns}
                    columnOrder={columnOrder}
                    onColumnOrderChange={setColumnOrder}
                    toggleColumn={toggleColumn}
                    sensors={fieldSensors}
                    customFields={customFields as any[]}
                    usedCustomFieldIds={usedCustomFieldIds}
                    getCustomFieldIcon={getCustomFieldIcon}
                />

                {/* 6. ASSIGNEES PANEL SLIDEOUT */}
                <AssigneesPanelSlideout
                    open={assigneesPanelOpen}
                    onClose={() => setAssigneesPanelOpen(false)}
                    users={users}
                    selectedAssignees={filterAssignee}
                    onSelectionChange={setFilterAssignee}
                />

                {/* Modals */}
                <TaskDetailModal
                    taskId={selectedTaskId || ""}
                    open={!!selectedTaskId}
                    onOpenChange={(open) => !open && (onTaskSelect ? onTaskSelect(null) : setSelectedTaskId(null))}
                />
                <TaskCreationModal
                    context={spaceId ? "SPACE" : projectId ? "PROJECT" : "GENERAL"}
                    contextId={spaceId || projectId}
                    workspaceId={resolvedWorkspaceId as any}
                    users={users as any}
                    defaultListId={listId as any}
                    availableStatuses={[] as any}
                    open={isCreateModalOpen}
                    onOpenChange={setIsCreateModalOpen}
                    trigger={<span className="sr-only" />}
                />
                <ShareViewPermissionModal
                    open={isShareModalOpen}
                    onOpenChange={setIsShareModalOpen}
                    viewId={viewId as string}
                    workspaceId={resolvedWorkspaceId as string}
                />
                <CustomFieldsManagerModal
                    open={managerModalOpen}
                    onOpenChange={setManagerModalOpen}
                    workspaceId={(workspaceId || resolvedWorkspaceId) ?? ""}
                    initialLocation={
                        listId ? `list:${listId}` :
                            folderId ? `folder:${folderId}` :
                                projectId ? `project:${projectId}` :
                                    spaceId ? `space:${spaceId}` :
                                        teamId ? `team:${teamId}` :
                                            (workspaceId || resolvedWorkspaceId) ? `workspace:${workspaceId || resolvedWorkspaceId}` :
                                                "all" as any
                    }
                />
            </div>
        </TooltipProvider>
    );
}
