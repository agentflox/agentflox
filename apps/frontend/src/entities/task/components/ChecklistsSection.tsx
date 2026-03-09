'use client';

import * as React from 'react';
import { Plus, GripVertical, MoreHorizontal, Trash2, Edit2, CheckSquare, UserPlus, CheckCircle2, XCircle, ArrowUp, ArrowDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { AssigneeSelector } from './AssigneeSelector';
import { AutoSizeInput } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface ChecklistsSectionProps {
    taskId: string;
    workspaceMembers?: any[];
}

function SortableChecklistItem(props: ChecklistItemComponentProps & { item: any }) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- exclude from rest to override
    const { item, disableSortable, ...rest } = props;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    return (
        <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50")}>
            <ChecklistItemComponent
                {...rest}
                item={item}
                disableSortable={true}
                dragHandleListeners={listeners}
                dragHandleAttributes={attributes}
            />
        </div>
    );
}

interface ChecklistItemComponentProps {
    item?: any;
    checklistId: string;
    taskId: string;
    workspaceMembers: any[];
    isNew?: boolean;
    openItemMenuId?: string | null;
    onItemMenuOpenChange?: (id: string | null) => void;
    onAddBelow?: (itemId: string) => void;
    onCancelAdd?: () => void;
    showCancelButton?: boolean;
    disableSortable?: boolean;
    dragHandleListeners?: object;
    dragHandleAttributes?: object;
}

