'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, User, Users } from 'lucide-react';
import Sidebar from '@/components/Layout/Sidebar';
import Header from '@/components/Layout/Header';
import CredentialList from '@/components/Vault/CredentialList';
import ReusedPasswordModal from '@/components/Vault/ReusedPasswordModal';
import { useVault } from '@/context/VaultContext';
import { useSession } from '@/context/SessionContext';

type ScopeTab = 'all' | 'personal' | string; // string = teamId

interface TeamTab {
  id: string;
  name: string;
}

export default function VaultPage() {
  const { credentials, refreshCredentials } = useVault();
  const { isUnlocked } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ScopeTab>('all');
  const [teamTabs, setTeamTabs] = useState<TeamTab[]>([]);
  const [showReusedModal, setShowReusedModal] = useState(false);

  useEffect(() => {
    if (isUnlocked) {
      refreshCredentials();
    }
  }, [isUnlocked]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive unique teams from credentials
  useEffect(() => {
    const seen = new Map<string, string>();
    credentials.forEach((c) => {
      if (c.scope === 'team' && c.teamId && c.teamName && !seen.has(c.teamId)) {
        seen.set(c.teamId, c.teamName);
      }
    });
    setTeamTabs(Array.from(seen.entries()).map(([id, name]) => ({ id, name })));
  }, [credentials]);

  const filteredCredentials = useCallback(() => {
    if (activeTab === 'all') return credentials;
    if (activeTab === 'personal') return credentials.filter((c) => c.scope === 'personal');
    return credentials.filter((c) => c.scope === 'team' && c.teamId === activeTab);
  }, [credentials, activeTab])();

  const reusedCount = credentials.filter((c) => c.isReused).length;

  const tabs = [
    { id: 'all' as ScopeTab, label: 'All', icon: null },
    { id: 'personal' as ScopeTab, label: 'Personal', icon: User },
    ...teamTabs.map((t) => ({ id: t.id as ScopeTab, label: t.name, icon: Users })),
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto space-y-4"
          >
            {/* Reused password warning */}
            <AnimatePresence>
              {reusedCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-3 p-4 rounded-xl"
                  style={{
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.25)',
                  }}
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
                  <p className="text-sm flex-1" style={{ color: '#f59e0b' }}>
                    <strong>{reusedCount} credential{reusedCount > 1 ? 's use' : ' uses'} a reused password.</strong>{' '}
                    Using unique passwords improves security.
                  </p>
                  <button
                    onClick={() => setShowReusedModal(true)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg flex-shrink-0"
                    style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}
                  >
                    View Details
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scope tabs */}
            {tabs.length > 2 && (
              <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {tabs.map((tab) => {
                  const active = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <motion.button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      whileTap={{ scale: 0.96 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                        color: active ? '#6366f1' : 'var(--text-secondary)',
                      }}
                    >
                      {Icon && <Icon className="w-3 h-3" />}
                      {tab.label}
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* Header row */}
            {filteredCredentials.length > 0 && (
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {activeTab === 'all' ? 'All Credentials' : activeTab === 'personal' ? 'Personal' : (teamTabs.find((t) => t.id === activeTab)?.name ?? 'Team')}
                </h2>
                <span
                  className="text-sm px-3 py-1 rounded-full"
                  style={{
                    background: 'rgba(99,102,241,0.1)',
                    color: '#6366f1',
                    border: '1px solid rgba(99,102,241,0.2)',
                  }}
                >
                  {filteredCredentials.length} total
                </span>
              </div>
            )}

            <CredentialList searchQuery={searchQuery} scopeFilter={activeTab} />
          </motion.div>
        </main>
      </div>

      {showReusedModal && (
        <ReusedPasswordModal
          credentials={credentials}
          onClose={() => setShowReusedModal(false)}
        />
      )}
    </div>
  );
}
