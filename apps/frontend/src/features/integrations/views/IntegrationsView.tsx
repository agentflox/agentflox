'use client';

import React, { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { INTEGRATION_CATEGORIES } from '../integrationCategories';
import { IntegrationCard } from '../components/IntegrationCard';
import { useIntegrationCatalog } from '../hooks/useIntegrationCatalog';
import { buildIntegrationsList } from '../buildIntegrationsList';
import { INTEGRATION_UI_META, OAUTH_INTEGRATION_PROVIDERS } from '../integrationUiMeta';
import { SlidersHorizontal, Filter, ArrowUpDown, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuPortal,
    DropdownMenuSubContent,
    DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { toast } from 'sonner';
import { PageHeader } from '@/entities/shared/components/PageHeader';
import { SearchSection } from '@/entities/shared/components/SearchSection';

const GitHubConfigDialog = dynamic(
    () => import('../components/GitHubConfigDialog').then((m) => ({ default: m.GitHubConfigDialog })),
    { ssr: false },
);

const IntegrationConnectDialog = dynamic(
    () => import('../components/IntegrationConnectDialog').then((m) => ({ default: m.IntegrationConnectDialog })),
    { ssr: false },
);

export const IntegrationsView = () => {
    const [filters, setFilters] = useState<{ category: string; status: string }>({ category: 'all', status: 'all' });
    const [sort, setSort] = useState<Array<{ id: string; desc: boolean }>>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [configuringProvider, setConfiguringProvider] = useState<string | null>(null);
    const [selectedGithubAccountId, setSelectedGithubAccountId] = useState<string | null>(null);

    const {
        platform,
        providersByUiKey,
        providers: catalogProviders,
        isLoading: isLoadingCatalog,
        refetch: refetchCatalog,
    } = useIntegrationCatalog();

    const githubDialogOpen = configuringProvider === 'github';
    const {
        data: githubAccounts,
        isLoading: isLoadingGithubAccounts,
        refetch: refetchGithubAccounts,
    } = trpc.integration.githubListAccounts.useQuery(
        { enrichProfiles: true },
        {
            enabled: githubDialogOpen,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
        },
    );

    const disconnectGithub = trpc.integration.githubDisconnect.useMutation({
        onSuccess: () => {
            toast.success("GitHub account disconnected");
            void refetchGithubAccounts();
            void refetchCatalog();
            setSelectedGithubAccountId(null);
        },
        onError: (error) => {
            toast.error("Failed to disconnect GitHub account: " + error.message);
        }
    });

    const handleToggle = useCallback((provider: string, _enabled: boolean) => {
        if (provider === "github") return;
    }, []);

    const handleConfigure = useCallback((provider: string) => {
        if (provider !== "github") {
            setSelectedGithubAccountId(null);
        }
        setConfiguringProvider(provider);
    }, []);

    const handleDisconnect = useCallback((accountId: string) => {
        disconnectGithub.mutate({ accountId });
    }, [disconnectGithub]);

    const handleGithubDialogClose = useCallback(() => {
        setConfiguringProvider(null);
        setSelectedGithubAccountId(null);
    }, []);

    const handleGithubUpdateConfig = useCallback(() => {
        void refetchGithubAccounts();
        void refetchCatalog();
    }, [refetchGithubAccounts, refetchCatalog]);

    const handleIntegrationRefresh = useCallback(() => {
        void refetchCatalog();
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

    const activeFiltersCount = (filters.category !== 'all' ? 1 : 0) + (filters.status !== 'all' ? 1 : 0);

    const githubTools = useMemo(() => providersByUiKey.github?.actions ?? [], [providersByUiKey.github?.actions]);

    const configuringIntegration = useMemo(() => {
        if (!configuringProvider) return undefined;
        return filteredIntegrations.find((i) => i.provider === configuringProvider) ??
            integrations.find((i) => i.provider === configuringProvider);
    }, [configuringProvider, filteredIntegrations, integrations]);

    const configuringCatalog = configuringProvider
        ? providersByUiKey[configuringProvider]
        : undefined;
    const configuringTools = useMemo(() => configuringCatalog?.actions ?? [], [configuringCatalog?.actions]);

    const githubPickerAccounts = useMemo(() => {
        if (githubAccounts && githubAccounts.length > 0) {
            return githubAccounts;
        }
        const githubCatalogAccounts = providersByUiKey.github?.accounts ?? [];
        return githubCatalogAccounts.map((account) => ({
            id: account.id,
            providerAccountId: account.providerAccountId ?? account.id,
            login: account.primaryLabel ?? null,
            avatarUrl: account.avatarUrl ?? null,
            htmlUrl: account.secondaryLabel ?? null,
        }));
    }, [githubAccounts, providersByUiKey.github?.accounts]);

    const githubIsConnected = githubPickerAccounts.length > 0;

    return (
        <>
            <div className="pb-6">
                <div className="pb-4 bg-white border-b border-zinc-200">
                    <PageHeader
                        title="Integrations"
                        description="Connect your favorite tools to streamline your workflow and boost productivity."
                    />

                    <div className="mt-4">
                        <SearchSection
                            searchValue={searchQuery}
                            onSearchChange={setSearchQuery}
                            onSearchSubmit={() => { }}
                            searchPlaceholder="Search integrations..."
                            resultsCount={filteredIntegrations.length}
                            showSort={false}
                            showFilters={false}
                            onCreateNew={() => { }}
                            createButtonText=""
                        >
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-9 px-3 gap-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 transition-all">
                                        <Filter className="h-4 w-4" />
                                        <span>Filter</span>
                                        {activeFiltersCount > 0 && (
                                            <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-200/70 px-1.5 text-xs font-semibold text-zinc-700">
                                                {activeFiltersCount}
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
                                        <DropdownMenuSubTrigger>Category</DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                            <DropdownMenuSubContent>
                                                {INTEGRATION_CATEGORIES.map((cat) => (
                                                    <DropdownMenuCheckboxItem
                                                        key={cat.id}
                                                        checked={filters.category === cat.id}
                                                        onCheckedChange={() => setFilters(prev => ({ ...prev, category: cat.id }))}
                                                    >
                                                        {cat.label}
                                                    </DropdownMenuCheckboxItem>
                                                ))}
                                            </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenuSub>

                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuCheckboxItem checked={filters.status === 'all'} onCheckedChange={() => setFilters(prev => ({ ...prev, status: 'all' }))}>All</DropdownMenuCheckboxItem>
                                                <DropdownMenuCheckboxItem checked={filters.status === 'connected'} onCheckedChange={() => setFilters(prev => ({ ...prev, status: 'connected' }))}>Connected</DropdownMenuCheckboxItem>
                                                <DropdownMenuCheckboxItem checked={filters.status === 'disconnected'} onCheckedChange={() => setFilters(prev => ({ ...prev, status: 'disconnected' }))}>Not Connected</DropdownMenuCheckboxItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                </DropdownMenuContent>
                            </DropdownMenu>

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
                                            { id: "name", label: "Name" },
                                            { id: "status", label: "Connection Status" },
                                        ].map((opt) => {
                                            const currentSortIndex = sort.findIndex(s => s.id === opt.id);
                                            const isSorted = currentSortIndex !== -1;
                                            const isDesc = isSorted && sort[currentSortIndex].desc;
                                            return (
                                                <div
                                                    key={opt.id}
                                                    className="flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-zinc-50 transition-colors text-zinc-600"
                                                    onClick={() => {
                                                        if (isSorted) {
                                                            if (isDesc) setSort([]);
                                                            else setSort([{ id: opt.id, desc: true }]);
                                                        } else {
                                                            setSort([{ id: opt.id, desc: false }]);
                                                        }
                                                    }}
                                                >
                                                    <span className="flex-1">{opt.label}</span>
                                                    {isSorted && (
                                                        <>
                                                            {isDesc ? <ChevronDown className="h-3.5 w-3.5 text-zinc-900" /> : <ChevronUp className="h-3.5 w-3.5 text-zinc-900" />}
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </SearchSection>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-6 pb-12">
                    {isLoadingCatalog ? (
                        Array.from({ length: 8 }).map((_, i) => (
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
                        ))
                    ) : filteredIntegrations.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
                                <SlidersHorizontal className="h-8 w-8 text-zinc-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-zinc-900">No integrations found</h3>
                            <p className="text-zinc-500 mt-2">
                                Try adjusting your search or filter to find what you're looking for.
                            </p>
                            <Button
                                variant="ghost"
                                className="mt-4 text-zinc-900"
                                onClick={() => { setFilters({ category: 'all', status: 'all' }); setSort([]); setSearchQuery(''); }}
                            >
                                Clear filters
                            </Button>
                        </div>
                    ) : (
                        filteredIntegrations.map((integration) => (
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
                        ))
                    )}
                </div>
            </div>

            <GitHubConfigDialog
                open={githubDialogOpen}
                onOpenChange={(open) => {
                    if (!open) handleGithubDialogClose();
                }}
                githubAccounts={githubPickerAccounts}
                isLoadingGithubAccounts={githubDialogOpen && !!isLoadingGithubAccounts}
                selectedGithubAccountId={selectedGithubAccountId}
                onSelectAccount={setSelectedGithubAccountId}
                onClose={handleGithubDialogClose}
                onDisconnect={handleDisconnect}
                isConnected={githubIsConnected}
                onUpdateConfig={handleGithubUpdateConfig}
                tools={githubTools}
            />

            <IntegrationConnectDialog
                open={!!configuringProvider && configuringProvider !== "github"}
                onOpenChange={(open) => { if (!open) setConfiguringProvider(null); }}
                uiProvider={configuringProvider}
                displayName={configuringIntegration?.name ?? configuringProvider ?? undefined}
                description={
                    configuringIntegration?.description ??
                    (configuringProvider ? INTEGRATION_UI_META[configuringProvider]?.description : undefined)
                }
                isConnected={configuringIntegration?.isConnected ?? false}
                verified={configuringIntegration?.verified}
                beta={configuringIntegration?.beta}
                accounts={configuringCatalog?.accounts ?? []}
                tools={configuringTools}
                onDisconnected={handleIntegrationRefresh}
                onConnected={handleIntegrationRefresh}
            />
        </>
    );
};
