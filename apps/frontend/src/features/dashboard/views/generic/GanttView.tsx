"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Plus, ChevronLeft, ChevronRight, Calendar, Search, Filter, Settings, Download, Monitor, Share2, Trash, Copy, Star, Lock, EyeOff, Save, Layout, MoreHorizontal, User,
    CheckCircle2, X, PanelLeft, ArrowLeft, Maximize2, Clock, GitCommit, ListFilter, ArrowUpDown, Pin, SortAsc, Users, Flag, Paperclip, MessageSquare, ChevronsUp,
    LayoutList, SlidersHorizontal, ArrowUp, ArrowDown, Circle, Spline, Link2, Target, Info, Play, ListChecks, AlignLeft, RefreshCcw, Type, Hash, CheckSquare, Tag,
    DollarSign, Globe, FunctionSquare, FileText, Phone, Mail, MapPin, TrendingUp, Heart, PenTool, MousePointer, ListTodo, AlertTriangle, CircleMinus, Link, Slash, Box,
    List as ListIcon, Archive, UserPlus, CalendarCheck, CalendarClock, CalendarRange, Hourglass, UserCheck, RefreshCw, Timer, Undo, ToggleLeft, Edit3, Trash2, Check, ChevronsUpDown,
    ChevronDown, UserRound, ShieldCheck, Home, ChevronUp, ArrowRight, GripVertical
} from "lucide-react";
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
import { ListCreationModal } from "@/entities/task/components/ListCreationModal";
import { AssigneeSelector } from "@/entities/task/components/AssigneeSelector";
import { TaskDetailModal } from "@/entities/task/components/TaskDetailModal";
import { ViewToolbarSaveDropdown } from "@/features/dashboard/components/shared/ViewToolbarSaveDropdown";
import { ViewToolbarClosedPopover } from "@/features/dashboard/components/shared/ViewToolbarClosedPopover";
import { TaskTypeIcon } from "@/entities/task/components/TaskTypeIcon";
import { format } from "date-fns";
import type { FilterCondition, FilterGroup, ListViewSavedConfig } from "./listViewTypes";
import { FILTER_OPTIONS, FIELD_OPERATORS, STANDARD_FIELD_CONFIG } from "./listViewConstants";
import { evaluateGroup, hasFilterValue, hasAnyValueInGroup, evaluateCondition } from "./filterUtils";
import { DestinationPicker } from "@/entities/task/components/DestinationPicker";
import { ShareViewPermissionModal } from "@/features/dashboard/components/shared/ShareViewPermissionModal";
import { DuplicateTaskModal } from "@/entities/task/components/DuplicateTaskModal";
import { parseEncodedTag } from "@/entities/task/utils/tags";

