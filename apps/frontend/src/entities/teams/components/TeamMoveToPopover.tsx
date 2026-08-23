"use client";

import { useState, useMemo } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, LogOut, ChevronRight, Search, Network, Briefcase, Building2, Folder as FolderIconLucide } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamMoveToPopoverProps {
    teamId: string;
    teamName: string;
    workspaceId?: string;
    onSuccess?: () => void;
}

export function TeamMoveToPopover({ teamId, teamName, workspaceId, onSuccess }: TeamMoveToPopoverProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();

    const [open, setOpen] = useState(false);
    const [destinationSearch, setDestinationSearch] = useState("");
    const [isMoving, setIsMoving] = useState(false);
    const [movingToKey, setMovingToKey] = useState<string | null>(null);

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

    const updateTeam = trpc.team.update.useMutation();

    const handleMove = async (destinationKey: string) => {
        if (!teamId || !destinationKey) return;
        setIsMoving(true);
        setMovingToKey(destinationKey);
        
        const [type, destId] = destinationKey.split(':');
        
        try {
            await updateTeam.mutateAsync({
                id: teamId,
                // spaceId: type === 'SPACE' ? destId : null,
            } as any);

            toast({ title: "Team moved successfully" });
            utils.team.list.invalidate();
            utils.team.listInfinite.invalidate();
            setOpen(false);
            onSuccess?.();
        } catch (error: any) {
            toast({
                title: "Failed to move team",
                description: error.message || "Please try again later.",
                variant: "destructive"
            });
        } finally {
            setIsMoving(false);
            setMovingToKey(null);
        }
    };

    const triggerNode = (
        <button
            type="button"
            className="flex items-center justify-between px-2.5 py-1.5 text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer w-full text-left transition-colors font-normal"
        >
            <div className="flex items-center gap-2">
                <LogOut className="h-4 w-4 shrink-0 text-zinc-500" />
                <span>Move</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
        </button>
    );

    return (
        <HoverCard open={open} onOpenChange={setOpen} openDelay={150} closeDelay={200}>
            <HoverCardTrigger asChild>
                <div onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen(!open);
                }}>
                    {triggerNode}
                </div>
            </HoverCardTrigger>
            <HoverCardContent align="start" side="right" sideOffset={8} className="w-64 p-1.5 bg-white rounded-xl shadow-xl border border-zinc-200/90 flex flex-col gap-0.5 z-[9999]">
                <div className="p-1 pb-1.5 border-b border-zinc-100 mb-1">
                    <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50/50 px-2.5 h-8 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                        <Search className="size-3.5 text-zinc-400 shrink-0" />
                        <input
                            value={destinationSearch}
                            onChange={(e) => setDestinationSearch(e.target.value)}
                            placeholder="Search locations..."
                            className="w-full bg-transparent px-2 text-xs outline-none placeholder:text-zinc-400"
                            autoFocus
                        />
                    </div>
                </div>
                <div className="max-h-[320px] overflow-y-auto py-0.5 space-y-0.5">
                    {treeNodes.spaces.filter((s: any) => !destinationSearch.trim() || s.name.toLowerCase().includes(destinationSearch.toLowerCase())).map((space: any) => (
                        <div key={space.key}>
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMove(space.key); }}
                                disabled={isMoving}
                                className={cn(
                                    "w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer transition-colors font-normal",
                                    isMoving && movingToKey === space.key && "bg-indigo-50 text-indigo-700 pointer-events-none"
                                )}
                                style={{ paddingLeft: "10px" }}
                            >
                                {isMoving && movingToKey === space.key ? <Loader2 className="size-3.5 text-indigo-500 shrink-0 animate-spin" /> : <Network className="size-3.5 text-zinc-400 shrink-0" />}
                                <span className="font-medium truncate flex-1">{space.name}</span>
                            </button>
                            {space.children.filter((c: any) => !destinationSearch.trim() || c.label.toLowerCase().includes(destinationSearch.toLowerCase())).map((child: any) => (
                                <button
                                    type="button"
                                    key={child.key}
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMove(child.key); }}
                                    disabled={isMoving}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer transition-colors font-normal",
                                        isMoving && movingToKey === child.key && "bg-indigo-50 text-indigo-700 pointer-events-none"
                                    )}
                                    style={{ paddingLeft: `${child.depth * 14 + 10}px` }}
                                >
                                    {isMoving && movingToKey === child.key ? <Loader2 className="size-3.5 text-indigo-500 shrink-0 animate-spin" /> : (
                                        <>
                                            {child.kind === "project" && <Briefcase className="size-3.5 text-indigo-400 shrink-0" />}
                                            {child.kind === "team" && <Building2 className="size-3.5 text-blue-400 shrink-0" />}
                                            {child.kind === "folder" && <FolderIconLucide className="size-3.5 text-zinc-400 shrink-0" />}
                                        </>
                                    )}
                                    <span className="truncate flex-1">{child.label}</span>
                                </button>
                            ))}
                        </div>
                    ))}
                    {treeNodes.rootChildren.filter((c: any) => !destinationSearch.trim() || c.label.toLowerCase().includes(destinationSearch.toLowerCase())).map((child: any) => (
                        <button
                            type="button"
                            key={child.key}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMove(child.key); }}
                            disabled={isMoving}
                            className={cn(
                                "w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-sm rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer transition-colors font-normal",
                                isMoving && movingToKey === child.key && "bg-indigo-50 text-indigo-700 pointer-events-none"
                            )}
                            style={{ paddingLeft: "10px" }}
                        >
                            {isMoving && movingToKey === child.key ? <Loader2 className="size-3.5 text-indigo-500 shrink-0 animate-spin" /> : (
                                <>
                                    {child.kind === "project" && <Briefcase className="size-3.5 text-indigo-400 shrink-0" />}
                                    {child.kind === "team" && <Building2 className="size-3.5 text-blue-400 shrink-0" />}
                                    {child.kind === "folder" && <FolderIconLucide className="size-3.5 text-zinc-400 shrink-0" />}
                                </>
                            )}
                            <span className="truncate flex-1">{child.label}</span>
                        </button>
                    ))}
                    {spaces.length === 0 && treeNodes.rootChildren.length === 0 && (
                        <div className="px-3 py-2 text-sm text-zinc-500 text-center italic">No destinations found</div>
                    )}
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}
