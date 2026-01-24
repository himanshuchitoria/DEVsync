import { useContext } from 'react';
import { AuthContext } from './AuthProvider';
import type { AuthContextType } from './AuthProvider';

export function useAuthContext(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return ctx;
}
