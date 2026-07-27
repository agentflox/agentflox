"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
    Plus, MoreHorizontal, GripVertical, ChevronRight, ChevronDown, X as XIcon, Target,
    Flag, Clock, User as UserIcon, Calendar as CalendarIcon, Calendar, Tag as TagIcon, Pencil,
    LayoutGrid, List as ListIcon, ArrowUpDown, Search, ArrowUp, ArrowDown, ChevronUp,
    Circle, Users, AlertTriangle, Spline, CheckCircle2, Copy, Trash2, Edit3, MessageSquare, Paperclip, ListChecks, AlignLeft,
    Type, Hash, CheckSquare, LayoutList, Globe, Mail, Phone, DollarSign, FunctionSquare, Link2, TrendingUp, SlidersHorizontal, FileText, Heart, MapPin, Star, PenTool, MousePointer,
    CircleMinus, Link, Slash, Maximize2, Minimize2, Check, CircleSlash, PlusCircle, ArrowRight, CopyPlus, Tag, X, ListTree, CircleDot, CircleDashed,
    Play, PenOff
} from 'lucide-react';
import { generateKeyBetween } from "fractional-indexing";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { TaskActionsPopover } from './TaskActionsPopover';
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DestinationPicker } from './DestinationPicker';
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { TaskCalendar } from './TaskCalendar';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AssigneeSelector } from './AssigneeSelector';
import { TagsPopover } from './TagsPopover';
import { TagEditorPopover } from './TagEditorPopover';
import { TaskDependenciesModal } from './TaskDependenciesModal';
import { TaskStatusPopover } from './TaskStatusPopover';
import { TaskTypeIcon } from './TaskTypeIcon';
import { parseEncodedTag } from "../utils/tags";
import { TaskCommentPopover } from './TaskCommentPopover';
import { TaskTimeTrackedPopover } from './TaskTimeTrackedPopover';
import { TaskDependenciesPopover } from './TaskDependenciesPopover';
import { TaskLinkedTasksPopover } from './TaskLinkedTasksPopover';
import { LinkedDocsCell } from './TaskLinkedDocsPopover';
import { TaskListPopover } from './TaskListPopover';
import { toast } from 'sonner';
import { getCustomFieldValue } from '@/features/dashboard/views/generic/filterUtils';
import {
    Dialog,
    DialogTitle,
    DialogContent,
} from "@/components/ui/dialog";
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    DndContext,
    MouseSensor,
    TouchSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    closestCenter,
    useDraggable,
    useDroppable,
    type DragEndEvent,
    type DragStartEvent,
    type DragOverEvent,
    DragOverlay,
} from '@dnd-kit/core';
import { useSortable, SortableContext, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { CSS } from '@dnd-kit/utilities';
import clsx from "clsx";

const normalizeParentId = (parentId: unknown): string | null => {
    return parentId && String(parentId).trim() !== "" ? String(parentId) : null;
};

const wouldCreateCircularDependency = (
    taskId: string,
    newParentId: string | null,
    taskItems: { id: string; parentId?: unknown }[],
): boolean => {
    if (!newParentId) return false;

    let currentId: string | null = newParentId;
    const visited = new Set<string>();

    while (currentId) {
        if (currentId === taskId) return true;
        if (visited.has(currentId)) return false;
        visited.add(currentId);

        const item = taskItems.find((t) => t.id === currentId);
        currentId = normalizeParentId(item?.parentId);
    }

    return false;
};

const SUBTASK_FIELD_CONFIG: { id: string; label: string; icon: string }[] = [
    { id: 'name', label: 'Task Name', icon: 'Aa' },
    { id: 'assignee', label: 'Assignee', icon: 'person' },
    { id: 'dueDate', label: 'Due date', icon: 'calendar' },
    { id: 'priority', label: 'Priority', icon: 'flag' },
    { id: 'status', label: 'Status', icon: 'circle' },
    { id: 'comments', label: 'Comments', icon: 'message' },
    { id: 'timeTracked', label: 'Time tracked', icon: 'clock' },
    { id: 'dateCreated', label: 'Date created', icon: 'calendar' },
    { id: 'createdBy', label: 'Created by', icon: 'person' },
    { id: 'dateClosed', label: 'Date closed', icon: 'calendar' },
    { id: 'dateDone', label: 'Date done', icon: 'calendar' },
    { id: 'startDate', label: 'Start date', icon: 'calendar' },
    { id: 'dateUpdated', label: 'Date updated', icon: 'calendar' },
    { id: 'tags', label: 'Tags', icon: 'tag' },
    { id: 'taskType', label: 'Task Type', icon: 'box' },
    { id: 'timeline', label: 'Timeline', icon: 'calendar' },
    { id: 'linkedTasks', label: 'Linked tasks', icon: 'link' },
    { id: 'linkedDocs', label: 'Linked docs', icon: 'link' },
    { id: 'dependencies', label: 'Dependencies', icon: 'link' },
    { id: 'taskId', label: 'Task ID', icon: 'hash' },
    { id: 'list', label: 'Lists', icon: 'folder' },
];

function SubtaskFieldIcon({ icon }: { icon: string }) {
    const cls = "h-3.5 w-3.5 text-zinc-400 shrink-0";
    switch (icon) {
        case 'person': return <UserIcon className={cls} />;
        case 'calendar': return <CalendarIcon className={cls} />;
        case 'flag': return <Flag className={cls} />;
        case 'circle': return <Circle className={cls} />;
        case 'clock': return <Clock className={cls} />;
        case 'tag': return <TagIcon className={cls} />;
        case 'box': return <LayoutGrid className={cls} />;
        case 'link': return <Link className={cls} />;
        case 'hash': return <Hash className={cls} />;
        case 'message': return <MessageSquare className={cls} />;
        case 'folder': return <ListIcon className={cls} />;
        case 'Aa': return <span className="text-[10px] font-bold text-zinc-400 shrink-0 leading-none">Aa</span>;
        default: return <SlidersHorizontal className={cls} />;
    }
}

type SortOption = 'name' | 'status' | 'priority' | 'dueDate' | 'manual';

const TAG_COLOR_PALETTE = [
    "#e5e7eb",
    "#fee2e2",
    "#ffedd5",
    "#fef3c7",
    "#dcfce7",
    "#dbeafe",
    "#e0e7ff",
    "#f5d0fe",
    "#fce7f3",
    "#f3e8ff",
    "#e2f3ff",
    "#defbf6",
    "#fef9c3",
    "#fee2f2",
];

function collectAllSubtasks(tasks: any[], parentId: string): any[] {
    const result: any[] = [];
    for (const t of tasks) {
        const task = { ...t, parentId };
        result.push(task);
        if (t.other_tasks?.length) {
            result.push(...collectAllSubtasks(t.other_tasks, t.id));
        }
    }
    return result;
}

function DraggableSubtaskRow({
    id,
    children,
}: {
    id: string;
    children: (params: { setNodeRef: (n: HTMLElement | null) => void; style: React.CSSProperties; attributes: any; listeners: any; isDragging: boolean }) => React.ReactNode;
}) {
    const draggable = useDraggable({ id });
    const droppable = useDroppable({ id });
    const setNodeRef = (node: HTMLElement | null) => {
        draggable.setNodeRef(node);
        droppable.setNodeRef(node);
    };
    const { attributes, listeners, transform, isDragging } = draggable;
    const style: React.CSSProperties = isDragging ? { opacity: 0.5 } : { transform: CSS.Transform.toString(transform), opacity: 1 };
    return <>{children({ setNodeRef, style, attributes, listeners, isDragging })}</>;
}

export function SubtasksTable({
    task,
    subtasks,
    workspaceMembers,
    isAddingSubtask,
    setIsAddingSubtask,
    subtaskTitle,
    setSubtaskTitle,
    handleCreateSubtask,
    updateTask: updateTaskProp,
    utils,
    workspaceId,
}: {
    task: any;
    subtasks: any[];
    workspaceMembers: any[];
    isAddingSubtask: boolean;
    setIsAddingSubtask: (v: boolean) => void;
    subtaskTitle: string;
    setSubtaskTitle: (v: string) => void;
    handleCreateSubtask: () => void;
    updateTask: (payload: any) => void;
    utils: ReturnType<typeof trpc.useUtils>;
    workspaceId?: string;
}) {
    const [viewMode, setViewMode] = React.useState<'table' | 'list'>('table');
    // Use manual sort by default so drag-and-drop ordering is visible
    const [sortBy, setSortBy] = React.useState<SortOption>('manual');
    const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
    const [expandedParents, setExpandedParents] = React.useState<Set<string>>(new Set());
    const [fieldsSearch, setFieldsSearch] = React.useState('');
    const [visibleColumns, setVisibleColumns] = React.useState<Set<string>>(
        new Set(['name', 'assignee', 'priority', 'dueDate', 'timeTracked'])
    );
    const [columnOrder, setColumnOrder] = React.useState<string[]>(['assignee', 'priority', 'dueDate', 'timeTracked']);
    const [dragActiveId, setDragActiveId] = React.useState<string | null>(null);
    const [dragOverId, setDragOverId] = React.useState<string | null>(null);
    const [dropPosition, setDropPosition] = React.useState<'before' | 'after' | null>(null);
    const [isMaximized, setIsMaximized] = React.useState(false);
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    // Refs for batching updates (optimizing backend calls)
    const pendingUpdatesRef = useRef<Map<string, any>>(new Map());
    const batchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Column resizing logic
    const [colWidths, setColWidths] = useState<Record<string, number>>({
        name: 500,
        assignee: 150,
        dueDate: 150,
        priority: 120,
        status: 150,
        dateCreated: 150,
        timeEstimate: 120,
        comments: 100,
        timeTracked: 120,
        pullRequests: 120,
        linkedTasks: 150,
        taskType: 130,
        tags: 150,
        linkedDocs: 150,
        dependencies: 150,
        taskId: 100,
        list: 150,
        createdBy: 150,
        dateClosed: 150,
        dateDone: 150,
        startDate: 150,
        dateUpdated: 150,
        timeline: 180,
    });

    const [resizingCol, setResizingCol] = useState<string | null>(null);
    const resizeStartX = useRef<number>(0);
    const resizeStartWidth = useRef<number>(0);

    const startResize = useCallback((e: React.MouseEvent, colId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setResizingCol(colId);
        resizeStartX.current = e.pageX;
        resizeStartWidth.current = colWidths[colId] || 100;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const handleMouseMove = (mv: MouseEvent) => {
            const delta = mv.pageX - resizeStartX.current;
            setColWidths(prev => ({
                ...prev,
                [colId]: Math.max(80, resizeStartWidth.current + delta)
            }));
        };

        const handleMouseUp = () => {
            setResizingCol(null);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [colWidths]);
    const [inlineAddGroupKey, setInlineAddGroupKey] = React.useState<string | null>(null);
    const [inlineAddTitle, setInlineAddTitle] = React.useState("");
    const [inlineAddParentId, setInlineAddParentId] = React.useState<string | null>(null);
    const [inlineAddAssigneeIds, setInlineAddAssigneeIds] = React.useState<string[]>([]);
    const [inlineAddTaskType, setInlineAddTaskType] = React.useState<string | null>(null);
    const [inlineAddDueDate, setInlineAddDueDate] = React.useState<Date | null>(null);
    const [inlineAddStartDate, setInlineAddStartDate] = React.useState<Date | null>(null);
    const [inlineAddPriority, setInlineAddPriority] = React.useState<"URGENT" | "HIGH" | "NORMAL" | "LOW" | null>(null);
    const [draggingIds, setDraggingIds] = React.useState<string[]>([]);
    const [orderByParent, setOrderByParent] = React.useState<Record<string, string[]>>({});
    const groupBy: string | null = null;
    const [selectedTasks, setSelectedTasks] = React.useState<string[]>([]);

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const openTask = (id: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('task', id);
        router.push(`${pathname}?${params.toString()}`);
    };
    const [renamingTaskId, setRenamingTaskId] = React.useState<string | null>(null);
    const [renameDraft, setRenameDraft] = React.useState("");
    const [dependenciesTask, setDependenciesTask] = React.useState<any | null>(null);
    const [tagColors, setTagColors] = React.useState<Record<string, string>>({});
    const [tagEditorOpen, setTagEditorOpen] = React.useState(false);
    const [tagEditorTaskId, setTagEditorTaskId] = React.useState<string | null>(null);
    const [tagEditorOriginalTag, setTagEditorOriginalTag] = React.useState<string | null>(null); // encoded
    const [tagEditorName, setTagEditorName] = React.useState<string>("");
    const [tagEditorColor, setTagEditorColor] = React.useState<string>("#f3e8ff");
    const [tagEditorTags, setTagEditorTags] = React.useState<string[]>([]); // encoded

    const isExpanded = expandedParents.size > 0;

    const openTagEditor = React.useCallback((subtask: any, encodedTag: string) => {
        const parsed = parseEncodedTag(encodedTag);
        setTagEditorTaskId(subtask.id);
        setTagEditorOriginalTag(encodedTag);
        setTagEditorName(parsed.label);
        setTagEditorColor(parsed.color ?? "#f3e8ff");
        setTagEditorTags(subtask.tags ?? []);
        setTagEditorOpen(true);
    }, []);

    const sensorOptions = { activationConstraint: { distance: 6 } };
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const { data: statuses = [] } = trpc.taskStatus.list.useQuery(
        { workspaceId: workspaceId || '' },
        { enabled: !!workspaceId }
    );

    const deleteTask = trpc.task.delete.useMutation({
        onMutate: async (variables) => {
            await utils.task.get.cancel({ id: task.id });
            const previousTask = utils.task.get.getData({ id: task.id });
            utils.task.get.setData({ id: task.id }, (old: any) => {
                if (!old) return old;
                const removeFromTree = (tasks: any[]): any[] => {
                    return tasks.filter(t => t.id !== variables.id).map(t => ({
                        ...t,
                        other_tasks: t.other_tasks ? removeFromTree(t.other_tasks) : []
                    }));
                };
                return { ...old, other_tasks: removeFromTree(old.other_tasks || []) };
            });
            return { previousTask };
        },
        onError: (_err, _new, context) => {
            if (context?.previousTask) {
                utils.task.get.setData({ id: task.id }, context.previousTask);
            }
        },
        onSettled: () => {
            utils.task.get.invalidate({ id: task.id });
        },
    });

    const updateTaskMutation = trpc.task.update.useMutation({
        onMutate: async (variables) => {
            await utils.task.get.cancel({ id: task.id });
            const previousTask = utils.task.get.getData({ id: task.id });
            utils.task.get.setData({ id: task.id }, (old: any) => {
                if (!old) return old;
                const updateInTree = (tasks: any[]): any[] => {
                    return tasks.map(t => {
                        if (t.id === variables.id) {
                            let updated = { ...t, ...variables };
                            if (variables.statusId !== undefined) {
                                const statusObj = statuses.find(s => s.id === variables.statusId);
                                if (statusObj) updated.status = statusObj;
                            }
                            if (variables.assigneeIds !== undefined) {
                                updated.assignees = (variables.assigneeIds || []).map((aid: string) => {
                                    const uid = aid.replace('user:', '');
                                    const u = workspaceMembers?.find((m: any) => (m.user?.id || m.id) === uid);
                                    return { userId: uid, user: { id: uid, name: u?.user?.name || u?.name, image: u?.user?.image || u?.image } };
                                });
                            }
                            return updated;
                        }
                        if (t.other_tasks) {
                            return { ...t, other_tasks: updateInTree(t.other_tasks) };
                        }
                        return t;
                    });
                };
                return { ...old, other_tasks: updateInTree(old.other_tasks || []) };
            });
            return { previousTask };
        },
        onError: (_err, _new, context) => {
            if (context?.previousTask) {
                utils.task.get.setData({ id: task.id }, context.previousTask);
            }
        },
        onSettled: () => {
            utils.task.get.invalidate({ id: task.id });
        }
    });

    const updateTask = (payload: any) => {
        updateTaskMutation.mutate(payload);
    };

    const createTask = trpc.task.create.useMutation({
        onMutate: async (variables) => {
            await utils.task.get.cancel({ id: task.id });
            const previousTask = utils.task.get.getData({ id: task.id });

            const optimisticTask = {
                ...variables,
                id: `optimistic-${Date.now()}`,
                title: variables.title,
                name: variables.title,
                createdAt: new Date().toISOString(),
                assignees: (variables.assigneeIds || []).map((aid: string) => {
                    const uid = aid.replace('user:', '');
                    const u = workspaceMembers?.find((m: any) => (m.user?.id || m.id) === uid);
                    return { userId: uid, user: { id: uid, name: u?.user?.name || u?.name, image: u?.user?.image || u?.image } };
                }),
                tags: [],
                position: "zzzzzzzz",
                order: "zzzzzzzz"
            };

            utils.task.get.setData({ id: task.id }, (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    other_tasks: [...(old.other_tasks || []), optimisticTask]
                };
            });
            return { previousTask };
        },
        onError: (_err, _new, context) => {
            if (context?.previousTask) {
                utils.task.get.setData({ id: task.id }, context.previousTask);
            }
        },
        onSettled: () => {
            utils.task.get.invalidate({ id: task.id });
            utils.task.list.invalidate();
        },
    });

    const { data: availableTaskTypes = [] } = trpc.task.listTaskTypes.useQuery(
        { workspaceId: workspaceId || undefined },
        { enabled: !!workspaceId }
    );

    const defaultTaskType = availableTaskTypes?.find((t: any) => t.name === "Task" || t.id === "TASK") || availableTaskTypes?.[0];

    useEffect(() => {
        if (availableTaskTypes.length > 0 && !inlineAddTaskType) {
            if (defaultTaskType) {
                setInlineAddTaskType(defaultTaskType.id);
            }
        }
    }, [availableTaskTypes, inlineAddTaskType, defaultTaskType]);

    const inlineRowRef = useRef<HTMLTableRowElement>(null);

    const handleCancelInlineAdd = useCallback((collapseParent = false) => {
        if (collapseParent && inlineAddParentId) {
            setExpandedParents(prev => {
                const next = new Set(prev);
                next.delete(inlineAddParentId);
                return next;
            });
        }
        setInlineAddGroupKey(null);
        setInlineAddParentId(null);
        setInlineAddTitle("");
        setInlineAddAssigneeIds([]);
        setInlineAddTaskType(defaultTaskType?.id || null);
        setInlineAddDueDate(null);
        setInlineAddStartDate(null);
        setInlineAddPriority(null);
    }, [inlineAddParentId]);

    const handleSaveTask = useCallback(async (parentIdOverride?: string | null) => {
        if (!inlineAddTitle.trim() || !workspaceId) return;
        try {
            await createTask.mutateAsync({
                title: inlineAddTitle.trim(),
                listId: task.listId,
                statusId: undefined,
                workspaceId: workspaceId,
                projectId: task.projectId ?? undefined,
                teamId: task.teamId ?? undefined,
                spaceId: task.spaceId ?? undefined,
                channelId: task.channelId ?? undefined,
                parentId: parentIdOverride ?? inlineAddParentId ?? task.id,
                assigneeIds: inlineAddAssigneeIds,
                assigneeId: inlineAddAssigneeIds[0] || undefined,
                startDate: inlineAddStartDate || undefined,
                dueDate: inlineAddDueDate || undefined,
                priority: inlineAddPriority || undefined,
                taskTypeId: inlineAddTaskType || defaultTaskType?.id,
            } as any);
            setInlineAddGroupKey(null);
            setInlineAddParentId(null);
            setInlineAddTitle("");
            setInlineAddAssigneeIds([]);
            setInlineAddTaskType(defaultTaskType?.id || null);
            setInlineAddDueDate(null);
            setInlineAddStartDate(null);
            setInlineAddPriority(null);
        } catch { /* noop */ }
    }, [inlineAddTitle, workspaceId, task.listId, task.id, inlineAddParentId, inlineAddAssigneeIds, inlineAddStartDate, inlineAddDueDate, inlineAddPriority, createTask]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (inlineAddGroupKey && inlineRowRef.current && !inlineRowRef.current.contains(event.target as Node)) {
                // If we're clicking inside a popover or dropdown, don't close
                const target = event.target as HTMLElement;
                if (target.closest('[data-radix-popper-content-wrapper]') || target.closest('.radix-popover-content')) {
                    return;
                }
                handleCancelInlineAdd(true);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [inlineAddGroupKey, handleCancelInlineAdd]);

    const openInlineAdd = (key: string, parentId: string | null) => {
        setInlineAddGroupKey(key);
        setInlineAddParentId(parentId);
        setInlineAddTitle("");
        setInlineAddAssigneeIds([]);
        setInlineAddTaskType(defaultTaskType?.id || null);
        setInlineAddDueDate(null);
        setInlineAddStartDate(null);
        setInlineAddPriority(null);
    };

    const parentId = task?.id ?? '';

    const allSubtasks = React.useMemo(() => {
        return collectAllSubtasks(subtasks || [], parentId);
    }, [subtasks, parentId]);

    const roots = React.useMemo(() => {
        const baseRoots = allSubtasks.filter(t => (t.parentId ?? parentId) === parentId);

        const sorted = [...baseRoots].sort((a, b) => {
            let c = 0;
            if (sortBy === 'manual') c = (a.position || "").localeCompare(b.position || "");
            else if (sortBy === 'name') c = (a.title || '').localeCompare(b.title || '');
            else if (sortBy === 'dueDate') {
                const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
                const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
                c = da - db;
            } else if (sortBy === 'priority') {
                const order: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
                c = (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
            } else if (sortBy === 'status') c = (a.status?.name || '').localeCompare(b.status?.name || '');
            return sortDirection === 'asc' ? c : -c;
        });
        return sorted;
    }, [allSubtasks, parentId, sortBy, sortDirection]);

    const toggleColumn = (col: string) => {
        setVisibleColumns(prev => {
            const next = new Set(prev);
            if (next.has(col)) {
                next.delete(col);
                setColumnOrder(o => o.filter(c => c !== col));
            } else {
                next.add(col);
                setColumnOrder(o => o.includes(col) ? o : [...o, col]);
            }
            return next;
        });
    };

    const formatCustomFieldValue = (value: any, customField: any): string => {
        if (value === null || value === undefined) return '—';
        const fieldType = customField?.type || customField?.config?.fieldType;
        switch (fieldType) {
            case 'TEXT': case 'TEXT_AREA': case 'LONG_TEXT': case 'CUSTOM_TEXT': case 'EMAIL': case 'PHONE': case 'URL':
                return String(value);
            case 'NUMBER': case 'MONEY':
                return typeof value === 'number' ? value.toLocaleString() : String(value);
            case 'DATE':
                try { return format(new Date(value), 'MMM d, yyyy'); } catch { return String(value); }
            case 'CHECKBOX':
                return value ? 'Yes' : 'No';
            case 'DROPDOWN': case 'CUSTOM_DROPDOWN': case 'LABELS':
                if (typeof value === 'string') return value;
                if (Array.isArray(value)) return value.join(', ');
                return String(value);
            default:
                return String(value);
        }
    };

    const toggleParentExpand = (id: string) => {
        setExpandedParents(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const expandAll = () => {
        const parentIds = new Set<string>();
        allSubtasks.forEach(t => {
            const children = allSubtasks.filter(c => c.parentId === t.id);
            if (children.length > 0) parentIds.add(t.id);
        });
        setExpandedParents(parentIds);
    };

    const collapseAll = () => setExpandedParents(new Set());

    const toggleExpandAll = () => {
        if (isExpanded) {
            collapseAll();
        } else {
            expandAll();
        }
    };

    const hasChildren = (t: any) => allSubtasks.some(c => c.parentId === t.id);
    const getChildren = (t: any) => {
        const children = allSubtasks.filter(c => c.parentId === t.id);
        return children;
    };

    const buildRows = (tasks: any[], depth: number): any[] => {
        const rows: any[] = [];
        for (const t of tasks) {
            rows.push({ ...t, depth });
            if (expandedParents.has(t.id)) {
                const children = getChildren(t);
                const sortedChildren = [...children].sort((a, b) => {
                    let c = 0;
                    if (sortBy === 'manual') c = (a.position || "").localeCompare(b.position || "");
                    else if (sortBy === 'name') c = (a.title || '').localeCompare(b.title || '');
                    else if (sortBy === 'dueDate') c = (a.dueDate ? new Date(a.dueDate).getTime() : 0) - (b.dueDate ? new Date(b.dueDate).getTime() : 0);
                    else if (sortBy === 'priority') {
                        const order: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
                        c = (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
                    } else if (sortBy === 'status') c = (a.status?.name || '').localeCompare(b.status?.name || '');
                    return sortDirection === 'asc' ? c : -c;
                });
                rows.push(...buildRows(sortedChildren, depth + 1));
            }
        }
        return rows;
    };

    const renderInlineEditorRow = (opts: {
        parentId: string | null;
        childDepth: number;
        dotColor?: string;
    }) => {
        const { parentId, childDepth, dotColor } = opts;
        const depth = childDepth;

        return (
            <TableRow ref={inlineRowRef} key={`inline:${parentId ?? "root"}`} className="bg-violet-50/30 border-b border-zinc-100">
                <TableCell colSpan={20} className="py-2 bg-violet-50/30">
                    <div className="sticky left-0 w-fit z-10 flex items-center gap-2 min-w-0" style={{ paddingLeft: depth * 16 + 50 }}>
                        <button
                            type="button"
                            className="shrink-0 p-1 rounded opacity-0 pointer-events-none"
                        >
                            <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                        <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={dotColor ? { backgroundColor: dotColor } : { backgroundColor: "#9CA3AF" }}
                        />
                        <Input
                            variant="ghost"
                            className="w-[240px] h-7 text-sm border-0 outline-none focus:outline-none ml-[20px] px-0 cursor-text"
                            placeholder="Task Name"
                            value={inlineAddTitle}
                            onChange={e => setInlineAddTitle(e.target.value)}
                            onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    await handleSaveTask(parentId);
                                } else if (e.key === 'Escape') {
                                    handleCancelInlineAdd(true);
                                }
                            }}
                            autoFocus
                        />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 px-2 text-xs text-zinc-700 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900 rounded-md">
                                    <Circle className="h-3.5 w-3.5 mr-1 text-zinc-500" />
                                    {(() => {
                                        const tt = availableTaskTypes?.find((t: any) => t.id === inlineAddTaskType || t.name === inlineAddTaskType);
                                        if (!tt) {
                                            if (inlineAddTaskType === "TASK") return "Task";
                                            if (inlineAddTaskType === "MILESTONE") return "Milestone";
                                            if (inlineAddTaskType === "FORM_RESPONSE") return "Form Response";
                                            if (inlineAddTaskType === "MEETING_NOTE") return "Meeting Note";
                                            return inlineAddTaskType || "Task";
                                        }
                                        return tt.name;
                                    })()}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56">
                                <DropdownMenuLabel className="text-xs">Create</DropdownMenuLabel>
                                <DropdownMenuRadioGroup value={inlineAddTaskType || undefined} onValueChange={(v) => setInlineAddTaskType(v)}>
                                    {availableTaskTypes?.length > 0 ? (
                                        availableTaskTypes.map((tt: any) => (
                                            <DropdownMenuRadioItem key={tt.id} value={tt.id}>
                                                {tt.name}
                                            </DropdownMenuRadioItem>
                                        ))
                                    ) : (
                                        <>
                                            <DropdownMenuRadioItem value="TASK">Task</DropdownMenuRadioItem>
                                            <DropdownMenuRadioItem value="MILESTONE">Milestone</DropdownMenuRadioItem>
                                            <DropdownMenuRadioItem value="FORM_RESPONSE">Form Response</DropdownMenuRadioItem>
                                            <DropdownMenuRadioItem value="MEETING_NOTE">Meeting Note</DropdownMenuRadioItem>
                                        </>
                                    )}
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <AssigneeSelector
                            users={workspaceMembers}
                            workspaceId={workspaceId ?? ""}
                            variant="compact"
                            value={inlineAddAssigneeIds}
                            onChange={setInlineAddAssigneeIds}
                            trigger={
                                <Button variant="outline" size="icon" className="h-7 w-7 text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900 rounded-md">
                                    <Users className="h-3.5 w-3.5" />
                                </Button>
                            }
                        />

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="icon" className="h-7 w-7 text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900 rounded-md">
                                    <CalendarIcon className="h-3.5 w-3.5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end" sideOffset={8} collisionPadding={10}>
                                <TaskCalendar
                                    startDate={inlineAddStartDate ?? undefined}
                                    endDate={inlineAddDueDate ?? undefined}
                                    onStartDateChange={(d) => setInlineAddStartDate(d ?? null)}
                                    onEndDateChange={(d) => setInlineAddDueDate(d ?? null)}
                                />
                            </PopoverContent>
                        </Popover>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-auto border-zinc-200 hover:bg-zinc-50 focus:ring-0 px-2.5 rounded-md text-xs font-medium transition-all text-zinc-700"
                                >
                                    <div className="flex items-center gap-1.5 w-full">
                                        <div className={cn("flex items-center gap-1.5",
                                            inlineAddPriority === 'URGENT' ? "text-red-500" :
                                                inlineAddPriority === 'HIGH' ? "text-orange-500" :
                                                    inlineAddPriority === 'NORMAL' ? "text-blue-500" :
                                                        inlineAddPriority === 'LOW' ? "text-zinc-400" : "text-zinc-400"
                                        )}>
                                            <Flag className="h-3 w-3 fill-current" />
                                        </div>
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48 z-[200]">
                                <DropdownMenuLabel className="text-xs">Priority</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setInlineAddPriority("URGENT")}>
                                    <Flag className="h-3 w-3 mr-2 text-red-600 fill-current" /> Urgent
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setInlineAddPriority("HIGH")}>
                                    <Flag className="h-3 w-3 mr-2 text-orange-600 fill-current" /> High
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setInlineAddPriority("NORMAL")}>
                                    <Flag className="h-3 w-3 mr-2 text-blue-600 fill-current" /> Normal
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setInlineAddPriority("LOW")}>
                                    <Flag className="h-3 w-3 mr-2 text-slate-600 fill-current" /> Low
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setInlineAddPriority(null)}>
                                    <CircleSlash className="h-3 w-3 mr-2 text-slate-500" />Clear
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="flex items-center gap-1 ml-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-zinc-600 rounded-md hover:bg-zinc-100 px-3 border border-zinc-200"
                                onClick={() => handleCancelInlineAdd(true)}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                className="h-7 text-xs bg-zinc-900 hover:bg-zinc-800 text-white rounded-md px-4"
                                onClick={() => handleSaveTask(parentId)}
                                disabled={!inlineAddTitle.trim() || !workspaceId || createTask.isPending}
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                </TableCell>
            </TableRow>
        );
    };

    const displayRows = buildRows(roots, 0);
    const completedCount = allSubtasks.filter(t => t.status?.name === 'Done').length;

    const handleDragStart = (e: DragStartEvent) => {
        const activeId = String(e.active.id);
        const multi = selectedTasks.includes(activeId) ? selectedTasks : [activeId];
        setDraggingIds(multi);
        setDragActiveId(activeId);
        setDragOverId(null);
        setDropPosition(null);
    };

    const handleDragOver = (e: DragOverEvent) => {
        const overId = e.over?.id ? String(e.over.id) : null;
        setDragOverId(overId);
        const overRect = e.over?.rect;
        const activeRect = e.active?.rect.current.translated;
        if (overId && overRect && activeRect) {
            const activeCenterY = activeRect.top + activeRect.height / 2;
            const overMidY = overRect.top + overRect.height / 2;
            setDropPosition(activeCenterY < overMidY ? 'before' : 'after');
        } else setDropPosition(null);
    };

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over, delta } = event;

        // ✅ Capture state values BEFORE clearing them
        const capturedDraggingIds = [...draggingIds];
        const capturedDropPosition = dropPosition;
        const capturedOrderByParent = { ...orderByParent };

        // Clear drag state immediately
        setDragOverId(null);
        setDragActiveId(null);
        setDraggingIds([]);
        setDropPosition(null);

        // Early returns
        if (!over || active.id === over.id) {
            console.log('⏹️ Early exit: no over or same element');
            return;
        }

        const activeId = String(active.id);
        const overId = String(over.id);
        const activeTask = allSubtasks.find(t => t.id === activeId);
        const overTask = allSubtasks.find(t => t.id === overId);

        if (!activeTask || !overTask) {
            console.warn('⚠️ Task not found', { activeId, overId });
            return;
        }

        // ✅ Use captured values instead of state
        const idsToMove = capturedDraggingIds.length ? capturedDraggingIds : [activeId];
        const rootKey = "root";

        // Determine parent based on horizontal drag
        let newParent: string | null = normalizeParentId(activeTask.parentId);
        let insertPosition: "before" | "after" | "child" = "after";

        const dragRightThreshold = 15;
        const dragLeftThreshold = -10;
        const isDraggingChildLeft = activeTask.parentId && !overTask.parentId && delta.x < 0;
        const isDraggingChildToParentLevel =
            activeTask.parentId &&
            overTask.parentId &&
            normalizeParentId(activeTask.parentId) !== normalizeParentId(overTask.parentId) &&
            delta.x < 0;

        // Determine new parent and insert position
        if (delta.x > dragRightThreshold && capturedDropPosition !== "before") {
            newParent = overTask.id;
            insertPosition = "child";
        } else if (delta.x < dragLeftThreshold || isDraggingChildLeft || isDraggingChildToParentLevel) {
            newParent = normalizeParentId(overTask.parentId);
            insertPosition = capturedDropPosition === "before" ? "before" : "after";
        } else {
            newParent = normalizeParentId(overTask.parentId);
            insertPosition = capturedDropPosition === "before" ? "before" : "after";
        }

        // ✅ Validate: Prevent circular dependencies
        for (const id of idsToMove) {
            if (wouldCreateCircularDependency(id, newParent, allSubtasks)) {
                console.warn('🔄 Circular dependency detected, aborting', { id, newParent });
                return;
            }
        }

        const newParentKey = newParent ?? rootKey;
        const activeParentKey = normalizeParentId(activeTask.parentId) ?? rootKey;

        // Track original bucket for change detection
        let originalBucket: string[] = [];
        let hasOrderChanged = false;

        // Adjust insert position if dragging within same parent
        if (newParentKey === activeParentKey) {
            const currentBucket = capturedOrderByParent[newParentKey] ??
                allSubtasks
                    .filter(t => (normalizeParentId(t.parentId) ?? rootKey) === newParentKey)
                    .map(t => t.id);

            originalBucket = [...currentBucket];
            const fromIndex = currentBucket.indexOf(activeId);
            const toIndex = currentBucket.indexOf(overId);

            if (fromIndex > toIndex && insertPosition === "after") {
                insertPosition = "before";
            }
        }

        // Compute the new bucket order
        const nextOrderByParent: Record<string, string[]> = { ...capturedOrderByParent };

        // Remove tasks from old buckets
        idsToMove.forEach(id => {
            const t = allSubtasks.find(task => task.id === id);
            if (!t) return;

            const oldKey = normalizeParentId(t.parentId) ?? rootKey;
            const oldBucket = nextOrderByParent[oldKey] ?? [];
            nextOrderByParent[oldKey] = oldBucket.filter(x => x !== id);
        });

        // Initialize new bucket if needed
        if (!nextOrderByParent[newParentKey] || nextOrderByParent[newParentKey].length === 0) {
            const tasksInBucket = allSubtasks.filter(t => {
                const taskParentKey = normalizeParentId(t.parentId) ?? rootKey;
                return taskParentKey === newParentKey && !idsToMove.includes(t.id);
            });
            nextOrderByParent[newParentKey] = tasksInBucket.map(t => t.id);
        }

        const bucket = nextOrderByParent[newParentKey];

        // Calculate insert position
        let insertAt: number;
        if (insertPosition === "child") {
            insertAt = bucket.length;
        } else {
            const overIndex = bucket.indexOf(overId);
            if (overIndex === -1) {
                insertAt = bucket.length;
            } else {
                insertAt = insertPosition === "before" ? overIndex : overIndex + 1;
            }
        }

        // Insert tasks at calculated position
        const moving = [...idsToMove];
        nextOrderByParent[newParentKey] = [
            ...bucket.slice(0, insertAt),
            ...moving,
            ...bucket.slice(insertAt),
        ];

        const newOrderForParent = nextOrderByParent[newParentKey];

        // Check if order actually changed
        if (originalBucket.length > 0 && originalBucket.join(',') !== newOrderForParent.join(',')) {
            hasOrderChanged = true;
        }

        // 🔥 FIX: If order changed in bucket, regenerate ALL positions for that bucket
        const payloads: any[] = [];

        if (hasOrderChanged && newParentKey === activeParentKey) {

            // Regenerate positions for entire bucket to match visual order
            let prevPos: string | null = null;

            newOrderForParent.forEach((taskId, index) => {
                const task = allSubtasks.find(t => t.id === taskId);
                if (!task) return;

                const nextPos = index < newOrderForParent.length - 1 ? null : null; // Always generate after previous
                const newPosition = generateKeyBetween(prevPos, null);
                prevPos = newPosition;

                if (task.position !== newPosition) {
                    console.log(`  🔢 ${taskId.substring(0, 8)}: "${task.position}" → "${newPosition}"`);

                    const updatePayload: any = { id: taskId, position: newPosition };

                    // Update grouping fields if this is the moved task
                    if (idsToMove.includes(taskId)) {
                        const currentParentId = normalizeParentId(task.parentId);
                        const targetParentId = newParent;

                        if (currentParentId !== targetParentId) {
                            updatePayload.parentId = targetParentId;
                        }

                        if (groupBy === "priority" && task.priority !== overTask.priority) {
                            updatePayload.priority = overTask.priority ?? null;
                        } else if (groupBy === "status" && task.statusId !== overTask.statusId) {
                            updatePayload.statusId = overTask.statusId ?? null;
                        } else if (groupBy === "list") {
                            const targetListId = (overTask.list as any)?.id ?? (overTask as any).listId ?? null;
                            const currentListId = (task as any).listId ?? null;

                            if (currentListId !== targetListId) {
                                updatePayload.listId = targetListId;
                            }
                        }
                    }

                    payloads.push(updatePayload);
                }
            });
        } else {
            // Original logic for position calculation
            const prevId = insertAt > 0 ? newOrderForParent[insertAt - 1] : null;
            const nextId = insertAt + moving.length < newOrderForParent.length
                ? newOrderForParent[insertAt + moving.length]
                : null;

            const prevTask = prevId ? allSubtasks.find(t => t.id === prevId) : null;
            const nextTask = nextId ? allSubtasks.find(t => t.id === nextId) : null;

            let lastPos = prevTask?.position ?? null;
            const nextPos = nextTask?.position ?? null;

            idsToMove.forEach((id, idx) => {
                const task = allSubtasks.find(t => t.id === id);
                if (!task) return;

                const effectiveNextPos = (lastPos && nextPos && lastPos >= nextPos) ? null : nextPos;
                const newPosition = generateKeyBetween(lastPos, effectiveNextPos);
                lastPos = newPosition;

                const updatePayload: any = { id };
                let changed = false;

                if (task.position !== newPosition) {
                    updatePayload.position = newPosition;
                    changed = true;
                }

                const currentParentId = normalizeParentId(task.parentId);
                const targetParentId = newParent;

                if (currentParentId !== targetParentId) {
                    updatePayload.parentId = targetParentId;
                    changed = true;
                }

                if (groupBy === "priority" && task.priority !== overTask.priority) {
                    updatePayload.priority = overTask.priority ?? null;
                    changed = true;
                } else if (groupBy === "status" && task.statusId !== overTask.statusId) {
                    updatePayload.statusId = overTask.statusId ?? null;
                    changed = true;
                } else if (groupBy === "list") {
                    const targetListId = (overTask.list as any)?.id ?? (overTask as any).listId ?? null;
                    const currentListId = (task as any).listId ?? null;

                    if (currentListId !== targetListId) {
                        updatePayload.listId = targetListId;
                        changed = true;
                    }
                }

                if (changed) {
                    payloads.push(updatePayload);
                }
            });
        }

        // If no changes needed, exit early
        if (payloads.length === 0) {
            console.log('⏹️ No changes needed - exiting');
            return;
        }

        setOrderByParent(nextOrderByParent);

        payloads.forEach(payload => {
            pendingUpdatesRef.current.set(payload.id, payload);
        });

        if (batchTimeoutRef.current) {
            clearTimeout(batchTimeoutRef.current);
        }

        const taskGetInput = { id: task.id };

        batchTimeoutRef.current = setTimeout(async () => {
            const batchedPayloads = Array.from(pendingUpdatesRef.current.values());
            pendingUpdatesRef.current.clear();

            if (batchedPayloads.length === 0) return;

            try {
                await Promise.all(
                    batchedPayloads.map(payload => updateTaskMutation.mutateAsync(payload))
                );
                await utils.task.get.invalidate(taskGetInput);
            } catch {
                setOrderByParent(capturedOrderByParent);
                await utils.task.get.invalidate(taskGetInput);
            }
        }, 300);

    }, [
        allSubtasks,
        groupBy,
        updateTaskMutation,
        utils,
        task.id,
        draggingIds,
        dropPosition,
        orderByParent,
        setDragOverId,
        setDragActiveId,
        setDraggingIds,
        setDropPosition,
    ]);

    const renderSubtaskRow = (subtask: any, depth: number, index: number) => {
        const childrenCount = allSubtasks.filter(c => c.parentId === subtask.id).length;
        const attachmentCount = (subtask as any)._count?.attachments ?? 0;
        const checklistCount = (subtask as any)._count?.checklists ?? 0;
        const expanded = expandedParents.has(subtask.id);
        const isSelected = selectedTasks.includes(subtask.id);
        const parentKey = `parent:${subtask.id}`;
        const hasDescription =
            typeof subtask.description === "string" &&
            subtask.description.replace(/<[^>]*>/g, "").trim().length > 0;

        const isBeingDraggedOver = dragOverId === subtask.id && dragActiveId && dragActiveId !== subtask.id;
        const showDropLineBefore = isBeingDraggedOver && dropPosition === "before";
        const showDropLineAfter = isBeingDraggedOver && dropPosition === "after";

        return (
            <React.Fragment key={`${subtask.id}-${index}`}>
                <DraggableSubtaskRow id={subtask.id}>
                    {({ setNodeRef, style, attributes, listeners, isDragging }) => (
                        <>
                            {showDropLineBefore && (
                                <TableRow className="h-0 border-none">
                                    <TableCell colSpan={20} className="p-0">
                                        <div
                                            className="flex items-center h-0.5"
                                            style={{ marginLeft: depth * 16 + 96 }}
                                        >
                                            <div className="w-0 h-0 border-y-[4px] border-y-transparent border-l-[7px] border-l-indigo-500" />
                                            <div className="flex-1 h-[2px] rounded bg-indigo-500" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            <TableRow
                                ref={setNodeRef as any}
                                style={style}
                                className={cn(
                                    'group border-none transition-all hover:[&>td]:bg-zinc-50/80',
                                    isSelected && '[&>td]:bg-blue-50/30',
                                    isDragging && '[&>td]:bg-zinc-200/70',
                                    (isBeingDraggedOver && !showDropLineBefore && !showDropLineAfter) && '[&>td]:bg-violet-50/30'
                                )}
                                onClick={() => setSelectedTasks(prev => prev.includes(subtask.id) ? prev.filter(id => id !== subtask.id) : [...prev, subtask.id])}
                            >
                                <TableCell className="py-1 overflow-hidden bg-white transition-colors group-hover:bg-[#fbfbfb]" style={{ width: Math.max(colWidths.name || 200, 200), minWidth: Math.max(colWidths.name || 200, 200), paddingLeft: depth * 16 + 8, position: 'sticky', left: 0, zIndex: 2, boxShadow: '2px 0 4px -1px rgba(0,0,0,0.06)' }}>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="flex items-center gap-1">
                                            <div className={cn(
                                                "flex items-center gap-1 transition-opacity",
                                                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                            )}>
                                                <GripVertical className="h-4 w-4 text-zinc-300 cursor-grab shrink-0" {...attributes} {...listeners} />
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => setSelectedTasks(prev => prev.includes(subtask.id) ? prev.filter(id => id !== subtask.id) : [...prev, subtask.id])}
                                                    className="border-zinc-300 shrink-0 cursor-pointer"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const isExpanded = expandedParents.has(subtask.id);
                                                        const directSubtasks = allSubtasks.filter((c: any) => c.parentId === subtask.id);

                                                        if (!isExpanded && directSubtasks.length === 0) {
                                                            // Expanding a parent with no visible children – open inline add automatically
                                                            openInlineAdd(parentKey, subtask.id);
                                                        } else if (isExpanded && inlineAddGroupKey === parentKey && directSubtasks.length === 0) {
                                                            // Collapsing again – close inline add row if it was auto-opened
                                                            setInlineAddGroupKey(null);
                                                            setInlineAddParentId(null);
                                                        }
                                                        toggleParentExpand(subtask.id);
                                                    }}
                                                    className="shrink-0 p-1 rounded hover:bg-zinc-200/80 cursor-pointer"
                                                    title={expanded ? "Collapse subtasks" : "Expand subtasks"}
                                                >
                                                    <ChevronRight className={cn("h-3.5 w-3.5 text-zinc-500 transition-transform", expanded && "rotate-90")} />
                                                </button>
                                            </div>
                                        </div>
                                        <TooltipProvider>
                                            <Tooltip delayDuration={300}>
                                                <TaskStatusPopover
                                                    task={subtask as any}
                                                    availableStatuses={statuses}
                                                    availableTaskTypes={availableTaskTypes}
                                                    onUpdateTask={(id, data) => updateTask({ id, ...data } as any)}
                                                >
                                                    <TooltipTrigger asChild>
                                                        <button className="shrink-0 flex items-center justify-center h-6 w-6 rounded transition-all duration-150 cursor-pointer hover:bg-zinc-200/80 outline-none focus:outline-none" onClick={(e) => e.stopPropagation()}>
                                                            {(() => {
                                                                const tt = subtask.taskType || availableTaskTypes?.find((t: any) => t.isDefault) || availableTaskTypes?.[0];
                                                                const isDefault = !tt || tt.name?.toLowerCase() === "task" || tt.isDefault || tt === 'TASK';
                                                                const statusName = subtask.status?.name?.toLowerCase() || "";
                                                                const statusColor = subtask.status?.color || (statusName.includes("done") || statusName.includes("complete") ? "#10B981" : statusName.includes("progress") || statusName.includes("doing") ? "#3B82F6" : "#94A3B8");

                                                                if (isDefault) {
                                                                    if (statusName.includes("done") || statusName.includes("complete")) return <CheckCircle2 className="h-4 w-4" style={{ color: statusColor }} />;
                                                                    if (statusName.includes("progress") || statusName.includes("doing")) return <CircleDot className="h-4 w-4" style={{ color: statusColor }} />;
                                                                    return <CircleDashed className="h-4 w-4" style={{ color: statusColor }} />;
                                                                }

                                                                const resolvedTt = typeof tt === 'string' ? availableTaskTypes?.find((t: any) => t.id === tt || t.name === tt) || tt : tt;
                                                                return <TaskTypeIcon type={resolvedTt} className="h-4 w-4" size={16} color={statusColor} />;
                                                            })()}
                                                        </button>
                                                    </TooltipTrigger>
                                                </TaskStatusPopover>
                                                <TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>
                                                    <span style={{ color: subtask.status?.color || '#fff' }}>{subtask.status?.name?.toUpperCase() || "NO STATUS"}</span>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        {renamingTaskId === subtask.id ? (
                                            <Input
                                                value={renameDraft}
                                                onChange={(e) => setRenameDraft(e.target.value)}
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()}
                                                onKeyDown={async (e) => {
                                                    if (e.key === "Enter") {
                                                        const trimmed = renameDraft.trim();
                                                        if (trimmed && trimmed !== subtask.title) {
                                                            updateTask({ id: subtask.id, title: trimmed });
                                                        }
                                                        setRenamingTaskId(null);
                                                    } else if (e.key === "Escape") {
                                                        setRenamingTaskId(null);
                                                    }
                                                }}
                                                onBlur={() => {
                                                    const trimmed = renameDraft.trim();
                                                    if (trimmed && trimmed !== subtask.title) {
                                                        updateTask({ id: subtask.id, title: trimmed });
                                                    }
                                                    setRenamingTaskId(null);
                                                }}
                                                className="h-7 px-2 py-1 text-sm border-zinc-200 focus:border-indigo-500"
                                            />
                                        ) : (
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openTask(subtask.id);
                                                }}
                                                className="font-medium text-sm text-zinc-900 cursor-pointer hover:text-indigo-600 transition-colors truncate flex items-center gap-1.5"
                                            >
                                                <span className="truncate">{subtask.title}</span>
                                            </span>
                                        )}

                                        {childrenCount > 0 && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="flex items-center gap-0.5 text-[10px] text-zinc-400 hover:text-zinc-600 cursor-pointer"
                                                        onClick={(e) => { e.stopPropagation(); toggleParentExpand(subtask.id); }}
                                                    >
                                                        <Spline className="h-3 w-3 scale-y-[-1]" />
                                                        <span>{childrenCount}</span>
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="text-xs">
                                                        {(() => {
                                                            const direct = allSubtasks.filter((c: any) => c.parentId === subtask.id);
                                                            const map = new Map<string, number>();
                                                            direct.forEach((st: any) => {
                                                                const name = (st.status?.name || "No Status").toUpperCase();
                                                                map.set(name, (map.get(name) ?? 0) + 1);
                                                            });
                                                            return Array.from(map.entries())
                                                                .map(([name, count]) => `${count} ${name}`)
                                                                .join(", ") || `${childrenCount} subtasks`;
                                                        })()}
                                                    </p>
                                                </TooltipContent>
                                            </Tooltip>
                                        )}

                                        {hasDescription && (
                                            <HoverCard openDelay={250} closeDelay={100}>
                                                <HoverCardTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="p-0.5 rounded hover:bg-zinc-200/80 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                                                    >
                                                        <AlignLeft className="h-3.5 w-3.5" />
                                                    </button>
                                                </HoverCardTrigger>
                                                <HoverCardContent className="w-[420px] max-w-[min(520px,calc(100vw-2rem))] p-4" align="start">
                                                    <h3 className="text-sm font-semibold mb-2">Goal</h3>
                                                    <div
                                                        className="prose prose-sm max-w-none text-zinc-700 [&_a]:text-blue-600 [&_a]:underline"
                                                        dangerouslySetInnerHTML={{ __html: subtask.description }}
                                                    />
                                                </HoverCardContent>
                                            </HoverCard>
                                        )}

                                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                            {attachmentCount > 0 && (
                                                <button
                                                    type="button"
                                                    className="flex items-center gap-0.5 text-zinc-400 text-xs hover:text-zinc-700 cursor-pointer"
                                                >
                                                    <Paperclip className="h-3 w-3" />
                                                </button>
                                            )}
                                            {checklistCount > 0 && (
                                                <button
                                                    type="button"
                                                    className="flex items-center gap-0.5 text-zinc-400 text-xs hover:text-zinc-700 cursor-pointer"
                                                >
                                                    <ListChecks className="h-3 w-3" />
                                                    <span>0/{checklistCount}</span>
                                                </button>
                                            )}
                                            {((subtask as any)._count?.dependencies ?? 0) > 0 && (
                                                <button
                                                    type="button"
                                                    className="p-0.5 rounded hover:bg-zinc-200/80 cursor-pointer"
                                                    onClick={(e) => { e.stopPropagation(); setDependenciesTask(subtask); }}
                                                >
                                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                                </button>
                                            )}
                                            {((subtask as any)._count?.blockedDependencies ?? 0) > 0 && (
                                                <button
                                                    type="button"
                                                    className="p-0.5 rounded hover:bg-zinc-200/80 cursor-pointer"
                                                    onClick={(e) => { e.stopPropagation(); setDependenciesTask(subtask); }}
                                                >
                                                    <CircleMinus className="h-3.5 w-3.5 text-red-500" />
                                                </button>
                                            )}
                                            {((subtask as any)._count?.linkedTasks ?? 0) > 0 && (
                                                <button
                                                    type="button"
                                                    className="p-0.5 rounded hover:bg-zinc-200/80 cursor-pointer"
                                                    onClick={(e) => { e.stopPropagation(); setDependenciesTask(subtask); }}
                                                >
                                                    <Link className="h-3.5 w-3.5 text-blue-500" />
                                                </button>
                                            )}
                                            {(subtask.tags?.length ?? 0) > 0 && (
                                                <div className="flex items-center gap-1 ml-1">
                                                    {subtask.tags!.slice(0, 2).map((encoded: string) => {
                                                        const parsed = parseEncodedTag(encoded);
                                                        const bg = parsed.color ?? "#ede9fe";
                                                        return (
                                                            <div
                                                                key={encoded}
                                                                className="relative inline-flex items-center group/tag min-w-[40px]"
                                                            >
                                                                <span
                                                                    className="px-1.5 py-1 rounded-md text-[10px] font-medium cursor-pointer w-full text-center"
                                                                    style={{
                                                                        backgroundColor: bg,
                                                                        color: "#3730a3",
                                                                    }}
                                                                >
                                                                    {parsed.label}
                                                                </span>
                                                                <div
                                                                    style={{ backgroundColor: bg }}
                                                                    className="absolute inset-0 flex items-center text-bold justify-between text-zinc-400 px-1 rounded-md text-[10px] opacity-0 group-hover/tag:opacity-100 transition-opacity pointer-events-none"
                                                                >
                                                                    <TagEditorPopover
                                                                        tag={encoded}
                                                                        tags={subtask.tags ?? []}
                                                                        onChange={(nextTags) => {
                                                                            updateTask({ id: subtask.id, tags: nextTags });
                                                                        }}
                                                                    >
                                                                        <button
                                                                            type="button"
                                                                            className="px-0.5 pointer-events-auto cursor-pointer hover:text-zinc-700"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                            }}
                                                                            title="Tag settings"
                                                                        >
                                                                            <MoreHorizontal className="h-3 w-3" />
                                                                        </button>
                                                                    </TagEditorPopover>
                                                                    <button
                                                                        type="button"
                                                                        className="px-0.5 pointer-events-auto cursor-pointer hover:text-red-500"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const nextTags = (subtask.tags ?? []).filter((t: string) => t !== encoded);
                                                                            updateTask({ id: subtask.id, tags: nextTags });
                                                                        }}
                                                                        title="Remove tag"
                                                                    >
                                                                        <XIcon className="h-3 w-3" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {subtask.tags!.length > 2 && (
                                                        <TagsPopover
                                                            tags={subtask.tags ?? []}
                                                            onChange={(nextTags) => {
                                                                updateTask({ id: subtask.id, tags: nextTags });
                                                            }}
                                                            trigger={
                                                                <button
                                                                    type="button"
                                                                    className="px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 text-[10px] font-medium cursor-pointer"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                    }}
                                                                >
                                                                    +{subtask.tags!.length - 2}
                                                                </button>
                                                            }
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="p-0.5 rounded hover:bg-zinc-200/80 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!expanded) toggleParentExpand(subtask.id);
                                                            openInlineAdd(parentKey, subtask.id);
                                                        }}
                                                    >
                                                        <Plus className="h-3.5 w-3.5" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" sideOffset={4} className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md">
                                                    Add subtask
                                                </TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="p-0.5 rounded hover:bg-zinc-200/80 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setRenamingTaskId(subtask.id);
                                                            setRenameDraft(subtask.title || "");
                                                        }}
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" sideOffset={4} className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md">
                                                    Rename task
                                                </TooltipContent>
                                            </Tooltip>
                                            {(subtask.tags?.length ?? 0) <= 2 && (
                                                <TagsPopover
                                                    tags={subtask.tags ?? []}
                                                    onChange={(nextTags) => {
                                                        updateTask({ id: subtask.id, tags: nextTags });
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                {/* Render columns by columnOrder, matching ListView exactly */}
                                {Array.from(new Set(columnOrder)).filter(colId => visibleColumns.has(colId)).map(colId => {
                                    const colWidth = colWidths[colId] ?? 100;
                                    if (colId === 'assignee') return (
                                        <TableCell key="assignee" className="p-0.5 overflow-hidden" style={{ width: colWidth, minWidth: 80 }}>
                                            <AssigneeSelector
                                                users={workspaceMembers}
                                                workspaceId={workspaceId ?? ''}
                                                variant="compact"
                                                side="right"
                                                avoidCollisions={false}
                                                collisionPadding={12}
                                                sideOffset={8}
                                                value={
                                                    (subtask.assignees?.map((a: any) => `user:${a.userId ?? a.user?.id}`) ??
                                                        (subtask.assignee?.id ? [`user:${subtask.assignee.id}`] : []))
                                                }
                                                onChange={(newIds) => {
                                                    const cleanIds = newIds.map(id => id.replace('user:', ''));
                                                    updateTask({ id: subtask.id, assigneeIds: cleanIds, assigneeId: cleanIds[0] || null });
                                                }}
                                                trigger={
                                                    <button type="button" className="w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-visible:ring-indigo-500 data-[state=open]:ring-indigo-500 transition-shadow cursor-pointer" onClick={(e) => e.stopPropagation()} title="Edit assignees">
                                                        <div className="flex items-center -space-x-1.5">
                                                            {subtask.assignees?.length > 0 ? subtask.assignees.slice(0, 4).map((a: any, i: number) => (
                                                                <Avatar key={a.user?.id || a.aiAgent?.id || a.agent?.id || i} className="h-6 w-6 border-2 border-white ring-1 ring-zinc-100">
                                                                    <AvatarImage src={a.user?.image || a.aiAgent?.avatar || a.aiAgent?.image || a.agent?.avatar || undefined} />
                                                                    <AvatarFallback className="text-[9px] bg-indigo-50 text-indigo-600">{a.user?.name?.slice(0, 2)?.toUpperCase() || a.aiAgent?.name?.slice(0, 2)?.toUpperCase() || a.agent?.name?.slice(0, 2)?.toUpperCase() || '??'}</AvatarFallback>
                                                                </Avatar>
                                                            )) : (
                                                                <div className="h-6 w-6 rounded-full border border-dashed border-zinc-300 flex items-center justify-center"><Users className="h-3 w-3 text-zinc-400" /></div>
                                                            )}
                                                        </div>
                                                    </button>
                                                }
                                            />
                                        </TableCell>
                                    );
                                    if (colId === 'dueDate') {
                                        const dueInfo = (() => {
                                            const date = subtask.dueDate ?? null;
                                            if (!date) return null;
                                            const d = new Date(date);
                                            if (Number.isNaN(d.getTime())) return null;
                                            const today = new Date(); today.setHours(0, 0, 0, 0);
                                            const due = new Date(d); due.setHours(0, 0, 0, 0);
                                            const days = Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
                                            if (days < 0) return { text: `${Math.abs(days)} days ago`, color: 'text-red-600 font-medium' };
                                            if (days === 0) return { text: 'Today', color: 'text-indigo-600 font-medium' };
                                            if (days === 1) return { text: 'Tomorrow', color: 'text-orange-600' };
                                            if (days < 7) return { text: d.toLocaleDateString('en-US', { weekday: 'short' }), color: 'text-indigo-600' };
                                            return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: 'text-zinc-500' };
                                        })();
                                        return (
                                            <TableCell key="dueDate" className="p-0.5 overflow-hidden" style={{ width: colWidth, minWidth: 80 }}>
                                                <Popover><PopoverTrigger asChild><button type="button" className={cn('text-xs w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-visible:ring-indigo-500 data-[state=open]:ring-indigo-500 transition-shadow cursor-pointer', dueInfo ? dueInfo.color : 'text-zinc-400')} onClick={(e) => { e.stopPropagation(); }} title="Edit due date">{dueInfo ? dueInfo.text : 'Add Date'}</button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start" sideOffset={8} collisionPadding={10}><TaskCalendar startDate={subtask.startDate ? new Date(subtask.startDate) : undefined} endDate={subtask.dueDate ? new Date(subtask.dueDate) : undefined} onStartDateChange={(date) => { updateTask({ id: subtask.id, startDate: date ? date.toISOString() : null }); }} onEndDateChange={(date) => { updateTask({ id: subtask.id, dueDate: date ? date.toISOString() : null }); }} /></PopoverContent></Popover>
                                            </TableCell>
                                        );
                                    }
                                    if (colId === 'priority') return (
                                        <TableCell key="priority" className="p-0.5 overflow-hidden" style={{ width: colWidth, minWidth: 80 }}>
                                            <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-visible:ring-indigo-500 data-[state=open]:ring-indigo-500 transition-shadow cursor-pointer text-xs font-medium text-zinc-700" onClick={(e) => { e.stopPropagation(); }} title="Edit priority"><div className="flex items-center gap-1.5 w-full"><div className={cn('flex items-center gap-1.5', subtask.priority === 'URGENT' ? 'text-red-500' : subtask.priority === 'HIGH' ? 'text-orange-500' : subtask.priority === 'NORMAL' ? 'text-blue-500' : 'text-zinc-400')}><Flag className="h-3 w-3 fill-current" /></div><span>{subtask.priority ? subtask.priority.charAt(0) + subtask.priority.slice(1).toLowerCase() : 'Priority'}</span></div></button></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-48 z-[200]"><DropdownMenuLabel className="text-xs">Priority</DropdownMenuLabel><DropdownMenuItem onClick={() => updateTask({ id: subtask.id, priority: 'URGENT' })}><Flag className="h-3 w-3 mr-2 text-red-600 fill-current" /> Urgent</DropdownMenuItem><DropdownMenuItem onClick={() => updateTask({ id: subtask.id, priority: 'HIGH' })}><Flag className="h-3 w-3 mr-2 text-orange-600 fill-current" /> High</DropdownMenuItem><DropdownMenuItem onClick={() => updateTask({ id: subtask.id, priority: 'NORMAL' })}><Flag className="h-3 w-3 mr-2 text-blue-600 fill-current" /> Normal</DropdownMenuItem><DropdownMenuItem onClick={() => updateTask({ id: subtask.id, priority: 'LOW' })}><Flag className="h-3 w-3 mr-2 text-slate-600 fill-current" /> Low</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => updateTask({ id: subtask.id, priority: null })}><CircleSlash className="h-3 w-3 mr-2 text-slate-500" />Clear</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                                        </TableCell>
                                    );
                                    if (colId === 'status') {
                                        const getStatusStyles = (s: string) => {
                                            const lower = (s || '').toLowerCase();
                                            if (lower === 'done' || lower === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                            if (lower === 'in progress' || lower === 'in_progress') return 'bg-blue-50 text-blue-700 border-blue-200';
                                            return 'bg-slate-50 text-slate-700 border-slate-200';
                                        };
                                        return (
                                            <TableCell key="status" className="p-0.5 overflow-hidden" style={{ width: colWidth, minWidth: 80 }}>
                                                <TaskStatusPopover task={subtask as any} availableStatuses={statuses} availableTaskTypes={availableTaskTypes} onUpdateTask={(id, data) => updateTask({ id, ...data })} hideTaskTypeTab={true}><button type="button" className={cn('w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-visible:ring-indigo-500 data-[state=open]:ring-indigo-500 transition-shadow cursor-pointer text-xs font-medium')} onClick={(e) => { e.stopPropagation(); }} title="Edit status"><div className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded border', getStatusStyles(subtask.status?.name || ''))}><span className="h-2 w-2 rounded-full" style={{ backgroundColor: subtask.status?.color || '#94A3B8' }} />{subtask.status?.name || 'No Status'}</div></button></TaskStatusPopover>
                                            </TableCell>
                                        );
                                    }
                                    if (colId === 'dateCreated') return (
                                        <TableCell key="dateCreated" className="p-0.5 overflow-hidden" style={{ width: colWidth, minWidth: 80 }}>
                                            <div className="w-full h-full min-h-[38px] flex items-center justify-between px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 transition-shadow group/readonly text-xs text-zinc-500 cursor-default" onClick={(e) => { e.stopPropagation(); }}>
                                                <div className="truncate">{subtask.createdAt ? format(new Date(subtask.createdAt), 'M/d/yy') : '—'}</div>
                                                <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><div className="opacity-0 group-hover/readonly:opacity-100 transition-opacity flex items-center justify-center h-6 w-6 rounded-md bg-zinc-100 hover:bg-zinc-200 cursor-default shrink-0" onClick={(e) => e.stopPropagation()}><PenOff className="h-3.5 w-3.5 text-zinc-500" /></div></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>Read-only</TooltipContent></Tooltip></TooltipProvider>
                                            </div>
                                        </TableCell>
                                    );
                                    if (colId === 'createdBy') {
                                        const creatorId = (subtask as any).createdBy;
                                        const creatorMember = creatorId ? (workspaceMembers ?? []).find((m: any) => m.user?.id === creatorId || m.id === creatorId) : null;
                                        const creator = creatorMember ? ((creatorMember as any).user ?? creatorMember) : null;
                                        return (
                                            <TableCell key="createdBy" className="p-0.5 overflow-hidden" style={{ width: colWidth, minWidth: 80 }}>
                                                <div className="w-full h-full min-h-[38px] flex items-center justify-between px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 transition-shadow group/readonly cursor-default" onClick={(e) => { e.stopPropagation(); }}>
                                                    <div className="truncate">
                                                        {creator ? (
                                                            <Avatar className="h-6 w-6">
                                                                <AvatarImage src={creator.image ?? undefined} />
                                                                <AvatarFallback className="text-[10px] bg-zinc-900 text-white font-medium">{(creator.name ?? 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                                                            </Avatar>
                                                        ) : <span className="text-xs text-zinc-500">—</span>}
                                                    </div>
                                                    <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><div className="opacity-0 group-hover/readonly:opacity-100 transition-opacity flex items-center justify-center h-6 w-6 rounded-md bg-zinc-100 hover:bg-zinc-200 cursor-default shrink-0" onClick={(e) => e.stopPropagation()}><PenOff className="h-3.5 w-3.5 text-zinc-500" /></div></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>Read-only</TooltipContent></Tooltip></TooltipProvider>
                                                </div>
                                            </TableCell>
                                        );
                                    }
                                    if (colId === 'dateClosed') return (
                                        <TableCell key="dateClosed" className="p-0.5 overflow-hidden" style={{ width: colWidth, minWidth: 80 }}>
                                            <div className="w-full h-full min-h-[38px] flex items-center justify-between px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 transition-shadow group/readonly text-xs text-zinc-500 cursor-default" onClick={(e) => { e.stopPropagation(); }}>
                                                <div className="truncate">{(subtask as any).dateClosed ? format(new Date((subtask as any).dateClosed), 'M/d/yy') : '—'}</div>
                                                <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><div className="opacity-0 group-hover/readonly:opacity-100 transition-opacity flex items-center justify-center h-6 w-6 rounded-md bg-zinc-100 hover:bg-zinc-200 cursor-default shrink-0" onClick={(e) => e.stopPropagation()}><PenOff className="h-3.5 w-3.5 text-zinc-500" /></div></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>Read-only</TooltipContent></Tooltip></TooltipProvider>
                                            </div>
                                        </TableCell>
                                    );
                                    if (colId === 'dateDone') return (
                                        <TableCell key="dateDone" className="p-0.5 overflow-hidden" style={{ width: colWidth, minWidth: 80 }}>
                                            <div className="w-full h-full min-h-[38px] flex items-center justify-between px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 transition-shadow group/readonly text-xs text-zinc-500 cursor-default" onClick={(e) => { e.stopPropagation(); }}>
                                                <div className="truncate">{(subtask as any).dateDone ? format(new Date((subtask as any).dateDone), 'M/d/yy') : '—'}</div>
                                                <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><div className="opacity-0 group-hover/readonly:opacity-100 transition-opacity flex items-center justify-center h-6 w-6 rounded-md bg-zinc-100 hover:bg-zinc-200 cursor-default shrink-0" onClick={(e) => e.stopPropagation()}><PenOff className="h-3.5 w-3.5 text-zinc-500" /></div></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>Read-only</TooltipContent></Tooltip></TooltipProvider>
                                            </div>
                                        </TableCell>
                                    );
                                    if (colId === 'startDate') return (
                                        <TableCell key="startDate" className="p-0.5 overflow-hidden" style={{ width: colWidth, minWidth: 80 }}>
                                            <Popover><PopoverTrigger asChild><button type="button" className={cn('w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-visible:ring-indigo-500 data-[state=open]:ring-indigo-500 transition-shadow cursor-pointer text-xs', subtask.startDate ? 'text-zinc-700 font-medium' : 'text-zinc-400')} onClick={(e) => { e.stopPropagation(); }} title="Edit start date">{subtask.startDate ? format(new Date(subtask.startDate), 'M/d/yy') : 'Add Date'}</button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start" sideOffset={8} collisionPadding={10}><TaskCalendar startDate={subtask.startDate ? new Date(subtask.startDate) : undefined} endDate={subtask.dueDate ? new Date(subtask.dueDate) : undefined} onStartDateChange={(date) => { updateTask({ id: subtask.id, startDate: date ? date.toISOString() : null }); }} onEndDateChange={(date) => { updateTask({ id: subtask.id, dueDate: date ? date.toISOString() : null }); }} /></PopoverContent></Popover>
                                        </TableCell>
                                    );
                                    if (colId === 'dateUpdated') return (
                                        <TableCell key="dateUpdated" className="p-0.5 overflow-hidden" style={{ width: colWidth, minWidth: 80 }}>
                                            <div className="w-full h-full min-h-[38px] flex items-center justify-between px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 transition-shadow group/readonly text-xs text-zinc-500 cursor-default" onClick={(e) => { e.stopPropagation(); }}>
                                                <div className="truncate">{(subtask as any).updatedAt ? format(new Date((subtask as any).updatedAt), 'M/d/yy h:mma') : '—'}</div>
                                                <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><div className="opacity-0 group-hover/readonly:opacity-100 transition-opacity flex items-center justify-center h-6 w-6 rounded-md bg-zinc-100 hover:bg-zinc-200 cursor-default shrink-0" onClick={(e) => e.stopPropagation()}><PenOff className="h-3.5 w-3.5 text-zinc-500" /></div></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>Read-only</TooltipContent></Tooltip></TooltipProvider>
                                            </div>
                                        </TableCell>
                                    );
                                    if (colId === 'tags') return (
                                        <TableCell key="tags" className="p-0.5 overflow-hidden" style={{ width: colWidth, minWidth: 80 }}>
                                            <div className="w-full h-full min-h-[38px] flex items-center px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 transition-shadow gap-1 overflow-hidden group/tagcell cursor-default" onClick={(e) => { e.stopPropagation(); }}>
                                                {subtask.tags && subtask.tags.length > 0 ? (
                                                    <>
                                                        {(subtask.tags as string[]).slice(0, 1).map((encoded) => {
                                                            const parsed = parseEncodedTag(encoded);
                                                            const bg = parsed.color ?? '#ede9fe';
                                                            return (
                                                                <div key={encoded} className="relative inline-flex items-center group/tag min-w-[40px]">
                                                                    <span className="px-1.5 py-1 rounded-md text-xs font-medium cursor-pointer w-full text-center truncate max-w-[100px]" style={{ backgroundColor: bg, color: '#3730a3' }}>{parsed.label}</span>
                                                                    <div style={{ backgroundColor: bg }} className="absolute inset-0 flex items-center text-bold justify-between text-zinc-400 px-1 rounded-md text-xs opacity-0 group-hover/tag:opacity-100 transition-opacity pointer-events-none">
                                                                        <TagEditorPopover tag={encoded} tags={subtask.tags ?? []} onChange={(nextTags) => { updateTask({ id: subtask.id, tags: nextTags }); }}>
                                                                            <button type="button" className="px-0.5 pointer-events-auto cursor-pointer hover:text-zinc-700" onClick={(e) => e.stopPropagation()} title="Tag settings"><MoreHorizontal className="h-3 w-3" /></button>
                                                                        </TagEditorPopover>
                                                                        <button type="button" className="px-0.5 pointer-events-auto cursor-pointer hover:text-red-500" onClick={(e) => { e.stopPropagation(); const nextTags = (subtask.tags ?? []).filter((t: string) => t !== encoded); updateTask({ id: subtask.id, tags: nextTags }); }} title="Remove tag"><X className="h-3 w-3" /></button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        {subtask.tags.length > 1 ? (
                                                            <TagsPopover tags={subtask.tags ?? []} onChange={(nextTags) => { updateTask({ id: subtask.id, tags: nextTags }); }} trigger={<button type="button" className="px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 text-xs font-medium cursor-pointer hover:bg-zinc-200" onClick={(e) => e.stopPropagation()}>+{subtask.tags.length - 1}</button>} />
                                                        ) : (
                                                            <TagsPopover tags={subtask.tags ?? []} onChange={(nextTags) => { updateTask({ id: subtask.id, tags: nextTags }); }} trigger={<button type="button" className="flex items-center justify-center h-5 w-5 rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-opacity opacity-0 group-hover/tagcell:opacity-100 cursor-pointer" onClick={(e) => e.stopPropagation()}><Plus className="h-3 w-3" /></button>} />
                                                        )}
                                                    </>
                                                ) : (
                                                    <TagsPopover tags={subtask.tags ?? []} onChange={(nextTags) => { updateTask({ id: subtask.id, tags: nextTags }); }} trigger={<div className="flex items-center gap-1 w-full h-full cursor-pointer" onClick={(e) => e.stopPropagation()}><div className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors">—</div></div>} />
                                                )}
                                            </div>
                                        </TableCell>
                                    );
                                    if (colId === 'taskType') return (
                                        <TableCell key="taskType" className="p-0.5 overflow-hidden" style={{ width: colWidth, minWidth: 80 }}>
                                            <TaskStatusPopover task={subtask as any} availableStatuses={statuses} availableTaskTypes={availableTaskTypes} onUpdateTask={(id, data) => updateTask({ id, ...data })} hideStatusTab={true}>
                                                <button type="button" onClick={(e) => e.stopPropagation()} className="w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-visible:ring-indigo-500 data-[state=open]:ring-indigo-500 transition-shadow cursor-pointer gap-2 text-left text-xs text-zinc-700">
                                                    <TaskTypeIcon type={subtask.taskType} className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                                    <span className="truncate">{subtask.taskType?.name ?? 'Task'}</span>
                                                </button>
                                            </TaskStatusPopover>
                                        </TableCell>
                                    );
                                    if (colId === 'timeline') return (
                                        <TableCell key="timeline" className="p-0.5 overflow-hidden" style={{ width: colWidth, minWidth: 100 }}>
                                            <Popover><PopoverTrigger asChild><button type="button" className={cn('w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-visible:ring-indigo-500 data-[state=open]:ring-indigo-500 transition-shadow cursor-pointer text-xs gap-1.5', (subtask.startDate || subtask.dueDate) ? 'text-zinc-700 font-medium' : 'text-zinc-400')} onClick={(e) => { e.stopPropagation(); }} title="Edit timeline"><Calendar className="h-3.5 w-3.5" />{subtask.startDate || subtask.dueDate ? (<>{subtask.startDate ? format(new Date(subtask.startDate), 'M/d/yy') : '—'} &rarr; {subtask.dueDate ? format(new Date(subtask.dueDate), 'M/d/yy') : '—'}</>) : ''}</button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start" sideOffset={8} collisionPadding={10}><TaskCalendar startDate={subtask.startDate ? new Date(subtask.startDate) : undefined} endDate={subtask.dueDate ? new Date(subtask.dueDate) : undefined} onStartDateChange={(date) => { updateTask({ id: subtask.id, startDate: date ? date.toISOString() : null }); }} onEndDateChange={(date) => { updateTask({ id: subtask.id, dueDate: date ? date.toISOString() : null }); }} /></PopoverContent></Popover>
                                        </TableCell>
                                    );
                                    if (colId === 'linkedTasks') {
                                        const deps = (subtask as any).dependencies || [];
                                        const blocks = (subtask as any).blockedDependencies || [];
                                        const depCount = ((subtask._count as any)?.dependencies ?? 0) + ((subtask._count as any)?.blockedDependencies ?? 0);
                                        const firstLinkedTaskTitle = deps[0]?.dependsOn?.title || blocks[0]?.task?.title || 'Task';
                                        return (
                                            <TableCell key="linkedTasks" className="p-0.5 overflow-hidden" style={{ width: colWidth, minWidth: 80 }}>
                                                <TaskLinkedTasksPopover taskId={subtask.id} workspaceId={(subtask as any).workspaceId ?? workspaceId ?? ''}>
                                                    <button type="button" className="w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-visible:ring-indigo-500 data-[state=open]:ring-indigo-500 transition-shadow cursor-pointer gap-1" onClick={(e) => e.stopPropagation()}>
                                                        {depCount > 0 ? (<><Badge variant="outline" className="h-5 px-1.5 text-xs font-normal border-zinc-200 truncate max-w-[80px] rounded-sm">{firstLinkedTaskTitle}</Badge>{depCount > 1 && <Badge variant="outline" className="h-5 px-1 text-xs font-normal border-zinc-200 rounded-sm">+{depCount - 1}</Badge>}</>) : (<span className="text-xs text-zinc-500">—</span>)}
                                                    </button>
                                                </TaskLinkedTasksPopover>
                                            </TableCell>
                                        );
                                    }
                                    if (colId === 'linkedDocs') return (
                                        <TableCell key="linkedDocs" className="p-0.5 overflow-hidden" style={{ width: colWidth, minWidth: 80 }}>
                                            <LinkedDocsCell task={subtask as any} workspaceId={(subtask as any).workspaceId ?? workspaceId ?? ''} />
                                        </TableCell>
                                    );
                                    if (colId === 'dependencies') {
                                        const depCount = ((subtask._count as any)?.dependencies ?? 0) + ((subtask._count as any)?.blockedDependencies ?? 0);
                                        return (
                                            <TableCell key="dependencies" className="p-0.5 overflow-hidden" style={{ width: colWidth, minWidth: 80 }}>
                                                <TaskDependenciesPopover taskId={subtask.id} workspaceId={(subtask as any).workspaceId ?? workspaceId ?? ''}>
                                                    <button type="button" className="w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-visible:ring-indigo-500 data-[state=open]:ring-indigo-500 transition-shadow cursor-pointer gap-1" onClick={(e) => e.stopPropagation()}>
                                                        {depCount > 0 ? (<><Badge variant="outline" className="h-5 px-1.5 text-xs font-normal border-zinc-200 truncate max-w-[80px] rounded-sm">Task</Badge>{depCount > 1 && <Badge variant="outline" className="h-5 px-1 text-xs font-normal border-zinc-200 rounded-sm">+{depCount - 1}</Badge>}</>) : (<span className="text-xs text-zinc-500">—</span>)}
                                                    </button>
                                                </TaskDependenciesPopover>
                                            </TableCell>
                                        );
                                    }
                                    if (colId === 'taskId') return (
                                        <TableCell key="taskId" className="p-0 overflow-hidden text-xs text-zinc-500 font-mono group/taskid" style={{ width: colWidth, minWidth: 80 }}>
                                            <div className="w-full h-full min-h-[38px] flex items-center justify-between px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 transition-shadow cursor-default" onClick={(e) => { e.stopPropagation(); }}>
                                                <span className="truncate max-w-[80px] shrink-0" title={subtask.id}># {subtask.id.slice(0, 7)}...</span>
                                                <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(subtask.id); toast.success('Task ID copied'); }} className="opacity-0 group-hover/taskid:opacity-100 transition-opacity flex items-center justify-center h-6 w-6 rounded-md border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 shrink-0 cursor-pointer"><Copy className="h-3.5 w-3.5" /></button></TooltipTrigger><TooltipContent side="top" className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md">Copy Task ID</TooltipContent></Tooltip></TooltipProvider>
                                            </div>
                                        </TableCell>
                                    );
                                    if (colId === 'list') return (
                                        <TableCell key="list" className="p-0.5 overflow-hidden" style={{ width: colWidth, minWidth: 100 }}>
                                            <TaskListPopover taskId={subtask.id} workspaceId={((subtask as any).workspaceId ?? workspaceId ?? '') as string} currentListId={subtask.list?.id} sharedLists={(subtask as any).sharedLists ?? []}>
                                                <button type="button" className="w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-visible:ring-indigo-500 data-[state=open]:ring-indigo-500 transition-shadow cursor-pointer gap-1 group" onClick={(e) => e.stopPropagation()}>
                                                    <Badge variant="outline" className="h-6 px-2 text-xs font-normal border-zinc-200 bg-white rounded-md text-zinc-700 truncate hover:bg-zinc-50 transition-colors">{subtask.list?.name || '—'}</Badge>
                                                    {((subtask as any).sharedLists?.length > 0) && (<Badge variant="outline" className="h-6 px-2 text-xs font-normal border-zinc-200 bg-white rounded-md text-zinc-500 hover:bg-zinc-50 transition-colors shrink-0">+ {(subtask as any).sharedLists.length}</Badge>)}
                                                    <div className="h-6 w-6 rounded-md border border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-50 group-hover:text-zinc-600 transition-colors shrink-0"><Plus className="h-3 w-3" /></div>
                                                </button>
                                            </TaskListPopover>
                                        </TableCell>
                                    );
                                    if (colId === 'timeEstimate') return (
                                        <TableCell key="timeEstimate" className="p-0.5 overflow-hidden" style={{ width: colWidth, minWidth: 80 }}>
                                            <div className="w-full h-full min-h-[38px] flex items-center px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 transition-shadow text-xs text-zinc-500 cursor-default" onClick={(e) => { e.stopPropagation(); }}>
                                                {(subtask as any).timeEstimate ?? '—'}
                                            </div>
                                        </TableCell>
                                    );
                                    if (colId === 'comments') return (
                                        <TableCell key="comments" className="p-0.5 overflow-hidden" style={{ width: colWidth, minWidth: 60 }}>
                                            <TaskCommentPopover taskId={subtask.id} commentCount={subtask._count?.comments ?? 0} workspaceMembers={(workspaceMembers || []).map((u: any) => ({ id: u.user?.id ?? u.id, name: u.user?.name || u.name || u.user?.email || u.email, image: u.user?.image ?? u.image }))} trigger={<button type="button" className="w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-visible:ring-indigo-500 data-[state=open]:ring-indigo-500 transition-shadow cursor-pointer gap-1" onClick={(e) => e.stopPropagation()}><div className={cn('flex items-center gap-1.5 text-xs rounded-md px-1.5 py-1 transition-colors', (subtask._count?.comments ?? 0) > 0 ? 'text-zinc-700 bg-zinc-50 hover:bg-zinc-100' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100')}><MessageSquare className="h-3.5 w-3.5" />{(subtask._count?.comments ?? 0) > 0 && <span className="font-medium">{subtask._count?.comments}</span>}</div></button>} />
                                        </TableCell>
                                    );
                                    if (colId === 'timeTracked') {
                                        const totalTracked = typeof subtask.timeTracked === 'number' ? subtask.timeTracked : 0;
                                        let timeLabel = 'Add time';
                                        if (totalTracked > 0) {
                                            const hours = Math.floor(totalTracked / 3600);
                                            const mins = Math.floor((totalTracked % 3600) / 60);
                                            if (hours > 0 && mins > 0) timeLabel = `${hours}h ${mins}m`;
                                            else if (hours > 0) timeLabel = `${hours}h`;
                                            else timeLabel = `${mins}m`;
                                        }
                                        return (
                                            <TableCell key="timeTracked" className="p-0.5 overflow-hidden" style={{ width: colWidth, minWidth: 80 }}>
                                                <TaskTimeTrackedPopover taskId={subtask.id} workspaceId={(subtask as any).workspaceId ?? workspaceId ?? ''} totalTrackedSeconds={totalTracked} trigger={<button type="button" className="w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-visible:ring-indigo-500 data-[state=open]:ring-indigo-500 transition-shadow cursor-pointer gap-1" onClick={(e) => e.stopPropagation()}><div className={cn('flex items-center gap-1.5 text-xs rounded-md px-1.5 py-1 transition-colors', totalTracked > 0 ? 'text-zinc-700 bg-zinc-50 hover:bg-zinc-100' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100')}><Play className="h-3 w-3 shrink-0" /><span className="font-medium">{timeLabel}</span></div></button>} />
                                            </TableCell>
                                        );
                                    }
                                    if (colId === 'pullRequests') return (
                                        <TableCell key="pullRequests" className="p-0.5 overflow-hidden" style={{ width: colWidth, minWidth: 80 }}>
                                            <div className="w-full h-full min-h-[38px] flex items-center px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 transition-shadow text-xs text-zinc-500 cursor-default" onClick={(e) => { e.stopPropagation(); }}>—</div>
                                        </TableCell>
                                    );
                                    // Custom fields
                                    const cfEntry = SUBTASK_FIELD_CONFIG.find(f => (f as any).id === colId && (f as any).isCustom);
                                    if (cfEntry) {
                                        const customField = (cfEntry as any).customField;
                                        const value = getCustomFieldValue(subtask as any, colId);
                                        const formattedValue = formatCustomFieldValue(value, customField);
                                        return (
                                            <TableCell key={colId} className="p-0.5 overflow-hidden" style={{ width: colWidths[colId] ?? 120, minWidth: 80 }}>
                                                <button type="button" className="w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-visible:ring-indigo-500 data-[state=open]:ring-indigo-500 transition-shadow cursor-pointer text-left text-xs text-zinc-700" onClick={(e) => { e.stopPropagation(); }} title={`Edit ${(cfEntry as any).label}`}>{formattedValue}</button>
                                            </TableCell>
                                        );
                                    }
                                    // Fallback for any unknown column
                                    return (
                                        <TableCell key={colId} className="p-0.5 overflow-hidden" style={{ width: colWidth, minWidth: 80 }}>
                                            <div className="w-full h-full min-h-[38px] flex items-center px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 transition-shadow text-xs text-zinc-500 cursor-default" onClick={(e) => { e.stopPropagation(); }}>
                                                —
                                            </div>
                                        </TableCell>
                                    );
                                })}
                                <TableCell className="w-[50px] py-1 pr-4 bg-white transition-colors group-hover:bg-[#fbfbfb]" style={{ position: 'sticky', right: 0, zIndex: 2, boxShadow: '-2px 0 4px -1px rgba(0,0,0,0.06)' }}>
                                    <TaskActionsPopover
                                        task={subtask}
                                        context={task.spaceId ? "SPACE" : task.projectId ? "PROJECT" : "GENERAL"}
                                        contextId={(task.spaceId || task.projectId) as string}
                                        workspaceId={workspaceId ?? ""}
                                        users={workspaceMembers ?? []}
                                        lists={[]}
                                        defaultListId={task.listId}
                                        availableStatuses={statuses}
                                        onDelete={id => void deleteTask.mutate({ id })}
                                        onUpdate={(id, data) => updateTask({ id, ...data })}
                                        onAction={(action) => {
                                            if (action === "rename") {
                                                setRenamingTaskId(subtask.id);
                                                setRenameDraft(subtask.title);
                                            }
                                        }}
                                    >
                                        <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                                            <MoreHorizontal className="h-4 w-4 text-zinc-500" />
                                        </Button>
                                    </TaskActionsPopover>
                                </TableCell>
                            </TableRow>
                            {showDropLineAfter && (
                                <TableRow className="h-0 border-none">
                                    <TableCell colSpan={20} className="p-0">
                                        <div
                                            className="flex items-center h-0.5"
                                            style={{ marginLeft: (depth + 1) * 16 + 96 }}
                                        >
                                            <div className="w-0 h-0 border-y-[4px] border-y-transparent border-l-[7px] border-l-indigo-500" />
                                            <div className="flex-1 h-[2px] rounded bg-indigo-500" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </>
                    )}
                </DraggableSubtaskRow>
                {expandedParents.has(subtask.id) && inlineAddGroupKey === parentKey && (
                    renderInlineEditorRow({
                        parentId: subtask.id,
                        childDepth: (subtask.depth ?? 0) + 1,
                    })
                )}
            </React.Fragment>
        );
    };

    return (
        <div className={cn("transition-all duration-200 bg-white group/header", isMaximized ? "absolute inset-0 z-50 p-8 overflow-y-auto flex flex-col" : "relative space-y-3")}>
            {isMaximized && (
                <div className="absolute top-6 right-6">
                    <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-900 gap-1.5" onClick={() => setIsMaximized(false)}>
                        Close <Minimize2 className="h-4 w-4" />
                    </Button>
                </div>
            )}

            <div className={cn("space-y-3 flex-1", isMaximized && "max-w-5xl w-full mx-auto mt-12")}>
                {(allSubtasks.length > 0 || isAddingSubtask) && (
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 -ml-1 group/header">
                            {(allSubtasks.length > 0 || isAddingSubtask) ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (isAddingSubtask) {
                                            setIsAddingSubtask(false);
                                        } else if (allSubtasks.length > 0) {
                                            setIsCollapsed(!isCollapsed);
                                        }
                                    }}
                                    className="cursor-pointer h-6 w-6 flex items-center justify-center rounded-md hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 transition-colors"
                                >
                                    <svg viewBox="0 0 100 100" className={cn("h-2.5 w-2.5 fill-current transition-transform duration-200", (!isCollapsed || isAddingSubtask) && "rotate-90")}>
                                        <polygon points="20,10 80,50 20,90" />
                                    </svg>
                                </button>
                            ) : (
                                <div className="h-6 w-6 flex items-center justify-center">
                                    <ListIcon className="h-4 w-4 text-zinc-400" />
                                </div>
                            )}
                            <h3 className="text-sm font-semibold text-zinc-900">Subtasks</h3>
                            {allSubtasks.length > 0 && (
                                <>
                                    <div className="h-1.5 flex-1 min-w-[80px] max-w-[120px] rounded-full bg-zinc-200 overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 rounded-full transition-all"
                                            style={{ width: `${allSubtasks.length ? (completedCount / allSubtasks.length) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-zinc-500">{completedCount}/{allSubtasks.length}</span>
                                </>
                            )}
                        </div>
                        <div className={cn("flex items-center gap-2 transition-opacity", isAddingSubtask ? "opacity-100" : "opacity-0 group-hover/header:opacity-100")}>
                            <TooltipProvider delayDuration={200}>
                                <div className="flex items-center p-0.5 border border-zinc-200 rounded-md shadow-sm bg-white">
                                    <DropdownMenu>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-6 rounded text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 px-1.5 gap-1 text-xs font-medium">
                                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                                        Sort
                                                    </Button>
                                                </DropdownMenuTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>
                                                Sort
                                            </TooltipContent>
                                        </Tooltip>
                                        <DropdownMenuContent align="start" className="w-48">
                                            <DropdownMenuLabel className="text-xs text-zinc-500 font-normal">Sorting</DropdownMenuLabel>
                                            {[
                                                { id: 'manual', label: 'Manual' },
                                                { id: 'status', label: 'Status' },
                                                { id: 'priority', label: 'Priority' },
                                                { id: 'dueDate', label: 'Due Date' },
                                                { id: 'name', label: 'Name' },
                                            ].map(opt => {
                                                const isSelected = sortBy === opt.id;
                                                return (
                                                    <DropdownMenuItem
                                                        key={opt.id}
                                                        className="flex items-center justify-between text-sm py-1.5 cursor-pointer"
                                                        onClick={(e) => {
                                                            if (isSelected) {
                                                                e.preventDefault();
                                                                setSortDirection(d => d === "asc" ? "desc" : "asc");
                                                            } else {
                                                                setSortBy(opt.id as SortOption);
                                                                setSortDirection("asc");
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-1.5">
                                                            {isSelected && (
                                                                <div className="flex flex-col leading-none p-[1.5px] bg-violet-50 rounded text-violet-600">
                                                                    <ChevronUp className={cn("h-[9px] w-[9px] -mb-[2px]", sortDirection === "asc" ? "opacity-100 stroke-[3]" : "opacity-40")} />
                                                                    <ChevronDown className={cn("h-[9px] w-[9px]", sortDirection === "desc" ? "opacity-100 stroke-[3]" : "opacity-40")} />
                                                                </div>
                                                            )}
                                                            <span className={cn(isSelected ? "text-zinc-900" : "text-zinc-700")}>{opt.label}</span>
                                                        </div>
                                                        {isSelected && <Check className="h-4 w-4 text-violet-600" />}
                                                    </DropdownMenuItem>
                                                );
                                            })}
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {!isMaximized && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100" onClick={() => setIsMaximized(true)}>
                                                    <Maximize2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>
                                                Fullscreen
                                            </TooltipContent>
                                        </Tooltip>
                                    )}

                                    <div className="w-[1px] h-3.5 bg-zinc-200 mx-0.5" />

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100" onClick={() => viewMode === 'list' ? setIsAddingSubtask(true) : openInlineAdd(`parent:${parentId}`, parentId)}>
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>
                                            Add subtask
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </TooltipProvider>
                        </div>
                    </div>
                )}

                {/* Empty state "Add subtask" button */}
                {allSubtasks.length === 0 && !isAddingSubtask && (
                    <div className="py-0.5">
                        <Button
                            variant="ghost"
                            className="w-full justify-start h-8 px-2 text-[13px] text-zinc-600 font-normal hover:bg-zinc-100/80"
                            onClick={() => setIsAddingSubtask(true)}
                        >
                            <ListTree className="w-4 h-4 mr-2 text-zinc-400" />
                            Add subtask
                        </Button>
                    </div>
                )}

                {!isCollapsed && (allSubtasks.length > 0 || isAddingSubtask || !!inlineAddGroupKey) && (
                    <div className="w-full overflow-x-auto">
                        {viewMode === 'list' ? (
                            <div className="divide-y divide-zinc-100">
                                {displayRows.map((subtask) => {
                                    const expanded = expandedParents.has(subtask.id);
                                    const childrenCount = allSubtasks.filter(c => c.parentId === subtask.id).length;
                                    return (
                                        <div
                                            key={subtask.id}
                                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50/50"
                                            style={{ paddingLeft: (subtask.depth ?? 0) * 20 + 16 }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => childrenCount > 0 && toggleParentExpand(subtask.id)}
                                                className={cn('p-0.5 rounded', childrenCount === 0 && 'invisible')}
                                            >
                                                {expanded ? <ChevronDown className="h-3.5 w-3.5 text-zinc-500" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />}
                                            </button>
                                            <div className={cn('h-4 w-4 rounded-full border-2 shrink-0', subtask.status?.name === 'Done' ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-300')} />
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openTask(subtask.id);
                                                }}
                                                className="flex-1 font-medium text-zinc-800 truncate hover:text-indigo-600 cursor-pointer transition-colors"
                                            >
                                                {subtask.title}
                                            </span>
                                            {visibleColumns.has('assignee') && subtask.assignees?.length > 0 && (
                                                <div className="flex -space-x-2 shrink-0">
                                                    {subtask.assignees.slice(0, 4).map((a: any, i: number) => (
                                                        <Avatar key={a.user?.id || a.aiAgent?.id || a.agent?.id || i} className="h-6 w-6 border-2 border-white ring-1 ring-zinc-100">
                                                            <AvatarImage src={a.user?.image || a.aiAgent?.avatar || a.aiAgent?.image || a.agent?.avatar || undefined} />
                                                            <AvatarFallback className="text-[9px] bg-indigo-50 text-indigo-600">{a.user?.name?.slice(0, 2)?.toUpperCase() || a.aiAgent?.name?.slice(0, 2)?.toUpperCase() || a.agent?.name?.slice(0, 2)?.toUpperCase() || "??"}</AvatarFallback>
                                                        </Avatar>
                                                    ))}
                                                </div>
                                            )}
                                            {visibleColumns.has('dueDate') && subtask.dueDate && (
                                                <span className="text-xs text-zinc-500 shrink-0">{format(new Date(subtask.dueDate), 'MMM d')}</span>
                                            )}
                                            {visibleColumns.has('priority') && subtask.priority && subtask.priority !== 'NORMAL' && (
                                                <span className="text-xs text-zinc-600 shrink-0">{subtask.priority}</span>
                                            )}
                                        </div>
                                    );
                                })}
                                {isAddingSubtask && (
                                    <div className="flex items-center gap-2 px-3 py-2.5 border-t border-zinc-100 bg-white">
                                        {/* Spinner/circle status indicator */}
                                        <div className="shrink-0 h-4 w-4 rounded-full border-2 border-zinc-300 flex items-center justify-center text-zinc-300" />
                                        <Input
                                            value={subtaskTitle}
                                            onChange={(e) => setSubtaskTitle(e.target.value)}
                                            placeholder="Task Name or type '/' for commands"
                                            className="flex-1 h-7 border-0 shadow-none focus-visible:ring-0 text-[13px] text-zinc-700 placeholder:text-zinc-400 bg-transparent px-0"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleCreateSubtask();
                                                if (e.key === 'Escape') setIsAddingSubtask(false);
                                            }}
                                        />
                                        {/* Action icon buttons */}
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            <TooltipProvider delayDuration={300}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded"><Circle className="h-3.5 w-3.5" /></Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="bg-zinc-900 text-white text-xs px-2 py-1 border-0">Task type</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded"><Tag className="h-3.5 w-3.5" /></Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="bg-zinc-900 text-white text-xs px-2 py-1 border-0">Tags</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded"><Users className="h-3.5 w-3.5" /></Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="bg-zinc-900 text-white text-xs px-2 py-1 border-0">Assignee</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded"><CalendarIcon className="h-3.5 w-3.5" /></Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="bg-zinc-900 text-white text-xs px-2 py-1 border-0">Due date</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded"><Flag className="h-3.5 w-3.5" /></Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="bg-zinc-900 text-white text-xs px-2 py-1 border-0">Priority</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded"><Link2 className="h-3.5 w-3.5" /></Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="bg-zinc-900 text-white text-xs px-2 py-1 border-0">Link</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <div className="w-px h-4 bg-zinc-200 mx-1 shrink-0" />
                                        {/* Cancel + Save buttons */}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2.5 text-[12px] text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 font-medium rounded shrink-0"
                                            onClick={() => setIsAddingSubtask(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="h-7 px-2.5 text-[12px] bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded shrink-0 gap-1"
                                            onClick={handleCreateSubtask}
                                            disabled={!subtaskTitle.trim()}
                                        >
                                            Save <span className="opacity-70 text-[11px]">↵</span>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDragEnd={(e) => void handleDragEnd(e)}
                                onDragCancel={() => { setDragActiveId(null); setDragOverId(null); setDropPosition(null); }}
                            >
                                <Table className="w-full border-separate border-spacing-0">
                                    {allSubtasks.length > 0 && (
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent bg-transparent border-none">
                                                <TableHead className="relative py-3 pl-[30px] text-xs text-zinc-400 font-normal group bg-white" style={{ width: colWidths.name, minWidth: Math.max(colWidths.name || 200, 200), position: 'sticky', left: 0, zIndex: 3, boxShadow: '2px 0 4px -1px rgba(0,0,0,0.06)' }}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn(
                                                            "transition-opacity shrink-0",
                                                            selectedTasks.length > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                                        )}>
                                                            <Checkbox
                                                                checked={allSubtasks.length > 0 && selectedTasks.length === allSubtasks.length}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) {
                                                                        setSelectedTasks(allSubtasks.map((t: any) => t.id));
                                                                    } else {
                                                                        setSelectedTasks([]);
                                                                    }
                                                                }}
                                                                className="border-zinc-300 shrink-0 cursor-pointer"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-zinc-400 font-normal pl-4">Name</span>
                                                    </div>
                                                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-zinc-300 z-10" onMouseDown={(e) => startResize(e, "name")} onClick={(e) => e.stopPropagation()} />
                                                </TableHead>
                                                {(() => {
                                                    const COLUMN_LABELS: Record<string, string> = {
                                                        assignee: 'Assignee', priority: 'Priority', dueDate: 'Due Date',
                                                        status: 'Status', dateCreated: 'Date Created', createdBy: 'Created By',
                                                        dateClosed: 'Date Closed', dateDone: 'Date Done', startDate: 'Start Date',
                                                        dateUpdated: 'Date Updated', tags: 'Tags', taskType: 'Type',
                                                        timeline: 'Timeline', linkedTasks: 'Linked Tasks', linkedDocs: 'Linked Docs',
                                                        dependencies: 'Dependencies', taskId: 'Task ID', list: 'Lists',
                                                        timeEstimate: 'Time Estimate', comments: 'Comments',
                                                        timeTracked: 'Time Tracked', pullRequests: 'Pull Requests',
                                                    };
                                                    return Array.from(new Set(columnOrder)).filter(colId => visibleColumns.has(colId)).map(colId => (
                                                        <TableHead key={colId} className="relative text-xs text-zinc-400 font-normal" style={{ width: colWidths[colId] ?? 100, minWidth: 80 }}>
                                                            {COLUMN_LABELS[colId] ?? colId}
                                                            <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-zinc-300 z-10" onMouseDown={(e) => startResize(e, colId)} onClick={(e) => e.stopPropagation()} />
                                                        </TableHead>
                                                    ));
                                                })()}
                                                <TableHead className="w-[50px] pr-4 bg-white" style={{ position: 'sticky', right: 0, zIndex: 3, boxShadow: '-2px 0 4px -1px rgba(0,0,0,0.06)' }}>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-zinc-400 hover:text-zinc-600"
                                                                title="Add column / manage fields"
                                                            >
                                                                <PlusCircle className="h-3.5 w-3.5" strokeWidth={2} />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent align="end" className="w-[280px] p-0 gap-0 overflow-hidden" sideOffset={8}>
                                                            <div className="p-3 border-b border-zinc-100">
                                                                <div className="flex items-center gap-2 px-3 h-9 bg-white border border-zinc-200 rounded-md focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all overflow-hidden cursor-text">
                                                                    <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                                                                    <Input
                                                                        variant="ghost"
                                                                        className="flex-1 h-full border-0 p-0 shadow-none focus-visible:ring-0 text-sm bg-transparent placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus-visible:ring-0"
                                                                        placeholder="Search Task Fields"
                                                                        value={fieldsSearch}
                                                                        onChange={e => setFieldsSearch(e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <ScrollArea className="h-[280px] p-3">
                                                                {SUBTASK_FIELD_CONFIG.filter(f => !fieldsSearch.trim() || f.label.toLowerCase().includes(fieldsSearch.toLowerCase())).map(f => (
                                                                    <div key={f.id} className="flex items-center justify-between py-2 px-2 rounded hover:bg-zinc-50">
                                                                        <div className="flex items-center gap-2">
                                                                            <SubtaskFieldIcon icon={f.icon} />
                                                                            <span className="text-sm text-zinc-800">{f.label}</span>
                                                                        </div>
                                                                        <Switch
                                                                            checked={visibleColumns.has(f.id)}
                                                                            onCheckedChange={() => toggleColumn(f.id)}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </ScrollArea>
                                                        </PopoverContent>
                                                    </Popover>
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                    )}
                                    <TableBody>
                                        {displayRows.map((subtask, index) => renderSubtaskRow(subtask, subtask.depth, index))}
                                        {inlineAddGroupKey === `parent:${parentId}` && (
                                            renderInlineEditorRow({
                                                parentId: parentId,
                                                childDepth: 0
                                            })
                                        )}
                                        {!inlineAddGroupKey && (
                                            <TableRow>
                                                <TableCell colSpan={20} className="py-0 pr-4 w-full">
                                                    <div className="sticky left-0 z-10 py-2.5 pl-[74px]" style={{ width: Math.max(colWidths.name || 200, 200) }}>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="w-full h-8 text-sm text-zinc-800 hover:text-zinc-900 hover:bg-transparent justify-start px-2 -ml-2 font-normal cursor-pointer"
                                                            onClick={() => openInlineAdd(`parent:${parentId}`, parentId)}
                                                        >
                                                            <Plus className="h-3.5 w-3.5 mr-1" />
                                                            <span className="hover:border-1 hover:border-zinc-300 hover:rounded-md px-1.5 py-1">Add Task</span>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                <DragOverlay dropAnimation={null}>
                                    {dragActiveId ? (
                                        <Table>
                                            <TableBody>
                                                {(() => {
                                                    const task = allSubtasks.find(t => t.id === dragActiveId);
                                                    if (!task) return null;
                                                    return (
                                                        <TableRow className="bg-white shadow-xl opacity-90 border border-zinc-200">
                                                            <TableCell className="w-[40px] py-2 pl-4">
                                                                <GripVertical className="h-4 w-4 text-zinc-400" />
                                                            </TableCell>
                                                            <TableCell className="min-w-[280px] py-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div
                                                                        className={cn(
                                                                            'h-2 w-2 rounded-full shrink-0',
                                                                            task.status?.name === 'Done' ? 'bg-emerald-500' : 'bg-slate-400'
                                                                        )}
                                                                        style={{ backgroundColor: task.status?.color }}
                                                                    />
                                                                    <span className="font-medium text-sm text-zinc-900">{task.title}</span>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })()}
                                            </TableBody>
                                        </Table>
                                    ) : null}
                                </DragOverlay>

                            </DndContext>
                        )}
                    </div>
                )}

                {dependenciesTask && (
                    <TaskDependenciesModal
                        task={dependenciesTask}
                        open={!!dependenciesTask}
                        onOpenChange={(open) => !open && setDependenciesTask(null)}
                        workspaceId={workspaceId ?? ""}
                    />
                )}

                {/* Tag editor modal for subtasks (matches ListView) */}
                <Dialog
                    open={tagEditorOpen}
                    onOpenChange={(open) => {
                        if (!open && tagEditorOpen && tagEditorTaskId && tagEditorOriginalTag) {
                            const newName = tagEditorName.trim() || tagEditorOriginalTag;
                            const nextTags = tagEditorTags.map((t) =>
                                t === tagEditorOriginalTag ? newName : t
                            );
                            setTagColors((prev) => {
                                const next = { ...prev };
                                delete next[tagEditorOriginalTag];
                                next[newName] = tagEditorColor;
                                return next;
                            });
                            updateTask({ id: tagEditorTaskId, tags: nextTags });
                        }

                        setTagEditorOpen(open);
                        if (!open) {
                            setTagEditorTaskId(null);
                            setTagEditorOriginalTag(null);
                            setTagEditorTags([]);
                        }
                    }}
                >
                    <DialogContent className="sm:max-w-xs p-3">
                        <DialogTitle className="sr-only">Tag Editor</DialogTitle>
                        <div className="space-y-3">
                            <Input
                                value={tagEditorName}
                                onChange={(e) => setTagEditorName(e.target.value)}
                                placeholder="Name"
                                className="h-8 text-sm"
                                autoFocus
                            />
                            <div className="grid grid-cols-6 gap-1.5">
                                {TAG_COLOR_PALETTE.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        className={cn(
                                            "h-6 w-6 rounded-full border border-transparent flex items-center justify-center cursor-pointer",
                                            tagEditorColor === color ? "ring-2 ring-violet-500 ring-offset-1" : ""
                                        )}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setTagEditorColor(color)}
                                    >
                                        {tagEditorColor === color && (
                                            <span className="h-2 w-2 rounded-full bg-white" />
                                        )}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    className="h-6 w-6 rounded-full border border-dashed border-zinc-300 flex items-center justify-center bg-zinc-100 text-zinc-400 text-xs cursor-pointer"
                                    onClick={() => setTagEditorColor("")}
                                    title="No color"
                                >
                                    <Slash className="h-3 w-3" />
                                </button>
                                <button
                                    type="button"
                                    className="h-6 w-6 rounded-full border border-dashed border-zinc-300 flex items-center justify-center bg-white text-zinc-400 text-xs cursor-pointer"
                                    onClick={() => setTagEditorColor("#f3e8ff")}
                                    title="Default color"
                                >
                                    <Plus className="h-3 w-3" />
                                </button>
                            </div>
                            <Separator className="my-4" />
                            <button
                                type="button"
                                className="flex items-center gap-2 text-xs text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-md px-1.5 py-2 w-full cursor-pointer"
                                onClick={() => {
                                    if (!tagEditorTaskId || !tagEditorOriginalTag) return;
                                    const nextTags = tagEditorTags.filter((t) => t !== tagEditorOriginalTag);
                                    updateTask({ id: tagEditorTaskId, tags: nextTags });
                                    setTagEditorOpen(false);
                                    setTagEditorTaskId(null);
                                    setTagEditorOriginalTag(null);
                                    setTagEditorTags([]);
                                }}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete</span>
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
            <BulkEditBar
                selectedTasks={selectedTasks}
                setSelectedTasks={setSelectedTasks}
                updateTask={updateTask}
                allSubtasks={allSubtasks}
                workspaceMembers={workspaceMembers}
                workspaceId={workspaceId ?? ""}
            />
        </div >
    );
}

function BulkEditBar({
    selectedTasks,
    setSelectedTasks,
    updateTask,
    allSubtasks,
    workspaceMembers,
    workspaceId,
}: {
    selectedTasks: string[];
    setSelectedTasks: React.Dispatch<React.SetStateAction<string[]>>;
    updateTask: (payload: any) => void;
    allSubtasks: any[];
    workspaceMembers: any[];
    workspaceId: string;
}) {
    const [bulkModal, setBulkModal] = React.useState<'status' | 'assignees' | 'tags' | 'moveAdd' | 'more' | null>(null);
    const [bulkStatusSearch, setBulkStatusSearch] = React.useState('');
    const [bulkAssigneeIds, setBulkAssigneeIds] = React.useState<string[]>([]);
    const [bulkTagInput, setBulkTagInput] = React.useState('');
    const [bulkTags, setBulkTags] = React.useState<string[]>([]);
    const [bulkSendNotifications, setBulkSendNotifications] = React.useState(true);
    const [bulkMoveKeepInList, setBulkMoveKeepInList] = React.useState(false);

    const allAvailableStatuses = React.useMemo(() => {
        const statusMap = new Map<string, any>();
        for (const t of allSubtasks) {
            if (t.status?.id) statusMap.set(t.status.id, t.status);
        }
        return Array.from(statusMap.values());
    }, [allSubtasks]);

    if (selectedTasks.length === 0) return null;

    const bulkUpdate = (id: string, data: any) => updateTask({ id, ...data });

    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-1.5 px-4 py-2.5 bg-[#111111] text-white rounded-[24px] shadow-[0_25px_60px_rgba(0,0,0,0.4)] border border-white/10 w-max max-w-[98%] animate-in fade-in slide-in-from-bottom-6 duration-400 backdrop-blur-xl">
            <div
                className="group/select flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-transparent hover:border-white/20 hover:bg-white/5 cursor-pointer transition-all"
                onClick={() => setSelectedTasks([])}
            >
                <span className="text-[15px] font-bold text-white whitespace-nowrap">{selectedTasks.length} Tasks selected</span>
                <X className="h-4 w-4 text-zinc-400 group-hover/select:text-white transition-colors" />
            </div>

            <div className="h-4 w-px bg-white/10 mx-1.5" />

            <Popover open={bulkModal === "status"} onOpenChange={(open) => setBulkModal(open ? "status" : null)}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white hover:bg-white/10 h-10 gap-2 px-3.5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/10 shadow-none">
                        <Circle className="h-[18px] w-[18px]" />
                        <span className="text-[14px] font-bold">Status</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 shadow-2xl rounded-2xl border-zinc-200 overflow-hidden" align="center" side="top" sideOffset={16}>
                    <div className="p-2 border-b border-zinc-100">
                        <Input placeholder="Search..." className="h-8 text-sm" value={bulkStatusSearch} onChange={e => setBulkStatusSearch(e.target.value)} />
                    </div>
                    <div className="p-2 max-h-64 overflow-auto">
                        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded flex items-center gap-1.5 mb-2">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            Only showing statuses shared between all selected tasks.
                        </p>
                        {allAvailableStatuses.length === 0 ? (
                            <p className="text-sm text-zinc-500 py-2">No statuses</p>
                        ) : (
                            <div className="space-y-1">
                                {allAvailableStatuses
                                    .filter((s: any) => !bulkStatusSearch.trim() || (s.name || "").toLowerCase().includes(bulkStatusSearch.toLowerCase()))
                                    .map((s: any) => (
                                        <button key={s.id} type="button" className="w-full flex items-center gap-2 py-2 px-2 rounded hover:bg-zinc-100 text-left text-sm"
                                            onClick={() => { for (const id of selectedTasks) { bulkUpdate(id, { statusId: s.id }); } setBulkModal(null); }}>
                                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color || "#9CA3AF" }} />
                                            {s.name}
                                        </button>
                                    ))}
                            </div>
                        )}
                    </div>
                    <div className="p-3 border-t border-zinc-100 space-y-2">
                        <label className="flex items-center justify-between text-sm">
                            <span>Send notifications</span>
                            <Switch checked={bulkSendNotifications} onCheckedChange={setBulkSendNotifications} />
                        </label>
                    </div>
                </PopoverContent>
            </Popover>

            <AssigneeSelector
                users={workspaceMembers as any}
                agents={[]}
                workspaceId={workspaceId}
                variant="compact"
                value={bulkAssigneeIds}
                align="center"
                sideOffset={16}
                open={bulkModal === "assignees"}
                onOpenChange={(open) => setBulkModal(open ? "assignees" : null)}
                onChange={async (newIds) => {
                    setBulkAssigneeIds(newIds);
                    try {
                        await Promise.all(selectedTasks.map(id => new Promise(res => { bulkUpdate(id, { assigneeIds: newIds }); res(undefined); })));
                    } catch (e) {
                        console.error("Bulk assignee update failed", e);
                    }
                }}
                trigger={
                    <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white hover:bg-white/10 h-10 gap-2 px-3.5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/10 shadow-none">
                        <Users className="h-[18px] w-[18px]" />
                        <span className="text-[14px] font-bold">Assignees</span>
                    </Button>
                }
            />

            <Popover open={bulkModal === "tags"} onOpenChange={(open) => {
                setBulkModal(open ? "tags" : null);
                if (open) setBulkTags(Array.from(new Set(allSubtasks.filter(t => selectedTasks.includes(t.id)).flatMap(t => (t.tags ?? [])))));
                if (!open) setBulkTagInput("");
            }}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white hover:bg-white/10 h-10 gap-2 px-3.5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/10 shadow-none">
                        <Tag className="h-[18px] w-[18px]" />
                        <span className="text-[14px] font-bold">Tags</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 shadow-2xl rounded-2xl border-zinc-200 overflow-hidden" align="center" side="top" sideOffset={16}>
                    <div className="flex gap-2 mb-3">
                        <Input placeholder="Search or add tags..." className="h-8 text-sm flex-1" value={bulkTagInput} onChange={e => setBulkTagInput(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); const t = bulkTagInput.trim(); if (t && !bulkTags.includes(t)) { setBulkTags([...bulkTags, t]); setBulkTagInput(""); } } }} />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3 min-h-[32px]">
                        {bulkTags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
                                {tag}
                                <button type="button" className="hover:text-red-600 rounded p-0.5" onClick={() => setBulkTags(bulkTags.filter(t => t !== tag))} aria-label="Remove"><X className="h-3 w-3" /></button>
                            </Badge>
                        ))}
                    </div>
                    <label className="flex items-center justify-between text-sm mb-2">
                        <span>Send notifications</span>
                        <Switch checked={bulkSendNotifications} onCheckedChange={setBulkSendNotifications} />
                    </label>
                    <Button size="sm" className="w-full" onClick={() => { for (const id of selectedTasks) { bulkUpdate(id, { tags: bulkTags }); } setBulkModal(null); }}>Apply</Button>
                </PopoverContent>
            </Popover>

            <Popover open={bulkModal === "moveAdd"} onOpenChange={(open) => setBulkModal(open ? "moveAdd" : null)}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white hover:bg-white/10 h-10 gap-2 px-3.5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/10 shadow-none">
                        <ArrowRight className="h-[18px] w-[18px]" />
                        <span className="text-[14px] font-bold">Move</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 shadow-2xl rounded-sm border-zinc-200 overflow-hidden" align="center" side="top" sideOffset={16}>
                    <Tabs defaultValue="move">
                        <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
                            <TabsTrigger value="move">Move tasks</TabsTrigger>
                            <TabsTrigger value="add">Add to</TabsTrigger>
                        </TabsList>
                        <TabsContent value="move" className="mt-0 h-[300px]">
                            <DestinationPicker
                                workspaceId={workspaceId}
                                onSelect={async (listId) => {
                                    for (const id of selectedTasks) { bulkUpdate(id, { listId }); }
                                    setBulkModal(null);
                                }}
                            />
                        </TabsContent>
                        <TabsContent value="add" className="mt-0 h-[300px]">
                            <DestinationPicker
                                workspaceId={workspaceId}
                                onSelect={async (listId) => {
                                    for (const id of selectedTasks) { bulkUpdate(id, { listId }); }
                                    setBulkModal(null);
                                }}
                            />
                        </TabsContent>
                        <div className="p-3 border-t border-zinc-100 flex items-center justify-between text-sm">
                            <span>Send notifications</span>
                            <Switch checked={bulkSendNotifications} onCheckedChange={setBulkSendNotifications} />
                        </div>
                        <div className="p-3 border-t border-zinc-100 flex items-center justify-between text-sm text-zinc-500">
                            <span>Move and keep in current List</span>
                            <Switch checked={bulkMoveKeepInList} onCheckedChange={setBulkMoveKeepInList} />
                        </div>
                    </Tabs>
                </PopoverContent>
            </Popover>

            <DropdownMenu open={bulkModal === "more"} onOpenChange={(open) => { if (open) setBulkModal("more"); else if (bulkModal === "more") setBulkModal(null); }}>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white hover:bg-white/10 h-10 gap-2 px-3.5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/10 shadow-none">
                        <MoreHorizontal className="h-[18px] w-[18px]" />
                        <span className="text-[14px] font-bold">More</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" side="top" sideOffset={16} className="w-72 shadow-2xl rounded-2xl border-zinc-200 overflow-hidden outline-none">
                    <DropdownMenuLabel className="text-[11px] uppercase font-bold text-zinc-400 px-3 py-2">Set or change</DropdownMenuLabel>

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="px-3 py-2 cursor-pointer transition-colors">
                            <Target className="h-4 w-4 mr-2 text-zinc-400" />
                            <span>Status</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-64 p-2 shadow-xl rounded-xl border-zinc-200">
                            <div className="space-y-1">
                                {allAvailableStatuses.length === 0 ? (
                                    <p className="text-xs text-zinc-500 py-2 px-1">No shared statuses</p>
                                ) : (
                                    allAvailableStatuses.map((s: any) => (
                                        <DropdownMenuItem
                                            key={s.id}
                                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer"
                                            onSelect={() => { for (const id of selectedTasks) { bulkUpdate(id, { statusId: s.id }); } setBulkModal(null); }}
                                        >
                                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color || "#9CA3AF" }} />
                                            <span className="text-sm font-medium">{s.name}</span>
                                        </DropdownMenuItem>
                                    ))
                                )}
                            </div>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="px-3 py-2 cursor-pointer transition-colors">
                            <Users className="h-4 w-4 mr-2 text-zinc-400" />
                            <span>Assignees</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-72 p-0 shadow-xl rounded-xl border-zinc-200 overflow-hidden outline-none">
                            <AssigneeSelector
                                users={workspaceMembers as any}
                                agents={[]}
                                workspaceId={workspaceId}
                                variant="compact"
                                value={bulkAssigneeIds}
                                hidePopover
                                onChange={async (newIds) => {
                                    setBulkAssigneeIds(newIds);
                                    try {
                                        await Promise.all(selectedTasks.map(id => new Promise(res => { bulkUpdate(id, { assigneeIds: newIds }); res(undefined); })));
                                    } catch (e) {
                                        console.error("Bulk assignee update failed", e);
                                    }
                                }}
                            />
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="px-3 py-2 cursor-pointer transition-colors">
                            <Tag className="h-4 w-4 mr-2 text-zinc-400" />
                            <span>Tags</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-64 p-3 shadow-xl rounded-xl border-zinc-200">
                            <div className="flex flex-col gap-3">
                                <Input
                                    placeholder="Add tag..."
                                    className="h-8 text-xs"
                                    value={bulkTagInput}
                                    onChange={e => setBulkTagInput(e.target.value)}
                                    onKeyDown={async (e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            const t = bulkTagInput.trim();
                                            if (t && !bulkTags.includes(t)) { setBulkTags([...bulkTags, t]); setBulkTagInput(""); }
                                        }
                                    }}
                                />
                                <div className="flex flex-wrap gap-1 min-h-[20px]">
                                    {bulkTags.map(tag => (
                                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                                            {tag}
                                            <X className="h-2.5 w-2.5 cursor-pointer hover:text-red-500" onClick={() => setBulkTags(bulkTags.filter(t => t !== tag))} />
                                        </Badge>
                                    ))}
                                </div>
                                <Button size="sm" className="h-8 text-xs font-bold" onClick={() => {
                                    for (const id of selectedTasks) { bulkUpdate(id, { tags: bulkTags }); }
                                    setBulkModal(null);
                                }}>Apply Tags</Button>
                            </div>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator className="bg-zinc-100" />
                    <DropdownMenuLabel className="text-[11px] uppercase font-bold text-zinc-400 px-3 py-2">Apply an action</DropdownMenuLabel>

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="px-3 py-2 cursor-pointer transition-colors">
                            <ArrowRight className="h-4 w-4 mr-2 text-zinc-400" />
                            <span>Move/Add to</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-80 p-0 shadow-xl rounded-xl border-zinc-200 overflow-hidden">
                            <Tabs defaultValue="move">
                                <TabsList className="w-full grid grid-cols-2 rounded-none border-b border-zinc-100 h-10 bg-zinc-50/50">
                                    <TabsTrigger value="move" className="text-xs data-[state=active]:bg-white">Move</TabsTrigger>
                                    <TabsTrigger value="add" className="text-xs data-[state=active]:bg-white">Add to</TabsTrigger>
                                </TabsList>
                                <TabsContent value="move" className="mt-0 h-[300px]">
                                    <DestinationPicker
                                        workspaceId={workspaceId}
                                        onSelect={async (listId) => {
                                            for (const id of selectedTasks) { bulkUpdate(id, { listId }); }
                                            setBulkModal(null);
                                        }}
                                    />
                                </TabsContent>
                                <TabsContent value="add" className="mt-0 h-[300px]">
                                    <DestinationPicker
                                        workspaceId={workspaceId}
                                        onSelect={async (listId) => {
                                            for (const id of selectedTasks) { bulkUpdate(id, { listId }); }
                                            setBulkModal(null);
                                        }}
                                    />
                                </TabsContent>
                            </Tabs>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuItem
                        className="px-3 py-2 cursor-pointer"
                        onSelect={() => {
                            const sel = allSubtasks.filter(t => selectedTasks.includes(t.id));
                            const text = sel.map(t => (t.title || t.name) || "").join("\n");
                            void navigator.clipboard.writeText(text);
                            setBulkModal(null);
                        }}
                    >
                        <Copy className="h-4 w-4 mr-2 text-zinc-400" />
                        <span>Copy names to clipboard</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-zinc-100" />

                    <DropdownMenuItem
                        className="px-3 py-2 cursor-pointer text-red-600 focus:text-red-600"
                        onSelect={() => {
                            if (window.confirm(`Delete ${selectedTasks.length} task(s)?`)) {
                                for (const id of selectedTasks) { bulkUpdate(id, { _delete: true }); }
                                setSelectedTasks([]);
                            }
                        }}
                    >
                        <Trash2 className="h-4 w-4 mr-2 text-red-400" />
                        <span>Delete</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
