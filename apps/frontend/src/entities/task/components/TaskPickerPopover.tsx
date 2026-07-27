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
import { Search, ArrowLeftRight, Plus } from 'lucide-react';
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
    const filteredTasks = tasks.filter((t: any) => t.id !== taskId && !existingIds.includes(t.id));

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
            <Popover modal={true} open={open} onOpenChange={onOpenChange}>
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
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Search..."
                                className="h-full w-full bg-transparent p-0 focus:outline-none focus:ring-0 focus-visible:ring-0 text-[13px] shadow-none border-0 placeholder:text-zinc-400"
                                autoFocus
                            />
                        </div>

                        <div className="flex items-center justify-between px-2 pt-1">
                            <span className="text-[11px] font-semibold text-zinc-500">
                                {searchQuery ? 'Results' : 'Recent Tasks'}
                            </span>
                        </div>

                        <div className="max-h-[280px] overflow-y-auto space-y-0.5 px-1 pb-1">
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
                                        onClick={() => { setSelectedId(t.id); onSelect(t.id); onOpenChange(false); setSearchInput(''); setSearchQuery(''); }}
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
