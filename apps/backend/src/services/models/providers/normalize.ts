import type { UnifiedUsage } from '../types';

export function emptyUsage(estimated = false): UnifiedUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    usageEstimated: estimated,
  };
}

export function fromOpenAIUsage(usage: any, estimated = false): UnifiedUsage {
  const inputTokens = Number(usage?.prompt_tokens ?? usage?.input_tokens ?? 0);
  const outputTokens = Number(usage?.completion_tokens ?? usage?.output_tokens ?? 0);
  const cachedTokens = Number(usage?.prompt_tokens_details?.cached_tokens ?? 0) || undefined;
  return {
    inputTokens,
    outputTokens,
    totalTokens: Number(usage?.total_tokens ?? inputTokens + outputTokens),
    cachedTokens,
    usageEstimated: estimated,
  };
}

export function fromAnthropicUsage(usage: any, estimated = false): UnifiedUsage {
  const inputTokens = Number(usage?.input_tokens ?? 0);
  const outputTokens = Number(usage?.output_tokens ?? 0);
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    usageEstimated: estimated,
  };
}

export function fromGoogleUsage(usage: any, estimated = false): UnifiedUsage {
  const inputTokens = Number(
    usage?.promptTokenCount ?? usage?.prompt_tokens ?? usage?.input_tokens ?? 0,
  );
  const outputTokens = Number(
    usage?.candidatesTokenCount ?? usage?.completion_tokens ?? usage?.output_tokens ?? 0,
  );
  const totalTokens = Number(usage?.totalTokenCount ?? inputTokens + outputTokens);
  return {
    inputTokens,
    outputTokens,
    totalTokens,
    usageEstimated: estimated,
  };
}

export function estimateUsageFromText(input: string, output: string): UnifiedUsage {
  const inputTokens = Math.ceil((input || '').length / 4);
  const outputTokens = Math.ceil((output || '').length / 4);
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    usageEstimated: true,
  };
}
