import React, { memo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { ExternalLink, Link2, Check, Flag, X, User, Plus, Info } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AssigneeSelector } from "@/entities/task/components/AssigneeSelector";

interface TaskHoverPopoverProps {
    task: any;
    anchorRect: DOMRect;
    workspaceId: string;
    statuses: any[];
    users: any[];
    agents: any[];
    onClose: () => void;
}

export const TaskHoverPopover = memo(function TaskHoverPopover({
    task,
    anchorRect,
    workspaceId,
    statuses,
    users,
    agents,
    onClose
}: TaskHoverPopoverProps) {
    const router = useRouter();
    const utils = trpc.useContext();
    const updateTaskDatesMutation = trpc.task.update.useMutation();

    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const popoverDropdownOpenRef = useRef(false);
    const [editingHoveredTaskName, setEditingHoveredTaskName] = useState(false);
    const [openDropdownType, setOpenDropdownType] = useState<'status' | 'priority' | 'assignee' | null>(null);

    const priorityColors: Record<string, string> = { URGENT: '#ef4444', HIGH: '#f97316', NORMAL: '#3b82f6', LOW: '#6b7280' };
    const priorityColor = task.priority ? (priorityColors[task.priority] || '#6b7280') : '#a1a1aa';
    const cardWidth = 440;
    const left = Math.min(anchorRect.right - cardWidth, Math.max(8, anchorRect.right - cardWidth));
    const clampedLeft = Math.min(Math.max(left, 8), window.innerWidth - cardWidth - 8);
    const top = anchorRect.top - 8;

    const hierarchyPath = [];
    if (task.workspace?.name) hierarchyPath.push(task.workspace.name);
    if (task.space?.name) hierarchyPath.push(task.space.name);
    if (task.project?.name) hierarchyPath.push(task.project.name);
    if (task.team?.name) hierarchyPath.push(task.team.name);
    if (task.list?.name) hierarchyPath.push(task.list.name);
    if (hierarchyPath.length === 0) hierarchyPath.push('Task');

    return (
        <div
            className="fixed z-[9999]"
            style={{ left: clampedLeft, top, width: cardWidth, transform: 'translateY(-100%)' }}
            onMouseEnter={() => {
                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            }}
            onMouseLeave={() => {
                if (editingHoveredTaskName || popoverDropdownOpenRef.current) return;
                hoverTimeoutRef.current = setTimeout(() => {
                    onClose();
                }, 250);
            }}
        >
            <div className="bg-white rounded-xl shadow-2xl border border-zinc-200/80 p-3.5 flex flex-col gap-2.5 pointer-events-auto">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 text-[12px] text-zinc-500">
                        <span className="truncate flex-1 min-w-0" title={hierarchyPath.join(' / ')}>
                            {hierarchyPath.join(' / ')}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            className="flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer outline-none"
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/dashboard/${workspaceId}/tasks/${task.id}`);
                            }}
                            title="View full task"
                        >
                            <ExternalLink className="h-[15px] w-[15px]" strokeWidth={2} />
                        </button>
                        <button
                            className="flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer outline-none"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(`${window.location.origin}/dashboard/${workspaceId}/tasks/${task.id}`);
                                toast.success("Link copied");
                            }}
                            title="Copy link"
                        >
                            <Link2 className="h-[15px] w-[15px]" strokeWidth={2} />
                        </button>
                    </div>
                </div>

                <div className="min-h-[24px] flex items-center">
                    {editingHoveredTaskName ? (
                        <input
                            autoFocus
                            className="text-[15px] font-semibold text-zinc-800 leading-snug w-full border border-violet-300 ring-2 ring-violet-100 rounded px-1 outline-none"
                            defaultValue={task.title || task.name}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const val = e.currentTarget.value.trim();
                                    if (val && val !== (task.title || task.name)) {
                                        updateTaskDatesMutation.mutate({ id: task.id, name: val }, {
                                            onSuccess: () => {
                                                utils.task.list.invalidate();
                                                onClose();
                                            }
                                        });
                                    }
                                    setEditingHoveredTaskName(false);
                                } else if (e.key === 'Escape') {
                                    setEditingHoveredTaskName(false);
                                }
                            }}
                            onBlur={(e) => {
                                const val = e.currentTarget.value.trim();
                                if (val && val !== (task.title || task.name)) {
                                    updateTaskDatesMutation.mutate({ id: task.id, name: val }, {
                                        onSuccess: () => {
                                            utils.task.list.invalidate();
                                            onClose(); // force local refresh
                                        }
                                    });
                                }
                                setEditingHoveredTaskName(false);
                            }}
                        />
                    ) : (
                        <p
                            className="text-[15px] font-semibold text-zinc-800 leading-snug cursor-text hover:bg-zinc-50 rounded px-1 -ml-1 transition-colors w-full line-clamp-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingHoveredTaskName(true);
                            }}
                            title="Click to edit"
                        >
                            {task.title || task.name}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-between gap-2 mt-1">
                    <div className="flex items-center gap-1.5">
                        <DropdownMenu
                            open={openDropdownType === 'status'}
                            onOpenChange={(v) => {
                                setOpenDropdownType(v ? 'status' : null);
                                popoverDropdownOpenRef.current = v;
                            }}
                        >
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center px-2 py-1 rounded-[4px] text-[11px] font-semibold uppercase tracking-wider hover:opacity-80 transition-opacity outline-none cursor-pointer"
                                    style={{ backgroundColor: task.status?.color ? task.status.color + '15' : '#f4f4f5', color: task.status?.color || '#3f3f46' }}
                                >
                                    {task.status?.name || 'Status'}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48 z-[100000] shadow-xl">
                                <DropdownMenuLabel className="text-xs">Change Status</DropdownMenuLabel>
                                {statuses.map((s: any) => (
                                    <DropdownMenuItem
                                        key={s.id}
                                        onClick={() => {
                                            updateTaskDatesMutation.mutate({ id: task.id, statusId: s.id }, {
                                                onSuccess: () => {
                                                    utils.task.list.invalidate();
                                                    onClose(); // simple state refresh
                                                }
                                            });
                                        }}
                                        className="text-xs flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                                            {s.name}
                                        </div>
                                        {task.status?.id === s.id && <Check className="h-3 w-3 text-zinc-400" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu
                            open={openDropdownType === 'priority'}
                            onOpenChange={(v) => {
                                setOpenDropdownType(v ? 'priority' : null);
                                popoverDropdownOpenRef.current = v;
                            }}
                        >
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center justify-center h-6 w-6 rounded-md hover:bg-zinc-100 transition-colors outline-none cursor-pointer border border-transparent hover:border-zinc-200">
                                    <Flag
                                        className="h-3.5 w-3.5 shrink-0"
                                        style={{ color: priorityColor, fill: task.priority ? priorityColor : 'none' }}
                                    />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-40 z-[100000] shadow-xl">
                                <DropdownMenuLabel className="text-xs">Set Priority</DropdownMenuLabel>
                                {['URGENT', 'HIGH', 'NORMAL', 'LOW'].map(p => {
                                    const pc = priorityColors[p];
                                    return (
                                        <DropdownMenuItem
                                            key={p}
                                            onClick={() => {
                                                updateTaskDatesMutation.mutate({ id: task.id, priority: p }, {
                                                    onSuccess: () => {
                                                        utils.task.list.invalidate();
                                                        onClose();
                                                    }
                                                });
                                            }}
                                            className="text-xs flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-2 capitalize">
                                                <Flag className="h-3 w-3 fill-current" style={{ color: pc }} />
                                                {p.toLowerCase()}
                                            </div>
                                            {task.priority === p && <Check className="h-3 w-3 text-zinc-400" />}
                                        </DropdownMenuItem>
                                    )
                                })}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => {
                                        updateTaskDatesMutation.mutate({ id: task.id, priority: null }, {
                                            onSuccess: () => {
                                                utils.task.list.invalidate();
                                                onClose();
                                            }
                                        });
                                    }}
                                    className="text-xs text-red-500"
                                >
                                    <X className="h-3 w-3 mr-2" /> Clear Priority
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div>
                        {workspaceId && users && (
                            <AssigneeSelector
                                users={users}
                                agents={agents}
                                workspaceId={workspaceId}
                                variant="compact"
                                open={openDropdownType === 'assignee'}
                                onOpenChange={(v) => {
                                    setOpenDropdownType(v ? 'assignee' : null);
                                    popoverDropdownOpenRef.current = v;
                                }}
                                contentClassName="z-[100000] shadow-xl"
                                value={task.assignees?.map((a: any) => a.user.id) || []}
                                onChange={(ids) => {
                                    updateTaskDatesMutation.mutate({ id: task.id, userAssignees: ids }, {
                                        onSuccess: () => {
                                            utils.task.list.invalidate();
                                            onClose();
                                        }
                                    });
                                }}
                                align="end"
                                trigger={
                                    <button className="h-8 w-8 flex items-center justify-center rounded-full transition-all border border-dashed border-zinc-300 hover:border-zinc-400 outline-none cursor-pointer bg-white relative">
                                        {task.assignees?.[0]?.user ? (
                                            <Avatar className="h-8 w-8 border border-white">
                                                <AvatarImage src={task.assignees[0].user.image || undefined} />
                                                <AvatarFallback className="text-[10px] font-bold bg-violet-100 text-violet-700">
                                                    {task.assignees[0].user.name?.slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        ) : (
                                            <>
                                                <User className="h-[15px] w-[15px] text-zinc-400" />
                                                <div className="absolute -bottom-0.5 -right-0.5 bg-zinc-300 text-white rounded-full border-[1.5px] border-white flex items-center justify-center shadow-sm h-[14px] w-[14px]">
                                                    <Plus className="h-[8px] w-[8px]" strokeWidth={3} />
                                                </div>
                                            </>
                                        )}
                                    </button>
                                }
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});
