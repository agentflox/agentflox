import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { IntegrationProvider } from "@agentflox/database";
import { INTEGRATION_CATALOG } from "@agentflox/types/integrationCatalog";
import { TRPCError } from "@trpc/server";

async function syncVaultToBackend(session: { user?: { id?: string } } | null | undefined) {
  try {
    const { sendBackendRequest } = await import("@/utils/backend-request");
    const res = await sendBackendRequest(
      "/v1/integrations/sync-vault",
      { method: "POST" },
      session,
    );
    if (!res.ok) return { synced: 0 };
    return (await res.json()) as { synced?: number };
  } catch {
    return { synced: 0 };
  }
}

const CATALOG_TO_PRISMA: Record<string, (typeof IntegrationProvider)[keyof typeof IntegrationProvider]> = {
  github: IntegrationProvider.GITHUB,
  slack: IntegrationProvider.SLACK,
  google_mail: IntegrationProvider.GOOGLE_MAIL,
  google_calendar: IntegrationProvider.GOOGLE_CALENDAR,
  google_drive: IntegrationProvider.GOOGLE_DRIVE,
};

type CatalogAccountView = {
  id: string;
  providerAccountId: string;
  primaryLabel: string;
  secondaryLabel: string | null;
  avatarUrl: string | null;
};

function toCatalogAccountView(connection: {
  id: string;
  providerAccountId: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
}): CatalogAccountView {
  const primaryLabel = connection.displayName || connection.email || connection.providerAccountId;
  return {
    id: connection.id,
    providerAccountId: connection.providerAccountId,
    primaryLabel,
    secondaryLabel:
      connection.email && connection.email !== primaryLabel ? connection.email : null,
    avatarUrl: connection.avatarUrl,
  };
}

const GITHUB_API_BASE = "https://api.github.com";

async function fetchFromGitHub<T>(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${GITHUB_API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `GitHub API error (${res.status}): ${text || res.statusText}`,
    });
  }

  return res.json() as Promise<T>;
}

async function getGithubAccountForUser(userId: string, accountId: string) {
  const connection = await prisma.integrationConnection.findFirst({
    where: {
      id: accountId,
      userId,
      provider: "github",
    },
  });

  if (!connection?.accessToken) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "GitHub account not found for current user",
    });
  }

  return connection;
}

async function deleteIntegrationConnection(userId: string, connectionId: string) {
  const connection = await prisma.integrationConnection.findFirst({
    where: { id: connectionId, userId },
  });
  if (!connection) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });
  }

  const prismaProvider = CATALOG_TO_PRISMA[connection.provider];
  if (prismaProvider) {
    await prisma.integration.updateMany({
      where: { installedBy: userId, provider: prismaProvider },
      data: { isActive: false, credentials: null },
    });
  }

  await prisma.integrationConnection.delete({ where: { id: connection.id } });
}

/** Sync IntegrationConnection rows into workspace Integration records. */
async function syncIntegrationsForUser(userId: string) {
  const connections = await prisma.integrationConnection.findMany({
    where: { userId },
    select: { provider: true },
  });
  const providers = Array.from(
    new Set(
      connections
        .map((c) => CATALOG_TO_PRISMA[c.provider])
        .filter(Boolean),
    ),
  ) as IntegrationProvider[];

  if (providers.length === 0) return;

  const workspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId, status: "ACTIVE" } } },
      ],
      isActive: true,
    },
    select: { id: true },
  });
  if (workspaces.length === 0) return;

  const existing = await prisma.integration.findMany({
    where: { installedBy: userId },
    select: { workspaceId: true, provider: true },
  });
  const existingSet = new Set(existing.map((e) => `${e.workspaceId ?? ""}:${e.provider}`));

  for (const workspace of workspaces) {
    for (const provider of providers) {
      const key = `${workspace.id}:${provider}`;
      if (existingSet.has(key)) continue;
      existingSet.add(key);
      await prisma.integration.create({
        data: {
          workspaceId: workspace.id,
          provider,
          config: {},
          installedBy: userId,
        },
      });
    }
  }
}

