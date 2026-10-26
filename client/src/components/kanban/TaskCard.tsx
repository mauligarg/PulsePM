import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, MessageSquare, Clock, CheckCircle2 } from 'lucide-react';
import { Task } from '../../types';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isOverlay?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, isOverlay }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task._id,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const priorityColors = {
    low: 'bg-slate-100 text-slate-700 border-slate-200',
    medium: 'bg-blue-50 text-blue-700 border-blue-200',
    high: 'bg-amber-50 text-amber-700 border-amber-200',
    urgent: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
  };

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'done';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-grab active:cursor-grabbing select-none group relative ${
        isOverlay ? 'shadow-xl rotate-1 scale-105 border-brand-400' : ''
      }`}
    >
      {/* Top row: Priority & Labels */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border font-semibold ${
            priorityColors[task.priority] || priorityColors.medium
          }`}
        >
          {task.priority}
        </span>

        {task.labels && task.labels.length > 0 && (
          <div className="flex items-center gap-1 overflow-hidden">
            {task.labels.slice(0, 2).map((label, i) => (
              <span
                key={i}
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium truncate max-w-[80px]"
              >
                #{label}
              </span>
            ))}
            {task.labels.length > 2 && (
              <span className="text-[9px] text-slate-400 font-medium">
                +{task.labels.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      <h4 className="text-xs font-semibold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-2 mb-2.5 leading-snug">
        {task.title}
      </h4>

      {/* Bottom meta row: Due date, Comments, Assignee */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-3">
          {task.dueDate && (
            <div
              className={`flex items-center gap-1 font-medium ${
                isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-500'
              }`}
              title={isOverdue ? 'Overdue!' : 'Due Date'}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {new Date(task.dueDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}

          {typeof task.commentCount === 'number' && task.commentCount > 0 && (
            <div className="flex items-center gap-1 text-slate-500">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{task.commentCount}</span>
            </div>
          )}

          {task.estimateHours > 0 && (
            <div className="flex items-center gap-0.5 text-slate-400">
              <Clock className="w-3 h-3" />
              <span>{task.estimateHours}h</span>
            </div>
          )}
        </div>

        {/* Assignee Avatar */}
        {task.assigneeId ? (
          <img
            src={
              task.assigneeId.avatar ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assigneeId.name}`
            }
            alt={task.assigneeId.name}
            title={`Assigned to ${task.assigneeId.name}`}
            className="w-5 h-5 rounded-full border border-slate-200 bg-slate-100 object-cover shrink-0"
          />
        ) : (
          <div
            className="w-5 h-5 rounded-full border border-dashed border-slate-300 text-[10px] text-slate-400 flex items-center justify-center shrink-0"
            title="Unassigned"
          >
            ?
          </div>
        )}
      </div>
    </div>
  );
};
