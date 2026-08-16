'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronLeft, ChevronRight, Link2, Loader2, Plug, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useIntegrationCatalog } from '../hooks/useIntegrationCatalog';
import { IntegrationBrandImage } from './IntegrationBrandImage';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

export type IntegrationActionSelection = {
  actionId: string;
  toolName: string;
  displayName: string;
  providerId: string;
  description?: string;
  systemToolId?: string;
  systemTool?: { id: string; name: string; displayName?: string | null; description?: string };
};

type PickerView = 'overview' | 'providers' | 'actions';

type IntegrationPickerPanelProps = {
  searchQuery?: string;
  onSelectAction: (action: IntegrationActionSelection) => void;
  /** Hide providers with zero verified actions (e.g. composite tool steps) */
  requireVerifiedActions?: boolean;
  className?: string;
  compact?: boolean;
  /**
   * overview — All integrations + connected only (workforce tools sidebar home)
   * providers — full provider list (default)
   */
  initialView?: Exclude<PickerView, 'actions'>;
  /** Called when user leaves a nested view back to overview (optional close/back hook). */
  onExitNested?: () => void;
  /** Controlled nested open — when set with initialView=overview, parent can force drill-in. */
  forceView?: PickerView | null;
  onViewChange?: (view: PickerView) => void;
};

