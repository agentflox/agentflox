"use client";

import { useState, useRef, useCallback, useEffect, useMemo, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Minus,
    ZoomIn,
    ZoomOut,
    Maximize,
    Save,
    Loader2,
    Trash2,
    Move,
    RotateCcw,
    Download,
    Upload,
    Palette,
    Type,
    Share2,
    Layout,
    Maximize2,
    Minimize2,
    FileText,
    Tag,
    Filter,
    Settings,
    Users,
    SlidersHorizontal,
    Spline,
    Circle,
    Flag,
    Calendar,
    Box,
    Search,
    X,
    ChevronDown,
    CornerDownRight,
    ChevronUp,
    ChevronRight,
    Link2,
    AlignLeft,
    Check,
    Info,
    ListTodo,
    ArrowRight,
    GripVertical,
    UserRound,
    RefreshCcw,
    Lock,
    Settings2,
    Share,
    Copy,
    ExternalLink,
    EyeOff,
    Bell,
    BellOff,
    Pin,
    ShieldCheck,
    Home,
    Star,
    Link,
    LayoutTemplate,
    Hash,
    CheckSquare,
    Globe,
    Mail,
    Phone,
    DollarSign,
    FunctionSquare,
    Paperclip,
    TrendingUp,
    Heart,
    MapPin,
    Map as MapIcon,
    MessageSquare,
    Clock,
    CalendarClock,
    Hourglass,
    PenTool,
    MousePointer,
    ListChecks,
    Bot,
    MousePointer2,
} from "lucide-react";
import {
    ReactFlow,
    MiniMap,
    Background,
    BackgroundVariant,
    Panel,
    Controls,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    MarkerType,
    ReactFlowProvider,
    ColorMode,
    Handle,
    Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { SingleDateCalendar } from "@/components/ui/date-picker";
import { TagsModal } from "@/entities/task/components/TagsModal";
import { parseEncodedTag } from "@/entities/task/utils/tags";
import { DndContext, useDraggable, useSensor, useSensors, PointerSensor, MouseSensor, TouchSensor, DragEndEvent } from '@dnd-kit/core';
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ViewToolbarClosedPopover } from "@/features/dashboard/components/shared/ViewToolbarClosedPopover";
import { ViewToolbarSaveDropdown } from "@/features/dashboard/components/shared/ViewToolbarSaveDropdown";
import { ShareViewPermissionModal } from "@/features/dashboard/components/shared/ShareViewPermissionModal";
import { TaskCreationModal } from "@/entities/task/components/TaskCreationModal";
import { TaskDetailModal } from "@/entities/task/components/TaskDetailModal";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AssigneeSelector } from "@/entities/task/components/AssigneeSelector";
import { DestinationPicker } from "@/entities/task/components/DestinationPicker";
import { DuplicateTaskModal } from "@/entities/task/components/DuplicateTaskModal";
import { TaskTypeIcon } from "@/entities/task/components/TaskTypeIcon";
import { CustomFieldRenderer } from "@/entities/task/components/CustomFieldRenderer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
    AlertTriangle,
    CircleMinus,
    CopyPlus,
    LayoutList,
    MoreHorizontal,
    Target,
    List,
    Folder,
    Briefcase,
    Square,
} from "lucide-react";
import type {
    FilterOperator,
    FilterCondition,
    FilterGroup
} from "./listViewTypes";
import {
    FILTER_OPTIONS,
    FIELD_OPERATORS,
    STANDARD_FIELD_CONFIG
} from "./listViewConstants";
import { format } from "date-fns";
import { DescriptionEditor } from "@/entities/shared/components/DescriptionEditor";
import stableStringify from "json-stable-stringify";

interface MindMapNodeData {
    id: string;
    text: string;
    x: number;
    y: number;
    parentId?: string;
    color?: string;
    shape?: 'rectangle' | 'rounded' | 'circle' | 'diamond';
    fontSize?: number;
    notes?: string;
    description?: string;
    collapsed?: boolean;
    tags?: string[];
    isRoot?: boolean;
    statusColor?: string;
    entityType?: 'task' | 'list' | 'folder' | 'project' | 'space' | 'note';
    taskId?: string;
    taskIds?: string[];
    childCount?: number;
}

const TasksListModal = ({ nodeId, anchorRect, onClose, workspaceId, projectId, onTaskSelect, nodes }: any) => {
    const node = nodes?.find((n: any) => n.id === nodeId);
    const taskIds = useMemo(() => {
        if (!node) return [];
        if (node.taskId) return [node.taskId];
        return node.taskIds || [];
    }, [node]);

    const { data: tasksData, isLoading } = trpc.task.list.useQuery(
        { workspaceId: workspaceId as string, taskIds },
        { enabled: !!nodeId && taskIds.length > 0 }
    );
    const tasks = (tasksData as any)?.items || [];

    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

    const modalRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    if (!nodeId || !anchorRect) return null;

    return (
        <div
            ref={modalRef}
            style={{
                position: 'fixed',
                left: anchorRect.right + 12,
                top: Math.max(80, anchorRect.top - 150),
                zIndex: 100
            }}
            className="animate-in fade-in slide-in-from-left-2 duration-200"
        >
            <div className="flex flex-col w-[260px] max-h-[400px] rounded-2xl border border-zinc-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.15)] bg-white/95 backdrop-blur-xl ring-1 ring-black/5 overflow-hidden">
                <div className="p-4 border-b border-zinc-100 bg-white/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-50 rounded-lg">
                            <ListTodo className="h-3.5 w-3.5 text-indigo-600" />
                        </div>
                        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Linked Tasks</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-100 rounded-full transition-colors group">
                        <X className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-600" />
                    </button>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-2">
                                <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Loading...</span>
                            </div>
                        ) : tasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                                <p className="text-xs font-medium text-zinc-400">No linked tasks found for this node.</p>
                            </div>
                        ) : (
                            tasks.map((task: any) => (
                                <div
                                    key={task.id}
                                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50 group cursor-pointer transition-all border border-transparent hover:border-zinc-100"
                                    onClick={() => onTaskSelect(task.id)}
                                >
                                    <div className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: task.status?.color || '#94a3b8' }} />
                                    <span className="flex-1 text-[13px] font-semibold text-zinc-700 truncate group-hover:text-indigo-600 transition-colors">{task.title}</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setExpandedTaskId(task.id); }}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-zinc-200"
                                    >
                                        <Maximize2 className="h-3.5 w-3.5 text-zinc-400" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
                {expandedTaskId && (
                    <TaskDetailModal
                        open={true}
                        onOpenChange={(open) => !open && setExpandedTaskId(null)}
                        taskId={expandedTaskId}
                    />
                )}
            </div>
        </div>
    );
};

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
        CURRENCY: DollarSign,
        FORMULA: FunctionSquare,
        FILES: Paperclip,
        ATTACHMENT: Paperclip,
        RELATIONSHIP: Link2,
        PEOPLE: Users,
        VOTING: Users,
        PROGRESS_AUTO: TrendingUp,
        PROGRESS_BAR: TrendingUp,
        PROGRESS_MANUAL: SlidersHorizontal,
        SUMMARY: FileText,
        PROGRESS_UPDATES: MessageSquare,
        CHAT: MessageSquare,
        TRANSLATION: Globe,
        SENTIMENT: Heart,
        LOCATION: MapPin,
        MAP_PIN: MapPin,
        CLOCK: Clock,
        CALENDAR_CLOCK: CalendarClock,
        HOURGLASS: Hourglass,
        RATING: Star,
        SIGNATURE: PenTool,
        BUTTON: MousePointer,
        ACTION_ITEMS: ListChecks,
        CATEGORIZE: Target,
        TSHIRT_SIZE: Users,
    };
    return typeMap[fieldType] || Box;
};

interface MindMapViewProps {
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    viewId?: string;
    initialConfig?: any;
    allAvailableTags?: string[];
    folderId?: string;
    listId?: string;
    entity?: any;
    context?: "space" | "project" | "team" | "folder" | "list";
    selectedTaskIdFromParent?: string | null;
    onTaskSelect?: (taskId: string | null) => void;

    // Shared toolbar state (optional, passed from sync logic)
    filtersPanelOpen?: boolean;
    setFiltersPanelOpen?: (open: boolean) => void;
    appliedFilterCount?: number;
    filterGroups?: FilterGroup;
    setFilterGroups?: (groups: FilterGroup) => void;
    renderFilterContent?: (props: { onClose: () => void }) => React.ReactNode;
    showCompleted?: boolean;
    setShowCompleted?: (show: boolean) => void;
    showCompletedSubtasks?: boolean;
    setShowCompletedSubtasks?: (show: boolean) => void;
    customizePanelOpen?: boolean;
    setCustomizePanelOpen?: (open: boolean) => void;
    addTaskModalOpen?: boolean;
    setAddTaskModalOpen?: (open: boolean) => void;
    searchQuery?: string;
    setSearchQuery?: (query: string) => void;
    groupBy?: string;
    setGroupBy?: (groupBy: string) => void;
    groupDirection?: "asc" | "desc";
    setGroupDirection?: (dir: "asc" | "desc") => void;
    expandedSubtaskMode?: "collapsed" | "expanded" | "separate";
    setExpandedSubtaskMode?: (mode: "collapsed" | "expanded" | "separate") => void;

    // Shared data
    resolvedWorkspaceId?: string;
    users?: any[];
    agents?: any[];
    lists?: any[];
    customFields?: any[];
    allAvailableStatuses?: any[];
    availableTaskTypes?: any[];

    // Save view props
    isViewDirty?: boolean;
    viewAutosave?: boolean;
    isPending?: boolean;
    onSave?: () => void;
    onToggleAutosave?: (val: boolean) => void;
    onSaveAsNewView?: (name: string) => void;
    onRevertChanges?: () => void;
    isSaveAsNewPending?: boolean;

    // Misc
    fieldsPanelOpen?: boolean;
    setFieldsPanelOpen?: (open: boolean) => void;
    assigneesPanelOpen?: boolean;
    setAssigneesPanelOpen?: (open: boolean) => void;
}

const NODE_COLORS = [
    { name: 'Indigo', bg: 'bg-indigo-50', border: 'border-indigo-500', text: 'text-indigo-900' },
    { name: 'Blue', bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-900' },
    { name: 'Green', bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-900' },
    { name: 'Yellow', bg: 'bg-yellow-50', border: 'border-yellow-500', text: 'text-yellow-900' },
    { name: 'Orange', bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-900' },
    { name: 'Red', bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-900' },
    { name: 'Purple', bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-900' },
    { name: 'Pink', bg: 'bg-pink-50', border: 'border-pink-500', text: 'text-pink-900' },
];

const LAYOUTS = {
    radial: 'Radial',
    horizontal: 'Horizontal',
    vertical: 'Vertical',
    organic: 'Organic'
};


// React Flow Custom Node
function MindMapFlowNode({ data, selected }: { data: any, selected: boolean }) {
    const { node, onUpdate, onDelete, onAddChild, onToggleCollapse, onChangeColor, onChangeShape, allAvailableTags, onExpand, workspaceId, spaceId, projectId, onConvertToTask, onShowTasks, onTaskUpdate, session, viewAutosave } = data;
    const isRoot = !node.parentId;

    const [isEditing, setIsEditing] = useState(false);
    const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
    const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);
    const [descriptionDraft, setDescriptionDraft] = useState('');
    const [optimisticContent, setOptimisticContent] = useState<string | null>(null);
    const [optimisticText, setOptimisticText] = useState<string | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [draftText, setDraftText] = useState(node.text);
    const debouncedDescription = useDebounce(descriptionDraft, 1000);

    const nodeColor = NODE_COLORS.find(c => c.name === node.color) || NODE_COLORS[0];

    const getShapeClasses = () => {
        switch (node.shape || 'rounded') {
            case 'rectangle': return 'rounded-none';
            case 'circle': return 'rounded-full';
            case 'diamond': return 'rotate-45';
            default: return 'rounded-xl';
        }
    };

    const getContentClasses = () => {
        if (node.shape === 'diamond') return '-rotate-45';
        return '';
    };

    const getTaskId = useCallback(() => node.taskId || (node.taskIds && node.taskIds.length > 0 ? node.taskIds[0] : undefined), [node.taskId, node.taskIds]);

    useEffect(() => {
        if (optimisticText === node.text) setOptimisticText(null);
    }, [node.text, optimisticText]);

    const handleCommitText = useCallback((text: string) => {
        setOptimisticText(text);
        if (text === node.text) return;
        onUpdate(node.id, { text });
        if (node.entityType === 'task') {
            const tid = getTaskId();
            if (tid) onTaskUpdate?.(tid, { title: text });
        }
    }, [node.id, node.text, node.entityType, onUpdate, getTaskId, onTaskUpdate]);

    const saveDescription = useCallback((content: string) => {
        const currentContent = node.entityType === 'task' ? (node.description || '') : (node.notes || '');
        if (content === currentContent) return;
        setOptimisticContent(content);
        if (node.entityType === 'task') {
            onUpdate(node.id, { description: content });
            const tid = getTaskId();
            if (tid) onTaskUpdate?.(tid, { description: content });
        } else {
            onUpdate(node.id, { notes: content });
        }
    }, [node.id, node.entityType, node.description, node.notes, onUpdate, onTaskUpdate, getTaskId]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    useEffect(() => {
        if (isDescriptionModalOpen) {
            const content = optimisticContent ?? (node.entityType === 'task' ? (node.description || '') : (node.notes || ''));
            setDescriptionDraft(content);
        } else {
            setOptimisticContent(null);
        }
    }, [isDescriptionModalOpen, node.entityType, node.description, node.notes, optimisticContent]);

    useEffect(() => {
        if (!isDescriptionModalOpen || !isDescriptionEditing || !viewAutosave) return;
        saveDescription(debouncedDescription);
    }, [debouncedDescription, isDescriptionModalOpen, isDescriptionEditing, viewAutosave, saveDescription]);

    useEffect(() => {
        if (!isDescriptionModalOpen && isDescriptionEditing) {
            saveDescription(descriptionDraft);
            setIsDescriptionEditing(false);
        }
    }, [isDescriptionModalOpen, isDescriptionEditing, descriptionDraft, saveDescription]);

    return (
        <div className={cn("group flex flex-col items-center pointer-events-auto", isRoot ? "z-20" : "z-10")}>
            <Handle type="target" position={Position.Left} className="opacity-0" />
            <div
                className={cn(
                    "relative shadow-md border-2 flex items-center justify-center transition-all bg-white",
                    node.shape === 'circle' ? "min-w-[120px] min-h-[120px] w-[120px] h-[120px]" : node.shape === 'diamond' ? "min-w-[102px] min-h-[102px] w-[102px] h-[102px]" : "min-w-[140px] min-h-[60px]",
                    getShapeClasses(),
                    nodeColor.bg,
                    isRoot ? nodeColor.border : `${nodeColor.border} border-opacity-60 hover:border-opacity-100`,
                    selected && "ring-2 ring-indigo-500 ring-offset-2",
                    node.collapsed && "opacity-75"
                )}
            >
                {/* Drag Handle (Actually handled by React Flow now) */}
                <div className="absolute -left-3 -top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 cursor-grab active:cursor-grabbing bg-white rounded-full border border-zinc-200 shadow-sm z-30">
                    <Move className="h-3.5 w-3.5 text-zinc-500" />
                </div>

                {!isRoot && (
                    <div
                        className={cn("absolute text-zinc-300 hover:text-zinc-600 rounded cursor-pointer transition-all z-20", node.shape === 'circle' ? "right-3 top-16" : node.shape === 'diamond' ? "right-2 top-6 -rotate-45" : "right-2 top-6")}
                        onClick={(e) => { e.stopPropagation(); onExpand?.(node.id); }}
                    >
                        <Maximize2 className="h-3 w-3" />
                    </div>
                )}

                <div className={cn("w-full px-4 py-2 flex items-center justify-center gap-2", (node.shape === 'circle' || node.shape === 'diamond') && "flex-col py-4", getContentClasses())}>
                    {node.isRoot && (
                        <>
                            {node.entityType === 'list' && <List className="h-4 w-4 text-zinc-500 shrink-0" />}
                            {node.entityType === 'folder' && <Folder className="h-4 w-4 text-zinc-500 shrink-0" />}
                            {node.entityType === 'project' && <Briefcase className="h-4 w-4 text-zinc-500 shrink-0" />}
                            {node.entityType === 'space' && <Layout className="h-4 w-4 text-zinc-500 shrink-0" />}
                        </>
                    )}
                    {!node.isRoot && (
                        node.statusColor ? (<div className="h-3 w-3 rounded-[3px] shrink-0" style={{ backgroundColor: node.statusColor }} />) : (<Square className="h-3 w-3 text-zinc-300 shrink-0" />)
                    )}

                    {isEditing ? (
                        <textarea
                            ref={inputRef}
                            value={draftText}
                            onChange={(e) => setDraftText(e.target.value)}
                            onMouseDown={(e) => e.stopPropagation()}
                            onBlur={() => { setIsEditing(false); handleCommitText(draftText); }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setIsEditing(false); handleCommitText(draftText); }
                                if (e.key === 'Escape') setIsEditing(false);
                            }}
                            className={cn("bg-transparent text-center text-sm font-medium focus:outline-none w-full resize-none cursor-text", nodeColor.text, node.shape === 'diamond' ? "max-w-[72px]" : node.shape === 'circle' ? "max-w-[80px]" : "")}
                            style={{ fontSize: `${node.fontSize || 14}px` }}
                            rows={1}
                        />
                    ) : (
                        <div
                            onDoubleClick={() => { setDraftText(optimisticText ?? node.text); setIsEditing(true); }}
                            className={cn("text-center text-sm font-medium cursor-text whitespace-pre-wrap break-words min-h-[1.5em] w-full flex items-center justify-center", nodeColor.text, node.shape === 'diamond' ? "max-w-[72px]" : node.shape === 'circle' ? "max-w-[80px]" : "")}
                            style={{ fontSize: `${node.fontSize || 14}px` }}
                        >
                            {(optimisticText ?? node.text) || (<span className="opacity-40 italic text-[10px] uppercase tracking-widest">Empty</span>)}
                        </div>
                    )}
                </div>
            </div>

            {/* Collapse Indicator */}
            {data.childCount > 0 && (
                <button
                    onClick={() => onToggleCollapse(node.id)}
                    className={cn("absolute left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-current rounded-full flex items-center justify-center text-xs font-bold hover:scale-110 transition-transform z-30", node.shape === 'diamond' ? "-bottom-[30px]" : "-bottom-3")}
                >
                    {node.collapsed ? '+' : '−'}
                </button>
            )}

            {/* Action Buttons */}
            {(optimisticText ?? node.text) && (
                <div className="absolute -right-12 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-7 w-7 rounded-full border-zinc-200 hover:border-indigo-400 hover:text-indigo-600 bg-white shadow-sm">
                                <Palette className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                            <div className="p-2">
                                <Label className="text-xs text-zinc-500 mb-2 block">Color</Label>
                                <div className="grid grid-cols-4 gap-1">
                                    {NODE_COLORS.map((color) => (
                                        <button key={color.name} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChangeColor(node.id, color.name); }} className={cn("w-8 h-8 rounded border-2 transition-all", color.bg, node.color === color.name ? color.border : 'border-transparent hover:border-zinc-300')} title={color.name} />
                                    ))}
                                </div>
                            </div>
                            <DropdownMenuSeparator />
                            <div className="p-2">
                                <Label className="text-xs text-zinc-500 mb-2 block">Shape</Label>
                                <div className="grid grid-cols-4 gap-1">
                                    {(['rounded', 'rectangle', 'circle', 'diamond'] as const).map((shape) => (
                                        <Tooltip key={shape}>
                                            <TooltipTrigger asChild>
                                                <Button variant={node.shape === shape ? 'primary' : 'outline'} size="icon" className="h-8 w-8 transition-all" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChangeShape(node.id, shape); }}>
                                                    {shape === 'rounded' && <Square className="h-3.5 w-3.5 rounded-sm" />}
                                                    {shape === 'rectangle' && <Square className="h-3.5 w-3.5" />}
                                                    {shape === 'circle' && <Circle className="h-3.5 w-3.5" />}
                                                    {shape === 'diamond' && <Square className="h-3.5 w-3.5 rotate-45 scale-75" />}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="text-[10px] capitalize">{shape}</TooltipContent>
                                        </Tooltip>
                                    ))}
                                </div>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-full border-zinc-200 hover:border-indigo-400 hover:text-indigo-600 bg-white shadow-sm" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); onAddChild(node.id, rect); }} title="Add child node">
                        <Plus className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                        variant="outline"
                        size="icon"
                        className={cn("h-7 w-7 rounded-full border-zinc-200 hover:border-indigo-400 hover:text-indigo-600 bg-white shadow-sm", (node.entityType === 'task' ? node.description : node.notes) ? "text-indigo-600 border-indigo-200" : "")}
                        title={node.entityType === 'task' ? "Node description" : "Node notes"}
                        onClick={() => { setIsDescriptionEditing(false); setIsDescriptionModalOpen(true); }}
                    >
                        <FileText className="h-3.5 w-3.5" />
                    </Button>

                    <Dialog open={isDescriptionModalOpen} onOpenChange={setIsDescriptionModalOpen}>
                        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                            <DialogHeader className="px-6 py-4 border-b border-zinc-100 flex-row items-center justify-between space-y-0">
                                <DialogTitle className="text-zinc-900 font-semibold">{node.entityType === 'task' ? "Description" : "Notes"}</DialogTitle>
                                {!isDescriptionEditing && (
                                    <Button variant="ghost" size="sm" className="h-8 px-3 mr-3 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium rounded-lg" onClick={() => setIsDescriptionEditing(true)}>
                                        <PenTool className="h-3.5 w-3.5 mr-1.5" /> Edit
                                    </Button>
                                )}
                            </DialogHeader>
                            <div className="flex-1 overflow-y-auto p-6 min-h-[200px]">
                                {isDescriptionEditing ? (
                                    <div className="space-y-4">
                                        {node.entityType === 'task' ? (
                                            <div className="border border-zinc-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:border-indigo-500/20 transition-all">
                                                <DescriptionEditor content={descriptionDraft} onChange={setDescriptionDraft} editable={true} spaceId={spaceId} projectId={projectId} workspaceId={workspaceId} collaboration={{ enabled: true, documentId: getTaskId() || node.id, documentType: 'task', user: { id: session?.id || 'anonymous', name: session?.name || session?.email || 'User', color: session?.color } }} />
                                            </div>
                                        ) : (
                                            <textarea className="w-full min-h-[300px] p-4 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/20 transition-all resize-none" placeholder="Write something..." value={descriptionDraft} onChange={(e) => setDescriptionDraft(e.target.value)} autoFocus />
                                        )}
                                    </div>
                                ) : (
                                    <div className="prose prose-sm max-w-none prose-zinc prose-p:leading-relaxed prose-pre:bg-zinc-50 prose-pre:border prose-pre:border-zinc-200">
                                        {node.entityType === 'task' ? (
                                            (optimisticContent ?? node.description) ? (<div dangerouslySetInnerHTML={{ __html: optimisticContent ?? node.description }} />) : (<p className="text-zinc-400 italic">No description provided.</p>)
                                        ) : (
                                            (optimisticContent ?? node.notes) ? (<div className="whitespace-pre-wrap text-zinc-600">{optimisticContent ?? node.notes}</div>) : (<p className="text-zinc-400 italic">No notes provided.</p>)
                                        )}
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>

                    {onConvertToTask && (
                        <Button variant="outline" size="icon" className="h-7 w-7 rounded-full border-zinc-200 hover:border-indigo-400 hover:text-indigo-600 bg-white shadow-sm" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); onConvertToTask?.(node.id, rect); }} title="Create Task">
                            <ListTodo className="h-3.5 w-3.5" />
                        </Button>
                    )}

                    {(node.taskId || (node.taskIds && node.taskIds.length > 0)) && (
                        <Button variant="outline" size="icon" className="h-7 w-7 rounded-full border-zinc-200 hover:border-indigo-400 hover:text-indigo-600 bg-white shadow-sm" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); onShowTasks?.(node.id, rect); }} title="View created tasks">
                            <Maximize2 className="h-3.5 w-3.5" />
                        </Button>
                    )}

                    <TagsModal
                        tags={node.tags || []}
                        onChange={(newTags) => {
                            onUpdate(node.id, { tags: newTags });
                            if (node.entityType === 'task') {
                                const tid = getTaskId();
                                if (tid) onTaskUpdate?.(tid, { tags: newTags });
                            }
                        }}
                        allAvailableTags={allAvailableTags}
                        trigger={<Button variant="outline" size="icon" className={cn("h-7 w-7 rounded-full border-zinc-200 hover:border-indigo-400 hover:text-indigo-600 bg-white shadow-sm", (node.tags && node.tags.length > 0) ? "text-indigo-600 border-indigo-200" : "")} title="Edit tags"><Tag className="h-3.5 w-3.5" /></Button>}
                    />

                    {!isRoot && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50" onClick={() => onDelete(node.id)} title="Delete node"><Trash2 className="h-3.5 w-3.5" /></Button>
                    )}
                </div>
            )}
            <Handle type="source" position={Position.Right} className="opacity-0" />
        </div>
    );
}

