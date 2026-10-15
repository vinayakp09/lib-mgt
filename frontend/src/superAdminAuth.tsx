import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { api, setAuthToken } from './api';
import type { SuperAdminSession } from './types';

export const SUPER_ADMIN_SESSION_KEY = 'lms.super.session';

interface SuperAdminAuthContextValue {
  session: SuperAdminSession | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const SuperAdminAuthContext = createContext<SuperAdminAuthContextValue | null>(null);

function readStoredSession(): SuperAdminSession | null {
  try {
    const stored = JSON.parse(localStorage.getItem(SUPER_ADMIN_SESSION_KEY) ?? 'null');
    if (stored?.kind === 'super_admin' && typeof stored.token === 'string') {
      return stored as SuperAdminSession;
    }
  } catch {
    // ignore
  }
  return null;
}

export function SuperAdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SuperAdminSession | null>(() => {
    const stored = readStoredSession();
    setAuthToken(stored?.token ?? null);
    return stored;
  });

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.superAdminLogin(email, password);
    const next: SuperAdminSession = { kind: 'super_admin', token: result.token };
    localStorage.setItem(SUPER_ADMIN_SESSION_KEY, JSON.stringify(next));
    setAuthToken(next.token);
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
    setAuthToken(null);
    setSession(null);
  }, []);

  const value = useMemo(() => ({ session, login, logout }), [session, login, logout]);

  return <SuperAdminAuthContext.Provider value={value}>{children}</SuperAdminAuthContext.Provider>;
}

export function useSuperAdminAuth(): SuperAdminAuthContextValue {
  const context = useContext(SuperAdminAuthContext);
  if (!context) {
    throw new Error('useSuperAdminAuth must be used inside <SuperAdminAuthProvider>');
  }
  return context;
}