export function IntegrationPickerPanel({
  searchQuery: externalSearch = '',
  onSelectAction,
  requireVerifiedActions = false,
  className,
  compact = false,
  initialView = 'providers',
  onExitNested,
  forceView,
  onViewChange,
}: IntegrationPickerPanelProps) {
  const [internalView, setInternalView] = useState<PickerView>(initialView);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [internalSearch, setInternalSearch] = useState('');
  const [actionsBackTo, setActionsBackTo] = useState<Exclude<PickerView, 'actions'>>('providers');
  const { providers, providersByCatalogId, isLoading } = useIntegrationCatalog();
  const systemToolsQuery = trpc.tool.systemList.useQuery(undefined, { staleTime: 60_000 });

  const view = forceView ?? internalView;
  const setView = (next: PickerView) => {
    setInternalView(next);
    onViewChange?.(next);
  };

  const searchQuery = view === 'overview' ? externalSearch : (externalSearch || internalSearch);

  const systemToolsByName = useMemo(() => {
    const map: Record<string, NonNullable<typeof systemToolsQuery.data>[number]> = {};
    for (const tool of systemToolsQuery.data ?? []) {
      if (tool.category === 'SAAS_INTEGRATION') {
        map[tool.name] = tool;
      }
    }
    return map;
  }, [systemToolsQuery.data]);

  const oauthProviders = useMemo(
    () =>
      providers.filter((provider) => {
        if (provider.providerId === 'webhook' || provider.providerId === 'schedule') return false;
        return true;
      }),
    [providers],
  );

  const connectedProviders = useMemo(
    () => oauthProviders.filter((p) => p.isConnected),
    [oauthProviders],
  );

  const filteredProviders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return oauthProviders.filter((provider) => {
      const verifiedActions = provider.actions.filter((a) => a.verified);
      if (requireVerifiedActions && verifiedActions.length === 0 && !provider.isConnected) {
        return false;
      }
      if (!q) return true;
      if (provider.displayName.toLowerCase().includes(q)) return true;
      return provider.actions.some(
        (a) =>
          a.displayName.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q),
      );
    });
  }, [oauthProviders, searchQuery, requireVerifiedActions]);

  const selectedProvider = selectedProviderId ? providersByCatalogId[selectedProviderId] : null;

  const openProviders = () => {
    setSelectedProviderId(null);
    setView('providers');
  };

  const openProvider = (providerId: string, from: Exclude<PickerView, 'actions'> = 'providers') => {
    setActionsBackTo(from);
    setSelectedProviderId(providerId);
    setView('actions');
  };

  const goBack = () => {
    if (view === 'actions') {
      setSelectedProviderId(null);
      setView(actionsBackTo);
      return;
    }
    if (view === 'providers') {
      setInternalSearch('');
      if (initialView === 'overview') {
        setView('overview');
        onExitNested?.();
      }
    }
  };

  const handleSelectAction = (action: {
    actionId: string;
    toolName: string;
    displayName: string;
    description?: string;
    providerId: string;
  }) => {
    const systemTool = systemToolsByName[action.toolName];
    onSelectAction({
      ...action,
      systemToolId: systemTool?.id,
      systemTool: systemTool
        ? {
            id: systemTool.id,
            name: systemTool.name,
            displayName: systemTool.displayName,
            description: systemTool.description,
          }
        : undefined,
    });
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8 text-sm text-zinc-500 gap-2', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading integrations...
      </div>
    );
  }

  // ── Actions for a provider ────────────────────────────────────────────────
  if (view === 'actions' && selectedProvider) {
    const actions = selectedProvider.actions.filter((a) => !requireVerifiedActions || a.verified);

    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-1.5 text-md font-semibold text-zinc-900">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center justify-center hover:text-zinc-700 hover:bg-zinc-100 p-2 rounded-md cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span>{selectedProvider.displayName}</span>
        </div>

        {!selectedProvider.isConnected && selectedProvider.providerId !== 'webhook' && (
          <Button variant="outline" size="sm" className="w-full gap-2" asChild>
            <Link href="/dashboard/integrations">
              <Link2 className="h-3.5 w-3.5" />
              Connect {selectedProvider.displayName}
            </Link>
          </Button>
        )}

        {actions.length === 0 ? (
          <p className="text-xs text-zinc-500 py-4 text-center">
            No executable actions yet. Connect this provider to get notified when tools are available.
          </p>
        ) : (
          <div className={cn('grid gap-1', compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
            {actions.map((action) => {
              const hasSystemTool = !!systemToolsByName[action.toolName];
              return (
                <button
                  key={action.actionId}
                  type="button"
                  disabled={requireVerifiedActions && !hasSystemTool}
                  onClick={() =>
                    handleSelectAction({
                      actionId: action.actionId,
                      toolName: action.toolName,
                      displayName: action.displayName,
                      description: action.description,
                      providerId: selectedProvider.providerId,
                    })
                  }
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors cursor-pointer',
                    hasSystemTool || !requireVerifiedActions
                      ? 'hover:bg-zinc-50 cursor-pointer'
                      : 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white">
                    <IntegrationBrandImage provider={selectedProvider.providerId} size={22} />
                    {selectedProvider.verified && (
                      <span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-white">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-normal text-zinc-800 truncate">
                    {action.displayName}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Full provider list ────────────────────────────────────────────────────
  if (view === 'providers') {
    return (
      <div className={cn('space-y-3', className)}>
        {initialView === 'overview' && (
         <div className="flex items-center gap-1.5 text-md font-semibold text-zinc-900">
            <button
              type="button"
              onClick={goBack}
              className="flex items-center justify-center hover:text-zinc-700 hover:bg-zinc-100 p-2 rounded-md cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span>Integrations</span>
          </div>
        )}

        <p className="text-sm text-zinc-500">Choose an integration to see available tool steps</p>

        {!externalSearch && (
          <div className="relative">
            <Input
              value={internalSearch}
              onChange={(e) => setInternalSearch(e.target.value)}
              placeholder="Search tool steps..."
              className="h-9 text-sm !border-zinc-200 transition-colors focus:!outline-none focus:!border-transparent focus:[background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(to_right,#3b82f6,#a855f7,#ec4899)_border-box]"
            />
          </div>
        )}

        {filteredProviders.length === 0 ? (
          <p className="text-xs text-zinc-500 py-4 text-center">No integrations match your search.</p>
        ) : (
          <div className="space-y-0.5">
            {filteredProviders.map((provider) => (
              <button
                key={provider.providerId}
                type="button"
                onClick={() => openProvider(provider.providerId, 'providers')}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white">
                  <IntegrationBrandImage provider={provider.providerId} size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-zinc-800 truncate">
                    {provider.displayName}
                  </span>
                  {provider.isConnected && (
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Connected
                    </span>
                  )}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Overview: All integrations + connected ────────────────────────────────
  return (
    <div className={cn('space-y-1', className)}>
      <button
        type="button"
        onClick={openProviders}
        className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-zinc-50 transition-colors group cursor-pointer"
      >
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white">
          <Plug className="h-4 w-4 text-zinc-800" />
        </span>
        <span className="min-w-0 flex-1 text-sm font-normal text-zinc-800">All integrations</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 group-hover:text-zinc-500" />
      </button>

      {connectedProviders.map((provider) => (
        <button
          key={provider.providerId}
          type="button"
          onClick={() => openProvider(provider.providerId, 'overview')}
          className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-zinc-50 transition-colors group cursor-pointer"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white">
            <IntegrationBrandImage provider={provider.providerId} size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-normal text-zinc-800 truncate">
              {provider.displayName}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Connected
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 group-hover:text-zinc-500" />
        </button>
      ))}

      {!isLoading && connectedProviders.length === 0 && (
        <p className="px-2 py-2 text-[12px] text-zinc-400">
          No connected integrations yet.{' '}
          <Link href="/dashboard/integrations" className="text-zinc-600 underline-offset-2 hover:underline">
            Connect one
          </Link>
        </p>
      )}
    </div>
  );
}
