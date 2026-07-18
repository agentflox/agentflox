import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, X, AlertCircle, Circle, Link, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TaskDocPickerModal } from "./TaskDocPickerModal";

interface TaskDependenciesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: any;
    workspaceId: string;
}

export function TaskDependenciesModal({ open, onOpenChange, task, workspaceId }: TaskDependenciesModalProps) {
    const [addingType, setAddingType] = useState<"blocking" | "waiting" | "linked" | null>(null);

    const utils = trpc.useUtils();

    // Refetch task to ensure we have latest dependencies
    const { data: taskData } = trpc.task.get.useQuery(
        { id: task.id },
        { enabled: open }
    );

    const { data: linkedDocs } = trpc.task.listLinkedDocs.useQuery(
        { taskId: task.id },
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

    const linkDoc = trpc.task.linkDoc.useMutation({
        onSuccess: () => {
            utils.task.listLinkedDocs.invalidate({ taskId: task.id });
            toast.success("Document linked");
            setAddingType(null);
        }
    });

    const unlinkDoc = trpc.task.unlinkDoc.useMutation({
        onSuccess: () => {
            utils.task.listLinkedDocs.invalidate({ taskId: task.id });
            toast.success("Link removed");
        }
    });

    const handleAddDependency = (selected: { type: "TASK" | "DOCUMENT", id: string }) => {
        if (selected.type === "DOCUMENT") {
            linkDoc.mutate({ taskId: task.id, documentId: selected.id });
            return;
        }

        // It's a TASK
        if (addingType === "waiting") {
            // I am waiting on selected task
            addDependency.mutate({ taskId: task.id, dependsOnId: selected.id });
        } else if (addingType === "blocking") {
            // I am blocking selected task
            addDependency.mutate({ taskId: selected.id, dependsOnId: task.id });
        } else if (addingType === "linked") {
            toast.error("Linked tasks are not fully supported yet. Only Docs can be linked.");
            setAddingType(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <TaskDocPickerModal
                    open={!!addingType}
                    onOpenChange={(v) => !v && setAddingType(null)}
                    taskId={task.id}
                    workspaceId={workspaceId}
                    onSelect={handleAddDependency}
                />

                <DialogHeader>
                    <DialogTitle>Dependencies & Links</DialogTitle>
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
                                className="text-zinc-400 hover:text-zinc-600 h-auto p-2 text-sm font-normal"
                                onClick={() => setAddingType("waiting")}
                            >
                                + Add waiting on task or doc
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
                                <DependencyItem
                                    key={dep.task.id}
                                    task={dep.task}
                                    onRemove={() => removeDependency.mutate({ taskId: dep.task.id, dependsOnId: task.id })}
                                />
                            ))}
                            <Button
                                variant="ghost"
                                className="text-zinc-400 hover:text-zinc-600 h-auto p-2 text-sm font-normal"
                                onClick={() => setAddingType("blocking")}
                            >
                                + Add task that is blocked
                            </Button>
                        </div>
                    </div>

                    {/* Linked Docs */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2 text-indigo-600">
                            <Link className="h-4 w-4" /> Linked
                        </h4>
                        <div className="pl-6 space-y-2">
                            {linkedDocs?.map((doc: any) => (
                                <div key={doc.id} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-2 text-sm">
                                        <FileText className="h-3.5 w-3.5 text-blue-500" />
                                        <span>{doc.title}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => unlinkDoc.mutate({ taskId: task.id, documentId: doc.id })}>
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                variant="ghost"
                                className="text-zinc-400 hover:text-zinc-600 h-auto p-2 text-sm font-normal"
                                onClick={() => setAddingType("linked")}
                            >
                                + Add linked doc
                            </Button>
                        </div>
                    </div>
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

