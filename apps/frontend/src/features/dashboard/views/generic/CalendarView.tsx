"use client";

import { useGenericTaskViewData } from "@/features/dashboard/hooks/useGenericTaskViewData";
import { collectUsedCustomFieldIds } from "@/features/dashboard/utils/taskViewUtils";
import { TaskListLoadMore } from "@/features/dashboard/components/shared/TaskListLoadMore";
import { VirtualizedDivRows } from "@/features/dashboard/components/shared/VirtualizedListRows";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SingleDateCalendar } from "@/components/ui/date-picker";
import { DestinationPicker } from "@/entities/task/components/DestinationPicker";
import { Info, Box, Trash2, Link, Star, GitMerge, Wand2, SquarePen, Save, Copy, LogOut, RefreshCw } from "lucide-react";
import type { FilterCondition, FilterOperator } from "./listViewTypes";
import { parseEncodedTag } from "@/entities/task/utils/tags";
import { Badge } from "@/components/ui/badge";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Filter,
    MoreHorizontal,
    Plus,
    Search,
    Layout,
    Settings,
    Maximize2,
    Clock,
    Tag,
    User,
    Flag,
    ArrowUp,
    ArrowDown,
    Check,
    X,
    XCircle,
    Play,
    CalendarCheck,
    CalendarDays,
    Users,
    ChevronDown,
    ListFilter,
    ArrowUpDown,
    Settings2,
    ChevronsUpDown,
    MoreVertical,
    AlertCircle,
    Clock3,
    Ban,
    MessageSquare,
    LayoutList,
    SlidersHorizontal,
    Share,
    Lock,
    Unlock,
    Pin,
    ShieldCheck,
    Home,
    PanelRightClose,
    ArrowRightToLine,
    Globe,
    CircleSlash
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TaskCreationModal } from "@/entities/task/components/TaskCreationModal";
import { LazyTaskDetailModal as TaskDetailModal } from "@/entities/task/components/LazyTaskDetailModal";
import { TagsModal } from "@/entities/task/components/TagsModal";
import { AssigneeSelector } from "@/entities/task/components/AssigneeSelector";
import { TaskTypeIcon } from "@/entities/task/components/TaskTypeIcon";
import { TaskActionsPopover } from "@/entities/task/components/TaskActionsPopover";
import { TaskCalendar } from "@/entities/task/components/TaskCalendar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addDays, isToday as isTodayFns, isSameDay, getWeek, startOfWeek, endOfWeek } from "date-fns";
import { FILTER_OPTIONS, FIELD_OPERATORS, STANDARD_FIELD_CONFIG } from "./listViewConstants";
import { evaluateGroup, hasFilterValue, hasAnyValueInGroup } from "./filterUtils";
import type { FilterGroup } from "./listViewTypes";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ViewToolbarSaveDropdown } from "@/features/dashboard/components/shared/ViewToolbarSaveDropdown";
import { ViewToolbarClosedPopover } from "@/features/dashboard/components/shared/ViewToolbarClosedPopover";
import { SidePanel } from "@/features/dashboard/components/shared/SidePanel";

interface CalendarViewProps {
    spaceId?: string;
    projectId?: string;
    folderId?: string;
    teamId?: string;
    listId?: string;
    viewId?: string;
    workspaceId?: string;
    initialConfig?: Record<string, any> | null;
    selectedTaskIdFromParent?: string | null;
    onTaskSelect?: (taskId: string | null) => void;

    context?: "workspace" | "space" | "project" | "team" | "folder" | "list";
}

