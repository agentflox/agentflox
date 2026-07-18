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
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-6">
                <DialogHeader>
                    <DialogTitle className="text-md font-semibold text-zinc-900">Duplicate List</DialogTitle>
                    <DialogDescription className="sr-only">Create a copy of this list. Views and statuses will be copied.</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-scroll px-4 -mx-4">
                    <div className="space-y-5 py-1">
                        {/* New List Name */}
                        <div className="space-y-2">
                            <Label className="!text-xs text-zinc-800">New List name</Label>
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
