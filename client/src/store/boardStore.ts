import { create } from 'zustand';
import { Project, Task, TaskStatus } from '../types';
import { projectApi } from '../api/projects';
import { taskApi } from '../api/tasks';

interface BoardState {
  projects: Project[];
  currentProject: Project | null;
  tasks: Task[];
  isLoadingProjects: boolean;
  isLoadingTasks: boolean;
  filterStatus: string;
  filterAssignee: string;
  searchQuery: string;

  fetchProjects: () => Promise<void>;
  setCurrentProject: (project: Project) => void;
  fetchTasks: (projectId?: string) => Promise<void>;
  setFilterStatus: (status: string) => void;
  setFilterAssignee: (assignee: string) => void;
  setSearchQuery: (query: string) => void;

  // Real-time & Optimistic mutations
  moveTask: (
    taskId: string,
    targetStatus: TaskStatus,
    newOrder: number,
    prevTaskId?: string,
    nextTaskId?: string
  ) => Promise<void>;
  applyTaskMoved: (movedTask: Task) => void;
  applyTaskUpdated: (updatedTask: Task) => void;
  applyTaskCreated: (createdTask: Task) => void;
  applyTaskDeleted: (taskId: string) => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  projects: [],
  currentProject: null,
  tasks: [],
  isLoadingProjects: false,
  isLoadingTasks: false,
  filterStatus: '',
  filterAssignee: '',
  searchQuery: '',

  fetchProjects: async () => {
    try {
      set({ isLoadingProjects: true });
      const res = await projectApi.list();
      set({ projects: res.data, isLoadingProjects: false });

      // If no current project selected, select the first project
      const current = get().currentProject;
      if ((!current || !res.data.some(p => p._id === current._id)) && res.data.length > 0) {
        set({ currentProject: res.data[0] });
        await get().fetchTasks(res.data[0]._id);
      }
    } catch (err: any) {
      console.error('Failed to load projects:', err.message);
      set({ isLoadingProjects: false });
    }
  },

  setCurrentProject: (project) => {
    set({ currentProject: project });
    get().fetchTasks(project._id);
  },

  fetchTasks: async (projectId) => {
    const pId = projectId || get().currentProject?._id;
    if (!pId) return;

    try {
      set({ isLoadingTasks: true });
      const { filterStatus, filterAssignee, searchQuery } = get();
      const res = await taskApi.listByProject(pId, {
        status: filterStatus || undefined,
        assignee: filterAssignee || undefined,
        search: searchQuery || undefined,
      });
      set({ tasks: res.data, isLoadingTasks: false });
    } catch (err: any) {
      console.error('Failed to load tasks:', err.message);
      set({ isLoadingTasks: false });
    }
  },

  setFilterStatus: (status) => {
    set({ filterStatus: status });
    get().fetchTasks();
  },

  setFilterAssignee: (assignee) => {
    set({ filterAssignee: assignee });
    get().fetchTasks();
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().fetchTasks();
  },

  moveTask: async (taskId, targetStatus, newOrder, prevTaskId, nextTaskId) => {
    // 1. Optimistic update
    const previousTasks = get().tasks;
    const updatedTasks = previousTasks.map((t) => {
      if (t._id === taskId) {
        return { ...t, status: targetStatus, order: newOrder };
      }
      return t;
    });

    set({ tasks: updatedTasks });

    // 2. Network sync
    try {
      const res = await taskApi.move(taskId, {
        status: targetStatus,
        newOrder,
        prevTaskId,
        nextTaskId,
      });

      // Update with server truth
      get().applyTaskUpdated(res.data);
    } catch (err: any) {
      console.error('Failed to move task:', err.message);
      // Rollback on failure
      set({ tasks: previousTasks });
    }
  },

  applyTaskMoved: (movedTask) => {
    set((state) => {
      const exists = state.tasks.some((t) => t._id === movedTask._id);
      if (!exists) return state;

      const updated = state.tasks.map((t) => (t._id === movedTask._id ? movedTask : t));
      return { tasks: updated };
    });
  },

  applyTaskUpdated: (updatedTask) => {
    set((state) => {
      const exists = state.tasks.some((t) => t._id === updatedTask._id);
      if (!exists) return state;

      const updated = state.tasks.map((t) => (t._id === updatedTask._id ? updatedTask : t));
      return { tasks: updated };
    });
  },

  applyTaskCreated: (createdTask) => {
    const currentProj = get().currentProject;
    const targetProjId = typeof createdTask.projectId === 'object' ? createdTask.projectId._id : createdTask.projectId;

    if (currentProj && currentProj._id === targetProjId) {
      set((state) => {
        const exists = state.tasks.some((t) => t._id === createdTask._id);
        if (exists) {
          return {
            tasks: state.tasks.map((t) => (t._id === createdTask._id ? createdTask : t)),
          };
        }
        return {
          tasks: [...state.tasks, createdTask],
        };
      });
    }
  },

  applyTaskDeleted: (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t._id !== taskId),
    }));
  },
}));