// Individual Checklist Item Component
function ChecklistItemComponent({ item, checklistId, taskId, workspaceMembers, isNew = false, openItemMenuId, onItemMenuOpenChange, onAddBelow, onCancelAdd, showCancelButton, dragHandleListeners, dragHandleAttributes }: ChecklistItemComponentProps) {
    const [isEditing, setIsEditing] = React.useState(isNew);
    const [text, setText] = React.useState(item?.name || item?.text || '');
    const [isHovered, setIsHovered] = React.useState(false);
    const [newItemAssigneeId, setNewItemAssigneeId] = React.useState<string | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const utils = trpc.useUtils();

    const createItem = trpc.task.checklists.items.create.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
            setText('');
            setNewItemAssigneeId(null);
            onCancelAdd?.();
        }
    });

    const updateItem = trpc.task.checklists.items.update.useMutation({
        onMutate: async (input) => {
            await utils.task.get.cancel({ id: taskId });
            const prev = utils.task.get.getData({ id: taskId });
            if (prev?.checklists && item) {
                utils.task.get.setData({ id: taskId }, {
                    ...prev,
                    checklists: prev.checklists.map((c: any) =>
                        c.id !== checklistId ? c : {
                            ...c,
                            items: c.items.map((i: any) =>
                                i.id === input.id ? {
                                    ...i,
                                    ...(input.name !== undefined && { name: input.name }),
                                    ...(input.assigneeId !== undefined && {
                                        assigneeId: input.assigneeId,
                                        assignee: input.assigneeId ? (workspaceMembers.find((m: { id: string }) => m.id === input.assigneeId) ?? { id: input.assigneeId, name: null, image: null }) : null,
                                    }),
                                } : i
                            )
                        }
                    ),
                });
                if (input.name !== undefined) setIsEditing(false);
            }
            return { prev };
        },
        onError: (_err, _input, ctx) => {
            if (ctx?.prev) utils.task.get.setData({ id: taskId }, ctx.prev);
        },
        onSettled: () => utils.task.get.invalidate({ id: taskId }),
    });

    const deleteItem = trpc.task.checklists.items.delete.useMutation({
        onMutate: async (input) => {
            await utils.task.get.cancel({ id: taskId });
            const prev = utils.task.get.getData({ id: taskId });
            if (prev?.checklists) {
                utils.task.get.setData({ id: taskId }, {
                    ...prev,
                    checklists: prev.checklists.map((c: any) =>
                        c.id !== checklistId ? c : { ...c, items: c.items.filter((i: any) => i.id !== input.id) }
                    ),
                });
            }
            return { prev };
        },
        onError: (_err, _input, ctx) => {
            if (ctx?.prev) utils.task.get.setData({ id: taskId }, ctx.prev);
        },
        onSettled: () => utils.task.get.invalidate({ id: taskId }),
    });

    const toggleItem = trpc.task.checklists.items.toggle.useMutation({
        onMutate: async (input) => {
            await utils.task.get.cancel({ id: taskId });
            const prev = utils.task.get.getData({ id: taskId });
            if (prev?.checklists && item) {
                const currentItem = prev.checklists.flatMap((c: any) => c.items).find((i: any) => i.id === input.id);
                if (currentItem) {
                    const nextCompleted = !currentItem.isCompleted;
                    utils.task.get.setData({ id: taskId }, {
                        ...prev,
                        checklists: prev.checklists.map((c: any) =>
                            c.id !== checklistId ? c : {
                                ...c,
                                items: c.items.map((i: any) =>
                                    i.id === input.id ? { ...i, isCompleted: nextCompleted } : i
                                )
                            }
                        ),
                    });
                }
            }
            return { prev };
        },
        onError: (_err, _input, ctx) => {
            if (ctx?.prev) utils.task.get.setData({ id: taskId }, ctx.prev);
        },
        onSettled: () => utils.task.get.invalidate({ id: taskId }),
    });

    const handleSave = () => {
        const trimmed = text.trim();
        if (!trimmed) {
            if (isNew) {
                setText('');
                setNewItemAssigneeId(null);
                setIsEditing(false);
                onCancelAdd?.();
            }
            return;
        }

        if (isNew) {
            createItem.mutate({
                checklistId,
                name: trimmed,
                assigneeId: newItemAssigneeId ?? undefined,
            });
        } else if (item) {
            updateItem.mutate({
                id: item.id,
                name: trimmed,
            });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setText(item?.name || item?.text || '');
            setNewItemAssigneeId(null);
            setIsEditing(false);
        }
    };

    const handleAssign = (userIds: string[]) => {
        if (!item) return;
        const assigneeId = userIds.length > 0 ? userIds[0].replace('user:', '') : null;
        updateItem.mutate({
            id: item.id,
            assigneeId,
        });
    };

    if (isNew) {
        if (isEditing) {
            return (
                <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-zinc-50 rounded group">
                    <Plus className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                    <Input
                        variant="ghost"
                        ref={inputRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSave();
                            } else if (e.key === 'Escape') {
                                setText('');
                                setNewItemAssigneeId(null);
                                setIsEditing(false);
                                onCancelAdd?.();
                            }
                        }}
                        onBlur={handleSave}
                        placeholder="Add item"
                        className="h-7 text-sm bg-transparent border-0 outline-none focus:outline-none px-0 flex-1"
                        autoFocus
                    />
                    <AssigneeSelector
                        users={workspaceMembers}
                        workspaceId=""
                        value={newItemAssigneeId ? [`user:${newItemAssigneeId}`] : []}
                        onChange={(userIds) => setNewItemAssigneeId(userIds.length > 0 ? userIds[0].replace('user:', '') : null)}
                        variant="compact"
                        trigger={
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking
                            >
                                <UserPlus className="h-3.5 w-3.5 text-zinc-400" />
                            </Button>
                        }
                    />
                    {showCancelButton && (
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-zinc-400 hover:text-zinc-600"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                setText('');
                                setNewItemAssigneeId(null);
                                setIsEditing(false);
                                onCancelAdd?.();
                            }}
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
            );
        }

        return (
            <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 py-1.5 px-2 hover:bg-zinc-50 rounded group w-full text-left transition-colors add-item-trigger"
            >
                <Plus className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                <span className="text-sm text-zinc-400 group-hover:text-zinc-600 transition-colors">
                    Add item
                </span>
                <div className="ml-auto">
                    <UserPlus className="h-3.5 w-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </button>
        );
    }

    if (!item) return null;

    return (
        <div
            className="flex items-center gap-2 py-1.5 px-2 hover:bg-zinc-50 rounded group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Drag Handle */}
            <div
                {...(dragHandleListeners ?? {})}
                {...(dragHandleAttributes ?? {})}
                className="cursor-grab active:cursor-grabbing touch-none shrink-0"
            >
                <GripVertical className={cn(
                    "h-3.5 w-3.5 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity",
                    isHovered && "opacity-100"
                )} />
            </div>

            {/* Checkbox */}
            <button
                onClick={() => toggleItem.mutate({ id: item.id })}
                className="flex-shrink-0"
            >
                <div className={cn(
                    "h-4 w-4 rounded border transition-all flex items-center justify-center",
                    item.isCompleted
                        ? "bg-blue-500 border-blue-500"
                        : "border-zinc-300 hover:border-zinc-400"
                )}>
                    {item.isCompleted && (
                        <CheckCircle2 className="h-3 w-3 text-white" />
                    )}
                </div>
            </button>

            {/* Item Text */}
            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <Input
                        ref={inputRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleSave}
                        variant="ghost"
                        className="h-7 text-sm bg-transparent border-0 outline-none focus:outline-none px-0"
                        autoFocus
                    />
                ) : (
                    <button
                        onClick={() => {
                            setIsEditing(true);
                            setText(item.name || item.text || '');
                        }}
                        className={cn(
                            "text-sm text-left w-full truncate hover:text-zinc-700 transition-colors",
                            item.isCompleted && "line-through text-zinc-400"
                        )}
                    >
                        {item.name || item.text || ''}
                    </button>
                )}
            </div>

            {/* Item Actions */}
            <div className={cn(
                "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                isHovered && "opacity-100"
            )}>
                {/* Assignee Display/Selector */}
                <AssigneeSelector
                    users={workspaceMembers}
                    workspaceId={item.workspaceId || ''}
                    value={item.assignee ? [`user:${item.assignee.id}`] : []}
                    onChange={handleAssign}
                    variant="compact"
                    trigger={
                        <div className="flex items-center gap-1 cursor-pointer hover:bg-zinc-100 rounded px-1 py-0.5 transition-colors">
                            {item.assignee ? (
                                <Avatar className="h-5 w-5 border border-white ring-1 ring-zinc-200">
                                    <AvatarImage src={item.assignee.image} />
                                    <AvatarFallback className="text-[8px] font-bold bg-blue-50 text-blue-600">
                                        {item.assignee.name?.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            ) : (
                                <UserPlus className="h-3.5 w-3.5 text-zinc-400" />
                            )}
                        </div>
                    }
                />

                {/* Item Menu */}
                <DropdownMenu
                    open={openItemMenuId === item.id}
                    onOpenChange={(open) => onItemMenuOpenChange?.(open ? item.id : null)}
                >
                    <DropdownMenuTrigger asChild>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                        >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => { onAddBelow?.(item.id); onItemMenuOpenChange?.(null); }}>
                            <Plus className="h-3.5 w-3.5 mr-2" />
                            Add item
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                            <Edit2 className="h-3.5 w-3.5 mr-2" />
                            Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAssign([])}>
                            <UserPlus className="h-3.5 w-3.5 mr-2" />
                            Assign to
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => deleteItem.mutate({ id: item.id })}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

