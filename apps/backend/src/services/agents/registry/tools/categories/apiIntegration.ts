import { ToolDefinition } from '../core/ToolRegistryManager';

/**
 * API Integration tools
 *
 * These tools expose first-class HTTP / Webhook / LLM integrations
 * to the agent and workforce builder layer.
 */
export const API_INTEGRATION_TOOLS: ToolDefinition[] = [
  {
    name: 'httpRequest',
    description: 'Perform an HTTP request against an external API with configurable method, headers, query, and body.',
    category: 'API_INTEGRATION',
    isDefault: true,
    functionSchema: {
      name: 'httpRequest',
      description: 'Perform an HTTP request to an arbitrary URL.',
      parameters: {
        type: 'object',
        properties: {
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
            description: 'HTTP method to use for the request.',
          },
          url: {
            type: 'string',
            description: 'Absolute URL to call, including protocol (https://...).',
          },
          headers: {
            type: 'object',
            description: 'Optional HTTP headers as a key/value map.',
            additionalProperties: { type: 'string' },
          },
          query: {
            type: 'object',
            description: 'Optional query parameters to append to the URL.',
            additionalProperties: { type: 'string' },
          },
          body: {
            type: ['string', 'object', 'array', 'null'],
            description: 'Optional request body. If an object/array is provided and Content-Type is application/json, it will be JSON-encoded.',
          },
          timeoutSeconds: {
            type: 'number',
            description: 'Request timeout in seconds (default: 30).',
          },
          followRedirects: {
            type: 'boolean',
            description: 'Whether to follow HTTP redirects (default: true).',
          },
          failOnStatus400Plus: {
            type: 'boolean',
            description: 'If true, treat 4xx/5xx responses as errors; otherwise return them as successful results.',
          },
        },
        required: ['method', 'url'],
      },
    },
    deterministic: true,
    requiresAuth: false,
    timeout: 60,
    rateLimit: 60,
    examples: [],
  },
  {
    name: 'webhookSend',
    description: 'Send a JSON payload to a configured webhook URL.',
    category: 'API_INTEGRATION',
    isDefault: true,
    functionSchema: {
      name: 'webhookSend',
      description: 'Send a JSON payload to a webhook.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'Webhook URL to send the payload to.',
          },
          payload: {
            type: 'object',
            description: 'Arbitrary JSON payload to send.',
          },
          headers: {
            type: 'object',
            description: 'Optional HTTP headers as a key/value map.',
            additionalProperties: { type: 'string' },
          },
        },
        required: ['url', 'payload'],
      },
    },
    deterministic: true,
    requiresAuth: false,
    timeout: 30,
    rateLimit: 120,
    examples: [],
  },
  {
    name: 'openaiChat',
    description: 'Call OpenAI chat completion API with a simple system + user prompt.',
    category: 'API_INTEGRATION',
    isDefault: true,
    functionSchema: {
      name: 'openaiChat',
      description: 'Generate a chat completion using OpenAI.',
      parameters: {
        type: 'object',
        properties: {
          model: {
            type: 'string',
            description: 'OpenAI chat model ID (e.g., gpt-4o-mini).',
          },
          systemPrompt: {
            type: 'string',
            description: 'System prompt or instructions for the model.',
          },
          userMessage: {
            type: 'string',
            description: 'User message / query.',
          },
          temperature: {
            type: 'number',
            description: 'Sampling temperature between 0 and 2 (default: 0.7).',
          },
          maxTokens: {
            type: 'number',
            description: 'Maximum number of tokens to generate (default: 512).',
          },
        },
        required: ['userMessage'],
      },
    },
    deterministic: false,
    requiresAuth: true,
    timeout: 60,
    rateLimit: 60,
    examples: [],
  },
  {
    name: 'openaiEmbedding',
    description: 'Generate an embedding vector for a piece of text using OpenAI.',
    category: 'API_INTEGRATION',
    isDefault: true,
    functionSchema: {
      name: 'openaiEmbedding',
      description: 'Create an embedding for text using OpenAI.',
      parameters: {
        type: 'object',
        properties: {
          model: {
            type: 'string',
            description: 'Embedding model ID (default: text-embedding-3-small).',
          },
          text: {
            type: 'string',
            description: 'Input text to embed.',
          },
        },
        required: ['text'],
      },
    },
    deterministic: true,
    requiresAuth: true,
    timeout: 60,
    rateLimit: 120,
    examples: [],
  },
  {
    name: 'openaiModeration',
    description: 'Run OpenAI moderation on a piece of text.',
    category: 'API_INTEGRATION',
    isDefault: true,
    functionSchema: {
      name: 'openaiModeration',
      description: 'Classify text content using OpenAI moderation models.',
      parameters: {
        type: 'object',
        properties: {
          model: {
            type: 'string',
            description: 'Moderation model ID (default: omni-moderation-latest).',
          },
          input: {
            type: 'string',
            description: 'Text content to moderate.',
          },
        },
        required: ['input'],
      },
    },
    deterministic: true,
    requiresAuth: true,
    timeout: 30,
    rateLimit: 120,
    examples: [],
  },
  {
    name: 'openaiImage',
    description: 'Generate an image using OpenAI image generation models.',
    category: 'API_INTEGRATION',
    isDefault: false,
    functionSchema: {
      name: 'openaiImage',
      description: 'Generate an image using OpenAI.',
      parameters: {
        type: 'object',
        properties: {
          model: {
            type: 'string',
            description: 'Image model ID (e.g., gpt-image-1).',
          },
          prompt: {
            type: 'string',
            description: 'Text description of the desired image.',
          },
          size: {
            type: 'string',
            description: 'Image size (e.g., 1024x1024).',
          },
          quality: {
            type: 'string',
            description: 'Image quality (e.g., standard, high).',
          },
        },
        required: ['prompt'],
      },
    },
    deterministic: false,
    requiresAuth: true,
    timeout: 90,
    rateLimit: 30,
    examples: [],
  },
  {
    name: 'anthropicChat',
    description: 'Call Anthropic Claude models with a simple system + user prompt.',
    category: 'API_INTEGRATION',
    isDefault: true,
    functionSchema: {
      name: 'anthropicChat',
      description: 'Generate a chat completion using Anthropic Claude.',
      parameters: {
        type: 'object',
        properties: {
          model: {
            type: 'string',
            description: 'Anthropic model ID (e.g., claude-3-5-sonnet-20240620).',
          },
          systemPrompt: {
            type: 'string',
            description: 'System prompt or instructions for the model.',
          },
          userMessage: {
            type: 'string',
            description: 'User message / query.',
          },
          temperature: {
            type: 'number',
            description: 'Sampling temperature between 0 and 1 (default: 0.7).',
          },
          maxTokens: {
            type: 'number',
            description: 'Maximum number of tokens to generate (default: 1024).',
          },
        },
        required: ['userMessage'],
      },
    },
    deterministic: false,
    requiresAuth: true,
    timeout: 60,
    rateLimit: 60,
    examples: [],
  },
];

