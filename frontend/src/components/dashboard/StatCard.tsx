import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  icon: LucideIcon;
  color: 'brand' | 'emerald' | 'amber' | 'rose' | 'slate';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  color,
}) => {
  const colorStyles = {
    brand: {
      bg: 'bg-brand-50',
      icon: 'text-brand-600',
      border: 'border-brand-200/50',
    },
    emerald: {
      bg: 'bg-emerald-50',
      icon: 'text-emerald-600',
      border: 'border-emerald-200/50',
    },
    amber: {
      bg: 'bg-amber-50',
      icon: 'text-amber-600',
      border: 'border-amber-200/50',
    },
    rose: {
      bg: 'bg-rose-50',
      icon: 'text-rose-600',
      border: 'border-rose-200/50',
    },
    slate: {
      bg: 'bg-slate-100',
      icon: 'text-slate-600',
      border: 'border-slate-200/80',
    },
  };

  const style = colorStyles[color] || colorStyles.brand;

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3 min-w-0">
      <div className="min-w-0">
        <span className="text-xs font-semibold text-slate-500 block mb-1 truncate">{label}</span>
        <div className="text-fluid-metric font-black text-slate-900 tracking-tight">{value}</div>
        {subtext && <span className="text-[11px] text-slate-400 mt-0.5 block truncate">{subtext}</span>}
      </div>

      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${style.bg} ${style.icon}`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
    </div>
  );
};
