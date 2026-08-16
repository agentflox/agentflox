import { prisma } from '@/lib/prisma';
import { Prisma } from '@agentflox/database';
import {
  AGENT_MEMORY_RELATIONSHIP_TYPE,
  DEFAULT_MEMORY_METADATA,
  PREFERENCES_SEED_CONTENT,
  getAgentMemoryTag,
  isAgentMemoryDocEnabled,
  isPreferencesMemoryDoc,
  mergeDocumentSettings,
  sharedLongTermMemoryWhere,
} from './memoryPolicy';

type Tx = Prisma.TransactionClient;

export type EnsureAgentMemoryDocResult = {
  viewId: string;
  preferencesDocumentId: string;
  created: boolean;
};

async function rollbackEnsureAttempt(tx: Tx, viewId: string, agentId: string) {
  const docs = await tx.document.findMany({
    where: { viewId },
    select: { id: true },
  });
  const docIds = docs.map((d) => d.id);
  if (docIds.length > 0) {
    await tx.documentRelationship.deleteMany({
      where: { documentId: { in: docIds } },
    });
    await tx.document.deleteMany({ where: { viewId } });
  }
  await tx.documentRelationship.deleteMany({
    where: {
      targetType: AGENT_MEMORY_RELATIONSHIP_TYPE,
      targetId: agentId,
    },
  });
  await tx.view.deleteMany({ where: { id: viewId } });
}

async function upsertAgentMemoryRelationship(
  tx: Tx,
  agentId: string,
  preferencesDocumentId: string
) {
  const existing = await tx.documentRelationship.findFirst({
    where: {
      targetType: AGENT_MEMORY_RELATIONSHIP_TYPE,
      targetId: agentId,
    },
  });
  if (existing) {
    if (existing.documentId !== preferencesDocumentId) {
      await tx.documentRelationship.update({
        where: { id: existing.id },
        data: { documentId: preferencesDocumentId },
      });
    }
    return;
  }
  try {
    await tx.documentRelationship.create({
      data: {
        documentId: preferencesDocumentId,
        targetType: AGENT_MEMORY_RELATIONSHIP_TYPE,
        targetId: agentId,
      },
    });
  } catch {
    const raced = await tx.documentRelationship.findFirst({
      where: {
        targetType: AGENT_MEMORY_RELATIONSHIP_TYPE,
        targetId: agentId,
      },
    });
    if (raced && raced.documentId !== preferencesDocumentId) {
      await tx.documentRelationship.update({
        where: { id: raced.id },
        data: { documentId: preferencesDocumentId },
      });
    }
  }
}

function isLivePreferences(doc: {
  settings: unknown;
  isArchived: boolean;
  deletedAt: Date | null;
}) {
  return (
    isPreferencesMemoryDoc(doc.settings) &&
    !doc.isArchived &&
    !doc.deletedAt
  );
}

/**
 * Concurrency-safe ensure of agent memory DOC view + Preferences page.
 * FOR UPDATE held across the whole sequence; CAS is defense-in-depth.
 */
