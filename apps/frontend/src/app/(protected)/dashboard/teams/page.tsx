"use client";
import { Plus, X } from "lucide-react";
import Shell from "@/components/layout/Shell";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { SearchSection } from "@/entities/shared/components/SearchSection";
import TeamCard from "@/entities/teams/components/TeamCard";
import TeamFilterSidebar from "@/entities/teams/components/TeamFilterSidebar";
import { useTeamList } from "@/entities/teams/hooks/useTeamList";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { useRouter } from "next/navigation";
import React, { useCallback, useMemo, useState } from "react";
import { DASHBOARD_ROUTES, MARKETPLACE_ROUTES } from '@/constants/routes.config';
import { TeamCreationModal } from "@/entities/teams/components/TeamCreationModal";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Filter, Tag, MoreHorizontal, Eye, Trash } from "lucide-react";
import { INDUSTRY_OPTIONS } from "@/constants/shares";
import { DataTable } from "@/components/ui/data-table";
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
import { Settings2, ArrowUpDown, Check, ChevronUp, ChevronDown, MoreVertical } from "lucide-react";
import { DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";

export default function TeamsPage() {
	const router = useRouter();
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

	const handleBulkDelete = (rows: any[]) => {
		console.log("Delete teams: ", rows.map((r: any) => r.id));
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
							className="font-medium text-foreground hover:underline cursor-pointer"
							onClick={() => handleOpen(team.id)}
						>
							{team.name || "Untitled Team"}
						</span>
						{team.description && (
							<span className="text-xs text-muted-foreground truncate max-w-[250px]">
								{team.description}
							</span>
						)}
					</div>
				);
			},
		},
		{
			accessorKey: "status",
			header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
			cell: ({ row }) => {
				const status = row.original.status || "ACTIVE";
				return (
					<Badge variant={status === "ACTIVE" ? "default" : "secondary"}>
						{status}
					</Badge>
				);
			},
		},
		{
			id: "updatedAt",
			accessorKey: "updatedAt",
			header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
			cell: ({ row }) => {
				if (!row.original.updatedAt) return null;
				return (
					<span className="text-sm text-muted-foreground">
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
							<Button variant="ghost" className="h-8 w-8 p-0">
								<span className="sr-only">Open menu</span>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => handleOpen(team.id)}>
								<Eye className="mr-2 h-4 w-4" />
								View
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onClick={() => console.log("Delete", team.id)}
							>
								<Trash className="mr-2 h-4 w-4" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];

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
				<div className="space-y-6">
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

					<SearchSection
						searchValue={query}
						searchPlaceholder="Search Teams by title or keyword..."
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
									{(scope !== "all" || (filters as any).status || filters.industries.length > 0) && (
										<span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-200/70 px-1.5 text-xs font-semibold text-zinc-700">
											{(scope !== "all" ? 1 : 0) + ((filters as any).status ? 1 : 0) + (filters.industries.length > 0 ? 1 : 0)}
										</span>
									)}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-[180px]">
								<div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
									Filter by
								</div>
								<DropdownMenuSeparator />

								<DropdownMenuSub>
									<DropdownMenuSubTrigger>Scope</DropdownMenuSubTrigger>
									<DropdownMenuPortal>
										<DropdownMenuSubContent>
											<DropdownMenuCheckboxItem checked={scope === "all"} onCheckedChange={() => setScope("all")}>All Teams</DropdownMenuCheckboxItem>
											<DropdownMenuCheckboxItem checked={scope === "owned"} onCheckedChange={() => setScope("owned")}>Owned by me</DropdownMenuCheckboxItem>
											<DropdownMenuCheckboxItem checked={scope === "member"} onCheckedChange={() => setScope("member")}>Shared with me</DropdownMenuCheckboxItem>
										</DropdownMenuSubContent>
									</DropdownMenuPortal>
								</DropdownMenuSub>

								<DropdownMenuSub>
									<DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
									<DropdownMenuPortal>
										<DropdownMenuSubContent>
											<DropdownMenuCheckboxItem checked={!(filters as any).status} onCheckedChange={() => setFilters((f: any) => ({ ...f, status: "" as any }))}>All Status</DropdownMenuCheckboxItem>
											<DropdownMenuCheckboxItem checked={(filters as any).status === "ACTIVE"} onCheckedChange={() => setFilters((f: any) => ({ ...f, status: "ACTIVE" }))}>Active</DropdownMenuCheckboxItem>
											<DropdownMenuCheckboxItem checked={(filters as any).status === "ARCHIVED"} onCheckedChange={() => setFilters((f: any) => ({ ...f, status: "ARCHIVED" }))}>Archived</DropdownMenuCheckboxItem>
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
						<Popover>
							<PopoverTrigger asChild>
								<Button
									variant="ghost"
									className="h-9 gap-1.5 px-3 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 transition-all cursor-pointer rounded-md outline-hidden focus:ring-0 focus-visible:ring-0"
								>
									<ArrowUpDown className="h-4 w-4" />
									<span>Sort</span>
									{sort.length > 0 && (
										<span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-200/70 px-1.5 text-xs font-semibold text-zinc-700">
											{sort.length}
										</span>
									)}
								</Button>
							</PopoverTrigger>
							<PopoverContent align="end" className="w-[240px] p-1.5 rounded-xl shadow-xl border-zinc-200" sideOffset={8}>
								<div className="px-2 py-1.5 mb-1">
									<span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Sort By</span>
								</div>
								<div className="space-y-0.5">
									<div
										className="flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-zinc-50 transition-colors text-zinc-600"
										onClick={() => setSort([])}
									>
										<span className="flex-1">None (default)</span>
										{sort.length === 0 && <Check className="h-3.5 w-3.5 text-zinc-900" />}
									</div>
									{[
										{ id: "name", label: "Name" },
										{ id: "status", label: "Status" },
										{ id: "updatedAt", label: "Updated Date" },
									].map((opt) => {
										const currentSortIndex = sort.findIndex(s => s.id === opt.id);
										const isSelected = currentSortIndex >= 0;
										const currentSort = isSelected ? sort[currentSortIndex] : null;

										return (
											<div
												key={opt.id}
												className={cn(
													"flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors group/item",
													isSelected ? "bg-zinc-50 text-zinc-900" : "text-zinc-600 hover:bg-zinc-100"
												)}
												onClick={() => {
													if (isSelected) setSort(s => s.filter(i => i.id !== opt.id));
													else setSort(s => [...s, { id: opt.id, desc: false }]);
												}}
											>
												<div
													className="h-5 w-5 flex items-center justify-center rounded hover:bg-zinc-200 transition-colors"
													onClick={(e) => {
														e.stopPropagation();
														if (isSelected) setSort(s => s.map(i => i.id === opt.id ? { ...i, desc: !i.desc } : i));
														else setSort(s => [...s, { id: opt.id, desc: false }]);
													}}
												>
													{isSelected &&
														<div className="flex flex-col items-center -space-y-1">
															<ChevronUp className={`h-3.5 w-3.5 ${currentSort?.desc ? 'text-zinc-800' : 'text-zinc-300'}`} />
															<ChevronDown className={`h-3.5 w-3.5 ${currentSort?.desc ? 'text-zinc-300' : 'text-zinc-800'}`} />
														</div>
													}
												</div>
												<span className="flex-1">{opt.label}</span>
												{isSelected && <Check className="h-3.5 w-3.5 text-zinc-900" />}
											</div>
										);
									})}
								</div>
							</PopoverContent>
						</Popover>
					</SearchSection>

					{/* Filter Chips */}
					{chips.length > 0 && (
						<div className="flex flex-wrap items-center gap-2">
							{chips.map((c) => (
								<button
									key={c.id}
									onClick={c.onRemove}
									className="group inline-flex items-center gap-2 rounded-lg border-2 border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-medium text-cyan-700 transition-all hover:bg-cyan-100 hover:border-cyan-300 hover:shadow-md"
								>
									<span>{c.label}</span>
									<X className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
								</button>
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
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
								{Array.from({ length: 9 }).map((_, i) => (
									<div key={i} className="min-h-[220px] animate-pulse rounded-lg border bg-muted/30" />
								))}
							</div>
						) : (
							<DataTableSkeleton columnCount={6} rowCount={10} />
						)
					) : data?.items && data.items.length > 0 ? (
						viewMode === "grid" ? (
							<>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
									{data.items.map((p: any) => (
										<TeamCard
											key={p.id}
											item={p}
											onOpen={handleOpen}
											isSelected={selectedGridIds.has(p.id)}
											onSelect={handleGridSelect}
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
										<Button variant="destructive" size="sm" onClick={() => { console.log("Delete:", [...selectedGridIds]); setSelectedGridIds(new Set()); }} className="h-8 gap-1.5 px-3 cursor-pointer">
											<Trash className="h-3.5 w-3.5" />
											Delete Selected
										</Button>
									</div>
								)}
							</>
						) : (
							<DataTable columns={columns} data={data.items} onDeleteSelected={handleBulkDelete} onTableReady={setTable} hideToolbar columnVisibility={columnVisibility} onColumnVisibilityChange={setColumnVisibility} />
						)
					) : (
						<div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/50">
							<div className="text-center">
								<div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center mb-4">
									<Plus className="h-8 w-8 text-cyan-600" />
								</div>
								<h3 className="mt-4 text-lg font-semibold text-gray-900">No Teams found</h3>
								<p className="mb-4 mt-2 text-sm text-muted-foreground">
									{query ? "Try adjusting your search or filters" : "Get started by creating your first team"}
								</p>
								{!query && (
									<Button onClick={() => setShowCreateModal(true)} variant="outline" className="mt-4">
										<Plus className="mr-2 h-4 w-4" />
										Create Your First Team
									</Button>
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
			<TeamCreationModal open={showCreateModal} onOpenChange={setShowCreateModal} onCreated={handleTeamCreated} />
		</Shell>
	);
}
