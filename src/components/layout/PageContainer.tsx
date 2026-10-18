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
  React.useEffect(() => {
    if (title) {
      let suffix = title;
      const lower = title.toLowerCase();
      if (lower.includes('laporan')) suffix = 'Laporan';
      else if (lower.includes('daftar belanja')) suffix = 'Daftar Belanja';
      else if (lower.includes('persediaan')) suffix = 'Persediaan';
      else if (lower.includes('permintaan')) suffix = 'Permintaan';
      else if (lower.includes('pengguna')) suffix = 'Pengguna';
      else if (lower.includes('katalog')) suffix = 'Katalog';
      else if (lower.includes('dashboard')) suffix = 'Dashboard';
      else if (lower.includes('pengaturan')) suffix = 'Pengaturan';

      const pageDocTitle = `SIMPATK - Pelindo Terminal Petikemas ${suffix}`;
      document.title = pageDocTitle;

      const handleBeforePrint = () => {
        document.title = pageDocTitle;
      };
      window.addEventListener('beforeprint', handleBeforePrint);
      return () => {
        window.removeEventListener('beforeprint', handleBeforePrint);
      };
    }
  }, [title]);

  return (
    <div className={`w-full min-h-full lg:h-full max-w-[1360px] mx-auto px-4 sm:px-6 flex flex-col min-h-0 select-none print:max-w-none print:w-full print:px-0 print:py-0 print:h-auto print:min-h-0 print:overflow-visible print:block ${className}`}>
      {/* Uniform Responsive Page Header (Hidden during printing) */}
      <div className="min-h-[56px] py-2.5 sm:py-0 sm:h-14 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/80 gap-2 sm:gap-4 print:hidden">
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

      {/* Internal Content Area (natural scroll on mobile < lg, zero-scroll 100dvh on desktop lg+) */}
      <div className={`flex-1 min-h-0 pt-3.5 pb-6 flex flex-col overflow-visible lg:overflow-hidden print:pt-0 print:pb-0 print:h-auto print:overflow-visible print:block ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
}
