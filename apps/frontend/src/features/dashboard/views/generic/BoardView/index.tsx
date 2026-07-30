"use client";

import { useGenericTaskViewData } from "@/features/dashboard/hooks/useGenericTaskViewData";
import { TaskListLoadMore } from "@/features/dashboard/components/shared/TaskListLoadMore";
import { VirtualizedDivRows } from "@/features/dashboard/components/shared/VirtualizedListRows";
import { useState, useMemo, useCallback, useEffect, Fragment, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { generateKeyBetween } from "fractional-indexing";
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragOverlay,
    DragStartEvent,
    MouseSensor,
    TouchSensor,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    closestCorners,
    useDroppable,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { ShareViewPermissionModal } from "@/features/dashboard/components/shared/ShareViewPermissionModal";
import { SidePanel } from "@/features/dashboard/components/shared/SidePanel";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import {
    Search, Plus, MoreHorizontal, X,
    Calendar, Users, Flag, MessageSquare, Star,
    Trash2, ChevronRight, CornerDownLeft, UserCircle,
    LayoutList, SlidersHorizontal, CheckCheck,
    Check, UserPlus, AlertTriangle, Archive,
    Link2, Filter, Settings, Info, ArrowLeft, ChevronsRight, ListIcon,
    CheckCircle2, ArrowRight, GripVertical, Paperclip, Edit3,
    Circle, Tag, Type, Hash, CheckSquare, DollarSign, Globe, FunctionSquare, FileText,
    Phone, Mail, MapPin, TrendingUp, Heart, PenTool, MousePointer, ListTodo, AlertCircle, Link, Clock, Target, ListChecks, AlignLeft,
    Spline, CircleMinus, ChevronDown, ChevronsUp, ChevronsLeft, Copy, CopyPlus, Slash,
    Save, ToggleLeft, Undo, RefreshCcw, UserRound, Box, ChevronLeft, Wand2, Pin, Lock, ShieldCheck, Home, ArrowUpDown, ChevronsUpDown,
    ArrowDown, ArrowUp, ChevronUp, Bot,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CustomFieldRenderer } from "@/entities/task/components/CustomFieldRenderer";
import { TaskCreationModal } from "@/entities/task/components/TaskCreationModal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LazyTaskDetailModal as TaskDetailModal } from "@/entities/task/components/LazyTaskDetailModal";
import { TagsPopover } from "@/entities/task/components/TagsPopover";
import { TagsModal } from "@/entities/task/components/TagsModal";
import { TaskDependenciesModal } from "@/entities/task/components/TaskDependenciesModal";
import { parseEncodedTag } from "@/entities/task/utils/tags";
import { TaskActionsPopover } from "@/entities/task/components/TaskActionsPopover";
import { AssigneeSelector, formatAssigneeIdsForSelector } from "@/entities/task/components/AssigneeSelector";
import { DuplicateTaskModal } from "@/entities/task/components/DuplicateTaskModal";
import { DestinationPicker } from "@/entities/task/components/DestinationPicker";
import { TaskCalendar } from "@/entities/task/components/TaskCalendar";
import { TaskTypeIcon } from "@/entities/task/components/TaskTypeIcon";
import { TaskStatusPopover } from "@/entities/task/components/TaskStatusPopover";
import { SingleDateCalendar } from "@/components/ui/date-picker";
import { ViewToolbarSaveDropdown } from "@/features/dashboard/components/shared/ViewToolbarSaveDropdown";
import { ViewToolbarClosedPopover } from "@/features/dashboard/components/shared/ViewToolbarClosedPopover";
import { format } from "date-fns";
import type { FilterCondition, FilterGroup, ListViewSavedConfig, FilterOperator } from "../listViewTypes";
import { FILTER_OPTIONS, FIELD_OPERATORS } from "../listViewConstants";

import { BoardTaskCard } from "./BoardTaskCard";
import { BoardColumn } from "./BoardColumn";

// Types
type Task = {
    id: string;
    title?: string;
    name?: string;
    description?: string | null;
    status?: { id: string; name: string; color?: string; type?: string } | null;
    statusId?: string | null;
    priority?: string | null;
    dueDate?: string | Date | null;
    startDate?: string | Date | null;
    assignee?: { id: string; name?: string | null; email?: string | null; image?: string | null } | null;
    assigneeId?: string | null;
    assignees?: { user?: { id: string; name?: string | null; image?: string | null }; userId?: string; team?: { id: string; name?: string }; agent?: { id: string; name?: string; avatar?: string | null } }[];
    listId?: string | null;
    list?: { id: string; name: string; statuses?: { id: string; name: string; color: string }[] };
    tags?: string[];
    isStarred?: boolean;
    isCompleted?: boolean;
    timeTracked?: string | null;
    timeEstimate?: string | null;
    _count?: { comments?: number; attachments?: number; other_tasks?: number; checklists?: number };
    parentId?: string | null;
    customFieldValues?: { id: string; customFieldId: string; value: any }[];
    taskType?: { id: string; name: string };
    taskTypeId?: string | null;
    position?: string;
    order?: string;
    coverImage?: string | null;
    dependencies?: unknown[];
    assigneeIds?: string[];
};

/**
 * Shared logic to resolve the grouping key for a task.
 * Extracted into a pure function to avoid ReferenceErrors and ensure consistency.
 */
function getTaskGroupKey(task: Task, groupBy: string, defaultTaskType: any): string {
    if (groupBy === "status") {
        return task.statusId || "no-status";
    } else if (groupBy === "assignee") {
        const firstAssigneeId = (task.assignees as any[])?.[0]?.userId || task.assigneeId;
        return firstAssigneeId || "unassigned";
    } else if (groupBy === "priority") {
        return task.priority || "NONE";
    } else if (groupBy === "dueDate") {
        if (task.isCompleted || task.status?.type === "COMPLETED" || task.status?.type === "CLOSED") {
            return "done";
        }
        if (!task.dueDate) return "no-due-date";
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(task.dueDate);
        d.setHours(0, 0, 0, 0);
        const diffTime = d.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return "overdue";
        if (diffDays === 0) return "today";
        if (diffDays === 1) return "tomorrow";
        if (diffDays > 1 && diffDays < 8) return format(new Date(task.dueDate), "EEEE").toLowerCase();
        return "future";
    } else if (groupBy === "taskType") {
        return task.taskTypeId || task.taskType?.id || defaultTaskType?.id || "no-type";
    } else if (groupBy === "tags") {
        const tags = (task.tags ?? []) as string[];
        return tags[0] || "No Tags";
    } else if (groupBy !== "none") {
        const value = task.customFieldValues?.find((v: any) => v.customFieldId === groupBy)?.value;
        return (value !== null && value !== undefined) ? String(value) : "default";
    }
    return "default";
}

interface BoardViewProps {
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    listId?: string;
    folderId?: string;
    viewId?: string;
    workspaceId?: string;
    initialConfig?: any;
    selectedTaskIdFromParent?: string | null;
    onTaskSelect?: (taskId: string | null) => void;
    scope?: "owned" | "assigned" | "all";
    context?: "workspace" | "space" | "project" | "team" | "folder" | "list";
}

// Helper: Normalize parentId (null and "root" are equivalent)
const normalizeParentId = (id: string | null | undefined): string | null => {
    if (!id || id === "root" || id === "") return null;
    return String(id);
};

// Helper: Prevent circular dependency in task hierarchy
const wouldCreateCircularDependency = (taskId: string, newParentId: string | null, allTasks: any[]): boolean => {
    if (!newParentId) return false;
    let currentId: string | null = newParentId;
    while (currentId) {
        if (currentId === taskId) return true;
        const parent = allTasks.find(t => t.id === currentId);
        currentId = parent ? normalizeParentId(parent.parentId) : null;
    }
    return false;
};

interface TaskCardProps {
    task: Task;
    spaceId?: string;
    projectId?: string;
    workspaceId?: string;
    listId?: string;
    isDragging?: boolean;
    isOverlay?: boolean;
    onQuickEdit?: (task: any) => void;
    cardSize?: "compact" | "default" | "comfortable";
    cardCover?: "none" | "image" | "description";
    stackFields?: boolean;
    showSubtasks?: boolean;
    showCustomFields?: boolean;
    visibleFields?: string[];
    onTaskSelect?: (taskId: string | null) => void;
    users?: any[];
    lists?: any[];
    allAvailableStatuses?: any[];
    onTaskDelete?: (id: string) => void | Promise<void>;
    onTaskUpdate?: (task: any) => void | Promise<void>;
    showMoreActions?: boolean;
    allTasks?: any[];
    onAddSubtask?: (parentId: string) => void;
    inlineAddTaskId?: string | null;
    inlineAddTitle?: string;
    inlineAddAssigneeIds?: string[];
    inlineAddDueDate?: Date | null;
    inlineAddStartDate?: Date | null;
    inlineAddPriority?: string | null;
    inlineAddTags?: string[];
    onInlineTitleChange?: (v: string) => void;
    onInlineAssigneeChange?: (ids: string[]) => void;
    onInlineDueDateChange?: (date: Date | null) => void;
    onInlineStartDateChange?: (date: Date | null) => void;
    onInlinePriorityChange?: (p: string | null) => void;
    onInlineTagsChange?: (ts: string[]) => void;
    onSaveInline?: () => void;
    onCancelInline?: () => void;
    onTaskTypeChange?: (v: string) => void;
    level?: number;
    isSelected?: boolean;
    onSelect?: (taskId: string, selected: boolean) => void;
    taskType?: string;
    expandedParents?: Set<string>;
    onToggleExpand?: (taskId: string, expanded: boolean) => void;
    showTaskLocations?: boolean;
    showSubtaskParentNames?: boolean;
    availableTaskTypes?: any[];
    agents?: any[];
}

const QuickAddCard = ({
    title, onChange, onSave, onCancel, placeholder = "Task Name...",
    users, assigneeIds, onAssigneeChange,
    startDate, onStartDateChange,
    dueDate, onDueDateChange,
    priority, onPriorityChange,
    tags, onTagsChange,
    taskType,
    onTaskTypeChange,
    allAvailableTags = [],
    availableTaskTypes = [],
    agents = []
}: {
    title: string;
    onChange: (v: string) => void;
    onSave: () => void;
    onCancel: () => void;
    placeholder?: string;
    users: any[];
    assigneeIds: string[];
    onAssigneeChange: (ids: string[]) => void;
    startDate: Date | null;
    onStartDateChange: (date: Date | null) => void;
    dueDate: Date | null;
    onDueDateChange: (date: Date | null) => void;
    priority: string | null;
    onPriorityChange: (p: string | null) => void;
    tags: string[];
    onTagsChange: (ts: string[]) => void;
    taskType?: string;
    onTaskTypeChange?: (v: string) => void;
    allAvailableTags?: string[];
    availableTaskTypes?: any[];
    agents?: any[];
}) => {
    const defaultQuickAddTaskType = availableTaskTypes?.find((t: any) => t?.isDefault) || availableTaskTypes?.[0];

    return (
        <div
            data-quick-add-card="true"
            className="bg-white border border-zinc-200 shadow-[0_2px_10px_rgba(0,0,0,0.05)] rounded-xl p-3.5 mb-3"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <div className="flex items-center gap-2 mb-3">
                <Input
                    variant="ghost"
                    autoFocus
                    value={title}
                    onChange={(e) => onChange(e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            onSave();
                        }
                        if (e.key === "Escape") onCancel();
                    }}
                    placeholder={placeholder}
                    className="h-7 border-0 shadow-none focus-visible:ring-0 p-0 text-base font-medium placeholder:text-zinc-300 flex-1 focus:outline-none text-zinc-700 w-full cursor-text"
                />
                <Button
                    size="sm"
                    onClick={onSave}
                    className={cn(
                        "h-7 px-2.5 rounded-lg font-medium transition-all text-xs flex items-center gap-1.5 shrink-0",
                        title.trim()
                            ? "bg-zinc-800 text-white hover:bg-zinc-900 shadow-sm"
                            : "bg-[#bebebe] text-white hover:bg-[#aeaeae]"
                    )}
                    disabled={!title.trim()}
                >
                    Save <CornerDownLeft className="h-3 w-3" />
                </Button>
            </div>

            <div className="flex flex-col gap-2.5 ml-0.5">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="inline-flex">
                            <AssigneeSelector
                                users={users}
                                agents={agents}
                                value={assigneeIds}
                                onChange={onAssigneeChange}
                                trigger={
                                    <div
                                        className={cn("flex items-center gap-2.5 group cursor-pointer transition-colors", assigneeIds.length > 0 ? "text-zinc-700" : "text-zinc-400 hover:text-zinc-600")}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onPointerDown={(e) => e.stopPropagation()}
                                    >
                                        <UserCircle className="h-5 w-5 opacity-80" />
                                        <span className="text-[13px] font-medium tracking-tight">
                                            {assigneeIds.length > 0 ? (
                                                <div className="flex -space-x-1.5">
                                                    {assigneeIds.map(id => {
                                                        const { type, actualId } = id.includes(":") ? { type: id.split(":")[0], actualId: id.split(":")[1] } : { type: 'user', actualId: id };
                                                        const u = type === 'agent' ? agents.find(a => a.id === actualId) : users.find(user => user.id === actualId);
                                                        return (
                                                            <Avatar key={id} className="h-5 w-5 border border-white ring-1 ring-zinc-100">
                                                                <AvatarImage src={u?.image || undefined} />
                                                                <AvatarFallback className="text-[8px] bg-purple-100 text-purple-700">
                                                                    {type === 'agent' ? <Bot className="h-2.5 w-2.5" /> : u?.name?.[0]}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        );
                                                    })}
                                                </div>
                                            ) : "Add assignee"}
                                        </span>
                                    </div>
                                }
                            />
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>Assignee</TooltipContent>
                </Tooltip>

                <Popover>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                                <div
                                    className={cn("flex items-center gap-2.5 group cursor-pointer transition-colors", dueDate ? "text-zinc-700" : "text-zinc-400 hover:text-zinc-600")}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                >
                                    <Calendar className="h-5 w-5 opacity-80" />
                                    <span className="text-[13px] font-medium tracking-tight">
                                        {dueDate ? dueDate.toLocaleDateString() : "Add dates"}
                                    </span>
                                </div>
                            </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Due date</TooltipContent>
                    </Tooltip>
                    <PopoverContent className="w-auto p-0" align="start">
                        <TaskCalendar
                            startDate={startDate ?? undefined}
                            endDate={dueDate ?? undefined}
                            onStartDateChange={(d) => onStartDateChange(d ?? null)}
                            onEndDateChange={(d) => onDueDateChange(d ?? null)}
                        />
                    </PopoverContent>
                </Popover>

                <DropdownMenu>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <div
                                    className={cn("flex items-center gap-2.5 group cursor-pointer transition-colors", priority ? "text-zinc-700" : "text-zinc-400 hover:text-zinc-600")}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                >
                                    <Flag className={cn("h-5 w-5 opacity-80", priority === "URGENT" && "text-red-500 opacity-100", priority === "HIGH" && "text-orange-500 opacity-100", priority === "NORMAL" && "text-blue-500 opacity-100", priority === "LOW" && "text-zinc-400")} />
                                    <span className="text-[13px] font-medium tracking-tight capitalize">
                                        {priority ? priority.toLowerCase() : "Add priority"}
                                    </span>
                                </div>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Priority</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuLabel className="text-xs">Priority</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onPriorityChange("URGENT")}>
                            <Flag className="h-3.5 w-3.5 mr-2 text-red-500" /> Urgent
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onPriorityChange("HIGH")}>
                            <Flag className="h-3.5 w-3.5 mr-2 text-orange-500" /> High
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onPriorityChange("NORMAL")}>
                            <Flag className="h-3.5 w-3.5 mr-2 text-blue-500" /> Normal
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onPriorityChange("LOW")}>
                            <Flag className="h-3.5 w-3.5 mr-2 text-zinc-400" /> Low
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onPriorityChange(null)}>Clear</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="inline-flex">
                            <TagsModal
                                tags={tags}
                                onChange={onTagsChange}
                                allAvailableTags={allAvailableTags}
                                trigger={
                                    <div
                                        className={cn("flex items-center gap-2.5 group cursor-pointer transition-colors", tags && tags.length > 0 ? "text-zinc-700" : "text-zinc-400 hover:text-zinc-600")}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onPointerDown={(e) => e.stopPropagation()}
                                    >
                                        <Tag className="h-5 w-5 opacity-80" />
                                        <span className="text-[13px] font-medium tracking-tight">
                                            {tags && tags.length > 0 ? `${tags.length} Tag${tags.length !== 1 ? 's' : ''}` : "Add tag"}
                                        </span>
                                    </div>
                                }
                            />
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>Tags</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="inline-flex">
                            <TaskStatusPopover
                                task={{
                                    id: "quick-add",
                                    taskType: availableTaskTypes?.find(t => t.id === taskType) || defaultQuickAddTaskType
                                }}
                                availableStatuses={[]}
                                availableTaskTypes={availableTaskTypes || []}
                                onUpdateTask={(_id, data) => {
                                    if (data.taskTypeId) {
                                        onTaskTypeChange?.(data.taskTypeId);
                                    }
                                }}
                                hideStatusTab={true}
                            >
                                <div
                                    className={cn("flex items-center gap-2.5 group cursor-pointer transition-colors", taskType ? "text-zinc-700" : "text-zinc-400 hover:text-zinc-600")}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                >
                                    {(() => {
                                        const selected = availableTaskTypes?.find(t => t.id === taskType);
                                        return <TaskTypeIcon type={selected} className="h-4 w-4" />;
                                    })()}
                                    <span className="text-[13px] font-medium tracking-tight">
                                        {availableTaskTypes?.find(t => t.id === taskType)?.name || defaultQuickAddTaskType?.name || "Task"}
                                    </span>
                                </div>
                            </TaskStatusPopover>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>Task type</TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
};

const isFieldVisible = (fields: string[] | undefined, fieldId: string) => {
    if (!fields || fields.length === 0) return true; // Default to true if not specified? Or false?
    // Since we initialized visibleFields with defaults, we can checks strictly.
    return fields.includes(fieldId);
};

interface Column {
    id: string;
    title: string;
    color: string;
    items: any[];
    wipLimit?: number;
    isCollapsed?: boolean;
}

type ColumnKey = "name" | "status" | "assignee" | "priority" | "dueDate" | "tags" | "timeTracked" | "subtasks" | "comments" | "attachments" | "dateCreated" | "timeEstimate" | "pullRequests" | "linkedTasks" | string;

const STANDARD_FIELD_CONFIG: { id: ColumnKey; label: string; icon: any; isCustom?: boolean }[] = [
    { id: "name", label: "Task Name", icon: Type },
    { id: "assignee", label: "Assignee", icon: Users },
    { id: "dueDate", label: "Due date", icon: Calendar },
    { id: "priority", label: "Priority", icon: Flag },
    { id: "status", label: "Status", icon: Circle },
    { id: "comments", label: "Comments", icon: MessageSquare },
    { id: "tags", label: "Tags", icon: Tag },
    { id: "timeTracked", label: "Time tracked", icon: Clock },
    { id: "dateCreated", label: "Date created", icon: Calendar },
    { id: "timeEstimate", label: "Time estimate", icon: Clock },
    { id: "pullRequests", label: "Pull Requests", icon: Link2 },
    { id: "linkedTasks", label: "Linked tasks", icon: Link },
];

