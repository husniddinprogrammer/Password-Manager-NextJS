'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Shield, Loader2, Check, X } from 'lucide-react';
import { useSession } from '@/context/SessionContext';

const ThreeBackground = dynamic(
  () => import('@/components/LockScreen/ThreeBackground'),
  { ssr: false }
);

function PasswordRule({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {met ? (
        <Check className="w-3 h-3 flex-shrink-0" style={{ color: '#22c55e' }} />
      ) : (
        <X className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
      )}
      <span className="text-xs" style={{ color: met ? '#22c55e' : 'var(--text-secondary)' }}>
        {text}
      </span>
    </div>
  );
}

type RegisterFormState = {
  displayName: string;
  username: string;
  email: string;
  password: string;
  confirm: string;
};

type RegisterErrors = Partial<RegisterFormState & { general: string }>;

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  error,
  onChange,
}: {
  label: string;
  name: keyof RegisterFormState;
  type?: string;
  placeholder: string;
  value: string;
  error?: string;
  onChange: (key: keyof RegisterFormState, value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors"
        style={{
          background: 'var(--card)',
          border: `1px solid ${error ? '#ef4444' : 'var(--border)'}`,
          color: 'var(--text-primary)',
        }}
      />
      {error && (
        <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{error}</p>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const { register, isLoading } = useSession();

  const [form, setForm] = useState<RegisterFormState>({
    displayName: '',
    username: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [shaking, setShaking] = useState(false);

  const set = (key: keyof RegisterFormState, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) {
      setErrors((p) => ({ ...p, [key]: undefined }));
    }
  };

  // Password requirements
  const rules = {
    length: form.password.length >= 8,
    upper: /[A-Z]/.test(form.password),
    number: /[0-9]/.test(form.password),
  };

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.displayName.trim()) errs.displayName = 'Display name is required';
    if (!/^[a-z0-9_-]{3,20}$/.test(form.username))
      errs.username = '3–20 chars, lowercase letters, numbers, _ or -';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'Invalid email address';
    if (!rules.length || !rules.upper || !rules.number)
      errs.password = 'Password does not meet requirements';
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
      return;
    }
    try {
      await register(form.username, form.email, form.displayName, form.password);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : 'Registration failed' });
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors';
  const inputStyle = (err?: string): React.CSSProperties => ({
    background: 'var(--card)',
    border: `1px solid ${err ? '#ef4444' : 'var(--border)'}`,
    color: 'var(--text-primary)',
  });


  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden py-8"
      style={{ background: '#0a0a0f' }}
    >
      <ThreeBackground />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(99,102,241,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            animate={shaking ? { x: [-10, 10, -10, 10, -5, 5, 0] } : { x: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl p-8"
            style={{
              background: 'rgba(26,26,39,0.9)',
              border: '1px solid rgba(99,102,241,0.2)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(99,102,241,0.1)',
            }}
          >
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                <Shield className="w-6 h-6 text-white" />
              </motion.div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Create your vault
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                All credentials are encrypted locally
              </p>
            </div>

            {errors.general && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-4 p-3 rounded-lg text-xs text-center"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                {errors.general}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <Field
                label="Display Name"
                name="displayName"
                placeholder="Your name"
                value={form.displayName}
                error={errors.displayName}
                onChange={set}
              />
              <Field
                label="Username"
                name="username"
                placeholder="e.g. john_doe"
                value={form.username}
                error={errors.username}
                onChange={set}
              />
              <Field
                label="Email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                error={errors.email}
                onChange={set}
              />

              {/* Password with requirements */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Master Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    placeholder="Choose a strong password"
                    autoComplete="new-password"
                    className={`${inputClass} pr-10`}
                    style={inputStyle(errors.password)}
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
                {form.password && (
                  <div className="mt-2 space-y-1 pl-1">
                    <PasswordRule met={rules.length} text="At least 8 characters" />
                    <PasswordRule met={rules.upper} text="At least 1 uppercase letter" />
                    <PasswordRule met={rules.number} text="At least 1 number" />
                  </div>
                )}
                {errors.password && (
                  <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.password}</p>
                )}
              </div>

              {/* Confirm */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={(e) => set('confirm', e.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  className={inputClass}
                  style={inputStyle(errors.confirm)}
                />
                {errors.confirm && (
                  <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.confirm}</p>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 mt-1"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating vault...</>
                ) : (
                  'Create Vault'
                )}
              </motion.button>
            </form>

            <p className="text-center text-sm mt-5" style={{ color: 'var(--text-secondary)' }}>
              Already have an account?{' '}
              <Link href="/login" className="font-medium" style={{ color: '#6366f1' }}>
                Sign in
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
