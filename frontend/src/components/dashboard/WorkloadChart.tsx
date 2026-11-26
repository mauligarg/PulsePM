import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface WorkloadChartProps {
  data: {
    userId: string;
    name: string;
    openTaskCount: number;
    estimatedHours: number;
    loggedHours: number;
  }[];
}

export const WorkloadChart: React.FC<WorkloadChartProps> = ({ data }) => {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm min-w-0">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900">Team Workload Distribution</h3>
        <p className="text-xs text-slate-400">Open estimated hours vs. logged hours per member</p>
      </div>

      {!data || data.length === 0 ? (
        <div className="h-52 sm:h-56 flex items-center justify-center text-xs text-slate-400 italic text-center px-4">
          No workload data available.
        </div>
      ) : (
        <div className="h-52 sm:h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} unit="h" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="estimatedHours" name="Open Estimated (h)" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="loggedHours" name="Logged Hours (h)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
