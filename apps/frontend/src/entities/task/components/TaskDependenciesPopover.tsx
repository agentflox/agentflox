'use client';
import * as React from 'react';
import { trpc } from '@/lib/trpc';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    CircleDashed, Plus, Calendar as CalendarIcon, Flag, User as UserIcon, CheckCircle2, MinusCircle,
    X, Clock, Hourglass, CircleDot, Hash, Users, Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';
import { TaskPickerPopover } from './TaskPickerPopover';
import { TaskTypeIcon } from '@/entities/task/components/TaskTypeIcon';
import { ColumnsPopover } from '@/features/dashboard/views/generic/ColumnsPopover';
import { toast } from 'sonner';

const DEPS_FIELD_CONFIG = [
    { id: 'status', label: 'Status', icon: CircleDot },
    { id: 'taskId', label: 'Task ID', icon: Hash },
    { id: 'dateCreated', label: 'Date created', icon: CalendarIcon },
    { id: 'dateUpdated', label: 'Date updated', icon: CalendarIcon },
    { id: 'dueDate', label: 'Due date', icon: CalendarIcon },
    { id: 'timeTracked', label: 'Time tracked', icon: Clock },
    { id: 'timeEstimate', label: 'Time estimate', icon: Hourglass },
    { id: 'priority', label: 'Priority', icon: Flag },
    { id: 'assignee', label: 'Assignee', icon: UserIcon },
    { id: 'taskType', label: 'Task Type', icon: CircleDashed },
];

interface TaskDependenciesPopoverProps {
    taskId: string;
    workspaceId: string;
    children: React.ReactNode;
}

