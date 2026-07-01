"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, Archive } from "lucide-react";

interface DocumentArchiveModalProps {
    documentId: string | null;
    documentName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function DocumentArchiveModal({ documentId, documentName, open, onOpenChange, onSuccess }: DocumentArchiveModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const queryClient = useQueryClient();

    // Recursively collect all descendant IDs from the cached tree
    const collectDescendantIds = (items: any[], rootId: string): Set<string> => {
        const ids = new Set<string>();
        const collect = (nodeId: string) => {
            ids.add(nodeId);
            items.forEach(item => {
                if (item.id === nodeId && item.children) {
                    item.children.forEach((child: any) => collect(child.id));
                }
            });
        };
        collect(rootId);
        return ids;
    };

    const archiveDocument = trpc.document.archive.useMutation({
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: [['document', 'list']] });

            const previousData = queryClient.getQueriesData({ queryKey: [['document', 'list']] });

            queryClient.setQueriesData({ queryKey: [['document', 'list']] }, (oldData: any) => {
                if (!oldData || !oldData.items) return oldData;
                const toRemove = collectDescendantIds(oldData.items, documentId!);
                const filterTree = (items: any[]): any[] => {
                    return items
                        .filter(item => !toRemove.has(item.id))
                        .map(item => ({
                            ...item,
                            children: item.children ? filterTree(item.children) : item.children
                        }));
                };
                const filtered = filterTree(oldData.items);
                return {
                    ...oldData,
                    items: filtered,
                    total: Math.max(0, oldData.total - toRemove.size)
                };
            });

            return { previousData };
        },
        onSuccess: () => {
            toast({ title: "Document archived" });
            utils.document.list.invalidate();
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (err, _variables, context: any) => {
            if (context?.previousData) {
                context.previousData.forEach(([queryKey, data]: [any, any]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            toast({
                title: "Failed to archive document",
                description: err.message,
                variant: "destructive"
            });
        }
    });

    if (!documentId) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Archive className="h-5 w-5 text-amber-500" />
                        Archive Document
                    </DialogTitle>
                    <DialogDescription className="pt-2">
                        Are you sure you want to archive <span className="font-semibold text-zinc-900">{documentName}</span>?
                        Archived documents are hidden from the main view but can be restored later.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="gap-2 sm:gap-0 mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={() => archiveDocument.mutate({ id: documentId, isArchived: true })}
                        disabled={archiveDocument.isPending}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                        {archiveDocument.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Archive className="h-4 w-4 mr-2" />
                        )}
                        Archive Document
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
