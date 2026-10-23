import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  variant?: 'cyan' | 'blue' | 'indigo' | 'emerald' | 'amber' | 'rose';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'cyan'
}) => {
  const colorMap = {
    cyan: 'text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20',
    blue: 'text-brand-blue bg-brand-blue/10 border-brand-blue/20',
    indigo: 'text-brand-indigo bg-brand-indigo/10 border-brand-indigo/20',
    emerald: 'text-brand-emerald bg-brand-emerald/10 border-brand-emerald/20',
    amber: 'text-brand-amber bg-brand-amber/10 border-brand-amber/20',
    rose: 'text-brand-rose bg-brand-rose/10 border-brand-rose/20'
  };

  return (
    <div className="bg-dark-800 border border-dark-700/80 rounded-xl p-4 flex items-start justify-between shadow-sm hover:border-dark-600 transition-colors">
      <div>
        <p className="text-xs font-medium text-slate-400 mb-1">{label}</p>
        <p className="text-2xl font-bold font-mono text-white tracking-tight">{value}</p>
        {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
      </div>
      <div className={`p-2.5 rounded-lg border ${colorMap[variant]}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
};
