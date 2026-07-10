"use client";

import { TASK_LIST_PAGE_SIZE } from "@/features/dashboard/constants";
import { useGenericTaskViewData } from "@/features/dashboard/hooks/useGenericTaskViewData";
import { TaskListLoadMore } from "@/features/dashboard/components/shared/TaskListLoadMore";
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { generateKeyBetween } from "fractional-indexing";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Search, Plus, MoreHorizontal, SortAsc, X, Pin, Lock, ShieldCheck, Home,
    Calendar, Users, Flag, Clock, Paperclip, MessageSquare, Star, UserRound,
    Copy, CopyPlus, Trash2, Edit3, ArrowRight, ChevronRight, ChevronDown, CheckCheck, ChevronUp, ChevronsUp, GripVertical, CheckCircle2,
    LayoutList, SlidersHorizontal, ArrowUp, ArrowDown, Circle, Spline, Save,
    Link2, Target, Filter, Settings, Info, Play, ListChecks, AlignLeft, RefreshCcw,
    Type, Hash, CheckSquare, Tag, DollarSign, Globe, FunctionSquare, FileText,
    Phone, Mail, MapPin, TrendingUp, Heart, PenTool, MousePointer, ListTodo, AlertTriangle, CircleMinus, Link, Slash, Box, List as ListIcon,
    Archive, UserPlus, CalendarCheck, CalendarClock, CalendarRange, Hourglass, UserCheck, RefreshCw, Timer, Download, Undo, ToggleLeft, CircleSlash,
    Layers, ArrowUpRight, Bot, BarChart3, User
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { SingleDateCalendar } from "@/components/ui/date-picker";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { TaskCreationModal } from "@/entities/task/components/TaskCreationModal";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ListCreationModal } from "@/entities/task/components/ListCreationModal";
import { AssigneeSelector, cleanAssigneeIdsFromSelector, formatAssigneeIdsForSelector } from "@/entities/task/components/AssigneeSelector";
import { TaskActionsDropdown } from "@/entities/task/components/TaskActionsDropdown";
import { LazyTaskDetailModal as TaskDetailModal } from "@/entities/task/components/LazyTaskDetailModal";
import { TaskDependenciesModal } from "@/entities/task/components/TaskDependenciesModal";
import { TagsPopover } from "@/entities/task/components/TagsPopover";
import { CustomFieldRenderer } from "@/entities/task/components/CustomFieldRenderer";
import { DuplicateTaskModal } from "@/entities/task/components/DuplicateTaskModal";
import { DestinationPicker } from "@/entities/task/components/DestinationPicker";
import { ShareViewPermissionModal } from "@/features/dashboard/components/shared/ShareViewPermissionModal";
import { ViewToolbarSaveDropdown } from "@/features/dashboard/components/shared/ViewToolbarSaveDropdown";
import { ViewToolbarClosedPopover } from "@/features/dashboard/components/shared/ViewToolbarClosedPopover";
import { SidePanel } from "@/features/dashboard/components/shared/SidePanel";
import { parseEncodedTag, formatEncodedTag } from "@/entities/task/utils/tags";
import { TaskCalendar } from "@/entities/task/components/TaskCalendar";
import { TaskTypeIcon } from "@/entities/task/components/TaskTypeIcon";
import { format } from "date-fns";
import type { FilterCondition, FilterGroup, ListViewSavedConfig, FilterOperator } from "./listViewTypes";
import { FILTER_OPTIONS, FIELD_OPERATORS, STANDARD_FIELD_CONFIG } from "./listViewConstants";
import { evaluateGroup, hasFilterValue, hasAnyValueInGroup, getCustomFieldValue } from "./filterUtils";
export type { FilterOperator, FilterCondition, FilterGroup } from "./listViewTypes";
import {
    DndContext,
    DragOverlay,
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
    type DragMoveEvent,
} from "@dnd-kit/core";
import { DescriptionEditor } from "@/entities/shared/components/DescriptionEditor";
import { CSS } from "@dnd-kit/utilities";
import { Textarea } from "@/components/ui/textarea";

type Task = {
    id: string;
    title?: string;
    name?: string;
    description?: string | null;
    status?: { id: string; name: string; color?: string } | null;
    statusId?: string | null;
    priority?: string | null;
    dueDate?: string | Date | null;
    startDate?: string | Date | null;
    assignee?: { id: string; name?: string | null; email?: string | null; image?: string | null } | null;
    assigneeId?: string | null;
    assignees?: { user?: { id: string; name?: string | null; image?: string | null }; team?: { id: string; name?: string }; agent?: { id: string; name?: string; avatar?: string | null } }[];
    listId?: string | null;
    list?: { id: string; name: string; statuses?: { id: string; name: string; color: string }[] };
    tags?: string[];
    isStarred?: boolean;
    timeTracked?: string | null;
    timeEstimate?: string | null;
    _count?: { comments?: number; attachments?: number; other_tasks?: number; checklists?: number };
    parentId?: string | null;
    customFieldValues?: { id: string; customFieldId: string; value: any }[];
    taskType?: any;
    position?: string;
    order?: string;
};

const TAG_COLOR_PALETTE = [
    "#e5e7eb", // zinc-200
    "#fee2e2", // red-100
    "#ffedd5", // orange-100
    "#fef3c7", // amber-100
    "#dcfce7", // green-100
    "#dbeafe", // blue-100
    "#e0e7ff", // indigo-100
    "#f5d0fe", // fuchsia-100
    "#fce7f3", // pink-100
    "#f3e8ff", // violet-100
    "#e2f3ff", // custom light blue
    "#defbf6", // teal-ish
    "#fef9c3", // yellow-100
    "#fee2f2", // rose-100
];

const normalizeParentId = (parentId: any): string | null => {
    return (parentId && String(parentId).trim() !== "") ? String(parentId) : null;
};

// Add this helper to detect circular dependencies
const wouldCreateCircularDependency = (
    taskId: string,
    newParentId: string | null,
    tasks: any[]
): boolean => {
    if (!newParentId) return false;

    let currentId: string | null = newParentId;
    const visited = new Set<string>();

    while (currentId) {
        if (currentId === taskId) return true;
        if (visited.has(currentId)) return false; // Avoid infinite loop
        visited.add(currentId);

        const task = tasks.find(t => t.id === currentId);
        currentId = normalizeParentId(task?.parentId);
    }

    return false;
};
function DraggableTaskRow({
    id,
    children,
    dragHandle,
}: {
    id: string;
    children: (params: {
        setNodeRef: (node: HTMLElement | null) => void;
        style: React.CSSProperties;
        attributes: any;
        listeners: any;
        isDragging: boolean;
    }) => React.ReactNode;
    dragHandle?: boolean;
}) {
    const draggable = useDraggable({ id });
    const droppable = useDroppable({ id });

    const setNodeRef = (node: HTMLElement | null) => {
        draggable.setNodeRef(node);
        droppable.setNodeRef(node);
    };

    const { attributes, listeners, transform, isDragging } = draggable;
    // When dragging, keep row in place (no transform) so it stays visible and greyed out
    const style: React.CSSProperties = isDragging
        ? { opacity: 0.5 }
        : { transform: CSS.Transform.toString(transform), opacity: 1 };
    return <>{children({ setNodeRef, style, attributes, listeners, isDragging })}</>;
}

function DroppableGroupRow({
    id,
    children,
    className,
}: {
    id: string;
    children: React.ReactNode;
    className?: string;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
    });

    return (
        <TableRow
            ref={setNodeRef}
            className={cn(
                className
            )}
        >
            {children}
        </TableRow>
    );
}

export interface PeopleViewProps {
    spaceId?: string;
    projectId?: string;
    folderId?: string;
    teamId?: string;
    listId?: string;
    viewId?: string;
    workspaceId?: string;
    initialConfig?: Record<string, any> | null;
    selectedTaskIdFromParent?: string | null;
    onTaskSelect?: (taskId: string | null) => void;
    refetchViewData?: () => void;
}

type PeopleContentUser = {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    type?: string;
};

type PeopleContentTeam = {
    id: string;
    name?: string | null;
};

type PeopleSortBy = "tasks" | "incomplete" | "timeEstimate";
type WorkloadViewMode = "total" | "people" | "teams" | "agents";
type QuickCreateTaskInput = {
    title: string;
    assigneeIds: string[];
    statusId?: string | null;
    priority?: "URGENT" | "HIGH" | "NORMAL" | "LOW" | null;
    startDate?: Date | null;
    dueDate?: Date | null;
};

function getPeopleInitials(name?: string | null, email?: string | null) {
    if (name) return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    if (email) return email.slice(0, 2).toUpperCase();
    return "?";
}

function getPeopleStatusColor(s?: { color?: string; name?: string } | null) {
    if (s?.color) return s.color;
    const n = (s?.name ?? "").toLowerCase();
    if (n === "done" || n === "completed") return "#10b981";
    if (n.includes("progress")) return "#6366f1";
    return "#94a3b8";
}

function getDoneCount(tasks: Task[]) {
    return tasks.filter((t) => ["done", "completed"].includes((t.status?.name ?? "").toLowerCase())).length;
}

function parseTimeEstimateToMinutes(value: string | null | undefined) {
    if (!value) return 0;
    const v = value.trim().toLowerCase();
    if (!v) return 0;
    const asNumber = Number(v);
    if (!Number.isNaN(asNumber)) return asNumber;
    const match = v.match(/(\d+)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)?/);
    if (!match) return 0;
    const n = Number(match[1] ?? 0);
    const unit = match[2] ?? "m";
    if (["h", "hr", "hrs", "hour", "hours"].includes(unit)) return n * 60;
    return n;
}

function CompletionRing({ pct, size = 52 }: { pct: number; size?: number }) {
    const stroke = 4.5;
    const center = size / 2;
    const r = (size - stroke * 2) / 2;
    const circ = 2 * Math.PI * r;
    const dash = circ * (Math.max(0, Math.min(100, pct)) / 100);
    const color = pct >= 70 ? "#10b981" : pct >= 35 ? "#f59e0b" : "#f43f5e";
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
            <circle cx={center} cy={center} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
            <circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                transform={`rotate(-90 ${center} ${center})`}
            />
            <text x={center} y={center + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>
                {Math.round(pct)}%
            </text>
        </svg>
    );
}

function groupTasksByStatus(tasks: Task[]) {
    const groups = new Map<string, Task[]>();
    tasks.forEach((t) => {
        const key = t.status?.name?.trim() || "No status";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(t);
    });
    return Array.from(groups.entries())
        .map(([status, list]) => ({ status, tasks: list }))
        .sort((a, b) => b.tasks.length - a.tasks.length);
}

function WorkloadSegmentedBar({ tasks }: { tasks: Task[] }) {
    const done = getDoneCount(tasks);
    const inProgress = tasks.filter((t) => (t.status?.name ?? "").toLowerCase().includes("progress")).length;
    const toDo = Math.max(0, tasks.length - done - inProgress);
    const total = Math.max(1, tasks.length);
    const toDoPct = (toDo / total) * 100;
    const inProgressPct = (inProgress / total) * 100;
    const donePct = (done / total) * 100;
    return (
        <div className="mt-3">
            <div className="h-1.5 rounded-full bg-zinc-200 overflow-hidden flex">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="h-full bg-zinc-500" style={{ width: `${toDoPct}%` }} />
                    </TooltipTrigger>
                    <TooltipContent>{toDo} tasks to do</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="h-full bg-blue-500" style={{ width: `${inProgressPct}%` }} />
                    </TooltipTrigger>
                    <TooltipContent>{inProgress} tasks in progress</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="h-full bg-emerald-500" style={{ width: `${donePct}%` }} />
                    </TooltipTrigger>
                    <TooltipContent>{done} tasks done</TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
}

function CategorySummaryCard({
    label,
    entries,
    tasks,
    accent = "text-zinc-700",
}: {
    label: string;
    entries: number;
    tasks: Task[];
    accent?: string;
}) {
    const done = getDoneCount(tasks);
    const inProgress = tasks.filter((t) => (t.status?.name ?? "").toLowerCase().includes("progress")).length;
    const notDone = Math.max(0, tasks.length - done);
    const pct = tasks.length ? (done / tasks.length) * 100 : 0;
    return (
        <div className="rounded-xl border border-zinc-200/80 bg-gradient-to-b from-white to-zinc-50/30 p-3.5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-[10px] text-zinc-400 uppercase tracking-wider">{label}</div>
                    <div className={cn("mt-1 text-xl font-bold", accent)}>{entries}</div>
                    <div className="text-[10px] text-zinc-400">entries</div>
                </div>
                <CompletionRing pct={pct} size={58} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-md bg-zinc-100/70 px-2 py-1.5">
                    <div className="text-sm font-semibold text-blue-600">{inProgress}</div>
                    <div className="text-[10px] text-zinc-500">Active</div>
                </div>
                <div className="rounded-md bg-zinc-100/70 px-2 py-1.5">
                    <div className="text-sm font-semibold text-emerald-600">{done}</div>
                    <div className="text-[10px] text-zinc-500">Done</div>
                </div>
            </div>
            <div className="mt-2">
                <WorkloadSegmentedBar tasks={tasks} />
                <div className="mt-1 text-[10px] text-zinc-400">{notDone} not done / {tasks.length} total tasks</div>
            </div>
        </div>
    );
}

function CardQuickAdd({
    open,
    onOpenChange,
    defaultAssigneeIds = [],
    users,
    teams,
    agents,
    statuses,
    onSave,
    saving,
    forceEmptyAssigneeOnOpen = false,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultAssigneeIds?: string[];
    users: PeopleContentUser[];
    teams?: PeopleContentTeam[];
    agents?: PeopleContentUser[];
    statuses: { id: string; name: string; color?: string }[];
    onSave: (input: QuickCreateTaskInput) => Promise<void> | void;
    saving?: boolean;
    forceEmptyAssigneeOnOpen?: boolean;
}) {
    const [title, setTitle] = useState("");
    const [assigneeIds, setAssigneeIds] = useState<string[]>(defaultAssigneeIds);
    const [statusId, setStatusId] = useState<string | null>(null);
    const [priority, setPriority] = useState<"URGENT" | "HIGH" | "NORMAL" | "LOW" | null>(null);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [dueDate, setDueDate] = useState<Date | null>(null);

    useEffect(() => {
        if (!open) return;
        setTitle("");
        setAssigneeIds(forceEmptyAssigneeOnOpen ? [] : defaultAssigneeIds);
        setStatusId(null);
        setPriority(null);
        setStartDate(null);
        setDueDate(null);
    }, [open, defaultAssigneeIds, forceEmptyAssigneeOnOpen]);

    const doSave = async () => {
        const trimmed = title.trim();
        if (!trimmed || saving) return;
        await onSave({ title: trimmed, assigneeIds, statusId, priority, startDate, dueDate });
        onOpenChange(false);
    };

    if (!open) return null;
    const firstAssignee = assigneeIds[0];
    const firstType = firstAssignee?.includes(":") ? firstAssignee.split(":")[0] : "user";
    const firstId = firstAssignee?.includes(":") ? firstAssignee.split(":")[1] : firstAssignee;
    const firstUser = users.find((u) => u.id === firstId);
    const avatarLabel = firstType === "agent" ? "AG" : firstType === "team" ? "TM" : (firstUser?.name?.slice(0, 2).toUpperCase() || "DN");
    const selectedStatus = statuses.find((s) => s.id === statusId);
    return (
        <div className="mt-2 border border-zinc-300 rounded-md bg-white p-2.5 space-y-3 min-h-[110px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-2 min-h-[34px]">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button type="button" className="text-zinc-300 hover:text-zinc-500 shrink-0 cursor-pointer" onClick={() => onOpenChange(false)}>
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>Close</TooltipContent>
                </Tooltip>
                <Input
                    className="h-8 border-0 bg-transparent px-0 text-[13px] font-medium shadow-none focus-visible:ring-0"
                    placeholder="Task Name or type '/' for commands"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            await doSave();
                        }
                    }}
                    autoFocus
                />
                <AssigneeSelector
                    users={users as any}
                    teams={teams as any}
                    agents={agents as any}
                    value={assigneeIds}
                    onChange={setAssigneeIds}
                    variant="compact"
                    align="end"
                    trigger={
                        <Avatar className="h-7 w-7 cursor-pointer" title="Assignee">
                            <AvatarFallback className="text-[10px] bg-zinc-200 text-zinc-700">
                                {assigneeIds.length > 0 ? avatarLabel : <User className="h-3.5 w-3.5 text-zinc-500" />}
                            </AvatarFallback>
                        </Avatar>
                    }
                />
            </div>
            <div className="flex items-center gap-1.5 border-t border-zinc-100 pt-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            title="Status"
                            className={cn("h-7 w-7 hover:bg-zinc-100", selectedStatus ? "text-zinc-700" : "text-zinc-500")}
                        >
                            <span
                                className="h-3 w-3 rounded-full border-[2.5px]"
                                style={{ borderColor: selectedStatus?.color || "#9ca3af" }}
                            />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuLabel className="text-xs">Status</DropdownMenuLabel>
                        {statuses.map((s) => (
                            <DropdownMenuItem
                                key={s.id}
                                onClick={() => setStatusId(s.id)}
                                className={cn("cursor-pointer", statusId === s.id && "bg-zinc-100")}
                            >
                                <span className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: s.color || "#94a3b8" }} />
                                {s.name}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" title="Priority" className={cn("h-7 w-7 hover:bg-zinc-100",
                            priority === "URGENT" ? "text-red-500" :
                                priority === "HIGH" ? "text-orange-500" :
                                    priority === "NORMAL" ? "text-blue-500" :
                                        priority === "LOW" ? "text-zinc-500" : "text-zinc-500"
                        )}><Flag className="h-3.5 w-3.5 fill-current" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                        <DropdownMenuItem onClick={() => setPriority("URGENT")}><Flag className="h-3 w-3 mr-2 text-red-600 fill-current" />Urgent</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPriority("HIGH")}><Flag className="h-3 w-3 mr-2 text-orange-600 fill-current" />High</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPriority("NORMAL")}><Flag className="h-3 w-3 mr-2 text-blue-600 fill-current" />Normal</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPriority("LOW")}><Flag className="h-3 w-3 mr-2 text-slate-600 fill-current" />Low</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setPriority(null)}><CircleSlash className="h-3 w-3 mr-2 text-slate-500" />Clear</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" title="Start date" className="h-7 px-2 text-xs text-zinc-600 hover:bg-zinc-100">
                            <CalendarCheck className="h-3.5 w-3.5 mr-1" />
                            {startDate ? format(startDate, "MMM d") : "Start"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <SingleDateCalendar
                            selectedDate={startDate ?? undefined}
                            onDateChange={(d) => setStartDate(d ?? null)}
                        />
                    </PopoverContent>
                </Popover>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" title="Due date" className="h-7 px-2 text-xs text-zinc-600 hover:bg-zinc-100">
                            <Calendar className="h-3.5 w-3.5 mr-1" />
                            {dueDate ? format(dueDate, "MMM d") : "Due"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <SingleDateCalendar
                            selectedDate={dueDate ?? undefined}
                            onDateChange={(d) => setDueDate(d ?? null)}
                        />
                    </PopoverContent>
                </Popover>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="sm" className="h-7 ml-auto text-[10px] font-bold bg-zinc-700 hover:bg-zinc-800 text-white" onClick={() => void doSave()} disabled={!title.trim() || !!saving}>
                            Save
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Save task</TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
}

function PeopleTaskRow({ task, onOpenTask }: { task: Task; onOpenTask?: (taskId: string) => void }) {
    return (
        <button
            type="button"
            className="w-full group/task flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-50 text-left cursor-pointer"
            onClick={() => onOpenTask?.(task.id)}
        >
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: getPeopleStatusColor(task.status) }} />
            <span className="flex-1 min-w-0 text-xs text-zinc-700 truncate group-hover/task:text-blue-600">{task.title || task.name || "(Untitled)"}</span>
            <ArrowUpRight className="h-3 w-3 text-zinc-300 shrink-0 opacity-0 group-hover/task:opacity-100" />
        </button>
    );
}

