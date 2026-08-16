/**
 * Frontend copy of memory policy helpers used by tRPC (document/agent routers).
 * Keep in sync with apps/backend/src/services/agents/core/memoryPolicy.ts
 */

import type { Prisma } from '@agentflox/database';

export const DEFAULT_MEMORY_PREFS = {
  rememberPreferences: true,
  rememberPeopleOrg: true,
  rememberGoals: true,
  rememberTranscripts: false,
} as const;

export type MemoryPrefs = {
  rememberPreferences: boolean;
  rememberPeopleOrg: boolean;
  rememberGoals: boolean;
  rememberTranscripts: boolean;
};

export const DEFAULT_MEMORY_METADATA = {
  enabled: true,
  shortTermEnabled: true,
  prefs: DEFAULT_MEMORY_PREFS,
} as const;

export const AGENT_MEMORY_DOC_FLAG = 'AGENT_MEMORY_DOC_V1';
export const AGENT_MEMORY_FACT_PAGE_CAP = 200;
export const AGENT_MEMORY_RELATIONSHIP_TYPE = 'AGENT_MEMORY';

export type AgentMemoryRole = 'preferences' | 'fact';

export type AgentMemorySettingsTag = {
  role: AgentMemoryRole;
  key?: string;
  category?: string;
  expiresAt?: string | null;
};

export type ResolvedAgentMemoryConfig = {
  /** Long-term memory master switch (metadata.memory.enabled). */
  enabled: boolean;
  /** Short-term / recent-messages context switch. */
  shortTermEnabled: boolean;
  memoryType: 'SHORT_TERM' | 'LONG_TERM';
  useVectorMemory: boolean;
  memoryRetention: number | null;
  contextWindow: number;
  memoryViewId: string | null;
  prefs: MemoryPrefs;
  legacyMigrated: boolean;
  usedLegacyEffectiveDefaults: boolean;
};

