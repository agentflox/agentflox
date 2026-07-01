"use client";
import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Shell from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { SpaceCard, useSpaceList, SpaceCreationModal } from "@/entities/spaces";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { SearchSection } from "@/entities/shared/components/SearchSection";
import { useToast } from "@/hooks/useToast";
import { DASHBOARD_ROUTES } from "@/constants/routes.config";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Filter, MoreHorizontal, Eye, Trash, Trash2, Folder, ArrowUpDown, ChevronUp, ChevronDown, Check, Settings2, LayoutGrid, PenSquare } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
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
import { trpc } from "@/lib/trpc";
import { ConfirmDeleteModal } from "@/components/modals/ConfirmDeleteModal";

export default function SpacesPage() {
    const router = useRouter();
    const { toast } = useToast();
    const {
        data,
        isLoading,
        page,
        pageSize,
        setPage,
        query,
        setQuery,
        scope,
        setScope,
        filters,
        setFilters,
    } = useSpaceList();

    const hasNextPage = (data?.items?.length || 0) === pageSize;
    const hasPreviousPage = page > 1;
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [sort, setSort] = useState<Array<{ id: string; desc: boolean }>>([]);
    const [columnVisibility, setColumnVisibility] = useState<import("@tanstack/react-table").VisibilityState>({});
    const [table, setTable] = useState<import("@tanstack/react-table").Table<any> | null>(null);
    const [selectedGridIds, setSelectedGridIds] = useState<Set<string>>(new Set());

    // Delete modal state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [bulkDeleteRows, setBulkDeleteRows] = useState<any[]>([]);

    const handleGridSelect = (id: string, selected: boolean) => {
        setSelectedGridIds((prev) => {
            const next = new Set(prev);
            if (selected) next.add(id); else next.delete(id);
            return next;
        });
    };

    const utils = trpc.useUtils();
    const deleteMutation = trpc.space.delete.useMutation({
        onSuccess: () => {
            toast({ title: "Space deleted successfully" });
            utils.space.list.invalidate();
        },
        onError: (error) => {
            toast({ title: "Failed to delete space", description: error.message, variant: "destructive" });
        }
    });

    const handleDelete = (id: string) => {
        const item = data?.items?.find((s) => s.id === id);
        setDeleteTarget({ id, name: item?.name ?? "Untitled Space" });
        setBulkDeleteRows([]);
        setDeleteModalOpen(true);
    };

    const handleBulkDelete = (rows: any[]) => {
        setBulkDeleteRows(rows);
        setDeleteTarget(null);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (bulkDeleteRows.length > 0) {
            for (const row of bulkDeleteRows) {
                await deleteMutation.mutateAsync({ id: row.id });
            }
            setSelectedGridIds(new Set());
        } else if (deleteTarget) {
            await deleteMutation.mutateAsync({ id: deleteTarget.id });
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
            header: ({ column }) => <DataTableColumnHeader column={column} title="Space" />,
            cell: ({ row }) => {
                const space = row.original;
                return (
                    <div className="flex flex-col">
                        <span
                            className="font-medium text-foreground hover:underline cursor-pointer"
                            onClick={() => router.push(`/dashboard/spaces/${space.id}`)}
                        >
                            {space.name || "Untitled Space"}
                        </span>
                        {space.description && (
                            <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                                {space.description}
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
                const status = row.original.status || "active";
                return (
                    <Badge variant={status === "active" ? "default" : "secondary"}>
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
                const space = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/spaces/${space.id}`)}>
                                <PenSquare className="mr-1 h-4 w-4" />
                                Edit Space
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-red-600 focus:text-red-600 dark:text-red-500 dark:focus:text-red-500"
                                onClick={() => handleDelete(space.id)}
                            >
                                <Trash2 className="mr-1 h-4 w-4" />
                                Delete Space
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
        if (filters.status) {
            chips.push({
                id: "status",
                label: `Status: ${filters.status}`,
                onRemove: () => setFilters((prev) => ({ ...prev, status: undefined })),
            });
        }
        // Add workspace filter chip if relevant
        if (filters.workspaceId) {
            chips.push({
                id: "workspace",
                label: "Workspace filtered", // Ideally we'd look up the name
                onRemove: () => setFilters((prev) => ({ ...prev, workspaceId: undefined })),
            });
        }
        return chips;
    }, [query, filters, setQuery, setFilters]);

    const clearFilters = () => {
        setQuery("");
        setFilters({ status: undefined, workspaceId: undefined });
    };

    const handleCreateSpace = () => setShowCreateModal(true);

    return (
        <Shell>
            <div className="space-y-6">
                <div className="space-y-6">
                    <PageHeader
                        title="Spaces"
                        description="Manage your team spaces across all workspaces."
                        actions={
                            <Button
                                onClick={handleCreateSpace}
                                className="group flex items-center gap-2 bg-zinc-900 hover:bg-zinc-700 text-white dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 px-4 py-2 h-9 rounded-md transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.98]"
                            >
                                <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                                <span className="font-medium text-sm">New Space</span>
                            </Button>
                        }
                    />

                    <SearchSection
                        searchValue={query}
                        searchPlaceholder="Search spaces..."
                        resultsCount={data?.total ?? 0}
                        onSearchChange={setQuery}
                        onSearchSubmit={() => setPage(1)}
                        onCreateNew={handleCreateSpace}
                        createButtonText="New space"
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
                                    {(scope !== "all" || filters.status || filters.workspaceId) && (
                                        <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-200/70 px-1.5 text-xs font-semibold text-zinc-700">
                                            {(scope !== "all" ? 1 : 0) + (filters.status ? 1 : 0) + (filters.workspaceId ? 1 : 0)}
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
                                            <DropdownMenuCheckboxItem checked={scope === "all"} onCheckedChange={() => setScope("all")}>All Spaces</DropdownMenuCheckboxItem>
                                            <DropdownMenuCheckboxItem checked={scope === "owned"} onCheckedChange={() => setScope("owned")}>Owned by me</DropdownMenuCheckboxItem>
                                            <DropdownMenuCheckboxItem checked={scope === "member"} onCheckedChange={() => setScope("member")}>Shared with me</DropdownMenuCheckboxItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>

                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                        <DropdownMenuSubContent>
                                            <DropdownMenuCheckboxItem checked={!filters.status} onCheckedChange={() => setFilters((prev) => ({ ...prev, status: undefined }))}>All Status</DropdownMenuCheckboxItem>
                                            <DropdownMenuCheckboxItem checked={filters.status === "active"} onCheckedChange={() => setFilters((prev) => ({ ...prev, status: "active" }))}>Active</DropdownMenuCheckboxItem>
                                            <DropdownMenuCheckboxItem checked={filters.status === "archived"} onCheckedChange={() => setFilters((prev) => ({ ...prev, status: "archived" }))}>Archived</DropdownMenuCheckboxItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Columns Dropdown (List View Only) */}
                        {viewMode === "list" && table && (() => {
                            const hideableColumns = table.getAllColumns().filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide() && column.id !== "name");
                            const totalCount = hideableColumns.length + 1; // +1 for pinned name
                            const visibleCount = hideableColumns.filter(c => c.getIsVisible()).length + 1;

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
                                            Space name
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
                                        { id: "name", label: "Space Name" },
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
                            <Button
                                variant="ghost"
                                onClick={clearFilters}
                                className="h-7 px-2 text-xs text-zinc-500 hover:text-zinc-900"
                            >
                                Clear all
                            </Button>
                        </div>
                    )}

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
                                    {data.items.map((item) => (
                                        <SpaceCard
                                            key={item.id}
                                            item={item}
                                            isSelected={selectedGridIds.has(item.id)}
                                            onSelect={handleGridSelect}
                                            onDelete={handleDelete}
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
                            <DataTable columns={columns} data={data.items} onDeleteSelected={handleBulkDelete} onTableReady={setTable} hideToolbar columnVisibility={columnVisibility} onColumnVisibilityChange={setColumnVisibility} />
                        )
                    ) : (
                        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/50 to-white shadow-sm">
                            <div className="text-center px-6 py-8 max-w-xs">
                                <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-100 shadow-sm flex items-center justify-center mb-6">
                                    <LayoutGrid className="h-7 w-7 text-indigo-500" />
                                </div>
                                <h3 className="text-base font-semibold text-slate-900">
                                    {query ? "No results found" : "No spaces yet"}
                                </h3>
                                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                                    {query
                                        ? "Try adjusting your search or clearing filters to find what you're looking for."
                                        : "Create and manage your spaces to start organizing your work."}
                                </p>
                                {!query && (
                                    <button
                                        onClick={handleCreateSpace}
                                        className="mt-6 inline-flex items-center gap-2 rounded-xl px-4 h-10 text-sm font-semibold bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all cursor-pointer"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Create new space
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {data?.items && data.items.length > 0 && (
                        <Pagination
                            currentPage={page}
                            hasNextPage={hasNextPage}
                            hasPreviousPage={hasPreviousPage}
                            onPageChange={setPage}
                            isLoading={isLoading}
                        />
                    )}
                </div>
            </div>
            <SpaceCreationModal
                open={showCreateModal}
                onOpenChange={setShowCreateModal}
                workspaceId="" // Empty string or undefined to trigger selector logic
                onSuccess={() => {
                    toast({ title: "Space created", description: "Space successfully created." });
                    // The list should auto-refresh due to invalidation in modal
                }}
            />
            <ConfirmDeleteModal
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                itemName={deleteTarget?.name}
                count={bulkDeleteRows.length > 0 ? bulkDeleteRows.length : 1}
                entityLabel="space"
                onConfirm={handleConfirmDelete}
                isLoading={deleteMutation.isPending}
            />
        </Shell>
    );
}
