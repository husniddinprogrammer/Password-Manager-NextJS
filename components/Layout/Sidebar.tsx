'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Shield,
  Key,
  Activity,
  Settings,
  Lock,
  LogOut,
  ChevronRight,
  Users,
} from 'lucide-react';
import { useSession } from '@/context/SessionContext';
import { useVault } from '@/context/VaultContext';

const navItems = [
  { href: '/vault', label: 'Vault', icon: Key },
  { href: '/teams', label: 'Teams', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { lock, logout, user } = useSession();
  const { credentials } = useVault();

  const initials = user?.displayName
    ? user.displayName.slice(0, 2).toUpperCase()
    : user?.username?.slice(0, 2).toUpperCase() ?? '?';
  const displayName = user?.displayName ?? user?.username ?? 'User';
  const subLabel = user?.email ?? user?.username ?? '';

  const reusedCount = credentials.filter((c) => c.isReused).length;

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-64 flex-shrink-0 flex flex-col h-full"
      style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <Shield className="w-4 h-4 text-white" />
          </div>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            TeamVault
          </p>
        </div>

        {/* User info */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {displayName}
            </p>
            {subLabel && subLabel !== displayName && (
              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                {subLabel}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/vault' && pathname.startsWith(href));
          const isVaultActive = href === '/vault' && (pathname === '/vault' || pathname.startsWith('/vault/'));
          const active = isVaultActive || (href !== '/vault' && isActive);

          return (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ x: 2 }}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
                style={{
                  background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: active ? '#6366f1' : 'var(--text-secondary)',
                }}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                {active && <ChevronRight className="w-3 h-3" />}
              </motion.div>
            </Link>
          );
        })}

        {/* Credential count */}
        <div
          className="mt-4 p-3 rounded-lg"
          style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Stored Credentials
            </span>
            <span className="text-xs font-bold" style={{ color: 'var(--primary)' }}>
              {credentials.length}
            </span>
          </div>
          {reusedCount > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-xs" style={{ color: '#f59e0b' }}>
                {reusedCount} reused password{reusedCount > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </nav>

      {/* Bottom actions */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <Link href="/settings#activity">
          <motion.div
            whileHover={{ x: 2 }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Activity className="w-4 h-4" />
            <span className="text-sm font-medium">Activity Log</span>
          </motion.div>
        </Link>

        {/* Lock button */}
        <motion.button
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => lock()}
          className="mt-1 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Lock className="w-4 h-4" />
          <span className="text-sm font-medium">Lock Vault</span>
        </motion.button>

        {/* Logout button */}
        <motion.button
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
          style={{ color: '#ef4444' }}
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Sign Out</span>
        </motion.button>
      </div>
    </motion.aside>
  );
}