export function CalendarView({ spaceId, projectId, teamId, folderId, listId, viewId, workspaceId, initialConfig, selectedTaskIdFromParent, onTaskSelect }: CalendarViewProps) {
    const utils = trpc.useUtils();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<"month" | "week" | "4days" | "day">("month");
    const [selectedDetailTaskId, setSelectedDetailTaskId] = useState<string | null>(null);
    const effectiveSelectedTaskId = onTaskSelect ? (selectedTaskIdFromParent ?? null) : selectedDetailTaskId;
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedDateForNewTask, setSelectedDateForNewTask] = useState<Date | null>(null);
    const [expandedMonthCells, setExpandedMonthCells] = useState<Record<string, boolean>>({});

    const [isRightSidebarExpanded, setIsRightSidebarExpanded] = useState(false);
    const [isRightSidebarSearchOpen, setIsRightSidebarSearchOpen] = useState(false);
    const [rightSidebarSearchText, setRightSidebarSearchText] = useState("");
    const [rightSidebarTab, setRightSidebarTab] = useState<"unscheduled" | "overdue">("unscheduled");
    const [rightSidebarSortBy, setRightSidebarSortBy] = useState<"duedate" | "status" | "priority" | "assignees" | "name" | "listname">("status");
    const [rightSidebarSortDesc, setRightSidebarSortDesc] = useState(false);

    const openTaskDetail = (taskId: string) => {
        if (onTaskSelect) onTaskSelect(taskId);
        else setSelectedDetailTaskId(taskId);
    };

    const closeTaskDetail = () => {
        if (onTaskSelect) onTaskSelect(null);
        else setSelectedDetailTaskId(null);
    };

    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const [inlineCreateState, setInlineCreateState] = useState<{ dayKey: string; hour: number; half: number } | null>(null);
    const [inlineCreateText, setInlineCreateText] = useState("");
    const [inlineAddTags, setInlineAddTags] = useState<string[]>([]);
    const [inlineAddAssigneeIds, setInlineAddAssigneeIds] = useState<string[]>([]);
    const [inlineAddPriority, setInlineAddPriority] = useState<"URGENT" | "HIGH" | "NORMAL" | "LOW" | null>(null);
    const [inlineAddStatusId, setInlineAddStatusId] = useState<string | null>(null);
    const [inlineAddTaskType, setInlineAddTaskType] = useState<string | null>(null);
    const [inlineAddStartDate, setInlineAddStartDate] = useState<Date | null>(null);
    const [inlineAddDueDate, setInlineAddDueDate] = useState<Date | null>(null);
    // Tracks whether the inline-create task has no explicit start/end time
    const [inlineNoStartTime, setInlineNoStartTime] = useState(false);
    const [inlineNoEndTime, setInlineNoEndTime] = useState(false);

    const taskListSpaceId = spaceId && !projectId && !listId ? spaceId : undefined;
    const taskListProjectId = projectId && !listId ? projectId : undefined;

    const {
        resolvedWorkspaceId,
        customFields,
        availableTaskTypes,
        agents,
        workspaceMembers,
        currentList,
        tasks: rawTasks,
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
        taskListSpaceId,
        taskListProjectId,
        includeRelations: "card",
    });

    const users = useMemo(() => {
        return (workspaceMembers ?? []).map((m: { user?: { id: string; name?: string | null; email?: string | null; image?: string | null } }) => {
            const u = m.user;
            if (!u) return null;
            return { id: u.id, name: u.name || u.email || 'Unknown', image: u.image ?? null, email: u.email ?? null };
        }).filter(Boolean) as { id: string; name: string; image: string | null; email: string | null }[];
    }, [workspaceMembers]);

    useEffect(() => {
        if (availableTaskTypes.length > 0 && !inlineAddTaskType) {
            const defaultType = availableTaskTypes.find((t: any) => t.isDefault) || availableTaskTypes[0];
            if (defaultType) {
                setInlineAddTaskType(defaultType.id);
            }
        }
    }, [availableTaskTypes, inlineAddTaskType]);

    const createTask = trpc.task.create.useMutation({
        onSuccess: () => {
            void utils.task.list.invalidate();
        },
    });

    const updateTask = trpc.task.update.useMutation({
        onSuccess: () => {
            void utils.task.list.invalidate();
        },
    });

    const deleteTask = trpc.task.delete.useMutation({
        onSuccess: () => {
            void utils.task.list.invalidate();
        },
    });

    const ActionButtons = ({ task, className }: { task: any, className?: string }) => (
        <div
            className={cn("opacity-0 group-hover/task:opacity-100 transition-opacity z-30", className)}
            onClick={(e) => e.stopPropagation()}
        >
            <TaskActionsPopover
                task={task}
                context={spaceId ? "SPACE" : projectId ? "PROJECT" : "GENERAL"}
                contextId={(spaceId || projectId) as any}
                workspaceId={resolvedWorkspaceId!}
                users={users as any}
                lists={[]}
                defaultListId={listId}
                availableStatuses={allAvailableStatuses}
                onDelete={async (id) => {
                    try { await deleteTask.mutateAsync({ id }); } catch (e) { }
                }}
                onUpdate={async (id, data) => {
                    try { await updateTask.mutateAsync({ id, ...(data as any) }); } catch (e) { }
                }}
                onAction={() => { }}
            >
                <button
                    className="flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors mx-0.5 cursor-pointer"
                >
                    <MoreHorizontal className="h-[14px] w-[14px]" />
                </button>
            </TaskActionsPopover>
        </div>
    );

    const handleUpdateTaskStatus = async (taskId: string, statusId: string) => {
        try {
            await updateTask.mutateAsync({ id: taskId, statusId });
            toast.success("Status updated");
        } catch (e) {
            toast.error("Failed to update status");
        }
    };

    const handleSaveInline = async () => {
        if (!inlineCreateText.trim() || createTask.isPending || !inlineCreateState) return;

        try {
            let taskTypeId = inlineAddTaskType;
            if (!taskTypeId && availableTaskTypes.length > 0) {
                taskTypeId = availableTaskTypes.find((t: any) => t.isDefault)?.id || availableTaskTypes[0].id;
            }

            const dueDate = inlineAddDueDate
                ?? (inlineCreateState.hour !== -1
                    ? new Date(`${inlineCreateState.dayKey}T${inlineCreateState.hour.toString().padStart(2, '0')}:${inlineCreateState.half === 0 ? '00' : '30'}:00`)
                    : new Date(`${inlineCreateState.dayKey}`));

            await createTask.mutateAsync({
                title: inlineCreateText.trim(),
                listId: listId || undefined,
                projectId: projectId && !listId ? projectId : undefined,
                spaceId: spaceId && !projectId && !listId ? spaceId : undefined,
                workspaceId: resolvedWorkspaceId || undefined,
                dueDate: dueDate ?? undefined,
                startDate: inlineAddStartDate ?? undefined,
                noStartTime: inlineNoStartTime,
                noEndTime: inlineNoEndTime,
                priority: inlineAddPriority || undefined,
                statusId: inlineAddStatusId || undefined,
                tags: inlineAddTags,
                assigneeIds: inlineAddAssigneeIds,
                assigneeId: inlineAddAssigneeIds[0] || undefined,
                taskTypeId,
            } as any);

            setInlineCreateState(null);
            setInlineCreateText("");
            setInlineAddTags([]);
            setInlineAddAssigneeIds([]);
            setInlineAddPriority(null);
            setInlineAddStatusId(null);
            setInlineAddStartDate(null);
            setInlineAddDueDate(null);
            setInlineNoStartTime(false);
            setInlineNoEndTime(false);
        } catch (e) {
            console.error("Failed to create task", e);
        }
    };

    // View States
    const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
    const [customizeMenuOpen, setCustomizeMenuOpen] = useState(false);
    const [showWeekends, setShowWeekends] = useState(true);
    const [showWeekNumbers, setShowWeekNumbers] = useState(false);
    const [showSubtasks, setShowSubtasks] = useState(true);
    const [showHourGridLines, setShowHourGridLines] = useState(true);
    const [fadeTasksInPast, setFadeTasksInPast] = useState(true);
    const [alwaysStayOnThisDate, setAlwaysStayOnThisDate] = useState(false);
    const [showFutureRecurringTasks, setShowFutureRecurringTasks] = useState(true);
    const [myTasksFromAllLists, setMyTasksFromAllLists] = useState(false);
    const [showClosed, setShowClosed] = useState(false);
    const [showCompletedSubtasks, setShowCompletedSubtasks] = useState(false);
    const [assigneesPanelOpen, setAssigneesPanelOpen] = useState(false);
    const [filterAssignee, setFilterAssignee] = useState<string[]>([]);

    const [searchQuery, setSearchQuery] = useState("");
    const [isToolbarSearchOpen, setIsToolbarSearchOpen] = useState(false);
    const toolbarSearchContainerRef = useRef<HTMLDivElement | null>(null);
    const toolbarSearchInputRef = useRef<HTMLInputElement | null>(null);
    const calendarSidebarScrollRef = useRef<HTMLDivElement | null>(null);

    // Autosave & Config Tracking States
    const [isViewDirty, setIsViewDirty] = useState(false);
    const [viewAutosave, setViewAutosave] = useState(false);
    const updateViewMutation = trpc.view.update.useMutation();
    const createViewMutation = trpc.view.create.useMutation();

    const [customizePanelOpen, setCustomizePanelOpen] = useState(false);
    const [layoutOptionsOpen, setLayoutOptionsOpen] = useState(false);
    const [customizeViewFilterOpen, setCustomizeViewFilterOpen] = useState(false);
    const [customizeViewGroupOpen, setCustomizeViewGroupOpen] = useState(false);

    // Filter and Settings states
    const [showEmptyStatuses, setShowEmptyStatuses] = useState(false);
    const [wrapText, setWrapText] = useState(false);
    const [showTaskLocations, setShowTaskLocations] = useState(false);
    const [showSubtaskParentNames, setShowSubtaskParentNames] = useState(false);
    const [showTaskProperties, setShowTaskProperties] = useState(true);
    const [showTasksFromOtherLists, setShowTasksFromOtherLists] = useState(false);
    const [showSubtasksFromOtherLists, setShowSubtasksFromOtherLists] = useState(false);
    const [pinView, setPinView] = useState(false);
    const [privateView, setPrivateView] = useState(false);
    const [protectView, setProtectView] = useState(false);
    const [defaultView, setDefaultView] = useState(false);
    const [defaultToMeMode, setDefaultToMeMode] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isDefaultViewSettingsModalOpen, setIsDefaultViewSettingsModalOpen] = useState(false);
    const [defaultViewSettingsApplyTo, setDefaultViewSettingsApplyTo] = useState<"NEW" | "REQUIRED" | "ALL">("NEW");
    /** @type {Partial<any>} */
    const [defaultViewSettingsDraft, setDefaultViewSettingsDraft] = useState({});

    useEffect(() => {
        if (!isToolbarSearchOpen) return;

        toolbarSearchInputRef.current?.focus();

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (!toolbarSearchContainerRef.current?.contains(target)) {
                setIsToolbarSearchOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isToolbarSearchOpen]);

    // Initial config initialization effect
    useEffect(() => {
        if (initialConfig) {
            const raw = initialConfig as Record<string, any>;
            const cfg = raw.calendarView || raw.calendar || raw;
            if (typeof cfg.showEmptyStatuses === "boolean") setShowEmptyStatuses(cfg.showEmptyStatuses);
            if (typeof cfg.wrapText === "boolean") setWrapText(cfg.wrapText);
            if (typeof cfg.showTaskLocations === "boolean") setShowTaskLocations(cfg.showTaskLocations);
            if (typeof cfg.showSubtaskParentNames === "boolean") setShowSubtaskParentNames(cfg.showSubtaskParentNames);
            if (typeof cfg.showTaskProperties === "boolean") setShowTaskProperties(cfg.showTaskProperties);
            if (typeof cfg.showTasksFromOtherLists === "boolean") setShowTasksFromOtherLists(cfg.showTasksFromOtherLists);
            if (typeof cfg.showSubtasksFromOtherLists === "boolean") setShowSubtasksFromOtherLists(cfg.showSubtasksFromOtherLists);
            if (typeof cfg.viewAutosave === "boolean") setViewAutosave(cfg.viewAutosave);
            if (typeof cfg.defaultToMeMode === "boolean") setDefaultToMeMode(cfg.defaultToMeMode);
        }
    }, [initialConfig]);

    const { data: viewData, refetch: refetchViewData } = trpc.view.get.useQuery({ id: viewId as string }, { staleTime: 60_000, gcTime: 5 * 60_000, enabled: !!viewId });
    const updateManyViewsMutation = trpc.view.updateMany.useMutation({
        onSuccess: () => {
            void utils.view.list.invalidate();
        }
    });

    const [viewNameDraft, setViewNameDraft] = useState("");
    useEffect(() => {
        if (viewData) {
            setViewNameDraft(viewData.name || "");
            setPinView(viewData.isPinned || false);
            setPrivateView(viewData.isPrivate || false);
            setProtectView(viewData.isLocked || false);
            setDefaultView(viewData.isDefault || false);
            const cfg = (viewData.config as any)?.calendarView || (viewData.config as any)?.calendar;
            if (typeof cfg?.viewAutosave === "boolean") setViewAutosave(cfg.viewAutosave);
        }
    }, [viewData]);

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

    const updateViewName = async (newName: string) => {
        if (!viewId || !newName.trim()) return;
        const trimmed = newName.trim();
        const oldName = viewData?.name || "";
        setViewNameDraft(trimmed);

        const patchViews = (views: any[]) => views.map((v: any) => v.id === viewId ? { ...v, name: trimmed } : v);
        if (spaceId) utils.space?.get?.setData({ id: spaceId }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);
        if (projectId) utils.project?.get?.setData({ id: projectId }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);
        if (teamId) utils.team?.get?.setData({ id: teamId }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);
        if (folderId) utils.folder?.get?.setData({ id: folderId }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);
        if (listId) utils.list?.get?.setData({ id: listId }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);

        try {
            await updateViewMutation.mutateAsync({ id: viewId, name: trimmed });
            if (utils.view?.get) await utils.view.get.invalidate({ id: viewId });
            if (utils.view?.list) await utils.view.list.invalidate();
            if (spaceId && utils.space?.get) void utils.space.get.invalidate({ id: spaceId });
            if (projectId && utils.project?.get) void utils.project.get.invalidate({ id: projectId });
            if (teamId && utils.team?.get) void utils.team.get.invalidate({ id: teamId });
            if (folderId && utils.folder?.get) void utils.folder.get.invalidate({ id: folderId });
            if (listId && utils.list?.get) void utils.list.get.invalidate({ id: listId });
            if (listId && utils.list?.byContext) void utils.list.byContext.invalidate();

            if (typeof refetchViewData === 'function') void refetchViewData();
        } catch (e) {
            setViewNameDraft(oldName);
        }
    };

    const handleToggleAutosave = () => {
        const next = !viewAutosave;
        setViewAutosave(next);
        if (viewId && initialConfig) {
            const raw = (initialConfig ?? {}) as any;
            const calendarView = raw.calendarView || raw.calendar || {};
            void updateViewMutation.mutateAsync({ id: viewId, config: { ...raw, calendarView: { ...calendarView, viewAutosave: next } } });
        }
    };

    const saveViewConfig = async () => {
        if (!viewId) return;
        try {
            const raw = (initialConfig ?? {}) as any;
            const calendarView = raw.calendarView || raw.calendar || {};
            const nextConfig = {
                ...calendarView,
                showEmptyStatuses,
                wrapText,
                showTaskLocations,
                showSubtaskParentNames,
                showTaskProperties,
                showTasksFromOtherLists,
                showSubtasksFromOtherLists,
                defaultToMeMode,
                viewAutosave
            };
            await updateViewMutation.mutateAsync({ id: viewId, config: { ...raw, calendarView: nextConfig } });
            setIsViewDirty(false);
            toast.success("View configuration saved");
            void utils.view.get.invalidate({ id: viewId });
        } catch (e) {
            toast.error("Failed to save view configuration");
        }
    };

    const revertViewChanges = () => {
        if (!initialConfig) return;
        const cfg = (initialConfig as any).calendarView || (initialConfig as any).calendar || {};
        if (typeof cfg.showEmptyStatuses === "boolean") setShowEmptyStatuses(cfg.showEmptyStatuses);
        if (typeof cfg.wrapText === "boolean") setWrapText(cfg.wrapText);
        if (typeof cfg.showTaskLocations === "boolean") setShowTaskLocations(cfg.showTaskLocations);
        if (typeof cfg.showSubtaskParentNames === "boolean") setShowSubtaskParentNames(cfg.showSubtaskParentNames);
        if (typeof cfg.showTaskProperties === "boolean") setShowTaskProperties(cfg.showTaskProperties);
        if (typeof cfg.showTasksFromOtherLists === "boolean") setShowTasksFromOtherLists(cfg.showTasksFromOtherLists);
        if (typeof cfg.showSubtasksFromOtherLists === "boolean") setShowSubtasksFromOtherLists(cfg.showSubtasksFromOtherLists);
        if (typeof cfg.defaultToMeMode === "boolean") setDefaultToMeMode(cfg.defaultToMeMode);
        setIsViewDirty(false);
        toast.info("Reverted view to initial state");
    };

    const saveAsNewView = async () => {
        if (!listId) return;
        try {
            const raw = (initialConfig ?? {}) as any;
            const calendarView = raw.calendarView || raw.calendar || {};
            const nextConfig = {
                ...calendarView,
                showEmptyStatuses,
                wrapText,
                showTaskLocations,
                showSubtaskParentNames,
                showTaskProperties,
                showTasksFromOtherLists,
                showSubtasksFromOtherLists,
                defaultToMeMode,
                viewAutosave
            };
            await createViewMutation.mutateAsync({
                name: (viewNameDraft || "Calendar") + " (Copy)",
                listId,
                type: "CALENDAR",
                config: { ...raw, calendarView: nextConfig }
            } as any);
            setIsViewDirty(false);
            toast.success("Saved as new view");
        } catch (e) {
            toast.error("Failed to save as new view");
        }
    };

    const handleConfigChange = (updater: () => void) => {
        updater();
        if (!viewAutosave) {
            setIsViewDirty(true);
        }
    };

    // Auto-save effect when dependencies change
    useEffect(() => {
        if (!initialConfig || !viewId) return;
        const cfg = (initialConfig as any).calendarView || (initialConfig as any).calendar || {};
        const isCurrentlyDirty = (
            showEmptyStatuses !== !!cfg.showEmptyStatuses ||
            wrapText !== !!cfg.wrapText ||
            showTaskLocations !== !!cfg.showTaskLocations ||
            showSubtaskParentNames !== !!cfg.showSubtaskParentNames ||
            showTaskProperties !== (cfg.showTaskProperties !== false) ||
            showTasksFromOtherLists !== !!cfg.showTasksFromOtherLists ||
            showSubtasksFromOtherLists !== !!cfg.showSubtasksFromOtherLists ||
            defaultToMeMode !== !!cfg.defaultToMeMode
        );

        if (isCurrentlyDirty) {
            if (viewAutosave) {
                const timeoutId = setTimeout(() => saveViewConfig(), 1000);
                return () => clearTimeout(timeoutId);
            } else {
                setIsViewDirty(true);
            }
        } else {
            setIsViewDirty(false);
        }
    }, [
        showEmptyStatuses, wrapText, showTaskLocations, showSubtaskParentNames,
        showTaskProperties, showTasksFromOtherLists, showSubtasksFromOtherLists, defaultToMeMode,
        initialConfig, viewId, viewAutosave
    ]);

    const [filterGroups, setFilterGroups] = useState<FilterGroup>({
        id: "root",
        operator: "AND",
        conditions: [],
    });

    const appliedFilterCount = useMemo(() => {
        if (filterGroups.conditions.length === 0) return 0;
        return filterGroups.conditions.filter(c => {
            if ("conditions" in c) return hasAnyValueInGroup(c as FilterGroup);
            return hasFilterValue(c as FilterCondition);
        }).length;
    }, [filterGroups]);

    const tasks = useMemo(() => rawTasks as any[], [rawTasks]);

    const usedCustomFieldIds = useMemo(() => collectUsedCustomFieldIds(tasks), [tasks]);

    // Merge standard fields with custom fields (matching ListView/TableView pattern)
    const FIELD_CONFIG = useMemo(() => {
        const standardFields = STANDARD_FIELD_CONFIG.map(f => ({ ...f, isCustom: false }));
        const customFieldsConfig = (customFields as any[])
            .filter((cf: any) => usedCustomFieldIds.has(cf.id))
            .map((cf: any) => ({
                id: cf.id,
                label: cf.name,
                icon: null,
                isCustom: true,
                customField: cf,
            }));
        return [...standardFields, ...customFieldsConfig];
    }, [customFields, usedCustomFieldIds]);

    // Filtering logic
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            if (!showClosed && task.status?.type === 'CLOSED') return false;
            if (filterAssignee.length > 0) {
                if (filterAssignee.includes("__unassigned__")) {
                    if ((task.assignees?.length ?? 0) > 0) return false;
                } else {
                    const taskAssigneeIds = (task.assignees ?? []).map((a: any) => a.user?.id || a.agent?.id || a.team?.id);
                    if (!taskAssigneeIds.some((id: string) => filterAssignee.includes(id))) {
                        return false;
                    }
                }
            }
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchName = task.title?.toLowerCase().includes(query) || task.name?.toLowerCase().includes(query);
                if (!matchName) return false;
            }
            return evaluateGroup(task, filterGroups);
        });
    }, [tasks, filterGroups, showClosed, searchQuery, filterAssignee]);

    const tasksByDate = useMemo(() => {
        const map = new Map<string, any[]>();
        filteredTasks.forEach(task => {
            const start = task.startDate ? new Date(task.startDate) : (task.dueDate ? new Date(task.dueDate) : null);
            const end = task.dueDate ? new Date(task.dueDate) : (task.startDate ? new Date(task.startDate) : null);

            if (start && end) {
                // Ensure start <= end
                const s = start <= end ? start : end;
                const e = start <= end ? end : start;

                // Limit range to avoid excessive loops if data is bad, but generally:
                try {
                    const days = eachDayOfInterval({ start: s, end: e });
                    days.forEach(day => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        if (!map.has(dateKey)) map.set(dateKey, []);
                        // Avoid duplicates if logic runs multiple times or data is weird
                        if (!map.get(dateKey)!.find((t: any) => t.id === task.id)) {
                            map.get(dateKey)!.push(task);
                        }
                    });
                } catch (err) {
                    // Fallback for invalid intervals
                    if (task.dueDate) {
                        const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
                        if (!map.has(dateKey)) map.set(dateKey, []);
                        map.get(dateKey)!.push(task);
                    }
                }
            } else if (task.dueDate) {
                const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
                if (!map.has(dateKey)) map.set(dateKey, []);
                map.get(dateKey)!.push(task);
            }
        });
        return map;
    }, [filteredTasks]);

    const timedTasksByDateHour = useMemo(() => {
        const map = new Map<string, Map<number, any[]>>();
        filteredTasks.forEach(task => {
            const startD = task.startDate ? new Date(task.startDate) : (task.dueDate ? new Date(task.dueDate) : null);
            if (!startD) return;

            // Exclude "all day" tasks from the time grid
            if (task.noStartTime && task.noEndTime) return;

            const dateKey = format(startD, 'yyyy-MM-dd');
            const hour = startD.getHours();
            const min = startD.getMinutes();

            if (!map.has(dateKey)) map.set(dateKey, new Map());
            const hourMap = map.get(dateKey)!;
            if (!hourMap.has(hour)) hourMap.set(hour, []);
            if (!hourMap.get(hour)!.find((t: any) => t.id === task.id)) {
                hourMap.get(hour)!.push(task);
            }
        });
        return map;
    }, [filteredTasks]);

    // Precalculate true column placements for time-positioned tasks to handle overlapping groups accurately
    const timedTaskLayoutsByDate = useMemo(() => {
        const layouts = new Map<string, Map<string, { col: number; totalCols: number }>>();

        filteredTasks.forEach(task => {
            const startD = task.startDate ? new Date(task.startDate) : (task.dueDate ? new Date(task.dueDate) : null);
            if (!startD) return;
            const dateKey = format(startD, 'yyyy-MM-dd');
            if (!layouts.has(dateKey)) {
                layouts.set(dateKey, new Map());
            }
        });

        layouts.forEach((map, dateKey) => {
            const dayTasks = filteredTasks.filter(t => {
                const s = t.startDate ? new Date(t.startDate) : (t.dueDate ? new Date(t.dueDate) : null);
                if (!s) return false;

                // Exclude "all day" tasks from the time grid layout calculation
                if (t.noStartTime && t.noEndTime) return false;

                return format(s, 'yyyy-MM-dd') === dateKey;
            });

            const intervals = dayTasks.map(t => {
                const s = t.startDate ? new Date(t.startDate).getTime() : new Date(t.dueDate!).getTime();
                const e = t.dueDate ? new Date(t.dueDate).getTime() : s + 60 * 60 * 1000;
                return { task: t, start: s, end: Math.max(s + 30 * 60000, e) };
            });

            intervals.sort((a, b) => a.start - b.start || b.end - a.end);

            const clusters: typeof intervals[] = [];
            let currentCluster: typeof intervals = [];
            let clusterEnd = 0;

            intervals.forEach(interval => {
                if (currentCluster.length === 0) {
                    currentCluster.push(interval);
                    clusterEnd = interval.end;
                } else if (interval.start < clusterEnd) {
                    currentCluster.push(interval);
                    clusterEnd = Math.max(clusterEnd, interval.end);
                } else {
                    clusters.push(currentCluster);
                    currentCluster = [interval];
                    clusterEnd = interval.end;
                }
            });
            if (currentCluster.length > 0) {
                clusters.push(currentCluster);
            }

            clusters.forEach(cluster => {
                const columns: typeof intervals[] = [];
                cluster.forEach(interval => {
                    let placed = false;
                    for (let i = 0; i < columns.length; i++) {
                        const col = columns[i];
                        const lastInCol = col[col.length - 1];
                        if (interval.start >= lastInCol.end) {
                            col.push(interval);
                            placed = true;
                            map.set(interval.task.id, { col: i, totalCols: 0 });
                            break;
                        }
                    }
                    if (!placed) {
                        columns.push([interval]);
                        map.set(interval.task.id, { col: columns.length - 1, totalCols: 0 });
                    }
                });

                cluster.forEach(interval => {
                    const layout = map.get(interval.task.id);
                    if (layout) {
                        layout.totalCols = columns.length;
                    }
                });
            });
        });

        return layouts;
    }, [filteredTasks]);

    const unscheduledTasks = useMemo(() => {
        return tasks.filter(t => !t.dueDate && t.status?.type !== 'CLOSED');
    }, [tasks]);

    const overdueTasks = useMemo(() => {
        const now = new Date();
        return filteredTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status?.type !== 'CLOSED');
    }, [filteredTasks]);

    const sidebarTasks = rightSidebarTab === "unscheduled" ? unscheduledTasks : overdueTasks;
    const sortedSidebarTasks = useMemo(() => {
        let filtered = sidebarTasks;
        if (rightSidebarSearchText.trim()) {
            const lowerQuery = rightSidebarSearchText.toLowerCase();
            filtered = filtered.filter(t => (t.title || t.name || "").toLowerCase().includes(lowerQuery));
        }

        const sorted = [...filtered];
        sorted.sort((a, b) => {
            let valA: string | number = 0, valB: string | number = 0;
            if (rightSidebarSortBy === "name") {
                valA = a.title || a.name || ""; valB = b.title || b.name || "";
            } else if (rightSidebarSortBy === "duedate") {
                valA = a.dueDate ? new Date(a.dueDate).getTime() : 0; valB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
            } else if (rightSidebarSortBy === "status") {
                valA = a.status?.name || ""; valB = b.status?.name || "";
            } else if (rightSidebarSortBy === "priority") {
                const levels = { URGENT: 4, HIGH: 3, NORMAL: 2, LOW: 1 };
                valA = levels[a.priority as keyof typeof levels] || 0; valB = levels[b.priority as keyof typeof levels] || 0;
            } else if (rightSidebarSortBy === "assignees") {
                valA = a.assignees?.[0]?.name || ""; valB = b.assignees?.[0]?.name || "";
            } else if (rightSidebarSortBy === "listname") {
                valA = a.list?.name || ""; valB = b.list?.name || "";
            }
            if (valA < valB) return rightSidebarSortDesc ? 1 : -1;
            if (valA > valB) return rightSidebarSortDesc ? -1 : 1;
            return 0;
        });
        return sorted;
    }, [sidebarTasks, rightSidebarSortBy, rightSidebarSortDesc]);

    // Calendar generation
    const calendarDays = useMemo(() => {
        if (viewMode === "month") {
            const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
            const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
            return eachDayOfInterval({ start, end });
        } else if (viewMode === "week") {
            const start = startOfWeek(currentDate, { weekStartsOn: 0 });
            const end = endOfWeek(currentDate, { weekStartsOn: 0 });
            return eachDayOfInterval({ start, end });
        } else if (viewMode === "4days") {
            return eachDayOfInterval({ start: currentDate, end: addDays(currentDate, 3) });
        }
        return [currentDate];
    }, [currentDate, viewMode]);

    const navigate = (direction: number) => {
        if (viewMode === "month") {
            setCurrentDate(addDays(currentDate, direction * 30));
        } else if (viewMode === "week") {
            setCurrentDate(addDays(currentDate, direction * 7));
        } else if (viewMode === "4days") {
            setCurrentDate(addDays(currentDate, direction * 4));
        } else {
            setCurrentDate(addDays(currentDate, direction));
        }
    };

    const [savedFiltersPanelOpen, setSavedFiltersPanelOpen] = useState(false);
    const [savedFilterName, setSavedFilterName] = useState("");
    const [savedFiltersSearch, setSavedFiltersSearch] = useState("");
    const [savedFilters, setSavedFilters] = useState<{ id: string, name: string, config: FilterGroup }[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('agentflox_saved_filters');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });
    const [filterSearch, setFilterSearch] = useState("");
    const [assigneesSearch, setAssigneesSearch] = useState("");

    const allAvailableStatuses = useMemo(() => {
        if (currentList && currentList.statuses) return currentList.statuses;
        const set = new Map();
        tasks.forEach(t => t.status && set.set(t.status.id, t.status));
        return Array.from(set.values());
    }, [currentList, tasks]);

    const groupedStatuses = useMemo(() => {
        const groups: Record<string, any[]> = {
            'Not started': [],
            'Active': [],
            'Closed': []
        };
        allAvailableStatuses.forEach(s => {
            const type = (s.type || '').toUpperCase();
            if (type === 'TODO' || type === 'NOT_STARTED' || type === 'UNSTARTED' || type === 'OPEN') groups['Not started'].push(s);
            else if (type === 'DONE' || type === 'CLOSED' || type === 'COMPLETE') groups['Closed'].push(s);
            else groups['Active'].push(s);
        });
        return groups;
    }, [allAvailableStatuses]);

    const allAvailableTags = useMemo(() => {
        const set = new Set<string>();
        tasks.forEach(t => t.tags?.forEach(tag => set.add(tag)));
        return Array.from(set);
    }, [tasks]);

    const workspaceStatuses = useMemo(() => {
        const set = new Map();
        tasks.forEach(t => t.status && set.set(t.status.id, t.status));
        return Array.from(set.values());
    }, [tasks]);

    const getPriorityStyles = (p: string) => {
        if (p === "URGENT") return { badge: "text-red-700 bg-red-50 border-red-200", icon: "text-red-600" };
        if (p === "HIGH") return { badge: "text-orange-700 bg-orange-50 border-orange-200", icon: "text-orange-600" };
        if (p === "NORMAL") return { badge: "text-blue-700 bg-blue-50 border-blue-200", icon: "text-blue-600" };
        if (p === "LOW") return { badge: "text-slate-600 bg-slate-100 border-slate-200", icon: "text-slate-500" };
        return { badge: "text-slate-600 bg-slate-50 border-slate-200", icon: "text-slate-400" };
    };


    const addFilterCondition = (groupId: string = "root") => {
        // Start with an empty field so the UI shows "Select filter" like ClickUp
        const newCond: FilterCondition = {
            id: Math.random().toString(36).substring(7),
            field: "",
            operator: "is",
            value: [],
        };
        const update = (group: FilterGroup): FilterGroup => {
            if (group.id === groupId) return { ...group, conditions: [...group.conditions, newCond] };
            return { ...group, conditions: group.conditions.map(c => "conditions" in c ? update(c as FilterGroup) : c) };
        };
        setFilterGroups(update(filterGroups));
    };

    const addFilterGroup = (parentId: string = "root") => {
        const newGroup: FilterGroup = {
            id: Math.random().toString(36).substring(7),
            operator: "AND",
            conditions: [{
                id: Math.random().toString(36).substring(7),
                field: "",
                operator: "is",
                value: [],
            }],
        };
        const update = (group: FilterGroup): FilterGroup => {
            if (group.id === parentId) return { ...group, conditions: [...group.conditions, newGroup] };
            return { ...group, conditions: group.conditions.map(c => "conditions" in c ? update(c as FilterGroup) : c) };
        };
        setFilterGroups(update(filterGroups));
    };

    const removeFilterItem = (id: string) => {
        if (id === "root") {
            setFilterGroups({ ...filterGroups, conditions: [] });
            return;
        }
        const update = (group: FilterGroup): FilterGroup => {
            return {
                ...group,
                conditions: group.conditions
                    .filter(c => c.id !== id)
                    .map(c => "conditions" in c ? update(c as FilterGroup) : c)
            };
        };
        setFilterGroups(update(filterGroups));
    };

    const updateFilterCondition = (id: string, updates: Partial<FilterCondition>) => {
        const update = (group: FilterGroup): FilterGroup => {
            return {
                ...group,
                conditions: group.conditions.map(c => {
                    if (c.id === id) return { ...c, ...updates } as FilterCondition;
                    return "conditions" in c ? update(c as FilterGroup) : c;
                })
            };
        };
        const updatedGroups = update(filterGroups);

        // Only clean up empty filters if:
        // 1. The update includes a value change (not just field/operator)
        // 2. AND the updated condition now has a value set
        const isValueUpdate = "value" in updates;
        let shouldCleanup = false;

        if (isValueUpdate) {
            // Find the updated condition and check if it now has a value
            const findCondition = (group: FilterGroup): FilterCondition | null => {
                for (const c of group.conditions) {
                    if (c.id === id && !("conditions" in c)) {
                        return c as FilterCondition;
                    }
                    if ("conditions" in c) {
                        const found = findCondition(c as FilterGroup);
                        if (found) return found;
                    }
                }
                return null;
            };

            const updatedCondition = findCondition(updatedGroups);
            if (updatedCondition && hasFilterValue(updatedCondition)) {
                // Check if any filter in any group has a value
                shouldCleanup = hasAnyValueInGroup(updatedGroups);
            }
        }

        // If any filter has a value, remove all filter items without values
        if (shouldCleanup) {
            const removeEmptyFilters = (group: FilterGroup): FilterGroup => {
                const filteredConditions = group.conditions
                    .filter(c => {
                        if ("conditions" in c) {
                            // For nested groups, recursively clean them first
                            const cleanedGroup = removeEmptyFilters(c as FilterGroup);
                            // Keep the group if it has any conditions left
                            return cleanedGroup.conditions.length > 0;
                        }
                        const cond = c as FilterCondition;
                        // Keep conditions that have a field set AND have values
                        return cond.field && cond.field.trim().length > 0 && hasFilterValue(cond);
                    })
                    .map(c => {
                        if ("conditions" in c) {
                            return removeEmptyFilters(c as FilterGroup);
                        }
                        return c;
                    });

                return {
                    ...group,
                    conditions: filteredConditions
                };
            };

            const cleanedGroups = removeEmptyFilters(updatedGroups);
            setFilterGroups(cleanedGroups);
        } else {
            setFilterGroups(updatedGroups);
        }
    };

    const updateFilterGroupOperator = (id: string, operator: FilterOperator) => {
        const update = (group: FilterGroup): FilterGroup => {
            if (group.id === id) return { ...group, operator };
            return { ...group, conditions: group.conditions.map(c => "conditions" in c ? update(c as FilterGroup) : c) };
        };
        setFilterGroups(update(filterGroups));
    };

    const saveNewFilter = useCallback(async () => {
        if (!savedFilterName.trim()) return;
        const newFilter = {
            id: Math.random().toString(36).substring(7),
            name: savedFilterName.trim(),
            config: JSON.parse(JSON.stringify(filterGroups))
        };
        setSavedFilters(prev => {
            const next = [...prev, newFilter];
            if (typeof window !== "undefined") {
                localStorage.setItem("agentflox_saved_filters", JSON.stringify(next));
            }
            return next;
        });
        setSavedFilterName("");
    }, [savedFilterName, filterGroups, viewId]);

    const deleteSavedFilter = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSavedFilters(prev => {
            const next = prev.filter(f => f.id !== id);
            if (typeof window !== "undefined") {
                localStorage.setItem("agentflox_saved_filters", JSON.stringify(next));
            }
            return next;
        });
    }, [viewId]);

    const applySavedFilter = (config: FilterGroup) => {
        setFilterGroups(config);
        setSavedFiltersPanelOpen(false);
    };

    const renderFilterContent = (props?: { onClose?: () => void }) => {
        return (
            <div className="flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-zinc-50/50">
                    <div>
                        <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-base">
                            Filters
                            <Info className="h-4 w-4 text-zinc-400" />
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <Popover open={savedFiltersPanelOpen} onOpenChange={setSavedFiltersPanelOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs font-bold gap-1.5 border-zinc-200 shadow-none hover:bg-white"
                                >
                                    Saved filters
                                    <ChevronDown className={cn("h-3 w-3 transition-transform", savedFiltersPanelOpen && "rotate-180")} />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-80 p-0 overflow-hidden shadow-2xl">
                                <div className="p-3 border-b border-zinc-100 bg-zinc-50/50">
                                    <div className="flex items-center h-8 rounded-md border border-zinc-200 bg-white px-2">
                                        <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                        <Input
                                            variant="ghost"
                                            placeholder="Search..."
                                            className="h-full px-2 text-xs border-0 bg-transparent shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0"
                                            value={savedFiltersSearch}
                                            onChange={e => setSavedFiltersSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="max-h-[300px] overflow-auto">
                                    {savedFilters.length === 0 ? (
                                        <div className="p-8 text-center bg-white">
                                            <p className="text-xs text-zinc-400">No saved filters yet</p>
                                        </div>
                                    ) : (
                                        <div className="p-1 space-y-0.5 bg-white">
                                            <p className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Workspace</p>
                                            {savedFilters
                                                .filter(f => !savedFiltersSearch || f.name.toLowerCase().includes(savedFiltersSearch.toLowerCase()))
                                                .map(f => (
                                                    <div
                                                        key={f.id}
                                                        className="group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-50 cursor-pointer transition-colors"
                                                        onClick={() => applySavedFilter(f.config)}
                                                    >
                                                        <span className="text-xs font-medium text-zinc-700">{f.name}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-200"
                                                            onClick={(e) => deleteSavedFilter(f.id, e)}
                                                        >
                                                            <Trash2 className="h-3 w-3 text-zinc-400" />
                                                        </Button>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 border-t border-zinc-100 bg-zinc-50/30">
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Name..."
                                            className="h-8 text-xs flex-1"
                                            value={savedFilterName}
                                            onChange={e => setSavedFilterName(e.target.value)}
                                        />
                                        <Button
                                            className="h-8 text-xs font-bold bg-zinc-900 hover:bg-black text-white px-3"
                                            onClick={saveNewFilter}
                                            disabled={!savedFilterName.trim()}
                                        >
                                            Save new filter
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-zinc-100" onClick={() => props?.onClose ? props.onClose() : setFiltersPanelOpen(false)}><X className="h-4 w-4" /></Button>
                    </div>
                </div>

                {filterGroups.conditions.length === 0 ? (
                    <div className="p-6 h-[88px]">
                        <Button
                            className="h-9 px-3 text-sm font-bold bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl shadow-sm cursor-pointer"
                            onClick={() => addFilterGroup()}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add filter
                        </Button>
                    </div>
                ) : (
                    <ScrollArea className="p-5 text-sm h-[350px]">
                        <div className="space-y-4">
                            <div className="space-y-4">
                                {/* Render each top-level group */}
                                {(() => {
                                    const hasAnyValueAtRoot = filterGroups.conditions.some(c => {
                                        if ("conditions" in c) {
                                            return hasAnyValueInGroup(c as FilterGroup);
                                        }
                                        return hasFilterValue(c as FilterCondition);
                                    });

                                    // If any group has a value, only show groups with values
                                    // BUT always show ALL empty groups at the end to allow adding multiple filters
                                    const visibleGroups = hasAnyValueAtRoot
                                        ? (() => {
                                            const groupsWithValues = filterGroups.conditions.filter(c => {
                                                if ("conditions" in c) {
                                                    return hasAnyValueInGroup(c as FilterGroup);
                                                }
                                                return hasFilterValue(c as FilterCondition);
                                            });
                                            // Include ALL empty groups at the end (not just the last one)
                                            const emptyGroups = filterGroups.conditions.filter(c => {
                                                if ("conditions" in c) {
                                                    return !hasAnyValueInGroup(c as FilterGroup);
                                                }
                                                return !hasFilterValue(c as FilterCondition);
                                            });
                                            // Return groups with values first, then all empty groups
                                            return [...groupsWithValues, ...emptyGroups];
                                        })()
                                        : filterGroups.conditions;

                                    return visibleGroups.map((groupItem, visibleGroupIdx) => {
                                        const isGroup = "conditions" in groupItem;
                                        if (!isGroup) {
                                            // This shouldn't happen at root level, but handle it gracefully
                                            return null;
                                        }
                                        const group = groupItem as FilterGroup;

                                        // Find the original index in the full conditions array for "where" label logic
                                        const originalIdx = filterGroups.conditions.findIndex(c => c.id === group.id);
                                        const isFirstWithValue = hasAnyValueAtRoot && visibleGroupIdx === 0;
                                        const shouldShowWhere = !hasAnyValueAtRoot ? (originalIdx === 0) : isFirstWithValue;
                                        const shouldShowOperator = visibleGroups.length > 1 && visibleGroupIdx === 1;

                                        return (
                                            <div key={group.id} className="flex gap-3 items-start">
                                                {/* Operator selector for inter-group logic - only show when multiple groups */}
                                                {visibleGroups.length > 1 && (
                                                    <div className="w-[60px] flex justify-end items-center shrink-0">
                                                        {shouldShowWhere ? (
                                                            <span className="text-[10px] font-bold text-zinc-400/80 pr-3 uppercase tracking-wider">Where</span>
                                                        ) : shouldShowOperator ? (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 w-[50px] text-xs font-black uppercase tracking-widest bg-white border-zinc-200 rounded-sm shadow-sm hover:border-zinc-300 cursor-pointer mr-2 pl-2 pr-1"
                                                                onClick={() => updateFilterGroupOperator("root", filterGroups.operator === "AND" ? "OR" : "AND")}
                                                            >
                                                                {filterGroups.operator}
                                                                <ChevronDown className="h-3 w-3 ml-0 opacity-40 shrink-0" />
                                                            </Button>
                                                        ) : (
                                                            <div className="pr-3 flex items-center h-8">
                                                                <span className="text-xs font-black uppercase tracking-widest text-zinc-300">{filterGroups.operator}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Group block */}
                                                <div className="flex-1 p-5 bg-zinc-50/50 rounded-2xl border border-zinc-100/80 space-y-4">
                                                    {/* Render conditions within this group */}
                                                    {(() => {
                                                        const hasAnyValue = hasAnyValueInGroup(group);
                                                        // If any condition has a value, only show conditions with values
                                                        // BUT always show ALL empty conditions at the end to allow adding multiple nested filters
                                                        const visibleConditions = hasAnyValue
                                                            ? (() => {
                                                                const conditionsWithValues = group.conditions.filter(c => {
                                                                    if ("conditions" in c) {
                                                                        return hasAnyValueInGroup(c as FilterGroup);
                                                                    }
                                                                    return hasFilterValue(c as FilterCondition);
                                                                });
                                                                // Include ALL empty conditions at the end (not just the last one)
                                                                const emptyConditions = group.conditions.filter(c => {
                                                                    if ("conditions" in c) {
                                                                        return !hasAnyValueInGroup(c as FilterGroup);
                                                                    }
                                                                    return !hasFilterValue(c as FilterCondition);
                                                                });
                                                                // Return conditions with values first, then all empty conditions
                                                                return [...conditionsWithValues, ...emptyConditions];
                                                            })()
                                                            : group.conditions;

                                                        return visibleConditions.map((item, visibleIdx) => {
                                                            const isNestedGroup = "conditions" in item;
                                                            const cond = !isNestedGroup ? (item as FilterCondition) : null;
                                                            const field = cond ? (FILTER_OPTIONS.find(f => f.id === cond.field) || FIELD_CONFIG.find(f => f.id === cond.field)) : null;
                                                            const availableOps = cond ? (FIELD_OPERATORS[cond.field] || [{ id: "is", label: "Is" }]) : [];

                                                            if (isNestedGroup) {
                                                                // Handle nested groups if needed (for future expansion)
                                                                return null;
                                                            }

                                                            // Find the original index in the full conditions array for "where" label logic
                                                            const originalIdx = group.conditions.findIndex(c => c.id === item.id);
                                                            const isFirstWithValue = hasAnyValue && visibleIdx === 0;
                                                            const shouldShowWhere = !hasAnyValue ? (originalIdx === 0) : isFirstWithValue;
                                                            const shouldShowOperator = visibleConditions.length > 1 && visibleIdx === 1;

                                                            return (
                                                                <div key={item.id} className="flex gap-3 items-start">
                                                                    {/* Label Column for conditions within group - only show when multiple conditions */}
                                                                    {visibleConditions.length > 1 && (
                                                                        <div className="w-[60px] flex justify-end items-center shrink-0">
                                                                            {shouldShowWhere ? (
                                                                                <span className="text-[10px] font-bold text-zinc-400/80 pr-3 uppercase tracking-wider">Where</span>
                                                                            ) : shouldShowOperator ? (
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    className="h-8 w-[50px] text-xs font-black uppercase tracking-widest bg-white border-zinc-200 rounded-sm shadow-sm hover:border-zinc-300 cursor-pointer mr-2 pl-2 pr-1"
                                                                                    onClick={() => updateFilterGroupOperator(group.id, group.operator === "AND" ? "OR" : "AND")}
                                                                                >
                                                                                    {group.operator}
                                                                                    <ChevronDown className="h-3 w-3 ml-0 opacity-40 shrink-0" />
                                                                                </Button>
                                                                            ) : (
                                                                                <span className="text-xs font-black uppercase tracking-widest text-zinc-300 pr-3">{group.operator}</span>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* Filter condition content */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex gap-2 items-center">
                                                                            <DropdownMenu>
                                                                                <DropdownMenuTrigger asChild>
                                                                                    <Button variant="ghost" size="sm" className="h-8 text-xs font-medium gap-2 px-3 hover:bg-zinc-50 shrink-0 justify-between w-[120px] bg-white border border-zinc-200 rounded-sm shadow-sm hover:border-zinc-300 cursor-pointer text-zinc-700 truncate whitespace-nowrap">
                                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                                            {field ? (
                                                                                                <>
                                                                                                    {typeof field.icon === "function" ? <field.icon className="h-3.5 w-3.5 text-zinc-500 shrink-0" /> : <Box className="h-3.5 w-3.5 text-zinc-500 shrink-0" />}
                                                                                                    <span className="truncate">{field.label}</span>
                                                                                                </>
                                                                                            ) : (
                                                                                                <span className="text-zinc-500">Select filter</span>
                                                                                            )}
                                                                                        </div>
                                                                                        <ChevronDown className="h-3 w-3 opacity-30 shrink-0" />
                                                                                    </Button>
                                                                                </DropdownMenuTrigger>
                                                                                <DropdownMenuContent
                                                                                    side="bottom"
                                                                                    align="start"
                                                                                    avoidCollisions={false}
                                                                                    sideOffset={6}
                                                                                    className="w-64 max-h-[400px] overflow-auto p-0"
                                                                                >
                                                                                    <div className="p-2 border-b border-zinc-100 sticky top-0 bg-white z-10">
                                                                                        <Input placeholder="Search fields..." className="h-8 text-xs border-zinc-100" value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
                                                                                    </div>
                                                                                    <div className="p-1">
                                                                                        {FILTER_OPTIONS.filter(f => !filterSearch || f.label.toLowerCase().includes(filterSearch.toLowerCase())).map(f => (
                                                                                            <DropdownMenuItem key={f.id} onClick={() => { updateFilterCondition(cond!.id, { field: f.id as string, operator: (FIELD_OPERATORS[f.id] || [{ id: "is" }])[0].id, value: [] }); setFilterSearch(""); }} className="rounded-lg h-9">
                                                                                                <div className="flex items-center gap-2.5">
                                                                                                    {typeof f.icon === "function" ? <f.icon className="h-4 w-4 text-zinc-400" /> : <Box className="h-4 w-4 text-zinc-400" />}
                                                                                                    <span className="font-medium text-zinc-700">{f.label}</span>
                                                                                                </div>
                                                                                            </DropdownMenuItem>
                                                                                        ))}
                                                                                    </div>
                                                                                </DropdownMenuContent>
                                                                            </DropdownMenu>

                                                                            {field && (
                                                                                <>
                                                                                    <DropdownMenu>
                                                                                        <DropdownMenuTrigger asChild>
                                                                                            <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold px-3 text-zinc-800 hover:bg-zinc-50 shrink-0 w-20 justify-start bg-white border border-zinc-200 rounded-sm shadow-sm hover:border-zinc-300 cursor-pointer">
                                                                                                {availableOps.find(o => o.id === cond!.operator)?.label || cond!.operator}
                                                                                                <ChevronDown className="h-3 w-3 ml-auto opacity-30" />
                                                                                            </Button>
                                                                                        </DropdownMenuTrigger>
                                                                                        <DropdownMenuContent className="w-48 p-1">
                                                                                            {availableOps.map(op => (
                                                                                                <DropdownMenuItem key={op.id} onClick={() => updateFilterCondition(cond!.id, { operator: op.id as any })} className="rounded-lg h-9">
                                                                                                    <span className="font-medium text-zinc-700">{op.label}</span>
                                                                                                </DropdownMenuItem>
                                                                                            ))}
                                                                                        </DropdownMenuContent>
                                                                                    </DropdownMenu>

                                                                                    <div className="flex-1 min-w-0">
                                                                                        {cond!.operator === "is_set" || cond!.operator === "is_not_set" || cond!.operator === "is_archived" || cond!.operator === "is_not_archived" || cond!.operator === "has" || cond!.operator === "doesnt_have" ? null : (
                                                                                            <>
                                                                                                {cond!.field === "status" ? (
                                                                                                    <Popover>
                                                                                                        <PopoverTrigger asChild>
                                                                                                            <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                                {Array.isArray(cond!.value) && cond!.value.length > 0
                                                                                                                    ? `${cond!.value.length} selected`
                                                                                                                    : "Select option"}
                                                                                                            </Button>
                                                                                                        </PopoverTrigger>
                                                                                                        <PopoverContent align="start" className="w-56 p-2">
                                                                                                            <div className="space-y-0.5">
                                                                                                                {allAvailableStatuses.map(s => (
                                                                                                                    <label key={s.id} className="flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                                                                                                        <Checkbox
                                                                                                                            checked={Array.isArray(cond!.value) && cond!.value.includes(s.id)}
                                                                                                                            onCheckedChange={(checked) => {
                                                                                                                                const current = Array.isArray(cond!.value) ? cond!.value : [];
                                                                                                                                const next = checked ? [...current, s.id] : current.filter(id => id !== s.id);
                                                                                                                                updateFilterCondition(cond!.id, { value: next });
                                                                                                                            }}
                                                                                                                        />
                                                                                                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                                                                                                                        <span className="text-xs font-medium text-zinc-700 truncate">{s.name}</span>
                                                                                                                    </label>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                        </PopoverContent>
                                                                                                    </Popover>
                                                                                                ) : cond!.field === "priority" ? (
                                                                                                    <Popover>
                                                                                                        <PopoverTrigger asChild>
                                                                                                            <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                                {Array.isArray(cond!.value) && cond!.value.length > 0
                                                                                                                    ? `${cond!.value.length} selected`
                                                                                                                    : "Select option"}
                                                                                                            </Button>
                                                                                                        </PopoverTrigger>
                                                                                                        <PopoverContent align="start" className="w-48 p-2">
                                                                                                            <div className="space-y-0.5">
                                                                                                                {["URGENT", "HIGH", "NORMAL", "LOW"].map(p => (
                                                                                                                    <label key={p} className="flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                                                                                                        <Checkbox
                                                                                                                            checked={Array.isArray(cond!.value) && cond!.value.includes(p)}
                                                                                                                            onCheckedChange={(checked) => {
                                                                                                                                const current = Array.isArray(cond!.value) ? cond!.value : [];
                                                                                                                                const next = checked ? [...current, p] : current.filter(val => val !== p);
                                                                                                                                updateFilterCondition(cond!.id, { value: next });
                                                                                                                            }}
                                                                                                                        />
                                                                                                                        <Flag className={cn("h-3.5 w-3.5", getPriorityStyles(p).icon)} />
                                                                                                                        <span className="text-xs font-medium text-zinc-700 truncate capitalize">{p.toLowerCase()}</span>
                                                                                                                    </label>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                        </PopoverContent>
                                                                                                    </Popover>
                                                                                                ) : cond!.field === "assignee" || cond!.field === "createdBy" || cond!.field === "follower" ? (
                                                                                                    <Popover>
                                                                                                        <PopoverTrigger asChild>
                                                                                                            <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                                {Array.isArray(cond!.value) && cond!.value.length > 0
                                                                                                                    ? `${cond!.value.length} selected`
                                                                                                                    : "Select option"}
                                                                                                            </Button>
                                                                                                        </PopoverTrigger>
                                                                                                        <PopoverContent align="start" className="w-64 p-2">
                                                                                                            <div className="p-2 border-b border-zinc-100 mb-1">
                                                                                                                <div className="flex items-center h-8 rounded-md border border-zinc-200 bg-white px-2">
                                                                                                                    <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                                                                                                    <Input variant="ghost" placeholder="Search people..." className="h-full px-2 text-[10px] border-0 bg-transparent shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0" value={assigneesSearch} onChange={e => setAssigneesSearch(e.target.value)} />
                                                                                                                </div>
                                                                                                            </div>
                                                                                                            <ScrollArea className="h-[240px]">
                                                                                                                {users.filter(u => !assigneesSearch || u.name?.toLowerCase().includes(assigneesSearch.toLowerCase())).map(u => (
                                                                                                                    <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                                                                                                        <Checkbox
                                                                                                                            checked={Array.isArray(cond!.value) && cond!.value.includes(u.id)}
                                                                                                                            onCheckedChange={(checked) => {
                                                                                                                                const current = Array.isArray(cond!.value) ? cond!.value : [];
                                                                                                                                const next = checked ? [...current, u.id] : current.filter(id => id !== u.id);
                                                                                                                                updateFilterCondition(cond!.id, { value: next });
                                                                                                                            }}
                                                                                                                        />
                                                                                                                        <Avatar className="h-6 w-6">
                                                                                                                            <AvatarImage src={u.image || undefined} />
                                                                                                                            <AvatarFallback className="text-[10px]">{u.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                                                                                        </Avatar>
                                                                                                                        <span className="text-xs font-medium text-zinc-700 truncate">{u.name}</span>
                                                                                                                    </label>
                                                                                                                ))}
                                                                                                            </ScrollArea>
                                                                                                        </PopoverContent>
                                                                                                    </Popover>
                                                                                                ) : cond!.field === "tags" ? (
                                                                                                    <Popover>
                                                                                                        <PopoverTrigger asChild>
                                                                                                            <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                                {Array.isArray(cond!.value) && cond!.value.length > 0
                                                                                                                    ? `${cond!.value.length} tags selected`
                                                                                                                    : "Select option"}
                                                                                                            </Button>
                                                                                                        </PopoverTrigger>
                                                                                                        <PopoverContent align="start" className="w-56 p-2">
                                                                                                            {allAvailableTags.length === 0 ? (
                                                                                                                <p className="text-[10px] text-zinc-500 p-4 text-center">No tags found in this view</p>
                                                                                                            ) : (
                                                                                                                <div className="space-y-0.5">
                                                                                                                    {allAvailableTags.map(tag => {
                                                                                                                        const parsed = parseEncodedTag(tag);
                                                                                                                        return (
                                                                                                                            <label key={tag} className="flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                                                                                                                <Checkbox
                                                                                                                                    checked={Array.isArray(cond!.value) && cond!.value.includes(tag)}
                                                                                                                                    onCheckedChange={(checked) => {
                                                                                                                                        const current = Array.isArray(cond!.value) ? cond!.value : [];
                                                                                                                                        const next = checked ? [...current, tag] : current.filter(t => t !== tag);
                                                                                                                                        updateFilterCondition(cond!.id, { value: next });
                                                                                                                                    }}
                                                                                                                                />
                                                                                                                                <span className="text-[11px] font-bold px-2 py-1 rounded-md" style={{ backgroundColor: parsed.color + '20', color: parsed.color }}>
                                                                                                                                    {parsed.label}
                                                                                                                                </span>
                                                                                                                            </label>
                                                                                                                        );
                                                                                                                    })}
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </PopoverContent>
                                                                                                    </Popover>
                                                                                                ) : cond!.field === "dependency" ? (
                                                                                                    <DropdownMenu>
                                                                                                        <DropdownMenuTrigger asChild>
                                                                                                            <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                                {cond!.value || "Select dependency type"}
                                                                                                            </Button>
                                                                                                        </DropdownMenuTrigger>
                                                                                                        <DropdownMenuContent align="start" className="w-48">
                                                                                                            {["Blocking", "Waiting on", "Link", "Any"].map(v => (
                                                                                                                <DropdownMenuItem key={v} onClick={() => updateFilterCondition(cond!.id, { value: v })} className="text-xs font-medium">
                                                                                                                    {v}
                                                                                                                </DropdownMenuItem>
                                                                                                            ))}
                                                                                                        </DropdownMenuContent>
                                                                                                    </DropdownMenu>
                                                                                                ) : cond!.field === "taskType" ? (
                                                                                                    <Popover>
                                                                                                        <PopoverTrigger asChild>
                                                                                                            <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                                {Array.isArray(cond!.value) && cond!.value.length > 0
                                                                                                                    ? `${cond!.value.length} selected`
                                                                                                                    : "Select type"}
                                                                                                            </Button>
                                                                                                        </PopoverTrigger>
                                                                                                        <PopoverContent align="start" className="w-48 p-2">
                                                                                                            <div className="space-y-0.5">
                                                                                                                {availableTaskTypes?.map((t: any) => (
                                                                                                                    <label key={t.id} className="flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                                                                                                        <Checkbox
                                                                                                                            checked={Array.isArray(cond!.value) && cond!.value.includes(t.id)}
                                                                                                                            onCheckedChange={(checked) => {
                                                                                                                                const current = Array.isArray(cond!.value) ? cond!.value : [];
                                                                                                                                const next = checked ? [...current, t.id] : current.filter(val => val !== t.id);
                                                                                                                                updateFilterCondition(cond!.id, { value: next });
                                                                                                                            }}
                                                                                                                        />
                                                                                                                        <TaskTypeIcon type={t} className="h-3.5 w-3.5" />
                                                                                                                        <span className="text-xs font-medium text-zinc-700 capitalize">{t.name}</span>
                                                                                                                    </label>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                        </PopoverContent>
                                                                                                    </Popover>
                                                                                                ) : ["dueDate", "startDate", "dateDone", "dateCreated", "dateUpdated", "latestStatusChange"].includes(cond!.field) ? (
                                                                                                    <Popover>
                                                                                                        <PopoverTrigger asChild>
                                                                                                            <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                                {(() => {
                                                                                                                    const raw = cond!.value;
                                                                                                                    const ts = typeof raw === "number" && raw > 0 ? raw : null;
                                                                                                                    return ts ? format(new Date(ts), "MMM d, yyyy") : "Select date";
                                                                                                                })()}
                                                                                                            </Button>
                                                                                                        </PopoverTrigger>
                                                                                                        <PopoverContent align="start" className="w-auto p-0">
                                                                                                            <SingleDateCalendar
                                                                                                                selectedDate={(() => {
                                                                                                                    const raw = cond!.value;
                                                                                                                    if (typeof raw !== "number" || raw <= 0) return undefined;
                                                                                                                    return new Date(raw);
                                                                                                                })()}
                                                                                                                onDateChange={(d) => updateFilterCondition(cond!.id, { value: d ? d.getTime() : null })}
                                                                                                            />
                                                                                                        </PopoverContent>
                                                                                                    </Popover>
                                                                                                ) : cond!.field === "location" ? (
                                                                                                    <Popover>
                                                                                                        <PopoverTrigger asChild>
                                                                                                            <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                                {cond!.value ? "Location selected" : "Select location"}
                                                                                                            </Button>
                                                                                                        </PopoverTrigger>
                                                                                                        <PopoverContent align="start" className="w-[300px] p-0">
                                                                                                            <DestinationPicker
                                                                                                                workspaceId={resolvedWorkspaceId as string}
                                                                                                                onSelect={(listId) => updateFilterCondition(cond!.id, { value: listId })}
                                                                                                            />
                                                                                                        </PopoverContent>
                                                                                                    </Popover>
                                                                                                ) : (
                                                                                                    <div className="relative">
                                                                                                        <Input
                                                                                                            className="h-8 text-xs border-zinc-100 bg-white rounded-sm focus-visible:ring-violet-500 pr-8"
                                                                                                            placeholder="Select option"
                                                                                                            value={typeof cond!.value === "string" ? cond!.value : ""}
                                                                                                            onChange={e => updateFilterCondition(cond!.id, { value: e.target.value })}
                                                                                                        />
                                                                                                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-300 pointer-events-none" />
                                                                                                    </div>
                                                                                                )}
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 mt-1 cursor-pointer" onClick={() => {
                                                                        if (group.conditions.length === 1) {
                                                                            // If this is the last condition in the group, remove the entire group
                                                                            removeFilterItem(group.id);
                                                                        } else {
                                                                            // Otherwise, just remove this condition
                                                                            removeFilterItem(item.id);
                                                                        }
                                                                    }}>
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </div>
                                                            );
                                                        });
                                                    })()}

                                                    {/* Add nested filter button within group - hide only for first root-level "Where" condition when displaying first filter item with value */}
                                                    {(() => {
                                                        const hasAnyValue = hasAnyValueInGroup(group);
                                                        // Get visible conditions to check if first one is "Where" with value
                                                        const visibleConditions = hasAnyValue
                                                            ? (() => {
                                                                const conditionsWithValues = group.conditions.filter(c => {
                                                                    if ("conditions" in c) {
                                                                        return hasAnyValueInGroup(c as FilterGroup);
                                                                    }
                                                                    return hasFilterValue(c as FilterCondition);
                                                                });
                                                                const lastCondition = group.conditions[group.conditions.length - 1];
                                                                if (lastCondition && !conditionsWithValues.includes(lastCondition)) {
                                                                    const lastHasValue = "conditions" in lastCondition
                                                                        ? hasAnyValueInGroup(lastCondition as FilterGroup)
                                                                        : hasFilterValue(lastCondition as FilterCondition);
                                                                    if (!lastHasValue) {
                                                                        return [...conditionsWithValues, lastCondition];
                                                                    }
                                                                }
                                                                return conditionsWithValues;
                                                            })()
                                                            : group.conditions;

                                                        // Check if this is the first root-level group
                                                        const isFirstRootGroup = filterGroups.conditions.findIndex(c => c.id === group.id) === 0;

                                                        // Check if first visible condition is the first "Where" condition with value
                                                        const firstVisibleCondition = visibleConditions[0];
                                                        const firstConditionInGroup = group.conditions[0];

                                                        // Hide if:
                                                        // 1. This is the first root-level group
                                                        // 2. We're displaying filters with values (hasAnyValue is true)
                                                        // 3. The first visible condition exists and has a value
                                                        // 4. The first visible condition is the first condition in the original group (the "Where" condition)
                                                        const isFirstWhereWithValue = isFirstRootGroup &&
                                                            hasAnyValue &&
                                                            firstVisibleCondition &&
                                                            !("conditions" in firstVisibleCondition) &&
                                                            hasFilterValue(firstVisibleCondition as FilterCondition) &&
                                                            firstConditionInGroup &&
                                                            firstConditionInGroup.id === firstVisibleCondition.id;

                                                        // Hide only if it's the first root-level "Where" condition with value
                                                        return !isFirstWhereWithValue && (
                                                            <div className="flex items-center justify-between pt-2 group/footer">
                                                                <button
                                                                    className="text-[11px] font-bold text-zinc-400 hover:text-zinc-500 hover:bg-zinc-200 cursor-pointer px-2 py-1 rounded-md"
                                                                    onClick={() => addFilterCondition(group.id)}
                                                                >
                                                                    Add nested filter
                                                                </button>
                                                                {group.conditions.length >= 2 && (
                                                                    <button
                                                                        className="text-[11px] font-bold text-zinc-400 hover:text-zinc-500 hover:bg-zinc-200 transition-colors opacity-0 group-hover/footer:opacity-100 cursor-pointer px-2 py-1 rounded-md"
                                                                        onClick={() => removeFilterItem(group.id)}
                                                                    >
                                                                        Clear group
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}

                            </div>
                        </div>
                    </ScrollArea>
                )}
                {filterGroups.conditions.length > 0 && (
                    <div className="w-full p-4 border-t border-zinc-100 bg-white flex items-center justify-between z-10">
                        <Button
                            variant="outline"
                            className="h-9 px-3 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 border border-zinc-200 rounded-xl cursor-pointer"
                            onClick={() => addFilterGroup()}
                        >
                            <Plus className="h-4 w-4 mr-1.5" />
                            Add filter
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-600 font-medium px-3 hover:bg-red-50 border border-red-200 rounded-xl cursor-pointer"
                            onClick={() => setFilterGroups({
                                id: "root",
                                operator: "AND",
                                conditions: [],
                            })}
                        >
                            Clear all
                        </Button>
                    </div>
                )}
            </div>
        );
    };



    if (isTasksLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-white rounded-xl border border-zinc-200">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-800" />
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Loading Calendar...</span>
                </div>
            </div>
        );
    }

    const renderInlineCreateForm = (isAbsolute: boolean, colIndex?: number, totalCols?: number, isAllDay?: boolean) => {
        if (isAllDay) {
            return (
                <div className="z-[50] bg-white border border-zinc-300 shadow-[0_4px_16px_rgba(0,0,0,0.1)] flex items-center flex-row p-1 cursor-default rounded-none w-full h-[36px] shrink-0" onClick={e => e.stopPropagation()}>
                    <div className="flex-1 w-full min-w-0 h-full flex items-center justify-between gap-2 px-1">
                        <button
                            onClick={() => setInlineCreateState(null)}
                            className="flex items-center justify-center p-1 rounded-md hover:bg-zinc-100 cursor-pointer transition-colors text-zinc-300 hover:text-zinc-500 shrink-0"
                        >
                            <X className="w-3 h-3" />
                        </button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="flex items-center justify-center p-1 rounded-md hover:bg-zinc-100 cursor-pointer transition-colors text-zinc-500 hover:text-zinc-700 shrink-0">
                                    {inlineAddStatusId ? (
                                        <div className="h-3 w-3 rounded-full border-[3px]" style={{ borderColor: currentList?.statuses?.find((s: any) => s.id === inlineAddStatusId)?.color || '#9ca3af' }} />
                                    ) : inlineAddTaskType ? (
                                        <TaskTypeIcon type={inlineAddTaskType} className="h-3.5 w-3.5" />
                                    ) : (
                                        <div className="w-2.5 h-2.5 rounded-[2px] bg-zinc-400" />
                                    )}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-[240px] p-2 bg-white shadow-xl border-zinc-200 z-[200]">
                                <Tabs defaultValue="status">
                                    <TabsList className="grid w-full grid-cols-2 mb-2 bg-zinc-100/50 p-1">
                                        <TabsTrigger value="status" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">Status</TabsTrigger>
                                        <TabsTrigger value="type" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">Type</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="status" className="max-h-[250px] overflow-y-auto mt-0">
                                        <div className="space-y-0.5">
                                            {(currentList?.statuses || workspaceStatuses || []).map((s: any) => (
                                                <button key={s.id} onClick={() => setInlineAddStatusId(s.id)} className={cn("w-full flex items-center px-2 py-1.5 text-xs rounded hover:bg-zinc-100 transition-colors", inlineAddStatusId === s.id && "bg-zinc-100")}>
                                                    <div className="h-2.5 w-2.5 rounded-full mr-2" style={{ backgroundColor: s.color }} />
                                                    <span>{s.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="type" className="max-h-[250px] overflow-y-auto mt-0">
                                        <div className="space-y-0.5">
                                            {availableTaskTypes.map((t: any) => (
                                                <button key={t.id} onClick={() => setInlineAddTaskType(t.id)} className={cn("w-full flex items-center px-2 py-1.5 text-xs rounded hover:bg-zinc-100 transition-colors", inlineAddTaskType === t.id && "bg-zinc-100")}>
                                                    <TaskTypeIcon type={t} className="h-3.5 w-3.5 mr-2" />
                                                    <span>{t.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </PopoverContent>
                        </Popover>

                        <input
                            autoFocus
                            className="flex-1 border-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 shadow-none text-[13px] font-medium bg-transparent placeholder:text-zinc-400 min-w-0"
                            placeholder="Task Name..."
                            value={inlineCreateText}
                            onChange={e => setInlineCreateText(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveInline();
                                else if (e.key === 'Escape') setInlineCreateState(null);
                            }}
                        />

                        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
                            <span className="hidden sm:inline-block text-[10px] text-zinc-400 px-1">ctrl+enter</span>

                            {resolvedWorkspaceId && (
                                <AssigneeSelector
                                    users={users as any}
                                    agents={agents}
                                    workspaceId={resolvedWorkspaceId}
                                    variant="compact"
                                    contentClassName="z-[200]"
                                    value={inlineAddAssigneeIds}
                                    onChange={setInlineAddAssigneeIds}
                                    align="end"
                                    trigger={
                                        <button className={cn("h-6 w-6 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors border border-dashed shrink-0 cursor-pointer", inlineAddAssigneeIds.length > 0 ? "bg-blue-50 border-blue-200" : "bg-transparent border-zinc-200")}>
                                            {inlineAddAssigneeIds.length > 0 ? (
                                                <div className="flex -space-x-1">
                                                    {inlineAddAssigneeIds.slice(0, 1).map(id => {
                                                        const u = users.find(u => u.id === id);
                                                        return <Avatar key={id} className="h-4 w-4 border border-white"><AvatarImage src={u?.image || undefined} /><AvatarFallback className="text-[7px]">{u?.name?.slice(0, 2) || "?"}</AvatarFallback></Avatar>
                                                    })}
                                                </div>
                                            ) : <User className="w-3 h-3 text-zinc-400" />}
                                        </button>
                                    }
                                />
                            )}

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className={cn("p-1 rounded-md hover:bg-zinc-100 cursor-pointer transition-colors shrink-0 outline-none focus:ring-0",
                                        inlineAddPriority === 'URGENT' ? "text-red-500" :
                                            inlineAddPriority === 'HIGH' ? "text-orange-500" :
                                                inlineAddPriority === 'NORMAL' ? "text-blue-500" :
                                                    inlineAddPriority === 'LOW' ? "text-zinc-400" :
                                                        "text-zinc-400"
                                    )}>
                                        <Flag className="w-3.5 h-3.5 fill-current" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-48 z-[200]">
                                    <DropdownMenuLabel className="text-xs">Priority</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => setInlineAddPriority("URGENT")}>
                                        <Flag className="h-3 w-3 mr-2 text-red-600 fill-current" /> Urgent
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setInlineAddPriority("HIGH")}>
                                        <Flag className="h-3 w-3 mr-2 text-orange-600 fill-current" /> High
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setInlineAddPriority("NORMAL")}>
                                        <Flag className="h-3 w-3 mr-2 text-blue-600 fill-current" /> Normal
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setInlineAddPriority("LOW")}>
                                        <Flag className="h-3 w-3 mr-2 text-slate-600 fill-current" /> Low
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setInlineAddPriority(null)}>
                                        <CircleSlash className="h-3 w-3 mr-2 text-slate-500" />Clear
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button
                                className="bg-zinc-700 hover:bg-zinc-800 text-white text-[10px] font-bold h-6 px-2.5 rounded-md shadow-sm shrink-0 transition-colors disabled:opacity-50"
                                onClick={handleSaveInline}
                                disabled={createTask.isPending || !inlineCreateText.trim()}
                            >
                                {createTask.isPending ? "..." : "SAVE"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className={cn(
                "z-[100] bg-white border border-zinc-300 shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col p-2.5 cursor-default overflow-visible rounded-none group/form",
                isAbsolute ? (viewMode === "month" ? "absolute top-full mt-1 h-[95px]" : "absolute top-[0px] h-[95px]") : "relative min-h-[95px] shrink-0 mt-1 mb-1 z-[100] w-full",
                isAbsolute && (viewMode === "week" || viewMode === "4days" || viewMode === "month") ? "w-[340px] sm:w-[420px]" : isAbsolute ? "left-[-1px] right-[0px]" : "",
                isAbsolute && (viewMode === "week" || viewMode === "4days" || viewMode === "month") && colIndex !== undefined && totalCols !== undefined && (colIndex >= totalCols - 2) ? "right-[-1px]" : isAbsolute ? (viewMode === "month" ? "left-[calc(100%_-_32px)]" : "left-[-1px]") : ""
            )} onClick={e => e.stopPropagation()}>
                <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                    {/* Row 1: Status Icon + Input + Assignee */}
                    <div className="flex items-center w-full min-w-0 gap-2 relative">
                        <button
                            onClick={() => setInlineCreateState(null)}
                            className="flex items-center justify-center p-1.5 rounded-md hover:bg-zinc-100 cursor-pointer transition-colors text-zinc-300 hover:text-zinc-500 shrink-0"
                        >
                            <X className="w-3 h-3" />
                        </button>

                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="flex items-center justify-center p-1 rounded-md hover:bg-zinc-100 cursor-pointer transition-colors text-zinc-500 hover:text-zinc-700 shrink-0">
                                    {inlineAddStatusId ? (
                                        <div className="h-3.5 w-3.5 rounded-full border-[3.5px]" style={{ borderColor: currentList?.statuses?.find((s: any) => s.id === inlineAddStatusId)?.color || '#9ca3af' }} />
                                    ) : inlineAddTaskType ? (
                                        <TaskTypeIcon type={inlineAddTaskType} className="h-4 w-4" />
                                    ) : (
                                        <div className="w-3 h-3 rounded-[3px] bg-zinc-400" />
                                    )}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-[240px] p-2 bg-white shadow-xl border-zinc-200 z-[200]">
                                <Tabs defaultValue="status">
                                    <TabsList className="grid w-full grid-cols-2 mb-2 bg-zinc-100/50 p-1">
                                        <TabsTrigger value="status" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">Status</TabsTrigger>
                                        <TabsTrigger value="type" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">Type</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="status" className="max-h-[250px] overflow-y-auto mt-0">
                                        <div className="space-y-0.5">
                                            {(currentList?.statuses || workspaceStatuses || []).map((s: any) => (
                                                <button key={s.id} onClick={() => setInlineAddStatusId(s.id)} className={cn("w-full flex items-center px-2 py-1.5 text-xs rounded hover:bg-zinc-100 transition-colors", inlineAddStatusId === s.id && "bg-zinc-100")}>
                                                    <div className="h-2.5 w-2.5 rounded-full mr-2" style={{ backgroundColor: s.color }} />
                                                    <span>{s.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="type" className="max-h-[250px] overflow-y-auto mt-0">
                                        <div className="space-y-0.5">
                                            {availableTaskTypes.map((t: any) => (
                                                <button key={t.id} onClick={() => setInlineAddTaskType(t.id)} className={cn("w-full flex items-center px-2 py-1.5 text-xs rounded hover:bg-zinc-100 transition-colors", inlineAddTaskType === t.id && "bg-zinc-100")}>
                                                    <TaskTypeIcon type={t} className="h-3.5 w-3.5 mr-2" />
                                                    <span>{t.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </PopoverContent>
                        </Popover>
                        <input
                            autoFocus
                            className="flex-1 border-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 shadow-none text-[14px] font-medium bg-transparent placeholder:text-zinc-400 min-w-0"
                            placeholder="Task Name or type '/' for commands"
                            value={inlineCreateText}
                            onChange={e => setInlineCreateText(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveInline();
                                else if (e.key === 'Escape') setInlineCreateState(null);
                            }}
                        />
                        {resolvedWorkspaceId && (
                            <AssigneeSelector
                                users={users as any}
                                agents={agents}
                                workspaceId={resolvedWorkspaceId}
                                variant="compact"
                                contentClassName="z-[200]"
                                value={inlineAddAssigneeIds}
                                onChange={setInlineAddAssigneeIds}
                                align="end"
                                trigger={
                                    <button className={cn("h-7 w-7 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors border border-dashed shrink-0 cursor-pointer", inlineAddAssigneeIds.length > 0 ? "bg-blue-50 border-blue-200" : "bg-transparent border-zinc-200")}>
                                        {inlineAddAssigneeIds.length > 0 ? (
                                            <div className="flex -space-x-1">
                                                {inlineAddAssigneeIds.slice(0, 1).map(id => {
                                                    const u = users.find(u => u.id === id);
                                                    return <Avatar key={id} className="h-5 w-5 border border-white"><AvatarImage src={u?.image || undefined} /><AvatarFallback className="text-[8px]">{u?.name?.slice(0, 2) || "?"}</AvatarFallback></Avatar>
                                                })}
                                            </div>
                                        ) : <User className="w-3.5 h-3.5 text-zinc-400" />}
                                    </button>
                                }
                            />
                        )}
                    </div>

                    {/* Row 2: Priority + Date + Save */}
                    <div className="flex items-center justify-between w-full mt-1.5 pl-7">
                        <div className="flex items-center gap-3">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className={cn("px-1.5 py-1 rounded-md hover:bg-zinc-100 cursor-pointer transition-colors shrink-0 outline-none focus:ring-0",
                                        inlineAddPriority === 'URGENT' ? "text-red-500" :
                                            inlineAddPriority === 'HIGH' ? "text-orange-500" :
                                                inlineAddPriority === 'NORMAL' ? "text-blue-500" :
                                                    inlineAddPriority === 'LOW' ? "text-zinc-400" :
                                                        "text-zinc-400"
                                    )}>
                                        <Flag className="w-3.5 h-3.5 fill-current" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-48 z-[200]">
                                    <DropdownMenuLabel className="text-xs">Priority</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => setInlineAddPriority("URGENT")}>
                                        <Flag className="h-3 w-3 mr-2 text-red-600 fill-current" /> Urgent
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setInlineAddPriority("HIGH")}>
                                        <Flag className="h-3 w-3 mr-2 text-orange-600 fill-current" /> High
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setInlineAddPriority("NORMAL")}>
                                        <Flag className="h-3 w-3 mr-2 text-blue-600 fill-current" /> Normal
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setInlineAddPriority("LOW")}>
                                        <Flag className="h-3 w-3 mr-2 text-slate-600 fill-current" /> Low
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setInlineAddPriority(null)}>
                                        <CircleSlash className="h-3 w-3 mr-2 text-slate-500" />Clear
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <div className="flex items-center gap-3">
                                        <TooltipProvider>
                                            {/* Start Date Button */}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="relative group/date-btn">
                                                        <button className="flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-zinc-100 transition-colors text-zinc-500 shrink-0 cursor-pointer min-w-0 group/date outline-none focus:ring-0">
                                                            {inlineAddStartDate ? (
                                                                <span className="text-[11.5px] font-medium text-zinc-600">
                                                                    {isTodayFns(inlineAddStartDate) ? `Today, ${format(inlineAddStartDate, 'h:mma').toLowerCase()}` : format(inlineAddStartDate, 'MMM d, h:mma').toLowerCase()}
                                                                </span>
                                                            ) : (
                                                                <div className="flex items-center justify-center p-0.5 rounded text-zinc-400 group-hover/date:text-zinc-600">
                                                                    <div className="relative">
                                                                        <CalendarDays className="w-3.5 h-3.5" />
                                                                        <Play className="w-[6px] h-[6px] absolute top-[5px] left-[4px] fill-current text-zinc-400 group-hover/date:text-zinc-600" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </button>
                                                        {inlineAddStartDate && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setInlineAddStartDate(null); }}
                                                                className="absolute -left-1 -top-1 opacity-0 group-hover/date-btn:opacity-100 transition-opacity bg-white rounded-full z-10"
                                                            >
                                                                <XCircle className="w-3 h-3 text-zinc-400 hover:text-zinc-600 fill-white" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </TooltipTrigger>
                                                {inlineAddStartDate && <TooltipContent className="bg-zinc-800 text-white border-none py-1 px-2.5 text-[12px] font-bold rounded-lg shadow-xl shadow-black/20" sideOffset={5}>{format(inlineAddStartDate, 'MMM d, h:mma')}</TooltipContent>}
                                            </Tooltip>

                                            {/* Due Date Button */}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="relative group/date-btn">
                                                        <button className="flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-zinc-100 transition-colors text-zinc-500 shrink-0 cursor-pointer min-w-0 group/date outline-none focus:ring-0">
                                                            {inlineAddDueDate ? (
                                                                <span className="text-[11.5px] font-medium text-zinc-600">
                                                                    {isTodayFns(inlineAddDueDate) ? `Today, ${format(inlineAddDueDate, 'h:mma').toLowerCase()}` : format(inlineAddDueDate, 'MMM d, h:mma').toLowerCase()}
                                                                </span>
                                                            ) : (
                                                                <div className="flex items-center justify-center p-0.5 rounded text-zinc-400 group-hover/date:text-zinc-600">
                                                                    <CalendarCheck className="w-3.5 h-3.5" />
                                                                </div>
                                                            )}
                                                        </button>
                                                        {inlineAddDueDate && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setInlineAddDueDate(null); }}
                                                                className="absolute -left-1 -top-1 opacity-0 group-hover/date-btn:opacity-100 transition-opacity bg-white rounded-full z-10"
                                                            >
                                                                <XCircle className="w-3 h-3 text-zinc-400 hover:text-zinc-600 fill-white" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </TooltipTrigger>
                                                {inlineAddDueDate && <TooltipContent className="bg-zinc-800 text-white border-none py-1 px-2.5 text-[12px] font-bold rounded-lg shadow-xl shadow-black/20" sideOffset={5}>{format(inlineAddDueDate, 'MMM d, h:mma')}</TooltipContent>}
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="p-0 border-none shadow-2xl bg-white z-[200]" sideOffset={8}>
                                    <TaskCalendar
                                        startDate={inlineAddStartDate ?? undefined}
                                        endDate={inlineAddDueDate ?? undefined}
                                        onStartDateChange={(d) => {
                                            setInlineAddStartDate(d ?? null);
                                        }}
                                        onEndDateChange={(d) => {
                                            setInlineAddDueDate(d ?? null);
                                        }}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <Button
                            className="bg-zinc-700 hover:bg-zinc-800 text-white text-[11px] font-bold h-7 px-3 rounded-md shadow-sm shrink-0 transition-colors disabled:opacity-50"
                            onClick={handleSaveInline}
                            disabled={createTask.isPending || !inlineCreateText.trim()}
                        >
                            {createTask.isPending ? "..." : "SAVE"}
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-white border border-zinc-200 shadow-sm overflow-hidden text-[13px] relative">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 bg-white min-h-[52px] gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs font-medium text-zinc-700 bg-zinc-50 border-zinc-200 hover:bg-zinc-100 cursor-pointer" onClick={() => setCurrentDate(new Date())}>
                        Today
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs font-medium text-zinc-700 bg-zinc-50 border-zinc-200 hover:bg-zinc-100 cursor-pointer capitalize">
                                {viewMode === "4days" ? "4 days" : viewMode}
                                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-44 p-1.5 shadow-lg rounded-xl border-zinc-200">
                            <div className="px-2 pt-1 pb-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Time period</div>
                            {[
                                { id: "day", label: "Day", key: "D" },
                                { id: "4days", label: "4 days", key: "4" },
                                { id: "week", label: "Week", key: "W" },
                                { id: "month", label: "Month", key: "M" },
                            ].map(opt => (
                                <DropdownMenuItem
                                    key={opt.id}
                                    onClick={() => setViewMode(opt.id as any)}
                                    className={cn(
                                        "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[14px] cursor-pointer",
                                        viewMode === opt.id ? "font-semibold text-zinc-900" : "text-zinc-700"
                                    )}
                                >
                                    <span>{opt.label}</span>
                                    <span className="h-5 w-5 flex items-center justify-center rounded bg-zinc-100 text-[11px] font-semibold text-zinc-500 border border-zinc-200">
                                        {opt.key}
                                    </span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex items-center gap-1 ml-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900 cursor-pointer" onClick={() => navigate(-1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900 cursor-pointer" onClick={() => navigate(1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <h2 className="text-sm font-black text-zinc-800 ml-2 tracking-tight">
                        {viewMode === "day" ? format(currentDate, 'EEEE, MMMM d') :
                            (viewMode === "4days" || viewMode === "week" ?
                                (`${format(calendarDays[0], 'MMMM d')} - ${format(calendarDays[calendarDays.length - 1], 'MMMM d')}`)
                                : format(currentDate, 'MMMM yyyy'))}
                    </h2>
                </div>

                <div className="flex items-center gap-2 flex-1 justify-end">
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

                    <Popover open={filtersPanelOpen} onOpenChange={(open) => {
                        setFiltersPanelOpen(open);
                        if (open === false) setSavedFiltersPanelOpen(false);
                        if (open === true) {
                            setAssigneesPanelOpen(false);
                        }
                    }}>
                        <PopoverTrigger asChild>
                            <div className="relative group/filter inline-flex">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={cn(
                                                "h-8 text-xs font-medium pr-7 bg-white hover:bg-zinc-100 shadow-none",
                                                filtersPanelOpen ? "text-violet-700 border-violet-200" : "text-zinc-700 border-zinc-200",
                                                appliedFilterCount > 0 && "border-violet-200 text-violet-700"
                                            )}
                                            onClick={() => { if (!filtersPanelOpen && filterGroups.conditions.length === 0) { addFilterGroup(); } }}
                                        >
                                            <Filter className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline ml-1">
                                                {appliedFilterCount > 0 ? `${appliedFilterCount} Filter${appliedFilterCount !== 1 ? "s" : ""}` : "Filter"}
                                            </span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Filter tasks</TooltipContent>
                                </Tooltip>
                                {(appliedFilterCount > 0 || filtersPanelOpen) && (
                                    <div
                                        className={cn(
                                            "absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-md hover:bg-violet-100 cursor-pointer z-10",
                                            filtersPanelOpen ? "text-violet-700" : "text-zinc-400"
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (appliedFilterCount > 0) {
                                                setFilterGroups({ id: "root", operator: "AND", conditions: [] });
                                            } else {
                                                setFiltersPanelOpen(false);
                                            }
                                        }}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </div>
                                )}
                            </div>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-[600px] max-w-[95vw] p-0 overflow-hidden shadow-2xl rounded-2xl border border-zinc-200/80" sideOffset={8}>
                            {renderFilterContent({ onClose: () => setFiltersPanelOpen(false) })}
                        </PopoverContent>
                    </Popover>

                    <ViewToolbarClosedPopover
                        showCompleted={showClosed}
                        showCompletedSubtasks={showCompletedSubtasks}
                        onShowCompletedChange={setShowClosed}
                        onShowCompletedSubtasksChange={setShowCompletedSubtasks}
                    />

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn("h-8 text-xs font-medium bg-white hover:bg-zinc-100 shadow-none", assigneesPanelOpen ? "text-violet-700 border-violet-200" : "text-zinc-700 border-zinc-200")}
                                onClick={() => { setAssigneesPanelOpen(!assigneesPanelOpen); setFiltersPanelOpen(false); }}
                            >
                                <Users className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline ml-1">Assignee</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Filter by assignee</TooltipContent>
                    </Tooltip>

                    <div ref={toolbarSearchContainerRef} className="hidden sm:block">
                        {isToolbarSearchOpen ? (
                            <div className="w-56 min-w-[12rem]">
                                <div className="flex items-center h-8 rounded-lg border border-zinc-200 bg-zinc-50/50 px-2">
                                    <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                                    <Input
                                        ref={toolbarSearchInputRef}
                                        variant="ghost"
                                        className="h-full px-2 text-sm border-0 bg-transparent shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0"
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Escape") {
                                                setIsToolbarSearchOpen(false);
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-zinc-700 bg-white hover:bg-zinc-100 border-zinc-200 shadow-none"
                                        onClick={() => setIsToolbarSearchOpen(true)}
                                        title="Search"
                                    >
                                        <Search className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Search tasks</TooltipContent>
                            </Tooltip>
                        )}
                    </div>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-100 border-zinc-200 shadow-none"
                                onClick={() => setCustomizePanelOpen(true)}
                            >
                                <Settings className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline ml-1">Customize</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Customize view</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                className="h-8 gap-1.5 px-3 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white border-0 shadow-sm"
                                onClick={() => setIsCreateModalOpen(true)}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Add Task</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Add new task</TooltipContent>
                    </Tooltip>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Calendar Grid */}
                <div className="flex-1 flex flex-col min-w-0 bg-white">
                    {viewMode !== "month" ? (
                        <div className="flex-1 overflow-auto bg-white flex flex-col relative">
                            {/* Sticky Header Group */}
                            <div className="sticky top-0 z-40 flex flex-col bg-white shadow-sm border-b border-zinc-200">
                                {/* Days Header */}
                                {viewMode !== "day" && (
                                    <div className="flex border-b border-zinc-200 shrink-0 bg-white">
                                        <div className="w-16 border-r border-zinc-200 shrink-0" />
                                        <div className="flex-1 flex" style={{ paddingRight: viewMode === '4days' ? '40px' : viewMode === 'week' ? '20px' : '0px' }}>
                                            {calendarDays.map((day, i) => {
                                                const dateKey = format(day, 'yyyy-MM-dd');
                                                const isInlineAllDay = inlineCreateState?.dayKey === dateKey && inlineCreateState?.hour === -1;
                                                return (
                                                    <div key={i} className="group/dayheader relative flex-1 border-r border-zinc-200 last:border-r-0 px-4 py-2 flex flex-col justify-center bg-white hover:bg-zinc-50/50 transition-colors">
                                                        <span className="text-[12px] font-bold text-zinc-700">{format(day, 'EEEE')}</span>
                                                        <span className={cn("text-[11px] font-medium block mt-0.5", isTodayFns(day) ? "text-red-500" : "text-zinc-500")}>
                                                            {format(day, 'd MMM')}
                                                        </span>

                                                        {!isInlineAllDay && (
                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/dayheader:opacity-100 transition-opacity z-[45]">
                                                                <TooltipProvider>
                                                                    <Tooltip delayDuration={0}>
                                                                        <TooltipTrigger asChild>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setInlineCreateState({ dayKey: dateKey, hour: -1, half: 0 });
                                                                                    setInlineCreateText("");
                                                                                    setInlineAddTags([]);
                                                                                    setInlineAddAssigneeIds([]);
                                                                                    setInlineAddPriority(null);
                                                                                    setInlineAddDueDate(null);
                                                                                    setInlineAddStartDate(null);
                                                                                    setInlineNoStartTime(true);
                                                                                    setInlineNoEndTime(true);
                                                                                }}
                                                                                className="flex items-center justify-center text-zinc-500 hover:text-zinc-900 w-6 h-6 rounded cursor-pointer hover:bg-zinc-100/80 transition-colors"
                                                                            >
                                                                                <Plus className="h-4 w-4" />
                                                                            </button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="bg-zinc-900 text-white border-0 text-xs font-bold py-1 px-2.5 rounded-lg shadow-xl shadow-black/20" side="bottom" sideOffset={8}>
                                                                            Create task
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* All Day Row */}
                                <div className="flex shrink-0">
                                    <div
                                        className={cn(
                                            "w-16 px-2 py-3 text-[10px] font-medium text-zinc-500 border-r border-zinc-200 shrink-0 flex items-start transition-colors",
                                            viewMode === "week" || viewMode === "4days"
                                                ? "cursor-default"
                                                : "cursor-pointer hover:bg-zinc-50/50"
                                        )}
                                        onClick={() => {
                                            if (viewMode === "week" || viewMode === "4days") return;
                                            const firstDay = calendarDays[0];
                                            if (!firstDay) return;
                                            const dateKey = format(firstDay, 'yyyy-MM-dd');
                                            if (inlineCreateState?.dayKey === dateKey && inlineCreateState?.hour === -1) return;
                                            setInlineCreateState({ dayKey: dateKey, hour: -1, half: 0 });
                                            setInlineCreateText("");
                                            setInlineAddTags([]);
                                            setInlineAddAssigneeIds([]);
                                            setInlineAddPriority(null);
                                            setInlineAddDueDate(null);
                                            setInlineAddStartDate(null);
                                            setInlineNoStartTime(true);
                                            setInlineNoEndTime(true);
                                        }}
                                    >
                                        All day
                                    </div>
                                    <div className="flex-1 flex" onClick={(e) => e.stopPropagation()} style={{ paddingRight: viewMode === 'day' ? '124px' : viewMode === '4days' ? '40px' : viewMode === 'week' ? '20px' : '0px' }}>
                                        {calendarDays.map((day, i) => {
                                            const dateKey = format(day, 'yyyy-MM-dd');
                                            // All Day: explicitly only tasks with noStartTime && noEndTime
                                            const dayTasks = (tasksByDate.get(dateKey) || []).filter(task => {
                                                return task.noStartTime && task.noEndTime;
                                            });

                                            const isInlineAllDay = inlineCreateState?.dayKey === dateKey && inlineCreateState?.hour === -1;

                                            return (
                                                <div key={i}
                                                    className={cn(
                                                        "flex-1 border-r border-zinc-200 last:border-r-0 relative min-h-[40px] p-1 gap-1 flex flex-col group/allday transition-colors overflow-visible",
                                                        viewMode === "week" || viewMode === "4days"
                                                            ? "cursor-default"
                                                            : "cursor-pointer hover:bg-zinc-50/50"
                                                    )}
                                                    onClick={(e) => {
                                                        if (viewMode === "week" || viewMode === "4days") return;
                                                        if (isInlineAllDay) return;
                                                        e.stopPropagation();
                                                        setInlineCreateState({ dayKey: dateKey, hour: -1, half: 0 });
                                                        setInlineCreateText("");
                                                        setInlineAddTags([]);
                                                        setInlineAddAssigneeIds([]);
                                                        setInlineAddPriority(null);
                                                        setInlineAddDueDate(null);
                                                        setInlineAddStartDate(null);
                                                        setInlineNoStartTime(true);
                                                        setInlineNoEndTime(true);
                                                    }}
                                                >
                                                    {/* All Day Inline Task Creation  Erendered first so it appears at top */}
                                                    {isInlineAllDay && renderInlineCreateForm(true, i, calendarDays.length, viewMode === 'day')}



                                                    {dayTasks.map(task => {
                                                        const statusColor = task.status?.color || "#a1a1aa";
                                                        return (
                                                            <div
                                                                key={task.id}
                                                                className={cn(
                                                                    "px-2 py-1.5 rounded text-[11px] font-medium transition-all cursor-pointer flex items-center justify-between gap-2 group/task relative",
                                                                    "hover:opacity-80 border shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-zinc-700"
                                                                )}
                                                                style={{
                                                                    backgroundColor: `${statusColor}15`,
                                                                    borderColor: `${statusColor}30`,
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onTaskSelect ? onTaskSelect(task.id) : setSelectedDetailTaskId(task.id);
                                                                }}
                                                            >
                                                                <Popover>
                                                                    <TooltipProvider delayDuration={300}>
                                                                        <Tooltip>
                                                                            <PopoverTrigger asChild>
                                                                                <TooltipTrigger asChild>
                                                                                    <div
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        className="absolute top-0 bottom-0 left-0 w-[3px] group-hover/task:-left-[13px] group-hover/task:w-[16px] transition-all duration-200 flex items-center justify-center cursor-pointer hover:brightness-95 z-10 shadow-sm rounded-l-[2px]"
                                                                                        style={{ backgroundColor: statusColor }}
                                                                                    >
                                                                                        <div className="w-[6px] h-[6px] border-[1.5px] border-black/20 rounded-[2px] opacity-0 group-hover/task:opacity-100 transition-opacity" />
                                                                                    </div>
                                                                                </TooltipTrigger>
                                                                            </PopoverTrigger>
                                                                            <TooltipContent side="left" className="bg-zinc-800 text-white border-zinc-700 text-[11px] font-medium px-2 py-1 z-50">
                                                                                Change status
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                    <PopoverContent side="left" align="start" className="w-[200px] p-2 shadow-xl border-zinc-200 rounded-lg z-[100]" onClick={(e) => e.stopPropagation()}>
                                                                        <Input placeholder="Search..." className="h-8 text-xs mb-2 bg-zinc-50 border-zinc-200" />
                                                                        <div className="max-h-[250px] overflow-y-auto pr-1 space-y-3">
                                                                            {Object.entries(groupedStatuses).map(([groupName, statuses]) => {
                                                                                if (statuses.length === 0) return null;
                                                                                return (
                                                                                    <div key={groupName}>
                                                                                        <div className="px-2 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{groupName}</div>
                                                                                        <div className="space-y-0.5">
                                                                                            {statuses.map((s: any) => (
                                                                                                <button
                                                                                                    key={s.id}
                                                                                                    onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task.id, s.id); }}
                                                                                                    className="flex items-center justify-between w-full px-2 py-1.5 text-[11px] hover:bg-zinc-100 rounded transition-colors text-zinc-700 font-medium"
                                                                                                >
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <div className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: s.color }} />
                                                                                                        <span>{s.name}</span>
                                                                                                    </div>
                                                                                                    {s.id === task.status?.id && <Check className="h-3 w-3 text-zinc-500" />}
                                                                                                </button>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Popover>
                                                                <div className="flex items-center gap-1.5 truncate relative z-0 ml-[4px]">
                                                                    <span className="truncate">{task.title || task.name}</span>
                                                                </div>
                                                                <ActionButtons task={task} />

                                                            </div>
                                                        );
                                                    })}

                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Hours Grid */}
                            {/* NOTE: Tasks are rendered per-hour-cell below (timedTasksByDateHour),
                                not via an absolute overlay, to avoid z-index conflicts and duplicate renders. */}
                            <div className="flex-1 flex flex-col relative pb-10">
                                {Array.from({ length: 24 }).map((_, hour) => {
                                    const label = hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
                                    return (
                                        <div key={hour} className="flex h-[80px] group transition-colors relative">
                                            <div className={cn("w-16 px-2 py-2 text-[10px] font-medium text-zinc-500 border-r border-zinc-300 shrink-0 flex items-start justify-end relative", hour === 0 ? "top-1" : "top-[-10px]")}>
                                                <span className={cn("bg-white px-1 leading-none absolute right-2", hour === 0 ? "top-0" : "-top-1")}>{label}</span>
                                            </div>
                                            <div
                                                className="flex-1 flex border-b border-zinc-300"
                                                style={{
                                                    paddingRight: viewMode === 'day' ? '124px' : viewMode === '4days' ? '40px' : viewMode === 'week' ? '20px' : '0px'
                                                }}
                                            >
                                                {calendarDays.map((day, i) => {
                                                    const dateKey = format(day, 'yyyy-MM-dd');
                                                    return (
                                                        <div
                                                            key={i}
                                                            className="flex-1 border-r border-zinc-200 last:border-r-0 relative flex flex-col"
                                                        >
                                                            {isTodayFns(day) && hour === currentTime.getHours() && (
                                                                <div
                                                                    className="absolute left-0 right-[-1px] border-t-[1.5px] border-red-500 z-30 pointer-events-none"
                                                                    style={{ top: `${(currentTime.getMinutes() / 60) * 100}%` }}
                                                                />
                                                            )}
                                                            {[0, 30].map(half => {
                                                                const isInline = inlineCreateState?.dayKey === dateKey && inlineCreateState?.hour === hour && inlineCreateState?.half === half;
                                                                return (
                                                                    <div
                                                                        key={half}
                                                                        className={cn(
                                                                            "flex-1 relative cursor-pointer hover:bg-zinc-50/50 group/cell transition-colors",
                                                                            half === 0 && "border-b border-dashed border-zinc-200/80"
                                                                        )}
                                                                        onClick={(e) => {
                                                                            if (isInline) return;
                                                                            e.stopPropagation();
                                                                            const slotTime = new Date(`${dateKey}T${hour.toString().padStart(2, '0')}:${half === 0 ? '00' : '30'}:00`);
                                                                            setInlineCreateState({ dayKey: dateKey, hour, half });
                                                                            setInlineCreateText("");
                                                                            setInlineAddTags([]);
                                                                            setInlineAddAssigneeIds([]);
                                                                            setInlineAddPriority(null);
                                                                            setInlineAddDueDate(slotTime);
                                                                            setInlineAddStartDate(null);
                                                                            setInlineNoStartTime(false);
                                                                            setInlineNoEndTime(false);
                                                                        }}
                                                                    >
                                                                        {/* Inline Create Form */}
                                                                        {isInline && renderInlineCreateForm(true, i, calendarDays.length)}
                                                                    </div>
                                                                )
                                                            })}

                                                            {/* Time-positioned task blocks */}
                                                            {(timedTasksByDateHour.get(dateKey)?.get(hour) || []).map((task: any, idx: number, arr: any[]) => {
                                                                const startD = task.startDate ? new Date(task.startDate) : new Date(task.dueDate!);
                                                                const endD = task.dueDate
                                                                    ? new Date(task.dueDate)
                                                                    : new Date(startD.getTime() + 60 * 60 * 1000);
                                                                const startMin = startD.getMinutes();
                                                                const durationMin = Math.max(30, (endD.getTime() - startD.getTime()) / 60000);
                                                                const topPx = (startMin / 60) * 80;
                                                                const heightPx = (durationMin / 60) * 80;
                                                                const statusColor = task.status?.color || '#a1a1aa';

                                                                const layoutInfo = timedTaskLayoutsByDate.get(dateKey)?.get(task.id) || { col: idx, totalCols: arr.length };
                                                                const widthFraction = layoutInfo.totalCols > 0 ? 1 / layoutInfo.totalCols : 1;
                                                                const leftFraction = layoutInfo.col * widthFraction;

                                                                const paddingRightNum = viewMode === 'day' ? 124 : viewMode === '4days' ? 40 : viewMode === 'week' ? 20 : 0;

                                                                return (
                                                                    <div
                                                                        key={task.id}
                                                                        className="absolute z-20 rounded overflow-visible cursor-pointer hover:opacity-95 transition-opacity flex group/task shadow-sm"
                                                                        style={{
                                                                            top: `${topPx}px`,
                                                                            height: `${heightPx}px`,
                                                                            width: `calc((100% - ${paddingRightNum}px) * ${widthFraction} - 4px)`,
                                                                            left: `calc((100% - ${paddingRightNum}px) * ${leftFraction} + 2px)`,
                                                                            backgroundColor: `${statusColor}22`,
                                                                        }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onTaskSelect ? onTaskSelect(task.id) : setSelectedDetailTaskId(task.id);
                                                                        }}
                                                                    >
                                                                        <Popover>
                                                                            <TooltipProvider delayDuration={300}>
                                                                                <Tooltip>
                                                                                    <PopoverTrigger asChild>
                                                                                        <TooltipTrigger asChild>
                                                                                            <div
                                                                                                onClick={(e) => e.stopPropagation()}
                                                                                                className="absolute top-0 bottom-0 left-0 w-[3px] group-hover/task:-left-[13px] group-hover/task:w-[16px] transition-all duration-200 flex items-center justify-center cursor-pointer hover:brightness-95 z-10 shadow-sm rounded-l-[2px]"
                                                                                                style={{ backgroundColor: statusColor }}
                                                                                            >
                                                                                                <div className="w-[6px] h-[6px] border-[1.5px] border-black/20 rounded-[2px] opacity-0 group-hover/task:opacity-100 transition-opacity" />
                                                                                            </div>
                                                                                        </TooltipTrigger>
                                                                                    </PopoverTrigger>
                                                                                    <TooltipContent side="left" className="bg-zinc-800 text-white border-zinc-700 text-[11px] font-medium px-2 py-1 z-50">
                                                                                        Change status
                                                                                    </TooltipContent>
                                                                                </Tooltip>
                                                                            </TooltipProvider>
                                                                            <PopoverContent side="left" align="start" className="w-[200px] p-2 shadow-xl border-zinc-200 rounded-lg z-[100]" onClick={(e) => e.stopPropagation()}>
                                                                                <Input placeholder="Search..." className="h-8 text-xs mb-2 bg-zinc-50 border-zinc-200" />
                                                                                <div className="max-h-[250px] overflow-y-auto pr-1 space-y-3">
                                                                                    {Object.entries(groupedStatuses).map(([groupName, statuses]) => {
                                                                                        if (statuses.length === 0) return null;
                                                                                        return (
                                                                                            <div key={groupName}>
                                                                                                <div className="px-2 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{groupName}</div>
                                                                                                <div className="space-y-0.5">
                                                                                                    {statuses.map((s: any) => (
                                                                                                        <button
                                                                                                            key={s.id}
                                                                                                            onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task.id, s.id); }}
                                                                                                            className="flex items-center justify-between w-full px-2 py-1.5 text-[11px] hover:bg-zinc-100 rounded transition-colors text-zinc-700 font-medium"
                                                                                                        >
                                                                                                            <div className="flex items-center gap-2">
                                                                                                                <div className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: s.color }} />
                                                                                                                <span>{s.name}</span>
                                                                                                            </div>
                                                                                                            {s.id === task.status?.id && <Check className="h-3 w-3 text-zinc-500" />}
                                                                                                        </button>
                                                                                                    ))}
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </PopoverContent>
                                                                        </Popover>

                                                                        <div className="px-1.5 py-0.5 flex flex-col gap-1 h-full overflow-hidden leading-tight flex-1 ml-[4px]">
                                                                            <div className="flex items-center justify-between gap-2 shrink-0">
                                                                                <span className="text-[11px] font-medium text-zinc-700 truncate">{task.title || task.name}</span>
                                                                                <div className="flex items-center shrink-0">
                                                                                    {(task.startDate || task.dueDate) && (
                                                                                        <span className="text-[9px] text-zinc-400 flex items-center gap-0.5 whitespace-nowrap">
                                                                                            <Clock className="w-2 h-2" />
                                                                                            {task.startDate && task.dueDate ? (
                                                                                                `${format(new Date(task.startDate), 'h:mma').toLowerCase()} - ${format(new Date(task.dueDate), 'h:mma').toLowerCase()}`
                                                                                            ) : (
                                                                                                format(startD, 'h:mma').toLowerCase()
                                                                                            )}
                                                                                        </span>
                                                                                    )}
                                                                                    <div className="w-0 overflow-hidden group-hover/task:w-auto transition-all duration-150 ml-1.5">
                                                                                        <ActionButtons task={task} />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-auto bg-white flex flex-col relative" style={{ overflowAnchor: 'none' }}>
                            {/* Weekday Headers */}
                            <div className="sticky top-0 z-40 grid grid-cols-7 border-b border-zinc-200 bg-white shadow-sm shrink-0">
                                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                                    <div key={day} className="px-3 py-2 text-[11px] font-black text-zinc-900 border-r border-zinc-200 last:border-r-0">
                                        {day}
                                    </div>
                                ))}
                            </div>
                                <div className="grid grid-cols-7 auto-rows-[minmax(185px,1fr)]">
                                    {calendarDays.map((date, i) => {
                                        const dateKey = format(date, 'yyyy-MM-dd');
                                        const dayTasks = tasksByDate.get(dateKey) || [];
                                        const isCurrent = isTodayFns(date);
                                        const isSelectedMonth = date.getMonth() === currentDate.getMonth();
                                        const isExpanded = expandedMonthCells[dateKey];
                                        const visibleTasks = isExpanded ? dayTasks : dayTasks.slice(0, 5);
                                        const hiddenCount = dayTasks.length - 5;
                                        const isInlineCreate = inlineCreateState?.dayKey === dateKey && inlineCreateState?.hour === -1;

                                        return (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "border-r border-b border-zinc-200 group transition-all relative min-h-[185px]",
                                                    !isSelectedMonth && "bg-zinc-50/30",
                                                    isCurrent && "ring-inset ring-[1px] ring-zinc-900 z-10",
                                                    isInlineCreate && "z-[60]"
                                                )}
                                                onClick={() => {
                                                    setSelectedDateForNewTask(date);
                                                    setIsCreateModalOpen(true);
                                                }}
                                            >
                                                {isInlineCreate && renderInlineCreateForm(true, i % 7, 7, false)}

                                                <div className={cn(
                                                    "absolute flex flex-col z-0 cursor-default",
                                                    isExpanded
                                                        ? "top-[-4px] left-[-4px] right-[-4px] bg-white border border-zinc-200 shadow-[0_12px_45px_rgba(0,0,0,0.18)] rounded-lg p-1.5 z-[70] h-max min-h-[calc(100%+8px)]"
                                                        : "left-2 right-2 top-1.5 bottom-1.5"
                                                )} onClick={(e) => { if (isExpanded) e.stopPropagation(); }}>
                                                    <div className={cn("flex-1 space-y-1 mb-1", !isExpanded && "overflow-hidden")}>
                                                        {visibleTasks.map((task) => {
                                                            const statusColor = task.status?.color || "#a1a1aa";
                                                            return (
                                                                <div
                                                                    key={task.id}
                                                                    className={cn(
                                                                        "px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer flex items-center justify-between gap-1 text-zinc-700 group/task relative",
                                                                        "hover:opacity-80 border"
                                                                    )}
                                                                    style={{
                                                                        backgroundColor: `${statusColor}15`,
                                                                        borderColor: `${statusColor}30`,
                                                                    }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onTaskSelect ? onTaskSelect(task.id) : setSelectedDetailTaskId(task.id);
                                                                    }}
                                                                >
                                                                    <Popover>
                                                                        <TooltipProvider delayDuration={300}>
                                                                            <Tooltip>
                                                                                <PopoverTrigger asChild>
                                                                                    <TooltipTrigger asChild>
                                                                                        <div
                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                            className="absolute top-0 bottom-0 left-0 w-[3px] group-hover/task:-left-[13px] group-hover/task:w-[16px] transition-all duration-200 flex items-center justify-center cursor-pointer hover:brightness-95 z-10 shadow-sm rounded-l-[2px]"
                                                                                            style={{ backgroundColor: statusColor }}
                                                                                        >
                                                                                            <div className="w-[6px] h-[6px] border-[1.5px] border-black/20 rounded-[2px] opacity-0 group-hover/task:opacity-100 transition-opacity" />
                                                                                        </div>
                                                                                    </TooltipTrigger>
                                                                                </PopoverTrigger>
                                                                                <TooltipContent side="left" className="bg-zinc-800 text-white border-zinc-700 text-[11px] font-medium px-2 py-1 z-50">
                                                                                    Change status
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>
                                                                        <PopoverContent side="left" align="start" className="w-[200px] p-2 shadow-xl border-zinc-200 rounded-lg z-[100]" onClick={(e) => e.stopPropagation()}>
                                                                            <Input placeholder="Search..." className="h-8 text-xs mb-2 bg-zinc-50 border-zinc-200" />
                                                                            <div className="max-h-[250px] overflow-y-auto pr-1 space-y-3">
                                                                                {Object.entries(groupedStatuses).map(([groupName, statuses]) => {
                                                                                    if (statuses.length === 0) return null;
                                                                                    return (
                                                                                        <div key={groupName}>
                                                                                            <div className="px-2 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{groupName}</div>
                                                                                            <div className="space-y-0.5">
                                                                                                {statuses.map((s: any) => (
                                                                                                    <button
                                                                                                        key={s.id}
                                                                                                        onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task.id, s.id); }}
                                                                                                        className="flex items-center justify-between w-full px-2 py-1.5 text-[11px] hover:bg-zinc-100 rounded transition-colors text-zinc-700 font-medium"
                                                                                                    >
                                                                                                        <div className="flex items-center gap-2">
                                                                                                            <div className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: s.color }} />
                                                                                                            <span>{s.name}</span>
                                                                                                        </div>
                                                                                                        {s.id === task.status?.id && <Check className="h-3 w-3 text-zinc-500" />}
                                                                                                    </button>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                    <div className="flex items-center gap-1.5 truncate relative z-0 ml-[4px]">
                                                                        <span className="truncate">{task.title || task.name}</span>
                                                                    </div>
                                                                    {task.dueDate && !(task.noStartTime && task.noEndTime) && (
                                                                        <span className="text-[9px] opacity-60 flex items-center shrink-0">
                                                                            <Clock className="w-2.5 h-2.5 mr-0.5" />
                                                                            {format(new Date(task.dueDate), 'h:mm a')}
                                                                        </span>
                                                                    )}
                                                                    <ActionButtons task={task} />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Unified Footer */}
                                                    <div className="flex items-center justify-between mt-auto shrink-0 pointer-events-none pb-[1px]">
                                                        <div className="flex items-center pointer-events-auto">
                                                            {!isExpanded && hiddenCount > 0 && (
                                                                <div
                                                                    className="text-[10px] font-bold text-zinc-500 hover:text-zinc-800 cursor-pointer transition-colors"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        e.preventDefault();
                                                                        setExpandedMonthCells(prev => ({ ...prev, [dateKey]: true }));
                                                                    }}
                                                                >
                                                                    + {hiddenCount} MORE
                                                                </div>
                                                            )}
                                                            {isExpanded && hiddenCount > 0 && (
                                                                <div
                                                                    className="text-[10px] font-bold text-zinc-500 hover:text-zinc-800 cursor-pointer transition-colors"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        e.preventDefault();
                                                                        setExpandedMonthCells(prev => ({ ...prev, [dateKey]: false }));
                                                                    }}
                                                                >
                                                                    {hiddenCount} LESS
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 pointer-events-auto">
                                                            <button
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm flex items-center justify-center h-4 w-4 bg-zinc-600 hover:bg-zinc-800 text-white rounded-[3px]"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setInlineCreateState({ dayKey: dateKey, hour: -1, half: 0 });
                                                                    setInlineCreateText("");
                                                                    setInlineAddTags([]);
                                                                    setInlineAddAssigneeIds([]);
                                                                    setInlineAddPriority(null);
                                                                    setInlineAddDueDate(null);
                                                                    setInlineAddStartDate(null);
                                                                    setInlineNoStartTime(true);
                                                                    setInlineNoEndTime(true);
                                                                }}
                                                            >
                                                                <Plus className="h-3 w-3" />
                                                            </button>
                                                            <span className={cn(
                                                                "text-[12px] font-medium transition-all pointer-events-none select-none tabular-nums tracking-tight",
                                                                isCurrent ? "font-black text-zinc-900" :
                                                                    isSelectedMonth ? "text-zinc-500" : "text-zinc-400"
                                                            )}>
                                                                {format(date, 'd')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar - Unscheduled & Overdue */}
                {isRightSidebarExpanded ? (
                    <div className="w-[320px] border-l border-zinc-200 bg-white flex flex-col shrink-0 z-10 shadow-[-4px_0_12px_rgba(0,0,0,0.03)] h-full overflow-hidden absolute right-0 top-0 bottom-0 md:relative">
                        <div className="flex items-center justify-between p-4 px-5 pb-0 shrink-0">
                            <h3 className="text-lg font-medium text-zinc-900">Tasks</h3>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className={cn("h-8 w-8 hover:text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors", isRightSidebarSearchOpen ? "text-zinc-800 bg-zinc-100" : "text-zinc-400")} onClick={() => setIsRightSidebarSearchOpen(!isRightSidebarSearchOpen)}>
                                    <Search className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md" onClick={() => setIsRightSidebarExpanded(false)}>
                                    <ArrowRightToLine className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {isRightSidebarSearchOpen && (
                            <div className="px-5 pt-3 shrink-0">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                    <Input
                                        autoFocus
                                        placeholder="Search..."
                                        className="h-9 pl-9 bg-zinc-50 border-zinc-200 text-sm focus-visible:ring-1 focus-visible:ring-zinc-300"
                                        value={rightSidebarSearchText}
                                        onChange={(e) => setRightSidebarSearchText(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="px-5 border-b border-zinc-100 flex gap-5 shrink-0 mt-4">
                            <button
                                className={cn("pb-2 text-sm font-semibold transition-colors border-b-2", rightSidebarTab === "unscheduled" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-700")}
                                onClick={() => setRightSidebarTab("unscheduled")}
                            >
                                Unscheduled
                            </button>
                            <button
                                className={cn("pb-2 text-sm font-semibold transition-colors border-b-2", rightSidebarTab === "overdue" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-700")}
                                onClick={() => setRightSidebarTab("overdue")}
                            >
                                Overdue
                            </button>
                        </div>

                        <div className="px-5 py-3 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[13px] text-zinc-500">Sort by</span>
                                <div className="flex items-center gap-[1px]">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger className="outline-none">
                                            <span className="text-[15px] text-blue-600 underline underline-offset-2 decoration-blue-400 font-medium hover:text-blue-700 transition-colors">
                                                {rightSidebarSortBy === "duedate" ? "Due date" :
                                                    rightSidebarSortBy === "listname" ? "List name" :
                                                        rightSidebarSortBy.charAt(0).toUpperCase() + rightSidebarSortBy.slice(1)}
                                            </span>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-44 shadow-lg rounded-xl border-zinc-200 p-1">
                                            {[
                                                { id: 'duedate', label: 'Due date' },
                                                { id: 'status', label: 'Status' },
                                                { id: 'priority', label: 'Priority' },
                                                { id: 'assignees', label: 'Assignees' },
                                                { id: 'name', label: 'Name' },
                                                { id: 'listname', label: 'List name' }
                                            ].map(opt => (
                                                <DropdownMenuItem
                                                    key={opt.id}
                                                    className={cn("flex items-center justify-between text-[13px] rounded-lg px-3 py-1.5 cursor-pointer", rightSidebarSortBy === opt.id ? "font-semibold text-zinc-900" : "text-zinc-700")}
                                                    onClick={() => setRightSidebarSortBy(opt.id as any)}
                                                >
                                                    {opt.label}
                                                    {rightSidebarSortBy === opt.id && <Check className="h-3.5 w-3.5 text-zinc-500" />}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <button
                                        className="flex items-center justify-center p-1 -ml-0 text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
                                        onClick={() => setRightSidebarSortDesc(prev => !prev)}
                                        title={rightSidebarSortDesc ? "Switch to ascending" : "Switch to descending"}
                                    >
                                        <svg
                                            viewBox="0 0 8 6"
                                            className="w-[7px] h-[7px] fill-current shrink-0 transition-transform duration-200 ease-in-out"
                                            style={{ transform: rightSidebarSortDesc ? 'rotate(0deg)' : 'rotate(180deg)' }}
                                        >
                                            <polygon points="4,6 0,0 8,0" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <span className="text-[13px] text-zinc-500">{sortedSidebarTasks.length} tasks</span>
                        </div>

                        <ScrollArea ref={calendarSidebarScrollRef} className="flex-1 px-3">
                            <div className="space-y-1 pb-4">
                                <VirtualizedDivRows
                                    scrollRef={calendarSidebarScrollRef}
                                    rowCount={sortedSidebarTasks.length}
                                    estimateSize={44}
                                    renderRow={(idx) => {
                                        const task = sortedSidebarTasks[idx];
                                        const taskColor = task.status?.color || "#a1a1aa";
                                        return (
                                        <div key={task.id} className="group flex items-center justify-between px-3 py-2 hover:bg-zinc-50/80 rounded-lg cursor-pointer transition-colors"
                                            onClick={() => openTaskDetail(task.id)}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden min-w-0 pr-2">
                                                <div className="w-3.5 h-3.5 rounded-full border-2 shrink-0 transition-colors"
                                                    style={{ borderColor: taskColor }} />
                                                <span className="text-[13px] text-zinc-800 truncate font-medium">{task.title || task.name}</span>
                                            </div>
                                            {task.dueDate && (
                                                <span className="text-[11px] text-zinc-500 shrink-0 whitespace-nowrap">
                                                    {task.noStartTime && task.noEndTime
                                                        ? format(new Date(task.dueDate), 'MMM d')
                                                        : format(new Date(task.dueDate), 'MMM d, h:mma')}
                                                </span>
                                            )}
                                        </div>
                                        );
                                    }}
                                />
                                {sortedSidebarTasks.length === 0 && (
                                    <div className="text-center py-10 text-[13px] text-zinc-500">
                                        No tasks found
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                    </div>
                ) : (
                    <div
                        onClick={() => setIsRightSidebarExpanded(true)}
                        className="w-[48px] border-l border-zinc-200 bg-white hover:bg-zinc-50 cursor-pointer flex flex-col items-center pt-4 pb-6 gap-6 shrink-0 z-10 shadow-[-1px_0_4px_rgba(0,0,0,0.02)] transition-colors"
                    >
                        <div className="p-1.5 rounded-lg text-zinc-400 transition-colors" title="Toggle Sidebar">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-[20px] w-[20px] ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18" />
                                <path d="M3 12h12" />
                                <path d="M3 18h6" />
                            </svg>
                        </div>

                        <div className="flex flex-col items-center gap-2 group cursor-pointer relative mt-2" title="Unscheduled Tasks">
                            <div className="[writing-mode:vertical-lr] flex items-center gap-2.5 text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] group-hover:text-zinc-900 transition-colors">
                                <span className="text-[12px] bg-zinc-100 px-1.5 py-0.5 rounded-md text-zinc-700">{unscheduledTasks.length}</span> Unscheduled
                            </div>
                            <div className="h-12 w-[2px] bg-zinc-100 mt-2 rounded-full group-hover:bg-zinc-300 transition-colors" />
                        </div>

                        <div className="flex flex-col items-center gap-2 group cursor-pointer relative" title="Overdue Tasks">
                            <div className="[writing-mode:vertical-lr] flex items-center gap-2.5 text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] group-hover:text-red-600 transition-colors">
                                <span className="text-[12px] bg-red-50 px-1.5 py-0.5 rounded-md text-red-600 border border-red-100">{overdueTasks.length}</span> Overdue
                            </div>
                            <div className="h-12 w-[2px] bg-red-50 mt-2 rounded-full group-hover:bg-red-200 transition-colors" />
                        </div>

                        <div className="mt-auto mb-4 p-2.5 rounded-xl text-zinc-300">
                            <MoreVertical className="h-5 w-5" />
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {assigneesPanelOpen && (
                <>
                    <div className="absolute inset-0 bg-black/20 z-40" onClick={() => setAssigneesPanelOpen(false)} aria-hidden />
                    <div className="absolute top-0 right-0 h-full w-[320px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                            <h3 className="font-semibold text-zinc-900">Assignees</h3>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:bg-zinc-100 cursor-pointer" onClick={() => setAssigneesPanelOpen(false)}><X className="h-4 w-4" /></Button>
                        </div>
                        <div className="p-3 border-b border-zinc-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                                <Input className="pl-9 h-9 text-sm" placeholder="Search by user or team" value={assigneesSearch} onChange={e => setAssigneesSearch(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex-1 p-3 overflow-y-auto">
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">People {users.length}</p>
                            <div className="space-y-1 mb-4">
                                <label className="flex items-center gap-2 py-2 px-2 rounded hover:bg-zinc-50 cursor-pointer">
                                    <Checkbox
                                        checked={filterAssignee.includes("__unassigned__")}
                                        onCheckedChange={(checked) => {
                                            setFilterAssignee(prev =>
                                                checked
                                                    ? [...prev, "__unassigned__"]
                                                    : prev.filter(id => id !== "__unassigned__")
                                            );
                                        }}
                                    />
                                    <span className="text-sm text-zinc-700">Unassigned</span>
                                </label>
                                {users
                                    .filter(u => !assigneesSearch.trim() || (u.name || "").toLowerCase().includes(assigneesSearch.toLowerCase()))
                                    .map(u => (
                                        <label key={u.id} className="flex items-center gap-2 py-2 px-2 rounded hover:bg-zinc-50 cursor-pointer">
                                            <Checkbox
                                                checked={filterAssignee.includes(u.id)}
                                                onCheckedChange={(checked) => {
                                                    setFilterAssignee(prev =>
                                                        checked
                                                            ? [...prev, u.id]
                                                            : prev.filter(id => id !== u.id)
                                                    );
                                                }}
                                            />
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={u.image || undefined} />
                                                <AvatarFallback className="text-[10px]">
                                                    {u.name?.slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm text-zinc-700 truncate">{u.name}</span>
                                        </label>
                                    ))}
                            </div>
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Teams 0</p>
                            <div className="py-2 text-sm text-zinc-500">No teams</div>
                        </div>
                        <div className="p-3 border-t border-zinc-100 flex items-center justify-between mt-auto">
                            <span className="text-sm text-zinc-700 flex items-center gap-1.5"><MessageSquare className="h-4 w-4 text-zinc-400" /> Assigned comments</span>
                            <Switch checked={false} onCheckedChange={() => { }} />
                        </div>
                    </div>
                </>
            )}

            {
                !onTaskSelect && effectiveSelectedTaskId && (
                    <TaskDetailModal
                        taskId={effectiveSelectedTaskId}
                        open={true}
                        onOpenChange={(open) => !open && closeTaskDetail()}
                        onLayoutModeChange={() => { }}
                    />
                )
            }

            <TaskCreationModal
                context={spaceId ? "SPACE" : projectId ? "PROJECT" : "GENERAL"}
                contextId={spaceId || projectId}
                workspaceId={resolvedWorkspaceId}
                users={users as any}
                lists={[]}
                defaultListId={listId}
                availableStatuses={allAvailableStatuses}
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                trigger={<span className="sr-only" />}
            />

            {/* View Settings Modals */}
            {/* View Settings Popover has been removed, as the large customize sidebar houses all of its options */}

            {/* Default View Settings Modal */}
            <Dialog open={isDefaultViewSettingsModalOpen} onOpenChange={setIsDefaultViewSettingsModalOpen}>
                <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl gap-0 border-zinc-200">
                    <DialogHeader className="p-5 border-b border-zinc-100 pb-4">
                        <DialogTitle className="text-lg font-bold text-zinc-900">Default View Settings</DialogTitle>
                        <DialogDescription className="text-zinc-500 mt-1.5 text-sm leading-relaxed">
                            Set this view as the default for everyone or just for yourself.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-5 space-y-5">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                                <Checkbox
                                    checked={defaultView}
                                    onCheckedChange={(checked) => {
                                        updateViewProperty('isDefault', !!checked);
                                    }}
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-semibold text-zinc-900 cursor-pointer mb-1 block">Default View for Everyone</Label>
                                <p className="text-xs text-zinc-500 leading-relaxed">
                                    When people navigate to this location, this view will open by default. Only Workspace admins can set default views for everyone.
                                </p>
                            </div>
                        </div>

                        <div className="h-px bg-zinc-100" />

                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-zinc-900 mb-2 block">Apply to New Views</Label>

                            <label className="flex items-start gap-3 p-3 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-50 transition-colors">
                                <span className="mt-0.5 flex items-center justify-center h-4 w-4 rounded-full border border-zinc-300">
                                    {defaultViewSettingsApplyTo === "NEW" && <div className="h-2 w-2 rounded-full bg-violet-600" />}
                                </span>
                                <div>
                                    <span className="text-sm font-medium text-zinc-900 block mb-0.5">New Calendar Views</span>
                                    <span className="text-xs text-zinc-500 block">Apply these settings as the default starting point for new Calendar views.</span>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 p-3 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-50 transition-colors opacity-50">
                                <span className="mt-0.5 flex items-center justify-center h-4 w-4 rounded-full border border-zinc-300">
                                    {defaultViewSettingsApplyTo === "ALL" && <div className="h-2 w-2 rounded-full bg-violet-600" />}
                                </span>
                                <div>
                                    <span className="text-sm font-medium text-zinc-900 block mb-0.5">All Calendar Views</span>
                                    <span className="text-xs text-zinc-500 block">Force all future and current Calendar views to adopt these settings.</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-2">
                        <Button variant="ghost" className="h-9 px-4 text-sm font-medium text-zinc-600" onClick={() => setIsDefaultViewSettingsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button className="h-9 px-4 text-sm font-medium bg-zinc-900 hover:bg-zinc-800" onClick={() => setIsDefaultViewSettingsModalOpen(false)}>
                            Save Settings
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Share and Permissions Modal */}
            <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
                <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl gap-0 border-zinc-200">
                    <DialogHeader className="p-5 border-b border-zinc-100 pb-4 flex flex-row items-center justify-between">
                        <div>
                            <DialogTitle className="text-lg font-bold text-zinc-900">Share this view</DialogTitle>
                            <DialogDescription className="text-zinc-500 mt-1 text-sm">
                                Manage who can see and edit this view.
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    <div className="p-5 space-y-6">
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Public Link</h4>
                            <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 bg-zinc-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                        <Globe className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-zinc-900">Share link with anyone</div>
                                        <div className="text-xs text-zinc-500 mt-0.5">Anyone with the link can view</div>
                                    </div>
                                </div>
                                <Switch checked={false} onCheckedChange={() => { }} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Internal Permissions</h4>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold">
                                        W
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-zinc-900">Workspace Members</div>
                                        <div className="text-xs text-zinc-500 mt-0.5">All members of this workspace</div>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" className="h-8 text-xs font-medium px-3 text-zinc-600">
                                    Can edit
                                    <ChevronDown className="h-3.5 w-3.5 ml-1.5 opacity-50" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            {/* Layout Options Panel */}
            {layoutOptionsOpen && (
                <SidePanel
                    open={layoutOptionsOpen}
                    onClose={() => { setLayoutOptionsOpen(false); setCustomizePanelOpen(false); }}
                    className="absolute bottom-0 right-0 h-full w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col"
                >
                        <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                            <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1 cursor-pointer" onClick={() => { setLayoutOptionsOpen(false); setCustomizePanelOpen(true); }}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <h3 className="font-semibold text-zinc-900">Layout options</h3>
                            <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={() => setLayoutOptionsOpen(false)}><X className="h-4 w-4" /></Button>
                        </div>

                        <ScrollArea className="flex-1 min-h-0">
                            <div className="p-3 space-y-4 pb-24">

                                {/* Page & card layout */}
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Page layout</p>
                                    <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer">
                                        <span className="text-sm text-zinc-800">Task dates</span>
                                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                            1 shown <ChevronRight className="h-3 w-3 ml-1" />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer">
                                        <span className="text-sm text-zinc-800">Color tasks by</span>
                                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                            Task status <ChevronRight className="h-3 w-3 ml-1" />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer">
                                        <span className="text-sm text-zinc-800">Time format</span>
                                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                            12h <ChevronRight className="h-3 w-3 ml-1" />
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-zinc-100" />

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between py-1 px-2 cursor-pointer" onClick={() => handleConfigChange(() => setShowWeekends(!showWeekends))}>
                                        <span className="text-sm text-zinc-800">Show weekends</span>
                                        <Switch checked={showWeekends} onCheckedChange={(v) => handleConfigChange(() => setShowWeekends(v))} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 cursor-pointer" onClick={() => handleConfigChange(() => setShowWeekNumbers(!showWeekNumbers))}>
                                        <span className="text-sm text-zinc-800">Show week numbers</span>
                                        <Switch checked={showWeekNumbers} onCheckedChange={(v) => handleConfigChange(() => setShowWeekNumbers(v))} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 cursor-pointer" onClick={() => handleConfigChange(() => setShowHourGridLines(!showHourGridLines))}>
                                        <span className="text-sm text-zinc-800">Show hour grid lines</span>
                                        <Switch checked={showHourGridLines} onCheckedChange={(v) => handleConfigChange(() => setShowHourGridLines(v))} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 cursor-pointer" onClick={() => handleConfigChange(() => setFadeTasksInPast(!fadeTasksInPast))}>
                                        <span className="text-sm text-zinc-800">Fade tasks in the past</span>
                                        <Switch checked={fadeTasksInPast} onCheckedChange={(v) => handleConfigChange(() => setFadeTasksInPast(v))} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 cursor-pointer" onClick={() => handleConfigChange(() => setAlwaysStayOnThisDate(!alwaysStayOnThisDate))}>
                                        <span className="text-sm text-zinc-800">Always stay on this date</span>
                                        <Switch checked={alwaysStayOnThisDate} onCheckedChange={(v) => handleConfigChange(() => setAlwaysStayOnThisDate(v))} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 cursor-pointer" onClick={() => handleConfigChange(() => setShowFutureRecurringTasks(!showFutureRecurringTasks))}>
                                        <span className="text-sm text-zinc-800">Show future recurring tasks</span>
                                        <Switch checked={showFutureRecurringTasks} onCheckedChange={(v) => handleConfigChange(() => setShowFutureRecurringTasks(v))} />
                                    </div>
                                </div>

                                <div className="h-px bg-zinc-100" />

                                {/* Task visibility */}
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Task visibility</p>
                                    <div className="flex items-center justify-between py-1 px-2 cursor-pointer" onClick={() => handleConfigChange(() => setShowTasksFromOtherLists(!showTasksFromOtherLists))}>
                                        <span className="text-sm text-zinc-800">Show tasks from other Lists</span>
                                        <Switch checked={showTasksFromOtherLists} onCheckedChange={(v) => handleConfigChange(() => setShowTasksFromOtherLists(v))} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 cursor-pointer" onClick={() => handleConfigChange(() => setShowSubtasksFromOtherLists(!showSubtasksFromOtherLists))}>
                                        <span className="text-sm text-zinc-800">Show subtasks from other Lists</span>
                                        <Switch checked={showSubtasksFromOtherLists} onCheckedChange={(v) => handleConfigChange(() => setShowSubtasksFromOtherLists(v))} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 cursor-pointer" onClick={() => handleConfigChange(() => setMyTasksFromAllLists(!myTasksFromAllLists))}>
                                        <span className="text-sm text-zinc-800">My tasks from all Lists</span>
                                        <Switch checked={myTasksFromAllLists} onCheckedChange={(v) => handleConfigChange(() => setMyTasksFromAllLists(v))} />
                                    </div>
                                </div>

                                <div className="h-px bg-zinc-100" />

                                {/* View settings */}
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">View settings</p>
                                    <div className="flex items-center justify-between py-1 px-2 cursor-pointer" onClick={() => handleConfigChange(() => setDefaultToMeMode(!defaultToMeMode))}>
                                        <span className="text-sm flex items-center gap-2"><User className="h-4 w-4 text-zinc-400" />Default to Me Mode</span>
                                        <Switch checked={defaultToMeMode} onCheckedChange={(v) => handleConfigChange(() => setDefaultToMeMode(v))} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded cursor-pointer">
                                        <span className="text-sm flex items-center gap-2"><LogOut className="h-4 w-4 text-zinc-400" />Move view</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded cursor-pointer">
                                        <span className="text-sm flex items-center gap-2"><Copy className="h-4 w-4 text-zinc-400" />Duplicate view</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded cursor-pointer">
                                        <span className="text-sm flex items-center gap-2"><RefreshCw className="h-4 w-4 text-zinc-400" />Reset view to defaults</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded cursor-pointer" onClick={() => setIsDefaultViewSettingsModalOpen(true)}>
                                        <span className="text-sm flex items-center gap-2"><Settings className="h-4 w-4 text-zinc-400" />Default view settings</span>
                                    </div>
                                </div>

                            </div>
                        </ScrollArea>
                </SidePanel>
            )}

            {/* Customize View Panel */}
            {customizePanelOpen && !layoutOptionsOpen && (
                <SidePanel
                    open={customizePanelOpen && !layoutOptionsOpen}
                    onClose={() => setCustomizePanelOpen(false)}
                    className="absolute bottom-0 right-0 h-full w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200 ease-out"
                >
                        <div className="flex items-center justify-between p-4 border-b border-zinc-100 shrink-0">
                            <h3 className="font-semibold text-zinc-900 text-sm tracking-tight">Customize view</h3>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors" onClick={() => setCustomizePanelOpen(false)}><X className="h-4 w-4" /></Button>
                        </div>
                        <ScrollArea className="flex-1 min-h-0">
                            <div className="p-3 space-y-2 pb-24">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="flex items-center justify-center h-10 w-10 rounded-lg border border-zinc-200 bg-zinc-50 shrink-0">
                                        <CalendarIcon className="h-5 w-5 text-zinc-600" />
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
                                    <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors text-zinc-500 cursor-pointer">
                                        <span className="text-sm text-zinc-800">Task dates</span>
                                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                            1 shown <ChevronRight className="h-3 w-3 ml-1" />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors text-zinc-500 cursor-pointer">
                                        <span className="text-sm text-zinc-800">Color tasks by</span>
                                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                            Task status <ChevronRight className="h-3 w-3 ml-1" />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors text-zinc-500 cursor-pointer">
                                        <span className="text-sm text-zinc-800">Time format</span>
                                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                            12h <ChevronRight className="h-3 w-3 ml-1" />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 cursor-pointer" onClick={() => handleConfigChange(() => setShowWeekends(!showWeekends))}>
                                        <span className="text-sm text-zinc-800">Show weekends</span>
                                        <Switch checked={showWeekends} onCheckedChange={(v) => handleConfigChange(() => setShowWeekends(v))} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 cursor-pointer" onClick={() => handleConfigChange(() => setShowWeekNumbers(!showWeekNumbers))}>
                                        <span className="text-sm text-zinc-800">Show week numbers</span>
                                        <Switch checked={showWeekNumbers} onCheckedChange={(v) => handleConfigChange(() => setShowWeekNumbers(v))} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 cursor-pointer" onClick={() => handleConfigChange(() => setShowClosed(!showClosed))}>
                                        <span className="text-sm text-zinc-800">Show closed tasks</span>
                                        <Switch checked={showClosed} onCheckedChange={(v) => handleConfigChange(() => setShowClosed(v))} />
                                    </div>
                                    <button
                                        type="button"
                                        className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer"
                                        onClick={() => { setLayoutOptionsOpen(true); }}
                                    >
                                        <span className="flex items-center gap-2">More options</span>
                                        <ChevronRight className="inline h-3 w-3 ml-1 text-zinc-400" />
                                    </button>
                                </div>

                                <div className="h-px bg-zinc-100 my-2" />

                                <div className="space-y-1">
                                    <Popover open={customizeViewFilterOpen} onOpenChange={setCustomizeViewFilterOpen}>
                                        <PopoverTrigger asChild>
                                            <button
                                                type="button"
                                                className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer"
                                                onClick={() => { if (filterGroups.conditions.length === 0) { addFilterGroup(); } }}
                                            >
                                                <span className="flex items-center gap-2"><Filter className="h-4 w-4 text-zinc-400" />Filter</span>
                                                <span className="text-xs text-zinc-500">{appliedFilterCount > 0 ? `${appliedFilterCount} applied` : "None"} <ChevronRight className="inline h-3 w-3 ml-1" /></span>
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent side="left" align="start" className="w-[600px] max-w-[90vw] p-0 overflow-hidden shadow-2xl rounded-2xl border border-zinc-200/80" sideOffset={16}>
                                            {renderFilterContent({ onClose: () => setCustomizeViewFilterOpen(false) })}
                                        </PopoverContent>
                                    </Popover>
                                    <Popover open={customizeViewGroupOpen} onOpenChange={setCustomizeViewGroupOpen}>
                                        <PopoverTrigger asChild>
                                            <button
                                                type="button"
                                                className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer"
                                            >
                                                <span className="flex items-center gap-2"><GitMerge className="h-4 w-4 text-zinc-400" />Subtasks</span>
                                                <span className="text-xs text-zinc-500">{showSubtasks ? "Shown" : "Hidden"} <ChevronRight className="inline h-3 w-3 ml-1" /></span>
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent side="left" align="start" className="w-56 p-1.5 rounded-xl shadow-xl border-zinc-200/60" sideOffset={16}>
                                            <div className="px-2 py-1.5 mb-1">
                                                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Show subtasks</span>
                                            </div>
                                            <div className="space-y-0.5">
                                                {[
                                                    { label: "Shown (default)", value: true },
                                                    { label: "Hidden", value: false },
                                                ].map((opt) => (
                                                    <div
                                                        key={String(opt.value)}
                                                        className={cn(
                                                            "flex items-center justify-between px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors",
                                                            showSubtasks === opt.value ? "bg-violet-50 text-violet-700" : "text-zinc-600 hover:bg-zinc-100"
                                                        )}
                                                        onClick={() => { handleConfigChange(() => setShowSubtasks(opt.value)); setCustomizeViewGroupOpen(false); }}
                                                    >
                                                        <span className="flex-1">{opt.label}</span>
                                                        {showSubtasks === opt.value && <div className="h-1.5 w-1.5 rounded-full bg-violet-600" />}
                                                    </div>
                                                ))}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                    <button type="button" className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer">
                                        <span className="flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-zinc-400" />Sync with calendar</span>
                                        <ChevronRight className="inline h-3 w-3 ml-1 text-zinc-400" />
                                    </button>
                                </div>

                                <div className="h-px bg-zinc-100 my-2" />

                                <div className="space-y-1">
                                    <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer" onClick={handleToggleAutosave}>
                                        <div className="flex items-center gap-2">
                                            <Save className="h-4 w-4 text-zinc-400" />
                                            <span className="text-sm text-zinc-800">Autosave for me</span>
                                        </div>
                                        <Switch checked={viewAutosave} onCheckedChange={handleToggleAutosave} />
                                    </div>
                                    <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer" onClick={() => { setPinView(v => !v); updateViewProperty('isPinned', !pinView); }}>
                                        <div className="flex items-center gap-2">
                                            <Pin className="h-4 w-4 text-zinc-400" />
                                            <span className="text-sm text-zinc-800">Pin view</span>
                                        </div>
                                        <Switch checked={pinView} onCheckedChange={(val) => { setPinView(val); updateViewProperty('isPinned', val); }} />
                                    </div>
                                    <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer" onClick={() => { setPrivateView(v => !v); updateViewProperty('isPrivate', !privateView); }}>
                                        <div className="flex items-center gap-2">
                                            {privateView ? <Unlock className="h-4 w-4 text-zinc-400" /> : <Lock className="h-4 w-4 text-zinc-400" />}
                                            <span className="text-sm text-zinc-800">Private view</span>
                                        </div>
                                        <Switch checked={privateView} onCheckedChange={(val) => { setPrivateView(val); updateViewProperty('isPrivate', val); }} />
                                    </div>
                                    <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer" onClick={() => { setProtectView(v => !v); updateViewProperty('isLocked', !protectView); }}>
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="h-4 w-4 text-zinc-400" />
                                            <span className="text-sm text-zinc-800">Protect view</span>
                                        </div>
                                        <Switch checked={protectView} onCheckedChange={(val) => { setProtectView(val); updateViewProperty('isLocked', val); }} />
                                    </div>
                                    <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer" onClick={() => { setDefaultView(v => !v); updateViewProperty('isDefault', !defaultView); }}>
                                        <div className="flex items-center gap-2">
                                            <Home className="h-4 w-4 text-zinc-400" />
                                            <span className="text-sm text-zinc-800">Set as default view</span>
                                        </div>
                                        <Switch checked={defaultView} onCheckedChange={(val) => { setDefaultView(val); updateViewProperty('isDefault', val); }} />
                                    </div>
                                </div>

                                <div className="h-px bg-zinc-100 my-2" />

                                <div className="space-y-1">
                                    <button type="button" className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer" onClick={() => {
                                        if (typeof window !== 'undefined') {
                                            navigator.clipboard.writeText(window.location.href);
                                            toast.success('Link copied to clipboard');
                                        }
                                    }}>
                                        <span className="flex items-center gap-2"><Link className="h-4 w-4 text-zinc-400" />Copy link to view</span>
                                    </button>
                                    <button type="button" className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer" onClick={() => setIsShareModalOpen(true)}>
                                        <span className="flex items-center gap-2"><Share className="h-4 w-4 text-zinc-400" />Sharing &amp; Permissions</span>
                                        <ChevronRight className="inline h-3 w-3 ml-1 text-zinc-400" />
                                    </button>
                                    <button type="button" className="w-full flex items-center justify-between py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-md px-2 cursor-pointer" onClick={() => { }}>
                                        <span className="flex items-center gap-2"><Trash2 className="h-4 w-4" />Delete view</span>
                                    </button>
                                </div>
                            </div>
                        </ScrollArea>
                </SidePanel>
            )}
            <TaskListLoadMore
                loadMoreRef={loadMoreRef}
                hasMore={hasMoreTasks}
                isFetchingNextPage={isFetchingNextPage}
                loaded={tasks.length}
                total={taskTotal}
            />
        </div>
    );
}