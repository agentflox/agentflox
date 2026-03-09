"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ChevronLeft, ChevronRight, Plus, Filter, Settings, Users, Clock, Search, Layout,
    ChevronDown, MoreHorizontal, Calendar as CalendarIcon, CheckCircle2, X,
    ListFilter, ArrowUpDown, Settings2, User, Check, ChevronsUpDown, CalendarDays,
    MoreVertical, AlertCircle, Clock3, Ban, BarChart3, PanelRight, ChevronUp, UserRound,
    Maximize2, PlusCircle, LayoutList, Pin, Trash2, Info, MapPin, CalendarRange, Star, Lock, EyeOff, Save, Tag,
    Circle, Flag, Box, Calendar, GripVertical, SlidersHorizontal, ArrowRight,
    Type, Hash, CheckSquare, AlignLeft, Target, Mail, Phone, Globe, DollarSign, FunctionSquare,
    Paperclip, Link2, ListTodo, TrendingUp, FileText, MessageSquare, Heart
} from "lucide-react";
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
import { TaskDetailModal } from "@/entities/task/components/TaskDetailModal";
import { ViewToolbarSaveDropdown } from "@/features/dashboard/components/shared/ViewToolbarSaveDropdown";
import { ViewToolbarClosedPopover } from "@/features/dashboard/components/shared/ViewToolbarClosedPopover";
import { ShareViewPermissionModal } from "@/features/dashboard/components/shared/ShareViewPermissionModal";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addDays, subDays, startOfDay, endOfDay, isToday as isTodayFns, isSameDay, getWeek, startOfWeek, endOfWeek, differenceInDays } from "date-fns";
import { FILTER_OPTIONS, FIELD_OPERATORS, STANDARD_FIELD_CONFIG } from "./listViewConstants";
import { evaluateGroup, hasFilterValue, hasAnyValueInGroup, evaluateCondition } from "./filterUtils";
import type { FilterGroup, FilterCondition } from "./listViewTypes";

interface WorkloadViewProps {
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    listId?: string;
    viewId?: string;
    onTaskSelect?: (taskId: string | null) => void;
}

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

type WorkloadMetric = "tasks" | "time_estimate" | "sprint_points";
type Timeframe = "7" | "14" | "30";

