import type { ResolvedModel } from './types';
import { ModelEntitlementError } from './types';

/** Free/trial plans may still use these HIGH-tier exceptions if needed. */
const FREE_HIGH_ALLOWLIST = new Set([
  'gpt-4o-mini',
  'pick-cost-optimized',
]);

/**
 * Plan-gate for system models. Free/trial plans cannot use HIGH-tier models
 * (unless allowlisted). Custom (BYOK) models are never tier-gated.
 */
export function assertModelEntitled(
  resolved: ResolvedModel,
  planType?: string | null,
): void {
  if (resolved.isCustom) return;

  const plan = (planType || 'FREE').toUpperCase();
  if (plan === 'FREE' || plan === 'TRIAL') {
    const tier = ((resolved as any).creditTier || '').toUpperCase();
    if (tier === 'HIGH' && !FREE_HIGH_ALLOWLIST.has(resolved.slug)) {
      throw new ModelEntitlementError(
        `Model "${resolved.displayName}" requires a paid plan.`,
        resolved.slug,
      );
    }
  }
}

export function isModelVisibleForPlan(
  slug: string,
  creditTier: string | null | undefined,
  planType?: string | null,
): boolean {
  const plan = (planType || 'FREE').toUpperCase();
  if (plan !== 'FREE' && plan !== 'TRIAL') return true;
  const tier = (creditTier || '').toUpperCase();
  if (tier === 'HIGH' && !FREE_HIGH_ALLOWLIST.has(slug)) return false;
  return true;
}
