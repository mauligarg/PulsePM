import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Mail,
  Building2,
  Shield,
  KeyRound,
  Save,
  Loader2,
  Sparkles,
  Check,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/auth';
import { useToast } from '../components/common/Toast';
import { PasswordInput } from '../components/auth/PasswordInput';
import { PasswordRequirements } from '../components/auth/PasswordRequirements';
import { evaluatePassword } from '../utils/password';

const AVATAR_STYLES = ['avataaars', 'lorelei', 'notionists', 'bottts', 'initials'];

export const Profile: React.FC = () => {
  const { user, activeWorkspace, role, workspaces, switchWorkspace, updateUser, deleteWorkspace } =
    useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Change password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Delete workspace modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAvatar(user.avatar || '');
    }
  }, [user]);

  const effectiveAvatar =
    avatar.trim() ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || user?.name || 'User')}`;

  const { isValid: isPasswordStrong } = evaluatePassword(newPassword);
  const passwordsMatch = newPassword === confirmPassword;
  const showMismatchError = confirmPassword.length > 0 && !passwordsMatch;
  const canUpdatePassword =
    currentPassword.length > 0 &&
    isPasswordStrong &&
    confirmPassword.length > 0 &&
    passwordsMatch &&
    !isUpdatingPassword;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('Name cannot be empty', 'error');
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await authApi.updateProfile({
        name: name.trim(),
        avatar: avatar.trim(),
      });
      if (res.data?.user) {
        updateUser(res.data.user);
      }
      toast('Profile updated successfully');
    } catch (err: any) {
      toast(err.message || 'Failed to update profile', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUpdatePassword) return;

    setIsUpdatingPassword(true);
    try {
      const res = await authApi.changePassword({ currentPassword, newPassword });
      if (res.data?.token) {
        localStorage.setItem('token', res.data.token);
        useAuthStore.setState({ token: res.data.token });
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast('Password updated successfully');
    } catch (err: any) {
      toast(err.message || 'Failed to update password', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const roleBadgeColors: Record<string, string> = {
    owner: 'bg-amber-100 text-amber-800 border-amber-300',
    admin: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    member: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    guest: 'bg-slate-100 text-slate-700 border-slate-300',
  };

  return (
    <div className="space-y-5 sm:space-y-6 pb-12 animate-in fade-in max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-fluid-page-title font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-brand-600 shrink-0" />
          <span>My Profile</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your personal details, avatar, workspaces, and account password
        </p>
      </div>

      {/* Top Identity Summary Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <img
            src={effectiveAvatar}
            alt={name || user?.name || 'Profile'}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 border border-slate-200 object-cover shrink-0 shadow-sm"
          />
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
              {user?.name}
            </h2>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{user?.email}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {activeWorkspace && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  <Building2 className="w-3 h-3 text-slate-500" />
                  {activeWorkspace.name}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
                  roleBadgeColors[role || 'member']
                }`}
              >
                <Shield className="w-3 h-3" />
                {role || 'member'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Edit Profile Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-bold text-slate-900">Personal Information</h3>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label htmlFor="profile-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Name
              </label>
              <input
                id="profile-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>

            <div>
              <label htmlFor="profile-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                id="profile-email"
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-100 text-slate-500 border border-slate-200 rounded-xl cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="profile-avatar" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Profile Picture URL
              </label>
              <input
                id="profile-avatar"
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://example.com/avatar.png (optional)"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />

              {/* Quick Avatar Presets */}
              <div className="mt-2.5">
                <span className="block text-[11px] font-medium text-slate-500 mb-1.5">
                  Or pick a generated avatar:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {AVATAR_STYLES.map((style) => {
                    const presetUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(
                      name || user?.name || 'User'
                    )}`;
                    const isSelected = avatar.trim() === presetUrl;
                    return (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setAvatar(presetUrl)}
                        title={`Use ${style} avatar`}
                        className={`relative w-9 h-9 rounded-xl border p-0.5 transition-all ${
                          isSelected
                            ? 'border-brand-600 ring-2 ring-brand-500/25 bg-brand-50'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                        }`}
                      >
                        <img
                          src={presetUrl}
                          alt={style}
                          className="w-full h-full rounded-lg object-cover"
                        />
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => setAvatar('')}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingProfile || !name.trim()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm shadow-brand-500/25 transition-all"
            >
              {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Profile</span>
            </button>
          </form>
        </div>

        {/* Security / Change Password Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-bold text-slate-900">Change Password</h3>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <PasswordInput
              id="profile-current-password"
              label="Current Password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              autoComplete="current-password"
            />

            <div>
              <PasswordInput
                id="profile-new-password"
                label="New Password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create a strong password"
                autoComplete="new-password"
              />
              <PasswordRequirements password={newPassword} />
            </div>

            <div>
              <PasswordInput
                id="profile-confirm-password"
                label="Confirm New Password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                error={showMismatchError ? 'Passwords do not match' : undefined}
              />
              {confirmPassword.length > 0 && passwordsMatch && (
                <p className="mt-1.5 text-[11px] font-medium text-emerald-600">Passwords match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canUpdatePassword}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-sm shadow-brand-500/25 transition-all"
            >
              {isUpdatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              <span>Update Password</span>
            </button>
          </form>
        </div>
      </div>

      {/* Workspaces List Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-bold text-slate-900">Your Workspaces</h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">{workspaces.length} total</span>
        </div>

        {workspaces.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4">You do not belong to any workspaces yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {workspaces.map((ws) => {
              const isActive = activeWorkspace?._id === ws._id;
              return (
                <div
                  key={ws._id}
                  className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                    isActive
                      ? 'border-brand-300 bg-brand-50/40'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {ws.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{ws.name}</div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">/{ws.slug}</div>
                    </div>
                  </div>
                  {isActive ? (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 shrink-0">
                      Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => switchWorkspace(ws._id)}
                      className="text-xs font-semibold text-brand-600 hover:underline shrink-0"
                    >
                      Switch
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Danger Zone: Delete Workspace (Owner Only) */}
      {activeWorkspace && role === 'owner' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-rose-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Delete Active Workspace</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Permanently delete <strong>{activeWorkspace.name}</strong> and all its projects, tasks, sprints, comments, and time logs. This action cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmName('');
                setIsDeleteModalOpen(true);
              }}
              className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Workspace</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && activeWorkspace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Confirm Workspace Deletion</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (deleteConfirmName.trim() !== activeWorkspace.name) return;
                setIsDeletingWorkspace(true);
                try {
                  const deletedName = activeWorkspace.name;
                  const { hasNextWorkspace } = await deleteWorkspace(activeWorkspace._id);
                  setIsDeleteModalOpen(false);
                  toast(`Workspace "${deletedName}" deleted`);
                  if (!hasNextWorkspace) {
                    navigate('/workspaces');
                  }
                } catch (err: any) {
                  toast(err.message || 'Failed to delete workspace', 'error');
                } finally {
                  setIsDeletingWorkspace(false);
                }
              }}
              className="p-4 sm:p-5 space-y-4"
            >
              <p className="text-xs text-slate-600 leading-relaxed">
                This will permanently delete <strong>{activeWorkspace.name}</strong> and all data inside it. Type{' '}
                <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-rose-700">
                  {activeWorkspace.name}
                </code>{' '}
                to confirm:
              </p>

              <input
                type="text"
                required
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={activeWorkspace.name}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isDeletingWorkspace || deleteConfirmName.trim() !== activeWorkspace.name
                  }
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm"
                >
                  {isDeletingWorkspace && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Delete Permanently</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
