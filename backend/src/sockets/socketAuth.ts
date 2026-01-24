// src/sockets/socketAuth.ts
import type { Socket } from 'socket.io';
import type { JwtPayload } from '../utils/jwt';
import { verifyAccessToken } from '../utils/jwt';
import { logger } from '../config/logger';

export interface SocketUser {
  sub: string;          // user ID
  displayName: string;
  email?: string;
  role?: string;
}

export interface AuthedSocket extends Socket {
  user?: SocketUser | null;
  data: {
    tempUserId?: string;
  };
}

export const socketAuthMiddleware = (
  socket: AuthedSocket,
  next: (err?: Error) => void,
): void => {
  try {
    // Preferred: handshake.auth.token (set by client with io({ auth: { token } }))
    const authToken = socket.handshake.auth?.token;

    // Fallback: Authorization: Bearer <token> header
    const header = socket.handshake.headers.authorization;
    const headerToken =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice('Bearer '.length)
        : undefined;

    const token = authToken || headerToken;

    if (!token) {
      logger.debug({ msg: 'Socket connection rejected: missing token' });
      return next(new Error('Authentication required'));
    }

    const payload = verifyAccessToken(token) as JwtPayload & {
      displayName?: string;
      email?: string;
      role?: string;
    };

    if (!payload.sub) {
      logger.debug({ msg: 'Socket connection rejected: missing user ID' });
      return next(new Error('Invalid token: missing user ID'));
    }

    const displayName =
      payload.displayName && payload.displayName.trim().length > 0
        ? payload.displayName
        : payload.sub.slice(-8);

    socket.user = {
      sub: payload.sub,
      displayName,
      email: payload.email,
      role: payload.role,
    };

    logger.debug({
      msg: 'Socket authenticated',
      userId: socket.user.sub,
      displayName: socket.user.displayName,
    });

    return next();
  } catch (error) {
    logger.debug({
      err: error,
      msg: 'Socket connection rejected: invalid token',
    });
    return next(new Error('Invalid or expired token'));
  }
};
