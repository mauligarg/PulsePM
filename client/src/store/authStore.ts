import { create } from 'zustand';
import { User, Workspace, Role } from '../types';
import { authApi } from '../api/auth';
import { workspaceApi } from '../api/workspaces';

interface AuthState {
  user: User | null;
  token: string | null;
  activeWorkspace: Workspace | null;
  role: Role | null;
  workspaces: Workspace[];
  isLoading: boolean;
  error: string | null;

  initAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  fetchWorkspaces: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (name: string, slug?: string) => Promise<Workspace>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  activeWorkspace: null,
  role: null,
  workspaces: [],
  isLoading: true,
  error: null,

  initAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false, user: null });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      const res = await authApi.getMe();
      set({
        user: res.data.user,
        activeWorkspace: res.data.activeWorkspace,
        role: res.data.role,
        isLoading: false,
      });

      // Also load all user workspaces
      await get().fetchWorkspaces();
    } catch (err: any) {
      localStorage.removeItem('token');
      set({ token: null, user: null, activeWorkspace: null, role: null, isLoading: false });
    }
  },

  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const res = await authApi.login({ email, password });
      const { user, token, activeWorkspace, role } = res.data;

      localStorage.setItem('token', token);
      set({ user, token, activeWorkspace, role, isLoading: false });

      await get().fetchWorkspaces();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  register: async (name, email, password) => {
    try {
      set({ isLoading: true, error: null });
      const res = await authApi.register({ name, email, password });
      const { user, token } = res.data;

      localStorage.setItem('token', token);
      set({ user, token, activeWorkspace: null, role: null, isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({
      user: null,
      token: null,
      activeWorkspace: null,
      role: null,
      workspaces: [],
      error: null,
    });
    window.location.href = '/login';
  },

  fetchWorkspaces: async () => {
    try {
      const res = await workspaceApi.list();
      set({ workspaces: res.data });
      // If no active workspace is set, but we have workspaces, use the first one
      const current = get().activeWorkspace;
      if (!current && res.data.length > 0) {
        await get().switchWorkspace(res.data[0]._id);
      }
    } catch (err: any) {
      console.error('Failed to load workspaces:', err.message);
    }
  },

  switchWorkspace: async (workspaceId: string) => {
    try {
      set({ isLoading: true });
      const res = await workspaceApi.switch(workspaceId);
      const { token, workspace, role } = res.data;

      localStorage.setItem('token', token);
      set({
        token,
        activeWorkspace: workspace,
        role,
        isLoading: false,
      });

      // Refresh list to update current indicator
      await get().fetchWorkspaces();
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createWorkspace: async (name: string, slug?: string) => {
    set({ isLoading: true });
    try {
      const res = await workspaceApi.create({ name, slug });
      const { workspace, role, token } = res.data;

      localStorage.setItem('token', token);
      set({
        activeWorkspace: workspace,
        role,
        token,
        isLoading: false,
      });

      await get().fetchWorkspaces();
      return workspace;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },
}));
