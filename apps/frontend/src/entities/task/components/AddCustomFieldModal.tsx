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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, ChevronDown, ChevronUp, Lock, Check, X, Info, MousePointer2, Eye, Pencil, ListChecks } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    AI_FIELDS,
    ALL_FIELDS,
    FIELD_TYPE_DROPDOWN_OPTIONS,
    type FieldTypeOption,
} from '../constants/fieldTypes';

const PERMISSION_OPTIONS = [
    {
        value: 'workspace',
        label: 'Workspace default',
        description: 'Inherit permissions from your Workspace settings',
    },
    {
        value: 'anyone_edit',
        label: 'Anyone can edit',
        description: 'Can view and edit the field definition',
    },
    {
        value: 'anyone_set',
        label: 'Anyone can set',
        description: 'Can set field values on tasks, but not edit the field definition',
    },
    {
        value: 'anyone_view',
        label: 'Anyone can view',
        description: 'Read-only permissions to view the field on tasks',
    },
    {
        value: 'private',
        label: 'Private',
        description: 'Only you and invited members have access',
    },
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

interface AddCustomFieldModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceId: string;
    taskId: string;
}

export function AddCustomFieldModal({
    open,
    onOpenChange,
    workspaceId,
    taskId,
}: AddCustomFieldModalProps) {
    const [step, setStep] = React.useState<'picker' | 'form'>('picker');
    const [search, setSearch] = React.useState('');
    const [selectedType, setSelectedType] = React.useState<FieldTypeOption | null>(null);
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [type, setType] = React.useState<string>('TEXT');

    // More settings state
    const [showMore, setShowMore] = React.useState(false);
    const [permission, setPermission] = React.useState('workspace');
    const [permissionOpen, setPermissionOpen] = React.useState(false);
    const [isRequired, setIsRequired] = React.useState(false);
    const [isPinned, setIsPinned] = React.useState(false);
    const [isVisibleToGuests, setIsVisibleToGuests] = React.useState(true);

    // Exceptions state
    const inputRef = React.useRef<HTMLInputElement>(null);
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

    const { data: workspaceData } = trpc.workspace.get.useQuery({ id: workspaceId }, { enabled: open && !!workspaceId });
    const { data: teamListData } = trpc.team.list.useQuery({ workspaceId, scope: 'all' as any }, { enabled: open && !!workspaceId });
    const { data: taskData } = trpc.task.get.useQuery({ id: taskId }, { enabled: open && !!taskId });

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

    const utils = trpc.useUtils();

    const createField = trpc.customFields.create.useMutation({
        onSuccess: () => {
            utils.customFields.list.invalidate({ workspaceId, applyTo: 'TASK' });
            utils.task.get.invalidate({ id: taskId });
            toast.success('Custom field added');
            handleClose();
        },
        onError: (err) => toast.error(err.message || 'Failed to add field'),
    });

    const handleClose = () => {
        onOpenChange(false);
        setStep('picker');
        setSearch('');
        setSelectedType(null);
        setName('');
        setDescription('');
        setType('TEXT');
        setShowMore(false);
        setPermission('workspace');
        setIsRequired(false);
        setIsPinned(false);
        setIsVisibleToGuests(true);
        setSelectedMembers([]);
        setCustomPermissions([{ id: 'creator', name: 'You', role: 'creator', permission: 'EDIT', avatar: '' }]);
        setShowAddException(false);
        setIsInputFocused(false);
    };

    const handleTypeSelect = (field: FieldTypeOption) => {
        setSelectedType(field);
        setType(field.type);
        setStep('form');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Field name is required');
            return;
        }
        const config: Record<string, unknown> = {};
        if (description.trim()) config.description = description.trim();
        if (permission !== 'workspace') config.permissionLevel = permission;
        if (type === 'DROPDOWN' || type === 'CUSTOM_DROPDOWN' || type === 'LABELS' || type === 'CATEGORIZE' || type === 'SENTIMENT' || type === 'TSHIRT_SIZE') {
            config.options = config.options ?? [];
        }
        createField.mutate({
            workspaceId,
            name: name.trim(),
            type,
            applyTo: ['TASK'],
            isRequired,
            isPinned,
            isVisibleToGuests,
            visibility: permission === 'private' ? 'PRIVATE' : permission === 'anyone_view' ? 'EVERYONE' : permission === 'anyone_edit' ? 'MEMBERS' : 'ADMINS',
            config: Object.keys(config).length ? config : undefined,
        });
    };

    const filteredAi = AI_FIELDS.filter(
        (f) => !search.trim() || f.label.toLowerCase().includes(search.toLowerCase())
    );
    const filteredAll = ALL_FIELDS.filter(
        (f) => !search.trim() || f.label.toLowerCase().includes(search.toLowerCase())
    );

    const selectedOption = FIELD_TYPE_DROPDOWN_OPTIONS.find((o) => o.type === type);
    const TypeIcon = selectedOption?.icon;
    const selectedPermission = PERMISSION_OPTIONS.find(o => o.value === permission) || PERMISSION_OPTIONS[0];

    return (
        <>
            {/* Step 1: Type picker modal */}
            <Dialog open={open && step === 'picker'} onOpenChange={(open) => !open && handleClose()}>
                <DialogContent className="sm:max-w-[320px] p-0 gap-0 overflow-hidden [&>button]:hidden shadow-2xl">
                    <DialogTitle className="sr-only">Select field type</DialogTitle>
                    <div className="p-3 border-b border-zinc-100 bg-white">
                        <div className="flex items-center gap-2.5 px-3 h-9 bg-zinc-50/50 border border-zinc-200 rounded-lg group focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/10 transition-all">
                            <Search className="h-4 w-4 text-zinc-400 shrink-0 group-focus-within:text-violet-500 transition-colors" />
                            <Input
                                variant="ghost"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search..."
                                className="border-0 bg-transparent p-0 h-full focus:outline-none focus:ring-0 focus-visible:ring-0 shadow-none text-sm placeholder:text-zinc-400"
                            />
                        </div>
                    </div>

                    <ScrollArea className="max-h-[360px]">
                        <div className="p-2">
                            {filteredAi.length > 0 && (
                                <div className="mb-3">
                                    <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-2 py-1.5">
                                        AI Fields
                                    </p>
                                    <div className="space-y-0.5">
                                        {filteredAi.map((field) => {
                                            const Icon = field.icon;
                                            return (
                                                <button
                                                    key={field.id}
                                                    type="button"
                                                    onClick={() => handleTypeSelect(field)}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:border-violet-200 hover:bg-violet-50/50 transition-all text-left group cursor-pointer"
                                                >
                                                    <div className={cn("h-6 w-6 rounded-md flex items-center justify-center bg-purple-50 group-hover:scale-110 transition-transform", field.color)}>
                                                        <Icon className="h-3.5 w-3.5" />
                                                    </div>
                                                    <span className="text-sm text-zinc-900 group-hover:text-violet-900 transition-colors">{field.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            <div>
                                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-2 py-1.5">
                                    All
                                </p>
                                <div className="space-y-0.5">
                                    {filteredAll.map((field) => {
                                        const Icon = field.icon;
                                        return (
                                            <button
                                                key={field.id}
                                                type="button"
                                                onClick={() => handleTypeSelect(field)}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:border-violet-200 hover:bg-violet-50/50 transition-all text-left group cursor-pointer"
                                            >
                                                <div className={cn("h-6 w-6 rounded-md flex items-center justify-center transition-all", field.isAi ? "bg-purple-50" : "bg-zinc-100 group-hover:bg-white group-hover:shadow-sm", field.color)}>
                                                    <Icon className="h-3.5 w-3.5" />
                                                </div>
                                                <span className="text-sm text-zinc-900 group-hover:text-violet-900 transition-colors">{field.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            {filteredAi.length === 0 && filteredAll.length === 0 && (
                                <p className="text-sm text-zinc-500 py-6 text-center">No matching field types</p>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {/* Step 2: Form modal */}
            <Dialog open={open && step === 'form'} onOpenChange={(isOpen) => !isOpen && handleClose()}>
                <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden [&>button]:hidden shadow-xl rounded-2xl">
                    <DialogTitle className="sr-only">Add custom field</DialogTitle>

                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
                        <div className="flex items-center gap-2.5">
                            {TypeIcon && (
                                <div className="h-7 w-7 rounded-md bg-indigo-50 flex items-center justify-center shrink-0">
                                    <TypeIcon className="h-3.5 w-3.5 text-indigo-600" />
                                </div>
                            )}
                            <h2 className="text-[14px] font-semibold text-zinc-900">Add custom field</h2>
                        </div>
                        <button type="button" onClick={handleClose} className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <ScrollArea className="max-h-[70vh]">
                        <form id="add-field-form" onSubmit={handleSubmit}>
                            <div className="p-5 space-y-4">
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

                                {/* Type */}
                                <div className="space-y-2">
                                    <Label className="block !text-xs !font-medium !text-zinc-600">Type</Label>
                                    <Select value={type} onValueChange={setType}>
                                        <SelectTrigger className="w-full h-9 bg-white border-zinc-200/80 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-[13px]">
                                            <SelectValue placeholder="Select type" className="text-zinc-900 font-normal" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-zinc-200 shadow-lg">
                                            {FIELD_TYPE_DROPDOWN_OPTIONS.map((opt) => {
                                                const Icon = opt.icon;
                                                return (
                                                    <SelectItem key={opt.id} value={opt.type} className="py-2.5 px-3 cursor-pointer focus:bg-violet-50/50 border border-transparent focus:border-violet-200 transition-all rounded-lg group">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn("h-6 w-6 rounded-md flex items-center justify-center transition-all", opt.isAi ? "bg-purple-50" : "bg-zinc-100 group-focus:bg-white group-focus:shadow-sm")}>
                                                                <Icon className={cn("h-3.5 w-3.5", opt.color, "group-focus:text-violet-900")} />
                                                            </div>
                                                            <span className="text-[13px] font-normal text-zinc-900 group-focus:text-violet-900 transition-colors">{opt.label}</span>
                                                        </div>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
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
                                                                            onClick={(e) => { e.stopPropagation(); setSelectedMembers(prev => prev.filter(p => p.id !== m.id)); }}
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

                                    {/* Display settings */}
                                    <div>
                                        <Label className="block !text-xs !font-medium !text-zinc-600 !mb-2">Display settings</Label>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <Switch checked={isRequired} onCheckedChange={setIsRequired} />
                                                <Label className="!text-xs !font-normal text-zinc-700 cursor-pointer leading-none !m-0" onClick={() => setIsRequired(!isRequired)}>Required in tasks</Label>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Switch checked={isPinned} onCheckedChange={setIsPinned} />
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
                                        <p className="text-[13px] text-zinc-500 leading-none mb-3">
                                            Field will exist on all tasks at locations below
                                        </p>
                                        {taskData?.list ? (
                                            <div className="flex items-center gap-2 pt-1 text-[13px] text-zinc-800">
                                                <ListChecks className="h-4 w-4 text-zinc-400 shrink-0" />
                                                <span className="font-medium">{taskData.list.name}</span>
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
                    <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-zinc-100 bg-zinc-50/50">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            className="h-9 px-4 border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 shadow-sm transition-all font-medium text-[13px]"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="add-field-form"
                            disabled={createField.isPending || !name.trim()}
                            className="h-9 px-4 bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all font-medium border border-transparent text-[13px]"
                        >
                            {createField.isPending ? 'Creating...' : 'Create field'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
