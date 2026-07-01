"use client";

import { useState } from "react";
import Shell from "@/components/layout/Shell";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, Folder, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { SearchSection } from "@/entities/shared/components/SearchSection";
import { DataTable } from "@/components/ui/data-table";
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
import { MoreHorizontal, Trash, Eye, Settings2, ArrowUpDown, X, Check, ChevronUp, ChevronDown, MoreVertical, PenSquare } from "lucide-react";
import { ConfirmDeleteModal } from "@/components/modals/ConfirmDeleteModal";
import { useToast } from "@/hooks/useToast";

export default function DocsPage() {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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

  const [searchQuery, setSearchQuery] = useState("");

  const { data: views, isLoading } = trpc.view.list.useQuery({
    type: "DOC",
  });

  const filteredViews = views?.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase())) || [];

  const handleCreateDocument = () => {
    setShowCreateModal(true);
  };

  const { toast } = useToast();
  const deleteView = trpc.view.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Document deleted successfully" });
      trpc.useUtils().view.list.invalidate();
    },
    onError: (error) => {
      toast({ title: "Failed to delete document", description: error.message, variant: "destructive" });
    },
  });

  const handleDelete = (id: string, name?: string) => {
    setDeleteTarget({ id, name: name ?? "Untitled Document" });
    setBulkDeleteRows([]);
    setDeleteModalOpen(true);
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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Document" />,
      cell: ({ row }) => {
        const doc = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex flex-col min-w-0">
              <span
                className="font-medium text-foreground hover:underline cursor-pointer truncate"
                onClick={() => router.push(`/dashboard/docs/${doc.id}`)}
              >
                {doc.name}
              </span>
              {doc.description && (
                <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                  {doc.description}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "creator",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Creator" />,
      cell: ({ row }) => {
        const creator = row.original.creator;
        return (
          <div className="flex items-center gap-2">
            <img
              src={creator.image || "/default-avatar.png"}
              alt={creator.name || "User"}
              className="h-6 w-6 rounded-full"
            />
            <span className="text-sm text-muted-foreground">{creator.name}</span>
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last Updated" />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(row.original.updatedAt), { addSuffix: true })}
        </span>
      ),
    },
    {
      id: "children",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contents" />,
      cell: ({ row }) => {
        return <span className="text-muted-foreground">-</span>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const doc = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
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
                onClick={() => handleDelete(doc.id, doc.name)}
              >
                <Trash className="mr-1 h-4 w-4" /> Delete Document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const handleBulkDelete = (rows: any[]) => {
    if (rows.length === 0) return;
    setBulkDeleteRows(rows);
    setDeleteTarget(null);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (bulkDeleteRows.length > 0) {
      for (const row of bulkDeleteRows) {
        await deleteView.mutateAsync({ id: row.id });
      }
      setSelectedGridIds(new Set());
    } else if (deleteTarget) {
      await deleteView.mutateAsync({ id: deleteTarget.id });
    }
  };

  return (
    <Shell>
      <div className="space-y-6">
        <PageHeader
          title="Documents"
          description="Create and organize your documentation"
          actions={
            <Button
              onClick={handleCreateDocument}
              className="group flex items-center gap-2 bg-zinc-900 hover:bg-zinc-700 text-white dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 px-4 py-2 h-9 rounded-md transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              <span className="font-medium text-sm">New Document</span>
            </Button>
          }
        />

        <SearchSection
          searchValue={searchQuery}
          searchPlaceholder="Search documents..."
          resultsCount={filteredViews.length}
          onSearchChange={setSearchQuery}
          onSearchSubmit={() => { }}
          onCreateNew={handleCreateDocument}
          createButtonText="New Document"
          showFilters={false}
          showSort={false}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        >
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
                  { id: "title", label: "Title" },
                  { id: "updatedAt", label: "Last Updated" },
                ].map((opt) => {
                  const currentSortIndex = sort.findIndex((s) => s.id === opt.id);
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
                        if (isSelected) setSort((s) => s.filter((i) => i.id !== opt.id));
                        else setSort((s) => [...s, { id: opt.id, desc: false }]);
                      }}
                    >
                      <div
                        className="h-5 w-5 flex items-center justify-center rounded hover:bg-zinc-200 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSelected) setSort((s) => s.map((i) => i.id === opt.id ? { ...i, desc: !i.desc } : i));
                          else setSort((s) => [...s, { id: opt.id, desc: false }]);
                        }}
                      >
                        {isSelected && (
                          <div className="flex flex-col items-center -space-y-1">
                            <ChevronUp className={`h-3.5 w-3.5 ${currentSort?.desc ? "text-zinc-800" : "text-zinc-300"}`} />
                            <ChevronDown className={`h-3.5 w-3.5 ${currentSort?.desc ? "text-zinc-300" : "text-zinc-800"}`} />
                          </div>
                        )}
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
        {searchQuery && (
          <div className="flex flex-wrap items-center gap-2 mt-[-18px] mb-6">
            <button
              onClick={() => setSearchQuery("")}
              className="group inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white pl-2.5 pr-2 py-1 text-xs font-medium text-zinc-700 transition-all hover:bg-zinc-50 hover:border-zinc-300 cursor-pointer"
            >
              <span>Search: {searchQuery}</span>
              <div className="flex items-center justify-center rounded-full p-0.5 transition-colors group-hover:bg-zinc-200/60">
                <X className="h-3 w-3 text-zinc-400 group-hover:text-zinc-700" />
              </div>
            </button>
            <Button
              variant="ghost"
              onClick={() => setSearchQuery("")}
              className="h-7 px-2 text-xs text-zinc-500 hover:text-zinc-900"
            >
              Clear all
            </Button>
          </div>
        )}

        {/* Documents Listing */}
        {isLoading ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="relative flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm p-6 pt-10 overflow-hidden">
                  <div className="flex items-start gap-3 mb-4">
                    <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2 min-w-0">
                      <Skeleton className={cn("h-4 rounded-md", i % 2 === 0 ? "w-[70%]" : "w-[55%]")} />
                      <Skeleton className="h-3 w-[40%] rounded-md opacity-60" />
                    </div>
                  </div>
                  <Skeleton className="h-3.5 w-full rounded-md" />
                  <Skeleton className={cn("h-3.5 rounded-md mt-1.5", i % 3 === 0 ? "w-[80%]" : "w-[60%]")} />
                  {i % 3 === 1 && (
                    <div className="flex items-center gap-1.5 mt-5">
                      <Skeleton className="h-4 w-4 rounded-md" />
                      <Skeleton className="h-3.5 w-24 rounded-md" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-4 border-t border-slate-100 mt-6">
                    <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                    <Skeleton className="h-3 w-24 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <DataTableSkeleton columnCount={6} rowCount={10} />
          )
        ) : filteredViews && filteredViews.length > 0 ? (
          viewMode === "grid" ? (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-4">
                {filteredViews.map((doc: any) => {
                  const isSelected = selectedGridIds.has(doc.id);
                  return (
                    <DocumentCard
                      key={doc.id}
                      item={doc}
                      isSelected={isSelected}
                      onSelect={handleGridSelect}
                      onDelete={(id) => handleDelete(id, doc.name)}
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
              data={filteredViews || []}
              onDeleteSelected={handleBulkDelete}
              onTableReady={setTable}
              hideToolbar
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={setColumnVisibility}
            />
          )
        ) : (
          /* Empty State */
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/50 to-white shadow-sm">
            <div className="text-center px-6 py-8 max-w-xs">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-100 shadow-sm flex items-center justify-center mb-6">
                <FileText className="h-7 w-7 text-indigo-500" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                {searchQuery ? "No results found" : "No documents yet"}
              </h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                {searchQuery
                  ? "Try adjusting your search or clearing filters to find what you're looking for."
                  : "Create and organize your documentation. Keep everything in one place."}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleCreateDocument}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl px-4 h-10 text-sm font-semibold bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Create new document
                </button>
              )}
            </div>
          </div>
        )}
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
        isLoading={deleteView.isPending}
      />
    </Shell>
  );
}