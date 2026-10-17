// Top toolbar for admin pages displaying breadcrumb, title, and optional actions
import React from 'react';

interface AdminToolbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AdminToolbar({ title, subtitle, actions }: AdminToolbarProps) {
  return (
    <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-border px-4 sm:px-8 py-3 sm:py-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 max-w-[1200px] mx-auto">
        <div>
          <h1 className="text-xl sm:text-[22px] font-semibold text-text-main tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