// Draggable node component with optimized drag performance
function DraggableNode({
    node,
    onUpdate,
    onDelete,
    onAddChild,
    onToggleCollapse,
    onChangeColor,
    onChangeShape,
    isRoot,
    childCount,
    allAvailableTags,
    onClick,
    isSelected,
    onExpand,
    workspaceId,
    spaceId,
    projectId,
    onConvertToTask,
    onShowTasks,
    onTaskUpdate,
    session,
    viewAutosave,
    zoom = 100
}: {
    node: MindMapNodeData;
    onUpdate: (id: string, updates: Partial<MindMapNodeData>) => void;
    onDelete: (id: string) => void;
    onAddChild: (parentId: string, anchorRect?: DOMRect) => void;
    onToggleCollapse: (id: string) => void;
    onChangeColor: (id: string, color: string) => void;
    onChangeShape: (id: string, shape: MindMapNodeData['shape']) => void;
    isRoot?: boolean;
    childCount: number;
    allAvailableTags?: string[];
    onClick?: (id: string, isMulti?: boolean) => void;
    isSelected?: boolean;
    onExpand?: (id: string) => void;
    workspaceId?: string;
    spaceId?: string;
    projectId?: string;
    onConvertToTask?: (id: string, anchorRect: DOMRect) => void;
    onShowTasks?: (id: string, anchorRect: DOMRect) => void;
    onTaskUpdate?: (taskId: string, updates: any) => void;
    session?: any;
    viewAutosave?: boolean;
    zoom?: number;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
    const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);
    const [descriptionDraft, setDescriptionDraft] = useState('');
    const [optimisticContent, setOptimisticContent] = useState<string | null>(null);
    const [optimisticText, setOptimisticText] = useState<string | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [draftText, setDraftText] = useState(node.text);

    const debouncedDescription = useDebounce(descriptionDraft, 1000);

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: node.id,
        data: node
    });

    const scale = zoom / 100;
    const style = transform ? {
        // Apply drag transform to all nodes, including the root,
        // so the root visually moves during drag in freeform mode.
        // Divide by scale to ensure it follows the mouse perfectly.
        transform: `translate3d(${transform.x / scale}px, ${transform.y / scale}px, 0)`,
        zIndex: 100
    } : undefined;

    const nodeColor = NODE_COLORS.find(c => c.name === node.color) || NODE_COLORS[0];
    const getShapeClasses = () => {
        switch (node.shape || 'rounded') {
            case 'rectangle':
                return 'rounded-none';
            case 'circle':
                return 'rounded-full';
            case 'diamond':
                return 'rotate-45';
            default:
                return 'rounded-xl';
        }
    };

    const getContentClasses = () => {
        if (node.shape === 'diamond') {
            return '-rotate-45';
        }
        return '';
    };

    const getTaskId = useCallback(() => node.taskId || (node.taskIds && node.taskIds.length > 0 ? node.taskIds[0] : undefined), [node.taskId, node.taskIds]);

    // Sync optimisticText when node.text updates
    useEffect(() => {
        if (optimisticText === node.text) {
            setOptimisticText(null);
        }
    }, [node.text, optimisticText]);

    // Commit changes to the task name
    const handleCommitText = useCallback((text: string) => {
        // Optimistically update to avoid flicker
        setOptimisticText(text);

        // Only trigger update if the text is changed from the source of truth
        if (text === node.text) return;

        onUpdate(node.id, { text });

        if (node.entityType === 'task') {
            const tid = getTaskId();
            if (tid) {
                onTaskUpdate?.(tid, { title: text });
            }
        }
    }, [node.id, node.text, node.entityType, onUpdate, getTaskId, onTaskUpdate]);

    // Save function for description/notes with optimistic update
    const saveDescription = useCallback((content: string) => {
        const currentContent = node.entityType === 'task'
            ? (node.description || '')
            : (node.notes || '');

        // Don't save if nothing changed
        if (content === currentContent) return;

        // Optimistic update - update UI immediately
        setOptimisticContent(content);

        // Save based on entity type (async, non-blocking)
        if (node.entityType === 'task') {
            onUpdate(node.id, { description: content });
            const tid = getTaskId();
            if (tid) {
                onTaskUpdate?.(tid, { description: content });
            }
        } else {
            onUpdate(node.id, { notes: content });
        }
    }, [node.id, node.entityType, node.description, node.notes, onUpdate, onTaskUpdate, getTaskId]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // FIX 1: Sync descriptionDraft when modal opens or node content changes
    useEffect(() => {
        if (isDescriptionModalOpen) {
            // Use optimistic content if available, otherwise use node content
            const content = optimisticContent ?? (node.entityType === 'task'
                ? (node.description || '')
                : (node.notes || ''));
            setDescriptionDraft(content);
        } else {
            // Clear optimistic content when modal closes
            setOptimisticContent(null);
        }
    }, [isDescriptionModalOpen, node.entityType, node.description, node.notes, optimisticContent]);

    // FIX 2: Autosave with correct dependencies (only when viewAutosave is enabled)
    useEffect(() => {
        // Don't autosave if modal is closed, not editing, or autosave is disabled
        if (!isDescriptionModalOpen || !isDescriptionEditing || !viewAutosave) return;

        saveDescription(debouncedDescription);
    }, [debouncedDescription, isDescriptionModalOpen, isDescriptionEditing, viewAutosave, saveDescription]);

    // FIX 3: Save when modal closes (always save pending changes)
    useEffect(() => {
        // When modal was open and is now closing, save any pending changes
        if (!isDescriptionModalOpen && isDescriptionEditing) {
            saveDescription(descriptionDraft);
            setIsDescriptionEditing(false);
        }
    }, [isDescriptionModalOpen, isDescriptionEditing, descriptionDraft, saveDescription]);

    return (
        <div
            ref={setNodeRef}
            style={{ left: node.x, top: node.y, position: 'absolute', ...style }}
            className={cn(
                "group flex flex-col items-center pointer-events-auto",
                isRoot ? "z-20" : "z-10"
            )}
        >
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    onClick?.(node.id, e.ctrlKey || e.metaKey || e.shiftKey);
                }}
                className={cn(
                    "relative shadow-md border-2 flex items-center justify-center",
                    isDragging ? "transition-none" : "transition-all",
                    // FIX: Conditional sizing based on shape
                    node.shape === 'circle'
                        ? "min-w-[120px] min-h-[120px] w-[120px] h-[120px]"
                        : node.shape === 'diamond'
                            ? "min-w-[102px] min-h-[102px] w-[102px] h-[102px]"
                            : "min-w-[140px] min-h-[60px]",
                    getShapeClasses(),
                    nodeColor.bg,
                    isRoot ? nodeColor.border : `${nodeColor.border} border-opacity-60 hover:border-opacity-100`,
                    (isDragging) && "shadow-xl ring-2 ring-indigo-200 scale-105",
                    isSelected && "ring-2 ring-indigo-500 ring-offset-2",
                    node.collapsed && "opacity-75"
                )}
            >
                {/* Drag Handle */}
                <div
                    className="absolute -left-3 -top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 cursor-grab active:cursor-grabbing bg-white rounded-full border border-zinc-200 shadow-sm z-30"
                    {...listeners}
                    {...attributes}
                >
                    <Move className="h-3.5 w-3.5 text-zinc-500" />
                </div>

                {/* Maximize Icon - Outside content div to avoid rotation issues */}
                {!isRoot && (
                    <div
                        className={cn(
                            "absolute text-zinc-300 hover:text-zinc-600 rounded cursor-pointer transition-all z-20",
                            node.shape === 'circle' ? "right-3 top-16" :
                                node.shape === 'diamond' ? "right-2 top-6 -rotate-45" :
                                    "right-2 top-6"
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            onExpand?.(node.id);
                        }}
                    >
                        <Maximize2 className="h-3 w-3" />
                    </div>
                )}

                {/* Node Content */}
                <div className={cn(
                    "w-full px-4 py-2 flex items-center justify-center gap-2",
                    (node.shape === 'circle' || node.shape === 'diamond') && "flex-col py-4",
                    getContentClasses()
                )}>
                    {/* Icon based on type */}
                    {node.isRoot && (
                        <>
                            {node.entityType === 'list' && <List className="h-4 w-4 text-zinc-500 shrink-0" />}
                            {node.entityType === 'folder' && <Folder className="h-4 w-4 text-zinc-500 shrink-0" />}
                            {node.entityType === 'project' && <Briefcase className="h-4 w-4 text-zinc-500 shrink-0" />}
                            {node.entityType === 'space' && <Layout className="h-4 w-4 text-zinc-500 shrink-0" />}
                        </>
                    )}

                    {!node.isRoot && (
                        node.statusColor ? (
                            <div className="h-3 w-3 rounded-[3px] shrink-0" style={{ backgroundColor: node.statusColor }} />
                        ) : (
                            <Square className="h-3 w-3 text-zinc-300 shrink-0" />
                        )
                    )}

                    {isEditing ? (
                        <textarea
                            ref={inputRef}
                            value={draftText}
                            onChange={(e) => setDraftText(e.target.value)}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            onBlur={() => {
                                setIsEditing(false);
                                handleCommitText(draftText);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    setIsEditing(false);
                                    handleCommitText(draftText);
                                }
                                if (e.key === 'Escape') {
                                    setIsEditing(false);
                                }
                            }}
                            className={cn(
                                "bg-transparent text-center text-sm font-medium focus:outline-none w-full resize-none cursor-text",
                                nodeColor.text,
                                node.shape === 'diamond' ? "max-w-[72px]" : node.shape === 'circle' ? "max-w-[80px]" : ""
                            )}
                            style={{ fontSize: `${node.fontSize || 14}px` }}
                            rows={1}
                        />
                    ) : (
                        <div
                            onDoubleClick={() => {
                                setDraftText(optimisticText ?? node.text);
                                setIsEditing(true);
                            }}
                            className={cn(
                                "text-center text-sm font-medium cursor-text whitespace-pre-wrap break-words min-h-[1.5em] w-full flex items-center justify-center",
                                nodeColor.text,
                                node.shape === 'diamond' ? "max-w-[72px]" : node.shape === 'circle' ? "max-w-[80px]" : ""
                            )}
                            style={{ fontSize: `${node.fontSize || 14}px` }}
                        >
                            {(optimisticText ?? node.text) || (
                                <span className="opacity-40 italic text-[10px] uppercase tracking-widest">Empty</span>
                            )}
                        </div>
                    )}

                    {/* Preview removed as requested - now available in the description modal */}
                </div>
            </div>

            {/* Collapse Indicator */}
            {childCount > 0 && (
                <button
                    onClick={() => onToggleCollapse(node.id)}
                    className={cn(
                        "absolute left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-current rounded-full flex items-center justify-center text-xs font-bold hover:scale-110 transition-transform z-30",
                        node.shape === 'diamond' ? "-bottom-[30px]" : "-bottom-3"
                    )}
                >
                    {node.collapsed ? '+' : '−'}
                </button>
            )}

            {/* Action Buttons */}
            {(optimisticText ?? node.text) && (
                <div className="absolute -right-12 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 rounded-full border-zinc-200 hover:border-indigo-400 hover:text-indigo-600 bg-white shadow-sm"
                            >
                                <Palette className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                            <div className="p-2">
                                <Label className="text-xs text-zinc-500 mb-2 block">Color</Label>
                                <div className="grid grid-cols-4 gap-1">
                                    {NODE_COLORS.map((color) => (
                                        <button
                                            key={color.name}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onChangeColor(node.id, color.name);
                                            }}
                                            className={cn(
                                                "w-8 h-8 rounded border-2 transition-all",
                                                color.bg,
                                                node.color === color.name ? color.border : 'border-transparent hover:border-zinc-300'
                                            )}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                            </div>
                            <DropdownMenuSeparator />
                            <div className="p-2">
                                <Label className="text-xs text-zinc-500 mb-2 block">Shape</Label>
                                <div className="grid grid-cols-4 gap-1">
                                    {(['rounded', 'rectangle', 'circle', 'diamond'] as const).map((shape) => (
                                        <Tooltip key={shape}>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant={node.shape === shape ? 'primary' : 'outline'}
                                                    size="icon"
                                                    className="h-8 w-8 transition-all"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        onChangeShape(node.id, shape);
                                                    }}
                                                >
                                                    {shape === 'rounded' && <Square className="h-3.5 w-3.5 rounded-sm" />}
                                                    {shape === 'rectangle' && <Square className="h-3.5 w-3.5" />}
                                                    {shape === 'circle' && <Circle className="h-3.5 w-3.5" />}
                                                    {shape === 'diamond' && <Square className="h-3.5 w-3.5 rotate-45 scale-75" />}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="text-[10px] capitalize">
                                                {shape}
                                            </TooltipContent>
                                        </Tooltip>
                                    ))}
                                </div>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded-full border-zinc-200 hover:border-indigo-400 hover:text-indigo-600 bg-white shadow-sm"
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            onAddChild(node.id, rect);
                        }}
                        title="Add child node"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                        variant="outline"
                        size="icon"
                        className={cn(
                            "h-7 w-7 rounded-full border-zinc-200 hover:border-indigo-400 hover:text-indigo-600 bg-white shadow-sm",
                            (node.entityType === 'task' ? node.description : node.notes) ? "text-indigo-600 border-indigo-200" : ""
                        )}
                        title={node.entityType === 'task' ? "Node description" : "Node notes"}
                        onClick={() => {
                            // This will trigger the useEffect above to set descriptionDraft
                            setIsDescriptionEditing(false);
                            setIsDescriptionModalOpen(true);
                        }}
                    >
                        <FileText className="h-3.5 w-3.5" />
                    </Button>

                    <Dialog open={isDescriptionModalOpen} onOpenChange={setIsDescriptionModalOpen}>
                        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                            <DialogHeader className="px-6 py-4 border-b border-zinc-100 flex-row items-center justify-between space-y-0">
                                <DialogTitle className="text-zinc-900 font-semibold">
                                    {node.entityType === 'task' ? "Description" : "Notes"}
                                </DialogTitle>
                                {!isDescriptionEditing && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-3 mr-3 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium rounded-lg"
                                        onClick={() => setIsDescriptionEditing(true)}
                                    >
                                        <PenTool className="h-3.5 w-3.5 mr-1.5" />
                                        Edit
                                    </Button>
                                )}
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto p-6 min-h-[200px]">
                                {isDescriptionEditing ? (
                                    <div className="space-y-4">
                                        {node.entityType === 'task' ? (
                                            <div className="border border-zinc-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:border-indigo-500/20 transition-all">
                                                <DescriptionEditor
                                                    content={descriptionDraft}
                                                    onChange={setDescriptionDraft}
                                                    editable={true}
                                                    spaceId={spaceId}
                                                    projectId={projectId}
                                                    workspaceId={workspaceId}
                                                    collaboration={{
                                                        enabled: true,
                                                        documentId: getTaskId() || node.id,
                                                        documentType: 'task',
                                                        user: {
                                                            id: session?.id || 'anonymous',
                                                            name: session?.name || session?.email || 'User',
                                                            color: session?.color
                                                        }
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <textarea
                                                className="w-full min-h-[300px] p-4 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/20 transition-all resize-none"
                                                placeholder="Write something..."
                                                value={descriptionDraft}
                                                onChange={(e) => setDescriptionDraft(e.target.value)}
                                                autoFocus
                                            />
                                        )}
                                    </div>
                                ) : (
                                    <div className="prose prose-sm max-w-none prose-zinc prose-p:leading-relaxed prose-pre:bg-zinc-50 prose-pre:border prose-pre:border-zinc-200">
                                        {node.entityType === 'task' ? (
                                            (() => {
                                                // Show optimistic content immediately, fall back to node.description
                                                const displayContent = optimisticContent ?? node.description;
                                                return displayContent ? (
                                                    <div dangerouslySetInnerHTML={{ __html: displayContent }} />
                                                ) : (
                                                    <p className="text-zinc-400 italic">No description provided.</p>
                                                );
                                            })()
                                        ) : (
                                            (() => {
                                                // Show optimistic content immediately, fall back to node.notes
                                                const displayContent = optimisticContent ?? node.notes;
                                                return displayContent ? (
                                                    <div className="whitespace-pre-wrap text-zinc-600">{displayContent}</div>
                                                ) : (
                                                    <p className="text-zinc-400 italic">No notes provided.</p>
                                                );
                                            })()
                                        )}
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>

                    {onConvertToTask && (
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full border-zinc-200 hover:border-indigo-400 hover:text-indigo-600 bg-white shadow-sm"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                onConvertToTask?.(node.id, rect);
                            }}
                            title="Create Task"
                        >
                            <ListTodo className="h-3.5 w-3.5" />
                        </Button>
                    )}

                    {(node.taskId || (node.taskIds && node.taskIds.length > 0)) && (
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full border-zinc-200 hover:border-indigo-400 hover:text-indigo-600 bg-white shadow-sm"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                onShowTasks?.(node.id, rect);
                            }}
                            title="View created tasks"
                        >
                            <Maximize2 className="h-3.5 w-3.5" />
                        </Button>
                    )}

                    <TagsModal
                        tags={node.tags || []}
                        onChange={(newTags) => {
                            onUpdate(node.id, { tags: newTags });
                            // Sync to task if possible (silently skip if no task ID)
                            if (node.entityType === 'task') {
                                const tid = getTaskId();
                                if (tid) {
                                    onTaskUpdate?.(tid, { tags: newTags });
                                }
                            }
                        }}
                        allAvailableTags={allAvailableTags}
                        trigger={
                            <Button
                                variant="outline"
                                size="icon"
                                className={cn(
                                    "h-7 w-7 rounded-full border-zinc-200 hover:border-indigo-400 hover:text-indigo-600 bg-white shadow-sm",
                                    (node.tags && node.tags.length > 0) ? "text-indigo-600 border-indigo-200" : ""
                                )}
                                title="Edit tags"
                            >
                                <Tag className="h-3.5 w-3.5" />
                            </Button>
                        }
                    />

                    {!isRoot && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() => onDelete(node.id)}
                            title="Delete node"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

function ConnectionLine({
    start,
    end,
    style = 'curved',
    color = '#cbd5e1',
    isSelected = false,
    onAddChild
}: {
    start: { x: number, y: number, shape?: string },
    end: { x: number, y: number, shape?: string },
    style?: 'curved' | 'straight' | 'stepped',
    color?: string,
    isSelected?: boolean,
    onAddChild?: () => void
}) {
    const getOffsets = (n: any, side: 'start' | 'end') => {
        const s = n?.shape || 'rounded';
        if (s === 'circle') {
            return { x: side === 'start' ? 120 : 0, y: 60 };
        }
        if (s === 'diamond') {
            return { x: side === 'start' ? 102 : 0, y: 51 };
        }
        return { x: side === 'start' ? 140 : 0, y: 30 };
    };

    const startOffset = getOffsets(start, 'start');
    const endOffset = getOffsets(end, 'end');

    const startX = start.x + startOffset.x;
    const startY = start.y + startOffset.y;
    const endX = end.x + endOffset.x;
    const endY = end.y + endOffset.y;

    let path = '';

    if (style === 'curved') {
        const dx = endX - startX;
        const dy = endY - startY;
        const controlPointOffset = Math.abs(dx) * 0.5;
        path = `M ${startX} ${startY} C ${startX + controlPointOffset} ${startY}, ${endX - controlPointOffset} ${endY}, ${endX} ${endY}`;
    } else if (style === 'stepped') {
        const midX = (startX + endX) / 2;
        path = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
    } else {
        path = `M ${startX} ${startY} L ${endX} ${endY}`;
    }

    return (
        <g>
            <path
                d={path}
                stroke={color}
                strokeWidth="2"
                fill="none"
                className="transition-none"
            />
        </g>
    );
}


