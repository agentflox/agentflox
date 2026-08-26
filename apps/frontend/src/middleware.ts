import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { API_AUTH_PREFIX, AUTH_ROUTES, PROTECTED_ROUTES } from "./constants/routes.config";
import { INTEGRATION_OAUTH_STATE_PREFIX } from "./lib/integrationOAuth/constants";

function isIntegrationOAuthProviderCallback(request: NextRequest): boolean {
  const { pathname, searchParams } = request.nextUrl;
  const isProviderCallback =
    pathname === "/api/auth/callback/github" ||
    pathname === "/api/auth/callback/slack" ||
    pathname === "/api/auth/callback/google";
  if (!isProviderCallback) return false;
  const state = searchParams.get("state") ?? "";
  return state.startsWith(INTEGRATION_OAUTH_STATE_PREFIX);
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;

  // Integration connect reuses NextAuth callback URLs already registered on
  // GitHub/Google/Slack. Only rewrite when our signed state prefix is present
  // so normal login is unchanged.
  if (isIntegrationOAuthProviderCallback(request)) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = "/api/integrations/oauth/callback";
    return NextResponse.rewrite(rewriteUrl);
  }

  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  const formsHost = (process.env.NEXT_PUBLIC_FORMS_HOST || "").toLowerCase();

  // Skip middleware for static files and API routes
  const isStatic = pathname.startsWith("/_next") || /\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname);
  const isAccessingApiAuthRoute = pathname.startsWith(API_AUTH_PREFIX);
  const isApiRoute = pathname.startsWith("/api");

  if (isAccessingApiAuthRoute || isStatic || isApiRoute) {
    return NextResponse.next();
  }

  // Forms subdomain rewrite: forms host serves public forms at /:viewId via app/f/[viewId]
  if (formsHost && host === formsHost) {
    if (pathname.startsWith("/f")) {
      return NextResponse.next();
    }
    const targetPath = pathname === "/" ? "/f" : `/f${pathname}`;
    return NextResponse.rewrite(new URL(targetPath, request.url));
  }

  const isOAuthPopupComplete = pathname.startsWith("/auth/oauth-popup-complete");
  const isAccessingAuthRoute =
    !isOAuthPopupComplete && AUTH_ROUTES.some(route => pathname === route || pathname.startsWith(route + "/"));
  const isOnboarding = pathname.startsWith("/onboarding");
  const isInviteAccept = pathname.startsWith("/invite/accept");
  const isPublicRoute =
    pathname === "/privacy" ||
    pathname.startsWith("/privacy/") ||
    pathname === "/terms" ||
    pathname.startsWith("/terms/");
  const isProtectedRoute =
    !isAccessingAuthRoute &&
    !isPublicRoute &&
    !isInviteAccept &&
    !isOAuthPopupComplete &&
    (pathname === "/" || PROTECTED_ROUTES.filter(route => route && route !== "/").some(route => pathname === route || pathname.startsWith(route + "/")));
  const isAdminRoute = pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/");

  const IS_PRODUCTION = process.env.APP_ENV === 'production';
  const SHARED_COOKIE_NAME = IS_PRODUCTION
    ? '__Secure-agentflox.session-token'
    : 'agentflox.session-token';
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    cookieName: SHARED_COOKIE_NAME,
    secureCookie: IS_PRODUCTION,
  });
  const isAuthenticated = !!token;

  // OAuth popup must load so it can postMessage to the opener and close itself.
  // Do not treat it as a normal auth route (which would redirect to "/").
  if (isOAuthPopupComplete) {
    return NextResponse.next();
  }

  // Allow public access to invitation acceptance and public pages
  if (isInviteAccept || isPublicRoute) {
    return NextResponse.next();
  }

  // Redirect authenticated users away from auth routes, honoring the preserved destination
  if (isAuthenticated && isAccessingAuthRoute) {
    const callbackUrl = url.searchParams.get("callbackUrl");
    const isCallbackAuthRoute = callbackUrl && AUTH_ROUTES.some(r => callbackUrl === r || callbackUrl.startsWith(r + "/") || callbackUrl.startsWith(r + "?"));
    // Guard against open-redirect and circular redirect to auth routes
    const safeDest = callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") && !isCallbackAuthRoute ? callbackUrl : "/";
    return NextResponse.redirect(new URL(safeDest, url));
  }

  // Redirect unauthenticated users to login, preserving their destination
  if (!isAuthenticated && isProtectedRoute) {
    const loginUrl = new URL("/login", url);
    const targetDest = pathname + url.search;
    if (!AUTH_ROUTES.some(r => targetDest === r || targetDest.startsWith(r + "/") || targetDest.startsWith(r + "?"))) {
      loginUrl.searchParams.set("callbackUrl", targetDest);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Handle authenticated user flows
  if (isAuthenticated) {
    // Admin-only guard for platform admin dashboard
    if (isAdminRoute) {
      const role = String((token as any)?.userType ?? "");
      if (role.toUpperCase() !== "ADMIN") {
        return NextResponse.redirect(new URL("/", url));
      }
    }

    const onboardingCompleted = Boolean(token?.onboardingCompleted);
    if (!onboardingCompleted && !isOnboarding) {
      return NextResponse.redirect(new URL("/onboarding", url));
    }

    if (onboardingCompleted && isOnboarding) {
      return NextResponse.redirect(new URL("/", url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
