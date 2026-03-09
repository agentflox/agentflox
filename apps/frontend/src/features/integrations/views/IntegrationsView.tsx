'use client';

import React, { useState, useMemo } from 'react';
import { Integration } from '@agentflox/types';
import { INTEGRATION_CATEGORIES, AVAILABLE_INTEGRATIONS } from '../constants';
import { IntegrationCard } from '../components/IntegrationCard';
import { GitHubConfigDialog } from '../components/GitHubConfigDialog';
import { Input } from '@/components/ui/input';
import { Search, SlidersHorizontal, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from 'sonner';
import { PageHeader } from '@/entities/shared/components/PageHeader';
import { SearchSection } from '@/entities/shared/components/SearchSection';

export const IntegrationsView = () => {
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [configuringProvider, setConfiguringProvider] = useState<string | null>(null);
    const [selectedGithubAccountId, setSelectedGithubAccountId] = useState<string | null>(null);

    const { data: providersStatus, isLoading: isLoadingProviders, refetch: refetchProviders } = trpc.integration.listProviders.useQuery();
    const { data: githubAccounts, isLoading: isLoadingGithubAccounts, refetch: refetchGithubAccounts } = trpc.integration.githubListAccounts.useQuery(
        undefined,
        { enabled: !!providersStatus }
    );

    const disconnectGithub = trpc.integration.githubDisconnect.useMutation({
        onSuccess: () => {
            toast.success("GitHub account disconnected");
            refetchGithubAccounts();
            refetchProviders();
            setSelectedGithubAccountId(null);
        },
        onError: (error) => {
            toast.error("Failed to disconnect GitHub account: " + error.message);
        }
    });

    const handleToggle = (provider: string, _enabled: boolean) => {
        // GitHub connection is controlled via OAuth (connect/unlink), not a local toggle
        if (provider === "github") return;
    };

    const handleConfigure = (provider: string) => {
        if (provider !== "github") {
            setSelectedGithubAccountId(null);
        }
        setConfiguringProvider(provider);
    };

    const handleDisconnect = (accountId: string) => {
        if (confirm("Are you sure you want to disconnect this GitHub account?")) {
            disconnectGithub.mutate({ accountId });
        }
    };

    const filteredIntegrations = useMemo(() => {
        return AVAILABLE_INTEGRATIONS.filter(integration => {
            // Filter by category
            if (activeCategory !== 'all' && integration.category !== activeCategory) {
                return false;
            }
            // Filter by search
            if (searchQuery && !integration.name.toLowerCase().includes(searchQuery.toLowerCase()) && !integration.description.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }
            return true;
        }).map(integration => {
            const providerKey = integration.provider as keyof NonNullable<typeof providersStatus>;
            const statusForProvider = providersStatus && (providersStatus as any)[providerKey];
            const isConnected = !!statusForProvider?.isConnected;

            return { ...integration, isConnected };
        });
    }, [activeCategory, searchQuery, providersStatus]);

    return (
        <div className="h-full flex flex-col space-y-6 max-w-[1600px] mx-auto w-full">
            <PageHeader
                title="Integrations"
                description="Connect your favorite tools to streamline your workflow and boost productivity."
                actions={
                    <Button variant="outline" className="gap-2 border-zinc-200 text-zinc-700 hover:text-zinc-900">
                        <Plus size={16} />
                        <span>Request Integration</span>
                    </Button>
                }
            />

            <SearchSection
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                onSearchSubmit={() => { }}
                searchPlaceholder="Search integrations..."
                resultsCount={filteredIntegrations.length}
                showSort={false}
                showFilters={false}
                onCreateNew={() => { }} // Not used
                createButtonText=""
            >
                {/* Category Filters */}
                <ScrollArea className="w-full sm:w-auto max-w-[calc(100vw-32px)] whitespace-nowrap">
                    <div className="flex items-center gap-1 p-1">
                        {INTEGRATION_CATEGORIES.map((category) => (
                            <Button
                                key={category.id}
                                variant={activeCategory === category.id ? "primary" : "ghost"}
                                onClick={() => setActiveCategory(category.id)}
                                className={`
                                    h-9 rounded-full px-4 text-sm font-medium transition-all
                                    ${activeCategory === category.id
                                        ? "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800"
                                        : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                                    }
                                `}
                            >
                                {category.label}
                            </Button>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" className="invisible" />
                </ScrollArea>
            </SearchSection>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                {isLoadingProviders && (
                    <div className="col-span-full flex items-center justify-center py-8 text-sm text-zinc-500 gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Loading integrations...</span>
                    </div>
                )}
                {filteredIntegrations.map((integration) => (
                    <IntegrationCard
                        key={integration.provider}
                        integration={integration}
                        onToggle={handleToggle}
                        onConfigure={handleConfigure}
                        disableToggle={integration.provider === "github"}
                        alwaysShowConfigure={integration.provider === "github"}
                    />
                ))}
                {filteredIntegrations.length === 0 && (
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
                            onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}
                        >
                            Clear filters
                        </Button>
                    </div>
                )}
            </div>

            <GitHubConfigDialog
                open={configuringProvider === "github"}
                onOpenChange={(open) => {
                    if (!open) {
                        setConfiguringProvider(null);
                        setSelectedGithubAccountId(null);
                    }
                }}
                githubAccounts={githubAccounts}
                isLoadingGithubAccounts={!!isLoadingGithubAccounts}
                selectedGithubAccountId={selectedGithubAccountId}
                onSelectAccount={setSelectedGithubAccountId}
                onClose={() => {
                    setConfiguringProvider(null);
                    setSelectedGithubAccountId(null);
                }}
                onDisconnect={handleDisconnect}
                isConnected={!!providersStatus?.github?.isConnected}
                config={providersStatus?.github?.config}
                onUpdateConfig={() => refetchProviders()}
            />

            {/* Generic provider dialog (placeholder until each provider is implemented) */}
            <Dialog
                open={!!configuringProvider && configuringProvider !== "github"}
                onOpenChange={(open) => {
                    if (!open) setConfiguringProvider(null);
                }}
            >
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            Configure{" "}
                            {configuringProvider
                                ? AVAILABLE_INTEGRATIONS.find(i => i.provider === configuringProvider)?.name
                                : "Integration"}
                        </DialogTitle>
                        <DialogDescription>
                            Manage settings and permissions for this integration.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6 space-y-4">
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-zinc-900">Sync Settings</h4>
                            <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
                                <span className="text-sm text-zinc-600">Auto-sync data</span>
                                <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
                                <span className="text-sm text-zinc-600">Push notifications</span>
                                <Switch defaultChecked />
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-zinc-900">Permissions</h4>
                            <p className="text-xs text-zinc-500">This integration has access to:</p>
                            <ul className="list-disc list-inside text-xs text-zinc-600 space-y-1 ml-1">
                                <li>Read user profile</li>
                                <li>Sync calendar events</li>
                                <li>Send messages on your behalf</li>
                            </ul>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfiguringProvider(null)}>Cancel</Button>
                        <Button onClick={() => setConfiguringProvider(null)}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
