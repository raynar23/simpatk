// Two paginated DataTable panels for the Aktivitas tab: Permintaan Terbaru and Barang Stok Menipis
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { formatDateShort } from '@/lib/utils';
import type { RequestWithDetails, Item } from '@/lib/types';

interface DashboardPanelsProps {
  recentRequests: RequestWithDetails[];
  allItems: Item[];
  isLoading: boolean;
}

export function DashboardPanels({
  recentRequests,
  allItems,
  isLoading,
}: DashboardPanelsProps) {
  // Panel 1: Permintaan Terbaru pagination state
  const [reqPage, setReqPage] = useState(1);
  const [reqPageSize, setReqPageSize] = useState(5);

  // Panel 2: Barang Menipis pagination state
  const [itemPage, setItemPage] = useState(1);
  const [itemPageSize, setItemPageSize] = useState(5);

  // Filter low stock items: stok <= stok_minimum (including 0)
  const lowStockItems = useMemo(() => {
    return allItems
      .filter((it) => it.stok <= it.stok_minimum)
      .sort((a, b) => a.stok - b.stok);
  }, [allItems]);

  // Paginated requests slice
  const paginatedRequests = useMemo(() => {
    const start = (reqPage - 1) * reqPageSize;
    return recentRequests.slice(start, start + reqPageSize);
  }, [recentRequests, reqPage, reqPageSize]);

  // Paginated low stock items slice
  const paginatedLowStock = useMemo(() => {
    const start = (itemPage - 1) * itemPageSize;
    return lowStockItems.slice(start, start + itemPageSize);
  }, [lowStockItems, itemPage, itemPageSize]);

  // Columns for Permintaan Terbaru
  const requestColumns: ColumnDef<RequestWithDetails>[] = [
    {
      id: 'nomor',
      header: 'Nomor',
      accessorKey: 'nomor',
      className: 'min-w-[120px]',
      csvValue: (row) => row.nomor || `REQ-${row.id.slice(0, 8)}`,
      cell: (row) => (
        <span className="font-mono font-semibold text-primary text-[11px] whitespace-nowrap">
          {row.nomor || 'REQ'}
        </span>
      ),
    },
    {
      id: 'created_at',
      header: 'Tanggal',
      accessorKey: 'created_at',
      className: 'min-w-[100px]',
      csvValue: (row) => formatDateShort(row.created_at),
      cell: (row) => (
        <span className="text-text-muted tabular-nums whitespace-nowrap">
          {formatDateShort(row.created_at)}
        </span>
      ),
    },
    {
      id: 'profiles',
      header: 'Divisi',
      className: 'min-w-[130px]',
      csvValue: (row) => row.profiles?.nama_divisi || 'Divisi',
      cell: (row) => (
        <span className="font-medium text-text-main leading-snug">
          {row.profiles?.nama_divisi || 'Divisi'}
        </span>
      ),
    },
    {
      id: 'items',
      header: 'Barang',
      className: 'min-w-[200px]',
      csvValue: (row) =>
        `${row.items?.nama || '-'}${row.items?.kode ? ` (${row.items.kode})` : ''}`,
      cell: (row) => (
        <span className="text-text-main leading-snug">
          {row.items?.nama || '-'}
        </span>
      ),
    },
    {
      id: 'jumlah',
      header: 'Jumlah',
      accessorKey: 'jumlah',
      isNumeric: true,
      className: 'min-w-[90px]',
      csvValue: (row) => `${row.jumlah} ${row.items?.satuan || 'unit'}`,
      cell: (row) => (
        <span className="tabular-nums font-semibold text-text-main whitespace-nowrap">
          {row.jumlah} {row.items?.satuan}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      align: 'center',
      className: 'min-w-[105px]',
      csvValue: (row) => (row.status === 'selesai' ? 'Selesai' : 'Sedang Diproses'),
      cell: (row) => (
        <div className="flex justify-center">
          <Badge variant={row.status as 'diproses' | 'selesai'} />
        </div>
      ),
    },
  ];

  // Columns for Barang Stok Menipis
  const stockColumns: ColumnDef<Item>[] = [
    {
      id: 'kode',
      header: 'Kode',
      accessorKey: 'kode',
      className: 'min-w-[85px]',
      csvValue: (row) => row.kode || 'ATK',
      cell: (row) => (
        <span className="font-mono font-semibold text-primary text-[11px] whitespace-nowrap">
          {row.kode || 'ATK'}
        </span>
      ),
    },
    {
      id: 'nama',
      header: 'Nama Barang',
      accessorKey: 'nama',
      className: 'min-w-[220px]',
      csvValue: (row) => row.nama,
      cell: (row) => (
        <span className="font-medium text-text-main leading-snug">
          {row.nama}
        </span>
      ),
    },
    {
      id: 'kategori',
      header: 'Kategori',
      accessorKey: 'kategori',
      className: 'min-w-[120px]',
      csvValue: (row) => row.kategori,
      cell: (row) => <span className="text-text-muted whitespace-nowrap">{row.kategori}</span>,
    },
    {
      id: 'stok',
      header: 'Stok Fisik',
      accessorKey: 'stok',
      align: 'center',
      className: 'min-w-[95px]',
      csvValue: (row) => `${row.stok} ${row.satuan}`,
      cell: (row) => (
        <div className="text-center">
          <span
            className={`tabular-nums font-bold whitespace-nowrap ${
              row.stok === 0 ? 'text-danger' : 'text-danger'
            }`}
          >
            {row.stok === 0 ? 'Habis (0)' : `${row.stok} ${row.satuan}`}
          </span>
        </div>
      ),
    },
    {
      id: 'stok_minimum',
      header: 'Min. Stok',
      accessorKey: 'stok_minimum',
      align: 'center',
      className: 'min-w-[95px]',
      csvValue: (row) => `${row.stok_minimum} ${row.satuan}`,
      cell: (row) => (
        <div className="text-center">
          <span className="tabular-nums text-text-muted whitespace-nowrap">
            {row.stok_minimum} {row.satuan}
          </span>
        </div>
      ),
    },
    {
      id: 'saran',
      header: 'Saran Beli',
      align: 'center',
      className: 'min-w-[95px]',
      csvValue: (row) => `+${Math.max(1, row.stok_minimum * 2 - row.stok)} ${row.satuan}`,
      cell: (row) => {
        const saran = Math.max(1, row.stok_minimum * 2 - row.stok);
        return (
          <div className="text-center">
            <span className="tabular-nums font-semibold text-primary whitespace-nowrap">
              +{saran} {row.satuan}
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full min-h-0">
      {/* Panel 1: Permintaan Terbaru */}
      <div className="bg-surface rounded-card border border-border flex flex-col min-h-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0 bg-surface">
          <div>
            <h3 className="text-xs font-semibold text-text-main tracking-tight">
              Permintaan Terbaru
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              Antrean transaksi permohonan terkini seluruh divisi
            </p>
          </div>
          <Link
            href="/admin/permintaan"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
          >
            <span>Semua Permintaan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <DataTable
            columns={requestColumns}
            data={paginatedRequests}
            exportData={recentRequests}
            totalCount={recentRequests.length}
            page={reqPage}
            pageSize={reqPageSize}
            onPageChange={setReqPage}
            onPageSizeChange={setReqPageSize}
            isLoading={isLoading}
            csvFilename="dashboard_permintaan_terbaru.csv"
            emptyMessage="Belum ada transaksi permintaan diajukan."
            className="border-none rounded-none shadow-none flex-1 min-h-0"
            tableClassName="min-w-[750px]"
          />
        </div>
      </div>

      {/* Panel 2: Barang Stok Menipis */}
      <div className="bg-surface rounded-card border border-border flex flex-col min-h-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0 bg-surface">
          <div>
            <h3 className="text-xs font-semibold text-text-main tracking-tight">
              Barang Stok Menipis
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              Daftar barang dengan stok fisik pada atau di bawah batas minimum
            </p>
          </div>
          <Link
            href="/admin/persediaan"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
          >
            <span>Kelola Persediaan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <DataTable
            columns={stockColumns}
            data={paginatedLowStock}
            exportData={lowStockItems}
            totalCount={lowStockItems.length}
            page={itemPage}
            pageSize={itemPageSize}
            onPageChange={setItemPage}
            onPageSizeChange={setItemPageSize}
            isLoading={isLoading}
            csvFilename="dashboard_stok_menipis.csv"
            emptyMessage="Semua stok barang dalam kondisi aman di atas batas minimum."
            className="border-none rounded-none shadow-none flex-1 min-h-0"
            tableClassName="min-w-[720px]"
          />
        </div>
      </div>
    </div>
  );
}
