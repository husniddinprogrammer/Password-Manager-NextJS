'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, ArrowLeft, UserPlus, Trash2, Crown, Loader2, Shield, UserMinus
} from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '@/components/Layout/Sidebar';
import { useSession } from '@/context/SessionContext';

interface TeamMemberItem {
  id: string;
  teamId: string;
  userId: string;
  role: 'OWNER' | 'MEMBER';
  joinedAt: string;
  user: { id: string; username: string | null; displayName: string | null; email: string | null };
}

interface TeamDetail {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  ownerId: string;
  isOwner: boolean;
  myRole: 'OWNER' | 'MEMBER';
  members: TeamMemberItem[];
  _count: { credentials: number };
}

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSession();

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editing, setEditing] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams/${id}`);
      if (!res.ok) { router.push('/teams'); return; }
      const { data } = await res.json();
      setTeam(data);
      setEditName(data.name);
      setEditDesc(data.description ?? '');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteIdentifier.trim()) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/teams/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: inviteIdentifier.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add member');
      toast.success('Member added!');
      setInviteIdentifier('');
      setShowInvite(false);
      fetchTeam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      const res = await fetch(`/api/teams/${id}/members/${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove');
      }
      toast.success('Member removed');
      fetchTeam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setRemoveId(null);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setEditing(true);
    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      toast.success('Team updated!');
      setTeam((prev) => prev ? { ...prev, name: data.data.name, description: data.data.description } : prev);
      setShowEdit(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update team');
    } finally {
      setEditing(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };

  const getMemberLabel = (m: TeamMemberItem) =>
    m.user.displayName ?? m.user.username ?? m.user.email ?? 'Unknown';

  const getMemberSub = (m: TeamMemberItem) =>
    m.user.username && m.user.displayName ? `@${m.user.username}` : (m.user.email ?? '');

  const getMemberInitials = (m: TeamMemberItem) => {
    const label = getMemberLabel(m);
    return label.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#6366f1' }} />
        </div>
      </div>
    );
  }

  if (!team) return null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header
          className="h-16 flex items-center justify-between px-6 flex-shrink-0"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/teams')}
              className="flex items-center gap-2 text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.1)' }}
            >
              <Users className="w-4 h-4" style={{ color: '#6366f1' }} />
            </div>
            <div>
              <h1 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {team.name}
              </h1>
              {team.description && (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {team.description}
                </p>
              )}
            </div>
          </div>

          {team.isOwner && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEdit(!showEdit)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'var(--card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                Edit
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowInvite(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Member
              </motion.button>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Edit form */}
            <AnimatePresence>
              {showEdit && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-2xl p-5"
                  style={{ background: 'var(--surface)', border: '1px solid rgba(99,102,241,0.3)' }}
                >
                  <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                    Edit Team
                  </h2>
                  <form onSubmit={handleEdit} className="space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Team name"
                      className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                      style={inputStyle}
                    />
                    <input
                      type="text"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Description (optional)"
                      className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                      style={inputStyle}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowEdit(false)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                        style={{ background: 'var(--card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                      >
                        Cancel
                      </button>
                      <motion.button
                        type="submit"
                        whileTap={{ scale: 0.97 }}
                        disabled={editing || !editName.trim()}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                      >
                        {editing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Save
                      </motion.button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Invite form */}
            <AnimatePresence>
              {showInvite && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-2xl p-5"
                  style={{ background: 'var(--surface)', border: '1px solid rgba(99,102,241,0.3)' }}
                >
                  <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                    Add Member
                  </h2>
                  <form onSubmit={handleInvite} className="flex gap-2">
                    <input
                      type="text"
                      value={inviteIdentifier}
                      onChange={(e) => setInviteIdentifier(e.target.value)}
                      placeholder="Username or email"
                      autoFocus
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => { setShowInvite(false); setInviteIdentifier(''); }}
                      className="px-3 py-2.5 rounded-xl text-sm"
                      style={{ background: 'var(--card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                    >
                      Cancel
                    </button>
                    <motion.button
                      type="submit"
                      whileTap={{ scale: 0.97 }}
                      disabled={inviting || !inviteIdentifier.trim()}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                    >
                      {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      Add
                    </motion.button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Members', value: team.members.length, icon: Users },
                { label: 'Credentials', value: team._count.credentials, icon: Shield },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-xl p-4 flex items-center gap-3"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(99,102,241,0.1)' }}
                  >
                    <Icon className="w-4 h-4" style={{ color: '#6366f1' }} />
                  </div>
                  <div>
                    <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Members list */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Members
                </h2>
              </div>

              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {team.members.map((m) => {
                  const isCurrentUser = m.userId === user?.id;
                  const isTeamOwner = m.userId === team.ownerId;

                  return (
                    <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                      >
                        {getMemberInitials(m)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {getMemberLabel(m)}
                            {isCurrentUser && (
                              <span className="ml-1 text-xs" style={{ color: 'var(--text-secondary)' }}>(you)</span>
                            )}
                          </p>
                          {isTeamOwner && (
                            <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                              <Crown className="w-3 h-3" />
                              Owner
                            </span>
                          )}
                          {!isTeamOwner && m.role === 'MEMBER' && (
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                              Member
                            </span>
                          )}
                        </div>
                        {getMemberSub(m) && (
                          <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                            {getMemberSub(m)}
                          </p>
                        )}
                      </div>

                      {/* Remove button: owner can remove others; member can leave */}
                      {!isTeamOwner && (team.isOwner || isCurrentUser) && (
                        removeId === m.userId ? (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => handleRemove(m.userId)}
                              className="text-xs px-2 py-1 rounded-lg font-medium"
                              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                            >
                              {isCurrentUser ? 'Leave' : 'Remove'}
                            </button>
                            <button
                              onClick={() => setRemoveId(null)}
                              className="text-xs px-2 py-1 rounded-lg"
                              style={{ background: 'var(--card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRemoveId(m.userId)}
                            className="p-1.5 rounded-lg flex-shrink-0"
                            style={{ color: 'var(--text-secondary)' }}
                            title={isCurrentUser ? 'Leave team' : 'Remove member'}
                          >
                            {isCurrentUser ? <UserMinus className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
