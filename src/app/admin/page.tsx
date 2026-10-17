// Admin overview dashboard featuring key metrics, recent requests, and low stock warnings
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock,
  Boxes,
  AlertTriangle,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AdminToolbar } from '@/components/ui/AdminToolbar';
import { StatTile } from '@/components/ui/StatTile';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateShort, isLowStock } from '@/lib/utils';
import type { Item, RequestWithDetails } from '@/lib/types';

export default function AdminDashboardPage() {
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [totalPendingRequests, setTotalPendingRequests] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<Item[]>([]);
  const [recentRequests, setRecentRequests] = useState<RequestWithDetails[]>([]);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch pending requests count
      const { count: pendingCount } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'diproses');
      setTotalPendingRequests(pendingCount || 0);

      // 2. Fetch items for total count and low stock items
      const { data: itemsData } = await supabase
        .from('items')
        .select('*')
        .order('nama', { ascending: true });

      if (itemsData) {
        setTotalItems(itemsData.length);
        const lowList = itemsData.filter((it) => isLowStock(it.stok, it.stok_minimum));
        setLowStockItems(lowList);
      }

      // 3. Fetch latest 8 requests with item and profile details
      const { data: requestsData } = await supabase
        .from('requests')
        .select('*, items(*), profiles(*)')
        .order('created_at', { ascending: false })
        .limit(8);

      if (requestsData) {
        setRecentRequests(requestsData as RequestWithDetails[]);
      }
    } catch {
      // Handle error state gracefully
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return (
    <div>
      <AdminToolbar
        title="Dashboard GA"
        subtitle="Ringkasan pemantauan permintaan dan ketersediaan barang ATK"
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Metric tiles: 1 col on mobile, 3 cols from sm */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <StatTile
            label="Permintaan Diproses"
            value={isLoading ? '-' : totalPendingRequests}
            sublabel="Menunggu penyelesaian fisik"
            icon={Clock}
            variant="warning"
          />
          <StatTile
            label="Total Jenis Barang"
            value={isLoading ? '-' : totalItems}
            sublabel="Katalog barang terdaftar"
            icon={Boxes}
            variant="primary"
          />
          <StatTile
            label="Barang Stok Menipis"
            value={isLoading ? '-' : lowStockItems.length}
            sublabel="Perlu pengadaan ulang"
            icon={AlertTriangle}
            variant="danger"
          />
        </div>

        {/* Content grid: 2 columns on lg, stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Recent requests section (2 cols on lg) */}
          <div className="lg:col-span-2 bg-surface rounded-card border border-border shadow-subtle overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-text-main">
                  Permintaan Terbaru
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Maksimal 8 permintaan paling akhir diajukan
                </p>
              </div>
              <Link
                href="/admin/permintaan"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-dark transition-colors cursor-pointer py-1 px-2 rounded-control hover:bg-primary-soft/50"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </Link>
            </div>

            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recentRequests.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={ClipboardList}
                  title="Belum ada permintaan"
                  description="Permintaan ATK dari divisi operasional akan muncul di sini."
                />
              </div>
            ) : (
              <div>
                {/* Desktop Table View (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-bg text-text-muted border-b border-border font-medium">
                      <tr>
                        <th className="py-2.5 px-4">Tanggal</th>
                        <th className="py-2.5 px-4">Divisi</th>
                        <th className="py-2.5 px-4">Barang</th>
                        <th className="py-2.5 px-4 text-right">Jumlah</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {recentRequests.map((req) => (
                        <tr
                          key={req.id}
                          className="hover:bg-bg/60 transition-colors"
                        >
                          <td className="py-2.5 px-4 text-text-muted whitespace-nowrap">
                            {formatDateShort(req.created_at)}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-text-main max-w-[140px] truncate">
                            {req.profiles?.nama_divisi || 'Divisi Pemohon'}
                          </td>
                          <td className="py-2.5 px-4 text-text-main max-w-[180px] truncate">
                            {req.items?.nama || 'Barang ATK'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-medium text-text-main tabular-nums whitespace-nowrap">
                            {req.jumlah} {req.items?.satuan || 'pcs'}
                          </td>
                          <td className="py-2.5 px-4 text-center whitespace-nowrap">
                            <Badge
                              variant={
                                req.status === 'selesai' ? 'selesai' : 'diproses'
                              }
                            >
                              {req.status === 'selesai'
                                ? 'Selesai'
                                : 'Diproses'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View (< md) */}
                <div className="md:hidden divide-y divide-border/60">
                  {recentRequests.map((req) => (
                    <div key={req.id} className="p-3.5 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-xs text-text-main leading-tight">
                          {req.items?.nama || 'Barang ATK'}
                        </span>
                        <Badge
                          variant={
                            req.status === 'selesai' ? 'selesai' : 'diproses'
                          }
                        >
                          {req.status === 'selesai' ? 'Selesai' : 'Diproses'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-text-muted">
                        <span>
                          {req.profiles?.nama_divisi || 'Divisi Pemohon'}
                        </span>
                        <span className="tabular-nums font-semibold text-text-main">
                          {req.jumlah} {req.items?.satuan || 'pcs'}
                        </span>
                      </div>
                      <div className="text-[10px] text-text-muted">
                        {formatDateShort(req.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Low stock items warning card (1 col on lg) */}
          <div className="bg-surface rounded-card border border-border shadow-subtle overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-danger flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />
                  <span>Stok Menipis</span>
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Barang di bawah batas minimum
                </p>
              </div>
              <Link
                href="/admin/persediaan"
                className="text-xs font-medium text-primary hover:text-primary-dark transition-colors cursor-pointer"
              >
                Kelola
              </Link>
            </div>

            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : lowStockItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-muted">
                Semua stok persediaan saat ini dalam batas aman.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 flex items-center justify-between gap-3 bg-danger-soft/20 hover:bg-danger-soft/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-text-main truncate">
                        {item.nama}
                      </div>
                      <div className="text-[11px] text-text-muted mt-0.5">
                        Min. batas: <span className="tabular-nums">{item.stok_minimum}</span> {item.satuan}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block px-2 py-0.5 rounded-badge bg-danger text-white text-xs font-semibold tabular-nums">
                        {item.stok} {item.satuan}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
