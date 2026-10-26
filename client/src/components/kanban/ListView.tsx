import React, { useState } from 'react';
import { Calendar, Clock, MessageSquare } from 'lucide-react';
import { Task } from '../../types';
import { TaskDrawer } from './TaskDrawer';

interface ListViewProps {
  tasks: Task[];
}

export const ListView: React.FC<ListViewProps> = ({ tasks }) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const statusBadges: Record<string, string> = {
    backlog: 'bg-slate-100 text-slate-700',
    todo: 'bg-blue-50 text-blue-700',
    in_progress: 'bg-amber-50 text-amber-700',
    in_review: 'bg-purple-50 text-purple-700',
    done: 'bg-emerald-50 text-emerald-700',
  };

  const priorityBadges: Record<string, string> = {
    low: 'text-slate-600',
    medium: 'text-blue-600 font-medium',
    high: 'text-amber-600 font-semibold',
    urgent: 'text-rose-600 font-bold',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
              <th className="py-3 px-4">Title</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Assignee</th>
              <th className="py-3 px-4">Due Date</th>
              <th className="py-3 px-4 text-right">Estimate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                  No tasks found matching your criteria.
                </td>
              </tr>
            ) : (
              tasks.map((task) => {
                const isOverdue =
                  task.dueDate &&
                  new Date(task.dueDate) < new Date() &&
                  task.status !== 'done';

                return (
                  <tr
                    key={task._id}
                    onClick={() => setSelectedTaskId(task._id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    {/* Title & labels */}
                    <td className="py-3 px-4 font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
                      <div className="flex items-center gap-2">
                        <span>{task.title}</span>
                        {task.labels && task.labels.length > 0 && (
                          <div className="flex items-center gap-1">
                            {task.labels.slice(0, 2).map((l, i) => (
                              <span
                                key={i}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-normal"
                              >
                                #{l}
                              </span>
                            ))}
                          </div>
                        )}
                        {typeof task.commentCount === 'number' && task.commentCount > 0 && (
                          <span className="flex items-center gap-0.5 text-slate-400 text-[10px]">
                            <MessageSquare className="w-3 h-3" />
                            {task.commentCount}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`capitalize px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                          statusBadges[task.status] || 'bg-slate-100'
                        }`}
                      >
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-4">
                      <span className={`capitalize text-[11px] ${priorityBadges[task.priority]}`}>
                        {task.priority}
                      </span>
                    </td>

                    {/* Assignee */}
                    <td className="py-3 px-4">
                      {task.assigneeId ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={
                              task.assigneeId.avatar ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assigneeId.name}`
                            }
                            alt={task.assigneeId.name}
                            className="w-5 h-5 rounded-full border border-slate-200 object-cover"
                          />
                          <span className="text-slate-700">{task.assigneeId.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Due Date */}
                    <td className="py-3 px-4">
                      {task.dueDate ? (
                        <span
                          className={`flex items-center gap-1.5 ${
                            isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-500'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(task.dueDate).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Estimate */}
                    <td className="py-3 px-4 text-right text-slate-500 font-medium">
                      {task.estimateHours ? `${task.estimateHours}h` : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedTaskId && (
        <TaskDrawer
          taskId={selectedTaskId}
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
};
