import { shouldDebitPlatformTokens } from '@/services/models/billing';
import { scrubError, maskSecret } from '@/services/models/credentials';
import { fromOpenAIUsage, fromAnthropicUsage, fromGoogleUsage } from '@/services/models/providers/normalize';
import { assertModelEntitled, isModelVisibleForPlan } from '@/services/models/entitlements';
import {
  ModelEntitlementError,
  ModelNotFoundError,
  ModelUnauthorizedError,
} from '@/services/models/types';
import type { ResolvedModel } from '@/services/models/types';

describe('models.billing', () => {
  it('debits platform tokens for system models', () => {
    const resolved = { isCustom: false } as ResolvedModel;
    expect(shouldDebitPlatformTokens(resolved)).toBe(true);
  });

  it('skips platform debit for custom models', () => {
    const resolved = { isCustom: true } as ResolvedModel;
    expect(shouldDebitPlatformTokens(resolved)).toBe(false);
  });
});

describe('models.credentials.scrubError', () => {
  it('redacts api keys from messages', () => {
    const err = scrubError(new Error('failed sk-abc123XYZ999 and Bearer tok_secret_value'));
    expect(err.message).not.toContain('sk-abc');
    expect(err.message).toContain('[REDACTED]');
  });

  it('masks secrets', () => {
    expect(maskSecret('sk-abcdefghijklmnop')).toMatch(/…/);
  });
});

describe('models.providers.normalize', () => {
  it('maps OpenAI usage', () => {
    const u = fromOpenAIUsage({ prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 });
    expect(u).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      cachedTokens: undefined,
      usageEstimated: false,
    });
  });

  it('maps Anthropic usage', () => {
    const u = fromAnthropicUsage({ input_tokens: 3, output_tokens: 7 });
    expect(u.inputTokens).toBe(3);
    expect(u.outputTokens).toBe(7);
    expect(u.totalTokens).toBe(10);
  });

  it('maps Google usage', () => {
    const u = fromGoogleUsage({ promptTokenCount: 2, candidatesTokenCount: 4, totalTokenCount: 6 });
    expect(u.totalTokens).toBe(6);
  });
});

describe('models.entitlements', () => {
  const base = {
    isCustom: false,
    slug: 'claude-opus-4-6',
    displayName: 'Claude Opus 4.6',
  } as ResolvedModel;

  it('allows custom models on free plan', () => {
    expect(() =>
      assertModelEntitled({ ...base, isCustom: true, slug: 'my-opus' } as ResolvedModel, 'FREE'),
    ).not.toThrow();
  });

  it('blocks HIGH tier system models on FREE plan', () => {
    expect(() =>
      assertModelEntitled({ ...base, creditTier: 'HIGH' } as any, 'FREE'),
    ).toThrow(ModelEntitlementError);
  });

  it('allows HIGH tier on paid plans', () => {
    expect(() =>
      assertModelEntitled({ ...base, creditTier: 'HIGH' } as any, 'PROFESSIONAL'),
    ).not.toThrow();
  });

  it('allows LOW tier on FREE plan', () => {
    expect(() =>
      assertModelEntitled(
        { ...base, slug: 'gpt-4o-mini', displayName: 'GPT 4o mini', creditTier: 'LOW' } as any,
        'FREE',
      ),
    ).not.toThrow();
  });

  it('isModelVisibleForPlan hides HIGH on free', () => {
    expect(isModelVisibleForPlan('claude-opus-4-6', 'HIGH', 'FREE')).toBe(false);
    expect(isModelVisibleForPlan('gpt-4o-mini', 'LOW', 'FREE')).toBe(true);
    expect(isModelVisibleForPlan('claude-opus-4-6', 'HIGH', 'ENTERPRISE')).toBe(true);
  });
});

describe('models.errors', () => {
  it('exposes stable error codes', () => {
    expect(new ModelNotFoundError('x').code).toBe('MODEL_NOT_FOUND');
    expect(new ModelUnauthorizedError('x').code).toBe('MODEL_UNAUTHORIZED');
    expect(new ModelEntitlementError('denied', 'slug').code).toBe('MODEL_ENTITLEMENT');
  });
});
