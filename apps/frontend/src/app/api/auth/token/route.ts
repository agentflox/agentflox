import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import jwt from 'jsonwebtoken';
import {
  createSuccessResponse,
  createErrorResponse,
  AUTH_ERROR_CODES,
  ERROR_CODE_TO_STATUS
} from '@/features/auth/types/apiResponse';

export async function GET(req: Request) {
  try {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

    if (!secret) {
      console.error('Missing AUTH_SECRET or NEXTAUTH_SECRET');
      const response = createErrorResponse(
        AUTH_ERROR_CODES.INTERNAL_ERROR,
        'Server configuration error'
      );
      return NextResponse.json(response, {
        status: ERROR_CODE_TO_STATUS[AUTH_ERROR_CODES.INTERNAL_ERROR]
      });
    }

    const token = await getToken({
      req,
      secret,
      secureCookie: process.env.APP_ENV === 'production'
    });

    if (!token) {
      const response = createErrorResponse(
        AUTH_ERROR_CODES.UNAUTHORIZED,
        'Authentication required'
      );
      return NextResponse.json(response, {
        status: ERROR_CODE_TO_STATUS[AUTH_ERROR_CODES.UNAUTHORIZED]
      });
    }

    // Sign a new token for API communication
    const signed = jwt.sign(
      {
        sub: token.sub,
        email: token.email,
        iat: Math.floor(Date.now() / 1000),
      },
      secret,
      { expiresIn: '1h' }
    );

    const response = createSuccessResponse({ token: signed });
    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Token route error:', error);
    const response = createErrorResponse(
      AUTH_ERROR_CODES.INTERNAL_ERROR,
      'Failed to generate token'
    );
    return NextResponse.json(response, {
      status: ERROR_CODE_TO_STATUS[AUTH_ERROR_CODES.INTERNAL_ERROR]
    });
  }
}
