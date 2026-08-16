'use client';

import React from 'react';
import { IntegrationBrandImage } from './IntegrationBrandImage';

type IntegrationProviderIconProps = {
  providerId: string;
  className?: string;
  size?: number;
};

export function IntegrationProviderIcon({
  providerId,
  className,
  size = 20,
}: IntegrationProviderIconProps) {
  return (
    <IntegrationBrandImage provider={providerId} size={size} className={className} />
  );
}

/** Workforce trigger id → catalog provider id */
export const TRIGGER_TO_CATALOG_PROVIDER: Record<string, string> = {
  slack: 'slack',
  gmail: 'google_mail',
  calendar: 'google_calendar',
  webhook: 'webhook',
  schedule: 'schedule',
  github: 'github',
};

export function getTriggerConnectionStatus(
  triggerId: string,
  providersByCatalogId: Record<string, { isConnected: boolean; verified: boolean; accountsCount: number }>,
): { isConnected: boolean; verified: boolean; needsConnect: boolean } {
  const catalogId = TRIGGER_TO_CATALOG_PROVIDER[triggerId];
  if (!catalogId) {
    if (triggerId === 'webhook' || triggerId === 'schedule') {
      return { isConnected: true, verified: true, needsConnect: false };
    }
    return { isConnected: false, verified: false, needsConnect: true };
  }
  const entry = providersByCatalogId[catalogId];
  const isConnected = entry?.isConnected ?? (triggerId === 'webhook' || triggerId === 'schedule');
  return {
    isConnected,
    verified: entry?.verified ?? false,
    needsConnect: !isConnected && catalogId !== 'webhook' && catalogId !== 'schedule',
  };
}
