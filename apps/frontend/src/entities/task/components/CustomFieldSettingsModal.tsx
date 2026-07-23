'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Type, Check, ChevronDown, ChevronUp, Lock, Trash2, X, Info, MousePointer2, Eye, Pencil, Network, Briefcase, Building2, ListChecks, Folder as FolderIconLucide } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FIELD_TYPE_DROPDOWN_OPTIONS } from '../constants/fieldTypes';
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

const PERMISSION_OPTIONS = [
    { value: 'workspace', label: 'Workspace default', description: 'Inherit permissions from your Workspace settings' },
    { value: 'anyone_edit', label: 'Anyone can edit', description: 'Can view and edit the field definition' },
    { value: 'anyone_set', label: 'Anyone can set', description: 'Can set field values on tasks, but not edit the field definition' },
    { value: 'anyone_view', label: 'Anyone can view', description: 'Read-only permissions to view the field on tasks' },
    { value: 'private', label: 'Private', description: 'Only you and invited members have access' },
];

function PermissionIcon({ value, className }: { value: string; className?: string }) {
    if (value === 'workspace') return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" /><path d="M12 8v4l3 3" /></svg>
    );
    if (value === 'anyone_edit') return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
    );
    if (value === 'anyone_set') return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93A10 10 0 0 0 2 12a10 10 0 0 0 17.07 7.07" /></svg>
    );
    if (value === 'anyone_view') return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
    );
    return <Lock className={className} />;
}


interface CustomFieldSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    field: {
        id: string;
        name: string;
        type: string;
        config?: { description?: string; fieldType?: string; permissionLevel?: string } | null;
        isRequired?: boolean;
        isPinned?: boolean;
        isVisibleToGuests?: boolean;
        visibility?: string;
    };
    workspaceId: string;
    taskId: string;
    onSuccess?: () => void;
    /** The entity name this field belongs to */
    contextName?: string;
    /** The kind of entity: space, project, team, list, folder */
    contextKind?: 'space' | 'project' | 'team' | 'list' | 'folder';
}

