// Metric KPI card with macOS panel style, 1px border, no shadow, and flat sparkline
import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: LucideIcon;
  change?: number;
  invertTrend?: boolean;
  sparklineData?: number[];
  className?: string;
}

export function KpiCard({
  label,
  value,
  sublabel,
  icon: Icon,
  change,
  invertTrend = false,
  sparklineData,
  className = '',
}: KpiCardProps) {
  // Determine trend color: for turnaround time or pending queue, decrease is positive
  let trendColor = 'text-text-muted';
  let TrendIcon = Minus;

  if (change !== undefined && change !== null) {
    if (change > 0) {
      TrendIcon = TrendingUp;
      trendColor = invertTrend ? 'text-danger' : 'text-success';
    } else if (change < 0) {
      TrendIcon = TrendingDown;
      trendColor = invertTrend ? 'text-success' : 'text-danger';
    }
  }

  // Generate lightweight flat SVG sparkline
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;

    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;
    const width = 80;
    const height = 24;

    const points = sparklineData
      .map((val, idx) => {
        const x = (idx / (sparklineData.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    return (
      <svg
        width={width}
        height={height}
        className="overflow-visible shrink-0 text-primary"
        aria-hidden="true"
      >
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div
      className={`bg-surface rounded-card border border-border p-4 flex flex-col justify-between select-none ${className}`}
    >
      {/* Header with plain muted icon and 12px label */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-text-muted truncate">
          {label}
        </span>
        {Icon && (
          <Icon className="w-4 h-4 text-text-muted shrink-0" strokeWidth={1.5} />
        )}
      </div>

      {/* Main value: 24px semi-bold with tabular numbers */}
      <div className="flex items-baseline justify-between gap-2 my-1">
        <div className="text-2xl font-semibold text-text-main tabular-nums tracking-tight">
          {value}
        </div>
        {renderSparkline()}
      </div>

      {/* Footer: Trend diff and sublabel */}
      {(change !== undefined || sublabel) && (
        <div className="flex items-center gap-1.5 text-[11px] mt-1 pt-1 border-t border-border/50 text-text-muted">
          {change !== undefined && (
            <span
              className={`inline-flex items-center gap-0.5 font-medium tabular-nums ${trendColor}`}
            >
              <TrendIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
              <span>{Math.abs(change)}%</span>
            </span>
          )}
          {sublabel && <span className="truncate">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
