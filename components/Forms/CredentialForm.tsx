'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Wand2, X, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { CREDENTIAL_CATEGORIES, CredentialFormData } from '@/lib/types';
import { useVault } from '@/context/VaultContext';import PasswordStrength from '@/components/UI/PasswordStrength';
import PasswordGenerator from './PasswordGenerator';

// Defined OUTSIDE CredentialForm so its reference is stable across re-renders.
// If defined inside, React sees a new component type every render and
// unmounts/remounts children — re-triggering autoFocus on the name input.
function InputWrapper({
  label,
  error,
  children,
  required,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
          {error}
        </p>
      )}
    </div>
  );
}

interface CredentialFormProps {
  initialData?: Partial<CredentialFormData>;
  credentialId?: string;
  mode: 'add' | 'edit';
  initialScope?: string;
  initialTeamId?: string;
}

interface TeamOption {
  id: string;
  name: string;
}

const EMPTY_FORM: CredentialFormData = {
  name: '',
  url: '',
  username: '',
  password: '',
  notes: '',
  category: 'General',
  tags: [],
};

function FaviconPreview({ url }: { url: string }) {
  const [error, setError] = useState(false);
  if (!url || error) return null;

  let domain = '';
  try {
    domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
  } catch {
    return null;
  }

  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
        alt=""
        width={20}
        height={20}
        className="rounded"
        onError={() => setError(true)}
      />
    </div>
  );
}

