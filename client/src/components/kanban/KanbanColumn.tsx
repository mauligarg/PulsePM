import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Task, TaskStatus } from '../../types';
import { TaskCard } from './TaskCard';
import { useAuthStore } from '../../store/authStore';

interface KanbanColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  tasks,
  onTaskClick,
  onAddTask,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { status: id },
  });

  const role = useAuthStore((s) => s.role);
  const isGuest = role === 'guest';

  const statusColors: Record<TaskStatus, { dot: string; badge: string }> = {
    backlog: { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700' },
    todo: { dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700' },
    in_progress: { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700' },
    in_review: { dot: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700' },
    done: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  };

  const { dot, badge } = statusColors[id] || statusColors.todo;

  return (
    <div className="flex flex-col w-72 shrink-0 bg-slate-100/70 rounded-2xl border border-slate-200/80 p-3 max-h-full">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          <h3 className="text-xs font-bold text-slate-800 tracking-tight">{title}</h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge}`}>
            {tasks.length}
          </span>
        </div>

        {!isGuest && (
          <button
            onClick={() => onAddTask(id)}
            title={`Add task to ${title}`}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Cards droppable zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto space-y-2.5 min-h-[150px] p-0.5 rounded-xl transition-colors ${
          isOver ? 'bg-brand-50/50 ring-2 ring-brand-400/40' : ''
        }`}
      >
        <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task._id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="h-28 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs gap-1 select-none">
            <span>No tasks in {title.toLowerCase()}</span>
            {!isGuest && (
              <button
                onClick={() => onAddTask(id)}
                className="text-[11px] text-brand-600 hover:underline font-medium"
              >
                + Add one
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