export function CustomFieldSettingsModal({
    open,
    onOpenChange,
    field,
    workspaceId,
    taskId,
    onSuccess,
    contextName,
    contextKind,
}: CustomFieldSettingsModalProps) {
    const [name, setName] = React.useState(field.name);
    const [description, setDescription] = React.useState(
        (field.config as { description?: string } | null)?.description ?? ''
    );
    const [nameError, setNameError] = React.useState(false);

    // More settings
    const [showMore, setShowMore] = React.useState(false);
    const [permission, setPermission] = React.useState(
        (field.config as any)?.permissionLevel ?? 'workspace'
    );
    const [permissionOpen, setPermissionOpen] = React.useState(false);
    const [isRequired, setIsRequired] = React.useState(field.isRequired ?? false);
    const [isPinned, setIsPinned] = React.useState(field.isPinned ?? false);
    const [isVisibleToGuests, setIsVisibleToGuests] = React.useState(field.isVisibleToGuests ?? true);

    const nameInputRef = React.useRef<HTMLInputElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Exceptions state
    const [selectedMembers, setSelectedMembers] = React.useState<{ id: string; name: string; avatar?: string; badge?: boolean }[]>([]);
    const [permissionForAdd, setPermissionForAdd] = React.useState('VIEW');
    const [customPermissions, setCustomPermissions] = React.useState([
        { id: 'creator', name: 'You', role: 'creator', permission: 'EDIT', avatar: '' }
    ]);
    const [isInputFocused, setIsInputFocused] = React.useState(false);
    const [showAddException, setShowAddException] = React.useState(false);

    const permissionLevels = [
        { value: 'EDIT', label: 'Can edit', icon: Pencil, description: 'Permission to set field values and edit the field definition' },
        { value: 'SET', label: 'Can set', icon: MousePointer2, description: 'Permission to set field values on tasks, but not edit the field definition' },
        { value: 'VIEW', label: 'Can view', icon: Eye, description: 'Read-only permission to view the field on tasks' },
    ];

    const utils = trpc.useUtils();

    const { data: workspaceData } = trpc.workspace.get.useQuery({ id: workspaceId }, { enabled: open && !!workspaceId });
    const { data: teamListData } = trpc.team.list.useQuery({ workspaceId, scope: 'all' as any }, { enabled: open && !!workspaceId });

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
            badge: true
        }));
        return [...users, ...tms];
    }, [workspaceData, teamListData]);

    React.useEffect(() => {
        if (open) {
            setName(field.name);
            setDescription((field.config as { description?: string } | null)?.description ?? '');
            setPermission((field.config as any)?.permissionLevel ?? 'workspace');
            setIsRequired(field.isRequired ?? false);
            setIsPinned(field.isPinned ?? false);
            setIsVisibleToGuests(field.isVisibleToGuests ?? true);
            setNameError(false);
            setShowMore(false);
            setSelectedMembers([]);
            setCustomPermissions([{ id: 'creator', name: 'You', role: 'creator', permission: 'EDIT', avatar: '' }]);
            setShowAddException(false);
            setIsInputFocused(false);
            requestAnimationFrame(() => nameInputRef.current?.select());
        }
    }, [open, field]);

    const updateField = trpc.customFields.update.useMutation({
        onSuccess: () => {
            utils.customFields.list.invalidate({ workspaceId, applyTo: 'TASK' });
            utils.task.get.invalidate({ id: taskId });
            toast.success('Custom field updated');
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (err) => toast.error(err.message || 'Failed to update field'),
    });

    const deleteField = trpc.customFields.delete.useMutation({
        onSuccess: () => {
            utils.customFields.list.invalidate({ workspaceId, applyTo: 'TASK' });
            utils.task.get.invalidate({ id: taskId });
            toast.success('Custom field deleted');
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (err) => toast.error(err.message || 'Failed to delete field'),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setNameError(true);
            nameInputRef.current?.focus();
            return;
        }
        const existingConfig = (field.config as Record<string, unknown>) ?? {};
        updateField.mutate({
            id: field.id,
            name: name.trim(),
            isRequired,
            isPinned,
            isVisibleToGuests,
            visibility: permission === 'private' ? 'PRIVATE' : permission === 'anyone_view' ? 'EVERYONE' : permission === 'anyone_edit' ? 'MEMBERS' : 'ADMINS',
            config: {
                ...existingConfig,
                description: description.trim() || undefined,
                permissionLevel: permission !== 'workspace' ? permission : undefined,
            },
        });
    };

    const displayType = (field.config as { fieldType?: string } | null)?.fieldType ?? field.type;
    const typeOption = FIELD_TYPE_DROPDOWN_OPTIONS.find((o) => o.type === displayType);
    const TypeIcon = typeOption?.icon ?? Type;
    const selectedPermission = PERMISSION_OPTIONS.find(o => o.value === permission) || PERMISSION_OPTIONS[0];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px] gap-0 overflow-hidden p-0 rounded-2xl [&>button]:hidden">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                        <TypeIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <DialogTitle className="text-[13px] font-semibold leading-none tracking-tight text-zinc-900">
                            Field settings
                        </DialogTitle>
                        <p className="mt-1 truncate text-[12px] text-zinc-500">
                            {typeOption?.label ?? displayType} field
                        </p>
                    </div>
                    <button type="button" onClick={() => onOpenChange(false)} className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer shrink-0">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                <ScrollArea className="max-h-[70vh]">
                    <form id="settings-form" onSubmit={handleSubmit}>
                        <div className="space-y-4 px-5 py-5">
                            {/* Name */}
                            <div className="space-y-2">
                                <Label htmlFor="settings-field-name" className="block !text-xs !font-medium !text-zinc-600">
                                    Name <span className="text-red-500 ml-0.5">*</span>
                                </Label>
                                <Input
                                    id="settings-field-name"
                                    ref={nameInputRef}
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        if (nameError) setNameError(false);
                                    }}
                                    placeholder="Enter name..."
                                    aria-invalid={nameError}
                                    className={cn(
                                        'h-9 w-full text-[13px] bg-white border-zinc-200/80 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all',
                                        nameError && 'border-red-500 focus-visible:ring-red-500/30'
                                    )}
                                />
                                {nameError && (
                                    <p className="text-[11px] text-red-500">Give this field a name to continue.</p>
                                )}
                            </div>

                            {/* Type (locked) */}
                            <div className="space-y-2">
                                <Label className="block !text-xs !font-medium !text-zinc-600">Type</Label>
                                <div className="flex h-9 w-full items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50/80 px-3 text-[13px] text-zinc-500">
                                    <TypeIcon className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{typeOption?.label ?? displayType}</span>
                                    <span className="ml-auto shrink-0 text-[10px] text-zinc-400">Locked</span>
                                </div>
                            </div>
                        </div>

                        {/* More settings toggle */}
                        <div className="border-t border-zinc-100">
                            <button
                                type="button"
                                onClick={() => setShowMore(!showMore)}
                                className="w-full flex items-center justify-between px-5 py-3.5 text-[13px] font-semibold text-zinc-800 hover:bg-zinc-50 transition-colors cursor-pointer"
                            >
                                More settings and permissions
                                {showMore ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                            </button>
                        </div>

                        {showMore && (
                            <div className="px-5 pb-5 pt-1 space-y-5">
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
                                        <Button variant="outline" type="button" size="icon" className="h-9 w-10 rounded-lg shrink-0 border-zinc-200 text-zinc-400 hover:text-zinc-600">
                                            <Lock className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Display settings */}
                                <div className="space-y-2">
                                    <Label className="block !text-xs !font-medium !text-zinc-600 !mb-2">Display settings</Label>
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

                                {/* Exceptions */}
                                <div className="space-y-2">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center">
                                            <Label className="block !text-xs !font-medium !text-zinc-600">Exceptions</Label>
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
                                                                        onClick={(e) => { e.stopPropagation(); setSelectedMembers(prev => prev.filter(s => s.id !== m.id)); }}
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
                                                                            setSelectedMembers(prev => prev.filter(s => s.id !== m.id));
                                                                        } else {
                                                                            setSelectedMembers(prev => [...prev, m]);
                                                                        }
                                                                    }}
                                                                    className={cn(
                                                                        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left cursor-pointer transition-colors",
                                                                        isSelected ? "bg-indigo-50" : "hover:bg-zinc-50"
                                                                    )}
                                                                >
                                                                    <div className={cn(
                                                                        "h-[22px] w-[22px] rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0",
                                                                        m.badge ? "bg-indigo-400" : "bg-zinc-700"
                                                                    )}>
                                                                        {m.avatar ? (
                                                                            m.avatar.length > 2 ? <img src={m.avatar} alt="" className="w-full h-full object-cover rounded-full" /> : m.avatar
                                                                        ) : m.name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <span className="text-[13px] text-zinc-700 font-medium flex-1 truncate min-w-0">{m.name}</span>
                                                                    {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
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

                                {/* Belongs to */}
                                <div className="space-y-2">
                                    <Label className="block !text-xs !font-medium !text-zinc-600">Belongs to</Label>
                                    <p className="text-xs text-zinc-500 leading-none mb-3">
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
                    </form>
                </ScrollArea>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/50 px-5 py-3">
                    {/* Delete button */}
                    <TooltipProvider>
                        <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="h-9 w-9 rounded-lg border-red-100 bg-red-50 hover:bg-red-100 hover:border-red-200 text-red-500"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="sm:max-w-[425px] p-6 gap-0">
                                        <div className="flex flex-col mb-4">
                                            <div className="w-10 h-10 rounded-[12px] bg-red-50 border border-red-100 flex items-center justify-center mb-4">
                                                <Trash2 className="h-5 w-5 text-red-500" />
                                            </div>
                                            <AlertDialogHeader className="text-left space-y-2">
                                                <AlertDialogTitle className="text-xl font-bold text-zinc-900">Delete {field.name}?</AlertDialogTitle>
                                                <AlertDialogDescription className="text-[15px] leading-relaxed text-zinc-500">
                                                    This action will delete this Custom Field. Admins are able to restore deleted fields from the Trash.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                        </div>
                                        <AlertDialogFooter className="flex-row gap-3 pt-2">
                                            <AlertDialogCancel className="w-full mt-0 h-10 font-medium border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900">Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                className="w-full h-10 bg-red-500 hover:bg-red-600 text-white font-medium"
                                                onClick={() => deleteField.mutate({ id: field.id })}
                                            >
                                                {deleteField.isPending ? 'Deleting...' : 'Delete'}
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

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-800 hover:bg-zinc-50"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" form="settings-form" size="sm" disabled={updateField.isPending} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white border-0">
                            {updateField.isPending ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}