export function TaskDependenciesPopover({ taskId, workspaceId, children }: TaskDependenciesPopoverProps) {
    const addTaskBtnRef = React.useRef<HTMLButtonElement>(null);
    const [open, setOpen] = React.useState(false);
    const [addTaskMenuOpen, setAddTaskMenuOpen] = React.useState(false);
    const [pickerType, setPickerType] = React.useState<'blocks' | 'blocked_by' | null>(null);
    const [pickerOpen, setPickerOpen] = React.useState(false);
    const [visibleColumns, setVisibleColumns] = React.useState<Set<string>>(new Set(['dueDate', 'priority', 'assignee']));
    const utils = trpc.useUtils();

    const toggleColumn = (colId: string) => {
        setVisibleColumns(prev => {
            const next = new Set(prev);
            if (next.has(colId)) next.delete(colId);
            else next.add(colId);
            return next;
        });
    };

    const { data: task, isLoading } = trpc.task.get.useQuery({ id: taskId }, {
        enabled: open && !!taskId,
    });

    const addDependency = trpc.task.addDependency.useMutation({
        onSuccess: () => {
            toast.success('Dependency added');
            utils.task.get.invalidate({ id: taskId });
            utils.task.list.invalidate();
        },
        onError: () => {
            toast.error('Failed to add dependency');
        }
    });

    const removeDependency = trpc.task.removeDependency.useMutation({
        onSuccess: () => {
            toast.success('Dependency removed');
            utils.task.get.invalidate({ id: taskId });
            utils.task.list.invalidate();
        },
        onError: () => {
            toast.error('Failed to remove dependency');
        }
    });

    const openPicker = (type: 'blocks' | 'blocked_by') => {
        setAddTaskMenuOpen(false); // close the dropdown first
        setTimeout(() => {
            setPickerType(type);
            setPickerOpen(true);
        }, 80);
    };

    const handleSelectTask = (id: string) => {
        if (!taskId || !pickerType) return;
        if (pickerType === 'blocks') {
            addDependency.mutate({ taskId: id, dependsOnId: taskId, type: 'FINISH_TO_START' });
        } else {
            addDependency.mutate({ taskId, dependsOnId: id, type: 'FINISH_TO_START' });
        }
        setPickerOpen(false);
        setPickerType(null);
    };

    const blockedDependencies = (task as any)?.blockedDependencies || [];
    const blockedByDependencies = ((task as any)?.dependencies || []).filter(
        (d: any) => d.type === 'FINISH_TO_START' || d.dependencyType === 'FINISH_TO_START'
    );
    const allDeps = [...blockedByDependencies, ...blockedDependencies];

    // ── Renderers ──────────────────────────────────────────────────────────────

    const renderDate = (dateStr: string | null | undefined, overdueCheck = false) => {
        if (!dateStr) return <span className="text-zinc-400">—</span>;
        const date = new Date(dateStr);
        const isOverdue = overdueCheck && isPast(date) && !isToday(date);
        return (
            <span className={cn('text-xs', isOverdue ? 'text-red-500' : 'text-zinc-600')}>
                {format(date, 'M/d/yy')}
            </span>
        );
    };

    const renderPriority = (priorityStr: string | null | undefined) => {
        if (!priorityStr) return <span className="text-zinc-400">—</span>;
        return (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm border border-zinc-200 bg-white">
                <div className={cn('flex items-center gap-1.5',
                    priorityStr === 'URGENT' ? 'text-red-500' :
                        priorityStr === 'HIGH' ? 'text-orange-500' :
                            priorityStr === 'NORMAL' ? 'text-blue-500' : 'text-zinc-400'
                )}>
                    <Flag className="h-3 w-3 fill-current" />
                </div>
                <span className="text-xs font-medium text-zinc-700">
                    {priorityStr.charAt(0) + priorityStr.slice(1).toLowerCase()}
                </span>
            </div>
        );
    };

    const renderAssignee = (assignees: any[]) => {
        if (!assignees || assignees.length === 0) return (
            <div className="h-6 w-6 rounded-full border border-dashed border-zinc-300 flex items-center justify-center">
                <Users className="h-3 w-3 text-zinc-400" />
            </div>
        );
        return (
            <div className="flex items-center -space-x-1.5">
                {assignees.slice(0, 4).map((a: any, i: number) => {
                    const u = a.user || a.aiAgent || a.agent;
                    if (!u) return null;
                    return (
                        <Avatar key={u.id || i} className="h-6 w-6 border-2 border-white ring-1 ring-zinc-100">
                            <AvatarImage src={u.image ?? u.avatar ?? undefined} />
                            <AvatarFallback className="text-[9px] bg-indigo-50 text-indigo-600">
                                {(u.name || 'U').substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    );
                })}
            </div>
        );
    };

    const renderStatus = (status: any) => {
        if (!status) return <span className="text-zinc-400">—</span>;
        return (
            <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[11px] font-medium truncate" style={{ backgroundColor: `${status.color}15`, color: status.color }}>
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: status.color }} />
                <span className="truncate">{status.name}</span>
            </div>
        );
    };

    const formatTime = (value: number | null | undefined, unit: 'minutes' | 'seconds' = 'minutes') => {
        if (!value) return <span className="text-zinc-400">—</span>;
        const totalMinutes = unit === 'seconds' ? Math.floor(value / 60) : value;
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h}h`;
        return `${m}m`;
    };

    const renderTaskRow = (dep: any, depTask: any, isBlockedBy: boolean) => (
        <div key={dep.id} className="flex items-center py-2 border-b border-zinc-50 hover:bg-zinc-50 group">
            {/* Sticky name column */}
            <div className="sticky left-0 z-10 bg-white group-hover:bg-zinc-50 flex-1 flex items-center gap-2 min-w-[220px] px-4 pr-3">
                {(() => {
                    const statusColor = depTask.status?.color || '#94a3b8';
                    const isDone = depTask.status?.name === 'Done' || depTask.status?.name === 'Complete' || depTask.status?.name === 'Closed';
                    if (depTask.taskType) return <TaskTypeIcon type={depTask.taskType} className="h-4 w-4 shrink-0" color={statusColor} />;
                    if (isDone) return <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: statusColor }} />;
                    return <CircleDashed className="h-4 w-4 shrink-0" style={{ color: statusColor }} />;
                })()}
                <Badge
                    variant="outline"
                    className={cn(
                        'h-5 px-1.5 text-xs font-normal flex items-center gap-1 shrink-0 shadow-none',
                        isBlockedBy
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-red-200 bg-red-50 text-red-700'
                    )}
                >
                    <MinusCircle className="h-3 w-3" />
                    {isBlockedBy ? 'Blocked by' : 'Blocks'}
                </Badge>
                <span className="text-sm text-zinc-900 truncate font-medium">{depTask.title || depTask.name}</span>
            </div>

            {visibleColumns.has('status') && (
                <div className="w-28 flex items-center shrink-0 pr-2">{renderStatus(depTask.status)}</div>
            )}
            {visibleColumns.has('taskId') && (
                <div className="w-20 flex items-center shrink-0">
                    <div className="flex items-center gap-1 min-w-0 group/taskid">
                        <span className="text-xs text-zinc-500 font-mono truncate max-w-[50px] shrink-0">
                            #{depTask.shortId || depTask.id?.slice(0, 7)}
                        </span>
                        <button
                            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(depTask.shortId || depTask.id); toast.success('Task ID copied'); }}
                            className="opacity-0 group-hover/taskid:opacity-100 transition-opacity flex items-center justify-center h-5 w-5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 shrink-0 cursor-pointer"
                        >
                            <Copy className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            )}
            {visibleColumns.has('dateCreated') && (
                <div className="w-24 flex items-center shrink-0">{renderDate(depTask.createdAt)}</div>
            )}
            {visibleColumns.has('dateUpdated') && (
                <div className="w-24 flex items-center shrink-0">{renderDate(depTask.updatedAt)}</div>
            )}
            {visibleColumns.has('dueDate') && (
                <div className="w-24 flex items-center shrink-0">{renderDate(depTask.dueDate, true)}</div>
            )}
            {visibleColumns.has('timeTracked') && (
                <div className="w-24 flex items-center shrink-0">
                    <span className="text-xs text-zinc-600">{formatTime(depTask.timeTracked, 'seconds')}</span>
                </div>
            )}
            {visibleColumns.has('timeEstimate') && (
                <div className="w-24 flex items-center shrink-0">
                    <span className="text-xs text-zinc-600">{formatTime(depTask.timeEstimate, 'minutes')}</span>
                </div>
            )}
            {visibleColumns.has('priority') && (
                <div className="w-28 flex items-center shrink-0 pr-2">{renderPriority(depTask.priority)}</div>
            )}
            {visibleColumns.has('assignee') && (
                <div className="w-20 flex items-center shrink-0">{renderAssignee(depTask.assignees)}</div>
            )}
            {visibleColumns.has('taskType') && (
                <div className="w-24 flex items-center shrink-0 pr-2">
                    {depTask.taskType ? (
                        <div className="flex items-center gap-1.5 truncate">
                            <TaskTypeIcon type={depTask.taskType} className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            <span className="text-xs text-zinc-600 truncate">
                                {depTask.taskType.charAt(0) + depTask.taskType.slice(1).toLowerCase().replace('_', ' ')}
                            </span>
                        </div>
                    ) : <span className="text-zinc-400">—</span>}
                </div>
            )}

            {/* Sticky remove button */}
            <div className="sticky right-0 z-10 bg-white group-hover:bg-zinc-50 w-8 flex justify-center shrink-0 pl-2 pr-2">
                <button
                    onClick={() => removeDependency.mutate({ taskId: dep.taskId, dependsOnId: dep.dependsOnId })}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-200 rounded text-zinc-400 hover:text-zinc-700 transition-opacity cursor-pointer"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    {children}
                </PopoverTrigger>
                <PopoverContent
                    className="w-[580px] p-0 rounded-xl shadow-xl z-[150]"
                    align="start"
                    sideOffset={8}
                    onInteractOutside={(e) => {
                        if (pickerOpen) e.preventDefault();
                    }}
                    onFocusOutside={(e) => {
                        if (pickerOpen) e.preventDefault();
                    }}
                >
                    <div className="flex flex-col">
                        {/* Scrollable table area */}
                        <div className="overflow-auto max-h-[280px]">
                            <div style={{ minWidth: 'max-content' }}>
                                {/* Sticky header */}
                                <div className="flex items-center py-2 border-b border-zinc-100 bg-white sticky top-0 z-20">
                                    <div className="sticky left-0 z-30 bg-white flex-1 text-xs font-semibold text-zinc-800 min-w-[220px] px-4 pr-3">
                                        Dependencies
                                    </div>
                                    {visibleColumns.has('status') && <div className="w-28 text-xs font-medium text-zinc-500 shrink-0">Status</div>}
                                    {visibleColumns.has('taskId') && <div className="w-20 text-xs font-medium text-zinc-500 shrink-0">Task ID</div>}
                                    {visibleColumns.has('dateCreated') && <div className="w-24 text-xs font-medium text-zinc-500 shrink-0">Date created</div>}
                                    {visibleColumns.has('dateUpdated') && <div className="w-24 text-xs font-medium text-zinc-500 shrink-0">Date updated</div>}
                                    {visibleColumns.has('dueDate') && <div className="w-24 text-xs font-medium text-zinc-500 shrink-0">Due date</div>}
                                    {visibleColumns.has('timeTracked') && <div className="w-24 text-xs font-medium text-zinc-500 shrink-0">Time tracked</div>}
                                    {visibleColumns.has('timeEstimate') && <div className="w-24 text-xs font-medium text-zinc-500 shrink-0">Time estimate</div>}
                                    {visibleColumns.has('priority') && <div className="w-28 text-xs font-medium text-zinc-500 shrink-0 pr-2">Priority</div>}
                                    {visibleColumns.has('assignee') && <div className="w-20 text-xs font-medium text-zinc-500 shrink-0">Assignee</div>}
                                    {visibleColumns.has('taskType') && <div className="w-24 text-xs font-medium text-zinc-500 shrink-0">Task Type</div>}
                                    {/* Sticky + column picker */}
                                    <div className="sticky right-0 z-30 bg-white w-8 flex justify-center pl-2">
                                        <ColumnsPopover fieldConfig={DEPS_FIELD_CONFIG} visibleColumns={visibleColumns} toggleColumn={toggleColumn}>
                                            <button className="h-6 w-6 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded transition-colors cursor-pointer">
                                                <Plus className="h-4 w-4" />
                                            </button>
                                        </ColumnsPopover>
                                    </div>
                                </div>

                                {/* Rows */}
                                <div className="flex flex-col">
                                    {isLoading ? (
                                        <div className="p-4 text-xs text-zinc-500 text-center">Loading dependencies...</div>
                                    ) : allDeps.length === 0 ? (
                                        <div className="p-4 text-xs text-zinc-500 text-center">No dependencies.</div>
                                    ) : (
                                        <>
                                            {blockedByDependencies.map((dep: any) => renderTaskRow(dep, dep.dependsOn, true))}
                                            {blockedDependencies.map((dep: any) => renderTaskRow(dep, dep.task, false))}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-2 border-t border-zinc-100 bg-zinc-50/50 rounded-b-xl flex items-center justify-between">
                            <DropdownMenu open={addTaskMenuOpen} onOpenChange={setAddTaskMenuOpen}>
                                <DropdownMenuTrigger asChild>
                                    <Button ref={addTaskBtnRef} variant="ghost" size="sm" className="h-7 text-xs text-zinc-600 hover:text-zinc-900 px-2 font-medium">
                                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add task
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-56 p-2 rounded-xl shadow-lg border-zinc-200 z-[160]" sideOffset={8}>
                                    <DropdownMenuLabel className="text-xs font-normal text-zinc-500">Add link</DropdownMenuLabel>
                                    <DropdownMenuItem
                                        className="py-2 px-3 rounded-lg cursor-pointer flex flex-col items-start focus:bg-zinc-100"
                                        onSelect={(e) => { e.preventDefault(); openPicker('blocked_by'); }}
                                    >
                                        <div className="flex items-center gap-2 font-medium text-zinc-900">
                                            <MinusCircle className="h-4 w-4 text-amber-500" /> Blocked by
                                        </div>
                                        <span className="text-xs text-zinc-500 whitespace-normal">Tasks that must be completed before this task</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="py-2 px-3 rounded-lg cursor-pointer flex flex-col items-start focus:bg-zinc-100 mt-1"
                                        onSelect={(e) => { e.preventDefault(); openPicker('blocks'); }}
                                    >
                                        <div className="flex items-center gap-2 font-medium text-zinc-900">
                                            <MinusCircle className="h-4 w-4 text-red-500" /> Blocks
                                        </div>
                                        <span className="text-xs text-zinc-500 whitespace-normal">Tasks that can't start until this task is completed</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <span className="text-[10px] text-zinc-400 font-medium px-2">Create new</span>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            {/* Task pickers rendered outside the main popover so they show on top */}
            <TaskPickerPopover
                open={pickerOpen && pickerType === 'blocked_by'}
                onOpenChange={(o) => { if (!o) { setPickerOpen(false); setPickerType(null); } }}
                taskId={taskId}
                workspaceId={workspaceId}
                dependencyType="FINISH_TO_START"
                onSelect={handleSelectTask}
                anchorRef={addTaskBtnRef}
                side="bottom"
                align="start"
            />
            <TaskPickerPopover
                open={pickerOpen && pickerType === 'blocks'}
                onOpenChange={(o) => { if (!o) { setPickerOpen(false); setPickerType(null); } }}
                taskId={taskId}
                workspaceId={workspaceId}
                dependencyType="FINISH_TO_START"
                onSelect={handleSelectTask}
                anchorRef={addTaskBtnRef}
                side="bottom"
                align="start"
            />
        </>
    );
}
