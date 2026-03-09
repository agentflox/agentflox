"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProjectImportModalProps {
    spaceId: string; // If empty string, we show selector
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProjectImportModal({ spaceId, open, onOpenChange }: ProjectImportModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectedSpaceId, setSelectedSpaceId] = useState(spaceId);

    // Sync prop changes
    if (spaceId && spaceId !== selectedSpaceId) {
        setSelectedSpaceId(spaceId);
    }

    const { data: spacesData } = trpc.space.list.useQuery(undefined, { enabled: open && !spaceId });
    const spaces = spacesData?.items || [];

    const { data, isLoading } = trpc.project.list.useQuery({
        spaceId: null,
        scope: "owned",
        pageSize: 50
    }, { enabled: open });

    const updateProject = trpc.project.update.useMutation();

    const handleImport = async () => {
        if (selectedIds.length === 0) return;
        if (!selectedSpaceId) {
            toast({ title: "Please select a target space", variant: "destructive" });
            return;
        }

        try {
            await Promise.all(selectedIds.map(id =>
                updateProject.mutateAsync({ id, spaceId: selectedSpaceId })
            ));

            toast({ title: `Imported ${selectedIds.length} projects` });
            utils.project.list.invalidate();
            if (selectedSpaceId) utils.space.get.invalidate({ id: selectedSpaceId });

            onOpenChange(false);
            setSelectedIds([]);
        } catch (e) {
            toast({ title: "Import failed", variant: "destructive" });
        }
    };

    const toggle = (id: string) => {
        if (selectedIds.includes(id)) setSelectedIds(s => s.filter(x => x !== id));
        else setSelectedIds(s => [...s, id]);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md gap-4">
                <DialogHeader>
                    <DialogTitle>Import Existing Projects</DialogTitle>
                    <DialogDescription>
                        Select projects to add to a space.
                    </DialogDescription>
                </DialogHeader>

                {!spaceId && (
                    <Select value={selectedSpaceId} onValueChange={setSelectedSpaceId}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Target Space" />
                        </SelectTrigger>
                        <SelectContent>
                            {spaces.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                <ScrollArea className="h-64 border rounded-md p-2">
                    {isLoading ? (
                        <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                    ) : (data?.items.length === 0 ? (
                        <div className="text-center text-zinc-500 py-8">No orphaned projects found.</div>
                    ) : (
                        <div className="space-y-2">
                            {data?.items.map(project => (
                                <div key={project.id} className="flex items-center space-x-2 p-2 hover:bg-zinc-50 rounded">
                                    <Checkbox
                                        id={project.id}
                                        checked={selectedIds.includes(project.id)}
                                        onCheckedChange={() => toggle(project.id)}
                                    />
                                    <label htmlFor={project.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer w-full select-none">
                                        {project.name}
                                    </label>
                                </div>
                            ))}
                        </div>
                    ))}
                </ScrollArea>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleImport} disabled={selectedIds.length === 0 || !selectedSpaceId || updateProject.isPending}>
                        {updateProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Import Selected
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
