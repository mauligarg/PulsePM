import React, { useState, useEffect } from 'react';
import { CheckSquare, Calendar, Clock, MessageSquare, Loader2 } from 'lucide-react';
import { Task } from '../types';
import { taskApi } from '../api/tasks';
import { TaskDrawer } from '../components/kanban/TaskDrawer';
import { useAuthStore } from '../store/authStore';

export const MyTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);

  const fetchMyTasks = async () => {
    try {
      setIsLoading(true);
      const res = await taskApi.getMyTasks();
      setTasks(res.data);
    } catch (err: any) {
      console.error('Error fetching my tasks:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeWorkspace?._id) {
      fetchMyTasks();
    }
  }, [activeWorkspace?._id]);

  const priorityColors = {
    low: 'text-slate-600 bg-slate-100',
    medium: 'text-blue-700 bg-blue-50',
    high: 'text-amber-700 bg-amber-50',
    urgent: 'text-rose-700 bg-rose-50 font-bold',
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Tasks</h1>
        <p className="text-xs text-slate-500">
          All tasks assigned to you across projects in {activeWorkspace?.name}
        </p>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900">No tasks assigned to you</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Tasks assigned to you across all projects in this workspace will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {tasks.map((task) => {
              const isOverdue =
                task.dueDate &&
                new Date(task.dueDate) < new Date() &&
                task.status !== 'done';

              return (
                <div
                  key={task._id}
                  onClick={() => setSelectedTaskId(task._id)}
                  className="p-4 hover:bg-slate-50/80 cursor-pointer transition-colors flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {typeof task.projectId === 'object' ? task.projectId.key : 'PRJ'}
                    </span>
                    <div className="truncate">
                      <h4 className="text-xs font-semibold text-slate-900 group-hover:text-brand-600 transition-colors truncate">
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                        <span>Project: {typeof task.projectId === 'object' ? task.projectId.name : 'Unknown'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {task.dueDate && (
                      <span
                        className={`text-xs flex items-center gap-1 font-medium ${
                          isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-500'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(task.dueDate).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}

                    <span
                      className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                        priorityColors[task.priority]
                      }`}
                    >
                      {task.priority}
                    </span>

                    <span className="capitalize text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedTaskId && (
        <TaskDrawer
          taskId={selectedTaskId}
          isOpen={!!selectedTaskId}
          onClose={() => {
            setSelectedTaskId(null);
            fetchMyTasks();
          }}
        />
      )}
    </div>
  );
};
