'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Shield, Loader2 } from 'lucide-react';
import { useSession } from '@/context/SessionContext';
import { deriveKey } from '@/lib/crypto';

interface UnlockFormProps {
  isSetup: boolean;
}

export default function UnlockForm({ isSetup }: UnlockFormProps) {
  const { unlock, isLoading } = useSession();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState(15);

  useEffect(() => {
    const VALID = [5, 15, 30, 60];
    const saved = parseInt(sessionStorage.getItem('autoLockMinutes') ?? '', 10);
    const value = VALID.includes(saved) ? saved : 15;
    if (!VALID.includes(saved)) sessionStorage.setItem('autoLockMinutes', '15');
    setAutoLockMinutes(value);
  }, []);

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 600);
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      triggerShake();
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      triggerShake();
      return;
    }

    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Setup failed');
        triggerShake();
        return;
      }
      // Now unlock with the same password
      await unlock(password);
    } catch {
      setError('Something went wrong');
      triggerShake();
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await unlock(password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unlock failed';
      setError(msg);
      triggerShake();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative z-10 w-full max-w-sm mx-auto px-4"
    >
      <motion.div
        animate={shaking ? { x: [-10, 10, -10, 10, -5, 5, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl p-8"
        style={{
          background: 'rgba(26, 26, 39, 0.9)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(99,102,241,0.1)',
        }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <Shield className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            TeamVault
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {isSetup ? 'Create your master password' : 'Enter your master password'}
          </p>
        </div>

        <form onSubmit={isSetup ? handleSetup : handleUnlock} className="space-y-4">
          {/* Password input */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Master Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSetup ? 'Choose a strong password' : 'Enter your password'}
                autoFocus
                className="w-full px-4 py-3 pr-10 rounded-xl text-sm transition-colors focus:outline-none"
                style={{
                  background: 'var(--card)',
                  border: `1px solid ${error ? '#ef4444' : 'var(--border)'}`,
                  color: 'var(--text-primary)',
                }}
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
          </div>

          {/* Confirm password (setup only) */}
          {isSetup && (
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full px-4 py-3 rounded-xl text-sm transition-colors focus:outline-none"
                style={{
                  background: 'var(--card)',
                  border: `1px solid ${error ? '#ef4444' : 'var(--border)'}`,
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-center"
              style={{ color: '#ef4444' }}
            >
              {error}
            </motion.p>
          )}

          {/* Submit */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading || !password}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isSetup ? 'Creating vault...' : 'Unlocking...'}
              </>
            ) : isSetup ? (
              'Create Vault'
            ) : (
              'Unlock Vault'
            )}
          </motion.button>
        </form>

        {!isSetup && (
          <p className="text-center text-xs mt-4" style={{ color: 'var(--text-secondary)' }}>
            Vault auto-locks after {autoLockMinutes} minute{autoLockMinutes !== 1 ? 's' : ''} of inactivity
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
