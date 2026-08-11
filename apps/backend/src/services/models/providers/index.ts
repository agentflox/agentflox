import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ResolvedModel, InvokeOptions, InvokeResult, UnifiedUsage } from '../types';
import {
  emptyUsage,
  estimateUsageFromText,
  fromAnthropicUsage,
  fromGoogleUsage,
  fromOpenAIUsage,
} from './normalize';
import { scrubError } from '../credentials';

function useDbProvider(): boolean {
  return process.env.MODELS_USE_DB_PROVIDER !== 'false';
}

function detectProviderFromModelId(apiModelId: string): ResolvedModel['provider'] {
  const id = apiModelId.toLowerCase();
  if (id.startsWith('claude')) return 'ANTHROPIC';
  if (id.startsWith('gemini') || id.startsWith('gemma')) return 'GOOGLE';
  return 'OPENAI';
}

function resolveProvider(model: ResolvedModel): ResolvedModel['provider'] {
  if (useDbProvider()) return model.provider;
  return detectProviderFromModelId(model.apiModelId);
}

function openaiClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
}

function stripInternalRequestFields(request: Record<string, unknown>): Record<string, unknown> {
  const {
    __resolvedModel: _rm,
    model: _model,
    ...rest
  } = request;
  return rest;
}

export async function generateText(
  model: ResolvedModel,
  messages: Array<{ role: string; content: any }>,
  options: InvokeOptions = {},
): Promise<InvokeResult> {
  const provider = resolveProvider(model);
  const apiKey = model.apiKey;
  if (!apiKey) throw scrubError(new Error(`Missing API key for ${model.displayName}`));

  try {
    if (provider === 'ANTHROPIC') {
      return await generateAnthropic(model, messages, options, apiKey);
    }
    if (provider === 'GOOGLE') {
      return await generateGoogle(model, messages, options, apiKey);
    }
    return await generateOpenAI(model, messages, options, apiKey);
  } catch (err) {
    throw scrubError(err);
  }
}

async function generateOpenAI(
  model: ResolvedModel,
  messages: Array<{ role: string; content: any }>,
  options: InvokeOptions,
  apiKey: string,
): Promise<InvokeResult> {
  const client = openaiClient(apiKey);
  const response = await client.chat.completions.create({
    model: model.apiModelId,
    messages: messages as any,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens,
    tools: options.tools as any,
    tool_choice: options.toolChoice as any,
    response_format: options.responseFormat as any,
  });

  const choice = response.choices?.[0];
  return {
    content: choice?.message?.content ?? null,
    raw: response,
    usage: fromOpenAIUsage(response.usage),
    toolCalls: choice?.message?.tool_calls,
    finishReason: choice?.finish_reason ?? null,
  };
}

function toAnthropicTools(tools: unknown[] | undefined): Anthropic.Messages.Tool[] | undefined {
  if (!tools?.length) return undefined;
  return tools.map((t: any) => {
    if (t?.type === 'function' && t.function) {
      return {
        name: t.function.name,
        description: t.function.description || '',
        input_schema: t.function.parameters || { type: 'object', properties: {} },
      };
    }
    if (t?.name && t?.input_schema) return t;
    return {
      name: t.name || 'tool',
      description: t.description || '',
      input_schema: t.parameters || t.input_schema || { type: 'object', properties: {} },
    };
  });
}

function toAnthropicMessages(messages: Array<{ role: string; content: any; tool_call_id?: string; id?: string; tool_calls?: any[] }>): {
  system?: string;
  messages: Anthropic.Messages.MessageParam[];
} {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
    .join('\n');

  const out: Anthropic.Messages.MessageParam[] = [];
  for (const m of messages) {
    if (m.role === 'system') continue;

    if (m.role === 'tool') {
      out.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: m.tool_call_id || m.id || 'tool',
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
          },
        ],
      });
      continue;
    }

    if (m.role === 'assistant' && Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
      const blocks: Anthropic.Messages.ContentBlockParam[] = [];
      if (m.content) {
        blocks.push({ type: 'text', text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) });
      }
      for (const tc of m.tool_calls) {
        let input: Record<string, unknown> = {};
        try {
          input = typeof tc.function?.arguments === 'string'
            ? JSON.parse(tc.function.arguments || '{}')
            : (tc.function?.arguments || {});
        } catch {
          input = {};
        }
        blocks.push({
          type: 'tool_use',
          id: tc.id || `tool_${tc.function?.name || 'call'}`,
          name: tc.function?.name || 'tool',
          input,
        });
      }
      out.push({ role: 'assistant', content: blocks });
      continue;
    }

    out.push({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content ?? ''),
    });
  }

  return { system: system || undefined, messages: out };
}

