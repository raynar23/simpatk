// Reusable enterprise DataTable with server-side pagination, sticky header, sorting, and CSV export
'use client';

import React, { useRef, useEffect } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Download,
  Inbox,
} from 'lucide-react';
import { Pagination } from './Pagination';

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T, index: number) => React.ReactNode;
  isNumeric?: boolean;
  isSortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newSize: number) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (columnId: string, direction: 'asc' | 'desc') => void;
  searchValue?: string;
  onSearchChange?: (search: string) => void;
  searchPlaceholder?: string;
  filterControls?: React.ReactNode;
  actionControls?: React.ReactNode;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  csvFilename?: string;
  enableDynamicHeight?: boolean;
  className?: string;
  tableClassName?: string;
}

export function DataTable<T extends object>({
  columns,
  data,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sortColumn,
  sortDirection = 'asc',
  onSortChange,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Cari data...',
  filterControls,
  actionControls,
  onRowClick,
  isLoading = false,
  emptyMessage = 'Tidak ada data yang ditemukan',
  csvFilename = 'simpatk_ekspor.csv',
  enableDynamicHeight = false,
  className = '',
  tableClassName = '',
}: DataTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);

  // ResizeObserver to dynamically adjust page size based on viewport height on desktop (lg: >= 1024px)
  useEffect(() => {
    if (!enableDynamicHeight || !onPageSizeChange || !containerRef.current) return;
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) return;
        const height = entry.contentRect.height;
        // Table row height is 40px; header + toolbar + pagination takes ~110px
        const availableHeight = height - 110;
        const calculatedRows = Math.max(5, Math.floor(availableHeight / 40));
        if (calculatedRows !== pageSize && calculatedRows >= 5) {
          onPageSizeChange(calculatedRows);
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [enableDynamicHeight, onPageSizeChange, pageSize]);

  // Handle column header sorting click
  const handleSortClick = (columnId: string, isSortable?: boolean) => {
    if (!isSortable || !onSortChange) return;

    if (sortColumn === columnId) {
      onSortChange(columnId, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(columnId, 'asc');
    }
  };

  // Export current view or dataset to CSV
  const handleExportCsv = () => {
    if (!data.length) return;

    const headers = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`);
    const rows = data.map((row) =>
      columns
        .map((col) => {
          let val = col.accessorKey
            ? (row as Record<string, unknown>)[col.accessorKey as string]
            : '';
          if (val === null || val === undefined) val = '';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', csvFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      ref={containerRef}
      className={`bg-surface rounded-card border border-border flex flex-col overflow-hidden select-none ${className}`}
    >
      {/* Top Toolbar: Search, Filters, and Actions */}
      {(onSearchChange || filterControls || actionControls) && (
        <div className="p-3 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-surface">
          {/* Left: Search input (full width on mobile, w-72 on desktop) and Filter controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 w-full">
            {onSearchChange && (
              <div className="relative w-full sm:w-72 shrink-0">
                <Search
                  className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                  strokeWidth={1.5}
                />
                <input
                  type="text"
                  value={searchValue || ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-control border border-border bg-bg text-text-main placeholder:text-text-muted focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors min-h-[34px]"
                />
              </div>
            )}
            {filterControls && (
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                {filterControls}
              </div>
            )}
          </div>

          {/* Right: Action controls and Export CSV */}
          <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40">
            {actionControls}
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={data.length === 0}
              title="Ekspor ke CSV"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-control border border-border bg-surface hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-text-main cursor-pointer min-h-[32px]"
            >
              <Download className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* Table Content Area with Sticky Header */}
      <div className="flex-1 overflow-x-auto overflow-y-auto min-h-[360px] lg:min-h-0">
        <table className={`w-full min-w-[760px] text-left border-collapse text-xs ${tableClassName}`}>
          <thead className="sticky top-0 z-10 bg-bg border-b border-border">
            <tr>
              {columns.map((col) => {
                const isCurrentSort = sortColumn === col.id;
                return (
                  <th
                    key={col.id}
                    scope="col"
                    onClick={() => handleSortClick(col.id, col.isSortable)}
                    className={`h-9 px-3.5 font-semibold text-text-muted text-[11px] tracking-tight uppercase whitespace-nowrap ${
                      col.isNumeric ? 'text-right' : 'text-left'
                    } ${
                      col.isSortable
                        ? 'cursor-pointer hover:text-text-main hover:bg-border/40 transition-colors'
                        : ''
                    } ${col.className || ''}`}
                  >
                    <div
                      className={`inline-flex items-center gap-1 ${
                        col.isNumeric ? 'justify-end w-full' : ''
                      }`}
                    >
                      <span>{col.header}</span>
                      {col.isSortable && (
                        <span className="shrink-0 text-text-muted/70">
                          {isCurrentSort ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-primary" strokeWidth={2} />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-primary" strokeWidth={2} />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3" strokeWidth={1.5} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 bg-surface">
            {isLoading ? (
              // Loading skeleton rows
              Array.from({ length: Math.min(pageSize, 6) }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="h-10">
                  {columns.map((col) => (
                    <td key={col.id} className="px-3.5 py-2">
                      <div className="h-4 bg-border/50 rounded-badge animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty message row
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-12 text-center text-text-muted"
                >
                  <Inbox className="w-8 h-8 mx-auto mb-2 text-text-muted/40" strokeWidth={1.5} />
                  <p className="text-xs font-medium">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              // Data rows
              data.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`h-10 transition-colors ${
                    onRowClick
                      ? 'cursor-pointer hover:bg-primary-soft/40 active:bg-primary-soft/70'
                      : 'hover:bg-bg/50'
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={`px-3.5 py-2 align-middle whitespace-nowrap ${
                        col.isNumeric ? 'text-right tabular-nums' : 'text-left'
                      } ${col.className || ''}`}
                    >
                      {col.cell
                        ? col.cell(row, rowIdx)
                        : col.accessorKey
                        ? String(row[col.accessorKey] ?? '')
                        : ''}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Server-side Pagination Bar */}
      <Pagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={onPageChange}
      />
    </div>
  );
}
