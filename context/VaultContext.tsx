'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { DecryptedCredential, ActivityAction } from '@/lib/types';

interface VaultContextValue {
  credentials: DecryptedCredential[];
  isLoading: boolean;
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

  const refreshCredentials = useCallback(async () => {
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
        canEdit?: boolean;
        isReused?: boolean;
        strength?: number;
      }[]).map((c) => {
        return {
          ...c,
          scope: c.scope ?? 'personal',
          teamId: c.teamId ?? null,
          teamName: c.teamName ?? null,
          canEdit: c.canEdit ?? false,
          isReused: c.isReused ?? false,
          strength: c.strength,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        };
      });
      setCredentials(decrypted);
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
