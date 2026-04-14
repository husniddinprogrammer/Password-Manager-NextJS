'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Edit, Trash2, AlertTriangle, Globe, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { DecryptedCredential } from '@/lib/types';
import CopyButton from '@/components/UI/CopyButton';
import CategoryBadge from '@/components/UI/CategoryBadge';
import PasswordStrength from '@/components/UI/PasswordStrength';
import { useVault } from '@/context/VaultContext';

interface CredentialCardProps {
  credential: DecryptedCredential;
  onDelete: (id: string) => void;
}

function FaviconImage({ url, name }: { url?: string | null; name: string }) {
  const [imgError, setImgError] = useState(false);

  if (!url || imgError) {
    return (
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  let domain = '';
  try {
    domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
  } catch {
    domain = url;
  }

  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt={name}
        width={28}
        height={28}
        className="rounded-md"
        onError={() => setImgError(true)}
      />
    </div>
  );
}

export default function CredentialCard({ credential, onDelete }: CredentialCardProps) {
  const router = useRouter();
  const { addActivityLog } = useVault();
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${credential.name}"? This cannot be undone.`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/credentials/${credential.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success(`"${credential.name}" deleted`);
      onDelete(credential.id);
    } catch {
      toast.error('Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/vault/edit/${credential.id}`);
  };

  const handlePasswordCopy = () => {
    addActivityLog('PASSWORD_COPIED', credential.id, credential.name);
  };

  const handleUsernameCopy = () => {
    addActivityLog('USERNAME_COPIED', credential.id, credential.name);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(99,102,241,0.15)' }}
      transition={{ duration: 0.2 }}
      className="group relative rounded-xl p-4 cursor-default"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Top-right badges */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        {credential.scope === 'team' && credential.teamName && (
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}
          >
            <Users className="w-3 h-3" />
            {credential.teamName}
          </div>
        )}
        {credential.isReused && (
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
          >
            <AlertTriangle className="w-3 h-3" />
            Reused
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <FaviconImage url={credential.url} name={credential.name} />
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-sm truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {credential.name}
          </h3>
          {credential.url && (
            <p className="text-xs truncate mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <Globe className="w-3 h-3 flex-shrink-0" />
              {credential.url.replace(/^https?:\/\//, '')}
            </p>
          )}
        </div>
      </div>

      {/* Category */}
      <div className="mb-3">
        <CategoryBadge category={credential.category} />
      </div>

      {/* Username row */}
      <div
        className="flex items-center justify-between rounded-lg px-3 py-2 mb-2"
        style={{ background: 'var(--surface)' }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>
            Username
          </p>
          <p className="text-sm truncate font-mono" style={{ color: 'var(--text-primary)' }}>
            {credential.username || '—'}
          </p>
        </div>
        {credential.username && (
          <CopyButton value={credential.username} label="Username" onCopy={handleUsernameCopy} />
        )}
      </div>

      {/* Password row */}
      <div
        className="flex items-center justify-between rounded-lg px-3 py-2 mb-3"
        style={{ background: 'var(--surface)' }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>
            Password
          </p>
          <p className="text-sm font-mono tracking-widest" style={{ color: 'var(--text-primary)' }}>
            {showPassword ? credential.password : '••••••••'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); setShowPassword(!showPassword); }}
            className="p-1.5 rounded-lg"
            style={{ color: 'var(--text-secondary)', background: 'rgba(99,102,241,0.1)' }}
          >
            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </motion.button>
          {credential.password && (
            <CopyButton value={credential.password} label="Password" onCopy={handlePasswordCopy} />
          )}
        </div>
      </div>

      {/* Password strength */}
      {credential.password && (
        <div className="mb-3">
          <PasswordStrength password={credential.password} showLabel={false} />
        </div>
      )}

      {/* Tags */}
      {credential.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {credential.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(99,102,241,0.1)',
                color: '#6366f1',
                border: '1px solid rgba(99,102,241,0.2)',
              }}
            >
              #{tag}
            </span>
          ))}
          {credential.tags.length > 3 && (
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              +{credential.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Actions (visible on hover) */}
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleEdit}
          className="flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}
        >
          <Edit className="w-3.5 h-3.5" />
          Edit
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {isDeleting ? 'Deleting...' : 'Delete'}
        </motion.button>
      </div>
    </motion.div>
  );
}
