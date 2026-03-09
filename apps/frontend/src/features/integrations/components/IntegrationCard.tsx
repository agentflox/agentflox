'use client';

import React from 'react';
import { Integration } from '@agentflox/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { INTEGRATION_ICONS } from '../constants';
import { cn } from '@/lib/utils';
import { Settings, ExternalLink } from 'lucide-react';

interface IntegrationCardProps {
    integration: Omit<Integration, 'id'> & { id?: string };
    onToggle: (provider: string, enabled: boolean) => void;
    onConfigure?: (provider: string) => void;
    /** When true, the toggle switch is disabled (e.g. OAuth-managed integrations like GitHub) */
    disableToggle?: boolean;
    /** When true, Configure button is shown even when disconnected (e.g. for OAuth connect flow) */
    alwaysShowConfigure?: boolean;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
    integration,
    onToggle,
    onConfigure,
    disableToggle = false,
    alwaysShowConfigure = false,
}) => {
    const Icon = INTEGRATION_ICONS[integration.provider] || Settings;

    return (
        <Card className={cn(
            "h-full flex flex-col transition-all duration-200 border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm",
            integration.isConnected && "border-zinc-300 ring-1 ring-zinc-200/50"
        )}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3 p-5">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2.5 rounded-lg transition-colors",
                        integration.isConnected
                            ? "bg-zinc-900 text-white"
                            : "bg-zinc-100 text-zinc-500"
                    )}>
                        <Icon size={20} strokeWidth={2} />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <h3 className="font-semibold text-zinc-900 leading-none">
                            {integration.name}
                        </h3>
                        {integration.isEnterprise && (
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] uppercase tracking-wider font-semibold w-fit mt-1 h-5 bg-zinc-100 text-zinc-500 hover:bg-zinc-200 border-transparent">
                                Enterprise
                            </Badge>
                        )}
                    </div>
                </div>
                <Switch
                    checked={integration.isConnected}
                    disabled={disableToggle}
                    onCheckedChange={(checked) => onToggle(integration.provider, checked)}
                />
            </CardHeader>

            <CardContent className="flex-1 p-5 pt-0">
                <p className="text-sm text-zinc-500 leading-relaxed">
                    {integration.description}
                </p>
            </CardContent>

            <CardFooter className="p-5 pt-0 mt-auto flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "w-2 h-2 rounded-full",
                        integration.isConnected ? "bg-emerald-500" : "bg-zinc-200"
                    )} />
                    <span className="text-xs font-medium text-zinc-500">
                        {integration.isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>

                {(integration.isConnected || alwaysShowConfigure) && onConfigure && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-zinc-500 hover:text-zinc-900"
                        onClick={() => onConfigure(integration.provider)}
                    >
                        <Settings className="w-4 h-4 mr-2" />
                        Configure
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
};