export function WorkloadView({ spaceId, projectId, teamId, listId, viewId, onTaskSelect }: WorkloadViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const utils = trpc.useUtils();

    // Workload Specific State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [timeframe, setTimeframe] = useState<Timeframe>("14");
    const [workloadMetric, setWorkloadMetric] = useState<WorkloadMetric>("time_estimate");
    const [groupBy, setGroupBy] = useState("assignee");
    const [groupDirection, setGroupDirection] = useState<"asc" | "desc">("asc");
    const [isBacklogOpen, setIsBacklogOpen] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // View Meta State (Parity)
    const [viewAutosave, setViewAutosave] = useState(false);
    const [pinView, setPinView] = useState(false);
    const [privateView, setPrivateView] = useState(false);
    const [protectView, setProtectView] = useState(false);
    const [defaultView, setDefaultView] = useState(false);
    const [viewNameDraft, setViewNameDraft] = useState("");
    const [showCompleted, setShowCompleted] = useState(false);
    const [showCompletedSubtasks, setShowCompletedSubtasks] = useState(false);
    const [showTaskLocations, setShowTaskLocations] = useState(false);
    const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
    const [fieldsPanelOpen, setFieldsPanelOpen] = useState(false);
    const [fieldsSearch, setFieldsSearch] = useState("");
    const [createFieldModalOpen, setCreateFieldModalOpen] = useState(false);
    const [createFieldSearch, setCreateFieldSearch] = useState("");
    const [assigneesPanelOpen, setAssigneesPanelOpen] = useState(false);
    const [assigneesSearch, setAssigneesSearch] = useState("");
    const [customizePanelOpen, setCustomizePanelOpen] = useState(false);
    const [layoutOptionsOpen, setLayoutOptionsOpen] = useState(false);
    const [customizeViewFilterOpen, setCustomizeViewFilterOpen] = useState(false);
    const [customizeViewGroupOpen, setCustomizeViewGroupOpen] = useState(false);
    const [customizeViewSubtasksOpen, setCustomizeViewSubtasksOpen] = useState(false);
    const [expandedSubtaskMode, setExpandedSubtaskMode] = useState<"collapsed" | "expanded" | "separate">("collapsed");
    const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
    const [filterAssignee, setFilterAssignee] = useState<string[]>([]);
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
        new Set(["name", "status", "assignee", "priority", "dueDate", "tags"])
    );
    const [wrapText, setWrapText] = useState(false);
    const [showSubtaskParentNames, setShowSubtaskParentNames] = useState(false);
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

    const [customizeMenuOpen, setCustomizeMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [filterGroups, setFilterGroups] = useState<FilterGroup>(() => ({
        id: "root",
        operator: "AND",
        conditions: [],
    }));

    // Data Fetching
    const updateViewMutation = trpc.view.update.useMutation();
    const createViewMutation = trpc.view.create.useMutation();
    const { data: viewData } = trpc.view.get.useQuery({ id: viewId as string }, { enabled: !!viewId });
    const { data: space } = trpc.space.get.useQuery({ id: spaceId as string }, { enabled: !!spaceId });
    const { data: project } = trpc.project.get.useQuery({ id: projectId as string }, { enabled: !!projectId });
    const resolvedWorkspaceId = space?.workspaceId || project?.workspaceId || undefined;

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
                if (cfg.groupBy) setGroupBy(cfg.groupBy);
                if (cfg.groupDirection) setGroupDirection(cfg.groupDirection);
                if (typeof cfg.showCompleted === "boolean") setShowCompleted(cfg.showCompleted);
                if (typeof cfg.showCompletedSubtasks === "boolean") setShowCompletedSubtasks(cfg.showCompletedSubtasks);
                if (typeof cfg.showTaskLocations === "boolean") setShowTaskLocations(cfg.showTaskLocations);
                if (cfg.filterGroups) setFilterGroups(cfg.filterGroups);
            }
        }
    }, [viewData]);

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
        try {
            await updateViewMutation.mutateAsync({ id: viewId, name: newName.trim() });
            void utils.view.get.invalidate({ id: viewId });
        } catch (e) { }
    };

    const isViewDirty = useMemo(() => {
        if (!viewData) return false;
        const currentCfg = {
            workloadView: {
                viewAutosave,
                timeframe,
                workloadMetric,
                showCompleted,
                showCompletedSubtasks,
                showTaskLocations,
                groupBy,
                groupDirection,
                filterGroups
            }
        };
        return JSON.stringify(currentCfg) !== JSON.stringify(viewData.config);
    }, [viewData, viewAutosave, timeframe, workloadMetric, showCompleted, showCompletedSubtasks, showTaskLocations, groupBy, groupDirection, filterGroups]);

    const saveViewConfig = async (isAutosave = false) => {
        if (!viewId) return;
        const config = {
            workloadView: {
                viewAutosave: isAutosave ? true : viewAutosave,
                timeframe,
                workloadMetric,
                showCompleted,
                showCompletedSubtasks,
                showTaskLocations,
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

    const saveAsNewView = async (name: string) => {
        // Implementation for save as new view
        toast.info("Save as new view not fully implemented in this demo");
    };

    const revertViewChanges = () => {
        if (!viewData) return;
        const cfg = (viewData.config as any)?.workloadView;
        if (cfg) {
            if (cfg.timeframe) setTimeframe(cfg.timeframe);
            if (cfg.workloadMetric) setWorkloadMetric(cfg.workloadMetric);
            if (typeof cfg.showCompleted === "boolean") setShowCompleted(cfg.showCompleted);
            if (typeof cfg.showCompletedSubtasks === "boolean") setShowCompletedSubtasks(cfg.showCompletedSubtasks);
            if (typeof cfg.showTaskLocations === "boolean") setShowTaskLocations(cfg.showTaskLocations);
            if (cfg.groupBy) setGroupBy(cfg.groupBy);
            if (cfg.groupDirection) setGroupDirection(cfg.groupDirection);
            if (cfg.filterGroups) setFilterGroups(cfg.filterGroups);
        }
    };

    const { data: tasksData, isLoading } = trpc.task.list.useQuery({
        spaceId, projectId, teamId, listId,
        includeRelations: true,
        page: 1,
        pageSize: 1000,
    }, { enabled: !!(spaceId || projectId || teamId || listId) });

    const tasks = useMemo(() => (tasksData?.items || []) as any[], [tasksData]);

    const { data: projectParticipants } = trpc.project.getParticipants.useQuery({ projectId: projectId as string }, { enabled: !!projectId });
    const { data: teamParticipants } = trpc.team.getParticipants.useQuery({ teamId: teamId as string }, { enabled: !!teamId });
    const users = useMemo(() => {
        const combined = [...(projectParticipants || []), ...(teamParticipants || [])];
        const unique = new Map();
        combined.forEach(u => unique.set(u.id, u));
        return Array.from(unique.values());
    }, [projectParticipants, teamParticipants]);

    const { data: customFields = [] } = trpc.customFields.list.useQuery(
        { workspaceId: resolvedWorkspaceId as string, applyTo: "TASK" },
        { enabled: !!resolvedWorkspaceId }
    );

    const FIELD_CONFIG = useMemo(() => {
        const custom = (customFields || []).map((f: any) => ({
            id: f.id, label: f.name, icon: Tag, isCustom: true, type: f.type
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

    // Filtering logic parity
    const [savedFiltersPanelOpen, setSavedFiltersPanelOpen] = useState(false);
    const [savedFilterName, setSavedFilterName] = useState("");
    const [savedFiltersSearch, setSavedFiltersSearch] = useState("");
    const [savedFilters, setSavedFilters] = useState<{ id: string, name: string, config: FilterGroup }[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('agentflox_saved_filters_workload');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

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

    const addFilterCondition = (groupId: string) => {
        const addRecursive = (group: FilterGroup): FilterGroup => {
            if (group.id === groupId) return { ...group, conditions: [...group.conditions, { id: Math.random().toString(36).substring(7), field: "status", operator: "is", value: [] }] };
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

    const saveNewFilter = useCallback(() => {
        if (!savedFilterName.trim()) return;
        const newFilter = { id: Math.random().toString(36).substring(7), name: savedFilterName.trim(), config: JSON.parse(JSON.stringify(filterGroups)) };
        setSavedFilters(prev => {
            const next = [...prev, newFilter];
            localStorage.setItem("agentflox_saved_filters_workload", JSON.stringify(next));
            return next;
        });
        setSavedFilterName("");
    }, [savedFilterName, filterGroups]);

    const deleteSavedFilter = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSavedFilters(prev => {
            const next = prev.filter(f => f.id !== id);
            localStorage.setItem("agentflox_saved_filters_workload", JSON.stringify(next));
            return next;
        });
    }, []);

    const appliedFilterCount = useMemo(() => {
        if (filterGroups.conditions.length === 0) return 0;
        return filterGroups.conditions.filter(c => ("conditions" in c ? hasAnyValueInGroup(c as FilterGroup) : hasFilterValue(c as FilterCondition))).length;
    }, [filterGroups]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            if (!showCompleted && task.status?.type === 'CLOSED') return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchesSearch = (task.title || task.name || "").toLowerCase().includes(q) || (task.id || "").toLowerCase().includes(q);
                if (!matchesSearch) return false;
            }
            return filterGroups.conditions.length > 0 ? evaluateGroup(task, filterGroups, customFields) : true;
        });
    }, [tasks, filterGroups, customFields, showCompleted, searchQuery]);
    const allAvailableStatus = useMemo(() => {
        // Mock status list - normally fetched from list/project context
        const statuses = new Map();
        tasks.forEach(t => {
            if (t.status) statuses.set(t.status.id, t.status);
        });
        return Array.from(statuses.values());
    }, [tasks]);

    const allGroups = useMemo(() => {
        if (groupBy === 'assignee') {
            return users.map(u => ({ id: u.id, name: u.name, image: u.image, type: 'user' }));
        }
        if (groupBy === 'status') {
            const groups = Array.from(new Set(tasks.map(t => t.status?.id).filter(Boolean))).map(id => {
                const status = tasks.find(t => t.status?.id === id)?.status;
                return { id: status?.id || 'no-status', name: status?.name || 'No Status', color: status?.color, type: 'status' };
            });
            return [...groups, { id: 'unassigned', name: 'No Status', type: 'status' }];
        }
        if (groupBy === 'priority') {
            return ['urgen', 'high', 'normal', 'low', 'none'].map(p => ({ id: p, name: p.charAt(0).toUpperCase() + p.slice(1), type: 'priority' }));
        }
        if (groupBy === 'tags') {
            const tags = new Set<string>();
            tasks.forEach(t => (t.tags || []).forEach((tag: string) => tags.add(tag)));
            const sortedTags = Array.from(tags).sort();
            return [...sortedTags.map(tag => ({ id: tag, name: tag, type: 'tag' })), { id: 'no-tags', name: 'No tags', type: 'tag' }];
        }
        // Default or other groupings
        return users.map(u => ({ id: u.id, name: u.name, image: u.image, type: 'user' }));
    }, [groupBy, users, tasks, allAvailableStatus]);

    // Workload logic
    const timelineDays = useMemo(() => {
        const start = startOfWeek(currentDate, { weekStartsOn: 0 });
        return Array.from({ length: parseInt(timeframe) }, (_, i) => addDays(start, i));
    }, [currentDate, timeframe]);

    const calculateWorkload = (groupValue: string, date: Date) => {
        const dayStart = startOfDay(date);

        const dayTasks = filteredTasks.filter(t => {
            // Check if task falls on this day
            if (!t.dueDate && !t.startDate) return false;
            const tStart = t.startDate ? startOfDay(new Date(t.startDate)) : startOfDay(new Date(t.dueDate));
            const tEnd = startOfDay(new Date(t.dueDate));
            if (dayStart < tStart || dayStart > tEnd) return false;

            // Check group membership
            if (groupBy === 'assignee') {
                return (t.assignees || []).some((a: any) => a.user.id === groupValue) ||
                    (t.assigneeId === groupValue) ||
                    (groupValue === 'unassigned' && (!t.assignees || t.assignees.length === 0) && !t.assigneeId);
            }
            if (groupBy === 'status') {
                return (t.status?.id === groupValue) || (groupValue === 'unassigned' && !t.status);
            }
            if (groupBy === 'tags') {
                if (groupValue === 'no-tags') return (!t.tags || t.tags.length === 0);
                return (t.tags || []).includes(groupValue);
            }
            if (groupBy === 'priority') {
                const p = t.priority || 'none';
                return p === groupValue;
            }

            return false;
        });

        const count = dayTasks.length;

        let metricValue = 0;
        if (workloadMetric === 'tasks') metricValue = count;
        else if (workloadMetric === 'time_estimate') {
            metricValue = dayTasks.reduce((acc, t) => {
                const estimate = t.timeEstimate || 0; // ms or minutes? Assuming Hours based on prop usage
                // Assuming timeEstimate is in milliseconds for calculations usually, but UI says "0h". 
                // Determine if backend sends ms or hours. Usually ms.
                // Let's assume input generic number for now, if it's ms, we convert.
                // But looking at "0h" it implies hours. 
                // IF logic assumes values are clean:

                const tStart = t.startDate ? startOfDay(new Date(t.startDate)) : startOfDay(new Date(t.dueDate));
                const tEnd = startOfDay(new Date(t.dueDate));
                const daysSpanned = Math.max(1, differenceInDays(tEnd, tStart) + 1);

                // Daily Scheduled distribution (Linear)
                return acc + (estimate / daysSpanned); // TODO: check unit
            }, 0);
        }

        return { value: metricValue, count };
    };

    const toggleGroup = (groupId: string) => {
        const newCollapsed = new Set(collapsedGroups);
        newCollapsed.has(groupId) ? newCollapsed.delete(groupId) : newCollapsed.add(groupId);
        setCollapsedGroups(newCollapsed);
    };

    const navigate = (direction: number) => setCurrentDate(addDays(currentDate, direction * 7));

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
            <div className="h-full flex items-center justify-center bg-white rounded-xl border border-zinc-200 p-20">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-800" />
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Loading Workload...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden text-[13px] relative font-sans">
            {/* Primary Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 bg-white min-h-[52px] gap-4 z-50">
                <div className="flex items-center gap-2.5">
                    <Button variant="outline" size="sm" className="h-8 font-black text-zinc-600 border-zinc-200 shadow-none hover:bg-zinc-50 px-3.5 rounded-lg" onClick={() => setCurrentDate(new Date())}>Today</Button>

                    <div className="h-6 w-[1px] bg-zinc-200 mx-1" />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 font-black text-zinc-600 border-zinc-200 shadow-none hover:bg-zinc-50 gap-2 px-3 rounded-lg capitalize">
                                {workloadMetric === 'time_estimate' ? 'Time Estimates' : 'Task Count'}
                                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                            <DropdownMenuItem onClick={() => setWorkloadMetric('tasks')}>Task Count</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setWorkloadMetric('time_estimate')}>Time Estimates</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 font-black text-zinc-600 border-zinc-200 shadow-none hover:bg-zinc-50 gap-2 px-3 rounded-lg">
                                {timeframe} days <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-32">
                            {["7", "14", "30"].map(t => <DropdownMenuItem key={t} onClick={() => setTimeframe(t as Timeframe)}>{t} days</DropdownMenuItem>)}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            "h-8 gap-1.5 px-2.5 text-xs font-black border-zinc-200 transition-colors cursor-pointer rounded-lg",
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
                                <span className="text-[11px] font-black text-zinc-400 uppercase tracking-wider">Group by</span>
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
                                        <span className="flex-1 font-bold">{opt.label}</span>
                                        {groupBy === opt.id && <div className="h-1.5 w-1.5 rounded-full bg-violet-600" />}
                                    </DropdownMenuItem>
                                ))}

                                {FIELD_CONFIG.filter(f => f.isCustom).length > 0 && (
                                    <>
                                        <DropdownMenuSeparator className="my-1.5 bg-zinc-100" />
                                        <div className="px-2 py-1.5 mb-0.5">
                                            <span className="text-[11px] font-black text-zinc-400 uppercase tracking-wider">Custom Fields</span>
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
                                                    <span className="flex-1 truncate font-bold">{f.label}</span>
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
                                                className={cn("flex-1 h-7 text-[10px] uppercase tracking-wider font-black", groupDirection === "asc" ? "bg-white shadow-sm border border-zinc-200 text-zinc-900" : "text-zinc-500")}
                                                onClick={() => setGroupDirection("asc")}
                                            >
                                                Ascending
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={cn("flex-1 h-7 text-[10px] uppercase tracking-wider font-black", groupDirection === "desc" ? "bg-white shadow-sm border border-zinc-200 text-zinc-900" : "text-zinc-500")}
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
                                    <span className="flex-1 font-bold">Remove grouping</span>
                                </DropdownMenuItem>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="flex items-center gap-2">
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

                    <Popover open={filtersPanelOpen} onOpenChange={setFiltersPanelOpen}>
                        <PopoverTrigger asChild>
                            <div className="relative group/filter inline-flex">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "h-8 gap-2 px-3.5 font-black border-zinc-200 shadow-none rounded-lg",
                                        appliedFilterCount > 0 && "bg-violet-50 text-violet-700 border-violet-200"
                                    )}
                                >
                                    <Filter className="h-3.5 w-3.5" /> Filter
                                    {appliedFilterCount > 0 && (
                                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-violet-100 text-violet-700 border-none">
                                            {appliedFilterCount}
                                        </Badge>
                                    )}
                                </Button>
                                {appliedFilterCount > 0 && (
                                    <div
                                        className="absolute -right-1 -top-1 h-4 w-4 bg-violet-600 text-white rounded-full flex items-center justify-center text-[10px] cursor-pointer shadow-lg border-2 border-white"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFilterGroups({ id: "root", operator: "AND", conditions: [] });
                                        }}
                                    >
                                        <X className="h-2.5 w-2.5" />
                                    </div>
                                )}
                            </div>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-[600px] p-0 overflow-hidden shadow-2xl rounded-2xl border border-zinc-200/80">
                            {renderFilterContent({ onClose: () => setFiltersPanelOpen(false) })}
                        </PopoverContent>
                    </Popover>

                    <ViewToolbarClosedPopover
                        showCompleted={showCompleted}
                        showCompletedSubtasks={showCompletedSubtasks}
                        onShowCompletedChange={setShowCompleted}
                        onShowCompletedSubtasksChange={setShowCompletedSubtasks}
                    />

                    <div className="flex items-center gap-2 pl-2 border-l border-zinc-200">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 gap-2 px-3 font-medium text-xs">
                                    {workloadMetric === 'time_estimate' ? 'Time Estimates' : workloadMetric === 'sprint_points' ? 'Sprint Points' : 'Tasks'}
                                    <ChevronDown className="h-3 w-3 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => setWorkloadMetric('time_estimate')}>Time Estimates</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setWorkloadMetric('tasks')}>Tasks</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setWorkloadMetric('sprint_points')}>Sprint Points</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 gap-2 px-3 font-medium text-xs">
                                    {timeframe} days
                                    <ChevronDown className="h-3 w-3 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => setTimeframe("7")}>7 days</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTimeframe("14")}>14 days</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTimeframe("30")}>30 days</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 gap-2 px-3 font-medium text-xs">
                                    Daily Scheduled
                                    <ChevronDown className="h-3 w-3 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem>Daily Scheduled</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="h-6 w-[1px] bg-zinc-200 mx-1" />

                    <div className="relative group/search">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 group-focus-within/search:text-zinc-600" />
                        <Input
                            placeholder="Search..."
                            className="h-8 w-40 pl-8 text-xs bg-zinc-50/50 border-zinc-200 focus:bg-white focus:w-60 transition-all rounded-lg font-black"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn("h-8 text-xs font-medium", assigneesPanelOpen ? "bg-violet-50 text-violet-700 border-violet-200" : "text-zinc-700 border-zinc-200")}
                                onClick={() => { setAssigneesPanelOpen(!assigneesPanelOpen); setFieldsPanelOpen(false); setFiltersPanelOpen(false); }}
                            >
                                <Users className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline ml-1">Assignee</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Filter by assignee</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-medium text-zinc-700 border-zinc-200"
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
                                disabled={isCreateModalOpen}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Add Task</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Add new task</TooltipContent>
                    </Tooltip>

                    <div className="flex items-center rounded-lg overflow-hidden border border-zinc-900 ml-1 shadow-sm hidden">
                        <Button className="h-8 bg-zinc-900 text-white hover:bg-black font-black px-4 rounded-none border-r border-white/10" onClick={() => setIsCreateModalOpen(true)}>Add Task</Button>
                        <Button size="icon" className="h-8 w-8 bg-zinc-900 text-white hover:bg-black rounded-none transition-colors"><ChevronDown className="h-3.5 w-3.5" /></Button>
                    </div>

                    <Button variant={isBacklogOpen ? "default" : "outline"} size="sm" className={cn("h-8 gap-2 px-3 font-black rounded-lg ml-2 transition-all", isBacklogOpen ? "bg-zinc-900 text-white shadow-md" : "text-zinc-600 border-zinc-200")} onClick={() => setIsBacklogOpen(!isBacklogOpen)}>
                        <LayoutList className="h-4 w-4" /> Backlog
                    </Button>
                </div>
            </div>

            {/* Sub-Header Navigation */}
            <div className="flex items-center px-4 py-2 border-b border-zinc-100 bg-white min-h-[44px]">
                <div className="flex items-center gap-4">
                    <span className="text-[12px] font-black text-zinc-500 tabular-nums">
                        {format(timelineDays[0], 'MMM d')} - {format(timelineDays[timelineDays.length - 1], 'MMM d')}
                    </span>
                    <div className="flex items-center gap-1.5 ml-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-900 rounded-md" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-900 rounded-md" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                    <div className="h-4 w-[1px] bg-zinc-200" />
                    <h3 className="text-[14px] font-black text-zinc-800 tracking-tight">{format(currentDate, 'MMMM yyyy')}</h3>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 rounded-lg hover:bg-zinc-50"><PlusCircle className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 rounded-lg hover:bg-zinc-50"><Maximize2 className="h-4 w-4" /></Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <ScrollArea className="flex-1" orientation="both">
                    <div className="flex flex-col min-w-max h-full">
                        {/* Header Grid */}
                        <div className="sticky top-0 z-30 flex border-b border-zinc-100 bg-white shadow-sm">
                            <div className="w-[240px] shrink-0 border-r border-zinc-100 bg-zinc-50/20" />
                            <div className="flex flex-1">
                                {timelineDays.map((date, i) => {
                                    const isCurrent = isTodayFns(date);
                                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                    return (
                                        <div key={i} className={cn("flex flex-col items-center justify-center py-2 min-w-[80px] border-r border-zinc-100 relative", isWeekend && "bg-zinc-50/50")}>
                                            <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] mb-0.5", isCurrent ? "text-violet-600" : "text-zinc-400")}>{format(date, 'eee').charAt(0)}</span>
                                            <span className={cn("text-[14px] font-black h-8 w-8 flex items-center justify-center rounded-xl transition-all", isCurrent ? "bg-violet-600 text-white shadow-lg ring-2 ring-violet-200" : "text-zinc-700")}>{format(date, 'd')}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>



                        {/* Generic Groups Section */}
                        {allGroups.map((group) => (
                            <div key={group.id} className="flex flex-col">
                                <div className="flex items-center h-12 border-b border-zinc-100 bg-white group cursor-pointer hover:bg-zinc-50/30 transition-colors" onClick={() => toggleGroup(group.id)}>
                                    <div className="w-[240px] shrink-0 border-r border-zinc-100 px-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {group.image ? (
                                                <Avatar className="h-8 w-8 border border-zinc-100 shadow-md">
                                                    <AvatarImage src={group.image} />
                                                    <AvatarFallback className="text-[11px] font-black bg-zinc-100 text-zinc-500">{group.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                            ) : (
                                                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center bg-zinc-100 text-zinc-500 font-bold text-xs uppercase", group.color ? `bg-[${group.color}] text-white` : "")}>
                                                    {group.type === 'tag' ? <Tag className="h-4 w-4" /> : group.name?.slice(0, 1)}
                                                </div>
                                            )}
                                            <h4 className="font-black text-zinc-900 tracking-tight truncate max-w-[120px]">{group.name}</h4>
                                        </div>
                                        <ChevronUp className={cn("h-4 w-4 text-zinc-400 transition-transform", collapsedGroups.has(group.id) && "rotate-180")} />
                                    </div>
                                    <div className="flex flex-1" />
                                </div>

                                {!collapsedGroups.has(group.id) && (
                                    <div className="flex border-b border-zinc-100 min-h-[92px]">
                                        <div className="w-[240px] shrink-0 border-r border-zinc-100 bg-zinc-50/10 flex items-center justify-end px-4">
                                            <div className="h-8 px-2 rounded-md bg-zinc-200/50 flex items-center justify-center text-xs font-bold text-zinc-500 tabular-nums">
                                                {/* Optional: Show row total here */}
                                                --
                                            </div>
                                        </div>
                                        <div className="flex flex-1">
                                            {timelineDays.map((date, i) => {
                                                const { value, count } = calculateWorkload(group.id, date);
                                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                                const isOverloaded = value > 8; // Capacity check
                                                return (
                                                    <div key={i} className={cn("min-w-[80px] border-r border-zinc-100 flex items-center justify-center relative", isWeekend && "bg-zinc-50/50")}>
                                                        {value > 0 || count > 0 ? (
                                                            <div className={cn("h-10 w-16 rounded-md border flex items-center justify-center font-bold text-[13px] transition-all relative group/cell",
                                                                isOverloaded ? "bg-red-50 border-red-200 text-red-600" : "bg-zinc-100 border-zinc-200 text-zinc-700 hover:border-zinc-300"
                                                            )}>
                                                                {workloadMetric === 'time_estimate' ? `${Math.round(value)}h` : value}

                                                                {/* Task Count Badge */}
                                                                {count > 0 && (
                                                                    <div className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-yellow-400 text-yellow-900 flex items-center justify-center text-[9px] font-black shadow-sm z-10">
                                                                        {count}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="h-10 w-16 rounded-md border border-zinc-100/50 bg-transparent flex items-center justify-center text-[13px] font-bold text-zinc-200">
                                                                0h
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" className="z-40" />
                </ScrollArea>
            </div>

            {/* Fields panel (Columns click or + in last column) toggle show/hide columns */}
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
                                    {groupBy === "status" ? (
                                        <div className="flex items-center justify-between py-1 px-2">
                                            <span className="text-sm text-zinc-800">Show empty statuses</span>
                                            <Switch
                                                checked={showEmptyStatuses}
                                                onCheckedChange={setShowEmptyStatuses}
                                            />
                                        </div>
                                    ) : (
                                        <TooltipProvider delayDuration={0}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="flex items-center justify-between py-1 cursor-not-allowed opacity-50 px-2">
                                                        <span className="text-sm text-zinc-800">Show empty statuses</span>
                                                        <Switch
                                                            checked={showEmptyStatuses}
                                                            onCheckedChange={setShowEmptyStatuses}
                                                            disabled
                                                        />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="left" className="bg-zinc-900 text-white border-none text-[11px] py-1.5 px-2.5">
                                                    Grouping by status is required to enable this
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                    <div className="flex items-center justify-between py-1 px-2">
                                        <span className="text-sm text-zinc-800">Wrap text</span>
                                        <Switch checked={wrapText} onCheckedChange={setWrapText} />
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
                                        <span className="text-sm text-zinc-800">Show closed tasks</span>
                                        <Switch checked={showCompleted} onCheckedChange={setShowCompleted} />
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
                                    <Popover open={customizeViewGroupOpen} onOpenChange={setCustomizeViewGroupOpen}>
                                        <PopoverTrigger asChild>
                                            <button
                                                type="button"
                                                className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2"
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
                            </div>
                        </ScrollArea>
                        <div className="mt-auto p-4 border-t border-zinc-100 bg-zinc-50/50">
                            <Button className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold h-11 rounded-xl shadow-lg" onClick={() => { saveViewConfig(); setCustomizePanelOpen(false); }}>
                                Save changes
                            </Button>
                        </div>
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
                                            <AvatarImage src={user.image} />
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

            <TaskDetailModal taskId={selectedTaskId || ""} open={!!selectedTaskId} onOpenChange={(open) => !open && (onTaskSelect ? onTaskSelect(null) : setSelectedTaskId(null))} />
            <TaskCreationModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} spaceId={spaceId} projectId={projectId} listId={listId} />
            <ShareViewPermissionModal open={isShareModalOpen} onOpenChange={setIsShareModalOpen} viewId={viewId as string} workspaceId={resolvedWorkspaceId as string} />

            {/* Create field modal – field types and Add existing fields */}
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
    );
}
