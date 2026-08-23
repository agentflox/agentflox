"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Play, Users2, Users, Network, Briefcase, Building, Search, Check, ChevronDown } from "lucide-react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import { useUsageCapModal } from "@/features/usage/hooks/useUsageCapModal";
import { UsageRemainingHint } from "@/features/usage/components/UsageRemainingHint";
import { useAppDispatch } from "@/hooks/useReduxStore";
import { useSession } from "next-auth/react";
import { skipToken } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { upsertTeam } from "@/stores/slices/team.slice";
import { serializeDates } from "@/stores/utils/serialize";
import { cn } from "@/lib/utils";
import { IconColorSelector } from "@/components/ui/icon-color-selector";
import { SpaceIcon } from "@/entities/spaces/components/SpaceIcon";
import { TeamIcon } from "@/entities/teams/components/TeamIcon";

type TeamCreationModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated?: (id: string, spaceId?: string) => void;
	defaultSpaceId?: string | null;
	workspaceId?: string;
};

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

const INITIAL_STATE = {
	name: "",
	description: "",
	status: "PUBLISHED",
	icon: "T",
	color: "#3B82F6",
	hasManualIcon: false,
	visibility: "ADMINS" as "PRIVATE" | "ADMINS" | "MEMBERS" | "EVERYONE" | "PUBLIC",
	destinationKey: "",
};

type DestinationOption = {
	key: string;
	label: string;
	kind: "workspace" | "space" | "project";
	depth: number;
	workspaceId?: string;
	spaceId?: string;
	projectId?: string;
};

