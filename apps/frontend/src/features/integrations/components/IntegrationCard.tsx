'use client';

import React, { memo } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { IntegrationBrandImage } from './IntegrationBrandImage';
import { cn } from '@/lib/utils';
import type { IntegrationCardModel } from '../buildIntegrationsList';

interface IntegrationCardProps {
    integration: IntegrationCardModel;
    onToggle: (provider: string, enabled: boolean) => void;
    onConfigure?: (provider: string) => void;
    disableToggle?: boolean;
    alwaysShowConfigure?: boolean;
}

export const IntegrationCard = memo(function IntegrationCard({
    integration,
    onToggle,
    onConfigure,
    disableToggle = false,
    alwaysShowConfigure = false,
}: IntegrationCardProps) {
    const statusLabel = integration.comingSoon
        ? 'Coming soon'
        : integration.isConnected
            ? integration.accountsCount > 0
                ? `Connected · ${integration.accountsCount} account${integration.accountsCount === 1 ? '' : 's'}`
                : 'Connected'
            : 'Not connected';

    const handleCardClick = () => {
        if (!integration.comingSoon && onConfigure) {
            onConfigure(integration.provider);
        }
    };

    return (
        <Card
            className={cn(
                "h-full flex flex-col transition-all duration-200 border-zinc-200 bg-white",
                !integration.comingSoon && onConfigure && "cursor-pointer hover:border-zinc-300 hover:shadow-md hover:-translate-y-0.5",
                integration.isConnected && !integration.comingSoon && "border-zinc-300 ring-1 ring-zinc-200/50",
                integration.comingSoon && "opacity-90",
            )}
            onClick={handleCardClick}
        >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3 p-5">
                <div className="flex items-center gap-3 min-w-0">
                    <div
                        className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white',
                            integration.isConnected && !integration.comingSoon && 'ring-1 ring-zinc-200/80',
                        )}
                    >
                        <IntegrationBrandImage provider={integration.provider} size={28} />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <h3 className="font-semibold text-zinc-900 leading-none truncate">
                            {integration.name}
                        </h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {integration.comingSoon && (
                                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] uppercase tracking-wider font-semibold h-5 bg-zinc-100 text-zinc-500 border-transparent">
                                    Coming soon
                                </Badge>
                            )}
                            {integration.isEnterprise && (
                                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] uppercase tracking-wider font-semibold h-5 bg-zinc-100 text-zinc-500 border-transparent">
                                    Enterprise
                                </Badge>
                            )}
                            {integration.beta && (
                                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] uppercase tracking-wider font-semibold h-5 bg-amber-50 text-amber-700 border-transparent">
                                    Beta
                                </Badge>
                            )}
                            {integration.verified && !integration.comingSoon && (
                                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] uppercase tracking-wider font-semibold h-5 bg-emerald-50 text-emerald-700 border-transparent">
                                    Verified
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
                {/* Stop propagation so toggling the switch doesn't also trigger card click */}
                <div onClick={(e) => e.stopPropagation()}>
                    <Switch
                        checked={integration.isConnected && !integration.comingSoon}
                        disabled={disableToggle || integration.comingSoon}
                        onCheckedChange={(checked) => onToggle(integration.provider, checked)}
                    />
                </div>
            </CardHeader>

            <CardContent className="flex-1 p-5 pt-0">
                <p className="text-sm text-zinc-500 leading-relaxed line-clamp-3">
                    {integration.description}
                </p>
                {integration.toolsCount > 0 && (
                    <p className="mt-2 text-xs text-zinc-400">
                        {integration.toolsCount} tool{integration.toolsCount === 1 ? '' : 's'} available
                    </p>
                )}
            </CardContent>

            <CardFooter className="p-5 pt-0 mt-auto flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        integration.comingSoon
                            ? "bg-zinc-300"
                            : integration.isConnected
                                ? "bg-emerald-500"
                                : "bg-zinc-200"
                    )} />
                    <span className="text-xs font-medium text-zinc-500 truncate">
                        {statusLabel}
                    </span>
                </div>
            </CardFooter>
        </Card>
    );
});
