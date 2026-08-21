'use client';

import * as React from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, FileText, Check, ArrowLeftRight, Plus, ChevronRight, ChevronDown, Network, Briefcase, Building2, Folder as FolderIconLucide, ListChecks } from 'lucide-react';
import { TaskCreationModal } from './TaskCreationModal';
import { DocumentCreationModal } from '@/entities/documents/components/DocumentCreationModal';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RelationshipDependencyType } from './TaskPickerModal';

interface TaskDocPickerPopoverProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    taskId: string;
    workspaceId: string;
    dependencyType?: RelationshipDependencyType;
    onSelect: (selected: { type: "TASK" | "DOCUMENT", id: string }) => void;
    trigger?: React.ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    existingTaskIds?: string[];
    existingDocIds?: string[];
}

export function TaskDocPickerPopover({
    open,
    onOpenChange,
    taskId,
    workspaceId,
    dependencyType,
    onSelect,
    trigger,
    side = 'bottom',
    align = 'start',
    existingTaskIds = [],
    existingDocIds = []
}: TaskDocPickerPopoverProps) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedItem, setSelectedItem] = React.useState<{ type: "TASK" | "DOCUMENT", id: string } | null>(null);
    const [createTaskOpen, setCreateTaskOpen] = React.useState(false);
    const [createDocOpen, setCreateDocOpen] = React.useState(false);
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

    const { data: tasksData } = trpc.task.list.useQuery(
        { workspaceId, scope: 'all', includeRelations: true, pageSize: 20 },
        { enabled: open && !browseMode }
    );
    const { data: docsData } = trpc.document.list.useQuery(
        { workspaceId, pageSize: 20 },
        { enabled: open }
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
            (t: any) => t.id !== taskId && !existingTaskIds.includes(t.id)
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
    }, [browseTasksData?.items, spacesData?.items, projectsData?.items, teamsData?.items, foldersData, listsData?.items, taskId, existingTaskIds]);

    const tasks = tasksData?.items || [];
    const documents = docsData?.items || [];

    const filteredTasks = tasks.filter((t: any) =>
        t.id !== taskId && !existingTaskIds.includes(t.id) && (!searchQuery || t.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    const filteredDocs = documents.filter((d: any) =>
        !existingDocIds.includes(d.id) && (!searchQuery || d.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleConfirm = (item: { type: "TASK" | "DOCUMENT", id: string }) => {
        onSelect(item);
        onOpenChange(false);
        setSelectedItem(null);
        setSearchQuery('');
        setBrowseMode(false);
    };

    const renderBrowseTask = (t: any) => (
        <button
            key={t.id}
            type="button"
            onClick={() => handleConfirm({ type: "TASK", id: t.id })}
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
                    setSearchQuery('');
                }
            }}>
            {trigger && <PopoverTrigger asChild>{trigger}</PopoverTrigger>}
            <PopoverContent className="w-[420px] p-0 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg" align={align} side={side} sideOffset={4} collisionPadding={16}>
                <div className="p-0">
                    <div className="p-3 pb-1 relative">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-md border border-zinc-200 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
                            <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                            <input
                                className="w-full bg-transparent border-none outline-none text-[13px] placeholder:text-zinc-400"
                                placeholder="Search tasks or docs..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (browseMode) setBrowseMode(false);
                                }}
                                autoFocus
                            />
                        </div>
                    </div>

                    <Tabs defaultValue="tasks" className="w-full">
                        <div className="px-3 pt-2 pb-2 border-b border-zinc-100">
                            <TabsList className="h-8 w-full grid grid-cols-2 bg-zinc-100/80 p-0.5 rounded-md">
                                <TabsTrigger value="tasks" className="text-xs font-medium cursor-pointer rounded-sm data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-500 transition-all focus-visible:ring-0 focus-visible:outline-none h-full">
                                    Tasks
                                </TabsTrigger>
                                <TabsTrigger value="docs" className="text-xs font-medium cursor-pointer rounded-sm data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-500 transition-all focus-visible:ring-0 focus-visible:outline-none h-full">
                                    Docs
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="tasks" className="m-0 p-0 outline-none">
                            <div className="flex items-center justify-between px-3 pt-2 pb-1 text-xs">
                                <span className="text-[11px] font-semibold text-zinc-500">
                                    {browseMode ? 'Browse' : searchQuery ? "Search Results" : "Recent Tasks"}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setBrowseMode(v => !v)}
                                    className="text-[12px] font-medium text-violet-600 cursor-pointer hover:underline"
                                >
                                    {browseMode ? '← Back to search' : 'Browse tasks'}
                                </button>
                            </div>
                            <ScrollArea className="h-[280px]">
                                <div className="p-2 pt-0">
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
                                        filteredTasks.map((t: any) => {
                                            const statusName = t.status?.name?.toLowerCase() || "";
                                            let statusIcon = (
                                                <div className="w-4 h-4 rounded-full border-2 border-zinc-400 border-dashed flex items-center justify-center shrink-0"></div>
                                            );
                                            if (statusName === "done" || statusName === "completed") {
                                                statusIcon = (
                                                    <div className="w-4 h-4 rounded-full bg-[#10b981] relative shrink-0">
                                                        <Check className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 text-white" strokeWidth={4} />
                                                    </div>
                                                );
                                            } else if (statusName === "in progress" || statusName === "doing") {
                                                statusIcon = (
                                                    <div className="w-4 h-4 rounded-full bg-[#3b82f6] relative shrink-0">
                                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white"></div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div
                                                    key={t.id}
                                                    className="flex items-center gap-3 px-3 py-2 text-left hover:bg-zinc-50 rounded-lg transition-colors cursor-pointer group"
                                                    onClick={() => handleConfirm({ type: "TASK", id: t.id })}
                                                >
                                                    {statusIcon}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[13px] font-medium text-zinc-900 truncate">
                                                            {t.title}
                                                        </div>
                                                        {t.status && (
                                                            <div className="text-[11px] text-zinc-500 truncate">
                                                                {t.status.name}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="docs" className="m-0 p-0 outline-none">
                            <ScrollArea className="h-[280px]">
                                <div className="p-2">
                                    <div className="text-[11px] font-semibold text-zinc-500 px-2 py-1 mb-1">
                                        {searchQuery ? "Search Results" : "Recent Docs"}
                                    </div>
                                    {filteredDocs.length === 0 ? (
                                        <div className="py-8 flex flex-col items-center justify-center text-center">
                                            <div className="relative mb-3 flex items-center justify-center w-12 h-12">
                                                <div className="w-10 h-10 rounded-xl border border-zinc-200 flex items-center justify-center bg-white shadow-sm">
                                                    <FileText className="h-5 w-5 text-zinc-400" />
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
                                                onClick={() => setCreateDocOpen(true)}
                                                className="h-8 text-xs px-4 gap-1.5 font-medium text-zinc-600 bg-white hover:bg-zinc-100 hover:text-zinc-900 border-zinc-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_2px_6px_rgba(0,0,0,0.06)] hover:-translate-y-[0.5px] active:translate-y-0 active:scale-[0.98] rounded-md group"
                                            >
                                                <Plus className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                                                Create doc
                                            </Button>
                                        </div>
                                    ) : (
                                        filteredDocs.map((doc: any) => {
                                            return (
                                                <div
                                                    key={doc.id}
                                                    className="flex items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-50 rounded-lg transition-colors cursor-pointer group"
                                                    onClick={() => handleConfirm({ type: "DOCUMENT", id: doc.id })}
                                                >
                                                    <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                                                    <span className="text-[13px] font-medium text-zinc-900 truncate flex-1">{doc.title}</span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
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
                        onSelect({ type: "TASK", id: task.id });
                        onOpenChange(false);
                        setCreateTaskOpen(false);
                    }}
                />
            )}
            {createDocOpen && (
                <DocumentCreationModal
                    open={createDocOpen}
                    onOpenChange={setCreateDocOpen}
                    workspaceId={workspaceId}
                    onSuccess={(docId) => {
                        onSelect({ type: "DOCUMENT", id: docId });
                        onOpenChange(false);
                        setCreateDocOpen(false);
                    }}
                />
            )}
        </>
    );
}