function anthropicToOpenAIShape(response: Anthropic.Messages.Message): any {
  const text = response.content
    ?.filter((c: any) => c.type === 'text')
    .map((c: any) => c.text)
    .join('') || null;

  const toolCalls = (response.content || [])
    .filter((c: any) => c.type === 'tool_use')
    .map((c: any) => ({
      id: c.id,
      type: 'function',
      function: {
        name: c.name,
        arguments: JSON.stringify(c.input ?? {}),
      },
    }));

  const message: any = { role: 'assistant', content: text };
  if (toolCalls.length > 0) message.tool_calls = toolCalls;

  return {
    choices: [
      {
        message,
        finish_reason: toolCalls.length > 0 ? 'tool_calls' : (response.stop_reason || 'stop'),
      },
    ],
    usage: {
      prompt_tokens: response.usage?.input_tokens ?? 0,
      completion_tokens: response.usage?.output_tokens ?? 0,
      total_tokens: (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0),
    },
  };
}

async function generateAnthropic(
  model: ResolvedModel,
  messages: Array<{ role: string; content: any }>,
  options: InvokeOptions,
  apiKey: string,
): Promise<InvokeResult> {
  const client = new Anthropic({ apiKey });
  const { system, messages: anthropicMessages } = toAnthropicMessages(messages);
  const tools = toAnthropicTools(options.tools as any);

  const response = await client.messages.create({
    model: model.apiModelId,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature ?? 0.7,
    system: system || undefined,
    messages: anthropicMessages,
    tools,
  });

  const shaped = anthropicToOpenAIShape(response);
  return {
    content: shaped.choices[0].message.content,
    raw: response,
    usage: fromAnthropicUsage(response.usage),
    toolCalls: shaped.choices[0].message.tool_calls,
    finishReason: shaped.choices[0].finish_reason,
  };
}

async function generateGoogle(
  model: ResolvedModel,
  messages: Array<{ role: string; content: any }>,
  options: InvokeOptions,
  apiKey: string,
): Promise<InvokeResult> {
  const genAI = new GoogleGenerativeAI(apiKey);

  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
    .join('\n');

  const history = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content ?? '') }],
    }));

  const tools = Array.isArray(options.tools) && options.tools.length > 0
    ? [{
        functionDeclarations: options.tools.map((t: any) => {
          const fn = t?.function || t;
          return {
            name: fn.name,
            description: fn.description || '',
            parameters: fn.parameters || { type: 'object', properties: {} },
          };
        }),
      }]
    : undefined;

  const gm = genAI.getGenerativeModel({
    model: model.apiModelId,
    systemInstruction: system || undefined,
    tools: tools as any,
  });

  const last = history[history.length - 1];
  const prior = history.slice(0, -1);
  const chat = gm.startChat({ history: prior as any });
  const result = await chat.sendMessage(last?.parts?.[0]?.text || '');
  const response = result.response;
  const text = response.text?.() ?? null;
  const functionCalls = (response as any).functionCalls?.() || [];
  const toolCalls = functionCalls.map((fc: any, i: number) => ({
    id: `google_tool_${i}`,
    type: 'function',
    function: {
      name: fc.name,
      arguments: JSON.stringify(fc.args ?? {}),
    },
  }));

  const usageMeta = (response as any).usageMetadata;
  const usage: UnifiedUsage = usageMeta
    ? fromGoogleUsage(usageMeta)
    : estimateUsageFromText(JSON.stringify(messages), text || '');

  return {
    content: text,
    raw: result,
    usage,
    toolCalls: toolCalls.length ? toolCalls : undefined,
    finishReason: toolCalls.length ? 'tool_calls' : null,
  };
}

/**
 * Provider-aware chat completion that returns an OpenAI-shaped response so
 * existing ReAct / tool loops keep working across OpenAI, Anthropic, and Google.
 * Streaming is supported for OpenAI; Anthropic/Google use non-stream + optional synthetic chunks.
 */
