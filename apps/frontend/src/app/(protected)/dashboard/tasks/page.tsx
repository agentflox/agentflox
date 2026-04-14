"use client";
import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Shell from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { SearchSection } from "@/entities/shared/components/SearchSection";
import { TaskCard, TaskFilterSidebar, useTaskList } from "@/entities/task";
import { TaskCreationModal } from "@/entities/task/components/TaskCreationModal";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Filter, Eye, MoreHorizontal, Trash, ArrowUpDown, ChevronUp, ChevronDown, Check, Settings2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuSubContent,
	DropdownMenuPortal,
	DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export default function TasksPage() {
	const router = useRouter();
	const { toast } = useToast();
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
	} = useTaskList();

	const { data: workspaces } = trpc.workspace.list.useQuery({ includeCounts: false }, { staleTime: 30000 });
	const defaultWorkspaceId = workspaces?.items?.[0]?.id;

	const createTask = trpc.task.create.useMutation();
	const convertTask = trpc.task.createProposalFromTask.useMutation();
	const hasNextPage = (data?.items?.length || 0) === pageSize;
	const hasPreviousPage = page > 1;
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
		console.log("Delete tasks: ", rows.map((r: any) => r.id));
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
							className="font-medium text-foreground hover:underline cursor-pointer"
							onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
						>
							{task.title || "Untitled Task"}
						</span>
						{task.description && (
							<span className="text-xs text-muted-foreground truncate max-w-[250px]">
								{task.description}
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
				const status = row.original.status || "OPEN";
				return (
					<Badge variant={status === "COMPLETED" ? "default" : status === "IN_PROGRESS" ? "secondary" : "outline"}>
						{String(status).replace(/_/g, " ")}
					</Badge>
				);
			},
		},
		{
			accessorKey: "visibility",
			header: ({ column }) => <DataTableColumnHeader column={column} title="Visibility" />,
			cell: ({ row }) => {
				const visibility = row.original.visibility;
				if (!visibility) return <span className="text-muted-foreground">-</span>;
				return <Badge variant="outline">{visibility}</Badge>;
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
				const task = row.original;
				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="h-8 w-8 p-0">
								<span className="sr-only">Open menu</span>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => router.push(`/dashboard/tasks/${task.id}`)}>
								<Eye className="mr-2 h-4 w-4" />
								View
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onClick={() => console.log("Delete", task.id)}
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

	const filterChips = useMemo(() => {
		const chips: Array<{ id: string; label: string; onRemove: () => void }> = [];
		if (query) {
			chips.push({ id: "query", label: `Search: ${query}`, onRemove: () => setQuery("") });
		}
		if (filters.statuses.length) {
			chips.push({
				id: "status",
				label: `Status: ${filters.statuses.join(", ")}`,
				onRemove: () => setFilters((prev) => ({ ...prev, statuses: [] })),
			});
		}
		if (filters.visibility) {
			chips.push({
				id: "visibility",
				label: `Visibility: ${filters.visibility}`,
				onRemove: () => setFilters((prev) => ({ ...prev, visibility: undefined })),
			});
		}
		return chips;
	}, [query, filters, setQuery, setFilters]);

	const clearFilters = () => {
		setQuery("");
		setFilters({ statuses: [], visibility: undefined });
	};

	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const handleCreateTask = () => setIsCreateModalOpen(true);

	const handleConvertToProposal = async (taskId: string) => {
		try {
			const proposal = await convertTask.mutateAsync({ taskId, category: "PARTNER" } as any);
			toast({ title: "Proposal created", description: "Redirecting to proposal details…" });
			router.push(`/dashboard/proposals/${proposal?.id}`);
			toast({ title: "Proposal created", description: "Redirecting to proposal details…" });
		} catch (error) {
			console.error(error);
			toast({
				title: "Unable to convert task",
				description: "Conversion failed. Please try again.",
				variant: "destructive",
			});
		}
	};

	return (
		<Shell>
			<div className="space-y-6">
				<div className="space-y-4">
					<PageHeader
						title="Tasks"
						description="Capture work items and collaboration opportunities across your workspace."
						actions={
							<Button
								onClick={handleCreateTask}
								className="group flex items-center gap-2 bg-zinc-900 hover:bg-zinc-700 text-white dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 px-4 py-2 h-9 rounded-md transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.98]"
							>
								<Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
								<span className="font-medium text-sm">New task</span>
							</Button>
						}
					/>

					<SearchSection
						searchValue={query}
						searchPlaceholder="Search tasks by title or description..."
						resultsCount={data?.total ?? 0}
						onSearchChange={setQuery}
						onSearchSubmit={() => setPage(1)}
						onCreateNew={handleCreateTask}
						createButtonText="New task"
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
									{(scope !== "all" || filters.statuses.length > 0 || filters.visibility) && (
										<span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-200/70 px-1.5 text-xs font-semibold text-zinc-700">
											{(scope !== "all" ? 1 : 0) + (filters.statuses.length > 0 ? 1 : 0) + (filters.visibility ? 1 : 0)}
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
											<DropdownMenuCheckboxItem checked={scope === "all"} onCheckedChange={() => setScope("all")}>All Tasks</DropdownMenuCheckboxItem>
											<DropdownMenuCheckboxItem checked={scope === "owned"} onCheckedChange={() => setScope("owned")}>Owned by me</DropdownMenuCheckboxItem>
											<DropdownMenuCheckboxItem checked={scope === "assigned"} onCheckedChange={() => setScope("assigned")}>Assigned</DropdownMenuCheckboxItem>
										</DropdownMenuSubContent>
									</DropdownMenuPortal>
								</DropdownMenuSub>

								<DropdownMenuSub>
									<DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
									<DropdownMenuPortal>
										<DropdownMenuSubContent>
											{["OPEN", "IN_PROGRESS", "COMPLETED", "ARCHIVED"].map((s) => (
												<DropdownMenuCheckboxItem
													key={s}
													checked={filters.statuses.includes(s)}
													onCheckedChange={(checked) => {
														setFilters((prev) => ({
															...prev,
															statuses: checked
																? [...prev.statuses, s]
																: prev.statuses.filter((t) => t !== s),
														}));
													}}
												>
													{s.replace(/_/g, " ")}
												</DropdownMenuCheckboxItem>
											))}
										</DropdownMenuSubContent>
									</DropdownMenuPortal>
								</DropdownMenuSub>

								<DropdownMenuSub>
									<DropdownMenuSubTrigger>Visibility</DropdownMenuSubTrigger>
									<DropdownMenuPortal>
										<DropdownMenuSubContent>
											<DropdownMenuCheckboxItem checked={!filters.visibility} onCheckedChange={() => setFilters((prev) => ({ ...prev, visibility: undefined }))}>Any</DropdownMenuCheckboxItem>
											<DropdownMenuCheckboxItem checked={filters.visibility === "PUBLIC"} onCheckedChange={() => setFilters((prev) => ({ ...prev, visibility: "PUBLIC" }))}>Public</DropdownMenuCheckboxItem>
											<DropdownMenuCheckboxItem checked={filters.visibility === "PRIVATE"} onCheckedChange={() => setFilters((prev) => ({ ...prev, visibility: "PRIVATE" }))}>Private</DropdownMenuCheckboxItem>
										</DropdownMenuSubContent>
									</DropdownMenuPortal>
								</DropdownMenuSub>
							</DropdownMenuContent>
						</DropdownMenu>

						{/* Columns Dropdown (List View Only) */}
						{viewMode === "list" && table && (() => {
							const hideableColumns = table.getAllColumns().filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide() && column.id !== "title");
							const totalCount = hideableColumns.length + 1; // +1 for pinned title
							const visibleCount = hideableColumns.filter(c => c.getIsVisible()).length + 1; // +1 for pinned title
							const isModified = visibleCount < totalCount;

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
										{/* Title — always pinned visible */}
										<DropdownMenuCheckboxItem
											checked={true}
											onCheckedChange={() => { }}
											className="opacity-50 cursor-not-allowed"
										>
											Task name
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
										{ id: "status", label: "Status" },
										{ id: "title", label: "Task Name" },
										{ id: "visibility", label: "Visibility" },
										{ id: "createdAt", label: "Date created" },
										{ id: "updatedAt", label: "Date updated" },
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
													if (isSelected) {
														setSort(s => s.filter(i => i.id !== opt.id));
													} else {
														setSort(s => [...s, { id: opt.id, desc: false }]);
													}
												}}
											>
												<div
													className="h-5 w-5 flex items-center justify-center rounded hover:bg-zinc-200 transition-colors"
													onClick={(e) => {
														e.stopPropagation();
														if (isSelected) {
															setSort(s => s.map(i => i.id === opt.id ? { ...i, desc: !i.desc } : i));
														} else {
															setSort(s => [...s, { id: opt.id, desc: false }]);
														}
													}}
												>
													{isSelected &&
														<div className="flex flex-col items-center -space-y-1">
															<ChevronUp
																className={`h-3.5 w-3.5 ${currentSort?.desc ? 'text-zinc-800' : 'text-zinc-300'}`}
															/>
															<ChevronDown
																className={`h-3.5 w-3.5 ${currentSort?.desc ? 'text-zinc-300' : 'text-zinc-800'}`}
															/>
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

					{filterChips.length > 0 && (
						<div className="flex flex-wrap items-center gap-2 mt-[-20px] mb-6">
							{filterChips.map((chip) => (
								<button
									key={chip.id}
									onClick={chip.onRemove}
									className="group inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white pl-2.5 pr-2 py-1 text-xs font-medium text-zinc-700 transition-all hover:bg-zinc-50 hover:border-zinc-300 cursor-pointer"
								>
									<span>{chip.label}</span>
									<div className="flex items-center justify-center rounded-full p-0.5 transition-colors group-hover:bg-zinc-200/60">
										<X className="h-3 w-3 text-zinc-400 group-hover:text-zinc-700" />
									</div>
								</button>
							))}
							<Button variant="ghost" onClick={clearFilters} className="h-7 px-2 text-xs text-zinc-500 hover:text-zinc-900">
								Clear all
							</Button>
						</div>
					)}

					{isLoading ? (
						viewMode === "grid" ? (
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
								{Array.from({ length: 6 }).map((_, index) => (
									<div key={index} className="min-h-[220px] animate-pulse rounded-lg border bg-muted/30" />
								))}
							</div>
						) : (
							<DataTableSkeleton columnCount={6} rowCount={10} />
						)
					) : data?.items && data.items.length > 0 ? (
						viewMode === "grid" ? (
							<>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
									{data.items.map((item) => (
										<TaskCard
											key={item.id}
											item={item}
											onOpen={(id) => router.push(`/dashboard/tasks/${id}`)}
											onConvert={handleConvertToProposal}
											isSelected={selectedGridIds.has(item.id)}
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
						<div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-muted/10 p-8 text-center">
							<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100">
								<Plus className="h-8 w-8 text-emerald-600" />
							</div>
							<h3 className="mt-4 text-lg font-semibold text-foreground">No tasks yet</h3>
							<p className="mt-2 text-sm text-muted-foreground">
								{query ? "Try a different search or reset your filters." : "Create a task to track upcoming work."}
							</p>
							<Button onClick={handleCreateTask} variant="outline" className="mt-4">
								<Plus className="mr-2 h-4 w-4" />
								Add task
							</Button>
						</div>
					)}

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
			<TaskCreationModal
				open={isCreateModalOpen}
				onOpenChange={setIsCreateModalOpen}
				context="GENERAL"
				workspaceId={defaultWorkspaceId}
			/>
		</Shell>
	);
}


