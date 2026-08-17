import { prisma } from '@/lib/prisma';
import {
  countAgentTokens,
} from '@/utils/ai/agentUsageTracking';
import { EditorAssistantResponseSchema } from './editorOps';
import type { z } from 'zod';
import {
  CircuitBreaker,
  CircuitBreakerError,
  RetryHandler,
  ErrorClassifier,
} from '@/utils/circuitBreaker';
import { createChatCompletion, resolveModel, recordUsage, toUserFacingError, type ResolvedModel } from '@/services/models';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EditorAssistantMessageInput {
  userId: string;
  conversationId: string;
  message: string;
  context: unknown;
  onToken?: (text: string) => void;
  signal?: AbortSignal;
  modelId?: string | null;
  options?: { attachments?: any[]; contexts?: any[]; mentions?: any[]; modelId?: string | null };
}

export type EditorAssistantResponse = z.infer<typeof EditorAssistantResponseSchema>;

// ─── Service Error ─────────────────────────────────────────────────────────────

export class EditorAssistantError extends Error {
  constructor(
    public code: string,
    message: string,
    public userMessage: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'EditorAssistantError';
  }
}

// ─── BaseEditorAssistant ───────────────────────────────────────────────────────

/**
 * Shared infrastructure for editor-assistant brains.
 * Handles circuit breaking, retries, background tracking, and stream parsing.
 */
export abstract class BaseEditorAssistant {
  private readonly retryHandler = new RetryHandler();
  private readonly errorClassifier = new ErrorClassifier();
  private resolvedModelCache = new Map<string, ResolvedModel>();

  private readonly operationCircuitBreakers = (() => {
    const MAX = 20;
    const map = new Map<string, CircuitBreaker>();
    return {
      get: (k: string): CircuitBreaker | undefined => {
        const v = map.get(k);
        if (v) { map.delete(k); map.set(k, v); }
        return v;
      },
      set: (k: string, v: CircuitBreaker) => {
        if (map.has(k)) map.delete(k);
        else if (map.size >= MAX) map.delete(map.keys().next().value!);
        map.set(k, v);
      },
    };
  })();

  private getCircuitBreaker(operation: string): CircuitBreaker {
    let cb = this.operationCircuitBreakers.get(operation);
    if (!cb) {
      cb = new CircuitBreaker({
        failureThreshold: 10,
        resetTimeout: 30_000,
        halfOpenMaxCalls: 2,
      });
      this.operationCircuitBreakers.set(operation, cb);
    }
    return cb;
  }

  protected runInBackground(label: string, fn: () => Promise<void>): void {
    (async () => {
      try {
        await fn();
      } catch (err) {
        console.error(`[BaseEditorAssistant] Background task "${label}" failed:`, err);
      }
    })();
  }

