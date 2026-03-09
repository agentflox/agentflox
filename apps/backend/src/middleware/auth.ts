import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import env from '@/config/env';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

export async function authMiddleware(
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
) {
  try {
    const token = (socket.handshake.auth as any)?.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const secret = env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) return next(new Error('Server misconfigured: missing JWT secret'));
    const decoded = jwt.verify(token, secret) as any;
    const userId = decoded?.id || decoded?.sub;
    const username = decoded?.email || decoded?.name || userId;

    if (!userId) {
      return next(new Error('Invalid authentication token'));
    }

    socket.userId = userId;
    socket.username = username;
    socket.data.userId = userId;
    socket.data.username = username;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    next(new Error('Authentication failed'));
  }
}

