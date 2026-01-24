// frontend/src/context/AuthProvider.tsx
import React, {
  createContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth, type User } from '../hooks/useAuth';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') ||
  window.location.origin;

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<any>;
  logout: () => void;
  socket: Socket | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  // Single socket instance tied to auth.token
  const socket = useMemo<Socket | null>(() => {
    if (!auth.token) return null;

    const s = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token: auth.token },
    });

    if (import.meta.env.DEV) {
      console.debug('[SOCKET] ➜ connecting to', SOCKET_URL);
    }

    return s;
  }, [auth.token]);

  // Basic lifecycle logging and cleanup
  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      if (import.meta.env.DEV) {
        console.debug('[SOCKET] ✅ connected', socket.id);
      }
    };
    const onDisconnect = (reason: string) => {
      if (import.meta.env.DEV) {
        console.warn('[SOCKET] ⛔ disconnected:', reason);
      }
    };
    const onConnectError = (err: Error) => {
      console.error('[SOCKET] ❌ connect_error:', err.message);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    return () => {
      if (import.meta.env.DEV) {
        console.debug('[SOCKET] 🔌 cleanup / disconnect');
      }
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.disconnect();
    };
  }, [socket]);

  // Ensure logout also kills the active socket
  const enhancedLogout = () => {
    if (socket) {
      socket.disconnect();
    }
    auth.logout();
  };

  const value: AuthContextType = {
    user: auth.user,
    token: auth.token,
    isLoading: auth.isLoading,
    login: auth.login,
    register: auth.register,
    logout: enhancedLogout,
    socket,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
