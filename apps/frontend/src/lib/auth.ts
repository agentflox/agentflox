import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import { authConfig } from "@/config/auth.config";
import { prisma } from "@/lib/prisma";
import { billingService } from "@/services/billing.service";

// OPTIMIZATION: Cache user lookups briefly to prevent DB slamming on every JWT call during navigation
const userCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds (enough for rapid redirects)

export const authOptions: NextAuthConfig = {
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  useSecureCookies: process.env.APP_ENV === "production",

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
      if (account && user) {
        token.id = user.id;
        token.accessToken = account.access_token;
      }

      // Handle explicit session updates (e.g. from update() in client)
      if (trigger === "update" && session) {
        // Merge session updates into token
        return { ...token, ...session };
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
              userType: true,
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
          token.userType = dbUser.userType;
          token.isVerified = dbUser.isVerified;
          token.onboardingCompleted = dbUser.onboardingCompleted;
          token.onboardingStep = dbUser.onboardingStep;
        }
      }

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
