'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Loader2, Trash2, ChevronRight, Crown } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '@/components/Layout/Sidebar';

interface TeamItem {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  ownerId: string;
  isOwner: boolean;
  myRole: string;
  _count: { members: number; credentials: number };
}

export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch('/api/teams');
      if (!res.ok) return;
      const { data } = await res.json();
      setTeams(data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName.trim(), description: createDesc.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create team');
      toast.success('Team created!');
      setShowCreate(false);
      setCreateName('');
      setCreateDesc('');
      fetchTeams();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/teams/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      toast.success('Team deleted');
      setTeams((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete team');
    } finally {
      setDeleteId(null);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header
          className="h-16 flex items-center justify-between px-6 flex-shrink-0"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5" style={{ color: '#6366f1' }} />
            <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Teams
            </h1>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <Plus className="w-4 h-4" />
            New Team
          </motion.button>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-3xl mx-auto space-y-4"
          >
            {/* Create team form */}
            <AnimatePresence>
              {showCreate && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-2xl p-5"
                  style={{ background: 'var(--surface)', border: '1px solid rgba(99,102,241,0.3)' }}
                >
                  <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                    Create New Team
                  </h2>
                  <form onSubmit={handleCreate} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        Team Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        placeholder="e.g. Engineering, Marketing..."
                        autoFocus
                        className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        Description
                      </label>
                      <input
                        type="text"
                        value={createDesc}
                        onChange={(e) => setCreateDesc(e.target.value)}
                        placeholder="Optional description"
                        className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                        style={inputStyle}
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => { setShowCreate(false); setCreateName(''); setCreateDesc(''); }}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                        style={{ background: 'var(--card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                      >
                        Cancel
                      </button>
                      <motion.button
                        type="submit"
                        whileTap={{ scale: 0.97 }}
                        disabled={creating || !createName.trim()}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                      >
                        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Create Team
                      </motion.button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Teams list */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#6366f1' }} />
              </div>
            ) : teams.length === 0 ? (
              <div className="text-center py-16">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(99,102,241,0.1)' }}
                >
                  <Users className="w-7 h-7" style={{ color: '#6366f1' }} />
                </div>
                <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No teams yet</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Create a team to share credentials with your colleagues
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {teams.map((team) => (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-4 flex items-center gap-4"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(99,102,241,0.1)' }}
                    >
                      <Users className="w-5 h-5" style={{ color: '#6366f1' }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                          {team.name}
                        </p>
                        {team.isOwner && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                            <Crown className="w-3 h-3" />
                            Owner
                          </span>
                        )}
                      </div>
                      {team.description && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                          {team.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {team._count.members} member{team._count.members !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {team._count.credentials} credential{team._count.credentials !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {team.isOwner && (
                        deleteId === team.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDelete(team.id)}
                              className="text-xs px-2.5 py-1.5 rounded-lg font-medium"
                              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteId(null)}
                              className="text-xs px-2.5 py-1.5 rounded-lg"
                              style={{ background: 'var(--card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteId(team.id)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )
                      )}
                      <motion.button
                        whileHover={{ x: 2 }}
                        onClick={() => router.push(`/teams/${team.id}`)}
                        className="p-1.5 rounded-lg"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
