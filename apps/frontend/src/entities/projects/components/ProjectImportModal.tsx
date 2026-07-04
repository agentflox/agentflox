"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, FolderOpen, Building2, ChevronRight, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ProjectImportModalProps {
    spaceId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProjectImportModal({ spaceId, open, onOpenChange }: ProjectImportModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectedSpaceId, setSelectedSpaceId] = useState(spaceId);

    if (spaceId && spaceId !== selectedSpaceId) {
        setSelectedSpaceId(spaceId);
    }

    const { data: spacesData } = trpc.space.list.useQuery({ scope: "all", pageSize: 50 }, { enabled: open && !spaceId });
    const spaces = spacesData?.items || [];

    const { data, isLoading } = trpc.project.list.useQuery({
        spaceId: null,
        scope: "owned",
        pageSize: 50
    }, { enabled: open });

    const updateProject = trpc.project.update.useMutation();
    const projects = data?.items || [];
    const allSelected = projects.length > 0 && selectedIds.length === projects.length;

    const handleImport = async () => {
        if (selectedIds.length === 0) return;
        if (!selectedSpaceId) {
            toast({ title: "Select a target space first", variant: "destructive" });
            return;
        }
        try {
            await Promise.all(selectedIds.map(id =>
                updateProject.mutateAsync({ id, spaceId: selectedSpaceId })
            ));
            toast({ title: `${selectedIds.length} project${selectedIds.length > 1 ? "s" : ""} imported` });
            utils.project.list.invalidate();
            if (selectedSpaceId) utils.space.get.invalidate({ id: selectedSpaceId });
            onOpenChange(false);
            setSelectedIds([]);
        } catch {
            toast({ title: "Import failed", variant: "destructive" });
        }
    };

    const toggle = (id: string) =>
        setSelectedIds(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

    const toggleAll = () =>
        setSelectedIds(allSelected ? [] : projects.map(p => p.id));

    const targetSpace = spaces.find(s => s.id === selectedSpaceId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                    <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                            <FolderOpen className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-sm font-semibold text-slate-900 leading-snug">
                                Import projects
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                Move unassigned projects into a workspace space to organize them.
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 space-y-4">
                    {/* Space selector */}
                    {!spaceId && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                Destination space
                            </label>
                            <Select value={selectedSpaceId} onValueChange={setSelectedSpaceId}>
                                <SelectTrigger className="h-9 text-sm border-slate-200 bg-slate-50 focus:bg-white transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                        <SelectValue placeholder="Choose a space…" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {spaces.map(s => (
                                        <SelectItem key={s.id} value={s.id} className="text-sm">
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Projects list */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                Unassigned projects
                            </label>
                            {!isLoading && projects.length > 0 && (
                                <button
                                    onClick={toggleAll}
                                    className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
                                >
                                    {allSelected ? "Deselect all" : "Select all"}
                                </button>
                            )}
                        </div>

                        <div className="rounded-lg border border-slate-200 overflow-hidden">
                            <ScrollArea className="h-52">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center gap-2 h-52 text-slate-400 p-4">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-xs">Loading projects…</span>
                                    </div>
                                ) : projects.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center gap-2 h-52 p-4">
                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                            <CheckCircle2 className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs font-medium text-slate-700">All projects are assigned</p>
                                            <p className="text-xs text-slate-400 mt-0.5">No unassigned projects to import</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {projects.map(project => {
                                            const isSelected = selectedIds.includes(project.id);
                                            return (
                                                <label
                                                    key={project.id}
                                                    htmlFor={project.id}
                                                    className={cn(
                                                        "flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors group",
                                                        isSelected ? "bg-blue-50/70" : "hover:bg-slate-50"
                                                    )}
                                                >
                                                    <Checkbox
                                                        id={project.id}
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggle(project.id)}
                                                        className={cn(
                                                            "shrink-0 transition-colors",
                                                            isSelected && "border-blue-500 bg-blue-500"
                                                        )}
                                                    />
                                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                        <div className="h-6 w-6 rounded-md bg-slate-200 flex items-center justify-center shrink-0">
                                                            <span className="text-[10px] font-semibold text-slate-600 leading-none">
                                                                {project.name.slice(0, 2).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <span className={cn(
                                                            "text-sm truncate transition-colors",
                                                            isSelected ? "font-medium text-slate-900" : "text-slate-700"
                                                        )}>
                                                            {project.name}
                                                        </span>
                                                    </div>
                                                    {isSelected && (
                                                        <ChevronRight className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                                    )}
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>

                        {/* Selection summary */}
                        {selectedIds.length > 0 && (
                            <p className="text-xs text-slate-500">
                                <span className="font-medium text-slate-800">{selectedIds.length}</span> project{selectedIds.length > 1 ? "s" : ""} selected
                                {targetSpace && (
                                    <> → <span className="font-medium text-slate-800">{targetSpace.name}</span></>
                                )}
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-600 hover:text-slate-900"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleImport}
                        disabled={selectedIds.length === 0 || !selectedSpaceId || updateProject.isPending}
                        className="min-w-[120px]"
                    >
                        {updateProject.isPending ? (
                            <>
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                Importing…
                            </>
                        ) : (
                            <>Import {selectedIds.length > 0 ? `${selectedIds.length} ` : ""}project{selectedIds.length !== 1 ? "s" : ""}</>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}