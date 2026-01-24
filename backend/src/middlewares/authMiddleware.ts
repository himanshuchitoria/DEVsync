// src/middlewares/authMiddleware.ts
import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken, type JwtPayload } from '../utils/jwt';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Response | void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = authHeader.substring('Bearer '.length);

  try {
    const payload = verifyAccessToken(token);
    req.user = payload; // minimal identity (sub/orgId/role)
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
