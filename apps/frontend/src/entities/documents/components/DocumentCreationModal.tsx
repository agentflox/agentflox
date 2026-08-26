"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { FileText, Search, ChevronDown } from "lucide-react";
import {
	DestinationTreeRow,
	ENTITY_TREE_NEST,
} from "@/features/dashboard/components/shared/breadcrumbTreeUi";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { IconColorSelector } from "@/components/ui/icon-color-selector";

const visibilityOptions = [
	{
		label: "Only Owners",
		value: "PRIVATE",
		description: "Only space owners can view and edit"
	},
	{
		label: "Owners & Admins",
		value: "ADMINS",
		description: "Owners and admins can view and edit"
	},
	{
		label: "Owners, Admins & Members",
		value: "MEMBERS",
		description: "All space members can view"
	},
	{
		label: "Anyone with Link",
		value: "PUBLIC",
		description: "Anyone with the link can view"
	},
];

type DocumentCreationModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: (id: string) => void;
	workspaceId?: string;
	spaceId?: string;
	projectId?: string;
	teamId?: string;
	folderId?: string;
	listId?: string;
	sidebarView?: boolean;
};

type DestinationOption = {
	key: string;
	label: string;
	kind: "personal" | "workspace" | "space" | "project" | "team" | "folder" | "list";
	depth: number;
	spaceId?: string;
	projectId?: string;
	teamId?: string;
	folderId?: string;
	listId?: string;
};

