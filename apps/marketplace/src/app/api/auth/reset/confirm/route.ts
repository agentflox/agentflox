import { NextResponse } from "next/server";
import jwt, { TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  createSuccessResponse,
  createErrorResponse,
  AUTH_ERROR_CODES,
  ERROR_CODE_TO_STATUS
} from "@/features/auth/types/apiResponse";

const JWT_SECRET = process.env.AUTH_SECRET!;

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
    const { token, newPassword } = body;

    // Validate required fields
    if (!token || !newPassword) {
      const response = createErrorResponse(
        AUTH_ERROR_CODES.MISSING_REQUIRED_FIELDS,
        "Token and new password are required"
      );
      return NextResponse.json(response, {
        status: ERROR_CODE_TO_STATUS[AUTH_ERROR_CODES.MISSING_REQUIRED_FIELDS]
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      const response = createErrorResponse(
        AUTH_ERROR_CODES.WEAK_PASSWORD,
        "Password must be at least 8 characters long"
      );
      return NextResponse.json(response, {
        status: ERROR_CODE_TO_STATUS[AUTH_ERROR_CODES.WEAK_PASSWORD]
      });
    }

    // Verify token
    let decoded: { email: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { email: string };
    } catch (jwtError) {
      if (jwtError instanceof TokenExpiredError) {
        const response = createErrorResponse(
          AUTH_ERROR_CODES.TOKEN_EXPIRED,
          "This reset link has expired. Please request a new one."
        );
        return NextResponse.json(response, {
          status: ERROR_CODE_TO_STATUS[AUTH_ERROR_CODES.TOKEN_EXPIRED]
        });
      }

      const response = createErrorResponse(
        AUTH_ERROR_CODES.TOKEN_INVALID,
        "This reset link is invalid. Please request a new one."
      );
      return NextResponse.json(response, {
        status: ERROR_CODE_TO_STATUS[AUTH_ERROR_CODES.TOKEN_INVALID]
      });
    }

    const { email } = decoded;

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const response = createErrorResponse(
        AUTH_ERROR_CODES.USER_NOT_FOUND,
        "Unable to reset password. Please try again."
      );
      return NextResponse.json(response, {
        status: ERROR_CODE_TO_STATUS[AUTH_ERROR_CODES.USER_NOT_FOUND]
      });
    }

    // Hash new password and update
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hash },
    });

    const response = createSuccessResponse(
      undefined,
      "Password updated successfully. You can now sign in with your new password."
    );
    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error("Password reset confirm error:", error);

    const response = createErrorResponse(
      AUTH_ERROR_CODES.INTERNAL_ERROR,
      "An error occurred while resetting your password. Please try again."
    );
    return NextResponse.json(response, {
      status: ERROR_CODE_TO_STATUS[AUTH_ERROR_CODES.INTERNAL_ERROR]
    });
  }
}
