"use client";

import { useGenericTaskViewData } from "@/features/dashboard/hooks/useGenericTaskViewData";
import { TaskListLoadMore } from "@/features/dashboard/components/shared/TaskListLoadMore";
import { VirtualizedDivRows } from "@/features/dashboard/components/shared/VirtualizedListRows";
import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useSensors, useSensor, MouseSensor, TouchSensor } from "@dnd-kit/core";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Plus, ChevronLeft, ChevronRight, Calendar, Search, Filter, Settings, Download, Monitor, Share2, Trash, Copy, Star, Lock, EyeOff, Save, Layout, MoreHorizontal, User,
    CheckCircle2, X, PanelLeft, ArrowLeft, Maximize2, Clock, GitCommit, ListFilter, ArrowUpDown, Pin, SortAsc, Users, Flag, Paperclip, MessageSquare, ChevronsUp,
    LayoutList, SlidersHorizontal, ArrowUp, ArrowDown, Circle, Spline, Link2, Target, Info, Play, ListChecks, AlignLeft, RefreshCcw, Type, Hash, CheckSquare, Tag,
    DollarSign, Globe, FunctionSquare, FileText, Phone, Mail, MapPin, TrendingUp, Heart, PenTool, MousePointer, ListTodo, AlertTriangle, CircleMinus, Link, Slash, Box,
    List as ListIcon, Archive, UserPlus, CalendarCheck, CalendarClock, CalendarRange, Hourglass, UserCheck, RefreshCw, Timer, Undo, ToggleLeft, Edit3, Trash2, Check, ChevronsUpDown,
    ChevronDown, UserRound, ShieldCheck, Home, ChevronUp, ArrowRight, GripVertical, Minus,
    CircleDot, CircleDashed, CornerDownRight, CircleSlash, PenOff, Wand2
} from "lucide-react";
import { TemplateMenuPopover } from "@/entities/templates/components/TemplateMenuPopover";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
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
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover";
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
import { ListCreationModal } from "@/entities/lists/components/ListCreationModal";
import { FolderCreationModal } from "@/entities/folders/components/FolderCreationModal";
import { AssigneeSelector, formatAssigneeIdsForSelector } from "@/entities/task/components/AssigneeSelector";
import { TaskCalendar } from "@/entities/task/components/TaskCalendar";
import { LazyTaskDetailModal as TaskDetailModal } from "@/entities/task/components/LazyTaskDetailModal";
import { TaskActionsPopover } from "@/entities/task/components/TaskActionsPopover";
import { ViewToolbarSaveDropdown } from "@/features/dashboard/components/shared/ViewToolbarSaveDropdown";
import { ViewToolbarClosedPopover } from "@/features/dashboard/components/shared/ViewToolbarClosedPopover";
import { TaskTypeIcon } from "@/entities/task/components/TaskTypeIcon";
import { format } from "date-fns";
import type { FilterCondition, FilterGroup, ListViewSavedConfig } from "./viewTypes";
import { FILTER_OPTIONS, FIELD_OPERATORS, STANDARD_FIELD_CONFIG } from "./viewConstants";
import { evaluateGroup, hasFilterValue, hasAnyValueInGroup, evaluateCondition, getCustomFieldValue } from "./filterUtils";
import { DestinationPicker } from "@/entities/task/components/DestinationPicker";
import { ShareViewPermissionModal } from "@/features/dashboard/components/shared/ShareViewPermissionModal";
import { DuplicateTaskModal } from "@/entities/task/components/DuplicateTaskModal";
import { parseEncodedTag } from "@/entities/task/utils/tags";
import { SidePanel } from "@/features/dashboard/components/shared/SidePanel";
import { TaskStatusPopover } from "@/entities/task/components/TaskStatusPopover";
import { CustomFieldsManagerModal } from "@/entities/customfields/components/CustomFieldsManagerModal";
import { FieldsPanelSlideout } from "@/features/dashboard/components/shared/FieldsPanelSlideout";
import { TaskCommentPopover } from "@/entities/task/components/TaskCommentPopover";
import { TaskTimeTrackedPopover } from "@/entities/task/components/TaskTimeTrackedPopover";
import { TaskDependenciesPopover } from "@/entities/task/components/TaskDependenciesPopover";
import { TaskLinkedTasksPopover } from "@/entities/task/components/TaskLinkedTasksPopover";
import { LinkedDocsCell } from "@/entities/task/components/TaskLinkedDocsPopover";
import { TaskListPopover } from "@/entities/task/components/TaskListPopover";
import { TagsPopover } from "@/entities/task/components/TagsPopover";
import { TagEditorPopover } from "@/entities/task/components/TagEditorPopover";
import { CustomFieldRenderer } from "@/entities/task/components/CustomFieldRenderer";
import { ViewFilterPopoverContent } from "./ViewFilterPopoverContent";

interface GanttViewProps {
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

// Task type is imported or defined once.
// Using the more complete one.
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
    assigneeId?: string | null;
    tags: string[];
    position: string;
    parentId?: string | null;
    customFieldValues?: any[];
    listId?: string;
    folderId?: string;
    spaceId?: string;
    createdAt?: Date;
    updatedAt?: Date;
    timeEstimate?: number | null;
    timeTracked?: number | null;
    subtasks?: Task[];
}

const spaceDefaultViewConfig: ListViewSavedConfig = {
    groupBy: "status",
    groupDirection: "asc",
    subtasksMode: "collapsed",
    sortBy: "manual",
    sortDirection: "asc",
    showCompleted: false,
    showCompletedSubtasks: false,
    visibleColumns: ["name", "assignee", "dueDate", "priority", "tags"],
    showEmptyStatuses: false,
    wrapText: false,
    showTaskLocations: false,
    showSubtaskParentNames: false,
    showTaskProperties: true,
    showTasksFromOtherLists: false,
    showSubtasksFromOtherLists: false,
    pinDescription: false,
    viewAutosave: false,
    defaultToMeMode: false,
};

const formatDueDate = (date: Date | string | null) => {
    if (!date) return null;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(d); due.setHours(0, 0, 0, 0);
    const days = Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    if (days < 0) return { text: `${Math.abs(days)} days ago`, color: "text-red-600 font-medium" };
    if (days === 0) return { text: "Today", color: "text-indigo-600 font-medium" };
    if (days === 1) return { text: "Tomorrow", color: "text-orange-600" };
    if (days < 7) return { text: d.toLocaleDateString("en-US", { weekday: "short" }), color: "text-indigo-600" };
    return { text: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), color: "text-zinc-500" };
};

const formatCustomFieldValue = (value: any, customField: any): string => {
    if (value === null || value === undefined) return "—";
    const fieldType = customField?.type || customField?.config?.fieldType;
    switch (fieldType) {
        case "TEXT":
        case "TEXT_AREA":
        case "LONG_TEXT":
        case "CUSTOM_TEXT":
        case "EMAIL":
        case "PHONE":
        case "URL":
            return String(value);
        case "NUMBER":
        case "MONEY":
            return typeof value === "number" ? value.toLocaleString() : String(value);
        case "DATE":
            try {
                return format(new Date(value), "MMM d, yyyy");
            } catch {
                return String(value);
            }
        case "CHECKBOX":
            return value ? "Yes" : "No";
        case "DROPDOWN":
        case "CUSTOM_DROPDOWN":
        case "LABELS":
            if (typeof value === "string") return value;
            if (Array.isArray(value)) return value.join(", ");
            return String(value);
        default:
            return String(value);
    }
};

const GANTT_FIELD_CONFIG = [
    { id: "name", label: "Task Name", icon: Type, type: "TEXT" },
    { id: "assignee", label: "Assignee(s)", icon: User, type: "USER" },
    { id: "dueDate", label: "Due date", icon: Calendar, type: "DATE" },
    { id: "priority", label: "Priority", icon: Flag, type: "PRIORITY" },
    { id: "status", label: "Status", icon: Info, type: "STATUS" },
    { id: "comments", label: "Comments", icon: MessageSquare, type: "NUMBER" },
    { id: "timeTracked", label: "Time tracked", icon: Play, type: "NUMBER" },
    { id: "dateCreated", label: "Date created", icon: Clock, type: "DATE" },
    { id: "createdBy", label: "Created by", icon: User, type: "USER" },
    { id: "dateClosed", label: "Date closed", icon: CalendarCheck, type: "DATE" },
    { id: "dateDone", label: "Date done", icon: CalendarCheck, type: "DATE" },
    { id: "startDate", label: "Start date", icon: CalendarClock, type: "DATE" },
    { id: "dateUpdated", label: "Date updated", icon: RefreshCcw, type: "DATE" },
    { id: "tags", label: "Tags", icon: Tag, type: "TAGS" },
    { id: "taskType", label: "Task Type", icon: Box, type: "TEXT" },
    { id: "timeline", label: "Timeline", icon: CalendarRange, type: "DATE" },
    { id: "linkedTasks", label: "Linked tasks", icon: Link2, type: "TEXT" },
    { id: "linkedDocs", label: "Linked docs", icon: Link2, type: "TEXT" },
    { id: "dependencies", label: "Dependencies", icon: Link2, type: "TEXT" },
    { id: "taskId", label: "Task ID", icon: Hash, type: "TEXT" },
    { id: "list", label: "Lists", icon: ListIcon, type: "TEXT" },
    { id: "timeEstimate", label: "Time Estimate", icon: Timer, type: "NUMBER" },
    { id: "points", label: "Points", icon: Target, type: "NUMBER" },
];


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
];

const hasSubtasks = (task: Task, allTasks: Task[]) => {
    return allTasks.some(t => t.parentId === task.id);
};

const isValidDate = (d: any) => {
    if (!d) return false;
    const date = new Date(d);
    return date instanceof Date && !isNaN(date.getTime());
};

type TimeScale = 'Day' | 'Week' | 'Month' | 'Quarter' | 'Year' | 'Flexible';
type BaseTimeScale = Exclude<TimeScale, "Flexible">;
const GANTT_HEADER_ROW_CLASS = "h-16 shrink-0 border-b border-zinc-200 bg-white";
type TimelineUnit = {
    date: Date;
    label: string;
    dayKey?: string;
    dayLabel?: string;
    weekKey?: string;
    weekLabel?: string;
    weekNumber?: string;
    monthKey?: string;
    monthLabel?: string;
    quarterKey?: string;
    quarterLabel?: string;
    quarterYear?: number;
    quarterNumber?: number;
    yearKey?: string;
    yearLabel?: string;
    isWeekend?: boolean;
};

function stableStringify(obj: any) {
    const sortObject = (v: any): any => {
        if (Array.isArray(v)) return [...v].map(sortObject);
        if (v && typeof v === "object") {
            return Object.keys(v).sort().reduce((acc: any, k) => {
                acc[k] = sortObject(v[k]);
                return acc;
            }, {});
        }
        return v;
    };
    return JSON.stringify(sortObject(obj));
}

const getPriorityStyles = (p: string) => {
    switch (p) {
        case "URGENT": return { icon: "text-red-500 fill-red-500", bg: "bg-red-50", text: "text-red-700" };
        case "HIGH": return { icon: "text-orange-500 fill-orange-500", bg: "bg-orange-50", text: "text-orange-700" };
        case "NORMAL": return { icon: "text-blue-500 fill-blue-500", bg: "bg-blue-50", text: "text-blue-700" };
        case "LOW": return { icon: "text-zinc-400 fill-zinc-400", bg: "bg-zinc-50", text: "text-zinc-600" };
        default: return { icon: "text-zinc-300 fill-zinc-300", bg: "bg-zinc-50", text: "text-zinc-500" };
    }
};

const getPriorityColor = (p: string | null | undefined) => {
    switch (p) {
        case "URGENT": return "bg-red-500";
        case "HIGH": return "bg-orange-500";
        case "NORMAL": return "bg-blue-500";
        case "LOW": return "bg-zinc-400";
        default: return "bg-zinc-300";
    }
};

