import React from 'react';
import { Search, Radio, Plus, FolderKanban, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useBoardStore } from '../../store/boardStore';
import { useSocket } from '../../hooks/useSocket';

export const Topbar: React.FC<{ onNewTask?: () => void }> = ({ onNewTask }) => {
  const { activeWorkspace, role } = useAuthStore();
  const { projects, currentProject, setCurrentProject, searchQuery, setSearchQuery } = useBoardStore();
  const { isConnected } = useSocket();

  const isGuest = role === 'guest';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 gap-4">
      {/* Left: Project Selector & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-brand-600 shrink-0" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline">
            Project:
          </span>
        </div>

        {projects.length > 0 ? (
          <select
            value={currentProject?._id || ''}
            onChange={(e) => {
              const selected = projects.find((p) => p._id === e.target.value);
              if (selected) setCurrentProject(selected);
            }}
            className="text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
          >
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                [{p.key}] {p.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-slate-500 italic">No projects created yet</span>
        )}

        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
          <span>Slug:</span>
          <span className="font-mono text-slate-800">{activeWorkspace?.slug}</span>
        </div>
      </div>

      {/* Center: Search input */}
      <div className="flex-1 max-w-md relative hidden md:block">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tasks by title..."
          className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
        />
      </div>

      {/* Right: Real-time Socket Indicator & Action */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Socket live status */}
        <div
          title={isConnected ? 'Real-time WebSocket connected' : 'Connecting to real-time events...'}
          className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            isConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          <span className="relative flex h-2 w-2">
            {isConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </span>
          <span className="hidden sm:inline text-[11px]">
            {isConnected ? 'Live Sync' : 'Connecting'}
          </span>
        </div>

        {/* Quick Add Task button (Hidden for Guests per RBAC) */}
        {onNewTask && !isGuest && (
          <button
            onClick={onNewTask}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm shadow-brand-600/30 transition-all hover:shadow"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Task</span>
          </button>
        )}
      </div>
    </header>
  );
};
