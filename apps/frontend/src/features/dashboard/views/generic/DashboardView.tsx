"use client";

import { useState, useMemo } from "react";
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
    Download,
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
    Mail,
    MessageSquare,
    ChevronDown,
    Eye,
    EyeOff,
    Trash2,
    Copy,
    Share2,
    Lock,
    Globe
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
    DropdownMenuCheckboxItem,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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

interface DashboardViewProps {
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    listId?: string;
    viewId?: string;
    initialConfig?: any;
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

interface DashboardFilter {
    status?: string[];
    priority?: string[];
    assignee?: string[];
    tags?: string[];
    customFields?: Record<string, any>;
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
    initialConfig
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

    const [dashboardFilters, setDashboardFilters] = useState<DashboardFilter>({});
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(30); // minutes
    const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [dashboardName, setDashboardName] = useState("Dashboard");
    const [sharePermission, setSharePermission] = useState<'private' | 'view' | 'edit'>('private');

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

    // Fetch data with filters
    const { data: tasksData, refetch: refetchTasks } = trpc.task.list.useQuery({
        spaceId,
        projectId,
        teamId,
        listId,
        ...dashboardFilters
    });

    const tasks = useMemo(() => tasksData?.items || [], [tasksData]);

    const { data: goals = [] } = trpc.goal.list.useQuery({ spaceId, projectId });
    const { data: timeEntries = [] } = trpc.timeTracking.list.useQuery({ spaceId, projectId });
    const { data: activities = [] } = trpc.activity.list.useQuery({ spaceId, projectId });

