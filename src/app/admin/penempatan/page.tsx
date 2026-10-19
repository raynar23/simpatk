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
  ChevronLeft,
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
  const [mobileRakIndex, setMobileRakIndex] = useState<number>(0);
  const [desktopRakPages, setDesktopRakPages] = useState<Record<RakKey, number>>({
    'Rak 1': 1,
    'Rak 2': 1,
    'Rak 3': 1,
    'Rak 4': 1,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'semua' | 'aman' | 'perhatian'>('semua');
  const [viewMode, setViewMode] = useState<'visual' | 'table'>('visual');

  const currentMobileRak = RAK_KEYS[mobileRakIndex] || 'Rak 1';

  const handleSelectRak = (rak: 'semua' | RakKey) => {
    setSelectedRakTab(rak);
    if (rak !== 'semua') {
      const idx = RAK_KEYS.indexOf(rak);
      if (idx !== -1) setMobileRakIndex(idx);
    }
  };

  const handleMobilePageChange = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < RAK_KEYS.length) {
      setMobileRakIndex(newIndex);
      setSelectedRakTab(RAK_KEYS[newIndex]);
    }
  };

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


  // Helper to get filtered items for a specific rack
  const getRackFilteredItems = (rakId: RakKey) => {
    return enrichedItems.filter((it) => {
      if (it.resolvedRak !== rakId) return false;

      // Stock filter
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
        return matchName || matchKode || matchKategori;
      }
      return true;
    });
  };

  // Auto-switch mobile page if search query matches item in another shelf
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase();
    const matched = enrichedItems.find(
      (it) =>
        it.nama.toLowerCase().includes(q) ||
        (it.kode || '').toLowerCase().includes(q)
    );
    if (matched) {
      const idx = RAK_KEYS.indexOf(matched.resolvedRak);
      if (idx !== -1 && idx !== mobileRakIndex) {
        setMobileRakIndex(idx);
      }
    }
  }, [searchQuery, enrichedItems, mobileRakIndex]);

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
        {/* Mobile: 1 Rak 1 Halaman Pagination Navigation Bar */}
        <div className="sm:hidden bg-surface rounded-card border border-border p-2.5 flex flex-col gap-2 shrink-0 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-text-main uppercase tracking-wider">
                Navigasi Rak
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Halaman {mobileRakIndex + 1} dari 4
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleMobilePageChange(mobileRakIndex - 1)}
                disabled={mobileRakIndex === 0}
                className="inline-flex items-center justify-center w-7 h-7 rounded-control border border-border text-text-main hover:bg-bg disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Rak Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleMobilePageChange(mobileRakIndex + 1)}
                disabled={mobileRakIndex === RAK_KEYS.length - 1}
                className="inline-flex items-center justify-center w-7 h-7 rounded-control border border-border text-text-main hover:bg-bg disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Rak Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 4 Rak Quick Selector Buttons */}
          <div className="flex items-center gap-1.5 w-full">
            {RAK_DEFINITIONS.map((r, idx) => {
              const isActive = mobileRakIndex === idx;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleMobilePageChange(idx)}
                  className={`flex-1 py-1.5 px-1 rounded-control text-xs font-semibold flex flex-col items-center justify-center transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-primary text-white border-primary shadow-subtle'
                      : 'bg-bg text-text-muted border-border hover:text-text-main hover:border-primary/40'
                  }`}
                >
                  <span>{r.id}</span>
                  <span className={`text-[10px] font-normal tabular-nums ${isActive ? 'text-white/85' : 'text-text-muted'}`}>
                    {rakStats[r.id]?.count || 0} ATK
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile: Active Rak KPI Summary Card */}
        <div className="sm:hidden">
          {(() => {
            const activeRakDef = RAK_DEFINITIONS[mobileRakIndex];
            const data = rakStats[activeRakDef.id];

            return (
              <div className="bg-surface rounded-card border border-border p-3 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-text-main tracking-tight flex items-center gap-1.5 whitespace-nowrap shrink-0">
                      <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                      {activeRakDef.id}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-control border whitespace-nowrap shrink-0 max-w-[200px] truncate ${activeRakDef.theme.badgeBg}`}>
                      {activeRakDef.sub}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted line-clamp-1">{activeRakDef.zona}</p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-border/70 flex items-end justify-between">
                  <div>
                    <div className="text-lg font-bold text-text-main tabular-nums">
                      {isLoading ? '-' : data?.count || 0}{' '}
                      <span className="text-xs font-normal text-text-muted">jenis ATK</span>
                    </div>
                    <div className="text-[11px] text-text-muted tabular-nums">
                      Total {isLoading ? '-' : data?.totalUnits || 0} unit fisik
                    </div>
                  </div>

                  {!isLoading && data && data.lowStockCount > 0 ? (
                    <span
                      title={`${data.lowStockCount} barang perlu restock / menipis`}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-danger-bg text-danger border border-danger/30 whitespace-nowrap shrink-0"
                    >
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{data.lowStockCount} menipis</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-success-bg text-success border border-success/30 whitespace-nowrap shrink-0">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span>Stok aman</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Desktop: Top 4 Storage Racks KPI Grid */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          {RAK_DEFINITIONS.map((rak) => {
            const data = rakStats[rak.id];
            const isSelected = selectedRakTab === rak.id;

            return (
              <div
                key={rak.id}
                onClick={() => handleSelectRak(isSelected ? 'semua' : rak.id)}
                className={`bg-surface rounded-card border p-3.5 flex flex-col justify-between transition-all cursor-pointer relative group ${
                  isSelected
                    ? 'border-primary ring-1 ring-primary shadow-subtle'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-text-main tracking-tight flex items-center gap-1.5 whitespace-nowrap shrink-0">
                      <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                      {rak.id}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-control border whitespace-nowrap shrink-0 ${rak.theme.badgeBg}`}>
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

                  {!isLoading && data && data.lowStockCount > 0 ? (
                    <span
                      title={`${data.lowStockCount} barang perlu restock / menipis`}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-danger-bg text-danger border border-danger/30 whitespace-nowrap shrink-0"
                    >
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{data.lowStockCount} menipis</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-success-bg text-success border border-success/30 whitespace-nowrap shrink-0">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
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
            {/* Rak Filter Pills - Desktop Only */}
            <div className="hidden sm:inline-flex rounded-control bg-bg p-0.5 border border-border overflow-x-auto max-w-full">
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
          ) : filteredItems.length === 0 && selectedRakTab === 'semua' && !searchQuery.trim() ? (
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
            <>
              {/* Mobile View: 1 Rak per Halaman with Uniform Height (420px) */}
              <div className="sm:hidden">
                {(() => {
                  const mobileDef = RAK_DEFINITIONS[mobileRakIndex];
                  const mobileRackItems = getRackFilteredItems(mobileDef.id);

                  return (
                    <div className="bg-surface rounded-card border border-border overflow-hidden shadow-xs flex flex-col">
                      {/* Shelf Header */}
                      <div className={`px-3.5 py-2.5 sm:py-3 border-b flex flex-col gap-2 ${mobileDef.theme.headerBg}`}>
                        <div className="flex items-center gap-2.5 min-w-0 w-full">
                          <div className="w-8 h-8 rounded-control bg-white shadow-xs border border-border flex items-center justify-center text-primary shrink-0">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="text-xs sm:text-sm font-bold text-text-main">{mobileDef.nama}</h3>
                              <span className="text-[10px] sm:text-[11px] font-semibold text-text-muted shrink-0">
                                ({mobileRackItems.length} jenis ATK)
                              </span>
                            </div>
                            <p className="text-[10px] text-text-muted truncate mt-0.5">{mobileDef.deskripsi}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/50 text-[10px]">
                          <span className="text-text-muted font-medium shrink-0">Lokasi Penempatan:</span>
                          <span className="font-mono px-2 py-0.5 rounded bg-white/90 border border-border/80 text-text-muted font-medium">
                            {mobileDef.zona}
                          </span>
                        </div>
                      </div>

                      {/* Shelf Slots Container with UNIFORM FIXED HEIGHT for all pages */}
                      <div className="p-3 bg-bg/40 h-[420px] sm:h-[480px] overflow-y-auto">
                        {mobileRackItems.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-4">
                            <Package className="w-8 h-8 text-text-muted/40 mb-2" />
                            <p className="text-xs font-semibold text-text-main">Tidak Ada Barang di {mobileDef.id}</p>
                            <p className="text-[11px] text-text-muted mt-0.5">
                              {searchQuery.trim()
                                ? 'Tidak ada barang yang cocok dengan kata kunci pencarian pada rak ini.'
                                : 'Belum ada barang ATK yang ditempatkan pada rak ini.'}
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {mobileRackItems.map((item) => {
                              const isOutOfStock = item.stok === 0;
                              const isLowStock = !isOutOfStock && item.stok <= item.stok_minimum;

                              return (
                                <div
                                  key={item.id}
                                  className={`bg-surface rounded-control border p-3 flex flex-col justify-between transition-all ${
                                    isOutOfStock || isLowStock
                                      ? 'border-danger/40 ring-1 ring-danger/20'
                                      : 'border-border'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between text-[11px] mb-1">
                                      <span className="font-mono font-semibold text-text-muted bg-bg px-1.5 py-0.5 rounded border border-border/70 text-[10px]">
                                        {item.kode || 'ATK'}
                                      </span>
                                      <span className="text-text-muted text-[10px] font-medium truncate max-w-[120px]">
                                        {item.kategori || 'Umum'}
                                      </span>
                                    </div>

                                    <h4 className="text-xs font-semibold text-text-main tracking-tight line-clamp-2">
                                      {item.nama}
                                    </h4>

                                    <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                                      <span className="text-text-muted text-[11px]">Stok Fisik:</span>
                                      {isOutOfStock ? (
                                        <span className="text-[10px] font-bold text-danger bg-danger-bg px-2 py-0.5 rounded border border-danger/30 whitespace-nowrap shrink-0">
                                          Habis (0 {item.satuan})
                                        </span>
                                      ) : isLowStock ? (
                                        <span className="text-[10px] font-bold text-danger bg-danger-bg px-2 py-0.5 rounded border border-danger/30 whitespace-nowrap shrink-0">
                                          Sisa {item.stok} {item.satuan}
                                        </span>
                                      ) : (
                                        <span className="text-[11px] font-semibold text-text-main tabular-nums whitespace-nowrap shrink-0">
                                          {item.stok} {item.satuan}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="mt-2.5 pt-2 border-t border-border/60">
                                    <button
                                      type="button"
                                      onClick={() => setMoveItem(item)}
                                      className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-control text-[11px] font-semibold text-text-muted hover:text-primary bg-bg hover:bg-primary/5 border border-border hover:border-primary/30 transition-colors cursor-pointer whitespace-nowrap"
                                    >
                                      <ArrowRightLeft className="w-3 h-3 shrink-0" />
                                      <span>Pindah Rak</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Bottom Pagination Controls */}
                      <div className="px-3 sm:px-4 py-2.5 bg-surface border-t border-border flex items-center justify-between gap-2 text-xs select-none">
                        <button
                          type="button"
                          onClick={() => handleMobilePageChange(mobileRakIndex - 1)}
                          disabled={mobileRakIndex === 0}
                          className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-control text-xs font-semibold border border-border text-text-main bg-bg hover:bg-surface disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shrink-0 min-h-[34px] active:scale-[0.98]"
                          title="Rak Sebelumnya"
                        >
                          <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                          <span className="hidden min-[360px]:inline">Sebelumnya</span>
                        </button>

                        <div className="flex items-center justify-center gap-1.5 font-medium text-text-muted text-xs whitespace-nowrap shrink-0">
                          <span>Halaman</span>
                          <span className="font-bold text-primary font-mono text-xs px-2 py-0.5 rounded-badge bg-primary/10 border border-primary/20">
                            {mobileRakIndex + 1}
                          </span>
                          <span>dari</span>
                          <span className="font-semibold text-text-main font-mono text-xs">4</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleMobilePageChange(mobileRakIndex + 1)}
                          disabled={mobileRakIndex === RAK_KEYS.length - 1}
                          className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-control text-xs font-semibold border border-border text-text-main bg-bg hover:bg-surface disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shrink-0 active:scale-[0.98] min-h-[34px]"
                          title="Rak Selanjutnya"
                        >
                          <span className="hidden min-[360px]:inline">Selanjutnya</span>
                          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Desktop View: Multi-Rak Layout (Max 8 cards per rack per page) */}
              <div className="hidden sm:block space-y-4">
                {RAK_DEFINITIONS.filter((r) =>
                  selectedRakTab === 'semua' ? true : r.id === selectedRakTab
                ).map((rakDef) => {
                  const rackItems = filteredItems.filter((it) => it.resolvedRak === rakDef.id);
                  if (rackItems.length === 0 && selectedRakTab === 'semua') return null;

                  const DESKTOP_CARDS_PER_PAGE = 8;
                  const totalPages = Math.ceil(rackItems.length / DESKTOP_CARDS_PER_PAGE) || 1;
                  const currentPage = desktopRakPages[rakDef.id] || 1;
                  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));
                  const startIndex = (safeCurrentPage - 1) * DESKTOP_CARDS_PER_PAGE;
                  const displayedCards = rackItems.slice(startIndex, startIndex + DESKTOP_CARDS_PER_PAGE);

                  return (
                    <div
                      key={rakDef.id}
                      className="bg-surface rounded-card border border-border overflow-hidden shadow-xs flex flex-col"
                    >
                      {/* Shelf Header */}
                      <div
                        className={`px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${rakDef.theme.headerBg}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-control bg-white shadow-xs border border-border flex items-center justify-center text-primary shrink-0">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-bold text-text-main">{rakDef.nama}</h3>
                              <span className="text-[11px] font-semibold text-text-muted shrink-0">
                                ({rackItems.length} jenis ATK)
                              </span>
                              {totalPages > 1 && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                                  Halaman {safeCurrentPage} dari {totalPages}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-text-muted truncate mt-0.5">{rakDef.deskripsi}</p>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/90 border border-border/80 text-text-muted">
                            {rakDef.zona}
                          </span>
                        </div>
                      </div>

                      {/* Shelf Slots Grid (Max 8 cards per page on desktop, 3 columns) */}
                      <div className="p-3.5 bg-bg/40 flex-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {displayedCards.map((item) => {
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
                                    {isOutOfStock ? (
                                      <span className="text-[11px] font-bold text-danger bg-danger-bg px-2 py-0.5 rounded border border-danger/30 whitespace-nowrap shrink-0">
                                        Habis (0 {item.satuan})
                                      </span>
                                    ) : isLowStock ? (
                                      <span className="text-[11px] font-bold text-danger bg-danger-bg px-2 py-0.5 rounded border border-danger/30 whitespace-nowrap shrink-0">
                                        Sisa {item.stok} {item.satuan}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] font-semibold text-text-main tabular-nums whitespace-nowrap shrink-0">
                                        {item.stok} {item.satuan}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-2.5 pt-2 border-t border-border/60">
                                  <button
                                    type="button"
                                    onClick={() => setMoveItem(item)}
                                    className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-control text-[11px] font-semibold text-text-muted hover:text-primary bg-bg hover:bg-primary/5 border border-border hover:border-primary/30 transition-colors cursor-pointer whitespace-nowrap"
                                  >
                                    <ArrowRightLeft className="w-3 h-3 shrink-0" />
                                    <span>Pindah Rak</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Desktop Rack Pagination Footer (Only if > 8 cards) */}
                      {totalPages > 1 && (
                        <div className="px-4 py-2.5 bg-surface border-t border-border flex items-center justify-between text-xs">
                          <div className="text-[11px] text-text-muted">
                            Menampilkan <span className="font-semibold text-text-main tabular-nums">{startIndex + 1} - {Math.min(startIndex + DESKTOP_CARDS_PER_PAGE, rackItems.length)}</span> dari <span className="font-semibold text-text-main tabular-nums">{rackItems.length}</span> barang
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setDesktopRakPages((prev) => ({
                                  ...prev,
                                  [rakDef.id]: Math.max(1, safeCurrentPage - 1),
                                }))
                              }
                              disabled={safeCurrentPage <= 1}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-control text-xs font-semibold border border-border text-text-main bg-bg hover:bg-surface disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                              <span>Sebelumnya</span>
                            </button>

                            <div className="flex items-center gap-1">
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() =>
                                    setDesktopRakPages((prev) => ({
                                      ...prev,
                                      [rakDef.id]: p,
                                    }))
                                  }
                                  className={`w-7 h-7 rounded-control text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                                    safeCurrentPage === p
                                      ? 'bg-primary text-white border border-primary shadow-subtle'
                                      : 'text-text-muted hover:text-text-main bg-bg border border-border hover:bg-surface'
                                  }`}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setDesktopRakPages((prev) => ({
                                  ...prev,
                                  [rakDef.id]: Math.min(totalPages, safeCurrentPage + 1),
                                }))
                              }
                              disabled={safeCurrentPage >= totalPages}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-control text-xs font-semibold border border-border text-text-main bg-bg hover:bg-surface disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                            >
                              <span>Selanjutnya</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Table View */
            <>
              {/* Mobile Table View: Filtered to current active rak with uniform 420px height & pagination */}
              <div className="sm:hidden bg-surface rounded-card border border-border overflow-hidden shadow-xs flex flex-col">
                <div className="px-3.5 py-2.5 bg-bg border-b border-border flex items-center justify-between">
                  <span className="text-xs font-bold text-text-main">
                    Daftar ATK - {RAK_DEFINITIONS[mobileRakIndex].id}
                  </span>
                  <span className="text-[11px] font-semibold text-text-muted">
                    {getRackFilteredItems(RAK_DEFINITIONS[mobileRakIndex].id).length} item
                  </span>
                </div>
                <div className="overflow-x-auto h-[420px] overflow-y-auto">
                  <table className="w-full min-w-[560px] text-left text-xs">
                    <thead className="bg-bg/80 border-b border-border text-text-muted font-semibold uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0 backdrop-blur-xs">
                      <tr>
                        <th className="px-3 py-2 whitespace-nowrap">Kode</th>
                        <th className="px-3 py-2 min-w-[160px]">Nama Barang</th>
                        <th className="px-3 py-2 text-center whitespace-nowrap">Stok</th>
                        <th className="px-3 py-2 text-center whitespace-nowrap">Status</th>
                        <th className="px-3 py-2 text-center whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {getRackFilteredItems(RAK_DEFINITIONS[mobileRakIndex].id).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-text-muted">
                            Tidak ada barang di rak ini
                          </td>
                        </tr>
                      ) : (
                        getRackFilteredItems(RAK_DEFINITIONS[mobileRakIndex].id).map((item) => {
                          const isOutOfStock = item.stok === 0;
                          const isLowStock = !isOutOfStock && item.stok <= item.stok_minimum;

                          return (
                            <tr key={item.id} className="hover:bg-bg/50 transition-colors">
                              <td className="px-3 py-2 font-mono font-semibold text-text-muted whitespace-nowrap text-[11px]">
                                {item.kode || 'ATK'}
                              </td>
                              <td className="px-3 py-2 font-medium text-text-main min-w-[160px]">
                                {item.nama}
                              </td>
                              <td className="px-3 py-2 text-center font-mono font-semibold tabular-nums whitespace-nowrap text-[11px]">
                                {item.stok} {item.satuan}
                              </td>
                              <td className="px-3 py-2 text-center whitespace-nowrap">
                                <div className="flex justify-center whitespace-nowrap">
                                  {isOutOfStock ? (
                                    <Badge variant="habis" className="whitespace-nowrap shrink-0">Habis (0)</Badge>
                                  ) : isLowStock ? (
                                    <Badge variant="menipis" className="whitespace-nowrap shrink-0">Menipis ({item.stok})</Badge>
                                  ) : (
                                    <span className="text-[11px] font-medium text-success inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                                      <span>Aman</span>
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => setMoveItem(item)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-control text-xs font-semibold text-primary hover:bg-primary/10 border border-primary/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                                >
                                  <ArrowRightLeft className="w-3 h-3 shrink-0" />
                                  <span>Pindah</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Pagination Controls */}
                <div className="px-3 sm:px-4 py-2.5 bg-surface border-t border-border flex items-center justify-between gap-2 text-xs select-none">
                  <button
                    type="button"
                    onClick={() => handleMobilePageChange(mobileRakIndex - 1)}
                    disabled={mobileRakIndex === 0}
                    className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-control text-xs font-semibold border border-border text-text-main bg-bg hover:bg-surface disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shrink-0 min-h-[34px] active:scale-[0.98]"
                    title="Rak Sebelumnya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden min-[360px]:inline">Sebelumnya</span>
                  </button>

                  <div className="flex items-center justify-center gap-1.5 font-medium text-text-muted text-xs whitespace-nowrap shrink-0">
                    <span>Halaman</span>
                    <span className="font-bold text-primary font-mono text-xs px-2 py-0.5 rounded-badge bg-primary/10 border border-primary/20">
                      {mobileRakIndex + 1}
                    </span>
                    <span>dari</span>
                    <span className="font-semibold text-text-main font-mono text-xs">4</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleMobilePageChange(mobileRakIndex + 1)}
                    disabled={mobileRakIndex === RAK_KEYS.length - 1}
                    className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-control text-xs font-semibold border border-border text-text-main bg-bg hover:bg-surface disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shrink-0 active:scale-[0.98] min-h-[34px]"
                    title="Rak Selanjutnya"
                  >
                    <span className="hidden min-[360px]:inline">Selanjutnya</span>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>
              </div>

              {/* Desktop Table View: Full Table */}
              <div className="hidden sm:block bg-surface rounded-card border border-border overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="bg-bg border-b border-border text-text-muted font-semibold uppercase text-[10px] tracking-wider whitespace-nowrap">
                      <tr>
                        <th className="px-4 py-3 whitespace-nowrap">Kode</th>
                        <th className="px-4 py-3 min-w-[200px]">Nama Barang</th>
                        <th className="px-4 py-3 whitespace-nowrap">Kategori</th>
                        <th className="px-4 py-3 whitespace-nowrap">Lokasi Penempatan</th>
                        <th className="px-4 py-3 text-center whitespace-nowrap min-w-[100px]">Stok Fisik</th>
                        <th className="px-4 py-3 text-center whitespace-nowrap min-w-[125px]">Status Stok</th>
                        <th className="px-4 py-3 text-center whitespace-nowrap min-w-[80px]">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredItems.map((item) => {
                        const isOutOfStock = item.stok === 0;
                        const isLowStock = !isOutOfStock && item.stok <= item.stok_minimum;

                        return (
                          <tr key={item.id} className="hover:bg-bg/50 transition-colors">
                            <td className="px-4 py-3 font-mono font-semibold text-text-muted whitespace-nowrap">
                              {item.kode || 'ATK'}
                            </td>
                            <td className="px-4 py-3 font-medium text-text-main min-w-[200px]">
                              {item.nama}
                            </td>
                            <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                              {item.kategori || 'Umum'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <RakBadge rak={item.resolvedRak} size="sm" />
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-semibold tabular-nums whitespace-nowrap">
                              {item.stok} {item.satuan}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <div className="flex justify-center whitespace-nowrap">
                                {isOutOfStock ? (
                                  <Badge variant="habis" className="whitespace-nowrap shrink-0">Habis (0)</Badge>
                                ) : isLowStock ? (
                                  <Badge variant="menipis" className="whitespace-nowrap shrink-0">Menipis ({item.stok})</Badge>
                                ) : (
                                  <span className="text-[11px] font-medium text-success inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                                    <span>Aman</span>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setMoveItem(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-control text-xs font-semibold text-primary hover:bg-primary/10 border border-primary/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                              >
                                <ArrowRightLeft className="w-3 h-3 shrink-0" />
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
            </>
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
