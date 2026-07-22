'use client';

import * as React from 'react';
import { ArrowLeftRight, Search, ChevronDown, ChevronRight, Plus, ExternalLink, X, Maximize2, Minimize2, Flag, ArrowUpRight, CheckCircle2, FileText, CircleDot, PlusCircle, Columns, Calendar, CalendarCheck, CalendarClock, CalendarDays, Timer, Clock, Hourglass, Hash, MoreHorizontal, FoldVertical, UnfoldVertical, Settings2, MinusCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TaskDocPickerPopover } from './TaskDocPickerPopover';
import { TaskPickerPopover } from './TaskPickerPopover';
import { DocPickerPopover } from './DocPickerPopover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { NewCustomRelationshipPopover } from './NewCustomRelationshipPopover';
import { EditCustomRelationshipPopover } from './EditCustomRelationshipPopover';
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

interface RelatedPanelContentProps {
    taskId: string;
    workspaceId: string;
    /** The task object to extract dependencies and attachments from */
    task: any;
    /** @deprecated Custom relationship types are now fetched from TRPC directly */
    customTypes?: any[];
}

export function RelatedPanelContent({ taskId, workspaceId, task }: RelatedPanelContentProps) {
    const [pickerOpen, setPickerOpen] = React.useState(false);
    const [taskPickerOpen, setTaskPickerOpen] = React.useState(false);
    const [docPickerOpen, setDocPickerOpen] = React.useState(false);
    const [blocksPickerOpen, setBlocksPickerOpen] = React.useState(false);
    const [blockedByPickerOpen, setBlockedByPickerOpen] = React.useState(false);
    const [customRelationshipAnchor, setCustomRelationshipAnchor] = React.useState<'header' | 'empty' | null>(null);
    const [customRelPickerRelId, setCustomRelPickerRelId] = React.useState<string | null>(null);
    const [customRelPickerOpen, setCustomRelPickerOpen] = React.useState(false);
    const [editCustomRelId, setEditCustomRelId] = React.useState<string | null>(null);
    const [collapsedIds, setCollapsedIds] = React.useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = React.useState('');
    const [showSearch, setShowSearch] = React.useState(false);

    // Header actions
    const [tasksCollapsed, setTasksCollapsed] = React.useState(false);
    const [docsCollapsed, setDocsCollapsed] = React.useState(false);
    const [blocksCollapsed, setBlocksCollapsed] = React.useState(false);
    const [blockedByCollapsed, setBlockedByCollapsed] = React.useState(false);
    const [taskColumns, setTaskColumns] = React.useState<string[]>(['dueDate', 'priority']);

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const openTask = (id: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('task', id);
        router.push(`${pathname}?${params.toString()}`);
    };

    const allDependencies = task?.dependencies ?? [];
    const allAttachments = task?.attachments ?? [];

    // Fetch custom relationship definitions from DB
    const { data: customRelationships } = trpc.taskCustomRelationships.list.useQuery(
        { workspaceId },
        { enabled: !!workspaceId }
    );

    const linkedTasks = React.useMemo(() => allDependencies.filter((d: any) => d.type === 'FINISH_TO_FINISH' && !d.customRelationshipId), [allDependencies]);
    const docLinks = React.useMemo(() => allAttachments.filter((a: any) => a.mimeType === 'doc_link'), [allAttachments]);

    const existingTaskIds = React.useMemo(() => linkedTasks.map((d: any) => d.dependsOnId), [linkedTasks]);
    const existingDocIds = React.useMemo(() => docLinks.map((a: any) => a.url.replace('/documents/', '')), [docLinks]);

    const customRelTasksCount = React.useMemo(() => allDependencies.filter((d: any) => d.customRelationshipId).length, [allDependencies]);
    const blockedByItems = React.useMemo(() => allDependencies.filter((d: any) => d.type === 'FINISH_TO_START' || d.dependencyType === 'FINISH_TO_START'), [allDependencies]);
    const blocksItems = React.useMemo(() => task?.blockedDependencies ?? [], [task]);

    const hasAnyItems = linkedTasks.length > 0 || docLinks.length > 0 || customRelTasksCount > 0 || blockedByItems.length > 0 || blocksItems.length > 0;

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
                type: 'FINISH_TO_FINISH',
            });
        }
    };

    const handleTaskSelect = (selectedTaskId: string) => {
        addDependency.mutate({
            taskId,
            dependsOnId: selectedTaskId,
            type: 'FINISH_TO_FINISH',
        });
    };

    const handleCustomRelTaskSelect = (selectedTaskId: string) => {
        if (!customRelPickerRelId) return;
        addDependency.mutate({
            taskId,
            dependsOnId: selectedTaskId,
            type: 'FINISH_TO_FINISH',
            customRelationshipId: customRelPickerRelId,
        });
        toast.success('Task added');
        setCustomRelPickerOpen(false);
        setCustomRelPickerRelId(null);
    };

    const handleBlocksSelect = (selectedTaskId: string) => {
        // selected task blocks the current task
        addDependency.mutate({ taskId: selectedTaskId, dependsOnId: taskId, type: 'FINISH_TO_START' });
    };

    const handleBlockedBySelect = (selectedTaskId: string) => {
        // current task is blocked by selected task
        addDependency.mutate({ taskId, dependsOnId: selectedTaskId, type: 'FINISH_TO_START' });
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
                        <DropdownMenuContent align="end" className="w-64 p-1.5 rounded-xl shadow-lg border-zinc-200" onCloseAutoFocus={(e) => e.preventDefault()}>
                            <DropdownMenuItem onSelect={() => {
                                setTimeout(() => setPickerOpen(true), 150);
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
                                setTimeout(() => setCustomRelationshipAnchor('header'), 150);
                            }} className="py-2 cursor-pointer rounded-md text-[13px]">
                                <Plus className="h-4 w-4 mr-2.5 text-zinc-500" />
                                New custom relationship
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <NewCustomRelationshipPopover
                        open={customRelationshipAnchor === 'header'}
                        onOpenChange={(v) => setCustomRelationshipAnchor(v ? 'header' : null)}
                        workspaceId={workspaceId}
                        trigger={<div className="absolute top-8 right-0 w-1 h-1 pointer-events-none opacity-0" />}
                        align="end"
                        contextName={task?.list?.space?.name || task?.list?.project?.name || task?.list?.team?.name || task?.list?.name || task?.space?.name || task?.project?.name || undefined}
                        contextKind={task?.list?.space ? 'space' : task?.list?.project ? 'project' : task?.list?.team ? 'team' : task?.list ? 'list' : task?.space ? 'space' : task?.project ? 'project' : undefined}
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
                                    <DropdownMenuContent align="center" className="w-64 p-1.5 rounded-xl shadow-lg border-zinc-200" onCloseAutoFocus={(e) => e.preventDefault()}>
                                        <DropdownMenuItem onSelect={() => {
                                            setTimeout(() => setPickerOpen(true), 150);
                                        }} className="py-2 cursor-pointer rounded-md text-[13px]">
                                            <ArrowLeftRight className="h-4 w-4 mr-2.5 text-zinc-500" />
                                            Relate a Task or Doc
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="my-1.5" />
                                        <DropdownMenuItem onSelect={() => {
                                            // Add blocks...
                                        }} className="py-2 cursor-pointer rounded-md text-[13px]">
                                            <MinusCircle className="h-4 w-4 mr-2.5 text-red-500 fill-red-100" />
                                            This task blocks...
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => {
                                            // Add blocked by...
                                        }} className="py-2 cursor-pointer rounded-md text-[13px]">
                                            <AlertTriangle className="h-4 w-4 mr-2.5 text-amber-500 fill-amber-100" />
                                            This task is blocked by...
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="my-1.5" />
                                        {customRelationships?.map((rel: any) => (
                                            <DropdownMenuItem
                                                key={rel.id}
                                                onSelect={() => {
                                                    setCustomRelPickerRelId(rel.id);
                                                    setCustomRelPickerOpen(true);
                                                }}
                                                className="py-2 cursor-pointer rounded-md text-[13px]"
                                            >
                                                <ArrowLeftRight className="h-4 w-4 mr-2.5 text-zinc-500" />
                                                {rel.name}
                                            </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuItem onSelect={() => {
                                            setTimeout(() => setCustomRelationshipAnchor('empty'), 150);
                                        }} className="py-2 cursor-pointer rounded-md text-[13px]">
                                            <Plus className="h-4 w-4 mr-2.5 text-zinc-500" />
                                            New custom relationship
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <NewCustomRelationshipPopover
                                    open={customRelationshipAnchor === 'empty'}
                                    onOpenChange={(v) => setCustomRelationshipAnchor(v ? 'empty' : null)}
                                    workspaceId={workspaceId}
                                    trigger={<div className="absolute top-0 left-1/2 w-1 h-1 pointer-events-none opacity-0" />}
                                    side="top"
                                    align="center"
                                    contextName={task?.list?.space?.name || task?.list?.project?.name || task?.list?.team?.name || task?.list?.name || task?.space?.name || task?.project?.name || undefined}
                                    contextKind={task?.list?.space ? 'space' : task?.list?.project ? 'project' : task?.list?.team ? 'team' : task?.list ? 'list' : task?.space ? 'space' : task?.project ? 'project' : undefined}
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
                                                                    <tr key={dep.id} className="group hover:bg-zinc-50/80 transition-colors">
                                                                        <td className="py-2.5 max-w-[200px]">
                                                                            <div className="flex items-center gap-2">
                                                                                <CircleDot className="h-4 w-4 text-blue-500 shrink-0" />
                                                                                <span
                                                                                    onClick={() => openTask(dep.dependsOn?.id)}
                                                                                    className="font-medium text-zinc-900 truncate block hover:text-indigo-600 cursor-pointer transition-colors"
                                                                                >
                                                                                    {dep.dependsOn?.title ?? 'Untitled'}
                                                                                </span>
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
                                                                if (searchQuery && !(dep.dependsOn?.name || dep.name || 'Task').toLowerCase().includes(searchQuery.toLowerCase())) return null;
                                                                return (
                                                                    <tr key={dep.id} className="group hover:bg-zinc-50/80 transition-colors">
                                                                        <td className="py-2.5 max-w-[200px]">
                                                                            <div className="flex items-center gap-2">
                                                                                <CircleDot className="h-4 w-4 text-blue-500 shrink-0" />
                                                                                <span
                                                                                    onClick={() => openTask(dep.taskId ?? dep.id)}
                                                                                    className="font-medium text-zinc-900 truncate block hover:text-indigo-600 cursor-pointer transition-colors"
                                                                                >
                                                                                    {dep.dependsOn?.name || dep.name || 'Task'}
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        {taskColumns.map(colId => (
                                                                            <td key={colId} className="py-2.5">
                                                                                {renderTaskCell(dep, colId)}
                                                                            </td>
                                                                        ))}
                                                                        <td className="py-2.5 text-center">
                                                                            <button
                                                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-100 rounded cursor-pointer"
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
                                                                if (searchQuery && !(dep.task?.name || dep.name || 'Task').toLowerCase().includes(searchQuery.toLowerCase())) return null;
                                                                return (
                                                                    <tr key={dep.id} className="group hover:bg-zinc-50/80 transition-colors">
                                                                        <td className="py-2.5 max-w-[200px]">
                                                                            <div className="flex items-center gap-2">
                                                                                <CircleDot className="h-4 w-4 text-blue-500 shrink-0" />
                                                                                <span
                                                                                    onClick={() => openTask(dep.dependsOnId)}
                                                                                    className="font-medium text-zinc-900 truncate block hover:text-indigo-600 cursor-pointer transition-colors"
                                                                                >
                                                                                    {dep.task?.name || dep.name || 'Task'}
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        {taskColumns.map(colId => (
                                                                            <td key={colId} className="py-2.5">
                                                                                {renderTaskCell(dep, colId)}
                                                                            </td>
                                                                        ))}
                                                                        <td className="py-2.5 text-center">
                                                                            <button
                                                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-100 rounded cursor-pointer"
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

                                {/* Custom relationship sections - fetched from TRPC */}
                                {customRelationships?.map((rel: any) => {
                                    const relTasks = allDependencies.filter((d: any) => d.customRelationshipId === rel.id);
                                    if (relTasks.length === 0) return null;
                                    const isCollapsed = collapsedIds[rel.id] ?? false;
                                    return (
                                        <div key={rel.id} className="px-1">
                                            <div className="flex items-center gap-1.5 mb-3 group">
                                                <span className="font-semibold text-zinc-900 text-[14px]">{rel.name}</span>
                                                <span className="text-zinc-400 font-normal text-[14px]">{relTasks.length}</span>
                                                <div className="group/btngroup flex items-center ml-2 rounded-lg border border-transparent hover:border-zinc-300 hover:bg-zinc-100 p-[2px] transition-all opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button className="cursor-pointer h-6 w-7 flex items-center justify-center rounded-md bg-transparent hover:bg-zinc-200/80 data-[state=open]:bg-zinc-200/80 transition-colors text-zinc-700 outline-none">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="start" className="w-48">
                                                            <DropdownMenuItem onClick={() => toggleCollapsed(rel.id)}>
                                                                {isCollapsed ? <UnfoldVertical className="h-4 w-4 mr-2 text-zinc-500" /> : <FoldVertical className="h-4 w-4 mr-2 text-zinc-500" />}
                                                                {isCollapsed ? 'Expand group' : 'Collapse group'}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    <div className="w-[1px] h-3.5 bg-transparent group-hover/btngroup:bg-zinc-200 transition-colors mx-[1px]" />
                                                    <button
                                                        className="cursor-pointer h-6 w-7 flex items-center justify-center rounded-md bg-transparent hover:bg-zinc-200/50 transition-colors text-zinc-500 hover:text-zinc-700 outline-none"
                                                        onClick={() => setEditCustomRelId(rel.id)}
                                                    >
                                                        <Settings2 className="h-3.5 w-3.5" />
                                                    </button>
                                                    <div className="w-[1px] h-3.5 bg-transparent group-hover/btngroup:bg-zinc-200 transition-colors mx-[1px]" />
                                                    <button
                                                        className="cursor-pointer h-6 w-7 flex items-center justify-center rounded-md bg-transparent hover:bg-zinc-200/50 transition-colors text-zinc-500 hover:text-zinc-700 outline-none"
                                                        onClick={() => { setCustomRelPickerRelId(rel.id); setCustomRelPickerOpen(true); }}
                                                    >
                                                        <Plus className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                            {!isCollapsed && (
                                                relTasks.length === 0 ? (
                                                    <div className="py-2 text-[13px] text-zinc-400 italic">No tasks yet.</div>
                                                ) : (
                                                    <>
                                                        <div className="overflow-x-auto custom-scrollbar">
                                                            <table className="w-full text-[13px] min-w-[300px]">
                                                                <tbody className="divide-y divide-zinc-100 border-t border-b border-zinc-100">
                                                                    {relTasks.map((dep: any) => (
                                                                        <tr key={dep.id} className="group/row hover:bg-zinc-50/50">
                                                                            <td className="py-2.5 max-w-[200px]">
                                                                                <div className="flex items-center gap-2">
                                                                                    <CircleDot className="h-4 w-4 text-blue-500 shrink-0" />
                                                                                    <span
                                                                                        onClick={() => openTask(dep.dependsOn?.id)}
                                                                                        className="font-medium text-zinc-900 truncate block hover:text-indigo-600 cursor-pointer transition-colors"
                                                                                    >
                                                                                        {dep.dependsOn?.name || dep.dependsOn?.title || 'Task'}
                                                                                    </span>
                                                                                </div>
                                                                            </td>
                                                                            {taskColumns.map(colId => (
                                                                                <td key={colId} className="py-2.5">{renderTaskCell(dep, colId)}</td>
                                                                            ))}
                                                                            <td className="py-2.5 text-center w-10">
                                                                                <button
                                                                                    onClick={() => removeDependency.mutate({ taskId, dependsOnId: dep.dependsOnId })}
                                                                                    className="opacity-0 group-hover/row:opacity-100 p-1 hover:bg-zinc-100 rounded cursor-pointer"
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
                                                            onClick={() => { setCustomRelPickerRelId(rel.id); setCustomRelPickerOpen(true); }}
                                                            className="mt-2 py-1.5 text-zinc-400 flex items-center gap-1.5 cursor-pointer hover:text-zinc-600 text-[13px] font-medium transition-colors"
                                                        >
                                                            <Plus className="h-4 w-4" /> Add Task
                                                        </button>
                                                    </>
                                                )
                                            )}
                                        </div>
                                    );
                                })}
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
            {/* Blocks/Blocked-by Pickers */}
            <TaskPickerPopover
                open={blocksPickerOpen}
                onOpenChange={setBlocksPickerOpen}
                taskId={taskId}
                workspaceId={workspaceId}
                dependencyType="FINISH_TO_START"
                onSelect={handleBlocksSelect}
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
                onSelect={handleBlockedBySelect}
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
                onSelect={handleCustomRelTaskSelect}
                trigger={<div className="absolute top-1/2 left-1/2 w-1 h-1 pointer-events-none opacity-0" />}
                align="center"
                side="top"
            />
            {/* Edit Custom Relationship Popover */}
            <EditCustomRelationshipPopover
                open={editCustomRelId !== null}
                onOpenChange={(v) => !v && setEditCustomRelId(null)}
                workspaceId={workspaceId}
                initialData={customRelationships?.find((r: any) => r.id === editCustomRelId)}
                trigger={<div className="absolute top-1/2 left-1/2 w-1 h-1 pointer-events-none opacity-0" />}
                align="center"
                side="top"
            />
        </div>
    );
}
