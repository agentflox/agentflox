"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, RefreshCw, Network, Settings2, ArrowLeft, X, Info, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { SingleDateCalendar } from "@/components/ui/date-picker";
import { trpc } from "@/lib/trpc";
import {
	breadcrumbItemClass,
	DestinationTreeRow,
	ENTITY_TREE_NEST,
	EntityTreeIcon,
} from "@/features/dashboard/components/shared/breadcrumbTreeUi";
import {
	TASK_IMPORT_ITEMS_COL1,
	TASK_IMPORT_ITEMS_COL2,
	ENTITY_TYPE_IMPORT_MODE,
	defaultTaskChecks,
} from "@/entities/templates/constants/importOptions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseTemplateModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	template: {
		id: string;
		name: string;
		entityType: string;
	} | null;
	/** Called when user confirms "Use Template" */
	onUse?: (config: UseTemplateConfig) => void;
	onBack?: () => void;
	embedded?: boolean;
	taskOnly?: boolean;
	workspaceId?: string;
	sourceContext?: {
		workspaceId?: string;
		spaceId?: string;
		projectId?: string;
		teamId?: string;
		folderId?: string;
		listId?: string;
	};
}

export interface UseTemplateConfig {
	templateId: string;
	entityName: string;
	destination: {
		kind: "workspace" | "standalone" | "space" | "project" | "team" | "folder" | "list";
		id?: string;
		workspaceId?: string;
		spaceId?: string;
		projectId?: string;
		teamId?: string;
		folderId?: string;
		listId?: string;
	};
	importMode: "everything" | "customize";
	taskChecks: Record<string, boolean>;
	dateMode: "as-is" | "remap";
	remapDueDate?: string;
	archivedTasks: "no" | "yes-include" | "yes-unarchive";
}

// ─── Task checkbox grid ───────────────────────────────────────────────────────

