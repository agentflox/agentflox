import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

// ── Shared cookie config ─────────────────────────────────────────────────────
// This MUST match exactly what apps/frontend/src/lib/auth.ts sets.
// The frontend app issues the JWT; the marketplace app only reads it.
const IS_PRODUCTION = process.env.APP_ENV === "production";
const SHARED_COOKIE_NAME = IS_PRODUCTION
  ? "__Secure-agentflox.session-token"
  : "agentflox.session-token";

export const authOptions: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,

  // No providers — the marketplace app never issues tokens.
  // Login always happens in the main frontend app.
  providers: [],

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24h — must match the frontend app
  },

  // Read the same shared cookie the frontend app wrote
  cookies: {
    sessionToken: {
      name: SHARED_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: IS_PRODUCTION,
        ...(IS_PRODUCTION ? { domain: ".agentflox.com" } : {}),
      },
    },
  },

  callbacks: {
    // Pass the token fields through — no DB lookup needed here.
    // The frontend already embedded everything in the JWT.
    async jwt({ token }) {
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.userType = token.userType as string;
        session.user.onboardingCompleted = token.onboardingCompleted as boolean;
        session.user.onboardingStep = token.onboardingStep as number;
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
  },
};

export const {
  handlers: { GET, POST },
  signIn,
  signOut,
  auth,
} = NextAuth(authOptions);
