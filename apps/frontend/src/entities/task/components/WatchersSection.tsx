'use client';

import * as React from 'react';
import { Bell, BellOff, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WatchersSectionProps {
    taskId: string;
    workspaceId: string;
    currentUserId: string;
    assigneeIds?: string[];
}

export function WatchersSection({
    taskId,
    workspaceId,
    currentUserId,
    assigneeIds = []
}: WatchersSectionProps) {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');

    const utils = trpc.useUtils();

    // Fetch watchers
    const { data: watchers = [] } = trpc.task.watchers.list.useQuery({ taskId });

    // Fetch workspace members for adding watchers
    const { data: workspaceData } = trpc.workspace.get.useQuery(
        { id: workspaceId },
        { enabled: open }
    );

    // Mutations
    const addWatcher = trpc.task.watchers.add.useMutation({
        onSuccess: () => {
            utils.task.watchers.list.invalidate({ taskId });
            toast.success('Watcher added');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to add watcher');
        }
    });

    const removeWatcher = trpc.task.watchers.remove.useMutation({
        onSuccess: () => {
            utils.task.watchers.list.invalidate({ taskId });
            toast.success('Watcher removed');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to remove watcher');
        }
    });

    const watcherIds = React.useMemo(() => 
        watchers.map(w => w.userId),
        [watchers]
    );

    const isWatching = watcherIds.includes(currentUserId);

    const workspaceMembers = React.useMemo(() => {
        if (!workspaceData?.members) return [];
        return workspaceData.members
            .map((m: any) => ({
                id: m.user.id,
                name: m.user.name || m.user.email,
                email: m.user.email,
                image: m.user.image,
            }))
            .filter((m: any) => 
                !watcherIds.includes(m.id) &&
                (m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 m.email.toLowerCase().includes(searchQuery.toLowerCase()))
            );
    }, [workspaceData, watcherIds, searchQuery]);

    const handleToggleWatch = () => {
        if (isWatching) {
            removeWatcher.mutate({ taskId, userId: currentUserId });
        } else {
            addWatcher.mutate({ taskId, userId: currentUserId });
        }
    };

    const handleAddWatcher = (userId: string) => {
        addWatcher.mutate({ taskId, userId });
        setOpen(false);
        setSearchQuery('');
    };

    const handleRemoveWatcher = (userId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        removeWatcher.mutate({ taskId, userId });
    };

    return (
        <div className="flex items-center gap-2">
            {/* Watchers Avatar Stack */}
            {watchers.length > 0 && (
                <div className="flex -space-x-2">
                    {watchers.slice(0, 3).map((watcher) => (
                        <TooltipProvider key={watcher.id}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="relative group">
                                        <Avatar className="h-7 w-7 border-2 border-white ring-1 ring-zinc-200 cursor-pointer hover:ring-zinc-300 transition-all">
                                            <AvatarImage src={watcher.user.image || undefined} />
                                            <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                                                {watcher.user.name?.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        {watcher.userId !== currentUserId && (
                                            <button
                                                onClick={(e) => handleRemoveWatcher(watcher.userId, e)}
                                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                            >
                                                <X className="h-2.5 w-2.5" />
                                            </button>
                                        )}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="font-medium">{watcher.user.name}</p>
                                    <p className="text-xs text-zinc-400">{watcher.user.email}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ))}
                    {watchers.length > 3 && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="h-7 w-7 rounded-full bg-zinc-100 border-2 border-white ring-1 ring-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-600 cursor-help">
                                        +{watchers.length - 3}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <div className="space-y-1">
                                        {watchers.slice(3).map((w) => (
                                            <p key={w.id} className="text-xs">{w.user.name}</p>
                                        ))}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            )}

            {/* Watch/Unwatch Button */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="icon"
                            variant={isWatching ? "default" : "outline"}
                            className={cn(
                                "h-7 w-7",
                                isWatching && "bg-blue-600 hover:bg-blue-700"
                            )}
                            onClick={handleToggleWatch}
                            disabled={addWatcher.isLoading || removeWatcher.isLoading}
                        >
                            {isWatching ? (
                                <Bell className="h-4 w-4 fill-current" />
                            ) : (
                                <BellOff className="h-4 w-4" />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        {isWatching ? 'Stop watching' : 'Watch this task'}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Add Watcher Popover */}
            <Popover open={open} onOpenChange={setOpen}>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-7 w-7"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Add watcher</TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                        <CommandInput 
                            placeholder="Search people..." 
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                        />
                        <CommandList className="max-h-[250px]">
                            <CommandEmpty>No people found.</CommandEmpty>
                            <CommandGroup heading="Workspace Members">
                                {workspaceMembers.map((member: any) => (
                                    <CommandItem
                                        key={member.id}
                                        value={`${member.name} ${member.email}`}
                                        onSelect={() => handleAddWatcher(member.id)}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={member.image || undefined} />
                                                <AvatarFallback className="text-[10px] bg-zinc-100">
                                                    {member.name?.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{member.name}</span>
                                                <span className="text-xs text-zinc-500">{member.email}</span>
                                            </div>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
