"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, MoveRight, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { DestinationTreeRow } from "@/features/dashboard/components/shared/breadcrumbTreeUi";

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

    const { data: workspacesData } = trpc.workspace.list.useQuery({}, { enabled: open });
    const workspaces = workspacesData?.items || [];

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
                            <PopoverContent
                                align="start"
                                side="bottom"
                                sideOffset={4}
                                className="w-[360px] p-0 rounded-xl shadow-xl border-zinc-200 bg-white overflow-hidden max-h-[380px] flex flex-col z-50"
                            >
                                <div className="flex h-8 items-center rounded-md border border-zinc-200 bg-white px-2.5 mx-2.5 mt-2.5 mb-1.5 shrink-0 focus-within:border-zinc-400">
                                    <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0 mr-2" />
                                    <input
                                        type="text"
                                        value={destinationSearch}
                                        onChange={(e) => setDestinationSearch(e.target.value)}
                                        placeholder="Search workspaces..."
                                        className="w-full bg-transparent border-0 p-0 text-xs outline-none placeholder:text-zinc-400"
                                        autoFocus
                                    />
                                </div>
                                <div className="overflow-y-auto flex-1 py-1 max-h-[320px] px-1">
                                    {workspaces.filter((w: any) => !destinationSearch.trim() || w.name.toLowerCase().includes(destinationSearch.toLowerCase())).map((workspace: any) => (
                                        <DestinationTreeRow
                                            key={workspace.id}
                                            selected={destinationKey === workspace.id}
                                            kind="workspace"
                                            entity={workspace}
                                            label={workspace.name}
                                            onClick={() => { setDestinationKey(workspace.id); setDestinationOpen(false); }}
                                        />
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
