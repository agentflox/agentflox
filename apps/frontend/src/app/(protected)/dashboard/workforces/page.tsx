"use client";
import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Shell from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
    WorkforceCard,
    WorkforceFilterSidebar,
    WorkforceCreationCard,
    useWorkforceList,
} from "@/entities/workforce";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { SearchSection } from "@/entities/shared/components/SearchSection";
import { DASHBOARD_ROUTES } from "@/constants/routes.config";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";

export default function WorkforcePage() {
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
        hasNextPage,
        hasPreviousPage,
    } = useWorkforceList();

    const [showCreateModal, setShowCreateModal] = useState(false);

    const filterChips = useMemo(() => {
        const chips: Array<{ id: string; label: string; onRemove: () => void }> = [];
        if (query) {
            chips.push({ id: "query", label: `Search: ${query}`, onRemove: () => setQuery("") });
        }
        if (filters.status) {
            chips.push({
                id: "status",
                label: `Status: ${filters.status}`,
                onRemove: () => setFilters({ ...filters, status: "" }),
            });
        }
        if (filters.mode) {
            chips.push({
                id: "mode",
                label: `Type: ${filters.mode === "FLOW" ? "Workflow" : "Swarm"}`,
                onRemove: () => setFilters({ ...filters, mode: "" }),
            });
        }
        return chips;
    }, [query, filters, setQuery, setFilters]);

    const clearFilters = () => {
        setQuery("");
        setFilters({ status: "", mode: "" });
    };

    const handleCreateWorkforce = () => setShowCreateModal(true);

    return (
        <Shell>
            <div className="space-y-6">
                <div className="space-y-6">
                    <PageHeader
                        title="Workforces"
                        description="Build, deploy and monitor your autonomous agent workforces."
                        actions={
                            <Button
                                onClick={handleCreateWorkforce}
                                className="h-7 bg-zinc-900 px-2.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                            >
                                <Plus className="mr-1.5 h-3 w-3" />
                                New Workforce
                            </Button>
                        }
                    />

                    <SearchSection
                        searchValue={query}
                        searchPlaceholder="Search workforces..."
                        resultsCount={data?.total ?? 0}
                        onSearchChange={setQuery}
                        onSearchSubmit={() => setPage(1)}
                        onCreateNew={handleCreateWorkforce}
                        createButtonText="New workforce"
                        showFilters={false}
                        showSort={false}
                    >
                        <Select value={scope} onValueChange={(v) => setScope(v as any)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Scope" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Workforces</SelectItem>
                                <SelectItem value="owned">Owned by me</SelectItem>
                                <SelectItem value="member">Shared with me</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filters.status || "all"} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : (v as any) })}>
                            <SelectTrigger className="w-[180px]">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="ACTIVE">Active</SelectItem>
                                <SelectItem value="PAUSED">Paused</SelectItem>
                                <SelectItem value="DRAFT">Draft</SelectItem>
                                <SelectItem value="ARCHIVED">Archived</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filters.mode || "all"} onValueChange={(v) => setFilters({ ...filters, mode: v === "all" ? "" : (v as any) })}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Mode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Modes</SelectItem>
                                <SelectItem value="FLOW">Workflow</SelectItem>
                                <SelectItem value="SWARM">Swarm</SelectItem>
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
                                <div
                                    key={index}
                                    className="h-[220px] animate-pulse rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                                />
                            ))}
                        </div>
                    ) : data?.items && data.items.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {data.items.map((item) => (
                                <WorkforceCard
                                    key={item.id}
                                    item={item}
                                    onOpen={(id) => router.push(DASHBOARD_ROUTES.WORKFORCE_CREATE(id))}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                                <Plus className="h-6 w-6 text-zinc-400" />
                            </div>
                            <h3 className="mt-4 text-base font-medium text-zinc-900 dark:text-zinc-50">
                                No workforces found
                            </h3>
                            <p className="mt-1 text-sm text-zinc-500">
                                {query
                                    ? "Try adjusting your search or filters."
                                    : "Get started by creating a new workforce."}
                            </p>
                            <Button
                                onClick={handleCreateWorkforce}
                                size="sm"
                                variant="outline"
                                className="mt-8 border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 max-w-40"
                            >
                                Create workforce
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

            <WorkforceCreationCard
                open={showCreateModal}
                onOpenChange={setShowCreateModal}
                onSelect={(mode, id) => {
                    // Navigate to the create/[id] page passing mode as a query param
                    router.push(`${DASHBOARD_ROUTES.WORKFORCE_CREATE(id)}?mode=${mode}`);
                }}
            />
        </Shell>
    );
}
