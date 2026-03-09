"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Folder, List as ListIcon, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface MoveTaskModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: any;
    workspaceId: string;
}

export function MoveTaskModal({ open, onOpenChange, task, workspaceId }: MoveTaskModalProps) {
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch all lists in the workspace to build the full hierarchy
    const { data: listsResponse } = trpc.list.byContext.useQuery(
        { workspaceId },
        { enabled: open }
    );

    const updateTask = trpc.task.update.useMutation({
        onSuccess: () => {
            toast.success("Task moved");
            onOpenChange(false);
        },
        onError: () => toast.error("Failed to move task")
    });

    const handleMove = (listId: string) => {
        if (listId === task.listId) return;
        updateTask.mutate({
            id: task.id,
            listId: listId
        });
    };

    // Group lists by Space -> Folder -> List
    const hierarchy = useMemo(() => {
        if (!listsResponse?.items) return [];

        const spacesMap = new Map<string, any>();
        const orphanLists: any[] = []; // Lists not in a space (e.g. workspace level?) - schema requires space usually or project

        listsResponse.items.forEach((list: any) => {
            // Filter by search query
            if (searchQuery && !list.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                // Simple list filtering, ideally we search spaces too
                return;
            }

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

        // Convert Maps to Arrays for rendering
        return Array.from(spacesMap.values()).map(space => ({
            ...space,
            folders: Array.from(space.folders.values())
        }));
    }, [listsResponse, searchQuery]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[300px] p-0 gap-0 overflow-hidden">
                <div className="p-2 border-b">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                        <Input
                            placeholder="Search..."
                            className="h-8 pl-8 text-xs bg-zinc-50 border-none focus-visible:ring-0"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <ScrollArea className="h-[300px]">
                    <div className="py-2">
                        {/* Spaces Section */}
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-2">
                            Spaces
                        </div>
                        <div className="px-1">
                            {hierarchy.map((space: any) => (
                                <div key={space.id}>
                                    <div className="flex items-center px-2 py-1.5 bg-zinc-50/50 rounded-sm text-sm text-zinc-700 font-medium">
                                        <div className="h-4 w-4 bg-zinc-600 rounded mr-2 flex items-center justify-center text-[8px] text-white">
                                            {space.name?.[0] || "S"}
                                        </div>
                                        {space.name}
                                    </div>
                                    <div className="pl-2">
                                        {/* Folders */}
                                        {space.folders.map((folder: any) => (
                                            <div key={folder.id}>
                                                <div className="flex items-center px-2 py-1.5 text-xs text-zinc-500 font-medium">
                                                    <Folder className="h-3 w-3 mr-2" />
                                                    {folder.name}
                                                </div>
                                                <div className="pl-4">
                                                    {folder.lists.map((list: any) => (
                                                        <ListItem
                                                            key={list.id}
                                                            name={list.name}
                                                            icon={ListIcon}
                                                            isSelected={list.id === task.listId}
                                                            onClick={() => handleMove(list.id)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {/* Root Lists */}
                                        {space.rootLists.map((list: any) => (
                                            <ListItem
                                                key={list.id}
                                                name={list.name}
                                                icon={ListIcon}
                                                isSelected={list.id === task.listId}
                                                onClick={() => handleMove(list.id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {hierarchy.length === 0 && (
                                <div className="p-4 text-center text-xs text-zinc-400">
                                    No lists found
                                </div>
                            )}
                        </div>
                    </div>
                </ScrollArea>

                <div className="p-2 border-t bg-zinc-50 flex items-center gap-2">
                    <div className="h-3.5 w-3.5 border rounded" />
                    <span className="text-xs text-zinc-600">Move and keep in current List (Copy)</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ListItem({ name, icon: Icon, isSelected, onClick, className }: any) {
    return (
        <div
            className={cn("flex items-center justify-between px-2 py-1.5 hover:bg-zinc-100 rounded-sm cursor-pointer text-sm text-zinc-600 group", className)}
            onClick={onClick}
        >
            <div className="flex items-center overflow-hidden">
                <Icon className="h-3.5 w-3.5 mr-2 text-zinc-400 shrink-0" />
                <div className="truncate">
                    {name}
                </div>
            </div>
            {isSelected && <Check className="h-3.5 w-3.5 text-zinc-900" />}
        </div>
    )
}
