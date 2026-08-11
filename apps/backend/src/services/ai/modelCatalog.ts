/**
 * Static system-model catalog for legacy ModelService callers.
 * Mirrors packages/database/prisma/seed.ts AiModel rows (OpenAI + common Anthropic/Google).
 * Runtime resolve still loads the DB row via Shared Model Manager (slug / apiModelId).
 */

export type CatalogProvider = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE';

export interface SystemModelConfig {
  /** DB slug (AiModel.slug) */
  slug: string;
  displayName: string;
  provider: CatalogProvider;
  /** Provider API id (AiModel.apiModelId) */
  apiModelId: string;
  description?: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  creditTier?: 'FREE' | 'LOW' | 'MODERATE' | 'HIGH';
  supportsThinking?: boolean;
  isDefault?: boolean;
}

function m(cfg: SystemModelConfig): SystemModelConfig {
  return cfg;
}

/** Full system catalog export (seed-aligned). */
export const SYSTEM_MODEL_CATALOG: SystemModelConfig[] = [
  // ── OpenAI GPT-4.1 / 4o family ─────────────────────────────────────────
  m({
    slug: 'gpt-4-1-mini',
    displayName: 'GPT 4.1 mini (latest)',
    provider: 'OPENAI',
    apiModelId: 'gpt-4.1-mini',
    description: 'OpenAI GPT-4.1 mini latest.',
    contextWindow: 1_047_576,
    maxOutputTokens: 32_768,
    creditTier: 'LOW',
    supportsThinking: false,
  }),
  m({
    slug: 'gpt-4-1-mini-2025-04-14',
    displayName: 'GPT 4.1 mini (2025-04-14)',
    provider: 'OPENAI',
    apiModelId: 'gpt-4.1-mini-2025-04-14',
    description: 'OpenAI GPT-4.1 mini dated snapshot.',
    contextWindow: 1_047_576,
    maxOutputTokens: 32_768,
    creditTier: 'LOW',
    supportsThinking: false,
  }),
  m({
    slug: 'gpt-4-1-nano',
    displayName: 'GPT 4.1 nano (latest)',
    provider: 'OPENAI',
    apiModelId: 'gpt-4.1-nano',
    description: 'OpenAI GPT-4.1 nano latest.',
    contextWindow: 1_047_576,
    maxOutputTokens: 32_768,
    creditTier: 'LOW',
    supportsThinking: false,
  }),
  m({
    slug: 'gpt-4-1-nano-2025-04-14',
    displayName: 'GPT 4.1 nano (2025-04-14)',
    provider: 'OPENAI',
    apiModelId: 'gpt-4.1-nano-2025-04-14',
    description: 'OpenAI GPT-4.1 nano dated snapshot.',
    contextWindow: 1_047_576,
    maxOutputTokens: 32_768,
    creditTier: 'LOW',
    supportsThinking: false,
  }),
  m({
    slug: 'gpt-4o',
    displayName: 'GPT 4o',
    provider: 'OPENAI',
    apiModelId: 'gpt-4o',
    description: 'OpenAI GPT-4o multimodal.',
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    creditTier: 'MODERATE',
    supportsThinking: false,
  }),
  m({
    slug: 'gpt-4o-2024-11-20',
    displayName: 'GPT 4o (2024-11-20)',
    provider: 'OPENAI',
    apiModelId: 'gpt-4o-2024-11-20',
    description: 'OpenAI GPT-4o November 2024 snapshot.',
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    creditTier: 'MODERATE',
    supportsThinking: false,
  }),
  m({
    slug: 'gpt-4o-2024-08-06',
    displayName: 'GPT 4o (2024-08-06)',
    provider: 'OPENAI',
    apiModelId: 'gpt-4o-2024-08-06',
    description: 'OpenAI GPT-4o August 2024 snapshot.',
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    creditTier: 'MODERATE',
    supportsThinking: false,
  }),
  m({
    slug: 'gpt-4o-2024-05-13',
    displayName: 'GPT 4o (2024-05-13)',
    provider: 'OPENAI',
    apiModelId: 'gpt-4o-2024-05-13',
    description: 'OpenAI GPT-4o May 2024 snapshot.',
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    creditTier: 'MODERATE',
    supportsThinking: false,
  }),
  m({
    slug: 'gpt-4o-mini',
    displayName: 'GPT 4o mini (latest)',
    provider: 'OPENAI',
    apiModelId: 'gpt-4o-mini',
    description: 'Cost-optimized OpenAI GPT-4o mini (platform default).',
    isDefault: true,
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    creditTier: 'LOW',
    supportsThinking: false,
  }),
  m({
    slug: 'gpt-4o-mini-2024-07-18',
    displayName: 'GPT 4o mini (2024-07-18)',
    provider: 'OPENAI',
    apiModelId: 'gpt-4o-mini-2024-07-18',
    description: 'OpenAI GPT-4o mini July 2024 snapshot.',
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    creditTier: 'LOW',
    supportsThinking: false,
  }),
  m({
    slug: 'gpt-4-turbo',
    displayName: 'GPT 4 Turbo',
    provider: 'OPENAI',
    apiModelId: 'gpt-4-turbo',
    description: 'OpenAI GPT-4 Turbo.',
    contextWindow: 128_000,
    maxOutputTokens: 4_096,
    creditTier: 'HIGH',
    supportsThinking: false,
  }),
  m({
    slug: 'gpt-4',
    displayName: 'GPT 4',
    provider: 'OPENAI',
    apiModelId: 'gpt-4',
    description: 'OpenAI GPT-4.',
    contextWindow: 8_192,
    maxOutputTokens: 8_192,
    creditTier: 'HIGH',
    supportsThinking: false,
  }),
  m({
    slug: 'gpt-4-0613',
    displayName: 'GPT 4 0613',
    provider: 'OPENAI',
    apiModelId: 'gpt-4-0613',
    description: 'OpenAI GPT-4 0613 snapshot.',
    contextWindow: 8_192,
    maxOutputTokens: 8_192,
    creditTier: 'HIGH',
    supportsThinking: false,
  }),
  m({
    slug: 'gpt-3-5-turbo',
    displayName: 'GPT 3.5',
    provider: 'OPENAI',
    apiModelId: 'gpt-3.5-turbo',
    description: 'OpenAI GPT-3.5 Turbo.',
    contextWindow: 16_385,
    maxOutputTokens: 4_096,
    creditTier: 'LOW',
    supportsThinking: false,
  }),
  m({
    slug: 'gpt-3-5-turbo-16k',
    displayName: 'GPT 3.5 16k',
    provider: 'OPENAI',
    apiModelId: 'gpt-3.5-turbo-16k',
    description: 'OpenAI GPT-3.5 Turbo 16k.',
    contextWindow: 16_385,
    maxOutputTokens: 4_096,
    creditTier: 'LOW',
    supportsThinking: false,
  }),
  m({
    slug: 'gpt-3-5-turbo-1106',
    displayName: 'GPT 3.5 1106',
    provider: 'OPENAI',
    apiModelId: 'gpt-3.5-turbo-1106',
    description: 'OpenAI GPT-3.5 Turbo 1106.',
    contextWindow: 16_385,
    maxOutputTokens: 4_096,
    creditTier: 'LOW',
    supportsThinking: false,
  }),
  m({
    slug: 'o1',
    displayName: 'o1 (latest)',
    provider: 'OPENAI',
    apiModelId: 'o1',
    description: 'OpenAI o1 reasoning model.',
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    creditTier: 'HIGH',
    supportsThinking: true,
  }),
  m({
    slug: 'o3',
    displayName: 'o3 (latest)',
    provider: 'OPENAI',
    apiModelId: 'o3',
    description: 'OpenAI o3 reasoning model.',
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    creditTier: 'MODERATE',
    supportsThinking: true,
  }),
  m({
    slug: 'o3-mini',
    displayName: 'o3-mini (latest)',
    provider: 'OPENAI',
    apiModelId: 'o3-mini',
    description: 'OpenAI o3-mini.',
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    creditTier: 'LOW',
    supportsThinking: true,
  }),

  // ── Anthropic (common) ─────────────────────────────────────────────────
  m({
    slug: 'claude-3-5-sonnet',
    displayName: 'Claude 3.5 Sonnet',
    provider: 'ANTHROPIC',
    apiModelId: 'claude-3-5-sonnet-20240620',
    description: 'Anthropic Claude 3.5 Sonnet.',
    contextWindow: 200_000,
    maxOutputTokens: 8_192,
    creditTier: 'MODERATE',
    supportsThinking: false,
  }),
  m({
    slug: 'claude-sonnet-4-5',
    displayName: 'Claude Sonnet 4.5',
    provider: 'ANTHROPIC',
    apiModelId: 'claude-sonnet-4-5',
    description: 'Anthropic Claude Sonnet 4.5.',
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    creditTier: 'MODERATE',
    supportsThinking: true,
  }),

  // ── Google (common) ────────────────────────────────────────────────────
  m({
    slug: 'gemini-2-0-flash',
    displayName: 'Gemini 2.0 Flash',
    provider: 'GOOGLE',
    apiModelId: 'gemini-2.0-flash',
    description: 'Google Gemini 2.0 Flash.',
    contextWindow: 1_000_000,
    maxOutputTokens: 8_192,
    creditTier: 'LOW',
    supportsThinking: false,
  }),
  m({
    slug: 'gemini-1-5-pro',
    displayName: 'Gemini 1.5 Pro',
    provider: 'GOOGLE',
    apiModelId: 'gemini-1.5-pro',
    description: 'Google Gemini 1.5 Pro.',
    contextWindow: 2_000_000,
    maxOutputTokens: 8_192,
    creditTier: 'MODERATE',
    supportsThinking: false,
  }),
];