export function ChecklistsSection({ taskId, workspaceMembers = [] }: ChecklistsSectionProps) {
    const [editingChecklistId, setEditingChecklistId] = React.useState<string | null>(null);
    const [editingName, setEditingName] = React.useState('');
    const [openItemMenuId, setOpenItemMenuId] = React.useState<string | null>(null);
    const [insertNewAfterItemId, setInsertNewAfterItemId] = React.useState<string | null>(null);

    const utils = trpc.useUtils();
    const { data: session } = trpc.user.me.useQuery();

    // Fetch task with checklists
    const { data: task } = trpc.task.get.useQuery({ id: taskId });
    const checklists = React.useMemo(() => task?.checklists ?? [], [task?.checklists]);

    // Mutations
    const createChecklist = trpc.task.checklists.create.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
            toast.success('Checklist created');
        }
    });

    const updateChecklist = trpc.task.checklists.update.useMutation({
        onMutate: async (input) => {
            await utils.task.get.cancel({ id: taskId });
            const prev = utils.task.get.getData({ id: taskId });
            if (prev?.checklists) {
                utils.task.get.setData({ id: taskId }, {
                    ...prev,
                    checklists: prev.checklists.map((c: any) =>
                        c.id === input.id ? { ...c, name: input.name ?? c.name } : c
                    ),
                });
            }
            setEditingChecklistId(null);
            return { prev };
        },
        onError: (_err, _input, ctx) => {
            if (ctx?.prev) utils.task.get.setData({ id: taskId }, ctx.prev);
        },
        onSettled: () => {
            utils.task.get.invalidate({ id: taskId });
        },
        onSuccess: () => {
            toast.success('Checklist updated');
        }
    });

    const deleteChecklist = trpc.task.checklists.delete.useMutation({
        onMutate: async (input) => {
            await utils.task.get.cancel({ id: taskId });
            const prev = utils.task.get.getData({ id: taskId });
            if (prev?.checklists) {
                utils.task.get.setData({ id: taskId }, {
                    ...prev,
                    checklists: prev.checklists.filter((c: any) => c.id !== input.id),
                });
            }
            return { prev };
        },
        onError: (_err, _input, ctx) => {
            if (ctx?.prev) utils.task.get.setData({ id: taskId }, ctx.prev);
        },
        onSettled: () => utils.task.get.invalidate({ id: taskId }),
        onSuccess: () => toast.success('Checklist deleted'),
    });

    const checkAllItems = trpc.task.checklists.checkAll.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
            toast.success('All items checked');
        }
    });

    const uncheckAllItems = trpc.task.checklists.uncheckAll.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
            toast.success('All items unchecked');
        }
    });

    const assignAllItems = trpc.task.checklists.assignAll.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
            toast.success('All items assigned');
        }
    });

    const unassignAllItems = trpc.task.checklists.unassignAll.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
            toast.success('All items unassigned');
        }
    });

    const moveChecklistUp = trpc.task.checklists.moveUp.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
        }
    });

    const moveChecklistDown = trpc.task.checklists.moveDown.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
        }
    });

    const reorderItems = trpc.task.checklists.items.reorder.useMutation({
        onMutate: async (input) => {
            await utils.task.get.cancel({ id: taskId });
            const prev = utils.task.get.getData({ id: taskId });
            if (prev?.checklists) {
                const checklist = prev.checklists.find((c: any) => c.id === input.checklistId);
                if (checklist?.items) {
                    const idToItem = new Map(checklist.items.map((i: any) => [i.id, i]));
                    const reordered = input.itemIds.map((id) => idToItem.get(id)).filter(Boolean);
                    utils.task.get.setData({ id: taskId }, {
                        ...prev,
                        checklists: prev.checklists.map((c: any) =>
                            c.id !== input.checklistId ? c : { ...c, items: reordered }
                        ),
                    });
                }
            }
            return { prev };
        },
        onError: (_err, _input, ctx) => {
            if (ctx?.prev) utils.task.get.setData({ id: taskId }, ctx.prev);
        },
        onSettled: () => utils.task.get.invalidate({ id: taskId }),
    });

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleCreateChecklist = () => {
        createChecklist.mutate({
            taskId,
            name: 'Checklist',
        });
    };

    const handleUpdateChecklist = (id: string) => {
        if (!editingName.trim()) return;
        const name = editingName.trim();
        updateChecklist.mutate({
            id,
            name,
        });
    };

    const handleStartEdit = (checklist: any) => {
        setEditingChecklistId(checklist.id);
        setEditingName(checklist.name);
    };

    const calculateProgress = (checklist: any) => {
        if (!checklist.items || checklist.items.length === 0) return 0;
        const completed = checklist.items.filter((item: any) => item.isCompleted).length;
        return (completed / checklist.items.length) * 100;
    };

    const overallCounts = React.useMemo(() => {
        const allItems = (checklists || []).flatMap((cl: any) => cl.items || []);
        const total = allItems.length;
        const completed = allItems.filter((i: any) => i.isCompleted).length;
        const progress = total === 0 ? 0 : (completed / total) * 100;
        return { total, completed, progress };
    }, [checklists]);

    const assignedToMeCount = React.useMemo(() => {
        if (!session?.id) return 0;
        const allItems = (checklists || []).flatMap((cl: any) => cl.items || []);
        return allItems.filter((i: any) => i.assigneeId === session.id || i.assignee?.id === session.id).length;
    }, [checklists, session?.id]);

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm font-semibold text-zinc-900">Checklists</span>
                    {overallCounts.total > 0 && (
                        <div className="flex items-center min-w-[80px] pl-2">
                            <Progress
                                value={overallCounts.progress}
                                className="h-1.5 flex-1"
                            />
                        </div>
                    )}
                    {overallCounts.total > 0 && (
                        <span className="text-xs text-zinc-500">
                            {overallCounts.completed}/{overallCounts.total}
                        </span>
                    )}
                    {assignedToMeCount > 0 && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                            {assignedToMeCount} Assigned to me
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 hover:bg-zinc-100"
                        onClick={handleCreateChecklist}
                        type="button"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Checklists List */}
            <div className="space-y-3">
                {checklists.map((checklist: any) => {
                    const progress = calculateProgress(checklist);
                    const completedCount = checklist.items?.filter((item: any) => item.isCompleted).length || 0;
                    const totalCount = checklist.items?.length || 0;

                    return (
                        <div
                            key={checklist.id}
                            data-checklist-id={checklist.id}
                            className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-sm"
                        >
                            {/* Checklist Header */}
                            <div className="px-3 py-2 bg-zinc-50/50 border-b border-zinc-200">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className="inline-flex items-center gap-2 min-w-0 flex-1">
                                            {editingChecklistId === checklist.id ? (
                                                <AutoSizeInput
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    className="flex h-6 text-sm font-medium bg-transparent border-0 outline-none focus:outline-none px-1 -ml-1"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleUpdateChecklist(checklist.id);
                                                        if (e.key === 'Escape') setEditingChecklistId(null);
                                                    }}
                                                    onBlur={() => handleUpdateChecklist(checklist.id)}
                                                />
                                            ) : (
                                                <button
                                                    className="text-sm font-semibold text-zinc-900 cursor-text hover:text-zinc-700 truncate text-left transition-colors"
                                                    onClick={() => handleStartEdit(checklist)}
                                                >
                                                    {checklist.name || 'Checklist'}
                                                </button>
                                            )}
                                            <span className="text-xs text-zinc-500">
                                                {completedCount} of {totalCount}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-6 w-6 hover:bg-zinc-200"
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-52">
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        // Focus on the add item input
                                                        const addItemButton = document.querySelector(`[data-checklist-id="${checklist.id}"] .add-item-trigger`) as HTMLElement;
                                                        if (addItemButton) addItemButton.click();
                                                    }}
                                                >
                                                    <Plus className="h-3.5 w-3.5 mr-2" />
                                                    Add item
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleStartEdit(checklist)}>
                                                    <Edit2 className="h-3.5 w-3.5 mr-2" />
                                                    Rename checklist
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => assignAllItems.mutate({ id: checklist.id, assigneeIds: [] })}>
                                                    <UserPlus className="h-3.5 w-3.5 mr-2" />
                                                    Assign all to...
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => unassignAllItems.mutate({ id: checklist.id })}>
                                                    <XCircle className="h-3.5 w-3.5 mr-2" />
                                                    Unassign all
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => checkAllItems.mutate({ id: checklist.id })}>
                                                    <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                                                    Check all
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => uncheckAllItems.mutate({ id: checklist.id })}>
                                                    <XCircle className="h-3.5 w-3.5 mr-2" />
                                                    Uncheck all
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => moveChecklistUp.mutate({ id: checklist.id })}>
                                                    <ArrowUp className="h-3.5 w-3.5 mr-2" />
                                                    Move up
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => moveChecklistDown.mutate({ id: checklist.id })}>
                                                    <ArrowDown className="h-3.5 w-3.5 mr-2" />
                                                    Move down
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => deleteChecklist.mutate({ id: checklist.id })}
                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                    Delete checklist
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                {totalCount > 0 && (
                                    <div className="mt-2 ml-6">
                                        <Progress
                                            value={progress}
                                            className={cn(
                                                "h-1 bg-zinc-200",
                                                progress === 100 && "[&>div]:bg-green-500"
                                            )}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Checklist Items */}
                            <div className="p-2">
                                {checklist.items && checklist.items.length > 0 && (
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={(event: DragEndEvent) => {
                                            const { active, over } = event;
                                            if (!over || active.id === over.id) return;
                                            const items = checklist.items as any[];
                                            const oldIndex = items.findIndex((i: any) => i.id === active.id);
                                            const newIndex = items.findIndex((i: any) => i.id === over.id);
                                            if (oldIndex === -1 || newIndex === -1) return;
                                            const reordered = arrayMove(items, oldIndex, newIndex);
                                            reorderItems.mutate({
                                                checklistId: checklist.id,
                                                itemIds: reordered.map((i: any) => i.id),
                                            });
                                        }}
                                    >
                                        <SortableContext
                                            items={checklist.items.map((i: any) => i.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="space-y-0.5 mb-1">
                                                {checklist.items.map((item: any) => (
                                                    <React.Fragment key={item.id}>
                                                        <SortableChecklistItem
                                                            item={item}
                                                            checklistId={checklist.id}
                                                            taskId={taskId}
                                                            workspaceMembers={workspaceMembers}
                                                            openItemMenuId={openItemMenuId}
                                                            onItemMenuOpenChange={setOpenItemMenuId}
                                                            onAddBelow={() => setInsertNewAfterItemId(item.id)}
                                                        />
                                                        {insertNewAfterItemId === item.id && (
                                                            <ChecklistItemComponent
                                                                checklistId={checklist.id}
                                                                taskId={taskId}
                                                                workspaceMembers={workspaceMembers}
                                                                isNew
                                                                showCancelButton
                                                                onCancelAdd={() => setInsertNewAfterItemId(null)}
                                                            />
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                )}

                                {/* Add Item (at bottom, when not inserting after a specific item) */}
                                {!insertNewAfterItemId && (
                                    <ChecklistItemComponent
                                        checklistId={checklist.id}
                                        taskId={taskId}
                                        workspaceMembers={workspaceMembers}
                                        isNew
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <button
                onClick={handleCreateChecklist}
                className="flex items-center gap-2 py-2 px-3 text-sm text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 rounded transition-colors"
            >
                <Plus className="h-3.5 w-3.5" />
                Add checklist
            </button>

            {checklists.length === 0 && (
                <div className="text-center py-8 text-sm text-zinc-400 bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
                    No checklists yet. Click + to create one.
                </div>
            )}
        </div>
    );
}
