'use client';

import * as React from 'react';
import { FileText, Search, ChevronDown, ChevronRight, Plus, Maximize2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DocPickerModal } from './DocPickerModal';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface DocLinksPanelContentProps {
    taskId: string;
    workspaceId: string;
    /** Doc attachments (mimeType === 'doc_link') */
    items: Array<{
        id: string;
        filename: string | null;
        url: string;
        createdAt: Date | string;
    }>;
}

export function DocLinksPanelContent({ taskId, workspaceId, items }: DocLinksPanelContentProps) {
    const [docsCollapsed, setDocsCollapsed] = React.useState(false);
    const [refsCollapsed, setRefsCollapsed] = React.useState(false);
    const [pickerOpen, setPickerOpen] = React.useState(false);

    const utils = trpc.useUtils();
    const deleteAttachment = trpc.task.attachments.delete.useMutation({
        onSuccess: () => {
            utils.task.attachments.list.invalidate({ taskId });
            utils.task.get.invalidate({ id: taskId });
            toast.success('Document removed');
        },
    });

    const createAttachment = trpc.task.attachments.create.useMutation({
        onSuccess: () => {
            utils.task.attachments.list.invalidate({ taskId });
            utils.task.get.invalidate({ id: taskId });
            toast.success('Document linked');
            setPickerOpen(false);
        },
        onError: (e) => toast.error(e.message || 'Failed to link document'),
    });

    const handleDocSelect = (documentId: string, documentTitle: string) => {
        createAttachment.mutate({
            taskId,
            url: `/documents/${documentId}`,
            filename: documentTitle,
            size: 0,
            mimeType: 'doc_link',
        });
    };

    const docsCount = items.length;
    const refsCount = 0; // References not implemented yet

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="flex items-center justify-between gap-2 shrink-0 mb-3">
                <h3 className="text-base font-semibold text-zinc-900">Doc Links</h3>
                <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Search">
                        <Search className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPickerOpen(true)} aria-label="Add">
                        <Plus className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Docs section */}
            <div className="rounded-lg border border-zinc-200 overflow-hidden bg-white flex-1 min-h-0 flex flex-col mb-3">
                <button
                    type="button"
                    onClick={() => setDocsCollapsed((c) => !c)}
                    className="flex items-center gap-2 py-2.5 px-3 text-left hover:bg-zinc-50/50 transition-colors border-b border-zinc-100"
                >
                    {docsCollapsed ? <ChevronRight className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                    <FileText className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm font-medium text-zinc-900">Docs {docsCount}</span>
                </button>

                {!docsCollapsed && (
                    <div className="p-2 space-y-1">
                        {items.length === 0 ? (
                            <p className="text-sm text-zinc-400 py-2 px-2">No docs linked.</p>
                        ) : (
                            items.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="flex items-center justify-between gap-2 py-2 px-2 rounded-md hover:bg-zinc-50 group"
                                >
                                    <FileText className="h-4 w-4 text-zinc-500 shrink-0" />
                                    <a
                                        href={doc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 min-w-0 text-sm text-zinc-800 hover:text-purple-600 truncate"
                                    >
                                        {doc.filename || 'Untitled'}
                                    </a>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                                    Open
                                                </a>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => deleteAttachment.mutate({ id: doc.id })}
                                                className="text-red-600"
                                            >
                                                Remove
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ))
                        )}
                        <button
                            type="button"
                            onClick={() => setPickerOpen(true)}
                            className="w-full text-left text-sm text-zinc-500 hover:text-purple-600 flex items-center gap-1 py-1.5 px-2"
                        >
                            <Plus className="h-3.5 w-3.5" /> Add doc
                        </button>
                    </div>
                )}
            </div>

            {/* References section */}
            <div className="rounded-lg border border-zinc-200 overflow-hidden bg-white flex-1 min-h-0 flex flex-col">
                <button
                    type="button"
                    onClick={() => setRefsCollapsed((c) => !c)}
                    className="flex items-center gap-2 py-2.5 px-3 text-left hover:bg-zinc-50/50 transition-colors border-b border-zinc-100"
                >
                    {refsCollapsed ? <ChevronRight className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                    <FileText className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm font-medium text-zinc-900">References {refsCount}</span>
                </button>

                {!refsCollapsed && (
                    <div className="p-2">
                        <p className="text-sm text-zinc-400 py-2 px-2">No references.</p>
                    </div>
                )}
            </div>

            <DocPickerModal
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                workspaceId={workspaceId}
                onSelect={handleDocSelect}
            />
        </div>
    );
}
