"use client";

import { useGenericTaskViewData } from "@/features/dashboard/hooks/useGenericTaskViewData";
import { TaskListLoadMore } from "@/features/dashboard/components/shared/TaskListLoadMore";
import { useVirtualRowWindow } from "@/features/dashboard/hooks/useVirtualRowWindow";
import { VirtualizedDivRows } from "@/features/dashboard/components/shared/VirtualizedListRows";
import {
    buildTimelineRowEntries,
    getTimelineRowHeight,
    getTimelineVirtualRowCount,
    TIMELINE_ROW_HEIGHT,
    type TimelineRowEntry,
} from "@/features/dashboard/utils/taskViewTimelineRows";

import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Plus, ChevronLeft, ChevronRight, Calendar, Search, Filter, Settings, Download, Monitor, Share2, Trash, Copy, Star, Lock, EyeOff, Save, Layout, MoreHorizontal, User,
    CheckCircle2, X, PanelLeft, ArrowLeft, Maximize2, Clock, GitCommit, ListFilter, ArrowUpDown, Pin, SortAsc, Users, Flag, Paperclip, MessageSquare, ChevronsUp,
    LayoutList, SlidersHorizontal, ArrowUp, ArrowDown, Circle, Spline, Link2, Target, Info, Play, ListChecks, AlignLeft, RefreshCcw, Type, Hash, CheckSquare, Tag, Minus,
    DollarSign, Globe, FunctionSquare, FileText, Phone, Mail, MapPin, TrendingUp, Heart, PenTool, MousePointer, ListTodo, AlertTriangle, CircleMinus, Link, Slash, Box,
    List as ListIcon, Archive, UserPlus, CalendarCheck, CalendarClock, CalendarRange, Hourglass, UserCheck, RefreshCw, Timer, Undo, ToggleLeft, Edit3, Trash2, Check,
    ChevronDown, UserRound, ShieldCheck, Home, ChevronUp, ArrowRight, GripVertical, ZoomIn, ZoomOut, Settings2, PlusCircle, PanelRightClose, ArrowRightToLine, MoreVertical, ExternalLink, Sparkles, Wand2, Bell, CircleSlash
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { TaskHoverPopover } from "./TaskHoverPopover";
import { toast } from "sonner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { SingleDateCalendar } from "@/components/ui/date-picker";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskCreationModal } from "@/entities/task/components/TaskCreationModal";
import { TaskActionsPopover } from "@/entities/task/components/TaskActionsPopover";
import { TaskCalendar } from "@/entities/task/components/TaskCalendar";
import { ListCreationModal } from "@/entities/task/components/ListCreationModal";
import { AssigneeSelector } from "@/entities/task/components/AssigneeSelector";
import { LazyTaskDetailModal as TaskDetailModal } from "@/entities/task/components/LazyTaskDetailModal";
import { ViewToolbarSaveDropdown } from "@/features/dashboard/components/shared/ViewToolbarSaveDropdown";
import { ViewToolbarClosedPopover } from "@/features/dashboard/components/shared/ViewToolbarClosedPopover";
import { TaskTypeIcon } from "@/entities/task/components/TaskTypeIcon";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addDays, subDays, startOfDay, endOfDay, isToday as isTodayFns, isSameDay, addMonths, addWeeks, addHours, addQuarters } from "date-fns";
import type { FilterCondition, FilterGroup, ListViewSavedConfig, FilterOperator } from "./listViewTypes";
import { FILTER_OPTIONS, FIELD_OPERATORS, STANDARD_FIELD_CONFIG } from "./listViewConstants";
import { evaluateGroup, hasFilterValue, hasAnyValueInGroup, evaluateCondition } from "./filterUtils";
import { DestinationPicker } from "@/entities/task/components/DestinationPicker";
import { ShareViewPermissionModal } from "@/features/dashboard/components/shared/ShareViewPermissionModal";
import { DuplicateTaskModal } from "@/entities/task/components/DuplicateTaskModal";
import { parseEncodedTag } from "@/entities/task/utils/tags";

interface TimelineViewProps {
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

export interface Task {
    id: string;
    name: string;
    title?: string;
    description?: string | null;
    status: { id: string; name: string; color: string; type?: string } | null;
    priority: string | null;
    dueDate: Date | null;
    startDate: Date | null;
    assignees: { user: { id: string; name: string; image?: string | null; email?: string | null } }[];
    assignee?: { id: string; name: string; image?: string | null; email?: string | null };
    tags: string[];
    position: string;
    parentId?: string | null;
    customFieldValues?: any[];
    _count?: {
        comments?: number;
        other_tasks?: number; // children count
    };
    list?: { id: string; name: string; statuses?: any[] };
    listName?: string;
    type?: string;
    taskType?: { id: string; name: string; color?: string; icon?: string };
    taskTypeId?: string;
    progress?: number;
    noStartTime?: boolean;
    noEndTime?: boolean;
}

type ZoomLevel = 'hours' | 'days' | 'weeks' | 'months' | '7_days' | '14_days';
type GroupBy = 'none' | 'status' | 'assignee' | 'priority' | 'list' | 'taskType';
const ZOOM_LEVEL_ORDER: ZoomLevel[] = ["months", "weeks", "14_days", "7_days", "days"];

const CREATE_FIELD_TYPES = [
    // Basic fields
    { id: "TEXT", label: "Text", icon: Type, type: "TEXT" },
    { id: "NUMBER", label: "Number", icon: Hash, type: "NUMBER" },
    { id: "DATE", label: "Date", icon: Calendar, type: "DATE" },
    { id: "CHECKBOX", label: "Checkbox", icon: CheckSquare, type: "CHECKBOX" },
    { id: "DROPDOWN", label: "Dropdown", icon: LayoutList, type: "DROPDOWN" },

    // Text fields
    { id: "TEXT_AREA", label: "Text area (Long Text)", icon: AlignLeft, type: "TEXT_AREA" },
    { id: "LONG_TEXT", label: "Long Text", icon: AlignLeft, type: "LONG_TEXT" },
    { id: "CUSTOM_TEXT", label: "Custom Text", icon: Type, type: "CUSTOM_TEXT" },

    // Selection fields
    { id: "LABELS", label: "Labels", icon: Tag, type: "LABELS" },
    { id: "CUSTOM_DROPDOWN", label: "Custom Dropdown", icon: LayoutList, type: "CUSTOM_DROPDOWN" },
    { id: "CATEGORIZE", label: "Categorize", icon: Target, type: "CATEGORIZE" },
    { id: "TSHIRT_SIZE", label: "T-Shirt Size", icon: Users, type: "TSHIRT_SIZE" },

    // Contact fields
    { id: "EMAIL", label: "Email", icon: Mail, type: "EMAIL" },
    { id: "PHONE", label: "Phone", icon: Phone, type: "PHONE" },
    { id: "URL", label: "Website", icon: Globe, type: "URL" },

    // Financial & numeric
    { id: "MONEY", label: "Money", icon: DollarSign, type: "MONEY" },
    { id: "FORMULA", label: "Formula", icon: FunctionSquare, type: "FORMULA" },

    // Files & attachments
    { id: "FILES", label: "Files", icon: Paperclip, type: "FILES" },

    // Relationships
    { id: "RELATIONSHIP", label: "Relationship", icon: Link2, type: "RELATIONSHIP" },
    { id: "PEOPLE", label: "People", icon: Users, type: "PEOPLE" },
    { id: "TASKS", label: "Tasks", icon: ListTodo, type: "TASKS" },

    // Progress & tracking
    { id: "PROGRESS_AUTO", label: "Progress (Auto)", icon: TrendingUp, type: "PROGRESS_AUTO" },
    { id: "PROGRESS_MANUAL", label: "Progress (Manual)", icon: SlidersHorizontal, type: "PROGRESS_MANUAL" },

    // AI & special fields
    { id: "SUMMARY", label: "Summary", icon: FileText, type: "SUMMARY" },
    { id: "PROGRESS_UPDATES", label: "Progress Updates", icon: MessageSquare, type: "PROGRESS_UPDATES" },
    { id: "TRANSLATION", label: "Translation", icon: Globe, type: "TRANSLATION" },
    { id: "SENTIMENT", label: "Sentiment", icon: Heart, type: "SENTIMENT" },
];

export function TimelineView({ spaceId, projectId, teamId, listId, folderId, viewId, workspaceId, initialConfig, selectedTaskIdFromParent, onTaskSelect, refetchViewData }: TimelineViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const utils = trpc.useUtils();
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('days');
    const [searchQuery, setSearchQuery] = useState("");
    const [showWeekends, setShowWeekends] = useState(true);
    const [showToday, setShowToday] = useState(true);
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const effectiveSelectedTaskId = selectedTaskIdFromParent || selectedTaskId;
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const timelineSidebarScrollRef = useRef<HTMLDivElement>(null);
    const todayRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const popoverDropdownOpenRef = useRef(false);
    const [editingHoveredTaskName, setEditingHoveredTaskName] = useState(false);
    const [openDropdownType, setOpenDropdownType] = useState<'status' | 'priority' | 'assignee' | null>(null);
    const [creationStartDate, setCreationStartDate] = useState<Date | null>(null);
    const [creationDueDate, setCreationDueDate] = useState<Date | null>(null);

    // Grid Cell click State
    const [cellModalData, setCellModalData] = useState<{
        date: Date;
        rect: DOMRect;
        rowId: string;
        offsetTop?: number;
    } | null>(null);
    const [cellModalTab, setCellModalTab] = useState<"find" | "create">("find");
    const [cellSearchQuery, setCellSearchQuery] = useState("");
    const [cellCreateName, setCellCreateName] = useState("");
    // Cell drag-range state for setting start/end date via drag
    const [cellDragRange, setCellDragRange] = useState<{ startDate: Date; endDate: Date } | null>(null);
    const [cellIsDragging, setCellIsDragging] = useState(false);
    const cellDragStartRef = useRef<{ date: Date; colIdx: number } | null>(null);
    // Create task state for cell modal
    const [cellCreateStatusId, setCellCreateStatusId] = useState<string | null>(null);
    const [cellCreateAssigneeIds, setCellCreateAssigneeIds] = useState<string[]>([]);
    const [cellCreatePriority, setCellCreatePriority] = useState<string | null>(null);
    const [cellCreateTaskTypeId, setCellCreateTaskTypeId] = useState<string | null>(null);
    const [cellCreateStartDate, setCellCreateStartDate] = useState<Date | null>(null);
    const [cellCreateDueDate, setCellCreateDueDate] = useState<Date | null>(null);
    const [cellCreateDatePopoverOpen, setCellCreateDatePopoverOpen] = useState(false);

    // View State
    const [sortBy, setSortBy] = useState<string>("manual");
    const [sort, setSort] = useState<{ id: string; desc: boolean }[]>([]);
    const [groupBy, setGroupBy] = useState<string>(() => (listId ? "status" : "list"));
    const [groupDirection, setGroupDirection] = useState<"asc" | "desc">("asc");
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [expandedSubtaskMode, setExpandedSubtaskMode] = useState<"collapsed" | "expanded" | "separate">("collapsed");
    const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
    const [sortPanelOpen, setSortPanelOpen] = useState(false);
    const [customizeMenuOpen, setCustomizeMenuOpen] = useState(false);
    const [filterGroups, setFilterGroups] = useState<FilterGroup>(() => ({
        id: "root",
        operator: "AND",
        conditions: [],
    }));
    const [fieldsPanelOpen, setFieldsPanelOpen] = useState(false);
    const [assigneesPanelOpen, setAssigneesPanelOpen] = useState(false);
    const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

    // ListView Parity State
    const [viewAutosave, setViewAutosave] = useState(false);
    const [pinView, setPinView] = useState(false);
    const [privateView, setPrivateView] = useState(false);
    const [protectView, setProtectView] = useState(false);
    const [defaultView, setDefaultView] = useState(false);
    const [viewNameDraft, setViewNameDraft] = useState("");
    const [showCompleted, setShowCompleted] = useState(false);
    const [showCompletedSubtasks, setShowCompletedSubtasks] = useState(false);
    const [showTaskLocations, setShowTaskLocations] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const [isRightSidebarExpanded, setIsRightSidebarExpanded] = useState(false);
    const [isRightSidebarSearchOpen, setIsRightSidebarSearchOpen] = useState(false);
    const [rightSidebarSearchText, setRightSidebarSearchText] = useState("");
    const [rightSidebarTab, setRightSidebarTab] = useState<"unscheduled" | "overdue">("unscheduled");
    const [rightSidebarSortBy, setRightSidebarSortBy] = useState<"duedate" | "status" | "priority" | "assignees" | "name" | "listname">("status");
    const [rightSidebarSortDesc, setRightSidebarSortDesc] = useState(false);

    const updateViewMutation = trpc.view.update.useMutation();
    const createViewMutation = trpc.view.create.useMutation();
    const updateTaskDatesMutation = trpc.task.update.useMutation();
    const updateTaskMutation = trpc.task.update.useMutation({
        onSuccess: () => {
            void utils.task.list.invalidate();
        },
    });
    const deleteTaskMutation = trpc.task.delete.useMutation({
        onSuccess: () => {
            void utils.task.list.invalidate();
        },
    });
    const createTaskMutation = trpc.task.create.useMutation();

    // Drag-resize state
    const dragStateRef = useRef<{
        taskId: string;
        handle: 'left' | 'right';
        startX: number;
        originalStartDate: Date | null;
        originalDueDate: Date | null;
        baseBarLeft: number;
        baseBarWidth: number;
        currentBarLeft: number;
        currentBarWidth: number;
    } | null>(null);

    const [draggedBarStyle, setDraggedBarStyle] = useState<{
        taskId: string;
        barLeft: number;
        barWidth: number;
    } | null>(null);

    const [ghostDragState, setGhostDragState] = useState<{
        handle: 'left' | 'right';
        startX: number;
        originalStartDate: Date;
        originalDueDate: Date;
        baseBarLeft: number;
        baseBarWidth: number;
        currentBarLeft: number;
        currentBarWidth: number;
    } | null>(null);

    // Local date overrides: keyed by taskId, holds committed date changes
    // so bars don't snap back while the server refetch is in flight
    const [localTaskDates, setLocalTaskDates] = useState<Record<string, { startDate?: Date | null; dueDate?: Date | null; committed: boolean }>>({});

    const [fieldsSearch, setFieldsSearch] = useState("");
    const [createFieldModalOpen, setCreateFieldModalOpen] = useState(false);
    const [createFieldSearch, setCreateFieldSearch] = useState("");
    const [assigneesSearch, setAssigneesSearch] = useState("");
    const [filterSearch, setFilterSearch] = useState("");
    const [customizePanelOpen, setCustomizePanelOpen] = useState(false);
    const [layoutOptionsOpen, setLayoutOptionsOpen] = useState(false);
    const [showEmptyStatuses, setShowEmptyStatuses] = useState(false);
    const [hoveredTask, setHoveredTask] = useState<Task | null>(null);
    const [hoveredBarRect, setHoveredBarRect] = useState<DOMRect | null>(null);
    const [infoIconRect, setInfoIconRect] = useState<DOMRect | null>(null);
    const [customizeViewFilterOpen, setCustomizeViewFilterOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [viewportWidth, setViewportWidth] = useState(0);
    const [activeMajorIndex, setActiveMajorIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Lock body scroll when cell modal is open
    useEffect(() => {
        if (cellModalData) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = prev; };
        }
    }, [!!cellModalData]);

    const [customizeViewGroupOpen, setCustomizeViewGroupOpen] = useState(false);
    const [customizeViewSubtasksOpen, setCustomizeViewSubtasksOpen] = useState(false);
    const [filterAssignee, setFilterAssignee] = useState<string[]>([]);
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
        new Set(["name", "status", "assignee", "priority", "dueDate", "tags"])
    );
    const [wrapText, setWrapText] = useState(false);
    const [showSubtaskParentNames, setShowSubtaskParentNames] = useState(false);
    const [expandTaskNames, setExpandTaskNames] = useState(true);
    const [showTaskProperties, setShowTaskProperties] = useState(true);
    const [showTasksFromOtherLists, setShowTasksFromOtherLists] = useState(false);
    const [showSubtasksFromOtherLists, setShowSubtasksFromOtherLists] = useState(false);
    const [pinDescription, setPinDescription] = useState(false);
    const [defaultToMeMode, setDefaultToMeMode] = useState(false);

