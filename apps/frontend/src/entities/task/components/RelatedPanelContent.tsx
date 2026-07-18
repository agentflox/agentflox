'use client';

import * as React from 'react';
import { ArrowLeftRight, Search, ChevronDown, ChevronRight, Plus, ExternalLink, X, Maximize2, Minimize2, Flag, ArrowUpRight, CheckCircle2, FileText, CircleDot, PlusCircle, Columns, Calendar, CalendarCheck, CalendarClock, CalendarDays, Timer, Clock, Hourglass, Hash, MoreHorizontal, FoldVertical, UnfoldVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { CustomRelationshipType } from './CreateCustomRelationshipModal';
import { TaskDocPickerPopover } from './TaskDocPickerPopover';
import { TaskPickerPopover } from './TaskPickerPopover';
import { DocPickerPopover } from './DocPickerPopover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { NewCustomRelationshipPopover } from './NewCustomRelationshipPopover';

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

interface RelatedPanelContentProps {
    taskId: string;
    workspaceId: string;
    /** The task object to extract dependencies and attachments from */
    task: any;
    /** Custom relationship types - each gets its own section */
    customTypes: CustomRelationshipType[];
}

export function RelatedPanelContent({ taskId, workspaceId, task, customTypes }: RelatedPanelContentProps) {
    const [pickerOpen, setPickerOpen] = React.useState(false);
    const [taskPickerOpen, setTaskPickerOpen] = React.useState(false);
    const [docPickerOpen, setDocPickerOpen] = React.useState(false);
    const [customRelationshipAnchor, setCustomRelationshipAnchor] = React.useState<'header' | 'empty' | null>(null);
    const [collapsedIds, setCollapsedIds] = React.useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = React.useState('');
    const [showSearch, setShowSearch] = React.useState(false);

    // Header actions
    const [tasksCollapsed, setTasksCollapsed] = React.useState(false);
    const [docsCollapsed, setDocsCollapsed] = React.useState(false);
    const [taskColumns, setTaskColumns] = React.useState<string[]>(['dueDate', 'priority']);

    const allDependencies = task?.dependencies ?? [];
    const allAttachments = task?.attachments ?? [];

    const linkedTasks = React.useMemo(() => allDependencies.filter((d: any) => d.type === 'FINISH_TO_FINISH' && !d.customRelationshipTypeId), [allDependencies]);
    const docLinks = React.useMemo(() => allAttachments.filter((a: any) => a.mimeType === 'doc_link'), [allAttachments]);

    const existingTaskIds = React.useMemo(() => linkedTasks.map((d: any) => d.dependsOnId), [linkedTasks]);
    const existingDocIds = React.useMemo(() => docLinks.map((a: any) => a.url.replace('/documents/', '')), [docLinks]);

    const hasAnyItems = linkedTasks.length > 0 || docLinks.length > 0 || customTypes.length > 0;

    const utils = trpc.useUtils();
    const addDependency = trpc.task.addDependency.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
            setPickerOpen(false);
            toast.success('Task added');
        },
        onError: (e) => toast.error(e.message || 'Failed to add'),
    });
    const removeDependency = trpc.task.removeDependency.useMutation({
        onSuccess: () => utils.task.get.invalidate({ id: taskId }),
    });

    const createAttachment = trpc.task.attachments.create.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
            toast.success('Document linked');
            setDocPickerOpen(false);
        },
        onError: (e) => toast.error(e.message || 'Failed to link document'),
    });

    const handleSelect = (selected: { type: "TASK" | "DOCUMENT", id: string }) => {
        if (selected.type === "TASK") {
            addDependency.mutate({
                taskId,
                dependsOnId: selected.id,
                type: 'FINISH_TO_FINISH' as RelationshipDependencyType,
            });
        }
    };

    const handleTaskSelect = (selectedTaskId: string) => {
        addDependency.mutate({
            taskId,
            dependsOnId: selectedTaskId,
            type: 'FINISH_TO_FINISH' as RelationshipDependencyType,
        });
    };

    const handleDocSelect = (documentId: string, documentTitle: string) => {
        createAttachment.mutate({
            taskId,
            url: `/documents/${documentId}`,
            filename: documentTitle,
            size: 0,
            mimeType: 'doc_link',
        });
    };

    const toggleCollapsed = (id: string) => {
        setCollapsedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const renderTaskCell = (dep: any, colId: string) => {
        const t = dep.dependsOn;
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
        <div className="flex flex-col h-full min-h-0 relative">
            <div className="flex items-center justify-between gap-2 shrink-0 mb-3">
                <h3 className="text-base font-semibold text-zinc-900">Related items</h3>
                <div className="flex items-center gap-1">
                    <Button
                        size="icon"
                        variant="ghost"
                        className={cn("h-7 w-7", showSearch && "bg-zinc-100 text-zinc-900")}
                        aria-label="Search"
                        onClick={() => setShowSearch(!showSearch)}
                    >
                        <Search className="h-3.5 w-3.5" />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Add related">
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56" onCloseAutoFocus={(e) => e.preventDefault()}>
                            <DropdownMenuItem onSelect={() => {
                                setTimeout(() => setPickerOpen(true), 150);
                            }} className="text-[13px] text-zinc-500">
                                <ArrowLeftRight className="h-4 w-4 mr-2 text-zinc-400" />
                                Relate a Task or Doc
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => {
                                setTimeout(() => setCustomRelationshipAnchor('header'), 150);
                            }} className="text-[13px] text-zinc-500">
                                <Plus className="h-4 w-4 mr-2 text-zinc-400" />
                                New custom relationship
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <NewCustomRelationshipPopover
                        open={customRelationshipAnchor === 'header'}
                        onOpenChange={(v) => !v && setCustomRelationshipAnchor(null)}
                        trigger={<div className="absolute top-8 right-0 w-1 h-1 pointer-events-none opacity-0" />}
                        align="end"
                    />
                </div>
            </div>

            <Tabs defaultValue="relationships" className="flex-1 flex flex-col min-h-0">
                <TabsList className="w-full grid grid-cols-2 mb-4 shrink-0">
                    <TabsTrigger value="relationships" className="h-6 text-xs flex items-center text-zinc-500 hover:text-zinc-600 justify-center gap-1.5 cursor-pointer">
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        Relationships
                    </TabsTrigger>
                    <TabsTrigger value="references" className="h-6 text-xs flex items-center text-zinc-500 hover:text-zinc-600 justify-center gap-1.5 cursor-pointer">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        References
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="relationships" className="flex-1 overflow-auto min-h-0 data-[state=inactive]:hidden m-0 flex flex-col">
                    {!hasAnyItems ? (
                        <div className="flex flex-col items-center justify-center flex-1 text-center px-4 py-8">
                            <div className="h-12 w-12 rounded-[14px] border border-zinc-200 flex items-center justify-center mb-4 bg-white shadow-sm">
                                <ArrowLeftRight className="h-6 w-6 text-zinc-400" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-sm font-semibold text-zinc-600 mb-1">No related items</h3>
                            <p className="text-xs text-zinc-500 mb-4 max-w-[240px]">
                                Link related Tasks or Docs to organize and quickly access them here.
                            </p>

                            <div className="relative flex justify-center">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs h-8 px-3.5 gap-1.5 font-medium text-zinc-500 bg-white hover:bg-zinc-100 hover:text-zinc-600 border-zinc-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_2px_6px_rgba(0,0,0,0.06)] hover:-translate-y-[0.5px] active:translate-y-0 active:scale-[0.98] rounded-md group"
                                        >
                                            <Plus className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-500 transition-colors" />
                                            Relate a Task or Doc
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="center" className="w-56" onCloseAutoFocus={(e) => e.preventDefault()}>
                                        <DropdownMenuItem onSelect={() => {
                                            setTimeout(() => setPickerOpen(true), 150);
                                        }} className="text-[13px] text-zinc-500">
                                            <ArrowLeftRight className="h-4 w-4 mr-2 text-zinc-400" />
                                            Relate a Task or Doc
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => {
                                            setTimeout(() => setCustomRelationshipAnchor('empty'), 150);
                                        }} className="text-[13px] text-zinc-500">
                                            <Plus className="h-4 w-4 mr-2 text-zinc-400" />
                                            New custom relationship
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <NewCustomRelationshipPopover
                                    open={customRelationshipAnchor === 'empty'}
                                    onOpenChange={(v) => !v && setCustomRelationshipAnchor(null)}
                                    trigger={<div className="absolute top-0 left-1/2 w-1 h-1 pointer-events-none opacity-0" />}
                                    side="top"
                                    align="center"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {/* Search */}
                            {showSearch && (
                                <div className="px-2 py-1 mb-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex h-8 items-center rounded-md border border-zinc-200 bg-white px-2 transition-colors focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10 shadow-sm">
                                        <Search className="h-4 w-4 shrink-0 text-zinc-400 mr-2" />
                                        <Input
                                            variant="ghost"
                                            className="w-full bg-transparent p-0 text-[13px] outline-none placeholder:text-zinc-400 text-zinc-700 border-0 focus-visible:ring-0 shadow-none h-full"
                                            placeholder="Search..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="px-1 space-y-6">
                                {/* ── Task Section ── */}
                                {linkedTasks.length > 0 && (
                                    <div className="px-1">
                                        <div className="flex items-center gap-1.5 mb-3 group">
                                            <CheckCircle2 className="h-4 w-4 text-zinc-800" />
                                            <span className="font-semibold text-zinc-900 text-[14px]">Task</span>
                                            <span className="text-zinc-400 font-normal text-[14px]">{linkedTasks.length}</span>
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
                                                            {linkedTasks.map((dep: any) => {
                                                                if (searchQuery && !dep.dependsOn?.title?.toLowerCase().includes(searchQuery.toLowerCase())) return null;
                                                                return (
                                                                    <tr key={dep.id} className="group hover:bg-zinc-50/50">
                                                                        <td className="py-2.5 max-w-[200px]">
                                                                            <div className="flex items-center gap-2">
                                                                                <CircleDot className="h-4 w-4 text-blue-500 shrink-0" />
                                                                                <span className="font-medium text-zinc-900 truncate block">{dep.dependsOn?.title ?? 'Untitled'}</span>
                                                                            </div>
                                                                        </td>
                                                                        {taskColumns.map(colId => (
                                                                            <td key={colId} className="py-2.5">
                                                                                {renderTaskCell(dep, colId)}
                                                                            </td>
                                                                        ))}
                                                                        <td className="py-2.5 text-center">
                                                                            <button onClick={() => removeDependency.mutate({ taskId, dependsOnId: dep.dependsOn.id })} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-100 rounded cursor-pointer">
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
                                                    onClick={() => setDocPickerOpen(true)}
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {!docsCollapsed && (
                                            <>
                                                <div className="border-t border-b border-zinc-100 py-1">
                                                    {docLinks.map((doc: any) => {
                                                        if (searchQuery && !doc.filename?.toLowerCase().includes(searchQuery.toLowerCase()) && !doc.url?.toLowerCase().includes(searchQuery.toLowerCase())) return null;
                                                        return (
                                                            <div key={doc.id} className="py-2 flex items-center gap-2 hover:bg-zinc-50/50 group">
                                                                <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
                                                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-medium text-zinc-900 text-[13px] hover:underline truncate flex-1 block">{doc.filename || doc.url}</a>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <button onClick={() => setDocPickerOpen(true)} className="mt-2 py-1.5 text-zinc-400 flex items-center gap-1.5 cursor-pointer hover:text-zinc-600 text-[13px] font-medium transition-colors">
                                                    <ArrowLeftRight className="h-4 w-4" /> Relate Doc
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}

                                {customTypes.map((ct) => (
                                    <RelatedSection
                                        key={ct.id}
                                        relationshipType={ct}
                                        items={linkedTasks}
                                        collapsed={collapsedIds[ct.id] ?? false}
                                        onCollapsedChange={() => toggleCollapsed(ct.id)}
                                        onAddTask={() => setPickerOpen(true)}
                                        onRemove={(dependsOnId) => removeDependency.mutate({ taskId, dependsOnId })}
                                        removePending={removeDependency.isPending}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="references" className="flex-1 overflow-auto min-h-0 data-[state=inactive]:hidden m-0 flex flex-col">
                    <div className="flex flex-col items-center justify-center flex-1 text-center px-4 py-8">
                        <div className="h-12 w-12 rounded-[14px] border border-zinc-200 flex items-center justify-center mb-4 bg-white shadow-sm">
                            <ArrowUpRight className="h-6 w-6 text-zinc-400" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-sm font-semibold text-zinc-900 mb-1">No references to this task</h3>
                        <p className="text-sm text-zinc-500 max-w-[280px]">
                            References appear here when other Tasks or Docs mentions this Task, or when other Tasks or Docs are mentioned in this Task.
                        </p>
                    </div>
                </TabsContent>
            </Tabs>

            <TaskDocPickerPopover
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                taskId={taskId}
                workspaceId={workspaceId}
                dependencyType="FINISH_TO_FINISH"
                onSelect={handleSelect}
                trigger={<div className="absolute top-1/2 left-1/2 w-1 h-1 pointer-events-none opacity-0" />}
                align="center"
                side="top"
                existingTaskIds={existingTaskIds}
                existingDocIds={existingDocIds}
            />
            <TaskPickerPopover
                open={taskPickerOpen}
                onOpenChange={setTaskPickerOpen}
                taskId={taskId}
                workspaceId={workspaceId}
                dependencyType="FINISH_TO_FINISH"
                onSelect={handleTaskSelect}
                trigger={<div className="absolute top-1/2 left-1/2 w-1 h-1 pointer-events-none opacity-0" />}
                align="center"
                side="top"
                existingIds={existingTaskIds}
            />
            <DocPickerPopover
                open={docPickerOpen}
                onOpenChange={setDocPickerOpen}
                workspaceId={workspaceId}
                onSelect={handleDocSelect}
                trigger={<div className="absolute top-1/2 left-1/2 w-1 h-1 pointer-events-none opacity-0" />}
                align="center"
                side="top"
                existingIds={existingDocIds}
            />
        </div>
    );
}

function RelatedSection({
    relationshipType,
    items,
    collapsed,
    onCollapsedChange,
    onAddTask,
    onRemove,
    removePending,
}: {
    relationshipType: CustomRelationshipType;
    items: Array<{
        id: string;
        dependsOnId: string;
        dependsOn: {
            id: string;
            title: string | null;
            dueDate?: Date | string | null;
            priority?: string | null;
            assignees?: Array<{ user?: { id: string; name: string | null; image: string | null } }>;
        };
    }>;
    collapsed: boolean;
    onCollapsedChange: (v: boolean) => void;
    onAddTask: () => void;
    onRemove: (id: string) => void;
    removePending: boolean;
}) {
    const count = items.length;

    return (
        <div className="rounded-lg border border-zinc-200 overflow-hidden bg-white">
            <button
                type="button"
                onClick={() => onCollapsedChange(!collapsed)}
                className="flex items-center gap-2 py-2.5 px-3 w-full text-left hover:bg-zinc-50/50 transition-colors border-b border-zinc-100"
            >
                {collapsed ? <ChevronRight className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                <ArrowLeftRight className="h-4 w-4 text-zinc-500" />
                <span className="text-sm font-medium text-zinc-900">{relationshipType.name} {count}</span>
            </button>

            {!collapsed && (
                <>
                    <div className="overflow-auto max-h-[200px]">
                        <table className="w-full text-sm">
                            <thead className="bg-zinc-50/80 sticky top-0">
                                <tr>
                                    <th className="text-left py-2 px-3 font-medium text-zinc-500">Name</th>
                                    <th className="text-left py-2 px-3 font-medium text-zinc-500 w-24">Due date</th>
                                    <th className="text-left py-2 px-3 font-medium text-zinc-500 w-16">Priority</th>
                                    <th className="text-left py-2 px-3 font-medium text-zinc-500 w-24">Assignee</th>
                                    <th className="w-8" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-4 text-center text-sm text-zinc-400">
                                            No tasks.
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((dep) => {
                                        const assignee = dep.dependsOn.assignees?.[0]?.user;
                                        return (
                                            <tr key={dep.id} className="hover:bg-zinc-50/50 group">
                                                <td className="py-2 px-3">
                                                    <a
                                                        href={`/tasks/${dep.dependsOn.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-zinc-900 font-medium hover:text-purple-600 truncate block max-w-[180px]"
                                                    >
                                                        {dep.dependsOn.title ?? 'Untitled'}
                                                    </a>
                                                </td>
                                                <td className="py-2 px-3">
                                                    <span className={dep.dependsOn.dueDate ? 'text-red-600' : 'text-zinc-500'}>
                                                        {dep.dependsOn.dueDate ? format(new Date(dep.dependsOn.dueDate), 'MM/dd/yy') : '—'}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3">
                                                    {dep.dependsOn.priority ? (
                                                        <Flag className={cn('h-3.5 w-3.5', PRIORITY_COLORS[dep.dependsOn.priority] ?? 'text-zinc-500')} />
                                                    ) : (
                                                        <span className="text-zinc-400">—</span>
                                                    )}
                                                </td>
                                                <td className="py-2 px-3">
                                                    {assignee ? (
                                                        <Avatar className="h-5 w-5">
                                                            <AvatarImage src={assignee.image ?? undefined} />
                                                            <AvatarFallback className="text-[9px] bg-zinc-200 text-zinc-600">
                                                                {assignee.name?.substring(0, 2).toUpperCase() ?? '?'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    ) : (
                                                        <span className="text-zinc-400 text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="py-2 px-1">
                                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => window.open(`/tasks/${dep.dependsOn.id}`, '_blank')}>
                                                            <ExternalLink className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() => onRemove(dep.dependsOnId)}
                                                            disabled={removePending}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                                <tr>
                                    <td colSpan={5} className="py-2 px-3">
                                        <button
                                            type="button"
                                            onClick={onAddTask}
                                            className="text-sm text-zinc-500 hover:text-purple-600 flex items-center gap-1"
                                        >
                                            <Plus className="h-3.5 w-3.5" /> Add task
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
