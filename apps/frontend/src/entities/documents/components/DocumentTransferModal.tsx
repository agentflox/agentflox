"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, Crown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface DocumentTransferModalProps {
    documentId: string | null;
    documentName: string;
    workspaceId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DocumentTransferModal({ documentId, documentName, workspaceId, open, onOpenChange }: DocumentTransferModalProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedUserId, setSelectedUserId] = useState<string>("");

    const { data: members = [] } = trpc.workspace.getMembers.useQuery(
        { id: workspaceId },
        { enabled: open && !!workspaceId }
    );

    const transferOwnership = trpc.document.transferOwnership.useMutation({
        onSuccess: () => {
            toast({ title: "Ownership transferred successfully" });
            queryClient.invalidateQueries({ queryKey: [['document']] });
            onOpenChange(false);
            setSelectedUserId("");
        },
        onError: (err) => {
            toast({
                title: "Failed to transfer ownership",
                description: err.message,
                variant: "destructive"
            });
        }
    });

    const handleTransfer = () => {
        if (!documentId || !selectedUserId) return;
        transferOwnership.mutate({ id: documentId, newOwnerId: selectedUserId });
    };

    if (!documentId) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-indigo-500" />
                        Transfer Ownership
                    </DialogTitle>
                    <DialogDescription>
                        Transfer ownership of <span className="font-semibold text-zinc-900">{documentName}</span> to another workspace member. You will lose owner privileges.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Select New Owner</Label>
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a workspace member" />
                            </SelectTrigger>
                            <SelectContent>
                                {members.length === 0 ? (
                                    <SelectItem value="loading" disabled>Loading members...</SelectItem>
                                ) : (
                                    members.map((member: any) => (
                                        <SelectItem key={member.id} value={member.user.id}>
                                            {member.user?.name || member.user?.email || "Unknown User"}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button 
                        onClick={handleTransfer} 
                        disabled={!selectedUserId || transferOwnership.isPending}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {transferOwnership.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Transfer Ownership
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
