import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { LocationSearchInput } from "@/entities/task/components/LocationSearchInput";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
    PopoverAnchor,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DescriptionEditor } from "@/entities/shared/components/DescriptionEditor";
import { AssigneeSelector } from "@/entities/task/components/AssigneeSelector";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Search, Plus, MoreHorizontal, SortAsc, X, Pin, Lock, ShieldCheck, Home, Navigation,
    Calendar, Users, Flag, Clock, Paperclip, MessageSquare, Star, UserRound,
    Copy, CopyPlus, Trash2, Edit3, ArrowRight, ChevronRight, ChevronDown, CheckCheck, ChevronUp, ChevronsUp, GripVertical, CheckCircle2,
    LayoutList, SlidersHorizontal, ArrowUp, ArrowDown, Circle, Spline, Save, MapPinned, Minimize2,
    Link2, Target, Filter, Settings, Info, Play, ListChecks, AlignLeft, RefreshCcw, List as ListIcon,
    Type, Hash, CheckSquare, Tag, DollarSign, Globe, FunctionSquare, FileText, EyeOff, Eye,
    Phone, Mail, MapPin, TrendingUp, Heart, PenTool, MousePointer, ListTodo, AlertTriangle, CircleMinus, Link, Box,
    Archive, UserPlus, CalendarCheck, CalendarClock, CalendarRange, Hourglass, UserCheck, RefreshCw, Timer, Download, Undo, ToggleLeft,
    Maximize, Minus, Wand2, Palette, ChevronsUpDown, ArrowUpDown, Check
} from "lucide-react";
import type { FilterCondition, FilterGroup, FilterOperator, ListViewSavedConfig } from "./listViewTypes";
import { STANDARD_FIELD_CONFIG, FILTER_OPTIONS, FIELD_OPERATORS } from "./listViewConstants";
import { evaluateGroup, hasFilterValue, hasAnyValueInGroup, isEmpty } from "./filterUtils";
import { toast } from "sonner";
import { DestinationPicker } from "@/entities/task/components/DestinationPicker";
import { SingleDateCalendar } from "@/components/ui/date-picker";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { TaskTypeIcon } from "@/entities/task/components/TaskTypeIcon";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { ViewToolbarSaveDropdown } from "@/features/dashboard/components/shared/ViewToolbarSaveDropdown";
import { ViewToolbarClosedPopover } from "@/features/dashboard/components/shared/ViewToolbarClosedPopover";
import { TaskCreationModal } from "@/entities/task/components/TaskCreationModal";
import { TaskDetailModal } from "@/entities/task/components/TaskDetailModal";
import stableStringify from "json-stable-stringify";

// Colors for the "Default" color picker
const DEFAULT_COLORS = [
    "#7c3aed", // violet
    "#2563eb", // blue
    "#0ea5e9", // sky
    "#14b8a6", // teal
    "#22c55e", // green
    "#eab308", // yellow
    "#f97316", // orange
    "#ef4444", // red
    "#ec4899", // pink
    "#a1a1aa", // zinc/gray
    "#71717a", // zinc-500
];

type MapViewSavedConfig = ListViewSavedConfig & {
    colorBy?: "default" | "priority" | "status";
    defaultColor?: string;
    zoomRange?: [number, number];
};

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
};

