'use client';

import * as React from 'react';
import {
    Check,
    AlertTriangle,
    MinusCircle,
    FileText,
    Plus,
    ArrowLeftRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TaskPickerModal, type RelationshipDependencyType } from './TaskPickerModal';
import { DocPickerModal } from './DocPickerModal';
import {
    CreateCustomRelationshipModal,
    type CustomRelationshipType,
} from './CreateCustomRelationshipModal';

const RELATIONSHIP_CARDS = [
    { id: 'link_task' as const, label: 'Link Task', icon: Check, dependencyType: 'FINISH_TO_FINISH' as RelationshipDependencyType },
    { id: 'waiting_on' as const, label: 'Waiting on', icon: AlertTriangle, dependencyType: 'START_TO_START' as RelationshipDependencyType },
    { id: 'blocking' as const, label: 'Blocking', icon: MinusCircle, dependencyType: 'FINISH_TO_START' as RelationshipDependencyType },
    { id: 'link_doc' as const, label: 'Link Doc', icon: FileText },
    { id: 'custom' as const, label: 'Custom', icon: Plus },
] as const;

interface AddRelationshipSectionProps {
    taskId: string;
    workspaceId: string;
    customTypes: CustomRelationshipType[];
    onCustomTypesChange: (types: CustomRelationshipType[]) => void;
}

export function AddRelationshipSection({
    taskId,
    workspaceId,
    customTypes,
    onCustomTypesChange,
}: AddRelationshipSectionProps) {
    const [taskPickerOpen, setTaskPickerOpen] = React.useState(false);
    const [taskPickerType, setTaskPickerType] = React.useState<RelationshipDependencyType | null>(null);
    const [docPickerOpen, setDocPickerOpen] = React.useState(false);
    const [createCustomOpen, setCreateCustomOpen] = React.useState(false);
    const [customTaskPickerOpen, setCustomTaskPickerOpen] = React.useState(false);
    const [customTaskPickerType, setCustomTaskPickerType] = React.useState<CustomRelationshipType | null>(null);

    const utils = trpc.useUtils();
    const addDependency = trpc.task.addDependency.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: taskId });
            toast.success('Relationship added');
        },
        onError: (e) => toast.error(e.message || 'Failed to add relationship'),
    });

    const createAttachment = trpc.task.attachments.create.useMutation({
        onSuccess: () => {
            utils.task.attachments.list.invalidate({ taskId });
            utils.task.get.invalidate({ id: taskId });
            toast.success('Document linked');
        },
        onError: (e) => toast.error(e.message || 'Failed to link document'),
    });

    const openTaskPicker = (dependencyType: RelationshipDependencyType) => {
        setTaskPickerType(dependencyType);
        setTaskPickerOpen(true);
    };

    const handleTaskSelect = (selectedTaskId: string) => {
        if (!taskPickerType) return;
        addDependency.mutate({
            taskId,
            dependsOnId: selectedTaskId,
            type: taskPickerType,
        });
        setTaskPickerOpen(false);
        setTaskPickerType(null);
    };

    const handleDocSelect = (documentId: string, documentTitle: string) => {
        createAttachment.mutate({
            taskId,
            url: `/documents/${documentId}`,
            filename: documentTitle,
            size: 0,
            mimeType: 'doc_link',
        });
        setDocPickerOpen(false);
    };

    const handleCustomCreated = (type: CustomRelationshipType) => {
        onCustomTypesChange([...customTypes, type]);
    };

    const openCustomTaskPicker = (type: CustomRelationshipType) => {
        setCustomTaskPickerType(type);
        setCustomTaskPickerOpen(true);
    };

    const handleCustomTaskSelect = (selectedTaskId: string) => {
        if (!customTaskPickerType) return;
        addDependency.mutate({
            taskId,
            dependsOnId: selectedTaskId,
            type: 'FINISH_TO_FINISH',
        });
        setCustomTaskPickerOpen(false);
        setCustomTaskPickerType(null);
    };

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900">Add Relationship</h3>
            <div className="grid grid-cols-2 gap-2">
                {RELATIONSHIP_CARDS.map((card) => {
                    const Icon = card.icon;
                    if (card.id === 'link_doc') {
                        return (
                            <button
                                key={card.id}
                                type="button"
                                onClick={() => setDocPickerOpen(true)}
                                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition-colors text-left"
                            >
                                <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center">
                                    <Icon className="h-5 w-5 text-zinc-600" />
                                </div>
                                <span className="text-sm font-medium text-zinc-800">{card.label}</span>
                            </button>
                        );
                    }
                    if (card.id === 'custom') {
                        return (
                            <button
                                key={card.id}
                                type="button"
                                onClick={() => setCreateCustomOpen(true)}
                                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition-colors text-left"
                            >
                                <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center">
                                    <Icon className="h-5 w-5 text-zinc-600" />
                                </div>
                                <span className="text-sm font-medium text-zinc-800">{card.label}</span>
                            </button>
                        );
                    }
                    return (
                        <button
                            key={card.id}
                            type="button"
                            onClick={() => card.dependencyType && openTaskPicker(card.dependencyType)}
                            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition-colors text-left"
                        >
                            <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center">
                                <Icon className="h-5 w-5 text-zinc-600" />
                            </div>
                            <span className="text-sm font-medium text-zinc-800">{card.label}</span>
                        </button>
                    );
                })}
                {customTypes.map((type) => (
                    <button
                        key={type.id}
                        type="button"
                        onClick={() => openCustomTaskPicker(type)}
                        className="flex flex-col items-center gap-2 p-4 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition-colors text-left"
                    >
                        <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center">
                            <ArrowLeftRight className="h-5 w-5 text-zinc-600" />
                        </div>
                        <span className="text-sm font-medium text-zinc-800 truncate w-full text-center">
                            {type.name}
                        </span>
                    </button>
                ))}
            </div>

            {taskPickerType && (
                <TaskPickerModal
                    open={taskPickerOpen}
                    onOpenChange={setTaskPickerOpen}
                    taskId={taskId}
                    workspaceId={workspaceId}
                    dependencyType={taskPickerType}
                    onSelect={handleTaskSelect}
                />
            )}
            <DocPickerModal
                open={docPickerOpen}
                onOpenChange={setDocPickerOpen}
                workspaceId={workspaceId}
                onSelect={handleDocSelect}
            />
            <CreateCustomRelationshipModal
                open={createCustomOpen}
                onOpenChange={setCreateCustomOpen}
                workspaceId={workspaceId}
                onCreated={handleCustomCreated}
            />
            {customTaskPickerType && (
                <TaskPickerModal
                    open={customTaskPickerOpen}
                    onOpenChange={setCustomTaskPickerOpen}
                    taskId={taskId}
                    workspaceId={workspaceId}
                    dependencyType="FINISH_TO_FINISH"
                    onSelect={handleCustomTaskSelect}
                />
            )}
        </div>
    );
}
