// Metric tile component displaying core statistics with tabular numerals
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatTileProps {
  label: string;
  value: number | string;
  sublabel?: string;
  icon: LucideIcon;
  variant?: 'default' | 'danger' | 'warning' | 'primary';
}

export function StatTile({
  label,
  value,
  sublabel,
  icon: Icon,
  variant = 'default',
}: StatTileProps) {
  const iconColors = {
    default: 'text-text-muted bg-bg border-border',
    primary: 'text-primary bg-primary-soft border-primary/20',
    warning: 'text-warning bg-[#FFF8E6] border-[#FFE2A4]',
    danger: 'text-danger bg-danger-soft border-danger/20',
  };

  const valueColors = {
    default: 'text-text-main',
    primary: 'text-primary',
    warning: 'text-warning',
    danger: 'text-danger',
  };

  return (
    <div className="bg-surface rounded-card border border-border p-4 sm:p-5 shadow-subtle flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-text-muted">{label}</span>
        <div
          className={`w-7 h-7 rounded-control flex items-center justify-center border ${iconColors[variant]}`}
        >
          <Icon className="w-4 h-4" strokeWidth={1.5} />
        </div>
      </div>
      <div>
        <div className={`text-2xl font-bold tracking-tight tabular-nums ${valueColors[variant]}`}>
          {value}
        </div>
        {sublabel && (
          <p className="text-[11px] text-text-muted mt-1">{sublabel}</p>
        )}
      </div>
    </div>
  );
}
