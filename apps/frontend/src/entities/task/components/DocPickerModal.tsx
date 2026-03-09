'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface DocPickerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceId: string;
    onSelect: (documentId: string, documentTitle: string) => void;
}

export function DocPickerModal({
    open,
    onOpenChange,
    workspaceId,
    onSelect,
}: DocPickerModalProps) {
    const [searchInput, setSearchInput] = React.useState('');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedId, setSelectedId] = React.useState<string | null>(null);

    // Debounce search so we don't fire a request on every keystroke
    React.useEffect(() => {
        const handle = setTimeout(() => {
            setSearchQuery(searchInput.trim());
        }, 300);
        return () => clearTimeout(handle);
    }, [searchInput]);

    const { data: docListData } = trpc.document.list.useQuery(
        {
            workspaceId,
            query: searchQuery || undefined,
            pageSize: 30,
        },
        { enabled: open && !!workspaceId }
    );

    const docs = docListData?.items ?? [];
    const total = docListData?.total ?? 0;

    const handleConfirm = () => {
        if (selectedId) {
            const doc = docs.find((d: any) => d.id === selectedId);
            if (doc) {
                onSelect(doc.id, doc.title);
                onOpenChange(false);
                setSelectedId(null);
                setSearchInput('');
                setSearchQuery('');
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden rounded-lg border border-zinc-200 bg-white [&>button]:hidden">
                <DialogTitle className="sr-only">Select document</DialogTitle>
                <div className="p-4 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search for document name..."
                            className="pl-9 h-10 rounded-md border-zinc-200"
                            autoFocus
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-700">
                            {searchQuery.trim() ? 'Results' : ' Browse docs'}
                        </span>
                    </div>

                    <div className="max-h-[320px] overflow-y-auto border border-zinc-100 rounded-md divide-y divide-zinc-100">
                        {docs.length === 0 ? (
                            <div className="py-8 text-center text-sm text-zinc-500">
                                {searchQuery ? 'No documents found.' : 'No documents in this workspace.'}
                            </div>
                        ) : (
                            docs.map((doc: any) => (
                                <button
                                    key={doc.id}
                                    type="button"
                                    onClick={() => setSelectedId(doc.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-50 transition-colors",
                                        selectedId === doc.id && "bg-zinc-100"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "h-4 w-4 rounded-full border-2 shrink-0",
                                            selectedId === doc.id ? "border-purple-500 bg-purple-500" : "border-zinc-300"
                                        )}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-zinc-900 truncate">
                                            {doc.title}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            className="bg-zinc-900 hover:bg-zinc-800"
                            disabled={!selectedId}
                            onClick={handleConfirm}
                        >
                            Add
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
