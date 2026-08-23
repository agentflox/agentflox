import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, Search, Settings2, Network, ArrowLeft, User, List, CheckCircle2, X, Tag as TagIcon, Trash2, UserPlus, Users, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import { TagsModal } from "@/entities/task/components/TagsModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useSession } from "next-auth/react";
import {
	TASK_IMPORT_ITEMS_COL1,
	TASK_IMPORT_ITEMS_COL2,
	CONTAINER_TOGGLES,
	ENTITY_TYPE_IMPORT_MODE,
	defaultTaskChecks,
	defaultContainerToggles,
	type ImportMode,
} from "@/entities/templates/constants/importOptions";
import {
	TEMPLATE_SHARE_OPTIONS,
	type TemplateShareValue,
} from "@/entities/templates/constants/templateTypes";
import type { TemplateEntityType } from "@agentflox/database/src/generated/prisma";

// ─── Types ───────────────────────────────────────────────────────────────────

type ModalView = "save" | "update-select" | "update-edit";

export interface SaveTemplateModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialMode?: "save" | "update";
	/** TemplateEntityType value (e.g. "TASK", "SPACE", "LIST"). Determines import UI. */
	entityType?: string;
	workspaceId?: string;
	contentToSave?: any;
}

function TemplateIcon({ type }: { type: string }) {
	if (type === "LIST") return <List className="h-4 w-4 text-amber-500" />;
	return <CheckCircle2 className="h-4 w-4 text-purple-500" />;
}

// ─── Task checkboxes grid (shared between task + container sub-section) ───────

function TaskItemsGrid({
	checks,
	onChange,
}: {
	checks: Record<string, boolean>;
	onChange: (id: string, val: boolean) => void;
}) {
	return (
		<div className="grid grid-cols-2 gap-x-10 gap-y-3">
			<div className="space-y-3">
				{TASK_IMPORT_ITEMS_COL1.map((item) => (
					<div key={item.id} className="flex items-center space-x-3">
						<Checkbox
							id={`task-${item.id}`}
							checked={checks[item.id] ?? item.defaultChecked}
							onCheckedChange={(c) => onChange(item.id, !!c)}
							className="rounded-[4px] data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 cursor-pointer"
						/>
						<label
							htmlFor={`task-${item.id}`}
							className="text-[13.5px] font-normal cursor-pointer text-zinc-700 leading-none"
						>
							{item.label}
						</label>
					</div>
				))}
			</div>
			<div className="space-y-3">
				{TASK_IMPORT_ITEMS_COL2.map((item) => (
					<div key={item.id} className="flex items-center space-x-3">
						<Checkbox
							id={`task2-${item.id}`}
							checked={checks[item.id] ?? item.defaultChecked}
							onCheckedChange={(c) => onChange(item.id, !!c)}
							className="rounded-[4px] data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 cursor-pointer"
						/>
						<label
							htmlFor={`task2-${item.id}`}
							className="text-[13.5px] font-normal cursor-pointer text-zinc-700 leading-none"
						>
							{item.label}
						</label>
					</div>
				))}
			</div>
		</div>
	);
}

// ─── Import options panel ─────────────────────────────────────────────────────

