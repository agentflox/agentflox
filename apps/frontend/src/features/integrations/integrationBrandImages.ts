/** Brand logos under /public/images/apps — keyed by UI provider and catalog provider id. */
export const INTEGRATION_BRAND_IMAGES: Record<string, string> = {
  github: '/images/apps/github_logo_icon_229278.webp',
  slack: '/images/apps/slack-logo.png',
  gmail: '/images/apps/Gmail_Logo_512px.webp',
  google_mail: '/images/apps/Gmail_Logo_512px.webp',
  google_calendar: '/images/apps/Google_Calendar_Logo_512px.png',
  google_drive: '/images/apps/Google_Drive_Logo_512px.webp',
  figma: '/images/apps/figma-icon.webp',
  codegen: '/images/apps/codegen-logo.png',
  discord: '/images/apps/discord-icon.webp',
  microsoft_teams: '/images/apps/Microsoft_Office_Teams_(2019–2025).svg.webp',
  facebook: '/images/apps/facebook-icon.webp',
  youtube: '/images/apps/youtube-logo.png',
  notion: '/images/apps/Notion_app_logo.png',
  google_docs: '/images/apps/Google_Docs_Logo_512px.webp',
  google_sheets: '/images/apps/Google_Sheets_Logo_512px.png',
};

export function getIntegrationBrandImage(providerId: string): string | undefined {
  return INTEGRATION_BRAND_IMAGES[providerId];
}
