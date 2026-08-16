import { prisma } from '@/lib/prisma';
import type { IntegrationOAuthProviderId } from '@agentflox/types/integrationOAuth';
import { CATALOG_PROVIDER_TO_PRISMA } from '@agentflox/types/integrationCatalog';
import { IntegrationProvider } from '@agentflox/database';
import { syncIntegrationVaultForUser } from '@/lib/integrationVaultSync';
import type { ExchangedOAuthTokens } from './providers';

export async function persistIntegrationOAuthConnection(input: {
  userId: string;
  provider: IntegrationOAuthProviderId;
  tokens: ExchangedOAuthTokens;
}): Promise<{ id: string }> {
  const existing = await prisma.integrationConnection.findUnique({
    where: {
      userId_provider_providerAccountId: {
        userId: input.userId,
        provider: input.provider,
        providerAccountId: input.tokens.providerAccountId,
      },
    },
  });

  const data = {
    accessToken: input.tokens.accessToken,
    refreshToken: input.tokens.refreshToken ?? existing?.refreshToken ?? null,
    expiresAt: input.tokens.expiresAt,
    tokenType: input.tokens.tokenType,
    scope: input.tokens.scope,
    displayName: input.tokens.displayName,
    email: input.tokens.email,
    avatarUrl: input.tokens.avatarUrl,
  };

  const connection = existing
    ? await prisma.integrationConnection.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.integrationConnection.create({
        data: {
          userId: input.userId,
          provider: input.provider,
          providerAccountId: input.tokens.providerAccountId,
          ...data,
        },
      });

  await syncIntegrationsForConnection(input.userId, input.provider);
  await syncIntegrationVaultForUser(input.userId).catch((error) => {
    console.warn('[integrationOAuth] Vault sync failed:', error);
  });

  return { id: connection.id };
}

async function syncIntegrationsForConnection(
  userId: string,
  provider: IntegrationOAuthProviderId,
) {
  const prismaProvider = CATALOG_PROVIDER_TO_PRISMA[provider] as IntegrationProvider | undefined;
  if (!prismaProvider) return;

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
  if (workspaces.length === 0) return;

  const workspaceIds = workspaces.map((w) => w.id);

  // Batch-fetch all existing records in a single query instead of N+1
  const existing = await prisma.integration.findMany({
    where: { installedBy: userId, provider: prismaProvider, workspaceId: { in: workspaceIds } },
    select: { workspaceId: true },
  });
  const existingSet = new Set(existing.map((e) => e.workspaceId));

  const toActivate = workspaceIds.filter((id) => existingSet.has(id));
  const toCreate = workspaceIds.filter((id) => !existingSet.has(id));

  const updates: Promise<unknown>[] = [];
  if (toActivate.length > 0) {
    updates.push(
      prisma.integration.updateMany({
        where: { installedBy: userId, provider: prismaProvider, workspaceId: { in: toActivate } },
        data: { isActive: true, lastSyncAt: new Date() },
      }),
    );
  }
  if (toCreate.length > 0) {
    updates.push(
      prisma.integration.createMany({
        data: toCreate.map((workspaceId) => ({
          workspaceId,
          provider: prismaProvider,
          config: {},
          installedBy: userId,
          isActive: true,
        })),
        skipDuplicates: true,
      }),
    );
  }
  await Promise.all(updates);
}
