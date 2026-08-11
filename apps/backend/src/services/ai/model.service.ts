import { Injectable } from '@nestjs/common';
import { prisma } from '@/lib/prisma';
import {
  createChatCompletion,
  generateText,
  getModelBySlug,
  recordUsage,
  resolveModel,
  fromOpenAIUsage,
  type ResolvedModel,
  type RecordUsageContext,
} from '@/services/models';
import { getPlatformApiKey } from '@/services/models/credentials';
import type { AiGenerationResult, AiImageGenerationResult, MultimodalMessage } from './types';
import {
  SYSTEM_MODEL_CATALOG,
  SYSTEM_MODELS,
  findSystemModel,
  getModelsByProvider,
  type ModelRef,
  type SystemModelConfig,
} from './modelCatalog';
import { OpenAIProvider } from './providers/openai.provider';

export {
  SYSTEM_MODEL_CATALOG,
  SYSTEM_MODELS,
  findSystemModel,
  getModelsByProvider,
};
export type { ModelRef, SystemModelConfig };

export interface ModelServiceOptions {
  temperature?: number;
  maxTokens?: number;
  /** Shared Manager / OpenAI response_format */
  responseFormat?: unknown;
  /** Legacy alias used by some callers */
  response_format?: unknown;
  tools?: unknown[];
  toolChoice?: unknown;
  /** Required for correct usage ledger; defaults to 'system' (skipped by recordUsage) */
  userId?: string;
  userName?: string;
  email?: string;
  usageContext?: RecordUsageContext;
  skipEntitlement?: boolean;
  stream?: boolean;
}

/**
 * Legacy-compatible AI facade now backed by Shared Model Manager:
 * resolve (catalog/DB) → provider invoke → recordUsage (system debit / custom ledger).
 */
@Injectable()
export class ModelService {
  private readonly imageProvider = new OpenAIProvider();

  /** Expose catalog for UI / diagnostics. */
  listCatalogModels(provider?: SystemModelConfig['provider']): SystemModelConfig[] {
    return provider ? getModelsByProvider(provider) : [...SYSTEM_MODEL_CATALOG];
  }

  async resolveRef(
    model: ModelRef,
    userId: string,
    opts?: { skipEntitlement?: boolean },
  ): Promise<ResolvedModel> {
    const cfg = findSystemModel(model);
    const slug = cfg?.slug ?? (typeof model === 'string' ? model : model.slug);
    const apiModelId = cfg?.apiModelId ?? (typeof model === 'string' ? model : model.apiModelId);

    let row =
      (slug ? await getModelBySlug(slug, true) : null) ||
      (apiModelId
        ? await prisma.aiModel.findFirst({
            where: { apiModelId, isSystem: true, isActive: true },
          })
        : null);

    if (row) {
      return resolveModel({
        modelId: row.id,
        userId,
        skipEntitlement: opts?.skipEntitlement ?? true,
      });
    }

    // Seed missing: synthesize ResolvedModel from catalog + platform key so callers keep working
    const provider = (cfg?.provider || this.detectProvider(apiModelId || slug)) as ResolvedModel['provider'];
    const apiKey = getPlatformApiKey(provider);
    if (!apiKey) {
      throw new Error(`Platform API key not configured for provider ${provider}`);
    }
    return {
      id: `legacy:${apiModelId || slug}`,
      slug: slug || apiModelId || 'unknown',
      displayName: cfg?.displayName || apiModelId || slug,
      provider,
      apiModelId: apiModelId || slug,
      isSystem: true,
      isCustom: false,
      isDefault: Boolean(cfg?.isDefault),
      contextWindow: cfg?.contextWindow,
      maxOutputTokens: cfg?.maxOutputTokens,
      apiKey,
    };
  }

  private detectProvider(modelId: string): ResolvedModel['provider'] {
    const id = (modelId || '').toLowerCase();
    if (id.startsWith('claude')) return 'ANTHROPIC';
    if (id.startsWith('gemini') || id.startsWith('gemma')) return 'GOOGLE';
    return 'OPENAI';
  }

