'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { DecryptedCredential, ActivityAction } from '@/lib/types';
import { decryptCredentialFields } from '@/lib/crypto';

interface VaultContextValue {
  credentials: DecryptedCredential[];
  isLoading: boolean;
  encryptionKey: string | null;
  setEncryptionKey: (key: string | null) => void;
  refreshCredentials: () => Promise<void>;
  addActivityLog: (
    action: ActivityAction,
    credentialId?: string,
    credName?: string
  ) => Promise<void>;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [credentials, setCredentials] = useState<DecryptedCredential[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [encryptionKey, setEncryptionKeyState] = useState<string | null>(null);
  const keyRef = useRef<string | null>(null);

  const setEncryptionKey = useCallback((key: string | null) => {
    keyRef.current = key;
    setEncryptionKeyState(key);
    if (key) {
      sessionStorage.setItem('vk', key);
    } else {
      sessionStorage.removeItem('vk');
    }
  }, []);

  // Restore key from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('vk');
    if (stored) {
      keyRef.current = stored;
      setEncryptionKeyState(stored);
    }
  }, []);

  const refreshCredentials = useCallback(async () => {
    const key = keyRef.current;
    if (!key) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/credentials');
      if (!res.ok) return;
      const { data } = await res.json();

      const decrypted: DecryptedCredential[] = (data as {
        id: string;
        userId: string;
        name: string;
        url: string | null;
        username: string;
        password: string;
        notes: string | null;
        category: string;
        tags: string[];
        scope: string;
        teamId: string | null;
        teamName: string | null;
        createdAt: string;
        updatedAt: string;
      }[]).map((c) => {
        const fields = decryptCredentialFields(
          { username: c.username, password: c.password, notes: c.notes },
          key
        );
        return {
          ...c,
          ...fields,
          scope: c.scope ?? 'personal',
          teamId: c.teamId ?? null,
          teamName: c.teamName ?? null,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        };
      });

      // Mark reused passwords
      const passwordCounts = new Map<string, number>();
      decrypted.forEach((c) => {
        if (c.password) {
          passwordCounts.set(c.password, (passwordCounts.get(c.password) || 0) + 1);
        }
      });
      const withReused = decrypted.map((c) => ({
        ...c,
        isReused: (passwordCounts.get(c.password) || 0) > 1,
      }));

      setCredentials(withReused);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addActivityLog = useCallback(
    async (action: ActivityAction, credentialId?: string, credName?: string) => {
      try {
        await fetch('/api/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, credentialId, credName }),
        });
      } catch {
        // Non-critical, swallow error
      }
    },
    []
  );

  return (
    <VaultContext.Provider
      value={{
        credentials,
        isLoading,
        encryptionKey,
        setEncryptionKey,
        refreshCredentials,
        addActivityLog,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault must be used inside VaultProvider');
  return ctx;
}
