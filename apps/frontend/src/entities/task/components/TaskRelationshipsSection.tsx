'use client';

import * as React from 'react';
import {
    Repeat, Maximize2, Minimize2, ChevronRight, Plus, MinusCircle, AlertTriangle, ArrowLeftRight, CheckCircle2, CircleDashed, FileText, CircleDot, PlusCircle, Columns, Calendar, CalendarCheck, CalendarClock, CalendarDays, Timer, Clock, Hourglass, Hash, MoreHorizontal, FoldVertical, UnfoldVertical, X, Flag, Settings2, PenOff, Copy, CircleSlash, Play
} from 'lucide-react';
import { TaskStatusPopover } from './TaskStatusPopover';
import { TaskTypeIcon } from './TaskTypeIcon';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { format } from 'date-fns';
import { TaskPickerPopover } from './TaskPickerPopover';
import { TaskDocPickerPopover } from './TaskDocPickerPopover';
import { DocPickerPopover } from './DocPickerPopover';
import { NewCustomRelationshipPopover } from './NewCustomRelationshipPopover';
import { EditCustomRelationshipPopover } from './EditCustomRelationshipPopover';
import { TaskCalendar } from './TaskCalendar';
import { AssigneeSelector } from './AssigneeSelector';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TaskTimeTrackedPopover } from './TaskTimeTrackedPopover';
import { getCustomFieldValue } from '@/features/dashboard/views/generic/filterUtils';
import { toast } from 'sonner';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const AVAILABLE_COLUMNS = [
    { id: 'status', label: 'Status', icon: <CircleDot className="w-3.5 h-3.5 text-zinc-400" /> },
    { id: 'taskId', label: 'Task ID', icon: <Hash className="w-3.5 h-3.5 text-zinc-400" /> },
    { id: 'customTaskId', label: 'Custom Task ID', icon: <Hash className="w-3.5 h-3.5 text-zinc-400" /> },
    { id: 'dateCreated', label: 'Date created', icon: <Calendar className="w-3.5 h-3.5 text-zinc-400" /> },
    { id: 'dateDone', label: 'Date done', icon: <CalendarCheck className="w-3.5 h-3.5 text-zinc-400" /> },
    { id: 'dateUpdated', label: 'Date updated', icon: <CalendarClock className="w-3.5 h-3.5 text-zinc-400" /> },
    { id: 'startDate', label: 'Start date', icon: <Calendar className="w-3.5 h-3.5 text-zinc-400" /> },
    { id: 'dueDate', label: 'Due date', icon: <CalendarDays className="w-3.5 h-3.5 text-violet-500" /> },
    { id: 'duration', label: 'Duration', icon: <Timer className="w-3.5 h-3.5 text-zinc-400" /> },
    { id: 'timeTracked', label: 'Time tracked', icon: <Clock className="w-3.5 h-3.5 text-zinc-400" /> },
    { id: 'timeEstimate', label: 'Time estimate', icon: <Hourglass className="w-3.5 h-3.5 text-zinc-400" /> },
    { id: 'priority', label: 'Priority', icon: <Flag className="w-3.5 h-3.5 text-zinc-400" /> },
];

const PRIORITY_COLORS: Record<string, string> = {
    URGENT: 'text-red-600',
    HIGH: 'text-orange-600',
    NORMAL: 'text-zinc-600',
    LOW: 'text-zinc-400',
};

interface TaskRelationshipsSectionProps {
    taskId: string;
    workspaceId: string;
    task?: any;
}