function ImportOptionsPanel({
	importMode,
	setImportMode,
	entityImportMode,
	taskChecks,
	onTaskCheck,
	containerToggles,
	onContainerToggle,
}: {
	importMode: "everything" | "customize";
	setImportMode: (m: "everything" | "customize") => void;
	entityImportMode: ImportMode;
	taskChecks: Record<string, boolean>;
	onTaskCheck: (id: string, val: boolean) => void;
	containerToggles: Record<string, boolean>;
	onContainerToggle: (id: string, val: boolean) => void;
}) {
	if (entityImportMode === "none") return null;

	return (
		<div className="pt-2">
			<label className="text-[13px] font-semibold text-zinc-700 block mb-2">Import options</label>
			<div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
				{/* Tabs Wrapper */}
				<div className="bg-zinc-50/80 p-1.5 flex gap-1 border-b border-zinc-200">
					<button
						type="button"
						onClick={() => setImportMode("everything")}
						className={cn(
							"flex-1 px-3 py-1.5 flex items-center justify-center gap-2 text-[13px] font-semibold rounded-md transition-all cursor-pointer",
							importMode === "everything"
								? "bg-white text-zinc-700 shadow-sm ring-1 ring-zinc-200/60"
								: "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50"
						)}
					>
						<Network className="h-4 w-4" /> Import everything
					</button>
					<button
						type="button"
						onClick={() => setImportMode("customize")}
						className={cn(
							"flex-1 px-3 py-1.5 flex items-center justify-center gap-2 text-[13px] font-semibold rounded-md transition-all cursor-pointer",
							importMode === "customize"
								? "bg-white text-zinc-700 shadow-sm ring-1 ring-zinc-200/60"
								: "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50"
						)}
					>
						<Settings2 className="h-4 w-4" /> Customize import items
					</button>
				</div>

				{/* Content Area */}
				<div className="p-5 bg-white">
					{importMode === "everything" ? (
						<div className="text-[13px] font-medium text-zinc-500">
							All properties, fields and settings will be imported exactly as is.
						</div>
					) : (
						<>
							<div className="mb-4">
								<span className="text-[13px] text-zinc-500 font-medium tracking-tight">
									Select items to import
								</span>
							</div>

							{/* TASK mode — direct checkbox grid */}
							{entityImportMode === "task" && (
								<TaskItemsGrid checks={taskChecks} onChange={onTaskCheck} />
							)}

							{/* CONTAINER mode — Automations / Views / Tasks toggles */}
							{entityImportMode === "container" && (
								<div className="divide-y divide-zinc-100">
									{CONTAINER_TOGGLES.map((toggle) => (
										<div key={toggle.id} className="py-4 first:pt-0">
											<div className="flex items-start gap-4">
												<Switch
													id={`toggle-${toggle.id}`}
													checked={containerToggles[toggle.id] ?? toggle.defaultEnabled}
													onCheckedChange={(val) => onContainerToggle(toggle.id, val)}
													className="data-[state=checked]:bg-indigo-600 shrink-0 mt-0.5 cursor-pointer"
												/>
												<div className="flex-1 min-w-0">
													<label
														htmlFor={`toggle-${toggle.id}`}
														className="text-[14px] font-medium text-zinc-700 cursor-pointer"
													>
														{toggle.label}
													</label>
													{toggle.description && (
														<p className="text-[12px] text-zinc-400 mt-0.5">{toggle.description}</p>
													)}

													{/* Nested task items when Tasks toggle is on */}
													{toggle.expandsTaskItems && containerToggles[toggle.id] && (
														<div className="mt-4">
															<TaskItemsGrid checks={taskChecks} onChange={onTaskCheck} />
														</div>
													)}
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SaveTemplateModal({
	open,
	onOpenChange,
	initialMode = "save",
	entityType = "TASK",
	workspaceId,
	contentToSave,
}: SaveTemplateModalProps) {
	const [view, setView] = useState<ModalView>(initialMode === "update" ? "update-select" : "save");
	const [previousView, setPreviousView] = useState<ModalView | null>(null);
	const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
	const [templateSearch, setTemplateSearch] = useState("");

	// Form state
	const [templateName, setTemplateName] = useState("");
	const [templateDescription, setTemplateDescription] = useState("");
	const [templateTags, setTemplateTags] = useState<string[]>([]);
	const [showDescription, setShowDescription] = useState(false);
	const [showTags, setShowTags] = useState(false);
	const [importMode, setImportMode] = useState<"everything" | "customize">("everything");
	const [shareWith, setShareWith] = useState<TemplateShareValue>("custom");
	const [publicSharing, setPublicSharing] = useState(false);
	const [taskChecks, setTaskChecks] = useState<Record<string, boolean>>(defaultTaskChecks);
	const [containerToggles, setContainerToggles] = useState<Record<string, boolean>>(defaultContainerToggles);

	// Custom sharing popup state
	const { data: session } = useSession();
	const [inviteSearch, setInviteSearch] = useState("");
	const [customInvitees, setCustomInvitees] = useState<any[]>([]);
	const [invitePopoverOpen, setInvitePopoverOpen] = useState(false);

	const { data: workspaceData } = trpc.workspace.get.useQuery(
		{ id: workspaceId as string },
		{ enabled: !!workspaceId && invitePopoverOpen }
	);

	const { data: teamsData } = trpc.team.list.useQuery(
		{ workspaceId: workspaceId as string, scope: "all" },
		{ enabled: !!workspaceId && invitePopoverOpen }
	);

	const filteredUsers = workspaceData?.members?.filter(m =>
		m.user.id !== session?.user?.id &&
		(m.user.name?.toLowerCase().includes(inviteSearch.toLowerCase()) ||
			m.user.email?.toLowerCase().includes(inviteSearch.toLowerCase()))
	) || [];

	const filteredTeams = teamsData?.items?.filter(t =>
		t.name.toLowerCase().includes(inviteSearch.toLowerCase())
	) || [];

	// Derived
	const entityImportMode: ImportMode = ENTITY_TYPE_IMPORT_MODE[entityType] ?? "none";

	// Mutations
	const { toast } = useToast();
	const utils = trpc.useUtils();
	const createMutation = trpc.template.create.useMutation();
	const updateMutation = trpc.template.update.useMutation();
	const isSubmitting = createMutation.isPending || updateMutation.isPending;

	const getCaptureConfig = () => {
		if (importMode === "everything") return { importMode: "everything" as const };
		if (entityImportMode === "task") return { importMode: "customize" as const, ...taskChecks };
		if (entityImportMode === "container") {
			return {
				importMode: "customize" as const,
				...containerToggles,
				taskConfig: containerToggles.tasks ? taskChecks : undefined,
			};
		}
		return { importMode: "customize" as const };
	};

	const getValidShares = () =>
		shareWith === "custom"
			? customInvitees
				.filter((inv) => inv.type === "user" || inv.type === "team")
				.map((inv) => ({ type: inv.type as "user" | "team", id: inv.id as string }))
			: [];

	const handleSave = async () => {
		try {
			await createMutation.mutateAsync({
				name: templateName.trim(),
				description: showDescription ? templateDescription.trim() : undefined,
				tags: showTags ? templateTags : undefined,
				entityType: entityType as any,
				workspaceId: workspaceId ?? undefined,
				shareWith,
				publicSharing,
				captureConfig: getCaptureConfig(),
				content: contentToSave || {},
				shares: getValidShares(),
			});

			await utils.template.list.invalidate();
			await utils.template.counts.invalidate();
			toast({ title: "Template saved successfully." });
			onOpenChange(false);
		} catch (error: any) {
			toast({
				title: "Could not save template",
				description: error?.message ?? "An error occurred.",
				variant: "destructive",
			});
		}
	};

	const handleUpdate = async () => {
		if (!selectedTemplateId) return;
		try {
			await updateMutation.mutateAsync({
				id: selectedTemplateId,
				name: templateName.trim(),
				description: showDescription ? templateDescription.trim() : undefined,
				tags: showTags ? templateTags : undefined,
				entityType: entityType as any,
				shareWith,
				publicSharing,
				captureConfig: getCaptureConfig(),
				content: contentToSave || {},
				shares: getValidShares(),
			});

			await utils.template.list.invalidate();
			await utils.template.counts.invalidate();
			toast({ title: "Template updated successfully." });
			onOpenChange(false);
		} catch (error: any) {
			toast({
				title: "Could not update template",
				description: error?.message ?? "An error occurred.",
				variant: "destructive",
			});
		}
	};

	// Reset on open
	useEffect(() => {
		if (open) {
			setView(initialMode === "update" ? "update-select" : "save");
			setPreviousView(null);
			setSelectedTemplateId(null);
			setTemplateSearch("");
			setTemplateName("");
			setTemplateDescription("");
			setTemplateTags([]);
			setShowDescription(false);
			setShowTags(false);
			setImportMode("everything");
			setShareWith("custom");
			setPublicSharing(false);
			setTaskChecks(defaultTaskChecks());
			setContainerToggles(defaultContainerToggles());
		}
	}, [open, initialMode]);

	const templateListEntityTypes = [
		"SPACE", "FOLDER", "LIST", "TASK", "DOC", "VIEW", "AGENT", "WORKFORCE", "LISTING", "PROJECT",
	] as const;

	// Fetch real templates for the update view
	const updateTemplatesQuery = trpc.template.list.useQuery(
		{
			scope: "workspace",
			workspaceId,
			entityTypes: templateListEntityTypes.includes(entityType as (typeof templateListEntityTypes)[number])
				? [entityType as (typeof templateListEntityTypes)[number]]
				: undefined,
			editableOnly: true,
			search: templateSearch || undefined,
			pageSize: 20,
		},
		{ enabled: open && view === "update-select" && !!workspaceId }
	);

	const selectedTemplate = updateTemplatesQuery.data?.items.find((t) => t.id === selectedTemplateId);
	const filteredTemplates = updateTemplatesQuery.data?.items || [];
	const showUpdateEmptyState = !updateTemplatesQuery.isLoading && !templateSearch.trim() && filteredTemplates.length === 0;

	const handleTaskCheck = (id: string, val: boolean) =>
		setTaskChecks((prev) => ({ ...prev, [id]: val }));

	const handleContainerToggle = (id: string, val: boolean) =>
		setContainerToggles((prev) => ({ ...prev, [id]: val }));

	// ── Shared form body ──────────────────────────────────────────────────────
	const formBody = (
		<div className="flex-1 overflow-y-auto px-10 py-8 bg-white">
			<div className="max-w-[640px] mx-auto space-y-8">
				{/* Template Name */}
				<div>
					<label className="text-[13px] font-semibold text-zinc-700 block mb-2">
						Template name<span className="text-red-500 ml-0.5">*</span>
					</label>
					<div className="flex w-full overflow-hidden h-10 items-center rounded-md border border-zinc-200 bg-white px-3 shadow-sm transition-colors focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500">
						<Search className="h-4 w-4 shrink-0 text-zinc-400" />
						<Input
							placeholder="Enter template name…"
							className="h-full bg-transparent pl-2 pr-0 !border-0 focus:outline-none focus:ring-0 focus-visible:ring-0 shadow-none text-[14px] placeholder:text-zinc-400 placeholder:font-normal"
							value={templateName}
							onChange={(e) => setTemplateName(e.target.value)}
						/>
					</div>
					<div className="flex items-center gap-4 text-xs font-medium text-zinc-500 pt-3">
						{!showDescription && (
							<button onClick={() => setShowDescription(true)} className="hover:text-zinc-700 transition-colors cursor-pointer">+ Add description</button>
						)}
						{!showTags && (
							<button onClick={() => setShowTags(true)} className="hover:text-zinc-700 transition-colors cursor-pointer">+ Add tags</button>
						)}
					</div>
				</div>

				{/* Optional: Description */}
				{showDescription && (
					<div>
						<div className="flex items-center justify-between mb-2">
							<label className="text-[13px] font-semibold text-zinc-700 block">Description</label>
							<button onClick={() => { setShowDescription(false); setTemplateDescription(""); }} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
								<X className="size-3.5" />
							</button>
						</div>
						<textarea
							placeholder="Enter description..."
							className="w-full flex min-h-[80px] rounded-md border border-zinc-200 bg-white px-3 py-2 text-[14px] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 placeholder:text-zinc-400 placeholder:font-normal resize-y"
							value={templateDescription}
							onChange={(e) => setTemplateDescription(e.target.value)}
						/>
					</div>
				)}

				{/* Optional: Tags */}
				{showTags && (
					<div>
						<div className="flex items-center justify-between mb-2">
							<label className="text-[13px] font-semibold text-zinc-700 block">Tags</label>
							<button onClick={() => { setShowTags(false); setTemplateTags([]); }} className="text-red-400 hover:text-red-500 cursor-pointer">
								<Trash2 className="size-3.5" />
							</button>
						</div>
						<div className="min-h-10 rounded-md border border-zinc-200 bg-white px-3 py-2 shadow-sm flex items-center flex-wrap gap-2">
							{templateTags.length > 0 && templateTags.map((t, idx) => (
								<div key={idx} className="flex items-center gap-1.5 px-2 py-[2px] bg-zinc-100 rounded text-xs text-zinc-600 border border-zinc-200">
									<TagIcon className="size-3 opacity-70" />
									<span>{t}</span>
								</div>
							))}
							<TagsModal
								tags={templateTags}
								onChange={setTemplateTags}
								trigger={
									<button className="flex size-7 items-center justify-center border border-zinc-200 hover:bg-zinc-50 transition-colors rounded-md text-zinc-500 cursor-pointer shadow-sm">
										<TagIcon className="size-4" />
									</button>
								}
							/>
						</div>
					</div>
				)}

				{/* Share With */}
				<div className="pt-2">
					<label className="text-[13px] font-semibold text-zinc-700 block mb-2">Share with</label>
					<div className="border rounded-md border-zinc-200">
						<div className="p-5">
							<RadioGroup
								value={shareWith}
								onValueChange={(v) => setShareWith(v as TemplateShareValue)}
								className="grid grid-cols-2 gap-y-4 gap-x-8"
							>
								{TEMPLATE_SHARE_OPTIONS.map((opt) => (
									<div key={opt.value} className="flex items-center w-full">
										<RadioGroupItem value={opt.value} id={`share-${opt.value}`} className="cursor-pointer shrink-0 mr-3" />
										<Label htmlFor={`share-${opt.value}`} className="text-[14px] font-normal cursor-pointer shrink-0">
											{opt.label}
										</Label>
										{opt.value === "custom" && (
											<div className="flex items-center ml-2">
												<div className="relative inline-flex items-center">
													{(() => {
														const displayAvatars = [
															{ type: 'me', name: session?.user?.name || 'Me', avatar: session?.user?.image, initials: session?.user?.name ? session.user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'ME' },
															...customInvitees
														];
														const maxAvatars = 5;
														const visibleAvatars = displayAvatars.slice(0, maxAvatars);
														const remainingCount = displayAvatars.length - maxAvatars;

														return (
															<>
																{visibleAvatars.map((invitee, idx) => (
																	<div
																		key={idx}
																		className={cn("relative shrink-0", idx > 0 && "-ml-2")}
																		style={{ zIndex: 50 - idx }}
																	>
																		<Avatar className={cn(
																			"h-7 w-7 border-2 border-white ring-1 ring-zinc-100",
																			invitee.type === 'me' && "opacity-60"
																		)}>
																			{invitee.type === 'team' ? (
																				<AvatarFallback className="text-[10px] bg-zinc-500 text-white">
																					{invitee.name?.charAt(0).toUpperCase()}
																				</AvatarFallback>
																			) : (
																				<>
																					<AvatarImage src={invitee.avatar || undefined} />
																					<AvatarFallback className="text-[10px] bg-indigo-600 text-white">
																						{invitee.type === 'me' ? invitee.initials : invitee.name?.charAt(0).toUpperCase()}
																					</AvatarFallback>
																				</>
																			)}
																		</Avatar>
																		{invitee.type === 'team' && (
																			<div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 bg-zinc-100 rounded-full flex items-center justify-center ring-1 ring-white">
																				<Users className="h-[8px] w-[8px] text-zinc-500" />
																			</div>
																		)}
																	</div>
																))}
																{remainingCount > 0 && (
																	<div className="relative shrink-0 -ml-2" style={{ zIndex: 50 - maxAvatars }}>
																		<div className="h-7 w-7 rounded-full bg-zinc-100 border-2 border-white ring-1 ring-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-600">
																			{remainingCount}+
																		</div>
																	</div>
																)}
															</>
														);
													})()}

													<Popover open={invitePopoverOpen} onOpenChange={setInvitePopoverOpen}>
														<PopoverTrigger asChild>
															<button
																className="-ml-2 h-7 w-7 rounded-full bg-white flex flex-shrink-0 items-center justify-center text-zinc-400 border border-zinc-200 border-dashed hover:border-zinc-300 hover:text-zinc-600 transition-colors cursor-pointer"
																style={{ zIndex: 10 }}
															>
																<UserPlus className="h-3 w-3" />
															</button>
														</PopoverTrigger>
														<PopoverContent className="w-[300px] p-0" align="start" onClick={(e) => e.stopPropagation()}>
															<div className="p-2 border-b border-zinc-100">
																<div className="flex flex-1 h-8 items-center rounded-md border border-zinc-200 bg-white px-2 shadow-sm focus-within:border-indigo-500">
																	<Search className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
																	<input
																		type="text"
																		placeholder="Search or enter email..."
																		className="flex-1 h-full bg-transparent pl-2 pr-0 text-xs outline-none border-none placeholder:text-zinc-400"
																		value={inviteSearch}
																		onChange={(e) => setInviteSearch(e.target.value)}
																	/>
																</div>
															</div>
															<ScrollArea className="max-h-[250px]">
																<div className="py-2">
																	{/* Me Item (Always rendered) */}
																	<div className="px-3 py-1 text-xs font-semibold text-zinc-500">People</div>
																	<div className="px-3 py-2 flex items-center gap-3 opacity-60">
																		<div className="relative">
																			<Avatar className="h-7 w-7">
																				<AvatarImage src={session?.user?.image || undefined} />
																				<AvatarFallback className="text-[10px] bg-zinc-600 text-white">
																					{session?.user?.name ? session.user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'ME'}
																				</AvatarFallback>
																			</Avatar>
																			<div className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white bg-emerald-500" />
																		</div>
																		<span className="text-sm text-zinc-700">Me</span>
																	</div>

																	{filteredUsers.length > 0 && (
																		<>
																			{filteredUsers.map(member => {
																				const isSelected = customInvitees.some(inv => inv.type === 'user' && inv.id === member.user.id);
																				return (
																					<button
																						key={member.user.id}
																						className={cn("w-full px-3 py-2 cursor-pointer flex items-center justify-between text-left group", isSelected ? "bg-zinc-50" : "hover:bg-zinc-50")}
																						onClick={(e) => {
																							e.preventDefault();
																							if (isSelected) {
																								setCustomInvitees(prev => prev.filter(inv => !(inv.type === 'user' && inv.id === member.user.id)));
																							} else {
																								setCustomInvitees(prev => [...prev, { type: 'user', id: member.user.id, name: member.user.name, avatar: member.user.image }]);
																								setInviteSearch("");
																							}
																						}}
																					>
																						<div className="flex items-center gap-3">
																							<div className="relative">
																								<Avatar className={cn("h-7 w-7", isSelected && "ring-2 ring-indigo-600 ring-offset-1")}>
																									<AvatarImage src={member.user.image || undefined} />
																									<AvatarFallback className="text-[10px] bg-zinc-600 text-white">
																										{member.user.name?.charAt(0).toUpperCase()}
																									</AvatarFallback>
																								</Avatar>
																								{isSelected && (
																									<div className="absolute -bottom-1 -right-1 bg-red-500 text-white hover:bg-red-600 rounded-full p-[1.5px] shadow-sm flex items-center justify-center">
																										<X className="h-[9px] w-[9px]" strokeWidth={3} />
																									</div>
																								)}
																							</div>
																							<span className={cn("text-sm truncate", isSelected ? "text-indigo-950 font-medium" : "text-zinc-700")}>{member.user.name}</span>
																						</div>
																						{isSelected && (
																							<div className="text-[10px] font-medium px-2 py-0.5 rounded border border-zinc-200 bg-white text-zinc-500 shadow-sm">Profile</div>
																						)}
																					</button>
																				)
																			})}
																		</>
																	)}

																	{(filteredTeams.length > 0) && (
																		<>
																			<Separator className="my-1 border-zinc-100" />
																			<div className="px-3 py-1 text-xs font-semibold text-zinc-500">Teams</div>
																			{filteredTeams.map(team => {
																				const isSelected = customInvitees.some(inv => inv.type === 'team' && inv.id === team.id);
																				return (
																					<button
																						key={team.id}
																						className={cn("w-full px-3 py-2 cursor-pointer flex items-center justify-between text-left group", isSelected ? "bg-zinc-50" : "hover:bg-zinc-50")}
																						onClick={(e) => {
																							e.preventDefault();
																							if (isSelected) {
																								setCustomInvitees(prev => prev.filter(inv => !(inv.type === 'team' && inv.id === team.id)));
																							} else {
																								setCustomInvitees(prev => [...prev, { type: 'team', id: team.id, name: team.name }]);
																								setInviteSearch("");
																							}
																						}}
																					>
																						<div className="flex items-center gap-3">
																							<div className="relative">
																								<div className={cn("h-7 w-7 rounded-full bg-zinc-400 text-white flex items-center justify-center", isSelected && "ring-2 ring-indigo-600 ring-offset-1")}>
																									<span className="text-[10px] font-medium">{team.name.charAt(0).toUpperCase()}</span>
																								</div>
																								{isSelected && (
																									<div className="absolute -bottom-1 -right-1 bg-red-500 text-white hover:bg-red-600 rounded-full p-[1.5px] shadow-sm flex items-center justify-center">
																										<X className="h-[9px] w-[9px]" strokeWidth={3} />
																									</div>
																								)}
																							</div>
																							<span className={cn("text-sm truncate", isSelected ? "text-indigo-950 font-medium" : "text-zinc-700")}>{team.name}</span>
																						</div>
																						{!isSelected && <span className="text-xs text-zinc-400">{(team as any)?._count?.members || 0} people</span>}
																					</button>
																				)
																			})}
																		</>
																	)}

																	{inviteSearch && (
																		<button className="w-full mt-1 px-3 py-2.5 mx-2 bg-zinc-50 hover:bg-zinc-100 rounded-md cursor-pointer flex items-center gap-3 text-left w-[calc(100%-16px)]">
																			<UserPlus className="h-4 w-4 text-zinc-600" />
																			<span className="text-sm font-medium text-zinc-700">Invite people via email</span>
																		</button>
																	)}
																</div>
															</ScrollArea>
														</PopoverContent>
													</Popover>
												</div>
											</div>
										)}
									</div>
								))}
							</RadioGroup>
						</div>
						<div className="p-4 border-t border-zinc-200 flex items-start gap-4">
							<Switch
								id="public-share"
								checked={publicSharing}
								onCheckedChange={setPublicSharing}
								className="data-[state=checked]:bg-emerald-500 mt-1 cursor-pointer"
							/>
							<div>
								<Label htmlFor="public-share" className="text-[14px] text-zinc-600 cursor-pointer block">
									Public sharing
								</Label>
								<p className="text-xs text-zinc-400 mt-1">Save to create public link.</p>
							</div>
						</div>
					</div>
				</div>

				{/* Import Options */}
				<ImportOptionsPanel
					importMode={importMode}
					setImportMode={setImportMode}
					entityImportMode={entityImportMode}
					taskChecks={taskChecks}
					onTaskCheck={handleTaskCheck}
					containerToggles={containerToggles}
					onContainerToggle={handleContainerToggle}
				/>
			</div>
		</div>
	);

	// ── VIEW: update-select ───────────────────────────────────────────────────
	if (view === "update-select") {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					showCloseButton={false}
					className="sm:max-w-[1200px] w-[95vw] h-[85vh] flex flex-col p-0 gap-0 border-0 rounded-xl overflow-hidden shadow-2xl bg-white"
				>
					<div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0 relative">
						<button
							onClick={() => {
								if (previousView) {
									setView(previousView);
									setPreviousView(null);
								} else {
									onOpenChange(false);
								}
							}}
							className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-100/70 hover:bg-zinc-200/70 rounded-md transition-colors cursor-pointer"
						>
							<ArrowLeft className="size-3.5" />
							Back
						</button>
						<DialogTitle className="text-[15px] font-semibold text-zinc-800 absolute left-1/2 -translate-x-1/2">
							Update existing template
						</DialogTitle>
						<button
							onClick={() => onOpenChange(false)}
							className="size-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
						>
							<X className="size-4" />
						</button>
					</div>

					<div className="flex-1 overflow-y-auto px-10 py-8 bg-white">
						{showUpdateEmptyState ? (
							<div className="h-full flex flex-col items-center justify-center text-center">
								<div className="relative size-14 rounded-2xl border border-zinc-300/80 bg-white flex items-center justify-center mb-4">
									<Wand2 className="size-7 text-zinc-300" />
									<div className="absolute -right-1 -bottom-1 size-5 rounded-full bg-zinc-900 text-white flex items-center justify-center shadow-sm">
										<Search className="size-2.5" />
									</div>
								</div>
								<p className="text-[21px] font-semibold text-zinc-800">No templates found</p>
								<p className="mt-2 text-[14px] text-zinc-500">Create a template in your Workspace first!</p>
								<Button
									onClick={() => { setView("save"); setSelectedTemplateId(null); }}
									className="mt-5 h-9 px-4 text-[13px] bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
								>
									Save as new Template
								</Button>
							</div>
						) : (
							<div className="max-w-[600px] mx-auto space-y-4">
								<div className="flex items-center gap-3">
									<div className="flex flex-1 overflow-hidden h-10 items-center rounded-md border border-zinc-200 bg-white px-3 shadow-sm transition-colors focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500">
										<Search className="h-4 w-4 shrink-0 text-zinc-400" />
										<Input
											placeholder="Search templates…"
											className="h-full bg-transparent pl-2 pr-0 !border-0 focus:outline-none focus:ring-0 focus-visible:ring-0 shadow-none text-[14px] placeholder:text-zinc-400 placeholder:font-normal"
											value={templateSearch}
											onChange={(e) => setTemplateSearch(e.target.value)}
										/>
										{templateSearch && (
											<button onClick={() => setTemplateSearch("")} className="cursor-pointer text-zinc-400 hover:text-zinc-600">
												<X className="h-3.5 w-3.5" />
											</button>
										)}
									</div>
									<Button variant="outline" size="sm" className="h-10 border-zinc-200 bg-white shadow-sm px-3 text-zinc-600 hover:bg-zinc-50 cursor-pointer shrink-0">
										<User className="mr-2 size-4 text-zinc-400" />
										Created by
									</Button>
								</div>

								<div className="border border-zinc-100 rounded-lg overflow-hidden shadow-sm">
									{updateTemplatesQuery.isLoading ? (
										<div className="px-4 py-10 flex flex-col items-center justify-center text-zinc-400">
											<RefreshCw className="size-5 animate-spin mb-2" />
											<span className="text-[13.5px]">Loading templates...</span>
										</div>
									) : filteredTemplates.length === 0 ? (
										<div className="px-4 py-10 text-center text-[13.5px] text-zinc-400">
											{templateSearch ? "No templates match your search." : "No templates found for this type."}
										</div>
									) : (
										filteredTemplates.map((t) => (
											<button
												key={t.id}
												onClick={() => setSelectedTemplateId(t.id)}
												className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors cursor-pointer border-b border-zinc-100 last:border-0"
											>
												<div className="flex items-center gap-3">
													<TemplateIcon type={(t as any).entityType || "TASK"} />
													<span className="text-[14px] text-zinc-700">{t.name}</span>
												</div>
												<div
													className={cn(
														"size-4 rounded-full border-2 transition-colors",
														selectedTemplateId === t.id
															? "border-indigo-600 bg-indigo-600"
															: "border-zinc-300"
													)}
												>
													{selectedTemplateId === t.id && (
														<div className="size-full rounded-full flex items-center justify-center">
															<div className="size-1.5 rounded-full bg-white" />
														</div>
													)}
												</div>
											</button>
										))
									)}
								</div>
							</div>
						)}
					</div>

					<div className={cn("p-5 px-8 flex justify-between items-center border-t border-zinc-100 bg-white shrink-0", showUpdateEmptyState && "hidden")}>
						<button
							onClick={() => { setView("save"); setSelectedTemplateId(null); }}
							className="flex items-center gap-2 text-[13px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
						>
							<span className="text-zinc-400">☰</span>
							Save a new Template instead
						</button>
						<div className="flex gap-3">
							<Button variant="ghost" className="h-9 px-4 text-[13px] cursor-pointer" onClick={() => onOpenChange(false)}>
								Cancel
							</Button>
							<Button
								className={cn(
									"h-9 px-6 text-[13px] transition-colors",
									selectedTemplateId
										? "bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer"
										: "bg-zinc-200 text-zinc-400 pointer-events-none"
								)}
								disabled={!selectedTemplateId}
								onClick={() => {
									if (selectedTemplate) {
										setTemplateName(selectedTemplate.name);
										if (selectedTemplate.description) {
											setTemplateDescription(selectedTemplate.description || "");
											setShowDescription(true);
										}
										if (selectedTemplate.tags && selectedTemplate.tags.length > 0) {
											setTemplateTags(selectedTemplate.tags);
											setShowTags(true);
										}
									}
									setView("update-edit");
								}}
							>
								Next
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	// ── VIEW: update-edit ─────────────────────────────────────────────────────
	if (view === "update-edit") {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					showCloseButton={false}
					className="sm:max-w-[1200px] w-[95vw] h-[85vh] flex flex-col p-0 gap-0 border-0 rounded-xl overflow-hidden shadow-2xl bg-white"
				>
					<div className="px-6 py-4 border-b bg-white flex shrink-0 items-center justify-center relative">
						<DialogTitle className="text-[15px] font-semibold text-center">
							Update existing template:{" "}
							<span className="text-indigo-600">{selectedTemplate?.name}</span>
						</DialogTitle>
						<button
							onClick={() => onOpenChange(false)}
							className="absolute right-4 size-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
						>
							<X className="size-4" />
						</button>
					</div>

					{formBody}

					<div className="p-5 px-8 flex justify-between items-center border-t bg-white shrink-0">
						<button
							onClick={() => setView("update-select")}
							className="flex items-center gap-2 text-[13px] font-medium text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
						>
							<RefreshCw className="h-4 w-4" />
							Choose a different Template to update
						</button>
						<div className="flex gap-3">
							<Button variant="ghost" className="h-9 px-4 text-[13px] cursor-pointer" onClick={() => onOpenChange(false)}>
								Cancel
							</Button>
							<Button
								className={cn(
									"h-9 px-6 text-[13px] transition-colors flex items-center gap-2",
									templateName.trim() && !isSubmitting
										? "bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer"
										: "bg-zinc-200 text-zinc-400 pointer-events-none"
								)}
								disabled={!templateName.trim() || isSubmitting}
								onClick={handleUpdate}
							>
								{isSubmitting ? (
									<>
										<RefreshCw className="size-3.5 animate-spin" />
										Updating…
									</>
								) : (
									"Save Template"
								)}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	// ── VIEW: save (default) ──────────────────────────────────────────────────
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="sm:max-w-[1200px] w-[95vw] h-[85vh] flex flex-col p-0 gap-0 border-0 rounded-xl overflow-hidden shadow-2xl bg-white"
			>
				<div className="px-6 py-4 border-b bg-white flex shrink-0 items-center justify-center relative">
					<DialogTitle className="text-[15px] font-semibold text-center">
						Save as new {entityType.charAt(0) + entityType.slice(1).toLowerCase()} Template
					</DialogTitle>
					<button
						onClick={() => onOpenChange(false)}
						className="absolute right-4 size-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
					>
						<X className="size-4" />
					</button>
				</div>

				{formBody}

				<div className="p-5 px-8 flex justify-between items-center border-t bg-white shrink-0">
					<button
						onClick={() => {
							setPreviousView("save");
							setView("update-select");
						}}
						className="flex items-center gap-2 text-[13px] font-medium text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
					>
						<RefreshCw className="h-4 w-4" />
						Update an existing Template
					</button>
					<div className="flex gap-3">
						<Button variant="ghost" className="h-9 px-4 text-[13px] cursor-pointer" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button
							className={cn(
								"h-9 px-6 text-[13px] transition-colors flex items-center gap-2",
								templateName.trim() && !isSubmitting
									? "bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer"
									: "bg-zinc-200 text-zinc-400 pointer-events-none"
							)}
							disabled={!templateName.trim() || isSubmitting}
							onClick={handleSave}
						>
							{isSubmitting ? (
								<>
									<RefreshCw className="size-3.5 animate-spin" />
									Saving…
								</>
							) : (
								"Save Template"
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
