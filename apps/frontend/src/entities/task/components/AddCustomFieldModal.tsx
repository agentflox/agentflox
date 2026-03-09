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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    AI_FIELDS,
    ALL_FIELDS,
    FIELD_TYPE_DROPDOWN_OPTIONS,
    type FieldTypeOption,
} from '../constants/fieldTypes';

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
        if (type === 'DROPDOWN' || type === 'CUSTOM_DROPDOWN' || type === 'LABELS' || type === 'CATEGORIZE' || type === 'SENTIMENT' || type === 'TSHIRT_SIZE') {
            config.options = config.options ?? [];
        }
        createField.mutate({
            workspaceId,
            name: name.trim(),
            type,
            applyTo: ['TASK'],
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

    return (
        <>
            {/* Step 1: Type picker modal (images 1, 2, 3) */}
            <Dialog open={open && step === 'picker'} onOpenChange={(open) => !open && handleClose()}>
                <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden [&>button]:hidden">
                    <DialogTitle className="sr-only">Select field type</DialogTitle>
                    <div className="p-3 border-b border-zinc-200">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search..."
                                className="pl-9 h-9 bg-zinc-50 border-zinc-200"
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
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-zinc-100 transition-colors text-left"
                                                >
                                                    <div className={cn("h-8 w-8 rounded-md flex items-center justify-center bg-purple-50", field.color)}>
                                                        <Icon className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-sm font-medium text-zinc-900">{field.label}</span>
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
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-zinc-100 transition-colors text-left"
                                            >
                                                <div className={cn("h-8 w-8 rounded-md flex items-center justify-center", field.isAi ? "bg-purple-50" : "bg-zinc-100", field.color)}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <span className="text-sm font-medium text-zinc-900">{field.label}</span>
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

            {/* Step 2: Form modal (image 4) - Field name, Description, Type dropdown */}
            <Dialog open={open && step === 'form'} onOpenChange={(isOpen) => !isOpen && handleClose()}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogTitle>Add custom field</DialogTitle>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="field-name">
                                Field name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="field-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter name..."
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="field-description">Description (optional)</Label>
                            <Textarea
                                id="field-description"
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
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger className="w-full">
                                    <div className="flex items-center gap-2">
                                        {TypeIcon && <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />}
                                        <SelectValue placeholder="Select type" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {FIELD_TYPE_DROPDOWN_OPTIONS.map((opt) => {
                                        const Icon = opt.icon;
                                        return (
                                            <SelectItem key={opt.id} value={opt.type}>
                                                <div className="flex items-center gap-2">
                                                    <Icon className="h-4 w-4 shrink-0" />
                                                    {opt.label}
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleClose()}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createField.isLoading || !name.trim()}>
                                {createField.isLoading ? 'Creating...' : 'Create'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