function PeopleCard({
    person,
    tasks,
    isAgent,
    onOpenTask,
    users,
    teams,
    agents,
    statuses,
    onCreateTask,
}: {
    person: PeopleContentUser;
    tasks: Task[];
    isAgent?: boolean;
    onOpenTask?: (taskId: string) => void;
    users: PeopleContentUser[];
    teams?: PeopleContentTeam[];
    agents?: PeopleContentUser[];
    statuses: { id: string; name: string; color?: string }[];
    onCreateTask?: (input: QuickCreateTaskInput) => Promise<void> | void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [collapsedStatuses, setCollapsedStatuses] = useState<Record<string, boolean>>({});
    const done = getDoneCount(tasks);
    const active = tasks.filter((t) => (t.status?.name ?? "").toLowerCase().includes("progress")).length;
    const pct = tasks.length ? (done / tasks.length) * 100 : 0;
    const groupedByStatus = useMemo(() => groupTasksByStatus(tasks), [tasks]);

    return (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md">
            <div className="p-3.5">
                <div className="relative flex items-start gap-3">
                    <Avatar className="h-9 w-9 shrink-0 ring-2 ring-white shadow-sm">
                        <AvatarImage src={person.image ?? undefined} />
                        <AvatarFallback className="text-xs font-semibold bg-zinc-100 text-zinc-700">
                            {isAgent ? <Bot className="h-4 w-4" /> : getPeopleInitials(person.name, person.email)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-semibold text-zinc-900 truncate">{person.name ?? person.email ?? "Unknown"}</span>
                            {isAgent && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100">Agent</span>}
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{person.email ?? ""}</p>
                    </div>
                    <div className="shrink-0 pt-0.5 pr-8">
                        <CompletionRing pct={pct} size={56} />
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 absolute top-0 right-0" onClick={() => setAddOpen((v) => !v)}>
                        <Plus className="h-4 w-4 text-zinc-500" />
                    </Button>
                </div>
                <CardQuickAdd
                    open={addOpen}
                    onOpenChange={setAddOpen}
                    defaultAssigneeIds={[`${isAgent ? "agent" : "user"}:${person.id}`]}
                    users={users}
                    teams={teams}
                    agents={agents}
                    statuses={statuses}
                    onSave={async (input) => {
                        await onCreateTask?.(input);
                    }}
                />
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-zinc-50 rounded-lg py-1.5"><div className="text-base font-bold text-zinc-800">{tasks.length}</div><div className="text-[10px] text-zinc-400">Total</div></div>
                    <div className="bg-zinc-50 rounded-lg py-1.5"><div className="text-base font-bold text-blue-600">{active}</div><div className="text-[10px] text-zinc-400">Active</div></div>
                    <div className="bg-zinc-50 rounded-lg py-1.5"><div className="text-base font-bold text-emerald-600">{done}</div><div className="text-[10px] text-zinc-400">Done</div></div>
                </div>
                <WorkloadSegmentedBar tasks={tasks} />
            </div>
            <div className="border-t border-zinc-100">
                <button type="button" className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-50" onClick={() => setExpanded((v) => !v)}>
                    <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" />{tasks.length} task{tasks.length !== 1 ? "s" : ""}</span>
                    {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
            </div>
            {expanded && (
                <div className="border-t border-zinc-100 px-1 py-1 space-y-0.5">
                    {groupedByStatus.map((group) => {
                        const isCollapsed = collapsedStatuses[group.status] ?? false;
                        return (
                            <div key={group.status} className="mb-1">
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between px-2 py-1 rounded-md hover:bg-zinc-50"
                                    onClick={() => setCollapsedStatuses((prev) => ({ ...prev, [group.status]: !isCollapsed }))}
                                >
                                    <span className="text-[11px] font-semibold text-zinc-600">{group.status}</span>
                                    <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                                        {group.tasks.length}
                                        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                    </span>
                                </button>
                                {!isCollapsed && group.tasks.slice(0, 15).map((t) => <PeopleTaskRow key={t.id} task={t} onOpenTask={onOpenTask} />)}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function UnassignedCard({
    tasks,
    onOpenTask,
    users,
    teams,
    agents,
    statuses,
    onCreateTask,
}: {
    tasks: Task[];
    onOpenTask?: (taskId: string) => void;
    users: PeopleContentUser[];
    teams?: PeopleContentTeam[];
    agents?: PeopleContentUser[];
    statuses: { id: string; name: string; color?: string }[];
    onCreateTask?: (input: QuickCreateTaskInput) => Promise<void> | void;
}) {
    const [expanded, setExpanded] = useState(true);
    const [addOpen, setAddOpen] = useState(false);
    const [collapsedStatuses, setCollapsedStatuses] = useState<Record<string, boolean>>({});
    const done = getDoneCount(tasks);
    const active = tasks.filter((t) => (t.status?.name ?? "").toLowerCase().includes("progress")).length;
    const pct = tasks.length ? (done / tasks.length) * 100 : 0;
    const groupedByStatus = useMemo(() => groupTasksByStatus(tasks), [tasks]);
    return (
        <div className="bg-white border border-amber-200/70 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-amber-300/70 transition-all">
            <div className="p-3.5">
                <div className="relative flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-amber-50 border-2 border-dashed border-amber-200 flex items-center justify-center shrink-0">
                        <UserRound className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900">Unassigned</p>
                        <p className="text-[11px] text-zinc-400">Tasks with no assignee</p>
                    </div>
                    <div className="ml-auto shrink-0 pt-0.5 pr-8">
                        <CompletionRing pct={pct} size={56} />
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 absolute top-0 right-0" onClick={() => setAddOpen((v) => !v)}>
                        <Plus className="h-4 w-4 text-zinc-500" />
                    </Button>
                </div>
                <CardQuickAdd
                    open={addOpen}
                    onOpenChange={setAddOpen}
                    defaultAssigneeIds={[]}
                    forceEmptyAssigneeOnOpen
                    users={users}
                    teams={teams}
                    agents={agents}
                    statuses={statuses}
                    onSave={async (input) => {
                        await onCreateTask?.(input);
                    }}
                />
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-zinc-50 rounded-lg py-1.5"><div className="text-base font-bold text-zinc-800">{tasks.length}</div><div className="text-[10px] text-zinc-400">Total</div></div>
                    <div className="bg-zinc-50 rounded-lg py-1.5"><div className="text-base font-bold text-blue-600">{active}</div><div className="text-[10px] text-zinc-400">Active</div></div>
                    <div className="bg-zinc-50 rounded-lg py-1.5"><div className="text-base font-bold text-emerald-600">{done}</div><div className="text-[10px] text-zinc-400">Done</div></div>
                </div>
                <WorkloadSegmentedBar tasks={tasks} />
            </div>
            <div className="border-t border-zinc-100">
                <button type="button" className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-50" onClick={() => setExpanded((v) => !v)}>
                    <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" />{tasks.length} task{tasks.length !== 1 ? "s" : ""}</span>
                    {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
            </div>
            {expanded && (
                <div className="border-t border-zinc-100 px-1 py-1 space-y-0.5">
                    {groupedByStatus.map((group) => {
                        const isCollapsed = collapsedStatuses[group.status] ?? false;
                        return (
                            <div key={group.status} className="mb-1">
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between px-2 py-1 rounded-md hover:bg-zinc-50"
                                    onClick={() => setCollapsedStatuses((prev) => ({ ...prev, [group.status]: !isCollapsed }))}
                                >
                                    <span className="text-[11px] font-semibold text-zinc-600">{group.status}</span>
                                    <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                                        {group.tasks.length}
                                        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                    </span>
                                </button>
                                {!isCollapsed && group.tasks.slice(0, 12).map((t) => <PeopleTaskRow key={t.id} task={t} onOpenTask={onOpenTask} />)}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function SectionHeader({
    label,
    count,
    collapsed,
    onToggle,
    icon,
}: {
    label: string;
    count: number;
    collapsed: boolean;
    onToggle: () => void;
    icon?: React.ReactNode;
}) {
    return (
        <button type="button" className="w-full flex items-center gap-2 mb-3 text-left group/sh" onClick={onToggle}>
            {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-zinc-400" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />}
            {icon}
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-zinc-100 text-zinc-500 rounded-full font-medium">{count}</span>
            <div className="flex-1 h-px bg-zinc-100 group-hover/sh:bg-zinc-200" />
        </button>
    );
}

function TeamCard({ team }: { team: PeopleContentTeam }) {
    return (
        <div className="bg-white border border-indigo-100 rounded-xl p-3.5">
            <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center"><Users className="h-4 w-4 text-indigo-500" /></div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate">{team.name ?? "Unnamed Team"}</p>
                    <p className="text-[11px] text-zinc-400">Team</p>
                </div>
            </div>
        </div>
    );
}

function PeopleViewSkeleton() {
    return (
        <div className="p-5 h-full min-h-0 overflow-y-auto peopleview-scrollbar animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 mb-5">
                {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={`top-skeleton-${idx}`} className="rounded-xl border border-zinc-200/80 bg-white p-3.5">
                        <div className="h-3 w-16 rounded bg-zinc-200 mb-2" />
                        <div className="h-7 w-10 rounded bg-zinc-200 mb-3" />
                        <div className="h-2 w-full rounded bg-zinc-200" />
                    </div>
                ))}
            </div>
            <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={`card-skeleton-${idx}`} className="rounded-xl border border-zinc-200/80 bg-white p-3.5">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-zinc-200" />
                            <div className="flex-1">
                                <div className="h-3 w-32 rounded bg-zinc-200 mb-2" />
                                <div className="h-2 w-24 rounded bg-zinc-200" />
                            </div>
                            <div className="h-12 w-12 rounded-full bg-zinc-200" />
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="h-10 rounded bg-zinc-100" />
                            <div className="h-10 rounded bg-zinc-100" />
                            <div className="h-10 rounded bg-zinc-100" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PeopleViewContent({
    users,
    agents = [],
    tasks,
    teams = [],
    searchQuery = "",
    sortBy = "incomplete",
    loading = false,
    availableStatuses = [],
    onCreateTask,
    onOpenTask,
}: {
    users: PeopleContentUser[];
    agents?: PeopleContentUser[];
    tasks: Task[];
    teams?: PeopleContentTeam[];
    searchQuery?: string;
    sortBy?: PeopleSortBy;
    loading?: boolean;
    availableStatuses?: { id: string; name: string; color?: string }[];
    onCreateTask?: (input: QuickCreateTaskInput) => Promise<void> | void;
    onOpenTask?: (taskId: string) => void;
}) {
    const [collapseUnassigned, setCollapseUnassigned] = useState(false);
    const [collapsePeople, setCollapsePeople] = useState(false);
    const [collapseAgents, setCollapseAgents] = useState(false);
    const [collapseTeams, setCollapseTeams] = useState(false);

    const q = searchQuery.toLowerCase();
    const filteredUsers = useMemo(() => users.filter((u) => !q || (u.name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q)), [users, q]);
    const filteredAgents = useMemo(() => agents.filter((a) => !q || (a.name ?? "").toLowerCase().includes(q)), [agents, q]);
    const filteredTeams = useMemo(() => teams.filter((t) => !q || (t.name ?? "").toLowerCase().includes(q)), [teams, q]);

    const tasksByUser = useMemo(() => {
        const map = new Map<string, Task[]>();
        tasks.forEach((t) => {
            (t.assignees ?? []).forEach((a) => {
                const uid = a.user?.id ?? a.agent?.id;
                if (!uid) return;
                if (!map.has(uid)) map.set(uid, []);
                map.get(uid)!.push(t);
            });
        });
        return map;
    }, [tasks]);

    const unassignedTasks = useMemo(() => tasks.filter((t) => !t.assignees || t.assignees.length === 0), [tasks]);

    const uniqueTasksBy = useCallback((predicate: (task: Task) => boolean) => {
        const map = new Map<string, Task>();
        tasks.forEach((t) => {
            if (predicate(t)) map.set(t.id, t);
        });
        return Array.from(map.values());
    }, [tasks]);

    const peopleIdSet = useMemo(() => new Set(filteredUsers.map((u) => u.id)), [filteredUsers]);
    const agentIdSet = useMemo(() => new Set(filteredAgents.map((a) => a.id)), [filteredAgents]);
    const teamIdSet = useMemo(() => new Set(filteredTeams.map((t) => t.id)), [filteredTeams]);

    const peopleCategoryTasks = useMemo(
        () => uniqueTasksBy((t) => (t.assignees ?? []).some((a: any) => a.user?.id && peopleIdSet.has(a.user.id))),
        [uniqueTasksBy, peopleIdSet]
    );
    const agentsCategoryTasks = useMemo(
        () => uniqueTasksBy((t) => (t.assignees ?? []).some((a: any) => a.agent?.id && agentIdSet.has(a.agent.id))),
        [uniqueTasksBy, agentIdSet]
    );
    const teamsCategoryTasks = useMemo(
        () => uniqueTasksBy((t) => (t.assignees ?? []).some((a: any) => a.team?.id && teamIdSet.has(a.team.id))),
        [uniqueTasksBy, teamIdSet]
    );

    const rankPerson = useCallback((id: string) => {
        const list = tasksByUser.get(id) ?? [];
        const done = getDoneCount(list);
        const incomplete = Math.max(0, list.length - done);
        const estimate = list.reduce((acc, t) => acc + parseTimeEstimateToMinutes(t.timeEstimate), 0);
        if (sortBy === "tasks") return list.length;
        if (sortBy === "timeEstimate") return estimate;
        return incomplete;
    }, [tasksByUser, sortBy]);

    const sortedUsers = useMemo(() => [...filteredUsers].sort((a, b) => rankPerson(b.id) - rankPerson(a.id)), [filteredUsers, rankPerson]);
    const sortedAgents = useMemo(() => [...filteredAgents].sort((a, b) => rankPerson(b.id) - rankPerson(a.id)), [filteredAgents, rankPerson]);

    if (loading) return <PeopleViewSkeleton />;

    return (
        <div className="p-5 overflow-y-auto h-full min-h-0 peopleview-scrollbar bg-zinc-50/45">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 mb-5">
                <CategorySummaryCard label="People" entries={filteredUsers.length} tasks={peopleCategoryTasks} accent="text-blue-700" />
                <CategorySummaryCard label="Agents" entries={filteredAgents.length} tasks={agentsCategoryTasks} accent="text-purple-700" />
                <CategorySummaryCard label="Teams" entries={filteredTeams.length} tasks={teamsCategoryTasks} accent="text-indigo-700" />
                <CategorySummaryCard label="Unassigned" entries={unassignedTasks.length} tasks={unassignedTasks} accent="text-amber-700" />
            </div>

            {unassignedTasks.length > 0 && (
                <div className="mb-6">
                    <SectionHeader label="Unassigned" count={unassignedTasks.length} collapsed={collapseUnassigned} onToggle={() => setCollapseUnassigned((v) => !v)} icon={<UserRound className="h-3.5 w-3.5 text-amber-500" />} />
                    {!collapseUnassigned && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                            <UnassignedCard
                                tasks={unassignedTasks}
                                onOpenTask={onOpenTask}
                                users={users}
                                teams={filteredTeams}
                                agents={agents}
                                statuses={availableStatuses}
                                onCreateTask={onCreateTask}
                            />
                        </div>
                    )}
                </div>
            )}

            <div className="mb-6">
                <SectionHeader label="People" count={sortedUsers.length} collapsed={collapsePeople} onToggle={() => setCollapsePeople((v) => !v)} icon={<UserRound className="h-3.5 w-3.5 text-blue-400" />} />
                {!collapsePeople && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                        {sortedUsers.map((u) => (
                            <PeopleCard
                                key={u.id}
                                person={u}
                                tasks={tasksByUser.get(u.id) ?? []}
                                onOpenTask={onOpenTask}
                                users={users}
                                teams={filteredTeams}
                                agents={agents}
                                statuses={availableStatuses}
                                onCreateTask={onCreateTask}
                            />
                        ))}
                    </div>
                )}
            </div>

            {sortedAgents.length > 0 && (
                <div className="mb-6">
                    <SectionHeader label="Agents" count={sortedAgents.length} collapsed={collapseAgents} onToggle={() => setCollapseAgents((v) => !v)} icon={<Bot className="h-3.5 w-3.5 text-purple-400" />} />
                    {!collapseAgents && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                            {sortedAgents.map((a) => (
                                <PeopleCard
                                    key={a.id}
                                    person={a}
                                    tasks={tasksByUser.get(a.id) ?? []}
                                    isAgent
                                    onOpenTask={onOpenTask}
                                    users={users}
                                    teams={filteredTeams}
                                    agents={agents}
                                    statuses={availableStatuses}
                                    onCreateTask={onCreateTask}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {filteredTeams.length > 0 && (
                <div>
                    <SectionHeader label="Teams" count={filteredTeams.length} collapsed={collapseTeams} onToggle={() => setCollapseTeams((v) => !v)} icon={<Users className="h-3.5 w-3.5 text-indigo-400" />} />
                    {!collapseTeams && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                            {filteredTeams.map((t) => <TeamCard key={t.id} team={t} />)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const CREATE_FIELD_TYPES = [
    // Basic fields
    { id: "TEXT", label: "Text", icon: Type, type: "TEXT" },
    { id: "NUMBER", label: "Number", icon: Hash, type: "NUMBER" },
    { id: "DATE", label: "Date", icon: Calendar, type: "DATE" },
    { id: "CHECKBOX", label: "Checkbox", icon: CheckSquare, type: "CHECKBOX" },
    { id: "DROPDOWN", label: "Dropdown", icon: LayoutList, type: "DROPDOWN" },

    // Text fields
    { id: "TEXT_AREA", label: "Text area (Long Text)", icon: AlignLeft, type: "TEXT_AREA" },
    { id: "LONG_TEXT", label: "Long Text", icon: AlignLeft, type: "LONG_TEXT" },
    { id: "CUSTOM_TEXT", label: "Custom Text", icon: Type, type: "CUSTOM_TEXT" },

    // Selection fields
    { id: "LABELS", label: "Labels", icon: Tag, type: "LABELS" },
    { id: "CUSTOM_DROPDOWN", label: "Custom Dropdown", icon: LayoutList, type: "CUSTOM_DROPDOWN" },
    { id: "CATEGORIZE", label: "Categorize", icon: Target, type: "CATEGORIZE" },
    { id: "TSHIRT_SIZE", label: "T-Shirt Size", icon: Users, type: "TSHIRT_SIZE" },

    // Contact fields
    { id: "EMAIL", label: "Email", icon: Mail, type: "EMAIL" },
    { id: "PHONE", label: "Phone", icon: Phone, type: "PHONE" },
    { id: "URL", label: "Website", icon: Globe, type: "URL" },

    // Financial & numeric
    { id: "MONEY", label: "Money", icon: DollarSign, type: "MONEY" },
    { id: "FORMULA", label: "Formula", icon: FunctionSquare, type: "FORMULA" },

    // Files & attachments
    { id: "FILES", label: "Files", icon: Paperclip, type: "FILES" },

    // Relationships
    { id: "RELATIONSHIP", label: "Relationship", icon: Link2, type: "RELATIONSHIP" },
    { id: "PEOPLE", label: "People", icon: Users, type: "PEOPLE" },
    { id: "TASKS", label: "Tasks", icon: ListTodo, type: "TASKS" },

    // Progress & tracking
    { id: "PROGRESS_AUTO", label: "Progress (Auto)", icon: TrendingUp, type: "PROGRESS_AUTO" },
    { id: "PROGRESS_MANUAL", label: "Progress (Manual)", icon: SlidersHorizontal, type: "PROGRESS_MANUAL" },

    // AI & special fields
    { id: "SUMMARY", label: "Summary", icon: FileText, type: "SUMMARY" },
    { id: "PROGRESS_UPDATES", label: "Progress Updates", icon: MessageSquare, type: "PROGRESS_UPDATES" },
    { id: "TRANSLATION", label: "Translation", icon: Globe, type: "TRANSLATION" },
    { id: "SENTIMENT", label: "Sentiment", icon: Heart, type: "SENTIMENT" },

    // Location & other
    { id: "LOCATION", label: "Location", icon: MapPin, type: "LOCATION" },
    { id: "RATING", label: "Rating", icon: Star, type: "RATING" },
    { id: "VOTING", label: "Voting", icon: Users, type: "VOTING" },
    { id: "SIGNATURE", label: "Signature", icon: PenTool, type: "SIGNATURE" },
    { id: "BUTTON", label: "Button", icon: MousePointer, type: "BUTTON" },
    { id: "ACTION_ITEMS", label: "Action Items", icon: ListChecks, type: "ACTION_ITEMS" },
];

function stableStringify(obj: any) {
    const sortObject = (v: any): any => {
        if (Array.isArray(v)) return [...v].map(sortObject);
        if (v && typeof v === "object") {
            return Object.keys(v).sort().reduce((acc: any, k) => {
                acc[k] = sortObject(v[k]);
                return acc;
            }, {});
        }
        return v;
    };
    return JSON.stringify(sortObject(obj));
}

export function PeopleView({ spaceId, projectId, teamId, listId, folderId, viewId, workspaceId, initialConfig, selectedTaskIdFromParent, onTaskSelect, refetchViewData }: PeopleViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchQuery, setSearchQuery] = useState("");
    const [toolbarSearchOpen, setToolbarSearchOpen] = useState(false);
    const [selectedDetailTaskId, setSelectedDetailTaskId] = useState<string | null>(null);
    const effectiveSelectedTaskId = onTaskSelect ? (selectedTaskIdFromParent ?? null) : selectedDetailTaskId;

    // Refs for batching updates to prevent UI stutter and race conditions
    const pendingUpdatesRef = useRef<Map<string, any>>(new Map());
    const batchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const toolbarSearchRef = useRef<HTMLDivElement | null>(null);
    const toolbarSearchInputRef = useRef<HTMLInputElement | null>(null);
    const openTaskDetail = (taskId: string) => {
        if (onTaskSelect) onTaskSelect(taskId);
        else setSelectedDetailTaskId(taskId);
    };
    const closeTaskDetail = () => {
        if (onTaskSelect) onTaskSelect(null);
        else setSelectedDetailTaskId(null);
    };


    useEffect(() => {
        if (!toolbarSearchOpen) return;
        toolbarSearchInputRef.current?.focus();
    }, [toolbarSearchOpen]);

    useEffect(() => {
        if (!toolbarSearchOpen) return;
        const onMouseDown = (event: MouseEvent) => {
            if (!toolbarSearchRef.current) return;
            if (!toolbarSearchRef.current.contains(event.target as Node)) {
                setToolbarSearchOpen(false);
            }
        };
        document.addEventListener("mousedown", onMouseDown);
        return () => document.removeEventListener("mousedown", onMouseDown);
    }, [toolbarSearchOpen]);

    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<"manual" | "name" | "dueDate" | "priority" | "status">("manual");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [filterStatus, setFilterStatus] = useState<string[]>([]);
    const [filterPriority, setFilterPriority] = useState<string[]>([]);
    const [filterAssignee, setFilterAssignee] = useState<string[]>([]);
    const [showCompleted, setShowCompleted] = useState(false);
    const [showCompletedSubtasks, setShowCompletedSubtasks] = useState(false);
    const [groupBy, setGroupBy] = useState<string>(
        () => (listId ? "status" : "list")
    );
    const [groupDirection, setGroupDirection] = useState<"asc" | "desc">("asc");
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [expandedSubtaskMode, setExpandedSubtaskMode] = useState<"collapsed" | "expanded" | "separate">("separate");
    const [fieldsPanelOpen, setFieldsPanelOpen] = useState(false);
    const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
    const [filterGroups, setFilterGroups] = useState<FilterGroup>(() => ({
        id: "root",
        operator: "AND",
        // Start with no conditions so the empty ClickUp-style state shows until user adds one
        conditions: [],
    }));
    const [savedFiltersPanelOpen, setSavedFiltersPanelOpen] = useState(false);
    const [savedFilterName, setSavedFilterName] = useState("");
    const [savedFiltersSearch, setSavedFiltersSearch] = useState("");
    const [savedFilters, setSavedFilters] = useState<{ id: string, name: string, config: FilterGroup }[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('agentflox_saved_filters');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    const updateViewMutation = trpc.view.update.useMutation();
    const createViewMutation = trpc.view.create.useMutation({
        onSuccess: (newView) => {
            toast.success(`Created new view: ${newView.name}`);
            void utils.view.get.invalidate();
        }
    });
    const { data: viewData } = trpc.view.get.useQuery({ id: viewId as string }, { staleTime: 60_000, gcTime: 5 * 60_000, enabled: !!viewId });
    const [viewNameDraft, setViewNameDraft] = useState("");

    // Default view settings
    const [isDefaultViewSettingsModalOpen, setIsDefaultViewSettingsModalOpen] = useState(false);
    const [defaultViewSettingsApplyTo, setDefaultViewSettingsApplyTo] = useState<"NEW" | "REQUIRED" | "ALL">("NEW");
    /** @type {Partial<ListViewSavedConfig>} */
    const [defaultViewSettingsDraft, setDefaultViewSettingsDraft] = useState({});

    const updateSpaceMutation = trpc.space.update.useMutation({
        onSuccess: () => {
            void utils.space.get.invalidate({ id: spaceId as string });
        }
    });

    const updateManyViewsMutation = trpc.view.updateMany.useMutation({
        onSuccess: () => {
            void utils.view.list.invalidate();
        }
    });

    useEffect(() => {
        if (viewData) {
            setViewNameDraft(viewData.name || "");
            setPinView(viewData.isPinned || false);
            setPrivateView(viewData.isPrivate || false);
            setProtectView(viewData.isLocked || false);
            setDefaultView(viewData.isDefault || false);
            // Load autosave state from view config
            const cfg = (viewData.config as any)?.listView;
            if (typeof cfg?.viewAutosave === "boolean") setViewAutosave(cfg.viewAutosave);
        }
    }, [viewData]);

    const updateViewProperty = async (property: string, value: any) => {
        if (!viewId) return;
        try {
            await updateViewMutation.mutateAsync({ id: viewId, [property]: value });
            void utils.view.get.invalidate({ id: viewId });
            if (typeof value === 'boolean') {
                const label = property.replace('is', '');
                toast.success(`View ${label.toLowerCase()} ${value ? 'enabled' : 'disabled'}`);
            }
        } catch (e) {
            toast.error(`Failed to update ${property}`);
        }
    };

    const updateViewName = async (newName: string) => {
        if (!viewId || !newName.trim()) return;
        const trimmed = newName.trim();
        const oldName = viewData?.name || "";
        setViewNameDraft(trimmed);

        // Optimistically patch all parent caches so the tab bar updates immediately
        const patchViews = (views: any[]) => views.map((v: any) => v.id === viewId ? { ...v, name: trimmed } : v);

        // Update generic caches
        if (spaceId) utils.space?.get?.setData({ id: spaceId }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);
        if (projectId) utils.project?.get?.setData({ id: projectId }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);
        if (teamId) utils.team?.get?.setData({ id: teamId }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);
        if (folderId) utils.folder?.get?.setData({ id: folderId }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);
        if (listId) utils.list?.get?.setData({ id: listId }, (old: any) => old ? { ...old, views: patchViews(old.views ?? []) } : old);

        // Use a generic approach to update list.byContext
        const listByContextInput = workspaceId || spaceId || projectId || teamId
            ? {
                workspaceId: workspaceId || undefined,
                spaceId: spaceId || undefined,
                projectId: projectId || undefined,
                teamId: teamId || undefined,
                folderId: folderId || undefined,
            }
            : null;

        const updateListByContext = () => {
            try {
                if (listByContextInput && utils.list?.byContext?.setData) {
                    utils.list.byContext.setData(listByContextInput, (old: any) => {
                        if (!old || !old.items) return old;
                        return {
                            ...old,
                            items: old.items.map((l: any) => l.id === listId ? { ...l, views: patchViews(l.views ?? []) } : l)
                        };
                    });
                }
            } catch (e) { }
        };
        updateListByContext();

        try {
            await updateViewMutation.mutateAsync({ id: viewId, name: trimmed });
            if (utils.view?.get) await utils.view.get.invalidate({ id: viewId });
            if (utils.view?.list) await utils.view.list.invalidate();
            if (spaceId && utils.space?.get) void utils.space.get.invalidate({ id: spaceId });
            if (projectId && utils.project?.get) void utils.project.get.invalidate({ id: projectId });
            if (teamId && utils.team?.get) void utils.team.get.invalidate({ id: teamId });
            if (folderId && utils.folder?.get) void utils.folder.get.invalidate({ id: folderId });
            if (listId && utils.list?.get) void utils.list.get.invalidate({ id: listId });
            if (listId && utils.list?.byContext) void utils.list.byContext.invalidate();

            if (typeof refetchViewData === 'function') void refetchViewData();
        } catch (e) {
            setViewNameDraft(oldName);

            // Revert optimistic updates
            const revertViews = (views: any[]) => views.map((v: any) => v.id === viewId ? { ...v, name: oldName } : v);
            if (spaceId) utils.space?.get?.setData({ id: spaceId }, (old: any) => old ? { ...old, views: revertViews(old.views ?? []) } : old);
            if (projectId) utils.project?.get?.setData({ id: projectId }, (old: any) => old ? { ...old, views: revertViews(old.views ?? []) } : old);
            if (teamId) utils.team?.get?.setData({ id: teamId }, (old: any) => old ? { ...old, views: revertViews(old.views ?? []) } : old);
            if (folderId) utils.folder?.get?.setData({ id: folderId }, (old: any) => old ? { ...old, views: revertViews(old.views ?? []) } : old);
            if (listId) utils.list?.get?.setData({ id: listId }, (old: any) => old ? { ...old, views: revertViews(old.views ?? []) } : old);
        }
    };

    const saveNewFilter = useCallback(async () => {
        if (!savedFilterName.trim()) return;
        const newFilter = {
            id: Math.random().toString(36).substring(7),
            name: savedFilterName.trim(),
            config: JSON.parse(JSON.stringify(filterGroups))
        };
        setSavedFilters(prev => {
            const next = [...prev, newFilter];
            if (viewId && initialConfig != null) {
                const raw = (initialConfig ?? {}) as Record<string, any>;
                const listView = raw.listView ?? {};
                void updateViewMutation.mutateAsync({ id: viewId, config: { ...raw, listView: { ...listView, savedFilterPresets: next } } });
            } else if (typeof window !== "undefined") {
                localStorage.setItem("agentflox_saved_filters", JSON.stringify(next));
            }
            return next;
        });
        setSavedFilterName("");
    }, [savedFilterName, filterGroups, viewId, initialConfig]);

    const deleteSavedFilter = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSavedFilters(prev => {
            const next = prev.filter(f => f.id !== id);
            if (viewId && initialConfig != null) {
                const raw = (initialConfig ?? {}) as Record<string, any>;
                const listView = raw.listView ?? {};
                void updateViewMutation.mutateAsync({ id: viewId, config: { ...raw, listView: { ...listView, savedFilterPresets: next } } });
            } else if (typeof window !== "undefined") {
                localStorage.setItem("agentflox_saved_filters", JSON.stringify(next));
            }
            return next;
        });
    }, [viewId, initialConfig]);

    const applySavedFilter = (config: FilterGroup) => {
        setFilterGroups(config);
        setSavedFiltersPanelOpen(false);
    };

    const [assigneesPanelOpen, setAssigneesPanelOpen] = useState(false);
    const [filterSearch, setFilterSearch] = useState("");
    const [fieldsSearch, setFieldsSearch] = useState("");
    const [assigneesSearch, setAssigneesSearch] = useState("");
    const [inlineAddGroupKey, setInlineAddGroupKey] = useState<string | null>(null);
    const [inlineAddTitle, setInlineAddTitle] = useState("");
    const [inlineAddParentId, setInlineAddParentId] = useState<string | null>(null);
    const [inlineAddAssigneeIds, setInlineAddAssigneeIds] = useState<string[]>([]);
    const [inlineAddTaskType, setInlineAddTaskType] = useState<string | null>(null);
    const [inlineAddDueDate, setInlineAddDueDate] = useState<Date | null>(null);
    const [inlineAddStartDate, setInlineAddStartDate] = useState<Date | null>(null);
    const [inlineAddPriority, setInlineAddPriority] = useState<"URGENT" | "HIGH" | "NORMAL" | "LOW" | null>(null);
    const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
    const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
    const [createFieldModalOpen, setCreateFieldModalOpen] = useState(false);
    const [createFieldSearch, setCreateFieldSearch] = useState("");
    const [dependenciesTask, setDependenciesTask] = useState<Task | null>(null);
    const [customizePanelOpen, setCustomizePanelOpen] = useState(false);
    const [layoutOptionsOpen, setLayoutOptionsOpen] = useState(false);
    const [customizeMenuOpen, setCustomizeMenuOpen] = useState(false);
    const [customizeViewFilterOpen, setCustomizeViewFilterOpen] = useState(false);
    const [customizeViewGroupOpen, setCustomizeViewGroupOpen] = useState(false);
    const [customizeViewSubtasksOpen, setCustomizeViewSubtasksOpen] = useState(false);
    const [peopleSortBy, setPeopleSortBy] = useState<PeopleSortBy>("incomplete");
    const [workloadViewMode, setWorkloadViewMode] = useState<WorkloadViewMode>("total");
    const [workloadSidebarOpen, setWorkloadSidebarOpen] = useState(false);
    const [workloadSidebarWidth, setWorkloadSidebarWidth] = useState(320);
    const [isResizingWorkloadSidebar, setIsResizingWorkloadSidebar] = useState(false);
    const [showEmptyStatuses, setShowEmptyStatuses] = useState(false);
    const [wrapText, setWrapText] = useState(false);
    const [showTaskLocations, setShowTaskLocations] = useState(false);
    const [showSubtaskParentNames, setShowSubtaskParentNames] = useState(false);
    const [showTaskProperties, setShowTaskProperties] = useState(true);
    const [showTasksFromOtherLists, setShowTasksFromOtherLists] = useState(false);
    const [showSubtasksFromOtherLists, setShowSubtasksFromOtherLists] = useState(false);
    const [viewAutosave, setViewAutosave] = useState(false);
    const [pinView, setPinView] = useState(false);
    const [privateView, setPrivateView] = useState(false);
    const [protectView, setProtectView] = useState(false);
    const [defaultView, setDefaultView] = useState(false);
    const [defaultToMeMode, setDefaultToMeMode] = useState(false);
    const [tagEditorOpen, setTagEditorOpen] = useState(false);
    const [tagEditorTaskId, setTagEditorTaskId] = useState<string | null>(null);
    const [tagEditorOriginalTag, setTagEditorOriginalTag] = useState<string | null>(null); // encoded
    const [tagEditorName, setTagEditorName] = useState<string>("");
    const [tagEditorColor, setTagEditorColor] = useState<string>("#f3e8ff");
    const [tagEditorTags, setTagEditorTags] = useState<string[]>([]);

    const openTagEditor = useCallback((task: Task, encodedTag: string) => {
        const parsed = parseEncodedTag(encodedTag);
        setTagEditorTaskId(task.id);
        setTagEditorOriginalTag(encodedTag);
        setTagEditorName(parsed.label);
        setTagEditorColor(parsed.color ?? "#f3e8ff");
        setTagEditorTags(task.tags ?? []);
        setTagEditorOpen(true);
    }, []);

    // Column resizing logic
    const [colWidths, setColWidths] = useState<Record<string, number>>({
        name: 420,
        assignee: 150,
        dueDate: 150,
        priority: 120,
        status: 150,
        dateCreated: 150,
        timeEstimate: 120,
        comments: 100,
        timeTracked: 120,
        pullRequests: 120,
        linkedTasks: 120,
        taskType: 130,
    });

    const [resizingCol, setResizingCol] = useState<string | null>(null);
    const resizeStartX = useRef<number>(0);
    const resizeStartWidth = useRef<number>(0);
    const workloadResizeStartX = useRef<number>(0);
    const workloadResizeStartWidth = useRef<number>(320);

    const startResize = useCallback((e: React.MouseEvent, colId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setResizingCol(colId);
        resizeStartX.current = e.pageX;
        resizeStartWidth.current = colWidths[colId] || 120;
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

    const startWorkloadSidebarResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizingWorkloadSidebar(true);
        workloadResizeStartX.current = e.clientX;
        workloadResizeStartWidth.current = workloadSidebarWidth;
    }, [workloadSidebarWidth]);

    useEffect(() => {
        if (!isResizingWorkloadSidebar) return;
        const onMouseMove = (e: MouseEvent) => {
            const delta = workloadResizeStartX.current - e.clientX;
            const nextWidth = Math.max(260, Math.min(680, workloadResizeStartWidth.current + delta));
            setWorkloadSidebarWidth(nextWidth);
        };
        const onMouseUp = () => setIsResizingWorkloadSidebar(false);
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        return () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };
    }, [isResizingWorkloadSidebar]);

    const [savedSnapshot, setSavedSnapshot] = useState<string>("");
    const [orderByParent, setOrderByParent] = useState<Record<string, string[]>>({});
    const [dragActiveId, setDragActiveId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [draggingIds, setDraggingIds] = useState<string[]>([]);
    const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(null);
    const [dragDeltaX, setDragDeltaX] = useState(0);
    const [renamingTaskId, setRenamingTaskId] = useState<string | null>(null);
    const [renameDraft, setRenameDraft] = useState("");
    type BulkModalType = "status" | "assignees" | "customFields" | "tags" | "moveAdd" | "copy" | "more" | null;
    const [bulkModal, setBulkModal] = useState<BulkModalType>(null);
    const [bulkDuplicateModalOpen, setBulkDuplicateModalOpen] = useState(false);
    const [bulkCustomFieldId, setBulkCustomFieldId] = useState<string | null>(null);
    const [bulkCopyOptions, setBulkCopyOptions] = useState({ taskName: true, taskUrl: true, assignee: false, status: false, taskId: false });
    const [bulkSendNotifications, setBulkSendNotifications] = useState(true);
    const [bulkMoveKeepInList, setBulkMoveKeepInList] = useState(false);
    const [bulkAssigneeIds, setBulkAssigneeIds] = useState<string[]>([]);
    const [bulkTags, setBulkTags] = useState<string[]>([]);
    const [bulkTagInput, setBulkTagInput] = useState("");
    const [bulkCustomFieldDraftValue, setBulkCustomFieldDraftValue] = useState<any>(null);
    const [bulkCustomFieldSearch, setBulkCustomFieldSearch] = useState("");
    const [bulkStatusSearch, setBulkStatusSearch] = useState("");
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [pinDescription, setPinDescription] = useState(false);
    const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
    const [descriptionDraft, setDescriptionDraft] = useState("");

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    const utils = trpc.useUtils();
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
        new Set(["name", "status", "assignee", "priority", "dueDate", "tags"])
    );

    const taskListSpaceId = spaceId && !projectId && !listId ? spaceId : undefined;
    const taskListProjectId = projectId && !listId ? projectId : undefined;

    const {
        resolvedWorkspaceId,
        space: spaceSummary,
        project,
        customFields = [],
        availableTaskTypes,
        currentUser,
        currentUserId,
        agents,
        workspaceMembers,
        projectParticipants,
        teamParticipants,
        listsData,
        currentList,
        tasks,
        isTasksLoading: isLoading,
        hasMore: hasMoreTasks,
        isFetchingNextPage,
        loadMoreRef,
        total: taskTotal,
    } = useGenericTaskViewData({
        spaceId,
        projectId,
        teamId,
        listId,
        workspaceId,
        taskListSpaceId,
        taskListProjectId,
        includeRelations: true,
    });

    const { data: spaceWithMembers } = trpc.space.get.useQuery(
        { id: spaceId as string },
        { enabled: !!spaceId, staleTime: 60_000, gcTime: 5 * 60_000 }
    );
    const space = spaceWithMembers ?? spaceSummary;

    const { data: teamsByContext } = trpc.team.list.useQuery(
        {
            workspaceId: resolvedWorkspaceId as string,
            spaceId: spaceId as string | undefined,
            scope: "owned",
            pageSize: 50,
        },
        { enabled: !!resolvedWorkspaceId, staleTime: 60_000, gcTime: 5 * 60_000 }
    );

    useEffect(() => {
        if (availableTaskTypes.length > 0 && !inlineAddTaskType) {
            const defaultType = availableTaskTypes.find((t: any) => t.isDefault) || availableTaskTypes[0];
            if (defaultType) {
                setInlineAddTaskType(defaultType.id);
            }
        }
    }, [availableTaskTypes, inlineAddTaskType]);

    const defaultTaskType = useMemo(() => {
        if (availableTaskTypes.length === 0) return null;
        return availableTaskTypes.find((t: any) => t.isDefault) || availableTaskTypes[0];
    }, [availableTaskTypes]);

    // Helper to get icon for custom field type
    const getCustomFieldIcon = (fieldType: string) => {
        const typeMap: Record<string, any> = {
            TEXT: Type,
            TEXT_AREA: AlignLeft,
            LONG_TEXT: AlignLeft,
            NUMBER: Hash,
            DROPDOWN: LayoutList,
            DATE: Calendar,
            CHECKBOX: CheckSquare,
            URL: Globe,
            EMAIL: Mail,
            PHONE: Phone,
            LABELS: Tag,
            MONEY: DollarSign,
            FORMULA: FunctionSquare,
            FILES: Paperclip,
            RELATIONSHIP: Link2,
            PEOPLE: Users,
            PROGRESS_AUTO: TrendingUp,
            PROGRESS_MANUAL: SlidersHorizontal,
            SUMMARY: FileText,
            PROGRESS_UPDATES: MessageSquare,
            TRANSLATION: Globe,
            SENTIMENT: Heart,
            LOCATION: MapPin,
            RATING: Star,
            VOTING: Users,
            SIGNATURE: PenTool,
            BUTTON: MousePointer,
            ACTION_ITEMS: ListChecks,
            CUSTOM_TEXT: Type,
            CUSTOM_DROPDOWN: LayoutList,
            CATEGORIZE: Target,
            TSHIRT_SIZE: Users,
        };
        return typeMap[fieldType] || Type;
    };

    const scopedEntityRoster = useMemo(() => {
        const workspaceMemberUsers = (workspaceMembers ?? []).map((m: any) => m.user).filter(Boolean);
        const workspaceTeams = (teamsByContext?.items ?? []) as any[];
        const workspaceProjects = project ? [project] : [];

        const spaceMembers = ((space as any)?.members ?? []) as any[];
        const spaceTeams = workspaceTeams.filter((t: any) => !spaceId || t.spaceId === spaceId);
        const spaceProjects = projectId && project ? [project] : [];

        const projectMembers = ((projectParticipants as any)?.users ?? []) as any[];
        const projectTeamsFromProject = ((project as any)?.teams ?? []) as any[];
        const projectTeams = projectTeamsFromProject.length > 0
            ? projectTeamsFromProject
            : workspaceTeams.filter((t: any) => (t as any).projectId === projectId);
        const projectProjects = project ? [project] : [];

        const teamMembers = ((teamParticipants as any)?.users ?? []) as any[];
        const teamTeams = teamId ? workspaceTeams.filter((t: any) => t.id === teamId) : [];
        const teamProjects = projectId && project ? [project] : [];

        if (teamId) {
            return { scope: "team", members: teamMembers, teams: teamTeams, projects: teamProjects };
        }
        if (projectId) {
            return { scope: "project", members: projectMembers, teams: projectTeams, projects: projectProjects };
        }
        if (spaceId) {
            return { scope: "space", members: spaceMembers, teams: spaceTeams, projects: spaceProjects };
        }
        return { scope: "workspace", members: workspaceMemberUsers, teams: workspaceTeams, projects: workspaceProjects };
    }, [
        teamId,
        projectId,
        spaceId,
        workspaceMembers,
        teamsByContext?.items,
        space,
        project,
        projectParticipants,
        teamParticipants,
    ]);

    // Initialize per-parent ordering (UI-only) from current task order
    useEffect(() => {
        const next: Record<string, string[]> = {};
        const rootKey = "root";
        next[rootKey] = [];

        // Always sort by order before grouping to maintain correct sequence
        const sortedTasks = [...tasks].sort((a, b) => (a.order || "").localeCompare(b.order || ""));

        for (const t of sortedTasks) {
            const key = normalizeParentId(t.parentId) ?? rootKey;
            if (!next[key]) next[key] = [];
            next[key].push(t.id);
        }
        setOrderByParent(next);
    }, [tasks]);

    // Extract custom field IDs that are actually used by tasks in the current list
    const usedCustomFieldIds = useMemo(() => {
        const fieldIds = new Set<string>();
        tasks.forEach((task: Task) => {
            task.customFieldValues?.forEach((cfv: any) => {
                fieldIds.add(cfv.customFieldId);
            });
        });
        return fieldIds;
    }, [tasks]);

    // Merge standard fields with custom fields (only those used by tasks)
    const FIELD_CONFIG = useMemo(() => {
        const standardFields = STANDARD_FIELD_CONFIG.map(f => ({ ...f, isCustom: false }));
        // Only include custom fields that have values in the current task list
        const customFieldsConfig = (customFields as any[])
            .filter((cf: any) => usedCustomFieldIds.has(cf.id))
            .map((cf: any) => {
                const IconComponent = getCustomFieldIcon(cf.type);
                return {
                    id: cf.id,
                    label: cf.name,
                    icon: IconComponent,
                    isCustom: true,
                    customField: cf,
                };
            });
        return [...standardFields, ...customFieldsConfig];
    }, [customFields, usedCustomFieldIds]);

    const allAvailableStatuses = useMemo(() => {
        if (listId && currentList?.statuses) {
            return (currentList.statuses as { id: string; name: string; color: string }[]).map((s: any) => ({ ...s, listId: currentList.id }));
        }
        if (listsData?.items) {
            const statusMap = new Map<string, { id: string; name: string; color: string; listId: string }>();
            (listsData.items as any[]).forEach((list: any) => {
                (list.statuses || []).forEach((s: any) => {
                    if (!statusMap.has(s.id)) statusMap.set(s.id, { ...s, listId: list.id });
                });
            });
            return Array.from(statusMap.values());
        }
        return [];
    }, [tasks, listId, currentList, listsData]);

    const allAvailableTags = useMemo(() => {
        const tagSet = new Set<string>();
        tasks.forEach(t => {
            (t.tags || []).forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet);
    }, [tasks]);

    const updateTask = trpc.task.update.useMutation({
        onSettled: () => {
            void utils.task.list.invalidate();
        },
    });
    const deleteTask = trpc.task.delete.useMutation({
        onSuccess: () => { void utils.task.list.invalidate(); },
    });
    const createTask = trpc.task.create.useMutation({
        onSuccess: () => { void utils.task.list.invalidate(); },
        onError: () => { void utils.task.list.invalidate(); },
    });
    const duplicateTask = trpc.task.duplicate.useMutation({
        onSuccess: () => { void utils.task.list.invalidate(); },
    });
    const bulkDuplicateTask = trpc.task.bulkDuplicate.useMutation({
        onSuccess: () => {
            void utils.task.list.invalidate();
            setSelectedTasks([]);
        },
    });
    const updateCustomField = trpc.task.customFields.update.useMutation({
        onSuccess: () => { void utils.task.list.invalidate(); },
    });
    const updateList = trpc.list.update.useMutation({
        onSuccess: () => {
            void utils.list.get.invalidate({ id: listId as string });
            void utils.list.byContext.invalidate({ spaceId, projectId, workspaceId: resolvedWorkspaceId });
        }
    });

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

    const handleSaveInlineTask = useCallback(async (opts: {
        parentId?: string | null;
        listIdForCreate?: string | null;
        statusIdForCreate?: string | null;
    }) => {
        const { parentId, listIdForCreate, statusIdForCreate } = opts;
        const effectiveListId = listIdForCreate ?? listId ?? (listsData?.items as any[])?.[0]?.id;
        if (!inlineAddTitle.trim() || !effectiveListId || !resolvedWorkspaceId) return;
        try {
            await createTask.mutateAsync({
                title: inlineAddTitle.trim(),
                listId: effectiveListId,
                statusId: statusIdForCreate ?? undefined,
                workspaceId: resolvedWorkspaceId,
                spaceId: spaceId || undefined,
                projectId: projectId || undefined,
                teamId: teamId || undefined,
                parentId: parentId ?? undefined,
                assigneeIds: inlineAddAssigneeIds,
                assigneeId: inlineAddAssigneeIds[0] || undefined,
                startDate: inlineAddStartDate || undefined,
                dueDate: inlineAddDueDate || undefined,
                priority: inlineAddPriority || undefined,
                taskTypeId: inlineAddTaskType || defaultTaskType?.id,
            } as any);
            handleCancelInlineAdd();
        } catch (e) { /* noop */ }
    }, [inlineAddTitle, listId, listsData, resolvedWorkspaceId, createTask, spaceId, projectId, teamId, inlineAddAssigneeIds, inlineAddStartDate, inlineAddDueDate, inlineAddPriority, inlineAddTaskType, handleCancelInlineAdd]);

    const handleCreateTaskFromCard = useCallback(async (input: QuickCreateTaskInput) => {
        const effectiveListId = listId ?? (listsData?.items as any[])?.[0]?.id;
        if (!input.title?.trim() || !effectiveListId || !resolvedWorkspaceId) return;
        const selectorIds = input.assigneeIds ?? [];
        const cleanIds = cleanAssigneeIdsFromSelector(selectorIds);
        const firstUserAssigneeRaw = selectorIds.find((id) => id.startsWith("user:") || !id.includes(":"));
        const firstUserAssignee = firstUserAssigneeRaw
            ? (firstUserAssigneeRaw.includes(":") ? firstUserAssigneeRaw.split(":")[1] : firstUserAssigneeRaw)
            : cleanIds[0];
        await createTask.mutateAsync({
            title: input.title.trim(),
            listId: effectiveListId,
            statusId: input.statusId || undefined,
            workspaceId: resolvedWorkspaceId,
            spaceId: spaceId || undefined,
            projectId: projectId || undefined,
            teamId: teamId || undefined,
            assigneeIds: cleanIds,
            assigneeId: firstUserAssignee || undefined,
            startDate: input.startDate || undefined,
            dueDate: input.dueDate || undefined,
            priority: input.priority || undefined,
            taskTypeId: defaultTaskType?.id,
        } as any);
    }, [listId, listsData, resolvedWorkspaceId, createTask, spaceId, projectId, teamId, defaultTaskType?.id]);

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


    const workspaceUserById = useMemo(() => {
        const map = new Map<string, { id: string; name: string; email?: string | null; image?: string | null }>();
        for (const m of workspaceMembers ?? []) {
            const u = (m as any).user;
            if (u) map.set(u.id, { id: u.id, name: u.name || u.email || "Unknown", image: u.image, email: u.email });
        }
        return map;
    }, [workspaceMembers]);

    const users = useMemo(() => {
        const scopedMembers = (scopedEntityRoster.members ?? []) as any[];
        if (scopedMembers.length > 0) {
            return scopedMembers
                .map((u: any) => {
                    const id = u?.id ?? u?.user?.id;
                    if (!id) return null;
                    const workspaceRef = workspaceUserById.get(id);
                    return {
                        id,
                        name: workspaceRef?.name || u?.name || u?.user?.name || u?.email || u?.user?.email || "Unknown",
                        image: workspaceRef?.image ?? u?.image ?? u?.user?.image ?? null,
                        email: workspaceRef?.email ?? u?.email ?? u?.user?.email ?? null,
                    };
                })
                .filter(Boolean) as { id: string; name: string; image?: string | null; email?: string | null }[];
        }
        return Array.from(workspaceUserById.values()).map(u => ({ id: u.id, name: u.name, image: u.image ?? null, email: u.email ?? null }));
    }, [scopedEntityRoster.members, workspaceUserById]);

    const userById = useMemo(() => {
        const map = new Map<string, { id: string; name: string; email?: string | null; image?: string | null }>();
        users.forEach(u => map.set(u.id, u));
        return map;
    }, [users]);

    const lists = (listsData?.items ?? []).map((l: any) => ({ id: l.id, name: l.name }));

    const listPathLabel = useMemo(() => {
        if (!listId || !currentList) return null;
        const listName = (currentList as any).name as string | undefined;
        const folderName = ((currentList as any).folder?.name ?? (currentList as any).parentFolder?.name) as string | undefined;
        if (!listName) return null;
        if (!folderName) return listName;
        return `${listName} / ${folderName}`;
    }, [listId, currentList]);

    const filteredTasks = useMemo(() => {
        let result = tasks;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(t => (t.title || t.name || "").toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
        }
        if (filterStatus.length > 0) result = result.filter(t => filterStatus.includes(t.status?.name || ""));
        if (filterPriority.length > 0) result = result.filter(t => filterPriority.includes(t.priority || ""));
        if (filterAssignee.length > 0) {
            const hasUnassigned = filterAssignee.includes("__unassigned__");
            const assigneeIds = filterAssignee.filter(id => id !== "__unassigned__");
            result = result.filter(t => {
                const assignees = t.assignees ?? [];
                const hasAnyAssignee = assignees.length > 0;
                const matchesAssigned = assigneeIds.length > 0
                    ? assignees.some((a: any) => assigneeIds.includes(a.user?.id))
                    : false;
                const matchesUnassigned = hasUnassigned && !hasAnyAssignee;
                return matchesAssigned || matchesUnassigned;
            });
        }
        // Filter out closed/completed tasks when showCompleted is false
        // Only filter if status exists and is explicitly "done" or "completed"
        if (!showCompleted) {
            result = result.filter(t => {
                const statusName = t.status?.name?.toLowerCase() || "";
                // Only hide if status is explicitly "done" or "completed", not if status is null/undefined/none
                return statusName !== "done" && statusName !== "completed";
            });
        }
        // When showCompletedSubtasks is false, hide subtasks (tasks with parentId) that are done/completed
        if (!showCompletedSubtasks) {
            result = result.filter(t => {
                if (!t.parentId) return true;
                const statusName = t.status?.name?.toLowerCase() || "";
                return statusName !== "done" && statusName !== "completed";
            });
        }

        // Default to Me Mode: Filter tasks assigned to current user
        if (defaultToMeMode && currentUserId) {
            result = result.filter(t => {
                const assignees = t.assignees ?? [];
                const isAssigned = assignees.some((a: any) => a.user?.id === currentUserId) ||
                    t.assigneeId === currentUserId ||
                    (t.assignee && t.assignee.id === currentUserId);
                return isAssigned;
            });
        }

        if (filterGroups.conditions.length > 0) {
            result = result.filter(t => evaluateGroup(t, filterGroups));
        }

        // Apply legacy simple filters if any (for backward compatibility during transition)
        if (filterStatus.length > 0) result = result.filter(t => filterStatus.includes(t.status?.name || ""));
        if (filterPriority.length > 0) result = result.filter(t => filterPriority.includes(t.priority || ""));
        if (filterAssignee.length > 0) {
            const hasUnassigned = filterAssignee.includes("__unassigned__");
            const assigneeIds = filterAssignee.filter(id => id !== "__unassigned__");
            result = result.filter(t => {
                const assignees = t.assignees ?? [];
                const hasAnyAssignee = assignees.length > 0;
                const matchesAssigned = assigneeIds.length > 0
                    ? assignees.some((a: any) => assigneeIds.includes(a.user?.id))
                    : false;
                const matchesUnassigned = hasUnassigned && !hasAnyAssignee;
                return matchesAssigned || matchesUnassigned;
            });
        }

        // When using manual sort, preserve backend order (which now uses Task.order),
        // otherwise apply the selected sort.
        if (sortBy !== "manual") {
            result = [...result].sort((a, b) => {
                let c = 0;
                if (sortBy === "name") c = (a.title || a.name || "").localeCompare(b.title || b.name || "");
                else if (sortBy === "dueDate") {
                    if (!a.dueDate) return 1; if (!b.dueDate) return -1;
                    c = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                } else if (sortBy === "priority") {
                    const o: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
                    c = (o[a.priority as string] ?? 99) - (o[b.priority as string] ?? 99);
                } else if (sortBy === "status") c = (a.status?.name || "").localeCompare(b.status?.name || "");
                else if (sortBy === "order") c = (a.order || "").localeCompare(b.order || "");
                return sortDirection === "asc" ? c : -c;
            });
        } else {
            // Explicitly sort by order if manual, using optimistic state first
            result = [...result].sort((a, b) => {
                const parentA = normalizeParentId(a.parentId) ?? "root";
                const parentB = normalizeParentId(b.parentId) ?? "root";

                // If same parent, checking local override allows instant re-render
                if (parentA === parentB && orderByParent[parentA]) {
                    const idxA = orderByParent[parentA].indexOf(a.id);
                    const idxB = orderByParent[parentA].indexOf(b.id);
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                }

                return (a.order || "").localeCompare(b.order || "");
            });
        }
        return result;
    }, [tasks, searchQuery, filterStatus, filterPriority, filterAssignee, showCompleted, showCompletedSubtasks, sortBy, sortDirection, filterGroups, orderByParent]);

    const workloadTeamItems = useMemo(() => {
        const teams = ((scopedEntityRoster.teams as any[]) ?? []).map((t: any) => ({ id: t.id, name: t.name || "Unnamed Team" }));
        return teams.map((team) => {
            const assigned = filteredTasks.filter((t) => (t.assignees ?? []).some((a: any) => a.team?.id === team.id));
            const done = getDoneCount(assigned);
            return { ...team, kind: "team" as const, total: assigned.length, incomplete: Math.max(0, assigned.length - done), done };
        });
    }, [scopedEntityRoster.teams, filteredTasks]);

    const workloadPeopleItems = useMemo(() => {
        return users.map((u) => {
            const assigned = filteredTasks.filter((t) => (t.assignees ?? []).some((a: any) => a.user?.id === u.id));
            const done = getDoneCount(assigned);
            return { ...u, kind: "person" as const, total: assigned.length, incomplete: Math.max(0, assigned.length - done), done };
        });
    }, [users, filteredTasks]);

    const workloadAgentItems = useMemo(() => {
        const agentList = (agents as any[]) ?? [];
        return agentList.map((a: any) => {
            const assigned = filteredTasks.filter((t) => (t.assignees ?? []).some((as: any) => as.agent?.id === a.id));
            const done = getDoneCount(assigned);
            return {
                id: a.id,
                name: a.name || "Agent",
                email: a.email ?? null,
                image: a.image ?? a.avatar ?? null,
                kind: "agent" as const,
                total: assigned.length,
                incomplete: Math.max(0, assigned.length - done),
                done,
            };
        });
    }, [agents, filteredTasks]);

    const workloadUnassigned = useMemo(() => {
        const unassigned = filteredTasks.filter((t) => !t.assignees || t.assignees.length === 0);
        const done = getDoneCount(unassigned);
        return { id: "__unassigned__", name: "Unassigned", kind: "total" as const, total: unassigned.length, incomplete: Math.max(0, unassigned.length - done), done };
    }, [filteredTasks]);

    const workloadTotalItems = useMemo(() => {
        const peopleTotal = workloadPeopleItems.reduce((acc, item) => acc + item.total, 0);
        const peopleDone = workloadPeopleItems.reduce((acc, item) => acc + item.done, 0);
        const teamTotal = workloadTeamItems.reduce((acc, item) => acc + item.total, 0);
        const teamDone = workloadTeamItems.reduce((acc, item) => acc + item.done, 0);
        const agentTotal = workloadAgentItems.reduce((acc, item) => acc + item.total, 0);
        const agentDone = workloadAgentItems.reduce((acc, item) => acc + item.done, 0);
        return [
            { id: "__total_unassigned__", name: "Unassigned", kind: "total" as const, total: workloadUnassigned.total, incomplete: workloadUnassigned.incomplete, done: workloadUnassigned.done },
            { id: "__total_people__", name: "People", kind: "total" as const, total: peopleTotal, incomplete: Math.max(0, peopleTotal - peopleDone), done: peopleDone },
            { id: "__total_teams__", name: "Teams", kind: "total" as const, total: teamTotal, incomplete: Math.max(0, teamTotal - teamDone), done: teamDone },
            { id: "__total_agents__", name: "Agents", kind: "total" as const, total: agentTotal, incomplete: Math.max(0, agentTotal - agentDone), done: agentDone },
        ];
    }, [workloadUnassigned, workloadPeopleItems, workloadTeamItems, workloadAgentItems]);

    const workloadSidebarItems = useMemo(() => {
        if (workloadViewMode === "people") return workloadPeopleItems.sort((a, b) => b.incomplete - a.incomplete).slice(0, 12);
        if (workloadViewMode === "teams") return workloadTeamItems.sort((a, b) => b.incomplete - a.incomplete).slice(0, 12);
        if (workloadViewMode === "agents") return workloadAgentItems.sort((a, b) => b.incomplete - a.incomplete).slice(0, 12);
        return workloadTotalItems;
    }, [workloadViewMode, workloadPeopleItems, workloadTeamItems, workloadAgentItems, workloadTotalItems]);

    useEffect(() => {
        // Debug: final normalized users/agents/tasks driving PeopleViewContent
        console.log("[PeopleView][debug] normalized collections", {
            users: users.length,
            agents: agents.length,
            filteredTasks: filteredTasks.length,
            allTasks: tasks.length,
            scopedTeams: (scopedEntityRoster.teams as any[])?.length ?? 0,
        });
        if (users.length === 0) {
            console.log("[PeopleView][debug] users empty details", {
                hasWorkspaceUserMap: workspaceUserById.size,
                teamParticipantsUsers: (teamParticipants as any)?.users?.length ?? 0,
                projectParticipantsUsers: (projectParticipants as any)?.users?.length ?? 0,
                workspaceMembers: workspaceMembers?.length ?? 0,
            });
        }
    }, [
        users.length,
        agents.length,
        filteredTasks.length,
        tasks.length,
        scopedEntityRoster.teams,
        workspaceUserById.size,
        teamParticipants,
        projectParticipants,
        workspaceMembers,
    ]);

    useEffect(() => {
        if (bulkCustomFieldId) {
            const first = filteredTasks.find(t => selectedTasks.includes(t.id));
            const cfv = first?.customFieldValues?.find((v: any) => v.customFieldId === bulkCustomFieldId);
            setBulkCustomFieldDraftValue(cfv?.value ?? null);
        }
    }, [bulkCustomFieldId, filteredTasks, selectedTasks]);

    const groupedTasks = useMemo(() => {
        if (groupBy === "none") return { "All Tasks": filteredTasks };
        const groups: Record<string, Task[]> = {};

        // If grouping by status and 'show empty statuses' is enabled, initialize groups for all statuses
        if (groupBy === "status" && showEmptyStatuses) {
            allAvailableStatuses.forEach(s => {
                if (s.name) {
                    groups[s.name] = [];
                }
            });
        }

        // Create a set of all task IDs currently visible after filtering
        const visibleIds = new Set(filteredTasks.map(t => t.id));

        filteredTasks.forEach(task => {
            // In "separate" mode, show all tasks separately (including subtasks)
            // In "collapsed" or "expanded" mode, if parent is visible, render subtask nested under parent
            if (expandedSubtaskMode !== "separate" && task.parentId && visibleIds.has(task.parentId)) {
                return;
            }

            let key = "";
            if (groupBy === "status") key = task.status?.name || "No Status";
            else if (groupBy === "priority") key = task.priority || "No Priority";
            else if (groupBy === "assignee") key = task.assignees?.[0]?.user?.name || task.assignee?.name || "Unassigned";
            else if (groupBy === "list") key = task.list?.name || "No List";
            else if (groupBy === "dueDate") {
                if (!task.dueDate) key = "No due date";
                else {
                    const d = new Date(task.dueDate);
                    key = d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
                }
            } else if (groupBy === "taskType") {
                const ttId = (task as any).type || (task as any).taskType;
                const tt = availableTaskTypes?.find((t: any) => t.id === ttId || t.name === ttId);
                key = tt?.name || ttId || "No Task Type";
            } else if (groupBy === "tags") {
                const tags = (task.tags ?? []) as string[];
                key = tags[0] || "No Tags";
            } else {
                // Must be a custom field ID
                const cf = FIELD_CONFIG.find(f => f.id === groupBy);
                if (cf && cf.isCustom && "customField" in cf) {
                    const value = getCustomFieldValue(task, groupBy);
                    key = (value !== null && value !== undefined) ? formatCustomFieldValue(value, cf.customField) : `No ${cf.label}`;
                } else {
                    key = "No Group";
                }
            }

            if (!groups[key]) groups[key] = [];
            groups[key].push(task);
        });

        // Sort group keys according to groupDirection for stable ordering
        const sortedEntries = Object.entries(groups).sort(([a], [b]) => {
            // For status grouping, try to respect the original order if available
            if (groupBy === "status") {
                const indexA = allAvailableStatuses.findIndex(s => s.name === a);
                const indexB = allAvailableStatuses.findIndex(s => s.name === b);

                // If both statuses are known, sort by their defined order
                if (indexA !== -1 && indexB !== -1) {
                    const diff = indexA - indexB;
                    return groupDirection === "asc" ? diff : -diff;
                }

                // If one is "No Status" (unknown), put it at start or end depending on direction?
                // Usually "No Status" goes first or last. Let's stick to localeCompare fallback for mixed types.
            }

            const cmp = a.localeCompare(b);
            return groupDirection === "asc" ? cmp : -cmp;
        });
        return Object.fromEntries(sortedEntries);
    }, [filteredTasks, groupBy, groupDirection, showEmptyStatuses, allAvailableStatuses]);

    const orderedTasksForGroup = (groupTasks: Task[]) => {
        if (expandedSubtaskMode === "separate") {
            // In separate mode, show all tasks flat (no nesting)
            return groupTasks;
        }

        const roots = groupTasks.filter(t => !t.parentId);
        if (expandedSubtaskMode === "expanded") {
            // In expanded mode, show all subtasks under their parents
            return roots.flatMap(r => [
                r,
                ...groupTasks.filter((t: Task) => t.parentId === r.id),
            ]);
        }

        // In collapsed mode (default), only show subtasks when parent is expanded
        return roots.flatMap(r => [
            r,
            ...(expandedParents.has(r.id) ? groupTasks.filter((t: Task) => t.parentId === r.id) : []),
        ]);
    };

    const hasNoSubtasksToShowInSeparateMode = (groupTasks: Task[]) => {
        if (expandedSubtaskMode !== "separate") return false;
        return groupTasks.length === 0;
    };

    const getStatusIdForGroup = (groupName: string) => {
        const status = allAvailableStatuses.find(s => s.name === groupName);
        return status?.id ?? null;
    };

    const getListIdForGroup = (groupTasks: Task[]) => {
        const t = groupTasks[0];
        return (t?.list as any)?.id ?? (t as any)?.listId ?? listId ?? lists[0]?.id ?? null;
    };

    const getGroupPillColor = (groupName: string, groupTasks: Task[]) => {
        const first = groupTasks[0];
        if (first?.status?.color) return first.status.color;
        if (groupBy === "taskType") {
            const tt = availableTaskTypes.find((t: any) => t.name === groupName || t.id === groupName);
            if (tt?.color) return tt.color;
        }
        const lower = groupName.toLowerCase();
        if (lower.includes("progress") || lower === "in progress") return "#6366f1";
        if (lower === "done" || lower === "completed") return "#10b981";
        return "#64748b";
    };

    const toggleParentExpand = (parentId: string) => {
        setExpandedParents(prev => {
            const next = new Set(prev);
            if (next.has(parentId)) next.delete(parentId);
            else next.add(parentId);
            return next;
        });
    };

    const toggleGroup = (key: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const handleSelectAllInGroup = (groupTasks: Task[]) => {
        const groupTaskIds = groupTasks.map(t => t.id);
        const allIds = new Set<string>();
        const childrenMap = new Map<string, string[]>();
        filteredTasks.forEach(t => {
            if (t.parentId) {
                if (!childrenMap.has(t.parentId)) childrenMap.set(t.parentId, []);
                childrenMap.get(t.parentId)!.push(t.id);
            }
        });

        const collect = (id: string) => {
            allIds.add(id);
            childrenMap.get(id)?.forEach(collect);
        };
        groupTaskIds.forEach(collect);

        const allInGroupIds = Array.from(allIds);
        const allAlreadySelected = allInGroupIds.length > 0 && allInGroupIds.every(id => selectedTasks.includes(id));

        if (allAlreadySelected) {
            setSelectedTasks(prev => prev.filter(id => !allIds.has(id)));
        } else {
            setSelectedTasks(prev => Array.from(new Set([...prev, ...allInGroupIds])));
        }
    };

    const collapseAllGroups = () => {
        const allGroupNames = Object.keys(groupedTasks);
        setCollapsedGroups(new Set(allGroupNames));
    };

    const toggleColumn = (col: string) => {
        setVisibleColumns(prev => {
            const next = new Set(prev);
            if (next.has(col)) next.delete(col);
            else next.add(col);
            return next;
        });
    };

    const formatCustomFieldValue = (value: any, customField: any): string => {
        if (value === null || value === undefined) return "";
        const fieldType = customField?.type || customField?.config?.fieldType;
        switch (fieldType) {
            case "TEXT":
            case "TEXT_AREA":
            case "LONG_TEXT":
            case "CUSTOM_TEXT":
            case "EMAIL":
            case "PHONE":
            case "URL":
                return String(value);
            case "NUMBER":
            case "MONEY":
                return typeof value === "number" ? value.toLocaleString() : String(value);
            case "DATE":
                try {
                    return format(new Date(value), "MMM d, yyyy");
                } catch {
                    return String(value);
                }
            case "CHECKBOX":
                return value ? "Yes" : "No";
            case "DROPDOWN":
            case "CUSTOM_DROPDOWN":
            case "LABELS":
                if (typeof value === "string") return value;
                if (Array.isArray(value)) return value.join(", ");
                return String(value);
            default:
                return String(value);
        }
    };

    const handleSort = (col: "name" | "dueDate" | "priority" | "status") => {
        if (sortBy === col) setSortDirection(d => d === "asc" ? "desc" : "asc");
        else { setSortBy(col); setSortDirection("asc"); }
    };

    const getPriorityStyles = (p: string) => {
        if (p === "URGENT") return { badge: "text-red-700 bg-red-50 border-red-200", icon: "text-red-600" };
        if (p === "HIGH") return { badge: "text-orange-700 bg-orange-50 border-orange-200", icon: "text-orange-600" };
        if (p === "NORMAL") return { badge: "text-blue-700 bg-blue-50 border-blue-200", icon: "text-blue-600" };
        if (p === "LOW") return { badge: "text-slate-600 bg-slate-100 border-slate-200", icon: "text-slate-500" };
        return { badge: "text-slate-600 bg-slate-50 border-slate-200", icon: "text-slate-400" };
    };

    const getStatusStyles = (s: string) => {
        const lower = (s || "").toLowerCase();
        if (lower === "done" || lower === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
        if (lower === "in progress" || lower === "in_progress") return "bg-blue-50 text-blue-700 border-blue-200";
        return "bg-slate-50 text-slate-700 border-slate-200";
    };

    const formatDueDate = (date: Date | string | null) => {
        if (!date) return null;
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return null;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const due = new Date(d); due.setHours(0, 0, 0, 0);
        const days = Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
        if (days < 0) return { text: `${Math.abs(days)} days ago`, color: "text-red-600 font-medium" };
        if (days === 0) return { text: "Today", color: "text-indigo-600 font-medium" };
        if (days === 1) return { text: "Tomorrow", color: "text-orange-600" };
        if (days < 7) return { text: d.toLocaleDateString("en-US", { weekday: "short" }), color: "text-indigo-600" };
        return { text: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), color: "text-zinc-500" };
    };

    const activeFilterCount = filterStatus.length + filterPriority.length + filterAssignee.length + (!showCompleted ? 1 : 0);

    const handleTaskUpdate = async (taskId: string, data: Record<string, unknown>) => {
        try { await updateTask.mutateAsync({ id: taskId, ...data }); } catch (e) { console.error(e); }
    };
    const handleTaskDelete = async (taskId: string) => {
        try { await deleteTask.mutateAsync({ id: taskId }); } catch (e) { console.error(e); }
    };

    const subtaskCount = (task: Task) => (task._count?.other_tasks ?? 0);
    const hasSubtasks = (task: Task, scopeTasks: Task[]) => scopeTasks.some((t: Task) => t.parentId === task.id);

    const addFilterCondition = (groupId: string = "root") => {
        // Start with an empty field so the UI shows "Select filter" like ClickUp
        const newCond: FilterCondition = {
            id: Math.random().toString(36).substring(7),
            field: "",
            operator: "is",
            value: [],
        };
        const update = (group: FilterGroup): FilterGroup => {
            if (group.id === groupId) return { ...group, conditions: [...group.conditions, newCond] };
            return { ...group, conditions: group.conditions.map(c => "conditions" in c ? update(c as FilterGroup) : c) };
        };
        setFilterGroups(update(filterGroups));
    };

    const addFilterGroup = (parentId: string = "root") => {
        const newGroup: FilterGroup = {
            id: Math.random().toString(36).substring(7),
            operator: "AND",
            conditions: [{
                id: Math.random().toString(36).substring(7),
                field: "",
                operator: "is",
                value: [],
            }],
        };
        const update = (group: FilterGroup): FilterGroup => {
            if (group.id === parentId) return { ...group, conditions: [...group.conditions, newGroup] };
            return { ...group, conditions: group.conditions.map(c => "conditions" in c ? update(c as FilterGroup) : c) };
        };
        setFilterGroups(update(filterGroups));
    };

    const removeFilterItem = (id: string) => {
        if (id === "root") {
            setFilterGroups({ ...filterGroups, conditions: [] });
            return;
        }
        const update = (group: FilterGroup): FilterGroup => {
            return {
                ...group,
                conditions: group.conditions
                    .filter(c => c.id !== id)
                    .map(c => "conditions" in c ? update(c as FilterGroup) : c)
            };
        };
        setFilterGroups(update(filterGroups));
    };

    const updateFilterCondition = (id: string, updates: Partial<FilterCondition>) => {
        const update = (group: FilterGroup): FilterGroup => {
            return {
                ...group,
                conditions: group.conditions.map(c => {
                    if (c.id === id) return { ...c, ...updates } as FilterCondition;
                    return "conditions" in c ? update(c as FilterGroup) : c;
                })
            };
        };
        const updatedGroups = update(filterGroups);

        // Only clean up empty filters if:
        // 1. The update includes a value change (not just field/operator)
        // 2. AND the updated condition now has a value set
        const isValueUpdate = "value" in updates;
        let shouldCleanup = false;

        if (isValueUpdate) {
            // Find the updated condition and check if it now has a value
            const findCondition = (group: FilterGroup): FilterCondition | null => {
                for (const c of group.conditions) {
                    if (c.id === id && !("conditions" in c)) {
                        return c as FilterCondition;
                    }
                    if ("conditions" in c) {
                        const found = findCondition(c as FilterGroup);
                        if (found) return found;
                    }
                }
                return null;
            };

            const updatedCondition = findCondition(updatedGroups);
            if (updatedCondition && hasFilterValue(updatedCondition)) {
                // Check if any filter in any group has a value
                shouldCleanup = hasAnyValueInGroup(updatedGroups);
            }
        }

        // If any filter has a value, remove all filter items without values
        if (shouldCleanup) {
            const removeEmptyFilters = (group: FilterGroup): FilterGroup => {
                const filteredConditions = group.conditions
                    .filter(c => {
                        if ("conditions" in c) {
                            // For nested groups, recursively clean them first
                            const cleanedGroup = removeEmptyFilters(c as FilterGroup);
                            // Keep the group if it has any conditions left
                            return cleanedGroup.conditions.length > 0;
                        }
                        const cond = c as FilterCondition;
                        // Keep conditions that have a field set AND have values
                        return cond.field && cond.field.trim().length > 0 && hasFilterValue(cond);
                    })
                    .map(c => {
                        if ("conditions" in c) {
                            return removeEmptyFilters(c as FilterGroup);
                        }
                        return c;
                    });

                return {
                    ...group,
                    conditions: filteredConditions
                };
            };

            const cleanedGroups = removeEmptyFilters(updatedGroups);
            setFilterGroups(cleanedGroups);
        } else {
            setFilterGroups(updatedGroups);
        }
    };

    const updateFilterGroupOperator = (id: string, operator: FilterOperator) => {
        const update = (group: FilterGroup): FilterGroup => {
            if (group.id === id) return { ...group, operator };
            return { ...group, conditions: group.conditions.map(c => "conditions" in c ? update(c as FilterGroup) : c) };
        };
        setFilterGroups(update(filterGroups));
    };


    // Count of applied (root-level) filter groups that have at least one condition with value
    const appliedFilterCount = useMemo(() => {
        if (filterGroups.conditions.length === 0) return 0;
        return filterGroups.conditions.filter(c => {
            if ("conditions" in c) return hasAnyValueInGroup(c as FilterGroup);
            return hasFilterValue(c as FilterCondition);
        }).length;
    }, [filterGroups]);

    const groupLabel = useMemo(() => {
        if (groupBy === "none") return "None";
        const standard = FILTER_OPTIONS.find(o => o.id === groupBy);
        if (standard) return standard.label;
        const custom = FIELD_CONFIG.find(f => f.id === groupBy);
        if (custom) return custom.label;
        return "None";
    }, [groupBy, FIELD_CONFIG]);
    const allGroupKeys = Object.keys(groupedTasks);
    const allExpanded = allGroupKeys.length === 0 || allGroupKeys.every(k => !collapsedGroups.has(k));

    const spaceDefaultViewConfig = useMemo(() => {
        return (space?.settings as any)?.defaultViewConfig || {};
    }, [space]);

    const viewConfigFromDb: ListViewSavedConfig = useMemo(() => {
        const raw = (initialConfig ?? {}) as any;
        const viewConfig = (raw.listView ?? raw ?? {}) as ListViewSavedConfig;

        // Merge space defaults if they exist and view config fields are missing
        return {
            ...spaceDefaultViewConfig,
            ...viewConfig
        } as ListViewSavedConfig;
    }, [initialConfig, spaceDefaultViewConfig]);

    // Apply saved config when switching views / initial load
    useEffect(() => {
        const cfg = viewConfigFromDb;

        // Grouping and layout
        if (cfg.groupBy) setGroupBy(cfg.groupBy);
        if (cfg.groupDirection) setGroupDirection(cfg.groupDirection);
        if (cfg.subtasksMode) setExpandedSubtaskMode(cfg.subtasksMode);
        if (cfg.sortBy) setSortBy(cfg.sortBy);
        if (cfg.sortDirection) setSortDirection(cfg.sortDirection);

        // Visibility options
        if (typeof cfg.showCompleted === "boolean") setShowCompleted(cfg.showCompleted);
        if (typeof cfg.showCompletedSubtasks === "boolean") setShowCompletedSubtasks(cfg.showCompletedSubtasks);
        if (Array.isArray(cfg.visibleColumns) && cfg.visibleColumns.length) setVisibleColumns(new Set(cfg.visibleColumns));

        // Layout options
        if (typeof cfg.showEmptyStatuses === "boolean") setShowEmptyStatuses(cfg.showEmptyStatuses);
        if (typeof cfg.wrapText === "boolean") setWrapText(cfg.wrapText);
        if (typeof cfg.showTaskLocations === "boolean") setShowTaskLocations(cfg.showTaskLocations);
        if (typeof cfg.showSubtaskParentNames === "boolean") setShowSubtaskParentNames(cfg.showSubtaskParentNames);
        if (typeof cfg.showTaskProperties === "boolean") setShowTaskProperties(cfg.showTaskProperties);
        if (typeof cfg.showTasksFromOtherLists === "boolean") setShowTasksFromOtherLists(cfg.showTasksFromOtherLists);
        if (typeof cfg.showSubtasksFromOtherLists === "boolean") setShowSubtasksFromOtherLists(cfg.showSubtasksFromOtherLists);
        if (typeof cfg.pinDescription === "boolean") setPinDescription(cfg.pinDescription);

        // View settings
        if (typeof cfg.viewAutosave === "boolean") setViewAutosave(cfg.viewAutosave);
        if (typeof cfg.defaultToMeMode === "boolean") setDefaultToMeMode(cfg.defaultToMeMode);

        // Filters
        if (viewId && Array.isArray((cfg as any).savedFilterPresets)) setSavedFilters((cfg as any).savedFilterPresets);
        if (cfg.filterGroups && typeof cfg.filterGroups === "object" && typeof (cfg.filterGroups as FilterGroup).id === "string" && Array.isArray((cfg.filterGroups as FilterGroup).conditions)) {
            setFilterGroups(cfg.filterGroups as FilterGroup);
        }

        // baseline snapshot for dirty-check
        const baseline = stableStringify({
            groupBy: cfg.groupBy ?? groupBy,
            groupDirection: cfg.groupDirection ?? groupDirection,
            subtasksMode: cfg.subtasksMode ?? expandedSubtaskMode,
            sortBy: cfg.sortBy ?? sortBy,
            sortDirection: cfg.sortDirection ?? sortDirection,
            showCompleted: typeof cfg.showCompleted === "boolean" ? cfg.showCompleted : showCompleted,
            showCompletedSubtasks: typeof cfg.showCompletedSubtasks === "boolean" ? cfg.showCompletedSubtasks : showCompletedSubtasks,
            visibleColumns: Array.isArray(cfg.visibleColumns) ? cfg.visibleColumns : Array.from(visibleColumns),
            showEmptyStatuses: typeof cfg.showEmptyStatuses === "boolean" ? cfg.showEmptyStatuses : showEmptyStatuses,
            wrapText: typeof cfg.wrapText === "boolean" ? cfg.wrapText : wrapText,
            showTaskLocations: typeof cfg.showTaskLocations === "boolean" ? cfg.showTaskLocations : showTaskLocations,
            showSubtaskParentNames: typeof cfg.showSubtaskParentNames === "boolean" ? cfg.showSubtaskParentNames : showSubtaskParentNames,
            showTaskProperties: typeof cfg.showTaskProperties === "boolean" ? cfg.showTaskProperties : showTaskProperties,
            showTasksFromOtherLists: typeof cfg.showTasksFromOtherLists === "boolean" ? cfg.showTasksFromOtherLists : showTasksFromOtherLists,
            showSubtasksFromOtherLists: typeof cfg.showSubtasksFromOtherLists === "boolean" ? cfg.showSubtasksFromOtherLists : showSubtasksFromOtherLists,
            pinDescription: typeof cfg.pinDescription === "boolean" ? cfg.pinDescription : pinDescription,
            viewAutosave: typeof cfg.viewAutosave === "boolean" ? cfg.viewAutosave : viewAutosave,
            defaultToMeMode: typeof cfg.defaultToMeMode === "boolean" ? cfg.defaultToMeMode : defaultToMeMode,
            filterGroups: cfg.filterGroups && typeof (cfg.filterGroups as FilterGroup).conditions !== "undefined" ? (cfg.filterGroups as FilterGroup) : filterGroups,
        });
        setSavedSnapshot(baseline);
        // Re-apply when view switches or when saved config (e.g. after refetch) changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewId, viewConfigFromDb]);

    const currentViewConfig: ListViewSavedConfig = useMemo(() => ({
        // Grouping and layout
        groupBy,
        groupDirection,
        subtasksMode: expandedSubtaskMode,
        sortBy,
        sortDirection,

        // Visibility options
        showCompleted,
        showCompletedSubtasks,
        showClosedTasks: !showCompleted,
        visibleColumns: Array.from(visibleColumns),

        // Layout options
        showEmptyStatuses,
        wrapText,
        showTaskLocations,
        showSubtaskParentNames,
        showTaskProperties,
        showTasksFromOtherLists,
        showSubtasksFromOtherLists,
        pinDescription,

        // View settings
        viewAutosave,
        defaultToMeMode,

        // Active filters (persisted and restored with view)
        filterGroups,
    }), [
        groupBy,
        expandedSubtaskMode,
        groupDirection,
        sortBy,
        sortDirection,
        showCompleted,
        showCompletedSubtasks,
        visibleColumns,
        showEmptyStatuses,
        wrapText,
        showTaskLocations,
        showSubtaskParentNames,
        showTaskProperties,
        showTasksFromOtherLists,
        showSubtasksFromOtherLists,
        pinDescription,
        viewAutosave,
        defaultToMeMode,
        filterGroups,
    ]);

    const isViewDirty = useMemo(() => {
        if (!viewId) return false;
        const now = stableStringify(currentViewConfig);
        return savedSnapshot ? now !== savedSnapshot : false;
    }, [viewId, currentViewConfig, savedSnapshot]);

    const saveViewConfig = useCallback(async (overrides?: Partial<ListViewSavedConfig>, silent = false) => {
        if (!viewId) return;
        const raw = (initialConfig ?? {}) as any;
        const listView = raw?.listView ?? {};
        const configToSave = { ...currentViewConfig, ...overrides };
        const nextConfig = { ...raw, listView: { ...listView, ...configToSave, savedFilterPresets: savedFilters } };
        await updateViewMutation.mutateAsync({ id: viewId, config: nextConfig });
        setSavedSnapshot(stableStringify(configToSave));
        if (!silent) {
            toast.success("View saved successfully");
        }
    }, [viewId, initialConfig, currentViewConfig, savedFilters, updateViewMutation]);

    const handleToggleAutosave = useCallback(async (enabled: boolean) => {
        setViewAutosave(enabled);
        // Persist the autosave setting itself immediately
        await saveViewConfig({ viewAutosave: enabled }, true);
        toast.success(`Autosave ${enabled ? 'enabled' : 'disabled'}`);
    }, [saveViewConfig]);

    useEffect(() => {
        if (viewAutosave && isViewDirty) {
            void saveViewConfig(undefined, true);
        }
    }, [viewAutosave, isViewDirty, saveViewConfig]);

    const resetViewToDefaults = useCallback(() => {
        const cfg = spaceDefaultViewConfig || {};

        // Apply space defaults or system defaults
        setGroupBy(cfg.groupBy ?? (listId ? "status" : "list"));
        setGroupDirection(cfg.groupDirection ?? "asc");
        setExpandedSubtaskMode(cfg.subtasksMode ?? "collapsed");
        setSortBy(cfg.sortBy ?? "manual");
        setSortDirection(cfg.sortDirection ?? "asc");
        setShowCompleted(cfg.showCompleted ?? false);
        setShowCompletedSubtasks(cfg.showCompletedSubtasks ?? false);
        setVisibleColumns(Array.isArray(cfg.visibleColumns) && cfg.visibleColumns.length
            ? new Set(cfg.visibleColumns)
            : new Set(["name", "assignee", "dueDate", "priority", "tags"]));
        setShowEmptyStatuses(cfg.showEmptyStatuses ?? false);
        setWrapText(cfg.wrapText ?? false);
        setShowTaskLocations(cfg.showTaskLocations ?? false);
        setShowSubtaskParentNames(cfg.showSubtaskParentNames ?? false);
        setShowTaskProperties(cfg.showTaskProperties ?? true);
        setShowTasksFromOtherLists(cfg.showTasksFromOtherLists ?? false);
        setShowSubtasksFromOtherLists(cfg.showSubtasksFromOtherLists ?? false);
        setPinDescription(cfg.pinDescription ?? false);
        setDefaultToMeMode(cfg.defaultToMeMode ?? false);

        toast.success("View reset to defaults");
    }, [spaceDefaultViewConfig, listId]);

    const saveDefaultViewSettings = async () => {
        if (!spaceId) return;

        const nextSpaceSettings = {
            ...(space?.settings as any || {}),
            defaultViewConfig: defaultViewSettingsDraft
        };

        try {
            // 1. Update Space defaults
            await updateSpaceMutation.mutateAsync({
                id: spaceId,
                settings: nextSpaceSettings
            });

            // 2. Adjust for existing views if needed
            if (defaultViewSettingsApplyTo === "REQUIRED" || defaultViewSettingsApplyTo === "ALL") {
                // For "REQUIRED", update current view
                if (viewId) {
                    const raw = (initialConfig ?? {}) as any;
                    const listView = raw?.listView ?? {};
                    const nextConfig = { ...raw, listView: { ...listView, ...defaultViewSettingsDraft } };
                    await updateViewMutation.mutateAsync({ id: viewId, config: nextConfig });
                }

                // For "ALL", merge default listView into each view's config (do not replace entire config)
                if (defaultViewSettingsApplyTo === "ALL") {
                    const views = await utils.view.list.fetch({ spaceId });
                    await Promise.all(views.map((v: { id: string; config: any }) =>
                        updateViewMutation.mutateAsync({
                            id: v.id,
                            config: {
                                ...(v.config ?? {}),
                                listView: {
                                    ...((v.config as any)?.listView ?? {}),
                                    ...defaultViewSettingsDraft
                                }
                            }
                        })
                    ));
                }
            }

            toast.success("Default view settings saved");
            setIsDefaultViewSettingsModalOpen(false);
        } catch (error: any) {
            toast.error(`Failed to save defaults: ${error.message}`);
        }
    };

    const revertViewChanges = useCallback(() => {
        const cfg = viewConfigFromDb;

        // Grouping and layout - reset to defaults
        setGroupBy(cfg.groupBy ?? (listId ? "status" : "list"));
        setGroupDirection(cfg.groupDirection ?? "asc");
        setExpandedSubtaskMode(cfg.subtasksMode ?? "collapsed");
        setSortBy(cfg.sortBy ?? "manual");
        setSortDirection(cfg.sortDirection ?? "asc");

        // Visibility options - reset to defaults
        setShowCompleted(cfg.showCompleted ?? false);
        setShowCompletedSubtasks(cfg.showCompletedSubtasks ?? false);
        setVisibleColumns(Array.isArray(cfg.visibleColumns) && cfg.visibleColumns.length
            ? new Set(cfg.visibleColumns)
            : new Set(["name", "assignee", "dueDate", "priority"]));

        // Layout options - reset to defaults
        setShowEmptyStatuses(cfg.showEmptyStatuses ?? false);
        setWrapText(cfg.wrapText ?? false);
        setShowTaskLocations(cfg.showTaskLocations ?? false);
        setShowSubtaskParentNames(cfg.showSubtaskParentNames ?? false);
        setShowTaskProperties(cfg.showTaskProperties ?? true);
        setShowTasksFromOtherLists(cfg.showTasksFromOtherLists ?? false);
        setShowSubtasksFromOtherLists(cfg.showSubtasksFromOtherLists ?? false);
        setPinDescription(cfg.pinDescription ?? false);

        // View settings - reset to defaults
        setViewAutosave(cfg.viewAutosave ?? false);
        setDefaultToMeMode(cfg.defaultToMeMode ?? false);

        // Update snapshot with the reverted config
        const revertedConfig = {
            groupBy: cfg.groupBy ?? (listId ? "status" : "list"),
            groupDirection: cfg.groupDirection ?? "asc",
            subtasksMode: cfg.subtasksMode ?? "collapsed",
            sortBy: cfg.sortBy ?? "manual",
            sortDirection: cfg.sortDirection ?? "asc",
            showCompleted: cfg.showCompleted ?? false,
            showCompletedSubtasks: cfg.showCompletedSubtasks ?? false,
            visibleColumns: Array.isArray(cfg.visibleColumns) && cfg.visibleColumns.length
                ? cfg.visibleColumns
                : ["name", "assignee", "dueDate", "priority"],
            showEmptyStatuses: cfg.showEmptyStatuses ?? false,
            wrapText: cfg.wrapText ?? false,
            showTaskLocations: cfg.showTaskLocations ?? false,
            showSubtaskParentNames: cfg.showSubtaskParentNames ?? false,
            showTaskProperties: cfg.showTaskProperties ?? true,
            showTasksFromOtherLists: cfg.showTasksFromOtherLists ?? false,
            showSubtasksFromOtherLists: cfg.showSubtasksFromOtherLists ?? false,
            pinDescription: cfg.pinDescription ?? false,
            viewAutosave: cfg.viewAutosave ?? false,
            defaultToMeMode: cfg.defaultToMeMode ?? false,
        };

        setSavedSnapshot(stableStringify(revertedConfig));
        toast.success("Changes reverted to default");
    }, [viewConfigFromDb, listId]);

    const saveAsNewView = useCallback(async () => {
        if (!viewId) return;

        // Must have at least one container ID
        if (!spaceId && !projectId && !teamId && !listId) {
            toast.error("Cannot create view: missing container context");
            return;
        }

        const newName = `${viewData?.name || "View"} (Copy)`;
        const raw = (initialConfig ?? {}) as any;
        const listView = raw?.listView ?? {};
        const nextConfig = { ...raw, listView: { ...listView, ...currentViewConfig, savedFilterPresets: savedFilters, viewAutosave: false } };

        try {
            await createViewMutation.mutateAsync({
                name: newName,
                type: viewData?.type || "LIST",
                spaceId: spaceId || undefined,
                projectId: projectId || undefined,
                teamId: teamId || undefined,
                listId: listId || undefined,
                config: nextConfig,
            });
        } catch (error: any) {
            toast.error(`Failed to create view: ${error.message}`);
        }
    }, [viewId, viewData, spaceId, projectId, teamId, listId, initialConfig, currentViewConfig, savedFilters, createViewMutation]);

    // Auto-save effect when autosave is enabled
    useEffect(() => {
        if (!viewAutosave || !isViewDirty || !viewId) return;
        const timer = setTimeout(() => {
            void saveViewConfig(undefined, true);
        }, 1000); // Debounce 1 second
        return () => clearTimeout(timer);
    }, [viewAutosave, isViewDirty, viewId, currentViewConfig]);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const activeId = String(event.active.id);
        // If multiple tasks are selected and one of them is dragged, treat all as a multi-drag
        const multi = selectedTasks.includes(activeId) ? selectedTasks : [activeId];
        setDraggingIds(multi);
        setDragActiveId(activeId);
        setDragOverId(null);
        setDropPosition(null);
    }, [selectedTasks]);

    const handleDragMove = useCallback((event: DragMoveEvent) => {
        setDragDeltaX(event.delta.x);
    }, []);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const overId = event.over?.id ? String(event.over.id) : null;
        setDragOverId(overId);

        const overRect = event.over?.rect;
        const activeRect = event.active?.rect.current.translated;
        if (overId && overRect && activeRect) {
            const activeCenterY = activeRect.top + activeRect.height / 2;
            const overMidY = overRect.top + overRect.height / 2;
            setDropPosition(activeCenterY < overMidY ? "before" : "after");
        } else {
            setDropPosition(null);
        }
    }, []);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over, delta } = event;

        // ?ECapture state values BEFORE clearing them
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
            return;
        }

        const activeId = String(active.id);
        const overId = String(over.id);
        const activeTask = tasks.find(t => t.id === activeId);

        // Check if dropping on a group header
        const isOverGroup = overId.startsWith("group:");
        const groupName = isOverGroup ? overId.replace("group:", "") : null;
        const overTask = isOverGroup ? null : tasks.find(t => t.id === overId);

        if (!activeTask || (!overTask && !isOverGroup)) {
            return;
        }

        // Switch to manual sort automatically if we're reordering
        if (sortBy !== "manual") {
            setSortBy("manual");
        }

        // ?EUse captured values instead of state
        const idsToMove = capturedDraggingIds.length ? capturedDraggingIds : [activeId];

        // ?EFLAT LIST APPROACH: Work with ALL tasks as a single ordered list
        // Get all tasks sorted by current order
        const allTasksSorted = [...tasks].sort((a, b) => (a.order || "").localeCompare(b.order || ""));
        const currentGlobalOrder = allTasksSorted.map(t => t.id);
        const originalGlobalOrder = [...currentGlobalOrder];

        // Step 1: Remove all items being dragged
        const tempOrder = currentGlobalOrder.filter(id => !idsToMove.includes(id));

        // Step 2: Find where to insert in the temp order
        const targetIndex = tempOrder.indexOf(overId);

        let finalGlobalOrder: string[];

        if (targetIndex === -1) {

            // Fallback: append to end
            finalGlobalOrder = [...tempOrder, ...idsToMove];
        } else {
            // Insert based on position
            let insertIndex: number;
            if (capturedDropPosition === "before") {
                insertIndex = targetIndex;
            } else {
                insertIndex = targetIndex + 1;
            }

            // Step 3: Insert the dragged items
            finalGlobalOrder = [
                ...tempOrder.slice(0, insertIndex),
                ...idsToMove,
                ...tempOrder.slice(insertIndex)
            ];
        }

        // ?ECheck if final order is different from original
        if (originalGlobalOrder.join(',') === finalGlobalOrder.join(',')) {
            return;
        }

        // ?EUpdate orderByParent to reflect new global order
        // Rebuild orderByParent from the new global order
        const nextOrderByParent: Record<string, string[]> = {};
        const rootKey = "root";

        finalGlobalOrder.forEach(taskId => {
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;

            const parentKey = normalizeParentId(task.parentId) ?? rootKey;
            if (!nextOrderByParent[parentKey]) {
                nextOrderByParent[parentKey] = [];
            }
            nextOrderByParent[parentKey].push(taskId);
        });

        const payloads: any[] = [];

        // Define target group attributes based on what we dropped onto
        const targetGroupData: any = {};
        if (isOverGroup && groupName) {
            if (groupBy === "status") {
                targetGroupData.statusId = getStatusIdForGroup(groupName);
            } else if (groupBy === "priority") {
                targetGroupData.priority = groupName === "No Priority" ? null : groupName;
            } else if (groupBy === "list") {
                const tasksInGroup = groupedTasks[groupName] || [];
                targetGroupData.listId = getListIdForGroup(tasksInGroup);
            }
        } else if (overTask) {
            if (groupBy === "status") targetGroupData.statusId = overTask.statusId ?? null;
            else if (groupBy === "priority") targetGroupData.priority = overTask.priority ?? null;
            else if (groupBy === "list") {
                targetGroupData.listId = (overTask as any).listId ?? (overTask.list as any)?.id ?? null;
            }
        }

        // ?ERegenerate order for ALL tasks in global order
        let prevOrder: string | null = null;

        finalGlobalOrder.forEach((taskId) => {
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;

            const newOrder = generateKeyBetween(prevOrder, null);
            prevOrder = newOrder;

            const updatePayload: any = { id: taskId, order: newOrder };
            let changed = task.order !== newOrder;

            // ?ECRITICAL: NEVER change parentId - only update group fields for moved tasks
            if (idsToMove.includes(taskId)) {
                Object.entries(targetGroupData).forEach(([key, value]) => {
                    if ((task as any)[key] !== value) {
                        (updatePayload as any)[key] = value;
                        changed = true;
                    }
                });
            }

            if (changed) {
                payloads.push(updatePayload);
            }
        });

        // If no changes needed, exit
        if (payloads.length === 0) {
            console.log('??E?E?E?E[DragEnd] No changes needed or generated');
            return;
        }

        // ?? 1. Update orderByParent FIRST for immediate UI feedback
        setOrderByParent(nextOrderByParent);

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
                await Promise.all(batchedPayloads.map(p => updateTask.mutateAsync(p)));
                void utils.task.list.invalidate();
            } catch (e) {
                console.error("PeopleView drag update failed:", e);
                setOrderByParent(capturedOrderByParent);
                void utils.task.list.invalidate();
            }
        }, 300);

    }, [
        tasks,
        groupBy,
        sortBy,
        updateTask,
        utils,
        draggingIds,
        dropPosition,
        orderByParent,
        groupedTasks,
        getStatusIdForGroup,
        getListIdForGroup,
    ]);

    const renderFilterContent = (props?: { onClose?: () => void }) => {
        return (
            <div className="flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-zinc-50/50">
                    <div>
                        <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-base">
                            Filters
                            <Info className="h-4 w-4 text-zinc-400" />
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <Popover open={savedFiltersPanelOpen} onOpenChange={setSavedFiltersPanelOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs font-bold gap-1.5 border-zinc-200 shadow-none hover:bg-white"
                                >
                                    Saved filters
                                    <ChevronDown className={cn("h-3 w-3 transition-transform", savedFiltersPanelOpen && "rotate-180")} />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-80 p-0 overflow-hidden shadow-2xl">
                                <div className="p-3 border-b border-zinc-100 bg-zinc-50/50">
                                    <div className="flex items-center h-8 rounded-md border border-zinc-200 bg-white px-2">
                                        <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                        <Input
                                            variant="ghost"
                                            placeholder="Search..."
                                            className="h-full px-2 text-xs border-0 bg-transparent shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0"
                                            value={savedFiltersSearch}
                                            onChange={e => setSavedFiltersSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="max-h-[300px] overflow-auto">
                                    {savedFilters.length === 0 ? (
                                        <div className="p-8 text-center bg-white">
                                            <p className="text-xs text-zinc-400">No saved filters yet</p>
                                        </div>
                                    ) : (
                                        <div className="p-1 space-y-0.5 bg-white">
                                            <p className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Workspace</p>
                                            {savedFilters
                                                .filter(f => !savedFiltersSearch || f.name.toLowerCase().includes(savedFiltersSearch.toLowerCase()))
                                                .map(f => (
                                                    <div
                                                        key={f.id}
                                                        className="group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-50 cursor-pointer transition-colors"
                                                        onClick={() => applySavedFilter(f.config)}
                                                    >
                                                        <span className="text-xs font-medium text-zinc-700">{f.name}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-200"
                                                            onClick={(e) => deleteSavedFilter(f.id, e)}
                                                        >
                                                            <Trash2 className="h-3 w-3 text-zinc-400" />
                                                        </Button>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 border-t border-zinc-100 bg-zinc-50/30">
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Name..."
                                            className="h-8 text-xs flex-1"
                                            value={savedFilterName}
                                            onChange={e => setSavedFilterName(e.target.value)}
                                        />
                                        <Button
                                            className="h-8 text-xs font-bold bg-zinc-900 hover:bg-black text-white px-3"
                                            onClick={saveNewFilter}
                                            disabled={!savedFilterName.trim()}
                                        >
                                            Save new filter
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-zinc-100" onClick={() => props?.onClose ? props.onClose() : setFiltersPanelOpen(false)}><X className="h-4 w-4" /></Button>
                    </div>
                </div>

                {filterGroups.conditions.length === 0 ? (
                    <div className="p-6 h-[88px]">
                        <Button
                            className="h-9 px-3 text-sm font-bold bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl shadow-sm cursor-pointer"
                            onClick={() => addFilterGroup()}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add filter
                        </Button>
                    </div>
                ) : (
                    <ScrollArea className="p-5 text-sm h-[350px]">
                        <div className="space-y-4">
                            <div className="space-y-4">
                                {/* Render each top-level group */}
                                {(() => {
                                    const hasAnyValueAtRoot = filterGroups.conditions.some(c => {
                                        if ("conditions" in c) {
                                            return hasAnyValueInGroup(c as FilterGroup);
                                        }
                                        return hasFilterValue(c as FilterCondition);
                                    });

                                    // If any group has a value, only show groups with values
                                    // BUT always show ALL empty groups at the end to allow adding multiple filters
                                    const visibleGroups = hasAnyValueAtRoot
                                        ? (() => {
                                            const groupsWithValues = filterGroups.conditions.filter(c => {
                                                if ("conditions" in c) {
                                                    return hasAnyValueInGroup(c as FilterGroup);
                                                }
                                                return hasFilterValue(c as FilterCondition);
                                            });
                                            // Include ALL empty groups at the end (not just the last one)
                                            const emptyGroups = filterGroups.conditions.filter(c => {
                                                if ("conditions" in c) {
                                                    return !hasAnyValueInGroup(c as FilterGroup);
                                                }
                                                return !hasFilterValue(c as FilterCondition);
                                            });
                                            // Return groups with values first, then all empty groups
                                            return [...groupsWithValues, ...emptyGroups];
                                        })()
                                        : filterGroups.conditions;

                                    return visibleGroups.map((groupItem, visibleGroupIdx) => {
                                        const isGroup = "conditions" in groupItem;
                                        if (!isGroup) {
                                            // This shouldn't happen at root level, but handle it gracefully
                                            return null;
                                        }
                                        const group = groupItem as FilterGroup;

                                        // Find the original index in the full conditions array for "where" label logic
                                        const originalIdx = filterGroups.conditions.findIndex(c => c.id === group.id);
                                        const isFirstWithValue = hasAnyValueAtRoot && visibleGroupIdx === 0;
                                        const shouldShowWhere = !hasAnyValueAtRoot ? (originalIdx === 0) : isFirstWithValue;
                                        const shouldShowOperator = visibleGroups.length > 1 && visibleGroupIdx === 1;

                                        return (
                                            <div key={group.id} className="flex gap-3 items-start">
                                                {/* Operator selector for inter-group logic - only show when multiple groups */}
                                                {visibleGroups.length > 1 && (
                                                    <div className="w-[60px] flex justify-end items-center shrink-0">
                                                        {shouldShowWhere ? (
                                                            <span className="text-[10px] font-bold text-zinc-400/80 pr-3 uppercase tracking-wider">Where</span>
                                                        ) : shouldShowOperator ? (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 w-[50px] text-xs font-black uppercase tracking-widest bg-white border-zinc-200 rounded-sm shadow-sm hover:border-zinc-300 cursor-pointer mr-2 pl-2 pr-1"
                                                                onClick={() => updateFilterGroupOperator("root", filterGroups.operator === "AND" ? "OR" : "AND")}
                                                            >
                                                                {filterGroups.operator}
                                                                <ChevronDown className="h-3 w-3 ml-0 opacity-40 shrink-0" />
                                                            </Button>
                                                        ) : (
                                                            <div className="pr-3 flex items-center h-8">
                                                                <span className="text-xs font-black uppercase tracking-widest text-zinc-300">{filterGroups.operator}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Group block */}
                                                <div className="flex-1 p-5 bg-zinc-50/50 rounded-2xl border border-zinc-100/80 space-y-4">
                                                    {/* Render conditions within this group */}
                                                    {(() => {
                                                        const hasAnyValue = hasAnyValueInGroup(group);
                                                        // If any condition has a value, only show conditions with values
                                                        // BUT always show ALL empty conditions at the end to allow adding multiple nested filters
                                                        const visibleConditions = hasAnyValue
                                                            ? (() => {
                                                                const conditionsWithValues = group.conditions.filter(c => {
                                                                    if ("conditions" in c) {
                                                                        return hasAnyValueInGroup(c as FilterGroup);
                                                                    }
                                                                    return hasFilterValue(c as FilterCondition);
                                                                });
                                                                // Include ALL empty conditions at the end (not just the last one)
                                                                const emptyConditions = group.conditions.filter(c => {
                                                                    if ("conditions" in c) {
                                                                        return !hasAnyValueInGroup(c as FilterGroup);
                                                                    }
                                                                    return !hasFilterValue(c as FilterCondition);
                                                                });
                                                                // Return conditions with values first, then all empty conditions
                                                                return [...conditionsWithValues, ...emptyConditions];
                                                            })()
                                                            : group.conditions;

                                                        return visibleConditions.map((item, visibleIdx) => {
                                                            const isNestedGroup = "conditions" in item;
                                                            const cond = !isNestedGroup ? (item as FilterCondition) : null;
                                                            const field = cond ? (FILTER_OPTIONS.find(f => f.id === cond.field) || FIELD_CONFIG.find(f => f.id === cond.field)) : null;
                                                            const availableOps = cond ? (FIELD_OPERATORS[cond.field] || [{ id: "is", label: "Is" }]) : [];

                                                            if (isNestedGroup) {
                                                                // Handle nested groups if needed (for future expansion)
                                                                return null;
                                                            }

                                                            // Find the original index in the full conditions array for "where" label logic
                                                            const originalIdx = group.conditions.findIndex(c => c.id === item.id);
                                                            const isFirstWithValue = hasAnyValue && visibleIdx === 0;
                                                            const shouldShowWhere = !hasAnyValue ? (originalIdx === 0) : isFirstWithValue;
                                                            const shouldShowOperator = visibleConditions.length > 1 && visibleIdx === 1;

                                                            return (
                                                                <div key={item.id} className="flex gap-3 items-start">
                                                                    {/* Label Column for conditions within group - only show when multiple conditions */}
                                                                    {visibleConditions.length > 1 && (
                                                                        <div className="w-[60px] flex justify-end items-center shrink-0">
                                                                            {shouldShowWhere ? (
                                                                                <span className="text-[10px] font-bold text-zinc-400/80 pr-3 uppercase tracking-wider">Where</span>
                                                                            ) : shouldShowOperator ? (
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    className="h-8 w-[50px] text-xs font-black uppercase tracking-widest bg-white border-zinc-200 rounded-sm shadow-sm hover:border-zinc-300 cursor-pointer mr-2 pl-2 pr-1"
                                                                                    onClick={() => updateFilterGroupOperator(group.id, group.operator === "AND" ? "OR" : "AND")}
                                                                                >
                                                                                    {group.operator}
                                                                                    <ChevronDown className="h-3 w-3 ml-0 opacity-40 shrink-0" />
                                                                                </Button>
                                                                            ) : (
                                                                                <span className="text-xs font-black uppercase tracking-widest text-zinc-300 pr-3">{group.operator}</span>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* Filter condition content */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex gap-2 items-center">
                                                                            <DropdownMenu>
                                                                                <DropdownMenuTrigger asChild>
                                                                                    <Button variant="ghost" size="sm" className="h-8 text-xs font-medium gap-2 px-3 hover:bg-zinc-50 shrink-0 justify-between w-[120px] bg-white border border-zinc-200 rounded-sm shadow-sm hover:border-zinc-300 cursor-pointer text-zinc-700 truncate whitespace-nowrap">
                                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                                            {field ? (
                                                                                                <>
                                                                                                    {typeof field.icon === "function" ? <field.icon className="h-3.5 w-3.5 text-zinc-500 shrink-0" /> : <Box className="h-3.5 w-3.5 text-zinc-500 shrink-0" />}
                                                                                                    <span className="truncate">{field.label}</span>
                                                                                                </>
                                                                                            ) : (
                                                                                                <span className="text-zinc-500">Select filter</span>
                                                                                            )}
                                                                                        </div>
                                                                                        <ChevronDown className="h-3 w-3 opacity-30 shrink-0" />
                                                                                    </Button>
                                                                                </DropdownMenuTrigger>
                                                                                <DropdownMenuContent
                                                                                    side="bottom"
                                                                                    align="start"
                                                                                    avoidCollisions={false}
                                                                                    sideOffset={6}
                                                                                    className="w-64 max-h-[400px] overflow-auto p-0"
                                                                                >
                                                                                    <div className="p-2 border-b border-zinc-100 sticky top-0 bg-white z-10">
                                                                                        <Input placeholder="Search fields..." className="h-8 text-xs border-zinc-100" value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
                                                                                    </div>
                                                                                    <div className="p-1">
                                                                                        {FILTER_OPTIONS.filter(f => !filterSearch || f.label.toLowerCase().includes(filterSearch.toLowerCase())).map(f => (
                                                                                            <DropdownMenuItem key={f.id} onClick={() => { updateFilterCondition(cond!.id, { field: f.id as string, operator: (FIELD_OPERATORS[f.id] || [{ id: "is" }])[0].id, value: [] }); setFilterSearch(""); }} className="rounded-lg h-9">
                                                                                                <div className="flex items-center gap-2.5">
                                                                                                    {typeof f.icon === "function" ? <f.icon className="h-4 w-4 text-zinc-400" /> : <Box className="h-4 w-4 text-zinc-400" />}
                                                                                                    <span className="font-medium text-zinc-700">{f.label}</span>
                                                                                                </div>
                                                                                            </DropdownMenuItem>
                                                                                        ))}
                                                                                    </div>
                                                                                </DropdownMenuContent>
                                                                            </DropdownMenu>

                                                                            {field && (
                                                                                <>
                                                                                    <DropdownMenu>
                                                                                        <DropdownMenuTrigger asChild>
                                                                                            <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold px-3 text-zinc-800 hover:bg-zinc-50 shrink-0 w-20 justify-start bg-white border border-zinc-200 rounded-sm shadow-sm hover:border-zinc-300 cursor-pointer">
                                                                                                {availableOps.find(o => o.id === cond!.operator)?.label || cond!.operator}
                                                                                                <ChevronDown className="h-3 w-3 ml-auto opacity-30" />
                                                                                            </Button>
                                                                                        </DropdownMenuTrigger>
                                                                                        <DropdownMenuContent className="w-48 p-1">
                                                                                            {availableOps.map(op => (
                                                                                                <DropdownMenuItem key={op.id} onClick={() => updateFilterCondition(cond!.id, { operator: op.id as any })} className="rounded-lg h-9">
                                                                                                    <span className="font-medium text-zinc-700">{op.label}</span>
                                                                                                </DropdownMenuItem>
                                                                                            ))}
                                                                                        </DropdownMenuContent>
                                                                                    </DropdownMenu>

                                                                                    <div className="flex-1 min-w-0">
                                                                                        {cond!.operator === "is_set" || cond!.operator === "is_not_set" || cond!.operator === "is_archived" || cond!.operator === "is_not_archived" || cond!.operator === "has" || cond!.operator === "doesnt_have" ? null : (
                                                                                            <>
                                                                                                {cond!.field === "status" ? (
                                                                                                    <Popover>
                                                                                                        <PopoverTrigger asChild>
                                                                                                            <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                                {Array.isArray(cond!.value) && cond!.value.length > 0
                                                                                                                    ? `${cond!.value.length} selected`
                                                                                                                    : "Select option"}
                                                                                                            </Button>
                                                                                                        </PopoverTrigger>
                                                                                                        <PopoverContent align="start" className="w-56 p-2">
                                                                                                            <div className="space-y-0.5">
                                                                                                                {allAvailableStatuses.map(s => (
                                                                                                                    <label key={s.id} className="flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                                                                                                        <Checkbox
                                                                                                                            checked={Array.isArray(cond!.value) && cond!.value.includes(s.id)}
                                                                                                                            onCheckedChange={(checked) => {
                                                                                                                                const current = Array.isArray(cond!.value) ? cond!.value : [];
                                                                                                                                const next = checked ? [...current, s.id] : current.filter(id => id !== s.id);
                                                                                                                                updateFilterCondition(cond!.id, { value: next });
                                                                                                                            }}
                                                                                                                        />
                                                                                                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                                                                                                                        <span className="text-xs font-medium text-zinc-700 truncate">{s.name}</span>
                                                                                                                    </label>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                        </PopoverContent>
                                                                                                    </Popover>
                                                                                                ) : cond!.field === "priority" ? (
                                                                                                    <Popover>
                                                                                                        <PopoverTrigger asChild>
                                                                                                            <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                                {Array.isArray(cond!.value) && cond!.value.length > 0
                                                                                                                    ? `${cond!.value.length} selected`
                                                                                                                    : "Select option"}
                                                                                                            </Button>
                                                                                                        </PopoverTrigger>
                                                                                                        <PopoverContent align="start" className="w-48 p-2">
                                                                                                            <div className="space-y-0.5">
                                                                                                                {["URGENT", "HIGH", "NORMAL", "LOW"].map(p => (
                                                                                                                    <label key={p} className="flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                                                                                                        <Checkbox
                                                                                                                            checked={Array.isArray(cond!.value) && cond!.value.includes(p)}
                                                                                                                            onCheckedChange={(checked) => {
                                                                                                                                const current = Array.isArray(cond!.value) ? cond!.value : [];
                                                                                                                                const next = checked ? [...current, p] : current.filter(val => val !== p);
                                                                                                                                updateFilterCondition(cond!.id, { value: next });
                                                                                                                            }}
                                                                                                                        />
                                                                                                                        <Flag className={cn("h-3.5 w-3.5", getPriorityStyles(p).icon)} />
                                                                                                                        <span className="text-xs font-medium text-zinc-700 truncate capitalize">{p.toLowerCase()}</span>
                                                                                                                    </label>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                        </PopoverContent>
                                                                                                    </Popover>
                                                                                                ) : cond!.field === "assignee" || cond!.field === "createdBy" || cond!.field === "follower" ? (
                                                                                                    <Popover>
                                                                                                        <PopoverTrigger asChild>
                                                                                                            <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                                {Array.isArray(cond!.value) && cond!.value.length > 0
                                                                                                                    ? `${cond!.value.length} selected`
                                                                                                                    : "Select option"}
                                                                                                            </Button>
                                                                                                        </PopoverTrigger>
                                                                                                        <PopoverContent align="start" className="w-64 p-2">
                                                                                                            <div className="p-2 border-b border-zinc-100 mb-1">
                                                                                                                <div className="flex items-center h-8 rounded-md border border-zinc-200 bg-white px-2">
                                                                                                                    <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                                                                                                    <Input variant="ghost" placeholder="Search people..." className="h-full px-2 text-[10px] border-0 bg-transparent shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0" value={assigneesSearch} onChange={e => setAssigneesSearch(e.target.value)} />
                                                                                                                </div>
                                                                                                            </div>
                                                                                                            <ScrollArea className="h-[240px]">
                                                                                                                {users.filter(u => !assigneesSearch || u.name?.toLowerCase().includes(assigneesSearch.toLowerCase())).map(u => (
                                                                                                                    <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                                                                                                        <Checkbox
                                                                                                                            checked={Array.isArray(cond!.value) && cond!.value.includes(u.id)}
                                                                                                                            onCheckedChange={(checked) => {
                                                                                                                                const current = Array.isArray(cond!.value) ? cond!.value : [];
                                                                                                                                const next = checked ? [...current, u.id] : current.filter(id => id !== u.id);
                                                                                                                                updateFilterCondition(cond!.id, { value: next });
                                                                                                                            }}
                                                                                                                        />
                                                                                                                        <Avatar className="h-6 w-6">
                                                                                                                            <AvatarImage src={u.image || undefined} />
                                                                                                                            <AvatarFallback className="text-[10px]">{u.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                                                                                        </Avatar>
                                                                                                                        <span className="text-xs font-medium text-zinc-700 truncate">{u.name}</span>
                                                                                                                    </label>
                                                                                                                ))}
                                                                                                            </ScrollArea>
                                                                                                        </PopoverContent>
                                                                                                    </Popover>
                                                                                                ) : cond!.field === "tags" ? (
                                                                                                    <Popover>
                                                                                                        <PopoverTrigger asChild>
                                                                                                            <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                                {Array.isArray(cond!.value) && cond!.value.length > 0
                                                                                                                    ? `${cond!.value.length} tags selected`
                                                                                                                    : "Select option"}
                                                                                                            </Button>
                                                                                                        </PopoverTrigger>
                                                                                                        <PopoverContent align="start" className="w-56 p-2">
                                                                                                            {allAvailableTags.length === 0 ? (
                                                                                                                <p className="text-[10px] text-zinc-500 p-4 text-center">No tags found in this view</p>
                                                                                                            ) : (
                                                                                                                <div className="space-y-0.5">
                                                                                                                    {allAvailableTags.map(tag => {
                                                                                                                        const parsed = parseEncodedTag(tag);
                                                                                                                        return (
                                                                                                                            <label key={tag} className="flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                                                                                                                <Checkbox
                                                                                                                                    checked={Array.isArray(cond!.value) && cond!.value.includes(tag)}
                                                                                                                                    onCheckedChange={(checked) => {
                                                                                                                                        const current = Array.isArray(cond!.value) ? cond!.value : [];
                                                                                                                                        const next = checked ? [...current, tag] : current.filter(t => t !== tag);
                                                                                                                                        updateFilterCondition(cond!.id, { value: next });
                                                                                                                                    }}
                                                                                                                                />
                                                                                                                                <span className="text-[11px] font-bold px-2 py-1 rounded-md" style={{ backgroundColor: parsed.color + '20', color: parsed.color }}>
                                                                                                                                    {parsed.label}
                                                                                                                                </span>
                                                                                                                            </label>
                                                                                                                        );
                                                                                                                    })}
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </PopoverContent>
                                                                                                    </Popover>
                                                                                                ) : cond!.field === "dependency" ? (
                                                                                                    <DropdownMenu>
                                                                                                        <DropdownMenuTrigger asChild>
                                                                                                            <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                                {cond!.value || "Select dependency type"}
                                                                                                            </Button>
                                                                                                        </DropdownMenuTrigger>
                                                                                                        <DropdownMenuContent align="start" className="w-48">
                                                                                                            {["Blocking", "Waiting on", "Link", "Any"].map(v => (
                                                                                                                <DropdownMenuItem key={v} onClick={() => updateFilterCondition(cond!.id, { value: v })} className="text-xs font-medium">
                                                                                                                    {v}
                                                                                                                </DropdownMenuItem>
                                                                                                            ))}
                                                                                                        </DropdownMenuContent>
                                                                                                    </DropdownMenu>
                                                                                                ) : cond!.field === "taskType" ? (
                                                                                                    <Popover>
                                                                                                        <PopoverTrigger asChild>
                                                                                                            <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                                {Array.isArray(cond!.value) && cond!.value.length > 0
                                                                                                                    ? `${cond!.value.length} selected`
                                                                                                                    : "Select type"}
                                                                                                            </Button>
                                                                                                        </PopoverTrigger>
                                                                                                        <PopoverContent align="start" className="w-48 p-2">
                                                                                                            <div className="space-y-0.5">
                                                                                                                {availableTaskTypes?.map((t: any) => (
                                                                                                                    <label key={t.id} className="flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors">
                                                                                                                        <Checkbox
                                                                                                                            checked={Array.isArray(cond!.value) && cond!.value.includes(t.id)}
                                                                                                                            onCheckedChange={(checked) => {
                                                                                                                                const current = Array.isArray(cond!.value) ? cond!.value : [];
                                                                                                                                const next = checked ? [...current, t.id] : current.filter(val => val !== t.id);
                                                                                                                                updateFilterCondition(cond!.id, { value: next });
                                                                                                                            }}
                                                                                                                        />
                                                                                                                        <TaskTypeIcon type={t} className="h-3.5 w-3.5" />
                                                                                                                        <span className="text-xs font-medium text-zinc-700 capitalize">{t.name}</span>
                                                                                                                    </label>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                        </PopoverContent>
                                                                                                    </Popover>
                                                                                                ) : ["dueDate", "startDate", "dateDone", "dateCreated", "dateUpdated", "latestStatusChange"].includes(cond!.field) ? (
                                                                                                    <Popover>
                                                                                                        <PopoverTrigger asChild>
                                                                                                            <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                                {(() => {
                                                                                                                    const raw = cond!.value;
                                                                                                                    const ts = typeof raw === "number" && raw > 0 ? raw : null;
                                                                                                                    return ts ? format(new Date(ts), "MMM d, yyyy") : "Select date";
                                                                                                                })()}
                                                                                                            </Button>
                                                                                                        </PopoverTrigger>
                                                                                                        <PopoverContent align="start" className="w-auto p-0">
                                                                                                            <SingleDateCalendar
                                                                                                                selectedDate={(() => {
                                                                                                                    const raw = cond!.value;
                                                                                                                    if (typeof raw !== "number" || raw <= 0) return undefined;
                                                                                                                    return new Date(raw);
                                                                                                                })()}
                                                                                                                onDateChange={(d) => updateFilterCondition(cond!.id, { value: d ? d.getTime() : null })}
                                                                                                            />
                                                                                                        </PopoverContent>
                                                                                                    </Popover>
                                                                                                ) : cond!.field === "location" ? (
                                                                                                    <Popover>
                                                                                                        <PopoverTrigger asChild>
                                                                                                            <Button variant="ghost" size="sm" className="h-8 w-full text-xs font-medium justify-start px-2 hover:bg-zinc-50 border border-zinc-100 rounded-sm">
                                                                                                                {cond!.value ? "Location selected" : "Select location"}
                                                                                                            </Button>
                                                                                                        </PopoverTrigger>
                                                                                                        <PopoverContent align="start" className="w-[300px] p-0">
                                                                                                            <DestinationPicker
                                                                                                                workspaceId={resolvedWorkspaceId as string}
                                                                                                                onSelect={(listId) => updateFilterCondition(cond!.id, { value: listId })}
                                                                                                            />
                                                                                                        </PopoverContent>
                                                                                                    </Popover>
                                                                                                ) : (
                                                                                                    <div className="relative">
                                                                                                        <Input
                                                                                                            className="h-8 text-xs border-zinc-100 bg-white rounded-sm focus-visible:ring-violet-500 pr-8"
                                                                                                            placeholder="Select option"
                                                                                                            value={typeof cond!.value === "string" ? cond!.value : ""}
                                                                                                            onChange={e => updateFilterCondition(cond!.id, { value: e.target.value })}
                                                                                                        />
                                                                                                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-300 pointer-events-none" />
                                                                                                    </div>
                                                                                                )}
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 mt-1 cursor-pointer" onClick={() => {
                                                                        if (group.conditions.length === 1) {
                                                                            // If this is the last condition in the group, remove the entire group
                                                                            removeFilterItem(group.id);
                                                                        } else {
                                                                            // Otherwise, just remove this condition
                                                                            removeFilterItem(item.id);
                                                                        }
                                                                    }}>
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </div>
                                                            );
                                                        });
                                                    })()}

                                                    {/* Add nested filter button within group - hide only for first root-level "Where" condition when displaying first filter item with value */}
                                                    {(() => {
                                                        const hasAnyValue = hasAnyValueInGroup(group);
                                                        // Get visible conditions to check if first one is "Where" with value
                                                        const visibleConditions = hasAnyValue
                                                            ? (() => {
                                                                const conditionsWithValues = group.conditions.filter(c => {
                                                                    if ("conditions" in c) {
                                                                        return hasAnyValueInGroup(c as FilterGroup);
                                                                    }
                                                                    return hasFilterValue(c as FilterCondition);
                                                                });
                                                                const lastCondition = group.conditions[group.conditions.length - 1];
                                                                if (lastCondition && !conditionsWithValues.includes(lastCondition)) {
                                                                    const lastHasValue = "conditions" in lastCondition
                                                                        ? hasAnyValueInGroup(lastCondition as FilterGroup)
                                                                        : hasFilterValue(lastCondition as FilterCondition);
                                                                    if (!lastHasValue) {
                                                                        return [...conditionsWithValues, lastCondition];
                                                                    }
                                                                }
                                                                return conditionsWithValues;
                                                            })()
                                                            : group.conditions;

                                                        // Check if this is the first root-level group
                                                        const isFirstRootGroup = filterGroups.conditions.findIndex(c => c.id === group.id) === 0;

                                                        // Check if first visible condition is the first "Where" condition with value
                                                        const firstVisibleCondition = visibleConditions[0];
                                                        const firstConditionInGroup = group.conditions[0];

                                                        // Hide if:
                                                        // 1. This is the first root-level group
                                                        // 2. We're displaying filters with values (hasAnyValue is true)
                                                        // 3. The first visible condition exists and has a value
                                                        // 4. The first visible condition is the first condition in the original group (the "Where" condition)
                                                        const isFirstWhereWithValue = isFirstRootGroup &&
                                                            hasAnyValue &&
                                                            firstVisibleCondition &&
                                                            !("conditions" in firstVisibleCondition) &&
                                                            hasFilterValue(firstVisibleCondition as FilterCondition) &&
                                                            firstConditionInGroup &&
                                                            firstConditionInGroup.id === firstVisibleCondition.id;

                                                        // Hide only if it's the first root-level "Where" condition with value
                                                        return !isFirstWhereWithValue && (
                                                            <div className="flex items-center justify-between pt-2 group/footer">
                                                                <button
                                                                    className="text-[11px] font-bold text-zinc-400 hover:text-zinc-500 hover:bg-zinc-200 cursor-pointer px-2 py-1 rounded-md"
                                                                    onClick={() => addFilterCondition(group.id)}
                                                                >
                                                                    Add nested filter
                                                                </button>
                                                                {group.conditions.length >= 2 && (
                                                                    <button
                                                                        className="text-[11px] font-bold text-zinc-400 hover:text-zinc-500 hover:bg-zinc-200 transition-colors opacity-0 group-hover/footer:opacity-100 cursor-pointer px-2 py-1 rounded-md"
                                                                        onClick={() => removeFilterItem(group.id)}
                                                                    >
                                                                        Clear group
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}

                            </div>
                        </div>
                    </ScrollArea>
                )}
                {filterGroups.conditions.length > 0 && (
                    <div className="w-full p-4 border-t border-zinc-100 bg-white flex items-center justify-between z-10">
                        <Button
                            variant="outline"
                            className="h-9 px-3 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 border border-zinc-200 rounded-xl cursor-pointer"
                            onClick={() => addFilterGroup()}
                        >
                            <Plus className="h-4 w-4 mr-1.5" />
                            Add filter
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-600 font-medium px-3 hover:bg-red-50 border border-red-200 rounded-xl cursor-pointer"
                            onClick={() => setFilterGroups({
                                id: "root",
                                operator: "AND",
                                conditions: [],
                            })}
                        >
                            Clear all
                        </Button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full w-full flex flex-col bg-white border border-zinc-200/60 shadow-sm overflow-hidden font-sans relative min-w-0">
            {/* Toolbar ?EClickUp layout */}
            <div className="border-b border-zinc-100 bg-white px-3 py-2 shrink-0">
                <>
                    <div className="flex items-center justify-between gap-3 overflow-x-auto toolbar-scroll-x">
                        <div className="flex items-center gap-1.5 shrink-0">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs font-medium text-zinc-700 border-zinc-200"
                                    >
                                        <Link2 className="h-3.5 w-3.5 mr-1.5" />
                                        Subtasks
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-52">
                                    <DropdownMenuLabel className="text-xs text-zinc-500 font-normal">Show subtasks</DropdownMenuLabel>
                                    <DropdownMenuItem
                                        className="text-sm cursor-pointer"
                                        onClick={() => {
                                            setExpandedSubtaskMode("collapsed");
                                            setExpandedParents(new Set());
                                        }}
                                    >
                                        <span className="flex-1">Collapsed</span>
                                        {expandedSubtaskMode === "collapsed" && <CheckCheck className="h-4 w-4" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="text-sm cursor-pointer"
                                        onClick={() => {
                                            setExpandedSubtaskMode("separate");
                                            setExpandedParents(new Set());
                                        }}
                                    >
                                        <span className="flex-1">Separate</span>
                                        {expandedSubtaskMode === "separate" && <CheckCheck className="h-4 w-4" />}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs font-medium text-zinc-700 border-zinc-200"
                                    >
                                        <SortAsc className="h-3.5 w-3.5 mr-1.5" />
                                        Sort by
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-56">
                                    <DropdownMenuLabel className="text-xs">Sort By</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => setPeopleSortBy("tasks")} className="justify-between">
                                        Number of tasks
                                        {peopleSortBy === "tasks" && <CheckCheck className="h-4 w-4" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setPeopleSortBy("incomplete")} className="justify-between">
                                        Number of incomplete
                                        {peopleSortBy === "incomplete" && <CheckCheck className="h-4 w-4" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setPeopleSortBy("timeEstimate")} className="justify-between">
                                        Time estimate
                                        {peopleSortBy === "timeEstimate" && <CheckCheck className="h-4 w-4" />}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Right: Save view, Filter, Closed, Assignee, Search, Customize, Add Task */}
                        <div className="flex items-center gap-2 flex-1 justify-end">
                            <ViewToolbarSaveDropdown
                                show={isViewDirty && !viewAutosave}
                                isViewDirty={isViewDirty}
                                viewAutosave={viewAutosave}
                                isPending={updateViewMutation.isPending}
                                onSave={() => void saveViewConfig()}
                                onToggleAutosave={handleToggleAutosave}
                                onSaveAsNewView={saveAsNewView}
                                onRevertChanges={revertViewChanges}
                                isSaveAsNewPending={createViewMutation.isPending}
                            />

                            <Popover open={filtersPanelOpen} onOpenChange={(open) => {
                                setFiltersPanelOpen(open);
                                if (open === false) setSavedFiltersPanelOpen(false);
                                if (open === true) {
                                    setFieldsPanelOpen(false);
                                    setAssigneesPanelOpen(false);
                                }
                            }}>
                                <PopoverTrigger asChild>
                                    <div className="relative group/filter inline-flex">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={cn(
                                                "h-8 text-xs font-medium pr-7",
                                                filtersPanelOpen ? "bg-violet-50 text-violet-700 border-violet-200" : "text-zinc-700 border-zinc-200",
                                                appliedFilterCount > 0 && "border-violet-200 bg-violet-50/50 text-violet-700"
                                            )}
                                            onClick={() => { if (!filtersPanelOpen && filterGroups.conditions.length === 0) { addFilterGroup(); } }}
                                        >
                                            <Filter className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline ml-1">
                                                {appliedFilterCount > 0 ? `${appliedFilterCount} Filter${appliedFilterCount !== 1 ? "s" : ""}` : "Filter"}
                                            </span>
                                        </Button>
                                        {(appliedFilterCount > 0 || filtersPanelOpen) && (
                                            <div
                                                className={cn(
                                                    "absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-md hover:bg-violet-100 cursor-pointer z-10",
                                                    filtersPanelOpen ? "text-violet-700" : "text-zinc-400"
                                                )}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (appliedFilterCount > 0) {
                                                        setFilterGroups({ id: "root", operator: "AND", conditions: [] });
                                                    } else {
                                                        setFiltersPanelOpen(false);
                                                    }
                                                }}
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </div>
                                        )}
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-[600px] max-w-[95vw] p-0 overflow-hidden shadow-2xl rounded-2xl border border-zinc-200/80" sideOffset={8}>
                                    {renderFilterContent({ onClose: () => setFiltersPanelOpen(false) })}
                                </PopoverContent>
                            </Popover>

                            <ViewToolbarClosedPopover
                                showCompleted={showCompleted}
                                showCompletedSubtasks={showCompletedSubtasks}
                                onShowCompletedChange={setShowCompleted}
                                onShowCompletedSubtasksChange={setShowCompletedSubtasks}
                            />

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn("h-8 text-xs font-medium", assigneesPanelOpen ? "bg-violet-50 text-violet-700 border-violet-200" : "text-zinc-700 border-zinc-200")}
                                        onClick={() => { setAssigneesPanelOpen(!assigneesPanelOpen); setFieldsPanelOpen(false); setFiltersPanelOpen(false); }}
                                    >
                                        <Users className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline ml-1">Assignee</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Filter by assignee</TooltipContent>
                            </Tooltip>

                            <div className="hidden sm:block" ref={toolbarSearchRef}>
                                {toolbarSearchOpen ? (
                                    <div className="w-40">
                                        <div className="flex h-8 items-center rounded-lg border border-zinc-200 bg-zinc-50/50 px-2.5 shadow-sm transition-colors">
                                            <Search className="h-4 w-4 shrink-0 text-zinc-400" />
                                            <Input
                                                ref={toolbarSearchInputRef}
                                                variant="ghost"
                                                className="h-full bg-transparent pl-2 pr-0 text-sm focus:outline-none focus:ring-0 focus-visible:ring-0"
                                                placeholder="Search..."
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Escape") setToolbarSearchOpen(false);
                                                }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-zinc-700 border-zinc-200"
                                                onClick={() => setToolbarSearchOpen(true)}
                                            >
                                                <Search className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">Search</TooltipContent>
                                    </Tooltip>
                                )}
                            </div>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs font-medium text-zinc-700 border-zinc-200"
                                        onClick={() => setCustomizePanelOpen(true)}
                                    >
                                        <Settings className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline ml-1">Customize</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Customize view</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        className="h-8 gap-1.5 px-3 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white border-0 shadow-sm"
                                        onClick={() => setAddTaskModalOpen(true)}
                                        disabled={addTaskModalOpen}
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">Add Task</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Add new task</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            "h-8 text-xs font-medium border-zinc-200",
                                            workloadSidebarOpen ? "bg-violet-50 text-violet-700 border-violet-200" : "text-zinc-700"
                                        )}
                                        onClick={() => setWorkloadSidebarOpen((v) => !v)}
                                    >
                                        <BarChart3 className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline ml-1">Workload</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Show/hide workload sidebar</TooltipContent>
                            </Tooltip>

                            <TaskCreationModal context={spaceId ? "SPACE" : projectId ? "PROJECT" : "GENERAL"} contextId={spaceId || projectId} workspaceId={resolvedWorkspaceId} users={users} lists={lists} defaultListId={listId} availableStatuses={allAvailableStatuses} open={addTaskModalOpen} onOpenChange={setAddTaskModalOpen} trigger={<span className="sr-only" />} />
                        </div>
                    </div>
                </>
            </div>

            {/* Content + optional workload sidebar */}
            <div className="flex-1 relative min-w-0 pt-2 flex overflow-hidden">
                <div className="flex-1 min-w-0 overflow-x-auto overflow-y-auto peopleview-scrollbar">
                    {pinDescription && currentList && (
                        <div
                            className="shrink-0 px-4 py-3 bg-zinc-50 border-b border-zinc-100 cursor-pointer hover:bg-zinc-100 transition-colors"
                            onClick={() => {
                                setDescriptionDraft(currentList.description || "");
                                setIsDescriptionModalOpen(true);
                            }}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <AlignLeft className="h-3.5 w-3.5 text-zinc-400" />
                                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Description</span>
                            </div>
                            {currentList.description ? (
                                <div className="text-sm text-zinc-700 line-clamp-3">
                                    {currentList.description.replace(/<[^>]*>?/gm, "") || "View description..."}
                                </div>
                            ) : (
                                <p className="text-sm text-zinc-400 italic">No description. Click to add...</p>
                            )}
                        </div>
                    )}
                    <PeopleViewContent
                        users={users as PeopleContentUser[]}
                        agents={agents as PeopleContentUser[]}
                        tasks={filteredTasks}
                        teams={(scopedEntityRoster.teams as PeopleContentTeam[]) ?? []}
                        searchQuery={searchQuery}
                        sortBy={peopleSortBy}
                        loading={isLoading}
                        availableStatuses={allAvailableStatuses}
                        onCreateTask={handleCreateTaskFromCard}
                        onOpenTask={openTaskDetail}
                    />
                    <TaskListLoadMore
                        loadMoreRef={loadMoreRef}
                        hasMore={hasMoreTasks}
                        isFetchingNextPage={isFetchingNextPage}
                        loaded={filteredTasks.length}
                        total={taskTotal}
                    />
                </div>

                {workloadSidebarOpen && (
                    <div
                        className="relative h-full border-l border-zinc-200 bg-white group/workload"
                        style={{ width: `${workloadSidebarWidth}px`, minWidth: "260px", maxWidth: "680px" }}
                    >
                        <div
                            className={cn(
                                "absolute left-0 top-0 h-full w-2 -translate-x-1/2 cursor-col-resize z-20 transition-opacity",
                                isResizingWorkloadSidebar ? "opacity-100" : "opacity-0 group-hover/workload:opacity-100"
                            )}
                            onMouseDown={startWorkloadSidebarResize}
                        >
                            <div className="mx-auto mt-6 h-12 w-1 rounded-full bg-zinc-300" />
                        </div>

                        <div className="h-full overflow-y-auto peopleview-scrollbar">
                            <div className="p-3">
                                <div className="sticky top-0 left-0 z-20 mb-2 rounded-md bg-white/95 backdrop-blur px-1 py-1">
                                    <h3 className="text-2xl font-bold text-zinc-900 mb-2">Workload</h3>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-8 text-xs border-zinc-200 bg-white">
                                                {workloadViewMode === "total" ? "Total" : workloadViewMode === "people" ? "People" : workloadViewMode === "teams" ? "Teams" : "Agents"}
                                                <ChevronDown className="h-3.5 w-3.5 ml-1" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-36">
                                            <DropdownMenuItem onClick={() => setWorkloadViewMode("total")}>Total</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setWorkloadViewMode("people")}>People</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setWorkloadViewMode("teams")}>Teams</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setWorkloadViewMode("agents")}>Agents</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 min-h-[460px]">
                                    <div className="h-[360px]">
                                        {workloadSidebarItems.length > 0 ? (
                                            <div className="h-full flex items-end gap-4 px-2 overflow-x-auto peopleview-scrollbar">
                                                {workloadSidebarItems.map((item: any) => {
                                                    const barHeight = Math.min(220, Math.max(18, item.incomplete * 11));
                                                    const label = item.name ?? "Item";
                                                    return (
                                                        <div key={item.id} className="w-[64px] min-w-[64px] flex flex-col items-center justify-end">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div className="w-3 rounded-full bg-zinc-400" style={{ height: `${barHeight}px` }} />
                                                                </TooltipTrigger>
                                                                <TooltipContent>{item.incomplete} tasks to do</TooltipContent>
                                                            </Tooltip>
                                                            <div className="h-6" />
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Avatar className="h-8 w-8 border-2 border-white shadow-sm cursor-default">
                                                                        <AvatarImage src={item.image ?? undefined} />
                                                                        <AvatarFallback className="text-[10px] font-semibold">
                                                                            {item.kind === "team" ? "TM" : item.kind === "agent" ? "AG" : getPeopleInitials(item.name, item.email)}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                </TooltipTrigger>
                                                                <TooltipContent>{label}</TooltipContent>
                                                            </Tooltip>
                                                            <div className="mt-1 w-full overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-zinc-500 text-center">{label}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-zinc-400 mt-4">No assigned workload in current filter.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Fields panel (Columns click or + in last column) ?Etoggle show/hide columns */}
            <SidePanel open={fieldsPanelOpen && !createFieldModalOpen} onClose={() => setFieldsPanelOpen(false)} className="absolute right-0 bottom-0 top-0 w-[360px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                    <h3 className="font-semibold text-zinc-900">Fields</h3>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFieldsPanelOpen(false)}><X className="h-4 w-4" /></Button>
                </div>
                <div className="p-3 border-b border-zinc-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                        <Input className="pl-9 h-9 text-sm" placeholder="Search for new or existing fields" value={fieldsSearch} onChange={e => setFieldsSearch(e.target.value)} />
                    </div>
                </div>
                <ScrollArea className="flex-1 p-3 pb-20 h-full">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Shown</p>
                    <div className="space-y-1 mb-4">
                        {FIELD_CONFIG.filter(f => visibleColumns.has(f.id) && (!fieldsSearch.trim() || f.label.toLowerCase().includes(fieldsSearch.toLowerCase()))).map(f => {
                            const iconAny = (f as any).icon;
                            const IconEl = typeof iconAny === "function"
                                ? React.createElement(iconAny, { className: "h-4 w-4 text-zinc-400 shrink-0" })
                                : null;
                            return (
                                <div key={f.id} className="flex items-center gap-2 py-2 px-2 rounded hover:bg-zinc-50">
                                    <GripVertical className="h-4 w-4 text-zinc-300 shrink-0 cursor-grab" />
                                    {IconEl}
                                    <span className="text-sm text-zinc-800 flex-1">{f.label}</span>
                                    <Switch checked onCheckedChange={() => toggleColumn(f.id)} />
                                </div>
                            );
                        })}
                        {FIELD_CONFIG.filter(f => visibleColumns.has(f.id)).length > 0 && (
                            <button type="button" className="text-xs text-violet-600 hover:underline" onClick={() => setVisibleColumns(new Set())}>Hide all</button>
                        )}
                    </div>
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Popular</p>
                    <div className="space-y-1">
                        {FIELD_CONFIG.filter(f => !visibleColumns.has(f.id) && (!fieldsSearch.trim() || f.label.toLowerCase().includes(fieldsSearch.toLowerCase()))).map(f => {
                            const iconAny = (f as any).icon;
                            const IconEl = typeof iconAny === "function"
                                ? React.createElement(iconAny, { className: "h-4 w-4 text-zinc-400 shrink-0" })
                                : null;
                            return (
                                <div key={f.id} className="flex items-center justify-between py-2 px-2 rounded hover:bg-zinc-50">
                                    <div className="flex items-center gap-2">
                                        {IconEl}
                                        <span className="text-sm text-zinc-800">{f.label}</span>
                                    </div>
                                    <Switch checked={false} onCheckedChange={() => toggleColumn(f.id)} />
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
                <div className="p-3 sticky bottom-0 left-0 right-0 border-t bg-white border-zinc-100">
                    <Button
                        className="w-full bg-zinc-900 hover:bg-zinc-800 text-white"
                        onClick={() => {
                            setFieldsPanelOpen(false);
                            setCreateFieldModalOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4 mr-2" />Create field
                    </Button>
                </div>
        </SidePanel>

                                        {/* Customize view panel (ClickUp-style) */ }
                                        <SidePanel open={customizePanelOpen && !layoutOptionsOpen} onClose={() => setCustomizePanelOpen(false)} className="absolute bottom-0 right-0 h-full w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col">
                                            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                                                <h3 className="font-semibold text-zinc-900">Customize view</h3>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCustomizePanelOpen(false)}><X className="h-4 w-4" /></Button>
                                            </div>
                                            <ScrollArea className="flex-1 min-h-0">
                                                <div className="p-3 space-y-2 pb-24">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <div className="flex items-center justify-center h-10 w-10 rounded-lg border border-zinc-200 bg-zinc-50 shrink-0">
                                                            <LayoutList className="h-5 w-5 text-zinc-600" />
                                                        </div>
                                                        <Input
                                                            value={viewNameDraft}
                                                            onChange={(e) => setViewNameDraft(e.target.value)}
                                                            onBlur={() => updateViewName(viewNameDraft)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") {
                                                                    updateViewName(viewNameDraft);
                                                                    (e.target as HTMLInputElement).blur();
                                                                }
                                                            }}
                                                            className="h-10 text-sm font-medium border-zinc-200"
                                                            placeholder="View name"
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        {groupBy === "status" ? (
                                                            <div className="flex items-center justify-between py-1 px-2">
                                                                <span className="text-sm text-zinc-800">Show empty statuses</span>
                                                                <Switch
                                                                    checked={showEmptyStatuses}
                                                                    onCheckedChange={setShowEmptyStatuses}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <TooltipProvider delayDuration={0}>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex items-center justify-between py-1 cursor-not-allowed opacity-50 px-2">
                                                                            <span className="text-sm text-zinc-800">Show empty statuses</span>
                                                                            <Switch
                                                                                checked={showEmptyStatuses}
                                                                                onCheckedChange={setShowEmptyStatuses}
                                                                                disabled
                                                                            />
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="left" className="bg-zinc-900 text-white border-none text-[11px] py-1.5 px-2.5">
                                                                        Grouping by status is required to enable this
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                        <div className="flex items-center justify-between py-1 px-2 cursor-pointer" onClick={() => setWrapText(!wrapText)}>
                                                            <span className="text-sm text-zinc-800">Wrap text</span>
                                                            <Switch checked={wrapText} onCheckedChange={setWrapText} />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1 px-2 cursor-pointer" onClick={() => setShowTaskLocations(!showTaskLocations)}>
                                                            <span className="text-sm text-zinc-800">Show task locations</span>
                                                            <Switch checked={showTaskLocations} onCheckedChange={setShowTaskLocations} />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1 px-2 cursor-pointer" onClick={() => setShowSubtaskParentNames(!showSubtaskParentNames)}>
                                                            <span className="text-sm text-zinc-800">Show subtask parent names</span>
                                                            <Switch checked={showSubtaskParentNames} onCheckedChange={setShowSubtaskParentNames} />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1 px-2 cursor-pointer" onClick={() => setShowCompleted(!showCompleted)}>
                                                            <span className="text-sm text-zinc-800">Show closed tasks</span>
                                                            <Switch checked={showCompleted} onCheckedChange={setShowCompleted} />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer"
                                                            onClick={() => { setLayoutOptionsOpen(true); }}
                                                        >
                                                            <span className="flex items-center gap-2">More options</span>
                                                            <ChevronRight className="inline h-3 w-3 ml-1 text-zinc-400" />
                                                        </button>
                                                    </div>
                                                    <div className="h-px bg-zinc-100 my-2" />
                                                    <div className="space-y-1">
                                                        <button type="button" className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer" onClick={() => { setFieldsPanelOpen(true); setCustomizePanelOpen(false); }}>
                                                            <span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-zinc-400" />Fields</span>
                                                            <span className="text-xs text-zinc-500">{Array.from(visibleColumns).length} shown</span>
                                                        </button>
                                                        <Popover open={customizeViewFilterOpen} onOpenChange={setCustomizeViewFilterOpen}>
                                                            <PopoverTrigger asChild>
                                                                <button
                                                                    type="button"
                                                                    className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer"
                                                                    onClick={() => { if (filterGroups.conditions.length === 0) { addFilterGroup(); } }}
                                                                >
                                                                    <span className="flex items-center gap-2"><Filter className="h-4 w-4 text-zinc-400" />Filter</span>
                                                                    <span className="text-xs text-zinc-500">{appliedFilterCount > 0 ? `${appliedFilterCount} applied` : "None"} <ChevronRight className="inline h-3 w-3 ml-1" /></span>
                                                                </button>
                                                            </PopoverTrigger>
                                                            <PopoverContent side="left" align="start" className="w-[600px] max-w-[90vw] p-0 overflow-hidden shadow-2xl rounded-2xl border border-zinc-200/80" sideOffset={16}>
                                                                {renderFilterContent({ onClose: () => setCustomizeViewFilterOpen(false) })}
                                                            </PopoverContent>
                                                        </Popover>
                                                        <Popover open={customizeViewGroupOpen} onOpenChange={setCustomizeViewGroupOpen}>
                                                            <PopoverTrigger asChild>
                                                                <button
                                                                    type="button"
                                                                    className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer"
                                                                >
                                                                    <span className="flex items-center gap-2"><LayoutList className="h-4 w-4 text-zinc-400" />Group</span>
                                                                    <span className="text-xs text-zinc-500">{groupLabel} <ChevronRight className="inline h-3 w-3 ml-1" /></span>
                                                                </button>
                                                            </PopoverTrigger>
                                                            <PopoverContent side="left" align="start" className="w-[240px] p-1.5 rounded-xl shadow-xl border-zinc-200/60" sideOffset={16}>
                                                                <div className="px-2 py-1.5 mb-1">
                                                                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Group by</span>
                                                                </div>
                                                                <div className="space-y-0.5">
                                                                    {[
                                                                        { id: "status", label: "Status", icon: Circle },
                                                                        { id: "assignee", label: "Assignee", icon: Users },
                                                                        { id: "priority", label: "Priority", icon: Flag },
                                                                        { id: "tags", label: "Tags", icon: Tag },
                                                                        { id: "dueDate", label: "Due date", icon: Calendar },
                                                                        { id: "taskType", label: "Task type", icon: Box },
                                                                    ].map((opt) => (
                                                                        <div
                                                                            key={opt.id}
                                                                            className={cn(
                                                                                "flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors",
                                                                                groupBy === opt.id ? "bg-violet-50 text-violet-700" : "text-zinc-600 hover:bg-zinc-100"
                                                                            )}
                                                                            onClick={() => { setGroupBy(opt.id as any); setCustomizeViewGroupOpen(false); }}
                                                                        >
                                                                            <opt.icon className={cn("h-4 w-4", groupBy === opt.id ? "text-violet-500" : "text-zinc-400")} />
                                                                            <span className="flex-1">{opt.label}</span>
                                                                            {groupBy === opt.id && <div className="h-1.5 w-1.5 rounded-full bg-violet-600" />}
                                                                        </div>
                                                                    ))}
                                                                    {FIELD_CONFIG.filter(f => f.isCustom).length > 0 && (
                                                                        <>
                                                                            <div className="h-px bg-zinc-100 my-1.5" />
                                                                            <div className="px-2 py-1.5 mb-0.5">
                                                                                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Custom Fields</span>
                                                                            </div>
                                                                            {FIELD_CONFIG.filter(f => f.isCustom).map((f) => {
                                                                                const Icon = f.icon as any;
                                                                                return (
                                                                                    <div
                                                                                        key={f.id}
                                                                                        className={cn(
                                                                                            "flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors",
                                                                                            groupBy === f.id ? "bg-violet-50 text-violet-700" : "text-zinc-600 hover:bg-zinc-100"
                                                                                        )}
                                                                                        onClick={() => { setGroupBy(f.id); setCustomizeViewGroupOpen(false); }}
                                                                                    >
                                                                                        <Icon className={cn("h-4 w-4", groupBy === f.id ? "text-violet-500" : "text-zinc-400")} />
                                                                                        <span className="flex-1 truncate">{f.label}</span>
                                                                                        {groupBy === f.id && <div className="h-1.5 w-1.5 rounded-full bg-violet-600" />}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </>
                                                                    )}
                                                                    {groupBy !== "none" && (
                                                                        <>
                                                                            <div className="h-px bg-zinc-100 my-1.5" />
                                                                            <div className="flex items-center gap-1 p-1">
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className={cn("flex-1 h-7 text-[10px] uppercase tracking-wider font-bold", groupDirection === "asc" ? "bg-white shadow-sm border border-zinc-200 text-zinc-900" : "text-zinc-500")}
                                                                                    onClick={() => setGroupDirection("asc")}
                                                                                >
                                                                                    Ascending
                                                                                </Button>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className={cn("flex-1 h-7 text-[10px] uppercase tracking-wider font-bold", groupDirection === "desc" ? "bg-white shadow-sm border border-zinc-200 text-zinc-900" : "text-zinc-500")}
                                                                                    onClick={() => setGroupDirection("desc")}
                                                                                >
                                                                                    Descending
                                                                                </Button>
                                                                            </div>
                                                                            <div className="h-px bg-zinc-100 my-1.5" />
                                                                            <div
                                                                                className={cn(
                                                                                    "flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors text-red-600 hover:bg-red-50 hover:text-red-700",
                                                                                    groupBy === "none" && "bg-zinc-100"
                                                                                )}
                                                                                onClick={() => { setGroupBy("none"); setCustomizeViewGroupOpen(false); }}
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                                <span className="flex-1">Remove grouping</span>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                        <Popover open={customizeViewSubtasksOpen} onOpenChange={setCustomizeViewSubtasksOpen}>
                                                            <PopoverTrigger asChild>
                                                                <button
                                                                    type="button"
                                                                    className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer"
                                                                >
                                                                    <span className="flex items-center gap-2"><Link2 className="h-4 w-4 text-zinc-400" />Subtasks</span>
                                                                    <span className="text-xs text-zinc-500">{expandedSubtaskMode === "collapsed" ? "Collapsed" : expandedSubtaskMode === "expanded" ? "Expanded" : "Separate"} <ChevronRight className="inline h-3 w-3 ml-1" /></span>
                                                                </button>
                                                            </PopoverTrigger>
                                                            <PopoverContent side="left" align="start" className="w-56" sideOffset={16}>
                                                                <div className="text-xs px-2 pb-2 font-semibold text-zinc-900">Show subtasks</div>
                                                                <div className="space-y-1">
                                                                    <button
                                                                        type="button"
                                                                        className={cn(
                                                                            "w-full text-left text-xs px-2 py-1 rounded",
                                                                            expandedSubtaskMode === "collapsed" ? "bg-zinc-100 text-zinc-900" : "text-zinc-700 hover:bg-zinc-50"
                                                                        )}
                                                                        onClick={() => {
                                                                            setExpandedSubtaskMode("collapsed");
                                                                            setExpandedParents(new Set());
                                                                            setCustomizeViewSubtasksOpen(false);
                                                                        }}
                                                                    >
                                                                        Collapsed (default)
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className={cn(
                                                                            "w-full text-left text-xs px-2 py-1 rounded",
                                                                            expandedSubtaskMode === "expanded" ? "bg-zinc-100 text-zinc-900" : "text-zinc-700 hover:bg-zinc-50"
                                                                        )}
                                                                        onClick={() => {
                                                                            setExpandedSubtaskMode("expanded");
                                                                            const next = new Set<string>();
                                                                            filteredTasks.forEach((t: Task) => {
                                                                                if (hasSubtasks(t, filteredTasks as Task[])) next.add(t.id);
                                                                            });
                                                                            setExpandedParents(next);
                                                                            setCustomizeViewSubtasksOpen(false);
                                                                        }}
                                                                    >
                                                                        Expanded
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className={cn(
                                                                            "w-full text-left text-xs px-2 py-1 rounded",
                                                                            expandedSubtaskMode === "separate" ? "bg-zinc-100 text-zinc-900" : "text-zinc-700 hover:bg-zinc-50"
                                                                        )}
                                                                        onClick={() => {
                                                                            setExpandedSubtaskMode("separate");
                                                                            setExpandedParents(new Set());
                                                                            setCustomizeViewSubtasksOpen(false);
                                                                        }}
                                                                    >
                                                                        As separate items
                                                                    </button>
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                    <div className="h-px bg-zinc-100 my-2" />
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer" onClick={() => handleToggleAutosave(!viewAutosave)}>
                                                            <div className="flex items-center gap-2">
                                                                <Save className="h-4 w-4 text-zinc-400" />
                                                                <span className="text-sm text-zinc-800">Autosave for me</span>
                                                            </div>
                                                            <Switch checked={viewAutosave} onCheckedChange={handleToggleAutosave} />
                                                        </div>
                                                        <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer" onClick={() => { setPinView(!pinView); updateViewProperty('isPinned', !pinView); }}>
                                                            <div className="flex items-center gap-2">
                                                                <Pin className="h-4 w-4 text-zinc-400" />
                                                                <span className="text-sm text-zinc-800">Pin view</span>
                                                            </div>
                                                            <Switch checked={pinView} onCheckedChange={(val) => { setPinView(val); updateViewProperty('isPinned', val); }} />
                                                        </div>
                                                        <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer" onClick={() => { setPrivateView(!privateView); updateViewProperty('isPrivate', !privateView); }}>
                                                            <div className="flex items-center gap-2">
                                                                <Lock className="h-4 w-4 text-zinc-400" />
                                                                <span className="text-sm text-zinc-800">Private view</span>
                                                            </div>
                                                            <Switch checked={privateView} onCheckedChange={(val) => { setPrivateView(val); updateViewProperty('isPrivate', val); }} />
                                                        </div>
                                                        <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer" onClick={() => { setProtectView(!protectView); updateViewProperty('isLocked', !protectView); }}>
                                                            <div className="flex items-center gap-2">
                                                                <ShieldCheck className="h-4 w-4 text-zinc-400" />
                                                                <span className="text-sm text-zinc-800">Protect view</span>
                                                            </div>
                                                            <Switch checked={protectView} onCheckedChange={(val) => { setProtectView(val); updateViewProperty('isLocked', val); }} />
                                                        </div>
                                                        <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer" onClick={() => { setDefaultView(!defaultView); updateViewProperty('isDefault', !defaultView); }}>
                                                            <div className="flex items-center gap-2">
                                                                <Home className="h-4 w-4 text-zinc-400" />
                                                                <span className="text-sm text-zinc-800">Set as default view</span>
                                                            </div>
                                                            <Switch checked={defaultView} onCheckedChange={(val) => { setDefaultView(val); updateViewProperty('isDefault', val); }} />
                                                        </div>
                                                    </div>
                                                    <div className="h-px bg-zinc-100 my-2" />
                                                    <div className="space-y-1">
                                                        <button type="button" className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer" onClick={() => {
                                                            const url = `${window.location.origin}${window.location.pathname}?v=${viewId}`;
                                                            navigator.clipboard?.writeText(url);
                                                            toast.success("Link copied to clipboard");
                                                        }}>
                                                            <span className="flex items-center gap-2"><Link className="h-4 w-4 text-zinc-400" />Copy link to view</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 cursor-pointer"
                                                            onClick={() => setIsShareModalOpen(true)}
                                                        >
                                                            <span className="flex items-center gap-2"><Users className="h-4 w-4 text-zinc-400" />Sharing & Permissions</span>
                                                            <ChevronRight className="inline h-3 w-3 ml-1 text-zinc-400" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </ScrollArea>
                                        </SidePanel>
                                        <SidePanel open={layoutOptionsOpen} onClose={() => setLayoutOptionsOpen(false)} className="absolute bottom-0 right-0 h-full w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col">
                                            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1 cursor-pointer" onClick={() => { setLayoutOptionsOpen(false); setCustomizePanelOpen(true); }}>
                                                    <ArrowRight className="h-4 w-4 rotate-180" />
                                                </Button>
                                                <h3 className="font-semibold text-zinc-900">Layout options</h3>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={() => { setLayoutOptionsOpen(false); setCustomizePanelOpen(false); }}><X className="h-4 w-4" /></Button>
                                            </div>
                                            <ScrollArea className="flex-1 min-h-0">
                                                <div className="p-3 space-y-4 pb-24">
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Page layout</p>
                                                        {groupBy === "status" ? (
                                                            <div className="flex items-center justify-between py-1 px-2">
                                                                <span className="text-sm text-zinc-800">Show empty statuses</span>
                                                                <Switch
                                                                    checked={showEmptyStatuses}
                                                                    onCheckedChange={setShowEmptyStatuses}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <TooltipProvider delayDuration={0}>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex items-center justify-between py-1 cursor-not-allowed opacity-50 px-2">
                                                                            <span className="text-sm text-zinc-800">Show empty statuses</span>
                                                                            <Switch
                                                                                checked={showEmptyStatuses}
                                                                                onCheckedChange={setShowEmptyStatuses}
                                                                                disabled
                                                                            />
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="left" className="bg-zinc-900 text-white border-none text-[11px] py-1.5 px-2.5">
                                                                        Grouping by status is required to enable this
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                        <div className="flex items-center justify-between py-1 px-2">
                                                            <span className="text-sm text-zinc-800">Pin description</span>
                                                            <Switch
                                                                checked={pinDescription}
                                                                onCheckedChange={setPinDescription}
                                                                disabled={!currentList}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1 px-2">
                                                            <span className="text-sm text-zinc-800">Wrap text</span>
                                                            <Switch checked={wrapText} onCheckedChange={setWrapText} />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between py-1 px-2">
                                                            <span className="text-sm text-zinc-800">Show task locations</span>
                                                            <Switch checked={showTaskLocations} onCheckedChange={setShowTaskLocations} />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1 px-2">
                                                            <span className="text-sm text-zinc-800">Show task properties</span>
                                                            <Switch checked={showTaskProperties} onCheckedChange={setShowTaskProperties} />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1 px-2">
                                                            <span className="text-sm text-zinc-800">Show subtask parent names</span>
                                                            <Switch checked={showSubtaskParentNames} onCheckedChange={setShowSubtaskParentNames} />
                                                        </div>
                                                    </div>

                                                    <div className="h-px bg-zinc-100" />

                                                    <div className="space-y-2">
                                                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Task visibility</p>
                                                        <div className="flex items-center justify-between py-1 px-2">
                                                            <span className="text-sm text-zinc-800">Show closed tasks</span>
                                                            <Switch checked={showCompleted} onCheckedChange={setShowCompleted} />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1 px-2">
                                                            <span className="text-sm text-zinc-800">Show closed subtasks</span>
                                                            <Switch checked={showCompletedSubtasks} onCheckedChange={setShowCompletedSubtasks} />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1 px-2">
                                                            <span className="text-sm text-zinc-800">Show tasks from other Lists</span>
                                                            <Switch checked={showTasksFromOtherLists} onCheckedChange={setShowTasksFromOtherLists} />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1 px-2">
                                                            <span className="text-sm text-zinc-800">Show subtasks from other Lists</span>
                                                            <Switch checked={showSubtasksFromOtherLists} onCheckedChange={setShowSubtasksFromOtherLists} />
                                                        </div>

                                                    </div>

                                                    <div className="h-px bg-zinc-100" />

                                                    <div className="space-y-2">
                                                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">View settings</p>
                                                        <div className="flex items-center justify-between py-1 px-2">
                                                            <span className="text-sm flex items-center gap-2"><UserRound className="h-4 w-4 text-zinc-400" />Default to Me Mode</span>
                                                            <Switch checked={defaultToMeMode} onCheckedChange={setDefaultToMeMode} />
                                                        </div>
                                                        <div
                                                            className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded cursor-pointer"
                                                            onClick={resetViewToDefaults}
                                                        >
                                                            <span className="text-sm flex items-center gap-2"><RefreshCcw className="h-4 w-4 text-zinc-400" />Reset view to defaults</span>
                                                        </div>
                                                        <div
                                                            className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded cursor-pointer"
                                                            onClick={() => {
                                                                setDefaultViewSettingsDraft(spaceDefaultViewConfig);
                                                                setIsDefaultViewSettingsModalOpen(true);
                                                            }}
                                                        >
                                                            <span className="text-sm flex items-center gap-2"><Settings className="h-4 w-4 text-zinc-400" />Default view settings</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </ScrollArea>
                                        </SidePanel>

    {/* Create field modal ?Efield types and Add existing fields */ }
    <SidePanel open={createFieldModalOpen} onClose={() => { setCreateFieldModalOpen(false); setCreateFieldSearch(''); }} className="absolute right-0 bottom-0 top-0 w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-[70] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-100">
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -ml-1"
                onClick={() => {
                    setCreateFieldModalOpen(false);
                    setCreateFieldSearch("");
                    setFieldsPanelOpen(true);
                }}
            >
                <ArrowRight className="h-4 w-4 rotate-180" />
            </Button>
            <h3 className="font-semibold text-zinc-900">Create field</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setCreateFieldModalOpen(false); setCreateFieldSearch(""); }}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-3 border-b border-zinc-100">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                <Input className="pl-9 h-9 text-sm" placeholder="Search for new or existing fields" value={createFieldSearch} onChange={e => setCreateFieldSearch(e.target.value)} />
            </div>
        </div>
        <ScrollArea className="flex-1 p-3 pb-20 h-full">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">All</p>
            <div className="space-y-0.5">
                {CREATE_FIELD_TYPES.filter(f => !createFieldSearch.trim() || f.label.toLowerCase().includes(createFieldSearch.toLowerCase())).map(f => {
                    const IconComponent = f.icon as any;
                    return (
                        <button key={f.id} type="button" className="w-full flex items-center gap-2 py-2.5 px-2 rounded-md hover:bg-zinc-50 text-left text-sm text-zinc-800" onClick={() => {
                            // TODO: Open field creation modal/form with field type pre-selected
                            console.log("Create field type:", f.type, f.label);
                            setCreateFieldModalOpen(false);
                        }}>
                            {typeof IconComponent === "function"
                                ? React.createElement(IconComponent, { className: "h-4 w-4 text-zinc-400 shrink-0" })
                                : null}
                            {f.label}
                        </button>
                    );
                })}
            </div>
        </ScrollArea>
        <div className="p-3 sticky bottom-0 left-0 right-0 border-t border-zinc-100 bg-white">
            <Button
                variant="outline"
                className="w-full justify-center text-zinc-900 border-zinc-200 hover:bg-zinc-50 font-medium h-10"
                onClick={() => { setCreateFieldModalOpen(false); setFieldsPanelOpen(true); }}
            >
                <div className="h-4 w-4 rounded-full bg-zinc-900 text-white flex items-center justify-center mr-2">
                    <Plus className="h-3 w-3" />
                </div>
                Add existing fields
            </Button>
        </div>
    </SidePanel>

    {/* Advanced Filters panel moved to Popover */ }

    {/* Assignees panel ?Eimage 8 */ }
    <SidePanel open={assigneesPanelOpen} onClose={() => setAssigneesPanelOpen(false)} className="absolute top-0 right-0 h-full w-[320px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-100">
            <h3 className="font-semibold text-zinc-900">Assignees</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAssigneesPanelOpen(false)}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-3 border-b border-zinc-100">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                <Input className="pl-9 h-9 text-sm" placeholder="Search by user or team" value={assigneesSearch} onChange={e => setAssigneesSearch(e.target.value)} />
            </div>
        </div>
        <ScrollArea className="flex-1 p-3">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">People {users.length}</p>
            <div className="space-y-1 mb-4">
                <label className="flex items-center gap-2 py-2 px-2 rounded hover:bg-zinc-50 cursor-pointer">
                    <Checkbox
                        checked={filterAssignee.includes("__unassigned__")}
                        onCheckedChange={(checked) => {
                            setFilterAssignee(prev =>
                                checked
                                    ? [...prev, "__unassigned__"]
                                    : prev.filter(id => id !== "__unassigned__")
                            );
                        }}
                    />
                    <span className="text-sm text-zinc-700">Unassigned</span>
                </label>
                {users
                    .filter(u => !assigneesSearch.trim() || (u.name || "").toLowerCase().includes(assigneesSearch.toLowerCase()))
                    .map(u => (
                        <label key={u.id} className="flex items-center gap-2 py-2 px-2 rounded hover:bg-zinc-50 cursor-pointer">
                            <Checkbox
                                checked={filterAssignee.includes(u.id)}
                                onCheckedChange={(checked) => {
                                    setFilterAssignee(prev =>
                                        checked
                                            ? [...prev, u.id]
                                            : prev.filter(id => id !== u.id)
                                    );
                                }}
                            />
                            <Avatar className="h-6 w-6">
                                <AvatarImage src={u.image || undefined} />
                                <AvatarFallback className="text-[9px]">
                                    {u.name?.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-zinc-700 truncate">{u.name}</span>
                        </label>
                    ))}
            </div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Teams 0</p>
            <div className="py-2 text-sm text-zinc-500">No teams</div>
        </ScrollArea>
        <div className="p-3 border-t border-zinc-100 flex items-center justify-between">
            <span className="text-sm text-zinc-700 flex items-center gap-1.5"><MessageSquare className="h-4 w-4 text-zinc-400" /> Assigned comments</span>
            <Switch />
        </div>
    </SidePanel>

    {/* Bulk edit bar when tasks selected */ }
    {
        selectedTasks.length > 0 && (
            <div
                className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-4 py-2.5 bg-[#111111] text-white rounded-[24px] shadow-[0_25px_60px_rgba(0,0,0,0.4)] border border-white/10 w-max max-w-[98%] animate-in fade-in slide-in-from-bottom-6 duration-400 backdrop-blur-xl"
            >
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
                                    {allAvailableStatuses.filter((s: any) => !bulkStatusSearch.trim() || (s.name || "").toLowerCase().includes(bulkStatusSearch.toLowerCase())).length === 0 ? (
                                        <p className="text-sm text-zinc-500 py-2">No matching statuses</p>
                                    ) : (
                                        <>
                                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Not started</p>
                                            {allAvailableStatuses.filter((s: any) => ((s.name?.toLowerCase().includes("todo") || s.name?.toLowerCase().includes("not")) && (!bulkStatusSearch.trim() || (s.name || "").toLowerCase().includes(bulkStatusSearch.toLowerCase())))).map((s: any) => (
                                                <button key={s.id} type="button" className="w-full flex items-center gap-2 py-2 px-2 rounded hover:bg-zinc-100 text-left text-sm" onClick={async () => { for (const id of selectedTasks) { await updateTask.mutateAsync({ id, statusId: s.id }); } setBulkModal(null); }}>
                                                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color || "#9CA3AF" }} />
                                                    {s.name}
                                                </button>
                                            ))}
                                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-2">Active</p>
                                            {allAvailableStatuses.filter((s: any) => ((s.name?.toLowerCase().includes("progress") || s.name?.toLowerCase().includes("doing")) && (!bulkStatusSearch.trim() || (s.name || "").toLowerCase().includes(bulkStatusSearch.toLowerCase())))).map((s: any) => (
                                                <button key={s.id} type="button" className="w-full flex items-center gap-2 py-2 px-2 rounded hover:bg-zinc-100 text-left text-sm" onClick={async () => { for (const id of selectedTasks) { await updateTask.mutateAsync({ id, statusId: s.id }); } setBulkModal(null); }}>
                                                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color || "#9CA3AF" }} />
                                                    {s.name}
                                                </button>
                                            ))}
                                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-2">Closed</p>
                                            {allAvailableStatuses.filter((s: any) => ((s.name?.toLowerCase().includes("complete") || s.name?.toLowerCase().includes("done")) && (!bulkStatusSearch.trim() || (s.name || "").toLowerCase().includes(bulkStatusSearch.toLowerCase())))).map((s: any) => (
                                                <button key={s.id} type="button" className="w-full flex items-center gap-2 py-2 px-2 rounded hover:bg-zinc-100 text-left text-sm" onClick={async () => { for (const id of selectedTasks) { await updateTask.mutateAsync({ id, statusId: s.id }); } setBulkModal(null); }}>
                                                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color || "#9CA3AF" }} />
                                                    {s.name}
                                                </button>
                                            ))}
                                            {allAvailableStatuses.filter((s: any) => !["todo", "not", "progress", "doing", "complete", "done"].some(k => (s.name || "").toLowerCase().includes(k)) && (!bulkStatusSearch.trim() || (s.name || "").toLowerCase().includes(bulkStatusSearch.toLowerCase()))).length > 0 && (
                                                <>
                                                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-2">Other</p>
                                                    {allAvailableStatuses.filter((s: any) => !["todo", "not", "progress", "doing", "complete", "done"].some(k => (s.name || "").toLowerCase().includes(k)) && (!bulkStatusSearch.trim() || (s.name || "").toLowerCase().includes(bulkStatusSearch.toLowerCase()))).map((s: any) => (
                                                        <button key={s.id} type="button" className="w-full flex items-center gap-2 py-2 px-2 rounded hover:bg-zinc-100 text-left text-sm" onClick={async () => { for (const id of selectedTasks) { await updateTask.mutateAsync({ id, statusId: s.id }); } setBulkModal(null); }}>
                                                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color || "#9CA3AF" }} />
                                                            {s.name}
                                                        </button>
                                                    ))}
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-3 border-t border-zinc-100 space-y-2">
                            <label className="flex items-center justify-between text-sm">
                                <span>Send notifications</span>
                                <Switch checked={bulkSendNotifications} onCheckedChange={setBulkSendNotifications} />
                            </label>
                            <label className="flex items-center justify-between text-sm text-zinc-500">
                                <span>Move and keep in current List</span>
                                <Switch checked={bulkMoveKeepInList} onCheckedChange={setBulkMoveKeepInList} disabled />
                            </label>
                        </div>
                    </PopoverContent>
                </Popover>
                <AssigneeSelector
                    users={users as any}
                    agents={agents}
                    workspaceId={resolvedWorkspaceId}
                    variant="compact"
                    value={bulkAssigneeIds}
                    align="center"
                    sideOffset={16}
                    open={bulkModal === "assignees"}
                    onOpenChange={(open) => setBulkModal(open ? "assignees" : null)}
                    onChange={async (newIds) => {
                        setBulkAssigneeIds(newIds);
                        const cleanIds = newIds;
                        try {
                            await Promise.all(selectedTasks.map(id => updateTask.mutateAsync({ id, assigneeIds: cleanIds })));
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
                <Popover open={bulkModal === "customFields"} onOpenChange={(open) => { setBulkModal(open ? "customFields" : null); if (!open) setBulkCustomFieldId(null); }}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white hover:bg-white/10 h-10 gap-2 px-3.5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/10 shadow-none">
                            <LayoutList className="h-[18px] w-[18px]" />
                            <span className="text-[14px] font-bold">Fields</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0 shadow-2xl rounded-2xl border-zinc-200 overflow-hidden" align="center" side="top" sideOffset={16}>
                        <div className="p-2 border-b border-zinc-100">
                            <Input placeholder="Search..." className="h-8 text-sm" value={bulkCustomFieldSearch} onChange={e => setBulkCustomFieldSearch(e.target.value)} />
                        </div>
                        <ScrollArea className="max-h-64">
                            {((customFields as any[]) ?? []).filter((cf: any) => !bulkCustomFieldSearch.trim() || (cf.name || "").toLowerCase().includes(bulkCustomFieldSearch.toLowerCase())).map((cf: any) => {
                                const IconComp = getCustomFieldIcon(cf.type || cf.config?.fieldType);
                                return (
                                    <button key={cf.id} type="button" className="w-full flex items-center gap-2 py-2 px-3 hover:bg-zinc-50 text-left text-sm" onClick={() => setBulkCustomFieldId(cf.id)}>
                                        {IconComp ? <IconComp className="h-4 w-4 text-zinc-500" /> : <Type className="h-4 w-4 text-zinc-500" />}
                                        {cf.name}
                                    </button>
                                );
                            })}
                            {((customFields as any[]) ?? []).length === 0 && <p className="text-sm text-zinc-500 py-4 px-3">No custom fields</p>}
                        </ScrollArea>
                    </PopoverContent>
                </Popover>
                <Popover open={bulkModal === "tags"} onOpenChange={(open) => { setBulkModal(open ? "tags" : null); if (open) setBulkTags(Array.from(new Set(filteredTasks.filter(t => selectedTasks.includes(t.id)).flatMap(t => (t.tags ?? []))))); if (!open) setBulkTagInput(""); }}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white hover:bg-white/10 h-10 gap-2 px-3.5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/10 shadow-none">
                            <Tag className="h-[18px] w-[18px]" />
                            <span className="text-[14px] font-bold">Tags</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4 shadow-2xl rounded-2xl border-zinc-200 overflow-hidden" align="center" side="top" sideOffset={16}>
                        <div className="flex gap-2 mb-3">
                            <Input placeholder="Search or add tags..." className="h-8 text-sm flex-1" value={bulkTagInput} onChange={e => setBulkTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); const t = bulkTagInput.trim(); if (t && !bulkTags.includes(t)) { setBulkTags([...bulkTags, t]); setBulkTagInput(""); } } }} />
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
                        <label className="flex items-center justify-between text-sm text-zinc-500 mb-3">
                            <span>Move and keep in current List</span>
                            <Switch checked={bulkMoveKeepInList} onCheckedChange={setBulkMoveKeepInList} disabled />
                        </label>
                        <Button size="sm" className="w-full" onClick={async () => { for (const id of selectedTasks) { await updateTask.mutateAsync({ id, tags: bulkTags }); } setBulkModal(null); }}>Apply</Button>
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
                                    workspaceId={resolvedWorkspaceId as string}
                                    onSelect={async (listId) => {
                                        for (const id of selectedTasks) {
                                            await updateTask.mutateAsync({ id, listId });
                                        }
                                        setBulkModal(null);
                                    }}
                                />
                            </TabsContent>
                            <TabsContent value="add" className="mt-0 h-[300px]">
                                <DestinationPicker
                                    workspaceId={resolvedWorkspaceId as string}
                                    onSelect={async (listId) => {
                                        await bulkDuplicateTask.mutateAsync({
                                            taskIds: selectedTasks,
                                            targetListId: listId,
                                            options: {
                                                includeSubtasks: true,
                                                includeAttachments: true,
                                                includeAssignees: true,
                                                includeDependencies: true
                                            }
                                        });
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
                <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white hover:bg-white/10 h-10 gap-2 px-3.5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/10 shadow-none" onClick={() => setBulkDuplicateModalOpen(true)}>
                    <CopyPlus className="h-[18px] w-[18px]" />
                </Button>
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
                                                onSelect={async () => {
                                                    for (const id of selectedTasks) {
                                                        await updateTask.mutateAsync({ id, statusId: s.id });
                                                    }
                                                    setBulkModal(null);
                                                }}
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
                                    users={users as any}
                                    agents={agents}
                                    workspaceId={resolvedWorkspaceId}
                                    variant="compact"
                                    value={bulkAssigneeIds}
                                    hidePopover
                                    onChange={async (newIds) => {
                                        setBulkAssigneeIds(newIds);
                                        const cleanIds = newIds;
                                        try {
                                            await Promise.all(selectedTasks.map(id => updateTask.mutateAsync({ id, assigneeIds: cleanIds })));
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
                                                if (t && !bulkTags.includes(t)) {
                                                    const next = [...bulkTags, t];
                                                    setBulkTags(next);
                                                    setBulkTagInput("");
                                                }
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
                                    <Button size="sm" className="h-8 text-xs font-bold" onClick={async () => {
                                        for (const id of selectedTasks) {
                                            await updateTask.mutateAsync({ id, tags: bulkTags });
                                        }
                                        setBulkModal(null);
                                    }}>Apply Tags</Button>
                                </div>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="px-3 py-2 cursor-pointer transition-colors">
                                <LayoutList className="h-4 w-4 mr-2 text-zinc-400" />
                                <span>Custom Fields</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-64 p-1 shadow-xl rounded-xl border-zinc-200">
                                <div className="p-2 border-b border-zinc-50 mb-1">
                                    <Input placeholder="Search fields..." className="h-7 text-xs" value={bulkCustomFieldSearch} onChange={e => setBulkCustomFieldSearch(e.target.value)} />
                                </div>
                                <div className="max-h-64 overflow-auto px-1 pb-1">
                                    {((customFields as any[]) ?? []).filter((cf: any) => !bulkCustomFieldSearch.trim() || (cf.name || "").toLowerCase().includes(bulkCustomFieldSearch.toLowerCase())).map((cf: any) => {
                                        const IconComp = getCustomFieldIcon(cf.type || cf.config?.fieldType);
                                        return (
                                            <DropdownMenuItem key={cf.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer" onSelect={() => setBulkCustomFieldId(cf.id)}>
                                                {IconComp ? <IconComp className="h-4 w-4 text-zinc-400" /> : <Type className="h-4 w-4 text-zinc-400" />}
                                                <span className="text-sm">{cf.name}</span>
                                            </DropdownMenuItem>
                                        );
                                    })}
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
                                            workspaceId={resolvedWorkspaceId as string}
                                            onSelect={async (listId) => {
                                                for (const id of selectedTasks) {
                                                    await updateTask.mutateAsync({ id, listId });
                                                }
                                                setBulkModal(null);
                                            }}
                                        />
                                    </TabsContent>
                                    <TabsContent value="add" className="mt-0 h-[300px]">
                                        <DestinationPicker
                                            workspaceId={resolvedWorkspaceId as string}
                                            onSelect={async (listId) => {
                                                await bulkDuplicateTask.mutateAsync({
                                                    taskIds: selectedTasks,
                                                    targetListId: listId,
                                                    options: {
                                                        includeSubtasks: true,
                                                        includeAttachments: true,
                                                        includeAssignees: true,
                                                        includeDependencies: true
                                                    }
                                                });
                                                setBulkModal(null);
                                            }}
                                        />
                                    </TabsContent>
                                </Tabs>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuItem
                            className="px-3 py-2 cursor-pointer"
                            onSelect={() => setBulkDuplicateModalOpen(true)}
                        >
                            <CopyPlus className="h-4 w-4 mr-2 text-zinc-400" />
                            <span>Duplicate</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            className="px-3 py-2 cursor-pointer"
                            onSelect={() => {
                                const sel = filteredTasks.filter(t => selectedTasks.includes(t.id));
                                const text = sel.map(t => (t.title || t.name) || "").join("\n");
                                void navigator.clipboard.writeText(text);
                                setBulkModal(null);
                            }}
                        >
                            <Copy className="h-4 w-4 mr-2 text-zinc-400" />
                            <span>Copy names to clipboard</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        )}

            {/* Custom field value modal (image 4) - when a custom field is clicked from bulk Custom Fields list */ }
        <Dialog open={!!bulkCustomFieldId} onOpenChange={(open) => { if (!open) { setBulkCustomFieldId(null); setBulkCustomFieldDraftValue(null); } }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{FIELD_CONFIG.find(f => f.id === bulkCustomFieldId)?.label ?? "Custom field"}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-sm text-zinc-500 mb-2">Update value for {selectedTasks.length} selected task(s).</p>
                    {bulkCustomFieldId && (() => {
                        const fieldConfig = FIELD_CONFIG.find(f => f.id === bulkCustomFieldId) as any;
                        const field = fieldConfig?.customField ?? { id: bulkCustomFieldId, name: fieldConfig?.label, type: "TEXT", config: {} };
                        return (
                            <CustomFieldRenderer
                                field={field}
                                value={bulkCustomFieldDraftValue}
                                onChange={setBulkCustomFieldDraftValue}
                                disabled={updateCustomField.isPending}
                            />
                        );
                    })()}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => { setBulkCustomFieldId(null); setBulkCustomFieldDraftValue(null); }}>Cancel</Button>
                    <Button onClick={async () => { if (!bulkCustomFieldId) return; for (const taskId of selectedTasks) { await updateCustomField.mutateAsync({ taskId, customFieldId: bulkCustomFieldId, value: bulkCustomFieldDraftValue }); } setBulkCustomFieldId(null); setBulkCustomFieldDraftValue(null); setBulkModal(null); }}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Task detail modal when used standalone (no onTaskSelect from parent) */ }
        {
            !onTaskSelect && effectiveSelectedTaskId && (
                <TaskDetailModal
                    taskId={effectiveSelectedTaskId}
                    open={true}
                    onOpenChange={(open) => !open && closeTaskDetail()}
                    onLayoutModeChange={() => { }}
                />
            )
        }

        {/* Dependencies modal */ }
        {
            dependenciesTask && (
                <TaskDependenciesModal
                    open={!!dependenciesTask}
                    onOpenChange={(open) => {
                        if (!open) setDependenciesTask(null);
                    }}
                    task={dependenciesTask}
                />
            )
        }

        {/* Tag editor modal (name + color) */ }
                                        <Dialog
                                            open={tagEditorOpen}
                                            onOpenChange={async (open) => {
                                                // Auto-save on close (encode label + color into stored string)
                                                if (!open && tagEditorOpen && tagEditorTaskId && tagEditorOriginalTag) {
                                                    const parsed = parseEncodedTag(tagEditorOriginalTag);
                                                    const newName = tagEditorName.trim() || parsed.label;
                                                    const encoded = formatEncodedTag(newName, tagEditorColor || undefined);
                                                    const nextTags = tagEditorTags.map((t) =>
                                                        t === tagEditorOriginalTag ? encoded : t
                                                    );
                                                    await updateTask.mutateAsync({ id: tagEditorTaskId, tags: nextTags } as any);
                                                }

                                                setTagEditorOpen(open);
                                                if (!open) {
                                                    setTagEditorTaskId(null);
                                                    setTagEditorOriginalTag(null);
                                                    setTagEditorTags([]);
                                                }
                                            }}
                                        >
                                            <DialogContent className="sm:max-w-[200px] p-3 [&>button]:hidden">
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
                                                        {/* Optional: "no color" and "custom" slots to visually match the last row */}
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
                                                        onClick={async () => {
                                                            if (!tagEditorTaskId || !tagEditorOriginalTag) return;
                                                            const nextTags = tagEditorTags.filter((t) => t !== tagEditorOriginalTag);
                                                            await updateTask.mutateAsync({ id: tagEditorTaskId, tags: nextTags } as any);
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
                                        <DuplicateTaskModal
                                            open={bulkDuplicateModalOpen}
                                            onOpenChange={setBulkDuplicateModalOpen}
                                            taskIds={selectedTasks}
                                            workspaceId={resolvedWorkspaceId as string}
                                        />
                                        <ShareViewPermissionModal
                                            open={isShareModalOpen}
                                            onOpenChange={setIsShareModalOpen}
                                            viewId={viewId as string}
                                            workspaceId={resolvedWorkspaceId as string}
                                        />
        {/* Description Edit Modal */ }
        <Dialog open={isDescriptionModalOpen} onOpenChange={setIsDescriptionModalOpen}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Description</DialogTitle>
                </DialogHeader>
                <div className="py-4 border border-zinc-200 rounded-md">
                    <DescriptionEditor
                        content={descriptionDraft}
                        onChange={setDescriptionDraft}
                        editable={true}
                        spaceId={spaceId}
                        projectId={projectId}
                        workspaceId={resolvedWorkspaceId}
                        collaboration={{
                            enabled: true,
                            documentId: currentList?.id || listId || '',
                            documentType: 'doc',
                            user: {
                                id: currentUser?.id || 'anonymous',
                                name: currentUser?.name || currentUser?.email || 'User',
                                color: (currentUser as { color?: string } | undefined)?.color
                            }
                        }}
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsDescriptionModalOpen(false)}>Cancel</Button>
                    <Button
                        onClick={async () => {
                            if (currentList) {
                                await updateList.mutateAsync({
                                    id: currentList.id,
                                    description: descriptionDraft
                                } as any);
                                setIsDescriptionModalOpen(false);
                            }
                        }}
                        disabled={updateList.isPending}
                    >
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Default View Settings Modal */ }
                                        <Dialog open={isDefaultViewSettingsModalOpen} onOpenChange={setIsDefaultViewSettingsModalOpen}>
                                            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white">
                                                <DialogHeader className="p-6 pb-2">
                                                    <DialogTitle className="text-xl font-bold text-zinc-900">Default view settings</DialogTitle>
                                                    <p className="text-sm text-zinc-500 mt-1">
                                                        You can set default settings for views in this Space. When new views are created, they'll also inherit these default settings.
                                                    </p>
                                                </DialogHeader>

                                                <div className="px-6 py-2 space-y-6 max-h-[70vh] overflow-y-auto">
                                                    <div className="space-y-4">
                                                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                                                            Page layout
                                                            <ChevronDown className="h-4 w-4" />
                                                        </h4>
                                                        <div className="space-y-3">
                                                            {[
                                                                { label: 'Show empty statuses', key: 'showEmptyStatuses' },
                                                                { label: 'Pin description', key: 'pinDescription' },
                                                                { label: 'Auto wrap text', key: 'wrapText' },
                                                                { label: 'Show task locations', key: 'showTaskLocations' },
                                                                { label: 'Show task properties', key: 'showTaskProperties' },
                                                                { label: 'Show subtask parent names', key: 'showSubtaskParentNames' },
                                                            ].map((item) => (
                                                                <div key={item.key} className="flex items-center justify-between">
                                                                    <span className="text-sm text-zinc-700">{item.label}</span>
                                                                    <Switch
                                                                        checked={!!(defaultViewSettingsDraft as any)[item.key]}
                                                                        onCheckedChange={(val) => setDefaultViewSettingsDraft({ ...defaultViewSettingsDraft, [item.key]: val })}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                                                            Task visibility
                                                            <ChevronDown className="h-4 w-4" />
                                                        </h4>
                                                        <div className="space-y-3">
                                                            {[
                                                                { label: 'Show closed tasks', key: 'showCompleted' },
                                                                { label: 'Show closed subtasks', key: 'showCompletedSubtasks' },
                                                                { label: 'Show tasks from other Lists', key: 'showTasksFromOtherLists' },
                                                                { label: 'Show subtasks from other Lists', key: 'showSubtasksFromOtherLists' },
                                                            ].map((item) => (
                                                                <div key={item.key} className="flex items-center justify-between">
                                                                    <span className="text-sm text-zinc-700">{item.label}</span>
                                                                    <Switch
                                                                        checked={!!(defaultViewSettingsDraft as any)[item.key]}
                                                                        onCheckedChange={(val) => setDefaultViewSettingsDraft({ ...defaultViewSettingsDraft, [item.key]: val })}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                                                        <span className="text-sm text-zinc-600">Adjust settings for:</span>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="outline" size="sm" className="h-8 border-zinc-200 text-xs font-normal gap-2 pr-2">
                                                                    {defaultViewSettingsApplyTo === "NEW" ? "New views only" :
                                                                        defaultViewSettingsApplyTo === "REQUIRED" ? "Required views (and new views created)" :
                                                                            "All existing views (and new views created)"}
                                                                    <ChevronDown className="h-3 w-3 text-zinc-400" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-80">
                                                                <DropdownMenuItem className="text-sm py-2 px-3" onClick={() => setDefaultViewSettingsApplyTo("NEW")}>
                                                                    New views only {defaultViewSettingsApplyTo === "NEW" && <CheckCheck className="ml-auto h-4 w-4 text-emerald-500" />}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="text-sm py-2 px-3" onClick={() => setDefaultViewSettingsApplyTo("REQUIRED")}>
                                                                    Required views (and new views created) {defaultViewSettingsApplyTo === "REQUIRED" && <CheckCheck className="ml-auto h-4 w-4 text-emerald-500" />}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="text-sm py-2 px-3" onClick={() => setDefaultViewSettingsApplyTo("ALL")}>
                                                                    All existing views (and new views created) {defaultViewSettingsApplyTo === "ALL" && <CheckCheck className="ml-auto h-4 w-4 text-emerald-500" />}
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>

                                                <DialogFooter className="p-6 pt-2">
                                                    <Button className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold h-11 rounded-md" onClick={saveDefaultViewSettings}>
                                                        Save
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                        <style jsx global>{`
                .peopleview-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: #d4d4d8 transparent;
                }
                .peopleview-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .peopleview-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .peopleview-scrollbar::-webkit-scrollbar-thumb {
                    background: #d4d4d8;
                    border-radius: 999px;
                }
                .peopleview-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #c4c4cb;
                }
            `}</style>
        </div>
    );
}
