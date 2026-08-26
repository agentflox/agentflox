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
    const { data: teamsData } = trpc.team.list.useQuery({ workspaceId }, { enabled: open });
    const { data: foldersData } = trpc.folder.byContext.useQuery({ workspaceId }, { enabled: open });

    const spaces = spacesData?.items || [];
    const teams = teamsData?.items || [];
    const folders = foldersData?.items || [];

    const destinationOptions = useMemo(() => {
        const opts: any[] = [];
        spaces.forEach((s: any) => opts.push({ key: `SPACE:${s.id}`, kind: 'space', label: s.name, depth: 0, spaceId: s.id, icon: s.icon, color: s.color }));
        teams.filter((t: any) => t.id !== teamId).forEach((t: any) => opts.push({ key: `TEAM:${t.id}`, kind: 'team', label: t.name, depth: t.spaceId ? 1 : 0, teamId: t.id, spaceId: t.spaceId || undefined, icon: t.icon, color: t.color }));
        folders.forEach((f: any) => {
            const depth = f.parentId ? 2 : (f.spaceId || f.teamId ? 1 : 0);
            opts.push({ key: `FOLDER:${f.id}`, kind: 'folder', label: f.name, depth, spaceId: f.spaceId || undefined, teamId: f.teamId || undefined, folderId: f.id, icon: f.icon, color: f.color });
        });
        return opts;
    }, [spaces, teams, folders, teamId]);

    const treeNodes = useMemo(() => {
        const spaceNodes = spaces.map((space: any) => {
            const spaceId = space.id;
            const teamsUnderSpace = destinationOptions.filter(o => o.kind === 'team' && o.spaceId === spaceId);
            const foldersUnderSpace = destinationOptions.filter(o => o.kind === 'folder' && o.spaceId === spaceId && !o.teamId);

            const expandedTeams = teamsUnderSpace.flatMap(t => {
                const foldersUnderTeam = destinationOptions.filter(o => o.kind === 'folder' && o.teamId === t.teamId);
                return [
                    { ...t, depth: 1 },
                    ...foldersUnderTeam.map(f => ({ ...f, depth: 2 }))
                ];
            });

            return {
                key: `SPACE:${spaceId}`,
                name: space.name,
                icon: space.icon,
                color: space.color,
                children: [
                    ...expandedTeams,
                    ...foldersUnderSpace.map(f => ({ ...f, depth: 1 }))
                ]
            };
        });

        const rootTeams = destinationOptions.filter(o => o.kind === 'team' && !o.spaceId);
        const rootFolders = destinationOptions.filter(o => o.kind === 'folder' && !o.spaceId && !o.teamId);

        return {
            spaces: spaceNodes,
            rootChildren: [
                ...rootTeams.map(t => ({ ...t, depth: 0 })),
                ...rootFolders.map(f => ({ ...f, depth: 0 })),
            ]
        };
    }, [destinationOptions, spaces]);

    const getDestinationPath = (opt?: any) => {
        if (!opt) return "";
        const parts: string[] = [];
        if (opt.spaceId) parts.push(spaces.find((s: any) => s.id === opt.spaceId)?.name || "Space");
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
