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
                    <DialogDescription>
                        Are you sure you want to archive "{listName}"?
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
                        <div className="flex gap-3">
                            <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="font-semibold text-amber-900 text-sm">What happens when you archive?</h4>
                                <ul className="mt-2 space-y-1 text-sm text-amber-700">
                                    <li className="flex items-start gap-2">
                                        <span className="text-amber-600">•</span>
                                        <span>List becomes hidden from sidebar</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-amber-600">•</span>
                                        <span>All tasks and data remain intact</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-amber-600">•</span>
                                        <span>Can be restored anytime</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={archiveList.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleArchive}
                        disabled={archiveList.isPending}
                        className="bg-amber-600 hover:bg-amber-700"
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
