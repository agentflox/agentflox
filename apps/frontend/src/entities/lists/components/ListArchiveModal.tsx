"use client";

import { useQueryClient } from "@tanstack/react-query";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, Archive, Info } from "lucide-react";

interface ListArchiveModalProps {
    listId: string;
    listName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function ListArchiveModal({ listId, listName, open, onOpenChange, onSuccess }: ListArchiveModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const queryClient = useQueryClient();

    const archiveList = trpc.list.update.useMutation({
        onMutate: async () => {
            // Optimistic update - mark list as archived immediately in the list
            queryClient.setQueryData(['list', 'byContext'], (oldData: any) => {
                if (!oldData || !oldData.items) return oldData;
                return {
                    ...oldData,
                    items: oldData.items.filter((item: any) => item.id !== listId)
                };
            });
        },
        onSuccess: () => {
            toast({ title: "List archived successfully" });
            utils.list.byContext.invalidate();
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (err) => {
            // Revert optimistic update if possible or just show error
            utils.list.byContext.invalidate();
            toast({
                title: "Failed to archive list",
                description: err.message,
                variant: "destructive"
            })
        }
    });

    const handleArchive = () => {
        if (!listId) return;
        archiveList.mutate({ id: listId, isArchived: true });
    };

    if (!listId) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Archive className="h-5 w-5 text-amber-600" />
                        Archive List
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500 leading-relaxed pr-4">
                        This will hide <strong className="font-semibold text-zinc-700">"{listName}"</strong> from the sidebar. All data stays intact and the list can be restored anytime.{" "}
                        <span className="group relative inline-flex align-middle">
                            <Info className="h-4 w-4 text-zinc-300 hover:text-amber-500 transition-colors duration-150 cursor-help translate-y-[-3px]" />
                            <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 rounded-lg bg-zinc-900 text-white text-[12px] leading-snug px-2.5 py-2 shadow-lg opacity-0 scale-95 origin-bottom group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-20">
                                Tasks and data remain intact, and the list stays hidden until it's restored.
                                <span className="absolute top-full left-1/2 -translate-x-1/2 h-2 w-2 -mt-1 rotate-45 bg-zinc-900" />
                            </span>
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="gap-2.5 sm:gap-2.5 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={archiveList.isPending}
                        className="border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 disabled:opacity-50"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleArchive}
                        disabled={archiveList.isPending}
                        className="border border-amber-700/10 bg-gradient-to-b from-amber-500 to-amber-600 font-medium text-white shadow-sm shadow-amber-900/10 transition-all duration-150 hover:from-amber-500 hover:to-amber-700 hover:shadow-md hover:shadow-amber-900/20 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 active:shadow-inner disabled:opacity-60 disabled:hover:shadow-sm"
                    >
                        {archiveList.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Archive className="mr-2 h-4 w-4" />
                        Archive List
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
