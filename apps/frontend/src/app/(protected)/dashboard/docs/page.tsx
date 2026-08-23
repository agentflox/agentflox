"use client";

import { useMemo, useState } from "react";
import Shell from "@/components/layout/Shell";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, FileText, X, ArrowUpDown, Check, ChevronUp, ChevronDown, Settings2, MoreHorizontal, Trash, PenSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { SearchSection } from "@/entities/shared/components/SearchSection";
import { Pagination } from "@/components/ui/pagination";
import { LazyDataTable as DataTable } from "@/components/ui/lazy-data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { useDocumentList, DocumentCreationModal, DocumentCard } from "@/entities/documents";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ConfirmDeleteModal } from "@/components/modals/ConfirmDeleteModal";
import { useToast } from "@/hooks/useToast";

import {
  LocationTypeFilterSubmenu,
  NestedLocationFilterSubmenu,
  DashboardSortPopover,
  LocationSelection,
} from "@/features/dashboard/components/shared/DashboardFilterSubmenus";
import { Filter } from "lucide-react";

export default function DocsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<Array<{ id: string; desc: boolean }>>([]);
  const [columnVisibility, setColumnVisibility] = useState<import("@tanstack/react-table").VisibilityState>({});
  const [table, setTable] = useState<import("@tanstack/react-table").Table<any> | null>(null);
  const [selectedGridIds, setSelectedGridIds] = useState<Set<string>>(new Set());

  const [locationTypeFilter, setLocationTypeFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<LocationSelection>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [bulkDeleteRows, setBulkDeleteRows] = useState<any[]>([]);

  const {
    data,
    isLoading,
    page,
    pageSize,
    setPage,
    query,
    setQuery,
    documents,
  } = useDocumentList({
    pageSize: 12,
    initialFilters: {
      parentId: null,
      workspaceId: locationFilter?.type === "workspace" ? locationFilter.id : undefined,
      spaceId: locationFilter?.type === "space" ? locationFilter.id : undefined,
      projectId: locationFilter?.type === "project" ? locationFilter.id : undefined,
    }
  });

  const hasNextPage = (data?.items?.length || 0) === pageSize;
  const hasPreviousPage = page > 1;
  const isFetching = false; // useDocumentList doesn't expose isFetching directly

  const handleGridSelect = (id: string, selected: boolean) => {
    setSelectedGridIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id); else next.delete(id);
      return next;
    });
  };

  // Optimistic delete mutation
  const deleteDoc = trpc.document.delete.useMutation({
    onMutate: async (variables) => {
      queryClient.setQueriesData({ queryKey: [['document', 'list']] }, (oldData: any) => {
        if (!oldData || !oldData.items) return oldData;
        return {
          ...oldData,
          items: oldData.items.filter((d: any) => d.id !== variables.id),
          total: Math.max(0, oldData.total - 1),
        };
      });
    },
    onSuccess: () => {
      toast({ title: "Document deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete document", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      utils.document.list.invalidate();
    },
  });

  const handleDelete = (id: string, name?: string) => {
    setDeleteTarget({ id, name: name ?? "Untitled Document" });
    setBulkDeleteRows([]);
    setDeleteModalOpen(true);
  };

  const handleBulkDelete = (rows: any[]) => {
    if (rows.length === 0) return;
    setBulkDeleteRows(rows);
    setDeleteTarget(null);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteModalOpen(false);
    if (bulkDeleteRows.length > 0) {
      for (const row of bulkDeleteRows) {
        deleteDoc.mutate({ id: row.id });
      }
      setSelectedGridIds(new Set());
    } else if (deleteTarget) {
      deleteDoc.mutate({ id: deleteTarget.id });
    }
  };

import { ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";

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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Document" />,
      cell: ({ row }) => {
        const doc = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex flex-col min-w-0">
              <span
                className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline cursor-pointer truncate"
                onClick={() => router.push(`/dashboard/docs/${doc.id}`)}
              >
                {doc.title || "Untitled Document"}
              </span>
            </div>
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
          <span className="text-xs text-zinc-500 line-clamp-1 max-w-[260px]" title={desc}>
            {desc || "-"}
          </span>
        );
      },
    },
    {
      id: "owner",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Creator" />,
      cell: ({ row }) => {
        const owner = row.original.owner || row.original.user || row.original.creator;
        if (!owner) return <span className="text-xs text-zinc-500">You</span>;
        return (
          <div className="flex items-center gap-2">
            {owner.avatar || owner.image ? (
              <img
                src={owner.avatar || owner.image}
                alt={owner.name || "User"}
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              <div className="h-5 w-5 rounded-full bg-zinc-200 text-[10px] font-bold flex items-center justify-center text-zinc-700">
                {(owner.name || "U")[0].toUpperCase()}
              </div>
            )}
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{owner.name || "You"}</span>
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
      accessorKey: "updatedAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last Updated" />,
      cell: ({ row }) => (
        <span className="text-xs text-zinc-500 whitespace-nowrap">
          {formatDistanceToNow(new Date(row.original.updatedAt), { addSuffix: true })}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const doc = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 hover:font-medium transition-colors cursor-pointer">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/dashboard/docs/${doc.id}`)}>
                <PenSquare className="mr-1 h-4 w-4" /> Edit Document
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => handleDelete(doc.id, doc.title)}
              >
                <Trash className="mr-1 h-4 w-4" /> Delete Document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const renderRowContextMenu = (doc: any) => (
    <>
      <ContextMenuItem onClick={() => router.push(`/dashboard/docs/${doc.id}`)} className="cursor-pointer">
        <PenSquare className="mr-2 h-4 w-4" /> Edit Document
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => handleDelete(doc.id, doc.title)}>
        <Trash className="mr-2 h-4 w-4" /> Delete Document
      </ContextMenuItem>
    </>
  );

  return (
    <Shell>
      <div className="space-y-6">
        <div className="space-y-6 pb-6">
          <PageHeader
            title="Documents"
            description="Create and organize your documentation"
            actions={
              <Button
                onClick={() => setShowCreateModal(true)}
                className="group flex items-center gap-2 bg-zinc-900 hover:bg-zinc-700 text-white dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 px-4 py-2 h-9 rounded-md transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                <span className="font-medium text-sm">New Document</span>
              </Button>
            }
          />

          <SearchSection
            searchValue={query}
            searchPlaceholder="Search documents by title or keyword..."
            resultsCount={data?.total ?? 0}
            onSearchChange={setQuery}
            onSearchSubmit={() => setPage(1)}
            onCreateNew={() => setShowCreateModal(true)}
            createButtonText="New Document"
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
                  {(locationTypeFilter !== "all" || locationFilter) && (
                    <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-200/70 px-1.5 text-xs font-semibold text-zinc-700">
                      {(locationTypeFilter !== "all" ? 1 : 0) + (locationFilter ? 1 : 0)}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Filter by</div>
                <DropdownMenuSeparator />

                <LocationTypeFilterSubmenu
                  selectedType={locationTypeFilter}
                  onSelectType={setLocationTypeFilter}
                />

                <NestedLocationFilterSubmenu
                  selectedLocation={locationFilter}
                  onSelectLocation={setLocationFilter}
                />
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Columns Dropdown (List View Only) */}
            {viewMode === "list" && table && (() => {
              const hideableColumns = table.getAllColumns().filter(
                (column) => typeof column.accessorFn !== "undefined" && column.getCanHide() && column.id !== "title"
              );
              const visibleCount = hideableColumns.filter((c) => c.getIsVisible()).length + 1;
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
                      Document
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
                { id: "title", label: "Title" },
              ]}
            />
          </SearchSection>

          {/* Filter Chips */}
          {query && (
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="group inline-flex items-center gap-1.5 rounded-lg border-2 border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-medium text-cyan-700 transition-all hover:border-cyan-300 hover:shadow-md dark:border-cyan-900 dark:bg-cyan-950/50 dark:text-cyan-300"
              >
                <span>q: {query}</span>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="rounded-full p-0.5 transition-all hover:bg-cyan-200 dark:hover:bg-cyan-900 cursor-pointer"
                  aria-label="Remove query filter"
                >
                  <X className="h-3.5 w-3.5 text-cyan-500 transition-transform group-hover:rotate-90 group-hover:text-cyan-700 dark:text-cyan-400 dark:group-hover:text-cyan-200" />
                </button>
              </span>
              <button
                onClick={() => setQuery("")}
                className="inline-flex items-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400 hover:shadow-md"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Documents Listing */}
          {isLoading ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="relative flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm p-6 pt-10 overflow-hidden">
                    <div className="flex items-start gap-3 mb-4">
                      <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-2 min-w-0">
                        <Skeleton className="h-4 w-[70%] rounded-md" />
                        <Skeleton className="h-3 w-[40%] rounded-md opacity-60" />
                      </div>
                    </div>
                    <Skeleton className="h-3.5 w-full rounded-md" />
                    <Skeleton className="h-3.5 w-[60%] rounded-md mt-1.5" />
                    <div className="flex items-center gap-2 pt-4 border-t border-slate-100 mt-6">
                      <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                      <Skeleton className="h-3 w-24 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <DataTableSkeleton columnCount={4} rowCount={10} />
            )
          ) : documents && documents.length > 0 ? (
            viewMode === "grid" ? (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-4">
                  {documents.map((doc: any) => {
                    // Adapt document model to the shape DocumentCard expects (it expects view-like shape)
                    const adapted = {
                      ...doc,
                      name: doc.title || "Untitled Document",
                      creator: doc.owner,
                    };
                    return (
                      <DocumentCard
                        key={doc.id}
                        item={adapted}
                        isSelected={selectedGridIds.has(doc.id)}
                        onSelect={handleGridSelect}
                        onDelete={(id) => handleDelete(id, doc.title)}
                      />
                    );
                  })}
                </div>

                {selectedGridIds.size > 0 && (
                  <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-4 rounded-xl border border-zinc-200 bg-white/90 px-5 py-3 shadow-2xl shadow-zinc-200/60 backdrop-blur-md ring-1 ring-zinc-100 animate-in fade-in slide-in-from-bottom-4 duration-200">
                    <span className="text-sm font-medium text-zinc-700">
                      {selectedGridIds.size} {selectedGridIds.size === 1 ? "item" : "items"} selected
                    </span>
                    <div className="h-4 w-px bg-zinc-200" />
                    <Button variant="ghost" size="sm" onClick={() => setSelectedGridIds(new Set())} className="h-8 gap-1.5 px-3 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer">
                      <X className="h-3.5 w-3.5" /> Deselect
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleBulkDelete(Array.from(selectedGridIds).map(id => ({ id })))} className="h-8 gap-1.5 px-3 cursor-pointer">
                      <Trash className="h-3.5 w-3.5" /> Delete Selected
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <DataTable
                columns={columns}
                data={documents}
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
                <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-100 shadow-sm flex items-center justify-center mb-6">
                  <FileText className="h-7 w-7 text-indigo-500" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {query ? "No results found" : "No documents yet"}
                </h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                  {query
                    ? "Try adjusting your search or clearing filters to find what you're looking for."
                    : "Create and organize your documentation. Keep everything in one place."}
                </p>
                {!query && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl px-4 h-10 text-sm font-semibold bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Create new document
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Pagination */}
          {documents && documents.length > 0 && (
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
      <DocumentCreationModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={(id) => router.push(`/dashboard/docs/${id}`)}
      />
      <ConfirmDeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        itemName={deleteTarget?.name}
        count={bulkDeleteRows.length > 0 ? bulkDeleteRows.length : 1}
        entityLabel="document"
        onConfirm={handleConfirmDelete}
        isLoading={deleteDoc.isPending}
      />
    </Shell>
  );
}