import React, { useState } from 'react';
import { NavLink as RouterNavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  KanbanSquare,
  FolderKanban,
  CheckSquare,
  Clock,
  Users,
  ChevronDown,
  Plus,
  Building2,
  ShieldAlert,
  LogOut,
  Sparkles,
  X,
  KeyRound,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';

interface SidebarProps {
  onCreateWorkspace: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onCreateWorkspace,
  isOpen = false,
  onClose,
}) => {
  const { user, activeWorkspace, role, workspaces, switchWorkspace, logout } = useAuthStore();
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Kanban Board', path: '/board', icon: KanbanSquare },
    { label: 'Projects', path: '/projects', icon: FolderKanban },
    { label: 'My Tasks', path: '/my-tasks', icon: CheckSquare },
    { label: 'Timesheet', path: '/timesheet', icon: Clock },
    { label: 'Team Members', path: '/members', icon: Users },
    ...(role === 'owner' || role === 'admin'
      ? [{ label: 'Audit Log', path: '/audit', icon: ShieldAlert }]
      : []),
  ];

  const roleBadgeColors: Record<string, string> = {
    owner: 'bg-amber-100 text-amber-800 border-amber-300',
    admin: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    member: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    guest: 'bg-slate-100 text-slate-700 border-slate-300',
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px] z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[min(17.5rem,85vw)] lg:w-64 lg:static lg:translate-x-0 bg-white border-r border-slate-200 flex flex-col h-dvh lg:h-screen shrink-0 select-none transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand & Workspace Switcher */}
        <div className="p-4 border-b border-slate-200 relative">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                PulsePM
              </span>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close navigation menu"
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

        {/* Workspace selector dropdown trigger */}
        <button
          onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
          className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 transition-all text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-md bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
              {activeWorkspace?.name?.charAt(0) || 'W'}
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-slate-800 truncate">
                {activeWorkspace?.name || 'Select Workspace'}
              </div>
              <div className="text-[10px] text-slate-500 capitalize">{role || 'member'}</div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </button>

        {/* Workspace Dropdown Menu */}
        {showWorkspaceMenu && (
          <div className="absolute top-full left-4 right-4 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Your Workspaces
            </div>
            <div className="max-h-48 overflow-y-auto">
              {workspaces.map((ws) => (
                <button
                  key={ws._id}
                  onClick={() => {
                    switchWorkspace(ws._id);
                    setShowWorkspaceMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-50 transition-colors ${
                    activeWorkspace?._id === ws._id ? 'font-semibold text-brand-600 bg-brand-50/50' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{ws.name}</span>
                  </div>
                  {activeWorkspace?._id === ws._id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-slate-100 mt-1 pt-1">
              <button
                onClick={() => {
                  setShowWorkspaceMenu(false);
                  onCreateWorkspace();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Workspace</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <RouterNavLink
              key={item.path}
              to={item.path}
              onClick={() => onClose?.()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-semibold shadow-sm shadow-brand-500/10'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </RouterNavLink>
          );
        })}
      </nav>

      {/* User Profile & Role Info */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/50">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`}
              alt={user?.name}
              className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 object-cover shrink-0"
            />
            <div className="truncate">
              <div className="text-xs font-semibold text-slate-800 truncate">{user?.name}</div>
              <div className="text-[10px] text-slate-500 truncate">{user?.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsChangePasswordOpen(true)}
              title="Change password"
              aria-label="Change password"
              className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
            >
              <KeyRound className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={logout}
              title="Log out"
              aria-label="Log out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RBAC Role Pill Indicator */}
        <div className="mt-2 flex items-center justify-between px-2">
          <span className="text-[11px] text-slate-500 font-medium">Tenant Role:</span>
          <span
            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
              roleBadgeColors[role || 'member']
            }`}
          >
            {role || 'member'}
          </span>
        </div>
      </div>
    </aside>
    <ChangePasswordModal
      isOpen={isChangePasswordOpen}
      onClose={() => setIsChangePasswordOpen(false)}
    />
    </>
  );
};
