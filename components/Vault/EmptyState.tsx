'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, ShieldCheck } from 'lucide-react';

interface EmptyStateProps {
  hasSearch?: boolean;
}

export default function EmptyState({ hasSearch = false }: EmptyStateProps) {
  const router = useRouter();

  if (hasSearch) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          No results found
        </p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      {/* Floating icon animation */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="mb-6"
      >
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
            border: '1px solid rgba(99,102,241,0.2)',
          }}
        >
          <ShieldCheck className="w-12 h-12" style={{ color: '#6366f1' }} />
        </div>
      </motion.div>

      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        Your vault is empty
      </h2>
      <p className="text-sm mb-8 max-w-xs" style={{ color: 'var(--text-secondary)' }}>
        Add your first credential to start securing your team&apos;s passwords.
      </p>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => router.push('/vault/add')}
        className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white"
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
      >
        <Plus className="w-4 h-4" />
        Add your first credential
      </motion.button>
    </div>
  );
}
