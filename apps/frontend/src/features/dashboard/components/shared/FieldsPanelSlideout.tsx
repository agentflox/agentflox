"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { CustomFieldSettingsPopover } from '@/entities/task/components/CustomFieldSettingsPopover';
import {
    DndContext,
    closestCenter,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    arrayMove,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ALL_FIELDS, FIELD_TYPE_DROPDOWN_OPTIONS } from "@/entities/task/constants/fieldTypes";
import {
    Settings,
    X,
    GripVertical,
    Plus,
    ArrowLeft,
    Info,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Circle,
    UserRound,
    Calendar,
    Flag,
    MessageSquare,
    Tag,
    Clock,
    Link2,
    Box,
    ListChecks,
    Check,
    Eye,
    Pencil,
    MousePointer2,
    Lock,
    Search,
} from "lucide-react";

// ─── Permission helpers ───────────────────────────────────────────────────────

const PERMISSION_OPTIONS = [
    { value: "workspace", label: "Workspace default", description: "Inherit permissions from your Workspace settings" },
    { value: "anyone_edit", label: "Anyone can edit", description: "Can view and edit the field definition" },
    { value: "anyone_set", label: "Anyone can set", description: "Can set field values on tasks, but not edit the field definition" },
    { value: "anyone_view", label: "Anyone can view", description: "Read-only permissions to view the field on tasks" },
    { value: "private", label: "Private", description: "Only you and invited members have access" },
];

function PermissionIcon({ value, className }: { value: string; className?: string }) {
    if (value === "workspace") return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" /><path d="M12 8v4l3 3" /></svg>;
    if (value === "anyone_edit") return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
    if (value === "anyone_set") return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93A10 10 0 0 0 2 12a10 10 0 0 0 17.07 7.07" /></svg>;
    if (value === "anyone_view") return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
    return <Lock className={className} />;
}

// ─── SortableFieldRow ─────────────────────────────────────────────────────────

export function SortableFieldRow({ id, children }: { id: string; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : "auto",
        position: "relative" as const,
    };
    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn("group flex items-center gap-2 py-2 px-2 rounded hover:bg-zinc-50 cursor-default", isDragging && "bg-white shadow-md ring-1 ring-zinc-200")}
        >
            {children}
        </div>
    );
}

// ─── CreateFieldFormPanel ─────────────────────────────────────────────────────

