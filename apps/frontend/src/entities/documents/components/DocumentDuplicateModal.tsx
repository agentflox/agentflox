"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CopyPlus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";

interface DocumentDuplicateModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    documentId: string;
    documentName: string;
    workspaceId: string;
    onSuccess?: (newDocumentId: string) => void;
}

export function DocumentDuplicateModal({
    open,
    onOpenChange,
    documentId,
    documentName,
    workspaceId,
    onSuccess
}: DocumentDuplicateModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const [newName, setNewName] = useState(`${documentName} (copy)`);

    const { data: documentToCopy } = trpc.document.get.useQuery({ id: documentId }, { enabled: open });

    const createMutation = trpc.document.create.useMutation({
        onSuccess: (newDoc) => {
            toast({ title: "Document duplicated successfully" });
            utils.document.list.invalidate();
            onOpenChange(false);
            onSuccess?.(newDoc.id);
        },
        onError: (err) => {
            toast({ title: "Failed to duplicate document", description: err.message, variant: "destructive" });
        }
    });

    const handleDuplicate = () => {
        if (!newName.trim() || !documentToCopy) return;
        createMutation.mutate({
            workspaceId,
            spaceId: documentToCopy.spaceId || undefined,
            projectId: documentToCopy.projectId || undefined,
            folderId: documentToCopy.folderId || undefined,
            title: newName.trim(),
            content: documentToCopy.content || "",
            icon: documentToCopy.icon || "",
            coverImage: documentToCopy.coverImage || "",
            settings: documentToCopy.settings as any || {},
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CopyPlus className="h-5 w-5 text-indigo-500" />
                        Duplicate Document
                    </DialogTitle>
                    <DialogDescription>
                        Create a copy of this document with all its content and settings.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="duplicate-name">New Document Name</Label>
                        <Input
                            id="duplicate-name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Enter name for the copy"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && newName.trim()) {
                                    handleDuplicate();
                                }
                            }}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleDuplicate} disabled={!newName.trim() || createMutation.isPending || !documentToCopy}>
                        {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Duplicate
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
