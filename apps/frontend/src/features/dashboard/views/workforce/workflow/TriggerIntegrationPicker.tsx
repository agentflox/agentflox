'use client';

import React, { useMemo, useState } from 'react';
import { ChevronRight, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { IntegrationBrandImage } from '@/features/integrations/components/IntegrationBrandImage';
import { getIntegrationBrandImage } from '@/features/integrations/integrationBrandImages';
import { getTriggerConnectionStatus } from '@/features/integrations/components/IntegrationProviderIcon';
import { INTEGRATIONS_V2_ENABLED } from '@/features/integrations/catalogMapping';

export type TriggerIntegrationItem = {
  id: string;
  name: string;
  /** Catalog / brand image key */
  brandKey: string;
  catalogId?: string;
  /** When true, selecting shows coming-soon toast instead of activating */
  comingSoon?: boolean;
};

/** Primary triggers shown at the top of the picker. */
export const PRIMARY_TRIGGER_INTEGRATIONS: TriggerIntegrationItem[] = [
  { id: 'slack', name: 'Slack', brandKey: 'slack', catalogId: 'slack' },
  { id: 'microsoft_teams', name: 'Microsoft Teams', brandKey: 'microsoft_teams', comingSoon: true },
  { id: 'gmail', name: 'Google Mail', brandKey: 'gmail', catalogId: 'google_mail' },
  { id: 'calendar', name: 'Google Calendar', brandKey: 'google_calendar', catalogId: 'google_calendar' },
  { id: 'github', name: 'GitHub', brandKey: 'github', catalogId: 'github' },
  { id: 'google_drive', name: 'Google Drive', brandKey: 'google_drive', catalogId: 'google_drive', comingSoon: true },
  { id: 'discord', name: 'Discord', brandKey: 'discord', comingSoon: true },
  { id: 'figma', name: 'Figma', brandKey: 'figma', comingSoon: true },
  { id: 'notion', name: 'Notion', brandKey: 'notion', comingSoon: true },
  { id: 'youtube', name: 'YouTube', brandKey: 'youtube', comingSoon: true },
  { id: 'facebook', name: 'Facebook', brandKey: 'facebook', comingSoon: true },
  { id: 'webhook', name: 'Webhook', brandKey: 'webhook', catalogId: 'webhook' },
  { id: 'schedule', name: 'Recurring Schedule', brandKey: 'schedule', catalogId: 'schedule' },
];

/** Extra integrations revealed via See more / Load more. */
export const MORE_TRIGGER_INTEGRATIONS: TriggerIntegrationItem[] = [
  { id: 'codegen', name: 'Codegen', brandKey: 'codegen', comingSoon: true },
  { id: 'google_docs', name: 'Google Docs', brandKey: 'google_docs', comingSoon: true },
  { id: 'google_sheets', name: 'Google Sheets', brandKey: 'google_sheets', comingSoon: true },
];

const PAGE_SIZE = 8;

type TriggerIntegrationPickerProps = {
  providersByCatalogId: Record<
    string,
    { isConnected: boolean; verified: boolean; accountsCount: number }
  >;
  onSelect: (item: TriggerIntegrationItem) => void;
  onComingSoon?: (item: TriggerIntegrationItem) => void;
};

export function TriggerIntegrationPicker({
  providersByCatalogId,
  onSelect,
  onComingSoon,
}: TriggerIntegrationPickerProps) {
  const [search, setSearch] = useState('');
  const [moreExpanded, setMoreExpanded] = useState(false);
  const [moreVisibleCount, setMoreVisibleCount] = useState(PAGE_SIZE);

  const filteredPrimary = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PRIMARY_TRIGGER_INTEGRATIONS;
    return PRIMARY_TRIGGER_INTEGRATIONS.filter((t) => t.name.toLowerCase().includes(q));
  }, [search]);

  const filteredMore = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = MORE_TRIGGER_INTEGRATIONS.filter((t) => getIntegrationBrandImage(t.brandKey));
    if (!q) return list;
    return list.filter((t) => t.name.toLowerCase().includes(q));
  }, [search]);

  const visibleMore = moreExpanded ? filteredMore.slice(0, moreVisibleCount) : [];
  const hasMoreToLoad = moreExpanded && moreVisibleCount < filteredMore.length;

  const handleClick = (item: TriggerIntegrationItem) => {
    if (item.comingSoon) {
      onComingSoon?.(item);
      return;
    }
    onSelect(item);
  };

  return (
    <div className="space-y-5">
      <div className="flex h-9 items-center rounded-md border border-zinc-200 bg-white px-3 transition-all focus-within:border-transparent focus-within:[background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(to_right,#3b82f6,#a855f7,#ec4899)_border-box]">
        <Search className="h-4 w-4 shrink-0 text-zinc-400" />
        <Input
          variant="ghost"
          placeholder="Search triggers..."
          className="h-full border-none bg-transparent pl-2 pr-0 shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-0.5">
        {filteredPrimary.map((trigger) => {
          const connection =
            INTEGRATIONS_V2_ENABLED && trigger.catalogId
              ? getTriggerConnectionStatus(trigger.id, providersByCatalogId)
              : null;
          return (
            <button
              key={trigger.id}
              type="button"
              onClick={() => handleClick(trigger)}
              className="group flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-zinc-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white">
                <IntegrationBrandImage provider={trigger.brandKey} size={24} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-zinc-800">
                  {trigger.name}
                </span>
                {connection && !trigger.comingSoon && (
                  <span
                    className={cn(
                      'mt-0.5 block text-[11px] font-medium',
                      connection.isConnected ? 'text-emerald-600' : 'text-zinc-400',
                    )}
                  >
                    {connection.isConnected ? 'Connected' : 'Not connected'}
                  </span>
                )}
                {trigger.comingSoon && (
                  <span className="mt-0.5 block text-[11px] font-medium text-zinc-400">
                    Coming soon
                  </span>
                )}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500" />
            </button>
          );
        })}
      </div>

      <div className="space-y-3 border-t border-zinc-100 pt-5">
        <div>
          <h3 className="text-[15px] font-bold text-zinc-900">All integrations</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
            Trigger this workforce from Slack, GitHub, Gmail, and other integrations.
          </p>
        </div>

        {moreExpanded && visibleMore.length > 0 && (
          <div className="space-y-0.5">
            {visibleMore.map((trigger) => (
              <button
                key={trigger.id}
                type="button"
                onClick={() => handleClick(trigger)}
                className="group flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-zinc-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white">
                  <IntegrationBrandImage provider={trigger.brandKey} size={24} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-800">
                  {trigger.name}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300" />
              </button>
            ))}
          </div>
        )}

        {!moreExpanded ? (
          <Button
            type="button"
            onClick={() => {
              setMoreExpanded(true);
              setMoreVisibleCount(PAGE_SIZE);
            }}
            className="h-10 gap-1.5 rounded-full bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-700 mt-2"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            See more
          </Button>
        ) : hasMoreToLoad ? (
          <Button
            type="button"
            onClick={() => setMoreVisibleCount((n) => n + PAGE_SIZE)}
            className="h-10 gap-1.5 rounded-full bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-700 mt-2"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Load more
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** Lookup helper for selected trigger detail views. */
export function findTriggerIntegration(id: string): TriggerIntegrationItem | undefined {
  return (
    PRIMARY_TRIGGER_INTEGRATIONS.find((t) => t.id === id) ||
    MORE_TRIGGER_INTEGRATIONS.find((t) => t.id === id)
  );
}
