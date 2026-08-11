import type { ResolvedModel } from './types';

/** Platform models debit subscription tokens; custom/BYOK do not. */
export function shouldDebitPlatformTokens(resolved: ResolvedModel): boolean {
  return !resolved.isCustom;
}
