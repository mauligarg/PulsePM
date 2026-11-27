import React, { useState, useEffect } from 'react';
import {
  KanbanSquare,
  ListFilter,
  Plus,
  Loader2,HHHH
} from 'lucide-react';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { ListView } from '../components/kanban/ListView';
import { CreateTaskModal } from '../components/kanban/CreateTaskModal';
import { useBoardStore } from '../store/boardStore';
import { useAuthStore } from '../store/authStore';
import { workspaceApi } from '../services/workspaces';
import { Member } from '../types';

export const Board: React.FC = () => {
  const {
    currentProject,
    tasks,
    isLoadingTasks,
    filterStatus,
    setFilterStatus,
    filterAssignee,
    setFilterAssignee,
  } = useBoardStore();

  const role = useAuthStore((s) => s.role);
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);

  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);

  const isGuest = role === 'guest';

  useEffect(() => {
    if (activeWorkspace?._id) {
      workspaceApi.getMembers(activeWorkspace._id).then((res) => setMembers(res.data));
    }
  }, [activeWorkspace?._id]);

  if (!currentProject) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-slate-200">
        <KanbanSquare className="w-12 h-12 text-slate-300 mb-3" />
        <h3 className="text-base font-bold text-slate-800">No Project Selected</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Please select or create a project from the top menu or projects page to view the board.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-7.5rem)] lg:h-[calc(100vh-6.5rem)] flex flex-col space-y-3 sm:space-y-4 animate-in fade-in">
      {/* Board Controls & Filter Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 shrink-0">
        {/* Left: Project title & View toggles */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200 shrink-0">
                {currentProject.key}
              </span>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                {currentProject.name}
              </h1>
            </div>
          </div>

          <div className="h-5 w-[1px] bg-slate-200 hidden sm:block shrink-0" />

          {/* View Mode Toggle: Kanban vs List */}
          <div className="flex flex-wrap items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold w-full sm:w-auto">
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'board'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <KanbanSquare className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>
        </div>

        {/* Right: Filters & Action */}
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3">
          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 sm:py-1.5 focus:outline-none focus:bg-white"
          >
            <option value="">All Statuses</option>
            <option value="backlog">Backlog</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="done">Done</option>
          </select>

          {/* Assignee filter */}
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="w-full sm:w-auto text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 sm:py-1.5 focus:outline-none focus:bg-white"
          >
            <option value="">All Assignees</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </select>

          {!isGuest && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="w-full sm:w-auto justify-center flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-all shadow-brand-500/25"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Board Canvas */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isLoadingTasks ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          </div>
        ) : viewMode === 'board' ? (
          <KanbanBoard />
        ) : (
          <div className="h-full overflow-y-auto">
            <ListView tasks={tasks} />
          </div>
        )}
      </div>

      <CreateTaskModal
        isOpen={isCreateOpen}
        defaultStatus="todo"
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
};