function TaskChecksGrid({
	checks,
	onChange,
}: {
	checks: Record<string, boolean>;
	onChange: (id: string, val: boolean) => void;
}) {
	return (
		<div className="grid grid-cols-2 gap-x-10 gap-y-3 pt-2">
			<div className="space-y-3">
				{TASK_IMPORT_ITEMS_COL1.map((item) => (
					<div key={item.id} className="flex items-center space-x-2.5">
						<Checkbox
							id={`use-${item.id}`}
							checked={checks[item.id] ?? item.defaultChecked}
							onCheckedChange={(c) => onChange(item.id, !!c)}
							className="rounded-[4px] data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 cursor-pointer"
						/>
						<label htmlFor={`use-${item.id}`} className="text-[13.5px] font-normal cursor-pointer text-zinc-700 leading-none">
							{item.label}
						</label>
					</div>
				))}
			</div>
			<div className="space-y-3">
				{TASK_IMPORT_ITEMS_COL2.map((item) => (
					<div key={item.id} className="flex items-center space-x-2.5">
						<Checkbox
							id={`use2-${item.id}`}
							checked={checks[item.id] ?? item.defaultChecked}
							onCheckedChange={(c) => onChange(item.id, !!c)}
							className="rounded-[4px] data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 cursor-pointer"
						/>
						<label htmlFor={`use2-${item.id}`} className="text-[13.5px] font-normal cursor-pointer text-zinc-700 leading-none">
							{item.label}
						</label>
					</div>
				))}
			</div>
		</div>
	);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UseTemplateModal({
	open,
	onOpenChange,
	template,
	onUse,
	onBack,
	embedded = false,
	taskOnly = false,
	workspaceId,
	sourceContext,
}: UseTemplateModalProps) {
	const resolvedWorkspaceId = workspaceId ?? sourceContext?.workspaceId;
	const [entityName, setEntityName] = useState(template?.name ?? "");
	const [destinationOpen, setDestinationOpen] = useState(false);
	const [destinationSearch, setDestinationSearch] = useState("");
	const [destinationKey, setDestinationKey] = useState<string>("");
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
	const [importMode, setImportMode] = useState<"everything" | "customize">("everything");
	const [taskChecks, setTaskChecks] = useState<Record<string, boolean>>(defaultTaskChecks);
	const [dateMode, setDateMode] = useState<"as-is" | "remap">("as-is");
	const [remapDueDate, setRemapDueDate] = useState<Date | undefined>(undefined);
	const [remapPopoverOpen, setRemapPopoverOpen] = useState(false);
	const [archivedTasks, setArchivedTasks] = useState<"no" | "yes-include" | "yes-unarchive">("no");
	const workspacesQuery = trpc.workspace.list.useQuery(
		{ scope: "all", page: 1, pageSize: 100 },
		{ enabled: open }
	);
	const workspaceIds = React.useMemo(
		() => (workspacesQuery.data?.items ?? []).map((w: any) => w.id),
		[workspacesQuery.data?.items]
	);
	const spacesQuery = trpc.space.list.useQuery(
		{ scope: "all", page: 1, pageSize: 200 },
		{ enabled: open }
	);
	const projectsQuery = trpc.project.list.useQuery(
		{ scope: "all", page: 1, pageSize: 200 },
		{ enabled: open }
	);
	const teamsQuery = trpc.team.list.useQuery(
		{ scope: "all", page: 1, pageSize: 200 },
		{ enabled: open }
	);
	const foldersQueries = trpc.useQueries((t) =>
		workspaceIds.map((wsId) =>
			t.folder.byContext(
				{ workspaceId: wsId },
				{ enabled: open }
			)
		)
	);
	const listsQueries = trpc.useQueries((t) =>
		workspaceIds.map((wsId) =>
			t.list.byContext(
				{ workspaceId: wsId },
				{ enabled: open }
			)
		)
	);
	const allFolders = React.useMemo(
		() => foldersQueries.flatMap((q: any) => q.data?.items ?? []),
		[foldersQueries]
	);
	const allLists = React.useMemo(
		() => listsQueries.flatMap((q: any) => q.data?.items ?? []),
		[listsQueries]
	);

	// Sync name when template changes
	React.useEffect(() => {
		setEntityName(template?.name ?? "");
		setTaskChecks(defaultTaskChecks());
		setImportMode("everything");
		setDateMode("as-is");
		setRemapDueDate(undefined);
		setArchivedTasks("no");
		setDestinationKey("");
		setDestinationSearch("");
		setDestinationOpen(false);
	}, [template?.id, open]);

	const entityTypeUpper = String(template?.entityType || "").toUpperCase();
	const entityImportMode = ENTITY_TYPE_IMPORT_MODE[template?.entityType ?? ""] ?? "none";
	const hasImportOptions = entityImportMode !== "none";
	const entityTypeLabel = template
		? template.entityType.charAt(0) + template.entityType.slice(1).toLowerCase()
		: "";

	const showAdvancedSectionsForNonTask = ["SPACE", "LIST", "FOLDER", "PROJECT", "TASK"].includes(entityTypeUpper);
	const showArchivedTasksOption = !taskOnly && ["SPACE", "LIST", "FOLDER", "PROJECT"].includes(entityTypeUpper);
	const workspaceOnlyTypes = new Set(["AGENT", "WORKFORCE", "PROPOSAL", "LISTING"]);
	const allowedKinds = React.useMemo(() => {
		if (workspaceOnlyTypes.has(entityTypeUpper)) return new Set(["workspace", "standalone"]);
		switch (entityTypeUpper) {
			case "SPACE":
				return new Set(["workspace", "standalone"]);
			case "PROJECT":
				return new Set(["workspace", "standalone", "space"]);
			case "FOLDER":
				return new Set(["workspace", "standalone", "space", "project", "team", "folder"]);
			case "LIST":
				return new Set(["workspace", "standalone", "space", "project", "team", "folder"]);
			case "TASK":
				return new Set(["workspace", "standalone", "space", "project", "team", "folder", "list"]);
			case "VIEW":
				return new Set(["workspace", "standalone", "space", "project", "team", "folder", "list"]);
			default:
				return new Set(["workspace", "standalone"]);
		}
	}, [entityTypeUpper]);

	type DestinationOption = {
		key: string;
		label: string;
		kind: "workspace" | "standalone" | "space" | "project" | "team" | "folder" | "list";
		depth: number;
		workspaceId?: string;
		spaceId?: string;
		projectId?: string;
		teamId?: string;
		folderId?: string;
		listId?: string;
	};

	const sourceList = React.useMemo(
		() => allLists.find((l: any) => l.id === sourceContext?.listId),
		[allLists, sourceContext?.listId]
	);
	const workspaceNameById = React.useMemo(() => {
		const map = new Map<string, string>();
		for (const w of workspacesQuery.data?.items ?? []) map.set(w.id, w.name);
		return map;
	}, [workspacesQuery.data?.items]);
	const spaceNameById = React.useMemo(() => {
		const map = new Map<string, string>();
		for (const s of spacesQuery.data?.items ?? []) map.set(s.id, s.name);
		return map;
	}, [spacesQuery.data?.items]);
	const projectNameById = React.useMemo(() => {
		const map = new Map<string, string>();
		for (const p of projectsQuery.data?.items ?? []) map.set(p.id, p.name);
		return map;
	}, [projectsQuery.data?.items]);
	const teamNameById = React.useMemo(() => {
		const map = new Map<string, string>();
		for (const t of teamsQuery.data?.items ?? []) map.set(t.id, t.name);
		return map;
	}, [teamsQuery.data?.items]);
	const folderNameById = React.useMemo(() => {
		const map = new Map<string, string>();
		for (const f of allFolders ?? []) map.set(f.id, f.name);
		return map;
	}, [allFolders]);

	const destinationOptions = React.useMemo<DestinationOption[]>(() => {
		const opts: DestinationOption[] = [];
		const addOption = (option: DestinationOption) => {
			if (!opts.some((o) => o.key === option.key)) {
				opts.push(option);
			}
		};
		(workspacesQuery.data?.items ?? []).forEach((w: any) => {
			if (allowedKinds.has("workspace")) addOption({ key: `workspace:${w.id}`, kind: "workspace", label: w.name ?? "Workspace", depth: 0, workspaceId: w.id });
		});
		if (allowedKinds.has("standalone")) {
			addOption({ key: "standalone", kind: "standalone", label: "Standalone", depth: 0 });
		}
		(spacesQuery.data?.items ?? []).forEach((s: any) => {
			if (allowedKinds.has("space")) addOption({ key: `space:${s.id}`, kind: "space", label: s.name, depth: 1, workspaceId: s.workspaceId ?? undefined, spaceId: s.id });
		});
		(projectsQuery.data?.items ?? []).forEach((p: any) => {
			if (allowedKinds.has("project")) addOption({ key: `project:${p.id}`, kind: "project", label: p.name, depth: 1, workspaceId: p.workspaceId ?? undefined, projectId: p.id, spaceId: p.spaceId ?? undefined });
		});
		(teamsQuery.data?.items ?? []).forEach((t: any) => {
			if (allowedKinds.has("team")) addOption({ key: `team:${t.id}`, kind: "team", label: t.name, depth: 1, workspaceId: t.workspaceId ?? undefined, teamId: t.id, spaceId: t.spaceId ?? undefined });
		});
		(allFolders ?? []).forEach((f: any) => {
			if (!allowedKinds.has("folder")) return;
			const depth = f.parentId ? 3 : 2;
			addOption({
				key: `folder:${f.id}`,
				kind: "folder",
				label: f.name,
				depth,
				workspaceId: f.workspaceId ?? undefined,
				spaceId: f.spaceId ?? undefined,
				projectId: f.projectId ?? undefined,
				teamId: f.teamId ?? undefined,
				folderId: f.id,
			});
		});
		(allLists ?? []).forEach((l: any) => {
			if (!allowedKinds.has("list")) return;
			const depth = l.folderId ? 4 : 3;
			addOption({
				key: `list:${l.id}`,
				kind: "list",
				label: l.name,
				depth,
				workspaceId: l.workspaceId ?? undefined,
				spaceId: l.spaceId ?? undefined,
				projectId: l.projectId ?? undefined,
				teamId: l.teamId ?? undefined,
				folderId: l.folderId ?? undefined,
				listId: l.id,
			});
		});

		// Fallback hierarchy entries from source list / source context (ensures visible nested path)
		const inferredSpaceId = sourceList?.spaceId ?? sourceContext?.spaceId;
		const inferredProjectId = sourceList?.projectId ?? sourceContext?.projectId;
		const inferredTeamId = sourceList?.teamId ?? sourceContext?.teamId;
		const inferredFolderId = sourceList?.folderId ?? sourceContext?.folderId;

		if (allowedKinds.has("space") && inferredSpaceId) {
			addOption({
				key: `space:${inferredSpaceId}`,
				kind: "space",
				label: sourceList?.space?.name ?? spaceNameById.get(inferredSpaceId) ?? "Space",
				depth: 1,
				workspaceId: sourceList?.workspaceId ?? sourceContext?.workspaceId,
				spaceId: inferredSpaceId,
			});
		}
		if (allowedKinds.has("project") && inferredProjectId) {
			addOption({
				key: `project:${inferredProjectId}`,
				kind: "project",
				label: sourceList?.project?.name ?? projectNameById.get(inferredProjectId) ?? "Project",
				depth: 1,
				workspaceId: sourceList?.workspaceId ?? sourceContext?.workspaceId,
				projectId: inferredProjectId,
				spaceId: inferredSpaceId,
			});
		}
		if (allowedKinds.has("team") && inferredTeamId) {
			addOption({
				key: `team:${inferredTeamId}`,
				kind: "team",
				label: teamNameById.get(inferredTeamId) ?? "Team",
				depth: 1,
				workspaceId: sourceList?.workspaceId ?? sourceContext?.workspaceId,
				teamId: inferredTeamId,
				spaceId: inferredSpaceId,
			});
		}
		if (allowedKinds.has("folder") && inferredFolderId) {
			addOption({
				key: `folder:${inferredFolderId}`,
				kind: "folder",
				label: sourceList?.folder?.name ?? folderNameById.get(inferredFolderId) ?? "Folder",
				depth: 2,
				workspaceId: sourceList?.workspaceId ?? sourceContext?.workspaceId,
				spaceId: inferredSpaceId,
				projectId: inferredProjectId,
				teamId: inferredTeamId,
				folderId: inferredFolderId,
			});
		}

		return opts;
	}, [allowedKinds, workspacesQuery.data?.items, spacesQuery.data?.items, projectsQuery.data?.items, teamsQuery.data?.items, allFolders, allLists, sourceContext, sourceList, spaceNameById, projectNameById, teamNameById, folderNameById]);

	const WORKSPACE_AVATAR_COLORS = [
		"#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
		"#10b981", "#3b82f6", "#ef4444", "#14b8a6",
	];

	const workspaceGroups = React.useMemo(() => {
		const wsIds = Array.from(
			new Set(
				destinationOptions
					.filter((o) => o.workspaceId)
					.map((o) => o.workspaceId as string)
			)
		);

		return wsIds.map((wsId, idx) => {
			const wsOpt = destinationOptions.find((o) => o.key === `workspace:${wsId}`);
			const workspaceName = wsOpt?.label ?? workspaceNameById.get(wsId) ?? "Workspace";
			const avatarColor = WORKSPACE_AVATAR_COLORS[idx % WORKSPACE_AVATAR_COLORS.length];

			const spaces = destinationOptions
				.filter((o) => o.kind === "space" && o.workspaceId === wsId)
				.map((space) => {
					const spaceId = space.spaceId!;
					const projectsUnderSpace = destinationOptions.filter(
						(o) => (o.kind === "project" || o.kind === "team") && o.spaceId === spaceId
					);
					const foldersUnderSpace = destinationOptions.filter(
						(o) => o.kind === "folder" && o.spaceId === spaceId && !o.projectId && !o.teamId
					);
					const listsUnderSpace = destinationOptions.filter(
						(o) => o.kind === "list" && o.spaceId === spaceId && !o.folderId && !o.projectId && !o.teamId
					);

					const expandedProjectsTeams = projectsUnderSpace.flatMap((pt) => {
						const ptId = pt.kind === "project" ? pt.projectId : pt.teamId;
						const foldersUnderPt = destinationOptions.filter(
							(o) => o.kind === "folder" &&
								((pt.kind === "project" && o.projectId === ptId) ||
									(pt.kind === "team" && o.teamId === ptId)) &&
								!o.folderId
						);
						const listsUnderPt = destinationOptions.filter(
							(o) => o.kind === "list" &&
								((pt.kind === "project" && o.projectId === ptId) ||
									(pt.kind === "team" && o.teamId === ptId)) &&
								!o.folderId
						);
						const expandedFolders = foldersUnderPt.flatMap((folder) => {
							const listsUnderFolder = destinationOptions.filter(
								(o) => o.kind === "list" && o.folderId === folder.folderId
							);
							return [
								{ ...folder, depth: 2 },
								...listsUnderFolder.map((l) => ({ ...l, depth: 3 })),
							];
						});
						return [
							{ ...pt, depth: 1 },
							...expandedFolders,
							...listsUnderPt.map((l) => ({ ...l, depth: 2 })),
						];
					});

					const expandedFoldersUnderSpace = foldersUnderSpace.flatMap((folder) => {
						const listsUnderFolder = destinationOptions.filter(
							(o) => o.kind === "list" && o.folderId === folder.folderId
						);
						return [
							{ ...folder, depth: 1 },
							...listsUnderFolder.map((l) => ({ ...l, depth: 2 })),
						];
					});

					return {
						key: space.key,
						name: space.label,
						spaceId,
						children: [
							...expandedProjectsTeams,
							...expandedFoldersUnderSpace,
							...listsUnderSpace.map((l) => ({ ...l, depth: 1 })),
						],
					};
				});

			const rootFolders = destinationOptions.filter(
				(o) => o.kind === "folder" && o.workspaceId === wsId && !o.spaceId
			);
			const rootLists = destinationOptions.filter(
				(o) => o.kind === "list" && o.workspaceId === wsId && !o.spaceId
			);
			const rootProjects = destinationOptions.filter(
				(o) => o.kind === "project" && o.workspaceId === wsId && !o.spaceId
			);
			const rootTeams = destinationOptions.filter(
				(o) => o.kind === "team" && o.workspaceId === wsId && !o.spaceId
			);

			return {
				workspaceKey: `workspace:${wsId}`,
				workspaceName,
				avatarColor,
				spaces,
				rootChildren: [
					...rootProjects.map((p) => ({ ...p, depth: 1 })),
					...rootTeams.map((t) => ({ ...t, depth: 1 })),
					...rootFolders.map((f) => ({ ...f, depth: 1 })),
					...rootLists.map((l) => ({ ...l, depth: 1 })),
				],
			};
		});
	}, [destinationOptions, workspaceNameById]);

	const getDestinationPath = React.useCallback((opt?: DestinationOption) => {
		if (!opt) return "";
		if (opt.kind === "standalone") return "Standalone";
		const parts: string[] = [];
		const workspaceName = (opt.workspaceId && workspaceNameById.get(opt.workspaceId)) ?? "Workspace";
		if (opt.workspaceId || opt.kind === "workspace") parts.push(workspaceName);
		if (opt.spaceId) parts.push(spaceNameById.get(opt.spaceId) ?? (opt.kind === "space" ? opt.label : "Space"));
		if (opt.projectId) parts.push(projectNameById.get(opt.projectId) ?? (opt.kind === "project" ? opt.label : "Project"));
		if (opt.teamId) parts.push(teamNameById.get(opt.teamId) ?? (opt.kind === "team" ? opt.label : "Team"));
		if (opt.folderId) parts.push(folderNameById.get(opt.folderId) ?? (opt.kind === "folder" ? opt.label : "Folder"));
		if (opt.kind === "list") parts.push(opt.label);
		if (parts.length === 0) return opt.label;
		return parts.join(" > ");
	}, [workspaceNameById, spaceNameById, projectNameById, teamNameById, folderNameById]);

	React.useEffect(() => {
		if (!open || taskOnly) return;
		if (destinationOptions.length === 0) return;
		if (destinationKey && destinationOptions.some((o) => o.key === destinationKey)) return;
		const sourceListParentKey =
			sourceList?.folderId
				? `folder:${sourceList.folderId}`
				: sourceList?.projectId
					? `project:${sourceList.projectId}`
					: sourceList?.teamId
						? `team:${sourceList.teamId}`
						: sourceList?.spaceId
							? `space:${sourceList.spaceId}`
							: sourceList?.workspaceId
								? `workspace:${sourceList.workspaceId}`
								: "";

		const preferKeys = [
			entityTypeUpper === "LIST" && sourceListParentKey ? sourceListParentKey : "",
			sourceContext?.listId ? `list:${sourceContext.listId}` : "",
			sourceContext?.folderId ? `folder:${sourceContext.folderId}` : "",
			sourceContext?.projectId ? `project:${sourceContext.projectId}` : "",
			sourceContext?.teamId ? `team:${sourceContext.teamId}` : "",
			sourceContext?.spaceId ? `space:${sourceContext.spaceId}` : "",
			sourceContext?.workspaceId && allowedKinds.has("workspace") ? `workspace:${sourceContext.workspaceId}` : "",
			resolvedWorkspaceId && allowedKinds.has("workspace") ? `workspace:${resolvedWorkspaceId}` : "",
			allowedKinds.has("standalone") ? "standalone" : "",
		].filter(Boolean);
		const match = preferKeys.find((k) => destinationOptions.some((opt) => opt.key === k));
		if (match) setDestinationKey(match);
	}, [open, taskOnly, sourceContext, resolvedWorkspaceId, allowedKinds, destinationOptions, entityTypeUpper, sourceList, destinationKey]);

	const selectedDestination = destinationOptions.find((d) => d.key === destinationKey);

	const handleTaskCheck = (id: string, val: boolean) =>
		setTaskChecks((prev) => ({ ...prev, [id]: val }));

	const handleUse = () => {
		if (!template) return;
		onUse?.({
			templateId: template.id,
			entityName,
			destination: {
				kind: selectedDestination?.kind ?? "standalone",
				id: selectedDestination?.kind === "standalone" ? undefined : selectedDestination?.key.split(":")[1],
				workspaceId: selectedDestination?.workspaceId,
				spaceId: selectedDestination?.spaceId,
				projectId: selectedDestination?.projectId,
				teamId: selectedDestination?.teamId,
				folderId: selectedDestination?.folderId,
				listId: selectedDestination?.listId,
			},
			importMode,
			taskChecks,
			dateMode,
			remapDueDate: dateMode === "remap" && remapDueDate ? remapDueDate.toISOString() : undefined,
			archivedTasks,
		});
		onOpenChange(false);
	};

	if (!template) return null;

	const content = (
		<>
				{/* Header */}
				<div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-100 shrink-0">
					<button
						onClick={() => onBack ? onBack() : onOpenChange(false)}
						className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-100/70 hover:bg-zinc-200/70 rounded-md transition-colors cursor-pointer"
					>
						<ArrowLeft className="size-3.5" />
						Back
					</button>
					<DialogTitle className="text-[15px] font-semibold text-zinc-800">
						Use {entityTypeLabel} template
					</DialogTitle>
					<button
						onClick={() => onOpenChange(false)}
						className="size-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
					>
						<X className="size-4" />
					</button>
				</div>

				{/* Scrollable body */}
				<div className="flex-1 overflow-y-auto px-4 py-5">
					<div className="mx-auto w-full max-w-[640px] space-y-6">
					{!taskOnly && (
						<>
							{/* Entity name */}
							<div className="space-y-4">
								<label className="block mb-1.5 text-[13px] font-semibold text-zinc-700">
									{entityTypeLabel} name
								</label>
								<div className="flex items-center gap-2 h-10 rounded-md border border-indigo-400 bg-white px-3 shadow-sm focus-within:ring-1 focus-within:ring-indigo-500">
									<span className="text-zinc-400 text-sm">≡</span>
									<Input
										value={entityName}
										onChange={(e) => setEntityName(e.target.value)}
										className="h-full bg-transparent !border-0 focus:outline-none focus:ring-0 focus-visible:ring-0 shadow-none text-[14px] text-zinc-700 placeholder:text-zinc-400"
										placeholder={`${entityTypeLabel} name…`}
									/>
								</div>
							</div>

							{/* Location */}
							<div className="space-y-3">
								<label className="block mb-1.5 text-[13px] font-semibold text-zinc-700">
									Where should this {entityTypeLabel} be created?
									<span className="text-red-500 ml-0.5">*</span>
								</label>
								<Popover open={destinationOpen} onOpenChange={setDestinationOpen}>
									<PopoverTrigger asChild>
										<button className="h-10 w-full border border-zinc-200 bg-white text-[14px] shadow-sm text-zinc-700 rounded-md px-3 flex items-center justify-between cursor-pointer">
											<span className={cn("truncate text-left", !selectedDestination && "text-zinc-400")}>
												{selectedDestination
													? selectedDestination.kind === "standalone"
														? "Standalone"
														: selectedDestination.kind === "workspace"
															? selectedDestination.label
															: getDestinationPath(selectedDestination)
													: "Select a destination..."}
											</span>
											<span className="text-zinc-400">⌄</span>
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
											{allowedKinds.has("standalone") && (!destinationSearch.trim() || "standalone".includes(destinationSearch.toLowerCase())) && (
												<div
													className={cn(breadcrumbItemClass(destinationKey === "standalone"), "justify-between")}
													onClick={() => { setDestinationKey("standalone"); setDestinationOpen(false); }}
												>
													<div className="flex items-center gap-2 min-w-0">
														<EntityTreeIcon kind="project" />
														<span className="truncate text-zinc-700">Standalone</span>
													</div>
												</div>
											)}

											{workspaceGroups.map((group) => {
												const isWsCollapsed = collapsedNodes.has(`ws-${group.workspaceKey}`);
												const wsHasChildren = (group.spaces && group.spaces.length > 0) || (group.rootChildren && group.rootChildren.length > 0);
												const select = (key: string) => { setDestinationKey(key); setDestinationOpen(false); };
												return (
													<div key={group.workspaceKey} className="space-y-0.5">
														{allowedKinds.has("workspace") && (!destinationSearch.trim() || group.workspaceName.toLowerCase().includes(destinationSearch.toLowerCase())) && (
															<DestinationTreeRow
																selected={destinationKey === group.workspaceKey}
																kind="workspace"
																entity={{ color: group.avatarColor }}
																label={group.workspaceName}
																hasChildren={wsHasChildren}
																expanded={!isWsCollapsed}
																onToggle={(e) => toggleNode(e, `ws-${group.workspaceKey}`)}
																onClick={() => select(group.workspaceKey)}
															/>
														)}
														{!isWsCollapsed && (
															<div className={ENTITY_TREE_NEST}>
																{group.spaces
																	.filter((s: any) => !destinationSearch.trim() || s.name.toLowerCase().includes(destinationSearch.toLowerCase()))
																	.map((space: any) => {
																		const isSpaceCollapsed = collapsedNodes.has(`space-${space.key}`);
																		const spaceHasChildren = space.children && space.children.length > 0;
																		return (
																			<div key={space.key} className="space-y-0.5">
																				<DestinationTreeRow
																					selected={destinationKey === space.key}
																					kind="space"
																					entity={space}
																					label={space.name}
																					hasChildren={spaceHasChildren}
																					expanded={!isSpaceCollapsed}
																					onToggle={(e) => toggleNode(e, `space-${space.key}`)}
																					onClick={() => select(space.key)}
																				/>
																				{!isSpaceCollapsed && spaceHasChildren && (
																					<div className={ENTITY_TREE_NEST}>
																						{space.children
																							.filter((c: any) => !destinationSearch.trim() || c.label.toLowerCase().includes(destinationSearch.toLowerCase()))
																							.map((child: any) => (
																								<DestinationTreeRow
																									key={child.key}
																									selected={destinationKey === child.key}
																									kind={child.kind}
																									entity={child}
																									label={child.label}
																									onClick={() => select(child.key)}
																								/>
																							))}
																					</div>
																				)}
																			</div>
																		);
																	})}
																{group.rootChildren
																	.filter((c: any) => !destinationSearch.trim() || c.label.toLowerCase().includes(destinationSearch.toLowerCase()))
																	.map((child: any) => (
																		<DestinationTreeRow
																			key={child.key}
																			selected={destinationKey === child.key}
																			kind={child.kind}
																			entity={child}
																			label={child.label}
																			onClick={() => select(child.key)}
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
						</>
					)}

					{/* Import options */}
					{(taskOnly || showAdvancedSectionsForNonTask) && hasImportOptions && (
						<div className="space-y-2.5">
							<label className="block mb-1.5 text-[13px] font-semibold text-zinc-700">Import options</label>

							{/* Tab-style selector */}
								<div className="grid grid-cols-2 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
								<button
									onClick={() => setImportMode("everything")}
									className={cn(
											"flex items-center justify-center gap-2 rounded-md py-2 text-[13px] font-medium transition-colors cursor-pointer",
										importMode === "everything"
												? "bg-white text-zinc-900 shadow-sm"
												: "text-zinc-500 hover:text-zinc-700"
									)}
								>
									<Network className="size-3.5" />
									Import everything
								</button>
								<button
									onClick={() => setImportMode("customize")}
									className={cn(
											"flex items-center justify-center gap-2 rounded-md py-2 text-[13px] font-medium transition-colors cursor-pointer",
										importMode === "customize"
												? "bg-white text-zinc-900 shadow-sm"
												: "text-zinc-500 hover:text-zinc-700"
									)}
								>
									<Settings2 className="size-3.5" />
									Customize import items
								</button>
							</div>

							{/* Content below tab */}
							<div className="rounded-lg border border-zinc-200 bg-white p-4">
								{importMode === "everything" ? (
									<p className="text-[13px] text-zinc-500">
										All properties, fields and settings will be imported exactly as is.
									</p>
								) : (
									<TaskChecksGrid checks={taskChecks} onChange={handleTaskCheck} />
								)}
							</div>
						</div>
					)}

					{/* Start and due dates */}
					{(taskOnly || showAdvancedSectionsForNonTask) && (
					<div className="space-y-3.5">
						<label className="block mb-1.5 text-[13px] font-semibold text-zinc-700">Start and due dates</label>
						<div className="grid grid-cols-2 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
							<button
								onClick={() => setDateMode("as-is")}
								className={cn(
									"flex items-center justify-center gap-2 rounded-md py-2 text-[13px] font-medium transition-colors cursor-pointer",
									dateMode === "as-is"
										? "bg-white text-zinc-900 shadow-sm"
										: "text-zinc-500 hover:text-zinc-700"
								)}
							>
								<CalendarDays className="size-3.5" />
								Import as is
							</button>
							<button
								onClick={() => setDateMode("remap")}
								className={cn(
									"flex items-center justify-center gap-2 rounded-md py-2 text-[13px] font-medium transition-colors cursor-pointer",
									dateMode === "remap"
										? "bg-white text-zinc-900 shadow-sm"
										: "text-zinc-500 hover:text-zinc-700"
								)}
							>
								<RefreshCw className="size-3.5" />
								Remap dates
							</button>
						</div>
						<p className="text-[12.5px] text-zinc-500">
							{dateMode === "as-is"
								? "Due Dates and Start Dates are static and will be imported exactly as is."
								: "Remap dates relative to today when the template is applied."}
						</p>
						{dateMode === "remap" && (
							<div className="space-y-2">
								<label className="text-[13px] font-semibold text-zinc-700">Parent task Due Date:</label>
								<Popover open={remapPopoverOpen} onOpenChange={setRemapPopoverOpen}>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className="h-10 w-full justify-between border-zinc-200 bg-white text-[14px] shadow-sm text-zinc-700 hover:bg-zinc-50 font-normal"
										>
											<span className={cn(!remapDueDate && "text-zinc-400")}>
												{remapDueDate ? remapDueDate.toLocaleDateString() : "Pick a Due Date"}
											</span>
											<CalendarDays className="size-4 text-zinc-400" />
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0 border-0 shadow-none bg-transparent" align="start">
										<SingleDateCalendar
											selectedDate={remapDueDate}
											onDateChange={(d) => {
												setRemapDueDate(d);
												if (d) setRemapPopoverOpen(false);
											}}
											showTimeInput={false}
										/>
									</PopoverContent>
								</Popover>
								<p className="text-[12.5px] text-zinc-500">
									Subtask dates will be shifted by the same difference from the template parent due date.
								</p>
							</div>
						)}
					</div>
					)}

					{/* Archived tasks */}
					{showArchivedTasksOption && (
					<div className="space-y-3.5">
						<label className="block mb-1.5 text-[13px] font-semibold text-zinc-700">
							Do you want to include archived tasks?
						</label>
						<RadioGroup
							value={archivedTasks}
							onValueChange={(v) => setArchivedTasks(v as typeof archivedTasks)}
							className="rounded-lg border border-zinc-200 bg-white p-3 gap-1"
						>
							<div className="flex items-center space-x-2.5">
								<RadioGroupItem value="no" id="arch-no" className="cursor-pointer" />
								<Label htmlFor="arch-no" className="text-[13.5px] font-normal cursor-pointer text-zinc-700">No</Label>
							</div>
							<div className="flex items-center space-x-2.5">
								<RadioGroupItem value="yes-include" id="arch-yes" className="cursor-pointer" />
								<Label htmlFor="arch-yes" className="text-[13.5px] font-normal cursor-pointer">
									<span className="text-zinc-700">Yes, </span>
									<span className="text-indigo-600">include archived tasks</span>
								</Label>
							</div>
							<div className="flex items-center space-x-2.5">
								<RadioGroupItem value="yes-unarchive" id="arch-unarchive" className="cursor-pointer" />
								<Label htmlFor="arch-unarchive" className="text-[13.5px] font-normal cursor-pointer">
									<span className="text-zinc-700">Yes, include </span>
									<span className="text-indigo-600">and</span>
									<span className="text-zinc-700"> unarchive tasks</span>
								</Label>
							</div>
						</RadioGroup>
					</div>
					)}
					</div>
				</div>

				{/* Footer */}
				<div className="px-6 py-3.5 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between shrink-0">
					<div className="flex items-center gap-2 text-[12.5px] text-zinc-500">
						<Info className="size-3.5 shrink-0 text-zinc-400" />
						{taskOnly
							? "This template will override the selected task using your import options."
							: <>Using this template will create a new <span className="font-medium text-zinc-700">{entityTypeLabel}</span> in your selected location!</>}
					</div>
					<div className="flex items-center gap-3 shrink-0">
						<Button
							variant="ghost"
							className="h-9 px-4 text-[13px] cursor-pointer text-zinc-600"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							className={cn(
								"h-9 px-5 text-[13px] font-medium transition-colors",
								(taskOnly || (entityName.trim() && !!selectedDestination)) && (dateMode !== "remap" || !!remapDueDate)
									? "bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer"
									: "bg-zinc-200 text-zinc-400 pointer-events-none"
							)}
							disabled={(!taskOnly && (!entityName.trim() || !selectedDestination)) || (dateMode === "remap" && !remapDueDate)}
							onClick={handleUse}
						>
							Use Template
						</Button>
					</div>
				</div>
		</>
	);

	if (embedded) {
		return (
			<div className="flex flex-col w-full h-full bg-white">
				{content}
			</div>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="sm:max-w-[640px] w-[92vw] max-h-[88vh] flex flex-col p-0 gap-0 border-0 rounded-xl overflow-hidden shadow-2xl bg-white"
			>
				{content}
			</DialogContent>
		</Dialog>
	);
}
