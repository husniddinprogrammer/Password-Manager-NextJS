'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  Download,
  Upload,
  Clock,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Activity,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '@/components/Layout/Sidebar';
import Header from '@/components/Layout/Header';
import ActivityLogComponent from '@/components/UI/ActivityLog';
import PasswordStrength from '@/components/UI/PasswordStrength';
import { useVault } from '@/context/VaultContext';

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start gap-3 mb-5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(99,102,241,0.1)' }}
        >
          <Icon className="w-4 h-4" style={{ color: '#6366f1' }} />
        </div>
        <div>
          <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          {description && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function ChangePasswordSection() {
  const { refreshCredentials } = useVault();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (next.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await refreshCredentials();
      toast.success('Master password changed successfully.');
      setSuccess(true);
      setCurrent('');
      setNext('');
      setConfirm('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 pr-10 rounded-xl text-sm focus:outline-none focus:ring-1 transition-colors';
  const inputStyle: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };

  const EyeToggle = ({ show, toggle }: { show: boolean; toggle: () => void }) => (
    <button
      type="button"
      onClick={toggle}
      className="absolute right-3 top-1/2 -translate-y-1/2"
      style={{ color: 'var(--text-secondary)' }}
    >
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <input
          type={showCurrent ? 'text' : 'password'}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Current master password"
          className={inputClass}
          style={inputStyle}
        />
        <EyeToggle show={showCurrent} toggle={() => setShowCurrent((v) => !v)} />
      </div>
      <div className="relative">
        <input
          type={showNew ? 'text' : 'password'}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="New master password"
          className={inputClass}
          style={inputStyle}
        />
        <EyeToggle show={showNew} toggle={() => setShowNew((v) => !v)} />
      </div>
      {next && <PasswordStrength password={next} />}
      <div className="relative">
        <input
          type={showNew ? 'text' : 'password'}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          className={inputClass}
          style={inputStyle}
        />
        <EyeToggle show={showNew} toggle={() => setShowNew((v) => !v)} />
      </div>
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={isLoading || !current || !next || !confirm}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ background: success ? '#22c55e' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : success ? (
          <>
            <CheckCircle className="w-4 h-4" /> Changed!
          </>
        ) : (
          'Change Master Password'
        )}
      </motion.button>
    </form>
  );
}

function AutoLockSection() {
  const [selected, setSelected] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('autoLockMinutes') || '15';
    }
    return '15';
  });

  const options = [
    { value: '5', label: '5 minutes' },
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 hour' },
  ];

  const handleChange = (value: string) => {
    setSelected(value);
    sessionStorage.setItem('autoLockMinutes', value);
    toast.success('Auto-lock preference saved');
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map(({ value, label }) => (
        <motion.button
          key={value}
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleChange(value)}
          className="py-2.5 px-4 rounded-xl text-sm font-medium transition-colors"
          style={{
            background: selected === value ? 'rgba(99,102,241,0.2)' : 'var(--card)',
            color: selected === value ? '#6366f1' : 'var(--text-secondary)',
            border: `1px solid ${selected === value ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
          }}
        >
          {label}
        </motion.button>
      ))}
    </div>
  );
}

function ExportSection() {
  const { credentials } = useVault();
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'all' | 'team' | 'credential'>('all');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedCredentialId, setSelectedCredentialId] = useState('');

  const teamOptions = Array.from(
    new Map(
      credentials
        .filter((c) => c.scope === 'team' && c.teamId && c.teamName)
        .map((c) => [c.teamId as string, c.teamName as string])
    ).entries()
  ).map(([id, name]) => ({ id, name }));

  const handleExport = async () => {
    if (mode === 'team' && !selectedTeamId) {
      toast.error('Please select a team to export');
      return;
    }

    if (mode === 'credential' && !selectedCredentialId) {
      toast.error('Please select a credential to export');
      return;
    }

    setIsLoading(true);
    try {
      const body =
        mode === 'team'
          ? { mode, teamId: selectedTeamId }
          : mode === 'credential'
            ? { mode, credentialId: selectedCredentialId }
            : { mode: 'all' };

      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vault-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Vault exported successfully');
    } catch {
      toast.error('Export failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Export everything you can access, one team, or a single credential.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {([
          { id: 'all', label: 'All access' },
          { id: 'team', label: 'One team' },
          { id: 'credential', label: 'One credential' },
        ] as const).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setMode(option.id)}
            className="py-2.5 px-4 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: mode === option.id ? 'rgba(99,102,241,0.2)' : 'var(--card)',
              color: mode === option.id ? '#6366f1' : 'var(--text-secondary)',
              border: `1px solid ${mode === option.id ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {mode === 'team' && (
        <select
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        >
          <option value="">Select team</option>
          {teamOptions.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      )}

      {mode === 'credential' && (
        <select
          value={selectedCredentialId}
          onChange={(e) => setSelectedCredentialId(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        >
          <option value="">Select credential</option>
          {credentials
            .filter((credential) => credential.scope === 'personal')
            .map((credential) => (
            <option key={credential.id} value={credential.id}>
              {credential.name}
            </option>
          ))}
        </select>
      )}

      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        type="button"
        onClick={handleExport}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
        style={{ background: 'var(--card)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {isLoading ? 'Exporting...' : 'Export Vault'}
      </motion.button>
    </div>
  );
}

function ImportSection() {
  const { refreshCredentials } = useVault();
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isJsonFile =
      file.type === 'application/json' ||
      file.name.toLowerCase().endsWith('.json');

    if (!isJsonFile) {
      toast.error('Faqat JSON fayl import qilinadi.');
      event.target.value = '';
      setSelectedFileName('');
      return;
    }

    setSelectedFileName(file.name);
    setIsImporting(true);

    try {
      const text = await file.text();
      let payload: unknown;

      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error('Fayl JSON formatda emas.');
      }

      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      await refreshCredentials();

      const { created, updated, skipped } = data.data ?? {};
      toast.success(`Import yakunlandi: ${created ?? 0} qo'shildi, ${updated ?? 0} yangilandi, ${skipped ?? 0} o'tkazib yuborildi.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        JSON fayl import qiling. Mos credential topilsa yangilanadi, topilmasa qo&apos;shiladi.
      </p>
      <label
        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium cursor-pointer transition-colors"
        style={{
          background: 'var(--card)',
          color: '#6366f1',
          border: '1px solid rgba(99,102,241,0.2)',
        }}
      >
        {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {isImporting ? 'Importing...' : 'Import JSON'}
        <input
          type="file"
          accept=".json,application/json"
          onChange={handleImport}
          className="hidden"
          disabled={isImporting}
        />
      </label>
      {selectedFileName && (
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Selected: {selectedFileName}
        </p>
      )}
    </div>
  );
}

function DangerZoneSection() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleClearData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterPassword: confirmPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('All data cleared');
      setShowModal(false);
      router.push('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-3">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Permanently delete all credentials and your vault. This action cannot be undone.
        </p>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <Trash2 className="w-4 h-4" />
          Clear All Data
        </motion.button>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl p-6"
              style={{ background: 'var(--surface)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
                    <AlertTriangle className="w-4 h-4" style={{ color: '#ef4444' }} />
                  </div>
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Clear All Data?</h3>
                </div>
                <button onClick={() => setShowModal(false)} style={{ color: 'var(--text-secondary)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                This will permanently delete your vault, all credentials, and your master password. Enter your master password to confirm.
              </p>

              <div className="relative mb-4">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="Enter master password"
                  className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm focus:outline-none"
                  style={{ background: 'var(--card)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--text-primary)' }}
                  autoFocus
                />
                <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }}>
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleClearData}
                  disabled={!confirmPwd || isLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: '#ef4444' }}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Everything'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function SettingsPage() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title="Settings" />

        <main className="flex-1 overflow-y-auto p-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl mx-auto space-y-4"
          >
            <Section icon={Key} title="Change Master Password" description="Update your vault's master password. You'll need your current password to confirm.">
              <ChangePasswordSection />
            </Section>

            <Section icon={Clock} title="Auto-Lock Timeout" description="Automatically lock the vault after a period of inactivity.">
              <AutoLockSection />
            </Section>

            <Section icon={Download} title="Export Vault" description="Download an encrypted backup of your vault.">
              <ExportSection />
            </Section>

            <Section icon={Upload} title="Import Vault" description="Import credentials from a JSON file.">
              <ImportSection />
            </Section>

            <Section icon={Activity} title="Activity Log" description="Audit trail of recent vault actions.">
              <div id="activity">
                <ActivityLogComponent />
              </div>
            </Section>

            <Section icon={Trash2} title="Danger Zone" description="Irreversible actions.">
              <DangerZoneSection />
            </Section>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
