'use client';
import * as React from 'react';
import { trpc } from '@/lib/trpc';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
    CircleDashed, Plus, Calendar as CalendarIcon, Flag, User as UserIcon, CheckCircle2,
    X, Search, Dot, ChevronRight, ChevronDown, Network, Briefcase, Building2,
    Folder as FolderIconLucide, ListChecks, Hash, Clock, Hourglass, Box, CircleDot, Users, Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';
import { toast } from 'sonner';
import { TaskCreationPopover } from './TaskCreationPopover';
import { ColumnsPopover } from '@/features/dashboard/views/generic/ColumnsPopover';
import { TaskTypeIcon } from '@/entities/task/components/TaskTypeIcon';

const LINKED_TASKS_FIELD_CONFIG = [
    { id: 'status', label: 'Status', icon: CircleDot },
    { id: 'taskId', label: 'Task ID', icon: Hash },
    { id: 'dateCreated', label: 'Date created', icon: CalendarIcon },
    { id: 'dateUpdated', label: 'Date updated', icon: CalendarIcon },
    { id: 'startDate', label: 'Start date', icon: CalendarIcon },
    { id: 'dueDate', label: 'Due date', icon: CalendarIcon },
    { id: 'timeTracked', label: 'Time tracked', icon: Clock },
    { id: 'timeEstimate', label: 'Time estimate', icon: Hourglass },
    { id: 'priority', label: 'Priority', icon: Flag },
    { id: 'assignee', label: 'Assignee', icon: UserIcon },
    { id: 'dateClosed', label: 'Date closed', icon: CalendarIcon },
    { id: 'createdBy', label: 'Created by', icon: UserIcon },
    { id: 'taskType', label: 'Task Type', icon: Box },
];

interface TaskLinkedTasksPopoverProps {
    taskId: string;
    workspaceId: string;
    children: React.ReactNode;
}

