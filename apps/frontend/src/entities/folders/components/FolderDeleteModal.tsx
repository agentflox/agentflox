"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";

interface FolderDeleteModalProps {
    folderId: string;
    folderName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function FolderDeleteModal({ folderId, folderName, open, onOpenChange, onSuccess }: FolderDeleteModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const queryClient = useQueryClient();

    const deleteFolder = trpc.folder.delete.useMutation({
        onMutate: async () => {
            queryClient.setQueriesData({ queryKey: [['folder', 'byContext']] }, (oldData: any) => {
                if (!oldData || !oldData.items) return oldData;
                return {
                    ...oldData,
                    items: oldData.items.filter((item: any) => item.id !== folderId)
                };
            });
        },
        onSuccess: () => {
            toast({ title: "Folder deleted permanently" });
            utils.folder.byContext.invalidate();
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (err) => toast({
            title: "Failed to delete folder",
            description: err.message,
            variant: "destructive"
        })
    });

    const handleDelete = () => {
        if (!folderId) return;
        deleteFolder.mutate({ id: folderId });
    };

    if (!folderId) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-900">
                        <AlertTriangle className="h-5 w-5" />
                        Delete Folder Permanently
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500 leading-relaxed pr-4">
                        This will permanently delete <strong className="font-semibold text-zinc-700">"{folderName}"</strong> and all of its data. This action is irreversible and cannot be undone.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="gap-2.5 sm:gap-2.5 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={deleteFolder.isPending}
                        className="border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 disabled:opacity-50"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={handleDelete}
                        disabled={deleteFolder.isPending}
                        className="border border-red-800/10 bg-gradient-to-b from-red-600 to-red-700 font-medium text-white shadow-sm shadow-red-900/10 transition-all duration-150 hover:bg-gradient-to-b hover:from-red-600 hover:to-red-800 hover:shadow-md hover:shadow-red-900/20 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 active:shadow-inner disabled:opacity-60 disabled:hover:shadow-sm"
                    >
                        {deleteFolder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Forever
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
