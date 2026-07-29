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
            className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900"
        >
            <LogOut className="mr-2 h-4 w-4" /> Move
            <ChevronRight className="ml-auto h-4 w-4" />
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
            <HoverCardContent align="start" side="right" sideOffset={5} className="w-64 p-0 z-[9999] shadow-md border-muted">
                <div className="p-2 border-b border-slate-100">
                    <div className="flex items-center rounded-md border border-indigo-500 px-2 h-9">
                        <Search className="size-4 text-slate-400 shrink-0" />
                        <input
                            value={destinationSearch}
                            onChange={(e) => setDestinationSearch(e.target.value)}
                            placeholder="Search workspaces..."
                            className="w-full bg-transparent px-2 text-sm outline-none"
                            autoFocus
                        />
                    </div>
                </div>
                <div className="max-h-[320px] overflow-y-auto py-1">
                    {workspaces.filter((w: any) => !destinationSearch.trim() || w.name.toLowerCase().includes(destinationSearch.toLowerCase())).length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500 text-center italic">No workspaces found</div>
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
                                    "w-full flex items-center gap-2 py-2 px-3 text-left text-[13.5px] cursor-pointer hover:bg-slate-50 transition-colors",
                                    isMoving && movingToId === workspace.id && "bg-indigo-50 text-indigo-700 pointer-events-none"
                                )}
                            >
                                {isMoving && movingToId === workspace.id ? (
                                    <Loader2 className="size-3.5 text-indigo-500 shrink-0 animate-spin" />
                                ) : (
                                    <Network className="size-3.5 text-slate-400 shrink-0" />
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
