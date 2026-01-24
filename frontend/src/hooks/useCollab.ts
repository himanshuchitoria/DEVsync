// frontend/src/hooks/useCollab.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { useAuthContext } from '../context/useAuthContext';
import type { CollabJoinPayload } from '../types/api';

export interface CollabUser {
  id: string;
  displayName: string;
  color: string;
  cursor?: { line: number; column: number } | null;
  active: boolean;
}

export interface CollabState {
  isConnected: boolean;
  users: CollabUser[];     // project-level users (online in this project)
  fileUsers: CollabUser[]; // users currently in this file (cursor presence)
}

/**
 * Collaborative editing hook (project + file presence).
 *
 * - One hook instance per project.
 * - Call setActiveFile(fileId) whenever the active file changes.
 */
export const useCollab = (
  projectId: string,
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>,
) => {
  const { user, socket } = useAuthContext();

  const [state, setState] = useState<CollabState>({
    isConnected: false,
    users: [],
    fileUsers: [],
  });

  // Current active file on this client.
  const currentFileIdRef = useRef<string>('');

  // OT version for the active file.
  const versionRef = useRef(0);

  // Presence (file-level) – remote users with cursors.
  const filePresenceRef = useRef<Map<string, CollabUser>>(new Map());

  // Project-level presence – users online in this project.
  const projectUsersRef = useRef<Map<string, CollabUser>>(new Map());

  // Decorations per remote user for cursor rendering.
  const cursorDecorationsRef = useRef<Map<string, string[]>>(new Map());

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const applyRemoteContent = useCallback(
    (content: string) => {
      const editor = editorRef.current;
      if (!editor) return;

      const model = editor.getModel();
      if (!model) return;

      const fullRange = model.getFullModelRange();
      model.pushEditOperations(
        [],
        [
          {
            range: fullRange,
            text: content,
            forceMoveMarkers: true,
          },
        ],
        () => null,
      );
    },
    [editorRef],
  );

  const updateRemoteCursorDecoration = useCallback(
    (userId: string, cursor: { line: number; column: number }, color: string) => {
      const editor = editorRef.current;
      if (!editor) return;
      const model = editor.getModel();
      if (!model) return;

      const position = new monaco.Position(cursor.line + 1, cursor.column);
      const range = new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column + 1,
      );

      const prevDecorations = cursorDecorationsRef.current.get(userId) ?? [];

      const newDecorations = editor.deltaDecorations(prevDecorations, [
        {
          range,
          options: {
            className: 'remote-cursor',
            stickiness:
              monaco.editor.TrackedRangeStickiness
                .NeverGrowsWhenTypingAtEdges,
            overviewRuler: {
              color,
              position: monaco.editor.OverviewRulerLane.Center,
            },
          },
        },
      ]);

      cursorDecorationsRef.current.set(userId, newDecorations);
    },
    [editorRef],
  );

  const clearAllRemoteDecorations = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    cursorDecorationsRef.current.forEach((ids) => {
      editor.deltaDecorations(ids, []);
    });
    cursorDecorationsRef.current.clear();
  }, [editorRef]);

  // ---------------------------------------------------------------------------
  // Socket event handlers
  // ---------------------------------------------------------------------------

  const registerSocketHandlers = useCallback(() => {
    if (!socket || !user) return;

    // 1) Project-level presence (who is online in this project)
    const handleRoomUsers = (data: {
      projectId: string;
      users: { id: string; displayName: string }[];
    }) => {
      if (data.projectId !== projectId) return;

      const mapped = data.users.map<CollabUser>((u) => ({
        id: u.id,
        displayName: u.displayName,
        color: getUserColor(u.id),
        cursor: null,
        active: true,
      }));

      projectUsersRef.current = new Map(mapped.map((u) => [u.id, u]));

      setState((prev) => ({
        ...prev,
        users: mapped,
      }));
    };

    const handleRoomUserJoined = (data: {
      projectId: string;
      user: { id: string; displayName: string };
    }) => {
      if (data.projectId !== projectId) return;
      const u: CollabUser = {
        id: data.user.id,
        displayName: data.user.displayName,
        color: getUserColor(data.user.id),
        cursor: null,
        active: true,
      };
      projectUsersRef.current.set(u.id, u);
      setState((prev) => ({
        ...prev,
        users: Array.from(projectUsersRef.current.values()),
      }));
    };

    const handleRoomUserLeft = (data: {
      projectId: string;
      userId: string;
    }) => {
      if (data.projectId !== projectId) return;
      projectUsersRef.current.delete(data.userId);
      setState((prev) => ({
        ...prev,
        users: Array.from(projectUsersRef.current.values()),
      }));
    };

    // 2) Collaboration join + edits for the current file
    const handleJoined = (data: CollabJoinPayload & { content: string }) => {
      if (data.projectId !== projectId) return;
      if (data.fileId !== currentFileIdRef.current) return;

      applyRemoteContent(data.content);
      // Start from version 0 on join; server will drive via collab:ack
      versionRef.current = 0;

      setState((prev) => ({ ...prev, isConnected: true }));
    };

    const handleRemoteEdit = (payload: {
      projectId: string;
      fileId: string;
      version: number;
      payload: { content?: string; userId: string };
    }) => {
      if (
        payload.projectId !== projectId ||
        payload.fileId !== currentFileIdRef.current
      ) {
        return;
      }

      const content = payload.payload?.content;
      if (typeof content === 'string') {
        applyRemoteContent(content);
        versionRef.current = payload.version;
      }
    };

    const handleCollabAck = (data: {
      projectId: string;
      fileId: string;
      version: number;
    }) => {
      if (
        data.projectId === projectId &&
        data.fileId === currentFileIdRef.current
      ) {
        versionRef.current = data.version;
      }
    };

    const handlePresenceUpdate = (data: {
      projectId: string;
      fileId: string;
      userId: string;
      displayName: string;
      color: string;
      cursor: { line: number; column: number };
    }) => {
      if (
        data.projectId !== projectId ||
        data.fileId !== currentFileIdRef.current ||
        data.userId === user.id
      ) {
        return;
      }

      const existing = filePresenceRef.current.get(data.userId);
      const updated: CollabUser = {
        id: data.userId,
        displayName: data.displayName,
        color: data.color,
        cursor: data.cursor,
        active: true,
      };

      (updated as any).lastUpdate =
        (existing as any)?.lastUpdate ?? Date.now();

      filePresenceRef.current.set(data.userId, updated);
      updateRemoteCursorDecoration(data.userId, data.cursor, data.color);

      const now = Date.now();
      // prune stale cursors
      filePresenceRef.current.forEach((u, uid) => {
        const last = (u as any).lastUpdate ?? now;
        if (now - last > 5000) {
          filePresenceRef.current.delete(uid);
          const editor = editorRef.current;
          if (editor) {
            const ids = cursorDecorationsRef.current.get(uid) ?? [];
            editor.deltaDecorations(ids, []);
            cursorDecorationsRef.current.delete(uid);
          }
        }
      });

      setState((prev) => ({
        ...prev,
        fileUsers: Array.from(filePresenceRef.current.values()),
      }));
    };

    const handleConnect = () => {
      setState((prev) => ({ ...prev, isConnected: true }));
      // join project presence room on connect
      socket.emit('presence:join-room', { roomId: projectId });
    };

    const handleDisconnect = () => {
      setState((prev) => ({ ...prev, isConnected: false }));
      clearAllRemoteDecorations();
      filePresenceRef.current.clear();
    };

    const handleCollabError = (error: { message: string }) => {
      // eslint-disable-next-line no-console
      console.error('Collab error:', error.message);
    };

    socket.on('presence:room-users', handleRoomUsers);
    socket.on('presence:user-joined', handleRoomUserJoined);
    socket.on('presence:user-left', handleRoomUserLeft);

    socket.on('collab:joined', handleJoined);
    socket.on('collab:remote-edit', handleRemoteEdit);
    socket.on('collab:ack', handleCollabAck);
    socket.on('presence:update', handlePresenceUpdate);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('collab:error', handleCollabError);

    (socket as any)._collabHandlers = {
      handleRoomUsers,
      handleRoomUserJoined,
      handleRoomUserLeft,
      handleJoined,
      handleRemoteEdit,
      handleCollabAck,
      handlePresenceUpdate,
      handleConnect,
      handleDisconnect,
      handleCollabError,
    };
  }, [
    socket,
    user,
    projectId,
    applyRemoteContent,
    updateRemoteCursorDecoration,
    clearAllRemoteDecorations,
    editorRef,
  ]);

  const unregisterSocketHandlers = useCallback(() => {
    if (!socket) return;
    const h = (socket as any)._collabHandlers;
    if (!h) return;

    socket.off('presence:room-users', h.handleRoomUsers);
    socket.off('presence:user-joined', h.handleRoomUserJoined);
    socket.off('presence:user-left', h.handleRoomUserLeft);

    socket.off('collab:joined', h.handleJoined);
    socket.off('collab:remote-edit', h.handleRemoteEdit);
    socket.off('collab:ack', h.handleCollabAck);
    socket.off('presence:update', h.handlePresenceUpdate);
    socket.off('connect', h.handleConnect);
    socket.off('disconnect', h.handleDisconnect);
    socket.off('collab:error', h.handleCollabError);

    delete (socket as any)._collabHandlers;
  }, [socket]);

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  const setActiveFile = useCallback(
    (fileId: string | null | undefined) => {
      if (!socket || !user || !projectId || !fileId) return;
      if (currentFileIdRef.current === fileId) return;

      currentFileIdRef.current = fileId;
      versionRef.current = 0;
      filePresenceRef.current.clear();
      clearAllRemoteDecorations();
      setState((prev) => ({ ...prev, fileUsers: [] }));

      socket.emit('collab:join-file', { projectId, fileId });
    },
    [socket, user, projectId, clearAllRemoteDecorations],
  );

  const sendEdit = useCallback(
    (op: any) => {
      if (!socket || !projectId || !currentFileIdRef.current) return;

      socket.emit('collab:edit', {
        projectId,
        fileId: currentFileIdRef.current,
        version: versionRef.current + 1,
        payload: op,
      });
    },
    [socket, projectId],
  );

  const updateCursor = useCallback(
    (cursor: { line: number; column: number }) => {
      if (!socket || !user || !projectId || !currentFileIdRef.current) return;

      socket.emit('presence:cursor', {
        projectId,
        fileId: currentFileIdRef.current,
        cursor,
        userId: user.id,
        displayName: user.displayName,
        color: getUserColor(user.id),
      });
    },
    [socket, user, projectId],
  );

  const leaveCollab = useCallback(() => {
    if (socket && projectId && currentFileIdRef.current) {
      socket.emit('collab:leave-file', {
        projectId,
        fileId: currentFileIdRef.current,
      });
      socket.emit('presence:leave-room', { roomId: projectId });
    }

    unregisterSocketHandlers();
    projectUsersRef.current.clear();
    filePresenceRef.current.clear();
    clearAllRemoteDecorations();
    setState({ isConnected: false, users: [], fileUsers: [] });
  }, [socket, projectId, unregisterSocketHandlers, clearAllRemoteDecorations]);

  // Register / unregister handlers once per socket/user.
  useEffect(() => {
    if (!socket || !user) return;
    registerSocketHandlers();
    return () => {
      leaveCollab();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, user, registerSocketHandlers]);

  // Local editor listeners (cursor + content).
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const cursorDisposable = editor.onDidChangeCursorPosition(() => {
      const position = editor.getPosition();
      if (position) {
        updateCursor({
          line: position.lineNumber - 1,
          column: position.column,
        });
      }
    });

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const contentDisposable = editor.onDidChangeModelContent(() => {
      if (!currentFileIdRef.current) return;
      if (timeout) clearTimeout(timeout);

      timeout = setTimeout(() => {
        const content = editor.getValue();
        sendEdit({ type: 'replace', content });
      }, 200);
    });

    return () => {
      cursorDisposable.dispose();
      contentDisposable.dispose();
      if (timeout) clearTimeout(timeout);
    };
  }, [editorRef, updateCursor, sendEdit]);

  return {
    isConnected: state.isConnected,
    users: state.users,
    fileUsers: state.fileUsers,
    setActiveFile,
    sendEdit,
    updateCursor,
    leaveCollab,
  };
};

// Deterministic color per user (like many editors do)
const getUserColor = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
};
