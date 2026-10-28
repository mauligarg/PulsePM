import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderKanban,
  Users,
  TrendingUp,
  ArrowRight,
  Loader2,
  Calendar,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard } from '../components/dashboard/StatCard';
import { StatusChart } from '../components/dashboard/StatusChart';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { TaskDrawer } from '../components/kanban/TaskDrawer';
import { DashboardSummary, Task } from '../types';
import { dashboardApi } from '../api/dashboard';
import { useAuthStore } from '../store/authStore';

export const Dashboard: React.FC = () => {
  const { activeWorkspace, user, role } = useAuthStore();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      const res = await dashboardApi.getSummary();
      setData(res.data);
    } catch (err: any) {
      console.error('Error fetching dashboard summary:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeWorkspace?._id) {
      fetchSummary();
    }
  }, [activeWorkspace?._id]);

  if (isLoading || !data) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        <p className="text-xs text-slate-400">Loading dynamic workspace analytics...</p>
      </div>
    );
  }

  const completionRate =
    data.statusCounts.total > 0
      ? Math.round((data.statusCounts.done / data.statusCounts.total) * 100)
      : 0;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-brand-900 to-indigo-900 rounded-2xl p-6 text-white shadow-lg shadow-brand-950/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/20 text-brand-100">
              Workspace Overview
            </span>
            <span className="text-xs text-brand-200">Tenant: {activeWorkspace?.name}</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Welcome back, {user?.name}!</h2>
          <p className="text-xs text-brand-200 mt-1 max-w-lg">
            Here is your live project pulse. All metrics and charts below are fetched dynamically from
            your multi-tenant REST endpoints.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/board"
            className="flex items-center gap-2 px-4 py-2 bg-white text-brand-900 hover:bg-brand-50 rounded-xl text-xs font-bold transition-all shadow-md shrink-0"
          >
            <span>Open Kanban Board</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Row 1: KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Tasks"
          value={data.statusCounts.total}
          subtext={`${data.statusCounts.in_progress} in progress, ${data.statusCounts.in_review} in review`}
          icon={CheckCircle2}
          color="brand"
        />
        <StatCard
          label="Completion Rate"
          value={`${completionRate}%`}
          subtext={`${data.statusCounts.done} tasks completed`}
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          label="Overdue Tasks"
          value={data.overdueCount}
          subtext={data.overdueCount > 0 ? 'Requires immediate action' : 'All clear!'}
          icon={AlertTriangle}
          color={data.overdueCount > 0 ? 'rose' : 'slate'}
        />
        <StatCard
          label="Assigned to Me"
          value={data.myOpenTasksCount}
          subtext="Active tasks on your plate"
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Row 2: Charts and Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <StatusChart
            statusCounts={data.statusCounts}
            priorityCounts={data.priorityCounts}
          />
        </div>
        <div>
          <ActivityFeed activities={data.recentActivity} />
        </div>
      </div>

      {/* Row 3: Actionable Lists (Overdue Tasks & My Open Tasks) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Tasks */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Overdue Tasks</span>
              </h3>
              <p className="text-xs text-slate-400">Tasks with due date in the past</p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
              {data.overdueCount} Total
            </span>
          </div>

          <div className="space-y-2.5">
            {data.overdueTasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No overdue tasks. Nice work!</p>
            ) : (
              data.overdueTasks.map((t) => (
                <div
                  key={t._id}
                  onClick={() => setSelectedTaskId(t._id)}
                  className="flex items-center justify-between p-3 rounded-xl border border-rose-100 bg-rose-50/30 hover:bg-rose-50 hover:border-rose-200 cursor-pointer transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <h5 className="text-xs font-semibold text-slate-900 truncate">{t.title}</h5>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Project:{' '}
                      <strong className="text-slate-600">
                        {t.projectId && typeof t.projectId === 'object' ? t.projectId.key : 'PRJ'}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-semibold text-rose-600 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'Overdue'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* My Open Tasks */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-600" />
                <span>My Active Tasks</span>
              </h3>
              <p className="text-xs text-slate-400">Tasks currently assigned to you</p>
            </div>
            <Link
              to="/my-tasks"
              className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {data.myOpenTasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">You have no pending tasks.</p>
            ) : (
              data.myOpenTasks.map((t) => (
                <div
                  key={t._id}
                  onClick={() => setSelectedTaskId(t._id)}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-100/60 cursor-pointer transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <h5 className="text-xs font-semibold text-slate-900 truncate">{t.title}</h5>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Status:{' '}
                      <strong className="text-slate-600 capitalize">
                        {t.status.replace('_', ' ')}
                      </strong>
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                    {t.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selectedTaskId && (
        <TaskDrawer
          taskId={selectedTaskId}
          isOpen={!!selectedTaskId}
          onClose={() => {
            setSelectedTaskId(null);
            fetchSummary();
          }}
        />
      )}
    </div>
  );
};
