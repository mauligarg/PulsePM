import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { TaskDrawer } from './TaskDrawer';
import { CreateTaskModal } from './CreateTaskModal';
import type { Task, TaskStatus } from '../../types';
import { useBoardStore } from '../../store/boardStore';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../common/Toast';

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'in_review', title: 'In Review' },
  { id: 'done', title: 'Done' },
];

export const KanbanBoard: React.FC = () => {
  const { tasks, moveTask } = useBoardStore();
  const role = useAuthStore((s) => s.role);
  const { toast } = useToast();

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createModalStatus, setCreateModalStatus] = useState<TaskStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (role === 'guest') {
      toast('Guests have read-only access and cannot reorder cards', 'error');
      return;
    }

    const task = tasks.find((t) => t._id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || role === 'guest') return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;

    // Target status can be determined either by dropping directly on column, or dropping on another task
    let targetStatus: TaskStatus = task.status;
    let targetIndex = -1;

    // Did we drop onto a column?
    if (COLUMNS.some((col) => col.id === over.id)) {
      targetStatus = over.id as TaskStatus;
    } else {
      // We dropped onto another task
      const overTask = tasks.find((t) => t._id === over.id);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }

    // Filter tasks in the destination column
    const columnTasks = tasks
      .filter((t) => t.status === targetStatus && t._id !== taskId)
      .sort((a, b) => a.order - b.order);

    // Find insertion position
    let newOrder: number;
    let prevTaskId: string | undefined;
    let nextTaskId: string | undefined;

    if (COLUMNS.some((col) => col.id === over.id)) {
      // Dropped onto empty column or bottom of column
      if (columnTasks.length === 0) {
        newOrder = 1000;
      } else {
        const last = columnTasks[columnTasks.length - 1];
        newOrder = last.order + 1000;
        prevTaskId = last._id;
      }
    } else {
      // Dropped onto a specific card
      const overIndex = columnTasks.findIndex((t) => t._id === over.id);
      if (overIndex === -1) {
        newOrder = columnTasks.length > 0 ? columnTasks[columnTasks.length - 1].order + 1000 : 1000;
      } else {
        const overTask = columnTasks[overIndex];
        const prevTask = overIndex > 0 ? columnTasks[overIndex - 1] : null;

        if (!prevTask) {
          // Inserted before first card
          newOrder = overTask.order / 2;
          nextTaskId = overTask._id;
        } else {
          // Inserted between prev and over
          newOrder = (prevTask.order + overTask.order) / 2;
          prevTaskId = prevTask._id;
          nextTaskId = overTask._id;
        }
      }
    }

    // Call store mutation
    await moveTask(taskId, targetStatus, newOrder, prevTaskId, nextTaskId);
  };

  return (
    <div className="h-full flex flex-col">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4 items-start select-none">
          {COLUMNS.map((col) => {
            const columnTasks = tasks
              .filter((t) => t.status === col.id)
              .sort((a, b) => a.order - b.order);

            return (
              <KanbanColumn
                key={col.id}
                id={col.id}
                title={col.title}
                tasks={columnTasks}
                onTaskClick={(t) => setSelectedTask(t)}
                onAddTask={(status) => setCreateModalStatus(status)}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} onClick={() => {}} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Detail slide-over drawer */}
      {selectedTask && (
        <TaskDrawer
          taskId={selectedTask._id}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Quick Add Task Modal */}
      {createModalStatus && (
        <CreateTaskModal
          isOpen={!!createModalStatus}
          defaultStatus={createModalStatus}
          onClose={() => setCreateModalStatus(null)}
        />
      )}
    </div>
  );
};
