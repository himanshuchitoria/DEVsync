import type { Server } from 'socket.io';
import type { AuthedSocket } from './socketAuth';
import { otEngine } from '../ot-engine/otEngine';
import type {
  DocumentRef,
  ClientOperation,
} from '../ot-engine/engine.interface';
import { logger } from '../config/logger';
import mongoose from 'mongoose';

interface JoinFilePayload {
  projectId: string;
  fileId: string;
}

interface EditPayload {
  projectId: string;
  fileId: string;
  version: number;
  payload: unknown;
}

const getRoomKey = (projectId: string, fileId: string): string =>
  `file:${projectId}:${fileId}`;

const toDocumentRef = (projectId: string, fileId: string): DocumentRef => ({
  projectId: new mongoose.Types.ObjectId(projectId),
  fileId: new mongoose.Types.ObjectId(fileId),
});

// Reuse same color generation as presence
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

export const registerCollaborationHandlers = (
  io: Server,
  socket: AuthedSocket,
): void => {
  /**
   * collab:join-file
   * - Validates ids
   * - Hydrates OT document
   * - Joins file room
   * - Sends snapshot only to joining client
   * - Notifies others that a collaborator joined
   */
  // Improved collaboration handling
  socket.on('collab:join-file', async (data: JoinFilePayload) => {
    try {
      if (!socket.user?.sub) {
        socket.emit('collab:error', { message: 'Authentication required' });
        return;
      }

      const { projectId, fileId } = data;

      if (!projectId || !fileId) {
        socket.emit('collab:error', {
          message: 'Invalid project or file id',
        });
        return;
      }

      if (
        !mongoose.isValidObjectId(projectId) ||
        !mongoose.isValidObjectId(fileId)
      ) {
        socket.emit('collab:error', {
          message: 'Invalid ObjectId format',
        });
        return;
      }

      const doc = toDocumentRef(projectId, fileId);

      // Ensure OT engine has latest state, then fetch snapshot
      await otEngine.hydrate(doc);
      const content = await otEngine.getSnapshot(doc);

      const roomKey = getRoomKey(projectId, fileId);
      await socket.join(roomKey);

      // Send snapshot to joining client only
      socket.emit('collab:joined', {
        projectId,
        fileId,
        content,
        userId: socket.user.sub,
        displayName: socket.user.displayName,
        color: generateUserColor(socket.user.sub),
      });

      // Notify others in room about new collaborator
      socket.to(roomKey).emit('collab:user-joined', {
        projectId,
        fileId,
        userId: socket.user.sub,
        displayName: socket.user.displayName,
        color: generateUserColor(socket.user.sub),
      });

      logger.debug({
        msg: 'User joined file room',
        roomKey,
        userId: socket.user.sub,
        contentLength: content.length,
      });
    } catch (error) {
      logger.error({ err: error, msg: 'Error in collab:join-file' });
      socket.emit('collab:error', { message: 'Failed to join file' });
    }
  });

  /**
   * collab:leave-file
   * - Leaves file room
   * - Notifies others user left
   */
  socket.on('collab:leave-file', async (data: JoinFilePayload) => {
    try {
      const { projectId, fileId } = data;
      if (!projectId || !fileId) return;

      const roomKey = getRoomKey(projectId, fileId);
      await socket.leave(roomKey);

      socket.to(roomKey).emit('collab:user-left', {
        projectId,
        fileId,
        userId: socket.user?.sub || '',
      });

      logger.debug({
        msg: 'User left file room',
        roomKey,
        userId: socket.user?.sub,
      });
    } catch (error) {
      logger.error({ err: error, msg: 'Error in collab:leave-file' });
    }
  });

  /**
   * collab:edit
   * - Validates ids and version
   * - Applies OT operation
   * - Broadcasts resulting content + version to whole file room
   * - Sends ack back to origin client
   *
   * OT engine remains the source of truth; clients do not compute diffs themselves. [web:63][web:66]
   */
  socket.on('collab:edit', async (data: EditPayload) => {
    try {
      if (!socket.user?.sub) {
        socket.emit('collab:error', { message: 'Authentication required' });
        return;
      }

      const { projectId, fileId, version, payload } = data;

      if (!projectId || !fileId) {
        socket.emit('collab:error', {
          message: 'Invalid project or file id',
        });
        return;
      }

      if (
        !mongoose.isValidObjectId(projectId) ||
        !mongoose.isValidObjectId(fileId)
      ) {
        socket.emit('collab:error', {
          message: 'Invalid ObjectId format',
        });
        return;
      }

      if (typeof version !== 'number' || version < 0) {
        socket.emit('collab:error', { message: 'Invalid version' });
        return;
      }

      const doc = toDocumentRef(projectId, fileId);
      const op: ClientOperation = {
        version,
        userId: socket.user.sub,
        payload,
      };

      const result = await otEngine.applyOperation(doc, op);
      const resultContent: string = result.content ?? '';

      const roomKey = getRoomKey(projectId, fileId);

      // Broadcast the resulting content to everyone in the room (including origin)
      io.to(roomKey).emit('collab:remote-edit', {
        projectId,
        fileId,
        version: result.version,
        payload: {
          content: resultContent,
          userId: socket.user.sub,
          displayName: socket.user.displayName,
          color: generateUserColor(socket.user.sub),
        },
      });

      // Ack back to origin client so it can update its local version
      socket.emit('collab:ack', {
        projectId,
        fileId,
        version: result.version,
      });

      logger.debug({
        msg: 'Edit broadcast to room',
        roomKey,
        version: result.version,
        contentLength: resultContent.length,
        userId: socket.user.sub,
      });
    } catch (error) {
      logger.error({ err: error, msg: 'Error in collab:edit', data });
      socket.emit('collab:error', {
        message: 'Failed to apply operation',
      });
    }
  });

  /**
   * collab:cursor
   * (optional – you already use presence:cursor for cursors)
   * If you don’t need a separate collab:cursor channel, you can remove this
   * and keep only presence:cursor. Keeping it here in case some UI listens to it.
   */
  socket.on(
    'collab:cursor',
    async (data: {
      projectId: string;
      fileId: string;
      cursor: { line: number; column: number };
    }) => {
      try {
        if (!socket.user?.sub) return;

        const { projectId, fileId, cursor } = data;
        if (!projectId || !fileId) return;

        const roomKey = getRoomKey(projectId, fileId);

        io.to(roomKey).emit('collab:cursor-update', {
          projectId,
          fileId,
          userId: socket.user.sub,
          displayName: socket.user.displayName,
          color: generateUserColor(socket.user.sub),
          cursor,
        });
      } catch (error) {
        logger.error({ err: error, msg: 'Error in collab:cursor' });
      }
    },
  );
};

