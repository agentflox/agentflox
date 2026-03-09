"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ChevronLeft, ChevronRight, Plus, Filter, Settings, Users, Clock, Search, Layout,
    ChevronDown, MoreHorizontal, Calendar as CalendarIcon, CheckCircle2, X,
    ListFilter, ArrowUpDown, Settings2, User, Check, ChevronsUpDown, CalendarDays,
    MoreVertical, AlertCircle, Clock3, Ban
} from "lucide-react";
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
import { TaskDetailModal } from "@/entities/task/components/TaskDetailModal";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addDays, subDays, startOfDay, endOfDay, isToday as isTodayFns, isSameDay, getWeek, startOfWeek, endOfWeek } from "date-fns";
import { FILTER_OPTIONS, FIELD_OPERATORS, STANDARD_FIELD_CONFIG } from "./listViewConstants";
import { evaluateGroup, hasFilterValue, hasAnyValueInGroup } from "./filterUtils";
import type { FilterGroup } from "./listViewTypes";

interface CalendarViewProps {
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    listId?: string;
    viewId?: string;
    onTaskSelect?: (taskId: string | null) => void;
}

export function CalendarView({ spaceId, projectId, teamId, listId, viewId, onTaskSelect }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedDateForNewTask, setSelectedDateForNewTask] = useState<Date | null>(null);

    // View States
    const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
    const [customizeMenuOpen, setCustomizeMenuOpen] = useState(false);
    const [showWeekends, setShowWeekends] = useState(true);
    const [showClosed, setShowClosed] = useState(false);
    const [filterGroups, setFilterGroups] = useState<FilterGroup>({
        id: "root",
        operator: "AND",
        conditions: [],
    });

    const { data: tasksData, isLoading } = trpc.task.list.useQuery({
        spaceId,
        projectId,
        teamId,
        listId,
        includeRelations: true,
        page: 1,
        pageSize: 1000,
    }, {
        enabled: !!(spaceId || projectId || teamId || listId),
    });

    const tasks = useMemo(() => (tasksData?.items || []) as any[], [tasksData]);

    // Filtering logic
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            if (!showClosed && task.status?.type === 'CLOSED') return false;
            return evaluateGroup(filterGroups, task);
        });
    }, [tasks, filterGroups, showClosed]);

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

    const unscheduledTasks = useMemo(() => {
        return tasks.filter(t => !t.dueDate && t.status?.type !== 'CLOSED');
    }, [tasks]);

    const overdueTasks = useMemo(() => {
        const now = new Date();
        return filteredTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status?.type !== 'CLOSED');
    }, [filteredTasks]);

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
        }
        return [currentDate];
    }, [currentDate, viewMode]);

    const navigate = (direction: number) => {
        if (viewMode === "month") {
            setCurrentDate(addDays(currentDate, direction * 30));
        } else if (viewMode === "week") {
            setCurrentDate(addDays(currentDate, direction * 7));
        } else {
            setCurrentDate(addDays(currentDate, direction));
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'URGENT': return 'bg-red-500';
            case 'HIGH': return 'bg-orange-500';
            case 'NORMAL': return 'bg-blue-500';
            case 'LOW': return 'bg-zinc-400';
            default: return 'bg-zinc-200';
        }
    };

    const renderFilterContent = () => (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-zinc-900">Filters</h4>
                <button className="text-[11px] text-zinc-500 hover:text-zinc-900 font-medium" onClick={() => setFilterGroups({ id: "root", operator: "AND", conditions: [] })}>
                    Clear all
                </button>
            </div>
            {/* Simple filter implementation for now */}
            <div className="text-xs text-zinc-500 italic">Advanced filtering shared with List View</div>
        </div>
    );

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-white rounded-xl border border-zinc-200">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-800" />
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Loading Calendar...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden text-[13px]">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 bg-white min-h-[52px] gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="h-8 font-bold text-zinc-600 border-zinc-200 shadow-none hover:bg-zinc-50 px-3.5 rounded-lg transition-colors" onClick={() => setCurrentDate(new Date())}>
                        Today
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 font-bold text-zinc-600 border-zinc-200 shadow-none hover:bg-zinc-50 gap-2 px-3 rounded-lg transition-colors capitalize">
                                {viewMode}
                                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-32">
                            <DropdownMenuItem onClick={() => setViewMode("day")}>Day</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setViewMode("week")}>Week</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setViewMode("month")}>Month</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex items-center gap-1 ml-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900" onClick={() => navigate(-1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900" onClick={() => navigate(1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <h2 className="text-sm font-black text-zinc-800 ml-2 tracking-tight">
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                </div>

                <div className="flex items-center gap-2">
                    <Popover open={filtersPanelOpen} onOpenChange={setFiltersPanelOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-2 px-3 text-zinc-600 font-bold border-zinc-200 shadow-none rounded-lg transition-colors">
                                <ListFilter className="h-3.5 w-3.5" />
                                Filter
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-80 p-0 shadow-2xl rounded-xl border border-zinc-200/80">
                            {renderFilterContent()}
                        </PopoverContent>
                    </Popover>

                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "h-8 gap-2 px-3 font-bold border-zinc-200 shadow-none rounded-lg transition-colors",
                            showClosed ? "bg-violet-50 text-violet-700 border-violet-200" : "text-zinc-600"
                        )}
                        onClick={() => setShowClosed(!showClosed)}
                    >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Closed
                    </Button>

                    <Button variant="outline" size="sm" className="h-8 gap-2 px-3 text-zinc-600 font-bold border-zinc-200 shadow-none rounded-lg transition-colors">
                        <Users className="h-3.5 w-3.5" />
                        Assignee
                        <div className="h-5 w-5 rounded-full bg-zinc-700 flex items-center justify-center text-[9px] text-white font-bold ml-1">Đ</div>
                    </Button>

                    <div className="h-6 w-[1px] bg-zinc-200 mx-1" />

                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900 rounded-lg transition-colors">
                        <Search className="h-4 w-4" />
                    </Button>

                    <Button variant="outline" size="sm" className="h-8 gap-2 text-zinc-600 font-bold border-zinc-200 shadow-none hover:bg-zinc-50 px-3 rounded-lg transition-colors" onClick={() => setCustomizeMenuOpen(true)}>
                        <Settings2 className="h-3.5 w-3.5" />
                        Customize
                    </Button>

                    <div className="flex items-center rounded-lg overflow-hidden shadow-sm border border-zinc-900 ml-1">
                        <Button className="h-8 bg-zinc-900 text-white hover:bg-black font-bold px-4 rounded-none border-r border-white/10" onClick={() => setIsCreateModalOpen(true)}>
                            Add Task
                        </Button>
                        <Button size="icon" className="h-8 w-8 bg-zinc-900 text-white hover:bg-black rounded-none transition-colors">
                            <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    <Button variant="outline" size="sm" className="h-8 gap-2 text-zinc-600 font-bold border-zinc-200 shadow-none px-3 rounded-lg transition-colors ml-2">
                        <Layout className="h-3.5 w-3.5" />
                        Backlog
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Calendar Grid */}
                <div className="flex-1 flex flex-col min-w-0 bg-white">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 border-b border-zinc-200 bg-white">
                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                            <div key={day} className="px-3 py-2 text-[11px] font-black text-zinc-900 border-r border-zinc-100 last:border-r-0">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 overflow-auto">
                        <div className="grid grid-cols-7 auto-rows-[minmax(140px,1fr)]">
                            {calendarDays.map((date, i) => {
                                const dateKey = format(date, 'yyyy-MM-dd');
                                const dayTasks = tasksByDate.get(dateKey) || [];
                                const isCurrent = isTodayFns(date);
                                const isSelectedMonth = date.getMonth() === currentDate.getMonth();

                                return (
                                    <div
                                        key={i}
                                        className={cn(
                                            "border-r border-b border-zinc-100 p-2 group transition-all flex flex-col gap-1 relative min-h-[140px]",
                                            !isSelectedMonth && "bg-zinc-50/30",
                                            isCurrent && "ring-inset ring-2 ring-zinc-900 z-10"
                                        )}
                                        onClick={() => {
                                            setSelectedDateForNewTask(date);
                                            setIsCreateModalOpen(true);
                                        }}
                                    >
                                        <div className="flex-1 space-y-1 overflow-hidden pb-6">
                                            {dayTasks.map((task) => {
                                                const statusColor = task.status?.color || "#a1a1aa";
                                                return (
                                                    <div
                                                        key={task.id}
                                                        className={cn(
                                                            "px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer flex items-center gap-2 truncate",
                                                            "hover:opacity-80"
                                                        )}
                                                        style={{
                                                            backgroundColor: `${statusColor}20`,
                                                            borderLeft: `3px solid ${statusColor}`
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onTaskSelect ? onTaskSelect(task.id) : setSelectedTaskId(task.id);
                                                        }}
                                                    >
                                                        <span className="truncate">{task.title || task.name}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="absolute bottom-1 right-2 pointer-events-none">
                                            <span className={cn(
                                                "text-[12px] font-medium transition-all",
                                                isCurrent ? "font-black text-zinc-900" :
                                                    isSelectedMonth ? "text-zinc-500" : "text-zinc-300"
                                            )}>
                                                {format(date, 'd')}
                                            </span>
                                        </div>

                                        <button className="absolute bottom-2 left-2 h-6 w-6 rounded-md bg-zinc-900 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center scale-90 group-hover:scale-100 shadow-md z-20" onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedDateForNewTask(date);
                                            setIsCreateModalOpen(true);
                                        }}>
                                            <Plus className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Unscheduled & Overdue */}
                <div className="w-[48px] border-l border-zinc-200 bg-white flex flex-col items-center py-6 gap-8 shrink-0 z-10 shadow-[-1px_0_4px_rgba(0,0,0,0.02)]">
                    <div className="flex flex-col items-center gap-2 group cursor-pointer relative" title="Unscheduled Tasks">
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

                    <div className="mt-auto mb-4 p-2.5 rounded-xl hover:bg-zinc-50 transition-colors cursor-pointer text-zinc-300 hover:text-zinc-600">
                        <MoreVertical className="h-5 w-5" />
                    </div>
                </div>
            </div>

            {/* Modals */}
            <TaskDetailModal
                taskId={selectedTaskId || ""}
                open={!!selectedTaskId}
                onOpenChange={(open) => !open && (onTaskSelect ? onTaskSelect(null) : setSelectedTaskId(null))}
            />

            <TaskCreationModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                initialDate={selectedDateForNewTask || undefined}
                spaceId={spaceId}
                projectId={projectId}
                listId={listId}
            />
        </div>
    );
}
