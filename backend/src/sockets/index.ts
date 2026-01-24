import type { Server as HttpServer } from 'http';
import { Server, type ServerOptions } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { socketAuthMiddleware, type AuthedSocket } from './socketAuth';
import { registerCollaborationHandlers } from './collaborationHandlers';
import { registerPresenceHandlers } from './presenceHandlers';

export let io: Server | null = null;

/** Production-ready Socket.IO configuration */
const socketConfig: Partial<ServerOptions> = {
  cors: {
    origin: env.clientOrigin.split(','),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket'], // Prefer WebSocket in prod
  pingInterval: 25000,
  pingTimeout: 20000,        // Slightly longer than default to avoid flakiness
  maxHttpBufferSize: 1e6,
  cookie: false,
  serveClient: false,
};

/**
 * Initialize Socket.IO server with real-time collaboration features
 */
export const initSocketServer = (server: HttpServer): Server => {
  io = new Server(server, socketConfig);

  // JWT Authentication middleware
  io.use(socketAuthMiddleware);

  // Grace period for presence cleanup (5 minutes)
  const PRESENCE_CLEANUP_INTERVAL = 5 * 60 * 1000;

  io.on('connection', (rawSocket) => {
    const socket = rawSocket as AuthedSocket;

    logger.info({
      msg: 'Socket connected',
      socketId: socket.id,
      userId: socket.user?.sub,
      displayName: socket.user?.displayName,
    });

    // === REAL-TIME FEATURES REGISTRATION ===

    // 1. File collaboration (OT/CRDT editing)
    registerCollaborationHandlers(io!, socket);

    // 2. Project-level presence (online/offline/away, cursors)
    registerPresenceHandlers(io!, socket);

    // 3. Generic room management (optional fallback)
    socket.on('join-room', (roomId: string) => {
      socket.join(roomId);
      logger.debug({
        msg: `Socket ${socket.id} joined room`,
        roomId,
        userId: socket.user?.sub,
      });
    });

    socket.on('leave-room', (roomId: string) => {
      socket.leave(roomId);
      logger.debug({
        msg: `Socket ${socket.id} left room`,
        roomId,
        userId: socket.user?.sub,
      });
    });

    // Rely on Socket.IO's connection/disconnect for presence.
    socket.on('disconnect', (reason) => {
      logger.info({
        msg: 'Socket disconnected',
        socketId: socket.id,
        userId: socket.user?.sub,
        reason,
      });
      // Presence cleanup is handled in presenceHandlers disconnect listener.
    });

    // If you ever want low-level heartbeat metrics:
    // socket.conn.on('heartbeat', () => {
    //   logger.debug({ msg: 'socket heartbeat', socketId: socket.id });
    // });
  });

  // === PRESENCE CLEANUP WORKER ===
  setInterval(() => {
    if (!io) return;

    const now = Date.now();
    const fiveMinutesAgo = now - PRESENCE_CLEANUP_INTERVAL;

    // Emit cleanup signal to project presence rooms.
    const rooms = io.sockets.adapter.rooms;
    for (const [roomKey] of rooms.entries()) {
      if (roomKey.startsWith('room:')) {
        io.to(roomKey).emit('presence:cleanup-offline', {
          cutoff: fiveMinutesAgo,
        });
      }
    }
  }, PRESENCE_CLEANUP_INTERVAL);

  logger.info({
    msg: 'Socket.IO server initialized ✅',
    features: [
      '🔴 Real-time collaboration (OT/CRDT)',
      '🟢 Project presence (online/offline/away)',
      '🟡 Typing indicators',
      '📍 Cursor tracking',
      '🧹 Auto-cleanup',
    ],
    config: {
      transports: socketConfig.transports,
      pingInterval: socketConfig.pingInterval,
      pingTimeout: socketConfig.pingTimeout,
    },
  });

  return io;
};

/**
 * Graceful shutdown with cleanup
 */
export const shutdownSocketServer = (): void => {
  if (io) {
    logger.info({ msg: '🛑 Shutting down Socket.IO server' });

    io.emit('server:shutdown', {
      message: 'Server shutting down gracefully',
      timestamp: Date.now(),
    });

    io.close((err) => {
      if (err) {
        logger.error({ msg: 'Socket.IO shutdown error', err });
      } else {
        logger.info({ msg: 'Socket.IO server closed cleanly' });
      }
      io = null;
    });
  }
};

// Export for module usage
export const getSocketIo = (): Server => {
  if (!io) {
    throw new Error('Socket.IO server not initialized');
  }
  return io;
};
