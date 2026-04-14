"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
	Activity,
	Briefcase,
	Folder,
	LayoutDashboard,
	Layers,
	List as ListIcon,
	User,
	Wand2,
	ArrowLeft,
	Search,
	Star,
	Tag,
	X,
	Globe,
	Trash2,
	Pencil,
	Upload,
	ChevronDown,
	CheckCircle2,
	AlertCircle,
	Loader2,
} from "lucide-react";
import * as React from "react";
import { TagsModal } from "@/entities/task/components/TagsModal";
import { trpc } from "@/lib/trpc"; // Trigger Next.js reload
import { storageUtils } from "@/utils/storage/storageUtils";
import { useToast } from "@/hooks/useToast";
import { TemplateEntityType } from "@agentflox/database/src/generated/prisma/client";
import { format } from "date-fns";
import { UseTemplateModal } from "./UseTemplateModal";
import { UserProfileHoverCard } from "@/entities/users/components/UserProfileHoverCard";

// ─── Types ───────────────────────────────────────────────────────────────────
type Section = "featured" | "workspace" | "global" | "builtin";

type Props = {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	disableFeatured?: boolean;
	workspaceId?: string;
	targetTaskId?: string;
	targetContext?: {
		workspaceId?: string;
		spaceId?: string;
		projectId?: string;
		teamId?: string;
		folderId?: string;
		listId?: string;
	};
	initialTemplate?: any | null;
	initialView?: "detail" | "useTemplate";
	initialEntityType?: string;
};

// ─── Entity type config ───────────────────────────────────────────────────────
const ENTITY_TYPES: { id: string; label: string }[] = [
	{ id: TemplateEntityType.SPACE, label: "Space" },
	{ id: "PROJECT", label: "Project" },
	{ id: TemplateEntityType.FOLDER, label: "Folder" },
	{ id: TemplateEntityType.LIST, label: "List" },
	{ id: "LISTING", label: "Listing" },
	{ id: TemplateEntityType.TASK, label: "Task" },
	{ id: TemplateEntityType.DOC, label: "Doc" },
	{ id: TemplateEntityType.VIEW, label: "View" },
	{ id: TemplateEntityType.AGENT, label: "Agent" },
	{ id: TemplateEntityType.WORKFORCE, label: "Workforce" },
	{ id: TemplateEntityType.PROPOSAL, label: "Proposal" },
];

// ─── Helper: entity icon ─────────────────────────────────────────────────────
function EntityIcon({ type, className }: { type: TemplateEntityType; className?: string }) {
	const base = cn("size-4", className);
	switch (type) {
		case TemplateEntityType.LIST: return <ListIcon className={cn(base, "text-amber-500")} />;
		case TemplateEntityType.FOLDER: return <Folder className={cn(base, "text-pink-500")} />;
		case TemplateEntityType.SPACE: return <Layers className={cn(base, "text-blue-500")} />;
		case TemplateEntityType.AGENT: return <Wand2 className={cn(base, "text-purple-500")} />;
		case TemplateEntityType.WORKFORCE: return <User className={cn(base, "text-indigo-500")} />;
		default: return <LayoutDashboard className={cn(base, "text-slate-400")} />;
	}
}

// ─── Template card ───────────────────────────────────────────────────────────
function TemplateCard({ template, onClick }: { template: any; onClick?: () => void }) {
	return (
		<Card onClick={onClick} className="overflow-hidden border border-muted/40 shadow-none hover:shadow-md transition-all rounded-lg group cursor-pointer hover:border-indigo-200">
			<div className="relative aspect-[16/9] w-full bg-gradient-to-br from-slate-50 to-slate-100 border-b border-muted/40">
				<div className="absolute inset-0 p-4 pt-6 flex items-center justify-center opacity-50">
					<EntityIcon type={template.entityType} className="size-10 opacity-30" />
				</div>
				{template.isFeatured && (
					<div className="absolute top-2 left-2 flex size-6 items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 z-10">
						<Star className="size-3 text-amber-500 fill-amber-500" />
					</div>
				)}
				{template.complexity && (
					<div className="absolute top-2 right-2 z-10">
						<Badge variant="secondary" className={cn(
							"text-[10px] font-semibold px-1.5 py-0.5 border-0",
							template.complexity === "BEGINNER" && "bg-emerald-100 text-emerald-700",
							template.complexity === "INTERMEDIATE" && "bg-amber-100 text-amber-700",
							template.complexity === "ADVANCED" && "bg-rose-100 text-rose-700",
						)}>
							{template.complexity.charAt(0) + template.complexity.slice(1).toLowerCase()}
						</Badge>
					</div>
				)}
			</div>
			<div className="p-3.5 bg-white">
				<div className="flex items-center gap-2">
					<EntityIcon type={template.entityType} />
					<span className="text-[13px] font-medium text-slate-700 truncate">{template.name}</span>
				</div>
				{template.description && (
					<p className="mt-1 text-[12px] text-slate-400 line-clamp-1">{template.description}</p>
				)}
				{template.category && (
					<span className="mt-1.5 inline-block text-[11px] text-slate-400">{template.category}</span>
				)}
			</div>
		</Card>
	);
}

