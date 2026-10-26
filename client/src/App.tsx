import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ToastProvider } from './components/common/Toast';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { WorkspaceSelect } from './pages/WorkspaceSelect';
import { Dashboard } from './pages/Dashboard';
import { Board } from './pages/Board';
import { Projects } from './pages/Projects';
import { MyTasks } from './pages/MyTasks';
import { Members } from './pages/Members';
import { AcceptInvite } from './pages/AcceptInvite';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication & Invites */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/workspaces" element={<WorkspaceSelect />} />
          <Route path="/invites/accept" element={<AcceptInvite />} />

          {/* Protected Workspace Layout */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/board" element={<Board />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/my-tasks" element={<MyTasks />} />
            <Route path="/members" element={<Members />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;
