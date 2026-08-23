"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
    Users, UserPlus, GraduationCap, TrendingUp, Handshake, ShoppingBag,
    LayoutGrid, Clock, Settings2, Target,
    Plus, ExternalLink, Link2, Check,
    FolderKanban, FolderOpen, List, MessageSquare, ChevronRight, Hash,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { UserProfileHoverCard } from "@/entities/users/components/UserProfileHoverCard";
import { DASHBOARD_ROUTES } from "@/constants/routes.config";
import { ProjectIcon } from "@/entities/projects/components/ProjectIcon";
import { EntityIcon } from "@/entities/shared/components/EntityIcon";
import { ProjectCreationModal } from "@/entities/projects/components/ProjectCreationModal";
import { FolderCreationModal } from "@/entities/folders/components/FolderCreationModal";
import { ListCreationModal } from "@/entities/lists/components/ListCreationModal";
import { ChatCreationModal } from "@/entities/channels/components/ChatCreationModal";
import { ShareModal } from "@/components/permissions/ShareModal";

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

// ── Row action buttons ────────────────────────────────────────────────────
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
    value: React.ReactNode;
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
    actionLabel?: string;
    onAction?: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <div className="h-12 w-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
                <Icon className="h-5 w-5 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-700">{title}</p>
            <p className="text-xs text-slate-400 mt-1 mb-4 max-w-[220px] leading-relaxed">{description}</p>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg px-4 py-1.5 bg-white hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-all duration-150 shadow-sm"
                >
                    <Plus className="h-3.5 w-3.5" />
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

// ── Shared User Row Component ──────────────────────────────────────────────
function UserRow({ user, subtitle, href }: { user: any; subtitle?: string; href?: string }) {
    const router = useRouter();
    const name = user.name || user.email || "Unknown";
    const initials = name.slice(0, 2).toUpperCase();

    return (
        <UserProfileHoverCard userId={user.id}>
            <div
                onClick={() => href && router.push(href)}
                className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/70 transition-colors cursor-pointer group"
            >
                <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: user.color || "#ec4899" }}
                >
                    {user.avatarUrl || user.image ? (
                        <img src={user.avatarUrl || user.image} alt={name} className="h-full w-full rounded-full object-cover" />
                    ) : initials}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate group-hover:text-slate-900 transition-colors">{name}</p>
                    {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
                </div>
                {href && <RowActions url={href} />}
            </div>
        </UserProfileHoverCard>
    );
}

