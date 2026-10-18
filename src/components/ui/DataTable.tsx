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
  accessorKey?: keyof T | string;
  accessorFn?: (row: T) => unknown;
  csvValue?: (row: T) => string | number | boolean | null | undefined;
  cell?: (row: T, index: number) => React.ReactNode;
  isNumeric?: boolean;
  isSortable?: boolean;
  className?: string;
  excludeFromCsv?: boolean;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  exportData?: T[];
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
  onExportCsv?: () => void;
  enableDynamicHeight?: boolean;
  className?: string;
  tableClassName?: string;
}

export function DataTable<T extends object>({
  columns,
  data,
  exportData,
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
  onExportCsv,
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

  // Extract cell value with fallback heuristics for CSV export
  const extractCellCsvValue = (col: ColumnDef<T>, row: T): string => {
    // 1. Explicit csvValue function
    if (col.csvValue) {
      const customVal = col.csvValue(row);
      if (customVal === null || customVal === undefined) return '';
      return String(customVal);
    }

    // 2. Explicit accessorFn
    if (col.accessorFn) {
      const fnVal = col.accessorFn(row);
      if (fnVal === null || fnVal === undefined) return '';
      return typeof fnVal === 'object' ? JSON.stringify(fnVal) : String(fnVal);
    }

    // 3. Resolve key (accessorKey or id)
    const rawKey = (col.accessorKey as string) || col.id;
    const r = row as Record<string, unknown>;

    // Nested path (e.g. "items.nama")
    if (rawKey.includes('.')) {
      const parts = rawKey.split('.');
      let curr: unknown = r;
      for (const part of parts) {
        if (curr && typeof curr === 'object') {
          curr = (curr as Record<string, unknown>)[part];
        } else {
          curr = undefined;
          break;
        }
      }
      if (curr !== null && curr !== undefined) {
        return String(curr);
      }
    }

    // Direct object property
    let direct = r[rawKey];
    if (direct === undefined && col.accessorKey) {
      direct = r[col.accessorKey as string];
    }
    if (direct === undefined && col.id) {
      direct = r[col.id];
    }

    if (direct !== null && direct !== undefined) {
      if (typeof direct === 'object') {
        const obj = direct as Record<string, unknown>;
        if ('nama_divisi' in obj) return String(obj.nama_divisi || '');
        if ('nama' in obj) {
          return obj.kode ? `${obj.nama} (${obj.kode})` : String(obj.nama || '');
        }
        return '';
      }
      return String(direct);
    }

    // 4. Smart heuristic by column id/header
    const idL = col.id.toLowerCase();
    const headerL = col.header.toLowerCase();

    // Nomor tiket
    if (idL.includes('nomor') || headerL.includes('nomor') || headerL.includes('tiket')) {
      if ('nomor' in r && r.nomor) return String(r.nomor);
      if ('id' in r && r.id) return `REQ-${String(r.id).slice(0, 8)}`;
    }

    // Waktu / Tanggal
    if (idL.includes('created') || idL.includes('tanggal') || idL.includes('waktu') || headerL.includes('waktu') || headerL.includes('tanggal')) {
      if ('created_at' in r && r.created_at) return String(r.created_at);
      if ('tanggal' in r && r.tanggal) return String(r.tanggal);
    }

    // Divisi / Pemohon
    if (idL.includes('divisi') || idL.includes('profile') || idL.includes('pemohon') || headerL.includes('divisi')) {
      if ('profiles' in r && r.profiles && typeof r.profiles === 'object') {
        return String((r.profiles as Record<string, unknown>).nama_divisi || '');
      }
      if ('nama_divisi' in r) return String(r.nama_divisi || '');
      if ('pemohon' in r) return String(r.pemohon || '');
    }

    // Barang ATK
    if (idL.includes('item') || idL.includes('barang') || headerL.includes('barang')) {
      if ('items' in r && r.items && typeof r.items === 'object') {
        const it = r.items as Record<string, unknown>;
        return it.kode ? `${it.nama} (${it.kode})` : String(it.nama || '');
      }
      if ('nama' in r) return String(r.nama || '');
      if ('namaBarang' in r) return String(r.namaBarang || '');
    }

    // Kuantitas / Jumlah
    if (idL.includes('jumlah') || idL.includes('kuantitas') || headerL.includes('jumlah') || headerL.includes('kuantitas')) {
      if ('jumlah' in r) return String(r.jumlah ?? '');
      if ('kuantitas' in r) return String(r.kuantitas ?? '');
    }

    // Keperluan
    if (idL.includes('keperluan') || headerL.includes('keperluan')) {
      if ('keperluan' in r) return String(r.keperluan || '');
    }

    // Status
    if (idL.includes('status') || headerL.includes('status')) {
      if ('status' in r) {
        const st = String(r.status);
        if (st === 'diproses') return 'Diproses';
        if (st === 'selesai') return 'Selesai';
        return st;
      }
    }

    return '';
  };

  // Export current view or full dataset to CSV
  const handleExportCsv = () => {
    if (onExportCsv) {
      onExportCsv();
      return;
    }

    const exportColumns = columns.filter((col) => {
      if (col.excludeFromCsv) return false;
      const idLower = col.id.toLowerCase();
      const headerLower = col.header.toLowerCase();
      if (idLower === 'aksi' || idLower === 'action' || idLower === 'actions') return false;
      if (headerLower === 'aksi' || headerLower === 'action' || headerLower === 'actions') return false;
      return true;
    });

    const dataset = exportData && exportData.length > 0 ? exportData : data;
    if (!dataset.length) return;

    const headers = exportColumns.map((col) => `"${col.header.replace(/"/g, '""')}"`);
    const rows = dataset.map((row) =>
      exportColumns
        .map((col) => {
          const val = extractCellCsvValue(col, row);
          return `"${val.replace(/"/g, '""')}"`;
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
        <div className="p-3 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-surface print:hidden">
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
              disabled={(exportData ? exportData.length : data.length) === 0}
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
      <div className="flex-1 overflow-x-auto overflow-y-auto min-h-[360px] lg:min-h-0 print:overflow-visible print:min-h-0 print:h-auto">
        <table
          className={`w-full text-left border-collapse text-xs ${
            tableClassName
              ? tableClassName.includes('min-w-')
                ? tableClassName
                : `min-w-[850px] ${tableClassName}`
              : 'min-w-[850px]'
          } print:min-w-0 print:w-full`}
        >
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
                        ? String((row as Record<string, unknown>)[col.accessorKey as string] ?? '')
                        : ''}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>

          {/* Printable Display: Always renders all rows from exportData (or data) in full without needing state delays */}
          {((exportData && exportData.length > 0 ? exportData : data) as T[]).length > 0 && (
            <tbody className="divide-y divide-border/60 bg-surface hidden print:table-row-group">
              {((exportData && exportData.length > 0 ? exportData : data) as T[]).map((row, rowIdx) => (
                <tr key={`print-row-${rowIdx}`} className="h-auto">
                  {columns.map((col) => (
                    <td
                      key={`print-col-${col.id}`}
                      className={`px-3.5 py-2 align-middle ${
                        col.isNumeric ? 'text-right tabular-nums' : 'text-left'
                      } ${col.className || ''}`}
                    >
                      {col.cell
                        ? col.cell(row, rowIdx)
                        : col.accessorKey
                        ? String((row as Record<string, unknown>)[col.accessorKey as string] ?? '')
                        : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
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