function MindMapSelectionScreen({ onSelect }: { onSelect: (mode: 'tasks' | 'freeform') => void }) {
    return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-50 p-8 animate-in fade-in duration-500">
            <h2 className="text-2xl font-semibold mb-8 text-center text-zinc-900">Choose a structure that works for you</h2>
            <div className="flex flex-col md:flex-row gap-6 max-w-4xl w-full justify-center">
                {/* Tasks Card */}
                <div onClick={() => onSelect('tasks')} className="group flex-1 border border-zinc-200 rounded-2xl p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-zinc-300 transition-all cursor-pointer flex flex-col items-center bg-white max-w-[320px]">
                    <div className="w-full h-40 bg-zinc-50 rounded-lg mb-6 flex items-center justify-center overflow-hidden relative border border-zinc-100">
                        {/* Visual abstraction of Tasks */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-80 scale-90">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-8 bg-white border border-zinc-200 rounded-md shadow-sm" />
                                <svg width="40" height="60" viewBox="0 0 40 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-300">
                                    <path d="M0 30 C 15 30, 15 10, 40 10" stroke="currentColor" strokeWidth="2" fill="none" />
                                    <path d="M0 30 C 15 30, 15 30, 40 30" stroke="currentColor" strokeWidth="2" fill="none" />
                                    <path d="M0 30 C 15 30, 15 50, 40 50" stroke="currentColor" strokeWidth="2" fill="none" />
                                </svg>
                                <div className="flex flex-col gap-3">
                                    <div className="w-14 h-5 bg-white border border-zinc-200 rounded shadow-sm flex items-center px-1 gap-1">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-sm" />
                                        <div className="w-6 h-0.5 bg-zinc-100 rounded-full" />
                                    </div>
                                    <div className="w-14 h-5 bg-white border border-zinc-200 rounded shadow-sm flex items-center px-1 gap-1">
                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-sm" />
                                        <div className="w-6 h-0.5 bg-zinc-100 rounded-full" />
                                    </div>
                                    <div className="w-14 h-5 bg-white border border-zinc-200 rounded shadow-sm flex items-center px-1 gap-1">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-sm" />
                                        <div className="w-6 h-0.5 bg-zinc-100 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <p className="text-center text-zinc-600 mb-6 text-sm px-2 leading-relaxed h-10 flex items-center">Visualize your folders, lists, and tasks in a clear, structured view</p>
                    <Button className="w-full bg-black text-white border border-zinc-200 hover:bg-zinc-200 hover:text-black/80 rounded-lg h-9 font-medium text-sm shadow-sm transition-all duration-300">
                        Tasks
                    </Button>
                </div>

                {/* Freeform Card */}
                <div onClick={() => onSelect('freeform')} className="group flex-1 border border-zinc-200 rounded-2xl p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-zinc-300 transition-all cursor-pointer flex flex-col items-center bg-white max-w-[320px]">
                    <div className="w-full h-40 bg-zinc-50 rounded-lg mb-6 flex items-center justify-center overflow-hidden relative border border-zinc-100">
                        {/* Visual abstraction of Freeform */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-80 scale-90">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-6 bg-white border border-zinc-200 rounded-full shadow-sm flex items-center justify-center">
                                    <div className="w-6 h-0.5 bg-zinc-100 rounded-full" />
                                </div>
                                <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-orange-300">
                                    <path d="M0 25 C 10 25, 10 10, 40 10" stroke="currentColor" strokeWidth="2" fill="none" />
                                    <path d="M0 25 C 10 25, 10 40, 40 40" stroke="currentColor" strokeWidth="2" fill="none" />
                                </svg>
                                <div className="flex flex-col gap-6">
                                    <div className="w-10 h-5 bg-white border border-zinc-200 rounded shadow-sm" />
                                    <div className="w-10 h-5 bg-white border border-zinc-200 rounded shadow-sm" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <p className="text-center text-zinc-600 mb-6 text-sm px-2 leading-relaxed h-10 flex items-center">Brainstorm ideas and create new Tasks from a blank canvas</p>
                    <Button className="w-full bg-black text-white border border-zinc-200 hover:bg-zinc-200 hover:text-black/80 rounded-lg h-9 font-medium text-sm shadow-sm transition-all duration-300">
                        Freeform
                    </Button>
                </div>
            </div>
        </div>
    );
}

interface MindMapHeaderProps {
    entity?: any;
    layout?: keyof typeof LAYOUTS;
    onLayoutChange?: (layout: keyof typeof LAYOUTS) => void;
    // Filters and Search
    filtersPanelOpen: boolean;
    setFiltersPanelOpen: (open: boolean) => void;
    filterGroups: FilterGroup;
    showMinimap?: boolean;
    setShowMinimap?: (show: boolean) => void;
    setFilterGroups: (groups: FilterGroup) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    // Shared state
    showCompleted: boolean;
    setShowCompleted: (show: boolean) => void;
    showCompletedSubtasks: boolean;
    setShowCompletedSubtasks: (show: boolean) => void;
    // Customize Panel
    customizePanelOpen: boolean;
    setCustomizePanelOpen: (open: boolean) => void;
    layoutOptionsOpen: boolean;
    setLayoutOptionsOpen: (open: boolean) => void;
    fieldsPanelOpen: boolean;
    setFieldsPanelOpen: (open: boolean) => void;
    assigneesPanelOpen: boolean;
    setAssigneesPanelOpen: (open: boolean) => void;
    addTaskModalOpen: boolean;
    setAddTaskModalOpen: (open: boolean) => void;
    // Grouping and Subtasks
    groupBy: string;
    setGroupBy: (val: string) => void;
    groupDirection: "asc" | "desc";
    setGroupDirection: (val: "asc" | "desc") => void;
    expandedSubtaskMode: "collapsed" | "expanded" | "separate";
    setExpandedSubtaskMode: (mode: "collapsed" | "expanded" | "separate") => void;
    // Save View State
    isViewDirty: boolean;
    viewAutosave: boolean;
    isPending: boolean;
    onSave: () => void;
    onToggleAutosave: (val: boolean) => void;
    onSaveAsNewView: (name?: string) => void;
    onRevertChanges: () => void;
    isSaveAsNewPending: boolean;
    // Misc
    resolvedWorkspaceId?: string;
    users: any[];
    lists: any[];
    spaceId?: string;
    projectId?: string;
    listId?: string;
    folderId?: string;
    viewId?: string;
    allAvailableStatuses?: any[];
    availableTaskTypes?: any[];
    customFields?: any[];
    allAvailableTags?: string[];
    teamId?: string;
    // Side Panel States (needed for the panel UI)
    viewNameDraft: string;
    setViewNameDraft: (val: string) => void;
    showEmptyStatuses: boolean;
    setShowEmptyStatuses: (val: boolean) => void;
    wrapText: boolean;
    setWrapText: (val: boolean) => void;
    showTaskLocations: boolean;
    setShowTaskLocations: (val: boolean) => void;
    showSubtaskParentNames: boolean;
    setShowSubtaskParentNames: (val: boolean) => void;
    visibleColumns: Set<string>;
    toggleColumn: (id: string) => void;
    appliedFilterCount: number;
    renderFilterContent: (props: { onClose: () => void }) => React.ReactNode;
    groupLabel: string;
    // Layout Options
    pinDescription: boolean;
    setPinDescription: (val: boolean) => void;
    showTaskProperties: boolean;
    setShowTaskProperties: (val: boolean) => void;
    showTasksFromOtherLists: boolean;
    setShowTasksFromOtherLists: (val: boolean) => void;
    showSubtasksFromOtherLists: boolean;
    setShowSubtasksFromOtherLists: (val: boolean) => void;
    defaultToMeMode: boolean;
    setDefaultToMeMode: (val: boolean) => void;
    FIELD_CONFIG: any[];
    initialConfig?: Record<string, any> | null;
    selectedTaskIdFromParent?: string | null;
    onTaskSelect?: (taskId: string | null) => void;
    session?: any;
}

const getPriorityStyles = (p: string) => {
    if (p === "URGENT") return { badge: "text-red-700 bg-red-50 border-red-200", icon: "text-red-600" };
    if (p === "HIGH") return { badge: "text-orange-700 bg-orange-50 border-orange-200", icon: "text-orange-600" };
    if (p === "NORMAL") return { badge: "text-blue-700 bg-blue-50 border-blue-200", icon: "text-blue-600" };
    if (p === "LOW") return { badge: "text-slate-600 bg-slate-100 border-slate-200", icon: "text-slate-500" };
    return { badge: "text-slate-600 bg-slate-50 border-slate-200", icon: "text-slate-400" };
};

function MindMapHeader({
    layout,
    onLayoutChange,
    filtersPanelOpen,
    setFiltersPanelOpen,
    appliedFilterCount,
    filterGroups,
    setFilterGroups,
    renderFilterContent,
    searchQuery,
    setSearchQuery,
    showCompleted,
    setShowCompleted,
    showCompletedSubtasks,
    setShowCompletedSubtasks,
    customizePanelOpen,
    setCustomizePanelOpen,
    addTaskModalOpen,
    setAddTaskModalOpen,
    groupBy,
    setGroupBy,
    groupDirection,
    setGroupDirection,
    expandedSubtaskMode,
    setExpandedSubtaskMode,
    isViewDirty,
    viewAutosave,
    isPending,
    onSave,
    onToggleAutosave,
    onSaveAsNewView,
    onRevertChanges,
    isSaveAsNewPending,
    fieldsPanelOpen,
    setFieldsPanelOpen,
    assigneesPanelOpen,
    setAssigneesPanelOpen,
    resolvedWorkspaceId,
    users,
    lists,
    spaceId,
    projectId,
    listId,
    allAvailableStatuses,
    availableTaskTypes,
    customFields = [],
    allAvailableTags = [],
    teamId,
    layoutOptionsOpen,
    setLayoutOptionsOpen,
    viewNameDraft,
    setViewNameDraft,
    showEmptyStatuses,
    setShowEmptyStatuses,
    wrapText,
    setWrapText,
    showTaskLocations,
    setShowTaskLocations,
    showSubtaskParentNames,
    setShowSubtaskParentNames,
    visibleColumns,
    toggleColumn,
    pinDescription,
    setPinDescription,
    showTaskProperties,
    setShowTaskProperties,
    showTasksFromOtherLists,
    setShowTasksFromOtherLists,
    showSubtasksFromOtherLists,
    setShowSubtasksFromOtherLists,
    defaultToMeMode,
    setDefaultToMeMode,
    FIELD_CONFIG,
    session
}: MindMapHeaderProps) {
    const groupLabel = useMemo(() => {
        const standard = [
            { id: "status", label: "Status" },
            { id: "assignee", label: "Assignee" },
            { id: "priority", label: "Priority" },
            { id: "tags", label: "Tags" },
            { id: "dueDate", label: "Due date" },
            { id: "taskType", label: "Task type" },
        ].find(l => l.id === groupBy);
        if (standard) return standard.label;
        const custom = FIELD_CONFIG.find(f => f.id === groupBy);
        return custom?.label || "None";
    }, [groupBy, FIELD_CONFIG]);

    return (
        <div className="border-b border-zinc-100 bg-white px-3 py-2 shrink-0">
            <div className="flex items-center justify-between gap-3 overflow-x-auto">
                {/* Right: Closed, Filter, Search, Customize, Add Tag */}
                <div className="flex items-center gap-2 flex-1 justify-end">
                    <ViewToolbarSaveDropdown
                        show={isViewDirty && !viewAutosave}
                        isViewDirty={isViewDirty}
                        viewAutosave={viewAutosave}
                        isPending={isPending}
                        onSave={onSave}
                        onToggleAutosave={onToggleAutosave}
                        onSaveAsNewView={onSaveAsNewView}
                        onRevertChanges={onRevertChanges}
                        isSaveAsNewPending={isSaveAsNewPending}
                    />
                    <ViewToolbarClosedPopover
                        showCompleted={showCompleted}
                        showCompletedSubtasks={showCompletedSubtasks}
                        onShowCompletedChange={setShowCompleted}
                        onShowCompletedSubtasksChange={setShowCompletedSubtasks}
                    />

                    <Popover open={filtersPanelOpen} onOpenChange={setFiltersPanelOpen}>
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

                    <div className="relative w-40 hidden sm:block">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <Input className="pl-8 h-8 bg-zinc-50/50 border-zinc-200 text-sm rounded-lg" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "h-8 text-xs font-medium",
                                    customizePanelOpen ? "bg-violet-50 text-violet-700 border-violet-200" : "text-zinc-700 border-zinc-200"
                                )}
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
                                className="h-8 gap-1.5 px-3 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white border-0 shadow-sm transition-all active:scale-[0.98]"
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
                        lists={lists}
                        defaultListId={listId}
                        availableStatuses={allAvailableStatuses}
                        open={addTaskModalOpen}
                        onOpenChange={setAddTaskModalOpen}
                        trigger={<span className="sr-only" />}
                    />
                </div>
            </div>
        </div>
    );
}