export default function CredentialForm({ initialData, credentialId, mode, initialScope, initialTeamId }: CredentialFormProps) {
  const router = useRouter();
  const { refreshCredentials } = useVault();
  const [form, setForm] = useState<CredentialFormData>({ ...EMPTY_FORM, ...initialData });
  const [showPassword, setShowPassword] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<CredentialFormData>>({});
  const [scope, setScope] = useState<'personal' | 'team'>(initialScope === 'team' ? 'team' : 'personal');
  const [teamId, setTeamId] = useState<string>(initialTeamId ?? '');
  const [teams, setTeams] = useState<TeamOption[]>([]);

  useEffect(() => {
    fetch('/api/teams')
      .then((r) => r.json())
      .then(({ data }) => {
        if (Array.isArray(data))
          setTeams(
            (data as { id: string; name: string; isOwner: boolean }[])
              .filter((t) => t.isOwner)
              .map((t) => ({ id: t.id, name: t.name }))
          );
      })
      .catch(() => {});
  }, []);

  const set = (key: keyof CredentialFormData, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const errs: Partial<CredentialFormData> = {};
    if (!form.name.trim()) errs.name = 'Service name is required';
    if (!form.username.trim()) errs.username = 'Username is required';
    if (!form.password.trim()) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (tag && !form.tags.includes(tag)) {
      set('tags', [...form.tags, tag]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    set('tags', form.tags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        url: form.url.trim() || undefined,
        username: form.username,
        password: form.password,
        notes: form.notes || undefined,
        category: form.category,
        tags: form.tags,
        scope,
        teamId: scope === 'team' && teamId ? teamId : undefined,
      };

      let res: Response;
      if (mode === 'edit' && credentialId) {
        res = await fetch(`/api/credentials/${credentialId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      await refreshCredentials();

      toast.success(mode === 'edit' ? 'Credential updated!' : 'Credential saved!');
      router.push('/vault');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };


  const inputClass =
    'w-full px-4 py-2.5 rounded-xl text-sm transition-colors focus:outline-none focus:ring-1';
  const inputStyle = (hasError?: string) => ({
    background: 'var(--card)',
    border: `1px solid ${hasError ? '#ef4444' : 'var(--border)'}`,
    color: 'var(--text-primary)',
    '--tw-ring-color': '#6366f1',
  } as React.CSSProperties);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Service Name + URL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputWrapper label="Service Name" error={errors.name} required>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. GitHub, Gmail..."
            className={inputClass}
            style={inputStyle(errors.name)}
            autoFocus
          />
        </InputWrapper>

        <InputWrapper label="Website URL">
          <div className="relative">
            {form.url && <FaviconPreview url={form.url} />}
            <input
              type="text"
              value={form.url}
              onChange={(e) => set('url', e.target.value)}
              placeholder="https://github.com"
              className={`${inputClass} ${form.url ? 'pl-10' : ''}`}
              style={inputStyle()}
            />
          </div>
        </InputWrapper>
      </div>

      {/* Username */}
      <InputWrapper label="Username / Email" error={errors.username} required>
        <input
          type="text"
          value={form.username}
          onChange={(e) => set('username', e.target.value)}
          placeholder="your@email.com"
          className={inputClass}
          style={inputStyle(errors.username)}
          autoComplete="off"
        />
      </InputWrapper>

      {/* Password */}
      <InputWrapper label="Password" error={errors.password} required>
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="Enter or generate a password"
                className={`${inputClass} pr-10`}
                style={inputStyle(errors.password)}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-secondary)' }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowGenerator(!showGenerator)}
              className="px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
              style={{
                background: showGenerator ? 'rgba(99,102,241,0.2)' : 'var(--card)',
                color: showGenerator ? '#6366f1' : 'var(--text-secondary)',
                border: `1px solid ${showGenerator ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
              }}
            >
              <Wand2 className="w-4 h-4" />
              Generate
            </motion.button>
          </div>

          {form.password && <PasswordStrength password={form.password} />}

          <AnimatePresence>
            {showGenerator && (
              <PasswordGenerator
                onUse={(pwd) => {
                  set('password', pwd);
                  setShowGenerator(false);
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </InputWrapper>

      {/* Category */}
      <InputWrapper label="Category">
        <select
          value={form.category}
          onChange={(e) => set('category', e.target.value)}
          className={inputClass}
          style={inputStyle()}
        >
          {CREDENTIAL_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </InputWrapper>

      {/* Tags */}
      <InputWrapper label="Tags">
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addTag(); }
              }}
              placeholder="Add a tag and press Enter"
              className={`${inputClass} flex-1`}
              style={inputStyle()}
            />
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={addTag}
              className="px-3 py-2.5 rounded-xl"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              <Plus className="w-4 h-4" />
            </motion.button>
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
                  style={{
                    background: 'rgba(99,102,241,0.1)',
                    color: '#6366f1',
                    border: '1px solid rgba(99,102,241,0.2)',
                  }}
                >
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </InputWrapper>

      {/* Notes */}
      <InputWrapper label="Notes">
        <textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Optional notes (encrypted)"
          rows={3}
          className={`${inputClass} resize-none`}
          style={inputStyle()}
        />
      </InputWrapper>

      {/* Scope */}
      {mode === 'add' && (
        <InputWrapper label="Scope">
          <div className="flex gap-2">
            {(['personal', 'team'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors capitalize"
                style={{
                  background: scope === s ? 'rgba(99,102,241,0.15)' : 'var(--card)',
                  color: scope === s ? '#6366f1' : 'var(--text-secondary)',
                  border: `1px solid ${scope === s ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
                }}
              >
                {s}
              </button>
            ))}
          </div>
          {scope === 'team' && (
            <div className="mt-2">
              {teams.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  No teams found. Create a team first.
                </p>
              ) : (
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className={`${inputClass} mt-1`}
                  style={inputStyle()}
                >
                  <option value="">Select team…</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </InputWrapper>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <motion.button
          type="button"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push('/vault')}
          className="flex-1 py-3 rounded-xl text-sm font-medium"
          style={{ background: 'var(--card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          Cancel
        </motion.button>
        <motion.button
          type="submit"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          disabled={isSubmitting || !form.name || !form.username || !form.password || (scope === 'team' && !teamId)}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : mode === 'edit' ? (
            'Save Changes'
          ) : (
            'Save Credential'
          )}
        </motion.button>
      </div>
    </form>
  );
}
