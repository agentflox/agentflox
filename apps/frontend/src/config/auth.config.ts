import { NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import Nodemailer from "next-auth/providers/nodemailer"
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendVerificationRequest } from '@/features/auth/helpers/sendVerificationRequest';

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),

    // GitHub OAuth Provider (used both for login and repository integrations)
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    
    // Email/Password Provider
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const email = credentials?.email ? String(credentials.email) : "";
        const password = credentials?.password ? String(credentials.password) : "";
        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email }
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
          return null;
        }

        if (!user.isActive) {
          return null;
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastActiveAt: new Date() }
        });

        const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined;
        return {
          id: user.id,
          email: user.email,
          name,
          image: user.avatar || undefined,
          emailVerified: user.emailVerified ?? undefined,
          userType: user.userType,
          isVerified: user.isVerified,
          onboardingCompleted: user.onboardingCompleted,
          onboardingStep: user.onboardingStep,
        };
      }
    }),
    Nodemailer({
      server: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
      from: process.env.EMAIL_FROM,
      sendVerificationRequest
    }),
  ],
};
