/** Filter categories for the integrations grid — kept separate from constants to avoid pulling unused catalog data. */
export const INTEGRATION_CATEGORIES = [
  { id: 'all', label: 'All Apps' },
  { id: 'communication', label: 'Communication' },
  { id: 'development', label: 'Development' },
  { id: 'design', label: 'Design' },
  { id: 'storage', label: 'Storage' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'email', label: 'Email' },
  { id: 'marketing', label: 'Marketing' },
] as const;
