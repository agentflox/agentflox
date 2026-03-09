"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { IconColorSelector } from "@/components/ui/icon-color-selector";
import { ListIcon } from "lucide-react"; // Using standard icon as placeholder if ListIcon from entities doesn't exist

interface DuplicateListModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    listId: string;
    listName: string;
    listIcon?: string;
    listColor?: string;
    onSuccess?: (newListId: string) => void;
}

export function DuplicateListModal({
    open,
    onOpenChange,
    listId,
    listName,
    listIcon = "",
    listColor = "#3B82F6",
    onSuccess
}: DuplicateListModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const queryClient = useQueryClient();
    const [newName, setNewName] = useState(`${listName} (copy)`);
    const [icon, setIcon] = useState(listIcon);
    const [color, setColor] = useState(listColor);
    const [hasManualIcon, setHasManualIcon] = useState(false);

    const duplicateMutation = trpc.list.duplicate.useMutation({
        onMutate: async (variables) => {
            // Optimistic update not easily possible for duplicate as we don't know the ID
        },
        onSuccess: (data: any) => {
            toast({ title: "List duplicated successfully" });
            utils.list.byContext.invalidate();
            onOpenChange(false);
            onSuccess?.(data.id);
        },
        onError: (err) => {
            toast({ title: "Failed to duplicate list", description: err.message, variant: "destructive" });
        }
    });

    useEffect(() => {
        if (open) {
            setNewName(`${listName} (copy)`);
            setIcon(listIcon);
            setColor(listColor);
            setHasManualIcon(false);
        }
    }, [open, listName, listIcon, listColor]);

    const handleDuplicate = async () => {
        if (!newName.trim()) {
            toast({ title: "Name required", variant: "destructive" });
            return;
        }

        await duplicateMutation.mutateAsync({
            id: listId,
            name: newName.trim(),
            // icon, color not supported in duplicate mutation yet, simplified to name only
        } as any);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Duplicate List</DialogTitle>
                    <DialogDescription>Create a copy of this list. Views and statuses will be copied.</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* New List Name */}
                    <div className="space-y-2">
                        <Label>New List name</Label>
                        <div className="flex items-center gap-2">
                            {/* IconColorSelector not effective here as duplicate mutation doesn't take icon/color yet. 
                                 We'll just show the input for name to keep it simple and working. 
                             */}
                            <div className="flex items-center justify-center h-10 w-10 rounded-lg shrink-0" style={{ backgroundColor: color }}>
                                <ListIcon className="h-5 w-5 text-white" />
                            </div>
                            <Input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                maxLength={50}
                                placeholder="List name"
                                className="flex-1"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={duplicateMutation.isPending}>
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
