"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Folder, Check, User, Users, Network, ListChecks } from "lucide-react";
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

    const { data: personalList } = trpc.list.getPersonal.useQuery(undefined, { enabled: open });

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

    const recentLists = useMemo(() => listsResponse?.items?.slice(0, 10) || [], [listsResponse]);

    // Group lists by Space -> Folder -> List
    const hierarchy = useMemo(() => {
        if (!listsResponse?.items) return [];

        const spacesMap = new Map<string, any>();

        listsResponse.items.forEach((list: any) => {
            // Filter by search query
            if (searchQuery && !list.name.toLowerCase().includes(searchQuery.toLowerCase())) {
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
            <DialogContent className="sm:max-w-[320px] p-0 gap-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg [&>button]:hidden">
                <DialogTitle className="sr-only">Move Task</DialogTitle>
                
                <div className="p-2 border-b border-zinc-100">
                    <div className="flex h-9 items-center rounded-md border border-zinc-200 bg-white px-3 shadow-sm transition-colors focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10">
                        <Search className="h-4 w-4 shrink-0 text-zinc-400 mr-2" />
                        <Input
                            variant="ghost"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search..."
                            className="h-full w-full bg-transparent p-0 focus:outline-none focus:ring-0 focus-visible:ring-0 text-sm shadow-none border-0 placeholder:text-zinc-400"
                            autoFocus
                        />
                    </div>
                </div>

                <ScrollArea className="h-[380px]">
                    <div className="py-2">
                        {/* Personal List */}
                        {(!searchQuery || "personal list".includes(searchQuery.toLowerCase())) && personalList && (
                            <div className="pb-2">
                                <button
                                    type="button"
                                    onClick={() => handleMove(personalList.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between py-1.5 px-4 text-left text-[13.5px] cursor-pointer hover:bg-slate-50",
                                        task.listId === personalList.id && "bg-indigo-50 text-indigo-700"
                                    )}
                                >
                                    <span className="flex items-center gap-2">
                                        <User className="size-4 text-slate-500 shrink-0" />
                                        <span className="font-medium text-slate-700">Personal List</span>
                                    </span>
                                    {task.listId === personalList.id && <Check className="size-3.5 text-indigo-600 shrink-0" />}
                                </button>
                            </div>
                        )}

                        {/* Recents */}
                        {!searchQuery && recentLists.length > 0 && (
                            <div className="pb-2">
                                <div className="px-4 py-1.5 text-[11px] font-semibold text-slate-400">Recents</div>
                                {recentLists.map((list: any) => (
                                    <button
                                        key={`recent-${list.id}`}
                                        type="button"
                                        onClick={() => handleMove(list.id)}
                                        className={cn(
                                            "w-full flex items-center justify-between py-1.5 px-4 text-left text-[13.5px] cursor-pointer hover:bg-slate-50",
                                            task.listId === list.id && "bg-indigo-50 text-indigo-700"
                                        )}
                                    >
                                        <span className="flex items-center gap-2">
                                            <ListChecks className="size-4 text-indigo-500 shrink-0" />
                                            <span className="text-slate-700 font-medium">{list.name}</span>
                                        </span>
                                        {task.listId === list.id && <Check className="size-3.5 text-indigo-600 shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Spaces */}
                        <div className="border-t border-slate-100 pt-2">
                            <div className="px-4 py-1.5 text-[11px] font-semibold text-slate-400">Spaces</div>
                            {hierarchy.map((space: any) => (
                                <div key={space.id}>
                                    <div className="flex items-center px-4 py-1.5 text-[13.5px] text-slate-700 font-medium">
                                        <Users className="size-4 text-blue-500 mr-2 shrink-0 fill-blue-500/20" />
                                        {space.name}
                                    </div>
                                    
                                    {/* Folders */}
                                    {space.folders.map((folder: any) => (
                                        <div key={folder.id}>
                                            <div className="flex items-center px-4 py-1.5 text-[13.5px] text-slate-600 font-medium pl-9">
                                                <Folder className="size-4 text-slate-400 mr-2 shrink-0" />
                                                {folder.name}
                                            </div>
                                            {folder.lists.map((list: any) => (
                                                <button
                                                    key={list.id}
                                                    type="button"
                                                    onClick={() => handleMove(list.id)}
                                                    className={cn(
                                                        "w-full flex items-center justify-between py-1.5 px-4 text-left text-[13.5px] cursor-pointer hover:bg-slate-50 pl-[52px]",
                                                        task.listId === list.id && "bg-indigo-50 text-indigo-700"
                                                    )}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <ListChecks className="size-4 text-indigo-500 shrink-0" />
                                                        <span className="text-slate-700">{list.name}</span>
                                                    </span>
                                                    {task.listId === list.id && <Check className="size-3.5 text-indigo-600 shrink-0" />}
                                                </button>
                                            ))}
                                        </div>
                                    ))}
                                    
                                    {/* Root Lists */}
                                    {space.rootLists.map((list: any) => (
                                        <button
                                            key={list.id}
                                            type="button"
                                            onClick={() => handleMove(list.id)}
                                            className={cn(
                                                "w-full flex items-center justify-between py-1.5 px-4 text-left text-[13.5px] cursor-pointer hover:bg-slate-50 pl-9",
                                                task.listId === list.id && "bg-indigo-50 text-indigo-700"
                                            )}
                                        >
                                            <span className="flex items-center gap-2">
                                                <ListChecks className="size-4 text-indigo-500 shrink-0" />
                                                <span className="text-slate-700">{list.name}</span>
                                            </span>
                                            {task.listId === list.id && <Check className="size-3.5 text-indigo-600 shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            ))}
                            {hierarchy.length === 0 && (
                                <div className="p-4 text-center text-xs text-zinc-400">
                                    No spaces found
                                </div>
                            )}
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

