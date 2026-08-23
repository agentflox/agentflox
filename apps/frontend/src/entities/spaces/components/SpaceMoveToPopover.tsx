"use client";

import { useState } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, LogOut, ChevronRight, Search, Network } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpaceMoveToPopoverProps {
    spaceId: string;
    spaceName: string;
    onSuccess?: () => void;
}

export function SpaceMoveToPopover({ spaceId, spaceName, onSuccess }: SpaceMoveToPopoverProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();

    const [open, setOpen] = useState(false);
    const [destinationSearch, setDestinationSearch] = useState("");
    const [isMoving, setIsMoving] = useState(false);
    const [movingToId, setMovingToId] = useState<string | null>(null);

    const { data: workspacesData } = trpc.workspace.list.useQuery({}, { enabled: open });
    const workspaces = workspacesData?.items || [];

    const updateSpace = trpc.space.update.useMutation();

    const handleMove = async (workspaceId: string) => {
        if (!spaceId) return;
        setIsMoving(true);
        setMovingToId(workspaceId);
        
        try {
            await updateSpace.mutateAsync({
                id: spaceId,
                // workspaceId: workspaceId
            } as any);

            toast({ title: "Space moved successfully" });
            utils.space.list.invalidate();
            setOpen(false);
            onSuccess?.();
        } catch (error: any) {
            toast({
                title: "Failed to move space",
                description: error.message || "Please try again later.",
                variant: "destructive"
            });
        } finally {
            setIsMoving(false);
            setMovingToId(null);
        }
    };

    const triggerNode = (
        <button
            type="button"
            className="flex items-center justify-between px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
        >
            <div className="flex items-center gap-2">
                <LogOut className="h-4 w-4 shrink-0 text-zinc-500" />
                <span>Move</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
        </button>
    );

    return (
        <HoverCard open={open} onOpenChange={setOpen} openDelay={150} closeDelay={200}>
            <HoverCardTrigger asChild>
                <div onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen(!open);
                }}>
                    {triggerNode}
                </div>
            </HoverCardTrigger>
            <HoverCardContent align="start" side="right" sideOffset={8} className="w-64 p-1.5 bg-white rounded-xl shadow-xl border border-zinc-200/90 flex flex-col gap-0.5 z-[9999]">
                <div className="p-1 pb-1.5 border-b border-zinc-100 mb-1">
                    <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50/50 px-2.5 h-8 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                        <Search className="size-3.5 text-zinc-400 shrink-0" />
                        <input
                            value={destinationSearch}
                            onChange={(e) => setDestinationSearch(e.target.value)}
                            placeholder="Search workspaces..."
                            className="w-full bg-transparent px-2 text-xs outline-none placeholder:text-zinc-400"
                            autoFocus
                        />
                    </div>
                </div>
                <div className="max-h-[320px] overflow-y-auto py-0.5 space-y-0.5">
                    {workspaces.filter((w: any) => !destinationSearch.trim() || w.name.toLowerCase().includes(destinationSearch.toLowerCase())).length === 0 ? (
                        <div className="px-3 py-2 text-sm text-zinc-500 text-center italic">No workspaces found</div>
                    ) : (
                        workspaces.filter((w: any) => !destinationSearch.trim() || w.name.toLowerCase().includes(destinationSearch.toLowerCase())).map((workspace: any) => (
                            <button
                                key={workspace.id}
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleMove(workspace.id);
                                }}
                                disabled={isMoving}
                                className={cn(
                                    "w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer transition-colors font-normal",
                                    isMoving && movingToId === workspace.id && "bg-indigo-50 text-indigo-700 pointer-events-none"
                                )}
                            >
                                {isMoving && movingToId === workspace.id ? (
                                    <Loader2 className="size-3.5 text-indigo-500 shrink-0 animate-spin" />
                                ) : (
                                    <Network className="size-3.5 text-zinc-400 shrink-0" />
                                )}
                                <span className="font-medium truncate flex-1">{workspace.name}</span>
                            </button>
                        ))
                    )}
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}
