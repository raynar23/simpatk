// Admin periodic reporting page with 3 report tabs, DataTable, CSV export, and print capability
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import {
  FileText,
  Printer,
  TrendingUp,
  Package,
  Boxes,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatRupiah, isLowStock } from '@/lib/utils';
import type { Item, RequestWithDetails } from '@/lib/types';
import type { TopItemDataPoint } from '@/components/admin/DashboardCharts';

interface MonthlySummaryRow extends Record<string, unknown> {
  id: string;
  periode: string;
  totalPermintaan: number;
  totalSelesai: number;
  persentaseSelesai: number;
  rataWaktuJam: number;
}

interface ItemReportRow extends Record<string, unknown> {
  id: string;
  kode: string;
  nama: string;
  kategori: string;
  satuan: string;
  total_diminta: number;
  total_frekuensi: number;
}

interface StockReportRow extends Record<string, unknown> {
  id: string;
  kode: string;
  nama: string;
  kategori: string;
  satuan: string;
  stok: number;
  stok_minimum: number;
  harga_satuan: number;
  totalValuasi: number;
  statusStok: 'habis' | 'menipis' | 'normal';
}

export default function AdminLaporanPage() {
  const supabase = createClient();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'permintaan' | 'barang' | 'persediaan'>('permintaan');
  const [periodDays, setPeriodDays] = useState<number>(30); // 7, 30, 180, 365
  const [isLoading, setIsLoading] = useState(true);

  const [rawRequests, setRawRequests] = useState<RequestWithDetails[]>([]);
  const [topItems, setTopItems] = useState<TopItemDataPoint[]>([]);
  const [rawItems, setRawItems] = useState<Item[]>([]);

  // Load report data
  useEffect(() => {
    let ignore = false;

    async function loadReportData() {
      try {
        const thresholdDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

        const [reqRes, topRes, itemsRes] = await Promise.all([
          supabase
            .from('requests')
            .select('*, items(*), profiles(*)')
            .gte('created_at', thresholdDate)
            .order('created_at', { ascending: false }),
          supabase.rpc('top_items', { p_days: periodDays, p_limit: 24 }),
          supabase.from('items').select('*').order('nama', { ascending: true }),
        ]);

        if (ignore) return;

        if (reqRes.data) setRawRequests(reqRes.data as RequestWithDetails[]);
        if (topRes.data) setTopItems(topRes.data as unknown as TopItemDataPoint[]);
        if (itemsRes.data) setRawItems(itemsRes.data as Item[]);
      } catch {
        if (!ignore) showToast('Gagal memuat data laporan.', 'error');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadReportData();

    return () => {
      ignore = true;
    };
  }, [supabase, showToast, periodDays]);

  // Tab 1: Ringkasan Permintaan per Bulan / Periode
  const monthlySummary = useMemo<MonthlySummaryRow[]>(() => {
    const buckets: Record<
      string,
      { count: number; selesai: number; totalHours: number; completedCount: number }
    > = {};

    rawRequests.forEach((req) => {
      const d = new Date(req.created_at);
      const key = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

      if (!buckets[key]) {
        buckets[key] = { count: 0, selesai: 0, totalHours: 0, completedCount: 0 };
      }
      buckets[key].count += 1;

      if (req.status === 'selesai') {
        buckets[key].selesai += 1;
        if (req.completed_at) {
          const diffHours =
            (new Date(req.completed_at).getTime() - new Date(req.created_at).getTime()) /
            (1000 * 60 * 60);
          if (diffHours >= 0) {
            buckets[key].totalHours += diffHours;
            buckets[key].completedCount += 1;
          }
        }
      }
    });

    return Object.entries(buckets).map(([periode, stats], idx) => ({
      id: `summary-${idx}`,
      periode,
      totalPermintaan: stats.count,
      totalSelesai: stats.selesai,
      persentaseSelesai: stats.count > 0 ? Math.round((stats.selesai / stats.count) * 100) : 0,
      rataWaktuJam:
        stats.completedCount > 0 ? Math.round((stats.totalHours / stats.completedCount) * 10) / 10 : 0,
    }));
  }, [rawRequests]);

  // Tab 2: Barang Paling Diminta
  const topItemsReport = useMemo<ItemReportRow[]>(() => {
    return topItems.map((it) => ({
      id: it.item_id,
      kode: it.kode,
      nama: it.nama,
      kategori: it.kategori,
      satuan: it.satuan,
      total_diminta: it.total_diminta,
      total_frekuensi: it.total_frekuensi,
    }));
  }, [topItems]);

  // Tab 3: Posisi Persediaan
  const stockPositionReport = useMemo<StockReportRow[]>(() => {
    return rawItems.map((it) => {
      let statusStok: 'habis' | 'menipis' | 'normal' = 'normal';
      if (it.stok === 0) statusStok = 'habis';
      else if (isLowStock(it.stok, it.stok_minimum)) statusStok = 'menipis';

      return {
        id: it.id,
        kode: it.kode || 'ATK',
        nama: it.nama,
        kategori: it.kategori || 'Lainnya',
        satuan: it.satuan,
        stok: it.stok,
        stok_minimum: it.stok_minimum,
        harga_satuan: it.harga_satuan || 0,
        totalValuasi: (it.stok || 0) * (it.harga_satuan || 0),
        statusStok,
      };
    });
  }, [rawItems]);

  // Column definitions for Tab 1: Ringkasan Permintaan
  const columnsTab1: ColumnDef<MonthlySummaryRow>[] = [
    {
      id: 'periode',
      header: 'Bulan / Periode',
      accessorKey: 'periode',
      cell: (row) => <span className="font-semibold text-text-main">{row.periode}</span>,
    },
    {
      id: 'totalPermintaan',
      header: 'Total Permintaan',
      accessorKey: 'totalPermintaan',
      isNumeric: true,
      cell: (row) => (
        <span className="tabular-nums font-semibold text-text-main">
          {row.totalPermintaan} transaksi
        </span>
      ),
    },
    {
      id: 'totalSelesai',
      header: 'Selesai Diserahkan',
      accessorKey: 'totalSelesai',
      isNumeric: true,
      cell: (row) => (
        <span className="tabular-nums font-medium text-success">
          {row.totalSelesai} ({row.persentaseSelesai}%)
        </span>
      ),
    },
    {
      id: 'rataWaktuJam',
      header: 'Rata-rata Waktu',
      accessorKey: 'rataWaktuJam',
      isNumeric: true,
      cell: (row) => (
        <span className="tabular-nums text-text-muted">
          {row.rataWaktuJam < 24
            ? `${row.rataWaktuJam} jam`
            : `${(row.rataWaktuJam / 24).toFixed(1)} hari`}
        </span>
      ),
    },
  ];

  // Column definitions for Tab 2: Barang Paling Diminta
  const columnsTab2: ColumnDef<ItemReportRow>[] = [
    {
      id: 'kode',
      header: 'Kode',
      accessorKey: 'kode',
      cell: (row) => (
        <span className="font-mono font-semibold text-primary text-[11px]">{row.kode}</span>
      ),
    },
    {
      id: 'nama',
      header: 'Nama Barang',
      accessorKey: 'nama',
      cell: (row) => <span className="font-medium text-text-main">{row.nama}</span>,
    },
    {
      id: 'kategori',
      header: 'Kategori',
      accessorKey: 'kategori',
      cell: (row) => <span className="text-text-muted">{row.kategori}</span>,
    },
    {
      id: 'total_diminta',
      header: 'Total Diminta',
      accessorKey: 'total_diminta',
      isNumeric: true,
      cell: (row) => (
        <span className="tabular-nums font-bold text-text-main">
          {row.total_diminta} {row.satuan}
        </span>
      ),
    },
    {
      id: 'total_frekuensi',
      header: 'Frekuensi Pengajuan',
      accessorKey: 'total_frekuensi',
      isNumeric: true,
      cell: (row) => (
        <span className="tabular-nums text-text-muted">{row.total_frekuensi} kali</span>
      ),
    },
  ];

  // Column definitions for Tab 3: Posisi Persediaan
  const columnsTab3: ColumnDef<StockReportRow>[] = [
    {
      id: 'kode',
      header: 'Kode',
      accessorKey: 'kode',
      cell: (row) => (
        <span className="font-mono font-semibold text-primary text-[11px]">{row.kode}</span>
      ),
    },
    {
      id: 'nama',
      header: 'Nama Barang',
      accessorKey: 'nama',
      cell: (row) => <span className="font-medium text-text-main">{row.nama}</span>,
    },
    {
      id: 'stok',
      header: 'Stok Saat Ini',
      accessorKey: 'stok',
      isNumeric: true,
      cell: (row) => (
        <span
          className={`tabular-nums font-bold ${
            row.stok === 0 ? 'text-danger' : row.stok <= row.stok_minimum ? 'text-warning' : 'text-text-main'
          }`}
        >
          {row.stok} {row.satuan}
        </span>
      ),
    },
    {
      id: 'stok_minimum',
      header: 'Min. Stok',
      accessorKey: 'stok_minimum',
      isNumeric: true,
      cell: (row) => (
        <span className="tabular-nums text-text-muted">{row.stok_minimum} {row.satuan}</span>
      ),
    },
    {
      id: 'totalValuasi',
      header: 'Estimasi Nilai Stok',
      accessorKey: 'totalValuasi',
      isNumeric: true,
      cell: (row) => (
        <span className="tabular-nums font-semibold text-text-main">
          {formatRupiah(row.totalValuasi)}
        </span>
      ),
    },
    {
      id: 'statusStok',
      header: 'Status',
      isNumeric: true,
      cell: (row) => <Badge variant={row.statusStok} />,
    },
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-3 sm:p-5 max-w-[1440px] mx-auto space-y-4 select-none print:p-0 print:m-0">
      {/* Header and Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-sm font-semibold text-text-main tracking-tight flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span>Laporan Manajemen Persediaan & Permintaan ATK</span>
          </h2>
          <p className="text-[11px] text-text-muted mt-0.5">
            Analisis berkala arus keluar masuk barang, popularitas barang, dan valuasi aset fisik
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="inline-flex p-0.5 rounded-control bg-bg border border-border text-xs">
            {[
              { days: 7, label: '7 Hari' },
              { days: 30, label: '30 Hari' },
              { days: 180, label: '6 Bulan' },
              { days: 365, label: '1 Tahun' },
            ].map((opt) => (
              <button
                key={opt.days}
                type="button"
                onClick={() => setPeriodDays(opt.days)}
                className={`px-2.5 py-1 rounded-badge text-[11px] font-medium transition-colors cursor-pointer ${
                  periodDays === opt.days
                    ? 'bg-surface text-primary shadow-xs font-semibold'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Print button */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-control bg-primary hover:bg-primary-dark text-white shadow-xs transition-colors cursor-pointer min-h-[32px]"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Official Header for Print Mode */}
      <div className="hidden print:flex items-start justify-between border-b border-border pb-4 mb-4">
        <div>
          <div className="relative h-10 w-48 mb-2">
            <Image
              src="/logo/pelindo-color.png"
              alt="Logo Pelindo Terminal Petikemas"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          <h1 className="text-base font-bold text-text-main uppercase tracking-tight">
            Laporan Operasional Alat Tulis Kantor (SIMPATK)
          </h1>
          <p className="text-xs text-text-muted">General Affairs - PT Pelindo Terminal Petikemas</p>
        </div>
        <div className="text-right text-xs text-text-muted">
          <p>
            Periode Data:{' '}
            <span className="font-semibold text-text-main">
              {periodDays <= 30 ? `${periodDays} Hari Terakhir` : `${periodDays / 30} Bulan Terakhir`}
            </span>
          </p>
          <p>Dicetak: {new Date().toLocaleDateString('id-ID')}</p>
        </div>
      </div>

      {/* Report Category Tabs */}
      <div className="inline-flex p-1 rounded-control bg-bg border border-border text-xs print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('permintaan')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-badge text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'permintaan'
              ? 'bg-surface text-text-main shadow-xs font-semibold'
              : 'text-text-muted hover:text-text-main'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Ringkasan Permintaan</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('barang')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-badge text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'barang'
              ? 'bg-surface text-text-main shadow-xs font-semibold'
              : 'text-text-muted hover:text-text-main'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Barang Paling Diminta</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('persediaan')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-badge text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'persediaan'
              ? 'bg-surface text-text-main shadow-xs font-semibold'
              : 'text-text-muted hover:text-text-main'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Posisi Persediaan Fisik</span>
        </button>
      </div>

      {/* Tab 1: Ringkasan Permintaan */}
      {activeTab === 'permintaan' && (
        <DataTable
          columns={columnsTab1}
          data={monthlySummary}
          totalCount={monthlySummary.length}
          page={1}
          pageSize={12}
          onPageChange={() => {}}
          isLoading={isLoading}
          emptyMessage="Tidak ada data permintaan dalam rentang waktu ini."
          csvFilename="laporan_ringkasan_permintaan.csv"
        />
      )}

      {/* Tab 2: Barang Paling Diminta */}
      {activeTab === 'barang' && (
        <DataTable
          columns={columnsTab2}
          data={topItemsReport}
          totalCount={topItemsReport.length}
          page={1}
          pageSize={12}
          onPageChange={() => {}}
          isLoading={isLoading}
          emptyMessage="Tidak ada data barang diminta dalam rentang waktu ini."
          csvFilename="laporan_barang_terpopuler.csv"
        />
      )}

      {/* Tab 3: Posisi Persediaan */}
      {activeTab === 'persediaan' && (
        <DataTable
          columns={columnsTab3}
          data={stockPositionReport}
          totalCount={stockPositionReport.length}
          page={1}
          pageSize={15}
          onPageChange={() => {}}
          isLoading={isLoading}
          emptyMessage="Katalog barang kosong."
          csvFilename="laporan_posisi_persediaan.csv"
        />
      )}
    </div>
  );
}
