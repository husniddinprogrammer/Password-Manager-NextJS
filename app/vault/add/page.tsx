'use client';

import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Layout/Sidebar';
import CredentialForm from '@/components/Forms/CredentialForm';

export default function AddCredentialPage() {
  const router = useRouter();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Minimal header */}
        <header
          className="h-16 flex items-center px-6 flex-shrink-0"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        >
          <button
            onClick={() => router.push('/vault')}
            className="flex items-center gap-2 text-sm transition-colors mr-4"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Vault
          </button>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Add Credential
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl mx-auto"
          >
            <div
              className="rounded-2xl p-6"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <CredentialForm mode="add" />
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
