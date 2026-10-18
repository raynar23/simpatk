// Standardized uniform page container with fixed header and 100dvh flex column layout
'use client';

import React from 'react';

interface PageContainerProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function PageContainer({
  title,
  subtitle,
  actions,
  children,
  className = '',
  contentClassName = '',
}: PageContainerProps) {
  return (
    <div className={`w-full h-full max-w-[1360px] mx-auto px-4 sm:px-6 flex flex-col min-h-0 select-none ${className}`}>
      {/* Uniform Responsive Page Header */}
      <div className="min-h-[56px] py-2.5 sm:py-0 sm:h-14 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/80 gap-2 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-text-main tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-text-muted mt-0.5 line-clamp-2 sm:truncate">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Internal Content Area (scrollable on mobile < lg, zero-scroll 100dvh on desktop lg+) */}
      <div className={`flex-1 min-h-0 pt-3.5 pb-3 flex flex-col overflow-y-auto lg:overflow-hidden ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
}