    // Auto-refresh logic
    useMemo(() => {
        if (autoRefresh) {
            const interval = setInterval(() => {
                refetchTasks();
            }, refreshInterval * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [autoRefresh, refreshInterval, refetchTasks]);

    // Calculate metrics
    const metrics = useMemo(() => {
        const total = tasks.length;
        const completed = tasks.filter(t => t.status?.name?.toLowerCase() === 'done').length;
        const inProgress = tasks.filter(t => t.status?.name?.toLowerCase() === 'in progress').length;
        const urgent = tasks.filter(t => t.priority === 'URGENT').length;
        const high = tasks.filter(t => t.priority === 'HIGH').length;
        const overdue = tasks.filter(t => {
            if (!t.dueDate) return false;
            return new Date(t.dueDate) < new Date() && t.status?.name?.toLowerCase() !== 'done';
        }).length;

        const statusBreakdown = tasks.reduce((acc, task) => {
            const status = task.status?.name || 'No Status';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const priorityBreakdown = tasks.reduce((acc, task) => {
            const priority = task.priority || 'No Priority';
            acc[priority] = (acc[priority] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const assigneeBreakdown = tasks.reduce((acc, task) => {
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
    }, [tasks]);

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
                        {tasks.slice(0, 8).map(task => (
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
                        {tasks.length === 0 && (
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

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-zinc-50 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-zinc-200 shadow-sm">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                                    <LayoutDashboard className="h-6 w-6 text-indigo-600" />
                                    {dashboardName}
                                </h2>
                                <p className="text-sm text-zinc-500 mt-0.5">
                                    Real-time insights and analytics
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Filters */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Filter className="h-4 w-4 mr-2" />
                                        Filters
                                        {Object.keys(dashboardFilters).length > 0 && (
                                            <Badge className="ml-2" variant="secondary">
                                                {Object.keys(dashboardFilters).length}
                                            </Badge>
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>Filter Dashboard</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuCheckboxItem>Status</DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem>Priority</DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem>Assignee</DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem>Due Date</DropdownMenuCheckboxItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Export */}
                            <Button variant="outline" size="sm" onClick={exportDashboard}>
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </Button>

                            {/* Share */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Share2 className="h-4 w-4 mr-2" />
                                        Share
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>Dashboard Sharing</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuCheckboxItem
                                        checked={sharePermission === 'private'}
                                        onCheckedChange={() => setSharePermission('private')}
                                    >
                                        <Lock className="h-4 w-4 mr-2" />
                                        Private
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={sharePermission === 'view'}
                                        onCheckedChange={() => setSharePermission('view')}
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Only
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={sharePermission === 'edit'}
                                        onCheckedChange={() => setSharePermission('edit')}
                                    >
                                        <Globe className="h-4 w-4 mr-2" />
                                        Can Edit
                                    </DropdownMenuCheckboxItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Settings */}
                            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Settings className="h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Dashboard Settings</DialogTitle>
                                        <DialogDescription>
                                            Customize your dashboard preferences
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Dashboard Name</Label>
                                            <Input
                                                value={dashboardName}
                                                onChange={(e) => setDashboardName(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>Auto Refresh</Label>
                                                <p className="text-xs text-zinc-500">
                                                    Automatically update dashboard data
                                                </p>
                                            </div>
                                            <Button
                                                variant={autoRefresh ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setAutoRefresh(!autoRefresh)}
                                            >
                                                {autoRefresh ? "On" : "Off"}
                                            </Button>
                                        </div>
                                        {autoRefresh && (
                                            <div className="space-y-2">
                                                <Label>Refresh Interval (minutes)</Label>
                                                <Select
                                                    value={refreshInterval.toString()}
                                                    onValueChange={(v) => setRefreshInterval(Number(v))}
                                                >
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
                                        )}
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button onClick={() => setIsSettingsOpen(false)}>
                                            Save Changes
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            {/* Add Widget */}
                            <Dialog open={isAddWidgetOpen} onOpenChange={setIsAddWidgetOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Card
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Add Dashboard Card</DialogTitle>
                                        <DialogDescription>
                                            Choose a card type to add to your dashboard
                                        </DialogDescription>
                                    </DialogHeader>
                                    <Tabs defaultValue="visualization" className="w-full">
                                        <TabsList className="grid w-full grid-cols-4">
                                            <TabsTrigger value="visualization">Charts</TabsTrigger>
                                            <TabsTrigger value="tasks">Tasks</TabsTrigger>
                                            <TabsTrigger value="tracking">Tracking</TabsTrigger>
                                            <TabsTrigger value="other">Other</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="visualization" className="space-y-3 mt-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                <Button
                                                    variant="outline"
                                                    className="h-auto flex-col items-start p-4 hover:border-indigo-500 hover:bg-indigo-50"
                                                    onClick={() => addWidget('pie-chart', 'Status Breakdown', { groupBy: 'status' })}
                                                >
                                                    <PieChart className="h-8 w-8 mb-2 text-indigo-600" />
                                                    <div className="font-semibold">Pie Chart</div>
                                                    <div className="text-xs text-zinc-500">Visual breakdown by category</div>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="h-auto flex-col items-start p-4 hover:border-indigo-500 hover:bg-indigo-50"
                                                    onClick={() => addWidget('bar-chart', 'Priority Distribution', { groupBy: 'priority' })}
                                                >
                                                    <BarChart3 className="h-8 w-8 mb-2 text-indigo-600" />
                                                    <div className="font-semibold">Bar Chart</div>
                                                    <div className="text-xs text-zinc-500">Compare values across groups</div>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="h-auto flex-col items-start p-4 hover:border-indigo-500 hover:bg-indigo-50"
                                                    onClick={() => addWidget('line-chart', 'Progress Over Time', { timeRange: 'month' })}
                                                >
                                                    <TrendingUp className="h-8 w-8 mb-2 text-indigo-600" />
                                                    <div className="font-semibold">Line Chart</div>
                                                    <div className="text-xs text-zinc-500">Track trends over time</div>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="h-auto flex-col items-start p-4 hover:border-indigo-500 hover:bg-indigo-50"
                                                    onClick={() => addWidget('battery-chart', 'Completion Progress', {})}
                                                >
                                                    <Activity className="h-8 w-8 mb-2 text-indigo-600" />
                                                    <div className="font-semibold">Battery Chart</div>
                                                    <div className="text-xs text-zinc-500">Progress visualization</div>
                                                </Button>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="tasks" className="space-y-3 mt-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                <Button
                                                    variant="outline"
                                                    className="h-auto flex-col items-start p-4 hover:border-indigo-500 hover:bg-indigo-50"
                                                    onClick={() => addWidget('my-tasks', 'My Tasks', {})}
                                                >
                                                    <User className="h-8 w-8 mb-2 text-indigo-600" />
                                                    <div className="font-semibold">My Tasks</div>
                                                    <div className="text-xs text-zinc-500">Tasks assigned to you</div>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="h-auto flex-col items-start p-4 hover:border-indigo-500 hover:bg-indigo-50"
                                                    onClick={() => addWidget('task-list', 'Task List', {})}
                                                >
                                                    <List className="h-8 w-8 mb-2 text-indigo-600" />
                                                    <div className="font-semibold">Custom Task List</div>
                                                    <div className="text-xs text-zinc-500">Filtered task list</div>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="h-auto flex-col items-start p-4 hover:border-indigo-500 hover:bg-indigo-50"
                                                    onClick={() => addWidget('completed-tasks', 'Completed Tasks', {})}
                                                >
                                                    <CheckCircle2 className="h-8 w-8 mb-2 text-indigo-600" />
                                                    <div className="font-semibold">Completed Tasks</div>
                                                    <div className="text-xs text-zinc-500">Recently finished tasks</div>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="h-auto flex-col items-start p-4 hover:border-indigo-500 hover:bg-indigo-50"
                                                    onClick={() => addWidget('workload', 'Team Workload', {})}
                                                >
                                                    <Users className="h-8 w-8 mb-2 text-indigo-600" />
                                                    <div className="font-semibold">Workload</div>
                                                    <div className="text-xs text-zinc-500">Team capacity overview</div>
                                                </Button>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="tracking" className="space-y-3 mt-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                <Button
                                                    variant="outline"
                                                    className="h-auto flex-col items-start p-4 hover:border-indigo-500 hover:bg-indigo-50"
                                                    onClick={() => addWidget('time-tracking', 'Time Tracking', {})}
                                                >
                                                    <Timer className="h-8 w-8 mb-2 text-indigo-600" />
                                                    <div className="font-semibold">Time Tracking</div>
                                                    <div className="text-xs text-zinc-500">Tracked time summary</div>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="h-auto flex-col items-start p-4 hover:border-indigo-500 hover:bg-indigo-50"
                                                    onClick={() => addWidget('goals', 'Goals', {})}
                                                >
                                                    <Target className="h-8 w-8 mb-2 text-indigo-600" />
                                                    <div className="font-semibold">Goals</div>
                                                    <div className="text-xs text-zinc-500">Goal progress tracking</div>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="h-auto flex-col items-start p-4 hover:border-indigo-500 hover:bg-indigo-50"
                                                    onClick={() => addWidget('sprint-burndown', 'Sprint Burndown', {})}
                                                >
                                                    <TrendingUp className="h-8 w-8 mb-2 text-indigo-600" />
                                                    <div className="font-semibold">Sprint Burndown</div>
                                                    <div className="text-xs text-zinc-500">Sprint progress chart</div>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="h-auto flex-col items-start p-4 hover:border-indigo-500 hover:bg-indigo-50"
                                                    onClick={() => addWidget('activity', 'Recent Activity', {})}
                                                >
                                                    <Zap className="h-8 w-8 mb-2 text-indigo-600" />
                                                    <div className="font-semibold">Activity Feed</div>
                                                    <div className="text-xs text-zinc-500">Recent workspace changes</div>
                                                </Button>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="other" className="space-y-3 mt-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                <Button
                                                    variant="outline"
                                                    className="h-auto flex-col items-start p-4 hover:border-indigo-500 hover:bg-indigo-50"
                                                    onClick={() => addWidget('summary', 'Summary Stats', {})}
                                                >
                                                    <Grid className="h-8 w-8 mb-2 text-indigo-600" />
                                                    <div className="font-semibold">Summary</div>
                                                    <div className="text-xs text-zinc-500">Key metrics overview</div>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="h-auto flex-col items-start p-4 hover:border-indigo-500 hover:bg-indigo-50"
                                                    onClick={() => addWidget('calculation', 'Calculation', {})}
                                                >
                                                    <Activity className="h-8 w-8 mb-2 text-indigo-600" />
                                                    <div className="font-semibold">Calculation</div>
                                                    <div className="text-xs text-zinc-500">Custom formulas</div>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="h-auto flex-col items-start p-4 hover:border-indigo-500 hover:bg-indigo-50"
                                                    onClick={() => addWidget('text-block', 'Text Block', {})}
                                                >
                                                    <FileText className="h-8 w-8 mb-2 text-indigo-600" />
                                                    <div className="font-semibold">Text Block</div>
                                                    <div className="text-xs text-zinc-500">Custom text content</div>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="h-auto flex-col items-start p-4 hover:border-indigo-500 hover:bg-indigo-50"
                                                    onClick={() => addWidget('embed', 'Embed', {})}
                                                >
                                                    <Globe className="h-8 w-8 mb-2 text-indigo-600" />
                                                    <div className="font-semibold">Embed</div>
                                                    <div className="text-xs text-zinc-500">External content</div>
                                                </Button>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="flex-1 p-6">
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
            </div>
        </div>
    );
}
