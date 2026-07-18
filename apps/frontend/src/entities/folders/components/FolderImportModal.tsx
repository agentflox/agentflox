"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, Folder, Building2, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface FolderImportModalProps {
    spaceId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function FolderImportModal({ spaceId, open, onOpenChange }: FolderImportModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectedSpaceId, setSelectedSpaceId] = useState(spaceId);

    if (spaceId && spaceId !== selectedSpaceId) {
        setSelectedSpaceId(spaceId);
    }

    const { data: spacesData } = trpc.space.list.useQuery({ scope: "all", pageSize: 50 }, { enabled: open && !spaceId });
    const spaces = spacesData?.items || [];

    const { data, isLoading } = trpc.folder.byContext.useQuery({
        workspaceId: undefined, 
    }, { enabled: open, retry: false });

    const updateFolder = trpc.folder.update.useMutation();
    const folders = data?.items || [];
    const allSelected = folders.length > 0 && selectedIds.length === folders.length;

    const handleImport = async () => {
        if (selectedIds.length === 0) return;
        if (!selectedSpaceId) {
            toast({ title: "Select a target space first", variant: "destructive" });
            return;
        }
        try {
            // TODO: Backend does not explicitly support spaceId in folder update yet
            toast({ title: `${selectedIds.length} folder${selectedIds.length > 1 ? "s" : ""} imported (Mocked)` });
            utils.folder.byContext.invalidate();
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
        setSelectedIds(allSelected ? [] : folders.map(f => f.id));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
                <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                    <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                            <Folder className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-sm font-semibold text-slate-900 leading-snug">
                                Import folders
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                Move unassigned folders into a workspace space to organize them.
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 space-y-4">
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

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                Unassigned folders
                            </label>
                            {!isLoading && folders.length > 0 && (
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
                                        <span className="text-xs">Loading folders…</span>
                                    </div>
                                ) : folders.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center gap-2 h-52 p-4">
                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                            <CheckCircle2 className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs font-medium text-slate-700">All folders are assigned</p>
                                            <p className="text-xs text-slate-400 mt-0.5">No unassigned folders to import</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {folders.map(folder => {
                                            const isSelected = selectedIds.includes(folder.id);
                                            return (
                                                <label
                                                    key={folder.id}
                                                    htmlFor={folder.id}
                                                    className={cn(
                                                        "flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors group",
                                                        isSelected ? "bg-blue-50/70" : "hover:bg-slate-50"
                                                    )}
                                                >
                                                    <Checkbox
                                                        id={folder.id}
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggle(folder.id)}
                                                        className={cn(
                                                            "h-4 w-4 rounded-[4px] border-slate-300 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600",
                                                            "group-hover:border-blue-400"
                                                        )}
                                                    />
                                                    <div className="flex-1 min-w-0 flex items-center gap-2">
                                                        <span className="text-sm font-medium text-slate-700 truncate group-hover:text-slate-900 transition-colors">
                                                            {folder.name}
                                                        </span>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[11px] text-slate-500">
                                {selectedIds.length} folder{selectedIds.length !== 1 && "s"} selected
                            </span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 h-9"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={selectedIds.length === 0 || updateFolder.isPending}
                        className={cn(
                            "h-9 px-4 text-sm font-medium text-white shadow-sm transition-all",
                            "bg-blue-600 hover:bg-blue-700 active:scale-[0.98]",
                            "disabled:opacity-50 disabled:pointer-events-none"
                        )}
                    >
                        {updateFolder.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                        Import {selectedIds.length > 0 ? selectedIds.length : ""} folder{selectedIds.length !== 1 ? "s" : ""}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
