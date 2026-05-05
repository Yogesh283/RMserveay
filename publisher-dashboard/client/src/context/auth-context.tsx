'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apiFetch, getToken, setToken } from '@/lib/api';
import type { User } from '@/types';

type AuthUser = User & { balanceUsd?: number };

const AuthContext = createContext<{
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { name: string; email: string; password: string; company?: string }) => Promise<void>;
  logout: () => void;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const t = getToken();
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<{ user: AuthUser & { id: string } }>('/api/auth/me');
      setUser({
        ...data.user,
        id: String(data.user.id),
      });
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ token: string; user: AuthUser & { id: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      auth: false,
    });
    setToken(data.token);
    setUser({ ...data.user, id: String(data.user.id) });
  }, []);

  const register = useCallback(
    async (payload: { name: string; email: string; password: string; company?: string }) => {
      const data = await apiFetch<{ token: string; user: AuthUser & { id: string } }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(payload),
          auth: false,
        },
      );
      setToken(data.token);
      setUser({ ...data.user, id: String(data.user.id) });
    },
    [],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, refresh, login, register, logout }),
    [user, loading, refresh, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
