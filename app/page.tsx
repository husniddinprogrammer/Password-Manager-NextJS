'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Shield, Loader2, LogOut } from 'lucide-react';
import { useSession } from '@/context/SessionContext';
import { UserInfo } from '@/lib/types';

const ThreeBackground = dynamic(
  () => import('@/components/LockScreen/ThreeBackground'),
  { ssr: false }
);

export default function LockScreen() {
  const router = useRouter();
  const { unlock, logout, isLoading } = useSession();

  const [authUser, setAuthUser] = useState<UserInfo | null>(null);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    const init = async () => {
      // If key already in sessionStorage → already unlocked, go to vault
      if (sessionStorage.getItem('vault-unlocked')) {
        router.replace('/vault');
        return;
      }

      const res = await fetch('/api/auth/check');
      const data = await res.json();

      if (!data.isAuthenticated) {
        router.replace('/login');
        return;
      }

      setAuthUser(data.user as UserInfo);
      setReady(true);
    };
    init();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await unlock(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect password');
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
    }
  };

  const initials = authUser?.displayName
    ? authUser.displayName.slice(0, 2).toUpperCase()
    : authUser?.username?.slice(0, 2).toUpperCase() ?? '?';

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
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
        {!ready ? (
          <div className="flex justify-center">
            <div
              className="w-10 h-10 rounded-full border-2 animate-spin"
              style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }}
            />
          </div>
        ) : (
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
              {/* Logo + user avatar */}
              <div className="text-center mb-7">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                  className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 text-xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  {initials}
                </motion.div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  Welcome back
                  {authUser?.displayName ? `, ${authUser.displayName}` : ''}
                </h1>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Enter your master password to unlock the vault
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Master password"
                    autoFocus
                    className="w-full px-4 py-3 pr-10 rounded-xl text-sm focus:outline-none transition-colors"
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

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading || !password}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Unlocking...</>
                  ) : (
                    <><Shield className="w-4 h-4" /> Unlock Vault</>
                  )}
                </motion.button>
              </form>

              <button
                onClick={() => logout()}
                className="mt-4 w-full flex items-center justify-center gap-2 text-xs py-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign in with a different account
              </button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
