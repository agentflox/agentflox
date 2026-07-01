"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    Plus,
    MoreHorizontal,
    CheckCircle2,
    Clock,
    Activity,
    User,
    PieChart,
    BarChart3,
    Move,
    Settings,
    RefreshCw,
    Filter,
    TrendingUp,
    Calendar,
    Users,
    Target,
    AlertCircle,
    FileText,
    Zap,
    Timer,
    List,
    Grid,
    ChevronDown,
    EyeOff,
    Trash2,
    Copy,
    Lock,
    Globe,
    X,
    ChevronRight,
    LayoutList,
    Pin,
    ShieldCheck,
    Info,
    Search,
    Home,
    Sparkles,
    Star,
    Tag,
    Flag,
    Table2,
    Code2,
    Book,
    Video,
    GraduationCap
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { FILTER_OPTIONS, FIELD_OPERATORS, STANDARD_FIELD_CONFIG } from "./listViewConstants";
import type { FilterCondition, FilterGroup, FilterOperator } from "./listViewTypes";
import { evaluateGroup, hasAnyValueInGroup, hasFilterValue } from "./filterUtils";

interface DashboardViewProps {
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    listId?: string;
    viewId?: string;
    initialConfig?: any;
    selectedTaskIdFromParent?: string | null;
    onTaskSelect?: (taskId: string | null) => void;
}

type WidgetType =
    | 'summary'
    | 'task-list'
    | 'my-tasks'
    | 'pie-chart'
    | 'bar-chart'
    | 'line-chart'
    | 'battery-chart'
    | 'workload'
    | 'status-breakdown'
    | 'priority-breakdown'
    | 'assignee-breakdown'
    | 'time-tracking'
    | 'timesheet'
    | 'sprint-burndown'
    | 'sprint-burnup'
    | 'sprint-velocity'
    | 'goals'
    | 'portfolio'
    | 'calculation'
    | 'activity'
    | 'completed-tasks'
    | 'who-behind'
    | 'workspace-points'
    | 'text-block'
    | 'embed'
    | 'custom-table';

interface Widget {
    id: string;
    type: WidgetType;
    title: string;
    config?: {
        dataSource?: 'space' | 'project' | 'team' | 'list' | 'workspace';
        sourceIds?: string[];
        groupBy?: string;
        filterBy?: any;
        timeRange?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
        chartType?: 'pie' | 'bar' | 'line' | 'battery';
        showSubtasks?: boolean;
        calculation?: string;
        embedUrl?: string;
        customFields?: string[];
    };
    size?: 'small' | 'medium' | 'large' | 'full';
    w?: string;
}

function SortableWidget({
    widget,
    children,
    onEdit,
    onDuplicate,
    onDelete,
    onRefresh
}: {
    widget: Widget;
    children: React.ReactNode;
    onEdit: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onRefresh: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: widget.id
    });
    const [lastRefreshed, setLastRefreshed] = useState(new Date());

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
    };

    const handleRefresh = () => {
        setLastRefreshed(new Date());
        onRefresh();
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "relative",
                widget.w || "col-span-1",
                isDragging && "opacity-80"
            )}
        >
            <div className={cn(
                "h-full border border-zinc-200 rounded-xl bg-white shadow-sm transition-all overflow-hidden flex flex-col hover:border-indigo-200 hover:shadow-md",
                isDragging && "ring-2 ring-indigo-500 shadow-xl"
            )}>
                <div className="flex items-center justify-between p-3 border-b border-zinc-50 bg-gradient-to-r from-zinc-50/50 to-transparent">
                    <div className="flex items-center gap-2">
                        <div
                            className="p-1 rounded cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500 transition-colors"
                            {...listeners}
                            {...attributes}
                        >
                            <Move className="h-4 w-4" />
                        </div>
                        <span className="font-semibold text-zinc-800 text-sm">{widget.title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-400 hover:text-zinc-600"
                            onClick={handleRefresh}
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-600">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={onEdit}>
                                    <Settings className="h-4 w-4 mr-2" />
                                    Edit Card
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onDuplicate}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleRefresh}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Refresh
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <div className="flex-1 p-4 bg-white/50 overflow-auto">
                    {children}
                </div>
                <div className="px-3 py-1.5 border-t border-zinc-50 bg-zinc-50/30">
                    <p className="text-[10px] text-zinc-400">
                        Last updated: {lastRefreshed.toLocaleTimeString()}
                    </p>
                </div>
            </div>
        </div>
    );
}

