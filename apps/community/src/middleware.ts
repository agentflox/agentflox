import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { API_AUTH_PREFIX, AUTH_ROUTES, PROTECTED_ROUTES } from "./constants/routes.config";


export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;
  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();

  // Skip middleware for static files and API routes
  const isStatic = pathname.startsWith("/_next") || /\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname);
  const isAccessingApiAuthRoute = pathname.startsWith(API_AUTH_PREFIX);
  const isApiRoute = pathname.startsWith("/api");

  if (isAccessingApiAuthRoute || isStatic || isApiRoute) {
    return NextResponse.next();
  }

  const isAccessingAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));
  const isProtectedRoute = pathname === "/" || PROTECTED_ROUTES.filter(route => route !== "/").some(route => pathname.startsWith(route));
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

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

  // Redirect authenticated users away from auth routes
  if (isAuthenticated && isAccessingAuthRoute) {
    return NextResponse.redirect(new URL("/", url));
  }

  // Redirect unauthenticated users to the MAIN app's login page.
  // The main app sets the shared cookie, so the user only ever logs in once.
  // After login, the main app redirects back to the community URL.
  if (!isAuthenticated && isProtectedRoute) {
    const mainAppLoginUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'http://localhost:3000';
    const callbackUrl = encodeURIComponent(`${process.env.NEXT_PUBLIC_BASE_URL}${pathname}`);
    return NextResponse.redirect(new URL(`${mainAppLoginUrl}/login?callbackUrl=${callbackUrl}`, url));
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
    return NextResponse.redirect(new URL("/", url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
