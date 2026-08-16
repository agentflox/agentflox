/**
 * Best-effort dual-write of a remembered fact into the agent memory Document tree.
 * Failures are logged; AgentMemory remains source of truth for recall.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@agentflox/database';
import {
  AGENT_MEMORY_FACT_PAGE_CAP,
  AGENT_MEMORY_RELATIONSHIP_TYPE,
  isAgentMemoryDocEnabled,
  isPreferencesMemoryDoc,
  mergeDocumentSettings,
  prefGateForCategory,
} from './memoryPolicy';

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

export async function dualWriteMemoryDocPage(opts: {
  agentId: string;
  memoryKey: string;
  category: string;
  content: string;
  title?: string;
  expiresAt?: Date | null;
}): Promise<void> {
  if (!isAgentMemoryDocEnabled()) return;

  try {
    const agent = await prisma.aiAgent.findUnique({
      where: { id: opts.agentId },
      select: {
        id: true,
        memoryViewId: true,
        ownerId: true,
        workspaceId: true,
        spaceId: true,
        projectId: true,
        teamId: true,
        metadata: true,
        memoryType: true,
        useVectorMemory: true,
        memoryRetention: true,
        contextWindow: true,
      },
    });
    if (!agent?.memoryViewId) {
      // Notebook not created yet — skip (created on View memories / settings save)
      return;
    }

    const { resolveAgentMemoryConfig, isLongTermEnabled } = await import('./memoryPolicy');
    const config = resolveAgentMemoryConfig(agent);
    // Only write into the memory document when long-term memory is enabled.
    if (!isLongTermEnabled(config)) return;

    const gate = prefGateForCategory(opts.category);
    const isPrefs = gate === 'rememberPreferences';

    const docs = await prisma.document.findMany({
      where: { viewId: agent.memoryViewId, isArchived: false, deletedAt: null },
    });

    if (isPrefs) {
      const prefs =
        docs.find((d) => isPreferencesMemoryDoc(d.settings)) ??
        (
          await prisma.documentRelationship.findFirst({
            where: {
              targetType: AGENT_MEMORY_RELATIONSHIP_TYPE,
              targetId: opts.agentId,
            },
          }).then(async (rel) =>
            rel ? prisma.document.findUnique({ where: { id: rel.documentId } }) : null
          )
        );

      if (!prefs) return;

      const stamp = new Date().toISOString().slice(0, 10);
      const nextContent = `${prefs.content || ''}\n<p><strong>${stamp}</strong>: ${opts.content}</p>`;
      await prisma.document.update({
        where: { id: prefs.id },
        data: { content: nextContent },
      });
      return;
    }

    const existing = docs.find((d) => {
      const am = asRecord(asRecord(d.settings)?.agentMemory);
      return am?.role === 'fact' && am?.key === opts.memoryKey;
    });

    const agentMemoryTag = {
      role: 'fact' as const,
      key: opts.memoryKey,
      category: opts.category,
      expiresAt: opts.expiresAt ? opts.expiresAt.toISOString() : null,
    };

    if (existing) {
      const merged = mergeDocumentSettings(existing.settings, { agentMemory: agentMemoryTag });
      await prisma.document.update({
        where: { id: existing.id },
        data: {
          content: opts.content,
          settings: merged as Prisma.InputJsonValue,
        },
      });
      return;
    }

    const factCount = docs.filter((d) => {
      const am = asRecord(asRecord(d.settings)?.agentMemory);
      return am?.role === 'fact';
    }).length;

    if (factCount >= AGENT_MEMORY_FACT_PAGE_CAP) {
      console.warn(
        JSON.stringify({
          metric: 'agent.memory.doc_page_cap_hit',
          agentId: opts.agentId,
          factCount,
        })
      );
      return;
    }

    await prisma.document.create({
      data: {
        title: opts.title || opts.category || 'Memory',
        content: opts.content,
        ownerId: agent.ownerId,
        workspaceId: agent.workspaceId,
        spaceId: agent.spaceId,
        projectId: agent.projectId,
        teamId: agent.teamId,
        viewId: agent.memoryViewId,
        settings: { agentMemory: agentMemoryTag } as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        metric: 'agent.memory.dual_write_doc_failed',
        agentId: opts.agentId,
        error: err instanceof Error ? err.message : String(err),
      })
    );
  }
}
