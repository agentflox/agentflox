'use client';

import * as React from 'react';
import { trpc } from '@/lib/trpc';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
    Search,
    User,
    Check,
    Network,
    Briefcase,
    Building2,
    Folder as FolderIconLucide,
    ListChecks,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SharedList {
    id: string;
    name: string;
}

interface TaskListPopoverProps {
    taskId: string;
    workspaceId: string;
    currentListId?: string;
    sharedLists?: SharedList[];
    children: React.ReactNode;
}

export function TaskListPopover({ taskId, workspaceId, currentListId, sharedLists = [], children }: TaskListPopoverProps) {
    const [open, setOpen] = React.useState(false);
    const [listSearch, setListSearch] = React.useState('');
    const utils = trpc.useUtils();

    const { data: spacesData } = trpc.space.list.useQuery({ workspaceId }, { enabled: open && !!workspaceId });
    const { data: projectsData } = trpc.project.list.useQuery({ workspaceId }, { enabled: open && !!workspaceId });
    const { data: teamsData } = trpc.team.list.useQuery({ workspaceId }, { enabled: open && !!workspaceId });
    const { data: foldersData } = trpc.folder.byContext.useQuery({ workspaceId }, { enabled: open && !!workspaceId });
    const { data: listsData } = trpc.list.byContext.useQuery({ workspaceId }, { enabled: open && !!workspaceId });
    const { data: personalList } = trpc.list.getPersonal.useQuery(undefined, { enabled: open });

    const spaces = spacesData?.items || [];
    const projects = projectsData?.items || [];
    const teams = teamsData?.items || [];
    const folders = foldersData?.items || [];
    const lists = listsData?.items || [];

    // All selected list IDs: primary + shared
    const selectedListIds = React.useMemo(() => {
        const ids = new Set<string>();
        if (currentListId) ids.add(currentListId);
        sharedLists.forEach(l => ids.add(l.id));
        return ids;
    }, [currentListId, sharedLists]);

    const treeNodes = React.useMemo(() => {
        const spaceNodes = spaces.map((space: any) => {
            const spaceId = space.id;
            const spaceFolders = folders.filter((f: any) => f.spaceId === spaceId && !f.projectId && !f.teamId);
            const spaceProjects = projects.filter((p: any) => p.spaceId === spaceId);
            const spaceTeams = teams.filter((t: any) => t.spaceId === spaceId);
            const spaceLists = lists.filter((l: any) => l.spaceId === spaceId && !l.projectId && !l.teamId && !l.folderId);

            const children: any[] = [];

            spaceFolders.forEach((f: any) => {
                children.push({ kind: 'folder', id: f.id, name: f.name, depth: 1 });
                lists.filter((l: any) => l.folderId === f.id).forEach((l: any) => {
                    children.push({ kind: 'list', id: l.id, name: l.name, depth: 2, count: l._count?.tasks || 0 });
                });
            });

            spaceProjects.forEach((p: any) => {
                children.push({ kind: 'project', id: p.id, name: p.name, depth: 1 });
                const projectFolders = folders.filter((f: any) => f.projectId === p.id);
                projectFolders.forEach((f: any) => {
                    children.push({ kind: 'folder', id: f.id, name: f.name, depth: 2 });
                    lists.filter((l: any) => l.folderId === f.id).forEach((l: any) => {
                        children.push({ kind: 'list', id: l.id, name: l.name, depth: 3, count: l._count?.tasks || 0 });
                    });
                });
                lists.filter((l: any) => l.projectId === p.id && !l.folderId).forEach((l: any) => {
                    children.push({ kind: 'list', id: l.id, name: l.name, depth: 2, count: l._count?.tasks || 0 });
                });
            });

            spaceTeams.forEach((t: any) => {
                children.push({ kind: 'team', id: t.id, name: t.name, depth: 1 });
                const teamProjects = projects.filter((p: any) => p.teamId === t.id);
                teamProjects.forEach((p: any) => {
                    children.push({ kind: 'project', id: p.id, name: p.name, depth: 2 });
                    lists.filter((l: any) => l.projectId === p.id && !l.folderId).forEach((l: any) => {
                        children.push({ kind: 'list', id: l.id, name: l.name, depth: 3, count: l._count?.tasks || 0 });
                    });
                });
                const teamFolders = folders.filter((f: any) => f.teamId === t.id && !f.projectId);
                teamFolders.forEach((f: any) => {
                    children.push({ kind: 'folder', id: f.id, name: f.name, depth: 2 });
                    lists.filter((l: any) => l.folderId === f.id).forEach((l: any) => {
                        children.push({ kind: 'list', id: l.id, name: l.name, depth: 3, count: l._count?.tasks || 0 });
                    });
                });
                lists.filter((l: any) => l.teamId === t.id && !l.projectId && !l.folderId).forEach((l: any) => {
                    children.push({ kind: 'list', id: l.id, name: l.name, depth: 2, count: l._count?.tasks || 0 });
                });
            });

            spaceLists.forEach((l: any) => {
                children.push({ kind: 'list', id: l.id, name: l.name, depth: 1, count: l._count?.tasks || 0 });
            });

            return { id: spaceId, name: space.name, children };
        });

        const rootChildren: any[] = [];
        projects.filter((p: any) => !p.spaceId && !p.teamId).forEach((p: any) => {
            rootChildren.push({ kind: 'project', id: p.id, name: p.name, depth: 0 });
            lists.filter((l: any) => l.projectId === p.id && !l.folderId).forEach((l: any) => {
                rootChildren.push({ kind: 'list', id: l.id, name: l.name, depth: 1, count: l._count?.tasks || 0 });
            });
        });
        teams.filter((t: any) => !t.spaceId).forEach((t: any) => {
            rootChildren.push({ kind: 'team', id: t.id, name: t.name, depth: 0 });
            lists.filter((l: any) => l.teamId === t.id && !l.projectId && !l.folderId).forEach((l: any) => {
                rootChildren.push({ kind: 'list', id: l.id, name: l.name, depth: 1, count: l._count?.tasks || 0 });
            });
        });
        folders.filter((f: any) => !f.spaceId && !f.projectId && !f.teamId).forEach((f: any) => {
            rootChildren.push({ kind: 'folder', id: f.id, name: f.name, depth: 0 });
            lists.filter((l: any) => l.folderId === f.id).forEach((l: any) => {
                rootChildren.push({ kind: 'list', id: l.id, name: l.name, depth: 1, count: l._count?.tasks || 0 });
            });
        });
        lists.filter((l: any) => !l.spaceId && !l.projectId && !l.teamId && !l.folderId).forEach((l: any) => {
            rootChildren.push({ kind: 'list', id: l.id, name: l.name, depth: 0, count: l._count?.tasks || 0 });
        });

        return { spaceNodes, rootChildren };
    }, [spaces, projects, teams, folders, lists]);

    // Log computed tree
    React.useEffect(() => {
        if (!open) return;
        console.group('[TaskListPopover] treeNodes');
        console.log('spaceNodes:', treeNodes.spaceNodes);
        console.log('rootChildren:', treeNodes.rootChildren);
        console.groupEnd();
    }, [open, treeNodes]);

    const invalidate = () => {
        void utils.task.list.invalidate();
    };

    const updateTask = trpc.task.update.useMutation({
        onSuccess: () => {
            toast.success("Primary list updated");
            invalidate();
        },
        onError: (err) => toast.error(err.message || "Failed to update list"),
    });

    const addToSharedList = trpc.task.addToSharedList.useMutation({
        onSuccess: () => {
            toast.success("Added to list");
            invalidate();
        },
        onError: (err) => toast.error(err.message || "Failed to add to list"),
    });

    const removeFromSharedList = trpc.task.removeFromSharedList.useMutation({
        onSuccess: () => {
            toast.success("Removed from list");
            invalidate();
        },
        onError: (err) => toast.error(err.message || "Failed to remove from list"),
    });

    const handleToggleList = (listId: string) => {
        if (!taskId) return;
        const isSelected = selectedListIds.has(listId);

        if (!isSelected) {
            // If no primary list yet, set as primary
            if (!currentListId) {
                updateTask.mutate({ id: taskId, listId });
            } else {
                addToSharedList.mutate({ id: taskId, listId });
            }
        } else {
            // Cannot remove the primary list via sharedList removal if it's the only one
            if (listId === currentListId) {
                // If there are shared lists, promote first shared as primary first
                if (sharedLists.length > 0) {
                    updateTask.mutate({ id: taskId, listId: sharedLists[0].id });
                } else {
                    // Simply unset primary list
                    updateTask.mutate({ id: taskId, listId: null });
                }
            } else {
                removeFromSharedList.mutate({ id: taskId, listId });
            }
        }
    };

    const handleRemoveBadge = (listId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!taskId) return;
        if (listId === currentListId) {
            if (sharedLists.length > 0) {
                updateTask.mutate({ id: taskId, listId: sharedLists.find(l => l.id !== listId)?.id ?? null });
            } else {
                updateTask.mutate({ id: taskId, listId: null });
            }
        } else {
            removeFromSharedList.mutate({ id: taskId, listId });
        }
    };

    // Build badge list: primary list first, then shared lists
    const allSelectedLists = React.useMemo(() => {
        const result: SharedList[] = [];
        if (currentListId) {
            const name = personalList?.id === currentListId
                ? 'Personal List'
                : lists.find(l => l.id === currentListId)?.name
                ?? sharedLists.find(l => l.id === currentListId)?.name
                ?? '?';
            result.push({ id: currentListId, name });
        }
        sharedLists.forEach(l => {
            if (l.id !== currentListId) result.push(l);
        });
        return result;
    }, [currentListId, sharedLists, lists, personalList]);

    const isBusy = updateTask.isPending || addToSharedList.isPending || removeFromSharedList.isPending;

    const renderListItem = (child: any) => {
        const isSelected = selectedListIds.has(child.id);
        return (
            <button
                type="button"
                key={child.id}
                onClick={() => {
                    if (child.kind === 'list') handleToggleList(child.id);
                }}
                disabled={child.kind !== 'list' || isBusy}
                className={cn(
                    "w-full flex items-center justify-between py-1.5 text-left text-[13px] hover:bg-zinc-50 group transition-colors",
                    isSelected && child.kind === 'list' && "bg-zinc-100 hover:bg-zinc-100",
                    child.kind === 'list' ? "cursor-pointer" : "cursor-default opacity-70"
                )}
                style={{ paddingLeft: `${child.depth * 14 + 14}px`, paddingRight: '12px' }}
            >
                <span className="flex items-center gap-2 min-w-0">
                    {child.kind === "project" && <Briefcase className="size-3.5 text-zinc-400 shrink-0" />}
                    {child.kind === "team" && <Building2 className="size-3.5 text-zinc-400 shrink-0" />}
                    {child.kind === "folder" && <FolderIconLucide className="size-3.5 text-zinc-400 shrink-0" />}
                    {child.kind === "list" && <ListChecks className={cn("size-3.5 shrink-0", isSelected ? "text-zinc-600" : "text-zinc-400")} />}
                    <span className={cn(
                        "truncate",
                        child.kind === 'list'
                            ? (isSelected ? 'text-zinc-900 font-semibold' : 'text-zinc-700 font-medium')
                            : 'text-zinc-700 font-medium'
                    )}>
                        {child.name}
                    </span>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                    {child.kind === 'list' && child.count > 0 && !isSelected && (
                        <span className="text-[11px] text-zinc-600 group-hover:text-zinc-700">{child.count}</span>
                    )}
                    {child.kind === 'list' && isSelected && (
                        <Check className="size-4 text-zinc-700 shrink-0" />
                    )}
                </div>
            </button>
        );
    };

    const isPersonalSelected = personalList && selectedListIds.has(personalList.id);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 rounded-xl shadow-lg z-[150]" side="right" align="start" sideOffset={8} collisionPadding={12}>
                <div className="flex flex-col">
                    {/* Selected list badges */}
                    {allSelectedLists.length > 0 && (
                        <div className="px-3 pt-3 pb-2 flex flex-wrap gap-1.5 border-b border-zinc-100">
                            {allSelectedLists.map(l => (
                                <span
                                    key={l.id}
                                    className="inline-flex items-center gap-1 h-6 pl-2 rounded-md border border-zinc-200 bg-white text-[12px] text-zinc-700 font-medium"
                                    style={{ paddingRight: l.id !== currentListId ? '4px' : '8px' }}
                                >
                                    {l.name}
                                    {l.id !== currentListId && (
                                        <button
                                            type="button"
                                            onClick={(e) => handleRemoveBadge(l.id, e)}
                                            disabled={isBusy}
                                            className="ml-0.5 flex items-center justify-center h-4 w-4 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Search */}
                    <div className="p-2 border-b border-zinc-100">
                        <div className="flex items-center gap-2 px-2.5 h-8 bg-zinc-50 border border-zinc-200 rounded-md focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-shadow">
                            <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                            <input
                                value={listSearch}
                                onChange={(e) => setListSearch(e.target.value)}
                                placeholder="Search..."
                                className="flex-1 bg-transparent border-none outline-none text-[13px] text-zinc-900 placeholder:text-zinc-500 min-w-0"
                            />
                        </div>
                    </div>

                    {/* List tree */}
                    <div className="max-h-[320px] overflow-y-auto py-1">
                        {/* Personal list */}
                        {(!listSearch || "personal list".includes(listSearch.toLowerCase())) && personalList && (
                            <button
                                type="button"
                                onClick={() => handleToggleList(personalList.id)}
                                disabled={isBusy}
                                className={cn(
                                    "w-full flex items-center justify-between py-1.5 px-3 text-left text-[13px] cursor-pointer hover:bg-zinc-50 group transition-colors",
                                    isPersonalSelected && "bg-zinc-100 hover:bg-zinc-100"
                                )}
                            >
                                <span className="flex items-center gap-2">
                                    <User className={cn("size-3.5 shrink-0", isPersonalSelected ? "text-zinc-600" : "text-zinc-400")} />
                                    <span className={cn("font-normal", isPersonalSelected ? "text-zinc-900 font-semibold" : "text-zinc-700")}>Personal List</span>
                                </span>
                                {isPersonalSelected && <Check className="size-4 text-zinc-700 shrink-0" />}
                            </button>
                        )}

                        {/* Spaces */}
                        {treeNodes.spaceNodes.length > 0 && (
                            <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Spaces</div>
                        )}

                        {treeNodes.spaceNodes
                            .filter((s: any) => !listSearch.trim() || s.name.toLowerCase().includes(listSearch.toLowerCase()) || s.children.some((c: any) => c.name.toLowerCase().includes(listSearch.toLowerCase())))
                            .map((space: any) => (
                                <div key={space.id}>
                                    <div className="w-full flex items-center py-1.5 px-3 text-left text-[13px]">
                                        <span className="flex items-center gap-2 text-indigo-500 font-medium">
                                            <Network className="h-4 w-4 shrink-0 p-0.5 rounded bg-indigo-100 text-indigo-600" />
                                            {space.name}
                                        </span>
                                    </div>
                                    {space.children
                                        .filter((c: any) => !listSearch.trim() || c.name.toLowerCase().includes(listSearch.toLowerCase()))
                                        .map((child: any) => renderListItem(child))}
                                </div>
                            ))}

                        {/* Root-level items */}
                        {treeNodes.rootChildren
                            .filter((c: any) => !listSearch.trim() || c.name.toLowerCase().includes(listSearch.toLowerCase()))
                            .map((child: any) => renderListItem(child))}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
