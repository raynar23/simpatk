// Dashboard KPI metric cards row for Admin GA
'use client';

import React from 'react';
import { KpiCard } from '@/components/ui/KpiCard';
import { formatRupiah, formatNumber, formatDuration } from '@/lib/utils';

export interface DashboardKpiData {
  total_permintaan: number;
  total_permintaan_sebelumnya: number;
  permintaan_diproses: number;
  permintaan_selesai: number;
  rata_rata_waktu_jam: number;
  rata_rata_waktu_jam_sebelumnya: number;
  tingkat_penyelesaian_persen: number;
  barang_menipis: number;
  barang_habis: number;
  nilai_persediaan: number;
}

interface DashboardKpisProps {
  data: DashboardKpiData | null;
  isLoading: boolean;
  periodLabel: string;
}

export function DashboardKpis({ data, isLoading, periodLabel }: DashboardKpisProps) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="h-[104px] bg-surface rounded-card border border-border p-4 animate-pulse flex flex-col justify-between"
          >
            <div className="h-3 w-24 bg-border/60 rounded-badge" />
            <div className="h-6 w-16 bg-border/80 rounded-badge" />
            <div className="h-2.5 w-32 bg-border/40 rounded-badge" />
          </div>
        ))}
      </div>
    );
  }

  // Calculate percentage change for total requests
  const prevTotal = data.total_permintaan_sebelumnya || 0;
  const currentTotal = data.total_permintaan || 0;
  const requestChange =
    prevTotal > 0
      ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100)
      : currentTotal > 0
      ? 100
      : 0;

  // Calculate percentage change for turnaround time
  const prevTime = data.rata_rata_waktu_jam_sebelumnya || 0;
  const currentTime = data.rata_rata_waktu_jam || 0;
  const timeChange =
    prevTime > 0
      ? Math.round(((currentTime - prevTime) / prevTime) * 100)
      : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {/* 1. Total Permintaan */}
      <KpiCard
        label="Total Permintaan"
        value={formatNumber(data.total_permintaan)}
        change={requestChange}
        sublabel={`vs ${periodLabel} sebelumnya`}
      />

      {/* 2. Menunggu Penyelesaian */}
      <KpiCard
        label="Menunggu Penyelesaian"
        value={formatNumber(data.permintaan_diproses)}
        invertTrend={true}
        sublabel="Permintaan status diproses"
      />

      {/* 3. Rata-rata Waktu */}
      <KpiCard
        label="Rata-rata Waktu"
        value={formatDuration(data.rata_rata_waktu_jam)}
        change={timeChange !== 0 ? timeChange : undefined}
        invertTrend={true}
        sublabel={`Tingkat selesai ${data.tingkat_penyelesaian_persen}%`}
      />

      {/* 4. Stok Menipis */}
      <KpiCard
        label="Barang Menipis"
        value={formatNumber(data.barang_menipis)}
        invertTrend={true}
        sublabel={`${data.barang_habis} barang habis`}
      />

      {/* 5. Nilai Persediaan */}
      <KpiCard
        label="Nilai Persediaan"
        value={formatRupiah(data.nilai_persediaan)}
        sublabel="Estimasi aset fisik ATK"
        className="col-span-2 sm:col-span-1"
      />
    </div>
  );
}
