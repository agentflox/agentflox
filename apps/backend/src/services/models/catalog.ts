import { prisma } from '@/lib/prisma';
import type { AiModel, Prisma } from '@agentflox/database/src/generated/prisma/client';
import type { AiModelView } from '@agentflox/types';
import { toAiModelView } from './mappers';
import { isModelVisibleForPlan } from './entitlements';
import type { ModelListFilters } from './types';

const DEFAULT_SLUG = 'gpt-4o-mini';

export async function getDefaultModel(): Promise<AiModel> {
  const byFlag = await prisma.aiModel.findFirst({
    where: { isDefault: true, isSystem: true, isActive: true },
  });
  if (byFlag) return byFlag;

  const bySlug = await prisma.aiModel.findFirst({
    where: { slug: DEFAULT_SLUG, isSystem: true, isActive: true },
  });
  if (bySlug) return bySlug;

  throw new Error('No default AI model found in the database (expected gpt-4o-mini)');
}

export async function getModelById(id: string): Promise<AiModel | null> {
  return prisma.aiModel.findUnique({ where: { id } });
}

export async function getModelBySlug(slug: string, systemOnly = true): Promise<AiModel | null> {
  return prisma.aiModel.findFirst({
    where: {
      slug,
      isActive: true,
      ...(systemOnly ? { isSystem: true } : {}),
    },
  });
}

export function canAccessModel(
  row: AiModel,
  userId: string,
  workspaceIds: string[] = [],
): boolean {
  if (row.isSystem) return true;
  if (row.userId && row.userId === userId) return true;
  if (row.workspaceId && workspaceIds.includes(row.workspaceId)) return true;
  return false;
}

export async function listModels(params: {
  userId: string;
  workspaceIds?: string[];
  filters?: ModelListFilters;
  planType?: string | null;
}): Promise<AiModelView[]> {
  const { userId, workspaceIds = [], filters = {}, planType } = params;

  const or: Prisma.AiModelWhereInput[] = [
    { isSystem: true, isActive: true },
    { isCustom: true, isActive: true, userId },
  ];
  if (workspaceIds.length > 0) {
    or.push({ isCustom: true, isActive: true, workspaceId: { in: workspaceIds } });
  }

  const where: Prisma.AiModelWhereInput = { OR: or };

  if (filters.providers?.length) {
    where.provider = { in: filters.providers as any };
  }
  if (typeof filters.isCustom === 'boolean') {
    where.isCustom = filters.isCustom;
  }
  if (filters.supportsThinking) {
    where.supportsThinking = true;
  }
  if (filters.minContextWindow) {
    where.contextWindow = { gte: filters.minContextWindow };
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.AND = [
      {
        OR: [
          { displayName: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
          { apiModelId: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
    ];
  }

  const rows = await prisma.aiModel.findMany({
    where,
    orderBy: [{ isDefault: 'desc' }, { isSystem: 'desc' }, { displayName: 'asc' }],
  });

  return rows
    .filter((r) => {
      if (r.isCustom) return true;
      return isModelVisibleForPlan(r.slug, r.creditTier, planType);
    })
    .filter((r) => {
      if (filters.maxCreditsPer1k != null && r.creditsPer1kInput != null) {
        return r.creditsPer1kInput <= filters.maxCreditsPer1k!;
      }
      return true;
    })
    .filter((r) => {
      if (!filters.inputFileTypes?.length) return true;
      return filters.inputFileTypes.every((t) => r.inputFileTypes?.includes(t));
    })
    .map(toAiModelView);
}

export { DEFAULT_SLUG };
