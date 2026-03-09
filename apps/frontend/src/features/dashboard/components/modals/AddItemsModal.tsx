"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Badge } from "@/components/ui/badge";

type ItemType = "projects" | "teams" | "tools" | "materials";

type Props = {
  spaceId: string;
  workspaceId?: string;
  type: ItemType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded?: () => void;
};

export function AddItemsModal({ spaceId, workspaceId, type, open, onOpenChange, onAdded }: Props) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");

  const projectList = trpc.project.list.useQuery({ scope: "owned", page: 1, pageSize: 50, query: query || undefined } as any, { enabled: open && type === "projects" });
  const teamList = trpc.team.list.useQuery({ scope: "owned", page: 1, pageSize: 50, query: query || undefined } as any, { enabled: open && type === "teams" });
  const toolList = trpc.tool.list.useQuery({ scope: "owned", page: 1, pageSize: 50, query: query || undefined } as any, { enabled: open && type === "tools" });
  const materialList = trpc.material.list.useQuery({ scope: "owned", page: 1, pageSize: 50, query: query || undefined } as any, { enabled: open && type === "materials" });

  const items = useMemo(() => {
    const list = type === "projects" ? projectList.data?.items
      : type === "teams" ? teamList.data?.items
      : type === "tools" ? toolList.data?.items
      : materialList.data?.items;
    return (list || []).filter((i: any) => i?.spaceId !== spaceId);
  }, [type, projectList.data?.items, teamList.data?.items, toolList.data?.items, materialList.data?.items, spaceId]);

  const isLoading = (type === "projects" && projectList.isLoading)
    || (type === "teams" && teamList.isLoading)
    || (type === "tools" && toolList.isLoading)
    || (type === "materials" && materialList.isLoading);

  const addProject = trpc.project.update.useMutation();
  const addTeam = trpc.team.update.useMutation();
  const addTool = trpc.tool.update.useMutation();
  const addMaterial = trpc.material.update.useMutation();

  const handleAdd = async (id: string) => {
    try {
      if (type === "projects") {
        await addProject.mutateAsync({ id, spaceId } as any);
        await utils.project.list.invalidate();
      } else if (type === "teams") {
        await addTeam.mutateAsync({ id, spaceId } as any);
        await utils.team.list.invalidate();
      } else if (type === "tools") {
        await addTool.mutateAsync({ id, spaceId } as any);
        await utils.tool.list.invalidate();
      } else if (type === "materials") {
        await addMaterial.mutateAsync({ id, spaceId } as any);
        await utils.material.list.invalidate();
      }
      await utils.space.get.invalidate({ id: spaceId });
      if (workspaceId) await utils.workspace.get.invalidate({ id: workspaceId });
      toast({ title: "Added", description: "Item added to space." });
      onAdded?.();
    } catch (error: any) {
      toast({ title: "Failed to add", description: error?.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const title = type === "projects" ? "Add projects"
    : type === "teams" ? "Add teams"
    : type === "tools" ? "Add tools"
    : "Add materials";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Select items you own to add into this space.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Search by name..." value={query} onChange={(e) => setQuery(e.target.value)} />
          {isLoading ? (
            <div className="py-6 text-sm text-muted-foreground">Loading...</div>
          ) : items.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">No eligible items found.</div>
          ) : (
            <div className="space-y-2">
              {items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name || item.title}</p>
                    {item.description && (
                      <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    {item.status && (<Badge variant="secondary" className="text-xs">{item.status}</Badge>)}
                    <Button onClick={() => handleAdd(item.id)} disabled={addProject.isPending || addTeam.isPending || addTool.isPending || addMaterial.isPending}>Add</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddItemsModal;

