'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import { UserInfo } from '@/lib/types';
import { useVault } from './VaultContext';

interface SessionContextValue {
  isUnlocked: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserInfo | null;
  lastActivity: number;
  updateActivity: () => void;
  login: (identifier: string, masterPassword: string) => Promise<void>;
  register: (username: string, email: string, displayName: string, masterPassword: string) => Promise<void>;
  unlock: (masterPassword: string) => Promise<void>;
  lock: () => void;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { refreshCredentials } = useVault();

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoLockMsRef = useRef(15 * 60 * 1000);

  // ── helpers ──────────────────────────────────────────────────────────────

  const clearLockTimer = useCallback(() => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
  }, []);

  const resetLockTimer = useCallback(
    (onFire: () => void) => {
      clearLockTimer();
      lockTimerRef.current = setTimeout(onFire, autoLockMsRef.current);
    },
    [clearLockTimer]
  );

  // ── lock (keep JWT, just clear the key) ───────────────────────────────────

  const lock = useCallback(() => {
    clearLockTimer();
    sessionStorage.removeItem('vault-unlocked');
    setIsUnlocked(false);
    router.push('/');
  }, [clearLockTimer, router]);

  // ── logout (clear everything) ────────────────────────────────────────────

  const logout = useCallback(async () => {
    clearLockTimer();
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    sessionStorage.removeItem('vault-unlocked');
    setIsUnlocked(false);
    setIsAuthenticated(false);
    setUser(null);
    router.push('/login');
  }, [clearLockTimer, router]);

  // ── unlock (lock screen: re-derive key, already have JWT) ─────────────────

  const unlock = useCallback(
    async (masterPassword: string) => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/auth/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ masterPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Unlock failed');

        sessionStorage.setItem('vault-unlocked', 'true');
        setIsUnlocked(true);
        setLastActivity(Date.now());
        resetLockTimer(lock);
        await refreshCredentials();
        router.push('/vault');
      } finally {
        setIsLoading(false);
      }
    },
    [refreshCredentials, resetLockTimer, lock, router]
  );

  // ── login (full auth + key derivation) ───────────────────────────────────

  const login = useCallback(
    async (identifier: string, masterPassword: string) => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, masterPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');

        setUser(data.user as UserInfo);
        setIsAuthenticated(true);

        sessionStorage.setItem('vault-unlocked', 'true');
        setIsUnlocked(true);
        setLastActivity(Date.now());
        resetLockTimer(lock);
        await refreshCredentials();
        router.push('/vault');
      } finally {
        setIsLoading(false);
      }
    },
    [refreshCredentials, resetLockTimer, lock, router]
  );

  // ── register (create account + auto-login) ────────────────────────────────

  const register = useCallback(
    async (username: string, email: string, displayName: string, masterPassword: string) => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, displayName, masterPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');

        setUser(data.user as UserInfo);
        setIsAuthenticated(true);

        sessionStorage.setItem('vault-unlocked', 'true');
        setIsUnlocked(true);
        setLastActivity(Date.now());
        resetLockTimer(lock);
        router.push('/vault');
      } finally {
        setIsLoading(false);
      }
    },
    [resetLockTimer, lock, router]
  );

  // ── on mount: restore session if JWT + sessionStorage key exist ───────────

  useEffect(() => {
    const VALID_MINUTES = [5, 15, 30, 60];
    const saved = parseInt(sessionStorage.getItem('autoLockMinutes') ?? '', 10);
    const mins = VALID_MINUTES.includes(saved) ? saved : 15;
    autoLockMsRef.current = mins * 60 * 1000;

    const restore = async () => {
      try {
        const res = await fetch('/api/auth/check');
        const data = await res.json();
        if (!data.isAuthenticated) return;

        setIsAuthenticated(true);
        setUser(data.user as UserInfo);

        const unlocked = sessionStorage.getItem('vault-unlocked');
        if (unlocked) {
          setIsUnlocked(true);
          resetLockTimer(lock);
          await refreshCredentials();
        }
      } catch { /* ignore */ }
    };
    restore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── activity tracking ─────────────────────────────────────────────────────

  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
    if (isUnlocked) resetLockTimer(lock);
  }, [isUnlocked, resetLockTimer, lock]);

  useEffect(() => {
    if (!isUnlocked) return;
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handler = () => updateActivity();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, handler));
  }, [isUnlocked, updateActivity]);

  return (
    <SessionContext.Provider
      value={{
        isUnlocked,
        isAuthenticated,
        isLoading,
        user,
        lastActivity,
        updateActivity,
        login,
        register,
        unlock,
        lock,
        logout,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
