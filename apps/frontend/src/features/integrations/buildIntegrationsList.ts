import type { IntegrationCategory } from '@agentflox/types';
import { CATALOG_TO_UI_PROVIDER } from './catalogMapping';
import type { CatalogProviderView } from './hooks/useIntegrationCatalog';
import {
  COMING_SOON_UI_PROVIDERS,
  CATALOG_UI_PROVIDERS,
  INTEGRATION_UI_META,
  PLATFORM_INTEGRATION_PROVIDERS,
} from './integrationUiMeta';

export type IntegrationCardModel = {
  provider: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  isConnected: boolean;
  isEnterprise: boolean;
  verified?: boolean;
  beta?: boolean;
  accountsCount: number;
  toolsCount: number;
  comingSoon: boolean;
  isOAuth: boolean;
};

type PlatformStatus = {
  openai?: boolean;
  anthropic?: boolean;
} | null | undefined;

function metaFor(provider: string) {
  return INTEGRATION_UI_META[provider];
}

function catalogDescription(catalog: CatalogProviderView): string {
  const meta = metaFor(CATALOG_TO_UI_PROVIDER[catalog.providerId] ?? catalog.providerId);
  if (meta?.description) return meta.description;
  const firstAction = catalog.actions[0];
  return firstAction?.description ?? `${catalog.displayName} integration.`;
}

function fromCatalog(catalog: CatalogProviderView): IntegrationCardModel {
  const provider = CATALOG_TO_UI_PROVIDER[catalog.providerId] ?? catalog.providerId;
  const meta = metaFor(provider);
  const isGooglePreCasa = catalog.providerId.startsWith('google_');

  return {
    provider,
    name: catalog.displayName,
    description: catalogDescription(catalog),
    category: meta?.category ?? 'other',
    isConnected: catalog.isConnected,
    isEnterprise: meta?.isEnterprise ?? false,
    verified: catalog.verified,
    beta: !catalog.verified && (isGooglePreCasa || catalog.providerId === 'slack'),
    accountsCount: catalog.accountsCount,
    toolsCount: catalog.actions.length,
    comingSoon: false,
    isOAuth:
      catalog.providerId !== 'webhook' &&
      catalog.providerId !== 'schedule' &&
      !!catalog.providerId,
  };
}

function fromPlatformProvider(
  provider: 'openai' | 'anthropic',
  platform: PlatformStatus,
): IntegrationCardModel {
  const meta = metaFor(provider)!;
  const isConnected = provider === 'openai' ? !!platform?.openai : !!platform?.anthropic;

  return {
    provider,
    name: provider === 'openai' ? 'OpenAI' : 'Anthropic',
    description: meta.description,
    category: meta.category,
    isConnected,
    isEnterprise: meta.isEnterprise ?? false,
    verified: isConnected,
    beta: false,
    accountsCount: 0,
    toolsCount: 0,
    comingSoon: false,
    isOAuth: false,
  };
}

function fromComingSoon(provider: string): IntegrationCardModel {
  const meta = metaFor(provider)!;
  const label = provider
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return {
    provider,
    name: label,
    description: meta.description,
    category: meta.category,
    isConnected: false,
    isEnterprise: meta.isEnterprise ?? false,
    verified: false,
    beta: false,
    accountsCount: 0,
    toolsCount: 0,
    comingSoon: true,
    isOAuth: false,
  };
}

const CATALOG_DISPLAY_ORDER = [
  'github',
  'slack',
  'gmail',
  'google_calendar',
  'google_drive',
];

/** Pre-computed index map so orderIndex() is O(1) instead of O(n) per comparison. */
const DISPLAY_ORDER_MAP = new Map<string, number>(
  CATALOG_DISPLAY_ORDER.map((p, i) => [p, i]),
);
const DISPLAY_ORDER_FALLBACK = CATALOG_DISPLAY_ORDER.length;

function cardRank(card: IntegrationCardModel): number {
  if (card.comingSoon) return 3;
  if (card.isConnected) return 0;
  return 1;
}

function sortIntegrationCards(cards: IntegrationCardModel[]): IntegrationCardModel[] {
  return [...cards].sort((a, b) => {
    const rankDiff = cardRank(a) - cardRank(b);
    if (rankDiff !== 0) return rankDiff;
    const aOrder = DISPLAY_ORDER_MAP.get(a.provider) ?? DISPLAY_ORDER_FALLBACK;
    const bOrder = DISPLAY_ORDER_MAP.get(b.provider) ?? DISPLAY_ORDER_FALLBACK;
    const orderDiff = aOrder - bOrder;
    if (orderDiff !== 0) return orderDiff;
    return a.name.localeCompare(b.name);
  });
}

/** Merge catalog + platform env status into cards for the integrations grid. */
export function buildIntegrationsList(
  catalogProviders: CatalogProviderView[],
  platform?: PlatformStatus,
): IntegrationCardModel[] {
  const cards: IntegrationCardModel[] = [];
  const seen = new Set<string>();

  for (const catalog of catalogProviders) {
    const provider = CATALOG_TO_UI_PROVIDER[catalog.providerId] ?? catalog.providerId;
    if (!CATALOG_UI_PROVIDERS.has(provider)) continue;
    cards.push(fromCatalog(catalog));
    seen.add(provider);
  }

  for (const provider of PLATFORM_INTEGRATION_PROVIDERS) {
    if (seen.has(provider)) continue;
    cards.push(fromPlatformProvider(provider as 'openai' | 'anthropic', platform));
    seen.add(provider);
  }

  for (const provider of COMING_SOON_UI_PROVIDERS) {
    if (seen.has(provider)) continue;
    cards.push(fromComingSoon(provider));
    seen.add(provider);
  }

  return sortIntegrationCards(cards);
}
