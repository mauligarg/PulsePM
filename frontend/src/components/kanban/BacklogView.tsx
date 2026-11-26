import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  Plus,
  Calendar,
  ArrowRight,
  Trash2,
  Edit2,
  Layers,
  X,
  Clock,
} from 'lucide-react';
import { Sprint, Task } from '../../types';
import { useBoardStore } from '../../store/boardStore';
import { useAuthStore } from '../../store/authStore';
import { sprintApi } from '../../services/sprints';
import { useToast } from '../common/Toast';
import { TaskDrawer } from './TaskDrawer';

export const BacklogView: React.FC<{ onAddTask: (defaultStatus?: 'backlog' | 'todo') => void }> = ({
  onAddTask,
}) => {
  const { currentProject, sprints, tasks, fetchSprints, fetchTasks } = useBoardStore();
  const role = useAuthStore((s) => s.role);
  const { toast } = useToast();

  const isGuest = role === 'guest';
  const canDeleteSprint = role === 'owner' || role === 'admin';

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [completeModalSprint, setCompleteModalSprint] = useState<Sprint | null>(null);
  const [moveUnfinishedTo, setMoveUnfinishedTo] = useState<string>('backlog');

  // Sprint form state
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const openCreateModal = () => {
    setEditingSprint(null);
    setName(`Sprint ${sprints.length + 1}`);
    setGoal('');
    setStartDate('');
    setEndDate('');
    setIsSprintModalOpen(true);
  };

  const openEditModal = (sprint: Sprint) => {
    setEditingSprint(sprint);
    setName(sprint.name);
    setGoal(sprint.goal || '');
    setStartDate(sprint.startDate ? sprint.startDate.split('T')[0] : '');
    setEndDate(sprint.endDate ? sprint.endDate.split('T')[0] : '');
    setIsSprintModalOpen(true);
  };

  const handleSaveSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !name.trim()) return;

    try {
      setIsSaving(true);
      if (editingSprint) {
        await sprintApi.update(editingSprint._id, {
          name: name.trim(),
          goal: goal.trim(),
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        toast('Sprint updated');
      } else {
        await sprintApi.create({
          projectId: currentProject._id,
          name: name.trim(),
          goal: goal.trim(),
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        toast('Sprint created');
      }
      setIsSprintModalOpen(false);
      await fetchSprints();
    } catch (err: any) {
      toast(err.message || 'Failed to save sprint', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartSprint = async (sprint: Sprint) => {
    try {
      await sprintApi.start(sprint._id);
      toast(`Sprint "${sprint.name}" is now active!`);
      await Promise.all([fetchSprints(), fetchTasks()]);
    } catch (err: any) {
      toast(err.message || 'Failed to start sprint', 'error');
    }
  };

  const handleCompleteSprint = async () => {
    if (!completeModalSprint) return;
    try {
      const res = await sprintApi.complete(completeModalSprint._id, moveUnfinishedTo);
      toast(`Sprint completed (${res.data.movedUnfinishedCount} unfinished moved)`);
      setCompleteModalSprint(null);
      await Promise.all([fetchSprints(), fetchTasks()]);
    } catch (err: any) {
      toast(err.message || 'Failed to complete sprint', 'error');
    }
  };

  const handleDeleteSprint = async (sprint: Sprint) => {
    if (!window.confirm(`Delete "${sprint.name}"? Tasks will be returned to the backlog.`)) return;
    try {
      await sprintApi.delete(sprint._id);
      toast('Sprint deleted');
      await Promise.all([fetchSprints(), fetchTasks()]);
    } catch (err: any) {
      toast(err.message || 'Failed to delete sprint', 'error');
    }
  };

  const handleMoveTask = async (taskId: string, targetSprintIdOrBacklog: string) => {
    try {
      await sprintApi.assignTasks(targetSprintIdOrBacklog, [taskId]);
      toast(targetSprintIdOrBacklog === 'backlog' ? 'Moved to Backlog' : 'Moved to Sprint');
      await Promise.all([fetchSprints(), fetchTasks()]);
    } catch (err: any) {
      toast(err.message || 'Failed to move task', 'error');
    }
  };

  const backlogTasks = tasks.filter((t) => !t.sprintId);
  const openSprints = sprints.filter((s) => s.status !== 'completed');
  const completedSprints = sprints.filter((s) => s.status === 'completed');

  const priorityColors: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600',
    medium: 'bg-blue-50 text-blue-700',
    high: 'bg-amber-50 text-amber-700',
    urgent: 'bg-rose-50 text-rose-700 font-bold',
  };

  const statusBadge: Record<string, string> = {
    backlog: 'bg-slate-100 text-slate-600',
    todo: 'bg-blue-50 text-blue-700',
    in_progress: 'bg-amber-50 text-amber-700',
    in_review: 'bg-purple-50 text-purple-700',
    done: 'bg-emerald-50 text-emerald-700',
  };

  const renderTaskRow = (task: Task, currentSprintId?: string) => (
    <div
      key={task._id}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-3 bg-white border border-slate-200/80 rounded-xl hover:border-brand-300 transition-colors"
    >
      <div
        onClick={() => setSelectedTaskId(task._id)}
        className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 cursor-pointer"
      >
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded shrink-0 ${statusBadge[task.status]}`}>
          {task.status.replace('_', ' ')}
        </span>
        <span className="text-xs font-semibold text-slate-900 truncate hover:text-brand-600">
          {task.title}
        </span>
        <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded shrink-0 ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
      </div>

      <div className="flex items-center justify-end sm:justify-start gap-2.5 sm:gap-3 shrink-0">
        {task.estimateHours > 0 && (
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {task.estimateHours}h
          </span>
        )}
        {task.assigneeId && (
          <div className="flex items-center gap-1.5 min-w-0 max-w-[120px]" title={task.assigneeId.name}>
            <img
              src={task.assigneeId.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assigneeId.name}`}
              alt={task.assigneeId.name}
              className="w-6 h-6 rounded-full border border-slate-200 shrink-0"
            />
            <span className="hidden sm:inline text-[11px] font-medium text-slate-600 truncate">
              {task.assigneeId.name}
            </span>
          </div>
        )}
        {!isGuest && (
          <select
            value={currentSprintId || 'backlog'}
            onChange={(e) => handleMoveTask(task._id, e.target.value)}
            className="text-[11px] font-medium bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
            title="Move task to Sprint or Backlog"
          >
            <option value="backlog">Backlog</option>
            {openSprints.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} ({s.status})
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-12 overflow-y-auto h-full pr-1">
      {/* Header action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-600" />
            <span>Sprints &amp; Backlog Planning</span>
          </h2>
          <p className="text-xs text-slate-500">
            Organize sprints, start iterations, and move tasks between backlog and active sprints.
          </p>
        </div>
        {!isGuest && (
          <button
            onClick={openCreateModal}
            className="w-full sm:w-auto justify-center flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Sprint</span>
          </button>
        )}
      </div>

      {/* Active & Planned Sprints */}
      <div className="space-y-4">
        {openSprints.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <p className="text-xs text-slate-500">No active or planned sprints yet. Create a sprint to start planning.</p>
          </div>
        ) : (
          openSprints.map((sprint) => {
            const sprintTasks = tasks.filter((t) => t.sprintId === sprint._id);
            const totalHours = sprintTasks.reduce((acc, t) => acc + (t.estimateHours || 0), 0);

            return (
              <div key={sprint._id} className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          sprint.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {sprint.status}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{sprint.name}</h3>
                      <span className="text-xs text-slate-500">
                        ({sprintTasks.length} tasks · {totalHours}h est.)
                      </span>
                    </div>
                    {sprint.goal && <p className="text-xs text-slate-500 mt-1">{sprint.goal}</p>}
                    {(sprint.startDate || sprint.endDate) && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {sprint.startDate ? new Date(sprint.startDate).toLocaleDateString() : 'TBD'} →{' '}
                          {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : 'TBD'}
                        </span>
                      </div>
                    )}
                  </div>

                  {!isGuest && (
                    <div className="flex items-center gap-2">
                      {sprint.status === 'planned' && (
                        <button
                          onClick={() => handleStartSprint(sprint)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                          <Play className="w-3.5 h-3.5" /> Start Sprint
                        </button>
                      )}
                      {sprint.status === 'active' && (
                        <button
                          onClick={() => {
                            setMoveUnfinishedTo('backlog');
                            setCompleteModalSprint(sprint);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Complete Sprint
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(sprint)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-800 border border-transparent hover:border-slate-200"
                        title="Edit Sprint"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {canDeleteSprint && (
                        <button
                          onClick={() => handleDeleteSprint(sprint)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Delete Sprint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {sprintTasks.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center bg-white/60 rounded-xl border border-dashed border-slate-200">
                      No tasks in this sprint yet. Move tasks from the Backlog below.
                    </p>
                  ) : (
                    sprintTasks.map((t) => renderTaskRow(t, sprint._id))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Project Backlog */}
      <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Backlog</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {backlogTasks.length}
            </span>
          </div>
          {!isGuest && (
            <button
              onClick={() => onAddTask('backlog')}
              className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add Backlog Task
            </button>
          )}
        </div>

        <div className="space-y-2">
          {backlogTasks.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center bg-white/60 rounded-xl border border-dashed border-slate-200">
              Backlog is empty.
            </p>
          ) : (
            backlogTasks.map((t) => renderTaskRow(t))
          )}
        </div>
      </div>

      {/* Completed Sprints */}
      {completedSprints.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Completed Sprints</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {completedSprints.map((s) => (
              <div key={s._id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">{s.name}</div>
                  <div className="text-[11px] text-slate-400">
                    {s.doneCount || 0}/{s.taskCount || 0} tasks · {s.completedEstimate || 0}h completed
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Completed
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create / Edit Sprint Modal */}
      {isSprintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingSprint ? 'Edit Sprint' : 'Create New Sprint'}
              </h3>
              <button onClick={() => setIsSprintModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSprint} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sprint Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sprint Goal</label>
                <textarea
                  rows={2}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="What is the goal for this iteration?"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSprintModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl"
                >
                  {isSaving ? 'Saving...' : editingSprint ? 'Update Sprint' : 'Create Sprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Sprint Modal */}
      {completeModalSprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Complete "{completeModalSprint.name}"</h3>
            <p className="text-xs text-slate-600">
              Where should any unfinished tasks (not marked Done) be moved?
            </p>
            <select
              value={moveUnfinishedTo}
              onChange={(e) => setMoveUnfinishedTo(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
            >
              <option value="backlog">Return to Project Backlog</option>
              {openSprints
                .filter((s) => s._id !== completeModalSprint._id)
                .map((s) => (
                  <option key={s._id} value={s._id}>
                    Move to: {s.name}
                  </option>
                ))}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCompleteModalSprint(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteSprint}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
              >
                <span>Complete Sprint</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTaskId && (
        <TaskDrawer
          taskId={selectedTaskId}
          isOpen={!!selectedTaskId}
          onClose={() => {
            setSelectedTaskId(null);
            fetchTasks();
          }}
        />
      )}
    </div>
  );
};