const CREATE_FIELD_TYPES = [
    { id: "TEXT", label: "Text", icon: Type, type: "TEXT" },
    { id: "NUMBER", label: "Number", icon: Hash, type: "NUMBER" },
    { id: "DATE", label: "Date", icon: Calendar, type: "DATE" },
    { id: "CHECKBOX", label: "Checkbox", icon: CheckSquare, type: "CHECKBOX" },
    { id: "DROPDOWN", label: "Dropdown", icon: LayoutList, type: "DROPDOWN" },
    { id: "TEXT_AREA", label: "Text area (Long Text)", icon: AlignLeft, type: "TEXT_AREA" },
    { id: "LONG_TEXT", label: "Long Text", icon: AlignLeft, type: "LONG_TEXT" },
    { id: "CUSTOM_TEXT", label: "Custom Text", icon: Type, type: "CUSTOM_TEXT" },
    { id: "LABELS", label: "Labels", icon: Tag, type: "LABELS" },
    { id: "CUSTOM_DROPDOWN", label: "Custom Dropdown", icon: LayoutList, type: "CUSTOM_DROPDOWN" },
    { id: "CATEGORIZE", label: "Categorize", icon: Target, type: "CATEGORIZE" },
    { id: "TSHIRT_SIZE", label: "T-Shirt Size", icon: Users, type: "TSHIRT_SIZE" },
    { id: "EMAIL", label: "Email", icon: Mail, type: "EMAIL" },
    { id: "PHONE", label: "Phone", icon: Phone, type: "PHONE" },
    { id: "URL", label: "Website", icon: Globe, type: "URL" },
    { id: "MONEY", label: "Money", icon: DollarSign, type: "MONEY" },
    { id: "FORMULA", label: "Formula", icon: FunctionSquare, type: "FORMULA" },
    { id: "FILES", label: "Files", icon: Paperclip, type: "FILES" },
    { id: "RELATIONSHIP", label: "Relationship", icon: Link2, type: "RELATIONSHIP" },
    { id: "PEOPLE", label: "People", icon: Users, type: "PEOPLE" },
    { id: "TASKS", label: "Tasks", icon: ListTodo, type: "TASKS" },
    { id: "PROGRESS_AUTO", label: "Progress (Auto)", icon: TrendingUp, type: "PROGRESS_AUTO" },
    { id: "PROGRESS_MANUAL", label: "Progress (Manual)", icon: SlidersHorizontal, type: "PROGRESS_MANUAL" },
    { id: "SUMMARY", label: "Summary", icon: FileText, type: "SUMMARY" },
    { id: "PROGRESS_UPDATES", label: "Progress Updates", icon: MessageSquare, type: "PROGRESS_UPDATES" },
    { id: "TRANSLATION", label: "Translation", icon: Globe, type: "TRANSLATION" },
    { id: "SENTIMENT", label: "Sentiment", icon: Heart, type: "SENTIMENT" },
    { id: "LOCATION", label: "Location", icon: MapPin, type: "LOCATION" },
    { id: "RATING", label: "Rating", icon: Star, type: "RATING" },
    { id: "VOTING", label: "Voting", icon: Users, type: "VOTING" },
    { id: "SIGNATURE", label: "Signature", icon: PenTool, type: "SIGNATURE" },
    { id: "BUTTON", label: "Button", icon: MousePointer, type: "BUTTON" },
    { id: "ACTION_ITEMS", label: "Action Items", icon: ListChecks, type: "ACTION_ITEMS" },
];

interface FilterState {
    assignees: string[];
    priorities: string[];
    tags: string[];
    dateRange?: { from: Date; to: Date };
    customFields: Record<string, any>;
}

interface BoardSettings {
    cardSize: "compact" | "default" | "comfortable";
    cardCover: "none" | "image" | "description";
    showSubtasks: boolean;
    showCustomFields: boolean;
    showEmptyColumns: boolean;
    stackFields: boolean;
    showTaskLocations: boolean;
    showSubtaskParentNames: boolean;
    showTaskProperties: boolean;
    showColumnColors: boolean;
    enableWipLimits: boolean;
    enableSubgroups: boolean;
    autoArchive: boolean;
    visibleFields: string[];
}

type BoardViewSavedConfig = {
    groupBy?: string;
    groupDirection?: "asc" | "desc";
    cardSize?: "compact" | "default" | "comfortable";
    showCover?: boolean;
    showSubtasks?: boolean;
    showCustomFields?: boolean;
    showEmptyColumns?: boolean;
    collapseEmptyColumns?: boolean;
    stackFields?: boolean;
    showTaskLocations?: boolean;
    showTaskProperties?: boolean;
    showSubtaskParentNames?: boolean;
    showColumnColors?: boolean;
    enableWipLimits?: boolean;
    enableSubgroups?: boolean;
    autoArchive?: boolean;
    visibleFields?: string[];
    subtasksMode?: "collapsed" | "expanded" | "separate";
    showCompleted?: boolean;
    showCompletedSubtasks?: boolean;
    viewAutosave?: boolean;
    defaultToMeMode?: boolean;
    showTasksFromOtherLists?: boolean;
    showSubtasksFromOtherLists?: boolean;
    filterGroups?: FilterGroup;
    savedFilterPresets?: { id: string, name: string, config: FilterGroup }[];
};

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

const hasSubtasks = (task: Task, scopeTasks: Task[]) => scopeTasks.some((t: Task) => t.parentId === task.id);

