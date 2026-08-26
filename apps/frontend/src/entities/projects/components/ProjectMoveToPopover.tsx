"use client";

import { useState, useMemo } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { Loader2, LogOut, ChevronRight, Search } from "lucide-react";
import {
    DestinationTreeRow,
    ENTITY_TREE_NEST,
} from "@/features/dashboard/components/shared/breadcrumbTreeUi";

interface ProjectMoveToPopoverProps {
    projectId: string;
    projectName: string;
    workspaceId?: string;
    onSuccess?: () => void;
}

export function ProjectMoveToPopover({ projectId, projectName, workspaceId, onSuccess }: ProjectMoveToPopoverProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();

    const [open, setOpen] = useState(false);
    const [destinationSearch, setDestinationSearch] = useState("");
    const [isMoving, setIsMoving] = useState(false);
    const [movingToKey, setMovingToKey] = useState<string | null>(null);
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

    const destinationOptions = useMemo(() => {
        const opts: any[] = [];
        spaces.forEach((s: any) => opts.push({ key: `SPACE:${s.id}`, kind: "space", label: s.name, depth: 0, spaceId: s.id, icon: s.icon, color: s.color }));
        projects.filter((p: any) => p.id !== projectId).forEach((p: any) => opts.push({ key: `PROJECT:${p.id}`, kind: "project", label: p.name, depth: p.spaceId ? 1 : 0, projectId: p.id, spaceId: p.spaceId || undefined, icon: p.icon, color: p.color, logo: p.logo }));
        folders.forEach((f: any) => {
            const depth = f.parentId ? 2 : (f.spaceId || f.projectId ? 1 : 0);
            opts.push({ key: `FOLDER:${f.id}`, kind: "folder", label: f.name, depth, spaceId: f.spaceId || undefined, projectId: f.projectId || undefined, folderId: f.id, icon: f.icon, color: f.color });
        });
        return opts;
    }, [spaces, projects, folders, projectId]);

    const treeNodes = useMemo(() => {
        const spaceNodes = spaces.map((space: any) => {
            const spaceId = space.id;
            const projectsUnderSpace = destinationOptions.filter((o) => o.kind === "project" && o.spaceId === spaceId);
            const foldersUnderSpace = destinationOptions.filter((o) => o.kind === "folder" && o.spaceId === spaceId && !o.projectId);

            const expandedProjects = projectsUnderSpace.flatMap((p) => {
                const foldersUnderProject = destinationOptions.filter((o) => o.kind === "folder" && o.projectId === p.projectId);
                return [{ ...p, depth: 1 }, ...foldersUnderProject.map((f) => ({ ...f, depth: 2 }))];
            });

            return {
                key: `SPACE:${spaceId}`,
                name: space.name,
                icon: space.icon,
                color: space.color,
                children: [...expandedProjects, ...foldersUnderSpace.map((f) => ({ ...f, depth: 1 }))],
            };
        });

        const rootProjects = destinationOptions.filter((o) => o.kind === "project" && !o.spaceId);
        const rootFolders = destinationOptions.filter((o) => o.kind === "folder" && !o.spaceId && !o.projectId);

        return {
            spaces: spaceNodes,
            rootChildren: [
                ...rootProjects.map((p) => ({ ...p, depth: 0 })),
                ...rootFolders.map((f) => ({ ...f, depth: 0 })),
            ],
        };
    }, [destinationOptions, spaces]);

    const updateProject = trpc.project.update.useMutation();

    const handleMove = async (destinationKey: string) => {
        if (!projectId || !destinationKey) return;
        setIsMoving(true);
        setMovingToKey(destinationKey);

        try {
            await updateProject.mutateAsync({
                id: projectId,
            } as any);

            toast({ title: "Project moved successfully" });
            utils.project.list.invalidate();
            utils.project.listInfinite.invalidate();
            setOpen(false);
            onSuccess?.();
        } catch (error: any) {
            toast({
                title: "Failed to move project",
                description: error.message || "Please try again later.",
                variant: "destructive",
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
                <div
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpen(!open);
                    }}
                >
                    {triggerNode}
                </div>
            </HoverCardTrigger>
            <HoverCardContent align="start" side="right" sideOffset={8} className="w-72 p-1.5 bg-white rounded-xl shadow-xl border border-zinc-200/90 flex flex-col gap-0.5 z-[9999]">
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
                    {treeNodes.spaces
                        .filter((s: any) => !destinationSearch.trim() || s.name.toLowerCase().includes(destinationSearch.toLowerCase()))
                        .map((space: any) => {
                            const isCollapsed = collapsedNodes.has(`space-${space.key}`);
                            const hasChildren = space.children?.length > 0;
                            return (
                                <div key={space.key} className="space-y-0.5">
                                    <DestinationTreeRow
                                        selected={movingToKey === space.key}
                                        kind="space"
                                        entity={space}
                                        label={space.name}
                                        hasChildren={hasChildren}
                                        expanded={!isCollapsed}
                                        onToggle={(e) => toggleNode(e, `space-${space.key}`)}
                                        onClick={() => {
                                            if (isMoving) return;
                                            handleMove(space.key);
                                        }}
                                        trailing={isMoving && movingToKey === space.key ? <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" /> : null}
                                    />
                                    {!isCollapsed && hasChildren && (
                                        <div className={ENTITY_TREE_NEST}>
                                            {space.children
                                                .filter((c: any) => !destinationSearch.trim() || c.label.toLowerCase().includes(destinationSearch.toLowerCase()))
                                                .map((child: any) => (
                                                    <DestinationTreeRow
                                                        key={child.key}
                                                        selected={movingToKey === child.key}
                                                        kind={child.kind}
                                                        entity={child}
                                                        label={child.label}
                                                        onClick={() => {
                                                            if (isMoving) return;
                                                            handleMove(child.key);
                                                        }}
                                                        trailing={isMoving && movingToKey === child.key ? <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" /> : null}
                                                    />
                                                ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    {treeNodes.rootChildren
                        .filter((c: any) => !destinationSearch.trim() || c.label.toLowerCase().includes(destinationSearch.toLowerCase()))
                        .map((child: any) => (
                            <DestinationTreeRow
                                key={child.key}
                                selected={movingToKey === child.key}
                                kind={child.kind}
                                entity={child}
                                label={child.label}
                                onClick={() => {
                                    if (isMoving) return;
                                    handleMove(child.key);
                                }}
                                trailing={isMoving && movingToKey === child.key ? <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" /> : null}
                            />
                        ))}
                    {spaces.length === 0 && treeNodes.rootChildren.length === 0 && (
                        <div className="px-3 py-2 text-sm text-zinc-500 text-center italic">No destinations found</div>
                    )}
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}