export function DocumentCreationModal({
	open,
	onOpenChange,
	onSuccess,
	workspaceId = "default",
	spaceId,
	projectId,
	teamId,
	folderId,
	listId,
	sidebarView,
}: DocumentCreationModalProps) {
	const { toast } = useToast();
	const router = useRouter();
	const params = useParams();
	const queryClient = useQueryClient();
	const utils = trpc.useUtils();

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [icon, setIcon] = useState("D");
	const [color, setColor] = useState("#3B82F6");
	const [hasManualIcon, setHasManualIcon] = useState(false);
	const [visibility, setVisibility] = useState<"PRIVATE" | "ADMINS" | "MEMBERS" | "EVERYONE" | "PUBLIC">("ADMINS");
	const [destinationKey, setDestinationKey] = useState<string>("PERSONAL");
	const [destinationSearch, setDestinationSearch] = useState("");
	const [destinationOpen, setDestinationOpen] = useState(false);
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
	const [focusedField, setFocusedField] = useState<"title" | "description" | null>(null);

	const paramWorkspaceId = (params?.workspaceId as string) || undefined;
	// Always load globally so user can pick any location
	const { data: workspacesData } = trpc.workspace.list.useQuery(
		{ scope: "all", pageSize: 50 },
		{ enabled: open }
	);
	const workspaces = workspacesData?.items || [];

	const { data: spacesData } = trpc.space.list.useQuery(
		{ scope: "all", pageSize: 50 },
		{ enabled: open }
	);
	const { data: projectsData } = trpc.project.list.useQuery(
		{ scope: "all" as any, pageSize: 50 },
		{ enabled: open }
	);
	const { data: teamsData } = trpc.team.list.useQuery(
		{ scope: "all" as any, pageSize: 50 },
		{ enabled: open }
	);
	const { data: foldersData } = trpc.folder.byContext.useQuery(
		{ archived: false },
		{ enabled: open }
	);
	const { data: listsData } = trpc.list.byContext.useQuery(
		{ archived: false },
		{ enabled: open }
	);

	const spaces = spacesData?.items || [];
	const projects = projectsData?.items || [];
	const teams = teamsData?.items || [];
	const folders = foldersData?.items || [];
	const lists = listsData?.items || [];

	const destinationOptions = useMemo<DestinationOption[]>(() => {
		const opts: DestinationOption[] = [
			{ key: "PERSONAL", label: "Personal", kind: "personal", depth: 0 }
		];

		workspaces.forEach((w: any) => {
			opts.push({ key: `WORKSPACE:${w.id}`, kind: "workspace", label: w.name, depth: 0 });
		});

		spaces.forEach((s: any) => opts.push({ key: `SPACE:${s.id}`, kind: "space", label: s.name, depth: 0, spaceId: s.id }));
		projects.forEach((p: any) => opts.push({ key: `PROJECT:${p.id}`, kind: "project", label: p.name, depth: p.spaceId ? 1 : 0, projectId: p.id, spaceId: p.spaceId || undefined }));
		teams.forEach((t: any) => opts.push({ key: `TEAM:${t.id}`, kind: "team", label: t.name, depth: t.spaceId ? 1 : 0, teamId: t.id, spaceId: t.spaceId || undefined }));
		folders.forEach((f: any) => opts.push({ key: `FOLDER:${f.id}`, kind: "folder", label: f.name, depth: f.parentId ? 2 : (f.spaceId || f.projectId || f.teamId ? 1 : 0), folderId: f.id, spaceId: f.spaceId || undefined, projectId: f.projectId || undefined, teamId: f.teamId || undefined }));
		lists.forEach((l: any) => opts.push({ key: `LIST:${l.id}`, kind: "list", label: l.name, depth: l.folderId ? 2 : (l.spaceId || l.projectId || l.teamId ? 1 : 0), listId: l.id, folderId: l.folderId || undefined, spaceId: l.spaceId || undefined, projectId: l.projectId || undefined, teamId: l.teamId || undefined }));

		return opts;
	}, [workspaces, spaces, projects, teams, folders, lists]);

	const treeNodes = useMemo(() => {
		return workspaces.map((ws: any) => {
			const wsSpaces = spaces.filter((s: any) => s.workspaceId === ws.id);
			const spaceNodes = wsSpaces.map((space: any) => {
				const spaceId = space.id;
				const projectsUnderSpace = destinationOptions.filter(o => o.kind === 'project' && o.spaceId === spaceId);
				const teamsUnderSpace = destinationOptions.filter(o => o.kind === 'team' && o.spaceId === spaceId);
				const foldersUnderSpace = destinationOptions.filter(o => o.kind === 'folder' && o.spaceId === spaceId && !o.projectId && !o.teamId);
				const listsUnderSpace = destinationOptions.filter(o => o.kind === 'list' && o.spaceId === spaceId && !o.projectId && !o.teamId && !o.folderId);

				const expandedProjectsTeams = [...projectsUnderSpace, ...teamsUnderSpace].map(pt => {
					const ptId = pt.kind === 'project' ? pt.projectId : pt.teamId;
					const foldersUnderPt = destinationOptions.filter(o => o.kind === 'folder' && ((pt.kind === 'project' && o.projectId === ptId) || (pt.kind === 'team' && o.teamId === ptId)));
					const listsUnderPt = destinationOptions.filter(o => o.kind === 'list' && !o.folderId && ((pt.kind === 'project' && o.projectId === ptId) || (pt.kind === 'team' && o.teamId === ptId)));
					return {
						...pt,
						children: foldersUnderPt.map(f => {
							const listsUnderFolder = destinationOptions.filter(l => l.kind === 'list' && l.folderId === f.folderId);
							return { ...f, children: listsUnderFolder };
						}),
						lists: listsUnderPt
					};
				});

				return {
					key: `SPACE:${spaceId}`,
					name: space.name,
					icon: space.icon,
					color: space.color,
					workspaceId: ws.id,
					children: expandedProjectsTeams,
					folders: foldersUnderSpace.map(f => {
						const listsUnderFolder = destinationOptions.filter(l => l.kind === 'list' && l.folderId === f.folderId);
						return { ...f, children: listsUnderFolder };
					}),
					lists: listsUnderSpace
				};
			});

			const rootProjects = destinationOptions.filter(o => o.kind === 'project' && !o.spaceId).map(p => {
				const foldersUnderPt = destinationOptions.filter(o => o.kind === 'folder' && o.projectId === p.projectId);
				const listsUnderPt = destinationOptions.filter(o => o.kind === 'list' && !o.folderId && o.projectId === p.projectId);
				return {
					...p, children: foldersUnderPt.map(f => {
						const listsUnderFolder = destinationOptions.filter(l => l.kind === 'list' && l.folderId === f.folderId);
						return { ...f, children: listsUnderFolder };
					}), lists: listsUnderPt
				};
			});
			const rootTeams = destinationOptions.filter(o => o.kind === 'team' && !o.spaceId).map(t => {
				const foldersUnderPt = destinationOptions.filter(o => o.kind === 'folder' && o.teamId === t.teamId);
				const listsUnderPt = destinationOptions.filter(o => o.kind === 'list' && !o.folderId && o.teamId === t.teamId);
				return {
					...t, children: foldersUnderPt.map(f => {
						const listsUnderFolder = destinationOptions.filter(l => l.kind === 'list' && l.folderId === f.folderId);
						return { ...f, children: listsUnderFolder };
					}), lists: listsUnderPt
				};
			});
			const rootFolders = destinationOptions.filter(o => o.kind === 'folder' && !o.spaceId && !o.projectId && !o.teamId).map(f => {
				const listsUnderFolder = destinationOptions.filter(l => l.kind === 'list' && l.folderId === f.folderId);
				return { ...f, children: listsUnderFolder };
			});
			const rootLists = destinationOptions.filter(o => o.kind === 'list' && !o.spaceId && !o.projectId && !o.teamId && !o.folderId);

			return {
				key: `WORKSPACE:${ws.id}`,
				name: ws.name,
				logo: ws.logo ?? ws.avatar ?? ws.avatarUrl,
				color: ws.color,
				spaces: spaceNodes,
				rootProjects,
				rootTeams,
				rootFolders,
				rootLists
			};
		});
	}, [destinationOptions, spaces, workspaces]);

	const getDestinationPath = useCallback((opt?: DestinationOption) => {
		if (!opt) return "";
		if (opt.kind === "personal") return "Personal";
		if (opt.kind === "workspace") return opt.label;
		const parts: string[] = [];
		if (opt.spaceId) parts.push(spaces.find((s: any) => s.id === opt.spaceId)?.name || "Space");
		if (opt.projectId) parts.push(projects.find((p: any) => p.id === opt.projectId)?.name || "Project");
		if (opt.teamId) parts.push(teams.find((t: any) => t.id === opt.teamId)?.name || "Team");
		if (opt.kind === "folder" || opt.kind === "list") parts.push(opt.label);
		if (parts.length === 0) return opt.label;
		return parts.join(" > ");
	}, [spaces, projects, teams]);

	const handleClearForm = () => {
		setTitle("");
		setDescription("");
		setIcon("D");
		setColor("#3B82F6");
		setHasManualIcon(false);
		setVisibility("ADMINS");
		if (listId) setDestinationKey(`LIST:${listId}`);
		else if (folderId) setDestinationKey(`FOLDER:${folderId}`);
		else if (teamId) setDestinationKey(`TEAM:${teamId}`);
		else if (projectId) setDestinationKey(`PROJECT:${projectId}`);
		else if (spaceId) setDestinationKey(`SPACE:${spaceId}`);
		else setDestinationKey("PERSONAL");
		setDestinationSearch("");
		createDocView.reset();
	};

	useEffect(() => {
		if (open) {
			handleClearForm();
		}
	}, [open, listId, folderId, teamId, projectId, spaceId]);

	const createDocView = trpc.view.create.useMutation({
		onSuccess: async (data) => {
			toast({
				title: "Document created",
				description: "Your document has been created successfully.",
			});

			utils.view.list.invalidate();
			utils.document.list.invalidate();

			onOpenChange(false);
			handleClearForm();
			onSuccess?.(data.id);
			router.refresh();
		},
		onError: (error) => {
			toast({
				title: "Error creating document",
				description: error.message || "An error occurred while creating the document.",
				variant: "destructive",
			});
		},
	});

	const isSubmitting = createDocView.isPending;

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!title.trim()) {
			toast({ title: "Document title is required", variant: "destructive" });
			return;
		}

		if (!destinationKey) {
			toast({ title: "Please select a location", variant: "destructive" });
			return;
		}

		const [type, id] = destinationKey.split(":");
		const payload: any = {
			name: title.trim(),
			description: description.trim() || undefined,
			type: "DOC",
			visibility: visibility,
			sidebarView: sidebarView ?? true,
		};

		if (type === "PERSONAL") {
			payload.locationType = "PERSONAL";
		} else if (type === "WORKSPACE") {
			payload.locationType = "WORKSPACE";
			payload.workspaceId = id;
		} else if (type === "SPACE") {
			payload.locationType = "SPACE";
			payload.spaceId = id;
			const s = spaces.find((s: any) => s.id === id);
			if (s?.workspaceId) payload.workspaceId = s.workspaceId;
		} else if (type === "PROJECT") {
			payload.locationType = "PROJECT";
			payload.projectId = id;
			const p = projects.find((p: any) => p.id === id);
			if (p?.workspaceId) payload.workspaceId = p.workspaceId;
		} else if (type === "TEAM") {
			payload.locationType = "TEAM";
			payload.teamId = id;
			const t = teams.find((t: any) => t.id === id);
			if (t?.workspaceId) payload.workspaceId = t.workspaceId;
		} else if (type === "FOLDER") {
			payload.locationType = "FOLDER";
			payload.folderId = id;
			const f = folders.find((f: any) => f.id === id);
			if (f?.workspaceId) payload.workspaceId = f.workspaceId;
		} else if (type === "LIST") {
			payload.locationType = "LIST";
			payload.listId = id;
			const l = lists.find((l: any) => l.id === id);
			if (l?.workspaceId) payload.workspaceId = l.workspaceId;
		}

		createDocView.mutate(payload);
	};

	const selectedDestination = destinationOptions.find(d => d.key === destinationKey);
	const displayLabel = selectedDestination ? getDestinationPath(selectedDestination) : "Personal";

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					handleClearForm();
				}
				onOpenChange(next);
			}}
		>
			<DialogContent className="sm:max-w-xl p-0 overflow-hidden gap-0 border-border/50 shadow-2xl bg-background/95 backdrop-blur-xl transition-all duration-300">
				<div className="p-6 pb-2">
					<div className="flex items-start gap-5">
						<div className={cn(
							"mt-1 p-3 rounded-2xl border transition-all duration-300",
							"bg-primary/5 border-primary/10 text-primary shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)]",
							"group-hover:scale-105"
						)}>
							<FileText className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
						</div>
						<div className="pt-1">
							<DialogTitle className="text-xl font-bold tracking-tight text-foreground/95">
								Create New Document
							</DialogTitle>
							<DialogDescription className="text-muted-foreground text-sm leading-relaxed">
								Start writing your documentation.
							</DialogDescription>
						</div>
					</div>
				</div>

				<form className="flex flex-col" onSubmit={handleSubmit}>
					<div className="px-6 py-6 space-y-6">
						{/* Location & Visibility Row */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label className="text-sm font-medium text-zinc-700">
									Location <span className="text-destructive">*</span>
								</Label>
								<Popover open={destinationOpen} onOpenChange={setDestinationOpen}>
									<PopoverTrigger asChild>
										<button
											type="button"
											className="h-9 w-full border border-slate-200 hover:bg-zinc-50 hover:border-slate-300 bg-white text-[14px] text-zinc-700 rounded-md px-3 flex items-center justify-between cursor-pointer focus:outline-none"
										>
											<span className={cn("truncate text-left", !destinationKey && "text-zinc-400")}>
												{displayLabel}
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
											<DestinationTreeRow
												selected={destinationKey === "PERSONAL"}
												kind="personal"
												label="Personal"
												onClick={() => { setDestinationKey("PERSONAL"); setDestinationOpen(false); }}
											/>
											{treeNodes.map((ws: any) => {
												const isWsCollapsed = collapsedNodes.has(ws.key);
												const isWsSelected = destinationKey === ws.key;
												const wsMatches = !destinationSearch.trim() || ws.name.toLowerCase().includes(destinationSearch.toLowerCase());
												const hasSpaces = ws.spaces?.length > 0;
												const hasRootChildren = ws.rootProjects?.length > 0 || ws.rootTeams?.length > 0 || ws.rootFolders?.length > 0 || ws.rootLists?.length > 0;
												const hasChildren = hasSpaces || hasRootChildren;
												if (!wsMatches && !hasChildren) return null;
												const select = (key: string) => { setDestinationKey(key); setDestinationOpen(false); };
												return (
													<div key={ws.key} className="space-y-0.5">
														<DestinationTreeRow
															selected={isWsSelected}
															kind="workspace"
															entity={ws}
															label={ws.name}
															hasChildren={hasChildren}
															expanded={!isWsCollapsed}
															onToggle={(e) => toggleNode(e, ws.key)}
															onClick={() => select(ws.key)}
														/>
														{!isWsCollapsed && hasChildren && (
															<div className={ENTITY_TREE_NEST}>
																{ws.spaces?.map((space: any) => {
																	const isSpaceCollapsed = collapsedNodes.has(space.key);
																	const hasSpaceChildren = space.children?.length > 0 || space.folders?.length > 0 || space.lists?.length > 0;
																	return (
																		<div key={space.key} className="space-y-0.5">
																			<DestinationTreeRow
																				selected={destinationKey === space.key}
																				kind="space"
																				entity={space}
																				label={space.name}
																				hasChildren={hasSpaceChildren}
																				expanded={!isSpaceCollapsed}
																				onToggle={(e) => toggleNode(e, space.key)}
																				onClick={() => select(space.key)}
																			/>
																			{!isSpaceCollapsed && hasSpaceChildren && (
																				<div className={ENTITY_TREE_NEST}>
																					{space.children?.map((pt: any) => {
																						const isPtCollapsed = collapsedNodes.has(pt.key);
																						const hasPtChildren = pt.children?.length > 0 || pt.lists?.length > 0;
																						return (
																							<div key={pt.key} className="space-y-0.5">
																								<DestinationTreeRow
																									selected={destinationKey === pt.key}
																									kind={pt.kind}
																									entity={pt}
																									label={pt.label}
																									hasChildren={hasPtChildren}
																									expanded={!isPtCollapsed}
																									onToggle={(e) => toggleNode(e, pt.key)}
																									onClick={() => select(pt.key)}
																								/>
																								{!isPtCollapsed && hasPtChildren && (
																									<div className={ENTITY_TREE_NEST}>
																										{pt.children?.map((folder: any) => {
																											const isFolderCollapsed = collapsedNodes.has(folder.key);
																											const hasFolderChildren = folder.children?.length > 0;
																											return (
																												<div key={folder.key} className="space-y-0.5">
																													<DestinationTreeRow
																														selected={destinationKey === folder.key}
																														kind="folder"
																														entity={folder}
																														label={folder.label}
																														hasChildren={hasFolderChildren}
																														expanded={!isFolderCollapsed}
																														onToggle={(e) => toggleNode(e, folder.key)}
																														onClick={() => select(folder.key)}
																													/>
																													{!isFolderCollapsed && hasFolderChildren && (
																														<div className={ENTITY_TREE_NEST}>
																															{folder.children.map((list: any) => (
																																<DestinationTreeRow
																																	key={list.key}
																																	selected={destinationKey === list.key}
																																	kind="list"
																																	entity={list}
																																	label={list.label}
																																	onClick={() => select(list.key)}
																																/>
																															))}
																														</div>
																													)}
																												</div>
																											);
																										})}
																										{pt.lists?.map((list: any) => (
																											<DestinationTreeRow
																												key={list.key}
																												selected={destinationKey === list.key}
																												kind="list"
																												entity={list}
																												label={list.label}
																												onClick={() => select(list.key)}
																											/>
																										))}
																									</div>
																								)}
																							</div>
																						);
																					})}
																					{space.folders?.map((folder: any) => {
																						const isFolderCollapsed = collapsedNodes.has(folder.key);
																						const hasFolderChildren = folder.children?.length > 0;
																						return (
																							<div key={folder.key} className="space-y-0.5">
																								<DestinationTreeRow
																									selected={destinationKey === folder.key}
																									kind="folder"
																									entity={folder}
																									label={folder.label}
																									hasChildren={hasFolderChildren}
																									expanded={!isFolderCollapsed}
																									onToggle={(e) => toggleNode(e, folder.key)}
																									onClick={() => select(folder.key)}
																								/>
																								{!isFolderCollapsed && hasFolderChildren && (
																									<div className={ENTITY_TREE_NEST}>
																										{folder.children.map((list: any) => (
																											<DestinationTreeRow
																												key={list.key}
																												selected={destinationKey === list.key}
																												kind="list"
																												entity={list}
																												label={list.label}
																												onClick={() => select(list.key)}
																											/>
																										))}
																									</div>
																								)}
																							</div>
																						);
																					})}
																					{space.lists?.map((list: any) => (
																						<DestinationTreeRow
																							key={list.key}
																							selected={destinationKey === list.key}
																							kind="list"
																							entity={list}
																							label={list.label}
																							onClick={() => select(list.key)}
																						/>
																					))}
																				</div>
																			)}
																		</div>
																	);
																})}
																{[...(ws.rootProjects || []), ...(ws.rootTeams || [])].map((pt: any) => {
																	const isPtCollapsed = collapsedNodes.has(pt.key);
																	const hasPtChildren = pt.children?.length > 0 || pt.lists?.length > 0;
																	return (
																		<div key={pt.key} className="space-y-0.5">
																			<DestinationTreeRow
																				selected={destinationKey === pt.key}
																				kind={pt.kind}
																				entity={pt}
																				label={pt.label}
																				hasChildren={hasPtChildren}
																				expanded={!isPtCollapsed}
																				onToggle={(e) => toggleNode(e, pt.key)}
																				onClick={() => select(pt.key)}
																			/>
																			{!isPtCollapsed && hasPtChildren && (
																				<div className={ENTITY_TREE_NEST}>
																					{pt.children?.map((folder: any) => {
																						const isFolderCollapsed = collapsedNodes.has(folder.key);
																						const hasFolderChildren = folder.children?.length > 0;
																						return (
																							<div key={folder.key} className="space-y-0.5">
																								<DestinationTreeRow
																									selected={destinationKey === folder.key}
																									kind="folder"
																									entity={folder}
																									label={folder.label}
																									hasChildren={hasFolderChildren}
																									expanded={!isFolderCollapsed}
																									onToggle={(e) => toggleNode(e, folder.key)}
																									onClick={() => select(folder.key)}
																								/>
																								{!isFolderCollapsed && hasFolderChildren && (
																									<div className={ENTITY_TREE_NEST}>
																										{folder.children.map((list: any) => (
																											<DestinationTreeRow
																												key={list.key}
																												selected={destinationKey === list.key}
																												kind="list"
																												entity={list}
																												label={list.label}
																												onClick={() => select(list.key)}
																											/>
																										))}
																									</div>
																								)}
																							</div>
																						);
																					})}
																					{pt.lists?.map((list: any) => (
																						<DestinationTreeRow
																							key={list.key}
																							selected={destinationKey === list.key}
																							kind="list"
																							entity={list}
																							label={list.label}
																							onClick={() => select(list.key)}
																						/>
																					))}
																				</div>
																			)}
																		</div>
																	);
																})}
																{ws.rootFolders?.map((folder: any) => {
																	const isFolderCollapsed = collapsedNodes.has(folder.key);
																	const hasFolderChildren = folder.children?.length > 0;
																	return (
																		<div key={folder.key} className="space-y-0.5">
																			<DestinationTreeRow
																				selected={destinationKey === folder.key}
																				kind="folder"
																				entity={folder}
																				label={folder.label}
																				hasChildren={hasFolderChildren}
																				expanded={!isFolderCollapsed}
																				onToggle={(e) => toggleNode(e, folder.key)}
																				onClick={() => select(folder.key)}
																			/>
																			{!isFolderCollapsed && hasFolderChildren && (
																				<div className={ENTITY_TREE_NEST}>
																					{folder.children.map((list: any) => (
																						<DestinationTreeRow
																							key={list.key}
																							selected={destinationKey === list.key}
																							kind="list"
																							entity={list}
																							label={list.label}
																							onClick={() => select(list.key)}
																						/>
																					))}
																				</div>
																			)}
																		</div>
																	);
																})}
																{ws.rootLists?.map((list: any) => (
																	<DestinationTreeRow
																		key={list.key}
																		selected={destinationKey === list.key}
																		kind="list"
																		entity={list}
																		label={list.label}
																		onClick={() => select(list.key)}
																	/>
																))}
															</div>
														)}
													</div>
												);
											})}
										</div>
									</PopoverContent>
								</Popover>
							</div>

							<div className="space-y-2">
								<Label htmlFor="document-visibility" className="text-sm font-medium text-zinc-700">
									Visibility
								</Label>
								<Select
									value={visibility}
									onValueChange={(val: any) => setVisibility(val)}
								>
									<SelectTrigger id="document-visibility" className="w-full rounded-md shadow-none bg-white border-slate-200 hover:border-slate-300 hover:bg-zinc-50">
										<SelectValue placeholder="Select visibility">
											{visibilityOptions.find((o) => o.value === visibility)?.label}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{visibilityOptions.map(({ value, label, description }) => (
											<SelectItem key={value} value={value} description={description}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-2">
							<Label
								htmlFor="document-title"
								className="text-sm font-medium text-zinc-700"
							>
								Icon & title <span className="text-destructive">*</span>
							</Label>
							<div className="flex items-center gap-2">
								<IconColorSelector
									icon={icon}
									color={color}
									onIconChange={(newIcon) => {
										setIcon(newIcon);
										setHasManualIcon(true);
									}}
									onColorChange={setColor}
								>
									<Button
										type="button"
										variant="outline"
										size="icon"
										className="h-10 w-10 rounded-lg shrink-0 overflow-hidden grid place-items-center"
										style={{ backgroundColor: icon ? color : 'transparent' }}
									>
										<FileText className="text-white size-5" />
									</Button>
								</IconColorSelector>
								<Input
									id="document-title"
									name="title"
									placeholder="e.g. Project Specs, Meeting Notes"
									variant="ghost"
									value={title}
									onChange={(event) => {
										const newTitle = event.target.value;
										setTitle(newTitle);
										if (!hasManualIcon) {
											setIcon(newTitle.trim().charAt(0).toUpperCase() || "D");
										}
									}}
									onFocus={() => setFocusedField("title")}
									onBlur={() => setFocusedField(null)}
									disabled={isSubmitting}
									autoFocus
									className="flex-1 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-normal text-zinc-900 shadow-none placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 focus:outline-none"
									required
								/>
							</div>
						</div>

						<div className="space-y-0">
							<div className="flex items-center justify-between">
								<Label
									htmlFor="document-description"
									className="text-sm font-medium text-zinc-700"
								>
									Description <span className="text-[10px] font-normal lowercase">(optional)</span>
								</Label>
							</div>
							<div className="relative">
								<Textarea
									id="document-description"
									name="description"
									placeholder="Briefly describe what this document is about..."
									value={description}
									onChange={(event) => setDescription(event.target.value)}
									onFocus={() => setFocusedField("description")}
									onBlur={() => setFocusedField(null)}
									maxLength={500}
									disabled={isSubmitting}
									className="min-h-[100px] rounded-md px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 focus-visible:ring-none resize-none"
								/>
								<div className="absolute bottom-2 right-2 text-xs text-muted-foreground/50 pointer-events-none">
									{description.length}/500
								</div>
							</div>
						</div>
					</div>

					<div className="px-6 py-4 bg-muted/20 flex items-center justify-end gap-3 border-t border-border/40">
						<Button
							type="button"
							variant="ghost"
							className="w-full rounded-xl border border-slate-200 bg-white text-zinc-600 hover:bg-slate-50 sm:w-auto"
							onClick={() => {
								handleClearForm();
								onOpenChange(false);
							}}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting || !title.trim()}
							className={cn(
								"w-full rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/40 sm:w-auto",
								isSubmitting && "opacity-90"
							)}
						>
							{isSubmitting ? (
								<span className="flex items-center gap-2">
									<span className="size-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
									Creating...
								</span>
							) : (
								"Create document"
							)}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default DocumentCreationModal;
