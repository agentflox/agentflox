import { getDefaultModel } from '@/services/models/catalog';
import { convertModelName } from '@/services/models/legacy';
import type { NormalizedModelOption } from '@agentflox/types';

/**
 * @deprecated Prefer `resolveModel` / `getDefaultModel` from `@/services/models`.
 * Kept as a thin compatibility wrapper for existing call sites.
 */
export async function fetchModel() {
  const model = await getDefaultModel();
  return {
    ...model,
    name: convertModelName(model.name || model.slug || model.apiModelId) as NormalizedModelOption,
  };
}
