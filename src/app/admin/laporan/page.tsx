// Admin comprehensive reporting portal with 4 standalone report modules, 7d-2y date filtering,
// interactive detail inspector modal, individual CSV downloads, and official print layout.
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Printer,
  Download,
  Eye,
  FileText,
  BarChart3,
  Boxes,
  ClipboardList,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import {
  DashboardDateFilter,
  type DateFilterRange,
  getPresetRange,
  formatDisplayDate,
  formatDisplayDateShort,
} from '@/components/admin/DashboardDateFilter';
import {
  formatRupiah,
  isLowStock,
  formatDuration,
  formatMonthYear,
  formatDate,
  formatDateShort,
  formatNumber,
} from '@/lib/utils';
import type { Item, RequestWithDetails } from '@/lib/types';

// Types for each report
type ReportType = 'transaksi' | 'rekapitulasi' | 'konsumsi' | 'persediaan';

interface TransactionReportRow extends Record<string, unknown> {
  id: string;
  nomor: string;
  created_at: string;
  completed_at: string | null;
  pemohon: string;
  namaBarang: string;
  kodeBarang: string;
  kategoriBarang: string;
  jumlah: number;
  satuan: string;
  status: 'diproses' | 'selesai';
  durasiJam: number | null;
  keperluan: string | null;
  catatan: string | null;
}

interface MonthlySummaryRow extends Record<string, unknown> {
  id: string;
  periode: string;
  totalPermintaan: number;
  totalSelesai: number;
  totalDiproses: number;
  persentaseSelesai: number;
  rataWaktuJam: number;
  totalUnit: number;
}

interface ItemConsumptionRow extends Record<string, unknown> {
  id: string;
  kode: string;
  nama: string;
  kategori: string;
  satuan: string;
  totalDiminta: number;
  frekuensiTiket: number;
  rataPerTiket: number;
  estimasiNilai: number;
}

