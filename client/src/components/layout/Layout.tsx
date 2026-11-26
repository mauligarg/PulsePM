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
  const { user, token, activeWorkspace, workspaces, isLoading, initAuth, switchWorkspace } = useAuthStore();
  const { fetchProjects } = useBoardStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (!isLoading && !token) {
      navigate('/login');
    }
  }, [isLoading, token, navigate]);

  useEffect(() => {
    if (!isLoading && user && !activeWorkspace && location.pathname !== '/workspaces') {
      if (workspaces.length > 0) {
        switchWorkspace(workspaces[0]._id);
      } else {
        navigate('/workspaces');
      }
    }
  }, [isLoading, user, activeWorkspace, workspaces, location.pathname, navigate, switchWorkspace]);

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

  return (
    <div className="flex min-h-dvh lg:h-screen w-full overflow-x-clip lg:overflow-hidden bg-slate-50">
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onCreateWorkspace={() => {
          setIsMobileMenuOpen(false);
          setIsWorkspaceModalOpen(true);
        }}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:overflow-hidden">
        <Topbar
          onMenuClick={() => setIsMobileMenuOpen(true)}
          onNewTask={() => setIsTaskModalOpen(true)}
        />

        <main className="flex-1 overflow-y-auto overflow-x-clip p-3 sm:p-5 lg:p-6">
          <div className="max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
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
