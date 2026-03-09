"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/useToast";

type ItemType = "projects" | "teams" | "tools" | "materials";

type Props = {
  spaceId: string;
  workspaceId?: string;
  type: ItemType;
  open: boolean;
  onClose: () => void;
  inline?: boolean;
};

export function SpaceItemSidebar({ spaceId, workspaceId, type, open, onClose, inline }: Props) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");

  const normalizedType = useMemo(() => type?.toLowerCase(), [type]);
  const projectList = trpc.project.list.useQuery({ scope: "owned", page: 1, pageSize: 50, query: query || undefined } as any, { enabled: open && normalizedType === "projects" });
  const teamList = trpc.team.list.useQuery({ scope: "owned", page: 1, pageSize: 50, query: query || undefined } as any, { enabled: open && normalizedType === "teams" });
  const toolList = trpc.tool.list.useQuery({ scope: "owned", page: 1, pageSize: 50, query: query || undefined } as any, { enabled: open && normalizedType === "tools" });
  const materialList = trpc.material.list.useQuery({ scope: "owned", page: 1, pageSize: 50, query: query || undefined } as any, { enabled: open && normalizedType === "materials" });

  const items = useMemo(() => {
    const list = normalizedType === "projects" ? projectList.data?.items
      : normalizedType === "teams" ? teamList.data?.items
        : normalizedType === "tools" ? toolList.data?.items
          : materialList.data?.items;
    return (list || []).filter((i: any) => i?.spaceId !== spaceId);
  }, [normalizedType, projectList.data?.items, teamList.data?.items, toolList.data?.items, materialList.data?.items, spaceId]);

  const isLoading = (normalizedType === "projects" && projectList.isLoading)
    || (normalizedType === "teams" && teamList.isLoading)
    || (normalizedType === "tools" && toolList.isLoading)
    || (normalizedType === "materials" && materialList.isLoading);

  const addProject = trpc.project.update.useMutation();
  const addTeam = trpc.team.update.useMutation();
  const addTool = trpc.tool.update.useMutation();
  const addMaterial = trpc.material.update.useMutation();

  const handleAdd = async (id: string) => {
    try {
      const updateData = {
        id,
        spaceId,
        workspaceId: workspaceId || null
      };

      if (normalizedType === "projects") {
        await addProject.mutateAsync(updateData);
        await utils.project.list.invalidate();
      } else if (normalizedType === "teams") {
        await addTeam.mutateAsync(updateData);
        await utils.team.list.invalidate();
      } else if (normalizedType === "tools") {
        await addTool.mutateAsync(updateData);
        await utils.tool.list.invalidate();
      } else if (normalizedType === "materials") {
        await addMaterial.mutateAsync(updateData);
        await utils.material.list.invalidate();
      }
      toast({ title: "Added", description: "Item added to space." });
      await utils.space.get.invalidate({ id: spaceId });
      if (workspaceId) await utils.workspace.get.invalidate({ id: workspaceId });
    } catch (error: any) {
      toast({ title: "Failed to add", description: error?.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const displayType = useMemo(() => {
    if (!normalizedType) return "Item";
    if (normalizedType.endsWith('s')) return normalizedType.slice(0, -1);
    return normalizedType;
  }, [normalizedType]);

  return (
    <div className={`${inline ? 'absolute inset-y-0 right-0' : 'fixed inset-y-0 right-0'} z-[60] w-auto min-w-[20rem] max-w-sm bg-background shadow-xl transition-transform duration-300 ${open ? '-translate-x-14' : 'translate-x-full'}`}>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-medium capitalize">Add {displayType}</span>
        <button className="rounded-md border p-1.5 hover:bg-muted" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="p-4 space-y-4">
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
                  <Button size="sm" onClick={() => handleAdd(item.id)} disabled={addProject.isPending || addTeam.isPending || addTool.isPending || addMaterial.isPending}>Add</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SpaceItemSidebar;
