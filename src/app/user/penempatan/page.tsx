// User Penempatan ATK page: Read-only storage rack locator for division requisitioners
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Layers,
  Search,
  Package,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  Send,
  BookOpen,
  LayoutDashboard,
  Info,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { RakBadge } from '@/components/admin/RakBadge';
import {
  RAK_DEFINITIONS,
  RAK_KEYS,
  type RakKey,
  getItemRak,
  getSavedRakOverrides,
} from '@/lib/rakUtils';
import type { Item } from '@/lib/types';

export default function UserPenempatanPage() {
  const supabase = createClient();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [rakOverrides, setRakOverrides] = useState<Record<string, RakKey>>({});

  // Active filters
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
      if (selectedRakTab !== 'semua' && it.resolvedRak !== selectedRakTab) {
        return false;
      }

      const isOut = it.stok === 0;
      const isLow = !isOut && it.stok <= it.stok_minimum;

      if (stockFilter === 'aman' && (isLow || isOut)) return false;
      if (stockFilter === 'perhatian' && !isLow && !isOut) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = it.nama.toLowerCase().includes(query);
        const matchCode = (it.kode || '').toLowerCase().includes(query);
        const matchCat = (it.kategori || '').toLowerCase().includes(query);
        const matchRak = it.resolvedRak.toLowerCase().includes(query);
        if (!matchName && !matchCode && !matchCat && !matchRak) return false;
      }

      return true;
    });
  }, [enrichedItems, selectedRakTab, stockFilter, searchQuery]);

  // Items partitioned by rack
  const itemsByRack = useMemo(() => {
    const map: Record<RakKey, typeof enrichedItems> = {
      'Rak 1': [],
      'Rak 2': [],
      'Rak 3': [],
      'Rak 4': [],
    };
    filteredItems.forEach((it) => {
      map[it.resolvedRak].push(it);
    });
    return map;
  }, [filteredItems]);

  const getRackFilteredItems = (rakId: RakKey) => {
    return enrichedItems.filter((it) => {
      if (it.resolvedRak !== rakId) return false;

      const isOut = it.stok === 0;
      const isLow = !isOut && it.stok <= it.stok_minimum;

      if (stockFilter === 'aman' && (isLow || isOut)) return false;
      if (stockFilter === 'perhatian' && !isLow && !isOut) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = it.nama.toLowerCase().includes(query);
        const matchCode = (it.kode || '').toLowerCase().includes(query);
        const matchCat = (it.kategori || '').toLowerCase().includes(query);
        if (!matchName && !matchCode && !matchCat) return false;
      }

      return true;
    });
  };

  const ITEMS_PER_RACK_PAGE = 8;

  const headerActions = (
    <div className="flex items-center gap-2">
      <Link
        href="/user"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold bg-primary hover:bg-primary-dark text-white transition-colors"
      >
        <Send className="w-3.5 h-3.5" />
        <span>Buat Permintaan</span>
      </Link>
      <Link
        href="/user/katalog"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-medium text-text-main bg-surface border border-border hover:bg-bg transition-colors"
      >
        <BookOpen className="w-3.5 h-3.5 text-text-muted" />
        <span>Katalog ATK</span>
      </Link>
    </div>
  );

  return (
    <PageContainer
      title="Penempatan ATK"
      subtitle="Denah dan tata letak rak penyimpanan ATK di kantor General Affairs (GA)"
      actions={headerActions}
      contentClassName="space-y-4"
    >
      <div className="h-full flex flex-col gap-3 min-h-0">
        {/* Informative Guidance Banner for Division Users (Hidden on mobile) */}
        <div className="hidden sm:flex rounded-control bg-primary-soft/30 border border-primary/20 p-3 sm:p-3.5 items-start gap-3 shrink-0">
          <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs text-text-main leading-relaxed">
            <p className="font-semibold text-primary-dark">
              Lokasi Fisik Inventaris ATK di Ruang General Affairs (GA)
            </p>
            <p className="text-text-muted mt-0.5">
              Denah rak ini memudahkan Anda mengetahui letak barang sebelum mengambil atau saat serah terima. Klik tombol{' '}
              <span className="font-semibold text-text-main">Ajukan Barang</span> pada setiap kartu untuk langsung mengisi formulir permintaan.
            </p>
          </div>
        </div>

        {/* Filter Toolbar: Rack Segmented Tabs, Search & Status Filter */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 shrink-0">
          {/* Rack Selector Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => handleSelectRak('semua')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-control text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedRakTab === 'semua'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface border border-border text-text-muted hover:text-text-main hover:bg-bg'
              }`}
            >
              Semua Rak ({enrichedItems.length})
            </button>
            {RAK_KEYS.map((k) => {
              const count = itemsByRack[k]?.length || 0;
              const isActive = selectedRakTab === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleSelectRak(k)}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-control text-[11px] sm:text-xs font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-primary text-white font-semibold shadow-xs'
                      : 'bg-surface border border-border text-text-muted hover:text-text-main hover:bg-bg'
                  }`}
                >
                  <span>{k}</span>
                  <span
                    className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-bg text-text-muted'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Bar & Stock Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-72 md:w-80 lg:w-96">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau kode..."
                className="w-full pl-8 pr-3 py-1.5 text-[11px] sm:text-xs rounded-control border border-border bg-surface text-text-main placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary min-h-[32px] sm:min-h-[34px]"
              />
            </div>

            {/* Custom Dropdown with Clean Right Icon Spacing and Adjusted Mobile Font */}
            <div className="relative inline-flex items-center shrink-0">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                className="appearance-none pl-3 pr-8.5 py-1.5 text-[11px] sm:text-xs font-medium rounded-control border border-border bg-surface text-text-main focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer min-h-[32px] sm:min-h-[34px]"
              >
                <option value="semua">Semua Status</option>
                <option value="aman">Stok Aman</option>
                <option value="perhatian">Perhatian (Menipis/Habis)</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2.5 w-3.5 h-3.5 text-text-muted"
                strokeWidth={1.5}
              />
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
          ) : (
            <>
              {/* Mobile View: 1 Rak per Halaman with Uniform Height (420px) */}
              <div className="sm:hidden">
                {(() => {
                  const mobileDef = RAK_DEFINITIONS[mobileRakIndex];
                  const mobileRackItems = getRackFilteredItems(mobileDef.id);

                  return (
                    <div className="bg-surface rounded-card border border-border overflow-hidden shadow-xs flex flex-col">
                      {/* Shelf Header */}
                      <div className={`px-3.5 py-3 border-b flex items-center justify-between gap-2 ${mobileDef.theme.headerBg}`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-control bg-white shadow-xs border border-border flex items-center justify-center text-primary shrink-0">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="text-xs font-bold text-text-main">{mobileDef.nama}</h3>
                              <span className="text-[10px] font-semibold text-text-muted">
                                ({mobileRackItems.length} jenis ATK)
                              </span>
                            </div>
                            <p className="text-[10px] text-text-muted truncate">{mobileDef.deskripsi}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/90 border border-border/80 text-text-muted shrink-0">
                          {mobileDef.zona}
                        </span>
                      </div>

                      {/* Shelf Slots Container with UNIFORM FIXED HEIGHT */}
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
                          <div className="grid grid-cols-1 gap-2.5">
                            {mobileRackItems.map((item) => {
                              const isOutOfStock = item.stok === 0;
                              const isLowStock = !isOutOfStock && item.stok <= item.stok_minimum;

                              return (
                                <div
                                  key={item.id}
                                  className="bg-surface rounded-control border border-border p-3 flex flex-col justify-between gap-2 shadow-2xs"
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
                                    <h4 className="text-xs font-bold text-text-main line-clamp-1">{item.nama}</h4>
                                    <div className="mt-1 flex items-center justify-between text-[11px]">
                                      <span className="text-text-muted">Ketersediaan:</span>
                                      <span className={`font-semibold ${isOutOfStock || isLowStock ? 'text-danger' : 'text-primary'}`}>
                                        {item.stok} {item.satuan}
                                      </span>
                                    </div>
                                  </div>
                                  <Link
                                    href={`/user?item=${item.id}&qty=1`}
                                    className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-control text-xs font-semibold bg-primary hover:bg-primary-dark text-white transition-colors"
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>Ajukan Barang Ini</span>
                                  </Link>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Mobile Pagination Bar */}
                      <div className="px-3.5 py-2.5 border-t border-border bg-surface flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleMobilePageChange(mobileRakIndex - 1)}
                          disabled={mobileRakIndex === 0}
                          className="px-2.5 py-1 text-xs font-medium rounded-control border border-border bg-bg text-text-main disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface transition-colors flex items-center gap-1"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Sebelumnya</span>
                        </button>
                        <span className="text-xs font-semibold text-text-main">
                          Halaman {mobileRakIndex + 1} dari {RAK_KEYS.length} ({currentMobileRak})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMobilePageChange(mobileRakIndex + 1)}
                          disabled={mobileRakIndex === RAK_KEYS.length - 1}
                          className="px-2.5 py-1 text-xs font-medium rounded-control border border-border bg-bg text-text-main disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface transition-colors flex items-center gap-1"
                        >
                          <span>Selanjutnya</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Desktop View: Multi-Rack Display with 8 Cards Pagination per Rack */}
              <div className="hidden sm:flex flex-col gap-4">
                {RAK_DEFINITIONS.filter((def) => selectedRakTab === 'semua' || selectedRakTab === def.id).map((def) => {
                  const rackItems = getRackFilteredItems(def.id);
                  const currentPage = desktopRakPages[def.id] || 1;
                  const totalPages = Math.max(1, Math.ceil(rackItems.length / ITEMS_PER_RACK_PAGE));
                  const validPage = Math.min(currentPage, totalPages);
                  const paginatedItems = rackItems.slice(
                    (validPage - 1) * ITEMS_PER_RACK_PAGE,
                    validPage * ITEMS_PER_RACK_PAGE
                  );

                  return (
                    <div
                      key={def.id}
                      className="bg-surface rounded-card border border-border overflow-hidden shadow-xs"
                    >
                      {/* Shelf Header */}
                      <div className={`px-4 py-3 border-b flex items-center justify-between gap-3 ${def.theme.headerBg}`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-control bg-white shadow-xs border border-border flex items-center justify-center text-primary shrink-0">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-bold text-text-main">{def.nama}</h3>
                              <span className="text-[11px] font-semibold text-text-muted">
                                ({rackItems.length} jenis ATK)
                              </span>
                            </div>
                            <p className="text-[11px] text-text-muted truncate">{def.deskripsi}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/90 border border-border/80 text-text-muted">
                            {def.zona}
                          </span>
                        </div>
                      </div>

                      {/* Items Grid (3 Cards per row on desktop) */}
                      <div className="p-3.5 bg-bg/40">
                        {rackItems.length === 0 ? (
                          <div className="p-6 text-center text-text-muted text-xs">
                            <Package className="w-7 h-7 text-text-muted/40 mx-auto mb-1.5" />
                            <p className="font-semibold text-text-main">Tidak ada barang di rak ini</p>
                            <p className="text-[11px] mt-0.5">
                              {searchQuery.trim()
                                ? 'Tidak ada barang yang cocok dengan pencarian pada rak ini.'
                                : 'Belum ada barang ATK yang ditempatkan pada rak ini.'}
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {paginatedItems.map((item) => {
                              const isOutOfStock = item.stok === 0;
                              const isLowStock = !isOutOfStock && item.stok <= item.stok_minimum;

                              return (
                                <div
                                  key={item.id}
                                  className="bg-surface rounded-control border border-border hover:border-primary/40 p-3 flex flex-col justify-between gap-2.5 shadow-2xs transition-all"
                                >
                                  <div>
                                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                                      <span className="font-mono font-semibold text-text-muted bg-bg px-1.5 py-0.5 rounded border border-border/70 text-[10px]">
                                        {item.kode || 'ATK'}
                                      </span>
                                      <RakBadge rak={item.resolvedRak} size="sm" />
                                    </div>
                                    <h4 className="text-xs font-bold text-text-main line-clamp-1">{item.nama}</h4>
                                    <p className="text-[10px] text-text-muted mt-0.5">{item.kategori || 'Umum'}</p>

                                    <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                                      <span className="text-text-muted">Ketersediaan:</span>
                                      <span
                                        className={`font-semibold tabular-nums ${
                                          isOutOfStock || isLowStock ? 'text-danger' : 'text-primary'
                                        }`}
                                      >
                                        {item.stok} {item.satuan}
                                      </span>
                                    </div>
                                  </div>

                                  <Link
                                    href={`/user?item=${item.id}&qty=1`}
                                    className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-control text-xs font-semibold bg-primary hover:bg-primary-dark text-white transition-colors cursor-pointer"
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>Ajukan Barang Ini</span>
                                  </Link>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Desktop Pagination per Rack */}
                      {totalPages > 1 && (
                        <div className="px-3.5 py-2 border-t border-border/70 bg-surface flex items-center justify-between text-xs">
                          <span className="text-[11px] text-text-muted">
                            Menampilkan {(validPage - 1) * ITEMS_PER_RACK_PAGE + 1} -{' '}
                            {Math.min(validPage * ITEMS_PER_RACK_PAGE, rackItems.length)} dari {rackItems.length} barang
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setDesktopRakPages((prev) => ({
                                  ...prev,
                                  [def.id]: Math.max(1, validPage - 1),
                                }))
                              }
                              disabled={validPage === 1}
                              className="px-2 py-1 rounded border border-border text-[11px] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg transition-colors flex items-center gap-0.5"
                            >
                              <ChevronLeft className="w-3 h-3" />
                              <span>Prev</span>
                            </button>
                            <span className="px-2 text-[11px] font-semibold text-text-main">
                              {validPage} / {totalPages}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setDesktopRakPages((prev) => ({
                                  ...prev,
                                  [def.id]: Math.min(totalPages, validPage + 1),
                                }))
                              }
                              disabled={validPage === totalPages}
                              className="px-2 py-1 rounded border border-border text-[11px] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg transition-colors flex items-center gap-0.5"
                            >
                              <span>Next</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
