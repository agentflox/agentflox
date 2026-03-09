"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
    Plus, MoreHorizontal, GripVertical, ChevronRight, ChevronDown, X as XIcon, Target,
    Flag, Clock, User as UserIcon, Calendar as CalendarIcon, Tag as TagIcon, Pencil,
    LayoutGrid, List as ListIcon, ArrowUpDown, Search, ArrowUp, ArrowDown, ChevronUp,
    Circle, Users, AlertTriangle, Spline, CheckCircle2, Copy, Trash2, Edit3, MessageSquare, Paperclip, ListChecks, AlignLeft,
    Type, Hash, CheckSquare, LayoutList, Globe, Mail, Phone, DollarSign, FunctionSquare, Link2, TrendingUp, SlidersHorizontal, FileText, Heart, MapPin, Star, PenTool, MousePointer,
    CircleMinus, Link, Slash
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
} from '@/components/ui/dropdown-menu';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from "@/components/ui/separator";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AssigneeSelector } from './AssigneeSelector';
import { TagsPopover } from './TagsPopover';
import { TaskDependenciesModal } from './TaskDependenciesModal';
import { parseEncodedTag } from "../utils/tags";
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
import { CSS } from '@dnd-kit/utilities';
import clsx from "clsx";

const SUBTASK_FIELD_CONFIG: { id: string; label: string }[] = [
    { id: 'name', label: 'Name' },
    { id: 'assignee', label: 'Assignee' },
    { id: 'priority', label: 'Priority' },
    { id: 'dueDate', label: 'Due date' },
    { id: 'status', label: 'Status' },
    { id: 'timeTracked', label: 'Time tracked' },
    { id: 'dateCreated', label: 'Date created' },
    { id: 'taskType', label: 'Type' }
];

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
    let result: any[] = [];
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
    updateTask,
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
    const [dragActiveId, setDragActiveId] = React.useState<string | null>(null);
    const [dragOverId, setDragOverId] = React.useState<string | null>(null);
    const [dropPosition, setDropPosition] = React.useState<'before' | 'after' | null>(null);

    // Refs for batching updates (optimizing backend calls)
    const pendingUpdatesRef = useRef<Map<string, any>>(new Map());
    const batchTimeoutRef = useRef<NodeJS.Timeout>();

    // Column resizing logic
    const [colWidths, setColWidths] = useState<Record<string, number>>({
        name: 420,
        assignee: 120,
        priority: 100,
        timeTracked: 100,
        dueDate: 120,
        status: 120,
        dateCreated: 110,
        taskType: 130,
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
    const [inlineAddTaskType, setInlineAddTaskType] = React.useState<string>("TASK");
    const [inlineAddDueDate, setInlineAddDueDate] = React.useState<Date | null>(null);
    const [inlineAddStartDate, setInlineAddStartDate] = React.useState<Date | null>(null);
    const [inlineAddPriority, setInlineAddPriority] = React.useState<"URGENT" | "HIGH" | "NORMAL" | "LOW" | null>(null);
    const [draggingIds, setDraggingIds] = React.useState<string[]>([]);
    const [selectedTasks, setSelectedTasks] = React.useState<string[]>([]);
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

    const deleteTask = trpc.task.delete.useMutation({
        onSuccess: () => utils.task.get.invalidate({ id: task.id }),
    });

    const updateTaskMutation = trpc.task.update.useMutation();

    const createTask = trpc.task.create.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: task.id });
            // Also invalidate the list so it shows up in ListView
            utils.task.list.invalidate();
        },
    });

    const { data: availableTaskTypes = [] } = trpc.task.listTaskTypes.useQuery();

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
        setInlineAddTaskType("TASK");
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
                taskTypeId: inlineAddTaskType,
            } as any);
            setInlineAddGroupKey(null);
            setInlineAddParentId(null);
            setInlineAddTitle("");
            setInlineAddAssigneeIds([]);
            setInlineAddTaskType("TASK");
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
        setInlineAddTaskType("TASK");
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
            if (next.has(col)) next.delete(col);
            else next.add(col);
            return next;
        });
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
        // By default, sort by position if manual sort
        if (sortBy === 'manual') {
            return children.sort((a, b) => (a.position || "").localeCompare(b.position || ""));
        }
        return children;
    };

    const buildRows = (tasks: any[], depth: number): any[] => {
        const rows: any[] = [];
        for (const t of tasks) {
            rows.push({ ...t, depth });
            if (expandedParents.has(t.id)) {
                const children = getChildren(t);
                const sortedChildren = (sortBy as string) === 'manual' ? children : [...children].sort((a, b) => {
                    let c = 0;
                    if (sortBy === 'name') c = (a.title || '').localeCompare(b.title || '');
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
                <TableCell colSpan={20} className="py-2">
                    <div className="flex items-center gap-2 min-w-0" style={{ paddingLeft: depth * 16 + 48 }}>
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
                            className="flex-1 min-w-[200px] max-w-[400px] h-7 text-sm border-0 outline-none focus:outline-none"
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
                                <Button variant="outline" size="sm" className="h-7 px-2 text-xs text-zinc-700">
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
                                <DropdownMenuRadioGroup value={inlineAddTaskType} onValueChange={(v) => setInlineAddTaskType(v)}>
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
                                <Button variant="outline" size="icon" className="h-7 w-7 text-zinc-600">
                                    <Users className="h-3.5 w-3.5" />
                                </Button>
                            }
                        />

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="icon" className="h-7 w-7 text-zinc-600">
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
                                <Button variant="outline" size="icon" className="h-7 w-7 text-zinc-600">
                                    <Flag className="h-3.5 w-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuLabel className="text-xs">Task Priority</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setInlineAddPriority("URGENT")}>Urgent</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setInlineAddPriority("HIGH")}>High</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setInlineAddPriority("NORMAL")}>Normal</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setInlineAddPriority("LOW")}>Low</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setInlineAddPriority(null)}>Clear</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="flex items-center gap-1 ml-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-zinc-600"
                                onClick={() => handleCancelInlineAdd(true)}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                className="h-7 text-xs bg-zinc-900 hover:bg-zinc-800"
                                onClick={() => handleSaveTask(parentId)}
                                disabled={!inlineAddTitle.trim() || !workspaceId || createTask.isPending}
                            >
                                Save ↵
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
        const activeTask = tasks.find(t => t.id === activeId);
        const overTask = tasks.find(t => t.id === overId);

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
            if (wouldCreateCircularDependency(id, newParent, tasks)) {
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
                tasks
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
            const t = tasks.find(task => task.id === id);
            if (!t) return;

            const oldKey = normalizeParentId(t.parentId) ?? rootKey;
            const oldBucket = nextOrderByParent[oldKey] ?? [];
            nextOrderByParent[oldKey] = oldBucket.filter(x => x !== id);
        });

        // Initialize new bucket if needed
        if (!nextOrderByParent[newParentKey] || nextOrderByParent[newParentKey].length === 0) {
            const tasksInBucket = tasks.filter(t => {
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
                const task = tasks.find(t => t.id === taskId);
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

            const prevTask = prevId ? tasks.find(t => t.id === prevId) : null;
            const nextTask = nextId ? tasks.find(t => t.id === nextId) : null;

            let lastPos = prevTask?.position ?? null;
            const nextPos = nextTask?.position ?? null;

            idsToMove.forEach((id, idx) => {
                const task = tasks.find(t => t.id === id);
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

        // 🔥 2. Update cache state IMMEDIATELY
        const previousData = utils.task.list.getData(taskListInput);

        // Apply optimistic update to cache
        utils.task.list.setData(taskListInput, (old: any) => {
            if (!old) return old;

            const updatesMap = new Map(payloads.map(p => [p.id, p]));

            const updatedItems = old.items.map((t: any) => {
                const update = updatesMap.get(t.id);
                if (update) {
                    return { ...t, ...update };
                }
                return t;
            });

            updatedItems.sort((a: any, b: any) => {
                return (a.position || "").localeCompare(b.position || "");
            });

            return {
                ...old,
                items: updatedItems,
            };
        });

        // 🔥 FIX: Update orderByParent to match the new sorted order
        setOrderByParent(nextOrderByParent);

        // 🔥 3. Cleanup & Prep Background Sync
        void utils.task.list.cancel(taskListInput);

        payloads.forEach(payload => {
            pendingUpdatesRef.current.set(payload.id, payload);
        });

        if (batchTimeoutRef.current) {
            clearTimeout(batchTimeoutRef.current);
        }

        batchTimeoutRef.current = setTimeout(async () => {
            const batchedPayloads = Array.from(pendingUpdatesRef.current.values());
            pendingUpdatesRef.current.clear();
                        
            if (batchedPayloads.length === 0) return;

            try {
                await Promise.all(
                    batchedPayloads.map(payload => updateTask.mutateAsync(payload))
                );

                // Silently sync with backend after success
                await utils.task.list.invalidate(taskListInput);

            } catch (e) {
                if (previousData) {
                    utils.task.list.setData(taskListInput, previousData);
                    setOrderByParent(capturedOrderByParent);
                    console.log('↩️ Rolled back due to backend error');
                }
            }
        }, 300);

    }, [
        tasks,
        groupBy,
        updateTask,
        utils,
        taskListInput,
        draggingIds,
        dropPosition,
        orderByParent,
        setDragOverId,
        setDragActiveId,
        setDraggingIds,
        setDropPosition,
        setOrderByParent,
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
                                    'group hover:bg-zinc-50/80 border-b border-zinc-100/80',
                                    isSelected && 'bg-blue-50/30',
                                    isDragging && 'bg-zinc-200/70',
                                    (isBeingDraggedOver && !showDropLineBefore && !showDropLineAfter) && 'bg-violet-50/30'
                                )}
                                onClick={() => setSelectedTasks(prev => prev.includes(subtask.id) ? prev.filter(id => id !== subtask.id) : [...prev, subtask.id])}
                            >
                                <TableCell className="w-[50px] py-1 pl-4">
                                    <div className="flex items-center gap-2">
                                        <GripVertical className="h-4 w-4 text-zinc-300 opacity-0 group-hover:opacity-100 cursor-grab shrink-0" {...attributes} {...listeners} />
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => setSelectedTasks(prev => prev.includes(subtask.id) ? prev.filter(id => id !== subtask.id) : [...prev, subtask.id])}
                                            className="border-zinc-300 shrink-0"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </TableCell>
                                <TableCell className="py-1 overflow-hidden" style={{ width: colWidths.name, minWidth: 200 }}>
                                    <div className="flex items-center gap-2 min-w-0" style={{ paddingLeft: depth * 16 }}>
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
                                            className="shrink-0 p-1 rounded hover:bg-zinc-200/80"
                                            title={expanded ? "Collapse subtasks" : "Expand subtasks"}
                                        >
                                            <ChevronRight className={cn("h-3.5 w-3.5 text-zinc-500 transition-transform", expanded && "rotate-90")} />
                                        </button>
                                        <div
                                            className={cn(
                                                'h-2 w-2 rounded-full shrink-0',
                                                subtask.status?.name === 'Done' ? 'bg-emerald-500' : 'bg-slate-400'
                                            )}
                                            style={{ backgroundColor: subtask.status?.color }}
                                            title={subtask.status?.name}
                                        />
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
                                                    setRenamingTaskId(subtask.id);
                                                    setRenameDraft(subtask.title || "");
                                                }}
                                                className="font-medium text-sm text-zinc-900 cursor-pointer hover:text-blue-600 truncate flex items-center gap-1.5"
                                            >
                                                {(() => {
                                                    const tt = availableTaskTypes?.find((t: any) => t.id === subtask.taskType || t.name === subtask.taskType);
                                                    if (!tt) {
                                                        if (subtask.taskType === 'TASK') return <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
                                                        if (subtask.taskType === 'MILESTONE') return <Target className="h-3.5 w-3.5 text-purple-500 shrink-0" />;
                                                        if (subtask.taskType === 'FORM_RESPONSE') return <ListIcon className="h-3.5 w-3.5 text-green-500 shrink-0" />;
                                                        if (subtask.taskType === 'MEETING_NOTE') return <FileText className="h-3.5 w-3.5 text-orange-500 shrink-0" />;
                                                        return <CheckCircle2 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />;
                                                    }

                                                    const IconComp = (() => {
                                                        if (tt.icon === 'Target') return Target;
                                                        if (tt.icon === 'List') return ListIcon;
                                                        if (tt.icon === 'FileText') return FileText;
                                                        return CheckCircle2;
                                                    })();

                                                    return <IconComp className="h-3.5 w-3.5 shrink-0" style={{ color: tt.color || '#3b82f6' }} />;
                                                })()}
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
                                                                className="relative inline-flex items-center group/tag"
                                                            >
                                                                <span
                                                                    className="px-1.5 py-1 rounded-md text-[10px] font-medium cursor-pointer"
                                                                    style={{
                                                                        backgroundColor: bg,
                                                                        color: "#3730a3",
                                                                    }}
                                                                >
                                                                    {parsed.label}
                                                                </span>
                                                                <div
                                                                    style={{ backgroundColor: bg }}
                                                                    className="absolute inset-0 flex items-center text-bold justify-between text-zinc-400 px-1 rounded-full text-[10px] opacity-0 group-hover/tag:opacity-100 transition-opacity pointer-events-none"
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        className="px-0.5 pointer-events-auto cursor-pointer hover:text-zinc-700"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            openTagEditor(subtask, encoded);
                                                                        }}
                                                                        title="Tag settings"
                                                                    >
                                                                        <MoreHorizontal className="h-3 w-3" />
                                                                    </button>
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
                                            <button
                                                type="button"
                                                className="p-0.5 rounded hover:bg-zinc-200/80 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                                                title="Add subtask"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!expanded) toggleParentExpand(subtask.id);
                                                    openInlineAdd(parentKey, subtask.id);
                                                }}
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                className="p-0.5 rounded hover:bg-zinc-200/80 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                                                title="Rename task"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setRenamingTaskId(subtask.id);
                                                    setRenameDraft(subtask.title || "");
                                                }}
                                            >
                                                <Edit3 className="h-3.5 w-3.5" />
                                            </button>
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
                                {visibleColumns.has('assignee') && (
                                    <TableCell className="py-1 overflow-hidden" style={{ width: colWidths.assignee, minWidth: 80 }}>
                                        <AssigneeSelector
                                            users={workspaceMembers}
                                            workspaceId={workspaceId ?? ''}
                                            variant="compact"
                                            value={
                                                (subtask.assignees?.map((a: any) => `user:${a.userId ?? a.user?.id}`) ??
                                                    (subtask.assignee?.id ? [`user:${subtask.assignee.id}`] : []))
                                            }
                                            onChange={(newIds) => {
                                                const cleanIds = newIds.map(id => id.replace('user:', ''));
                                                updateTask({
                                                    id: subtask.id,
                                                    assigneeIds: cleanIds,
                                                    assigneeId: cleanIds[0] || null,
                                                });
                                            }}
                                            trigger={
                                                <button type="button" className="flex items-center -space-x-1.5 hover:bg-zinc-100 rounded px-1 py-0.5" onClick={(e) => e.stopPropagation()}>
                                                    {subtask.assignees?.length > 0 ? (
                                                        subtask.assignees.slice(0, 3).map((a: any, i: number) => (
                                                            <Avatar key={i} className="h-6 w-6 border-2 border-white ring-1 ring-zinc-100">
                                                                <AvatarImage src={a.user?.image ?? a.aiAgent?.avatar} />
                                                                <AvatarFallback className="text-[8px]">{a.user?.name?.substring(0, 2).toUpperCase() ?? '?'}</AvatarFallback>
                                                            </Avatar>
                                                        ))
                                                    ) : (
                                                        <div className="h-6 w-6 rounded-full border border-dashed border-zinc-300 flex items-center justify-center"><Users className="h-3 w-3 text-zinc-400" /></div>
                                                    )}
                                                </button>
                                            }
                                        />
                                    </TableCell>
                                )}
                                {visibleColumns.has('priority') && (
                                    <TableCell className="py-1 overflow-hidden" style={{ width: colWidths.priority, minWidth: 80 }}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    type="button"
                                                    className={cn(
                                                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border hover:opacity-90",
                                                        subtask.priority === 'URGENT' && "text-red-700 bg-red-50 border-red-200",
                                                        subtask.priority === 'HIGH' && "text-orange-700 bg-orange-50 border-orange-200",
                                                        subtask.priority === 'NORMAL' && "text-blue-700 bg-blue-50 border-blue-200",
                                                        subtask.priority === 'LOW' && "text-slate-600 bg-slate-100 border-slate-200",
                                                        !subtask.priority && "text-slate-600 bg-slate-50 border-slate-200"
                                                    )}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Flag className={cn("h-3 w-3",
                                                        subtask.priority === 'URGENT' ? "text-red-600" :
                                                            subtask.priority === 'HIGH' ? "text-orange-600" :
                                                                subtask.priority === 'NORMAL' ? "text-blue-600" : "text-slate-400"
                                                    )} />
                                                    {subtask.priority || "Normal"}
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-44">
                                                <DropdownMenuItem onClick={() => updateTask({ id: subtask.id, priority: "URGENT" })}>Urgent</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => updateTask({ id: subtask.id, priority: "HIGH" })}>High</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => updateTask({ id: subtask.id, priority: "NORMAL" })}>Normal</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => updateTask({ id: subtask.id, priority: "LOW" })}>Low</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => updateTask({ id: subtask.id, priority: null })}>Clear</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                )}
                                {visibleColumns.has('timeTracked') && (
                                    <TableCell className="py-1 overflow-hidden" style={{ width: colWidths.timeTracked, minWidth: 80 }}>
                                        <span className="text-xs text-zinc-500">{subtask.timeTracked || "—"}</span>
                                    </TableCell>
                                )}
                                {visibleColumns.has('dueDate') && (
                                    <TableCell className="py-1 overflow-hidden" style={{ width: colWidths.dueDate, minWidth: 80 }}>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button
                                                    type="button"
                                                    className={cn("text-xs rounded px-1 py-0.5 hover:bg-zinc-100", subtask.dueDate ? "text-zinc-700" : "text-zinc-400")}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {subtask.dueDate ? format(new Date(subtask.dueDate), 'MMM d') : 'Add Date'}
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start" sideOffset={8} collisionPadding={10}>
                                                <TaskCalendar
                                                    startDate={subtask.startDate ? new Date(subtask.startDate) : undefined}
                                                    endDate={subtask.dueDate ? new Date(subtask.dueDate) : undefined}
                                                    onStartDateChange={(date) => updateTask({ id: subtask.id, startDate: date ? date.toISOString() : null })}
                                                    onEndDateChange={(date) => updateTask({ id: subtask.id, dueDate: date ? date.toISOString() : null })}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </TableCell>
                                )}
                                {visibleColumns.has('status') && (
                                    <TableCell className="py-1 overflow-hidden" style={{ width: colWidths.status, minWidth: 80 }}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    type="button"
                                                    className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border hover:opacity-90")}
                                                    style={{
                                                        backgroundColor: subtask.status?.color ? `${subtask.status.color}15` : '#f4f4f5',
                                                        color: subtask.status?.color ?? '#52525b',
                                                        borderColor: subtask.status?.color ? `${subtask.status.color}30` : '#e4e4e7'
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subtask.status?.color || "#9CA3AF" }} />
                                                    {subtask.status?.name || "No Status"}
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-56">
                                                {/* Requires status list, using partial simple rendering for now */}
                                                <DropdownMenuItem>Todo</DropdownMenuItem>
                                                <DropdownMenuItem>In Progress</DropdownMenuItem>
                                                <DropdownMenuItem>Done</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                )}
                                {visibleColumns.has('dateCreated') && (
                                    <TableCell className="py-1 text-zinc-500 text-xs overflow-hidden" style={{ width: colWidths.dateCreated, minWidth: 80 }}>
                                        {subtask.createdAt ? format(new Date(subtask.createdAt), 'MMM d') : '—'}
                                    </TableCell>
                                )}
                                {visibleColumns.has('taskType') && (
                                    <TableCell className="py-1 overflow-hidden" style={{ width: colWidths.taskType || 100, minWidth: 80 }}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="flex items-center gap-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 p-1 -ml-1 rounded transition-colors group px-2"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {(() => {
                                                        const tt = availableTaskTypes?.find((t: any) => t.id === subtask.taskType || t.name === subtask.taskType);
                                                        if (!tt) {
                                                            if (subtask.taskType === 'TASK') return <><CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /><span>Task</span></>;
                                                            if (subtask.taskType === 'MILESTONE') return <><Target className="h-3.5 w-3.5 text-purple-500" /><span>Milestone</span></>;
                                                            if (subtask.taskType === 'FORM_RESPONSE') return <><ListIcon className="h-3.5 w-3.5 text-green-500" /><span>Form Response</span></>;
                                                            if (subtask.taskType === 'MEETING_NOTE') return <><FileText className="h-3.5 w-3.5 text-orange-500" /><span>Meeting Note</span></>;
                                                            return <><CheckCircle2 className="h-3.5 w-3.5 text-zinc-400" /><span>{subtask.taskType || 'Task'}</span></>;
                                                        }
                                                        const IconComp = (() => {
                                                            if (tt.icon === 'Target') return Target;
                                                            if (tt.icon === 'List') return ListIcon;
                                                            if (tt.icon === 'FileText') return FileText;
                                                            return CheckCircle2;
                                                        })();
                                                        return (
                                                            <>
                                                                <IconComp className="h-3.5 w-3.5" style={{ color: tt.color || '#3b82f6' }} />
                                                                <span>{tt.name}</span>
                                                            </>
                                                        );
                                                    })()}
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start">
                                                {availableTaskTypes?.length > 0 ? (
                                                    availableTaskTypes.map((tt: any) => {
                                                        const IconComp = (() => {
                                                            if (tt.icon === 'Target') return Target;
                                                            if (tt.icon === 'List') return ListIcon;
                                                            if (tt.icon === 'FileText') return FileText;
                                                            return CheckCircle2;
                                                        })();
                                                        return (
                                                            <DropdownMenuItem
                                                                key={tt.id}
                                                                onClick={() => updateTask({ id: subtask.id, taskTypeId: tt.id })}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <IconComp className="h-3.5 w-3.5" style={{ color: tt.color || '#3b82f6' }} />
                                                                    <span>{tt.name}</span>
                                                                </div>
                                                            </DropdownMenuItem>
                                                        );
                                                    })
                                                ) : (
                                                    [
                                                        { value: 'TASK', label: 'Task', icon: CheckCircle2, color: 'text-blue-500' },
                                                        { value: 'MILESTONE', label: 'Milestone', icon: Target, color: 'text-purple-500' },
                                                        { value: 'FORM_RESPONSE', label: 'Form Response', icon: ListIcon, color: 'text-green-500' },
                                                        { value: 'MEETING_NOTE', label: 'Meeting Note', icon: FileText, color: 'text-orange-500' },
                                                    ].map((type) => (
                                                        <DropdownMenuItem
                                                            key={type.value}
                                                            onClick={() => updateTask({ id: subtask.id, taskType: type.value as any })}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <type.icon className={cn("h-3.5 w-3.5", type.color)} />
                                                                <span>{type.label}</span>
                                                            </div>
                                                        </DropdownMenuItem>
                                                    ))
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                )}
                                <TableCell className="w-[50px] py-1 pr-4">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem>Edit</DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600" onClick={() => deleteTask.mutate({ id: subtask.id })}>Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
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
        <div className="space-y-3 relative">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900">Subtasks</h3>
                    <div className="h-1.5 flex-1 min-w-[80px] max-w-[120px] rounded-full bg-zinc-200 overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${allSubtasks.length ? (completedCount / allSubtasks.length) * 100 : 0}%` }}
                        />
                    </div>
                    <span className="text-xs text-zinc-500">{completedCount}/{allSubtasks.length}</span>
                </div>
                <div className="flex items-center gap-1">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                                <ArrowUpDown className="h-3.5 w-3.5" />
                                Sort
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="text-xs">Sorting</DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() =>
                                    setSortDirection(d => (d === "asc" ? "desc" : "asc"))
                                }
                                className="flex items-center gap-2"
                            >
                                <div className="flex flex-col leading-none">
                                    <ChevronUp
                                        className={clsx(
                                            "h-1 w-1",
                                            sortDirection === "asc"
                                                ? "text-foreground stroke-[2.5]"
                                                : "text-muted-foreground stroke-[1.5]"
                                        )}
                                    />
                                    <ChevronDown
                                        className={clsx(
                                            "h-1 w-1 -mt-1",
                                            sortDirection === "desc"
                                                ? "text-foreground stroke-[2.5]"
                                                : "text-muted-foreground stroke-[1.5]"
                                        )}
                                    />
                                </div>

                                <span>
                                    {sortDirection === "asc" ? "Ascending" : "Descending"}
                                </span>
                            </DropdownMenuItem>
                            <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                                <DropdownMenuRadioItem value="manual">Manual (drag to reorder)</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="status">Status</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="priority">Priority</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="dueDate">Due Date</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={toggleExpandAll}>{isExpanded ? "Collapse all" : "Expand all"}</Button>
                </div>
            </div>

            <div className="rounded-lg border border-zinc-200 overflow-hidden bg-white">
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
                                    <span className="flex-1 font-medium text-zinc-800 truncate">{subtask.title}</span>
                                    {visibleColumns.has('assignee') && subtask.assignees?.length > 0 && (
                                        <div className="flex -space-x-2 shrink-0">
                                            {subtask.assignees.slice(0, 2).map((a: any, i: number) => (
                                                <Avatar key={i} className="h-6 w-6 border-2 border-white">
                                                    <AvatarImage src={a.user?.image ?? a.aiAgent?.avatar} />
                                                    <AvatarFallback className="text-[8px]">{a.user?.name?.substring(0, 2).toUpperCase() ?? '?'}</AvatarFallback>
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
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-50/50">
                                <Input value={subtaskTitle} onChange={(e) => setSubtaskTitle(e.target.value)} placeholder="Add Task" className="h-8 flex-1" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleCreateSubtask()} />
                                <Button size="sm" variant="ghost" onClick={() => setIsAddingSubtask(false)}>Cancel</Button>
                                <Button size="sm" onClick={handleCreateSubtask} disabled={!subtaskTitle.trim()}>Save</Button>
                            </div>
                        )}
                        {!isAddingSubtask && (
                            <button type="button" onClick={() => setIsAddingSubtask(true)} className="w-full flex items-center gap-2 py-2.5 px-4 text-sm text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700">
                                <div className="h-4 w-4 rounded-full border-2 border-dashed border-zinc-300" />
                                Add Task
                            </button>
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
                        <Table className="table-fixed w-full">
                            <TableHeader>
                                <TableRow className="hover:bg-transparent bg-zinc-50/50">
                                    <TableHead className="w-[50px] pl-4" />
                                    <TableHead className="relative py-3" style={{ width: colWidths.name, minWidth: 200 }}>
                                        Name
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-zinc-300 z-10" onMouseDown={(e) => startResize(e, "name")} onClick={(e) => e.stopPropagation()} />
                                    </TableHead>
                                    {visibleColumns.has('assignee') && (
                                        <TableHead className="relative" style={{ width: colWidths.assignee, minWidth: 80 }}>
                                            Assignee
                                            <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-zinc-300 z-10" onMouseDown={(e) => startResize(e, "assignee")} onClick={(e) => e.stopPropagation()} />
                                        </TableHead>
                                    )}
                                    {visibleColumns.has('priority') && (
                                        <TableHead className="relative" style={{ width: colWidths.priority, minWidth: 80 }}>
                                            Priority
                                            <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-zinc-300 z-10" onMouseDown={(e) => startResize(e, "priority")} onClick={(e) => e.stopPropagation()} />
                                        </TableHead>
                                    )}
                                    {visibleColumns.has('timeTracked') && (
                                        <TableHead className="relative" style={{ width: colWidths.timeTracked, minWidth: 80 }}>
                                            Time Tracked
                                            <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-zinc-300 z-10" onMouseDown={(e) => startResize(e, "timeTracked")} onClick={(e) => e.stopPropagation()} />
                                        </TableHead>
                                    )}
                                    {visibleColumns.has('dueDate') && (
                                        <TableHead className="relative" style={{ width: colWidths.dueDate, minWidth: 80 }}>
                                            Due Date
                                            <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-zinc-300 z-10" onMouseDown={(e) => startResize(e, "dueDate")} onClick={(e) => e.stopPropagation()} />
                                        </TableHead>
                                    )}
                                    {visibleColumns.has('status') && (
                                        <TableHead className="relative" style={{ width: colWidths.status, minWidth: 80 }}>
                                            Status
                                            <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-zinc-300 z-10" onMouseDown={(e) => startResize(e, "status")} onClick={(e) => e.stopPropagation()} />
                                        </TableHead>
                                    )}
                                    {visibleColumns.has('dateCreated') && (
                                        <TableHead className="relative" style={{ width: colWidths.dateCreated, minWidth: 80 }}>
                                            Date Created
                                            <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-zinc-300 z-10" onMouseDown={(e) => startResize(e, "dateCreated")} onClick={(e) => e.stopPropagation()} />
                                        </TableHead>
                                    )}
                                    {visibleColumns.has('taskType') && (
                                        <TableHead className="relative" style={{ width: colWidths.taskType, minWidth: 80 }}>
                                            Type
                                            <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-zinc-300 z-10" onMouseDown={(e) => startResize(e, "taskType")} onClick={(e) => e.stopPropagation()} />
                                        </TableHead>
                                    )}
                                    <TableHead className="w-[50px] pr-4">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-zinc-400 hover:text-zinc-600"
                                                    title="Add column / manage fields"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent align="end" className="w-[280px] p-0 gap-0 overflow-hidden" sideOffset={8}>
                                                <div className="px-4 py-3 border-b border-zinc-100">
                                                    <h3 className="text-sm font-semibold text-zinc-900">Fields</h3>
                                                </div>
                                                <div className="p-3 border-b border-zinc-100">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                                                        <Input className="pl-9 h-9 text-sm" placeholder="Search" value={fieldsSearch} onChange={e => setFieldsSearch(e.target.value)} />
                                                    </div>
                                                </div>
                                                <ScrollArea className="h-[280px] p-3">
                                                    {SUBTASK_FIELD_CONFIG.filter(f => !fieldsSearch.trim() || f.label.toLowerCase().includes(fieldsSearch.toLowerCase())).map(f => (
                                                        <div key={f.id} className="flex items-center justify-between py-2 px-2 rounded hover:bg-zinc-50">
                                                            <span className="text-sm text-zinc-800">{f.label}</span>
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
                                        <TableCell colSpan={20} className="py-2.5 px-4 w-full">
                                            <button
                                                type="button"
                                                onClick={() => openInlineAdd(`parent:${parentId}`, parentId)}
                                                className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 w-full"
                                            >
                                                <div className="h-4 w-4 rounded-full border-2 border-dashed border-zinc-300" />
                                                Add Task
                                            </button>
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

            {dependenciesTask && (
                <TaskDependenciesModal
                    task={dependenciesTask}
                    open={!!dependenciesTask}
                    onOpenChange={(open) => !open && setDependenciesTask(null)}
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
        </div >
    );
}
