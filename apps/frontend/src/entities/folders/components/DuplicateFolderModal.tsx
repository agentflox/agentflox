"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, FolderIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { IconColorSelector } from "@/components/ui/icon-color-selector";

interface DuplicateFolderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    folderId: string;
    folderName: string;
    folderIcon?: string;
    folderColor?: string;
    onSuccess?: (newFolderId: string) => void;
}

export function DuplicateFolderModal({
    open,
    onOpenChange,
    folderId,
    folderName,
    folderIcon = "",
    folderColor = "#3B82F6",
    onSuccess
}: DuplicateFolderModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const queryClient = useQueryClient();
    const [newName, setNewName] = useState(`${folderName} (copy)`);
    const [icon, setIcon] = useState(folderIcon);
    const [color, setColor] = useState(folderColor);
    const [hasManualIcon, setHasManualIcon] = useState(false);

    const duplicateMutation = trpc.folder.duplicate.useMutation({
        onMutate: async (variables) => {
            // Optimistic update not easily possible for duplicate as we don't know the ID
        },
        onSuccess: (data: any) => {
            toast({ title: "Folder duplicated successfully" });
            utils.folder.byContext.invalidate();
            onOpenChange(false);
            onSuccess?.(data.id);
        },
        onError: (err) => {
            toast({ title: "Failed to duplicate folder", description: err.message, variant: "destructive" });
        }
    });

    useEffect(() => {
        if (open) {
            setNewName(`${folderName} (copy)`);
            setIcon(folderIcon);
            setColor(folderColor);
            setHasManualIcon(false);
        }
    }, [open, folderName, folderIcon, folderColor]);

    const handleDuplicate = async () => {
        if (!newName.trim()) {
            toast({ title: "Name required", variant: "destructive" });
            return;
        }

        await duplicateMutation.mutateAsync({
            id: folderId,
            name: newName.trim(),
            // icon, color not supported in duplicate mutation yet, simplified to name only
        } as any);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-6">
                <DialogHeader>
                    <DialogTitle className="text-md font-semibold text-zinc-900">Duplicate Folder</DialogTitle>
                    <DialogDescription className="sr-only">Create a copy of this folder. Views and statuses will be copied.</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-scroll px-4 -mx-4">
                    <div className="space-y-5 py-1">
                        <div className="space-y-2">
                            <Label className="!text-xs text-zinc-800">New Folder name</Label>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center h-10 w-10 rounded-lg shrink-0" style={{ backgroundColor: color }}>
                                    <FolderIcon className="h-5 w-5 text-white" />
                                </div>
                                <Input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    maxLength={50}
                                    placeholder="Folder name"
                                    className="flex-1 h-9 text-sm rounded-md border border-zinc-200 focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:ring-offset-0"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="pt-2">
                    <Button variant="outline" className="border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 disabled:opacity-50" onClick={() => onOpenChange(false)} disabled={duplicateMutation.isPending}>
                        Cancel
                    </Button>
                    <Button onClick={handleDuplicate} disabled={duplicateMutation.isPending || !newName.trim()}>
                        {duplicateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Duplicate
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
