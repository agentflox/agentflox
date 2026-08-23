"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
    Users, FolderKanban, Clock, Activity,
    FolderOpen, Plus, ChevronRight,
    List, Layers, Hash, Settings2,
    ExternalLink, Link2, Check, MessageSquare
} from "lucide-react";
import { SpaceIcon } from "@/entities/spaces/components/SpaceIcon";
import { UserProfileHoverCard } from "@/entities/users/components/UserProfileHoverCard";
import { ProjectIcon } from "@/entities/projects/components/ProjectIcon";
import { TeamIcon } from "@/entities/teams/components/TeamIcon";
import { EntityIcon } from "@/entities/shared/components/EntityIcon";
import { SpaceGeneralSettingsModal } from "@/entities/spaces/components/SpaceGeneralSettingsModal";
import { TeamCreationModal } from "@/entities/teams/components/TeamCreationModal";
import { ProjectCreationModal } from "@/entities/projects/components/ProjectCreationModal";
import { FolderCreationModal } from "@/entities/folders/components/FolderCreationModal";
import { ListCreationModal } from "@/entities/lists/components/ListCreationModal";
import { ChatCreationModal } from "@/entities/channels/components/ChatCreationModal";
import { ShareModal } from "@/components/permissions/ShareModal";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface SpaceOverviewTabProps {
    space: any;
    projects?: any[];
    teams?: any[];
}

// ── Build URL helpers ──────────────────────────────────────────────────────
function buildUrl(spaceId: string, tab: string, paramKey: string, id: string) {
    return `/dashboard/spaces/${spaceId}?tab=${tab}&${paramKey}=${id}`;
}

// ── Tooltip ────────────────────────────────────────────────────────────────
function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
    const anchorRef = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });

    const updatePosition = useCallback(() => {
        const rect = anchorRef.current?.getBoundingClientRect();
        if (!rect) return;
        setCoords({
            top: rect.top - 8,
            left: rect.left + rect.width / 2,
        });
    }, []);

    function handleEnter() {
        updatePosition();
        setVisible(true);
    }

    function handleLeave() {
        setVisible(false);
    }

    useEffect(() => {
        if (!visible) return;
        window.addEventListener("scroll", updatePosition, true);
        window.addEventListener("resize", updatePosition);
        return () => {
            window.removeEventListener("scroll", updatePosition, true);
            window.removeEventListener("resize", updatePosition);
        };
    }, [visible, updatePosition]);

    return (
        <div
            ref={anchorRef}
            className="relative"
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
        >
            {children}
            {visible &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-full transition-opacity duration-150"
                        style={{ top: coords.top, left: coords.left }}
                    >
                        <div className="bg-slate-900 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                            {label}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}

// ── Row action buttons ──────────────────────────────────────────────────────
function RowActions({ url, onOpen }: { url: string; onOpen?: () => void }) {
    const router = useRouter();
    const [copied, setCopied] = useState(false);

    function handleOpen(e: React.MouseEvent) {
        e.stopPropagation();
        if (onOpen) onOpen();
        else router.push(url);
    }

    async function handleCopyLink(e: React.MouseEvent) {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(window.location.origin + url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // fallback: do nothing
        }
    }

    return (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
            <Tooltip label="Open">
                <button
                    onClick={handleOpen}
                    className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300 hover:shadow-sm hover:bg-slate-100 transition-all duration-150 cursor-pointer"
                >
                    <ExternalLink className="h-4 w-4" />
                </button>
            </Tooltip>
            <Tooltip label={copied ? "Copied!" : "Copy link"}>
                <button
                    onClick={handleCopyLink}
                    className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-100 hover:shadow-sm transition-all duration-150 cursor-pointer"
                >
                    {copied ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                        <Link2 className="h-4 w-4" />
                    )}
                </button>
            </Tooltip>
        </div>
    );
}

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({
    icon: Icon,
    label,
    value,
    accent,
}: {
    icon: React.ElementType;
    label: string;
    value: number | string;
    accent: string;
}) {
    return (
        <div className="group relative flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300 overflow-hidden">
            <div className={cn("absolute top-0 left-0 h-0.5 w-full rounded-t-xl", accent)} />
            <div className="flex items-center justify-between">
                <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100",
                    accent.replace("bg-", "bg-").replace("-500", "-50")
                )}>
                    <Icon className={cn("h-4 w-4", accent.replace("bg-", "text-"))} />
                </div>
            </div>
            <div>
                <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
            </div>
        </div>
    );
}

