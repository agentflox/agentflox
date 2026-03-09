import { prisma } from '@/lib/prisma';

type AiAction = 'EMBEDDING' | 'CHAT' | 'ANALYZE'

const MODEL_PRICING: Record<string, { inputPer1K: number; outputPer1K?: number }> = {
  'text-embedding-3-large': { inputPer1K: 0.13 },
  'text-embedding-3-small': { inputPer1K: 0.02 },
  'gpt-4.1': { inputPer1K: 5, outputPer1K: 15 },
  'gpt-4.1-mini': { inputPer1K: 0.3, outputPer1K: 1.2 },
}

function estimateCostUSD(model: string, inputTokens: number, outputTokens: number = 0): number {
  const pricing = MODEL_PRICING[model] || { inputPer1K: 0.5, outputPer1K: 1.5 }
  const inputCost = (inputTokens / 1000) * pricing.inputPer1K
  const outputCost = (outputTokens / 1000) * (pricing.outputPer1K ?? 0)
  return +(inputCost + outputCost).toFixed(6)
}

export async function logAiUsage(params: {
  userId?: string
  conversationId?: string
  action: AiAction
  model: string
  tokensUsed: number
  inputTokens?: number
  outputTokens?: number
  cost?: number
  success?: boolean
  errorMessage?: string
  metadata?: Record<string, any>
}) {
  const cost = params.cost ?? estimateCostUSD(params.model, params.tokensUsed, params.outputTokens ?? 0)

  await prisma.aiUsageLog.create({
    data: {
      userId: params.userId ?? 'system',
      conversationId: params.conversationId,
      action: params.action as any,
      model: params.model,
      tokensUsed: params.tokensUsed,
      cost,
      requestDuration: params.metadata?.durationMs,
      success: params.success ?? true,
      errorMessage: params.errorMessage,
      metadata: params.metadata as any,
    },
  })
}


