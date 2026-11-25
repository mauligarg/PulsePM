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

interface VelocityChartProps {
  data: {
    sprintId: string;
    name: string;
    committedHours: number;
    completedHours: number;
  }[];
}

export const VelocityChart: React.FC<VelocityChartProps> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900">Sprint Velocity</h3>
        <p className="text-xs text-slate-400">Committed vs. completed estimate hours per sprint</p>
      </div>

      {!data || data.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-xs text-slate-400 italic">
          No sprint velocity data yet.
        </div>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} unit="h" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="committedHours" name="Committed (h)" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completedHours" name="Completed (h)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
