"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Search, Folder, List as ListIcon, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DestinationPickerProps {
    workspaceId: string;
    onSelect: (listId: string) => void;
    className?: string;
}

export function DestinationPicker({ workspaceId, onSelect, className }: DestinationPickerProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const { data: listsResponse } = trpc.list.byContext.useQuery(
        { workspaceId },
        { enabled: !!workspaceId }
    );

    const hierarchy = useMemo(() => {
        if (!listsResponse?.items) return [];

        const spacesMap = new Map<string, any>();
        const orphanLists: any[] = [];

        listsResponse.items.forEach((list: any) => {
            if (searchQuery && !list.name.toLowerCase().includes(searchQuery.toLowerCase())) return;

            if (list.spaceId) {
                if (!spacesMap.has(list.spaceId)) {
                    spacesMap.set(list.spaceId, {
                        ...list.space,
                        folders: new Map<string, any>(),
                        rootLists: []
                    });
                }
                const space = spacesMap.get(list.spaceId);
                if (list.folderId) {
                    if (!space.folders.has(list.folderId)) {
                        space.folders.set(list.folderId, {
                            ...list.folder,
                            lists: []
                        });
                    }
                    space.folders.get(list.folderId).lists.push(list);
                } else {
                    space.rootLists.push(list);
                }
            } else {
                orphanLists.push(list);
            }
        });

        const hierarchyArr: any[] = Array.from(spacesMap.values()).map(space => ({
            ...space,
            folders: Array.from(space.folders.values())
        }));

        if (orphanLists.length > 0) {
            hierarchyArr.unshift({
                id: 'orphan',
                name: 'Personal Lists',
                folders: [],
                rootLists: orphanLists,
                color: '#A1A1AA' // zinc-400
            });
        }

        return hierarchyArr;
    }, [listsResponse, searchQuery]);

    return (
        <div className={cn("flex flex-col", className)}>
            <div className="p-2 border-b border-zinc-50 bg-zinc-50/50 shrink-0">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                    <Input
                        placeholder="Search lists..."
                        className="h-8 pl-8 text-xs bg-white border-zinc-200/60 focus-visible:ring-0"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            <ScrollArea className="h-[300px]">
                <div className="p-1">
                    {hierarchy.map((space: any) => (
                        <div key={space.id} className="mb-2">
                            <div className="flex items-center gap-2 px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: space.color || '#A1A1AA' }} />
                                {space.name}
                            </div>
                            <div className="space-y-0.5 mt-1">
                                {space.folders.map((folder: any) => (
                                    <div key={folder.id}>
                                        <div className="flex items-center px-2 py-1 text-[11px] text-zinc-500 font-medium">
                                            <Folder className="h-3 w-3 mr-2 text-zinc-300" />
                                            {folder.name}
                                        </div>
                                        <div className="pl-3">
                                            {folder.lists.map((list: any) => (
                                                <DestinationItem
                                                    key={list.id}
                                                    name={list.name}
                                                    onClick={() => onSelect(list.id)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {space.rootLists.map((list: any) => (
                                    <DestinationItem
                                        key={list.id}
                                        name={list.name}
                                        onClick={() => onSelect(list.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                    {hierarchy.length === 0 && (
                        <div className="p-8 text-center text-xs text-zinc-400 italic">
                            No lists found
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

function DestinationItem({ name, onClick }: { name: string, onClick: () => void }) {
    return (
        <div
            className="flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-all group hover:bg-zinc-50"
            onClick={onClick}
        >
            <div className="flex items-center overflow-hidden">
                <ListIcon className="h-3.5 w-3.5 mr-2 shrink-0 text-zinc-400 group-hover:text-zinc-500 transition-colors" />
                <div className="truncate text-xs text-zinc-600 group-hover:text-zinc-900 transition-colors">
                    {name}
                </div>
            </div>
            <ChevronRight className="h-3 w-3 text-zinc-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
        </div>
    );
}
