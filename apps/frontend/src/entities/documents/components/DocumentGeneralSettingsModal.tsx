"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2 } from "lucide-react";
import { IconColorSelector } from "@/components/ui/icon-color-selector";
import { useQueryClient } from "@tanstack/react-query";

interface DocumentGeneralSettingsModalProps {
    documentId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DocumentGeneralSettingsModal({ documentId, open, onOpenChange }: DocumentGeneralSettingsModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [color, setColor] = useState("#4F46E5");
    const [icon, setIcon] = useState("");

    const { data: document, isLoading } = trpc.document.get.useQuery(
        { id: documentId as string },
        { enabled: !!documentId && open }
    );

    useEffect(() => {
        if (document) {
            setName(document.name || "");
            setColor(document.color || "#4F46E5");
            setIcon(document.icon || "");
        }
    }, [document]);

    const updateDocument = trpc.document.update.useMutation({
        onMutate: async (variables) => {
            queryClient.setQueriesData({ queryKey: [['document', 'list']] }, (oldData: any) => {
                if (!oldData) return oldData;
                return oldData.map((item: any) =>
                    item.id === documentId
                        ? { ...item, name: variables.name, icon: variables.icon, color: variables.color }
                        : item
                );
            });
        },
        onSuccess: () => {
            toast({ title: "Settings updated successfully" });
            utils.document.get.invalidate({ id: documentId as string });
            utils.document.list.invalidate();
            onOpenChange(false);
        },
        onError: (err) => {
            toast({
                title: "Failed to update settings",
                description: err.message,
                variant: "destructive"
            });
        }
    });

    const handleSave = () => {
        if (!documentId) return;
        updateDocument.mutate({
            id: documentId,
            name: name.trim(),
            icon,
            color,
        });
    };

    const isDirty = document && (
        name.trim() !== document.name ||
        color !== document.color ||
        icon !== document.icon
    );

    if (!documentId) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle>Document Settings</DialogTitle>
                    <DialogDescription>
                        Manage general settings for this document.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-32">
                            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="document-name">Document Name</Label>
                                <Input
                                    id="document-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter document name"
                                    maxLength={100}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Icon & Color</Label>
                                <div className="border rounded-md p-4 bg-zinc-50/50">
                                    <IconColorSelector
                                        icon={icon}
                                        color={color}
                                        onIconChange={setIcon}
                                        onColorChange={setColor}
                                        label="Document Icon"
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter className="p-6 pt-4 border-t bg-zinc-50/50">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateDocument.isPending}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!isDirty || !name.trim() || updateDocument.isPending}>
                        {updateDocument.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