function MindMapFreeformView(props: MindMapHeaderProps) {
    const {
        spaceId,
        projectId,
        viewId,
        initialConfig,
        allAvailableTags = [],
        // Destructure shared props
        filtersPanelOpen = false,
        setFiltersPanelOpen = () => { },
        showCompleted = false,
        setShowCompleted = () => { },
        showCompletedSubtasks = false,
        setShowCompletedSubtasks = () => { },
        showMinimap = true,
        setShowMinimap = () => { },
        addTaskModalOpen = false,
        setAddTaskModalOpen = () => { },
        searchQuery = "",
        setSearchQuery = () => { },
        groupBy = "none",
        setGroupBy = () => { },
        users = [],
        agents: agentsFromProps = [],
        lists = [],
        viewAutosave,
        availableTaskTypes = [],
        resolvedWorkspaceId,
        teamId,
        customFields = [],
        allAvailableStatuses = [],
        session
    } = props;

    // Fetch agents if not provided
    const { data: agentsData } = trpc.agent.list.useQuery(
        { workspaceId: resolvedWorkspaceId as string },
        { enabled: !!resolvedWorkspaceId && agentsFromProps.length === 0 }
    );

    const agents = useMemo(() => {
        return agentsFromProps.length > 0 ? agentsFromProps : (agentsData || []);
    }, [agentsFromProps, agentsData]);

    const [isFullscreen, setIsFullscreen] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);
    const minimapRef = useRef<HTMLDivElement | null>(null);
    const isDraggingMinimapViewportRef = useRef(false);
    const minimapDragStartRef = useRef<{ mouseX: number; mouseY: number; scrollLeft: number; scrollTop: number } | null>(null);
    const utils = trpc.useUtils();

    const createTask = trpc.task.create.useMutation({
        onSuccess: (data) => {
            utils.task.list.invalidate();
            toast.success("Task created");
            // If we were converting a node, update it
            if (inlineAddNodeId) {
                setNodes(prev => {
                    const next = prev.map(n => n.id === inlineAddNodeId ? {
                        ...n,
                        entityType: 'task' as const,
                        taskId: data.id,
                        taskIds: [...(n.taskIds || []), data.id],
                        text: data.title,
                        description: (data as any).description as string | undefined,
                        statusColor: (data as any).status?.color as string | undefined,
                        tags: (data as any).tags as string[] | undefined
                    } as MindMapNodeData : n);
                    addToHistory(next as MindMapNodeData[]);
                    return next;
                });
                setHasUnsavedChanges(true);
            }
        }
    });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const updateMutation = trpc.view.update.useMutation({
        onSuccess: () => {
            setHasUnsavedChanges(false);
        },
        onError: (err) => toast.error("Failed to save: " + err.message)
    });

    const followersRef = useRef<HTMLDivElement>(null);
    const draggingRootIdRef = useRef<string | null>(null);
    const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
    const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);
    const isPanningRef = useRef(false);
    const [isPanning, setIsPanning] = useState(false);
    const lastPanPosRef = useRef({ x: 0, y: 0 });

    const handlePanStart = useCallback((e: React.MouseEvent) => {
        // Only pan on middle click or handle background clicks
        if (e.button === 1 || (e.button === 0 && (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-bg')))) {
            isPanningRef.current = true;
            setIsPanning(true);
            lastPanPosRef.current = { x: e.clientX, y: e.clientY };
            e.preventDefault();
        }
    }, []);

    const handlePanMove = useCallback((e: MouseEvent) => {
        if (!isPanningRef.current || !canvasRef.current) return;
        const dx = e.clientX - lastPanPosRef.current.x;
        const dy = e.clientY - lastPanPosRef.current.y;
        canvasRef.current.scrollLeft -= dx;
        canvasRef.current.scrollTop -= dy;
        lastPanPosRef.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handlePanEnd = useCallback(() => {
        isPanningRef.current = false;
        setIsPanning(false);
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handlePanMove);
        window.addEventListener('mouseup', handlePanEnd);
        return () => {
            window.removeEventListener('mousemove', handlePanMove);
            window.removeEventListener('mouseup', handlePanEnd);
        };
    }, [handlePanMove, handlePanEnd]);

    // History management
    const [zoom, setZoom] = useState(100);
    const [nodes, setNodes] = useState<MindMapNodeData[]>(() => {
        if (initialConfig?.nodes && initialConfig.nodes.length > 0) {
            return initialConfig.nodes;
        }
        return [{
            id: `root-${Date.now()}`,
            text: "Start here 👋",
            x: 100,
            y: 1000,
            width: 180,
            height: 60,
            color: "#f3f4f6",
            textColor: "#1f2937",
            fontSize: 16,
            entityType: "note" as const,
            parentId: null,
            position: "a0"
        }];
    });
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

    const handleDragStart = useCallback((event: any) => {
        const activeNode = nodes.find(n => n.id === event.active.id);
        // Only trigger the subtree followers layer if we are dragging the root node.
        // This avoids double-movement bugs for non-root nodes.
        if (activeNode && !activeNode.parentId) {
            draggingRootIdRef.current = activeNode.id;
        } else {
            draggingRootIdRef.current = null;
        }
    }, [nodes]);

    const handleDragMove = useCallback((event: any) => {
        // Apply transform to followers layer for instant feedback
        if (draggingRootIdRef.current && followersRef.current && event.delta) {
            const scale = zoom / 100;
            const transform = `translate3d(${event.delta.x / scale}px, ${event.delta.y / scale}px, 0)`;
            followersRef.current.style.transform = transform;
        }
    }, [zoom]);

    const [lineStyle, setLineStyle] = useState<'curved' | 'straight' | 'stepped'>('curved');
    const [layout, setLayout] = useState<keyof typeof LAYOUTS>('radial');
    const [history, setHistory] = useState<MindMapNodeData[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const historyIndexRef = useRef(historyIndex);
    historyIndexRef.current = historyIndex;

    const [scrollState, setScrollState] = useState({ left: 0, top: 0, width: 0, height: 0 }); // For minimap viewport updates
    const [mmDragOffset, setMmDragOffset] = useState({ x: 0, y: 0 });

    const nodesRef = useRef(nodes);
    nodesRef.current = nodes;
    const scrollStateRef = useRef(scrollState);
    scrollStateRef.current = scrollState;
    const zoomRef = useRef(zoom);
    zoomRef.current = zoom;

    const worldBounds = useMemo(() => {
        if (nodes.length === 0) return { minX: 0, minY: 0, width: 20000, height: 20000, offsetX: 0, offsetY: 0 };
        const xs = nodes.map(n => n.x);
        const ys = nodes.map(n => n.y);
        const padding = 600; // Padding around nodes
        const minX = Math.min(0, ...xs) - padding;
        const maxX = Math.max(20000, ...xs) + padding;
        const minY = Math.min(0, ...ys) - padding;
        const maxY = Math.max(20000, ...ys) + padding;

        // Calculate offset to ensure all nodes are in positive space
        const offsetX = minX < 0 ? -minX : 0;
        const offsetY = minY < 0 ? -minY : 0;

        return {
            minX,
            minY,
            width: maxX - minX,
            height: maxY - minY,
            offsetX,
            offsetY
        };
    }, [nodes]);

    const prevOffsetsRef = useRef({ x: worldBounds.offsetX || 0, y: worldBounds.offsetY || 0 });

    useLayoutEffect(() => {
        const dx = (worldBounds.offsetX || 0) - prevOffsetsRef.current.x;
        const dy = (worldBounds.offsetY || 0) - prevOffsetsRef.current.y;

        if ((dx !== 0 || dy !== 0) && canvasRef.current) {
            const scale = zoom / 100;
            canvasRef.current.scrollLeft += dx * scale;
            canvasRef.current.scrollTop += dy * scale;
        }

        prevOffsetsRef.current = { x: worldBounds.offsetX || 0, y: worldBounds.offsetY || 0 };
    }, [worldBounds.offsetX, worldBounds.offsetY, zoom]);

    const MM_W = 220;
    const MM_H = 140;

    // Fixed viewfinder rectangle size (doesn't scale with zoom)
    const vrBase = useMemo(() => {
        const vrWidth = MM_W;
        const vrHeight = MM_H / 2;
        return { x: 0, y: (MM_H - vrHeight) / 2, w: vrWidth, h: vrHeight };
    }, []);

    // Center view on initial load
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || nodes.length === 0) return;

        // Calculate center of nodes in canvas space
        const xs = nodes.map(n => n.x + worldBounds.offsetX);
        const ys = nodes.map(n => n.y + worldBounds.offsetY);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs) + 180; // approximate width
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys) + 60; // approximate height

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const scale = zoom / 100;
        const viewW = canvas.clientWidth || window.innerWidth;
        const viewH = canvas.clientHeight || window.innerHeight;

        canvas.scrollTo({
            left: (centerX * scale) - (viewW / 2),
            top: (centerY * scale) - (viewH / 2),
            behavior: 'instant' as ScrollBehavior
        });
    }, []); // Run once on mount

    // Listen to canvas scroll for minimap updates
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const updateScrollState = () => {
            setScrollState({
                left: canvas.scrollLeft,
                top: canvas.scrollTop,
                width: canvas.clientWidth,
                height: canvas.clientHeight,
            });
        };

        updateScrollState();
        canvas.addEventListener('scroll', updateScrollState);
        const ro = new ResizeObserver(updateScrollState);
        ro.observe(canvas);
        return () => {
            canvas.removeEventListener('scroll', updateScrollState);
            ro.disconnect();
        };
    }, []);

    const [hasSelectedMode, setHasSelectedMode] = useState(!!initialConfig?.nodes);

    useEffect(() => {
        if (nodes.length === 0 && initialConfig?.nodes && initialConfig.nodes.length > 0) {
            setNodes(initialConfig.nodes);
            // Also update hasSelectedMode if we received nodes
            setHasSelectedMode(true);
        }
    }, [initialConfig?.nodes, nodes.length]);

    // Inline add state (for converting nodes to tasks)
    const [inlineAddNodeId, setInlineAddNodeId] = useState<string | null>(null);
    const [inlineAddTitle, setInlineAddTitle] = useState("");
    const [inlineAddTaskType, setInlineAddTaskType] = useState<string | null>(null);
    const [inlineAddAssigneeIds, setInlineAddAssigneeIds] = useState<string[]>([]);
    const [inlineAddDueDate, setInlineAddDueDate] = useState<Date | null>(null);
    const [inlineAddPriority, setInlineAddPriority] = useState<"URGENT" | "HIGH" | "NORMAL" | "LOW" | null>(null);
    const [inlineAddListId, setInlineAddListId] = useState<string | null>(null);
    const [inlineAddStatusId, setInlineAddStatusId] = useState<string | null>(null);
    const [inlineAddAnchorRect, setInlineAddAnchorRect] = useState<DOMRect | null>(null);
    const [inlineAddPopoverOpen, setInlineAddPopoverOpen] = useState(false);
    const inlineAddRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!inlineAddPopoverOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // Ignore clicks on html/body (edge cases)
            if (target === document.documentElement || target === document.body) {
                return;
            }

            // Check if click is inside the main popover
            if (inlineAddRef.current && inlineAddRef.current.contains(target)) {
                return;
            }

            // Check if click is inside any portaled dropdown/popover content
            // Radix UI portals these elements to document.body with specific attributes
            const isInDropdown = target.closest('[role="menu"]') ||
                target.closest('[role="dialog"]') ||
                target.closest('[data-radix-popper-content-wrapper]') ||
                target.closest('[data-radix-portal]');

            if (isInDropdown) {
                return;
            }

            setInlineAddPopoverOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [inlineAddPopoverOpen]);

    // Tasks list modal and bulk edit state
    const [tasksListModalNodeId, setTasksListModalNodeId] = useState<string | null>(null);
    const [tasksListAnchorRect, setTasksListAnchorRect] = useState<DOMRect | null>(null);
    const tasksListRef = useRef<HTMLDivElement>(null);
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
    const [bulkModal, setBulkModal] = useState<string | null>(null);
    const bulkBarRef = useRef<HTMLDivElement>(null);

    // Fetch data for selected tasks to support bulk actions (e.g. tags)
    const { data: bulkTasksData } = trpc.task.list.useQuery(
        { ids: selectedTasks, scope: 'all', pageSize: 100 } as any,
        { enabled: selectedTasks.length > 0 }
    );
    const bulkTasks = useMemo(() => (bulkTasksData as any)?.items || [], [bulkTasksData]);

    useEffect(() => {
        if (!tasksListModalNodeId) return;
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target === document.documentElement || target === document.body) return;
            if (tasksListRef.current && tasksListRef.current.contains(target)) return;
            if (bulkBarRef.current && bulkBarRef.current.contains(target)) return;

            // Check for radix portals/menus/dialogs
            const isInPortal = target.closest('[data-radix-portal]') ||
                target.closest('[role="dialog"]') ||
                target.closest('[role="menu"]') ||
                target.closest('[data-radix-popper-content-wrapper]') ||
                target.closest('[data-radix-portal]');
            if (isInPortal) return;

            setTasksListModalNodeId(null);
            // Only clear selection if we are NOT clicking on the bulk bar or its portals
            if (!bulkBarRef.current?.contains(target)) {
                setSelectedTasks([]);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [tasksListModalNodeId]);
    const [bulkStatusSearch, setBulkStatusSearch] = useState("");
    const [bulkAssigneeIds, setBulkAssigneeIds] = useState<string[]>([]);
    const [bulkCustomFieldSearch, setBulkCustomFieldSearch] = useState("");
    const [bulkCustomFieldId, setBulkCustomFieldId] = useState<string | null>(null);
    const [bulkCustomFieldDraftValue, setBulkCustomFieldDraftValue] = useState<any>(null);
    const [bulkTagInput, setBulkTagInput] = useState("");
    const [bulkTags, setBulkTags] = useState<string[]>([]);
    const [bulkSendNotifications, setBulkSendNotifications] = useState(true);
    const [bulkMoveKeepInList, setBulkMoveKeepInList] = useState(false);
    const [bulkDuplicateModalOpen, setBulkDuplicateModalOpen] = useState(false);

    const updateTask = trpc.task.update.useMutation({
        onSuccess: () => {
            utils.task.list.invalidate();
        }
    });

    const bulkDuplicateTask = trpc.task.bulkDuplicate.useMutation({
        onSuccess: () => {
            utils.task.list.invalidate();
            toast.success("Tasks duplicated");
        }
    });

    const deleteTaskMutation = trpc.task.delete.useMutation({
        onSuccess: () => {
            utils.task.list.invalidate();
            toast.success("Task deleted");
            setSelectedTasks([]);
        }
    });

    const addToHistory = useCallback((newNodes: MindMapNodeData[]) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndexRef.current + 1);
            newHistory.push(JSON.parse(JSON.stringify(newNodes)));
            return newHistory.slice(-50);
        });
        setHistoryIndex(prev => Math.min(prev + 1, 49));
    }, []);

    const addToHistoryRef = useRef(addToHistory);
    addToHistoryRef.current = addToHistory;

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
            setNodes(JSON.parse(JSON.stringify(history[historyIndex - 1])));
            setHasUnsavedChanges(true);
        }
    }, [historyIndex, history]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(prev => prev + 1);
            setNodes(JSON.parse(JSON.stringify(history[historyIndex + 1])));
            setHasUnsavedChanges(true);
        }
    }, [historyIndex, history]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, delta } = event;

        // Clear transform IMMEDIATELY
        if (followersRef.current) {
            followersRef.current.style.transform = '';
        }
        draggingRootIdRef.current = null;

        const nodeId = active.id as string;
        const dragged = nodes.find(n => n.id === nodeId);
        if (!dragged) return;

        const scale = zoom / 100;
        const initialDx = delta.x / scale;
        const initialDy = delta.y / scale;

        const isRoot = !dragged.parentId;
        const affectedNodes: string[] = [];

        if (isRoot) {
            const queue = [dragged.id];
            while (queue.length > 0) {
                const currId = queue.shift()!;
                affectedNodes.push(currId);
                nodes.filter(n => n.parentId === currId).forEach(n => queue.push(n.id));
            }
        } else {
            affectedNodes.push(dragged.id);
        }

        // Apply boundary constraints (confine nodes to the visible viewport)
        let correctedDx = initialDx;
        let correctedDy = initialDy;

        // Boundary constraints removed for infinite scrolling


        // Use estimated node sizes for better boundary detection
        const nodeWidth = 160;
        const nodeHeight = 60;

        for (const id of affectedNodes) {
            const node = nodes.find(n => n.id === id);
            if (!node) continue;

            const nextX = node.x + initialDx;
            const nextY = node.y + initialDy;

            // Clamping removed for infinite scrolling

        }

        const next = nodes.map(n => {
            if (affectedNodes.includes(n.id)) {
                return {
                    ...n,
                    x: n.x + correctedDx,
                    y: n.y + correctedDy
                };
            }
            return n;
        });

        setNodes(next);

        // Save history
        requestAnimationFrame(() => addToHistory(next));
        setHasUnsavedChanges(true); // Mark as dirty
    }, [nodes, zoom, addToHistory, scrollState]);

    const applyLayout = useCallback((layoutType: keyof typeof LAYOUTS) => {
        const rootIndex = nodes.findIndex(n => !n.parentId);
        if (rootIndex === -1) return;

        const scale = zoom / 100;
        // Center of the current visible screen in world coordinates
        const centerX = (scrollState.left / scale) + (scrollState.width / (2 * scale));
        const centerY = (scrollState.top / scale) + (scrollState.height / (2 * scale));

        const newNodes = [...nodes];
        // Position root in the center
        newNodes[rootIndex] = {
            ...newNodes[rootIndex],
            x: centerX - 90, // offset for root width
            y: centerY - 30, // offset for root height
        };

        const root = newNodes[rootIndex];
        const positioned = new Set<string>([root.id]);

        const positionChildren = (parentId: string, angle: number, radius: number, level: number) => {
            const children = nodes.filter(n => n.parentId === parentId && !positioned.has(n.id));
            const parent = newNodes.find(n => n.id === parentId);
            if (!parent || children.length === 0) return;

            children.forEach((child, index) => {
                const nodeIndex = newNodes.findIndex(n => n.id === child.id);
                if (nodeIndex === -1) return;

                if (layoutType === 'radial') {
                    const childAngle = angle + (index - children.length / 2) * (Math.PI / (children.length + 1));
                    newNodes[nodeIndex] = {
                        ...child,
                        x: parent.x + Math.cos(childAngle) * radius,
                        y: parent.y + Math.sin(childAngle) * radius
                    };
                } else if (layoutType === 'horizontal') {
                    newNodes[nodeIndex] = {
                        ...child,
                        x: parent.x + 200,
                        y: parent.y + (index - children.length / 2) * 120
                    };
                } else if (layoutType === 'vertical') {
                    newNodes[nodeIndex] = {
                        ...child,
                        x: parent.x + (index - children.length / 2) * 180,
                        y: parent.y + 150
                    };
                }

                positioned.add(child.id);
                positionChildren(child.id, angle + (index - children.length / 2) * 0.3, radius, level + 1);
            });
        };

        positionChildren(root.id, 0, 180, 1);
        setNodes(newNodes);
        addToHistory(newNodes);
        setHasUnsavedChanges(true);
    }, [nodes, addToHistory, zoom, scrollState]);

    const handleAddChild = useCallback((parentId: string) => {
        const parent = nodesRef.current.find(n => n.id === parentId);
        if (!parent) return;

        const siblings = nodesRef.current.filter(n => n.parentId === parentId);
        const angle = siblings.length * (Math.PI / 4);
        const distance = 180;

        const scale = zoomRef.current / 100;
        const padding = 50;
        const viewMinX = (scrollStateRef.current.left / scale) + padding;
        const viewMaxX = ((scrollStateRef.current.left + scrollStateRef.current.width) / scale) - padding;
        const viewMinY = (scrollStateRef.current.top / scale) + padding;
        const viewMaxY = ((scrollStateRef.current.top + scrollStateRef.current.height) / scale) - padding;

        const newNode: MindMapNodeData = {
            id: Math.random().toString(36).slice(2, 11),
            text: "New Topic",
            x: Math.max(viewMinX, Math.min(viewMaxX, parent.x + Math.cos(angle) * distance)),
            y: Math.max(viewMinY, Math.min(viewMaxY, parent.y + Math.sin(angle) * distance)),
            parentId,
            color: parent.color,
            shape: parent.shape || 'rounded',
            fontSize: parent.fontSize || 14
        };

        const newNodes = [...nodesRef.current, newNode];
        setNodes(newNodes);
        addToHistoryRef.current(newNodes);
        setHasUnsavedChanges(true);
    }, []);

    const handleDeleteNode = useCallback((id: string) => {
        const toDelete = new Set<string>([id]);
        let changed = true;
        while (changed) {
            changed = false;
            nodesRef.current.forEach(n => {
                if (n.parentId && toDelete.has(n.parentId) && !toDelete.has(n.id)) {
                    toDelete.add(n.id);
                    changed = true;
                }
            });
        }

        const newNodes = nodesRef.current.filter(n => !toDelete.has(n.id));
        setNodes(newNodes);
        addToHistoryRef.current(newNodes);
        setHasUnsavedChanges(true);
    }, []);

    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleUpdateNode = useCallback((id: string, updates: Partial<MindMapNodeData>) => {
        setNodes(prev => {
            const next = prev.map(n => n.id === id ? { ...n, ...updates } : n);

            // Clear any pending update timeout to debounce rapid updates
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }

            // Defer history and unsaved changes update to avoid state update during render
            updateTimeoutRef.current = setTimeout(() => {
                addToHistoryRef.current(next);
                setHasUnsavedChanges(true);
                updateTimeoutRef.current = null;
            }, 0);

            return next;
        });
    }, []);

    const handleTaskUpdate = useCallback((taskId: string, updates: any) => {
        updateTask.mutate({ id: taskId, ...updates }, {
            onSuccess: () => toast.success("Task updated"),
            onError: (err) => toast.error("Failed to update task: " + err.message)
        });
    }, [updateTask]);

    const handleToggleCollapse = useCallback((id: string) => {
        setNodes(prev => {
            const next = prev.map(n =>
                n.id === id ? { ...n, collapsed: !n.collapsed } : n
            );
            setTimeout(() => {
                addToHistoryRef.current(next);
                setHasUnsavedChanges(true);
            }, 0);
            return next;
        });
    }, []);

    const handleChangeColor = useCallback((id: string, color: string) => {
        handleUpdateNode(id, { color });
    }, []);

    const handleChangeShape = useCallback((id: string, shape: MindMapNodeData['shape']) => {
        handleUpdateNode(id, { shape });
    }, []);

    const nodeForTasks = useMemo(() => nodes.find(n => n.id === tasksListModalNodeId), [nodes, tasksListModalNodeId]);
    const taskIdsForModal = useMemo(() => {
        if (!nodeForTasks) return [];
        const ids = [...(nodeForTasks.taskIds || [])];
        if (nodeForTasks.taskId && !ids.includes(nodeForTasks.taskId)) ids.push(nodeForTasks.taskId);
        return ids;
    }, [nodeForTasks]);

    const { data: modalTasksData, isLoading: isModalTasksLoading } = trpc.task.list.useQuery(
        { ids: taskIdsForModal, scope: 'all', pageSize: 100 } as any,
        { enabled: !!tasksListModalNodeId && taskIdsForModal.length > 0 }
    );
    const modalTasks = (modalTasksData as any)?.items || [];

    const openInlineAddForConversion = useCallback((id: string, anchorRect: DOMRect) => {
        const node = nodesRef.current.find(n => n.id === id);
        if (!node) return;

        setInlineAddNodeId(id);
        setInlineAddTitle(node.text);
        setInlineAddTaskType(availableTaskTypes[0]?.id || null);
        setInlineAddAssigneeIds([]);
        setInlineAddDueDate(null);
        setInlineAddPriority(null);
        setInlineAddListId(lists[0]?.id || props.listId || null);
        setInlineAddStatusId(null);
        setInlineAddAnchorRect(anchorRect);
        setInlineAddPopoverOpen(true);
    }, [availableTaskTypes, lists, props.listId]);

    const handleSaveFreeformTask = async () => {
        if (!inlineAddTitle.trim() || !inlineAddListId) {
            toast.error("Please provide a title and select a destination list");
            return;
        }

        const node = nodes.find(n => n.id === inlineAddNodeId);

        try {
            const newTask = await createTask.mutateAsync({
                title: inlineAddTitle,
                description: node?.notes || undefined,
                tags: node?.tags || [],
                statusId: inlineAddStatusId || undefined,
                taskTypeId: inlineAddTaskType || undefined,
                assigneeIds: inlineAddAssigneeIds,
                dueDate: inlineAddDueDate || undefined,
                priority: inlineAddPriority || undefined,
                listId: inlineAddListId,
                workspaceId: resolvedWorkspaceId as string,
                spaceId: spaceId ?? undefined,
                projectId: projectId ?? undefined,
                teamId: teamId ?? undefined,
            } as any);

            // Update the node in the mind map to link to the new task
            setNodes(prev => {
                const next = prev.map(n => n.id === inlineAddNodeId ? {
                    ...n,
                    entityType: 'task' as const,
                    taskId: newTask.id,
                    notes: undefined // Content moved to task description
                } : n);
                addToHistory(next);
                return next;
            });

            setHasUnsavedChanges(true);
            setInlineAddPopoverOpen(false);
            setInlineAddNodeId(null);
        } catch (error) {
            console.error('Task creation failed', error);
            // Error toast handled by mutation onError usually, or here
        }
    };

    const getChildCount = useCallback((nodeId: string): number => {
        return nodesRef.current.filter(n => n.parentId === nodeId).length;
    }, []);

    const getVisibleNodes = useCallback(() => {
        const visible = new Set<string>();
        const rootNode = nodes.find(n => !n.parentId);
        if (!rootNode) return [];

        const queue = [rootNode.id];

        while (queue.length > 0) {
            const current = queue.shift()!;
            visible.add(current);

            const currentNode = nodes.find(n => n.id === current);
            if (!currentNode?.collapsed) {
                const children = nodes.filter(n => n.parentId === current);
                children.forEach(child => queue.push(child.id));
            }
        }

        return nodes.filter(n => visible.has(n.id));
    }, [nodes]);

    const visibleNodes = useMemo(() => getVisibleNodes(), [getVisibleNodes]);

    const scrollBounds = useMemo(() => {
        const canvas = canvasRef.current;
        if (!canvas || visibleNodes.length === 0) return { minL: 0, maxL: 20000, minT: 0, maxT: 20000 };

        const scale = zoom / 100;
        const padding = 30; // Matches node drag padding + a bit extra for safety

        const xs = visibleNodes.map(n => n.x);
        const ys = visibleNodes.map(n => n.y);

        const minX = Math.min(...xs);
        // Node widths: approx 140, heights approx 60
        const maxX = Math.max(...visibleNodes.map(n => n.x + 140));
        const minY = Math.min(...ys);
        const maxY = Math.max(...visibleNodes.map(n => n.y + 60));

        const viewportW = canvas.clientWidth;
        const viewportH = canvas.clientHeight;
        const scrollW = canvas.scrollWidth;
        const scrollH = canvas.scrollHeight;

        // Lower limit for scrollLeft: keep rightmost node inside right edge
        // (maxX + padding) * scale - viewportW
        const minL = Math.max(0, (maxX + padding) * scale - viewportW);

        // Upper limit for scrollLeft: keep leftmost node inside left edge
        // (minX - padding) * scale
        const maxL = Math.min(scrollW - viewportW, (minX - padding) * scale);

        const minT = Math.max(0, (maxY + padding) * scale - viewportH);
        const maxT = Math.min(scrollH - viewportH, (minY - padding) * scale);

        return { minL, maxL, minT, maxT };
    }, [visibleNodes, zoom, scrollState.width, scrollState.height]);

    const saveMap = useCallback(() => {
        if (!viewId) return;

        // Get the most up-to-date config from the cache to avoid race conditions
        const currentConfig = utils.view.get.getData({ id: viewId })?.config || initialConfig;

        updateMutation.mutate({
            id: viewId,
            config: {
                ...(currentConfig as any),
                nodes,
                lineStyle,
                layout,
                mindMapMode: 'freeform'
            } as any
        });
    }, [viewId, nodes, lineStyle, layout, updateMutation, initialConfig, utils.view.get]);

    // Auto-save logic - always enabled for mind maps since there's no manual save button
    useEffect(() => {
        if (hasUnsavedChanges && viewId) {
            const timer = setTimeout(() => {
                saveMap();
            }, 1000); // 1 second debounce
            return () => clearTimeout(timer);
        }
    }, [hasUnsavedChanges, viewId, saveMap]);

    const exportAsJSON = () => {
        const data = { nodes, lineStyle, layout };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mindmap-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Mind map exported");
    };

    const handleExpandNode = useCallback((id: string) => {
        setExpandedTaskId(id);
    }, []);

    const handleShowTasks = useCallback((id: string, rect: DOMRect) => {
        setTasksListModalNodeId(id);
        setTasksListAnchorRect(rect);
    }, []);

    const nodeTypes = useMemo(() => ({
        mindMap: MindMapFlowNode,
    }), []);


    // Transform internal nodes to React Flow nodes and edges
    useEffect(() => {
        const flowNodes: Node[] = visibleNodes.map(node => ({
            id: node.id,
            type: 'mindMap',
            position: { x: node.x + worldBounds.offsetX, y: node.y + worldBounds.offsetY },
            data: {
                node,
                childCount: getChildCount(node.id),
                onUpdate: handleUpdateNode,
                onDelete: handleDeleteNode,
                onAddChild: handleAddChild,
                onToggleCollapse: handleToggleCollapse,
                onChangeColor: handleChangeColor,
                onChangeShape: handleChangeShape,
                allAvailableTags,
                onExpand: handleExpandNode,
                workspaceId: resolvedWorkspaceId,
                spaceId,
                projectId,
                onConvertToTask: openInlineAddForConversion,
                onShowTasks: handleShowTasks,
                onTaskUpdate: handleTaskUpdate,
                session,
                viewAutosave,
            },
        }));

        const flowEdges: Edge[] = visibleNodes
            .filter(n => n.parentId)
            .map(n => ({
                id: `e-${n.parentId}-${n.id}`,
                source: n.parentId!,
                target: n.id,
                type: 'default',
                animated: false,
                style: { stroke: '#cbd5e1', strokeWidth: 2 },
            }));

        setRfNodes(flowNodes);
        setRfEdges(flowEdges);
    }, [
        visibleNodes,
        worldBounds.offsetX,
        worldBounds.offsetY,
        allAvailableTags,
        resolvedWorkspaceId,
        spaceId,
        projectId,
        session,
        viewAutosave,
    ]);

    const onNodeDragStop = useCallback((event: any, node: Node) => {
        handleUpdateNode(node.id, {
            x: node.position.x - worldBounds.offsetX,
            y: node.position.y - worldBounds.offsetY
        });
    }, [handleUpdateNode, worldBounds.offsetX, worldBounds.offsetY]);

    return (
        <>
            <div className={cn(
                "h-full flex flex-col bg-white border border-zinc-200/60 shadow-sm overflow-hidden relative",
                isFullscreen && "fixed inset-0 z-50"
            )}>
                {/* Header Toolbar */}
                <MindMapHeader
                    {...props}
                    layout={layout}
                    onLayoutChange={applyLayout}
                    showMinimap={showMinimap}
                    setShowMinimap={setShowMinimap}
                />

                {/* Secondary Toolbar */}
                <div className="border-b border-zinc-100 bg-zinc-50/30 px-3 py-1.5 shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-1.5" />
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">{nodes.length} nodes</span>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setIsFullscreen(!isFullscreen)}
                        >
                            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                        </Button>
                    </div>
                </div>

                {/* Canvas with React Flow */}
                <div className="flex-1 w-full h-full relative outline-none">
                    <ReactFlow
                        nodes={rfNodes}
                        edges={rfEdges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onNodeDragStop={onNodeDragStop}
                        nodeTypes={nodeTypes}
                        fitView
                        minZoom={0.1}
                        maxZoom={2}
                        defaultMarkerColor="#cbd5e1"
                        colorMode="light"
                    >
                        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
                        {showMinimap && (
                            <MiniMap
                                style={{
                                    height: 120,
                                    width: 200,
                                    borderRadius: 12,
                                    border: '1px solid #e5e7eb',
                                    background: '#ffffff',
                                }}
                                zoomable
                                pannable
                                nodeStrokeColor="#e2e8f0"
                                nodeColor={(n) => {
                                    const c = (n.data as any)?.node?.color;
                                    const colorMap: Record<string, string> = {
                                        'Indigo': '#e0e7ff',
                                        'Blue': '#dbeafe',
                                        'Green': '#dcfce7',
                                        'Yellow': '#fef9c3',
                                        'Orange': '#ffedd5',
                                        'Red': '#fee2e2',
                                        'Purple': '#f3e8ff',
                                        'Pink': '#fce7f3',
                                    };
                                    return colorMap[c] || '#f8fafc';
                                }}
                            />
                        )}
                        <Controls className="!bg-white !border-zinc-200 !shadow-lg !rounded-lg overflow-hidden" />
                    </ReactFlow>
                </div>
            </div>


            {/* Task Detail Modal */}
            {
                expandedTaskId && (
                    <TaskDetailModal
                        open={!!expandedTaskId}
                        onOpenChange={(open) => !open && setExpandedTaskId(null)}
                        taskId={expandedTaskId}
                    />
                )
            }

            {/* Inline Task Creation Popover for Freeform nodes */}
            {
                inlineAddPopoverOpen && inlineAddAnchorRect && (
                    <div
                        ref={inlineAddRef}
                        style={{
                            position: 'fixed',
                            left: inlineAddAnchorRect.left + inlineAddAnchorRect.width / 2,
                            top: inlineAddAnchorRect.top + inlineAddAnchorRect.height + 8,
                            transform: 'translateX(-50%)',
                            zIndex: 60 // Higher than canvas elements
                        }}
                        className="animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                        <div className="flex items-center h-14 px-4 gap-2 w-max min-w-[300px] max-w-[95vw] overflow-visible rounded-[24px] border border-zinc-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.15)] bg-white/95 backdrop-blur-xl ring-1 ring-black/5">
                            {/* List Selector (Destination) */}
                            <div className="shrink-0 border-r border-zinc-100 pr-2 mr-1">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-9 px-3 gap-2 rounded-xl hover:bg-zinc-100 text-zinc-600 font-bold"
                                        >
                                            <List className="h-4 w-4" />
                                            <span className="max-w-[100px] truncate">
                                                {lists.find(l => l.id === inlineAddListId)?.name || "Select List"}
                                            </span>
                                            <ChevronDown className="h-3 w-3 opacity-50" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-80 rounded-2xl p-0 shadow-2xl border-zinc-100 overflow-hidden" align="start" sideOffset={12}>
                                        <DestinationPicker
                                            workspaceId={resolvedWorkspaceId as string}
                                            onSelect={(listId) => setInlineAddListId(listId)}
                                        />
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Property Icons */}
                            <div className="flex items-center gap-1.5 shrink-0 pr-1">
                                {/* Assignees */}
                                <AssigneeSelector
                                    users={users}
                                    agents={agents}
                                    workspaceId={resolvedWorkspaceId}
                                    value={inlineAddAssigneeIds}
                                    onChange={setInlineAddAssigneeIds}
                                    variant="compact"
                                    trigger={
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                                "h-9 w-9 rounded-full transition-all border border-dashed hover:bg-zinc-100 flex items-center justify-center",
                                                inlineAddAssigneeIds.length > 0 ? "border-indigo-500/30 bg-indigo-50/50" : "border-zinc-200"
                                            )}
                                        >
                                            {inlineAddAssigneeIds.length > 0 ? (
                                                <div className="flex -space-x-2">
                                                    {inlineAddAssigneeIds.slice(0, 2).map(id => {
                                                        const isAgent = id.startsWith('agent:');
                                                        const cleanId = id.includes(':') ? id.split(':')[1] : id;
                                                        const u = isAgent ? agents.find(a => a.id === cleanId) : users.find(u => u.id === cleanId);
                                                        return (
                                                            <Avatar key={id} className="h-6 w-6 border-2 border-white ring-1 ring-zinc-100">
                                                                <AvatarImage src={isAgent ? u?.avatar : u?.image} />
                                                                <AvatarFallback className={cn("text-[8px]", isAgent ? "bg-purple-100 text-purple-700" : "bg-indigo-50 text-indigo-800")}>
                                                                    {isAgent ? <Bot className="h-3 w-3" /> : u?.name?.[0]}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <UserRound className="h-[18px] w-[18px] text-zinc-400" />
                                            )}
                                        </Button>
                                    }
                                />

                                {/* Task Type */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                                "h-9 w-9 rounded-full transition-all border border-dashed hover:bg-zinc-100 flex items-center justify-center",
                                                inlineAddTaskType ? "border-indigo-500/30 bg-indigo-50/50" : "border-zinc-200"
                                            )}
                                        >
                                            {(() => {
                                                const type = availableTaskTypes.find(t => t.id === inlineAddTaskType);
                                                return type ? <TaskTypeIcon type={type} className="h-[18px] w-[18px]" /> : <Box className="h-[18px] w-[18px] text-zinc-400" />;
                                            })()}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56 rounded-2xl p-2 shadow-2xl border-zinc-100" align="end" sideOffset={12}>
                                        <div className="p-2 pb-1">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2">Task Type</span>
                                        </div>
                                        {availableTaskTypes.map(t => (
                                            <DropdownMenuItem key={t.id} onSelect={() => setInlineAddTaskType(t.id)} className="rounded-xl gap-2 font-medium h-9">
                                                <TaskTypeIcon type={t} className="h-4 w-4" />
                                                {t.name}
                                                {inlineAddTaskType === t.id && <Check className="ml-auto h-4 w-4 text-indigo-600" />}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Status */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                                "h-9 w-9 rounded-full transition-all border border-dashed hover:bg-zinc-100 flex items-center justify-center",
                                                inlineAddStatusId ? "border-indigo-500/30 bg-indigo-50/50" : "border-zinc-200"
                                            )}
                                        >
                                            {(() => {
                                                const status = allAvailableStatuses.find(s => s.id === inlineAddStatusId);
                                                if (status) return <div className="h-3 w-3 rounded-full" style={{ backgroundColor: status.color || "#94a3b8" }} />;
                                                return <Circle className="h-[18px] w-[18px] text-zinc-400" />;
                                            })()}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56 rounded-2xl p-2 shadow-2xl border-zinc-100" align="end" sideOffset={12}>
                                        <div className="p-2 pb-1">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2">Status</span>
                                        </div>
                                        {(allAvailableStatuses as any[]).filter(s => s.listId === inlineAddListId || !s.listId).map(s => (
                                            <DropdownMenuItem key={s.id} onSelect={() => setInlineAddStatusId(s.id)} className="rounded-xl gap-2 font-medium h-9">
                                                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color || "#94a3b8" }} />
                                                {s.name}
                                                {inlineAddStatusId === s.id && <Check className="ml-auto h-4 w-4 text-indigo-600" />}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Priority */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                                "h-9 w-9 rounded-full transition-all border border-dashed hover:bg-zinc-100 flex items-center justify-center",
                                                inlineAddPriority ? "border-indigo-500/30 bg-indigo-50/50" : "border-zinc-200"
                                            )}
                                        >
                                            <Flag className={cn("h-[18px] w-[18px]",
                                                inlineAddPriority === 'URGENT' ? "text-red-500 fill-red-500" :
                                                    inlineAddPriority === 'HIGH' ? "text-orange-500 fill-orange-500" :
                                                        inlineAddPriority === 'NORMAL' ? "text-blue-500 fill-blue-500" :
                                                            inlineAddPriority === 'LOW' ? "text-zinc-400 fill-zinc-400" : "text-zinc-400"
                                            )} />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-40 rounded-2xl p-2 shadow-2xl border-zinc-100" align="end" sideOffset={12}>
                                        {(['URGENT', 'HIGH', 'NORMAL', 'LOW'] as const).map(p => (
                                            <DropdownMenuItem key={p} onSelect={() => setInlineAddPriority(p)} className="rounded-xl gap-2 font-medium h-9">
                                                <Flag className={cn("h-4 w-4",
                                                    p === 'URGENT' ? "text-red-500 fill-red-500" :
                                                        p === 'HIGH' ? "text-orange-500 fill-orange-500" :
                                                            p === 'NORMAL' ? "text-blue-500 fill-blue-500" : "text-zinc-400 fill-zinc-400"
                                                )} />
                                                <span className="capitalize">{p.toLowerCase()}</span>
                                                {inlineAddPriority === p && <Check className="ml-auto h-4 w-4 text-indigo-600" />}
                                            </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator className="my-1.5" />
                                        <DropdownMenuItem onSelect={() => setInlineAddPriority(null)} className="rounded-xl font-medium h-9 text-zinc-500">
                                            Clear Priority
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Due Date */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                                "h-9 w-9 rounded-full transition-all border border-dashed hover:bg-zinc-100 flex items-center justify-center",
                                                inlineAddDueDate ? "border-indigo-500/30 bg-indigo-50/50" : "border-zinc-200"
                                            )}
                                        >
                                            <Calendar className={cn("h-[18px] w-[18px]", inlineAddDueDate ? "text-indigo-600" : "text-zinc-400")} />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-none" align="end" sideOffset={12}>
                                        <SingleDateCalendar
                                            selectedDate={inlineAddDueDate || undefined}
                                            onDateChange={(date) => setInlineAddDueDate(date || null)}
                                        />
                                        {inlineAddDueDate && (
                                            <div className="p-2 border-t border-zinc-100 bg-zinc-50/50 rounded-b-2xl">
                                                <Button variant="ghost" className="w-full h-8 text-xs font-bold text-red-500 hover:text-red-700" onClick={() => setInlineAddDueDate(null)}>
                                                    Remove Date
                                                </Button>
                                            </div>
                                        )}
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Convert/Create Button */}
                            <Button
                                id="freeform-convert-create-btn"
                                onClick={handleSaveFreeformTask}
                                disabled={!inlineAddTitle.trim() || !inlineAddListId || createTask.isPending}
                                className="bg-black text-white hover:bg-black/90 h-10 px-6 rounded-xl font-bold text-[14px] shadow-lg shadow-black/10 transition-all active:scale-95 disabled:opacity-30 ml-1"
                            >
                                {createTask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                            </Button>
                        </div>
                    </div>
                )
            }

            {/* Tasks Created List Modal - Positioned Right */}
            {
                tasksListModalNodeId && tasksListAnchorRect && (
                    <div
                        ref={tasksListRef}
                        style={{
                            position: 'fixed',
                            left: tasksListAnchorRect.right + 12,
                            top: tasksListAnchorRect.top - 200,
                            zIndex: 60
                        }}
                        className="animate-in fade-in slide-in-from-left-2 duration-200"
                    >
                        <div className="flex flex-col w-[200px] max-h-[400px] rounded-2xl border border-zinc-200 shadow-2xl bg-white overflow-hidden">
                            <div className="p-3 border-b border-zinc-100 bg-zinc-50/50">
                                <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Tasks</h3>
                            </div>

                            <ScrollArea className="h-[250px]">
                                <div className="p-2">
                                    {isModalTasksLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                                        </div>
                                    ) : modalTasks.length === 0 ? (
                                        <div className="text-center py-8">
                                            <p className="text-xs text-zinc-400">No tasks</p>
                                        </div>
                                    ) : (
                                        modalTasks.map((task: any) => (
                                            <div
                                                key={task.id}
                                                className={cn(
                                                    "flex items-center gap-2 mb-2 p-2 rounded-lg transition-all group",
                                                    selectedTasks.includes(task.id)
                                                        ? "bg-indigo-50"
                                                        : "hover:bg-zinc-50"
                                                )}
                                            >
                                                <Checkbox
                                                    checked={selectedTasks.includes(task.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) setSelectedTasks(prev => [...prev, task.id]);
                                                        else setSelectedTasks(prev => prev.filter(id => id !== task.id));
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="shrink-0"
                                                />
                                                <input
                                                    type="text"
                                                    defaultValue={task.title}
                                                    onDoubleClick={(e) => {
                                                        e.currentTarget.readOnly = false;
                                                        e.currentTarget.focus();
                                                        e.currentTarget.select();
                                                    }}
                                                    onBlur={(e) => {
                                                        e.currentTarget.readOnly = true;
                                                        const newTitle = e.currentTarget.value.trim();
                                                        if (newTitle && newTitle !== task.title) {
                                                            updateTask.mutate({ id: task.id, title: newTitle });
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.currentTarget.blur();
                                                        }
                                                        if (e.key === 'Escape') {
                                                            e.currentTarget.value = task.title;
                                                            e.currentTarget.blur();
                                                        }
                                                    }}
                                                    readOnly
                                                    className="flex-1 text-[13px] font-semibold text-zinc-700 bg-transparent border-none outline-none read-only:cursor-default focus:bg-zinc-50 focus:ring-1 focus:ring-indigo-500/20 focus:shadow-[0_2px_10px_rgba(99,102,241,0.05)] rounded-md px-2 py-1 w-full transition-all duration-200 hover:text-indigo-600 focus:text-indigo-700"
                                                />
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setExpandedTaskId(task.id);
                                                    }}
                                                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-zinc-100 rounded"
                                                >
                                                    <Maximize2 className="h-3.5 w-3.5 text-zinc-500" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                )
            }

            {/* Bulk Edit Bar */}
            {
                selectedTasks.length > 0 && (
                    <div
                        ref={bulkBarRef}
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
                                        Choose status for selected tasks.
                                    </p>
                                    <div className="space-y-1">
                                        {allAvailableStatuses.filter((s: any) => !bulkStatusSearch.trim() || (s.name || "").toLowerCase().includes(bulkStatusSearch.toLowerCase())).map((s: any) => (
                                            <button key={s.id} type="button" className="w-full flex items-center gap-2 py-2 px-2 rounded hover:bg-zinc-100 text-left text-sm" onClick={async () => { for (const id of selectedTasks) { await updateTask.mutateAsync({ id, statusId: s.id }); } setBulkModal(null); }}>
                                                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color || "#9CA3AF" }} />
                                                {s.name}
                                            </button>
                                        ))}
                                    </div>
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

                        <Popover open={bulkModal === "tags"} onOpenChange={(open) => { setBulkModal(open ? "tags" : null); if (open) setBulkTags(Array.from(new Set(bulkTasks.flatMap(t => (t.tags ?? []))))); if (!open) setBulkTagInput(""); }}>
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

                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-10 gap-2 px-3.5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-red-500/10 shadow-none" onClick={async () => { if (confirm(`Delete ${selectedTasks.length} tasks?`)) { for (const id of selectedTasks) { await deleteTaskMutation.mutateAsync({ id }); } setSelectedTasks([]); } }}>
                            <Trash2 className="h-[18px] w-[18px]" />
                        </Button>
                    </div>
                )
            }

            <Dialog open={!!bulkCustomFieldId} onOpenChange={(open) => { if (!open) { setBulkCustomFieldId(null); setBulkCustomFieldDraftValue(null); } }}>
                <DialogContent className="sm:max-w-md rounded-[24px]">
                    <DialogHeader>
                        <DialogTitle>{(customFields as any[]).find(f => f.id === bulkCustomFieldId)?.name ?? "Custom field"}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-zinc-500 mb-2">Update value for {selectedTasks.length} selected task(s).</p>
                        {bulkCustomFieldId && (() => {
                            const field = (customFields as any[]).find(f => f.id === bulkCustomFieldId);
                            const adaptedField = field ? { ...field, type: field.type || field.config?.fieldType } : null;
                            if (!adaptedField) return null;
                            return (
                                <CustomFieldRenderer
                                    field={adaptedField}
                                    value={bulkCustomFieldDraftValue}
                                    onChange={setBulkCustomFieldDraftValue}
                                    disabled={updateTask.isPending}
                                />
                            );
                        })()}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="rounded-xl" onClick={() => { setBulkCustomFieldId(null); setBulkCustomFieldDraftValue(null); }}>Cancel</Button>
                        <Button className="bg-black text-white hover:bg-zinc-800 rounded-xl" onClick={async () => {
                            if (!bulkCustomFieldId) return;
                            for (const taskId of selectedTasks) {
                                await updateTask.mutateAsync({
                                    id: taskId,
                                    customFields: { [bulkCustomFieldId]: bulkCustomFieldDraftValue }
                                } as any);
                            }
                            setBulkCustomFieldId(null);
                            setBulkCustomFieldDraftValue(null);
                            setBulkModal(null);
                        }}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Actions Dialogs (Status, Assignee, Tags) */}
            {
                bulkModal === "status" && (
                    <Dialog open={true} onOpenChange={() => setBulkModal(null)}>
                        <DialogContent className="sm:max-w-[400px] rounded-[32px] p-6">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black">Change Status</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-2 mt-4">
                                {allAvailableStatuses.map((s: any) => (
                                    <button
                                        key={s.id}
                                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-50 transition-all border border-transparent hover:border-zinc-100 text-left"
                                        onClick={async () => {
                                            for (const id of selectedTasks) {
                                                await updateTask.mutateAsync({ id, statusId: s.id });
                                            }
                                            setBulkModal(null);
                                        }}
                                    >
                                        <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: s.color || "#94a3b8" }} />
                                        <span className="font-bold text-zinc-700 text-sm uppercase tracking-widest">{s.name}</span>
                                    </button>
                                ))}
                                {allAvailableStatuses.length === 0 && <p className="text-center py-6 text-zinc-400 font-bold uppercase tracking-widest text-[10px]">No statuses available</p>}
                            </div>
                        </DialogContent>
                    </Dialog>
                )
            }

            {
                bulkModal === "assignees" && (
                    <Dialog open={true} onOpenChange={() => setBulkModal(null)}>
                        <DialogContent className="sm:max-w-[450px] rounded-[32px] p-0 overflow-hidden">
                            <div className="p-6">
                                <DialogTitle className="text-xl font-black mb-4">Assign Tasks</DialogTitle>
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
                                            setBulkModal(null);
                                        } catch (e) {
                                            console.error("Bulk assignee update failed", e);
                                        }
                                    }}
                                />
                            </div>
                        </DialogContent>
                    </Dialog>
                )
            }

            {
                bulkModal === "tags" && (
                    <Dialog open={true} onOpenChange={() => setBulkModal(null)}>
                        <DialogContent className="sm:max-w-[450px] rounded-[32px] p-6">
                            <DialogTitle className="text-xl font-black mb-4">Manage Tags</DialogTitle>
                            <div className="flex flex-col gap-4">
                                <Input
                                    placeholder="Add tag..."
                                    className="h-10 rounded-xl"
                                    value={bulkTagInput}
                                    onChange={e => setBulkTagInput(e.target.value)}
                                    onKeyDown={async (e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            const t = bulkTagInput.trim();
                                            if (t && !bulkTags.includes(t)) {
                                                setBulkTags([...bulkTags, t]);
                                                setBulkTagInput("");
                                            }
                                        }
                                    }}
                                />
                                <div className="flex flex-wrap gap-2 min-h-[40px]">
                                    {bulkTags.map(tag => (
                                        <Badge key={tag} variant="secondary" className="px-3 py-1 rounded-lg text-xs font-bold gap-2">
                                            {tag}
                                            <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => setBulkTags(bulkTags.filter(t => t !== tag))} />
                                        </Badge>
                                    ))}
                                </div>
                                <Button
                                    className="bg-black text-white hover:bg-zinc-800 h-10 rounded-xl font-bold uppercase tracking-widest text-xs"
                                    onClick={async () => {
                                        for (const id of selectedTasks) {
                                            await updateTask.mutateAsync({ id, tags: bulkTags });
                                        }
                                        setBulkModal(null);
                                    }}
                                    disabled={bulkTags.length === 0}
                                >
                                    Apply {bulkTags.length} Tags
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )
            }
        </>

    );
}

