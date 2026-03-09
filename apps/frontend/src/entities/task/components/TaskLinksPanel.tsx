'use client';

import * as React from 'react';
import {
    Check,
    Search,
    ChevronDown,
    ChevronRight,
    Plus,
    ExternalLink,
    X,
    Maximize2,
    Flag,
    MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TaskPickerModal, type RelationshipDependencyType } from './TaskPickerModal';
import { ConnectLinkModal, LINK_ATTACHMENT_MIME_TYPE } from './ConnectLinkModal';

const PRIORITY_COLORS: Record<string, string> = {
    URGENT: 'text-red-600',
    HIGH: 'text-orange-600',
    NORMAL: 'text-zinc-600',
    LOW: 'text-zinc-400',
};

interface TaskLinksPanelProps {
    taskId: string;
    workspaceId?: string;
    /** Linked tasks (FINISH_TO_FINISH dependencies) */
    linkedItems?: Array<{
        id: string;
        taskId: string;
        dependsOnId: string;
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

export function TaskLinksPanel({ taskId, workspaceId, linkedItems = [] }: TaskLinksPanelProps) {
    const [linkedCollapsed, setLinkedCollapsed] = React.useState(false);
    const [refsCollapsed, setRefsCollapsed] = React.useState(false);
    const [pickerOpen, setPickerOpen] = React.useState(false);
    const [connectUrlInput, setConnectUrlInput] = React.useState('');
    const [addLinkModalOpen, setAddLinkModalOpen] = React.useState(false);

    const { data: attachments = [] } = trpc.task.attachments.list.useQuery({ taskId });
    const urlLinks = React.useMemo(() => attachments.filter((a: any) => a.mimeType === LINK_ATTACHMENT_MIME_TYPE), [attachments]);

    const utils = trpc.useUtils();
    const addDependency = trpc.task.addDependency.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
            setPickerOpen(false);
        },
    });
    const removeDependency = trpc.task.removeDependency.useMutation({
        onSuccess: () => utils.task.get.invalidate({ id: taskId }),
    });
    const deleteAttachment = trpc.task.attachments.delete.useMutation({
        onSuccess: () => utils.task.attachments.list.invalidate({ taskId }),
    });

    const handleLinkedSelect = (selectedTaskId: string) => {
        addDependency.mutate({
            taskId,
            dependsOnId: selectedTaskId,
            type: 'FINISH_TO_FINISH' as RelationshipDependencyType,
        });
    };

    const linkedCount = linkedItems.length;
    const refsCount = urlLinks.length;

    return (
        <div className="flex flex-col h-full min-h-0">
            <ConnectLinkModal
                key={addLinkModalOpen ? connectUrlInput || 'new' : 'closed'}
                open={addLinkModalOpen}
                onOpenChange={setAddLinkModalOpen}
                taskId={taskId}
                initialUrl={connectUrlInput.trim()}
                onSuccess={() => setConnectUrlInput('')}
            />

            {/* Header */}
            <div className="flex items-center justify-between gap-2 shrink-0 mb-3 px-4 pt-4">
                <h3 className="text-base font-semibold text-zinc-900">Task Links</h3>
                <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Search">
                        <Search className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPickerOpen(true)} aria-label="Add">
                        <Plus className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Linked section - table */}
            <div className="rounded-lg border border-zinc-200 overflow-hidden bg-white flex-1 min-h-0 flex flex-col mx-4 mb-3">
                <button
                    type="button"
                    onClick={() => setLinkedCollapsed((c) => !c)}
                    className="flex items-center gap-2 py-2.5 px-3 text-left hover:bg-zinc-50/50 transition-colors border-b border-zinc-100"
                >
                    {linkedCollapsed ? <ChevronRight className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                    <Check className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm font-medium text-zinc-900">Linked {linkedCount}</span>
                </button>

                {!linkedCollapsed && (
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
                                    {linkedItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-6 text-center text-sm text-zinc-400">
                                                No linked tasks.
                                            </td>
                                        </tr>
                                    ) : (
                                        linkedItems.map((dep) => {
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
                                                                onClick={() => removeDependency.mutate({ taskId, dependsOnId: dep.dependsOnId })}
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
                                </tbody>
                            </table>
                        </div>
                        <div className="px-3 py-2 border-t border-zinc-100">
                            <button type="button" onClick={() => setPickerOpen(true)} className="text-sm text-zinc-500 hover:text-purple-600 flex items-center gap-1">
                                <Plus className="h-3.5 w-3.5" /> Add linked task
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* References section - URL links */}
            <div className="rounded-lg border border-zinc-200 overflow-hidden bg-white flex-1 min-h-0 flex flex-col mx-4 mb-4">
                <button
                    type="button"
                    onClick={() => setRefsCollapsed((c) => !c)}
                    className="flex items-center gap-2 py-2.5 px-3 text-left hover:bg-zinc-50/50 transition-colors border-b border-zinc-100"
                >
                    {refsCollapsed ? <ChevronRight className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                    <span className="text-sm font-medium text-zinc-900">References {refsCount}</span>
                </button>

                {!refsCollapsed && (
                    <div className="p-2 space-y-1">
                        {urlLinks.length === 0 ? (
                            <p className="text-sm text-zinc-400 py-2 px-2">No references.</p>
                        ) : (
                            urlLinks.map((link: any) => (
                                <div key={link.id} className="flex items-center justify-between gap-2 py-2 px-2 rounded-md hover:bg-zinc-50 group">
                                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 text-sm text-zinc-800 hover:text-purple-600 truncate">
                                        {link.filename || link.url}
                                    </a>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <a href={link.url} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="h-3.5 w-3.5 mr-2" /> Open
                                                </a>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => deleteAttachment.mutate({ id: link.id })} className="text-red-600">
                                                Remove
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ))
                        )}
                        <div className="flex gap-2 pt-2 px-2">
                            <input
                                value={connectUrlInput}
                                onChange={(e) => setConnectUrlInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), setAddLinkModalOpen(true))}
                                placeholder="Paste URL..."
                                className="flex-1 h-8 text-sm rounded border border-zinc-200 px-2"
                            />
                            <Button size="sm" variant="outline" className="h-8" onClick={() => setAddLinkModalOpen(true)}>
                                Add
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {workspaceId && (
                <TaskPickerModal
                    open={pickerOpen}
                    onOpenChange={setPickerOpen}
                    taskId={taskId}
                    workspaceId={workspaceId}
                    dependencyType="FINISH_TO_FINISH"
                    onSelect={handleLinkedSelect}
                />
            )}
        </div>
    );
}
