import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, X, AlertCircle, Circle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TaskPickerModal } from "./TaskPickerModal";

interface TaskDependenciesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: any;
}

export function TaskDependenciesModal({ open, onOpenChange, task }: TaskDependenciesModalProps) {
    const [addingType, setAddingType] = useState<"blocking" | "waiting" | "linked" | null>(null);

    const utils = trpc.useUtils();

    // Refetch task to ensure we have latest dependencies
    const { data: taskData } = trpc.task.get.useQuery(
        { id: task.id },
        { enabled: open }
    );

    const currentTask = taskData || task;

    const removeDependency = trpc.task.removeDependency.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: task.id });
            toast.success("Dependency removed");
        }
    });

    const handleDelete = (dependsOnId: string) => {
        removeDependency.mutate({ taskId: task.id, dependsOnId });
    };

    const addDependency = trpc.task.addDependency.useMutation({
        onSuccess: () => {
            utils.task.get.invalidate({ id: task.id });
            toast.success("Dependency added");
            setAddingType(null);
        }
    });

    const handleAddDependency = (selectedTaskId: string) => {
        if (addingType === "waiting") {
            // I am waiting on selectedTaskId
            addDependency.mutate({ taskId: task.id, dependsOnId: selectedTaskId });
        } else if (addingType === "blocking") {
            // I am blocking selectedTaskId
            addDependency.mutate({ taskId: selectedTaskId, dependsOnId: task.id });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <TaskPickerModal
                    open={!!addingType}
                    onOpenChange={(v) => !v && setAddingType(null)}
                    taskId={task.id}
                    workspaceId={task.workspaceId}
                    dependencyType="FINISH_TO_START" // Default for now, can be sophisticated later
                    onSelect={handleAddDependency}
                />

                <DialogHeader>
                    <DialogTitle>Dependencies</DialogTitle>
                    <p className="text-sm text-muted-foreground">See what this task depends on and what depends on it.</p>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {/* Waiting On (I depend on them) -> dependencies */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-600">
                            <AlertCircle className="h-4 w-4" /> Waiting On
                        </h4>
                        <div className="pl-6 space-y-2">
                            {currentTask.dependencies?.map((dep: any) => (
                                <DependencyItem
                                    key={dep.dependsOn.id}
                                    task={dep.dependsOn}
                                    onRemove={() => handleDelete(dep.dependsOn.id)}
                                />
                            ))}
                            <Button
                                variant="ghost"
                                className="text-zinc-400 hover:text-zinc-600 h-auto p-0 text-sm font-normal"
                                onClick={() => setAddingType("waiting")}
                            >
                                + Add waiting on task
                            </Button>
                        </div>
                    </div>

                    {/* Blocking (They depend on me) -> blockedDependencies */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2 text-red-600">
                            <Circle className="h-4 w-4" /> Blocking
                        </h4>
                        <div className="pl-6 space-y-2">
                            {currentTask.blockedDependencies?.map((dep: any) => (
                                // blockedDependencies is array of TaskDependency where dependsOnId is THIS task.
                                // So dep.task is the one being blocked.
                                <DependencyItem
                                    key={dep.task.id}
                                    task={dep.task}
                                    // Removing 'blocking' relationship means we stop being a dependency for them.
                                    // So we remove dependency where taskId = THEM, dependsOnId = US.
                                    // wait, removeDependency takes {taskId, dependsOnId}.
                                    // To remove "Blocking", we are removing the dependency record where THIS task is dependsOnId.
                                    // So taskId = dep.task.id, dependsOnId = task.id.
                                    onRemove={() => removeDependency.mutate({ taskId: dep.task.id, dependsOnId: task.id })}
                                />
                            ))}
                            <Button
                                variant="ghost"
                                className="text-zinc-400 hover:text-zinc-600 h-auto p-0 text-sm font-normal"
                                onClick={() => setAddingType("blocking")}
                            >
                                + Add task that is blocked
                            </Button>
                        </div>
                    </div>

                    {/* Linked - Not implemented in backend yet, so using it as 'Related' is tricky without schema.
                        We'll skip or simulate for now or hide if empty. The schema had TaskDependency only.
                        I won't implement 'Linked' unless I added a relation. I'll hide it for consistency if I can't back it.
                        But user screenshot had it. I'll leave it as non-functional UI or repurpose.
                    */}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function DependencyItem({ task, onRemove }: any) {
    return (
        <div className="flex items-center justify-between group">
            <div className="flex items-center gap-2 text-sm">
                <div className={cn("h-3 w-3 rounded-full border-2", task.status?.color ? `border-[${task.status.color}]` : "border-zinc-300")} />
                <span>{task.title}</span>
                <span className="text-xs text-zinc-400">#{task.customId || task.id?.slice(0, 5)}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={onRemove}>
                <X className="h-3 w-3" />
            </Button>
        </div>
    )
}

