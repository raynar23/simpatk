// Compact macOS-style pagination bar with item counter and navigation
'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (newPage: number) => void;
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  className = '',
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  return (
    <div
      className={`flex items-center justify-between gap-2 sm:gap-3 text-[11px] sm:text-xs text-text-muted select-none px-3 py-2 border-t border-border bg-surface flex-wrap sm:flex-nowrap print:hidden ${className}`}
    >
      {/* Item count summary */}
      <div className="tabular-nums">
        Menampilkan <span className="font-semibold text-text-main">{startItem}</span>-
        <span className="font-semibold text-text-main">{endItem}</span> dari{' '}
        <span className="font-semibold text-text-main">{totalCount}</span>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] mr-1 tabular-nums">
          Halaman {page} dari {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Halaman sebelumnya"
          className="inline-flex items-center justify-center w-7 h-7 rounded-control border border-border bg-surface hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-text-main cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Halaman berikutnya"
          className="inline-flex items-center justify-center w-7 h-7 rounded-control border border-border bg-surface hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-text-main cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