export async function createChatCompletion(
  model: ResolvedModel,
  request: Record<string, unknown>,
): Promise<any> {
  const apiKey = model.apiKey;
  if (!apiKey) throw scrubError(new Error(`Missing API key for ${model.displayName}`));

  const provider = resolveProvider(model);
  const cleaned = stripInternalRequestFields(request);
  const wantsStream = Boolean(cleaned.stream);

  try {
    if (provider === 'OPENAI') {
      const client = openaiClient(apiKey);
      return await client.chat.completions.create({
        ...cleaned,
        model: model.apiModelId,
      } as any);
    }

    if (provider === 'ANTHROPIC') {
      const client = new Anthropic({ apiKey });
      const messages = (cleaned.messages as any[]) || [];
      const { system, messages: anthropicMessages } = toAnthropicMessages(messages);
      const tools = toAnthropicTools(cleaned.tools as any);
      const response = await client.messages.create({
        model: model.apiModelId,
        max_tokens: (cleaned.max_tokens as number) || model.maxOutputTokens || 4096,
        temperature: (cleaned.temperature as number) ?? 0.7,
        system: system || undefined,
        messages: anthropicMessages,
        tools,
      });
      const shaped = anthropicToOpenAIShape(response);
      if (wantsStream) {
        return syntheticOpenAIStream(shaped);
      }
      return shaped;
    }

    // GOOGLE
    const result = await generateGoogle(
      model,
      (cleaned.messages as any[]) || [],
      {
        temperature: cleaned.temperature as number,
        maxTokens: cleaned.max_tokens as number,
        tools: cleaned.tools as any,
        toolChoice: cleaned.tool_choice,
      },
      apiKey,
    );
    const shaped = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: result.content,
            tool_calls: result.toolCalls,
          },
          finish_reason: result.finishReason || 'stop',
        },
      ],
      usage: {
        prompt_tokens: result.usage.inputTokens,
        completion_tokens: result.usage.outputTokens,
        total_tokens: result.usage.totalTokens,
      },
    };
    if (wantsStream) return syntheticOpenAIStream(shaped);
    return shaped;
  } catch (err) {
    throw scrubError(err);
  }
}

/** Async iterable mimicking OpenAI stream chunks from a final shaped completion. */
async function* syntheticOpenAIStream(shaped: any): AsyncGenerator<any> {
  const message = shaped.choices?.[0]?.message || {};
  const content: string = message.content || '';
  const toolCalls = message.tool_calls || [];

  if (content) {
    const chunkSize = 24;
    for (let i = 0; i < content.length; i += chunkSize) {
      yield {
        choices: [{ delta: { content: content.slice(i, i + chunkSize) } }],
      };
    }
  }

  if (toolCalls.length > 0) {
    for (let index = 0; index < toolCalls.length; index++) {
      const tc = toolCalls[index];
      yield {
        choices: [{
          delta: {
            tool_calls: [{
              index,
              id: tc.id,
              type: tc.type || 'function',
              function: { name: tc.function?.name || '', arguments: '' },
            }],
          },
        }],
      };
      yield {
        choices: [{
          delta: {
            tool_calls: [{
              index,
              function: { arguments: tc.function?.arguments || '{}' },
            }],
          },
        }],
      };
    }
  }

  if (shaped.usage) {
    yield { choices: [{ delta: {} }], usage: shaped.usage };
  }
}

/** @deprecated Prefer createChatCompletion — kept for call-site compatibility. */
export async function createOpenAICompletion(
  model: ResolvedModel,
  request: Record<string, unknown>,
): Promise<any> {
  return createChatCompletion(model, request);
}

export function extractUsageFromCompletion(completion: any, provider: ResolvedModel['provider']): UnifiedUsage {
  if (!completion) return emptyUsage(true);
  if (provider === 'ANTHROPIC') {
    if (completion.usage?.input_tokens != null) return fromAnthropicUsage(completion.usage);
    return fromOpenAIUsage(completion.usage);
  }
  if (provider === 'GOOGLE') {
    if (completion.usageMetadata) return fromGoogleUsage(completion.usageMetadata);
    return fromOpenAIUsage(completion.usage);
  }
  return fromOpenAIUsage(completion.usage);
}

export { useDbProvider, detectProviderFromModelId };
