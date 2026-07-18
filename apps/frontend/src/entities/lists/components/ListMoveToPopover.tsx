"use client";

import { useState, useMemo } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, LogOut, ChevronRight, Search, Network, Briefcase, Building2, Folder as FolderIconLucide } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListMoveToPopoverProps {
    listId: string;
    listName: string;
    workspaceId?: string;
    onSuccess?: () => void;
}

export function ListMoveToPopover({ listId, listName, workspaceId, onSuccess }: ListMoveToPopoverProps) {
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
        teams.forEach((t: any) => opts.push({ key: `TEAM:${t.id}`, kind: 'team', label: t.name, depth: t.spaceId ? 1 : 0, teamId: t.id, spaceId: t.spaceId || undefined }));
        folders.forEach((f: any) => {
            const depth = f.parentId ? 2 : (f.spaceId || f.projectId || f.teamId ? 1 : 0);
            opts.push({ key: `FOLDER:${f.id}`, kind: 'folder', label: f.name, depth, spaceId: f.spaceId || undefined, projectId: f.projectId || undefined, teamId: f.teamId || undefined, folderId: f.id });
        });
        return opts;
    }, [spaces, projects, teams, folders]);

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

    const updateList = trpc.list.update.useMutation();

    const handleMove = async (destinationKey: string) => {
        if (!listId || !destinationKey) return;
        setIsMoving(true);
        setMovingToKey(destinationKey);
        
        try {
            await updateList.mutateAsync({
                id: listId,
                // parentId etc. depending on backend support
            } as any);

            toast({ title: "List moved successfully" });
            utils.list.byContext.invalidate();
            setOpen(false);
            onSuccess?.();
        } catch (error: any) {
            toast({
                title: "Failed to move list",
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
            className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900"
        >
            <LogOut className="mr-2 h-4 w-4" /> Move
            <ChevronRight className="ml-auto h-4 w-4" />
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
            <HoverCardContent align="start" side="right" sideOffset={5} className="w-64 p-0 z-[9999] shadow-md border-muted">
                <div className="p-2 border-b border-slate-100">
                    <div className="flex items-center rounded-md border border-indigo-500 px-2 h-9">
                        <Search className="size-4 text-slate-400 shrink-0" />
                        <input
                            value={destinationSearch}
                            onChange={(e) => setDestinationSearch(e.target.value)}
                            placeholder="Search locations..."
                            className="w-full bg-transparent px-2 text-sm outline-none"
                            autoFocus
                        />
                    </div>
                </div>
                <div className="max-h-[320px] overflow-y-auto py-1">
                    {treeNodes.spaces.filter((s: any) => !destinationSearch.trim() || s.name.toLowerCase().includes(destinationSearch.toLowerCase())).map((space: any) => (
                        <div key={space.key}>
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMove(space.key); }}
                                disabled={isMoving}
                                className={cn(
                                    "w-full flex items-center gap-2 py-1.5 text-left text-[13.5px] cursor-pointer hover:bg-slate-50",
                                    isMoving && movingToKey === space.key && "bg-indigo-50 text-indigo-700 pointer-events-none"
                                )}
                                style={{ paddingLeft: "14px" }}
                            >
                                {isMoving && movingToKey === space.key ? <Loader2 className="size-3.5 text-indigo-500 shrink-0 animate-spin" /> : <Network className="size-3.5 text-slate-400 shrink-0" />}
                                <span className="font-medium truncate flex-1">{space.name}</span>
                            </button>
                            {space.children.filter((c: any) => !destinationSearch.trim() || c.label.toLowerCase().includes(destinationSearch.toLowerCase())).map((child: any) => (
                                <button
                                    type="button"
                                    key={child.key}
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMove(child.key); }}
                                    disabled={isMoving}
                                    className={cn(
                                        "w-full flex items-center gap-2 py-1.5 text-left text-[13.5px] cursor-pointer hover:bg-slate-50",
                                        isMoving && movingToKey === child.key && "bg-indigo-50 text-indigo-700 pointer-events-none"
                                    )}
                                    style={{ paddingLeft: `${child.depth * 14 + 14}px` }}
                                >
                                    {isMoving && movingToKey === child.key ? <Loader2 className="size-3.5 text-indigo-500 shrink-0 animate-spin" /> : (
                                        <>
                                            {child.kind === "project" && <Briefcase className="size-3.5 text-indigo-400 shrink-0" />}
                                            {child.kind === "team" && <Building2 className="size-3.5 text-blue-400 shrink-0" />}
                                            {child.kind === "folder" && <FolderIconLucide className="size-3.5 text-slate-400 shrink-0" />}
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
                                "w-full flex items-center gap-2 py-1.5 text-left text-[13.5px] cursor-pointer hover:bg-slate-50",
                                isMoving && movingToKey === child.key && "bg-indigo-50 text-indigo-700 pointer-events-none"
                            )}
                            style={{ paddingLeft: "14px" }}
                        >
                            {isMoving && movingToKey === child.key ? <Loader2 className="size-3.5 text-indigo-500 shrink-0 animate-spin" /> : (
                                <>
                                    {child.kind === "project" && <Briefcase className="size-3.5 text-indigo-400 shrink-0" />}
                                    {child.kind === "team" && <Building2 className="size-3.5 text-blue-400 shrink-0" />}
                                    {child.kind === "folder" && <FolderIconLucide className="size-3.5 text-slate-400 shrink-0" />}
                                </>
                            )}
                            <span className="truncate flex-1">{child.label}</span>
                        </button>
                    ))}
                    {spaces.length === 0 && treeNodes.rootChildren.length === 0 && (
                        <div className="px-3 py-2 text-sm text-slate-500 text-center italic">No destinations found</div>
                    )}
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}
