/** Map canonical catalog provider ids to UI provider keys in AVAILABLE_INTEGRATIONS. */
export const CATALOG_TO_UI_PROVIDER: Record<string, string> = {
  github: 'github',
  slack: 'slack',
  google_mail: 'gmail',
  google_calendar: 'google_calendar',
  google_drive: 'google_drive',
  webhook: 'http_webhook',
  schedule: 'schedule',
};

export const UI_TO_CATALOG_PROVIDER: Record<string, string> = Object.fromEntries(
  Object.entries(CATALOG_TO_UI_PROVIDER).map(([catalog, ui]) => [ui, catalog]),
);

export const INTEGRATIONS_V2_ENABLED =
  process.env.NEXT_PUBLIC_INTEGRATIONS_V2 !== 'false';