    const toggleColumn = (columnId: string) => {
        const next = new Set(visibleColumns);
        if (next.has(columnId)) next.delete(columnId);
        else next.add(columnId);
        setVisibleColumns(next);
    };

    const resetViewToDefaults = () => {
        setVisibleColumns(new Set(["name", "status", "assignee", "priority", "dueDate", "tags"]));
        setGroupBy("status");
        setGroupDirection("asc");
        setShowCompleted(false);
        setWrapText(false);
    };

    const getPriorityStyles = (p: string) => {
        if (p === "URGENT") return { badge: "text-red-700 bg-red-50 border-red-200", icon: "text-red-600" };
        if (p === "HIGH") return { badge: "text-orange-700 bg-orange-50 border-orange-200", icon: "text-orange-600" };
        if (p === "NORMAL") return { badge: "text-blue-700 bg-blue-50 border-blue-200", icon: "text-blue-600" };
        if (p === "LOW") return { badge: "text-slate-600 bg-slate-100 border-slate-200", icon: "text-slate-500" };
        return { badge: "text-slate-600 bg-slate-50 border-slate-200", icon: "text-slate-400" };
    };

    const { data: viewData } = trpc.view.get.useQuery({ id: viewId as string }, { staleTime: 60_000, gcTime: 5 * 60_000, enabled: !!viewId });

    const taskListSpaceId = spaceId && !projectId && !listId ? spaceId : undefined;
    const taskListProjectId = projectId && !listId ? projectId : undefined;

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
        tasks: rawTasks,
        isTasksLoading,
        hasMore: hasMoreTasks,
        isFetchingNextPage,
        loadMoreRef,
        total: taskTotal,
        taskListInput,
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

    const tasks = useMemo<Task[]>(() => (rawTasks as Task[]) ?? [], [rawTasks]);

    useEffect(() => {
        if (viewData) {
            setViewNameDraft(viewData.name || "");
            setPinView(viewData.isPinned || false);
            setPrivateView(viewData.isPrivate || false);
            setProtectView(viewData.isLocked || false);
            setDefaultView(viewData.isDefault || false);
            const cfg = (viewData.config as any)?.timelineView;
            if (cfg) {
                if (typeof cfg.viewAutosave === "boolean") setViewAutosave(cfg.viewAutosave);
                if (cfg.zoomLevel) setZoomLevel(cfg.zoomLevel);
                if (cfg.groupBy) setGroupBy(cfg.groupBy);
                if (cfg.groupDirection) setGroupDirection(cfg.groupDirection);
                if (cfg.sortBy) setSortBy(cfg.sortBy);
                if (cfg.sort) setSort(cfg.sort);
                if (typeof cfg.showCompleted === "boolean") setShowCompleted(cfg.showCompleted);
                if (typeof cfg.showCompletedSubtasks === "boolean") setShowCompletedSubtasks(cfg.showCompletedSubtasks);
                if (typeof cfg.showTaskLocations === "boolean") setShowTaskLocations(cfg.showTaskLocations);
                if (typeof cfg.showWeekends === "boolean") setShowWeekends(cfg.showWeekends);
                if (cfg.expandedSubtaskMode) setExpandedSubtaskMode(cfg.expandedSubtaskMode);
                if (cfg.filterGroups) setFilterGroups(cfg.filterGroups);
            }
        }
    }, [viewData]);

    const isViewDirty = useMemo(() => {
        if (!viewData) return false;
        const currentCfg = {
            timelineView: {
                viewAutosave,
                zoomLevel,
                groupBy,
                groupDirection,
                sortBy,
                sort,
                showCompleted,
                showCompletedSubtasks,
                showTaskLocations,
                showWeekends,
                expandedSubtaskMode,
                filterGroups
            }
        };
        return JSON.stringify(currentCfg) !== JSON.stringify(viewData.config);
    }, [viewData, viewAutosave, zoomLevel, groupBy, groupDirection, sortBy, sort, showCompleted, showCompletedSubtasks, showTaskLocations, showWeekends, expandedSubtaskMode, filterGroups]);

    const saveViewConfig = async (isAutosave = false) => {
        if (!viewId) return;
        const config = {
            timelineView: {
                viewAutosave: isAutosave ? true : viewAutosave,
                zoomLevel,
                groupBy,
                groupDirection,
                sortBy,
                sort,
                showCompleted,
                showCompletedSubtasks,
                showTaskLocations,
                showWeekends,
                expandedSubtaskMode,
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
        if (!viewId) return;
        const viewName = name?.trim() || `${viewData?.name || "Timeline"} (copy)`;
        try {
            await createViewMutation.mutateAsync({
                name: viewName,
                type: 'TIMELINE',
                workspaceId: resolvedWorkspaceId as string,
                projectId: projectId as string,
                spaceId: spaceId as string,
                config: {
                    timelineView: {
                        viewAutosave,
                        zoomLevel,
                        groupBy,
                        groupDirection,
                        sortBy,
                        sort,
                        showCompleted,
                        showCompletedSubtasks,
                        showTaskLocations,
                        showWeekends,
                        expandedSubtaskMode,
                        filterGroups
                    }
                }
            });
            toast.success("New view created");
        } catch (e) {
            toast.error("Failed to create view");
        }
    };

    const revertViewChanges = () => {
        if (!viewData) return;
        const cfg = (viewData.config as any)?.timelineView;
        if (cfg) {
            if (cfg.zoomLevel) setZoomLevel(cfg.zoomLevel);
            if (cfg.groupBy) setGroupBy(cfg.groupBy);
            if (cfg.groupDirection) setGroupDirection(cfg.groupDirection);
            if (cfg.sortBy) setSortBy(cfg.sortBy);
            if (cfg.sort) setSort(cfg.sort);
            if (typeof cfg.showCompleted === "boolean") setShowCompleted(cfg.showCompleted);
            if (typeof cfg.showCompletedSubtasks === "boolean") setShowCompletedSubtasks(cfg.showCompletedSubtasks);
            if (typeof cfg.showTaskLocations === "boolean") setShowTaskLocations(cfg.showTaskLocations);
            if (typeof cfg.showWeekends === "boolean") setShowWeekends(cfg.showWeekends);
            if (cfg.expandedSubtaskMode) setExpandedSubtaskMode(cfg.expandedSubtaskMode);
            if (cfg.filterGroups) setFilterGroups(cfg.filterGroups);
        }
    };

    const updateViewProperty = async (property: string, value: any) => {
        if (!viewId) return;
        try {
            await updateViewMutation.mutateAsync({ id: viewId, [property]: value });
            void utils.view.get.invalidate({ id: viewId });
            toast.success(`Updated ${property}`);
        } catch (e) {
            toast.error(`Failed to update ${property}`);
        }
    };

    const updateViewName = async (newName: string) => {
        if (!viewId || !newName.trim()) return;
        const trimmed = newName.trim();
        const oldName = viewData?.name || "";
        setViewNameDraft(trimmed);

        // Optimistically patch all parent caches so the tab bar updates immediately
        const patchViews = (views: any[]) => views.map((v: any) => v.id === viewId ? { ...v, name: trimmed } : v);

        // Update generic caches
        if (spaceId) utils.space?.get?.setData({ id: spaceId }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);
        if (projectId) utils.project?.get?.setData({ id: projectId }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);
        if (teamId) utils.team?.get?.setData({ id: teamId }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);
        if (folderId) utils.folder?.get?.setData({ id: folderId }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);
        if (listId) utils.list?.get?.setData({ id: listId }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);

        // Use a generic approach to update list.byContext
        const listByContextInput = resolvedWorkspaceId || spaceId || projectId || teamId
            ? {
                workspaceId: resolvedWorkspaceId || undefined,
                spaceId: spaceId || undefined,
                projectId: projectId || undefined,
                teamId: teamId || undefined,
                folderId: folderId || undefined,
            }
            : null;

        const updateListByContext = () => {
            try {
                if (listByContextInput && utils.list?.byContext?.setData) {
                    utils.list.byContext.setData(listByContextInput, (old: any) => {
                        if (!old || !old.items) return old;
                        return {
                            ...old,
                            items: old.items.map((l: any) => l.id === listId ? { ...l, views: patchViews(l.views ?? []) } : l)
                        };
                    });
                }
            } catch (e) { }
        };
        updateListByContext();

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

            // Revert optimistic updates
            const revertViews = (views: any[]) => views.map((v: any) => v.id === viewId ? { ...v, name: oldName } : v);
            if (spaceId) utils.space?.get?.setData({ id: spaceId }, (old: any) => old ? { ...old, views: revertViews(old.views ?? []) } : old);
            if (projectId) utils.project?.get?.setData({ id: projectId }, (old: any) => old ? { ...old, views: revertViews(old.views ?? []) } : old);
            if (teamId) utils.team?.get?.setData({ id: teamId }, (old: any) => old ? { ...old, views: revertViews(old.views ?? []) } : old);
            if (folderId) utils.folder?.get?.setData({ id: folderId }, (old: any) => old ? { ...old, views: revertViews(old.views ?? []) } : old);
            if (listId) utils.list?.get?.setData({ id: listId }, (old: any) => old ? { ...old, views: revertViews(old.views ?? []) } : old);
        }
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
        return Array.from(workspaceUserById.values()).map(u => ({ id: u.id, name: u.name, image: u.image ?? null, email: u.email ?? null }));
    }, [teamId, teamParticipants?.users, projectId, projectParticipants?.users, workspaceUserById]);
    const { data: agentsData } = trpc.agent.list.useQuery({ workspaceId: resolvedWorkspaceId as string }, { staleTime: 60_000, gcTime: 5 * 60_000, enabled: !!resolvedWorkspaceId });
    const agents = agentsData?.items || [];

