import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Clock,
  Send,
  MessageSquare,
  CheckCircle2,
  Circle,
  Plus,
  Loader2,
  Paperclip,
  Download,
  History,
} from 'lucide-react';
import { Task, Comment, Member, TaskStatus, TaskPriority, TimeLog, Activity } from '../../types';
import { taskApi } from '../../api/tasks';
import { API_BASE } from '../../api/client';
import { timeLogApi } from '../../api/timelogs';
import { apiClient } from '../../api/client';
import { workspaceApi } from '../../api/workspaces';
import { useAuthStore } from '../../store/authStore';
import { useBoardStore } from '../../store/boardStore';
import { useToast } from '../common/Toast';

interface TaskDrawerProps {
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({ taskId, isOpen, onClose }) => {
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const { applyTaskUpdated, applyTaskDeleted } = useBoardStore();
  const { toast } = useToast();

  const [task, setTask] = useState<(Task & { subtasks: Task[]; comments: Comment[] }) | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [, setEstimateHours] = useState('0');

  // Subtask, Comment, Attachment, TimeLog & History states
  const [activeTab, setActiveTab] = useState<'details' | 'timelogs' | 'history'>('details');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [totalLoggedHours, setTotalLoggedHours] = useState(0);
  const [logHours, setLogHours] = useState('1');
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [logNote, setLogNote] = useState('');
  const [taskHistory, setTaskHistory] = useState<Activity[]>([]);

  const isGuest = role === 'guest';
  const canDelete = role === 'owner' || role === 'admin';

  useEffect(() => {
    if (!taskId || !isOpen) return;

    setIsLoading(true);
    taskApi
      .getById(taskId)
      .then((res) => {
        const t = res.data;
        setTask(t);
        setTitle(t.title);
        setDescription(t.description || '');
        setStatus(t.status);
        setPriority(t.priority);
        setAssigneeId(t.assigneeId?._id || '');
        setDueDate(t.dueDate ? t.dueDate.split('T')[0] : '');
        setEstimateHours(t.estimateHours?.toString() || '0');
      })
      .catch((err) => {
        toast(err.message || 'Failed to fetch task details', 'error');
        onClose();
      })
      .finally(() => setIsLoading(false));

    if (activeWorkspace?._id) {
      workspaceApi.getMembers(activeWorkspace._id).then((res) => setMembers(res.data));
    }

    timeLogApi
      .listByTask(taskId)
      .then((res) => {
        setTimeLogs(res.data.logs);
        setTotalLoggedHours(res.data.totalHours);
      })
      .catch(() => {});

    (apiClient.get('/activity', { params: { entityId: taskId, limit: 30 } }) as Promise<any>)
      .then((res) => {
        setTaskHistory(res.data?.activities || []);
      })
      .catch(() => {});
  }, [taskId, isOpen, activeWorkspace?._id]);

  if (!isOpen) return null;

  const handleSaveField = async (fieldUpdates: Partial<Task>) => {
    if (isGuest) return;

    try {
      setIsSaving(true);
      const res = await taskApi.update(taskId, fieldUpdates);
      applyTaskUpdated(res.data);
      if (task) {
        setTask({ ...task, ...res.data });
      }
    } catch (err: any) {
      toast(err.message || 'Failed to update task', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isGuest) return;

    try {
      setIsSendingComment(true);
      const res = await taskApi.addComment(taskId, newComment.trim());
      setTask((prev) => (prev ? { ...prev, comments: [...prev.comments, res.data] } : prev));
      setNewComment('');
      toast('Comment posted');
    } catch (err: any) {
      toast(err.message || 'Failed to post comment', 'error');
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !task || isGuest) return;

    try {
      const projId = task.projectId && typeof task.projectId === 'object' ? task.projectId._id : task.projectId;
      const res = await taskApi.create({
        projectId: projId,
        title: newSubtaskTitle.trim(),
        parentTaskId: task._id,
        status: 'todo',
      });
      setTask((prev) => (prev ? { ...prev, subtasks: [...prev.subtasks, res.data] } : prev));
      setNewSubtaskTitle('');
      toast('Subtask added');
    } catch (err: any) {
      toast(err.message || 'Failed to add subtask', 'error');
    }
  };

  const handleToggleSubtask = async (subtask: Task) => {
    if (isGuest) return;
    const newStatus = subtask.status === 'done' ? 'todo' : 'done';
    try {
      await taskApi.update(subtask._id, { status: newStatus });
      setTask((prev) =>
        prev
          ? {
              ...prev,
              subtasks: prev.subtasks.map((s) =>
                s._id === subtask._id ? { ...s, status: newStatus } : s
              ),
            }
          : prev
      );
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isGuest) return;
    try {
      setIsUploading(true);
      const res = await taskApi.uploadAttachment(taskId, file);
      setTask((prev) =>
        prev ? { ...prev, attachments: [...(prev.attachments || []), res.data] } : prev
      );
      toast('Attachment uploaded');
    } catch (err: any) {
      toast(err.message || 'Failed to upload attachment', 'error');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await taskApi.deleteAttachment(taskId, attachmentId);
      setTask((prev) =>
        prev
          ? {
              ...prev,
              attachments: (prev.attachments || []).filter((a) => a._id !== attachmentId),
            }
          : prev
      );
      toast('Attachment removed');
    } catch (err: any) {
      toast(err.message || 'Failed to delete attachment', 'error');
    }
  };

  const handleAddTimeLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logHours || Number(logHours) <= 0 || isGuest) return;
    try {
      const res = await timeLogApi.createOnTask(taskId, {
        hours: Number(logHours),
        date: logDate,
        note: logNote.trim(),
      });
      setTimeLogs((prev) => [res.data, ...prev]);
      setTotalLoggedHours((prev) => Math.round((prev + Number(logHours)) * 100) / 100);
      setLogNote('');
      toast('Time logged');
    } catch (err: any) {
      toast(err.message || 'Failed to log time', 'error');
    }
  };

