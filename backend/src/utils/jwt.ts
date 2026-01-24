// src/utils/jwt.ts
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  sub: string;           // user id
  displayName: string;   // user display name for presence
  email?: string;        // user email
  orgId?: string;        // optional org/tenant id
  role?: string;         // high-level role (e.g., 'user', 'admin')
}

const ACCESS_TOKEN_TTL = '24h'; // Extended for socket presence [web:204]

export const signAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, env.jwtSecret) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Optional: Refresh token for longer sessions (if needed later)
export interface RefreshTokenPayload {
  sub: string;
}

const REFRESH_TOKEN_TTL = '7d';

export const signRefreshToken = (payload: RefreshTokenPayload): string => {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: REFRESH_TOKEN_TTL,
  });
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, env.jwtSecret) as RefreshTokenPayload;
};