    useEffect(() => {
        if (!scrollAreaRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setViewportWidth(entry.contentRect.width);
            }
        });
        observer.observe(scrollAreaRef.current);
        return () => observer.disconnect();
    }, [isTasksLoading]);

    const FIELD_CONFIG = useMemo(() => {
        const custom = (customFields || []).map((f: any) => ({
            id: f.id,
            label: f.name,
            icon: Tag,
            isCustom: true,
            type: f.type
        }));
        return [...STANDARD_FIELD_CONFIG, ...custom];
    }, [customFields]);

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

    const allAvailableTags = useMemo(() => Array.from(new Set(tasks.flatMap(t => t.tags || []))), [tasks]);
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
    }, [listId, currentList, listsData]);

    const [savedFiltersPanelOpen, setSavedFiltersPanelOpen] = useState(false);
    const [savedFilterName, setSavedFilterName] = useState("");
    const [savedFiltersSearch, setSavedFiltersSearch] = useState("");
    const [savedFilters, setSavedFilters] = useState<{ id: string, name: string, config: FilterGroup }[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('agentflox_saved_filters_timeline');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    const updateFilterGroupOperator = (groupId: string, operator: "AND" | "OR") => {
        const updateRecursive = (group: FilterGroup): FilterGroup => {
            if (group.id === groupId) return { ...group, operator };
            return {
                ...group,
                conditions: group.conditions.map(c => ("conditions" in c ? updateRecursive(c as FilterGroup) : c))
            };
        };
        setFilterGroups(prev => (groupId === "root" ? { ...prev, operator } : updateRecursive(prev)));
    };

    const addFilterGroup = () => {
        setFilterGroups(prev => ({
            ...prev,
            conditions: [
                ...prev.conditions,
                {
                    id: Math.random().toString(36).substring(7),
                    operator: "AND",
                    conditions: [
                        { id: Math.random().toString(36).substring(7), field: "status", operator: "is", value: [] }
                    ]
                } as FilterGroup
            ]
        }));
    };

    const addFilterCondition = (groupId: string) => {
        const addRecursive = (group: FilterGroup): FilterGroup => {
            if (group.id === groupId) {
                return {
                    ...group,
                    conditions: [...group.conditions, { id: Math.random().toString(36).substring(7), field: "status", operator: "is", value: [] }]
                };
            }
            return {
                ...group,
                conditions: group.conditions.map(c => "conditions" in c ? addRecursive(c as FilterGroup) : c)
            };
        };
        setFilterGroups(prev => addRecursive(prev));
    };

    const removeFilterItem = (itemId: string) => {
        const removeRecursive = (group: FilterGroup): FilterGroup => {
            return {
                ...group,
                conditions: group.conditions
                    .filter(c => c.id !== itemId)
                    .map(c => "conditions" in c ? removeRecursive(c as FilterGroup) : c)
            };
        };
        setFilterGroups(prev => removeRecursive(prev));
    };

    const updateFilterCondition = (conditionId: string, updates: Partial<FilterCondition>) => {
        const updateRecursive = (group: FilterGroup): FilterGroup => {
            return {
                ...group,
                conditions: group.conditions.map(c => {
                    if ("conditions" in c) return updateRecursive(c as FilterGroup);
                    if (c.id === conditionId) return { ...c, ...updates };
                    return c;
                })
            };
        };
        setFilterGroups(prev => updateRecursive(prev));
    };

    const saveNewFilter = useCallback(() => {
        if (!savedFilterName.trim()) return;
        const newFilter = {
            id: Math.random().toString(36).substring(7),
            name: savedFilterName.trim(),
            config: JSON.parse(JSON.stringify(filterGroups))
        };
        setSavedFilters(prev => {
            const next = [...prev, newFilter];
            localStorage.setItem("agentflox_saved_filters_timeline", JSON.stringify(next));
            return next;
        });
        setSavedFilterName("");
    }, [savedFilterName, filterGroups]);

    const deleteSavedFilter = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSavedFilters(prev => {
            const next = prev.filter(f => f.id !== id);
            localStorage.setItem("agentflox_saved_filters_timeline", JSON.stringify(next));
            return next;
        });
    }, []);

    const applySavedFilter = (config: FilterGroup) => {
        setFilterGroups(config);
        setSavedFiltersPanelOpen(false);
    };

    const appliedFilterCount = useMemo(() => {
        if (filterGroups.conditions.length === 0) return 0;
        return filterGroups.conditions.filter(c => {
            if ("conditions" in c) return hasAnyValueInGroup(c as FilterGroup);
            return hasFilterValue(c as FilterCondition);
        }).length;
    }, [filterGroups]);

    // ── Infinite Timeline Range ──────────────────────────────────────────────
    // dateRange is STATE (not memo) so the scroll handler can extend it on the fly.
    // The init effect resets it whenever zoom level changes.
    const INITIAL_PADDING_DAYS = 365;
    const EXTEND_DAYS = 270; // how many days to append each time the user nears an edge
    const EDGE_THRESHOLD_PX = 2500; // px from edge that triggers an extension

    const buildInitialRange = useCallback((zoom: ZoomLevel, taskList: Task[]) => {
        const today = new Date();
        const back = INITIAL_PADDING_DAYS;
        const fwd = INITIAL_PADDING_DAYS;
        let start = subDays(startOfDay(today), back);
        let end = addDays(endOfDay(today), fwd);
        if (taskList.length > 0) {
            const dates = taskList
                .filter(t => t.startDate || t.dueDate)
                .flatMap(t => [t.startDate, t.dueDate].filter(Boolean))
                .map(d => new Date(d!));
            if (dates.length > 0) {
                const minT = new Date(Math.min(...dates.map(d => d.getTime())));
                const maxT = new Date(Math.max(...dates.map(d => d.getTime())));
                if (minT < start) start = subDays(startOfDay(minT), back);
                if (maxT > end) end = addDays(endOfDay(maxT), fwd);
            }
        }
        return { start, end };
    }, []);

    const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(() =>
        buildInitialRange('days', [])
    );
    const zoomIndex = ZOOM_LEVEL_ORDER.indexOf(zoomLevel);
    const canZoomIn = zoomIndex < ZOOM_LEVEL_ORDER.length - 1;
    const canZoomOut = zoomIndex > 0;
    const handleZoomIn = useCallback(() => {
        if (!canZoomIn) return;
        setZoomLevel(ZOOM_LEVEL_ORDER[zoomIndex + 1]);
    }, [canZoomIn, zoomIndex]);
    const handleZoomOut = useCallback(() => {
        if (!canZoomOut) return;
        setZoomLevel(ZOOM_LEVEL_ORDER[zoomIndex - 1]);
    }, [canZoomOut, zoomIndex]);

    // Reset range whenever zoom level changes (tasks changes don't reset  Eonly extend)
    const prevZoomRef = useRef<ZoomLevel | null>(null);
    useEffect(() => {
        if (prevZoomRef.current === zoomLevel) return;
        prevZoomRef.current = zoomLevel;
        setDateRange(buildInitialRange(zoomLevel, tasks));
    }, [zoomLevel, tasks, buildInitialRange]);

    const columnWidth = useMemo(() => {
        const availableWidth = viewportWidth > 0 ? viewportWidth : 1000;
        switch (zoomLevel) {
            case 'days': return 50;
            case '7_days': return Math.max(availableWidth / 7, 50);
            case '14_days': return Math.max(availableWidth / 14, 30);
            case 'weeks': return 26;
            case 'months': return 12;
            default: return 50;
        }
    }, [zoomLevel, viewportWidth]);

    const columnBackgroundStyle = useMemo(() => {
        const borderColor = 'rgba(212,212,216,1)'; // zinc-300 column border for clear visibility
        const gridUnitWidth = columnWidth;

        return {
            ...(zoomLevel !== 'months' ? {
                backgroundImage: `
                    repeating-linear-gradient(
                        to right,
                        transparent 0px,
                        transparent ${gridUnitWidth - 0.5}px,
                        ${borderColor} ${gridUnitWidth - 0.5}px,
                        ${borderColor} ${gridUnitWidth}px
                    )
                `,
                backgroundSize: `${gridUnitWidth}px 100%`,
            } : {})
        };
    }, [columnWidth, zoomLevel]);

    const [visibleColRange, setVisibleColRange] = useState<{ start: number; end: number }>({ start: 0, end: 50 });

    const timelineUnits = useMemo(() => {
        const units: Date[] = [];
        let current = new Date(dateRange.start);
        while (current <= dateRange.end) {
            if (!showWeekends && (current.getDay() === 0 || current.getDay() === 6)) {
                current = addDays(current, 1);
                continue;
            }
            units.push(new Date(current));
            switch (zoomLevel) {
                case 'days': current = addDays(current, 1); break;
                case '7_days': current = addDays(current, 1); break;
                case '14_days': current = addDays(current, 1); break;
                case 'weeks': current = addDays(current, 1); break;
                case 'months': current = addDays(current, 1); break;
                default: current = addDays(current, 1); break;
            }
        }
        return units;
    }, [dateRange, zoomLevel, showWeekends]);

    useEffect(() => {
        const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (!viewport) return;

        let frame: number;
        let ticking = false;

        const update = () => {
            const el = viewport as HTMLElement;
            // Buffer range by 15 columns either side to reduce redraw frequency
            const startCol = Math.max(0, Math.floor(el.scrollLeft / columnWidth) - 15);
            const endCol = Math.min(timelineUnits.length - 1, Math.ceil((el.scrollLeft + el.clientWidth) / columnWidth) + 15);

            setVisibleColRange(prev => {
                const currentLeftCol = Math.floor(el.scrollLeft / columnWidth);
                const currentRightCol = Math.ceil((el.scrollLeft + el.clientWidth) / columnWidth);

                // Only trigger a React re-render if we get within 5 columns of our current buffered edge
                if (currentLeftCol < prev.start + 5 || currentRightCol > prev.end - 5) {
                    return { start: startCol, end: endCol };
                }
                return prev;
            });
            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                frame = requestAnimationFrame(update);
                ticking = true;
            }
        };

        viewport.addEventListener('scroll', onScroll, { passive: true });
        update();
        return () => {
            cancelAnimationFrame(frame);
            viewport.removeEventListener('scroll', onScroll);
        };
    }, [columnWidth, timelineUnits?.length]);

    const majorUnits = useMemo(() => {
        const units: { label: string; labelWithYear: string; count: number, left: number, width: number }[] = [];
        let currentLeftOffset = 0;

        timelineUnits.forEach((unit, i) => {
            const boundaryDate = getMajorBoundaryDate(unit, i, zoomLevel);
            if (boundaryDate || units.length === 0) {
                const effectiveDate = boundaryDate || unit;
                // Always show "Month Year" in every header block for all zoom modes
                const fullLabel = format(effectiveDate, "MMMM yyyy");
                units.push({
                    label: fullLabel,
                    labelWithYear: fullLabel,
                    count: 1,
                    left: currentLeftOffset,
                    width: columnWidth
                });
            } else {
                units[units.length - 1].count++;
                units[units.length - 1].width += columnWidth;
            }
            currentLeftOffset += columnWidth;
        });
        return units;
    }, [timelineUnits, zoomLevel, columnWidth]);

    useEffect(() => {
        const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (!viewport) return;
        let frame: number;
        let extendTimer: ReturnType<typeof setTimeout> | null = null;
        let extending = false;

        const update = () => {
            const el = viewport as HTMLElement;
            const distFromEnd = el.scrollWidth - el.scrollLeft - el.clientWidth;
            const distFromStart = el.scrollLeft;

            if (!extending && distFromEnd < EDGE_THRESHOLD_PX) {
                extending = true;
                if (extendTimer) clearTimeout(extendTimer);
                extendTimer = setTimeout(() => {
                    setDateRange(prev => ({ ...prev, end: addDays(prev.end, EXTEND_DAYS) }));
                    setTimeout(() => { extending = false; }, 300);
                }, 80); // 80ms debounce  Eimperceptible delay, eliminates mid-scroll re-renders
            } else if (!extending && distFromStart < EDGE_THRESHOLD_PX) {
                extending = true;
                if (extendTimer) clearTimeout(extendTimer);
                extendTimer = setTimeout(() => {
                    const addedWidth = EXTEND_DAYS * columnWidth;
                    setDateRange(prev => ({ ...prev, start: subDays(prev.start, EXTEND_DAYS) }));
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            (el as HTMLElement).scrollLeft += addedWidth;
                            extending = false;
                        });
                    });
                }, 80);
            }
        };

        const handleScroll = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => update());
        };

        viewport.addEventListener('scroll', handleScroll, { passive: true });
        update();

        return () => {
            cancelAnimationFrame(frame);
            if (extendTimer) clearTimeout(extendTimer);
            viewport.removeEventListener('scroll', handleScroll);
        };
    }, [majorUnits, columnWidth]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            // Closed tasks filter
            if (!showCompleted && task.status?.type === 'CLOSED' && !task.parentId) return false;
            if (!showCompletedSubtasks && task.status?.type === 'CLOSED' && task.parentId) return false;

            // Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const name = (task.title || task.name || "").toLowerCase();
                const id = (task.id || "").toLowerCase();
                if (!name.includes(q) && !id.includes(q)) return false;
            }

            // Advanced filters
            return filterGroups.conditions.length > 0 ? evaluateGroup(task, filterGroups) : true;
        });
    }, [tasks, searchQuery, filterGroups, customFields, showCompleted, showCompletedSubtasks]);

    const groupedTasks = useMemo(() => {
        const groups: Record<string, Task[]> = {};
        const getGroupKey = (task: Task) => {
            switch (groupBy) {
                case 'status': return task.status?.name || 'No Status';
                case 'assignee': return task.assignees?.[0]?.user?.name || task.assignee?.name || 'Unassigned';
                case 'priority': return task.priority || 'No Priority';
                case 'list': return task.list?.name || 'No List';
                case 'taskType': return task.taskType?.name || 'Default';
                default: return 'All Tasks';
            }
        };

        filteredTasks.forEach(task => {
            const key = getGroupKey(task);
            if (!groups[key]) groups[key] = [];
            groups[key].push(task);
        });
        return groups;
    }, [filteredTasks, groupBy]);

    const dateToUnitIndex = useMemo(() => {
        const map = new Map<number, number>();
        timelineUnits.forEach((unit, i) => {
            // Key = start-of-day timestamp for the unit
            map.set(startOfDay(unit).getTime(), i);
        });
        return map;
    }, [timelineUnits]);

    const getTaskPosition = useCallback((task: Task) => {
        if (!task.startDate && !task.dueDate) return null;
        const start = task.startDate ? new Date(task.startDate) : new Date(task.dueDate!);
        const end = task.dueDate ? new Date(task.dueDate) : new Date(task.startDate!);
        const startTime = Math.min(start.getTime(), end.getTime());
        const endTime = Math.max(start.getTime(), end.getTime());

        const findIdx = (time: number) => {
            const dayKey = startOfDay(new Date(time)).getTime();
            const idx = dateToUnitIndex.get(dayKey);
            if (idx !== undefined) return idx;
            // Fallback: find nearest unit (handles edge cases)
            let best = -1;
            let bestDiff = Infinity;
            timelineUnits.forEach((u, i) => {
                const diff = Math.abs(u.getTime() - time);
                if (diff < bestDiff) { bestDiff = diff; best = i; }
            });
            return best;
        };

        const startIndex = Math.max(0, findIdx(startTime));
        const endIndex = findIdx(endTime);
        const safeEnd = endIndex === -1 ? timelineUnits.length - 1 : endIndex;
        const span = Math.max(1, safeEnd - startIndex + 1);

        return { gridColumnStart: startIndex + 2, gridColumnEnd: `span ${span}` };
    }, [dateToUnitIndex, timelineUnits]);

    const taskBarPositions = useMemo(() => {
        const map = new Map<string, { barLeft: number; barWidth: number; isNarrow: boolean }>();
        filteredTasks.forEach(task => {
            const localOverride = localTaskDates[task.id];
            const effectiveTask = localOverride ? { ...task, ...localOverride } : task;
            const pos = getTaskPosition(effectiveTask);
            if (!pos) return;
            const barLeft = (pos.gridColumnStart - 2) * columnWidth;
            const rawWidth = (parseInt(pos.gridColumnEnd.split(' ')[1]) * columnWidth) - 4;
            const barWidth = Math.max(rawWidth, 20);
            map.set(task.id, { barLeft, barWidth, isNarrow: barWidth < 60 });
        });
        return map;
    }, [filteredTasks, localTaskDates, getTaskPosition, columnWidth]);

    // Pre-compute lane packing for ALL groups  Eused by both background grid and task bars
    const laneGroups = useMemo(() => {
        const labelReserveCols = Math.ceil(250 / Math.max(columnWidth, 1));
        const narrowThresholdCols = Math.ceil(60 / Math.max(columnWidth, 1));

        return Object.entries(groupedTasks).map(([groupKey, groupTasks]) => {
            const sorted = [...groupTasks].sort((a, b) => {
                const aT = a.startDate
                    ? new Date(a.startDate).getTime()
                    : a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                const bT = b.startDate
                    ? new Date(b.startDate).getTime()
                    : b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                return aT - bT;
            });

            const lanes: Task[][] = [];
            const laneEnd: number[] = [];
            const noDateTasks: Task[] = [];

            sorted.forEach(task => {
                // Use pre-computed positions (O(1) lookup) instead of recomputing
                const pos = taskBarPositions.get(task.id);
                if (!pos && !task.startDate && !task.dueDate) {
                    noDateTasks.push(task);
                    return;
                }
                if (!pos) return; // task has dates but no position (shouldn't happen)

                const startCol = Math.round(pos.barLeft / columnWidth) + 2;
                const barCols = Math.round(pos.barWidth / columnWidth);
                const endCol = startCol + barCols;
                const isNarrow = barCols < narrowThresholdCols;
                const reservedEndCol = isNarrow ? endCol + labelReserveCols : endCol + 1;

                let placed = false;
                for (let i = 0; i < lanes.length; i++) {
                    if (laneEnd[i] <= startCol) {
                        lanes[i].push(task);
                        laneEnd[i] = reservedEndCol;
                        placed = true;
                        break;
                    }
                }
                if (!placed) { lanes.push([task]); laneEnd.push(reservedEndCol); }
            });

            return { groupKey, lanes, noDateTasks };
        });
    }, [groupedTasks, taskBarPositions, columnWidth]);

    const timelineRowEntries = useMemo(
        () =>
            buildTimelineRowEntries({
                laneGroups,
                groupBy,
                collapsedGroups,
            }),
        [laneGroups, groupBy, collapsedGroups]
    );

    const timelineVirtualRowCount = useMemo(
        () => getTimelineVirtualRowCount(timelineRowEntries),
        [timelineRowEntries]
    );

    const getTimelineVirtualRowHeight = useCallback(
        (index: number) => {
            if (index >= timelineRowEntries.length) return TIMELINE_ROW_HEIGHT;
            return getTimelineRowHeight(timelineRowEntries[index]);
        },
        [timelineRowEntries]
    );

    const { virtualIndices, shouldVirtualize: shouldVirtualizeTimelineRows, totalSize: timelineRowsTotalHeight } =
        useVirtualRowWindow(scrollAreaRef, timelineVirtualRowCount, {
            estimateSize: getTimelineVirtualRowHeight,
            deps: [timelineRowEntries.length, groupBy],
        });

    const resolveTimelineRowEntry = useCallback(
        (rowIndex: number): TimelineRowEntry | "filler" => {
            if (rowIndex >= timelineRowEntries.length) return "filler";
            return timelineRowEntries[rowIndex];
        },
        [timelineRowEntries]
    );

    const unscheduledTasks = useMemo(() => {
        return tasks.filter(t => !t.startDate && !t.dueDate && t.status?.type !== "CLOSED");
    }, [tasks]);

    const overdueTasks = useMemo(() => {
        const now = new Date();
        return filteredTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status?.type !== "CLOSED");
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
                valA = a.assignees?.[0]?.user?.name || a.assignee?.name || ""; valB = b.assignees?.[0]?.user?.name || b.assignee?.name || "";
            } else if (rightSidebarSortBy === "listname") {
                valA = a.list?.name || ""; valB = b.list?.name || "";
            }
            if (valA < valB) return rightSidebarSortDesc ? 1 : -1;
            if (valA > valB) return rightSidebarSortDesc ? -1 : 1;
            return 0;
        });
        return sorted;
    }, [sidebarTasks, rightSidebarSortBy, rightSidebarSortDesc, rightSidebarSearchText]);

    // getTaskPosition has been moved up to use memoized values

    const nowIndicatorPos = useMemo(() => {
        if (timelineUnits.length === 0) return null;
        const nowMs = currentTime.getTime();

        const unitIndex = timelineUnits.findIndex((unit, i) => {
            const nextUnit = timelineUnits[i + 1] || (() => {
                switch (zoomLevel) {
                    case 'hours': return addHours(unit, 1);
                    case 'months': return addDays(unit, 1);
                    default: return addDays(unit, 1);
                }
            })();
            return nowMs >= unit.getTime() && nowMs < nextUnit.getTime();
        });

        if (unitIndex !== -1) {
            const currentUnit = timelineUnits[unitIndex];
            const nextUnit = timelineUnits[unitIndex + 1] || (() => {
                switch (zoomLevel) {
                    case 'hours': return addHours(currentUnit, 1);
                    case 'months': return addDays(currentUnit, 1);
                    case '7_days': return addDays(currentUnit, 1);
                    case '14_days': return addDays(currentUnit, 1);
                    default: return addDays(currentUnit, 1);
                }
            })();

            const totalDuration = Math.max(1, nextUnit.getTime() - currentUnit.getTime());
            const elapsed = nowMs - currentUnit.getTime();
            const ratio = Math.min(1, Math.max(0, elapsed / totalDuration));

            return (unitIndex * columnWidth) + (ratio * columnWidth);
        }

        // Fallback when "today" isn't represented in timelineUnits (for example, weekends hidden).
        // Place the indicator at the nearest visible boundary so "now" never disappears.
        if (nowMs <= timelineUnits[0].getTime()) return 0;
        if (nowMs >= timelineUnits[timelineUnits.length - 1].getTime()) return (timelineUnits.length - 1) * columnWidth;
        for (let i = 0; i < timelineUnits.length; i++) {
            if (timelineUnits[i].getTime() > nowMs) return i * columnWidth;
        }
        return (timelineUnits.length - 1) * columnWidth;
    }, [timelineUnits, zoomLevel, currentTime, columnWidth]);

    const scrollToToday = () => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                const targetPos = nowIndicatorPos !== null ? nowIndicatorPos : (todayRef.current as HTMLElement)?.offsetLeft || 0;
                (scrollContainer as HTMLElement).scrollLeft = targetPos - (scrollContainer as HTMLElement).clientWidth / 2;
            }
        }
    };

    const initialScrollRef = useRef<{ zoom: string | null }>({ zoom: null });

    useEffect(() => {
        if (!scrollAreaRef.current) return;
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (!scrollContainer) return;

        if (initialScrollRef.current.zoom !== zoomLevel && timelineUnits.length > 0) {
            const targetDate = subDays(currentTime, 2);

            const unitIndex = timelineUnits.findIndex((unit, i) => {
                const nextUnit = timelineUnits[i + 1] || (() => {
                    switch (zoomLevel) {
                        case 'hours': return addHours(unit, 1);
                        case 'months': return addDays(unit, 1);
                        case '7_days': return addDays(unit, 1);
                        case '14_days': return addDays(unit, 1);
                        default: return addDays(unit, 1);
                    }
                })();
                return targetDate.getTime() >= unit.getTime() && targetDate.getTime() < nextUnit.getTime();
            });

            if (unitIndex !== -1) {
                const pxToScroll = unitIndex * columnWidth;
                setTimeout(() => {
                    (scrollContainer as HTMLElement).scrollLeft = pxToScroll;
                }, 50);
            } else if (nowIndicatorPos !== null) {
                // Approximate fallback
                setTimeout(() => {
                    (scrollContainer as HTMLElement).scrollLeft = Math.max(0, nowIndicatorPos - 2 * columnWidth);
                }, 50);
            }
            initialScrollRef.current.zoom = zoomLevel;
        }
    }, [zoomLevel, timelineUnits, currentTime, columnWidth, nowIndicatorPos]);

    // ── Drag-resize handlers ────────────────────────────────────────────────
    const handleResizeStart = useCallback((e: React.MouseEvent, task: Task, handle: 'left' | 'right') => {
        e.preventDefault();
        e.stopPropagation();
        const cached = taskBarPositions.get(task.id);
        if (!cached) return;

        isDraggingRef.current = true;
        dragStateRef.current = {
            taskId: task.id,
            handle,
            startX: e.clientX,
            originalStartDate: task.startDate ? new Date(task.startDate) : null,
            originalDueDate: task.dueDate ? new Date(task.dueDate) : null,
            baseBarLeft: cached.barLeft,
            baseBarWidth: cached.barWidth,
            currentBarLeft: cached.barLeft,
            currentBarWidth: cached.barWidth,
        };
        setDraggedBarStyle({ taskId: task.id, barLeft: cached.barLeft, barWidth: cached.barWidth });
    }, [taskBarPositions]);

    useEffect(() => {
        if (!draggedBarStyle) return;

        const applyDelta = (date: Date, units: number): Date => {
            switch (zoomLevel) {
                case 'hours': return addHours(date, units);
                case 'months': return addDays(date, units);
                default: return addDays(date, units);
            }
        };

        const onMouseMove = (e: MouseEvent) => {
            const drag = dragStateRef.current;
            if (!drag) return;
            const deltaX = e.clientX - drag.startX;
            let newWidth = drag.baseBarWidth;
            let newLeft = drag.baseBarLeft;

            if (drag.handle === 'right') {
                const snapped = Math.round((drag.baseBarWidth + deltaX) / columnWidth) * columnWidth;
                newWidth = Math.max(columnWidth, snapped);
            } else {
                const rightEdge = drag.baseBarLeft + drag.baseBarWidth;
                const rawLeft = drag.baseBarLeft + deltaX;
                const snappedLeft = Math.round(rawLeft / columnWidth) * columnWidth;
                newLeft = Math.max(0, snappedLeft);
                newWidth = Math.max(columnWidth, rightEdge - newLeft);
            }
            drag.currentBarLeft = newLeft;
            drag.currentBarWidth = newWidth;
            setDraggedBarStyle({ taskId: drag.taskId, barLeft: newLeft, barWidth: newWidth });
        };

        const onMouseUp = async (e: MouseEvent) => {
            const snap = dragStateRef.current;
            dragStateRef.current = null;
            setDraggedBarStyle(null);
            setTimeout(() => { isDraggingRef.current = false; }, 50);

            if (!snap) return;

            const deltaX = e.clientX - snap.startX;
            const deltaUnits = Math.round(deltaX / columnWidth);
            if (deltaUnits === 0) return;

            let newStartDate = snap.originalStartDate ? new Date(snap.originalStartDate) : null;
            let newDueDate = snap.originalDueDate ? new Date(snap.originalDueDate) : null;

            if (snap.handle === 'right') {
                if (!newDueDate && newStartDate) newDueDate = new Date(newStartDate);
                if (!newDueDate && !newStartDate) newDueDate = new Date();
                if (newDueDate) newDueDate = applyDelta(newDueDate, deltaUnits);
            } else {
                if (!newStartDate && newDueDate) newStartDate = new Date(newDueDate);
                if (!newStartDate && !newDueDate) newStartDate = new Date();
                if (newStartDate) newStartDate = applyDelta(newStartDate, deltaUnits);
            }

            // Commit local override immediately so the bar stays in place
            // while the server mutation + refetch is in flight.
            const dateOverride: { startDate?: Date | null; dueDate?: Date | null; committed: boolean } = { committed: false };

            if (snap.handle === 'right') {
                dateOverride.dueDate = newDueDate;
                if (!snap.originalDueDate && snap.originalStartDate) dateOverride.startDate = newStartDate;
            } else {
                dateOverride.startDate = newStartDate;
                if (!snap.originalStartDate && snap.originalDueDate) dateOverride.dueDate = newDueDate;
            }

            setLocalTaskDates(prev => ({ ...prev, [snap.taskId]: dateOverride }));

            try {
                await updateTaskDatesMutation.mutateAsync({
                    id: snap.taskId,
                    ...(snap.handle === 'right'
                        ? { dueDate: newDueDate ? newDueDate.toISOString() : null, ...(!snap.originalDueDate ? { startDate: newStartDate ? newStartDate.toISOString() : null } : {}) }
                        : { startDate: newStartDate ? newStartDate.toISOString() : null, ...(!snap.originalStartDate ? { dueDate: newDueDate ? newDueDate.toISOString() : null } : {}) }),
                } as any);
                setLocalTaskDates(prev => prev[snap.taskId]
                    ? { ...prev, [snap.taskId]: { ...prev[snap.taskId], committed: true } }
                    : prev
                );
                void utils.task.list.invalidate(taskListInput);
            } catch (err) {
                console.error("MUTATION FAILED:", err);
                toast.error('Failed to update task dates');
                setLocalTaskDates(prev => {
                    const next = { ...prev };
                    delete next[snap.taskId];
                    return next;
                });
            }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [draggedBarStyle, columnWidth, zoomLevel, updateTaskDatesMutation, utils, taskListInput]);

    useEffect(() => {
        if (!ghostDragState) return;

        const applyDelta = (date: Date, units: number): Date => {
            switch (zoomLevel) {
                case 'hours': return addHours(date, units);
                case 'months': return addWeeks(date, units);
                default: return addDays(date, units);
            }
        };

        const onMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - ghostDragState.startX;
            const deltaUnits = Math.round(deltaX / columnWidth);

            setGhostDragState(prev => {
                if (!prev) return null;
                if (prev.handle === 'right') {
                    return { ...prev, currentBarWidth: Math.max(columnWidth, prev.baseBarWidth + deltaX) };
                } else {
                    const rightEdge = prev.baseBarLeft + prev.baseBarWidth;
                    const rawLeft = prev.baseBarLeft + deltaX;
                    const snappedLeft = Math.round(rawLeft / columnWidth) * columnWidth;
                    const newLeft = Math.max(0, snappedLeft);
                    const newWidth = Math.max(columnWidth, rightEdge - newLeft);
                    return { ...prev, currentBarLeft: newLeft, currentBarWidth: newWidth };
                }
            });

            if (ghostDragState.handle === 'right') {
                const newDue = applyDelta(ghostDragState.originalDueDate, deltaUnits);
                setCellCreateStartDate(prevStart => {
                    if (prevStart && newDue >= prevStart) {
                        setCellCreateDueDate(newDue);
                    }
                    return prevStart;
                });
            } else {
                const newStart = applyDelta(ghostDragState.originalStartDate, deltaUnits);
                setCellCreateDueDate(prevDue => {
                    if (prevDue && newStart <= prevDue) {
                        setCellCreateStartDate(newStart);
                        setCellModalData(prev => prev ? { ...prev, date: newStart } : null);
                    }
                    return prevDue;
                });
            }
        };

        const onMouseUp = () => {
            setGhostDragState(null);
            setTimeout(() => { isDraggingRef.current = false; }, 50);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [ghostDragState, columnWidth, zoomLevel]);

    // Clear localTaskDates overrides once the live task data from the server
    // has caught up to the locally committed dates.
    // Only clears entries where committed:true (mutation has resolved) to avoid
    // the race where the effect runs before the server responds and sees
    // override === old-server-data ↁEwrongly clears immediately.
    useEffect(() => {
        if (Object.keys(localTaskDates).length === 0) return;
        setLocalTaskDates(prev => {
            const next = { ...prev };
            let changed = false;
            Object.entries(prev).forEach(([taskId, override]) => {
                if (!override.committed) return; // not yet confirmed by server
                const serverTask = tasks.find(t => t.id === taskId);
                if (!serverTask) { delete next[taskId]; changed = true; return; }
                const toTime = (d: Date | null | undefined) => d ? new Date(d).getTime() : null;
                const startMatches = !('startDate' in override) || toTime(override.startDate as any) === toTime(serverTask.startDate as any);
                const dueMatches = !('dueDate' in override) || toTime(override.dueDate as any) === toTime(serverTask.dueDate as any);
                if (startMatches && dueMatches) {
                    delete next[taskId];
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [tasks, localTaskDates]);

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


    const openTimelineCellModal = useCallback(
        (unit: Date, rect: DOMRect, rowId: string) => {
            const isMultiDaySpan = zoomLevel === "months" || zoomLevel === "weeks";
            const startDate = cellDragRange?.startDate ?? unit;
            const endDate = cellDragRange?.endDate ?? (isMultiDaySpan ? addDays(unit, 6) : unit);
            setCellCreateStartDate(startDate);
            setCellCreateDueDate(endDate);
            setCellCreateStatusId(allAvailableStatuses[0]?.id ?? null);
            setCellCreateAssigneeIds([]);
            setCellCreatePriority(null);
            setCellCreateTaskTypeId(
                availableTaskTypes.find((t: any) => t.isDefault)?.id ?? availableTaskTypes[0]?.id ?? null
            );
            setCellCreateName("");
            const canvas = document.getElementById("timeline-canvas");
            const offsetTop = canvas ? rect.top - canvas.getBoundingClientRect().top : undefined;
            setCellModalData({ date: unit, rect, rowId, offsetTop });
            setCellModalTab("find");
            setCellSearchQuery("");
        },
        [cellDragRange, zoomLevel, allAvailableStatuses, availableTaskTypes]
    );

    const renderTimelineColumnRow = useCallback(
        (
            rowIdx: number,
            colIdx: number,
            unit: Date,
            isMultiDaySpan: boolean,
            hoverWidth: string
        ) => {
            const entry = resolveTimelineRowEntry(rowIdx);
            const hoverCell = (rowId: string) => (e: React.MouseEvent<HTMLDivElement>) => {
                openTimelineCellModal(unit, e.currentTarget.getBoundingClientRect(), rowId);
            };
            const hoverOverlay = (
                <div
                    className="absolute left-1 z-[1] h-[calc(100%-4px)] flex-none rounded-md bg-zinc-200/0 group-hover/cell:bg-zinc-200/80 transition-colors duration-100 pointer-events-none"
                    style={{ width: hoverWidth }}
                />
            );

            if (entry === "filler") {
                return (
                    <div
                        key={`col-filler-${colIdx}-${rowIdx}`}
                        className="relative h-10 mb-1 flex items-center justify-center cursor-pointer pointer-events-auto group/cell"
                        onClick={hoverCell(`filler_${rowIdx}`)}
                    >
                        {hoverOverlay}
                    </div>
                );
            }

            switch (entry.kind) {
                case "group-gap":
                    return <div key={`col-gap-${colIdx}-${rowIdx}`} className="h-3" aria-hidden />;
                case "group-header":
                    return (
                        <div
                            key={`col-header-${colIdx}-${rowIdx}`}
                            className="relative h-10 flex items-center justify-center pointer-events-auto cursor-pointer group/cell"
                            onClick={hoverCell(`header_${entry.groupKey}`)}
                        >
                            <div
                                className="absolute left-1 z-10 h-[calc(100%-4px)] flex-none rounded-md bg-zinc-200/0 group-hover/cell:bg-zinc-200/80 transition-colors duration-100 pointer-events-none"
                                style={{ width: hoverWidth }}
                            />
                        </div>
                    );
                case "lane": {
                    const isOccupied = entry.laneTasks.some((task) => {
                        const localOverride = localTaskDates[task.id];
                        const effectiveTask = localOverride ? { ...task, ...localOverride } : task;
                        const pos = getTaskPosition(effectiveTask as Task);
                        if (!pos) return false;
                        const startCol = pos.gridColumnStart - 2;
                        const span = parseInt(pos.gridColumnEnd.split(" ")[1]);
                        const endCol = startCol + span - 1;
                        return colIdx >= startCol && colIdx <= endCol;
                    });
                    return (
                        <div
                            key={`col-lane-${colIdx}-${rowIdx}`}
                            className={cn(
                                "relative h-10 mb-1 flex items-center justify-center group/cell",
                                isOccupied ? "pointer-events-none" : "cursor-pointer pointer-events-auto"
                            )}
                            onClick={(e) => {
                                if (isOccupied) return;
                                hoverCell(`lane_${entry.groupKey}_${entry.laneIdx}`)(e);
                            }}
                        >
                            {!isOccupied && hoverOverlay}
                        </div>
                    );
                }
                case "no-date":
                    return (
                        <div
                            key={`col-nd-${colIdx}-${rowIdx}`}
                            className="relative h-10 mb-1 flex items-center justify-center cursor-pointer pointer-events-auto group/cell"
                            onClick={hoverCell(`nd_${entry.groupKey}_${entry.taskId}`)}
                        >
                            {hoverOverlay}
                        </div>
                    );
                default:
                    return null;
            }
        },
        [resolveTimelineRowEntry, openTimelineCellModal, localTaskDates, getTaskPosition]
    );

    const renderTimelineBarRow = useCallback(
        (rowIdx: number) => {
            const entry = resolveTimelineRowEntry(rowIdx);
            if (entry === "filler") {
                return <div key={`bar-filler-${rowIdx}`} className="h-10 mb-1" aria-hidden />;
            }

            switch (entry.kind) {
                case "group-gap":
                    return <div key={`bar-gap-${rowIdx}`} className="h-3" aria-hidden />;
                case "group-header":
                    return <div key={`bar-header-${rowIdx}`} className="h-10" />;
                case "lane":
                    return (
                        <div key={`bar-lane-${rowIdx}`} className="h-10 relative mb-1">
                            {entry.laneTasks.map((task) => {
                                const cached = taskBarPositions.get(task.id);
                                const isDraggingThis = draggedBarStyle?.taskId === task.id;
                                const barLeft = isDraggingThis ? draggedBarStyle!.barLeft : (cached?.barLeft ?? 0);
                                const barWidth = isDraggingThis ? draggedBarStyle!.barWidth : (cached?.barWidth ?? 20);
                                const isNarrow = isDraggingThis ? barWidth < 60 : (cached?.isNarrow ?? false);
                                const taskName = task.title || task.name || "";
                                if (!cached && !isDraggingThis) return null;

                                return (
                                    <TaskActionsPopover
                                        key={task.id}
                                        task={task as any}
                                        context={spaceId ? "SPACE" : projectId ? "PROJECT" : "GENERAL"}
                                        contextId={(spaceId || projectId) as any}
                                        workspaceId={resolvedWorkspaceId as string}
                                        users={users as any}
                                        lists={[]}
                                        defaultListId={listId}
                                        availableStatuses={allAvailableStatuses}
                                        openOnContextMenu
                                        onDelete={async (id) => {
                                            try {
                                                await deleteTaskMutation.mutateAsync({ id });
                                            } catch (e) {}
                                        }}
                                        onUpdate={async (id, data) => {
                                            try {
                                                await updateTaskMutation.mutateAsync({ id, ...(data as any) });
                                            } catch (e) {}
                                        }}
                                        onAction={() => {}}
                                    >
                                        <div
                                            className="absolute top-1 h-8 group/bar pointer-events-auto"
                                            style={{
                                                left: `${barLeft}px`,
                                                width: `${barWidth}px`,
                                                cursor: isDraggingThis ? "col-resize" : "pointer",
                                                zIndex: isDraggingThis ? 50 : 10,
                                            }}
                                            onClick={(e) => {
                                                if (isDraggingRef.current) return;
                                                e.stopPropagation();
                                                onTaskSelect ? onTaskSelect(task.id) : setSelectedTaskId(task.id);
                                            }}
                                            onMouseEnter={(e) => {
                                                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                                if (isNarrow) {
                                                    setHoveredTask(task as Task);
                                                    setHoveredBarRect(e.currentTarget.getBoundingClientRect());
                                                    setInfoIconRect(null);
                                                }
                                            }}
                                            onMouseLeave={() => {
                                                hoverTimeoutRef.current = setTimeout(() => {
                                                    if (popoverDropdownOpenRef.current) return;
                                                    setHoveredTask(null);
                                                    setHoveredBarRect(null);
                                                    setInfoIconRect(null);
                                                    setEditingHoveredTaskName(false);
                                                }, 250);
                                            }}
                                        >
                                            <div
                                                className="absolute left-0 top-0 bottom-0 w-3 flex items-center justify-center opacity-0 group-hover/bar:opacity-100 transition-opacity cursor-col-resize z-20"
                                                onMouseDown={(e) => handleResizeStart(e, task as Task, "left")}
                                            >
                                                <div className="w-[2.5px] h-4 rounded-full bg-white/90 shadow-sm" />
                                            </div>
                                            <div
                                                className={cn(
                                                    "h-full rounded-sm border shadow-sm flex items-center overflow-hidden select-none relative",
                                                    task.status?.type === "CLOSED"
                                                        ? "opacity-40 grayscale-[0.5]"
                                                        : "opacity-100",
                                                    !isDraggingThis && "group-hover/bar:ring-2 group-hover/bar:ring-violet-400/50"
                                                )}
                                                style={{
                                                    backgroundColor: task.status?.color || "#6366F1",
                                                    border: `1px solid ${task.status?.color}cc`,
                                                }}
                                            >
                                                {!isNarrow && (
                                                    <div className="flex items-center gap-2 truncate w-full relative z-10 pl-3.5 pr-2">
                                                        {task.assignees?.[0]?.user?.image && (
                                                            <Avatar className="h-5 w-5 border-white/25 border shadow-sm shrink-0">
                                                                <AvatarImage src={task.assignees[0].user.image} />
                                                                <AvatarFallback className="text-[7px] bg-white/10 text-white font-bold">
                                                                    {task.assignees[0].user.name?.slice(0, 2).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        )}
                                                        <span className="text-[12px] font-bold text-white truncate drop-shadow-sm flex-1">
                                                            {taskName}
                                                        </span>
                                                        <div
                                                            className="opacity-0 group-hover/bar:opacity-100 transition-opacity shrink-0 cursor-pointer mr-1"
                                                            onMouseEnter={(e) => {
                                                                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                setInfoIconRect(rect);
                                                                setHoveredTask(task as Task);
                                                                setHoveredBarRect(null);
                                                            }}
                                                            onMouseLeave={() => {
                                                                hoverTimeoutRef.current = setTimeout(() => {
                                                                    if (popoverDropdownOpenRef.current) return;
                                                                    setHoveredTask(null);
                                                                    setInfoIconRect(null);
                                                                    setEditingHoveredTaskName(false);
                                                                }, 250);
                                                            }}
                                                        >
                                                            <Info className="w-3.5 h-3.5 text-white/80" />
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none rounded-sm" />
                                            </div>
                                            <div
                                                className="absolute right-0 top-0 bottom-0 w-3 flex items-center justify-center opacity-0 group-hover/bar:opacity-100 transition-opacity cursor-col-resize z-20"
                                                onMouseDown={(e) => handleResizeStart(e, task as Task, "right")}
                                            >
                                                <div className="w-[2.5px] h-4 rounded-full bg-white/90 shadow-sm" />
                                            </div>
                                            {isNarrow && (
                                                <span
                                                    className="absolute left-full pl-2 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-zinc-700 pointer-events-none overflow-hidden text-ellipsis whitespace-nowrap"
                                                    style={{ zIndex: 15, maxWidth: "250px" }}
                                                    title={taskName}
                                                >
                                                    {taskName}
                                                </span>
                                            )}
                                        </div>
                                    </TaskActionsPopover>
                                );
                            })}
                        </div>
                    );
                case "no-date":
                    return <div key={`bar-nd-${rowIdx}`} className="h-10 mb-1 invisible" aria-hidden />;
                default:
                    return null;
            }
        },
        [
            resolveTimelineRowEntry,
            taskBarPositions,
            draggedBarStyle,
            spaceId,
            projectId,
            resolvedWorkspaceId,
            users,
            listId,
            allAvailableStatuses,
            deleteTaskMutation,
            updateTaskMutation,
            onTaskSelect,
            handleResizeStart,
        ]
    );


    if (isTasksLoading) {
        return (
            <div className="h-full flex items-center justify-center p-20">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900" />
                    <p className="text-sm font-medium text-zinc-500 tracking-tight">Loading timeline view...</p>
                </div>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="h-full flex flex-col bg-white border border-zinc-200 shadow-sm overflow-hidden text-sm relative">
                {/* Toolbar Area */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 bg-white gap-4 z-50">
                    <div className="flex items-center gap-2.5 shrink-0">
                        <Button variant="outline" size="sm" className="h-8 text-xs text-zinc-600 border-zinc-200 shadow-none px-3.5 rounded-lg hover:bg-zinc-50 transition-all active:scale-95" onClick={scrollToToday}>Today</Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 gap-2 text-xs border-zinc-200 shadow-none px-3 rounded-lg hover:bg-zinc-50 transition-all active:scale-95">
                                    <span className="capitalize">{zoomLevel.replace('_', ' ')}</span>
                                    <ChevronDown className="h-3 w-3 opacity-40 shrink-0" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-32 p-1.5 rounded-xl shadow-xl border-zinc-200/60 z-50">
                                {['days', '7_days', '14_days', 'weeks', 'months'].map((level) => (
                                    <DropdownMenuItem
                                        key={level}
                                        className={cn(
                                            "flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors capitalize",
                                            zoomLevel === level ? "bg-violet-50 text-violet-700" : "text-zinc-600 hover:bg-zinc-100"
                                        )}
                                        onClick={() => setZoomLevel(level as ZoomLevel)}
                                    >
                                        {level.replace('_', ' ')}
                                        {zoomLevel === level && <Check className="ml-auto h-3.5 w-3.5" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

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

                        <DropdownMenu>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={cn(
                                                "h-8 gap-1.5 px-2.5 text-xs font-medium border-zinc-200 transition-colors cursor-pointer rounded-lg",
                                                groupBy !== "none" ? "bg-violet-50 text-violet-700 border-violet-200" : "text-zinc-700 bg-zinc-50 hover:bg-zinc-100"
                                            )}
                                        >
                                            <LayoutList className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">
                                                {groupBy === "none" ? "Group: None" : `Group: ${groupLabel}`}
                                            </span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Group by: {groupBy === "none" ? "None" : groupLabel}</TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="start" className="w-[240px] p-1.5 rounded-xl shadow-xl border-zinc-200/60 z-50">
                                <div className="px-2 py-1.5 mb-1">
                                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Group by</span>
                                </div>
                                <div className="space-y-0.5">
                                    {[
                                        { id: "status", label: "Status", icon: Circle },
                                        { id: "assignee", label: "Assignee", icon: Users },
                                        { id: "priority", label: "Priority", icon: Flag },
                                        { id: "tags", label: "Tags", icon: Tag },
                                        { id: "dueDate", label: "Due date", icon: Calendar },
                                        { id: "taskType", label: "Task type", icon: Box },
                                    ].map((opt) => (
                                        <DropdownMenuItem
                                            key={opt.id}
                                            className={cn(
                                                "flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors",
                                                groupBy === opt.id ? "bg-violet-50 text-violet-700" : "text-zinc-600 hover:bg-zinc-100"
                                            )}
                                            onClick={() => setGroupBy(opt.id)}
                                            onSelect={(e) => e.preventDefault()}
                                        >
                                            <opt.icon className={cn("h-4 w-4", groupBy === opt.id ? "text-violet-500" : "text-zinc-400")} />
                                            <span className="flex-1">{opt.label}</span>
                                            {groupBy === opt.id && <div className="h-1.5 w-1.5 rounded-full bg-violet-600" />}
                                        </DropdownMenuItem>
                                    ))}

                                    {FIELD_CONFIG.filter(f => f.isCustom).length > 0 && (
                                        <>
                                            <DropdownMenuSeparator className="my-1.5 bg-zinc-100" />
                                            <div className="px-2 py-1.5 mb-0.5">
                                                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Custom Fields</span>
                                            </div>
                                            {FIELD_CONFIG.filter(f => f.isCustom).map((f) => {
                                                const Icon = f.icon as any;
                                                return (
                                                    <DropdownMenuItem
                                                        key={f.id}
                                                        className={cn(
                                                            "flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors",
                                                            groupBy === f.id ? "bg-violet-50 text-violet-700" : "text-zinc-600 hover:bg-zinc-100"
                                                        )}
                                                        onClick={() => setGroupBy(f.id)}
                                                        onSelect={(e) => e.preventDefault()}
                                                    >
                                                        <Icon className={cn("h-4 w-4", groupBy === f.id ? "text-violet-500" : "text-zinc-400")} />
                                                        <span className="flex-1 truncate">{f.label}</span>
                                                        {groupBy === f.id && <div className="h-1.5 w-1.5 rounded-full bg-violet-600" />}
                                                    </DropdownMenuItem>
                                                );
                                            })}
                                        </>
                                    )}

                                    {groupBy !== "none" && (
                                        <>
                                            <DropdownMenuSeparator className="my-1.5 bg-zinc-100" />
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

                                    <DropdownMenuSeparator className="my-1.5 bg-zinc-100" />
                                    <DropdownMenuItem
                                        className={cn(
                                            "flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors text-red-600 hover:bg-red-50 hover:text-red-700",
                                            groupBy === "none" && "bg-zinc-100"
                                        )}
                                        onClick={() => setGroupBy("none")}
                                        onSelect={(e) => e.preventDefault()}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="flex-1">Remove grouping</span>
                                    </DropdownMenuItem>
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Popover open={filtersPanelOpen} onOpenChange={(open) => {
                            setFiltersPanelOpen(open);
                            if (open === false) setSavedFiltersPanelOpen(false);
                            if (open === true) {
                                setFieldsPanelOpen(false);
                                setAssigneesPanelOpen(false);
                            }
                        }}>
                            <PopoverTrigger asChild>
                                <div className="relative group/filter inline-flex">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            "h-8 text-xs font-medium pr-7 rounded-lg",
                                            filtersPanelOpen ? "bg-violet-50 text-violet-700 border-violet-200" : "text-zinc-700 border-zinc-200",
                                            appliedFilterCount > 0 && "border-violet-200 bg-violet-50/50 text-violet-700"
                                        )}
                                        onClick={() => { if (!filtersPanelOpen && filterGroups.conditions.length === 0) { addFilterGroup(); } }}
                                    >
                                        <Filter className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline ml-1">
                                            {appliedFilterCount > 0 ? `${appliedFilterCount} Filter${appliedFilterCount !== 1 ? "s" : ""}` : "Filter"}
                                        </span>
                                    </Button>
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
                            showCompleted={showCompleted}
                            showCompletedSubtasks={showCompletedSubtasks}
                            onShowCompletedChange={setShowCompleted}
                            onShowCompletedSubtasksChange={setShowCompletedSubtasks}
                        />

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn("h-8 text-xs font-medium rounded-lg px-3.5", assigneesPanelOpen ? "bg-violet-50 text-violet-700 border-violet-200" : "text-zinc-700 border-zinc-200")}
                                    onClick={() => { setAssigneesPanelOpen(!assigneesPanelOpen); setFiltersPanelOpen(false); }}
                                >
                                    <Users className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline ml-1">Assignee</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Filter by assignee</TooltipContent>
                        </Tooltip>

                        <div className="h-6 w-[1px] bg-zinc-200 mx-1" />

                        <div className="relative group/search">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <Input
                                className="pl-8 h-8 bg-zinc-50/50 border-zinc-200 text-xs rounded-lg w-40 focus:w-64 transition-all"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 text-xs font-medium text-zinc-700 border-zinc-200 rounded-lg" onClick={() => setCustomizePanelOpen(true)}>
                                    <Settings className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline ml-1">Customize</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Customize view</TooltipContent>
                        </Tooltip>

                        <div className="flex items-center rounded-lg overflow-hidden border border-zinc-900 ml-1 shadow-sm">
                            <Button
                                className="h-8 gap-1.5 px-3 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white border-0 rounded-none border-r border-white/10"
                                onClick={() => setSelectedTaskId("new")}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Task
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="icon" className="h-8 w-8 bg-zinc-900 text-white hover:bg-black rounded-none transition-colors border-0">
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 p-1 shadow-2xl rounded-xl border-zinc-200">
                                    <DropdownMenuItem className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors" onClick={() => setSelectedTaskId("new")}>
                                        <Plus className="h-4 w-4 text-zinc-400" />
                                        <span className="text-sm font-medium">New task</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors">
                                        <ListIcon className="h-4 w-4 text-zinc-400" />
                                        <span className="text-sm font-medium">New list</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn("h-8 gap-1.5 px-3 text-xs font-medium border-zinc-200 rounded-lg shadow-sm transition-all ml-1", isRightSidebarExpanded ? "bg-violet-50 text-violet-700 border-violet-200 ring-1 ring-violet-200/50" : "text-zinc-700 bg-white hover:bg-zinc-50")}
                                    onClick={() => setIsRightSidebarExpanded(!isRightSidebarExpanded)}
                                >
                                    <PanelRightClose className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Backlog</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Toggle backlog sidebar</TooltipContent>
                        </Tooltip>

                        <TaskCreationModal
                            context={spaceId ? "SPACE" : projectId ? "PROJECT" : "GENERAL"}
                            contextId={spaceId || projectId}
                            workspaceId={resolvedWorkspaceId}
                            users={users}
                            lists={listsData?.items as any}
                            defaultListId={listId}
                            availableStatuses={allAvailableStatuses}
                            defaultStartDate={creationStartDate}
                            defaultDueDate={creationDueDate}
                            open={selectedTaskId === "new"}
                            onOpenChange={(open) => {
                                if (!open) {
                                    setSelectedTaskId(null);
                                    setCreationStartDate(null);
                                    setCreationDueDate(null);
                                }
                            }}
                            trigger={<span className="sr-only" />}
                        />
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">

                    {/* Flexible Timeline Grid */}
                    <div className="flex-1 overflow-hidden flex flex-col min-w-0 bg-zinc-50/20 relative">
                        <div className="absolute right-2 top-[96px] z-40 w-6 rounded-md border border-zinc-200 bg-white/95 shadow-sm backdrop-blur-sm overflow-hidden">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-none text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                                onClick={handleZoomIn}
                                disabled={!canZoomIn}
                                title="Zoom in"
                            >
                                <ZoomIn className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-none border-t border-zinc-200 text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                                onClick={handleZoomOut}
                                disabled={!canZoomOut}
                                title="Zoom out"
                            >
                                <ZoomOut className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                        <ScrollArea className="flex-1 w-full h-full [&_[data-radix-scroll-area-viewport]>div]:!block [&_[data-radix-scroll-area-viewport]>div]:!min-h-full" ref={scrollAreaRef} type="always">
                            <div className="relative flex flex-col min-h-full" style={{ width: timelineUnits.length * columnWidth }}>
                                {/* Now Indicator */}
                                {nowIndicatorPos !== null && (
                                    <>
                                        {/* Line spans full height, z-20 renders cleanly under the frozen sticky header (z-30) when scrolled up */}
                                        <div
                                            className="absolute w-[1px] bg-red-500 z-20 pointer-events-none"
                                            style={{ left: `${nowIndicatorPos}px`, top: '92px', bottom: 0 }}
                                        />

                                        {/* Dot Track holds the target at z-40 so the dot remains properly anchored ON TOP of the header gap */}
                                        <div
                                            className="absolute w-[1px] z-40 pointer-events-none"
                                            style={{ left: `${nowIndicatorPos}px`, top: '92px', bottom: 0 }}
                                        >
                                            <div
                                                className="sticky left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] border-2 border-white"
                                                style={{ top: '92px' }}
                                            />
                                        </div>
                                    </>
                                )}
                                {/* Multilevel Header */}
                                <div className="sticky top-0 z-30 flex flex-col bg-white/95 backdrop-blur-md border-b border-zinc-200">
                                    <div className="h-10 flex">
                                        {majorUnits.map((major, i) => (
                                            <div
                                                key={i}
                                                style={{ width: major.width }}
                                                className="flex items-center text-[15px] font-semibold text-zinc-800 shrink-0 bg-white/50 backdrop-blur-sm"
                                            >
                                                <span
                                                    id={`major-header-${i}`}
                                                    data-label={major.label}
                                                    data-label-year={major.labelWithYear}
                                                    className="sticky left-4 z-10 min-w-max"
                                                >
                                                    {major.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="h-[52px] flex">
                                        {timelineUnits.map((unit, i) => {
                                            const isNow = isTodayFns(unit);
                                            const isWeekend = showWeekends && (unit.getDay() === 0 || unit.getDay() === 6);

                                            // Days mode: single letter weekday on top, date number below (ClickUp style)
                                            let subLabelTop: string;
                                            let subLabelBottom: string;
                                            let showLabels = true;

                                            if (zoomLevel === 'days') {
                                                subLabelTop = format(unit, 'EEEEE'); // Single letter: M T W T F S S
                                                subLabelBottom = format(unit, 'd');
                                            } else if (zoomLevel === 'weeks') {
                                                subLabelTop = "";
                                                subLabelBottom = format(unit, 'd');
                                            } else if (zoomLevel === 'months') {
                                                subLabelTop = "";
                                                subLabelBottom = i % 7 === 0 ? format(unit, 'd') : "";
                                                showLabels = i % 7 === 0;
                                            } else if (['7_days', '14_days'].includes(zoomLevel)) {
                                                subLabelTop = format(unit, 'EEE');
                                                subLabelBottom = format(unit, 'd');
                                            } else {
                                                subLabelTop = format(unit, 'EEEEE');
                                                subLabelBottom = format(unit, 'd');
                                            }

                                            return (
                                                <div
                                                    key={i}
                                                    ref={isNow ? todayRef : null}
                                                    className={cn(
                                                        "flex flex-col relative shrink-0 select-none",
                                                        zoomLevel === 'months' ? "justify-center items-start pl-1.5 overflow-visible" : "items-center justify-center",
                                                        isNow && "bg-transparent"
                                                    )}
                                                    style={{
                                                        width: columnWidth,
                                                        ...(isWeekend && !isNow ? {
                                                            backgroundColor: '#f9f9fb'
                                                        } : {})
                                                    }}
                                                >
                                                    {(columnWidth >= 20 || zoomLevel === 'months') && showLabels && (
                                                        <>
                                                            {subLabelTop && (
                                                                <span className={cn(
                                                                    "text-[10px] uppercase font-semibold leading-none mb-1",
                                                                    isNow ? "text-red-500" : isWeekend ? "text-zinc-400" : "text-zinc-400"
                                                                )}>{subLabelTop}</span>
                                                            )}
                                                            {isNow ? (
                                                                <div className={cn("rounded-full bg-red-500 text-white flex items-center justify-center text-[11px] font-bold shadow-sm z-10", zoomLevel === 'months' ? "-ml-1.5 h-6 w-6" : "h-6 w-6")}>
                                                                    {subLabelBottom}
                                                                </div>
                                                            ) : (
                                                                <span className={cn(
                                                                    "text-[13px] font-bold tabular-nums leading-none",
                                                                    isWeekend ? "text-zinc-400" : "text-zinc-600"
                                                                )}>{subLabelBottom}</span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Canvas Area */}
                                <div id="timeline-canvas" className="relative pt-2 flex-1 min-h-full pb-32 bg-white" style={{ width: timelineUnits.length * columnWidth }}>
                                    {/* 2D clickable background grid  Ecolumns ÁErow-aligned lanes */}
                                    <div
                                        className="absolute inset-0 z-0 pt-2 pointer-events-none"
                                        style={columnBackgroundStyle}
                                    >
                                        {/* Today highlight  Esingle div, no per-column loop */}
                                        {timelineUnits.map((unit, i) => isTodayFns(unit) ? (
                                            <div
                                                key="today"
                                                className="absolute top-0 bottom-0 bg-blue-50/30 pointer-events-none"
                                                style={{ left: i * columnWidth, width: columnWidth }}
                                            />
                                        ) : null)}

                                        {/* Month boundaries explicitly drawn for month mode */}
                                        {zoomLevel === 'months' && majorUnits.map((major, i) => (
                                            <div
                                                key={`month-border-${i}`}
                                                className="absolute top-0 bottom-0 pointer-events-none border-r border-zinc-300"
                                                style={{ left: major.left, width: major.width }}
                                            />
                                        ))}
                                    </div>

                                    {/* Clickable cells: only render the visible range */}
                                    <div className="absolute inset-0 flex z-0 pt-2" style={{ paddingLeft: visibleColRange.start * columnWidth }}>
                                        {timelineUnits.slice(visibleColRange.start, visibleColRange.end + 1).map((unit, relIdx) => {
                                            const colIdx = visibleColRange.start + relIdx;
                                            const isToday = isTodayFns(unit);
                                            const isWeekend = showWeekends && (unit.getDay() === 0 || unit.getDay() === 6);
                                            const isMultiDaySpan = zoomLevel === 'months' || zoomLevel === 'weeks';
                                            const hoverWidth = isMultiDaySpan ? `${columnWidth * 7 - 8}px` : 'calc(100% - 8px)';
                                            const showHatch = ['days', '7_days', '14_days'].includes(zoomLevel);

                                            return (
                                                <div
                                                    key={colIdx}
                                                    style={{
                                                        width: columnWidth,
                                                        ...(isWeekend && !isToday ? {
                                                            ...(showHatch ? { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='6'%3E%3Cpath d='M-1,1 l2,-2 M0,6 l6,-6 M5,7 l2,-2' stroke='%23d4d4d8' stroke-width='0.7' opacity='0.55'/%3E%3C/svg%3E")` } : {}),
                                                            backgroundColor: '#f9f9fb'
                                                        } : {})
                                                    }}
                                                    className="shrink-0 group/col"
                                                >
                                                    {/* Virtualized grouped rows */}
                                                    <div style={shouldVirtualizeTimelineRows ? { minHeight: timelineRowsTotalHeight } : undefined}>
                                                        {virtualIndices.map((rowIdx) =>
                                                            renderTimelineColumnRow(rowIdx, colIdx, unit, isMultiDaySpan, hoverWidth)
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>



                                    {/* Design Element: Current Day Row Highlight */}
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#4ADE80]/40 z-20 pointer-events-none" />

                                    {/* GHOST BAR FOR CELL RANGE SELECTION */}
                                    {cellModalData && cellModalData.offsetTop !== undefined && (() => {
                                        const start = cellCreateStartDate || cellModalData.date;
                                        const end = cellCreateDueDate || start;

                                        let barLeft = 0;
                                        let barWidth = columnWidth - 4;

                                        if (ghostDragState) {
                                            barLeft = ghostDragState.currentBarLeft;
                                            barWidth = ghostDragState.currentBarWidth;
                                        } else {
                                            const dummyTask = { startDate: start.toISOString(), dueDate: end.toISOString() } as unknown as Task;
                                            const pos = getTaskPosition(dummyTask);
                                            if (!pos) return null;
                                            barLeft = (pos.gridColumnStart - 2) * columnWidth + 2;
                                            barWidth = (parseInt(pos.gridColumnEnd.split(' ')[1]) * columnWidth) - 4;
                                        }

                                        return (
                                            <div
                                                className="absolute z-[10000] h-8 group/ghost pointer-events-none"
                                                style={{ left: barLeft, width: barWidth, top: cellModalData.offsetTop + 4 }}
                                            >
                                                <div className="h-full rounded-sm shadow-md flex items-center px-3 gap-3 overflow-hidden select-none bg-violet-100/80 border border-violet-400 border-dashed backdrop-blur-sm transition-colors">


                                                    <div className="w-full h-full flex items-center justify-center pointer-events-auto cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                                    </div>

                                                    {/* Right Handle */}
                                                    <div
                                                        className="absolute right-0 top-0 bottom-0 w-3 flex justify-center items-center cursor-col-resize z-50 pointer-events-auto"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setGhostDragState({
                                                                handle: 'right',
                                                                startX: e.clientX,
                                                                originalStartDate: start,
                                                                originalDueDate: end,
                                                                baseBarLeft: barLeft,
                                                                baseBarWidth: barWidth,
                                                                currentBarLeft: barLeft,
                                                                currentBarWidth: barWidth
                                                            });
                                                            isDraggingRef.current = true;
                                                        }}
                                                    >
                                                        <div className="w-[3px] h-5 rounded-full bg-violet-500 shadow-sm" />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <div
                                        className="relative z-10 pb-24 pointer-events-none pt-2"
                                        style={shouldVirtualizeTimelineRows ? { minHeight: timelineRowsTotalHeight } : undefined}
                                    >
                                        {virtualIndices.map((rowIdx) => renderTimelineBarRow(rowIdx))}
                                    </div>
                                </div>
                            </div>
                            <ScrollBar orientation="horizontal" className="z-50" />
                            <ScrollBar orientation="vertical" className="z-50" />
                        </ScrollArea>
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

                            <ScrollArea ref={timelineSidebarScrollRef} className="flex-1 px-3">
                                <div className="space-y-1 pb-4">
                                    <VirtualizedDivRows
                                        scrollRef={timelineSidebarScrollRef}
                                        rowCount={sortedSidebarTasks.length}
                                        estimateSize={44}
                                        renderRow={(idx) => {
                                            const task = sortedSidebarTasks[idx];
                                            const taskColor = task.status?.color || "#a1a1aa";
                                            return (
                                            <div key={task.id} className="group flex items-center justify-between px-3 py-2 hover:bg-zinc-50/80 rounded-lg cursor-pointer transition-colors"
                                                onClick={(e) => { e.stopPropagation(); onTaskSelect ? onTaskSelect(task.id) : setSelectedTaskId(task.id); }}
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
                    ) : null}
                </div>

                {/* Fields panel (Columns click or + in last column) - toggle show/hide columns */}
                {fieldsPanelOpen && !createFieldModalOpen && (
                    <>
                        <div className="absolute inset-0 bg-black/20 z-40" onClick={() => setFieldsPanelOpen(false)} aria-hidden />
                        <div className="absolute right-0 bottom-0 top-0 w-[360px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                                <h3 className="font-semibold text-zinc-900">Fields</h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFieldsPanelOpen(false)}><X className="h-4 w-4" /></Button>
                            </div>
                            <div className="p-3 border-b border-zinc-100">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                                    <Input className="pl-9 h-9 text-sm" placeholder="Search for new or existing fields" value={fieldsSearch} onChange={e => setFieldsSearch(e.target.value)} />
                                </div>
                            </div>
                            <ScrollArea className="flex-1 p-3 pb-20 h-full">
                                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Shown</p>
                                <div className="space-y-1 mb-4">
                                    {FIELD_CONFIG.filter(f => visibleColumns.has(f.id) && (!fieldsSearch.trim() || f.label.toLowerCase().includes(fieldsSearch.toLowerCase()))).map(f => {
                                        const iconAny = (f as any).icon;
                                        const IconEl = typeof iconAny === "function"
                                            ? React.createElement(iconAny, { className: "h-4 w-4 text-zinc-400 shrink-0" })
                                            : null;
                                        return (
                                            <div key={f.id} className="flex items-center gap-2 py-2 px-2 rounded hover:bg-zinc-50">
                                                <GripVertical className="h-4 w-4 text-zinc-300 shrink-0 cursor-grab" />
                                                {IconEl}
                                                <span className="text-sm text-zinc-800 flex-1">{f.label}</span>
                                                <Switch checked onCheckedChange={() => toggleColumn(f.id)} />
                                            </div>
                                        );
                                    })}
                                    {FIELD_CONFIG.filter(f => visibleColumns.has(f.id)).length > 0 && (
                                        <button type="button" className="text-xs text-violet-600 hover:underline" onClick={() => setVisibleColumns(new Set())}>Hide all</button>
                                    )}
                                </div>
                                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Popular</p>
                                <div className="space-y-1">
                                    {FIELD_CONFIG.filter(f => !visibleColumns.has(f.id) && (!fieldsSearch.trim() || f.label.toLowerCase().includes(fieldsSearch.toLowerCase()))).map(f => {
                                        const iconAny = (f as any).icon;
                                        const IconEl = typeof iconAny === "function"
                                            ? React.createElement(iconAny, { className: "h-4 w-4 text-zinc-400 shrink-0" })
                                            : null;
                                        return (
                                            <div key={f.id} className="flex items-center justify-between py-2 px-2 rounded hover:bg-zinc-50">
                                                <div className="flex items-center gap-2">
                                                    {IconEl}
                                                    <span className="text-sm text-zinc-800">{f.label}</span>
                                                </div>
                                                <Switch checked={false} onCheckedChange={() => toggleColumn(f.id)} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                            <div className="p-3 sticky bottom-0 left-0 right-0 border-t bg-white border-zinc-100">
                                <Button
                                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white"
                                    onClick={() => {
                                        setFieldsPanelOpen(false);
                                        setCreateFieldModalOpen(true);
                                    }}
                                >
                                    <Plus className="h-4 w-4 mr-2" />Create field
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                {/* Customize view panel (ClickUp-style) */}
                {customizePanelOpen && !layoutOptionsOpen && (
                    <>
                        <div className="absolute inset-0 bg-black/20 z-40" onClick={() => setCustomizePanelOpen(false)} aria-hidden />
                        <div className="absolute bottom-0 right-0 h-full w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                                <h3 className="font-semibold text-zinc-900">Customize view</h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCustomizePanelOpen(false)}><X className="h-4 w-4" /></Button>
                            </div>
                            <ScrollArea className="flex-1 min-h-0">
                                <div className="p-3 space-y-2 pb-24">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="flex items-center justify-center h-10 w-10 rounded-lg border border-zinc-200 bg-zinc-50 shrink-0">
                                            <LayoutList className="h-5 w-5 text-zinc-600" />
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
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between py-2 px-2 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md cursor-pointer"
                                        >
                                            <span>Color tasks by</span>
                                            <span className="text-xs text-zinc-500 flex items-center gap-1">Task status <ChevronRight className="h-3 w-3" /></span>
                                        </button>
                                        <div className="flex items-center justify-between py-2 px-2 cursor-pointer" onClick={() => setShowWeekends(!showWeekends)}>
                                            <span className="text-sm text-zinc-800">Show weekends</span>
                                            <Switch checked={showWeekends} onCheckedChange={setShowWeekends} />
                                        </div>
                                        <div className="flex items-center justify-between py-2 px-2 cursor-pointer" onClick={() => setShowTaskLocations(!showTaskLocations)}>
                                            <span className="text-sm text-zinc-800">Show task locations</span>
                                            <Switch checked={showTaskLocations} onCheckedChange={setShowTaskLocations} />
                                        </div>
                                        <div className="flex items-center justify-between py-2 px-2 cursor-pointer" onClick={() => setShowSubtaskParentNames(!showSubtaskParentNames)}>
                                            <span className="text-sm text-zinc-800">Show subtask parent names</span>
                                            <Switch checked={showSubtaskParentNames} onCheckedChange={setShowSubtaskParentNames} />
                                        </div>
                                        <div className="flex items-center justify-between py-2 px-2 cursor-pointer" onClick={() => setExpandTaskNames(!expandTaskNames)}>
                                            <span className="text-sm text-zinc-800">Expand task names</span>
                                            <Switch checked={expandTaskNames} onCheckedChange={setExpandTaskNames} />
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
                                        <button type="button" className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer" onClick={() => { setFieldsPanelOpen(true); setCustomizePanelOpen(false); }}>
                                            <span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-zinc-400" />Fields</span>
                                            <span className="text-xs text-zinc-500">{Array.from(visibleColumns).length} shown</span>
                                        </button>
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
                                                    <span className="flex items-center gap-2"><LayoutList className="h-4 w-4 text-zinc-400" />Group</span>
                                                    <span className="text-xs text-zinc-500">{groupLabel} <ChevronRight className="inline h-3 w-3 ml-1" /></span>
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent side="left" align="start" className="w-[240px] p-1.5 rounded-xl shadow-xl border-zinc-200/60" sideOffset={16}>
                                                <div className="px-2 py-1.5 mb-1">
                                                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Group by</span>
                                                </div>
                                                <div className="space-y-0.5">
                                                    {[
                                                        { id: "status", label: "Status", icon: Circle },
                                                        { id: "assignee", label: "Assignee", icon: Users },
                                                        { id: "priority", label: "Priority", icon: Flag },
                                                        { id: "tags", label: "Tags", icon: Tag },
                                                        { id: "dueDate", label: "Due date", icon: Calendar },
                                                        { id: "taskType", label: "Task type", icon: Box },
                                                    ].map((opt) => (
                                                        <div
                                                            key={opt.id}
                                                            className={cn(
                                                                "flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors",
                                                                groupBy === opt.id ? "bg-violet-50 text-violet-700" : "text-zinc-600 hover:bg-zinc-50"
                                                            )}
                                                            onClick={() => setGroupBy(opt.id)}
                                                        >
                                                            <opt.icon className={cn("h-4 w-4", groupBy === opt.id ? "text-violet-500" : "text-zinc-400")} />
                                                            <span className="flex-1">{opt.label}</span>
                                                            {groupBy === opt.id && <div className="h-1.5 w-1.5 rounded-full bg-violet-600" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="h-px bg-zinc-100 my-2" />
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <Save className="h-4 w-4 text-zinc-400" />
                                                <span className="text-sm text-zinc-800">Autosave for me</span>
                                            </div>
                                            <Switch checked={viewAutosave} onCheckedChange={handleToggleAutosave} />
                                        </div>
                                        <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <Pin className="h-4 w-4 text-zinc-400" />
                                                <span className="text-sm text-zinc-800">Pin view</span>
                                            </div>
                                            <Switch checked={pinView} onCheckedChange={(val) => { setPinView(val); updateViewProperty('isPinned', val); }} />
                                        </div>
                                        <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <Lock className="h-4 w-4 text-zinc-400" />
                                                <span className="text-sm text-zinc-800">Private view</span>
                                            </div>
                                            <Switch checked={privateView} onCheckedChange={(val) => { setPrivateView(val); updateViewProperty('isPrivate', val); }} />
                                        </div>
                                        <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4 text-zinc-400" />
                                                <span className="text-sm text-zinc-800">Protect view</span>
                                            </div>
                                            <Switch checked={protectView} onCheckedChange={(val) => { setProtectView(val); updateViewProperty('isLocked', val); }} />
                                        </div>
                                        <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <Home className="h-4 w-4 text-zinc-400" />
                                                <span className="text-sm text-zinc-800">Set as default view</span>
                                            </div>
                                            <Switch checked={defaultView} onCheckedChange={(val) => { setDefaultView(val); updateViewProperty('isDefault', val); }} />
                                        </div>
                                    </div>
                                    <div className="h-px bg-zinc-100 my-2" />
                                    <div className="space-y-1">
                                        <button type="button" className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2" onClick={() => {
                                            const url = `${window.location.origin}${window.location.pathname}?v=${viewId}`;
                                            navigator.clipboard?.writeText(url);
                                            toast.success("Link copied to clipboard");
                                        }}>
                                            <span className="flex items-center gap-2"><Link className="h-4 w-4 text-zinc-400" />Copy link to view</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer"
                                            onClick={() => setIsShareModalOpen(true)}
                                        >
                                            <span className="flex items-center gap-2"><Users className="h-4 w-4 text-zinc-400" />Sharing &amp; Permissions</span>
                                            <ChevronRight className="inline h-3 w-3 ml-1 text-zinc-400" />
                                        </button>
                                    </div>
                                </div>
                            </ScrollArea>
                        </div>
                    </>
                )}

                {/* Layout Options panel */}
                {layoutOptionsOpen && (
                    <>
                        <div className="absolute inset-0 bg-black/20 z-40" onClick={() => setCustomizePanelOpen(false)} aria-hidden />
                        <div className="absolute bottom-0 right-0 h-full w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                                <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1 cursor-pointer" onClick={() => { setLayoutOptionsOpen(false); setCustomizePanelOpen(true); }}>
                                    <ArrowRight className="h-4 w-4 rotate-180" />
                                </Button>
                                <h3 className="font-semibold text-zinc-900">Layout options</h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={() => { setLayoutOptionsOpen(false); setCustomizePanelOpen(false); }}><X className="h-4 w-4" /></Button>
                            </div>
                            <ScrollArea className="flex-1 min-h-0">
                                <div className="p-3 space-y-4 pb-24">
                                    {/* Page & card layout */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Page &amp; card layout</p>
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between py-2 px-2 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md cursor-pointer"
                                        >
                                            <span>Color tasks by</span>
                                            <span className="text-xs text-zinc-500 flex items-center gap-1">Task status <ChevronRight className="h-3 w-3" /></span>
                                        </button>
                                        <div className="flex items-center justify-between py-1 px-2 cursor-pointer">
                                            <span className="text-sm text-zinc-800">Show weekends</span>
                                            <Switch checked={showWeekends} onCheckedChange={setShowWeekends} />
                                        </div>
                                        <div className="flex items-center justify-between py-1 px-2 cursor-pointer opacity-50 cursor-not-allowed">
                                            <span className="text-sm text-zinc-800">Show future recurring tasks</span>
                                            <Switch checked={false} disabled />
                                        </div>
                                        <div className="flex items-center justify-between py-1 px-2 cursor-pointer">
                                            <span className="text-sm text-zinc-800">Show task locations</span>
                                            <Switch checked={showTaskLocations} onCheckedChange={setShowTaskLocations} />
                                        </div>
                                        <div className="flex items-center justify-between py-1 px-2 cursor-pointer">
                                            <span className="text-sm text-zinc-800">Show subtask parent names</span>
                                            <Switch checked={showSubtaskParentNames} onCheckedChange={setShowSubtaskParentNames} />
                                        </div>
                                        <div className="flex items-center justify-between py-1 px-2 cursor-pointer">
                                            <span className="text-sm text-zinc-800">Expand task names</span>
                                            <Switch checked={expandTaskNames} onCheckedChange={setExpandTaskNames} />
                                        </div>
                                    </div>

                                    <div className="h-px bg-zinc-100" />

                                    {/* Task visibility */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Task visibility</p>
                                        <div className="flex items-center justify-between py-1 px-2 cursor-pointer">
                                            <span className="text-sm text-zinc-800">Show closed tasks</span>
                                            <Switch checked={showCompleted} onCheckedChange={setShowCompleted} />
                                        </div>
                                        <div className="flex items-center justify-between py-1 px-2 cursor-pointer">
                                            <span className="text-sm text-zinc-800">Show tasks from other Lists</span>
                                            <Switch checked={showTasksFromOtherLists} onCheckedChange={setShowTasksFromOtherLists} />
                                        </div>
                                        <div className="flex items-center justify-between py-1 px-2 cursor-pointer">
                                            <span className="text-sm text-zinc-800">Show subtasks from other Lists</span>
                                            <Switch checked={showSubtasksFromOtherLists} onCheckedChange={setShowSubtasksFromOtherLists} />
                                        </div>
                                    </div>

                                    <div className="h-px bg-zinc-100" />

                                    {/* View settings */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">View settings</p>
                                        <div className="flex items-center justify-between py-1 px-2 cursor-pointer">
                                            <span className="text-sm flex items-center gap-2"><UserRound className="h-4 w-4 text-zinc-400" />Default to Me Mode</span>
                                            <Switch checked={defaultToMeMode} onCheckedChange={setDefaultToMeMode} />
                                        </div>
                                        <div className="flex items-center justify-between py-1 px-2 cursor-pointer opacity-50">
                                            <span className="text-sm flex items-center gap-2"><Bell className="h-4 w-4 text-zinc-400" />Send notifications</span>
                                            <Switch checked={false} disabled />
                                        </div>
                                        <p className="text-[10px] text-zinc-400 px-2 -mt-1 ml-6">Notifies watchers to date changes.</p>
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between py-2 px-2 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-zinc-400" />Move view</span>
                                            <ChevronRight className="h-3 w-3 text-zinc-400" />
                                        </button>
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between py-2 px-2 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2"><Copy className="h-4 w-4 text-zinc-400" />Duplicate view</span>
                                            <ChevronRight className="h-3 w-3 text-zinc-400" />
                                        </button>
                                        <div
                                            className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded cursor-pointer"
                                            onClick={resetViewToDefaults}
                                        >
                                            <span className="text-sm flex items-center gap-2"><RefreshCcw className="h-4 w-4 text-zinc-400" />Reset view to defaults</span>
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                        </div>
                    </>
                )}

                {/* Assignees panel */}
                {assigneesPanelOpen && (
                    <>
                        <div className="absolute inset-0 bg-black/20 z-40" onClick={() => setAssigneesPanelOpen(false)} aria-hidden />
                        <div className="absolute right-0 bottom-0 top-0 w-[320px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                                <h3 className="font-semibold text-zinc-900">Assignees</h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAssigneesPanelOpen(false)}><X className="h-4 w-4" /></Button>
                            </div>
                            <div className="p-3 border-b border-zinc-100">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                                    <Input className="pl-9 h-9 text-sm" placeholder="Search people..." value={assigneesSearch} onChange={e => setAssigneesSearch(e.target.value)} />
                                </div>
                            </div>
                            <ScrollArea className="flex-1 p-2">
                                <div className="space-y-0.5">
                                    {users.filter(u => !assigneesSearch || u.name?.toLowerCase().includes(assigneesSearch.toLowerCase())).map(user => (
                                        <div
                                            key={user.id}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                                                filterAssignee.includes(user.id) ? "bg-violet-50 text-violet-700" : "text-zinc-700 hover:bg-zinc-50"
                                            )}
                                            onClick={() => {
                                                const next = filterAssignee.includes(user.id)
                                                    ? filterAssignee.filter(id => id !== user.id)
                                                    : [...filterAssignee, user.id];
                                                setFilterAssignee(next);
                                            }}
                                        >
                                            <Avatar className="h-6 w-6 border border-zinc-100">
                                                <AvatarImage src={user.image ?? undefined} />
                                                <AvatarFallback className="text-[10px] bg-zinc-100 text-zinc-500">{user.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium flex-1 truncate">{user.name}</span>
                                            {filterAssignee.includes(user.id) && <div className="h-2 w-2 rounded-full bg-violet-600" />}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                            {filterAssignee.length > 0 && (
                                <div className="p-3 border-t border-zinc-100">
                                    <Button variant="ghost" className="w-full text-xs text-zinc-500 hover:text-zinc-900" onClick={() => setFilterAssignee([])}>Clear selection</Button>
                                </div>
                            )}
                        </div>
                    </>
                )}

                <TaskDetailModal taskId={effectiveSelectedTaskId || ""} open={!!effectiveSelectedTaskId && effectiveSelectedTaskId !== "new"} onOpenChange={(open) => !open && (onTaskSelect ? onTaskSelect(null) : setSelectedTaskId(null))} />
                <ShareViewPermissionModal open={isShareModalOpen} onOpenChange={setIsShareModalOpen} viewId={viewId as string} workspaceId={resolvedWorkspaceId as string} />

                {/* Create field modal  Efield types and Add existing fields */}
                {createFieldModalOpen && (
                    <>
                        <div className="absolute inset-0 bg-black/20 z-[60]" onClick={() => { setCreateFieldModalOpen(false); setCreateFieldSearch(""); }} aria-hidden />
                        <div className="absolute right-0 bottom-0 top-0 w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-[70] flex flex-col animate-in slide-in-from-right duration-300">
                            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 -ml-1"
                                    onClick={() => {
                                        setCreateFieldModalOpen(false);
                                        setCreateFieldSearch("");
                                        setFieldsPanelOpen(true);
                                    }}
                                >
                                    <ArrowRight className="h-4 w-4 rotate-180" />
                                </Button>
                                <h3 className="font-semibold text-zinc-900">Create field</h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setCreateFieldModalOpen(false); setCreateFieldSearch(""); }}><X className="h-4 w-4" /></Button>
                            </div>
                            <div className="p-3 border-b border-zinc-100">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                                    <Input className="pl-9 h-9 text-sm" placeholder="Search for new or existing fields" value={createFieldSearch} onChange={e => setCreateFieldSearch(e.target.value)} />
                                </div>
                            </div>
                            <ScrollArea className="flex-1 p-3 pb-20 h-full">
                                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">All</p>
                                <div className="space-y-0.5">
                                    {CREATE_FIELD_TYPES.filter(f => !createFieldSearch.trim() || f.label.toLowerCase().includes(createFieldSearch.toLowerCase())).map(f => {
                                        const IconComponent = f.icon as any;
                                        return (
                                            <button key={f.id} type="button" className="w-full flex items-center gap-2 py-2.5 px-2 rounded-md hover:bg-zinc-50 text-left text-sm text-zinc-800" onClick={() => {
                                                // TODO: Open field creation modal/form with field type pre-selected
                                                console.log("Create field type:", f.type, f.label);
                                                setCreateFieldModalOpen(false);
                                            }}>
                                                {typeof IconComponent === "function"
                                                    ? React.createElement(IconComponent, { className: "h-4 w-4 text-zinc-400 shrink-0" })
                                                    : null}
                                                {f.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                            <div className="p-3 sticky bottom-0 left-0 right-0 border-t border-zinc-100 bg-white">
                                <Button
                                    variant="outline"
                                    className="w-full justify-center text-zinc-900 border-zinc-200 hover:bg-zinc-50 font-medium h-10"
                                    onClick={() => { setCreateFieldModalOpen(false); setFieldsPanelOpen(true); }}
                                >
                                    <div className="h-4 w-4 rounded-full bg-zinc-900 text-white flex items-center justify-center mr-2">
                                        <Plus className="h-3 w-3" />
                                    </div>
                                    Add existing fields
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Fixed-position task hover popover  Eoutside all overflow containers */}
            {hoveredTask && (hoveredBarRect || infoIconRect) && (
                <TaskHoverPopover
                    task={hoveredTask}
                    anchorRect={infoIconRect || hoveredBarRect!}
                    workspaceId={resolvedWorkspaceId!}
                    statuses={allAvailableStatuses}
                    users={users as any}
                    agents={agents as any}
                    onClose={() => {
                        setHoveredTask(null);
                        setHoveredBarRect(null);
                        setInfoIconRect(null);
                        setEditingHoveredTaskName(false);
                    }}
                />
            )}

            {/* Fixed-position cell modal */}
            {cellModalData && (() => {
                const cardWidth = 520;
                // Viewport-safe horizontal positioning
                let left = cellModalData.rect.left;
                if (left + cardWidth > window.innerWidth - 8) left = window.innerWidth - cardWidth - 8;
                if (left < 8) left = 8;

                const minTop = 70; // stay below app header
                const spaceBelow = window.innerHeight - cellModalData.rect.bottom - 8;
                const spaceAbove = cellModalData.rect.top - minTop - 8;
                // Only flip above if below offers less than 300px AND above is meaningfully larger
                const showAbove = spaceBelow < 300 && spaceAbove > spaceBelow;

                let modalTop: number;
                let maxModalHeight: number;

                if (showAbove) {
                    maxModalHeight = Math.min(spaceAbove, 490);
                    modalTop = cellModalData.rect.top - maxModalHeight - 8;
                    modalTop = Math.max(minTop, modalTop);
                } else {
                    modalTop = cellModalData.rect.bottom + 8;
                    maxModalHeight = Math.min(spaceBelow, 490);
                    maxModalHeight = Math.max(280, maxModalHeight); // always at least usable
                }
                const styleProp = { left, width: cardWidth, top: modalTop };

                return (
                    <div
                        className="fixed z-[9999]"
                        style={styleProp}
                    >
                        {/* Overlay to close modal on outside click */}
                        <div className="fixed inset-0 z-[-1]" onClick={() => setCellModalData(null)} />

                        <div className="relative bg-white rounded-xl shadow-lg shadow-black/10 border border-zinc-200/80 overflow-hidden flex flex-col pointer-events-auto" style={{ maxHeight: maxModalHeight }}>
                            <div className="flex items-end px-3 pt-2 border-b border-zinc-100">
                                <button
                                    className={cn("group relative px-1 pt-2 pb-3 text-[13px] font-semibold transition-colors cursor-pointer mr-1",
                                        cellModalTab === "find"
                                            ? "text-zinc-900"
                                            : "text-zinc-500"
                                    )}
                                    onClick={() => setCellModalTab("find")}
                                >
                                    <span className="px-2.5 py-1 rounded-md transition-colors group-hover:bg-zinc-100 group-hover:text-zinc-800">
                                        Find Task
                                    </span>
                                    {cellModalTab === "find" && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-zinc-900 rounded-full z-10" />}
                                </button>
                                <button
                                    className={cn("group relative px-1 pt-2 pb-3 text-[13px] font-semibold transition-colors cursor-pointer",
                                        cellModalTab === "create"
                                            ? "text-zinc-900"
                                            : "text-zinc-500"
                                    )}
                                    onClick={() => setCellModalTab("create")}
                                >
                                    <span className="px-2.5 py-1 rounded-md transition-colors group-hover:bg-zinc-100 group-hover:text-zinc-800">
                                        Create Task
                                    </span>
                                    {cellModalTab === "create" && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-zinc-900 rounded-full z-10" />}
                                </button>

                                {cellModalTab === "create" && (
                                    <div className="ml-auto flex items-center gap-2 pb-2.5">
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-zinc-200 rounded-md text-[12px] font-medium text-zinc-600 cursor-not-allowed">
                                            <ListIcon className="h-3.5 w-3.5 text-zinc-400" />
                                            <span>{currentList?.name || (listsData?.items?.[0] as any)?.name || "Project"}</span>
                                            <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-zinc-200 rounded-md text-[12px] font-medium text-zinc-700 cursor-pointer hover:bg-zinc-50 transition-colors">
                                                    {cellCreateTaskTypeId ?
                                                        <TaskTypeIcon type={(availableTaskTypes as any[]).find(tt => tt.id === cellCreateTaskTypeId)} className="h-3.5 w-3.5" /> :
                                                        <Circle className="h-3.5 w-3.5 text-zinc-400" />
                                                    }
                                                    <span className="capitalize">{(availableTaskTypes as any[]).find(tt => tt.id === cellCreateTaskTypeId)?.name || "Task"}</span>
                                                    <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                                                </div>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 z-[10000]">
                                                {availableTaskTypes.map((t: any) => (
                                                    <DropdownMenuItem key={t.id} onClick={() => setCellCreateTaskTypeId(t.id)} className="flex items-center gap-2 cursor-pointer">
                                                        <TaskTypeIcon type={t} className="h-3.5 w-3.5 text-zinc-500" />
                                                        <span className="capitalize">{t.name}</span>
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                )}
                            </div>
                            <div className="h-px bg-zinc-200 w-full" />

                            {cellModalTab === "find" ? (
                                <div className="flex flex-col p-4 w-full" style={{ height: 350 }}>
                                    <div className="relative mb-3 flex items-center">
                                        <Search className="absolute left-1 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                                        <input
                                            autoFocus
                                            className="w-full text-[15px] pl-8 py-1 outline-none placeholder:text-zinc-400 font-medium"
                                            placeholder="Search for task name, ID, or URL"
                                            value={cellSearchQuery}
                                            onChange={(e) => setCellSearchQuery(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Escape') setCellModalData(null); }}
                                        />
                                    </div>



                                    <div className="flex items-center justify-between mb-3 text-[13px] font-semibold mt-2">
                                        <span className="text-zinc-500">Recent</span>
                                        <button className="text-violet-600 hover:text-violet-700">Browse tasks</button>
                                    </div>

                                    <ScrollArea className="flex-1 -mx-2 px-2">
                                        <div className="space-y-0.5">
                                            {tasks
                                                .filter(t => !cellSearchQuery || (t.title || t.name || '').toLowerCase().includes(cellSearchQuery.toLowerCase()))
                                                .map((t) => (
                                                    <button
                                                        key={t.id}
                                                        className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-100 text-left transition-colors cursor-pointer"
                                                        onClick={() => {
                                                            const start = cellCreateStartDate ?? cellModalData.date;
                                                            const end = cellCreateDueDate ?? cellCreateStartDate ?? cellModalData.date;
                                                            updateTaskDatesMutation.mutate({
                                                                id: t.id,
                                                                startDate: start.toISOString(),
                                                                dueDate: end.toISOString()
                                                            }, { onSuccess: () => utils.task.list.invalidate() });
                                                            toast.success("Task scheduled");
                                                            setCellModalData(null);
                                                        }}
                                                    >
                                                        <div className="w-[14px] h-[14px] rounded-full flex items-center justify-center shrink-0 border-2" style={{ borderColor: t.status?.color || '#9ca3af' }}>
                                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.status?.color || '#9ca3af' }} />
                                                        </div>
                                                        <span className="text-[14px] text-zinc-700 truncate font-medium">{t.title || t.name}</span>
                                                    </button>
                                                ))}
                                            {tasks.length === 0 && (
                                                <div className="p-4 text-center text-xs text-zinc-400">No tasks found.</div>
                                            )}
                                            {tasks.length > 0 && cellSearchQuery && tasks.filter(t => (t.title || t.name || '').toLowerCase().includes(cellSearchQuery.toLowerCase())).length === 0 && (
                                                <div className="p-4 text-center text-xs text-zinc-400">No tasks match "{cellSearchQuery}".</div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>
                            ) : (
                                <div className="flex flex-col p-6 pt-8 min-h-[300px]">
                                    <input
                                        autoFocus
                                        placeholder="Task Name or type '/' for commands"
                                        className="w-full text-[18px] font-semibold outline-none placeholder:text-zinc-400 mb-4"
                                        value={cellCreateName}
                                        onChange={(e) => setCellCreateName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') setCellModalData(null);
                                            if (e.key === 'Enter' && cellCreateName.trim()) {
                                                const start = cellCreateStartDate ?? cellModalData.date;
                                                const end = cellCreateDueDate ?? cellCreateStartDate ?? cellModalData.date;
                                                createTaskMutation.mutate({
                                                    workspaceId: resolvedWorkspaceId as string,
                                                    listId: (listId || (listsData?.items?.[0] as any)?.id) as string,
                                                    title: cellCreateName.trim(),
                                                    statusId: cellCreateStatusId || undefined,
                                                    priority: cellCreatePriority || undefined,
                                                    taskTypeId: cellCreateTaskTypeId || undefined,
                                                    userAssignees: cellCreateAssigneeIds,
                                                    startDate: start.toISOString(),
                                                    dueDate: end.toISOString()
                                                } as any, { onSuccess: () => utils.task.list.invalidate() });
                                                toast.success("Task created");
                                                setCellModalData(null);
                                            }
                                        }}
                                    />


                                    <div className="flex flex-wrap gap-2 items-center mb-6 mt-6">
                                        {/* Status */}
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button className="px-2.5 py-1.5 rounded-sm text-[11px] font-black tracking-wider text-zinc-500 hover:text-zinc-700 bg-zinc-100 hover:bg-zinc-200 uppercase transition-colors outline-none cursor-pointer">
                                                    {allAvailableStatuses.find(s => s.id === cellCreateStatusId)?.name || 'TO DO'}
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent align="start" className="w-56 p-1 z-[10000]">
                                                <div className="space-y-0.5 max-h-[250px] overflow-y-auto">
                                                    {allAvailableStatuses.map(s => (
                                                        <button key={s.id} onClick={() => setCellCreateStatusId(s.id)} className={cn("w-full flex items-center px-2 py-1.5 text-xs rounded-md hover:bg-zinc-100 transition-colors font-medium", cellCreateStatusId === s.id && "bg-zinc-100 text-zinc-900")}>
                                                            <div className="flex items-center justify-center w-[12px] h-[12px] rounded-full border-[3px] mr-2 shrink-0" style={{ borderColor: s.color || '#9ca3af' }} />
                                                            <span>{s.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </PopoverContent>
                                        </Popover>

                                        {/* Assignee */}
                                        <AssigneeSelector
                                            users={users as any}
                                            agents={agents}
                                            workspaceId={resolvedWorkspaceId as string}
                                            variant="compact"
                                            contentClassName="z-[10000]"
                                            value={cellCreateAssigneeIds}
                                            onChange={setCellCreateAssigneeIds}
                                            align="start"
                                            trigger={
                                                <button className="px-2.5 py-1.5 rounded-md text-[13px] font-medium text-zinc-600 border border-zinc-200 flex items-center gap-2 hover:bg-zinc-50 transition-colors outline-none cursor-pointer">
                                                    {cellCreateAssigneeIds.length === 0 ? (
                                                        <User className="w-[15px] h-[15px] text-zinc-400" />
                                                    ) : (
                                                        <div className="flex -space-x-1">
                                                            {cellCreateAssigneeIds.slice(0, 3).map(id => {
                                                                const u = users.find(u => u.id === id);
                                                                return <Avatar key={id} className="h-4 w-4 border border-white"><AvatarImage src={u?.image || undefined} /><AvatarFallback className="text-[7px]">{u?.name?.slice(0, 2) || "?"}</AvatarFallback></Avatar>
                                                            })}
                                                        </div>
                                                    )}
                                                    {cellCreateAssigneeIds.length === 1 ? (users.find((u: any) => u.id === cellCreateAssigneeIds[0]) as any)?.name : (cellCreateAssigneeIds.length > 1 ? `${cellCreateAssigneeIds.length} assignees` : "Assignee")}
                                                </button>
                                            }
                                        />

                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button className="px-2.5 py-1.5 rounded-md text-[13px] font-medium text-zinc-600 border border-zinc-200 flex items-center gap-2 hover:bg-zinc-50 transition-colors outline-none group/date cursor-pointer">
                                                    <Calendar className="w-[15px] h-[15px] text-zinc-400 shrink-0" />
                                                    {(cellCreateStartDate || cellCreateDueDate) ? (
                                                        <>
                                                            <span>
                                                                {cellCreateStartDate ? format(cellCreateStartDate, 'MMM d') : '\u2014'}
                                                                {(cellCreateStartDate || cellCreateDueDate) && ' - '}
                                                                {cellCreateDueDate ? format(cellCreateDueDate, 'MMM d') : ''}
                                                            </span>
                                                            <div
                                                                className="ml-0.5 rounded-full hover:bg-zinc-200 p-0.5 transition-colors"
                                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCellCreateStartDate(null); setCellCreateDueDate(null); }}
                                                            >
                                                                <X className="w-3 h-3 text-zinc-500" />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <span className="text-zinc-500">Due date</span>
                                                    )}
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent align="start" className="p-0 border-none shadow-2xl z-[10000] rounded-xl" sideOffset={8}>
                                                <TaskCalendar
                                                    startDate={cellCreateStartDate ?? undefined}
                                                    endDate={cellCreateDueDate ?? undefined}
                                                    onStartDateChange={(d) => setCellCreateStartDate(d ?? null)}
                                                    onEndDateChange={(d) => setCellCreateDueDate(d ?? null)}
                                                />
                                            </PopoverContent>
                                        </Popover>

                                        {/* Priority */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className={cn("px-2.5 py-1.5 rounded-md text-[13px] font-medium border flex items-center gap-2 transition-colors outline-none cursor-pointer",
                                                    cellCreatePriority === 'URGENT' ? "text-red-600 border-red-200 hover:bg-red-50 bg-red-50/50" :
                                                        cellCreatePriority === 'HIGH' ? "text-orange-600 border-orange-200 hover:bg-orange-50 bg-orange-50/50" :
                                                            cellCreatePriority === 'NORMAL' ? "text-blue-600 border-blue-200 hover:bg-blue-50 bg-blue-50/50" :
                                                                cellCreatePriority === 'LOW' ? "text-slate-600 border-slate-200 hover:bg-slate-50 bg-slate-50/50" :
                                                                    "text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                                                )}>
                                                    <Flag className="w-[15px] h-[15px] fill-current" />
                                                    {cellCreatePriority ? cellCreatePriority.charAt(0) + cellCreatePriority.slice(1).toLowerCase() : 'Priority'}
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-48 z-[10000]">
                                                <DropdownMenuLabel className="text-xs">Priority</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => setCellCreatePriority("URGENT")}>
                                                    <Flag className="h-3 w-3 mr-2 text-red-600 fill-current" /> Urgent
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setCellCreatePriority("HIGH")}>
                                                    <Flag className="h-3 w-3 mr-2 text-orange-600 fill-current" /> High
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setCellCreatePriority("NORMAL")}>
                                                    <Flag className="h-3 w-3 mr-2 text-blue-600 fill-current" /> Normal
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setCellCreatePriority("LOW")}>
                                                    <Flag className="h-3 w-3 mr-2 text-slate-600 fill-current" /> Low
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => setCellCreatePriority(null)}>
                                                    <CircleSlash className="h-3 w-3 mr-2 text-slate-500" />Clear
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                    </div>

                                    {/* Footer */}
                                    <div className="pt-4 border-t border-zinc-100 flex items-center justify-end mt-auto">
                                        <div className="flex items-stretch shrink-0 shadow-sm rounded-md overflow-hidden">
                                            <button
                                                className="bg-zinc-900 text-white text-[13px] font-medium px-4 h-9 hover:bg-zinc-950 transition-colors"
                                                onClick={() => {
                                                    if (cellCreateName.trim()) {
                                                        const start = cellCreateStartDate ?? cellModalData.date;
                                                        const end = cellCreateDueDate ?? cellCreateStartDate ?? cellModalData.date;
                                                        createTaskMutation.mutate({
                                                            workspaceId: resolvedWorkspaceId as string,
                                                            listId: (listId || (listsData?.items?.[0] as any)?.id) as string,
                                                            title: cellCreateName.trim(),
                                                            statusId: cellCreateStatusId || undefined,
                                                            priority: cellCreatePriority || undefined,
                                                            taskTypeId: cellCreateTaskTypeId || undefined,
                                                            userAssignees: cellCreateAssigneeIds,
                                                            startDate: start.toISOString(),
                                                            dueDate: end.toISOString()
                                                        } as any, { onSuccess: () => utils.task.list.invalidate() });
                                                        toast.success("Task created");
                                                        setCellModalData(null);
                                                    }
                                                }}
                                            >
                                                Create Task
                                            </button>
                                            <div className="w-px self-stretch bg-zinc-700" />
                                            <button className="bg-zinc-900 text-white w-9 h-9 flex items-center justify-center hover:bg-zinc-950 transition-colors">
                                                <ChevronDown className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
            <TaskListLoadMore
                loadMoreRef={loadMoreRef}
                hasMore={hasMoreTasks}
                isFetchingNextPage={isFetchingNextPage}
                loaded={tasks.length}
                total={taskTotal}
            />
        </TooltipProvider>
    );
}

const getMajorBoundaryDate = (date: Date, index: number, zoomLevel: ZoomLevel) => {
    const isFirst = index === 0;
    switch (zoomLevel) {
        case 'days': return (date.getDate() === 1 || isFirst) ? date : null;
        case '7_days': return (date.getDate() === 1 || isFirst) ? date : null;
        case '14_days': return (date.getDate() === 1 || isFirst) ? date : null;
        case 'weeks': return (date.getDate() === 1 || isFirst) ? date : null;
        case 'months': return (date.getDate() === 1 || isFirst) ? date : null;
        default: return null;
    }
};