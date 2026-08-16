import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isIntegrationOAuthProvider } from '@agentflox/types/integrationOAuth';
import { signIntegrationOAuthState } from '@/lib/integrationOAuth/state';
import {
  buildAuthorizationUrl,
  integrationOAuthCallbackUrl,
  publicOriginFromRequest,
} from '@/lib/integrationOAuth/providers';

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    const login = new URL('/login', request.url);
    login.searchParams.set('callbackUrl', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }

  const provider = request.nextUrl.searchParams.get('provider') ?? '';
  if (!isIntegrationOAuthProvider(provider)) {
    return NextResponse.redirect(
      new URL('/auth/oauth-popup-complete?error=Unknown%20integration%20provider', request.url),
    );
  }

  try {
    const redirectUri = integrationOAuthCallbackUrl(publicOriginFromRequest(request), provider);
    const state = signIntegrationOAuthState({ userId, provider, redirectUri });
    const authorizationUrl = buildAuthorizationUrl(provider, state, redirectUri);
    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start OAuth';
    return NextResponse.redirect(
      new URL(`/auth/oauth-popup-complete?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
