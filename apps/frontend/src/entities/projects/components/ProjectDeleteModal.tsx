"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";

interface ProjectDeleteModalProps {
    projectId: string | null;
    projectName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function ProjectDeleteModal({ projectId, projectName, open, onOpenChange, onSuccess }: ProjectDeleteModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const queryClient = useQueryClient();

    const deleteProject = trpc.project.delete.useMutation({
        onMutate: async () => {
            queryClient.setQueriesData({ queryKey: [['project', 'listInfinite']] }, (oldData: any) => {
                if (!oldData || !oldData.pages) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: any) => ({
                        ...page,
                        items: page.items.filter((item: any) => item.id !== projectId)
                    }))
                };
            });
        },
        onSuccess: () => {
            toast({ title: "Project deleted permanently" });
            utils.project.list.invalidate();
            utils.project.listInfinite.invalidate();
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (err) => toast({
            title: "Failed to delete project",
            description: err.message,
            variant: "destructive"
        })
    });

    const handleDelete = () => {
        if (!projectId) return;
        deleteProject.mutate({ id: projectId });
    };

    if (!projectId) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-900">
                        <AlertTriangle className="h-5 w-5" />
                        Delete Project Permanently
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500 leading-relaxed pr-4">
                        This will permanently delete <strong className="font-semibold text-zinc-700">"{projectName}"</strong> and all of its data. This action is irreversible and cannot be undone.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="gap-2.5 sm:gap-2.5 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={deleteProject.isPending}
                        className="border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 disabled:opacity-50"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={handleDelete}
                        disabled={deleteProject.isPending}
                        className="border border-red-800/10 bg-gradient-to-b from-red-600 to-red-700 font-medium text-white shadow-sm shadow-red-900/10 transition-all duration-150 hover:bg-gradient-to-b hover:from-red-600 hover:to-red-800 hover:shadow-md hover:shadow-red-900/20 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 active:shadow-inner disabled:opacity-60 disabled:hover:shadow-sm"
                    >
                        {deleteProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Forever
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
