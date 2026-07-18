'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    X, Share2, MoreHorizontal, Star, Settings,
    Calendar as CalendarIcon, Flag, Clock, Tag as TagIcon,
    CheckSquare, Paperclip, Bot, Save,
    LayoutList, Plus, History, ChevronRight, ChevronsRight, ChevronsLeft, User as UserIcon,
    ArrowRight, Layers, List, PanelLeftClose, PanelLeft,
    Maximize2, Minimize2, Square, SidebarClose, Check, Folder, SquareArrowRight, Heart,
    LayoutTemplate, HelpCircle, Hourglass, Target, CheckCircle2,
    MessageSquare, MinusCircle, GripVertical, Pencil, LayoutGrid, List as ListIcon, ArrowLeftRight, FileText,
    AlertTriangle, Link2, Bell, SlidersHorizontal, Smile, Store
} from 'lucide-react';
import { PublishEntityModal } from '@/features/marketplace/components/PublishEntityModal';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Search } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { TaskPermissionsModal } from './TaskPermissionsModal';
import { TaskMoveAndAddPopover } from './TaskMoveAndAddPopover';
import { TaskActionsDropdown } from './TaskActionsDropdown';
import { AssigneeSelector, formatAssigneeIdsForSelector } from './AssigneeSelector';
import { LazyDescriptionEditor, type DescriptionEditorRef } from '@/entities/shared/components/LazyDescriptionEditor';
import { ResizableSplitLayout, SidePanelContainer } from '@/components/layout/ResizableSplitLayout';
import { Panel, Group, Separator as ResizableSeparator } from 'react-resizable-panels';
import { Checkbox } from '@/components/ui/checkbox';
import { SpaceIcon } from "@/entities/spaces/components/SpaceIcon";
import { TimeTrackingModal } from './TimeTrackingModal';
import { TaskLinksPanelContent } from './TaskLinksPanelContent';
import { LinksPanelContent } from './LinksPanelContent';
import { AddRelationshipSection } from './AddRelationshipSection';
import type { CustomRelationshipType } from './CreateCustomRelationshipModal';
import { ChecklistsSection } from './ChecklistsSection';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { SubtasksTable } from './SubtasksTable';
import { AttachmentsSection } from './AttachmentsSection';
import { TaskRelationshipsSection } from './TaskRelationshipsSection';
import { BlockingPanelContent } from './BlockingPanelContent';
import { WaitingOnPanelContent } from './WaitingOnPanelContent';
import { DocLinksPanelContent } from './DocLinksPanelContent';
import { useDebounce } from '@/hooks/useDebounce';
import { RelatedPanelContent } from './RelatedPanelContent';
import { CustomFieldsSection } from './CustomFieldsSection';
import { ChatView } from '@/features/dashboard/views/shared/SharedAIChatView';
import { TaskCalendar } from './TaskCalendar';
import { TaskTypeIcon } from './TaskTypeIcon';
import { toast } from 'sonner';
import { storageUtils } from '@/utils/storage/storageUtils';
import { CoverPickerPopover } from '@/features/dashboard/components/modals/CoverPickerPopover';
import { Image as ImageIcon, Circle, ChevronDown, Fingerprint, Droplet, Upload, Scan } from 'lucide-react';

export type TaskLayoutMode = 'modal' | 'fullscreen' | 'sidebar';

const ACTIVITY_FILTER_OPTIONS: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'comments', label: 'Comments', icon: MessageSquare },
    { id: 'assignee', label: 'Assignee', icon: UserIcon },
    { id: 'due_date', label: 'Due date', icon: CalendarIcon },
    { id: 'priority', label: 'Priority', icon: Flag },
    { id: 'status', label: 'Status', icon: Check },
    { id: 'attachments', label: 'Attachments', icon: Paperclip },
    { id: 'checklists', label: 'Checklists', icon: CheckSquare },
    { id: 'dependencies', label: 'Dependencies', icon: Link2 },
    { id: 'subtasks', label: 'Subtasks', icon: List },
    { id: 'custom_fields', label: 'Custom Fields', icon: Pencil },
    { id: 'tags', label: 'Tags', icon: TagIcon },
    { id: 'time_tracked', label: 'Time tracked', icon: Clock },
    { id: 'task_creation', label: 'Task creation', icon: Plus },
    { id: 'name', label: 'Name', icon: Layers },
    { id: 'list', label: 'List', icon: ListIcon },
];

/** Map an activity/comment item to the filter option id used in the Activities filter. */
function getActivityFilterType(item: { type: string; action?: string; field?: string | null }): string {
    if (item.type === 'comment') return 'comments';
    const action = item.action ?? '';
    const field = (item.field ?? '').toLowerCase();
    if (action === 'CREATED') return 'task_creation';
    if (action === 'ASSIGNED' || action === 'UNASSIGNED') return 'assignee';
    if (action === 'STATUS_CHANGED' || field === 'statusid') return 'status';
    if (action === 'PRIORITY_CHANGED' || field === 'priority') return 'priority';
    if (action === 'DUE_DATE_CHANGED' || field === 'duedate') return 'due_date';
    if (action === 'ATTACHED' || field === 'attachments') return 'attachments';
    if (field === 'checklists') return 'checklists';
    if (field === 'dependencies') return 'dependencies';
    if (field === 'time_tracked') return 'time_tracked';
    if (field === 'title' || field === 'name') return 'name';
    if (action === 'COMMENTED') return 'comments';
    if (action === 'MOVED' || field === 'listid') return 'list';
    if (field === 'subtasks' || field === 'parentid') return 'subtasks';
    return 'status'; // fallback for other UPDATED
}

interface TaskDetailModalProps {
    taskId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    layoutMode?: TaskLayoutMode;
    onLayoutModeChange?: (mode: TaskLayoutMode) => void;
}

interface TaskDetailContentProps {
    taskId: string;
    onClose: () => void;
    layoutMode?: TaskLayoutMode;
    onLayoutModeChange?: (mode: TaskLayoutMode) => void;
}

/** Parse "3h 20m", "1h", "45m", "90" to minutes. */
function parseTimeEstimateInput(input: string): number | null {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return null;
    let totalMinutes = 0;
    const hMatch = trimmed.match(/(\d+)\s*h/);
    const mMatch = trimmed.match(/(\d+)\s*m/);
    if (hMatch) totalMinutes += parseInt(hMatch[1], 10) * 60;
    if (mMatch) totalMinutes += parseInt(mMatch[1], 10);
    if (!hMatch && !mMatch && /^\d+$/.test(trimmed)) {
        totalMinutes = parseInt(trimmed, 10);
    }
    return totalMinutes > 0 ? totalMinutes : null;
}

function TimeEstimateInput({
    taskId,
    currentMinutes,
    onSave,
    updateTask,
}: {
    taskId: string;
    currentMinutes?: number | null;
    onSave: () => void;
    updateTask: (payload: { id: string; timeEstimate: number | null }) => void;
}) {
    const toDisplay = (m: number) => {
        const h = Math.floor(m / 60);
        const min = m % 60;
        if (h > 0 && min > 0) return `${h}h ${min}m`;
        if (h > 0) return `${h}h`;
        return `${min}m`;
    };
    const [inputValue, setInputValue] = React.useState(() =>
        currentMinutes != null && currentMinutes > 0 ? toDisplay(currentMinutes) : ''
    );

    React.useEffect(() => {
        if (currentMinutes != null && currentMinutes > 0) {
            setInputValue(toDisplay(currentMinutes));
        } else {
            setInputValue('');
        }
    }, [currentMinutes]);

    const handleBlur = () => {
        const minutes = parseTimeEstimateInput(inputValue);
        if (minutes !== null) {
            updateTask({ id: taskId, timeEstimate: minutes });
            onSave();
        } else if (inputValue.trim() === '') {
            updateTask({ id: taskId, timeEstimate: null });
            onSave();
        }
    };

    return (
        <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            placeholder="Type in time"
            className="h-9 bg-white border-zinc-200 text-sm"
            autoFocus
        />
    );
}

