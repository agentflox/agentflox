import { NextRequest, NextResponse } from 'next/server';
import { verifyIntegrationOAuthState } from '@/lib/integrationOAuth/state';
import { exchangeAuthorizationCode } from '@/lib/integrationOAuth/providers';
import { persistIntegrationOAuthConnection } from '@/lib/integrationOAuth/persist';

function completeUrl(request: NextRequest, error?: string) {
  const url = new URL('/auth/oauth-popup-complete', request.url);
  if (error) url.searchParams.set('error', error);
  return url;
}

export async function GET(request: NextRequest) {
  const errorParam = request.nextUrl.searchParams.get('error');
  if (errorParam) {
    const description =
      request.nextUrl.searchParams.get('error_description') || errorParam;
    return NextResponse.redirect(completeUrl(request, description));
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  if (!code || !state) {
    return NextResponse.redirect(completeUrl(request, 'Missing OAuth code or state'));
  }

  try {
    const parsed = verifyIntegrationOAuthState(state);
    const tokens = await exchangeAuthorizationCode(parsed.provider, code, parsed.redirectUri);
    await persistIntegrationOAuthConnection({
      userId: parsed.userId,
      provider: parsed.provider,
      tokens,
    });
    return NextResponse.redirect(completeUrl(request));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OAuth connection failed';
    return NextResponse.redirect(completeUrl(request, message));
  }
}
