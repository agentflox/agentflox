'use client';

import * as React from 'react';
import { AlertTriangle, Search, ChevronDown, ChevronRight, Plus, ExternalLink, X, Maximize2, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TaskPickerModal, type RelationshipDependencyType } from './TaskPickerModal';

const PRIORITY_COLORS: Record<string, string> = {
    URGENT: 'text-red-600',
    HIGH: 'text-orange-600',
    NORMAL: 'text-zinc-600',
    LOW: 'text-zinc-400',
};

interface WaitingOnPanelContentProps {
    taskId: string;
    workspaceId: string;
    items: Array<{
        id: string;
        taskId: string;
        dependsOnId: string;
        type?: string;
        dependsOn: {
            id: string;
            title: string | null;
            status?: { name: string } | null;
            dueDate?: Date | string | null;
            priority?: string | null;
            assignees?: Array<{ user?: { id: string; name: string | null; image: string | null } }>;
        };
    }>;
}

export function WaitingOnPanelContent({ taskId, workspaceId, items }: WaitingOnPanelContentProps) {
    const [collapsed, setCollapsed] = React.useState(false);
    const [pickerOpen, setPickerOpen] = React.useState(false);

    const utils = trpc.useUtils();
    const addDependency = trpc.task.addDependency.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
            setPickerOpen(false);
            toast.success('Dependency added');
        },
        onError: (e) => toast.error(e.message || 'Failed to add dependency'),
    });
    const removeDependency = trpc.task.removeDependency.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
            toast.success('Dependency removed');
        },
        onError: (e) => toast.error(e.message || 'Failed to remove dependency'),
    });

    const handleSelect = (selectedTaskId: string) => {
        addDependency.mutate({
            taskId,
            dependsOnId: selectedTaskId,
            type: 'START_TO_START' as RelationshipDependencyType,
        });
    };

    const handleRemove = (dependsOnId: string) => {
        removeDependency.mutate({ taskId, dependsOnId });
    };

    const count = items.length;

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="flex items-center justify-between gap-2 shrink-0 mb-3">
                <h3 className="text-base font-semibold text-zinc-900">Waiting on</h3>
                <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Search">
                        <Search className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPickerOpen(true)} aria-label="Add">
                        <Plus className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            <div className="rounded-lg border border-zinc-200 overflow-hidden bg-white flex-1 min-h-0 flex flex-col">
                <button
                    type="button"
                    onClick={() => setCollapsed((c) => !c)}
                    className="flex items-center gap-2 py-2.5 px-3 text-left hover:bg-zinc-50/50 transition-colors border-b border-zinc-100"
                >
                    {collapsed ? <ChevronRight className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                    <AlertTriangle className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm font-medium text-zinc-900">Waiting on {count}</span>
                </button>

                {!collapsed && (
                    <>
                        <div className="overflow-auto flex-1 min-h-0">
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
                                            <td colSpan={5} className="py-6 text-center text-sm text-zinc-400">
                                                No tasks you're waiting on.
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
                                                                onClick={() => handleRemove(dep.dependsOnId)}
                                                                disabled={removeDependency.isPending}
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
                                                onClick={() => setPickerOpen(true)}
                                                className="text-sm text-zinc-500 hover:text-purple-600 flex items-center gap-1"
                                            >
                                                <Plus className="h-3.5 w-3.5" /> Add dependency
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            <TaskPickerModal open={pickerOpen} onOpenChange={setPickerOpen} taskId={taskId} workspaceId={workspaceId} dependencyType="START_TO_START" onSelect={handleSelect} />
        </div>
    );
}