export function DashboardView({
    spaceId,
    projectId,
    teamId,
    listId,
    viewId,
    initialConfig,
    selectedTaskIdFromParent,
    onTaskSelect
}: DashboardViewProps) {
    const [widgets, setWidgets] = useState<Widget[]>([
        {
            id: '1',
            type: 'summary',
            title: 'Task Summary',
            w: 'col-span-1 md:col-span-2 lg:col-span-3',
            config: { timeRange: 'month' }
        },
        {
            id: '2',
            type: 'my-tasks',
            title: 'My Tasks',
            w: 'col-span-1',
            config: { showSubtasks: false }
        },
        {
            id: '3',
            type: 'pie-chart',
            title: 'Tasks by Status',
            w: 'col-span-1',
            config: { groupBy: 'status' }
        },
        {
            id: '4',
            type: 'bar-chart',
            title: 'Tasks by Priority',
            w: 'col-span-1',
            config: { groupBy: 'priority' }
        },
        {
            id: '5',
            type: 'workload',
            title: 'Team Workload',
            w: 'col-span-1 md:col-span-2',
            config: { groupBy: 'assignee' }
        },
        {
            id: '6',
            type: 'activity',
            title: 'Recent Activity',
            w: 'col-span-1 md:col-span-2',
            config: { timeRange: 'week' }
        },
        {
            id: '7',
            type: 'time-tracking',
            title: 'Time Tracking',
            w: 'col-span-1',
            config: { timeRange: 'week' }
        },
        {
            id: '8',
            type: 'goals',
            title: 'Goals Progress',
            w: 'col-span-1',
            config: {}
        },
    ]);

    const [filterGroups, setFilterGroups] = useState<FilterGroup>({
        id: "root",
        operator: "AND",
        conditions: [],
    });
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(30); // minutes
    const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
    const [customizePanelOpen, setCustomizePanelOpen] = useState(false);
    const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
    const [layoutOptionsOpen, setLayoutOptionsOpen] = useState(false);
    const [savedFiltersPanelOpen, setSavedFiltersPanelOpen] = useState(false);
    const [savedFiltersSearch, setSavedFiltersSearch] = useState("");
    const [savedFilterName, setSavedFilterName] = useState("");
    const [savedFilters, setSavedFilters] = useState<{ id: string; name: string; config: FilterGroup }[]>(() => {
        if (typeof window === "undefined") return [];
        try {
            const raw = localStorage.getItem("agentflox_dashboard_saved_filters");
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });
    const [filterSearch, setFilterSearch] = useState("");
    const [showCompactCards, setShowCompactCards] = useState(false);
    const [showWidgetBorders, setShowWidgetBorders] = useState(true);
    const [showCardFooters, setShowCardFooters] = useState(true);
    const [pinDashboard, setPinDashboard] = useState(false);
    const [privateDashboard, setPrivateDashboard] = useState(false);
    const [protectDashboard, setProtectDashboard] = useState(false);
    const [defaultDashboard, setDefaultDashboard] = useState(false);
    const [lastToolbarRefresh, setLastToolbarRefresh] = useState(new Date());
    const [dashboardName, setDashboardName] = useState("Dashboard");
    const FIELD_CONFIG = useMemo(() => STANDARD_FIELD_CONFIG.map(f => ({ ...f, isCustom: false })), []);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setWidgets((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    // Fetch data
    const { data: tasksData, refetch: refetchTasks } = trpc.task.list.useQuery({
        spaceId,
        projectId,
        teamId,
        listId,
    });

    const tasks = useMemo(() => tasksData?.items || [], [tasksData]);
    const filteredTasks = useMemo(() => {
        if (filterGroups.conditions.length === 0) return tasks;
        return tasks.filter((task: any) => evaluateGroup(task, filterGroups));
    }, [tasks, filterGroups]);

    const { data: goals = [] } = trpc.goal.list.useQuery({ spaceId, projectId });
    const { data: timeEntries = [] } = trpc.timeTracking.list.useQuery({ spaceId, projectId });
    const { data: activities = [] } = trpc.activity.list.useQuery({ spaceId, projectId });

    // Auto-refresh logic
    useEffect(() => {
        if (autoRefresh) {
            const interval = setInterval(() => {
                refetchTasks();
                setLastToolbarRefresh(new Date());
            }, refreshInterval * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [autoRefresh, refreshInterval, refetchTasks]);

    // Calculate metrics
    const metrics = useMemo(() => {
        const total = filteredTasks.length;
        const completed = filteredTasks.filter(t => t.status?.name?.toLowerCase() === 'done').length;
        const inProgress = filteredTasks.filter(t => t.status?.name?.toLowerCase() === 'in progress').length;
        const urgent = filteredTasks.filter(t => t.priority === 'URGENT').length;
        const high = filteredTasks.filter(t => t.priority === 'HIGH').length;
        const overdue = filteredTasks.filter(t => {
            if (!t.dueDate) return false;
            return new Date(t.dueDate) < new Date() && t.status?.name?.toLowerCase() !== 'done';
        }).length;

        const statusBreakdown = filteredTasks.reduce((acc, task) => {
            const status = task.status?.name || 'No Status';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const priorityBreakdown = filteredTasks.reduce((acc, task) => {
            const priority = task.priority || 'No Priority';
            acc[priority] = (acc[priority] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const assigneeBreakdown = filteredTasks.reduce((acc, task) => {
            const assignee = task.assignee?.name || 'Unassigned';
            acc[assignee] = (acc[assignee] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            total,
            completed,
            inProgress,
            urgent,
            high,
            overdue,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            statusBreakdown,
            priorityBreakdown,
            assigneeBreakdown
        };
    }, [filteredTasks]);

    const addWidget = (type: WidgetType, title: string, config?: any) => {
        const newWidget: Widget = {
            id: Date.now().toString(),
            type,
            title,
            config,
            w: 'col-span-1'
        };
        setWidgets([...widgets, newWidget]);
        setIsAddWidgetOpen(false);
    };

    const editWidget = (id: string) => {
        // Open edit modal for widget
        console.log('Edit widget', id);
    };

    const duplicateWidget = (id: string) => {
        const widget = widgets.find(w => w.id === id);
        if (widget) {
            const duplicated = { ...widget, id: Date.now().toString(), title: `${widget.title} (Copy)` };
            setWidgets([...widgets, duplicated]);
        }
    };

    const deleteWidget = (id: string) => {
        setWidgets(widgets.filter(w => w.id !== id));
    };

    const refreshWidget = (id: string) => {
        refetchTasks();
    };

    const handleToolbarRefresh = () => {
        refetchTasks();
        setLastToolbarRefresh(new Date());
    };

    const refreshedAgo = useMemo(() => {
        const diffMins = Math.max(0, Math.floor((Date.now() - lastToolbarRefresh.getTime()) / 60000));
        if (diffMins < 1) return "just now";
        if (diffMins === 1) return "1 min ago";
        return `${diffMins} mins ago`;
    }, [lastToolbarRefresh]);
    const appliedFilterCount = useMemo(() => {
        if (filterGroups.conditions.length === 0) return 0;
        return filterGroups.conditions.filter(c => {
            if ("conditions" in c) return hasAnyValueInGroup(c as FilterGroup);
            return hasFilterValue(c as FilterCondition);
        }).length;
    }, [filterGroups]);

    const addFilterCondition = (groupId: string = "root") => {
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
        setFilterGroups(update(filterGroups));
    };

    const updateFilterGroupOperator = (id: string, operator: FilterOperator) => {
        const update = (group: FilterGroup): FilterGroup => {
            if (group.id === id) return { ...group, operator };
            return { ...group, conditions: group.conditions.map(c => "conditions" in c ? update(c as FilterGroup) : c) };
        };
        setFilterGroups(update(filterGroups));
    };

    useEffect(() => {
        if (typeof window === "undefined") return;
        localStorage.setItem("agentflox_dashboard_saved_filters", JSON.stringify(savedFilters));
    }, [savedFilters]);

    const applySavedFilter = (config: FilterGroup) => {
        setFilterGroups(config ?? { id: "root", operator: "AND", conditions: [] });
        setSavedFiltersPanelOpen(false);
    };

    const deleteSavedFilter = (id: string, e: any) => {
        e.stopPropagation();
        setSavedFilters((prev) => prev.filter((f) => f.id !== id));
    };

    const saveNewFilter = () => {
        const name = savedFilterName.trim();
        if (!name) return;
        const next = { id: Date.now().toString(), name, config: JSON.parse(JSON.stringify(filterGroups)) };
        setSavedFilters((prev) => [next, ...prev]);
        setSavedFilterName("");
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


    const exportDashboard = () => {
        // Export dashboard as PDF/CSV
        console.log('Export dashboard');
    };

    const renderWidget = (widget: Widget) => {
        switch (widget.type) {
            case 'summary':
                return (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 h-full">
                        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                            <div className="text-3xl font-bold text-indigo-600">{metrics.total}</div>
                            <div className="text-xs text-indigo-500 font-medium mt-1 uppercase">Total</div>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                            <div className="text-3xl font-bold text-emerald-600">{metrics.completed}</div>
                            <div className="text-xs text-emerald-600 font-medium mt-1 uppercase">Completed</div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                            <div className="text-3xl font-bold text-blue-600">{metrics.inProgress}</div>
                            <div className="text-xs text-blue-600 font-medium mt-1 uppercase">In Progress</div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                            <div className="text-3xl font-bold text-orange-600">{metrics.urgent}</div>
                            <div className="text-xs text-orange-600 font-medium mt-1 uppercase">Urgent</div>
                        </div>
                        <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                            <div className="text-3xl font-bold text-red-600">{metrics.overdue}</div>
                            <div className="text-xs text-red-600 font-medium mt-1 uppercase">Overdue</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                            <div className="text-3xl font-bold text-purple-600">{metrics.completionRate}%</div>
                            <div className="text-xs text-purple-600 font-medium mt-1 uppercase">Complete</div>
                        </div>
                    </div>
                );

            case 'my-tasks':
            case 'task-list':
                return (
                    <div className="space-y-2">
                        {filteredTasks.slice(0, 8).map(task => (
                            <div
                                key={task.id}
                                className="flex items-center gap-3 p-2.5 hover:bg-zinc-50 rounded-md border border-transparent hover:border-zinc-200 transition-all cursor-pointer group"
                            >
                                <div className={cn(
                                    "h-2 w-2 rounded-full",
                                    task.priority === 'URGENT' ? 'bg-red-500' :
                                        task.priority === 'HIGH' ? 'bg-orange-500' :
                                            task.priority === 'NORMAL' ? 'bg-blue-500' : 'bg-zinc-300'
                                )} />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-zinc-800 truncate group-hover:text-indigo-600 transition-colors">
                                        {task.name}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-zinc-500">{task.status?.name}</span>
                                        {task.dueDate && (
                                            <>
                                                <span className="text-zinc-300">•</span>
                                                <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(task.dueDate).toLocaleDateString()}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {task.assignee && (
                                    <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-semibold">
                                        {task.assignee.name?.[0]}
                                    </div>
                                )}
                            </div>
                        ))}
                        {filteredTasks.length === 0 && (
                            <div className="text-center text-zinc-400 py-12 text-sm">
                                No tasks found
                            </div>
                        )}
                    </div>
                );

            case 'pie-chart':
                const pieData = Object.entries(metrics.statusBreakdown);
                const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                const total = pieData.reduce((sum, [, count]) => sum + count, 0);

                return (
                    <div className="h-full flex flex-col items-center justify-center gap-4">
                        <div className="relative h-40 w-40">
                            <svg className="transform -rotate-90" viewBox="0 0 100 100">
                                {pieData.reduce((acc, [status, count], index) => {
                                    const percentage = (count / total) * 100;
                                    const prevPercentage = acc.offset;
                                    const circumference = 2 * Math.PI * 40;
                                    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                                    const strokeDashoffset = -((prevPercentage / 100) * circumference);

                                    acc.elements.push(
                                        <circle
                                            key={status}
                                            cx="50"
                                            cy="50"
                                            r="40"
                                            fill="none"
                                            stroke={colors[index % colors.length]}
                                            strokeWidth="20"
                                            strokeDasharray={strokeDasharray}
                                            strokeDashoffset={strokeDashoffset}
                                            className="transition-all duration-300"
                                        />
                                    );
                                    acc.offset += percentage;
                                    return acc;
                                }, { elements: [] as any[], offset: 0 }).elements}
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-zinc-800">{total}</div>
                                    <div className="text-[10px] text-zinc-400 uppercase">Tasks</div>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 w-full">
                            {pieData.map(([status, count], index) => (
                                <div key={status} className="flex items-center gap-2">
                                    <div
                                        className="h-3 w-3 rounded-sm"
                                        style={{ backgroundColor: colors[index % colors.length] }}
                                    />
                                    <span className="text-xs text-zinc-600 truncate flex-1">{status}</span>
                                    <span className="text-xs font-semibold text-zinc-800">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'bar-chart':
                const barData = Object.entries(metrics.priorityBreakdown);
                const maxCount = Math.max(...barData.map(([, count]) => count), 1);

                return (
                    <div className="h-full flex flex-col justify-end gap-3">
                        <div className="flex items-end justify-around gap-2 h-48">
                            {barData.map(([priority, count]) => {
                                const height = (count / maxCount) * 100;
                                const color = priority === 'URGENT' ? 'bg-red-500' :
                                    priority === 'HIGH' ? 'bg-orange-500' :
                                        priority === 'NORMAL' ? 'bg-blue-500' : 'bg-zinc-400';

                                return (
                                    <div key={priority} className="flex-1 flex flex-col items-center gap-2">
                                        <div className="text-sm font-semibold text-zinc-700">{count}</div>
                                        <div
                                            className={cn("w-full rounded-t-md transition-all duration-500", color)}
                                            style={{ height: `${height}%`, minHeight: count > 0 ? '8px' : '0' }}
                                        />
                                        <div className="text-xs text-zinc-500 font-medium text-center">
                                            {priority}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );

            case 'workload':
                const workloadData = Object.entries(metrics.assigneeBreakdown).slice(0, 5);
                const maxWorkload = Math.max(...workloadData.map(([, count]) => count), 1);

                return (
                    <div className="space-y-3">
                        {workloadData.map(([assignee, count]) => {
                            const percentage = (count / maxWorkload) * 100;
                            const isOverloaded = count > maxWorkload * 0.8;

                            return (
                                <div key={assignee} className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-700 text-xs font-semibold">
                                                {assignee[0]}
                                            </div>
                                            <span className="text-sm font-medium text-zinc-700">{assignee}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-zinc-800">{count}</span>
                                            {isOverloaded && (
                                                <AlertCircle className="h-4 w-4 text-orange-500" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all duration-500",
                                                isOverloaded ? "bg-orange-500" : "bg-indigo-500"
                                            )}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );

            case 'activity':
                return (
                    <div className="space-y-3">
                        {activities.slice(0, 6).map((activity, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                    activity.type === 'completed' ? 'bg-green-100 text-green-600' :
                                        activity.type === 'created' ? 'bg-blue-100 text-blue-600' :
                                            activity.type === 'updated' ? 'bg-orange-100 text-orange-600' :
                                                'bg-zinc-100 text-zinc-600'
                                )}>
                                    {activity.type === 'completed' ? <CheckCircle2 className="h-4 w-4" /> :
                                        activity.type === 'created' ? <Plus className="h-4 w-4" /> :
                                            <Activity className="h-4 w-4" />}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-zinc-800">
                                        <span className="font-semibold">{activity.user}</span> {activity.action}{' '}
                                        <span className="font-medium text-indigo-600">{activity.target}</span>
                                    </p>
                                    <p className="text-xs text-zinc-400 mt-1">{activity.timestamp}</p>
                                </div>
                            </div>
                        ))}
                        {activities.length === 0 && (
                            <div className="text-center text-zinc-400 py-12 text-sm">
                                No recent activity
                            </div>
                        )}
                    </div>
                );

            case 'time-tracking':
                return (
                    <div className="space-y-4">
                        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-lg p-4 text-center">
                            <div className="text-3xl font-bold text-indigo-600">24.5h</div>
                            <div className="text-xs text-indigo-600 font-medium mt-1 uppercase">This Week</div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-600">Billable</span>
                                <span className="font-semibold text-zinc-800">18.5h</span>
                            </div>
                            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '75%' }} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-600">Non-billable</span>
                                <span className="font-semibold text-zinc-800">6h</span>
                            </div>
                            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                                <div className="h-full bg-zinc-400 rounded-full" style={{ width: '25%' }} />
                            </div>
                        </div>
                    </div>
                );

            case 'goals':
                return (
                    <div className="space-y-4">
                        {[
                            { name: 'Q1 Product Launch', progress: 75, status: 'on-track' },
                            { name: 'Team Onboarding', progress: 45, status: 'at-risk' },
                            { name: 'Revenue Target', progress: 90, status: 'ahead' },
                        ].map((goal, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-zinc-700">{goal.name}</span>
                                    <Badge variant={
                                        goal.status === 'ahead' ? 'default' :
                                            goal.status === 'on-track' ? 'secondary' : 'destructive'
                                    } className="text-xs">
                                        {goal.status}
                                    </Badge>
                                </div>
                                <div className="space-y-1">
                                    <Progress value={goal.progress} className="h-2" />
                                    <div className="flex justify-between text-xs text-zinc-500">
                                        <span>{goal.progress}% complete</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );

            default:
                return (
                    <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
                        Widget type not implemented
                    </div>
                );
        }
    };

    const customizeOverlayOpen = customizePanelOpen || layoutOptionsOpen;

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-zinc-50 overflow-y-auto relative">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-zinc-200 shadow-sm">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between gap-3 overflow-x-auto">
                        <div className="flex items-center gap-2 shrink-0">
                            <Popover open={filtersPanelOpen} onOpenChange={(open) => {
                                setFiltersPanelOpen(open);
                                if (open === false) setSavedFiltersPanelOpen(false);
                            }}>
                                <PopoverTrigger asChild>
                                    <div className="relative group/filter inline-flex">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={cn(
                                                "h-8 text-xs font-medium pr-7",
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
                                <PopoverContent align="end" className="w-[600px] max-w-[95vw] p-0 overflow-hidden rounded-2xl border border-zinc-200/80 shadow-2xl" sideOffset={8}>
                                    {renderFilterContent({ onClose: () => setFiltersPanelOpen(false) })}
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 px-2.5 text-xs font-medium text-zinc-700 bg-zinc-50 border-zinc-200 hover:bg-zinc-100"
                                onClick={handleToolbarRefresh}
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Refreshed: {refreshedAgo}
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 px-2.5 text-xs font-medium text-zinc-700 bg-zinc-50 border-zinc-200 hover:bg-zinc-100"
                                onClick={() => setAutoRefresh((v) => !v)}
                            >
                                <Clock className="h-3.5 w-3.5" />
                                Auto refresh: {autoRefresh ? "On" : "Off"}
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 px-2.5 text-xs font-medium text-zinc-700 bg-zinc-50 border-zinc-200 hover:bg-zinc-100"
                            >
                                <Zap className="h-3.5 w-3.5" />
                                Schedule report
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-medium text-zinc-700 border-zinc-200"
                                onClick={() => setCustomizePanelOpen(true)}
                            >
                                <Settings className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline ml-1">Customize</span>
                            </Button>

                            {/* Add Widget */}
                            <Dialog open={isAddWidgetOpen} onOpenChange={setIsAddWidgetOpen}>
                                <DialogTrigger asChild>
                                    <Button className="h-8 gap-1.5 px-3 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white border-0 shadow-sm">
                                        <Plus className="h-3.5 w-3.5" />
                                        Add card
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[1200px] w-[95vw] max-h-[85vh] h-[85vh] p-0 overflow-hidden flex flex-col md:flex-row gap-0 bg-zinc-50 border border-zinc-200/60 shadow-2xl [&>button]:right-6 [&>button]:top-4 [&>button]:cursor-pointer [&>button]:z-[60]">
                                    <Tabs defaultValue="featured" className="flex flex-row h-full w-full gap-0">
                                        {/* Left Sidebar */}
                                        <div className="w-[280px] flex shrink-0 flex-col border-r border-zinc-200/70 bg-zinc-50/50">
                                            <div className="h-14 flex items-center px-5 gap-2 text-base font-bold border-b border-zinc-200/70 shrink-0">
                                                <LayoutDashboard className="h-5 w-5 text-zinc-500" />
                                                Add Card
                                            </div>
                                            <ScrollArea className="flex-1">
                                                <TabsList className="flex flex-col w-full h-auto bg-transparent items-stretch p-3 gap-1 space-y-0">
                                                    <TabsTrigger value="featured" className="justify-start px-3 py-2.5 text-sm font-semibold w-full cursor-pointer h-10 rounded-md data-[state=active]:bg-zinc-200/50 data-[state=active]:shadow-none hover:bg-zinc-100 transition-colors">
                                                        <Star className="h-4 w-4 mr-3 text-zinc-500" /> Featured
                                                    </TabsTrigger>
                                                    <TabsTrigger value="ai" className="justify-start px-3 py-2.5 text-sm font-semibold w-full cursor-pointer h-10 rounded-md data-[state=active]:bg-zinc-200/50 data-[state=active]:shadow-none hover:bg-zinc-100 transition-colors">
                                                        <Sparkles className="h-4 w-4 mr-3 text-fuchsia-500" /> AI Cards
                                                    </TabsTrigger>
                                                    <div className="pt-4 pb-2 px-3 text-xs uppercase font-bold text-zinc-400 tracking-wider">Views</div>
                                                    <TabsTrigger value="custom" className="justify-start px-3 py-2.5 text-sm font-semibold w-full cursor-pointer h-10 rounded-md data-[state=active]:bg-zinc-200/50 data-[state=active]:shadow-none hover:bg-zinc-100 transition-colors">
                                                        <LayoutList className="h-4 w-4 mr-3 text-zinc-500" /> Custom
                                                    </TabsTrigger>
                                                    <TabsTrigger value="sprints" className="justify-start px-3 py-2.5 text-sm font-semibold w-full cursor-pointer h-10 rounded-md data-[state=active]:bg-zinc-200/50 data-[state=active]:shadow-none hover:bg-zinc-100 transition-colors">
                                                        <RefreshCw className="h-4 w-4 mr-3 text-zinc-500" /> Sprints
                                                    </TabsTrigger>
                                                    <TabsTrigger value="statuses" className="justify-start px-3 py-2.5 text-sm font-semibold w-full cursor-pointer h-10 rounded-md data-[state=active]:bg-zinc-200/50 data-[state=active]:shadow-none hover:bg-zinc-100 transition-colors">
                                                        <CheckCircle2 className="h-4 w-4 mr-3 text-zinc-500" /> Statuses
                                                    </TabsTrigger>
                                                    <TabsTrigger value="tags" className="justify-start px-3 py-2.5 text-sm font-semibold w-full cursor-pointer h-10 rounded-md data-[state=active]:bg-zinc-200/50 data-[state=active]:shadow-none hover:bg-zinc-100 transition-colors">
                                                        <Tag className="h-4 w-4 mr-3 text-zinc-500" /> Tags
                                                    </TabsTrigger>
                                                    <TabsTrigger value="assignees" className="justify-start px-3 py-2.5 text-sm font-semibold w-full cursor-pointer h-10 rounded-md data-[state=active]:bg-zinc-200/50 data-[state=active]:shadow-none hover:bg-zinc-100 transition-colors">
                                                        <User className="h-4 w-4 mr-3 text-zinc-500" /> Assignees
                                                    </TabsTrigger>
                                                    <TabsTrigger value="priorities" className="justify-start px-3 py-2.5 text-sm font-semibold w-full cursor-pointer h-10 rounded-md data-[state=active]:bg-zinc-200/50 data-[state=active]:shadow-none hover:bg-zinc-100 transition-colors">
                                                        <Flag className="h-4 w-4 mr-3 text-zinc-500" /> Priorities
                                                    </TabsTrigger>
                                                    <TabsTrigger value="time" className="justify-start px-3 py-2.5 text-sm font-semibold w-full cursor-pointer h-10 rounded-md data-[state=active]:bg-zinc-200/50 data-[state=active]:shadow-none hover:bg-zinc-100 transition-colors">
                                                        <Timer className="h-4 w-4 mr-3 text-zinc-500" /> Time Tracking
                                                    </TabsTrigger>
                                                    <TabsTrigger value="tables" className="justify-start px-3 py-2.5 text-sm font-semibold w-full cursor-pointer h-10 rounded-md data-[state=active]:bg-zinc-200/50 data-[state=active]:shadow-none hover:bg-zinc-100 transition-colors">
                                                        <Grid className="h-4 w-4 mr-3 text-zinc-500" /> Tables
                                                    </TabsTrigger>
                                                    <TabsTrigger value="embeds" className="justify-start px-3 py-2.5 text-sm font-semibold w-full cursor-pointer h-10 rounded-md data-[state=active]:bg-zinc-200/50 data-[state=active]:shadow-none hover:bg-zinc-100 transition-colors">
                                                        <Globe className="h-4 w-4 mr-3 text-zinc-500" /> Embeds and Apps
                                                    </TabsTrigger>
                                                </TabsList>
                                            </ScrollArea>
                                        </div>

                                        {/* Right Main Content */}
                                        <div className="flex-1 flex flex-col min-w-0 bg-white">
                                            <div className="h-12 flex items-center justify-between px-6 border-b border-zinc-100 shrink-0 pr-12">
                                                <div className="flex items-center gap-2">
                                                    <Star className="h-4 w-4 text-zinc-400" />
                                                    <span className="font-semibold text-sm">Featured</span>
                                                </div>
                                                <div className="flex items-center gap-2 h-8 w-56 px-2.5 bg-zinc-50/50 border border-zinc-200 rounded-md">
                                                    <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                                    <Input variant="ghost" placeholder="Search..." className="flex-1 h-full min-w-0 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-transparent rounded-none outline-none focus:outline-none" />
                                                </div>
                                            </div>
                                            
                                            <ScrollArea className="flex-1">
                                                <div className="p-8 pb-24">
                                                    <TabsContent value="featured" className="m-0 space-y-6 outline-none">
                                                        <h2 className="text-xl font-bold text-zinc-900">Featured</h2>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                            
                                                            {/* Card 1 */}
                                                            <div className="group flex flex-col bg-white border border-zinc-200 hover:border-violet-300 hover:shadow-lg transition-all rounded-xl overflow-hidden cursor-pointer h-[260px]" onClick={() => { addWidget('activity', 'AI Brain', {}); setIsAddWidgetOpen(false); }}>
                                                                <div className="h-[140px] bg-gradient-to-br from-pink-50 to-purple-50 p-4 border-b border-zinc-100 flex items-center justify-center relative overflow-hidden">
                                                                     <div className="absolute top-3 left-3 bg-white rounded-full p-1.5 shadow-sm">
                                                                         <Sparkles className="h-4 w-4 text-fuchsia-500" />
                                                                     </div>
                                                                     <div className="w-[85%] h-14 bg-white border border-purple-100/50 rounded-lg shadow-sm flex items-center px-4 gap-3 opacity-90 group-hover:scale-105 transition-transform">
                                                                         <div className="h-6 w-6 rounded-full bg-purple-100" />
                                                                         <div className="flex-1 space-y-1.5">
                                                                             <div className="h-1.5 w-full bg-zinc-100 rounded-full" />
                                                                             <div className="h-1.5 w-2/3 bg-zinc-100 rounded-full" />
                                                                         </div>
                                                                     </div>
                                                                </div>
                                                                <div className="p-5 flex-1 flex flex-col">
                                                                    <h3 className="font-bold text-zinc-900 mb-1.5">AI Brain</h3>
                                                                    <p className="text-zinc-500 text-[13px] leading-snug">Generate ideas and content with a custom prompt</p>
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Card 2 */}
                                                            <div className="group flex flex-col bg-white border border-zinc-200 hover:border-green-300 hover:shadow-lg transition-all rounded-xl overflow-hidden cursor-pointer h-[260px]" onClick={() => { addWidget('task-list', 'Task List', {}); setIsAddWidgetOpen(false); }}>
                                                                <div className="h-[140px] bg-gradient-to-br from-green-50 to-emerald-50/50 p-4 border-b border-zinc-100 flex items-center justify-center relative overflow-hidden">
                                                                    <div className="w-[75%] bg-white border border-green-100/50 rounded-lg shadow-sm p-3 group-hover:scale-105 transition-transform flex flex-col gap-2.5">
                                                                        <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 bg-green-500 rounded-full"/><div className="h-1.5 w-24 bg-zinc-100 rounded-sm"/></div>
                                                                        <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 bg-red-400 rounded-full"/><div className="h-1.5 w-16 bg-zinc-100 rounded-sm"/></div>
                                                                        <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 bg-blue-400 rounded-full"/><div className="h-1.5 w-20 bg-zinc-100 rounded-sm"/></div>
                                                                    </div>
                                                                </div>
                                                                <div className="p-5 flex-1 flex flex-col">
                                                                    <h3 className="font-bold text-zinc-900 mb-1.5">Task List</h3>
                                                                    <p className="text-zinc-500 text-[13px] leading-snug">Create a List view using tasks from any location</p>
                                                                </div>
                                                            </div>

                                                            {/* Card 3 */}
                                                            <div className="group flex flex-col bg-white border border-zinc-200 hover:border-emerald-300 hover:shadow-lg transition-all rounded-xl overflow-hidden cursor-pointer h-[260px]" onClick={() => { addWidget('pie-chart', 'Workload by Status', { groupBy: 'status' }); setIsAddWidgetOpen(false); }}>
                                                                <div className="h-[140px] bg-gradient-to-br from-emerald-500 to-teal-600 p-4 border-b border-zinc-100 flex items-center justify-center relative overflow-hidden">
                                                                     <div className="w-20 h-20 rounded-full border-[10px] border-white/90 border-r-white/50 border-t-white/30 group-hover:rotate-12 transition-transform scale-110" />
                                                                </div>
                                                                <div className="p-5 flex-1 flex flex-col">
                                                                    <h3 className="font-bold text-zinc-900 mb-1.5">Workload by Status</h3>
                                                                    <p className="text-zinc-500 text-[13px] leading-snug">Display a pie chart of your statuses usage across locations</p>
                                                                </div>
                                                            </div>

                                                            {/* Card 4 */}
                                                            <div className="group flex flex-col bg-white border border-zinc-200 hover:border-violet-500 hover:shadow-lg transition-all rounded-xl overflow-hidden cursor-pointer h-[260px]" onClick={() => { addWidget('calculation', 'Calculation', {}); setIsAddWidgetOpen(false); }}>
                                                                <div className="h-[140px] bg-gradient-to-br from-purple-500 to-violet-600 p-4 border-b border-zinc-100 flex items-center justify-center relative overflow-hidden">
                                                                     <div className="bg-white/95 px-6 py-4 rounded-xl shadow-lg group-hover:scale-105 transition-transform text-center min-w-[120px]">
                                                                         <div className="text-3xl font-black text-zinc-900">1,380</div>
                                                                         <div className="text-[10px] font-semibold text-zinc-500 mt-1 uppercase tracking-wider">Total tasks</div>
                                                                     </div>
                                                                </div>
                                                                <div className="p-5 flex-1 flex flex-col">
                                                                    <h3 className="font-bold text-zinc-900 mb-1.5">Calculation</h3>
                                                                    <p className="text-zinc-500 text-[13px] leading-snug">Calculate sums, averages, and so much more for your tasks</p>
                                                                </div>
                                                            </div>

                                                            {/* Card 5 */}
                                                            <div className="group flex flex-col bg-white border border-zinc-200 hover:border-blue-500 hover:shadow-lg transition-all rounded-xl overflow-hidden cursor-pointer h-[260px]" onClick={() => { addWidget('bar-chart', 'Portfolio', { groupBy: 'priority' }); setIsAddWidgetOpen(false); }}>
                                                                <div className="h-[140px] bg-gradient-to-br from-blue-500 to-indigo-600 p-6 border-b border-zinc-100 flex items-center justify-center relative overflow-hidden">
                                                                     <div className="w-[85%] bg-white/95 rounded-lg shadow-lg group-hover:scale-105 transition-transform p-3">
                                                                         <div className="space-y-2.5">
                                                                             <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden"><div className="h-full w-2/3 bg-blue-500 rounded-full" /></div>
                                                                             <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden"><div className="h-full w-1/3 bg-orange-500 rounded-full" /></div>
                                                                             <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden"><div className="h-full w-4/5 bg-green-500 rounded-full" /></div>
                                                                         </div>
                                                                     </div>
                                                                </div>
                                                                <div className="p-5 flex-1 flex flex-col">
                                                                    <h3 className="font-bold text-zinc-900 mb-1.5">Portfolio</h3>
                                                                    <p className="text-zinc-500 text-[13px] leading-snug">Categorize and track progress of Lists & Folders</p>
                                                                </div>
                                                            </div>

                                                            {/* Card 6 */}
                                                            <div className="group flex flex-col bg-white border border-zinc-200 hover:border-sky-500 hover:shadow-lg transition-all rounded-xl overflow-hidden cursor-pointer h-[260px]" onClick={() => { addWidget('pie-chart', 'Tasks by Assignee', { groupBy: 'assignee' }); setIsAddWidgetOpen(false); }}>
                                                                <div className="h-[140px] bg-gradient-to-br from-sky-400 to-blue-500 p-4 border-b border-zinc-100 flex items-center justify-center relative overflow-hidden">
                                                                     <div className="w-20 h-20 rounded-full border-[10px] border-white/90 border-r-white/70 border-b-white/40 group-hover:-rotate-12 transition-transform scale-110" />
                                                                </div>
                                                                <div className="p-5 flex-1 flex flex-col">
                                                                    <h3 className="font-bold text-zinc-900 mb-1.5">Tasks by Assignee</h3>
                                                                    <p className="text-zinc-500 text-[13px] leading-snug">Display a pie chart of your total tasks by Assignee</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TabsContent>
                                                    
                                                    {/* Placeholder for other tabs so they don't crash if switched */}
                                                    {['ai', 'custom', 'sprints', 'statuses', 'tags', 'assignees', 'priorities', 'time', 'tables', 'embeds'].map(tab => (
                                                        <TabsContent key={tab} value={tab} className="m-0 outline-none h-full">
                                                            <div className="py-24 flex flex-col items-center justify-center text-center">
                                                                <Activity className="h-12 w-12 text-zinc-200 mb-4" />
                                                                <h2 className="text-xl font-bold text-zinc-900 mb-2 capitalize">{tab.replace('-', ' ')}</h2>
                                                                <p className="text-zinc-500 text-sm">Cards for this category will be available soon.</p>
                                                            </div>
                                                        </TabsContent>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    </Tabs>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard content: single scroll region; lock scroll when customize overlay is open */}
            <div
                className={cn(
                    "flex-1 min-h-0 overflow-y-auto p-6 relative",
                    customizeOverlayOpen && "overflow-hidden"
                )}
            >
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={widgets.map(w => w.id)}
                        strategy={rectSortingStrategy}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                            {widgets.map(widget => (
                                <SortableWidget
                                    key={widget.id}
                                    widget={widget}
                                    onEdit={() => editWidget(widget.id)}
                                    onDuplicate={() => duplicateWidget(widget.id)}
                                    onDelete={() => deleteWidget(widget.id)}
                                    onRefresh={() => refreshWidget(widget.id)}
                                >
                                    {renderWidget(widget)}
                                </SortableWidget>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>

                {widgets.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-96 text-center">
                        <LayoutDashboard className="h-16 w-16 text-zinc-300 mb-4" />
                        <h3 className="text-lg font-semibold text-zinc-700 mb-2">
                            Your dashboard is empty
                        </h3>
                        <p className="text-sm text-zinc-500 mb-6 max-w-md">
                            Add cards to visualize your data and track progress. Choose from charts, task lists, time tracking, and more.
                        </p>
                        <Button
                            onClick={() => setIsAddWidgetOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Your First Card
                        </Button>
                    </div>
                )}
                {customizePanelOpen && !layoutOptionsOpen && (
                    <>
                        <div className="absolute inset-0 bg-black/20 z-40" onClick={() => setCustomizePanelOpen(false)} aria-hidden />
                        <div className="absolute top-0 right-0 h-full w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col min-h-0">
                            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                                <h3 className="font-semibold text-zinc-900">Customize view</h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCustomizePanelOpen(false)}><X className="h-4 w-4" /></Button>
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto">
                                <div className="p-3 space-y-2 pb-24">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="flex items-center justify-center h-10 w-10 rounded-lg border border-zinc-200 bg-zinc-50 shrink-0">
                                            <LayoutList className="h-5 w-5 text-zinc-600" />
                                        </div>
                                        <Input
                                            value={dashboardName}
                                            onChange={(e) => setDashboardName(e.target.value)}
                                            className="h-10 text-sm font-medium border-zinc-200"
                                            placeholder="View name"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between py-1 px-2 cursor-pointer">
                                            <span className="text-sm text-zinc-800">Compact cards</span>
                                            <Switch checked={showCompactCards} onCheckedChange={setShowCompactCards} />
                                        </div>
                                        <div className="flex items-center justify-between py-1 px-2 cursor-pointer">
                                            <span className="text-sm text-zinc-800">Show widget borders</span>
                                            <Switch checked={showWidgetBorders} onCheckedChange={setShowWidgetBorders} />
                                        </div>
                                        <div className="flex items-center justify-between py-1 px-2 cursor-pointer">
                                            <span className="text-sm text-zinc-800">Show card footers</span>
                                            <Switch checked={showCardFooters} onCheckedChange={setShowCardFooters} />
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
                                        <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <Pin className="h-4 w-4 text-zinc-400" />
                                                <span className="text-sm text-zinc-800">Pin view</span>
                                            </div>
                                            <Switch checked={pinDashboard} onCheckedChange={setPinDashboard} />
                                        </div>
                                        <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <Lock className="h-4 w-4 text-zinc-400" />
                                                <span className="text-sm text-zinc-800">Private view</span>
                                            </div>
                                            <Switch checked={privateDashboard} onCheckedChange={setPrivateDashboard} />
                                        </div>
                                        <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4 text-zinc-400" />
                                                <span className="text-sm text-zinc-800">Protect view</span>
                                            </div>
                                            <Switch checked={protectDashboard} onCheckedChange={setProtectDashboard} />
                                        </div>
                                        <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <Home className="h-4 w-4 text-zinc-400" />
                                                <span className="text-sm text-zinc-800">Set as default view</span>
                                            </div>
                                            <Switch checked={defaultDashboard} onCheckedChange={setDefaultDashboard} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {layoutOptionsOpen && (
                    <>
                        <div className="absolute inset-0 bg-black/20 z-40" onClick={() => setLayoutOptionsOpen(false)} aria-hidden />
                        <div className="absolute inset-y-0 right-0 w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col min-h-0 overflow-y-auto">
                            <div className="flex items-center justify-between p-4 border-b border-zinc-100 shrink-0">
                                <h3 className="font-semibold text-zinc-900">More options</h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLayoutOptionsOpen(false)}><X className="h-4 w-4" /></Button>
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wide text-zinc-500">Refresh interval</Label>
                                    <Select value={refreshInterval.toString()} onValueChange={(v) => setRefreshInterval(Number(v))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="5">5 minutes</SelectItem>
                                            <SelectItem value="15">15 minutes</SelectItem>
                                            <SelectItem value="30">30 minutes</SelectItem>
                                            <SelectItem value="60">1 hour</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button variant="outline" className="h-9 w-full rounded-lg border-zinc-200" onClick={() => { setLayoutOptionsOpen(false); setCustomizePanelOpen(true); }}>
                                    Back to customize
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
