import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CreateWorkspaceModal } from '../workspace/CreateWorkspaceModal';
import { CreateTaskModal } from '../kanban/CreateTaskModal';
import { useAuthStore } from '../../store/authStore';
import { useBoardStore } from '../../store/boardStore';
import { Loader2 } from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, token, activeWorkspace, isLoading, initAuth } = useAuthStore();
  const { fetchProjects } = useBoardStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (!isLoading && !token) {
      navigate('/login');
    }
  }, [isLoading, token, navigate]);

  useEffect(() => {
    if (activeWorkspace) {
      fetchProjects();
    }
  }, [activeWorkspace?._id]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading workspace context...</p>
      </div>
    );
  }

  // If user has no active workspace, prompt to create or select one
  if (user && !activeWorkspace && location.pathname !== '/workspaces') {
    navigate('/workspaces');
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <Sidebar onCreateWorkspace={() => setIsWorkspaceModalOpen(true)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onNewTask={() => setIsTaskModalOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      <CreateWorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
      />

      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
      />
    </div>
  );
};
