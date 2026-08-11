import logger from '@/lib/logger';
import { updateAgentUsage } from '@/utils/ai/agentUsageTracking';
import type { HelperContext } from './types';

/**
 * Record billable / observablity events for platform helpers.
 * LLM uses token billing; external APIs use a small estimated token charge
 * so quota systems stay aware of paid outbound calls.
 */
export async function recordHelperUsage(opts: {
  ctx: HelperContext;
  helperName: string;
  billable: boolean;
  success: boolean;
  meta?: Record<string, any>;
  /** Approximate token cost for non-LLM helpers */
  estimatedTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
}): Promise<void> {
  const { ctx, helperName, billable, success, meta, estimatedTokens, inputTokens, outputTokens } = opts;
  logger.info('[PlatformHelpers] usage', {
    userId: ctx.userId,
    runId: ctx.runId,
    toolId: ctx.toolId,
    helperName,
    billable,
    success,
    ...meta,
  });

  if (!billable || !success || !ctx.userId) return;

  try {
    if (typeof inputTokens === 'number' || typeof outputTokens === 'number') {
      await updateAgentUsage(
        ctx.userId,
        'System',
        inputTokens || 0,
        outputTokens || 0,
      );
      return;
    }
    if (estimatedTokens && estimatedTokens > 0) {
      // Treat external API calls as small token debit for quota visibility
      await updateAgentUsage(ctx.userId, 'System', estimatedTokens, 0);
    }
  } catch (err: any) {
    logger.warn('[PlatformHelpers] failed to record usage', { error: err?.message, helperName });
  }
}