  /**
   * @param model Catalog entry (`SYSTEM_MODELS.GPT_4O`) or slug/apiModelId string
   */
  async generateText(
    model: ModelRef,
    prompt: MultimodalMessage[],
    options: ModelServiceOptions = {},
  ): Promise<AiGenerationResult> {
    const userId = options.userId || 'system';
    const resolved = await this.resolveRef(model, userId, {
      skipEntitlement: options.skipEntitlement ?? true,
    });

    const responseFormat = options.responseFormat ?? options.response_format;
    const started = Date.now();
    try {
      const result = await generateText(resolved, prompt as any, {
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        tools: options.tools,
        toolChoice: options.toolChoice,
        responseFormat,
        stream: false,
      });

      await recordUsage({
        resolved,
        usage: result.usage,
        userId,
        userName: options.userName,
        email: options.email,
        context: {
          ...options.usageContext,
          action: options.usageContext?.action || 'GENERATE',
          requestDurationMs: Date.now() - started,
          success: true,
          metadata: {
            ...(options.usageContext?.metadata || {}),
            source: (options.usageContext?.metadata as any)?.source || 'ModelService.generateText',
            slug: resolved.slug,
          },
        },
      });

      return {
        content: result.content || '',
        usage: {
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          totalTokens: result.usage.totalTokens,
        },
      };
    } catch (err) {
      await recordUsage({
        resolved,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, usageEstimated: true },
        userId,
        userName: options.userName,
        email: options.email,
        context: {
          ...options.usageContext,
          action: options.usageContext?.action || 'GENERATE',
          requestDurationMs: Date.now() - started,
          success: false,
          errorMessage: err instanceof Error ? err.message : String(err),
          metadata: {
            ...(options.usageContext?.metadata || {}),
            source: 'ModelService.generateText',
          },
        },
      });
      throw err;
    }
  }

  async streamText(
    model: ModelRef,
    prompt: MultimodalMessage[],
    options: ModelServiceOptions = {},
  ): Promise<ReadableStream> {
    const userId = options.userId || 'system';
    const resolved = await this.resolveRef(model, userId, {
      skipEntitlement: options.skipEntitlement ?? true,
    });

    const responseFormat = options.responseFormat ?? options.response_format;
    const started = Date.now();
    const stream = await createChatCompletion(resolved, {
      messages: prompt,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      response_format: responseFormat,
      stream: true,
      stream_options: { include_usage: true },
    });

    const textEncoder = new TextEncoder();
    let fullText = '';
    let streamUsage: any;

    return new ReadableStream({
      start: async (controller) => {
        try {
          for await (const chunk of stream as any) {
            if (chunk.usage) streamUsage = chunk.usage;
            const content = chunk.choices?.[0]?.delta?.content || '';
            if (content) {
              fullText += content;
              controller.enqueue(textEncoder.encode(content));
            }
          }
          await recordUsage({
            resolved,
            usage: streamUsage
              ? fromOpenAIUsage(streamUsage)
              : {
                  inputTokens: 0,
                  outputTokens: Math.ceil(fullText.length / 4),
                  totalTokens: Math.ceil(fullText.length / 4),
                  usageEstimated: true,
                },
            userId,
            userName: options.userName,
            email: options.email,
            context: {
              ...options.usageContext,
              action: options.usageContext?.action || 'GENERATE',
              requestDurationMs: Date.now() - started,
              success: true,
              metadata: {
                ...(options.usageContext?.metadata || {}),
                source: 'ModelService.streamText',
                slug: resolved.slug,
              },
            },
          });
          controller.close();
        } catch (err) {
          await recordUsage({
            resolved,
            usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, usageEstimated: true },
            userId,
            context: {
              ...options.usageContext,
              success: false,
              errorMessage: err instanceof Error ? err.message : String(err),
              metadata: { source: 'ModelService.streamText' },
            },
          }).catch(() => {});
          controller.error(err);
        }
      },
    });
  }

  async generateImage(
    model: ModelRef,
    prompt: string,
    options: any = {},
  ): Promise<AiImageGenerationResult> {
    const cfg = findSystemModel(model);
    const apiModelId =
      cfg?.apiModelId ||
      (typeof model === 'string' ? model : model.apiModelId) ||
      'dall-e-3';
    // Images remain OpenAI-platform for now (not in Shared chat providers)
    return this.imageProvider.generateImage!(prompt, { ...options, model: apiModelId });
  }
}
