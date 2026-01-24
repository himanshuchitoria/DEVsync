// src/app.ts
import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { env } from './config/env';
import { logger } from './config/logger';
import { corsOptions } from './middlewares/cors';
import { errorHandler } from './middlewares/errorHandler';
import { authRouter } from './modules/auth/auth.routes';
import { roomRouter } from './modules/room/room.routes';
import { projectRouter } from './modules/project/project.routes';

/**
 * Factory to create and configure the Express application.
 * Socket.IO and other realtime concerns are wired in src/server.ts,
 * so this file stays focused on HTTP concerns only.
 */
export const createApp = (): Application => {
  const app = express();

  // Basic security headers.
  app.use(helmet());

  // CORS configuration shared with frontend.
  app.use(cors(corsOptions));

  // JSON body parsing with a sane limit for code files.
  app.use(express.json({ limit: '1mb' }));

  // Health / readiness endpoints (used by monitoring / deployment).
  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/readyz', (_req, res) => {
    res.status(200).json({ status: 'ready' });
  });

  // REST API routes.
  app.use('/api/auth', authRouter);
  app.use('/api/rooms', roomRouter);
  app.use('/api/projects', projectRouter);

  // 404 fallback for unmatched routes.
  app.use((_req, res) => {
    res.status(404).json({ message: 'Not found' });
  });

  // Global error handler (must be after all routes / middleware).
  app.use(errorHandler);

  logger.debug(`Express app initialized in ${env.nodeEnv} mode`);

  return app;
};
