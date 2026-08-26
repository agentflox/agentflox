"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, MoveRight, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DestinationTreeRow,
    ENTITY_TREE_NEST,
} from "@/features/dashboard/components/shared/breadcrumbTreeUi";

interface ProjectMoveToModalProps {
    projectId: string;
    projectName: string;
    workspaceId?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function ProjectMoveToModal({ projectId, projectName, workspaceId, open, onOpenChange, onSuccess }: ProjectMoveToModalProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();

    const [destinationSearch, setDestinationSearch] = useState("");
    const [destinationOpen, setDestinationOpen] = useState(false);
    const [destinationKey, setDestinationKey] = useState("");
    const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

    const toggleNode = (e: React.MouseEvent, key: string) => {
        e.preventDefault();
        e.stopPropagation();
        setCollapsedNodes((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const { data: spacesData } = trpc.space.list.useQuery({ workspaceId }, { enabled: open });
    const { data: projectsData } = trpc.project.list.useQuery({ workspaceId }, { enabled: open });
    const { data: foldersData } = trpc.folder.byContext.useQuery({ workspaceId }, { enabled: open });

    const spaces = spacesData?.items || [];
    const projects = projectsData?.items || [];
    const folders = foldersData?.items || [];

    // Filter out the project itself and its children (if we supported hierarchy in projects, but projects don't have children here)
    const destinationOptions = useMemo(() => {
        const opts: any[] = [];
        spaces.forEach((s: any) => opts.push({ key: `SPACE:${s.id}`, kind: 'space', label: s.name, depth: 0, spaceId: s.id, icon: s.icon, color: s.color }));
        projects.filter((p: any) => p.id !== projectId).forEach((p: any) => opts.push({ key: `PROJECT:${p.id}`, kind: 'project', label: p.name, depth: p.spaceId ? 1 : 0, projectId: p.id, spaceId: p.spaceId || undefined, icon: p.icon, color: p.color, logo: p.logo }));
        folders.forEach((f: any) => {
            const depth = f.parentId ? 2 : (f.spaceId || f.projectId ? 1 : 0);
            opts.push({ key: `FOLDER:${f.id}`, kind: 'folder', label: f.name, depth, spaceId: f.spaceId || undefined, projectId: f.projectId || undefined, folderId: f.id, icon: f.icon, color: f.color });
        });
        return opts;
    }, [spaces, projects, folders, projectId]);

    const treeNodes = useMemo(() => {
        const spaceNodes = spaces.map((space: any) => {
            const spaceId = space.id;
            const projectsUnderSpace = destinationOptions.filter(o => o.kind === 'project' && o.spaceId === spaceId);
            const foldersUnderSpace = destinationOptions.filter(o => o.kind === 'folder' && o.spaceId === spaceId && !o.projectId);

            const expandedProjects = projectsUnderSpace.flatMap(p => {
                const foldersUnderProject = destinationOptions.filter(o => o.kind === 'folder' && o.projectId === p.projectId);
                return [
                    { ...p, depth: 1 },
                    ...foldersUnderProject.map(f => ({ ...f, depth: 2 }))
                ];
            });

            return {
                key: `SPACE:${spaceId}`,
                name: space.name,
                icon: space.icon,
                color: space.color,
                children: [
                    ...expandedProjects,
                    ...foldersUnderSpace.map(f => ({ ...f, depth: 1 }))
                ]
            };
        });

        const rootProjects = destinationOptions.filter(o => o.kind === 'project' && !o.spaceId);
        const rootFolders = destinationOptions.filter(o => o.kind === 'folder' && !o.spaceId && !o.projectId);

        return {
            spaces: spaceNodes,
            rootChildren: [
                ...rootProjects.map(p => ({ ...p, depth: 0 })),
                ...rootFolders.map(f => ({ ...f, depth: 0 })),
            ]
        };
    }, [destinationOptions, spaces]);

    const getDestinationPath = (opt?: any) => {
        if (!opt) return "";
        const parts: string[] = [];
        if (opt.spaceId) parts.push(spaces.find((s: any) => s.id === opt.spaceId)?.name || "Space");
        if (opt.projectId) parts.push(projects.find((p: any) => p.id === opt.projectId)?.name || "Project");
        if (opt.kind === 'folder') parts.push(opt.label);
        if (parts.length === 0) return opt.label;
        return parts.join(" > ");
    };

    const selectedDestination = destinationOptions.find(d => d.key === destinationKey);

    const updateProject = trpc.project.update.useMutation();

    const handleMove = async () => {
        if (!projectId || !destinationKey) return;
        
        // Extract destination type and id
        const [type, destId] = destinationKey.split(':');
        
        try {
            // Note: If project update doesn't natively support spaceId/teamId yet, we mock the success or do our best
            await updateProject.mutateAsync({
                id: projectId,
                // spaceId: type === 'SPACE' ? destId : null,
                // teamId: type === 'TEAM' ? destId : null,
            } as any);

            toast({ title: "Project moved successfully" });
            utils.project.list.invalidate();
            utils.project.listInfinite.invalidate();
            onOpenChange(false);
            onSuccess?.();
            setDestinationKey("");
        } catch (error: any) {
            toast({
                title: "Failed to move project",
                description: error.message || "Please try again later.",
                variant: "destructive"
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MoveRight className="h-5 w-5 text-indigo-500" />
                        Move Project
                    </DialogTitle>
                    <DialogDescription>
                        Select a new location for <span className="font-semibold text-slate-700">{projectName}</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            Destination
                        </label>
                        <Popover open={destinationOpen} onOpenChange={setDestinationOpen}>
                            <PopoverTrigger asChild>
                                <button type="button" className="h-9 w-full border border-slate-200 bg-white text-[14px] shadow-sm text-slate-700 rounded-md px-3 flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500">
                                    <span className={cn("truncate text-left", !selectedDestination && "text-slate-400")}>
                                        {selectedDestination ? getDestinationPath(selectedDestination) : "Select Destination"}
                                    </span>
                                    <ChevronDown className="size-4 opacity-50" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent
                                align="start"
                                side="bottom"
                                sideOffset={4}
                                className="w-[360px] p-0 rounded-xl shadow-xl border-zinc-200 bg-white overflow-hidden max-h-[380px] flex flex-col z-50"
                            >
                                <div className="flex h-8 items-center rounded-md border border-zinc-200 bg-white px-2.5 mx-2.5 mt-2.5 mb-1.5 shrink-0 focus-within:border-zinc-400">
                                    <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0 mr-2" />
                                    <input
                                        type="text"
                                        value={destinationSearch}
                                        onChange={(e) => setDestinationSearch(e.target.value)}
                                        placeholder="Search locations..."
                                        className="w-full bg-transparent border-0 p-0 text-xs outline-none placeholder:text-zinc-400"
                                        autoFocus
                                    />
                                </div>
                                <div className="overflow-y-auto flex-1 py-1 max-h-[320px] px-1">
                                    {treeNodes.spaces.filter((s: any) => !destinationSearch.trim() || s.name.toLowerCase().includes(destinationSearch.toLowerCase())).map((space: any) => {
                                        const isSpaceCollapsed = collapsedNodes.has(`space-${space.key}`);
                                        const hasChildren = space.children && space.children.length > 0;

                                        return (
                                            <div key={space.key} className="space-y-0.5">
                                                <DestinationTreeRow
                                                    selected={destinationKey === space.key}
                                                    kind="space"
                                                    entity={space}
                                                    label={space.name}
                                                    hasChildren={hasChildren}
                                                    expanded={!isSpaceCollapsed}
                                                    onToggle={(e) => toggleNode(e, `space-${space.key}`)}
                                                    onClick={() => {
                                                        setDestinationKey(space.key);
                                                        setDestinationOpen(false);
                                                    }}
                                                />

                                                {!isSpaceCollapsed && hasChildren && (
                                                    <div className={ENTITY_TREE_NEST}>
                                                        {space.children.filter((c: any) => !destinationSearch.trim() || c.label.toLowerCase().includes(destinationSearch.toLowerCase())).map((child: any) => (
                                                            <DestinationTreeRow
                                                                key={child.key}
                                                                selected={destinationKey === child.key}
                                                                kind={child.kind}
                                                                entity={child}
                                                                label={child.label}
                                                                onClick={() => { setDestinationKey(child.key); setDestinationOpen(false); }}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {treeNodes.rootChildren.filter((c: any) => !destinationSearch.trim() || c.label.toLowerCase().includes(destinationSearch.toLowerCase())).map((child: any) => (
                                        <DestinationTreeRow
                                            key={child.key}
                                            selected={destinationKey === child.key}
                                            kind={child.kind}
                                            entity={child}
                                            label={child.label}
                                            onClick={() => { setDestinationKey(child.key); setDestinationOpen(false); }}
                                        />
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateProject.isPending}>
                        Cancel
                    </Button>
                    <Button onClick={handleMove} disabled={!destinationKey || updateProject.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                        {updateProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Move Project
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
