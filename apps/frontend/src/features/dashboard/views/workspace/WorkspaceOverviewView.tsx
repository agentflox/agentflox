"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
	Users, FolderKanban, Clock, Activity,
	FolderOpen, Plus, ChevronRight,
	List, Layers, Hash, Settings2,
	ExternalLink, Link2, Check,
	Rocket, MessageSquare, BookOpen,
} from "lucide-react";
import { SpaceIcon } from "@/entities/spaces/components/SpaceIcon";
import { UserProfileHoverCard } from "@/entities/users/components/UserProfileHoverCard";
import { SpaceCreationModal } from "@/entities/spaces/components/SpaceCreationModal";
import { TeamCreationModal } from "@/entities/teams/components/TeamCreationModal";
import { ProjectCreationModal } from "@/entities/projects/components/ProjectCreationModal";
import { ChatCreationModal } from "@/entities/channels/components/ChatCreationModal";
import { FolderCreationModal } from "@/entities/task/components/FolderCreationModal";
import { ListCreationModal } from "@/entities/task/components/ListCreationModal";
import { WorkspaceGeneralSettingsModal, WorkspaceIcon } from "@/entities/workspace";
import { ShareModal } from "@/components/permissions/ShareModal";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useWorkspaceDetail } from "@/entities/workspace";
import { ProjectIcon } from "@/entities/projects/components/ProjectIcon";
import { TeamIcon } from "@/entities/teams/components/TeamIcon";
import { EntityIcon } from "@/entities/shared/components/EntityIcon";

type Props = {
	workspaceId: string;
};

