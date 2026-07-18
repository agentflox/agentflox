"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, MoveRight, ChevronDown, Search, Network, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpaceMoveToModalProps {
    spaceId: string;
    spaceName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function SpaceMoveToModal({ spaceId, spaceName, open, onOpenChange, onSuccess }: SpaceMoveToModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();

    const [destinationSearch, setDestinationSearch] = useState("");
    const [destinationOpen, setDestinationOpen] = useState(false);
    const [destinationKey, setDestinationKey] = useState("");

    const { data: workspacesData } = trpc.workspace.list.useQuery(undefined, { enabled: open });
    const workspaces = workspacesData || [];

    const selectedWorkspace = workspaces.find(w => w.id === destinationKey);
    const updateSpace = trpc.space.update.useMutation();

    const handleMove = async () => {
        if (!spaceId || !destinationKey) return;
        
        try {
            await updateSpace.mutateAsync({
                id: spaceId,
                // workspaceId: destinationKey
            } as any);

            toast({ title: "Space moved successfully" });
            utils.space.list.invalidate();
            onOpenChange(false);
            onSuccess?.();
            setDestinationKey("");
        } catch (error: any) {
            toast({
                title: "Failed to move space",
                description: error.message || "Please try again later.",
                variant: "destructive"
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MoveRight className="h-5 w-5 text-indigo-500" />
                        Move Space
                    </DialogTitle>
                    <DialogDescription>
                        Select a new workspace for <span className="font-semibold text-slate-700">{spaceName}</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            Destination Workspace
                        </label>
                        <Popover open={destinationOpen} onOpenChange={setDestinationOpen}>
                            <PopoverTrigger asChild>
                                <button type="button" className="h-9 w-full border border-slate-200 bg-white text-[14px] shadow-sm text-slate-700 rounded-md px-3 flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500">
                                    <span className={cn("truncate text-left", !selectedWorkspace && "text-slate-400")}>
                                        {selectedWorkspace ? selectedWorkspace.name : "Select Workspace"}
                                    </span>
                                    <ChevronDown className="size-4 opacity-50" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-[380px] p-0 shadow-lg">
                                <div className="p-2 border-b border-slate-100">
                                    <div className="flex items-center rounded-md border border-indigo-500 px-2 h-9">
                                        <Search className="size-4 text-slate-400 shrink-0" />
                                        <input
                                            value={destinationSearch}
                                            onChange={(e) => setDestinationSearch(e.target.value)}
                                            placeholder="Search workspaces..."
                                            className="w-full bg-transparent px-2 text-sm outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="max-h-[320px] overflow-y-auto py-1">
                                    {workspaces.filter((w: any) => !destinationSearch.trim() || w.name.toLowerCase().includes(destinationSearch.toLowerCase())).map((workspace: any) => (
                                        <button
                                            key={workspace.id}
                                            type="button"
                                            onClick={() => { setDestinationKey(workspace.id); setDestinationOpen(false); }}
                                            className={cn(
                                                "w-full flex items-center justify-between py-2 px-3 text-left text-[13.5px] cursor-pointer hover:bg-slate-50",
                                                destinationKey === workspace.id && "bg-indigo-50 text-indigo-700"
                                            )}
                                        >
                                            <span className="flex items-center gap-2">
                                                <Network className="size-3.5 text-slate-400 shrink-0" />
                                                <span className="font-medium">{workspace.name}</span>
                                            </span>
                                            {destinationKey === workspace.id && <Check className="size-3.5 text-indigo-600 shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateSpace.isPending}>
                        Cancel
                    </Button>
                    <Button onClick={handleMove} disabled={!destinationKey || updateSpace.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                        {updateSpace.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Move Space
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
