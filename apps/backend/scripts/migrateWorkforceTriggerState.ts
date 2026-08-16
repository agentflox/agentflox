/**
 * Backfill workforce trigger nodes with honest integrationStatus based on real connections.
 *
 * Usage: npx tsx apps/backend/scripts/migrateWorkforceTriggerState.ts
 */
import { prisma } from '../src/lib/prisma';
import { IntegrationProvider } from '@agentflox/database/src/generated/prisma/index.js';

const TRIGGER_TO_PROVIDER: Record<string, IntegrationProvider | null> = {
  github: IntegrationProvider.GITHUB,
  slack: IntegrationProvider.SLACK,
  gmail: IntegrationProvider.GOOGLE_MAIL,
  calendar: IntegrationProvider.GOOGLE_CALENDAR,
  webhook: null,
  schedule: null,
};

type WorkforceData = {
  workforce_graph?: {
    nodes?: Array<{ node_id: string; type: string; config?: Record<string, unknown> }>;
  };
  react_flow_graph?: {
    nodes?: Array<{ id: string; type?: string; data?: Record<string, unknown> }>;
  };
};

async function main() {
  const workforces = await prisma.workforce.findMany({
    where: { deletedAt: null },
    select: { id: true, ownerId: true, workspaceId: true, data: true },
  });

  let updated = 0;

  for (const wf of workforces) {
    const data = (wf.data ?? {}) as WorkforceData;
    const graphNodes = data.workforce_graph?.nodes ?? [];
    const reactNodes = data.react_flow_graph?.nodes ?? [];
    let changed = false;

    for (const node of graphNodes) {
      if (node.type !== 'trigger') continue;
      const triggerType = String(node.config?.triggerType ?? '');
      if (!triggerType || triggerType === 'user_message') continue;

      const prismaProvider = TRIGGER_TO_PROVIDER[triggerType];
      let status: 'active' | 'needs_reconnect' = 'active';

      if (prismaProvider) {
        const connected = await prisma.integration.findFirst({
          where: {
            installedBy: wf.ownerId,
            workspaceId: wf.workspaceId ?? undefined,
            provider: prismaProvider,
            isActive: true,
          },
          select: { id: true },
        });
        if (!connected) status = 'needs_reconnect';
      }

      if (node.config?.integrationStatus !== status) {
        node.config = { ...node.config, integrationStatus: status };
        changed = true;
      }

      const reactNode = reactNodes.find((n) => n.id === node.node_id);
      if (reactNode?.data && reactNode.data.integrationStatus !== status) {
        reactNode.data = { ...reactNode.data, integrationStatus: status };
        changed = true;
      }
    }

    if (changed) {
      await prisma.workforce.update({
        where: { id: wf.id },
        data: { data: data as any },
      });
      updated++;
    }
  }

  console.log(`[migrateWorkforceTriggerState] Updated ${updated} / ${workforces.length} workforces`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
