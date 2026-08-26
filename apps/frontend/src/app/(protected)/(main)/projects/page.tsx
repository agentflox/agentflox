"use client";
import { Plus, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import Shell from "@/components/layout/Shell";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { SearchSection } from "@/entities/shared/components/SearchSection";
import { UsageQuotaBanner } from "@/features/usage/components/UsageQuotaBanner";
import ProjectCard from "@/entities/projects/components/ProjectCard";
import { Pagination } from "@/components/ui/pagination";
import { useProjectList, ProjectScope } from "@/entities/projects/hooks/useProjectList";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import React, { useCallback, useMemo, useState } from "react";
import { DASHBOARD_ROUTES } from '@/constants/routes.config';
import { ProjectCreationModal } from "@/entities/projects/components/ProjectCreationModal";
import { MoreHorizontal, Trash, PenSquare, Settings2, FolderKanban } from "lucide-react";
import { ConfirmDeleteModal } from "@/components/modals/ConfirmDeleteModal";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import { LazyDataTable as DataTable } from "@/components/ui/lazy-data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import {
	LocationTypeFilterRow,
	NestedLocationFilterRow,
	FilterSelectRow,
	DashboardFilterPopover,
	DashboardSortPopover,
	LocationSelection,
} from "@/features/dashboard/components/shared/DashboardFilterSubmenus";
import { Globe, User, Users, Circle } from "lucide-react";
import { ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import { EntityStatusBadge } from "@/components/ui/status-badge";

export default function ProjectsPage() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { toast } = useToast();
	const utils = trpc.useUtils();
	const queryClient = useQueryClient();

	// 1. Read initial values from URL Search Params
	const urlViewMode = (searchParams.get("view") === "list" ? "list" : "grid") as "grid" | "list";
	const [viewMode, setViewMode] = useState<"grid" | "list">(urlViewMode);

	const initialPage = useMemo(() => {
		const p = searchParams.get("page");
		const num = p ? parseInt(p, 10) : 1;
		return isNaN(num) || num < 1 ? 1 : num;
	}, [searchParams]);

	const initialPageSize = useMemo(() => {
		const ps = searchParams.get("pageSize");
		const fallback = urlViewMode === "grid" ? 12 : 10;
		const num = ps ? parseInt(ps, 10) : fallback;
		return isNaN(num) || num < 1 ? fallback : num;
	}, [searchParams, urlViewMode]);

	const initialQuery = searchParams.get("q") || "";
	const initialScope = (searchParams.get("scope") as ProjectScope) || "all";
	const initialStatus = (searchParams.get("status") as any) || "";
	const initialLocationType = searchParams.get("locationType") || "all";

	const [locationTypeFilter, setLocationTypeFilter] = useState<string>(initialLocationType);
	const [locationFilter, setLocationFilter] = useState<LocationSelection>(null);

	const deleteMutation = trpc.project.delete.useMutation({
		onMutate: async (variables) => {
			queryClient.setQueriesData({ queryKey: [['project', 'list']] }, (oldData: any) => {
				if (!oldData || !oldData.items) return oldData;
				return {
					...oldData,
					items: oldData.items.filter((p: any) => p.id !== variables.id),
					total: Math.max(0, oldData.total - 1)
				};
			});
			queryClient.setQueriesData({ queryKey: [['project', 'listInfinite']] }, (oldData: any) => {
				if (!oldData || !oldData.pages) return oldData;
				return {
					...oldData,
					pages: oldData.pages.map((page: any) => ({
						...page,
						items: page.items.filter((p: any) => p.id !== variables.id),
					}))
				};
			});
		},
		onSuccess: () => {
			toast({ title: "Project deleted successfully" });
		},
		onError: (error) => {
			toast({ title: "Failed to delete project", description: error.message, variant: "destructive" });
		},
		onSettled: () => {
			utils.project.list.invalidate();
			if ((utils.project as any).listInfinite) (utils.project as any).listInfinite.invalidate();
		}
	});

	// Delete modal state
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
	const [bulkDeleteRows, setBulkDeleteRows] = useState<any[]>([]);

	const {
		data,
		isLoading,
		isFetching,
		page,
		pageSize,
		setPage,
		setPageSize,
		query,
		setQuery,
		scope,
		setScope,
		filters,
		setFilters,
		totalPages,
		total,
	} = useProjectList({
		initialPage,
		pageSize: initialPageSize,
		initialScope,
		syncWithUrl: false,
	});

	// Helper to update URL search parameters seamlessly
	const updateUrlParams = useCallback(
		(updates: Record<string, string | number | undefined | null>) => {
			const params = new URLSearchParams(searchParams.toString());

			Object.entries(updates).forEach(([key, val]) => {
				if (
					val === undefined ||
					val === null ||
					val === "" ||
					(key === "page" && Number(val) === 1) ||
					(key === "scope" && val === "all") ||
					(key === "locationType" && val === "all")
				) {
					params.delete(key);
				} else {
					params.set(key, String(val));
				}
			});

			const searchStr = params.toString();
			const newUrl = searchStr ? `${pathname}?${searchStr}` : pathname;
			window.history.replaceState(null, "", newUrl);
		},
		[searchParams, pathname]
	);

	const handlePageChange = (newPage: number) => {
		setPage(newPage);
		updateUrlParams({ page: newPage });
	};

	const handlePageSizeChange = (newPageSize: number) => {
		setPageSize(newPageSize);
		setPage(1);
		updateUrlParams({ pageSize: newPageSize, page: 1 });
	};

	const handleViewModeChange = (mode: "grid" | "list") => {
		setViewMode(mode);
		const defaultSize = mode === "grid" ? 12 : 10;
		setPageSize(defaultSize);
		setPage(1);
		updateUrlParams({ view: mode === "grid" ? undefined : mode, pageSize: defaultSize, page: 1 });
	};

	const handleSearchChange = (val: string) => {
		setQuery(val);
		setPage(1);
		updateUrlParams({ q: val || undefined, page: 1 });
	};

	const handleScopeChange = (val: ProjectScope) => {
		setScope(val);
		setPage(1);
		updateUrlParams({ scope: val, page: 1 });
	};

	const handleStatusFilterChange = (statusVal?: string) => {
		setFilters((prev) => ({ ...prev, status: statusVal as any }));
		setPage(1);
		updateUrlParams({ status: statusVal, page: 1 });
	};

	const [showCreateModal, setShowCreateModal] = useState(false);
	const [sort, setSort] = useState<Array<{ id: string; desc: boolean }>>([{ id: "updatedAt", desc: true }]);
	const [columnVisibility, setColumnVisibility] = useState<import("@tanstack/react-table").VisibilityState>({});
	const [table, setTable] = useState<import("@tanstack/react-table").Table<any> | null>(null);
	const [selectedGridIds, setSelectedGridIds] = useState<Set<string>>(new Set());

	const rowSelection = useMemo(() => {
		const map: Record<string, boolean> = {};
		selectedGridIds.forEach((id) => {
			map[id] = true;
		});
		return map;
	}, [selectedGridIds]);

	const handleRowSelectionChange = (newSelection: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => {
		setSelectedGridIds((prev) => {
			const currentMap: Record<string, boolean> = {};
			prev.forEach((id) => { currentMap[id] = true; });
			const nextMap = typeof newSelection === "function" ? newSelection(currentMap) : newSelection;
			const nextSet = new Set<string>();
			Object.keys(nextMap).forEach((key) => {
				if (nextMap[key]) nextSet.add(key);
			});
			return nextSet;
		});
	};

	const handleGridSelect = (id: string, selected: boolean) => {
		setSelectedGridIds((prev) => {
			const next = new Set(prev);
			if (selected) next.add(id); else next.delete(id);
			return next;
		});
	};

	const handleDelete = (id: string, name?: string) => {
		setDeleteTarget({ id, name: name ?? "Untitled Project" });
		setBulkDeleteRows([]);
		setDeleteModalOpen(true);
	};

	const handleBulkDelete = (rows: any[]) => {
		setBulkDeleteRows(rows);
		setDeleteTarget(null);
		setDeleteModalOpen(true);
	};

	const handleConfirmDelete = async () => {
		setDeleteModalOpen(false);
		if (bulkDeleteRows.length > 0) {
			for (const row of bulkDeleteRows) {
				deleteMutation.mutate({ id: row.id });
			}
			setSelectedGridIds(new Set());
		} else if (deleteTarget) {
			deleteMutation.mutate({ id: deleteTarget.id });
		}
	};

	const handlePrefetch = (id: string) => {
		if (!id) return;
		utils.project.get.prefetch({ id });
	};

	const handleOpen = (id: string) => {
		if (!id) return;
		router.push(DASHBOARD_ROUTES.PROJECT(id));
	};

	const columns: ColumnDef<any>[] = [
		{
			id: "select",
			header: ({ table }) => (
				<Checkbox
					checked={table.getIsAllPageRowsSelected()}
					onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
					aria-label="Select all"
					className="translate-y-[2px]"
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					aria-label="Select row"
					className="translate-y-[2px]"
				/>
			),
			enableSorting: false,
			enableHiding: false,
		},
		{
			accessorKey: "title",
			header: ({ column }) => <DataTableColumnHeader column={column} title="Project" />,
			cell: ({ row }) => {
				const project = row.original;
				return (
					<div className="flex flex-col" onMouseEnter={() => handlePrefetch(project.id)}>
						<span
							className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline cursor-pointer"
							onClick={() => handleOpen(project.id)}
						>
							{project.title || "Untitled Project"}
						</span>
					</div>
				);
			},
		},
		{
			accessorKey: "description",
			header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
			cell: ({ row }) => {
				const desc = row.original.description;
				return (
					<span className="text-xs text-zinc-500 line-clamp-1 max-w-[240px]" title={desc}>
						{desc || "-"}
					</span>
				);
			},
		},
		{
			accessorKey: "status",
			header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
			cell: ({ row }) => <EntityStatusBadge status={row.original.status || "DRAFT"} />,
		},
		{
			id: "owner",
			header: ({ column }) => <DataTableColumnHeader column={column} title="Owner" />,
			cell: ({ row }) => {
				const owner = row.original.owner || row.original.user || row.original.creator;
				return <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{owner?.name || "You"}</span>;
			},
		},
		{
			accessorKey: "industries",
			header: ({ column }) => <DataTableColumnHeader column={column} title="Industries" />,
			cell: ({ row }) => {
				const industries = row.original.industries || [];
				if (industries.length === 0) return <span className="text-muted-foreground">-</span>;
				return (
					<div className="flex flex-wrap gap-1">
						{industries.slice(0, 2).map((ind: string) => (
							<Badge key={ind} variant="outline" className="text-xs">{ind}</Badge>
						))}
						{industries.length > 2 && (
							<Badge variant="outline" className="text-xs">+{industries.length - 2}</Badge>
						)}
					</div>
				);
			},
			enableSorting: false,
		},
		{
			accessorKey: "createdAt",
			header: ({ column }) => <DataTableColumnHeader column={column} title="Date Created" />,
			cell: ({ row }) => {
				const date = row.original.createdAt;
				return (
					<span className="text-xs text-zinc-500 whitespace-nowrap">
						{date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : "-"}
					</span>
				);
			},
		},
		{
			id: "updatedAt",
			accessorKey: "updatedAt",
			header: ({ column }) => <DataTableColumnHeader column={column} title="Last Modified" />,
			cell: ({ row }) => {
				if (!row.original.updatedAt) return null;
				return (
					<span className="text-xs text-zinc-500 whitespace-nowrap">
						{formatDistanceToNow(new Date(row.original.updatedAt), { addSuffix: true })}
					</span>
				);
			},
		},
		{
			id: "actions",
			cell: ({ row }) => {
				const project = row.original;
				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="h-8 w-8 p-0 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 hover:font-medium transition-colors cursor-pointer">
								<span className="sr-only">Open menu</span>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => handleOpen(project.id)}>
								<PenSquare className="mr-1 h-4 w-4" />
								Edit Project
							</DropdownMenuItem>
							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onClick={() => handleDelete(project.id, project.title)}
							>
								<Trash className="mr-1 h-4 w-4" />
								Delete Project
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];

	const renderRowContextMenu = (project: any) => (
		<>
			<ContextMenuItem onClick={() => handleOpen(project.id)} className="cursor-pointer">
				<PenSquare className="mr-2 h-4 w-4" /> Edit Project
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => handleDelete(project.id, project.title)}>
				<Trash className="mr-2 h-4 w-4" /> Delete Project
			</ContextMenuItem>
		</>
	);

	const chips = useMemo(() => {
		const result: Array<{ id: string; label: string; onRemove: () => void }> = [];
		if (query) result.push({ id: "q", label: `Search: ${query}`, onRemove: () => handleSearchChange("") });
		(filters.industries || []).forEach((ind: string) => {
			result.push({
				id: `ind-${ind}`,
				label: ind,
				onRemove: () => setFilters((f: any) => ({ ...f, industries: (f.industries || []).filter((x: string) => x !== ind) })),
			});
		});
		if ((filters as any).status) {
			result.push({
				id: "status",
				label: `Status: ${(filters as any).status}`,
				onRemove: () => handleStatusFilterChange(undefined),
			});
		}
		return result;
	}, [query, filters, setFilters]);

	const clearAll = () => {
		setQuery("");
		setScope("all");
		setFilters({ industries: [], status: "" as any });
		setLocationTypeFilter("all");
		setLocationFilter(null);
		handlePageChange(1);
		updateUrlParams({
			q: undefined,
			scope: undefined,
			status: undefined,
			locationType: undefined,
			page: 1,
		});
	};

	return (
		<Shell noPadding>
			<div className="flex flex-col min-h-full">
				{/* Enterprise Docked Sticky Header & Controls */}
				<div className="sticky top-0 z-20 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 shadow-xs px-6 pt-6 pb-4 space-y-4 transition-all">
					<PageHeader
						title="Projects"
						description="Create new Projects, filter, and manage your submissions."
						actions={
							<Button
								onClick={() => setShowCreateModal(true)}
								className="group flex items-center gap-2 bg-zinc-900 hover:bg-zinc-700 text-white dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 px-4 py-2 h-9 rounded-md transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer"
							>
								<Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
								<span className="font-medium text-sm">New Project</span>
							</Button>
						}
					/>

					<UsageQuotaBanner kind="PROJECT" />

					<SearchSection
						searchValue={query}
						searchPlaceholder="Search projects..."
						resultsCount={total}
						onSearchChange={handleSearchChange}
						onSearchSubmit={() => handlePageChange(1)}
						onCreateNew={() => setShowCreateModal(true)}
						createButtonText="Create New"
						showFilters={false}
						showSort={false}
						viewMode={viewMode}
						onViewModeChange={handleViewModeChange}
					>
						{/* Filter Popover */}
						<DashboardFilterPopover
							activeFiltersCount={
								(scope !== "all" ? 1 : 0) +
								((filters as any).status ? 1 : 0) +
								(filters.industries.length > 0 ? 1 : 0) +
								(locationTypeFilter !== "all" ? 1 : 0) +
								(locationFilter ? 1 : 0)
							}
							onClearAllFilters={clearAll}
						>
							<LocationTypeFilterRow
								selectedType={locationTypeFilter}
								onSelectType={(type) => {
									setLocationTypeFilter(type);
									handlePageChange(1);
									updateUrlParams({ locationType: type, page: 1 });
								}}
							/>

							<NestedLocationFilterRow
								selectedLocation={locationFilter}
								onSelectLocation={(loc) => {
									setLocationFilter(loc);
									handlePageChange(1);
								}}
							/>

							<FilterSelectRow
								icon={<Globe className="h-4 w-4 text-zinc-500" />}
								label="Scope"
								value={scope}
								onChange={(val) => handleScopeChange(val as ProjectScope)}
								onClear={() => handleScopeChange("all")}
								options={[
									{ id: "owned", label: "Owned by me", icon: User, color: "text-blue-500" },
									{ id: "participated", label: "Shared with me", icon: Users, color: "text-emerald-500" },
								]}
							/>

							<FilterSelectRow
								icon={<Circle className="h-4 w-4 text-zinc-500" />}
								label="Status"
								value={(filters as any).status}
								onChange={(val) => handleStatusFilterChange(val as string)}
								onClear={() => handleStatusFilterChange(undefined)}
								options={[
									{ id: "DRAFT", label: "Draft", icon: Circle, color: "text-zinc-400 fill-zinc-400" },
									{ id: "PUBLISHED", label: "Published", icon: Circle, color: "text-emerald-500 fill-emerald-500" },
									{ id: "ARCHIVED", label: "Archived", icon: Circle, color: "text-red-500 fill-red-500" },
								]}
							/>
						</DashboardFilterPopover>

						{/* Columns Dropdown (List View Only) */}
						{viewMode === "list" && table && (() => {
							const hideableColumns = table.getAllColumns().filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide() && column.id !== "title");
							const visibleCount = hideableColumns.filter(c => c.getIsVisible()).length + 1;

							return (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" className="h-9 px-3 gap-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 transition-all cursor-pointer">
											<Settings2 className="h-4 w-4" />
											<span>Columns</span>
											<span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-200/70 px-1.5 text-xs font-semibold text-zinc-700">
												{visibleCount}
											</span>
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-[160px]">
										<DropdownMenuCheckboxItem checked={true} onCheckedChange={() => { }} className="opacity-50 cursor-not-allowed">
											Project title
										</DropdownMenuCheckboxItem>
										<DropdownMenuSeparator />
										{hideableColumns.map((column) => (
											<DropdownMenuCheckboxItem
												key={column.id}
												className="capitalize cursor-pointer"
												checked={column.getIsVisible()}
												onCheckedChange={(value) => column.toggleVisibility(!!value)}
											>
												{column.id}
											</DropdownMenuCheckboxItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
							);
						})()}

						{/* Sort Popover */}
						<DashboardSortPopover
							sort={sort}
							onSortChange={setSort}
							options={[
								{ id: "title", label: "Title" },
								{ id: "status", label: "Status" },
								{ id: "updatedAt", label: "Last Modified" },
								{ id: "createdAt", label: "Date Created" },
							]}
						/>
					</SearchSection>

					{/* Filter Chips */}
					{chips.length > 0 && (
						<div className="flex flex-wrap items-center gap-2 pt-1">
							{chips.map((c) => (
								<span
									key={c.id}
									className="group inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 shadow-2xs"
								>
									<span>{c.label}</span>
									<button
										type="button"
										onClick={c.onRemove}
										className="rounded-full p-0.5 transition-all hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
										aria-label={`Remove ${c.label} filter`}
									>
										<X className="h-3 w-3 text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300" />
									</button>
								</span>
							))}
							<Button
								variant="ghost"
								onClick={clearAll}
								className="h-7 px-2 text-xs text-zinc-500 hover:text-zinc-900 cursor-pointer"
							>
								Clear all
							</Button>
						</div>
					)}
				</div>

				{/* Main Content Area with generous breathing room below sticky header */}
				<div className="flex-1 px-6 pt-6 pb-8 space-y-6">
					{isLoading ? (
						viewMode === "grid" ? (
							<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-4">
								{[...Array(pageSize)].map((_, i) => (
									<div key={i} className="relative flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm p-6 pt-10 overflow-hidden">
										<div className="flex items-start gap-3 mb-4">
											<Skeleton className="h-10 w-10 rounded-xl shrink-0" />
											<div className="flex-1 space-y-2 pt-1">
												<Skeleton className="h-4 w-[60%] rounded-md" />
												<Skeleton className="h-3 w-[40%] rounded-md opacity-60" />
											</div>
										</div>
										<Skeleton className="h-3.5 w-full rounded-md" />
										<Skeleton className="h-3.5 w-[75%] rounded-md mt-1.5" />
										<div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100">
											<Skeleton className="h-5 w-16 rounded-full" />
											<Skeleton className="h-5 w-14 rounded-full" />
											<Skeleton className="h-5 w-12 rounded-full ml-auto" />
										</div>
									</div>
								))}
							</div>
						) : (
							<DataTableSkeleton columnCount={6} rowCount={pageSize} />
						)
					) : data?.items && data.items.length > 0 ? (
						viewMode === "grid" ? (
							<>
								<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-4">
									{data.items.map((p: any) => (
										<ProjectCard
											key={p.id}
											item={p}
											onOpen={handleOpen}
											isSelected={selectedGridIds.has(p.id)}
											onSelect={handleGridSelect}
											onDelete={(id) => handleDelete(id, p.title)}
										/>
									))}
								</div>

								{selectedGridIds.size > 0 && (
									<div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-4 rounded-xl border border-zinc-200 bg-white/95 px-5 py-3 shadow-2xl shadow-zinc-200/60 backdrop-blur-md ring-1 ring-zinc-100 animate-in fade-in slide-in-from-bottom-4 duration-200">
										<span className="text-sm font-medium text-zinc-700">
											{selectedGridIds.size} {selectedGridIds.size === 1 ? "item" : "items"} selected
										</span>
										<div className="h-4 w-px bg-zinc-200" />
										<Button variant="ghost" size="sm" onClick={() => setSelectedGridIds(new Set())} className="h-8 gap-1.5 px-3 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer">
											<X className="h-3.5 w-3.5" />
											Deselect
										</Button>
										<Button variant="destructive" size="sm" onClick={() => handleBulkDelete(Array.from(selectedGridIds).map(id => ({ id })))} className="h-8 gap-1.5 px-3 cursor-pointer">
											<Trash className="h-3.5 w-3.5" />
											Delete Selected
										</Button>
									</div>
								)}
							</>
						) : (
							<DataTable
								columns={columns}
								data={data.items}
								onDeleteSelected={handleBulkDelete}
								onTableReady={setTable}
								renderRowContextMenu={renderRowContextMenu}
								hideToolbar
								columnVisibility={columnVisibility}
								onColumnVisibilityChange={setColumnVisibility}
								sorting={sort}
								onSortingChange={setSort}
								rowSelection={rowSelection}
								onRowSelectionChange={handleRowSelectionChange}
							/>
						)
					) : (
						<div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/50 to-white shadow-sm">
							<div className="text-center px-6 py-8 max-w-xs">
								<div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-100 shadow-sm flex items-center justify-center mb-6">
									<FolderKanban className="h-7 w-7 text-indigo-500" />
								</div>
								<h3 className="text-base font-semibold text-slate-900">
									{query ? "No results found" : "No projects yet"}
								</h3>
								<p className="mt-2 text-sm text-slate-500 leading-relaxed">
									{query
										? "Try adjusting your search or clearing filters to find what you're looking for."
										: "Create and manage your projects to start organizing your work."}
								</p>
								{!query && (
									<button
										onClick={() => setShowCreateModal(true)}
										className="mt-6 inline-flex items-center gap-2 rounded-xl px-4 h-10 text-sm font-semibold bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all cursor-pointer"
									>
										<Plus className="h-4 w-4" />
										Create new project
									</button>
								)}
							</div>
						</div>
					)}

					{/* Enterprise Pagination */}
					{data?.items && data.items.length > 0 && (
						<Pagination
							currentPage={page}
							totalPages={totalPages}
							totalItems={total}
							pageSize={pageSize}
							pageSizeOptions={viewMode === "grid" ? [12, 24, 48] : [10, 25, 50]}
							onPageSizeChange={handlePageSizeChange}
							hasNextPage={page < totalPages}
							hasPreviousPage={page > 1}
							onPageChange={handlePageChange}
							isLoading={isLoading || isFetching}
							itemLabel="projects"
						/>
					)}
				</div>
			</div>
			<ProjectCreationModal open={showCreateModal} onOpenChange={setShowCreateModal} onCreated={(id) => router.push(DASHBOARD_ROUTES.PROJECT(id))} />
			<ConfirmDeleteModal
				open={deleteModalOpen}
				onOpenChange={setDeleteModalOpen}
				itemName={deleteTarget?.name}
				count={bulkDeleteRows.length > 0 ? bulkDeleteRows.length : 1}
				entityLabel="project"
				onConfirm={handleConfirmDelete}
				isLoading={deleteMutation.isPending}
			/>
		</Shell>
	);
}