  const handleDeleteTimeLog = async (logId: string, hours: number) => {
    try {
      await timeLogApi.delete(logId);
      setTimeLogs((prev) => prev.filter((l) => l._id !== logId));
      setTotalLoggedHours((prev) => Math.max(0, Math.round((prev - hours) * 100) / 100));
      toast('Time log deleted');
    } catch (err: any) {
      toast(err.message || 'Failed to delete time log', 'error');
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await taskApi.delete(taskId);
      applyTaskDeleted(taskId);
      toast('Task deleted successfully');
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to delete task', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-brand-600 uppercase tracking-wider">
              {task?.projectId && typeof task.projectId === 'object' ? task.projectId.key : 'TASK'}
            </span>
            <span>/</span>
            <span>Task Details</span>
            {isSaving && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canDelete && (
              <button
                onClick={handleDeleteTask}
                title="Delete Task"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Tabs */}
        <div className="px-6 border-b border-slate-200 flex items-center gap-4 bg-white text-xs font-semibold">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2.5 border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Details &amp; Comments
          </button>
          <button
            onClick={() => setActiveTab('timelogs')}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'timelogs'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Time Logs ({totalLoggedHours}h)
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'history'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            History ({taskHistory.length})
          </button>
        </div>

        {/* Content Body */}
        {isLoading || !task ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
          </div>
        ) : activeTab === 'timelogs' ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-500">Total Logged vs Estimate</div>
                <div className="text-lg font-bold text-slate-900">
                  {totalLoggedHours}h <span className="text-xs font-normal text-slate-500">/ {task.estimateHours || 0}h est.</span>
                </div>
              </div>
              <Clock className="w-6 h-6 text-brand-600" />
            </div>

            {!isGuest && (
              <form onSubmit={handleAddTimeLog} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h5 className="text-xs font-bold text-slate-800">Log Time</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Hours</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0.1"
                      max="24"
                      required
                      value={logHours}
                      onChange={(e) => setLogHours(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  placeholder="What did you work on?"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg"
                >
                  Add Time Log
                </button>
              </form>
            )}

            <div className="space-y-2">
              {timeLogs.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">No time logged on this task yet.</p>
              ) : (
                timeLogs.map((log) => {
                  const canDel = canDelete || log.userId?._id === user?._id;
                  return (
                    <div key={log._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {log.userId?.name || 'Member'} · <span className="text-brand-600">{log.hours}h</span>
                        </div>
                        {log.note && <p className="text-slate-600 mt-0.5">{log.note}</p>}
                        <span className="text-[10px] text-slate-400">{new Date(log.date).toLocaleDateString()}</span>
                      </div>
                      {canDel && (
                        <button
                          onClick={() => handleDeleteTimeLog(log._id, log.hours)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : activeTab === 'history' ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {taskHistory.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-8">No audit history recorded for this task yet.</p>
            ) : (
              taskHistory.map((item) => (
                <div key={item._id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      {item.actorId?.name || 'System'} <span className="font-normal text-slate-600">{item.action}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  {Array.isArray(item.meta?.diffs) && item.meta.diffs.length > 0 && (
                    <div className="mt-1 space-y-0.5 text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                      {item.meta.diffs.map((d: any, i: number) => (
                        <div key={i}>
                          <strong className="text-slate-700">{d.field}</strong>:{' '}
                          <span className="line-through text-rose-500">{String(d.from ?? 'empty')}</span> →{' '}
                          <span className="text-emerald-700 font-medium">{String(d.to ?? 'empty')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title (Inline editable) */}
            <div>
              <input
                type="text"
                disabled={isGuest}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => handleSaveField({ title })}
                className="w-full text-lg font-bold text-slate-900 bg-transparent border border-transparent hover:border-slate-200 focus:border-brand-500 focus:bg-white rounded-lg px-2 py-1 focus:outline-none transition-all disabled:hover:border-transparent"
              />
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200 text-xs">
              {/* Status */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Status</label>
                <select
                  disabled={isGuest}
                  value={status}
                  onChange={(e) => {
                    const val = e.target.value as TaskStatus;
                    setStatus(val);
                    handleSaveField({ status: val });
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="backlog">Backlog</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Priority</label>
                <select
                  disabled={isGuest}
                  value={priority}
                  onChange={(e) => {
                    const val = e.target.value as TaskPriority;
                    setPriority(val);
                    handleSaveField({ priority: val });
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Assignee */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Assignee</label>
                <select
                  disabled={isGuest}
                  value={assigneeId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAssigneeId(val);
                    handleSaveField({ assigneeId: val ? (val as any) : null });
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Due Date</label>
                <input
                  type="date"
                  disabled={isGuest}
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    handleSaveField({ dueDate: e.target.value || (null as any) });
                  }}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Description
              </h5>
              <textarea
                rows={4}
                disabled={isGuest}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => handleSaveField({ description })}
                placeholder={isGuest ? 'No description provided.' : 'Add a detailed description...'}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none disabled:bg-slate-50"
              />
            </div>

            {/* Subtasks Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Subtasks ({task.subtasks.filter((s) => s.status === 'done').length}/
                  {task.subtasks.length})
                </h5>
              </div>

              {/* Subtasks List */}
              <div className="space-y-1.5 mb-2">
                {task.subtasks.map((subtask) => (
                  <div
                    key={subtask._id}
                    onClick={() => handleToggleSubtask(subtask)}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 border border-slate-100 cursor-pointer transition-colors"
                  >
                    {subtask.status === 'done' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <span
                      className={`text-xs flex-1 ${
                        subtask.status === 'done'
                          ? 'line-through text-slate-400'
                          : 'text-slate-800'
                      }`}
                    >
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </div>

              {!isGuest && (
                <form onSubmit={handleAddSubtask} className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Add a new subtask..."
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  <button
                    type="submit"
                    disabled={!newSubtaskTitle.trim()}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-40 transition-colors"
                  >
                    Add
                  </button>
                </form>
              )}
            </div>

            {/* Attachments Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Attachments ({task.attachments?.length || 0})</span>
                </h5>
                {!isGuest && (
                  <label className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
                    <input
                      type="file"
                      disabled={isUploading}
                      onChange={handleUploadAttachment}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {(task.attachments?.length || 0) === 0 ? (
                <p className="text-xs text-slate-400 italic">No files attached.</p>
              ) : (
                <div className="space-y-1.5">
                  {task.attachments?.map((att) => {
                    const fileUrl = att.url.startsWith('/')
                      ? `${API_BASE.replace(/\/api\/?$/, '')}${att.url}`
                      : att.url;
                    const canDelAtt = canDelete || att.uploadedBy === user?._id;
                    return (
                      <div
                        key={att._id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate font-medium text-slate-800">{att.filename}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            ({Math.max(1, Math.round(att.size / 1024))} KB)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-slate-500 hover:text-brand-600 rounded"
                            title="Download / Open"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          {canDelAtt && (
                            <button
                              onClick={() => handleDeleteAttachment(att._id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Delete attachment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Comments Thread */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Activity & Comments ({task.comments.length})
                </h5>
              </div>

              {/* Comments list */}
              <div className="space-y-3 mb-4">
                {task.comments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No comments yet. Start the conversation!</p>
                ) : (
                  task.comments.map((comment) => (
                    <div key={comment._id} className="flex items-start gap-2.5">
                      <img
                        src={
                          comment.authorId?.avatar ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${
                            comment.authorId?.name || 'User'
                          }`
                        }
                        alt={comment.authorId?.name}
                        className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 object-cover mt-0.5 shrink-0"
                      />
                      <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-900">
                            {comment.authorId?.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(comment.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add comment box */}
              {!isGuest && (
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment... (tip: type @name to mention a teammate)"
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={isSendingComment || !newComment.trim()}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                  >
                    {isSendingComment ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Send</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
