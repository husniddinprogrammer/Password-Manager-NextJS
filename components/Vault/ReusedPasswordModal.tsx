'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Edit, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { DecryptedCredential } from '@/lib/types';
import { detectReusedPasswords, ReusedGroup } from '@/lib/security';

interface ReusedPasswordModalProps {
  credentials: DecryptedCredential[];
  onClose: () => void;
}

function GroupRow({ group }: { group: ReusedGroup }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.04)' }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
          <span className="text-sm font-medium" style={{ color: '#f59e0b' }}>
            {group.credentials.length} accounts share this password
          </span>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
          : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
        }
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-3 space-y-2">
              {group.credentials.map((cred) => (
                <div
                  key={cred.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ background: 'var(--surface)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {cred.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                      {cred.username}
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push(`/vault/edit/${cred.id}`)}
                    className="ml-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium flex-shrink-0"
                    style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}
                  >
                    <Edit className="w-3 h-3" />
                    Fix
                  </motion.button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ReusedPasswordModal({ credentials, onClose }: ReusedPasswordModalProps) {
  const groups = detectReusedPasswords(credentials);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full max-w-md rounded-2xl overflow-hidden"
          style={{
            background: 'var(--surface)',
            border: '1px solid rgba(245,158,11,0.2)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
            style={{ borderColor: 'rgba(245,158,11,0.15)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(245,158,11,0.15)' }}
              >
                <AlertTriangle className="w-4 h-4" style={{ color: '#f59e0b' }} />
              </div>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Reused Passwords
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {groups.reduce((n, g) => n + g.credentials.length, 0)} credentials at risk
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg"
              style={{ color: 'var(--text-secondary)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
              Using the same password across multiple accounts is a security risk. If one account is compromised, all accounts with the same password are vulnerable.
            </p>
            {groups.map((group, i) => (
              <GroupRow key={i} group={group} />
            ))}
          </div>

          <div className="px-5 py-3 border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
