// src/server.ts
import http from 'http';
import type { Server as HttpServer } from 'http';

import { createApp } from './app';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/db';
import { logger } from './config/logger';
import { initSocketServer } from './sockets';

const startServer = async (): Promise<void> => {
  let server: HttpServer | undefined;

  try {
    await connectDB();

    const app = createApp();
    server = http.createServer(app);

    // Initialize Socket.IO real-time gateway on the same HTTP server.
    initSocketServer(server);

    server.listen(env.port, () => {
      logger.info({ msg: `Server listening on port ${env.port}` });
    });

    const shutdown = async (signal: string): Promise<void> => {
      try {
        logger.info({ msg: `Received ${signal}, shutting down gracefully...` });

        if (!server) {
          await disconnectDB();
          process.exit(0);
          return;
        }

        server.close(async (err) => {
          if (err) {
            logger.error({ err, msg: 'Error while closing HTTP server' });
            process.exit(1);
          }

          await disconnectDB();
          logger.info({ msg: 'Shutdown complete' });
          process.exit(0);
        });
      } catch (error) {
        logger.error({ err: error, msg: 'Error during shutdown' });
        process.exit(1);
      }
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
  } catch (error) {
    logger.error({ err: error, msg: 'Failed to start server' });
    // Ensure DB is disconnected if connectDB partially succeeded.
    await disconnectDB().catch((err) =>
      logger.error({ err, msg: 'Error disconnecting DB after startup failure' }),
    );
    process.exit(1);
  }
};

void startServer();
