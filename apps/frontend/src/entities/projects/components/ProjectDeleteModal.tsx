"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
    const [confirmText, setConfirmText] = useState("");
    const [understood, setUnderstood] = useState(false);

    const deleteProject = trpc.project.delete.useMutation({
        onMutate: async () => {
            // Optimistic update - remove project from list immediately
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
            resetForm();
        },
        onError: (err) => toast({
            title: "Failed to delete project",
            description: err.message,
            variant: "destructive"
        })
    });

    const resetForm = () => {
        setConfirmText("");
        setUnderstood(false);
    };

    const handleDelete = () => {
        if (!projectId) return;
        if (confirmText !== projectName) {
            toast({
                title: "Confirmation failed",
                description: "Please type the project name exactly to confirm deletion",
                variant: "destructive"
            });
            return;
        }
        if (!understood) {
            toast({
                title: "Confirmation required",
                description: "Please confirm you understand this action cannot be undone",
                variant: "destructive"
            });
            return;
        }
        deleteProject.mutate({ id: projectId });
    };

    if (!projectId) return null;

    const isDeleteEnabled = confirmText === projectName && understood;

    return (
        <Dialog open={open} onOpenChange={(open) => {
            if (!open) resetForm();
            onOpenChange(open);
        }}>
            <DialogContent className="sm:max-w-[540px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-900">
                        <AlertTriangle className="h-5 w-5" />
                        Delete Project Permanently
                    </DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete "{projectName}"?
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Warning Banner */}
                    <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
                        <div className="flex gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="font-semibold text-red-900 text-sm">Warning: Irreversible Action</h4>
                                <p className="mt-1 text-sm text-red-700">
                                    This action is permanent and cannot be undone. Please proceed with extreme caution.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Confirmation Fields */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-900">
                                Type <code className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-mono">{projectName}</code> to confirm
                            </Label>
                            <Input
                                value={confirmText}
                                onChange={e => setConfirmText(e.target.value)}
                                placeholder={`Type "${projectName}" here`}
                                className="border-red-200 focus-visible:ring-red-500"
                            />
                        </div>

                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="understand"
                                checked={understood}
                                onCheckedChange={(checked) => setUnderstood(checked as boolean)}
                                className="mt-0.5"
                            />
                            <label
                                htmlFor="understand"
                                className="text-sm text-zinc-700 cursor-pointer select-none"
                            >
                                I understand that this action is permanent and cannot be undone. All data will be lost forever.
                            </label>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 pt-4">
                    <Button
                        variant="outline"
                        onClick={() => {
                            resetForm();
                            onOpenChange(false);
                        }}
                        disabled={deleteProject.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={!isDeleteEnabled || deleteProject.isPending}
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
