import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  X,
} from 'lucide-react';
import { Member, Role } from '../types';
import { workspaceApi } from '../api/workspaces';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/common/Toast';

export const Members: React.FC = () => {
  const { activeWorkspace, role, user } = useAuthStore();
  const { toast } = useToast();

  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'guest'>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);

  const canManageMembers = role === 'owner' || role === 'admin';

  const loadMembers = async () => {
    if (!activeWorkspace?._id) return;
    try {
      setIsLoading(true);
      const res = await workspaceApi.getMembers(activeWorkspace._id);
      setMembers(res.data);
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [activeWorkspace?._id]);

  const handleRoleChange = async (memberUserId: string, newRole: Role) => {
    if (!activeWorkspace?._id) return;
    try {
      await workspaceApi.updateRole(activeWorkspace._id, memberUserId, newRole);
      toast('Member role updated successfully');
      loadMembers();
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!activeWorkspace?._id) return;
    if (!window.confirm('Are you sure you want to remove this member?')) return;

    try {
      await workspaceApi.removeMember(activeWorkspace._id, memberUserId);
      toast('Member removed');
      loadMembers();
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace?._id || !inviteEmail.trim()) return;

    try {
      setIsInviting(true);
      const res = await workspaceApi.createInvite(activeWorkspace._id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      toast(`Invitation generated for ${inviteEmail}!`);
      if (res.data?.devInviteLink) {
        setGeneratedInviteLink(res.data.devInviteLink);
      } else {
        setIsInviteOpen(false);
        setInviteEmail('');
      }
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast('Link copied to clipboard!');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Team Members</h1>
          <p className="text-xs text-slate-500">
            Manage collaborators and RBAC roles in {activeWorkspace?.name}
          </p>
        </div>

        {canManageMembers && (
          <button
            onClick={() => {
              setGeneratedInviteLink(null);
              setIsInviteOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-brand-500/25 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Joined Date</th>
                {canManageMembers && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Loader2 className="w-6 h-6 text-brand-600 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const isSelf = m.userId === user?._id;
                  const isOwner = m.role === 'owner';

                  return (
                    <tr key={m._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              m.avatar ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`
                            }
                            alt={m.name}
                            className="w-8 h-8 rounded-full border border-slate-200 object-cover bg-slate-100 shrink-0"
                          />
                          <div>
                            <span className="font-semibold text-slate-900 block">{m.name}</span>
                            {isSelf && (
                              <span className="text-[10px] text-brand-600 font-bold">(You)</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">{m.email}</td>

                      <td className="py-3.5 px-4">
                        {canManageMembers && !isOwner && !isSelf ? (
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.userId, e.target.value as Role)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                          >
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                            <option value="guest">Guest</option>
                          </select>
                        ) : (
                          <span
                            className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${
                              m.role === 'owner'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : m.role === 'admin'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : m.role === 'member'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {m.role}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(m.joinedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      {canManageMembers && (
                        <td className="py-3.5 px-4 text-right">
                          {!isOwner && !isSelf && (
                            <button
                              onClick={() => handleRemoveMember(m.userId)}
                              title="Remove member"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Invite New Team Member</h3>
                  <p className="text-xs text-slate-400">Single-use, 48h expiring token security</p>
                </div>
              </div>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {generatedInviteLink ? (
              <div className="p-6 space-y-4">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900">Invitation Generated!</h4>
                    <p className="text-xs text-emerald-700 mt-1">
                      Because SMTP is in dev/local mode, copy the evaluation invite link below:
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono break-all select-all text-slate-800">
                  {generatedInviteLink}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(generatedInviteLink)}
                    className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy Link</span>
                  </button>
                  <a
                    href={generatedInviteLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    <span>Test Open</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <button
                  onClick={() => {
                    setIsInviteOpen(false);
                    setGeneratedInviteLink(null);
                    setInviteEmail('');
                    loadMembers();
                  }}
                  className="w-full text-xs text-slate-500 hover:text-slate-800 font-semibold pt-2"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="admin">Admin (Manage projects & invite teammates)</option>
                    <option value="member">Member (Create and update tasks)</option>
                    <option value="guest">Guest (Read-only observation)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsInviteOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isInviting || !inviteEmail.trim()}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-2"
                  >
                    {isInviting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Generate & Send Invite</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
