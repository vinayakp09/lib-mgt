import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, onUnauthorized, setAuthToken } from './api';
import type { Role, Session } from './types';

export const SESSION_STORAGE_KEY = 'lms.session';

interface AuthContextValue {
  session: Session | null;
  isAdmin: boolean;
  /** Set when the previous session ended because the server rejected the token. */
  notice: string | null;
  login: (role: Role, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): Session | null {
  try {
    const stored = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? 'null');
    if ((stored?.role === 'admin' || stored?.role === 'user') && typeof stored.token === 'string') {
      return { role: stored.role, token: stored.token };
    }
  } catch {
    // corrupted entry: treat as logged out
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const stored = readStoredSession();
    // Set synchronously so the first page fetches already carry the token.
    setAuthToken(stored?.token ?? null);
    return stored;
  });
  const [notice, setNotice] = useState<string | null>(null);

  const endSession = useCallback((message: string | null) => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setAuthToken(null);
    setSession(null);
    setNotice(message);
  }, []);

  const login = useCallback(async (role: Role, password: string) => {
    const result = await api.login(role, password);
    const next: Session = { role: result.role, token: result.token };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
    setAuthToken(next.token);
    setNotice(null);
    setSession(next);
  }, []);

  const logout = useCallback(() => endSession(null), [endSession]);

  useEffect(
    () => onUnauthorized(() => endSession('Your session has expired. Please log in again.')),
    [endSession],
  );

  const value = useMemo(
    () => ({ session, isAdmin: session?.role === 'admin', notice, login, logout }),
    [session, notice, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