// ── Section header ─────────────────────────────────────────────────────────
function SectionHeader({
    icon: Icon,
    title,
    count,
    onAdd,
    addLabel,
}: {
    icon: React.ElementType;
    title: string;
    count?: number;
    onAdd?: () => void;
    addLabel?: string;
}) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
                {count !== undefined && (
                    <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">
                        {count}
                    </span>
                )}
            </div>
            {onAdd && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onAdd}
                    className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {addLabel || "Add"}
                </Button>
            )}
        </div>
    );
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
}: {
    icon: React.ElementType;
    title: string;
    description: string;
    actionLabel: string;
    onAction?: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <div className="h-12 w-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
                <Icon className="h-5 w-5 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-700">{title}</p>
            <p className="text-xs text-slate-400 mt-1 mb-4 max-w-[220px] leading-relaxed">{description}</p>
            <button
                onClick={onAction}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg px-4 py-1.5 bg-white hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-all duration-150 shadow-sm"
            >
                <Plus className="h-3.5 w-3.5" />
                {actionLabel}
            </button>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────
export function SpaceOverviewTab({ space }: SpaceOverviewTabProps) {
    const [generalSettingsOpen, setGeneralSettingsOpen] = useState(false);
    const [teamModalOpen, setTeamModalOpen] = useState(false);
    const [projectModalOpen, setProjectModalOpen] = useState(false);
    const [folderModalOpen, setFolderModalOpen] = useState(false);
    const [listModalOpen, setListModalOpen] = useState(false);
    const [chatModalOpen, setChatModalOpen] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const router = useRouter();
    const utils = trpc.useUtils();

    const refreshSpace = useCallback(() => {
        utils.space.get.invalidate({ id: space.id });
    }, [utils, space.id]);

    const createChannel = trpc.channel.create.useMutation({
        onSuccess: () => {
            refreshSpace();
            utils.channel.list.invalidate({ workspaceId: space.workspaceId });
        },
    });

    const members = useMemo(() => (space as any)?.members ?? [], [space]);
    const lists = useMemo(() => (space as any)?.lists ?? [], [space]);
    const folders = useMemo(() => (space as any)?.folders ?? [], [space]);
    const projects = useMemo(() => (space as any)?.projects ?? [], [space]);
    const teams = useMemo(() => (space as any)?.teams ?? [], [space]);
    const channels = useMemo(() => (space as any)?.channels ?? [], [space]);

    if (!space) return null;

    const spaceId = space.id;

    return (
        <>
            <div className="h-full w-full overflow-y-auto">
                <div className="w-full px-6 py-6 space-y-5">

                    {/* ── Hero ─────────────────────────────────────────── */}
                    <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div
                            className="absolute inset-0 opacity-[0.04] pointer-events-none"
                            style={{
                                background: `radial-gradient(ellipse 80% 60% at 70% 50%, ${space.color || "#6366f1"}, transparent)`,
                            }}
                        />
                        <div
                            className="absolute top-0 left-0 right-0 h-0.5"
                            style={{ background: `linear-gradient(90deg, ${space.color || "#6366f1"}cc, transparent)` }}
                        />

                        <div className="relative z-10 flex flex-col sm:flex-row gap-5 items-start p-6">
                            <div
                                className="h-12 w-12 rounded-xl flex items-center justify-center border shrink-0"
                                style={{
                                    backgroundColor: `${space.color || "#6366f1"}18`,
                                    borderColor: `${space.color || "#6366f1"}30`,
                                    color: space.color || "#6366f1",
                                }}
                            >
                                <SpaceIcon icon={space.icon} size={24} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-lg font-bold text-slate-900 tracking-tight truncate">
                                        {space.name}
                                    </h1>
                                    {!space.isActive && (
                                        <Badge variant="secondary" className="text-xs">Archived</Badge>
                                    )}
                                    <Badge variant="outline" className="text-xs capitalize border-slate-200 text-slate-500">
                                        {space.visibility?.toLowerCase() ?? "private"}
                                    </Badge>
                                </div>
                                <p className="mt-1 text-sm text-slate-500 max-w-2xl leading-relaxed line-clamp-2">
                                    {space.description || "No description — click to add context for your team."}
                                </p>
                                <div className="flex flex-wrap gap-3 mt-2">
                                    {space.createdAt && (
                                        <span className="flex items-center gap-1.5 text-xs text-slate-400">
                                            <Clock className="h-3.5 w-3.5" />
                                            Created {formatDistanceToNow(new Date(space.createdAt), { addSuffix: true })}
                                        </span>
                                    )}
                                    {space.updatedAt && (
                                        <span className="flex items-center gap-1.5 text-xs text-slate-400">
                                            <Activity className="h-3.5 w-3.5" />
                                            Updated {formatDistanceToNow(new Date(space.updatedAt), { addSuffix: true })}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => setGeneralSettingsOpen(true)}
                                className={cn(
                                    "shrink-0 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5",
                                    "text-xs font-medium text-slate-600",
                                    "border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm",
                                    "hover:bg-white hover:border-slate-300 hover:text-slate-900 hover:shadow",
                                    "transition-all duration-150 active:scale-[0.98] cursor-pointer"
                                )}
                            >
                                <Settings2 className="h-3.5 w-3.5 text-slate-400" />
                                Settings
                            </button>
                        </div>
                    </div>

                    {/* ── Stats ────────────────────────────────────────── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatCard icon={Users} label="Members" value={members.length} accent="bg-blue-500" />
                        <StatCard icon={FolderKanban} label="Projects" value={projects.length} accent="bg-orange-500" />
                        <StatCard icon={Hash} label="Teams" value={teams.length} accent="bg-indigo-500" />
                        <StatCard icon={Layers} label="Lists" value={lists.length} accent="bg-emerald-500" />
                    </div>

                    {/* ── Projects + Teams ─────────────────────────────── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Projects */}
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="px-5 pt-4 pb-3 border-b border-slate-100">
                                <SectionHeader icon={FolderKanban} title="Projects" count={projects.length} onAdd={() => setProjectModalOpen(true)} addLabel="New Project" />
                            </div>
                            {projects.length === 0 ? (
                                <EmptyState
                                    icon={FolderKanban}
                                    title="No projects yet"
                                    description="Projects help you track goals and deliverables in this space"
                                    actionLabel="Add Project"
                                    onAction={() => setProjectModalOpen(true)}
                                />
                            ) : (
                                <ScrollArea className="max-h-[320px]">
                                    <div className="divide-y divide-slate-50">
                                        {projects.map((project: any) => {
                                            const url = buildUrl(spaceId, "projects", "pj", project.id);
                                            return (
                                                <div
                                                    key={project.id}
                                                    onClick={() => router.push(url)}
                                                    className="group flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50/70 transition-colors cursor-pointer"
                                                >
                                                    <div
                                                        className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                                                        style={{ backgroundColor: project.color || "#6366f1" }}
                                                    >
                                                        <ProjectIcon icon={project.icon} size={14} className="text-white" fill />
                                                    </div>
                                                    <span className="flex-1 text-sm text-slate-700 font-medium truncate group-hover:text-indigo-600 transition-colors">
                                                        {project.name}
                                                    </span>
                                                    <RowActions url={url} onOpen={() => router.push(url)} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            )}
                        </div>

                        {/* Teams */}
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="px-5 pt-4 pb-3 border-b border-slate-100">
                                <SectionHeader icon={Users} title="Teams" count={teams.length} onAdd={() => setTeamModalOpen(true)} addLabel="New Team" />
                            </div>
                            {teams.length === 0 ? (
                                <EmptyState
                                    icon={Users}
                                    title="No teams yet"
                                    description="Teams let you group members and assign work together"
                                    actionLabel="Add Team"
                                    onAction={() => setTeamModalOpen(true)}
                                />
                            ) : (
                                <ScrollArea className="max-h-[320px]">
                                    <div className="divide-y divide-slate-50">
                                        {teams.map((team: any) => {
                                            const memberCount = team._count?.members ?? team.memberCount ?? team.members?.length ?? 0;
                                            const url = buildUrl(spaceId, "teams", "tm", team.id);
                                            return (
                                                <div
                                                    key={team.id}
                                                    onClick={() => router.push(url)}
                                                    className="group flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50/70 transition-colors cursor-pointer"
                                                >
                                                    <div
                                                        className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                                                        style={{ backgroundColor: team.color || "#8b5cf6" }}
                                                    >
                                                        <TeamIcon icon={team.icon} size={14} className="text-white" fill />
                                                    </div>
                                                    <span className="flex-1 text-sm text-slate-700 font-medium truncate group-hover:text-indigo-600 transition-colors">
                                                        {team.name}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                                                        <Users className="h-3 w-3" />
                                                        {memberCount}
                                                    </span>
                                                    <RowActions url={url} onOpen={() => router.push(url)} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            )}
                        </div>
                    </div>

                    {/* ── Channels + Folders ──────────────────────────────── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Channels */}
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="px-5 pt-4 pb-3 border-b border-slate-100">
                                <SectionHeader icon={MessageSquare} title="Channels" count={channels.length} onAdd={() => setChatModalOpen(true)} addLabel="New Channel" />
                            </div>
                            {channels.length === 0 ? (
                                <EmptyState
                                    icon={MessageSquare}
                                    title="No channels yet"
                                    description="Hubs for team conversation."
                                    actionLabel="Add Channel"
                                    onAction={() => setChatModalOpen(true)}
                                />
                            ) : (
                                <ScrollArea className="max-h-[320px]">
                                    <div className="divide-y divide-slate-50">
                                        {channels.map((channel: any) => {
                                            const url = buildUrl(spaceId, "chats", "ch", channel.id);
                                            return (
                                                <div
                                                    key={channel.id}
                                                    onClick={() => router.push(url)}
                                                    className="group flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50/70 transition-colors cursor-pointer"
                                                >
                                                    <div
                                                        className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                                                        style={{ backgroundColor: channel.color || "#3b82f6" }}
                                                    >
                                                        <EntityIcon icon={channel.icon} fallback={MessageSquare} size={14} className="text-white" />
                                                    </div>
                                                    <span className="flex-1 text-sm text-slate-700 font-medium truncate group-hover:text-indigo-600 transition-colors">
                                                        #{channel.name}
                                                    </span>
                                                    <Badge variant="outline" className="border-slate-200 text-xs text-slate-500 group-hover:bg-white">
                                                        {channel._count?.tasks ?? 0} tasks
                                                    </Badge>
                                                    <RowActions url={url} onOpen={() => router.push(url)} />
                                                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            )}
                        </div>

                        {/* Folders */}
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="px-5 pt-4 pb-3 border-b border-slate-100">
                                <SectionHeader icon={FolderOpen} title="Folders" count={folders.length} onAdd={() => setFolderModalOpen(true)} addLabel="New Folder" />
                            </div>
                            {folders.length === 0 ? (
                                <EmptyState
                                    icon={FolderOpen}
                                    title="No folders yet"
                                    description="Folders help organize lists inside this space"
                                    actionLabel="Add Folder"
                                    onAction={() => setFolderModalOpen(true)}
                                />
                            ) : (
                                <ScrollArea className="max-h-[320px]">
                                    <div className="divide-y divide-slate-50">
                                        {folders.map((folder: any) => {
                                            const url = buildUrl(spaceId, "lists", "fd", folder.id);
                                            return (
                                                <div
                                                    key={folder.id}
                                                    onClick={() => router.push(url)}
                                                    className="group flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50/70 transition-colors cursor-pointer"
                                                >
                                                    <div
                                                        className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                                                        style={{ backgroundColor: folder.color || "#f59e0b" }}
                                                    >
                                                        <EntityIcon icon={folder.icon} fallback={FolderOpen} size={14} className="text-white" fill />
                                                    </div>
                                                    <span className="flex-1 text-sm text-slate-700 font-medium truncate group-hover:text-indigo-600 transition-colors">
                                                        {folder.name}
                                                    </span>
                                                    <RowActions url={url} onOpen={() => router.push(url)} />
                                                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            )}
                        </div>
                    </div>

                    {/* ── Lists ──────────────────────────────── */}
                    <div className="grid grid-cols-1 gap-4">
                        {/* Lists */}
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="px-5 pt-4 pb-3 border-b border-slate-100">
                                <SectionHeader icon={List} title="Lists" count={lists.length} onAdd={() => setListModalOpen(true)} addLabel="New List" />
                            </div>
                            {lists.length === 0 ? (
                                <EmptyState
                                    icon={List}
                                    title="No lists yet"
                                    description="Lists are where tasks live — create your first one"
                                    actionLabel="Add List"
                                    onAction={() => setListModalOpen(true)}
                                />
                            ) : (
                                <ScrollArea className="max-h-[320px]">
                                    <div className="divide-y divide-slate-50">
                                        {lists.map((list: any) => {
                                            const url = buildUrl(spaceId, "lists", "lt", list.id);
                                            return (
                                                <div
                                                    key={list.id}
                                                    onClick={() => router.push(url)}
                                                    className="group flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50/70 transition-colors cursor-pointer"
                                                >
                                                    <div
                                                        className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                                                        style={{ backgroundColor: list.color || "#10b981" }}
                                                    >
                                                        <EntityIcon icon={list.icon} fallback={List} size={14} className="text-white" fill />
                                                    </div>
                                                    <span className="flex-1 text-sm text-slate-700 font-medium truncate group-hover:text-indigo-600 transition-colors">
                                                        {list.name}
                                                    </span>
                                                    <RowActions url={url} onOpen={() => router.push(url)} />
                                                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            )}
                        </div>
                    </div>

                    {/* ── Members ──────────────────────────────────────── */}
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="px-5 pt-4 pb-3 border-b border-slate-100">
                            <SectionHeader icon={Users} title="Members" count={members.length} onAdd={() => setShareModalOpen(true)} addLabel="Invite" />
                        </div>
                        {members.length === 0 ? (
                            <EmptyState
                                icon={Users}
                                title="No members yet"
                                description="Invite people to collaborate in this space"
                                actionLabel="Invite Members"
                                onAction={() => setShareModalOpen(true)}
                            />
                        ) : (
                            <ScrollArea className="max-h-[320px]">
                                <div className="px-5 py-4 flex flex-wrap gap-2">
                                    {members.map((m: any) => {
                                        const user = m.user ?? m;
                                        const name = user.name || user.email || "Unknown";
                                        const firstName = name.split(" ")[0];
                                        const initials = name.slice(0, 2).toUpperCase();
                                        const userId = user.id ?? m.userId;

                                        return (
                                            <UserProfileHoverCard key={m.id ?? userId} userId={userId}>
                                                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-150 px-2.5 py-1.5 cursor-pointer group">
                                                    <div
                                                        className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ring-1 ring-white"
                                                        style={{ backgroundColor: user.color || "#6366f1" }}
                                                    >
                                                        {user.avatarUrl || user.image ? (
                                                            <img
                                                                src={user.avatarUrl || user.image}
                                                                alt={name}
                                                                className="h-full w-full rounded-full object-cover"
                                                            />
                                                        ) : initials}
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                                                        {firstName}
                                                    </span>
                                                    {m.role && (
                                                        <span className="text-[10px] text-slate-400 capitalize hidden sm:inline">
                                                            · {m.role.toLowerCase()}
                                                        </span>
                                                    )}
                                                </div>
                                            </UserProfileHoverCard>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        )}
                    </div>

                </div>
            </div>

            {/* ── Settings modal ───────────────────────────────────────── */}
            <SpaceGeneralSettingsModal
                spaceId={space.id}
                open={generalSettingsOpen}
                onOpenChange={setGeneralSettingsOpen}
            />

            <TeamCreationModal
                open={teamModalOpen}
                onOpenChange={setTeamModalOpen}
                defaultSpaceId={space.id}
                onCreated={() => refreshSpace()}
            />

            <ProjectCreationModal
                open={projectModalOpen}
                onOpenChange={setProjectModalOpen}
                defaultSpaceId={space.id}
                onCreated={() => refreshSpace()}
            />

            <ChatCreationModal
                open={chatModalOpen}
                onOpenChange={setChatModalOpen}
                isCreating={createChannel.isPending}
                onCreate={async (title, _topic, description) => {
                    await createChannel.mutateAsync({
                        workspaceId: space.workspaceId,
                        name: title,
                        description: description ?? undefined,
                        spaceId: space.id,
                    });
                }}
            />

            <FolderCreationModal
                context="SPACE"
                contextId={space.id}
                workspaceId={space.workspaceId}
                open={folderModalOpen}
                onOpenChange={setFolderModalOpen}
                onFolderCreated={() => refreshSpace()}
            />

            <ListCreationModal
                context="SPACE"
                contextId={space.id}
                workspaceId={space.workspaceId}
                open={listModalOpen}
                onOpenChange={setListModalOpen}
                onListCreated={() => refreshSpace()}
            />

            <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                itemType="space"
                itemId={space.id}
                itemName={space.name}
                workspaceId={space.workspaceId}
            />
        </>
    );
}