type AgentLike = {
  memoryType?: string | null;
  contextWindow?: number | null;
  useVectorMemory?: boolean | null;
  memoryRetention?: number | null;
  memoryViewId?: string | null;
  metadata?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function getMemoryMetadataBlob(metadata: unknown): Record<string, unknown> | null {
  const root = asRecord(metadata);
  if (!root || !('memory' in root)) return null;
  return asRecord(root.memory);
}

export function resolveAgentMemoryConfig(agent: AgentLike): ResolvedAgentMemoryConfig {
  const memoryBlob = getMemoryMetadataBlob(agent.metadata);
  const usedLegacyEffectiveDefaults = memoryBlob === null;

  const rawPrefs = memoryBlob ? asRecord(memoryBlob.prefs) : null;
  const prefs: MemoryPrefs = {
    rememberPreferences:
      typeof rawPrefs?.rememberPreferences === 'boolean'
        ? rawPrefs.rememberPreferences
        : DEFAULT_MEMORY_PREFS.rememberPreferences,
    rememberPeopleOrg:
      typeof rawPrefs?.rememberPeopleOrg === 'boolean'
        ? rawPrefs.rememberPeopleOrg
        : DEFAULT_MEMORY_PREFS.rememberPeopleOrg,
    rememberGoals:
      typeof rawPrefs?.rememberGoals === 'boolean'
        ? rawPrefs.rememberGoals
        : DEFAULT_MEMORY_PREFS.rememberGoals,
    rememberTranscripts:
      typeof rawPrefs?.rememberTranscripts === 'boolean'
        ? rawPrefs.rememberTranscripts
        : DEFAULT_MEMORY_PREFS.rememberTranscripts,
  };

  const enabled =
    memoryBlob && typeof memoryBlob.enabled === 'boolean' ? memoryBlob.enabled : true;
  const shortTermEnabled =
    memoryBlob && typeof memoryBlob.shortTermEnabled === 'boolean'
      ? memoryBlob.shortTermEnabled
      : true;

  const columnMemoryType = agent.memoryType === 'LONG_TERM' ? 'LONG_TERM' : 'SHORT_TERM';
  const memoryType = usedLegacyEffectiveDefaults ? 'LONG_TERM' : columnMemoryType;
  const useVectorMemory = usedLegacyEffectiveDefaults ? true : Boolean(agent.useVectorMemory);

  return {
    enabled,
    shortTermEnabled,
    memoryType,
    useVectorMemory,
    memoryRetention:
      agent.memoryRetention === undefined || agent.memoryRetention === null
        ? null
        : agent.memoryRetention,
    contextWindow: typeof agent.contextWindow === 'number' ? agent.contextWindow : 5,
    memoryViewId: agent.memoryViewId ?? null,
    prefs,
    legacyMigrated: Boolean(memoryBlob?.legacyMigrated),
    usedLegacyEffectiveDefaults,
  };
}

export function isLongTermEnabled(config: ResolvedAgentMemoryConfig): boolean {
  return config.enabled && config.memoryType === 'LONG_TERM';
}

/** Recent-turn window used at runtime; 0 when short-term memory is off. */
export function effectiveContextWindow(config: ResolvedAgentMemoryConfig): number {
  if (!config.shortTermEnabled) return 0;
  return Math.max(0, config.contextWindow || 0);
}

export function isAgentMemoryDocEnabled(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): boolean {
  const v = env[AGENT_MEMORY_DOC_FLAG] ?? env.NEXT_PUBLIC_AGENT_MEMORY_DOC_V1;
  if (v === undefined || v === '') return true;
  return v === '1' || v.toLowerCase() === 'true' || v === 'yes';
}

export const SHARED_LONG_TERM_MEMORY_METADATA_OR: Prisma.VectorEmbeddingWhereInput[] = [
  { metadata: { path: ['kind'], equals: 'agent_long_term_memory' } },
  { metadata: { path: ['type'], equals: 'fact' } },
  { metadata: { path: ['type'], equals: 'experience' } },
  { metadata: { path: ['type'], equals: 'pattern' } },
];

export function sharedLongTermMemoryWhere(
  agentId: string
): Prisma.VectorEmbeddingWhereInput {
  return {
    sourceType: 'CUSTOM',
    sourceId: agentId,
    OR: SHARED_LONG_TERM_MEMORY_METADATA_OR,
  };
}

export function sharedLongTermMemoryWhereAll(): Prisma.VectorEmbeddingWhereInput {
  return {
    sourceType: 'CUSTOM',
    OR: SHARED_LONG_TERM_MEMORY_METADATA_OR,
  };
}

export function getAgentMemoryTag(settings: unknown): AgentMemorySettingsTag | null {
  const root = asRecord(settings);
  const am = root ? asRecord(root.agentMemory) : null;
  if (!am) return null;
  if (am.role !== 'preferences' && am.role !== 'fact') return null;
  return {
    role: am.role,
    key: typeof am.key === 'string' ? am.key : undefined,
    category: typeof am.category === 'string' ? am.category : undefined,
    expiresAt:
      am.expiresAt === null
        ? null
        : typeof am.expiresAt === 'string'
          ? am.expiresAt
          : undefined,
  };
}

export function isPreferencesMemoryDoc(settings: unknown): boolean {
  return getAgentMemoryTag(settings)?.role === 'preferences';
}

export function mergeDocumentSettings(
  existing: unknown,
  partial: Record<string, unknown>,
  opts?: { replaceAgentMemory?: boolean }
): Record<string, unknown> {
  const base = asRecord(existing) ? { ...asRecord(existing)! } : {};
  const next = { ...base, ...partial };

  if (opts?.replaceAgentMemory && 'agentMemory' in partial) {
    next.agentMemory = partial.agentMemory;
  } else if (
    'agentMemory' in partial &&
    partial.agentMemory &&
    typeof partial.agentMemory === 'object'
  ) {
    const prevAm = asRecord(base.agentMemory) ?? {};
    next.agentMemory = { ...prevAm, ...(partial.agentMemory as object) };
  } else if (!opts?.replaceAgentMemory && base.agentMemory !== undefined) {
    next.agentMemory = base.agentMemory;
  }

  if (
    'pageSettings' in partial &&
    partial.pageSettings &&
    typeof partial.pageSettings === 'object'
  ) {
    const prevPs = asRecord(base.pageSettings) ?? {};
    next.pageSettings = { ...prevPs, ...(partial.pageSettings as object) };
  }

  return next;
}

export const PREFERENCES_SEED_CONTENT = `
<div data-type="callout" data-callout-type="info">
<p><strong>Agent Preferences</strong></p>
<ul>
<li>This is where the agent keeps additional instructions and preferences.</li>
<li>The agent reads and applies these whenever it runs.</li>
<li>You can update them by editing this page, or the agent may capture facts from runs as other pages in this document.</li>
<li>This Preferences page is created automatically and cannot be deleted.</li>
</ul>
</div>
`.trim();
