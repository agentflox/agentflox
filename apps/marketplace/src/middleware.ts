import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { API_AUTH_PREFIX, AUTH_ROUTES, PROTECTED_ROUTES } from "./constants/routes.config";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;

  const isStatic = pathname.startsWith("/_next") || /\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname);
  const isAccessingApiAuthRoute = pathname.startsWith(API_AUTH_PREFIX);
  const isApiRoute = pathname.startsWith("/api");

  if (isAccessingApiAuthRoute || isStatic || isApiRoute) {
    return NextResponse.next();
  }

  const isAccessingAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));
  const isProtectedRoute = PROTECTED_ROUTES.filter(route => route !== "/").some(route => pathname.startsWith(route));
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const IS_PRODUCTION = process.env.APP_ENV === "production";
  const SHARED_COOKIE_NAME = IS_PRODUCTION
    ? "__Secure-agentflox.session-token"
    : "agentflox.session-token";

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
  if (!isAuthenticated && isProtectedRoute) {
    const callbackUrl = encodeURIComponent(`${url.origin}${pathname}${url.search}`);
    const mainAppUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || "https://app.agentflox.com";
    return NextResponse.redirect(`${mainAppUrl}/login?callbackUrl=${callbackUrl}`);
  }

  // Handle authenticated user flows
  if (isAuthenticated) {
    if (isAdminRoute) {
      const role = String((token as any)?.userType ?? "");
      if (role.toUpperCase() !== "ADMIN") {
        return NextResponse.redirect(new URL("/", url));
      }
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};