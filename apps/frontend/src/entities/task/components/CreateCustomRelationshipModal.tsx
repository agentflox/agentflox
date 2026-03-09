'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Check, FileText } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

export interface CustomRelationshipType {
    id: string;
    name: string;
    description?: string;
    scope: 'workspace' | 'list';
    listId?: string;
    createRollupFields?: boolean;
}

interface CreateCustomRelationshipModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceId: string;
    onCreated: (type: CustomRelationshipType) => void;
}

export function CreateCustomRelationshipModal({
    open,
    onOpenChange,
    workspaceId,
    onCreated,
}: CreateCustomRelationshipModalProps) {
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [scope, setScope] = React.useState<'workspace' | 'list'>('workspace');
    const [listId, setListId] = React.useState<string>('');
    const [createRollupFields, setCreateRollupFields] = React.useState(false);

    const { data: listsData } = trpc.list.byContext.useQuery(
        { workspaceId },
        { enabled: open && !!workspaceId }
    );
    const lists = listsData?.items ?? [];

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName) return;
        const type: CustomRelationshipType = {
            id: `custom-${Date.now()}`,
            name: trimmedName,
            description: description.trim() || undefined,
            scope,
            listId: scope === 'list' && listId ? listId : undefined,
            createRollupFields,
        };
        onCreated(type);
        onOpenChange(false);
        setName('');
        setDescription('');
        setScope('workspace');
        setListId('');
        setCreateRollupFields(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                <DialogTitle className="sr-only">Custom Relationship</DialogTitle>
                <form onSubmit={handleCreate} className="p-5 space-y-4">
                    <h2 className="text-base font-semibold text-zinc-900">Custom Relationship</h2>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-zinc-700">
                            Relationship name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter name..."
                            className="h-10 rounded-md border-zinc-200"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                            Description (Optional)
                        </Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter description..."
                            className="min-h-[60px] rounded-md border-zinc-200 resize-none"
                            rows={2}
                        />
                        <p className="text-[11px] text-zinc-400">
                            View descriptions when hovering over fields in tasks or views
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                            Related to
                        </Label>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="scope"
                                    checked={scope === 'workspace'}
                                    onChange={() => setScope('workspace')}
                                    className="text-purple-600 border-zinc-300 focus:ring-purple-500"
                                />
                                <span className="text-sm text-zinc-700">any task in your Workspace</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="scope"
                                    checked={scope === 'list'}
                                    onChange={() => setScope('list')}
                                    className="text-purple-600 border-zinc-300 focus:ring-purple-500"
                                />
                                <span className="text-sm text-zinc-700">tasks from a specific List</span>
                            </label>
                        </div>
                        {scope === 'list' && (
                            <div className="pt-2 pl-6 space-y-1.5">
                                <Label className="text-sm font-medium text-zinc-700">
                                    Related list <span className="text-red-500">*</span>
                                </Label>
                                <Select value={listId} onValueChange={setListId}>
                                    <SelectTrigger className="h-10 rounded-md border-zinc-200">
                                        <SelectValue placeholder="Select List..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {lists.map((list: any) => (
                                            <SelectItem key={list.id} value={list.id}>
                                                {list.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Switch
                            checked={createRollupFields}
                            onCheckedChange={setCreateRollupFields}
                            className="data-[state=unchecked]:bg-zinc-200"
                        />
                        <Label className="text-sm text-zinc-700">
                            Create rollup fields {scope === 'list' ? 'from related List' : ''}
                        </Label>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            className="bg-zinc-900 hover:bg-zinc-800"
                            disabled={!name.trim() || (scope === 'list' && !listId)}
                        >
                            Create
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
