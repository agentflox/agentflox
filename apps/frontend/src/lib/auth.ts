import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import { authConfig } from "@/config/auth.config";
import { prisma } from "@/lib/prisma";
import { billingService } from "@/services/billing.service";

// OPTIMIZATION: Cache user lookups briefly to prevent DB slamming on every JWT call during navigation
const userCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds (enough for rapid redirects)

// Shared cookie name used by all Agentflox apps (frontend, community, marketplace, etc.)
// In production both apps run on *.agentflox.com so setting the domain to .agentflox.com
// makes the cookie visible to every subdomain — no second login needed.
const IS_PRODUCTION = process.env.APP_ENV === "production";
const SHARED_COOKIE_NAME = IS_PRODUCTION
  ? "__Secure-agentflox.session-token"
  : "agentflox.session-token";

export const authOptions: NextAuthConfig = {
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  useSecureCookies: IS_PRODUCTION,

  // ── Shared cross-subdomain cookie ─────────────────────────────────────────
  // Both the frontend and community apps read this exact cookie.
  // Domain is omitted in development (localhost shares cookies by default).
  cookies: {
    sessionToken: {
      name: SHARED_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: IS_PRODUCTION,
        // In production set to .agentflox.com so every subdomain can read it
        ...(IS_PRODUCTION ? { domain: ".agentflox.com" } : {}),
      },
    },
  },

  events: {
    async createUser({ user }) {
      if (!user?.id) return;
      await prisma.user.update({
        where: { id: user.id },
        data: { onboardingStep: 0, onboardingCompleted: false }, // Sync with new Step 0 index
      });
    },
  },

  pages: {
    signIn: "/login",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
    newUser: "/onboarding",
  },

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24h
  },

  debug: process.env.APP_ENV === "production",

  callbacks: {
    // ✅ Attach user & accessToken to JWT
    async jwt({ token, user, account, trigger, session }) {
      // Prefer explicit user.id; Auth.js also sets token.sub on sign-in.
      if (user?.id) {
        token.id = user.id;
      }
      if (!token.id && token.sub) {
        token.id = token.sub;
      }
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }

      // Handle explicit session updates (e.g. from update() in client)
      if (trigger === "update" && session && typeof session === "object") {
        const { user: _user, expires: _expires, ...sessionFields } = session as Record<
          string,
          unknown
        >;
        Object.assign(token, sessionFields);
        if (!token.id && token.sub) {
          token.id = token.sub;
        }
      }

      if (token.id) {
        const now = Date.now();
        const cached = userCache.get(token.id as string);

        let dbUser;

        if (cached && (now - cached.timestamp < CACHE_TTL)) {
          dbUser = cached.data;
        } else {
          dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              id: true,
              role: true,
              isVerified: true,
              onboardingCompleted: true,
              onboardingStep: true,
            },
          });
          if (dbUser) {
            userCache.set(token.id as string, { data: dbUser, timestamp: now });
          }
        }

        if (dbUser) {
          token.userType = dbUser.role ?? undefined;
          token.isVerified = dbUser.isVerified;
          token.onboardingCompleted = dbUser.onboardingCompleted;
          token.onboardingStep = dbUser.onboardingStep;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        // token.sub is Auth.js default; token.id is our mirror — use either.
        session.user.id = (token.id ?? token.sub) as string;
        session.user.userType = token.userType as string;
        session.user.onboardingCompleted = token.onboardingCompleted as boolean;
        session.user.onboardingStep = token.onboardingStep as number;
        session.accessToken = token.accessToken as string;
      }
      return session;
    },

    async signIn({ user }) {
      if (!user?.id) return true;
      try {
        // Pass user object as session context for token generation
        billingService.subscriptions.createDefault(user.id, { user }).catch((error) => {
          console.error("Failed to create default subscription:", error);
        });
      } catch (error) {
        console.error("Failed to create default subscription:", error);
      }

      return true;
    },
  },
};

export const {
  handlers: { GET, POST },
  signIn,
  signOut,
  auth,
} = NextAuth(authOptions);
