// macOS panel-styled container for flat charts with 1px border and header separator
import React from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className = '',
}: ChartCardProps) {
  return (
    <div
      className={`bg-surface rounded-card border border-border flex flex-col overflow-hidden ${className}`}
    >
      {/* Compact macOS panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface select-none">
        <div>
          <h3 className="text-xs font-semibold text-text-main tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-text-muted mt-0.5 leading-tight">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0 ml-2">{action}</div>}
      </div>

      {/* Chart body */}
      <div className="p-4 flex-1 flex flex-col justify-center min-h-[200px]">
        {children}
      </div>
    </div>
  );
}
