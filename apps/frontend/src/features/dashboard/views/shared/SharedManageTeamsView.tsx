"use client";
import React, { useMemo, useState } from "react";
import { Plus, X, MoreHorizontal, Trash, Users, PenSquare, Globe, User, Circle, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import TeamCard from "@/entities/teams/components/TeamCard";
import { useTeamList, TeamScope } from "@/entities/teams/hooks/useTeamList";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { SearchSection } from "@/entities/shared/components/SearchSection";
import { UsageQuotaBanner } from "@/features/usage/components/UsageQuotaBanner";
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
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { TeamCreationModal } from "@/entities/teams/components/TeamCreationModal";
import { ConfirmDeleteModal } from "@/components/modals/ConfirmDeleteModal";
import { DASHBOARD_ROUTES } from "@/constants/routes.config";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import {
    DashboardFilterPopover,
    FilterSelectRow,
    DashboardSortPopover,
} from "@/features/dashboard/components/shared/DashboardFilterSubmenus";
import { ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import { EntityStatusBadge } from "@/components/ui/status-badge";

interface SharedManageTeamsViewProps {
    workspaceId?: string;
    spaceId?: string;
    projectId?: string;
    onTeamCreated?: (teamId: string) => void;
}

export function SharedManageTeamsView({ workspaceId, spaceId, projectId, onTeamCreated }: SharedManageTeamsViewProps) {
    const router = useRouter();
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    const deleteMutation = trpc.team.delete.useMutation({
        onMutate: async (variables) => {
            queryClient.setQueriesData({ queryKey: [['team', 'list']] }, (oldData: any) => {
                if (!oldData || !oldData.items) return oldData;
                return {
                    ...oldData,
                    items: oldData.items.filter((t: any) => t.id !== variables.id),
                    total: Math.max(0, oldData.total - 1)
                };
            });
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
            utils.team.list.invalidate();
            if ((utils.team as any).listInfinite) (utils.team as any).listInfinite.invalidate();
        }
    });

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
    } = useTeamList({
        workspaceId,
        spaceId,
        projectId,
        pageSize: viewMode === "grid" ? 12 : 10,
        syncWithUrl: false,
    });

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [sort, setSort] = useState<Array<{ id: string; desc: boolean }>>([{ id: "updatedAt", desc: true }]);
    const [columnVisibility, setColumnVisibility] = useState<import("@tanstack/react-table").VisibilityState>({});
    const [table, setTable] = useState<import("@tanstack/react-table").Table<any> | null>(null);
    const [selectedGridIds, setSelectedGridIds] = useState<Set<string>>(new Set());

    const handleViewModeChange = (mode: "grid" | "list") => {
        setViewMode(mode);
        const newSize = mode === "grid" ? 12 : 10;
        setPageSize(newSize);
        setPage(1);
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setPage(1);
    };

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

    const handleOpen = (id: string) => {
        if (!id) return;
        router.push(DASHBOARD_ROUTES.TEAM(id));
    };

    const handleTeamCreated = (id: string) => {
        setShowCreateModal(false);
        if (onTeamCreated) {
            onTeamCreated(id);
        } else {
            router.push(DASHBOARD_ROUTES.TEAM(id));
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
        if (query) result.push({ id: "q", label: `Search: ${query}`, onRemove: () => setQuery("") });
        if ((filters as any).status) result.push({ id: "status", label: `Status: ${(filters as any).status}`, onRemove: () => setFilters((f: any) => ({ ...f, status: "" as any })) });
        return result;
    }, [query, filters, setFilters, setQuery]);

    const clearAll = () => {
        setQuery("");
        setScope("all");
        setFilters((f: any) => ({ ...f, industries: [], status: "" as any }));
        setPage(1);
    };

    return (
        <div className="h-full overflow-y-auto bg-zinc-50/50">
            <div className="flex flex-col min-h-full">
                {/* Enterprise Docked Sticky Header & Controls */}
                <div className="sticky top-0 z-20 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 shadow-xs px-6 pt-6 pb-4 space-y-4 transition-all">
                    <div className="max-w-7xl mx-auto space-y-4 w-full">
                        <PageHeader
                            title="Teams"
                            description="Manage your team structure and collaboration settings."
                            actions={
                                <Button
                                    onClick={() => setShowCreateModal(true)}
                                    className="group flex items-center gap-2 bg-zinc-900 hover:bg-zinc-700 text-white dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 px-4 py-2 h-9 rounded-md transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer"
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
                            resultsCount={total}
                            onSearchChange={(q) => { setQuery(q); setPage(1); }}
                            onSearchSubmit={() => setPage(1)}
                            onCreateNew={() => setShowCreateModal(true)}
                            createButtonText="New team"
                            showFilters={false}
                            showSort={false}
                            viewMode={viewMode}
                            onViewModeChange={handleViewModeChange}
                        >
                            {/* Filter Popover */}
                            <DashboardFilterPopover
                                activeFiltersCount={(scope !== "all" ? 1 : 0) + ((filters as any).status ? 1 : 0)}
                                onClearAllFilters={clearAll}
                            >
                                <FilterSelectRow
                                    icon={<Globe className="h-4 w-4 text-zinc-500" />}
                                    label="Scope"
                                    value={scope}
                                    onChange={(val) => {
                                        setScope(val as any);
                                        setPage(1);
                                    }}
                                    onClear={() => {
                                        setScope("all");
                                        setPage(1);
                                    }}
                                    options={[
                                        { id: "owned", label: "Owned by me", icon: User, color: "text-blue-500" },
                                        { id: "participated", label: "Shared with me", icon: Users, color: "text-emerald-500" },
                                    ]}
                                />

                                <FilterSelectRow
                                    icon={<Circle className="h-4 w-4 text-zinc-500" />}
                                    label="Status"
                                    value={(filters as any).status}
                                    onChange={(val) => {
                                        setFilters((f: any) => ({ ...f, status: val as any }));
                                        setPage(1);
                                    }}
                                    onClear={() => {
                                        setFilters((f: any) => ({ ...f, status: "" as any }));
                                        setPage(1);
                                    }}
                                    options={[
                                        { id: "ACTIVE", label: "Active", icon: Circle, color: "text-emerald-500 fill-emerald-500" },
                                        { id: "ARCHIVED", label: "Archived", icon: Circle, color: "text-zinc-400 fill-zinc-400" },
                                    ]}
                                />
                            </DashboardFilterPopover>

                            {viewMode === "list" && table && (() => {
                                const hideableColumns = table.getAllColumns().filter(c => typeof c.accessorFn !== "undefined" && c.getCanHide() && c.id !== "name");
                                const visibleCount = hideableColumns.filter(c => c.getIsVisible()).length + 1;
                                return (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-9 px-3 gap-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 transition-all cursor-pointer">
                                                <Settings2 className="h-4 w-4" />
                                                <span>Columns</span>
                                                <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-200/70 px-1.5 text-xs font-semibold text-zinc-700">{visibleCount}</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-[160px]">
                                            <DropdownMenuCheckboxItem checked={true} onCheckedChange={() => { }} className="opacity-50 cursor-not-allowed">Team name</DropdownMenuCheckboxItem>
                                            <DropdownMenuSeparator />
                                            {hideableColumns.map(column => (
                                                <DropdownMenuCheckboxItem key={column.id} className="capitalize cursor-pointer" checked={column.getIsVisible()} onCheckedChange={value => column.toggleVisibility(!!value)}>
                                                    {column.id}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                );
                            })()}

                            <DashboardSortPopover
                                sort={sort}
                                onSortChange={setSort}
                                options={[
                                    { id: "name", label: "Name" },
                                    { id: "status", label: "Status" },
                                    { id: "updatedAt", label: "Last Modified" },
                                    { id: "createdAt", label: "Date Created" },
                                ]}
                            />
                        </SearchSection>

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
                </div>

                {/* Main Content Area with generous breathing room below sticky header */}
                <div className="flex-1 max-w-7xl mx-auto px-6 pt-6 pb-8 space-y-6 w-full">
                    {isLoading ? (
                        viewMode === "grid" ? (
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-4">
                                {[...Array(pageSize)].map((_, i) => (
                                    <div key={i} className="relative flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                                        <div className="flex items-start gap-3 mb-4">
                                            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                                            <div className="flex-1 space-y-2 pt-1"><Skeleton className="h-4 w-[60%] rounded-md" /><Skeleton className="h-3 w-[40%] rounded-md opacity-60" /></div>
                                        </div>
                                        <Skeleton className="h-3.5 w-full rounded-md" /><Skeleton className="h-3.5 w-[75%] rounded-md mt-1.5" />
                                        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100"><Skeleton className="h-5 w-16 rounded-full" /><Skeleton className="h-5 w-14 rounded-full" /><Skeleton className="h-5 w-12 rounded-full ml-auto" /></div>
                                    </div>
                                ))}
                            </div>
                        ) : <DataTableSkeleton columnCount={5} rowCount={pageSize} />
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
                                    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-4 rounded-xl border border-zinc-200 bg-white/95 px-5 py-3 shadow-2xl backdrop-blur-md ring-1 ring-zinc-100 animate-in fade-in slide-in-from-bottom-4 duration-200">
                                        <span className="text-sm font-medium text-zinc-700">{selectedGridIds.size} {selectedGridIds.size === 1 ? "item" : "items"} selected</span>
                                        <div className="h-4 w-px bg-zinc-200" />
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedGridIds(new Set())} className="h-8 gap-1.5 px-3 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"><X className="h-3.5 w-3.5" />Deselect</Button>
                                        <Button variant="destructive" size="sm" onClick={() => handleBulkDelete(Array.from(selectedGridIds).map(id => ({ id })))} className="h-8 gap-1.5 px-3 cursor-pointer"><Trash className="h-3.5 w-3.5" />Delete Selected</Button>
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
                                    <Users className="h-7 w-7 text-indigo-500" />
                                </div>
                                <h3 className="text-base font-semibold text-slate-900">{query ? "No results found" : "No teams yet"}</h3>
                                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                                    {query ? "Try adjusting your search or clearing filters." : "Invite members and collaborate together."}
                                </p>
                                {!query && (
                                    <button onClick={() => setShowCreateModal(true)} className="mt-6 inline-flex items-center gap-2 rounded-xl px-4 h-10 text-sm font-semibold bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all cursor-pointer">
                                        <Plus className="h-4 w-4" />Create new team
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
                            onPageChange={(p) => setPage(p)}
                            isLoading={isLoading || isFetching}
                            itemLabel="teams"
                        />
                    )}
                </div>
            </div>

            <TeamCreationModal open={showCreateModal} onOpenChange={setShowCreateModal} onCreated={handleTeamCreated} />
            <ConfirmDeleteModal
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                itemName={deleteTarget?.name}
                count={bulkDeleteRows.length > 0 ? bulkDeleteRows.length : 1}
                entityLabel="team"
                onConfirm={handleConfirmDelete}
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
}