interface StockAuditRow extends Record<string, unknown> {
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

// Browser CSV download helper
function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent =
    '\uFEFF' +
    [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map((row) =>
        row
          .map((val) => {
            const str = String(val ?? '').replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(',')
      ),
    ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminLaporanPage() {
  const supabase = createClient();
  const { showToast } = useToast();

  // Active standalone report
  const [activeReport, setActiveReport] = useState<ReportType>('transaksi');

  // Filter range: supports 7d, 30d, 6m, 1y, 2y, and custom calendar
  const [dateRange, setDateRange] = useState<DateFilterRange>(() => getPresetRange('30d'));
  const [isLoading, setIsLoading] = useState(true);

  // Raw database data
  const [rawRequests, setRawRequests] = useState<RequestWithDetails[]>([]);
  const [rawItems, setRawItems] = useState<Item[]>([]);

  // Local table filters
  const [txSearch, setTxSearch] = useState('');
  const [txStatusFilter, setTxStatusFilter] = useState<'semua' | 'selesai' | 'diproses'>('semua');
  const [itemSearch, setItemSearch] = useState('');
  const [stockSearch, setStockSearch] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'semua' | 'kritis' | 'normal'>('semua');

  // Pagination states
  const [pageTx, setPageTx] = useState(1);
  const [pageMonthly, setPageMonthly] = useState(1);
  const [pageConsumption, setPageConsumption] = useState(1);
  const [pageStock, setPageStock] = useState(1);

  // Inspector detail modal state
  const [inspectedTx, setInspectedTx] = useState<TransactionReportRow | null>(null);
  const [inspectedMonthly, setInspectedMonthly] = useState<MonthlySummaryRow | null>(null);
  const [inspectedItem, setInspectedItem] = useState<ItemConsumptionRow | null>(null);
  const [inspectedStock, setInspectedStock] = useState<StockAuditRow | null>(null);

  useEffect(() => {
    document.title = 'SIMPATK - Pelindo Terminal Petikemas Laporan';
  }, []);

  const handlePrint = () => {
    try {
      document.title = 'SIMPATK - Pelindo Terminal Petikemas Laporan';
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
      } else {
        alert('Fitur cetak dokumen tidak didukung oleh browser ini. Silakan buka melalui browser Chrome atau Safari.');
      }
    } catch (err) {
      console.error('Print error:', err);
    }
  };

  // Load report data matching active date filter
  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [reqRes, itemsRes] = await Promise.all([
          supabase
            .from('requests')
            .select('*, items(*), profiles(*)')
            .gte('created_at', dateRange.startDate.toISOString())
            .lte('created_at', dateRange.endDate.toISOString())
            .order('created_at', { ascending: false })
            .limit(5000),
          supabase.from('items').select('*').order('nama', { ascending: true }),
        ]);

        if (ignore) return;

        if (reqRes.data) setRawRequests(reqRes.data as RequestWithDetails[]);
        if (itemsRes.data) setRawItems(itemsRes.data as Item[]);
      } catch {
        if (!ignore) showToast('Gagal memuat data laporan operasional.', 'error');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [supabase, showToast, dateRange]);

  const handleRangeChange = (newRange: DateFilterRange) => {
    setIsLoading(true);
    setDateRange(newRange);
    setPageTx(1);
    setPageMonthly(1);
    setPageConsumption(1);
  };

  // --- 1. Laporan Riwayat Transaksi Permintaan ---
  const transactionRows = useMemo<TransactionReportRow[]>(() => {
    return rawRequests.map((r) => {
      const it = r.items;
      const prof = r.profiles;
      let durasiJam: number | null = null;
      if (r.status === 'selesai' && r.completed_at) {
        durasiJam = (new Date(r.completed_at).getTime() - new Date(r.created_at).getTime()) / 3600000;
      }
      return {
        id: r.id,
        nomor: r.nomor || `REQ-${r.id.slice(0, 8)}`,
        created_at: r.created_at,
        completed_at: r.completed_at || null,
        pemohon: String(prof?.nama_divisi || 'Divisi Pemohon'),
        namaBarang: String(it?.nama || 'Barang ATK'),
        kodeBarang: String(it?.kode || 'ATK'),
        kategoriBarang: String(it?.kategori || 'Umum'),
        jumlah: r.jumlah || 1,
        satuan: String(it?.satuan || 'unit'),
        status: (r.status as 'diproses' | 'selesai') || 'diproses',
        durasiJam: durasiJam !== null ? Math.max(0, durasiJam) : null,
        keperluan: r.keperluan ? String(r.keperluan) : null,
        catatan: r.catatan_ga ? String(r.catatan_ga) : null,
      };
    });
  }, [rawRequests]);

  const filteredTransactionRows = useMemo(() => {
    return transactionRows.filter((row) => {
      if (txStatusFilter !== 'semua' && row.status !== txStatusFilter) return false;
      if (txSearch) {
        const q = txSearch.toLowerCase();
        const matchesNomor = row.nomor.toLowerCase().includes(q);
        const matchesBarang = row.namaBarang.toLowerCase().includes(q) || row.kodeBarang.toLowerCase().includes(q);
        const matchesPemohon = row.pemohon.toLowerCase().includes(q);
        if (!matchesNomor && !matchesBarang && !matchesPemohon) return false;
      }
      return true;
    });
  }, [transactionRows, txStatusFilter, txSearch]);

  // --- 2. Laporan Rekapitulasi Periode & Kinerja ---
  const monthlyRows = useMemo<MonthlySummaryRow[]>(() => {
    const buckets: Record<
      string,
      {
        count: number;
        selesai: number;
        diproses: number;
        totalHours: number;
        completedCount: number;
        totalUnit: number;
      }
    > = {};

    rawRequests.forEach((req) => {
      const d = new Date(req.created_at);
      const key = formatMonthYear(d);

      if (!buckets[key]) {
        buckets[key] = {
          count: 0,
          selesai: 0,
          diproses: 0,
          totalHours: 0,
          completedCount: 0,
          totalUnit: 0,
        };
      }
      buckets[key].count += 1;
      buckets[key].totalUnit += Number(req.jumlah || 0);

      if (req.status === 'selesai') {
        buckets[key].selesai += 1;
        if (req.completed_at) {
          const diffHours =
            (new Date(req.completed_at).getTime() - new Date(req.created_at).getTime()) / 3600000;
          if (diffHours >= 0) {
            buckets[key].totalHours += diffHours;
            buckets[key].completedCount += 1;
          }
        }
      } else {
        buckets[key].diproses += 1;
      }
    });

    return Object.entries(buckets).map(([periode, stats], idx) => ({
      id: `rekap-${idx}`,
      periode,
      totalPermintaan: stats.count,
      totalSelesai: stats.selesai,
      totalDiproses: stats.diproses,
      persentaseSelesai: stats.count > 0 ? Math.round((stats.selesai / stats.count) * 100) : 0,
      rataWaktuJam:
        stats.completedCount > 0 ? Math.round((stats.totalHours / stats.completedCount) * 10) / 10 : 0,
      totalUnit: stats.totalUnit,
    }));
  }, [rawRequests]);

  // --- 3. Laporan Konsumsi & Distribusi Barang ---
  const consumptionRows = useMemo<ItemConsumptionRow[]>(() => {
    const itemMap = new Map<
      string,
      {
        kode: string;
        nama: string;
        kategori: string;
        satuan: string;
        totalDiminta: number;
        frekuensiTiket: number;
        hargaSatuan: number;
      }
    >();

    // Seed catalog items
    rawItems.forEach((it) => {
      itemMap.set(it.id, {
        kode: it.kode || 'ATK',
        nama: it.nama,
        kategori: it.kategori || 'Lainnya',
        satuan: it.satuan || 'unit',
        totalDiminta: 0,
        frekuensiTiket: 0,
        hargaSatuan: it.harga_satuan || 0,
      });
    });

    // Tally demands
    rawRequests.forEach((req) => {
      if (!req.item_id) return;
      const existing = itemMap.get(req.item_id);
      const qty = Number(req.jumlah || 0);
      if (existing) {
        existing.totalDiminta += qty;
        existing.frekuensiTiket += 1;
      } else {
        const it = req.items;
        itemMap.set(req.item_id, {
          kode: it?.kode || 'ATK',
          nama: it?.nama || 'Barang ATK',
          kategori: it?.kategori || 'Umum',
          satuan: it?.satuan || 'unit',
          totalDiminta: qty,
          frekuensiTiket: 1,
          hargaSatuan: it?.harga_satuan || 0,
        });
      }
    });

    return Array.from(itemMap.entries())
      .map(([id, val]) => ({
        id,
        kode: val.kode,
        nama: val.nama,
        kategori: val.kategori,
        satuan: val.satuan,
        totalDiminta: val.totalDiminta,
        frekuensiTiket: val.frekuensiTiket,
        rataPerTiket:
          val.frekuensiTiket > 0 ? Number((val.totalDiminta / val.frekuensiTiket).toFixed(1)) : 0,
        estimasiNilai: val.totalDiminta * val.hargaSatuan,
      }))
      .filter((row) => {
        if (!itemSearch) return true;
        const q = itemSearch.toLowerCase();
        return (
          row.nama.toLowerCase().includes(q) ||
          row.kode.toLowerCase().includes(q) ||
          row.kategori.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.totalDiminta - a.totalDiminta);
  }, [rawItems, rawRequests, itemSearch]);

  // --- 4. Laporan Posisi & Valuasi Persediaan Fisik ---
  const stockAuditRows = useMemo<StockAuditRow[]>(() => {
    return rawItems
      .map((it) => {
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
      })
      .filter((it) => {
        if (stockStatusFilter === 'kritis' && it.statusStok === 'normal') return false;
        if (stockStatusFilter === 'normal' && it.statusStok !== 'normal') return false;
        if (stockSearch) {
          const q = stockSearch.toLowerCase();
          return (
            it.nama.toLowerCase().includes(q) ||
            it.kode.toLowerCase().includes(q) ||
            it.kategori.toLowerCase().includes(q)
          );
        }
        return true;
      });
  }, [rawItems, stockSearch, stockStatusFilter]);

  // Export CSV Handlers for each report
  const handleExportTransactions = () => {
    const headers = [
      'Nomor Tiket',
      'Tanggal Diajukan',
      'Divisi Pemohon',
      'Kode Barang',
      'Nama Barang ATK',
      'Kategori',
      'Jumlah',
      'Satuan',
      'Status Tiket',
      'Waktu Selesai',
      'Durasi Jam',
      'Keperluan',
    ];
    const rows = filteredTransactionRows.map((r) => [
      r.nomor,
      formatDate(r.created_at),
      r.pemohon,
      r.kodeBarang,
      r.namaBarang,
      r.kategoriBarang,
      r.jumlah,
      r.satuan,
      r.status,
      r.completed_at ? formatDate(r.completed_at) : '-',
      r.durasiJam !== null ? r.durasiJam.toFixed(1) : '-',
      r.keperluan || '-',
    ]);
    downloadCsv(`laporan_riwayat_permintaan_${formatDateShort(new Date())}.csv`, headers, rows);
    showToast('Laporan riwayat permintaan berhasil diunduh.', 'success');
  };

  const handleExportMonthly = () => {
    const headers = [
      'Bulan Periode',
      'Total Tiket Diajukan',
      'Selesai Diserahkan',
      'Sedang Diproses',
      'Tingkat Penyelesaian (%)',
      'Rata-rata Durasi (Jam)',
      'Total Unit ATK Disalurkan',
    ];
    const rows = monthlyRows.map((r) => [
      r.periode,
      r.totalPermintaan,
      r.totalSelesai,
      r.totalDiproses,
      `${r.persentaseSelesai}%`,
      r.rataWaktuJam,
      r.totalUnit,
    ]);
    downloadCsv(`laporan_rekapitulasi_bulanan_${formatDateShort(new Date())}.csv`, headers, rows);
    showToast('Laporan rekapitulasi bulanan berhasil diunduh.', 'success');
  };

  const handleExportConsumption = () => {
    const headers = [
      'Kode Barang',
      'Nama Barang ATK',
      'Kategori',
      'Satuan',
      'Total Kuantitas Diminta',
      'Frekuensi Pengajuan',
      'Rata-rata per Tiket',
      'Estimasi Nilai Distribusi (IDR)',
    ];
    const rows = consumptionRows.map((r) => [
      r.kode,
      r.nama,
      r.kategori,
      r.satuan,
      r.totalDiminta,
      r.frekuensiTiket,
      r.rataPerTiket,
      r.estimasiNilai,
    ]);
    downloadCsv(`laporan_konsumsi_barang_${formatDateShort(new Date())}.csv`, headers, rows);
    showToast('Laporan konsumsi barang berhasil diunduh.', 'success');
  };

  const handleExportStock = () => {
    const headers = [
      'Kode Barang',
      'Nama Barang ATK',
      'Kategori',
      'Satuan',
      'Stok Fisik',
      'Batas Minimum',
      'Status Stok',
      'Harga Satuan (IDR)',
      'Total Valuasi Fisik (IDR)',
    ];
    const rows = stockAuditRows.map((r) => [
      r.kode,
      r.nama,
      r.kategori,
      r.satuan,
      r.stok,
      r.stok_minimum,
      r.statusStok,
      r.harga_satuan,
      r.totalValuasi,
    ]);
    downloadCsv(`laporan_posisi_persediaan_${formatDateShort(new Date())}.csv`, headers, rows);
    showToast('Laporan posisi persediaan fisik berhasil diunduh.', 'success');
  };

  // Columns for Table 1: Transaksi Permintaan
  const columnsTx: ColumnDef<TransactionReportRow>[] = [
    {
      id: 'nomor',
      header: 'Nomor Tiket',
      accessorKey: 'nomor',
      className: 'min-w-[130px]',
      csvValue: (row) => row.nomor,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-primary whitespace-nowrap">{row.nomor}</span>
      ),
    },
    {
      id: 'created_at',
      header: 'Waktu Pengajuan',
      accessorKey: 'created_at',
      className: 'min-w-[130px]',
      csvValue: (row) => formatDate(row.created_at),
      cell: (row) => <span className="text-xs text-text-muted whitespace-nowrap">{formatDate(row.created_at)}</span>,
    },
    {
      id: 'pemohon',
      header: 'Divisi Pemohon',
      accessorKey: 'pemohon',
      className: 'min-w-[140px]',
      csvValue: (row) => row.pemohon,
      cell: (row) => <span className="text-xs font-medium text-text-main leading-snug">{row.pemohon}</span>,
    },
    {
      id: 'namaBarang',
      header: 'Barang ATK',
      accessorKey: 'namaBarang',
      className: 'min-w-[260px]',
      csvValue: (row) => `${row.namaBarang} (${row.kodeBarang})`,
      cell: (row) => (
        <div className="min-w-0">
          <p className="text-xs font-medium text-text-main leading-snug">{row.namaBarang}</p>
          <p className="text-[10px] text-text-muted font-mono">{row.kodeBarang} - {row.kategoriBarang}</p>
        </div>
      ),
    },
    {
      id: 'jumlah',
      header: 'Jumlah',
      accessorKey: 'jumlah',
      isNumeric: true,
      className: 'min-w-[95px]',
      csvValue: (row) => `${row.jumlah} ${row.satuan}`,
      cell: (row) => (
        <span className="tabular-nums text-xs font-semibold text-text-main whitespace-nowrap">
          {row.jumlah} {row.satuan}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      className: 'min-w-[110px]',
      csvValue: (row) => (row.status === 'selesai' ? 'Selesai' : 'Sedang Diproses'),
      cell: (row) => <Badge variant={row.status} />,
    },
    {
      id: 'durasiJam',
      header: 'Durasi',
      accessorKey: 'durasiJam',
      isNumeric: true,
      className: 'min-w-[120px]',
      csvValue: (row) => (row.durasiJam !== null ? formatDuration(row.durasiJam) : '-'),
      cell: (row) => (
        <span className="tabular-nums text-xs text-text-muted whitespace-nowrap">
          {row.durasiJam !== null ? formatDuration(row.durasiJam) : '-'}
        </span>
      ),
    },
    {
      id: 'aksi',
      header: 'Aksi',
      className: 'min-w-[115px] print:hidden',
      excludeFromCsv: true,
      isNumeric: true,
      cell: (row) => (
        <button
          type="button"
          onClick={() => setInspectedTx(row)}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-control transition-colors cursor-pointer whitespace-nowrap"
        >
          <Eye className="w-3 h-3" />
          <span>Lihat Laporan</span>
        </button>
      ),
    },
  ];

  // Columns for Table 2: Rekapitulasi Bulanan
  const columnsMonthly: ColumnDef<MonthlySummaryRow>[] = [
    {
      id: 'periode',
      header: 'Bulan / Periode',
      accessorKey: 'periode',
      className: 'min-w-[140px]',
      csvValue: (row) => row.periode,
      cell: (row) => <span className="font-semibold text-text-main text-xs whitespace-nowrap">{row.periode}</span>,
    },
    {
      id: 'totalPermintaan',
      header: 'Total Tiket',
      accessorKey: 'totalPermintaan',
      isNumeric: true,
      className: 'min-w-[120px]',
      csvValue: (row) => row.totalPermintaan,
      cell: (row) => (
        <span className="tabular-nums font-semibold text-text-main text-xs whitespace-nowrap">
          {row.totalPermintaan} tiket
        </span>
      ),
    },
    {
      id: 'totalSelesai',
      header: 'Selesai Diserahkan',
      accessorKey: 'totalSelesai',
      isNumeric: true,
      className: 'min-w-[140px]',
      csvValue: (row) => `${row.totalSelesai} (${row.persentaseSelesai}%)`,
      cell: (row) => (
        <span className="tabular-nums font-medium text-success text-xs whitespace-nowrap">
          {row.totalSelesai} ({row.persentaseSelesai}%)
        </span>
      ),
    },
    {
      id: 'totalDiproses',
      header: 'Sedang Diproses',
      accessorKey: 'totalDiproses',
      isNumeric: true,
      className: 'min-w-[125px]',
      csvValue: (row) => row.totalDiproses,
      cell: (row) => (
        <span className="tabular-nums text-text-muted text-xs whitespace-nowrap">
          {row.totalDiproses} tiket
        </span>
      ),
    },
    {
      id: 'rataWaktuJam',
      header: 'Rata-rata Durasi',
      accessorKey: 'rataWaktuJam',
      isNumeric: true,
      className: 'min-w-[130px]',
      csvValue: (row) => formatDuration(row.rataWaktuJam),
      cell: (row) => (
        <span className="tabular-nums text-text-muted text-xs whitespace-nowrap">
          {formatDuration(row.rataWaktuJam)}
        </span>
      ),
    },
    {
      id: 'totalUnit',
      header: 'Total Unit ATK',
      accessorKey: 'totalUnit',
      isNumeric: true,
      className: 'min-w-[125px]',
      csvValue: (row) => row.totalUnit,
      cell: (row) => (
        <span className="tabular-nums font-semibold text-primary text-xs whitespace-nowrap">
          {formatNumber(row.totalUnit)} unit
        </span>
      ),
    },
    {
      id: 'aksi',
      header: 'Aksi',
      className: 'min-w-[115px] print:hidden',
      excludeFromCsv: true,
      isNumeric: true,
      cell: (row) => (
        <button
          type="button"
          onClick={() => setInspectedMonthly(row)}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-control transition-colors cursor-pointer whitespace-nowrap"
        >
          <Eye className="w-3 h-3" />
          <span>Lihat Rincian</span>
        </button>
      ),
    },
  ];

  // Columns for Table 3: Konsumsi Barang
  const columnsConsumption: ColumnDef<ItemConsumptionRow>[] = [
    {
      id: 'kode',
      header: 'Kode',
      accessorKey: 'kode',
      className: 'min-w-[90px]',
      csvValue: (row) => row.kode,
      cell: (row) => (
        <span className="font-mono font-semibold text-primary text-xs whitespace-nowrap">{row.kode}</span>
      ),
    },
    {
      id: 'nama',
      header: 'Nama Barang ATK',
      accessorKey: 'nama',
      className: 'min-w-[260px]',
      csvValue: (row) => row.nama,
      cell: (row) => <span className="font-medium text-text-main text-xs leading-snug">{row.nama}</span>,
    },
    {
      id: 'kategori',
      header: 'Kategori',
      accessorKey: 'kategori',
      className: 'min-w-[130px]',
      csvValue: (row) => row.kategori,
      cell: (row) => <span className="text-text-muted text-xs whitespace-nowrap">{row.kategori}</span>,
    },
    {
      id: 'totalDiminta',
      header: 'Total Permintaan',
      accessorKey: 'totalDiminta',
      isNumeric: true,
      className: 'min-w-[130px]',
      csvValue: (row) => `${row.totalDiminta} ${row.satuan}`,
      cell: (row) => (
        <span className="tabular-nums font-bold text-text-main text-xs whitespace-nowrap">
          {formatNumber(row.totalDiminta)} {row.satuan}
        </span>
      ),
    },
    {
      id: 'frekuensiTiket',
      header: 'Frekuensi Pengajuan',
      accessorKey: 'frekuensiTiket',
      isNumeric: true,
      className: 'min-w-[140px]',
      csvValue: (row) => row.frekuensiTiket,
      cell: (row) => (
        <span className="tabular-nums text-text-muted text-xs whitespace-nowrap">{row.frekuensiTiket} kali</span>
      ),
    },
    {
      id: 'estimasiNilai',
      header: 'Estimasi Nilai Distribusi',
      accessorKey: 'estimasiNilai',
      isNumeric: true,
      className: 'min-w-[140px]',
      csvValue: (row) => row.estimasiNilai,
      cell: (row) => (
        <span className="tabular-nums font-semibold text-primary text-xs whitespace-nowrap">
          {formatRupiah(row.estimasiNilai)}
        </span>
      ),
    },
    {
      id: 'aksi',
      header: 'Aksi',
      className: 'min-w-[115px] print:hidden',
      excludeFromCsv: true,
      isNumeric: true,
      cell: (row) => (
        <button
          type="button"
          onClick={() => setInspectedItem(row)}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-control transition-colors cursor-pointer whitespace-nowrap"
        >
          <Eye className="w-3 h-3" />
          <span>Lihat Distribusi</span>
        </button>
      ),
    },
  ];

  // Columns for Table 4: Posisi Persediaan
  const columnsStock: ColumnDef<StockAuditRow>[] = [
    {
      id: 'kode',
      header: 'Kode',
      accessorKey: 'kode',
      className: 'min-w-[90px]',
      csvValue: (row) => row.kode,
      cell: (row) => (
        <span className="font-mono font-semibold text-primary text-xs whitespace-nowrap">{row.kode}</span>
      ),
    },
    {
      id: 'nama',
      header: 'Nama Barang ATK',
      accessorKey: 'nama',
      className: 'min-w-[260px]',
      csvValue: (row) => row.nama,
      cell: (row) => <span className="font-medium text-text-main text-xs leading-snug">{row.nama}</span>,
    },
    {
      id: 'kategori',
      header: 'Kategori',
      accessorKey: 'kategori',
      className: 'min-w-[130px]',
      csvValue: (row) => row.kategori,
      cell: (row) => <span className="text-text-muted text-xs whitespace-nowrap">{row.kategori}</span>,
    },
    {
      id: 'stok',
      header: 'Stok Fisik',
      accessorKey: 'stok',
      isNumeric: true,
      className: 'min-w-[100px]',
      csvValue: (row) => `${row.stok} ${row.satuan}`,
      cell: (row) => (
        <span
          className={`tabular-nums font-bold text-xs whitespace-nowrap ${
            row.stok === 0
              ? 'text-danger'
              : row.stok <= row.stok_minimum
              ? 'text-warning'
              : 'text-text-main'
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
      className: 'min-w-[95px]',
      csvValue: (row) => `${row.stok_minimum} ${row.satuan}`,
      cell: (row) => (
        <span className="tabular-nums text-text-muted text-xs whitespace-nowrap">
          {row.stok_minimum} {row.satuan}
        </span>
      ),
    },
    {
      id: 'totalValuasi',
      header: 'Estimasi Nilai Stok',
      accessorKey: 'totalValuasi',
      isNumeric: true,
      className: 'min-w-[140px]',
      csvValue: (row) => row.totalValuasi,
      cell: (row) => (
        <span className="tabular-nums font-semibold text-text-main text-xs whitespace-nowrap">
          {formatRupiah(row.totalValuasi)}
        </span>
      ),
    },
    {
      id: 'statusStok',
      header: 'Status',
      accessorKey: 'statusStok',
      isNumeric: true,
      className: 'min-w-[105px]',
      csvValue: (row) =>
        row.statusStok === 'habis' ? 'Habis' : row.statusStok === 'menipis' ? 'Menipis' : 'Normal',
      cell: (row) => <Badge variant={row.statusStok} />,
    },
    {
      id: 'aksi',
      header: 'Aksi',
      className: 'min-w-[115px] print:hidden',
      excludeFromCsv: true,
      isNumeric: true,
      cell: (row) => (
        <button
          type="button"
          onClick={() => setInspectedStock(row)}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-control transition-colors cursor-pointer whitespace-nowrap"
        >
          <Eye className="w-3 h-3" />
          <span>Lihat Detail</span>
        </button>
      ),
    },
  ];

  // Header controls for PageContainer: Comprehensive Date Filter (7d to 2y) & Print Action
  const headerActions = (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto justify-end print:hidden">
      <div className="w-full sm:w-auto">
        <DashboardDateFilter
          currentRange={dateRange}
          onChangeRange={handleRangeChange}
          isLoading={isLoading}
          presetOptions={['7d', '30d', '6m', '1y', '2y']}
        />
      </div>

      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-control bg-primary hover:bg-primary-dark active:scale-[0.98] text-white shadow-xs transition-all cursor-pointer min-h-[38px] sm:min-h-[34px] w-full sm:w-auto shrink-0 touch-manipulation select-none"
      >
        <Printer className="w-3.5 h-3.5" strokeWidth={1.5} />
        <span>Cetak Laporan</span>
      </button>
    </div>
  );

  return (
    <PageContainer
      title="Laporan Operasional"
      subtitle="Pusat pelaporan berkala, analisis riwayat permintaan, konsumsi ATK, dan posisi aset persediaan"
      actions={headerActions}
      className="print:p-0 print:m-0"
      contentClassName="space-y-3"
    >
      {/* Official Header for Print Mode */}
      <div className="hidden print:flex flex-col gap-4 pt-4 pb-6 mb-8 border-b-2 border-black bg-white">
        {/* Top Row: Information on Left, Logo on Right */}
        <div className="flex items-start justify-between gap-4">
          {/* Pojok Atas Kiri: Periode Data & Waktu Cetak */}
          <div className="text-left text-xs text-text-muted space-y-1.5 pt-1">
            <p className="text-xs">
              Periode Data:{' '}
              <span className="font-semibold text-text-main">
                {formatDisplayDateShort(dateRange.startDate)} s.d. {formatDisplayDate(dateRange.endDate)}
              </span>
            </p>
            <p className="text-xs">
              Dicetak:{' '}
              <span className="font-semibold text-text-main">{formatDate(new Date())}</span>
            </p>
          </div>

          {/* Pojok Atas Kanan: Logo Pelindo TPS */}
          <div className="relative h-12 w-56 shrink-0">
            <Image
              src="/logo/pelindo-color.png"
              alt="Logo Pelindo Terminal Petikemas TPS Surabaya"
              fill
              className="object-contain object-right"
              priority
            />
          </div>
        </div>

        {/* Document Title Block */}
        <div className="pt-3 border-t border-gray-200">
          <h1 className="text-lg font-bold text-text-main uppercase tracking-tight">
            {activeReport === 'transaksi'
              ? 'Laporan Riwayat Permintaan Alat Tulis Kantor'
              : activeReport === 'rekapitulasi'
              ? 'Laporan Rekapitulasi Kinerja Bulanan Alat Tulis Kantor'
              : activeReport === 'konsumsi'
              ? 'Laporan Konsumsi & Distribusi Barang Alat Tulis Kantor'
              : 'Laporan Posisi Persediaan & Valuasi Fisik Alat Tulis Kantor'}
          </h1>
          <p className="text-xs text-text-muted mt-1">General Affairs - PT Pelindo Terminal Petikemas</p>
        </div>
      </div>

      {/* Standalone Report Selector Nav (4 Distinct Modules in Balanced Grid) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-2.5 gap-2.5 print:hidden w-full">
        <div className="grid grid-cols-2 sm:flex sm:flex-row p-1 rounded-control bg-bg border border-border text-xs gap-1 w-full sm:w-auto">
          {[
            { key: 'transaksi' as const, label: 'Riwayat Permintaan', icon: ClipboardList },
            { key: 'rekapitulasi' as const, label: 'Rekapitulasi Kinerja', icon: BarChart3 },
            { key: 'konsumsi' as const, label: 'Konsumsi Barang', icon: FileText },
            { key: 'persediaan' as const, label: 'Posisi Persediaan', icon: Boxes },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeReport === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveReport(tab.key)}
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-badge text-xs font-medium transition-colors cursor-pointer text-center ${
                  isActive
                    ? 'bg-surface text-primary shadow-xs font-semibold'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dedicated Download Action on desktop */}
        <div className="hidden sm:flex items-center gap-2 justify-end shrink-0">
          <button
            type="button"
            onClick={
              activeReport === 'transaksi'
                ? handleExportTransactions
                : activeReport === 'rekapitulasi'
                ? handleExportMonthly
                : activeReport === 'konsumsi'
                ? handleExportConsumption
                : handleExportStock
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-control border border-border bg-surface hover:bg-bg text-text-main transition-colors cursor-pointer min-h-[32px]"
            title="Unduh seluruh dataset laporan ke CSV"
          >
            <Download className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />
            <span>
              Unduh CSV{' '}
              {activeReport === 'transaksi'
                ? 'Permintaan'
                : activeReport === 'rekapitulasi'
                ? 'Rekapitulasi'
                : activeReport === 'konsumsi'
                ? 'Konsumsi'
                : 'Persediaan'}
            </span>
          </button>
        </div>
      </div>

      {/* --- MODUL 1: RIWAYAT TRANSAKSI PERMINTAAN --- */}
      {activeReport === 'transaksi' && (
        <div className="flex-1 min-h-0 flex flex-col space-y-2.5">
          {/* Mini KPI Strip (4 balanced cards: 2x2 on mobile, 4 columns on desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 shrink-0 print:hidden">
            <div className="p-3 bg-surface rounded-card border border-border">
              <p className="text-[11px] text-text-muted font-medium">Total Tiket Masuk</p>
              <p className="text-lg font-bold text-text-main tabular-nums mt-0.5">
                {formatNumber(transactionRows.length)}
              </p>
            </div>
            <div className="p-3 bg-surface rounded-card border border-border">
              <p className="text-[11px] text-text-muted font-medium">Selesai Diserahkan</p>
              <p className="text-lg font-bold text-success tabular-nums mt-0.5">
                {formatNumber(transactionRows.filter((r) => r.status === 'selesai').length)}
              </p>
            </div>
            <div className="p-3 bg-surface rounded-card border border-border">
              <p className="text-[11px] text-text-muted font-medium">Menunggu Penyelesaian</p>
              <p className="text-lg font-bold text-primary tabular-nums mt-0.5">
                {formatNumber(transactionRows.filter((r) => r.status === 'diproses').length)}
              </p>
            </div>
            <div className="p-3 bg-surface rounded-card border border-border">
              <p className="text-[11px] text-text-muted font-medium">Rata-rata Waktu Siklus</p>
              <p className="text-lg font-bold text-text-main tabular-nums mt-0.5">
                {(() => {
                  const done = transactionRows.filter((r) => r.durasiJam !== null);
                  if (done.length === 0) return '0 jam';
                  const avg = done.reduce((acc, curr) => acc + (curr.durasiJam || 0), 0) / done.length;
                  return formatDuration(avg);
                })()}
              </p>
            </div>
          </div>

          {/* Table Container */}
          <DataTable
            columns={columnsTx}
            data={filteredTransactionRows.slice((pageTx - 1) * 10, pageTx * 10)}
            exportData={filteredTransactionRows}
            totalCount={filteredTransactionRows.length}
            page={pageTx}
            pageSize={10}
            onPageChange={setPageTx}
            searchValue={txSearch}
            onSearchChange={(val) => {
              setTxSearch(val);
              setPageTx(1);
            }}
            searchPlaceholder="Cari nomor tiket, barang, atau divisi..."
            filterControls={
              <div className="inline-flex p-0.5 rounded-control bg-bg border border-border text-xs">
                {(['semua', 'diproses', 'selesai'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setTxStatusFilter(st);
                      setPageTx(1);
                    }}
                    className={`px-2.5 py-1 rounded-badge text-[11px] capitalize transition-colors cursor-pointer ${
                      txStatusFilter === st
                        ? 'bg-surface text-primary shadow-xs font-semibold'
                        : 'text-text-muted hover:text-text-main'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            }
            isLoading={isLoading}
            emptyMessage="Tidak ada transaksi permintaan pada rentang tanggal terpilih."
            csvFilename={`laporan_transaksi_${formatDateShort(new Date()).replace(/\s+/g, '_')}.csv`}
            tableClassName="min-w-[1100px]"
            enableDynamicHeight={true}
            className="flex-1 min-h-0"
          />
        </div>
      )}

      {/* --- MODUL 2: REKAPITULASI KINERJA BULANAN --- */}
      {activeReport === 'rekapitulasi' && (
        <div className="flex-1 min-h-0 flex flex-col space-y-2.5">
          {/* Mini Summary Banner (4 balanced cards: 2x2 on mobile, 4 columns on desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 shrink-0 print:hidden">
            <div className="p-3 bg-surface rounded-card border border-border">
              <p className="text-[11px] text-text-muted font-medium">Jumlah Periode Bulan</p>
              <p className="text-lg font-bold text-text-main tabular-nums mt-0.5">
                {monthlyRows.length} Bulan
              </p>
            </div>
            <div className="p-3 bg-surface rounded-card border border-border">
              <p className="text-[11px] text-text-muted font-medium">Akumulasi Tiket</p>
              <p className="text-lg font-bold text-text-main tabular-nums mt-0.5">
                {formatNumber(monthlyRows.reduce((acc, curr) => acc + curr.totalPermintaan, 0))}
              </p>
            </div>
            <div className="p-3 bg-surface rounded-card border border-border">
              <p className="text-[11px] text-text-muted font-medium">Tingkat Sukses Periode</p>
              <p className="text-lg font-bold text-success tabular-nums mt-0.5">
                {(() => {
                  const total = monthlyRows.reduce((acc, curr) => acc + curr.totalPermintaan, 0);
                  const selesai = monthlyRows.reduce((acc, curr) => acc + curr.totalSelesai, 0);
                  return total > 0 ? `${Math.round((selesai / total) * 100)}%` : '0%';
                })()}
              </p>
            </div>
            <div className="p-3 bg-surface rounded-card border border-border">
              <p className="text-[11px] text-text-muted font-medium">Total Distribusi Unit</p>
              <p className="text-lg font-bold text-primary tabular-nums mt-0.5">
                {formatNumber(monthlyRows.reduce((acc, curr) => acc + curr.totalUnit, 0))} unit
              </p>
            </div>
          </div>

          <DataTable
            columns={columnsMonthly}
            data={monthlyRows.slice((pageMonthly - 1) * 10, pageMonthly * 10)}
            exportData={monthlyRows}
            totalCount={monthlyRows.length}
            page={pageMonthly}
            pageSize={10}
            onPageChange={setPageMonthly}
            isLoading={isLoading}
            emptyMessage="Tidak ada data rekapitulasi pada rentang tanggal ini."
            csvFilename={`laporan_rekapitulasi_${formatDateShort(new Date()).replace(/\s+/g, '_')}.csv`}
            tableClassName="min-w-[900px]"
            enableDynamicHeight={true}
            className="flex-1 min-h-0"
          />
        </div>
      )}

      {/* --- MODUL 3: KONSUMSI & DISTRIBUSI BARANG --- */}
      {activeReport === 'konsumsi' && (
        <div className="flex-1 min-h-0 flex flex-col space-y-2.5">
          {/* Mini Summary Banner (4 balanced cards: 2x2 on mobile, 4 columns on desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 shrink-0 print:hidden">
            <div className="p-3 bg-surface rounded-card border border-border">
              <p className="text-[11px] text-text-muted font-medium">Total Unit Diminta</p>
              <p className="text-lg font-bold text-primary tabular-nums mt-0.5">
                {formatNumber(consumptionRows.reduce((acc, curr) => acc + curr.totalDiminta, 0))} unit
              </p>
            </div>
            <div className="p-3 bg-surface rounded-card border border-border">
              <p className="text-[11px] text-text-muted font-medium">Estimasi Pengeluaran</p>
              <p className="text-lg font-bold text-text-main tabular-nums mt-0.5">
                {formatRupiah(consumptionRows.reduce((acc, curr) => acc + curr.estimasiNilai, 0))}
              </p>
            </div>
            <div className="p-3 bg-surface rounded-card border border-border">
              <p className="text-[11px] text-text-muted font-medium">Rata-rata per Tiket</p>
              <p className="text-lg font-bold text-text-main tabular-nums mt-0.5">
                {(() => {
                  const totalQty = consumptionRows.reduce((acc, curr) => acc + curr.totalDiminta, 0);
                  const totalTiket = consumptionRows.reduce((acc, curr) => acc + curr.frekuensiTiket, 0);
                  return totalTiket > 0 ? `${(totalQty / totalTiket).toFixed(1)} unit` : '0 unit';
                })()}
              </p>
            </div>
            <div className="p-3 bg-surface rounded-card border border-border">
              <p className="text-[11px] text-text-muted font-medium">Barang Terpopuler</p>
              <p className="text-xs font-bold text-text-main truncate mt-1.5" title={consumptionRows[0]?.nama}>
                {consumptionRows[0]?.nama || '-'}
              </p>
            </div>
          </div>

          <DataTable
            columns={columnsConsumption}
            data={consumptionRows.slice((pageConsumption - 1) * 10, pageConsumption * 10)}
            exportData={consumptionRows}
            totalCount={consumptionRows.length}
            page={pageConsumption}
            pageSize={10}
            onPageChange={setPageConsumption}
            searchValue={itemSearch}
            onSearchChange={(val) => {
              setItemSearch(val);
              setPageConsumption(1);
            }}
            searchPlaceholder="Cari nama barang atau kode ATK..."
            isLoading={isLoading}
            emptyMessage="Tidak ada data konsumsi barang pada rentang tanggal ini."
            csvFilename={`laporan_konsumsi_${formatDateShort(new Date()).replace(/\s+/g, '_')}.csv`}
            tableClassName="min-w-[1020px]"
            enableDynamicHeight={true}
            className="flex-1 min-h-0"
          />
        </div>
      )}

      {/* --- MODUL 4: POSISI PERSEDIAAN FISIK & VALUASI --- */}
      {activeReport === 'persediaan' && (
        <div className="flex-1 min-h-0 flex flex-col space-y-2.5">
          {/* Mini Summary Banner (4 balanced cards: 2x2 on mobile, 4 columns on desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 shrink-0 print:hidden">
            <div className="p-3 bg-surface rounded-card border border-border">
              <p className="text-[11px] text-text-muted font-medium">Total Valuasi Fisik</p>
              <p className="text-lg font-bold text-text-main tabular-nums mt-0.5">
                {formatRupiah(rawItems.reduce((acc, curr) => acc + curr.stok * (curr.harga_satuan || 0), 0))}
              </p>
            </div>
            <div className="p-3 bg-surface rounded-card border border-border">
              <p className="text-[11px] text-text-muted font-medium">Total Jenis Barang</p>
              <p className="text-lg font-bold text-primary tabular-nums mt-0.5">
                {rawItems.length} SKU
              </p>
            </div>
            <div className="p-3 bg-surface rounded-card border border-border">
              <p className="text-[11px] text-text-muted font-medium">Stok Menipis</p>
              <p className="text-lg font-bold text-warning tabular-nums mt-0.5">
                {rawItems.filter((i) => i.stok > 0 && i.stok <= i.stok_minimum).length} Barang
              </p>
            </div>
            <div className="p-3 bg-surface rounded-card border border-border">
              <p className="text-[11px] text-text-muted font-medium">Stok Habis</p>
              <p className="text-lg font-bold text-danger tabular-nums mt-0.5">
                {rawItems.filter((i) => i.stok === 0).length} Barang
              </p>
            </div>
          </div>

          <DataTable
            columns={columnsStock}
            data={stockAuditRows.slice((pageStock - 1) * 10, pageStock * 10)}
            exportData={stockAuditRows}
            totalCount={stockAuditRows.length}
            page={pageStock}
            pageSize={10}
            onPageChange={setPageStock}
            searchValue={stockSearch}
            onSearchChange={(val) => {
              setStockSearch(val);
              setPageStock(1);
            }}
            searchPlaceholder="Cari kode atau nama barang fisik..."
            filterControls={
              <div className="inline-flex p-0.5 rounded-control bg-bg border border-border text-xs">
                {(['semua', 'kritis', 'normal'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setStockStatusFilter(st);
                      setPageStock(1);
                    }}
                    className={`px-2.5 py-1 rounded-badge text-[11px] capitalize transition-colors cursor-pointer ${
                      stockStatusFilter === st
                        ? 'bg-surface text-primary shadow-xs font-semibold'
                        : 'text-text-muted hover:text-text-main'
                    }`}
                  >
                    {st === 'kritis' ? 'Stok Kritis' : st}
                  </button>
                ))}
              </div>
            }
            isLoading={isLoading}
            emptyMessage="Katalog barang fisik kosong."
            csvFilename={`laporan_persediaan_${formatDateShort(new Date()).replace(/\s+/g, '_')}.csv`}
            tableClassName="min-w-[1040px]"
            enableDynamicHeight={true}
            className="flex-1 min-h-0"
          />
        </div>
      )}

      {/* --- DETAIL INSPECTOR MODAL: TRANSAKSI PERMINTAAN --- */}
      <Dialog
        isOpen={!!inspectedTx}
        onClose={() => setInspectedTx(null)}
        title="Rincian Tiket Permintaan"
        description="Dokumentasi lengkap transaksi permintaan ATK operasional."
        footer={
          <div className="flex justify-end w-full">
            <button
              type="button"
              onClick={() => setInspectedTx(null)}
              className="px-4 py-1.5 text-xs font-medium rounded-control bg-surface border border-border text-text-main hover:bg-border/20 transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        }
      >
        {inspectedTx && (
          <div className="space-y-3 py-1 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-control bg-bg border border-border">
              <div>
                <p className="font-mono font-bold text-primary text-sm">{inspectedTx.nomor}</p>
                <p className="text-text-muted mt-0.5">{formatDate(inspectedTx.created_at)}</p>
              </div>
              <Badge variant={inspectedTx.status} />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-control border border-border bg-surface">
                <span className="text-text-muted block text-[11px]">Divisi Pemohon</span>
                <span className="font-semibold text-text-main mt-0.5 block">{inspectedTx.pemohon}</span>
              </div>
              <div className="p-2.5 rounded-control border border-border bg-surface">
                <span className="text-text-muted block text-[11px]">Durasi Siklus</span>
                <span className="font-semibold text-text-main mt-0.5 block">
                  {inspectedTx.durasiJam !== null ? formatDuration(inspectedTx.durasiJam) : 'Sedang Diproses'}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-control border border-border bg-surface space-y-1">
              <span className="text-text-muted block text-[11px]">Barang yang Diajukan</span>
              <p className="font-semibold text-text-main text-sm">{inspectedTx.namaBarang}</p>
              <div className="flex items-center justify-between pt-1 text-text-muted font-mono">
                <span>{inspectedTx.kodeBarang} - {inspectedTx.kategoriBarang}</span>
                <span className="font-bold text-primary tabular-nums">
                  {inspectedTx.jumlah} {inspectedTx.satuan}
                </span>
              </div>
            </div>

            {inspectedTx.keperluan && (
              <div className="p-2.5 rounded-control border border-border bg-surface">
                <span className="text-text-muted block text-[11px]">Keperluan Penggunaan</span>
                <p className="text-text-main mt-0.5">{inspectedTx.keperluan}</p>
              </div>
            )}

            {inspectedTx.catatan && (
              <div className="p-2.5 rounded-control border border-border bg-surface">
                <span className="text-text-muted block text-[11px]">Catatan Serah Terima</span>
                <p className="text-text-main mt-0.5">{inspectedTx.catatan}</p>
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* --- DETAIL INSPECTOR MODAL: REKAPITULASI BULANAN --- */}
      <Dialog
        isOpen={!!inspectedMonthly}
        onClose={() => setInspectedMonthly(null)}
        title="Rincian Rekapitulasi Periode"
        description="Ringkasan performa pemenuhan tiket ATK pada periode bulan terpilih."
        footer={
          <div className="flex justify-end w-full">
            <button
              type="button"
              onClick={() => setInspectedMonthly(null)}
              className="px-4 py-1.5 text-xs font-medium rounded-control bg-surface border border-border text-text-main hover:bg-border/20 transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        }
      >
        {inspectedMonthly && (
          <div className="space-y-3 py-1 text-xs">
            <div className="p-2.5 rounded-control bg-bg border border-border">
              <p className="text-text-muted text-[11px]">Periode Evaluasi</p>
              <p className="font-bold text-text-main text-sm mt-0.5">{inspectedMonthly.periode}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-control border border-border bg-surface">
                <span className="text-text-muted block text-[11px]">Total Tiket Masuk</span>
                <span className="font-bold text-text-main text-base tabular-nums mt-0.5 block">
                  {inspectedMonthly.totalPermintaan} tiket
                </span>
              </div>
              <div className="p-2.5 rounded-control border border-border bg-surface">
                <span className="text-text-muted block text-[11px]">Tingkat Penyelesaian</span>
                <span className="font-bold text-success text-base tabular-nums mt-0.5 block">
                  {inspectedMonthly.persentaseSelesai}%
                </span>
              </div>
              <div className="p-2.5 rounded-control border border-border bg-surface">
                <span className="text-text-muted block text-[11px]">Selesai Diserahkan</span>
                <span className="font-semibold text-text-main tabular-nums mt-0.5 block">
                  {inspectedMonthly.totalSelesai} tiket
                </span>
              </div>
              <div className="p-2.5 rounded-control border border-border bg-surface">
                <span className="text-text-muted block text-[11px]">Rata-rata Waktu Siklus</span>
                <span className="font-semibold text-text-main tabular-nums mt-0.5 block">
                  {formatDuration(inspectedMonthly.rataWaktuJam)}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-control border border-border bg-surface flex items-center justify-between">
              <span className="text-text-muted text-[11px]">Akumulasi Unit ATK Terdistribusi</span>
              <span className="font-bold text-primary text-sm tabular-nums">
                {formatNumber(inspectedMonthly.totalUnit)} unit
              </span>
            </div>
          </div>
        )}
      </Dialog>

      {/* --- DETAIL INSPECTOR MODAL: KONSUMSI BARANG --- */}
      <Dialog
        isOpen={!!inspectedItem}
        onClose={() => setInspectedItem(null)}
        title="Distribusi Barang ATK"
        description="Analisis permintaan dan penyerahan barang pada rentang tanggal aktif."
        footer={
          <div className="flex justify-end w-full">
            <button
              type="button"
              onClick={() => setInspectedItem(null)}
              className="px-4 py-1.5 text-xs font-medium rounded-control bg-surface border border-border text-text-main hover:bg-border/20 transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        }
      >
        {inspectedItem && (
          <div className="space-y-3 py-1 text-xs">
            <div className="p-2.5 rounded-control bg-bg border border-border">
              <span className="font-mono text-primary text-[11px] font-semibold">{inspectedItem.kode}</span>
              <p className="font-bold text-text-main text-sm mt-0.5">{inspectedItem.nama}</p>
              <p className="text-text-muted mt-0.5">Kategori: {inspectedItem.kategori}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-control border border-border bg-surface">
                <span className="text-text-muted block text-[11px]">Total Kuantitas Diminta</span>
                <span className="font-bold text-primary text-base tabular-nums mt-0.5 block">
                  {formatNumber(inspectedItem.totalDiminta)} {inspectedItem.satuan}
                </span>
              </div>
              <div className="p-2.5 rounded-control border border-border bg-surface">
                <span className="text-text-muted block text-[11px]">Frekuensi Pengajuan</span>
                <span className="font-bold text-text-main text-base tabular-nums mt-0.5 block">
                  {inspectedItem.frekuensiTiket} kali
                </span>
              </div>
              <div className="p-2.5 rounded-control border border-border bg-surface">
                <span className="text-text-muted block text-[11px]">Rata-rata per Tiket</span>
                <span className="font-semibold text-text-main tabular-nums mt-0.5 block">
                  {inspectedItem.rataPerTiket} {inspectedItem.satuan}
                </span>
              </div>
              <div className="p-2.5 rounded-control border border-border bg-surface">
                <span className="text-text-muted block text-[11px]">Estimasi Nilai Distribusi</span>
                <span className="font-semibold text-text-main tabular-nums mt-0.5 block">
                  {formatRupiah(inspectedItem.estimasiNilai)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* --- DETAIL INSPECTOR MODAL: POSISI PERSEDIAAN --- */}
      <Dialog
        isOpen={!!inspectedStock}
        onClose={() => setInspectedStock(null)}
        title="Audit Persediaan Fisik ATK"
        description="Detail saldo stok fisik dan batas aman barang inventaris."
        footer={
          <div className="flex justify-end w-full">
            <button
              type="button"
              onClick={() => setInspectedStock(null)}
              className="px-4 py-1.5 text-xs font-medium rounded-control bg-surface border border-border text-text-main hover:bg-border/20 transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        }
      >
        {inspectedStock && (
          <div className="space-y-3 py-1 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-control bg-bg border border-border">
              <div>
                <span className="font-mono text-primary text-[11px] font-semibold">{inspectedStock.kode}</span>
                <p className="font-bold text-text-main text-sm mt-0.5">{inspectedStock.nama}</p>
                <p className="text-text-muted mt-0.5">Kategori: {inspectedStock.kategori}</p>
              </div>
              <Badge variant={inspectedStock.statusStok} />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-control border border-border bg-surface">
                <span className="text-text-muted block text-[11px]">Stok Fisik Tersedia</span>
                <span className={`font-bold text-base tabular-nums mt-0.5 block ${
                  inspectedStock.stok === 0 ? 'text-danger' : inspectedStock.stok <= inspectedStock.stok_minimum ? 'text-warning' : 'text-primary'
                }`}>
                  {inspectedStock.stok} {inspectedStock.satuan}
                </span>
              </div>
              <div className="p-2.5 rounded-control border border-border bg-surface">
                <span className="text-text-muted block text-[11px]">Batas Minimum Aman</span>
                <span className="font-bold text-text-main text-base tabular-nums mt-0.5 block">
                  {inspectedStock.stok_minimum} {inspectedStock.satuan}
                </span>
              </div>
              <div className="p-2.5 rounded-control border border-border bg-surface">
                <span className="text-text-muted block text-[11px]">Harga Satuan</span>
                <span className="font-semibold text-text-main tabular-nums mt-0.5 block">
                  {formatRupiah(inspectedStock.harga_satuan)}
                </span>
              </div>
              <div className="p-2.5 rounded-control border border-border bg-surface">
                <span className="text-text-muted block text-[11px]">Estimasi Total Nilai Aset</span>
                <span className="font-semibold text-text-main tabular-nums mt-0.5 block">
                  {formatRupiah(inspectedStock.totalValuasi)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </PageContainer>
  );
}