// ─── Template section ─────────────────────────────────────────────────────────
function TemplateSection({
	id,
	title,
	templates,
	isLoading,
	filters,
	workspaceId,
	onSelectTemplate,
	groupByType = false,
}: {
	id: Section;
	title: string;
	templates: any[];
	isLoading: boolean;
	filters: {
		search: string;
		entityTypes: Set<string>;
		tagsList: string[];
		createdByIds: Set<string>;
		categories: Set<string>;
	};
	workspaceId?: string;
	onSelectTemplate?: (template: any) => void;
	groupByType?: boolean;
}) {
	const titleClassName = id === "workspace"
		? "text-[22px] font-semibold text-slate-900"
		: "text-[17px] font-semibold text-slate-900";

	const renderSectionHeader = () => (
		<div className="flex items-center gap-3">
			<h2 className={titleClassName}>{title}</h2>
			<div className="h-px flex-1 bg-slate-200" />
		</div>
	);

	// Apply client-side filter by entity type (already filtered server side for tags/category/search,
	// but entity type is a separate checkbox state)
	const filtered = React.useMemo(() => {
		if (filters.entityTypes.size === 0) return templates;
		return templates.filter((t) => filters.entityTypes.has(t.entityType));
	}, [templates, filters.entityTypes]);

	if (isLoading) {
		return (
			<section id={`section-${id}`} className="space-y-4 scroll-mt-20">
				{renderSectionHeader()}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
					{Array.from({ length: 6 }).map((_, i) => (
						<Card key={`skeleton-${id}-${i}`} className="overflow-hidden border border-muted/40 rounded-lg shadow-none">
							<div className="aspect-[16/9] w-full bg-slate-100 animate-pulse border-b border-muted/40" />
							<div className="p-3.5 bg-white space-y-2.5">
								<div className="h-3.5 w-2/3 rounded bg-slate-100 animate-pulse" />
								<div className="h-3 w-1/2 rounded bg-slate-100 animate-pulse" />
							</div>
						</Card>
					))}
				</div>
			</section>
		);
	}

	if (!filtered.length) {
		return (
			<section id={`section-${id}`} className="space-y-4 scroll-mt-20">
				{renderSectionHeader()}
				<p className="text-[13px] text-slate-400">No templates found.</p>
			</section>
		);
	}

	if (groupByType) {
		const typeLabelMap = new Map(ENTITY_TYPES.map((t) => [t.id, t.label]));
		const grouped = new Map<string, any[]>();
		for (const t of filtered) {
			const typeKey = String(t.entityType || "OTHER");
			if (!grouped.has(typeKey)) grouped.set(typeKey, []);
			grouped.get(typeKey)!.push(t);
		}

		const orderedTypeKeys = [
			...ENTITY_TYPES.map((t) => t.id).filter((id) => grouped.has(id)),
			...Array.from(grouped.keys()).filter((id) => !ENTITY_TYPES.some((t) => t.id === id)),
		];

		return (
			<section id={`section-${id}`} className="space-y-5 scroll-mt-20">
				{renderSectionHeader()}
				{orderedTypeKeys.map((typeKey) => (
					<div key={typeKey} className="space-y-3">
						<h3 className="text-[18px] font-semibold text-slate-700">
							{typeLabelMap.get(typeKey) ?? typeKey}
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
							{(grouped.get(typeKey) ?? []).map((t) => (
								<TemplateCard key={t.id} template={t} onClick={() => onSelectTemplate?.(t)} />
							))}
						</div>
					</div>
				))}
			</section>
		);
	}

	return (
		<section id={`section-${id}`} className="space-y-4 scroll-mt-20">
			{renderSectionHeader()}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
				{filtered.map((t) => (
					<TemplateCard key={t.id} template={t} onClick={() => onSelectTemplate?.(t)} />
				))}
			</div>
		</section>
	);
}

// ─── Audit event badge event label ────────────────────────────────────────────
const EVENT_LABELS: Record<string, string> = {
	CREATED: "Created",
	UPDATED: "Updated",
	DELETED: "Deleted",
	ARCHIVED: "Archived",
	RESTORED: "Restored",
	PUBLISHED: "Published",
	UNPUBLISHED: "Unpublished",
	APPLIED: "Applied",
	MERGED: "Merged",
	SHARED: "Shared",
	UNSHARED: "Unshared",
	VERSION_CREATED: "Version Created",
	VERSION_RESTORED: "Version Restored",
};

