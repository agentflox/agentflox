import { resolveModel } from './resolve';
import { createChatCompletion } from './providers';
import { recordUsage } from './usage';
import { fromOpenAIUsage } from './providers/normalize';
import type { ResolvedModel, RecordUsageContext } from './types';

/**
 * Shared helper for orchestrators / internal LLM passes:
 * resolve → createChatCompletion → recordUsage.
 */
export async function completeWithDefaultModel(params: {
  userId: string;
  modelId?: string | null;
  request: Record<string, unknown>;
  usageContext?: RecordUsageContext;
  userName?: string;
  email?: string;
  skipEntitlement?: boolean;
}): Promise<{ resolved: ResolvedModel; completion: any }> {
  const resolved = await resolveModel({
    modelId: params.modelId,
    userId: params.userId,
    skipEntitlement: params.skipEntitlement,
  });

  const started = Date.now();
  try {
    const completion = await createChatCompletion(resolved, params.request);
    const usage = fromOpenAIUsage(completion?.usage);
    await recordUsage({
      resolved,
      usage,
      userId: params.userId,
      userName: params.userName,
      email: params.email,
      context: {
        ...params.usageContext,
        requestDurationMs: Date.now() - started,
        success: true,
      },
    });
    return { resolved, completion };
  } catch (err) {
    await recordUsage({
      resolved,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, usageEstimated: true },
      userId: params.userId,
      userName: params.userName,
      email: params.email,
      context: {
        ...params.usageContext,
        requestDurationMs: Date.now() - started,
        success: false,
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}

/** Resolve agent.modelId (or default) for FSM / executor-adjacent loops. */
export async function resolveAgentModel(params: {
  userId: string;
  agentId?: string | null;
  modelId?: string | null;
  skipEntitlement?: boolean;
}): Promise<ResolvedModel> {
  let modelId = params.modelId;
  if (!modelId && params.agentId) {
    const { prisma } = await import('@/lib/prisma');
    const agent = await prisma.aiAgent.findUnique({
      where: { id: params.agentId },
      select: { modelId: true },
    });
    modelId = agent?.modelId;
  }
  return resolveModel({
    modelId,
    userId: params.userId,
    skipEntitlement: params.skipEntitlement,
  });
}
