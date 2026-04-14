'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Copy,
  Plus,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Download,
  Upload,
  Key,
  Loader2,
} from 'lucide-react';
import { ActivityLog as ActivityLogType } from '@/lib/types';

function getRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

const ACTION_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string; color: string }
> = {
  CREDENTIAL_CREATED: { icon: Plus, label: 'Created', color: '#22c55e' },
  CREDENTIAL_UPDATED: { icon: Edit, label: 'Updated', color: '#6366f1' },
  CREDENTIAL_DELETED: { icon: Trash2, label: 'Deleted', color: '#ef4444' },
  CREDENTIAL_VIEWED: { icon: Eye, label: 'Viewed', color: '#94a3b8' },
  PASSWORD_COPIED: { icon: Copy, label: 'Password copied', color: '#f59e0b' },
  USERNAME_COPIED: { icon: Copy, label: 'Username copied', color: '#94a3b8' },
  VAULT_UNLOCKED: { icon: Unlock, label: 'Vault unlocked', color: '#22c55e' },
  VAULT_LOCKED: { icon: Lock, label: 'Vault locked', color: '#ef4444' },
  MASTER_PASSWORD_CHANGED: { icon: Key, label: 'Password changed', color: '#f59e0b' },
  VAULT_EXPORTED: { icon: Download, label: 'Vault exported', color: '#6366f1' },
  VAULT_IMPORTED: { icon: Upload, label: 'Vault imported', color: '#22c55e' },
};

export default function ActivityLog() {
  const [logs, setLogs] = useState<ActivityLogType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/activity');
        if (!res.ok) return;
        const { data } = await res.json();
        setLogs(data);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12">
        <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
          No activity yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <AnimatePresence>
        {logs.slice(0, 20).map((log, index) => {
          const config = ACTION_CONFIG[log.action] || {
            icon: Eye,
            label: log.action,
            color: '#94a3b8',
          };
          const Icon = config.icon;

          return (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
              style={{ background: 'var(--card)' }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `${config.color}18` }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {config.label}
                  {log.credName && (
                    <span style={{ color: 'var(--text-secondary)' }}> · {log.credName}</span>
                  )}
                </p>
              </div>

              <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                {getRelativeTime(log.timestamp)}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