  protected trackTokenUsage(
    messages: Array<{ role: string; content: string }>,
    rawText: string,
    resolved: ResolvedModel,
    usage: any,
    userId: string,
    context?: { conversationId?: string; source?: string },
  ): void {
    this.runInBackground('token-usage-tracking', async () => {
      const tokenCount = await countAgentTokens(
        messages,
        rawText,
        resolved.apiModelId,
        usage,
      );
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });
      await recordUsage({
        resolved,
        usage: {
          inputTokens: tokenCount.inputTokens,
          outputTokens: tokenCount.outputTokens,
          totalTokens: tokenCount.inputTokens + tokenCount.outputTokens,
          usageEstimated: !usage,
        },
        userId,
        userName: user?.name || user?.email || 'User',
        email: user?.email || undefined,
        context: {
          conversationId: context?.conversationId,
          action: 'CHAT',
          success: true,
          metadata: { source: context?.source || 'BaseEditorAssistant' },
        },
      });
    });
  }

  protected async resolveEditorModel(
    userId: string,
    conversationId?: string,
    overrideModelId?: string | null,
  ): Promise<ResolvedModel> {
    let modelId = overrideModelId;

    if (conversationId) {
      if (modelId) {
        // Persist selection so subsequent turns honor the chosen model
        await prisma.aiConversation.update({
          where: { id: conversationId },
          data: { modelId },
        }).catch(() => { /* non-fatal */ });
        this.resolvedModelCache.delete(`${userId}:${conversationId}`);
      } else {
        const conversation = await prisma.aiConversation.findUnique({
          where: { id: conversationId },
          select: { modelId: true },
        });
        modelId = conversation?.modelId;
      }
    }

    const cacheKey = `${userId}:${conversationId || 'default'}:${modelId || 'default'}`;
    const cached = this.resolvedModelCache.get(cacheKey);
    if (cached) return cached;

    const resolved = await resolveModel({ modelId, userId });
    this.resolvedModelCache.set(cacheKey, resolved);
    return resolved;
  }

  protected async runCompletion(
    request: object,
    context: { operation: string; conversationId?: string; userId?: string; modelId?: string | null },
    _signal?: AbortSignal
  ): Promise<{ completion: any; resolved: ResolvedModel }> {
    const cb = this.getCircuitBreaker(context.operation);
    if (cb.isOpen()) {
      throw new EditorAssistantError(
        'EDITOR_ASSISTANT_CIRCUIT_OPEN',
        `Circuit breaker OPEN for operation ${context.operation}`,
        'Service is temporarily unavailable. Please try again in a moment.',
        context
      );
    }

    try {
      const resolved = await this.resolveEditorModel(
        context.userId || 'system',
        context.conversationId,
        context.modelId,
      );
      const completion = await cb.execute(() =>
        this.retryHandler.retry(
          () => createChatCompletion(resolved, { ...request, stream: false } as any),
          {
            maxAttempts: 2,
            baseDelay: 500,
            retryable: (err: any) => {
              if (err instanceof CircuitBreakerError) return false;
              if (err?.name === 'AbortError') return false;
              return (
                err?.status === 429 ||
                err?.status >= 500 ||
                err?.code === 'ECONNRESET' ||
                err?.code === 'ETIMEDOUT'
              );
            },
          }
        )
      );
      return { completion, resolved };
    } catch (error) {
      const isCircuitOpen = error instanceof CircuitBreakerError;
      const classification = this.errorClassifier.classify(error as Error);

      if (!isCircuitOpen) {
        console.error('[BaseEditorAssistant] LLM call failed', {
          operation: context.operation,
          classification,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      throw new EditorAssistantError(
        'EDITOR_ASSISTANT_COMPLETION_FAILED',
        `LLM call failed for ${context.operation}: ${classification.type}`,
        toUserFacingError(error).message,
        { ...context, classification }
      );
    }
  }

  protected async openStream(
    request: object,
    context: { operation: string; conversationId?: string; userId?: string; modelId?: string | null },
    _signal?: AbortSignal
  ): Promise<{ stream: any; resolved: ResolvedModel }> {
    const cb = this.getCircuitBreaker(context.operation);
    if (cb.isOpen()) {
      throw new EditorAssistantError(
        'EDITOR_ASSISTANT_CIRCUIT_OPEN',
        `Circuit breaker OPEN for operation ${context.operation}`,
        'Service is temporarily unavailable. Please try again in a moment.',
        context
      );
    }

    try {
      const resolved = await this.resolveEditorModel(
        context.userId || 'system',
        context.conversationId,
        context.modelId,
      );
      const stream = await cb.execute(() =>
        this.retryHandler.retry(
          () => createChatCompletion(resolved, {
            ...request,
            stream: true,
            stream_options: { include_usage: true },
          } as any),
          {
            maxAttempts: 2,
            baseDelay: 500,
            retryable: (err: any) => {
              if (err instanceof CircuitBreakerError) return false;
              if (err?.name === 'AbortError') return false;
              return (
                err?.status === 429 ||
                err?.status >= 500 ||
                err?.code === 'ECONNRESET' ||
                err?.code === 'ETIMEDOUT'
              );
            },
          }
        )
      );
      return { stream, resolved };
    } catch (error) {
      const classification = this.errorClassifier.classify(error as Error);
      throw new EditorAssistantError(
        'EDITOR_ASSISTANT_STREAM_FAILED',
        `Stream failed for ${context.operation}: ${classification.type}`,
        toUserFacingError(error).message,
        { ...context, classification }
      );
    }
  }

  protected async streamResponse(
    stream: any,
    onToken: (text: string) => void,
    rawTextRef: { value: string },
    signal?: AbortSignal
  ): Promise<any> {
    let parseState: 'before' | 'in_value' | 'done' = 'before';
    let streamUsage: any = undefined;
    let responseValueBuf = '';
    let responseContentBuf = '';
    let inEscape = false;
    const RESPONSE_KEY = '"assistantText":';
    let keyMatchIdx = 0;

    for await (const chunk of stream) {
      if (signal?.aborted) break;
      if (chunk.usage) streamUsage = chunk.usage;
      const delta = chunk.choices?.[0]?.delta;
      const argsDelta: string = delta?.content ?? '';
      if (!argsDelta) continue;

      rawTextRef.value += argsDelta;
      if (parseState === 'done') continue;

      for (const ch of argsDelta) {
        if (parseState === 'before') {
          if (ch === RESPONSE_KEY[keyMatchIdx]) {
            keyMatchIdx++;
            if (keyMatchIdx === RESPONSE_KEY.length) {
              parseState = 'in_value';
              inEscape = false;
            }
          } else {
            keyMatchIdx = ch === RESPONSE_KEY[0] ? 1 : 0;
          }
          continue;
        }

        if (parseState === 'in_value') {
          if (responseValueBuf.length === 0 && (ch === '"' || ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t')) continue;
          if (inEscape) {
            let decoded = ch;
            if (ch === 'n') decoded = '\n';
            else if (ch === 't') decoded = '\t';
            else if (ch === 'r') decoded = '\r';
            onToken(decoded);
            responseContentBuf += decoded;
            responseValueBuf += ch;
            inEscape = false;
            continue;
          }
          if (ch === '\\') { inEscape = true; responseValueBuf += ch; continue; }
          if (ch === '"') { parseState = 'done'; continue; }
          onToken(ch);
          responseContentBuf += ch;
          responseValueBuf += ch;
        }
      }
    }
    return streamUsage;
  }

  abstract processMessage(input: EditorAssistantMessageInput): Promise<EditorAssistantResponse>;
}