interface GanttViewProps {
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    listId?: string;
    viewId?: string;
    initialConfig?: any;
    selectedTaskIdFromParent?: string | null;
    onTaskSelect?: (taskId: string | null) => void;
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

const GANTT_FIELD_CONFIG = [
    { id: "name", label: "Name", icon: Type, type: "TEXT" },
    { id: "status", label: "Status", icon: Info, type: "STATUS" },
    { id: "assignee", label: "Assignee", icon: User, type: "USER" },
    { id: "priority", label: "Priority", icon: Flag, type: "PRIORITY" },
    { id: "dueDate", label: "Due Date", icon: Calendar, type: "DATE" },
    { id: "startDate", label: "Start Date", icon: CalendarClock, type: "DATE" },
    { id: "dateCreated", label: "Date Created", icon: Clock, type: "DATE" },
    { id: "dateUpdated", label: "Date Updated", icon: RefreshCcw, type: "DATE" },
    { id: "tags", label: "Tags", icon: Tag, type: "TAGS" },
    { id: "timeEstimate", label: "Time Estimate", icon: Timer, type: "NUMBER" },
    { id: "timeTracked", label: "Time Tracked", icon: Play, type: "NUMBER" },
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

export function GanttView({ spaceId, projectId, teamId, listId, viewId, initialConfig, selectedTaskIdFromParent, onTaskSelect }: GanttViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const utils = trpc.useUtils();
    const [timeScale, setTimeScale] = useState<TimeScale>('Month');
    const [searchQuery, setSearchQuery] = useState("");
    const [showWeekends, setShowWeekends] = useState(true);
    const [showCriticalPath, setShowCriticalPath] = useState(false);
    const [showSlackTime, setShowSlackTime] = useState(false);
    const [fullScreenMode, setFullScreenMode] = useState(false);
    const [rescheduleDependencies, setRescheduleDependencies] = useState(true);
    const [showClosed, setShowClosed] = useState(false);

    const { data: viewData } = trpc.view.get.useQuery({ id: viewId as string }, { enabled: !!viewId });
    const { data: space } = trpc.space.get.useQuery({ id: spaceId as string }, { enabled: !!spaceId });
    const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const effectiveSelectedTaskId = selectedTaskIdFromParent || selectedTaskId;
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
    const [bulkDuplicateModalOpen, setBulkDuplicateModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const closeTaskDetail = () => {
        if (onTaskSelect) onTaskSelect(null);
        else setSelectedTaskId(null);
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
    const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
    const [sortPanelOpen, setSortPanelOpen] = useState(false);
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
        const oldName = viewData?.name || "";
        setViewNameDraft(newName); // Local optimistic update
        try {
            await updateViewMutation.mutateAsync({ id: viewId, name: newName.trim() });
            void utils.view.get.invalidate({ id: viewId });
        } catch (e) {
            setViewNameDraft(oldName);
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

    const addFilterCondition = (groupId: string) => {
        const addRecursive = (group: FilterGroup): FilterGroup => {
            if (group.id === groupId) {
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
    // Fetch tasks
    const { data: projectParticipants } = trpc.project.getParticipants.useQuery({ projectId: projectId as string }, { enabled: !!projectId });
    const { data: teamParticipants } = trpc.team.getParticipants.useQuery({ teamId: teamId as string }, { enabled: !!teamId });
    const { data: currentList } = trpc.list.get.useQuery({ id: listId as string }, { enabled: !!listId });

    const taskListInput = useMemo(() => ({ spaceId, projectId, teamId, listId, includeRelations: true, page: 1, pageSize: 500 }), [spaceId, projectId, teamId, listId]);
    const { data: tasksData, isLoading } = trpc.task.list.useQuery(taskListInput, { enabled: !!(spaceId || projectId || teamId || listId) });
    const tasks = useMemo<Task[]>(() => ((tasksData?.items as Task[]) ?? []), [tasksData]);

    const { data: project } = trpc.project.get.useQuery({ id: projectId as string }, { enabled: !!projectId });
    const resolvedWorkspaceId = space?.workspaceId || project?.workspaceId || undefined;
    const { data: workspace } = trpc.workspace.get.useQuery({ id: resolvedWorkspaceId as string }, { enabled: !!resolvedWorkspaceId });
    const { data: listsData } = trpc.list.byContext.useQuery({ spaceId, projectId, workspaceId: resolvedWorkspaceId }, { enabled: !!(spaceId || projectId || resolvedWorkspaceId) });

    const { data: customFields = [] } = trpc.customFields.list.useQuery(
        { workspaceId: resolvedWorkspaceId as string, applyTo: "TASK" },
        { enabled: !!resolvedWorkspaceId }
    );

    const { data: availableTaskTypes = [] } = trpc.task.listTaskTypes.useQuery({ workspaceId: resolvedWorkspaceId as string }, { enabled: !!resolvedWorkspaceId });
    const { data: me } = trpc.user.me.useQuery();
    const currentUserId = me?.id;

    const FIELD_CONFIG = useMemo(() => {
        const custom = (customFields || []).map((f: any) => ({
            id: f.id,
            label: f.name,
            icon: Tag, // Default icon for custom fields
            isCustom: true,
            type: f.type
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
        onMutate: async (variables) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await utils.task.list.cancel(taskListInput);

            // Snapshot the previous value
            const previousTasks = utils.task.list.getData(taskListInput);

            // Optimistically update to the new value
            if (previousTasks && (variables as any).tags) {
                utils.task.list.setData(taskListInput, (old: any) => {
                    if (!old) return old;
                    return {
                        ...old,
                        items: old.items.map((task: any) =>
                            task.id === variables.id
                                ? { ...task, tags: (variables as any).tags }
                                : task
                        ),
                    };
                });
            }

            return { previousTasks };
        },
        onError: (err, variables, context: any) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            if (context?.previousTasks) {
                utils.task.list.setData(taskListInput, context.previousTasks);
            }
        },
        onSettled: () => {
            // Always refetch after error or success:
            void utils.task.list.invalidate(taskListInput);
        },
    });
    const deleteTask = trpc.task.delete.useMutation({
        onSuccess: () => { void utils.task.list.invalidate(taskListInput); },
    });
    const createTask = trpc.task.create.useMutation({
        onSuccess: () => { void utils.task.list.invalidate(taskListInput); },
        onError: () => { void utils.task.list.invalidate(taskListInput); },
    });
    const duplicateTask = trpc.task.duplicate.useMutation({
        onSuccess: () => { void utils.task.list.invalidate(taskListInput); },
    });
    const bulkDuplicateTask = trpc.task.bulkDuplicate.useMutation({
        onSuccess: () => {
            void utils.task.list.invalidate(taskListInput);
            setSelectedTasks([]);
        },
    });

    const toggleColumn = (colId: string) => {
        setVisibleColumns(prev => {
            const next = new Set(prev);
            if (next.has(colId)) next.delete(colId);
            else next.add(colId);
            return next;
        });
    };
    const updateCustomField = trpc.task.customFields.update.useMutation({
        onSuccess: () => { void utils.task.list.invalidate(taskListInput); },
    });
    const updateList = trpc.list.update.useMutation({
        onSuccess: () => {
            void utils.list.get.invalidate({ id: listId as string });
            void utils.list.byContext.invalidate({ spaceId, projectId, workspaceId: resolvedWorkspaceId });
        }
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
        if (Array.isArray(cfg.visibleColumns) && cfg.visibleColumns.length) setVisibleColumns(new Set(cfg.visibleColumns));

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
            defaultToMeMode: typeof cfg.defaultToMeMode === "boolean" ? cfg.defaultToMeMode : defaultToMeMode,
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
        for (const m of workspace?.members ?? []) {
            const u = (m as any).user;
            if (u) map.set(u.id, { id: u.id, name: u.name || u.email || "Unknown", image: u.image, email: u.email });
        }
        return map;
    }, [workspace?.members]);

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

    // Auto-save effect when autosave is enabled
    useEffect(() => {
        if (!viewAutosave || !isViewDirty || !viewId) return;
        const timer = setTimeout(() => {
            void saveViewConfig(undefined, true);
        }, 1000); // Debounce 1 second
        return () => clearTimeout(timer);
    }, [viewAutosave, isViewDirty, viewId, currentViewConfig]);


    // Calculate date range
    const dateRange = useMemo(() => {
        const tasksWithAnyDate = tasks.filter(t => isValidDate(t.startDate) || isValidDate(t.dueDate));

        if (tasksWithAnyDate.length === 0) {
            const today = new Date();
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            const end = new Date(today.getFullYear(), today.getMonth() + 3, 0);
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

        return { start, end };
    }, [tasks, timeScale]);

    // Generate months for timeline
    const months = useMemo(() => {
        const result = [];
        const current = new Date(dateRange.start);

        while (current <= dateRange.end) {
            result.push({
                date: new Date(current),
                label: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            });
            current.setMonth(current.getMonth() + 1);
        }

        return result;
    }, [dateRange]);

    // Calculate task bar position and width
    const getTaskBarStyle = (task: Task) => {
        const hasStart = isValidDate(task.startDate);
        const hasEnd = isValidDate(task.dueDate);

        if (!hasStart && !hasEnd) return null;

        const start = hasStart ? new Date(task.startDate!) : new Date(task.dueDate!);
        const end = hasEnd ? new Date(task.dueDate!) : new Date(task.startDate!);

        const totalMs = dateRange.end.getTime() - dateRange.start.getTime();
        if (totalMs <= 0) return null;

        const startOffsetMs = start.getTime() - dateRange.start.getTime();
        const durationMs = Math.max(1000 * 60 * 60 * 24, end.getTime() - start.getTime()); // Minimum 1 day

        const leftPercent = (startOffsetMs / totalMs) * 100;
        const widthPercent = (durationMs / totalMs) * 100;

        return {
            left: `${Math.max(0, Math.min(100, leftPercent))}%`,
            width: `${Math.max(0.5, Math.min(100 - leftPercent, widthPercent))}%`,
        };
    };

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

    const tasksWithDates = useMemo(() => {
        return filteredTasks.filter(t => isValidDate(t.startDate) || isValidDate(t.dueDate));
    }, [filteredTasks]);


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
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                                        <Input
                                            placeholder="Search..."
                                            className="pl-8 h-8 text-xs border-zinc-200"
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
                    <ScrollArea className="p-5 text-sm h-[500px]">
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
                                                                                <DropdownMenuContent className="w-64 max-h-[400px] overflow-auto">
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
                                                                                                                <div className="relative">
                                                                                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                                                                                                                    <Input placeholder="Search people..." className="pl-8 h-8 text-[10px]" value={assigneesSearch} onChange={e => setAssigneesSearch(e.target.value)} />
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

    if (isLoading) {
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
        <div className="h-full flex flex-col bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden text-sm">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 bg-white gap-4 overflow-x-auto">
                {/* Left Side */}
                <div className="flex items-center gap-2.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:bg-zinc-100 rounded-lg">
                        <PanelLeft className="h-4 w-4" />
                    </Button>

                    <Button variant="outline" size="sm" className="h-8 text-[13px] font-bold text-zinc-600 border-zinc-200 shadow-none hover:bg-zinc-50 px-3.5 rounded-lg transition-colors">
                        Today
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 text-[13px] font-bold text-zinc-600 border-zinc-200 shadow-none hover:bg-zinc-50 gap-1.5 px-3 rounded-lg transition-colors">
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
                                    onClick={() => setTimeScale(scale as TimeScale)}
                                    className="flex items-center justify-between rounded-lg h-9 px-2 hover:bg-zinc-50 cursor-pointer"
                                >
                                    <span className="text-sm font-medium text-zinc-700">{scale}</span>
                                    {timeScale === scale && <Check className="h-4 w-4 text-zinc-900" />}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Right Side */}
                <div className="flex items-center gap-2 flex-1 justify-end">
                    <Button variant="outline" size="sm" className="h-8 text-[13px] font-bold text-zinc-600 border-zinc-200 shadow-none hover:bg-zinc-50 px-3.5 rounded-lg transition-colors">
                        Auto fit
                    </Button>

                    <Button variant="outline" size="sm" className="h-8 text-[13px] font-bold text-zinc-600 border-zinc-200 shadow-none hover:bg-zinc-50 gap-2 px-3.5 rounded-lg transition-colors mr-2">
                        <Download className="h-3.5 w-3.5" />
                        Export
                    </Button>
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
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "h-8 gap-2 px-3.5 text-[13px] font-bold border-zinc-200 transition-colors cursor-pointer rounded-lg shadow-none",
                                    expandedSubtaskMode === 'separate' ? "bg-violet-50 text-violet-700 border-violet-200" : "text-zinc-600 hover:bg-zinc-50"
                                )}
                            >
                                <Spline className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">
                                    {expandedSubtaskMode === 'separate' ? 'Separate' : 'Nested'}
                                </span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-[220px] p-2 rounded-xl shadow-xl border-zinc-200/60" sideOffset={8}>
                            <div className="space-y-1">
                                <div
                                    className={cn(
                                        "flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors",
                                        expandedSubtaskMode !== 'separate' ? "bg-zinc-50 text-zinc-900 font-bold" : "text-zinc-600 hover:bg-zinc-100"
                                    )}
                                    onClick={() => setExpandedSubtaskMode('expanded')}
                                >
                                    <span>Nested</span>
                                    {expandedSubtaskMode !== 'separate' && <Check className="h-4 w-4 text-zinc-900" />}
                                </div>
                                <div
                                    className={cn(
                                        "flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors",
                                        expandedSubtaskMode === 'separate' ? "bg-zinc-50 text-zinc-900 font-bold" : "text-zinc-600 hover:bg-zinc-100"
                                    )}
                                    onClick={() => setExpandedSubtaskMode('separate')}
                                >
                                    <span>Separate</span>
                                    {expandedSubtaskMode === 'separate' && <Check className="h-4 w-4 text-zinc-900" />}
                                </div>
                                <div className="px-3 pt-2 mt-1 border-t border-zinc-100">
                                    <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">Use this to filter subtasks</p>
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
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "h-8 gap-2 px-3.5 text-[13px] font-bold border-zinc-200 transition-colors cursor-pointer rounded-lg shadow-none",
                                    sort.length > 0 ? "bg-violet-50 text-violet-700 border-violet-200" : "text-zinc-600 hover:bg-zinc-50"
                                )}
                            >
                                <ArrowUpDown className="h-3.5 w-3.5" />
                                <span>Sort</span>
                                {sort.length > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] bg-violet-100 text-violet-700 border-none">{sort.length}</Badge>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-[240px] p-1.5 rounded-xl shadow-xl border-zinc-200/60" sideOffset={8}>
                            <div className="px-2 py-1.5 mb-1">
                                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Sort By</span>
                            </div>
                            <div className="space-y-0.5">
                                <div
                                    className="flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-zinc-50 transition-colors text-zinc-600"
                                    onClick={() => setSort([])}
                                >
                                    <span className="flex-1">None (default)</span>
                                    {sort.length === 0 && <Check className="h-3.5 w-3.5 text-zinc-900" />}
                                </div>

                                {[
                                    { id: "status", label: "Status" },
                                    { id: "name", label: "Task Name" },
                                    { id: "assignee", label: "Assignee" },
                                    { id: "priority", label: "Priority" },
                                    { id: "dueDate", label: "Due date" },
                                    { id: "startDate", label: "Start date" },
                                    { id: "createdAt", label: "Date created" },
                                    { id: "updatedAt", label: "Date updated" },
                                ].map((opt) => {
                                    const currentSortIndex = sort.findIndex(s => s.id === opt.id);
                                    const isSelected = currentSortIndex >= 0;
                                    const currentSort = isSelected ? sort[currentSortIndex] : null;

                                    return (
                                        <div
                                            key={opt.id}
                                            className={cn(
                                                "flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors group/item",
                                                isSelected ? "bg-zinc-50 text-zinc-900" : "text-zinc-600 hover:bg-zinc-100"
                                            )}
                                            onClick={() => {
                                                if (isSelected) {
                                                    setSort(s => s.filter(i => i.id !== opt.id));
                                                } else {
                                                    setSort(s => [...s, { id: opt.id, desc: false }]);
                                                }
                                            }}
                                        >
                                            <div
                                                className="h-5 w-5 flex items-center justify-center rounded hover:bg-zinc-200 transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isSelected) {
                                                        setSort(s => s.map(i => i.id === opt.id ? { ...i, desc: !i.desc } : i));
                                                    } else {
                                                        setSort(s => [...s, { id: opt.id, desc: false }]);
                                                    }
                                                }}
                                            >
                                                {isSelected &&
                                                    <div className="flex flex-col items-center -space-y-1">
                                                        <ChevronUp
                                                            className={`h-3.5 w-3.5 ${currentSort.desc
                                                                ? 'text-zinc-800'
                                                                : 'text-zinc-300'
                                                                }`}
                                                        />
                                                        <ChevronDown
                                                            className={`h-3.5 w-3.5 ${currentSort.desc
                                                                ? 'text-zinc-300'
                                                                : 'text-zinc-800'
                                                                }`}
                                                        />
                                                    </div>
                                                }
                                            </div>
                                            <span className="flex-1">{opt.label}</span>
                                            {isSelected && <Check className="h-3.5 w-3.5 text-zinc-900" />}
                                        </div>
                                    );
                                })}
                            </div>
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
                        <PopoverTrigger asChild>
                            <div className="relative group/filter inline-flex">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "h-8 text-[13px] font-bold pr-7 border-zinc-200 transition-colors cursor-pointer rounded-lg shadow-none",
                                        filtersPanelOpen ? "bg-violet-50 text-violet-700 border-violet-200" : "text-zinc-600 hover:bg-zinc-50",
                                        appliedFilterCount > 0 && "bg-violet-50 text-violet-700 border-violet-200"
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
                                className={cn(
                                    "h-8 gap-2 px-3.5 text-[13px] font-bold border-zinc-200 transition-colors cursor-pointer rounded-lg shadow-none",
                                    assigneesPanelOpen ? "bg-violet-50 text-violet-700 border-violet-200" : "text-zinc-600 hover:bg-zinc-50"
                                )}
                                onClick={() => { setAssigneesPanelOpen(!assigneesPanelOpen); setFieldsPanelOpen(false); setFiltersPanelOpen(false); }}
                            >
                                <Users className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Assignee</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Filter by assignee</TooltipContent>
                    </Tooltip>

                    <div className="h-4 w-px bg-zinc-200 mx-1" />

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
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-500 hover:bg-zinc-100 rounded-lg flex-shrink-0"
                            onClick={() => setIsSearchVisible(true)}
                        >
                            <Search className="h-4 w-4" />
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-2 text-[13px] font-bold text-zinc-600 hover:bg-zinc-50 px-3 rounded-lg flex-shrink-0"
                        onClick={() => setCustomizePanelOpen(true)}
                    >
                        <Settings className="h-3.5 w-3.5" />
                        Customize
                    </Button>

                    <div className="flex items-center gap-0 ml-1 flex-shrink-0">
                        <Button
                            className="h-8 bg-zinc-900 border-zinc-900 text-white hover:bg-black text-[13px] font-bold gap-1 px-3 rounded-lg shadow-sm"
                            onClick={() => setAddTaskModalOpen(true)}
                        >
                            <span>Add Task</span>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                    </div>
                </div>
            </div>

            {tasksWithDates.length === 0 ? (
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
                <div className="flex-1 flex overflow-hidden">
                    {/* Task Names Column */}
                    <div className="w-[480px] border-r border-zinc-200 bg-zinc-50/50 flex flex-col shrink-0">
                        <div className="h-10 border-b border-zinc-200 flex items-center px-4 font-bold text-[10px] text-zinc-500 uppercase tracking-widest bg-white">
                            <div className="flex-1">Name</div>
                            <div className="w-px h-10 bg-zinc-100 mx-4" />
                            <div className="w-[184px] px-4 flex items-center justify-between">
                                <span>Due date</span>
                                <Button variant="ghost" size="icon" className="h-5 w-5 text-zinc-300 hover:text-zinc-600 rounded-full border border-dashed border-zinc-300 flex-shrink-0">
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="divide-y divide-zinc-100">
                                {tasksWithDates.map((task) => (
                                    <div key={task.id} className="h-12 px-0 flex items-center hover:bg-zinc-100/50 transition-colors cursor-pointer bg-white group" onClick={() => onTaskSelect?.(task.id)}>
                                        <div className="flex-1 flex items-center gap-2 px-4 truncate">
                                            <div className={cn("h-2 w-2 rounded-full flex-shrink-0", getPriorityColor(task.priority))} />
                                            <span className="text-sm text-zinc-900 truncate font-medium">{task.title || task.name}</span>
                                        </div>
                                        <div className="w-px h-12 bg-zinc-100" />
                                        <div className="w-[184px] px-4 flex items-center justify-between">
                                            <span className="text-xs text-zinc-500 font-medium">
                                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "-"}
                                            </span>
                                            <TooltipProvider delayDuration={0}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-zinc-600">
                                                            <Plus className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right">Edit dates</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Timeline Column */}
                    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                        <ScrollArea className="flex-1 w-full">
                            <div className="min-w-fit w-full">
                                {/* Month Headers */}
                                <div className="h-10 border-b border-zinc-200 bg-white flex sticky top-0 z-10 shadow-sm">
                                    {months.map((month, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 min-w-[200px] px-4 flex items-center justify-center border-r border-zinc-100 text-xs font-semibold text-zinc-600"
                                        >
                                            {month.label}
                                        </div>
                                    ))}
                                </div>

                                {/* Timeline Bars Grid */}
                                <div className="relative">
                                    {/* Vertical Day Grid Lines (Visual) */}
                                    <div className="absolute inset-0 flex pointer-events-none">
                                        {months.map((_, i) => (
                                            <div key={i} className="flex-1 min-w-[200px] border-r border-zinc-100/50 h-full" />
                                        ))}
                                    </div>

                                    {tasksWithDates.map((task, idx) => {
                                        const barStyle = getTaskBarStyle(task);
                                        if (!barStyle) return null;

                                        return (
                                            <div
                                                key={task.id}
                                                className="h-12 border-b border-zinc-100 relative hover:bg-zinc-50/50 transition-colors group"
                                                onClick={() => onTaskSelect?.(task.id)}
                                            >
                                                <div
                                                    className={cn(
                                                        "absolute top-2 h-8 rounded-md px-2 flex items-center text-xs text-white font-medium shadow-sm transition-all hover:scale-[1.02] cursor-pointer z-10",
                                                        getStatusColor(task.status?.name)
                                                    )}
                                                    style={barStyle}
                                                    title={`${task.title || task.name} (${task.startDate ? new Date(task.startDate).toLocaleDateString() : ''} - ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ''})`}
                                                >
                                                    {showTaskNames && <span className="truncate">{task.title || task.name}</span>}
                                                    {showAssignees && task.assignee && (
                                                        <Avatar className="h-5 w-5 ml-2 border-white ring-1 ring-white/20">
                                                            <AvatarImage src={task.assignee.image} />
                                                            <AvatarFallback className="text-[8px] bg-white/20 text-white">{task.assignee.name?.slice(0, 1)}</AvatarFallback>
                                                        </Avatar>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </div>
                </div>

            )
            }
            {
                customizePanelOpen && !layoutOptionsOpen && (
                    <>
                        <div className="absolute inset-0 bg-black/20 z-40" onClick={() => setCustomizePanelOpen(false)} aria-hidden />
                        <div className="absolute bottom-0 right-0 h-full w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col">
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
                                        <div className="flex items-center justify-between py-1 px-2">
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
                                            className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2"
                                            onClick={() => { setLayoutOptionsOpen(true); }}
                                        >
                                            <span className="flex items-center gap-2">More options</span>
                                            <ChevronRight className="inline h-3 w-3 ml-1 text-zinc-400" />
                                        </button>
                                    </div>
                                    <div className="h-px bg-zinc-100 my-2" />
                                    <div className="space-y-1">
                                        <button type="button" className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2" onClick={() => { setFieldsPanelOpen(true); setCustomizePanelOpen(false); }}>
                                            <span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-zinc-400" />Fields</span>
                                            <span className="text-xs text-zinc-500">{Array.from(visibleColumns).length} shown</span>
                                        </button>
                                        <Popover open={customizeViewFilterOpen} onOpenChange={setCustomizeViewFilterOpen}>
                                            <PopoverTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2"
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
                                    </div>
                                    <div className="h-px bg-zinc-100 my-2" />
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
                                            className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2"
                                            onClick={() => setIsShareModalOpen(true)}
                                        >
                                            <span className="flex items-center gap-2"><Users className="h-4 w-4 text-zinc-400" />Sharing & Permissions</span>
                                            <ChevronRight className="inline h-3 w-3 ml-1 text-zinc-400" />
                                        </button>
                                    </div>
                                </div>
                            </ScrollArea>
                        </div>
                    </>
                )
            }
            {
                layoutOptionsOpen && (
                    <>
                        <div className="absolute inset-0 bg-black/20 z-40" onClick={() => setCustomizePanelOpen(false)} aria-hidden />
                        <div className="absolute bottom-0 right-0 h-full w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col">
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

                                        <div className="flex items-center justify-between py-1 px-2">
                                            <span className="text-sm text-zinc-800">Show weekends</span>
                                            <Switch checked={showWeekends} onCheckedChange={setShowWeekends} />
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
                                        <div className="flex items-center justify-between py-1 px-2">
                                            <span className="text-sm text-zinc-800">Hide empty locations</span>
                                            <Switch checked={hideEmptyLocations} onCheckedChange={setHideEmptyLocations} />
                                        </div>
                                        <div className="flex items-center justify-between py-1 px-2">
                                            <span className="text-sm text-zinc-800">Show assignees</span>
                                            <Switch checked={showAssignees} onCheckedChange={setShowAssignees} />
                                        </div>
                                        <div className="flex items-center justify-between py-1 px-2">
                                            <span className="text-sm text-zinc-800">Show task names</span>
                                            <Switch checked={showTaskNames} onCheckedChange={setShowTaskNames} />
                                        </div>
                                        <div className="flex items-center justify-between py-1 px-2">
                                            <span className="text-sm text-zinc-800">Show tags</span>
                                            <Switch checked={showTags} onCheckedChange={setShowTags} />
                                        </div>
                                    </div>

                                    <div className="h-px bg-zinc-100" />

                                    <div className="space-y-1">
                                        <p className="px-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Task visibility</p>
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
                        </div>
                    </>
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

            {fieldsPanelOpen && !createFieldModalOpen && (
                <>
                    <div className="absolute inset-0 bg-black/20 z-40" onClick={() => setFieldsPanelOpen(false)} aria-hidden />
                    <div className="absolute right-0 bottom-0 top-0 w-[360px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col">
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
                                    <button type="button" className="text-xs text-violet-600 hover:underline cursor-pointer" onClick={() => setVisibleColumns(new Set())}>Hide all</button>
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
                                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium cursor-pointer"
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

            {
                createFieldModalOpen && (
                    <>
                        <div className="absolute inset-0 bg-black/20 z-[60]" onClick={() => { setCreateFieldModalOpen(false); setCreateFieldSearch(""); }} aria-hidden />
                        <div className="absolute right-0 bottom-0 top-0 w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-[70] flex flex-col">
                            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 -ml-1 cursor-pointer"
                                    onClick={() => {
                                        setCreateFieldModalOpen(false);
                                        setCreateFieldSearch("");
                                        setFieldsPanelOpen(true);
                                    }}
                                >
                                    <ArrowRight className="h-4 w-4 rotate-180" />
                                </Button>
                                <h3 className="font-semibold text-zinc-900">Create field</h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={() => { setCreateFieldModalOpen(false); setCreateFieldSearch(""); }}><X className="h-4 w-4" /></Button>
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
                                            <button key={f.id} type="button" className="w-full flex items-center gap-2 py-2.5 px-2 rounded-md hover:bg-zinc-50 text-left text-sm text-zinc-800 cursor-pointer" onClick={() => {
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
                                    className="w-full justify-center text-zinc-900 border-zinc-200 hover:bg-zinc-50 font-medium h-10 cursor-pointer"
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
                )
            }

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