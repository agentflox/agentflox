'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, ArrowLeftRight, Plus } from 'lucide-react';
import { TaskCreationModal } from './TaskCreationModal';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

export type RelationshipDependencyType = 'FINISH_TO_START' | 'START_TO_START' | 'FINISH_TO_FINISH';

interface TaskPickerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    taskId: string;
    workspaceId: string;
    dependencyType: RelationshipDependencyType;
    onSelect: (selectedTaskId: string) => void;
}

export function TaskPickerModal({
    open,
    onOpenChange,
    taskId,
    workspaceId,
    dependencyType,
    onSelect,
}: TaskPickerModalProps) {
    const [searchInput, setSearchInput] = React.useState('');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedId, setSelectedId] = React.useState<string | null>(null);
    const [createTaskOpen, setCreateTaskOpen] = React.useState(false);

    // Debounce search to avoid spamming the API and ensure UX similar to ClickUp
    React.useEffect(() => {
        const handle = setTimeout(() => {
            setSearchQuery(searchInput.trim());
        }, 300);
        return () => clearTimeout(handle);
    }, [searchInput]);

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

    const recentTasks = recentData?.items ?? [];
    const searchResults = searchData?.items ?? [];
    const tasks = searchQuery ? searchResults : recentTasks;
    const filteredTasks = tasks.filter((t: any) => t.id !== taskId);

    const handleConfirm = () => {
        if (selectedId) {
            onSelect(selectedId);
            onOpenChange(false);
            setSelectedId(null);
            setSearchInput('');
            setSearchQuery('');
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden rounded-lg border border-zinc-200 bg-white [&>button]:hidden">
                    <DialogTitle className="sr-only">Select task</DialogTitle>
                    <div className="p-4 space-y-4">
                        <div className="flex h-10 items-center rounded-md border border-zinc-200 bg-white px-3 shadow-sm transition-colors focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10">
                            <Search className="h-4 w-4 shrink-0 text-zinc-400 mr-2" />
                            <Input
                                variant="ghost"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Search for task (or subtask) name, ID, or URL"
                                className="h-full w-full bg-transparent p-0 focus:outline-none focus:ring-0 focus-visible:ring-0 text-sm shadow-none border-0 placeholder:text-zinc-400"
                                autoFocus
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-zinc-700">
                                {searchQuery ? 'Results' : 'Browse tasks'}
                            </span>
                        </div>

                        <div className="max-h-[320px] overflow-y-auto border border-zinc-100 rounded-md divide-y divide-zinc-100">
                            {filteredTasks.length === 0 ? (
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
                                        onClick={() => setSelectedId(t.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-50 transition-colors cursor-pointer",
                                            selectedId === t.id && "bg-zinc-100"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "h-4 w-4 rounded-full border-2 shrink-0",
                                                selectedId === t.id ? "border-purple-500 bg-purple-500" : "border-zinc-300"
                                            )}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-zinc-900 truncate">
                                                {t.title}
                                            </div>
                                            {t.status && (
                                                <div className="text-xs text-zinc-500 truncate">
                                                    {t.status.name}
                                                </div>
                                            )}
                                        </div>
                                        {t.assignees?.length > 0 && (
                                            <div className="flex -space-x-2 shrink-0">
                                                {t.assignees.slice(0, 2).map((a: any, i: number) => (
                                                    <Avatar key={i} className="h-6 w-6 border-2 border-white">
                                                        <AvatarImage src={a.user?.image} />
                                                        <AvatarFallback className="text-[8px]">
                                                            {a.user?.name?.substring(0, 2).toUpperCase() ?? '?'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                className="bg-zinc-900 hover:bg-zinc-800"
                                disabled={!selectedId}
                                onClick={handleConfirm}
                            >
                                Add
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
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
