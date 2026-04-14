'use client';

import { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useVault } from '@/context/VaultContext';
import CredentialCard from './CredentialCard';
import EmptyState from './EmptyState';
import FilterBar from './FilterBar';
import { DecryptedCredential } from '@/lib/types';

interface CredentialListProps {
  searchQuery: string;
  scopeFilter?: string; // 'all' | 'personal' | teamId
}

export default function CredentialList({ searchQuery, scopeFilter = 'all' }: CredentialListProps) {
  const { credentials, isLoading, refreshCredentials } = useVault();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result: DecryptedCredential[] = credentials;

    if (scopeFilter === 'personal') {
      result = result.filter((c) => c.scope === 'personal');
    } else if (scopeFilter !== 'all') {
      result = result.filter((c) => c.scope === 'team' && c.teamId === scopeFilter);
    }

    if (selectedCategory) {
      result = result.filter((c) => c.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.username.toLowerCase().includes(q) ||
          (c.url && c.url.toLowerCase().includes(q)) ||
          c.category.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [credentials, searchQuery, selectedCategory, scopeFilter]);

  const handleDelete = async (id: string) => {
    await refreshCredentials();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-7 w-20 rounded-full animate-pulse flex-shrink-0"
              style={{ background: 'var(--card)' }}
            />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-64 rounded-xl animate-pulse"
              style={{ background: 'var(--card)' }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {credentials.length > 0 && (
        <FilterBar
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      )}

      {filtered.length === 0 ? (
        <EmptyState hasSearch={searchQuery.length > 0 || !!selectedCategory} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((credential) => (
              <CredentialCard
                key={credential.id}
                credential={credential}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
