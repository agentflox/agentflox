"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Plus, Bot, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { SearchSection } from "@/entities/shared/components/SearchSection";
import { Pagination } from "@/components/ui/pagination";
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
import { MoreHorizontal, Edit, Trash, Eye, ArrowUpDown, ChevronUp, ChevronDown, Check, Settings2, X, MoreVertical } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function AgentsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const pageSize = 12;

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

  const handleCreateAgent = () => {
    router.push('/dashboard/agents/create');
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
    setPage(1);
  };

  const { data, isLoading, isFetching, refetch } = trpc.agent.list.useQuery({
    query: searchQuery || undefined,
    status: statusFilter !== "all" ? [statusFilter as any] : undefined,
    agentType: typeFilter !== "all" ? [typeFilter as any] : undefined,
    includeRelations: true,
    page,
    pageSize,
  });

  const deleteAgent = trpc.agent.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
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
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Agent" />,
      cell: ({ row }) => {
        const agent = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="text-2xl">{agent.avatar || "Me"}</div>
            < div className="flex flex-col">
              <span className="font-medium text-foreground hover:underline cursor-pointer" onClick={() => router.push(`/dashboard/agents/${agent.id}`)}>{agent.name}</span>
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">{agent.description || "No description"}</span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "agentType",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => <Badge variant="outline">{row.original.agentType}</Badge>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === "ACTIVE"
              ? "default"
              : row.original.status === "DRAFT"
                ? "secondary"
                : "destructive"
          }
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "executions",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Usage" />,
      cell: ({ row }) => (
        <div className="flex flex-col text-xs text-muted-foreground">
          <span>{row.original._count?.executions || 0} execs</span>
          <span>{row.original._count?.tasks || 0} tasks</span>
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const agent = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/dashboard/agents/${agent.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => deleteAgent.mutate({ id: agent.id })}
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
    // Basic bulk delete example
    rows.forEach(r => deleteAgent.mutate({ id: r.id }));
  };


  return (
    <Shell>
      <div className="space-y-6">
        <PageHeader
          title="AI Agents"
          description="Create and manage autonomous AI agents"
          actions={
            <Button
              onClick={handleCreateAgent}
              className="group flex items-center gap-2 bg-zinc-900 hover:bg-zinc-700 text-white dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 px-4 py-2 h-9 rounded-md transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              <span className="font-medium text-sm">New item</span>
            </Button>
          }
        />

        <SearchSection
          searchValue={searchQuery}
          searchPlaceholder="Search agents..."
          resultsCount={data?.total ?? 0}
          onSearchChange={handleSearchChange}
          onSearchSubmit={() => { }}
          onCreateNew={handleCreateAgent}
          createButtonText="Create Agent"
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
                {(statusFilter !== "all" || typeFilter !== "all") && (
                  <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-200/70 px-1.5 text-xs font-semibold text-zinc-700">
                    {(statusFilter !== "all" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0)}
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
                <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuCheckboxItem checked={statusFilter === "all"} onCheckedChange={() => handleStatusFilterChange("all")}>All Status</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={statusFilter === "DRAFT"} onCheckedChange={() => handleStatusFilterChange("DRAFT")}>Draft</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={statusFilter === "ACTIVE"} onCheckedChange={() => handleStatusFilterChange("ACTIVE")}>Active</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={statusFilter === "PAUSED"} onCheckedChange={() => handleStatusFilterChange("PAUSED")}>Paused</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={statusFilter === "DISABLED"} onCheckedChange={() => handleStatusFilterChange("DISABLED")}>Disabled</DropdownMenuCheckboxItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Type</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuCheckboxItem checked={typeFilter === "all"} onCheckedChange={() => handleTypeFilterChange("all")}>All Types</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={typeFilter === "TASK_EXECUTOR"} onCheckedChange={() => handleTypeFilterChange("TASK_EXECUTOR")}>Task Executor</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={typeFilter === "WORKFLOW_MANAGER"} onCheckedChange={() => handleTypeFilterChange("WORKFLOW_MANAGER")}>Workflow Manager</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={typeFilter === "DATA_ANALYST"} onCheckedChange={() => handleTypeFilterChange("DATA_ANALYST")}>Data Analyst</DropdownMenuCheckboxItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Columns Dropdown (List View Only) */}
          {viewMode === "list" && table && (() => {
            const hideableColumns = table.getAllColumns().filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide() && column.id !== "name");
            const visibleCount = hideableColumns.filter(c => c.getIsVisible()).length + 1; // +1 for pinned name

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
                    Agent name
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
                  { id: "name", label: "Agent Name" },
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
        {(searchQuery || statusFilter !== "all" || typeFilter !== "all") && (
          <div className="flex flex-wrap items-center gap-2 mt-[-18px] mb-6">
            {searchQuery && (
              <button
                onClick={() => handleSearchChange("")}
                className="group inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white pl-2.5 pr-2 py-1 text-xs font-medium text-zinc-700 transition-all hover:bg-zinc-50 hover:border-zinc-300 cursor-pointer"
              >
                <span>Search: {searchQuery}</span>
                <div className="flex items-center justify-center rounded-full p-0.5 transition-colors group-hover:bg-zinc-200/60">
                  <X className="h-3 w-3 text-zinc-400 group-hover:text-zinc-700" />
                </div>
              </button>
            )}
            {statusFilter !== "all" && (
              <button
                onClick={() => handleStatusFilterChange("all")}
                className="group inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white pl-2.5 pr-2 py-1 text-xs font-medium text-zinc-700 transition-all hover:bg-zinc-50 hover:border-zinc-300 cursor-pointer"
              >
                <span>Status: {statusFilter}</span>
                <div className="flex items-center justify-center rounded-full p-0.5 transition-colors group-hover:bg-zinc-200/60">
                  <X className="h-3 w-3 text-zinc-400 group-hover:text-zinc-700" />
                </div>
              </button>
            )}
            {typeFilter !== "all" && (
              <button
                onClick={() => handleTypeFilterChange("all")}
                className="group inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white pl-2.5 pr-2 py-1 text-xs font-medium text-zinc-700 transition-all hover:bg-zinc-50 hover:border-zinc-300 cursor-pointer"
              >
                <span>Type: {typeFilter}</span>
                <div className="flex items-center justify-center rounded-full p-0.5 transition-colors group-hover:bg-zinc-200/60">
                  <X className="h-3 w-3 text-zinc-400 group-hover:text-zinc-700" />
                </div>
              </button>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                handleSearchChange("");
                handleStatusFilterChange("all");
                handleTypeFilterChange("all");
              }}
              className="h-7 px-2 text-xs text-zinc-500 hover:text-zinc-900"
            >
              Clear all
            </Button>
          </div>
        )}

        {/* Agents Listing */}
        {isLoading ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <DataTableSkeleton columnCount={6} rowCount={10} />
          )
        ) : data?.items.length === 0 ? (
          <EmptyState
            title="No agents found"
            message={
              searchQuery || statusFilter !== "all" || typeFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by creating your first AI agent"
            }
            actionButton={
              <Button onClick={handleCreateAgent}>
                <Plus className="h-4 w-4 mr-2" />
                Create Agent
              </Button>
            }
          />
        ) : viewMode === "grid" ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.items.map((agent) => (
                <div
                  key={agent.id}
                  className={cn(
                    "group relative flex flex-col bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden p-6 pt-10",
                    selectedGridIds.has(agent.id) ? "border-blue-400 ring-1 ring-blue-200 bg-blue-50/20" : "border-zinc-200 hover:border-zinc-300"
                  )}
                  onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
                >
                  {/* Checkbox  Etop left */}
                  <div
                    className={cn(
                      "absolute top-2 left-2 z-10 transition-opacity",
                      selectedGridIds.has(agent.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                    onClick={(e) => { e.stopPropagation(); handleGridSelect(agent.id, !selectedGridIds.has(agent.id)); }}
                  >
                    <Checkbox
                      checked={selectedGridIds.has(agent.id)}
                      onCheckedChange={(checked) => handleGridSelect(agent.id, !!checked)}
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
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/agents/${agent.id}`); }}>
                          <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); deleteAgent.mutate({ id: agent.id }); }}>
                          <Trash className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      < div className="flex-1">
                        <h3 className="font-semibold text-[15px] leading-snug line-clamp-2 text-zinc-900 group-hover:text-blue-600 transition-colors dark:text-zinc-50">{agent.name}</h3>
                        <p className="mt-1 line-clamp-2 text-[13px] text-zinc-500 dark:text-zinc-400">
                          {agent.description || "No description"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 uppercase">
                        {agent.agentType}
                      </span>
                      <span
                        className={cn(
                          "rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase",
                          agent.status === "ACTIVE"
                            ? "border-green-200 bg-green-50 text-green-700"
                            : agent.status === "DRAFT"
                              ? "border-zinc-200 bg-zinc-50 text-zinc-600"
                              : "border-red-200 bg-red-50 text-red-700"
                        )}
                      >
                        {agent.status}
                      </span>
                    </div>
                    {'_count' in agent && (
                      <div className="flex items-center justify-between text-sm text-muted-foreground mt-4 border-t pt-4">
                        <span>
                          {(agent as any)._count?.executions || 0} executions
                        </span>
                        <span>
                          {(agent as any)._count?.tasks || 0} tasks
                        </span>
                      </div>
                    )}
                    {agent.tags && agent.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {agent.tags.slice(0, 3).map((tag: string) => (
                          <span key={tag} className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 uppercase">
                            {tag}
                          </span>
                        ))}
                        {agent.tags.length > 3 && (
                          <span className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 uppercase">
                            +{agent.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
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
          <DataTable columns={columns} data={data?.items || []} onDeleteSelected={handleBulkDelete} onTableReady={setTable} hideToolbar columnVisibility={columnVisibility} onColumnVisibilityChange={setColumnVisibility} />
        )}

        {/* Pagination */}
        {data && data.total > data.pageSize && (
          <div className="mt-8">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(data.total / data.pageSize)}
              hasNextPage={page * data.pageSize < data.total}
              hasPreviousPage={page > 1}
              onPageChange={setPage}
              isLoading={isLoading || isFetching}
            />
          </div>
        )}
      </div>
    </Shell>
  );
}

