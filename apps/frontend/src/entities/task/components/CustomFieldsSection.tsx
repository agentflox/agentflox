'use client';

import * as React from 'react';
import { Settings, Plus, MoreHorizontal, Trash2, ChevronRight, SquarePlus, Search, Maximize2, Minimize2, X, MapPin, Edit, Pin, EyeOff, PinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { trpc } from '@/lib/trpc';
import { CustomFieldRenderer } from './CustomFieldRenderer';
import { AddCustomFieldModal } from './AddCustomFieldModal';
import { CustomFieldSettingsPopover } from './CustomFieldSettingsPopover';
import { CustomFieldsManagerModal } from '@/entities/customfields/components/CustomFieldsManagerModal';
import { FIELD_TYPE_DROPDOWN_OPTIONS } from '../constants/fieldTypes';
import { Type } from 'lucide-react';

interface CustomFieldsSectionProps {
    taskId: string;
    workspaceId: string;
}

export function CustomFieldsSection({ taskId, workspaceId }: CustomFieldsSectionProps) {
    const [isMaximized, setIsMaximized] = React.useState(false);
    const [addModalOpen, setAddModalOpen] = React.useState(false);
    const [isManagerModalOpen, setIsManagerModalOpen] = React.useState(false);
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [isSearchOpen, setIsSearchOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [deleteFieldId, setDeleteFieldId] = React.useState<string | null>(null);
    const utils = trpc.useUtils();

    const { data: customFields = [] } = trpc.customFields.list.useQuery({
        workspaceId,
        applyTo: 'TASK',
    });

    const { data: task } = trpc.task.get.useQuery({ id: taskId });

    const updateCustomField = trpc.task.customFields.update.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
        },
    });

    const initialLocation = React.useMemo(() => {
        if (!task) return workspaceId ? `workspace:${workspaceId}` : "all";
        if (task.listId) return `list:${task.listId}`;
        if (task.folderId) return `folder:${task.folderId}`;
        if (task.projectId) return `project:${task.projectId}`;
        if (task.spaceId) return `space:${task.spaceId}`;
        if (task.teamId) return `team:${task.teamId}`;
        return workspaceId ? `workspace:${workspaceId}` : "all";
    }, [task, workspaceId]);

    const updateFieldDefinition = trpc.customFields.update.useMutation({
        onMutate: async (newFieldData) => {
            await utils.customFields.list.cancel({ workspaceId, applyTo: 'TASK' });
            const previousFields = utils.customFields.list.getData({ workspaceId, applyTo: 'TASK' });
            if (previousFields) {
                utils.customFields.list.setData({ workspaceId, applyTo: 'TASK' }, (old) =>
                    old?.map((f: any) => f.id === newFieldData.id ? { ...f, isPinned: newFieldData.isPinned } : f)
                );
            }
            return { previousFields };
        },
        onError: (err, newFieldData, context) => {
            if (context?.previousFields) {
                utils.customFields.list.setData({ workspaceId, applyTo: 'TASK' }, context.previousFields);
            }
        },
        onSettled: () => {
            utils.customFields.list.invalidate({ workspaceId, applyTo: 'TASK' });
        }
    });

    const deleteCustomField = trpc.customFields.delete.useMutation({
        onSuccess: () => {
            utils.customFields.list.invalidate({ workspaceId, applyTo: 'TASK' });
            utils.task.get.invalidate({ id: taskId });
            setDeleteFieldId(null);
        },
    });

    const handleValueChange = (customFieldId: string, value: unknown) => {
        updateCustomField.mutate({
            taskId,
            customFieldId,
            value,
        });
    };

    const getFieldValue = (customFieldId: string) => {
        const fieldValue = task?.customFieldValues?.find(
            (v: { customFieldId: string }) => v.customFieldId === customFieldId
        );
        return fieldValue?.value;
    };

    React.useEffect(() => {
        if (isSearchOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSearchOpen]);

    const filteredFields = React.useMemo(() => {
        let fields = customFields as any[];
        if (searchQuery) {
            fields = fields.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return [...fields].sort((a, b) => {
            const aPinned = a.isPinned ? 1 : 0;
            const bPinned = b.isPinned ? 1 : 0;
            return bPinned - aPinned;
        });
    }, [customFields, searchQuery]);

    const handleDeleteConfirm = () => {
        if (deleteFieldId) {
            deleteCustomField.mutate({ id: deleteFieldId });
        }
    };

    return (
        <div className={cn("transition-all duration-200 bg-white", isMaximized ? "absolute inset-0 z-50 p-8 overflow-y-auto flex flex-col" : "relative space-y-4")}>
            {isMaximized && (
                <div className="absolute top-6 right-6">
                    <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-900 gap-1.5" onClick={() => setIsMaximized(false)}>
                        Close <Minimize2 className="h-4 w-4" />
                    </Button>
                </div>
            )}

            <div className={cn("space-y-4", isMaximized && "max-w-5xl w-full mx-auto mt-12")}>
                {customFields.length > 0 && (
                    <div className="flex items-center justify-between mb-2 group/header">
                        <div className="flex items-center gap-1.5 -ml-1">
                            {customFields.length > 0 ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setIsCollapsed(!isCollapsed);
                                    }}
                                    className="cursor-pointer h-6 w-6 flex items-center justify-center rounded-md hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 transition-colors"
                                >
                                    <svg viewBox="0 0 100 100" className={cn("h-2.5 w-2.5 fill-current transition-transform duration-200", !isCollapsed && "rotate-90")}>
                                        <polygon points="20,10 80,50 20,90" />
                                    </svg>
                                </button>
                            ) : (
                                <div className="h-6 w-6 flex items-center justify-center">
                                    <SquarePlus className="h-4 w-4 text-zinc-400" />
                                </div>
                            )}
                            <span className="text-sm font-semibold text-zinc-900">Fields</span>
                        </div>

                        <div className={cn("flex items-center", (!isSearchOpen && "opacity-0 group-hover/header:opacity-100 transition-opacity"))}>
                            {isSearchOpen && (
                                <div className="flex items-center h-7 px-2 border border-indigo-500 rounded-md shadow-sm bg-white ring-2 ring-indigo-500/20 mr-2">
                                    <Search className="h-3.5 w-3.5 text-indigo-500 mr-1.5" />
                                    <input
                                        ref={inputRef}
                                        className="h-full bg-transparent border-none outline-none text-xs w-[120px] placeholder:text-zinc-400"
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <Button variant="ghost" size="icon" className="h-4 w-4 rounded-sm text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 ml-1" onClick={(e) => { e.stopPropagation(); setIsSearchOpen(false); setSearchQuery(''); }}>
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                            <TooltipProvider delayDuration={200}>
                                <div className="flex items-center p-0.5 border border-zinc-200 rounded-md shadow-sm bg-white">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100" onClick={(e) => { e.stopPropagation(); setIsSearchOpen(!isSearchOpen); if (isSearchOpen) setSearchQuery(''); }}>
                                                <Search className="h-3.5 w-3.5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>
                                            Search fields
                                        </TooltipContent>
                                    </Tooltip>
                                    {!isMaximized && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100" onClick={(e) => { e.stopPropagation(); setIsMaximized(true); }}>
                                                    <Maximize2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>
                                                Fullscreen
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                    <div className="w-[1px] h-3.5 bg-zinc-200 mx-0.5" />
                                    <DropdownMenu>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100" onClick={(e) => e.stopPropagation()}>
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>
                                                Add field
                                            </TooltipContent>
                                        </Tooltip>
                                        <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl">
                                            <DropdownMenuItem onClick={() => setAddModalOpen(true)} className="py-2 cursor-pointer rounded-md text-[13px]">
                                                <Plus className="h-4 w-4 mr-2.5 text-zinc-500" />
                                                Create a field
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setIsManagerModalOpen(true)} className="py-2 cursor-pointer rounded-md text-[13px]">
                                                <MapPin className="h-4 w-4 mr-2.5 text-zinc-500" />
                                                Add field from Workspace
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </TooltipProvider>
                        </div>
                    </div>
                )}

                {customFields.length > 0 && !isCollapsed && (
                    <div className="overflow-hidden">
                        {filteredFields.length > 0 ? (
                            <table className="w-full text-sm">
                                <tbody>
                                    {filteredFields.map((field: any, index: number) => {
                                        const displayType = (field.config as { fieldType?: string } | null)?.fieldType ?? field.type;
                                        const typeOption = FIELD_TYPE_DROPDOWN_OPTIONS.find((o) => o.type === displayType);
                                        const TypeIcon = typeOption?.icon ?? Type;
                                        return (
                                            <tr
                                                key={field.id}
                                                className={cn("border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/50 transition-colors group", index === 0 && "border-t border-zinc-100")}
                                            >
                                                <td className="py-2 px-3 align-top w-[260px] max-w-[260px]">
                                                    <div className="flex items-center justify-between mt-0.5">
                                                        <div className="flex items-center overflow-hidden min-w-0 mr-1">
                                                            {!((field as any).isVisibleToGuests ?? true) && (
                                                                <EyeOff className="h-3.5 w-3.5 text-zinc-400 mr-1.5 shrink-0" />
                                                            )}
                                                            <TooltipProvider delayDuration={300}>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                updateFieldDefinition.mutate({
                                                                                    id: field.id,
                                                                                    isPinned: !field.isPinned
                                                                                });
                                                                            }}
                                                                            className={cn("mr-1.5 shrink-0 focus:outline-none transition-opacity cursor-pointer flex items-center justify-center h-6 w-6 rounded-md hover:bg-zinc-200/50", !field.isPinned && "opacity-0 group-hover:opacity-100")}
                                                                        >
                                                                            {field.isPinned ? (
                                                                                <PinOff className="h-3.5 w-3.5 transition-colors fill-indigo-500 text-indigo-500" />
                                                                            ) : (
                                                                                <Pin className="h-3.5 w-3.5 transition-colors text-zinc-300 hover:text-zinc-400 -rotate-45" />
                                                                            )}
                                                                        </button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md max-w-[200px] text-center" side="top" sideOffset={4}>
                                                                        {field.isPinned ? "Unpin field" : "Pin (Always show this field everywhere it exists)"}
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                            <TypeIcon className="h-3.5 w-3.5 text-zinc-400 mr-2 shrink-0" />
                                                            <span className="font-normal text-zinc-900 truncate text-[13px]">{field.name}</span>
                                                        </div>
                                                        <TooltipProvider delayDuration={300}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <CustomFieldSettingsPopover
                                                                        field={{
                                                                            id: field.id,
                                                                            name: field.name,
                                                                            type: field.type,
                                                                            isRequired: field.isRequired ?? false,
                                                                            isPinned: field.isPinned ?? false,
                                                                            isVisibleToGuests: field.isVisibleToGuests ?? true,
                                                                            config: (field.config && typeof field.config === 'object' && !Array.isArray(field.config))
                                                                                ? field.config as any
                                                                                : undefined,
                                                                        }}
                                                                        workspaceId={workspaceId}
                                                                        taskId={taskId}
                                                                        listId={task?.listId ?? undefined}
                                                                        folderId={task?.folderId ?? undefined}
                                                                        spaceId={task?.spaceId ?? undefined}
                                                                        projectId={task?.projectId ?? undefined}
                                                                    >
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-zinc-200/50 shrink-0"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            <Settings className="h-3.5 w-3.5 text-zinc-500" />
                                                                        </Button>
                                                                    </CustomFieldSettingsPopover>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="bg-zinc-900 text-white font-medium text-xs px-2.5 py-1.5 border-0 rounded-md" side="top" sideOffset={4}>
                                                                    Settings
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </td>
                                                <td className="py-2 px-3 align-top">
                                                    <div className="min-w-[140px] outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-within:ring-zinc-200 transition-shadow">
                                                        <CustomFieldRenderer
                                                            field={field}
                                                            value={getFieldValue(field.id)}
                                                            onChange={(value) => handleValueChange(field.id, value)}
                                                            disabled={updateCustomField.isPending}
                                                            hideLabel
                                                            workspaceId={workspaceId}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="py-4 text-center text-sm text-zinc-500 italic">No fields match "{searchQuery}"</div>
                        )}
                    </div>
                )}
                {customFields.length === 0 && (
                    <div className="py-0.5">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="w-full justify-start h-8 px-2 text-[13px] text-zinc-600 font-normal hover:bg-zinc-100/80">
                                    <Edit className="w-4 h-4 mr-2 text-zinc-400" />
                                    Add fields
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56 p-1.5 rounded-xl">
                                <DropdownMenuItem onClick={() => setAddModalOpen(true)} className="py-2 cursor-pointer rounded-md text-[13px]">
                                    <Plus className="h-4 w-4 mr-2.5 text-zinc-500" />
                                    Create a field
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIsManagerModalOpen(true)} className="py-2 cursor-pointer rounded-md text-[13px]">
                                    <MapPin className="h-4 w-4 mr-2.5 text-zinc-500" />
                                    Add field from Workspace
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>

            <AddCustomFieldModal
                open={addModalOpen}
                onOpenChange={setAddModalOpen}
                workspaceId={workspaceId}
                taskId={taskId}
            />

            <CustomFieldsManagerModal
                open={isManagerModalOpen}
                onOpenChange={setIsManagerModalOpen}
                workspaceId={workspaceId}
                initialLocation={initialLocation as any}
                onCreateNew={() => {
                    // Logic to handle new field
                }}
                onAddExisting={() => {
                    // Logic to handle adding existing field
                }}
            />


            <AlertDialog open={!!deleteFieldId} onOpenChange={(open) => !open && setDeleteFieldId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete custom field?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the custom field and all its values. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-zinc-200 font-medium">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-red-600 text-white hover:bg-red-700 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-red-200 font-medium border border-transparent"
                        >
                            {deleteCustomField.isPending ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
