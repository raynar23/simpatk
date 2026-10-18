// Admin Overview Dashboard with single-screen layout, responsive segmented control, and analytical RPCs
'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardKpis, type DashboardKpiData } from '@/components/admin/DashboardKpis';
import {
  DashboardCharts,
  type TrendDataPoint,
  type TopItemDataPoint,
  type StatusBreakdownPoint,
} from '@/components/admin/DashboardCharts';
import { DashboardPanels } from '@/components/admin/DashboardPanels';
import type { RequestWithDetails, Item } from '@/lib/types';

export default function AdminDashboardPage() {
  const supabase = createClient();

  const [period, setPeriod] = useState<number>(30); // 7, 30, 180
  const [activeTab, setActiveTab] = useState<'ringkasan' | 'analitik' | 'permintaan'>('ringkasan');
  const [isLoading, setIsLoading] = useState(true);

  const [kpiData, setKpiData] = useState<DashboardKpiData | null>(null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [topItemsData, setTopItemsData] = useState<TopItemDataPoint[]>([]);
  const [statusData, setStatusData] = useState<StatusBreakdownPoint[]>([]);
  const [recentRequests, setRecentRequests] = useState<RequestWithDetails[]>([]);
  const [criticalItems, setCriticalItems] = useState<Item[]>([]);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [kpiRes, trendRes, topRes, statusRes, reqRes, itemsRes] = await Promise.all([
          supabase.rpc('dashboard_kpi', { p_days: period }),
          supabase.rpc('request_trend', { p_days: period }),
          supabase.rpc('top_items', { p_days: period, p_limit: 5 }),
          supabase.rpc('status_breakdown', { p_days: period }),
          supabase
            .from('requests')
            .select('*, items(*), profiles(*)')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase.from('items').select('*').order('stok', { ascending: true }).limit(10),
        ]);

        if (ignore) return;

        if (kpiRes.data) setKpiData(kpiRes.data as unknown as DashboardKpiData);
        if (trendRes.data) setTrendData(trendRes.data as unknown as TrendDataPoint[]);
        if (topRes.data) setTopItemsData(topRes.data as unknown as TopItemDataPoint[]);
        if (statusRes.data) setStatusData(statusRes.data as unknown as StatusBreakdownPoint[]);
        if (reqRes.data) setRecentRequests(reqRes.data as RequestWithDetails[]);

        if (itemsRes.data) {
          const sorted = (itemsRes.data as Item[]).sort((a, b) => {
            const aRatio = a.stok / Math.max(1, a.stok_minimum);
            const bRatio = b.stok / Math.max(1, b.stok_minimum);
            return aRatio - bRatio;
          });
          setCriticalItems(sorted.slice(0, 6));
        }
      } catch {
        // Silent catch
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [supabase, period]);

  const handlePeriodChange = (days: number) => {
    setIsLoading(true);
    setPeriod(days);
  };

  const periodLabel = period === 7 ? '7 Hari' : period === 30 ? '30 Hari' : '6 Bulan';

  return (
    <div className="p-3 sm:p-5 space-y-4 max-w-[1440px] mx-auto select-none">
      {/* Page Toolbar with Period Selector and Mobile Segmented Control */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-text-main tracking-tight">
            Dashboard Pemantauan GA
          </h2>
          <p className="text-[11px] text-text-muted mt-0.5">
            Metrik operasional permintaan dan inventaris fisik alat tulis kantor
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Segmented Control for screens < 1280px */}
          <div className="xl:hidden inline-flex p-0.5 rounded-control bg-bg border border-border text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('ringkasan')}
              className={`px-2.5 py-1 rounded-badge text-[11px] font-medium transition-colors cursor-pointer ${
                activeTab === 'ringkasan'
                  ? 'bg-surface text-text-main shadow-xs font-semibold'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              Ringkasan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analitik')}
              className={`px-2.5 py-1 rounded-badge text-[11px] font-medium transition-colors cursor-pointer ${
                activeTab === 'analitik'
                  ? 'bg-surface text-text-main shadow-xs font-semibold'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              Analitik
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('permintaan')}
              className={`px-2.5 py-1 rounded-badge text-[11px] font-medium transition-colors cursor-pointer ${
                activeTab === 'permintaan'
                  ? 'bg-surface text-text-main shadow-xs font-semibold'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              Permintaan & Stok
            </button>
          </div>

          {/* Period Selector (7 Hari | 30 Hari | 6 Bulan) */}
          <div className="inline-flex p-0.5 rounded-control bg-bg border border-border text-xs">
            {[
              { days: 7, label: '7 Hari' },
              { days: 30, label: '30 Hari' },
              { days: 180, label: '6 Bulan' },
            ].map((opt) => (
              <button
                key={opt.days}
                type="button"
                onClick={() => handlePeriodChange(opt.days)}
                className={`px-2.5 py-1 rounded-badge text-[11px] font-medium transition-colors cursor-pointer ${
                  period === opt.days
                    ? 'bg-surface text-primary shadow-xs font-semibold'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Screen Viewport >= 1280px: Renders all 3 rows together to fit one screen */}
      <div className="hidden xl:space-y-3 xl:block">
        {/* Row 1: 5 KPI Cards */}
        <DashboardKpis data={kpiData} isLoading={isLoading} periodLabel={periodLabel} />

        {/* Row 2: 3 Recharts Visualizations */}
        <DashboardCharts
          trendData={trendData}
          topItemsData={topItemsData}
          statusData={statusData}
          isLoading={isLoading}
          periodDays={period}
        />

        {/* Row 3: Recent Requests & Stock Health */}
        <DashboardPanels
          recentRequests={recentRequests}
          criticalItems={criticalItems}
          isLoading={isLoading}
        />
      </div>

      {/* Screen Viewport < 1280px: Controlled by Segmented Control tabs */}
      <div className="xl:hidden">
        {activeTab === 'ringkasan' && (
          <div className="space-y-4">
            <DashboardKpis data={kpiData} isLoading={isLoading} periodLabel={periodLabel} />
            <DashboardPanels
              recentRequests={recentRequests}
              criticalItems={criticalItems}
              isLoading={isLoading}
            />
          </div>
        )}

        {activeTab === 'analitik' && (
          <DashboardCharts
            trendData={trendData}
            topItemsData={topItemsData}
            statusData={statusData}
            isLoading={isLoading}
            periodDays={period}
          />
        )}

        {activeTab === 'permintaan' && (
          <DashboardPanels
            recentRequests={recentRequests}
            criticalItems={criticalItems}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