export async function ensureAgentMemoryDoc(
  agentId: string,
  opts?: { ownerId?: string }
): Promise<EnsureAgentMemoryDocResult> {
  if (!isAgentMemoryDocEnabled()) {
    throw new Error('Agent memory documents are disabled (AGENT_MEMORY_DOC_V1)');
  }

  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<
      Array<{
        id: string;
        name: string;
        owner_id: string;
        workspace_id: string | null;
        space_id: string | null;
        project_id: string | null;
        team_id: string | null;
        memory_view_id: string | null;
      }>
    >`
      SELECT id, name, owner_id, workspace_id, space_id, project_id, team_id, memory_view_id
      FROM ai_agents
      WHERE id = ${agentId}::uuid
      FOR UPDATE
    `;

    const row = locked[0];
    if (!row) throw new Error('Agent not found');
    if (opts?.ownerId && row.owner_id !== opts.ownerId) {
      throw new Error('Agent not found or permission denied');
    }

    const ownerId = row.owner_id;
    const memoryViewId = row.memory_view_id;

    if (memoryViewId) {
      const view = await tx.view.findFirst({
        where: { id: memoryViewId, deletedAt: null },
      });
      if (view) {
        const docs = await tx.document.findMany({ where: { viewId: memoryViewId } });

        const livePrefs = docs.find((d) => isLivePreferences(d));
        if (livePrefs) {
          await upsertAgentMemoryRelationship(tx, agentId, livePrefs.id);
          return {
            viewId: memoryViewId,
            preferencesDocumentId: livePrefs.id,
            created: false,
          };
        }

        const archivedPrefs = docs.find(
          (d) => isPreferencesMemoryDoc(d.settings) && (d.isArchived || !!d.deletedAt)
        );
        if (archivedPrefs) {
          const restored = await tx.document.update({
            where: { id: archivedPrefs.id },
            data: { isArchived: false, deletedAt: null, deletedById: null },
          });
          await upsertAgentMemoryRelationship(tx, agentId, restored.id);
          return {
            viewId: memoryViewId,
            preferencesDocumentId: restored.id,
            created: false,
          };
        }

        const rel = await tx.documentRelationship.findFirst({
          where: {
            targetType: AGENT_MEMORY_RELATIONSHIP_TYPE,
            targetId: agentId,
          },
        });
        if (rel) {
          const relDoc = await tx.document.findUnique({ where: { id: rel.documentId } });
          if (relDoc && isPreferencesMemoryDoc(relDoc.settings)) {
            const fixed = await tx.document.update({
              where: { id: relDoc.id },
              data: {
                viewId: memoryViewId,
                isArchived: false,
                deletedAt: null,
                deletedById: null,
              },
            });
            return {
              viewId: memoryViewId,
              preferencesDocumentId: fixed.id,
              created: false,
            };
          }
        }

        const prefs = await tx.document.create({
          data: {
            title: 'Agent Preferences',
            content: PREFERENCES_SEED_CONTENT,
            ownerId,
            workspaceId: row.workspace_id,
            spaceId: row.space_id,
            projectId: row.project_id,
            teamId: row.team_id,
            viewId: memoryViewId,
            settings: { agentMemory: { role: 'preferences' } } as Prisma.InputJsonValue,
          },
        });
        await upsertAgentMemoryRelationship(tx, agentId, prefs.id);
        return {
          viewId: memoryViewId,
          preferencesDocumentId: prefs.id,
          created: false,
        };
      }
    }

    const view = await tx.view.create({
      data: {
        name: `${row.name} Memory`,
        type: 'DOC',
        ownerId,
        workspaceId: row.workspace_id,
        spaceId: row.space_id,
        projectId: row.project_id,
        teamId: row.team_id,
      },
    });

    const prefs = await tx.document.create({
      data: {
        title: 'Agent Preferences',
        content: PREFERENCES_SEED_CONTENT,
        ownerId,
        workspaceId: row.workspace_id,
        spaceId: row.space_id,
        projectId: row.project_id,
        teamId: row.team_id,
        viewId: view.id,
        settings: { agentMemory: { role: 'preferences' } } as Prisma.InputJsonValue,
      },
    });

    const claim = await tx.aiAgent.updateMany({
      where: { id: agentId, memoryViewId: null },
      data: { memoryViewId: view.id },
    });

    if (claim.count === 0) {
      await rollbackEnsureAttempt(tx, view.id, agentId);
      const winner = await tx.aiAgent.findUnique({
        where: { id: agentId },
        select: { memoryViewId: true },
      });
      if (!winner?.memoryViewId) throw new Error('Failed to claim memory view');
      const winnerDocs = await tx.document.findMany({
        where: { viewId: winner.memoryViewId },
      });
      const prefsDoc =
        winnerDocs.find((d) => isLivePreferences(d)) ?? winnerDocs[0];
      if (!prefsDoc) throw new Error('Winner memory view has no documents');
      return {
        viewId: winner.memoryViewId,
        preferencesDocumentId: prefsDoc.id,
        created: false,
      };
    }

    await upsertAgentMemoryRelationship(tx, agentId, prefs.id);

    return {
      viewId: view.id,
      preferencesDocumentId: prefs.id,
      created: true,
    };
  });
}

