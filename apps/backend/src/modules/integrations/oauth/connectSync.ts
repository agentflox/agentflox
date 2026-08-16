import { prisma } from '@/lib/prisma';
import {
  CATALOG_PROVIDER_TO_PRISMA,
  type IntegrationProviderId,
} from '@agentflox/types/integrationCatalog';
import { upsertVaultCredentials } from './credentialVault';

/**
 * Copy OAuth tokens from IntegrationConnection rows into encrypted Integration.credentials
 * for each workspace the user belongs to.
 */
export async function syncOAuthAccountsToVault(userId: string): Promise<number> {
  const connections = await prisma.integrationConnection.findMany({
    where: { userId },
    select: {
      id: true,
      provider: true,
      accessToken: true,
      refreshToken: true,
      expiresAt: true,
      tokenType: true,
      scope: true,
    },
  });

  if (connections.length === 0) return 0;

  const workspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId, status: 'ACTIVE' } } },
      ],
      isActive: true,
    },
    select: { id: true },
  });

  if (workspaces.length === 0) return 0;

  let synced = 0;

  for (const connection of connections) {
    if (!connection.accessToken) continue;
    const providerId = connection.provider as IntegrationProviderId;
    if (!CATALOG_PROVIDER_TO_PRISMA[providerId]) continue;

    for (const workspace of workspaces) {
      await upsertVaultCredentials({
        workspaceId: workspace.id,
        userId,
        providerId,
        accountId: connection.id,
        payload: {
          accessToken: connection.accessToken,
          refreshToken: connection.refreshToken,
          expiresAt: connection.expiresAt,
          tokenType: connection.tokenType,
          scope: connection.scope,
        },
      });
      synced++;
    }
  }

  return synced;
}
