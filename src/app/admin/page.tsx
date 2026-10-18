// Admin GA Dashboard with 100% synchronized date filtering, 3 flat charts, and uniform PageContainer
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Boxes,
  ClipboardList,
  ArrowUpDown,
  Layers,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageContainer } from '@/components/layout/PageContainer';
import { DashboardKpis, type DashboardKpiData } from '@/components/admin/DashboardKpis';
import {
  DashboardCharts,
  type TrendDataPoint,
  type TopItemDataPoint,
  type StatusBreakdownPoint,
} from '@/components/admin/DashboardCharts';
import { DashboardPanels } from '@/components/admin/DashboardPanels';
import {
  DashboardDateFilter,
  type DateFilterRange,
  getPresetRange,
} from '@/components/admin/DashboardDateFilter';
import { calculateDashboardAnalytics } from '@/lib/analytics';
import type { RequestWithDetails, Item } from '@/lib/types';

export default function AdminDashboardPage() {
  const supabase = createClient();

  // Active date range state (defaults to 30 days)
  const [dateRange, setDateRange] = useState<DateFilterRange>(() => getPresetRange('30d'));
  const [activeTab, setActiveTab] = useState<'ringkasan' | 'aktivitas'>('ringkasan');
  const [isLoading, setIsLoading] = useState(true);

  // Synchronized analytical state
  const [kpiData, setKpiData] = useState<DashboardKpiData | null>(null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [topItemsData, setTopItemsData] = useState<TopItemDataPoint[]>([]);
  const [statusData, setStatusData] = useState<StatusBreakdownPoint[]>([]);
  const [recentRequests, setRecentRequests] = useState<RequestWithDetails[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);

  // Fetch and calculate dashboard data based on active date range
  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const durationMs = dateRange.endDate.getTime() - dateRange.startDate.getTime() + 1;
        const prevEndDate = new Date(dateRange.startDate.getTime() - 1);
        const prevStartDate = new Date(prevEndDate.getTime() - durationMs + 1);

        // Fetch requests across both current and comparative period, items catalog, and latest 20 overall queue
        const [reqRes, itemsRes, recentOverallRes] = await Promise.all([
          supabase
            .from('requests')
            .select('*, items(*), profiles(*)')
            .gte('created_at', prevStartDate.toISOString())
            .lte('created_at', dateRange.endDate.toISOString())
            .order('created_at', { ascending: false })
            .limit(5000),
          supabase.from('items').select('*').order('stok', { ascending: true }),
          supabase
            .from('requests')
            .select('*, items(*), profiles(*)')
            .order('created_at', { ascending: false })
            .limit(20),
        ]);

        if (ignore) return;

        const requestsList = (reqRes.data || []) as RequestWithDetails[];
        const itemsList = (itemsRes.data || []) as Item[];

        // Compute analytical metrics strictly matching the date window
        const analytics = calculateDashboardAnalytics(
          dateRange.startDate,
          dateRange.endDate,
          requestsList,
          itemsList
        );

        setKpiData(analytics.kpiData);
        setTrendData(analytics.trendData);
        setStatusData(analytics.statusData);
        setTopItemsData(analytics.topItemsData);
        setAllItems(itemsList);
        setRecentRequests((recentOverallRes.data || []) as RequestWithDetails[]);
      } catch {
        // Fallback gracefully
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
  }, [supabase, dateRange]);

  const handleRangeChange = (newRange: DateFilterRange) => {
    setIsLoading(true);
    setDateRange(newRange);
  };

  // 8 critical items for the Paired Bar Chart
  const criticalItems = useMemo(() => {
    return [...allItems]
      .sort((a, b) => {
        const ratioA = a.stok / Math.max(1, a.stok_minimum);
        const ratioB = b.stok / Math.max(1, b.stok_minimum);
        return ratioA - ratioB;
      })
      .slice(0, 8);
  }, [allItems]);

  // Duration in days for chart sub-labeling
  const activeDurationDays = useMemo(() => {
    const diff = dateRange.endDate.getTime() - dateRange.startDate.getTime() + 1;
    return Math.max(1, Math.round(diff / 86400000));
  }, [dateRange]);

  // Header tabs
  const tabList: { key: 'ringkasan' | 'aktivitas'; label: string }[] = [
    { key: 'ringkasan', label: 'Ringkasan' },
    { key: 'aktivitas', label: 'Aktivitas' },
  ];

  // Header controls for PageContainer: Segmented View + Comprehensive Date Filter
  const headerActions = (
    <div className="flex items-center gap-2.5 flex-wrap">
      {/* Segmented Control for Views */}
      <div className="inline-flex p-0.5 rounded-control bg-bg border border-border text-xs">
        {tabList.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1 rounded-badge text-xs font-medium transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'bg-surface text-text-main shadow-xs font-semibold'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Expanded Date Filter & Navigation Toolbar */}
      <DashboardDateFilter
        currentRange={dateRange}
        onChangeRange={handleRangeChange}
        isLoading={isLoading}
      />
    </div>
  );

  return (
    <PageContainer
      title="Dashboard General Affairs"
      subtitle="Pusat kendali 4 fitur utama GA: Persediaan, Permintaan, Pembaruan Stok, dan Penempatan ATK"
      actions={headerActions}
      contentClassName="space-y-3"
    >
      {/* 1. Tab Ringkasan */}
      {activeTab === 'ringkasan' && (
        <div className="space-y-3 flex-1 flex flex-col min-h-0">
          {/* Quick Access: 4 Fitur Utama General Affairs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
            <Link
              href="/admin/persediaan"
              className="group p-2.5 rounded-card bg-surface hover:bg-primary-soft/30 border border-border hover:border-primary/40 transition-all flex items-center gap-2.5 shadow-2xs"
            >
              <div className="w-8 h-8 rounded-control bg-primary-soft text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Boxes className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-text-main group-hover:text-primary transition-colors truncate">
                  1. Persediaan ATK
                </p>
                <p className="text-[10px] text-text-muted truncate">
                  Inventaris &amp; kontrol stok
                </p>
              </div>
            </Link>

            <Link
              href="/admin/permintaan"
              className="group p-2.5 rounded-card bg-surface hover:bg-primary-soft/30 border border-border hover:border-primary/40 transition-all flex items-center gap-2.5 shadow-2xs"
            >
              <div className="w-8 h-8 rounded-control bg-primary-soft text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-text-main group-hover:text-primary transition-colors truncate">
                  2. Permintaan ATK
                </p>
                <p className="text-[10px] text-text-muted truncate">
                  Verifikasi &amp; serah terima
                </p>
              </div>
            </Link>

            <Link
              href="/admin/pembaruan-stok"
              className="group p-2.5 rounded-card bg-surface hover:bg-primary-soft/30 border border-border hover:border-primary/40 transition-all flex items-center gap-2.5 shadow-2xs"
            >
              <div className="w-8 h-8 rounded-control bg-primary-soft text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ArrowUpDown className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-text-main group-hover:text-primary transition-colors truncate">
                  3. Pembaruan Stok
                </p>
                <p className="text-[10px] text-text-muted truncate">
                  Mutasi masuk &amp; keluar
                </p>
              </div>
            </Link>

            <Link
              href="/admin/penempatan"
              className="group p-2.5 rounded-card bg-surface hover:bg-primary-soft/30 border border-border hover:border-primary/40 transition-all flex items-center gap-2.5 shadow-2xs"
            >
              <div className="w-8 h-8 rounded-control bg-primary-soft text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-text-main group-hover:text-primary transition-colors truncate">
                  4. Penempatan ATK
                </p>
                <p className="text-[10px] text-text-muted truncate">
                  Tata letak Rak 1 - 4
                </p>
              </div>
            </Link>
          </div>

          {/* Row 1: 5 KPI Cards (no icons, pure flat metrics, strict period comparison) */}
          <DashboardKpis
            data={kpiData}
            isLoading={isLoading}
            periodLabel={dateRange.periodComparisonLabel}
          />

          {/* Row 2: 3 Charts (Row 1: Line + Pie, Row 2: Full-width Top 5 Bar) */}
          <div className="flex-1 min-h-0">
            <DashboardCharts
              trendData={trendData}
              topItemsData={topItemsData}
              statusData={statusData}
              criticalItems={criticalItems}
              isLoading={isLoading}
              periodDays={activeDurationDays}
              chartVariant="all"
            />
          </div>
        </div>
      )}

      {/* 2. Tab Aktivitas: Two Paginated DataTable Panels */}
      {activeTab === 'aktivitas' && (
        <div className="flex-1 flex flex-col min-h-0">
          <DashboardPanels
            recentRequests={recentRequests}
            allItems={allItems}
            isLoading={isLoading}
          />
        </div>
      )}
    </PageContainer>
  );
}
