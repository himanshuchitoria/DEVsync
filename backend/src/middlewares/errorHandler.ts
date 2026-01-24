// src/middlewares/errorHandler.ts
import type { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';

interface AppError extends Error {
  statusCode?: number;
  details?: unknown;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): Response => {
  const statusCode =
    err.statusCode && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500;

  logger.error({
    msg: 'Unhandled error',
    message: err.message,
    statusCode,
    stack: err.stack,
    details: err.details,
  });

  const responseBody =
    process.env.NODE_ENV === 'production'
      ? { message: 'Internal server error' }
      : { message: err.message || 'Internal server error', details: err.details };

  return res.status(statusCode).json(responseBody);
};
