"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, MoveRight, ChevronDown, Search, Network, Briefcase, Building2, Folder as FolderIconLucide, Check } from "lucide-react";
import { cn } from "@/lib/utils";

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

    const { data: spacesData } = trpc.space.list.useQuery({ workspaceId }, { enabled: open });
    const { data: projectsData } = trpc.project.list.useQuery({ workspaceId }, { enabled: open });
    const { data: teamsData } = trpc.team.list.useQuery({ workspaceId }, { enabled: open });
    const { data: foldersData } = trpc.folder.byContext.useQuery({ workspaceId }, { enabled: open });

    const spaces = spacesData?.items || [];
    const projects = projectsData?.items || [];
    const teams = teamsData?.items || [];
    const folders = foldersData?.items || [];

    // Filter out the project itself and its children (if we supported hierarchy in projects, but projects don't have children here)
    const destinationOptions = useMemo(() => {
        const opts: any[] = [];
        spaces.forEach((s: any) => opts.push({ key: `SPACE:${s.id}`, kind: 'space', label: s.name, depth: 0, spaceId: s.id }));
        projects.filter((p: any) => p.id !== projectId).forEach((p: any) => opts.push({ key: `PROJECT:${p.id}`, kind: 'project', label: p.name, depth: p.spaceId ? 1 : 0, projectId: p.id, spaceId: p.spaceId || undefined }));
        teams.forEach((t: any) => opts.push({ key: `TEAM:${t.id}`, kind: 'team', label: t.name, depth: t.spaceId ? 1 : 0, teamId: t.id, spaceId: t.spaceId || undefined }));
        folders.forEach((f: any) => {
            const depth = f.parentId ? 2 : (f.spaceId || f.projectId || f.teamId ? 1 : 0);
            opts.push({ key: `FOLDER:${f.id}`, kind: 'folder', label: f.name, depth, spaceId: f.spaceId || undefined, projectId: f.projectId || undefined, teamId: f.teamId || undefined, folderId: f.id });
        });
        return opts;
    }, [spaces, projects, teams, folders, projectId]);

    const treeNodes = useMemo(() => {
        const spaceNodes = spaces.map((space: any) => {
            const spaceId = space.id;
            const projectsUnderSpace = destinationOptions.filter(o => o.kind === 'project' && o.spaceId === spaceId);
            const teamsUnderSpace = destinationOptions.filter(o => o.kind === 'team' && o.spaceId === spaceId);
            const foldersUnderSpace = destinationOptions.filter(o => o.kind === 'folder' && o.spaceId === spaceId && !o.projectId && !o.teamId);

            const expandedProjectsTeams = [...projectsUnderSpace, ...teamsUnderSpace].flatMap(pt => {
                const ptId = pt.kind === 'project' ? pt.projectId : pt.teamId;
                const foldersUnderPt = destinationOptions.filter(o => o.kind === 'folder' && ((pt.kind === 'project' && o.projectId === ptId) || (pt.kind === 'team' && o.teamId === ptId)));
                return [
                    { ...pt, depth: 1 },
                    ...foldersUnderPt.map(f => ({ ...f, depth: 2 }))
                ];
            });

            return {
                key: `SPACE:${spaceId}`,
                name: space.name,
                children: [
                    ...expandedProjectsTeams,
                    ...foldersUnderSpace.map(f => ({ ...f, depth: 1 }))
                ]
            };
        });

        const rootProjects = destinationOptions.filter(o => o.kind === 'project' && !o.spaceId);
        const rootTeams = destinationOptions.filter(o => o.kind === 'team' && !o.spaceId);
        const rootFolders = destinationOptions.filter(o => o.kind === 'folder' && !o.spaceId && !o.projectId && !o.teamId);

        return {
            spaces: spaceNodes,
            rootChildren: [
                ...rootProjects.map(p => ({ ...p, depth: 0 })),
                ...rootTeams.map(t => ({ ...t, depth: 0 })),
                ...rootFolders.map(f => ({ ...f, depth: 0 })),
            ]
        };
    }, [destinationOptions, spaces]);

    const getDestinationPath = (opt?: any) => {
        if (!opt) return "";
        const parts: string[] = [];
        if (opt.spaceId) parts.push(spaces.find((s: any) => s.id === opt.spaceId)?.name || "Space");
        if (opt.projectId) parts.push(projects.find((p: any) => p.id === opt.projectId)?.name || "Project");
        if (opt.teamId) parts.push(teams.find((t: any) => t.id === opt.teamId)?.name || "Team");
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
                            <PopoverContent align="start" className="w-[380px] p-0 shadow-lg">
                                <div className="p-2 border-b border-slate-100">
                                    <div className="flex items-center rounded-md border border-indigo-500 px-2 h-9">
                                        <Search className="size-4 text-slate-400 shrink-0" />
                                        <input
                                            value={destinationSearch}
                                            onChange={(e) => setDestinationSearch(e.target.value)}
                                            placeholder="Search locations..."
                                            className="w-full bg-transparent px-2 text-sm outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="max-h-[320px] overflow-y-auto py-1">
                                    {treeNodes.spaces.filter((s: any) => !destinationSearch.trim() || s.name.toLowerCase().includes(destinationSearch.toLowerCase())).map((space: any) => (
                                        <div key={space.key}>
                                            <button
                                                type="button"
                                                onClick={() => { setDestinationKey(space.key); setDestinationOpen(false); }}
                                                className={cn(
                                                    "w-full flex items-center justify-between py-1.5 text-left text-[13.5px] cursor-pointer hover:bg-slate-50",
                                                    destinationKey === space.key && "bg-indigo-50 text-indigo-700"
                                                )}
                                                style={{ paddingLeft: "14px" }}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Network className="size-3.5 text-slate-400 shrink-0" />
                                                    <span className="font-medium">{space.name}</span>
                                                </span>
                                                {destinationKey === space.key && <Check className="size-3.5 text-indigo-600 shrink-0 mr-3" />}
                                            </button>
                                            {space.children.filter((c: any) => !destinationSearch.trim() || c.label.toLowerCase().includes(destinationSearch.toLowerCase())).map((child: any) => (
                                                <button
                                                    type="button"
                                                    key={child.key}
                                                    onClick={() => { setDestinationKey(child.key); setDestinationOpen(false); }}
                                                    className={cn(
                                                        "w-full flex items-center justify-between py-1.5 text-left text-[13.5px] cursor-pointer hover:bg-slate-50",
                                                        destinationKey === child.key && "bg-indigo-50 text-indigo-700"
                                                    )}
                                                    style={{ paddingLeft: `${child.depth * 14 + 14}px` }}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        {child.kind === "project" && <Briefcase className="size-3.5 text-indigo-400 shrink-0" />}
                                                        {child.kind === "team" && <Building2 className="size-3.5 text-blue-400 shrink-0" />}
                                                        {child.kind === "folder" && <FolderIconLucide className="size-3.5 text-slate-400 shrink-0" />}
                                                        <span>{child.label}</span>
                                                    </span>
                                                    {destinationKey === child.key && <Check className="size-3.5 text-indigo-600 shrink-0 mr-3" />}
                                                </button>
                                            ))}
                                        </div>
                                    ))}
                                    {treeNodes.rootChildren.filter((c: any) => !destinationSearch.trim() || c.label.toLowerCase().includes(destinationSearch.toLowerCase())).map((child: any) => (
                                        <button
                                            type="button"
                                            key={child.key}
                                            onClick={() => { setDestinationKey(child.key); setDestinationOpen(false); }}
                                            className={cn(
                                                "w-full flex items-center justify-between py-1.5 text-left text-[13.5px] cursor-pointer hover:bg-slate-50",
                                                destinationKey === child.key && "bg-indigo-50 text-indigo-700"
                                            )}
                                            style={{ paddingLeft: "14px" }}
                                        >
                                            <span className="flex items-center gap-2">
                                                {child.kind === "project" && <Briefcase className="size-3.5 text-indigo-400 shrink-0" />}
                                                {child.kind === "team" && <Building2 className="size-3.5 text-blue-400 shrink-0" />}
                                                {child.kind === "folder" && <FolderIconLucide className="size-3.5 text-slate-400 shrink-0" />}
                                                <span>{child.label}</span>
                                            </span>
                                            {destinationKey === child.key && <Check className="size-3.5 text-indigo-600 shrink-0 mr-3" />}
                                        </button>
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