export function CreateFieldFormPanel({
    workspaceId,
    listId,
    listName,
    spaceId,
    projectId,
    folderId,
    teamId,
    initialType,
    onBack,
    onClose,
}: {
    workspaceId?: string;
    listId?: string;
    listName?: string;
    spaceId?: string;
    projectId?: string;
    folderId?: string;
    teamId?: string;
    initialType: string;
    onBack: () => void;
    onClose: (fieldId?: string) => void;
}) {
    const utils = trpc.useUtils();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState<string>(initialType);
    const [showMore, setShowMore] = useState(false);
    const [permission, setPermission] = useState("workspace");
    const [permissionOpen, setPermissionOpen] = useState(false);
    const [isRequired, setIsRequired] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [isVisibleToGuests, setIsVisibleToGuests] = useState(true);

    const exceptionInputRef = React.useRef<HTMLInputElement>(null);
    const [selectedMembers, setSelectedMembers] = useState<{ id: string; name: string; avatar?: string; badge?: boolean }[]>([]);
    const [permissionForAdd, setPermissionForAdd] = useState("VIEW");
    const [customPermissions, setCustomPermissions] = useState([
        { id: "creator", name: "You", role: "creator", permission: "EDIT", avatar: "" },
    ]);

    const EXCEPTION_PERMISSION_LEVELS = [
        { value: 'EDIT', label: 'Can edit', icon: Pencil, description: 'Permission to set field values and edit the field definition' },
        { value: 'SET', label: 'Can set', icon: MousePointer2, description: 'Permission to set field values on tasks, but not edit the field definition' },
        { value: 'VIEW', label: 'Can view', icon: Eye, description: 'Read-only permission to view the field on tasks' },
    ];
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [showAddException, setShowAddException] = useState(false);

    const { data: workspaceData } = trpc.workspace.get.useQuery({ id: workspaceId! }, { enabled: !!workspaceId });
    const { data: teamListData } = trpc.team.list.useQuery({ workspaceId: workspaceId!, scope: "all" as any }, { enabled: !!workspaceId });

    const workspaceMembers = useMemo(() => {
        const users = (workspaceData?.members || []).map((m: any) => ({
            id: m.user.id,
            name: m.user.name || m.user.email,
            avatar: m.user.image,
            badge: false,
        }));
        const tms = (teamListData?.items || []).map((t: any) => ({
            id: t.id,
            name: t.name,
            badge: true,
        }));
        return [...users, ...tms];
    }, [workspaceData, teamListData]);

    const createField = trpc.customFields.create.useMutation({
        onSuccess: (newField) => {
            if (workspaceId) utils.customFields.list.invalidate({ workspaceId, applyTo: "TASK" });
            toast.success("Custom field added");
            onClose(newField.id); // Pass the newly created field ID back
        },
        onError: (err) => toast.error(err.message || "Failed to add field"),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!workspaceId) { toast.error("Workspace ID is missing"); return; }
        if (!name.trim()) { toast.error("Field name is required"); return; }
        const config: Record<string, unknown> = {};
        if (description.trim()) config.description = description.trim();
        if (permission !== "workspace") config.permissionLevel = permission;
        if (["DROPDOWN", "CUSTOM_DROPDOWN", "LABELS", "CATEGORIZE", "SENTIMENT", "TSHIRT_SIZE"].includes(type)) {
            config.options = config.options ?? [];
        }

        let locationType: "WORKSPACE" | "SPACE" | "PROJECT" | "TEAM" | "FOLDER" | "LIST" | "PERSONAL" = "WORKSPACE";
        if (listId) locationType = "LIST";
        else if (folderId) locationType = "FOLDER";
        else if (projectId) locationType = "PROJECT";
        else if (spaceId) locationType = "SPACE";
        else if (teamId) locationType = "TEAM";

        createField.mutate({
            workspaceId,
            listId,
            folderId,
            projectId,
            spaceId,
            teamId,
            locationType,
            name: name.trim(),
            type,
            applyTo: ["TASK"],
            isRequired,
            isPinned,
            isVisibleToGuests,
            visibility: permission === "private" ? "PRIVATE" : permission === "anyone_view" ? "EVERYONE" : permission === "anyone_edit" ? "MEMBERS" : "ADMINS",
            config: Object.keys(config).length ? config : undefined,
        });
    };

    const selectedOption = FIELD_TYPE_DROPDOWN_OPTIONS.find((o) => o.type === type) || FIELD_TYPE_DROPDOWN_OPTIONS.find((o) => o.type === "TEXT");
    const TypeIcon = selectedOption?.icon;
    const selectedPermission = PERMISSION_OPTIONS.find((o) => o.value === permission) || PERMISSION_OPTIONS[0];

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="flex flex-col border-b border-zinc-100">
                <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2">
                        <button onClick={onBack} className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-zinc-100 text-zinc-500 cursor-pointer">
                            <ArrowLeft className="h-4 w-4" />
                        </button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="text-[13px] font-normal text-zinc-900 flex items-center gap-1.5 hover:bg-zinc-50 py-1 px-2 rounded-md -ml-2 cursor-pointer outline-none">
                                    {selectedOption?.label || "Dropdown"} <ChevronDown className="h-4 w-4 text-zinc-400" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="start">
                                {FIELD_TYPE_DROPDOWN_OPTIONS.map((opt) => {
                                    const Icon = opt.icon;
                                    return (
                                        <DropdownMenuItem key={opt.id} onClick={() => setType(opt.type)} className="py-2.5 px-3 cursor-pointer focus:bg-violet-50/50 border border-transparent focus:border-violet-200 transition-all rounded-lg group">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("h-6 w-6 rounded-md flex items-center justify-center transition-all", opt.isAi ? "bg-purple-50" : "bg-zinc-100 group-focus:bg-white group-focus:shadow-sm")}>
                                                    <Icon className={cn("h-3.5 w-3.5", opt.color, "group-focus:text-violet-900")} />
                                                </div>
                                                <span className="text-[13px] font-normal text-zinc-900 group-focus:text-violet-900 transition-colors">{opt.label}</span>
                                            </div>
                                        </DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <button onClick={() => onClose()} className="h-8 w-8 rounded-full flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 text-zinc-500">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
                <form id="add-field-sidebar-form" onSubmit={handleSubmit}>
                    <div className="p-5 space-y-5">
                        <div className="space-y-2">
                            <label htmlFor="field-name" className="!text-xs !font-medium !text-zinc-600 flex items-center gap-1">
                                Field name <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center gap-2 px-3 bg-white rounded-lg border border-zinc-200/80 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 transition-all h-9">
                                {TypeIcon && (
                                    <div className="text-zinc-500 shrink-0 flex items-center justify-center">
                                        <TypeIcon className="h-4 w-4" />
                                    </div>
                                )}
                                <input
                                    id="field-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter name..."
                                    className="w-full bg-transparent border-none outline-none text-[13px] text-zinc-900 placeholder:text-zinc-400 h-full"
                                />
                            </div>
                        </div>

                        {type === "DROPDOWN" && (
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[13px] font-medium text-zinc-500 flex items-center gap-1">
                                        Dropdown options <span className="text-red-500">*</span>
                                    </label>
                                    <span className="text-xs text-zinc-400 flex items-center gap-1"><ChevronUp className="h-3 w-3" /> Manual</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-4 rounded-full border border-zinc-200 bg-indigo-100" />
                                        <Input className="h-8 text-[13px]" defaultValue="Option 1" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-4 rounded-full border border-zinc-200 bg-pink-100" />
                                        <Input className="h-8 text-[13px]" defaultValue="Option 2" />
                                    </div>
                                    <Button variant="outline" type="button" className="h-8 w-full justify-start text-zinc-500 font-normal text-[13px] border-dashed">
                                        <Plus className="h-3.5 w-3.5 mr-2" /> Add option
                                    </Button>
                                </div>
                            </div>
                        )}

                        {(type === "DROPDOWN" || type === "TEXT") && (
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-medium text-zinc-500">Fill method</label>
                                <div className="flex p-1 bg-zinc-100 rounded-lg">
                                    <button type="button" className="flex-1 py-1.5 px-3 text-[13px] font-medium bg-white rounded-md shadow-sm text-zinc-900 border border-zinc-200">Manual fill</button>
                                    <button type="button" className="flex-1 py-1.5 px-3 text-[13px] font-medium text-zinc-500 hover:text-zinc-700 flex items-center justify-center gap-1.5">
                                        <svg className="h-3.5 w-3.5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                                        Fill with AI
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-zinc-100 mt-2">
                        <button type="button" onClick={() => setShowMore(!showMore)} className="w-full flex items-center justify-between px-5 py-3.5 text-[13px] font-semibold text-zinc-800 hover:bg-zinc-50 transition-colors cursor-pointer">
                            More settings and permissions
                            {showMore ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
                        </button>
                    </div>

                    {showMore && (
                        <div className="px-5 pb-5 pt-1 space-y-5">
                            <div className="space-y-2">
                                <label className="block !text-xs !font-medium !text-zinc-600">Description</label>
                                <Textarea
                                    className="min-h-[70px] text-[13px] rounded-lg resize-y border-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-300 placeholder:text-zinc-400"
                                    placeholder="Tell other users how to use this field"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block !text-xs !font-medium !text-zinc-600">Permissions</label>
                                <div className="flex gap-2">
                                    <Popover open={permissionOpen} onOpenChange={setPermissionOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" type="button" className="w-full justify-between h-9 rounded-lg text-[13px] font-normal border-zinc-200 text-zinc-800 hover:bg-zinc-50">
                                                <span className="flex items-center gap-2">
                                                    <PermissionIcon value={selectedPermission.value} className="h-4 w-4 text-zinc-400 shrink-0" />
                                                    <span className="font-normal">{selectedPermission.label}</span>
                                                </span>
                                                <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[280px] p-1 shadow-2xl border-zinc-200 rounded-xl z-[150]" align="start">
                                            <div className="space-y-0.5">
                                                {PERMISSION_OPTIONS.map((opt) => (
                                                    <button key={opt.value} type="button" onClick={() => { setPermission(opt.value); setPermissionOpen(false); }} className={cn("w-full flex items-start gap-3 rounded-lg py-2.5 px-2.5 transition-all text-left group cursor-pointer", permission === opt.value ? "bg-indigo-50" : "hover:bg-zinc-50")}>
                                                        <div className={cn("mt-0.5 h-7 w-7 rounded-md border flex items-center justify-center shrink-0 transition-all", permission === opt.value ? "bg-white border-indigo-200 text-indigo-600 shadow-sm" : "bg-zinc-50 border-zinc-100 text-zinc-400 group-hover:bg-white group-hover:border-zinc-200")}>
                                                            <PermissionIcon value={opt.value} className="h-3.5 w-3.5" />
                                                        </div>
                                                        <div className="flex flex-col gap-0 min-w-0 flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className={cn("text-[13px] font-semibold leading-tight", permission === opt.value ? "text-indigo-900" : "text-zinc-800")}>{opt.label}</span>
                                                                {permission === opt.value && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                                                            </div>
                                                            <span className="text-[10px] text-zinc-400 leading-normal line-clamp-2">{opt.description}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                    <Button variant="outline" type="button" size="icon" className="h-9 w-10 rounded-lg shrink-0 border-zinc-200 text-zinc-400 hover:text-zinc-600">
                                        <Lock className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Exceptions */}
                            <div className="space-y-2">
                                <div className="space-y-0.5">
                                    <div className="flex items-center">
                                        <label className="block !text-xs !font-medium !text-zinc-600">Exceptions</label>
                                        <TooltipProvider delayDuration={300}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Info className="h-3 w-3 text-zinc-400 ml-1 mb-0.5 cursor-help" />
                                                </TooltipTrigger>
                                                <TooltipContent side="top" align="center" className="bg-zinc-900 text-white border-zinc-800 text-[13px] py-2 px-3 font-medium max-w-[300px] text-center">
                                                    All users will have the permissions set above. To customize access for certain people, add exceptions below.
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                    <p className="text-[11px] text-zinc-400 leading-none mt-1.5">
                                        Override default permissions for specific members or teams.
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    {customPermissions.map((p) => (
                                        <div key={p.id} className="flex items-center justify-between py-1 group">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <div className={cn("h-[22px] w-[22px] rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0", p.role === "creator" ? "bg-zinc-900" : "bg-indigo-500")}>
                                                    {p.avatar ? (p.avatar.length > 2 ? <img src={p.avatar} alt="" className="w-full h-full object-cover rounded-full" /> : p.avatar) : p.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                    <span className="text-[13px] text-zinc-700 font-medium truncate min-w-0">{p.name}</span>
                                                    {p.role === "creator" && <span className="text-[13px] text-zinc-400 shrink-0">(Creator)</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {p.role === "creator" ? (
                                                    <div className="flex items-center gap-1 text-zinc-600 cursor-default px-2 py-1">
                                                        <span className="text-[13px] font-medium">{EXCEPTION_PERMISSION_LEVELS.find((pl) => pl.value === p.permission)?.label}</span>
                                                        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                                                    </div>
                                                ) : (
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <button className="flex items-center gap-1 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer focus:outline-none px-2 py-1 rounded hover:bg-zinc-100">
                                                                <span className="text-[13px] font-medium">{EXCEPTION_PERMISSION_LEVELS.find((pl) => pl.value === p.permission)?.label}</span>
                                                                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                                                            </button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[280px] p-1 shadow-2xl border-zinc-200 rounded-xl z-[150]" align="end">
                                                            <div className="space-y-0.5">
                                                                {EXCEPTION_PERMISSION_LEVELS.map((pl) => (
                                                                    <button
                                                                        key={pl.value}
                                                                        type="button"
                                                                        onClick={() => setCustomPermissions((prev) => prev.map((item) => (item.id === p.id ? { ...item, permission: pl.value } : item)))}
                                                                        className={cn("w-full flex items-start gap-3 rounded-lg py-2.5 px-2.5 transition-all text-left group cursor-pointer", p.permission === pl.value ? "bg-indigo-50" : "hover:bg-zinc-50")}
                                                                    >
                                                                        <div className={cn("mt-0.5 h-7 w-7 rounded-md border flex items-center justify-center shrink-0 transition-all", p.permission === pl.value ? "bg-white border-indigo-200 text-indigo-600 shadow-sm" : "bg-zinc-50 border-zinc-100 text-zinc-400 group-hover:bg-white group-hover:border-zinc-200")}>
                                                                            <pl.icon className="h-3.5 w-3.5" />
                                                                        </div>
                                                                        <div className="flex flex-col gap-0 min-w-0 flex-1">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className={cn("text-[13px] font-semibold leading-tight", p.permission === pl.value ? "text-indigo-900" : "text-zinc-800")}>{pl.label}</span>
                                                                                {p.permission === pl.value && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                                                                            </div>
                                                                            <span className="text-[10px] text-zinc-400 leading-normal line-clamp-2">{pl.description}</span>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                )}
                                                <div className="w-6 flex justify-center">
                                                    {p.role !== "creator" && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setCustomPermissions((prev) => prev.filter((item) => item.id !== p.id))}
                                                            className="h-6 w-6 rounded-md flex items-center justify-center text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {showAddException ? (
                                    <div className="flex items-center gap-2">
                                        <Popover open={isInputFocused} onOpenChange={(open) => { setIsInputFocused(open); if (!open && selectedMembers.length === 0) setShowAddException(false); }}>
                                            <PopoverTrigger asChild>
                                                <div
                                                    className={cn("flex-1 flex items-center h-[36px] bg-white border border-zinc-200 rounded-lg px-2 gap-1.5 transition-all cursor-text overflow-hidden", isInputFocused && "ring-2 ring-indigo-500/10 border-indigo-300")}
                                                    onMouseDown={(e) => { if (e.target !== exceptionInputRef.current) { e.preventDefault(); exceptionInputRef.current?.focus(); } }}
                                                >
                                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                        {selectedMembers.slice(0, 2).map((m) => (
                                                            <div key={m.id} className="group/pill flex items-center gap-1 bg-zinc-100 border border-zinc-200 rounded px-1.5 h-[24px] max-w-[120px] transition-all hover:bg-zinc-200/50 cursor-pointer shrink-0">
                                                                <span className="text-[11px] font-medium text-zinc-700 truncate">{m.name}</span>
                                                                <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedMembers((prev) => prev.filter((sm) => sm.id !== m.id)); }} className="h-4 w-4 flex items-center justify-center rounded-full text-zinc-400 hover:text-red-500 ml-0.5 cursor-pointer"><X className="h-3 w-3" /></button>
                                                            </div>
                                                        ))}
                                                        {selectedMembers.length > 2 && <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-1 h-[24px] flex items-center rounded border border-zinc-200 tabular-nums shrink-0">+{selectedMembers.length - 2}</span>}
                                                        <input ref={exceptionInputRef} placeholder={selectedMembers.length === 0 ? "Add members or teams" : ""} className="flex-1 bg-transparent border-none w-full outline-none text-sm placeholder:text-zinc-400 min-w-[30px] h-full cursor-text" onFocus={() => setIsInputFocused(true)} onBlur={(e) => { if (!e.relatedTarget?.closest("[data-radix-popper-content-wrapper]")) { setIsInputFocused(false); if (selectedMembers.length === 0) setShowAddException(false); } }} />
                                                    </div>
                                                    {selectedMembers.length > 0 && (
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <button className="flex items-center gap-1 text-[12px] font-normal text-zinc-500 hover:text-zinc-900 px-3 border-l border-zinc-100 h-5 shrink-0 transition-colors cursor-pointer focus:outline-none">
                                                                    {EXCEPTION_PERMISSION_LEVELS.find((p) => p.value === permissionForAdd)?.label}
                                                                    <ChevronDown className="h-3 w-3" />
                                                                </button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-[280px] p-1 shadow-2xl border-zinc-200 rounded-xl z-[160]" align="end">
                                                                <div className="space-y-0.5">
                                                                    {EXCEPTION_PERMISSION_LEVELS.map((p) => (
                                                                        <button
                                                                            key={p.value}
                                                                            type="button"
                                                                            onClick={() => setPermissionForAdd(p.value)}
                                                                            className={cn("w-full flex items-start gap-3 rounded-lg py-2.5 px-2.5 transition-all text-left group cursor-pointer", permissionForAdd === p.value ? "bg-indigo-50" : "hover:bg-zinc-50")}
                                                                        >
                                                                            <div className={cn("mt-0.5 h-7 w-7 rounded-md border flex items-center justify-center shrink-0 transition-all", permissionForAdd === p.value ? "bg-white border-indigo-200 text-indigo-600 shadow-sm" : "bg-zinc-50 border-zinc-100 text-zinc-400 group-hover:bg-white group-hover:border-zinc-200")}>
                                                                                <p.icon className="h-3.5 w-3.5" />
                                                                            </div>
                                                                            <div className="flex flex-col gap-0 min-w-0 flex-1">
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className={cn("text-[13px] font-semibold leading-tight", permissionForAdd === p.value ? "text-indigo-900" : "text-zinc-800")}>{p.label}</span>
                                                                                    {permissionForAdd === p.value && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                                                                                </div>
                                                                                <span className="text-[10px] text-zinc-400 leading-normal line-clamp-2">{p.description}</span>
                                                                            </div>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    )}
                                                </div>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-1 shadow-2xl border-zinc-200 rounded-xl max-h-[240px] overflow-y-auto" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                                                <div className="space-y-0.5">
                                                    {workspaceMembers.map((m: any) => {
                                                        const isSelected = selectedMembers.find((s) => s.id === m.id);
                                                        return (
                                                            <button key={m.id} type="button" onClick={() => { if (isSelected) setSelectedMembers((prev) => prev.filter((sm) => sm.id !== m.id)); else setSelectedMembers((prev) => [...prev, m]); }} className={cn("w-full flex items-center gap-3 rounded-lg py-2 px-2 hover:bg-zinc-50 transition-colors text-left cursor-pointer", isSelected && "bg-indigo-50/30")}>
                                                                <div className={cn("h-8 w-8 rounded-full overflow-hidden border shrink-0 flex items-center justify-center bg-zinc-100 text-xs font-medium text-zinc-600", isSelected ? "border-indigo-200" : "border-zinc-200")}>
                                                                    {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full object-cover" /> : m.name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-[13px] font-medium text-zinc-800 truncate">{m.name}</div>
                                                                    {m.badge && <div className="text-[11px] text-zinc-400">Team</div>}
                                                                </div>
                                                                {isSelected && <Check className="h-4 w-4 text-indigo-600 shrink-0" />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                        {selectedMembers.length > 0 && (
                                            <Button type="button" size="sm" className="h-9 px-3 bg-indigo-500 text-white hover:bg-indigo-600 text-[13px] font-medium rounded-lg shrink-0" onClick={() => { selectedMembers.forEach((m) => setCustomPermissions((prev) => [...prev, { id: m.id, name: m.name, role: "member", permission: permissionForAdd, avatar: m.avatar || "" }])); setSelectedMembers([]); setShowAddException(false); }}>
                                                Add
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <Button variant="secondary" type="button" className="w-full h-8 text-[13px] font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-500" onClick={() => { setShowAddException(true); setTimeout(() => { setIsInputFocused(true); exceptionInputRef.current?.focus(); }, 50); }}>
                                        Add exception
                                    </Button>
                                )}
                            </div>

                            {/* Display settings */}
                            <div>
                                <Label className="block !text-xs !font-medium !text-zinc-600 !mb-3">Display settings</Label>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Switch checked={isRequired} onCheckedChange={setIsRequired} className="data-[state=checked]:bg-indigo-500" />
                                        <Label className="!text-xs !font-normal text-zinc-700 cursor-pointer leading-none !m-0" onClick={() => setIsRequired(!isRequired)}>Required in tasks</Label>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Switch checked={isPinned} onCheckedChange={setIsPinned} className="data-[state=checked]:bg-indigo-500" />
                                        <Label className="!text-xs !font-normal text-zinc-700 cursor-pointer leading-none !m-0" onClick={() => setIsPinned(!isPinned)}>Pinned</Label>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Switch checked={isVisibleToGuests} onCheckedChange={setIsVisibleToGuests} className="data-[state=checked]:bg-indigo-500" />
                                        <Label className="!text-xs !font-normal text-zinc-700 cursor-pointer leading-none !m-0" onClick={() => setIsVisibleToGuests(!isVisibleToGuests)}>Visible to Guests and Limited Members</Label>
                                    </div>
                                </div>
                            </div>

                            {/* Belongs to */}
                            <div className="space-y-1">
                                <Label className="!text-xs !font-medium !text-zinc-600">Belongs to</Label>
                                <p className="text-[13px] text-zinc-500 leading-none mb-3">Field will exist on all tasks at locations below</p>
                                {listName ? (
                                    <div className="flex items-center gap-2 pt-1 text-[13px] text-zinc-800">
                                        <ListChecks className="h-4 w-4 text-zinc-400 shrink-0" />
                                        <span className="font-medium">{listName}</span>
                                    </div>
                                ) : (
                                    <div className="text-[13px] text-zinc-400 italic">No location context available</div>
                                )}
                            </div>
                        </div>
                    )}
                </form>
            </ScrollArea>

            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-zinc-100 bg-white shrink-0">
                <Button type="button" variant="outline" onClick={() => onClose()} className="h-9 px-4 border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 shadow-sm font-medium text-[13px] rounded-md">
                    Cancel
                </Button>
                <Button type="submit" form="add-field-sidebar-form" disabled={createField.isPending || !name.trim()} className="h-9 px-4 bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm font-medium border border-transparent text-[13px] rounded-md">
                    {createField.isPending ? "Creating..." : "Create"}
                </Button>
            </div>
        </div>
    );
}

// ─── FieldsPanelSlideout ──────────────────────────────────────────────────────

export interface FieldsPanelSlideoutProps {
    open: boolean;
    onClose: () => void;
    onOpenManagerModal: () => void;
    workspaceId?: string;
    spaceId?: string;
    projectId?: string;
    folderId?: string;
    teamId?: string;
    listId?: string;
    listName?: string;
    /** Merged FIELD_CONFIG (standard + custom used by tasks) */
    fieldConfig: any[];
    visibleColumns: Set<string>;
    columnOrder: string[];
    onColumnOrderChange: (updater: (prev: string[]) => string[]) => void;
    toggleColumn: (id: string) => void;
    sensors: any;
    /** All workspace custom fields */
    customFields: any[];
    /** IDs of custom fields that appear on current list's tasks */
    usedCustomFieldIds: Set<string>;
    getCustomFieldIcon: (fieldType: string) => React.ComponentType<any> | null;
}

export function FieldsPanelSlideout({
    open,
    onClose,
    onOpenManagerModal,
    workspaceId,
    spaceId,
    projectId,
    folderId,
    teamId,
    listId,
    listName,
    fieldConfig,
    visibleColumns,
    columnOrder,
    onColumnOrderChange,
    toggleColumn,
    sensors,
    customFields,
    usedCustomFieldIds,
    getCustomFieldIcon,
}: FieldsPanelSlideoutProps) {
    const [tab, setTab] = useState<"existing" | "create">("existing");
    const [fieldsSearch, setFieldsSearch] = useState("");
    const [createFieldSearch, setCreateFieldSearch] = useState("");
    const [createFieldStep, setCreateFieldStep] = useState<"picker" | "form">("picker");
    const [createFieldType, setCreateFieldType] = useState("TEXT");
    const [shownExpanded, setShownExpanded] = useState(true);
    const [propertiesExpanded, setPropertiesExpanded] = useState(true);
    const [customFieldsExpanded, setCustomFieldsExpanded] = useState(true);
    const [workspaceCustomFieldsExpanded, setWorkspaceCustomFieldsExpanded] = useState(true);

    if (!open) return null;

    const handleClose = () => {
        onClose();
        setCreateFieldSearch("");
        setCreateFieldStep("picker");
    };

    function renderFieldIcon(iconAny: any) {
        if (typeof iconAny === "function") return React.createElement(iconAny, { className: "h-4 w-4 text-zinc-400 shrink-0" });
        switch (iconAny) {
            case "Aa": return <span className="text-[10px] font-bold tracking-tighter text-zinc-400 shrink-0 w-4 h-4 flex items-center justify-center">Aa</span>;
            case "person": return <UserRound className="h-4 w-4 text-zinc-400 shrink-0" />;
            case "calendar": return <Calendar className="h-4 w-4 text-zinc-400 shrink-0" />;
            case "flag": return <Flag className="h-4 w-4 text-zinc-400 shrink-0" />;
            case "circle": return <Circle className="h-4 w-4 text-zinc-400 shrink-0" />;
            case "message": return <MessageSquare className="h-4 w-4 text-zinc-400 shrink-0" />;
            case "tag": return <Tag className="h-4 w-4 text-zinc-400 shrink-0" />;
            case "clock": return <Clock className="h-4 w-4 text-zinc-400 shrink-0" />;
            case "link": return <Link2 className="h-4 w-4 text-zinc-400 shrink-0" />;
            case "box": return <Box className="h-4 w-4 text-zinc-400 shrink-0" />;
            default: return <Circle className="h-4 w-4 text-zinc-400 shrink-0" />;
        }
    }

    return (
        <>
            {/* Backdrop */}
            <div className="absolute inset-0 z-40" onClick={handleClose} aria-hidden />

            {/* Panel */}
            <div className="absolute right-0 bottom-0 top-0 w-[360px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col">
                {createFieldStep === "form" ? (
                    <CreateFieldFormPanel
                        workspaceId={workspaceId}
                        listId={listId}
                        listName={listName}
                        initialType={createFieldType}
                        onBack={() => setCreateFieldStep("picker")}
                        onClose={handleClose}
                    />
                ) : (
                    <div className="flex flex-col flex-1 min-h-0">
                        {/* Header */}
                        <div className="flex flex-col border-b border-zinc-100">
                            <div className="flex items-center justify-between p-4 pb-2">
                                <h3 className="font-semibold text-zinc-900">Fields</h3>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900 cursor-pointer" onClick={onOpenManagerModal}>
                                        <Settings className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900" onClick={handleClose}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="px-4 pb-4">
                                <div className="flex items-center gap-2 px-3 h-9 bg-white border border-zinc-200 rounded-md focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all overflow-hidden cursor-text">
                                    <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                                    <Input
                                        variant="ghost"
                                        className="flex-1 h-full border-0 p-0 shadow-none focus-visible:ring-0 text-sm bg-transparent placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus-visible:ring-0"
                                        placeholder="Search Task Fields"
                                        value={tab === "create" ? createFieldSearch : fieldsSearch}
                                        onChange={(e) => tab === "create" ? setCreateFieldSearch(e.target.value) : setFieldsSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex px-4 gap-4">
                                <button type="button" className={cn("pb-2 text-sm font-medium border-b-2 cursor-pointer", tab === "create" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-700")} onClick={() => setTab("create")}>Create new</button>
                                <button type="button" className={cn("pb-2 text-sm font-medium border-b-2 cursor-pointer", tab === "existing" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-700")} onClick={() => setTab("existing")}>Add existing</button>
                            </div>
                        </div>

                        {/* Body */}
                        {tab === "existing" ? (
                            <ScrollArea className="flex-1 min-h-0 p-3 pb-4">
                                {/* Shown */}
                                <div className="flex items-center justify-between mb-1 mt-1 py-2 px-2 -mx-1 rounded-md hover:bg-zinc-100 cursor-pointer group" onClick={() => setShownExpanded(!shownExpanded)}>
                                    <p className="text-xs font-medium text-zinc-500 flex items-center gap-1.5 group-hover:text-zinc-700">
                                        Shown
                                        <svg width="8" height="8" viewBox="0 0 8 8" className={cn("fill-current transition-transform translate-y-[1px]", shownExpanded ? "" : "-rotate-90")}><polygon points="0,0 8,0 4,6" /></svg>
                                    </p>
                                    <span className="text-xs text-blue-600 font-medium">{fieldConfig.filter((f) => visibleColumns.has(f.id)).length}</span>
                                </div>
                                {shownExpanded && (
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => {
                                        const { active, over } = event;
                                        if (over && active.id !== over.id) {
                                            onColumnOrderChange((prev) => {
                                                const oldIndex = prev.indexOf(active.id as string);
                                                const newIndex = prev.indexOf(over.id as string);
                                                if (oldIndex === -1 || newIndex === -1) return prev;
                                                return arrayMove(prev, oldIndex, newIndex);
                                            });
                                        }
                                    }}>
                                        <SortableContext items={columnOrder} strategy={verticalListSortingStrategy}>
                                            <div className="space-y-1 mb-4">
                                                {(() => {
                                                    const nameField = fieldConfig.find((f) => f.id === "name");
                                                    if (!nameField || (fieldsSearch.trim() && !nameField.label.toLowerCase().includes(fieldsSearch.toLowerCase()))) return null;
                                                    return (
                                                        <div className="flex items-center gap-2 py-2 px-2 rounded opacity-60">
                                                            <div className="w-4 h-4 flex items-center justify-center shrink-0">{renderFieldIcon((nameField as any).icon)}</div>
                                                            <span className="text-sm flex-1 text-zinc-400">{nameField.label}</span>
                                                            <Switch checked onCheckedChange={() => { }} disabled className="data-[state=checked]:bg-indigo-500" />
                                                        </div>
                                                    );
                                                })()}
                                                {columnOrder.filter((colId) => {
                                                    if (colId === "name") return false;
                                                    const f = fieldConfig.find((x) => x.id === colId);
                                                    return f && (!fieldsSearch.trim() || f.label.toLowerCase().includes(fieldsSearch.toLowerCase()));
                                                }).map((colId) => {
                                                    const f = fieldConfig.find((x) => x.id === colId);
                                                    if (!f) return null;
                                                    return (
                                                        <SortableFieldRow key={colId} id={colId}>
                                                            <div className="w-4 h-4 flex items-center justify-center shrink-0">
                                                                <GripVertical className="h-4 w-4 text-zinc-300 cursor-grab hidden group-hover:block" />
                                                                <div className="group-hover:hidden flex items-center justify-center">{renderFieldIcon((f as any).icon)}</div>
                                                            </div>
                                                            <span className="text-sm flex-1 text-zinc-800">{f.label}</span>
                                                            <Switch checked={visibleColumns.has(colId)} onCheckedChange={() => toggleColumn(colId)} className="data-[state=checked]:bg-indigo-500" />
                                                        </SortableFieldRow>
                                                    );
                                                })}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                )}

                                {/* Properties */}
                                <div className="border-t border-zinc-100 my-4" />
                                <TooltipProvider>
                                    <Tooltip delayDuration={300}>
                                        <TooltipTrigger asChild>
                                            <div className="flex items-center justify-between mb-1 py-2 px-2 -mx-1 rounded-md hover:bg-zinc-100 cursor-pointer group" onClick={() => setPropertiesExpanded(!propertiesExpanded)}>
                                                <p className="text-xs font-medium text-zinc-500 flex items-center gap-1.5 group-hover:text-zinc-700">
                                                    Properties <svg width="8" height="8" viewBox="0 0 8 8" className={cn("fill-current transition-transform translate-y-[1px]", propertiesExpanded ? "" : "-rotate-90")}><polygon points="0,0 8,0 4,6" /></svg>
                                                </p>
                                                <span className="text-xs text-zinc-500 font-medium">{fieldConfig.filter((f) => !visibleColumns.has(f.id) && !f.isCustom).length}</span>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" align="center" className="bg-zinc-900 text-white border-zinc-800 text-xs py-1.5"><p>Built-in Task Fields available on every task.</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                {propertiesExpanded && (
                                    <div className="space-y-1">
                                        {fieldConfig.filter((f) => !visibleColumns.has(f.id) && !f.isCustom && (!fieldsSearch.trim() || f.label.toLowerCase().includes(fieldsSearch.toLowerCase()))).map((f) => (
                                            <div key={f.id} className="flex items-center justify-between py-2 px-2 rounded hover:bg-zinc-50">
                                                <div className="flex items-center gap-2">{renderFieldIcon((f as any).icon)}<span className="text-sm text-zinc-800">{f.label}</span></div>
                                                <Switch checked={false} onCheckedChange={() => toggleColumn(f.id)} className="data-[state=checked]:bg-indigo-500" />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Custom Fields (used or specific) */}
                                <div className="border-t border-zinc-100 my-4" />
                                <TooltipProvider>
                                    <Tooltip delayDuration={300}>
                                        <TooltipTrigger asChild>
                                            <div className="flex items-center justify-between mb-1 py-2 px-2 -mx-1 rounded-md hover:bg-zinc-100 cursor-pointer group" onClick={() => setCustomFieldsExpanded(!customFieldsExpanded)}>
                                                <p className="text-xs font-medium text-zinc-500 flex items-center gap-1.5 group-hover:text-zinc-700">
                                                    Custom Fields <svg width="8" height="8" viewBox="0 0 8 8" className={cn("fill-current transition-transform translate-y-[1px]", customFieldsExpanded ? "" : "-rotate-90")}><polygon points="0,0 8,0 4,6" /></svg>
                                                </p>
                                                <span className="text-xs text-zinc-500 font-medium">
                                                    {(() => {
                                                        const isWorkspaceContext = !listId && !folderId && !projectId && !spaceId && !teamId;
                                                        const used = fieldConfig.filter((f) => f.isCustom);
                                                        let unused: any[] = [];
                                                        if (isWorkspaceContext) {
                                                            unused = (customFields as any[])?.filter((cf) => !usedCustomFieldIds.has(cf.id)) || [];
                                                        } else {
                                                            unused = (customFields as any[])?.filter((cf) => !usedCustomFieldIds.has(cf.id) && (
                                                                (listId && cf.listId === listId) ||
                                                                (folderId && cf.folderId === folderId) ||
                                                                (projectId && cf.projectId === projectId) ||
                                                                (spaceId && cf.spaceId === spaceId) ||
                                                                (teamId && cf.teamId === teamId)
                                                            )) || [];
                                                        }
                                                        let count = 0;
                                                        used.forEach((f) => { if (!visibleColumns.has(f.id)) count++; });
                                                        unused.forEach((cf) => { if (!visibleColumns.has(cf.id)) count++; });
                                                        return count;
                                                    })()}
                                                </span>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" align="center" className="bg-zinc-900 text-white border-zinc-800 text-xs py-1.5"><p>Custom Task Fields added to tasks on this location.</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                {customFieldsExpanded && (
                                    <div className="space-y-1">
                                        {(() => {
                                            const isWorkspaceContext = !listId && !folderId && !projectId && !spaceId && !teamId;
                                            const used = fieldConfig.filter((f) => f.isCustom);
                                            let unused: any[] = [];
                                            if (isWorkspaceContext) {
                                                unused = (customFields as any[])?.filter((cf) => !usedCustomFieldIds.has(cf.id)) || [];
                                            } else {
                                                unused = (customFields as any[])?.filter((cf) => !usedCustomFieldIds.has(cf.id) && (
                                                    (listId && cf.listId === listId) ||
                                                    (folderId && cf.folderId === folderId) ||
                                                    (projectId && cf.projectId === projectId) ||
                                                    (spaceId && cf.spaceId === spaceId) ||
                                                    (teamId && cf.teamId === teamId)
                                                )) || [];
                                            }

                                            // Deduplicate by id — a field can appear in both `used` and `unused`
                                            // when it matches via both primary location and locations join table.
                                            const seenIds = new Map<string, any>();
                                            for (const f of used) seenIds.set(f.id, f);
                                            for (const cf of unused) {
                                                if (!seenIds.has(cf.id)) {
                                                    seenIds.set(cf.id, {
                                                        id: cf.id,
                                                        label: cf.name,
                                                        icon: getCustomFieldIcon(cf.type),
                                                        isCustom: true,
                                                        customField: cf,
                                                    });
                                                }
                                            }
                                            const allSpecific = Array.from(seenIds.values())
                                                .filter((f) => !visibleColumns.has(f.id) && (!fieldsSearch.trim() || f.label.toLowerCase().includes(fieldsSearch.toLowerCase())));

                                            return allSpecific.map((f) => (
                                                <div key={f.id} className="group/cf flex items-center justify-between py-1.5 px-2 rounded hover:bg-zinc-50">
                                                    <div className="flex items-center gap-2">{renderFieldIcon((f as any).icon)}<span className="text-sm text-zinc-800">{f.label}</span></div>
                                                    <div className="flex items-center gap-2">
                                                        <CustomFieldSettingsPopover 
                                                            field={(f as any).customField} 
                                                            workspaceId={workspaceId!}
                                                            spaceId={spaceId}
                                                            projectId={projectId}
                                                            folderId={folderId}
                                                            listId={listId}
                                                        >
                                                            <button
                                                                type="button"
                                                                className="opacity-0 group-hover/cf:opacity-100 h-6 w-6 rounded-md hover:bg-zinc-200 flex items-center justify-center transition-all cursor-pointer"
                                                            >
                                                                <TooltipProvider>
                                                                    <Tooltip delayDuration={300}>
                                                                        <TooltipTrigger asChild>
                                                                            <div className="h-full w-full flex items-center justify-center">
                                                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                                                            </div>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top" sideOffset={5} className="bg-zinc-900 text-white border-0 text-xs py-1.5 px-2 font-medium">Edit field</TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            </button>
                                                        </CustomFieldSettingsPopover>
                                                        <Switch checked={false} onCheckedChange={() => toggleColumn(f.id)} className="data-[state=checked]:bg-indigo-500" />
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                )}

                                {/* Custom Fields from Workspace (only if not workspace context) */}
                                {(!(!listId && !folderId && !projectId && !spaceId && !teamId)) && (
                                    <>
                                        <div className="border-t border-zinc-100 my-4" />
                                        <TooltipProvider>
                                            <Tooltip delayDuration={300}>
                                                <TooltipTrigger asChild>
                                                    <div className="flex items-center justify-between mb-1 py-2 px-2 -mx-1 rounded-md hover:bg-zinc-100 cursor-pointer group" onClick={() => setWorkspaceCustomFieldsExpanded(!workspaceCustomFieldsExpanded)}>
                                                        <p className="text-xs font-medium text-zinc-500 flex items-center gap-1.5 group-hover:text-zinc-700">
                                                            Workspace Custom Fields <svg width="8" height="8" viewBox="0 0 8 8" className={cn("fill-current transition-transform translate-y-[1px]", workspaceCustomFieldsExpanded ? "" : "-rotate-90")}><polygon points="0,0 8,0 4,6" /></svg>
                                                        </p>
                                                        <span className="text-xs text-zinc-500 font-medium">
                                                            {((customFields as any[])?.filter((cf) => !usedCustomFieldIds.has(cf.id) && cf.locationType === "WORKSPACE" && !visibleColumns.has(cf.id)).length) || 0}
                                                        </span>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" align="center" className="bg-zinc-900 text-white border-zinc-800 text-xs py-1.5"><p>Custom Task Fields created at the Workspace level.</p></TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        {workspaceCustomFieldsExpanded && (
                                            <div className="space-y-1">
                                                {(customFields as any[])?.filter((cf) => !usedCustomFieldIds.has(cf.id) && cf.locationType === "WORKSPACE" && !visibleColumns.has(cf.id) && (!fieldsSearch.trim() || cf.name.toLowerCase().includes(fieldsSearch.toLowerCase()))).map((cf) => {
                                                    const IconComponent = getCustomFieldIcon(cf.type);
                                                    return (
                                                        <div key={cf.id} className="group/cf flex items-center justify-between py-1.5 px-2 rounded hover:bg-zinc-50">
                                                            <div className="flex items-center gap-2">
                                                                {IconComponent && <IconComponent className="h-4 w-4 text-zinc-400 shrink-0" />}
                                                                <span className="text-sm text-zinc-800">{cf.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <CustomFieldSettingsPopover 
                                                                    field={cf} 
                                                                    workspaceId={workspaceId!}
                                                                    spaceId={spaceId}
                                                                    projectId={projectId}
                                                                    folderId={folderId}
                                                                    listId={listId}
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        className="opacity-0 group-hover/cf:opacity-100 h-6 w-6 rounded-md hover:bg-zinc-200 flex items-center justify-center transition-all cursor-pointer"
                                                                    >
                                                                        <TooltipProvider>
                                                                            <Tooltip delayDuration={300}>
                                                                                <TooltipTrigger asChild>
                                                                                    <div className="h-full w-full flex items-center justify-center">
                                                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                                                                    </div>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent side="top" sideOffset={5} className="bg-zinc-900 text-white border-0 text-xs py-1.5 px-2 font-medium">Edit field</TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>
                                                                    </button>
                                                                </CustomFieldSettingsPopover>
                                                                <Switch checked={false} onCheckedChange={() => toggleColumn(cf.id)} className="data-[state=checked]:bg-indigo-500" />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </>
                                )}
                            </ScrollArea>
                        ) : (
                            /* Create new tab */
                            <ScrollArea className="flex-1 min-h-0 p-3 pb-4">
                                {(() => {
                                    const filteredAll = ALL_FIELDS.filter((f) => !createFieldSearch.trim() || f.label.toLowerCase().includes(createFieldSearch.toLowerCase()));
                                    return (
                                        <div className="space-y-0.5">
                                            <div>
                                                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-2 py-1.5">All</p>
                                                <div className="space-y-0.5">
                                                    {filteredAll.map((field) => {
                                                        const Icon = field.icon;
                                                        return (
                                                            <button key={field.id} type="button" onClick={() => { setCreateFieldType(field.type); setCreateFieldStep("form"); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:border-violet-200 hover:bg-violet-50/50 transition-all text-left group cursor-pointer">
                                                                <div className={cn("h-6 w-6 rounded-md flex items-center justify-center transition-all", field.isAi ? "bg-purple-50" : "bg-zinc-100 group-hover:bg-white group-hover:shadow-sm", field.color)}><Icon className="h-3.5 w-3.5" /></div>
                                                                <span className="text-sm text-zinc-900 group-hover:text-violet-900 transition-colors">{field.label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            {filteredAll.length === 0 && <p className="text-sm text-zinc-500 py-6 text-center">No matching field types</p>}
                                        </div>
                                    );
                                })()}
                            </ScrollArea>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
