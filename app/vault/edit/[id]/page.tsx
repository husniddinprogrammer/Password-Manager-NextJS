'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Sidebar from '@/components/Layout/Sidebar';
import CredentialForm from '@/components/Forms/CredentialForm';
import { CredentialFormData } from '@/lib/types';

export default function EditCredentialPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [initialData, setInitialData] = useState<Partial<CredentialFormData> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/credentials/${params.id}`);
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Credential not found');
        const data = payload.data;

        if (data.canEdit === false) {
          setError('You can view this credential but cannot edit it.');
          return;
        }

        setInitialData({
          name: data.name,
          url: data.url || '',
          username: data.username,
          password: data.password,
          notes: data.notes || '',
          category: data.category,
          tags: data.tags || [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load credential');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [params.id]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
            Edit Credential
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
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} />
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p style={{ color: '#ef4444' }} className="text-sm">
                    {error}
                  </p>
                  <button
                    onClick={() => router.push('/vault')}
                    className="mt-4 text-sm"
                    style={{ color: 'var(--primary)' }}
                  >
                    ← Back to vault
                  </button>
                </div>
              ) : initialData ? (
                <CredentialForm
                  mode="edit"
                  credentialId={params.id}
                  initialData={initialData}
                />
              ) : null}
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
