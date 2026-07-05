import { NextResponse } from "next/server";
import jwt, { TokenExpiredError } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import {
  createErrorResponse,
  AUTH_ERROR_CODES,
  ERROR_CODE_TO_STATUS
} from "@/features/auth/types/apiResponse";

const JWT_SECRET = process.env.AUTH_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  // Validate token presence
  if (!token) {
    return NextResponse.redirect(
      `${APP_URL}/auth/error?error=TOKEN_INVALID`
    );
  }

  try {
    // Verify token
    let decoded: { email: string; password: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { email: string; password: string };
    } catch (jwtError) {
      if (jwtError instanceof TokenExpiredError) {
        return NextResponse.redirect(
          `${APP_URL}/auth/error?error=TOKEN_EXPIRED`
        );
      }
      return NextResponse.redirect(
        `${APP_URL}/auth/error?error=TOKEN_INVALID`
      );
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: decoded.email }
    });

    if (existing) {
      // User already verified, redirect to login with message
      return NextResponse.redirect(
        `${APP_URL}/login?verified=already`
      );
    }

    // Create new user
    await prisma.user.create({
      data: {
        email: decoded.email,
        password: decoded.password,
        onboardingStep: 0,
        onboardingCompleted: false,
      },
    });

    // Redirect to login with success message
    return NextResponse.redirect(
      `${APP_URL}/login?verified=success`
    );

  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.redirect(
      `${APP_URL}/auth/error?error=INTERNAL_ERROR`
    );
  }
}