function TagsEditor({
    tags,
    onSave,
}: {
    tags: string[];
    onSave: (tags: string[]) => void;
}) {
    const [local, setLocal] = React.useState<string[]>(tags);
    const [input, setInput] = React.useState('');
    React.useEffect(() => setLocal(tags), [tags]);
    const add = () => {
        const t = input.trim();
        if (!t || local.includes(t)) return;
        const next = [...local, t];
        setLocal(next);
        setInput('');
        onSave(next);
    };
    const remove = (index: number) => {
        const next = local.filter((_, i) => i !== index);
        setLocal(next);
        onSave(next);
    };
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
                {local.map((tag, i) => (
                    <Badge key={tag} variant="secondary" className="bg-zinc-100 text-zinc-600 border-zinc-200 text-[10px] h-5 px-1.5 gap-1">
                        {tag}
                        <button type="button" onClick={() => remove(i)} className="hover:text-red-600 rounded-full p-0.5" aria-label="Remove tag">
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
            </div>
            <div className="flex gap-2">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
                    placeholder="Type tag..."
                    className="h-8 text-sm"
                />
            </div>
        </div>
    );
}

function DescriptionSection({
    task,
    description,
    onDescriptionChange,
    onOpenAskAI,
    currentUserId,
    session,
    descriptionEditorRef
}: {
    task: any;
    description: string;
    onDescriptionChange: (content: string) => void;
    onOpenAskAI: () => void;
    currentUserId: string;
    session: any;
    descriptionEditorRef: React.RefObject<DescriptionEditorRef | null>;
}) {
    const [isMaximized, setIsMaximized] = React.useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);


    const [historyVersions, setHistoryVersions] = React.useState<any[]>([]);
    // To see the populated state (Image 2), you can call setHistoryVersions([{ id: '1', createdAt: new Date(), user: { name: session?.name || 'Dat nguyen', initials: session?.name ? session.name[0].toUpperCase() : 'D' } }])

    const isOverlayOpen = isMaximized || isHistoryOpen;

    const renderEditor = () => (
        <LazyDescriptionEditor
            ref={descriptionEditorRef}
            content={description}
            onChange={onDescriptionChange}
            editable={!isHistoryOpen}
            onOpenAskAI={onOpenAskAI}
            spaceId={task.spaceId ?? (task.list as any)?.spaceId ?? null}
            workspaceId={task.workspaceId ?? null}
            projectId={task.projectId ?? (task.list as any)?.projectId ?? null}
            minHeight={100}
            collaboration={{
                enabled: false,
                documentId: task.id,
                documentType: 'task',
                user: {
                    id: currentUserId,
                    name: session?.name || session?.email || 'User',
                }
            }}
        />
    );

    return (
        <div className={cn(
            "transition-all duration-200 bg-white",
            isOverlayOpen ? "absolute inset-0 z-50 flex" : "relative group/desc border-x md:border-y md:border-x-0 border-zinc-200 p-2 -ml-2"
        )}>
            {isOverlayOpen ? (
                <>
                    {isHistoryOpen && historyVersions.length === 0 ? (
                        <div className="flex-1 flex flex-col h-full bg-white relative">
                            <div className="absolute top-6 right-6 z-10">
                                <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-900 gap-1.5" onClick={() => setIsHistoryOpen(false)}>
                                    Close <Minimize2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                                <div className="h-16 w-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4 relative">
                                    <FileText className="h-8 w-8 text-zinc-400" />
                                    <div className="absolute -bottom-1 -right-1 bg-zinc-400 rounded-full p-1 border-2 border-white">
                                        <Heart className="h-3 w-3 text-white fill-current" />
                                    </div>
                                </div>
                                <h4 className="text-sm font-semibold text-zinc-900 mb-1">No description history</h4>
                                <p className="text-xs text-zinc-500">Once you add some text to your task description, you'll see it here.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 overflow-y-auto flex flex-col p-8 bg-white relative">
                                {isOverlayOpen && (
                                    <div className="absolute top-6 right-6 z-10">
                                        <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-900 gap-1.5" onClick={() => {
                                            setIsMaximized(false);
                                            setIsHistoryOpen(false);
                                        }}>
                                            Close <Minimize2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                                <div className={cn("max-w-4xl w-full mx-auto", "mt-12")}>
                                    {isHistoryOpen ? (
                                        <div className="mt-8">
                                            <h2 className="text-2xl font-bold text-zinc-900 mb-6">{task.title || "Untitled Task"}</h2>
                                            <div className="pointer-events-none opacity-90">
                                                {renderEditor()}
                                            </div>
                                        </div>
                                    ) : (
                                        renderEditor()
                                    )}
                                </div>
                            </div>

                            {isHistoryOpen && (
                                <div className="w-[320px] shrink-0 border-l border-zinc-200 bg-white flex flex-col h-full relative">
                                    <div className="p-4 pb-3 mt-2">
                                        <h3 className="text-[14px] font-semibold text-zinc-900">Version history</h3>
                                    </div>

                                    <div className="flex-1 overflow-y-auto px-4 mt-2">
                                        <div className="relative ml-2 pl-4 pb-4">
                                            {historyVersions.map((v, i) => (
                                                <div key={v.id} className={cn(
                                                    "p-3 rounded-lg border mb-4 relative",
                                                    i === 0 ? "bg-[#EEF2FF] border-[#E0E7FF]" : "bg-white border-zinc-200"
                                                )}>
                                                    <div className="absolute -left-[20px] top-4 w-2 h-2 rounded-sm rotate-45 bg-white border border-zinc-300" />
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[13px] font-medium text-zinc-900">
                                                            {i === 0 ? 'Current Version' : 'Previous Version'}
                                                        </span>
                                                    </div>
                                                    <div className="text-[12px] text-zinc-500 mb-2">
                                                        {format(v.createdAt, "MMM d, yyyy 'at' h:mma")}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Avatar className="h-5 w-5 rounded-full bg-zinc-800 text-white flex items-center justify-center text-[10px] font-medium">
                                                            {v.user?.initials || 'U'}
                                                        </Avatar>
                                                        <span className="text-[12px] text-zinc-700">{v.user?.name || 'User'}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <p className="text-[12px] text-zinc-500 px-1 mt-2">
                                            Version history will be stored for up to 365 days in task descriptions.
                                        </p>
                                    </div>

                                    <div className="p-4 border-t border-zinc-100 bg-white">
                                        <Button className="w-full bg-[#818cf8] hover:bg-[#6366f1] text-white font-medium shadow-sm h-9">
                                            Restore this version
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </>
            ) : (
                <>
                    <div className="w-full">
                        {renderEditor()}
                    </div>

                    <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover/desc:opacity-100 transition-opacity z-10">
                        <TooltipProvider delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200"
                                        onClick={() => setIsHistoryOpen(true)}
                                    >
                                        <History className="h-3 w-3" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>
                                    History
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200"
                                        onClick={() => setIsMaximized(true)}
                                    >
                                        <Maximize2 className="h-3 w-3" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>
                                    Fullscreen
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </>
            )}
        </div>
    );
}

const TaskAIChatPanel = ({
    task,
    onClose
}: {
    task: any,
    onClose: () => void
}) => {
    return (
        <SidePanelContainer
            onClose={onClose}
            title="Ask AI"
            icon={<Bot className="h-5 w-5 text-purple-600" />}
        >
            <div className="flex flex-col h-full bg-white overflow-hidden">
                <ChatView
                    contextType="TASK"
                    contextId={task.id}
                    contextName={task.title ?? 'Task'}
                    hideSidebar={true}
                />
            </div>
        </SidePanelContainer>
    );
};

/**
 * Hover-to-open layout picker.
 * - Hovering the trigger button opens the popover (no click required).
 * - Clicking the trigger button still cycles modal → fullscreen → sidebar → modal.
 * - Moving the mouse from the trigger into the popover content keeps it open
 *   (close is debounced so crossing the small gap between them doesn't close it).
 * - Selecting an option in the popover applies that layout and closes immediately.
 */
function LayoutModePopover({
    layoutMode,
    onLayoutModeChange,
    open,
    onOpenChange,
}: {
    layoutMode: TaskLayoutMode;
    onLayoutModeChange?: (mode: TaskLayoutMode) => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const closeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearCloseTimeout = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
    };

    const openPopover = () => {
        clearCloseTimeout();
        onOpenChange(true);
    };

    const scheduleClose = () => {
        clearCloseTimeout();
        closeTimeoutRef.current = setTimeout(() => {
            onOpenChange(false);
        }, 150);
    };

    // Clean up any pending timeout on unmount
    React.useEffect(() => clearCloseTimeout, []);

    const options: { mode: TaskLayoutMode; label: string; preview: React.ReactNode }[] = [
        {
            mode: 'modal',
            label: 'Modal',
            preview: (
                <div className="h-8 w-12 rounded border border-zinc-200 bg-white shadow-sm flex items-center justify-center p-1">
                    <div className="w-8 h-6 bg-zinc-100 rounded-sm" />
                </div>
            ),
        },
        {
            mode: 'fullscreen',
            label: 'Full screen',
            preview: (
                <div className="h-8 w-12 rounded border border-zinc-200 bg-white shadow-sm flex items-center justify-center p-0.5">
                    <div className="w-full h-full bg-zinc-100 rounded-sm" />
                </div>
            ),
        },
        {
            mode: 'sidebar',
            label: 'Sidebar',
            preview: (
                <div className="h-8 w-12 rounded border border-zinc-200 bg-white shadow-sm flex items-center justify-end p-0.5">
                    <div className="w-4 h-full bg-zinc-100 rounded-sm" />
                </div>
            ),
        },
    ];

    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 p-2 text-zinc-500 hover:text-zinc-700"
                    type="button"
                    onMouseEnter={openPopover}
                    onMouseLeave={scheduleClose}
                    onClick={() => {
                        const order: TaskLayoutMode[] = ['modal', 'fullscreen', 'sidebar'];
                        const i = order.indexOf(layoutMode);
                        const next = order[(i + 1) % order.length];
                        onLayoutModeChange?.(next);
                    }}
                >
                    {layoutMode === 'fullscreen' ? (
                        <Maximize2 className="h-5 w-5" />
                    ) : layoutMode === 'sidebar' ? (
                        <SidebarClose className="h-5 w-5" />
                    ) : (
                        <LayoutTemplate className="h-5 w-5" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-[300px] p-2"
                sideOffset={5}
                onOpenAutoFocus={(e) => e.preventDefault()}
                onMouseEnter={openPopover}
                onMouseLeave={scheduleClose}
            >
                <div className="grid grid-cols-3 gap-2">
                    {options.map(({ mode, label, preview }) => (
                        <button
                            key={mode}
                            type="button"
                            className={cn(
                                "flex flex-col items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-zinc-100 transition-colors border-2 text-left w-full",
                                layoutMode === mode ? "border-purple-500 bg-purple-50" : "border-transparent"
                            )}
                            onClick={() => {
                                onLayoutModeChange?.(mode);
                                onOpenChange(false);
                            }}
                        >
                            {preview}
                            <span className="text-xs font-medium text-zinc-700">{label}</span>
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}

export function TaskDetailContent({
    taskId,
    onClose,
    layoutMode = 'modal',
    onLayoutModeChange,
    isAskAIOpen: isAskAIOpenProp,
    onAskAIOpenChange
}: TaskDetailContentProps & {
    isAskAIOpen?: boolean;
    onAskAIOpenChange?: (open: boolean) => void;
}) {
    // Get current user from session
    const { data: session } = trpc.user.me.useQuery();
    const currentUserId = session?.id || '';

    // State management
    const [internalIsAskAIOpen, setInternalIsAskAIOpen] = React.useState(false);
    const [permissionsModalOpen, setPermissionsModalOpen] = React.useState(false);
    const [publishModalOpen, setPublishModalOpen] = React.useState(false);

    // Use prop if available, otherwise internal state
    const isAskAIOpen = isAskAIOpenProp !== undefined ? isAskAIOpenProp : internalIsAskAIOpen;
    const setIsAskAIOpen = (open: boolean) => {
        if (onAskAIOpenChange) {
            onAskAIOpenChange(open);
        } else {
            setInternalIsAskAIOpen(open);
        }
    };

    const [description, setDescription] = React.useState('');
    const [optimisticDescription, setOptimisticDescription] = React.useState<string | null>(null);
    const [isAddingSubtask, setIsAddingSubtask] = React.useState(false);
    const [subtaskTitle, setSubtaskTitle] = React.useState('');
    const [commentText, setCommentText] = React.useState('');
    const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const handleEmojiClick = React.useCallback((emojiData: EmojiClickData) => {
        if (!textareaRef.current) return;
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const newContent = commentText.slice(0, start) + emojiData.emoji + commentText.slice(end);
        setCommentText(newContent);
        setShowEmojiPicker(false);

        requestAnimationFrame(() => {
            if (textareaRef.current) {
                const newPosition = start + emojiData.emoji.length;
                textareaRef.current.selectionStart = newPosition;
                textareaRef.current.selectionEnd = newPosition;
                textareaRef.current.focus();
            }
        });
    }, [commentText]);
    const [layoutDropdownOpen, setLayoutDropdownOpen] = React.useState(false);
    const [timeTrackingModalOpen, setTimeTrackingModalOpen] = React.useState(false);
    const [subtasksSidebarOpen, setSubtasksSidebarOpen] = React.useState(false);
    const [leftTab, setLeftTab] = React.useState<'details' | 'subtasks' | 'action-items'>('details');
    const [rightSidebarPanel, setRightSidebarPanel] = React.useState<'task' | 'activity' | 'links' | 'related' | null>('activity');
    const [lastRightSidebarPanel, setLastRightSidebarPanel] = React.useState<'task' | 'activity' | 'links' | 'related'>('activity');
    const toggleRightSidebar = () => {
        if (rightSidebarPanel !== null) {
            setLastRightSidebarPanel(rightSidebarPanel);
            setRightSidebarPanel(null);
        } else {
            setRightSidebarPanel(lastRightSidebarPanel);
        }
    };
    const [customRelationshipTypes, setCustomRelationshipTypes] = React.useState<import('./CreateCustomRelationshipModal').CustomRelationshipType[]>([]);
    const [activityFilterOpen, setActivityFilterOpen] = React.useState(false);
    const [activityFilterTypes, setActivityFilterTypes] = React.useState<Set<string>>(() => new Set(ACTIVITY_FILTER_OPTIONS.map((o) => o.id)));

    // Title Editing State
    const [isEditingTitle, setIsEditingTitle] = React.useState(false);
    const [title, setTitle] = React.useState('');
    const descriptionEditorRef = React.useRef<DescriptionEditorRef>(null);

    const [isCoverPickerOpen, setIsCoverPickerOpen] = React.useState(false);
    const [isUploadingCover, setIsUploadingCover] = React.useState(false);
    const [coverPositionY, setCoverPositionY] = React.useState(50);
    const [isRepositioning, setIsRepositioning] = React.useState(false);
    const dragStartY = React.useRef(0);
    const startPositionY = React.useRef(50);
    const oldCoverPositionY = React.useRef(50);

    const handleCoverUploadFile = async (file: File) => {
        if (!task) return;
        setIsUploadingCover(true);
        try {
            const pathPrefix = "covers";
            const path = storageUtils.generateUniquePath(file.name, pathPrefix);
            const result = await storageUtils.upload({
                file,
                bucket: "media",
                path,
                upsert: true,
            });
            if (result.success && result.url) {
                updateTask.mutate({ id: task.id, coverImage: result.url } as any);
                toast.success("Cover updated");
            } else {
                toast.error("Failed to upload cover");
            }
        } catch (error) {
            toast.error("Error uploading cover");
        } finally {
            setIsUploadingCover(false);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isRepositioning) return;
        dragStartY.current = e.clientY;
        startPositionY.current = coverPositionY;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaY = e.clientY - dragStartY.current;
            const newPositionY = Math.max(0, Math.min(100, startPositionY.current - (deltaY * 0.2)));
            setCoverPositionY(newPositionY);
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };
    // Only autosave when the user has actually typed — prevents saving empty on modal open
    const hasUserEditedRef = React.useRef(false);

    // Debounced description for autosave
    const debouncedDescription = useDebounce(description, 1000);

    // Fetch task details
    const { data: task, isLoading } = trpc.task.get.useQuery(
        { id: taskId || '' },
        { enabled: !!taskId }
    );

    // Fetch available task types
    const { data: availableTaskTypes } = trpc.task.listTaskTypes.useQuery(
        { workspaceId: task?.workspaceId || undefined },
        { enabled: !!task?.workspaceId }
    );

    // Fetch workspace details for members (needed for AssigneeSelector)
    const { data: workspaceData } = trpc.workspace.get.useQuery(
        { id: task?.workspaceId || '' },
        { enabled: !!task?.workspaceId }
    );

    const { data: agentsData } = trpc.agent.list.useQuery({
        includeRelations: true,
    }, { enabled: !!task?.workspaceId });

    const agents = React.useMemo(() => {
        if (!agentsData?.items) return [];
        return agentsData.items.map(a => ({
            id: a.id,
            name: a.name,
            image: a.avatar || null,
            type: 'agent'
        }));
    }, [agentsData]);

    const workspaceMembers = React.useMemo(() => {
        if (!workspaceData?.members) return [];
        return workspaceData.members.map((m) => ({
            id: m.user.id,
            name: m.user.name || m.user.email,
            image: m.user.image,
            email: m.user.email,
            type: 'user'
        }));
    }, [workspaceData]);

    const utils = trpc.useUtils();

    // Time entries for this task (for total in Track Time row)
    const { data: timeEntries = [] } = trpc.task.timeEntries.list.useQuery(
        { taskId: task?.id ?? '' },
        { enabled: !!task?.id }
    );
    const totalTrackedSeconds = React.useMemo(
        () => timeEntries.reduce((sum, e) => sum + e.duration, 0),
        [timeEntries]
    );
    const formatTrackedTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h}h`;
        return m > 0 ? `${m}m` : '0m';
    };

    // Mutations
    const updateTask = trpc.task.update.useMutation({
        onMutate: async (variables) => {
            await utils.task.get.cancel({ id: taskId || '' });
            const previousTask = utils.task.get.getData({ id: taskId || '' });

            utils.task.get.setData({ id: taskId || '' }, (old: any) => {
                if (!old) return old;

                const updateTaskInTree = (t: any): any => {
                    if (t.id === variables.id) {
                        return { ...t, ...variables };
                    }
                    if (t.other_tasks) {
                        return {
                            ...t,
                            other_tasks: t.other_tasks.map((st: any) => updateTaskInTree(st))
                        };
                    }
                    return t;
                };

                return updateTaskInTree(old);
            });

            return { previousTask };
        },
        onError: (err, variables, context: any) => {
            if (context?.previousTask) {
                utils.task.get.setData({ id: taskId || '' }, context.previousTask);
            }
        },
        onSettled: () => {
            utils.task.get.invalidate({ id: taskId || '' });
        }
    });
    const createTask = trpc.task.create.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId || '' });
            setSubtaskTitle('');
            setIsAddingSubtask(false);
        }
    });

    const createComment = trpc.task.comment.create.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId || '' });
            setCommentText('');
        }
    });

    React.useEffect(() => {
        if (task) {
            // Reset user-edit flag whenever task data changes externally
            hasUserEditedRef.current = false;
            // Use optimistic description if available, otherwise use task description
            const content = optimisticDescription ?? (task.description || '');
            setDescription(content);
            setTitle(task.title || '');
        }
    }, [task?.id, optimisticDescription]);

    const handleSaveTitle = () => {
        if (!task || !title.trim()) return;
        updateTask.mutate({ id: task.id, title });
        setIsEditingTitle(false);
    };

    // Called by DescriptionEditor when the user actually types
    const handleDescriptionChange = React.useCallback((content: string) => {
        hasUserEditedRef.current = true;
        setDescription(content);
    }, []);

    // Autosave: only fires when the user has actually edited
    React.useEffect(() => {
        if (!task || !hasUserEditedRef.current || description !== debouncedDescription) return;

        const currentDescription = task.description || '';
        if (debouncedDescription === currentDescription) return;

        setOptimisticDescription(debouncedDescription);

        updateTask.mutate({ id: task.id, description: debouncedDescription });
    }, [debouncedDescription]);

    // In sidebar layout there's a single pane whose content is picked via the
    // narrow icon strip (Task / Activity / Blocking / ...). Default to the
    // Task pane when switching into sidebar mode, and fall back to Activity
    // when leaving it (since the Task pane only exists in sidebar mode).
    const prevLayoutModeRef = React.useRef(layoutMode);
    React.useEffect(() => {
        const prevLayoutMode = prevLayoutModeRef.current;
        if (layoutMode === 'sidebar' && prevLayoutMode !== 'sidebar') {
            setRightSidebarPanel('task');
        } else if (layoutMode !== 'sidebar' && prevLayoutMode === 'sidebar' && rightSidebarPanel === 'task') {
            setRightSidebarPanel('activity');
        }
        prevLayoutModeRef.current = layoutMode;
    }, [layoutMode]);

    const handleCreateSubtask = () => {
        if (!task || !subtaskTitle.trim()) return;
        createTask.mutate({
            title: subtaskTitle,
            parentId: task.id,
            workspaceId: task.workspaceId,
            listId: task.listId || undefined,
            statusId: task.statusId || undefined,
        });
    };

    const handleToggleStar = () => {
        if (!task) return;
        updateTask.mutate({ id: task.id, isStarred: !task.isStarred });
    };

    const allActivity = React.useMemo(() => {
        if (!task) return [];
        const comments = (task.comments || []).map((c) => ({ ...c, type: 'comment' }));
        const activities = (task.activities || []).map((a) => ({ ...a, type: 'activity' }));
        return [...comments, ...activities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [task]);

    const filteredActivity = React.useMemo(() => {
        if (activityFilterTypes.size === 0) return [];
        return allActivity.filter((item) => activityFilterTypes.has(getActivityFilterType(item)));
    }, [allActivity, activityFilterTypes]);

    const subtasks = task?.other_tasks || [];

    if (isLoading || !taskId) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-blue-600 border-t-transparent" />
                    <p className="text-xs text-zinc-500 font-medium">Loading task...</p>
                </div>
            </div>
        );
    }

    if (!task) return null;

    // Determine if AI panel should be shown internally (for fullscreen/sidebar)
    // For 'modal' mode, the parent wrapper handles the AI panel separately
    const showInternalAiPanel = isAskAIOpen && layoutMode !== 'modal';

    // Sidebar layout uses a single pane (no resizable split): the pane content
    // is picked via the narrow icon strip, which gains a "Task" entry that
    // shows the task detail content (title/properties/description/etc.)
    // that otherwise lives in the left 65% panel in modal/fullscreen mode.
    const isSidebarLayout = layoutMode === 'sidebar';

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Enhanced Top Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 bg-white z-20">
                {/* Left Side */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Toggle Subtasks Sidebar */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 p-2 text-zinc-500 hover:text-zinc-700"
                                    onClick={() => setSubtasksSidebarOpen(!subtasksSidebarOpen)}
                                >
                                    {subtasksSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {subtasksSidebarOpen ? 'Hide subtasks' : 'Show subtasks'}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <div className="h-4 w-px bg-zinc-200" />

                    {/* Hierarchical Breadcrumb */}
                    <div className="flex items-center gap-1.5 text-xs text-zinc-600 min-w-0 flex-1">
                        {task.space && (
                            <>
                                <SpaceIcon icon={task.space.icon} size={16} />
                                <span className="hover:underline cursor-pointer truncate">
                                    {task.space.name}
                                </span>
                                <ChevronRight className="h-3 w-3 text-zinc-300 shrink-0" />
                            </>
                        )}
                        {task.list && (
                            <>
                                <List className="h-3.5 w-3.5 shrink-0" style={{ color: task.list.color || '#6b7280' }} />
                                <span className="hover:underline cursor-pointer font-medium text-zinc-700 truncate">
                                    {task.list.name}
                                </span>
                                <ChevronRight className="h-3 w-3 text-zinc-300 shrink-0" />
                            </>
                        )}

                        <TaskMoveAndAddPopover
                            task={task}
                            defaultTab="add"
                            tooltipText="Add to List"
                            trigger={
                                <Button size="icon" variant="ghost" className="w-8 h-8 p-2 gap-1.5 text-zinc-500 hover:text-zinc-900 ml-1.5 shadow-none">
                                    <Plus className="h-5 w-5" />
                                </Button>
                            }
                        />

                        <div className="h-4 w-px bg-zinc-200" />

                        {/* Move/Add To Popover */}
                        <TaskMoveAndAddPopover
                            task={task}
                            defaultTab="move"
                            tooltipText="Move task"
                            trigger={
                                <Button size="icon" variant="ghost" className="w-8 h-8 p-2 gap-1.5 text-zinc-500 hover:text-zinc-900 ml-1.5 shadow-none">
                                    <SquareArrowRight className="h-5 w-5" />
                                </Button>
                            }
                        />
                    </div>
                </div>

                {/* Right Side */}
                <div className="flex items-center gap-2.5">
                    {/* Created Date */}
                    {task.createdAt && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="text-xs text-zinc-500 px-2 hidden sm:block whitespace-nowrap cursor-default">
                                        {format(new Date(task.createdAt), 'MMM d')}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Created: {format(new Date(task.createdAt), 'MMM d, yyyy h:mm a')}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}

                    <div className="h-4 w-px bg-zinc-200" />

                    {/* Ask AI */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant={isAskAIOpen ? "primary" : "ghost"}
                                    className={cn(
                                        "h-8 w-8 p-2 gap-1.5",
                                        isAskAIOpen
                                            ? "bg-purple-600 hover:bg-purple-700 text-white"
                                            : "text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                                    )}
                                    // Use callback instead of direct set state if controlled
                                    onClick={() => setIsAskAIOpen(!isAskAIOpen)}
                                >
                                    <Bot className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ask AI about this task</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {/* Publish to Marketplace */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 p-2 text-zinc-500 hover:text-zinc-700"
                                    onClick={() => setPublishModalOpen(true)}
                                >
                                    <Store className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Publish to Marketplace</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {/* Share */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 p-2 text-zinc-500 hover:text-zinc-700"
                                    onClick={() => setPermissionsModalOpen(true)}
                                >
                                    <Share2 className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Share</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {/* Settings */}
                    <TaskActionsDropdown
                        task={task}
                        context="GENERAL"
                        workspaceId={task.workspaceId}
                        users={[]}
                        lists={[]}
                        availableStatuses={[]}
                        onDelete={() => { }}
                        onUpdate={async (id, data) => {
                            updateTask.mutate({ id, ...data });
                        }}
                        tooltip="Settings"
                        trigger={
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-zinc-500 hover:text-zinc-700 p-2"
                            >
                                <Settings className="h-5 w-5" />
                            </Button>
                        }
                    />

                    {/* Star/Favorite */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className={cn(
                                        "h-8 w-8 p-2",
                                        task.isStarred
                                            ? "text-amber-500 hover:text-amber-600"
                                            : "text-zinc-500 hover:text-zinc-700"
                                    )}
                                    onClick={handleToggleStar}
                                >
                                    <Star className={cn("h-5 w-5", task.isStarred && "fill-current")} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {task.isStarred ? 'Remove from favorites' : 'Add to favorites'}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {/* Change Layout: hover to open picker, click cycles modal → fullscreen → sidebar → modal */}
                    <LayoutModePopover
                        layoutMode={layoutMode}
                        onLayoutModeChange={onLayoutModeChange}
                        open={layoutDropdownOpen}
                        onOpenChange={setLayoutDropdownOpen}
                    />

                    <div className="h-4 w-px bg-zinc-200" />

                    {/* Close */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-zinc-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={onClose}
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Close</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            {/* Main Content Area with Resizable Layout */}
            <div className="flex-1 overflow-hidden relative">
                <ResizableSplitLayout
                    MainContent={
                        <div className="flex h-full overflow-hidden bg-white">
                            {/* Subtasks Sidebar (toggle) */}
                            {subtasksSidebarOpen && (
                                <div className="w-64 border-r border-zinc-200 bg-zinc-50 flex flex-col shrink-0">
                                    <div className="p-3 border-b border-zinc-200 bg-white">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                                                Subtasks
                                            </span>
                                            <Badge variant="secondary" className="text-[10px] h-5">
                                                {subtasks.length}
                                            </Badge>
                                        </div>
                                    </div>
                                    <ScrollArea className="flex-1">
                                        <div className="p-2 space-y-1">
                                            {subtasks.map((subtask: any) => (
                                                <div
                                                    key={subtask.id}
                                                    className="p-2 rounded-md hover:bg-white cursor-pointer group transition-colors"
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <div className={cn(
                                                            "h-4 w-4 rounded-full border-2 cursor-pointer transition-colors mt-0.5 shrink-0",
                                                            subtask.status?.name === 'Done'
                                                                ? "bg-emerald-500 border-emerald-500"
                                                                : "border-zinc-300 hover:border-blue-500"
                                                        )} />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs text-zinc-700 font-medium truncate">
                                                                {subtask.title}
                                                            </div>
                                                            {subtask.dueDate && (
                                                                <div className="text-[10px] text-zinc-400 mt-0.5">
                                                                    {format(new Date(subtask.dueDate), 'MMM d')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {subtasks.length === 0 && (
                                                <div className="text-center py-8 text-xs text-zinc-400">
                                                    No subtasks yet
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                    <div className="p-2 border-t border-zinc-200 bg-white">
                                        <button
                                            type="button"
                                            onClick={() => { setLeftTab('subtasks'); setIsAddingSubtask(true); }}
                                            className="w-full flex items-center gap-2 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Add Subtask
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isSidebarLayout ? (
                                <div className="flex h-full min-h-0 flex-1 min-w-0 bg-white">
                                    {/* Sidebar layout: single pane; content is picked via the icon strip below (Task / Activity / Blocking / ...) */}
                                    {rightSidebarPanel && (
                                        <div className="flex-1 min-w-0 flex flex-col min-h-0 bg-white overflow-hidden">
                                            {rightSidebarPanel === 'task' && (
                                                <div className="flex flex-col h-full min-w-0 overflow-hidden">
                                                    {/* Tab content */}
                                                    <div className="flex-1 overflow-y-auto min-h-0">
                                                        {leftTab === 'details' && (
                                                            <div className="w-full">
                                                                {/* Cover Image */}
                                                                {(task as any)?.coverImage && (
                                                                    <div
                                                                        className="group relative w-full h-52 md:h-64 lg:h-72 overflow-hidden flex-shrink-0"
                                                                        style={{ backgroundColor: (task as any).coverImage.startsWith('#') ? (task as any).coverImage : '#f4f4f5' }}
                                                                        onMouseDown={handleMouseDown}
                                                                    >
                                                                        {!(task as any).coverImage.startsWith('#') && (
                                                                            <div
                                                                                className={cn(
                                                                                    "w-full h-full",
                                                                                    isRepositioning ? "cursor-ns-resize" : "object-cover"
                                                                                )}
                                                                                style={{
                                                                                    backgroundImage: `url(${(task as any).coverImage})`,
                                                                                    backgroundSize: 'cover',
                                                                                    backgroundPosition: `50% ${coverPositionY}%`,
                                                                                    backgroundRepeat: 'no-repeat',
                                                                                }}
                                                                            />
                                                                        )}
                                                                        {!isRepositioning && (
                                                                            <div className="absolute bottom-4 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-50">
                                                                                {!(task as any).coverImage.startsWith('#') && (
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="secondary"
                                                                                        className="h-7 px-3 bg-white/90 shadow-sm border border-zinc-200 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            oldCoverPositionY.current = coverPositionY;
                                                                                            setIsRepositioning(true);
                                                                                        }}
                                                                                    >
                                                                                        Reposition
                                                                                    </Button>
                                                                                )}
                                                                                <CoverPickerPopover
                                                                                    open={isCoverPickerOpen}
                                                                                    onOpenChange={setIsCoverPickerOpen}
                                                                                    onColorSelect={(color) => updateTask.mutate({ id: task.id, coverImage: color } as any)}
                                                                                    onUpload={handleCoverUploadFile}
                                                                                    isUploading={isUploadingCover}
                                                                                    onLinkSave={(link) => updateTask.mutate({ id: task.id, coverImage: link } as any)}
                                                                                    onRemove={() => updateTask.mutate({ id: task.id, coverImage: null } as any)}
                                                                                >
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="secondary"
                                                                                        className="h-7 px-3 bg-white/90 shadow-sm border border-zinc-200 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                    >
                                                                                        Change cover
                                                                                    </Button>
                                                                                </CoverPickerPopover>
                                                                            </div>
                                                                        )}
                                                                        {isRepositioning && (
                                                                            <div className="absolute top-4 right-6 flex gap-2 z-50">
                                                                                <Button
                                                                                    size="sm"
                                                                                    className="h-7 px-3 bg-black/50 hover:bg-black/70 text-white border-0 text-xs font-medium backdrop-blur-sm"
                                                                                    onClick={() => {
                                                                                        setIsRepositioning(false);
                                                                                    }}
                                                                                >
                                                                                    Save position
                                                                                </Button>
                                                                                <Button
                                                                                    size="sm"
                                                                                    className="h-7 px-3 bg-black/50 hover:bg-black/70 text-white border-0 text-xs font-medium backdrop-blur-sm"
                                                                                    onClick={() => {
                                                                                        setCoverPositionY(oldCoverPositionY.current);
                                                                                        setIsRepositioning(false);
                                                                                    }}
                                                                                >
                                                                                    Cancel
                                                                                </Button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                <div className={cn("px-8 space-y-8 max-w-4xl mx-auto w-full", (task as any)?.coverImage ? "pt-4 pb-6" : "py-6")}>
                                                                    {/* Header: Task Type, ID, Add Cover */}
                                                                    <div className="flex items-center justify-between group/header h-8 mb-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <DropdownMenu>
                                                                                <DropdownMenuTrigger asChild>
                                                                                    <Button variant="outline" size="sm" className="h-8 px-2.5 gap-2 text-[13px] font-medium text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg transition-all">
                                                                                        <TaskTypeIcon type={task.taskType} className="h-4 w-4 text-zinc-500" />
                                                                                        {task.taskType?.name || "Task"}
                                                                                        <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                                                                                    </Button>
                                                                                </DropdownMenuTrigger>
                                                                                <DropdownMenuContent align="start">
                                                                                    {availableTaskTypes?.map((type) => (
                                                                                        <DropdownMenuItem
                                                                                            key={type.id}
                                                                                            onClick={() => updateTask.mutate({ id: task.id, taskTypeId: type.id })}
                                                                                        >
                                                                                            <div className="flex items-center gap-2">
                                                                                                <TaskTypeIcon type={type} className="h-3.5 w-3.5" />
                                                                                                <span>{type.name}</span>
                                                                                            </div>
                                                                                        </DropdownMenuItem>
                                                                                    ))}
                                                                                </DropdownMenuContent>
                                                                            </DropdownMenu>
                                                                            <TooltipProvider>
                                                                                <Tooltip>
                                                                                    <TooltipTrigger asChild>
                                                                                        <Button variant="outline" size="icon" className="h-8 w-8 text-zinc-500 border-zinc-200 hover:text-zinc-700 hover:bg-zinc-50 rounded-lg transition-colors" onClick={() => {
                                                                                            navigator.clipboard.writeText(task.id);
                                                                                            toast.success("Task ID copied");
                                                                                        }}>
                                                                                            <div className="relative flex items-center justify-center h-4 w-4">
                                                                                                <Scan className="h-full w-full absolute inset-0" strokeWidth={2} />
                                                                                                <span className="text-[7px] font-bold leading-none select-none tracking-tighter">ID</span>
                                                                                            </div>
                                                                                        </Button>
                                                                                    </TooltipTrigger>
                                                                                    <TooltipContent>Copy ID</TooltipContent>
                                                                                </Tooltip>
                                                                            </TooltipProvider>
                                                                        </div>

                                                                        <div className="opacity-0 group-hover/header:opacity-100 transition-opacity">
                                                                            {!(task as any)?.coverImage && (
                                                                                <CoverPickerPopover
                                                                                    open={isCoverPickerOpen}
                                                                                    onOpenChange={setIsCoverPickerOpen}
                                                                                    onColorSelect={(color) => updateTask.mutate({ id: task.id, coverImage: color } as any)}
                                                                                    onUpload={handleCoverUploadFile}
                                                                                    isUploading={isUploadingCover}
                                                                                    onLinkSave={(link) => updateTask.mutate({ id: task.id, coverImage: link } as any)}
                                                                                    onRemove={() => updateTask.mutate({ id: task.id, coverImage: null } as any)}
                                                                                >
                                                                                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100">
                                                                                        <ImageIcon className="h-3.5 w-3.5" />
                                                                                        Add Cover
                                                                                    </Button>
                                                                                </CoverPickerPopover>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Title */}
                                                                    {/* Editable Title */}
                                                                    {isEditingTitle ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <Input
                                                                                value={title}
                                                                                onChange={(e) => setTitle(e.target.value)}
                                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                                onPointerDown={(e) => e.stopPropagation()}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter') handleSaveTitle();
                                                                                    if (e.key === 'Escape') {
                                                                                        setTitle(task.title || '');
                                                                                        setIsEditingTitle(false);
                                                                                    }
                                                                                }}
                                                                                onBlur={handleSaveTitle}
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <h1
                                                                            className="text-3xl font-bold text-zinc-900 cursor-text hover:bg-zinc-50 rounded px-2 -mx-2 transition-colors border border-transparent hover:border-zinc-200"
                                                                            onClick={() => setIsEditingTitle(true)}
                                                                        >
                                                                            {task.title || "Untitled Task"}
                                                                        </h1>
                                                                    )}


                                                                    {/* Properties Grid — order: Status → Assignee → Priority → Start → Due → Time Est → Tags → Track Time → Relationships */}
                                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-8">
                                                                        {/* Status */}
                                                                        <div className="space-y-1.5">
                                                                            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                                                                <CheckSquare className="h-3 w-3" /> Status
                                                                            </label>
                                                                            {(task.list?.statuses?.length ?? 0) > 0 ? (
                                                                                <DropdownMenu>
                                                                                    <DropdownMenuTrigger asChild>
                                                                                        <div className="flex items-center gap-2 group cursor-pointer hover:bg-zinc-50 p-1 -ml-1 rounded transition-colors">
                                                                                            <div
                                                                                                className="h-2.5 w-2.5 rounded-full ring-2 ring-white shadow-sm"
                                                                                                style={{ backgroundColor: task.status?.color || '#ccc' }}
                                                                                            />
                                                                                            <span className="text-sm font-medium text-zinc-700">{task.status?.name || "To Do"}</span>
                                                                                        </div>
                                                                                    </DropdownMenuTrigger>
                                                                                    <DropdownMenuContent align="start">
                                                                                        {(task.list?.statuses ?? []).map((s: any) => (
                                                                                            <DropdownMenuItem
                                                                                                key={s.id}
                                                                                                onClick={() => updateTask.mutate({ id: task.id, statusId: s.id })}
                                                                                            >
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <div
                                                                                                        className="h-2 w-2 rounded-full shrink-0"
                                                                                                        style={{ backgroundColor: s.color || '#94A3B8' }}
                                                                                                    />
                                                                                                    <span>{s.name}</span>
                                                                                                </div>
                                                                                            </DropdownMenuItem>
                                                                                        ))}
                                                                                    </DropdownMenuContent>
                                                                                </DropdownMenu>
                                                                            ) : (
                                                                                <div className="flex items-center gap-2 p-1">
                                                                                    <div
                                                                                        className="h-2.5 w-2.5 rounded-full ring-2 ring-white shadow-sm"
                                                                                        style={{ backgroundColor: task.status?.color || '#ccc' }}
                                                                                    />
                                                                                    <span className="text-sm font-medium text-zinc-700">{task.status?.name || "To Do"}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Assignees */}
                                                                        <div className="space-y-1.5">
                                                                            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                                                                <UserIcon className="h-3 w-3" /> Assignees
                                                                            </label>
                                                                            <div className="flex items-start">
                                                                                <AssigneeSelector
                                                                                    users={workspaceMembers}
                                                                                    agents={agents}
                                                                                    workspaceId={task.workspaceId}
                                                                                    value={formatAssigneeIdsForSelector(task.assignees)}
                                                                                    onChange={(newIds) => {
                                                                                        const cleanIds = newIds;
                                                                                        updateTask.mutate({
                                                                                            id: task.id,
                                                                                            assigneeIds: cleanIds
                                                                                        });
                                                                                    }}
                                                                                    variant="compact"
                                                                                    trigger={
                                                                                        <div className="flex flex-wrap gap-1 min-h-[28px] w-fit items-center cursor-pointer hover:bg-zinc-50 p-1 -ml-1 rounded transition-colors group outline-none border border-transparent hover:border-zinc-200">
                                                                                            {task.assignees?.length > 0 ? (
                                                                                                <>
                                                                                                    <div className="flex -space-x-2 mr-2">
                                                                                                        {task.assignees.map((a: any, i: number) => (
                                                                                                            <Avatar key={i} className="h-7 w-7 border-2 border-white ring-1 ring-zinc-100">
                                                                                                                <AvatarImage src={a.user?.image} />
                                                                                                                <AvatarFallback className="text-[9px] font-bold bg-blue-50 text-blue-600">
                                                                                                                    {a.user?.name?.substring(0, 2).toUpperCase()}
                                                                                                                </AvatarFallback>
                                                                                                            </Avatar>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                    <div className="h-7 w-7 rounded-full border border-dashed border-zinc-300 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:border-zinc-400 bg-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                                        <Plus className="h-3 w-3" />
                                                                                                    </div>
                                                                                                </>
                                                                                            ) : (
                                                                                                <>
                                                                                                    <span className="text-sm font-normal text-zinc-400 italic">Empty</span>
                                                                                                    <div className="text-zinc-400 opacity-0 group-hover:opacity-100 ml-1 flex items-center">
                                                                                                        <UserIcon className="h-3 w-3" />
                                                                                                    </div>
                                                                                                </>
                                                                                            )}
                                                                                        </div>
                                                                                    }
                                                                                />
                                                                            </div>
                                                                        </div>

                                                                        {/* Priority */}
                                                                        <div className="space-y-1.5">
                                                                            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                                                                <Flag className="h-3 w-3" /> Priority
                                                                            </label>
                                                                            <DropdownMenu>
                                                                                <DropdownMenuTrigger asChild>
                                                                                    <div className="flex flex-wrap gap-1 min-h-[28px] w-fit items-center cursor-pointer hover:bg-zinc-50 p-1 -ml-1 rounded transition-colors group outline-none border border-transparent hover:border-zinc-200">
                                                                                        {task.priority !== 'NORMAL' ? (
                                                                                            <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                                                                                                <Flag className={cn("h-3.5 w-3.5",
                                                                                                    task.priority === 'URGENT' ? "fill-red-500 text-red-600" :
                                                                                                        task.priority === 'HIGH' ? "fill-orange-500 text-orange-600" : "text-blue-500"
                                                                                                )} />
                                                                                                <span>{task.priority || "Normal"}</span>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <>
                                                                                                <span className="text-sm font-normal text-zinc-400 italic">Empty</span>
                                                                                                <div className="text-zinc-400 opacity-0 group-hover:opacity-100 ml-1 flex items-center">
                                                                                                    <Flag className="h-3 w-3" />
                                                                                                </div>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                </DropdownMenuTrigger>
                                                                                <DropdownMenuContent align="start">
                                                                                    {[
                                                                                        { value: 'URGENT', label: 'Urgent', color: 'fill-red-500 text-red-600' },
                                                                                        { value: 'HIGH', label: 'High', color: 'fill-orange-500 text-orange-600' },
                                                                                        { value: 'NORMAL', label: 'Normal', color: 'text-blue-500' },
                                                                                        { value: 'LOW', label: 'Low', color: 'text-zinc-500' },
                                                                                    ].map((priority) => (
                                                                                        <DropdownMenuItem
                                                                                            key={priority.value}
                                                                                            onClick={() => updateTask.mutate({ id: task.id, priority: priority.value as "URGENT" | "HIGH" | "NORMAL" | "LOW" })}
                                                                                        >
                                                                                            <div className="flex items-center gap-2">
                                                                                                <Flag className={cn("h-3.5 w-3.5", priority.color)} />
                                                                                                <span>{priority.label}</span>
                                                                                            </div>
                                                                                        </DropdownMenuItem>
                                                                                    ))}
                                                                                </DropdownMenuContent>
                                                                            </DropdownMenu>
                                                                        </div>


                                                                        {/* Start Date */}
                                                                        <div className="space-y-1.5">
                                                                            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                                                                <CalendarIcon className="h-3 w-3" /> Start Date
                                                                            </label>
                                                                            <Popover>
                                                                                <PopoverTrigger asChild>
                                                                                    <div className="flex flex-wrap gap-1 min-h-[28px] w-fit items-center cursor-pointer hover:bg-zinc-50 p-1 -ml-1 rounded transition-colors group outline-none border border-transparent hover:border-zinc-200">
                                                                                        {task.startDate ? (
                                                                                            <span className="text-sm font-medium text-zinc-700">{format(new Date(task.startDate), 'MMM d, yyyy')}</span>
                                                                                        ) : (
                                                                                            <>
                                                                                                <span className="text-sm font-normal text-zinc-400 italic">Empty</span>
                                                                                                <div className="text-zinc-400 opacity-0 group-hover:opacity-100 ml-1 flex items-center">
                                                                                                    <CalendarIcon className="h-3 w-3" />
                                                                                                </div>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                </PopoverTrigger>
                                                                                <PopoverContent className="w-auto p-0" align="start">
                                                                                    <TaskCalendar
                                                                                        startDate={task.startDate ? new Date(task.startDate) : undefined}
                                                                                        endDate={task.dueDate ? new Date(task.dueDate) : undefined}
                                                                                        onStartDateChange={(date) => {
                                                                                            updateTask.mutate({ id: task.id, startDate: date ? date.toISOString() : null });
                                                                                        }}
                                                                                        onEndDateChange={(date) => {
                                                                                            updateTask.mutate({ id: task.id, dueDate: date ? date.toISOString() : null });
                                                                                        }}
                                                                                    />
                                                                                </PopoverContent>
                                                                            </Popover>
                                                                        </div>

                                                                        {/* Due Date */}
                                                                        <div className="space-y-1.5">
                                                                            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                                                                <CalendarIcon className="h-3 w-3" /> Due Date
                                                                            </label>
                                                                            <Popover>
                                                                                <PopoverTrigger asChild>
                                                                                    <div className="flex flex-wrap gap-1 min-h-[28px] w-fit items-center cursor-pointer hover:bg-zinc-50 p-1 -ml-1 rounded transition-colors group outline-none border border-transparent hover:border-zinc-200">
                                                                                        {task.dueDate ? (
                                                                                            <span className="text-sm font-medium text-zinc-700">{format(new Date(task.dueDate), 'MMM d, yyyy')}</span>
                                                                                        ) : (
                                                                                            <>
                                                                                                <span className="text-sm font-normal text-zinc-400 italic">Empty</span>
                                                                                                <div className="text-zinc-400 opacity-0 group-hover:opacity-100 ml-1 flex items-center">
                                                                                                    <CalendarIcon className="h-3 w-3" />
                                                                                                </div>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                </PopoverTrigger>
                                                                                <PopoverContent className="w-auto p-0" align="start">
                                                                                    <TaskCalendar
                                                                                        startDate={task.startDate ? new Date(task.startDate) : undefined}
                                                                                        endDate={task.dueDate ? new Date(task.dueDate) : undefined}
                                                                                        onStartDateChange={(date) => {
                                                                                            updateTask.mutate({ id: task.id, startDate: date ? date.toISOString() : null });
                                                                                        }}
                                                                                        onEndDateChange={(date) => {
                                                                                            updateTask.mutate({ id: task.id, dueDate: date ? date.toISOString() : null });
                                                                                        }}
                                                                                    />
                                                                                </PopoverContent>
                                                                            </Popover>
                                                                        </div>

                                                                        {/* Time Estimate */}
                                                                        <div className="space-y-1.5">
                                                                            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                                                                <Hourglass className="h-3 w-3" /> Time Estimate
                                                                            </label>
                                                                            <Popover>
                                                                                <PopoverTrigger asChild>
                                                                                    <div className="flex flex-wrap gap-1 min-h-[28px] w-fit items-center cursor-pointer hover:bg-zinc-50 p-1 -ml-1 rounded transition-colors group outline-none border border-transparent hover:border-zinc-200">
                                                                                        {task.timeEstimate != null && task.timeEstimate > 0
                                                                                            ? (
                                                                                                <span className="text-sm font-medium text-zinc-700">
                                                                                                    {(() => {
                                                                                                        const m = task.timeEstimate;
                                                                                                        const h = Math.floor(m / 60);
                                                                                                        const min = m % 60;
                                                                                                        if (h > 0 && min > 0) return `${h}h ${min}m`;
                                                                                                        if (h > 0) return `${h}h`;
                                                                                                        return `${min}m`;
                                                                                                    })()}
                                                                                                </span>
                                                                                            )
                                                                                            : (
                                                                                                <>
                                                                                                    <span className="text-sm font-normal text-zinc-400 italic">Empty</span>
                                                                                                    <div className="text-zinc-400 opacity-0 group-hover:opacity-100 ml-1 flex items-center">
                                                                                                        <Hourglass className="h-3 w-3" />
                                                                                                    </div>
                                                                                                </>
                                                                                            )}
                                                                                    </div>
                                                                                </PopoverTrigger>
                                                                                <PopoverContent className="w-72 p-0 rounded-lg border border-zinc-200 bg-zinc-50 shadow-lg" align="start">
                                                                                    <div className="p-3 space-y-3">
                                                                                        <div className="flex items-center gap-1.5">
                                                                                            <span className="text-sm font-semibold text-zinc-900">Time Estimate</span>
                                                                                            <TooltipProvider>
                                                                                                <Tooltip>
                                                                                                    <TooltipTrigger asChild>
                                                                                                        <HelpCircle className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                                                                                    </TooltipTrigger>
                                                                                                    <TooltipContent side="top" className="max-w-[200px]">
                                                                                                        Enter time in hours and minutes (e.g. 3h 20m) or minutes only (e.g. 45m).
                                                                                                    </TooltipContent>
                                                                                                </Tooltip>
                                                                                            </TooltipProvider>
                                                                                        </div>
                                                                                        <TimeEstimateInput
                                                                                            taskId={task.id}
                                                                                            currentMinutes={task.timeEstimate ?? undefined}
                                                                                            onSave={() => utils.task.get.invalidate({ id: task.id })}
                                                                                            updateTask={updateTask.mutate}
                                                                                        />
                                                                                        <p className="text-[11px] text-zinc-500">Changes are automatically saved.</p>
                                                                                    </div>
                                                                                </PopoverContent>
                                                                            </Popover>
                                                                        </div>

                                                                        {/* Tags — editable */}
                                                                        <div className="space-y-1.5 col-span-2">
                                                                            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                                                                <TagIcon className="h-3 w-3" /> Tags
                                                                            </label>
                                                                            <Popover>
                                                                                <PopoverTrigger asChild>
                                                                                    <div className="flex flex-wrap gap-1 min-h-[28px] w-fit items-center cursor-pointer hover:bg-zinc-50 p-1 -ml-1 rounded transition-colors group outline-none border border-transparent hover:border-zinc-200">
                                                                                        {task.tags && task.tags.length > 0 ? (
                                                                                            task.tags.map((tag: string) => (
                                                                                                <Badge key={tag} variant="secondary" className="bg-zinc-100 text-zinc-600 border-zinc-200 text-[10px] h-5 px-1.5">
                                                                                                    {tag}
                                                                                                </Badge>
                                                                                            ))
                                                                                        ) : (
                                                                                            <>
                                                                                                <span className="text-sm font-normal text-zinc-400 italic">Empty</span>
                                                                                                <div className="text-zinc-400 opacity-0 group-hover:opacity-100 ml-1 flex items-center">
                                                                                                    <TagIcon className="h-3 w-3" />
                                                                                                </div>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                </PopoverTrigger>
                                                                                <PopoverContent className="w-80 p-3" align="start">
                                                                                    <TagsEditor
                                                                                        tags={Array.isArray(task.tags) ? [...task.tags] : []}
                                                                                        onSave={(newTags) => updateTask.mutate({ id: task.id, tags: newTags })}
                                                                                    />
                                                                                </PopoverContent>
                                                                            </Popover>
                                                                        </div>

                                                                        {/* Track Time — opens modal (ClickUp-style) */}
                                                                        <div className="space-y-1.5">
                                                                            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                                                                <Clock className="h-3 w-3" /> Track Time
                                                                            </label>
                                                                            <div
                                                                                onClick={() => setTimeTrackingModalOpen(true)}
                                                                                className="flex flex-wrap gap-1 min-h-[28px] w-fit items-center cursor-pointer hover:bg-zinc-50 p-1 -ml-1 rounded transition-colors group outline-none border border-transparent hover:border-zinc-200"
                                                                            >
                                                                                {totalTrackedSeconds > 0 ? (
                                                                                    <div className="flex items-center gap-2 w-full text-left text-sm font-medium text-zinc-700">
                                                                                        <div className="h-5 w-5 rounded-full bg-zinc-300 group-hover:bg-zinc-400 flex items-center justify-center shrink-0">
                                                                                            <Clock className="h-3 w-3 text-zinc-600" />
                                                                                        </div>
                                                                                        <span className="tabular-nums">
                                                                                            {formatTrackedTime(totalTrackedSeconds)}
                                                                                        </span>
                                                                                    </div>
                                                                                ) : (
                                                                                    <>
                                                                                        <span className="text-sm font-normal text-zinc-400 italic">Empty</span>
                                                                                        <div className="text-zinc-400 opacity-0 group-hover:opacity-100 ml-1 flex items-center">
                                                                                            <Clock className="h-3 w-3" />
                                                                                        </div>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* Relationships — badges open corresponding right panel */}
                                                                        <div className="space-y-1.5">
                                                                            <div className="flex flex-wrap gap-1.5 min-h-[28px] items-center">
                                                                                {((task as any).blockedDependencies?.length ?? 0) > 0 && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => setRightSidebarPanel('blocking')}
                                                                                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
                                                                                    >
                                                                                        <MinusCircle className="h-3.5 w-3.5" />
                                                                                        {(task as any).blockedDependencies?.length ?? 0} Blocking
                                                                                    </button>
                                                                                )}
                                                                                {((task as any).dependencies?.length ?? 0) > 0 && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => setRightSidebarPanel('related')}
                                                                                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 hover:bg-zinc-200 transition-colors cursor-pointer"
                                                                                    >
                                                                                        <ArrowLeftRight className="h-3.5 w-3.5" />
                                                                                        {(task as any).dependencies?.length ?? 0} Related
                                                                                    </button>
                                                                                )}
                                                                                {(() => {
                                                                                    const docCount = (task.attachments ?? []).filter((a: any) => a.mimeType === 'doc_link').length;
                                                                                    return docCount > 0 ? (
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => setRightSidebarPanel('docLinks')}
                                                                                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 hover:bg-zinc-200 transition-colors cursor-pointer"
                                                                                        >
                                                                                            <FileText className="h-3.5 w-3.5" />
                                                                                            {docCount} Doc{docCount !== 1 ? 's' : ''}
                                                                                        </button>
                                                                                    ) : null;
                                                                                })()}
                                                                                {(() => {
                                                                                    const linkCount = (task.attachments ?? []).filter((a: any) => a.mimeType === 'link').length;
                                                                                    return linkCount > 0 ? (
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => setRightSidebarPanel('taskLinks')}
                                                                                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 hover:bg-zinc-200 transition-colors cursor-pointer"
                                                                                        >
                                                                                            <Paperclip className="h-3.5 w-3.5" />
                                                                                            {linkCount} Link{linkCount !== 1 ? 's' : ''}
                                                                                        </button>
                                                                                    ) : null;
                                                                                })()}
                                                                                {customRelationshipTypes.length > 0 && customRelationshipTypes.map((ct) => (
                                                                                    <button
                                                                                        key={ct.id}
                                                                                        type="button"
                                                                                        onClick={() => setRightSidebarPanel('related')}
                                                                                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 hover:bg-zinc-200 transition-colors cursor-pointer"
                                                                                    >
                                                                                        <ArrowLeftRight className="h-3.5 w-3.5" />
                                                                                        {ct.name}
                                                                                    </button>
                                                                                ))}
                                                                                {(() => {
                                                                                    const blockedCount = (task as any).blockedDependencies?.length ?? 0;
                                                                                    const relatedCount = (task as any).dependencies?.length ?? 0;
                                                                                    const docCount = (task.attachments ?? []).filter((a: any) => a.mimeType === 'doc_link').length;
                                                                                    const linkCount = (task.attachments ?? []).filter((a: any) => a.mimeType === 'link').length;

                                                                                    const totalRelationships = blockedCount + relatedCount + docCount + linkCount + customRelationshipTypes.length;

                                                                                    if (totalRelationships === 0) {
                                                                                        return (
                                                                                            <div
                                                                                                onClick={() => setRightSidebarPanel('related')}
                                                                                                className="flex flex-wrap gap-1 min-h-[28px] w-fit items-center cursor-pointer hover:bg-zinc-50 p-1 -ml-1 rounded transition-colors group outline-none border border-transparent hover:border-zinc-200"
                                                                                            >
                                                                                                <span className="text-sm font-normal text-zinc-400 italic">Empty</span>
                                                                                                <div className="text-zinc-400 opacity-0 group-hover:opacity-100 ml-1 flex items-center">
                                                                                                    <ArrowLeftRight className="h-3 w-3" />
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    }
                                                                                    return null;
                                                                                })()}
                                                                            </div>
                                                                        </div>

                                                                    </div>

                                                                    {/* Description */}
                                                                    <div className="space-y-3">
                                                                        <DescriptionSection
                                                                            task={task}
                                                                            description={description}
                                                                            onDescriptionChange={handleDescriptionChange}
                                                                            onOpenAskAI={() => setIsAskAIOpen(true)}
                                                                            currentUserId={currentUserId}
                                                                            session={session}
                                                                            descriptionEditorRef={descriptionEditorRef}
                                                                        />

                                                                        {/* Custom Fields (Details tab) */}
                                                                        <CustomFieldsSection
                                                                            taskId={task.id}
                                                                            workspaceId={task.workspaceId}
                                                                        />

                                                                        {/* Subtasks */}
                                                                        <SubtasksTable
                                                                            task={task}
                                                                            subtasks={subtasks}
                                                                            workspaceMembers={workspaceMembers}
                                                                            isAddingSubtask={isAddingSubtask}
                                                                            setIsAddingSubtask={setIsAddingSubtask}
                                                                            subtaskTitle={subtaskTitle}
                                                                            setSubtaskTitle={setSubtaskTitle}
                                                                            handleCreateSubtask={handleCreateSubtask}
                                                                            updateTask={updateTask.mutate}
                                                                            utils={utils}
                                                                            workspaceId={task.workspaceId}
                                                                        />

                                                                        {/* Relationships */}
                                                                        <TaskRelationshipsSection
                                                                            taskId={task.id}
                                                                            workspaceId={task.workspaceId}
                                                                        />

                                                                        {/* Checklists */}
                                                                        <ChecklistsSection
                                                                            taskId={task.id}
                                                                            workspaceMembers={workspaceMembers}
                                                                        />

                                                                        {/* Attachments (Details tab) */}
                                                                        <AttachmentsSection taskId={task.id} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {rightSidebarPanel === 'activity' && (
                                                <>
                                                    <div className="p-3 border-b border-zinc-100 flex items-center justify-between bg-white shrink-0">
                                                        <span className="text-base font-semibold text-zinc-900">Activity</span>
                                                        <div className="flex items-center gap-0.5">
                                                            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Search">
                                                                <Search className="h-4 w-4" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 relative" aria-label="Notifications">
                                                                <Bell className="h-4 w-4" />
                                                                {filteredActivity.length > 0 && (
                                                                    <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-purple-500 px-1 text-[10px] font-medium text-white">
                                                                        {filteredActivity.length > 99 ? '99+' : filteredActivity.length}
                                                                    </span>
                                                                )}
                                                            </Button>
                                                            <Popover open={activityFilterOpen} onOpenChange={setActivityFilterOpen}>
                                                                <PopoverTrigger asChild>
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Filter activities">
                                                                        <SlidersHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-72 p-0" align="end">
                                                                    <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
                                                                        <span className="text-sm font-semibold text-zinc-900">Activities</span>
                                                                        <button
                                                                            type="button"
                                                                            className="text-xs text-zinc-500 hover:text-zinc-700 cursor-pointer"
                                                                            onClick={() => setActivityFilterTypes(new Set())}
                                                                        >
                                                                            Unselect All
                                                                        </button>
                                                                    </div>
                                                                    <ScrollArea className="max-h-[280px]">
                                                                        <div className="p-2 space-y-0.5">
                                                                            {ACTIVITY_FILTER_OPTIONS.map((opt) => {
                                                                                const Icon = opt.icon;
                                                                                const checked = activityFilterTypes.has(opt.id);
                                                                                return (
                                                                                    <label
                                                                                        key={opt.id}
                                                                                        className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-zinc-50 cursor-pointer"
                                                                                    >
                                                                                        <Checkbox
                                                                                            checked={checked}
                                                                                            onCheckedChange={(c) => {
                                                                                                setActivityFilterTypes((prev) => {
                                                                                                    const next = new Set(prev);
                                                                                                    if (c) next.add(opt.id); else next.delete(opt.id);
                                                                                                    return next;
                                                                                                });
                                                                                            }}
                                                                                        />
                                                                                        <Icon className="h-4 w-4 text-zinc-500 shrink-0" />
                                                                                        <span className="text-sm text-zinc-900 truncate">{opt.label}</span>
                                                                                    </label>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </ScrollArea>
                                                                </PopoverContent>
                                                            </Popover>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-h-0"><ScrollArea className="h-full">
                                                        <div className="p-4">
                                                            {/* Show more */}
                                                            {activityFilterTypes.size === 0 && (
                                                                <p className="text-sm text-zinc-500 py-4">Select activity types in the filter to view activities.</p>
                                                            )}
                                                            {activityFilterTypes.size > 0 && filteredActivity.length > 3 && (
                                                                <button type="button" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 mb-3 cursor-pointer">
                                                                    <ChevronRight className="h-3.5 w-3.5" /> Show more
                                                                </button>
                                                            )}
                                                            <div className="space-y-4">
                                                                {filteredActivity.map((item: any, i: number) => {
                                                                    const isAgent = !!(item.agentId ?? item.agentName ?? item.sourceType === 'AGENT');
                                                                    const displayName = isAgent ? (item.agentName || 'Automation Agent') : (item.user?.name ?? 'Someone');
                                                                    return (
                                                                        <div key={item.id || i} className="flex gap-3 text-sm">
                                                                            {item.type === 'comment' ? (
                                                                                isAgent ? (
                                                                                    <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center mt-0.5 shrink-0">
                                                                                        <Bot className="h-3.5 w-3.5 text-purple-600" />
                                                                                    </div>
                                                                                ) : (
                                                                                    <Avatar className="h-6 w-6 mt-0.5 shrink-0">
                                                                                        <AvatarImage src={item.user?.image} />
                                                                                        <AvatarFallback className="text-[9px]">{item.user?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                                                    </Avatar>
                                                                                )
                                                                            ) : (
                                                                                isAgent ? (
                                                                                    <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center mt-0.5 shrink-0">
                                                                                        <Bot className="h-3.5 w-3.5 text-purple-600" />
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="h-6 w-6 rounded-full bg-zinc-100 flex items-center justify-center mt-0.5 shrink-0">
                                                                                        <LayoutList className="h-3 w-3" />
                                                                                    </div>
                                                                                )
                                                                            )}
                                                                            <div className="space-y-1 min-w-0 flex-1">
                                                                                <div className="text-zinc-600">
                                                                                    {item.type === 'comment' ? (
                                                                                        <>
                                                                                            <span className="font-medium text-zinc-900">{displayName}</span>
                                                                                            <p className="text-zinc-800 mt-0.5 break-words">{item.content}</p>
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <span className="font-medium">{displayName}</span>
                                                                                            {' '}{item.action === 'CREATED' ? 'created the task' : item.action === 'ASSIGNED' ? 'assigned' : item.action === 'UNASSIGNED' ? 'unassigned' : item.action === 'STATUS_CHANGED' ? 'updated status' : item.action === 'PRIORITY_CHANGED' ? 'updated priority' : item.action === 'DUE_DATE_CHANGED' ? 'updated due date' : item.action === 'ATTACHED' ? 'added an attachment' : item.action === 'COMMENTED' ? 'commented' : item.action === 'MOVED' ? 'moved' : 'updated'}{' '}{item.field ? (item.field === 'title' ? 'name' : item.field === 'statusId' ? 'status' : item.field === 'listId' ? 'list' : item.field) : 'the task'}
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                                <div className="text-[10px] text-zinc-400">
                                                                                    {format(new Date(item.createdAt), 'MMM d, h:mm a')}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </ScrollArea>
                                                    </div>
                                                    <div className="p-4 border-t border-zinc-100 bg-white shrink-0">

                                                        {/* New comment / activity input (image 1 style) */}
                                                        <div className="flex items-end gap-3 mt-1">
                                                            <div className="flex-1 relative bg-zinc-100/50 backdrop-blur-sm rounded-[28px] border border-zinc-200/60 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all duration-300 overflow-x-hidden shadow-inner min-h-[56px] flex flex-col justify-center">
                                                                <Textarea
                                                                    ref={textareaRef}
                                                                    value={commentText}
                                                                    onChange={(e) => setCommentText(e.target.value)}
                                                                    placeholder="Write a comment... @mention for AI"
                                                                    className="min-h-[56px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pr-20 py-[16px] px-6 text-[14px] font-normal placeholder:text-zinc-400 leading-relaxed"
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                                            e.preventDefault();
                                                                            if (commentText.trim()) {
                                                                                createComment.mutate({ taskId: task.id, content: commentText });
                                                                                setCommentText('');
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                                <div className="absolute bottom-[6px] right-2 flex items-center gap-1">
                                                                    <span className="text-[10px] text-zinc-400 font-medium mr-2 hidden sm:inline-block pointer-events-none">
                                                                        Press Enter to send
                                                                    </span>
                                                                    <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                                                                        <PopoverTrigger asChild>
                                                                            <button
                                                                                type="button"
                                                                                className="p-2.5 rounded-full hover:bg-zinc-200/80 text-zinc-400 hover:text-zinc-700 transition-all duration-200 hover:scale-105 cursor-pointer"
                                                                                title="Add emoji"
                                                                            >
                                                                                <Smile className="h-5 w-5" />
                                                                            </button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-auto p-0 border-0 shadow-2xl rounded-2xl overflow-hidden" align="end" sideOffset={12}>
                                                                            <EmojiPicker
                                                                                onEmojiClick={handleEmojiClick}
                                                                                theme={Theme.LIGHT}
                                                                                searchPlaceHolder="Search emoji..."
                                                                                width={340}
                                                                                height={420}
                                                                                previewConfig={{ showPreview: false }}
                                                                            />
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                </div>
                                                            </div>
                                                        </div>

                                                    </div>
                                                </>
                                            )}

                                            {rightSidebarPanel === 'related' && (
                                                <div className="p-4 flex flex-col h-full min-h-0 overflow-auto">
                                                    <RelatedPanelContent
                                                        taskId={task.id}
                                                        workspaceId={task.workspaceId}
                                                        task={task}
                                                        customTypes={customRelationshipTypes}
                                                    />
                                                </div>
                                            )}
                                            {rightSidebarPanel === 'links' && (
                                                <div className="flex flex-col h-full min-h-0">
                                                    <LinksPanelContent taskId={task.id} />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Narrow sidebar at right edge */}
                                    <div className="w-14 flex flex-col items-center py-2 border-l border-zinc-100 bg-zinc-50/50 shrink-0 px-2">
                                        {/* Collapse / Expand toggle */}
                                        <TooltipProvider delayDuration={300}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        type="button"
                                                        onClick={toggleRightSidebar}
                                                        className="flex flex-col items-center gap-0.5 py-2 px-1 w-full my-0.5 rounded-md transition-colors cursor-pointer text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                                                    >
                                                        {rightSidebarPanel ? (
                                                            <ChevronsRight className="h-5 w-5 shrink-0" />
                                                        ) : (
                                                            <ChevronsLeft className="h-5 w-5 shrink-0" />
                                                        )}
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="left">
                                                    <p>{rightSidebarPanel ? 'Collapse panel' : 'Expand panel'}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>

                                        {[
                                            { id: 'task' as const, icon: LayoutList, label: 'Task', count: undefined },
                                            { id: 'activity' as const, icon: MessageSquare, label: 'Activity', count: undefined },
                                            { id: 'related' as const, icon: ArrowLeftRight, label: 'Related', count: customRelationshipTypes.length > 0 ? ((task as any).dependencies ?? []).filter((d: any) => d.type === 'FINISH_TO_FINISH').length : 0 },
                                            { id: 'links' as const, icon: Paperclip, label: 'Links', count: (task.attachments ?? []).filter((a: any) => a.mimeType === 'link').length },
                                        ].map(({ id, icon: Icon, label, count }) => (
                                            <TooltipProvider key={id} delayDuration={300}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const next = rightSidebarPanel === id ? null : id;
                                                                setRightSidebarPanel(next);
                                                                if (next !== null) setLastRightSidebarPanel(next);
                                                            }}
                                                            className={cn(
                                                                "flex items-center justify-center py-2.5 px-1 w-full my-0.5 rounded-md transition-colors relative cursor-pointer",
                                                                rightSidebarPanel === id ? "bg-zinc-200 text-zinc-900" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                                                            )}
                                                        >
                                                            <Icon className="h-5 w-5 shrink-0" />
                                                            {count != null && count > 0 && (
                                                                <span className="absolute top-0 right-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                                                                    {count > 99 ? '99+' : count}
                                                                </span>
                                                            )}
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="left">
                                                        <p>{label}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex h-full min-w-0 flex-1 bg-white relative">
                                    <Group id="task-detail-left-right" orientation="horizontal" className="flex-1 min-w-0">
                                        <Panel defaultSize={65} minSize={35}>
                                            <div className="flex flex-col h-full min-w-0 overflow-hidden">


                                                {/* Tab content */}
                                                <div className="flex-1 overflow-y-auto min-h-0">
                                                    {leftTab === 'details' && (
                                                        <div className="w-full">
                                                            {/* Cover Image */}
                                                            {(task as any)?.coverImage && (
                                                                <div
                                                                    className="group relative w-full h-52 md:h-64 lg:h-72 overflow-hidden flex-shrink-0"
                                                                    style={{ backgroundColor: (task as any).coverImage.startsWith('#') ? (task as any).coverImage : '#f4f4f5' }}
                                                                    onMouseDown={handleMouseDown}
                                                                >
                                                                    {!(task as any).coverImage.startsWith('#') && (
                                                                        <div
                                                                            className={cn(
                                                                                "w-full h-full",
                                                                                isRepositioning ? "cursor-ns-resize" : "object-cover"
                                                                            )}
                                                                            style={{
                                                                                backgroundImage: `url(${(task as any).coverImage})`,
                                                                                backgroundSize: 'cover',
                                                                                backgroundPosition: `50% ${coverPositionY}%`,
                                                                                backgroundRepeat: 'no-repeat',
                                                                            }}
                                                                        />
                                                                    )}
                                                                    {!isRepositioning && (
                                                                        <div className="absolute bottom-4 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-50">
                                                                            {!(task as any).coverImage.startsWith('#') && (
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="secondary"
                                                                                    className="h-7 px-3 bg-white/90 shadow-sm border border-zinc-200 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        oldCoverPositionY.current = coverPositionY;
                                                                                        setIsRepositioning(true);
                                                                                    }}
                                                                                >
                                                                                    Reposition
                                                                                </Button>
                                                                            )}
                                                                            <CoverPickerPopover
                                                                                open={isCoverPickerOpen}
                                                                                onOpenChange={setIsCoverPickerOpen}
                                                                                onColorSelect={(color) => updateTask.mutate({ id: task.id, coverImage: color } as any)}
                                                                                onUpload={handleCoverUploadFile}
                                                                                isUploading={isUploadingCover}
                                                                                onLinkSave={(link) => updateTask.mutate({ id: task.id, coverImage: link } as any)}
                                                                                onRemove={() => updateTask.mutate({ id: task.id, coverImage: null } as any)}
                                                                            >
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="secondary"
                                                                                    className="h-7 px-3 bg-white/90 shadow-sm border border-zinc-200 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    Change cover
                                                                                </Button>
                                                                            </CoverPickerPopover>
                                                                        </div>
                                                                    )}
                                                                    {isRepositioning && (
                                                                        <div className="absolute top-4 right-6 flex gap-2 z-50">
                                                                            <Button
                                                                                size="sm"
                                                                                className="h-7 px-3 bg-black/50 hover:bg-black/70 text-white border-0 text-xs font-medium backdrop-blur-sm"
                                                                                onClick={() => {
                                                                                    setIsRepositioning(false);
                                                                                }}
                                                                            >
                                                                                Save position
                                                                            </Button>
                                                                            <Button
                                                                                size="sm"
                                                                                className="h-7 px-3 bg-black/50 hover:bg-black/70 text-white border-0 text-xs font-medium backdrop-blur-sm"
                                                                                onClick={() => {
                                                                                    setCoverPositionY(oldCoverPositionY.current);
                                                                                    setIsRepositioning(false);
                                                                                }}
                                                                            >
                                                                                Cancel
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div className={cn("px-8 space-y-8 max-w-4xl mx-auto w-full", (task as any)?.coverImage ? "pt-4 pb-6" : "py-6")}>
                                                                {/* Header: Task Type, ID, Add Cover */}
                                                                <div className="flex items-center justify-between group/header h-8 mb-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button variant="outline" size="sm" className="h-8 px-2.5 gap-2 text-[13px] font-medium text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg transition-all">
                                                                                    <TaskTypeIcon type={task.taskType} className="h-4 w-4 text-zinc-500" />
                                                                                    {task.taskType?.name || "Task"}
                                                                                    <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="start">
                                                                                {availableTaskTypes?.map((type) => (
                                                                                    <DropdownMenuItem
                                                                                        key={type.id}
                                                                                        onClick={() => updateTask.mutate({ id: task.id, taskTypeId: type.id })}
                                                                                    >
                                                                                        <div className="flex items-center gap-2">
                                                                                            <TaskTypeIcon type={type} className="h-3.5 w-3.5" />
                                                                                            <span>{type.name}</span>
                                                                                        </div>
                                                                                    </DropdownMenuItem>
                                                                                ))}
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                        <TooltipProvider>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Button variant="outline" size="icon" className="h-8 w-8 text-zinc-500 border-zinc-200 hover:text-zinc-700 hover:bg-zinc-50 rounded-lg transition-colors" onClick={() => {
                                                                                        navigator.clipboard.writeText(task.id);
                                                                                        toast.success("Task ID copied");
                                                                                    }}>
                                                                                        <div className="relative flex items-center justify-center h-4 w-4">
                                                                                            <Scan className="h-full w-full absolute inset-0" strokeWidth={2} />
                                                                                            <span className="text-[7px] font-bold leading-none select-none tracking-tighter">ID</span>
                                                                                        </div>
                                                                                    </Button>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>Copy ID</TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>
                                                                    </div>

                                                                    <div className="opacity-0 group-hover/header:opacity-100 transition-opacity">
                                                                        {!(task as any)?.coverImage && (
                                                                            <CoverPickerPopover
                                                                                open={isCoverPickerOpen}
                                                                                onOpenChange={setIsCoverPickerOpen}
                                                                                onColorSelect={(color) => updateTask.mutate({ id: task.id, coverImage: color } as any)}
                                                                                onUpload={handleCoverUploadFile}
                                                                                isUploading={isUploadingCover}
                                                                                onLinkSave={(link) => updateTask.mutate({ id: task.id, coverImage: link } as any)}
                                                                                onRemove={() => updateTask.mutate({ id: task.id, coverImage: null } as any)}
                                                                            >
                                                                                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100">
                                                                                    <ImageIcon className="h-3.5 w-3.5" />
                                                                                    Add Cover
                                                                                </Button>
                                                                            </CoverPickerPopover>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Title */}
                                                                {/* Editable Title */}
                                                                {isEditingTitle ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <Input
                                                                            value={title}
                                                                            onChange={(e) => setTitle(e.target.value)}
                                                                            onMouseDown={(e) => e.stopPropagation()}
                                                                            onPointerDown={(e) => e.stopPropagation()}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') handleSaveTitle();
                                                                                if (e.key === 'Escape') {
                                                                                    setTitle(task.title || '');
                                                                                    setIsEditingTitle(false);
                                                                                }
                                                                            }}
                                                                            onBlur={handleSaveTitle}
                                                                            className="h-9"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <h1
                                                                        className="text-3xl font-bold text-zinc-900 cursor-text hover:bg-zinc-50 rounded-lg px-2 -mx-2 transition-colors border-transparent"
                                                                        onClick={() => setIsEditingTitle(true)}
                                                                    >
                                                                        {task.title || "Untitled Task"}
                                                                    </h1>
                                                                )}


                                                                {/* Properties Grid — order: Status → Assignee → Priority → Start → Due → Time Est → Tags → Track Time → Relationships */}
                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-8">
                                                                    {/* Status */}
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                                                            <CheckSquare className="h-3 w-3" /> Status
                                                                        </label>
                                                                        {(task.list?.statuses?.length ?? 0) > 0 ? (
                                                                            <DropdownMenu>
                                                                                <DropdownMenuTrigger asChild>
                                                                                    <div className="flex flex-wrap gap-1 min-h-[28px] w-fit items-center cursor-pointer hover:bg-zinc-50 p-1 -ml-1 rounded transition-colors group outline-none border border-transparent hover:border-zinc-200">
                                                                                        <div
                                                                                            className="h-2.5 w-2.5 rounded-full ring-2 ring-white shadow-sm"
                                                                                            style={{ backgroundColor: task.status?.color || '#ccc' }}
                                                                                        />
                                                                                        <span className="text-sm font-medium text-zinc-700">{task.status?.name || "To Do"}</span>
                                                                                    </div>
                                                                                </DropdownMenuTrigger>
                                                                                <DropdownMenuContent align="start">
                                                                                    {(task.list?.statuses ?? []).map((s: any) => (
                                                                                        <DropdownMenuItem
                                                                                            key={s.id}
                                                                                            onClick={() => updateTask.mutate({ id: task.id, statusId: s.id })}
                                                                                        >
                                                                                            <div className="flex items-center gap-2">
                                                                                                <div
                                                                                                    className="h-2 w-2 rounded-full shrink-0"
                                                                                                    style={{ backgroundColor: s.color || '#94A3B8' }}
                                                                                                />
                                                                                                <span>{s.name}</span>
                                                                                            </div>
                                                                                        </DropdownMenuItem>
                                                                                    ))}
                                                                                </DropdownMenuContent>
                                                                            </DropdownMenu>
                                                                        ) : (
                                                                            <div className="flex items-center gap-2 p-1">
                                                                                <div
                                                                                    className="h-2.5 w-2.5 rounded-full ring-2 ring-white shadow-sm"
                                                                                    style={{ backgroundColor: task.status?.color || '#ccc' }}
                                                                                />
                                                                                <span className="text-sm font-medium text-zinc-700">{task.status?.name || "To Do"}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Assignees */}
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                                                            <UserIcon className="h-3 w-3" /> Assignees
                                                                        </label>
                                                                        <div className="flex items-start">
                                                                            <AssigneeSelector
                                                                                users={workspaceMembers}
                                                                                agents={agents}
                                                                                workspaceId={task.workspaceId}
                                                                                value={formatAssigneeIdsForSelector(task.assignees)}
                                                                                onChange={(newIds) => {
                                                                                    const cleanIds = newIds;
                                                                                    updateTask.mutate({
                                                                                        id: task.id,
                                                                                        assigneeIds: cleanIds
                                                                                    });
                                                                                }}
                                                                                variant="compact"
                                                                                trigger={
                                                                                    <div className="flex flex-wrap gap-1 min-h-[28px] w-fit items-center cursor-pointer hover:bg-zinc-50 p-1 -ml-1 rounded transition-colors group outline-none border border-transparent hover:border-zinc-200">
                                                                                        {task.assignees?.length > 0 ? (
                                                                                            <>
                                                                                                <div className="flex -space-x-2 mr-2">
                                                                                                    {task.assignees.map((a: any, i: number) => (
                                                                                                        <Avatar key={i} className="h-7 w-7 border-2 border-white ring-1 ring-zinc-100">
                                                                                                            <AvatarImage src={a.user?.image} />
                                                                                                            <AvatarFallback className="text-[9px] font-bold bg-blue-50 text-blue-600">
                                                                                                                {a.user?.name?.substring(0, 2).toUpperCase()}
                                                                                                            </AvatarFallback>
                                                                                                        </Avatar>
                                                                                                    ))}
                                                                                                </div>
                                                                                                <div className="h-7 w-7 rounded-full border border-dashed border-zinc-300 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:border-zinc-400 bg-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                                    <Plus className="h-3 w-3" />
                                                                                                </div>
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                <span className="text-sm font-normal text-zinc-400 italic">Empty</span>
                                                                                                <div className="text-zinc-400 opacity-0 group-hover:opacity-100 ml-1 flex items-center">
                                                                                                    <UserIcon className="h-3 w-3" />
                                                                                                </div>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                }
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* Priority */}
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                                                            <Flag className="h-3 w-3" /> Priority
                                                                        </label>
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <div className="flex flex-wrap gap-1 min-h-[28px] w-fit items-center cursor-pointer hover:bg-zinc-50 p-1 -ml-1 rounded transition-colors group outline-none border border-transparent hover:border-zinc-200">
                                                                                    {task.priority !== 'NORMAL' ? (
                                                                                        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                                                                                            <Flag className={cn("h-3.5 w-3.5",
                                                                                                task.priority === 'URGENT' ? "fill-red-500 text-red-600" :
                                                                                                    task.priority === 'HIGH' ? "fill-orange-500 text-orange-600" : "text-blue-500"
                                                                                            )} />
                                                                                            <span>{task.priority || "Normal"}</span>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <>
                                                                                            <span className="text-sm font-normal text-zinc-400 italic">Empty</span>
                                                                                            <div className="text-zinc-400 opacity-0 group-hover:opacity-100 ml-1 flex items-center">
                                                                                                <Flag className="h-3 w-3" />
                                                                                            </div>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="start">
                                                                                {[
                                                                                    { value: 'URGENT', label: 'Urgent', color: 'fill-red-500 text-red-600' },
                                                                                    { value: 'HIGH', label: 'High', color: 'fill-orange-500 text-orange-600' },
                                                                                    { value: 'NORMAL', label: 'Normal', color: 'text-blue-500' },
                                                                                    { value: 'LOW', label: 'Low', color: 'text-zinc-500' },
                                                                                ].map((priority) => (
                                                                                    <DropdownMenuItem
                                                                                        key={priority.value}
                                                                                        onClick={() => updateTask.mutate({ id: task.id, priority: priority.value as "URGENT" | "HIGH" | "NORMAL" | "LOW" })}
                                                                                    >
                                                                                        <div className="flex items-center gap-2">
                                                                                            <Flag className={cn("h-3.5 w-3.5", priority.color)} />
                                                                                            <span>{priority.label}</span>
                                                                                        </div>
                                                                                    </DropdownMenuItem>
                                                                                ))}
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </div>


                                                                    {/* Start Date */}
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                                                            <CalendarIcon className="h-3 w-3" /> Start Date
                                                                        </label>
                                                                        <Popover>
                                                                            <PopoverTrigger asChild>
                                                                                <div className="flex flex-wrap gap-1 min-h-[28px] w-fit items-center cursor-pointer hover:bg-zinc-50 p-1 -ml-1 rounded transition-colors group outline-none border border-transparent hover:border-zinc-200">
                                                                                    {task.startDate ? (
                                                                                        <span className="text-sm font-medium text-zinc-700">{format(new Date(task.startDate), 'MMM d, yyyy')}</span>
                                                                                    ) : (
                                                                                        <>
                                                                                            <span className="text-sm font-normal text-zinc-400 italic">Empty</span>
                                                                                            <div className="text-zinc-400 opacity-0 group-hover:opacity-100 ml-1 flex items-center">
                                                                                                <CalendarIcon className="h-3 w-3" />
                                                                                            </div>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </PopoverTrigger>
                                                                            <PopoverContent className="w-auto p-0" align="start">
                                                                                <TaskCalendar
                                                                                    startDate={task.startDate ? new Date(task.startDate) : undefined}
                                                                                    endDate={task.dueDate ? new Date(task.dueDate) : undefined}
                                                                                    onStartDateChange={(date) => {
                                                                                        updateTask.mutate({ id: task.id, startDate: date ? date.toISOString() : null });
                                                                                    }}
                                                                                    onEndDateChange={(date) => {
                                                                                        updateTask.mutate({ id: task.id, dueDate: date ? date.toISOString() : null });
                                                                                    }}
                                                                                />
                                                                            </PopoverContent>
                                                                        </Popover>
                                                                    </div>

                                                                    {/* Due Date */}
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                                                            <CalendarIcon className="h-3 w-3" /> Due Date
                                                                        </label>
                                                                        <Popover>
                                                                            <PopoverTrigger asChild>
                                                                                <div className="flex flex-wrap gap-1 min-h-[28px] w-fit items-center cursor-pointer hover:bg-zinc-50 p-1 -ml-1 rounded transition-colors group outline-none border border-transparent hover:border-zinc-200">
                                                                                    {task.dueDate ? (
                                                                                        <span className="text-sm font-medium text-zinc-700">{format(new Date(task.dueDate), 'MMM d, yyyy')}</span>
                                                                                    ) : (
                                                                                        <>
                                                                                            <span className="text-sm font-normal text-zinc-400 italic">Empty</span>
                                                                                            <div className="text-zinc-400 opacity-0 group-hover:opacity-100 ml-1 flex items-center">
                                                                                                <CalendarIcon className="h-3 w-3" />
                                                                                            </div>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </PopoverTrigger>
                                                                            <PopoverContent className="w-auto p-0" align="start">
                                                                                <TaskCalendar
                                                                                    startDate={task.startDate ? new Date(task.startDate) : undefined}
                                                                                    endDate={task.dueDate ? new Date(task.dueDate) : undefined}
                                                                                    onStartDateChange={(date) => {
                                                                                        updateTask.mutate({ id: task.id, startDate: date ? date.toISOString() : null });
                                                                                    }}
                                                                                    onEndDateChange={(date) => {
                                                                                        updateTask.mutate({ id: task.id, dueDate: date ? date.toISOString() : null });
                                                                                    }}
                                                                                />
                                                                            </PopoverContent>
                                                                        </Popover>
                                                                    </div>

                                                                    {/* Time Estimate */}
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                                                            <Hourglass className="h-3 w-3" /> Time Estimate
                                                                        </label>
                                                                        <Popover>
                                                                            <PopoverTrigger asChild>
                                                                                <div className="flex flex-wrap gap-1 min-h-[28px] w-fit items-center cursor-pointer hover:bg-zinc-50 p-1 -ml-1 rounded transition-colors group outline-none border border-transparent hover:border-zinc-200">
                                                                                    {task.timeEstimate != null && task.timeEstimate > 0
                                                                                        ? (
                                                                                            <span className="text-sm font-medium text-zinc-700">
                                                                                                {(() => {
                                                                                                    const m = task.timeEstimate;
                                                                                                    const h = Math.floor(m / 60);
                                                                                                    const min = m % 60;
                                                                                                    if (h > 0 && min > 0) return `${h}h ${min}m`;
                                                                                                    if (h > 0) return `${h}h`;
                                                                                                    return `${min}m`;
                                                                                                })()}
                                                                                            </span>
                                                                                        )
                                                                                        : (
                                                                                            <>
                                                                                                <span className="text-sm font-normal text-zinc-400 italic">Empty</span>
                                                                                                <div className="text-zinc-400 opacity-0 group-hover:opacity-100 ml-1 flex items-center">
                                                                                                    <Hourglass className="h-3 w-3" />
                                                                                                </div>
                                                                                            </>
                                                                                        )}
                                                                                </div>
                                                                            </PopoverTrigger>
                                                                            <PopoverContent className="w-72 p-0 rounded-lg border border-zinc-200 bg-zinc-50 shadow-lg" align="start">
                                                                                <div className="p-3 space-y-3">
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <span className="text-sm font-semibold text-zinc-900">Time Estimate</span>
                                                                                        <TooltipProvider>
                                                                                            <Tooltip>
                                                                                                <TooltipTrigger asChild>
                                                                                                    <HelpCircle className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                                                                                </TooltipTrigger>
                                                                                                <TooltipContent side="top" className="max-w-[200px]">
                                                                                                    Enter time in hours and minutes (e.g. 3h 20m) or minutes only (e.g. 45m).
                                                                                                </TooltipContent>
                                                                                            </Tooltip>
                                                                                        </TooltipProvider>
                                                                                    </div>
                                                                                    <TimeEstimateInput
                                                                                        taskId={task.id}
                                                                                        currentMinutes={task.timeEstimate ?? undefined}
                                                                                        onSave={() => utils.task.get.invalidate({ id: task.id })}
                                                                                        updateTask={updateTask.mutate}
                                                                                    />
                                                                                    <p className="text-[11px] text-zinc-500">Changes are automatically saved.</p>
                                                                                </div>
                                                                            </PopoverContent>
                                                                        </Popover>
                                                                    </div>

                                                                    {/* Tags — editable */}
                                                                    <div className="space-y-1.5 col-span-2">
                                                                        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                                                            <TagIcon className="h-3 w-3" /> Tags
                                                                        </label>
                                                                        <Popover>
                                                                            <PopoverTrigger asChild>
                                                                                <div className="flex flex-wrap gap-1 min-h-[28px] w-fit items-center cursor-pointer hover:bg-zinc-50 p-1 -ml-1 rounded transition-colors group outline-none border border-transparent hover:border-zinc-200">
                                                                                    {task.tags && task.tags.length > 0 ? (
                                                                                        task.tags.map((tag: string) => (
                                                                                            <Badge key={tag} variant="secondary" className="bg-zinc-100 text-zinc-600 border-zinc-200 text-[10px] h-5 px-1.5">
                                                                                                {tag}
                                                                                            </Badge>
                                                                                        ))
                                                                                    ) : (
                                                                                        <>
                                                                                            <span className="text-sm font-normal text-zinc-400 italic">Empty</span>
                                                                                            <div className="text-zinc-400 opacity-0 group-hover:opacity-100 ml-1 flex items-center">
                                                                                                <TagIcon className="h-3 w-3" />
                                                                                            </div>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </PopoverTrigger>
                                                                            <PopoverContent className="w-80 p-3" align="start">
                                                                                <TagsEditor
                                                                                    tags={Array.isArray(task.tags) ? [...task.tags] : []}
                                                                                    onSave={(newTags) => updateTask.mutate({ id: task.id, tags: newTags })}
                                                                                />
                                                                            </PopoverContent>
                                                                        </Popover>
                                                                    </div>

                                                                    {/* Track Time — opens modal (ClickUp-style) */}
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                                                            <Clock className="h-3 w-3" /> Track Time
                                                                        </label>
                                                                        <div
                                                                            onClick={() => setTimeTrackingModalOpen(true)}
                                                                            className="flex flex-wrap gap-1 min-h-[28px] w-fit items-center cursor-pointer hover:bg-zinc-50 p-1 -ml-1 rounded transition-colors group outline-none border border-transparent hover:border-zinc-200"
                                                                        >
                                                                            {totalTrackedSeconds > 0 ? (
                                                                                <div className="flex items-center gap-2 w-full text-left text-sm font-medium text-zinc-700">
                                                                                    <div className="h-5 w-5 rounded-full bg-zinc-300 group-hover:bg-zinc-400 flex items-center justify-center shrink-0">
                                                                                        <Clock className="h-3 w-3 text-zinc-600" />
                                                                                    </div>
                                                                                    <span className="tabular-nums">
                                                                                        {formatTrackedTime(totalTrackedSeconds)}
                                                                                    </span>
                                                                                </div>
                                                                            ) : (
                                                                                <>
                                                                                    <span className="text-sm font-normal text-zinc-400 italic">Empty</span>
                                                                                    <div className="text-zinc-400 opacity-0 group-hover:opacity-100 ml-1 flex items-center">
                                                                                        <Clock className="h-3 w-3" />
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Relationships — badges open corresponding right panel */}
                                                                    <div className="space-y-1.5">
                                                                        <div className="flex flex-wrap gap-1.5 min-h-[28px] items-center">
                                                                            {((task as any).blockedDependencies?.length ?? 0) > 0 && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setRightSidebarPanel('blocking')}
                                                                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
                                                                                >
                                                                                    <MinusCircle className="h-3.5 w-3.5" />
                                                                                    {(task as any).blockedDependencies?.length ?? 0} Blocking
                                                                                </button>
                                                                            )}
                                                                            {((task as any).dependencies?.length ?? 0) > 0 && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setRightSidebarPanel('related')}
                                                                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 hover:bg-zinc-200 transition-colors cursor-pointer"
                                                                                >
                                                                                    <ArrowLeftRight className="h-3.5 w-3.5" />
                                                                                    {(task as any).dependencies?.length ?? 0} Related
                                                                                </button>
                                                                            )}
                                                                            {(() => {
                                                                                const docCount = (task.attachments ?? []).filter((a: any) => a.mimeType === 'doc_link').length;
                                                                                return docCount > 0 ? (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => setRightSidebarPanel('docLinks')}
                                                                                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 hover:bg-zinc-200 transition-colors cursor-pointer"
                                                                                    >
                                                                                        <FileText className="h-3.5 w-3.5" />
                                                                                        {docCount} Doc{docCount !== 1 ? 's' : ''}
                                                                                    </button>
                                                                                ) : null;
                                                                            })()}
                                                                            {(() => {
                                                                                const linkCount = (task.attachments ?? []).filter((a: any) => a.mimeType === 'link').length;
                                                                                return linkCount > 0 ? (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => setRightSidebarPanel('taskLinks')}
                                                                                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 hover:bg-zinc-200 transition-colors cursor-pointer"
                                                                                    >
                                                                                        <Paperclip className="h-3.5 w-3.5" />
                                                                                        {linkCount} Link{linkCount !== 1 ? 's' : ''}
                                                                                    </button>
                                                                                ) : null;
                                                                            })()}
                                                                            {customRelationshipTypes.length > 0 && customRelationshipTypes.map((ct) => (
                                                                                <button
                                                                                    key={ct.id}
                                                                                    type="button"
                                                                                    onClick={() => setRightSidebarPanel('related')}
                                                                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 hover:bg-zinc-200 transition-colors cursor-pointer"
                                                                                >
                                                                                    <ArrowLeftRight className="h-3.5 w-3.5" />
                                                                                    {ct.name}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>

                                                                </div>

                                                                {/* Description */}
                                                                <div className="space-y-3">
                                                                    <DescriptionSection
                                                                        task={task}
                                                                        description={description}
                                                                        onDescriptionChange={handleDescriptionChange}
                                                                        onOpenAskAI={() => setIsAskAIOpen(true)}
                                                                        currentUserId={currentUserId}
                                                                        session={session}
                                                                        descriptionEditorRef={descriptionEditorRef}
                                                                    />
                                                                </div>

                                                                {/* Custom Fields (Details tab) */}
                                                                <div className="space-y-3">
                                                                    <CustomFieldsSection
                                                                        taskId={task.id}
                                                                        workspaceId={task.workspaceId}
                                                                    />
                                                                    {/* Subtasks */}
                                                                    <SubtasksTable
                                                                        task={task}
                                                                        subtasks={subtasks}
                                                                        workspaceMembers={workspaceMembers}
                                                                        isAddingSubtask={isAddingSubtask}
                                                                        setIsAddingSubtask={setIsAddingSubtask}
                                                                        subtaskTitle={subtaskTitle}
                                                                        setSubtaskTitle={setSubtaskTitle}
                                                                        handleCreateSubtask={handleCreateSubtask}
                                                                        updateTask={updateTask.mutate}
                                                                        utils={utils}
                                                                        workspaceId={task.workspaceId}
                                                                    />

                                                                    {/* Relationships */}
                                                                    <TaskRelationshipsSection
                                                                        task={task}
                                                                        taskId={task.id}
                                                                        workspaceId={task.workspaceId}
                                                                    />

                                                                    {/* Checklists */}
                                                                    <ChecklistsSection
                                                                        taskId={task.id}
                                                                        workspaceMembers={workspaceMembers}
                                                                    />

                                                                    {/* Attachments (Details tab) */}
                                                                    <AttachmentsSection taskId={task.id} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Panel>
                                        {rightSidebarPanel && (
                                            <>
                                                <ResizableSeparator
                                                    className="w-2 shrink-0 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-col-resize data-[resize-handle-active]:bg-zinc-300"
                                                    style={{ touchAction: 'none' }}
                                                >
                                                    <div className="h-12 w-1 rounded-full bg-zinc-300 hover:bg-zinc-500 transition-colors pointer-events-none" aria-hidden />
                                                </ResizableSeparator>
                                                <Panel defaultSize={35} minSize={25}>
                                                    <div className="flex-1 h-full flex flex-col min-h-0 bg-white overflow-hidden">
                                                        {rightSidebarPanel === 'activity' && (
                                                            <>
                                                                <div className="p-3 border-b border-zinc-100 flex items-center justify-between bg-white shrink-0">
                                                                    <span className="text-base font-semibold text-zinc-900">Activity</span>
                                                                    <div className="flex items-center gap-0.5">
                                                                        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Search">
                                                                            <Search className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button size="icon" variant="ghost" className="h-8 w-8 relative" aria-label="Notifications">
                                                                            <Bell className="h-4 w-4" />
                                                                            {filteredActivity.length > 0 && (
                                                                                <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-purple-500 px-1 text-[10px] font-medium text-white">
                                                                                    {filteredActivity.length > 99 ? '99+' : filteredActivity.length}
                                                                                </span>
                                                                            )}
                                                                        </Button>
                                                                        <Popover open={activityFilterOpen} onOpenChange={setActivityFilterOpen}>
                                                                            <PopoverTrigger asChild>
                                                                                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Filter activities">
                                                                                    <SlidersHorizontal className="h-4 w-4" />
                                                                                </Button>
                                                                            </PopoverTrigger>
                                                                            <PopoverContent className="w-72 p-0" align="end">
                                                                                <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
                                                                                    <span className="text-sm font-semibold text-zinc-900">Activities</span>
                                                                                    <button
                                                                                        type="button"
                                                                                        className="text-xs text-zinc-500 hover:text-zinc-700 cursor-pointer"
                                                                                        onClick={() => setActivityFilterTypes(new Set())}
                                                                                    >
                                                                                        Unselect All
                                                                                    </button>
                                                                                </div>
                                                                                <ScrollArea className="max-h-[280px]">
                                                                                    <div className="p-2 space-y-0.5">
                                                                                        {ACTIVITY_FILTER_OPTIONS.map((opt) => {
                                                                                            const Icon = opt.icon;
                                                                                            const checked = activityFilterTypes.has(opt.id);
                                                                                            return (
                                                                                                <label
                                                                                                    key={opt.id}
                                                                                                    className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-zinc-50 cursor-pointer"
                                                                                                >
                                                                                                    <Checkbox
                                                                                                        checked={checked}
                                                                                                        onCheckedChange={(c) => {
                                                                                                            setActivityFilterTypes((prev) => {
                                                                                                                const next = new Set(prev);
                                                                                                                if (c) next.add(opt.id); else next.delete(opt.id);
                                                                                                                return next;
                                                                                                            });
                                                                                                        }}
                                                                                                    />
                                                                                                    <Icon className="h-4 w-4 text-zinc-500 shrink-0" />
                                                                                                    <span className="text-sm text-zinc-900 truncate">{opt.label}</span>
                                                                                                </label>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                </ScrollArea>
                                                                            </PopoverContent>
                                                                        </Popover>
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1 min-h-0"><ScrollArea className="h-full">
                                                                    <div className="p-4">
                                                                        {/* Show more */}
                                                                        {activityFilterTypes.size === 0 && (
                                                                            <p className="text-sm text-zinc-500 py-4">Select activity types in the filter to view activities.</p>
                                                                        )}
                                                                        {activityFilterTypes.size > 0 && filteredActivity.length > 3 && (
                                                                            <button type="button" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 mb-3 cursor-pointer">
                                                                                <ChevronRight className="h-3.5 w-3.5" /> Show more
                                                                            </button>
                                                                        )}
                                                                        <div className="space-y-4">
                                                                            {filteredActivity.map((item: any, i: number) => {
                                                                                const isAgent = !!(item.agentId ?? item.agentName ?? item.sourceType === 'AGENT');
                                                                                const displayName = isAgent ? (item.agentName || 'Automation Agent') : (item.user?.name ?? 'Someone');
                                                                                return (
                                                                                    <div key={item.id || i} className="flex gap-3 text-sm">
                                                                                        {item.type === 'comment' ? (
                                                                                            isAgent ? (
                                                                                                <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center mt-0.5 shrink-0">
                                                                                                    <Bot className="h-3.5 w-3.5 text-purple-600" />
                                                                                                </div>
                                                                                            ) : (
                                                                                                <Avatar className="h-6 w-6 mt-0.5 shrink-0">
                                                                                                    <AvatarImage src={item.user?.image} />
                                                                                                    <AvatarFallback className="text-[9px]">{item.user?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                                                                </Avatar>
                                                                                            )
                                                                                        ) : (
                                                                                            isAgent ? (
                                                                                                <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center mt-0.5 shrink-0">
                                                                                                    <Bot className="h-3.5 w-3.5 text-purple-600" />
                                                                                                </div>
                                                                                            ) : (
                                                                                                <div className="h-6 w-6 rounded-full bg-zinc-100 flex items-center justify-center mt-0.5 shrink-0">
                                                                                                    <LayoutList className="h-3 w-3" />
                                                                                                </div>
                                                                                            )
                                                                                        )}
                                                                                        <div className="space-y-1 min-w-0 flex-1">
                                                                                            <div className="text-zinc-600">
                                                                                                {item.type === 'comment' ? (
                                                                                                    <>
                                                                                                        <span className="font-medium text-zinc-900">{displayName}</span>
                                                                                                        <p className="text-zinc-800 mt-0.5 break-words">{item.content}</p>
                                                                                                    </>
                                                                                                ) : (
                                                                                                    <>
                                                                                                        <span className="font-medium">{displayName}</span>
                                                                                                        {' '}{item.action === 'CREATED' ? 'created the task' : item.action === 'ASSIGNED' ? 'assigned' : item.action === 'UNASSIGNED' ? 'unassigned' : item.action === 'STATUS_CHANGED' ? 'updated status' : item.action === 'PRIORITY_CHANGED' ? 'updated priority' : item.action === 'DUE_DATE_CHANGED' ? 'updated due date' : item.action === 'ATTACHED' ? 'added an attachment' : item.action === 'COMMENTED' ? 'commented' : item.action === 'MOVED' ? 'moved' : 'updated'}{' '}{item.field ? (item.field === 'title' ? 'name' : item.field === 'statusId' ? 'status' : item.field === 'listId' ? 'list' : item.field) : 'the task'}
                                                                                                    </>
                                                                                                )}
                                                                                            </div>
                                                                                            <div className="text-[10px] text-zinc-400">
                                                                                                {format(new Date(item.createdAt), 'MMM d, h:mm a')}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                </ScrollArea>
                                                                </div>
                                                                <div className="p-4 border-t border-zinc-100 bg-white shrink-0">

                                                                    {/* New comment / activity input (image 1 style) */}
                                                                    <div className="flex items-end gap-3 mt-1">
                                                                        <div className="flex-1 relative bg-zinc-100/50 backdrop-blur-sm rounded-[28px] border border-zinc-200/60 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all duration-300 overflow-x-hidden shadow-inner min-h-[56px] flex flex-col justify-center">
                                                                            <Textarea
                                                                                ref={textareaRef}
                                                                                value={commentText}
                                                                                onChange={(e) => setCommentText(e.target.value)}
                                                                                placeholder="Write a comment... @mention for AI"
                                                                                className="min-h-[56px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pr-20 py-[16px] px-6 text-[14px] font-normal placeholder:text-zinc-400 leading-relaxed"
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                                                        e.preventDefault();
                                                                                        if (commentText.trim()) {
                                                                                            createComment.mutate({ taskId: task.id, content: commentText });
                                                                                            setCommentText('');
                                                                                        }
                                                                                    }
                                                                                }}
                                                                            />
                                                                            <div className="absolute bottom-[6px] right-2 flex items-center gap-1">
                                                                                <span className="text-[10px] text-zinc-400 font-medium mr-2 hidden sm:inline-block pointer-events-none">
                                                                                    Press Enter to send
                                                                                </span>
                                                                                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                                                                                    <PopoverTrigger asChild>
                                                                                        <button
                                                                                            type="button"
                                                                                            className="p-2.5 rounded-full hover:bg-zinc-200/80 text-zinc-400 hover:text-zinc-700 transition-all duration-200 hover:scale-105 cursor-pointer"
                                                                                            title="Add emoji"
                                                                                        >
                                                                                            <Smile className="h-5 w-5" />
                                                                                        </button>
                                                                                    </PopoverTrigger>
                                                                                    <PopoverContent className="w-auto p-0 border-0 shadow-2xl rounded-2xl overflow-hidden" align="end" sideOffset={12}>
                                                                                        <EmojiPicker
                                                                                            onEmojiClick={handleEmojiClick}
                                                                                            theme={Theme.LIGHT}
                                                                                            searchPlaceHolder="Search emoji..."
                                                                                            width={340}
                                                                                            height={420}
                                                                                            previewConfig={{ showPreview: false }}
                                                                                        />
                                                                                    </PopoverContent>
                                                                                </Popover>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                </div>
                                                            </>
                                                        )}

                                                        {rightSidebarPanel === 'related' && (
                                                            <div className="p-4 flex flex-col h-full min-h-0 overflow-auto">
                                                                <RelatedPanelContent
                                                                    taskId={task.id}
                                                                    workspaceId={task.workspaceId}
                                                                    task={task}
                                                                    customTypes={customRelationshipTypes}
                                                                />
                                                            </div>
                                                        )}
                                                        {rightSidebarPanel === 'links' && (
                                                            <div className="flex flex-col h-full min-h-0">
                                                                <LinksPanelContent taskId={task.id} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </Panel>
                                            </>
                                        )}
                                    </Group>

                                    {/* Narrow sidebar at right edge */}
                                    <div className="w-14 flex flex-col items-center py-2 border-l border-zinc-100 bg-zinc-50/50 shrink-0 px-2 relative z-10 h-full">
                                        {/* Collapse / Expand toggle */}
                                        <TooltipProvider delayDuration={300}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        type="button"
                                                        onClick={toggleRightSidebar}
                                                        className="flex flex-col items-center gap-0.5 py-2 px-1 w-full my-0.5 rounded-md transition-colors cursor-pointer text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                                                    >
                                                        {rightSidebarPanel ? (
                                                            <ChevronsRight className="h-5 w-5 shrink-0" />
                                                        ) : (
                                                            <ChevronsLeft className="h-5 w-5 shrink-0" />
                                                        )}
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="left">
                                                    <p>{rightSidebarPanel ? 'Collapse panel' : 'Expand panel'}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>

                                        {[
                                            { id: 'activity' as const, icon: MessageSquare, label: 'Activity', count: undefined },
                                            { id: 'related' as const, icon: ArrowLeftRight, label: 'Related', count: customRelationshipTypes.length > 0 ? ((task as any).dependencies ?? []).filter((d: any) => d.type === 'FINISH_TO_FINISH').length : 0 },
                                            { id: 'links' as const, icon: Paperclip, label: 'Links', count: (task.attachments ?? []).filter((a: any) => a.mimeType === 'link').length },
                                        ].map(({ id, icon: Icon, label, count }) => (
                                            <TooltipProvider key={id} delayDuration={300}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const next = rightSidebarPanel === id ? null : id;
                                                                setRightSidebarPanel(next);
                                                                if (next !== null) setLastRightSidebarPanel(next);
                                                            }}
                                                            className={cn(
                                                                "flex items-center justify-center py-2.5 px-1 w-full my-0.5 rounded-md transition-colors relative cursor-pointer",
                                                                rightSidebarPanel === id ? "bg-zinc-200 text-zinc-900" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                                                            )}
                                                        >
                                                            <Icon className="h-5 w-5 shrink-0" />
                                                            {count != null && count > 0 && (
                                                                <span className="absolute top-0 right-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                                                                    {count > 99 ? '99+' : count}
                                                                </span>
                                                            )}
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="left">
                                                        <p>{label}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    }
                    SidePanelContent={
                        showInternalAiPanel ? (
                            <TaskAIChatPanel task={task} onClose={() => setIsAskAIOpen(false)} />
                        ) : null
                    }
                    isPanelOpen={showInternalAiPanel}
                />
            </div>

            {/* Permissions Modal */}
            {permissionsModalOpen && (
                <TaskPermissionsModal
                    taskId={taskId}
                    workspaceId={task.workspaceId || null}
                    open={permissionsModalOpen}
                    onOpenChange={setPermissionsModalOpen}
                />
            )}

            {/* Time Tracking Modal (ClickUp-style) */}
            <TimeTrackingModal
                open={timeTrackingModalOpen}
                onOpenChange={setTimeTrackingModalOpen}
                taskId={task.id}
                workspaceId={task.workspaceId ?? undefined}
                taskTitle={task.title ?? undefined}
                totalTrackedSeconds={totalTrackedSeconds}
            />

            {/* Publish to Marketplace Modal */}
            {publishModalOpen && (
                <PublishEntityModal
                    open={publishModalOpen}
                    onOpenChange={setPublishModalOpen}
                    entityType="task"
                    entityId={task.id}
                />
            )}
        </div>
    );
}

export function TaskDetailModal({
    taskId,
    open,
    onOpenChange,
    layoutMode = 'modal',
    onLayoutModeChange
}: TaskDetailModalProps) {
    const [isAskAIOpen, setIsAskAIOpen] = React.useState(false);

    // Use TRPC to get task data if we need it for the AI panel title outside of TaskDetailContent
    const { data: task } = trpc.task.get.useQuery(
        { id: taskId || '' },
        { enabled: !!taskId && (layoutMode === 'modal' || layoutMode === 'fullscreen') && isAskAIOpen }
    );

    if (!open || !taskId) return null;

    if (layoutMode === 'modal' || layoutMode === 'fullscreen') {
        return (
            <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
                <DialogContent
                    className={cn(
                        "p-0 gap-0 overflow-visible bg-transparent shadow-none border-none sm:max-w-none transition-none",
                        "fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]",
                        "w-screen h-screen flex items-center justify-center pointer-events-none"
                    )}
                    showCloseButton={false}
                >
                    <DialogTitle className="sr-only">Task Details</DialogTitle>

                    {/* Custom backdrop (Radix overlay is null when modal=false) */}
                    <div
                        className="fixed inset-0 bg-black/50 z-0"
                        style={{ pointerEvents: 'auto' }}
                        onClick={() => onOpenChange(false)}
                        aria-hidden
                    />

                    <div className={cn(
                        "flex items-center justify-center gap-4 w-full pointer-events-auto relative z-10",
                        layoutMode === 'fullscreen' ? "h-screen px-0" : "h-[95vh] px-4"
                    )}>
                        {/* Main Task Modal */}
                        <div className={cn(
                            "bg-white shadow-xl flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
                            layoutMode === 'fullscreen' ? "w-full h-full rounded-none border-0" : "w-full max-w-7xl h-full rounded-lg border border-zinc-200"
                        )}>
                            <TaskDetailContent
                                key={taskId}
                                taskId={taskId}
                                onClose={() => onOpenChange(false)}
                                layoutMode={layoutMode}
                                onLayoutModeChange={onLayoutModeChange}
                                isAskAIOpen={isAskAIOpen}
                                onAskAIOpenChange={setIsAskAIOpen}
                            />
                        </div>

                        {/* Side AI Modal (Only renders when open) */}
                        {isAskAIOpen && (
                            <div className="bg-white rounded-lg shadow-xl border border-zinc-200 w-[400px] h-full flex flex-col overflow-hidden shrink-0 animate-in fade-in slide-in-from-left-4 duration-300">
                                {task ? (
                                    <TaskAIChatPanel task={task} onClose={() => setIsAskAIOpen(false)} />
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return null;
}