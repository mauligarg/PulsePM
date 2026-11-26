import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { evaluatePassword } from '../../utils/password';

interface PasswordRequirementsProps {
  password: string;
}

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({ password }) => {
  const { results } = evaluatePassword(password);

  return (
    <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
      <p className="text-[11px] font-semibold text-slate-600 mb-1">Password requirements</p>
      {results.map((req) => (
        <div
          key={req.key}
          className={`flex items-center gap-2 text-[11px] transition-colors ${
            req.met ? 'text-emerald-600 font-medium' : 'text-slate-500'
          }`}
        >
          {req.met ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <Circle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
          <span>{req.label}</span>
        </div>
      ))}
    </div>
  );
};
