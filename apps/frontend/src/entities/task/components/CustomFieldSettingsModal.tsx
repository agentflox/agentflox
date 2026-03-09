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
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Type } from 'lucide-react';
import { FIELD_TYPE_DROPDOWN_OPTIONS } from '../constants/fieldTypes';

interface CustomFieldSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    field: { id: string; name: string; type: string; config?: { description?: string; fieldType?: string } };
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
    const utils = trpc.useUtils();

    React.useEffect(() => {
        if (open) {
            setName(field.name);
            setDescription((field.config as { description?: string } | null)?.description ?? '');
        }
    }, [open, field.name, field.config]);

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Field name is required');
            return;
        }
        const existingConfig = (field.config as Record<string, unknown>) ?? {};
        updateField.mutate({
            id: field.id,
            name: name.trim(),
            config: { ...existingConfig, description: description.trim() || undefined },
        });
    };

    const displayType = (field.config as { fieldType?: string } | null)?.fieldType ?? field.type;
    const typeOption = FIELD_TYPE_DROPDOWN_OPTIONS.find((o) => o.type === displayType);
    const TypeIcon = typeOption?.icon ?? Type;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogTitle>Edit custom field</DialogTitle>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="settings-field-name">
                            Field name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="settings-field-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter name..."
                            className="w-full"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="settings-field-description">Description (optional)</Label>
                        <Textarea
                            id="settings-field-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe this field..."
                            rows={2}
                            className="resize-none"
                        />
                        <p className="text-[11px] text-muted-foreground">
                            View descriptions when hovering over fields in tasks or views
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label>Type</Label>
                        <div className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
                            <TypeIcon className="h-4 w-4 shrink-0" />
                            {typeOption?.label ?? displayType}
                        </div>
                        <p className="text-[11px] text-muted-foreground">Type cannot be changed</p>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={updateField.isLoading}>
                            {updateField.isLoading ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
