import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { IntegrationProvider } from "@agentflox/database/src/generated/prisma/index.js";
import { TRPCError } from "@trpc/server";

/** Map OAuth account provider string to IntegrationProvider enum */
const ACCOUNT_PROVIDER_TO_INTEGRATION: Record<string, (typeof IntegrationProvider)[keyof typeof IntegrationProvider]> = {
  github: IntegrationProvider.GITHUB,
  slack: IntegrationProvider.SLACK,
  gitlab: IntegrationProvider.GITLAB,
  jira: IntegrationProvider.JIRA,
  trello: IntegrationProvider.TRELLO,
  figma: IntegrationProvider.FIGMA,
  linear: IntegrationProvider.LINEAR,
  notion: IntegrationProvider.NOTION,
  google_calendar: IntegrationProvider.GOOGLE_CALENDAR,
  google_drive: IntegrationProvider.GOOGLE_DRIVE,
  dropbox: IntegrationProvider.DROPBOX,
  zapier: IntegrationProvider.ZAPIER,
  custom: IntegrationProvider.CUSTOM,
};

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
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      userId,
      provider: "github",
    },
  });

  if (!account || !account.access_token) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "GitHub account not found for current user",
    });
  }

  return account;
}

/** Sync user's connected accounts (Account) into the integrations table for their workspaces */
async function syncIntegrationsForUser(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { provider: true },
    distinct: ["provider"],
  });
  const providers = accounts
    .map((a) => ACCOUNT_PROVIDER_TO_INTEGRATION[a.provider.toLowerCase()])
    .filter((p): p is (typeof IntegrationProvider)[keyof typeof IntegrationProvider] => p != null);

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
  // High-level view of which integrations are available & connected (from integrations table)
  listProviders: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session!.user!.id;

    await syncIntegrationsForUser(userId);

    const githubAccounts = await prisma.account.count({
      where: { userId, provider: "github" },
    });
    const integrationsByProvider = await prisma.integration.findMany({
      where: { installedBy: userId, isActive: true },
      select: { provider: true },
      distinct: ["provider"],
    });
    const connectedProviders = new Set(integrationsByProvider.map((i) => i.provider));

    const githubIntegration = await prisma.integration.findFirst({
      where: { installedBy: userId, provider: IntegrationProvider.GITHUB, isActive: true },
      select: { config: true },
    });

    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

    return {
      github: {
        isConnected: connectedProviders.has(IntegrationProvider.GITHUB),
        accountsCount: githubAccounts,
        config: (githubIntegration?.config as Record<string, any>) || {},
      },
      openai: {
        isConnected: hasOpenAI,
      },
      anthropic: {
        isConnected: hasAnthropic,
      },
      http_webhook: {
        // Generic HTTP/Webhook does not require a specific OAuth account; always available.
        isConnected: true,
      },
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

  githubListAccounts: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session!.user!.id;

    // Ensure integrations are synced
    await syncIntegrationsForUser(userId);

    const accounts = await prisma.account.findMany({
      where: { userId, provider: "github" },
      // `Account` model does not include timestamps; order deterministically by id
      orderBy: { id: "asc" },
    });

    // Enrich with live GitHub profile data for a better UX
    const enriched = await Promise.all(
      accounts.map(async (account) => {
        if (!account.access_token) {
          return {
            id: account.id,
            providerAccountId: account.providerAccountId,
            login: null as string | null,
            avatarUrl: null as string | null,
            htmlUrl: null as string | null,
          };
        }

        try {
          const profile = await fetchFromGitHub<{
            login: string;
            avatar_url: string;
            html_url: string;
          }>(account.access_token, "/user");

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
            login: null,
            avatarUrl: null,
            htmlUrl: null,
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
      const account = await prisma.account.findFirst({
        where: { id: input.accountId, userId },
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      await prisma.account.delete({
        where: { id: input.accountId },
      });

      // Optionally, we could also remove the integration record if no other accounts exist,
      // but keeping it might preserve configuration if they re-connect.
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
      >(account.access_token!, `/user/repos?${searchParams.toString()}`);

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
      >(account.access_token!, `/repos/${input.owner}/${input.repo}/branches`);

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
        account.access_token!,
        `/repos/${input.owner}/${input.repo}/git/ref/heads/${encodeURIComponent(
          input.fromBranch
        )}`
      );

      // Create the new branch
      const created = await fetchFromGitHub<{
        ref: string;
        object: { sha: string };
      }>(account.access_token!, `/repos/${input.owner}/${input.repo}/git/refs`, {
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
});