export const integrationRouter = router({
  /** Canonical integration catalog merged with per-user connection status. */
  listCatalog: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session!.user!.id;

    const connections = await prisma.integrationConnection.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
        displayName: true,
        email: true,
        avatarUrl: true,
      },
    });

    const accountsByCatalogId: Record<string, CatalogAccountView[]> = {};
    for (const connection of connections) {
      if (!accountsByCatalogId[connection.provider]) {
        accountsByCatalogId[connection.provider] = [];
      }
      accountsByCatalogId[connection.provider].push(toCatalogAccountView(connection));
    }

    return {
      schemaVersion: "1.0.0",
      platform: {
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
      },
      providers: INTEGRATION_CATALOG.map((provider) => {
        const accountList = accountsByCatalogId[provider.providerId] ?? [];
        const isConnected =
          provider.providerId === "webhook" || provider.providerId === "schedule"
            ? true
            : accountList.length > 0;

        return {
          providerId: provider.providerId,
          displayName: provider.displayName,
          verified: provider.verified,
          isConnected,
          accountsCount: accountList.length,
          accounts: accountList,
          actions: provider.actions.map((action) => ({
            actionId: action.actionId,
            displayName: action.displayName,
            description: action.description,
            verified: action.verified,
            toolName: action.toolName,
          })),
        };
      }),
    };
  }),

  // High-level view of which integrations are available & connected (from integrations table)
  listProviders: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session!.user!.id;

    const connections = await prisma.integrationConnection.findMany({
      where: { userId },
      select: { provider: true },
    });
    const connectedCatalog = new Set(connections.map((c) => c.provider));
    const githubAccounts = connections.filter((c) => c.provider === "github").length;

    const githubIntegration = await prisma.integration.findFirst({
      where: { installedBy: userId, provider: IntegrationProvider.GITHUB, isActive: true },
      select: { config: true },
    });

    return {
      github: {
        isConnected: connectedCatalog.has("github"),
        accountsCount: githubAccounts,
        config: (githubIntegration?.config as Record<string, any>) || {},
      },
      slack: { isConnected: connectedCatalog.has("slack") },
      gmail: { isConnected: connectedCatalog.has("google_mail") },
      google_calendar: { isConnected: connectedCatalog.has("google_calendar") },
      google_drive: { isConnected: connectedCatalog.has("google_drive") },
      openai: { isConnected: !!process.env.OPENAI_API_KEY },
      anthropic: { isConnected: !!process.env.ANTHROPIC_API_KEY },
      http_webhook: { isConnected: true },
    };
  }),

  updateIntegrationConfig: protectedProcedure
    .input(z.object({ provider: z.string(), config: z.any() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      // Update all active integrations for this user/provider to keep them in sync
      await prisma.integration.updateMany({
        where: {
          installedBy: userId,
          provider: input.provider.toUpperCase() as IntegrationProvider,
          isActive: true,
        },
        data: { config: input.config },
      });
      return { success: true };
    }),

  githubListAccounts: protectedProcedure
    .input(z.object({ enrichProfiles: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const enrichProfiles = input?.enrichProfiles ?? false;

      const accounts = await prisma.integrationConnection.findMany({
        where: { userId, provider: "github" },
        orderBy: { id: "asc" },
      });

      if (!enrichProfiles) {
        return accounts.map((account) => ({
          id: account.id,
          providerAccountId: account.providerAccountId,
          login: account.displayName || account.providerAccountId,
          avatarUrl: account.avatarUrl,
          htmlUrl: null as string | null,
        }));
      }

      const enriched = await Promise.all(
        accounts.map(async (account) => {
          if (!account.accessToken) {
            return {
              id: account.id,
              providerAccountId: account.providerAccountId,
              login: account.displayName,
              avatarUrl: account.avatarUrl,
              htmlUrl: null as string | null,
            };
          }

          try {
            const profile = await fetchFromGitHub<{
              login: string;
              avatar_url: string;
              html_url: string;
            }>(account.accessToken, "/user");

            return {
              id: account.id,
              providerAccountId: account.providerAccountId,
              login: profile.login,
              avatarUrl: profile.avatar_url,
              htmlUrl: profile.html_url,
            };
          } catch {
            return {
              id: account.id,
              providerAccountId: account.providerAccountId,
              login: account.displayName,
              avatarUrl: account.avatarUrl,
              htmlUrl: null as string | null,
            };
          }
        })
      );

      return enriched;
    }),

  githubDisconnect: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      await deleteIntegrationConnection(userId, input.accountId);
      return { success: true };
    }),

  githubListRepos: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        query: z.string().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const account = await getGithubAccountForUser(userId, input.accountId);

      const searchParams = new URLSearchParams({
        per_page: String(input.pageSize),
        page: String(input.page),
      });

      const repos = await fetchFromGitHub<
        Array<{
          id: number;
          name: string;
          full_name: string;
          private: boolean;
          html_url: string;
          description: string | null;
          default_branch: string;
          owner: { login: string; avatar_url: string; html_url: string };
        }>
      >(account.accessToken, `/user/repos?${searchParams.toString()}`);

      const filtered = input.query
        ? repos.filter((r) =>
          `${r.full_name} ${r.description || ""}`
            .toLowerCase()
            .includes(input.query!.toLowerCase())
        )
        : repos;

      return filtered.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        htmlUrl: repo.html_url,
        isPrivate: repo.private,
        defaultBranch: repo.default_branch,
        ownerLogin: repo.owner.login,
        ownerAvatarUrl: repo.owner.avatar_url,
        ownerHtmlUrl: repo.owner.html_url,
      }));
    }),

  githubListBranches: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        owner: z.string(),
        repo: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const account = await getGithubAccountForUser(userId, input.accountId);

      const branches = await fetchFromGitHub<
        Array<{
          name: string;
          commit: { sha: string; url: string };
          protected: boolean;
        }>
      >(account.accessToken, `/repos/${input.owner}/${input.repo}/branches`);

      return branches.map((b) => ({
        name: b.name,
        sha: b.commit.sha,
        protected: b.protected,
      }));
    }),

  githubCreateBranch: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        owner: z.string(),
        repo: z.string(),
        fromBranch: z.string(),
        newBranch: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const account = await getGithubAccountForUser(userId, input.accountId);

      // Get the base branch SHA
      const ref = await fetchFromGitHub<{
        ref: string;
        object: { sha: string };
      }>(
        account.accessToken,
        `/repos/${input.owner}/${input.repo}/git/ref/heads/${encodeURIComponent(
          input.fromBranch
        )}`
      );

      // Create the new branch
      const created = await fetchFromGitHub<{
        ref: string;
        object: { sha: string };
      }>(account.accessToken, `/repos/${input.owner}/${input.repo}/git/refs`, {
        method: "POST",
        body: JSON.stringify({
          ref: `refs/heads/${input.newBranch}`,
          sha: ref.object.sha,
        }),
      });

      return {
        name: created.ref.replace("refs/heads/", ""),
        sha: created.object.sha,
      };
    }),

  syncVault: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session!.user!.id;
    await syncIntegrationsForUser(userId);
    const result = await syncVaultToBackend(ctx.session);
    return { success: true, synced: result.synced ?? 0 };
  }),

  oauthDisconnect: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      await deleteIntegrationConnection(userId, input.accountId);
      return { success: true };
    }),
});

