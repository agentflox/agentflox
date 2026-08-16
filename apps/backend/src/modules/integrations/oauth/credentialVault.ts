import { prisma } from '@/lib/prisma';
import {
  CATALOG_PROVIDER_TO_PRISMA,
  type IntegrationProviderId,
} from '@agentflox/types/integrationCatalog';
import {
  decryptIntegrationCredentials,
  type IntegrationCredentialPayload,
} from './credentials';
import {
  integrationAdvisoryLockKey,
  withIntegrationAdvisoryLock,
} from './advisoryLock';
import { refreshProviderToken } from './refresh';
import { assertGoogleIntegrationAllowed } from './googleGating';

export class IntegrationAuthError extends Error {
  readonly code = 'INTEGRATION_AUTH_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'IntegrationAuthError';
  }
}

export type ResolveAccessTokenInput = {
  userId: string;
  workspaceId?: string;
  providerId: IntegrationProviderId;
  accountId: string;
};

type ResolvedToken = {
  accessToken: string;
  accountId: string;
  source: 'vault' | 'account';
};

async function readVaultCredentials(
  input: ResolveAccessTokenInput,
): Promise<IntegrationCredentialPayload | null> {
  const prismaProvider = CATALOG_PROVIDER_TO_PRISMA[input.providerId];
  if (!prismaProvider || !input.workspaceId) return null;

  const integration = await prisma.integration.findFirst({
    where: {
      workspaceId: input.workspaceId,
      provider: prismaProvider,
      installedBy: input.userId,
      isActive: true,
    },
    select: { credentials: true, config: true },
  });

  if (!integration?.credentials) return null;

  try {
    const payload = decryptIntegrationCredentials(integration.credentials);
    if (payload.accountId !== input.accountId) return null;
    return payload;
  } catch {
    return null;
  }
}

async function readAccountAccessToken(
  input: ResolveAccessTokenInput,
): Promise<{ accessToken: string; refreshToken?: string | null; expiresAt?: number | null } | null> {
  const connection = await prisma.integrationConnection.findFirst({
    where: {
      id: input.accountId,
      userId: input.userId,
      provider: input.providerId,
    },
    select: { accessToken: true, refreshToken: true, expiresAt: true },
  });

  if (!connection?.accessToken) return null;

  return {
    accessToken: connection.accessToken,
    refreshToken: connection.refreshToken,
    expiresAt: connection.expiresAt,
  };
}

async function persistRefreshedTokens(
  input: ResolveAccessTokenInput,
  tokens: { accessToken: string; refreshToken?: string | null; expiresAt?: number | null },
): Promise<void> {
  await prisma.integrationConnection.updateMany({
    where: { id: input.accountId, userId: input.userId, provider: input.providerId },
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? undefined,
      expiresAt: tokens.expiresAt ?? undefined,
    },
  });

  if (input.workspaceId) {
    await upsertVaultCredentials({
      workspaceId: input.workspaceId,
      userId: input.userId,
      providerId: input.providerId,
      accountId: input.accountId,
      payload: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
    });
  }
}

async function refreshAccountTokenIfExpired(
  input: ResolveAccessTokenInput,
  account: { accessToken: string; refreshToken?: string | null; expiresAt?: number | null },
): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  const expiresAt = account.expiresAt ?? 0;
  const isExpired = expiresAt > 0 && expiresAt <= nowSec + 60;

  if (!isExpired) return account.accessToken;
  if (!account.refreshToken) {
    throw new IntegrationAuthError(
      `OAuth token for ${input.providerId} expired and no refresh token is available. Reconnect the integration.`,
    );
  }

  const lockKey = integrationAdvisoryLockKey([
    input.workspaceId ?? 'global',
    input.providerId,
    input.accountId,
  ]);

  return withIntegrationAdvisoryLock(lockKey, async () => {
    const fresh = await readAccountAccessToken(input);
    if (!fresh) {
      throw new IntegrationAuthError(`Account ${input.accountId} no longer exists.`);
    }
    const freshExpires = fresh.expiresAt ?? 0;
    if (freshExpires > nowSec + 60) {
      return fresh.accessToken;
    }

    try {
      const refreshed = await refreshProviderToken(input.providerId, account.refreshToken!);
      await persistRefreshedTokens(input, refreshed);
      return refreshed.accessToken;
    } catch (error) {
      await deactivateIntegrationOnAuthFailure(input);
      throw new IntegrationAuthError(
        error instanceof Error ? error.message : 'OAuth token refresh failed',
      );
    }
  });
}

async function deactivateIntegrationOnAuthFailure(input: ResolveAccessTokenInput): Promise<void> {
  const prismaProvider = CATALOG_PROVIDER_TO_PRISMA[input.providerId];
  if (!prismaProvider || !input.workspaceId) return;
  await prisma.integration.updateMany({
    where: {
      workspaceId: input.workspaceId,
      provider: prismaProvider,
      installedBy: input.userId,
    },
    data: { isActive: false },
  });
}

/**
 * Resolve an OAuth access token for a connected integration account.
 * Prefers encrypted Integration.credentials (vault), falls back to IntegrationConnection.
 */
export async function resolveAccessToken(input: ResolveAccessTokenInput): Promise<ResolvedToken> {
  assertGoogleIntegrationAllowed(input.userId, input.providerId);

  if (!input.accountId) {
    throw new IntegrationAuthError(
      'accountId is required. Connect an integration account and pass its id to the tool.',
    );
  }

  const vault = await readVaultCredentials(input);
  if (vault?.accessToken) {
    return { accessToken: vault.accessToken, accountId: input.accountId, source: 'vault' };
  }

  const account = await readAccountAccessToken(input);
  if (account) {
    const accessToken = await refreshAccountTokenIfExpired(input, account);
    return { accessToken, accountId: input.accountId, source: 'account' };
  }

  throw new IntegrationAuthError(
    `No connected ${input.providerId} account found for accountId=${input.accountId}. ` +
      'Reconnect the integration in Dashboard → Integrations.',
  );
}

/**
 * Persist encrypted OAuth tokens into Integration.credentials for runtime use.
 */
export async function upsertVaultCredentials(input: {
  workspaceId: string;
  userId: string;
  providerId: IntegrationProviderId;
  accountId: string;
  payload: Omit<IntegrationCredentialPayload, 'accountId' | 'provider'>;
}): Promise<void> {
  const prismaProvider = CATALOG_PROVIDER_TO_PRISMA[input.providerId];
  if (!prismaProvider) {
    throw new Error(`Provider ${input.providerId} does not support vault storage yet.`);
  }

  const { encryptIntegrationCredentials: encryptFn } = await import('./credentials');
  const encrypted = encryptFn({
    ...input.payload,
    accountId: input.accountId,
    provider: input.providerId,
  });

  const existing = await prisma.integration.findFirst({
    where: {
      workspaceId: input.workspaceId,
      provider: prismaProvider,
      installedBy: input.userId,
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.integration.update({
      where: { id: existing.id },
      data: { credentials: encrypted, isActive: true, lastSyncAt: new Date() },
    });
    return;
  }

  await prisma.integration.create({
    data: {
      workspaceId: input.workspaceId,
      provider: prismaProvider,
      config: { accountId: input.accountId },
      credentials: encrypted,
      installedBy: input.userId,
      isActive: true,
      lastSyncAt: new Date(),
    },
  });
}
