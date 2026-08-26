"use client";
import { useMemo, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, X, Settings2, MoreHorizontal, Trash, PenSquare, Globe, User, Users, Circle, CheckSquare } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Shell from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { SearchSection } from "@/entities/shared/components/SearchSection";
import { TaskCard, useTaskList, TaskScope } from "@/entities/task";
import { TaskCreationModal } from "@/entities/task/components/TaskCreationModal";
import { ConfirmDeleteModal } from "@/components/modals/ConfirmDeleteModal";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { LazyDataTable as DataTable } from "@/components/ui/lazy-data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
	LocationTypeFilterRow,
	NestedLocationFilterRow,
	FilterSelectRow,
	DashboardFilterPopover,
	DashboardSortPopover,
	LocationSelection,
} from "@/features/dashboard/components/shared/DashboardFilterSubmenus";
import { ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import { EntityStatusBadge } from "@/components/ui/status-badge";

export default function TasksPage() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { toast } = useToast();
	const utils = trpc.useUtils();
	const queryClient = useQueryClient();

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
	const initialScope = (searchParams.get("scope") as TaskScope) || "all";
	const initialStatus = searchParams.get("status") || "";
	const initialLocationType = searchParams.get("locationType") || "all";

	const [locationTypeFilter, setLocationTypeFilter] = useState<string>(initialLocationType);
	const [locationFilter, setLocationFilter] = useState<LocationSelection>(null);

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
	} = useTaskList({
		initialScope,
		initialPage,
		pageSize: initialPageSize,
		includeRelations: viewMode === "list" ? true : "card",
		initialFilters: { statuses: initialStatus ? [initialStatus] : [] },
		syncWithUrl: false,
	});

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

	const handleScopeChange = (val: TaskScope) => {
		setScope(val);
		setPage(1);
		updateUrlParams({ scope: val, page: 1 });
	};

	const handleStatusFilterChange = (statusVal?: string) => {
		setFilters((prev) => ({ ...prev, statuses: statusVal ? [statusVal] : [] }));
		setPage(1);
		updateUrlParams({ status: statusVal || undefined, page: 1 });
	};

	const { data: workspaces } = trpc.workspace.list.useQuery({ includeCounts: false }, { staleTime: 30000 });
	const defaultWorkspaceId = workspaces?.items?.[0]?.id;

	const convertTask = trpc.task.createProposalFromTask.useMutation();
	const deleteMutation = trpc.task.delete.useMutation({
		onMutate: async (variables) => {
			queryClient.setQueriesData({ queryKey: [['task', 'list']] }, (oldData: any) => {
				if (!oldData || !oldData.items) return oldData;
				return {
					...oldData,
					items: oldData.items.filter((t: any) => t.id !== variables.id),
					total: Math.max(0, oldData.total - 1)
				};
			});
		},
		onSuccess: () => {
			toast({ title: "Task deleted successfully" });
		},
		onError: (error) => {
			toast({ title: "Failed to delete task", description: error.message, variant: "destructive" });
		},
		onSettled: () => {
			utils.task.list.invalidate();
		}
	});

	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
	const [bulkDeleteRows, setBulkDeleteRows] = useState<any[]>([]);

	const handleDelete = (id: string, title?: string) => {
		setDeleteTarget({ id, name: title ?? "Untitled Task" });
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

	const handleConvertToProposal = async (id: string) => {
		try {
			await convertTask.mutateAsync({ taskId: id });
			toast({ title: "Task converted to proposal successfully" });
			utils.task.list.invalidate();
		} catch (error: any) {
			toast({ title: "Failed to convert task", description: error.message, variant: "destructive" });
		}
	};

	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const handleCreateTask = () => setIsCreateModalOpen(true);

	const [sort, setSort] = useState<Array<{ id: string; desc: boolean }>>([{ id: "updatedAt", desc: true }]);
	const [columnVisibility, setColumnVisibility] = useState<import("@tanstack/react-table").VisibilityState>({});
	const [table, setTable] = useState<import("@tanstack/react-table").Table<any> | null>(null);
	const [selectedGridIds, setSelectedGridIds] = useState<Set<string>>(new Set());

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
			header: ({ column }) => <DataTableColumnHeader column={column} title="Task" />,
			cell: ({ row }) => {
				const task = row.original;
				return (
					<div className="flex flex-col">
						<span
							className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline cursor-pointer"
							onClick={() => router.push(`/tasks/${task.id}`)}
						>
							{task.title || "Untitled Task"}
						</span>
					</div>
				);
			},
		},
		{
			accessorKey: "status",
			header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
			cell: ({ row }) => <EntityStatusBadge status={row.original.status || "TODO"} />,
		},
		{
			id: "assignee",
			header: ({ column }) => <DataTableColumnHeader column={column} title="Assignee" />,
			cell: ({ row }) => {
				const assignee = row.original.assignee || row.original.user;
				return <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{assignee?.name || "Unassigned"}</span>;
			},
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
			id: "actions",
			cell: ({ row }) => {
				const task = row.original;
				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="h-8 w-8 p-0 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 hover:font-medium transition-colors cursor-pointer">
								<span className="sr-only">Open menu</span>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => router.push(`/tasks/${task.id}`)}>
								<PenSquare className="mr-1 h-4 w-4" />
								Edit Task
							</DropdownMenuItem>
							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onClick={() => handleDelete(task.id, task.title)}
							>
								<Trash className="mr-1 h-4 w-4" />
								Delete Task
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];

	const renderRowContextMenu = (task: any) => (
		<>
			<ContextMenuItem onClick={() => router.push(`/tasks/${task.id}`)} className="cursor-pointer">
				<PenSquare className="mr-2 h-4 w-4" /> Edit Task
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => handleDelete(task.id, task.title)}>
				<Trash className="mr-2 h-4 w-4" /> Delete Task
			</ContextMenuItem>
		</>
	);

	const chips = useMemo(() => {
		const result: Array<{ id: string; label: string; onRemove: () => void }> = [];
		if (query) result.push({ id: "q", label: `Search: ${query}`, onRemove: () => handleSearchChange("") });
		if (filters.statuses?.length) {
			result.push({
				id: "status",
				label: `Status: ${filters.statuses[0]}`,
				onRemove: () => handleStatusFilterChange(""),
			});
		}
		return result;
	}, [query, filters, handleSearchChange, handleStatusFilterChange]);

	const clearAll = () => {
		setQuery("");
		setScope("all");
		setFilters({ statuses: [] });
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
						title="Tasks"
						description="Create, organize, and assign tasks across your workspaces and projects."
						actions={
							<Button
								onClick={handleCreateTask}
								className="group flex items-center gap-2 bg-zinc-900 hover:bg-zinc-700 text-white dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 px-4 py-2 h-9 rounded-md transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer"
							>
								<Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
								<span className="font-medium text-sm">New Task</span>
							</Button>
						}
					/>

					<SearchSection
						searchValue={query}
						searchPlaceholder="Search tasks..."
						resultsCount={total}
						onSearchChange={handleSearchChange}
						onSearchSubmit={() => handlePageChange(1)}
						onCreateNew={handleCreateTask}
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
								(filters.statuses?.length ? 1 : 0) +
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
								onChange={(val) => handleScopeChange(val as TaskScope)}
								onClear={() => handleScopeChange("all")}
								options={[
									{ id: "owned", label: "Created by me", icon: User, color: "text-blue-500" },
									{ id: "assigned", label: "Assigned to me", icon: Users, color: "text-emerald-500" },
								]}
							/>

							<FilterSelectRow
								icon={<Circle className="h-4 w-4 text-zinc-500" />}
								label="Status"
								value={filters.statuses?.[0] || ""}
								onChange={(val) => handleStatusFilterChange(val)}
								onClear={() => handleStatusFilterChange("")}
								options={[
									{ id: "TODO", label: "To Do", icon: Circle, color: "text-zinc-400 fill-zinc-400" },
									{ id: "IN_PROGRESS", label: "In Progress", icon: Circle, color: "text-blue-500 fill-blue-500" },
									{ id: "DONE", label: "Done", icon: Circle, color: "text-emerald-500 fill-emerald-500" },
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
											Task name
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
									</div>
								))}
							</div>
						) : (
							<DataTableSkeleton columnCount={5} rowCount={pageSize} />
						)
					) : data?.items && data.items.length > 0 ? (
						viewMode === "grid" ? (
							<>
								<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-4">
									{data.items.map((item) => (
										<TaskCard
											key={item.id}
											item={item}
											onOpen={(id) => router.push(`/tasks/${id}`)}
											onConvert={handleConvertToProposal}
											isSelected={selectedGridIds.has(item.id)}
											onSelect={handleGridSelect}
											onDelete={(id) => handleDelete(id, item.title)}
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
									<CheckSquare className="h-7 w-7 text-indigo-500" />
								</div>
								<h3 className="text-base font-semibold text-slate-900">
									{query ? "No results found" : "No tasks yet"}
								</h3>
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
							itemLabel="tasks"
						/>
					)}
				</div>
			</div>
			<TaskCreationModal
				open={isCreateModalOpen}
				onOpenChange={setIsCreateModalOpen}
				context="GENERAL"
				workspaceId={defaultWorkspaceId}
			/>
			<ConfirmDeleteModal
				open={deleteModalOpen}
				onOpenChange={setDeleteModalOpen}
				itemName={deleteTarget?.name}
				count={bulkDeleteRows.length > 0 ? bulkDeleteRows.length : 1}
				entityLabel="task"
				onConfirm={handleConfirmDelete}
				isLoading={deleteMutation.isPending}
			/>
		</Shell>
	);
}
