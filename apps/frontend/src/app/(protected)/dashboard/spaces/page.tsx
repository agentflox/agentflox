"use client";
import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Shell from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { SpaceCard, SpaceFilterSidebar, useSpaceList, SpaceCreationModal } from "@/entities/spaces";
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
import { Filter } from "lucide-react";

export default function SpacesPage() {
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
    } = useSpaceList();

    const [showCreateModal, setShowCreateModal] = useState(false);

    const hasNextPage = (data?.items?.length || 0) === pageSize;
    const hasPreviousPage = page > 1;

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
            // We might want to show workspace name here but we only have ID in filters. 
            // For now, simpler to just show "Workspace filtered" or fetch name.
            // Given complexity, let's just show "Workspace Filter"
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
                                className="h-7 bg-zinc-900 px-2.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                            >
                                <Plus className="mr-1.5 h-3 w-3" />
                                New Space
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
                    >
                        <Select value={scope} onValueChange={(v) => setScope(v as any)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Scope" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Spaces</SelectItem>
                                <SelectItem value="owned">Owned by me</SelectItem>
                                <SelectItem value="member">Shared with me</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filters.status || "all"} onValueChange={(v) => setFilters((prev) => ({ ...prev, status: v === "all" ? undefined : v as any }))}>
                            <SelectTrigger className="w-[180px]">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                        </Select>
                    </SearchSection>

                    {filterChips.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            {filterChips.map((chip) => (
                                <button
                                    key={chip.id}
                                    onClick={chip.onRemove}
                                    className="group inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                                >
                                    <span>{chip.label}</span>
                                    <X className="h-3 w-3 text-zinc-400 group-hover:text-zinc-600" />
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
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <div key={index} className="h-[200px] animate-pulse rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" />
                            ))}
                        </div>
                    ) : data?.items && data.items.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {data.items.map((item) => (
                                <SpaceCard
                                    key={item.id}
                                    item={item}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                                <Plus className="h-6 w-6 text-zinc-400" />
                            </div>
                            <h3 className="mt-4 text-base font-medium text-zinc-900 dark:text-zinc-50">No spaces found</h3>
                            <p className="mt-1 text-sm text-zinc-500">
                                {query ? "Try adjusting your search or filters." : "Get started by creating a new space."}
                            </p>
                            <Button onClick={handleCreateSpace} size="sm" variant="outline" className="mt-8 border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 max-w-40">
                                Create space
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
            <SpaceCreationModal
                open={showCreateModal}
                onOpenChange={setShowCreateModal}
                workspaceId="" // Empty string or undefined to trigger selector logic
                onSuccess={() => {
                    toast({ title: "Space created", description: "Space successfully created." });
                    // The list should auto-refresh due to invalidation in modal
                }}
            />
        </Shell>
    );
}
