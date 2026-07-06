import { useContext } from 'react';
import { AuthContext } from './auth-context-value.js';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('AuthProvider is missing');
  }
  return ctx;
}
