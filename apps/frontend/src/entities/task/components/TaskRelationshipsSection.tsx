'use client';

import * as React from 'react';
import {
    Repeat, Maximize2, Minimize2, ChevronRight, Plus, MinusCircle, AlertTriangle, ArrowLeftRight, CheckCircle2, FileText, CircleDot, PlusCircle, Columns, Calendar, CalendarCheck, CalendarClock, CalendarDays, Timer, Clock, Hourglass, Hash, MoreHorizontal, FoldVertical, UnfoldVertical, X, Flag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
import { TaskPickerPopover } from './TaskPickerPopover';
import { TaskDocPickerPopover } from './TaskDocPickerPopover';
import { DocPickerPopover } from './DocPickerPopover';
import { NewCustomRelationshipPopover } from './NewCustomRelationshipPopover';

interface TaskRelationshipsSectionProps {
    taskId: string;
    workspaceId: string;
    task?: any;
}

export function TaskRelationshipsSection({ taskId, workspaceId, task }: TaskRelationshipsSectionProps) {
    const [isMaximized, setIsMaximized] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<'related' | 'dependencies'>('related');
    
    // Popovers state
    const [docPickerOpen, setDocPickerOpen] = React.useState(false);
    const [taskPickerOpen, setTaskPickerOpen] = React.useState(false);
    const [docOnlyPickerOpen, setDocOnlyPickerOpen] = React.useState(false);
    const [blocksPickerOpen, setBlocksPickerOpen] = React.useState(false);
    const [blockedByPickerOpen, setBlockedByPickerOpen] = React.useState(false);
    const [customRelAnchor, setCustomRelAnchor] = React.useState<'header' | 'empty' | null>(null);

    const handleSelectTask = (id: string, type: string) => {
        console.log("Selected", id, type);
    };
    
    const handleSelectDocOrTask = (item: { type: "TASK" | "DOCUMENT", id: string }) => {
        console.log("Selected", item);
    };

    // Calculate items
    const blockedByItems = task?.dependencies?.filter((d: any) => d.type === 'FINISH_TO_START' || d.dependencyType === 'FINISH_TO_START') || [];
    const relatedTasks = task?.dependencies?.filter((d: any) => d.type !== 'FINISH_TO_START' && d.dependencyType !== 'FINISH_TO_START') || [];
    const blocksItems = task?.blockedDependencies || [];
    const docLinks = task?.attachments?.filter((a: any) => a.mimeType === 'doc_link') || [];
    const taskLinks = task?.attachments?.filter((a: any) => a.mimeType === 'link') || [];
    
    const totalRelated = relatedTasks.length + docLinks.length + taskLinks.length;
    const totalDependencies = blocksItems.length + blockedByItems.length;
    const totalItems = totalRelated + totalDependencies;

    const [tasksCollapsed, setTasksCollapsed] = React.useState(false);
    const [docsCollapsed, setDocsCollapsed] = React.useState(false);
    const [blocksCollapsed, setBlocksCollapsed] = React.useState(false);
    const [blockedByCollapsed, setBlockedByCollapsed] = React.useState(false);
    const [taskColumns, setTaskColumns] = React.useState<string[]>(['dueDate', 'priority']);

    const renderTaskCell = (dep: any, colId: string) => {
        const t = dep.dependsOn || dep.task || dep;
        if (!t) return null;
        switch (colId) {
            case 'dueDate': return t.dueDate ? <span className="text-red-500 truncate block">{format(new Date(t.dueDate), 'M/d/yy, h:mma').toLowerCase()}</span> : null;
            case 'priority': return t.priority ? <Flag className={cn("h-4 w-4", PRIORITY_COLORS[t.priority.toUpperCase()] || 'text-zinc-400')} /> : <Flag className="h-4 w-4 text-zinc-300" />;
            case 'status': return t.status ? <span className="text-zinc-600 truncate block">{t.status.name}</span> : null;
            case 'taskId': return <span className="text-zinc-500">{t.shortId}</span>;
            case 'customTaskId': return <span className="text-zinc-500">{t.customId || t.shortId}</span>;
            case 'dateCreated': return t.createdAt ? <span className="text-zinc-600">{format(new Date(t.createdAt), 'M/d/yy')}</span> : null;
            case 'dateUpdated': return t.updatedAt ? <span className="text-zinc-600">{format(new Date(t.updatedAt), 'M/d/yy')}</span> : null;
            case 'dateDone': return t.dateDone ? <span className="text-zinc-600">{format(new Date(t.dateDone), 'M/d/yy')}</span> : null;
            case 'startDate': return t.startDate ? <span className="text-zinc-600">{format(new Date(t.startDate), 'M/d/yy')}</span> : null;
            case 'timeTracked': return <span className="text-zinc-600">-</span>;
            case 'timeEstimate': return <span className="text-zinc-600">-</span>;
            case 'duration': return <span className="text-zinc-600">-</span>;
            default: return null;
        }
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
                            <DropdownMenuItem onSelect={() => {
                                setTimeout(() => setCustomRelAnchor('empty'), 150);
                            }} className="py-2 cursor-pointer rounded-md text-[13px]">
                                <Plus className="h-4 w-4 mr-2.5 text-zinc-500" />
                                New custom relationship
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <NewCustomRelationshipPopover
                        open={customRelAnchor === 'empty'}
                        onOpenChange={(v) => !v && setCustomRelAnchor(null)}
                        trigger={<div className="absolute top-0 left-1/2 w-1 h-1 pointer-events-none opacity-0" />}
                        side="top"
                        align="center"
                    />
                </div>
            ) : (
                <div className={cn("space-y-3", isMaximized && "max-w-5xl w-full mx-auto mt-12")}>
                    {/* Header with Tabs */}
                    <div className="flex items-center justify-between group/header border-b border-zinc-200">
                        <div className="flex items-center gap-4">
                            <div 
                                className={cn("flex items-center gap-1.5 cursor-pointer pb-1.5 border-b-2 transition-colors", activeTab === 'related' ? "border-zinc-900" : "border-transparent hover:border-zinc-300")}
                                onClick={() => setActiveTab('related')}
                            >
                                <ChevronRight className={cn("h-4 w-4 transition-transform", activeTab === 'related' ? "text-zinc-900 rotate-90" : "text-zinc-400")} />
                                <span className={cn("text-sm font-semibold", activeTab === 'related' ? "text-zinc-900" : "text-zinc-500")}>Related</span>
                                {totalRelated > 0 && (
                                    <span className={cn("text-xs", activeTab === 'related' ? "text-zinc-500" : "text-zinc-400")}>{totalRelated}</span>
                                )}
                            </div>
                            <div 
                                className={cn("flex items-center gap-1.5 cursor-pointer pb-1.5 border-b-2 transition-colors", activeTab === 'dependencies' ? "border-zinc-900" : "border-transparent hover:border-zinc-300")}
                                onClick={() => setActiveTab('dependencies')}
                            >
                                <span className={cn("text-sm font-semibold", activeTab === 'dependencies' ? "text-zinc-900" : "text-zinc-500")}>Dependencies</span>
                                {totalDependencies > 0 && (
                                    <span className={cn("text-xs", activeTab === 'dependencies' ? "text-zinc-500" : "text-zinc-400")}>{totalDependencies}</span>
                                )}
                            </div>
                        </div>

                        {/* Right side buttons */}
                        <div className="flex items-center gap-0.5 pb-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
                            <TooltipProvider delayDuration={200}>
                                <div className="flex items-center p-0.5 border border-zinc-200 rounded-md shadow-sm bg-white relative">
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
                                            <DropdownMenuItem onSelect={() => {
                                                setTimeout(() => setCustomRelAnchor('header'), 150);
                                            }} className="py-2 cursor-pointer rounded-md text-[13px]">
                                                <Plus className="h-4 w-4 mr-2.5 text-zinc-500" />
                                                New custom relationship
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <NewCustomRelationshipPopover
                                        open={customRelAnchor === 'header'}
                                        onOpenChange={(v) => !v && setCustomRelAnchor(null)}
                                        trigger={<div className="absolute top-8 right-0 w-1 h-1 pointer-events-none opacity-0" />}
                                        align="end"
                                    />
                                </div>
                            </TooltipProvider>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="pt-2">
                        {activeTab === 'related' && (
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
                                                                        <span className="text-xs text-zinc-500 font-medium">{taskColumns.length} selected</span>
                                                                        <button onClick={() => setTaskColumns([])} className="text-xs text-indigo-600 hover:underline cursor-pointer">Clear</button>
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
                                                        <table className="w-full text-[13px] min-w-[400px]">
                                                            <thead className="text-zinc-500 font-medium">
                                                                <tr>
                                                                    <th className="text-left font-medium pb-2 whitespace-nowrap">Name</th>
                                                                    {taskColumns.map(colId => {
                                                                        const col = AVAILABLE_COLUMNS.find(c => c.id === colId);
                                                                        if (!col) return null;
                                                                        return <th key={col.id} className="text-left font-medium pb-2 w-32 whitespace-nowrap">{col.label}</th>;
                                                                    })}
                                                                    <th className="text-center font-medium pb-2 w-10">
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <button className="p-1 hover:bg-zinc-200 rounded mx-auto block cursor-pointer transition-colors">
                                                                                    <PlusCircle className="h-4 w-4 text-zinc-500" />
                                                                                </button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end" className="w-56">
                                                                                <div className="px-2 py-1.5 flex items-center justify-between">
                                                                                    <span className="text-xs text-zinc-500 font-medium">{taskColumns.length} selected</span>
                                                                                    <button onClick={() => setTaskColumns([])} className="text-xs text-indigo-600 hover:underline cursor-pointer">Clear</button>
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
                                                            <tbody className="divide-y divide-zinc-100 border-t border-b border-zinc-100">
                                                                {relatedTasks.map((dep: any) => {
                                                                    return (
                                                                        <tr key={dep.id} className="group hover:bg-zinc-50/50">
                                                                            <td className="py-2.5 max-w-[200px]">
                                                                                <div className="flex items-center gap-2">
                                                                                    <CircleDot className="h-4 w-4 text-blue-500 shrink-0" />
                                                                                    <span className="font-medium text-zinc-900 truncate block">{dep.task?.name || dep.name || 'Task'}</span>
                                                                                </div>
                                                                            </td>
                                                                            {taskColumns.map(colId => (
                                                                                <td key={colId} className="py-2.5">
                                                                                    {renderTaskCell(dep, colId)}
                                                                                </td>
                                                                            ))}
                                                                            <td className="py-2.5 text-center">
                                                                                <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-100 rounded cursor-pointer">
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

                        {activeTab === 'dependencies' && (
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
                                                                        <span className="text-xs text-zinc-500 font-medium">{taskColumns.length} selected</span>
                                                                        <button onClick={() => setTaskColumns([])} className="text-xs text-indigo-600 hover:underline cursor-pointer">Clear</button>
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
                                                        <table className="w-full text-[13px] min-w-[400px]">
                                                            <thead className="text-zinc-500 font-medium">
                                                                <tr>
                                                                    <th className="text-left font-medium pb-2 whitespace-nowrap">Name</th>
                                                                    {taskColumns.map(colId => {
                                                                        const col = AVAILABLE_COLUMNS.find(c => c.id === colId);
                                                                        if (!col) return null;
                                                                        return <th key={col.id} className="text-left font-medium pb-2 w-32 whitespace-nowrap">{col.label}</th>;
                                                                    })}
                                                                    <th className="text-center font-medium pb-2 w-10">
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <button className="p-1 hover:bg-zinc-200 rounded mx-auto block cursor-pointer transition-colors">
                                                                                    <PlusCircle className="h-4 w-4 text-zinc-500" />
                                                                                </button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end" className="w-56">
                                                                                <div className="px-2 py-1.5 flex items-center justify-between">
                                                                                    <span className="text-xs text-zinc-500 font-medium">{taskColumns.length} selected</span>
                                                                                    <button onClick={() => setTaskColumns([])} className="text-xs text-indigo-600 hover:underline cursor-pointer">Clear</button>
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
                                                            <tbody className="divide-y divide-zinc-100 border-t border-b border-zinc-100">
                                                                {blocksItems.map((dep: any) => {
                                                                    return (
                                                                        <tr key={dep.id} className="group hover:bg-zinc-50/50">
                                                                            <td className="py-2.5 max-w-[200px]">
                                                                                <div className="flex items-center gap-2">
                                                                                    <CircleDot className="h-4 w-4 text-blue-500 shrink-0" />
                                                                                    <span className="font-medium text-zinc-900 truncate block">{dep.dependsOn?.name || dep.name || 'Task'}</span>
                                                                                </div>
                                                                            </td>
                                                                            {taskColumns.map(colId => (
                                                                                <td key={colId} className="py-2.5">
                                                                                    {renderTaskCell(dep, colId)}
                                                                                </td>
                                                                            ))}
                                                                            <td className="py-2.5 text-center">
                                                                                <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-100 rounded cursor-pointer">
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
                                                                        <span className="text-xs text-zinc-500 font-medium">{taskColumns.length} selected</span>
                                                                        <button onClick={() => setTaskColumns([])} className="text-xs text-indigo-600 hover:underline cursor-pointer">Clear</button>
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
                                                        <table className="w-full text-[13px] min-w-[400px]">
                                                            <thead className="text-zinc-500 font-medium">
                                                                <tr>
                                                                    <th className="text-left font-medium pb-2 whitespace-nowrap">Name</th>
                                                                    {taskColumns.map(colId => {
                                                                        const col = AVAILABLE_COLUMNS.find(c => c.id === colId);
                                                                        if (!col) return null;
                                                                        return <th key={col.id} className="text-left font-medium pb-2 w-32 whitespace-nowrap">{col.label}</th>;
                                                                    })}
                                                                    <th className="text-center font-medium pb-2 w-10">
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <button className="p-1 hover:bg-zinc-200 rounded mx-auto block cursor-pointer transition-colors">
                                                                                    <PlusCircle className="h-4 w-4 text-zinc-500" />
                                                                                </button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end" className="w-56">
                                                                                <div className="px-2 py-1.5 flex items-center justify-between">
                                                                                    <span className="text-xs text-zinc-500 font-medium">{taskColumns.length} selected</span>
                                                                                    <button onClick={() => setTaskColumns([])} className="text-xs text-indigo-600 hover:underline cursor-pointer">Clear</button>
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
                                                            <tbody className="divide-y divide-zinc-100 border-t border-b border-zinc-100">
                                                                {blockedByItems.map((dep: any) => {
                                                                    return (
                                                                        <tr key={dep.id} className="group hover:bg-zinc-50/50">
                                                                            <td className="py-2.5 max-w-[200px]">
                                                                                <div className="flex items-center gap-2">
                                                                                    <CircleDot className="h-4 w-4 text-blue-500 shrink-0" />
                                                                                    <span className="font-medium text-zinc-900 truncate block">{dep.task?.name || dep.name || 'Task'}</span>
                                                                                </div>
                                                                            </td>
                                                                            {taskColumns.map(colId => (
                                                                                <td key={colId} className="py-2.5">
                                                                                    {renderTaskCell(dep, colId)}
                                                                                </td>
                                                                            ))}
                                                                            <td className="py-2.5 text-center">
                                                                                <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-100 rounded cursor-pointer">
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
                dependencyType="RELATED"
                onSelect={(id) => handleSelectTask(id, 'related')}
                trigger={<div className="absolute top-1/2 left-1/2 w-1 h-1 pointer-events-none opacity-0" />}
                align="center"
                side="top"
            />
            <DocPickerPopover
                open={docOnlyPickerOpen}
                onOpenChange={setDocOnlyPickerOpen}
                taskId={taskId}
                workspaceId={workspaceId}
                onSelect={(doc) => handleSelectDocOrTask({ type: 'DOCUMENT', id: doc.id })}
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
        </div>
    );
}
