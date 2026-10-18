// Dashboard KPI metric cards row for Admin GA
'use client';

import React from 'react';
import {
  ClipboardList,
  Clock,
  Hourglass,
  AlertTriangle,
  Banknote,
} from 'lucide-react';
import { KpiCard } from '@/components/ui/KpiCard';
import { formatRupiah } from '@/lib/utils';

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

  // Format turnaround time
  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)} mnt`;
    if (hours < 24) return `${hours.toFixed(1)} jam`;
    return `${(hours / 24).toFixed(1)} hari`;
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {/* 1. Total Permintaan */}
      <KpiCard
        label="Total Permintaan"
        value={data.total_permintaan.toLocaleString('id-ID')}
        icon={ClipboardList}
        change={requestChange}
        sublabel={`vs ${periodLabel} sebelumnya`}
      />

      {/* 2. Menunggu Penyelesaian */}
      <KpiCard
        label="Menunggu Penyelesaian"
        value={data.permintaan_diproses.toLocaleString('id-ID')}
        icon={Hourglass}
        invertTrend={true}
        sublabel="Permintaan status diproses"
      />

      {/* 3. Rata-rata Waktu */}
      <KpiCard
        label="Rata-rata Waktu"
        value={formatDuration(data.rata_rata_waktu_jam)}
        icon={Clock}
        change={timeChange !== 0 ? timeChange : undefined}
        invertTrend={true}
        sublabel={`Tingkat selesai ${data.tingkat_penyelesaian_persen}%`}
      />

      {/* 4. Stok Menipis */}
      <KpiCard
        label="Barang Menipis"
        value={data.barang_menipis.toLocaleString('id-ID')}
        icon={AlertTriangle}
        invertTrend={true}
        sublabel={`${data.barang_habis} barang stok habis (0)`}
      />

      {/* 5. Nilai Persediaan */}
      <KpiCard
        label="Nilai Persediaan"
        value={formatRupiah(data.nilai_persediaan)}
        icon={Banknote}
        sublabel="Estimasi aset fisik ATK"
        className="col-span-2 sm:col-span-1"
      />
    </div>
  );
}