/** Named shortcuts for call sites (prefer these over raw strings). */
export const SYSTEM_MODELS = {
  GPT_4O: SYSTEM_MODEL_CATALOG.find((x) => x.slug === 'gpt-4o')!,
  GPT_4O_MINI: SYSTEM_MODEL_CATALOG.find((x) => x.slug === 'gpt-4o-mini')!,
  GPT_4_TURBO: SYSTEM_MODEL_CATALOG.find((x) => x.slug === 'gpt-4-turbo')!,
  GPT_4: SYSTEM_MODEL_CATALOG.find((x) => x.slug === 'gpt-4')!,
  O3_MINI: SYSTEM_MODEL_CATALOG.find((x) => x.slug === 'o3-mini')!,
  CLAUDE_3_5_SONNET: SYSTEM_MODEL_CATALOG.find((x) => x.slug === 'claude-3-5-sonnet')!,
  CLAUDE_SONNET_4_5: SYSTEM_MODEL_CATALOG.find((x) => x.slug === 'claude-sonnet-4-5')!,
  GEMINI_2_0_FLASH: SYSTEM_MODEL_CATALOG.find((x) => x.slug === 'gemini-2-0-flash')!,
  DEFAULT: SYSTEM_MODEL_CATALOG.find((x) => x.isDefault)!,
} as const;

export type ModelRef = SystemModelConfig | string;

export function findSystemModel(ref: ModelRef): SystemModelConfig | undefined {
  if (typeof ref !== 'string') return ref;
  const key = ref.trim();
  return (
    SYSTEM_MODEL_CATALOG.find((m) => m.slug === key) ||
    SYSTEM_MODEL_CATALOG.find((m) => m.apiModelId === key) ||
    Object.values(SYSTEM_MODELS).find((m) => m.slug === key || m.apiModelId === key)
  );
}

export function getModelsByProvider(provider: CatalogProvider): SystemModelConfig[] {
  return SYSTEM_MODEL_CATALOG.filter((m) => m.provider === provider);
}
