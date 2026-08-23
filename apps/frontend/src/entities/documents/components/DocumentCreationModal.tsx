"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
	FileText,
	User,
	Network,
	Briefcase,
	Building2,
	Folder as FolderIconLucide,
	ListOrdered,
	Building,
	Search,
	Check,
	ChevronDown,
	Users,
	Play
} from "lucide-react";
import { SpaceIcon } from "@/entities/spaces/components/SpaceIcon";
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
	const resolvedWorkspaceId = (workspaceId && workspaceId !== "default" ? workspaceId : undefined) || paramWorkspaceId;

	const { data: workspacesData } = trpc.workspace.list.useQuery(
		{ scope: "all", pageSize: 100 },
		{ enabled: open && !resolvedWorkspaceId }
	);
	const workspaces = workspacesData?.items || [];

	const workspaceQuery = trpc.workspace.get.useQuery(
		{ id: resolvedWorkspaceId || "" },
		{ enabled: open && !!resolvedWorkspaceId }
	);

	const { data: spacesData } = trpc.space.list.useQuery(
		{ workspaceId: resolvedWorkspaceId },
		{ enabled: open && !!resolvedWorkspaceId }
	);
	const { data: projectsData } = trpc.project.list.useQuery(
		{ workspaceId: resolvedWorkspaceId },
		{ enabled: open && !!resolvedWorkspaceId }
	);
	const { data: teamsData } = trpc.team.list.useQuery(
		{ workspaceId: resolvedWorkspaceId },
		{ enabled: open && !!resolvedWorkspaceId }
	);
	const { data: foldersData } = trpc.folder.byContext.useQuery(
		{ workspaceId: resolvedWorkspaceId, archived: false },
		{ enabled: open && !!resolvedWorkspaceId }
	);
	const { data: listsData } = trpc.list.byContext.useQuery(
		{ workspaceId: resolvedWorkspaceId, archived: false },
		{ enabled: open && !!resolvedWorkspaceId }
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

		if (resolvedWorkspaceId) {
			const wsName = workspaceQuery.data?.name || "Workspace";
			opts.push({ key: `WORKSPACE:${resolvedWorkspaceId}`, kind: "workspace", label: wsName, depth: 0 });
		} else {
			workspaces.forEach((w: any) => {
				opts.push({ key: `WORKSPACE:${w.id}`, kind: "workspace", label: w.name, depth: 0 });
			});
		}

		spaces.forEach((s: any) => opts.push({ key: `SPACE:${s.id}`, kind: "space", label: s.name, depth: 0, spaceId: s.id }));
		projects.forEach((p: any) => opts.push({ key: `PROJECT:${p.id}`, kind: "project", label: p.name, depth: p.spaceId ? 1 : 0, projectId: p.id, spaceId: p.spaceId || undefined }));
		teams.forEach((t: any) => opts.push({ key: `TEAM:${t.id}`, kind: "team", label: t.name, depth: t.spaceId ? 1 : 0, teamId: t.id, spaceId: t.spaceId || undefined }));
		folders.forEach((f: any) => opts.push({ key: `FOLDER:${f.id}`, kind: "folder", label: f.name, depth: f.parentId ? 2 : (f.spaceId || f.projectId || f.teamId ? 1 : 0), folderId: f.id, spaceId: f.spaceId || undefined, projectId: f.projectId || undefined, teamId: f.teamId || undefined }));
		lists.forEach((l: any) => opts.push({ key: `LIST:${l.id}`, kind: "list", label: l.name, depth: l.folderId ? 2 : (l.spaceId || l.projectId || l.teamId ? 1 : 0), listId: l.id, folderId: l.folderId || undefined, spaceId: l.spaceId || undefined, projectId: l.projectId || undefined, teamId: l.teamId || undefined }));

		return opts;
	}, [resolvedWorkspaceId, workspaceQuery.data, workspaces, spaces, projects, teams, folders, lists]);

	const treeNodes = useMemo(() => {
		const spaceNodes = spaces.map((space: any) => {
			const spaceId = space.id;
			const projectsUnderSpace = destinationOptions.filter(o => o.kind === "project" && o.spaceId === spaceId);
			const teamsUnderSpace = destinationOptions.filter(o => o.kind === "team" && o.spaceId === spaceId);
			const foldersUnderSpace = destinationOptions.filter(o => o.kind === "folder" && o.spaceId === spaceId && !o.projectId && !o.teamId);
			const listsUnderSpace = destinationOptions.filter(o => o.kind === "list" && o.spaceId === spaceId && !o.projectId && !o.teamId && !o.folderId);

			const expandedProjectsTeams = [...projectsUnderSpace, ...teamsUnderSpace].flatMap(pt => {
				const ptId = pt.kind === "project" ? pt.projectId : pt.teamId;
				const foldersUnderPt = destinationOptions.filter(o => o.kind === "folder" && ((pt.kind === "project" && o.projectId === ptId) || (pt.kind === "team" && o.teamId === ptId)));
				const listsUnderPt = destinationOptions.filter(o => o.kind === "list" && !o.folderId && ((pt.kind === "project" && o.projectId === ptId) || (pt.kind === "team" && o.teamId === ptId)));

				const expandedFolders = foldersUnderPt.flatMap(f => {
					const listsUnderF = destinationOptions.filter(o => o.kind === "list" && o.folderId === f.folderId);
					return [
						{ ...f, depth: 2 },
						...listsUnderF.map(l => ({ ...l, depth: 3 }))
					];
				});

				return [
					{ ...pt, depth: 1 },
					...expandedFolders,
					...listsUnderPt.map(l => ({ ...l, depth: 2 }))
				];
			});

			const expandedSpaceFolders = foldersUnderSpace.flatMap(f => {
				const listsUnderF = destinationOptions.filter(o => o.kind === "list" && o.folderId === f.folderId);
				return [
					{ ...f, depth: 1 },
					...listsUnderF.map(l => ({ ...l, depth: 2 }))
				];
			});

			return {
				key: `SPACE:${spaceId}`,
				name: space.name,
				children: [
					...expandedProjectsTeams,
					...expandedSpaceFolders,
					...listsUnderSpace.map(l => ({ ...l, depth: 1 }))
				]
			};
		});

		const rootWorkspace = resolvedWorkspaceId
			? [{ key: `WORKSPACE:${resolvedWorkspaceId}`, label: workspaceQuery.data?.name || "Workspace", kind: "workspace" as const, depth: 0 }]
			: workspaces.map((w: any) => ({ key: `WORKSPACE:${w.id}`, label: w.name, kind: "workspace" as const, depth: 0 }));

		const rootProjects = destinationOptions.filter(o => o.kind === "project" && !o.spaceId);
		const rootTeams = destinationOptions.filter(o => o.kind === "team" && !o.spaceId);
		const rootFolders = destinationOptions.filter(o => o.kind === "folder" && !o.spaceId && !o.projectId && !o.teamId);
		const rootLists = destinationOptions.filter(o => o.kind === "list" && !o.spaceId && !o.projectId && !o.teamId && !o.folderId);

		return {
			spaces: spaceNodes,
			rootChildren: [
				...rootWorkspace,
				...rootProjects.map(p => ({ ...p, depth: 0 })),
				...rootTeams.map(t => ({ ...t, depth: 0 })),
				...rootFolders.map(f => ({ ...f, depth: 0 })),
				...rootLists.map(l => ({ ...l, depth: 0 }))
			]
		};
	}, [spaces, destinationOptions, resolvedWorkspaceId, workspaceQuery.data, workspaces]);

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
		else if (resolvedWorkspaceId) setDestinationKey(`WORKSPACE:${resolvedWorkspaceId}`);
		else setDestinationKey("PERSONAL");
		setDestinationSearch("");
		createDocView.reset();
	};

	useEffect(() => {
		if (open) {
			handleClearForm();
		}
	}, [open, listId, folderId, teamId, projectId, spaceId, resolvedWorkspaceId]);

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
			if (resolvedWorkspaceId) payload.workspaceId = resolvedWorkspaceId;
		} else if (type === "WORKSPACE") {
			payload.locationType = "WORKSPACE";
			payload.workspaceId = id;
		} else if (type === "SPACE") {
			payload.locationType = "SPACE";
			payload.spaceId = id;
			if (resolvedWorkspaceId) payload.workspaceId = resolvedWorkspaceId;
		} else if (type === "PROJECT") {
			payload.locationType = "PROJECT";
			payload.projectId = id;
			if (resolvedWorkspaceId) payload.workspaceId = resolvedWorkspaceId;
		} else if (type === "TEAM") {
			payload.locationType = "TEAM";
			payload.teamId = id;
			if (resolvedWorkspaceId) payload.workspaceId = resolvedWorkspaceId;
		} else if (type === "FOLDER") {
			payload.locationType = "FOLDER";
			payload.folderId = id;
			if (resolvedWorkspaceId) payload.workspaceId = resolvedWorkspaceId;
		} else if (type === "LIST") {
			payload.locationType = "LIST";
			payload.listId = id;
			if (resolvedWorkspaceId) payload.workspaceId = resolvedWorkspaceId;
		}

		createDocView.mutate(payload);
	};

	const selectedDestination = destinationOptions.find(d => d.key === destinationKey);
	const fallbackDisplay = selectedDestination ? getDestinationPath(selectedDestination) : "Personal";

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
											<span className={cn("truncate text-left", !selectedDestination && "text-zinc-400")}>
												{selectedDestination ? getDestinationPath(selectedDestination) : fallbackDisplay}
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
											{/* Personal Location Option with Underline Separator */}
											{(!destinationSearch.trim() || "personal".includes(destinationSearch.toLowerCase())) && (
												<div className="pb-1 mb-1 border-b border-slate-100">
													<button
														type="button"
														onClick={() => {
															setDestinationKey("PERSONAL");
															setDestinationOpen(false);
														}}
														className={cn(
															"w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left hover:bg-zinc-100/70 transition-colors cursor-pointer",
															destinationKey === "PERSONAL" ? "bg-zinc-100 font-semibold text-zinc-900" : "text-zinc-700"
														)}
													>
														<div className="flex items-center gap-2 truncate">
															<div className="h-5 w-5 rounded bg-zinc-100 border border-zinc-200/60 flex items-center justify-center shrink-0">
																<User className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
															</div>
															<span className="truncate">Personal</span>
														</div>
														{destinationKey === "PERSONAL" && <Check className="h-3.5 w-3.5 text-zinc-900 shrink-0" />}
													</button>
												</div>
											)}

											{/* Spaces & Descendants */}
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
																			{child.kind === "list" && (
																				<ListOrdered className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
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

											{/* Root Hierarchy Items */}
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
														{child.kind === "workspace" && (
															<div className="h-5 w-5 rounded bg-zinc-100 border border-zinc-200/60 flex items-center justify-center shrink-0">
																<Building className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
															</div>
														)}
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
														{child.kind === "list" && (
															<ListOrdered className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
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
