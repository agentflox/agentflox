import type { AiModelView, AiModelProvider } from '@agentflox/types';
import { creditTierLabel } from '@agentflox/types';

export function filterModels(
  models: AiModelView[],
  opts: {
    search?: string;
    providers?: AiModelProvider[];
    supportsThinking?: boolean;
    customOnly?: boolean;
  } = {},
): AiModelView[] {
  const q = opts.search?.trim().toLowerCase();
  return models.filter((m) => {
    if (opts.customOnly && !m.isCustom) return false;
    if (opts.supportsThinking && !m.supportsThinking) return false;
    if (opts.providers?.length && !opts.providers.includes(m.provider)) return false;
    if (!q) return true;
    return (
      m.displayName.toLowerCase().includes(q) ||
      m.slug.toLowerCase().includes(q) ||
      m.apiModelId.toLowerCase().includes(q) ||
      (m.description || '').toLowerCase().includes(q)
    );
  });
}

export type ModelSortOption = 'contextWindow' | 'cost' | 'maxOutput' | 'name';
export type ModelSort = { id: ModelSortOption; desc: boolean };

export function sortModels(models: AiModelView[], sort: ModelSort = { id: 'contextWindow', desc: true }): AiModelView[] {
  const copy = [...models];
  const { id, desc } = sort;
  const dir = desc ? -1 : 1;
  
  if (id === 'name') {
    return copy.sort((a, b) => a.displayName.localeCompare(b.displayName) * dir);
  }
  if (id === 'cost') {
    return copy.sort((a, b) => ((a.creditsPer1kInput ?? 999) - (b.creditsPer1kInput ?? 999)) * dir);
  }
  if (id === 'contextWindow') {
    return copy.sort((a, b) => ((a.contextWindow ?? 0) - (b.contextWindow ?? 0)) * dir);
  }
  if (id === 'maxOutput') {
    return copy.sort((a, b) => ((a.maxOutputTokens ?? 0) - (b.maxOutputTokens ?? 0)) * dir);
  }
  
  return copy;
}

export function formatCreditBadge(model: AiModelView): string {
  return creditTierLabel(model.creditTier);
}

export function formatTokenCount(n?: number | null): string {
  if (n == null) return '—';
  return n.toLocaleString();
}

export function isCustomModel(model: AiModelView): boolean {
  return Boolean(model.isCustom);
}

export function canDeleteModel(model: AiModelView): boolean {
  return Boolean(model.isCustom && !model.isSystem);
}

export function providerLabel(provider: AiModelProvider): string {
  switch (provider) {
    case 'OPENAI':
      return 'OpenAI';
    case 'ANTHROPIC':
      return 'Anthropic';
    case 'GOOGLE':
      return 'Google';
    default:
      return provider;
  }
}
