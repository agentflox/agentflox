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
import { Type, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_TYPE_DROPDOWN_OPTIONS } from '../constants/fieldTypes';

interface CustomFieldSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    field: { id: string; name: string; type: string; config?: { description?: string; fieldType?: string } };
    workspaceId: string;
    taskId: string;
    onSuccess?: () => void;
}

const DESCRIPTION_LIMIT = 140;

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
    const nameInputRef = React.useRef<HTMLInputElement>(null);
    const utils = trpc.useUtils();

    React.useEffect(() => {
        if (open) {
            setName(field.name);
            setDescription((field.config as { description?: string } | null)?.description ?? '');
            setNameError(false);
            // Let the dialog mount before focusing
            requestAnimationFrame(() => nameInputRef.current?.select());
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
            setNameError(true);
            nameInputRef.current?.focus();
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

    const remaining = DESCRIPTION_LIMIT - description.length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px] gap-0 overflow-hidden p-0">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <TypeIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <DialogTitle className="text-[13px] font-semibold leading-none tracking-tight">
                            Field settings
                        </DialogTitle>
                        <p className="mt-1 truncate text-[12px] text-muted-foreground">
                            {typeOption?.label ?? displayType} field
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-5 px-5 py-5">
                        <div className="space-y-1.5">
                            <div className="flex items-baseline justify-between">
                                <Label
                                    htmlFor="settings-field-name"
                                    className="!text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                                >
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

                        <div className="space-y-1.5">
                            <div className="flex items-baseline justify-between">
                                <Label
                                    htmlFor="settings-field-description"
                                    className="!text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                                >
                                    Description
                                </Label>
                                <span
                                    className={cn(
                                        'text-[10px] tabular-nums text-muted-foreground/70',
                                        remaining < 0 && 'text-red-500'
                                    )}
                                >
                                    {remaining}
                                </span>
                            </div>
                            <Textarea
                                id="settings-field-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe this field..."
                                rows={2}
                                maxLength={DESCRIPTION_LIMIT}
                                className="resize-none text-sm"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Shown on hover over this field in tasks and views
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="!text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                Type
                            </Label>
                            <div className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground">
                                <TypeIcon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{typeOption?.label ?? displayType}</span>
                                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/60">
                                    Locked
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-5 py-3">
                        <span className="hidden text-[11px] text-muted-foreground/60 sm:inline">
                            Press Enter to save
                        </span>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border border-slate-300 bg-white text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" size="sm" disabled={updateField.isPending} className="gap-1.5">
                                {updateField.isPending ? (
                                    'Saving...'
                                ) : (
                                    <>
                                        <Check className="h-3.5 w-3.5" />
                                        Save
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}