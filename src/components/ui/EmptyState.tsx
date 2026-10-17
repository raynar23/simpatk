// Clean empty state indicator without cartoon illustrations
import React from 'react';
import { LucideIcon, PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-card bg-surface border border-dashed border-border my-2">
      <div className="w-10 h-10 rounded-full bg-bg flex items-center justify-center text-text-muted mb-3 border border-border">
        <Icon className="w-5 h-5" strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-semibold text-text-main">{title}</h3>
      {description && (
        <p className="text-xs text-text-muted max-w-sm mt-1 mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
