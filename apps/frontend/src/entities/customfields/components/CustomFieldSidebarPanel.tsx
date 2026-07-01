"use client";

import * as React from "react";
import { PanelRightClose, ChevronDown, Plus, Pencil, Trash2, Search, Briefcase, Folder, List, Layers, Globe, Check, ChevronRight, PlusCircle, MousePointer2, Eye, Lock, X, User } from "lucide-react";
import { SpaceIcon } from "@/entities/spaces/components/SpaceIcon";
import { ProjectIcon } from "@/entities/projects/components/ProjectIcon";
import { WorkspaceIcon } from "@/entities/workspace/components/WorkspaceIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AI_FIELDS, ALL_FIELDS, type FieldTypeOption } from "../../task/constants/fieldTypes";

type SidebarMode = "create" | "edit";

export type CustomFieldSidebarPanelProps = {
    open: boolean;
    onClose: () => void;
    /** Called when the user tries to close with unsaved changes. Parent should show a confirm dialog. */
    onRequestClose?: (hasChanges: boolean) => void;
    workspaceId: string;
    mode: SidebarMode;
    initialType?: FieldTypeOption | null;
    fieldToEdit?: any | null;
    locationLabel?: string | null;
    createContext?: {
        locationType?: "WORKSPACE" | "SPACE" | "PROJECT" | "TEAM" | "FOLDER" | "LIST" | "PERSONAL";
        spaceId?: string | null;
        projectId?: string | null;
        folderId?: string | null;
        listId?: string | null;
        teamId?: string | null;
        workspaceId?: string | null;
    };
    // Shared location data
    workspaces?: any[];
    spaces?: any[];
    projects?: any[];
    folders?: any[];
    lists?: any[];
};

function getTypeOptionByType(type: string | null | undefined) {
    if (!type) return null;
    return [...AI_FIELDS, ...ALL_FIELDS].find((o) => o.type === type) ?? null;
}

function resolveLocation(loc: any, workspaces: any[], spaces: any[], projects: any[], folders: any[], lists: any[]) {
    const maps = {
        WORKSPACE: new Map(workspaces.map(w => [w.id, w])),
        SPACE: new Map(spaces.map(s => [s.id, s])),
        PROJECT: new Map(projects.map(p => [p.id, p])),
        FOLDER: new Map(folders.map(f => [f.id, f])),
        LIST: new Map(lists.map(l => [l.id, l])),
    };

    const type = loc.type as keyof typeof maps;
    const item = maps[type]?.get(loc.id);

    if (type === "WORKSPACE") {
        return { name: item?.name ?? "Workspace", type: "WORKSPACE", icon: WorkspaceIcon, iconColor: "text-indigo-500" };
    }
    if (type === "SPACE") {
        return { name: item?.name ?? "Space", type: "SPACE", icon: SpaceIcon, iconColor: "text-violet-500" };
    }
    if (type === "PROJECT") {
        return { name: item?.name ?? "Project", type: "PROJECT", icon: ProjectIcon, iconColor: "text-indigo-500" };
    }
    if (type === "FOLDER") {
        return { name: item?.name ?? "Folder", type: "FOLDER", icon: Folder, iconColor: "text-zinc-500" };
    }
    if (type === "LIST") {
        return { name: item?.name ?? "List", type: "LIST", icon: List, iconColor: "text-zinc-500" };
    }
    return { name: "Unknown", type: loc.type, icon: Globe, iconColor: "text-zinc-400" };
}

