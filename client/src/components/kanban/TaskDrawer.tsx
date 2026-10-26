import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Calendar,
  Clock,
  User,
  Tag,
  Send,
  MessageSquare,
  CheckCircle2,
  Circle,
  Plus,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Task, Comment, Member, TaskStatus, TaskPriority } from '../../types';
import { taskApi } from '../../api/tasks';
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
  const [estimateHours, setEstimateHours] = useState('0');

  // Subtask & Comment states
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      const projId = typeof task.projectId === 'object' ? task.projectId._id : task.projectId;
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
              {typeof task?.projectId === 'object' ? task.projectId.key : 'TASK'}
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

        {/* Content Body */}
        {isLoading || !task ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
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
                    placeholder="Write a comment..."
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
