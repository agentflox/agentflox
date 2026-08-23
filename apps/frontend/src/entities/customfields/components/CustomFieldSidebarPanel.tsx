"use client";

import * as React from "react";
import { PanelRightClose, ChevronDown, Plus, Pencil, Trash2, Search, Briefcase, Folder, List, Layers, Globe, Check, ChevronRight, PlusCircle, MousePointer2, Eye, Lock, X, User, Users, Play } from "lucide-react";
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
import { ALL_FIELDS, type FieldTypeOption } from "../../task/constants/fieldTypes";
import { CustomFieldConfigForm, useCustomFieldConfigState } from "../../task/components/SharedCustomFieldConfig";
import { Info, ChevronUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    teams?: any[];
};

function getTypeOptionByType(type: string | null | undefined) {
    if (!type) return null;
    return ALL_FIELDS.find((o) => o.type === type) ?? null;
}

function resolveLocation(loc: any, workspaces: any[], spaces: any[], projects: any[], folders: any[], lists: any[], teams: any[] = []) {
    const maps = {
        WORKSPACE: new Map(workspaces.map(w => [w.id, w])),
        SPACE: new Map(spaces.map(s => [s.id, s])),
        PROJECT: new Map(projects.map(p => [p.id, p])),
        FOLDER: new Map(folders.map(f => [f.id, f])),
        LIST: new Map(lists.map(l => [l.id, l])),
        TEAM: new Map(teams.map(t => [t.id, t])),
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
    if (type === "TEAM") {
        return { name: item?.name ?? "Team", type: "TEAM", icon: Users, iconColor: "text-blue-500" };
    }
    return { name: "Unknown", type: loc.type, icon: Globe, iconColor: "text-zinc-400" };
}

function LocationPickerContent({ onSelect, workspaces, spaces, projects, folders, lists, teams, search, onSearch }: any) {
    const [collapsedRows, setCollapsedRows] = React.useState<Record<string, boolean>>({});
    const filteredWorkspaces = workspaces.filter((w: any) => !search || w.name.toLowerCase().includes(search.toLowerCase()));

    const toggleRow = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setCollapsedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const renderItem = (item: any, type: string, icon: any, indentLevel = 1, children: React.ReactNode = null, hasChildren = false, id: string) => {
        const isExpanded = !collapsedRows[id] || !!search;
        return (
            <div key={item.id} className="space-y-0.5 w-full">
                <div
                    className={cn(
                        "group/item w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-left transition-all cursor-pointer relative",
                        indentLevel === 1 && "pl-6",
                        indentLevel === 2 && "pl-10",
                        indentLevel === 3 && "pl-14",
                        "hover:bg-zinc-100/80 text-zinc-600 hover:text-zinc-900 font-medium"
                    )}
                    onClick={() => onSelect({ id: item.id, type, name: item.name })}
                >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="relative flex items-center justify-center h-5 w-5 shrink-0">
                            <span className={cn("flex items-center justify-center", hasChildren && "group-hover/item:hidden")}>
                                {icon}
                            </span>
                            {hasChildren && (
                                <div
                                    className="hidden group-hover/item:flex items-center justify-center h-5 w-5 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors"
                                    onClick={(e) => toggleRow(id, e)}
                                >
                                    <Play className={cn("h-2.5 w-2.5 fill-zinc-700 text-zinc-700 transition-transform duration-200", isExpanded && "rotate-90")} />
                                </div>
                            )}
                        </div>
                        <span className="truncate">{item.name}</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px] font-bold bg-violet-600 text-white hover:bg-violet-700 hover:text-white rounded-md opacity-0 group-hover/item:opacity-100 transition-all shadow-sm shrink-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect({ id: item.id, type, name: item.name });
                        }}
                    >
                        Select
                    </Button>
                </div>
                {isExpanded && children && (
                    <div className="space-y-0.5">
                        {children}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col max-h-[400px]">
            <div className="p-3 border-b border-zinc-100 bg-white sticky top-0 z-10">
                <div className="flex items-center gap-2 px-3 h-8 bg-zinc-50 border border-zinc-200 rounded-lg transition-colors focus-within:border-zinc-400">
                    <Search className="h-3.5 w-3.5 text-zinc-400" />
                    <Input
                        variant="ghost"
                        value={search}
                        onChange={(e) => onSearch(e.target.value)}
                        placeholder="Search destinations..."
                        className="border-0 bg-transparent p-0 h-full focus:outline-none focus:ring-0 text-xs shadow-none"
                    />
                </div>
            </div>
            <div
                className="overflow-y-auto p-2 space-y-1"
                onWheel={(e) => e.stopPropagation()}
            >
                {filteredWorkspaces.map((ws: any) => {
                    const wsTeams = teams?.filter((t: any) => t.workspaceId === ws.id) || [];
                    const wsSpaces = spaces.filter((s: any) => s.workspaceId === ws.id);
                    const wsProjects = projects.filter((p: any) => p.workspaceId === ws.id && !p.spaceId);
                    const wsFolders = folders?.filter((f: any) => f.workspaceId === ws.id && !f.spaceId && !f.projectId) || [];
                    const wsLists = lists?.filter((l: any) => l.workspaceId === ws.id && !l.spaceId && !l.projectId && !l.folderId) || [];

                    const hasChildren = wsTeams.length > 0 || wsSpaces.length > 0 || wsProjects.length > 0 || wsFolders.length > 0 || wsLists.length > 0;
                    const isExpanded = !collapsedRows[ws.id] || !!search;

                    return (
                        <div key={ws.id} className="space-y-0.5 w-full">
                            <div
                                className="group/ws w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-left transition-all cursor-pointer relative hover:bg-zinc-100/80 text-zinc-600 hover:text-zinc-900 font-medium"
                                onClick={() => onSelect({ id: ws.id, type: "WORKSPACE", name: ws.name })}
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="relative flex items-center justify-center h-5 w-5 shrink-0">
                                        <span className={cn("flex items-center justify-center", hasChildren && "group-hover/ws:hidden")}>
                                            <WorkspaceIcon icon={ws.avatar ?? null} size={18} className="text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                                        </span>
                                        {hasChildren && (
                                            <div
                                                className="hidden group-hover/ws:flex items-center justify-center h-5 w-5 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors"
                                                onClick={(e) => toggleRow(ws.id, e)}
                                            >
                                                <Play className={cn("h-2.5 w-2.5 fill-zinc-700 text-zinc-700 transition-transform duration-200", isExpanded && "rotate-90")} />
                                            </div>
                                        )}
                                    </div>
                                    <span className="truncate">{ws.name}</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-[11px] font-bold bg-violet-600 text-white hover:bg-violet-700 hover:text-white rounded-md opacity-0 group-hover/ws:opacity-100 transition-all shadow-sm shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelect({ id: ws.id, type: "WORKSPACE", name: ws.name });
                                    }}
                                >
                                    Select
                                </Button>
                            </div>

                            {isExpanded && (
                                <div className="space-y-0.5">
                                    {wsTeams.map((team: any) => renderItem(
                                        team, "TEAM",
                                        <div className="h-4 w-4 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                                            <Users size={12} className="text-emerald-600" />
                                        </div>,
                                        1, null, false, team.id
                                    ))}
                                    {wsSpaces.map((space: any) => {
                                        const spaceProjects = projects.filter((p: any) => p.spaceId === space.id);
                                        const spaceFolders = folders?.filter((f: any) => f.spaceId === space.id && !f.projectId) || [];
                                        const spaceLists = lists?.filter((l: any) => l.spaceId === space.id && !l.projectId && !l.folderId) || [];

                                        const renderFolder = (folder: any, level: number) => {
                                            const folderLists = lists?.filter((l: any) => l.folderId === folder.id) || [];
                                            const hasFolderChildren = folderLists.length > 0;
                                            return renderItem(
                                                folder, "FOLDER",
                                                <div className="h-4 w-4 rounded bg-blue-50 flex items-center justify-center shrink-0">
                                                    <Folder size={12} className="text-blue-600" />
                                                </div>,
                                                level,
                                                folderLists.map((list: any) => renderItem(
                                                    list, "LIST",
                                                    <div className="h-4 w-4 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                                                        <List size={12} className="text-emerald-600" />
                                                    </div>,
                                                    level + 1, null, false, list.id
                                                )),
                                                hasFolderChildren,
                                                folder.id
                                            );
                                        };

                                        const renderProject = (project: any, level: number) => {
                                            const projectFolders = folders?.filter((f: any) => f.projectId === project.id) || [];
                                            const projectLists = lists?.filter((l: any) => l.projectId === project.id && !l.folderId) || [];
                                            const hasProjChildren = projectFolders.length > 0 || projectLists.length > 0;

                                            return renderItem(
                                                project, "PROJECT",
                                                <div className="h-4 w-4 rounded bg-purple-50 flex items-center justify-center shrink-0">
                                                    <Briefcase size={12} className="text-purple-600" />
                                                </div>,
                                                level,
                                                <>
                                                    {projectFolders.map((f: any) => renderFolder(f, level + 1))}
                                                    {projectLists.map((l: any) => renderItem(
                                                        l, "LIST",
                                                        <div className="h-4 w-4 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                                                            <List size={12} className="text-emerald-600" />
                                                        </div>,
                                                        level + 1, null, false, l.id
                                                    ))}
                                                </>,
                                                hasProjChildren,
                                                project.id
                                            );
                                        };

                                        const hasSpaceChildren = spaceProjects.length > 0 || spaceFolders.length > 0 || spaceLists.length > 0;

                                        return renderItem(
                                            space, "SPACE",
                                            <div className="relative h-4 w-4 rounded shrink-0 flex items-center justify-center">
                                                <span
                                                    className="h-4 w-4 rounded shrink-0 overflow-hidden grid place-items-center bg-indigo-500 text-white"
                                                    style={{ backgroundColor: space.color || "#6366f1" }}
                                                >
                                                    <SpaceIcon icon={space.icon} size={11} className="text-white" fill />
                                                </span>
                                            </div>,
                                            1,
                                            <>
                                                {spaceProjects.map((p: any) => renderProject(p, 2))}
                                                {spaceFolders.map((f: any) => renderFolder(f, 2))}
                                                {spaceLists.map((l: any) => renderItem(
                                                    l, "LIST",
                                                    <div className="h-4 w-4 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                                                        <List size={12} className="text-emerald-600" />
                                                    </div>,
                                                    2, null, false, l.id
                                                ))}
                                            </>,
                                            hasSpaceChildren,
                                            space.id
                                        );
                                    })}
                                    {wsProjects.map((project: any) => {
                                        const projectFolders = folders?.filter((f: any) => f.projectId === project.id) || [];
                                        const projectLists = lists?.filter((l: any) => l.projectId === project.id && !l.folderId) || [];
                                        const hasProjChildren = projectFolders.length > 0 || projectLists.length > 0;
                                        const renderFolder = (folder: any, level: number) => {
                                            const folderLists = lists?.filter((l: any) => l.folderId === folder.id) || [];
                                            const hasFolderChildren = folderLists.length > 0;
                                            return renderItem(
                                                folder, "FOLDER",
                                                <div className="h-4 w-4 rounded bg-blue-50 flex items-center justify-center shrink-0">
                                                    <Folder size={12} className="text-blue-600" />
                                                </div>,
                                                level,
                                                folderLists.map((list: any) => renderItem(
                                                    list, "LIST",
                                                    <div className="h-4 w-4 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                                                        <List size={12} className="text-emerald-600" />
                                                    </div>,
                                                    level + 1, null, false, list.id
                                                )),
                                                hasFolderChildren,
                                                folder.id
                                            );
                                        };
                                        return renderItem(
                                            project, "PROJECT",
                                            <div className="h-4 w-4 rounded bg-purple-50 flex items-center justify-center shrink-0">
                                                <Briefcase size={12} className="text-purple-600" />
                                            </div>,
                                            1,
                                            <>
                                                {projectFolders.map((f: any) => renderFolder(f, 2))}
                                                {projectLists.map((l: any) => renderItem(
                                                    l, "LIST",
                                                    <div className="h-4 w-4 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                                                        <List size={12} className="text-emerald-600" />
                                                    </div>,
                                                    2, null, false, l.id
                                                ))}
                                            </>,
                                            hasProjChildren,
                                            project.id
                                        );
                                    })}
                                    {wsFolders.map((folder: any) => {
                                        const folderLists = lists?.filter((l: any) => l.folderId === folder.id) || [];
                                        const hasFolderChildren = folderLists.length > 0;
                                        return renderItem(
                                            folder, "FOLDER",
                                            <div className="h-4 w-4 rounded bg-blue-50 flex items-center justify-center shrink-0">
                                                <Folder size={12} className="text-blue-600" />
                                            </div>,
                                            1,
                                            folderLists.map((list: any) => renderItem(
                                                list, "LIST",
                                                <div className="h-4 w-4 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                                                    <List size={12} className="text-emerald-600" />
                                                </div>,
                                                2, null, false, list.id
                                            )),
                                            hasFolderChildren,
                                            folder.id
                                        );
                                    })}
                                    {wsLists.map((list: any) => renderItem(
                                        list, "LIST",
                                        <div className="h-4 w-4 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                                            <List size={12} className="text-emerald-600" />
                                        </div>,
                                        1, null, false, list.id
                                    ))}
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
    teams = [],
}: CustomFieldSidebarPanelProps) {
    const utils = trpc.useUtils();

    const [name, setName] = React.useState("");
    const [description, setDescription] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);

    const [type, setType] = React.useState<string>("TEXT");
    const [defaultValue, setDefaultValue] = React.useState("");

    const configState = useCustomFieldConfigState(fieldToEdit?.config);
    const [showMore, setShowMore] = React.useState(false);
    const [permission, setPermission] = React.useState("workspace");
    const [permissionOpen, setPermissionOpen] = React.useState(false);


    const [isPinned, setIsPinned] = React.useState(false);
    const [isVisibleToGuests, setIsVisibleToGuests] = React.useState(true);
    const [isRequiredInTasks, setIsRequiredInTasks] = React.useState(false);

    const [visibility, setVisibility] = React.useState<string>("DEFAULT");
    const [selectedMembers, setSelectedMembers] = React.useState<{ id: string, name: string, avatar?: string, badge?: boolean }[]>([]);
    const [permissionForAdd, setPermissionForAdd] = React.useState("VIEW");
    const [customPermissions, setCustomPermissions] = React.useState([
        { id: "creator", name: "Dat nguyen", role: "creator", permission: "EDIT", avatar: "DN" }
    ]);
    const [isInputFocused, setIsInputFocused] = React.useState(false);
    const [showAddException, setShowAddException] = React.useState(false);

    const { data: workspaceData } = trpc.workspace.get.useQuery({ id: workspaceId }, { enabled: open && !!workspaceId });
    const { data: teamListData } = trpc.team.list.useQuery({ workspaceId, scope: "all" as any }, { enabled: open && !!workspaceId });

    const workspaceMembers = React.useMemo(() => {
        const users = (workspaceData?.members || []).map((m: any) => ({
            id: m.user.id,
            name: m.user.name || m.user.email,
            avatar: m.user.image,
            badge: false
        }));
        const tms = (teamListData?.items || []).map((t: any) => ({
            id: t.id,
            name: t.name,
            avatar: undefined,
            badge: true
        }));
        return [...users, ...tms];
    }, [workspaceData, teamListData]);

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

    const deleteField = trpc.customFields.delete.useMutation({
        onSuccess: async () => {
            await utils.customFields.list.invalidate({});
            toast.success("Custom field deleted");
            onClose();
        },
        onError: (err) => toast.error(err.message || "Failed to delete field"),
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
        if (mode === "edit" && f) {
            if (f.workspaceId) initialLocations.push({ id: f.workspaceId, type: "WORKSPACE" });
            if (f.spaceId) initialLocations.push({ id: f.spaceId, type: "SPACE" });
            if (f.projectId) initialLocations.push({ id: f.projectId, type: "PROJECT" });
            if (f.folderId) initialLocations.push({ id: f.folderId, type: "FOLDER" });
            if (f.listId) initialLocations.push({ id: f.listId, type: "LIST" });
            if (f.teamId) initialLocations.push({ id: f.teamId, type: "TEAM" });

            if (f.locations && Array.isArray(f.locations)) {
                for (const loc of f.locations) {
                    if (loc.workspaceId) initialLocations.push({ id: loc.workspaceId, type: "WORKSPACE" });
                    else if (loc.spaceId) initialLocations.push({ id: loc.spaceId, type: "SPACE" });
                    else if (loc.projectId) initialLocations.push({ id: loc.projectId, type: "PROJECT" });
                    else if (loc.folderId) initialLocations.push({ id: loc.folderId, type: "FOLDER" });
                    else if (loc.listId) initialLocations.push({ id: loc.listId, type: "LIST" });
                    else if (loc.teamId) initialLocations.push({ id: loc.teamId, type: "TEAM" });
                }
            }

            if (initialLocations.length === 0) {
                initialLocations.push({ id: workspaceId!, type: "WORKSPACE" });
            }
        } else if (mode === "create") {
            if (createContext?.locationType) {
                let id: string | null | undefined = null;
                if (createContext.locationType === "WORKSPACE") id = createContext.workspaceId || workspaceId;
                if (createContext.locationType === "SPACE") id = createContext.spaceId;
                if (createContext.locationType === "PROJECT") id = createContext.projectId;
                if (createContext.locationType === "FOLDER") id = createContext.folderId;
                if (createContext.locationType === "LIST") id = createContext.listId;
                if (createContext.locationType === "TEAM") id = createContext.teamId;

                if (id) {
                    initialLocations.push({ id, type: createContext.locationType });
                }
            }
            if (initialLocations.length === 0) {
                initialLocations.push({ id: workspaceId!, type: "WORKSPACE" });
            }
        }
        setFieldLocations(initialLocations);

        // Reset the popover state whenever the panel is opened.
        setTypePickerOpen(false);
        setTypeSearch("");
        setShowMore(false);
        setShowAddException(false);
        setSelectedMembers([]);
        setPermission(
            mode === "edit" && f?.config?.permissionLevel
                ? f.config.permissionLevel
                : "workspace"
        );
        // Reset config state to match the field being opened
        if (mode === "create") {
            configState.resetConfig();
        } else {
            const c = (f?.config ?? {}) as Record<string, any>;
            configState.setOptions(c.options ?? [{ id: 'opt1', name: 'Option 1', color: '#e0e7ff' }, { id: 'opt2', name: 'Option 2', color: '#fce7f3' }]);
            if (c.emojiType !== undefined) configState.setEmojiType(c.emojiType);
            if (c.hideVotedUsers !== undefined) configState.setHideVotedUsers(c.hideVotedUsers);
            if (c.startValue !== undefined) configState.setStartValue(c.startValue);
            if (c.endValue !== undefined) configState.setEndValue(c.endValue);
            if (c.buttonName !== undefined) configState.setButtonName(c.buttonName);
            if (c.buttonColor !== undefined) configState.setButtonColor(c.buttonColor);
            if (c.buttonEmoji !== undefined) configState.setButtonEmoji(c.buttonEmoji);
            if (c.ratingScale !== undefined) configState.setRatingScale(c.ratingScale);
            if (c.currency !== undefined) configState.setCurrency(c.currency);
            if (c.peopleSettings !== undefined) configState.setPeopleSettings(c.peopleSettings);
        }
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
        const isSaving = createField.isPending || updateField.isPending || deleteField.isPending;
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

        const config: Record<string, any> = configState.getConfig(type) || {};
        if (description.trim()) config.description = description.trim();
        if (permission !== 'workspace') config.permissionLevel = permission;

        const primaryLocation = fieldLocations[0] ?? { id: workspaceId, type: "WORKSPACE" };
        const locWorkspaceId = primaryLocation.type === "WORKSPACE" ? primaryLocation.id : (createContext?.workspaceId ?? workspaceId);
        const locSpaceId = primaryLocation.type === "SPACE" ? primaryLocation.id : undefined;
        const locProjectId = primaryLocation.type === "PROJECT" ? primaryLocation.id : undefined;
        const locFolderId = primaryLocation.type === "FOLDER" ? primaryLocation.id : undefined;
        const locListId = primaryLocation.type === "LIST" ? primaryLocation.id : undefined;
        const locTeamId = primaryLocation.type === "TEAM" ? primaryLocation.id : undefined;

        const additionalLocations = fieldLocations.slice(1).map(loc => ({
            workspaceId: loc.type === "WORKSPACE" ? loc.id : (createContext?.workspaceId ?? workspaceId),
            spaceId: loc.type === "SPACE" ? loc.id : undefined,
            projectId: loc.type === "PROJECT" ? loc.id : undefined,
            folderId: loc.type === "FOLDER" ? loc.id : undefined,
            listId: loc.type === "LIST" ? loc.id : undefined,
            teamId: loc.type === "TEAM" ? loc.id : undefined,
            locationType: loc.type as any
        }));

        if (mode === "create") {
            createField.mutate({
                workspaceId: locWorkspaceId,
                spaceId: locSpaceId,
                projectId: locProjectId,
                folderId: locFolderId,
                listId: locListId,
                teamId: locTeamId,
                name: name.trim(),
                type,
                applyTo: ["TASK"],
                defaultValue: defaultValue.trim() || undefined,
                config: Object.keys(config).length ? config : undefined,
                locationType: primaryLocation.type,
                isRequired: isRequiredInTasks,
                isPinned,
                isVisibleToGuests,
                visibility: permission === 'private' ? 'PRIVATE' : permission === 'anyone_view' ? 'EVERYONE' : permission === 'anyone_edit' ? 'MEMBERS' : 'ADMINS',
                additionalLocations,
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
            isVisibleToGuests,
            visibility: permission === 'private' ? 'PRIVATE' : permission === 'anyone_view' ? 'EVERYONE' : permission === 'anyone_edit' ? 'MEMBERS' : 'ADMINS',
            config: {
                ...existingConfig,
                ...configState.getConfig(type),
                description: description.trim() || undefined,
                permissionLevel: permission !== 'workspace' ? permission : undefined,
            },
            additionalLocations,
        });
    };

    const currentTypeOption = getTypeOptionByType(type);
    const TypeIcon = currentTypeOption?.icon;

    const selectedPermission = PERMISSION_OPTIONS.find(o => o.value === permission) || PERMISSION_OPTIONS[0];

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
                className="absolute top-0 bottom-0 left-0 right-[320px] z-30 bg-black/0"
                onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    requestClose();
                }}
            />

            <div className="absolute top-0 bottom-0 right-0 w-[320px] bg-white border-l border-zinc-200 shadow-xl flex flex-col min-h-0 overflow-hidden z-40">
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
                    <form id="custom-field-sidebar-form" onSubmit={handleSubmit} className="flex flex-col h-full">
                        <div className="p-6 space-y-4">
                            {/* Field name */}
                            <div className="space-y-2">
                                <Label htmlFor="field-name" className="block !text-xs !font-medium !text-zinc-600">
                                    Field name <span className="text-red-500 ml-0.5">*</span>
                                </Label>
                                <Input
                                    id="field-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter name..."
                                    className="w-full h-9 bg-white border-zinc-200/80 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all !text-xs"
                                />
                            </div>

                            <CustomFieldConfigForm type={type} state={configState} setType={isTypeLocked ? undefined : setType} />
                        </div>

                        {/* More settings toggle */}
                        <div className="border-t border-zinc-100">
                            <button
                                type="button"
                                onClick={() => setShowMore(!showMore)}
                                className="w-full flex items-center justify-between px-6 py-4 text-[13px] font-semibold text-zinc-800 hover:bg-zinc-50 transition-colors cursor-pointer"
                            >
                                More settings and permissions
                                {showMore ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                            </button>
                        </div>

                        {showMore && (
                            <div className="px-6 pb-6 pt-1 space-y-6">
                                {/* Description */}
                                <div className="space-y-2">
                                    <Label className="block !text-xs !font-medium !text-zinc-600">Description</Label>
                                    <Textarea
                                        className="min-h-[70px] text-[13px] rounded-lg resize-y border-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-300 placeholder:text-zinc-400"
                                        placeholder="Tell other users how to use this field"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                    <p className="text-[11px] text-zinc-400">View descriptions when hovering over fields in tasks or views</p>
                                </div>

                                {/* Permissions */}
                                <div className="space-y-2">
                                    <Label className="block !text-xs !font-medium !text-zinc-600">Permissions</Label>
                                    <div className="flex gap-2">
                                        <Popover open={permissionOpen} onOpenChange={setPermissionOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    type="button"
                                                    className="w-full justify-between h-9 rounded-lg text-[13px] font-normal border-zinc-200 text-zinc-800 hover:bg-zinc-50"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <PermissionIcon value={selectedPermission.value} className="h-4 w-4 text-zinc-400 shrink-0" />
                                                        <span className="font-normal">{selectedPermission.label}</span>
                                                    </span>
                                                    <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[280px] p-1 shadow-lg border-zinc-200 rounded-xl" align="start">
                                                {PERMISSION_OPTIONS.map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => { setPermission(opt.value); setPermissionOpen(false); }}
                                                        className={cn(
                                                            "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left cursor-pointer hover:bg-zinc-50 transition-colors",
                                                            permission === opt.value && "bg-indigo-50"
                                                        )}
                                                    >
                                                        <div className="mt-0.5 shrink-0 text-zinc-400">
                                                            <PermissionIcon value={opt.value} className="h-4 w-4" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className={cn("text-[13px] font-medium", permission === opt.value ? "text-indigo-700" : "text-zinc-900")}>
                                                                {opt.label}
                                                            </div>
                                                            <div className="text-[11.5px] text-zinc-500 mt-0.5 leading-snug">{opt.description}</div>
                                                        </div>
                                                        {permission === opt.value && (
                                                            <Check className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                                                        )}
                                                    </button>
                                                ))}
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                {/* Exceptions */}
                                <div className="space-y-2">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center">
                                            <Label className="!text-xs !font-medium !text-zinc-600">Exceptions</Label>
                                            <TooltipProvider delayDuration={300}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Info className="h-3 w-3 text-zinc-400 ml-1 mb-1.5 cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" align="center" className="bg-zinc-900 text-white border-zinc-800 text-[13px] py-2 px-3 font-medium max-w-[300px] text-center">
                                                        All users will have the permissions set above. To customize access for certain people, add exceptions below.
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <p className="text-[11px] text-zinc-400 leading-none">
                                            Override default permissions for specific members or teams.
                                        </p>
                                    </div>

                                    <div className="space-y-1 mt-2">
                                        {customPermissions.map(p => (
                                            <div key={p.id} className="flex items-center justify-between py-1 group">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <div className={cn(
                                                        "h-[22px] w-[22px] rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0",
                                                        p.role === 'creator' ? 'bg-zinc-900' : 'bg-indigo-500'
                                                    )}>
                                                        {p.avatar ? (
                                                            p.avatar.length > 2 ? <img src={p.avatar} alt="" className="w-full h-full object-cover rounded-full" /> : p.avatar
                                                        ) : p.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                        <span className="text-[13px] text-zinc-700 font-medium truncate min-w-0">{p.name}</span>
                                                        {p.role === 'creator' && (
                                                            <span className="text-[13px] text-zinc-400 shrink-0">(Creator)</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {p.role === 'creator' ? (
                                                        <div className="flex items-center gap-1 text-zinc-600 cursor-default px-2 py-1">
                                                            <span className="text-[13px] font-medium">{permissionLevels.find(pl => pl.value === p.permission)?.label}</span>
                                                            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                                                        </div>
                                                    ) : (
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <button className="flex items-center gap-1 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer focus:outline-none px-2 py-1 rounded hover:bg-zinc-100">
                                                                    <span className="text-[13px] font-medium">{permissionLevels.find(pl => pl.value === p.permission)?.label}</span>
                                                                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                                                                </button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-[280px] p-1 shadow-2xl border-zinc-200 rounded-xl z-[150]" align="end">
                                                                <div className="space-y-0.5">
                                                                    {permissionLevels.map(pl => (
                                                                        <button
                                                                            key={pl.value}
                                                                            type="button"
                                                                            onClick={() => setCustomPermissions(prev => prev.map(item => item.id === p.id ? { ...item, permission: pl.value } : item))}
                                                                            className={cn(
                                                                                "w-full flex items-start gap-3 rounded-lg py-2.5 px-2.5 transition-all text-left group cursor-pointer",
                                                                                p.permission === pl.value ? "bg-indigo-50" : "hover:bg-zinc-50"
                                                                            )}
                                                                        >
                                                                            <div className={cn(
                                                                                "mt-0.5 h-7 w-7 rounded-md border flex items-center justify-center shrink-0 transition-all",
                                                                                p.permission === pl.value ? "bg-white border-indigo-200 text-indigo-600 shadow-sm" : "bg-zinc-50 border-zinc-100 text-zinc-400 group-hover:bg-white group-hover:border-zinc-200"
                                                                            )}>
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
                                                        {p.role !== 'creator' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setCustomPermissions(prev => prev.filter(item => item.id !== p.id))}
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
                                            <Popover
                                                open={isInputFocused}
                                                onOpenChange={(open) => {
                                                    setIsInputFocused(open);
                                                    if (!open && selectedMembers.length === 0) {
                                                        setShowAddException(false);
                                                    }
                                                }}
                                            >
                                                <PopoverTrigger asChild>
                                                    <div
                                                        className={cn(
                                                            "flex-1 flex items-center h-[36px] bg-white border border-zinc-200 rounded-lg px-2 gap-1.5 transition-all cursor-text overflow-hidden",
                                                            isInputFocused && "ring-2 ring-indigo-500/10 border-indigo-300"
                                                        )}
                                                        onMouseDown={(e) => {
                                                            if (e.target !== inputRef.current) {
                                                                e.preventDefault();
                                                                inputRef.current?.focus();
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                            {selectedMembers.slice(0, 2).map(m => (
                                                                <div key={m.id} className="group/pill flex items-center gap-1 bg-zinc-100 border border-zinc-200 rounded px-1.5 h-[24px] max-w-[120px] transition-all hover:bg-zinc-200/50 cursor-pointer shrink-0">
                                                                    <span className="text-[11px] font-medium text-zinc-700 truncate">{m.name}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => { e.stopPropagation(); setSelectedMembers(prev => prev.filter(mp => mp.id !== m.id)); }}
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
                                                                ref={inputRef}
                                                                placeholder={selectedMembers.length === 0 ? 'Add members or teams' : ''}
                                                                className="flex-1 bg-transparent border-none w-full outline-none text-sm placeholder:text-zinc-400 min-w-[30px] h-full cursor-text"
                                                                onFocus={() => setIsInputFocused(true)}
                                                                onBlur={(e) => {
                                                                    if (!e.relatedTarget?.closest('[data-radix-popper-content-wrapper]')) {
                                                                        setIsInputFocused(false);
                                                                        if (selectedMembers.length === 0) {
                                                                            setShowAddException(false);
                                                                        }
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
                                                                                    "w-full flex items-start gap-3 rounded-lg py-2.5 px-2.5 transition-all text-left group cursor-pointer",
                                                                                    permissionForAdd === p.value ? "bg-indigo-50" : "hover:bg-zinc-50"
                                                                                )}
                                                                            >
                                                                                <div className={cn(
                                                                                    "mt-0.5 h-7 w-7 rounded-md border flex items-center justify-center shrink-0 transition-all",
                                                                                    permissionForAdd === p.value ? "bg-white border-indigo-200 text-indigo-600 shadow-sm" : "bg-zinc-50 border-zinc-100 text-zinc-400 group-hover:bg-white group-hover:border-zinc-200"
                                                                                )}>
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
                                                            const isSelected = selectedMembers.find(s => s.id === m.id);
                                                            return (
                                                                <button
                                                                    key={m.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (isSelected) {
                                                                            setSelectedMembers(prev => prev.filter(mp => mp.id !== m.id));
                                                                        } else {
                                                                            setSelectedMembers(prev => [...prev, m]);
                                                                        }
                                                                    }}
                                                                    className={cn(
                                                                        "w-full flex items-center gap-3 rounded-lg py-2 px-2 hover:bg-zinc-50 transition-colors group text-left cursor-pointer",
                                                                        isSelected && "bg-indigo-50/30"
                                                                    )}
                                                                >
                                                                    <div className={cn(
                                                                        "h-8 w-8 rounded-full overflow-hidden border shrink-0 flex items-center justify-center bg-zinc-100 text-xs font-medium text-zinc-600",
                                                                        isSelected ? "border-indigo-500 ring-1 ring-indigo-500/20" : "border-zinc-200"
                                                                    )}>
                                                                        {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full object-cover" /> : m.name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                                        <span className={cn("text-[13px] font-medium truncate", isSelected ? "text-indigo-600" : "text-zinc-700")}>{m.name}</span>
                                                                        {m.badge && (
                                                                            <div className="h-3 w-3 bg-indigo-500 rounded-full flex items-center justify-center shrink-0">
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
                                                            avatar: m.avatar || '',
                                                            role: m.badge ? 'team' : 'member',
                                                            permission: permissionForAdd
                                                        }));
                                                        setCustomPermissions(prev => [prev[0], ...newPerms, ...prev.slice(1)]);
                                                        setSelectedMembers([]);
                                                        setIsInputFocused(false);
                                                        setShowAddException(false);
                                                    }}
                                                    disabled={selectedMembers.length === 0}
                                                    className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md shadow-indigo-600/20 transition-all text-[12px] shrink-0 cursor-pointer"
                                                >
                                                    Add
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <Button
                                            variant="secondary"
                                            type="button"
                                            className="w-full h-8 text-[13px] font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-500"
                                            onClick={() => {
                                                setShowAddException(true);
                                                setTimeout(() => {
                                                    setIsInputFocused(true);
                                                    inputRef.current?.focus();
                                                }, 50);
                                            }}
                                        >
                                            Add exception
                                        </Button>
                                    )}
                                </div>

                                {/* Extra field settings */}
                                <div className="space-y-4 pt-2">
                                    <Label className="block !text-xs !font-medium !text-zinc-600 !mb-2">Display settings</Label>
                                    <div className="flex items-start justify-between gap-4">
                                        <Switch
                                            checked={isRequiredInTasks}
                                            onCheckedChange={setIsRequiredInTasks}
                                            className="data-[state=checked]:bg-indigo-600 mt-1"
                                        />
                                        <div className="flex-1 pr-4">
                                            <Label className="!text-[13px] !font-normal text-zinc-900 !mb-0">Required in tasks</Label>
                                            <p className="text-[11px] text-zinc-500 leading-snug">Require a value when tasks are created</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start justify-between gap-4">
                                        <Switch
                                            checked={isPinned}
                                            onCheckedChange={setIsPinned}
                                            className="data-[state=checked]:bg-indigo-600 mt-1"
                                        />
                                        <div className="flex-1 pr-4">
                                            <Label className="!text-[13px] !font-normal text-zinc-900 !mb-0">Pinned</Label>
                                            <p className="text-[11px] text-zinc-500 leading-snug">Always show in task view, even when empty</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start justify-between gap-4">
                                        <Switch
                                            checked={isVisibleToGuests}
                                            onCheckedChange={setIsVisibleToGuests}
                                            className="data-[state=checked]:bg-indigo-600 mt-1"
                                        />
                                        <div className="flex-1 pr-4">
                                            <Label className="!text-[13px] !font-normal text-zinc-900 !mb-0">Visible to guests</Label>
                                            <p className="text-[11px] text-zinc-500 leading-snug">Allow guests to see this field</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Location / Field belongs to */}
                        <div className="border-t border-zinc-100 flex-1">
                            <div className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <Label className="block !text-[12px] !font-medium !text-zinc-600">
                                        Field belongs to <span className="text-red-500 ml-0.5">*</span>
                                    </Label>
                                </div>
                                <p className="text-sm text-zinc-600 leading-relaxed">
                                    <span className="font-semibold text-zinc-900">{name || 'This field'}</span> will exist on all tasks at locations below, regardless of task type:
                                </p>

                                <div className="space-y-2">
                                    {/* Existing locations list */}
                                    {fieldLocations.length > 0 && (
                                        <div className="space-y-1">
                                            {fieldLocations.map((loc, idx) => {
                                                const resolved = resolveLocation(loc, workspaces, spaces, projects, folders, lists, teams);
                                                const LocIcon = resolved.icon;
                                                const isOnly = fieldLocations.length === 1;
                                                return (
                                                    <div key={idx} className="group flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-zinc-50 transition-all">
                                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                            <div className={cn("h-6 w-6 rounded flex items-center justify-center shrink-0", resolved.iconColor)}>
                                                                <LocIcon className="h-3.5 w-3.5" />
                                                            </div>
                                                            <span className="text-[13px] font-medium text-zinc-800 truncate">{resolved.name}</span>
                                                        </div>

                                                        {/* Hover actions */}
                                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                            {/* Edit / replace location */}
                                                            <Popover
                                                                open={editingLocationIndex === idx}
                                                                onOpenChange={(o) => {
                                                                    setEditingLocationIndex(o ? idx : null);
                                                                    if (!o) setLocSearch("");
                                                                }}
                                                            >
                                                                <TooltipProvider delayDuration={300}>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <PopoverTrigger asChild>
                                                                                <button
                                                                                    type="button"
                                                                                    className="h-6 w-6 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 transition-colors cursor-pointer"
                                                                                >
                                                                                    <Pencil className="h-3 w-3" />
                                                                                </button>
                                                                            </PopoverTrigger>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top" className="bg-zinc-900 text-white border-zinc-800 text-[12px] py-1 px-2">
                                                                            Change location
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                                <PopoverContent onWheelCapture={(e) => e.stopPropagation()} className="w-[300px] p-0 shadow-2xl border-zinc-200 z-[110] overflow-hidden" align="end">
                                                                    <LocationPickerContent
                                                                        onSelect={(newLoc: any) => {
                                                                            setFieldLocations(prev => {
                                                                                const next = [...prev];
                                                                                next[idx] = newLoc;
                                                                                return next;
                                                                            });
                                                                            setEditingLocationIndex(null);
                                                                            setLocSearch("");
                                                                        }}
                                                                        workspaces={workspaces}
                                                                        spaces={spaces}
                                                                        projects={projects}
                                                                        folders={folders}
                                                                        lists={lists}
                                                                        teams={teams}
                                                                        search={locSearch}
                                                                        onSearch={setLocSearch}
                                                                    />
                                                                </PopoverContent>
                                                            </Popover>

                                                            {/* Remove location */}
                                                            <TooltipProvider delayDuration={100}>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <span>
                                                                            <button
                                                                                type="button"
                                                                                disabled={isOnly}
                                                                                onClick={() => !isOnly && setFieldLocations(prev => prev.filter((_, i) => i !== idx))}
                                                                                className={cn(
                                                                                    "h-6 w-6 rounded flex items-center justify-center transition-colors",
                                                                                    isOnly
                                                                                        ? "text-zinc-300 cursor-not-allowed"
                                                                                        : "text-zinc-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                                                                )}
                                                                            >
                                                                                <X className="h-3 w-3" />
                                                                            </button>
                                                                        </span>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="top" className="bg-zinc-900 text-white border-zinc-800 text-[12px] py-1 px-2 max-w-[200px] text-center">
                                                                        {isOnly ? "Fields must exist in at least 1 location" : "Remove location"}
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Add field to location */}
                                    <Popover open={destinationPickerOpen && editingLocationIndex === null} onOpenChange={(o) => {
                                        if (!o) { setLocSearch(""); }
                                        setDestinationPickerOpen(o);
                                    }}>
                                        <PopoverTrigger asChild>
                                            <button
                                                type="button"
                                                className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-500 hover:text-zinc-800 transition-colors px-2 py-1 rounded hover:bg-zinc-100 cursor-pointer"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                Add field to location
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent onWheelCapture={(e) => e.stopPropagation()} className="w-[300px] p-0 shadow-2xl border-zinc-200 z-[110] overflow-hidden" align="start">
                                            <LocationPickerContent
                                                onSelect={(loc: any) => {
                                                    setFieldLocations(prev => [...prev.filter(l => l.id !== loc.id), loc]);
                                                    setDestinationPickerOpen(false);
                                                    setLocSearch("");
                                                }}
                                                workspaces={workspaces}
                                                spaces={spaces}
                                                projects={projects}
                                                folders={folders}
                                                lists={lists}
                                                teams={teams}
                                                search={locSearch}
                                                onSearch={setLocSearch}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 left-0 right-0 p-4 border-t border-zinc-100 bg-white flex items-center justify-between z-10">
                            {mode === "edit" && fieldToEdit?.id ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={deleteField.isPending}
                                    className="h-8 w-8 rounded-md bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 transition-colors"
                                    onClick={() => {
                                        if (confirm(`Delete "${name}"? This cannot be undone.`)) {
                                            deleteField.mutate({ id: fieldToEdit.id });
                                        }
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            ) : <div></div>}

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={requestClose}
                                    className="h-8 px-4 border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-all font-medium text-[13px]"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={savePending || !name.trim()}
                                    className="h-8 px-4 bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm transition-all font-medium border border-transparent text-[13px]"
                                >
                                    {savePending ? 'Saving...' : 'Save'}
                                </Button>
                            </div>
                        </div>
                    </form>
                </ScrollArea>


            </div>
        </>
    );
}

