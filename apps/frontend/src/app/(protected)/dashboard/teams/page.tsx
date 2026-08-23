"use client";
import { Plus, X } from "lucide-react";
import Shell from "@/components/layout/Shell";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { SearchSection } from "@/entities/shared/components/SearchSection";
import { UsageQuotaBanner } from "@/features/usage/components/UsageQuotaBanner";
import TeamCard from "@/entities/teams/components/TeamCard";
import { useTeamList } from "@/entities/teams/hooks/useTeamList";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { useRouter } from "next/navigation";
import React, { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DASHBOARD_ROUTES, MARKETPLACE_ROUTES } from '@/constants/routes.config';
import { TeamCreationModal } from "@/entities/teams/components/TeamCreationModal";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Filter, Tag, MoreHorizontal, Eye, Trash, Users } from "lucide-react";
import { INDUSTRY_OPTIONS } from "@/constants/shares";
import { LazyDataTable as DataTable } from "@/components/ui/lazy-data-table";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Settings2, ArrowUpDown, Check, ChevronUp, ChevronDown, MoreVertical, PenSquare } from "lucide-react";
import { DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDeleteModal } from "@/components/modals/ConfirmDeleteModal";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import {
	LocationTypeFilterSubmenu,
	NestedLocationFilterSubmenu,
	DashboardSortPopover,
	LocationSelection,
} from "@/features/dashboard/components/shared/DashboardFilterSubmenus";
import { Globe, User, Circle } from "lucide-react";
import { ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import { EntityStatusBadge } from "@/components/ui/status-badge";

export default function TeamsPage() {
	const router = useRouter();
	const { toast } = useToast();
	const utils = trpc.useUtils();
	const queryClient = useQueryClient();
	const deleteMutation = trpc.team.delete.useMutation({
		onMutate: async (variables) => {
			// Optimistically remove from all team lists instantly
			queryClient.setQueriesData({ queryKey: [['team', 'list']] }, (oldData: any) => {
				if (!oldData || !oldData.items) return oldData;
				return {
					...oldData,
					items: oldData.items.filter((t: any) => t.id !== variables.id),
					total: Math.max(0, oldData.total - 1)
				};
			});
			// Also invalidate listInfinite cache if it exists
			queryClient.setQueriesData({ queryKey: [['team', 'listInfinite']] }, (oldData: any) => {
				if (!oldData || !oldData.pages) return oldData;
				return {
					...oldData,
					pages: oldData.pages.map((page: any) => ({
						...page,
						items: page.items.filter((t: any) => t.id !== variables.id),
					}))
				};
			});
		},
		onSuccess: () => {
			toast({ title: "Team deleted successfully" });
		},
		onError: (error) => {
			toast({ title: "Failed to delete team", description: error.message, variant: "destructive" });
		},
		onSettled: () => {
			// Refresh cache in the background to ensure consistency
			utils.team.list.invalidate();
			// @ts-ignore - in case listInfinite isn't defined yet
			if (utils.team.listInfinite) utils.team.listInfinite.invalidate();
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
		query,
		setQuery,
		scope,
		setScope,
		filters,
		setFilters,
	} = useTeamList();

	const [locationTypeFilter, setLocationTypeFilter] = useState<string>("all");
	const [locationFilter, setLocationFilter] = useState<LocationSelection>(null);

	const hasNextPage = (data?.items?.length || 0) === pageSize;
	const hasPreviousPage = page > 1;
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

	const [sort, setSort] = useState<Array<{ id: string; desc: boolean }>>([]);
	const [columnVisibility, setColumnVisibility] = useState<import("@tanstack/react-table").VisibilityState>({});
	const [table, setTable] = useState<import("@tanstack/react-table").Table<any> | null>(null);
	const [selectedGridIds, setSelectedGridIds] = useState<Set<string>>(new Set());

	const handleGridSelect = (id: string, selected: boolean) => {
		setSelectedGridIds((prev) => {
			const next = new Set(prev);
			if (selected) next.add(id); else next.delete(id);
			return next;
		});
	};

	const handleDelete = (id: string, name?: string) => {
		setDeleteTarget({ id, name: name ?? "Untitled Team" });
		setBulkDeleteRows([]);
		setDeleteModalOpen(true);
	};

	const handleBulkDelete = (rows: any[]) => {
		setBulkDeleteRows(rows);
		setDeleteTarget(null);
		setDeleteModalOpen(true);
	};

	const handleConfirmDelete = async () => {
		setDeleteModalOpen(false); // Close modal immediately
		if (bulkDeleteRows.length > 0) {
			for (const row of bulkDeleteRows) {
				deleteMutation.mutate({ id: row.id });
			}
			setSelectedGridIds(new Set());
		} else if (deleteTarget) {
			deleteMutation.mutate({ id: deleteTarget.id });
		}
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
			accessorKey: "name",
			header: ({ column }) => <DataTableColumnHeader column={column} title="Team" />,
			cell: ({ row }) => {
				const team = row.original;
				return (
					<div className="flex flex-col">
						<span
							className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline cursor-pointer"
							onClick={() => handleOpen(team.id)}
						>
							{team.name || "Untitled Team"}
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
			cell: ({ row }) => <EntityStatusBadge status={row.original.status || "ACTIVE"} />,
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
				const team = row.original;
				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="h-8 w-8 p-0 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 hover:font-medium transition-colors cursor-pointer">
								<span className="sr-only">Open menu</span>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => handleOpen(team.id)}>
								<PenSquare className="mr-1 h-4 w-4" />
								Edit Team
							</DropdownMenuItem>
							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onClick={() => handleDelete(team.id, team.name)}
							>
								<Trash className="mr-1 h-4 w-4" />
								Delete Team
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];

	const renderRowContextMenu = (team: any) => (
		<>
			<ContextMenuItem onClick={() => handleOpen(team.id)} className="cursor-pointer">
				<PenSquare className="mr-2 h-4 w-4" /> Edit Team
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => handleDelete(team.id, team.name)}>
				<Trash className="mr-2 h-4 w-4" /> Delete Team
			</ContextMenuItem>
		</>
	);

	const chips = useMemo(() => {
		const result: Array<{ id: string; label: string; onRemove: () => void }> = [];
		if (query) result.push({ id: "q", label: `q: ${query}`, onRemove: () => setQuery("") });
		(filters.industries || []).forEach((ind: string) => {
			result.push({ id: `ind-${ind}`, label: ind, onRemove: () => setFilters((f: any) => ({ ...f, industries: (f.industries || []).filter((x: string) => x !== ind) })) });
		});
		if ((filters as any).status) result.push({ id: "status", label: `status: ${(filters as any).status}`, onRemove: () => setFilters((f: any) => ({ ...f, status: "" as any })) });
		return result;
	}, [query, filters, setFilters, setQuery]);

	const clearAll = () => {
		setQuery("");
		setFilters((f: any) => ({ ...f, industries: [], status: "" as any }));
	};

	const handleOpen = (id: string) => {
		if (!id) return;
		router.push(DASHBOARD_ROUTES.TEAM(id));
	};

	const handleTeamCreated = useCallback(
		(id: string) => {
			setShowCreateModal(false);
			router.push(DASHBOARD_ROUTES.TEAM(id));
		},
		[router]
	);


	return (
		<Shell>
			<div className="space-y-6">
				<div className="space-y-6 p-6">
					{/* Enhanced Header Component */}
					<PageHeader
						title="Teams"
						description="Create new Teams, filter, and manage your submissions."
						actions={
							<Button
								onClick={() => setShowCreateModal(true)}
								className="group flex items-center gap-2 bg-zinc-900 hover:bg-zinc-700 text-white dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 px-4 py-2 h-9 rounded-md transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.98]"
							>
								<Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
								<span className="font-medium text-sm">New Team</span>
							</Button>
						}
					/>

					<UsageQuotaBanner kind="TEAM" />

					<SearchSection
						searchValue={query}
						searchPlaceholder="Search teams..."
						resultsCount={data?.total ?? 0}
						onSearchChange={setQuery}
						onSearchSubmit={() => setPage(1)}
						onCreateNew={() => setShowCreateModal(true)}
						createButtonText="Create New"
						showFilters={false}
						showSort={false}
						viewMode={viewMode}
						onViewModeChange={setViewMode}
					>
						{/* Filter Dropdown */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" className="h-9 px-3 gap-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 transition-all">
									<Filter className="h-4 w-4" />
									<span>Filter</span>
									{(scope !== "all" || (filters as any).status || filters.industries.length > 0 || locationTypeFilter !== "all" || locationFilter) && (
										<span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-200/70 px-1.5 text-xs font-semibold text-zinc-700">
											{(scope !== "all" ? 1 : 0) + ((filters as any).status ? 1 : 0) + (filters.industries.length > 0 ? 1 : 0) + (locationTypeFilter !== "all" ? 1 : 0) + (locationFilter ? 1 : 0)}
										</span>
									)}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-[200px]">
								<div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
									Filter by
								</div>
								<DropdownMenuSeparator />

								<LocationTypeFilterSubmenu
									selectedType={locationTypeFilter}
									onSelectType={setLocationTypeFilter}
									allowedTypes={["workspace", "space", "project", "team"]}
								/>

								<NestedLocationFilterSubmenu
									selectedLocation={locationFilter}
									onSelectLocation={setLocationFilter}
								/>

								<DropdownMenuSub>
									<DropdownMenuSubTrigger className="flex items-center gap-2">
										<Globe className="h-4 w-4 text-zinc-500" />
										<span>Scope</span>
									</DropdownMenuSubTrigger>
									<DropdownMenuPortal>
										<DropdownMenuSubContent>
											<DropdownMenuCheckboxItem checked={scope === "all"} onCheckedChange={() => setScope("all")} className="flex items-center gap-2">
												<Globe className="h-4 w-4 text-zinc-400" />
												<span>All Teams</span>
											</DropdownMenuCheckboxItem>
											<DropdownMenuCheckboxItem checked={scope === "owned"} onCheckedChange={() => setScope("owned")} className="flex items-center gap-2">
												<User className="h-4 w-4 text-blue-500" />
												<span>Owned by me</span>
											</DropdownMenuCheckboxItem>
											<DropdownMenuCheckboxItem checked={scope === "participated"} onCheckedChange={() => setScope("participated")} className="flex items-center gap-2">
												<Users className="h-4 w-4 text-emerald-500" />
												<span>Shared with me</span>
											</DropdownMenuCheckboxItem>
										</DropdownMenuSubContent>
									</DropdownMenuPortal>
								</DropdownMenuSub>

								<DropdownMenuSub>
									<DropdownMenuSubTrigger className="flex items-center gap-2">
										<Circle className="h-4 w-4 text-zinc-500" />
										<span>Status</span>
									</DropdownMenuSubTrigger>
									<DropdownMenuPortal>
										<DropdownMenuSubContent>
											<DropdownMenuCheckboxItem checked={!(filters as any).status} onCheckedChange={() => setFilters((f: any) => ({ ...f, status: "" as any }))} className="flex items-center gap-2">
												<Circle className="h-3.5 w-3.5 text-zinc-400" />
												<span>All Status</span>
											</DropdownMenuCheckboxItem>
											<DropdownMenuCheckboxItem checked={(filters as any).status === "ACTIVE"} onCheckedChange={() => setFilters((f: any) => ({ ...f, status: "ACTIVE" }))} className="flex items-center gap-2">
												<Circle className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500" />
												<span>Active</span>
											</DropdownMenuCheckboxItem>
											<DropdownMenuCheckboxItem checked={(filters as any).status === "ARCHIVED"} onCheckedChange={() => setFilters((f: any) => ({ ...f, status: "ARCHIVED" }))} className="flex items-center gap-2">
												<Circle className="h-3.5 w-3.5 text-zinc-400 fill-zinc-400" />
												<span>Archived</span>
											</DropdownMenuCheckboxItem>
										</DropdownMenuSubContent>
									</DropdownMenuPortal>
								</DropdownMenuSub>
							</DropdownMenuContent>
						</DropdownMenu>

						{/* Columns Dropdown (List View Only) */}
						{viewMode === "list" && table && (() => {
							const hideableColumns = table.getAllColumns().filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide() && column.id !== "name");
							const visibleCount = hideableColumns.filter(c => c.getIsVisible()).length + 1; // +1 for pinned title

							return (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" className="h-9 px-3 gap-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 transition-all">
											<Settings2 className="h-4 w-4" />
											<span>Columns</span>
											<span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-200/70 px-1.5 text-xs font-semibold text-zinc-700">
												{visibleCount}
											</span>
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-[160px]">
										<DropdownMenuCheckboxItem checked={true} onCheckedChange={() => { }} className="opacity-50 cursor-not-allowed">
											Team name
										</DropdownMenuCheckboxItem>
										<DropdownMenuSeparator />
										{hideableColumns.map((column) => (
											<DropdownMenuCheckboxItem
												key={column.id}
												className="capitalize"
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
								{ id: "name", label: "Name" },
								{ id: "status", label: "Status" },
							]}
						/>
					</SearchSection>

					{/* Filter Chips */}
					{chips.length > 0 && (
						<div className="flex flex-wrap items-center gap-2">
							{chips.map((c) => (
								<span
									key={c.id}
									className="group inline-flex items-center gap-1.5 rounded-lg border-2 border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-medium text-cyan-700 transition-all hover:border-cyan-300 hover:shadow-md dark:border-cyan-900 dark:bg-cyan-950/50 dark:text-cyan-300"
								>
									<span>{c.label}</span>
									<button
										type="button"
										onClick={c.onRemove}
										className="rounded-full p-0.5 transition-all hover:bg-cyan-200 dark:hover:bg-cyan-900 cursor-pointer"
										aria-label={`Remove ${c.label} filter`}
									>
										<X className="h-3.5 w-3.5 text-cyan-500 transition-transform group-hover:rotate-90 group-hover:text-cyan-700 dark:text-cyan-400 dark:group-hover:text-cyan-200" />
									</button>
								</span>
							))}
							<button
								onClick={clearAll}
								className="inline-flex items-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400 hover:shadow-md"
							>
								Clear all
							</button>
						</div>
					)}

					{/* Results Grid */}
					{isLoading ? (
						viewMode === "grid" ? (
							<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-4">
								{[...Array(8)].map((_, i) => (
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
							<DataTableSkeleton columnCount={6} rowCount={10} />
						)
					) : data?.items && data.items.length > 0 ? (
						viewMode === "grid" ? (
							<>
								<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-4">
									{data.items.map((p: any) => (
										<TeamCard
											key={p.id}
											item={p}
											onOpen={handleOpen}
											isSelected={selectedGridIds.has(p.id)}
											onSelect={handleGridSelect}
											onDelete={(id) => handleDelete(id, p.name)}
										/>
									))}
								</div>

								{selectedGridIds.size > 0 && (
									<div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-4 rounded-xl border border-zinc-200 bg-white/90 px-5 py-3 shadow-2xl shadow-zinc-200/60 backdrop-blur-md ring-1 ring-zinc-100 animate-in fade-in slide-in-from-bottom-4 duration-200">
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
							/>
						)
					) : (
						<div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/50 to-white shadow-sm">
							<div className="text-center px-6 py-8 max-w-xs">
								{/* Icon */}
								<div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-100 shadow-sm flex items-center justify-center mb-6">
									<Users className="h-7 w-7 text-indigo-500" />
								</div>

								{/* Text */}
								<h3 className="text-base font-semibold text-slate-900">
									{query ? "No results found" : "No teams yet"}
								</h3>
								<p className="mt-2 text-sm text-slate-500 leading-relaxed">
									{query
										? "Try adjusting your search or clearing filters to find what you're looking for."
										: "Invite members and collaborate together."}
								</p>

								{/* Action */}
								{!query && (
									<button
										onClick={() => setShowCreateModal(true)}
										className="mt-6 inline-flex items-center gap-2 rounded-xl px-4 h-10 text-sm font-semibold bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all cursor-pointer"
									>
										<Plus className="h-4 w-4" />
										Create new team
									</button>
								)}
							</div>
						</div>
					)}

					{/* Pagination */}
					{data?.items && data.items.length > 0 && (
						<Pagination
							currentPage={page}
							hasNextPage={hasNextPage}
							hasPreviousPage={hasPreviousPage}
							onPageChange={setPage}
							isLoading={isFetching}
						/>
					)}
				</div>
			</div>
			<TeamCreationModal open={showCreateModal} onOpenChange={setShowCreateModal} onCreated={(id) => router.push(DASHBOARD_ROUTES.TEAM(id))} />
			<ConfirmDeleteModal
				open={deleteModalOpen}
				onOpenChange={setDeleteModalOpen}
				itemName={deleteTarget?.name}
				count={bulkDeleteRows.length > 0 ? bulkDeleteRows.length : 1}
				entityLabel="team"
				onConfirm={handleConfirmDelete}
				isLoading={deleteMutation.isPending}
			/>
		</Shell>
	);
}
