'use client';

import * as React from 'react';
import { Settings, Plus, MoreHorizontal, Trash2, ChevronRight, SquarePlus, Search, Maximize2, Minimize2, X, MapPin, Edit } from 'lucide-react';
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
import { CustomFieldSettingsModal } from './CustomFieldSettingsModal';
import { CustomFieldsManagerModal } from '@/entities/customfields/components/CustomFieldsManagerModal';

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
    const [settingsField, setSettingsField] = React.useState<any | null>(null);
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
        if (!searchQuery) return customFields;
        return customFields.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
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
                        <div
                            className={cn(
                                "flex items-center gap-2",
                                customFields.length > 0 && "cursor-pointer hover:bg-zinc-50 py-1 px-1 -ml-1 rounded transition-colors group"
                            )}
                            onClick={() => customFields.length > 0 && setIsCollapsed(!isCollapsed)}
                        >
                            {customFields.length > 0 ? (
                                <ChevronRight className={cn("h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-transform", !isCollapsed && "rotate-90")} />
                            ) : (
                                <div className="py-1 px-1 -ml-1">
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
                                    {filteredFields.map((field) => (
                                        <tr
                                            key={field.id}
                                            className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/50 transition-colors group"
                                        >
                                            <td
                                                className="py-2 px-3 align-top cursor-pointer"
                                                onClick={() => setSettingsField({
                                                    id: field.id,
                                                    name: field.name,
                                                    type: field.type,
                                                    config: (field.config && typeof field.config === 'object' && !Array.isArray(field.config))
                                                        ? field.config as { description?: string }
                                                        : undefined,
                                                })}
                                            >
                                                <span className="font-normal text-zinc-900">{field.name}</span>
                                            </td>
                                            <td className="py-2 px-3 align-top">
                                                <div className="min-w-[140px]">
                                                    <CustomFieldRenderer
                                                        field={field}
                                                        value={getFieldValue(field.id)}
                                                        onChange={(value) => handleValueChange(field.id, value)}
                                                        disabled={updateCustomField.isPending}
                                                        hideLabel
                                                    />
                                                </div>
                                            </td>
                                            <td className="py-2 px-2 align-top">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 shrink-0"
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() => setSettingsField({
                                                                id: field.id,
                                                                name: field.name,
                                                                type: field.type,
                                                                config: (field.config && typeof field.config === 'object' && !Array.isArray(field.config))
                                                                    ? field.config as { description?: string }
                                                                    : undefined,
                                                            })}
                                                        >
                                                            <Settings className="h-4 w-4 mr-2" />
                                                            Settings
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            variant="destructive"
                                                            onClick={() => setDeleteFieldId(field.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))}
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
                onCreateNew={() => {
                    // Logic to handle new field
                }}
                onAddExisting={() => {
                    // Logic to handle adding existing field
                }}
            />

            {
                settingsField && (
                    <CustomFieldSettingsModal
                        open={!!settingsField}
                        onOpenChange={(open) => !open && setSettingsField(null)}
                        field={settingsField}
                        workspaceId={workspaceId}
                        taskId={taskId}
                    />
                )
            }

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
