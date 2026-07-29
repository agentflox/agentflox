'use client';

import * as React from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, ChevronDown, ChevronUp, Lock, Info, Network, Briefcase, Building2, Folder as FolderIconLucide, User, ListChecks, Check, Search, MousePointer2, Eye, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EditCustomRelationshipPopoverProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: any;
    workspaceId: string;
    trigger?: React.ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    /** The entity name this relationship field belongs to (e.g. "Project1", "Space1") */
    contextName?: string;
    /** The kind of entity: space, project, team, list, folder */
    contextKind?: 'space' | 'project' | 'team' | 'list' | 'folder';
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    folderId?: string;
    listId?: string;
    onSuccess?: () => void;
}

export function EditCustomRelationshipPopover({
    open,
    onOpenChange,
    trigger,
    side = 'right',
    align = 'start',
    workspaceId,
    contextName,
    contextKind,
    spaceId,
    projectId,
    teamId,
    folderId,
    listId,
    onSuccess,
    initialData,
}: EditCustomRelationshipPopoverProps) {
    const utils = trpc.useUtils();
    const updateMutation = trpc.taskCustomRelationships.update.useMutation({
        onSuccess: () => {
            utils.taskCustomRelationships.invalidate();
            onSuccess?.();
            onOpenChange(false);
        }
    });

    const deleteMutation = trpc.taskCustomRelationships.delete.useMutation({
        onSuccess: () => {
            utils.taskCustomRelationships.invalidate();
            onSuccess?.();
            onOpenChange(false);
        }
    });

    const [name, setName] = React.useState('');
    const [relatedTo, setRelatedTo] = React.useState('specific');
    const [relatedList, setRelatedList] = React.useState('');
    const [showMore, setShowMore] = React.useState(false);

    const [listPickerOpen, setListPickerOpen] = React.useState(false);
    const [listSearch, setListSearch] = React.useState('');
    const [permissionOpen, setPermissionOpen] = React.useState(false);
    const [permission, setPermission] = React.useState('workspace');

    const inputRef = React.useRef<HTMLInputElement>(null);
    const [selectedMembers, setSelectedMembers] = React.useState<{ id: string, name: string, avatar?: string, badge?: boolean }[]>([]);
    const [permissionForAdd, setPermissionForAdd] = React.useState("VIEW");
    const [customPermissions, setCustomPermissions] = React.useState<any[]>([]);
    const [isInputFocused, setIsInputFocused] = React.useState(false);
    const [showAddException, setShowAddException] = React.useState(false);

    const [createRollupFields, setCreateRollupFields] = React.useState(false);
    const [description, setDescription] = React.useState('');
    const [isRequired, setIsRequired] = React.useState(false);
    const [isVisibleToGuests, setIsVisibleToGuests] = React.useState(true);

    React.useEffect(() => {
        if (open && initialData) {
            setName(initialData.name || '');
            setRelatedTo(initialData.relatedTo || 'specific');
            setRelatedList(initialData.relatedListId || '');
            setPermission(initialData.permissionLevel || 'workspace');
            setCreateRollupFields(initialData.createRollupFields || false);
            setDescription(initialData.description || '');
            setIsRequired(initialData.isRequired || false);
            setIsVisibleToGuests(initialData.isVisibleToGuests ?? true);
            if (initialData.customPermissions) {
                try {
                    setCustomPermissions(typeof initialData.customPermissions === 'string' ? JSON.parse(initialData.customPermissions) : initialData.customPermissions);
                } catch (e) {
                    setCustomPermissions([{ id: "creator", name: "Dat nguyen", role: "creator", permission: "EDIT", avatar: "DN" }]);
                }
            } else {
                setCustomPermissions([{ id: "creator", name: "Dat nguyen", role: "creator", permission: "EDIT", avatar: "DN" }]);
            }
        } else if (open && !initialData) {
            setName('');
            setRelatedTo('specific');
            setRelatedList('');
            setPermission('workspace');
            setCreateRollupFields(false);
            setDescription('');
            setIsRequired(false);
            setIsVisibleToGuests(true);
            setCustomPermissions([{ id: "creator", name: "Dat nguyen", role: "creator", permission: "EDIT", avatar: "DN" }]);
        }
    }, [open, initialData]);

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

    const PERMISSION_OPTIONS = [
        {
            value: 'workspace',
            icon: 'workspace',
            label: 'Workspace default',
            description: 'Inherit permissions from your Workspace settings',
        },
        {
            value: 'anyone_edit',
            icon: 'edit',
            label: 'Anyone can edit',
            description: 'Can view and edit the field definition',
        },
        {
            value: 'anyone_set',
            icon: 'set',
            label: 'Anyone can set',
            description: 'Can set field values on tasks, but not edit the field definition',
        },
        {
            value: 'anyone_view',
            icon: 'view',
            label: 'Anyone can view',
            description: 'Read-only permissions to view the field on tasks',
        },
        {
            value: 'private',
            icon: 'lock',
            label: 'Private',
            description: 'Only you and invited members have access',
        },
    ];
    const selectedPermission = PERMISSION_OPTIONS.find(o => o.value === permission) || PERMISSION_OPTIONS[0];

    const { data: spacesData } = trpc.space.list.useQuery({ workspaceId }, { enabled: open && !!workspaceId });
    const { data: projectsData } = trpc.project.list.useQuery({ workspaceId }, { enabled: open && !!workspaceId });
    const { data: teamsData } = trpc.team.list.useQuery({ workspaceId }, { enabled: open && !!workspaceId });
    const { data: foldersData } = trpc.folder.byContext.useQuery({ workspaceId }, { enabled: open && !!workspaceId });
    const { data: listsData } = trpc.list.byContext.useQuery({ workspaceId }, { enabled: open && !!workspaceId });
    const { data: personalList } = trpc.list.getPersonal.useQuery(undefined, { enabled: open });

    const spaces = spacesData?.items || [];
    const projects = projectsData?.items || [];
    const teams = teamsData?.items || [];
    const folders = foldersData?.items || [];
    const lists = listsData?.items || [];

    const treeNodes = React.useMemo(() => {
        const spaceNodes = spaces.map((space: any) => {
            const spaceId = space.id;

            // Entities directly under this space
            const spaceFolders = folders.filter((f: any) => f.spaceId === spaceId && !f.projectId && !f.teamId);
            const spaceProjects = projects.filter((p: any) => p.spaceId === spaceId);
            const spaceTeams = teams.filter((t: any) => t.spaceId === spaceId);
            const spaceLists = lists.filter((l: any) => l.spaceId === spaceId && !l.projectId && !l.teamId && !l.folderId);

            const children: any[] = [];

            // 1. Folders in space
            spaceFolders.forEach((f: any) => {
                children.push({ kind: 'folder', id: f.id, name: f.name, depth: 1 });
                lists.filter((l: any) => l.folderId === f.id).forEach((l: any) => {
                    children.push({ kind: 'list', id: l.id, name: l.name, depth: 2, count: l._count?.tasks || 0 });
                });
            });

            // 2. Projects in space
            spaceProjects.forEach((p: any) => {
                children.push({ kind: 'project', id: p.id, name: p.name, depth: 1 });

                const projectFolders = folders.filter((f: any) => f.projectId === p.id);
                projectFolders.forEach((f: any) => {
                    children.push({ kind: 'folder', id: f.id, name: f.name, depth: 2 });
                    lists.filter((l: any) => l.folderId === f.id).forEach((l: any) => {
                        children.push({ kind: 'list', id: l.id, name: l.name, depth: 3, count: l._count?.tasks || 0 });
                    });
                });

                lists.filter((l: any) => l.projectId === p.id && !l.folderId).forEach((l: any) => {
                    children.push({ kind: 'list', id: l.id, name: l.name, depth: 2, count: l._count?.tasks || 0 });
                });
            });

            // 3. Teams in space
            spaceTeams.forEach((t: any) => {
                children.push({ kind: 'team', id: t.id, name: t.name, depth: 1 });

                const teamFolders = folders.filter((f: any) => f.teamId === t.id);
                teamFolders.forEach((f: any) => {
                    children.push({ kind: 'folder', id: f.id, name: f.name, depth: 2 });
                    lists.filter((l: any) => l.folderId === f.id).forEach((l: any) => {
                        children.push({ kind: 'list', id: l.id, name: l.name, depth: 3, count: l._count?.tasks || 0 });
                    });
                });

                lists.filter((l: any) => l.teamId === t.id && !l.folderId).forEach((l: any) => {
                    children.push({ kind: 'list', id: l.id, name: l.name, depth: 2, count: l._count?.tasks || 0 });
                });
            });

            // 4. Lists directly in space
            spaceLists.forEach((l: any) => {
                children.push({ kind: 'list', id: l.id, name: l.name, depth: 1, count: l._count?.tasks || 0 });
            });

            return { id: spaceId, name: space.name, children };
        });

        // Root-level projects (no spaceId)
        const rootProjects = projects.filter((p: any) => !p.spaceId);
        const rootTeams = teams.filter((t: any) => !t.spaceId);
        const rootFolders = folders.filter((f: any) => !f.spaceId && !f.projectId && !f.teamId);

        const rootChildren: any[] = [];

        rootFolders.forEach((f: any) => {
            rootChildren.push({ kind: 'folder', id: f.id, name: f.name, depth: 0 });
            lists.filter((l: any) => l.folderId === f.id).forEach((l: any) => {
                rootChildren.push({ kind: 'list', id: l.id, name: l.name, depth: 1, count: l._count?.tasks || 0 });
            });
        });

        rootProjects.forEach((p: any) => {
            rootChildren.push({ kind: 'project', id: p.id, name: p.name, depth: 0 });

            const projectFolders = folders.filter((f: any) => f.projectId === p.id);
            projectFolders.forEach((f: any) => {
                rootChildren.push({ kind: 'folder', id: f.id, name: f.name, depth: 1 });
                lists.filter((l: any) => l.folderId === f.id).forEach((l: any) => {
                    rootChildren.push({ kind: 'list', id: l.id, name: l.name, depth: 2, count: l._count?.tasks || 0 });
                });
            });

            lists.filter((l: any) => l.projectId === p.id && !l.folderId).forEach((l: any) => {
                rootChildren.push({ kind: 'list', id: l.id, name: l.name, depth: 1, count: l._count?.tasks || 0 });
            });
        });

        rootTeams.forEach((t: any) => {
            rootChildren.push({ kind: 'team', id: t.id, name: t.name, depth: 0 });

            const teamFolders = folders.filter((f: any) => f.teamId === t.id);
            teamFolders.forEach((f: any) => {
                rootChildren.push({ kind: 'folder', id: f.id, name: f.name, depth: 1 });
                lists.filter((l: any) => l.folderId === f.id).forEach((l: any) => {
                    rootChildren.push({ kind: 'list', id: l.id, name: l.name, depth: 2, count: l._count?.tasks || 0 });
                });
            });

            lists.filter((l: any) => l.teamId === t.id && !l.folderId).forEach((l: any) => {
                rootChildren.push({ kind: 'list', id: l.id, name: l.name, depth: 1, count: l._count?.tasks || 0 });
            });
        });

        // Root-level lists (no space/project/team/folder)
        lists.filter((l: any) => !l.spaceId && !l.projectId && !l.teamId && !l.folderId).forEach((l: any) => {
            rootChildren.push({ kind: 'list', id: l.id, name: l.name, depth: 0, count: l._count?.tasks || 0 });
        });

        return { spaceNodes, rootChildren };
    }, [spaces, projects, teams, folders, lists]);

    const selectedListName = personalList?.id === relatedList ? 'Personal List' : lists.find((l: any) => l.id === relatedList)?.name || 'Select List...';

    return (
        <Popover modal={true} open={open} onOpenChange={onOpenChange}>
            {trigger && <PopoverTrigger asChild>{trigger}</PopoverTrigger>}
            <PopoverContent
                className="w-[350px] p-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl flex flex-col max-h-[min(560px,var(--radix-popover-content-available-height))]"
                align={align}
                side={side}
                sideOffset={4}
                collisionPadding={16}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 shrink-0">
                    <h4 className="text-[14px] font-semibold text-zinc-900">Edit custom relationship</h4>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-zinc-100 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200" onClick={() => onOpenChange(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-4 space-y-5">
                        <div className="space-y-1.5">
                            <Label className="!text-xs !font-medium !text-zinc-600 !mb-2">
                                Relationship name<span className="text-red-500 ml-0.5">*</span>
                            </Label>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-[10px] border border-red-400 focus-within:ring-[3px] focus-within:ring-red-500/20 transition-all">
                                <span className="text-zinc-500 shrink-0 flex items-center justify-center">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z" /><path d="M15 11a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z" /><path d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2c2.148 0 4.138.677 5.76 1.838" /><path d="M16 2v4" /><path d="M14 4h4" /><path d="M8 16c1.5 1 4.5 1 6 0" /></svg>
                                </span>
                                <input
                                    className="w-full bg-transparent border-none outline-none !text-xs text-zinc-900 placeholder:text-zinc-400 h-5"
                                    placeholder="Enter name..."
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="!text-xs !font-medium !text-zinc-600 !mb-2">Related to</Label>
                            <RadioGroup value={relatedTo} onValueChange={setRelatedTo} className="gap-1">
                                <div className="flex items-center space-x-3">
                                    <RadioGroupItem value="any" id="any" className="h-4 w-4 text-indigo-500 border-zinc-300" />
                                    <Label htmlFor="any" className={cn("!text-xs !font-normal cursor-pointer", relatedTo === 'any' ? "text-zinc-900" : "text-zinc-500")}>any task in your Workspace</Label>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <RadioGroupItem value="specific" id="specific" className="h-4 w-4 text-indigo-500 border-zinc-300" />
                                    <Label htmlFor="specific" className={cn("!text-xs !font-normal cursor-pointer", relatedTo === 'specific' ? "text-zinc-900" : "text-zinc-500")}>tasks from a specific List</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {relatedTo === 'specific' && (
                            <div className="space-y-1.5">
                                <Label className="!text-xs !font-medium !text-zinc-600 !mb-2">
                                    Related List<span className="text-red-500 ml-0.5">*</span>
                                </Label>
                                <Popover open={listPickerOpen} onOpenChange={setListPickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between h-8 font-normal rounded-lg border-zinc-200 text-zinc-500 hover:bg-zinc-50 text-[13px]">
                                            <span className="flex items-center gap-2">
                                                {selectedListName}
                                            </span>
                                            <ChevronDown className="h-4 w-4 text-zinc-400" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[320px] p-0 shadow-lg border-zinc-200" align="start">
                                        <div className="p-2 border-b border-zinc-100">
                                            <div className="flex items-center rounded-md border border-indigo-500 px-2 h-9">
                                                <Search className="size-4 text-zinc-400 shrink-0" />
                                                <input
                                                    value={listSearch}
                                                    onChange={(e) => setListSearch(e.target.value)}
                                                    placeholder="Search..."
                                                    className="w-full bg-transparent px-2 text-[13px] outline-none"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-[320px] overflow-y-auto py-1">
                                            {(!listSearch || "personal list".includes(listSearch.toLowerCase())) && personalList && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setRelatedList(personalList.id); setListPickerOpen(false); }}
                                                    className={cn(
                                                        "w-full flex items-center justify-between py-2 px-3 text-left text-[13px] cursor-pointer hover:bg-zinc-50",
                                                        relatedList === personalList.id && "bg-indigo-50 text-indigo-700"
                                                    )}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <User className="h-4 w-4 text-zinc-400 shrink-0" />
                                                        <span className="font-medium">Personal List</span>
                                                    </span>
                                                    {relatedList === personalList.id && <Check className="h-4 w-4 text-indigo-600 shrink-0" />}
                                                </button>
                                            )}

                                            {treeNodes.spaceNodes.length > 0 && (
                                                <div className="px-3 pt-2 pb-1 text-xs font-semibold text-zinc-400">Spaces</div>
                                            )}

                                            {treeNodes.spaceNodes.filter((s: any) => !listSearch.trim() || s.name.toLowerCase().includes(listSearch.toLowerCase()) || s.children.some((c: any) => c.name.toLowerCase().includes(listSearch.toLowerCase()))).map((space: any) => (
                                                <div key={space.id}>
                                                    <div className="w-full flex items-center py-1.5 px-3 text-left text-[13px]">
                                                        <span className="flex items-center gap-2 text-indigo-500 font-medium">
                                                            <Network className="size-3.5 shrink-0" />
                                                            {space.name}
                                                        </span>
                                                    </div>
                                                    {space.children.filter((c: any) => !listSearch.trim() || c.name.toLowerCase().includes(listSearch.toLowerCase())).map((child: any) => (
                                                        <button
                                                            type="button"
                                                            key={child.id}
                                                            onClick={() => {
                                                                if (child.kind === 'list') {
                                                                    setRelatedList(child.id);
                                                                    setListPickerOpen(false);
                                                                }
                                                            }}
                                                            className={cn(
                                                                "w-full flex items-center justify-between py-1.5 text-left text-[13px] cursor-pointer hover:bg-zinc-50",
                                                                relatedList === child.id && "bg-indigo-50 text-indigo-700",
                                                                child.kind !== 'list' && "opacity-80"
                                                            )}
                                                            style={{ paddingLeft: `${child.depth * 14 + 14}px`, paddingRight: '12px' }}
                                                            disabled={child.kind !== 'list'}
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                {child.kind === "project" && <Briefcase className="size-3.5 text-zinc-400 shrink-0" />}
                                                                {child.kind === "team" && <Building2 className="size-3.5 text-zinc-400 shrink-0" />}
                                                                {child.kind === "folder" && <FolderIconLucide className="size-3.5 text-zinc-400 shrink-0" />}
                                                                {child.kind === "list" && <ListChecks className="size-3.5 text-zinc-400 shrink-0" />}
                                                                <span className={child.kind === 'list' ? '' : 'text-zinc-600'}>{child.name}</span>
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                {child.kind === 'list' && child.count > 0 && <span className="text-[11px] text-zinc-400">{child.count}</span>}
                                                                {relatedList === child.id && <Check className="size-3.5 text-indigo-600 shrink-0" />}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            ))}

                                            {/* Root-level projects/teams/folders/lists */}
                                            {treeNodes.rootChildren.filter((c: any) => !listSearch.trim() || c.name.toLowerCase().includes(listSearch.toLowerCase())).map((child: any) => (
                                                <button
                                                    type="button"
                                                    key={child.id}
                                                    onClick={() => {
                                                        if (child.kind === 'list') {
                                                            setRelatedList(child.id);
                                                            setListPickerOpen(false);
                                                        }
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center justify-between py-1.5 text-left text-[13px] cursor-pointer hover:bg-zinc-50",
                                                        relatedList === child.id && "bg-indigo-50 text-indigo-700",
                                                        child.kind !== 'list' && "opacity-80"
                                                    )}
                                                    style={{ paddingLeft: `${child.depth * 14 + 14}px`, paddingRight: '12px' }}
                                                    disabled={child.kind !== 'list'}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        {child.kind === "project" && <Briefcase className="size-3.5 text-zinc-400 shrink-0" />}
                                                        {child.kind === "team" && <Building2 className="size-3.5 text-zinc-400 shrink-0" />}
                                                        {child.kind === "folder" && <FolderIconLucide className="size-3.5 text-zinc-400 shrink-0" />}
                                                        {child.kind === "list" && <ListChecks className="size-3.5 text-zinc-400 shrink-0" />}
                                                        <span className={child.kind === 'list' ? '' : 'text-zinc-600'}>{child.name}</span>
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        {child.kind === 'list' && child.count > 0 && <span className="text-[11px] text-zinc-400">{child.count}</span>}
                                                        {relatedList === child.id && <Check className="size-3.5 text-indigo-600 shrink-0" />}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}

                        <div className="flex items-center gap-3 pt-1">
                            <Switch checked={createRollupFields} onCheckedChange={setCreateRollupFields} />
                            <Label className="!text-xs !font-normal text-zinc-700 cursor-pointer leading-none !m-0" onClick={() => setCreateRollupFields(!createRollupFields)}>Create rollup fields from related List</Label>
                        </div>
                    </div>

                    <div className="border-t border-zinc-100">
                        <button
                            type="button"
                            onClick={() => setShowMore(!showMore)}
                            className="w-full flex items-center justify-between px-4 py-3.5 text-[13px] font-semibold text-zinc-800 hover:bg-zinc-50 transition-colors cursor-pointer"
                        >
                            More settings and permissions
                            {showMore ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                        </button>
                    </div>

                    {showMore && (
                        <div className="p-4 pt-0 space-y-6">
                            <div className="space-y-1.5">
                                <Label className="!text-xs !font-medium !text-zinc-600 !mb-2">Description</Label>
                                <Textarea
                                    className="min-h-[70px] text-[13px] rounded-lg resize-y border-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-300 placeholder:text-zinc-400"
                                    placeholder="Tell other users how to use this field"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="!text-xs !font-medium !text-zinc-600 !mb-2">Permissions</Label>
                                <div className="flex gap-2">
                                    <Popover open={permissionOpen} onOpenChange={setPermissionOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-full justify-between h-9 rounded-lg text-[13px] font-normal border-zinc-200 text-zinc-800 hover:bg-zinc-50"
                                            >
                                                <span className="flex items-center gap-2">
                                                    {selectedPermission.value === 'workspace' && (
                                                        <svg className="h-4 w-4 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" /><path d="M12 8v4l3 3" /></svg>
                                                    )}
                                                    {selectedPermission.value === 'anyone_edit' && (
                                                        <svg className="h-4 w-4 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                    )}
                                                    {selectedPermission.value === 'anyone_set' && (
                                                        <svg className="h-4 w-4 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93A10 10 0 0 0 2 12a10 10 0 0 0 17.07 7.07" /></svg>
                                                    )}
                                                    {selectedPermission.value === 'anyone_view' && (
                                                        <svg className="h-4 w-4 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                    )}
                                                    {selectedPermission.value === 'private' && (
                                                        <Lock className="h-4 w-4 text-zinc-400 shrink-0" />
                                                    )}
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
                                                        {opt.value === 'workspace' && (
                                                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" /><path d="M12 8v4l3 3" /></svg>
                                                        )}
                                                        {opt.value === 'anyone_edit' && (
                                                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                        )}
                                                        {opt.value === 'anyone_set' && (
                                                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93A10 10 0 0 0 2 12a10 10 0 0 0 17.07 7.07" /></svg>
                                                        )}
                                                        {opt.value === 'anyone_view' && (
                                                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                        )}
                                                        {opt.value === 'private' && (
                                                            <Lock className="h-4 w-4" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className={cn("text-[13px] font-medium", permission === opt.value ? "text-indigo-700" : "text-zinc-900")}>
                                                            {opt.label}
                                                        </div>
                                                        <div className="text-[11.5px] text-zinc-500 mt-0.5 leading-snug">
                                                            {opt.description}
                                                        </div>
                                                    </div>
                                                    {permission === opt.value && (
                                                        <Check className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                                                    )}
                                                </button>
                                            ))}
                                        </PopoverContent>
                                    </Popover>
                                    <Button variant="outline" size="icon" className="h-9 w-10 rounded-lg shrink-0 border-zinc-200 text-zinc-400 hover:text-zinc-600">
                                        <Lock className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="space-y-0.5">
                                    <div className="flex items-center">
                                        <Label className="!text-xs !font-medium !text-zinc-600">Exceptions</Label>
                                        <TooltipProvider delayDuration={300}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Info className="h-3 w-3 text-zinc-400 ml-1 mb-1.5 cursor-help" />
                                                </TooltipTrigger>
                                                <TooltipContent side="top" align="center" className="bg-zinc-900 text-white border-zinc-800 text-[13px] py-2 px-3 font-medium max-w-[300px] text-center z-[200]">
                                                    All users will have the permissions set above. To customize access for certain people, add exceptions below.
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                    <p className="text-[11px] text-zinc-400 leading-none">
                                        Override default permissions for specific members or teams.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1 mt-2">
                                        {customPermissions.map(p => (
                                            <div key={p.id} className="flex items-center justify-between py-1 group">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <div className={cn(
                                                        "h-[22px] w-[22px] rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0",
                                                        p.role === "creator" ? "bg-zinc-900" : "bg-indigo-500"
                                                    )}>
                                                        {p.avatar ? (
                                                            p.avatar.length > 2 ? <img src={p.avatar} alt="" className="w-full h-full object-cover rounded-full" /> : p.avatar
                                                        ) : p.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                        <span className="text-[13px] text-zinc-700 font-medium truncate min-w-0">{p.name}</span>
                                                        {p.role === "creator" && (
                                                            <span className="text-[13px] text-zinc-400 shrink-0">(Creator)</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {p.role === "creator" ? (
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
                                                                            onClick={() => {
                                                                                setCustomPermissions(prev => prev.map(item => item.id === p.id ? { ...item, permission: pl.value } : item));
                                                                            }}
                                                                            className={cn(
                                                                                "w-full flex items-start gap-3 rounded-lg py-2.5 px-2.5 transition-all text-left group cursor-pointer",
                                                                                p.permission === pl.value ? "bg-indigo-50" : "hover:bg-zinc-50"
                                                                            )}
                                                                        >
                                                                            <div className={cn(
                                                                                "mt-0.5 h-7 w-7 rounded-md border flex items-center justify-center shrink-0 transition-all",
                                                                                p.permission === pl.value
                                                                                    ? "bg-white border-indigo-200 text-indigo-600 shadow-sm"
                                                                                    : "bg-zinc-50 border-zinc-100 text-zinc-400 group-hover:bg-white group-hover:border-zinc-200"
                                                                            )}>
                                                                                <pl.icon className="h-3.5 w-3.5" />
                                                                            </div>
                                                                            <div className="flex flex-col gap-0 min-w-0 flex-1">
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className={cn(
                                                                                        "text-[13px] font-semibold leading-tight",
                                                                                        p.permission === pl.value ? "text-indigo-900" : "text-zinc-800"
                                                                                    )}>{pl.label}</span>
                                                                                    {p.permission === pl.value && <Check className="h-3.5 w-3.5 text-indigo-600" />}
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
                                                    <div className="w-6 flex justify-center">
                                                        {p.role !== "creator" && (
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
                                            <Popover open={isInputFocused} onOpenChange={setIsInputFocused}>
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
                                                        <div className="flex inline-flex items-center gap-1.5 flex-1 min-w-0">
                                                            {selectedMembers.slice(0, 2).map(m => (
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
                                                                ref={inputRef}
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
                                                                                    "w-full flex items-start gap-3 rounded-lg py-2.5 px-2.5 transition-all text-left group cursor-pointer",
                                                                                    permissionForAdd === p.value ? "bg-indigo-50" : "hover:bg-zinc-50"
                                                                                )}
                                                                            >
                                                                                <div className={cn(
                                                                                    "mt-0.5 h-7 w-7 rounded-md border flex items-center justify-center shrink-0 transition-all",
                                                                                    permissionForAdd === p.value
                                                                                        ? "bg-white border-indigo-200 text-indigo-600 shadow-sm"
                                                                                        : "bg-zinc-50 border-zinc-100 text-zinc-400 group-hover:bg-white group-hover:border-zinc-200"
                                                                                )}>
                                                                                    <p.icon className="h-3.5 w-3.5" />
                                                                                </div>
                                                                                <div className="flex flex-col gap-0 min-w-0 flex-1">
                                                                                    <div className="flex items-center justify-between">
                                                                                        <span className={cn(
                                                                                            "text-[13px] font-semibold leading-tight",
                                                                                            permissionForAdd === p.value ? "text-indigo-900" : "text-zinc-800"
                                                                                        )}>{p.label}</span>
                                                                                        {permissionForAdd === p.value && <Check className="h-3.5 w-3.5 text-indigo-600" />}
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
                                                <PopoverContent className="w-[300px] p-1 shadow-2xl border-zinc-200 rounded-xl max-h-[240px] overflow-y-auto" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                                                    <div className="space-y-0.5">
                                                        {workspaceMembers.map(m => {
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
                                                                        isSelected && "bg-indigo-50/30"
                                                                    )}
                                                                >
                                                                    <div className="relative">
                                                                        <div className={cn(
                                                                            "h-8 w-8 rounded-full overflow-hidden border shrink-0 transition-all flex items-center justify-center bg-zinc-100 text-xs font-medium text-zinc-600",
                                                                            isSelected ? "border-indigo-500 ring-1 ring-indigo-500/20" : "border-zinc-200"
                                                                        )}>
                                                                            {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full object-cover" /> : m.name.charAt(0).toUpperCase()}
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
                                                                            isSelected ? "text-indigo-600" : "text-zinc-700"
                                                                        )}>{m.name}</span>
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
                                                            avatar: m.avatar,
                                                            role: m.badge ? "team" : "member",
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
                            </div>

                            <div className="space-y-2">
                                <Label className="!text-xs !font-medium !text-zinc-600 !mb-3">Display settings</Label>
                                <div className="flex items-center gap-3">
                                    <Switch checked={isRequired} onCheckedChange={setIsRequired} />
                                    <Label className="!text-xs !font-normal text-zinc-700 cursor-pointer leading-none !m-0" onClick={() => setIsRequired(!isRequired)}>Required in tasks</Label>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Switch checked={isVisibleToGuests} onCheckedChange={setIsVisibleToGuests} className="data-[state=checked]:bg-indigo-500" />
                                    <Label className="!text-xs !font-normal text-zinc-700 cursor-pointer leading-none !m-0" onClick={() => setIsVisibleToGuests(!isVisibleToGuests)}>Visible to Guests and Limited Members</Label>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="!text-xs !font-medium !text-zinc-600">Belongs to</Label>
                                <p className="text-xs text-zinc-500 leading-relaxed mb-3">
                                    Field will exist on all tasks at locations below
                                </p>
                                {contextName ? (
                                    <div className="flex items-center gap-2 pt-1 text-[13px] text-zinc-800">
                                        {contextKind === 'space' && <Network className="h-4 w-4 text-indigo-500 shrink-0" />}
                                        {contextKind === 'project' && <Briefcase className="h-4 w-4 text-zinc-400 shrink-0" />}
                                        {contextKind === 'team' && <Building2 className="h-4 w-4 text-zinc-400 shrink-0" />}
                                        {contextKind === 'list' && <ListChecks className="h-4 w-4 text-zinc-400 shrink-0" />}
                                        {contextKind === 'folder' && <FolderIconLucide className="h-4 w-4 text-zinc-400 shrink-0" />}
                                        {!contextKind && <Network className="h-4 w-4 text-zinc-400 shrink-0" />}
                                        <span className="font-medium">{contextName}</span>
                                    </div>
                                ) : (
                                    <div className="text-[13px] text-zinc-400 italic">No location context available</div>
                                )}
                            </div>

                        </div>
                    )}
                </div>

                {/* Footer outside the scroll area */}
                <div className="flex items-center justify-between p-4 border-t border-zinc-100 bg-white shrink-0">
                    <TooltipProvider>
                        <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-red-100 bg-red-50 hover:bg-red-100 hover:border-red-200 text-red-500">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="sm:max-w-[425px] p-6 gap-0">
                                        <div className="flex flex-col mb-4">
                                            <div className="w-10 h-10 rounded-[12px] bg-red-50 border border-red-100 flex items-center justify-center mb-4">
                                                <Trash2 className="h-5 w-5 text-red-500" />
                                            </div>
                                            <AlertDialogHeader className="text-left space-y-2">
                                                <AlertDialogTitle className="text-xl font-bold text-zinc-900">Delete {name}?</AlertDialogTitle>
                                                <AlertDialogDescription className="text-[15px] leading-relaxed text-zinc-500">
                                                    This action will delete this Custom Field. Admins are able to restore deleted fields from the Trash2.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                        </div>
                                        <AlertDialogFooter className="flex-row gap-3 pt-2">
                                            <AlertDialogCancel className="w-full mt-0 h-10 font-medium border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900">Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                className="w-full h-10 bg-red-500 hover:bg-red-600 text-white font-medium"
                                                onClick={() => {
                                                    if (!initialData?.id) return;
                                                    deleteMutation.mutate({ id: initialData.id });
                                                }}
                                            >
                                                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TooltipTrigger>
                            <TooltipContent className="bg-zinc-900 text-white border-0 font-medium px-3 py-1.5" sideOffset={5}>
                                Delete field from all locations
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 px-4 rounded-lg text-[13px] font-semibold border-zinc-200 text-zinc-600 hover:bg-zinc-50">
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg px-4 h-9 font-medium"
                            disabled={!name || (relatedTo === 'specific' && !relatedList) || updateMutation.isPending || !initialData?.id}
                            onClick={() => {
                                if (!initialData?.id) return;
                                updateMutation.mutate({
                                    id: initialData.id,
                                    name,
                                    relatedTo,
                                    relatedListId: relatedTo === 'specific' ? relatedList : undefined,
                                    createRollupFields,
                                    description,
                                    permissionLevel: permission,
                                    customPermissions,
                                    isRequired,
                                    isVisibleToGuests,
                                });
                            }}
                        >
                            {updateMutation.isPending ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
