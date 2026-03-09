import { initializeOpenAI } from '@/lib/openai';
import { ModelService } from '@/services/ai/model.service';

const modelService = new ModelService();

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export async function executeApiIntegrationTool(
  toolName: string,
  params: any,
  _userId: string,
  _workspaceId?: string,
): Promise<any> {
  switch (toolName) {
    case 'httpRequest':
      return executeHttpRequest(params);
    case 'webhookSend':
      return executeWebhookSend(params);
    case 'openaiChat':
      return executeOpenAIChat(params);
    case 'openaiEmbedding':
      return executeOpenAIEmbedding(params);
    case 'openaiModeration':
      return executeOpenAIModeration(params);
    case 'openaiImage':
      return executeOpenAIImage(params);
    case 'anthropicChat':
      return executeAnthropicChat(params);
    default:
      throw new Error(`Unknown API integration tool: ${toolName}`);
  }
}

async function executeHttpRequest(params: any) {
  const {
    method,
    url,
    headers = {},
    query = {},
    body,
    timeoutSeconds = 30,
    followRedirects = true,
    failOnStatus400Plus = false,
  }: {
    method: HttpMethod;
    url: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
    body?: any;
    timeoutSeconds?: number;
    followRedirects?: boolean;
    failOnStatus400Plus?: boolean;
  } = params;

  if (!method || !url) {
    throw new Error('httpRequest: method and url are required');
  }

  const urlObj = new URL(url);
  for (const [key, value] of Object.entries(query || {})) {
    urlObj.searchParams.append(key, value);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

  let finalBody: any = undefined;
  const normalizedHeaders: Record<string, string> = { ...(headers || {}) };

  const contentTypeHeaderKey =
    Object.keys(normalizedHeaders).find((k) => k.toLowerCase() === 'content-type') ?? 'content-type';

  if (body !== undefined && body !== null) {
    if (typeof body === 'string') {
      finalBody = body;
    } else {
      // Default to JSON encoding
      normalizedHeaders[contentTypeHeaderKey] = normalizedHeaders[contentTypeHeaderKey] || 'application/json';
      if (normalizedHeaders[contentTypeHeaderKey].includes('application/json')) {
        finalBody = JSON.stringify(body);
      } else {
        finalBody = body;
      }
    }
  }

  try {
    const response = await fetch(urlObj.toString(), {
      method,
      headers: normalizedHeaders,
      body: ['GET', 'HEAD'].includes(method) ? undefined : finalBody,
      redirect: followRedirects ? 'follow' : 'manual',
      signal: controller.signal,
    } as RequestInit);

    const text = await response.text();
    let parsedBody: any = text;
    const responseContentType = response.headers.get('content-type') ?? '';
    if (responseContentType.includes('application/json')) {
      try {
        parsedBody = JSON.parse(text);
      } catch {
        // Keep as raw text if JSON parse fails
      }
    }

    if (failOnStatus400Plus && response.status >= 400) {
      throw new Error(
        `HTTP ${response.status} ${response.statusText || ''}`.trim() +
        (text ? ` - Body: ${text.slice(0, 2000)}` : ''),
      );
    }

    const headersObject: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headersObject[key] = value;
    });

    return {
      status: response.status,
      statusText: response.statusText,
      headers: headersObject,
      body: parsedBody,
      url: response.url,
    };
  } catch (error) {
    if ((error as any).name === 'AbortError') {
      throw new Error(`httpRequest: request timed out after ${timeoutSeconds}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function executeWebhookSend(params: any) {
  const { url, payload, headers = {} } = params as {
    url: string;
    payload: Record<string, any>;
    headers?: Record<string, string>;
  };

  if (!url) {
    throw new Error('webhookSend: url is required');
  }

  const baseHeaders: Record<string, string> = {
    'content-type': 'application/json',
    ...headers,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify(payload ?? {}),
  } as RequestInit);

  const text = await response.text();
  return {
    status: response.status,
    statusText: response.statusText,
    body: text,
  };
}

async function executeOpenAIChat(params: any) {
  const {
    model = 'gpt-4o-mini',
    systemPrompt,
    userMessage,
    temperature = 0.7,
    maxTokens = 512,
  } = params as {
    model?: string;
    systemPrompt?: string;
    userMessage: string;
    temperature?: number;
    maxTokens?: number;
  };

  if (!userMessage) {
    throw new Error('openaiChat: userMessage is required');
  }

  const openai = initializeOpenAI();

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: userMessage });

  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  const choice = completion.choices[0];
  return {
    model: completion.model,
    id: completion.id,
    created: completion.created,
    usage: completion.usage,
    message: choice.message,
  };
}

async function executeOpenAIEmbedding(params: any) {
  const { model = 'text-embedding-3-small', text } = params as {
    model?: string;
    text: string;
  };

  if (!text) {
    throw new Error('openaiEmbedding: text is required');
  }

  const openai = initializeOpenAI();
  const result = await openai.embeddings.create({
    model,
    input: text,
  });

  const embedding = result.data[0]?.embedding;
  return {
    model: result.model,
    embedding,
    dimensions: embedding?.length ?? 0,
    usage: result.usage,
  };
}

async function executeOpenAIModeration(params: any) {
  const { model = 'omni-moderation-latest', input } = params as {
    model?: string;
    input: string;
  };

  if (!input) {
    throw new Error('openaiModeration: input is required');
  }

  const openai = initializeOpenAI();
  const result = await openai.moderations.create({
    model,
    input,
  });

  return result;
}

async function executeOpenAIImage(params: any) {
  const {
    model = 'gpt-image-1',
    prompt,
    size = '1024x1024',
    quality = 'standard',
  } = params as {
    model?: string;
    prompt: string;
    size?: string;
    quality?: string;
  };

  if (!prompt) {
    throw new Error('openaiImage: prompt is required');
  }

  const openai = initializeOpenAI();
  const result = await openai.images.generate({
    model,
    prompt,
    size,
    quality: quality as any,
  });

  return result;
}

async function executeAnthropicChat(params: any) {
  const {
    model = 'claude-3-5-sonnet-20240620',
    systemPrompt,
    userMessage,
    temperature = 0.7,
    maxTokens = 1024,
  } = params as {
    model?: string;
    systemPrompt?: string;
    userMessage: string;
    temperature?: number;
    maxTokens?: number;
  };

  if (!userMessage) {
    throw new Error('anthropicChat: userMessage is required');
  }

  const messages: import('@/services/ai/types').MultimodalMessage[] = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: userMessage });

  const result = await modelService.generateText(model, messages, {
    maxTokens,
    temperature,
  });

  return result;
}

