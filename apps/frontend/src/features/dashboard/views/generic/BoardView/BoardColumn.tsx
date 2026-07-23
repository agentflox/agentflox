"use client";

import React from 'react';
import { memo } from 'react';
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
    ArrowDown, ArrowUp, ChevronUp, Bot, CircleSlash
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
                <AssigneeSelector
                    users={users}
                    agents={agents}
                    value={assigneeIds}
                    onChange={onAssigneeChange}
                    trigger={
                        <div className={cn("flex items-center gap-2.5 group cursor-pointer transition-colors", assigneeIds.length > 0 ? "text-zinc-700" : "text-zinc-400 hover:text-zinc-600")}>
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

                <Popover>
                    <PopoverTrigger asChild>
                        <div className={cn("flex items-center gap-2.5 group cursor-pointer transition-colors", dueDate ? "text-zinc-700" : "text-zinc-400 hover:text-zinc-600")}>
                            <Calendar className="h-5 w-5 opacity-80" />
                            <span className="text-[13px] font-medium tracking-tight">
                                {dueDate ? dueDate.toLocaleDateString() : "Add dates"}
                            </span>
                        </div>
                    </PopoverTrigger>
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
                    <DropdownMenuTrigger asChild>
                        <div className={cn("flex items-center gap-2.5 group cursor-pointer transition-colors", priority ? "text-zinc-700" : "text-zinc-400 hover:text-zinc-600")}>
                            <Flag className={cn("h-5 w-5 opacity-80 fill-current", priority === "URGENT" && "text-red-500 opacity-100", priority === "HIGH" && "text-orange-500 opacity-100", priority === "NORMAL" && "text-blue-500 opacity-100", priority === "LOW" && "text-zinc-400")} />
                            <span className="text-[13px] font-medium tracking-tight capitalize">
                                {priority ? priority.toLowerCase() : "Add priority"}
                            </span>
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuLabel className="text-xs">Priority</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onPriorityChange("URGENT")}>
                            <Flag className="h-3.5 w-3.5 mr-2 text-red-500 fill-current" /> Urgent
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onPriorityChange("HIGH")}>
                            <Flag className="h-3.5 w-3.5 mr-2 text-orange-500 fill-current" /> High
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onPriorityChange("NORMAL")}>
                            <Flag className="h-3.5 w-3.5 mr-2 text-blue-500 fill-current" /> Normal
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onPriorityChange("LOW")}>
                            <Flag className="h-3.5 w-3.5 mr-2 text-zinc-400 fill-current" /> Low
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onPriorityChange(null)}>
                            <CircleSlash className="h-3.5 w-3.5 mr-2 text-slate-500" /> Clear
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <TagsModal
                    tags={tags}
                    onChange={onTagsChange}
                    allAvailableTags={allAvailableTags}
                    trigger={
                        <div className={cn("flex items-center gap-2.5 group cursor-pointer transition-colors", tags && tags.length > 0 ? "text-zinc-700" : "text-zinc-400 hover:text-zinc-600")}>
                            <Tag className="h-5 w-5 opacity-80" />
                            <span className="text-[13px] font-medium tracking-tight">
                                {tags && tags.length > 0 ? `${tags.length} Tag${tags.length !== 1 ? 's' : ''}` : "Add tag"}
                            </span>
                        </div>
                    }
                />

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
                    <div className={cn("flex items-center gap-2.5 group cursor-pointer transition-colors", taskType ? "text-zinc-700" : "text-zinc-400 hover:text-zinc-600")}>
                        {(() => {
                            const selected = availableTaskTypes?.find(t => t.id === taskType);
                            return <TaskTypeIcon type={selected} className="h-4 w-4" />;
                        })()}
                        <span className="text-[13px] font-medium tracking-tight">
                            {availableTaskTypes?.find(t => t.id === taskType)?.name || defaultQuickAddTaskType?.name || "Task"}
                        </span>
                    </div>
                </TaskStatusPopover>
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

import { BoardTaskCard as TaskCard } from "./BoardTaskCard";


// Droppable slot below each task so "drop below" registers as insert-after
function DropSlotAfter({ taskId }: { taskId: string }) {
    const { setNodeRef } = useDroppable({ id: `after:${taskId}` });
    return <div ref={setNodeRef} className="min-h-[14px] -my-0.5 shrink-0" aria-hidden />;
}

