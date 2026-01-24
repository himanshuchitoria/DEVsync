// src/sockets/presenceHandlers.ts
import type { Server } from 'socket.io';
import type { AuthedSocket } from './socketAuth';
import { logger } from '../config/logger';

interface PresencePayload {
  // Treat roomId as projectId for presence.
  roomId: string; // projectId
}

interface TypingPayload {
  roomId: string; // projectId
  isTyping: boolean;
}

interface CursorPayload {
  projectId: string;
  fileId: string;
  cursor: { line: number; column: number };
  userId: string;
  displayName: string;
  color: string;
}

interface StatusPayload {
  roomId: string; // projectId
  status: 'online' | 'away' | 'offline';
}

interface UserPresence {
  id: string;
  displayName: string;
  color: string;
  status: 'online' | 'away' | 'offline';
  lastSeen?: string;
  cursor?: { line: number; column: number };
}

const getPresenceRoomKey = (projectId: string): string => `room:${projectId}`;
const getFileRoomKey = (projectId: string, fileId: string): string =>
  `file:${projectId}:${fileId}`;

// In‑memory presence store per project
const roomUsers: Map<string, Map<string, UserPresence>> = new Map();

// Deterministic user color
const generateUserColor = (userId: string): string => {
  const colors = [
    '#ef4444',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f59e0b',
    '#06b6d4',
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

// Register all presence‑related events
export const registerPresenceHandlers = (
  io: Server,
  socket: AuthedSocket,
): void => {
  /**
   * presence:join-room
   * Frontend sends { roomId: projectId }
   * -> join project presence room and broadcast full user list
   */
  socket.on('presence:join-room', async (data: PresencePayload) => {
    try {
      if (!socket.user?.sub) {
        socket.emit('presence:error', { message: 'Authentication required' });
        return;
      }

      const { roomId: projectId } = data;
      if (!projectId) {
        socket.emit('presence:error', { message: 'Invalid project id' });
        return;
      }

      const roomKey = getPresenceRoomKey(projectId);
      await socket.join(roomKey);

      if (!roomUsers.has(roomKey)) {
        roomUsers.set(roomKey, new Map());
      }
      const roomUserMap = roomUsers.get(roomKey)!;

      const userPresence: UserPresence = {
        id: socket.user.sub,
        displayName: socket.user.displayName,
        color: generateUserColor(socket.user.sub),
        status: 'online',
        lastSeen: new Date().toISOString(),
      };

      roomUserMap.set(socket.user.sub, userPresence);

      const allUsers = Array.from(roomUserMap.values());

      // Send minimal shape to frontend: projectId + users
      io.to(roomKey).emit('presence:room-users', {
        projectId,
        users: allUsers.map((u) => ({
          id: u.id,
          displayName: u.displayName,
        })),
      });

      logger.debug({
        msg: 'User joined presence room',
        roomKey,
        userId: socket.user.sub,
        totalUsers: allUsers.length,
      });
    } catch (error) {
      logger.error({ err: error, msg: 'Error in presence:join-room' });
      socket.emit('presence:error', {
        message: 'Failed to join presence room',
      });
    }
  });

  /**
   * presence:leave-room
   * Frontend sends { roomId: projectId }
   */
  socket.on('presence:leave-room', async (data: PresencePayload) => {
    try {
      if (!socket.user?.sub) {
        socket.emit('presence:error', { message: 'Authentication required' });
        return;
      }

      const { roomId: projectId } = data;
      if (!projectId) {
        socket.emit('presence:error', { message: 'Invalid project id' });
        return;
      }

      const roomKey = getPresenceRoomKey(projectId);
      await socket.leave(roomKey);

      const roomUserMap = roomUsers.get(roomKey);
      if (roomUserMap?.has(socket.user.sub)) {
        const userPresence = roomUserMap.get(socket.user.sub)!;
        userPresence.status = 'offline';
        userPresence.lastSeen = new Date().toISOString();
        userPresence.cursor = undefined;
        roomUserMap.set(socket.user.sub, userPresence);
      }

      const allUsers = roomUserMap ? Array.from(roomUserMap.values()) : [];

      io.to(roomKey).emit('presence:room-users', {
        projectId,
        users: allUsers.map((u) => ({
          id: u.id,
          displayName: u.displayName,
        })),
      });

      logger.debug({
        msg: 'User left presence room',
        roomKey,
        userId: socket.user.sub,
        totalUsers: allUsers.length,
      });
    } catch (error) {
      logger.error({ err: error, msg: 'Error in presence:leave-room' });
      socket.emit('presence:error', {
        message: 'Failed to leave presence room',
      });
    }
  });

  /**
   * presence:update-status
   * Update status in project presence and rebroadcast list.
   */
  socket.on('presence:update-status', async (data: StatusPayload) => {
    try {
      if (!socket.user?.sub) {
        socket.emit('presence:error', { message: 'Authentication required' });
        return;
      }

      const { roomId: projectId, status } = data;
      if (
        !projectId ||
        !['online', 'away', 'offline'].includes(status)
      ) {
        socket.emit('presence:error', { message: 'Invalid data' });
        return;
      }

      const roomKey = getPresenceRoomKey(projectId);
      const roomUserMap = roomUsers.get(roomKey);

      if (roomUserMap?.has(socket.user.sub)) {
        const userPresence = roomUserMap.get(socket.user.sub)!;
        userPresence.status = status;
        userPresence.lastSeen = new Date().toISOString();
        roomUserMap.set(socket.user.sub, userPresence);

        const allUsers = Array.from(roomUserMap.values());
        io.to(roomKey).emit('presence:room-users', {
          projectId,
          users: allUsers.map((u) => ({
            id: u.id,
            displayName: u.displayName,
          })),
        });
      }
    } catch (error) {
      logger.error({ err: error, msg: 'Error in presence:update-status' });
      socket.emit('presence:error', {
        message: 'Failed to update status',
      });
    }
  });

  /**
   * presence:typing
   * Broadcast simple typing indicator within project room.
   */
  socket.on('presence:typing', async (data: TypingPayload) => {
    try {
      if (!socket.user?.sub) {
        socket.emit('presence:error', { message: 'Authentication required' });
        return;
      }

      const { roomId: projectId, isTyping } = data;
      if (!projectId) {
        socket.emit('presence:error', { message: 'Invalid project id' });
        return;
      }

      const roomKey = getPresenceRoomKey(projectId);
      socket.to(roomKey).emit('presence:typing', {
        projectId,
        userId: socket.user.sub,
        isTyping,
      });
    } catch (error) {
      logger.error({ err: error, msg: 'Error in presence:typing' });
      socket.emit('presence:error', {
        message: 'Failed to update typing state',
      });
    }
  });

  /**
   * presence:cursor
   * File-level cursor broadcast to file room; also updates project presence store.
   */
  socket.on('presence:cursor', async (data: CursorPayload) => {
    try {
      if (!socket.user?.sub) {
        socket.emit('presence:error', { message: 'Authentication required' });
        return;
      }

      const { projectId, fileId, cursor } = data;
      if (!projectId || !fileId) {
        socket.emit('presence:error', {
          message: 'Invalid project or file id',
        });
        return;
      }

      const fileRoomKey = getFileRoomKey(projectId, fileId);
      const presenceRoomKey = getPresenceRoomKey(projectId);

      // Update cursor in project presence map
      const roomUserMap = roomUsers.get(presenceRoomKey);
      if (roomUserMap?.has(socket.user.sub)) {
        const userPresence = roomUserMap.get(socket.user.sub)!;
        userPresence.cursor = cursor;
        userPresence.status = 'online';
        userPresence.lastSeen = new Date().toISOString();
        roomUserMap.set(socket.user.sub, userPresence);
      }

      // Broadcast cursor to all other clients in this file
      socket.to(fileRoomKey).emit('presence:update', {
        projectId,
        fileId,
        userId: socket.user.sub,
        displayName: socket.user.displayName,
        color: generateUserColor(socket.user.sub),
        cursor,
        status: 'online',
      });

      logger.debug({
        msg: 'Cursor update broadcast',
        fileRoomKey,
        userId: socket.user.sub,
        position: cursor,
      });
    } catch (error) {
      logger.error({ err: error, msg: 'Error in presence:cursor' });
      socket.emit('presence:error', {
        message: 'Failed to update cursor',
      });
    }
  });

  /**
   * disconnect
   * Mark user offline in any project rooms they were in and rebroadcast lists.
   */
  socket.on('disconnect', () => {
    if (!socket.user?.sub) return;

    for (const [roomKey, userMap] of roomUsers.entries()) {
      if (userMap.has(socket.user.sub)) {
        const userPresence = userMap.get(socket.user.sub)!;
        userPresence.status = 'offline';
        userPresence.lastSeen = new Date().toISOString();
        userPresence.cursor = undefined;
        userMap.set(socket.user.sub, userPresence);

        const projectId = roomKey.replace('room:', '');
        const allUsers = Array.from(userMap.values());

        io.to(roomKey).emit('presence:room-users', {
          projectId,
          users: allUsers.map((u) => ({
            id: u.id,
            displayName: u.displayName,
          })),
        });
      }
    }
  });
};
