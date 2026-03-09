/**
 * AI text service – calls backend v1/ai/text for writing assistance
 * (improve, expand, summarize, fix spelling, etc.). Uses token limits and usage tracking on backend.
 */

import { sendBackendRequest } from '@/utils/backend-request';

export const AI_TEXT_OPERATIONS = [
  { key: 'enhance', label: 'Improve writing' },
  { key: 'fixSpelling', label: 'Fix spelling and grammar' },
  { key: 'expand', label: 'Make longer' },
  { key: 'makeShorter', label: 'Make shorter' },
  { key: 'simplify', label: 'Simplify writing' },
  { key: 'summarize', label: 'Summarize' },
  { key: 'professional', label: 'Make professional' },
  { key: 'casual', label: 'Make casual' },
  { key: 'actionItems', label: 'Generate action items' },
] as const;

/** Operations shown in the "Write with AI" slash modal only */
export const WRITE_WITH_AI_OPERATIONS = [
  { key: 'writeDescription', label: 'Write a description' },
  { key: 'createPlan', label: 'Create a plan' },
  { key: 'actionItems', label: 'Generate action items' },
] as const;

export type AiTextOperationKey = (typeof AI_TEXT_OPERATIONS)[number]['key'];

export interface AiTextResult {
  result: string;
}

export interface AiTextTokenError {
  error: 'Insufficient tokens';
  remaining: number;
  required: number;
}

export type AiTextResponse = AiTextResult | AiTextTokenError;

export type AiTextContextEntity = { type: 'list' | 'project' | 'space'; id: string };

export type CreativityLevel = 'low' | 'medium' | 'high';

export const TONE_OPTIONS = [
  { value: 'default', label: 'Default Tone' },
  { value: 'professional', label: 'Professional Tone' },
  { value: 'straightforward', label: 'Straightforward Tone' },
  { value: 'inspirational', label: 'Inspirational Tone' },
  { value: 'optimistic', label: 'Optimistic Tone' },
  { value: 'casual', label: 'Casual Tone' },
  { value: 'confident', label: 'Confident Tone' },
  { value: 'friendly', label: 'Friendly Tone' },
  { value: 'humorous', label: 'Humorous Tone' },
] as const;

export const CREATIVITY_OPTIONS: { value: CreativityLevel; label: string }[] = [
  { value: 'low', label: 'Low Creativity' },
  { value: 'medium', label: 'Medium Creativity' },
  { value: 'high', label: 'High Creativity' },
];

export interface ImproveTextOptions {
  operation?: AiTextOperationKey | string;
  userInstruction?: string;
  tone?: string;
  creativity?: CreativityLevel;
  contextIds?: AiTextContextEntity[];
}

export async function improveText(
  text: string,
  operationOrOptions: AiTextOperationKey | string | ImproveTextOptions = 'enhance'
): Promise<AiTextResponse> {
  const options: ImproveTextOptions =
    typeof operationOrOptions === 'string'
      ? { operation: operationOrOptions }
      : operationOrOptions;
  const { operation = 'enhance', userInstruction, tone, creativity, contextIds } = options;

  const response = await sendBackendRequest('/v1/ai/text', {
    method: 'POST',
    body: JSON.stringify({
      text,
      operation,
      ...(userInstruction && { userInstruction }),
      ...(tone && { tone }),
      ...(creativity && { creativity }),
      ...(contextIds && contextIds.length > 0 && { contextIds }),
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 403 && data.error === 'Insufficient tokens') {
      return {
        error: 'Insufficient tokens',
        remaining: data.remaining ?? 0,
        required: data.required ?? 0,
      };
    }
    throw new Error(data.error || data.message || 'AI text request failed');
  }

  return data as AiTextResponse;
}
