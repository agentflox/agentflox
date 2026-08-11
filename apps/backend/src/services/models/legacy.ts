import { modelMapping, type NormalizedModelOption, type ModelOption } from '@agentflox/types';

/** Bridge old ModelName / normalized enum strings to API model ids. */
export function convertModelName(name: string | null | undefined): ModelOption | string {
  if (!name) return 'gpt-4o-mini';
  const key = name as NormalizedModelOption;
  if (key in modelMapping) return modelMapping[key];
  // already hyphenated API id
  if (name.includes('-') || name.includes('.')) return name;
  return name.replace(/_/g, '-');
}

export function legacyEnumToSlug(name: string): string {
  return convertModelName(name).toString().toLowerCase();
}
