"use client";

import { useState } from "react";
import Shell from "@/components/layout/Shell";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, Folder } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { SearchSection } from "@/entities/shared/components/SearchSection";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MoreHorizontal, Trash, Eye, Settings2, ArrowUpDown, X, Check, ChevronUp, ChevronDown, MoreVertical } from "lucide-react";

export default function DocsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
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

  const { data: documents, isLoading } = trpc.document.list.useQuery({
    query: searchQuery || undefined,
    parentId: null,
    isArchived: false,
  });

  const createDocument = trpc.document.create.useMutation({
    onSuccess: (data) => {
      router.push(`/dashboard/docs/${data.id}`);
    },
  });

  const handleCreateDocument = () => {
    // For now, create with a default workspace - you can extend this to select workspace
    createDocument.mutate({
      workspaceId: "default", // Replace with actual workspace selection
      title: "Untitled Document",
      content: "",
    });
  };

  const deleteDocument = trpc.document.delete.useMutation({
    onSuccess: () => {
      // Refresh documents list logic if needed, useQuery will be stale and refetch eventually or we can invalidate manually
    }
  });

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
            {doc.icon ? (
              <span className="text-2xl">{doc.icon}</span>
            ) : (
              <FileText className="h-6 w-6 text-muted-foreground" />
            )}
            <span
              className="font-medium text-foreground hover:underline cursor-pointer"
              onClick={() => router.push(`/dashboard/docs/${doc.id}`)}
            >
              {doc.title}
            </span>
          </div>
        )
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
              src={creator.avatar || "/default-avatar.png"}
              alt={creator.name || "User"}
              className="h-6 w-6 rounded-full"
            />
            <span className="text-sm text-muted-foreground">
              {creator.name}
            </span>
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last Updated" />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(row.original.updatedAt), {
            addSuffix: true,
          })}
        </span>
      ),
    },
    {
      id: "children",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contents" />,
      cell: ({ row }) => {
        const count = row.original.children?.length || 0;
        if (count === 0) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Folder className="h-4 w-4" />
            <span>{count} sub-documents</span>
          </div>
        )
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
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => deleteDocument.mutate(doc.id)}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ];

  const handleBulkDelete = (rows: any[]) => {
    rows.forEach(r => deleteDocument.mutate(r.id));
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
          resultsCount={documents?.items.length ?? 0}
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
            const hideableColumns = table.getAllColumns().filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide() && column.id !== "title");
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-48 animate-pulse rounded-lg border bg-muted"
                />
              ))}
            </div>
          ) : (
            <DataTableSkeleton columnCount={6} rowCount={10} />
          )
        ) : documents && documents.items.length > 0 ? (
          viewMode === "grid" ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {documents.items.map((doc: any) => (
                  <div
                    key={doc.id}
                    onClick={() => router.push(`/dashboard/docs/${doc.id}`)}
                    className={cn(
                      "group relative flex flex-col bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden p-6 pt-10",
                      selectedGridIds.has(doc.id) ? "border-blue-400 ring-1 ring-blue-200 bg-blue-50/20" : "border-zinc-200 hover:border-zinc-300"
                    )}
                  >
                    {/* Checkbox  Etop left */}
                    <div
                      className={cn(
                        "absolute top-2 left-2 z-10 transition-opacity",
                        selectedGridIds.has(doc.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                      onClick={(e) => { e.stopPropagation(); handleGridSelect(doc.id, !selectedGridIds.has(doc.id)); }}
                    >
                      <Checkbox
                        checked={selectedGridIds.has(doc.id)}
                        onCheckedChange={(checked) => handleGridSelect(doc.id, !!checked)}
                        className="h-4 w-4 border-zinc-300 bg-white shadow-sm cursor-pointer"
                      />
                    </div>

                    {/* Actions  Etop right, vertical dots */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4 text-zinc-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/docs/${doc.id}`); }}>
                            <Eye className="mr-2 h-4 w-4" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); deleteDocument.mutate(doc.id); }}>
                            <Trash className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {doc.icon ? (
                          <span className="text-2xl">{doc.icon}</span>
                        ) : (
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[15px] leading-snug line-clamp-2 text-zinc-900 group-hover:text-blue-600 transition-colors dark:text-zinc-50">
                            {doc.title}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-[13px] text-zinc-500 dark:text-zinc-400">
                            Updated{" "}
                            {formatDistanceToNow(new Date(doc.updatedAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {doc.children && doc.children.length > 0 && (
                      <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                        <Folder className="h-4 w-4" />
                        <span>{doc.children.length} sub-documents</span>
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-2 pt-4 border-t">
                      <img
                        src={doc.creator.avatar || "/default-avatar.png"}
                        alt={doc.creator.name || "User"}
                        className="h-6 w-6 rounded-full"
                      />
                      <span className="text-sm text-muted-foreground">
                        {doc.creator.name}
                      </span>
                    </div>
                  </div>
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
            <DataTable columns={columns} data={documents.items || []} onDeleteSelected={handleBulkDelete} onTableReady={setTable} hideToolbar columnVisibility={columnVisibility} onColumnVisibilityChange={setColumnVisibility} />
          )
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first document
            </p>
            <Button onClick={handleCreateDocument}>
              <Plus className="mr-2 h-4 w-4" />
              Create Document
            </Button>
          </div>
        )}
      </div>
    </Shell>
  );
}