export function TaskLinkedTasksPopover({ taskId, workspaceId, children }: TaskLinkedTasksPopoverProps) {
    const [open, setOpen] = React.useState(false);
    const [searchInput, setSearchInput] = React.useState('');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [browseMode, setBrowseMode] = React.useState(false);
    const [collapsedNodes, setCollapsedNodes] = React.useState<Set<string>>(new Set());
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

    React.useEffect(() => {
        const handle = setTimeout(() => {
            setSearchQuery(searchInput.trim());
        }, 300);
        return () => clearTimeout(handle);
    }, [searchInput]);

    // Reset browse mode when popover closes
    React.useEffect(() => {
        if (!open) {
            setBrowseMode(false);
            setSearchInput('');
            setSearchQuery('');
            setCollapsedNodes(new Set());
        }
    }, [open]);

    const { data: task, isLoading } = trpc.task.get.useQuery({ id: taskId }, {
        enabled: open && !!taskId,
    });

    const { data: recentData } = trpc.task.list.useQuery(
        { workspaceId, pageSize: 20, scope: 'all', includeRelations: true },
        { enabled: open }
    );
    const { data: searchData } = trpc.task.list.useQuery(
        {
            workspaceId,
            query: searchQuery || undefined,
            pageSize: 20,
            scope: 'all',
            includeRelations: true,
        },
        { enabled: open && searchQuery.length > 0 }
    );

    // For browse mode: load all tasks + structural data
    const { data: browseData } = trpc.task.list.useQuery(
        { workspaceId, pageSize: 500, scope: 'all', includeRelations: true },
        { enabled: open && browseMode }
    );
    const { data: spacesData } = trpc.space.list.useQuery({ workspaceId }, { enabled: open && browseMode && !!workspaceId });
    const { data: projectsData } = trpc.project.list.useQuery({ workspaceId }, { enabled: open && browseMode && !!workspaceId });
    const { data: teamsData } = trpc.team.list.useQuery({ workspaceId }, { enabled: open && browseMode && !!workspaceId });
    const { data: foldersData } = trpc.folder.byContext.useQuery({ workspaceId }, { enabled: open && browseMode && !!workspaceId });
    const { data: listsData } = trpc.list.byContext.useQuery({ workspaceId }, { enabled: open && browseMode && !!workspaceId });

    const addDependency = trpc.task.addDependency.useMutation({
        onSuccess: () => {
            toast.success("Task linked");
            utils.task.get.invalidate({ id: taskId });
            utils.task.list.invalidate();
        },
        onError: () => {
            toast.error("Failed to link task");
        }
    });

    const removeDependency = trpc.task.removeDependency.useMutation({
        onSuccess: () => {
            toast.success("Link removed");
            utils.task.get.invalidate({ id: taskId });
            utils.task.list.invalidate();
        },
        onError: () => {
            toast.error("Failed to remove link");
        }
    });

    const handleSelectTask = (id: string) => {
        if (!taskId) return;
        addDependency.mutate({ taskId, dependsOnId: id, type: 'FINISH_TO_FINISH' });
    };

    const linkedTasks = ((task as any)?.dependencies || []).filter((d: any) => d.type === 'FINISH_TO_FINISH' && !d.customRelationshipId);
    const existingIds = linkedTasks.map((d: any) => d.dependsOnId);

    const recentTasks = recentData?.items ?? [];
    const searchResults = searchData?.items ?? [];
    const availableTasks = searchQuery ? searchResults : recentTasks;
    const filteredTasks = availableTasks.filter((t: any) => t.id !== taskId && !existingIds.includes(t.id));

    // Build full hierarchy for browse mode: Space → Project/Team/Folder → List → Tasks
    const hierarchy = React.useMemo(() => {
        const allTasks = (browseData?.items ?? []).filter((t: any) => t.id !== taskId && !existingIds.includes(t.id));
        const spaces = spacesData?.items || [];
        const projects = projectsData?.items || [];
        const teams = teamsData?.items || [];
        const folders = foldersData?.items || [];
        const lists = listsData?.items || [];

        // Index tasks by listId
        const tasksByListId = new Map<string, any[]>();
        allTasks.forEach((t: any) => {
            const listId = t.listId ?? t.list?.id;
            if (!listId) return;
            if (!tasksByListId.has(listId)) tasksByListId.set(listId, []);
            tasksByListId.get(listId)!.push(t);
        });

        type TreeNode = {
            kind: 'space' | 'project' | 'team' | 'folder' | 'list';
            id: string;
            name: string;
            depth: number;
            tasks?: any[];
            children?: TreeNode[];
        };

        const buildListNode = (l: any, depth: number): TreeNode => ({
            kind: 'list', id: l.id, name: l.name, depth,
            tasks: tasksByListId.get(l.id) ?? [],
        });

        const buildFolderNode = (f: any, depth: number): TreeNode => ({
            kind: 'folder', id: f.id, name: f.name, depth,
            children: lists.filter((l: any) => l.folderId === f.id).map((l: any) => buildListNode(l, depth + 1)),
        });

        const buildProjectNode = (p: any, depth: number): TreeNode => {
            const pFolders = folders.filter((f: any) => f.projectId === p.id);
            const pLists = lists.filter((l: any) => l.projectId === p.id && !l.folderId);
            return {
                kind: 'project', id: p.id, name: p.name, depth,
                children: [
                    ...pFolders.map((f: any) => buildFolderNode(f, depth + 1)),
                    ...pLists.map((l: any) => buildListNode(l, depth + 1)),
                ],
            };
        };

        const buildTeamNode = (t: any, depth: number): TreeNode => {
            const tProjects = projects.filter((p: any) => p.teamId === t.id);
            const tFolders = folders.filter((f: any) => f.teamId === t.id && !f.projectId);
            const tLists = lists.filter((l: any) => l.teamId === t.id && !l.projectId && !l.folderId);
            return {
                kind: 'team', id: t.id, name: t.name, depth,
                children: [
                    ...tProjects.map((p: any) => buildProjectNode(p, depth + 1)),
                    ...tFolders.map((f: any) => buildFolderNode(f, depth + 1)),
                    ...tLists.map((l: any) => buildListNode(l, depth + 1)),
                ],
            };
        };

        // Space nodes
        const spaceNodes: TreeNode[] = spaces.map((space: any) => {
            const spaceFolders = folders.filter((f: any) => f.spaceId === space.id && !f.projectId && !f.teamId);
            const spaceProjects = projects.filter((p: any) => p.spaceId === space.id && !p.teamId);
            const spaceTeams = teams.filter((t: any) => t.spaceId === space.id);
            const spaceLists = lists.filter((l: any) => l.spaceId === space.id && !l.projectId && !l.teamId && !l.folderId);
            return {
                kind: 'space' as const, id: space.id, name: space.name, depth: 0,
                children: [
                    ...spaceFolders.map((f: any) => buildFolderNode(f, 1)),
                    ...spaceProjects.map((p: any) => buildProjectNode(p, 1)),
                    ...spaceTeams.map((t: any) => buildTeamNode(t, 1)),
                    ...spaceLists.map((l: any) => buildListNode(l, 1)),
                ],
            };
        });

        // Root-level (no space)
        const rootNodes: TreeNode[] = [
            ...projects.filter((p: any) => !p.spaceId && !p.teamId).map((p: any) => buildProjectNode(p, 0)),
            ...teams.filter((t: any) => !t.spaceId).map((t: any) => buildTeamNode(t, 0)),
            ...folders.filter((f: any) => !f.spaceId && !f.projectId && !f.teamId).map((f: any) => buildFolderNode(f, 0)),
            ...lists.filter((l: any) => !l.spaceId && !l.projectId && !l.teamId && !l.folderId).map((l: any) => buildListNode(l, 0)),
        ];

        return { spaceNodes, rootNodes };
    }, [browseData?.items, spacesData, projectsData, teamsData, foldersData, listsData, taskId, existingIds]);

    const toggleNode = (nodeKey: string) => {
        setCollapsedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeKey)) next.delete(nodeKey);
            else next.add(nodeKey);
            return next;
        });
    };

    const renderDate = (dateStr: string | null | undefined, overdueCheck: boolean = false) => {
        if (!dateStr) return <span className="text-zinc-400">—</span>;
        const date = new Date(dateStr);
        const isOverdue = overdueCheck && isPast(date) && !isToday(date);
        return (
            <span className={cn("text-xs", isOverdue ? "text-red-500" : "text-zinc-600")}>
                {format(date, "M/d/yy")}
            </span>
        );
    };

    const renderPriority = (priorityStr: string | null | undefined) => {
        if (!priorityStr) return <span className="text-zinc-400">—</span>;
        return (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm border border-zinc-200 bg-white">
                <div className={cn("flex items-center gap-1.5", priorityStr === 'URGENT' ? "text-red-500" : priorityStr === 'HIGH' ? "text-orange-500" : priorityStr === 'NORMAL' ? "text-blue-500" : "text-zinc-400")}>
                    <Flag className="h-3 w-3 fill-current" />
                </div>
                <span className="text-xs font-medium text-zinc-700">
                    {priorityStr.charAt(0) + priorityStr.slice(1).toLowerCase()}
                </span>
            </div>
        );
    };

    const renderUser = (user: any) => {
        if (!user) return (
            <div className="h-6 w-6 rounded-full border border-dashed border-zinc-300 flex items-center justify-center">
                <Users className="h-3 w-3 text-zinc-400" />
            </div>
        );
        return (
            <Avatar className="h-6 w-6 border-2 border-white ring-1 ring-zinc-100">
                <AvatarImage src={user.image || user.avatar} />
                <AvatarFallback className="text-[9px] bg-indigo-50 text-indigo-600">
                    {(user.name || "U").substring(0, 2).toUpperCase()}
                </AvatarFallback>
            </Avatar>
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
                    return (
                        <Avatar key={u?.id || i} className="h-6 w-6 border-2 border-white ring-1 ring-zinc-100">
                            <AvatarImage src={u?.image || u?.avatar} />
                            <AvatarFallback className="text-[9px] bg-indigo-50 text-indigo-600">
                                {u?.name?.substring(0, 2).toUpperCase() || "??"}
                            </AvatarFallback>
                        </Avatar>
                    );
                })}
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

    const renderStatus = (status: any) => {
        if (!status) return <span className="text-zinc-400">—</span>;
        return (
            <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[11px] font-medium truncate" style={{ backgroundColor: `${status.color}15`, color: status.color }}>
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: status.color }} />
                <span className="truncate">{status.name}</span>
            </div>
        );
    };

    const renderTaskType = (type: any, typeId?: string) => {
        const resolvedType = type || typeId || 'TASK';
        const name = typeof resolvedType === 'string'
            ? (resolvedType.charAt(0) + resolvedType.slice(1).toLowerCase().replace('_', ' '))
            : (resolvedType.name || 'Task');

        return (
            <div className="flex items-center gap-1.5 truncate">
                <TaskTypeIcon type={resolvedType} className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                <span className="text-xs text-zinc-600 truncate">{name}</span>
            </div>
        );
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent className="w-[550px] p-0 rounded-xl shadow-xl z-[150]" align="start" sideOffset={8}>
                <div className="flex flex-col relative">
                    {/* Table Container */}
                    <div className="overflow-auto max-h-[250px]">
                        <div style={{ minWidth: 'max-content' }}>
                            {/* Header */}
                            <div className="flex items-center py-2 border-b border-zinc-100 bg-white sticky top-0 z-20">
                                {/* Sticky name column */}
                                <div className="sticky left-0 z-30 bg-white flex-1 text-xs font-semibold text-zinc-800 min-w-[200px] px-4 pr-4">Tasks</div>
                                {visibleColumns.has('status') && <div className="w-28 text-xs font-medium text-zinc-500 text-left shrink-0">Status</div>}
                                {visibleColumns.has('taskId') && <div className="w-20 text-xs font-medium text-zinc-500 text-left shrink-0">Task ID</div>}
                                {visibleColumns.has('dateCreated') && <div className="w-24 text-xs font-medium text-zinc-500 text-left shrink-0">Date created</div>}
                                {visibleColumns.has('dateUpdated') && <div className="w-24 text-xs font-medium text-zinc-500 text-left shrink-0">Date updated</div>}
                                {visibleColumns.has('startDate') && <div className="w-24 text-xs font-medium text-zinc-500 text-left shrink-0">Start date</div>}
                                {visibleColumns.has('dueDate') && <div className="w-24 text-xs font-medium text-zinc-500 text-left shrink-0">Due date</div>}
                                {visibleColumns.has('timeTracked') && <div className="w-24 text-xs font-medium text-zinc-500 text-left shrink-0">Time tracked</div>}
                                {visibleColumns.has('timeEstimate') && <div className="w-24 text-xs font-medium text-zinc-500 text-left shrink-0">Time estimate</div>}
                                {visibleColumns.has('priority') && <div className="w-24 text-xs font-medium text-zinc-500 text-left shrink-0 pr-4">Priority</div>}
                                {visibleColumns.has('assignee') && <div className="w-20 text-xs font-medium text-zinc-500 text-left shrink-0">Assignee</div>}
                                {visibleColumns.has('dateClosed') && <div className="w-24 text-xs font-medium text-zinc-500 text-left shrink-0">Date closed</div>}
                                {visibleColumns.has('createdBy') && <div className="w-20 text-xs font-medium text-zinc-500 text-left shrink-0">Created by</div>}
                                {visibleColumns.has('taskType') && <div className="w-24 text-xs font-medium text-zinc-500 text-left shrink-0">Task Type</div>}
                                {/* Sticky + button column */}
                                <div className="sticky right-0 z-30 bg-white w-8 flex justify-center pl-2">
                                    <ColumnsPopover fieldConfig={LINKED_TASKS_FIELD_CONFIG} visibleColumns={visibleColumns} toggleColumn={toggleColumn}>
                                        <button className="h-6 w-6 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded transition-colors cursor-pointer">
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    </ColumnsPopover>
                                </div>
                            </div>

                            {/* Linked Tasks Content */}
                            <div className="flex flex-col">
                                {isLoading ? (
                                    <div className="p-4 text-xs text-zinc-500 text-center">Loading linked tasks...</div>
                                ) : linkedTasks.length === 0 ? (
                                    <div className="p-4 text-xs text-zinc-500 text-center">No linked tasks.</div>
                                ) : (
                                    <>
                                        {linkedTasks.map((dep: any) => {
                                            const depTask = dep.dependsOn;
                                            return (
                                                <div key={dep.id} className="flex items-center py-2 border-b border-zinc-50 hover:bg-zinc-50 group">
                                                    {/* Sticky name column */}
                                                    <div className="sticky left-0 z-10 bg-white group-hover:bg-zinc-50 flex-1 flex items-center gap-2 min-w-[200px] px-4 pr-4">
                                                        {(() => {
                                                            const statusColor = depTask.status?.color || '#94a3b8';
                                                            const isDone = depTask.status?.name === 'Done' || depTask.status?.name === 'Complete' || depTask.status?.name === 'Closed';
                                                            if (depTask.taskType) {
                                                                return <TaskTypeIcon type={depTask.taskType} className="h-4 w-4 shrink-0" color={statusColor} />;
                                                            }
                                                            if (isDone) {
                                                                return <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: statusColor }} />;
                                                            }
                                                            return <CircleDashed className="h-4 w-4 shrink-0" style={{ color: statusColor }} />;
                                                        })()}
                                                        <span className="text-sm text-zinc-900 truncate font-medium ml-1">{depTask.title || depTask.name}</span>
                                                    </div>
                                                    {visibleColumns.has('status') && (
                                                        <div className="w-28 flex items-center shrink-0 pr-4">
                                                            {renderStatus(depTask.status)}
                                                        </div>
                                                    )}
                                                    {visibleColumns.has('taskId') && (
                                                        <div className="w-20 flex items-center shrink-0">
                                                            <div className="flex items-center gap-1 min-w-0 group/taskid">
                                                                <span className="text-xs text-zinc-500 font-mono truncate max-w-[50px] shrink-0">
                                                                    #{depTask.shortId || depTask.id.slice(0, 7)}
                                                                </span>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(depTask.shortId || depTask.id); toast.success('Task ID copied'); }}
                                                                    className="opacity-0 group-hover/taskid:opacity-100 transition-opacity flex items-center justify-center h-5 w-5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 shrink-0 cursor-pointer"
                                                                    title="Copy Task ID"
                                                                >
                                                                    <Copy className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {visibleColumns.has('dateCreated') && (
                                                        <div className="w-24 flex items-center shrink-0">
                                                            {renderDate(depTask.createdAt)}
                                                        </div>
                                                    )}
                                                    {visibleColumns.has('dateUpdated') && (
                                                        <div className="w-24 flex items-center shrink-0">
                                                            {renderDate(depTask.updatedAt)}
                                                        </div>
                                                    )}
                                                    {visibleColumns.has('startDate') && (
                                                        <div className="w-24 flex items-center shrink-0">
                                                            {renderDate(depTask.startDate)}
                                                        </div>
                                                    )}
                                                    {visibleColumns.has('dueDate') && (
                                                        <div className="w-24 flex items-center shrink-0">
                                                            {renderDate(depTask.dueDate, true)}
                                                        </div>
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
                                                        <div className="w-24 flex items-center shrink-0 pr-4">
                                                            {renderPriority(depTask.priority)}
                                                        </div>
                                                    )}
                                                    {visibleColumns.has('assignee') && (
                                                        <div className="w-20 flex items-center shrink-0">
                                                            {renderAssignee(depTask.assignees)}
                                                        </div>
                                                    )}
                                                    {visibleColumns.has('dateClosed') && (
                                                        <div className="w-24 flex items-center shrink-0">
                                                            {renderDate(depTask.dateClosed || depTask.dateDone)}
                                                        </div>
                                                    )}
                                                    {visibleColumns.has('createdBy') && (
                                                        <div className="w-20 flex items-center shrink-0">
                                                            {renderUser(depTask.creator || (typeof depTask.createdBy === 'object' ? depTask.createdBy : null))}
                                                        </div>
                                                    )}
                                                    {visibleColumns.has('taskType') && (
                                                        <div className="w-24 flex items-center shrink-0 pr-4">
                                                            {renderTaskType(depTask.taskType, depTask.taskTypeId)}
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
                                        })}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Search & Select Footer */}
                    <div className="border-t border-zinc-100 p-2 space-y-2 pb-3 bg-white rounded-b-xl">
                        <div className="flex h-10 items-center justify-between px-3">
                            <div className="flex flex-1 items-center gap-2" onClick={() => { if (browseMode) setBrowseMode(false); }}>
                                <Search className="h-4 w-4 shrink-0 text-zinc-400" />
                                <Input
                                    variant="ghost"
                                    value={searchInput}
                                    onChange={(e) => { setSearchInput(e.target.value); if (browseMode) setBrowseMode(false); }}
                                    onFocus={() => { if (browseMode) setBrowseMode(false); }}
                                    placeholder="Search for task (or subtask) name, ID, or URL"
                                    className="h-full w-full bg-transparent p-0 focus:outline-none focus:ring-0 focus-visible:ring-0 text-[13px] shadow-none border-0 placeholder:text-zinc-400"
                                />
                            </div>
                            <TaskCreationPopover
                                context="GENERAL"
                                workspaceId={workspaceId}
                                onSuccess={(newTask) => {
                                    handleSelectTask(newTask.id);
                                }}
                                trigger={
                                    <button className="text-xs font-medium text-zinc-600 hover:text-zinc-900 shrink-0 ml-4 px-2 py-1 hover:bg-zinc-100 rounded cursor-pointer">
                                        Create new
                                    </button>
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between px-3 pt-2">
                            <span className="text-[12px] font-medium text-zinc-500">
                                {browseMode ? 'Browse' : searchQuery ? 'Results' : 'Recent/Search'}
                            </span>
                            <button
                                type="button"
                                onClick={() => setBrowseMode(v => !v)}
                                className="text-[12px] font-medium text-violet-600 cursor-pointer hover:underline"
                            >
                                {browseMode ? '← Back to search' : 'Browse tasks'}
                            </button>
                        </div>

                        <div className="max-h-[250px] overflow-y-auto space-y-0.5 px-2">
                            {browseMode ? (
                                /* Full hierarchy tree view */
                                (() => {
                                    const renderTask = (t: any) => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => { handleSelectTask(t.id); setBrowseMode(false); }}
                                            className="w-full flex items-center gap-2 py-1.5 text-left hover:bg-zinc-100 rounded-lg transition-colors group/item cursor-pointer"
                                            style={{ paddingLeft: '12px', paddingRight: '8px' }}
                                        >
                                            <div
                                                className="w-3.5 h-3.5 rounded-full border-2 shrink-0"
                                                style={{ borderColor: t.status?.color || '#d1d5db' }}
                                            />
                                            <span className="text-[13px] text-zinc-700 truncate flex-1">{t.title || t.name}</span>
                                            {t.shortId && (
                                                <span className="text-[11px] text-zinc-400 shrink-0 pr-1">#{t.shortId}</span>
                                            )}
                                        </button>
                                    );

                                    const renderNode = (node: any): React.ReactNode => {
                                        const nodeKey = `${node.kind}-${node.id}`;
                                        const isCollapsed = collapsedNodes.has(nodeKey);
                                        const indent = node.depth * 14 + 8;

                                        if (node.kind === 'list') {
                                            const hasTasks = node.tasks && node.tasks.length > 0;
                                            return (
                                                <div key={nodeKey}>
                                                    <button
                                                        type="button"
                                                        onClick={() => hasTasks && toggleNode(nodeKey)}
                                                        className={cn(
                                                            "w-full flex items-center gap-1.5 py-1.5 text-left rounded transition-colors",
                                                            hasTasks ? "hover:bg-zinc-50 cursor-pointer" : "cursor-default opacity-60"
                                                        )}
                                                        style={{ paddingLeft: `${indent}px`, paddingRight: '8px' }}
                                                    >
                                                        {hasTasks
                                                            ? (isCollapsed
                                                                ? <ChevronRight className="h-3 w-3 text-zinc-300 shrink-0" />
                                                                : <ChevronDown className="h-3 w-3 text-zinc-300 shrink-0" />)
                                                            : <span className="w-3 shrink-0" />
                                                        }
                                                        <ListChecks className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                                        <span className="text-[12px] font-medium text-zinc-700 truncate flex-1">{node.name}</span>
                                                        {hasTasks && (
                                                            <span className="text-[11px] text-zinc-400 shrink-0 pr-1">{node.tasks.length}</span>
                                                        )}
                                                    </button>
                                                    {hasTasks && !isCollapsed && (
                                                        <div style={{ paddingLeft: `${indent + 20}px` }}>
                                                            {node.tasks.map(renderTask)}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }

                                        const hasChildren = node.children && node.children.length > 0;
                                        const Icon = node.kind === 'space' ? Network
                                            : node.kind === 'project' ? Briefcase
                                                : node.kind === 'team' ? Building2
                                                    : FolderIconLucide;
                                        const iconColor = node.kind === 'space' ? 'text-indigo-500'
                                            : node.kind === 'project' ? 'text-indigo-400'
                                                : node.kind === 'team' ? 'text-blue-400'
                                                    : 'text-zinc-400';
                                        const labelClass = node.kind === 'space'
                                            ? 'text-[11px] font-semibold text-zinc-500 uppercase tracking-wider'
                                            : 'text-[12px] font-medium text-zinc-700';

                                        return (
                                            <div key={nodeKey}>
                                                <button
                                                    type="button"
                                                    onClick={() => hasChildren && toggleNode(nodeKey)}
                                                    className={cn(
                                                        "w-full flex items-center gap-1.5 py-1.5 text-left rounded transition-colors",
                                                        hasChildren ? "hover:bg-zinc-50 cursor-pointer" : "cursor-default"
                                                    )}
                                                    style={{ paddingLeft: `${indent}px`, paddingRight: '8px' }}
                                                >
                                                    {hasChildren
                                                        ? (isCollapsed
                                                            ? <ChevronRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                                            : <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />)
                                                        : <span className="w-3.5 shrink-0" />
                                                    }
                                                    <Icon className={cn("h-3.5 w-3.5 shrink-0", iconColor)} />
                                                    <span className={cn("truncate", labelClass)}>{node.name}</span>
                                                </button>
                                                {hasChildren && !isCollapsed && (
                                                    <div>{node.children.map(renderNode)}</div>
                                                )}
                                            </div>
                                        );
                                    };

                                    const allEmpty = hierarchy.spaceNodes.length === 0 && hierarchy.rootNodes.length === 0;
                                    return (
                                        <div>
                                            {allEmpty
                                                ? <div className="py-6 text-center text-[13px] text-zinc-400">No tasks found</div>
                                                : <>
                                                    {hierarchy.spaceNodes.map(renderNode)}
                                                    {hierarchy.rootNodes.map(renderNode)}
                                                </>
                                            }
                                        </div>
                                    );
                                })()
                            ) : (
                                /* Search / Recent flat list */
                                filteredTasks.length === 0 ? (
                                    <div className="py-4 flex items-center justify-center text-center text-[13px] text-zinc-500">
                                        No results found.
                                    </div>
                                ) : (
                                    filteredTasks.map((t: any) => {
                                        const isDone = t.status?.type === 'DONE' || t.status?.name?.toLowerCase() === 'done' || t.status?.name?.toLowerCase() === 'closed' || t.status?.name?.toLowerCase() === 'complete' || t.status?.name?.toLowerCase() === 'completed';
                                        const statusColor = t.status?.color;
                                        return (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => { handleSelectTask(t.id); setSearchInput(''); setSearchQuery(''); }}
                                                className="w-full flex items-center gap-3 px-2 py-1.5 text-left hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                                            >
                                                {/* Status circle */}
                                                {isDone ? (
                                                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                                                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                                                            <path d="M8.33333 2.5L3.75 7.08333L1.66667 5" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    </div>
                                                ) : statusColor ? (
                                                    <div
                                                        className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center border-2"
                                                        style={{ borderColor: statusColor, backgroundColor: `${statusColor}22` }}
                                                    >
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                                                    </div>
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full border-2 border-zinc-300 shrink-0 flex items-center justify-center">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                                                    </div>
                                                )}
                                                <span className="text-[13px] text-zinc-800 truncate flex-1">{t.title || t.name}</span>
                                                {t.shortId && (
                                                    <span className="text-[11px] text-zinc-400 shrink-0">#{t.shortId}</span>
                                                )}
                                            </button>
                                        );
                                    })
                                )
                            )}
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