let DefaultIcon = L.icon({
    iconUrl: (icon as any).src || icon,
    shadowUrl: (iconShadow as any).src || iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Helper to get priority styles (can be moved to a shared util if needed)
const getPriorityStyles = (p: string | null) => {
    switch (p) {
        case "URGENT": return { icon: "text-red-500", badge: "bg-red-50 text-red-700 border-red-100" };
        case "HIGH": return { icon: "text-orange-500", badge: "bg-orange-50 text-orange-700 border-orange-100" };
        case "NORMAL": return { icon: "text-blue-500", badge: "bg-blue-50 text-blue-700 border-blue-100" };
        case "LOW": return { icon: "text-zinc-400", badge: "bg-zinc-50 text-zinc-600 border-zinc-100" };
        default: return { icon: "text-zinc-400", badge: "bg-white text-zinc-400 border-zinc-100" };
    }
};

const hasSubtasks = (task: Task, scopeTasks: Task[]) => scopeTasks.some((t: Task) => t.parentId === task.id);

const parseEncodedTag = (encoded: string) => {
    if (encoded.includes("||")) {
        const [label, color] = encoded.split("||");
        return { label, color };
    }
    return { label: encoded, color: "#94a3b8" };
};

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

export interface MapViewProps {
    spaceId?: string;
    projectId?: string;
    folderId?: string;
    teamId?: string;
    listId?: string;
    viewId?: string;
    initialConfig?: Record<string, any> | null;
    selectedTaskIdFromParent?: string | null;
    onTaskSelect?: (taskId: string | null) => void;
    context?: "space" | "project" | "team" | "folder" | "list";
}

type ViewMode = 'default' | 'satellite' | 'terrain';
type ClusterMode = 'auto' | 'off' | 'strict';


function TaskMapPopup({ task, onUpdate, users, allAvailableTags, onMaximize, session }: any) {
    const [title, setTitle] = useState(task.title || task.name || "");
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [dateOpen, setDateOpen] = useState(false);
    const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);

    // Initial location value for input
    const locationValue = task.location ? JSON.stringify(task.location) : "";

    // Description autosave helper
    const handleDescriptionSave = (val: string) => {
        onUpdate(task.id, { description: val });
    };

    return (
        <div className="w-[320px] p-2 flex flex-col gap-3 font-sans text-left bg-white rounded-lg">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    {isEditingTitle ? (
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={() => { setIsEditingTitle(false); onUpdate(task.id, { name: title }); }}
                            autoFocus
                            className="h-7 text-sm font-semibold px-1"
                        />
                    ) : (
                        <h3
                            className="text-sm font-bold text-zinc-900 leading-tight cursor-pointer hover:text-violet-600 truncate py-0.5"
                            onClick={() => setIsEditingTitle(true)}
                        >
                            {title || "Untitled Task"}
                        </h3>
                    )}
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded" onClick={() => onMaximize(task.id)}>
                                <Maximize className="h-3.5 w-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open Task Details</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Location */}
            <LocationSearchInput
                value={locationValue}
                onSelect={(val) => {
                    onUpdate(task.id, { location: val });
                }}
            />

            {/* Fields Grid */}
            <div className="grid grid-cols-2 gap-2">
                {/* Assignee */}
                <AssigneeSelector
                    users={users}
                    value={task.assigneeIds || []}
                    onChange={(ids) => onUpdate(task.id, { assigneeIds: ids })}
                    variant="compact"
                    showMarketplaceActions={false}
                />

                {/* Due Date */}
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn(
                            "h-7 w-full justify-start text-[10px] font-medium border-dashed",
                            task.dueDate ? "text-zinc-900 border-zinc-300 bg-white" : "text-zinc-500 border-zinc-200 bg-zinc-50/50"
                        )}>
                            <Calendar className="h-3 w-3 mr-1.5 shrink-0" />
                            <span className="truncate">
                                {task.dueDate ? format(new Date(task.dueDate), "MMM d") : "Due date"}
                            </span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-auto" align="start">
                        <SingleDateCalendar
                            selectedDate={task.dueDate ? new Date(task.dueDate) : undefined}
                            onDateChange={(date) => {
                                onUpdate(task.id, { dueDate: date });
                                setDateOpen(false);
                            }}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {/* Priority */}
                <Select value={task.priority || "NONE"} onValueChange={(val) => onUpdate(task.id, { priority: val })}>
                    <SelectTrigger className="h-7 text-[10px] font-medium border-zinc-200">
                        {task.priority && task.priority !== "NONE" ? (
                            <div className="flex items-center gap-1.5">
                                <Flag className={cn("h-3 w-3", getPriorityStyles(task.priority).icon)} />
                                <SelectValue />
                            </div>
                        ) : <span>Priority</span>}
                    </SelectTrigger>
                    <SelectContent>
                        {["URGENT", "HIGH", "NORMAL", "LOW", "NONE"].map(p => (
                            <SelectItem key={p} value={p} className="text-xs">
                                <div className="flex items-center gap-2">
                                    <Flag className={cn("h-3 w-3", getPriorityStyles(p).icon)} />
                                    <span className="capitalize">{p.toLowerCase()}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Status */}
                <Select value={task.status?.id || ""} onValueChange={(val) => onUpdate(task.id, { statusId: val })}>
                    <SelectTrigger className="h-7 text-[10px] font-medium border-zinc-200">
                        {task.status?.color && <div className="h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: task.status.color }} />}
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        {task.list?.statuses?.map((s: any) => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                                    {s.name}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 min-h-[24px]">
                <TagsModal
                    value={task.tags || []}
                    onChange={(tags) => onUpdate(task.id, { tags })}
                    allAvailableTags={allAvailableTags || []}
                    trigger={
                        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-zinc-500 hover:text-zinc-900 border border-transparent hover:border-zinc-200">
                            <Plus className="h-3 w-3 mr-1" /> Tags
                        </Button>
                    }
                />
                {task.tags?.map((tag: string) => {
                    const parsed = parseEncodedTag(tag);
                    return (
                        <div key={tag} className="px-1.5 py-0.5 bg-white text-zinc-700 rounded text-[10px] font-medium border border-zinc-200 shadow-sm flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: parsed.color }} />
                            {parsed.label}
                        </div>
                    );
                })}
            </div>

            {/* Description */}
            <div
                className="group relative border border-zinc-200 rounded-md p-2 bg-zinc-50/50 min-h-[60px] cursor-pointer hover:bg-white hover:border-violet-200 hover:shadow-sm transition-all"
                onClick={() => setIsDescriptionModalOpen(true)}
            >
                <div className="text-xs text-zinc-500 line-clamp-3 pointer-events-none">
                    {task.description ? (
                        <div dangerouslySetInnerHTML={{ __html: task.description }} />
                    ) : (
                        <span className="italic opacity-70">Add a description...</span>
                    )}
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-white/50 backdrop-blur-[1px] transition-opacity">
                    <Button size="sm" variant="secondary" className="h-7 text-xs shadow-sm bg-white border border-zinc-200">
                        <Edit3 className="h-3 w-3 mr-1.5" /> Edit Description
                    </Button>
                </div>
            </div>

            <Dialog open={isDescriptionModalOpen} onOpenChange={setIsDescriptionModalOpen}>
                <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0 overflow-hidden">
                    <DialogTitle className="sr-only">Description</DialogTitle>
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <DescriptionEditor
                            content={task.description || ""}
                            onChange={handleDescriptionSave}
                            editable={true}
                            collaboration={{
                                enabled: true,
                                documentId: task.id,
                                documentType: 'task',
                                user: session?.user ? {
                                    id: session.user.id,
                                    name: session.user.name || "User",
                                    color: session.user.color
                                } : undefined
                            }}
                            spaceId={task.spaceId}
                            projectId={task.projectId}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export function MapView({ spaceId, projectId, teamId, listId, folderId, viewId, initialConfig, selectedTaskIdFromParent, onTaskSelect, context }: MapViewProps) {
    const { data: session } = useSession();
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const markersRef = useRef<L.Marker[]>([]);
    const utils = trpc.useUtils();

    const { data: space } = trpc.space.get.useQuery({ id: spaceId as string }, { enabled: !!spaceId });
    const { data: project } = trpc.project.get.useQuery({ id: projectId as string }, { enabled: !!projectId });
    const resolvedWorkspaceId = space?.workspaceId || project?.workspaceId;

    // Participants
    const { data: projectParticipants } = trpc.project.getParticipants.useQuery({ projectId: projectId as string }, { enabled: !!projectId });
    const { data: teamParticipants } = trpc.team.getParticipants.useQuery({ teamId: teamId as string }, { enabled: !!teamId });

    const users = useMemo(() => {
        const u = new Map<string, any>();
        projectParticipants?.users?.forEach(user => u.set(user.id, user));
        const teamUsers = (teamParticipants as any)?.users;
        if (Array.isArray(teamUsers)) {
            teamUsers.forEach((user: any) => u.set(user.id, user));
        } else if (Array.isArray(teamParticipants)) {
            (teamParticipants as any[]).forEach((member: any) => {
                if (member.user) u.set(member.user.id, member.user);
            });
        }
        return Array.from(u.values());
    }, [projectParticipants, teamParticipants]);


    const { data: customFields = [] } = trpc.customFields.list.useQuery(
        {
            ...(resolvedWorkspaceId ? { workspaceId: resolvedWorkspaceId } : {}),
            ...(listId ? { listId } : {}),
            ...(folderId ? { folderId } : {}),
            ...(spaceId ? { spaceId } : {}),
            ...(projectId ? { projectId } : {}),
            ...(teamId ? { teamId } : {})
            , applyTo: "TASK"
        },
        { enabled: !!(resolvedWorkspaceId || listId || folderId || spaceId || projectId || teamId) }
    );

    const { data: availableTaskTypes = [] } = trpc.task.listTaskTypes.useQuery({ workspaceId: resolvedWorkspaceId as string }, { enabled: !!resolvedWorkspaceId });
    const { data: listsData } = trpc.list.byContext.useQuery({ spaceId, projectId, workspaceId: resolvedWorkspaceId }, { enabled: !!(spaceId || projectId || resolvedWorkspaceId) });
    const { data: currentList } = trpc.list.get.useQuery({ id: listId as string }, { enabled: !!listId });

    const { data: currentUserData } = trpc.user.me.useQuery();
    const currentUserId = currentUserData?.user?.id;

    const taskListInput = useMemo(() => ({ spaceId, projectId, teamId, listId, includeRelations: true, page: 1, pageSize: 500 }), [spaceId, projectId, teamId, listId]);
    const { data: tasksData, isLoading } = trpc.task.list.useQuery(taskListInput, { enabled: !!(spaceId || projectId || teamId || listId) });
    const tasks = useMemo<Task[]>(() => ((tasksData?.items as Task[]) ?? []), [tasksData]);

    const updateCustomFieldMutation = trpc.task.customFields.update.useMutation({
        onSuccess: () => {
            utils.task.list.invalidate(taskListInput);
            toast.success("Location updated");
        },
        onError: (e) => toast.error(e.message)
    });

    const lists = useMemo(() => listsData?.items?.map(list => ({ ...list, color: list.color ?? undefined })) || [], [listsData]);

    const [selectedTask, setSelectedTask] = useState<string | null>(null);
    const [hoveredTask, setHoveredTask] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('default');
    const [clusterMode, setClusterMode] = useState<ClusterMode>('auto');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
    const [expandedSubtaskMode, setExpandedSubtaskMode] = useState<"collapsed" | "expanded" | "separate">("collapsed");
    const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
    const [viewNameDraft, setViewNameDraft] = useState("");

    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<string[]>([]);
    const [filterPriority, setFilterPriority] = useState<string[]>([]);
    const [filterAssignee, setFilterAssignee] = useState<string[]>([]);
    const [showCompleted, setShowCompleted] = useState(false);
    const [showCompletedSubtasks, setShowCompletedSubtasks] = useState(true);
    const [defaultToMeMode, setDefaultToMeMode] = useState(false);
    const [filterGroups, setFilterGroups] = useState<FilterGroup>(() => ({
        id: "root",
        operator: "AND",
        conditions: [],
    }));

    const appliedFilterCount = useMemo(() => {
        const count = (group: FilterGroup): number => {
            let total = 0;
            group.conditions.forEach(c => {
                if ("conditions" in c) {
                    total += count(c as FilterGroup);
                } else {
                    if (hasFilterValue(c as FilterCondition)) total++;
                }
            });
            return total;
        };
        return count(filterGroups);
    }, [filterGroups]);

    const [groupBy, setGroupBy] = useState<string>("none");
    const [groupDirection, setGroupDirection] = useState<"asc" | "desc">("asc");
    const [sortBy, setSortBy] = useState<string>("manual");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(["name", "assignee", "dueDate", "priority", "tags"]));
    const [showEmptyStatuses, setShowEmptyStatuses] = useState(false);
    const [wrapText, setWrapText] = useState(false);
    const [showTaskLocations, setShowTaskLocations] = useState(false);
    const [showSubtaskParentNames, setShowSubtaskParentNames] = useState(false);
    const [showTaskProperties, setShowTaskProperties] = useState(true);
    const [showTasksFromOtherLists, setShowTasksFromOtherLists] = useState(false);
    const [showSubtasksFromOtherLists, setShowSubtasksFromOtherLists] = useState(false);
    const [pinDescription, setPinDescription] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [layoutOptionsOpen, setLayoutOptionsOpen] = useState(false);
    const [viewAutosave, setViewAutosave] = useState(false);
    const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
    const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
    const [assigneesPanelOpen, setAssigneesPanelOpen] = useState(false);
    const [customizePanelOpen, setCustomizePanelOpen] = useState(false);
    const [fieldsPanelOpen, setFieldsPanelOpen] = useState(false);
    const [savedFiltersPanelOpen, setSavedFiltersPanelOpen] = useState(false);
    const [savedFilterName, setSavedFilterName] = useState("");
    const [savedFilters, setSavedFilters] = useState<{ id: string, name: string, config: FilterGroup }[]>([]);
    const [assigneesSearch, setAssigneesSearch] = useState("");
    const [filterSearch, setFilterSearch] = useState("");
    const [customizeViewSubtasksOpen, setCustomizeViewSubtasksOpen] = useState(false);
    const [customizeViewFilterOpen, setCustomizeViewFilterOpen] = useState(false);
    const [customizeViewGroupOpen, setCustomizeViewGroupOpen] = useState(false);
    const [pinView, setPinView] = useState(false);
    const [privateView, setPrivateView] = useState(false);
    const [protectView, setProtectView] = useState(false);
    const [defaultView, setDefaultView] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [createFieldModalOpen, setCreateFieldModalOpen] = useState(false);
    const [createFieldSearch, setCreateFieldSearch] = useState("");
    const [isDefaultViewSettingsModalOpen, setIsDefaultViewSettingsModalOpen] = useState(false);
    const [defaultViewSettingsDraft, setDefaultViewSettingsDraft] = useState<any>(null);
    const [spaceDefaultViewConfig, setSpaceDefaultViewConfig] = useState<any>(null);
    const [savedFiltersSearch, setSavedFiltersSearch] = useState("");
    const [createLocationFieldModalOpen, setCreateLocationFieldModalOpen] = useState(false);
    const [searchLocationField, setSearchLocationField] = useState("");
    const [createLocationName, setCreateLocationName] = useState("");

    // MapView-specific configuration state
    const [colorBy, setColorBy] = useState<"default" | "priority" | "status">("default");
    const [defaultColor, setDefaultColor] = useState<string>(DEFAULT_COLORS[1]); // Default blue
    const [zoomRange, setZoomRange] = useState<[number, number]>([0, 22]);
    const [zoomRangeOpen, setZoomRangeOpen] = useState(false);

    // Task list sidebar state
    const [sidebarSearchVisible, setSidebarSearchVisible] = useState(false);
    const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");
    const [selectedLocationFieldId, setSelectedLocationFieldId] = useState("");
    const [sort, setSort] = useState<{ id: string; desc: boolean }[]>([]);
    const [sortPanelOpen, setSortPanelOpen] = useState(false);
    const [selectedTaskIdForDetail, setSelectedTaskIdForDetail] = useState<string | null>(null);

    const [isCreatingLocationField, setIsCreatingLocationField] = useState(false);
    const [locationPopoverOpen, setLocationPopoverOpen] = useState(false);

    // Popup state for React Portals
    const [popupTarget, setPopupTarget] = useState<{ container: HTMLElement, task: Task } | null>(null);

    const resetViewToDefaults = () => {
        // Implement reset logic
        toast.info("Reseting view to defaults...");
    };

    const updateViewMutation = trpc.view.update.useMutation();
    const createViewMutation = trpc.view.create.useMutation({
        onSuccess: (newView) => {
            toast.success(`Created new view: ${newView.name}`);
            void utils.view.get.invalidate();
        }
    });
    const updateTaskMutation = trpc.task.update.useMutation({
        onSuccess: () => {
            void utils.task.list.invalidate(taskListInput);
            toast.success("Task updated successfully");
        },
        onError: (error) => {
            toast.error(`Failed to update task: ${error.message}`);
        }
    });

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
        const oldName = viewData?.name || "";
        setViewNameDraft(newName); // Local optimistic update
        try {
            await updateViewMutation.mutateAsync({ id: viewId, name: newName.trim() });
            void utils.view.get.invalidate({ id: viewId });
        } catch (e) {
            setViewNameDraft(oldName);
        }
    };
    const { data: viewData } = trpc.view.get.useQuery({ id: viewId as string }, { enabled: !!viewId });

    const currentViewConfig = useMemo(() => ({
        // MapView-specific
        colorBy,
        defaultColor,
        zoomRange,
        selectedLocationFieldId, // Include selectedLocationFieldId in view config

        // View display
        viewMode,
        clusterMode,
        sidebarCollapsed,
        expandedSubtaskMode,
        searchQuery,
        filterStatus,
        filterPriority,
        filterAssignee,
        showCompleted,
        showCompletedSubtasks,
        defaultToMeMode,
        filterGroups,
        groupBy,
        groupDirection,
        sortBy,
        sortDirection,
        visibleColumns: Array.from(visibleColumns),
        showEmptyStatuses,
        wrapText,
        showTaskLocations,
        showSubtaskParentNames,
        showTaskProperties,
        showTasksFromOtherLists,
        showSubtasksFromOtherLists,
        pinDescription,
        viewAutosave,
    }), [
        colorBy, defaultColor, zoomRange, selectedLocationFieldId,
        viewMode, clusterMode, sidebarCollapsed, expandedSubtaskMode, searchQuery, filterStatus,
        filterPriority, filterAssignee, showCompleted, showCompletedSubtasks, defaultToMeMode,
        filterGroups, groupBy, groupDirection, sortBy, sortDirection, visibleColumns,
        showEmptyStatuses, wrapText, showTaskLocations, showSubtaskParentNames, showTaskProperties,
        showTasksFromOtherLists, showSubtasksFromOtherLists, pinDescription, viewAutosave
    ]);

    const isViewDirty = useMemo(() => {
        if (!viewId) return false;
        const now = stableStringify(currentViewConfig);
        return savedSnapshot ? now !== savedSnapshot : false;
    }, [viewId, currentViewConfig, savedSnapshot]);


    const saveViewConfig = useCallback(async (overrides?: any, silent = false) => {
        if (!viewId) return;
        const configToSave = { ...currentViewConfig, ...overrides };
        try {
            const raw = (viewData?.config || {}) as any;
            await updateViewMutation.mutateAsync({
                id: viewId,
                config: { ...raw, mapView: configToSave }
            });
            setSavedSnapshot(JSON.stringify(configToSave));
            if (!silent) toast.success("View saved successfully");
        } catch (e) {
            toast.error("Failed to save view");
        }
    }, [viewId, viewData, currentViewConfig, updateViewMutation]);

    const handleToggleAutosave = useCallback(async (enabled: boolean) => {
        setViewAutosave(enabled);
        await saveViewConfig({ viewAutosave: enabled }, true);
        toast.success(`Autosave ${enabled ? 'enabled' : 'disabled'}`);
    }, [saveViewConfig]);

    const saveAsNewView = async () => {
        if (!viewData || !viewNameDraft.trim()) return;
        try {
            await createViewMutation.mutateAsync({
                name: viewNameDraft.trim(),
                projectId: projectId as string,
                spaceId: spaceId as string,
                type: 'MAP',
                config: { ...viewData.config, name: viewNameDraft.trim(), mapView: currentViewConfig }
            });
        } catch (e) {
            toast.error("Failed to create view");
        }
    };

    const revertViewChanges = () => {
        if (!savedSnapshot) return;
        const config = JSON.parse(savedSnapshot);
        setViewMode(config.viewMode);
        setClusterMode(config.clusterMode);
        setSidebarCollapsed(config.sidebarCollapsed);
        setExpandedSubtaskMode(config.expandedSubtaskMode);
        setSearchQuery(config.searchQuery);
        setFilterStatus(config.filterStatus);
        setFilterPriority(config.filterPriority);
        setFilterAssignee(config.filterAssignee);
        setShowCompleted(config.showCompleted);
        setShowCompletedSubtasks(config.showCompletedSubtasks);
        setDefaultToMeMode(config.defaultToMeMode);
        setFilterGroups(config.filterGroups);
        setGroupBy(config.groupBy);
        setGroupDirection(config.groupDirection);
        setSortBy(config.sortBy);
        setSortDirection(config.sortDirection);
        setVisibleColumns(new Set(config.visibleColumns));
        setShowEmptyStatuses(config.showEmptyStatuses);
        setWrapText(config.wrapText);
        setShowTaskLocations(config.showTaskLocations);
        setShowSubtaskParentNames(config.showSubtaskParentNames);
        setShowTaskProperties(config.showTaskProperties);
        setShowTasksFromOtherLists(config.showTasksFromOtherLists);
        setShowSubtasksFromOtherLists(config.showSubtasksFromOtherLists);
        setPinDescription(config.pinDescription);
        setViewAutosave(config.viewAutosave);
        setSelectedLocationFieldId(config.selectedLocationFieldId || ""); // Revert location field
        toast.success("Changes reverted");
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
            if (viewId && viewData?.config) {
                const raw = (viewData.config ?? {}) as Record<string, any>;
                const mapView = raw.mapView ?? {};
                void updateViewMutation.mutateAsync({ id: viewId, config: { ...raw, mapView: { ...mapView, savedFilterPresets: next } } });
            } else if (typeof window !== "undefined") {
                localStorage.setItem("agentflox_map_saved_filters", JSON.stringify(next));
            }
            return next;
        });
        setSavedFilterName("");
    }, [savedFilterName, filterGroups, viewId, viewData, updateViewMutation]);

    const deleteSavedFilter = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSavedFilters(prev => {
            const next = prev.filter(f => f.id !== id);
            if (viewId && viewData?.config) {
                const raw = (viewData.config ?? {}) as Record<string, any>;
                const mapView = raw.mapView ?? {};
                void updateViewMutation.mutateAsync({ id: viewId, config: { ...raw, mapView: { ...mapView, savedFilterPresets: next } } });
            } else if (typeof window !== "undefined") {
                localStorage.setItem("agentflox_map_saved_filters", JSON.stringify(next));
            }
            return next;
        });
    }, [viewId, viewData, updateViewMutation]);

    const applySavedFilter = (config: FilterGroup) => {
        setFilterGroups(config);
        setSavedFiltersPanelOpen(false);
    };

    // Helper to get icon for custom field type
    const getCustomFieldIcon = (fieldType: string) => {
        const typeMap: Record<string, any> = {
            TEXT: Type, TEXT_AREA: AlignLeft, LONG_TEXT: AlignLeft, NUMBER: Hash, DROPDOWN: LayoutList, DATE: Calendar, CHECKBOX: CheckSquare,
            URL: Globe, EMAIL: Mail, PHONE: Phone, LABELS: Tag, MONEY: DollarSign, FORMULA: FunctionSquare, FILES: Paperclip,
            RELATIONSHIP: Link2, PEOPLE: Users, PROGRESS_AUTO: TrendingUp, PROGRESS_MANUAL: SlidersHorizontal, SUMMARY: FileText,
            PROGRESS_UPDATES: MessageSquare, TRANSLATION: Globe, SENTIMENT: Heart, LOCATION: MapPin, RATING: Star, VOTING: Users,
            SIGNATURE: PenTool, BUTTON: MousePointer, ACTION_ITEMS: ListChecks, CUSTOM_TEXT: Type, CUSTOM_DROPDOWN: LayoutList,
            CATEGORIZE: Target, TSHIRT_SIZE: Users,
        };
        return typeMap[fieldType] || Type;
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

    const locationFields = useMemo(() => (customFields as any[]).filter((cf: any) => cf.type === "LOCATION"), [customFields]);
    const hasLocationField = locationFields.length > 0;

    const createLocationFieldMutation = trpc.customFields.create.useMutation({
        onSuccess: async (newField) => {
            await utils.customFields.list.invalidate();
            toast.success("Location field created successfully");
            setCreateLocationFieldModalOpen(false);
            setLocationPopoverOpen(false);
            setCreateLocationName("");
            setSearchLocationField("");

            // Auto-select the new field by updating the view config (persisting it)
            // We need to ensure the field is added to visible columns or some specific map config
            // For now, let's assume we want to ensure it's "used" in the context of the map view
            // If the map view relies on `usedCustomFieldIds` derived from tasks, we might need a way to force-include it
            // However, the prompt specifically asks to "save on the view config for peristance".
            // Since `MapView` seems to rely on `groupBy` or `showTaskLocations` and specific field usage, 
            // lets add it to `visibleColumns` if that's relevant, or if there's a specific `locationFieldId` config.

            // Looking at the file, there isn't an explicit `locationFieldId` state. 
            // It seems `hasLocationField` is derived from `locationFields` which filters `customFields`.
            // But `FIELD_CONFIG` filters by `usedCustomFieldIds`.

            // If the requirement is to "auto select", it implies there might be a selection mechanism.
            // In the modal, clicking a field does `toast.success('Selected ...')` but no logic.
            // Let's implement a `selectedLocationFieldId` state and save it to view config.

            setSelectedLocationFieldId(newField.id);
            await saveViewConfig({ selectedLocationFieldId: newField.id }, true);
        },
        onError: (err) => {
            toast.error(err.message || "Failed to create location field");
        }
    });

    const handleCreateLocationField = async (name: string) => {
        if (!name.trim()) return;
        setIsCreatingLocationField(true);
        try {
            await createLocationFieldMutation.mutateAsync({
                ...(resolvedWorkspaceId ? { workspaceId: resolvedWorkspaceId } : {}),
                name: name.trim(),
                type: "LOCATION",
                applyTo: ["TASK"],
                config: {},
                ...(context === "list" && listId ? { listId } : {}),
                ...(context === "folder" && folderId ? { folderId } : {}),
                ...(context === "space" && spaceId ? { spaceId } : {}),
                ...(context === "project" && projectId ? { projectId } : {}),
                ...(context === "team" && teamId ? { teamId } : {})
            });
        } finally {
            setIsCreatingLocationField(false);
        }
    };

    // Merge standard fields with custom fields (only those used by tasks)
    const FIELD_CONFIG = useMemo(() => {
        const standardFields = STANDARD_FIELD_CONFIG.map(f => ({ ...f, isCustom: false }));
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

    const groupLabel = useMemo(() => {
        if (groupBy === "none") return "None";
        const opt = [
            { id: "status", label: "Status" },
            { id: "assignee", label: "Assignee" },
            { id: "priority", label: "Priority" },
            { id: "tags", label: "Tags" },
            { id: "dueDate", label: "Due date" },
            { id: "taskType", label: "Task type" },
        ].find(o => o.id === groupBy);
        if (opt) return opt.label;
        const field = FIELD_CONFIG.find(f => f.id === groupBy);
        return field ? field.label : "None";
    }, [groupBy, FIELD_CONFIG]);

    const allAvailableStatuses = useMemo(() => {
        if (listId && listsData?.items) {
            const list = (listsData.items as any[]).find(l => l.id === listId);
            return list?.statuses || [];
        }
        const statuses = new Map<string, { id: string; name: string; color: string }>();
        tasks.forEach(t => {
            if (t.list?.statuses) {
                t.list.statuses.forEach(s => statuses.set(s.id, s));
            } else if (t.status) {
                statuses.set(t.status.id, t.status as any);
            }
        });
        return Array.from(statuses.values());
    }, [listId, listsData, tasks]);

    const allAvailableTags = useMemo(() => {
        const tags = new Set<string>();
        tasks.forEach(t => {
            if (t.tags) t.tags.forEach(tag => tags.add(tag));
        });
        return Array.from(tags).sort();
    }, [tasks]);

    // Auto-select location field
    useEffect(() => {
        if (!selectedLocationFieldId && customFields) {
            const locField = customFields.find((f: any) => f.type === "LOCATION");
            if (locField) setSelectedLocationFieldId(locField.id);
        }
    }, [customFields, selectedLocationFieldId]);

    // Real task data with location parsing
    const tasksWithLocation = useMemo(() => {
        if (!selectedLocationFieldId) return [];

        return tasks.map(task => {
            const cfv = task.customFieldValues?.find((c: any) => c.customFieldId === selectedLocationFieldId);
            let location = null;
            if (cfv?.value) {
                try {
                    const parsed = JSON.parse(cfv.value);
                    if (parsed.lat && parsed.lng) {
                        location = parsed;
                    }
                } catch {
                    // ignore
                }
            }
            return { ...task, location };
        });
    }, [tasks, selectedLocationFieldId]);

    // Derived lists
    const tasksWithValidLocation = useMemo(() => tasksWithLocation.filter(t => t.location), [tasksWithLocation]);
    const tasksWithoutLocation = useMemo(() => tasksWithLocation.filter(t => !t.location), [tasksWithLocation]);

    // Filter logic shared
    const filterTask = useCallback((t: Task) => {
        // Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            if (!((t.title || t.name || "").toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q))) return false;
        }

        // Status
        if (filterStatus.length > 0 && t.status?.id && !filterStatus.includes(t.status.id)) return false;

        // Priority
        if (filterPriority.length > 0 && t.priority && !filterPriority.includes(t.priority)) return false;

        // Assignee
        if (filterAssignee.length > 0) {
            const assigneeIds = t.assignees?.map(a => a.user?.id).filter(Boolean) || [];
            if (filterAssignee.includes("unassigned") && assigneeIds.length === 0) {
                // matches unassigned
            } else if (!assigneeIds.some(id => filterAssignee.includes(id!))) {
                return false;
            }
        }

        // Completed
        if (!showCompleted) {
            const statusName = t.status?.name?.toLowerCase() || "";
            if (statusName === "done" || statusName === "completed") return false;
        }

        // Subtasks
        if (expandedSubtaskMode === "collapsed" && t.parentId) return false;

        // Default to me
        if (defaultToMeMode && currentUserId) {
            const isAssigned = t.assignees?.some(a => a.user?.id === currentUserId);
            if (!isAssigned) return false;
        }

        // Filter Groups
        if (filterGroups.conditions.length > 0 && !evaluateGroup(t, filterGroups)) return false;

        return true;
    }, [searchQuery, filterStatus, filterPriority, filterAssignee, showCompleted, expandedSubtaskMode, defaultToMeMode, currentUserId, filterGroups]);

    // Sidebar: uses tasksWithoutLocation + filters
    const filteredTasks = useMemo(() => {
        return tasksWithoutLocation.filter(filterTask);
    }, [tasksWithoutLocation, filterTask]);

    // Map: uses tasksWithValidLocation + filters
    const filteredMapTasks = useMemo(() => {
        return tasksWithValidLocation.filter(filterTask);
    }, [tasksWithValidLocation, filterTask]);

    const sortedTasks = useMemo(() => {
        let result = [...filteredTasks];

        if (sort.length > 0) {
            result.sort((a, b) => {
                for (const s of sort) {
                    let valA: any, valB: any;

                    if (s.id === "status") {
                        valA = a.status?.name || "";
                        valB = b.status?.name || "";
                    } else if (s.id === "priority") {
                        const priorities = { URGENT: 4, HIGH: 3, NORMAL: 2, LOW: 1, NONE: 0 };
                        valA = priorities[(a.priority as keyof typeof priorities) || "NONE"];
                        valB = priorities[(b.priority as keyof typeof priorities) || "NONE"];
                    } else if (s.id === "name") {
                        valA = (a.title || a.name || "").toLowerCase();
                        valB = (b.title || b.name || "").toLowerCase();
                    } else if (s.id === "dueDate") {
                        valA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
                        valB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
                    } else if (s.id === "assignee") {
                        valA = (a.assignee?.name || "").toLowerCase();
                        valB = (b.assignee?.name || "").toLowerCase();
                    } else if (s.id === "startDate") {
                        valA = a.startDate ? new Date(a.startDate).getTime() : 0;
                        valB = b.startDate ? new Date(b.startDate).getTime() : 0;
                    } else if (s.id === "createdAt") {
                        valA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
                        valB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
                    } else if (s.id === "updatedAt") {
                        valA = (a as any).updatedAt ? new Date((a as any).updatedAt).getTime() : 0;
                        valB = (b as any).updatedAt ? new Date((b as any).updatedAt).getTime() : 0;
                    }

                    if (valA < valB) return s.desc ? 1 : -1;
                    if (valA > valB) return s.desc ? -1 : 1;
                }
                return 0;
            });
        }
        return result;
    }, [filteredTasks, sort]);

    const addFilterGroup = (parentId: string = "root") => {
        const newGroup = {
            id: Math.random().toString(36).substring(7),
            operator: "AND" as const,
            conditions: [{ id: Math.random().toString(36).substring(7), field: "", operator: "is", value: [] }],
        };
        const update = (group: FilterGroup): FilterGroup => {
            if (group.id === parentId) return { ...group, conditions: [...group.conditions, newGroup] };
            return { ...group, conditions: group.conditions.map(c => "conditions" in c ? update(c as FilterGroup) : c) };
        };
        setFilterGroups(update(filterGroups));
    };

    const addFilterCondition = (parentId: string) => {
        const newCondition = { id: Math.random().toString(36).substring(7), field: "", operator: "is", value: [] };
        const update = (group: FilterGroup): FilterGroup => {
            if (group.id === parentId) return { ...group, conditions: [...group.conditions, newCondition] };
            return { ...group, conditions: group.conditions.map(c => "conditions" in c ? update(c as FilterGroup) : c) };
        };
        setFilterGroups(update(filterGroups));
    };

    const removeFilterItem = (id: string) => {
        if (id === "root") { setFilterGroups({ ...filterGroups, conditions: [] }); return; }
        const update = (group: FilterGroup): FilterGroup => ({
            ...group,
            conditions: group.conditions.filter(c => c.id !== id).map(c => "conditions" in c ? update(c as FilterGroup) : c)
        });
        setFilterGroups(update(filterGroups));
    };

    const updateFilterCondition = (id: string, updates: any) => {
        const update = (group: FilterGroup): FilterGroup => ({
            ...group,
            conditions: group.conditions.map(c => {
                if (c.id === id) return { ...c, ...updates };
                return "conditions" in c ? update(c as FilterGroup) : c;
            })
        });
        setFilterGroups(update(filterGroups));
    };

    const updateFilterGroupOperator = (id: string, operator: any) => {
        const update = (group: FilterGroup): FilterGroup => {
            if (group.id === id) return { ...group, operator };
            return { ...group, conditions: group.conditions.map(c => "conditions" in c ? update(c as FilterGroup) : c) };
        };
        setFilterGroups(update(filterGroups));
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
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                                        <Input
                                            placeholder="Search..."
                                            className="pl-8 h-8 text-xs border-zinc-200"
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
                    <ScrollArea className="p-5 text-sm h-[500px]">
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
                                                                                <DropdownMenuContent className="w-64 max-h-[400px] overflow-auto">
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
                                                                                                                <div className="relative">
                                                                                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                                                                                                                    <Input placeholder="Search people..." className="pl-8 h-8 text-[10px]" value={assigneesSearch} onChange={e => setAssigneesSearch(e.target.value)} />
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

    // Initialize map
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        // Create map centered on US
        const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false }).setView([39.8283, -98.5795], 4);

        // Add tile layer based on view mode
        const getTileLayer = () => {
            switch (viewMode) {
                case 'satellite':
                    return L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                        attribution: '&copy; Esri'
                    });
                case 'terrain':
                    return L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; OpenTopoMap'
                    });
                default:
                    return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; OpenStreetMap contributors'
                    });
            }
        };

        getTileLayer().addTo(map);
        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // Update tile layer when view mode changes
    useEffect(() => {
        if (!mapRef.current) return;

        mapRef.current.eachLayer((layer) => {
            if (layer instanceof L.TileLayer) {
                mapRef.current?.removeLayer(layer);
            }
        });

        const getTileLayer = () => {
            switch (viewMode) {
                case 'satellite':
                    return L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                        attribution: '&copy; Esri'
                    });
                case 'terrain':
                    return L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; OpenTopoMap'
                    });
                default:
                    return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; OpenStreetMap contributors'
                    });
            }
        };

        getTileLayer().addTo(mapRef.current);
    }, [viewMode]);

    // Update markers when tasks change
    useEffect(() => {
        if (!mapRef.current) return;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // Create custom icon function
        const createCustomIcon = (task: any, isSelected: boolean) => {
            let color = defaultColor || '#4f46e5';

            if (isSelected) {
                color = '#ef4444'; // Red for selected
            } else if (colorBy === 'priority') {
                if (task.priority === 'URGENT') color = '#ef4444';
                else if (task.priority === 'HIGH') color = '#f97316';
                else if (task.priority === 'NORMAL') color = '#3b82f6';
                else if (task.priority === 'LOW') color = '#71717a';
            } else if (colorBy === 'status' && task.status?.color) {
                color = task.status.color;
            }

            return L.divIcon({
                html: `
                    <div style="position: relative;">
                        <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26c0-8.837-7.163-16-16-16z" fill="${color}" stroke="white" stroke-width="2"/>
                            <circle cx="16" cy="16" r="6" fill="white"/>
                        </svg>
                    </div>
                `,
                className: 'custom-marker',
                iconSize: [32, 42],
                iconAnchor: [16, 42],
                popupAnchor: [0, -42]
            });
        };

        // Add markers for filtered tasks
        filteredMapTasks.forEach(task => {
            if (task.location?.lat && task.location?.lng) {
                const lat = task.location.lat;
                const lng = task.location.lng;
                const isSelected = selectedTask === task.id;

                const icon = createCustomIcon(task, isSelected);
                const marker = L.marker([lat, lng], { icon })
                    .addTo(mapRef.current!);

                // Use an empty container for the popup, we will Portal into it
                const container = document.createElement('div');
                marker.bindPopup(container, { minWidth: 320, maxWidth: 320 });

                marker.on('click', () => {
                    setSelectedTask(task.id);
                });

                marker.on('popupopen', () => {
                    setPopupTarget({ container, task });
                });

                marker.on('popupclose', () => {
                    setPopupTarget(null);
                    // Optional: deselect task on close?
                    // setSelectedTask(null); 
                });

                markersRef.current.push(marker);
            }
        });

        // Fit bounds if there are markers
        if (markersRef.current.length > 0) {
            const group = L.featureGroup(markersRef.current);
            // Check if we already have bounds set or if it's initial load
            // Only fit bounds if we haven't manipulated map manually yet? 
            // For now, always fitting on data change seems okay, or maybe just on mount.
            // mapRef.current.fitBounds(group.getBounds().pad(0.1));
        }
    }, [filteredMapTasks, selectedTask, selectedLocationFieldId, users, allAvailableTags, colorBy, defaultColor]);

    // Handle selected task - open popup and center
    useEffect(() => {
        if (!mapRef.current || !selectedTask) return;

        const selectedMarker = markersRef.current.find((marker, index) => {
            return filteredMapTasks[index]?.id === selectedTask;
        });

        if (selectedMarker) {
            selectedMarker.openPopup();
            mapRef.current.setView(selectedMarker.getLatLng(), mapRef.current.getZoom());
        }
    }, [selectedTask, filteredMapTasks]);

    return (
        <div className="h-full w-full flex flex-col bg-white border border-zinc-200/60 shadow-sm overflow-hidden font-sans relative min-w-0">
            {/* Toolbar – ClickUp layout */}
            <div className="border-b border-zinc-100 bg-white px-3 py-2 shrink-0">
                <>
                    <div className="flex items-center justify-between gap-3 overflow-x-auto">
                        {/* Left: Group, Expanded, Columns */}
                        <div className="flex items-center gap-1.5">
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
                                                filteredTasks.forEach((t: Task) => {
                                                    if (hasSubtasks(t, filteredTasks as Task[])) next.add(t.id);
                                                });
                                                setExpandedParents(next);
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
                                            }}
                                        >
                                            Separate
                                        </button>
                                    </div>
                                    <p className="px-0 pt-2 text-[10px] text-zinc-500">Use this to control how subtasks appear.</p>
                                </PopoverContent>
                            </Popover>
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
                                    setSortPanelOpen(false);
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
                                                {appliedFilterCount > 0 ? `${appliedFilterCount} Filter${appliedFilterCount !== 1 ? "s" : ""} ` : "Filter"}
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

                            <div className="relative w-40 hidden sm:block">
                                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                <Input className="pl-8 h-8 bg-zinc-50/50 border-zinc-200 text-sm rounded-lg" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
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

                            <TaskCreationModal context={spaceId ? "SPACE" : projectId ? "PROJECT" : "GENERAL"} contextId={spaceId || projectId} workspaceId={resolvedWorkspaceId} users={users} lists={lists} defaultListId={listId} availableStatuses={allAvailableStatuses} open={addTaskModalOpen} onOpenChange={setAddTaskModalOpen} trigger={<span className="sr-only" />} />
                        </div>
                    </div>
                </>
            </div>



            <div className="flex-1 relative min-w-0 overflow-hidden">
                {/* No Location Field State (Overlay) */}
                {!hasLocationField && (
                    <div className="absolute inset-0 z-[60] bg-zinc-900/30 backdrop-blur-[2px] flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center space-y-6">
                            <div className="mx-auto h-16 w-16 bg-zinc-100 rounded-full flex items-center justify-center border-4 border-white shadow-sm mb-2">
                                <MapPin className="h-8 w-8 text-zinc-400" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold text-zinc-900">See your tasks visualized on a map.</h2>
                                <p className="text-sm text-zinc-500">
                                    See your tasks visualized on a map.
                                </p>
                            </div>
                            <Popover open={locationPopoverOpen} onOpenChange={setLocationPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        className="w-full h-10 bg-zinc-900 hover:bg-zinc-800 text-white font-medium shadow-lg hover:shadow-xl transition-all"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Location Field
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[440px] p-0 overflow-hidden z-[9999]" align="center" side="bottom" sideOffset={-100}>
                                    <div className="bg-white p-6 space-y-6">
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Field name <span className="text-red-500">*</span></Label>
                                                <div className="relative">
                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                                        <Box className="h-4 w-4 text-zinc-400" />
                                                    </div>
                                                    <Input
                                                        value={createLocationName}
                                                        onChange={e => setCreateLocationName(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter" && createLocationName.trim()) {
                                                                handleCreateLocationField(createLocationName);
                                                            }
                                                        }}
                                                        placeholder="Enter name..."
                                                        className="pl-9 h-10 border-zinc-200"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between gap-3 p-3 bg-violet-50/50 border border-violet-100 rounded-lg text-sm text-zinc-600">
                                                <div className="p-2 bg-white rounded-md shadow-sm border border-violet-100 shrink-0">
                                                    <MapPin className="h-4 w-4 text-violet-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-zinc-900 mb-0.5">Location</div>
                                                    <div className="text-xs text-zinc-500">Field Type</div>
                                                </div>
                                                <ChevronDown className="h-4 w-4 text-zinc-400 opacity-50" />
                                            </div>

                                            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-sm text-yellow-800 flex gap-2 items-start">
                                                <Info className="h-4 w-4 shrink-0 mt-0.5 text-yellow-600" />
                                                <span>
                                                    Custom Fields on the {spaceId ? "Space" : projectId ? "Project" : teamId ? "Team" : folderId ? "Folder" : "Workspace"} level will be added to all {spaceId ? "Folders & Lists" : projectId ? "Folders & Lists" : teamId ? "Folders & Lists" : folderId ? "Lists" : "items"} below
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button variant="ghost" onClick={() => setLocationPopoverOpen(false)}>Cancel</Button>
                                            <Button
                                                className="min-w-[120px]"
                                                onClick={() => handleCreateLocationField(createLocationName || "Location")}
                                                disabled={isCreatingLocationField}
                                            >
                                                {isCreatingLocationField ? "Adding..." : "Add Location"}
                                            </Button>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                )}

                {/* React Portal for Leaflet Popup */}
                {popupTarget && createPortal(
                    <TaskMapPopup
                        task={popupTarget.task}
                        onUpdate={(taskId: string, updates: any) => {
                            if (updates.location) {
                                const val = JSON.stringify(updates.location);
                                if (selectedLocationFieldId) {
                                    updateCustomFieldMutation.mutateAsync({
                                        taskId,
                                        customFieldId: selectedLocationFieldId,
                                        value: val
                                    });
                                }
                            } else {
                                updateTaskMutation.mutateAsync({ id: taskId, ...updates });
                            }
                        }}
                        users={users}
                        allAvailableTags={allAvailableTags}
                        onMaximize={(id: string) => setSelectedTaskIdForDetail(id)}
                        session={session}
                    />,
                    popupTarget.container
                )}

                {/* Location Field Search/Create Modal */}
                <Dialog open={createLocationFieldModalOpen} onOpenChange={setCreateLocationFieldModalOpen}>
                    <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden z-[9999]">
                        {!hasLocationField ? (
                            <div className="bg-white p-6 space-y-6">
                                <div className="text-center space-y-2">
                                    <div className="mx-auto h-12 w-12 bg-zinc-50 rounded-full flex items-center justify-center mb-2">
                                        <MapPin className="h-6 w-6 text-zinc-400" />
                                    </div>
                                    <DialogTitle className="text-center text-lg font-bold text-zinc-900">
                                        See your tasks visualized on a map.
                                    </DialogTitle>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Field name <span className="text-red-500">*</span></Label>
                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                                <Box className="h-4 w-4 text-zinc-400" />
                                            </div>
                                            <Input
                                                value={createLocationName}
                                                onChange={e => setCreateLocationName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && createLocationName.trim()) {
                                                        handleCreateLocationField(createLocationName);
                                                    }
                                                }}
                                                placeholder="Enter name..."
                                                className="pl-9 h-10 border-zinc-200"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 p-3 bg-violet-50/50 border border-violet-100 rounded-lg text-sm text-zinc-600">
                                        <div className="p-2 bg-white rounded-md shadow-sm border border-violet-100 shrink-0">
                                            <MapPin className="h-4 w-4 text-violet-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-zinc-900 mb-0.5">Location</div>
                                            <div className="text-xs text-zinc-500">Field Type</div>
                                        </div>
                                        <ChevronDown className="h-4 w-4 text-zinc-400 opacity-50" />
                                    </div>

                                    <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-sm text-yellow-800 flex gap-2 items-start">
                                        <Info className="h-4 w-4 shrink-0 mt-0.5 text-yellow-600" />
                                        <span>
                                            Custom Fields on the {spaceId ? "Space" : projectId ? "Project" : teamId ? "Team" : folderId ? "Folder" : "Workspace"} level will be added to all {spaceId ? "Folders & Lists" : projectId ? "Folders & Lists" : teamId ? "Folders & Lists" : folderId ? "Lists" : "items"} below
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button variant="ghost" onClick={() => setCreateLocationFieldModalOpen(false)}>Cancel</Button>
                                    <Button
                                        className="min-w-[120px]"
                                        onClick={() => handleCreateLocationField(createLocationName || "Location")}
                                        disabled={isCreatingLocationField}
                                    >
                                        {isCreatingLocationField ? "Adding..." : "Add Location"}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col max-h-[500px]">
                                <div className="p-3 border-b border-zinc-100">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                        <Input
                                            placeholder="Search or create..."
                                            value={searchLocationField}
                                            onChange={e => setSearchLocationField(e.target.value)}
                                            className="pl-9 h-9 border-zinc-100 bg-zinc-50/50 focus-visible:bg-white transition-colors"
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && searchLocationField.trim()) {
                                                    const exists = locationFields.find((f: any) => f.name.toLowerCase() === searchLocationField.toLowerCase());
                                                    if (!exists) {
                                                        handleCreateLocationField(searchLocationField);
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="p-2">
                                    <p className="px-2 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                        Location Fields
                                    </p>
                                    <div className="space-y-0.5">
                                        {locationFields
                                            .filter((f: any) => !searchLocationField || f.name.toLowerCase().includes(searchLocationField.toLowerCase()))
                                            .map((field: any) => (
                                                <button
                                                    key={field.id}
                                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-100 text-left transition-colors group"
                                                    onClick={() => {
                                                        // Select logic would go here if we were selecting. For now, just close as fields are auto-applied.
                                                        setCreateLocationFieldModalOpen(false);
                                                        toast.success(`Selected ${field.name} `);
                                                    }}
                                                >
                                                    <div className="h-8 w-8 rounded-md bg-zinc-100 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm border border-transparent group-hover:border-zinc-200 transition-all">
                                                        <MapPin className="h-4 w-4 text-zinc-500" />
                                                    </div>
                                                    <span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900">{field.name}</span>
                                                </button>
                                            ))}
                                        {searchLocationField && !locationFields.some((f: any) => f.name.toLowerCase() === searchLocationField.toLowerCase()) && (
                                            <button
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-violet-50 text-left transition-colors group"
                                                onClick={() => handleCreateLocationField(searchLocationField)}
                                            >
                                                <div className="h-8 w-8 rounded-md bg-violet-100 flex items-center justify-center group-hover:bg-violet-200 transition-colors">
                                                    <Plus className="h-4 w-4 text-violet-600" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-violet-700">Create "{searchLocationField}"</span>
                                                    <span className="text-xs text-violet-500">Add as new location field</span>
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Map Container */}
                <div ref={mapContainerRef} className="absolute inset-0 z-0" />

                {/* Map Controls */}
                <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                    {/* View Mode Selector */}
                    <div className="bg-white rounded-lg shadow-lg border border-zinc-200 flex overflow-hidden">
                        <button
                            className={cn("px-4 py-2 text-sm font-medium border-r border-zinc-200", viewMode === 'default' ? "bg-indigo-50 text-indigo-600" : "hover:bg-zinc-50")}
                            onClick={() => setViewMode('default')}
                        >
                            <Globe className="h-4 w-4 inline mr-2" />
                            Map
                        </button>
                        <button
                            className={cn("px-4 py-2 text-sm font-medium border-r border-zinc-200", viewMode === 'satellite' ? "bg-indigo-50 text-indigo-600" : "hover:bg-zinc-50")}
                            onClick={() => setViewMode('satellite')}
                        >
                            Satellite
                        </button>
                        <button
                            className={cn("px-4 py-2 text-sm font-medium", viewMode === 'terrain' ? "bg-indigo-50 text-indigo-600" : "hover:bg-zinc-50")}
                            onClick={() => setViewMode('terrain')}
                        >
                            Terrain
                        </button>
                    </div>
                </div>

                {/* Custom Zoom Controls */}
                <div
                    className="absolute top-4 z-20 flex flex-col gap-2 transition-all duration-300"
                    style={{ right: sidebarCollapsed ? '5rem' : '416px' }}
                >
                    <button
                        onClick={() => {
                            const mapDiv = mapContainerRef.current?.parentElement;
                            if (mapDiv) {
                                if (!document.fullscreenElement) {
                                    mapDiv.requestFullscreen().catch(err => {
                                        toast.error(`Error attempting to enable full - screen mode: ${err.message} `);
                                    });
                                } else {
                                    document.exitFullscreen();
                                }
                            }
                        }}
                        className="bg-white rounded-lg shadow-lg border border-zinc-200 p-2.5 text-zinc-600 hover:bg-zinc-50 transition-colors"
                        title="Toggle Fullscreen"
                    >
                        <Maximize className="h-4 w-4" />
                    </button>

                    <div className="bg-white rounded-lg shadow-lg border border-zinc-200 flex flex-col overflow-hidden">
                        <button
                            onClick={() => mapRef.current?.zoomIn()}
                            className="p-2.5 hover:bg-zinc-50 text-zinc-600 transition-colors"
                            title="Zoom In"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                        <div className="h-px bg-zinc-100 mx-2" />
                        <button
                            onClick={() => mapRef.current?.zoomOut()}
                            className="p-2.5 hover:bg-zinc-50 text-zinc-600 transition-colors"
                            title="Zoom Out"
                        >
                            <Minus className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Sidebar Task List */}
                <div className={cn(
                    "absolute top-0 bottom-0 bg-white border border-zinc-200 flex flex-col z-20 transition-all duration-300",
                    sidebarCollapsed ? "right-0 w-12" : "right-0 w-96"
                )}>
                    {sidebarCollapsed ? (
                        <div
                            className="flex flex-col items-center py-3 gap-4 h-full cursor-pointer hover:bg-zinc-50 transition-colors"
                            onClick={() => setSidebarCollapsed(false)}
                        >
                            <div className="p-1">
                                <ListIcon className="h-5 w-5 text-zinc-400" />
                            </div>
                            <span
                                className="text-xs font-semibold text-zinc-500 tracking-wider uppercase"
                                style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
                            >
                                Tasks
                            </span>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="p-3 border-b border-zinc-100">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-medium text-zinc-700">Tasks without location</h3>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setSidebarSearchVisible(!sidebarSearchVisible)}
                                            className="p-1.5 hover:bg-zinc-100 rounded transition-colors"
                                            title="Search tasks"
                                        >
                                            <Search className="h-4 w-4 text-zinc-500" />
                                        </button>
                                        <button
                                            onClick={() => setSidebarCollapsed(true)}
                                            className="p-1.5 hover:bg-zinc-100 rounded transition-colors"
                                            title="Collapse sidebar"
                                        >
                                            <ChevronRight className="h-4 w-4 text-zinc-500" />
                                        </button>
                                    </div>
                                </div>

                                {/* Search Bar */}
                                {sidebarSearchVisible && (
                                    <div className="mb-3">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                                            <Input
                                                placeholder="Search tasks..."
                                                value={sidebarSearchQuery}
                                                onChange={(e) => setSidebarSearchQuery(e.target.value)}
                                                className="pl-8 h-8 text-sm"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Sort By & Count BoardView Style */}
                                <div className="flex items-center justify-between text-xs">
                                    <Popover open={sortPanelOpen} onOpenChange={(open) => {
                                        setSortPanelOpen(open);
                                    }}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={cn(
                                                    "h-7 gap-1.5 px-2 text-[10px] font-medium border-zinc-200 transition-colors cursor-pointer rounded-lg bg-zinc-50 hover:bg-zinc-100",
                                                    sort.length > 0 ? "bg-violet-50 text-violet-700 border-violet-200" : "text-zinc-600 border-zinc-200"
                                                )}
                                            >
                                                {sort.length === 1 ? (
                                                    sort[0].desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                                                ) : sort.length > 1 ? (
                                                    <ChevronsUpDown className="h-3 w-3" />
                                                ) : (
                                                    <ArrowUpDown className="h-3 w-3" />
                                                )}
                                                <span className="hidden sm:inline truncate max-w-[80px]">
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
                                        <PopoverContent align="start" className="w-[240px] p-1.5 rounded-xl shadow-xl border-zinc-200/60" sideOffset={8}>
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
                                                                {isSelected &&
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <div className="flex flex-col items-center -space-y-1">
                                                                                <ChevronUp
                                                                                    className={`h - 3.5 w - 3.5 ${currentSort.desc
                                                                                        ? 'text-zinc-800'
                                                                                        : 'text-zinc-300'
                                                                                        } `}
                                                                                />
                                                                                <ChevronDown
                                                                                    className={`h - 3.5 w - 3.5 ${currentSort.desc
                                                                                        ? 'text-zinc-300'
                                                                                        : 'text-zinc-800'
                                                                                        } `}
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
                                    <span className="text-zinc-500">{sortedTasks.length} task{sortedTasks.length !== 1 ? 's' : ''}</span>
                                </div>
                            </div>

                            {/* Task List */}
                            <div className="flex-1 overflow-y-auto">
                                <div className="p-2 space-y-1">
                                    {sortedTasks
                                        .filter(task => !sidebarSearchQuery ||
                                            (task.title || task.name || '').toLowerCase().includes(sidebarSearchQuery.toLowerCase())
                                        )
                                        .map((task) => (
                                            <div
                                                key={task.id}
                                                className={cn(
                                                    "group flex items-center gap-2 px-2 py-2 rounded-md transition-colors cursor-pointer",
                                                    selectedTask === task.id
                                                        ? "bg-zinc-50"
                                                        : "hover:bg-zinc-50"
                                                )}
                                                onClick={() => setSelectedTaskIdForDetail(task.id)}
                                                onMouseEnter={() => setHoveredTask(task.id)}
                                                onMouseLeave={() => setHoveredTask(null)}
                                            >
                                                {/* Circle Icon */}
                                                <Circle className="h-4 w-4 text-zinc-400 shrink-0" />

                                                {/* Task Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[11px] text-zinc-400 truncate">
                                                        {task.list?.name || 'No list'}
                                                    </div>
                                                    <div className="text-sm text-zinc-700 truncate font-medium">
                                                        {task.title || task.name}
                                                    </div>
                                                </div>

                                                {/* Target Icon */}
                                                <button
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-zinc-100 rounded"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedTask(task.id);
                                                    }}
                                                    title="Focus on map"
                                                >
                                                    <Target className="h-3.5 w-3.5 text-zinc-400" />
                                                </button>
                                            </div>
                                        ))}

                                    {sortedTasks.filter(task => !sidebarSearchQuery ||
                                        (task.title || task.name || '').toLowerCase().includes(sidebarSearchQuery.toLowerCase())
                                    ).length === 0 && (
                                            <div className="p-12 text-center">
                                                <MapPin className="h-12 w-12 text-zinc-300 mx-auto mb-3" />
                                                <p className="text-sm text-zinc-500 font-medium mb-1">No tasks found</p>
                                                <p className="text-xs text-zinc-400">
                                                    {sidebarSearchQuery ? "Try adjusting your search" : "Add location data to tasks to see them on the map"}
                                                </p>
                                            </div>
                                        )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Loading State */}
                {
                    isLoading && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-40">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                <p className="text-sm text-zinc-600">Loading map data...</p>
                            </div>
                        </div>
                    )
                }
            </div>
            {/* Customize view panel (ClickUp-style) */}
            {
                customizePanelOpen && !layoutOptionsOpen && (
                    <>
                        <div className="absolute inset-0 bg-black/20 z-40" onClick={() => setCustomizePanelOpen(false)} aria-hidden />
                        <div className="absolute bottom-0 right-0 h-full w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col">
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

                                    {/* Section 1: Map Specifics */}
                                    <div className="space-y-1">

                                        <Dialog open={createLocationFieldModalOpen} onOpenChange={setCreateLocationFieldModalOpen}>
                                            <DialogTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2"
                                                >
                                                    <span className="text-sm text-zinc-800">Location field</span>
                                                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                                                </button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden z-[9999]">
                                                {/* Reusing the same content logic as the main modal */}
                                                {!hasLocationField ? (
                                                    <div className="bg-white p-6 space-y-6">
                                                        <div className="text-center space-y-2">
                                                            <div className="mx-auto h-12 w-12 bg-zinc-50 rounded-full flex items-center justify-center mb-2">
                                                                <MapPin className="h-6 w-6 text-zinc-400" />
                                                            </div>
                                                            <DialogTitle className="text-center text-lg font-bold text-zinc-900">
                                                                See your tasks visualized on a map.
                                                            </DialogTitle>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Field name <span className="text-red-500">*</span></Label>
                                                                <div className="relative">
                                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                                                        <Box className="h-4 w-4 text-zinc-400" />
                                                                    </div>
                                                                    <Input
                                                                        value={createLocationName}
                                                                        onChange={e => setCreateLocationName(e.target.value)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === "Enter" && createLocationName.trim()) {
                                                                                handleCreateLocationField(createLocationName);
                                                                            }
                                                                        }}
                                                                        placeholder="Enter name..."
                                                                        className="pl-9 h-10 border-zinc-200"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-3 p-3 bg-violet-50/50 border border-violet-100 rounded-lg text-sm text-zinc-600">
                                                                <div className="p-2 bg-white rounded-md shadow-sm border border-violet-100 shrink-0">
                                                                    <MapPin className="h-4 w-4 text-violet-500" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-medium text-zinc-900 mb-0.5">Location</div>
                                                                    <div className="text-xs text-zinc-500">Field Type</div>
                                                                </div>
                                                                <ChevronDown className="h-4 w-4 text-zinc-400 opacity-50" />
                                                            </div>

                                                            {context !== "list" && (
                                                                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-sm text-yellow-800 flex gap-2 items-start">
                                                                    <Info className="h-4 w-4 shrink-0 mt-0.5 text-yellow-600" />
                                                                    <span>
                                                                        Custom Fields on the {context === "folder" ? "Folder" : context === "space" ? "Space" : context === "project" ? "Project" : context === "team" ? "Team" : "Workspace"} level will be added to all {context === "folder" ? "Lists" : "Folders & Lists"} below
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex justify-end gap-2 pt-2">
                                                            <Button variant="ghost" onClick={() => setCreateLocationFieldModalOpen(false)}>Cancel</Button>
                                                            <Button
                                                                className="min-w-[120px]"
                                                                onClick={() => handleCreateLocationField(createLocationName || "Location")}
                                                                disabled={isCreatingLocationField}
                                                            >
                                                                {isCreatingLocationField ? "Adding..." : "Add Location"}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col max-h-[500px]">
                                                        <div className="p-3 border-b border-zinc-100">
                                                            <div className="relative">
                                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                                                <Input
                                                                    placeholder="Search or create..."
                                                                    value={searchLocationField}
                                                                    onChange={e => setSearchLocationField(e.target.value)}
                                                                    className="pl-9 h-9 border-zinc-100 bg-zinc-50/50 focus-visible:bg-white transition-colors"
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter" && searchLocationField.trim()) {
                                                                            const exists = locationFields.find((f: any) => f.name.toLowerCase() === searchLocationField.toLowerCase());
                                                                            if (!exists) {
                                                                                handleCreateLocationField(searchLocationField);
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="p-2">
                                                            <p className="px-2 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                                                Location Fields
                                                            </p>
                                                            <div className="space-y-0.5">
                                                                {locationFields
                                                                    .filter((f: any) => !searchLocationField || f.name.toLowerCase().includes(searchLocationField.toLowerCase()))
                                                                    .map((field: any) => (
                                                                        <button
                                                                            key={field.id}
                                                                            className={cn(
                                                                                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors group",
                                                                                selectedLocationFieldId === field.id ? "bg-violet-50 text-violet-900" : "hover:bg-zinc-100"
                                                                            )}
                                                                            onClick={() => {
                                                                                setSelectedLocationFieldId(field.id);
                                                                                updateViewProperty('config', {
                                                                                    ...viewData?.config,
                                                                                    mapView: {
                                                                                        ...currentViewConfig,
                                                                                        selectedLocationFieldId: field.id
                                                                                    }
                                                                                });
                                                                                setCreateLocationFieldModalOpen(false);
                                                                                toast.success(`Selected ${field.name} `);
                                                                            }}
                                                                        >
                                                                            <div className={cn(
                                                                                "h-8 w-8 rounded-md flex items-center justify-center transition-all border",
                                                                                selectedLocationFieldId === field.id ? "bg-violet-200 border-violet-300" : "bg-zinc-100 border-transparent group-hover:bg-white group-hover:border-zinc-200"
                                                                            )}>
                                                                                <MapPin className={cn("h-4 w-4", selectedLocationFieldId === field.id ? "text-violet-700" : "text-zinc-500")} />
                                                                            </div>
                                                                            <span className="text-sm font-medium">{field.name}</span>
                                                                            {selectedLocationFieldId === field.id && (
                                                                                <CheckCircle2 className="h-4 w-4 text-violet-600 ml-auto" />
                                                                            )}
                                                                        </button>
                                                                    ))}
                                                                {searchLocationField && !locationFields.some((f: any) => f.name.toLowerCase() === searchLocationField.toLowerCase()) && (
                                                                    <button
                                                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-violet-50 text-left transition-colors group"
                                                                        onClick={() => handleCreateLocationField(searchLocationField)}
                                                                    >
                                                                        <div className="h-8 w-8 rounded-md bg-violet-100 flex items-center justify-center group-hover:bg-violet-200 transition-colors">
                                                                            <Plus className="h-4 w-4 text-violet-600" />
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sm font-medium text-violet-700">Create "{searchLocationField}"</span>
                                                                            <span className="text-xs text-violet-500">Add as new location field</span>
                                                                        </div>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </DialogContent>
                                        </Dialog>
                                        <Popover open={customizeViewGroupOpen} onOpenChange={setCustomizeViewGroupOpen}>
                                            <PopoverTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <span className="text-sm text-zinc-800">Color tasks by</span>
                                                        {colorBy === "default" && (
                                                            <div className="h-4 w-4 rounded-full border border-zinc-200" style={{ backgroundColor: defaultColor }} />
                                                        )}
                                                    </span>
                                                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent side="left" align="start" className="w-[280px] p-3 rounded-xl shadow-xl border-zinc-200/60" sideOffset={16}>
                                                <div className="px-1 py-1 mb-2">
                                                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Color tasks by</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <div
                                                        className={cn(
                                                            "flex items-center justify-between gap-2 px-2 py-2 text-sm rounded-md cursor-pointer transition-colors",
                                                            colorBy === "default" ? "bg-violet-50 text-violet-700" : "text-zinc-700 hover:bg-zinc-100"
                                                        )}
                                                        onClick={() => setColorBy("default")}
                                                    >
                                                        <span className="font-medium">Default</span>
                                                        {colorBy === "default" && <div className="h-1.5 w-1.5 rounded-full bg-violet-600" />}
                                                    </div>
                                                    {colorBy === "default" && (
                                                        <div className="px-2 py-2 flex flex-wrap gap-2">
                                                            {DEFAULT_COLORS.map((color) => (
                                                                <button
                                                                    key={color}
                                                                    type="button"
                                                                    className={cn(
                                                                        "h-7 w-7 rounded-full border-2 transition-all",
                                                                        defaultColor === color ? "border-zinc-900 scale-110" : "border-transparent hover:scale-105"
                                                                    )}
                                                                    style={{ backgroundColor: color }}
                                                                    onClick={() => setDefaultColor(color)}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div
                                                        className={cn(
                                                            "flex items-center justify-between gap-2 px-2 py-2 text-sm rounded-md cursor-pointer transition-colors",
                                                            colorBy === "priority" ? "bg-violet-50 text-violet-700" : "text-zinc-700 hover:bg-zinc-100"
                                                        )}
                                                        onClick={() => setColorBy("priority")}
                                                    >
                                                        <span className="font-medium">Priority</span>
                                                        {colorBy === "priority" && <div className="h-1.5 w-1.5 rounded-full bg-violet-600" />}
                                                    </div>
                                                    <div
                                                        className={cn(
                                                            "flex items-center justify-between gap-2 px-2 py-2 text-sm rounded-md cursor-pointer transition-colors",
                                                            colorBy === "status" ? "bg-violet-50 text-violet-700" : "text-zinc-700 hover:bg-zinc-100"
                                                        )}
                                                        onClick={() => setColorBy("status")}
                                                    >
                                                        <span className="font-medium">Status</span>
                                                        {colorBy === "status" && <div className="h-1.5 w-1.5 rounded-full bg-violet-600" />}
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                        <Popover open={zoomRangeOpen} onOpenChange={setZoomRangeOpen}>
                                            <PopoverTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2"
                                                >
                                                    <span className="text-sm text-zinc-800">Zoom range</span>
                                                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent side="left" align="start" className="w-[320px] p-4 rounded-xl shadow-xl border-zinc-200/60" sideOffset={16}>
                                                <div className="space-y-4">
                                                    <div className="px-1">
                                                        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Zoom Range</span>
                                                    </div>
                                                    <div className="px-2">
                                                        <div className="flex items-center justify-between text-sm font-medium text-zinc-700 mb-3">
                                                            <span>{zoomRange[0]}</span>
                                                            <span className="text-xs text-zinc-400">-</span>
                                                            <span>{zoomRange[1]}</span>
                                                        </div>
                                                        <Slider
                                                            value={zoomRange}
                                                            onValueChange={(val) => setZoomRange(val as [number, number])}
                                                            min={0}
                                                            max={22}
                                                            step={1}
                                                            className="w-full"
                                                        />
                                                        <div className="flex items-center justify-between text-xs text-zinc-400 mt-2">
                                                            <span>Global</span>
                                                            <span>Local</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                        <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors">
                                            <span className="text-sm text-zinc-800">Show closed tasks</span>
                                            <Switch checked={showCompleted} onCheckedChange={setShowCompleted} />
                                        </div>
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2"
                                            onClick={() => { setLayoutOptionsOpen(true); }}
                                        >
                                            <span className="text-sm text-zinc-800">More options</span>
                                            <ChevronRight className="h-4 w-4 text-zinc-400" />
                                        </button>
                                    </div>

                                    <div className="h-px bg-zinc-100 my-2" />

                                    {/* Section 2: Data/View */}
                                    <div className="space-y-1">
                                        <Popover open={customizeViewFilterOpen} onOpenChange={setCustomizeViewFilterOpen}>
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
                                                {renderFilterContent({ onClose: () => setCustomizeViewFilterOpen(false) })}
                                            </PopoverContent>
                                        </Popover>

                                        <Popover open={customizeViewSubtasksOpen} onOpenChange={setCustomizeViewSubtasksOpen}>
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

                                    {/* Section 3: View Settings */}
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors">
                                            <div className="flex items-center gap-2">
                                                <Save className="h-4 w-4 text-zinc-400" />
                                                <span className="text-sm text-zinc-800">Autosave for me</span>
                                            </div>
                                            <Switch checked={viewAutosave} onCheckedChange={handleToggleAutosave} />
                                        </div>
                                        <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors">
                                            <div className="flex items-center gap-2">
                                                <Pin className="h-4 w-4 text-zinc-400" />
                                                <span className="text-sm text-zinc-800">Pin view</span>
                                            </div>
                                            <Switch checked={pinView} onCheckedChange={(val) => { setPinView(val); updateViewProperty('isPinned', val); }} />
                                        </div>
                                        <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors">
                                            <div className="flex items-center gap-2">
                                                <Lock className="h-4 w-4 text-zinc-400" />
                                                <span className="text-sm text-zinc-800">Private view</span>
                                            </div>
                                            <Switch checked={privateView} onCheckedChange={(val) => { setPrivateView(val); updateViewProperty('isPrivate', val); }} />
                                        </div>
                                        <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4 text-zinc-400" />
                                                <span className="text-sm text-zinc-800">Protect view</span>
                                            </div>
                                            <Switch checked={protectView} onCheckedChange={(val) => { setProtectView(val); updateViewProperty('isLocked', val); }} />
                                        </div>
                                        <div className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md transition-colors">
                                            <div className="flex items-center gap-2">
                                                <Home className="h-4 w-4 text-zinc-400" />
                                                <span className="text-sm text-zinc-800">Set as default view</span>
                                            </div>
                                            <Switch checked={defaultView} onCheckedChange={(val) => { setDefaultView(val); updateViewProperty('isDefault', val); }} />
                                        </div>
                                    </div>

                                    <div className="h-px bg-zinc-100 my-2" />

                                    {/* Section 4: Actions */}
                                    <div className="space-y-1">
                                        <button type="button" className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2" onClick={() => {
                                            const url = `${window.location.origin}${window.location.pathname}?v = ${viewId} `;
                                            navigator.clipboard?.writeText(url);
                                            toast.success("Link copied to clipboard");
                                        }}>
                                            <span className="flex items-center gap-2"><Link className="h-4 w-4 text-zinc-400" />Copy link to view</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2"
                                        >
                                            <span className="flex items-center gap-2"><Star className="h-4 w-4 text-zinc-400" />Favorite</span>
                                            <ChevronRight className="h-4 w-4 text-zinc-400" />
                                        </button>
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2"
                                            onClick={() => setIsShareModalOpen(true)}
                                        >
                                            <span className="flex items-center gap-2"><Users className="h-4 w-4 text-zinc-400" />Sharing & Permissions</span>
                                            <ChevronRight className="inline h-3 w-3 ml-1 text-zinc-400" />
                                        </button>
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2"
                                        >
                                            <span className="flex items-center gap-2"><Trash2 className="h-4 w-4 text-zinc-400" />Delete view</span>
                                        </button>
                                    </div>
                                </div>
                            </ScrollArea>
                        </div>
                    </>
                )
            }
            {
                layoutOptionsOpen && (
                    <>
                        <div className="absolute inset-0 bg-black/20 z-40" onClick={() => setCustomizePanelOpen(false)} aria-hidden />
                        <div className="absolute bottom-0 right-0 h-full w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col">
                            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                                <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1 cursor-pointer" onClick={() => { setLayoutOptionsOpen(false); setCustomizePanelOpen(true); }}>
                                    <ArrowRight className="h-4 w-4 rotate-180" />
                                </Button>
                                <h3 className="font-semibold text-zinc-900">Layout options</h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={() => { setLayoutOptionsOpen(false); setCustomizePanelOpen(false); }}><X className="h-4 w-4" /></Button>
                            </div>
                            <ScrollArea className="flex-1 min-h-0">
                                <div className="p-3 space-y-4 pb-24">
                                    <div className="space-y-0.5">
                                        <p className="text-[11px] font-medium text-zinc-400 mb-1 px-2">Page & card layout</p>
                                        <div className="flex items-center justify-between py-2 px-2 hover:bg-zinc-50 rounded cursor-pointer transition-colors"
                                            onClick={() => { setCustomizeViewGroupOpen(true); setLayoutOptionsOpen(false); }}>
                                            <span className="text-sm text-zinc-800">Color tasks by</span>
                                            <ChevronRight className="h-4 w-4 text-zinc-400" />
                                        </div>
                                        <div className="flex items-center justify-between py-2 px-2 hover:bg-zinc-50 rounded cursor-pointer transition-colors"
                                            onClick={() => { setZoomRangeOpen(true); setLayoutOptionsOpen(false); }}>
                                            <span className="text-sm text-zinc-800">Zoom range</span>
                                            <ChevronRight className="h-4 w-4 text-zinc-400" />
                                        </div>
                                    </div>

                                    <div className="h-px bg-zinc-100" />

                                    <div className="space-y-0.5">
                                        <p className="text-[11px] font-medium text-zinc-400 mb-1 px-2">Task visibility</p>
                                        <div className="flex items-center justify-between py-2 px-2 hover:bg-zinc-50 rounded transition-colors">
                                            <span className="text-sm text-zinc-800">Show closed tasks</span>
                                            <Switch checked={showCompleted} onCheckedChange={setShowCompleted} />
                                        </div>
                                        <div className="flex items-center justify-between py-2 px-2 hover:bg-zinc-50 rounded transition-colors">
                                            <span className="text-sm text-zinc-800">Show tasks from other Lists</span>
                                            <Switch checked={showTasksFromOtherLists} onCheckedChange={setShowTasksFromOtherLists} />
                                        </div>
                                        <div className="flex items-center justify-between py-2 px-2 hover:bg-zinc-50 rounded transition-colors">
                                            <span className="text-sm text-zinc-800">Show subtasks from other Lists</span>
                                            <Switch checked={showSubtasksFromOtherLists} onCheckedChange={setShowSubtasksFromOtherLists} />
                                        </div>
                                    </div>

                                    <div className="h-px bg-zinc-100" />

                                    <div className="space-y-0.5">
                                        <p className="text-[11px] font-medium text-zinc-400 mb-1 px-2">View settings</p>
                                        <div className="flex items-center justify-between py-2 px-2 hover:bg-zinc-50 rounded transition-colors">
                                            <span className="text-sm flex items-center gap-2"><UserRound className="h-4 w-4 text-zinc-400" />Default to Me Mode</span>
                                            <Switch checked={defaultToMeMode} onCheckedChange={setDefaultToMeMode} />
                                        </div>
                                        <div className="flex items-center justify-between py-2 px-2 hover:bg-zinc-50 rounded cursor-pointer transition-colors">
                                            <span className="text-sm flex items-center gap-2"><ArrowRight className="h-4 w-4 text-zinc-400" />Move view</span>
                                            <ChevronRight className="h-4 w-4 text-zinc-400" />
                                        </div>
                                        <div className="flex items-center justify-between py-2 px-2 hover:bg-zinc-50 rounded cursor-pointer transition-colors">
                                            <span className="text-sm flex items-center gap-2"><Copy className="h-4 w-4 text-zinc-400" />Duplicate view</span>
                                            <ChevronRight className="h-4 w-4 text-zinc-400" />
                                        </div>
                                    </div>

                                    <div className="h-px bg-zinc-100" />

                                    <div
                                        className="flex items-center gap-2 py-2.5 px-2 hover:bg-zinc-50 rounded cursor-pointer transition-colors"
                                        onClick={resetViewToDefaults}
                                    >
                                        <RefreshCcw className="h-4 w-4 text-zinc-400" />
                                        <span className="text-sm text-zinc-800">Reset view to defaults</span>
                                    </div>
                                </div>
                            </ScrollArea>
                        </div>
                    </>
                )
            }

            {/* Create field modal – field types and Add existing fields */}
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
                        </div>
                    </>
                )
            }

            {/* Assignees panel – image 8 */}
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
                        </div>
                    </>
                )
            }

            {/* Task Detail Modal */}
            {selectedTaskIdForDetail && (
                <TaskDetailModal
                    taskId={selectedTaskIdForDetail}
                    open={!!selectedTaskIdForDetail}
                    onOpenChange={(open) => {
                        if (!open) setSelectedTaskIdForDetail(null);
                    }}
                />
            )}
        </div >
    );
}