// Column Component with WIP Limits
function BoardColumnInner({
    column,
    settings,
    onAddTask,
    onToggleCollapse,
    onArchiveAll,
    onTaskSelect,
    spaceId,
    projectId,
    workspaceId,
    listId,
    users,
    lists,
    allAvailableStatuses,
    onTaskDelete,
    onTaskUpdate,
    allTasks,
    selectedTasks = [],
    onSelectTask,
    onSelectAllInColumn,
    inlineAddColumnId,
    inlineAddTaskId,
    inlineAddTitle,
    inlineAddAssigneeIds,
    inlineAddStartDate,
    inlineAddDueDate,
    inlineAddPriority,
    inlineAddTags,
    onInlineTitleChange,
    onInlineAssigneeChange,
    onInlineStartDateChange,
    onInlineDueDateChange,
    onInlinePriorityChange,
    onInlineTagsChange,
    onSaveInline,
    onCancelInline,
    inlineAddTaskType,
    onInlineTaskTypeChange,
    expandedParents,
    onToggleExpand,
    allAvailableTags = [],
    availableTaskTypes = [],
    agents = [],
    isDragActive = false,
}: {
    column: Column;
    settings: BoardSettings;
    onAddTask: (columnId: string, parentId?: string) => void;
    onToggleCollapse: (columnId: string) => void;
    onArchiveAll?: (columnId: string) => void;
    onTaskSelect?: (taskId: string | null) => void;
    spaceId?: string;
    projectId?: string;
    workspaceId?: string;
    listId?: string;
    users?: any[];
    lists?: any[];
    allAvailableStatuses?: any[];
    onTaskDelete?: (id: string) => void | Promise<void>;
    onTaskUpdate?: (taskId: string, data: any) => void | Promise<void>;
    allTasks?: any[];
    selectedTasks?: string[];
    onSelectTask?: (taskId: string, selected: boolean) => void;
    onSelectAllInColumn?: (columnId: string) => void;
    inlineAddColumnId: string | null;
    inlineAddTaskId: string | null;
    inlineAddTitle: string;
    inlineAddAssigneeIds: string[];
    inlineAddStartDate: Date | null;
    inlineAddDueDate: Date | null;
    inlineAddPriority: string | null;
    inlineAddTags: string[];
    onInlineTitleChange: (v: string) => void;
    onInlineAssigneeChange: (ids: string[]) => void;
    onInlineStartDateChange: (date: Date | null) => void;
    onInlineDueDateChange: (date: Date | null) => void;
    onInlinePriorityChange: (p: string | null) => void;
    onInlineTagsChange: (ts: string[]) => void;
    onSaveInline: () => void;
    onCancelInline: () => void;
    inlineAddTaskType?: string;
    onInlineTaskTypeChange?: (v: string) => void;
    expandedParents?: Set<string>;
    onToggleExpand?: (taskId: string, expanded: boolean) => void;
    allAvailableTags?: string[];
    availableTaskTypes?: any[];
    agents?: any[];
    isDragActive?: boolean;
}) {
    const { setNodeRef } = useDroppable({
        id: column.id,
        data: { type: "COLUMN", column },
    });


    // Status Badge Color Handling
    // Default to gray, but try to match status colors if available
    const getStatusStyle = (title: string, color: string) => {
        const t = title.toUpperCase();
        if (t === "IN PROGRESS") return { bg: "bg-violet-600", text: "text-white" };
        if (t === "COMPLETE" || t === "DONE") return { bg: "bg-green-600", text: "text-white" };
        if (t === "TO DO" || t === "TODO") return { bg: "bg-zinc-500", text: "text-white" };

        // Fallback to the column color passed in if it looks like a hex code, or map text
        if (color.startsWith("#") || color.startsWith("rgb")) {
            return { bg: "bg-opacity-100", style: { backgroundColor: color }, text: "text-white" };
        }

        return { bg: "bg-zinc-500", text: "text-white" };
    };

    const statusStyle = getStatusStyle(column.title, column.color);

    const columnScrollRef = useRef<HTMLDivElement>(null);
    const cardRowEstimate =
        settings.cardSize === "compact" ? 58 : settings.cardSize === "comfortable" ? 92 : 76;

    const renderColumnItem = (item: (typeof column.items)[number]) => (
        <Fragment key={item.id}>
            <TaskCard
                task={item}
                spaceId={spaceId}
                projectId={projectId}
                workspaceId={workspaceId}
                listId={listId}
                cardSize={settings.cardSize}
                cardCover={settings.cardCover}
                showSubtasks={settings.showSubtasks}
                showCustomFields={settings.showCustomFields}
                stackFields={settings.stackFields}
                visibleFields={settings.visibleFields}
                showTaskLocations={settings.showTaskLocations}
                showSubtaskParentNames={settings.showSubtaskParentNames}
                onTaskSelect={onTaskSelect}
                users={users}
                lists={lists}
                allAvailableStatuses={allAvailableStatuses}
                onTaskDelete={onTaskDelete}
                onTaskUpdate={(data) => onTaskUpdate?.(item.id, data)}
                allTasks={allTasks}
                agents={agents}
                onAddSubtask={(parentId) => {
                    onAddTask(column.id, parentId);
                    onToggleExpand?.(parentId, true);
                }}
                inlineAddTaskId={inlineAddTaskId}
                inlineAddTitle={inlineAddTitle}
                inlineAddAssigneeIds={inlineAddAssigneeIds}
                inlineAddStartDate={inlineAddStartDate}
                inlineAddDueDate={inlineAddDueDate}
                inlineAddPriority={inlineAddPriority}
                inlineAddTags={inlineAddTags}
                onInlineTitleChange={onInlineTitleChange}
                onInlineAssigneeChange={onInlineAssigneeChange}
                onInlineStartDateChange={onInlineStartDateChange}
                onInlineDueDateChange={onInlineDueDateChange}
                onInlinePriorityChange={onInlinePriorityChange}
                onInlineTagsChange={onInlineTagsChange}
                onSaveInline={onSaveInline}
                onCancelInline={onCancelInline}
                level={0}
                isSelected={selectedTasks.includes(item.id)}
                onSelect={onSelectTask}
                expandedParents={expandedParents}
                onToggleExpand={onToggleExpand}
                taskType={inlineAddTaskType}
                onTaskTypeChange={onInlineTaskTypeChange}
                availableTaskTypes={availableTaskTypes}
            />
            <DropSlotAfter taskId={item.id} />
        </Fragment>
    );

    // Status icon for collapsed column (TO DO = dashed circle, IN PROGRESS = solid circle, COMPLETE = checkmark)
    const getCollapsedIcon = () => {
        const t = column.title.toUpperCase();
        if (t === "COMPLETE" || t === "DONE") {
            return <CheckCircle2 className="h-4 w-4 shrink-0" />;
        }
        if (t === "IN PROGRESS") {
            return <Circle className="h-4 w-4 shrink-0 fill-current" />;
        }
        return <Circle className="h-4 w-4 shrink-0 border-2 border-dashed border-current" />;
    };

    if (column.isCollapsed) {
        const t = column.title.toUpperCase();
        const isComplete = t === "COMPLETE" || t === "DONE";
        const isInProgress = t === "IN PROGRESS";
        const isTodo = t === "TO DO" || t === "TODO";
        const isStatusGroup = isComplete || isInProgress || isTodo;

        // TO DO / IN PROGRESS / COMPLETE: vertical badge with icon at top, vertical text, count below
        const badgeStyle = isStatusGroup
            ? isInProgress
                ? "bg-violet-600 text-white border-violet-600"
                : isComplete
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-zinc-100 text-zinc-600 border-zinc-300"
            : cn(statusStyle.bg, statusStyle.text, "border-transparent");
        return (
            <div className="shrink-0 flex flex-col items-center gap-2">
                <button
                    onClick={() => onToggleCollapse(column.id)}
                    className={cn(
                        "flex flex-col items-center justify-between gap-2 px-3 py-4 rounded-xl border transition-colors hover:opacity-90 min-h-[72px] cursor-pointer",
                        badgeStyle
                    )}
                    style={!isStatusGroup && statusStyle.style ? statusStyle.style : undefined}
                >
                    <div className="flex flex-col items-center gap-2">
                        <div className="shrink-0">{getCollapsedIcon()}</div>
                        <span
                            className="text-[11px] font-bold uppercase tracking-wide origin-center"
                            style={{ writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)" }}
                        >
                            {column.title}
                        </span>
                    </div>
                    <span className={cn(
                        "text-xs font-medium shrink-0",
                        (isComplete || isInProgress) ? "text-white" : ""
                    )}>
                        {column.items.length}
                    </span>
                </button>
            </div>
        );
    }

    const columnBg = settings.showColumnColors ? (column.color.startsWith("#") ? undefined : column.color.replace("bg-", "bg-").replace("-500", "-50/30").replace("-400", "-50/30").replace("-600", "-50/30")) : "";
    const columnStyle = settings.showColumnColors && column.color.startsWith("#") ? { backgroundColor: `${column.color}10` } : undefined;

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "w-[280px] shrink-0 flex flex-col h-full rounded-xl transition-all duration-300",
                settings.showColumnColors ? "p-3 border border-zinc-100/50 shadow-sm" : "rounded-none",
                columnBg
            )}
            style={columnStyle}
        >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3 pr-1 group">
                <div className="flex items-center gap-2">
                    <div
                        className={cn("px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wide shadow-sm", statusStyle.bg, statusStyle.text)}
                        style={statusStyle.style}
                    >
                        {column.title}
                    </div>
                    <span className="text-xs font-medium text-zinc-400">
                        {column.items.length}
                    </span>
                </div>

                <div className="flex items-center text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onToggleCollapse(column.id)}
                        className="p-1 hover:text-zinc-700 hover:bg-zinc-100 rounded cursor-pointer"
                        title="Collapse group"
                    >
                        <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                    </button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-1 hover:text-zinc-700 hover:bg-zinc-100 rounded cursor-pointer">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-xs font-normal text-zinc-500">Group options</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onToggleCollapse(column.id)}>
                                <ChevronRight className="h-3.5 w-3.5 mr-2 rotate-180" /> Collapse group
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onArchiveAll?.(column.id)}>
                                <Archive className="h-3.5 w-3.5 mr-2" /> Archive group
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onSelectAllInColumn?.(column.id)}>
                                <CheckCheck className="h-3.5 w-3.5 mr-2" /> Select all
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <button
                        onClick={() => onAddTask(column.id)}
                        className="p-1 hover:text-zinc-700 hover:bg-zinc-100 rounded cursor-pointer"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* Column Items */}
            <ScrollArea ref={columnScrollRef} className="-mr-2 pr-2 flex-1 min-h-0">
                <SortableContext
                    items={column.items.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="flex flex-col pb-32 min-h-full">
                        <VirtualizedDivRows
                            scrollRef={columnScrollRef}
                            rowCount={column.items.length}
                            estimateSize={cardRowEstimate}
                            enabled={!isDragActive}
                            renderRow={(i) => renderColumnItem(column.items[i])}
                        />
                        {inlineAddColumnId === column.id && !inlineAddTaskId && (
                            <QuickAddCard
                                title={inlineAddTitle}
                                onChange={onInlineTitleChange}
                                onSave={onSaveInline}
                                onCancel={onCancelInline}
                                users={users || []}
                                agents={agents}
                                assigneeIds={inlineAddAssigneeIds}
                                onAssigneeChange={onInlineAssigneeChange}
                                dueDate={inlineAddDueDate}
                                onDueDateChange={onInlineDueDateChange}
                                startDate={inlineAddStartDate}
                                onStartDateChange={onInlineStartDateChange}
                                priority={inlineAddPriority}
                                onPriorityChange={onInlinePriorityChange}
                                tags={inlineAddTags}
                                onTagsChange={onInlineTagsChange}
                                taskType={inlineAddTaskType}
                                onTaskTypeChange={onInlineTaskTypeChange as any}
                                allAvailableTags={allAvailableTags}
                                availableTaskTypes={availableTaskTypes}
                            />
                        )}
                        {/* Always keep Add Task directly below the last visible item (or top when empty). */}
                        <button
                            onClick={() => onAddTask(column.id)}
                            className="flex items-center gap-2 w-full text-left px-2 py-2 rounded-lg text-zinc-500 hover:text-green-700 hover:bg-zinc-50 transition-colors text-sm font-medium cursor-pointer mb-6"
                        >
                            <Plus className="h-4 w-4" />
                            Add Task
                        </button>
                        <div className="h-12" aria-hidden />
                    </div>
                </SortableContext>
            </ScrollArea>
        </div>
    );
}

export const BoardColumn = React.memo(BoardColumnInner, (prev, next) => {
    if (prev.column.id !== next.column.id) return false;
    if (prev.column.title !== next.column.title) return false;
    if (prev.column.isCollapsed !== next.column.isCollapsed) return false;
    if (prev.isDragActive !== next.isDragActive) return false;
    if (prev.inlineAddColumnId !== next.inlineAddColumnId) return false;
    if (prev.inlineAddTaskId !== next.inlineAddTaskId) return false;

    // Check items length
    if (prev.column.items.length !== next.column.items.length) return false;

    // Check items shallow identity / IDs
    for (let i = 0; i < prev.column.items.length; i++) {
        if (prev.column.items[i].id !== next.column.items[i].id) return false;
        // Also check if task object updated (updatedAt or just check identity)
        if (prev.column.items[i] !== next.column.items[i]) return false;
    }

    if (prev.settings !== next.settings) return false;
    if (prev.expandedParents !== next.expandedParents) return false;
    if (prev.selectedTasks !== next.selectedTasks) return false;

    return true; // Skip render
});