export function TaskRelationshipsSection({ taskId, workspaceId, task }: TaskRelationshipsSectionProps) {
    const [isMaximized, setIsMaximized] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<string>('related');
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const openTask = (id: string) => {
        if (!id) return;
        const params = new URLSearchParams(searchParams.toString());
        params.set('task', id);
        router.push(`${pathname}?${params.toString()}`);
    };

    // Popovers state
    const [docPickerOpen, setDocPickerOpen] = React.useState(false);
    const [taskPickerOpen, setTaskPickerOpen] = React.useState(false);
    const [docOnlyPickerOpen, setDocOnlyPickerOpen] = React.useState(false);
    const [blocksPickerOpen, setBlocksPickerOpen] = React.useState(false);
    const [blockedByPickerOpen, setBlockedByPickerOpen] = React.useState(false);
    const [customRelAnchor, setCustomRelAnchor] = React.useState<'header' | 'empty' | null>(null);
    const [customRelPickerRelId, setCustomRelPickerRelId] = React.useState<string | null>(null);
    const [customRelPickerOpen, setCustomRelPickerOpen] = React.useState(false);
    const [editCustomRelOpen, setEditCustomRelOpen] = React.useState(false);

    const handleSelectTask = (id: string, type: string, customRelationshipId?: string) => {
        if (type === 'blocks') {
            // id blocks current task => id.taskId=id, id.dependsOnId=taskId
            addDependency.mutate({ taskId: id, dependsOnId: taskId, type: 'FINISH_TO_START' });
        } else if (type === 'blocked_by') {
            // current task is blocked by id => taskId=taskId, dependsOnId=id
            addDependency.mutate({ taskId: taskId, dependsOnId: id, type: 'FINISH_TO_START' });
        } else if (type === 'related') {
            addDependency.mutate({ taskId: taskId, dependsOnId: id, type: 'FINISH_TO_FINISH' });
        } else if (type === 'custom' && customRelationshipId) {
            addDependency.mutate({ taskId: taskId, dependsOnId: id, type: 'FINISH_TO_FINISH', customRelationshipId });
        }
    };

    const handleSelectDocOrTask = (item: { type: "TASK" | "DOCUMENT", id: string }) => {
        console.log("Selected", item);
    };

    const utils = trpc.useUtils();

    const { data: statuses = [] } = trpc.taskStatus.list.useQuery(
        { workspaceId: workspaceId || '' },
        { enabled: !!workspaceId }
    );

    const { data: availableTaskTypes = [] } = trpc.task.listTaskTypes.useQuery(
        { workspaceId: workspaceId || undefined },
        { enabled: !!workspaceId }
    );

    const updateTask = trpc.task.update.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
        }
    });

    const { data: customRelationships } = trpc.taskCustomRelationships.list.useQuery(
        { workspaceId },
        { enabled: !!workspaceId }
    );

    const addDependency = trpc.task.addDependency.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
        }
    });

    const removeDependency = trpc.task.removeDependency.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
        }
    });

    // Calculate items
    const blockedByItems = task?.dependencies?.filter((d: any) => d.type === 'FINISH_TO_START' || d.dependencyType === 'FINISH_TO_START') || [];
    const relatedTasks = task?.dependencies?.filter((d: any) => d.type !== 'FINISH_TO_START' && d.dependencyType !== 'FINISH_TO_START' && !d.customRelationshipId) || [];
    const blocksItems = task?.blockedDependencies || [];
    const docLinks = task?.attachments?.filter((a: any) => a.mimeType === 'doc_link') || [];
    const taskLinks = task?.attachments?.filter((a: any) => a.mimeType === 'link') || [];

    const totalRelated = relatedTasks.length + docLinks.length + taskLinks.length;
    const totalDependencies = blocksItems.length + blockedByItems.length;
    const customRelTasksCount = task?.dependencies?.filter((d: any) => d.customRelationshipId)?.length || 0;
    const totalItems = totalRelated + totalDependencies + customRelTasksCount;

    const renderStatusIcon = (targetTask: any) => {
        if (!targetTask) return <CircleDot className="h-4 w-4 text-blue-500 shrink-0" />;

        return (
            <TooltipProvider>
                <Tooltip delayDuration={300}>
                    <TaskStatusPopover
                        task={targetTask}
                        availableStatuses={statuses}
                        availableTaskTypes={availableTaskTypes}
                        onUpdateTask={(id, data) => updateTask.mutate({ id, ...data })}
                    >
                        <TooltipTrigger asChild>
                            <button className="shrink-0 flex items-center justify-center h-6 w-6 rounded transition-all duration-150 cursor-pointer hover:bg-zinc-200/80 outline-none focus:outline-none" onClick={(e) => e.stopPropagation()}>
                                {(() => {
                                    const tt = targetTask.taskType || availableTaskTypes?.find((t: any) => t.isDefault) || availableTaskTypes?.[0];
                                    const isDefault = !tt || tt.name?.toLowerCase() === "task" || tt.isDefault || tt === 'TASK';
                                    const statusName = targetTask.status?.name?.toLowerCase() || "";
                                    const statusColor = targetTask.status?.color || (statusName.includes("done") || statusName.includes("complete") ? "#10B981" : statusName.includes("progress") || statusName.includes("doing") ? "#3B82F6" : "#94A3B8");

                                    if (isDefault) {
                                        if (statusName.includes("done") || statusName.includes("complete")) return <CheckCircle2 className="h-4 w-4" style={{ color: statusColor }} />;
                                        if (statusName.includes("progress") || statusName.includes("doing")) return <CircleDot className="h-4 w-4" style={{ color: statusColor }} />;
                                        return <CircleDashed className="h-4 w-4" style={{ color: statusColor }} />;
                                    }

                                    const resolvedTt = typeof tt === 'string' ? availableTaskTypes?.find((t: any) => t.id === tt || t.name === tt) || tt : tt;
                                    return <TaskTypeIcon type={resolvedTt} className="h-4 w-4" size={16} color={statusColor} />;
                                })()}
                            </button>
                        </TooltipTrigger>
                    </TaskStatusPopover>
                    <TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>
                        <span style={{ color: targetTask.status?.color || '#fff' }}>{targetTask.status?.name?.toUpperCase() || "NO STATUS"}</span>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    };

    // Determine the effective active tab, gracefully falling back if the current activeTab has no items
    const availableTabs = [
        ...(totalRelated > 0 ? ['related'] : []),
        ...(totalDependencies > 0 ? ['dependencies'] : []),
        ...(customRelationships || [])
            .filter((rel: any) => (task?.dependencies?.filter((d: any) => d.customRelationshipId === rel.id)?.length || 0) > 0)
            .map((rel: any) => rel.id)
    ];
    const effectiveActiveTab = availableTabs.includes(activeTab) ? activeTab : (availableTabs[0] || 'related');

    const [tasksCollapsed, setTasksCollapsed] = React.useState(false);
    const [docsCollapsed, setDocsCollapsed] = React.useState(false);
    const [blocksCollapsed, setBlocksCollapsed] = React.useState(false);
    const [blockedByCollapsed, setBlockedByCollapsed] = React.useState(false);
    const [taskColumns, setTaskColumns] = React.useState<string[]>(['dueDate', 'priority']);

    const formatCustomFieldValue = (value: any, customField: any): string => {
        if (value === null || value === undefined) return '\u2014';
        const fieldType = customField?.type || customField?.config?.fieldType;
        switch (fieldType) {
            case 'TEXT': case 'TEXT_AREA': case 'LONG_TEXT': case 'CUSTOM_TEXT': case 'EMAIL': case 'PHONE': case 'URL':
                return String(value);
            case 'NUMBER': case 'MONEY':
                return typeof value === 'number' ? value.toLocaleString() : String(value);
            case 'DATE':
                try { return format(new Date(value), 'MMM d, yyyy'); } catch { return String(value); }
            case 'CHECKBOX':
                return value ? 'Yes' : 'No';
            case 'DROPDOWN': case 'CUSTOM_DROPDOWN': case 'LABELS':
                if (typeof value === 'string') return value;
                if (Array.isArray(value)) return value.join(', ');
                return String(value);
            default:
                return String(value);
        }
    };

    const renderTaskCell = (dep: any, colId: string) => {
        const t = dep.dependsOn || dep.task || dep;
        if (!t) return null;

        const updateDepTask = (data: any) => updateTask.mutate({ id: t.id, ...data });

        const readOnlyCell = (value: React.ReactNode) => (
            <div className="w-full h-full min-h-[32px] flex items-center justify-between px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 transition-shadow group/readonly text-xs text-zinc-500 cursor-default" onClick={(e) => e.stopPropagation()}>
                <div className="truncate">{value}</div>
                <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><div className="opacity-0 group-hover/readonly:opacity-100 transition-opacity flex items-center justify-center h-6 w-6 rounded-md bg-zinc-100 hover:bg-zinc-200 cursor-default shrink-0" onClick={(e) => e.stopPropagation()}><PenOff className="h-3.5 w-3.5 text-zinc-500" /></div></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>Read-only</TooltipContent></Tooltip></TooltipProvider>
            </div>
        );

        if (colId === 'status') {
            const getStatusStyles = (s: string) => {
                const lower = (s || '').toLowerCase();
                if (lower === 'done' || lower === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                if (lower === 'in progress' || lower === 'in_progress') return 'bg-blue-50 text-blue-700 border-blue-200';
                return 'bg-slate-50 text-slate-700 border-slate-200';
            };
            return (
                <TaskStatusPopover task={t} availableStatuses={statuses} availableTaskTypes={availableTaskTypes} onUpdateTask={(id, data) => updateDepTask(data)} hideTaskTypeTab={true}>
                    <button type="button" className={cn('w-full h-full min-h-[32px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-visible:ring-indigo-500 data-[state=open]:ring-indigo-500 transition-shadow cursor-pointer text-xs font-medium')} onClick={(e) => e.stopPropagation()} title="Edit status">
                        <div className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded border', getStatusStyles(t.status?.name || ''))}>
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.status?.color || '#94A3B8' }} />
                            {t.status?.name || 'No Status'}
                        </div>
                    </button>
                </TaskStatusPopover>
            );
        }

        if (colId === 'dueDate') {
            const dueInfo = (() => {
                const date = t.dueDate ?? null;
                if (!date) return null;
                const d = new Date(date);
                if (Number.isNaN(d.getTime())) return null;
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const due = new Date(d); due.setHours(0, 0, 0, 0);
                const days = Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
                if (days < 0) return { text: `${Math.abs(days)} days ago`, color: 'text-red-600 font-medium' };
                if (days === 0) return { text: 'Today', color: 'text-indigo-600 font-medium' };
                if (days === 1) return { text: 'Tomorrow', color: 'text-orange-600' };
                if (days < 7) return { text: d.toLocaleDateString('en-US', { weekday: 'short' }), color: 'text-indigo-600' };
                return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: 'text-zinc-500' };
            })();
            return (
                <Popover><PopoverTrigger asChild><button type="button" className={cn('text-xs w-full h-full min-h-[32px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-visible:ring-indigo-500 data-[state=open]:ring-indigo-500 transition-shadow cursor-pointer', dueInfo ? dueInfo.color : 'text-zinc-400')} onClick={(e) => e.stopPropagation()} title="Edit due date">{dueInfo ? dueInfo.text : 'Add Date'}</button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start" sideOffset={8} collisionPadding={10}><TaskCalendar startDate={t.startDate ? new Date(t.startDate) : undefined} endDate={t.dueDate ? new Date(t.dueDate) : undefined} onStartDateChange={(date) => updateDepTask({ startDate: date ? date.toISOString() : null })} onEndDateChange={(date) => updateDepTask({ dueDate: date ? date.toISOString() : null })} /></PopoverContent></Popover>
            );
        }

        if (colId === 'startDate') {
            return (
                <Popover><PopoverTrigger asChild><button type="button" className={cn('w-full h-full min-h-[32px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-visible:ring-indigo-500 data-[state=open]:ring-indigo-500 transition-shadow cursor-pointer text-xs', t.startDate ? 'text-zinc-700 font-medium' : 'text-zinc-400')} onClick={(e) => e.stopPropagation()} title="Edit start date">{t.startDate ? format(new Date(t.startDate), 'M/d/yy') : 'Add Date'}</button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start" sideOffset={8} collisionPadding={10}><TaskCalendar startDate={t.startDate ? new Date(t.startDate) : undefined} endDate={t.dueDate ? new Date(t.dueDate) : undefined} onStartDateChange={(date) => updateDepTask({ startDate: date ? date.toISOString() : null })} onEndDateChange={(date) => updateDepTask({ dueDate: date ? date.toISOString() : null })} /></PopoverContent></Popover>
            );
        }

        if (colId === 'priority') {
            return (
                <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="w-full h-full min-h-[32px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-visible:ring-indigo-500 data-[state=open]:ring-indigo-500 transition-shadow cursor-pointer text-xs font-medium text-zinc-700" onClick={(e) => e.stopPropagation()} title="Edit priority"><div className="flex items-center gap-1.5 w-full"><div className={cn('flex items-center gap-1.5', t.priority === 'URGENT' ? 'text-red-500' : t.priority === 'HIGH' ? 'text-orange-500' : t.priority === 'NORMAL' ? 'text-blue-500' : 'text-zinc-400')}><Flag className="h-3 w-3 fill-current" /></div><span>{t.priority ? t.priority.charAt(0) + t.priority.slice(1).toLowerCase() : 'Priority'}</span></div></button></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-48 z-[200]"><DropdownMenuLabel className="text-xs">Priority</DropdownMenuLabel><DropdownMenuItem onClick={() => updateDepTask({ priority: 'URGENT' })}><Flag className="h-3 w-3 mr-2 text-red-600 fill-current" /> Urgent</DropdownMenuItem><DropdownMenuItem onClick={() => updateDepTask({ priority: 'HIGH' })}><Flag className="h-3 w-3 mr-2 text-orange-600 fill-current" /> High</DropdownMenuItem><DropdownMenuItem onClick={() => updateDepTask({ priority: 'NORMAL' })}><Flag className="h-3 w-3 mr-2 text-blue-600 fill-current" /> Normal</DropdownMenuItem><DropdownMenuItem onClick={() => updateDepTask({ priority: 'LOW' })}><Flag className="h-3 w-3 mr-2 text-slate-600 fill-current" /> Low</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => updateDepTask({ priority: null })}><CircleSlash className="h-3 w-3 mr-2 text-slate-500" />Clear</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
            );
        }

        if (colId === 'taskId') {
            return (
                <div className="w-full h-full min-h-[32px] flex items-center justify-between px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 transition-shadow cursor-default text-xs text-zinc-500 font-mono group/taskid" onClick={(e) => e.stopPropagation()}>
                    <span className="truncate max-w-[80px] shrink-0" title={t.id}># {t.id?.slice(0, 7)}...</span>
                    <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(t.id); toast.success('Task ID copied'); }} className="opacity-0 group-hover/taskid:opacity-100 transition-opacity flex items-center justify-center h-6 w-6 rounded-md border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 shrink-0 cursor-pointer"><Copy className="h-3.5 w-3.5" /></button></TooltipTrigger><TooltipContent side="top" className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md">Copy Task ID</TooltipContent></Tooltip></TooltipProvider>
                </div>
            );
        }

        if (colId === 'customTaskId') {
            const customId = t.customId || t.shortId;
            return (
                <div className="w-full h-full min-h-[32px] flex items-center justify-between px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 transition-shadow cursor-default text-xs text-zinc-500 font-mono group/customid" onClick={(e) => e.stopPropagation()}>
                    <span className="truncate max-w-[80px] shrink-0">{customId || '\u2014'}</span>
                    {customId && (
                        <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(customId); toast.success('Custom ID copied'); }} className="opacity-0 group-hover/customid:opacity-100 transition-opacity flex items-center justify-center h-6 w-6 rounded-md border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 shrink-0 cursor-pointer"><Copy className="h-3.5 w-3.5" /></button></TooltipTrigger><TooltipContent side="top" className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md">Copy Custom ID</TooltipContent></Tooltip></TooltipProvider>
                    )}
                </div>
            );
        }

        if (colId === 'dateCreated') return readOnlyCell(t.createdAt ? format(new Date(t.createdAt), 'M/d/yy') : '\u2014');
        if (colId === 'dateUpdated') return readOnlyCell(t.updatedAt ? format(new Date(t.updatedAt), 'M/d/yy h:mma') : '\u2014');
        if (colId === 'dateDone') return readOnlyCell(t.dateDone ? format(new Date(t.dateDone), 'M/d/yy') : '\u2014');

        if (colId === 'timeTracked') {
            const totalTracked = typeof t.timeTracked === 'number' ? t.timeTracked : 0;
            let timeLabel = 'Add time';
            if (totalTracked > 0) {
                const hours = Math.floor(totalTracked / 3600);
                const mins = Math.floor((totalTracked % 3600) / 60);
                if (hours > 0 && mins > 0) timeLabel = `${hours}h ${mins}m`;
                else if (hours > 0) timeLabel = `${hours}h`;
                else timeLabel = `${mins}m`;
            }
            return (
                <TaskTimeTrackedPopover taskId={t.id} workspaceId={t.workspaceId ?? workspaceId ?? ''} totalTrackedSeconds={totalTracked} trigger={<button type="button" className="w-full h-full min-h-[32px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-visible:ring-indigo-500 data-[state=open]:ring-indigo-500 transition-shadow cursor-pointer gap-1" onClick={(e) => e.stopPropagation()}><div className={cn('flex items-center gap-1.5 text-xs rounded-md px-1.5 py-1 transition-colors', totalTracked > 0 ? 'text-zinc-700 bg-zinc-50 hover:bg-zinc-100' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100')}><Play className="h-3 w-3 shrink-0" /><span className="font-medium">{timeLabel}</span></div></button>} />
            );
        }

        if (colId === 'timeEstimate') {
            return (
                <div className="w-full h-full min-h-[32px] flex items-center px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 transition-shadow text-xs text-zinc-500 cursor-default" onClick={(e) => e.stopPropagation()}>
                    {t.timeEstimate ?? '\u2014'}
                </div>
            );
        }

        if (colId === 'duration') {
            return (
                <div className="w-full h-full min-h-[32px] flex items-center px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 transition-shadow text-xs text-zinc-500 cursor-default" onClick={(e) => e.stopPropagation()}>—</div>
            );
        }

        // Custom fields fallback
        const cfValue = getCustomFieldValue(t, colId);
        if (cfValue !== undefined) {
            const formattedValue = formatCustomFieldValue(cfValue, null);
            return (
                <button type="button" className="w-full h-full min-h-[32px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-visible:ring-indigo-500 data-[state=open]:ring-indigo-500 transition-shadow cursor-pointer text-left text-xs text-zinc-700" onClick={(e) => e.stopPropagation()}>
                    {formattedValue}
                </button>
            );
        }

        return null;
    };

    return (
        <div className={cn("transition-all duration-200 bg-white", isMaximized ? "absolute inset-0 z-50 p-8 overflow-y-auto flex flex-col" : "relative space-y-3")}>
            {isMaximized && (
                <div className="absolute top-6 right-6">
                    <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-900 gap-1.5" onClick={() => setIsMaximized(false)}>
                        Close <Minimize2 className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {totalItems === 0 ? (
                <div className="py-0.5 relative flex justify-center">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start h-8 px-2 text-[13px] text-zinc-600 font-normal hover:bg-zinc-100/80">
                                <ArrowLeftRight className="w-4 h-4 mr-2 text-zinc-400" />
                                Relate items or add dependencies
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-64 p-1.5 rounded-xl shadow-lg border-zinc-200" onCloseAutoFocus={(e) => e.preventDefault()}>
                            <DropdownMenuItem onSelect={() => {
                                setTimeout(() => setDocPickerOpen(true), 150);
                            }} className="py-2 cursor-pointer rounded-md text-[13px]">
                                <ArrowLeftRight className="h-4 w-4 mr-2.5 text-zinc-500" />
                                Relate a Task or Doc
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1.5" />
                            <DropdownMenuItem onSelect={() => {
                                setTimeout(() => setBlocksPickerOpen(true), 150);
                            }} className="py-2 cursor-pointer rounded-md text-[13px]">
                                <MinusCircle className="h-4 w-4 mr-2.5 text-red-500 fill-red-100" />
                                This task blocks...
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => {
                                setTimeout(() => setBlockedByPickerOpen(true), 150);
                            }} className="py-2 cursor-pointer rounded-md text-[13px]">
                                <AlertTriangle className="h-4 w-4 mr-2.5 text-amber-500 fill-amber-100" />
                                This task is blocked by...
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1.5" />
                            {customRelationships?.map((rel: any) => (
                                <DropdownMenuItem
                                    key={rel.id}
                                    onSelect={() => {
                                        setTimeout(() => {
                                            setCustomRelPickerRelId(rel.id);
                                            setCustomRelPickerOpen(true);
                                        }, 150);
                                    }}
                                    className="py-2 cursor-pointer rounded-md text-[13px]"
                                >
                                    <ArrowLeftRight className="h-4 w-4 mr-2.5 text-zinc-500" />
                                    {rel.name}
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem onSelect={() => {
                                setTimeout(() => setCustomRelAnchor('empty'), 150);
                            }} className="py-2 cursor-pointer rounded-md text-[13px]">
                                <Plus className="h-4 w-4 mr-2.5 text-zinc-500" />
                                New custom relationship
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <NewCustomRelationshipPopover
                        workspaceId={workspaceId}
                        open={customRelAnchor === 'empty'}
                        onOpenChange={(v) => !v && setCustomRelAnchor(null)}
                        trigger={<div className="absolute top-0 left-1/2 w-1 h-1 pointer-events-none opacity-0" />}
                        side="top"
                        align="center"
                        contextName={task?.list?.space?.name || task?.list?.project?.name || task?.list?.team?.name || task?.list?.name || task?.space?.name || task?.project?.name || undefined}
                        contextKind={task?.list?.space ? 'space' : task?.list?.project ? 'project' : task?.list?.team ? 'team' : task?.list ? 'list' : task?.space ? 'space' : task?.project ? 'project' : undefined}
                    />
                </div>
            ) : (
                <div className={cn("space-y-3", isMaximized && "max-w-5xl w-full mx-auto mt-12")}>
                    {/* Header with Tabs */}
                    <div className="flex items-center justify-between group/header border-b border-zinc-200">
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="cursor-pointer h-6 w-6 flex items-center justify-center rounded-md hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 transition-colors -mr-1"
                            >
                                <svg viewBox="0 0 100 100" className={cn("h-2.5 w-2.5 fill-current transition-transform duration-200", !isCollapsed && "rotate-90")}>
                                    <polygon points="20,10 80,50 20,90" />
                                </svg>
                            </button>
                            {(totalRelated > 0 || effectiveActiveTab === 'related') && (
                                <div
                                    className={cn("flex items-center gap-1.5 cursor-pointer pb-1.5 border-b-2 transition-colors", effectiveActiveTab === 'related' ? "border-zinc-900" : "border-transparent hover:border-zinc-300")}
                                    onClick={() => setActiveTab('related')}
                                >
                                    <span className={cn("text-sm font-semibold", effectiveActiveTab === 'related' ? "text-zinc-900" : "text-zinc-500")}>Related</span>
                                    {totalRelated > 0 && (
                                        <span className={cn("text-xs", effectiveActiveTab === 'related' ? "text-zinc-500" : "text-zinc-400")}>{totalRelated}</span>
                                    )}
                                </div>
                            )}
                            {(totalDependencies > 0 || effectiveActiveTab === 'dependencies') && (
                                <div
                                    className={cn("flex items-center gap-1.5 cursor-pointer pb-1.5 border-b-2 transition-colors", effectiveActiveTab === 'dependencies' ? "border-zinc-900" : "border-transparent hover:border-zinc-300")}
                                    onClick={() => setActiveTab('dependencies')}
                                >
                                    <span className={cn("text-sm font-semibold", effectiveActiveTab === 'dependencies' ? "text-zinc-900" : "text-zinc-500")}>Dependencies</span>
                                    {totalDependencies > 0 && (
                                        <span className={cn("text-xs", effectiveActiveTab === 'dependencies' ? "text-zinc-500" : "text-zinc-400")}>{totalDependencies}</span>
                                    )}
                                </div>
                            )}

                            {/* Render Custom Relationships Tabs */}
                            {customRelationships?.map((rel: any) => {
                                const relTasks = task?.dependencies?.filter((d: any) => d.customRelationshipId === rel.id) || [];
                                if (relTasks.length === 0) return null;
                                return (
                                    <div
                                        key={rel.id}
                                        className={cn("flex items-center gap-1.5 cursor-pointer pb-1.5 border-b-2 transition-colors", effectiveActiveTab === rel.id ? "border-zinc-900" : "border-transparent hover:border-zinc-300")}
                                        onClick={() => setActiveTab(rel.id)}
                                    >
                                        <span className={cn("text-sm font-semibold", effectiveActiveTab === rel.id ? "text-zinc-900" : "text-zinc-500")}>{rel.name}</span>
                                        {relTasks.length > 0 && (
                                            <span className={cn("text-xs", effectiveActiveTab === rel.id ? "text-zinc-500" : "text-zinc-400")}>{relTasks.length}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Right side buttons */}
                        <div className="flex items-center gap-0.5 pb-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
                            <TooltipProvider delayDuration={200}>
                                <div className="flex items-center p-0.5 border border-zinc-200 rounded-md shadow-sm bg-white relative">
                                    {customRelationships?.some((rel: any) => rel.id === effectiveActiveTab) && (
                                        <>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100" onClick={() => setEditCustomRelOpen(true)}>
                                                        <Settings2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>
                                                    Edit Relationship
                                                </TooltipContent>
                                            </Tooltip>
                                            <EditCustomRelationshipPopover
                                                open={editCustomRelOpen}
                                                onOpenChange={setEditCustomRelOpen}
                                                workspaceId={workspaceId}
                                                initialData={customRelationships?.find((rel: any) => rel.id === activeTab)}
                                                contextName={task?.list?.space?.name || task?.list?.project?.name || task?.list?.team?.name || task?.list?.name || task?.space?.name || task?.project?.name || undefined}
                                                contextKind={task?.list?.space ? 'space' : task?.list?.project ? 'project' : task?.list?.team ? 'team' : task?.list ? 'list' : task?.space ? 'space' : task?.project ? 'project' : undefined}
                                                listId={task?.listId}
                                                spaceId={task?.spaceId || task?.list?.spaceId}
                                                projectId={task?.projectId || task?.list?.projectId}
                                                teamId={task?.teamId || task?.list?.teamId}
                                                folderId={task?.folderId || task?.list?.folderId}
                                                trigger={<div className="absolute top-0 left-0 w-1 h-1 pointer-events-none opacity-0" />}
                                                align="end"
                                                side="bottom"
                                            />
                                        </>
                                    )}
                                    {!isMaximized && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100" onClick={() => setIsMaximized(true)}>
                                                    <Maximize2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>
                                                Maximize
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                    <DropdownMenu>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100">
                                                        <Plus className="h-3.5 w-3.5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>
                                                Add relationship
                                            </TooltipContent>
                                        </Tooltip>
                                        <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-lg border-zinc-200" onCloseAutoFocus={(e) => e.preventDefault()}>
                                            <DropdownMenuItem onSelect={() => {
                                                setTimeout(() => setDocPickerOpen(true), 150);
                                            }} className="py-2 cursor-pointer rounded-md text-[13px]">
                                                <ArrowLeftRight className="h-4 w-4 mr-2.5 text-zinc-500" />
                                                Relate a Task or Doc
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="my-1.5" />
                                            <DropdownMenuItem onSelect={() => {
                                                setTimeout(() => setBlocksPickerOpen(true), 150);
                                            }} className="py-2 cursor-pointer rounded-md text-[13px]">
                                                <MinusCircle className="h-4 w-4 mr-2.5 text-red-500 fill-red-100" />
                                                This task blocks...
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => {
                                                setTimeout(() => setBlockedByPickerOpen(true), 150);
                                            }} className="py-2 cursor-pointer rounded-md text-[13px]">
                                                <AlertTriangle className="h-4 w-4 mr-2.5 text-amber-500 fill-amber-100" />
                                                This task is blocked by...
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="my-1.5" />
                                            {customRelationships?.map((rel: any) => (
                                                <DropdownMenuItem
                                                    key={rel.id}
                                                    onSelect={() => {
                                                        setTimeout(() => {
                                                            setCustomRelPickerRelId(rel.id);
                                                            setCustomRelPickerOpen(true);
                                                        }, 150);
                                                    }}
                                                    className="py-2 cursor-pointer rounded-md text-[13px]"
                                                >
                                                    <ArrowLeftRight className="h-4 w-4 mr-2.5 text-zinc-500" />
                                                    {rel.name}
                                                </DropdownMenuItem>
                                            ))}
                                            <DropdownMenuItem onSelect={() => {
                                                setTimeout(() => setCustomRelAnchor('header'), 150);
                                            }} className="py-2 cursor-pointer rounded-md text-[13px]">
                                                <Plus className="h-4 w-4 mr-2.5 text-zinc-500" />
                                                New custom relationship
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <NewCustomRelationshipPopover
                                        workspaceId={workspaceId}
                                        open={customRelAnchor === 'header'}
                                        onOpenChange={(v) => !v && setCustomRelAnchor(null)}
                                        trigger={<div className="absolute top-8 right-0 w-1 h-1 pointer-events-none opacity-0" />}
                                        side="bottom"
                                        align="end"
                                        contextName={task?.list?.space?.name || task?.list?.project?.name || task?.list?.team?.name || task?.list?.name || task?.space?.name || task?.project?.name || undefined}
                                        contextKind={task?.list?.space ? 'space' : task?.list?.project ? 'project' : task?.list?.team ? 'team' : task?.list ? 'list' : task?.space ? 'space' : task?.project ? 'project' : undefined}
                                    />
                                </div>
                            </TooltipProvider>
                        </div>
                    </div>

                    {/* Content */}
                    <div className={cn("pt-2", isCollapsed && "hidden")}>
                        {effectiveActiveTab === 'related' && (
                            totalRelated === 0 ? (
                                <div className="flex flex-col items-center justify-center py-6 gap-2">
                                    <span className="text-[13px] text-zinc-500">No tasks or docs related.</span>
                                    <Button variant="secondary" size="sm" className="h-7 text-[13px] bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium" onClick={() => setDocPickerOpen(true)}>
                                        <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" /> Relate
                                    </Button>
                                </div>
                            ) : (

                                <div className="px-1 space-y-6">
                                    {/* ── Task Section ── */}
                                    {relatedTasks.length > 0 && (
                                        <div className="px-1">
                                            <div className="flex items-center gap-1.5 mb-3 group">
                                                <CheckCircle2 className="h-4 w-4 text-zinc-800" />
                                                <span className="font-semibold text-zinc-900 text-[14px]">Task</span>
                                                <span className="text-zinc-400 font-normal text-[14px]">{relatedTasks.length}</span>
                                                <div className="group/btngroup flex items-center ml-2 rounded-lg border border-transparent hover:border-zinc-300 hover:bg-zinc-100 p-[2px] transition-all opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button className="cursor-pointer h-6 w-7 flex items-center justify-center rounded-md bg-transparent hover:bg-zinc-200/80 data-[state=open]:bg-zinc-200/80 transition-colors text-zinc-700 outline-none">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="start" className="w-48">
                                                            <DropdownMenuItem onClick={() => setTasksCollapsed(!tasksCollapsed)}>
                                                                {tasksCollapsed ? <UnfoldVertical className="h-4 w-4 mr-2 text-zinc-500" /> : <FoldVertical className="h-4 w-4 mr-2 text-zinc-500" />}
                                                                {tasksCollapsed ? 'Expand group' : 'Collapse group'}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSub>
                                                                <DropdownMenuSubTrigger>
                                                                    <Columns className="h-4 w-4 mr-2 text-zinc-500" />
                                                                    Columns
                                                                </DropdownMenuSubTrigger>
                                                                <DropdownMenuSubContent className="w-56">
                                                                    <div className="px-2 py-1.5 flex items-center justify-between">
                                                                        <span className="text-xs text-zinc-500 font-medium">{taskColumns.length === 0 ? "Display field as column" : `${taskColumns.length} selected`}</span>
                                                                        {taskColumns.length > 0 && (
                                                                            <button onClick={() => setTaskColumns([])} className="text-xs font-medium text-zinc-600 hover:text-zinc-700 hover:bg-zinc-100 px-2 py-0.5 rounded transition-colors cursor-pointer">Clear</button>
                                                                        )}
                                                                    </div>
                                                                    <DropdownMenuSeparator />
                                                                    <div className="max-h-[300px] overflow-y-auto">
                                                                        {AVAILABLE_COLUMNS.map(col => (
                                                                            <DropdownMenuCheckboxItem
                                                                                key={col.id}
                                                                                checked={taskColumns.includes(col.id)}
                                                                                onCheckedChange={(checked) => {
                                                                                    if (checked) setTaskColumns([...taskColumns, col.id]);
                                                                                    else setTaskColumns(taskColumns.filter(id => id !== col.id));
                                                                                }}
                                                                                className="text-[13px]"
                                                                            >
                                                                                <div className="flex items-center gap-2">{col.icon}{col.label}</div>
                                                                            </DropdownMenuCheckboxItem>
                                                                        ))}
                                                                    </div>
                                                                </DropdownMenuSubContent>
                                                            </DropdownMenuSub>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>

                                                    <div className="w-[1px] h-3.5 bg-transparent group-hover/btngroup:bg-zinc-200 transition-colors mx-[1px]" />

                                                    <button
                                                        className="cursor-pointer h-6 w-7 flex items-center justify-center rounded-md bg-transparent hover:bg-zinc-200/50 transition-colors text-zinc-500 hover:text-zinc-700 outline-none"
                                                        onClick={() => setTaskPickerOpen(true)}
                                                    >
                                                        <Plus className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {!tasksCollapsed && (
                                                <>
                                                    <div className="overflow-x-auto custom-scrollbar">
                                                        <table className="w-full text-[13px]" style={{ minWidth: 'max-content' }}>
                                                            <thead className="text-zinc-500 font-medium">
                                                                <tr>
                                                                    <th className="text-left font-medium pb-2 pl-2 whitespace-nowrap sticky left-0 bg-white z-10 border-b border-zinc-100" style={{ boxShadow: '2px 0 4px -1px rgba(0,0,0,0.06)' }}>Name</th>
                                                                    {taskColumns.map(colId => {
                                                                        const col = AVAILABLE_COLUMNS.find(c => c.id === colId);
                                                                        if (!col) return null;
                                                                        return <th key={col.id} className="text-left font-medium pb-2 min-w-[130px] whitespace-nowrap border-b border-zinc-100">{col.label}</th>;
                                                                    })}
                                                                    <th className="text-center font-medium pb-2 min-w-[50px] sticky right-0 bg-white z-10 border-b border-zinc-100" style={{ boxShadow: '-2px 0 4px -1px rgba(0,0,0,0.06)' }}>
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <button className="p-1 hover:bg-zinc-200 rounded mx-auto block cursor-pointer transition-colors">
                                                                                    <PlusCircle className="h-4 w-4 text-zinc-500" />
                                                                                </button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end" className="w-56">
                                                                                <div className="px-2 py-1.5 flex items-center justify-between">
                                                                                    <span className="text-xs text-zinc-500 font-medium">{taskColumns.length === 0 ? "Display field as column" : `${taskColumns.length} selected`}</span>
                                                                                    {taskColumns.length > 0 && (
                                                                                        <button onClick={() => setTaskColumns([])} className="text-xs font-medium text-zinc-600 hover:text-zinc-700 hover:bg-zinc-100 px-2 py-0.5 rounded transition-colors cursor-pointer">Clear</button>
                                                                                    )}
                                                                                </div>
                                                                                <DropdownMenuSeparator />
                                                                                <div className="max-h-[300px] overflow-y-auto">
                                                                                    {AVAILABLE_COLUMNS.map(col => (
                                                                                        <DropdownMenuCheckboxItem
                                                                                            key={col.id}
                                                                                            checked={taskColumns.includes(col.id)}
                                                                                            onCheckedChange={(checked) => {
                                                                                                if (checked) setTaskColumns([...taskColumns, col.id]);
                                                                                                else setTaskColumns(taskColumns.filter(id => id !== col.id));
                                                                                            }}
                                                                                            className="text-[13px]"
                                                                                        >
                                                                                            <div className="flex items-center gap-2">{col.icon}{col.label}</div>
                                                                                        </DropdownMenuCheckboxItem>
                                                                                    ))}
                                                                                </div>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="">
                                                                {relatedTasks.map((dep: any) => {
                                                                    return (
                                                                        <tr key={dep.id} className="group hover:bg-zinc-50/80 transition-colors">
                                                                            <td className="py-2.5 pl-2 max-w-[200px] min-w-[250px] sticky left-0 bg-white group-hover:bg-[#fbfbfb] z-10 border-b border-zinc-100" style={{ boxShadow: '2px 0 4px -1px rgba(0,0,0,0.06)' }}>
                                                                                <div className="flex items-center gap-2">
                                                                                    {renderStatusIcon(dep.dependsOn || dep.task)}
                                                                                    <span onClick={() => openTask(dep.dependsOn?.id || dep.dependsOnId)} className="font-medium text-zinc-900 truncate block hover:text-indigo-600 cursor-pointer transition-colors">{dep.dependsOn?.title || dep.task?.title || dep.name || 'Task'}</span>
                                                                                </div>
                                                                            </td>
                                                                            {taskColumns.map(colId => (
                                                                                <td key={colId} className="py-2.5 border-b border-zinc-100">
                                                                                    {renderTaskCell(dep, colId)}
                                                                                </td>
                                                                            ))}
                                                                            <td className="py-2.5 text-center sticky right-0 bg-white group-hover:bg-[#fbfbfb] z-10 border-b border-zinc-100" style={{ boxShadow: '-2px 0 4px -1px rgba(0,0,0,0.06)' }}>
                                                                                <button
                                                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-200 rounded cursor-pointer"
                                                                                    onClick={() => removeDependency.mutate({ taskId, dependsOnId: dep.dependsOnId })}
                                                                                >
                                                                                    <X className="h-3.5 w-3.5 text-zinc-400" />
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    <button onClick={() => setTaskPickerOpen(true)} className="mt-2 py-1.5 text-zinc-400 flex items-center gap-1.5 cursor-pointer hover:text-zinc-600 text-[13px] font-medium transition-colors">
                                                        <Plus className="h-4 w-4" /> Add Task
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* ── Doc Section ── */}
                                    {docLinks.length > 0 && (
                                        <div className="px-1">
                                            <div className="flex items-center gap-1.5 mb-3 group">
                                                <FileText className="h-4 w-4 text-zinc-800" />
                                                <span className="font-semibold text-zinc-900 text-[14px]">Doc</span>
                                                <span className="text-zinc-400 font-normal text-[14px]">{docLinks.length}</span>
                                                <div className="group/btngroup flex items-center ml-2 rounded-lg border border-transparent hover:border-zinc-300 hover:bg-zinc-100 p-[2px] transition-all opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button className="cursor-pointer h-6 w-7 flex items-center justify-center rounded-md bg-transparent hover:bg-zinc-200/80 data-[state=open]:bg-zinc-200/80 transition-colors text-zinc-700 outline-none">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="start" className="w-48">
                                                            <DropdownMenuItem onClick={() => setDocsCollapsed(!docsCollapsed)}>
                                                                {docsCollapsed ? <UnfoldVertical className="h-4 w-4 mr-2 text-zinc-500" /> : <FoldVertical className="h-4 w-4 mr-2 text-zinc-500" />}
                                                                {docsCollapsed ? 'Expand group' : 'Collapse group'}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>

                                                    <div className="w-[1px] h-3.5 bg-transparent group-hover/btngroup:bg-zinc-200 transition-colors mx-[1px]" />

                                                    <button
                                                        className="cursor-pointer h-6 w-7 flex items-center justify-center rounded-md bg-transparent hover:bg-zinc-200/50 transition-colors text-zinc-500 hover:text-zinc-700 outline-none"
                                                        onClick={() => setDocOnlyPickerOpen(true)}
                                                    >
                                                        <Plus className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {!docsCollapsed && (
                                                <>
                                                    <div className="border-t border-b border-zinc-100 py-1">
                                                        {docLinks.map((doc: any) => {
                                                            return (
                                                                <div key={doc.id} className="py-2 flex items-center gap-2 hover:bg-zinc-50/50 group">
                                                                    <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
                                                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-medium text-zinc-900 text-[13px] hover:underline truncate flex-1 block">{doc.filename || doc.url || doc.name || 'Doc'}</a>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    <button onClick={() => setDocOnlyPickerOpen(true)} className="mt-2 py-1.5 text-zinc-400 flex items-center gap-1.5 cursor-pointer hover:text-zinc-600 text-[13px] font-medium transition-colors">
                                                        <ArrowLeftRight className="h-4 w-4" /> Relate Doc
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        )}

                        {effectiveActiveTab === 'dependencies' && (
                            totalDependencies === 0 ? (
                                <div className="flex flex-col items-center justify-center py-6 gap-2">
                                    <span className="text-[13px] text-zinc-500">No dependencies yet.</span>
                                </div>
                            ) : (

                                <div className="px-1 space-y-6">
                                    {/* ── Blocks Section ── */}
                                    {blocksItems.length > 0 && (
                                        <div className="px-1">
                                            <div className="flex items-center gap-1.5 mb-3 group">
                                                <MinusCircle className="h-4 w-4 text-red-500 fill-red-100" />
                                                <span className="font-semibold text-zinc-900 text-[14px]">Blocks</span>
                                                <span className="text-zinc-400 font-normal text-[14px]">{blocksItems.length}</span>
                                                <div className="group/btngroup flex items-center ml-2 rounded-lg border border-transparent hover:border-zinc-300 hover:bg-zinc-100 p-[2px] transition-all opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button className="cursor-pointer h-6 w-7 flex items-center justify-center rounded-md bg-transparent hover:bg-zinc-200/80 data-[state=open]:bg-zinc-200/80 transition-colors text-zinc-700 outline-none">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="start" className="w-48">
                                                            <DropdownMenuItem onClick={() => setBlocksCollapsed(!blocksCollapsed)}>
                                                                {blocksCollapsed ? <UnfoldVertical className="h-4 w-4 mr-2 text-zinc-500" /> : <FoldVertical className="h-4 w-4 mr-2 text-zinc-500" />}
                                                                {blocksCollapsed ? 'Expand group' : 'Collapse group'}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSub>
                                                                <DropdownMenuSubTrigger>
                                                                    <Columns className="h-4 w-4 mr-2 text-zinc-500" />
                                                                    Columns
                                                                </DropdownMenuSubTrigger>
                                                                <DropdownMenuSubContent className="w-56">
                                                                    <div className="px-2 py-1.5 flex items-center justify-between">
                                                                        <span className="text-xs text-zinc-500 font-medium">{taskColumns.length === 0 ? "Display field as column" : `${taskColumns.length} selected`}</span>
                                                                        {taskColumns.length > 0 && (
                                                                            <button onClick={() => setTaskColumns([])} className="text-xs font-medium text-zinc-600 hover:text-zinc-700 hover:bg-zinc-100 px-2 py-0.5 rounded transition-colors cursor-pointer">Clear</button>
                                                                        )}
                                                                    </div>
                                                                    <DropdownMenuSeparator />
                                                                    <div className="max-h-[300px] overflow-y-auto">
                                                                        {AVAILABLE_COLUMNS.map(col => (
                                                                            <DropdownMenuCheckboxItem
                                                                                key={col.id}
                                                                                checked={taskColumns.includes(col.id)}
                                                                                onCheckedChange={(checked) => {
                                                                                    if (checked) setTaskColumns([...taskColumns, col.id]);
                                                                                    else setTaskColumns(taskColumns.filter(id => id !== col.id));
                                                                                }}
                                                                                className="text-[13px]"
                                                                            >
                                                                                <div className="flex items-center gap-2">{col.icon}{col.label}</div>
                                                                            </DropdownMenuCheckboxItem>
                                                                        ))}
                                                                    </div>
                                                                </DropdownMenuSubContent>
                                                            </DropdownMenuSub>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>

                                                    <div className="w-[1px] h-3.5 bg-transparent group-hover/btngroup:bg-zinc-200 transition-colors mx-[1px]" />

                                                    <button
                                                        className="cursor-pointer h-6 w-7 flex items-center justify-center rounded-md bg-transparent hover:bg-zinc-200/50 transition-colors text-zinc-500 hover:text-zinc-700 outline-none"
                                                        onClick={() => setBlocksPickerOpen(true)}
                                                    >
                                                        <Plus className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {!blocksCollapsed && (
                                                <>
                                                    <div className="overflow-x-auto custom-scrollbar">
                                                        <table className="w-full text-[13px]" style={{ minWidth: 'max-content' }}>
                                                            <thead className="text-zinc-500 font-medium">
                                                                <tr>
                                                                    <th className="text-left font-medium pb-2 pl-2 whitespace-nowrap sticky left-0 bg-white z-10 border-b border-zinc-100" style={{ boxShadow: '2px 0 4px -1px rgba(0,0,0,0.06)' }}>Name</th>
                                                                    {taskColumns.map(colId => {
                                                                        const col = AVAILABLE_COLUMNS.find(c => c.id === colId);
                                                                        if (!col) return null;
                                                                        return <th key={col.id} className="text-left font-medium pb-2 min-w-[130px] whitespace-nowrap border-b border-zinc-100">{col.label}</th>;
                                                                    })}
                                                                    <th className="text-center font-medium pb-2 min-w-[50px] sticky right-0 bg-white z-10 border-b border-zinc-100" style={{ boxShadow: '-2px 0 4px -1px rgba(0,0,0,0.06)' }}>
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <button className="p-1 hover:bg-zinc-200 rounded mx-auto block cursor-pointer transition-colors">
                                                                                    <PlusCircle className="h-4 w-4 text-zinc-500" />
                                                                                </button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end" className="w-56">
                                                                                <div className="px-2 py-1.5 flex items-center justify-between">
                                                                                    <span className="text-xs text-zinc-500 font-medium">{taskColumns.length === 0 ? "Display field as column" : `${taskColumns.length} selected`}</span>
                                                                                    {taskColumns.length > 0 && (
                                                                                        <button onClick={() => setTaskColumns([])} className="text-xs font-medium text-zinc-600 hover:text-zinc-700 hover:bg-zinc-100 px-2 py-0.5 rounded transition-colors cursor-pointer">Clear</button>
                                                                                    )}
                                                                                </div>
                                                                                <DropdownMenuSeparator />
                                                                                <div className="max-h-[300px] overflow-y-auto">
                                                                                    {AVAILABLE_COLUMNS.map(col => (
                                                                                        <DropdownMenuCheckboxItem
                                                                                            key={col.id}
                                                                                            checked={taskColumns.includes(col.id)}
                                                                                            onCheckedChange={(checked) => {
                                                                                                if (checked) setTaskColumns([...taskColumns, col.id]);
                                                                                                else setTaskColumns(taskColumns.filter(id => id !== col.id));
                                                                                            }}
                                                                                            className="text-[13px]"
                                                                                        >
                                                                                            <div className="flex items-center gap-2">{col.icon}{col.label}</div>
                                                                                        </DropdownMenuCheckboxItem>
                                                                                    ))}
                                                                                </div>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="">
                                                                {blocksItems.map((dep: any) => {
                                                                    return (
                                                                        <tr key={dep.id} className="group hover:bg-zinc-50/80 transition-colors">
                                                                            <td className="py-2.5 pl-2 max-w-[200px] min-w-[250px] sticky left-0 bg-white group-hover:bg-[#fbfbfb] z-10 border-b border-zinc-100" style={{ boxShadow: '2px 0 4px -1px rgba(0,0,0,0.06)' }}>
                                                                                <div className="flex items-center gap-2">
                                                                                    {renderStatusIcon(dep.dependsOn || dep.task)}
                                                                                    <span onClick={() => openTask(dep.task?.id || dep.dependsOn?.id || dep.id)} className="font-medium text-zinc-900 truncate block hover:text-indigo-600 cursor-pointer transition-colors">{dep.dependsOn?.title || dep.task?.title || dep.name || 'Task'}</span>
                                                                                </div>
                                                                            </td>
                                                                            {taskColumns.map(colId => (
                                                                                <td key={colId} className="py-2.5 border-b border-zinc-100">
                                                                                    {renderTaskCell(dep, colId)}
                                                                                </td>
                                                                            ))}
                                                                            <td className="py-2.5 text-center sticky right-0 bg-white group-hover:bg-[#fbfbfb] z-10 border-b border-zinc-100" style={{ boxShadow: '-2px 0 4px -1px rgba(0,0,0,0.06)' }}>
                                                                                <button
                                                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-200 rounded cursor-pointer"
                                                                                    onClick={() => removeDependency.mutate({ taskId: dep.taskId ?? dep.id, dependsOnId: taskId })}
                                                                                >
                                                                                    <X className="h-3.5 w-3.5 text-zinc-400" />
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    <button onClick={() => setBlocksPickerOpen(true)} className="mt-2 py-1.5 text-zinc-400 flex items-center gap-1.5 cursor-pointer hover:text-zinc-600 text-[13px] font-medium transition-colors">
                                                        <Plus className="h-4 w-4" /> Add Task
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* ── Blocked By Section ── */}
                                    {blockedByItems.length > 0 && (
                                        <div className="px-1">
                                            <div className="flex items-center gap-1.5 mb-3 group">
                                                <AlertTriangle className="h-4 w-4 text-amber-500 fill-amber-100" />
                                                <span className="font-semibold text-zinc-900 text-[14px]">Blocked by</span>
                                                <span className="text-zinc-400 font-normal text-[14px]">{blockedByItems.length}</span>
                                                <div className="group/btngroup flex items-center ml-2 rounded-lg border border-transparent hover:border-zinc-300 hover:bg-zinc-100 p-[2px] transition-all opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button className="cursor-pointer h-6 w-7 flex items-center justify-center rounded-md bg-transparent hover:bg-zinc-200/80 data-[state=open]:bg-zinc-200/80 transition-colors text-zinc-700 outline-none">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="start" className="w-48">
                                                            <DropdownMenuItem onClick={() => setBlockedByCollapsed(!blockedByCollapsed)}>
                                                                {blockedByCollapsed ? <UnfoldVertical className="h-4 w-4 mr-2 text-zinc-500" /> : <FoldVertical className="h-4 w-4 mr-2 text-zinc-500" />}
                                                                {blockedByCollapsed ? 'Expand group' : 'Collapse group'}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSub>
                                                                <DropdownMenuSubTrigger>
                                                                    <Columns className="h-4 w-4 mr-2 text-zinc-500" />
                                                                    Columns
                                                                </DropdownMenuSubTrigger>
                                                                <DropdownMenuSubContent className="w-56">
                                                                    <div className="px-2 py-1.5 flex items-center justify-between">
                                                                        <span className="text-xs text-zinc-500 font-medium">{taskColumns.length === 0 ? "Display field as column" : `${taskColumns.length} selected`}</span>
                                                                        {taskColumns.length > 0 && (
                                                                            <button onClick={() => setTaskColumns([])} className="text-xs font-medium text-zinc-600 hover:text-zinc-700 hover:bg-zinc-100 px-2 py-0.5 rounded transition-colors cursor-pointer">Clear</button>
                                                                        )}
                                                                    </div>
                                                                    <DropdownMenuSeparator />
                                                                    <div className="max-h-[300px] overflow-y-auto">
                                                                        {AVAILABLE_COLUMNS.map(col => (
                                                                            <DropdownMenuCheckboxItem
                                                                                key={col.id}
                                                                                checked={taskColumns.includes(col.id)}
                                                                                onCheckedChange={(checked) => {
                                                                                    if (checked) setTaskColumns([...taskColumns, col.id]);
                                                                                    else setTaskColumns(taskColumns.filter(id => id !== col.id));
                                                                                }}
                                                                                className="text-[13px]"
                                                                            >
                                                                                <div className="flex items-center gap-2">{col.icon}{col.label}</div>
                                                                            </DropdownMenuCheckboxItem>
                                                                        ))}
                                                                    </div>
                                                                </DropdownMenuSubContent>
                                                            </DropdownMenuSub>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>

                                                    <div className="w-[1px] h-3.5 bg-transparent group-hover/btngroup:bg-zinc-200 transition-colors mx-[1px]" />

                                                    <button
                                                        className="cursor-pointer h-6 w-7 flex items-center justify-center rounded-md bg-transparent hover:bg-zinc-200/50 transition-colors text-zinc-500 hover:text-zinc-700 outline-none"
                                                        onClick={() => setBlockedByPickerOpen(true)}
                                                    >
                                                        <Plus className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {!blockedByCollapsed && (
                                                <>
                                                    <div className="overflow-x-auto custom-scrollbar">
                                                        <table className="w-full text-[13px]" style={{ minWidth: 'max-content' }}>
                                                            <thead className="text-zinc-500 font-medium">
                                                                <tr>
                                                                    <th className="text-left font-medium pb-2 pl-2 whitespace-nowrap sticky left-0 bg-white z-10 border-b border-zinc-100" style={{ boxShadow: '2px 0 4px -1px rgba(0,0,0,0.06)' }}>Name</th>
                                                                    {taskColumns.map(colId => {
                                                                        const col = AVAILABLE_COLUMNS.find(c => c.id === colId);
                                                                        if (!col) return null;
                                                                        return <th key={col.id} className="text-left font-medium pb-2 min-w-[130px] whitespace-nowrap border-b border-zinc-100">{col.label}</th>;
                                                                    })}
                                                                    <th className="text-center font-medium pb-2 min-w-[50px] sticky right-0 bg-white z-10 border-b border-zinc-100" style={{ boxShadow: '-2px 0 4px -1px rgba(0,0,0,0.06)' }}>
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <button className="p-1 hover:bg-zinc-200 rounded mx-auto block cursor-pointer transition-colors">
                                                                                    <PlusCircle className="h-4 w-4 text-zinc-500" />
                                                                                </button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end" className="w-56">
                                                                                <div className="px-2 py-1.5 flex items-center justify-between">
                                                                                    <span className="text-xs text-zinc-500 font-medium">{taskColumns.length === 0 ? "Display field as column" : `${taskColumns.length} selected`}</span>
                                                                                    {taskColumns.length > 0 && (
                                                                                        <button onClick={() => setTaskColumns([])} className="text-xs font-medium text-zinc-600 hover:text-zinc-700 hover:bg-zinc-100 px-2 py-0.5 rounded transition-colors cursor-pointer">Clear</button>
                                                                                    )}
                                                                                </div>
                                                                                <DropdownMenuSeparator />
                                                                                <div className="max-h-[300px] overflow-y-auto">
                                                                                    {AVAILABLE_COLUMNS.map(col => (
                                                                                        <DropdownMenuCheckboxItem
                                                                                            key={col.id}
                                                                                            checked={taskColumns.includes(col.id)}
                                                                                            onCheckedChange={(checked) => {
                                                                                                if (checked) setTaskColumns([...taskColumns, col.id]);
                                                                                                else setTaskColumns(taskColumns.filter(id => id !== col.id));
                                                                                            }}
                                                                                            className="text-[13px]"
                                                                                        >
                                                                                            <div className="flex items-center gap-2">{col.icon}{col.label}</div>
                                                                                        </DropdownMenuCheckboxItem>
                                                                                    ))}
                                                                                </div>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="">
                                                                {blockedByItems.map((dep: any) => {
                                                                    return (
                                                                        <tr key={dep.id} className="group hover:bg-zinc-50/80 transition-colors">
                                                                            <td className="py-2.5 pl-2 max-w-[200px] min-w-[250px] sticky left-0 bg-white group-hover:bg-[#fbfbfb] z-10 border-b border-zinc-100" style={{ boxShadow: '2px 0 4px -1px rgba(0,0,0,0.06)' }}>
                                                                                <div className="flex items-center gap-2">
                                                                                    {renderStatusIcon(dep.dependsOn || dep.task)}
                                                                                    <span onClick={() => openTask(dep.dependsOn?.id || dep.dependsOnId)} className="font-medium text-zinc-900 truncate block hover:text-indigo-600 cursor-pointer transition-colors">{dep.dependsOn?.title || dep.task?.title || dep.name || 'Task'}</span>
                                                                                </div>
                                                                            </td>
                                                                            {taskColumns.map(colId => (
                                                                                <td key={colId} className="py-2.5 border-b border-zinc-100">
                                                                                    {renderTaskCell(dep, colId)}
                                                                                </td>
                                                                            ))}
                                                                            <td className="py-2.5 text-center sticky right-0 bg-white group-hover:bg-[#fbfbfb] z-10 border-b border-zinc-100" style={{ boxShadow: '-2px 0 4px -1px rgba(0,0,0,0.06)' }}>
                                                                                <button
                                                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-200 rounded cursor-pointer"
                                                                                    onClick={() => removeDependency.mutate({ taskId, dependsOnId: dep.dependsOnId })}
                                                                                >
                                                                                    <X className="h-3.5 w-3.5 text-zinc-400" />
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    <button onClick={() => setBlockedByPickerOpen(true)} className="mt-2 py-1.5 text-zinc-400 flex items-center gap-1.5 cursor-pointer hover:text-zinc-600 text-[13px] font-medium transition-colors">
                                                        <Plus className="h-4 w-4" /> Add Task
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </div>

                    {/* ── Custom Relationship Tab Content ── */}
                    {customRelationships?.map((rel: any) => {
                        if (effectiveActiveTab !== rel.id) return null;
                        const customRelTasks = (task?.dependencies || []).filter(
                            (d: any) => d.customRelationshipId === rel.id
                        );
                        return (
                            <div key={rel.id} className="pt-2">
                                {customRelTasks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-6 gap-2">
                                        <span className="text-[13px] text-zinc-500">No tasks in &ldquo;{rel.name}&rdquo; yet.</span>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="h-7 text-[13px] bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium"
                                            onClick={() => {
                                                setCustomRelPickerRelId(rel.id);
                                                setCustomRelPickerOpen(true);
                                            }}
                                        >
                                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Task
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="px-2">
                                        <div className="overflow-x-auto custom-scrollbar">
                                            <table className="w-full text-[13px]" style={{ minWidth: 'max-content' }}>
                                                <thead className="text-zinc-500 font-medium">
                                                    <tr>
                                                        <th className="text-left font-medium pb-2 pl-2 whitespace-nowrap sticky left-0 bg-white z-10 border-b border-zinc-100" style={{ boxShadow: '2px 0 4px -1px rgba(0,0,0,0.06)' }}>Name</th>
                                                        {taskColumns.map(colId => {
                                                            const col = AVAILABLE_COLUMNS.find(c => c.id === colId);
                                                            if (!col) return null;
                                                            return <th key={col.id} className="text-left font-medium pb-2 min-w-[130px] whitespace-nowrap border-b border-zinc-100">{col.label}</th>;
                                                        })}
                                                        <th className="text-center font-medium pb-2 min-w-[50px] sticky right-0 bg-white z-10 border-b border-zinc-100" style={{ boxShadow: '-2px 0 4px -1px rgba(0,0,0,0.06)' }}>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <button className="p-1 hover:bg-zinc-200 rounded mx-auto block cursor-pointer transition-colors">
                                                                        <PlusCircle className="h-4 w-4 text-zinc-500" />
                                                                    </button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-56">
                                                                    <div className="px-2 py-1.5 flex items-center justify-between">
                                                                        <span className="text-xs text-zinc-500 font-medium">{taskColumns.length === 0 ? "Display field as column" : `${taskColumns.length} selected`}</span>
                                                                        {taskColumns.length > 0 && (
                                                                            <button onClick={() => setTaskColumns([])} className="text-xs font-medium text-zinc-600 hover:text-zinc-700 hover:bg-zinc-100 px-2 py-0.5 rounded transition-colors cursor-pointer">Clear</button>
                                                                        )}
                                                                    </div>
                                                                    <DropdownMenuSeparator />
                                                                    <div className="max-h-[300px] overflow-y-auto">
                                                                        {AVAILABLE_COLUMNS.map(col => (
                                                                            <DropdownMenuCheckboxItem
                                                                                key={col.id}
                                                                                checked={taskColumns.includes(col.id)}
                                                                                onCheckedChange={(checked) => {
                                                                                    if (checked) setTaskColumns([...taskColumns, col.id]);
                                                                                    else setTaskColumns(taskColumns.filter(id => id !== col.id));
                                                                                }}
                                                                                className="text-[13px]"
                                                                            >
                                                                                <div className="flex items-center gap-2">{col.icon}{col.label}</div>
                                                                            </DropdownMenuCheckboxItem>
                                                                        ))}
                                                                    </div>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="">
                                                    {customRelTasks.map((dep: any) => (
                                                        <tr key={dep.id} className="group hover:bg-zinc-50/80 transition-colors">
                                                            <td className="py-2.5 pl-2 max-w-[200px] min-w-[250px] sticky left-0 bg-white group-hover:bg-[#fbfbfb] z-10 border-b border-zinc-100" style={{ boxShadow: '2px 0 4px -1px rgba(0,0,0,0.06)' }}>
                                                                <div className="flex items-center gap-2">
                                                                    {renderStatusIcon(dep.dependsOn || dep.task)}
                                                                    <span onClick={() => openTask(dep.dependsOn?.id || dep.dependsOnId)} className="font-medium text-zinc-900 truncate block hover:text-indigo-600 cursor-pointer transition-colors">{dep.dependsOn?.title || 'Task'}</span>
                                                                </div>
                                                            </td>
                                                            {taskColumns.map(colId => (
                                                                <td key={colId} className="py-2.5 border-b border-zinc-100">{renderTaskCell(dep, colId)}</td>
                                                            ))}
                                                            <td className="py-2.5 text-center sticky right-0 bg-white group-hover:bg-[#fbfbfb] z-10 border-b border-zinc-100" style={{ boxShadow: '-2px 0 4px -1px rgba(0,0,0,0.06)' }}>
                                                                <button
                                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-200 rounded cursor-pointer"
                                                                    onClick={() => removeDependency.mutate({ taskId, dependsOnId: dep.dependsOnId })}
                                                                >
                                                                    <X className="h-3.5 w-3.5 text-zinc-400" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setCustomRelPickerRelId(rel.id);
                                                setCustomRelPickerOpen(true);
                                            }}
                                            className="mt-2 py-1.5 text-zinc-400 flex items-center gap-1.5 cursor-pointer hover:text-zinc-600 text-[13px] font-medium transition-colors"
                                        >
                                            <Plus className="h-4 w-4" /> Add Task
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Hidden Popover anchors since we trigger them via DropdownMenu */}
            <TaskDocPickerPopover
                open={docPickerOpen}
                onOpenChange={setDocPickerOpen}
                taskId={taskId}
                workspaceId={workspaceId}
                onSelect={handleSelectDocOrTask}
                trigger={<div className="absolute top-1/2 left-1/2 w-1 h-1 pointer-events-none opacity-0" />}
                align="center"
                side="top"
            />
            <TaskPickerPopover
                open={taskPickerOpen}
                onOpenChange={setTaskPickerOpen}
                taskId={taskId}
                workspaceId={workspaceId}
                dependencyType="FINISH_TO_FINISH"
                onSelect={(id) => handleSelectTask(id, 'related')}
                trigger={<div className="absolute top-1/2 left-1/2 w-1 h-1 pointer-events-none opacity-0" />}
                align="center"
                side="top"
            />
            <DocPickerPopover
                open={docOnlyPickerOpen}
                onOpenChange={setDocOnlyPickerOpen}
                workspaceId={workspaceId}
                onSelect={(docId) => handleSelectDocOrTask({ type: 'DOCUMENT', id: docId })}
                trigger={<div className="absolute top-1/2 left-1/2 w-1 h-1 pointer-events-none opacity-0" />}
                align="center"
                side="top"
            />
            <TaskPickerPopover
                open={blocksPickerOpen}
                onOpenChange={setBlocksPickerOpen}
                taskId={taskId}
                workspaceId={workspaceId}
                dependencyType="FINISH_TO_START"
                onSelect={(id) => handleSelectTask(id, 'blocks')}
                trigger={<div className="absolute top-1/2 left-1/2 w-1 h-1 pointer-events-none opacity-0" />}
                align="center"
                side="top"
            />
            <TaskPickerPopover
                open={blockedByPickerOpen}
                onOpenChange={setBlockedByPickerOpen}
                taskId={taskId}
                workspaceId={workspaceId}
                dependencyType="FINISH_TO_START"
                onSelect={(id) => handleSelectTask(id, 'blocked_by')}
                trigger={<div className="absolute top-1/2 left-1/2 w-1 h-1 pointer-events-none opacity-0" />}
                align="center"
                side="top"
            />
            {/* Custom Relationship Task Picker */}
            <TaskPickerPopover
                open={customRelPickerOpen}
                onOpenChange={(v) => { setCustomRelPickerOpen(v); if (!v) setCustomRelPickerRelId(null); }}
                taskId={taskId}
                workspaceId={workspaceId}
                dependencyType="FINISH_TO_FINISH"
                onSelect={(id) => {
                    if (customRelPickerRelId) {
                        handleSelectTask(id, 'custom', customRelPickerRelId);
                        setActiveTab(customRelPickerRelId);
                    }
                    setCustomRelPickerOpen(false);
                    setCustomRelPickerRelId(null);
                }}
                trigger={<div className="absolute top-1/2 left-1/2 w-1 h-1 pointer-events-none opacity-0" />}
                align="center"
                side="top"
            />
        </div>
    );
}