export function TeamCreationModal({ open, onOpenChange, onCreated, defaultSpaceId, workspaceId }: TeamCreationModalProps) {
	const dispatch = useAppDispatch();
	const { toast } = useToast();
	const { handleError } = useUsageCapModal();
	const params = useParams();
	const [form, setForm] = useState(INITIAL_STATE);
	const [destinationSearch, setDestinationSearch] = useState("");
	const [destinationOpen, setDestinationOpen] = useState(false);
	const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

	const toggleNode = (e: React.MouseEvent, id: string) => {
		e.preventDefault();
		e.stopPropagation();
		setCollapsedNodes((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const createMutation = trpc.team.publish.useMutation();
	const isSubmitting = createMutation.isPending;
	const utils = trpc.useUtils();
	const queryClient = useQueryClient();

	const paramWorkspaceId = (params?.workspaceId as string) || undefined;
	const resolvedWorkspaceId = workspaceId || paramWorkspaceId;

	const { data: workspacesData } = trpc.workspace.list.useQuery(
		{ scope: "owned" as const },
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

	const spaces = spacesData?.items || [];
	const projects = projectsData?.items || [];

	const destinationOptions = useMemo<DestinationOption[]>(() => {
		const opts: DestinationOption[] = [];

		if (resolvedWorkspaceId) {
			const wsName = workspaceQuery.data?.name || "Workspace";
			opts.push({ key: `WORKSPACE:${resolvedWorkspaceId}`, kind: "workspace", label: wsName, depth: 0, workspaceId: resolvedWorkspaceId });
		} else {
			workspaces.forEach((w: any) => {
				opts.push({ key: `WORKSPACE:${w.id}`, kind: "workspace", label: w.name, depth: 0, workspaceId: w.id });
			});
		}

		spaces.forEach((s: any) => {
			opts.push({ key: `SPACE:${s.id}`, kind: "space", label: s.name, depth: 0, spaceId: s.id, workspaceId: s.workspaceId });
		});

		projects.forEach((p: any) => {
			const depth = p.spaceId ? 1 : 0;
			opts.push({ key: `PROJECT:${p.id}`, kind: "project", label: p.name, depth, projectId: p.id, spaceId: p.spaceId || undefined, workspaceId: p.workspaceId });
		});

		return opts;
	}, [resolvedWorkspaceId, workspaceQuery.data, workspaces, spaces, projects]);

	const treeNodes = useMemo(() => {
		const spaceNodes = spaces.map((space: any) => {
			const spaceId = space.id;
			const projectsUnderSpace = destinationOptions.filter(o => o.kind === "project" && o.spaceId === spaceId);

			return {
				key: `SPACE:${spaceId}`,
				name: space.name,
				children: projectsUnderSpace.map(p => ({ ...p, depth: 1 }))
			};
		});

		const rootProjects = destinationOptions.filter(o => o.kind === "project" && !o.spaceId);
		const rootWorkspace = resolvedWorkspaceId
			? [{ key: `WORKSPACE:${resolvedWorkspaceId}`, label: workspaceQuery.data?.name || "Workspace", kind: "workspace" as const, depth: 0 }]
			: workspaces.map((w: any) => ({ key: `WORKSPACE:${w.id}`, label: w.name, kind: "workspace" as const, depth: 0 }));

		return {
			spaces: spaceNodes,
			rootChildren: [
				...rootWorkspace,
				...rootProjects.map(p => ({ ...p, depth: 0 }))
			]
		};
	}, [spaces, destinationOptions, resolvedWorkspaceId, workspaceQuery.data, workspaces]);

	const getDestinationPath = useCallback((opt?: DestinationOption) => {
		if (!opt) return "";
		if (opt.kind === "workspace") return opt.label;
		const parts: string[] = [];
		if (opt.spaceId) parts.push(spaces.find((s: any) => s.id === opt.spaceId)?.name || "Space");
		if (opt.kind === "project") parts.push(opt.label);
		if (parts.length === 0) return opt.label;
		return parts.join(" > ");
	}, [spaces]);

	useEffect(() => {
		if (open) {
			const initialSpaceId = defaultSpaceId || (params?.spaceId as string) || "";
			let initialKey = "";
			if (initialSpaceId) {
				initialKey = `SPACE:${initialSpaceId}`;
			} else if (resolvedWorkspaceId) {
				initialKey = `WORKSPACE:${resolvedWorkspaceId}`;
			}

			setForm({
				...INITIAL_STATE,
				destinationKey: initialKey
			});
			createMutation.reset();
			setDestinationSearch("");
		}
	}, [open, params, defaultSpaceId, resolvedWorkspaceId]);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!form.name.trim()) {
			toast({
				title: "Missing details",
				description: "Please provide a team name.",
				variant: "destructive",
			});
			return;
		}

		if (!form.destinationKey) {
			toast({
				title: "Missing location",
				description: "Please select a location for the team.",
				variant: "destructive",
			});
			return;
		}

		try {
			const [type, id] = form.destinationKey.split(":");
			let targetWorkspaceId = resolvedWorkspaceId;
			let targetSpaceId: string | undefined = undefined;

			if (type === "WORKSPACE") {
				targetWorkspaceId = id;
			} else if (type === "SPACE") {
				targetSpaceId = id;
				const matchedSpace = spaces.find((s: any) => s.id === id);
				if (matchedSpace?.workspaceId) targetWorkspaceId = matchedSpace.workspaceId;
			} else if (type === "PROJECT") {
				const matchedProject = projects.find((p: any) => p.id === id);
				if (matchedProject?.spaceId) targetSpaceId = matchedProject.spaceId;
				if (matchedProject?.workspaceId) targetWorkspaceId = matchedProject.workspaceId;
			}

			const { id: createdId, data } = await createMutation.mutateAsync({
				name: form.name.trim(),
				description: form.description.trim() || undefined,
				status: form.status,
				workspaceId: targetWorkspaceId || undefined,
				spaceId: targetSpaceId || undefined,
				icon: form.icon,
				color: form.color,
				visibility: form.visibility
			} as any);

			dispatch(upsertTeam({ id: createdId, data: serializeDates(data as any) }));

			// Optimistically update team list cache for sidebar
			queryClient.setQueriesData({ queryKey: [["team", "list"]] }, (oldData: any) => {
				if (!oldData || !oldData.items) return oldData;
				if (oldData.items.some((i: any) => i.id === data.id)) return oldData;
				return { ...oldData, items: [data, ...oldData.items], total: (oldData.total || 0) + 1 };
			});
			queryClient.setQueriesData({ queryKey: [["team", "listInfinite"]] }, (oldData: any) => {
				if (!oldData || !oldData.pages) return oldData;
				return {
					...oldData,
					pages: oldData.pages.map((page: any, index: number) =>
						index === 0 ? { ...page, items: [data, ...page.items.filter((i: any) => i.id !== data.id)] } : page
					)
				};
			});

			if (targetSpaceId) await utils.space.get.invalidate({ id: targetSpaceId });

			setTimeout(() => {
				utils.team.list.invalidate();
			}, 1000);

			toast({
				title: "Team created",
				description: "You've unlocked a fresh space for your collaborators.",
			});
			onCreated?.(createdId, targetSpaceId);
			onOpenChange(false);
		} catch (error: any) {
			console.error("Failed to create team:", error);
			if (handleError(error)) return;
			toast({
				title: "Could not create the team",
				description: error?.message ?? "Please try again.",
				variant: "destructive",
			});
		}
	};

	const selectedDestination = destinationOptions.find(d => d.key === form.destinationKey);
	const fallbackDisplay = selectedDestination ? getDestinationPath(selectedDestination) : "Select Location";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-xl p-0 overflow-hidden gap-0 border-border/50 shadow-2xl bg-background/95 backdrop-blur-xl transition-all duration-300">
				{/* Header Section */}
				<div className="p-6 pb-2">
					<div className="flex items-start gap-5">
						<div className={cn(
							"mt-1 p-3 rounded-2xl border transition-all duration-300",
							"bg-primary/5 border-primary/10 text-primary shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)]",
							"group-hover:scale-105"
						)}>
							<Users className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
						</div>
						<div className="pt-1">
							<DialogTitle className="text-xl font-bold tracking-tight text-foreground/95">
								Create a team
							</DialogTitle>
							<DialogDescription className="text-muted-foreground text-sm leading-relaxed">
								Organize team members.
							</DialogDescription>
						</div>
					</div>
				</div>
				<form className="flex flex-col" onSubmit={handleSubmit}>
					<div className="px-6 py-6 space-y-6">
						{/* Location & Visibility Row */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label className="text-sm font-medium text-zinc-700">Location <span className="text-destructive">*</span></Label>
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
									<PopoverContent align="start" className="w-[360px] p-0 rounded-xl shadow-xl border-zinc-200 bg-white overflow-hidden max-h-[380px] flex flex-col z-50">
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
												const isSpaceCollapsed = collapsedNodes.has(space.key);
												const isSelected = form.destinationKey === space.key;
												const hasChildren = space.children && space.children.length > 0;
												const matchedSpace = spaces.find((sp: any) => sp.id === space.spaceId);

												return (
													<div key={space.key} className="space-y-0.5">
														<div
															onClick={() => { setForm(p => ({ ...p, destinationKey: space.key })); setDestinationOpen(false); }}
															className={cn(
																"group/space w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-left hover:bg-zinc-100/70 transition-colors cursor-pointer select-none",
																isSelected ? "bg-zinc-100 font-semibold text-zinc-900" : "text-zinc-700"
															)}
														>
															<div className="flex items-center gap-2 truncate flex-1 min-w-0">
																<div
																	className={cn(
																		"relative h-5 w-5 rounded shrink-0 flex items-center justify-center",
																		hasChildren && "cursor-pointer"
																	)}
																	onClick={(e) => {
																		if (hasChildren) {
																			toggleNode(e, space.key);
																		}
																	}}
																>
																	<span
																		className={cn(
																			"h-5 w-5 rounded shrink-0 overflow-hidden grid place-items-center ml-0.5",
																			hasChildren && "group-hover/space:hidden"
																		)}
																		style={{ backgroundColor: matchedSpace?.icon ? (matchedSpace?.color || "#6366f1") : "transparent" }}
																	>
																		<SpaceIcon
																			icon={matchedSpace?.icon}
																			className={cn(matchedSpace?.icon ? "text-white" : "text-indigo-500")}
																			size={13}
																			fill
																		/>
																	</span>
																	{hasChildren && (
																		<div className="hidden group-hover/space:flex items-center justify-center h-5 w-5 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors">
																			<Play className={cn("h-2.5 w-2.5 fill-zinc-700 text-zinc-700 transition-transform duration-200", !isSpaceCollapsed && "rotate-90")} />
																		</div>
																	)}
																</div>
																<span className="truncate font-medium">{space.name}</span>
															</div>
															{isSelected && <Check className="h-3.5 w-3.5 text-zinc-900 shrink-0 ml-2" />}
														</div>

														{!isSpaceCollapsed && (
															<div className="space-y-0.5 ml-4 pl-1 border-l border-zinc-200/70">
																{space.children.filter((c: any) => !destinationSearch.trim() || c.label.toLowerCase().includes(destinationSearch.toLowerCase())).map((child: any) => {
																	const isChildSelected = form.destinationKey === child.key;
																	return (
																		<button
																			type="button"
																			key={child.key}
																			onClick={() => { setForm(p => ({ ...p, destinationKey: child.key })); setDestinationOpen(false); }}
																			className={cn(
																				"w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-left hover:bg-zinc-100/70 transition-colors cursor-pointer",
																				isChildSelected ? "bg-zinc-100 font-semibold text-zinc-900" : "text-zinc-700"
																			)}
																			style={{ paddingLeft: `${child.depth > 1 ? (child.depth - 1) * 12 + 8 : 8}px` }}
																		>
																			<div className="flex items-center gap-2 truncate">
																				{child.kind === "project" && (
																					<div className="h-4 w-4 rounded bg-purple-50 flex items-center justify-center shrink-0">
																						<Briefcase className="h-3 w-3 text-purple-600 shrink-0" />
																					</div>
																				)}
																				<span className="truncate">{child.label}</span>
																			</div>
																			{isChildSelected && <Check className="h-3.5 w-3.5 text-zinc-900 shrink-0 ml-2" />}
																		</button>
																	);
																})}
															</div>
														)}
													</div>
												);
											})}

											{treeNodes.rootChildren.filter((c: any) => !destinationSearch.trim() || c.label.toLowerCase().includes(destinationSearch.toLowerCase())).map((child: any) => {
												const isChildSelected = form.destinationKey === child.key;
												return (
													<button
														type="button"
														key={child.key}
														onClick={() => { setForm(p => ({ ...p, destinationKey: child.key })); setDestinationOpen(false); }}
														className={cn(
															"w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left hover:bg-zinc-100/70 transition-colors cursor-pointer",
															isChildSelected ? "bg-zinc-100 font-semibold text-zinc-900" : "text-zinc-700"
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
															<span className="truncate">{child.label}</span>
														</div>
														{isChildSelected && <Check className="h-3.5 w-3.5 text-zinc-900 shrink-0 ml-2" />}
													</button>
												);
											})}
										</div>
									</PopoverContent>
								</Popover>
							</div>

							<div className="space-y-2">
								<Label htmlFor="team-visibility" className="text-sm font-medium text-zinc-700">
									Visibility
								</Label>
								<Select
									value={form.visibility}
									onValueChange={(value: any) => setForm(prev => ({ ...prev, visibility: value }))}
								>
									<SelectTrigger id="team-visibility" className="w-full rounded-md shadow-none bg-white border-slate-200 hover:border-slate-300 hover:bg-zinc-50">
										<SelectValue placeholder="Select visibility">
											{visibilityOptions.find((o) => o.value === form.visibility)?.label}
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
							<Label htmlFor="team-name" className="text-sm font-medium text-zinc-700">
								Icon & name <span className="text-destructive">*</span>
							</Label>
							<div className="flex items-center gap-2">
								<IconColorSelector
									icon={form.icon}
									color={form.color}
									onIconChange={(icon) => setForm(prev => ({ ...prev, icon, hasManualIcon: true }))}
									onColorChange={(color) => setForm(prev => ({ ...prev, color }))}
								>
									<Button
										type="button"
										variant="outline"
										size="icon"
										className="h-10 w-10 rounded-lg shrink-0 overflow-hidden grid place-items-center"
										style={{ backgroundColor: form.icon ? form.color : 'transparent' }}
									>
										<TeamIcon icon={form.icon} className="text-white" size={20} fill />
									</Button>
								</IconColorSelector>
								<Input
									id="team-name"
									name="name"
									variant="ghost"
									placeholder="Ex: Growth Engineering Collective"
									value={form.name}
									onChange={(event) => {
										const newName = event.target.value;
										setForm((prev) => ({
											...prev,
											name: newName,
											...(!prev.hasManualIcon && { icon: newName.trim().charAt(0).toUpperCase() || "T" })
										}));
									}}
									className="flex-1 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-normal text-zinc-900 shadow-none placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 focus:outline-none"
									required
								/>
							</div>
						</div>

						<div className="space-y-0">
							<div className="flex items-center justify-between">
								<Label htmlFor="team-description" className="text-sm font-medium text-zinc-700">
									Description <span className="text-[10px] font-normal lowercase">(optional)</span>
								</Label>
							</div>
							<Textarea
								id="team-description"
								name="description"
								placeholder="Outline who you’re looking for, the focus areas, or the goals for this season..."
								value={form.description}
								onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
								className="min-h-[100px] rounded-md px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 focus-visible:ring-none resize-none"
							/>
						</div>
					</div>

					<div className="px-6 py-4 bg-muted/20 flex flex-wrap items-center justify-end gap-3 border-t border-border/40">
						<UsageRemainingHint kind="TEAM" className="mr-auto w-full sm:w-auto" />
						<Button
							type="button"
							variant="ghost"
							className="w-full rounded-xl border border-slate-200 bg-white text-zinc-600 hover:bg-slate-50 sm:w-auto"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							className={cn(
								"w-full rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-teal-500/40 sm:w-auto",
								isSubmitting && "opacity-90"
							)}
							disabled={isSubmitting || !form.name.trim() || !form.destinationKey}
						>
							{isSubmitting ? (
								<span className="flex items-center gap-2">
									<span className="size-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
									Creating...
								</span>
							) : (
								"Create team"
							)}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default TeamCreationModal;