// ── Build breadcrumb path ─────────────────────────────────────────────────
function buildPath(item: { space?: { name: string } | null; project?: { name: string } | null; team?: { name: string } | null; folder?: { name: string } | null }) {
	const parts: string[] = [];
	if (item.space) parts.push(item.space.name);
	if (item.team) parts.push(item.team.name);
	if (item.project) parts.push(item.project.name);
	if (item.folder) parts.push(item.folder.name);
	return parts.join(" / ");
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
			top: rect.top - 8, // 8px gap above the trigger
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

	// Keep position in sync if the page scrolls while hovered
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

// ── Row action buttons (open link + copy link) ──────────────────────
function RowActions({ url, onOpen }: { url: string; onOpen: () => void }) {
	const [copied, setCopied] = useState(false);

	function handleOpen(e: React.MouseEvent) {
		e.stopPropagation();
		onOpen();
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
				className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg px-4 py-1.5 bg-white hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-all duration-150 shadow-sm cursor-pointer"
			>
				<Plus className="h-3.5 w-3.5" />
				{actionLabel}
			</button>
		</div>
	);
}

export default function WorkspaceOverviewView({ workspaceId }: Props) {
	const { data: workspace, isLoading } = useWorkspaceDetail(workspaceId);
	const { data: foldersResult } = trpc.folder.byContext.useQuery(
		{ workspaceId, includeViewDetails: false },
		{ enabled: !!workspaceId }
	);
	const { data: listsResult } = trpc.list.byContext.useQuery(
		{ workspaceId, includeViewDetails: false },
		{ enabled: !!workspaceId }
	);

	const [spaceModalOpen, setSpaceModalOpen] = useState(false);
	const [teamModalOpen, setTeamModalOpen] = useState(false);
	const [projectModalOpen, setProjectModalOpen] = useState(false);
	const [chatModalOpen, setChatModalOpen] = useState(false);
	const [folderModalOpen, setFolderModalOpen] = useState(false);
	const [listModalOpen, setListModalOpen] = useState(false);
	const [shareModalOpen, setShareModalOpen] = useState(false);
	const [generalSettingsOpen, setGeneralSettingsOpen] = useState(false);
	const router = useRouter();
	const searchParams = useSearchParams();
	const pathname = usePathname();

	const utils = trpc.useUtils();

	// Invalidate workspace so newly created entities appear immediately
	const refreshWorkspace = useCallback(() => {
		utils.workspace.get.invalidate({ id: workspaceId });
	}, [utils, workspaceId]);

	const createChannel = trpc.channel.create.useMutation({
		onSuccess: () => {
			refreshWorkspace();
			utils.channel.list.invalidate({ workspaceId });
		},
	});

	const members = useMemo(() => workspace?.members ?? [], [workspace]);
	const spaces = useMemo(() => workspace?.spaces ?? [], [workspace]);
	const projects = useMemo(() => workspace?.projects ?? [], [workspace]);
	const teams = useMemo(() => workspace?.teams ?? [], [workspace]);
	const channels = useMemo(() => workspace?.channels ?? [], [workspace]);
	const folders = useMemo(() => foldersResult?.items ?? [], [foldersResult]);
	const lists = useMemo(() => listsResult?.items ?? [], [listsResult]);

	if (!workspace) return null;

	return (
		<>
			<div className="h-full w-full overflow-y-auto fade-in-up animate-in slide-in-from-bottom-5 duration-500">
				<div className="w-full px-6 py-6 space-y-5">

					{/* ── Hero ─────────────────────────────────────────── */}
					<div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
						<div
							className="absolute inset-0 opacity-[0.04] pointer-events-none"
							style={{
								background: `radial-gradient(ellipse 80% 60% at 70% 50%, ${workspace.color || "#6366f1"}, transparent)`,
							}}
						/>
						<div
							className="absolute top-0 left-0 right-0 h-0.5"
							style={{ background: `linear-gradient(90deg, ${workspace.color || "#6366f1"}cc, transparent)` }}
						/>

						<div className="relative z-10 flex flex-col sm:flex-row gap-5 items-start p-6">
							<div
								className="h-12 w-12 rounded-xl flex items-center justify-center border shrink-0"
								style={{
									backgroundColor: `${workspace.color || "#6366f1"}18`,
									borderColor: `${workspace.color || "#6366f1"}30`,
									color: workspace.color || "#6366f1",
								}}
							>
								<WorkspaceIcon icon={workspace.icon} size={24} />
							</div>

							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2 flex-wrap">
									<h1 className="text-lg font-bold text-slate-900 tracking-tight truncate">
										{workspace.name}
									</h1>
									<Badge variant="outline" className="text-xs capitalize border-slate-200 text-slate-500">
										Workspace
									</Badge>
								</div>
								<p className="mt-1 text-sm text-slate-500 max-w-2xl leading-relaxed line-clamp-2">
									{workspace.description || "A central hub that unites projects, teams, and resources."}
								</p>
								<div className="flex flex-wrap gap-3 mt-2">
									{workspace.createdAt && (
										<span className="flex items-center gap-1.5 text-xs text-slate-400">
											<Clock className="h-3.5 w-3.5" />
											Created {formatDistanceToNow(new Date(workspace.createdAt), { addSuffix: true })}
										</span>
									)}
									{workspace.updatedAt && (
										<span className="flex items-center gap-1.5 text-xs text-slate-400">
											<Activity className="h-3.5 w-3.5" />
											Updated {formatDistanceToNow(new Date(workspace.updatedAt), { addSuffix: true })}
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
						<StatCard icon={Rocket} label="Spaces" value={workspace._count?.spaces ?? spaces.length} accent="bg-sky-500" />
						<StatCard icon={FolderKanban} label="Projects" value={workspace._count?.projects ?? projects.length} accent="bg-purple-500" />
						<StatCard icon={Hash} label="Teams" value={workspace._count?.teams ?? teams.length} accent="bg-pink-500" />
						<StatCard icon={Users} label="Members" value={workspace._count?.members ?? members.length} accent="bg-emerald-500" />
					</div>

					{/* ── Spaces + Projects ─────────────────────────────── */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Spaces */}
						<div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
							<div className="px-5 pt-4 pb-3 border-b border-slate-100">
								<SectionHeader icon={Rocket} title="Spaces" count={spaces.length} onAdd={() => setSpaceModalOpen(true)} addLabel="New Space" />
							</div>
							{spaces.length === 0 ? (
								<EmptyState
									icon={Rocket}
									title="No spaces yet"
									description="Organize your work into spaces."
									actionLabel="Add Space"
									onAction={() => setSpaceModalOpen(true)}
								/>
							) : (
								<ScrollArea className="max-h-[320px]">
									<div className="divide-y divide-slate-50">
										{spaces.map((space: any) => {
											const params = new URLSearchParams(searchParams.toString());
											params.set("tab", "spaces");
											params.set("sid", space.id);
											const url = `${pathname}?${params.toString()}`;
											return (
												<div
													key={space.id}
													onClick={() => router.push(url)}
													className="group flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50/70 transition-colors cursor-pointer"
												>
													<div
														className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
														style={{ backgroundColor: space.color || "#6366f1" }}
													>
														<SpaceIcon icon={space.icon} size={14} className="text-white" fill />
													</div>
													<span className="flex-1 text-sm text-slate-700 font-medium truncate group-hover:text-indigo-600 transition-colors">
														{space.name}
													</span>
													<RowActions url={url} onOpen={() => router.push(url)} />
												</div>
											);
										})}
									</div>
								</ScrollArea>
							)}
						</div>

						{/* Projects */}
						<div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
							<div className="px-5 pt-4 pb-3 border-b border-slate-100">
								<SectionHeader icon={FolderKanban} title="Projects" count={projects.length} onAdd={() => setProjectModalOpen(true)} addLabel="New Project" />
							</div>
							{projects.length === 0 ? (
								<EmptyState
									icon={FolderKanban}
									title="No projects yet"
									description="Projects help you track goals and deliverables."
									actionLabel="Add Project"
									onAction={() => setProjectModalOpen(true)}
								/>
							) : (
								<ScrollArea className="max-h-[320px]">
									<div className="divide-y divide-slate-50">
										{projects.map((project: any) => {
											const params = new URLSearchParams(searchParams.toString());
											params.set("tab", "projects");
											params.set("pj", project.id);
											const url = `${pathname}?${params.toString()}`;
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
					</div>

					{/* ── Teams + Channels ──────────────────────────────── */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
											const params = new URLSearchParams(searchParams.toString());
											params.set("tab", "teams");
											params.set("tm", team.id);
											const url = `${pathname}?${params.toString()}`;
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
											const params = new URLSearchParams(searchParams.toString());
											params.set("tab", "chats");
											params.set("ch", channel.id);
											const url = `${pathname}?${params.toString()}`;
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
												</div>
											);
										})}
									</div>
								</ScrollArea>
							)}
						</div>
					</div>

					{/* ── Folders + Lists ──────────────────────────────── */}
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
									description="Folders help organize lists inside this workspace"
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
													<div className="flex-1 min-w-0">
														<span className="block text-sm text-slate-700 font-medium truncate group-hover:text-indigo-600 transition-colors">
															{folder.name}
														</span>
														{buildPath(folder) && (
															<span className="block text-[10px] text-slate-400 truncate mt-0.5">
																in {buildPath(folder)}
															</span>
														)}
													</div>
													<RowActions url={url} onOpen={() => router.push(url)} />
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
									description="Lists are where tasks live — create your first one"
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
													<div className="flex-1 min-w-0">
														<span className="block text-sm text-slate-700 font-medium truncate group-hover:text-indigo-600 transition-colors">
															{list.name}
														</span>
														{buildPath(list) && (
															<span className="block text-[10px] text-slate-400 truncate mt-0.5">
																in {buildPath(list)}
															</span>
														)}
													</div>
													<RowActions url={url} onOpen={() => router.push(url)} />
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
								description="Invite people to collaborate in this workspace"
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

			{/* ── Modals ───────────────────────────────────────── */}
			<WorkspaceGeneralSettingsModal
				workspaceId={workspace.id}
				open={generalSettingsOpen}
				onOpenChange={setGeneralSettingsOpen}
			/>

			<SpaceCreationModal
				open={spaceModalOpen}
				onOpenChange={setSpaceModalOpen}
				workspaceId={workspaceId}
				onSuccess={() => refreshWorkspace()}
			/>

			<TeamCreationModal
				open={teamModalOpen}
				onOpenChange={setTeamModalOpen}
				onCreated={() => refreshWorkspace()}
			/>

			<ProjectCreationModal
				open={projectModalOpen}
				onOpenChange={setProjectModalOpen}
				onCreated={() => refreshWorkspace()}
			/>

			<ChatCreationModal
				open={chatModalOpen}
				onOpenChange={setChatModalOpen}
				isCreating={createChannel.isPending}
				onCreate={async (title, _topic, description) => {
					await createChannel.mutateAsync({
						workspaceId,
						name: title,
						description: description ?? undefined,
					});
				}}
			/>

			<FolderCreationModal
				context="GENERAL"
				contextId={workspaceId}
				workspaceId={workspaceId}
				open={folderModalOpen}
				onOpenChange={setFolderModalOpen}
				onFolderCreated={() => {
					utils.folder.byContext.invalidate({ workspaceId });
				}}
			/>

			<ListCreationModal
				context="GENERAL"
				contextId={workspaceId}
				workspaceId={workspaceId}
				open={listModalOpen}
				onOpenChange={setListModalOpen}
				onListCreated={() => {
					utils.list.byContext.invalidate({ workspaceId });
				}}
			/>

			<ShareModal
				isOpen={shareModalOpen}
				onClose={() => setShareModalOpen(false)}
				itemType="workspace"
				itemId={workspaceId}
				itemName={workspace.name}
				workspaceId={workspaceId}
			/>
		</>
	);
}
