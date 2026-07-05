import { DefaultSession, DefaultJWT } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User {
    userType?: string;
    isVerified?: boolean;
    onboardingCompleted?: boolean;
    onboardingStep?: number;
  }

  interface Session {
    accessToken?: string;
    user: {
      id: string;
      userType?: string;
      isVerified?: boolean;
      onboardingCompleted?: boolean;
      onboardingStep?: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    accessToken?: string;
    userType?: string;
    isVerified?: boolean;
    onboardingCompleted?: boolean;
    onboardingStep?: number;
  }
}
