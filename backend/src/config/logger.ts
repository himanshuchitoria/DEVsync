// src/config/logger.ts
import pino from 'pino';
import { env } from './env';

const level = process.env.LOG_LEVEL || (env.nodeEnv === 'production' ? 'info' : 'debug');

export const logger = pino({
  level,
  transport:
    env.nodeEnv === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});