export function MindMapView(props: MindMapViewProps) {
    const [mode, setMode] = useState<'tasks' | 'freeform' | null>(() => {
        const savedMode = (props.initialConfig as any)?.mindMapMode;
        return (savedMode === 'tasks' || savedMode === 'freeform') ? savedMode : null;
    });
    const [tempDefaultNodes, setTempDefaultNodes] = useState<any[] | null>(null);

    useEffect(() => {
        const savedMode = (props.initialConfig as any)?.mindMapMode;
        setMode((savedMode === 'tasks' || savedMode === 'freeform') ? savedMode : null);
        setTempDefaultNodes(null);
    }, [props.initialConfig, props.viewId]);

    // Shared toolbar state
    const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);
    const [showCompletedSubtasks, setShowCompletedSubtasks] = useState(false);
    const [groupBy, setGroupBy] = useState<string>(() => props.listId ? "status" : "none");
    const [groupDirection, setGroupDirection] = useState<"asc" | "desc">("asc");
    const [expandedSubtaskMode, setExpandedSubtaskMode] = useState<"collapsed" | "expanded" | "separate">("collapsed");
    const [filterGroups, setFilterGroups] = useState<FilterGroup>({
        id: "root",
        operator: "AND",
        conditions: [],
    });
    const [savedFilters, setSavedFilters] = useState<any[]>([]);
    const [savedFiltersPanelOpen, setSavedFiltersPanelOpen] = useState(false);
    const [savedFiltersSearch, setSavedFiltersSearch] = useState("");
    const [savedFilterName, setSavedFilterName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [fieldsPanelOpen, setFieldsPanelOpen] = useState(false);
    const [assigneesPanelOpen, setAssigneesPanelOpen] = useState(false);
    const [customizePanelOpen, setCustomizePanelOpen] = useState(false);
    const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
    const [viewAutosave, setViewAutosave] = useState<boolean>(() => !!(props.initialConfig as any)?.viewAutosave);
    const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);

    useEffect(() => {
        if (props.viewId && props.initialConfig) {
            const config = (props.initialConfig as any)?.mindMapView || {};
            setSavedSnapshot(stableStringify(config));
        }
    }, [props.viewId]);

    useEffect(() => {
        if ((props.initialConfig as any)?.viewAutosave !== undefined) {
            setViewAutosave(!!(props.initialConfig as any)?.viewAutosave);
        }
    }, [props.initialConfig]);

    const handleToggleAutosave = (val: boolean) => {
        setViewAutosave(val);
        if (props.viewId) {
            const currentConfig = utils.view.get.getData({ id: props.viewId })?.config || props.initialConfig;
            updateViewMutation.mutate({
                id: props.viewId,
                config: {
                    ...(currentConfig as any),
                    viewAutosave: val
                } as any
            });
        }
    };
    const [filterSearch, setFilterSearch] = useState("");
    const [layoutOptionsOpen, setLayoutOptionsOpen] = useState(false);
    const [viewNameDraft, setViewNameDraft] = useState("");
    const [showEmptyStatuses, setShowEmptyStatuses] = useState(false);
    const [wrapText, setWrapText] = useState(false);
    const [showTaskLocations, setShowTaskLocations] = useState(false);
    const [showSubtaskParentNames, setShowSubtaskParentNames] = useState(false);
    const [pinDescription, setPinDescription] = useState(false);
    const [showTaskProperties, setShowTaskProperties] = useState(false);
    const [showTasksFromOtherLists, setShowTasksFromOtherLists] = useState(false);
    const [showSubtasksFromOtherLists, setShowSubtasksFromOtherLists] = useState(false);
    const [defaultToMeMode, setDefaultToMeMode] = useState(false);
    const [showMinimap, setShowMinimap] = useState(true);
    const [fieldsSearch, setFieldsSearch] = useState("");
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(["status", "assignee", "priority"]));
    const [customizeViewFilterOpen, setCustomizeViewFilterOpen] = useState(false);
    const [createFieldModalOpen, setCreateFieldModalOpen] = useState(false);
    const [assigneesSearch, setAssigneesSearch] = useState("");
    const [pinView, setPinView] = useState(props.initialConfig?.isPinned || false);
    const [privateView, setPrivateView] = useState(props.initialConfig?.isPrivate || false);
    const [protectView, setProtectView] = useState(props.initialConfig?.isLocked || false);
    const [defaultView, setDefaultView] = useState(props.initialConfig?.isDefault || false);
    const [isFavorite, setIsFavorite] = useState(props.initialConfig?.isFavorite || false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const utils = trpc.useUtils();

    // Data Fetching
    const { data: space } = trpc.space.get.useQuery({ id: props.spaceId as string }, { enabled: !!props.spaceId });
    const { data: project } = trpc.project.get.useQuery({ id: props.projectId as string }, { enabled: !!props.projectId });
    const resolvedWorkspaceId = space?.workspaceId || project?.workspaceId || props.resolvedWorkspaceId;
    const { data: workspace } = trpc.workspace.get.useQuery({ id: resolvedWorkspaceId as string }, { enabled: !!resolvedWorkspaceId });
    const { data: availableTaskTypes = [] } = trpc.task.listTaskTypes.useQuery({ workspaceId: resolvedWorkspaceId as string }, { enabled: !!resolvedWorkspaceId });

    const { data: projectParticipants } = trpc.project.getParticipants.useQuery({ projectId: props.projectId as string }, { enabled: !!props.projectId });
    const { data: teamParticipants } = trpc.team.getParticipants.useQuery({ teamId: props.teamId as string }, { enabled: !!props.teamId });
    const { data: session } = trpc.user.me.useQuery();
    const { data: listsData } = trpc.list.byContext.useQuery({ spaceId: props.spaceId, projectId: props.projectId, workspaceId: resolvedWorkspaceId }, { enabled: !!(props.spaceId || props.projectId || resolvedWorkspaceId) });

    const { data: customFields = [] } = trpc.customFields.list.useQuery(
        { workspaceId: resolvedWorkspaceId as string, applyTo: "TASK" },
        { enabled: !!resolvedWorkspaceId }
    );

    const allAvailableStatuses = useMemo(() => {
        if (props.listId && listsData?.items) {
            const currentList = (listsData.items as any[]).find(l => l.id === props.listId);
            if (currentList?.statuses) {
                return (currentList.statuses as any[]).map(s => ({ ...s, listId: currentList.id }));
            }
        }
        if (listsData?.items) {
            const statusMap = new Map<string, any>();
            (listsData.items as any[]).forEach((list: any) => {
                (list.statuses || []).forEach((s: any) => {
                    if (!statusMap.has(s.id)) statusMap.set(s.id, { ...s, listId: list.id });
                });
            });
            return Array.from(statusMap.values());
        }
        return [];
    }, [props.listId, listsData]);

    const workspaceUserById = useMemo(() => {
        const map = new Map<string, { id: string; name: string; email?: string | null; image?: string | null }>();
        for (const m of workspace?.members ?? []) {
            const u = (m as any).user;
            if (u) map.set(u.id, { id: u.id, name: u.name || u.email || "Unknown", image: u.image, email: u.email });
        }
        return map;
    }, [workspace?.members]);

    const users = useMemo(() => {
        if (props?.teamId && teamParticipants?.users?.length) {
            return (teamParticipants.users as any[]).map((u: any) => ({
                id: u.id,
                name: workspaceUserById.get(u.id)?.name || u.name || u.email || "Unknown",
                image: workspaceUserById.get(u.id)?.image ?? null,
                email: u.email ?? null,
            }));
        }
        if (props?.projectId && projectParticipants?.users?.length) {
            return (projectParticipants.users as any[]).map((u: any) => ({
                id: u.id,
                name: workspaceUserById.get(u.id)?.name || u.name || u.email || "Unknown",
                image: workspaceUserById.get(u.id)?.image ?? null,
                email: u.email ?? null,
            }));
        }
        return Array.from(workspaceUserById.values()).map(u => ({ id: u.id, name: u.name, image: u.image ?? null, email: u.email ?? null }));
    }, [props?.teamId, teamParticipants?.users, props?.projectId, projectParticipants?.users, workspaceUserById]);

    const userById = useMemo(() => {
        const map = new Map<string, { id: string; name: string; email?: string | null; image?: string | null }>();
        users.forEach(u => map.set(u.id, u));
        return map;
    }, [users]);

    const hasFilterValue = (cond: FilterCondition): boolean => {
        if (cond.operator === "is_set" || cond.operator === "is_not_set" ||
            cond.operator === "is_archived" || cond.operator === "is_not_archived" ||
            cond.operator === "has" || cond.operator === "doesnt_have") {
            return true;
        }

        if (Array.isArray(cond.value)) {
            return cond.value.length > 0;
        }
        if (typeof cond.value === "string") {
            return cond.value.trim().length > 0;
        }
        if (typeof cond.value === "number") {
            return cond.value !== null && cond.value !== undefined;
        }
        return false;
    };

    const hasAnyValueInGroup = (group: FilterGroup): boolean => {
        return group.conditions.some(c => {
            if ("conditions" in c) return hasAnyValueInGroup(c as FilterGroup);
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

    const lists = listsData?.items?.map(list => ({ ...list, color: list.color ?? undefined })) || [];


    const FIELD_CONFIG = useMemo(() => {
        const standardFields = STANDARD_FIELD_CONFIG.map(f => {
            const standardIcons: Record<string, any> = {
                status: Circle,
                tags: Tag,
                dueDate: Calendar,
                priority: Flag,
                assignee: Users,
                comments: MessageSquare,
                timeTracked: Clock,
                dateCreated: CalendarClock,
                timeEstimate: Hourglass,
                pullRequests: Link2,
                linkedTasks: Link2,
                taskType: Box,
                name: Type,
                description: AlignLeft,
            };
            return { ...f, icon: standardIcons[f.id] || Box, isCustom: false };
        });
        const customFieldsConfig = (customFields as any[]).map((cf: any) => {
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
    }, [customFields]);

    // Filter Logic Helpers
    const addFilterCondition = useCallback((groupId: string = "root") => {
        const newCond: FilterCondition = { id: Math.random().toString(36).substring(7), field: "", operator: "is", value: [] };
        const update = (group: FilterGroup): FilterGroup => {
            if (group.id === groupId) return { ...group, conditions: [...group.conditions, newCond] };
            return { ...group, conditions: group.conditions.map(c => "conditions" in c ? update(c as FilterGroup) : c) };
        };
        setFilterGroups(update(filterGroups));
    }, [filterGroups]);

    const addFilterGroup = useCallback((parentId: string = "root") => {
        const newGroup: FilterGroup = {
            id: Math.random().toString(36).substring(7),
            operator: "AND",
            conditions: [{ id: Math.random().toString(36).substring(7), field: "", operator: "is", value: [] }],
        };
        const update = (group: FilterGroup): FilterGroup => {
            if (group.id === parentId) return { ...group, conditions: [...group.conditions, newGroup] };
            return { ...group, conditions: group.conditions.map(c => "conditions" in c ? update(c as FilterGroup) : c) };
        };
        setFilterGroups(update(filterGroups));
    }, [filterGroups]);

    const removeFilterItem = useCallback((id: string) => {
        if (id === "root") {
            setFilterGroups({ id: "root", operator: "AND", conditions: [] });
            return;
        }
        const update = (group: FilterGroup): FilterGroup => ({
            ...group,
            conditions: group.conditions.filter(c => c.id !== id).map(c => "conditions" in c ? update(c as FilterGroup) : c)
        });
        setFilterGroups(update(filterGroups));
    }, [filterGroups]);

    const updateFilterCondition = useCallback((id: string, updates: Partial<FilterCondition>) => {
        const update = (group: FilterGroup): FilterGroup => ({
            ...group,
            conditions: group.conditions.map(c => {
                if (c.id === id) return { ...c, ...updates } as FilterCondition;
                return "conditions" in c ? update(c as FilterGroup) : c;
            })
        });
        setFilterGroups(update(filterGroups));
    }, [filterGroups]);

    const updateFilterGroupOperator = useCallback((id: string, operator: FilterOperator) => {
        const update = (group: FilterGroup): FilterGroup => {
            if (group.id === id) return { ...group, operator };
            return { ...group, conditions: group.conditions.map(c => "conditions" in c ? update(c as FilterGroup) : c) };
        };
        setFilterGroups(update(filterGroups));
    }, [filterGroups]);

    const { data: viewData } = trpc.view.get.useQuery({ id: props.viewId as string }, { enabled: !!props.viewId });

    // View mutations
    const updateViewMutation = trpc.view.update.useMutation({
        onSuccess: () => { if (props.viewId) void utils.view.get.invalidate({ id: props.viewId }); }
    });

    const createViewMutation = trpc.view.create.useMutation({
        onSuccess: (newView) => {
            toast.success(`Created new view: ${newView.name}`);
            void utils.view.get.invalidate();
        }
    });

    const handleModeSelect = useCallback(async (selectedMode: 'tasks' | 'freeform') => {
        if (props.viewId) {
            const config = (props.initialConfig || {}) as Record<string, any>;

            let updates: any = {
                ...config,
                mindMapMode: selectedMode
            };

            // If selecting Freeform Mode and no nodes exist, create the default root node
            if (selectedMode === 'freeform' && (!config.nodes || config.nodes.length === 0)) {
                // Generate a unique ID for the node
                const nodeId = `node_${Date.now()}`;
                const defaultNode = {
                    id: nodeId,
                    text: "Start here 👋",
                    x: 400,
                    y: 300,
                    width: 180,
                    height: 60,
                    color: "#f3f4f6", // Default color
                    textColor: "#1f2937",
                    fontSize: 16,
                    entityType: "note" as const,
                    parentId: null,
                    position: "a0", // Simple default position key
                };
                updates.nodes = [defaultNode];
                setTempDefaultNodes([defaultNode]);
            }

            setMode(selectedMode);

            try {
                await updateViewMutation.mutateAsync({
                    id: props.viewId,
                    config: updates
                });
            } catch (error) {
                console.error("Failed to save view preference:", error);
                toast.error("Failed to save view preference");
            }
        } else {
            setMode(selectedMode);
        }
    }, [props.viewId, props.initialConfig, updateViewMutation, utils.view.get]);

    const saveNewFilter = useCallback(async () => {
        if (!savedFilterName.trim()) return;
        const newFilter = { id: Math.random().toString(36).substring(7), name: savedFilterName.trim(), config: JSON.parse(JSON.stringify(filterGroups)) };
        setSavedFilters(prev => {
            const next = [...prev, newFilter];
            if (props.viewId && props.initialConfig) {
                const config = props.initialConfig as Record<string, any>;
                const mindMap = config.mindMap || {};
                void updateViewMutation.mutateAsync({ id: props.viewId, config: { ...config, mindMap: { ...mindMap, savedFilterPresets: next } } });
            }
            return next;
        });
        setSavedFilterName("");
    }, [savedFilterName, filterGroups, props.viewId, props.initialConfig, updateViewMutation]);

    const deleteSavedFilter = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSavedFilters(prev => {
            const next = prev.filter(f => f.id !== id);
            if (props.viewId && props.initialConfig) {
                const config = props.initialConfig as Record<string, any>;
                const mindMap = config.mindMap || {};
                void updateViewMutation.mutateAsync({ id: props.viewId, config: { ...config, mindMap: { ...mindMap, savedFilterPresets: next } } });
            }
            return next;
        });
    }, [props.viewId, props.initialConfig, updateViewMutation]);

    const applySavedFilter = useCallback((config: FilterGroup) => {
        setFilterGroups(config);
        setSavedFiltersPanelOpen(false);
    }, []);

    const allAvailableTags = useMemo(() => {
        // Since MindMapView handles its own task fetching in children,
        // we might not have 'tasks' here. For now, we'll return an empty list 
        // to avoid errors in filter UI, or we could pass them up from MindMapTasksView.
        return props.allAvailableTags || [];
    }, [props.allAvailableTags]);

    const renderFilterContent = useCallback((props?: { onClose?: () => void }) => {
        return (
            <div className="flex flex-col max-h-[85vh]">
                {/* Header */}
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
                                                                                                                        {(() => {
                                                                                                                            const Icon = TaskTypeIcon as any;
                                                                                                                            return <Icon type={t} className="h-3.5 w-3.5" />;
                                                                                                                        })()}
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
    }, [
        addFilterGroup, addFilterCondition, updateFilterCondition, removeFilterItem, updateFilterGroupOperator,
        filterGroups, filterSearch, setFilterSearch, savedFiltersPanelOpen, setSavedFiltersPanelOpen,
        savedFiltersSearch, setSavedFiltersSearch, savedFilters, applySavedFilter, deleteSavedFilter,
        savedFilterName, setSavedFilterName, saveNewFilter, allAvailableStatuses,
        assigneesSearch, setAssigneesSearch, users, allAvailableTags, availableTaskTypes, resolvedWorkspaceId, props
    ]);

    useEffect(() => {
        if ((filtersPanelOpen || customizeViewFilterOpen) && filterGroups.conditions.length === 0) {
            addFilterGroup();
        }
    }, [filtersPanelOpen, customizeViewFilterOpen, filterGroups.conditions.length]);

    useEffect(() => {
        if (props.initialConfig?.mode === 'tasks') setMode('tasks');
        else if (props.initialConfig?.mode === 'freeform') setMode('freeform');
        else if (props.initialConfig?.nodes) setMode('freeform');
    }, [props.initialConfig]);

    const toggleColumn = useCallback((id: string) => {
        const next = new Set(visibleColumns);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setVisibleColumns(next);
    }, [visibleColumns]);

    const currentViewConfig = useMemo(() => ({
        mindMapMode: mode,
        filterGroups,
        groupBy,
        groupDirection,
        expandedSubtaskMode,
        searchQuery,
        showCompleted,
        showCompletedSubtasks,
        viewAutosave,
        showMinimap,
        pinView,
        privateView,
        protectView,
        defaultView,
        isFavorite,
        showEmptyStatuses,
        wrapText,
        showTaskLocations,
        showSubtaskParentNames,
        visibleColumns: Array.from(visibleColumns),
        pinDescription,
        showTaskProperties,
        showTasksFromOtherLists,
        showSubtasksFromOtherLists,
        defaultToMeMode,
        groupLabel: ""
    }), [
        mode, filterGroups, groupBy, groupDirection, expandedSubtaskMode, searchQuery,
        showCompleted, showCompletedSubtasks, viewAutosave, showMinimap, pinView,
        privateView, protectView, defaultView, isFavorite, showEmptyStatuses,
        wrapText, showTaskLocations, showSubtaskParentNames, visibleColumns,
        pinDescription, showTaskProperties, showTasksFromOtherLists,
        showSubtasksFromOtherLists, defaultToMeMode
    ]);

    const isViewDirty = useMemo(() => {
        if (!props.viewId) return false;
        const now = stableStringify(currentViewConfig);
        return savedSnapshot ? now !== savedSnapshot : false;
    }, [props.viewId, currentViewConfig, savedSnapshot]);

    const saveViewConfig = useCallback(async (overrides?: any, silent = false) => {
        if (!props.viewId) return;
        const configToSave = { ...currentViewConfig, ...overrides };
        try {
            const raw = (viewData?.config || {}) as any;
            await updateViewMutation.mutateAsync({
                id: props.viewId,
                config: { ...raw, mindMapView: configToSave }
            });
            setSavedSnapshot(stableStringify(configToSave));
            if (!silent) toast.success("View saved successfully");
        } catch (e) {
            toast.error("Failed to save view");
        }
    }, [props.viewId, viewData, currentViewConfig, updateViewMutation, stableStringify]);

    const saveAsNewView = useCallback(async (name: string) => {
        if (!viewData) return;
        try {
            await createViewMutation.mutateAsync({
                name: name.trim() || viewNameDraft.trim() || "New Mind Map",
                projectId: props.projectId as string,
                spaceId: props.spaceId as string,
                type: 'MIND_MAP',
                config: { ...viewData.config, mindMapView: currentViewConfig }
            } as any);
        } catch (e) {
            toast.error("Failed to create view");
        }
    }, [viewData, createViewMutation, viewNameDraft, props.projectId, props.spaceId, currentViewConfig]);

    const revertViewChanges = useCallback(() => {
        if (!savedSnapshot) return;
        const config = JSON.parse(savedSnapshot);
        setMode(config.mindMapMode);
        setFilterGroups(config.filterGroups);
        setGroupBy(config.groupBy);
        setGroupDirection(config.groupDirection);
        setExpandedSubtaskMode(config.expandedSubtaskMode);
        setSearchQuery(config.searchQuery);
        setShowCompleted(config.showCompleted);
        setShowCompletedSubtasks(config.showCompletedSubtasks);
        setViewAutosave(config.viewAutosave);
        setShowMinimap(config.showMinimap);
        setPinView(config.pinView);
        setPrivateView(config.privateView);
        setProtectView(config.protectView);
        setDefaultView(config.defaultView);
        setIsFavorite(config.isFavorite);
        setShowEmptyStatuses(config.showEmptyStatuses);
        setWrapText(config.wrapText);
        setShowTaskLocations(config.showTaskLocations);
        setShowSubtaskParentNames(config.showSubtaskParentNames);
        setVisibleColumns(new Set(config.visibleColumns));
        setPinDescription(config.pinDescription);
        setShowTaskProperties(config.showTaskProperties);
        setShowTasksFromOtherLists(config.showTasksFromOtherLists);
        setShowSubtasksFromOtherLists(config.showSubtasksFromOtherLists);
        setDefaultToMeMode(config.defaultToMeMode);
        toast.success("Changes reverted");
    }, [savedSnapshot]);

    const sharedProps: MindMapHeaderProps = useMemo(() => ({
        ...props,
        filtersPanelOpen, setFiltersPanelOpen,
        appliedFilterCount, filterGroups, setFilterGroups, renderFilterContent,
        showCompleted, setShowCompleted, showCompletedSubtasks, setShowCompletedSubtasks,
        showMinimap, setShowMinimap,
        groupBy, setGroupBy, groupDirection, setGroupDirection, expandedSubtaskMode, setExpandedSubtaskMode,
        searchQuery, setSearchQuery, customizePanelOpen, setCustomizePanelOpen,
        addTaskModalOpen, setAddTaskModalOpen, fieldsPanelOpen, setFieldsPanelOpen,
        assigneesPanelOpen, setAssigneesPanelOpen,
        resolvedWorkspaceId, users, lists, allAvailableStatuses, customFields,
        allAvailableTags, availableTaskTypes,
        isViewDirty,
        viewAutosave,
        isPending: updateViewMutation.isPending,
        onSave: () => void saveViewConfig(),
        onToggleAutosave: handleToggleAutosave,
        onSaveAsNewView: saveAsNewView,
        onRevertChanges: revertViewChanges,
        isSaveAsNewPending: createViewMutation.isPending,
        layoutOptionsOpen, setLayoutOptionsOpen,
        viewNameDraft, setViewNameDraft,
        showEmptyStatuses, setShowEmptyStatuses,
        wrapText, setWrapText,
        showTaskLocations, setShowTaskLocations,
        showSubtaskParentNames, setShowSubtaskParentNames,
        visibleColumns, toggleColumn,
        groupLabel: "", // Will be computed in Header anyway
        pinDescription, setPinDescription,
        showTaskProperties, setShowTaskProperties,
        showTasksFromOtherLists, setShowTasksFromOtherLists,
        showSubtasksFromOtherLists, setShowSubtasksFromOtherLists,
        defaultToMeMode, setDefaultToMeMode,
        FIELD_CONFIG,
        session
    }), [
        props, filtersPanelOpen, appliedFilterCount, filterGroups, renderFilterContent,
        showCompleted, showCompletedSubtasks, showMinimap, groupBy, groupDirection,
        expandedSubtaskMode, searchQuery, customizePanelOpen, addTaskModalOpen,
        fieldsPanelOpen, assigneesPanelOpen, resolvedWorkspaceId, users, lists,
        allAvailableStatuses, customFields, allAvailableTags, availableTaskTypes,
        isViewDirty, viewAutosave, updateViewMutation.isPending, saveViewConfig,
        handleToggleAutosave, saveAsNewView, revertViewChanges, createViewMutation.isPending,
        layoutOptionsOpen, viewNameDraft, showEmptyStatuses, wrapText, showTaskLocations,
        showSubtaskParentNames, visibleColumns, toggleColumn, pinDescription,
        showTaskProperties, showTasksFromOtherLists, showSubtasksFromOtherLists,
        defaultToMeMode, FIELD_CONFIG, session
    ]);

    const renderPanels = () => (
        <>
            {/* Fields Panel */}
            {fieldsPanelOpen && (
                <>
                    <div className="absolute inset-0 bg-black/10 z-40" onClick={() => setFieldsPanelOpen(false)} aria-hidden />
                    <div className="absolute bottom-0 right-0 h-full w-[350px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                            <h3 className="font-semibold text-zinc-900">Fields</h3>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFieldsPanelOpen(false)}><X className="h-4 w-4" /></Button>
                        </div>
                        <div className="p-3 border-b border-zinc-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                                <Input className="pl-9 h-9 text-sm" placeholder="Search fields..." value={fieldsSearch} onChange={e => setFieldsSearch(e.target.value)} />
                            </div>
                        </div>
                        <ScrollArea className="flex-1 p-3">
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Shown</p>
                            <div className="space-y-1 mb-4">
                                {FIELD_CONFIG.filter(f => visibleColumns.has(f.id) && (!fieldsSearch.trim() || f.label.toLowerCase().includes(fieldsSearch.toLowerCase()))).map(f => (
                                    <div key={f.id} className="flex items-center gap-2 py-2 px-2 rounded hover:bg-zinc-50">
                                        <GripVertical className="h-4 w-4 text-zinc-300 shrink-0 cursor-grab" />
                                        {typeof f.icon === 'string' ? <Box className="h-4 w-4 text-zinc-400 shrink-0" /> : <f.icon className="h-4 w-4 text-zinc-400 shrink-0" />}
                                        <span className="text-sm text-zinc-800 flex-1">{f.label}</span>
                                        <Switch checked onCheckedChange={() => toggleColumn(f.id)} />
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Popular</p>
                            <div className="space-y-1">
                                {FIELD_CONFIG.filter(f => !visibleColumns.has(f.id) && (!fieldsSearch.trim() || f.label.toLowerCase().includes(fieldsSearch.toLowerCase()))).map(f => (
                                    <div key={f.id} className="flex items-center justify-between py-2 px-2 rounded hover:bg-zinc-50">
                                        <div className="flex items-center gap-2">
                                            {typeof f.icon === 'string' ? <Box className="h-4 w-4 text-zinc-400 shrink-0" /> : <f.icon className="h-4 w-4 text-zinc-400 shrink-0" />}
                                            <span className="text-sm text-zinc-800">{f.label}</span>
                                        </div>
                                        <Switch checked={false} onCheckedChange={() => toggleColumn(f.id)} />
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <div className="p-3 border-t bg-zinc-50/50">
                            <Button className="w-full bg-zinc-900 hover:bg-zinc-800 text-white" onClick={() => { setFieldsPanelOpen(false); setCreateFieldModalOpen(true); }}>
                                <Plus className="h-4 w-4 mr-2" />Create field
                            </Button>
                        </div>
                    </div>
                </>
            )}

            {/* Customize View Panel */}
            {customizePanelOpen && !layoutOptionsOpen && (
                <>
                    <div className="absolute inset-0 bg-black/10 z-40" onClick={() => setCustomizePanelOpen(false)} aria-hidden />
                    <div className="absolute bottom-0 right-0 h-full w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                            <h3 className="font-semibold text-zinc-900">Customize view</h3>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCustomizePanelOpen(false)}><X className="h-4 w-4" /></Button>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-3 space-y-2 pb-24">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="flex items-center justify-center h-10 w-10 rounded-lg border border-zinc-200 bg-zinc-50 shrink-0">
                                        <div className="h-5 w-5 bg-zinc-400 rounded-sm" />
                                    </div>
                                    <Input
                                        value={viewNameDraft || props.entity?.name || "Mind Map"}
                                        onChange={(e) => setViewNameDraft(e.target.value)}
                                        className="h-10 text-sm font-medium border-zinc-200"
                                        placeholder="View name"
                                    />
                                </div>

                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2"
                                    onClick={() => setLayoutOptionsOpen(true)}
                                >
                                    <span className="flex items-center gap-2">More options</span>
                                    <ChevronRight className="h-3 w-3 text-zinc-400" />
                                </button>

                                <div className="h-px bg-zinc-100 my-1" />

                                <div className="space-y-0.5">
                                    <Popover open={customizeViewFilterOpen} onOpenChange={setCustomizeViewFilterOpen}>
                                        <PopoverTrigger asChild>
                                            <button
                                                type="button"
                                                className="w-full flex items-center justify-between py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2 group/panel-item"
                                            >
                                                <span className="flex items-center gap-2 font-medium">
                                                    <Filter className={cn("h-4 w-4 transition-colors", appliedFilterCount > 0 ? "text-violet-500" : "text-zinc-400 group-hover/panel-item:text-zinc-600")} />
                                                    Filter
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    {appliedFilterCount > 0 && <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">{appliedFilterCount}</span>}
                                                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                                                        {appliedFilterCount > 0 ? "Applied" : "None"}
                                                        <ChevronRight className="h-3.5 w-3.5" />
                                                    </span>
                                                </div>
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent side="left" align="start" className="w-[600px] max-w-[90vw] p-0 overflow-hidden shadow-2xl rounded-2xl border border-zinc-200/80" sideOffset={16}>
                                            {renderFilterContent({ onClose: () => setCustomizeViewFilterOpen(false) })}
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="h-px bg-zinc-100 my-1" />

                                <div className="space-y-0.5">
                                    <div className="flex items-center justify-between py-2 px-2 hover:bg-zinc-50 rounded-md">
                                        <div className="flex items-center gap-2">
                                            <Save className="h-4 w-4 text-zinc-400" />
                                            <span className="text-sm text-zinc-800">Autosave for me</span>
                                        </div>
                                        <Switch checked={viewAutosave} onCheckedChange={setViewAutosave} />
                                    </div>
                                    <div className="flex items-center justify-between py-2 px-2 hover:bg-zinc-50 rounded-md">
                                        <div className="flex items-center gap-2">
                                            <MapIcon className="h-4 w-4 text-zinc-400" />
                                            <span className="text-sm text-zinc-800">Show minimap</span>
                                        </div>
                                        <Switch checked={showMinimap} onCheckedChange={setShowMinimap} />
                                    </div>
                                    <div className="flex items-center justify-between py-2 px-2 hover:bg-zinc-50 rounded-md">
                                        <div className="flex items-center gap-2">
                                            <Pin className="h-4 w-4 text-zinc-400" />
                                            <span className="text-sm text-zinc-800">Pin view</span>
                                        </div>
                                        <Switch checked={pinView} onCheckedChange={setPinView} />
                                    </div>
                                    <div className="flex items-center justify-between py-2 px-2 hover:bg-zinc-50 rounded-md">
                                        <div className="flex items-center gap-2">
                                            <Lock className="h-4 w-4 text-zinc-400" />
                                            <span className="text-sm text-zinc-800">Private view</span>
                                        </div>
                                        <Switch checked={privateView} onCheckedChange={setPrivateView} />
                                    </div>
                                    <div className="flex items-center justify-between py-2 px-2 hover:bg-zinc-50 rounded-md">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="h-4 w-4 text-zinc-400" />
                                            <span className="text-sm text-zinc-800">Protect view</span>
                                        </div>
                                        <Switch checked={protectView} onCheckedChange={setProtectView} />
                                    </div>
                                    <div className="flex items-center justify-between py-2 px-2 hover:bg-zinc-50 rounded-md">
                                        <div className="flex items-center gap-2">
                                            <Home className="h-4 w-4 text-zinc-400" />
                                            <span className="text-sm text-zinc-800">Set as default view</span>
                                        </div>
                                        <Switch checked={defaultView} onCheckedChange={setDefaultView} />
                                    </div>
                                </div>

                                <div className="h-px bg-zinc-100 my-1" />

                                <div className="space-y-0.5">
                                    <button type="button" className="w-full flex items-center gap-2 py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2" onClick={() => {
                                        const url = window.location.href;
                                        navigator.clipboard.writeText(url);
                                        toast.success("Link copied to clipboard");
                                    }}>
                                        <Link className="h-4 w-4 text-zinc-400" />
                                        <span>Copy link to view</span>
                                    </button>
                                    <button type="button" className="w-full flex items-center gap-2 py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 rounded-md px-2" onClick={() => setIsShareModalOpen(true)}>
                                        <Share2 className="h-4 w-4 text-zinc-400" />
                                        <span>Sharing & Permissions</span>
                                    </button>
                                    <button type="button" className="w-full flex items-center gap-2 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-md px-2">
                                        <Trash2 className="h-4 w-4" />
                                        <span>Delete view</span>
                                    </button>
                                </div>
                            </div>
                        </ScrollArea>
                    </div>
                </>
            )}

            {/* Layout Options Panel */}
            {layoutOptionsOpen && (
                <>
                    <div className="absolute inset-0 bg-black/10 z-40" onClick={() => setLayoutOptionsOpen(false)} aria-hidden />
                    <div className="absolute bottom-0 right-0 h-full w-[380px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setLayoutOptionsOpen(false); setCustomizePanelOpen(true); }}>
                                    <ArrowRight className="h-4 w-4 rotate-180" />
                                </Button>
                                <h3 className="font-semibold text-zinc-900">Layout options</h3>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLayoutOptionsOpen(false)}><X className="h-4 w-4" /></Button>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-3 space-y-4">
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider px-2">View settings</p>
                                    <div className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded-md">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-zinc-400" />
                                            <span className="text-sm text-zinc-800">Default to Me Mode</span>
                                        </div>
                                        <Switch checked={defaultToMeMode} onCheckedChange={setDefaultToMeMode} />
                                    </div>
                                </div>
                                <div className="h-px bg-zinc-100" />
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between py-1 px-2 hover:bg-zinc-50 rounded cursor-pointer" onClick={() => { }}>
                                        <span className="text-sm flex items-center gap-2"><RefreshCcw className="h-4 w-4 text-zinc-400" />Reset view to defaults</span>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </div>
                </>
            )}

            {isShareModalOpen && (
                <ShareViewPermissionModal
                    workspaceId={resolvedWorkspaceId as string}
                    viewId={props.viewId as string}
                    open={isShareModalOpen}
                    onOpenChange={setIsShareModalOpen}
                />
            )}
        </>
    );

    if (!mode) {
        return (
            <div className="absolute inset-0 bg-white z-50 flex items-center justify-center p-6">
                <MindMapSelectionScreen onSelect={handleModeSelect} />
            </div>
        );
    }

    if (mode === 'tasks') return (
        <div className="h-full w-full relative">
            <MindMapTasksView {...sharedProps} />
            {renderPanels()}
        </div>
    );
    return (
        <div className="h-full w-full relative">
            <MindMapFreeformView
                {...sharedProps}
                initialConfig={
                    tempDefaultNodes
                        ? { ...props.initialConfig, nodes: tempDefaultNodes }
                        : props.initialConfig
                }
            />
            {renderPanels()}
        </div>
    );
}

function MindMapTasksView(props: MindMapHeaderProps) {
    const {
        listId, folderId, entity, allAvailableTags = [], spaceId, projectId, teamId,
        lists = [], allAvailableStatuses = [], availableTaskTypes = [], customFields = [],
        users = [], agents: agentsFromProps = [], resolvedWorkspaceId, session, viewAutosave,
        showMinimap = true, setShowMinimap = () => { }
    } = props;

    // Fetch agents if not provided
    const { data: agentsData } = trpc.agent.list.useQuery(
        { workspaceId: resolvedWorkspaceId as string },
        { enabled: !!resolvedWorkspaceId && (!agentsFromProps || agentsFromProps.length === 0) }
    );

    const agents = useMemo(() => {
        return (agentsFromProps && agentsFromProps.length > 0) ? agentsFromProps : (agentsData || []);
    }, [agentsFromProps, agentsData]);

    const utils = trpc.useUtils();
    const [nodes, setNodes] = useState<MindMapNodeData[]>([]);
    const nodesRef = useRef(nodes);
    nodesRef.current = nodes;

    const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
    const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);

    // Stable refs for values that change but shouldn't break callback identity
    const availableTaskTypesRef = useRef(availableTaskTypes);
    availableTaskTypesRef.current = availableTaskTypes;
    const onTaskSelectRef = useRef(props.onTaskSelect);
    onTaskSelectRef.current = props.onTaskSelect;
    const listIdRef = useRef(listId);
    listIdRef.current = listId;
    const viewIdRef = useRef(props.viewId);
    viewIdRef.current = props.viewId;
    const initialConfigRef = useRef(props.initialConfig);
    initialConfigRef.current = props.initialConfig;
    const folderIdRef = useRef(folderId);
    folderIdRef.current = folderId;
    const spaceIdRef = useRef(spaceId);
    spaceIdRef.current = spaceId;
    const projectIdRef = useRef(projectId);
    projectIdRef.current = projectId;
    const teamIdRef = useRef(teamId);
    teamIdRef.current = teamId;

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [tasksListModalNodeId, setTasksListModalNodeId] = useState<string | null>(null);
    const [tasksListAnchorRect, setTasksListAnchorRect] = useState<DOMRect | null>(null);
    const [history, setHistory] = useState<MindMapNodeData[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const historyIndexRef = useRef(historyIndex);
    historyIndexRef.current = historyIndex;
    const MM_W = 220;
    const MM_H = 140;

    const worldBounds = useMemo(() => {
        if (nodes.length === 0) return { minX: 0, minY: 0, width: 3000, height: 2000, offsetX: 0, offsetY: 0 };
        const xs = nodes.map(n => n.x);
        const ys = nodes.map(n => n.y);
        const padding = 600; // Padding around nodes
        const minX = Math.min(0, ...xs) - padding;
        const maxX = Math.max(20000, ...xs) + padding;
        const minY = Math.min(0, ...ys) - padding;
        const maxY = Math.max(20000, ...ys) + padding;

        // Calculate offset to ensure all nodes are in positive space
        const offsetX = minX < 0 ? -minX : 0;
        const offsetY = minY < 0 ? -minY : 0;

        return {
            minX,
            minY,
            width: maxX - minX,
            height: maxY - minY,
            offsetX,
            offsetY
        };
    }, [nodes]);

    const prevOffsetsRef = useRef({ x: worldBounds.offsetX || 0, y: worldBounds.offsetY || 0 });

    const viewfinder = useMemo(() => {
        return { x: 0, y: 0, w: MM_W, h: MM_H };
    }, []);



    const [nodeStyles, setNodeStyles] = useState<Record<string, { color?: string, shape?: MindMapNodeData['shape'], offsetX?: number, offsetY?: number }>>(
        (props.initialConfig as any)?.mindMap?.nodeStyles || {}
    );

    // Sync nodeStyles with props when they change
    useEffect(() => {
        const styles = (props.initialConfig as any)?.mindMap?.nodeStyles;
        if (styles) {
            setNodeStyles(styles);
        }
    }, [props.initialConfig]);

    const updateViewMutation = trpc.view.update.useMutation({
        onSuccess: () => {
            if (props.viewId) void utils.view.get.invalidate({ id: props.viewId });
        }
    });

    const saveStyles = useCallback((styles: any) => {
        if (!viewIdRef.current) return;

        // Get the most up-to-date config from the cache to avoid race conditions
        const currentConfig = utils.view.get.getData({ id: viewIdRef.current })?.config || initialConfigRef.current;

        updateViewMutation.mutate({
            id: viewIdRef.current,
            config: {
                ...(currentConfig as any),
                mindMap: {
                    ...((currentConfig as any)?.mindMap || {}),
                    nodeStyles: styles
                },
                mindMapMode: 'tasks'
            } as any
        });
    }, [updateViewMutation, utils.view.get]); // Stable dependencies

    const saveStylesRef = useRef(saveStyles);
    saveStylesRef.current = saveStyles;

    // Collapsed nodes state
    const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(() => {
        const saved = (props.initialConfig as any)?.mindMap?.collapsedNodes;
        return new Set(Array.isArray(saved) ? saved : []);
    });

    useEffect(() => {
        const saved = (props.initialConfig as any)?.mindMap?.collapsedNodes;
        if (Array.isArray(saved)) {
            setCollapsedNodes(new Set(saved));
        }
    }, [props.initialConfig]);

    // Fetch tasks for this view context
    const taskQueryInput = useMemo(() => {
        const base: any = {
            scope: 'all',
            pageSize: 500,
            includeSubtasks: true,
        };
        if (listId) base.listId = listId;
        else if (folderId) base.folderId = folderId;
        else if (projectId) base.projectId = projectId;
        else if (spaceId) base.spaceId = spaceId;
        return base;
    }, [listId, folderId, projectId, spaceId]);

    const { data: tasks } = trpc.task.list.useQuery(taskQueryInput, {
        enabled: !!(listId || folderId || projectId || spaceId),
    });

    // Stable ref so callbacks can read latest tasks without being unstable
    const tasksRef = useRef(tasks as any);
    tasksRef.current = tasks as any;

    // Compute the root entity (the container that becomes the center node)
    const rootEntity = useMemo(() => {
        if (listId) {
            const list = (props.lists || []).find((l: any) => l.id === listId);
            return { id: listId, name: list?.name || 'List', type: 'list' };
        }
        if (folderId) return { id: folderId, name: 'Folder', type: 'folder' };
        if (projectId) return { id: projectId, name: 'Project', type: 'project' };
        if (spaceId) return { id: spaceId, name: 'Space', type: 'space' };
        return { id: 'root', name: 'Mind Map', type: 'list' };
    }, [listId, folderId, projectId, spaceId, props.lists]);

    // Flat list of task items for bulk actions and inline add
    const filteredTasks = useMemo(() => {
        return (tasks as any)?.items || [];
    }, [tasks]);

    const rootEntityRef = useRef(rootEntity);
    rootEntityRef.current = rootEntity;
    const filteredTasksRef = useRef(filteredTasks);
    filteredTasksRef.current = filteredTasks;

    const onNodeDragStop = useCallback((event: any, node: Node) => {
        const dx = (node.position.x - worldBounds.offsetX) - (nodesRef.current.find(n => n.id === node.id)?.x || 0);
        const dy = (node.position.y - worldBounds.offsetY) - (nodesRef.current.find(n => n.id === node.id)?.y || 0);

        if (dx === 0 && dy === 0) return;

        setNodeStyles(prev => {
            const currentStyle = prev[node.id] || {};
            const next = {
                ...prev,
                [node.id]: {
                    ...currentStyle,
                    offsetX: (currentStyle.offsetX || 0) + dx,
                    offsetY: (currentStyle.offsetY || 0) + dy
                }
            };
            saveStylesRef.current(next);
            return next;
        });
        setHasUnsavedChanges(true);
    }, [worldBounds.offsetX, worldBounds.offsetY]); // Still depends on offsets for calculation, but stable offsets would be better

    const handleToggleCollapse = useCallback((nodeId: string) => {
        setCollapsedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }

            if (viewIdRef.current) {
                const currentConfig = utils.view.get.getData({ id: viewIdRef.current })?.config || initialConfigRef.current;
                updateViewMutation.mutate({
                    id: viewIdRef.current,
                    config: {
                        ...(currentConfig as any),
                        mindMap: {
                            ...((currentConfig as any)?.mindMap || {}),
                            collapsedNodes: Array.from(next)
                        }
                    } as any
                });
            }

            return next;
        });
    }, [updateViewMutation, utils.view.get]); // Stable dependencies

    // Bulk edit state
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
    // Stable ref for selectedTasks so callbacks don't need to redeclare on selection change
    const selectedTasksRef = useRef(selectedTasks);
    selectedTasksRef.current = selectedTasks;

    const [lastSelectedTaskId, setLastSelectedTaskId] = useState<string | null>(null);
    const [bulkModal, setBulkModal] = useState<string | null>(null);
    const [bulkStatusSearch, setBulkStatusSearch] = useState("");
    const [bulkSendNotifications, setBulkSendNotifications] = useState(true);
    const [bulkMoveKeepInList, setBulkMoveKeepInList] = useState(false);
    const [bulkAssigneeIds, setBulkAssigneeIds] = useState<string[]>([]);
    const [bulkCustomFieldSearch, setBulkCustomFieldSearch] = useState("");
    const [bulkCustomFieldId, setBulkCustomFieldId] = useState<string | null>(null);
    const [bulkCustomFieldDraftValue, setBulkCustomFieldDraftValue] = useState<any>(null);
    const [bulkTagInput, setBulkTagInput] = useState("");
    const [bulkTags, setBulkTags] = useState<string[]>([]);
    const [bulkDuplicateModalOpen, setBulkDuplicateModalOpen] = useState(false);

    const updateTask = trpc.task.update.useMutation({
        onSuccess: () => {
            // Invalidate to refresh tasks
            // But we are using the 'tasks' query result, which TRPC should auto-invalidate if we invalidate the query key
            // For now, let's assume parent or a context invalidates 'task.list'
            utils.task.list.invalidate();
        }
    });
    const bulkDuplicateTask = trpc.task.bulkDuplicate.useMutation({
        onSuccess: () => {
            utils.task.list.invalidate();
            toast.success("Tasks duplicated");
        }

    });


    // Note: updateCustomField endpoint doesn't exist, using updateTask instead
    // const updateCustomField = trpc.task.updateCustomField.useMutation({
    //     onSuccess: () => {
    //         utils.task.list.invalidate();
    //     }
    // });

    const deleteTask = trpc.task.delete.useMutation({
        onSuccess: () => {
            utils.task.list.invalidate();
            toast.success("Task deleted");
            setSelectedTasks([]);
        }
    });

    const createTask = trpc.task.create.useMutation({
        onSuccess: () => {
            utils.task.list.invalidate();
            toast.success("Task created");
        }
    });

    // State for task creation and UI
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

    // Inline add state
    const [inlineAddParentId, setInlineAddParentId] = useState<string | null>(null);
    const [inlineAddTitle, setInlineAddTitle] = useState("");
    const [inlineAddTaskType, setInlineAddTaskType] = useState<string | null>(null);
    const [inlineAddAssigneeIds, setInlineAddAssigneeIds] = useState<string[]>([]);
    const [inlineAddDueDate, setInlineAddDueDate] = useState<Date | null>(null);
    const [inlineAddPriority, setInlineAddPriority] = useState<"URGENT" | "HIGH" | "NORMAL" | "LOW" | null>(null);
    const [inlineAddTags, setInlineAddTags] = useState<string[]>([]);
    const [inlineAddListId, setInlineAddListId] = useState<string | null>(null);
    const [inlineAddStatusId, setInlineAddStatusId] = useState<string | null>(null);
    const [inlineAddAnchorRect, setInlineAddAnchorRect] = useState<DOMRect | null>(null);
    const [inlineAddPopoverOpen, setInlineAddPopoverOpen] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const inlineAddRef = useRef<HTMLDivElement>(null);
    const bulkBarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (selectedTasks.length === 0) return;
            const target = e.target as HTMLElement;
            // Don't clear if clicking the bulk bar itself
            if (bulkBarRef.current?.contains(target)) return;
            // Don't clear if clicking a node or edge
            if (target.closest('.react-flow__node') || target.closest('.react-flow__edge')) return;
            // Don't clear if clicking a modal, popover, or dropdown
            if (target.closest('[role="dialog"]') || target.closest('[role="menu"]') || target.closest('.radix-popover-content')) return;

            setSelectedTasks([]);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedTasks.length]);

    useEffect(() => {
        if (!inlineAddPopoverOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target === document.documentElement || target === document.body) return;
            if (inlineAddRef.current && inlineAddRef.current.contains(target)) return;
            setInlineAddPopoverOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [inlineAddPopoverOpen]);

    const handleExpandNode = useCallback((id: string) => {
        setExpandedTaskId(id);
    }, []);

    const handleShowTasks = useCallback((id: string, rect: DOMRect) => {
        setTasksListModalNodeId(id);
        setTasksListAnchorRect(rect);
    }, []);


    const handleNodeClick = useCallback((id: string, isMulti?: boolean) => {
        if (id === rootEntityRef.current.id) return; // Don't select root

        setSelectedTasks(prev => {
            if (isMulti) {
                if (prev.includes(id)) {
                    return prev.filter(t => t !== id);
                } else {
                    return [...prev, id];
                }
            } else {
                if (prev.length === 1 && prev[0] === id) {
                    onTaskSelectRef.current?.(null);
                    return [];
                } else {
                    onTaskSelectRef.current?.(id);
                    return [id];
                }
            }
        });
        setLastSelectedTaskId(id);
    }, []); // stable - uses onTaskSelectRef

    const openInlineAdd = useCallback((parentId: string | null, anchorRect?: DOMRect) => {
        setInlineAddParentId(parentId);
        setInlineAddTitle("");
        setInlineAddTaskType(availableTaskTypesRef.current[0]?.id || null);
        setInlineAddAssigneeIds([]);
        setInlineAddDueDate(null);
        setInlineAddPriority(null);
        setInlineAddTags([]);
        setInlineAddListId(listIdRef.current || null);
        setInlineAddStatusId(null);
        setInlineAddAnchorRect(anchorRect || null);
        setInlineAddPopoverOpen(true);
    }, []); // stable - uses refs

    const openInlineAddForConversion = useCallback((taskId: string, anchorRect?: DOMRect) => {
        const task = (tasksRef.current as any)?.items?.find((t: any) => t.id === taskId);
        setInlineAddParentId(task?.parentId || null);
        setInlineAddTitle(task?.title || "");
        setInlineAddTaskType(task?.taskTypeId || availableTaskTypesRef.current[0]?.id || null);
        setInlineAddAssigneeIds(task?.assigneeIds || []);
        setInlineAddDueDate(task?.dueDate);
        setInlineAddPriority(task?.priority);
        setInlineAddTags(task?.tags || []);
        setInlineAddListId(task?.listId || listIdRef.current || null);
        setInlineAddStatusId(task?.statusId || null);
        setInlineAddAnchorRect(anchorRect || null);
        setInlineAddPopoverOpen(true);
    }, []); // stable - uses refs

    const handleSaveInlineTask = useCallback(async () => {
        if (!inlineAddTitle.trim()) return;
        try {
            const finalParentId = (inlineAddParentId && inlineAddParentId !== rootEntityRef.current.id) ? inlineAddParentId : undefined;
            const parentTask = inlineAddParentId ? filteredTasksRef.current.find(t => t.id === inlineAddParentId) : null;
            const finalListId = parentTask?.listId || inlineAddListId || listId;

            await createTask.mutateAsync({
                title: inlineAddTitle,
                parentId: finalParentId ?? undefined,
                statusId: inlineAddStatusId || undefined,
                taskTypeId: inlineAddTaskType || undefined,
                assigneeIds: inlineAddAssigneeIds,
                dueDate: inlineAddDueDate || undefined,
                priority: inlineAddPriority || undefined,
                tags: inlineAddTags,
                listId: finalListId as string,
                workspaceId: resolvedWorkspaceId as string,
                spaceId: spaceId ?? undefined,
                projectId: projectId ?? undefined,
                teamId: teamId ?? undefined,
                folderId: folderId ?? undefined,
            } as any);
            setInlineAddPopoverOpen(false);
        } catch (error) {
            console.error('DEBUG:Task creation', error);
            toast.error("Failed to create task");
        }
    }, [inlineAddTitle, inlineAddParentId, inlineAddStatusId, inlineAddTaskType, inlineAddAssigneeIds, inlineAddDueDate, inlineAddPriority, inlineAddTags, inlineAddListId, listId, resolvedWorkspaceId, spaceId, projectId, teamId, folderId, createTask]);

    const handleTaskUpdate = useCallback(async (id: string, updates: Partial<any>) => {
        try {
            await updateTask.mutateAsync({ id, ...updates });
        } catch (error) {
            toast.error("Failed to update task");
        }
    }, [updateTask]);

    const handleNodeUpdate = useCallback(async (id: string, updates: Partial<MindMapNodeData>) => {
        if (updates.text !== undefined) {
            await handleTaskUpdate(id, { title: updates.text });
        }
        if (updates.description !== undefined) {
            await handleTaskUpdate(id, { description: updates.description });
        }
        if (updates.tags !== undefined) {
            await handleTaskUpdate(id, { tags: updates.tags });
        }
    }, [handleTaskUpdate]);

    const handleChangeColor = useCallback((id: string, color: string) => {
        setNodeStyles(prev => {
            const next = { ...prev, [id]: { ...prev[id], color } };
            saveStylesRef.current(next);
            return next;
        });
    }, []);

    const handleChangeShape = useCallback((id: string, shape: MindMapNodeData['shape']) => {
        setNodeStyles(prev => {
            const next = { ...prev, [id]: { ...prev[id], shape } };
            saveStylesRef.current(next);
            return next;
        });
    }, []);

    const handleDeleteNode = useCallback((id: string) => {
        deleteTask.mutate({ id });
    }, [deleteTask]);

    const nodeTypes = useMemo(() => ({
        mindMap: MindMapFlowNode,
    }), []);

    useEffect(() => {
        if (!tasks || !rootEntity) return;
        const newNodes: MindMapNodeData[] = [];
        const rootId = rootEntity.id || 'root';

        const tasksByParent: Record<string, any[]> = {};
        const topLevelTasks: any[] = [];
        const taskItems = (tasks as any)?.items || [];

        taskItems.forEach((task: any) => {
            if (task.parentId) {
                if (!tasksByParent[task.parentId]) tasksByParent[task.parentId] = [];
                tasksByParent[task.parentId].push(task);
            } else {
                topLevelTasks.push(task);
            }
        });

        const getSubtreeSize = (taskId: string): number => {
            if (collapsedNodes.has(taskId)) return 1;
            const children = (taskId === rootId) ? topLevelTasks : (tasksByParent[taskId] || []);
            if (children.length === 0) return 1;
            return children.reduce((sum, child) => sum + getSubtreeSize(child.id), 0);
        };

        const HORIZONTAL_SPACING = 350;
        const VERTICAL_SPACING = 80;

        const positionNode = (
            id: string,
            data: any,
            x: number,
            yStart: number,
            parentId?: string,
            accOffsetX: number = 0,
            accOffsetY: number = 0
        ) => {
            const subtreeSize = getSubtreeSize(id);
            const subtreeHeight = subtreeSize * VERTICAL_SPACING;
            const yCenter = yStart + (subtreeHeight / 2);

            const isNodeCollapsed = collapsedNodes.has(id);
            const children = id === rootId ? topLevelTasks : (tasksByParent[id] || []);

            const style = nodeStyles[id] || {};
            const totalOffsetX = accOffsetX + (style.offsetX || 0);
            const totalOffsetY = accOffsetY + (style.offsetY || 0);

            const nodeColor = style.color || (parentId ? 'Blue' : 'Indigo');
            const nodeShape = style.shape || (parentId ? 'rounded' : 'circle');
            const nodeHeight = (nodeShape === 'circle' || nodeShape === 'diamond') ? 120 : 60;
            const finalX = x + totalOffsetX;
            const finalY = yCenter + totalOffsetY - (nodeHeight / 2);

            newNodes.push({
                id: id,
                text: data.title || data.name || 'Untitled',
                x: finalX,
                y: finalY,
                parentId: parentId,
                color: nodeColor,
                shape: nodeShape,
                fontSize: parentId ? 14 : 18,
                isRoot: !parentId,
                tags: data.tags || [],
                description: data.description,
                statusColor: data.status?.color,
                entityType: 'task',
                collapsed: isNodeCollapsed,
                childCount: children.length,
            } as any);

            if (!isNodeCollapsed) {
                let childYStart = yStart;
                children.forEach(child => {
                    const childSize = getSubtreeSize(child.id);
                    positionNode(child.id, child, x + HORIZONTAL_SPACING, childYStart, id, totalOffsetX, totalOffsetY);
                    childYStart += childSize * VERTICAL_SPACING;
                });
            }
        };

        positionNode(rootId, { name: rootEntity.name || 'Mind Map' }, 100, 100);

        const rootNode = newNodes.find(n => n.id === rootId);
        if (rootNode) {
            const style = nodeStyles[rootId] || {};
            rootNode.color = style.color || 'Indigo';
            rootNode.shape = style.shape || 'circle';
            rootNode.isRoot = true;
            rootNode.entityType = listId ? 'list' : folderId ? 'folder' : projectId ? 'project' : spaceId ? 'space' : 'list';
        }

        setNodes(newNodes);
    }, [tasks, rootEntity, collapsedNodes, nodeStyles, listId, folderId, projectId, spaceId]);

    // 2. React Flow mapping - depends on computed nodes and world transformation
    useEffect(() => {
        if (nodes.length === 0) return;

        const flowNodes: Node[] = nodes.map(node => ({
            id: node.id,
            type: 'mindMap',
            position: { x: node.x + worldBounds.offsetX, y: node.y + worldBounds.offsetY },
            data: {
                node,
                childCount: node.childCount,
                onUpdate: handleNodeUpdate,
                onDelete: handleDeleteNode,
                onAddChild: openInlineAdd,
                onToggleCollapse: handleToggleCollapse,
                onChangeColor: handleChangeColor,
                onChangeShape: handleChangeShape,
                allAvailableTags,
                onExpand: handleExpandNode,
                onClick: handleNodeClick,
                workspaceId: resolvedWorkspaceId,
                spaceId,
                projectId,
                onConvertToTask: openInlineAddForConversion,
                onShowTasks: handleShowTasks,
                onTaskUpdate: handleTaskUpdate,
                session,
                viewAutosave,
            },
        }));


        const flowEdges: Edge[] = nodes
            .filter(n => n.parentId)
            .map(n => ({
                id: `e-${n.parentId}-${n.id}`,
                source: n.parentId!,
                target: n.id,
                type: 'default',
                animated: false,
                style: { stroke: '#cbd5e1', strokeWidth: 2 },
            }));

        setRfNodes(flowNodes);
        setRfEdges(flowEdges);
        // Callbacks are all stable (use refs), so only real data deps are needed.
        // selectedTasks is passed via per-node closure using selectedTasksRef to avoid
        // rebuilding all nodes on every selection change.
    }, [nodes, worldBounds.offsetX, worldBounds.offsetY, allAvailableTags, resolvedWorkspaceId, spaceId, projectId, session, viewAutosave]);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );


    return (
        <div className={cn("h-full flex flex-col bg-white border border-zinc-200/60 shadow-sm overflow-hidden relative", isFullscreen && "fixed inset-0 z-50")}>
            <MindMapHeader {...props} />
            <div className="border-b border-zinc-100 bg-zinc-50/30 px-3 py-1.5 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-1.5"><div className="text-xs text-zinc-500 font-medium px-2">{nodes.length} nodes from tasks</div></div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsFullscreen(!isFullscreen)}>
                        {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                    </Button>
                </div>
            </div>

            {/* Bulk Edit Bar */}
            {
                selectedTasks.length > 0 && (
                    <div
                        ref={bulkBarRef}
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
                )
            }

            {/* Bulk Duplicate Modal */}
            <DuplicateTaskModal
                open={bulkDuplicateModalOpen}
                onOpenChange={setBulkDuplicateModalOpen}
                taskIds={selectedTasks}
                workspaceId={resolvedWorkspaceId as string}
            />

            {/* Custom Field Value Dialog */}
            <Dialog open={!!bulkCustomFieldId} onOpenChange={(open) => { if (!open) { setBulkCustomFieldId(null); setBulkCustomFieldDraftValue(null); } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{(customFields as any[]).find(f => f.id === bulkCustomFieldId)?.name ?? "Custom field"}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-zinc-500 mb-2">Update value for {selectedTasks.length} selected task(s).</p>
                        {bulkCustomFieldId && (() => {
                            const field = (customFields as any[]).find(f => f.id === bulkCustomFieldId);
                            // Need to adapt field object to what CustomFieldRenderer expects
                            const adaptedField = field ? { ...field, type: field.type || field.config?.fieldType } : null;
                            if (!adaptedField) return null;
                            return (
                                <CustomFieldRenderer
                                    field={adaptedField}
                                    value={bulkCustomFieldDraftValue}
                                    onChange={setBulkCustomFieldDraftValue}
                                    disabled={updateTask.isPending}
                                />
                            );
                        })()}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setBulkCustomFieldId(null); setBulkCustomFieldDraftValue(null); }}>Cancel</Button>
                        <Button onClick={async () => {
                            if (!bulkCustomFieldId) return;
                            for (const taskId of selectedTasks) {
                                // Using updateTask since updateCustomField doesn't exist
                                await updateTask.mutateAsync({
                                    id: taskId,
                                    customFields: { [bulkCustomFieldId]: bulkCustomFieldDraftValue }
                                } as any);
                            }
                            setBulkCustomFieldId(null);
                            setBulkCustomFieldDraftValue(null);
                            setBulkModal(null);
                        }}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* React Flow Canvas */}
            <div className="flex-1 relative overflow-hidden bg-zinc-50/50">
                <ReactFlow
                    nodes={rfNodes}
                    edges={rfEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeDragStop={onNodeDragStop}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    minZoom={0.1}
                    maxZoom={2}
                    className="canvas-bg"
                >
                    <Background color="#cbd5e1" variant={BackgroundVariant.Dots} />
                    {showMinimap && <Panel position="bottom-right"><MiniMap zoomable pannable style={{ borderRadius: '12px', border: '1px solid #e4e4e7', background: '#ffffffcc', backdropFilter: 'blur(8px)' }} /></Panel>}
                    <Panel position="bottom-left" className="flex flex-col gap-2 m-4">
                        <Controls className="!bg-white/80 !backdrop-blur-md !border-zinc-200 !shadow-lg !rounded-xl overflow-hidden" />
                    </Panel>
                </ReactFlow>
            </div>

            {/* Task Detail Modal */}
            {
                expandedTaskId && (
                    <TaskDetailModal
                        open={!!expandedTaskId}
                        onOpenChange={(open) => !open && setExpandedTaskId(null)}
                        taskId={expandedTaskId}
                    />
                )
            }

            {/* Task Creation Bar */}
            {/* Task Creation Bar Popover */}
            {
                inlineAddPopoverOpen && inlineAddAnchorRect && (
                    <div
                        ref={inlineAddRef}
                        style={{
                            position: 'fixed',
                            left: inlineAddAnchorRect.left + inlineAddAnchorRect.width / 2,
                            top: inlineAddAnchorRect.top + inlineAddAnchorRect.height + 8,
                            transform: 'translateX(-50%)',
                            zIndex: 40
                        }}
                        className="animate-in fade-in slide-in-from-top-2 duration-200"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center h-14 px-4 gap-2 w-max min-w-[500px] max-w-[95vw] overflow-visible rounded-[24px] border border-zinc-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.15)] bg-white/95 backdrop-blur-xl ring-1 ring-black/5">
                            {/* Title Input */}
                            <Input
                                id="inline-add-task-title"
                                value={inlineAddTitle}
                                onChange={(e) => setInlineAddTitle(e.target.value)}
                                placeholder="Task Name"
                                className="flex-1 h-10 border-none bg-transparent shadow-none focus-visible:ring-0 text-[15px] font-medium placeholder:text-zinc-300 min-w-[200px]"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && inlineAddTitle.trim()) {
                                        handleSaveInlineTask();
                                    }
                                    if (e.key === 'Escape') setInlineAddPopoverOpen(false);
                                }}
                            />

                            {/* Property Icons */}
                            <div className="flex items-center gap-1.5 shrink-0 pr-1">
                                {/* Assignees */}
                                <AssigneeSelector
                                    users={users}
                                    agents={agents}
                                    workspaceId={resolvedWorkspaceId}
                                    value={inlineAddAssigneeIds}
                                    onChange={setInlineAddAssigneeIds}
                                    variant="compact"
                                    trigger={
                                        <Button
                                            id="inline-add-assignee-btn"
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                                "h-9 w-9 rounded-full transition-all border border-dashed hover:bg-zinc-100 flex items-center justify-center",
                                                inlineAddAssigneeIds.length > 0 ? "border-indigo-500/30 bg-indigo-50/50" : "border-zinc-200"
                                            )}
                                        >
                                            {inlineAddAssigneeIds.length > 0 ? (
                                                <div className="flex -space-x-2">
                                                    {inlineAddAssigneeIds.slice(0, 2).map(id => {
                                                        const isAgent = id.startsWith('agent:');
                                                        const cleanId = id.includes(':') ? id.split(':')[1] : id;
                                                        const u = isAgent ? agents.find(a => a.id === cleanId) : users.find(u => u.id === cleanId);
                                                        return (
                                                            <Avatar key={id} className="h-6 w-6 border-2 border-white ring-1 ring-zinc-100">
                                                                <AvatarImage src={isAgent ? u?.avatar : u?.image} />
                                                                <AvatarFallback className={cn("text-[8px]", isAgent ? "bg-purple-100 text-purple-700" : "bg-indigo-50 text-indigo-800")}>
                                                                    {isAgent ? <Bot className="h-3 w-3" /> : u?.name?.[0]}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <UserRound className="h-[18px] w-[18px] text-zinc-400" />
                                            )}
                                        </Button>
                                    }
                                />

                                {/* Task Type */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            id="inline-add-type-btn"
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                                "h-9 w-9 rounded-full transition-all border border-dashed hover:bg-zinc-100 flex items-center justify-center",
                                                inlineAddTaskType ? "border-indigo-500/30 bg-indigo-50/50" : "border-zinc-200"
                                            )}
                                        >
                                            {(() => {
                                                const type = availableTaskTypes.find(t => t.id === inlineAddTaskType);
                                                return type ? <TaskTypeIcon type={type} className="h-[18px] w-[18px]" /> : <Box className="h-[18px] w-[18px] text-zinc-400" />;
                                            })()}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56 rounded-2xl p-2 shadow-2xl border-zinc-100" align="end" sideOffset={12}>
                                        <div className="p-2 pb-1">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2">Task Type</span>
                                        </div>
                                        {availableTaskTypes.map(t => (
                                            <DropdownMenuItem key={t.id} onSelect={() => setInlineAddTaskType(t.id)} className="rounded-xl gap-2 font-medium h-9">
                                                <TaskTypeIcon type={t} className="h-4 w-4" />
                                                {t.name}
                                                {inlineAddTaskType === t.id && <Check className="ml-auto h-4 w-4 text-indigo-600" />}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Status */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            id="inline-add-status-btn"
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                                "h-9 w-9 rounded-full transition-all border border-dashed hover:bg-zinc-100 flex items-center justify-center",
                                                inlineAddStatusId ? "border-indigo-500/30 bg-indigo-50/50" : "border-zinc-200"
                                            )}
                                        >
                                            {(() => {
                                                const status = allAvailableStatuses.find(s => s.id === inlineAddStatusId);
                                                if (status) return <div className="h-3 w-3 rounded-full" style={{ backgroundColor: status.color || "#94a3b8" }} />;
                                                return <Circle className="h-[18px] w-[18px] text-zinc-400" />;
                                            })()}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56 rounded-2xl p-2 shadow-2xl border-zinc-100" align="end" sideOffset={12}>
                                        <div className="p-2 pb-1">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2">Status</span>
                                        </div>
                                        {(allAvailableStatuses as any[]).filter(s => s.listId === inlineAddListId || !s.listId).map(s => (
                                            <DropdownMenuItem key={s.id} onSelect={() => setInlineAddStatusId(s.id)} className="rounded-xl gap-2 font-medium h-9">
                                                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color || "#94a3b8" }} />
                                                {s.name}
                                                {inlineAddStatusId === s.id && <Check className="ml-auto h-4 w-4 text-indigo-600" />}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Priority */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            id="inline-add-priority-btn"
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                                "h-9 w-9 rounded-full transition-all border border-dashed hover:bg-zinc-100 flex items-center justify-center",
                                                inlineAddPriority ? "border-indigo-500/30 bg-indigo-50/50" : "border-zinc-200"
                                            )}
                                        >
                                            <Flag className={cn("h-[18px] w-[18px]",
                                                inlineAddPriority === 'URGENT' ? "text-red-500 fill-red-500" :
                                                    inlineAddPriority === 'HIGH' ? "text-orange-500 fill-orange-500" :
                                                        inlineAddPriority === 'NORMAL' ? "text-blue-500 fill-blue-500" :
                                                            inlineAddPriority === 'LOW' ? "text-zinc-400 fill-zinc-400" : "text-zinc-400"
                                            )} />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-40 rounded-2xl p-2 shadow-2xl border-zinc-100" align="end" sideOffset={12}>
                                        {(['URGENT', 'HIGH', 'NORMAL', 'LOW'] as const).map(p => (
                                            <DropdownMenuItem key={p} onSelect={() => setInlineAddPriority(p)} className="rounded-xl gap-2 font-medium h-9">
                                                <Flag className={cn("h-4 w-4",
                                                    p === 'URGENT' ? "text-red-500 fill-red-500" :
                                                        p === 'HIGH' ? "text-orange-500 fill-orange-500" :
                                                            p === 'NORMAL' ? "text-blue-500 fill-blue-500" : "text-zinc-400 fill-zinc-400"
                                                )} />
                                                <span className="capitalize">{p.toLowerCase()}</span>
                                                {inlineAddPriority === p && <Check className="ml-auto h-4 w-4 text-indigo-600" />}
                                            </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator className="my-1.5" />
                                        <DropdownMenuItem onSelect={() => setInlineAddPriority(null)} className="rounded-xl font-medium h-9 text-zinc-500">
                                            Clear Priority
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Due Date */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="inline-add-due-date-btn"
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                                "h-9 w-9 rounded-full transition-all border border-dashed hover:bg-zinc-100 flex items-center justify-center",
                                                inlineAddDueDate ? "border-indigo-500/30 bg-indigo-50/50" : "border-zinc-200"
                                            )}
                                        >
                                            <Calendar className={cn("h-[18px] w-[18px]", inlineAddDueDate ? "text-indigo-600" : "text-zinc-400")} />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-none" align="end" sideOffset={12}>
                                        <SingleDateCalendar
                                            selectedDate={inlineAddDueDate || undefined}
                                            onDateChange={(date) => setInlineAddDueDate(date || null)}
                                        />
                                        {inlineAddDueDate && (
                                            <div className="p-2 border-t border-zinc-100 bg-zinc-50/50 rounded-b-2xl">
                                                <Button variant="ghost" className="w-full h-8 text-xs font-bold text-red-500 hover:text-red-700" onClick={() => setInlineAddDueDate(null)}>
                                                    Remove Date
                                                </Button>
                                            </div>
                                        )}
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Create Button */}
                            <Button
                                id="inline-add-create-btn"
                                onClick={handleSaveInlineTask}
                                disabled={!inlineAddTitle.trim() || createTask.isPending}
                                className="bg-black text-white hover:bg-black/90 h-10 px-6 rounded-xl font-bold text-[14px] shadow-lg shadow-black/10 transition-all active:scale-95 disabled:opacity-30 ml-1"
                            >
                                {createTask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                            </Button>
                        </div>
                    </div>
                )
            }

            {tasksListModalNodeId && tasksListAnchorRect && (
                <TasksListModal
                    nodeId={tasksListModalNodeId}
                    anchorRect={tasksListAnchorRect}
                    onClose={() => setTasksListModalNodeId(null)}
                    workspaceId={resolvedWorkspaceId!}
                    projectId={projectId!}
                    onTaskSelect={(tid) => {
                        onTaskSelectRef.current?.(tid);
                        setTasksListModalNodeId(null);
                    }}
                    nodes={nodes}
                />
            )}
        </div>
    );
}
