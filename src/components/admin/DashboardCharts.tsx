// Four flat Recharts visualizations for Admin GA Dashboard conforming to strict D2-3B rules
'use client';

import React, { useMemo } from 'react';
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
  LabelList,
} from 'recharts';
import { ChartCard } from '@/components/ui/ChartCard';
import type { Item } from '@/lib/types';

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
  criticalItems: Item[];
  isLoading: boolean;
  periodDays: number;
  chartVariant?: 'all' | 'overview-only' | 'analytics-only';
}

export function DashboardCharts({
  trendData,
  topItemsData,
  statusData,
  criticalItems,
  isLoading,
  periodDays,
  chartVariant = 'all',
}: DashboardChartsProps) {
  // Mobile detection for responsive chart widths
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Bucketing logic for Trend Chart: directly use pre-computed points or max 14 points
  const bucketedTrendData = useMemo(() => {
    if (!trendData || trendData.length === 0) return [];
    if (trendData.length <= 14) return trendData;
    return trendData.slice(-14);
  }, [trendData]);


  // Total requests for Donut center
  const totalStatusRequests = useMemo(() => {
    return statusData.reduce((acc, curr) => acc + Number(curr.jumlah), 0);
  }, [statusData]);

  // 8 most critical items for Paired Bar Chart (Stok vs Batas Minimum)
  const pairedStockData = useMemo(() => {
    return criticalItems.slice(0, 8).map((it) => ({
      id: it.id,
      kode: it.kode || 'ATK',
      nama: it.nama,
      satuan: it.satuan,
      stok: it.stok,
      stok_minimum: it.stok_minimum,
      isDanger: it.stok <= it.stok_minimum,
    }));
  }, [criticalItems]);

  if (isLoading) {
    const cardCount = chartVariant === 'all' ? 4 : 2;
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-3.5`}>
        {Array.from({ length: cardCount }).map((_, idx) => (
          <div
            key={idx}
            className="h-[290px] bg-surface rounded-card border border-border p-4 animate-pulse flex flex-col justify-between"
          >
            <div className="h-4 w-36 bg-border/60 rounded-badge" />
            <div className="h-44 w-full bg-border/30 rounded-badge" />
            <div className="h-3 w-48 bg-border/40 rounded-badge" />
          </div>
        ))}
      </div>
    );
  }

  // --- Chart (a): Tren Permintaan ---
  const renderTrendChart = () => (
    <ChartCard
      title="Tren Permintaan"
      subtitle={
        periodDays <= 7
          ? 'Volume harian vs periode sebelumnya'
          : periodDays <= 35
          ? 'Volume per 3 hari vs periode sebelumnya'
          : periodDays <= 100
          ? 'Volume mingguan vs periode sebelumnya'
          : 'Volume bulanan vs periode sebelumnya'
      }
      className="min-w-[300px]"
    >
      <div className="w-full h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={bucketedTrendData} margin={{ top: 12, right: 16, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: '#64748B' }}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
            />
            <YAxis
              allowDecimals={false}
              tickCount={6}
              tick={{ fontSize: 12, fill: '#64748B' }}
              tickLine={false}
              axisLine={false}
            />
            <RechartsTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const curr = payload[0]?.value;
                const prev = payload[1]?.value;
                return (
                  <div className="bg-surface border border-border p-2.5 rounded-control shadow-modal text-xs select-none">
                    <p className="font-semibold text-text-main mb-1.5">
                      {payload[0]?.payload?.label}
                    </p>
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <span>Periode Ini: {curr} transaksi</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-muted mt-1">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span>Sebelumnya: {prev} transaksi</span>
                    </div>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="total_current"
              name="Periode Ini"
              stroke="#1175BB"
              strokeWidth={2}
              dot={{ r: 2.5, fill: '#1175BB' }}
              activeDot={{ r: 4, stroke: '#1175BB', strokeWidth: 1, fill: '#FFFFFF' }}
            />
            <Line
              type="monotone"
              dataKey="total_previous"
              name="Periode Sebelumnya"
              stroke="#94A3B8"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={{ r: 2, fill: '#94A3B8' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-5 text-xs text-text-muted pt-2.5 border-t border-border/40 select-none">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-0.5 bg-primary" />
          <span>Periode Ini</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-0.5 border-b-2 border-dashed border-slate-400" />
          <span>Periode Sebelumnya</span>
        </div>
      </div>
    </ChartCard>
  );


  // --- Chart (b): Top 5 Barang Paling Diminta (Full 1 Baris) ---
  const renderTopItemsChart = () => (
    <ChartCard
      title="Top 5 Barang Paling Diminta"
      subtitle="Kuantitas akumulasi permintaan pada periode terpilih (1 baris penuh)"
      className="w-full"
    >
      <div className="w-full h-[155px]">
        {topItemsData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-text-muted">
            Tidak ada data barang diminta
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topItemsData.slice(0, 5)}
              layout="vertical"
              margin={{ top: 6, right: 48, left: isMobile ? 0 : 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis
                type="number"
                tickCount={6}
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                type="category"
                dataKey="nama"
                tick={{ fontSize: isMobile ? 10 : 12, fill: '#334155' }}
                tickLine={false}
                axisLine={false}
                width={isMobile ? 130 : 260}
                tickFormatter={(val: string) => (isMobile && val.length > 16 ? `${val.slice(0, 16)}...` : val)}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload as TopItemDataPoint;
                  return (
                    <div className="bg-surface border border-border p-2.5 rounded-control shadow-modal text-xs select-none">
                      <p className="font-semibold text-text-main">{item.nama}</p>
                      <p className="text-[11px] text-text-muted font-mono">{item.kode} - {item.kategori}</p>
                      <div className="mt-1.5 pt-1.5 border-t border-border flex items-center justify-between gap-4 text-text-main">
                        <span>Total Diminta:</span>
                        <span className="font-semibold tabular-nums">{item.total_diminta} {item.satuan}</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="total_diminta"
                fill="#1175BB"
                radius={[0, 4, 4, 0]}
                barSize={15}
              >
                <LabelList
                  dataKey="total_diminta"
                  position="right"
                  style={{ fontSize: 12, fill: '#334155', fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-border/40 select-none px-2">
        <span>Diurutkan berdasarkan total unit yang diajukan</span>
        <span className="text-[11px] font-mono">Format Lebar Penuh (Nama Lengkap)</span>
      </div>
    </ChartCard>
  );

  // --- Chart (c): Status Permintaan (Donut / Pie Chart) ---
  const renderStatusChart = () => (
    <ChartCard
      title="Status Permintaan"
      subtitle="Komposisi penyelesaian alur serah terima"
      className="min-w-[300px]"
    >
      <div className="w-full h-[180px] relative flex items-center justify-center">
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
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {statusData.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={entry.status === 'selesai' ? '#1175BB' : '#9CC9EA'}
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
                      <div className="bg-surface border border-border p-2.5 rounded-control shadow-modal text-xs select-none">
                        <p className="font-semibold text-text-main">{label}</p>
                        <p className="text-text-muted mt-0.5">
                          {d.jumlah} permintaan ({d.persentase}%)
                        </p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Total count in donut center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              <span className="text-[10px] text-text-muted uppercase tracking-wider">Total</span>
              <span className="text-lg font-bold text-text-main tabular-nums leading-tight">
                {totalStatusRequests}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Legend outside plot area */}
      <div className="flex items-center justify-around gap-2 text-xs pt-2 border-t border-border/40 select-none">
        {statusData.map((st) => {
          const isDone = st.status === 'selesai';
          const colorDot = isDone ? 'bg-[#1175BB]' : 'bg-[#9CC9EA]';
          return (
            <div key={st.status} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${colorDot} shrink-0`} />
              <span>{isDone ? 'Selesai' : 'Diproses'}:</span>
              <span className="font-semibold tabular-nums text-text-main">
                {st.jumlah} ({st.persentase}%)
              </span>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );

  // --- Chart (d): Stok vs Batas Minimum (Paired Bar) ---
  const renderStockVersusMinimumChart = () => (
    <ChartCard
      title="Stok vs Batas Minimum"
      subtitle="Perbandingan stok fisik terhadap batas aman 8 barang paling kritis"
      className="min-w-[300px]"
    >
      <div className="w-full h-[220px]">
        {pairedStockData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-text-muted">
            Tidak ada data persediaan
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={pairedStockData}
              margin={{ top: 12, right: 16, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="kode"
                tick={{ fontSize: 11, fill: '#334155' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                allowDecimals={false}
                tickCount={6}
                tick={{ fontSize: 12, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload as typeof pairedStockData[0];
                  return (
                    <div className="bg-surface border border-border p-2.5 rounded-control shadow-modal text-xs select-none">
                      <p className="font-semibold text-text-main">{item.nama}</p>
                      <p className="text-[11px] text-text-muted font-mono">{item.kode}</p>
                      <div className="mt-1.5 pt-1.5 border-t border-border space-y-1 text-text-main">
                        <div className="flex items-center justify-between gap-4">
                          <span className={item.isDanger ? 'text-danger font-semibold' : ''}>
                            Stok Fisik:
                          </span>
                          <span className={`tabular-nums font-semibold ${item.isDanger ? 'text-danger' : 'text-primary'}`}>
                            {item.stok} {item.satuan}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-text-muted">
                          <span>Batas Minimum:</span>
                          <span className="tabular-nums">{item.stok_minimum} {item.satuan}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="stok" name="Stok Fisik" barSize={12} radius={[3, 3, 0, 0]}>
                {pairedStockData.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={entry.isDanger ? '#D32F2F' : '#1175BB'}
                  />
                ))}
              </Bar>
              <Bar
                dataKey="stok_minimum"
                name="Batas Minimum"
                fill="#94A3B8"
                barSize={12}
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend outside plot area */}
      <div className="flex items-center justify-center gap-5 text-xs text-text-muted pt-2.5 border-t border-border/40 select-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#1175BB]" />
          <span>Stok Fisik (Merah jika &lt;= Minimum)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#94A3B8]" />
          <span>Batas Minimum</span>
        </div>
      </div>
    </ChartCard>
  );

  // 3-Chart Architecture: Row 1 = Line + Pie, Row 2 = Top 5 Bar full width
  if (chartVariant === 'analytics-only') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {renderStatusChart()}
        {renderStockVersusMinimumChart()}
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      {/* Row 1: Tren Permintaan (Line) & Status Permintaan (Pie Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {renderTrendChart()}
        {renderStatusChart()}
      </div>

      {/* Row 2: Top 5 Barang (Full 1 Baris) */}
      <div className="w-full">
        {renderTopItemsChart()}
      </div>
    </div>
  );
}
