'use client';

import { UI_TO_CATALOG_PROVIDER } from '../catalogMapping';

const POPUP_CALLBACK_PATH = '/auth/oauth-popup-complete';
const OAUTH_MESSAGE_TYPE = 'agentflox:oauth-popup';

export type OAuthPopupResult =
  | { ok: true }
  | { ok: false; error: string };

function popupFeatures(width = 520, height = 720): string {
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
  return [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'scrollbars=yes',
    'resizable=yes',
    'status=no',
    'toolbar=no',
    'menubar=no',
  ].join(',');
}

/**
 * Open the custom integration OAuth flow in a popup (not NextAuth signIn).
 * Tokens are stored on IntegrationConnection, separate from login accounts.
 */
export async function connectOAuthInPopup(provider: string): Promise<OAuthPopupResult> {
  const startUrl = `/api/integrations/oauth/start?provider=${encodeURIComponent(provider)}`;
  const popup = window.open(startUrl, 'agentflox_oauth', popupFeatures());
  if (!popup) {
    return {
      ok: false,
      error: 'Popup was blocked. Allow popups for this site and try again.',
    };
  }

  return new Promise<OAuthPopupResult>((resolve) => {
    let settled = false;

    const finish = (value: OAuthPopupResult) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      window.clearInterval(closePoll);
      try {
        if (!popup.closed) popup.close();
      } catch {
        // ignore
      }
      resolve(value);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; ok?: boolean; error?: string } | null;
      if (!data || data.type !== OAUTH_MESSAGE_TYPE) return;
      if (data.ok) finish({ ok: true });
      else finish({ ok: false, error: data.error || 'OAuth was cancelled or failed.' });
    };

    window.addEventListener('message', onMessage);

    const closePoll = window.setInterval(() => {
      if (popup.closed) {
        finish({ ok: false, error: 'OAuth window was closed before completing.' });
      }
    }, 500);
  });
}

/** UI provider key → custom integration OAuth start */
export async function connectIntegrationProvider(uiProvider: string): Promise<OAuthPopupResult> {
  const provider = UI_TO_CATALOG_PROVIDER[uiProvider] ?? uiProvider;
  const allowed = new Set(['github', 'slack', 'google_mail', 'google_calendar', 'google_drive']);
  if (!allowed.has(provider)) {
    return { ok: false, error: `OAuth is not configured for ${uiProvider}.` };
  }
  return connectOAuthInPopup(provider);
}

export { OAUTH_MESSAGE_TYPE, POPUP_CALLBACK_PATH };
