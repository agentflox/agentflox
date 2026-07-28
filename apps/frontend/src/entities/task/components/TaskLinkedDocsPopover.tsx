'use client';
import * as React from 'react';
import { trpc } from '@/lib/trpc';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { FileText, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface TaskLinkedDocsPopoverProps {
    taskId: string;
    workspaceId: string;
    children: React.ReactNode;
}

export function TaskLinkedDocsPopover({ taskId, workspaceId, children }: TaskLinkedDocsPopoverProps) {
    const [open, setOpen] = React.useState(false);
    const [showSearch, setShowSearch] = React.useState(false);
    const [searchInput, setSearchInput] = React.useState('');
    const [searchQuery, setSearchQuery] = React.useState('');
    const utils = trpc.useUtils();

    React.useEffect(() => {
        const handle = setTimeout(() => {
            setSearchQuery(searchInput.trim());
        }, 300);
        return () => clearTimeout(handle);
    }, [searchInput]);

    const { data: task, isLoading } = trpc.task.get.useQuery({ id: taskId }, {
        enabled: open && !!taskId,
    });

    const { data: docListData } = trpc.document.list.useQuery(
        {
            workspaceId,
            query: searchQuery || undefined,
            pageSize: 30,
        },
        { enabled: open && showSearch && !!workspaceId }
    );

    const createAttachment = trpc.task.attachments.create.useMutation({
        onSuccess: () => {
            toast.success("Document linked");
            utils.task.get.invalidate({ id: taskId });
            utils.task.list.invalidate();
            setShowSearch(false);
        },
        onError: () => {
            toast.error("Failed to link document");
        }
    });

    const removeAttachment = trpc.task.attachments.delete.useMutation({
        onSuccess: () => {
            toast.success("Link removed");
            utils.task.get.invalidate({ id: taskId });
            utils.task.list.invalidate();
        },
        onError: () => {
            toast.error("Failed to remove link");
        }
    });

    const handleSelectDoc = (documentId: string, documentTitle: string) => {
        if (!taskId) return;
        createAttachment.mutate({
            taskId,
            filename: documentTitle,
            url: `/documents/${documentId}`,
            size: 0,
            mimeType: 'doc_link',
        });
    };

    const docLinks = ((task as any)?.attachments || []).filter((a: any) => a.mimeType === 'doc_link');
    const existingIds = docLinks.map((a: any) => a.url.replace('/documents/', ''));

    const docs = docListData?.items ?? [];
    const filteredDocs = docs.filter((d: any) => !existingIds.includes(d.id));

    // Force show search if no docs exist and data is loaded
    React.useEffect(() => {
        if (!isLoading && docLinks.length === 0 && !showSearch) {
            setShowSearch(true);
        }
    }, [isLoading, docLinks.length, showSearch]);

    return (
        <Popover open={open} onOpenChange={(newOpen) => {
            setOpen(newOpen);
            if (!newOpen) {
                setShowSearch(false);
                setSearchInput('');
                setSearchQuery('');
            }
        }}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent className="w-[500px] p-0 rounded-xl shadow-xl z-[150]" align="start" sideOffset={8}>
                <div className="flex flex-col relative">
                    {/* Header */}
                    <div className="flex items-center px-4 py-3 border-b border-zinc-100 bg-white rounded-t-xl">
                        <div className="text-[13px] font-semibold text-zinc-800">Docs</div>
                        {!showSearch && (
                            <button
                                onClick={() => setShowSearch(true)}
                                className="text-[12px] font-medium text-zinc-500 hover:text-zinc-800 ml-4 flex items-center"
                            >
                                <Plus className="h-3 w-3 mr-1" /> Add Doc
                            </button>
                        )}
                    </div>

                    {/* Linked Docs List */}
                    {!showSearch && docLinks.length > 0 && (
                        <div className="flex flex-col max-h-[250px] overflow-y-auto py-1">
                            {docLinks.map((doc: any) => (
                                <div key={doc.id} className="flex items-center px-4 py-2 hover:bg-zinc-50 group">
                                    <div className="flex-1 flex items-center gap-2 min-w-0">
                                        <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center shrink-0">
                                            <FileText className="h-3 w-3 text-blue-600 fill-blue-600" />
                                        </div>
                                        <span className="text-[13px] text-zinc-700 truncate">{doc.filename}</span>
                                    </div>
                                    <button
                                        onClick={() => removeAttachment.mutate({ id: doc.id })}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-200 rounded text-zinc-400 hover:text-zinc-700 transition-opacity shrink-0"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Search & Select Area */}
                    {showSearch && (
                        <div className="flex flex-col bg-zinc-50/50 rounded-b-xl pb-2">
                            <div className="p-2 px-3 border-b border-zinc-100 bg-white">
                                <Input
                                    variant="ghost"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Type to search Docs..."
                                    className="h-8 w-full bg-transparent p-0 focus:outline-none focus:ring-0 focus-visible:ring-0 text-[13px] shadow-none border-0 placeholder:text-zinc-400 font-medium"
                                    autoFocus
                                />
                            </div>

                            <div className="px-4 pt-3 pb-1">
                                <span className="text-[12px] font-medium text-zinc-500">
                                    {searchQuery ? 'Results' : 'Recent'}
                                </span>
                            </div>

                            <div className="max-h-[200px] overflow-y-auto px-2 space-y-1">
                                {filteredDocs.length === 0 ? (
                                    <div className="py-4 flex items-center justify-center text-center text-[13px] text-zinc-500">
                                        No documents found.
                                    </div>
                                ) : (
                                    filteredDocs.map((d: any) => (
                                        <button
                                            key={d.id}
                                            onClick={() => handleSelectDoc(d.id, d.title)}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-left bg-zinc-100/50 hover:bg-zinc-200/50 rounded-lg transition-colors cursor-pointer"
                                        >
                                            <FileText className="h-4 w-4 text-zinc-500 shrink-0" />
                                            <span className="text-[13px] text-zinc-700 font-normal truncate flex-1">{d.title}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

export function LinkedDocsCell({ task, workspaceId }: { task: any, workspaceId: string }) {
    // If the task object has the attachments loaded (e.g. from an expanded query), we can render the pill immediately.
    // In ListView, it usually only has _count. Since we don't have _count.docLinks directly, 
    // we use a React Query to fetch the task briefly to check if it has doc links for the initial render.
    // To keep the list view fast, we can just show a subtle "—" if we don't want to fetch for every row.
    // Wait, the user's screenshot has "Page 1". We'll just render it using a local query.

    const { data: fullTask } = trpc.task.get.useQuery({ id: task.id }, {
        staleTime: 60000, // cache for 1 minute to avoid spamming
    });

    const docs = ((fullTask as any)?.attachments || []).filter((a: any) => a.mimeType === 'doc_link');

    if (!fullTask) {
        return (
            <button type="button" className="w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 transition-shadow cursor-pointer">
                <div className="text-xs text-zinc-400 font-medium">...</div>
            </button>
        );
    }

    return (
        <TaskLinkedDocsPopover taskId={task.id} workspaceId={workspaceId}>
            <button type="button" className="w-full h-full min-h-[38px] flex items-center justify-start px-2 py-1 outline-none rounded-sm ring-1 ring-inset ring-transparent hover:ring-zinc-200 focus-visible:ring-indigo-500 data-[state=open]:ring-indigo-500 transition-shadow cursor-pointer gap-1 group" onClick={(e) => e.stopPropagation()}>
                {docs.length > 0 ? (
                    <div className="flex items-center gap-1">
                        <Badge variant="outline" className="h-5 px-1.5 text-xs font-normal border-zinc-200 bg-white group-hover:bg-zinc-50 truncate max-w-[80px] rounded-sm transition-colors">
                            {docs[0].filename}
                        </Badge>
                        {docs.length > 1 && (
                            <Badge variant="outline" className="h-5 px-1 text-xs font-normal border-zinc-200 bg-white group-hover:bg-zinc-50 rounded-sm transition-colors">
                                +{docs.length - 1}
                            </Badge>
                        )}
                    </div>
                ) : (
                    <span className="text-xs text-zinc-500">—</span>
                )}
            </button>
        </TaskLinkedDocsPopover>
    );
}
