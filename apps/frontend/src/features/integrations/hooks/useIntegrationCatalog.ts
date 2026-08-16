import { trpc } from '@/lib/trpc';
import { useMemo } from 'react';
import { CATALOG_TO_UI_PROVIDER } from '../catalogMapping';

export type CatalogProviderView = {
  providerId: string;
  displayName: string;
  verified: boolean;
  isConnected: boolean;
  accountsCount: number;
  accounts: Array<{
    id: string;
    providerAccountId?: string;
    primaryLabel?: string;
    secondaryLabel?: string | null;
    avatarUrl?: string | null;
  }>;
  actions: Array<{
    actionId: string;
    displayName: string;
    description: string;
    verified: boolean;
    toolName: string;
  }>;
};

export type IntegrationPlatformStatus = {
  openai: boolean;
  anthropic: boolean;
};

export function useIntegrationCatalog() {
  const query = trpc.integration.listCatalog.useQuery(undefined, {
    staleTime: 60_000,
    gcTime: 120_000,
    refetchOnWindowFocus: false,
  });

  const { providersByUiKey, providersByCatalogId } = useMemo(() => {
    const byUiKey: Record<string, CatalogProviderView> = {};
    const byCatalogId: Record<string, CatalogProviderView> = {};
    if (query.data?.providers) {
      for (const provider of query.data.providers) {
        const uiKey = CATALOG_TO_UI_PROVIDER[provider.providerId] ?? provider.providerId;
        byUiKey[uiKey] = provider;
        byCatalogId[provider.providerId] = provider;
      }
    }
    return { providersByUiKey: byUiKey, providersByCatalogId: byCatalogId };
  }, [query.data?.providers]);

  const platform = useMemo<IntegrationPlatformStatus>(
    () => ({
      openai: query.data?.platform?.openai ?? false,
      anthropic: query.data?.platform?.anthropic ?? false,
    }),
    [query.data?.platform],
  );

  return {
    ...query,
    schemaVersion: query.data?.schemaVersion,
    platform,
    providersByUiKey,
    providersByCatalogId,
    providers: query.data?.providers ?? [],
  };
}
