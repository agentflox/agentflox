'use client';

import * as React from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface DocPickerPopoverProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceId: string;
    onSelect: (documentId: string, documentTitle: string) => void;
    trigger?: React.ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    existingIds?: string[];
}

export function DocPickerPopover({
    open,
    onOpenChange,
    workspaceId,
    onSelect,
    trigger,
    side = 'bottom',
    align = 'start',
    existingIds = []
}: DocPickerPopoverProps) {
    const [searchInput, setSearchInput] = React.useState('');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedId, setSelectedId] = React.useState<string | null>(null);

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
    const filteredDocs = docs.filter((d: any) => !existingIds.includes(d.id));

    return (
        <Popover modal={true} open={open} onOpenChange={onOpenChange}>
            {trigger && <PopoverTrigger asChild>{trigger}</PopoverTrigger>}
            <PopoverContent className="w-[380px] p-0 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg" align={align} side={side} sideOffset={4} collisionPadding={16}>
                <div className="p-2 space-y-2">
                    <div className="flex h-9 items-center rounded-md border border-zinc-200 bg-white px-2 transition-colors focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10">
                        <Search className="h-4 w-4 shrink-0 text-zinc-400 mr-2" />
                        <Input
                            variant="ghost"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search..."
                            className="h-full w-full bg-transparent p-0 focus:outline-none focus:ring-0 focus-visible:ring-0 text-[13px] shadow-none border-0 placeholder:text-zinc-400"
                            autoFocus
                        />
                    </div>

                    <div className="flex items-center justify-between px-2 pt-1">
                        <span className="text-[11px] font-semibold text-zinc-500">
                            {searchQuery ? 'Results' : 'Recent Docs'}
                        </span>
                    </div>

                    <div className="max-h-[280px] overflow-y-auto space-y-0.5 px-1 pb-1">
                        {filteredDocs.length === 0 ? (
                            <div className="py-8 text-center text-[13px] text-zinc-500">
                                {searchQuery ? 'No documents found.' : 'No recent documents.'}
                            </div>
                        ) : (
                            filteredDocs.map((d: any) => (
                                <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => { setSelectedId(d.id); onSelect(d.id, d.title || 'Untitled Doc'); onOpenChange(false); setSearchInput(''); setSearchQuery(''); }}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-zinc-50 rounded-md transition-colors cursor-pointer",
                                        selectedId === d.id && "bg-zinc-100"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "h-3.5 w-3.5 rounded-full border-[1.5px] shrink-0 border-dashed",
                                            selectedId === d.id ? "border-indigo-500 bg-indigo-500" : "border-zinc-300"
                                        )}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[13px] font-medium text-zinc-900 truncate leading-tight">
                                            {d.title || 'Untitled Doc'}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
