import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import emailService from "@/utils/email/emailService";
import {
  createSuccessResponse,
  createErrorResponse,
  AUTH_ERROR_CODES,
  ERROR_CODE_TO_STATUS
} from "@/features/auth/types/apiResponse";

const JWT_SECRET = process.env.AUTH_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      const response = createErrorResponse(
        AUTH_ERROR_CODES.VALIDATION_ERROR,
        "Invalid or missing request body"
      );
      return NextResponse.json(response, {
        status: ERROR_CODE_TO_STATUS[AUTH_ERROR_CODES.VALIDATION_ERROR]
      });
    }
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      const response = createErrorResponse(
        AUTH_ERROR_CODES.MISSING_REQUIRED_FIELDS,
        "Email and password are required"
      );
      return NextResponse.json(response, {
        status: ERROR_CODE_TO_STATUS[AUTH_ERROR_CODES.MISSING_REQUIRED_FIELDS]
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const response = createErrorResponse(
        AUTH_ERROR_CODES.VALIDATION_ERROR,
        "Please provide a valid email address"
      );
      return NextResponse.json(response, {
        status: ERROR_CODE_TO_STATUS[AUTH_ERROR_CODES.VALIDATION_ERROR]
      });
    }

    // Validate password strength
    if (password.length < 8) {
      const response = createErrorResponse(
        AUTH_ERROR_CODES.WEAK_PASSWORD,
        "Password must be at least 8 characters long"
      );
      return NextResponse.json(response, {
        status: ERROR_CODE_TO_STATUS[AUTH_ERROR_CODES.WEAK_PASSWORD]
      });
    }

    // Check if user already exists
    const { prisma } = await import("@/lib/prisma");
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      const response = createErrorResponse(
        AUTH_ERROR_CODES.USER_EXISTS,
        "An account with this email already exists. Please sign in instead."
      );
      return NextResponse.json(response, {
        status: ERROR_CODE_TO_STATUS[AUTH_ERROR_CODES.USER_EXISTS]
      });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Create verification token
    const token = jwt.sign({ email, password: hash }, JWT_SECRET, { expiresIn: "30m" });
    const verifyUrl = `${APP_URL}/api/auth/verify?token=${token}`;

    // Send verification email
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="text-align: center; padding: 40px 0;">
          <div style="display: inline-block; width: 48px; height: 48px; background: #000; border-radius: 12px; line-height: 48px; color: #fff; font-weight: bold; font-size: 24px;">X</div>
        </div>
        <h2 style="text-align: center; margin-bottom: 16px;">Confirm your email</h2>
        <p style="text-align: center; color: #666; margin-bottom: 32px;">
          Click the button below to confirm your account and complete registration.
        </p>
        <div style="text-align: center;">
          <a href="${verifyUrl}" style="
            background-color: #000;
            color: white;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            display: inline-block;
            font-weight: 500;
          ">Confirm Email</a>
        </div>
        <p style="text-align: center; color: #999; margin-top: 32px; font-size: 14px;">
          This link will expire in 30 minutes.
        </p>
      </div>
    `;

    await emailService.sendNodemailerEmail(email, "Confirm your email - Agentflox", html);

    const response = createSuccessResponse(
      { email },
      "Verification email sent. Please check your inbox."
    );
    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error("Error in registration:", error);

    const response = createErrorResponse(
      AUTH_ERROR_CODES.INTERNAL_ERROR,
      "An error occurred during registration. Please try again."
    );
    return NextResponse.json(response, {
      status: ERROR_CODE_TO_STATUS[AUTH_ERROR_CODES.INTERNAL_ERROR]
    });
  }
}
