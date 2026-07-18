"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GitMerge, Loader2, Info, CircleDashed, ArrowDownUp, X, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { TaskPickerModal } from "./TaskPickerModal";

interface MergeTaskModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: any;
    workspaceId: string;
}

export function MergeTaskModal({ open, onOpenChange, task, workspaceId }: MergeTaskModalProps) {
    const [selectedTargetTaskId, setSelectedTargetTaskId] = useState<string | null>(null);
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    const { data: targetTask } = trpc.task.get.useQuery(
        { id: selectedTargetTaskId as string },
        { enabled: !!selectedTargetTaskId }
    );

    const mergeTaskMutation = trpc.task.merge.useMutation({
        onSuccess: () => {
            toast.success("Tasks merged successfully");
            onOpenChange(false);
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
            <DialogContent className="sm:max-w-[460px] p-6 gap-0 rounded-2xl">
                <DialogTitle className="sr-only">Merge Task</DialogTitle>

                <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-8 w-8 rounded-md border border-indigo-200 bg-indigo-50 flex items-center justify-center shrink-0">
                            <GitMerge className="h-5 w-5 text-indigo-500" />
                        </div>
                        <h2 className="text-[20px] font-semibold text-zinc-900">Merge into another task</h2>
                    </div>

                    <p className="text-[14px] text-zinc-500 mb-3 leading-relaxed pr-4">
                        This task's contents will be added to the target task, and will inherit its privacy and sharing settings.{" "}
                        <span className="group relative inline-flex align-middle">
                            <Info className="h-4 w-4 text-zinc-300 hover:text-indigo-500 transition-colors duration-150 cursor-help translate-y-[3px]" />
                            <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 rounded-lg bg-zinc-900 text-white text-[12px] leading-snug px-2.5 py-2 shadow-lg opacity-0 scale-95 origin-bottom group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-20">
                                Merged tasks can't be recovered separately afterward — this action is permanent.
                                <span className="absolute top-full left-1/2 -translate-x-1/2 h-2 w-2 -mt-1 rotate-45 bg-zinc-900" />
                            </span>
                        </span>
                    </p>

                    <div className="space-y-1.5 mb-2 relative">
                        <label className="text-[13px] font-semibold text-zinc-600">Original task</label>
                        <div className="flex items-center h-10 px-3 bg-zinc-100/70 border border-zinc-200/60 rounded-lg">
                            <CircleDashed className="h-4 w-4 text-zinc-400 mr-2 shrink-0" />
                            <span className="text-[14px] text-zinc-700 truncate">{task.title}</span>
                        </div>
                    </div>

                    {/* Connector between the two task fields */}
                    <div className="flex justify-center -my-1 relative z-10 h-6 items-center">
                        <div className="h-6 w-6 rounded-full bg-white border border-zinc-200 shadow-sm flex items-center justify-center">
                            <ArrowDownUp className="h-3 w-3 text-zinc-400" strokeWidth={2.25} />
                        </div>
                    </div>

                    <div className="space-y-1.5 mb-5">
                        <label className="text-[13px] font-semibold text-zinc-600">Select task to merge into</label>

                        {selectedTargetTaskId && targetTask ? (
                            <div className="flex items-center justify-between h-10 px-3 bg-white border border-zinc-200 rounded-lg shadow-sm">
                                <div className="flex items-center min-w-0">
                                    <CircleDashed className="h-4 w-4 text-zinc-400 mr-2 shrink-0" />
                                    <span className="text-[14px] text-zinc-900 truncate font-medium">{targetTask.title}</span>
                                </div>
                                <button
                                    onClick={() => setSelectedTargetTaskId(null)}
                                    className="ml-2 shrink-0 text-zinc-400 hover:text-zinc-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsPickerOpen(true)}
                                className="w-full flex items-center justify-between h-10 px-3 bg-white border border-zinc-200 rounded-lg shadow-sm hover:border-zinc-300 transition-colors group"
                            >
                                <span className="text-zinc-400 text-[14px]">Select task...</span>
                                <Search className="h-4 w-4 text-zinc-400 group-hover:text-zinc-500" />
                            </button>
                        )}
                    </div>

                    <div className="flex justify-between gap-3 mt-2">
                        <Button
                            variant="outline"
                            className="w-full h-10 rounded-lg font-medium border-zinc-200 text-zinc-600 bg-white hover:bg-zinc-50 hover:text-zinc-900 hover:border-zinc-300 shadow-sm transition-all duration-150 active:scale-[0.98]"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="w-full h-10 rounded-lg font-medium text-white bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-700 shadow-[0_1px_2px_rgba(79,70,229,0.35),0_0_0_1px_rgba(79,70,229,0.15)_inset] hover:shadow-[0_2px_6px_rgba(79,70,229,0.4),0_0_0_1px_rgba(79,70,229,0.2)_inset] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none"
                            disabled={!selectedTargetTaskId || mergeTaskMutation.isPending}
                            onClick={handleMerge}
                        >
                            {mergeTaskMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Merge
                        </Button>
                    </div>
                </div>

                <TaskPickerModal
                    open={isPickerOpen}
                    onOpenChange={setIsPickerOpen}
                    taskId={task.id}
                    workspaceId={workspaceId}
                    dependencyType="FINISH_TO_START"
                    onSelect={(id) => {
                        setSelectedTargetTaskId(id);
                    }}
                />
            </DialogContent>
        </Dialog>
    );
}