export function BoardView({ spaceId, projectId, teamId, listId, folderId, viewId, workspaceId, initialConfig, selectedTaskIdFromParent, onTaskSelect, scope, context }: BoardViewProps) {
    /** Whether this context shows tasks from many lists (workspace/space/project/team) */
    const isBroadContext = context === "workspace" || context === "space" || context === "project" || context === "team";
    const [searchQuery, setSearchQuery] = useState("");
    const [isToolbarSearchOpen, setIsToolbarSearchOpen] = useState(false);
    const toolbarSearchContainerRef = useRef<HTMLDivElement | null>(null);
    const toolbarSearchInputRef = useRef<HTMLInputElement | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [filters, setFilters] = useState<FilterState>({
        assignees: [],
        priorities: [],
        tags: [],
        customFields: {},
    });
    const [groupBy, setGroupBy] = useState<string>("status");

    const [groupDirection, setGroupDirection] = useState<"asc" | "desc">("asc");
    const [filterGroups, setFilterGroups] = useState<FilterGroup>(() => ({
        id: "root",
        operator: "AND",
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
    const [layoutOptionsOpen, setLayoutOptionsOpen] = useState(false);
    const utils = trpc.useUtils();
    const [selectedDetailTaskId, setSelectedDetailTaskId] = useState<string | null>(null);
    const effectiveSelectedTaskId = onTaskSelect ? (selectedTaskIdFromParent ?? null) : selectedDetailTaskId;
    const openTaskDetail = (taskId: string | null) => {
        if (onTaskSelect) onTaskSelect(taskId);
        else setSelectedDetailTaskId(taskId);
    };
    const closeTaskDetail = () => {
        if (onTaskSelect) onTaskSelect(null);
        else setSelectedDetailTaskId(null);
    };
    // Panel search states
    const [settings, setSettings] = useState<any>({
        cardSize: "default",
        cardCover: "image",
        showSubtasks: true,
        showCustomFields: true,
        showEmptyColumns: true,
        collapseEmptyColumns: false,
        stackFields: false,
        showTaskLocations: false,
        showSubtaskParentNames: false,
        showTaskProperties: true,
        showColumnColors: false,
        enableWipLimits: true,
        enableSubgroups: false,
        autoArchive: false,
        visibleFields: ["assignee", "dueDate", "priority", "tags"],
    });
    // Add sort state
    const [sort, setSort] = useState<{ id: string, desc: boolean }[]>([
        { id: "assignee", desc: false },
        { id: "priority", desc: false }
    ]);
    const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
    const [groupedRunFirstColumnId, setGroupedRunFirstColumnId] = useState<string | null>(null);

    // New state for ListView-like header
    const [fieldsPanelOpen, setFieldsPanelOpen] = useState(false);
    const [customizePanelOpen, setCustomizePanelOpen] = useState(false);
    const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
    const [sortPanelOpen, setSortPanelOpen] = useState(false);
    const [sortSearchQuery, setSortSearchQuery] = useState("");
    const [assigneesPanelOpen, setAssigneesPanelOpen] = useState(false);
    const [createFieldModalOpen, setCreateFieldModalOpen] = useState(false);
    const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
    const [creationParentId, setCreationParentId] = useState<string | undefined>(undefined);
    const [creationStatusId, setCreationStatusId] = useState<string | undefined>(undefined);
    const [inlineAddColumnId, setInlineAddColumnId] = useState<string | null>(null);
    const [inlineAddTaskId, setInlineAddTaskId] = useState<string | null>(null);
    const [inlineAddTitle, setInlineAddTitle] = useState("");
    const [inlineAddAssigneeIds, setInlineAddAssigneeIds] = useState<string[]>([]);
    const [inlineAddDueDate, setInlineAddDueDate] = useState<Date | null>(null);
    const [inlineAddStartDate, setInlineAddStartDate] = useState<Date | null>(null);
    const [inlineAddPriority, setInlineAddPriority] = useState<string | null>(null);
    const [inlineAddTags, setInlineAddTags] = useState<string[]>([]);
    const [inlineAddTaskType, setInlineAddTaskType] = useState<string | null>(null);

    const [fieldsSearch, setFieldsSearch] = useState("");
    const [createFieldSearch, setCreateFieldSearch] = useState("");
    const [filterSearch, setFilterSearch] = useState("");

    useEffect(() => {
        if (!isToolbarSearchOpen) return;

        toolbarSearchInputRef.current?.focus();

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (!toolbarSearchContainerRef.current?.contains(target)) {
                setIsToolbarSearchOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isToolbarSearchOpen]);
    const [assigneesSearch, setAssigneesSearch] = useState("");

    const [expandedSubtaskMode, setExpandedSubtaskMode] = useState<"collapsed" | "expanded" | "separate">("collapsed");
    const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
    const handleToggleExpand = (taskId: string, expanded: boolean) => {
        setExpandedParents(prev => {
            const next = new Set(prev);
            if (expanded) next.add(taskId);
            else next.delete(taskId);
            return next;
        });
    };
    const [showCompleted, setShowCompleted] = useState(false);
    const [showCompletedSubtasks, setShowCompletedSubtasks] = useState(false);
    const [savedSnapshot, setSavedSnapshot] = useState<string>("");
    const [archiveColumnId, setArchiveColumnId] = useState<string | null>(null);
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
    const [viewNameDraft, setViewNameDraft] = useState("");
    const [pinView, setPinView] = useState(false);
    const [privateView, setPrivateView] = useState(false);
    const [protectView, setProtectView] = useState(false);
    const [defaultView, setDefaultView] = useState(false);
    const [viewAutosave, setViewAutosave] = useState(false);
    const [isDefaultViewSettingsModalOpen, setIsDefaultViewSettingsModalOpen] = useState(false);
    const [defaultViewSettingsApplyTo, setDefaultViewSettingsApplyTo] = useState<"NEW" | "REQUIRED" | "ALL">("NEW");
    const [defaultViewSettingsDraft, setDefaultViewSettingsDraft] = useState<Partial<BoardViewSavedConfig>>({});
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [defaultToMeMode, setDefaultToMeMode] = useState(false);
    const [showTasksFromOtherLists, setShowTasksFromOtherLists] = useState(false);
    const [showSubtasksFromOtherLists, setShowSubtasksFromOtherLists] = useState(false);
    type BulkModalType = "status" | "assignees" | "customFields" | "tags" | "moveAdd" | "copy" | "more" | null;
    const [bulkModal, setBulkModal] = useState<BulkModalType>(null);
    const [bulkStatusSearch, setBulkStatusSearch] = useState("");
    const [bulkDuplicateModalOpen, setBulkDuplicateModalOpen] = useState(false);
    const [bulkCustomFieldId, setBulkCustomFieldId] = useState<string | null>(null);
    const [bulkSendNotifications, setBulkSendNotifications] = useState(true);
    const [bulkAssigneeIds, setBulkAssigneeIds] = useState<string[]>([]);
    const [bulkTags, setBulkTags] = useState<string[]>([]);
    const [bulkTagInput, setBulkTagInput] = useState("");
    const [bulkCustomFieldDraftValue, setBulkCustomFieldDraftValue] = useState<any>(null);
    const [bulkCustomFieldSearch, setBulkCustomFieldSearch] = useState("");

    // Close QuickAddCard when clicking outside
    useEffect(() => {
        if (!inlineAddColumnId && !inlineAddTaskId) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            // Check if click is within the QuickAddCard itself
            const isClickInsideQuickAdd = target.closest('[data-quick-add-card="true"]');

            // Check if click is not on/within any popovers/modals
            const isClickInsidePopover = target.closest('[role="dialog"]') ||
                target.closest('[data-radix-popper-content-wrapper]') ||
                target.closest('.react-datepicker') ||
                target.closest('[data-radix-presence]');

            // Only close if the click is outside both the QuickAddCard and popovers
            if (!isClickInsideQuickAdd && !isClickInsidePopover) {
                setInlineAddColumnId(null);
                setInlineAddTaskId(null);
                setInlineAddTitle("");
                setInlineAddAssigneeIds([]);
                setInlineAddDueDate(null);
                setInlineAddStartDate(null);
                setInlineAddPriority(null);
                setInlineAddTags([]);
                setInlineAddTaskType(null);
            }
        };

        // Add slight delay to avoid immediate closure on the same click that opened it
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 10);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [inlineAddColumnId, inlineAddTaskId]);

    const { data: viewData } = trpc.view.get.useQuery({ id: viewId as string }, { staleTime: 60_000, gcTime: 5 * 60_000, enabled: !!viewId });
    const updateSpaceMutation = trpc.space.update.useMutation({
        onSuccess: () => {
            if (spaceId) void utils.space.getSummary.invalidate({ id: spaceId });
        },
    });

    const {
        resolvedWorkspaceId,
        space,
        customFields,
        availableTaskTypes,
        agents,
        workspaceMembers,
        projectParticipants,
        teamParticipants,
        listsData,
        currentList,
        tasks,
        total: taskTotal,
        hasMore: hasMoreTasks,
        isTasksLoading: isLoading,
        isFetchingNextPage,
        loadMoreRef,
        taskListInput,
        updateTaskInList,
    } = useGenericTaskViewData({
        spaceId,
        projectId,
        teamId,
        listId,
        workspaceId,
        scope,
        includeRelations: "card", // lighter payload for board cards; full data loaded on demand in TaskDetailModal
    });

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

    const getGroupKey = useCallback((task: Task) => {
        return getTaskGroupKey(task, groupBy, defaultTaskType);
    }, [groupBy, defaultTaskType]);

    const allAvailableTags = useMemo(() => {
        const tags = new Set<string>();
        tasks.forEach(t => t.tags?.forEach(tag => tags.add(tag)));
        return Array.from(tags);
    }, [tasks]);

    const lists = (listsData?.items ?? []).map((l: any) => ({ id: l.id, name: l.name }));

    const statuses = useMemo(() => {
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

    const workspaceUserById = useMemo(() => {
        const map = new Map<string, { id: string; name: string; email?: string | null; image?: string | null }>();
        for (const m of workspaceMembers ?? []) {
            const u = (m as any).user;
            if (u) map.set(u.id, { id: u.id, name: u.name || u.email || "Unknown", image: u.image, email: u.email });
        }
        return map;
    }, [workspaceMembers]);

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

    // Derive users from workspace, project, or team participants
    const users = useMemo(() => {
        if (teamId && teamParticipants?.users?.length) {
            return (teamParticipants.users as any[]).map((u: any) => ({
                id: u.id,
                name: workspaceUserById.get(u.id)?.name || u.name || u.email || "Unknown",
                image: workspaceUserById.get(u.id)?.image ?? null,
                email: u.email ?? null,
            }));
        }
        if (projectId && projectParticipants?.users?.length) {
            return (projectParticipants.users as any[]).map((u: any) => ({
                id: u.id,
                name: workspaceUserById.get(u.id)?.name || u.name || u.email || "Unknown",
                image: workspaceUserById.get(u.id)?.image ?? null,
                email: u.email ?? null,
            }));
        }
        return Array.from(workspaceUserById.values()).map(u => ({ id: u.id, name: u.name, image: u.image ?? null, email: u.email ?? null }));
    }, [teamId, teamParticipants?.users, projectId, projectParticipants?.users, workspaceUserById]);

    const spaceDefaultViewConfig = useMemo(() => (space?.settings as any)?.defaultViewConfig ?? {}, [space]);

    const resetViewToDefaults = useCallback(() => {
        const cfg = spaceId && Object.keys(spaceDefaultViewConfig).length > 0 ? spaceDefaultViewConfig : {};
        setSettings({
            cardSize: (cfg.cardSize as "compact" | "default" | "comfortable") ?? "default",
            showCover: typeof cfg.showCover === "boolean" ? cfg.showCover : true,
            showSubtasks: true,
            showCustomFields: true,
            showEmptyColumns: typeof cfg.showEmptyColumns === "boolean" ? cfg.showEmptyColumns : true,
            collapseEmptyColumns: typeof cfg.collapseEmptyColumns === "boolean" ? cfg.collapseEmptyColumns : false,
            stackFields: typeof cfg.stackFields === "boolean" ? cfg.stackFields : false,
            showTaskLocations: typeof cfg.showTaskLocations === "boolean" ? cfg.showTaskLocations : false,
            showTaskProperties: typeof cfg.showTaskProperties === "boolean" ? cfg.showTaskProperties : true,
            showColumnColors: typeof cfg.showColumnColors === "boolean" ? cfg.showColumnColors : false,
            enableWipLimits: true,
            enableSubgroups: false,
            autoArchive: false,
            visibleFields: ["assignee", "dueDate", "priority", "tags"],
        });
        setShowCompleted(typeof cfg.showCompleted === "boolean" ? cfg.showCompleted : false);
        setShowCompletedSubtasks(typeof cfg.showCompletedSubtasks === "boolean" ? cfg.showCompletedSubtasks : false);
        setDefaultToMeMode(false);
        setShowTasksFromOtherLists(typeof cfg.showTasksFromOtherLists === "boolean" ? cfg.showTasksFromOtherLists : false);
        setShowSubtasksFromOtherLists(typeof cfg.showSubtasksFromOtherLists === "boolean" ? cfg.showSubtasksFromOtherLists : false);
        setPrivateView(false);
        setProtectView(false);
        setDefaultView(false);
        setPinView(false);
        toast.success("View reset to defaults");
    }, [spaceId, spaceDefaultViewConfig]);

    // Extract saved config from initialConfig
    const viewConfigFromDb: BoardViewSavedConfig = useMemo(() => {
        const raw = (initialConfig ?? {}) as any;
        return (raw.boardView ?? raw ?? {}) as BoardViewSavedConfig;
    }, [initialConfig]);

    // Apply saved config when switching views / initial load
    useEffect(() => {
        const cfg = viewConfigFromDb;
        if (cfg.groupBy) setGroupBy(cfg.groupBy);
        if (cfg.subtasksMode) setExpandedSubtaskMode(cfg.subtasksMode);
        if (typeof cfg.showCompleted === "boolean") setShowCompleted(cfg.showCompleted);
        if (typeof cfg.showCompletedSubtasks === "boolean") setShowCompletedSubtasks(cfg.showCompletedSubtasks);
        if (typeof cfg.cardSize === "string") {
            setSettings(prev => ({ ...prev, cardSize: cfg.cardSize as "compact" | "default" | "comfortable" }));
        }
        if (typeof cfg.showCover === "boolean") {
            setSettings(prev => ({ ...prev, showCover: cfg.showCover as boolean }));
        }
        if (typeof cfg.showSubtasks === "boolean") {
            setSettings(prev => ({ ...prev, showSubtasks: cfg.showSubtasks as boolean }));
        }
        if (typeof cfg.showCustomFields === "boolean") {
            setSettings(prev => ({ ...prev, showCustomFields: cfg.showCustomFields as boolean }));
        }
        if (typeof cfg.showEmptyColumns === "boolean") {
            setSettings(prev => ({ ...prev, showEmptyColumns: cfg.showEmptyColumns as boolean }));
        }
        if (typeof cfg.collapseEmptyColumns === "boolean") {
            setSettings(prev => ({ ...prev, collapseEmptyColumns: cfg.collapseEmptyColumns as boolean }));
        }
        if (typeof cfg.stackFields === "boolean") {
            setSettings(prev => ({ ...prev, stackFields: cfg.stackFields as boolean }));
        }
        if (typeof cfg.showTaskLocations === "boolean") {
            setSettings(prev => ({ ...prev, showTaskLocations: cfg.showTaskLocations as boolean }));
        }
        if (typeof cfg.showTaskProperties === "boolean") {
            setSettings(prev => ({ ...prev, showTaskProperties: cfg.showTaskProperties as boolean }));
        }
        if (typeof cfg.showColumnColors === "boolean") {
            setSettings(prev => ({ ...prev, showColumnColors: cfg.showColumnColors as boolean }));
        }
        if (typeof cfg.enableWipLimits === "boolean") {
            setSettings(prev => ({ ...prev, enableWipLimits: cfg.enableWipLimits as boolean }));
        }
        if (typeof cfg.enableSubgroups === "boolean") {
            setSettings(prev => ({ ...prev, enableSubgroups: cfg.enableSubgroups as boolean }));
        }
        if (typeof cfg.autoArchive === "boolean") {
            setSettings(prev => ({ ...prev, autoArchive: cfg.autoArchive as boolean }));
        }
        if (Array.isArray(cfg.visibleFields) && cfg.visibleFields.length) {
            setSettings(prev => ({ ...prev, visibleFields: cfg.visibleFields as string[] }));
        }
        if (typeof cfg.viewAutosave === "boolean") setViewAutosave(cfg.viewAutosave);

        // Load advanced filters
        if (cfg.filterGroups) {
            setFilterGroups(cfg.filterGroups);
        } else {
            setFilterGroups({ id: "root", operator: "AND", conditions: [] });
        }

        if (typeof (cfg as any).isPrivate === "boolean") setPrivateView((cfg as any).isPrivate);
        if (typeof (cfg as any).isLocked === "boolean") setProtectView((cfg as any).isLocked);
        if (typeof (cfg as any).isDefault === "boolean") setDefaultView((cfg as any).isDefault);

        if (Array.isArray(cfg.savedFilterPresets)) {
            setSavedFilters(cfg.savedFilterPresets);
        } else if (typeof window !== "undefined") {
            const saved = localStorage.getItem("agentflox_saved_filters");
            if (saved) setSavedFilters(JSON.parse(saved));
        }

        // baseline snapshot for dirty-check
        const baseline = stableStringify({
            groupBy: cfg.groupBy ?? groupBy,
            subtasksMode: cfg.subtasksMode ?? expandedSubtaskMode,
            showCompleted: typeof cfg.showCompleted === "boolean" ? cfg.showCompleted : showCompleted,
            showCompletedSubtasks: typeof cfg.showCompletedSubtasks === "boolean" ? cfg.showCompletedSubtasks : showCompletedSubtasks,
            cardSize: cfg.cardSize ?? settings.cardSize,
            showCover: typeof cfg.showCover === "boolean" ? cfg.showCover : settings.showCover,
            showSubtasks: typeof cfg.showSubtasks === "boolean" ? cfg.showSubtasks : settings.showSubtasks,
            showCustomFields: typeof cfg.showCustomFields === "boolean" ? cfg.showCustomFields : settings.showCustomFields,
            showEmptyColumns: typeof cfg.showEmptyColumns === "boolean" ? cfg.showEmptyColumns : settings.showEmptyColumns,
            collapseEmptyColumns: typeof cfg.collapseEmptyColumns === "boolean" ? cfg.collapseEmptyColumns : settings.collapseEmptyColumns,
            stackFields: typeof cfg.stackFields === "boolean" ? cfg.stackFields : settings.stackFields,
            showTaskLocations: typeof cfg.showTaskLocations === "boolean" ? cfg.showTaskLocations : settings.showTaskLocations,
            showTaskProperties: typeof cfg.showTaskProperties === "boolean" ? cfg.showTaskProperties : settings.showTaskProperties,
            showColumnColors: typeof cfg.showColumnColors === "boolean" ? cfg.showColumnColors : settings.showColumnColors,
            enableWipLimits: typeof cfg.enableWipLimits === "boolean" ? cfg.enableWipLimits : settings.enableWipLimits,
            enableSubgroups: typeof cfg.enableSubgroups === "boolean" ? cfg.enableSubgroups : settings.enableSubgroups,
            autoArchive: typeof cfg.autoArchive === "boolean" ? cfg.autoArchive : settings.autoArchive,
            visibleFields: Array.isArray(cfg.visibleFields) ? cfg.visibleFields : settings.visibleFields,
            viewAutosave: typeof cfg.viewAutosave === "boolean" ? cfg.viewAutosave : viewAutosave,
            defaultToMeMode: typeof cfg.defaultToMeMode === "boolean" ? cfg.defaultToMeMode : defaultToMeMode,
            showTasksFromOtherLists: typeof cfg.showTasksFromOtherLists === "boolean" ? cfg.showTasksFromOtherLists : showTasksFromOtherLists,
            showSubtasksFromOtherLists: typeof cfg.showSubtasksFromOtherLists === "boolean" ? cfg.showSubtasksFromOtherLists : showSubtasksFromOtherLists,
            filterGroups: cfg.filterGroups ?? { id: "root", operator: "AND", conditions: [] },
            savedFilterPresets: Array.isArray(cfg.savedFilterPresets) ? cfg.savedFilterPresets : [],
        });
        setSavedSnapshot(baseline);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewId, viewConfigFromDb]);

    // Mutations
    const updateTask = trpc.task.update.useMutation({
        onMutate: async (variables) => {
            updateTaskInList(variables.id, (task: any) => {
                let updated = { ...task, ...variables };
                if ((variables as any).statusId !== undefined) {
                    const statusObj = statuses.find(s => s.id === (variables as any).statusId);
                    updated.status = statusObj ?? ((variables as any).statusId ? task.status : null);
                    updated.statusId = (variables as any).statusId;
                }
                if ((variables as any).assigneeIds !== undefined) {
                    const ids = (variables as any).assigneeIds as string[];
                    updated.assignees = ids.map((id: string) => {
                        const cleanId = id.startsWith("user:") ? id.replace("user:", "") : id;
                        return { userId: cleanId, user: workspaceUserById.get(cleanId) };
                    });
                    updated.assigneeId = ids[0]
                        ? (ids[0].startsWith("user:") ? ids[0].replace("user:", "") : ids[0])
                        : null;
                }
                if ((variables as any).taskTypeId !== undefined) {
                    const typeObj = availableTaskTypes.find((t: any) => t.id === (variables as any).taskTypeId);
                    if (typeObj) updated.taskType = typeObj;
                    updated.taskTypeId = (variables as any).taskTypeId;
                }
                return updated;
            });
        },
        onSettled: (_data, error) => {
            if (error) void utils.task.list.invalidate(taskListInput);
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
        onSuccess: () => { void utils.task.list.invalidate(); },
    });
    const updateCustomField = trpc.task.customFields.update.useMutation({
        onSuccess: () => { void utils.task.list.invalidate(); },
    });

    const handleTaskUpdate = async (taskId: string, data: Record<string, unknown>) => {
        try { await updateTask.mutateAsync({ id: taskId, ...data }); } catch (e) { console.error(e); }
    };

    const handleTaskDelete = async (taskId: string) => {
        try { await deleteTask.mutateAsync({ id: taskId }); } catch (e) { console.error(e); }
    };

    // Current view configuration
    const currentViewConfig: BoardViewSavedConfig = useMemo(() => ({
        groupBy,
        subtasksMode: expandedSubtaskMode,
        showCompleted,
        showCompletedSubtasks,
        cardSize: settings.cardSize,
        showCover: settings.showCover,
        showSubtasks: settings.showSubtasks,
        showCustomFields: settings.showCustomFields,
        showEmptyColumns: settings.showEmptyColumns,
        collapseEmptyColumns: settings.collapseEmptyColumns,
        stackFields: settings.stackFields,
        showTaskLocations: settings.showTaskLocations,
        showTaskProperties: settings.showTaskProperties,
        showColumnColors: settings.showColumnColors,
        enableWipLimits: settings.enableWipLimits,
        enableSubgroups: settings.enableSubgroups,
        autoArchive: settings.autoArchive,
        visibleFields: settings.visibleFields,
        viewAutosave,
        defaultToMeMode,
        showTasksFromOtherLists,
        showSubtasksFromOtherLists,
        filterGroups,
        savedFilterPresets: savedFilters,
    }), [
        groupBy,
        expandedSubtaskMode,
        showCompleted,
        showCompletedSubtasks,
        settings.cardSize,
        settings.showCover,
        settings.showSubtasks,
        settings.showCustomFields,
        settings.showEmptyColumns,
        settings.collapseEmptyColumns,
        settings.stackFields,
        settings.showTaskLocations,
        settings.showTaskProperties,
        settings.enableWipLimits,
        settings.enableSubgroups,
        settings.autoArchive,
        settings.visibleFields,
        viewAutosave,
        defaultToMeMode,
        showTasksFromOtherLists,
        showSubtasksFromOtherLists,
        filterGroups,
        savedFilters,
    ]);

    const isViewDirty = useMemo(() => {
        if (!viewId) return false;
        const now = stableStringify(currentViewConfig);
        return savedSnapshot ? now !== savedSnapshot : false;
    }, [viewId, currentViewConfig, savedSnapshot]);

    const updateViewMutation = trpc.view.update.useMutation();
    const saveDefaultViewSettings = useCallback(async () => {
        if (!spaceId) return;
        const nextSpaceSettings = {
            ...(space?.settings as any || {}),
            defaultViewConfig: defaultViewSettingsDraft,
        };
        try {
            await updateSpaceMutation.mutateAsync({ id: spaceId, settings: nextSpaceSettings });
            if (defaultViewSettingsApplyTo === "REQUIRED" || defaultViewSettingsApplyTo === "ALL") {
                if (viewId) {
                    const raw = (initialConfig ?? {}) as any;
                    const boardView = raw?.boardView ?? {};
                    const nextConfig = { ...raw, boardView: { ...boardView, ...defaultViewSettingsDraft } };
                    await updateViewMutation.mutateAsync({ id: viewId, config: nextConfig });
                }
                if (defaultViewSettingsApplyTo === "ALL") {
                    const views = await utils.view.list.fetch({ spaceId });
                    await Promise.all((views as { id: string; config: any }[]).map((v) =>
                        updateViewMutation.mutateAsync({
                            id: v.id,
                            config: {
                                ...(v.config ?? {}),
                                boardView: {
                                    ...((v.config as any)?.boardView ?? {}),
                                    ...defaultViewSettingsDraft,
                                },
                            },
                        })
                    ));
                }
            }
            toast.success("Default view settings saved");
            setIsDefaultViewSettingsModalOpen(false);
        } catch (error: any) {
            toast.error(`Failed to save defaults: ${error?.message ?? "Unknown error"}`);
        }
    }, [spaceId, space?.settings, defaultViewSettingsDraft, defaultViewSettingsApplyTo, viewId, initialConfig, updateSpaceMutation, updateViewMutation, utils.view.list]);

    const createViewMutation = trpc.view.create.useMutation({
        onSuccess: (newView) => {
            toast.success(`Created new view: ${newView.name}`);
            void utils.view.get.invalidate();
        },
    });

    useEffect(() => {
        if (viewData) {
            setViewNameDraft(viewData.name || "");
            setPinView(viewData.isPinned || false);
            setPrivateView(viewData.isPrivate || false);
            setProtectView(viewData.isLocked || false);
            setDefaultView(viewData.isDefault || false);
            const cfg = (viewData.config as any)?.boardView;
            if (typeof cfg?.viewAutosave === "boolean") setViewAutosave(cfg.viewAutosave);
        }
    }, [viewData]);

    const updateViewProperty = async (property: string, value: any) => {
        if (!viewId) return;
        try {
            await updateViewMutation.mutateAsync({ id: viewId, [property]: value });
            void utils.view.get.invalidate({ id: viewId });
            if (typeof value === "boolean") {
                const label = property.replace("is", "");
                toast.success(`View ${label.toLowerCase()} ${value ? "enabled" : "disabled"}`);
            }
        } catch (e) {
            toast.error(`Failed to update ${property}`);
        }
    };

    const updateViewName = async (newName: string) => {
        if (!viewId || !newName.trim()) return;
        const oldName = viewData?.name || "";
        setViewNameDraft(newName);
        try {
            await updateViewMutation.mutateAsync({ id: viewId, name: newName.trim() });
            void utils.view.get.invalidate({ id: viewId });
        } catch (e) {
            setViewNameDraft(oldName);
        }
    };

    const saveViewConfig = useCallback(async (overrides?: Partial<BoardViewSavedConfig>, silent = false) => {
        if (!viewId) return;
        const raw = (initialConfig ?? {}) as any;
        const configToSave = { ...currentViewConfig, ...overrides };
        const nextConfig = { ...(raw ?? {}), boardView: configToSave };
        await updateViewMutation.mutateAsync({ id: viewId, config: nextConfig });
        setSavedSnapshot(stableStringify(configToSave));
        if (!silent) toast.success("View saved successfully");
    }, [viewId, initialConfig, currentViewConfig, updateViewMutation]);

    const handleToggleAutosave = useCallback(async (enabled: boolean) => {
        setViewAutosave(enabled);
        await saveViewConfig({ viewAutosave: enabled } as Partial<BoardViewSavedConfig>, true);
        toast.success(`Autosave ${enabled ? "enabled" : "disabled"}`);
    }, [saveViewConfig]);

    useEffect(() => {
        if (viewAutosave && isViewDirty) {
            void saveViewConfig(undefined, true);
        }
    }, [viewAutosave, isViewDirty, saveViewConfig]);

    const revertViewChanges = useCallback(() => {
        const cfg = viewConfigFromDb;

        // Grouping and layout - reset to defaults
        setGroupBy(cfg.groupBy ?? "status");
        setGroupDirection(cfg.groupDirection ?? "asc");
        setExpandedSubtaskMode(cfg.subtasksMode ?? "collapsed");

        // Visibility and view settings
        setShowCompleted(cfg.showCompleted ?? false);
        setShowCompletedSubtasks(cfg.showCompletedSubtasks ?? false);
        setViewAutosave(cfg.viewAutosave ?? false);
        setDefaultToMeMode(cfg.defaultToMeMode ?? false);
        setShowTasksFromOtherLists(cfg.showTasksFromOtherLists ?? false);
        setShowSubtasksFromOtherLists(cfg.showSubtasksFromOtherLists ?? false);
        if (cfg.filterGroups) setFilterGroups(cfg.filterGroups);
        if (Array.isArray(cfg.savedFilterPresets)) setSavedFilters(cfg.savedFilterPresets);

        setSettings(prev => {
            const next = { ...prev };
            next.cardSize = (cfg.cardSize as "compact" | "default" | "comfortable") ?? "default";
            next.showCover = cfg.showCover ?? true;
            next.showSubtasks = cfg.showSubtasks ?? true;
            next.showCustomFields = cfg.showCustomFields ?? true;
            next.showEmptyColumns = cfg.showEmptyColumns ?? true;
            next.stackFields = cfg.stackFields ?? false;
            next.showTaskLocations = cfg.showTaskLocations ?? false;
            next.showTaskProperties = cfg.showTaskProperties ?? true;
            next.enableWipLimits = cfg.enableWipLimits ?? true;
            next.enableSubgroups = cfg.enableSubgroups ?? false;
            next.autoArchive = cfg.autoArchive ?? false;
            next.visibleFields = Array.isArray(cfg.visibleFields) ? cfg.visibleFields : ["assignee", "dueDate", "priority", "tags"];
            return next;
        });

        // Update snapshot with the reverted config
        const revertedConfig = {
            groupBy: cfg.groupBy ?? "status",
            groupDirection: cfg.groupDirection ?? "asc",
            subtasksMode: cfg.subtasksMode ?? "collapsed",
            showCompleted: cfg.showCompleted ?? false,
            showCompletedSubtasks: cfg.showCompletedSubtasks ?? false,
            cardSize: cfg.cardSize ?? "default",
            showCover: cfg.showCover ?? true,
            showSubtasks: cfg.showSubtasks ?? true,
            showCustomFields: cfg.showCustomFields ?? true,
            showEmptyColumns: cfg.showEmptyColumns ?? true,
            stackFields: cfg.stackFields ?? false,
            showTaskLocations: cfg.showTaskLocations ?? false,
            showTaskProperties: cfg.showTaskProperties ?? true,
            enableWipLimits: cfg.enableWipLimits ?? true,
            enableSubgroups: cfg.enableSubgroups ?? false,
            autoArchive: cfg.autoArchive ?? false,
            visibleFields: Array.isArray(cfg.visibleFields) ? cfg.visibleFields : ["assignee", "dueDate", "priority", "tags"],
            viewAutosave: cfg.viewAutosave ?? false,
            defaultToMeMode: cfg.defaultToMeMode ?? false,
            showTasksFromOtherLists: cfg.showTasksFromOtherLists ?? false,
            showSubtasksFromOtherLists: cfg.showSubtasksFromOtherLists ?? false,
            filterGroups: cfg.filterGroups ?? { id: "root", operator: "AND", conditions: [] },
            savedFilterPresets: Array.isArray(cfg.savedFilterPresets) ? cfg.savedFilterPresets : [],
        };

        setSavedSnapshot(stableStringify(revertedConfig));
        toast.success("Changes reverted to default");
    }, [viewConfigFromDb]);

    const saveAsNewView = useCallback(async () => {
        if (!viewId || (!spaceId && !projectId && !teamId && !listId)) {
            toast.error("Cannot create view: missing container context");
            return;
        }
        const newName = `${viewData?.name || "View"} (Copy)`;
        const raw = (initialConfig ?? {}) as any;
        const nextConfig = { ...(raw ?? {}), boardView: currentViewConfig };
        try {
            await createViewMutation.mutateAsync({
                name: newName,
                type: "BOARD",
                spaceId: spaceId || undefined,
                projectId: projectId || undefined,
                teamId: teamId || undefined,
                listId: listId || undefined,
                config: nextConfig,
            });
        } catch (e: any) {
            toast.error(`Failed to create view: ${e.message}`);
        }
    }, [viewId, viewData, spaceId, projectId, teamId, listId, initialConfig, currentViewConfig, createViewMutation]);

    const getCustomFieldValue = (task: Task, customFieldId: string) => {
        const fieldValue = task.customFieldValues?.find(v => v.customFieldId === customFieldId);
        return fieldValue?.value;
    };

    // Advanced nesting filters
    const evaluateCondition = (task: Task, cond: FilterCondition): boolean => {
        if (!cond.field) return true;
        let fieldValue: any = null;
        if (cond.field === "status") fieldValue = task.statusId;
        else if (cond.field === "priority") fieldValue = task.priority;
        else if (cond.field === "assignee") fieldValue = task.assignees?.map((a: any) => a.user?.id) || [];
        else if (cond.field === "tags") fieldValue = task.tags || [];
        else if (cond.field === "dueDate") fieldValue = task.dueDate;
        else if (cond.field === "startDate") fieldValue = (task as any).startDate;
        else if (cond.field === "dateCreated") fieldValue = (task as any).createdAt;
        else if (cond.field === "dateClosed") fieldValue = (task as any).dateClosed;
        else if (cond.field === "dateDone") fieldValue = (task as any).dateDone;
        else if (cond.field === "taskType") fieldValue = (task as any).type || (task as any).taskType;
        else if (cond.field === "archived") fieldValue = (task as any).archived || false;
        else if (cond.field === "name") fieldValue = task.title || task.name || "";
        else if (cond.field === "description") fieldValue = task.description || "";
        else if (cond.field === "timeEstimate") fieldValue = (task as any).timeEstimate;
        else if (cond.field === "timeTracked") fieldValue = (task as any).timeTracked;
        else if (cond.field === "duration") fieldValue = (task as any).duration;
        else if (cond.field === "createdBy") fieldValue = (task as any).createdById;
        else if (cond.field === "follower") fieldValue = (task as any).followers?.map((f: any) => f.userId) || [];
        else if (cond.field === "assignedComment") fieldValue = ((task as any)._count?.assignedComments || 0) > 0;
        else if (cond.field === "dependency") fieldValue = (task as any).dependencies || [];
        else if (cond.field === "latestStatusChange") fieldValue = (task as any).latestStatusChangeAt;
        else {
            fieldValue = getCustomFieldValue(task, cond.field);
        }

        const isEmpty = (v: any) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
        const arrayMatch = (arr: any[], vals: any[]) => Array.isArray(vals) && vals.length > 0 && vals.some((v: any) => arr.includes(v));

        switch (cond.operator) {
            case "is":
                if (Array.isArray(fieldValue) && Array.isArray(cond.value)) return arrayMatch(fieldValue, cond.value);
                if (Array.isArray(cond.value) && cond.value.length === 1) return fieldValue === cond.value[0];
                return fieldValue === cond.value;
            case "is_not":
                if (Array.isArray(fieldValue) && Array.isArray(cond.value)) return !arrayMatch(fieldValue, cond.value);
                if (Array.isArray(cond.value) && cond.value.length === 1) return fieldValue !== cond.value[0];
                return fieldValue !== cond.value;
            case "contains":
                if (Array.isArray(fieldValue)) return fieldValue.includes(cond.value);
                return String(fieldValue || "").toLowerCase().includes(String(cond.value || "").toLowerCase());
            case "not_contains":
                if (Array.isArray(fieldValue)) return !fieldValue.includes(cond.value);
                return !String(fieldValue || "").toLowerCase().includes(String(cond.value || "").toLowerCase());
            case "any_of":
                if (Array.isArray(cond.value)) {
                    if (Array.isArray(fieldValue)) return fieldValue.some(v => cond.value.includes(v));
                    return cond.value.includes(fieldValue);
                }
                return false;
            case "is_set": return !isEmpty(fieldValue);
            case "is_not_set": return isEmpty(fieldValue);
            case "after": return fieldValue && cond.value && new Date(fieldValue) > new Date(cond.value);
            case "before": return fieldValue && cond.value && new Date(fieldValue) < new Date(cond.value);
            case "greater_than": return Number(fieldValue || 0) > Number(cond.value || 0);
            case "less_than": return Number(fieldValue || 0) < Number(cond.value || 0);
            case "equal": return Number(fieldValue || 0) === Number(cond.value || 0);
            case "is_archived": return !!fieldValue;
            case "is_not_archived": return !fieldValue;
            case "has":
                if (Array.isArray(fieldValue)) return fieldValue.length > 0;
                return !!fieldValue;
            case "doesnt_have":
                if (Array.isArray(fieldValue)) return fieldValue.length === 0;
                return !fieldValue;
            default: return true;
        }
    };

    const evaluateGroup = (task: Task, group: FilterGroup): boolean => {
        if (group.conditions.length === 0) return true;
        if (group.operator === "AND") {
            return group.conditions.every(c => "conditions" in c ? evaluateGroup(task, c as FilterGroup) : evaluateCondition(task, c as FilterCondition));
        } else {
            return group.conditions.some(c => "conditions" in c ? evaluateGroup(task, c as FilterGroup) : evaluateCondition(task, c as FilterCondition));
        }
    };

    // Filter tasks
    const filteredTasks = useMemo(() => {
        let result = tasks;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(t => (t.title || t.name || "").toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
        }

        // Apply advanced filters
        if (filterGroups.conditions.length > 0) {
            result = result.filter(t => evaluateGroup(t, filterGroups));
        }

        // Legacy filters for backward compatibility during transition
        if (filters.assignees.length > 0) {
            result = result.filter(t => {
                const taskAssigneeIds = (t.assignees as any[])?.map((a: any) => a.userId) || (t.assignee ? [t.assignee.id] : []);
                if (taskAssigneeIds.length === 0) return filters.assignees.includes("__unassigned__");
                return filters.assignees.some(id => taskAssigneeIds.includes(id)) || (filters.assignees.includes("__unassigned__") && taskAssigneeIds.length === 0);
            });
        }
        if (filters.priorities.length > 0) result = result.filter(t => filters.priorities.includes(t.priority as string));
        if (filters.tags.length > 0) {
            result = result.filter(t => {
                const taskTagIds = (t.tags as any[])?.map((tag: any) => tag.id) || [];
                return filters.tags.some(id => taskTagIds.includes(id));
            });
        }

        // Filter out closed/completed tasks when showCompleted is false
        // EXCEPTION: If grouping by dueDate, we have a "Done" column, so we might want to show them there IF the user wants.
        // However, usually "Show closed tasks" is a hard toggle.
        // But if I want to populate the "Done" column in Due Date view, I need them.
        // If showCompleted is false, they are hidden regardless of the column.
        // The user asked for a Done column, implying they expect tasks there.
        // But if "Show closed tasks" is OFF, the Done column would be empty.
        // I will respect the 'showCompleted' toggle. If it's OFF, no completed tasks shown.
        if (!showCompleted) {
            result = result.filter(t => {
                const isDone = t.status?.name?.toLowerCase() === "done" || t.status?.name?.toLowerCase() === "completed" || t.status?.name?.toLowerCase() === "closed";
                return !t.parentId && !isDone;
            });
        }

        // Completed subtasks filter
        if (!showCompletedSubtasks) {
            result = result.filter(t => {
                if (!t.parentId) return true;
                const isDone = t.status?.name?.toLowerCase() === "done" || t.status?.name?.toLowerCase() === "completed" || t.status?.name?.toLowerCase() === "closed";
                return !isDone;
            });
        }

        return result;
    }, [tasks, searchQuery, filterGroups, filters, showCompleted, showCompletedSubtasks]);

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

    const hasFilterValue = (cond: FilterCondition): boolean => {
        // Operators that don't require values are always considered "set"
        if (cond.operator === "is_set" || cond.operator === "is_not_set" ||
            cond.operator === "is_archived" || cond.operator === "is_not_archived" ||
            cond.operator === "has" || cond.operator === "doesnt_have") {
            return true;
        }

        // Check if value is set based on type
        if (Array.isArray(cond.value)) {
            return cond.value.length > 0;
        }
        if (typeof cond.value === "string") {
            return cond.value.trim().length > 0;
        }
        if (typeof cond.value === "number") {
            return cond.value !== null && cond.value !== undefined;
        }

        return cond.value !== null && cond.value !== undefined && cond.value !== "";
    };

    const hasAnyValueInGroup = (group: FilterGroup): boolean => {
        return group.conditions.some(c => {
            if ("conditions" in c) {
                return hasAnyValueInGroup(c as FilterGroup);
            }
            return hasFilterValue(c as FilterCondition);
        });
    };

    const appliedFilterCount = useMemo(() => {
        if (filterGroups.conditions.length === 0) return 0;
        return filterGroups.conditions.filter(c => {
            if ("conditions" in c) return hasAnyValueInGroup(c as FilterGroup);
            return hasFilterValue(c as FilterCondition);
        }).length;
    }, [filterGroups]);

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
                const boardView = raw.boardView ?? {};
                void updateViewMutation.mutateAsync({ id: viewId, config: { ...raw, boardView: { ...boardView, savedFilterPresets: next } } });
            } else if (typeof window !== "undefined") {
                localStorage.setItem("agentflox_saved_filters", JSON.stringify(next));
            }
            return next;
        });
        setSavedFilterName("");
    }, [savedFilterName, filterGroups, viewId, initialConfig, updateViewMutation]);

    const deleteSavedFilter = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSavedFilters(prev => {
            const next = prev.filter(f => f.id !== id);
            if (viewId && initialConfig != null) {
                const raw = (initialConfig ?? {}) as Record<string, any>;
                const boardView = raw.boardView ?? {};
                void updateViewMutation.mutateAsync({ id: viewId, config: { ...raw, boardView: { ...boardView, savedFilterPresets: next } } });
            } else if (typeof window !== "undefined") {
                localStorage.setItem("agentflox_saved_filters", JSON.stringify(next));
            }
            return next;
        });
    }, [viewId, initialConfig, updateViewMutation]);

    const applySavedFilter = (config: FilterGroup) => {
        setFilterGroups(config);
        setSavedFiltersPanelOpen(false);
    };

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
                                                                                                                {statuses.map(s => (
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
                <TaskListLoadMore
                    loadMoreRef={loadMoreRef}
                    hasMore={hasMoreTasks}
                    isFetchingNextPage={isFetchingNextPage}
                    loaded={tasks.length}
                    total={taskTotal}
                />
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

    // Group tasks into columns
    const columns = useMemo(() => {
        const columnMap = new Map<string, any[]>();

        // Initialize columns based on group by
        if (groupBy === "status") {
            statuses.forEach(status => {
                columnMap.set(status.id, []);
            });
        } else if (groupBy === "assignee") {
            // Get unique assignees
            const assignees = new Set<string>();
            filteredTasks.forEach(task => {
                (task.assignees as any[])?.forEach((a: any) => assignees.add(a.userId));
                if (task.assigneeId) assignees.add(task.assigneeId);
            });
            assignees.forEach(assigneeId => {
                columnMap.set(assigneeId, []);
            });
            columnMap.set("unassigned", []);
        } else if (groupBy === "priority") {
            ["URGENT", "HIGH", "NORMAL", "LOW", "NONE"].forEach(priority => {
                columnMap.set(priority, []);
            });
        }

        // Group tasks
        const visibleIds = new Set(filteredTasks.map(t => t.id));
        filteredTasks.forEach(task => {
            // If parent is visible, this task is shown as a subtask, not a top-level card
            if (task.parentId && visibleIds.has(task.parentId)) {
                return;
            }

            let key: string;
            if (groupBy === "status") {
                key = task.statusId || "no-status";
            } else if (groupBy === "assignee") {
                const firstAssigneeId = (task.assignees as any[])?.[0]?.userId || task.assigneeId;
                if (!firstAssigneeId) {
                    key = "unassigned";
                } else {
                    key = firstAssigneeId;
                }
            } else if (groupBy === "priority") {
                key = task.priority || "NONE";
            } else {
                key = "default";
            }

            if (!columnMap.has(key)) {
                columnMap.set(key, []);
            }
            columnMap.get(key)!.push(task);
        });

        return Array.from(columnMap.entries()).map(([key, tasks]) => {
            let title: string, color: string, wipLimit: number | undefined;

            if (groupBy === "status") {
                const status = statuses.find(s => s.id === key);
                title = status?.name || "No Status";
                color = status?.color || "bg-zinc-500";
                wipLimit = status?.wipLimit;
            } else if (groupBy === "assignee") {
                if (key === "unassigned") {
                    title = "Unassigned";
                    color = "bg-zinc-400";
                } else {
                    const assignee = tasks.find(t => t.assigneeId === key)?.assignee || tasks[0]?.assignees?.find((a: any) => a.userId === key);
                    title = (assignee as any)?.user?.name || (assignee as any)?.name || "Unknown";
                    color = "bg-blue-500";
                }
            } else if (groupBy === "priority") {
                title = key;
                color = key === "URGENT" ? "bg-red-500" :
                    key === "HIGH" ? "bg-orange-500" :
                        key === "NORMAL" ? "bg-blue-500" : "bg-zinc-400";
            } else {
                title = key;
                color = "bg-zinc-500";
            }

            return {
                id: key,
                title,
                color,
                items: tasks,
                wipLimit,
                isCollapsed: collapsedColumns.has(key),
            };
        }).filter(col => settings.showEmptyColumns || col.items.length > 0);
    }, [filteredTasks, statuses, groupBy, collapsedColumns, settings.showEmptyColumns]);

    const handleSelectTask = useCallback((taskId: string, selected: boolean) => {
        setSelectedTasks(prev => {
            if (selected) return [...prev, taskId];
            return prev.filter(id => id !== taskId);
        });
    }, []);

    const handleSelectAllInColumn = useCallback((columnId: string) => {
        const column = columns.find(c => c.id === columnId);
        if (!column) return;
        const taskIds = column.items.map(t => t.id);
        setSelectedTasks(prev => {
            const otherTasks = prev.filter(id => !taskIds.includes(id));
            return [...otherTasks, ...taskIds];
        });
    }, [columns]);

    const groupLabel =
        groupBy === "none" ? "None" :
            groupBy === "status" ? "Status" :
                groupBy === "priority" ? "Priority" :
                    groupBy === "assignee" ? "Assignee" :
                        groupBy === "dueDate" ? "Due date" :
                            groupBy === "taskType" ? "Task type" :
                                groupBy === "tags" ? "Tags" :
                                    FIELD_CONFIG.find(f => f.id === groupBy)?.label || "List";

    const allExpanded = columns.every(c => !c.isCollapsed);

    const toggleColumn = useCallback((colId: string) => {
        setSettings(prev => {
            const visible = new Set(prev.visibleFields);
            if (visible.has(colId)) visible.delete(colId);
            else visible.add(colId);
            return { ...prev, visibleFields: Array.from(visible) };
        });
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor)
    );

    // Drag and Drop — optimistic updates go through updateTaskInList so UI moves immediately
    const displayTasks = tasks;

    // Helper function to group tasks into columns (must be defined before usage)
    // Helper function to group tasks into columns (must be defined before usage)
    const groupTasksIntoColumns = (tasksList: Task[]) => {
        const columnMap = new Map<string, Task[]>();

        // Initialize columns from statuses or default columns
        if (groupBy === "status") {
            statuses.forEach(s => columnMap.set(s.id, []));
            columnMap.set("no-status", []);
        } else if (groupBy === "assignee") {
            columnMap.set("unassigned", []);
        } else if (groupBy === "priority") {
            ["URGENT", "HIGH", "NORMAL", "LOW", "NONE"].forEach(p => columnMap.set(p, []));
        } else if (groupBy === "taskType") {
            availableTaskTypes.forEach(t => columnMap.set(t.id, []));
        } else if (groupBy === "dueDate") {
            ["overdue", "today", "tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "future", "no-due-date", "done"].forEach(d => columnMap.set(d, []));
        }

        // Group tasks
        const visibleIds = new Set(tasksList.map(t => t.id));
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        tasksList.forEach(task => {
            // If parent is visible, this task is shown as a subtask, not a top-level card
            // UNLESS expandedSubtaskMode is "expanded" or "separate", in which case show it
            if (expandedSubtaskMode === "collapsed" && task.parentId && visibleIds.has(task.parentId)) {
                return;
            }

            let key: string;
            if (groupBy === "status") {
                key = task.statusId || "no-status";
            } else if (groupBy === "assignee") {
                const firstAssigneeId = (task.assignees as any[])?.[0]?.userId || task.assigneeId;
                key = firstAssigneeId || "unassigned";
            } else if (groupBy === "priority") {
                key = task.priority || "NONE";
            } else if (groupBy === "dueDate") {
                if (task.isCompleted || task.status?.type === "COMPLETED" || task.status?.type === "CLOSED") {
                    key = "done";
                } else if (!task.dueDate) {
                    key = "no-due-date";
                } else {
                    const d = new Date(task.dueDate);
                    d.setHours(0, 0, 0, 0);
                    const diffTime = d.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays < 0) key = "overdue";
                    else if (diffDays === 0) key = "today";
                    else if (diffDays === 1) key = "tomorrow";
                    else if (diffDays > 1 && diffDays < 8) {
                        key = format(d, "EEEE").toLowerCase();
                    } else {
                        key = "future";
                    }
                }
            } else if (groupBy === "taskType") {
                key = task.taskTypeId || task.taskType?.id || defaultTaskType?.id || "no-type";
            } else if (groupBy === "tags") {
                const tags = (task.tags ?? []) as string[];
                key = tags[0] || "No Tags";
            } else if (groupBy !== "none") {
                // Custom fields
                const cf = FIELD_CONFIG.find(f => f.id === groupBy);
                if (cf) {
                    const value = task.customFieldValues?.find((v: any) => v.customFieldId === groupBy)?.value;
                    key = (value !== null && value !== undefined) ? String(value) : `No ${cf.label}`;
                } else {
                    key = "default";
                }
            } else {
                key = "default";
            }

            if (!columnMap.has(key)) {
                columnMap.set(key, []);
            }
            columnMap.get(key)!.push(task);
        });

        const result = Array.from(columnMap.entries()).map(([key, tasks]) => {
            let title: string, color: string, wipLimit: number | undefined;

            if (groupBy === "status") {
                const status = statuses.find(s => s.id === key);
                title = status?.name || "No Status";
                color = status?.color || "bg-zinc-500";
                wipLimit = status?.wipLimit;
            } else if (groupBy === "assignee") {
                if (key === "unassigned") {
                    title = "Unassigned";
                    color = "bg-zinc-400";
                } else {
                    const assignee = tasks.find(t => t.assigneeId === key)?.assignee || tasks[0]?.assignees?.find((a: any) => a.userId === key);
                    title = (assignee as any)?.user?.name || (assignee as any)?.name || "Unknown";
                    color = "bg-blue-500";
                }
            } else if (groupBy === "priority") {
                title = key;
                color = key === "URGENT" ? "bg-red-500" :
                    key === "HIGH" ? "bg-orange-500" :
                        key === "NORMAL" ? "bg-blue-500" : "bg-zinc-400";
            } else if (groupBy === "taskType") {
                const typeDef = availableTaskTypes.find((t: any) => t.id === key);
                if (typeDef) {
                    title = typeDef.name;
                    color = typeDef.color ? `bg-[${typeDef.color}]` : "bg-blue-500";
                    // Handle dynamic color class construction issue by using style in render if needed, 
                    // or mapping to known tailwind colors if they are standard. 
                    // For now, let's stick to a safe default if hex, or attempt to use it.
                    // Note: hex in className like bg-[#...] works in JIT.
                    if (typeDef.color && typeDef.color.startsWith("#")) color = `bg-[${typeDef.color}]`;
                } else {
                    title = key === "no-type" ? "No Task Type" : "Other";
                    color = "bg-zinc-400";
                }
            } else if (groupBy === "dueDate") {
                switch (key) {
                    case "overdue": title = "Overdue"; color = "bg-red-500"; break;
                    case "today": title = "Today"; color = "bg-green-500"; break;
                    case "tomorrow": title = "Tomorrow"; color = "bg-amber-500"; break;
                    case "future": title = "Future"; color = "bg-zinc-400"; break;
                    case "no-due-date": title = "No due date"; color = "bg-zinc-300"; break;
                    case "done": title = "Done"; color = "bg-emerald-600"; break;
                    default: // Days of week
                        title = key.charAt(0).toUpperCase() + key.slice(1);
                        color = "bg-blue-500";
                        break;
                }
            } else if (groupBy === "tags") {
                title = key;
                color = "bg-zinc-500";
            } else {
                title = key;
                color = "bg-zinc-500";
            }

            // CRITICAL: Sort tasks by order within each column
            // CRITICAL: Sort tasks by order within each column
            const sortedTasks = [...tasks].sort((a, b) => {
                // If customized sort is applied
                if (sort.length > 0) {
                    for (const sortOption of sort) {
                        const { id, desc } = sortOption;
                        let valA: any;
                        let valB: any;

                        // Handle fields with complex objects or specific logic
                        if (id === "status") {
                            valA = a.status?.name || "";
                            valB = b.status?.name || "";
                        } else if (id === "name") {
                            valA = a.title || a.name || "";
                            valB = b.title || b.name || "";
                        } else if (id === "assignee") {
                            const assigneeA = (a.assignees as any[])?.[0]?.user?.name || a.assignee?.name || "";
                            const assigneeB = (b.assignees as any[])?.[0]?.user?.name || b.assignee?.name || "";
                            valA = assigneeA;
                            valB = assigneeB;
                        } else if (id === "priority") {
                            const priorityOrder = { URGENT: 4, HIGH: 3, NORMAL: 2, LOW: 1, NONE: 0 };
                            valA = priorityOrder[(a.priority || "NONE") as keyof typeof priorityOrder] || 0;
                            valB = priorityOrder[(b.priority || "NONE") as keyof typeof priorityOrder] || 0;
                        } else if (id === "dueDate" || id === "startDate" || id === "createdAt" || id === "updatedAt") {
                            valA = (a as any)[id] ? new Date((a as any)[id]).getTime() : 0;
                            valB = (b as any)[id] ? new Date((b as any)[id]).getTime() : 0;
                        } else {
                            valA = (a as any)[id];
                            valB = (b as any)[id];
                        }

                        if (valA === valB) continue;

                        if (typeof valA === "string" && typeof valB === "string") {
                            const res = valA.localeCompare(valB);
                            if (res !== 0) return desc ? -res : res;
                        } else {
                            if (valA < valB) return desc ? 1 : -1;
                            if (valA > valB) return desc ? -1 : 1;
                        }
                    }
                }

                // Fallback to manual order (position string)
                const posA = a.position || "";
                const posB = b.position || "";
                return posA.localeCompare(posB);
            });

            return {
                id: key,
                title,
                color,
                items: sortedTasks, // Use sorted tasks instead of unsorted
                wipLimit,
                isCollapsed: collapsedColumns.has(key) || (settings.collapseEmptyColumns && sortedTasks.length === 0),
            };
        }).sort((a, b) => {
            if (groupBy === "dueDate") {
                const order = ["overdue", "today", "tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "future", "no-due-date", "done"];
                const res = order.indexOf(a.id) - order.indexOf(b.id);
                return groupDirection === "desc" ? -res : res;
            }
            return 0;
        }).filter(col => settings.showEmptyColumns || settings.collapseEmptyColumns || col.items.length > 0 || (groupBy === "dueDate" && ["overdue", "today", "tomorrow"].includes(col.id)));

        // Apply group direction reversal for non-dueDate groups
        if (groupDirection === "desc" && groupBy !== "dueDate") {
            return result.reverse();
        }

        return result;
    };

    // Recalculate columns with display tasks
    const displayColumns = useMemo(() => {
        const tasksToGroup = filteredTasks;

        if (!showCompleted) {
            const filtered = tasksToGroup.filter(t => !t.isCompleted);
            return groupTasksIntoColumns(filtered);
        }
        return groupTasksIntoColumns(tasksToGroup);
    }, [filteredTasks, showCompleted, groupBy, sort, statuses, groupDirection, settings.showEmptyColumns, settings.collapseEmptyColumns, expandedSubtaskMode, collapsedColumns, availableTaskTypes]);

    const [draggingIds, setDraggingIds] = useState<string[]>([]);
    const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

    const handleDragStart = (event: DragStartEvent) => {
        const id = event.active.id as string;
        setActiveId(id);
        setDraggingIds([id]); // Multi-select not fully implemented in BoardView yet
        setDropPosition(null);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { over, active } = event;
        const overId = over?.id ? String(over.id) : null;
        const overRect = over?.rect;
        const activeRect = active?.rect.current.translated;

        if (overId && overRect && activeRect) {
            const activeCenterY = activeRect.top + activeRect.height / 2;
            const overMidY = overRect.top + overRect.height / 2;
            setDropPosition(activeCenterY < overMidY ? 'before' : 'after');
        } else {
            setDropPosition(null);
        }
    };

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over, delta } = event;

        // Capture state values BEFORE clearing them
        const capturedDropPosition = dropPosition;

        setActiveId(null);
        setDraggingIds([]);
        setDropPosition(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Find the task being dragged
        const draggedTask = tasks.find(t => t.id === activeId);
        if (!draggedTask) return;

        // Determine if we dropped on a column, a task, or an "after:taskId" slot
        const isOverColumn = displayColumns.some(c => c.id === overId);
        const isAfterSlot = typeof overId === "string" && overId.startsWith("after:");
        const rawOverId = isAfterSlot ? overId.slice(6) : overId;

        let targetColumnId = overId;
        let targetTaskId: string | null = null;
        let isChildDrop = false;

        // Resolve target column and parent status
        if (!isOverColumn) {
            const foundColumn = displayColumns.find(c => c.items.some((t: any) => t.id === rawOverId));
            if (foundColumn) {
                targetColumnId = foundColumn.id;
                const overTask = tasks.find(t => t.id === rawOverId);

                // Hierarchy Support (Nesting fix like ListView)
                const dragRightThreshold = 15;
                if (delta.x > dragRightThreshold && capturedDropPosition !== "before" && overTask) {
                    isChildDrop = true;
                    targetTaskId = null; // append as child
                } else {
                    const idx = foundColumn.items.findIndex((t: any) => t.id === rawOverId);
                    if (isAfterSlot || capturedDropPosition === "after") {
                        if (idx >= 0 && idx < foundColumn.items.length - 1) {
                            targetTaskId = foundColumn.items[idx + 1].id;
                        } else {
                            targetTaskId = null; // Drop at the end of the column
                        }
                    } else {
                        targetTaskId = rawOverId;
                    }
                }
            } else {
                return;
            }
        }

        const overTask = !isOverColumn ? tasks.find(t => t.id === rawOverId) : null;
        const newParentId = isChildDrop && overTask ? overTask.id : (overTask ? normalizeParentId(overTask.parentId) : null);

        // Validate: Prevent circular dependencies
        if (newParentId && wouldCreateCircularDependency(activeId, newParentId, tasks)) {
            console.warn('Circular dependency detected, aborting');
            toast.error("Circular dependency detected");
            return;
        }

        // Determine common update fields based on grouping
        const baseUpdate: any = {};
        if (groupBy === "status") {
            baseUpdate.statusId = targetColumnId === "no-status" ? null : targetColumnId;
        } else if (groupBy === "assignee") {
            baseUpdate.assigneeIds = targetColumnId === "unassigned" ? [] : [targetColumnId];
        } else if (groupBy === "priority") {
            baseUpdate.priority = targetColumnId === "NONE" ? undefined : targetColumnId;
        } else if (groupBy === "taskType") {
            baseUpdate.taskTypeId = (targetColumnId === "TASK" || (defaultTaskType && targetColumnId === defaultTaskType.id))
                ? (defaultTaskType?.id || null) : targetColumnId;
        }

        // Determine current bucket (column)
        const targetCol = displayColumns.find(c => c.id === targetColumnId);
        if (!targetCol) return;

        const currentBucket = [...targetCol.items];

        // Compute new order for the column
        let newOrderForColumn: string[] = [];
        const otherColumnTasks = currentBucket
            .filter(t => t.id !== activeId)
            .map(t => t.id);

        if (targetTaskId) {
            const idx = otherColumnTasks.indexOf(targetTaskId);
            newOrderForColumn = [
                ...otherColumnTasks.slice(0, idx),
                activeId,
                ...otherColumnTasks.slice(idx)
            ];
        } else {
            newOrderForColumn = [...otherColumnTasks, activeId];
        }

        // Recalculate positions in the target column to match visual order
        const updates: any[] = [];
        let prevPos: string | null = null;

        newOrderForColumn.forEach((tid) => {
            const taskInCol = tasks.find(t => t.id === tid);
            if (!taskInCol) return;

            const newPos = generateKeyBetween(prevPos, null);
            prevPos = newPos;

            const isDraggedOne = tid === activeId;
            const payload: any = { id: tid };
            let changed = false;

            if (taskInCol.position !== newPos) {
                payload.position = newPos;
                changed = true;
            }

            if (isDraggedOne) {
                Object.entries(baseUpdate).forEach(([k, v]) => {
                    if (k === "assigneeIds") {
                        const currentIds = ((taskInCol as any).assignees as any[] | undefined)?.map((a: any) => a.userId).filter(Boolean)
                            ?? ((taskInCol as any).assigneeId ? [(taskInCol as any).assigneeId] : []);
                        const nextIds = (v as string[]) ?? [];
                        if (currentIds.join(",") !== nextIds.join(",")) {
                            payload[k] = v;
                            changed = true;
                        }
                    } else if ((taskInCol as any)[k] !== v) {
                        payload[k] = v;
                        changed = true;
                    }
                });
                // Also update parent if nesting changed
                if (normalizeParentId(taskInCol.parentId) !== newParentId) {
                    payload.parentId = newParentId;
                    changed = true;
                }
            }

            if (changed) updates.push(payload);
        });

        if (updates.length === 0) return;

        // Apply optimistic updates immediately so the board doesn't wait on the network
        const previousById = new Map<string, Task>();
        updates.forEach((payload) => {
            const existing = tasks.find(t => t.id === payload.id);
            if (existing) previousById.set(payload.id, existing);

            updateTaskInList(payload.id, (task: any) => {
                const next: any = { ...task, ...payload };

                if (payload.statusId !== undefined) {
                    next.status = payload.statusId
                        ? (statuses.find(s => s.id === payload.statusId) ?? task.status)
                        : null;
                }
                if (payload.assigneeIds !== undefined) {
                    const ids = payload.assigneeIds as string[];
                    next.assignees = ids.map((id: string) => {
                        const cleanId = id.startsWith("user:") ? id.replace("user:", "") : id;
                        return { userId: cleanId, user: workspaceUserById.get(cleanId) };
                    });
                    next.assigneeId = ids[0]
                        ? (ids[0].startsWith("user:") ? ids[0].replace("user:", "") : ids[0])
                        : null;
                }
                if (payload.taskTypeId !== undefined) {
                    const typeObj = availableTaskTypes.find((t: any) => t.id === payload.taskTypeId);
                    if (typeObj) next.taskType = typeObj;
                }
                return next;
            });
        });

        // Prevent an in-flight refetch from overwriting the optimistic order
        void utils.task.list.cancel();

        // Sync to backend in the background; roll back only if the request fails
        void Promise.all(updates.map(u => updateTask.mutateAsync(u as any)))
            .then(() => {
                void utils.task.list.invalidate();
            })
            .catch(() => {
                previousById.forEach((prev, id) => {
                    updateTaskInList(id, () => prev);
                });
                toast.error("Failed to reorder tasks");
                void utils.task.list.invalidate();
            });
    }, [tasks, groupBy, updateTask, displayColumns, statuses, utils, dropPosition, defaultTaskType, updateTaskInList, workspaceUserById, availableTaskTypes]);


    const handleArchiveTasks = useCallback(async () => {
        if (!archiveColumnId) return;
        const column = displayColumns.find(c => c.id === archiveColumnId);
        if (!column) return;

        const taskIds = column.items.map(t => t.id);
        if (taskIds.length === 0) {
            setArchiveColumnId(null);
            return;
        }

        try {
            // Use bulk update if possible, otherwise map updateTask
            await Promise.all(taskIds.map(id => updateTask.mutateAsync({ id, isArchived: true } as any)));
            toast.success(`Successfully archived ${taskIds.length} tasks`);
            setArchiveColumnId(null);
        } catch (e) {
            console.error(e);
            toast.error("Failed to archive some tasks. Please try again.");
        }
    }, [archiveColumnId, displayColumns, updateTask]);

    const handleToggleCollapse = useCallback((columnId: string) => {
        const isExpanding = collapsedColumns.has(columnId);
        setCollapsedColumns(prev => {
            const next = new Set(prev);
            if (next.has(columnId)) next.delete(columnId);
            else next.add(columnId);
            return next;
        });
    }, [collapsedColumns]);

    const handleUngroupCollapsed = useCallback(() => {
        setGroupedRunFirstColumnId(null);
    }, []);

    const handleGroupCollapsed = useCallback((columnId: string) => {
        setGroupedRunFirstColumnId(columnId);
    }, []);

    const getGroupedRunCount = useCallback((firstColumnId: string) => {
        const idx = columns.findIndex(c => c.id === firstColumnId);
        if (idx < 0) return 0;
        let count = 0;
        for (let i = idx; i < columns.length && columns[i].isCollapsed; i++) count++;
        return count;
    }, [columns]);

    const isFirstInRunOfConsecutiveCollapsed = useCallback((idx: number) => {
        const col = columns[idx];
        if (!col?.isCollapsed) return false;
        const nextCol = columns[idx + 1];
        if (!nextCol?.isCollapsed) return false;
        const prevCol = columns[idx - 1];
        if (prevCol?.isCollapsed) return false;
        return true;
    }, [columns]);

    useEffect(() => {
        if (collapsedColumns.size === 0) setGroupedRunFirstColumnId(null);
        else if (groupedRunFirstColumnId && !collapsedColumns.has(groupedRunFirstColumnId)) {
            setGroupedRunFirstColumnId(null);
        }
    }, [collapsedColumns.size, collapsedColumns, groupedRunFirstColumnId]);

    const handleCancelInlineAdd = useCallback(() => {
        setInlineAddColumnId(null);
        setInlineAddTaskId(null);
        setInlineAddTitle("");
        setInlineAddAssigneeIds([]);
        setInlineAddDueDate(null);
        setInlineAddStartDate(null);
        setInlineAddPriority(null);
        setInlineAddTags([]);
        setInlineAddTaskType(defaultTaskType?.id || null);
    }, [defaultTaskType]);

    const handleSaveInlineTask = useCallback(async () => {
        const effectiveListId = listId || (listsData?.items as any[])?.[0]?.id;
        if (!inlineAddTitle.trim() || !effectiveListId || !resolvedWorkspaceId) return;

        try {
            await createTask.mutateAsync({
                title: inlineAddTitle.trim(),
                listId: effectiveListId,
                workspaceId: resolvedWorkspaceId,
                spaceId: spaceId || undefined,
                projectId: projectId || undefined,
                teamId: teamId || undefined,
                parentId: inlineAddTaskId || undefined,
                statusId: (groupBy === "status" && inlineAddColumnId && inlineAddColumnId !== "no-status") ? inlineAddColumnId : (creationStatusId || undefined),
                assigneeIds: inlineAddAssigneeIds,
                startDate: inlineAddStartDate || undefined,
                dueDate: inlineAddDueDate || undefined,
                priority: inlineAddPriority || undefined,
                tags: inlineAddTags,
                taskTypeId: inlineAddTaskType || defaultTaskType?.id,
            } as any);
            handleCancelInlineAdd();
        } catch (e) {
            console.error(e);
        }
    }, [inlineAddTitle, listId, listsData, resolvedWorkspaceId, createTask, inlineAddTaskId, inlineAddColumnId, groupBy, creationStatusId, spaceId, projectId, teamId, inlineAddAssigneeIds, inlineAddStartDate, inlineAddDueDate, inlineAddPriority, inlineAddTags, inlineAddTaskType, handleCancelInlineAdd, defaultTaskType]);

    const handleAddTask = useCallback((columnId?: string, parentId?: string) => {
        let initialAssignees: string[] = [];
        let initialPriority: string | null = null;
        let initialDueDate: Date | null = null;
        let initialTags: string[] = [];
        let initialTaskType = defaultTaskType?.id || null;

        if (columnId && columnId !== "no-status") {
            if (groupBy === "assignee" && columnId !== "unassigned") initialAssignees = [columnId];
            if (groupBy === "priority" && columnId !== "NONE") initialPriority = columnId;
            if (groupBy === "dueDate") {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (columnId === "today") initialDueDate = today;
                else if (columnId === "tomorrow") {
                    const d = new Date(today);
                    d.setDate(d.getDate() + 1);
                    initialDueDate = d;
                }
            }
            if (groupBy === "tags" && columnId !== "No Tags") initialTags = [columnId];
            if (groupBy === "taskType" && columnId !== "no-type") initialTaskType = columnId;
        }

        if (parentId) {
            setInlineAddTaskId(parentId);
            setInlineAddColumnId(columnId || null);
            setInlineAddTitle("");
            setInlineAddAssigneeIds(initialAssignees);
            setInlineAddDueDate(initialDueDate);
            setInlineAddStartDate(null);
            setInlineAddPriority(initialPriority);
            setInlineAddTags(initialTags);
            setInlineAddTaskType(initialTaskType);
        } else if (columnId) {
            setInlineAddColumnId(columnId);
            setInlineAddTaskId(null);
            setInlineAddTitle("");
            setInlineAddAssigneeIds(initialAssignees);
            setInlineAddDueDate(initialDueDate);
            setInlineAddStartDate(null);
            setInlineAddPriority(initialPriority);
            setInlineAddTags(initialTags);
            setInlineAddTaskType(initialTaskType);
        } else {
            setCreationStatusId(undefined);
            setCreationParentId(undefined);
            setAddTaskModalOpen(true);
        }
    }, [groupBy, defaultTaskType]);

    const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;



    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
                    <p className="text-sm text-muted-foreground">Loading board...</p>
                </div>
            </div>
        );
    }


    return (
        <div className="h-full w-full flex flex-col bg-white border border-zinc-200/60 shadow-sm overflow-hidden font-sans relative min-w-0">
            {/* Toolbar  EClickUp layout (matches ListView) */}
            <div className="border-b border-zinc-100 bg-white px-3 py-2 shrink-0">
                <>
                    <div className="flex items-center justify-between gap-3 overflow-x-auto">
                        {/* Left: Group, Expanded, Columns */}
                        <div className="flex items-center gap-1.5">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className={cn(
                                                        "h-8 gap-1.5 px-2.5 text-xs font-medium border-zinc-200 transition-colors cursor-pointer",
                                                        groupBy !== "none" ? "bg-violet-50 text-violet-700 border-violet-200" : "text-zinc-700 bg-zinc-50 hover:bg-zinc-100"
                                                    )}
                                                >
                                                    <LayoutList className="h-3.5 w-3.5" />
                                                    <span className="hidden sm:inline">
                                                        {groupBy === "none" ? "Group: None" : `Group: ${groupLabel}`}
                                                    </span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">Group by: {groupBy === "none" ? "None" : groupLabel}</TooltipContent>
                                    </Tooltip>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-[240px] p-1.5 rounded-xl shadow-xl border-zinc-200/60">
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
                                            <DropdownMenuItem
                                                key={opt.id}
                                                className={cn(
                                                    "flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors",
                                                    groupBy === opt.id ? "bg-violet-50 text-violet-700" : "text-zinc-600 hover:bg-zinc-100"
                                                )}
                                                onClick={() => setGroupBy(opt.id)}
                                                onSelect={(e) => e.preventDefault()}
                                            >
                                                <opt.icon className={cn("h-4 w-4", groupBy === opt.id ? "text-violet-500" : "text-zinc-400")} />
                                                <span className="flex-1">{opt.label}</span>
                                                {groupBy === opt.id && <div className="h-1.5 w-1.5 rounded-full bg-violet-600" />}
                                            </DropdownMenuItem>
                                        ))}

                                        {FIELD_CONFIG.filter(f => f.isCustom).length > 0 && (
                                            <>
                                                <DropdownMenuSeparator className="my-1.5 bg-zinc-100" />
                                                <div className="px-2 py-1.5 mb-0.5">
                                                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Custom Fields</span>
                                                </div>
                                                {FIELD_CONFIG.filter(f => f.isCustom).map((f) => {
                                                    const Icon = f.icon as any;
                                                    return (
                                                        <DropdownMenuItem
                                                            key={f.id}
                                                            className={cn(
                                                                "flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors",
                                                                groupBy === f.id ? "bg-violet-50 text-violet-700" : "text-zinc-600 hover:bg-zinc-100"
                                                            )}
                                                            onClick={() => setGroupBy(f.id)}
                                                            onSelect={(e) => e.preventDefault()}
                                                        >
                                                            <Icon className={cn("h-4 w-4", groupBy === f.id ? "text-violet-500" : "text-zinc-400")} />
                                                            <span className="flex-1 truncate">{f.label}</span>
                                                            {groupBy === f.id && <div className="h-1.5 w-1.5 rounded-full bg-violet-600" />}
                                                        </DropdownMenuItem>
                                                    );
                                                })}
                                            </>
                                        )}

                                        {groupBy !== "none" && (
                                            <>
                                                <DropdownMenuSeparator className="my-1.5 bg-zinc-100" />
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
                                            </>
                                        )}

                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <div>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className={cn(
                                                        "h-8 gap-1.5 px-2.5 text-xs font-medium cursor-pointer",
                                                        expandedSubtaskMode === "expanded"
                                                            ? "bg-violet-50 text-violet-700 border-violet-200"
                                                            : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                                                    )}
                                                >
                                                    <Spline className="h-3.5 w-3.5 scale-y-[-1]" />
                                                    <span className="hidden sm:inline">{expandedSubtaskMode === "collapsed" ? "Subtasks" : expandedSubtaskMode === "expanded" ? "Expanded" : "Separate"}</span>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom">
                                                Subtasks: {expandedSubtaskMode === "collapsed" ? "Collapsed" : expandedSubtaskMode === "expanded" ? "Expanded" : "Separate"}
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-56">
                                    <DropdownMenuLabel className="text-xs px-0 pb-2">Show subtasks</DropdownMenuLabel>
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
                                                displayTasks.forEach((t: Task) => {
                                                    if (hasSubtasks(t, displayTasks as Task[])) next.add(t.id);
                                                });
                                                setExpandedParents(next);
                                            }}
                                        >
                                            Expanded
                                        </button>
                                    </div>
                                    <p className="px-0 pt-2 text-[10px] text-zinc-500">Use this to control how subtasks appear.</p>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Right: Save view, Filter, Closed, Assignee, Search, Customize, Add Task (matches ListView) */}
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
                            <Popover open={sortPanelOpen} onOpenChange={(open) => {
                                setSortPanelOpen(open);
                                if (open === true) {
                                    setFiltersPanelOpen(false);
                                    setCustomizePanelOpen(false);
                                    setFieldsPanelOpen(false);
                                    setAssigneesPanelOpen(false);
                                }
                            }}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            "h-8 gap-1.5 px-2.5 text-xs font-medium border-zinc-200 transition-colors cursor-pointer rounded-full",
                                            sort.length > 0 ? "bg-violet-50 text-violet-700 border-violet-200" : "text-zinc-700 border-zinc-200"
                                        )}
                                    >
                                        {sort.length === 1 ? (
                                            sort[0].desc ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />
                                        ) : sort.length > 1 ? (
                                            <ChevronsUpDown className="h-3.5 w-3.5" />
                                        ) : (
                                            <ArrowUpDown className="h-3.5 w-3.5" />
                                        )}
                                        <span className="hidden sm:inline">
                                            {sort.length === 1 ? (
                                                [
                                                    { id: "status", label: "Status" },
                                                    { id: "name", label: "Task Name" },
                                                    { id: "assignee", label: "Assignee" },
                                                    { id: "priority", label: "Priority" },
                                                    { id: "dueDate", label: "Due date" },
                                                    { id: "startDate", label: "Start date" },
                                                    { id: "createdAt", label: "Date created" },
                                                    { id: "updatedAt", label: "Date updated" },
                                                ].find(opt => opt.id === sort[0].id)?.label || "Sort"
                                            ) : sort.length > 1 ? (
                                                `${sort.length} Sorts`
                                            ) : (
                                                "Sort"
                                            )}
                                        </span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-[240px] p-1.5 rounded-xl shadow-xl border-zinc-200/60" sideOffset={8}>
                                    <div className="px-2 py-1.5 mb-1">
                                        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Sort By</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        <div
                                            className="flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-zinc-50 transition-colors text-zinc-600"
                                            onClick={() => setSort([])}
                                        >
                                            <span className="flex-1">None (default)</span>
                                            {sort.length === 0 && <Check className="h-3.5 w-3.5 text-zinc-900" />}
                                        </div>

                                        {[
                                            { id: "status", label: "Status" },
                                            { id: "name", label: "Task Name" },
                                            { id: "assignee", label: "Assignee" },
                                            { id: "priority", label: "Priority" },
                                            { id: "dueDate", label: "Due date" },
                                            { id: "startDate", label: "Start date" },
                                            { id: "createdAt", label: "Date created" },
                                            { id: "updatedAt", label: "Date updated" },
                                        ].map((opt) => {
                                            const currentSortIndex = sort.findIndex(s => s.id === opt.id);
                                            const isSelected = currentSortIndex >= 0;
                                            const currentSort = isSelected ? sort[currentSortIndex] : null;

                                            return (
                                                <div
                                                    key={opt.id}
                                                    className={cn(
                                                        "flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors group/item",
                                                        isSelected ? "bg-zinc-50 text-zinc-900" : "text-zinc-600 hover:bg-zinc-100"
                                                    )}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setSort(s => s.filter(i => i.id !== opt.id));
                                                        } else {
                                                            setSort(s => [...s, { id: opt.id, desc: false }]);
                                                        }
                                                    }}
                                                >
                                                    <div
                                                        className="h-5 w-5 flex items-center justify-center rounded hover:bg-zinc-200 transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (isSelected) {
                                                                setSort(s => s.map(i => i.id === opt.id ? { ...i, desc: !i.desc } : i));
                                                            } else {
                                                                setSort(s => [...s, { id: opt.id, desc: false }]);
                                                            }
                                                        }}
                                                    >
                                                        {isSelected && currentSort &&
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div className="flex flex-col items-center -space-y-1">
                                                                        <ChevronUp
                                                                            className={`h-3.5 w-3.5 ${currentSort.desc
                                                                                ? 'text-zinc-800'
                                                                                : 'text-zinc-300'
                                                                                }`}
                                                                        />
                                                                        <ChevronDown
                                                                            className={`h-3.5 w-3.5 ${currentSort.desc
                                                                                ? 'text-zinc-300'
                                                                                : 'text-zinc-800'
                                                                                }`}
                                                                        />
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top">
                                                                    {currentSort.desc ? "Descending" : "Ascending"}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        }
                                                    </div>
                                                    <span className="flex-1">{opt.label}</span>
                                                    {isSelected && <Check className="h-3.5 w-3.5 text-zinc-900" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Popover open={filtersPanelOpen} onOpenChange={(open) => {
                                setFiltersPanelOpen(open);
                                if (open === false) setSavedFiltersPanelOpen(false);
                                if (open === true) {
                                    setSortPanelOpen(false);
                                    setCustomizePanelOpen(false);
                                    setFieldsPanelOpen(false);
                                    setAssigneesPanelOpen(false);
                                }
                            }}>
                                <PopoverTrigger asChild>
                                    <div className="relative group/filter inline-flex">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className={cn(
                                                        "h-8 text-xs font-medium pr-7 bg-white hover:bg-zinc-100 shadow-none",
                                                        filtersPanelOpen ? "text-violet-700 border-violet-200" : "text-zinc-700 border-zinc-200",
                                                        appliedFilterCount > 0 && "border-violet-200 text-violet-700"
                                                    )}
                                                    onClick={() => { if (!filtersPanelOpen && filterGroups.conditions.length === 0) { addFilterGroup(); } }}
                                                >
                                                    <Filter className="h-3.5 w-3.5" />
                                                    <span className="hidden sm:inline ml-1">
                                                        {appliedFilterCount > 0 ? `${appliedFilterCount} Filter${appliedFilterCount !== 1 ? "s" : ""}` : "Filter"}
                                                    </span>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom">Filter tasks</TooltipContent>
                                        </Tooltip>
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
                                        className={cn("h-8 text-xs font-medium bg-white hover:bg-zinc-100 shadow-none", assigneesPanelOpen ? "text-violet-700 border-violet-200" : "text-zinc-700 border-zinc-200")}
                                        onClick={() => { setAssigneesPanelOpen(!assigneesPanelOpen); setFieldsPanelOpen(false); setFiltersPanelOpen(false); }}
                                    >
                                        <Users className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline ml-1">Assignee</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Filter by assignee</TooltipContent>
                            </Tooltip>

                            <div ref={toolbarSearchContainerRef} className="hidden sm:block">
                                {isToolbarSearchOpen ? (
                                    <div className="w-56 min-w-[12rem]">
                                        <div className="flex items-center h-8 rounded-lg border border-zinc-200 bg-zinc-50/50 px-2">
                                            <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                                            <Input
                                                ref={toolbarSearchInputRef}
                                                variant="ghost"
                                                className="h-full px-2 text-sm border-0 bg-transparent shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0"
                                                placeholder="Search..."
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Escape") {
                                                        setIsToolbarSearchOpen(false);
                                                    }
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
                                                className="h-8 w-8 p-0 text-zinc-700 bg-white hover:bg-zinc-100 border-zinc-200 shadow-none"
                                                onClick={() => setIsToolbarSearchOpen(true)}
                                                title="Search"
                                            >
                                                <Search className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">Search tasks</TooltipContent>
                                    </Tooltip>
                                )}
                            </div>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-100 border-zinc-200 shadow-none"
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

                            <TaskCreationModal
                                context={spaceId ? "SPACE" : projectId ? "PROJECT" : "GENERAL"}
                                contextId={spaceId || projectId}
                                workspaceId={resolvedWorkspaceId}
                                users={users}
                                lists={[]}
                                defaultListId={listId}
                                availableStatuses={statuses}
                                open={addTaskModalOpen}
                                onOpenChange={setAddTaskModalOpen}
                                trigger={<span className="sr-only" />}
                            />
                        </div>
                    </div>
                </>
            </div>

            {/* Board Content */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <ScrollArea className="flex-1 w-full !overflow-y-hidden min-h-0">
                    <div className="flex gap-6 p-6 h-full w-max min-w-full items-start">
                        {/* Columns in original order - collapsed badges stay in their position */}
                        {displayColumns.map((col, idx) => {
                            if (col.isCollapsed && groupedRunFirstColumnId) {
                                const runStartIdx = displayColumns.findIndex(c => c.id === groupedRunFirstColumnId);
                                const runCount = runStartIdx >= 0 ? getGroupedRunCount(groupedRunFirstColumnId) : 0;
                                const runEndIdx = runStartIdx + runCount - 1;
                                const isInGroupedRun = runStartIdx >= 0 && idx >= runStartIdx && idx <= runEndIdx;
                                const isFirstInGroupedRun = idx === runStartIdx;
                                if (isInGroupedRun && !isFirstInGroupedRun) return null;
                                if (isFirstInGroupedRun) {
                                    return (
                                        <div key={`grouped-${col.id}`} className="shrink-0 flex flex-col items-center gap-2">
                                            <button
                                                onClick={handleUngroupCollapsed}
                                                className="shrink-0 flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-xl bg-zinc-100 border border-zinc-300 text-zinc-600 hover:bg-zinc-200 transition-colors min-h-[72px]"
                                            >
                                                <ChevronsRight className="h-4 w-4 shrink-0" />
                                                <span
                                                    className="text-[14px] font-medium"
                                                    style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
                                                >
                                                    {runCount} collapsed
                                                </span>
                                            </button>
                                        </div>
                                    );
                                }
                            }
                            if (col.isCollapsed) {
                                return (
                                    <div key={col.id} className="shrink-0 flex flex-col items-center gap-2">
                                        <BoardColumn
                                            column={col}
                                            allTasks={tasks}
                                            settings={settings}
                                            onAddTask={handleAddTask}
                                            onToggleCollapse={handleToggleCollapse}
                                            onArchiveAll={(id) => setArchiveColumnId(id)}
                                            onTaskSelect={openTaskDetail}
                                            spaceId={spaceId}
                                            projectId={projectId}
                                            workspaceId={resolvedWorkspaceId}
                                            listId={listId}
                                            users={users}
                                            lists={lists}
                                            allAvailableStatuses={statuses}
                                            onTaskDelete={handleTaskDelete}
                                            onTaskUpdate={handleTaskUpdate}
                                            inlineAddColumnId={inlineAddColumnId}
                                            inlineAddTaskId={inlineAddTaskId}
                                            inlineAddTitle={inlineAddTitle}
                                            inlineAddAssigneeIds={inlineAddAssigneeIds}
                                            inlineAddStartDate={inlineAddStartDate}
                                            inlineAddDueDate={inlineAddDueDate}
                                            inlineAddPriority={inlineAddPriority}
                                            inlineAddTags={inlineAddTags}
                                            onInlineTitleChange={setInlineAddTitle}
                                            onInlineAssigneeChange={setInlineAddAssigneeIds}
                                            onInlineStartDateChange={setInlineAddStartDate}
                                            onInlineDueDateChange={setInlineAddDueDate}
                                            onInlinePriorityChange={setInlineAddPriority}
                                            onInlineTagsChange={setInlineAddTags}
                                            onSaveInline={handleSaveInlineTask}
                                            onCancelInline={handleCancelInlineAdd}
                                            inlineAddTaskType={inlineAddTaskType ?? undefined}
                                            onInlineTaskTypeChange={setInlineAddTaskType}
                                            selectedTasks={selectedTasks}
                                            onSelectTask={handleSelectTask}
                                            onSelectAllInColumn={handleSelectAllInColumn}
                                            expandedParents={expandedParents}
                                            onToggleExpand={handleToggleExpand}
                                            allAvailableTags={allAvailableTags}
                                            availableTaskTypes={availableTaskTypes}
                                            agents={agents}
                                            isDragActive={!!activeId}
                                        />
                                        {!groupedRunFirstColumnId && isFirstInRunOfConsecutiveCollapsed(idx) && (
                                            <button
                                                onClick={() => handleGroupCollapsed(col.id)}
                                                className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-300 text-zinc-600 hover:bg-zinc-200 transition-colors"
                                                title="Collapse into single pill"
                                            >
                                                <ChevronsLeft className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                );
                            }
                            return (
                                <BoardColumn
                                    key={col.id}
                                    column={col}
                                    allTasks={tasks}
                                    settings={settings}
                                    onAddTask={handleAddTask}
                                    onToggleCollapse={handleToggleCollapse}
                                    onArchiveAll={(id) => setArchiveColumnId(id)}
                                    onTaskSelect={openTaskDetail}
                                    spaceId={spaceId}
                                    projectId={projectId}
                                    workspaceId={resolvedWorkspaceId}
                                    listId={listId}
                                    users={users}
                                    lists={lists}
                                    allAvailableStatuses={statuses}
                                    onTaskDelete={handleTaskDelete}
                                    onTaskUpdate={handleTaskUpdate}
                                    inlineAddColumnId={inlineAddColumnId}
                                    inlineAddTaskId={inlineAddTaskId}
                                    inlineAddTitle={inlineAddTitle}
                                    inlineAddAssigneeIds={inlineAddAssigneeIds}
                                    inlineAddStartDate={inlineAddStartDate}
                                    inlineAddDueDate={inlineAddDueDate}
                                    inlineAddPriority={inlineAddPriority}
                                    inlineAddTags={inlineAddTags}
                                    onInlineTitleChange={setInlineAddTitle}
                                    onInlineAssigneeChange={setInlineAddAssigneeIds}
                                    onInlineStartDateChange={setInlineAddStartDate}
                                    onInlineDueDateChange={setInlineAddDueDate}
                                    onInlinePriorityChange={setInlineAddPriority}
                                    onInlineTagsChange={setInlineAddTags}
                                    onSaveInline={handleSaveInlineTask}
                                    onCancelInline={handleCancelInlineAdd}
                                    inlineAddTaskType={inlineAddTaskType ?? undefined}
                                    onInlineTaskTypeChange={setInlineAddTaskType}
                                    selectedTasks={selectedTasks}
                                    onSelectTask={handleSelectTask}
                                    onSelectAllInColumn={handleSelectAllInColumn}
                                    expandedParents={expandedParents}
                                    onToggleExpand={handleToggleExpand}
                                    allAvailableTags={allAvailableTags}
                                    availableTaskTypes={availableTaskTypes}
                                    agents={agents}
                                    isDragActive={!!activeId}
                                />
                            );
                        })}

                        {/* Add group Button */}
                        <div className="w-40 shrink-0 flex items-center">
                            <Button
                                variant="ghost"
                                className="justify-start text-zinc-600 hover:text-zinc-900 hover:bg-transparent px-0 h-auto font-medium"
                            >
                                <Plus className="h-4 w-4 mr-2 text-zinc-500" />
                                Add group
                            </Button>
                        </div>
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>

                <DragOverlay>
                    {activeTask ? (
                        <BoardTaskCard
                            task={activeTask}
                            allTasks={tasks}
                            isOverlay
                            spaceId={spaceId}
                            projectId={projectId}
                            workspaceId={resolvedWorkspaceId}
                            listId={listId}
                            cardSize={settings.cardSize}
                            cardCover={settings.cardCover}
                            showSubtasks={settings.showSubtasks}
                            showCustomFields={settings.showCustomFields}
                            stackFields={settings.stackFields}
                            onTaskSelect={openTaskDetail}
                            users={users}
                            lists={lists}
                            allAvailableStatuses={statuses}
                            availableTaskTypes={availableTaskTypes}
                            agents={agents}
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Create field modal */}
            {
                createFieldModalOpen && (
                    <>
                        <div className="absolute inset-0 bg-black/20 z-[60]" onClick={() => { setCreateFieldModalOpen(false); setCreateFieldSearch(""); }} aria-hidden />
                        <div className="absolute right-0 bottom-0 top-0 w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-[70] flex flex-col">
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
                                                console.log("Create field type:", f.type, f.label);
                                                setCreateFieldModalOpen(false);
                                            }}>
                                                {typeof IconComponent === "function"
                                                    ? <IconComponent className="h-4 w-4 text-zinc-400 shrink-0" />
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
                        </div>
                    </>
                )
            }

            {/* Fields panel */}
            {
                fieldsPanelOpen && !createFieldModalOpen && (
                    <>
                        <div className="absolute inset-0 bg-black/20 z-40" onClick={() => setFieldsPanelOpen(false)} aria-hidden />
                        <div className="absolute right-0 bottom-0 top-0 w-[360px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col">
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
                                    {STANDARD_FIELD_CONFIG.filter(f => settings.visibleFields.includes(f.id) && (!fieldsSearch.trim() || f.label.toLowerCase().includes(fieldsSearch.toLowerCase()))).map(f => (
                                        <div key={f.id} className="flex items-center gap-2 py-2 px-2 rounded hover:bg-zinc-50">
                                            <GripVertical className="h-4 w-4 text-zinc-300 shrink-0 cursor-grab" />
                                            <span className="text-sm text-zinc-800 flex-1">{f.label}</span>
                                            <Switch checked onCheckedChange={() => toggleColumn(f.id)} />
                                        </div>
                                    ))}
                                    {STANDARD_FIELD_CONFIG.filter(f => settings.visibleFields.includes(f.id)).length > 0 && (
                                        <button type="button" className="text-xs text-violet-600 hover:underline" onClick={() => setSettings(s => ({ ...s, visibleFields: [] }))}>Hide all</button>
                                    )}
                                </div>
                                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Popular</p>
                                <div className="space-y-1">
                                    {STANDARD_FIELD_CONFIG.filter(f => !settings.visibleFields.includes(f.id) && (!fieldsSearch.trim() || f.label.toLowerCase().includes(fieldsSearch.toLowerCase()))).map(f => (
                                        <div key={f.id} className="flex items-center justify-between py-2 px-2 rounded hover:bg-zinc-50">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-zinc-800">{f.label}</span>
                                            </div>
                                            <Switch checked={false} onCheckedChange={() => toggleColumn(f.id)} />
                                        </div>
                                    ))}
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
                        </div>
                    </>
                )
            }

            {/* Customize view panel (ClickUp-style) */}
            {
                customizePanelOpen && (
                    <SidePanel
                        open={customizePanelOpen && !layoutOptionsOpen}
                        onClose={() => setCustomizePanelOpen(false)}
                        className="absolute bottom-0 right-0 h-full w-[300px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col text-[13px] text-zinc-900"
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                            <h3 className="font-semibold">Customize view</h3>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCustomizePanelOpen(false)}><X className="h-4 w-4" /></Button>
                        </div>
                        <ScrollArea className="flex-1 min-h-0">
                            <div className="p-2 space-y-1">
                                <div className="flex items-center gap-2 px-2 py-1 mb-2">
                                    <div className="flex items-center justify-center h-6 w-6 rounded bg-zinc-100 shrink-0">
                                        <LayoutList className="h-3.5 w-3.5 text-zinc-500" />
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
                                        className="h-7 text-sm font-medium border-none shadow-none focus-visible:ring-0 px-0"
                                        placeholder="Board"
                                    />
                                </div>

                                {/* Card Size Dropdown */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <div className="flex items-center justify-between py-1.5 px-2 hover:bg-zinc-50 rounded cursor-pointer group">
                                            <span>Card size</span>
                                            <div className="flex items-center gap-1 text-zinc-500">
                                                <span className="text-xs">{settings.cardSize === "compact" ? "Small" : settings.cardSize === "comfortable" ? "Large" : "Medium"}</span>
                                                <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                                            </div>
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent side="left" align="start" className="w-48 p-1" sideOffset={10}>
                                        <div className="space-y-0.5">
                                            <div
                                                className="flex items-center justify-between px-2 py-1.5 hover:bg-zinc-50 rounded cursor-pointer text-sm"
                                                onClick={() => { setSettings(s => ({ ...s, cardSize: "compact" })); }}
                                            >
                                                <span>Small</span>
                                                {settings.cardSize === "compact" && <Check className="h-3.5 w-3.5" />}
                                            </div>
                                            <div
                                                className="flex items-center justify-between px-2 py-1.5 hover:bg-zinc-50 rounded cursor-pointer text-sm"
                                                onClick={() => { setSettings(s => ({ ...s, cardSize: "default" })); }}
                                            >
                                                <span>Medium (default)</span>
                                                {settings.cardSize === "default" && <Check className="h-3.5 w-3.5" />}
                                            </div>
                                            <div
                                                className="flex items-center justify-between px-2 py-1.5 hover:bg-zinc-50 rounded cursor-pointer text-sm"
                                                onClick={() => { setSettings(s => ({ ...s, cardSize: "comfortable" })); }}
                                            >
                                                <span>Large</span>
                                                {settings.cardSize === "comfortable" && <Check className="h-3.5 w-3.5" />}
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                {/* Card Cover Dropdown */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <div className="flex items-center justify-between py-1.5 px-2 hover:bg-zinc-50 rounded cursor-pointer group">
                                            <span>Card cover</span>
                                            <div className="flex items-center gap-1 text-zinc-500">
                                                <span className="text-xs">{settings.showCover ? "Image" : "None"}</span>
                                                <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                                            </div>
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent side="left" align="start" className="w-48 p-1" sideOffset={10}>
                                        <div className="space-y-0.5">
                                            <div
                                                className="flex items-center justify-between px-2 py-1.5 hover:bg-zinc-50 rounded cursor-pointer text-sm"
                                                onClick={() => { setSettings(s => ({ ...s, cardCover: "none" })); }}
                                            >
                                                <span>None (default)</span>
                                                {settings.cardCover === "none" && <Check className="h-3.5 w-3.5" />}
                                            </div>
                                            <div
                                                className="flex items-center justify-between px-2 py-1.5 hover:bg-zinc-50 rounded cursor-pointer text-sm"
                                                onClick={() => { setSettings(s => ({ ...s, cardCover: "image" })); }}
                                            >
                                                <span>Image</span>
                                                {settings.cardCover === "image" && <Check className="h-3.5 w-3.5" />}
                                            </div>
                                            <div
                                                className="flex items-center justify-between px-2 py-1.5 hover:bg-zinc-50 rounded cursor-pointer text-sm"
                                                onClick={() => { setSettings(s => ({ ...s, cardCover: "description" })); }}
                                            >
                                                <span>Task description</span>
                                                {settings.cardCover === "description" && <Check className="h-3.5 w-3.5" />}
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                <div className="flex items-center justify-between py-1.5 px-2 hover:bg-zinc-50 rounded">
                                    <span>Stack fields</span>
                                    <Switch className="h-4 w-7" checked={settings.stackFields} onCheckedChange={(v) => setSettings({ ...settings, stackFields: v })} />
                                </div>
                                <div className="flex items-center justify-between py-1.5 px-2 hover:bg-zinc-50 rounded">
                                    <span>Show empty fields</span>
                                    <Switch className="h-4 w-7" checked={settings.showCustomFields} onCheckedChange={(v) => setSettings({ ...settings, showCustomFields: v })} />
                                </div>
                                <div className="flex items-center justify-between py-1.5 px-2 hover:bg-zinc-50 rounded">
                                    <span>Collapse empty columns</span>
                                    <Switch className="h-4 w-7" checked={!settings.showEmptyColumns} onCheckedChange={(v) => setSettings({ ...settings, showEmptyColumns: !v })} />
                                </div>

                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between py-1.5 px-2 hover:bg-zinc-50 rounded cursor-pointer text-inherit"
                                    onClick={() => { setLayoutOptionsOpen(true); setCustomizePanelOpen(false); }}
                                >
                                    <span>More options</span>
                                    <ChevronRight className="h-3 w-3 text-zinc-400" />
                                </button>

                                <div className="h-px bg-zinc-100 my-2" />

                                {/* Fields */}
                                <div
                                    className="flex items-center justify-between py-1.5 px-2 hover:bg-zinc-50 rounded cursor-pointer group"
                                    onClick={() => { setFieldsPanelOpen(true); setCustomizePanelOpen(false); }}
                                >
                                    <div className="flex items-center gap-2">
                                        <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500" />
                                        <span>Fields</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-zinc-500">
                                        <span className="text-xs">{settings.visibleFields.length} shown</span>
                                        <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                                    </div>
                                </div>

                                {/* Filter */}
                                <Popover open={filtersPanelOpen} onOpenChange={setFiltersPanelOpen}>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2"
                                            onClick={() => { if (filterGroups.conditions.length === 0) { addFilterGroup(); } }}
                                        >
                                            <span className="flex items-center gap-2"><Filter className="h-4 w-4 text-zinc-400" />Filter</span>
                                            <span className="text-xs text-zinc-500">{appliedFilterCount > 0 ? `${appliedFilterCount} applied` : "None"} <ChevronRight className="inline h-3 w-3 ml-1" /></span>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent side="left" align="start" className="w-[600px] max-w-[90vw] p-0 overflow-hidden shadow-2xl rounded-2xl border border-zinc-200/80" sideOffset={16}>
                                        {renderFilterContent({ onClose: () => setFiltersPanelOpen(false) })}
                                    </PopoverContent>
                                </Popover>

                                {/* Group */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <div
                                            className="flex items-center justify-between py-1.5 px-2 hover:bg-zinc-50 rounded cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <LayoutList className="h-3.5 w-3.5 text-zinc-500" />
                                                <span>Group</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-zinc-500">
                                                <span className="text-xs">{
                                                    groupBy === "status" ? "Status" :
                                                        groupBy === "assignee" ? "Assignee" :
                                                            groupBy === "priority" ? "Priority" :
                                                                groupBy === "dueDate" ? "Due Date" :
                                                                    groupBy === "tags" ? "Tags" :
                                                                        groupBy === "taskType" ? "Task Type" : "None"
                                                }</span>
                                                <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                                            </div>
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent side="left" align="start" className="w-[240px] p-1.5 rounded-xl shadow-xl border-zinc-200/60" sideOffset={10}>
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
                                                <DropdownMenuItem
                                                    key={opt.id}
                                                    className={cn(
                                                        "flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors",
                                                        groupBy === opt.id ? "bg-violet-50 text-violet-700" : "text-zinc-600 hover:bg-zinc-100"
                                                    )}
                                                    onClick={() => setGroupBy(opt.id as any)}
                                                >
                                                    <opt.icon className={cn("h-4 w-4", groupBy === opt.id ? "text-violet-500" : "text-zinc-400")} />
                                                    <span className="flex-1">{opt.label}</span>
                                                    {groupBy === opt.id && <div className="h-1.5 w-1.5 rounded-full bg-violet-600" />}
                                                </DropdownMenuItem>
                                            ))}

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
                                                </>
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                {/* Sort By */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <div
                                            className="flex items-center justify-between py-1.5 px-2 hover:bg-zinc-50 rounded cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <ArrowUpDown className="h-3.5 w-3.5 text-zinc-500" />
                                                <span>Sort</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-zinc-500">
                                                {
                                                    sort.length === 0 ? "None" :
                                                        sort.map(s => {
                                                            const label = [
                                                                { id: "assignee", label: "Assignees" },
                                                                { id: "createdAt", label: "Date created" },
                                                                { id: "updatedAt", label: "Date updated" },
                                                                { id: "dateDone", label: "Date done" },
                                                                { id: "dateClosed", label: "Date closed" },
                                                                { id: "dueDate", label: "Due date" },
                                                                { id: "id", label: "Task ID" },
                                                                { id: "name", label: "Task Name" },
                                                                { id: "priority", label: "Priority" },
                                                                { id: "startDate", label: "Start date" },
                                                                { id: "status", label: "Status" },
                                                            ].find(opt => opt.id === s.id)?.label || s.id;
                                                            return label;
                                                        }).join(" / ")
                                                }
                                                <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                                            </div>
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent side="left" align="start" className="w-[240px] p-1.5 rounded-xl shadow-xl border-zinc-200/60" sideOffset={10}>
                                        <div className="px-2 py-1.5">
                                            <span className="text-xs font-medium text-zinc-400 tracking-widest">Sort By</span>
                                        </div>
                                        <div className="px-1 mb-2.5">
                                            <div className="relative border border-zinc-300 rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-violet-500 focus-within:border-violet-500">
                                                <input
                                                    type="text"
                                                    placeholder="Search..."
                                                    value={sortSearchQuery}
                                                    onChange={(e) => setSortSearchQuery(e.target.value)}
                                                    className="w-full text-sm pl-2 pr-2 py-1.5 outline-none placeholder:text-zinc-400"
                                                />
                                            </div>
                                        </div>
                                        <div className="h-px bg-zinc-100" />
                                        <ScrollArea className="h-[280px] py-3">
                                            <div className="space-y-0.5 px-1">
                                                {[
                                                    { id: "assignee", label: "Assignees" },
                                                    { id: "createdAt", label: "Date created" },
                                                    { id: "updatedAt", label: "Date updated" },
                                                    { id: "dateDone", label: "Date done" },
                                                    { id: "dateClosed", label: "Date closed" },
                                                    { id: "dueDate", label: "Due date" },
                                                    { id: "id", label: "Task ID" },
                                                    { id: "name", label: "Task Name" },
                                                    { id: "priority", label: "Priority" },
                                                    { id: "startDate", label: "Start date" },
                                                    { id: "status", label: "Status" },
                                                ]
                                                    .filter(opt => opt.label.toLowerCase().includes(sortSearchQuery.toLowerCase()))
                                                    .map((opt) => {
                                                        const currentSortIndex = sort.findIndex(s => s.id === opt.id);
                                                        const isSelected = currentSortIndex >= 0;
                                                        const currentSort = isSelected ? sort[currentSortIndex] : null;

                                                        return (
                                                            <div
                                                                key={opt.id}
                                                                className="flex items-center justify-between px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors group/item text-zinc-700 bg-white hover:bg-zinc-100"
                                                                onClick={() => {
                                                                    if (isSelected) {
                                                                        setSort([]);
                                                                    } else {
                                                                        setSort([{ id: opt.id, desc: false }]);
                                                                    }
                                                                }}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    {isSelected && currentSort && (
                                                                        <div
                                                                            className="flex flex-col items-center justify-center h-[18px] w-[18px] bg-zinc-100 rounded hover:bg-zinc-200 transition-colors"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSort([{ id: opt.id, desc: !currentSort.desc }]);
                                                                            }}
                                                                        >
                                                                            <div className="flex flex-col items-center -space-y-1">
                                                                                <ChevronUp
                                                                                    className={`h-[14px] w-[14px] ${currentSort.desc
                                                                                        ? 'text-violet-300'
                                                                                        : 'text-violet-500'
                                                                                        }`}
                                                                                />
                                                                                <ChevronDown
                                                                                    className={`h-[14px] w-[14px] ${currentSort.desc
                                                                                        ? 'text-violet-500'
                                                                                        : 'text-violet-300'
                                                                                        }`}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    <span>{opt.label}</span>
                                                                </div>
                                                                {isSelected && <Check className="h-4 w-4 text-violet-600" />}
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </ScrollArea>
                                    </PopoverContent>
                                </Popover>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2"
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
                                                    displayTasks.forEach((t: Task) => {
                                                        if (hasSubtasks(t, displayTasks as Task[])) next.add(t.id);
                                                    });
                                                    setExpandedParents(next);
                                                }}
                                            >
                                                Expanded
                                            </button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <div className="h-px bg-zinc-100 my-2" />

                                <div className="space-y-1">
                                    <div className="flex items-center justify-between py-1.5 px-2 hover:bg-zinc-50 rounded">
                                        <div className="flex items-center gap-2">
                                            <Save className="h-3.5 w-3.5 text-zinc-400" />
                                            <span>Autosave for me</span>
                                        </div>
                                        <Switch className="h-4 w-7" checked={viewAutosave} onCheckedChange={handleToggleAutosave} />
                                    </div>
                                    <div className="flex items-center justify-between py-1.5 px-2 hover:bg-zinc-50 rounded">
                                        <div className="flex items-center gap-2">
                                            <Pin className="h-3.5 w-3.5 text-zinc-400" />
                                            <span>Pin view</span>
                                        </div>
                                        <Switch className="h-4 w-7" checked={pinView} onCheckedChange={(val) => { setPinView(val); updateViewProperty("isPinned", val); }} />
                                    </div>
                                    <div className="flex items-center justify-between py-1.5 px-2 hover:bg-zinc-50 rounded">
                                        <div className="flex items-center gap-2">
                                            <Lock className="h-3.5 w-3.5 text-zinc-400" />
                                            <span>Private view</span>
                                        </div>
                                        <Switch className="h-4 w-7" checked={privateView} onCheckedChange={(val) => { setPrivateView(val); updateViewProperty('isPrivate', val); }} />
                                    </div>
                                    <div className="flex items-center justify-between py-1.5 px-2 hover:bg-zinc-50 rounded">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
                                            <span>Protect view</span>
                                        </div>
                                        <Switch className="h-4 w-7" checked={protectView} onCheckedChange={(val) => { setProtectView(val); updateViewProperty('isLocked', val); }} />
                                    </div>
                                    <div className="flex items-center justify-between py-1.5 px-2 hover:bg-zinc-50 rounded">
                                        <div className="flex items-center gap-2">
                                            <Home className="h-3.5 w-3.5 text-zinc-400" />
                                            <span>Set as default view</span>
                                        </div>
                                        <Switch className="h-4 w-7" checked={defaultView} onCheckedChange={(val) => { setDefaultView(val); updateViewProperty('isDefault', val); }} />
                                    </div>
                                </div>

                                <div className="h-px bg-zinc-100 my-2" />

                                <div className="space-y-1">
                                    <button type="button" className="w-full flex items-center gap-2 py-1.5 px-2 text-zinc-800 hover:bg-zinc-50 rounded text-inherit" onClick={() => {
                                        const url = `${window.location.origin}${window.location.pathname}?v=${viewId}`;
                                        navigator.clipboard?.writeText(url);
                                        toast.success("Link copied to clipboard");
                                    }}>
                                        <Link className="h-3.5 w-3.5 text-zinc-400" />
                                        <span>Copy link to view</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="w-full flex items-center justify-between py-1.5 px-2 text-zinc-800 hover:bg-zinc-50 rounded text-inherit"
                                        onClick={() => setIsShareModalOpen(true)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Users className="h-3.5 w-3.5 text-zinc-400" />
                                            <span>Sharing & Permissions</span>
                                        </div>
                                        <ChevronRight className="h-3 w-3 text-zinc-400" />
                                    </button>
                                </div>
                            </div>
                        </ScrollArea>
                    </SidePanel>
                )
            }

            {

                layoutOptionsOpen && (
                    <SidePanel
                        open={layoutOptionsOpen}
                        onClose={() => { setLayoutOptionsOpen(false); setCustomizePanelOpen(false); }}
                        className="absolute bottom-0 right-0 h-full w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col"
                    >
                        <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                            <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1 cursor-pointer" onClick={() => { setLayoutOptionsOpen(false); setCustomizePanelOpen(true); }}>
                                <ArrowRight className="h-4 w-4 rotate-180" />
                            </Button>
                            <h3 className="font-semibold text-zinc-900">Layout options</h3>
                            <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={() => { setLayoutOptionsOpen(false); setCustomizePanelOpen(false); }}><X className="h-4 w-4" /></Button>
                        </div>
                        <ScrollArea className="flex-1 min-h-0">
                            <div className="p-3 space-y-4 pb-24">
                                {/* Page & card layout section */}
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Page & card layout</p>

                                    {/* Card Size */}
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <div className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded cursor-pointer group">
                                                <span className="text-sm text-zinc-800">Card size</span>
                                                <div className="flex items-center gap-1.5 text-zinc-500">
                                                    <span className="text-xs">{settings.cardSize === "compact" ? "Small" : settings.cardSize === "comfortable" ? "Large" : "Medium"}</span>
                                                    <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent side="left" align="start" className="w-52 p-1.5" sideOffset={12}>
                                            <div className="space-y-0.5">
                                                <div
                                                    className="flex items-center justify-between px-2.5 py-2 hover:bg-zinc-50 rounded cursor-pointer text-sm"
                                                    onClick={() => { setSettings(s => ({ ...s, cardSize: "compact" })); }}
                                                >
                                                    <span>Small</span>
                                                    {settings.cardSize === "compact" && <Check className="h-4 w-4 text-violet-600" />}
                                                </div>
                                                <div
                                                    className="flex items-center justify-between px-2.5 py-2 hover:bg-zinc-50 rounded cursor-pointer text-sm"
                                                    onClick={() => { setSettings(s => ({ ...s, cardSize: "default" })); }}
                                                >
                                                    <span>Medium (default)</span>
                                                    {settings.cardSize === "default" && <Check className="h-4 w-4 text-violet-600" />}
                                                </div>
                                                <div
                                                    className="flex items-center justify-between px-2.5 py-2 hover:bg-zinc-50 rounded cursor-pointer text-sm"
                                                    onClick={() => { setSettings(s => ({ ...s, cardSize: "comfortable" })); }}
                                                >
                                                    <span>Large</span>
                                                    {settings.cardSize === "comfortable" && <Check className="h-4 w-4 text-violet-600" />}
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>

                                    {/* Card Cover */}
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <div className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded cursor-pointer group">
                                                <span className="text-sm text-zinc-800">Card cover</span>
                                                <div className="flex items-center gap-1.5 text-zinc-500">
                                                    <span className="text-xs">{settings.showCover ? "Image" : "None"}</span>
                                                    <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent side="left" align="start" className="w-52 p-1.5" sideOffset={12}>
                                            <div className="space-y-0.5">
                                                <div
                                                    className="flex items-center justify-between px-2.5 py-2 hover:bg-zinc-50 rounded cursor-pointer text-sm"
                                                    onClick={() => { setSettings(s => ({ ...s, showCover: true })); }}
                                                >
                                                    <span>Image</span>
                                                    {settings.showCover && <Check className="h-4 w-4 text-violet-600" />}
                                                </div>
                                                <div
                                                    className="flex items-center justify-between px-2.5 py-2 hover:bg-zinc-50 rounded cursor-pointer text-sm"
                                                    onClick={() => { setSettings(s => ({ ...s, showCover: false })); }}
                                                >
                                                    <span>None</span>
                                                    {!settings.showCover && <Check className="h-4 w-4 text-violet-600" />}
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>

                                    <div className="flex items-center justify-between py-1 px-2">
                                        <span className="text-sm text-zinc-800">Stack fields</span>
                                        <Switch checked={settings.stackFields} onCheckedChange={(v) => setSettings({ ...settings, stackFields: v })} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2">
                                        <span className="text-sm text-zinc-800">Show task properties</span>
                                        <Switch checked={settings.showTaskProperties} onCheckedChange={(v) => setSettings({ ...settings, showTaskProperties: v })} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2">
                                        <span className="text-sm text-zinc-800">Show empty fields</span>
                                        <Switch checked={settings.showCustomFields} onCheckedChange={(v) => setSettings({ ...settings, showCustomFields: v })} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2">
                                        <span className="text-sm text-zinc-800">Show task locations</span>
                                        <Switch checked={settings.showTaskLocations} onCheckedChange={(v) => setSettings({ ...settings, showTaskLocations: v })} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2">
                                        <span className="text-sm text-zinc-800">Show subtask parent names</span>
                                        <Switch checked={settings.showSubtaskParentNames} onCheckedChange={(v) => setSettings({ ...settings, showSubtaskParentNames: v })} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2">
                                        <span className="text-sm text-zinc-800">Collapse empty columns</span>
                                        <Switch checked={!settings.showEmptyColumns} onCheckedChange={(v) => setSettings({ ...settings, showEmptyColumns: !v })} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2">
                                        <span className="text-sm text-zinc-800">Show column colors</span>
                                        <Switch checked={settings.showColumnColors} onCheckedChange={(v) => setSettings({ ...settings, showColumnColors: v })} />
                                    </div>
                                </div>

                                <div className="h-px bg-zinc-100" />

                                {/* Task visibility section */}
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

                                {/* View settings section */}
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">View settings</p>
                                    <div className="flex items-center justify-between py-1 px-2">
                                        <span className="text-sm flex items-center gap-2"><UserRound className="h-4 w-4 text-zinc-400" />Default to Me Mode</span>
                                        <Switch checked={defaultToMeMode} onCheckedChange={setDefaultToMeMode} />
                                    </div>
                                    <div className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded cursor-pointer group">
                                        <span className="text-sm flex items-center gap-2"><Copy className="h-4 w-4 text-zinc-400" />Duplicate view</span>
                                        <ChevronRight className="h-3.5 w-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                )
            }

            {/* Default view settings modal (matches ListView) */}
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
                                Page & card layout
                                <ChevronDown className="h-4 w-4" />
                            </h4>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-zinc-700">Card size</span>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 text-xs font-normal gap-2 text-zinc-700 hover:bg-zinc-50">
                                                {(defaultViewSettingsDraft as any).cardSize === "compact" ? "Small" : (defaultViewSettingsDraft as any).cardSize === "comfortable" ? "Large" : "Medium"}
                                                <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                            <DropdownMenuItem className="text-sm" onClick={() => setDefaultViewSettingsDraft({ ...defaultViewSettingsDraft, cardSize: "compact" })}>Small</DropdownMenuItem>
                                            <DropdownMenuItem className="text-sm" onClick={() => setDefaultViewSettingsDraft({ ...defaultViewSettingsDraft, cardSize: "default" })}>Medium</DropdownMenuItem>
                                            <DropdownMenuItem className="text-sm" onClick={() => setDefaultViewSettingsDraft({ ...defaultViewSettingsDraft, cardSize: "comfortable" })}>Large</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-zinc-700">Card cover</span>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 text-xs font-normal gap-2 text-zinc-700 hover:bg-zinc-50">
                                                {(defaultViewSettingsDraft as any).showCover === false ? "None" : "Image"}
                                                <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                            <DropdownMenuItem className="text-sm" onClick={() => setDefaultViewSettingsDraft({ ...defaultViewSettingsDraft, showCover: false })}>None</DropdownMenuItem>
                                            <DropdownMenuItem className="text-sm" onClick={() => setDefaultViewSettingsDraft({ ...defaultViewSettingsDraft, showCover: true })}>Image</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                {[
                                    { label: "Stack fields", key: "stackFields" as const },
                                    { label: "Show task properties", key: "showTaskProperties" as const },
                                    { label: "Show empty fields", key: "showEmptyColumns" as const },
                                    { label: "Show task locations", key: "showTaskLocations" as const },
                                    { label: "Show subtask parent names", key: "showSubtaskParentNames" as const },
                                    { label: "Collapse empty columns", key: "collapseEmptyColumns" as const },
                                    { label: "Show column colors", key: "showColumnColors" as const },
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
                                    { label: "Show closed subtasks", key: "showCompletedSubtasks" as const },
                                    { label: "Show tasks from other Lists", key: "showTasksFromOtherLists" as const },
                                    { label: "Show subtasks from other Lists", key: "showSubtasksFromOtherLists" as const },
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
                                        {defaultViewSettingsApplyTo === "NEW" ? "New views only" : defaultViewSettingsApplyTo === "REQUIRED" ? "Required views (and new views created)" : "All existing views (and new views created)"}
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


            {/* Assignees panel */}
            {
                assigneesPanelOpen && (
                    <>
                        <div className="absolute inset-0 bg-black/20 z-40" onClick={() => setAssigneesPanelOpen(false)} aria-hidden />
                        <div className="absolute top-0 right-0 h-full w-[320px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col">
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
                                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">People {users?.length || 0}</p>
                                <div className="space-y-1 mb-4">
                                    <label className="flex items-center gap-2 py-2 px-2 rounded hover:bg-zinc-50 cursor-pointer">
                                        <Checkbox
                                            checked={filters.assignees.includes("__unassigned__")}
                                            onCheckedChange={(checked) => {
                                                setFilters(prev => ({
                                                    ...prev,
                                                    assignees: checked
                                                        ? [...prev.assignees, "__unassigned__"]
                                                        : prev.assignees.filter(id => id !== "__unassigned__")
                                                }));
                                            }}
                                        />
                                        <span className="text-sm text-zinc-700">Unassigned</span>
                                    </label>
                                    {users
                                        .filter(u => !assigneesSearch.trim() || (u.name || "").toLowerCase().includes(assigneesSearch.toLowerCase()))
                                        .map((u: any) => (
                                            <label key={u.id} className="flex items-center gap-2 py-2 px-2 rounded hover:bg-zinc-50 cursor-pointer">
                                                <Checkbox
                                                    checked={filters.assignees.includes(u.id)}
                                                    onCheckedChange={(checked) => {
                                                        setFilters(prev => ({
                                                            ...prev,
                                                            assignees: checked ? [...prev.assignees, u.id] : prev.assignees.filter(id => id !== u.id)
                                                        }));
                                                    }}
                                                />
                                                <Avatar className="h-6 w-6"><AvatarImage src={u.image || undefined} /><AvatarFallback className="text-[9px]">{u.name?.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                                                <span className="text-sm text-zinc-700 truncate">{u.name}</span>
                                            </label>
                                        ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </>
                )
            }
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
            <TaskCreationModal
                context={spaceId ? "SPACE" : projectId ? "PROJECT" : "GENERAL"}
                contextId={spaceId || projectId}
                workspaceId={resolvedWorkspaceId}
                users={users}
                lists={lists}
                defaultListId={listId}
                availableStatuses={statuses}
                defaultParentId={creationParentId}
                open={addTaskModalOpen}
                onOpenChange={(open) => {
                    setAddTaskModalOpen(open);
                    if (!open) {
                        setCreationParentId(undefined);
                        setCreationStatusId(undefined);
                    }
                }}
                trigger={<span className="sr-only" />}
            />

            <Dialog open={!!archiveColumnId} onOpenChange={(open) => !open && setArchiveColumnId(null)}>
                <DialogTitle className="sr-only">Archive Column</DialogTitle>
                <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-none shadow-2xl rounded-[28px] bg-white [&>button]:hidden">
                    <div className="p-7 pb-6">
                        <div className="flex flex-col items-start gap-4">
                            <div className="w-12 h-12 rounded-[14px] border border-zinc-100 bg-white flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
                                <Archive className="h-5 w-5 text-zinc-700" />
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold text-zinc-900 tracking-tight">Archive</h3>
                                <div className="space-y-3">
                                    <p className="text-[15px] text-zinc-500 leading-snug">
                                        Archive tasks with status <span className="font-medium text-zinc-800 lowercase">{columns.find(c => c.id === archiveColumnId)?.title}</span>
                                    </p>
                                    <p className="text-[15px] text-zinc-400 leading-relaxed">
                                        Archiving a task removes it from view but allows you to restore it at any time. All tasks are preserved and are still searchable.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-5 pt-4 bg-white border-t border-zinc-100">
                        <Button
                            variant="outline"
                            onClick={() => setArchiveColumnId(null)}
                            className="flex-1 h-[52px] rounded-2xl border-zinc-200 text-[#606060] font-bold text-[16px] hover:bg-zinc-50 transition-colors shadow-none"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleArchiveTasks}
                            className="flex-1 bg-[#222222] hover:bg-black text-white h-[52px] rounded-2xl font-bold text-[16px] shadow-none transition-colors"
                        >
                            Archive
                        </Button>
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

            <Dialog open={bulkCustomFieldId !== null} onOpenChange={(open) => { if (!open) { setBulkCustomFieldId(null); setBulkCustomFieldDraftValue(null); } }}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Set {customFields.find(cf => cf.id === bulkCustomFieldId)?.name}</DialogTitle>
                        <DialogDescription>
                            Enter the value to apply to the {selectedTasks.length} selected tasks.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {(() => {
                            const field = customFields.find(cf => cf.id === bulkCustomFieldId);
                            if (!field) return null;
                            return (
                                <CustomFieldRenderer
                                    field={field}
                                    value={bulkCustomFieldDraftValue}
                                    onChange={setBulkCustomFieldDraftValue}
                                    disabled={updateTask.isPending}
                                    workspaceId={resolvedWorkspaceId}
                                    spaceId={spaceId}
                                    projectId={projectId}
                                    teamId={teamId}
                                    listId={listId}
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

            {
                selectedTasks.length > 0 && (
                    <div
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-4 py-2.5 bg-[#111111] text-white rounded-[24px] shadow-[0_25px_60px_rgba(0,0,0,0.4)] border border-white/10 w-max max-w-[98%] animate-in fade-in slide-in-from-bottom-6 duration-400 backdrop-blur-xl"
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
                                    {statuses.length === 0 ? (
                                        <p className="text-sm text-zinc-500 py-2">No statuses</p>
                                    ) : (
                                        <div className="space-y-1">
                                            {statuses.filter((s: any) => !bulkStatusSearch.trim() || (s.name || "").toLowerCase().includes(bulkStatusSearch.toLowerCase())).length === 0 ? (
                                                <p className="text-sm text-zinc-500 py-2">No matching statuses</p>
                                            ) : (
                                                <>
                                                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Not started</p>
                                                    {statuses.filter((s: any) => ((s.name?.toLowerCase().includes("todo") || s.name?.toLowerCase().includes("not")) && (!bulkStatusSearch.trim() || (s.name || "").toLowerCase().includes(bulkStatusSearch.toLowerCase())))).map((s: any) => (
                                                        <button key={s.id} type="button" className="w-full flex items-center gap-2 py-2 px-2 rounded hover:bg-zinc-100 text-left text-sm" onClick={async () => { for (const id of selectedTasks) { await updateTask.mutateAsync({ id, statusId: s.id }); } setBulkModal(null); }}>
                                                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color || "#9CA3AF" }} />
                                                            {s.name}
                                                        </button>
                                                    ))}
                                                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-2">Active</p>
                                                    {statuses.filter((s: any) => ((s.name?.toLowerCase().includes("progress") || s.name?.toLowerCase().includes("doing")) && (!bulkStatusSearch.trim() || (s.name || "").toLowerCase().includes(bulkStatusSearch.toLowerCase())))).map((s: any) => (
                                                        <button key={s.id} type="button" className="w-full flex items-center gap-2 py-2 px-2 rounded hover:bg-zinc-100 text-left text-sm" onClick={async () => { for (const id of selectedTasks) { await updateTask.mutateAsync({ id, statusId: s.id }); } setBulkModal(null); }}>
                                                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color || "#9CA3AF" }} />
                                                            {s.name}
                                                        </button>
                                                    ))}
                                                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-2">Closed</p>
                                                    {statuses.filter((s: any) => ((s.name?.toLowerCase().includes("complete") || s.name?.toLowerCase().includes("done")) && (!bulkStatusSearch.trim() || (s.name || "").toLowerCase().includes(bulkStatusSearch.toLowerCase())))).map((s: any) => (
                                                        <button key={s.id} type="button" className="w-full flex items-center gap-2 py-2 px-2 rounded hover:bg-zinc-100 text-left text-sm" onClick={async () => { for (const id of selectedTasks) { await updateTask.mutateAsync({ id, statusId: s.id }); } setBulkModal(null); }}>
                                                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color || "#9CA3AF" }} />
                                                            {s.name}
                                                        </button>
                                                    ))}
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
                                        return (
                                            <button key={cf.id} type="button" className="w-full flex items-center gap-2 py-2 px-3 hover:bg-zinc-50 text-left text-sm" onClick={() => setBulkCustomFieldId(cf.id)}>
                                                <LayoutList className="h-4 w-4 text-zinc-500" />
                                                {cf.name}
                                            </button>
                                        );
                                    })}
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
                )
            }
        </div >
    );
}

