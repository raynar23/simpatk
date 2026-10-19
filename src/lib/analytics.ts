// Client-side analytics calculation engine guaranteeing 100% reactive synchronization
// across KPIs, Tren Permintaan line chart, Status Permintaan donut chart, and Top 5 Barang chart.

import type { RequestWithDetails, Item } from '@/lib/types';
import type { DashboardKpiData } from '@/components/admin/DashboardKpis';
import type {
  TrendDataPoint,
  TopItemDataPoint,
  StatusBreakdownPoint,
} from '@/components/admin/DashboardCharts';

export interface CalculatedAnalytics {
  kpiData: DashboardKpiData;
  trendData: TrendDataPoint[];
  statusData: StatusBreakdownPoint[];
  topItemsData: TopItemDataPoint[];
}

export function calculateDashboardAnalytics(
  startDate: Date,
  endDate: Date,
  allRequests: RequestWithDetails[],
  allItems: Item[]
): CalculatedAnalytics {
  const durationMs = endDate.getTime() - startDate.getTime() + 1;
  const daysDiff = Math.max(1, Math.round(durationMs / 86400000));

  // Previous comparison period
  const prevEndDate = new Date(startDate.getTime() - 1);
  const prevStartDate = new Date(prevEndDate.getTime() - durationMs + 1);

  // Filter requests for current period and previous period
  const currentRequests = allRequests.filter((r) => {
    const t = new Date(r.created_at).getTime();
    return t >= startDate.getTime() && t <= endDate.getTime();
  });

  const prevRequests = allRequests.filter((r) => {
    const t = new Date(r.created_at).getTime();
    return t >= prevStartDate.getTime() && t <= prevEndDate.getTime();
  });

  // 1. KPI Calculations
  const total_permintaan = currentRequests.length;
  const total_permintaan_sebelumnya = prevRequests.length;

  const permintaan_diproses = currentRequests.filter((r) => r.status === 'diproses').length;
  const permintaan_selesai = currentRequests.filter((r) => r.status === 'selesai').length;

  // Average turnaround time (in hours) for completed requests
  const completedCurrent = currentRequests.filter((r) => r.status === 'selesai' && r.completed_at);
  const totalDurationHours = completedCurrent.reduce((acc, r) => {
    const duration = (new Date(r.completed_at!).getTime() - new Date(r.created_at).getTime()) / 3600000;
    return acc + Math.max(0, duration);
  }, 0);
  const rata_rata_waktu_jam = completedCurrent.length > 0 ? totalDurationHours / completedCurrent.length : 0;

  const completedPrev = prevRequests.filter((r) => r.status === 'selesai' && r.completed_at);
  const totalDurationHoursPrev = completedPrev.reduce((acc, r) => {
    const duration = (new Date(r.completed_at!).getTime() - new Date(r.created_at).getTime()) / 3600000;
    return acc + Math.max(0, duration);
  }, 0);
  const rata_rata_waktu_jam_sebelumnya = completedPrev.length > 0 ? totalDurationHoursPrev / completedPrev.length : 0;

  const tingkat_penyelesaian_persen =
    total_permintaan > 0 ? Number(((permintaan_selesai / total_permintaan) * 100).toFixed(1)) : 0;

  // Inventory stock KPIs
  const barang_menipis = allItems.filter((i) => i.stok <= i.stok_minimum).length;
  const barang_habis = allItems.filter((i) => i.stok === 0).length;
  const total_stok_fisik = allItems.reduce(
    (acc, i) => acc + Number(i.stok || 0),
    0
  );

  const kpiData: DashboardKpiData = {
    total_permintaan,
    total_permintaan_sebelumnya,
    permintaan_diproses,
    permintaan_selesai,
    rata_rata_waktu_jam: Number(rata_rata_waktu_jam.toFixed(1)),
    rata_rata_waktu_jam_sebelumnya: Number(rata_rata_waktu_jam_sebelumnya.toFixed(1)),
    tingkat_penyelesaian_persen,
    barang_menipis,
    barang_habis,
    total_stok_fisik,
    nilai_persediaan: total_stok_fisik,
  };

  // 2. Status Breakdown (Donut Chart)
  let statusData: StatusBreakdownPoint[] = [];
  if (total_permintaan > 0) {
    statusData = [
      {
        status: 'selesai',
        jumlah: permintaan_selesai,
        persentase: Number(((permintaan_selesai / total_permintaan) * 100).toFixed(1)),
      },
      {
        status: 'diproses',
        jumlah: permintaan_diproses,
        persentase: Number(((permintaan_diproses / total_permintaan) * 100).toFixed(1)),
      },
    ];
  } else {
    statusData = [];
  }

  // 3. Top 5 Items Demanded (Horizontal Bar Chart)
  const itemDemands = new Map<
    string,
    {
      item_id: string;
      kode: string;
      nama: string;
      kategori: string;
      satuan: string;
      total_diminta: number;
      total_frekuensi: number;
    }
  >();

  for (const req of currentRequests) {
    if (!req.item_id) continue;
    const itemDetails = (req as unknown as { items?: Item }).items || allItems.find((it) => it.id === req.item_id);
    const existing = itemDemands.get(req.item_id);

    const qty = Number(req.jumlah || 0);

    if (existing) {
      existing.total_diminta += qty;
      existing.total_frekuensi += 1;
    } else {
      itemDemands.set(req.item_id, {
        item_id: req.item_id,
        kode: itemDetails?.kode || 'ATK',
        nama: itemDetails?.nama || 'Barang ATK',
        kategori: itemDetails?.kategori || 'Umum',
        satuan: itemDetails?.satuan || 'unit',
        total_diminta: qty,
        total_frekuensi: 1,
      });
    }
  }

  const topItemsData: TopItemDataPoint[] = Array.from(itemDemands.values())
    .sort((a, b) => b.total_diminta - a.total_diminta || b.total_frekuensi - a.total_frekuensi)
    .slice(0, 5);

  // 4. Trend Bucketing (Line Chart)
  let numBuckets = 10;
  if (daysDiff <= 10) {
    numBuckets = daysDiff;
  } else if (daysDiff <= 35) {
    numBuckets = Math.min(10, Math.ceil(daysDiff / 3));
  } else if (daysDiff <= 90) {
    numBuckets = Math.min(10, Math.ceil(daysDiff / 7));
  } else if (daysDiff <= 210) {
    numBuckets = 6; // 6 monthly points for ~6 months
  } else {
    numBuckets = 12; // 12 monthly points for 1 year or more
  }

  const bucketSpanMs = durationMs / numBuckets;
  const trendData: TrendDataPoint[] = [];

  for (let i = 0; i < numBuckets; i++) {
    const bStartMs = startDate.getTime() + i * bucketSpanMs;
    const bEndMs =
      i === numBuckets - 1 ? endDate.getTime() : startDate.getTime() + (i + 1) * bucketSpanMs - 1;

    const prevBStartMs = prevStartDate.getTime() + i * bucketSpanMs;
    const prevBEndMs =
      i === numBuckets - 1 ? prevEndDate.getTime() : prevStartDate.getTime() + (i + 1) * bucketSpanMs - 1;

    const bStartDate = new Date(bStartMs);

    let label = '';
    if (daysDiff <= 10) {
      label = new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: '2-digit',
        timeZone: 'Asia/Jakarta',
      }).format(bStartDate);
    } else if (daysDiff <= 45) {
      label = new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: '2-digit',
        timeZone: 'Asia/Jakarta',
      }).format(bStartDate);
    } else if (daysDiff <= 365) {
      label = new Intl.DateTimeFormat('id-ID', {
        month: 'short',
        timeZone: 'Asia/Jakarta',
      }).format(bStartDate);
    } else {
      label = new Intl.DateTimeFormat('id-ID', {
        month: 'short',
        year: '2-digit',
        timeZone: 'Asia/Jakarta',
      }).format(bStartDate);
    }

    const currentCount = currentRequests.filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= bStartMs && t <= bEndMs;
    }).length;

    const prevCount = prevRequests.filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= prevBStartMs && t <= prevBEndMs;
    }).length;

    trendData.push({
      label,
      tanggal: bStartDate.toISOString(),
      total_current: currentCount,
      total_previous: prevCount,
    });
  }

  return {
    kpiData,
    trendData,
    statusData,
    topItemsData,
  };
}