// ─── Main component ───────────────────────────────────────────────────────────
export function TemplateCenterModal({
	open = true,
	onOpenChange,
	disableFeatured,
	workspaceId,
	targetTaskId,
	targetContext,
	initialTemplate,
	initialView = "detail",
	initialEntityType,
}: Props) {
	// UI state
	const [view, setView] = React.useState<"templates" | "auditLog" | "detail" | "useTemplate">("templates");
	const [selectedTemplate, setSelectedTemplate] = React.useState<any | null>(null);

	const [selectedTypes, setSelectedTypes] = React.useState<Set<string>>(new Set());
	const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
	const [selectedUsers, setSelectedUsers] = React.useState<Set<string>>(new Set());
	const [selectedCategories, setSelectedCategories] = React.useState<Set<string>>(new Set());
	const [search, setSearch] = React.useState("");
	const [debouncedSearch, setDebouncedSearch] = React.useState("");
	const [auditSearch, setAuditSearch] = React.useState("");
	const [userSearch, setUserSearch] = React.useState("");
	const [categorySearch, setCategorySearch] = React.useState("");
	const scrollRef = React.useRef<HTMLDivElement>(null);

	// Debounce search
	React.useEffect(() => {
		const t = setTimeout(() => setDebouncedSearch(search), 300);
		return () => clearTimeout(t);
	}, [search]);

	const getAutoTypeFilters = React.useCallback((entityType?: string | null): string[] => {
		if (!entityType) return [];
		const type = entityType.toUpperCase();
		if (type === "SPACE" || type === "PROJECT") return [type, "FOLDER", "LIST"];
		return [type];
	}, []);

	React.useEffect(() => {
		if (!open) return;
		if (initialTemplate) {
			setSelectedTemplate(initialTemplate);
			setView(initialView);
			const auto = getAutoTypeFilters(initialTemplate.entityType);
			if (auto.length) setSelectedTypes(new Set(auto));
			return;
		}
		setSelectedTemplate(null);
		setView("templates");
		const auto = getAutoTypeFilters(initialEntityType);
		if (auto.length) setSelectedTypes(new Set(auto));
	}, [open, initialTemplate, initialView, initialEntityType, getAutoTypeFilters]);

	// ── Toggles ──
	const toggleType = (id: string) =>
		setSelectedTypes((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id); else next.add(id);
			return next;
		});

	const toggleUser = (id: string) =>
		setSelectedUsers((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id); else next.add(id);
			return next;
		});

	const toggleCategory = (c: string) =>
		setSelectedCategories((prev) => {
			const next = new Set(prev);
			if (next.has(c)) next.delete(c); else next.add(c);
			return next;
		});

	// ── Shared query args ──
	const baseQueryArgs = {
		workspaceId,
		tags: selectedTags.length > 0 ? selectedTags : undefined,
		createdByIds: selectedUsers.size > 0 ? Array.from(selectedUsers) : undefined,
		categories: selectedCategories.size > 0 ? Array.from(selectedCategories) : undefined,
		search: debouncedSearch || undefined,
		pageSize: 50,
	};

	// ── Data queries ──
	const countsQuery = trpc.template.counts.useQuery({ workspaceId });

	const featuredQuery = trpc.template.list.useQuery(
		{ ...baseQueryArgs, scope: "featured" },
		{ enabled: true }
	);

	const workspaceQuery = trpc.template.list.useQuery(
		{ ...baseQueryArgs, scope: "workspace" },
		{ enabled: !!workspaceId }
	);

	const globalQuery = trpc.template.list.useQuery(
		{ ...baseQueryArgs, scope: "global" }
	);

	const builtinQuery = trpc.template.list.useQuery(
		{ ...baseQueryArgs, scope: "builtin" }
	);

	const tagsQuery = trpc.template.tags.useQuery({ workspaceId });

	const usersQuery = trpc.template.createdByUsers.useQuery(
		{ workspaceId: workspaceId! },
		{ enabled: !!workspaceId }
	);

	const auditQuery = trpc.template.auditLogs.useQuery({
		workspaceId,
		search: auditSearch || undefined,
		pageSize: 50,
	});
	const applyTaskTemplateMutation = trpc.template.applyToTask.useMutation();
	const createFromTemplateMutation = trpc.template.createEntityFromTemplate.useMutation();
	const updateTemplateMutation = trpc.template.update.useMutation();
	const deleteTemplateMutation = trpc.template.delete.useMutation();
	const { toast } = useToast();
	const fileInputRef = React.useRef<HTMLInputElement>(null);
	const [isEditMode, setIsEditMode] = React.useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
	const [editingName, setEditingName] = React.useState("");
	const [editingDescription, setEditingDescription] = React.useState("");
	const [editingTags, setEditingTags] = React.useState<string[]>([]);
	const [editingCoverImage, setEditingCoverImage] = React.useState<string | null>(null);

	const resolveShareWithValue = React.useCallback((tpl: any): "everyone" | "members" | "admins" | "me" | "custom" => {
		if (!tpl) return "me";
		if (tpl.visibility === "EVERYONE") return "everyone";
		if (tpl.visibility === "MEMBERS") return "members";
		if (tpl.visibility === "ADMINS") return "admins";
		if (tpl.visibility === "PRIVATE") {
			if ((tpl.shareUserIds?.length ?? 0) > 0 || (tpl.shareTeamIds?.length ?? 0) > 0) return "custom";
			return "me";
		}
		return "me";
	}, []);
	const [shareWithValue, setShareWithValue] = React.useState<"everyone" | "members" | "admins" | "me" | "custom">("me");
	const [publicSharing, setPublicSharing] = React.useState(false);
	const [sharePopoverOpen, setSharePopoverOpen] = React.useState(false);

	// ── Select Template ──
	const handleSelectTemplate = (t: any) => {
		setSelectedTemplate(t);
		setView("detail");
	};

	React.useEffect(() => {
		if (!selectedTemplate) return;
		setEditingName(selectedTemplate.name ?? "");
		setEditingDescription(selectedTemplate.description ?? "");
		setEditingTags(Array.isArray(selectedTemplate.tags) ? selectedTemplate.tags : []);
		setEditingCoverImage(selectedTemplate.coverImage ?? null);
		setShareWithValue(resolveShareWithValue(selectedTemplate));
		setPublicSharing(!!selectedTemplate.isPublic);
		setIsEditMode(false);
	}, [selectedTemplate, resolveShareWithValue]);

	// ── Scroll to section ──
	const scrollToSection = (sectionId: string) => {
		const el = document.getElementById(`section-${sectionId}`);
		if (el && scrollRef.current) {
			el.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	};

	const counts = countsQuery.data;
	const allTags = (tagsQuery.data ?? []).map((t) => `${t}|#94a3b8`);
	const allUsers = usersQuery.data ?? [];
	const filteredUsers = allUsers.filter((u) =>
		u.name?.toLowerCase().includes(userSearch.toLowerCase())
	);

	// Unique categories across all loaded templates
	const allCategories = React.useMemo(() => {
		const cats = new Set<string>();
		for (const q of [featuredQuery, workspaceQuery, globalQuery, builtinQuery]) {
			for (const t of q.data?.items ?? []) {
				if (t.category) cats.add(t.category);
			}
		}
		return Array.from(cats).sort();
	}, [featuredQuery.data, workspaceQuery.data, globalQuery.data, builtinQuery.data]);

	const filteredCategories = allCategories.filter((c) =>
		c.toLowerCase().includes(categorySearch.toLowerCase())
	);

	const filters = { search: debouncedSearch, entityTypes: selectedTypes, tagsList: selectedTags, createdByIds: selectedUsers, categories: selectedCategories };
	const featuredItems = featuredQuery.data?.items ?? [];
	const workspaceItems = workspaceQuery.data?.items ?? [];
	const globalItems = globalQuery.data?.items ?? [];
	const builtinItems = builtinQuery.data?.items ?? [];
	const applyEntityFilter = (items: any[]) =>
		selectedTypes.size === 0 ? items : items.filter((t) => selectedTypes.has(String(t.entityType)));
	const filteredFeatured = applyEntityFilter(featuredItems);
	const filteredWorkspace = applyEntityFilter(workspaceItems);
	const filteredGlobal = applyEntityFilter(globalItems);
	const filteredBuiltin = applyEntityFilter(builtinItems);
	const canShowFeatured = featuredQuery.isLoading || filteredFeatured.length > 0;
	const canShowWorkspace = workspaceQuery.isLoading || filteredWorkspace.length > 0;
	const canShowGlobal = globalQuery.isLoading || filteredGlobal.length > 0;
	const canShowBuiltin = builtinQuery.isLoading || filteredBuiltin.length > 0;

	const handleUploadCoverImage = async (file?: File) => {
		if (!file || !selectedTemplate) return;
		const path = storageUtils.generateUniquePath(file.name, `templates/${selectedTemplate.id}/cover`);
		const result = await storageUtils.upload({
			file,
			bucket: "attachments",
			path,
			upsert: true,
		});
		if (!result.success || !result.url) {
			toast({ title: "Upload failed", description: result.error ?? "Could not upload cover image", variant: "destructive" });
			return;
		}
		setEditingCoverImage(result.url);
	};

	const handleSaveTemplate = async () => {
		if (!selectedTemplate) return;
		try {
			const updated = await updateTemplateMutation.mutateAsync({
				id: selectedTemplate.id,
				name: editingName.trim(),
				description: editingDescription.trim() || undefined,
				tags: editingTags,
				coverImage: editingCoverImage ?? null,
			});
			setSelectedTemplate(updated);
			setIsEditMode(false);
			await Promise.all([
				featuredQuery.refetch(),
				workspaceQuery.refetch(),
				globalQuery.refetch(),
				builtinQuery.refetch(),
			]);
			toast({ title: "Template updated" });
		} catch (e: any) {
			toast({ title: "Update failed", description: e?.message ?? "Could not update template", variant: "destructive" });
		}
	};

	const handleDeleteTemplate = async () => {
		if (!selectedTemplate) return;
		try {
			await deleteTemplateMutation.mutateAsync({ id: selectedTemplate.id });
			setShowDeleteConfirm(false);
			setSelectedTemplate(null);
			setView("templates");
			await Promise.all([
				featuredQuery.refetch(),
				workspaceQuery.refetch(),
				globalQuery.refetch(),
				builtinQuery.refetch(),
				countsQuery.refetch(),
			]);
			toast({ title: "Template deleted" });
		} catch (e: any) {
			toast({ title: "Delete failed", description: e?.message ?? "Could not delete template", variant: "destructive" });
		}
	};

	const updateSharing = async (nextShareWith: "everyone" | "members" | "admins" | "me" | "custom", nextPublic: boolean) => {
		if (!selectedTemplate) return;
		setShareWithValue(nextShareWith);
		setPublicSharing(nextPublic);
		try {
			const updated = await updateTemplateMutation.mutateAsync({
				id: selectedTemplate.id,
				shareWith: nextShareWith,
				publicSharing: nextPublic,
				shares: [],
			});
			setSelectedTemplate(updated);
		} catch (e: any) {
			toast({ title: "Share update failed", description: e?.message ?? "Could not update sharing", variant: "destructive" });
		}
	};

	const copyTemplateLink = async () => {
		const url = `${window.location.origin}${window.location.pathname}?templateId=${selectedTemplate?.id ?? ""}`;
		await navigator.clipboard.writeText(url);
		toast({ title: "Link copied" });
	};

	const getAuditLocationLabel = (log: any) => {
		const sourceEntityName = log?.metadata?.sourceEntityName;
		if (sourceEntityName) return String(sourceEntityName);
		if (log?.targetEntityName) return String(log.targetEntityName);
		const destinationKind = log?.metadata?.destination?.kind;
		if (!destinationKind) return "–";
		const raw = String(destinationKind);
		return raw.charAt(0).toUpperCase() + raw.slice(1);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="flex sm:max-w-[1200px] h-[85vh] w-[95vw] overflow-hidden p-0 gap-0 border-0"
				showCloseButton={false}
			>
				<DialogTitle className="sr-only">Global Templates</DialogTitle>
				<DialogDescription className="sr-only">Browse and select templates for your workspace.</DialogDescription>

				{view === "templates" ? (
					<>
						{/* Left Sidebar */}
						<div className="flex w-64 flex-col border-r bg-background shrink-0">
							<div className="flex items-center gap-2 px-6 py-5">
								<Wand2 className="size-5 text-indigo-500" />
								<span className="text-[15px] font-semibold">Global Templates</span>
							</div>

							<div className="flex-1 overflow-y-auto px-4 pb-4">
								<div className="space-y-0.5">
									{/* Featured */}
									<button
										disabled={!featuredQuery.isLoading && filteredFeatured.length === 0}
										onClick={() => scrollToSection("featured")}
										className={cn(
											"flex w-full items-center justify-between rounded-md px-3 py-2 text-sm cursor-pointer",
											(!featuredQuery.isLoading && filteredFeatured.length === 0) ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50"
										)}
									>
										<span className="flex items-center gap-2">
											<Star className="size-4 text-amber-500 fill-amber-500" />
											Featured
										</span>
										<span className="text-xs text-muted-foreground">{filteredFeatured.length}</span>
									</button>

									{/* Workspace */}
									<button
										disabled={!workspaceQuery.isLoading && filteredWorkspace.length === 0}
										onClick={() => scrollToSection("workspace")}
										className={cn(
											"flex w-full items-center justify-between rounded-md px-3 py-2 text-sm cursor-pointer",
											(!workspaceQuery.isLoading && filteredWorkspace.length === 0) ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50"
										)}
									>
										<span className="flex items-center gap-2">
											<div className="flex size-4 items-center justify-center rounded-sm bg-[#00A884] text-[10px] font-bold text-white">W</div>
											Workspace Templates
										</span>
										<span className="text-xs text-muted-foreground">{filteredWorkspace.length}</span>
									</button>

									{/* Global */}
									<button
										disabled={!globalQuery.isLoading && filteredGlobal.length === 0}
										onClick={() => scrollToSection("global")}
										className={cn(
											"flex w-full items-center justify-between rounded-md px-3 py-2 text-sm cursor-pointer",
											(!globalQuery.isLoading && filteredGlobal.length === 0) ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50"
										)}
									>
										<span className="flex items-center gap-2">
											<Globe className="size-4 text-muted-foreground" />
											Global Templates
										</span>
										<span className="text-xs text-muted-foreground">{filteredGlobal.length}</span>
									</button>

									{/* Built-in */}
									<button
										disabled={!builtinQuery.isLoading && filteredBuiltin.length === 0}
										onClick={() => scrollToSection("builtin")}
										className={cn(
											"flex w-full items-center justify-between rounded-md px-3 py-2 text-sm cursor-pointer",
											(!builtinQuery.isLoading && filteredBuiltin.length === 0) ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50"
										)}
									>
										<span className="flex items-center gap-2">
											<LayoutDashboard className="size-4 text-muted-foreground" />
											Built-in Templates
										</span>
										<span className="text-xs text-muted-foreground">{filteredBuiltin.length}</span>
									</button>
								</div>
								<div className="mt-4 border-t border-slate-200" />

								{/* Template Types */}
								<div className="mt-8 mb-4">
									<h3 className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
										Template Types
									</h3>
									<div className="space-y-2.5 px-3">
										{ENTITY_TYPES.map((type) => (
											<div key={type.id} className="flex items-center space-x-2">
												<Checkbox
													id={`type-${type.id}`}
													checked={selectedTypes.has(type.id)}
													onCheckedChange={() => toggleType(type.id)}
													className="rounded-[4px] border-muted-foreground/30 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 cursor-pointer"
												/>
												<label htmlFor={`type-${type.id}`} className="text-[13.5px] font-normal leading-none text-slate-700 cursor-pointer">
													{type.label}
												</label>
											</div>
										))}
									</div>
								</div>
							</div>

							<div className="p-4 border-t border-slate-100 bg-slate-50/30">
								<button
									onClick={() => setView("auditLog")}
									className="group flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-[13px] font-medium text-slate-600 hover:text-slate-900 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
								>
									<Activity className="size-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
									View Audit Log
								</button>
							</div>
						</div>

						{/* Right Content */}
						<div className="flex flex-1 flex-col bg-background relative min-w-0">
							{/* Top header bar */}
							<div className="h-[36px] border-b border-slate-100 shrink-0 w-full flex items-center justify-end px-3">
								<button
									onClick={() => onOpenChange?.(false)}
									className="size-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
								>
									<X className="size-4" />
								</button>
							</div>

							{/* Filter bar */}
							<div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 bg-white/50 backdrop-blur-sm shrink-0 w-full">
								<div className="flex-1 max-w-lg">
									<div className="flex w-full overflow-hidden h-10 items-center rounded-md border border-slate-200 bg-white px-3 shadow-sm transition-colors focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500">
										<Search className="h-4 w-4 shrink-0 text-slate-400" />
										<Input
											value={search}
											onChange={(e) => setSearch(e.target.value)}
											placeholder="Search templates…"
											className="h-full bg-transparent pl-2 pr-0 !border-0 focus:outline-none focus:ring-0 focus-visible:ring-0 shadow-none text-[14px] font-medium placeholder:text-slate-400 placeholder:font-normal"
										/>
									</div>
								</div>
								<div className="flex items-center gap-2.5">
									{/* Category */}
									<Popover>
										<PopoverTrigger asChild>
											<div className="relative">
												<Button variant="outline" size="sm" className="h-10 rounded-md border-slate-200 bg-white shadow-sm px-3 text-slate-600 hover:bg-slate-50 cursor-pointer">
													<Briefcase className="mr-2 size-4 text-slate-400" />
													Category
												</Button>
												{selectedCategories.size > 0 && (
													<div className="absolute top-[-6px] right-[-6px] bg-zinc-800 text-white text-[10px] font-bold h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full shadow-sm z-10 border-[1.5px] border-white leading-none">
														{selectedCategories.size}
													</div>
												)}
											</div>
										</PopoverTrigger>
										<PopoverContent align="start" className="w-[280px] p-0 shadow-lg border-slate-200 rounded-xl overflow-hidden bg-white" sideOffset={8}>
											<div className="p-3 pb-1">
												<Input
													placeholder="Search…"
													value={categorySearch}
													onChange={(e) => setCategorySearch(e.target.value)}
													className="h-[34px] w-full bg-white border-slate-300 focus-visible:ring-1 focus-visible:ring-slate-400 rounded-[5px] text-[14px] shadow-none"
												/>
											</div>
											<div className="flex justify-end px-3 py-1.5">
												<button
													onClick={() => setSelectedCategories(new Set(allCategories))}
													className="text-[12.5px] font-medium text-slate-600 hover:text-slate-900 transition-colors"
												>
													Select all
												</button>
											</div>
											<div onWheel={(e) => e.stopPropagation()} className="max-h-[320px] overflow-y-auto pb-3 px-1.5">
												{filteredCategories.length === 0 ? (
													<p className="text-[13px] text-slate-400 px-3 py-2">No categories found.</p>
												) : filteredCategories.map((cat) => (
													<div
														key={cat}
														onClick={() => toggleCategory(cat)}
														className="flex items-center justify-between w-full rounded-md px-2.5 py-2.5 text-[14px] font-normal hover:bg-slate-50 cursor-pointer text-slate-700 transition-colors leading-none"
													>
														<label htmlFor={`cat-${cat}`} className="flex-1 cursor-pointer">{cat}</label>
														<Checkbox
															id={`cat-${cat}`}
															checked={selectedCategories.has(cat)}
															onCheckedChange={() => toggleCategory(cat)}
															className="rounded-[4px] border-slate-400 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 h-4 w-4 shrink-0 cursor-pointer"
														/>
													</div>
												))}
											</div>
										</PopoverContent>
									</Popover>

									{/* Tags */}
									<TagsModal
										tags={selectedTags}
										onChange={setSelectedTags}
										allAvailableTags={allTags}
										trigger={
											<div className="relative">
												<Button variant="outline" size="sm" className="h-10 rounded-md border-slate-200 bg-white shadow-sm px-3 text-slate-600 hover:bg-slate-50 cursor-pointer w-full">
													<Tag className="mr-2 size-4 text-slate-400" />
													Tags
												</Button>
												{selectedTags.length > 0 && (
													<div className="absolute top-[-6px] right-[-6px] bg-zinc-800 text-white text-[10px] font-bold h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full shadow-sm z-10 border-[1.5px] border-white leading-none">
														{selectedTags.length}
													</div>
												)}
											</div>
										}
									/>

									{/* Created by */}
									<Popover>
										<PopoverTrigger asChild>
											<div className="relative">
												<Button variant="outline" size="sm" className="h-10 rounded-md border-slate-200 bg-white shadow-sm px-3 text-slate-600 hover:bg-slate-50 cursor-pointer w-full">
													<User className="mr-2 size-4 text-slate-400" />
													Created by
												</Button>
												{selectedUsers.size > 0 && (
													<div className="absolute top-[-6px] right-[-6px] bg-zinc-800 text-white text-[10px] font-bold h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full shadow-sm z-10 border-[1.5px] border-white leading-none">
														{selectedUsers.size}
													</div>
												)}
											</div>
										</PopoverTrigger>
										<PopoverContent align="start" className="w-[260px] p-0 shadow-lg border-slate-200 rounded-xl overflow-hidden" sideOffset={8}>
											<div className="p-3 pb-1">
												<div className="flex w-full overflow-hidden h-[34px] items-center rounded-md border border-slate-300 bg-white px-2 shadow-sm focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500">
													<Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
													<Input
														placeholder="Search users…"
														value={userSearch}
														onChange={(e) => setUserSearch(e.target.value)}
														className="h-full bg-transparent pl-2 pr-0 !border-0 focus:outline-none focus:ring-0 focus-visible:ring-0 shadow-none text-[13px]"
													/>
												</div>
											</div>
											<div onWheel={(e) => e.stopPropagation()} className="max-h-[250px] overflow-y-auto p-2 bg-white space-y-0.5">
												{filteredUsers.length === 0 ? (
													<p className="text-[13px] text-slate-400 px-2 py-2">No users found.</p>
												) : filteredUsers.map((user) => (
													<div
														key={user.id}
														onClick={() => toggleUser(user.id)}
														className="flex items-center justify-between w-full rounded-md px-2.5 py-2 text-[13px] font-medium hover:bg-slate-50 cursor-pointer text-slate-700 transition-colors"
													>
														<label htmlFor={`user-${user.id}`} className="flex flex-1 items-center gap-2.5 cursor-pointer">
															{user.image ? (
																<img src={user.image} alt={user.name ?? ""} className="h-6 w-6 rounded-full object-cover shrink-0 shadow-sm" />
															) : (
																<div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white font-semibold shrink-0 shadow-sm">
																	{(user.name ?? "?").slice(0, 2).toUpperCase()}
																</div>
															)}
															<span className="truncate">{user.name ?? "Unknown"}</span>
														</label>
														<Checkbox
															id={`user-${user.id}`}
															checked={selectedUsers.has(user.id)}
															onCheckedChange={() => toggleUser(user.id)}
															className="rounded-[4px] border-slate-400 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 h-4 w-4 shrink-0 cursor-pointer ml-3"
														/>
													</div>
												))}
											</div>
										</PopoverContent>
									</Popover>
								</div>
							</div>

							{/* Scrollable content */}
							<div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
								<div className="max-w-[1000px] mx-auto space-y-10 pb-10">
									{canShowFeatured && (
										<TemplateSection
											id="featured"
											title="Featured Templates"
											templates={featuredItems}
											isLoading={featuredQuery.isLoading}
											filters={filters}
											onSelectTemplate={handleSelectTemplate}
										/>
									)}

									{canShowWorkspace && (
										<TemplateSection
											id="workspace"
											title="Workspace Templates"
											templates={workspaceItems}
											isLoading={workspaceQuery.isLoading}
											filters={filters}
											workspaceId={workspaceId}
											onSelectTemplate={handleSelectTemplate}
											groupByType={true}
										/>
									)}

									{canShowGlobal && (
										<TemplateSection
											id="global"
											title="Global Templates"
											templates={globalItems}
											isLoading={globalQuery.isLoading}
											filters={filters}
											onSelectTemplate={handleSelectTemplate}
										/>
									)}

									{canShowBuiltin && (
										<TemplateSection
											id="builtin"
											title="Built-in Templates"
											templates={builtinItems}
											isLoading={builtinQuery.isLoading}
											filters={filters}
											onSelectTemplate={handleSelectTemplate}
										/>
									)}
								</div>
							</div>
						</div>
					</>
				) : view === "detail" && selectedTemplate ? (
					// ── Template Detail view ────────────────────────────────────
					<div className="flex flex-col w-full h-full bg-slate-50/50 relative">
						<div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-white sticky top-0 z-20 shrink-0">
							<button
								onClick={() => setView("templates")}
								className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
							>
								<ArrowLeft className="size-3.5" />
								Back
							</button>
							<div className="text-[14px] font-semibold text-slate-800">Template Center</div>
							<button
								onClick={() => onOpenChange?.(false)}
								className="size-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
							>
								<X className="size-4" />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto w-full px-8 py-4 bg-slate-50">
							<div className="mx-auto w-full">
								<div className="flex items-start justify-between mb-7">
									<div className="flex items-center gap-4 flex-1 min-w-0">
										<div className="size-16 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
											<EntityIcon type={selectedTemplate.entityType} className="size-8" />
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 w-full">
												{isEditMode ? (
													<Input
														value={editingName}
														onChange={(e) => setEditingName(e.target.value)}
														className="h-8 w-full max-w-[640px] flex-1 min-w-[260px] text-[14px] font-normal border-slate-300 bg-white focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-100"
													/>
												) : (
													<h1 className="text-2xl font-bold text-slate-800">{selectedTemplate.name}</h1>
												)}
												{!isEditMode && (
													<Popover>
														<PopoverTrigger asChild>
															<button className="size-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
																<span className="text-xl leading-none">⋯</span>
															</button>
														</PopoverTrigger>
														<PopoverContent align="start" className="w-44 p-1.5">
															<button
																onClick={() => setIsEditMode(true)}
																className="w-full text-left text-sm px-2.5 py-2 rounded-md hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
															>
																<Pencil className="size-3.5" /> Edit
															</button>
															<button
																onClick={() => setShowDeleteConfirm(true)}
																className="w-full text-left text-sm px-2.5 py-2 rounded-md hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer"
															>
																<Trash2 className="size-3.5" /> Delete
															</button>
														</PopoverContent>
													</Popover>
												)}
												{isEditMode && (
													<>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => setIsEditMode(false)}
															className="h-10 px-5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl"
														>
															Cancel
														</Button>
														<Button
															size="sm"
															onClick={handleSaveTemplate}
															className="h-10 px-5 bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 rounded-xl shadow-none"
														>
															Save
														</Button>
													</>
												)}
											</div>
											<div className="flex items-center gap-2 mt-2">
												<span className="text-[13px] text-slate-500">Tags:</span>
												{(isEditMode ? editingTags : selectedTemplate.tags)?.length > 0 ? (
													<div className="flex flex-wrap gap-1.5">
														{(isEditMode ? editingTags : selectedTemplate.tags).map((tag: any, idx: number) => (
															<Badge key={idx} variant="outline" className="text-[11px] px-1.5 py-0 h-5 font-normal border-slate-200 text-slate-600 bg-white">
																{typeof tag === "string" ? tag : tag?.name}
															</Badge>
														))}
													</div>
												) : (
													<button className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer pt-1">
														<Tag className="size-3.5" />
													</button>
												)}
												{isEditMode && (
													<TagsModal
														tags={editingTags}
														onChange={setEditingTags}
														allAvailableTags={allTags}
														trigger={<button className="text-xs text-indigo-600 hover:text-indigo-700">Edit tags</button>}
													/>
												)}
											</div>
										</div>
									</div>

									<div className="flex items-center gap-2.5">
										{!isEditMode && (
											<>
												<Button
													variant="outline"
													size="sm"
													onClick={() => void copyTemplateLink()}
													className="h-8.5 px-3.5 border-slate-200 text-slate-600 shadow-sm cursor-pointer"
												>
													<Globe className="mr-2 size-3.5 text-slate-400" />
													Copy link
												</Button>
												<Popover open={sharePopoverOpen} onOpenChange={setSharePopoverOpen}>
													<PopoverTrigger asChild>
														<Button variant="outline" size="sm" className="h-8.5 px-3.5 border-slate-200 text-slate-600 shadow-sm cursor-pointer">
															Share
															<ChevronDown className="ml-1.5 size-3.5 text-slate-400" />
														</Button>
													</PopoverTrigger>
													<PopoverContent align="end" className="w-[280px] p-0">
														<div className="px-4 py-3 text-sm font-medium text-slate-500">Share with</div>
														<div className="px-2 pb-2 space-y-1">
															{[
																["everyone", "Everyone"],
																["members", "Members and admins"],
																["admins", "Admins only"],
																["me", "Only me"],
																["custom", "Custom"],
															].map(([id, label]) => (
																<button
																	key={id}
																	onClick={() => void updateSharing(id as any, publicSharing)}
																	className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 text-sm flex items-center justify-between"
																>
																	{label}
																	{shareWithValue === id && <span className="text-indigo-600">✓</span>}
																</button>
															))}
														</div>
														<div className="border-t px-4 py-3 flex items-center justify-between">
															<span className="text-sm text-slate-600">Public sharing</span>
															<Switch checked={publicSharing} onCheckedChange={(v) => void updateSharing(shareWithValue, v)} />
														</div>
														<div className="border-t px-4 py-3 flex items-center justify-between">
															<span className="text-sm text-slate-600">Private link</span>
															<Button variant="outline" size="sm" onClick={() => void copyTemplateLink()}>
																Copy link
															</Button>
														</div>
													</PopoverContent>
												</Popover>
												<Button
													className="h-8.5 px-5 bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm cursor-pointer"
													onClick={() => setView("useTemplate")}
												>
													Use Template
												</Button>
											</>
										)}
									</div>
								</div>

								<div className="flex items-stretch gap-0">
									<div className="space-y-6 flex-1 pr-4">
										<div className="flex bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[300px]">
											<div className="w-[45%] bg-slate-50/50 border-r border-slate-100 flex flex-col items-center justify-center p-6 min-h-[300px]">
												{editingCoverImage || selectedTemplate.coverImage ? (
													<img src={(editingCoverImage || selectedTemplate.coverImage) as string} alt="Template cover" className="h-full w-full object-cover rounded-lg" />
												) : (
													<>
														<div className="size-12 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
															<span className="text-slate-300 text-2xl">🖼️</span>
														</div>
														<p className="text-[13px] text-slate-400">No images uploaded</p>
													</>
												)}
												{isEditMode && (
													<>
														<input
															ref={fileInputRef}
															type="file"
															accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
															className="hidden"
															onChange={(e) => void handleUploadCoverImage(e.target.files?.[0])}
														/>
														<Button variant="outline" size="sm" className="mt-3" onClick={() => fileInputRef.current?.click()}>
															<Upload className="size-3.5 mr-1.5" /> Upload image
														</Button>
													</>
												)}
											</div>
											<div className="flex flex-1 min-h-0 flex-col p-6">
												<h3 className="text-[14px] font-semibold text-slate-800 mb-2">Template Description</h3>
												{isEditMode ? (
													<textarea
														value={editingDescription}
														onChange={(e) => setEditingDescription(e.target.value)}
														placeholder="Enter description..."
														className="w-full flex-1 min-h-0 rounded-md border border-slate-200 px-3 py-2 text-[14px] text-slate-700 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-100"
													/>
												) : (
													<p className="text-[14px] text-slate-500 whitespace-pre-wrap">
														{selectedTemplate.description || "No description..."}
													</p>
												)}
											</div>
										</div>

										<div className="space-y-3 pt-4">
											<h3 className="text-[14px] font-semibold text-slate-800">Template includes</h3>
											<div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 cursor-pointer hover:border-indigo-200 transition-colors flex items-center justify-between group">
												<div className="flex items-center gap-4">
													<div className="size-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
														<CheckCircle2 className="size-5 text-slate-400" />
													</div>
													<div>
														<h4 className="text-[14px] font-semibold text-slate-800">Status groups</h4>
														<p className="text-[12.5px] text-slate-500">1 status group included</p>
													</div>
												</div>
												<div className="text-slate-300 group-hover:text-indigo-500 transition-colors">
													<span className="text-lg leading-none">›</span>
												</div>
											</div>
										</div>
									</div>

									{/* Right sidebar info */}
									<aside className="basis-[180px] max-w-[180px] min-w-[180px] self-stretch shrink-0 border-l border-slate-200 pl-4 pt-1 space-y-4">
										<div>
											<h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Created By</h4>
											<div className="flex items-center gap-2">
												{selectedTemplate.createdBy?.image ? (
													<img src={selectedTemplate.createdBy.image} className="size-7 rounded-full bg-slate-100 object-cover" alt="" />
												) : (
													<div className="size-7 rounded-full bg-slate-600 flex items-center justify-center text-[10px] text-white font-semibold">
														{(selectedTemplate.createdBy?.name || "U").slice(0, 2).toUpperCase()}
													</div>
												)}
												<span className="text-[13px] text-slate-700 font-medium">
													{selectedTemplate.createdBy?.name || "Unknown user"}
												</span>
											</div>
										</div>

										<div>
											<h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Shared With</h4>
											<p className="text-[13px] text-slate-700">
												{shareWithValue === "everyone" && "Everyone"}
												{shareWithValue === "members" && "Members and admins"}
												{shareWithValue === "admins" && "Admins only"}
												{shareWithValue === "me" && "Only me"}
												{shareWithValue === "custom" && "Custom"}
											</p>
										</div>

										<div>
											<h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Created Date</h4>
											<p className="text-[13px] text-slate-700">
												{format(new Date(selectedTemplate.createdAt), "MMMM d, yyyy")}
											</p>
										</div>

										<div>
											<h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Last Updated</h4>
											<p className="text-[13px] text-slate-700">
												{format(new Date(selectedTemplate.updatedAt), "MMMM d, yyyy")}
											</p>
										</div>
									</aside>
								</div>
								</div>
							</div>
						</div>
				) : view === "useTemplate" && selectedTemplate ? (
					<UseTemplateModal
						open={true}
						onOpenChange={(nextOpen) => {
							if (!nextOpen) {
								onOpenChange?.(false);
								return;
							}
							setView("detail");
						}}
						onBack={() => setView("detail")}
						embedded={true}
						taskOnly={selectedTemplate.entityType === "TASK" && !!targetTaskId}
						workspaceId={workspaceId}
						sourceContext={targetContext}
						template={{
							id: selectedTemplate.id,
							name: selectedTemplate.name,
							entityType: selectedTemplate.entityType,
						}}
						onUse={(config) => {
							if (selectedTemplate.entityType === "TASK" && targetTaskId) {
								if (!targetTaskId) return;
								applyTaskTemplateMutation.mutate({
									templateId: config.templateId,
									targetTaskId,
									entityName: config.entityName,
									importMode: config.importMode,
									taskChecks: config.taskChecks,
									dateMode: config.dateMode,
									remapDueDate: config.remapDueDate,
									archivedTasks: config.archivedTasks,
								});
								return;
							}

							createFromTemplateMutation.mutate(
								{
									templateId: config.templateId,
									entityName: config.entityName,
									importMode: config.importMode,
									taskChecks: config.taskChecks,
									dateMode: config.dateMode,
									remapDueDate: config.remapDueDate,
									archivedTasks: config.archivedTasks,
									destination: config.destination,
								},
								{
									onSuccess: () => {
										toast({ title: "Template applied successfully" });
										void featuredQuery.refetch();
										void workspaceQuery.refetch();
										void globalQuery.refetch();
										void builtinQuery.refetch();
										void countsQuery.refetch();
										setView("templates");
									},
									onError: (error) => {
										toast({
											title: "Could not apply template",
											description: error.message,
											variant: "destructive",
										});
									},
								}
							);
						}}
					/>
				) : (
					// ── Audit Log view ──────────────────────────────────────────
					<div className="flex flex-col w-full h-full bg-background relative">
						<div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-20 shrink-0">
							<button
								onClick={() => setView("templates")}
								className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100/70 hover:bg-slate-200/70 rounded-md transition-colors cursor-pointer"
							>
								<ArrowLeft className="size-3.5" />
								Back
							</button>
							<div className="text-[15px] font-semibold text-slate-800">Audit Log</div>
							<button
								onClick={() => onOpenChange?.(false)}
								className="size-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
							>
								<X className="size-4" />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto w-full p-6 bg-slate-50/30">
							<div className="max-w-[1000px] mx-auto space-y-6">
								<div className="flex justify-end items-center gap-2">
									<div className="relative w-[280px]">
										<Input
											placeholder="Search by template name…"
											value={auditSearch}
											onChange={(e) => setAuditSearch(e.target.value)}
											className="h-9 w-full bg-white border-slate-200 focus-visible:ring-1 focus-visible:ring-indigo-500 rounded-md text-[13.5px] shadow-sm text-slate-600 placeholder:text-slate-400"
										/>
									</div>
								</div>

								<div className="w-full bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
									<div className="grid grid-cols-6 gap-4 px-6 py-3 border-b border-slate-100 text-[13px] font-medium text-slate-400 bg-slate-50/50">
										<div>Template</div>
										<div>Event</div>
										<div>Triggered by</div>
										<div>Location</div>
										<div>Date</div>
										<div>Status</div>
									</div>

									{auditQuery.isLoading ? (
										<div className="divide-y divide-slate-100">
											{Array.from({ length: 8 }).map((_, idx) => (
												<div key={`audit-skeleton-${idx}`} className="grid grid-cols-6 gap-4 px-6 py-3.5 items-center">
													<div className="flex items-center gap-2.5">
														<div className="size-4 rounded bg-slate-100 animate-pulse" />
														<div className="h-3.5 w-28 rounded bg-slate-100 animate-pulse" />
													</div>
													<div className="h-3.5 w-16 rounded bg-slate-100 animate-pulse" />
													<div className="flex items-center gap-2">
														<div className="size-6 rounded-full bg-slate-100 animate-pulse" />
														<div className="h-3.5 w-20 rounded bg-slate-100 animate-pulse" />
													</div>
													<div className="h-3.5 w-24 rounded bg-slate-100 animate-pulse" />
													<div className="h-3.5 w-14 rounded bg-slate-100 animate-pulse" />
													<div className="h-6 w-20 rounded-md bg-slate-100 animate-pulse" />
												</div>
											))}
										</div>
									) : auditQuery.data?.items.length === 0 ? (
										<div className="py-10 text-center text-slate-400 text-sm">No audit events yet.</div>
									) : (
										<div className="divide-y divide-slate-100">
											{(auditQuery.data?.items ?? []).map((log) => (
												<div key={log.id} className="grid grid-cols-6 gap-4 px-6 py-3.5 items-center text-[13.5px] hover:bg-slate-50/50 transition-colors">
													<div className="flex items-center gap-2.5">
														{log.template && <EntityIcon type={log.template.entityType} />}
														<span className="text-slate-700 font-medium truncate">{log.template?.name ?? "–"}</span>
													</div>
													<div className="text-slate-600">{EVENT_LABELS[log.event] ?? log.event}</div>
													<div className="min-w-0">
														{log.actor?.id ? (
															<UserProfileHoverCard userId={log.actor.id}>
																<button className="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-slate-100/80 transition-colors cursor-pointer">
																	{log.actor.image ? (
																		<img
																			src={log.actor.image}
																			alt={log.actor.name ?? "User"}
																			className="size-6 rounded-full object-cover"
																		/>
																	) : (
																		<div className="size-6 rounded-full bg-slate-600 text-white text-[10px] font-semibold flex items-center justify-center">
																			{(log.actor.name ?? "U").slice(0, 2).toUpperCase()}
																		</div>
																	)}
																	<span className="truncate text-slate-700">{log.actor.name ?? "Unknown user"}</span>
																</button>
															</UserProfileHoverCard>
														) : (
															<span className="text-slate-400">–</span>
														)}
													</div>
													<div className="flex items-center gap-1.5 text-slate-600 truncate">
														{log.targetEntityType && <EntityIcon type={log.targetEntityType} />}
														<span className="truncate">{getAuditLocationLabel(log)}</span>
													</div>
													<div className="text-slate-500 text-[13px]">
														<HoverCard openDelay={120} closeDelay={80}>
															<HoverCardTrigger asChild>
																<span className="cursor-default">{format(new Date(log.createdAt), "h:mm a").toLowerCase()}</span>
															</HoverCardTrigger>
															<HoverCardContent className="w-auto px-3 py-2 text-xs bg-slate-900 text-white border-slate-900 rounded-md">
																{`${format(new Date(log.createdAt), "MMM d yyyy 'at' h:mm a")} \u2192 ${format(new Date(log.createdAt), "MMM d yyyy 'at' h:mm a")}`}
															</HoverCardContent>
														</HoverCard>
													</div>
													<div>
														<Badge
															variant="secondary"
															className={cn(
																"font-medium border-0 px-2.5 py-0.5 rounded-md flex items-center gap-1 w-fit",
																log.status === "SUCCESS" && "bg-emerald-100/80 text-emerald-700",
																log.status === "FAILED" && "bg-rose-100/80 text-rose-700",
																log.status === "PARTIAL" && "bg-amber-100/80 text-amber-700",
															)}
														>
															{log.status === "SUCCESS" && <CheckCircle2 className="size-3" />}
															{log.status === "FAILED" && <AlertCircle className="size-3" />}
															{log.status.charAt(0) + log.status.slice(1).toLowerCase()}
														</Badge>
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				)}
			</DialogContent>

			<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader className="px-6 text-left">
						<AlertDialogTitle>Delete template?</AlertDialogTitle>
						<AlertDialogDescription>
							You are permanently deleting <strong>{selectedTemplate?.name}</strong> from your workspace.
							This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => void handleDeleteTemplate()}
							className="bg-red-500 hover:bg-red-600"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Dialog>
	);
}
