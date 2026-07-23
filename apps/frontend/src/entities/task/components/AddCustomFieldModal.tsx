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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, ChevronDown, ChevronUp, Lock, Check } from 'lucide-react';
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
                                                    <span className="text-sm font-medium text-zinc-700 group-hover:text-violet-900 transition-colors">{field.label}</span>
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
                                                <span className="text-sm font-medium text-zinc-700 group-hover:text-violet-900 transition-colors">{field.label}</span>
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
                                <div className="space-y-1.5">
                                    <Label htmlFor="field-name" className="text-[13px] font-medium text-zinc-500">
                                        Field name <span className="text-red-500 ml-0.5">*</span>
                                    </Label>
                                    <Input
                                        id="field-name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter name..."
                                        className="w-full h-9 shadow-sm bg-white border-zinc-200/80 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all text-[13px]"
                                    />
                                </div>

                                {/* Type */}
                                <div className="space-y-1.5">
                                    <Label className="text-[13px] font-medium text-zinc-500">Type</Label>
                                    <Select value={type} onValueChange={setType}>
                                        <SelectTrigger className="w-full h-9 shadow-sm bg-white border-zinc-200/80 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-[13px]">
                                            <div className="flex items-center gap-2.5">
                                                {TypeIcon && <TypeIcon className="h-4 w-4 text-zinc-500 shrink-0" />}
                                                <SelectValue placeholder="Select type" className="text-zinc-900" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-zinc-200 shadow-lg">
                                            {FIELD_TYPE_DROPDOWN_OPTIONS.map((opt) => {
                                                const Icon = opt.icon;
                                                return (
                                                    <SelectItem key={opt.id} value={opt.type} className="py-2 cursor-pointer focus:bg-zinc-50">
                                                        <div className="flex items-center gap-2.5 text-[13px] text-zinc-700 font-medium">
                                                            <Icon className="h-4 w-4 shrink-0 text-zinc-500" />
                                                            {opt.label}
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
                                    <div className="space-y-1.5">
                                        <Label className="!text-xs !font-medium !text-zinc-600">Description</Label>
                                        <Textarea
                                            className="min-h-[70px] text-[13px] rounded-lg resize-y border-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-300 placeholder:text-zinc-400"
                                            placeholder="Tell other users how to use this field"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                        />
                                        <p className="text-[11px] text-zinc-400">View descriptions when hovering over fields in tasks or views</p>
                                    </div>

                                    {/* Permissions */}
                                    <div className="space-y-1.5">
                                        <Label className="!text-xs !font-medium !text-zinc-600">Permissions</Label>
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
                                    <div className="space-y-3">
                                        <Label className="!text-xs !font-medium !text-zinc-600">Display settings</Label>
                                        <div className="flex items-center justify-between">
                                            <Label className="!text-[13px] !font-normal !text-zinc-600">Required in tasks</Label>
                                            <Switch checked={isRequired} onCheckedChange={setIsRequired} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label className="!text-[13px] !font-normal !text-zinc-600">Pinned</Label>
                                            <Switch checked={isPinned} onCheckedChange={setIsPinned} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label className="!text-[13px] !font-normal !text-zinc-600">Visible to Guests and Limited Members</Label>
                                            <Switch checked={isVisibleToGuests} onCheckedChange={setIsVisibleToGuests} className="data-[state=checked]:bg-indigo-500" />
                                        </div>
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
