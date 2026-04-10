import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { API_AUTH_PREFIX, AUTH_ROUTES, PROTECTED_ROUTES } from "./constants/routes.config";


export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;
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

  const isAccessingAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));
  const isOnboarding = pathname.startsWith("/onboarding");
  const isInviteAccept = pathname.startsWith("/invite/accept");
  const isProtectedRoute = pathname === "/" || PROTECTED_ROUTES.filter(route => route !== "/").some(route => pathname.startsWith(route));

  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET, secureCookie: process.env.APP_ENV === 'production' });
  const isAuthenticated = !!token;

  // Allow public access to invitation acceptance page
  if (isInviteAccept) {
    return NextResponse.next();
  }

  // Redirect authenticated users away from auth routes
  if (isAuthenticated && isAccessingAuthRoute) {
    return NextResponse.redirect(new URL("/", url));
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", url));
  }

  // Handle authenticated user flows
  if (isAuthenticated) {
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
