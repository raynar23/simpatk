// User ATK Catalog: visual inventory explorer with category filters, availability badges, and one-click requisition
'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Send,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { getItemRak, getSavedRakOverrides, type RakKey } from '@/lib/rakUtils';
import type { Item } from '@/lib/types';

const CATEGORIES = [
  'Semua Kategori',
  'Kertas',
  'Alat Tulis',
  'Perekat dan Pemotong',
  'Arsip dan Map',
  'Perlengkapan Meja',
  'Tinta dan Toner',
  'Lainnya',
];

function UserKatalogContent() {
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();

  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua Kategori');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'safe' | 'low' | 'out'>('all');

  // Pagination: limited to 3 items per page
  const [page, setPage] = useState(1);
  const pageSize = 3;

  const [rakOverrides, setRakOverrides] = useState<Record<string, RakKey>>({});

  // Reset to first page whenever search or filter changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory, availabilityFilter]);

  // Load items from Supabase asynchronously
  useEffect(() => {
    let ignore = false;

    async function fetchItems() {
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .order('nama', { ascending: true });

        if (error) {
          if (!ignore) showToast('Gagal memuat katalog barang ATK.', 'error');
          return;
        }

        if (!ignore && data) {
          setItems(data as Item[]);
        }
      } catch {
        if (!ignore) showToast('Terjadi kesalahan jaringan saat memuat katalog.', 'error');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    fetchItems();
    setRakOverrides(getSavedRakOverrides());

    const handleRakUpdate = () => setRakOverrides(getSavedRakOverrides());
    window.addEventListener('simpatk-rak-updated', handleRakUpdate);

    return () => {
      ignore = true;
      window.removeEventListener('simpatk-rak-updated', handleRakUpdate);
    };
  }, [supabase, showToast]);

  // Compute summary KPI counts
  const summaryMetrics = useMemo(() => {
    let safeCount = 0;
    let lowCount = 0;
    let outCount = 0;
    const catSet = new Set<string>();

    items.forEach((it) => {
      if (it.kategori) catSet.add(it.kategori);
      if (it.stok === 0) {
        outCount += 1;
      } else if (it.stok <= it.stok_minimum) {
        lowCount += 1;
      } else {
        safeCount += 1;
      }
    });

    return {
      total: items.length,
      categories: catSet.size,
      safe: safeCount,
      low: lowCount,
      out: outCount,
    };
  }, [items]);

  // Filtered dataset
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      // Category filter
      if (selectedCategory !== 'Semua Kategori' && it.kategori !== selectedCategory) {
        return false;
      }

      // Availability filter
      if (availabilityFilter === 'safe' && it.stok <= it.stok_minimum) {
        return false;
      }
      if (availabilityFilter === 'low' && (it.stok === 0 || it.stok > it.stok_minimum)) {
        return false;
      }
      if (availabilityFilter === 'out' && it.stok !== 0) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nama = (it.nama || '').toLowerCase();
        const kode = (it.kode || '').toLowerCase();
        const kat = (it.kategori || '').toLowerCase();
        return nama.includes(q) || kode.includes(q) || kat.includes(q);
      }

      return true;
    });
  }, [items, selectedCategory, availabilityFilter, searchQuery]);

  // Paginated items slice (max 3 items per page)
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  // Handle direct request
  const handleRequestItem = (item: Item) => {
    router.push(`/user?item=${item.id}`);
  };

  return (
    <PageContainer
      title="Katalog ATK"
      subtitle="Daftar inventaris alat tulis kantor operasional yang tersedia untuk pengajuan divisi."
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/user"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-control text-xs font-semibold text-white bg-primary hover:bg-primary-dark transition-colors shadow-subtle"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Form Pengajuan</span>
          </Link>
        </div>
      }
    >
      <div className="h-full flex flex-col gap-3.5 min-h-0">
        {/* Mini KPI Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="bg-surface rounded-card border border-border px-3.5 py-2.5 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-text-muted">Total Katalog</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-text-main tabular-nums">
                {isLoading ? '-' : summaryMetrics.total}
              </span>
              <span className="text-[10px] text-text-muted">jenis barang</span>
            </div>
          </div>

          <div className="bg-surface rounded-card border border-border px-3.5 py-2.5 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-text-muted">Kategori Aktif</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-text-main tabular-nums">
                {isLoading ? '-' : summaryMetrics.categories}
              </span>
              <span className="text-[10px] text-text-muted">kelompok ATK</span>
            </div>
          </div>

          <div className="bg-surface rounded-card border border-border px-3.5 py-2.5 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-text-muted">Stok Aman</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-success tabular-nums">
                {isLoading ? '-' : summaryMetrics.safe}
              </span>
              <span className="text-[10px] text-text-muted">siap diserahkan</span>
            </div>
          </div>

          <div className="bg-surface rounded-card border border-border px-3.5 py-2.5 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-text-muted">Perlu Pengadaan</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-danger tabular-nums">
                {isLoading ? '-' : summaryMetrics.low + summaryMetrics.out}
              </span>
              <span className="text-[10px] text-text-muted">
                {summaryMetrics.out} habis, {summaryMetrics.low} menipis
              </span>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-surface rounded-card border border-border p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau kode ATK..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-control border border-border bg-bg text-text-main placeholder:text-text-muted/60 transition-colors focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Category Dropdown and Availability Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative inline-flex items-center">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none pl-3 pr-8.5 py-2 text-xs rounded-control border border-border bg-bg text-text-main transition-colors focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer min-h-[36px]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 w-3.5 h-3.5 text-text-muted"
                strokeWidth={1.5}
              />
            </div>

            <div className="inline-flex rounded-control bg-bg p-0.5 border border-border">
              <button
                type="button"
                onClick={() => setAvailabilityFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-control transition-all ${
                  availabilityFilter === 'all'
                    ? 'bg-surface text-text-main shadow-subtle'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setAvailabilityFilter('safe')}
                className={`px-2.5 py-1 text-xs font-medium rounded-control transition-all ${
                  availabilityFilter === 'safe'
                    ? 'bg-surface text-text-main shadow-subtle'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                Aman
              </button>
              <button
                type="button"
                onClick={() => setAvailabilityFilter('low')}
                className={`px-2.5 py-1 text-xs font-medium rounded-control transition-all ${
                  availabilityFilter === 'low'
                    ? 'bg-surface text-text-main shadow-subtle'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                Menipis
              </button>
              <button
                type="button"
                onClick={() => setAvailabilityFilter('out')}
                className={`px-2.5 py-1 text-xs font-medium rounded-control transition-all ${
                  availabilityFilter === 'out'
                    ? 'bg-surface text-text-main shadow-subtle'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                Habis
              </button>
            </div>
          </div>
        </div>

        {/* Items Cards Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
          {isLoading ? (
            <div className="w-full h-64 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              title="Barang Tidak Ditemukan"
              description="Tidak ada barang ATK yang sesuai dengan kriteria filter atau pencarian Anda."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('Semua Kategori');
                    setAvailabilityFilter('all');
                  }}
                  className="px-3.5 py-1.5 rounded-control text-xs font-semibold bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer"
                >
                  Reset Filter
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {paginatedItems.map((item) => {
                const isOutOfStock = item.stok === 0;
                const isLowStock = !isOutOfStock && item.stok <= item.stok_minimum;

                return (
                  <div
                    key={item.id}
                    className="bg-surface rounded-card border border-border p-3.5 flex flex-col justify-between hover:border-primary/40 hover:shadow-subtle transition-all group"
                  >
                    <div>
                      {/* Top Header: Code & Category */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[11px] font-semibold text-text-muted bg-bg px-2 py-0.5 rounded-control border border-border/60">
                          {item.kode || 'ATK-000'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-text-muted font-medium">
                            {item.kategori || 'Umum'}
                          </span>
                          <span className="text-text-muted/40">&bull;</span>
                          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                            {getItemRak(item, rakOverrides)}
                          </span>
                        </div>
                      </div>

                      {/* Item Name */}
                      <h3 className="text-sm font-semibold text-text-main tracking-tight line-clamp-1 mb-1">
                        {item.nama}
                      </h3>

                      {/* Stock Info */}
                      <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                        <span className="text-text-muted">Kondisi Stok:</span>
                        {isOutOfStock ? (
                          <Badge variant="habis">Stok Habis</Badge>
                        ) : isLowStock ? (
                          <Badge variant="menipis">
                            Sisa {item.stok} {item.satuan}
                          </Badge>
                        ) : (
                          <span className="text-text-muted tabular-nums">
                            Tersedia ({item.stok} {item.satuan})
                          </span>
                        )}
                      </div>

                      {/* Out of stock note */}
                      {isOutOfStock && (
                        <p className="mt-2 text-[11px] text-text-muted leading-relaxed rounded-control bg-bg/80 border border-border/50 p-2">
                          Permintaan tetap diterima dan diproses. GA akan melakukan pengadaan baru.
                        </p>
                      )}
                    </div>

                    {/* Action button */}
                    <div className="mt-3.5 pt-2 border-t border-border/60">
                      <button
                        type="button"
                        onClick={() => handleRequestItem(item)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-control bg-primary hover:bg-primary-dark text-white text-xs font-semibold shadow-subtle transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ajukan Barang Ini</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination Controls (Max 3 items per page) */}
        {!isLoading && filteredItems.length > 0 && (
          <div className="bg-surface rounded-card border border-border overflow-hidden shrink-0 shadow-xs">
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={filteredItems.length}
              onPageChange={setPage}
              className="border-t-0"
            />
          </div>
        )}
      </div>
    </PageContainer>
  );
}

export default function UserKatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      }
    >
      <UserKatalogContent />
    </Suspense>
  );
}
