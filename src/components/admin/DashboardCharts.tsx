// Three Recharts visualization panels for Admin GA dashboard
'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ChartCard } from '@/components/ui/ChartCard';

export interface TrendDataPoint {
  label: string;
  tanggal: string;
  total_current: number;
  total_previous: number;
}

export interface TopItemDataPoint {
  item_id: string;
  kode: string;
  nama: string;
  kategori: string;
  satuan: string;
  total_diminta: number;
  total_frekuensi: number;
}

export interface StatusBreakdownPoint {
  status: string;
  jumlah: number;
  persentase: number;
}

interface DashboardChartsProps {
  trendData: TrendDataPoint[];
  topItemsData: TopItemDataPoint[];
  statusData: StatusBreakdownPoint[];
  isLoading: boolean;
  periodDays: number;
}

const STATUS_COLORS: Record<string, string> = {
  diproses: '#D97706', // Amber-600
  selesai: '#16A34A',  // Green-600
};

export function DashboardCharts({
  trendData,
  topItemsData,
  statusData,
  isLoading,
  periodDays,
}: DashboardChartsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="h-[260px] bg-surface rounded-card border border-border p-4 animate-pulse flex flex-col justify-between"
          >
            <div className="h-4 w-32 bg-border/60 rounded-badge" />
            <div className="h-36 w-full bg-border/30 rounded-badge" />
            <div className="h-3 w-48 bg-border/40 rounded-badge" />
          </div>
        ))}
      </div>
    );
  }

  // Calculate total for status chart center label
  const totalStatusRequests = statusData.reduce((acc, curr) => acc + Number(curr.jumlah), 0);

  // Shorten item name for horizontal bar chart y-axis
  const formattedTopItems = topItemsData.map((item) => ({
    ...item,
    displayName: item.nama.length > 18 ? item.nama.slice(0, 16) + '...' : item.nama,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* 1. Tren Permintaan (LineChart) */}
      <ChartCard
        title="Tren Permintaan"
        subtitle={periodDays <= 30 ? 'Volume harian vs periode sebelumnya' : 'Volume bulanan vs periode sebelumnya'}
      >
        <div className="w-full h-[190px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#64748B' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const curr = payload[0]?.value;
                  const prev = payload[1]?.value;
                  return (
                    <div className="bg-surface border border-border p-2 rounded-control shadow-modal text-[11px] select-none">
                      <p className="font-semibold text-text-main mb-1">
                        {payload[0]?.payload?.label}
                      </p>
                      <div className="flex items-center gap-2 text-primary">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        <span>Periode Ini: {curr}</span>
                      </div>
                      <div className="flex items-center gap-2 text-text-muted mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        <span>Sebelumnya: {prev}</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="total_current"
                stroke="#005B9C"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: '#005B9C', strokeWidth: 1, fill: '#FFFFFF' }}
              />
              <Line
                type="monotone"
                dataKey="total_previous"
                stroke="#94A3B8"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-4 text-[11px] text-text-muted pt-2 border-t border-border/40 select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-primary" />
            <span>Periode Ini</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-b border-dashed border-slate-400" />
            <span>Periode Sebelumnya</span>
          </div>
        </div>
      </ChartCard>

      {/* 2. Top 5 Barang Diminta (Horizontal BarChart) */}
      <ChartCard
        title="Top 5 Barang Paling Diminta"
        subtitle="Akumulasi kuantitas permintaan periode ini"
      >
        <div className="w-full h-[190px]">
          {formattedTopItems.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-text-muted">
              Tidak ada data barang diminta
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={formattedTopItems}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                />
                <YAxis
                  type="category"
                  dataKey="displayName"
                  tick={{ fontSize: 10, fill: '#334155' }}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload as TopItemDataPoint;
                    return (
                      <div className="bg-surface border border-border p-2 rounded-control shadow-modal text-[11px] select-none">
                        <p className="font-semibold text-text-main">{item.nama}</p>
                        <p className="text-[10px] text-text-muted font-mono">{item.kode} • {item.kategori}</p>
                        <div className="mt-1 pt-1 border-t border-border flex items-center justify-between gap-3 text-text-main">
                          <span>Total Diminta:</span>
                          <span className="font-semibold">{item.total_diminta} {item.satuan}</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="total_diminta"
                  fill="#005B9C"
                  radius={[0, 4, 4, 0]}
                  barSize={14}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </ChartCard>

      {/* 3. Status Permintaan (Donut PieChart) */}
      <ChartCard
        title="Status Permintaan"
        subtitle="Rasio penyelesaian permintaan saat ini"
      >
        <div className="w-full h-[190px] relative flex items-center justify-center">
          {totalStatusRequests === 0 ? (
            <div className="text-xs text-text-muted">Tidak ada data permintaan</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="jumlah"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={3}
                  >
                    {statusData.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLORS[entry.status] || '#64748B'}
                        stroke="#FFFFFF"
                        strokeWidth={1.5}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as StatusBreakdownPoint;
                      const label = d.status === 'selesai' ? 'Selesai' : 'Diproses';
                      return (
                        <div className="bg-surface border border-border p-2 rounded-control shadow-modal text-[11px] select-none">
                          <p className="font-semibold text-text-main">{label}</p>
                          <p className="text-text-muted">
                            {d.jumlah} permintaan ({d.persentase}%)
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                <span className="text-xs text-text-muted leading-tight">Total</span>
                <span className="text-lg font-bold text-text-main tabular-nums leading-tight">
                  {totalStatusRequests}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Status Legend */}
        <div className="flex items-center justify-around gap-2 text-xs pt-2 border-t border-border/40 select-none">
          {statusData.map((st) => {
            const isDone = st.status === 'selesai';
            const colorClass = isDone ? 'text-success' : 'text-warning';
            const dotBg = isDone ? 'bg-success' : 'bg-warning';
            return (
              <div key={st.status} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${dotBg} shrink-0`} />
                <span className="capitalize">{isDone ? 'Selesai' : 'Diproses'}:</span>
                <span className={`font-semibold tabular-nums ${colorClass}`}>
                  {st.jumlah} ({st.persentase}%)
                </span>
              </div>
            );
          })}
        </div>
      </ChartCard>
    </div>
  );
}
