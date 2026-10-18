// Bottom row panels for Admin GA Dashboard: Recent Requests table & Stock Health overview
'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatDateShort } from '@/lib/utils';
import type { RequestWithDetails, Item } from '@/lib/types';

interface DashboardPanelsProps {
  recentRequests: RequestWithDetails[];
  criticalItems: Item[];
  isLoading: boolean;
}

export function DashboardPanels({
  recentRequests,
  criticalItems,
  isLoading,
}: DashboardPanelsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* 1. Permintaan Terbaru Panel */}
      <div className="bg-surface rounded-card border border-border flex flex-col overflow-hidden select-none">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
          <div>
            <h3 className="text-xs font-semibold text-text-main tracking-tight">
              Permintaan Terbaru
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              5 transaksi permintaan terakhir dari divisi
            </p>
          </div>
          <Link
            href="/admin/permintaan"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline cursor-pointer"
          >
            <span>Lihat Semua</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="flex-1 overflow-x-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="h-8 bg-border/40 rounded-badge animate-pulse" />
              ))}
            </div>
          ) : recentRequests.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-muted">
              Belum ada permintaan diajukan
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-bg text-text-muted text-[11px] uppercase border-b border-border">
                <tr>
                  <th className="py-2 px-3 font-semibold">Nomor</th>
                  <th className="py-2 px-3 font-semibold">Tanggal</th>
                  <th className="py-2 px-3 font-semibold">Barang</th>
                  <th className="py-2 px-3 font-semibold text-right">Jumlah</th>
                  <th className="py-2 px-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentRequests.slice(0, 5).map((req) => (
                  <tr key={req.id} className="hover:bg-bg/40 transition-colors">
                    <td className="py-2 px-3 font-mono font-medium text-text-main text-[11px]">
                      {req.nomor || 'REQ'}
                    </td>
                    <td className="py-2 px-3 text-text-muted tabular-nums whitespace-nowrap">
                      {formatDateShort(req.created_at)}
                    </td>
                    <td className="py-2 px-3 text-text-main truncate max-w-[150px]">
                      {req.items?.nama || '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-medium tabular-nums text-text-main">
                      {req.jumlah} {req.items?.satuan}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Badge variant={req.status as 'diproses' | 'selesai'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 2. Kesehatan Stok Panel */}
      <div className="bg-surface rounded-card border border-border flex flex-col overflow-hidden select-none">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
          <div>
            <h3 className="text-xs font-semibold text-text-main tracking-tight">
              Kesehatan Stok Fisik
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              Kondisi 6 barang paling kritis mendekati atau di bawah batas minimum
            </p>
          </div>
          <Link
            href="/admin/persediaan"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline cursor-pointer"
          >
            <span>Kelola</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="p-4 flex-1 flex flex-col justify-around space-y-2.5">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-6 bg-border/40 rounded-badge animate-pulse" />
              ))}
            </div>
          ) : criticalItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted flex flex-col items-center gap-1">
              <CheckCircle2 className="w-6 h-6 text-success mb-1" />
              <span>Semua stok barang dalam kondisi aman di atas batas minimum.</span>
            </div>
          ) : (
            criticalItems.slice(0, 6).map((item) => {
              const isLow = item.stok <= item.stok_minimum;
              const isOut = item.stok === 0;
              const maxScale = Math.max(item.stok_minimum * 2, item.stok, 10);
              const stockPercent = Math.min(100, Math.round((item.stok / maxScale) * 100));
              const minPercent = Math.min(100, Math.round((item.stok_minimum / maxScale) * 100));

              return (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate max-w-[240px]">
                      <span className="font-mono text-[10px] text-primary font-semibold">
                        {item.kode}
                      </span>
                      <span className="truncate text-text-main font-medium">
                        {item.nama}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 tabular-nums text-[11px]">
                      <span className={isLow ? 'text-danger font-semibold' : 'text-text-main'}>
                        {item.stok} {item.satuan}
                      </span>
                      <span className="text-text-muted">/ min {item.stok_minimum}</span>
                    </div>
                  </div>

                  {/* Stock progress track */}
                  <div className="relative h-2 w-full bg-bg rounded-full overflow-hidden border border-border/50">
                    {/* Minimum stock marker */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
                      style={{ left: `${minPercent}%` }}
                      title={`Batas Minimum: ${item.stok_minimum}`}
                    />
                    {/* Current stock bar */}
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isOut
                          ? 'bg-danger'
                          : isLow
                          ? 'bg-danger'
                          : 'bg-primary'
                      }`}
                      style={{ width: `${Math.max(4, stockPercent)}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