export async function clearSharedCustomEmbeddings(agentId: string): Promise<number> {
  const result = await prisma.vectorEmbedding.deleteMany({
    where: sharedLongTermMemoryWhere(agentId),
  });
  return result.count;
}

export async function clearAgentMemoryStores(agentId: string): Promise<{
  agentMemories: number;
  embeddings: number;
  factPages: number;
}> {
  const agent = await prisma.aiAgent.findUnique({
    where: { id: agentId },
    select: { memoryViewId: true },
  });

  const am = await prisma.agentMemory.deleteMany({ where: { agentId } });
  const embeddings = await clearSharedCustomEmbeddings(agentId);

  let factPages = 0;
  if (agent?.memoryViewId) {
    const docs = await prisma.document.findMany({
      where: { viewId: agent.memoryViewId },
    });
    const toDelete = docs.filter((d) => getAgentMemoryTag(d.settings)?.role !== 'preferences');
    if (toDelete.length > 0) {
      const ids = toDelete.map((d) => d.id);
      await prisma.documentRelationship.deleteMany({ where: { documentId: { in: ids } } });
      const del = await prisma.document.deleteMany({ where: { id: { in: ids } } });
      factPages = del.count;
    }
    const prefs = docs.find((d) => isPreferencesMemoryDoc(d.settings));
    if (prefs) {
      await prisma.document.update({
        where: { id: prefs.id },
        data: { content: PREFERENCES_SEED_CONTENT },
      });
    }
  }

  return { agentMemories: am.count, embeddings, factPages };
}

export async function deleteAgentMemoryNotebook(agentId: string): Promise<void> {
  const agent = await prisma.aiAgent.findUnique({
    where: { id: agentId },
    select: { memoryViewId: true },
  });
  await clearSharedCustomEmbeddings(agentId).catch(() => undefined);
  if (agent?.memoryViewId) {
    await prisma.$transaction(async (tx) => {
      await rollbackEnsureAttempt(tx, agent.memoryViewId!, agentId);
      await tx.aiAgent.update({
        where: { id: agentId },
        data: { memoryViewId: null },
      });
    });
  } else {
    await prisma.documentRelationship.deleteMany({
      where: {
        targetType: AGENT_MEMORY_RELATIONSHIP_TYPE,
        targetId: agentId,
      },
    });
  }
}

export async function updateDocumentSettings(
  documentId: string,
  partial: Record<string, unknown>,
  opts?: { replaceAgentMemory?: boolean }
) {
  const existing = await prisma.document.findUnique({
    where: { id: documentId },
    select: { settings: true },
  });
  if (!existing) throw new Error('Document not found');
  const merged = mergeDocumentSettings(existing.settings, partial, opts);
  return prisma.document.update({
    where: { id: documentId },
    data: { settings: merged as Prisma.InputJsonValue },
  });
}

export function buildDefaultAgentMetadata(
  existingMetadata: unknown,
  memoryOverrides?: Record<string, unknown>
): Prisma.InputJsonValue {
  const root =
    existingMetadata && typeof existingMetadata === 'object' && !Array.isArray(existingMetadata)
      ? { ...(existingMetadata as Record<string, unknown>) }
      : {};
  const prevMemory =
    root.memory && typeof root.memory === 'object' && !Array.isArray(root.memory)
      ? { ...(root.memory as Record<string, unknown>) }
      : {};
  root.memory = {
    ...DEFAULT_MEMORY_METADATA,
    ...prevMemory,
    prefs: {
      ...DEFAULT_MEMORY_METADATA.prefs,
      ...((prevMemory.prefs as object) || {}),
      ...((memoryOverrides?.prefs as object) || {}),
    },
    ...memoryOverrides,
  };
  return root as Prisma.InputJsonValue;
}