export function TeamOverviewTab({ team }: { team: any }) {
    const router = useRouter();
    const utils = trpc.useUtils();

    const refreshTeam = useCallback(() => {
        utils.team.get.invalidate({ id: team.id });
    }, [utils, team?.id]);

    const createChannel = trpc.channel.create.useMutation({
        onSuccess: () => {
            refreshTeam();
            utils.channel.list.invalidate({ workspaceId: team.workspaceId });
        },
    });

    const [projectModalOpen, setProjectModalOpen] = useState(false);
    const [folderModalOpen, setFolderModalOpen] = useState(false);
    const [listModalOpen, setListModalOpen] = useState(false);
    const [chatModalOpen, setChatModalOpen] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);

    const members = useMemo(() => team?.members ?? team?.teams ?? [], [team]);
    const projects = useMemo(() => team?.projects ?? [], [team]);
    const folders = useMemo(() => team?.folders ?? [], [team]);
    const lists = useMemo(() => team?.lists ?? [], [team]);
    const channels = useMemo(() => team?.channels ?? [], [team]);
    const cofounders = useMemo(() => team?.cofounders ?? [], [team]);
    const mentors = useMemo(() => team?.mentors ?? [], [team]);
    const investors = useMemo(() => team?.investors ?? [], [team]);
    const partners = useMemo(() => team?.partners ?? [], [team]);
    const customers = useMemo(() => team?.customers ?? [], [team]);

    if (!team) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
                <div className="rounded-full bg-slate-50 border border-slate-200 p-4">
                    <Users className="h-8 w-8 text-slate-400" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-lg font-medium text-slate-900">No team data available</h3>
                    <p className="text-sm text-slate-500">Select a team to view its overview.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="h-full w-full overflow-y-auto fade-in-up animate-in slide-in-from-bottom-5 duration-500">
                <div className="w-full px-6 py-6 space-y-5">

                    {/* ── Hero ─────────────────────────────────────────── */}
                    <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div
                            className="absolute inset-0 opacity-[0.04] pointer-events-none"
                            style={{ background: `radial-gradient(ellipse 80% 60% at 70% 50%, #ec4899, transparent)` }}
                        />
                        <div
                            className="absolute top-0 left-0 right-0 h-0.5"
                            style={{ background: `linear-gradient(90deg, #ec4899cc, transparent)` }}
                        />

                        <div className="relative z-10 flex flex-col sm:flex-row gap-5 items-start p-6">
                            <div className="h-12 w-12 rounded-xl flex items-center justify-center border shrink-0 bg-pink-50 border-pink-200 text-pink-500">
                                <LayoutGrid className="h-6 w-6" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-lg font-bold text-slate-900 tracking-tight truncate">
                                        {team.name || "Untitled Team"}
                                    </h1>
                                    <Badge variant="outline" className="text-xs capitalize border-pink-200 bg-pink-50 text-pink-700">
                                        Team
                                    </Badge>
                                </div>
                                <p className="mt-1 text-sm text-slate-500 max-w-2xl leading-relaxed line-clamp-2">
                                    {team.description || "No description — click Settings to add context for your team."}
                                </p>
                                <div className="flex flex-wrap gap-3 mt-2">
                                    {team.createdAt && (
                                        <span className="flex items-center gap-1.5 text-xs text-slate-400">
                                            <Clock className="h-3.5 w-3.5" />
                                            Created {formatDistanceToNow(new Date(team.createdAt), { addSuffix: true })}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => router.push(`?tab=settings`)}
                                className={cn(
                                    "shrink-0 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5",
                                    "text-xs font-medium text-slate-600",
                                    "border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm",
                                    "hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 hover:shadow",
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
                        <StatCard icon={Users} label="Members" value={members.length} accent="bg-pink-500" />
                        <StatCard icon={FolderKanban} label="Projects" value={projects.length} accent="bg-orange-500" />
                        <StatCard icon={List} label="Lists" value={lists.length} accent="bg-emerald-500" />
                        <StatCard icon={MessageSquare} label="Channels" value={channels.length} accent="bg-blue-500" />
                    </div>

                    {/* ── Projects + Channels ───────────────────────────── */}
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
                                    description="Projects help track goals and deliverables for this team."
                                    actionLabel="Add Project"
                                    onAction={() => setProjectModalOpen(true)}
                                />
                            ) : (
                                <ScrollArea className="max-h-[320px]">
                                    <div className="divide-y divide-slate-50">
                                        {projects.map((project: any) => {
                                            const url = `/dashboard/projects/${project.id}`;
                                            return (
                                                <div
                                                    key={project.id}
                                                    onClick={() => router.push(url)}
                                                    className="group flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50/70 transition-colors cursor-pointer"
                                                >
                                                    <div
                                                        className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                                                        style={{ backgroundColor: project.color || "#f97316" }}
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
                                            const url = `/dashboard/channels/${channel.id}`;
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

                    {/* ── Folders + Lists ───────────────────────────────── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Folders */}
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="px-5 pt-4 pb-3 border-b border-slate-100">
                                <SectionHeader icon={FolderOpen} title="Folders" count={folders.length} onAdd={() => setFolderModalOpen(true)} addLabel="New Folder" />
                            </div>
                            {folders.length === 0 ? (
                                <EmptyState
                                    icon={FolderOpen}
                                    title="No folders yet"
                                    description="Folders help organize lists inside this team."
                                    actionLabel="Add Folder"
                                    onAction={() => setFolderModalOpen(true)}
                                />
                            ) : (
                                <ScrollArea className="max-h-[320px]">
                                    <div className="divide-y divide-slate-50">
                                        {folders.map((folder: any) => {
                                            const url = `/dashboard/folders/${folder.id}`;
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

                        {/* Lists */}
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="px-5 pt-4 pb-3 border-b border-slate-100">
                                <SectionHeader icon={List} title="Lists" count={lists.length} onAdd={() => setListModalOpen(true)} addLabel="New List" />
                            </div>
                            {lists.length === 0 ? (
                                <EmptyState
                                    icon={List}
                                    title="No lists yet"
                                    description="Lists are where tasks live — create your first one."
                                    actionLabel="Add List"
                                    onAction={() => setListModalOpen(true)}
                                />
                            ) : (
                                <ScrollArea className="max-h-[320px]">
                                    <div className="divide-y divide-slate-50">
                                        {lists.map((list: any) => {
                                            const url = `/dashboard/lists/${list.id}`;
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

                    {/* ── Team Network ──────────────────────────────────── */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                        {/* Team Members */}
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="px-5 pt-4 pb-3 border-b border-slate-100">
                                <SectionHeader icon={Users} title="Team Members" count={members.length} onAdd={() => setShareModalOpen(true)} addLabel="Invite" />
                            </div>
                            {members.length === 0 ? (
                                <EmptyState icon={Users} title="No team members yet" description="Add members to start collaborating." />
                            ) : (
                                <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                                    {members.map((m: any) => (
                                        <UserRow key={m.id} user={m.user ?? m} subtitle={m.role} href={DASHBOARD_ROUTES.PROFILES((m.user ?? m).id)} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Co-Founders */}
                        {cofounders.length > 0 && (
                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                <div className="px-5 pt-4 pb-3 border-b border-slate-100">
                                    <SectionHeader icon={UserPlus} title="Co-Founders" count={cofounders.length} />
                                </div>
                                <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                                    {cofounders.map((m: any) => (
                                        <UserRow key={m.id} user={m} subtitle={m.title} href={DASHBOARD_ROUTES.PROFILES(m.id)} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Mentors */}
                        {mentors.length > 0 && (
                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                <div className="px-5 pt-4 pb-3 border-b border-slate-100">
                                    <SectionHeader icon={GraduationCap} title="Mentors" count={mentors.length} />
                                </div>
                                <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                                    {mentors.map((m: any) => (
                                        <UserRow key={m.id} user={m} subtitle={m.expertise} href={DASHBOARD_ROUTES.PROFILES(m.id)} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Investors */}
                        {investors.length > 0 && (
                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                <div className="px-5 pt-4 pb-3 border-b border-slate-100">
                                    <SectionHeader icon={TrendingUp} title="Investors" count={investors.length} />
                                </div>
                                <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                                    {investors.map((m: any) => (
                                        <UserRow key={m.id} user={m} subtitle={m.firm || m.type} href={DASHBOARD_ROUTES.PROFILES(m.id)} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Partners */}
                        {partners.length > 0 && (
                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                <div className="px-5 pt-4 pb-3 border-b border-slate-100">
                                    <SectionHeader icon={Handshake} title="Partners" count={partners.length} />
                                </div>
                                <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                                    {partners.map((m: any) => (
                                        <UserRow key={m.id} user={m} subtitle={m.type} href={DASHBOARD_ROUTES.PROFILES(m.id)} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Customers */}
                        {customers.length > 0 && (
                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                <div className="px-5 pt-4 pb-3 border-b border-slate-100">
                                    <SectionHeader icon={ShoppingBag} title="Customers" count={customers.length} />
                                </div>
                                <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                                    {customers.map((m: any) => (
                                        <UserRow key={m.id} user={m} subtitle={m.segment} href={DASHBOARD_ROUTES.PROFILES(m.id)} />
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>

                </div>
            </div>

            {/* ── Modals ───────────────────────────────────────── */}
            <ProjectCreationModal
                open={projectModalOpen}
                onOpenChange={setProjectModalOpen}
                defaultSpaceId={team.spaceId}
                onCreated={() => refreshTeam()}
            />

            <FolderCreationModal
                context="TEAM"
                contextId={team.id}
                workspaceId={team.workspaceId}
                open={folderModalOpen}
                onOpenChange={setFolderModalOpen}
                onFolderCreated={() => refreshTeam()}
            />

            <ListCreationModal
                context="TEAM"
                contextId={team.id}
                workspaceId={team.workspaceId}
                open={listModalOpen}
                onOpenChange={setListModalOpen}
                onListCreated={() => refreshTeam()}
            />

            <ChatCreationModal
                open={chatModalOpen}
                onOpenChange={setChatModalOpen}
                isCreating={createChannel.isPending}
                onCreate={async (title, _topic, description) => {
                    await createChannel.mutateAsync({
                        workspaceId: team.workspaceId,
                        name: title,
                        description: description ?? undefined,
                        teamId: team.id,
                    });
                }}
            />

            <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                itemType="team"
                itemId={team.id}
                itemName={team.name}
                workspaceId={team.workspaceId}
            />
        </>
    );
}