export function GanttView({ spaceId, projectId, teamId, listId, folderId, viewId, workspaceId, initialConfig, selectedTaskIdFromParent, onTaskSelect, refetchViewData }: GanttViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const utils = trpc.useUtils();
    const [timeScale, setTimeScale] = useState<TimeScale>('Month');
    const [flexibleInternalScale, setFlexibleInternalScale] = useState<BaseTimeScale>("Week");
    const [columnWidthByScale, setColumnWidthByScale] = useState<Record<BaseTimeScale, number>>({
        Day: 120,
        Week: 140,
        Month: 200,
        Quarter: 240,
        Year: 280,
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [showWeekends, setShowWeekends] = useState(true);
    const [showCriticalPath, setShowCriticalPath] = useState(false);
    const [showSlackTime, setShowSlackTime] = useState(false);
    const [fullScreenMode, setFullScreenMode] = useState(false);
    const [rescheduleDependencies, setRescheduleDependencies] = useState(true);
    const [showClosed, setShowClosed] = useState(false);
    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    const [leftPanelWidth, setLeftPanelWidth] = useState(480);
    const [colWidths, setColWidths] = useState<Record<string, number>>({
        name: 350,
        assignee: 150,
        dueDate: 150,
        priority: 120,
        status: 150,
        dateCreated: 150,
        timeEstimate: 120,
        comments: 100,
        timeTracked: 120,
        pullRequests: 120,
        linkedTasks: 150,
        taskType: 130,
        tags: 150,
        linkedDocs: 150,
        dependencies: 150,
        taskId: 100,
        list: 150,
        createdBy: 150,
        dateClosed: 150,
        dateDone: 150,
        startDate: 150,
        dateUpdated: 150,
        timeline: 180,
    });
    const resizingCol = useRef<string | null>(null);
    const startX = useRef(0);
    const startWidth = useRef(0);

    const startResize = useCallback((e: React.MouseEvent, colId: string) => {
        e.preventDefault();
        e.stopPropagation();
        resizingCol.current = colId;
        startX.current = e.clientX;
        startWidth.current = colWidths[colId] ?? (colId === "name" ? 300 : 184);

        const onMouseMove = (moveEvent: MouseEvent) => {
            if (!resizingCol.current) return;
            const diff = moveEvent.clientX - startX.current;
            const newWidth = Math.max(60, startWidth.current + diff);
            setColWidths(prev => ({ ...prev, [resizingCol.current!]: newWidth }));
        };

        const onMouseUp = () => {
            resizingCol.current = null;
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            document.body.style.cursor = "";
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "col-resize";
    }, [colWidths]);

    const isResizingLeftPanelRef = useRef(false);
    const leftPanelResizeRafRef = useRef<number | null>(null);
    const ganttContainerRef = useRef<HTMLDivElement | null>(null);
    const [subtaskPopoverTaskId, setSubtaskPopoverTaskId] = useState<string | null>(null);
    const [subtaskTitleDraft, setSubtaskTitleDraft] = useState("");
    const [renamePopoverTaskId, setRenamePopoverTaskId] = useState<string | null>(null);
    const [renameTitleDraft, setRenameTitleDraft] = useState("");
    const [timelineRenamePopoverTaskId, setTimelineRenamePopoverTaskId] = useState<string | null>(null);
    const [timelineRenameTitleDraft, setTimelineRenameTitleDraft] = useState("");

    // Group row action states
    const [renameGroupPopoverId, setRenameGroupPopoverId] = useState<string | null>(null);
    const [renameGroupTitleDraft, setRenameGroupTitleDraft] = useState("");
    const [createTaskGroupPopoverId, setCreateTaskGroupPopoverId] = useState<string | null>(null);
    const [createTaskGroupTitleDraft, setCreateTaskGroupTitleDraft] = useState("");
    const [createGroupPopoverId, setCreateGroupPopoverId] = useState<string | null>(null);
    const [createGroupType, setCreateGroupType] = useState<'menu' | 'list' | 'folder'>('menu');
    const [createGroupTitleDraft, setCreateGroupTitleDraft] = useState("");
    const leftScrollAreaRef = useRef<HTMLDivElement | null>(null);
    const rightScrollAreaRef = useRef<HTMLDivElement | null>(null);
    const isSyncingScrollRef = useRef(false);
    const hasInitialNowCenterRef = useRef(false);
    const [scheduleHover, setScheduleHover] = useState<{ taskId: string; leftPx: number } | null>(null);
    const LEFT_PANEL_MIN_WIDTH = 320;
    const LEFT_PANEL_MAX_WIDTH = 820;
    const startLeftPanelResize = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const target = e.currentTarget;
        if ('setPointerCapture' in target) {
            target.setPointerCapture(e.pointerId);
        }
        isResizingLeftPanelRef.current = true;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        document.body.style.pointerEvents = "none";
    }, []);

    const { data: viewData } = trpc.view.get.useQuery({ id: viewId as string }, { staleTime: 60_000, gcTime: 5 * 60_000, enabled: !!viewId });
    const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const effectiveSelectedTaskId = selectedTaskIdFromParent || selectedTaskId;
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
    const [bulkDuplicateModalOpen, setBulkDuplicateModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const closeTaskDetail = () => {
        if (onTaskSelect) onTaskSelect(null);
        else setSelectedTaskId(null);
    };
    const openTaskDetail = (taskId: string) => {
        setTimeout(() => {
            if (onTaskSelect) onTaskSelect(taskId);
            else setSelectedTaskId(taskId);
        }, 0);
    };

    const updateSpaceMutation = trpc.space.update.useMutation();
    const [defaultViewSettingsDraft, setDefaultViewSettingsDraft] = useState<Partial<ListViewSavedConfig>>({});
    const [isDefaultViewSettingsModalOpen, setIsDefaultViewSettingsModalOpen] = useState(false);
    const [defaultViewSettingsApplyTo, setDefaultViewSettingsApplyTo] = useState<"NEW" | "REQUIRED" | "ALL">("NEW");


    // View State from ListView
    const [sortBy, setSortBy] = useState<"manual" | "name" | "dueDate" | "priority" | "status">("manual");
    const [sort, setSort] = useState<{ id: string; desc: boolean }[]>([]);
    const [filterStatus, setFilterStatus] = useState<string[]>([]);
    const [filterPriority, setFilterPriority] = useState<string[]>([]);
    const [filterAssignee, setFilterAssignee] = useState<string[]>([]);
    const [showCompleted, setShowCompleted] = useState(false);
    const [showCompletedSubtasks, setShowCompletedSubtasks] = useState(false);
    const [groupBy, setGroupBy] = useState<string>(
        () => (listId ? "status" : "list")
    );
    const [groupDirection, setGroupDirection] = useState<"asc" | "desc">("asc");
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [expandedSubtaskMode, setExpandedSubtaskMode] = useState<"collapsed" | "expanded" | "separate">("collapsed");
    const [fieldsPanelOpen, setFieldsPanelOpen] = useState(false);
    const [managerModalOpen, setManagerModalOpen] = useState(false);
    const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
    const [sortPanelOpen, setSortPanelOpen] = useState(false);
    const [sortSearchQuery, setSortSearchQuery] = useState("");
    const [filterGroups, setFilterGroups] = useState<FilterGroup>(() => ({
        id: "root",
        operator: "AND",
        conditions: [],
    }));
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

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

    const appliedFilterCount = useMemo(() => {
        if (filterGroups.conditions.length === 0) return 0;
        return filterGroups.conditions.filter(c => {
            if ("conditions" in c) return hasAnyValueInGroup(c as FilterGroup);
            return hasFilterValue(c as FilterCondition);
        }).length;
    }, [filterGroups]);

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

    // Layout options state
    const [hideEmptyLocations, setHideEmptyLocations] = useState(false);
    const [showAssignees, setShowAssignees] = useState(true);
    const [showTaskNames, setShowTaskNames] = useState(true);
    const [showTags, setShowTags] = useState(false);

    const updateViewMutation = trpc.view.update.useMutation();
    const createViewMutation = trpc.view.create.useMutation({
        onSuccess: (newView) => {
            toast.success(`Created new view: ${newView.name}`);
            try {
                void utils.view.get.invalidate();
            } catch (e) {
                // Ignore utils error if not defined yet
            }
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
            // Load autosave state from view config
            const cfg = (viewData.config as any)?.listView;
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

    const saveNewFilter = useCallback(async () => {
        if (!savedFilterName.trim()) return;
        const newFilter = {
            id: Math.random().toString(36).substring(7),
            name: savedFilterName.trim(),
            config: JSON.parse(JSON.stringify(filterGroups))
        };
        setSavedFilters(prev => {
            const next = [...prev, newFilter];
            if (viewId && initialConfig != null) {
                const raw = (initialConfig ?? {}) as Record<string, any>;
                const listView = raw.listView ?? {};
                void updateViewMutation.mutateAsync({ id: viewId, config: { ...raw, listView: { ...listView, savedFilterPresets: next } } });
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
                const listView = raw.listView ?? {};
                void updateViewMutation.mutateAsync({ id: viewId, config: { ...raw, listView: { ...listView, savedFilterPresets: next } } });
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

    const addFilterGroup = () => {
        setFilterGroups(prev => ({
            ...prev,
            conditions: [
                {
                    id: Math.random().toString(36).substring(7),
                    operator: "AND",
                    conditions: [
                        { id: Math.random().toString(36).substring(7), field: "", operator: "is", value: [] }
                    ]
                }
            ]
        }));
    };

    const addFilterCondition = (groupId?: string) => {
        const targetId = groupId || "root";
        const addRecursive = (group: FilterGroup): FilterGroup => {
            if (group.id === targetId) {
                return {
                    ...group,
                    conditions: [...group.conditions, { id: Math.random().toString(36).substring(7), field: "status", operator: "is", value: null }]
                };
            }
            return {
                ...group,
                conditions: group.conditions.map(c => "conditions" in c ? addRecursive(c) : c)
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
                    .map(c => "conditions" in c ? removeRecursive(c) : c)
            };
        };
        setFilterGroups(prev => removeRecursive(prev));
    };

    const updateFilterCondition = (conditionId: string, updates: Partial<FilterCondition>) => {
        const updateRecursive = (group: FilterGroup): FilterGroup => {
            return {
                ...group,
                conditions: group.conditions.map(c => {
                    if ("conditions" in c) return updateRecursive(c);
                    if (c.id === conditionId) return { ...c, ...updates };
                    return c;
                })
            };
        };
        setFilterGroups(prev => updateRecursive(prev));
    };

    const [assigneesPanelOpen, setAssigneesPanelOpen] = useState(false);
    const [filterSearch, setFilterSearch] = useState("");
    const [fieldsSearch, setFieldsSearch] = useState("");
    const [assigneesSearch, setAssigneesSearch] = useState("");
    const [inlineAddGroupKey, setInlineAddGroupKey] = useState<string | null>(null);
    const [inlineAddTitle, setInlineAddTitle] = useState("");
    const [inlineAddParentId, setInlineAddParentId] = useState<string | null>(null);
    const [inlineAddAssigneeIds, setInlineAddAssigneeIds] = useState<string[]>([]);
    const [inlineAddTaskType, setInlineAddTaskType] = useState<string | null>(null);
    const [inlineAddDueDate, setInlineAddDueDate] = useState<Date | null>(null);
    const [inlineAddStartDate, setInlineAddStartDate] = useState<Date | null>(null);
    const [inlineAddPriority, setInlineAddPriority] = useState<"URGENT" | "HIGH" | "NORMAL" | "LOW" | null>(null);
    const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
    const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
    const [createFieldModalOpen, setCreateFieldModalOpen] = useState(false);
    const [createFieldSearch, setCreateFieldSearch] = useState("");
    const [dependenciesTask, setDependenciesTask] = useState<Task | null>(null);
    const [customizePanelOpen, setCustomizePanelOpen] = useState(false);
    const [layoutOptionsOpen, setLayoutOptionsOpen] = useState(false);
    const [customizeMenuOpen, setCustomizeMenuOpen] = useState(false);
    const [customizeViewFilterOpen, setCustomizeViewFilterOpen] = useState(false);
    const [customizeViewGroupOpen, setCustomizeViewGroupOpen] = useState(false);
    const [customizeViewSubtasksOpen, setCustomizeViewSubtasksOpen] = useState(false);
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [showEmptyStatuses, setShowEmptyStatuses] = useState(false);
    const [wrapText, setWrapText] = useState(false);
    const [showTaskLocations, setShowTaskLocations] = useState(false);
    const [showSubtaskParentNames, setShowSubtaskParentNames] = useState(false);
    const [showTaskProperties, setShowTaskProperties] = useState(true);
    const [showTasksFromOtherLists, setShowTasksFromOtherLists] = useState(false);
    const [showSubtasksFromOtherLists, setShowSubtasksFromOtherLists] = useState(false);
    const [viewAutosave, setViewAutosave] = useState(false);
    const [pinView, setPinView] = useState(false);
    const [privateView, setPrivateView] = useState(false);
    const [protectView, setProtectView] = useState(false);
    const [defaultView, setDefaultView] = useState(false);
    const [defaultToMeMode, setDefaultToMeMode] = useState(false);
    const [pinDescription, setPinDescription] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(["name", "assignee", "dueDate", "priority", "tags"]));
    const [columnOrder, setColumnOrder] = useState<string[]>(["assignee", "dueDate", "priority", "tags"]);
    const fieldPanelSensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );
    const taskListSpaceId = spaceId && !projectId && !listId ? spaceId : undefined;
    const taskListProjectId = projectId && !listId ? projectId : undefined;

    const {
        resolvedWorkspaceId,
        space,
        project,
        customFields,
        availableTaskTypes,
        currentUserId,
        workspaceMembers,
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

    const tasks = useMemo<Task[]>(() => rawTasks as Task[], [rawTasks]);

    const getCustomFieldIcon = useCallback((fieldType: string) => {
        const typeMap: Record<string, any> = {
            TEXT: Type, TEXT_AREA: AlignLeft, LONG_TEXT: AlignLeft, NUMBER: Hash,
            CURRENCY: DollarSign, DROPDOWN: ChevronDown, LABELS: Tag, CHECKBOX: CheckSquare,
            DATE: Calendar, PROGRESS: Play, URL: Globe, EMAIL: Mail, PHONE: Phone,
            LOCATION: MapPin, RATING: Star, FILE: Paperclip, FORMULA: FunctionSquare,
            RELATIONSHIP: Link, ROLLUP: TrendingUp, SENTIMENT: Heart, TSHIRT_SIZE: PenTool,
            BUTTON: MousePointer, TASKS: ListTodo, PEOPLE: Users,
            AI_SUMMARIZE: Info, AI_EXTRACT: ArrowRight, AI_ASK: MessageSquare
        };
        return typeMap[fieldType] || null;
    }, []);

    const usedCustomFieldIds = useMemo(() => {
        const fieldIds = new Set<string>();
        tasks.forEach((task: Task) => {
            task.customFieldValues?.forEach((cfv: any) => {
                fieldIds.add(cfv.customFieldId);
            });
            task.subtasks?.forEach((sub: Task) => {
                sub.customFieldValues?.forEach((cfv: any) => {
                    fieldIds.add(cfv.customFieldId);
                });
            });
        });
        return fieldIds;
    }, [tasks]);

    const FIELD_CONFIG = useMemo(() => {
        const custom = (customFields || []).map((f: any) => ({
            id: f.id,
            label: f.name,
            icon: Tag, // Default icon for custom fields
            isCustom: true,
            type: f.type,
            customField: f,
        }));
        return [...GANTT_FIELD_CONFIG, ...custom];
    }, [customFields]);

    const groupLabel = useMemo(() => {
        if (groupBy === "none") return "None";
        return FIELD_CONFIG.find(f => f.id === groupBy)?.label || groupBy;
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
    }, [tasks, listId, currentList, listsData]);

    useEffect(() => {
        if (availableTaskTypes.length > 0 && !inlineAddTaskType) {
            const defaultType = availableTaskTypes.find((t: any) => t.isDefault) || availableTaskTypes[0];
            if (defaultType) {
                setInlineAddTaskType(defaultType.id);
            }
        }
    }, [availableTaskTypes, inlineAddTaskType]);

    const defaultTaskType = useMemo(() => {
        if (availableTaskTypes.length === 0) return null;
        return availableTaskTypes.find((t: any) => t.isDefault) || availableTaskTypes[0];
    }, [availableTaskTypes]);

    const updateTask = trpc.task.update.useMutation({
        onSettled: () => {
            void utils.task.list.invalidate();
        },
    });
    const deleteTask = trpc.task.delete.useMutation({
        onSuccess: () => { void utils.task.list.invalidate(); },
    });
    const createTask = trpc.task.create.useMutation({
        onSuccess: () => { void utils.task.list.invalidate(); },
        onError: () => { void utils.task.list.invalidate(); },
    });
    const duplicateTask = trpc.task.duplicate.useMutation({
        onSuccess: () => { void utils.task.list.invalidate(); },
    });
    const bulkDuplicateTask = trpc.task.bulkDuplicate.useMutation({
        onSuccess: () => {
            void utils.task.list.invalidate();
            setSelectedTasks([]);
        },
    });

    const toggleColumn = (colId: string) => {
        if (colId === "name") return;
        setVisibleColumns(prev => {
            const next = new Set(prev);
            if (next.has(colId)) {
                next.delete(colId);
                setColumnOrder(order => order.filter(id => id !== colId));
            } else {
                next.add(colId);
                setColumnOrder(order => Array.from(new Set([...order, colId])));
            }
            return next;
        });
    };

    // Auto-resize left panel when columns are toggled
    useEffect(() => {
        const nameWidth = Math.max(colWidths.name ?? 300, 200);
        const otherColsWidth = columnOrder
            .filter(c => visibleColumns.has(c) && c !== "name")
            .reduce((sum, colId) => sum + Math.max(colWidths[colId] ?? 184, 100), 0);
        const addBtnWidth = 52;
        const desired = nameWidth + otherColsWidth + addBtnWidth;
        const clamped = Math.min(Math.max(desired, LEFT_PANEL_MIN_WIDTH), LEFT_PANEL_MAX_WIDTH);
        setLeftPanelWidth(clamped);
    }, [visibleColumns, columnOrder]);

    const updateCustomField = trpc.task.customFields.update.useMutation({
        onSuccess: () => { void utils.task.list.invalidate(); },
    });
    const updateList = trpc.list.update.useMutation({
        onSuccess: () => {
            void utils.list.get.invalidate({ id: listId as string });
            void utils.task.list.invalidate();
        },
    });
    const updateFolder = trpc.folder.update.useMutation({
        onSuccess: () => { void utils.folder.byContext.invalidate(); void utils.task.list.invalidate(); }
    });
    const updateProject = trpc.project.update.useMutation({
        onSuccess: () => { void utils.project.invalidate(); void utils.task.list.invalidate(); }
    });
    const createList = trpc.list.create.useMutation({
        onSuccess: () => { void utils.list.byContext.invalidate(); void utils.task.list.invalidate(); }
    });
    const createFolder = trpc.folder.create.useMutation({
        onSuccess: () => { void utils.folder.byContext.invalidate(); void utils.task.list.invalidate(); }
    });

    const spaceDefaultViewConfig = useMemo(() => {
        return (space?.settings as any)?.defaultViewConfig || {};
    }, [space]);

    const viewConfigFromDb: ListViewSavedConfig = useMemo(() => {
        const raw = (initialConfig ?? {}) as any;
        const viewConfig = (raw.listView ?? raw ?? {}) as ListViewSavedConfig;

        // Merge space defaults if they exist and view config fields are missing
        return {
            ...spaceDefaultViewConfig,
            ...viewConfig
        } as ListViewSavedConfig;
    }, [initialConfig, spaceDefaultViewConfig]);

    // Apply saved config when switching views / initial load
    useEffect(() => {
        const cfg = viewConfigFromDb;

        // Grouping and layout
        if (cfg.groupBy) setGroupBy(cfg.groupBy);
        if (cfg.groupDirection) setGroupDirection(cfg.groupDirection);
        if (cfg.subtasksMode) setExpandedSubtaskMode(cfg.subtasksMode);
        if (cfg.sortBy) setSortBy(cfg.sortBy);
        if (cfg.sortDirection) setSortDirection(cfg.sortDirection);

        // Visibility options
        if (typeof cfg.showCompleted === "boolean") setShowCompleted(cfg.showCompleted);
        if (typeof cfg.showCompletedSubtasks === "boolean") setShowCompletedSubtasks(cfg.showCompletedSubtasks);
        if (cfg.pinDescription !== undefined) setPinDescription(cfg.pinDescription);
        if (Array.isArray(cfg.columnOrder) && cfg.columnOrder.length) setColumnOrder(cfg.columnOrder);
        if (Array.isArray(cfg.visibleColumns) && cfg.visibleColumns.length) setVisibleColumns(new Set(cfg.visibleColumns));
        if (cfg.colWidths && typeof cfg.colWidths === 'object') setColWidths(cfg.colWidths as Record<string, number>);

        // Layout options
        if (typeof cfg.showEmptyStatuses === "boolean") setShowEmptyStatuses(cfg.showEmptyStatuses);
        if (typeof cfg.wrapText === "boolean") setWrapText(cfg.wrapText);
        if (typeof cfg.showTaskLocations === "boolean") setShowTaskLocations(cfg.showTaskLocations);
        if (typeof cfg.showSubtaskParentNames === "boolean") setShowSubtaskParentNames(cfg.showSubtaskParentNames);
        if (typeof cfg.showTaskProperties === "boolean") setShowTaskProperties(cfg.showTaskProperties);
        if (typeof cfg.showTasksFromOtherLists === "boolean") setShowTasksFromOtherLists(cfg.showTasksFromOtherLists);
        if (typeof cfg.showSubtasksFromOtherLists === "boolean") setShowSubtasksFromOtherLists(cfg.showSubtasksFromOtherLists);
        if (typeof cfg.pinDescription === "boolean") setPinDescription(cfg.pinDescription);

        // View settings
        if (typeof cfg.viewAutosave === "boolean") setViewAutosave(cfg.viewAutosave);
        if (typeof cfg.defaultToMeMode === "boolean") setDefaultToMeMode(cfg.defaultToMeMode);

        // Filters
        if (viewId && Array.isArray((cfg as any).savedFilterPresets)) setSavedFilters((cfg as any).savedFilterPresets);
        if (cfg.filterGroups && typeof cfg.filterGroups === "object" && typeof (cfg.filterGroups as FilterGroup).id === "string" && Array.isArray((cfg.filterGroups as FilterGroup).conditions)) {
            setFilterGroups(cfg.filterGroups as FilterGroup);
        }

        // baseline snapshot for dirty-check
        const baseline = stableStringify({
            groupBy: cfg.groupBy ?? groupBy,
            groupDirection: cfg.groupDirection ?? groupDirection,
            subtasksMode: cfg.subtasksMode ?? expandedSubtaskMode,
            sortBy: cfg.sortBy ?? sortBy,
            sortDirection: cfg.sortDirection ?? sortDirection,
            showCompleted: typeof cfg.showCompleted === "boolean" ? cfg.showCompleted : showCompleted,
            showCompletedSubtasks: typeof cfg.showCompletedSubtasks === "boolean" ? cfg.showCompletedSubtasks : showCompletedSubtasks,
            defaultToMeMode,
            columnOrder: Array.isArray(cfg.columnOrder) ? cfg.columnOrder : Array.from(columnOrder),
            colWidths: cfg.colWidths && typeof cfg.colWidths === 'object' ? cfg.colWidths : colWidths,
            visibleColumns: Array.isArray(cfg.visibleColumns) ? cfg.visibleColumns : Array.from(visibleColumns),
            showEmptyStatuses: typeof cfg.showEmptyStatuses === "boolean" ? cfg.showEmptyStatuses : showEmptyStatuses,
            wrapText: typeof cfg.wrapText === "boolean" ? cfg.wrapText : wrapText,
            showTaskLocations: typeof cfg.showTaskLocations === "boolean" ? cfg.showTaskLocations : showTaskLocations,
            showSubtaskParentNames: typeof cfg.showSubtaskParentNames === "boolean" ? cfg.showSubtaskParentNames : showSubtaskParentNames,
            showTaskProperties: typeof cfg.showTaskProperties === "boolean" ? cfg.showTaskProperties : showTaskProperties,
            showTasksFromOtherLists: typeof cfg.showTasksFromOtherLists === "boolean" ? cfg.showTasksFromOtherLists : showTasksFromOtherLists,
            showSubtasksFromOtherLists: typeof cfg.showSubtasksFromOtherLists === "boolean" ? cfg.showSubtasksFromOtherLists : showSubtasksFromOtherLists,
            pinDescription: typeof cfg.pinDescription === "boolean" ? cfg.pinDescription : pinDescription,
            viewAutosave: typeof cfg.viewAutosave === "boolean" ? cfg.viewAutosave : viewAutosave,
            filterGroups: cfg.filterGroups && typeof (cfg.filterGroups as FilterGroup).conditions !== "undefined" ? (cfg.filterGroups as FilterGroup) : filterGroups,
        });
        setSavedSnapshot(baseline);
        // Re-apply when view switches or when saved config (e.g. after refetch) changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewId, viewConfigFromDb]);

    const currentViewConfig: ListViewSavedConfig = useMemo(() => ({
        // Grouping and layout
        groupBy,
        groupDirection,
        subtasksMode: expandedSubtaskMode,
        sortBy,
        sortDirection,

        // Visibility options
        showCompleted,
        showCompletedSubtasks,
        showClosedTasks: !showCompleted,
        visibleColumns: Array.from(visibleColumns),
        columnOrder: Array.from(columnOrder),
        colWidths,

        // Layout options
        showEmptyStatuses,
        wrapText,
        showTaskLocations,
        showSubtaskParentNames,
        showTaskProperties,
        showTasksFromOtherLists,
        showSubtasksFromOtherLists,
        pinDescription,

        // View settings
        viewAutosave,
        defaultToMeMode,

        // Active filters (persisted and restored with view)
        filterGroups,
    }), [
        groupBy,
        expandedSubtaskMode,
        groupDirection,
        sortBy,
        sortDirection,
        showCompleted,
        showCompletedSubtasks,
        visibleColumns,
        columnOrder,
        colWidths,
        showEmptyStatuses,
        wrapText,
        showTaskLocations,
        showSubtaskParentNames,
        showTaskProperties,
        showTasksFromOtherLists,
        showSubtasksFromOtherLists,
        pinDescription,
        viewAutosave,
        defaultToMeMode,
        filterGroups,
    ]);

    const isViewDirty = useMemo(() => {
        if (!viewId) return false;
        const now = stableStringify(currentViewConfig);
        return savedSnapshot ? now !== savedSnapshot : false;
    }, [viewId, currentViewConfig, savedSnapshot]);

    const saveViewConfig = useCallback(async (overrides?: Partial<ListViewSavedConfig>, silent = false) => {
        if (!viewId) return;
        const raw = (initialConfig ?? {}) as any;
        const listView = raw?.listView ?? {};
        const configToSave = { ...currentViewConfig, ...overrides };
        const nextConfig = { ...raw, listView: { ...listView, ...configToSave, savedFilterPresets: savedFilters } };
        await updateViewMutation.mutateAsync({ id: viewId, config: nextConfig });
        setSavedSnapshot(stableStringify(configToSave));
        if (!silent) {
            toast.success("View saved successfully");
        }
    }, [viewId, initialConfig, currentViewConfig, savedFilters, updateViewMutation]);

    const handleToggleAutosave = useCallback(async (enabled: boolean) => {
        setViewAutosave(enabled);
        // Persist the autosave setting itself immediately
        await saveViewConfig({ viewAutosave: enabled }, true);
        toast.success(`Autosave ${enabled ? 'enabled' : 'disabled'}`);
    }, [saveViewConfig]);

    useEffect(() => {
        if (viewAutosave && isViewDirty) {
            void saveViewConfig(undefined, true);
        }
    }, [viewAutosave, isViewDirty, saveViewConfig]);

    const resetViewToDefaults = useCallback(() => {
        const cfg = spaceDefaultViewConfig || {};

        // Apply space defaults or system defaults
        setGroupBy(cfg.groupBy ?? (listId ? "status" : "list"));
        setGroupDirection(cfg.groupDirection ?? "asc");
        setExpandedSubtaskMode(cfg.subtasksMode ?? "collapsed");
        setSortBy(cfg.sortBy ?? "manual");
        setSortDirection(cfg.sortDirection ?? "asc");
        setShowCompleted(cfg.showCompleted ?? false);
        setShowCompletedSubtasks(cfg.showCompletedSubtasks ?? false);
        setVisibleColumns(Array.isArray(cfg.visibleColumns) && cfg.visibleColumns.length
            ? new Set(cfg.visibleColumns)
            : new Set(["name", "assignee", "dueDate", "priority", "tags"]));
        setShowEmptyStatuses(cfg.showEmptyStatuses ?? false);
        setWrapText(cfg.wrapText ?? false);
        setShowTaskLocations(cfg.showTaskLocations ?? false);
        setShowSubtaskParentNames(cfg.showSubtaskParentNames ?? false);
        setShowTaskProperties(cfg.showTaskProperties ?? true);
        setShowTasksFromOtherLists(cfg.showTasksFromOtherLists ?? false);
        setShowSubtasksFromOtherLists(cfg.showSubtasksFromOtherLists ?? false);
        setPinDescription(cfg.pinDescription ?? false);
        setDefaultToMeMode(cfg.defaultToMeMode ?? false);

        toast.success("View reset to defaults");
    }, [spaceDefaultViewConfig, listId]);

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

    const userById = useMemo(() => {
        const map = new Map<string, { id: string; name: string; email?: string | null; image?: string | null }>();
        users.forEach(u => map.set(u.id, u));
        return map;
    }, [users]);

    const lists = (listsData?.items ?? []).map((l: any) => ({ id: l.id, name: l.name }));

    const listPathLabel = useMemo(() => {
        if (!listId || !currentList) return null;
        const listName = (currentList as any).name as string | undefined;
        const folderName = ((currentList as any).folder?.name ?? (currentList as any).parentFolder?.name) as string | undefined;
        if (!listName) return null;
        if (!folderName) return listName;
        return `${listName} / ${folderName}`;
    }, [listId, currentList]);

    const filteredTasks = useMemo(() => {
        let result = tasks;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(t => (t.title || t.name || "").toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
        }
        if (filterStatus.length > 0) result = result.filter(t => filterStatus.includes(t.status?.name || ""));
        if (filterPriority.length > 0) result = result.filter(t => filterPriority.includes(t.priority || ""));
        if (filterAssignee.length > 0) {
            const hasUnassigned = filterAssignee.includes("__unassigned__");
            const assigneeIds = filterAssignee.filter(id => id !== "__unassigned__");
            result = result.filter(t => {
                const assignees = t.assignees ?? [];
                const hasAnyAssignee = assignees.length > 0;
                const matchesAssigned = assigneeIds.length > 0
                    ? assignees.some((a: any) => assigneeIds.includes(a.user?.id))
                    : false;
                const matchesUnassigned = hasUnassigned && !hasAnyAssignee;
                return matchesAssigned || matchesUnassigned;
            });
        }
        // Filter out closed/completed tasks when showCompleted is false
        // Only filter if status exists and is explicitly "done" or "completed"
        if (!showCompleted) {
            result = result.filter(t => {
                const statusName = t.status?.name?.toLowerCase() || "";
                // Only hide if status is explicitly "done" or "completed", not if status is null/undefined/none
                return statusName !== "done" && statusName !== "completed";
            });
        }
        // When showCompletedSubtasks is false, hide subtasks (tasks with parentId) that are done/completed
        if (!showCompletedSubtasks) {
            result = result.filter(t => {
                if (!t.parentId) return true;
                const statusName = t.status?.name?.toLowerCase() || "";
                return statusName !== "done" && statusName !== "completed";
            });
        }

        // Default to Me Mode: Filter tasks assigned to current user
        if (defaultToMeMode && currentUserId) {
            result = result.filter(t => {
                const assignees = t.assignees ?? [];
                const isAssigned = assignees.some((a: any) => a.user?.id === currentUserId) ||
                    t.assigneeId === currentUserId ||
                    (t.assignee && t.assignee.id === currentUserId);
                return isAssigned;
            });
        }

        if (filterGroups.conditions.length > 0) {
            result = result.filter(t => evaluateGroup(t, filterGroups));
        }

        // Apply legacy simple filters if any (for backward compatibility during transition)
        if (filterStatus.length > 0) result = result.filter(t => filterStatus.includes(t.status?.name || ""));
        if (filterPriority.length > 0) result = result.filter(t => filterPriority.includes(t.priority || ""));
        if (filterAssignee.length > 0) {
            const hasUnassigned = filterAssignee.includes("__unassigned__");
            const assigneeIds = filterAssignee.filter(id => id !== "__unassigned__");
            result = result.filter(t => {
                const assignees = t.assignees ?? [];
                const hasAnyAssignee = assignees.length > 0;
                const matchesAssigned = assigneeIds.length > 0
                    ? assignees.some((a: any) => assigneeIds.includes(a.user?.id))
                    : false;
                const matchesUnassigned = hasUnassigned && !hasAnyAssignee;
                return matchesAssigned || matchesUnassigned;
            });
        }

        // When using manual sort, preserve backend order (which now uses Task.order),
        // otherwise apply the selected sort.
        if (sortBy !== "manual") {
            result = [...result].sort((a, b) => {
                let c = 0;
                if (sortBy === "name") c = (a.title || a.name || "").localeCompare(b.title || b.name || "");
                else if (sortBy === "dueDate") {
                    if (!a.dueDate) return 1; if (!b.dueDate) return -1;
                    c = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                } else if (sortBy === "priority") {
                    const o: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
                    c = (o[a.priority as string] ?? 99) - (o[b.priority as string] ?? 99);
                } else if (sortBy === "status") c = (a.status?.name || "").localeCompare(b.status?.name || "");
                return sortDirection === "asc" ? c : -c;
            });
        }
        return result;
    }, [tasks, searchQuery, filterStatus, filterPriority, filterAssignee, showCompleted, showCompletedSubtasks, sortBy, sortDirection, filterGroups]);

    const DAY_MS = 1000 * 60 * 60 * 24;
    const BAR_LABEL_GAP_PX = 12;
    const BAR_LABEL_RIGHT_PAD_PX = 260;
    const ZOOM_WIDTH_LIMITS: Record<BaseTimeScale, { min: number; max: number }> = {
        Day: { min: 26, max: 80 },
        Week: { min: 36, max: 120 },
        Month: { min: 96, max: 320 },
        Quarter: { min: 72, max: 220 },
        Year: { min: 140, max: 420 },
    };
    const SCALE_ORDER: BaseTimeScale[] = ["Day", "Week", "Month", "Quarter", "Year"];
    const effectiveTimeScale: BaseTimeScale = timeScale === "Flexible" ? flexibleInternalScale : timeScale;
    const activeColumnWidth = columnWidthByScale[effectiveTimeScale];


    const saveDefaultViewSettings = async () => {
        if (!spaceId) return;

        const nextSpaceSettings = {
            ...(space?.settings as any || {}),
            defaultViewConfig: defaultViewSettingsDraft
        };

        try {
            // 1. Update Space defaults
            await updateSpaceMutation.mutateAsync({
                id: spaceId,
                settings: nextSpaceSettings
            });

            // 2. Adjust for existing views if needed
            if (defaultViewSettingsApplyTo === "REQUIRED" || defaultViewSettingsApplyTo === "ALL") {
                // For "REQUIRED", update current view
                if (viewId) {
                    const raw = (initialConfig ?? {}) as any;
                    const listView = raw?.listView ?? {};
                    const nextConfig = { ...raw, listView: { ...listView, ...defaultViewSettingsDraft } };
                    await updateViewMutation.mutateAsync({ id: viewId, config: nextConfig });
                }

                // For "ALL", merge default listView into each view's config (do not replace entire config)
                if (defaultViewSettingsApplyTo === "ALL") {
                    const views = await utils.view.list.fetch({ spaceId });
                    await Promise.all(views.map((v: { id: string; config: any }) =>
                        updateViewMutation.mutateAsync({
                            id: v.id,
                            config: {
                                ...(v.config ?? {}),
                                listView: {
                                    ...((v.config as any)?.listView ?? {}),
                                    ...defaultViewSettingsDraft
                                }
                            }
                        })
                    ));
                }
            }

            toast.success("Default view settings saved");
            setIsDefaultViewSettingsModalOpen(false);
        } catch (error: any) {
            toast.error(`Failed to save defaults: ${error.message}`);
        }
    };

    const revertViewChanges = useCallback(() => {
        const cfg = viewConfigFromDb;

        // Grouping and layout - reset to defaults
        setGroupBy(cfg.groupBy ?? (listId ? "status" : "list"));
        setGroupDirection(cfg.groupDirection ?? "asc");
        setExpandedSubtaskMode(cfg.subtasksMode ?? "collapsed");
        setSortBy(cfg.sortBy ?? "manual");
        setSortDirection(cfg.sortDirection ?? "asc");

        // Visibility options - reset to defaults
        setShowCompleted(cfg.showCompleted ?? false);
        setShowCompletedSubtasks(cfg.showCompletedSubtasks ?? false);
        setVisibleColumns(Array.isArray(cfg.visibleColumns) && cfg.visibleColumns.length
            ? new Set(cfg.visibleColumns)
            : new Set(["name", "assignee", "dueDate", "priority"]));

        // Layout options - reset to defaults
        setShowEmptyStatuses(cfg.showEmptyStatuses ?? false);
        setWrapText(cfg.wrapText ?? false);
        setShowTaskLocations(cfg.showTaskLocations ?? false);
        setShowSubtaskParentNames(cfg.showSubtaskParentNames ?? false);
        setShowTaskProperties(cfg.showTaskProperties ?? true);
        setShowTasksFromOtherLists(cfg.showTasksFromOtherLists ?? false);
        setShowSubtasksFromOtherLists(cfg.showSubtasksFromOtherLists ?? false);
        setPinDescription(cfg.pinDescription ?? false);

        // View settings - reset to defaults
        setViewAutosave(cfg.viewAutosave ?? false);
        setDefaultToMeMode(cfg.defaultToMeMode ?? false);

        // Update snapshot with the reverted config
        const revertedConfig = {
            groupBy: cfg.groupBy ?? (listId ? "status" : "list"),
            groupDirection: cfg.groupDirection ?? "asc",
            subtasksMode: cfg.subtasksMode ?? "collapsed",
            sortBy: cfg.sortBy ?? "manual",
            sortDirection: cfg.sortDirection ?? "asc",
            showCompleted: cfg.showCompleted ?? false,
            showCompletedSubtasks: cfg.showCompletedSubtasks ?? false,
            visibleColumns: Array.isArray(cfg.visibleColumns) && cfg.visibleColumns.length
                ? cfg.visibleColumns
                : ["name", "assignee", "dueDate", "priority"],
            showEmptyStatuses: cfg.showEmptyStatuses ?? false,
            wrapText: cfg.wrapText ?? false,
            showTaskLocations: cfg.showTaskLocations ?? false,
            showSubtaskParentNames: cfg.showSubtaskParentNames ?? false,
            showTaskProperties: cfg.showTaskProperties ?? true,
            showTasksFromOtherLists: cfg.showTasksFromOtherLists ?? false,
            showSubtasksFromOtherLists: cfg.showSubtasksFromOtherLists ?? false,
            pinDescription: cfg.pinDescription ?? false,
            viewAutosave: cfg.viewAutosave ?? false,
            defaultToMeMode: cfg.defaultToMeMode ?? false,
        };

        setSavedSnapshot(stableStringify(revertedConfig));
        toast.success("Changes reverted to default");
    }, [viewConfigFromDb, listId]);

    const saveAsNewView = useCallback(async () => {
        if (!viewId) return;

        // Must have at least one container ID
        if (!spaceId && !projectId && !teamId && !listId) {
            toast.error("Cannot create view: missing container context");
            return;
        }

        const newName = `${viewData?.name || "View"} (Copy)`;
        const raw = (initialConfig ?? {}) as any;
        const listView = raw?.listView ?? {};
        const nextConfig = { ...raw, listView: { ...listView, ...currentViewConfig, savedFilterPresets: savedFilters, viewAutosave: false } };

        try {
            await createViewMutation.mutateAsync({
                name: newName,
                type: viewData?.type || "LIST",
                spaceId: spaceId || undefined,
                projectId: projectId || undefined,
                teamId: teamId || undefined,
                listId: listId || undefined,
                config: nextConfig,
            });
        } catch (error: any) {
            toast.error(`Failed to create view: ${error.message}`);
        }
    }, [viewId, viewData, spaceId, projectId, teamId, listId, initialConfig, currentViewConfig, savedFilters, createViewMutation]);

    const viewContentToSave = useMemo(() => {
        return {
            id: viewId,
            name: viewData?.name || "Gantt",
            type: "GANTT",
            workspaceId: (workspaceId || resolvedWorkspaceId || viewData?.workspaceId) ?? undefined,
            spaceId: spaceId || undefined,
            projectId: projectId || undefined,
            folderId: folderId || undefined,
            listId: listId || undefined,
            teamId: teamId || undefined,
            config: {
                ...(typeof viewData?.config === "object" && viewData?.config !== null ? viewData.config : {}),
                listView: currentViewConfig,
            },
            groupBy,
            groupDirection,
            sortBy,
            sortDirection,
            visibleColumns: Array.from(visibleColumns),
            filters: filterGroups,
        };
    }, [
        viewId,
        viewData,
        workspaceId,
        resolvedWorkspaceId,
        spaceId,
        projectId,
        folderId,
        listId,
        teamId,
        currentViewConfig,
        groupBy,
        groupDirection,
        sortBy,
        sortDirection,
        visibleColumns,
        filterGroups,
    ]);

    // Auto-save effect when autosave is enabled
    useEffect(() => {
        if (!viewAutosave || !isViewDirty || !viewId) return;
        const timer = setTimeout(() => {
            void saveViewConfig(undefined, true);
        }, 1000); // Debounce 1 second
        return () => clearTimeout(timer);
    }, [viewAutosave, isViewDirty, viewId, currentViewConfig]);


    // Calculate base date range
    const getBaseDateRange = useCallback(() => {
        const tasksWithAnyDate = tasks.filter(t => isValidDate(t.startDate) || isValidDate(t.dueDate));

        if (tasksWithAnyDate.length === 0) {
            const today = new Date();
            const start = new Date(today);
            const end = new Date(today);
            if (effectiveTimeScale === "Day") {
                start.setDate(start.getDate() - 7);
                end.setDate(end.getDate() + 21);
            } else if (effectiveTimeScale === "Week") {
                start.setDate(start.getDate() - 28);
                end.setDate(end.getDate() + 56);
            } else if (effectiveTimeScale === "Month") {
                start.setMonth(start.getMonth() - 3, 1);
                end.setMonth(end.getMonth() + 5, 0);
            } else if (effectiveTimeScale === "Quarter") {
                start.setMonth(start.getMonth() - 6, 1);
                end.setMonth(end.getMonth() + 9, 0);
            } else {
                start.setFullYear(start.getFullYear() - 2, 0, 1);
                end.setFullYear(end.getFullYear() + 3, 11, 31);
            }
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return { start, end };
        }

        const dates = tasksWithAnyDate
            .flatMap(t => [t.startDate, t.dueDate].filter(isValidDate))
            .map(d => new Date(d!));

        const start = new Date(Math.min(...dates.map(d => d.getTime())));
        const end = new Date(Math.max(...dates.map(d => d.getTime())));

        // Padding and alignment based on timescale
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);

        if (effectiveTimeScale === "Day") {
            start.setDate(start.getDate() - 7);
            end.setDate(end.getDate() + 21);
        } else if (effectiveTimeScale === "Week") {
            start.setDate(start.getDate() - 28);
            end.setDate(end.getDate() + 56);
        } else if (effectiveTimeScale === "Month") {
            start.setMonth(start.getMonth() - 2, 1);
            end.setMonth(end.getMonth() + 3, 0);
        } else if (effectiveTimeScale === "Quarter") {
            start.setMonth(start.getMonth() - 4, 1);
            end.setMonth(end.getMonth() + 6, 0);
        } else {
            start.setFullYear(start.getFullYear() - 1, 0, 1);
            end.setFullYear(end.getFullYear() + 2, 11, 31);
        }

        return { start, end };
    }, [tasks, effectiveTimeScale]);
    const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(() => getBaseDateRange());

    // Keep a ref so the scale-change effect always calls the latest getBaseDateRange
    // (which includes current tasks) without listing it as a dependency.
    const getBaseDateRangeRef = useRef(getBaseDateRange);
    getBaseDateRangeRef.current = getBaseDateRange;

    // Only reset the date range when the TIME SCALE changes from the dropdown.
    // DO NOT depend on `tasks` here — that caused the view to rescale every time
    // a date was added to a task.
    useEffect(() => {
        setDateRange(getBaseDateRangeRef.current());
         
    }, [effectiveTimeScale]);

    const timelineUnits = useMemo(() => {
        const units: TimelineUnit[] = [];
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        const current = new Date(start);

        if (effectiveTimeScale === "Day") {
            current.setHours(0, 0, 0, 0);
            end.setHours(23, 0, 0, 0);
            while (current <= end) {
                const hour = current.getHours();
                const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;
                const suffix = hour < 12 ? "a" : "p";
                units.push({
                    date: new Date(current),
                    label: `${normalizedHour}${suffix}`,
                    dayKey: format(current, "yyyy-MM-dd"),
                    dayLabel: format(current, "EEE, MMM d"),
                });
                current.setHours(current.getHours() + 1);
            }
        } else if (effectiveTimeScale === "Week") {
            const currentIsoDay = (current.getDay() + 6) % 7; // Mon=0 ... Sun=6
            current.setDate(current.getDate() - currentIsoDay);
            current.setHours(0, 0, 0, 0);
            const weekAlignedEnd = new Date(end);
            const endIsoDay = (weekAlignedEnd.getDay() + 6) % 7; // Mon=0 ... Sun=6
            weekAlignedEnd.setDate(weekAlignedEnd.getDate() + (6 - endIsoDay));
            weekAlignedEnd.setHours(23, 59, 59, 999);
            while (current <= weekAlignedEnd) {
                const weekStart = new Date(current);
                const weekStartIsoDay = (weekStart.getDay() + 6) % 7; // Mon=0 ... Sun=6
                weekStart.setDate(weekStart.getDate() - weekStartIsoDay);
                weekStart.setHours(0, 0, 0, 0);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                const weekKey = format(weekStart, "yyyy-MM-dd");
                const weekLabel = `${format(weekStart, "MMM d")} - ${format(weekEnd, "d")}`;
                const weekNumber = `W${format(weekStart, "II")}`;
                units.push({
                    date: new Date(current),
                    label: `${format(current, "EEE")} ${current.getDate()}`,
                    dayKey: format(current, "yyyy-MM-dd"),
                    dayLabel: format(current, "EEE d"),
                    weekKey,
                    weekLabel,
                    weekNumber,
                    isWeekend: current.getDay() === 0 || current.getDay() === 6,
                });
                current.setDate(current.getDate() + 1);
            }
        } else if (effectiveTimeScale === "Month") {
            current.setDate(1);
            current.setHours(0, 0, 0, 0);
            const currentIsoDay = (current.getDay() + 6) % 7; // Mon=0 ... Sun=6
            current.setDate(current.getDate() - currentIsoDay);
            const monthAlignedEnd = new Date(end);
            const endIsoDay = (monthAlignedEnd.getDay() + 6) % 7; // Mon=0 ... Sun=6
            monthAlignedEnd.setDate(monthAlignedEnd.getDate() + (6 - endIsoDay));
            monthAlignedEnd.setHours(23, 59, 59, 999);
            while (current <= monthAlignedEnd) {
                const weekStart = new Date(current);
                const weekEnd = new Date(current);
                weekEnd.setDate(weekEnd.getDate() + 6);
                units.push({
                    date: new Date(current),
                    label: `${format(weekStart, "d")}-${format(weekEnd, "d")}`,
                    weekKey: format(weekStart, "yyyy-MM-dd"),
                    weekLabel: `${format(weekStart, "d")}-${format(weekEnd, "d")}`,
                    weekNumber: `W${format(weekStart, "II")}`,
                    monthKey: format(weekStart, "yyyy-MM"),
                    monthLabel: `${format(weekStart, "yyyy")} ${format(weekStart, "MMM")}`,
                });
                current.setDate(current.getDate() + 7);
            }
        } else if (effectiveTimeScale === "Quarter") {
            const quarterStartMonth = Math.floor(current.getMonth() / 3) * 3;
            current.setMonth(quarterStartMonth, 1);
            current.setHours(0, 0, 0, 0);
            while (current <= end) {
                const q = Math.floor(current.getMonth() / 3) + 1;
                units.push({
                    date: new Date(current),
                    label: format(current, "MMM"),
                    monthKey: format(current, "yyyy-MM"),
                    monthLabel: format(current, "MMM"),
                    quarterKey: `${current.getFullYear()}-Q${q}`,
                    quarterLabel: `Q${q}`,
                    quarterYear: current.getFullYear(),
                    quarterNumber: q,
                });
                current.setMonth(current.getMonth() + 1);
            }
        } else {
            current.setMonth(0, 1);
            current.setHours(0, 0, 0, 0);
            while (current <= end) {
                const q = Math.floor(current.getMonth() / 3) + 1;
                units.push({
                    date: new Date(current),
                    label: `Q${q}`,
                    quarterKey: `${current.getFullYear()}-Q${q}`,
                    quarterLabel: `Q${q}`,
                    quarterYear: current.getFullYear(),
                    quarterNumber: q,
                    yearKey: `${current.getFullYear()}`,
                    yearLabel: `${current.getFullYear()}`,
                });
                current.setMonth(current.getMonth() + 3);
            }
        }
        return units;
    }, [dateRange.end, dateRange.start, effectiveTimeScale]);

    const dayHeaderSegments = useMemo(() => {
        if (effectiveTimeScale !== "Day" || timelineUnits.length === 0) return [] as { dayKey: string; dayLabel: string; span: number }[];
        const segments: { dayKey: string; dayLabel: string; span: number }[] = [];
        for (const unit of timelineUnits) {
            if (!unit.dayKey || !unit.dayLabel) continue;
            const last = segments[segments.length - 1];
            if (!last || last.dayKey !== unit.dayKey) {
                segments.push({ dayKey: unit.dayKey, dayLabel: unit.dayLabel, span: 1 });
            } else {
                last.span += 1;
            }
        }
        return segments;
    }, [effectiveTimeScale, timelineUnits]);

    const weekHeaderSegments = useMemo(() => {
        if (effectiveTimeScale !== "Week" || timelineUnits.length === 0) return [] as { weekKey: string; weekLabel: string; weekNumber: string; span: number }[];
        const segments: { weekKey: string; weekLabel: string; weekNumber: string; span: number }[] = [];
        for (const unit of timelineUnits) {
            if (!unit.weekKey || !unit.weekLabel || !unit.weekNumber) continue;
            const last = segments[segments.length - 1];
            if (!last || last.weekKey !== unit.weekKey) {
                segments.push({ weekKey: unit.weekKey, weekLabel: unit.weekLabel, weekNumber: unit.weekNumber, span: 1 });
            } else {
                last.span += 1;
            }
        }
        return segments;
    }, [effectiveTimeScale, timelineUnits]);

    const monthHeaderSegments = useMemo(() => {
        if (effectiveTimeScale !== "Month" || timelineUnits.length === 0) return [] as { monthKey: string; monthLabel: string; span: number }[];
        const segments: { monthKey: string; monthLabel: string; span: number }[] = [];
        for (const unit of timelineUnits) {
            if (!unit.monthKey || !unit.monthLabel) continue;
            const last = segments[segments.length - 1];
            if (!last || last.monthKey !== unit.monthKey) {
                segments.push({ monthKey: unit.monthKey, monthLabel: unit.monthLabel, span: 1 });
            } else {
                last.span += 1;
            }
        }
        return segments;
    }, [effectiveTimeScale, timelineUnits]);

    const quarterHeaderSegments = useMemo(() => {
        if (effectiveTimeScale !== "Quarter" || timelineUnits.length === 0) {
            return [] as { quarterKey: string; quarterLabel: string; quarterYear: number; span: number }[];
        }
        const segments: { quarterKey: string; quarterLabel: string; quarterYear: number; span: number }[] = [];
        for (const unit of timelineUnits) {
            if (!unit.quarterKey || !unit.quarterLabel || !unit.quarterYear) continue;
            const last = segments[segments.length - 1];
            if (!last || last.quarterKey !== unit.quarterKey) {
                segments.push({
                    quarterKey: unit.quarterKey,
                    quarterLabel: unit.quarterLabel,
                    quarterYear: unit.quarterYear,
                    span: 1,
                });
            } else {
                last.span += 1;
            }
        }
        return segments;
    }, [effectiveTimeScale, timelineUnits]);

    const yearHeaderSegments = useMemo(() => {
        if (effectiveTimeScale !== "Year" || timelineUnits.length === 0) {
            return [] as { yearKey: string; yearLabel: string; span: number }[];
        }
        const segments: { yearKey: string; yearLabel: string; span: number }[] = [];
        for (const unit of timelineUnits) {
            if (!unit.yearKey || !unit.yearLabel) continue;
            const last = segments[segments.length - 1];
            if (!last || last.yearKey !== unit.yearKey) {
                segments.push({ yearKey: unit.yearKey, yearLabel: unit.yearLabel, span: 1 });
            } else {
                last.span += 1;
            }
        }
        return segments;
    }, [effectiveTimeScale, timelineUnits]);

    const totalTimelineWidthPx = useMemo(() => Math.max(1, timelineUnits.length * activeColumnWidth), [timelineUnits.length, activeColumnWidth]);
    const totalTimelineCanvasWidthPx = useMemo(
        () => totalTimelineWidthPx + BAR_LABEL_RIGHT_PAD_PX,
        [totalTimelineWidthPx]
    );

    const scrollTimelineToNow = useCallback((behavior: ScrollBehavior = "auto") => {
        const viewport = rightScrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement | null;
        if (!viewport) return;

        const now = Date.now();
        const startTs = dateRange.start.getTime();
        const endTs = dateRange.end.getTime();
        const totalMs = endTs - startTs;
        if (totalMs <= 0 || totalTimelineWidthPx <= 0) return;

        const ratio = (now - startTs) / totalMs;
        const nowPx = Math.max(0, Math.min(totalTimelineWidthPx, ratio * totalTimelineWidthPx));
        const targetLeft = Math.max(0, nowPx - viewport.clientWidth / 2);

        viewport.scrollTo({ left: targetLeft, behavior });
    }, [dateRange.end, dateRange.start, totalTimelineWidthPx]);

    const ensureNowInRange = useCallback(() => {
        const now = Date.now();
        const startTs = dateRange.start.getTime();
        const endTs = dateRange.end.getTime();
        if (now >= startTs && now <= endTs) return false;

        const spanMs = Math.max(DAY_MS, endTs - startTs);
        const nextStart = new Date(now - spanMs / 2);
        const nextEnd = new Date(now + spanMs / 2);
        nextStart.setHours(0, 0, 0, 0);
        nextEnd.setHours(23, 59, 59, 999);

        setDateRange({ start: nextStart, end: nextEnd });
        return true;
    }, [dateRange.end, dateRange.start]);

    const setScaleColumnWidth = useCallback((scale: BaseTimeScale, width: number) => {
        const lim = ZOOM_WIDTH_LIMITS[scale];
        const clamped = Math.max(lim.min, Math.min(lim.max, width));
        setColumnWidthByScale(prev => ({ ...prev, [scale]: clamped }));
    }, []);

    const canZoomIn = columnWidthByScale[effectiveTimeScale] < ZOOM_WIDTH_LIMITS[effectiveTimeScale].max || (timeScale === "Flexible" && SCALE_ORDER.indexOf(effectiveTimeScale) > 0);
    const canZoomOut = columnWidthByScale[effectiveTimeScale] > ZOOM_WIDTH_LIMITS[effectiveTimeScale].min || (timeScale === "Flexible" && SCALE_ORDER.indexOf(effectiveTimeScale) < SCALE_ORDER.length - 1);

    const handleZoomIn = useCallback(() => {
        const step = 24;
        const currentScale = effectiveTimeScale;
        const nextWidth = columnWidthByScale[currentScale] + step;
        if (nextWidth <= ZOOM_WIDTH_LIMITS[currentScale].max) {
            setScaleColumnWidth(currentScale, nextWidth);
            return;
        }
        if (timeScale === "Flexible") {
            const idx = SCALE_ORDER.indexOf(currentScale);
            if (idx > 0) {
                const nextScale = SCALE_ORDER[idx - 1];
                setFlexibleInternalScale(nextScale);
                setScaleColumnWidth(nextScale, ZOOM_WIDTH_LIMITS[nextScale].min + step);
            }
        }
    }, [effectiveTimeScale, columnWidthByScale, setScaleColumnWidth, timeScale]);

    const handleZoomOut = useCallback(() => {
        const step = 24;
        const currentScale = effectiveTimeScale;
        const nextWidth = columnWidthByScale[currentScale] - step;
        if (nextWidth >= ZOOM_WIDTH_LIMITS[currentScale].min) {
            setScaleColumnWidth(currentScale, nextWidth);
            return;
        }
        if (timeScale === "Flexible") {
            const idx = SCALE_ORDER.indexOf(currentScale);
            if (idx < SCALE_ORDER.length - 1) {
                const nextScale = SCALE_ORDER[idx + 1];
                setFlexibleInternalScale(nextScale);
                setScaleColumnWidth(nextScale, ZOOM_WIDTH_LIMITS[nextScale].max - step);
            }
        }
    }, [effectiveTimeScale, columnWidthByScale, setScaleColumnWidth, timeScale]);

    const getUnitCountForScale = useCallback((scale: BaseTimeScale) => {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        if (scale === "Day") {
            return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / DAY_MS) + 1);
        }
        if (scale === "Week") {
            return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (DAY_MS * 7)) + 1);
        }
        if (scale === "Month") {
            return Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1);
        }
        if (scale === "Quarter") {
            const startQ = start.getFullYear() * 4 + Math.floor(start.getMonth() / 3);
            const endQ = end.getFullYear() * 4 + Math.floor(end.getMonth() / 3);
            return Math.max(1, endQ - startQ + 1);
        }
        return Math.max(1, end.getFullYear() - start.getFullYear() + 1);
    }, [dateRange.end, dateRange.start]);

    const handleAutoFit = useCallback(() => {
        const viewport = rightScrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement | null;
        if (!viewport) return;
        const availableWidth = Math.max(240, viewport.clientWidth - BAR_LABEL_RIGHT_PAD_PX - 16);
        let chosenScale: BaseTimeScale = "Year";
        for (const s of SCALE_ORDER) {
            const unitCount = getUnitCountForScale(s);
            if (unitCount * ZOOM_WIDTH_LIMITS[s].min <= availableWidth) {
                chosenScale = s;
                break;
            }
        }
        const units = getUnitCountForScale(chosenScale);
        const idealWidth = availableWidth / Math.max(1, units);
        setScaleColumnWidth(chosenScale, idealWidth);
        if (timeScale === "Flexible") setFlexibleInternalScale(chosenScale);
        else setTimeScale(chosenScale);
    }, [getUnitCountForScale, setScaleColumnWidth, timeScale]);

    // Local date overrides used during drag so the bar doesn't "snap back" while mutation is in-flight.
    const [localTaskDates, setLocalTaskDates] = useState<Record<string, { startDate?: Date | null; dueDate?: Date | null; committed: boolean }>>({});

    const getEffectiveTaskDates = useCallback((task: Task) => {
        const override = localTaskDates[task.id];
        const start = (override && "startDate" in override) ? override.startDate : task.startDate;
        const due = (override && "dueDate" in override) ? override.dueDate : task.dueDate;
        return { startDate: start, dueDate: due };
    }, [localTaskDates]);

    // Calculate task bar position and width
    const getTaskBarStyle = (task: Task) => {
        const { startDate, dueDate } = getEffectiveTaskDates(task);
        const hasStart = isValidDate(startDate);
        const hasEnd = isValidDate(dueDate);

        if (!hasStart && !hasEnd) return null;

        const start = hasStart ? new Date(startDate!) : new Date(dueDate!);
        const end = hasEnd ? new Date(dueDate!) : new Date(startDate!);

        const totalMs = dateRange.end.getTime() - dateRange.start.getTime();
        if (totalMs <= 0) return null;

        const startOffsetMs = start.getTime() - dateRange.start.getTime();
        const durationMs = Math.max(1000 * 60 * 60 * 24, end.getTime() - start.getTime()); // Minimum 1 day

        const leftPxRaw = (startOffsetMs / totalMs) * totalTimelineWidthPx;
        const widthPxRaw = (durationMs / totalMs) * totalTimelineWidthPx;
        const minWidthPx = Math.max(6, (DAY_MS / totalMs) * totalTimelineWidthPx); // at least ~1 day visually

        return {
            left: Math.max(0, Math.min(totalTimelineWidthPx, leftPxRaw)),
            width: Math.max(minWidthPx, Math.min(totalTimelineWidthPx - Math.max(0, leftPxRaw), widthPxRaw)),
        };
    };

    const dateFromTimelinePx = useCallback((px: number) => {
        const totalMs = dateRange.end.getTime() - dateRange.start.getTime();
        if (totalMs <= 0 || totalTimelineWidthPx <= 0) return null;
        const clamped = Math.max(0, Math.min(totalTimelineWidthPx, px));
        const ratio = clamped / totalTimelineWidthPx;
        const ts = dateRange.start.getTime() + ratio * totalMs;
        const d = new Date(ts);
        d.setHours(0, 0, 0, 0);
        return d;
    }, [dateRange.end, dateRange.start, totalTimelineWidthPx]);

    // Drag-resize state (TimelineView parity)
    const isDraggingRef = useRef(false);
    const dragRafRef = useRef<number | null>(null);
    const dragStateRef = useRef<{
        taskId: string;
        handle: "left" | "right";
        startX: number;
        originalStartDate: Date | null;
        originalDueDate: Date | null;
        baseBarLeft: number;
        baseBarWidth: number;
        currentBarLeft: number;
        currentBarWidth: number;
    } | null>(null);
    const [draggedBarStyle, setDraggedBarStyle] = useState<{ taskId: string; barLeft: number; barWidth: number } | null>(null);

    // Timeline background pan dragging
    const isTimelinePanningRef = useRef(false);
    const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);

    const handleTimelinePanStart = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        const target = e.target as HTMLElement;
        if (target.closest('button, input, [role="button"], a, select, textarea, .group\\/bar')) return;

        const viewport = rightScrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement | null;
        if (!viewport) return;

        isTimelinePanningRef.current = true;
        panStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            scrollLeft: viewport.scrollLeft,
            scrollTop: viewport.scrollTop,
        };
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
    }, []);

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isTimelinePanningRef.current || !panStartRef.current) return;
            const viewport = rightScrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement | null;
            if (!viewport) return;

            const dx = e.clientX - panStartRef.current.x;
            const dy = e.clientY - panStartRef.current.y;

            // Only activate scroll after a 4px movement threshold to prevent
            // a plain click from corrupting scrollLeft (micro mouse movement during click)
            if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;

            viewport.scrollLeft = panStartRef.current.scrollLeft - dx;
            viewport.scrollTop = panStartRef.current.scrollTop - dy;
        };

        const onMouseUp = () => {
            if (isTimelinePanningRef.current) {
                isTimelinePanningRef.current = false;
                panStartRef.current = null;
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
            }
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, []);

    const handleResizeStart = useCallback((e: React.MouseEvent, task: Task, handle: "left" | "right") => {
        e.preventDefault();
        e.stopPropagation();
        const cached = getTaskBarStyle(task);
        if (!cached) return;

        const { startDate, dueDate } = getEffectiveTaskDates(task);
        isDraggingRef.current = true;
        dragStateRef.current = {
            taskId: task.id,
            handle,
            startX: e.clientX,
            originalStartDate: isValidDate(startDate) ? new Date(startDate as any) : null,
            originalDueDate: isValidDate(dueDate) ? new Date(dueDate as any) : null,
            baseBarLeft: cached.left,
            baseBarWidth: cached.width,
            currentBarLeft: cached.left,
            currentBarWidth: cached.width,
        };
        setDraggedBarStyle({ taskId: task.id, barLeft: cached.left, barWidth: cached.width });
    }, [getEffectiveTaskDates, getTaskBarStyle]);

    useEffect(() => {
        if (!draggedBarStyle) return;

        const totalMs = dateRange.end.getTime() - dateRange.start.getTime();
        const daysSpan = Math.max(1, Math.round(totalMs / DAY_MS));
        const pxPerDay = totalTimelineWidthPx / daysSpan;
        const snapPx = (px: number) => Math.round(px / pxPerDay) * pxPerDay;

        const onMouseMove = (e: MouseEvent) => {
            const drag = dragStateRef.current;
            if (!drag) return;
            const deltaX = e.clientX - drag.startX;
            let newWidth = drag.baseBarWidth;
            let newLeft = drag.baseBarLeft;

            if (drag.handle === "right") {
                const snapped = snapPx(drag.baseBarWidth + deltaX);
                newWidth = Math.max(pxPerDay, snapped);
            } else {
                const rightEdge = drag.baseBarLeft + drag.baseBarWidth;
                const rawLeft = drag.baseBarLeft + deltaX;
                const snappedLeft = snapPx(rawLeft);
                newLeft = Math.max(0, snappedLeft);
                newWidth = Math.max(pxPerDay, rightEdge - newLeft);
            }

            drag.currentBarLeft = newLeft;
            drag.currentBarWidth = newWidth;
            if (dragRafRef.current) cancelAnimationFrame(dragRafRef.current);
            dragRafRef.current = requestAnimationFrame(() => {
                setDraggedBarStyle({ taskId: drag.taskId, barLeft: newLeft, barWidth: newWidth });
            });
        };

        const onMouseUp = async (e: MouseEvent) => {
            const snap = dragStateRef.current;
            dragStateRef.current = null;
            setDraggedBarStyle(null);
            setTimeout(() => { isDraggingRef.current = false; }, 50);
            if (!snap) return;

            const deltaX = e.clientX - snap.startX;
            const deltaDays = Math.round(deltaX / pxPerDay);
            if (deltaDays === 0) return;

            const applyDeltaDays = (d: Date, days: number) => new Date(d.getTime() + days * DAY_MS);

            let newStartDate = snap.originalStartDate ? new Date(snap.originalStartDate) : null;
            let newDueDate = snap.originalDueDate ? new Date(snap.originalDueDate) : null;

            if (snap.handle === "right") {
                if (!newDueDate && newStartDate) newDueDate = new Date(newStartDate);
                if (!newDueDate && !newStartDate) newDueDate = new Date();
                if (newDueDate) newDueDate = applyDeltaDays(newDueDate, deltaDays);
            } else {
                if (!newStartDate && newDueDate) newStartDate = new Date(newDueDate);
                if (!newStartDate && !newDueDate) newStartDate = new Date();
                if (newStartDate) newStartDate = applyDeltaDays(newStartDate, deltaDays);
            }

            const dateOverride: { startDate?: Date | null; dueDate?: Date | null; committed: boolean } = { committed: false };
            if (snap.handle === "right") {
                dateOverride.dueDate = newDueDate;
                if (!snap.originalDueDate && snap.originalStartDate) dateOverride.startDate = newStartDate;
            } else {
                dateOverride.startDate = newStartDate;
                if (!snap.originalStartDate && snap.originalDueDate) dateOverride.dueDate = newDueDate;
            }
            setLocalTaskDates(prev => ({ ...prev, [snap.taskId]: dateOverride }));

            try {
                await updateTask.mutateAsync({
                    id: snap.taskId,
                    ...(snap.handle === "right"
                        ? {
                            dueDate: newDueDate ? newDueDate.toISOString() : null,
                            ...(!snap.originalDueDate ? { startDate: newStartDate ? newStartDate.toISOString() : null } : {}),
                        }
                        : {
                            startDate: newStartDate ? newStartDate.toISOString() : null,
                            ...(!snap.originalStartDate ? { dueDate: newDueDate ? newDueDate.toISOString() : null } : {}),
                        }),
                } as any);
                setLocalTaskDates(prev => prev[snap.taskId]
                    ? { ...prev, [snap.taskId]: { ...prev[snap.taskId], committed: true } }
                    : prev
                );
                void utils.task.list.invalidate();
            } catch (err) {
                console.error(err);
                toast.error("Failed to update task dates");
                setLocalTaskDates(prev => {
                    const next = { ...prev };
                    delete next[snap.taskId];
                    return next;
                });
            }
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, [draggedBarStyle, dateRange.end, dateRange.start, totalTimelineWidthPx, updateTask, utils.task.list]);

    // Clear committed overrides once the server data catches up.
    useEffect(() => {
        if (Object.keys(localTaskDates).length === 0) return;
        setLocalTaskDates(prev => {
            const next = { ...prev };
            let changed = false;
            for (const [taskId, override] of Object.entries(prev)) {
                if (!override.committed) continue;
                const serverTask = tasks.find(t => t.id === taskId);
                if (!serverTask) { delete next[taskId]; changed = true; continue; }
                const toTime = (d: any) => isValidDate(d) ? new Date(d).getTime() : null;
                const startMatches = !("startDate" in override) || toTime(override.startDate) === toTime(serverTask.startDate);
                const dueMatches = !("dueDate" in override) || toTime(override.dueDate) === toTime(serverTask.dueDate);
                if (startMatches && dueMatches) { delete next[taskId]; changed = true; }
            }
            return changed ? next : prev;
        });
    }, [tasks, localTaskDates]);

    const getPriorityColor = (priority: string | null) => {
        switch (priority) {
            case "URGENT": return "bg-red-500";
            case "HIGH": return "bg-orange-500";
            case "NORMAL": return "bg-blue-500";
            case "LOW": return "bg-slate-400";
            default: return "bg-slate-400";
        }
    };

    const getStatusColor = (status: string | undefined) => {
        switch (status?.toLowerCase()) {
            case "done":
            case "completed":
                return "bg-green-500";
            case "in progress":
            case "in_progress":
                return "bg-blue-500";
            default:
                return "bg-slate-400";
        }
    };

    const displayedTasks = useMemo(() => {
        // Separate mode: keep flat order
        if (expandedSubtaskMode === "separate") return filteredTasks;

        // Nested mode: parent followed by its descendants
        const idSet = new Set(filteredTasks.map(t => t.id));
        const childrenByParent = new Map<string, Task[]>();
        filteredTasks.forEach((t) => {
            if (!t.parentId || !idSet.has(t.parentId)) return;
            if (!childrenByParent.has(t.parentId)) childrenByParent.set(t.parentId, []);
            childrenByParent.get(t.parentId)!.push(t);
        });

        const roots = filteredTasks.filter(t => !t.parentId || !idSet.has(t.parentId));
        const ordered: Task[] = [];
        const visit = (task: Task) => {
            ordered.push(task);

            const isExpanded = expandedSubtaskMode === "expanded"
                ? !expandedParents.has(task.id)
                : expandedParents.has(task.id);

            if (!isExpanded) return;

            const children = childrenByParent.get(task.id) ?? [];
            children.forEach(visit);
        };
        roots.forEach(visit);
        return ordered;
    }, [filteredTasks, expandedSubtaskMode, expandedParents]);

    // ── Group rows ──────────────────────────────────────────────────────────
    // Build a flat array of either a group-header row or a task row so both
    // panels can render them identically. The grouping level adapts to context:
    //   Space / Team  → group by Project (then List within collapsed group)
    //   Project       → group by Folder → List (or just List if no folder)
    //   Folder        → group by List
    //   List          → no grouping (flat)
    type GanttGroupRow = {
        type: 'group';
        id: string;
        label: string;
        sublabel?: string;       // e.g. "List" name shown under a folder header
        icon: 'list' | 'project' | 'folder' | 'team';
        taskCount: number;
        color?: string;
        depth: number;           // 0 = top-level, 1 = nested
    };
    type GanttTaskRow = { type: 'task'; task: Task; groupDepth?: number };
    type GanttRow = GanttGroupRow | GanttTaskRow;

    // Rich lookup: listId -> { name, project, folder, space, team }
    const listFullMetaById = useMemo(() => {
        const m = new Map<string, {
            name: string;
            color?: string;
            team?: { id: string; name: string };
            space?: { id: string; name: string; color?: string };
            project?: { id: string; name: string; color?: string };
            folder?: { id: string; name: string };
        }>();
        (listsData?.items ?? []).forEach((l: any) => {
            m.set(l.id, {
                name: l.name,
                color: l.color ?? undefined,
                team: l.team ? { id: l.team.id, name: l.team.name } : undefined,
                space: l.space ? { id: l.space.id, name: l.space.name, color: l.space.color ?? undefined } : undefined,
                project: l.project ? { id: l.project.id, name: l.project.name, color: l.project.color ?? undefined } : undefined,
                folder: l.folder ? { id: l.folder.id, name: l.folder.name } : undefined,
            });
        });
        return m;
    }, [listsData]);

    // Back-compat simple map still used in header column
    const listMetaById = useMemo(() => {
        const m = new Map<string, { name: string; icon: 'list' | 'project' | 'folder'; color?: string }>();
        listFullMetaById.forEach((meta, id) => {
            const icon: 'list' | 'project' | 'folder' = meta.project ? 'project' : meta.folder ? 'folder' : 'list';
            const label = meta.project
                ? `${meta.project.name} / ${meta.name}`
                : meta.folder
                    ? `${meta.folder.name} / ${meta.name}`
                    : meta.name;
            m.set(id, { name: label, icon, color: meta.color });
        });
        return m;
    }, [listFullMetaById]);

    const ganttRows = useMemo((): GanttRow[] => {
        // • Single-list view: no grouping •
        if (listId) {
            return displayedTasks.map(task => ({ type: 'task' as const, task, groupDepth: 0 }));
        }

        interface GroupNode {
            key: string;
            label: string;
            icon: GanttGroupRow['icon'];
            color?: string;
            tasks: Task[];
            children: Map<string, GroupNode>;
        }

        const rootNodes = new Map<string, GroupNode>();

        displayedTasks.forEach(task => {
            const taskListId = (task as any).listId ?? (task as any).list?.id as string | undefined;
            const listMeta = taskListId ? listFullMetaById.get(taskListId) : undefined;

            const path: { key: string; label: string; icon: GanttGroupRow['icon']; color?: string }[] = [];

            if (listMeta) {
                // Determine which levels to include based on context
                if (!spaceId && !projectId && !folderId && listMeta.space) {
                    path.push({ key: `space::${listMeta.space.id}`, label: listMeta.space.name, icon: 'folder', color: listMeta.space.color });
                }
                if (!projectId && !folderId && listMeta.project) {
                    path.push({ key: `project::${listMeta.project.id}`, label: listMeta.project.name, icon: 'project', color: listMeta.project.color });
                }
                if (!folderId && listMeta.folder) {
                    path.push({ key: `folder::${listMeta.folder.id}`, label: listMeta.folder.name, icon: 'folder' });
                }
                path.push({ key: `list::${taskListId}`, label: listMeta.name, icon: 'list', color: listMeta.color });
            } else {
                path.push({ key: `list::__no_list`, label: 'No List', icon: 'list' });
            }

            let currentLevel = rootNodes;
            for (let i = 0; i < path.length; i++) {
                const node = path[i];
                if (!currentLevel.has(node.key)) {
                    currentLevel.set(node.key, {
                        key: node.key,
                        label: node.label,
                        icon: node.icon,
                        color: node.color,
                        tasks: [],
                        children: new Map()
                    });
                }
                const currNode = currentLevel.get(node.key)!;
                if (i === path.length - 1) {
                    currNode.tasks.push(task);
                }
                currentLevel = currNode.children;
            }
        });

        const rows: GanttRow[] = [];
        const flattenTree = (nodes: Map<string, GroupNode>, depth: number) => {
            for (const [key, node] of nodes.entries()) {
                const collapsed = collapsedGroups.has(key);

                const countTasks = (n: GroupNode): number => {
                    let count = n.tasks.length;
                    for (const child of n.children.values()) count += countTasks(child);
                    return count;
                };
                const totalTasks = countTasks(node);

                rows.push({
                    type: 'group',
                    id: key,
                    label: node.label,
                    icon: node.icon,
                    color: node.color,
                    taskCount: totalTasks,
                    depth
                });

                if (!collapsed) {
                    node.tasks.forEach(task => rows.push({ type: 'task', task, groupDepth: depth + 1 }));
                    flattenTree(node.children, depth + 1);
                }
            }
        };

        flattenTree(rootNodes, 0);
        return rows;
    }, [displayedTasks, listId, listFullMetaById, collapsedGroups, spaceId, projectId, folderId, teamId]);

    const hasAnyTaskWithDates = useMemo(() => {
        return filteredTasks.some(t => {
            const override = localTaskDates[t.id];
            const start = override && "startDate" in override ? override.startDate : t.startDate;
            const due = override && "dueDate" in override ? override.dueDate : t.dueDate;
            return isValidDate(start) || isValidDate(due);
        });
    }, [filteredTasks, localTaskDates]);

    const nestedDepthByTaskId = useMemo(() => {
        const depthMap = new Map<string, number>();
        if (expandedSubtaskMode === "separate") return depthMap;

        const byId = new Map(displayedTasks.map(t => [t.id, t] as const));
        displayedTasks.forEach((task) => {
            let depth = 0;
            let currentParent = task.parentId;
            let guard = 0;
            while (currentParent && byId.has(currentParent) && guard < 20) {
                depth += 1;
                currentParent = byId.get(currentParent)?.parentId ?? null;
                guard += 1;
            }
            depthMap.set(task.id, depth);
        });
        return depthMap;
    }, [displayedTasks, expandedSubtaskMode]);

    const childCountByTaskId = useMemo(() => {
        const m = new Map<string, number>();
        filteredTasks.forEach((t) => {
            if (!t.parentId) return;
            m.set(t.parentId, (m.get(t.parentId) ?? 0) + 1);
        });
        return m;
    }, [filteredTasks]);

    useEffect(() => {
        const leftViewport = leftScrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement | null;
        const rightViewport = rightScrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement | null;
        if (!leftViewport || !rightViewport) return;

        const syncTop = (source: HTMLElement, target: HTMLElement) => {
            if (isSyncingScrollRef.current) return;
            isSyncingScrollRef.current = true;
            target.scrollTop = source.scrollTop;
            requestAnimationFrame(() => {
                isSyncingScrollRef.current = false;
            });
        };

        const onRightScroll = () => syncTop(rightViewport, leftViewport);
        const onLeftWheel = (e: WheelEvent) => {
            // Disable independent left-panel scrolling; route wheel to timeline viewport.
            e.preventDefault();
            rightViewport.scrollTop += e.deltaY;
        };

        rightViewport.addEventListener("scroll", onRightScroll, { passive: true });
        leftViewport.addEventListener("wheel", onLeftWheel, { passive: false });

        return () => {
            rightViewport.removeEventListener("scroll", onRightScroll);
            leftViewport.removeEventListener("wheel", onLeftWheel);
        };
    }, [leftPanelOpen, ganttRows.length]);

    useEffect(() => {
        const MIN = 240;
        const MAX = 820;
        const onPointerMove = (e: PointerEvent) => {
            if (!isResizingLeftPanelRef.current) return;
            const containerLeft = ganttContainerRef.current?.getBoundingClientRect().left ?? 0;
            const nextWidth = Math.max(MIN, Math.min(MAX, e.clientX - containerLeft));
            setLeftPanelWidth(nextWidth);
        };
        const stopResize = () => {
            isResizingLeftPanelRef.current = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            document.body.style.pointerEvents = "";
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", stopResize);
        window.addEventListener("pointercancel", stopResize);
        return () => {
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", stopResize);
            window.removeEventListener("pointercancel", stopResize);
        };
    }, []);


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
            <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
                    <p className="text-sm text-muted-foreground">Loading timeline...</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={ganttContainerRef} className="h-full flex flex-col bg-white shadow-sm overflow-hidden text-sm">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-white gap-4 overflow-x-auto">
                {/* Left Side */}
                <div className="flex items-center gap-2.5 shrink-0">
                    <Button
                        variant="outline"
                        size="icon"
                        className={cn(
                            "h-8 w-8 rounded-lg cursor-pointer bg-white border-zinc-200 hover:bg-zinc-100 shadow-none",
                            leftPanelOpen ? "text-zinc-900" : "text-zinc-700"
                        )}
                        onClick={() => setLeftPanelOpen(v => !v)}
                    >
                        <PanelLeft className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-medium text-zinc-700 bg-white border-zinc-200 hover:bg-zinc-100 px-3 rounded-lg shadow-none"
                        onClick={() => {
                            const now = Date.now();
                            const startTs = dateRange.start.getTime();
                            const endTs = dateRange.end.getTime();
                            const changed = now < startTs || now > endTs;

                            if (changed) {
                                const spanMs = Math.max(DAY_MS, endTs - startTs);
                                const nextStart = new Date(now - spanMs / 2);
                                const nextEnd = new Date(now + spanMs / 2);
                                nextStart.setHours(0, 0, 0, 0);
                                nextEnd.setHours(23, 59, 59, 999);
                                setDateRange({ start: nextStart, end: nextEnd });
                            }
                            if (changed) {
                                requestAnimationFrame(() => {
                                    requestAnimationFrame(() => scrollTimelineToNow("smooth"));
                                });
                            } else {
                                scrollTimelineToNow("smooth");
                            }
                        }}
                    >
                        Today
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 text-xs font-medium text-zinc-700 bg-white border-zinc-200 hover:bg-zinc-100 gap-1.5 px-3 rounded-lg shadow-none">
                                {timeScale}
                                <ChevronDown className="h-4 w-4 opacity-40 ml-0.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-44 p-1 rounded-xl shadow-xl">
                            <div className="px-2 py-1.5 mb-1">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Time period</span>
                            </div>
                            {['Day', 'Week', 'Month', 'Quarter', 'Year', 'Flexible'].map((scale) => (
                                <DropdownMenuItem
                                    key={scale}
                                    onClick={() => {
                                        const next = scale as TimeScale;
                                        setTimeScale(next);
                                        if (next !== "Flexible") setFlexibleInternalScale(next);
                                    }}
                                    className="flex items-center justify-between rounded-lg h-9 px-2 hover:bg-zinc-50 cursor-pointer"
                                >
                                    <span className="text-sm font-normal text-zinc-700">{scale}</span>
                                    {timeScale === scale && <Check className="h-4 w-4 text-zinc-900" />}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-medium text-zinc-700 bg-white border-zinc-200 hover:bg-zinc-100 px-3 rounded-lg shadow-none"
                        onClick={handleAutoFit}
                    >
                        Auto fit
                    </Button>

                    <Button variant="outline" size="sm" className="h-8 text-xs font-medium text-zinc-700 bg-white border-zinc-200 hover:bg-zinc-100 gap-1.5 px-3 rounded-lg shadow-none">
                        <Download className="h-3.5 w-3.5" />
                        Export
                    </Button>
                </div>

                {/* Right Side */}
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

                    <Popover>
                        <TooltipProvider delayDuration={300}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="inline-flex">
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={cn(
                                                    "h-8 gap-1.5 px-2.5 text-xs font-medium bg-white hover:bg-zinc-100 transition-colors cursor-pointer rounded-lg shadow-none",
                                                    expandedSubtaskMode === 'separate' ? "text-blue-700 border-blue-200" : "text-zinc-700 border-zinc-200"
                                                )}
                                            >
                                                <Spline className="h-3.5 w-3.5" />
                                                <span className="hidden sm:inline">
                                                    {expandedSubtaskMode === 'separate' ? 'Separate' : 'Nested'}
                                                </span>
                                            </Button>
                                        </PopoverTrigger>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-zinc-900 text-white font-medium text-[11px] px-2.5 py-1.5 border-0 rounded-md" side="bottom" sideOffset={8}>
                                    Subtasks: {expandedSubtaskMode === 'separate' ? 'Separate' : 'Nested'}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <PopoverContent align="start" className="w-[220px] p-2 rounded-xl shadow-xl border-zinc-200/60" sideOffset={8}>
                            <div className="space-y-1">
                                <div
                                    className={cn(
                                        "flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors",
                                        expandedSubtaskMode !== 'separate' ? "bg-blue-50 text-zinc-900 font-bold" : "text-zinc-600 hover:bg-zinc-100"
                                    )}
                                    onClick={() => setExpandedSubtaskMode('expanded')}
                                >
                                    <span>Nested</span>
                                    {expandedSubtaskMode !== 'separate' && <Check className="h-4 w-4 text-blue-900" />}
                                </div>
                                <div
                                    className={cn(
                                        "flex flex-col px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors",
                                        expandedSubtaskMode === 'separate' ? "bg-blue-50 text-zinc-900 font-bold" : "text-zinc-600 hover:bg-zinc-100"
                                    )}
                                    onClick={() => setExpandedSubtaskMode('separate')}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>Separate</span>
                                        {expandedSubtaskMode === 'separate' && <Check className="h-4 w-4 text-blue-900" />}
                                    </div>
                                    <p className="text-[11px] text-zinc-500 font-normal mt-0.5">Use this to filter subtasks</p>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Popover open={sortPanelOpen} onOpenChange={(open) => {
                        setSortPanelOpen(open);
                        if (open === true) {
                            setFiltersPanelOpen(false);
                            setFieldsPanelOpen(false);
                            setAssigneesPanelOpen(false);
                        }
                    }}>
                        <TooltipProvider delayDuration={300}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="inline-flex">
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={cn(
                                                    "h-8 gap-1.5 px-2.5 text-xs font-medium bg-white hover:bg-zinc-100 transition-colors cursor-pointer rounded-lg shadow-none",
                                                    sort.length > 0 ? "text-violet-700 border-violet-200" : "text-zinc-700 border-zinc-200"
                                                )}
                                            >
                                                <ArrowUpDown className="h-3.5 w-3.5" />
                                                <span>Sort</span>
                                                {sort.length > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] bg-violet-100 text-violet-700 border-none">{sort.length}</Badge>}
                                            </Button>
                                        </PopoverTrigger>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-zinc-900 text-white font-medium text-[11px] px-2.5 py-1.5 border-0 rounded-md" side="bottom" sideOffset={8}>
                                    Sorting by {sort.length === 0 ? "None" : `${sort.length} field${sort.length !== 1 ? 's' : ''}`}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <PopoverContent align="end" className="w-[240px] p-1.5 rounded-xl shadow-xl border-zinc-200/60" sideOffset={8}>
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
                            <ScrollArea className="h-[280px] py-3">
                                <div className="space-y-0.5 px-1">
                                    {[
                                        { id: "assignee", label: "Assignees" },
                                        { id: "createdAt", label: "Date created" },
                                        { id: "updatedAt", label: "Date updated" },
                                        { id: "dateDone", label: "Date done" },
                                        { id: "dateClosed", label: "Date closed" },
                                        { id: "dueDate", label: "Due date" },
                                        { id: "id", label: "Task ID" },
                                        { id: "name", label: "Task Name" },
                                        { id: "priority", label: "Priority" },
                                        { id: "startDate", label: "Start date" },
                                        { id: "status", label: "Status" },
                                    ]
                                        .filter(opt => opt.label.toLowerCase().includes(sortSearchQuery.toLowerCase()))
                                        .map((opt) => {
                                            const currentSortIndex = sort.findIndex(s => s.id === opt.id);
                                            const isSelected = currentSortIndex >= 0;
                                            const currentSort = isSelected ? sort[currentSortIndex] : null;

                                            return (
                                                <div
                                                    key={opt.id}
                                                    className="flex items-center justify-between px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors group/item text-zinc-700 bg-white hover:bg-zinc-100"
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setSort([]);
                                                        } else {
                                                            setSort([{ id: opt.id, desc: false }]);
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {isSelected && currentSort && (
                                                            <div
                                                                className="flex flex-col items-center justify-center h-[18px] w-[18px] bg-zinc-100 rounded hover:bg-zinc-200 transition-colors"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSort([{ id: opt.id, desc: !currentSort.desc }]);
                                                                }}
                                                            >
                                                                <div className="flex flex-col items-center -space-y-1">
                                                                    <ChevronUp
                                                                        className={`h-[14px] w-[14px] ${currentSort.desc
                                                                            ? 'text-violet-300'
                                                                            : 'text-violet-500'
                                                                            }`}
                                                                    />
                                                                    <ChevronDown
                                                                        className={`h-[14px] w-[14px] ${currentSort.desc
                                                                            ? 'text-violet-500'
                                                                            : 'text-violet-300'
                                                                            }`}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                        <span>{opt.label}</span>
                                                    </div>
                                                    {isSelected && <Check className="h-4 w-4 text-violet-600" />}
                                                </div>
                                            );
                                        })}
                                </div>
                            </ScrollArea>
                        </PopoverContent>
                    </Popover>

                    <Popover open={filtersPanelOpen} onOpenChange={(open) => {
                        setFiltersPanelOpen(open);
                        if (open === false) setSavedFiltersPanelOpen(false);
                        if (open === true) {
                            setSortPanelOpen(false);
                            setFieldsPanelOpen(false);
                            setAssigneesPanelOpen(false);
                        }
                    }}>
                        <TooltipProvider delayDuration={300}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="inline-flex">
                                        <PopoverTrigger asChild>
                                            <div className="relative group/filter inline-flex">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className={cn(
                                                        "h-8 text-xs font-medium pr-7 bg-white hover:bg-zinc-100 transition-colors cursor-pointer rounded-lg shadow-none",
                                                        filtersPanelOpen ? "text-violet-700 border-violet-200" : "text-zinc-700 border-zinc-200",
                                                        appliedFilterCount > 0 && "text-violet-700 border-violet-200"
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
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-zinc-900 text-white font-medium text-[11px] px-2.5 py-1.5 border-0 rounded-md" side="bottom" sideOffset={8}>
                                    Quickly filter your tasks
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
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
                                className={cn(
                                    "h-8 gap-1.5 px-2.5 text-xs font-medium bg-white hover:bg-zinc-100 transition-colors cursor-pointer rounded-lg shadow-none",
                                    assigneesPanelOpen ? "text-violet-700 border-violet-200" : "text-zinc-700 border-zinc-200"
                                )}
                                onClick={() => { setAssigneesPanelOpen(!assigneesPanelOpen); setFieldsPanelOpen(false); setFiltersPanelOpen(false); }}
                            >
                                <Users className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Assignee</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Filter by assignee</TooltipContent>
                    </Tooltip>

                    {isSearchVisible ? (
                        <div className="relative flex-1 max-w-[200px] animate-in slide-in-from-right-2 duration-200">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                            <Input
                                autoFocus
                                placeholder="Search tasks..."
                                className="h-8 pl-8 text-xs bg-zinc-50/50 border-zinc-200 focus:bg-white transition-all rounded-lg"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onBlur={() => !searchQuery && setIsSearchVisible(false)}
                                onKeyDown={(e) => e.key === 'Escape' && setIsSearchVisible(false)}
                            />
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-zinc-700 bg-white border-zinc-200 hover:bg-zinc-100 rounded-lg flex-shrink-0 cursor-pointer shadow-none"
                            onClick={() => setIsSearchVisible(true)}
                        >
                            <Search className="h-4 w-4" />
                        </Button>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 px-2.5 text-xs font-medium text-zinc-700 bg-white border-zinc-200 hover:bg-zinc-100 rounded-lg flex-shrink-0"
                        onClick={() => setCustomizePanelOpen(true)}
                    >
                        <Settings className="h-3.5 w-3.5" />
                        Customize
                    </Button>

                    <div className="flex items-center gap-0 ml-1 flex-shrink-0">
                        <Button
                            className="h-8 bg-zinc-900 border-zinc-900 text-white hover:bg-zinc-800 text-xs font-medium gap-1.5 px-3 rounded-lg shadow-sm"
                            onClick={() => setAddTaskModalOpen(true)}
                        >
                            <span>Add Task</span>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                    </div>
                </div>
            </div>

            {hasAnyTaskWithDates === false ? (
                <div className="flex-1 flex items-center justify-center p-8 bg-zinc-50/30">
                    <div className="text-center">
                        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">No tasks with dates</h3>
                        <p className="text-sm text-slate-500 max-w-sm">
                            Add start and due dates to your tasks to see them on the timeline
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex overflow-hidden relative">
                    {/* Task Names Column */}
                    {leftPanelOpen && (
                        <div
                            className="bg-zinc-50/50 flex flex-col relative border-r border-zinc-200 group/left-sidebar absolute left-0 top-0 bottom-0 z-20"
                            style={{ width: leftPanelWidth }}
                        >
                            <div className="flex-1 overflow-hidden flex flex-col">
                                <ScrollArea ref={leftScrollAreaRef} orientation="both" className="flex-1 min-h-0 [&_[data-radix-scroll-area-scrollbar][data-orientation='vertical']]:hidden">
                                    <div className="w-max min-w-full flex flex-col min-h-full">
                                        {/* Sticky header row — inside ScrollArea so it shares the same scroll context */}
                                        <div className="h-16 shrink-0 bg-white flex relative text-[13px] font-normal text-zinc-500 sticky top-0 z-30 group/header">
                                            <div className="absolute top-0 left-0 right-0 h-8 border-b border-zinc-200/70 pointer-events-none z-40" />
                                            <div className="h-full px-4 relative flex flex-col shrink-0 sticky left-0 z-30 bg-white cursor-pointer group/name-col" style={{ width: Math.max(colWidths.name ?? 300, 200), minWidth: Math.max(colWidths.name ?? 300, 200) }}>
                                                <div className="h-8 flex items-center group-hover/name-col:bg-zinc-50 transition-colors">Name</div>
                                                <div className="h-8" />
                                                <div className="absolute right-0 top-0 h-8 w-1 cursor-col-resize hover:bg-zinc-300 z-10" onMouseDown={(e) => startResize(e, "name")} onClick={(e) => e.stopPropagation()} />
                                            </div>
                                            {columnOrder.filter(c => visibleColumns.has(c) && c !== "name").map(colId => {
                                                const field = GANTT_FIELD_CONFIG.find(f => f.id === colId) || FIELD_CONFIG.find(f => f.id === colId);
                                                return (
                                                    <div key={colId} className="h-full px-4 relative flex flex-col shrink-0 cursor-pointer group/col" style={{ width: Math.max(colWidths[colId] ?? 184, 100), minWidth: Math.max(colWidths[colId] ?? 184, 100) }}>
                                                        <div className="h-8 flex items-center group-hover/col:bg-zinc-50 transition-colors">
                                                            <span>{field?.label || colId}</span>
                                                        </div>
                                                        <div className="h-8" />
                                                        <div className="absolute right-0 top-0 h-8 w-1 cursor-col-resize hover:bg-zinc-300 z-10" onMouseDown={(e) => startResize(e, colId)} onClick={(e) => e.stopPropagation()} />
                                                    </div>
                                                );
                                            })}
                                            <div className="h-full w-[52px] sticky right-0 bg-white z-20 flex flex-col shrink-0 cursor-pointer group/add-col" onClick={() => setFieldsPanelOpen(true)}>
                                                <div className="h-8 flex items-center justify-center group-hover/add-col:bg-zinc-50 transition-colors">
                                                    <div className="h-5 w-5 flex items-center justify-center text-zinc-300 group-hover/add-col:text-zinc-500 transition-colors rounded-full border border-dashed border-zinc-300 group-hover/add-col:border-zinc-400 flex-shrink-0">
                                                        <Plus className="h-3 w-3" />
                                                    </div>
                                                </div>
                                                <div className="h-8" />
                                            </div>
                                        </div>
                                        {/* Rows */}
                                        <div>
                                            <VirtualizedDivRows
                                                scrollRef={rightScrollAreaRef}
                                                rowCount={ganttRows.length + 1}
                                                estimateSize={48}
                                                enabled={!draggedBarStyle}
                                                renderRow={(idx) => {
                                                    if (idx === ganttRows.length) {
                                                        return (
                                                            <Popover key="__add_task">
                                                                <PopoverTrigger asChild>
                                                                    <div className="flex items-center h-12 px-4 border-b border-zinc-100 bg-white hover:bg-zinc-50 transition-colors group cursor-pointer">
                                                                        <button className="flex items-center gap-2 text-sm text-zinc-500 group-hover:text-zinc-800 transition-colors cursor-pointer w-full h-full text-left outline-none font-medium">
                                                                            <Plus className="h-3.5 w-3.5 ml-10" />
                                                                            <span>Add Task</span>
                                                                        </button>
                                                                    </div>
                                                                </PopoverTrigger>
                                                                <PopoverContent
                                                                    align="start"
                                                                    side="top"
                                                                    sideOffset={4}
                                                                    className="w-[320px] p-3 rounded-2xl shadow-lg border border-zinc-200 bg-white"
                                                                    onOpenAutoFocus={(e) => e.preventDefault()}
                                                                >
                                                                    <div className="text-[13px] font-semibold text-zinc-500 mb-2 px-1">Create task</div>
                                                                    <div className="flex items-stretch gap-2 border border-zinc-200 rounded-xl p-1 bg-white focus-within:border-[#9381FF] focus-within:ring-[3px] focus-within:ring-[#9381FF]/20 transition-all">
                                                                        <input
                                                                            placeholder="Enter name"
                                                                            className="flex-1 bg-transparent border-none outline-none px-2 text-[13px] text-zinc-800 placeholder:text-zinc-400 min-w-0"
                                                                            value={subtaskTitleDraft}
                                                                            onChange={(e) => setSubtaskTitleDraft(e.target.value)}
                                                                            onKeyDown={async (e) => {
                                                                                if (e.key !== "Enter") return;
                                                                                e.preventDefault();
                                                                                const title = subtaskTitleDraft.trim();
                                                                                if (!title) return;
                                                                                try {
                                                                                    await createTask.mutateAsync({
                                                                                        title,
                                                                                        listId: listId ?? undefined,
                                                                                        workspaceId: resolvedWorkspaceId,
                                                                                    } as any);
                                                                                    setSubtaskTitleDraft("");
                                                                                } catch (err) {
                                                                                    toast.error("Failed to create task");
                                                                                }
                                                                            }}
                                                                        />
                                                                        <button
                                                                            className="bg-[#9381FF] hover:bg-[#8370F5] text-white rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            disabled={!subtaskTitleDraft.trim() || createTask.isPending}
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation();
                                                                                const title = subtaskTitleDraft.trim();
                                                                                if (!title) return;
                                                                                try {
                                                                                    await createTask.mutateAsync({
                                                                                        title,
                                                                                        listId: listId ?? undefined,
                                                                                        workspaceId: resolvedWorkspaceId,
                                                                                    } as any);
                                                                                    setSubtaskTitleDraft("");
                                                                                } catch (err) {
                                                                                    toast.error("Failed to create task");
                                                                                }
                                                                            }}
                                                                        >
                                                                            Create
                                                                        </button>
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                        );
                                                    }
                                                    const row = ganttRows[idx];
                                                    if (row.type === 'group') {
                                                        const isCollapsed = collapsedGroups.has(row.id);
                                                        const depth = row.depth ?? 0;
                                                        const indentPx = depth * 20;
                                                        const accentColor = row.color ?? (
                                                            row.icon === 'project' ? '#8B5CF6'
                                                                : row.icon === 'folder' ? '#F59E0B'
                                                                    : '#6366F1'
                                                        );
                                                        return (
                                                            <div
                                                                key={`group-${row.id}`}
                                                                className="h-11 flex items-center border-b border-zinc-100 bg-white hover:bg-zinc-50 cursor-pointer select-none transition-colors group"
                                                                onClick={() => setCollapsedGroups(prev => {
                                                                    const next = new Set(prev);
                                                                    if (next.has(row.id)) next.delete(row.id); else next.add(row.id);
                                                                    return next;
                                                                })}
                                                            >
                                                                <div
                                                                    className="flex items-center gap-2 h-full shrink-0 sticky left-0 z-10 bg-white group-hover:bg-zinc-50"
                                                                    style={{
                                                                        width: Math.max(colWidths.name ?? 300, 200),
                                                                        minWidth: Math.max(colWidths.name ?? 300, 200),
                                                                        paddingLeft: 12 + indentPx,
                                                                        paddingRight: 12
                                                                    }}
                                                                >
                                                                    <button className="flex items-center justify-center h-5 w-5 text-zinc-400 hover:text-zinc-700 transition-colors shrink-0 rounded hover:bg-zinc-200/80 cursor-pointer">
                                                                        <Play className={cn("h-2 w-2 shrink-0 fill-current transition-transform duration-150", isCollapsed ? "rotate-0" : "rotate-90")} />
                                                                    </button>
                                                                    {/* Context-aware icon */}
                                                                    {row.icon === 'project' && <Target className="h-3.5 w-3.5 shrink-0" style={{ color: accentColor }} />}
                                                                    {row.icon === 'folder' && <Archive className="h-3.5 w-3.5 shrink-0" style={{ color: accentColor }} />}
                                                                    {row.icon === 'list' && <ListIcon className="h-3.5 w-3.5 shrink-0" style={{ color: accentColor }} />}
                                                                    {row.icon === 'team' && <Users className="h-3.5 w-3.5 shrink-0" style={{ color: accentColor }} />}
                                                                    <div className="flex flex-col min-w-0 flex-1">
                                                                        <span className={cn("truncate leading-tight", depth === 0 ? "text-[14px] font-semibold text-zinc-900" : "text-[13px] font-medium text-zinc-800")}>{row.label}</span>
                                                                    </div>
                                                                    <span className="text-[10px] text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded-full shrink-0 group-hover:hidden transition-all">{row.taskCount}</span>

                                                                    {/* Hover Actions */}
                                                                    <div className="ml-auto pl-2 shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                                        {/* Collapse/Expand Button */}
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="icon"
                                                                                    className="h-6 w-6 rounded-md border border-zinc-300 bg-white text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setCollapsedGroups(prev => {
                                                                                            const next = new Set(prev);
                                                                                            if (next.has(row.id)) next.delete(row.id); else next.add(row.id);
                                                                                            return next;
                                                                                        });
                                                                                    }}
                                                                                >
                                                                                    <ChevronsUp className={cn("h-3.5 w-3.5 transition-transform duration-150", isCollapsed ? "rotate-180" : "rotate-0")} />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent side="top" sideOffset={6} className="text-[11px] font-semibold bg-zinc-900 text-white rounded-[8px] px-2.5 py-1">
                                                                                {isCollapsed ? "Expand" : "Collapse"}
                                                                            </TooltipContent>
                                                                        </Tooltip>

                                                                        {/* Create Button */}
                                                                        {row.icon === 'list' ? (
                                                                            <Popover
                                                                                open={createTaskGroupPopoverId === row.id}
                                                                                onOpenChange={(open) => {
                                                                                    setCreateTaskGroupPopoverId(open ? row.id : null);
                                                                                    if (open) setCreateTaskGroupTitleDraft("");
                                                                                }}
                                                                            >
                                                                                <Tooltip>
                                                                                    <TooltipTrigger asChild>
                                                                                        <PopoverTrigger asChild>
                                                                                            <Button
                                                                                                variant="outline"
                                                                                                size="icon"
                                                                                                className="h-6 w-6 rounded-md border border-zinc-300 bg-white text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200"
                                                                                                onClick={(e) => { e.stopPropagation(); }}
                                                                                            >
                                                                                                <Plus className="h-3.5 w-3.5" />
                                                                                            </Button>
                                                                                        </PopoverTrigger>
                                                                                    </TooltipTrigger>
                                                                                    <TooltipContent side="top" sideOffset={6} className="text-[11px] font-semibold bg-zinc-900 text-white rounded-[8px] px-2.5 py-1">
                                                                                        New task
                                                                                    </TooltipContent>
                                                                                </Tooltip>
                                                                                <PopoverContent align="end" className="w-[320px] p-3 rounded-2xl shadow-lg border border-zinc-200 bg-white" onOpenAutoFocus={(e) => e.preventDefault()} onClick={(e) => e.stopPropagation()}>
                                                                                    <div className="text-[13px] font-semibold text-zinc-500 mb-3 px-1">Create task</div>
                                                                                    <div className="flex items-stretch gap-2 border border-zinc-200 rounded-xl p-1 bg-white focus-within:border-[#9381FF] focus-within:ring-[3px] focus-within:ring-[#9381FF]/20 transition-all">
                                                                                        <input
                                                                                            placeholder="Enter name"
                                                                                            className="flex-1 bg-transparent border-none outline-none px-2 text-[13px] text-zinc-800 placeholder:text-zinc-400 min-w-0"
                                                                                            value={createTaskGroupTitleDraft}
                                                                                            onChange={(e) => setCreateTaskGroupTitleDraft(e.target.value)}
                                                                                            onKeyDown={async (e) => {
                                                                                                if (e.key !== "Enter") return;
                                                                                                e.preventDefault();
                                                                                                const title = createTaskGroupTitleDraft.trim();
                                                                                                if (!title) return;
                                                                                                try {
                                                                                                    await createTask.mutateAsync({ title, listId: row.id.split('::')[1], workspaceId: resolvedWorkspaceId } as any);
                                                                                                    setCreateTaskGroupPopoverId(null);
                                                                                                } catch (err) { toast.error("Failed to create task"); }
                                                                                            }}
                                                                                        />
                                                                                        <button
                                                                                            className="bg-[#9381FF] hover:bg-[#8370F5] text-white rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                            disabled={!createTaskGroupTitleDraft.trim() || createTask.isPending}
                                                                                            onClick={async (e) => {
                                                                                                e.stopPropagation();
                                                                                                const title = createTaskGroupTitleDraft.trim();
                                                                                                if (!title) return;
                                                                                                try {
                                                                                                    await createTask.mutateAsync({ title, listId: row.id.split('::')[1], workspaceId: resolvedWorkspaceId } as any);
                                                                                                    setCreateTaskGroupPopoverId(null);
                                                                                                } catch (err) { toast.error("Failed to create task"); }
                                                                                            }}
                                                                                        >
                                                                                            Create
                                                                                        </button>
                                                                                    </div>
                                                                                </PopoverContent>
                                                                            </Popover>
                                                                        ) : (
                                                                            <Popover
                                                                                open={createGroupPopoverId === row.id}
                                                                                onOpenChange={(open) => {
                                                                                    setCreateGroupPopoverId(open ? row.id : null);
                                                                                    if (open) {
                                                                                        setCreateGroupType('menu');
                                                                                        setCreateGroupTitleDraft('');
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <Tooltip>
                                                                                    <TooltipTrigger asChild>
                                                                                        <PopoverTrigger asChild>
                                                                                            <Button
                                                                                                variant="outline"
                                                                                                size="icon"
                                                                                                className="h-6 w-6 rounded-md border border-zinc-300 bg-white text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200"
                                                                                                onClick={(e) => { e.stopPropagation(); }}
                                                                                            >
                                                                                                <Plus className="h-3.5 w-3.5" />
                                                                                            </Button>
                                                                                        </PopoverTrigger>
                                                                                    </TooltipTrigger>
                                                                                    <TooltipContent side="top" sideOffset={6} className="text-[11px] font-semibold bg-zinc-900 text-white rounded-[8px] px-2.5 py-1">
                                                                                        Create
                                                                                    </TooltipContent>
                                                                                </Tooltip>
                                                                                <PopoverContent
                                                                                    align="end"
                                                                                    className={cn("p-1.5 rounded-xl shadow-lg border border-zinc-200 bg-white transition-all", createGroupType === 'menu' ? "w-[160px]" : "w-[320px] p-3")}
                                                                                    onOpenAutoFocus={(e) => e.preventDefault()}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    {createGroupType === 'menu' ? (
                                                                                        <>
                                                                                            <button
                                                                                                className="w-full flex items-center gap-2 px-2.5 py-2 text-[13px] text-zinc-700 font-normal hover:bg-zinc-100 rounded-md transition-colors cursor-pointer"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setCreateGroupType('list');
                                                                                                }}
                                                                                            >
                                                                                                <ListIcon className="h-4 w-4" /> New List
                                                                                            </button>
                                                                                            <button
                                                                                                className="w-full flex items-center gap-2 px-2.5 py-2 text-[13px] text-zinc-700 font-normal hover:bg-zinc-100 rounded-md transition-colors cursor-pointer"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setCreateGroupType('folder');
                                                                                                }}
                                                                                            >
                                                                                                <Archive className="h-4 w-4" /> New Folder
                                                                                            </button>
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <div className="flex items-center gap-2 mb-3">
                                                                                                <button
                                                                                                    className="h-6 w-6 flex items-center justify-center text-zinc-400 hover:text-zinc-800 rounded-md hover:bg-zinc-100 transition-colors"
                                                                                                    onClick={(e) => { e.stopPropagation(); setCreateGroupType('menu'); }}
                                                                                                >
                                                                                                    <ArrowLeft className="h-3.5 w-3.5" />
                                                                                                </button>
                                                                                                <div className="text-[13px] font-semibold text-zinc-500">
                                                                                                    {createGroupType === 'list' ? 'Create list' : 'Create folder'}
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="flex items-stretch gap-2 border border-zinc-200 rounded-xl p-1 bg-white focus-within:border-[#9381FF] focus-within:ring-[3px] focus-within:ring-[#9381FF]/20 transition-all">
                                                                                                <input
                                                                                                    placeholder="Enter name"
                                                                                                    className="flex-1 bg-transparent border-none outline-none px-2 text-[13px] text-zinc-800 placeholder:text-zinc-400 min-w-0"
                                                                                                    value={createGroupTitleDraft}
                                                                                                    onChange={(e) => setCreateGroupTitleDraft(e.target.value)}
                                                                                                    onKeyDown={async (e) => {
                                                                                                        if (e.key !== "Enter") return;
                                                                                                        e.preventDefault();
                                                                                                        const title = createGroupTitleDraft.trim();
                                                                                                        if (!title) return;
                                                                                                        const [type, uuid] = row.id.split('::');
                                                                                                        try {
                                                                                                            if (createGroupType === 'list') {
                                                                                                                await createList.mutateAsync({ name: title, workspaceId: resolvedWorkspaceId as string, spaceId: type === 'space' ? uuid : undefined, projectId: type === 'project' ? uuid : undefined, folderId: type === 'folder' ? uuid : undefined });
                                                                                                            } else {
                                                                                                                await createFolder.mutateAsync({ name: title, workspaceId: resolvedWorkspaceId as string, spaceId: type === 'space' ? uuid : undefined, projectId: type === 'project' ? uuid : undefined });
                                                                                                            }
                                                                                                            setCreateGroupPopoverId(null);
                                                                                                        } catch (err) { toast.error("Failed to create"); }
                                                                                                    }}
                                                                                                    autoFocus
                                                                                                />
                                                                                                <button
                                                                                                    className="bg-[#9381FF] hover:bg-[#8370F5] text-white rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                                    disabled={!createGroupTitleDraft.trim() || createList.isPending || createFolder.isPending}
                                                                                                    onClick={async (e) => {
                                                                                                        e.stopPropagation();
                                                                                                        const title = createGroupTitleDraft.trim();
                                                                                                        if (!title) return;
                                                                                                        const [type, uuid] = row.id.split('::');
                                                                                                        try {
                                                                                                            if (createGroupType === 'list') {
                                                                                                                await createList.mutateAsync({ name: title, workspaceId: resolvedWorkspaceId as string, spaceId: type === 'space' ? uuid : undefined, projectId: type === 'project' ? uuid : undefined, folderId: type === 'folder' ? uuid : undefined });
                                                                                                            } else {
                                                                                                                await createFolder.mutateAsync({ name: title, workspaceId: resolvedWorkspaceId as string, spaceId: type === 'space' ? uuid : undefined, projectId: type === 'project' ? uuid : undefined });
                                                                                                            }
                                                                                                            setCreateGroupPopoverId(null);
                                                                                                        } catch (err) { toast.error("Failed to create"); }
                                                                                                    }}
                                                                                                >
                                                                                                    Create
                                                                                                </button>
                                                                                            </div>
                                                                                        </>
                                                                                    )}
                                                                                </PopoverContent>
                                                                            </Popover>
                                                                        )}

                                                                        {/* Rename Button */}
                                                                        <Popover
                                                                            open={renameGroupPopoverId === row.id}
                                                                            onOpenChange={(open) => {
                                                                                setRenameGroupPopoverId(open ? row.id : null);
                                                                                if (open) setRenameGroupTitleDraft(row.label);
                                                                            }}
                                                                        >
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <PopoverTrigger asChild>
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="icon"
                                                                                            className="h-6 w-6 rounded-md border border-zinc-300 bg-white text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200"
                                                                                            onClick={(e) => { e.stopPropagation(); }}
                                                                                        >
                                                                                            <Edit3 className="h-3.5 w-3.5" />
                                                                                        </Button>
                                                                                    </PopoverTrigger>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent side="top" sideOffset={6} className="text-[11px] font-semibold bg-zinc-900 text-white rounded-[8px] px-2.5 py-1">
                                                                                    Rename
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                            <PopoverContent align="end" className="w-[340px] p-5 rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-zinc-200/80 bg-white" onOpenAutoFocus={(e) => e.preventDefault()} onClick={(e) => e.stopPropagation()}>
                                                                                <div className="space-y-3">
                                                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 uppercase">
                                                                                        <Edit3 className="h-3.5 w-3.5" />
                                                                                        <span>RENAME:</span>
                                                                                    </div>
                                                                                    <div className="flex items-stretch gap-2 border border-zinc-200 rounded-xl p-1 bg-white focus-within:border-[#9381FF] focus-within:ring-[3px] focus-within:ring-[#9381FF]/20 transition-all">
                                                                                        <input
                                                                                            placeholder="Enter name"
                                                                                            className="flex-1 bg-transparent border-none outline-none px-2 text-[13px] text-zinc-800 placeholder:text-zinc-400 min-w-0"
                                                                                            value={renameGroupTitleDraft}
                                                                                            onChange={(e) => setRenameGroupTitleDraft(e.target.value)}
                                                                                            onKeyDown={async (e) => {
                                                                                                if (e.key !== "Enter") return;
                                                                                                e.preventDefault();
                                                                                                const nextTitle = renameGroupTitleDraft.trim();
                                                                                                if (!nextTitle || nextTitle === row.label) return;
                                                                                                const [type, uuid] = row.id.split('::');
                                                                                                try {
                                                                                                    if (type === 'list') await updateList.mutateAsync({ id: uuid, name: nextTitle });
                                                                                                    else if (type === 'folder') await updateFolder.mutateAsync({ id: uuid, name: nextTitle });
                                                                                                    else if (type === 'project') await updateProject.mutateAsync({ id: uuid, name: nextTitle });
                                                                                                    else if (type === 'space') await updateSpaceMutation.mutateAsync({ id: uuid, name: nextTitle });
                                                                                                    setRenameGroupPopoverId(null);
                                                                                                } catch (err) { toast.error("Failed to rename"); }
                                                                                            }}
                                                                                        />
                                                                                        <button
                                                                                            className="bg-[#9381FF] hover:bg-[#8370F5] text-white rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                            disabled={!renameGroupTitleDraft.trim() || renameGroupTitleDraft.trim() === row.label}
                                                                                            onClick={async (e) => {
                                                                                                e.stopPropagation();
                                                                                                const nextTitle = renameGroupTitleDraft.trim();
                                                                                                if (!nextTitle || nextTitle === row.label) return;
                                                                                                const [type, uuid] = row.id.split('::');
                                                                                                try {
                                                                                                    if (type === 'list') await updateList.mutateAsync({ id: uuid, name: nextTitle });
                                                                                                    else if (type === 'folder') await updateFolder.mutateAsync({ id: uuid, name: nextTitle });
                                                                                                    else if (type === 'project') await updateProject.mutateAsync({ id: uuid, name: nextTitle });
                                                                                                    else if (type === 'space') await updateSpaceMutation.mutateAsync({ id: uuid, name: nextTitle });
                                                                                                    setRenameGroupPopoverId(null);
                                                                                                } catch (err) { toast.error("Failed to rename"); }
                                                                                            }}
                                                                                        >
                                                                                            Save
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </PopoverContent>
                                                                        </Popover>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    const task = row.task;
                                                    const taskGroupDepth = row.groupDepth ?? 1;
                                                    return (
                                                        <TaskActionsPopover
                                                            key={task.id}
                                                            task={task}
                                                            context={spaceId ? "SPACE" : projectId ? "PROJECT" : "GENERAL"}
                                                            contextId={(spaceId || projectId) as any}
                                                            workspaceId={resolvedWorkspaceId as string}
                                                            users={users as any}
                                                            lists={lists}
                                                            defaultListId={listId}
                                                            availableStatuses={allAvailableStatuses}
                                                            openOnContextMenu
                                                            onDelete={async (id) => {
                                                                try { await deleteTask.mutateAsync({ id }); } catch (e) { }
                                                            }}
                                                            onUpdate={async (id, data) => {
                                                                try { await updateTask.mutateAsync({ id, ...(data as any) }); } catch (e) { }
                                                            }}
                                                            onAction={(action) => {
                                                                if (action === "rename") {
                                                                    setRenameTitleDraft(task.title || task.name || "");
                                                                    setRenamePopoverTaskId(task.id);
                                                                } else if (action === "archive") {
                                                                    try { updateTask.mutateAsync({ id: task.id, isArchived: true } as any); toast.success("Task archived"); } catch (e) { }
                                                                }
                                                            }}
                                                        >
                                                            <div className="h-12 px-0 flex items-center hover:bg-zinc-50 transition-colors bg-white group">
                                                                {/* Title + hover actions — includes checkbox/grip so it starts at left:0 like the header */}
                                                                <div
                                                                    className="flex items-center gap-2 px-2 min-w-0 relative shrink-0 sticky left-0 z-10 bg-white group-hover:bg-zinc-50"
                                                                    style={{
                                                                        width: Math.max(colWidths.name ?? 300, 200),
                                                                        minWidth: Math.max(colWidths.name ?? 300, 200),
                                                                        paddingLeft:
                                                                            expandedSubtaskMode === "separate"
                                                                                ? 8 + taskGroupDepth * 20
                                                                                : 8 + taskGroupDepth * 20 + (nestedDepthByTaskId.get(task.id) ?? 0) * 20
                                                                    }}
                                                                >
                                                                    {/* Grip + Checkbox — inside Name cell so widths align with header */}
                                                                    <div className="flex items-center gap-1 shrink-0 w-10 relative h-6">
                                                                        <div className={cn(
                                                                            "absolute inset-0 flex items-center justify-center text-[10px] text-zinc-400 font-medium transition-opacity",
                                                                            selectedTasks.includes(task.id) ? "opacity-0" : "opacity-100 group-hover:opacity-0"
                                                                        )}>
                                                                        </div>
                                                                        <div className={cn(
                                                                            "flex items-center gap-1 transition-opacity relative z-10",
                                                                            selectedTasks.includes(task.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                                                        )}>
                                                                            <GripVertical className="h-4 w-4 text-zinc-300 cursor-grab shrink-0" />
                                                                            <Checkbox
                                                                                checked={selectedTasks.includes(task.id)}
                                                                                onCheckedChange={() => setSelectedTasks(prev => prev.includes(task.id) ? prev.filter(id => id !== task.id) : [...prev, task.id])}
                                                                                className="border-zinc-300 shrink-0 h-4 w-4 cursor-pointer"
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {expandedSubtaskMode !== "separate" && (
                                                                        <>
                                                                            {(childCountByTaskId.get(task.id) ?? 0) > 0 ? (() => {
                                                                                const isExpanded = expandedSubtaskMode === "expanded" ? !expandedParents.has(task.id) : expandedParents.has(task.id);
                                                                                return (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setExpandedParents(prev => {
                                                                                                const next = new Set(prev);
                                                                                                if (next.has(task.id)) next.delete(task.id);
                                                                                                else next.add(task.id);
                                                                                                return next;
                                                                                            });
                                                                                        }}
                                                                                        className="shrink-0 flex items-center justify-center h-6 w-6 -ml-1.5 rounded transition-all duration-150 cursor-pointer opacity-100 hover:bg-zinc-200/80 text-zinc-400 hover:text-zinc-700"
                                                                                    >
                                                                                        <Play className={cn("h-2 w-2 shrink-0 fill-current transition-transform duration-150", isExpanded ? "rotate-90" : "rotate-0")} />
                                                                                    </button>
                                                                                );
                                                                            })()
                                                                                : (nestedDepthByTaskId.get(task.id) ?? 0) > 0 ? (
                                                                                    <div className="shrink-0 flex items-center justify-center h-6 w-6 -ml-1.5">
                                                                                        <Spline className="h-3.5 w-3.5 text-zinc-400 shrink-0 scale-y-[-1]" />
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="h-6 w-6 -ml-1.5 shrink-0" />
                                                                                )}
                                                                        </>
                                                                    )}
                                                                    {/* Status icon */}
                                                                    <TooltipProvider>
                                                                        <Tooltip delayDuration={300}>
                                                                            <TaskStatusPopover
                                                                                task={task}
                                                                                availableStatuses={allAvailableStatuses}
                                                                                availableTaskTypes={availableTaskTypes}
                                                                                onUpdateTask={(id, data) => updateTask.mutate({ id, ...data } as any)}
                                                                            >
                                                                                <TooltipTrigger asChild>
                                                                                    <button className="shrink-0 flex items-center justify-center h-6 w-6 rounded transition-all duration-150 cursor-pointer hover:bg-zinc-200/80 outline-none focus:outline-none">
                                                                                        {(() => {
                                                                                            const tt = (task as any).taskType || availableTaskTypes.find((t: any) => t.isDefault) || availableTaskTypes[0];
                                                                                            const isDefault = !tt || tt.name?.toLowerCase() === "task" || tt.isDefault;
                                                                                            const statusName = task.status?.name?.toLowerCase() || "";
                                                                                            const statusColor = task.status?.color || (statusName.includes("done") || statusName.includes("complete") ? "#10B981" : statusName.includes("progress") || statusName.includes("doing") ? "#3B82F6" : "#94A3B8");
                                                                                            if (isDefault) {
                                                                                                if (statusName.includes("done") || statusName.includes("complete")) return <CheckCircle2 className="h-4 w-4" style={{ color: statusColor }} />;
                                                                                                if (statusName.includes("progress") || statusName.includes("doing")) return <CircleDot className="h-4 w-4" style={{ color: statusColor }} />;
                                                                                                return <CircleDashed className="h-4 w-4" style={{ color: statusColor }} />;
                                                                                            }
                                                                                            return <TaskTypeIcon type={tt} className="h-4 w-4" size={16} color={statusColor} />;
                                                                                        })()}
                                                                                    </button>
                                                                                </TooltipTrigger>
                                                                            </TaskStatusPopover>
                                                                            <TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>
                                                                                <span style={{ color: task.status?.color || '#fff' }}>{task.status?.name?.toUpperCase() || "NO STATUS"}</span>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>

                                                                    <span
                                                                        className="text-sm text-zinc-900 truncate font-medium cursor-pointer hover:text-blue-600 transition-colors"
                                                                        onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); if (isDraggingRef.current) return; openTaskDetail(task.id); }}
                                                                    >{task.title || task.name}</span>

                                                                    <div className="ml-auto pl-2 shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <Popover
                                                                            open={subtaskPopoverTaskId === task.id}
                                                                            onOpenChange={(open) => {
                                                                                setSubtaskPopoverTaskId(open ? task.id : null);
                                                                                if (open) setSubtaskTitleDraft("");
                                                                            }}
                                                                        >
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <PopoverTrigger asChild>
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="icon"
                                                                                            className="h-6 w-6 rounded-md border border-zinc-300 bg-white text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200"
                                                                                            onClick={(e) => { e.stopPropagation(); }}
                                                                                        >
                                                                                            <Plus className="h-3.5 w-3.5" />
                                                                                        </Button>
                                                                                    </PopoverTrigger>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent side="top" sideOffset={6} className="text-[11px] font-semibold bg-zinc-900 text-white rounded-[8px] px-2.5 py-1">
                                                                                    Add subtask
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                            <PopoverContent
                                                                                align="end"
                                                                                className="w-[320px] p-3 rounded-2xl shadow-lg border border-zinc-200 bg-white"
                                                                                onOpenAutoFocus={(e) => e.preventDefault()}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                <div className="text-[13px] font-semibold text-zinc-500 mb-3 px-1">Create subtask</div>
                                                                                <div className="flex items-stretch gap-2 border border-zinc-200 rounded-xl p-1 bg-white focus-within:border-[#9381FF] focus-within:ring-[3px] focus-within:ring-[#9381FF]/20 transition-all">
                                                                                    <input
                                                                                        placeholder="Enter name"
                                                                                        className="flex-1 bg-transparent border-none outline-none px-2 text-[13px] text-zinc-800 placeholder:text-zinc-400 min-w-0"
                                                                                        value={subtaskTitleDraft}
                                                                                        onChange={(e) => setSubtaskTitleDraft(e.target.value)}
                                                                                        onKeyDown={async (e) => {
                                                                                            if (e.key !== "Enter") return;
                                                                                            e.preventDefault();
                                                                                            const title = subtaskTitleDraft.trim();
                                                                                            if (!title) return;
                                                                                            try {
                                                                                                await createTask.mutateAsync({
                                                                                                    title,
                                                                                                    parentId: task.id,
                                                                                                    listId: (task as any).listId ?? listId ?? undefined,
                                                                                                    workspaceId: resolvedWorkspaceId,
                                                                                                } as any);
                                                                                                setSubtaskPopoverTaskId(null);
                                                                                                setSubtaskTitleDraft("");
                                                                                            } catch (err) {
                                                                                                toast.error("Failed to create subtask");
                                                                                            }
                                                                                        }}
                                                                                    />
                                                                                    <button
                                                                                        className="bg-[#9381FF] hover:bg-[#8370F5] text-white rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                        disabled={!subtaskTitleDraft.trim() || createTask.isPending}
                                                                                        onClick={async (e) => {
                                                                                            e.stopPropagation();
                                                                                            const title = subtaskTitleDraft.trim();
                                                                                            if (!title) return;
                                                                                            try {
                                                                                                await createTask.mutateAsync({
                                                                                                    title,
                                                                                                    parentId: task.id,
                                                                                                    listId: (task as any).listId ?? listId ?? undefined,
                                                                                                    workspaceId: resolvedWorkspaceId,
                                                                                                } as any);
                                                                                                setSubtaskPopoverTaskId(null);
                                                                                                setSubtaskTitleDraft("");
                                                                                            } catch (err) {
                                                                                                toast.error("Failed to create subtask");
                                                                                            }
                                                                                        }}
                                                                                    >
                                                                                        Create
                                                                                    </button>
                                                                                </div>
                                                                            </PopoverContent>
                                                                        </Popover>

                                                                        <Popover
                                                                            open={renamePopoverTaskId === task.id}
                                                                            onOpenChange={(open) => {
                                                                                setRenamePopoverTaskId(open ? task.id : null);
                                                                                if (open) setRenameTitleDraft((task.title || task.name || "").toString());
                                                                            }}
                                                                        >
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <PopoverTrigger asChild>
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="icon"
                                                                                            className="h-6 w-6 rounded-md border border-zinc-300 bg-white text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200"
                                                                                            onClick={(e) => { e.stopPropagation(); }}
                                                                                        >
                                                                                            <Edit3 className="h-3.5 w-3.5" />
                                                                                        </Button>
                                                                                    </PopoverTrigger>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent side="top" sideOffset={6} className="text-[11px] font-semibold bg-zinc-900 text-white rounded-[8px] px-2.5 py-1">
                                                                                    Rename task
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                            <PopoverContent
                                                                                align="end"
                                                                                className="w-[340px] p-5 rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-zinc-200/80 bg-white"
                                                                                onOpenAutoFocus={(e) => e.preventDefault()}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                <div className="space-y-3">
                                                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 uppercase">
                                                                                        <Edit3 className="h-3.5 w-3.5" />
                                                                                        <span>RENAME TASK:</span>
                                                                                    </div>
                                                                                    <div className="flex items-stretch gap-2 border border-zinc-200 rounded-xl p-1 bg-white focus-within:border-[#9381FF] focus-within:ring-[3px] focus-within:ring-[#9381FF]/20 transition-all">
                                                                                        <input
                                                                                            placeholder="Enter name"
                                                                                            className="flex-1 bg-transparent border-none outline-none px-2 text-[13px] text-zinc-800 placeholder:text-zinc-400 min-w-0"
                                                                                            value={renameTitleDraft}
                                                                                            onChange={(e) => setRenameTitleDraft(e.target.value)}
                                                                                            onKeyDown={async (e) => {
                                                                                                if (e.key !== "Enter") return;
                                                                                                e.preventDefault();
                                                                                                const nextTitle = renameTitleDraft.trim();
                                                                                                const current = (task.title || task.name || "").toString().trim();
                                                                                                if (!nextTitle || nextTitle === current) return;
                                                                                                try {
                                                                                                    await updateTask.mutateAsync({ id: task.id, title: nextTitle } as any);
                                                                                                    setRenamePopoverTaskId(null);
                                                                                                } catch (err) {
                                                                                                    toast.error("Failed to rename task");
                                                                                                }
                                                                                            }}
                                                                                        />
                                                                                        <button
                                                                                            className="bg-[#9381FF] hover:bg-[#8370F5] text-white rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                            disabled={(() => {
                                                                                                const nextTitle = renameTitleDraft.trim();
                                                                                                const current = (task.title || task.name || "").toString().trim();
                                                                                                return !nextTitle || nextTitle === current || updateTask.isPending;
                                                                                            })()}
                                                                                            onClick={async (e) => {
                                                                                                e.stopPropagation();
                                                                                                const nextTitle = renameTitleDraft.trim();
                                                                                                const current = (task.title || task.name || "").toString().trim();
                                                                                                if (!nextTitle || nextTitle === current) return;
                                                                                                try {
                                                                                                    await updateTask.mutateAsync({ id: task.id, title: nextTitle } as any);
                                                                                                    setRenamePopoverTaskId(null);
                                                                                                } catch (err) {
                                                                                                    toast.error("Failed to rename task");
                                                                                                }
                                                                                            }}
                                                                                        >
                                                                                            Save
                                                                                        </button>
                                                                                    </div>
                                                                                    {(() => {
                                                                                        const nextTitle = renameTitleDraft.trim();
                                                                                        const current = (task.title || task.name || "").toString().trim();
                                                                                        if (!nextTitle) return <div className="text-[13px] text-red-500 px-1">Name is required</div>;
                                                                                        if (nextTitle === current) return <div className="text-[13px] text-red-500 px-1">Name must be different</div>;
                                                                                        return null;
                                                                                    })()}
                                                                                </div>
                                                                            </PopoverContent>
                                                                        </Popover>
                                                                    </div>
                                                                </div>
                                                                {columnOrder.filter(c => visibleColumns.has(c) && c !== "name").map(colId => {
                                                                    const w = colWidths[colId] ?? 184;
                                                                    if (colId === "assignee") {
                                                                        const assignees = task.assignees?.length ? task.assignees : (task.assignee ? [{ user: task.assignee }] : []);
                                                                        return (
                                                                            <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                                <AssigneeSelector users={users as any} agents={[]} workspaceId={resolvedWorkspaceId as string} variant="compact" side="right" avoidCollisions={false} collisionPadding={12} sideOffset={8} value={formatAssigneeIdsForSelector(task.assignees ?? [])} onChange={(newIds) => { updateTask.mutate({ id: task.id, assigneeIds: newIds } as any); }} trigger={<button type="button" className="w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm transition-shadow cursor-pointer hover:bg-zinc-100" onClick={(e) => { e.stopPropagation(); }} title="Edit assignees"><div className="flex items-center -space-x-1.5">{assignees.length > 0 ? assignees.slice(0, 4).map((a: any, i: number) => (<Avatar key={a.user?.id || a.aiAgent?.id || a.agent?.id || i} className="h-6 w-6 border-2 border-white ring-1 ring-zinc-100"><AvatarImage src={a.user?.image || a.aiAgent?.avatar || a.aiAgent?.image || a.agent?.avatar || undefined} /><AvatarFallback className="text-[9px] bg-indigo-50 text-indigo-600">{a.user?.name?.slice(0, 2)?.toUpperCase() || a.aiAgent?.name?.slice(0, 2)?.toUpperCase() || a.agent?.name?.slice(0, 2)?.toUpperCase() || "??"}</AvatarFallback></Avatar>)) : (<div className="h-6 w-6 rounded-full border border-dashed border-zinc-300 flex items-center justify-center"><Users className="h-3 w-3 text-zinc-400" /></div>)}</div></button>} />
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (colId === "dueDate") {
                                                                        const dueDateInfo = formatDueDate(task.dueDate ?? null);
                                                                        return (
                                                                            <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                                <Popover><PopoverTrigger asChild><button type="button" className={cn("text-xs w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm transition-shadow cursor-pointer hover:bg-zinc-100", dueDateInfo ? dueDateInfo.color : "text-zinc-400")} onClick={(e) => { e.stopPropagation(); }} title="Edit due date">{dueDateInfo ? dueDateInfo.text : "Add Date"}</button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start" sideOffset={8} collisionPadding={10}><TaskCalendar startDate={task.startDate ? new Date(task.startDate) : undefined} endDate={task.dueDate ? new Date(task.dueDate) : undefined} onStartDateChange={(date) => { updateTask.mutate({ id: task.id, startDate: date ? date.toISOString() : null } as any); }} onEndDateChange={(date) => { updateTask.mutate({ id: task.id, dueDate: date ? date.toISOString() : null } as any); }} /></PopoverContent></Popover>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (colId === "startDate") {
                                                                        const startDateInfo = formatDueDate(task.startDate ?? null);
                                                                        return (
                                                                            <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                                <Popover><PopoverTrigger asChild><button type="button" className={cn("text-xs w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm transition-shadow cursor-pointer hover:bg-zinc-100", task.startDate ? "text-zinc-700 font-medium" : "text-zinc-400")} onClick={(e) => { e.stopPropagation(); }} title="Edit start date">{task.startDate ? format(new Date(task.startDate), "M/d/yy") : "Add Date"}</button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start" sideOffset={8} collisionPadding={10}><TaskCalendar startDate={task.startDate ? new Date(task.startDate) : undefined} endDate={task.dueDate ? new Date(task.dueDate) : undefined} onStartDateChange={(date) => { updateTask.mutate({ id: task.id, startDate: date ? date.toISOString() : null } as any); }} onEndDateChange={(date) => { updateTask.mutate({ id: task.id, dueDate: date ? date.toISOString() : null } as any); }} /></PopoverContent></Popover>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (colId === "priority") {
                                                                        return (
                                                                            <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                                <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm transition-shadow cursor-pointer hover:bg-zinc-100 text-xs font-medium text-zinc-700" onClick={(e) => { e.stopPropagation(); }} title="Edit priority"><div className="flex items-center gap-1.5 w-full truncate"><div className={cn("flex items-center gap-1.5 shrink-0", task.priority === 'URGENT' ? "text-red-500" : task.priority === 'HIGH' ? "text-orange-500" : task.priority === 'NORMAL' ? "text-blue-500" : "text-zinc-400")}><Flag className="h-3 w-3 fill-current" /></div><span className="truncate">{task.priority ? task.priority.charAt(0) + task.priority.slice(1).toLowerCase() : "Priority"}</span></div></button></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-48 z-[200]"><DropdownMenuLabel className="text-xs">Priority</DropdownMenuLabel><DropdownMenuItem onClick={() => updateTask.mutate({ id: task.id, priority: "URGENT" } as any)}><Flag className="h-3 w-3 mr-2 text-red-600 fill-current" /> Urgent</DropdownMenuItem><DropdownMenuItem onClick={() => updateTask.mutate({ id: task.id, priority: "HIGH" } as any)}><Flag className="h-3 w-3 mr-2 text-orange-600 fill-current" /> High</DropdownMenuItem><DropdownMenuItem onClick={() => updateTask.mutate({ id: task.id, priority: "NORMAL" } as any)}><Flag className="h-3 w-3 mr-2 text-blue-600 fill-current" /> Normal</DropdownMenuItem><DropdownMenuItem onClick={() => updateTask.mutate({ id: task.id, priority: "LOW" } as any)}><Flag className="h-3 w-3 mr-2 text-slate-600 fill-current" /> Low</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => updateTask.mutate({ id: task.id, priority: null } as any)}><CircleSlash className="h-3 w-3 mr-2 text-slate-500" />Clear</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (colId === "status") {
                                                                        const taskStatuses = (((task as any).list?.statuses ?? []) as any[]).length > 0
                                                                            ? (((task as any).list?.statuses ?? []) as any[])
                                                                            : allAvailableStatuses.filter(s => { const taskListId = (task as any).listId ?? (task as any).list?.id; return !taskListId || s.listId === taskListId; });
                                                                        return (
                                                                            <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                                <TaskStatusPopover task={task} availableStatuses={taskStatuses} availableTaskTypes={availableTaskTypes} onUpdateTask={(id, data) => updateTask.mutate({ id, ...data } as any)} hideTaskTypeTab={true}>
                                                                                    <button type="button" className="w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm transition-shadow cursor-pointer hover:bg-zinc-100 text-xs font-medium" onClick={(e) => { e.stopPropagation(); }} title="Edit status">
                                                                                        <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded border truncate", task.status?.name?.toLowerCase() === "done" || task.status?.name?.toLowerCase() === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : (task.status?.name?.toLowerCase() === "in progress" || task.status?.name?.toLowerCase() === "in_progress" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-700 border-slate-200"))}>
                                                                                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: task.status?.color || "#94A3B8" }} />
                                                                                            <span className="truncate">{task.status?.name || "No Status"}</span>
                                                                                        </div>
                                                                                    </button>
                                                                                </TaskStatusPopover>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (colId === "dateCreated") {
                                                                        return (
                                                                            <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                                <div className="w-full h-full min-h-[38px] flex items-center justify-between px-2 py-1 outline-none rounded-sm transition-shadow group/readonly text-xs text-zinc-500 cursor-default" onClick={(e) => { e.stopPropagation(); }}>
                                                                                    <div className="truncate">{task.createdAt ? format(new Date(task.createdAt), "M/d/yy") : "—"}</div>
                                                                                    <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><div className="opacity-0 group-hover/readonly:opacity-100 transition-opacity flex items-center justify-center h-6 w-6 rounded-md bg-zinc-100 hover:bg-zinc-200 cursor-default shrink-0" onClick={(e) => e.stopPropagation()}><PenOff className="h-3.5 w-3.5 text-zinc-500" /></div></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>Read-only</TooltipContent></Tooltip></TooltipProvider>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (colId === "dateUpdated") {
                                                                        return (
                                                                            <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                                <div className="w-full h-full min-h-[38px] flex items-center justify-between px-2 py-1 outline-none rounded-sm transition-shadow group/readonly text-xs text-zinc-500 cursor-default" onClick={(e) => { e.stopPropagation(); }}>
                                                                                    <div className="truncate">{task.updatedAt ? format(new Date(task.updatedAt), "M/d/yy h:mma") : "—"}</div>
                                                                                    <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><div className="opacity-0 group-hover/readonly:opacity-100 transition-opacity flex items-center justify-center h-6 w-6 rounded-md bg-zinc-100 hover:bg-zinc-200 cursor-default shrink-0" onClick={(e) => e.stopPropagation()}><PenOff className="h-3.5 w-3.5 text-zinc-500" /></div></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>Read-only</TooltipContent></Tooltip></TooltipProvider>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (colId === "timeEstimate") {
                                                                        return (
                                                                            <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                                <div className="w-full h-full min-h-[38px] flex items-center px-2 py-1 outline-none rounded-sm transition-shadow text-xs text-zinc-500 cursor-default">
                                                                                    <div className="truncate">{task.timeEstimate ?? "—"}</div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (colId === "timeTracked") {
                                                                        const totalTracked = typeof task.timeTracked === 'number' ? task.timeTracked : 0;
                                                                        let timeLabel = "Add time";
                                                                        if (totalTracked > 0) {
                                                                            const hours = Math.floor(totalTracked / 3600);
                                                                            const mins = Math.floor((totalTracked % 3600) / 60);
                                                                            if (hours > 0 && mins > 0) timeLabel = `${hours}h ${mins}m`;
                                                                            else if (hours > 0) timeLabel = `${hours}h`;
                                                                            else timeLabel = `${mins}m`;
                                                                        }
                                                                        return (
                                                                            <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                                <TaskTimeTrackedPopover taskId={task.id} workspaceId={(task as any).workspaceId ?? resolvedWorkspaceId as string} totalTrackedSeconds={totalTracked} trigger={<button type="button" className="w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm transition-shadow cursor-pointer hover:bg-zinc-100 gap-1" onClick={(e) => e.stopPropagation()}><div className={cn('flex items-center gap-1.5 text-xs rounded-md px-1.5 py-1 transition-colors border', totalTracked > 0 ? 'text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border-zinc-200' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 border-transparent')}><Play className="h-3 w-3 shrink-0" /><span className="font-medium">{timeLabel}</span></div></button>} />
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (colId === "createdBy") {
                                                                        const creator = (task as any).createdBy ? workspaceMembers.find((m: any) => (m.user?.id ?? m.id) === (task as any).createdBy) : null;
                                                                        return (
                                                                            <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                                <div className="w-full h-full min-h-[38px] flex items-center justify-between px-2 py-1 outline-none rounded-sm transition-shadow group/readonly cursor-default" onClick={(e) => { e.stopPropagation(); }}>
                                                                                    <div className="truncate">
                                                                                        {creator ? (
                                                                                            <Avatar className="h-6 w-6"><AvatarImage src={creator.user?.image ?? undefined} /><AvatarFallback className="text-[10px] bg-zinc-900 text-white font-medium">{(creator.user?.name ?? "U").substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                                                                                        ) : <span className="text-xs text-zinc-500">—</span>}
                                                                                    </div>
                                                                                    <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><div className="opacity-0 group-hover/readonly:opacity-100 transition-opacity flex items-center justify-center h-6 w-6 rounded-md bg-zinc-100 hover:bg-zinc-200 cursor-default shrink-0" onClick={(e) => e.stopPropagation()}><PenOff className="h-3.5 w-3.5 text-zinc-500" /></div></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>Read-only</TooltipContent></Tooltip></TooltipProvider>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (colId === "dateClosed") {
                                                                        return (
                                                                            <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                                <div className="w-full h-full min-h-[38px] flex items-center justify-between px-2 py-1 outline-none rounded-sm transition-shadow group/readonly text-xs text-zinc-500 cursor-default" onClick={(e) => { e.stopPropagation(); }}>
                                                                                    <div className="truncate">{(task as any).dateClosed ? format(new Date((task as any).dateClosed), "M/d/yy") : "—"}</div>
                                                                                    <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><div className="opacity-0 group-hover/readonly:opacity-100 transition-opacity flex items-center justify-center h-6 w-6 rounded-md bg-zinc-100 hover:bg-zinc-200 cursor-default shrink-0" onClick={(e) => e.stopPropagation()}><PenOff className="h-3.5 w-3.5 text-zinc-500" /></div></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>Read-only</TooltipContent></Tooltip></TooltipProvider>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (colId === "dateDone") {
                                                                        return (
                                                                            <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                                <div className="w-full h-full min-h-[38px] flex items-center justify-between px-2 py-1 outline-none rounded-sm transition-shadow group/readonly text-xs text-zinc-500 cursor-default" onClick={(e) => { e.stopPropagation(); }}>
                                                                                    <div className="truncate">{(task as any).dateDone ? format(new Date((task as any).dateDone), "M/d/yy") : "—"}</div>
                                                                                    <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><div className="opacity-0 group-hover/readonly:opacity-100 transition-opacity flex items-center justify-center h-6 w-6 rounded-md bg-zinc-100 hover:bg-zinc-200 cursor-default shrink-0" onClick={(e) => e.stopPropagation()}><PenOff className="h-3.5 w-3.5 text-zinc-500" /></div></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>Read-only</TooltipContent></Tooltip></TooltipProvider>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (colId === "taskType") {
                                                                        const taskStatuses = (((task as any).list?.statuses ?? []) as any[]).length > 0 ? (((task as any).list?.statuses ?? []) as any[]) : allAvailableStatuses.filter(s => { const taskListId = (task as any).listId ?? (task as any).list?.id; return !taskListId || s.listId === taskListId; });
                                                                        return (
                                                                            <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                                <TaskStatusPopover task={task} availableStatuses={taskStatuses} availableTaskTypes={availableTaskTypes} onUpdateTask={(id, data) => updateTask.mutate({ id, ...data } as any)} hideStatusTab={true}>
                                                                                    <button type="button" onClick={(e) => e.stopPropagation()} className="w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm transition-shadow cursor-pointer hover:bg-zinc-100 gap-2 text-left text-xs text-zinc-700">
                                                                                        <TaskTypeIcon type={(task as any).taskType} className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                                                                        <span className="truncate">{(task as any).taskType?.name ?? "Task"}</span>
                                                                                    </button>
                                                                                </TaskStatusPopover>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (colId === "timeline") {
                                                                        return (
                                                                            <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                                <Popover><PopoverTrigger asChild><button type="button" className={cn("w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm transition-shadow cursor-pointer hover:bg-zinc-100 text-xs gap-1.5", (task.startDate || task.dueDate) ? "text-zinc-700 font-medium" : "text-zinc-400")} onClick={(e) => { e.stopPropagation(); }} title="Edit timeline"><Calendar className="h-3.5 w-3.5" />{task.startDate || task.dueDate ? (<>{task.startDate ? format(new Date(task.startDate), "M/d/yy") : "—"} &rarr; {task.dueDate ? format(new Date(task.dueDate), "M/d/yy") : "—"}</>) : ""}</button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start" sideOffset={8} collisionPadding={10}><TaskCalendar startDate={task.startDate ? new Date(task.startDate) : undefined} endDate={task.dueDate ? new Date(task.dueDate) : undefined} onStartDateChange={(date) => { updateTask.mutate({ id: task.id, startDate: date ? date.toISOString() : null } as any); }} onEndDateChange={(date) => { updateTask.mutate({ id: task.id, dueDate: date ? date.toISOString() : null } as any); }} /></PopoverContent></Popover>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (colId === "linkedTasks") {
                                                                        const deps = (task as any).dependencies || [];
                                                                        const blocks = (task as any).blockedDependencies || [];
                                                                        const depCount = ((task as any)._count?.dependencies ?? 0) + ((task as any)._count?.blockedDependencies ?? 0);
                                                                        const firstLinkedTaskTitle = deps[0]?.dependsOn?.title || blocks[0]?.task?.title || "Task";
                                                                        return (
                                                                            <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                                <TaskLinkedTasksPopover taskId={task.id} workspaceId={(task as any).workspaceId ?? resolvedWorkspaceId as string}>
                                                                                    <button type="button" className="w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm transition-shadow cursor-pointer hover:bg-zinc-100 gap-1" onClick={(e) => e.stopPropagation()}>
                                                                                        {depCount > 0 ? (
                                                                                            <>
                                                                                                <Badge variant="outline" className="h-5 px-1.5 text-xs font-normal border-zinc-200 bg-white truncate max-w-[80px] rounded-sm">{firstLinkedTaskTitle}</Badge>
                                                                                                {depCount > 1 && <Badge variant="outline" className="h-5 px-1 text-xs font-normal border-zinc-200 bg-white rounded-sm">+{depCount - 1}</Badge>}
                                                                                            </>
                                                                                        ) : (
                                                                                            <span className="text-xs text-zinc-500">—</span>
                                                                                        )}
                                                                                    </button>
                                                                                </TaskLinkedTasksPopover>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (colId === "linkedDocs") {
                                                                        return (
                                                                            <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                                <LinkedDocsCell task={task as any} workspaceId={(task as any).workspaceId ?? resolvedWorkspaceId as string} />
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (colId === "dependencies") {
                                                                        const depCount = ((task as any)._count?.dependencies ?? 0) + ((task as any)._count?.blockedDependencies ?? 0);
                                                                        return (
                                                                            <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                                <TaskDependenciesPopover taskId={task.id} workspaceId={(task as any).workspaceId ?? resolvedWorkspaceId as string}>
                                                                                    <button type="button" className="w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm transition-shadow cursor-pointer hover:bg-zinc-100 gap-1" onClick={(e) => e.stopPropagation()}>
                                                                                        {depCount > 0 ? (
                                                                                            <>
                                                                                                <Badge variant="outline" className="h-5 px-1.5 text-xs font-normal border-zinc-200 bg-white truncate max-w-[80px] rounded-sm">Task</Badge>
                                                                                                {depCount > 1 && <Badge variant="outline" className="h-5 px-1 text-xs font-normal border-zinc-200 bg-white rounded-sm">+{depCount - 1}</Badge>}
                                                                                            </>
                                                                                        ) : (
                                                                                            <span className="text-xs text-zinc-500">—</span>
                                                                                        )}
                                                                                    </button>
                                                                                </TaskDependenciesPopover>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (colId === "taskId") {
                                                                        return (
                                                                            <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden text-xs text-zinc-500 font-mono group/taskid" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                                <div className="w-full h-full min-h-[38px] flex items-center justify-between px-2 py-1 outline-none rounded-sm transition-shadow cursor-default hover:bg-zinc-100" onClick={(e) => { e.stopPropagation(); }}>
                                                                                    <span className="truncate max-w-[80px] shrink-0" title={task.id}># {task.id.slice(0, 7)}...</span>
                                                                                    <TooltipProvider delayDuration={300}>
                                                                                        <Tooltip>
                                                                                            <TooltipTrigger asChild>
                                                                                                <button
                                                                                                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(task.id); toast.success('Task ID copied'); }}
                                                                                                    className="opacity-0 group-hover/taskid:opacity-100 transition-opacity flex items-center justify-center h-6 w-6 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-500 hover:text-zinc-700 shrink-0 cursor-pointer"
                                                                                                >
                                                                                                    <Copy className="h-3.5 w-3.5" />
                                                                                                </button>
                                                                                            </TooltipTrigger>
                                                                                            <TooltipContent side="top" className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md">
                                                                                                Copy Task ID
                                                                                            </TooltipContent>
                                                                                        </Tooltip>
                                                                                    </TooltipProvider>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (colId === "list") {
                                                                        return (
                                                                            <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                                <TaskListPopover taskId={task.id} workspaceId={((task as any).workspaceId ?? resolvedWorkspaceId) as string} currentListId={(task as any).list?.id} sharedLists={(task as any).sharedLists ?? []}>
                                                                                    <button type="button" className="w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm transition-shadow cursor-pointer hover:bg-zinc-100 gap-1 group" onClick={(e) => e.stopPropagation()}>
                                                                                        <Badge variant="outline" className="h-6 px-2 text-xs font-normal border-zinc-200 bg-white rounded-md text-zinc-700 truncate group-hover:bg-zinc-50 transition-colors">
                                                                                            {(task as any).list?.name || '—'}
                                                                                        </Badge>
                                                                                        {((task as any).sharedLists?.length > 0) && (
                                                                                            <Badge variant="outline" className="h-6 px-2 text-xs font-normal border-zinc-200 bg-white rounded-md text-zinc-500 group-hover:bg-zinc-50 transition-colors shrink-0">
                                                                                                + {(task as any).sharedLists.length}
                                                                                            </Badge>
                                                                                        )}
                                                                                        <div className="h-6 w-6 rounded-md border border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:bg-white group-hover:text-zinc-600 transition-colors shrink-0 bg-white">
                                                                                            <Plus className="h-3 w-3" />
                                                                                        </div>
                                                                                    </button>
                                                                                </TaskListPopover>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (colId === "comments") {
                                                                        return (
                                                                            <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                                <TaskCommentPopover
                                                                                    taskId={task.id}
                                                                                    commentCount={(task as any)._count?.comments ?? 0}
                                                                                    workspaceMembers={(workspaceMembers || []).map((u: any) => ({ id: u.user?.id ?? u.id, name: u.user?.name || u.user?.email || u.name || u.email, image: u.user?.image ?? u.image }))}
                                                                                    trigger={
                                                                                        <button type="button" className="w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm transition-shadow cursor-pointer hover:bg-zinc-100 gap-1" onClick={(e) => e.stopPropagation()}>
                                                                                            <div className={cn(
                                                                                                "flex items-center gap-1.5 text-xs rounded-md px-1.5 py-1 transition-colors border",
                                                                                                ((task as any)._count?.comments ?? 0) > 0
                                                                                                    ? "text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border-zinc-200"
                                                                                                    : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 border-transparent"
                                                                                            )}>
                                                                                                <MessageSquare className="h-3.5 w-3.5" />
                                                                                                {((task as any)._count?.comments ?? 0) > 0 && <span className="font-medium">{(task as any)._count?.comments}</span>}
                                                                                            </div>
                                                                                        </button>
                                                                                    }
                                                                                />
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (colId === "tags") {
                                                                        return (
                                                                            <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                                <div className="w-full h-full min-h-[38px] flex items-center px-2 py-1 outline-none rounded-sm transition-shadow gap-1 overflow-hidden group/tagcell cursor-default" onClick={(e) => { e.stopPropagation(); }}>
                                                                                    {task.tags && task.tags.length > 0 ? (
                                                                                        <>
                                                                                            {task.tags.slice(0, 1).map((encoded) => {
                                                                                                const parsed = parseEncodedTag(encoded);
                                                                                                const bg = parsed.color ?? "#ede9fe";
                                                                                                return (
                                                                                                    <div key={encoded} className="relative inline-flex items-center group/tag min-w-[40px]">
                                                                                                        <span
                                                                                                            className="px-1.5 py-1 rounded-md text-xs font-medium cursor-pointer w-full text-center truncate max-w-[100px]"
                                                                                                            style={{ backgroundColor: bg, color: "#3730a3" }}
                                                                                                        >
                                                                                                            {parsed.label}
                                                                                                        </span>
                                                                                                        <div
                                                                                                            style={{ backgroundColor: bg }}
                                                                                                            className="absolute inset-0 flex items-center justify-between text-zinc-400 px-1 rounded-md text-xs opacity-0 group-hover/tag:opacity-100 transition-opacity pointer-events-none"
                                                                                                        >
                                                                                                            <Tooltip>
                                                                                                                <TooltipTrigger asChild>
                                                                                                                    <span className="inline-flex pointer-events-auto">
                                                                                                                        <TagEditorPopover
                                                                                                                            tag={encoded}
                                                                                                                            tags={task.tags ?? []}
                                                                                                                            onChange={(nextTags) => { void updateTask.mutateAsync({ id: task.id, tags: nextTags } as any); }}
                                                                                                                        >
                                                                                                                            <button type="button" className="px-0.5 cursor-pointer hover:text-zinc-700" onClick={(e) => e.stopPropagation()}>
                                                                                                                                <MoreHorizontal className="h-3 w-3" />
                                                                                                                            </button>
                                                                                                                        </TagEditorPopover>
                                                                                                                    </span>
                                                                                                                </TooltipTrigger>
                                                                                                                <TooltipContent side="top" sideOffset={4} className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md">
                                                                                                                    Tag settings
                                                                                                                </TooltipContent>
                                                                                                            </Tooltip>
                                                                                                            <Tooltip>
                                                                                                                <TooltipTrigger asChild>
                                                                                                                    <button type="button" className="px-0.5 pointer-events-auto cursor-pointer hover:text-red-500" onClick={(e) => { e.stopPropagation(); const nextTags = (task.tags ?? []).filter((t) => t !== encoded); void updateTask.mutateAsync({ id: task.id, tags: nextTags } as any); }}>
                                                                                                                        <X className="h-3 w-3" />
                                                                                                                    </button>
                                                                                                                </TooltipTrigger>
                                                                                                                <TooltipContent side="top" sideOffset={4} className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md">
                                                                                                                    Remove tag
                                                                                                                </TooltipContent>
                                                                                                            </Tooltip>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                            {task.tags.length > 1 ? (
                                                                                                <Tooltip>
                                                                                                    <TooltipTrigger asChild>
                                                                                                        <span className="inline-flex">
                                                                                                            <TagsPopover
                                                                                                                tags={task.tags ?? []}
                                                                                                                onChange={(nextTags) => { void updateTask.mutateAsync({ id: task.id, tags: nextTags } as any); }}
                                                                                                                trigger={
                                                                                                                    <button type="button" className="px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 text-xs font-medium cursor-pointer hover:bg-zinc-200" onClick={(e) => e.stopPropagation()}>
                                                                                                                        +{task.tags.length - 1}
                                                                                                                    </button>
                                                                                                                }
                                                                                                            />
                                                                                                        </span>
                                                                                                    </TooltipTrigger>
                                                                                                    <TooltipContent side="top" sideOffset={4} className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md">
                                                                                                        View tags
                                                                                                    </TooltipContent>
                                                                                                </Tooltip>
                                                                                            ) : (
                                                                                                <Tooltip>
                                                                                                    <TooltipTrigger asChild>
                                                                                                        <span className="inline-flex">
                                                                                                            <TagsPopover
                                                                                                                tags={task.tags ?? []}
                                                                                                                onChange={(nextTags) => { void updateTask.mutateAsync({ id: task.id, tags: nextTags } as any); }}
                                                                                                                trigger={
                                                                                                                    <button type="button" className="flex items-center justify-center h-5 w-5 rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-opacity opacity-0 group-hover/tagcell:opacity-100 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                                                                                                        <Plus className="h-3 w-3" />
                                                                                                                    </button>
                                                                                                                }
                                                                                                            />
                                                                                                        </span>
                                                                                                    </TooltipTrigger>
                                                                                                    <TooltipContent side="top" sideOffset={4} className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md">
                                                                                                        Add tag
                                                                                                    </TooltipContent>
                                                                                                </Tooltip>
                                                                                            )}
                                                                                        </>
                                                                                    ) : (
                                                                                        <TagsPopover
                                                                                            tags={task.tags ?? []}
                                                                                            onChange={(nextTags) => { void updateTask.mutateAsync({ id: task.id, tags: nextTags } as any); }}
                                                                                            trigger={
                                                                                                <div className="flex items-center gap-1 w-full h-full cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                                                                                    <div className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors">—</div>
                                                                                                </div>
                                                                                            }
                                                                                        />
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (colId === "pullRequests") {
                                                                        return (
                                                                            <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                                <div className="w-full h-full min-h-[38px] flex items-center px-2 py-1 outline-none rounded-sm transition-shadow text-xs text-zinc-500 cursor-default" onClick={(e) => { e.stopPropagation(); }}>
                                                                                    —
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }

                                                                    const cfEntry = FIELD_CONFIG.find(f => f.id === colId && (f as any).isCustom);
                                                                    if (cfEntry) {
                                                                        const customField = (cfEntry as any).customField || cfEntry;
                                                                        const value = getCustomFieldValue(task, colId);
                                                                        const formattedValue = formatCustomFieldValue(value, customField);
                                                                        return (
                                                                            <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                                <div className="w-full h-full min-h-[38px] flex items-center px-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-within:ring-indigo-500 transition-shadow" onClick={(e) => e.stopPropagation()}>
                                                                                    <CustomFieldRenderer
                                                                                        field={customField}
                                                                                        value={value}
                                                                                        onChange={(newValue) => {
                                                                                            updateCustomField.mutate({
                                                                                                taskId: task.id,
                                                                                                customFieldId: customField.id,
                                                                                                value: newValue
                                                                                            });
                                                                                        }}
                                                                                        hideLabel={true}
                                                                                        workspaceId={workspaceId}
                                                                                        spaceId={spaceId}
                                                                                        projectId={projectId}
                                                                                        teamId={teamId}
                                                                                        listId={listId}
                                                                                        taskId={task.id}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }

                                                                    return (
                                                                        <div key={colId} className="px-4 flex items-center shrink-0 w-full h-full min-h-[38px] p-0.5 rounded-sm overflow-hidden" style={{ width: Math.max(w, 100), minWidth: Math.max(w, 100) }}>
                                                                            <div className="w-full h-full min-h-[38px] flex items-center px-2 py-1 outline-none rounded-sm transition-shadow text-xs text-zinc-500 cursor-default">
                                                                                <div className="truncate">—</div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                                <div className="w-[52px] sticky right-0 bg-white group-hover:bg-zinc-50 z-10 shrink-0 transition-colors" />
                                                            </div>
                                                        </TaskActionsPopover>
                                                    );
                                                }}
                                            />
                                            <div ref={loadMoreRef} className="h-px w-full" />
                                        </div>
                                        <div className="h-4 shrink-0" />
                                    </div>
                                </ScrollArea>
                            </div>
                            <div
                                className="absolute top-0 bottom-0 right-0 w-[6px] translate-x-[3px] cursor-col-resize z-30 flex items-center justify-center group/resize select-none"
                                onPointerDown={startLeftPanelResize}
                                title="Drag to resize sidebar"
                            >
                                <div className="w-[2px] h-full bg-transparent group-hover/resize:bg-violet-400 group-hover/left-sidebar:bg-zinc-300 transition-colors duration-150" />
                            </div>
                        </div>
                    )}

                    {/* Timeline Column */}
                    <div className="flex flex-col overflow-hidden min-w-0 relative">
                        <div className="absolute right-2 top-[68px] z-40 w-6 rounded-md border border-zinc-200 bg-white/95 shadow-sm backdrop-blur-sm overflow-hidden">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-none text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                                onClick={handleZoomIn}
                                disabled={!canZoomIn}
                                title="Zoom in"
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-none border-t border-zinc-200 text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                                onClick={handleZoomOut}
                                disabled={!canZoomOut}
                                title="Zoom out"
                            >
                                <Minus className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                        <ScrollArea ref={rightScrollAreaRef} className="flex-1 w-full">
                            <div className="min-w-fit w-full cursor-grab active:cursor-grabbing select-none" style={{ width: totalTimelineCanvasWidthPx }} onMouseDown={handleTimelinePanStart}>
                                {/* Month Headers */}
                                <div className={cn(GANTT_HEADER_ROW_CLASS, "sticky top-0 z-30")}>
                                    {effectiveTimeScale === "Day" ? (
                                        <div className="h-full flex flex-col">
                                            <div className="h-8 flex border-b border-zinc-200/70">
                                                {dayHeaderSegments.map((seg) => (
                                                    <div
                                                        key={seg.dayKey}
                                                        className="px-3 flex items-center text-[11px] font-semibold text-zinc-600 border-r border-zinc-200/60 whitespace-nowrap"
                                                        style={{ width: seg.span * activeColumnWidth }}
                                                    >
                                                        {seg.dayLabel}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="h-8 flex">
                                                {timelineUnits.map((unit, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex items-center justify-center text-[10px] font-medium text-zinc-500 border-r border-zinc-200/60"
                                                        style={{ width: activeColumnWidth }}
                                                    >
                                                        {unit.label}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : effectiveTimeScale === "Week" ? (
                                        <div className="h-full flex flex-col">
                                            <div className="h-8 flex border-b border-zinc-200/70">
                                                {weekHeaderSegments.map((seg) => (
                                                    <div
                                                        key={seg.weekKey}
                                                        className="px-2 flex items-center justify-between text-[11px] font-semibold text-zinc-600 border-r border-zinc-200/60"
                                                        style={{ width: seg.span * activeColumnWidth }}
                                                    >
                                                        <span>{seg.weekLabel}</span>
                                                        <span className="text-zinc-500">{seg.weekNumber}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="h-8 flex">
                                                {timelineUnits.map((unit, i) => (
                                                    <div
                                                        key={i}
                                                        className={cn(
                                                            "flex items-center justify-center text-[10px] font-medium border-r border-zinc-200/60",
                                                            unit.isWeekend ? "text-zinc-400 bg-zinc-50" : "text-zinc-600"
                                                        )}
                                                        style={{ width: activeColumnWidth }}
                                                    >
                                                        {unit.label}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : effectiveTimeScale === "Month" ? (
                                        <div className="h-full flex flex-col">
                                            <div className="h-8 flex border-b border-zinc-200/70 relative">
                                                {monthHeaderSegments.map((seg) => (
                                                    <div
                                                        key={seg.monthKey}
                                                        className="px-2 flex items-center justify-between text-[11px] font-semibold text-zinc-600 border-r border-zinc-200/60"
                                                        style={{ width: seg.span * activeColumnWidth }}
                                                    >
                                                        <span>{seg.monthLabel}</span>
                                                        <span className="text-zinc-700">{seg.monthKey.slice(0, 4)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="h-8 flex relative">
                                                {timelineUnits.map((unit, i) => (
                                                    <div
                                                        key={i}
                                                        className="px-2 flex items-center justify-between text-[11px] font-medium text-zinc-600 border-r border-zinc-200/60"
                                                        style={{ width: activeColumnWidth }}
                                                    >
                                                        <span className="text-zinc-500">{unit.weekNumber}</span>
                                                        <span>{unit.weekLabel}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : effectiveTimeScale === "Quarter" ? (
                                        <div className="h-full flex flex-col">
                                            <div className="h-8 flex border-b border-zinc-200/70">
                                                {timelineUnits
                                                    .reduce((acc: { quarterKey: string; quarterLabel: string; quarterYear: number; span: number }[], unit) => {
                                                        if (!unit.quarterKey || !unit.quarterLabel || !unit.quarterYear) return acc;
                                                        const last = acc[acc.length - 1];
                                                        if (!last || last.quarterKey !== unit.quarterKey) {
                                                            acc.push({
                                                                quarterKey: unit.quarterKey,
                                                                quarterLabel: unit.quarterLabel,
                                                                quarterYear: unit.quarterYear,
                                                                span: 1,
                                                            });
                                                        } else {
                                                            last.span += 1;
                                                        }
                                                        return acc;
                                                    }, [])
                                                    .map((seg) => (
                                                        <div
                                                            key={seg.quarterKey}
                                                            className="px-2 flex items-center justify-between text-[11px] font-semibold text-zinc-600 border-r border-zinc-200/60"
                                                            style={{ width: seg.span * activeColumnWidth }}
                                                        >
                                                            <span>{seg.quarterLabel}</span>
                                                            <span className="text-zinc-700">{seg.quarterYear}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                            <div className="h-8 flex">
                                                {timelineUnits.map((unit, i) => (
                                                    <div
                                                        key={i}
                                                        className="px-2 flex items-center justify-center text-[11px] font-medium text-zinc-600 border-r border-zinc-200/60"
                                                        style={{ width: activeColumnWidth }}
                                                    >
                                                        {unit.monthLabel || unit.label}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : effectiveTimeScale === "Year" ? (
                                        <div className="h-full flex flex-col">
                                            <div className="h-8 flex border-b border-zinc-200/70">
                                                {timelineUnits
                                                    .reduce((acc: { yearKey: string; yearLabel: string; span: number }[], unit) => {
                                                        if (!unit.yearKey || !unit.yearLabel) return acc;
                                                        const last = acc[acc.length - 1];
                                                        if (!last || last.yearKey !== unit.yearKey) {
                                                            acc.push({ yearKey: unit.yearKey, yearLabel: unit.yearLabel, span: 1 });
                                                        } else {
                                                            last.span += 1;
                                                        }
                                                        return acc;
                                                    }, [])
                                                    .map((seg) => (
                                                        <div
                                                            key={seg.yearKey}
                                                            className="px-2 flex items-center justify-center text-[12px] font-semibold text-zinc-700 border-r border-zinc-200/60"
                                                            style={{ width: seg.span * activeColumnWidth }}
                                                        >
                                                            {seg.yearLabel}
                                                        </div>
                                                    ))}
                                            </div>
                                            <div className="h-8 flex">
                                                {timelineUnits.map((unit, i) => (
                                                    <div
                                                        key={i}
                                                        className="px-2 flex items-center justify-center text-[11px] font-medium text-zinc-600 border-r border-zinc-200/60"
                                                        style={{ width: activeColumnWidth }}
                                                    >
                                                        {unit.quarterLabel || unit.label}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex">
                                            {timelineUnits.map((month, i) => (
                                                <div
                                                    key={i}
                                                    className="px-4 flex items-center justify-center text-xs font-semibold text-zinc-600 border-r border-zinc-200/60"
                                                    style={{ width: activeColumnWidth }}
                                                >
                                                    {month.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Timeline Bars Grid */}
                                <div className="relative">
                                    <div className="absolute inset-0 flex pointer-events-none">
                                        {timelineUnits.map((unit, i) => (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "border-r border-zinc-200/60 h-full",
                                                    effectiveTimeScale === "Week" && unit.isWeekend && "bg-[repeating-linear-gradient(135deg,rgba(113,113,122,0.08)_0px,rgba(113,113,122,0.08)_2px,transparent_2px,transparent_6px)]"
                                                )}
                                                style={{ width: activeColumnWidth }}
                                            />
                                        ))}
                                    </div>
                                    <VirtualizedDivRows
                                        scrollRef={rightScrollAreaRef}
                                        rowCount={ganttRows.length + 1}
                                        estimateSize={48}
                                        enabled={!draggedBarStyle}
                                        renderRow={(idx) => {
                                            if (idx === ganttRows.length) {
                                                return <div key="__add_task_spacer" className="h-12 border-b border-zinc-100" />;
                                            }
                                            const row = ganttRows[idx];
                                            if (row.type === 'group') {
                                                return <div key={`group-right-${row.id}`} className="h-11 border-b border-zinc-100 bg-white" />;
                                            }
                                            const task = row.task;
                                            const barStyle = getTaskBarStyle(task);
                                            const isDraggingThis = draggedBarStyle?.taskId === task.id;
                                            const barLeft = barStyle ? (isDraggingThis ? draggedBarStyle!.barLeft : barStyle.left) : 0;
                                            const barWidth = barStyle ? (isDraggingThis ? draggedBarStyle!.barWidth : barStyle.width) : 0;
                                            const labelLeft = barLeft + barWidth + BAR_LABEL_GAP_PX;
                                            const { startDate, dueDate } = getEffectiveTaskDates(task);

                                            return (
                                                <div
                                                    key={task.id}
                                                    className="h-12 relative hover:bg-zinc-50/50 transition-colors group"
                                                    onMouseMove={(e) => {
                                                        if (barStyle || isTimelinePanningRef.current || isDraggingRef.current) return;
                                                        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                                                        const rawX = Math.max(0, Math.min(totalTimelineWidthPx, e.clientX - rect.left));
                                                        setScheduleHover(prev => {
                                                            if (prev?.taskId === task.id && Math.abs(prev.leftPx - rawX) < 1) return prev;
                                                            return { taskId: task.id, leftPx: rawX };
                                                        });
                                                    }}
                                                    onMouseLeave={() => {
                                                        setScheduleHover((prev) => (prev?.taskId === task.id ? null : prev));
                                                    }}
                                                    onClick={async (e) => {
                                                        if (isDraggingRef.current || isTimelinePanningRef.current) return;
                                                        // If this task already has a bar, only the bar element itself
                                                        // opens the detail (it has its own onClick + stopPropagation).
                                                        // Clicking the empty row area when a bar exists does nothing.
                                                        if (barStyle) return;
                                                        // Use same coordinate as the hover indicator (e.clientX - rect.left):
                                                        // this reflects live scroll position and is immune to micro-pan scroll corruption.
                                                        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                                                        const rawX = e.clientX - rect.left;
                                                        const pickedDate = dateFromTimelinePx(rawX);
                                                        if (!pickedDate) return;

                                                        // Clear hover immediately for instantaneous feedback
                                                        setScheduleHover(null);

                                                        const optimistic = { startDate: pickedDate, dueDate: pickedDate, committed: false as const };
                                                        setLocalTaskDates(prev => ({ ...prev, [task.id]: optimistic }));
                                                        try {
                                                            await updateTask.mutateAsync({
                                                                id: task.id,
                                                                startDate: pickedDate.toISOString(),
                                                                dueDate: pickedDate.toISOString(),
                                                            } as any);
                                                            setLocalTaskDates(prev => prev[task.id]
                                                                ? { ...prev, [task.id]: { ...prev[task.id], committed: true } }
                                                                : prev
                                                            );
                                                            void utils.task.list.invalidate();
                                                        } catch (err) {
                                                            toast.error("Failed to schedule task");
                                                            setLocalTaskDates(prev => {
                                                                const next = { ...prev };
                                                                delete next[task.id];
                                                                return next;
                                                            });
                                                        }
                                                    }}
                                                >
                                                    {barStyle && (
                                                        <TaskActionsPopover
                                                            task={task}
                                                            context={spaceId ? "SPACE" : projectId ? "PROJECT" : "GENERAL"}
                                                            contextId={(spaceId || projectId) as any}
                                                            workspaceId={resolvedWorkspaceId as string}
                                                            users={users as any}
                                                            lists={lists}
                                                            defaultListId={listId}
                                                            availableStatuses={allAvailableStatuses}
                                                            openOnContextMenu
                                                            onDelete={async (id) => {
                                                                try { await deleteTask.mutateAsync({ id }); } catch (e) { }
                                                            }}
                                                            onUpdate={async (id, data) => {
                                                                try { await updateTask.mutateAsync({ id, ...(data as any) }); } catch (e) { }
                                                            }}
                                                            onAction={(action) => {
                                                                if (action === "rename") {
                                                                    setTimelineRenameTitleDraft(task.title || task.name || "");
                                                                    setTimelineRenamePopoverTaskId(task.id);
                                                                } else if (action === "archive") {
                                                                    try { updateTask.mutateAsync({ id: task.id, isArchived: true } as any); toast.success("Task archived"); } catch (e) { }
                                                                }
                                                            }}
                                                        >
                                                            <div
                                                                className={cn(
                                                                    "absolute top-2 h-8 rounded-sm px-2 flex items-center text-xs text-white font-medium shadow-sm transition-all hover:scale-[1.02] cursor-pointer z-[2] group/bar overflow-visible border",
                                                                    getStatusColor(task.status?.name),
                                                                    !isDraggingThis && "group-hover/bar:ring-2 group-hover/bar:ring-violet-400/50"
                                                                )}
                                                                style={{ left: barLeft, width: barWidth }}
                                                                title={`${task.title || task.name} (${startDate ? new Date(startDate).toLocaleDateString() : ''} - ${dueDate ? new Date(dueDate).toLocaleDateString() : ''})`}
                                                                onClick={(e) => {
                                                                    if (isDraggingRef.current) return;
                                                                    e.stopPropagation();
                                                                    // Stop the native event from reaching Radix's document-level
                                                                    // dismiss listener so the dialog doesn't close immediately.
                                                                    e.nativeEvent.stopImmediatePropagation();
                                                                    openTaskDetail(task.id);
                                                                }}
                                                            >
                                                                {showAssignees && task.assignee && (
                                                                    <Avatar className="h-5 w-5 ml-2 border-white ring-1 ring-white/20">
                                                                        <AvatarImage src={task.assignee.image ?? undefined} />
                                                                        <AvatarFallback className="text-[8px] bg-white/20 text-white">{task.assignee.name?.slice(0, 1)}</AvatarFallback>
                                                                    </Avatar>
                                                                )}

                                                                {/* Rename Popover next to the task bar */}
                                                                <Popover
                                                                    open={timelineRenamePopoverTaskId === task.id}
                                                                    onOpenChange={(open) => {
                                                                        setTimelineRenamePopoverTaskId(open ? task.id : null);
                                                                        if (open) setTimelineRenameTitleDraft((task.title || task.name || "").toString());
                                                                    }}
                                                                >
                                                                    <PopoverAnchor className="absolute inset-0 pointer-events-none" />
                                                                    <PopoverContent
                                                                        align="start"
                                                                        side="bottom"
                                                                        sideOffset={8}
                                                                        className="w-[340px] p-5 rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-zinc-200/80 bg-white"
                                                                        onOpenAutoFocus={(e) => e.preventDefault()}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <div className="space-y-3">
                                                                            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 uppercase">
                                                                                <Edit3 className="h-3.5 w-3.5" />
                                                                                <span>RENAME TASK:</span>
                                                                            </div>
                                                                            <div className="flex items-stretch gap-2 border border-zinc-200 rounded-xl p-1 bg-white focus-within:border-[#9381FF] focus-within:ring-[3px] focus-within:ring-[#9381FF]/20 transition-all">
                                                                                <input
                                                                                    placeholder="Enter name"
                                                                                    className="flex-1 bg-transparent border-none outline-none px-2 text-[13px] text-zinc-800 placeholder:text-zinc-400 min-w-0"
                                                                                    value={timelineRenameTitleDraft}
                                                                                    onChange={(e) => setTimelineRenameTitleDraft(e.target.value)}
                                                                                    onKeyDown={async (e) => {
                                                                                        if (e.key !== "Enter") return;
                                                                                        e.preventDefault();
                                                                                        const nextTitle = timelineRenameTitleDraft.trim();
                                                                                        const current = (task.title || task.name || "").toString().trim();
                                                                                        if (!nextTitle || nextTitle === current) return;
                                                                                        try {
                                                                                            await updateTask.mutateAsync({ id: task.id, title: nextTitle } as any);
                                                                                            setTimelineRenamePopoverTaskId(null);
                                                                                        } catch (err) {
                                                                                            toast.error("Failed to rename task");
                                                                                        }
                                                                                    }}
                                                                                />
                                                                                <button
                                                                                    className="bg-[#9381FF] hover:bg-[#8370F5] text-white rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                    disabled={(() => {
                                                                                        const nextTitle = timelineRenameTitleDraft.trim();
                                                                                        const current = (task.title || task.name || "").toString().trim();
                                                                                        return !nextTitle || nextTitle === current || updateTask.isPending;
                                                                                    })()}
                                                                                    onClick={async (e) => {
                                                                                        e.stopPropagation();
                                                                                        const nextTitle = timelineRenameTitleDraft.trim();
                                                                                        const current = (task.title || task.name || "").toString().trim();
                                                                                        if (!nextTitle || nextTitle === current) return;
                                                                                        try {
                                                                                            await updateTask.mutateAsync({ id: task.id, title: nextTitle } as any);
                                                                                            setTimelineRenamePopoverTaskId(null);
                                                                                        } catch (err) {
                                                                                            toast.error("Failed to rename task");
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    {updateTask.isPending ? "..." : "Save"}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Popover>

                                                                {/* Left resize handle + "drag line" */}
                                                                <div
                                                                    className="absolute left-0 top-0 bottom-0 w-3 flex items-center justify-center opacity-0 group-hover/bar:opacity-100 transition-opacity cursor-col-resize z-20"
                                                                    onMouseDown={(e) => handleResizeStart(e, task, "left")}
                                                                >
                                                                    <div className="w-[2.5px] h-4 rounded-full bg-white/90 shadow-sm" />
                                                                </div>

                                                                {/* Right resize handle */}
                                                                <div
                                                                    className="absolute right-0 top-0 bottom-0 w-3 flex items-center justify-center opacity-0 group-hover/bar:opacity-100 transition-opacity cursor-col-resize z-20"
                                                                    onMouseDown={(e) => handleResizeStart(e, task, "right")}
                                                                >
                                                                    <div className="w-[2.5px] h-4 rounded-full bg-white/90 shadow-sm" />
                                                                </div>
                                                            </div>
                                                        </TaskActionsPopover>
                                                    )}

                                                    {/* Always-visible task name label beside the bar */}
                                                    {barStyle && (
                                                        <div
                                                            className="absolute top-2 h-8 flex items-center z-[2] pointer-events-none"
                                                            style={{ left: labelLeft }}
                                                        >
                                                            <span className="text-xs font-medium text-zinc-700 whitespace-nowrap">
                                                                {task.title || task.name}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {!barStyle && scheduleHover?.taskId === task.id && (
                                                        <>
                                                            <div
                                                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-7 w-7 rounded-full border border-zinc-500 bg-zinc-200/90 z-[2] pointer-events-none"
                                                                style={{ left: scheduleHover.leftPx }}
                                                            />
                                                            <div
                                                                className="absolute -top-0.5 -translate-x-1/2 -translate-y-full z-[3] pointer-events-none"
                                                                style={{ left: scheduleHover.leftPx }}
                                                            >
                                                                <div className="bg-zinc-900 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap shadow">
                                                                    Click to Schedule Task
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        }}
                                    />
                                    <div ref={loadMoreRef} className="h-px w-full" />
                                </div>
                            </div>
                            <div className="h-3 shrink-0" />
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </div>
                </div>

            )
            }
            {
                customizePanelOpen && !layoutOptionsOpen && (
                    <SidePanel
                        open={customizePanelOpen && !layoutOptionsOpen}
                        onClose={() => setCustomizePanelOpen(false)}
                        className="absolute bottom-0 right-0 h-full w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col"
                    >
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
                                    <div className="flex items-center justify-between py-1 px-2 cursor-pointer" onClick={() => setShowWeekends(!showWeekends)}>
                                        <span className="text-sm text-zinc-800">Show weekends</span>
                                        <Switch
                                            checked={showWeekends}
                                            onCheckedChange={setShowWeekends}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between py-1 px-2">
                                        <span className="text-sm text-zinc-800">Show critical path</span>
                                        <Switch checked={showCriticalPath} onCheckedChange={setShowCriticalPath} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2">
                                        <span className="text-sm text-zinc-800">Show slack time</span>
                                        <Switch checked={showSlackTime} onCheckedChange={setShowSlackTime} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2">
                                        <span className="text-sm text-zinc-800">Full screen mode</span>
                                        <Switch checked={fullScreenMode} onCheckedChange={setFullScreenMode} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2">
                                        <span className="text-sm text-zinc-800">Reschedule dependencies</span>
                                        <Switch checked={rescheduleDependencies} onCheckedChange={setRescheduleDependencies} />
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
                                    <button type="button" className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer" onClick={() => {
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
                                        <span className="flex items-center gap-2"><Users className="h-4 w-4 text-zinc-400" />Sharing & Permissions</span>
                                        <ChevronRight className="inline h-3 w-3 ml-1 text-zinc-400" />
                                    </button>
                                </div>
                            </div>
                        </ScrollArea>
                    </SidePanel>
                )
            }
            {
                layoutOptionsOpen && (
                    <SidePanel
                        open={layoutOptionsOpen}
                        onClose={() => { setLayoutOptionsOpen(false); setCustomizePanelOpen(false); }}
                        className="absolute bottom-0 right-0 h-full w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col"
                    >
                        <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                            <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1 cursor-pointer" onClick={() => { setLayoutOptionsOpen(false); setCustomizePanelOpen(true); }}>
                                <ArrowRight className="h-4 w-4 rotate-180" />
                            </Button>
                            <h3 className="font-semibold text-zinc-900">Layout options</h3>
                            <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={() => { setLayoutOptionsOpen(false); setCustomizePanelOpen(false); }}><X className="h-4 w-4" /></Button>
                        </div>
                        <ScrollArea className="flex-1 min-h-0">
                            <div className="p-3 space-y-6 pb-24">
                                <div className="space-y-1">
                                    <p className="px-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Page & card layout</p>

                                    <div className="flex items-center justify-between py-2 px-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors group">
                                        <span className="text-sm text-zinc-800">Color tasks by</span>
                                        <div className="flex items-center gap-1 text-zinc-400 group-hover:text-zinc-600 transition-colors">
                                            <span className="text-xs">Default</span>
                                            <ChevronRight className="h-4 w-4" />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                        <span className="text-sm text-zinc-800">Show weekends</span>
                                        <Switch checked={showWeekends} onCheckedChange={setShowWeekends} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                        <span className="text-sm text-zinc-800">Show critical path</span>
                                        <Switch checked={showCriticalPath} onCheckedChange={setShowCriticalPath} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                        <span className="text-sm text-zinc-800">Show slack time</span>
                                        <Switch checked={showSlackTime} onCheckedChange={setShowSlackTime} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                        <span className="text-sm text-zinc-800">Full screen mode</span>
                                        <Switch checked={fullScreenMode} onCheckedChange={setFullScreenMode} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                        <span className="text-sm text-zinc-800">Reschedule dependencies</span>
                                        <Switch checked={rescheduleDependencies} onCheckedChange={setRescheduleDependencies} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                        <span className="text-sm text-zinc-800">Hide empty locations</span>
                                        <Switch checked={hideEmptyLocations} onCheckedChange={setHideEmptyLocations} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                        <span className="text-sm text-zinc-800">Show assignees</span>
                                        <Switch checked={showAssignees} onCheckedChange={setShowAssignees} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                        <span className="text-sm text-zinc-800">Show task names</span>
                                        <Switch checked={showTaskNames} onCheckedChange={setShowTaskNames} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                        <span className="text-sm text-zinc-800">Show tags</span>
                                        <Switch checked={showTags} onCheckedChange={setShowTags} />
                                    </div>
                                </div>

                                <div className="h-px bg-zinc-100" />

                                <div className="space-y-1">
                                    <p className="px-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Task visibility</p>
                                    <div className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                        <span className="text-sm text-zinc-800">Show tasks from other Lists</span>
                                        <Switch checked={showTasksFromOtherLists} onCheckedChange={setShowTasksFromOtherLists} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                        <span className="text-sm text-zinc-800">Show subtasks from other Lists</span>
                                        <Switch checked={showSubtasksFromOtherLists} onCheckedChange={setShowSubtasksFromOtherLists} />
                                    </div>
                                </div>

                                <div className="h-px bg-zinc-100" />

                                <div className="space-y-1">
                                    <p className="px-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2">View settings</p>
                                    <div className="flex items-center justify-between py-2 px-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                        <div className="flex items-center gap-2">
                                            <UserRound className="h-4 w-4 text-zinc-400" />
                                            <span className="text-sm text-zinc-800">Default to Me Mode</span>
                                        </div>
                                        <Switch checked={defaultToMeMode} onCheckedChange={setDefaultToMeMode} />
                                    </div>
                                    <div className="flex items-center justify-between py-2 px-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors group">
                                        <div className="flex items-center gap-2 text-zinc-800">
                                            <ArrowRight className="h-4 w-4 text-zinc-400" />
                                            <span className="text-sm">Move view</span>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600" />
                                    </div>
                                    <div className="flex items-center justify-between py-2 px-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors group">
                                        <div className="flex items-center gap-2 text-zinc-800">
                                            <Copy className="h-4 w-4 text-zinc-400" />
                                            <span className="text-sm">Duplicate view</span>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600" />
                                    </div>
                                </div>

                                <div className="h-px bg-zinc-100" />

                                <div
                                    className="flex items-center gap-2 py-3 px-2 hover:bg-zinc-100/60 rounded-lg cursor-pointer transition-colors group"
                                    onClick={resetViewToDefaults}
                                >
                                    <RefreshCw className="h-4 w-4 text-zinc-500 group-hover:rotate-180 transition-transform duration-500" />
                                    <span className="text-sm font-medium text-zinc-700">Reset view to defaults</span>
                                </div>
                            </div>
                        </ScrollArea>
                    </SidePanel>
                )}

            {assigneesPanelOpen && (
                <>
                    <div className="absolute inset-0 bg-black/20 z-40" onClick={() => setAssigneesPanelOpen(false)} aria-hidden />
                    <div className="absolute top-0 right-0 h-full w-[320px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                            <h3 className="font-semibold text-zinc-900">Assignees</h3>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAssigneesPanelOpen(false)}><X className="h-4 w-4" /></Button>
                        </div>
                        <div className="p-3 border-b border-zinc-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                                <Input className="pl-9 h-9 text-sm" placeholder="Search by user or team" value={assigneesSearch} onChange={e => setAssigneesSearch(e.target.value)} />
                            </div>
                        </div>
                        <ScrollArea className="flex-1 p-3">
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
                                                <AvatarFallback className="text-[9px]">
                                                    {u.name?.slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm text-zinc-700 truncate">{u.name}</span>
                                        </label>
                                    ))}
                            </div>
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Teams 0</p>
                            <div className="py-2 text-sm text-zinc-500">No teams</div>
                        </ScrollArea>
                        <div className="p-3 border-t border-zinc-100 flex items-center justify-between">
                            <span className="text-sm text-zinc-700 flex items-center gap-1.5"><MessageSquare className="h-4 w-4 text-zinc-400" /> Assigned comments</span>
                            <Switch />
                        </div>
                    </div>
                </>
            )}

            {/* Fields panel */}
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
                sensors={fieldPanelSensors}
                customFields={customFields as any[]}
                usedCustomFieldIds={usedCustomFieldIds}
                getCustomFieldIcon={getCustomFieldIcon}
            />

            <CustomFieldsManagerModal
                open={managerModalOpen}
                onOpenChange={setManagerModalOpen}
                workspaceId={resolvedWorkspaceId as string}
                initialLocation={
                    listId ? `list:${listId}` :
                        folderId ? `folder:${folderId}` :
                            projectId ? `project:${projectId}` :
                                spaceId ? `space:${spaceId}` :
                                    teamId ? `team:${teamId}` :
                                        resolvedWorkspaceId ? `workspace:${resolvedWorkspaceId}` :
                                            "all" as any
                }
            />

            {/* Task detail modal when used standalone (no onTaskSelect from parent) */}
            {!onTaskSelect && effectiveSelectedTaskId && (
                <TaskDetailModal
                    taskId={effectiveSelectedTaskId}
                    open={true}
                    onOpenChange={(open) => !open && closeTaskDetail()}
                    onLayoutModeChange={() => { }}
                />
            )}

            <DuplicateTaskModal
                open={bulkDuplicateModalOpen}
                onOpenChange={setBulkDuplicateModalOpen}
                taskIds={selectedTasks}
                workspaceId={resolvedWorkspaceId as string}
            />
            <ShareViewPermissionModal
                open={isShareModalOpen}
                onOpenChange={setIsShareModalOpen}
                viewId={viewId as string}
                workspaceId={resolvedWorkspaceId as string}
            />
        </div>
    );
}