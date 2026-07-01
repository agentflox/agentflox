"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";

interface DocumentDeleteModalProps {
    documentId: string | null;
    documentName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function DocumentDeleteModal({ documentId, documentName, open, onOpenChange, onSuccess }: DocumentDeleteModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const queryClient = useQueryClient();

    // Collect all descendant IDs from the cached tree recursively
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

    const deleteDocument = trpc.document.delete.useMutation({
        onMutate: async () => {
            // Cancel any in-flight refetches to avoid overwriting our optimistic update
            await queryClient.cancelQueries({ queryKey: [['document', 'list']] });

            // Snapshot previous data for rollback
            const previousData = queryClient.getQueriesData({ queryKey: [['document', 'list']] });

            queryClient.setQueriesData({ queryKey: [['document', 'list']] }, (oldData: any) => {
                if (!oldData || !oldData.items) return oldData;
                const toDelete = collectDescendantIds(oldData.items, documentId!);
                const filterTree = (items: any[]): any[] => {
                    return items
                        .filter(item => !toDelete.has(item.id))
                        .map(item => ({
                            ...item,
                            children: item.children ? filterTree(item.children) : item.children
                        }));
                };
                const filtered = filterTree(oldData.items);
                return {
                    ...oldData,
                    items: filtered,
                    total: Math.max(0, oldData.total - toDelete.size)
                };
            });

            return { previousData };
        },
        onSuccess: () => {
            toast({
                title: "Document deleted permanently",
                icon: <Trash2 className="h-4 w-4 text-destructive" />,
            });
            utils.document.list.invalidate();
            onOpenChange(false);
            onSuccess?.();
            resetForm();
        },
        onError: (err, _variables, context: any) => {
            // Rollback optimistic update
            if (context?.previousData) {
                context.previousData.forEach(([queryKey, data]: [any, any]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            toast({
                title: "Failed to delete document",
                description: err.message,
                variant: "destructive"
            });
        }
    });

    const resetForm = () => { };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            resetForm();
        }
        onOpenChange(newOpen);
    };

    const isDeleteEnabled = !deleteDocument.isPending;

    if (!documentId) return null;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center text-red-600 gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Delete Document
                    </DialogTitle>
                    <DialogDescription className="pt-4">
                        This action <span className="font-semibold text-zinc-900">cannot</span> be undone. This will permanently delete the document
                        <span className="font-semibold text-zinc-900"> {documentName} </span> and all its contents.
                    </DialogDescription>
                </DialogHeader>


                <DialogFooter className="border-t mt-2">
                    <div className="flex items-center justify-between gap-3 pt-6 sm:gap-4">
                        <Button
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            className="rounded-lg shadow-sm border-slate-200 text-slate-700 hover:bg-slate-50 font-medium px-5"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteDocument.mutate({ id: documentId })}
                            disabled={!isDeleteEnabled}
                            className="rounded-lg shadow-sm bg-red-600 hover:bg-red-700 font-medium px-5 transition-all"
                        >
                            {deleteDocument.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Delete Document
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
