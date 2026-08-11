import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '@/trpc/init';
import { prisma } from '@/lib/prisma';
import { encryptCredentials } from '@/lib/modelCredentials';
import {
  PROVIDER_AUTH_REGISTRY,
  getProviderAuthConfig,
  type AiModelView,
} from '@agentflox/types';

function toView(row: any): AiModelView {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.displayName,
    provider: row.provider,
    apiModelId: row.apiModelId,
    description: row.description,
    icon: row.icon,
    color: row.color,
    isSystem: row.isSystem,
    isCustom: row.isCustom,
    isDefault: row.isDefault,
    isActive: row.isActive ?? true,
    authType: row.authType ?? null,
    hasCredentials: Boolean(row.credentialsEncrypted),
    credentialsHint: row.credentialsEncrypted ? '••••••••' : null,
    contextWindow: row.contextWindow,
    maxOutputTokens: row.maxOutputTokens,
    creditsPer1kInput: row.creditsPer1kInput,
    creditsPer1kOutput: row.creditsPer1kOutput,
    creditTier: row.creditTier,
    inputFileTypes: row.inputFileTypes ?? [],
    supportsThinking: Boolean(row.supportsThinking),
    workspaceId: row.workspaceId,
    userId: row.userId,
  };
}

const listInput = z
  .object({
    search: z.string().optional(),
    providers: z.array(z.enum(['OPENAI', 'ANTHROPIC', 'GOOGLE'])).optional(),
    workspaceId: z.string().optional(),
  })
  .optional();

const customInput = z.object({
  displayName: z.string().min(1).max(120),
  provider: z.enum(['OPENAI', 'ANTHROPIC', 'GOOGLE']),
  apiModelId: z.string().min(1).max(200),
  slug: z.string().min(1).max(120).optional(),
  authType: z.enum(['API_KEY', 'OAUTH_TOKEN', 'SERVICE_ACCOUNT']).default('API_KEY'),
  credentials: z.record(z.string(), z.unknown()),
  description: z.string().max(2000).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  contextWindow: z.number().int().positive().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  maxTokens: z.number().int().positive().optional(),
  creditTier: z.enum(['FREE', 'LOW', 'MODERATE', 'HIGH']).optional(),
  supportsThinking: z.boolean().optional(),
  workspaceId: z.string().optional().nullable(),
  skipValidate: z.boolean().optional(),
});

export const modelsRouter = router({
  providerAuthRegistry: protectedProcedure.query(() => PROVIDER_AUTH_REGISTRY),

  getDefault: protectedProcedure.query(async () => {
    const row =
      (await prisma.aiModel.findFirst({
        where: { isDefault: true, isSystem: true, isActive: true },
      })) ||
      (await prisma.aiModel.findFirst({
        where: { slug: 'gpt-4o-mini', isSystem: true, isActive: true },
      }));
    if (!row) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'No default AI model configured' });
    }
    return toView(row);
  }),

  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const userId = ctx.session!.user!.id;
    const search = input?.search?.trim();
    const providers = input?.providers;
    const workspaceId = input?.workspaceId;

    const rows = await prisma.aiModel.findMany({
      where: {
        isActive: true,
        OR: [
          { isSystem: true },
          { isCustom: true, userId },
          ...(workspaceId
            ? [{ isCustom: true as const, workspaceId }]
            : []),
        ],
        ...(providers?.length ? { provider: { in: providers as any } } : {}),
        ...(search
          ? {
              AND: [
                {
                  OR: [
                    { displayName: { contains: search, mode: 'insensitive' as const } },
                    { slug: { contains: search, mode: 'insensitive' as const } },
                    { apiModelId: { contains: search, mode: 'insensitive' as const } },
                    { description: { contains: search, mode: 'insensitive' as const } },
                  ],
                },
              ],
            }
          : {}),
      },
      orderBy: [{ isDefault: 'desc' }, { isSystem: 'desc' }, { displayName: 'asc' }],
    });

    return rows.map(toView);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const row = await prisma.aiModel.findUnique({ where: { id: input.id } });
      if (!row || !row.isActive) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Model not found' });
      }
      if (row.isCustom && row.userId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }
      return toView(row);
    }),

  createCustom: protectedProcedure.input(customInput).mutation(async ({ ctx, input }) => {
    const userId = ctx.session!.user!.id;
    const cfg = getProviderAuthConfig(input.provider);
    if (!cfg?.authMethods.includes(input.authType)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Auth type ${input.authType} is not supported for ${input.provider}`,
      });
    }
    if (input.authType === 'API_KEY' && !input.credentials?.apiKey) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'API key is required' });
    }

    const slug =
      input.slug?.trim() ||
      `${input.provider.toLowerCase()}-${input.apiModelId}`
        .toLowerCase()
        .replace(/[^a-z0-9.-]+/g, '-')
        .slice(0, 100);

    const existing = await prisma.aiModel.findFirst({
      where: { userId, slug, isCustom: true },
    });
    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'You already have a model with this slug' });
    }

    const row = await prisma.aiModel.create({
      data: {
        slug,
        displayName: input.displayName,
        name: slug.replace(/-/g, '_'),
        provider: input.provider as any,
        apiModelId: input.apiModelId,
        description: input.description,
        icon: input.icon,
        color: input.color,
        isSystem: false,
        isCustom: true,
        isDefault: false,
        isActive: true,
        userId,
        workspaceId: input.workspaceId || null,
        authType: input.authType as any,
        credentialsEncrypted: encryptCredentials(input.credentials),
        contextWindow: input.contextWindow,
        maxOutputTokens: input.maxOutputTokens,
        maxTokens: input.maxTokens,
        creditTier: input.creditTier || 'MODERATE',
        inputFileTypes: [],
        supportsThinking: input.supportsThinking || false,
      },
    });

    return toView(row);
  }),

  updateCustom: protectedProcedure
    .input(
      customInput.partial().extend({
        id: z.string(),
        credentials: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const existing = await prisma.aiModel.findUnique({ where: { id: input.id } });
      if (!existing || !existing.isCustom) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Custom model not found' });
      }
      if (existing.userId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }

      const row = await prisma.aiModel.update({
        where: { id: input.id },
        data: {
          ...(input.displayName != null ? { displayName: input.displayName } : {}),
          ...(input.apiModelId != null ? { apiModelId: input.apiModelId } : {}),
          ...(input.provider != null ? { provider: input.provider as any } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.icon !== undefined ? { icon: input.icon } : {}),
          ...(input.color !== undefined ? { color: input.color } : {}),
          ...(input.contextWindow !== undefined ? { contextWindow: input.contextWindow } : {}),
          ...(input.maxOutputTokens !== undefined ? { maxOutputTokens: input.maxOutputTokens } : {}),
          ...(input.maxTokens !== undefined ? { maxTokens: input.maxTokens } : {}),
          ...(input.creditTier !== undefined ? { creditTier: input.creditTier } : {}),
          ...(input.supportsThinking !== undefined ? { supportsThinking: input.supportsThinking } : {}),
          ...(input.workspaceId !== undefined ? { workspaceId: input.workspaceId } : {}),
          ...(input.authType != null ? { authType: input.authType as any } : {}),
          ...(input.credentials
            ? { credentialsEncrypted: encryptCredentials(input.credentials) }
            : {}),
        },
      });

      return toView(row);
    }),

  deleteCustom: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const existing = await prisma.aiModel.findUnique({ where: { id: input.id } });
      if (!existing || !existing.isCustom) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Custom model not found' });
      }
      if (existing.userId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }
      await prisma.aiModel.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});

export type ModelsRouter = typeof modelsRouter;
