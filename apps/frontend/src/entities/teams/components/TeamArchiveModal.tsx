"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, Archive, Info } from "lucide-react";

interface TeamArchiveModalProps {
    teamId: string | null;
    teamName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function TeamArchiveModal({ teamId, teamName, open, onOpenChange, onSuccess }: TeamArchiveModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const queryClient = useQueryClient();

    const archiveTeam = trpc.team.update.useMutation({
        onMutate: async () => {
            queryClient.setQueriesData({ queryKey: [['team', 'listInfinite']] }, (oldData: any) => {
                if (!oldData || !oldData.pages) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: any) => ({
                        ...page,
                        items: page.items.map((item: any) =>
                            item.id === teamId
                                ? { ...item, isActive: false }
                                : item
                        )
                    }))
                };
            });
        },
        onSuccess: () => {
            toast({ title: "Team archived successfully" });
            utils.team.list.invalidate();
            utils.team.listInfinite.invalidate();
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (err) => toast({
            title: "Failed to archive team",
            description: err.message,
            variant: "destructive"
        })
    });

    const handleArchive = () => {
        if (!teamId) return;
        archiveTeam.mutate({ id: teamId, isActive: false });
    };

    if (!teamId) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Archive className="h-5 w-5 text-amber-600" />
                        Archive Team
                    </DialogTitle>
                    <DialogDescription>
                        Are you sure you want to archive "{teamName}"?
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
                        <div className="flex gap-3">
                            <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="font-semibold text-amber-900 text-sm">What happens when you archive?</h4>
                                <ul className="mt-2 space-y-1 text-sm text-amber-700">
                                    <li className="flex items-start gap-2">
                                        <span className="text-amber-600">•</span>
                                        <span>Team becomes hidden from sidebar</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-amber-600">•</span>
                                        <span>All data remains intact and accessible</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-amber-600">•</span>
                                        <span>Can be restored anytime from archived teams</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-amber-600">•</span>
                                        <span>Members retain their access levels</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={archiveTeam.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleArchive}
                        disabled={archiveTeam.isPending}
                        className="bg-amber-600 hover:bg-amber-700"
                    >
                        {archiveTeam.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Archive className="mr-2 h-4 w-4" />
                        Archive Team
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
