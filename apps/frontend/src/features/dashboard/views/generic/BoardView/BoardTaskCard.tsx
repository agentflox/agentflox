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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CustomFieldRenderer } from "@/entities/task/components/CustomFieldRenderer";
import { TaskCreationModal } from "@/entities/task/components/TaskCreationModal";
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
                            <UserCircle className="h-4 w-4 opacity-80" />
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
                            <Calendar className="h-4 w-4 opacity-80" />
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
                            <Flag className={cn("h-4 w-4 opacity-80", priority === "URGENT" && "text-red-500 opacity-100", priority === "HIGH" && "text-orange-500 opacity-100", priority === "NORMAL" && "text-blue-500 opacity-100", priority === "LOW" && "text-zinc-400")} />
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
                            <CircleSlash className="h-3 w-3 mr-2 text-slate-500" />Clear
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <TagsModal
                    tags={tags}
                    onChange={onTagsChange}
                    allAvailableTags={allAvailableTags}
                    trigger={
                        <div className={cn("flex items-center gap-2.5 group cursor-pointer transition-colors", tags && tags.length > 0 ? "text-zinc-700" : "text-zinc-400 hover:text-zinc-600")}>
                            <Tag className="h-4 w-4 opacity-80" />
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


// Enhanced Task Card Component
function TaskCardInner({
    task,
    spaceId,
    projectId,
    workspaceId,
    listId,
    isDragging,
    isOverlay,
    cardSize = "default",
    cardCover = "image",
    showSubtasks = false,
    showCustomFields = true,
    stackFields = false,
    visibleFields = [],
    onTaskSelect,
    users = [],
    lists = [],
    allAvailableStatuses = [],
    onTaskDelete,
    onTaskUpdate,
    showMoreActions = true,
    allTasks = [],
    onAddSubtask,
    inlineAddTaskId,
    inlineAddTitle,
    inlineAddAssigneeIds,
    inlineAddDueDate,
    inlineAddStartDate,
    inlineAddPriority,
    inlineAddTags,
    onInlineTitleChange,
    onInlineAssigneeChange,
    onInlineDueDateChange,
    onInlineStartDateChange,
    onInlinePriorityChange,
    onInlineTagsChange,
    onSaveInline,
    onCancelInline,
    taskType,
    onTaskTypeChange,
    level = 0,
    isSelected = false,
    onSelect,
    expandedParents,
    onToggleExpand,
    showTaskLocations = false,
    showSubtaskParentNames = false,
    availableTaskTypes = [],
    agents = [],
}: TaskCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: task.id });

    const [dependenciesTask, setDependenciesTask] = useState<any | null>(null);
    const updateTask = trpc.task.update.useMutation();

    const sizeConfig = useMemo(() => {
        switch (cardSize) {
            case "compact": return { p: "p-2", text: "text-xs", gap: "gap-1.5" };
            case "comfortable": return { p: "p-4", text: "text-sm", gap: "gap-3" };
            default: return { p: "p-3", text: "text-[13px]", gap: "gap-2.5" };
        }
    }, [cardSize]);

    const [localSubtasksExpanded, setLocalSubtasksExpanded] = useState(false);
    const subtasksExpanded = expandedParents ? expandedParents.has(task.id) : localSubtasksExpanded;
    const hasDescription =
        typeof task.description === "string" &&
        task.description.replace(/<[^>]*>/g, "").trim().length > 0;
    const handleToggleSubtasks = (e: React.MouseEvent) => {
        if (level > 0) return;
        e.stopPropagation();
        if (onToggleExpand) {
            onToggleExpand(task.id, !subtasksExpanded);
        } else {
            setLocalSubtasksExpanded(!subtasksExpanded);
        }
    };

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [renamingTaskId, setRenamingTaskId] = useState<string | null>(null);
    const [renameDraft, setRenameDraft] = useState("");

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    // Derived counts
    const count = (task as any)._count || {};
    const attachments = ((task as any).attachments || []).filter((a: any) =>
        a.mimeType?.startsWith("image/") || a.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    );
    const images = attachments.length > 0 ? attachments : (task.coverImage ? [{ url: task.coverImage }] : []);

    const attachmentCount = count.attachments || 0;
    const checklistCount = count.checklists || 0;


    // Subtasks logic matching ListView
    const directSubtasks = useMemo(() =>
        allTasks.filter((t: any) => t.parentId === task.id),
        [allTasks, task.id]);

    // All descendants in depth-first order (for two-level display: parent + flat subtasks)
    const allDescendantTasks = useMemo(() => {
        const result: any[] = [];
        const collect = (parentId: string) => {
            const children = allTasks.filter((t: any) => t.parentId === parentId);
            children.forEach((t: any) => {
                result.push(t);
                collect(t.id);
            });
        };
        collect(task.id);
        return result;
    }, [allTasks, task.id]);

    const totalSubtasks = (level === 0 ? allDescendantTasks.length : directSubtasks.length) || (task as any)._count?.other_tasks || (task as any).subtaskCount || 0;
    const completedSubtasks = (task as any).completedSubtasks || 0;

    // Dependencies logic
    const dependencies = (task.dependencies || []) as any[];
    const blockingCount = dependencies.filter(d => d.type === "BLOCKING").length;
    const waitingCount = dependencies.filter(d => d.type === "WAITING_ON").length;
    const linkCount = 0;

    const handleNextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const handlePrevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    // Handle card click - open task detail
    const handleCardClick = (e: React.MouseEvent) => {
        // Don't open if clicking on interactive elements
        const target = e.target as HTMLElement;
        if (
            target.tagName === 'BUTTON' ||
            target.tagName === 'A' ||
            target.tagName === 'IMG' ||
            target.tagName === 'INPUT' ||
            target.getAttribute('role') === 'button'
        ) {
            return;
        }
        onTaskSelect?.(task.id);
    };

    // Priority configuration
    const getPriorityConfig = (priority: string) => {
        switch (priority) {
            case "URGENT": return { color: "text-red-600", bg: "bg-white", iconColor: "text-red-500", label: "Urgent" };
            case "HIGH": return { color: "text-orange-600", bg: "bg-white", iconColor: "text-orange-500", label: "High" };
            case "NORMAL": return { color: "text-blue-600", bg: "bg-white", iconColor: "text-blue-500", label: "Normal" };
            case "LOW": return { color: "text-slate-500", bg: "bg-white", iconColor: "text-slate-400", label: "Low" };
            default: return { color: "text-slate-500", bg: "bg-white", iconColor: "text-slate-400", label: "None" };
        }
    };
    const priorityConfig = task.priority ? getPriorityConfig(task.priority) : null;

    // Render a single subtask as a card. When flat=true, same indent as all subtasks (two-level hierarchy).
    const renderSubtask = (subtask: Task, depthLevel: number = 1, flat: boolean = false) => {
        return (
            <div key={subtask.id} className={flat ? "mb-2" : cn("mb-2", depthLevel > 1 && "ml-4")}>
                <TaskCardInner
                    task={subtask}
                    allTasks={allTasks}
                    spaceId={spaceId}
                    projectId={projectId}
                    workspaceId={workspaceId}
                    listId={subtask.listId || listId}
                    showCustomFields={false}
                    cardCover="none"
                    showMoreActions={false}
                    showSubtasks={!flat}
                    cardSize="compact"
                    showSubtaskParentNames={showSubtaskParentNames}
                    showTaskLocations={showTaskLocations}
                    onTaskSelect={onTaskSelect}
                    users={users}
                    agents={agents}
                    expandedParents={expandedParents}
                    onToggleExpand={onToggleExpand}
                    lists={lists}
                    allAvailableStatuses={allAvailableStatuses}
                    onTaskDelete={onTaskDelete}
                    onTaskUpdate={async (data) => {
                        await updateTask.mutateAsync({
                            id: subtask.id,
                            ...data
                        } as any);
                    }}
                    onAddSubtask={onAddSubtask}
                    inlineAddTaskId={inlineAddTaskId}
                    inlineAddTitle={inlineAddTitle}
                    inlineAddAssigneeIds={inlineAddAssigneeIds}
                    inlineAddDueDate={inlineAddDueDate}
                    inlineAddStartDate={inlineAddStartDate}
                    inlineAddPriority={inlineAddPriority}
                    inlineAddTags={inlineAddTags}
                    onInlineTitleChange={onInlineTitleChange}
                    onInlineAssigneeChange={onInlineAssigneeChange}
                    onInlineDueDateChange={onInlineDueDateChange}
                    onInlineStartDateChange={onInlineStartDateChange}
                    onInlinePriorityChange={onInlinePriorityChange}
                    onInlineTagsChange={onInlineTagsChange}
                    onSaveInline={onSaveInline}
                    onCancelInline={onCancelInline}
                    taskType={taskType}
                    onTaskTypeChange={onTaskTypeChange}
                    availableTaskTypes={availableTaskTypes}
                    level={flat ? 1 : depthLevel + 1}
                />
            </div>
        );
    };

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}  // Apply drag listeners to entire card
                className={cn(
                    "group relative bg-white border border-zinc-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] rounded-xl hover:shadow-md transition-all mb-2.5",
                    // Show grab cursor when hovering card, but not over interactive elements
                    "cursor-pointer active:cursor-grabbing",
                    "[&_button]:cursor-pointer [&_a]:cursor-pointer",  // Override cursor for interactive elements
                    isDragging && "opacity-50 rotate-2 scale-105 z-50 cursor-grabbing",
                    isOverlay && "shadow-2xl rotate-3 scale-110 z-50",
                    isSelected && "bg-zinc-50 border-zinc-300 shadow-inner"
                )}
                onClick={handleCardClick}
            >
                {/* Hover Actions - Positioned relative to the card */}
                <div
                    className={cn(
                        "absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all flex items-center bg-white shadow-md border border-zinc-100 rounded-md z-30 overflow-hidden",
                        isSelected && "opacity-100"
                    )}
                    onClick={(e) => e.stopPropagation()}
                    data-no-click
                >
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                className="h-6 w-6 flex items-center justify-center hover:bg-zinc-50 text-zinc-400 hover:text-green-600 transition-colors"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    // Find the "Complete" or "Done" status
                                    const doneStatus = allAvailableStatuses.find(s =>
                                        (s.name.toUpperCase() === "DONE" || s.name.toUpperCase() === "COMPLETE" || s.name.toUpperCase() === "CLOSED") &&
                                        (s.listId === task.listId)
                                    ) || allAvailableStatuses.find(s =>
                                        s.name.toUpperCase() === "DONE" || s.name.toUpperCase() === "COMPLETE" || s.name.toUpperCase() === "CLOSED"
                                    );

                                    if (doneStatus) {
                                        await onTaskUpdate?.({ statusId: doneStatus.id, isCompleted: true });
                                        toast.success("Task marked as complete");
                                    } else {
                                        // Fallback: at least set isCompleted even if we can't find a status
                                        await onTaskUpdate?.({ isCompleted: true });
                                        toast.success("Task marked as complete");
                                    }
                                }}
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Mark complete</TooltipContent>
                    </Tooltip>
                    <div className="w-[1px] h-3 bg-zinc-100" />

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                className="h-6 w-6 flex items-center justify-center hover:bg-zinc-50 text-zinc-400 hover:text-blue-600 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLocalSubtasksExpanded(true);
                                    onAddSubtask?.(task.id);
                                }}
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Add subtask</TooltipContent>
                    </Tooltip>

                    <div className="w-[1px] h-3 bg-zinc-100" />
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                className="h-6 w-6 flex items-center justify-center hover:bg-zinc-50 text-zinc-400 hover:text-zinc-700 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setRenamingTaskId(task.id);
                                    setRenameDraft(task.title || task.name || "");
                                }}
                            >
                                <Edit3 className="h-3.5 w-3.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Rename</TooltipContent>
                    </Tooltip>
                    <div className="w-[1px] h-3 bg-zinc-100" />
                    {showMoreActions ? (
                        <TaskActionsPopover
                            task={task as any}
                            context={spaceId ? "SPACE" : projectId ? "PROJECT" : "GENERAL"}
                            contextId={(spaceId || projectId) as any}
                            workspaceId={workspaceId || ""}
                            users={users}
                            lists={lists}
                            defaultListId={listId}
                            availableStatuses={allAvailableStatuses}
                            onDelete={onTaskDelete || (() => { })}
                            onUpdate={async (_id, data) => { if (onTaskUpdate) await onTaskUpdate(data); }}
                            onAction={() => { }}
                        >
                            <div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            className="h-6 w-6 flex items-center justify-center hover:bg-zinc-50 text-zinc-400 hover:text-zinc-700 transition-colors"
                                        >
                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">More actions</TooltipContent>
                                </Tooltip>
                            </div>
                        </TaskActionsPopover>
                    ) : (
                        <div className="w-1" />
                    )}

                    <div className="w-[1px] h-6 bg-zinc-200" />
                    <div
                        className={cn(
                            "h-6 w-8 flex items-center justify-center transition-all px-1.5"
                        )}
                    >
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => onSelect?.(task.id, !!checked)}
                            className={cn(
                                "h-4 w-4 rounded-md transition-all border-1 border-zinc-300 hover:border-zinc-400 shadow-none",
                                isSelected ? "bg-zinc-800 text-white" : "bg-white"
                            )}
                        />
                    </div>
                </div>


                {/* Image Carousel */}
                {cardCover === "image" && images.length > 0 && (
                    <div
                        className="w-full h-32 rounded-t-xl overflow-hidden mb-2 relative group/image bg-zinc-50 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); onTaskSelect?.(task.id); }}
                        data-no-click
                    >
                        <img
                            src={images[currentImageIndex].url}
                            alt=""
                            className="w-full h-full object-cover"
                        />
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={handlePrevImage}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover/image:opacity-100 transition-opacity"
                                >
                                    <ArrowLeft className="h-4 w-4 rotate-180" />
                                </button>
                                <button
                                    onClick={handleNextImage}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover/image:opacity-100 transition-opacity"
                                >
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                                <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                                    {currentImageIndex + 1}/{images.length}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Task Description Cover */}
                {cardCover === "description" && hasDescription && (
                    <div
                        className="w-full max-h-[150px] overflow-hidden mb-2 px-3 pt-3 pb-1 relative group/desc cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); onTaskSelect?.(task.id); }}
                    >
                        <div
                            className="text-xs text-zinc-500 line-clamp-6 prose prose-xs max-w-none [&_p]:m-0 [&_ul]:m-0 [&_ol]:m-0 bg-zinc-50 p-2 rounded-md border border-zinc-100/50"
                            dangerouslySetInnerHTML={{ __html: task.description || "" }}
                        />
                    </div>
                )}

                <div className={cn(sizeConfig.p, "pt-2")}>
                    {/* Subtask Parent Name */}
                    {showSubtaskParentNames && task.parentId && (() => {
                        const parent = allTasks.find(t => t.id === task.parentId);
                        if (!parent) return null;
                        return (
                            <div className="text-[10px] text-zinc-500 mb-1 flex items-center gap-1 max-w-full" data-no-click>
                                <span className="shrink-0 text-zinc-400">Subtask of</span>
                                <span
                                    className="font-medium text-zinc-600 truncate hover:underline cursor-pointer hover:text-blue-600"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTaskSelect?.(parent.id);
                                    }}
                                    title={parent.title || parent.name}
                                >
                                    {parent.title || parent.name}
                                </span>
                            </div>
                        );
                    })()}

                    {/* Title Container with overflow control */}
                    <div className={cn("flex items-start justify-between mb-3.5 min-w-0", sizeConfig.gap)}>
                        {renamingTaskId === task.id ? (
                            <Input
                                variant="ghost"
                                value={renameDraft}
                                onChange={(e) => setRenameDraft(e.target.value)}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={async (e) => {
                                    if (e.key === "Enter") {
                                        const trimmed = renameDraft.trim();
                                        if (trimmed) {
                                            await updateTask.mutateAsync({ id: task.id, title: trimmed } as any);
                                        }
                                        setRenamingTaskId(null);
                                    } else if (e.key === "Escape") {
                                        setRenamingTaskId(null);
                                    }
                                }}
                                onBlur={async () => {
                                    const trimmed = renameDraft.trim();
                                    if (trimmed && renamingTaskId === task.id) {
                                        await updateTask.mutateAsync({ id: task.id, title: trimmed } as any);
                                    }
                                    setRenamingTaskId(null);
                                }}
                                className="h-7 py-1 text-sm border-zinc-200 border-0 outline-none focus:outline-none w-full"
                            />
                        ) : (
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTaskSelect?.(task.id);
                                }}
                                className={cn("font-medium leading-snug text-zinc-900 cursor-pointer hover:text-blue-600 truncate flex-1 flex items-center gap-1.5 pr-8", sizeConfig.text)}
                                title={task.title || task.name}
                            >
                                {(() => {
                                    const typeId = task.taskTypeId || task.taskType?.id;
                                    const dynamicType = availableTaskTypes?.find(t => t.id === typeId) || task.taskType;
                                    return <TaskTypeIcon type={dynamicType} className="h-3.5 w-3.5 shrink-0" />;
                                })()}
                                <span className="truncate">{task.title || task.name}</span>
                            </div>
                        )}
                    </div>

                    {showTaskLocations && (() => {
                        const listId = task.listId ?? task.list?.id;
                        // In BoardView, `lists` is passed as a prop which corresponds to listsData.items in ListView context
                        const contextList = lists?.find((l: any) => l.id === listId);

                        // Prioritize context list data as it contains full hierarchy
                        const spaceName = contextList?.space?.name ?? (task as any).list?.space?.name;
                        const folderName = contextList?.folder?.name ?? (task as any).list?.folder?.name;
                        const listName = contextList?.name ?? (task as any).list?.name;

                        if (!listName) return null;

                        return (
                            <div className="flex items-center gap-1 text-[10px] text-zinc-400 mb-3 leading-normal h-3 overflow-hidden whitespace-nowrap" data-no-click>
                                <span className="shrink-0">In</span>
                                {spaceName && (
                                    <>
                                        <span className="shrink-0">{spaceName}</span>
                                        <span className="text-zinc-300">/</span>
                                    </>
                                )}
                                {folderName && (
                                    <>
                                        <span className="shrink-0">{folderName}</span>
                                        <span className="text-zinc-300">/</span>
                                    </>
                                )}
                                <span className="font-medium text-zinc-500 truncate">{listName}</span>
                            </div>
                        );
                    })()}

                    <div className="flex flex-col gap-1.5 mb-2" data-no-click>
                        {/* Row 1: Description, Attachments, Checklist, Waiting */}
                        {(hasDescription || attachmentCount > 0 || checklistCount > 0 || waitingCount > 0) && (
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Description */}
                                {hasDescription && (
                                    <HoverCard openDelay={250} closeDelay={100}>
                                        <HoverCardTrigger asChild>
                                            <button
                                                type="button"
                                                className="p-0.5 rounded hover:bg-zinc-200/80 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <AlignLeft className="h-3.5 w-3.5" />
                                            </button>
                                        </HoverCardTrigger>
                                        <HoverCardContent
                                            className="w-[420px] max-w-[min(520px,calc(100vw-2rem))] p-4"
                                            align="start"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <h3 className="text-sm font-semibold mb-2">Goal</h3>
                                            <div
                                                className="prose prose-sm max-w-none text-zinc-700 [&_a]:text-blue-600 [&_a]:underline"
                                                dangerouslySetInnerHTML={{ __html: task.description ?? "" }}
                                            />
                                        </HoverCardContent>
                                    </HoverCard>
                                )}

                                {/* Attachments */}
                                {attachmentCount > 0 && (
                                    <button
                                        className="flex items-center gap-0.5 text-[10px] text-zinc-400 cursor-pointer hover:text-zinc-700"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onTaskSelect?.(task.id);
                                        }}
                                    >
                                        <Paperclip className="h-3 w-3" />
                                        <span>{attachmentCount}</span>
                                    </button>
                                )}

                                {/* Checklist */}
                                {checklistCount > 0 && (
                                    <button
                                        className="flex items-center gap-0.5 text-[10px] text-zinc-400 cursor-pointer hover:text-zinc-700"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onTaskSelect?.(task.id);
                                        }}
                                    >
                                        <ListChecks className="h-3 w-3" />
                                        <span>0/{checklistCount}</span>
                                    </button>
                                )}

                                {/* Waiting */}
                                {waitingCount > 0 && (
                                    <button
                                        className="p-0.5 rounded hover:bg-zinc-200/80 cursor-pointer flex items-center gap-1 text-[10px] text-zinc-500"
                                        title="Waiting on"
                                        onClick={(e) => { e.stopPropagation(); setDependenciesTask(task); }}
                                    >
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                        <span>{waitingCount}</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Row 2: Blocking, Links */}
                        {(blockingCount > 0 || linkCount > 0) && (
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Blocking */}
                                {blockingCount > 0 && (
                                    <button
                                        className="p-0.5 rounded hover:bg-zinc-200/80 cursor-pointer flex items-center gap-1 text-[10px] text-zinc-500"
                                        title="Blocking"
                                        onClick={(e) => { e.stopPropagation(); setDependenciesTask(task); }}
                                    >
                                        <CircleMinus className="h-3.5 w-3.5 text-red-500" />
                                        <span>{blockingCount}</span>
                                    </button>
                                )}

                                {/* Links */}
                                {linkCount > 0 && (
                                    <button
                                        className="p-0.5 rounded hover:bg-zinc-200/80 cursor-pointer"
                                        title="Links"
                                        onClick={(e) => { e.stopPropagation(); setDependenciesTask(task); }}
                                    >
                                        <Link className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Row 3+: Other properties */}
                        <div className={cn(
                            "flex flex-wrap items-center gap-2",
                            stackFields ? "flex-col items-start gap-1.5" : ""
                        )}>
                            {/* Assignee */}
                            {isFieldVisible(visibleFields, "assignee") && (
                                <AssigneeSelector
                                    users={users}
                                    agents={agents}
                                    workspaceId={workspaceId}
                                    variant="compact"
                                    value={formatAssigneeIdsForSelector(task.assignees ?? [])}
                                    onChange={(newIds) => onTaskUpdate?.({ assigneeIds: newIds })}
                                    trigger={(() => {
                                        const assignees = task.assignees?.length ? task.assignees : (task.assignee ? [{ user: task.assignee }] : []);
                                        return (
                                            <div className="flex items-center -space-x-1.5 rounded px-1 py-0.5 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                                {assignees.length > 0 ? (
                                                    assignees.slice(0, 4).map((a: any, i: number) => (
                                                        <Avatar key={a.user?.id || a.aiAgent?.id || a.agent?.id || i} className="h-6 w-6 border-2 border-white ring-1 ring-zinc-100 hover:scale-110 hover:z-10 transition-transform relative">
                                                            <AvatarImage src={a.user?.image || a.aiAgent?.avatar || a.aiAgent?.image || a.agent?.avatar || undefined} />
                                                            <AvatarFallback className="text-[9px] bg-indigo-50 text-indigo-600">
                                                                {a.user?.name?.slice(0, 2)?.toUpperCase() || a.aiAgent?.name?.slice(0, 2)?.toUpperCase() || a.agent?.name?.slice(0, 2)?.toUpperCase() || "??"}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    ))
                                                ) : (
                                                    <div className="h-6 w-6 rounded-full border border-dashed border-zinc-300 flex items-center justify-center">
                                                        <Users className="h-3 w-3 text-zinc-400" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                />
                            )}

                            {/* Due Date */}
                            {isFieldVisible(visibleFields, "dueDate") && (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <div
                                            className={cn(
                                                "flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium select-none cursor-pointer transition-colors",
                                                task.dueDate
                                                    ? (new Date(task.dueDate) < new Date() ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100" : "bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50")
                                                    : "bg-white border-dashed border-zinc-200 text-zinc-400 hover:bg-zinc-50"
                                            )}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Calendar className="h-3 w-3" />
                                            <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "Set date"}</span>
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <TaskCalendar
                                            startDate={task.startDate ? new Date(task.startDate) : undefined}
                                            endDate={task.dueDate ? new Date(task.dueDate) : undefined}
                                            onStartDateChange={(d) => onTaskUpdate?.({ startDate: d })}
                                            onEndDateChange={(d) => onTaskUpdate?.({ dueDate: d })}
                                        />
                                    </PopoverContent>
                                </Popover>
                            )}

                            {/* Priority */}
                            {isFieldVisible(visibleFields, "priority") && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <div
                                            className={cn(
                                                "flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium select-none cursor-pointer transition-colors",
                                                task.priority ? "bg-white border-zinc-200 hover:bg-zinc-50" : "bg-white border-dashed border-zinc-200 text-zinc-400 hover:bg-zinc-50"
                                            )}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Flag className={cn("h-3 w-3", task.priority ? "fill-current" : "", task.priority ? priorityConfig?.iconColor : "text-zinc-300")} />
                                            <span className={cn(task.priority ? priorityConfig?.color : "text-zinc-400")}>{task.priority ? priorityConfig?.label : "Priority"}</span>
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-44" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenuLabel className="text-xs">Task Priority</DropdownMenuLabel>
                                        <DropdownMenuItem className="text-xs" onClick={() => onTaskUpdate?.({ priority: "URGENT" })}>
                                            <Flag className="h-3 w-3 mr-2 text-red-600 fill-current" />
                                            Urgent
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-xs" onClick={() => onTaskUpdate?.({ priority: "HIGH" })}>
                                            <Flag className="h-3 w-3 mr-2 text-orange-500 fill-current" />
                                            High
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-xs" onClick={() => onTaskUpdate?.({ priority: "NORMAL" })}>
                                            <Flag className="h-3 w-3 mr-2 text-blue-500 fill-current" />
                                            Normal
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-xs" onClick={() => onTaskUpdate?.({ priority: "LOW" })}>
                                            <Flag className="h-3 w-3 mr-2 text-zinc-400 fill-current" />
                                            Low
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-xs" onClick={() => onTaskUpdate?.({ priority: null })}>
                                            <CircleSlash className="h-3 w-3 mr-2 text-slate-500" />Clear
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}

                            {/* Tags */}
                            {isFieldVisible(visibleFields, "tags") && task.tags && task.tags.length > 0 && (
                                <TagsPopover
                                    tags={task.tags ?? []}
                                    onChange={(nextTags) => {
                                        void updateTask.mutateAsync({ id: task.id, tags: nextTags } as any);
                                    }}
                                    trigger={
                                        <div className="flex items-center gap-1 ml-1 px-1 py-0.5 rounded-md transition-colors hover:bg-zinc-100 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                            <Tag className="h-3.5 w-3.5 text-zinc-400" />
                                            {task.tags!.slice(0, 2).map((encoded) => {
                                                const parsed = parseEncodedTag(encoded);
                                                const bg = parsed.color ?? "#ede9fe";
                                                return (
                                                    <div
                                                        key={encoded}
                                                        className="relative inline-flex items-center group/tag"
                                                    >
                                                        <span
                                                            className="px-1.5 py-1 rounded-md text-[10px] font-medium cursor-pointer select-none"
                                                            style={{
                                                                backgroundColor: bg,
                                                                color: "#3730a3",
                                                            }}
                                                        >
                                                            {parsed.label}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                            {task.tags!.length > 2 && (
                                                <span
                                                    className="px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 text-[10px] font-medium cursor-pointer"
                                                >
                                                    +{task.tags!.length - 2}
                                                </span>
                                            )}
                                        </div>
                                    }
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Two-level hierarchy: only parent (level 0) shows subtasks; all descendants in one flat list at same indent */}
                {((level === 0 && (totalSubtasks > 0 || inlineAddTaskId === task.id)) || (level > 0 && totalSubtasks > 0)) && (
                    <div className="border-t border-zinc-100/80" data-no-click>
                        <button
                            className={cn(
                                "flex items-center gap-1.5 w-full px-3 py-2.5 text-[11px] text-zinc-600 font-medium transition-colors",
                                level === 0 ? "hover:text-zinc-900 hover:bg-zinc-50 group/subtasks cursor-pointer" : "cursor-default text-zinc-400"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (level === 0) {
                                    if (onToggleExpand) {
                                        onToggleExpand(task.id, !subtasksExpanded);
                                    } else {
                                        setLocalSubtasksExpanded(!subtasksExpanded);
                                    }
                                }
                            }}
                        >
                            <div className="relative h-3.5 w-3.5 flex items-center justify-center">
                                <Spline className={cn(
                                    "h-3 w-3 scale-y-[-1] transition-opacity absolute duration-200",
                                    level === 0 && "group-hover/subtasks:opacity-0"
                                )} />
                                {level === 0 && (
                                    <ChevronRight className={cn(
                                        "h-3.5 w-3.5 transition-all text-zinc-400 absolute opacity-0 scale-75 group-hover/subtasks:opacity-100 group-hover/subtasks:scale-100",
                                        subtasksExpanded && "rotate-90"
                                    )} />
                                )}
                            </div>
                            <span>{totalSubtasks} subtask{totalSubtasks !== 1 ? 's' : ''}</span>
                            {completedSubtasks > 0 && (
                                <span className="text-zinc-400 font-normal">
                                    · {completedSubtasks}/{totalSubtasks}
                                </span>
                            )}
                        </button>

                        {(level === 0 && subtasksExpanded && (allDescendantTasks.length > 0 || inlineAddTaskId === task.id)) && (
                            <div className="px-3 pb-3 space-y-0.5">
                                {allDescendantTasks.map((subtask: any) => {
                                    return (
                                        <Fragment key={subtask.id}>
                                            {renderSubtask(subtask, 1, true)}
                                            {inlineAddTaskId === subtask.id && (
                                                <div className="mt-0.5">
                                                    <QuickAddCard
                                                        title={inlineAddTitle || ""}
                                                        onChange={onInlineTitleChange || (() => { })}
                                                        onSave={onSaveInline || (() => { })}
                                                        onCancel={onCancelInline || (() => { })}
                                                        placeholder="Subtask Name..."
                                                        users={users || []}
                                                        assigneeIds={inlineAddAssigneeIds || []}
                                                        onAssigneeChange={onInlineAssigneeChange || (() => { })}
                                                        dueDate={inlineAddDueDate || null}
                                                        onDueDateChange={onInlineDueDateChange || (() => { })}
                                                        startDate={inlineAddStartDate || null}
                                                        onStartDateChange={onInlineStartDateChange || (() => { })}
                                                        priority={inlineAddPriority || null}
                                                        onPriorityChange={onInlinePriorityChange || (() => { })}
                                                        tags={inlineAddTags || []}
                                                        onTagsChange={onInlineTagsChange || (() => { })}
                                                        taskType={taskType}
                                                        onTaskTypeChange={onTaskTypeChange}
                                                        availableTaskTypes={availableTaskTypes}
                                                    />
                                                </div>
                                            )}
                                        </Fragment>
                                    );
                                })}
                                {inlineAddTaskId === task.id && (
                                    <div className="mt-0.5">
                                        <QuickAddCard
                                            title={inlineAddTitle || ""}
                                            onChange={onInlineTitleChange || (() => { })}
                                            onSave={onSaveInline || (() => { })}
                                            onCancel={onCancelInline || (() => { })}
                                            placeholder="Subtask Name..."
                                            users={users || []}
                                            assigneeIds={inlineAddAssigneeIds || []}
                                            onAssigneeChange={onInlineAssigneeChange || (() => { })}
                                            dueDate={inlineAddDueDate || null}
                                            onDueDateChange={onInlineDueDateChange || (() => { })}
                                            startDate={inlineAddStartDate || null}
                                            onStartDateChange={onInlineStartDateChange || (() => { })}
                                            priority={inlineAddPriority || null}
                                            onPriorityChange={onInlinePriorityChange || (() => { })}
                                            tags={inlineAddTags || []}
                                            onTagsChange={onInlineTagsChange || (() => { })}
                                            taskType={taskType}
                                            onTaskTypeChange={onTaskTypeChange}
                                            availableTaskTypes={availableTaskTypes}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div >

            {/* Dependencies modal */}
            {/* {
                dependenciesTask && (
                    <TaskDependenciesModal
                        open={!!dependenciesTask}
                        onOpenChange={(open) => {
                            if (!open) setDependenciesTask(null);
                        }}
                        task={dependenciesTask}
                    />
                )
            } */}
        </>
    );
}

// Custom memo comparator – only re-render when task data, selection, or drag state actually changes
export const BoardTaskCard = React.memo(TaskCardInner, (prev, next) => {
    if (prev.task.id !== next.task.id) return false;
    if (prev.isSelected !== next.isSelected) return false;
    if (prev.isDragging !== next.isDragging) return false;
    if (prev.isOverlay !== next.isOverlay) return false;
    if (prev.cardSize !== next.cardSize) return false;
    if (prev.showSubtasks !== next.showSubtasks) return false;
    if (prev.showCustomFields !== next.showCustomFields) return false;
    if (prev.inlineAddTaskId !== next.inlineAddTaskId) return false;
    // Check task data shallowly – title, status, priority, dueDate, assignees cover 95% of changes
    const pt = prev.task; const nt = next.task;
    if (pt.title !== nt.title) return false;
    if (pt.name !== nt.name) return false;
    if (pt.statusId !== nt.statusId) return false;
    if (pt.priority !== nt.priority) return false;
    if (pt.isCompleted !== nt.isCompleted) return false;
    if (pt.isStarred !== nt.isStarred) return false;
    if (pt.coverImage !== nt.coverImage) return false;
    if ((pt.assignees?.length ?? 0) !== (nt.assignees?.length ?? 0)) return false;
    if ((pt._count?.comments ?? 0) !== (nt._count?.comments ?? 0)) return false;
    if ((pt._count?.attachments ?? 0) !== (nt._count?.attachments ?? 0)) return false;
    if ((pt.tags?.length ?? 0) !== (nt.tags?.length ?? 0)) return false;
    if (prev.expandedParents !== next.expandedParents) return false;
    return true; // skip re-render
});
