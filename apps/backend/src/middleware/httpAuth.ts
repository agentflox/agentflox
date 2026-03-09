import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '@/config/env';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  username?: string;
  email?: string;
}

function decodeToken(token: string) {
  const secret = env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('Server misconfigured: missing JWT secret');
  }
  const decoded = jwt.verify(token, secret) as any;
  const userId = decoded?.id || decoded?.sub;
  const username = decoded?.name || userId;
  const email = decoded?.email;

  if (!userId) {
    throw new Error('Invalid authentication token');
  }

  return { userId, username, email };
}

export function validateAuthFromRequest(req: Request | AuthenticatedRequest) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || (req.body as any)?.token;

  if (!token) {
    return { error: 'Authentication token required' } as const;
  }

  try {
    return { user: decodeToken(token) } as const;
  } catch {
    return { error: 'Invalid or expired token' } as const;
  }
}

export async function httpAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const result = validateAuthFromRequest(req);
    if ('error' in result) {
      return res.status(401).json({ error: result.error });
    }

    req.userId = result.user.userId;
    req.username = result.user.username;
    req.email = result.user.email;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const result = validateAuthFromRequest(req);

    if ('error' in result) {
      throw new UnauthorizedException(result.error);
    }

    req.userId = result.user.userId;
    req.username = result.user.username;
    req.email = result.user.email;
    return true;
  }
}

