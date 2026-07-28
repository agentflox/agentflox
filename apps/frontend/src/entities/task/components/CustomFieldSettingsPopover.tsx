'use client';

import * as React from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Settings, Trash2, ChevronDown, Type } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { FIELD_TYPE_DROPDOWN_OPTIONS } from '../constants/fieldTypes';
import { CustomFieldsManagerModal } from '@/entities/customfields/components/CustomFieldsManagerModal';
import { CustomFieldConfigForm, useCustomFieldConfigState } from './SharedCustomFieldConfig';
import { cn } from '@/lib/utils';
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

interface CustomFieldSettingsPopoverProps {
    children: React.ReactNode;
    field: {
        id: string;
        name: string;
        type: string;
        config?: any;
        isRequired?: boolean;
        isPinned?: boolean;
        isVisibleToGuests?: boolean;
        visibility?: string;
    };
    workspaceId: string;
    taskId?: string;
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    folderId?: string;
    listId?: string;
    onSuccess?: () => void;
}

export function CustomFieldSettingsPopover({
    children,
    field,
    workspaceId,
    taskId = '',
    spaceId,
    projectId,
    teamId,
    folderId,
    listId,
    onSuccess,
}: CustomFieldSettingsPopoverProps) {
    const [open, setOpen] = React.useState(false);
    const [modalOpen, setModalOpen] = React.useState(false);
    const [name, setName] = React.useState(field.name);

    const displayType = (field.config as { fieldType?: string } | null)?.fieldType ?? field.type;
    const configState = useCustomFieldConfigState(field.config);

    const utils = trpc.useUtils();

    const updateField = trpc.customFields.update.useMutation({
        onSuccess: () => {
            utils.customFields.list.invalidate({ workspaceId, applyTo: 'TASK' });
            if (taskId) utils.task.get.invalidate({ id: taskId });
            toast.success('Custom field updated');
            setOpen(false);
            onSuccess?.();
        },
        onError: (err) => toast.error(err.message || 'Failed to update field'),
    });

    const deleteField = trpc.customFields.delete.useMutation({
        onSuccess: () => {
            utils.customFields.list.invalidate({ workspaceId, applyTo: 'TASK' });
            if (taskId) utils.task.get.invalidate({ id: taskId });
            toast.success('Custom field deleted');
            setOpen(false);
            onSuccess?.();
        },
        onError: (err) => toast.error(err.message || 'Failed to delete field'),
    });

    React.useEffect(() => {
        if (open) {
            setName(field.name);
        }
    }, [open, field]);

    const handleSave = () => {
        if (!name.trim() || name === field.name) return;
        updateField.mutate({
            id: field.id,
            name: name.trim(),
            isRequired: field.isRequired,
            isPinned: field.isPinned,
            isVisibleToGuests: field.isVisibleToGuests,
            visibility: field.visibility as any,
            config: {
                ...(field.config as Record<string, unknown> || {}),
                ...configState.getConfig(displayType)
            },
        });
    };

    const typeOption = FIELD_TYPE_DROPDOWN_OPTIONS.find((o) => o.type === displayType);
    const TypeIcon = typeOption?.icon ?? Type;

    const hasChanges = name.trim().length > 0;

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    {children}
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0 rounded-xl shadow-lg border-zinc-200 z-[200]" align="end" side="left" sideOffset={8}>
                    <div className="flex flex-col">
                        <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-100">
                            <div className="flex items-center gap-1 text-sm font-medium text-zinc-600">
                                {typeOption?.label ?? displayType}
                                <ChevronDown className="h-3.5 w-3.5 text-zinc-400 opacity-50" />
                            </div>
                            <TooltipProvider>
                                <Tooltip delayDuration={300}>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setOpen(false);
                                                setModalOpen(true);
                                            }}
                                            className="flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 p-2 rounded-lg transition-colors cursor-pointer"
                                        >
                                            <Settings className="h-3.5 w-3.5" />
                                            Advanced
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md z-[9999]" side="top" sideOffset={4}>
                                        Open Custom Field Manager
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <div className="px-4 py-4 space-y-1.5">
                            <Label htmlFor="field-name" className="block !text-xs !font-medium !text-zinc-600">
                                Field name <span className="text-red-500 ml-0.5">*</span>
                            </Label>
                            <div className="relative flex items-center">
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="pl-9 h-9 text-[13px] bg-white border-zinc-200 focus-visible:ring-1 focus-visible:ring-indigo-500 rounded-lg"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && hasChanges) {
                                            e.preventDefault();
                                            handleSave();
                                        }
                                    }}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="px-4 pb-4">
                            <CustomFieldConfigForm type={displayType} state={configState} />
                        </div>

                        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-zinc-50/50 rounded-b-xl">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <button type="button" className="h-8 w-8 rounded-md bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors cursor-pointer">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="z-[250]">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete custom field?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete the field "{field.name}" from all tasks. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            className="bg-red-500 hover:bg-red-600 text-white"
                                            onClick={() => deleteField.mutate({ id: field.id })}
                                        >
                                            {deleteField.isPending ? 'Deleting...' : 'Delete'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setOpen(false)}
                                    className="h-8 px-3 text-[12px] font-medium border-zinc-200 text-zinc-600 bg-white hover:bg-zinc-100"
                                >
                                    Cancel
                                </Button>
                                <TooltipProvider>
                                    <Tooltip delayDuration={300}>
                                        <TooltipTrigger asChild>
                                            <span className="inline-block">
                                                <Button
                                                    size="sm"
                                                    onClick={handleSave}
                                                    disabled={!hasChanges || updateField.isPending}
                                                    className={cn(
                                                        "h-8 px-4 text-[12px] font-medium border-0",
                                                        hasChanges
                                                            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                                            : "bg-zinc-300 text-white hover:bg-zinc-300"
                                                    )}
                                                >
                                                    {updateField.isPending ? 'Saving...' : 'Save'}
                                                </Button>
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md z-[9999]" side="top" sideOffset={4}>
                                            Save all changes
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            <CustomFieldsManagerModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                workspaceId={workspaceId}
                initialFieldId={field.id}
                initialLocation={
                    listId ? `list:${listId}` :
                    folderId ? `folder:${folderId}` :
                    projectId ? `project:${projectId}` :
                    spaceId ? `space:${spaceId}` :
                    "all" as any
                }
            />
        </>
    );
}
