'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/lib/auth';

export interface AuthUser {
  id:       string;
  email:    string;
  name:     string;
  role:     UserRole;
  tokenExp: number;
}

interface AuthState {
  user:    AuthUser | null;
  loading: boolean;
  error:   string | null;
}

// Auto-refresh interval — check every 5 minutes
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export function useAuth(options?: { redirectTo?: string; requiredRole?: UserRole }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null });

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.status === 401) {
        setState({ user: null, loading: false, error: null });
        if (options?.redirectTo) router.replace(options.redirectTo);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch session');
      const user = await res.json() as AuthUser;

      // Role guard
      if (options?.requiredRole) {
        const levels: Record<UserRole, number> = { ENGINEER: 1, ADMIN: 2, MANAGER: 3 };
        if ((levels[user.role] ?? 0) < (levels[options.requiredRole] ?? 0)) {
          router.replace('/dashboard');
          return;
        }
      }

      setState({ user, loading: false, error: null });
    } catch (e) {
      setState({ user: null, loading: false, error: e instanceof Error ? e.message : 'Auth error' });
    }
  }, [options?.redirectTo, options?.requiredRole]);

  const refresh = useCallback(async () => {
    try {
      await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
    } catch { /* silent */ }
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setState({ user: null, loading: false, error: null });
    router.replace('/auth/login');
  }, [router]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Auto-refresh token every 5 minutes
  useEffect(() => {
    const id = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Refresh when tab becomes visible again (user returns after idle)
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  return { ...state, logout, refetch: fetchUser };
}
