"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, MoveRight, ChevronDown, Search, Network, Briefcase, Users, Folder as FolderIconLucide, Check, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpaceIcon } from "@/entities/spaces/components/SpaceIcon";

interface TeamMoveToModalProps {
    teamId: string;
    teamName: string;
    workspaceId?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function TeamMoveToModal({ teamId, teamName, workspaceId, open, onOpenChange, onSuccess }: TeamMoveToModalProps) {
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
    const { data: teamsData } = trpc.team.list.useQuery({ workspaceId }, { enabled: open });
    const { data: foldersData } = trpc.folder.byContext.useQuery({ workspaceId }, { enabled: open });

    const spaces = spacesData?.items || [];
    const projects = projectsData?.items || [];
    const teams = teamsData?.items || [];
    const folders = foldersData?.items || [];

    const destinationOptions = useMemo(() => {
        const opts: any[] = [];
        spaces.forEach((s: any) => opts.push({ key: `SPACE:${s.id}`, kind: 'space', label: s.name, depth: 0, spaceId: s.id }));
        projects.forEach((p: any) => opts.push({ key: `PROJECT:${p.id}`, kind: 'project', label: p.name, depth: p.spaceId ? 1 : 0, projectId: p.id, spaceId: p.spaceId || undefined }));
        teams.filter((t: any) => t.id !== teamId).forEach((t: any) => opts.push({ key: `TEAM:${t.id}`, kind: 'team', label: t.name, depth: t.spaceId ? 1 : 0, teamId: t.id, spaceId: t.spaceId || undefined }));
        folders.forEach((f: any) => {
            const depth = f.parentId ? 2 : (f.spaceId || f.projectId || f.teamId ? 1 : 0);
            opts.push({ key: `FOLDER:${f.id}`, kind: 'folder', label: f.name, depth, spaceId: f.spaceId || undefined, projectId: f.projectId || undefined, teamId: f.teamId || undefined, folderId: f.id });
        });
        return opts;
    }, [spaces, projects, teams, folders, teamId]);

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
    const updateTeam = trpc.team.update.useMutation();

    const handleMove = async () => {
        if (!teamId || !destinationKey) return;
        
        const [type, destId] = destinationKey.split(':');
        
        try {
            await updateTeam.mutateAsync({
                id: teamId,
                // spaceId: type === 'SPACE' ? destId : null,
            } as any);

            toast({ title: "Team moved successfully" });
            utils.team.list.invalidate();
            utils.team.listInfinite.invalidate();
            onOpenChange(false);
            onSuccess?.();
            setDestinationKey("");
        } catch (error: any) {
            toast({
                title: "Failed to move team",
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
                        Move Team
                    </DialogTitle>
                    <DialogDescription>
                        Select a new location for <span className="font-semibold text-slate-700">{teamName}</span>.
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
                                                <div
                                                    className="group/space w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold text-zinc-800 hover:bg-zinc-100/70 transition-colors cursor-pointer select-none"
                                                    onClick={(e) => {
                                                        if (hasChildren) toggleNode(e, `space-${space.key}`);
                                                        else {
                                                            setDestinationKey(space.key);
                                                            setDestinationOpen(false);
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                                                        <div className="relative h-5 w-5 rounded shrink-0 flex items-center justify-center">
                                                            <span className={cn("h-5 w-5 rounded shrink-0 overflow-hidden grid place-items-center bg-indigo-500 text-white ml-0.5", hasChildren && "group-hover/space:hidden")}>
                                                                <SpaceIcon icon={space.icon} className="text-white" size={13} fill />
                                                            </span>
                                                            {hasChildren && (
                                                                <div
                                                                    className="hidden group-hover/space:flex items-center justify-center h-5 w-5 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors"
                                                                    onClick={(e) => toggleNode(e, `space-${space.key}`)}
                                                                >
                                                                    <Play className={cn("h-2.5 w-2.5 fill-zinc-700 text-zinc-700 transition-transform duration-200", !isSpaceCollapsed && "rotate-90")} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="truncate flex-1 font-medium">{space.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            type="button"
                                                            className="text-[11px] text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 px-1.5 py-0.5 rounded transition-colors"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDestinationKey(space.key);
                                                                setDestinationOpen(false);
                                                            }}
                                                        >
                                                            Select
                                                        </button>
                                                        {destinationKey === space.key && <Check className="h-3.5 w-3.5 text-zinc-900 shrink-0" />}
                                                    </div>
                                                </div>

                                                {!isSpaceCollapsed && (
                                                    <div className="space-y-0.5 ml-4 pl-1 border-l border-zinc-200/70">
                                                        {space.children.filter((c: any) => !destinationSearch.trim() || c.label.toLowerCase().includes(destinationSearch.toLowerCase())).map((child: any) => (
                                                            <button
                                                                type="button"
                                                                key={child.key}
                                                                onClick={() => { setDestinationKey(child.key); setDestinationOpen(false); }}
                                                                className={cn(
                                                                    "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-left hover:bg-zinc-100/70 transition-colors cursor-pointer",
                                                                    destinationKey === child.key ? "bg-zinc-100 font-semibold text-zinc-900" : "text-zinc-700"
                                                                )}
                                                                style={{ paddingLeft: `${(child.depth - 1) * 12 + 8}px` }}
                                                            >
                                                                <div className="flex items-center gap-2 truncate">
                                                                    {child.kind === "project" && (
                                                                        <div className="h-4 w-4 rounded bg-purple-50 flex items-center justify-center shrink-0">
                                                                            <Briefcase className="h-3 w-3 text-purple-600 shrink-0" />
                                                                        </div>
                                                                    )}
                                                                    {child.kind === "team" && (
                                                                        <div className="h-4 w-4 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                                                                            <Users className="h-3 w-3 text-emerald-600 shrink-0" />
                                                                        </div>
                                                                    )}
                                                                    {child.kind === "folder" && (
                                                                        <div className="h-4 w-4 rounded bg-blue-50 flex items-center justify-center shrink-0">
                                                                            <FolderIconLucide className="h-3 w-3 text-blue-600 shrink-0" />
                                                                        </div>
                                                                    )}
                                                                    <span className="truncate">{child.label}</span>
                                                                </div>
                                                                {destinationKey === child.key && <Check className="h-3.5 w-3.5 text-zinc-900 shrink-0" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {treeNodes.rootChildren.filter((c: any) => !destinationSearch.trim() || c.label.toLowerCase().includes(destinationSearch.toLowerCase())).map((child: any) => (
                                        <button
                                            type="button"
                                            key={child.key}
                                            onClick={() => { setDestinationKey(child.key); setDestinationOpen(false); }}
                                            className={cn(
                                                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left hover:bg-zinc-100/70 transition-colors cursor-pointer",
                                                destinationKey === child.key ? "bg-zinc-100 font-semibold text-zinc-900" : "text-zinc-700"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                {child.kind === "project" && (
                                                    <div className="h-4 w-4 rounded bg-purple-50 flex items-center justify-center shrink-0">
                                                        <Briefcase className="h-3 w-3 text-purple-600 shrink-0" />
                                                    </div>
                                                )}
                                                {child.kind === "team" && (
                                                    <div className="h-4 w-4 rounded bg-emerald-50 flex items-center justify-center shrink-0">
                                                        <Users className="h-3 w-3 text-emerald-600 shrink-0" />
                                                    </div>
                                                )}
                                                {child.kind === "folder" && (
                                                    <div className="h-4 w-4 rounded bg-blue-50 flex items-center justify-center shrink-0">
                                                        <FolderIconLucide className="h-3 w-3 text-blue-600 shrink-0" />
                                                    </div>
                                                )}
                                                <span className="truncate">{child.label}</span>
                                            </div>
                                            {destinationKey === child.key && <Check className="h-3.5 w-3.5 text-zinc-900 shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateTeam.isPending}>
                        Cancel
                    </Button>
                    <Button onClick={handleMove} disabled={!destinationKey || updateTeam.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                        {updateTeam.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Move Team
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
