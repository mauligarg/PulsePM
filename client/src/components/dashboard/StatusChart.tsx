import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

interface StatusChartProps {
  statusCounts: {
    backlog: number;
    todo: number;
    in_progress: number;
    in_review: number;
    done: number;
    total: number;
  };
  priorityCounts: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
}

export const StatusChart: React.FC<StatusChartProps> = ({ statusCounts, priorityCounts }) => {
  const [chartMode, setChartMode] = useState<'status' | 'priority'>('status');

  const statusData = [
    { name: 'Backlog', count: statusCounts?.backlog || 0, color: '#94a3b8' },
    { name: 'To Do', count: statusCounts?.todo || 0, color: '#3b82f6' },
    { name: 'In Progress', count: statusCounts?.in_progress || 0, color: '#f59e0b' },
    { name: 'In Review', count: statusCounts?.in_review || 0, color: '#a855f7' },
    { name: 'Done', count: statusCounts?.done || 0, color: '#10b981' },
  ];

  const priorityData = [
    { name: 'Low', count: priorityCounts?.low || 0, color: '#64748b' },
    { name: 'Medium', count: priorityCounts?.medium || 0, color: '#0ea5e9' },
    { name: 'High', count: priorityCounts?.high || 0, color: '#f97316' },
    { name: 'Urgent', count: priorityCounts?.urgent || 0, color: '#ef4444' },
  ];

  const currentData = chartMode === 'status' ? statusData : priorityData;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[380px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Task Distribution</h3>
          <p className="text-xs text-slate-400">Live breakdown fetched from MongoDB REST API</p>
        </div>

        {/* Toggle Mode */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setChartMode('status')}
            className={`px-3 py-1 rounded-lg transition-all ${
              chartMode === 'status'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            By Status
          </button>
          <button
            onClick={() => setChartMode('priority')}
            className={`px-3 py-1 rounded-lg transition-all ${
              chartMode === 'priority'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            By Priority
          </button>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={currentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="name"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
              }}
              formatter={(value: any) => [`${value} tasks`, 'Count']}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {currentData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
