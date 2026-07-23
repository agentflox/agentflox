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
import { Type, Check, ChevronDown, ChevronUp, Lock, Trash2 } from 'lucide-react';
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

const DESCRIPTION_LIMIT = 280;

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
}

export function CustomFieldSettingsModal({
    open,
    onOpenChange,
    field,
    workspaceId,
    taskId,
    onSuccess,
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
    const utils = trpc.useUtils();

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
    const remaining = DESCRIPTION_LIMIT - description.length;
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
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                </div>

                <ScrollArea className="max-h-[70vh]">
                    <form id="settings-form" onSubmit={handleSubmit}>
                        <div className="space-y-4 px-5 py-5">
                            {/* Name */}
                            <div className="space-y-1.5">
                                <div className="flex items-baseline justify-between">
                                    <Label htmlFor="settings-field-name" className="!text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                                        Name
                                    </Label>
                                </div>
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
                                        'h-9 w-full text-sm transition-colors',
                                        nameError && 'border-red-500 focus-visible:ring-red-500/30'
                                    )}
                                />
                                {nameError && (
                                    <p className="text-[11px] text-red-500">Give this field a name to continue.</p>
                                )}
                            </div>

                            {/* Type (locked) */}
                            <div className="space-y-1.5">
                                <Label className="!text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                                    Type
                                </Label>
                                <div className="flex h-9 w-full items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50/80 px-3 text-sm text-zinc-500">
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
                                <div className="space-y-1.5">
                                    <div className="flex items-baseline justify-between">
                                        <Label htmlFor="settings-field-description" className="!text-xs !font-medium !text-zinc-600">Description</Label>
                                        <span className={cn('text-[10px] tabular-nums text-zinc-400', remaining < 0 && 'text-red-500')}>
                                            {remaining}
                                        </span>
                                    </div>
                                    <Textarea
                                        id="settings-field-description"
                                        className="min-h-[70px] text-[13px] rounded-lg resize-y border-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-300 placeholder:text-zinc-400"
                                        placeholder="Tell other users how to use this field"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        maxLength={DESCRIPTION_LIMIT}
                                    />
                                    <p className="text-[11px] text-zinc-400">Shown on hover over this field in tasks and views</p>
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
                            {updateField.isPending ? 'Saving...' : (
                                <>
                                    <Check className="h-3.5 w-3.5" />
                                    Save
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}