"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, GitMerge, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface MergeTaskModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: any;
    workspaceId: string;
}

export function MergeTaskModal({ open, onOpenChange, task, workspaceId }: MergeTaskModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTargetTaskId, setSelectedTargetTaskId] = useState<string | null>(null);

    const { data: searchResults, isLoading } = trpc.task.list.useQuery(
        {
            workspaceId,
            query: searchQuery,
            pageSize: 5,
            scope: "all"
        },
        {
            enabled: open && searchQuery.length > 2,
            placeholderData: (prev) => prev
        }
    );

    const mergeTaskMutation = trpc.task.merge.useMutation({
        onSuccess: () => {
            toast.success("Tasks merged successfully");
            onOpenChange(false);
            // Optionally redirect or refresh parent
        },
        onError: () => toast.error("Failed to merge tasks")
    });

    const handleMerge = () => {
        if (!selectedTargetTaskId) return;

        mergeTaskMutation.mutate({
            sourceId: task.id,
            targetId: selectedTargetTaskId
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <GitMerge className="h-5 w-5" />
                        Merge Task
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
                        <p className="font-semibold mb-1">Warning</p>
                        <p>Merging will move all activity, comments, and attachments from <span className="font-medium">{task.title}</span> to the selected task. This action cannot be undone.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Search for a task to merge into</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                            <Input
                                placeholder="Search by name or ID..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="min-h-[200px] border rounded-md bg-zinc-50 relative">
                        <ScrollArea className="h-[200px]">
                            {searchQuery.length < 3 ? (
                                <div className="flex items-center justify-center h-[200px] text-zinc-400 text-sm">
                                    Type at least 3 characters to search
                                </div>
                            ) : isLoading ? (
                                <div className="flex items-center justify-center h-[200px] text-zinc-400">
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Searching...
                                </div>
                            ) : searchResults?.items?.length === 0 ? (
                                <div className="flex items-center justify-center h-[200px] text-zinc-400 text-sm">
                                    No tasks found
                                </div>
                            ) : (
                                <div className="p-2 space-y-1">
                                    {searchResults?.items?.filter((t: any) => t.id !== task.id).map((t: any) => (
                                        <div
                                            key={t.id}
                                            className={cn(
                                                "p-2 rounded-md cursor-pointer border hover:border-blue-400 transition-all flex items-start gap-3",
                                                selectedTargetTaskId === t.id ? "bg-blue-50 border-blue-500" : "bg-white border-transparent hover:bg-zinc-100"
                                            )}
                                            onClick={() => setSelectedTargetTaskId(t.id)}
                                        >
                                            <div className="mt-1 h-3 w-3 rounded-full border-2 border-zinc-400 flex-shrink-0" />
                                            <div>
                                                <p className="text-sm font-medium text-zinc-900">{t.title}</p>
                                                <p className="text-xs text-zinc-500">
                                                    in {t.list?.name || "Unknown List"} • #{t.customId || t.id.slice(0, 5)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        disabled={!selectedTargetTaskId || mergeTaskMutation.isPending}
                        className="bg-zinc-900 text-white hover:bg-zinc-800"
                        onClick={handleMerge}
                    >
                        {mergeTaskMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Merge
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
