"use client";

import { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Check, Copy, Boxes, Paperclip, Link2, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { DestinationPicker } from "./DestinationPicker";

interface DuplicateTaskModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task?: any;
    taskIds?: string[];
    workspaceId: string;
}

export function DuplicateTaskModal({ open, onOpenChange, task, taskIds = [], workspaceId }: DuplicateTaskModalProps) {
    const [newName, setNewName] = useState("");
    const [selectedListId, setSelectedListId] = useState<string>("");

    // Options
    const [includeSubtasks, setIncludeSubtasks] = useState(true);
    const [includeAttachments, setIncludeAttachments] = useState(true);
    const [includeAssignees, setIncludeAssignees] = useState(true);
    const [includeDependencies, setIncludeDependencies] = useState(true);
    const [copyActivity, setCopyActivity] = useState(false);

    const targetTaskIds = useMemo(() => {
        if (taskIds.length > 0) return taskIds;
        if (task) return [task.id];
        return [];
    }, [task, taskIds]);

    const isBulk = targetTaskIds.length > 1;

    useEffect(() => {
        if (task && !isBulk) {
            setNewName(task.title);
            setSelectedListId(task.listId || "");
        }
    }, [task, open, isBulk]);

    const utils = trpc.useContext();

    const bulkDuplicateMutation = trpc.task.bulkDuplicate.useMutation({
        onSuccess: () => {
            toast.success(isBulk ? `${targetTaskIds.length} tasks duplicated` : "Task duplicated");
            utils.task.list.invalidate();
            onOpenChange(false);
        },
        onError: () => toast.error("Failed to duplicate")
    });

    const handleDuplicate = () => {
        if (!selectedListId) {
            toast.error("Please select a destination list");
            return;
        }

        bulkDuplicateMutation.mutate({
            taskIds: targetTaskIds,
            targetListId: selectedListId,
            options: {
                includeSubtasks,
                includeAttachments,
                includeAssignees,
                includeDependencies,
                copyActivity
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden bg-white border-zinc-200 shadow-2xl rounded-2xl">
                <DialogHeader className="p-6 pb-2 border-b border-zinc-50">
                    <DialogTitle className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                        <Copy className="h-5 w-5 text-indigo-500" />
                        {isBulk ? `Duplicate ${targetTaskIds.length} Tasks` : "Duplicate Task"}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex bg-zinc-50/50">
                    {/* Left Side: Options */}
                    <div className="w-[200px] border-r border-zinc-100 p-4 space-y-4 shrink-0">
                        <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Options</Label>
                        <div className="space-y-3">
                            <OptionToggle
                                icon={<Boxes className="h-3.5 w-3.5" />}
                                label="Subtasks"
                                checked={includeSubtasks}
                                onChange={setIncludeSubtasks}
                            />
                            <OptionToggle
                                icon={<Paperclip className="h-3.5 w-3.5" />}
                                label="Attachments"
                                checked={includeAttachments}
                                onChange={setIncludeAttachments}
                            />
                            <OptionToggle
                                icon={<Check className="h-3.5 w-3.5" />}
                                label="Assignees"
                                checked={includeAssignees}
                                onChange={setIncludeAssignees}
                            />
                            <OptionToggle
                                icon={<Link2 className="h-3.5 w-3.5" />}
                                label="Dependencies"
                                checked={includeDependencies}
                                onChange={setIncludeDependencies}
                            />
                            <OptionToggle
                                icon={<ListChecks className="h-3.5 w-3.5" />}
                                label="Activity"
                                checked={copyActivity}
                                onChange={setCopyActivity}
                            />
                        </div>
                    </div>

                    {/* Right Side: Destination Picker */}
                    <div className="flex-1 p-4 space-y-4 bg-white">
                        {!isBulk && (
                            <div className="space-y-2 mb-4">
                                <Label className="text-xs font-semibold text-zinc-500">New Title</Label>
                                <Input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Task title"
                                    className="h-9 focus-visible:ring-indigo-500 rounded-lg"
                                />
                            </div>
                        )}

                        <Label className="text-xs font-semibold text-zinc-500">Destination</Label>
                        <div className="rounded-xl border border-zinc-100 overflow-hidden shadow-sm h-[300px]">
                            <DestinationPicker
                                workspaceId={workspaceId}
                                onSelect={setSelectedListId}
                                className="h-full"
                            />
                        </div>
                        {selectedListId && (
                            <div className="text-[10px] text-zinc-400 mt-2 px-1">
                                Selected List ID: <span className="font-mono">{selectedListId}</span>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-4 bg-zinc-50/80 border-t border-zinc-100 flex items-center justify-between sm:justify-between">
                    <p className="text-[11px] text-zinc-500 italic">
                        Duplicated tasks will be created immediately.
                    </p>
                    <div className="flex gap-2">
                        <Button variant="ghost" className="h-9 rounded-lg" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button
                            className="bg-zinc-900 text-white hover:bg-zinc-800 h-9 px-6 rounded-lg font-medium shadow-lg shadow-zinc-200"
                            onClick={handleDuplicate}
                            disabled={bulkDuplicateMutation.isLoading || !selectedListId}
                        >
                            {bulkDuplicateMutation.isLoading ? "Duplicating..." : "Duplicate"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function OptionToggle({ icon, label, checked, onChange }: { icon: React.ReactNode, label: string, checked: boolean, onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between group cursor-pointer" onClick={() => onChange(!checked)}>
            <div className="flex items-center gap-2 group-hover:translate-x-0.5 transition-transform">
                <div className={cn("text-zinc-400 transition-colors", checked && "text-indigo-500")}>
                    {icon}
                </div>
                <span className={cn("text-xs font-medium transition-colors", checked ? "text-zinc-700" : "text-zinc-400")}>{label}</span>
            </div>
            <div className={cn(
                "h-4 w-7 rounded-full transition-colors relative",
                checked ? "bg-indigo-500" : "bg-zinc-200"
            )}>
                <div className={cn(
                    "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all shadow-sm",
                    checked ? "right-0.5" : "left-0.5"
                )} />
            </div>
        </div>
    );
}