function LocationPickerContent({ onSelect, workspaces, spaces, projects, search, onSearch }: any) {
    const [expandedRows, setExpandedRows] = React.useState<Record<string, boolean>>({});
    const filteredWorkspaces = workspaces.filter((w: any) => !search || w.name.toLowerCase().includes(search.toLowerCase()));

    const toggleRow = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const renderItem = (item: any, type: string, icon: any, indent = false) => {
        return (
            <div
                key={item.id}
                className={cn(
                    "group w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[13px] text-left transition-all cursor-pointer relative",
                    indent && "pl-9",
                    "hover:bg-zinc-100/80 text-zinc-600 hover:text-zinc-900 font-medium"
                )}
                onClick={() => onSelect({ id: item.id, type, name: item.name })}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <div className="h-5 w-5 flex items-center justify-center shrink-0">
                        {icon}
                    </div>
                    <span className="truncate">{item.name}</span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] font-bold bg-violet-600 text-white hover:bg-violet-700 hover:text-white rounded-md opacity-0 group-hover:opacity-100 transition-all shadow-sm shrink-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect({ id: item.id, type, name: item.name });
                    }}
                >
                    Select
                </Button>
            </div>
        );
    };

    return (
        <div className="flex flex-col max-h-[400px]">
            <div className="p-3 border-b border-zinc-100 bg-white sticky top-0 z-10">
                <div className="flex items-center gap-2 px-3 h-9 bg-zinc-50 border border-zinc-200 rounded-lg transition-colors focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10">
                    <Search className="h-3.5 w-3.5 text-zinc-400" />
                    <Input
                        variant="ghost"
                        value={search}
                        onChange={(e) => onSearch(e.target.value)}
                        placeholder="Search destinations..."
                        className="border-0 bg-transparent p-0 h-full focus:outline-none focus:ring-0 text-sm shadow-none"
                    />
                </div>
            </div>
            <div className="overflow-y-auto p-2 space-y-1">
                {filteredWorkspaces.map((ws: any) => {
                    const wsSpaces = spaces.filter((s: any) => s.workspaceId === ws.id);
                    const wsProjects = projects.filter((p: any) => p.workspaceId === ws.id);
                    const hasChildren = wsSpaces.length > 0 || wsProjects.length > 0;
                    const isExpanded = !!expandedRows[ws.id];

                    return (
                        <div key={ws.id} className="space-y-0.5 w-full">
                            <div
                                className="group w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[13px] text-left transition-all cursor-pointer relative hover:bg-zinc-100/80 text-zinc-600 hover:text-zinc-900 font-medium"
                                onClick={() => onSelect({ id: ws.id, type: "WORKSPACE", name: ws.name })}
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="relative flex items-center justify-center h-5 w-5 shrink-0">
                                        {hasChildren && (
                                            <div
                                                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-white shadow-sm border border-zinc-200 rounded-md cursor-pointer z-10 hover:bg-zinc-50 hover:scale-105 active:scale-95"
                                                onClick={(e) => toggleRow(ws.id, e)}
                                            >
                                                {isExpanded ? (
                                                    <ChevronDown className="h-3.5 w-3.5 text-zinc-600" />
                                                ) : (
                                                    <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
                                                )}
                                            </div>
                                        )}
                                        <WorkspaceIcon icon={ws.avatar ?? null} size={18} className="text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                                    </div>
                                    <span className="truncate">{ws.name}</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-[11px] font-bold bg-violet-600 text-white hover:bg-violet-700 hover:text-white rounded-md opacity-0 group-hover:opacity-100 transition-all shadow-sm shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelect({ id: ws.id, type: "WORKSPACE", name: ws.name });
                                    }}
                                >
                                    Select
                                </Button>
                            </div>

                            {(isExpanded || (search && hasChildren)) && (
                                <div className="space-y-0.5">
                                    {wsSpaces.map((space: any) => renderItem(space, "SPACE", <SpaceIcon icon={space.icon} size={16} className="text-violet-500" />, true))}
                                    {wsProjects.map((project: any) => renderItem(project, "PROJECT", <ProjectIcon icon={project.logo} size={16} className="text-indigo-500" />, true))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function normalizeJsonToString(value: unknown) {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    try {
        return JSON.stringify(value);
    } catch {
        return "";
    }
}

export function CustomFieldSidebarPanel({
    open,
    onClose,
    onRequestClose,
    workspaceId,
    mode,
    initialType,
    fieldToEdit,
    locationLabel,
    createContext,
    workspaces = [],
    spaces = [],
    projects = [],
    folders = [],
    lists = [],
}: CustomFieldSidebarPanelProps) {
    const utils = trpc.useUtils();

    const [name, setName] = React.useState("");
    const [description, setDescription] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);

    const [type, setType] = React.useState<string>("TEXT");
    const [defaultValue, setDefaultValue] = React.useState("");

    const [isPinned, setIsPinned] = React.useState(false);
    const [isVisibleToGuests, setIsVisibleToGuests] = React.useState(true);
    const [isRequiredInTasks, setIsRequiredInTasks] = React.useState(false);

    const [visibility, setVisibility] = React.useState<string>("DEFAULT");
    const [selectedMembers, setSelectedMembers] = React.useState<{ id: string, name: string, avatar?: string }[]>([]);
    const [permissionForAdd, setPermissionForAdd] = React.useState("VIEW");
    const [customPermissions, setCustomPermissions] = React.useState([
        { id: "creator", name: "Dat nguyen", role: "creator", permission: "EDIT", avatar: "DN" }
    ]);
    const [isInputFocused, setIsInputFocused] = React.useState(false);

    const mockupWorkspaceMembers = [
        { id: "1", name: "Amy Fisher", avatar: "https://i.pravatar.cc/150?u=amy" },
        { id: "2", name: "Carlos Mendes", avatar: "https://i.pravatar.cc/150?u=carlos" },
        { id: "3", name: "Cass Chan", avatar: "https://i.pravatar.cc/150?u=cass", badge: true },
        { id: "4", name: "Devin Stoker", avatar: "https://i.pravatar.cc/150?u=devin" },
    ];

    const permissionLevels = [
        { value: "EDIT", label: "Can edit", icon: Pencil, description: "Permission to set field values and edit the field definition" },
        { value: "SET", label: "Can set", icon: MousePointer2, description: "Permission to set field values on tasks, but not edit the field definition" },
        { value: "VIEW", label: "Can view", icon: Eye, description: "Read-only permission to view the field on tasks" },
    ];

    // Type picker (popover list selection)
    const [typePickerOpen, setTypePickerOpen] = React.useState(false);
    const [typeSearch, setTypeSearch] = React.useState("");


    const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
        general: true,
        fieldType: true,
        locations: true,
        settings: true,
        permissions: true
    });

    const toggleSection = (id: string) => {
        setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
    };
    const initialSnapshotRef = React.useRef({
        name: "",
        description: "",
        type: "TEXT",
        defaultValue: "",
        isPinned: false,
        isVisibleToGuests: true,
        isRequiredInTasks: false,
    });

    const createField = trpc.customFields.create.useMutation({
        onSuccess: async () => {
            await utils.customFields.list.invalidate({});
            toast.success("Custom field created");
            onClose();
        },
        onError: (err) => toast.error(err.message || "Failed to create field"),
    });

    const updateField = trpc.customFields.update.useMutation({
        onSuccess: async () => {
            await utils.customFields.list.invalidate({});
            toast.success("Custom field updated");
            onClose();
        },
        onError: (err) => toast.error(err.message || "Failed to update field"),
    });

    const [fieldLocations, setFieldLocations] = React.useState<any[]>([]);
    const [destinationPickerOpen, setDestinationPickerOpen] = React.useState(false);
    const [editingLocationIndex, setEditingLocationIndex] = React.useState<number | null>(null);
    const [locSearch, setLocSearch] = React.useState("");

    React.useEffect(() => {
        if (!open) return;
        const f = fieldToEdit;

        if (mode === "create") {
            const baselineType = initialType?.type ?? "TEXT";
            setName("");
            setDescription("");
            setType(baselineType);
            setDefaultValue("");
            setIsPinned(false);
            setIsVisibleToGuests(true);
            setIsRequiredInTasks(false);
            setVisibility("ADMINS");

            initialSnapshotRef.current = {
                name: "",
                description: "",
                type: baselineType,
                defaultValue: "",
                isPinned: false,
                isVisibleToGuests: true,
                isRequiredInTasks: false,
            };
        } else {
            const existingConfig = (f?.config ?? {}) as Record<string, any>;
            const displayType = (existingConfig.fieldType ?? f?.type ?? "TEXT") as string;

            setName(f?.name ?? "");
            setDescription(existingConfig.description ?? "");
            setType(displayType);
            setDefaultValue(normalizeJsonToString(f?.defaultValue));

            setIsPinned(Boolean(existingConfig.pinned ?? f?.isPinned ?? false));
            setIsVisibleToGuests(Boolean(existingConfig.visibleToGuests ?? f?.isVisibleToGuests ?? true));
            setIsRequiredInTasks(Boolean(f?.isRequiredInTasks ?? f?.isRequired ?? false));
            setVisibility(f?.visibility ?? "ADMINS");

            initialSnapshotRef.current = {
                name: f?.name ?? "",
                description: existingConfig.description ?? "",
                type: displayType,
                defaultValue: normalizeJsonToString(f?.defaultValue),
                isPinned: Boolean(existingConfig.pinned ?? f?.isPinned ?? false),
                isVisibleToGuests: Boolean(existingConfig.visibleToGuests ?? f?.isVisibleToGuests ?? true),
                isRequiredInTasks: Boolean(f?.isRequiredInTasks ?? f?.isRequired ?? false),
            };
        }

        // Initialize locations
        const initialLocations: { id: string; type: string }[] = [];
        if (f?.workspaceId) initialLocations.push({ id: f.workspaceId, type: "WORKSPACE" });
        if (f?.spaceId) initialLocations.push({ id: f.spaceId, type: "SPACE" });
        if (f?.projectId) initialLocations.push({ id: f.projectId, type: "PROJECT" });
        if (f?.folderId) initialLocations.push({ id: f.folderId, type: "FOLDER" });
        if (f?.listId) initialLocations.push({ id: f.listId, type: "LIST" });

        if (initialLocations.length === 0 && mode === "edit") {
            initialLocations.push({ id: workspaceId, type: "WORKSPACE" });
        }
        setFieldLocations(initialLocations);

        // Reset the popover state whenever the panel is opened.
        setTypePickerOpen(false);
        setTypeSearch("");
    }, [fieldToEdit, initialType, mode, open, workspaceId]);

    const hasUnsavedChanges =
        name.trim() !== initialSnapshotRef.current.name ||
        description.trim() !== initialSnapshotRef.current.description ||
        type !== initialSnapshotRef.current.type ||
        defaultValue.trim() !== initialSnapshotRef.current.defaultValue ||
        isPinned !== initialSnapshotRef.current.isPinned ||
        isVisibleToGuests !== initialSnapshotRef.current.isVisibleToGuests ||
        isRequiredInTasks !== initialSnapshotRef.current.isRequiredInTasks;

    const requestClose = () => {
        const isSaving = createField.isPending || updateField.isPending;
        if (isSaving) return;
        if (!hasUnsavedChanges) {
            onClose();
            return;
        }
        // Delegate confirm dialog to parent (avoids Radix Dialog portal z-index issues)
        if (onRequestClose) {
            onRequestClose(true);
        } else {
            onClose();
        }
    };



    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("Field name is required");
            return;
        }

        const config: Record<string, any> = {};
        if (description.trim()) config.description = description.trim();

        if (mode === "create") {
            createField.mutate({
                workspaceId: createContext?.workspaceId ?? workspaceId,
                spaceId: createContext?.spaceId ?? undefined,
                projectId: createContext?.projectId ?? undefined,
                folderId: createContext?.folderId ?? undefined,
                listId: createContext?.listId ?? undefined,
                teamId: createContext?.teamId ?? undefined,
                name: name.trim(),
                type,
                applyTo: ["TASK"],
                defaultValue: defaultValue.trim() || undefined,
                config,
                locationType: createContext?.locationType ?? "WORKSPACE",
                isRequired: isRequiredInTasks,
                isPinned,
                isRequiredInTasks,
                isVisibleToGuests,
                visibility: visibility as any,
            });
            return;
        }

        const f = fieldToEdit;
        const existingConfig = (f?.config ?? {}) as Record<string, any>;
        updateField.mutate({
            id: f.id,
            name: name.trim(),
            defaultValue: defaultValue.trim() || undefined,
            isRequired: isRequiredInTasks,
            isPinned,
            isRequiredInTasks,
            isVisibleToGuests,
            visibility: visibility as any,
            config: {
                ...existingConfig,
                description: description.trim() || undefined,
            },
        });
    };

    const currentTypeOption = getTypeOptionByType(type);
    const TypeIcon = currentTypeOption?.icon;

    const filteredAi = AI_FIELDS.filter(
        (f) => !typeSearch.trim() || f.label.toLowerCase().includes(typeSearch.toLowerCase())
    );
    const filteredAll = ALL_FIELDS.filter(
        (f) => !typeSearch.trim() || f.label.toLowerCase().includes(typeSearch.toLowerCase())
    );

    if (!open) return null;

    const savePending = mode === "create" ? createField.isPending : updateField.isPending;

    const visibilityOptions = [
        { value: "DEFAULT", label: "Default", icon: Lock, description: "Inheriting permissions from your Workspace settings" },
        { value: "EDIT", label: "Can edit", icon: Pencil, description: "Users can set field values and edit the field definition" },
        { value: "SET", label: "Can set", icon: MousePointer2, description: "Users can set field values on tasks, but not edit the field definition" },
        { value: "VIEW", label: "Can view", icon: Eye, description: "Users have read-only permission to view the field on tasks" },
        { value: "PRIVATE", label: "Private", icon: Lock, description: "Only people with explicit edit, set, or view permissions can see private Custom Fields. Private Custom Fields are hidden from everyone else." },
    ];

    const isTypeLocked = mode === "edit";

    return (
        <>
            {/* Click-catcher: triggers discard confirmation when there are unsaved changes */}
            <div
                className="absolute top-0 bottom-0 left-0 right-[560px] z-30 bg-black/0"
                onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    requestClose();
                }}
            />

            <div className="absolute top-0 bottom-0 right-0 w-[560px] bg-white border-l border-zinc-200 shadow-xl flex flex-col min-h-0 overflow-hidden z-40">
                {/* Header */}
                <div className="px-6 h-14 border-b border-zinc-100 flex items-center justify-between shrink-0">
                    <h3 className="text-[15px] font-semibold text-zinc-900">
                        {mode === "create" ? "Create field" : "Edit field"}
                    </h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={requestClose}
                        className="h-8 w-8 rounded-full hover:bg-zinc-100 text-zinc-400 group"
                    >
                        <PanelRightClose className="h-4 w-4 group-hover:text-zinc-600 transition-colors" />
                    </Button>
                </div>

                <ScrollArea className="flex-1 min-h-0 !h-auto">
                    <form id="custom-field-sidebar-form" onSubmit={handleSubmit}>
                        {/* General */}
                        <div className="flex border-b border-zinc-100">
                            <div className="w-[110px] shrink-0 pl-6 py-6 pr-2">
                                <span className="text-sm font-semibold text-zinc-700 text-nowrap">General</span>
                            </div>
                            <div className="flex-1 px-6 py-6 space-y-5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="cf-field-name" className="!text-[12px] !font-semibold !text-zinc-500 tracking-wide">
                                        Field name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="cf-field-name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter name..."
                                        className="h-9 border-zinc-200 focus-visible:ring-2 focus-visible:ring-violet-500/20 focus-visible:ring-offset-0 focus-visible:border-violet-400 transition-all text-sm placeholder:text-zinc-400"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="cf-field-description" className="!text-[12px] !font-semibold !text-zinc-500 tracking-wide">
                                        Description <span className="text-zinc-400 font-normal ml-1">(optional)</span>
                                    </Label>
                                    <Textarea
                                        id="cf-field-description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Enter description..."
                                        rows={3}
                                        className="resize-none border-zinc-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-400 transition-all text-sm placeholder:text-zinc-400"
                                    />
                                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                                        View descriptions when hovering over fields in tasks or views
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Field Type */}
                        <div className="flex flex-col border-b border-zinc-100">
                            <button
                                type="button"
                                onClick={() => toggleSection("fieldType")}
                                className="w-full flex items-center px-6 py-4 hover:bg-zinc-50 transition-colors text-left"
                            >
                                <div className="w-[110px] shrink-0 pr-2">
                                    <span className="text-sm font-semibold text-zinc-700">Field Type</span>
                                </div>
                                <div className="flex-1 flex items-center justify-end">
                                    <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform", !expandedSections.fieldType && "-rotate-90")} />
                                </div>
                            </button>

                            {expandedSections.fieldType && (
                                <div className="flex">
                                    <div className="w-[110px] shrink-0" />
                                    <div className="flex-1 px-6 pb-6 pt-0 space-y-5">
                                        <div className="space-y-1.5">
                                            <Label className="!text-[12px] !font-semibold !text-zinc-500 tracking-wide">
                                                Type
                                            </Label>

                                            {isTypeLocked ? (
                                                <div className="flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-600">
                                                    {TypeIcon ? <TypeIcon className="h-4 w-4 text-zinc-500" /> : null}
                                                    <span className="truncate">
                                                        {currentTypeOption?.label ?? type}
                                                    </span>
                                                </div>
                                            ) : (
                                                <Popover open={typePickerOpen} onOpenChange={setTypePickerOpen}>
                                                    <PopoverTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-600 shadow-sm hover:border-zinc-300 cursor-pointer transition-colors focus:outline-none"
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                {TypeIcon ? <TypeIcon className="h-4 w-4 text-zinc-500 shrink-0" /> : null}
                                                                <span className="truncate">
                                                                    {currentTypeOption?.label ?? "Select type"}
                                                                </span>
                                                            </div>
                                                            <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                                                        </button>
                                                    </PopoverTrigger>

                                                    <PopoverContent
                                                        className="w-[300px] max-w-[calc(100vw-2rem)] p-0 flex flex-col overflow-hidden shadow-xl border-zinc-200 z-[100] max-h-[70vh] min-h-0"
                                                        align="end"
                                                    >
                                                        <div className="p-3 border-b border-zinc-100 bg-white shrink-0">
                                                            <div className="flex items-center gap-2.5 px-3 h-9 bg-zinc-50/50 border border-zinc-200 rounded-lg group focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10 transition-all">
                                                                <Input
                                                                    variant="ghost"
                                                                    value={typeSearch}
                                                                    onChange={(e) => setTypeSearch(e.target.value)}
                                                                    placeholder="Search..."
                                                                    className="border-0 bg-transparent p-0 h-full focus:outline-none focus:ring-violet-500/20 focus-visible:ring-violet-500/20 focus-visible:border-violet-400 transition-all shadow-none text-sm placeholder:text-zinc-400"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div
                                                            className="overflow-y-auto flex-1 min-h-0 scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent"
                                                            onWheel={(e) => e.stopPropagation()}
                                                            onPointerDown={(e) => e.stopPropagation()}
                                                        >
                                                            <div className="p-2">
                                                                {filteredAi.length > 0 && (
                                                                    <div className="mb-4">
                                                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-3 py-2">
                                                                            AI Fields
                                                                        </p>
                                                                        <div className="space-y-0.5">
                                                                            {filteredAi.map((opt) => (
                                                                                <button
                                                                                    key={opt.id}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setType(opt.type);
                                                                                        setTypePickerOpen(false);
                                                                                        setTypeSearch("");
                                                                                    }}
                                                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-100 transition-colors text-left group cursor-pointer"
                                                                                >
                                                                                    <div className={cn("h-8 w-8 rounded-md flex items-center justify-center bg-purple-50 transition-colors", opt.color)}>
                                                                                        <opt.icon className="h-4 w-4" />
                                                                                    </div>
                                                                                    <span className="text-sm font-medium text-zinc-900">{opt.label}</span>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                <div>
                                                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-3 py-2">
                                                                        All Fields
                                                                    </p>
                                                                    <div className="space-y-0.5">
                                                                        {filteredAll.map((opt) => (
                                                                            <button
                                                                                key={opt.id}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setType(opt.type);
                                                                                    setTypePickerOpen(false);
                                                                                    setTypeSearch("");
                                                                                }}
                                                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:border-violet-200 hover:bg-violet-50/50 transition-all text-left group cursor-pointer"
                                                                            >
                                                                                <div className={cn(
                                                                                    "h-8 w-8 rounded-md flex items-center justify-center transition-all",
                                                                                    opt.isAi ? "bg-purple-50" : "bg-zinc-100 group-hover:bg-white group-hover:shadow-sm",
                                                                                    opt.color
                                                                                )}>
                                                                                    <opt.icon className="h-4 w-4" />
                                                                                </div>
                                                                                <span className="text-sm font-medium text-zinc-700 group-hover:text-violet-900 transition-colors flex-1">
                                                                                    {opt.label}
                                                                                </span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="cf-default-value" className="!text-[12px] !font-semibold !text-zinc-500 tracking-wide">
                                                Default value
                                            </Label>
                                            <Input
                                                id="cf-default-value"
                                                value={defaultValue}
                                                onChange={(e) => setDefaultValue(e.target.value)}
                                                placeholder="–"
                                                className="h-9 border-zinc-200 focus-visible:ring-2 focus-visible:ring-violet-500/20 focus-visible:ring-offset-0 focus-visible:border-violet-400 transition-all text-sm placeholder:text-zinc-400"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Locations (edit only) */}
                        {mode === "edit" && (
                            <div className="flex flex-col border-b border-zinc-100">
                                <button
                                    type="button"
                                    onClick={() => toggleSection("locations")}
                                    className="w-full flex items-center px-6 py-4 hover:bg-zinc-50 transition-colors text-left"
                                >
                                    <div className="w-[110px] shrink-0 pr-2">
                                        <span className="text-sm font-semibold text-zinc-700">Locations</span>
                                    </div>
                                    <div className="flex-1 flex items-center justify-end">
                                        <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform", !expandedSections.locations && "-rotate-90")} />
                                    </div>
                                </button>

                                {expandedSections.locations && (
                                    <div className="flex">
                                        <div className="w-[110px] shrink-0" />
                                        <div className="flex-1 px-6 pb-6 pt-0 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">{fieldLocations.length} total</span>
                                                <Popover open={destinationPickerOpen && editingLocationIndex === null} onOpenChange={(o) => {
                                                    if (!o) setEditingLocationIndex(null);
                                                    setDestinationPickerOpen(o);
                                                }}>
                                                    <PopoverTrigger asChild>
                                                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-zinc-100 text-zinc-400">
                                                            <Plus className="h-4 w-4" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[300px] p-0 shadow-2xl border-zinc-200 z-[110] overflow-hidden" align="end">
                                                        <LocationPickerContent
                                                            onSelect={(loc: any) => {
                                                                setFieldLocations(prev => [...prev.filter(l => l.id !== loc.id), loc]);
                                                                setDestinationPickerOpen(false);
                                                            }}
                                                            workspaces={workspaces}
                                                            spaces={spaces}
                                                            projects={projects}
                                                            search={locSearch}
                                                            onSearch={setLocSearch}
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>

                                            <div className="space-y-2">
                                                {fieldLocations.map((loc, idx) => {
                                                    const resolved = resolveLocation(loc, workspaces, spaces, projects, folders, lists);
                                                    const LocIcon = resolved.icon;
                                                    return (
                                                        <div key={idx} className="group flex items-center justify-between p-2 rounded-lg border border-zinc-100 bg-zinc-50/50 hover:bg-white hover:border-violet-200 transition-all">
                                                            <div className="flex items-center gap-3">
                                                                <div className={cn("h-8 w-8 rounded-md flex items-center justify-center bg-white border border-zinc-100 shadow-sm", resolved.iconColor)}>
                                                                    <LocIcon className="h-4 w-4" />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[13px] font-medium text-zinc-900">{resolved.name}</span>
                                                                    <span className="text-[11px] text-zinc-400 capitalize">{resolved.type.toLowerCase()}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Popover
                                                                    open={destinationPickerOpen && editingLocationIndex === idx}
                                                                    onOpenChange={(o) => {
                                                                        if (o) setEditingLocationIndex(idx);
                                                                        else if (editingLocationIndex === idx) setEditingLocationIndex(null);
                                                                        setDestinationPickerOpen(o);
                                                                    }}
                                                                >
                                                                    <PopoverTrigger asChild>
                                                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-zinc-100 text-zinc-400">
                                                                            <Pencil className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-[300px] p-0 shadow-2xl border-zinc-200 z-[110] overflow-hidden" align="end">
                                                                        <LocationPickerContent
                                                                            onSelect={(newLoc: any) => {
                                                                                const updated = [...fieldLocations];
                                                                                updated[idx] = newLoc;
                                                                                setFieldLocations(updated);
                                                                                setDestinationPickerOpen(false);
                                                                                setEditingLocationIndex(null);
                                                                            }}
                                                                            workspaces={workspaces}
                                                                            spaces={spaces}
                                                                            projects={projects}
                                                                            search={locSearch}
                                                                            onSearch={setLocSearch}
                                                                        />
                                                                    </PopoverContent>
                                                                </Popover>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 rounded-md hover:bg-red-50 hover:text-red-600 text-zinc-400"
                                                                    onClick={() => setFieldLocations(prev => prev.filter((_, i) => i !== idx))}
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full h-8 px-4 text-xs shadow-none text-zinc-500/80 bg-white border-zinc-200 hover:bg-zinc-100 hover:text-zinc-600 border-dashed"
                                                onClick={() => {
                                                    setEditingLocationIndex(null);
                                                    setDestinationPickerOpen(true);
                                                }}
                                            >
                                                <Plus className="h-3.5 w-3.5 mr-2" />
                                                Add field to location
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Settings */}
                        <div className="flex">
                            <div className="w-[110px] shrink-0 pl-6 py-6 pr-2">
                                <span className="text-sm font-semibold text-zinc-700 text-nowrap">Settings</span>
                            </div>
                            <div className="flex-1 px-6 py-6 space-y-5">
                                {mode === "edit" && (
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-0.5">
                                            <Label className="!text-[13px] !font-medium !text-zinc-500 leading-none !mb-1">
                                                Required in tasks
                                            </Label>
                                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                                                Required custom fields must be filled out when creating tasks.
                                            </p>
                                        </div>
                                        <Switch
                                            id="inline-is-required"
                                            checked={isRequiredInTasks}
                                            onCheckedChange={setIsRequiredInTasks}
                                            className="shrink-0 mt-0.5 cursor-pointer"
                                        />
                                    </div>
                                )}

                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-0.5">
                                        <Label className="!text-[13px] !font-medium !text-zinc-500 leading-none !mb-1">
                                            Pinned
                                        </Label>
                                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                                            Always displayed in Task view, even if empty.
                                        </p>
                                    </div>
                                    <Switch
                                        id="inline-is-pinned"
                                        checked={isPinned}
                                        onCheckedChange={setIsPinned}
                                        className="shrink-0 mt-0.5 cursor-pointer"
                                    />
                                </div>

                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-0.5">
                                        <Label className="!text-[13px] !font-medium !text-zinc-500 leading-none !mb-1">
                                            Visible to guests
                                        </Label>
                                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                                            Show to guests and limited members in the Workspace.
                                        </p>
                                    </div>
                                    <Switch
                                        id="inline-is-visible-to-guests"
                                        checked={isVisibleToGuests}
                                        onCheckedChange={setIsVisibleToGuests}
                                        className="shrink-0 mt-0.5 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Permissions (edit only UI) */}
                        {mode === "edit" && (
                            <div className="flex border-t border-zinc-100">
                                <div className="w-[110px] shrink-0 pl-6 py-6 pr-2">
                                    <span className="text-sm font-semibold text-zinc-700 text-nowrap">Permissions</span>
                                </div>
                                <div className="flex-1 px-6 py-6 space-y-5">
                                    <div className="space-y-1.5">
                                        <div className="space-y-0.5 mb-4">
                                            <Label className="!text-[12px] !font-semibold !text-zinc-500 tracking-wide !mb-1">
                                                Baseline permissions
                                            </Label>
                                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                                                Set the baseline permission level for everyone in the Workspace.
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <button className="group/trigger inline-flex h-fit min-w-[110px] items-center gap-3 border-none bg-transparent hover:bg-zinc-50/50 transition-colors rounded-lg py-1 cursor-pointer focus:outline-none">
                                                        {(() => {
                                                            const opt = visibilityOptions.find(o => o.value === visibility) || visibilityOptions[0];
                                                            const Icon = opt.icon;
                                                            return (
                                                                <>
                                                                    <div className="h-8 w-8 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 group-hover/trigger:bg-white group-hover/trigger:border-zinc-200 transition-all">
                                                                        <Icon className="h-3.5 w-3.5 text-zinc-400 group-hover/trigger:text-zinc-600" />
                                                                    </div>
                                                                    <div className="flex flex-col items-start gap-0">
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="text-[14px] font-normal text-zinc-900 leading-tight">{opt.label}</span>
                                                                            <ChevronDown className="h-3 w-3 text-zinc-400" />
                                                                        </div>
                                                                        {visibility === "PRIVATE" && (
                                                                            <span className="text-[11px] text-zinc-400 leading-tight mt-0.5">
                                                                                Admins can still see and edit custom fields
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </>
                                                            );
                                                        })()}
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[280px] p-1 shadow-2xl border-zinc-200 rounded-xl z-[150]" align="start">
                                                    <div className="space-y-0.5">
                                                        {visibilityOptions.filter(o => o.value !== "PRIVATE").map((o, idx) => (
                                                            <React.Fragment key={o.value}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setVisibility(o.value)}
                                                                    className={cn(
                                                                        "w-full flex items-start gap-3 rounded-lg py-2.5 px-2.5 transition-all text-left group cursor-pointer",
                                                                        visibility === o.value ? "bg-violet-50 text-violet-900" : "hover:bg-zinc-50 text-zinc-600"
                                                                    )}
                                                                >
                                                                    <div className={cn(
                                                                        "mt-0.5 h-7 w-7 rounded-md border flex items-center justify-center shrink-0 transition-all",
                                                                        visibility === o.value
                                                                            ? "bg-white border-violet-200 text-violet-600 shadow-sm"
                                                                            : "bg-zinc-50 border-zinc-100 text-zinc-400 group-hover:bg-white group-hover:border-zinc-200"
                                                                    )}>
                                                                        <o.icon className="h-3.5 w-3.5" />
                                                                    </div>
                                                                    <div className="flex flex-col gap-0 min-w-0">
                                                                        <span className={cn(
                                                                            "text-[13px] font-semibold leading-tight",
                                                                            visibility === o.value ? "text-violet-900" : "text-zinc-800"
                                                                        )}>
                                                                            {o.label}
                                                                        </span>
                                                                        <span className="text-[10px] text-zinc-400 leading-normal line-clamp-2">
                                                                            {o.description}
                                                                        </span>
                                                                    </div>
                                                                </button>
                                                                {o.value === "DEFAULT" && <div className="my-1 border-t border-zinc-100 mx-1" />}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>

                                            {visibility !== "PRIVATE" && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setVisibility("PRIVATE")}
                                                    className="h-7 px-3 border-zinc-200 bg-white text-[11px] font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg shadow-none flex items-center gap-2 transition-all"
                                                >
                                                    <Lock className="h-3 w-3" />
                                                    Make private
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-2">
                                        <div className="space-y-0.5">
                                            <Label className="!text-[12px] !font-semibold !text-zinc-500 tracking-wide">
                                                Custom permissions
                                            </Label>
                                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                                                Override default permissions for specific members or teams.
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <Popover open={isInputFocused} onOpenChange={setIsInputFocused}>
                                                    <PopoverTrigger asChild>
                                                        <div
                                                            className={cn(
                                                                "flex-1 flex items-center h-[36px] bg-white border border-zinc-200 rounded-lg px-2 gap-1.5 transition-all cursor-text overflow-hidden",
                                                                isInputFocused && "ring-2 ring-blue-500/10 border-blue-300"
                                                            )}
                                                            onMouseDown={(e) => {
                                                                // Prevent the div click from stealing focus from input
                                                                if (e.target !== inputRef.current) {
                                                                    e.preventDefault();
                                                                    inputRef.current?.focus();
                                                                }
                                                            }}
                                                        >
                                                            <div className="flex inline-flex items-center gap-1.5 flex-1 min-w-0">                                                                {selectedMembers.slice(0, 2).map(m => (
                                                                <div key={m.id} className="group/pill flex items-center gap-1 bg-zinc-100 border border-zinc-200 rounded px-1.5 h-[24px] max-w-[120px] transition-all hover:bg-zinc-200/50 cursor-pointer shrink-0">
                                                                    <span className="text-[11px] font-medium text-zinc-700 truncate">{m.name}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedMembers(prev => prev.filter(p => p.id !== m.id));
                                                                        }}
                                                                        className="h-4 w-4 flex items-center justify-center rounded-full text-zinc-400 hover:text-red-500 hover:bg-zinc-300/80 transition-all ml-0.5 cursor-pointer"
                                                                    >
                                                                        <X className="h-3 w-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                                {selectedMembers.length > 2 && (
                                                                    <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-1 h-[24px] flex items-center rounded border border-zinc-200 tabular-nums shrink-0">
                                                                        +{selectedMembers.length - 2}
                                                                    </span>
                                                                )}
                                                                <input
                                                                    placeholder={selectedMembers.length === 0 ? "Add members or teams" : ""}
                                                                    className="flex-1 bg-transparent border-none w-full outline-none text-sm placeholder:text-zinc-400 min-w-[30px] h-full cursor-text"
                                                                    onFocus={() => setIsInputFocused(true)}
                                                                    onBlur={(e) => {
                                                                        if (!e.relatedTarget?.closest('[data-radix-popper-content-wrapper]')) {
                                                                            setIsInputFocused(false);
                                                                        }
                                                                    }}
                                                                />

                                                            </div>
                                                            {selectedMembers.length > 0 && (
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <button className="flex items-center gap-1 text-[12px] font-normal text-zinc-500 hover:text-zinc-900 px-3 border-l border-zinc-100 h-5 shrink-0 transition-colors cursor-pointer focus:outline-none">
                                                                            {permissionLevels.find(p => p.value === permissionForAdd)?.label}
                                                                            <ChevronDown className="h-3 w-3" />
                                                                        </button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-[280px] p-1 shadow-2xl border-zinc-200 rounded-xl z-[160]" align="end">
                                                                        <div className="space-y-0.5">
                                                                            {permissionLevels.map(p => (
                                                                                <button
                                                                                    key={p.value}
                                                                                    type="button"
                                                                                    onClick={() => setPermissionForAdd(p.value)}
                                                                                    className={cn(
                                                                                        "w-full flex items-start gap-3 rounded-lg py-2.5 px-2.5 transition-all text-left group",
                                                                                        permissionForAdd === p.value ? "bg-violet-50" : "hover:bg-zinc-50"
                                                                                    )}
                                                                                >
                                                                                    <div className={cn(
                                                                                        "mt-0.5 h-7 w-7 rounded-md border flex items-center justify-center shrink-0 transition-all",
                                                                                        permissionForAdd === p.value
                                                                                            ? "bg-white border-violet-200 text-violet-600 shadow-sm"
                                                                                            : "bg-zinc-50 border-zinc-100 text-zinc-400 group-hover:bg-white group-hover:border-zinc-200"
                                                                                    )}>
                                                                                        <p.icon className="h-3.5 w-3.5" />
                                                                                    </div>
                                                                                    <div className="flex flex-col gap-0 min-w-0 flex-1">
                                                                                        <div className="flex items-center justify-between">
                                                                                            <span className={cn(
                                                                                                "text-[13px] font-semibold leading-tight",
                                                                                                permissionForAdd === p.value ? "text-violet-900" : "text-zinc-800"
                                                                                            )}>{p.label}</span>
                                                                                            {permissionForAdd === p.value && <Check className="h-3.5 w-3.5 text-violet-600" />}
                                                                                        </div>
                                                                                        <span className="text-[10px] text-zinc-400 leading-normal line-clamp-2">
                                                                                            {p.description}
                                                                                        </span>
                                                                                    </div>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Popover>
                                                            )}

                                                        </div>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[300px] p-1 shadow-2xl border-zinc-200 rounded-xl max-h-[240px] overflow-y-auto" align="start">
                                                        <div className="space-y-0.5">
                                                            {mockupWorkspaceMembers.map(m => {
                                                                const isSelected = selectedMembers.find(s => s.id === m.id);
                                                                return (
                                                                    <button
                                                                        key={m.id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (isSelected) {
                                                                                setSelectedMembers(prev => prev.filter(p => p.id !== m.id));
                                                                            } else {
                                                                                setSelectedMembers(prev => [...prev, m]);
                                                                            }
                                                                        }}
                                                                        className={cn(
                                                                            "w-full flex items-center gap-3 rounded-lg py-2 px-2 hover:bg-zinc-50 transition-colors group text-left cursor-pointer",
                                                                            isSelected && "bg-blue-50/30"
                                                                        )}
                                                                    >
                                                                        <div className="relative">
                                                                            <div className={cn(
                                                                                "h-8 w-8 rounded-full overflow-hidden border shrink-0 transition-all",
                                                                                isSelected ? "border-blue-500 ring-1 ring-blue-500/20" : "border-zinc-100"
                                                                            )}>
                                                                                <img src={m.avatar} alt="" className="w-full h-full object-cover" />
                                                                            </div>
                                                                            {isSelected && (
                                                                                <div className="absolute -bottom-1 -right-1 h-4.5 w-4.5 bg-white rounded-full flex items-center justify-center shadow-md border border-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                                                    <div className="h-3.5 w-3.5 bg-red-500 rounded-full flex items-center justify-center">
                                                                                        <X className="h-2 w-2 text-white stroke-[3px]" />
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                                            <span className={cn(
                                                                                "text-[13px] font-medium truncate transition-colors",
                                                                                isSelected ? "text-blue-600" : "text-zinc-700"
                                                                            )}>{m.name}</span>
                                                                            {m.badge && (
                                                                                <div className="h-3 w-3 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                                                                                    <Check className="h-2 w-2 text-white" />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>

                                                {selectedMembers.length > 0 && (
                                                    <Button
                                                        type="button"
                                                        onClick={() => {
                                                            const newPerms = selectedMembers.map(m => ({
                                                                id: m.id,
                                                                name: m.name,
                                                                avatar: m.id === "1" ? "AF" : m.id === "2" ? "CM" : m.id === "3" ? "CC" : "DS",
                                                                role: "member",
                                                                permission: permissionForAdd
                                                            }));
                                                            setCustomPermissions(prev => [prev[0], ...newPerms, ...prev.slice(1)]);
                                                            setSelectedMembers([]);
                                                            setIsInputFocused(false);
                                                        }}
                                                        disabled={selectedMembers.length === 0}
                                                        className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md shadow-blue-600/20 transition-all text-[12px] shrink-0 cursor-pointer"
                                                    >
                                                        Add
                                                    </Button>
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                {customPermissions.map(p => (
                                                    <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 transition-colors group">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0",
                                                                p.role === "creator" ? "bg-zinc-700" : "bg-blue-500"
                                                            )}>
                                                                {p.avatar || p.name.split(" ").map(n => n[0]).join("")}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[13px] font-medium text-zinc-900">{p.name}</span>
                                                                {p.role === "creator" && (
                                                                    <span className="px-1.5 py-0.5 rounded bg-violet-50 text-[10px] font-semibold text-violet-600 uppercase tracking-tight">creator</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center">
                                                            <div className="w-[100px] flex justify-end">
                                                                {p.role === "creator" ? (
                                                                    <div className="flex items-center gap-1.5 px-2 py-1 text-zinc-400 cursor-default opacity-60">
                                                                        <span className="text-[12px] font-medium">{permissionLevels.find(pl => pl.value === p.permission)?.label}</span>
                                                                        <ChevronDown className="h-3 w-3" />
                                                                    </div>
                                                                ) : (
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <button className="flex items-center gap-1.5 px-2 py-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100/50 transition-all cursor-pointer focus:outline-none">
                                                                                <span className="text-[12px] font-medium">{permissionLevels.find(pl => pl.value === p.permission)?.label}</span>
                                                                                <ChevronDown className="h-3 w-3" />
                                                                            </button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-[280px] p-1 shadow-2xl border-zinc-200 rounded-xl z-[150]" align="end">
                                                                            <div className="space-y-0.5">
                                                                                {permissionLevels.map(pl => (
                                                                                    <button
                                                                                        key={pl.value}
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setCustomPermissions(prev => prev.map(item => item.id === p.id ? { ...item, permission: pl.value } : item));
                                                                                        }}
                                                                                        className={cn(
                                                                                            "w-full flex items-start gap-3 rounded-lg py-2.5 px-2.5 transition-all text-left group",
                                                                                            p.permission === pl.value ? "bg-violet-50" : "hover:bg-zinc-50"
                                                                                        )}
                                                                                    >
                                                                                        <div className={cn(
                                                                                            "mt-0.5 h-7 w-7 rounded-md border flex items-center justify-center shrink-0 transition-all",
                                                                                            p.permission === pl.value
                                                                                                ? "bg-white border-violet-200 text-violet-600 shadow-sm"
                                                                                                : "bg-zinc-50 border-zinc-100 text-zinc-400 group-hover:bg-white group-hover:border-zinc-200"
                                                                                        )}>
                                                                                            <pl.icon className="h-3.5 w-3.5" />
                                                                                        </div>
                                                                                        <div className="flex flex-col gap-0 min-w-0 flex-1">
                                                                                            <div className="flex items-center justify-between">
                                                                                                <span className={cn(
                                                                                                    "text-[13px] font-semibold leading-tight",
                                                                                                    p.permission === pl.value ? "text-violet-900" : "text-zinc-800"
                                                                                                )}>{pl.label}</span>
                                                                                                {p.permission === pl.value && <Check className="h-3.5 w-3.5 text-violet-600" />}
                                                                                            </div>
                                                                                            <span className="text-[10px] text-zinc-400 leading-normal line-clamp-2">
                                                                                                {pl.description}
                                                                                            </span>
                                                                                        </div>
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                )}
                                                            </div>
                                                            <div className="w-8 flex justify-center ml-1">
                                                                {p.role !== "creator" && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setCustomPermissions(prev => prev.filter(item => item.id !== p.id))}
                                                                        className="p-1.5 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {mode === "edit" && (
                            <div className="flex border-t border-zinc-100 bg-red-50/5">
                                <div className="w-[110px] shrink-0 pl-6 py-6 pr-2">
                                    <span className="text-sm font-semibold text-red-600 text-nowrap">Danger Zone</span>
                                </div>
                                <div className="flex-1 px-6 py-6">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[14px] font-normal text-zinc-700 leading-none">Delete Custom Field</p>
                                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                                                {name || "This field"} is used in {fieldLocations.length} locations
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            className="h-8 px-4 bg-red-500 hover:bg-red-600 text-[12px] font-bold shadow-md shadow-red-500/20"
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </form>
                </ScrollArea>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-zinc-100 bg-white flex items-center justify-end gap-3 shrink-0 mt-auto">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={requestClose}
                        className="h-9 px-5 border-zinc-200 hover:bg-zinc-50 text-sm text-zinc-600 transition-colors"
                    >
                        Cancel
                    </Button>
                    <Button
                        form="custom-field-sidebar-form"
                        type="submit"
                        disabled={savePending || !name.trim()}
                        className="h-9 px-6 bg-violet-500 hover:bg-violet-600 text-white shadow-md shadow-violet-500/20 transition-all text-sm font-semibold"
                    >
                        {savePending ? (mode === "create" ? "Creating..." : "Saving...") : mode === "create" ? "Create field" : "Save"}
                    </Button>
                </div>
            </div>


        </>
    );
}

