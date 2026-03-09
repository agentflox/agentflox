'use client';

import * as React from 'react';
import {
    Link as LinkIcon, Plus, X, AlertCircle, ArrowRight,
    GitMerge, Copy, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface RelationshipsSectionProps {
    taskId: string;
    workspaceId: string;
}

const DEPENDENCY_TYPES = [
    { value: 'FINISH_TO_START', label: 'Blocks', icon: AlertCircle, color: 'text-red-600 bg-red-50' },
    { value: 'START_TO_START', label: 'Blocked by', icon: AlertCircle, color: 'text-orange-600 bg-orange-50' },
    { value: 'FINISH_TO_FINISH', label: 'Relates to', icon: LinkIcon, color: 'text-blue-600 bg-blue-50' },
    { value: 'START_TO_FINISH', label: 'Duplicates', icon: Copy, color: 'text-purple-600 bg-purple-50' },
];

export function RelationshipsSection({ taskId, workspaceId }: RelationshipsSectionProps) {
    const [addOpen, setAddOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedType, setSelectedType] = React.useState<string>('FINISH_TO_START');

    const utils = trpc.useUtils();

    // Fetch current task with dependencies
    const { data: task } = trpc.task.get.useQuery({ id: taskId });
    
    // Search tasks for adding relationships
    const { data: searchResults = [] } = trpc.task.list.useQuery(
        {
            workspaceId,
            query: searchQuery,
            pageSize: 10,
            includeRelations: true,
        },
        { enabled: addOpen && searchQuery.length > 0 }
    );

    // Mutations
    const addDependency = trpc.task.addDependency.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
            setAddOpen(false);
            setSearchQuery('');
            toast.success('Relationship added');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to add relationship');
        }
    });

    const removeDependency = trpc.task.removeDependency.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
            toast.success('Relationship removed');
        }
    });

    const handleAddDependency = (dependsOnId: string) => {
        addDependency.mutate({
            taskId,
            dependsOnId,
            type: selectedType as any,
        });
    };

    const handleRemoveDependency = (dependsOnId: string) => {
        removeDependency.mutate({
            taskId,
            dependsOnId,
        });
    };

    const dependencies = task?.dependencies || [];
    const blockedDependencies = task?.blockedDependencies || [];

    const getDependencyTypeInfo = (type: string) => {
        return DEPENDENCY_TYPES.find(t => t.value === type) || DEPENDENCY_TYPES[0];
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <GitMerge className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm font-semibold text-zinc-900">Relationships</span>
                    {(dependencies.length + blockedDependencies.length) > 0 && (
                        <span className="text-xs text-zinc-500">
                            ({dependencies.length + blockedDependencies.length})
                        </span>
                    )}
                </div>

                <Popover open={addOpen} onOpenChange={setAddOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1.5"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                        <div className="p-3 border-b border-zinc-200 space-y-2">
                            <Select value={selectedType} onValueChange={setSelectedType}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DEPENDENCY_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            <div className="flex items-center gap-2">
                                                <type.icon className="h-3.5 w-3.5" />
                                                {type.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Command>
                            <CommandInput
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onValueChange={setSearchQuery}
                            />
                            <CommandList className="max-h-[250px]">
                                <CommandEmpty>
                                    {searchQuery.length > 0 ? 'No tasks found.' : 'Start typing to search...'}
                                </CommandEmpty>
                                {searchResults.length > 0 && (
                                    <CommandGroup heading="Tasks">
                                        {searchResults
                                            .filter((t: any) => t.id !== taskId)
                                            .map((searchTask: any) => (
                                                <CommandItem
                                                    key={searchTask.id}
                                                    value={searchTask.title}
                                                    onSelect={() => handleAddDependency(searchTask.id)}
                                                    className="cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-medium truncate">
                                                                {searchTask.title}
                                                            </div>
                                                            {searchTask.status && (
                                                                <div className="text-xs text-zinc-500 mt-0.5">
                                                                    {searchTask.status.name}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                    </CommandGroup>
                                )}
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Dependencies List (This task depends on...) */}
            {dependencies.length > 0 && (
                <div className="space-y-2">
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        This task depends on
                    </div>
                    <div className="space-y-1">
                        {dependencies.map((dep: any) => {
                            const typeInfo = getDependencyTypeInfo(dep.type);
                            return (
                                <div
                                    key={dep.id}
                                    className="flex items-center gap-2 p-2 rounded-md border border-zinc-200 hover:bg-zinc-50 group"
                                >
                                    <Badge
                                        variant="secondary"
                                        className={cn("text-[10px] h-5", typeInfo.color)}
                                    >
                                        <typeInfo.icon className="h-3 w-3 mr-1" />
                                        {typeInfo.label}
                                    </Badge>

                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-zinc-900 truncate">
                                            {dep.dependsOn.title}
                                        </div>
                                        {dep.dependsOn.status && (
                                            <div className="text-xs text-zinc-500">
                                                {dep.dependsOn.status.name}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7"
                                            onClick={() => window.open(`/tasks/${dep.dependsOn.id}`, '_blank')}
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleRemoveDependency(dep.dependsOnId)}
                                            disabled={removeDependency.isLoading}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Blocked Dependencies (Other tasks depend on this) */}
            {blockedDependencies.length > 0 && (
                <div className="space-y-2">
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        Blocking these tasks
                    </div>
                    <div className="space-y-1">
                        {blockedDependencies.map((dep: any) => {
                            const typeInfo = getDependencyTypeInfo(dep.type);
                            return (
                                <div
                                    key={dep.id}
                                    className="flex items-center gap-2 p-2 rounded-md border border-zinc-200 hover:bg-zinc-50 group"
                                >
                                    <Badge
                                        variant="secondary"
                                        className={cn("text-[10px] h-5", typeInfo.color)}
                                    >
                                        <typeInfo.icon className="h-3 w-3 mr-1" />
                                        Blocks
                                    </Badge>

                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-zinc-900 truncate">
                                            {dep.task.title}
                                        </div>
                                        {dep.task.status && (
                                            <div className="text-xs text-zinc-500">
                                                {dep.task.status.name}
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => window.open(`/tasks/${dep.task.id}`, '_blank')}
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {dependencies.length === 0 && blockedDependencies.length === 0 && (
                <div className="text-center py-8 text-sm text-zinc-400">
                    No relationships yet. Click "Add" to create one.
                </div>
            )}
        </div>
    );
}
