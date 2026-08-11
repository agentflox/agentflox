import { invokeWithModel, resolveModel, createChatCompletion, recordUsage, fromOpenAIUsage } from '@/services/models';
import { recordHelperUsage } from '../usage';
import { resolveHelperApiKey } from '../security/apiKey';
import type { HelperArgs, HelperContext, HelperResult } from '../types';

function normalizeModelSlug(model?: string): string | null {
  const m = String(model || '').trim();
  if (!m) return null;
  if (/openai-gpt-4\.1|gpt-4\.1/i.test(m)) return 'gpt-4-1';
  if (/openai-gpt35|gpt-3\.5/i.test(m)) return 'gpt-4o-mini';
  if (m.startsWith('openai-')) return m.replace(/^openai-/, '') || 'gpt-4o-mini';
  return m;
}

async function resolveSandboxModel(args: HelperArgs, ctx: HelperContext) {
  const userId = ctx.userId;
  if (!userId) {
    throw new Error('userId is required for platform helper LLM calls');
  }

  // Prefer explicit catalog modelId, then slug, else default
  const modelId = typeof args.modelId === 'string' ? args.modelId : null;
  const slug = normalizeModelSlug(args.model || args.apiModelId);

  let resolved = await resolveModel({
    modelId,
    userId,
    skipEntitlement: true,
  });

  if (!modelId && slug && slug !== resolved.apiModelId && slug !== resolved.slug) {
    try {
      const { getModelBySlug } = await import('@/services/models');
      const row = await getModelBySlug(slug);
      if (row) {
        resolved = await resolveModel({ modelId: row.id, userId, skipEntitlement: true });
      }
    } catch {
      // keep default resolved
    }
  }

  // Optional per-call user key override (BYOK for this helper invocation only)
  const userKey = resolveHelperApiKey(args, {
    argNames: ['openai_api_key', 'openaiApiKey', 'llm_api_key', 'llmApiKey', 'api_key', 'apiKey'],
  });
  if (userKey) {
    resolved = { ...resolved, apiKey: userKey, isCustom: true };
  }

  return resolved;
}

export async function promptCompletion(
  args: HelperArgs,
  ctx: HelperContext,
  _signal?: AbortSignal,
): Promise<HelperResult> {
  const prompt = String(args.prompt ?? args.text ?? '');
  if (!prompt) return { status: 'error', error: 'prompt is required' };

  try {
    if (!ctx.userId) {
      // Fallback path for sandboxes missing user context — use invoke with system default via env platform keys
      const result = await invokeWithModel({
        resolve: { modelId: null, userId: 'system', skipEntitlement: true },
        messages: [{ role: 'user', content: prompt }],
        options: {
          temperature: typeof args.temperature === 'number' ? args.temperature : 0.2,
          maxTokens: typeof args.max_tokens === 'number' ? args.max_tokens : 2048,
        },
        usageContext: { action: 'GENERATE', metadata: { source: 'platform_helper_prompt_completion' } },
      });
      return {
        status: 'success',
        content: result.content || '',
        answer: result.content || '',
        model: result.resolved.apiModelId,
        user_key_used: result.resolved.isCustom,
        usage: {
          prompt_tokens: result.usage.inputTokens,
          completion_tokens: result.usage.outputTokens,
          total_tokens: result.usage.totalTokens,
        },
      };
    }

    const resolved = await resolveSandboxModel(args, ctx);
    const started = Date.now();
    const completion = await createChatCompletion(resolved, {
      messages: [{ role: 'user', content: prompt }],
      temperature: typeof args.temperature === 'number' ? args.temperature : 0.2,
      max_tokens: typeof args.max_tokens === 'number' ? args.max_tokens : 2048,
      stream: false,
    });
    const usage = fromOpenAIUsage(completion.usage);
    const content = completion.choices?.[0]?.message?.content || '';

    await recordUsage({
      resolved,
      usage,
      userId: ctx.userId,
      context: {
        action: 'GENERATE',
        requestDurationMs: Date.now() - started,
        success: true,
        metadata: { source: 'platform_helper_prompt_completion', toolId: ctx.toolId, runId: ctx.runId },
      },
    });

    await recordHelperUsage({
      ctx,
      helperName: 'prompt_completion',
      billable: !resolved.isCustom,
      success: true,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      meta: { model: resolved.apiModelId, userKeyUsed: resolved.isCustom },
    });

    return {
      status: 'success',
      content,
      answer: content,
      model: resolved.apiModelId,
      user_key_used: resolved.isCustom,
      usage: {
        prompt_tokens: usage.inputTokens,
        completion_tokens: usage.outputTokens,
        total_tokens: usage.totalTokens,
      },
    };
  } catch (err) {
    return {
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function llmChatCompletionsCreate(
  args: HelperArgs,
  ctx: HelperContext,
  _signal?: AbortSignal,
): Promise<HelperResult> {
  const messages = Array.isArray(args.messages) ? args.messages : [];
  if (!messages.length) {
    return { status: 'error', error: 'messages array is required' };
  }

  try {
    const resolved = await resolveSandboxModel(args, {
      ...ctx,
      userId: ctx.userId || 'system',
    });
    const started = Date.now();
    const completion = await createChatCompletion(resolved, {
      messages,
      temperature: typeof args.temperature === 'number' ? args.temperature : undefined,
      max_tokens: typeof args.max_tokens === 'number' ? args.max_tokens : undefined,
      stream: false,
    });
    const usage = fromOpenAIUsage(completion.usage);

    if (ctx.userId) {
      await recordUsage({
        resolved,
        usage,
        userId: ctx.userId,
        context: {
          action: 'CHAT',
          requestDurationMs: Date.now() - started,
          success: true,
          metadata: { source: 'platform_helper_llm_chat', toolId: ctx.toolId, runId: ctx.runId },
        },
      });
    }

    await recordHelperUsage({
      ctx,
      helperName: 'llm',
      billable: !resolved.isCustom,
      success: true,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      meta: { model: resolved.apiModelId, userKeyUsed: resolved.isCustom },
    });

    return {
      status: 'success',
      choices: (completion.choices || []).map((c: any) => ({
        message: { role: c.message?.role, content: c.message?.content || '' },
        finish_reason: c.finish_reason,
      })),
      usage: {
        prompt_tokens: usage.inputTokens,
        completion_tokens: usage.outputTokens,
        total_tokens: usage.totalTokens,
      },
      model: resolved.apiModelId,
      user_key_used: resolved.isCustom,
    };
  } catch (err) {
    return {
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
