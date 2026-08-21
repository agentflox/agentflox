'use client';

import * as React from 'react';
import {
    Popover,
    PopoverAnchor,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, ArrowLeftRight, Plus, ChevronRight, ChevronDown, Network, Briefcase, Building2, Folder as FolderIconLucide, ListChecks } from 'lucide-react';
import { TaskCreationModal } from './TaskCreationModal';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { RelationshipDependencyType } from './TaskPickerModal';

interface TaskPickerPopoverProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    taskId: string;
    workspaceId: string;
    dependencyType?: RelationshipDependencyType;
    onSelect: (selectedTaskId: string) => void;
    trigger?: React.ReactNode;
    anchorRef?: React.RefObject<HTMLElement>; 
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    existingIds?: string[];
}

export function TaskPickerPopover({
    open,
    onOpenChange,
    taskId,
    workspaceId,
    dependencyType,
    onSelect,
    trigger,
    anchorRef,
    side = 'bottom',
    align = 'start',
    existingIds = []
}: TaskPickerPopoverProps) {
    const [searchInput, setSearchInput] = React.useState('');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedId, setSelectedId] = React.useState<string | null>(null);
    const [createTaskOpen, setCreateTaskOpen] = React.useState(false);
    const [browseMode, setBrowseMode] = React.useState(false);
    const [collapsedNodes, setCollapsedNodes] = React.useState<Set<string>>(new Set());

    const toggleNode = (nodeKey: string) => {
        setCollapsedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeKey)) next.delete(nodeKey);
            else next.add(nodeKey);
            return next;
        });
    };

    React.useEffect(() => {
        const handle = setTimeout(() => {
            setSearchQuery(searchInput.trim());
        }, 300);
        return () => clearTimeout(handle);
    }, [searchInput]);

    const { data: recentData } = trpc.task.list.useQuery(
        { workspaceId, pageSize: 20, scope: 'all', includeRelations: true },
        { enabled: open && !browseMode }
    );
    const { data: searchData } = trpc.task.list.useQuery(
        {
            workspaceId,
            query: searchQuery || undefined,
            pageSize: 20,
            scope: 'all',
            includeRelations: true,
        },
        { enabled: open && !browseMode && searchQuery.length > 0 }
    );

    // Browse mode queries
    const { data: browseTasksData } = trpc.task.list.useQuery(
        { workspaceId, pageSize: 500, scope: 'all', includeRelations: true },
        { enabled: open && browseMode && !!workspaceId }
    );
    const { data: spacesData } = trpc.space.list.useQuery(
        { workspaceId },
        { enabled: open && browseMode && !!workspaceId }
    );
    const { data: projectsData } = trpc.project.list.useQuery(
        { workspaceId },
        { enabled: open && browseMode && !!workspaceId }
    );
    const { data: teamsData } = trpc.team.list.useQuery(
        { workspaceId },
        { enabled: open && browseMode && !!workspaceId }
    );
    const { data: foldersData } = trpc.folder.byContext.useQuery(
        { workspaceId },
        { enabled: open && browseMode && !!workspaceId }
    );
    const { data: listsData } = trpc.list.byContext.useQuery(
        { workspaceId },
        { enabled: open && browseMode && !!workspaceId }
    );

    const hierarchy = React.useMemo(() => {
        const allTasks = (browseTasksData?.items ?? []).filter(
            (t: any) => t.id !== taskId && !existingIds.includes(t.id)
        );
        const spacesList = spacesData?.items || [];
        const projectsList = projectsData?.items || [];
        const teamsList = teamsData?.items || [];
        const foldersList = Array.isArray(foldersData) ? foldersData : [];
        const listsList = listsData?.items || [];

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
            kind: 'list',
            id: l.id,
            name: l.name,
            depth,
            tasks: tasksByListId.get(l.id) ?? [],
        });

        const buildFolderNode = (f: any, depth: number): TreeNode => ({
            kind: 'folder',
            id: f.id,
            name: f.name,
            depth,
            children: listsList.filter((l: any) => l.folderId === f.id).map((l: any) => buildListNode(l, depth + 1)),
        });

        const buildProjectNode = (p: any, depth: number): TreeNode => {
            const pFolders = foldersList.filter((f: any) => f.projectId === p.id);
            const pLists = listsList.filter((l: any) => l.projectId === p.id && !l.folderId);
            return {
                kind: 'project',
                id: p.id,
                name: p.name,
                depth,
                children: [
                    ...pFolders.map((f: any) => buildFolderNode(f, depth + 1)),
                    ...pLists.map((l: any) => buildListNode(l, depth + 1)),
                ],
            };
        };

        const buildTeamNode = (t: any, depth: number): TreeNode => {
            const tProjects = projectsList.filter((p: any) => p.teamId === t.id);
            const tFolders = foldersList.filter((f: any) => f.teamId === t.id && !f.projectId);
            const tLists = listsList.filter((l: any) => l.teamId === t.id && !l.projectId && !l.folderId);
            return {
                kind: 'team',
                id: t.id,
                name: t.name,
                depth,
                children: [
                    ...tProjects.map((p: any) => buildProjectNode(p, depth + 1)),
                    ...tFolders.map((f: any) => buildFolderNode(f, depth + 1)),
                    ...tLists.map((l: any) => buildListNode(l, depth + 1)),
                ],
            };
        };

        const spaceNodes: TreeNode[] = spacesList.map((space: any) => {
            const spaceFolders = foldersList.filter((f: any) => f.spaceId === space.id && !f.projectId && !f.teamId);
            const spaceProjects = projectsList.filter((p: any) => p.spaceId === space.id && !p.teamId);
            const spaceTeams = teamsList.filter((t: any) => t.spaceId === space.id);
            const spaceLists = listsList.filter((l: any) => l.spaceId === space.id && !l.projectId && !l.teamId && !l.folderId);
            return {
                kind: 'space',
                id: space.id,
                name: space.name,
                depth: 0,
                children: [
                    ...spaceFolders.map((f: any) => buildFolderNode(f, 1)),
                    ...spaceProjects.map((p: any) => buildProjectNode(p, 1)),
                    ...spaceTeams.map((t: any) => buildTeamNode(t, 1)),
                    ...spaceLists.map((l: any) => buildListNode(l, 1)),
                ],
            };
        });

        const rootNodes: TreeNode[] = [
            ...projectsList.filter((p: any) => !p.spaceId && !p.teamId).map((p: any) => buildProjectNode(p, 0)),
            ...teamsList.filter((t: any) => !t.spaceId).map((t: any) => buildTeamNode(t, 0)),
            ...foldersList.filter((f: any) => !f.spaceId && !f.projectId && !f.teamId).map((f: any) => buildFolderNode(f, 0)),
            ...listsList.filter((l: any) => !l.spaceId && !l.projectId && !l.teamId && !l.folderId).map((l: any) => buildListNode(l, 0)),
        ];

        return { spaceNodes, rootNodes };
    }, [browseTasksData?.items, spacesData?.items, projectsData?.items, teamsData?.items, foldersData, listsData?.items, taskId, existingIds]);

    const recentTasks = recentData?.items ?? [];
    const searchResults = searchData?.items ?? [];
    const tasks = searchQuery ? searchResults : recentTasks;
    const filteredTasks = tasks.filter((t: any) => t.id !== taskId && !existingIds.includes(t.id));

    const handleSelectTask = (id: string) => {
        setSelectedId(id);
        onSelect(id);
        onOpenChange(false);
        setSearchInput('');
        setSearchQuery('');
        setBrowseMode(false);
    };

    const renderBrowseTask = (t: any) => (
        <button
            key={t.id}
            type="button"
            onClick={() => handleSelectTask(t.id)}
            className="w-full flex items-center gap-2 py-1.5 text-left hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
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
                                ? <ChevronRight className="h-3 w-3 text-zinc-400 shrink-0" />
                                : <ChevronDown className="h-3 w-3 text-zinc-400 shrink-0" />)
                            : <span className="w-3 shrink-0" />
                        }
                        <ListChecks className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <span className="text-[12px] font-medium text-zinc-700 truncate flex-1">{node.name}</span>
                        {hasTasks && (
                            <span className="text-[11px] text-zinc-400 shrink-0 pr-1">{node.tasks.length}</span>
                        )}
                    </button>
                    {hasTasks && !isCollapsed && (
                        <div style={{ paddingLeft: `${indent + 14}px` }}>
                            {node.tasks.map(renderBrowseTask)}
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

    return (
        <>
            <Popover modal={true} open={open} onOpenChange={(isOpen) => {
                onOpenChange(isOpen);
                if (!isOpen) {
                    setBrowseMode(false);
                    setSearchInput('');
                    setSearchQuery('');
                }
            }}>
                {anchorRef ? (
                    <PopoverAnchor virtualRef={anchorRef} />
                ) : trigger ? (
                    <PopoverTrigger asChild>{trigger}</PopoverTrigger>
                ) : null}
                <PopoverContent className="w-[380px] p-0 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg z-[200]" align={align} side={side} sideOffset={4} collisionPadding={16}>
                    <div className="p-2 space-y-2">
                        <div className="flex h-9 items-center rounded-md border border-zinc-200 bg-white px-2 transition-colors focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10">
                            <Search className="h-4 w-4 shrink-0 text-zinc-400 mr-2" />
                            <Input
                                variant="ghost"
                                value={searchInput}
                                onChange={(e) => {
                                    setSearchInput(e.target.value);
                                    if (browseMode) setBrowseMode(false);
                                }}
                                placeholder="Search..."
                                className="h-full w-full bg-transparent p-0 focus:outline-none focus:ring-0 focus-visible:ring-0 text-[13px] shadow-none border-0 placeholder:text-zinc-400"
                                autoFocus
                            />
                        </div>

                        <div className="flex items-center justify-between px-2 pt-1">
                            <span className="text-[11px] font-semibold text-zinc-500">
                                {browseMode ? 'Browse' : searchQuery ? 'Results' : 'Recent Tasks'}
                            </span>
                            <button
                                type="button"
                                onClick={() => setBrowseMode(v => !v)}
                                className="text-[12px] font-medium text-violet-600 cursor-pointer hover:underline"
                            >
                                {browseMode ? '← Back to search' : 'Browse tasks'}
                            </button>
                        </div>

                        <div className="max-h-[280px] overflow-y-auto space-y-0.5 px-1 pb-1">
                            {browseMode ? (
                                hierarchy.spaceNodes.length === 0 && hierarchy.rootNodes.length === 0 ? (
                                    <div className="py-8 text-center text-[13px] text-zinc-400">No tasks found</div>
                                ) : (
                                    <div>
                                        {hierarchy.spaceNodes.map(renderNode)}
                                        {hierarchy.rootNodes.map(renderNode)}
                                    </div>
                                )
                            ) : filteredTasks.length === 0 ? (
                                <div className="py-8 flex flex-col items-center justify-center text-center">
                                    <div className="relative mb-3 flex items-center justify-center w-12 h-12">
                                        <div className="w-10 h-10 rounded-xl border border-zinc-200 flex items-center justify-center bg-white shadow-sm">
                                            <ArrowLeftRight className="h-5 w-5 text-zinc-400" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white bg-zinc-400 flex items-center justify-center">
                                            <Search className="h-3 w-3 text-white" strokeWidth={3} />
                                        </div>
                                    </div>
                                    <div className="text-[13px] text-zinc-500 mb-3">
                                        No results found.
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCreateTaskOpen(true)}
                                        className="h-8 text-xs px-4 gap-1.5 font-medium text-zinc-600 bg-white hover:bg-zinc-100 hover:text-zinc-900 border-zinc-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_2px_6px_rgba(0,0,0,0.06)] hover:-translate-y-[0.5px] active:translate-y-0 active:scale-[0.98] rounded-md group"
                                    >
                                        <Plus className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                                        Create task
                                    </Button>
                                </div>
                            ) : (
                                filteredTasks.map((t: any) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => handleSelectTask(t.id)}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-zinc-50 rounded-md transition-colors cursor-pointer",
                                            selectedId === t.id && "bg-zinc-100"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "h-3.5 w-3.5 rounded-full border-[1.5px] shrink-0 border-dashed",
                                                selectedId === t.id ? "border-indigo-500 bg-indigo-500" : "border-zinc-300"
                                            )}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[13px] font-medium text-zinc-900 truncate leading-tight">
                                                {t.title}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
            {createTaskOpen && (
                <TaskCreationModal
                    context="GENERAL"
                    open={createTaskOpen}
                    onOpenChange={setCreateTaskOpen}
                    workspaceId={workspaceId}
                    onSuccess={(task) => {
                        onSelect(task.id);
                        onOpenChange(false);
                        setCreateTaskOpen(false);
                    }}
                />
            )}
        </>
    );
}
