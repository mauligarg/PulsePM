import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface BurndownChartProps {
  data: {
    sprint: { _id: string; name: string; status: string } | null;
    totalEstimate: number;
    series: { date: string; ideal: number; actual: number | null }[];
  } | null;
}

export const BurndownChart: React.FC<BurndownChartProps> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Sprint Burndown</h3>
          <p className="text-xs text-slate-400">
            {data?.sprint ? `${data.sprint.name} (${data.totalEstimate}h total scope)` : 'No active sprint found'}
          </p>
        </div>
        {data?.sprint && (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
            {data.sprint.status}
          </span>
        )}
      </div>

      {!data?.series || data.series.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-xs text-slate-400 italic">
          Start a sprint with estimated tasks to view burndown progress.
        </div>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.series} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} unit="h" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="ideal"
                name="Ideal Remaining"
                stroke="#94a3b8"
                strokeDasharray="5 5"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual Remaining"
                stroke="#4f46e5"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
