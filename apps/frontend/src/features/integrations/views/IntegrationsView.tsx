'use client';

import React, { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, usePathname } from 'next/navigation';
import { INTEGRATION_CATEGORIES } from '../integrationCategories';
import { IntegrationCard } from '../components/IntegrationCard';
import { useIntegrationCatalog } from '../hooks/useIntegrationCatalog';
import { buildIntegrationsList } from '../buildIntegrationsList';
import { OAUTH_INTEGRATION_PROVIDERS } from '../integrationUiMeta';
import { SlidersHorizontal, Layers, Circle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import {
    DashboardFilterPopover,
    FilterSelectRow,
    DashboardSortPopover,
} from "@/features/dashboard/components/shared/DashboardFilterSubmenus";
import { PageHeader } from '@/entities/shared/components/PageHeader';
import { SearchSection } from '@/entities/shared/components/SearchSection';

const IntegrationManagerModal = dynamic(
    () => import('../components/IntegrationManagerModal').then((m) => ({ default: m.IntegrationManagerModal })),
    { ssr: false },
);

export const IntegrationsView = () => {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const initialPage = useMemo(() => {
        const p = searchParams.get("page");
        const num = p ? parseInt(p, 10) : 1;
        return isNaN(num) || num < 1 ? 1 : num;
    }, [searchParams]);

    const initialPageSize = useMemo(() => {
        const ps = searchParams.get("pageSize");
        const num = ps ? parseInt(ps, 10) : 12;
        return isNaN(num) || num < 1 ? 12 : num;
    }, [searchParams]);

    const initialQuery = searchParams.get("q") || "";
    const initialCategory = searchParams.get("category") || "all";
    const initialStatus = searchParams.get("status") || "all";

    const [page, setPage] = useState(initialPage);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [filters, setFilters] = useState<{ category: string; status: string }>({ category: initialCategory, status: initialStatus });
    const [sort, setSort] = useState<Array<{ id: string; desc: boolean }>>([{ id: "updatedAt", desc: true }]);
    const [searchQuery, setSearchQuery] = useState(initialQuery);

    // Single modal state 窶・manages both GitHub and all other integrations uniformly
    const [modalOpen, setModalOpen] = useState(false);
    const [modalInitialAppId, setModalInitialAppId] = useState<string | null>(null);

    const updateUrlParams = useCallback(
        (updates: Record<string, string | number | undefined | null>) => {
            const params = new URLSearchParams(searchParams.toString());

            Object.entries(updates).forEach(([key, val]) => {
                if (
                    val === undefined ||
                    val === null ||
                    val === "" ||
                    (key === "page" && Number(val) === 1) ||
                    (key === "category" && val === "all") ||
                    (key === "status" && val === "all")
                ) {
                    params.delete(key);
                } else {
                    params.set(key, String(val));
                }
            });

            const searchStr = params.toString();
            const newUrl = searchStr ? `${pathname}?${searchStr}` : pathname;
            window.history.replaceState(null, "", newUrl);
        },
        [searchParams, pathname]
    );

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        updateUrlParams({ page: newPage });
    };

    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setPage(1);
        updateUrlParams({ pageSize: newPageSize, page: 1 });
    };

    const handleSearchChange = (val: string) => {
        setSearchQuery(val);
        setPage(1);
        updateUrlParams({ q: val || undefined, page: 1 });
    };

    const handleCategoryChange = (val: string) => {
        setFilters((prev) => ({ ...prev, category: val }));
        setPage(1);
        updateUrlParams({ category: val, page: 1 });
    };

    const handleStatusChange = (val: string) => {
        setFilters((prev) => ({ ...prev, status: val }));
        setPage(1);
        updateUrlParams({ status: val, page: 1 });
    };

    const {
        platform,
        providers: catalogProviders,
        isLoading: isLoadingCatalog,
        refetch: refetchCatalog,
    } = useIntegrationCatalog();

    /** Open the IntegrationManagerModal directly at the detail view for the given provider */
    const handleConfigure = useCallback((provider: string) => {
        setModalInitialAppId(provider);
        setModalOpen(true);
    }, []);

    const handleToggle = useCallback((_provider: string, _enabled: boolean) => {
        // Toggle is a no-op 窶・all connection changes go through the modal
    }, []);

    const handleModalClose = useCallback((open: boolean) => {
        setModalOpen(open);
        if (!open) {
            // Refetch catalog when the modal closes in case connections changed
            void refetchCatalog();
        }
    }, [refetchCatalog]);

    const integrations = useMemo(
        () => buildIntegrationsList(catalogProviders, platform),
        [catalogProviders, platform],
    );

    const filteredIntegrations = useMemo(() => {
        const query = searchQuery ? searchQuery.toLowerCase() : '';
        let result = integrations.filter((integration) => {
            if (filters.category !== 'all' && integration.category !== filters.category) {
                return false;
            }
            if (filters.status === 'connected' && !integration.isConnected) return false;
            if (filters.status === 'disconnected' && (integration.isConnected || integration.comingSoon)) {
                return false;
            }
            if (
                query &&
                !integration.name.toLowerCase().includes(query) &&
                !integration.description.toLowerCase().includes(query)
            ) {
                return false;
            }
            return true;
        });

        if (sort.length > 0) {
            const { id, desc } = sort[0];
            result = [...result].sort((a, b) => {
                if (id === 'name') {
                    return desc ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
                }
                if (id === 'status') {
                    const aVal = a.isConnected ? 1 : 0;
                    const bVal = b.isConnected ? 1 : 0;
                    return desc ? aVal - bVal : bVal - aVal;
                }
                return 0;
            });
        }

        return result;
    }, [integrations, filters, searchQuery, sort]);

    const total = filteredIntegrations.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const paginatedIntegrations = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredIntegrations.slice(start, start + pageSize);
    }, [filteredIntegrations, page, pageSize]);

    const chips = useMemo(() => {
        const result: Array<{ id: string; label: string; onRemove: () => void }> = [];
        if (searchQuery) result.push({ id: "q", label: `Search: ${searchQuery}`, onRemove: () => handleSearchChange("") });
        if (filters.category !== "all") {
            const catLabel = INTEGRATION_CATEGORIES.find(c => c.id === filters.category)?.label || filters.category;
            result.push({ id: "category", label: `Category: ${catLabel}`, onRemove: () => handleCategoryChange("all") });
        }
        if (filters.status !== "all") {
            result.push({ id: "status", label: `Status: ${filters.status === "connected" ? "Connected" : "Not Connected"}`, onRemove: () => handleStatusChange("all") });
        }
        return result;
    }, [searchQuery, filters]);

    const clearAll = () => {
        setSearchQuery("");
        setFilters({ category: "all", status: "all" });
        handlePageChange(1);
        updateUrlParams({ q: undefined, category: undefined, status: undefined, page: 1 });
    };

    return (
        <div className="flex flex-col min-h-full">
            {/* Enterprise Docked Sticky Header & Controls */}
            <div className="sticky top-0 z-20 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 shadow-xs px-6 pt-6 pb-4 space-y-4 transition-all">
                <PageHeader
                    title="Integrations"
                    description="Connect your favorite tools to streamline your workflow and boost productivity."
                />

                <SearchSection
                    searchValue={searchQuery}
                    onSearchChange={handleSearchChange}
                    onSearchSubmit={() => handlePageChange(1)}
                    searchPlaceholder="Search integrations..."
                    resultsCount={total}
                    showSort={false}
                    showFilters={false}
                    onCreateNew={() => { }}
                    createButtonText=""
                >
                    {/* Filter Popover */}
                    <DashboardFilterPopover
                        activeFiltersCount={(filters.category !== 'all' ? 1 : 0) + (filters.status !== 'all' ? 1 : 0)}
                        onClearAllFilters={clearAll}
                    >
                        <FilterSelectRow
                            icon={<Layers className="h-4 w-4 text-zinc-500" />}
                            label="Category"
                            value={filters.category}
                            onChange={(val) => handleCategoryChange(val)}
                            onClear={() => handleCategoryChange('all')}
                            options={INTEGRATION_CATEGORIES.map((cat) => ({
                                id: cat.id,
                                label: cat.label,
                                icon: Layers,
                                color: "text-zinc-400",
                            }))}
                        />

                        <FilterSelectRow
                            icon={<Circle className="h-4 w-4 text-zinc-500" />}
                            label="Status"
                            value={filters.status}
                            onChange={(val) => handleStatusChange(val)}
                            onClear={() => handleStatusChange('all')}
                            options={[
                                { id: "connected", label: "Connected", icon: Circle, color: "text-emerald-500 fill-emerald-500" },
                                { id: "disconnected", label: "Not Connected", icon: Circle, color: "text-zinc-400 fill-zinc-400" },
                            ]}
                        />
                    </DashboardFilterPopover>

                    <DashboardSortPopover
                        sort={sort}
                        onSortChange={setSort}
                        options={[
                            { id: "name", label: "Name" },
                            { id: "status", label: "Connection Status" },
                        ]}
                    />
                </SearchSection>

                {/* Filter Chips */}
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

            {/* Main Content Area */}
            <div className="flex-1 px-6 pt-6 pb-8 space-y-6">
                {isLoadingCatalog ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-4">
                        {Array.from({ length: pageSize }).map((_, i) => (
                            <div key={i} className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <Skeleton className="h-10 w-10 rounded-lg" />
                                    <Skeleton className="h-5 w-10 rounded-full" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-2/3" />
                                    <Skeleton className="h-3 w-full" />
                                    <Skeleton className="h-3 w-4/5" />
                                </div>
                                <Skeleton className="h-8 w-24 rounded-md" />
                            </div>
                        ))}
                    </div>
                ) : filteredIntegrations.length === 0 ? (
                    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/50 to-white shadow-sm">
                        <div className="text-center px-6 py-8 max-w-xs">
                            <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-100 shadow-sm flex items-center justify-center mb-6">
                                <SlidersHorizontal className="h-7 w-7 text-indigo-500" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-900">No integrations found</h3>
                            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                                Try adjusting your search or clearing filters to find what you're looking for.
                            </p>
                            <button
                                onClick={clearAll}
                                className="mt-6 inline-flex items-center gap-2 rounded-xl px-4 h-10 text-sm font-semibold bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all cursor-pointer"
                            >
                                Clear filters
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-4">
                        {paginatedIntegrations.map((integration) => (
                            <IntegrationCard
                                key={integration.provider}
                                integration={integration}
                                onToggle={handleToggle}
                                onConfigure={handleConfigure}
                                disableToggle={
                                    integration.comingSoon ||
                                    OAUTH_INTEGRATION_PROVIDERS.has(integration.provider)
                                }
                                alwaysShowConfigure={
                                    !integration.comingSoon &&
                                    OAUTH_INTEGRATION_PROVIDERS.has(integration.provider)
                                }
                            />
                        ))}
                    </div>
                )}

                {/* Enterprise Pagination */}
                {filteredIntegrations.length > 0 && (
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        totalItems={total}
                        pageSize={pageSize}
                        pageSizeOptions={[12, 24, 48]}
                        onPageSizeChange={handlePageSizeChange}
                        hasNextPage={page < totalPages}
                        hasPreviousPage={page > 1}
                        onPageChange={handlePageChange}
                        isLoading={isLoadingCatalog}
                        itemLabel="integrations"
                    />
                )}
            </div>

            {/* Single unified modal for all integrations 窶・including GitHub */}
            <IntegrationManagerModal
                open={modalOpen}
                onOpenChange={handleModalClose}
                initialAppId={modalInitialAppId}
                onConnected={() => void refetchCatalog()}
                onDisconnected={() => void refetchCatalog()}
            />
        </div>
    );
};
