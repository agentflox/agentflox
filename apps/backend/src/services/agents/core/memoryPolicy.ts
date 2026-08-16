/**
 * Agent long-term memory policy: defaults, gates, shared vector filters.
 * Canonical home for constants used by runtime + tRPC (mirrored import path on frontend via copy or shared package).
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
  /** True when metadata.memory key was missing and effective defaults are applied for gating */
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
    memoryBlob && typeof memoryBlob.enabled === 'boolean'
      ? memoryBlob.enabled
      : true;
  const shortTermEnabled =
    memoryBlob && typeof memoryBlob.shortTermEnabled === 'boolean'
      ? memoryBlob.shortTermEnabled
      : true;

  const columnMemoryType = agent.memoryType === 'LONG_TERM' ? 'LONG_TERM' : 'SHORT_TERM';
  const memoryType = usedLegacyEffectiveDefaults ? 'LONG_TERM' : columnMemoryType;
  const useVectorMemory = usedLegacyEffectiveDefaults
    ? true
    : Boolean(agent.useVectorMemory);

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

/** Preference category → which pref gate applies. Unmapped → rememberGoals. */
export function prefGateForCategory(category: string): keyof MemoryPrefs | null {
  const c = category.toLowerCase();
  if (['assignment', 'preference', 'style', 'user_preference'].includes(c)) {
    return 'rememberPreferences';
  }
  if (['person', 'people', 'org', 'team'].includes(c)) {
    return 'rememberPeopleOrg';
  }
  if (['goal', 'decision', 'project', 'execution'].includes(c)) {
    return 'rememberGoals';
  }
  if (['transcript', 'chat_log'].includes(c)) {
    return 'rememberTranscripts';
  }
  return null;
}

export function shouldPersistCategory(
  config: ResolvedAgentMemoryConfig,
  category: string
): boolean {
  if (!isLongTermEnabled(config)) return false;
  const gate = prefGateForCategory(category);
  if (gate === null) {
    // unmapped → goals
    console.info(JSON.stringify({ metric: 'agent.memory.unmapped_category', category }));
    return config.prefs.rememberGoals;
  }
  if (gate === 'rememberTranscripts') return false; // never auto-store in v1
  return config.prefs[gate];
}

export function resolveExpiresAt(
  retentionDays: number | null | undefined,
  from: Date = new Date()
): Date | null {
  if (retentionDays === null || retentionDays === undefined) return null;
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) return null;
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + retentionDays);
  return d;
}

export function isAgentMemoryDocEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const v = env[AGENT_MEMORY_DOC_FLAG] ?? env.NEXT_PUBLIC_AGENT_MEMORY_DOC_V1;
  if (v === undefined || v === '') return true; // default on in dev; set "false" to disable
  return v === '1' || v.toLowerCase() === 'true' || v === 'yes';
}

/** Sole metadata OR fragment for shared long-term memory rows. */
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

export function getAgentMemoryTag(
  settings: unknown
): AgentMemorySettingsTag | null {
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

/** Deep-merge document settings; preserves agentMemory unless partial replaces that namespace. */
export function mergeDocumentSettings(
  existing: unknown,
  partial: Record<string, unknown>,
  opts?: { replaceAgentMemory?: boolean }
): Record<string, unknown> {
  const base = asRecord(existing) ? { ...asRecord(existing)! } : {};
  const next = { ...base, ...partial };

  if (opts?.replaceAgentMemory && 'agentMemory' in partial) {
    next.agentMemory = partial.agentMemory;
  } else if ('agentMemory' in partial && partial.agentMemory && typeof partial.agentMemory === 'object') {
    const prevAm = asRecord(base.agentMemory) ?? {};
    next.agentMemory = { ...prevAm, ...(partial.agentMemory as object) };
  } else if (!opts?.replaceAgentMemory && base.agentMemory !== undefined) {
    next.agentMemory = base.agentMemory;
  }

  if ('pageSettings' in partial && partial.pageSettings && typeof partial.pageSettings === 'object') {
    const prevPs = asRecord(base.pageSettings) ?? {};
    next.pageSettings = { ...prevPs, ...(partial.pageSettings as object) };
  }

  return next;
}

/**
 * Hot-path legacy migrate: only when metadata.memory is fully absent.
 * If any memory key exists → no-op (no partial merge).
 * Fire-and-forget safe: does not throw to callers.
 */
export async function ensureLegacyMemoryMigrated(agentId: string): Promise<void> {
  try {
    const { prisma } = await import('@/lib/prisma');
    const agent = await prisma.aiAgent.findUnique({
      where: { id: agentId },
      select: { id: true, metadata: true },
    });
    if (!agent) return;
    if (getMemoryMetadataBlob(agent.metadata) !== null) return;

    const root =
      agent.metadata && typeof agent.metadata === 'object' && !Array.isArray(agent.metadata)
        ? { ...(agent.metadata as Record<string, unknown>) }
        : {};
    root.memory = {
      ...DEFAULT_MEMORY_METADATA,
      legacyMigrated: true,
    };

    await prisma.aiAgent.updateMany({
      where: { id: agentId },
      data: {
        memoryType: 'LONG_TERM',
        useVectorMemory: true,
        metadata: root as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.warn('[ensureLegacyMemoryMigrated]', err);
  }
}
