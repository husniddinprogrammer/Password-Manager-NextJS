'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Lock, Search, X } from 'lucide-react';
import { useSession } from '@/context/SessionContext';

interface HeaderProps {
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  title?: string;
}

export default function Header({ searchQuery = '', onSearchChange, title }: HeaderProps) {
  const router = useRouter();
  const { lock } = useSession();
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Keep local state in sync when the parent resets the query (e.g. tab change)
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleSearch = (value: string) => {
    setLocalSearch(value);
    onSearchChange?.(value);
  };

  return (
    <header
      className="h-16 flex items-center justify-between px-6 flex-shrink-0"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
    >
      {/* Left: title or search */}
      {title ? (
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h1>
      ) : (
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--text-secondary)' }}
          />
          <input
            type="text"
            placeholder="Search credentials..."
            value={localSearch}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2 text-sm rounded-lg transition-colors focus:outline-none"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
          {localSearch && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-secondary)' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Right: actions */}
      <div className="flex items-center gap-3 ml-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push('/vault/add')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ background: 'var(--primary)' }}
        >
          <Plus className="w-4 h-4" />
          Add Credential
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => lock()}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)', background: 'var(--card)', border: '1px solid var(--border)' }}
          title="Lock vault"
        >
          <Lock className="w-4 h-4" />
        </motion.button>
      </div>
    </header>
  );
}
