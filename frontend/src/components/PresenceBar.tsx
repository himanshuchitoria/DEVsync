// frontend/src/components/PresenceBar.tsx
import React, { useMemo } from 'react';
import { useAuthContext } from '../context/useAuthContext';

interface CollabUser {
  id: string;
  displayName: string;
  color?: string;
}

interface FileUser extends CollabUser {
  cursor?: { line: number; column: number } | null;
}

interface PresenceUser {
  id: string;
  displayName: string;
  color: string;
  status: 'online' | 'offline' | 'away';
  cursor?: { line: number; column: number } | null;
}

interface PresenceBarProps {
  // Project-level users from useCollab.users (online in this project)
  users: CollabUser[];
  // File-level users from useCollab.fileUsers (actively in this file with cursors)
  fileUsers?: FileUser[];
  isConnected: boolean;
  projectId: string;
}

/**
 * Presence bar:
 * - Pure presentational component; no direct socket access.
 * - Renders project-level collaborators and highlights file-level activity.
 */
const PresenceBar: React.FC<PresenceBarProps> = ({
  users,
  fileUsers = [],
  isConnected,
  projectId,
}) => {
  const { user: currentAuthUser } = useAuthContext();

  const currentUser = useMemo(() => {
    if (!currentAuthUser) return null;
    return {
      id: currentAuthUser.id,
      displayName:
        currentAuthUser.displayName ||
        currentAuthUser.id.slice(-4),
      color: '#3b82f6',
      status: 'online' as const,
    };
  }, [currentAuthUser]);

  // Index file-level presence by user id for quick lookup
  const filePresenceById = useMemo(() => {
    const map = new Map<string, FileUser>();
    fileUsers.forEach((u) => map.set(u.id, u));
    return map;
  }, [fileUsers]);

  // Merge project-level users with file-level cursor info
  const presenceUsers = useMemo<PresenceUser[]>(() => {
    const merged: PresenceUser[] = users.map((u) => {
      const filePresence = filePresenceById.get(u.id);
      return {
        id: u.id,
        displayName: u.displayName,
        color: u.color || generateUserColor(u.id),
        status: 'online',
        cursor: filePresence?.cursor ?? null,
      };
    });

    // Ensure current user is present even if not in users array yet
    if (currentUser && !merged.some((u) => u.id === currentUser.id)) {
      merged.push({
        id: currentUser.id,
        displayName: currentUser.displayName,
        color: currentUser.color,
        status: currentUser.status,
        cursor: null,
      });
    }

    return merged;
  }, [users, filePresenceById, currentUser]);

  // Sorted: current user first, then online > away > offline
  const allUsers = useMemo(() => {
    const order = { online: 0, away: 1, offline: 2 };
    return [...presenceUsers].sort((a, b) => {
      if (currentUser) {
        if (a.id === currentUser.id) return -1;
        if (b.id === currentUser.id) return 1;
      }
      return (order[a.status] ?? 2) - (order[b.status] ?? 2);
    });
  }, [presenceUsers, currentUser]);

  const statusGroups = useMemo(() => {
    const groups: Record<PresenceUser['status'], PresenceUser[]> = {
      online: [],
      away: [],
      offline: [],
    };
    allUsers.forEach((u) => {
      groups[u.status].push(u);
    });
    return groups;
  }, [allUsers]);

  const getStatusIcon = (status: PresenceUser['status']): string => {
    const icons: Record<PresenceUser['status'], string> = {
      online: 'bg-emerald-400',
      away: 'bg-yellow-400',
      offline: 'bg-gray-500',
    };
    return icons[status];
  };

  const getStatusLabel = (status: PresenceUser['status']): string => {
    const labels: Record<PresenceUser['status'], string> = {
      online: 'Online',
      away: 'Away',
      offline: 'Offline',
    };
    return labels[status];
  };

  const formatCursorPosition = (cursor?: {
    line: number;
    column: number;
  }): string => (cursor ? `L${cursor.line + 1}:${cursor.column + 1}` : '');

  // Debug (temporary; keep while stabilising)
  console.log('[PRESENCE] Render', {
    projectId: projectId.slice(-8),
    users: users.length,
    fileUsers: fileUsers.length,
    allUsers: allUsers.length,
    isConnected,
  });

  // If connected but no collaborators yet
  if (allUsers.length === 0 && isConnected) {
    return (
      <div className="absolute bottom-4 right-4 z-40 w-80 max-h-80 overflow-y-auto rounded-2xl border border-gray-800 bg-gray-900/95 p-4 shadow-2xl backdrop-blur-xl">
        <div className="text-center py-8 text-xs text-gray-500">
          <div className="h-2.5 w-2.5 rounded-full mx-auto mb-2 bg-emerald-400 animate-pulse" />
          <p>No collaborators yet</p>
          <p className="text-[10px] mt-1 opacity-75">
            Room: {projectId.slice(-8)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 right-4 z-40 w-80 max-h-80 overflow-y-auto rounded-2xl border border-gray-800 bg-gray-900/95 p-4 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center space-x-2 text-sm font-semibold text-white">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
            }`}
          />
          <span>Live Collaborators ({allUsers.length})</span>
        </h3>
        <div className="flex space-x-1">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <div
            className="h-2 w-2 animate-pulse rounded-full bg-emerald-400"
            style={{ animationDelay: '200ms' }}
          />
          <div
            className="h-2 w-2 animate-pulse rounded-full bg-emerald-400"
           
          />
        </div>
      </div>

      {/* Status groups */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {(Object.keys(statusGroups) as PresenceUser['status'][]).map(
          (statusKey) => {
            const groupUsers = statusGroups[statusKey];
            if (groupUsers.length === 0) return null;

            return (
              <div key={statusKey}>
                <div className="mb-2 flex items-center space-x-2 px-1">
                  <div
                    className={`h-2 w-2 rounded-full ${getStatusIcon(
                      statusKey,
                    )}`}
                  />
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    {getStatusLabel(statusKey)} ({groupUsers.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {groupUsers.map((u) => {
                    const isCurrentUser =
                      !!currentUser && u.id === currentUser.id;
                    const initials = (u.displayName || u.id.slice(-4))
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <div
                        key={u.id}
                        className={`group flex cursor-default items-center space-x-3 rounded-xl border border-transparent p-3 transition-all duration-200 hover:border-gray-700 hover:bg-gray-800/50 ${
                          isCurrentUser ? 'ring-2 ring-blue-500/30' : ''
                        }`}
                      >
                        <div
                          className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border-2 text-xs font-semibold shadow-lg"
                          style={{
                            backgroundColor: u.color,
                            borderColor:
                              u.status === 'online' ? u.color : '#4b5563',
                          }}
                        >
                          {u.status === 'online' && u.cursor && (
                            <div className="absolute -top-1 -right-1 h-3 w-3 animate-ping rounded-full border-2 border-gray-900 bg-white" />
                          )}
                          <span>{initials}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm font-medium transition-colors ${
                              isCurrentUser
                                ? 'text-blue-400'
                                : 'text-white group-hover:text-emerald-400'
                            }`}
                            title={u.displayName || u.id}
                          >
                            {isCurrentUser
                              ? 'You'
                              : u.displayName || u.id.slice(-4)}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            {u.cursor && u.status === 'online' && (
                              <span className="font-mono bg-gray-800/50 px-1.5 py-0.5 rounded">
                                {formatCursorPosition(u.cursor)}
                              </span>
                            )}
                            <span>
                              {u.status === 'online'
                                ? u.cursor
                                  ? 'editing'
                                  : 'viewing'
                                : getStatusLabel(u.status)}
                            </span>
                            {!isCurrentUser && (
                              <span>• {u.id.slice(-6)}</span>
                            )}
                          </div>
                        </div>
                        {u.status === 'online' && !u.cursor && (
                          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          },
        )}

        {allUsers.length === 0 && !isConnected && (
          <div className="py-6 text-center text-xs text-gray-500">
            <svg
              className="mx-auto mb-2 h-6 w-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p>Connecting...</p>
          </div>
        )}
      </div>

      {/* Cursor color legend */}
      {allUsers.filter((u) => !currentUser || u.id !== currentUser.id).length >
        1 && (
        <div className="mt-4 border-t border-gray-800 pt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
            Cursor Colors
          </p>
          <div className="max-h-16 space-y-1 overflow-y-auto">
            {allUsers
              .filter((u) => !currentUser || u.id !== currentUser.id)
              .slice(0, 6)
              .map((u) => (
                <div key={u.id} className="flex items-center space-x-2">
                  <div
                    className="h-3 w-3 rounded-full border border-gray-800 shadow-sm"
                    style={{ backgroundColor: u.color }}
                  />
                  <span className="max-w-[80px] truncate text-xs text-gray-500">
                    {u.displayName?.slice(0, 10) || u.id.slice(-4)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Same deterministic palette as backend
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

export default PresenceBar;
