'use client';

import * as React from 'react';
import { Settings, Plus, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface CustomFieldsSectionProps {
    taskId: string;
    workspaceId: string;
}

export function CustomFieldsSection({ taskId, workspaceId }: CustomFieldsSectionProps) {
    const [addModalOpen, setAddModalOpen] = React.useState(false);
    const [settingsField, setSettingsField] = React.useState<{
        id: string;
        name: string;
        type: string;
        config?: { description?: string };
    } | null>(null);
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

    const handleDeleteConfirm = () => {
        if (deleteFieldId) {
            deleteCustomField.mutate({ id: deleteFieldId });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm font-semibold text-zinc-900">Custom Fields</span>
                </div>
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 gap-1.5"
                    onClick={() => setAddModalOpen(true)}
                >
                    <Plus className="h-3.5 w-3.5" />
                </Button>
            </div>

            {customFields.length > 0 && (
                <div className="rounded-md border border-zinc-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-200 bg-zinc-50/80">
                                <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                                    Custom Field
                                </th>
                                <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                                    Value
                                </th>
                                <th className="w-10 py-2.5 px-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {customFields.map((field: {
                                id: string;
                                name: string;
                                type: string;
                                config?: { description?: string };
                            }) => (
                                <tr
                                    key={field.id}
                                    className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/50 transition-colors group"
                                >
                                    <td
                                        className="py-2 px-3 align-top cursor-pointer"
                                        onClick={() => setSettingsField(field)}
                                    >
                                        <span className="font-medium text-zinc-900">{field.name}</span>
                                    </td>
                                    <td className="py-2 px-3 align-top">
                                        <div className="min-w-[140px]">
                                            <CustomFieldRenderer
                                                field={field}
                                                value={getFieldValue(field.id)}
                                                onChange={(value) => handleValueChange(field.id, value)}
                                                disabled={updateCustomField.isLoading}
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
                                                    onClick={() => setSettingsField(field)}
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
                </div>
            )}

            {customFields.length === 0 && (
                <p className="text-sm text-zinc-500">
                    No custom fields yet. Click the + button to add one.
                </p>
            )}

            <AddCustomFieldModal
                open={addModalOpen}
                onOpenChange={setAddModalOpen}
                workspaceId={workspaceId}
                taskId={taskId}
            />

            {settingsField && (
                <CustomFieldSettingsModal
                    open={!!settingsField}
                    onOpenChange={(open) => !open && setSettingsField(null)}
                    field={settingsField}
                    workspaceId={workspaceId}
                    taskId={taskId}
                />
            )}

            <AlertDialog open={!!deleteFieldId} onOpenChange={(open) => !open && setDeleteFieldId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete custom field?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the custom field and all its values. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteCustomField.isLoading ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
