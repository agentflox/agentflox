import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
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
    const { email } = body;

    // Validate email
    if (!email) {
      const response = createErrorResponse(
        AUTH_ERROR_CODES.MISSING_REQUIRED_FIELDS,
        "Email is required"
      );
      return NextResponse.json(response, {
        status: ERROR_CODE_TO_STATUS[AUTH_ERROR_CODES.MISSING_REQUIRED_FIELDS]
      });
    }

    // Check if user exists (but always return success for security)
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Only send email if user exists
      const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "30m" });
      const resetUrl = `${APP_URL}/auth/reset-password?token=${token}`;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <div style="text-align: center; padding: 40px 0;">
            <div style="display: inline-block; width: 48px; height: 48px; background: #000; border-radius: 12px; line-height: 48px; color: #fff; font-weight: bold; font-size: 24px;">X</div>
          </div>
          <h2 style="text-align: center; margin-bottom: 16px;">Reset your password</h2>
          <p style="text-align: center; color: #666; margin-bottom: 32px;">
            We received a request to reset your password. Click the button below to choose a new password.
          </p>
          <div style="text-align: center;">
            <a href="${resetUrl}" style="
              background-color: #000;
              color: white;
              padding: 14px 32px;
              text-decoration: none;
              border-radius: 8px;
              display: inline-block;
              font-weight: 500;
            ">Reset Password</a>
          </div>
          <p style="text-align: center; color: #999; margin-top: 32px; font-size: 14px;">
            This link will expire in 30 minutes. If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `;

      try {
        await emailService.sendNodemailerEmail(email, "Reset your password - Agentflox", html);
      } catch (emailError) {
        console.error("Failed to send reset email:", emailError);
        // Don't expose email sending failures to prevent user enumeration
      }
    }

    // Always return success for security (don't reveal if email exists)
    const response = createSuccessResponse(
      undefined,
      "If an account exists with this email, a password reset link has been sent."
    );
    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error("Password reset request error:", error);

    // Still return success for security
    const response = createSuccessResponse(
      undefined,
      "If an account exists with this email, a password reset link has been sent."
    );
    return NextResponse.json(response, { status: 200 });
  }
}
