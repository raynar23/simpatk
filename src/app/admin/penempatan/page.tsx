// Penempatan ATK page: Manage physical placement across 4 storage racks (Rak 1, Rak 2, Rak 3, Rak 4)
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Printer,
  RotateCcw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Package,
  LayoutGrid,
  List,
  ArrowRightLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { RakBadge } from '@/components/admin/RakBadge';
import { RakMoveModal } from '@/components/admin/RakMoveModal';
import {
  RAK_DEFINITIONS,
  RAK_KEYS,
  type RakKey,
  type RakDefinition,
  getItemRak,
  getSavedRakOverrides,
  resetAllRakPlacements,
} from '@/lib/rakUtils';
import type { Item } from '@/lib/types';

export default function AdminPenempatanPage() {
  const supabase = createClient();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [rakOverrides, setRakOverrides] = useState<Record<string, RakKey>>({});

  // Active filters and views
  const [selectedRakTab, setSelectedRakTab] = useState<'semua' | RakKey>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'semua' | 'aman' | 'perhatian'>('semua');
  const [viewMode, setViewMode] = useState<'visual' | 'table'>('visual');

  // Modal move state
  const [moveItem, setMoveItem] = useState<(Item & { resolvedRak: RakKey }) | null>(null);

  // Load items from Supabase
  useEffect(() => {
    let ignore = false;

    async function fetchItems() {
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .order('kode', { ascending: true });

        if (ignore) return;
        if (error) {
          showToast('Gagal memuat katalog barang.', 'error');
          return;
        }

        if (data) {
          setItems(data as Item[]);
        }
      } catch {
        if (!ignore) showToast('Gagal menghubungi server.', 'error');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    fetchItems();
    setRakOverrides(getSavedRakOverrides());

    // Listen for custom event updates from RakMoveModal
    const handleUpdate = () => {
      setRakOverrides(getSavedRakOverrides());
    };
    window.addEventListener('simpatk-rak-updated', handleUpdate);

    return () => {
      ignore = true;
      window.removeEventListener('simpatk-rak-updated', handleUpdate);
    };
  }, [supabase, showToast]);

  // Enrich items with their resolved rack location
  const enrichedItems = useMemo(() => {
    return items.map((it) => ({
      ...it,
      resolvedRak: getItemRak(it, rakOverrides),
    }));
  }, [items, rakOverrides]);

  // Filtered items based on search, active rack tab, and stock condition
  const filteredItems = useMemo(() => {
    return enrichedItems.filter((it) => {
      // Tab filter
      if (selectedRakTab !== 'semua' && it.resolvedRak !== selectedRakTab) {
        return false;
      }

      // Stock filter (Point 7: menipis/habis dikasih perhatian)
      const isOut = it.stok === 0;
      const isLow = !isOut && it.stok <= it.stok_minimum;
      if (stockFilter === 'aman' && (isOut || isLow)) return false;
      if (stockFilter === 'perhatian' && !isOut && !isLow) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = it.nama.toLowerCase().includes(q);
        const matchKode = (it.kode || '').toLowerCase().includes(q);
        const matchKategori = (it.kategori || '').toLowerCase().includes(q);
        const matchRak = it.resolvedRak.toLowerCase().includes(q);
        return matchName || matchKode || matchKategori || matchRak;
      }

      return true;
    });
  }, [enrichedItems, selectedRakTab, stockFilter, searchQuery]);

  // Rack statistics for top 4 cards
  const rakStats = useMemo(() => {
    const stats: Record<
      RakKey,
      { count: number; totalUnits: number; lowStockCount: number; items: typeof enrichedItems }
    > = {
      'Rak 1': { count: 0, totalUnits: 0, lowStockCount: 0, items: [] },
      'Rak 2': { count: 0, totalUnits: 0, lowStockCount: 0, items: [] },
      'Rak 3': { count: 0, totalUnits: 0, lowStockCount: 0, items: [] },
      'Rak 4': { count: 0, totalUnits: 0, lowStockCount: 0, items: [] },
    };

    enrichedItems.forEach((it) => {
      const target = stats[it.resolvedRak];
      if (target) {
        target.count += 1;
        target.totalUnits += it.stok;
        if (it.stok <= it.stok_minimum) {
          target.lowStockCount += 1;
        }
        target.items.push(it);
      }
    });

    return stats;
  }, [enrichedItems]);

  // Handle reset to default categorization
  const handleReset = () => {
    if (confirm('Kembalikan semua penempatan barang ke rak default sesuai kategorinya?')) {
      resetAllRakPlacements();
      setRakOverrides({});
      showToast('Penempatan rak telah diatur ulang ke konfigurasi default.', 'success');
    }
  };

  // Handle printing
  const handlePrint = () => {
    window.print();
  };

  return (
    <PageContainer
      title="Penempatan ATK"
      subtitle="Manajemen tata letak fisik inventaris alat tulis kantor pada 4 rak penyimpanan operasional GA."
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold text-text-muted hover:text-text-main bg-surface border border-border hover:bg-bg transition-colors cursor-pointer"
            title="Kembalikan penempatan semua barang ke rak standar"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Default</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-control text-xs font-semibold text-white bg-primary hover:bg-primary-dark transition-colors shadow-subtle cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Denah Rak</span>
          </button>
        </div>
      }
    >
      <div className="h-full flex flex-col gap-3.5 min-h-0">
        {/* Top 4 Storage Racks KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          {RAK_DEFINITIONS.map((rak) => {
            const data = rakStats[rak.id];
            const isSelected = selectedRakTab === rak.id;

            return (
              <div
                key={rak.id}
                onClick={() => setSelectedRakTab(isSelected ? 'semua' : rak.id)}
                className={`bg-surface rounded-card border p-3.5 flex flex-col justify-between transition-all cursor-pointer relative group ${
                  isSelected
                    ? 'border-primary ring-1 ring-primary shadow-subtle'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-text-main tracking-tight flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      {rak.id}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-control border ${rak.theme.badgeBg}`}>
                      {rak.sub}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted line-clamp-1">{rak.zona}</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-border/70 flex items-end justify-between">
                  <div>
                    <div className="text-xl font-bold text-text-main tabular-nums">
                      {isLoading ? '-' : data?.count || 0}{' '}
                      <span className="text-xs font-normal text-text-muted">jenis ATK</span>
                    </div>
                    <div className="text-[11px] text-text-muted tabular-nums">
                      Total {isLoading ? '-' : data?.totalUnits || 0} unit fisik
                    </div>
                  </div>

                  {/* Stock Alert (Point 7: warna merah ketika menipis/habis) */}
                  {!isLoading && data && data.lowStockCount > 0 ? (
                    <span
                      title={`${data.lowStockCount} barang perlu restock / menipis`}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-danger-bg text-danger border border-danger/30"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      <span>{data.lowStockCount} menipis</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-success-bg text-success border border-success/30">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Stok aman</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Toolbar & Filter */}
        <div className="bg-surface rounded-card border border-border p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          {/* Quick Locator Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ATK untuk cek lokasi rak..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-control border border-border bg-bg text-text-main placeholder:text-text-muted/60 transition-colors focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Filter Tabs & Switcher */}
          <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
            {/* Rak Filter Pills */}
            <div className="inline-flex rounded-control bg-bg p-0.5 border border-border overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setSelectedRakTab('semua')}
                className={`px-2.5 py-1 text-xs font-medium rounded-control transition-all cursor-pointer whitespace-nowrap ${
                  selectedRakTab === 'semua'
                    ? 'bg-surface text-text-main shadow-subtle'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                Semua Rak ({items.length})
              </button>
              {RAK_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSelectedRakTab(k)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-control transition-all cursor-pointer whitespace-nowrap ${
                    selectedRakTab === k
                      ? 'bg-surface text-text-main shadow-subtle'
                      : 'text-text-muted hover:text-text-main'
                  }`}
                >
                  {k} ({rakStats[k]?.count || 0})
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="inline-flex rounded-control bg-bg p-0.5 border border-border">
              <button
                type="button"
                onClick={() => setViewMode('visual')}
                title="Tampilan Visual Rak"
                className={`p-1.5 rounded-control transition-all cursor-pointer ${
                  viewMode === 'visual'
                    ? 'bg-surface text-text-main shadow-subtle'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Tampilan Tabel"
                className={`p-1.5 rounded-control transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-surface text-text-main shadow-subtle'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
          {isLoading ? (
            <div className="w-full h-64 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              title="Barang Tidak Ditemukan"
              description="Tidak ada barang ATK yang sesuai pada rak atau pencarian saat ini."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedRakTab('semua');
                    setStockFilter('semua');
                  }}
                  className="px-3.5 py-1.5 rounded-control text-xs font-semibold bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer"
                >
                  Reset Filter
                </button>
              }
            />
          ) : viewMode === 'visual' ? (
            /* Visual Shelves Layout */
            <div className="space-y-4">
              {RAK_DEFINITIONS.filter((r) =>
                selectedRakTab === 'semua' ? true : r.id === selectedRakTab
              ).map((rakDef) => {
                const rackItems = filteredItems.filter((it) => it.resolvedRak === rakDef.id);
                if (rackItems.length === 0 && selectedRakTab === 'semua') return null;

                return (
                  <div
                    key={rakDef.id}
                    className="bg-surface rounded-card border border-border overflow-hidden shadow-xs"
                  >
                    {/* Shelf Header */}
                    <div
                      className={`px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${rakDef.theme.headerBg}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-control bg-white shadow-xs border border-border flex items-center justify-center text-primary shrink-0">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-text-main">{rakDef.nama}</h3>
                            <span className="text-[11px] font-semibold text-text-muted">
                              ({rackItems.length} jenis ATK)
                            </span>
                          </div>
                          <p className="text-[11px] text-text-muted">{rakDef.deskripsi}</p>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-2">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/90 border border-border/80 text-text-muted">
                          {rakDef.zona}
                        </span>
                      </div>
                    </div>

                    {/* Shelf Slots Grid */}
                    <div className="p-3.5 bg-bg/40">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                        {rackItems.map((item) => {
                          const isOutOfStock = item.stok === 0;
                          const isLowStock = !isOutOfStock && item.stok <= item.stok_minimum;

                          return (
                            <div
                              key={item.id}
                              className={`bg-surface rounded-control border p-3 flex flex-col justify-between transition-all hover:shadow-subtle group ${
                                isOutOfStock || isLowStock
                                  ? 'border-danger/40 ring-1 ring-danger/20'
                                  : 'border-border hover:border-primary/40'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between text-[11px] mb-1.5">
                                  <span className="font-mono font-semibold text-text-muted bg-bg px-1.5 py-0.5 rounded border border-border/70">
                                    {item.kode || 'ATK'}
                                  </span>
                                  <span className="text-text-muted text-[10px] font-medium truncate max-w-[110px]">
                                    {item.kategori || 'Umum'}
                                  </span>
                                </div>

                                <h4 className="text-xs font-semibold text-text-main line-clamp-2 min-h-[32px] tracking-tight">
                                  {item.nama}
                                </h4>

                                <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                                  <span className="text-text-muted text-[11px]">Stok Fisik:</span>
                                  {/* Point 7: warna merah jika menipis/habis */}
                                  {isOutOfStock ? (
                                    <span className="text-[11px] font-bold text-danger bg-danger-bg px-2 py-0.5 rounded border border-danger/30">
                                      Habis (0 {item.satuan})
                                    </span>
                                  ) : isLowStock ? (
                                    <span className="text-[11px] font-bold text-danger bg-danger-bg px-2 py-0.5 rounded border border-danger/30">
                                      Sisa {item.stok} {item.satuan}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-semibold text-text-main tabular-nums">
                                      {item.stok} {item.satuan}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Action move button */}
                              <div className="mt-2.5 pt-2 border-t border-border/60">
                                <button
                                  type="button"
                                  onClick={() => setMoveItem(item)}
                                  className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-control text-[11px] font-semibold text-text-muted hover:text-primary bg-bg hover:bg-primary/5 border border-border hover:border-primary/30 transition-colors cursor-pointer"
                                >
                                  <ArrowRightLeft className="w-3 h-3" />
                                  <span>Pindah Rak</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="bg-surface rounded-card border border-border overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-bg border-b border-border text-text-muted font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Kode</th>
                      <th className="px-4 py-3">Nama Barang</th>
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-4 py-3">Lokasi Penempatan</th>
                      <th className="px-4 py-3 text-right">Stok Fisik</th>
                      <th className="px-4 py-3">Status Stok</th>
                      <th className="px-4 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredItems.map((item) => {
                      const isOutOfStock = item.stok === 0;
                      const isLowStock = !isOutOfStock && item.stok <= item.stok_minimum;

                      return (
                        <tr key={item.id} className="hover:bg-bg/50 transition-colors">
                          <td className="px-4 py-3 font-mono font-semibold text-text-muted">
                            {item.kode || 'ATK'}
                          </td>
                          <td className="px-4 py-3 font-medium text-text-main">
                            {item.nama}
                          </td>
                          <td className="px-4 py-3 text-text-muted">
                            {item.kategori || 'Umum'}
                          </td>
                          <td className="px-4 py-3">
                            <RakBadge rak={item.resolvedRak} size="sm" />
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                            {item.stok} {item.satuan}
                          </td>
                          <td className="px-4 py-3">
                            {isOutOfStock ? (
                              <Badge variant="habis">Habis (0)</Badge>
                            ) : isLowStock ? (
                              <Badge variant="menipis">Menipis ({item.stok})</Badge>
                            ) : (
                              <span className="text-[11px] font-medium text-success inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Aman</span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => setMoveItem(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-control text-xs font-semibold text-primary hover:bg-primary/10 border border-primary/20 transition-colors cursor-pointer"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              <span>Pindah</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Move Item to Another Rak Modal */}
        {moveItem && (
          <RakMoveModal
            item={moveItem}
            currentRak={moveItem.resolvedRak}
            isOpen={!!moveItem}
            onClose={() => setMoveItem(null)}
            onSuccess={(newRak) => {
              setRakOverrides((prev) => ({ ...prev, [moveItem.id]: newRak }));
              setMoveItem(null);
            }}
          />
        )}
      </div>
    </PageContainer>
  );
}
