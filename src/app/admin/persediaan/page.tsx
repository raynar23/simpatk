// Admin inventory management page with summary strip, DataTable, stock adjustments, and item creation
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Minus, Edit, ChevronDown, Calendar, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { InventorySummaryStrip } from '@/components/admin/InventorySummaryStrip';
import { StockAdjustModal } from '@/components/admin/StockAdjustModal';
import { ItemUpsertModal, ATK_CATEGORIES } from '@/components/admin/ItemUpsertModal';
import { RakBadge } from '@/components/admin/RakBadge';
import { getItemRak, getSavedRakOverrides, type RakKey } from '@/lib/rakUtils';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatRupiah, isLowStock, formatDateShort, formatDate } from '@/lib/utils';
import type { Item } from '@/lib/types';

export default function AdminPersediaanPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);

  // Modals state
  const [adjustItem, setAdjustItem] = useState<Item | null>(null);
  const [adjustMode, setAdjustMode] = useState<'tambah' | 'kurangi' | null>(null);
  const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
  const [isUpsertOpen, setIsUpsertOpen] = useState(false);

  // Filters & pagination
  const [categoryFilter, setCategoryFilter] = useState<string>('semua');
  const [dateFilter, setDateFilter] = useState<'semua' | '7d' | '30d' | '6m' | '1y' | 'custom'>('semua');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'semua' | 'menipis' | 'habis' | 'normal'>('semua');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortColumn, setSortColumn] = useState<string>('kode');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [rakOverrides, setRakOverrides] = useState<Record<string, RakKey>>({});

  // Load items from Supabase
  useEffect(() => {
    let ignore = false;

    async function fetchItems() {
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .order('nama', { ascending: true });

        if (ignore) return;
        if (error) {
          showToast('Gagal memuat katalog barang.', 'error');
          return;
        }

        if (data) setItems(data as Item[]);
      } catch {
        if (!ignore) showToast('Gagal menghubungi server.', 'error');
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

  // Reference timestamp initialized once on mount for pure date calculations
  const [referenceTimestamp] = useState(() => Date.now());

  // Step 1: Filter by registration / creation date range
  const dateFilteredItems = useMemo(() => {
    if (dateFilter === 'semua') return items;

    if (dateFilter === 'custom') {
      if (!customStartDate && !customEndDate) return items;
      const start = customStartDate ? new Date(`${customStartDate}T00:00:00+07:00`).getTime() : null;
      const end = customEndDate ? new Date(`${customEndDate}T23:59:59.999+07:00`).getTime() : null;

      return items.filter((it) => {
        if (!it.created_at) return true;
        const time = new Date(it.created_at).getTime();
        if (start !== null && time < start) return false;
        if (end !== null && time > end) return false;
        return true;
      });
    }

    let days = 30;
    if (dateFilter === '7d') days = 7;
    else if (dateFilter === '30d') days = 30;
    else if (dateFilter === '6m') days = 180;
    else if (dateFilter === '1y') days = 365;

    const cutoff = referenceTimestamp - days * 86400000;

    return items.filter((it) => {
      if (!it.created_at) return true;
      const time = new Date(it.created_at).getTime();
      return time >= cutoff;
    });
  }, [items, dateFilter, customStartDate, customEndDate, referenceTimestamp]);

  // Dynamic low & out stock counts calculated on the date-filtered items
  const lowCount = useMemo(() => dateFilteredItems.filter((it) => isLowStock(it.stok, it.stok_minimum)).length, [dateFilteredItems]);
  const outCount = useMemo(() => dateFilteredItems.filter((it) => it.stok === 0).length, [dateFilteredItems]);

  // Step 2: Filter by category, stock status, search query, and sorting
  const filteredItems = useMemo(() => {
    let result = [...dateFilteredItems];

    // Category filter
    if (categoryFilter !== 'semua') {
      result = result.filter((it) => it.kategori === categoryFilter);
    }

    // Stock status filter
    if (stockStatusFilter === 'habis') {
      result = result.filter((it) => it.stok === 0);
    } else if (stockStatusFilter === 'menipis') {
      result = result.filter((it) => isLowStock(it.stok, it.stok_minimum));
    } else if (stockStatusFilter === 'normal') {
      result = result.filter((it) => it.stok > it.stok_minimum);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (it) =>
          it.nama.toLowerCase().includes(q) ||
          it.kode?.toLowerCase().includes(q) ||
          it.kategori?.toLowerCase().includes(q) ||
          it.satuan.toLowerCase().includes(q)
      );
    }

    // Sorting
    result.sort((a, b) => {
      const valA = a[sortColumn as keyof Item];
      const valB = b[sortColumn as keyof Item];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      const comp = valA < valB ? -1 : 1;
      return sortDirection === 'asc' ? comp : -comp;
    });

    return result;
  }, [dateFilteredItems, categoryFilter, stockStatusFilter, searchQuery, sortColumn, sortDirection]);

  // Paginated data slice
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  // DataTable column definitions
  const columns: ColumnDef<Item>[] = [
    {
      id: 'kode',
      header: 'Kode',
      accessorKey: 'kode',
      isSortable: true,
      className: 'min-w-[90px]',
      csvValue: (row) => row.kode || '',
      cell: (row) => (
        <span className="font-mono font-semibold text-primary text-[11px] whitespace-nowrap">
          {row.kode || 'ATK-000'}
        </span>
      ),
    },
    {
      id: 'nama',
      header: 'Nama Barang',
      accessorKey: 'nama',
      isSortable: true,
      className: 'min-w-[240px]',
      csvValue: (row) => row.nama,
      cell: (row) => (
        <span className="font-medium text-text-main leading-snug">
          {row.nama}
        </span>
      ),
    },
    {
      id: 'kategori',
      header: 'Kategori',
      accessorKey: 'kategori',
      isSortable: true,
      className: 'min-w-[130px]',
      csvValue: (row) => row.kategori || 'Lainnya',
      cell: (row) => (
        <span className="text-text-muted text-[11px] whitespace-nowrap">{row.kategori || 'Lainnya'}</span>
      ),
    },
    {
      id: 'lokasi_rak',
      header: 'Lokasi Rak',
      className: 'min-w-[110px]',
      csvValue: (row) => getItemRak(row, rakOverrides),
      cell: (row) => (
        <RakBadge rak={getItemRak(row, rakOverrides)} size="sm" />
      ),
    },
    {
      id: 'satuan',
      header: 'Satuan',
      accessorKey: 'satuan',
      className: 'min-w-[80px]',
      csvValue: (row) => row.satuan,
      cell: (row) => <span className="text-text-muted text-xs whitespace-nowrap">{row.satuan}</span>,
    },
    {
      id: 'stok',
      header: 'Stok',
      accessorKey: 'stok',
      align: 'center',
      isSortable: true,
      className: 'min-w-[80px]',
      csvValue: (row) => row.stok,
      cell: (row) => {
        const isLow = row.stok <= row.stok_minimum;
        const isZero = row.stok === 0;
        return (
          <div className="text-center">
            <span
              className={`tabular-nums font-bold whitespace-nowrap ${
                isZero ? 'text-danger' : isLow ? 'text-danger' : 'text-text-main'
              }`}
            >
              {row.stok}
            </span>
          </div>
        );
      },
    },
    {
      id: 'stok_minimum',
      header: 'Min. Stok',
      accessorKey: 'stok_minimum',
      align: 'center',
      isSortable: true,
      className: 'min-w-[90px]',
      csvValue: (row) => row.stok_minimum,
      cell: (row) => (
        <div className="text-center">
          <span className="tabular-nums text-text-muted text-xs whitespace-nowrap">
            {row.stok_minimum}
          </span>
        </div>
      ),
    },
    {
      id: 'harga_satuan',
      header: 'Harga Satuan',
      accessorKey: 'harga_satuan',
      isNumeric: true,
      isSortable: true,
      className: 'min-w-[120px]',
      csvValue: (row) => row.harga_satuan || 0,
      cell: (row) => (
        <span className="tabular-nums text-text-main text-xs whitespace-nowrap">
          {row.harga_satuan ? formatRupiah(row.harga_satuan) : '-'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status Stok',
      align: 'center',
      className: 'min-w-[105px]',
      csvValue: (row) =>
        row.stok === 0 ? 'Habis' : row.stok <= row.stok_minimum ? 'Menipis' : 'Normal',
      cell: (row) => (
        <div className="flex justify-center">
          {row.stok === 0 ? (
            <Badge variant="habis" />
          ) : row.stok <= row.stok_minimum ? (
            <Badge variant="menipis" />
          ) : (
            <Badge variant="normal" />
          )}
        </div>
      ),
    },
    {
      id: 'created_at',
      header: 'Tgl Masuk',
      accessorKey: 'created_at',
      isSortable: true,
      className: 'min-w-[110px]',
      csvValue: (row) => (row.created_at ? formatDate(row.created_at) : '-'),
      cell: (row) => (
        <span className="tabular-nums text-text-muted text-[11px] whitespace-nowrap">
          {row.created_at ? formatDateShort(row.created_at) : '-'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      className: 'min-w-[125px]',
      excludeFromCsv: true,
      isNumeric: true,
      cell: (row) => (
        <div className="inline-flex items-center gap-1 justify-end">
          {/* Tambah Stok */}
          <button
            type="button"
            title="Tambah Stok"
            onClick={(e) => {
              e.stopPropagation();
              setAdjustItem(row);
              setAdjustMode('tambah');
            }}
            className="w-7 h-7 rounded-control border border-border bg-surface hover:bg-bg text-text-main flex items-center justify-center transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Kurangi Stok */}
          <button
            type="button"
            title="Kurangi Stok"
            disabled={row.stok <= 0}
            onClick={(e) => {
              e.stopPropagation();
              setAdjustItem(row);
              setAdjustMode('kurangi');
            }}
            className="w-7 h-7 rounded-control border border-border bg-surface hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed text-text-main flex items-center justify-center transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Ubah Barang */}
          <button
            type="button"
            title="Ubah Data Barang"
            onClick={(e) => {
              e.stopPropagation();
              setItemToEdit(row);
              setIsUpsertOpen(true);
            }}
            className="w-7 h-7 rounded-control border border-border bg-surface hover:bg-bg text-text-muted hover:text-text-main flex items-center justify-center transition-colors cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title="Persediaan"
      subtitle="Katalog barang operasional, posisi stok fisik, dan batas minimum pengadaan"
      actions={
        <button
          type="button"
          onClick={() => {
            setItemToEdit(null);
            setIsUpsertOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-control bg-primary hover:bg-primary-dark text-white shadow-xs transition-colors cursor-pointer min-h-[32px]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Barang</span>
        </button>
      }
      contentClassName="space-y-3.5"
    >
      {/* Summary metric strip synchronized with date filter */}
      <InventorySummaryStrip items={dateFilteredItems} isLoading={isLoading} />

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={paginatedItems}
        exportData={filteredItems}
        totalCount={filteredItems.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSortChange={(col, dir) => {
          setSortColumn(col);
          setSortDirection(dir);
        }}
        searchValue={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setPage(1);
        }}
        searchPlaceholder="Cari kode, nama barang, atau satuan..."
        filterControls={
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            {/* Dropdown Kategori & Dropdown Tanggal: Berada di 1 Baris yang Sama pada Mobile */}
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
              {/* Kategori Filter Dropdown with balanced chevron */}
              <div className="relative w-full sm:w-auto">
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full sm:w-auto appearance-none pl-3 pr-7 py-1.5 text-xs rounded-control border border-border bg-bg text-text-main focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary min-h-[34px] cursor-pointer truncate"
                  title="Filter berdasarkan kategori ATK"
                >
                  <option value="semua">Semua Kategori</option>
                  {ATK_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted"
                  strokeWidth={1.5}
                />
              </div>

              {/* Filter Tanggal Dropdown with calendar icon and balanced chevron */}
              <div className="relative w-full sm:w-auto">
                <Calendar
                  className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted"
                  strokeWidth={1.5}
                />
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value as typeof dateFilter);
                    setPage(1);
                  }}
                  className="w-full sm:w-auto appearance-none pl-7 pr-7 py-1.5 text-xs rounded-control border border-border bg-bg text-text-main focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary min-h-[34px] cursor-pointer truncate"
                  title="Filter berdasarkan rentang waktu pendaftaran"
                >
                  <option value="semua">Semua Waktu</option>
                  <option value="7d">7 Hari Terakhir</option>
                  <option value="30d">30 Hari Terakhir</option>
                  <option value="6m">6 Bulan Terakhir</option>
                  <option value="1y">1 Tahun Terakhir</option>
                  <option value="custom">Kustom Tanggal...</option>
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted"
                  strokeWidth={1.5}
                />
              </div>
            </div>

            {/* Custom Date Inputs if 'custom' is active */}
            {dateFilter === 'custom' && (
              <div className="inline-flex items-center gap-1.5 bg-bg px-2 py-1 rounded-control border border-border text-xs">
                <span className="text-text-muted text-[11px]">Dari:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="px-1.5 py-0.5 text-xs rounded-control border border-border bg-surface text-text-main focus:outline-none focus:ring-1 focus:ring-primary"
                  title="Tanggal Awal"
                />
                <span className="text-text-muted text-[11px]">Sampai:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="px-1.5 py-0.5 text-xs rounded-control border border-border bg-surface text-text-main focus:outline-none focus:ring-1 focus:ring-primary"
                  title="Tanggal Akhir"
                />
              </div>
            )}

            {/* Reset Date Filter Button */}
            {(dateFilter !== 'semua' || customStartDate || customEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setDateFilter('semua');
                  setCustomStartDate('');
                  setCustomEndDate('');
                  setPage(1);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-control border border-border bg-surface hover:bg-bg text-text-muted hover:text-text-main transition-colors cursor-pointer min-h-[32px]"
                title="Kembalikan filter tanggal ke Semua Waktu"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Tanggal</span>
              </button>
            )}

            {/* Status Stok Filter Buttons with Dynamic Counts */}
            <div className="inline-flex p-0.5 rounded-control bg-bg border border-border text-xs">
              {[
                { key: 'semua', label: 'Semua Stok' },
                { key: 'menipis', label: `Menipis (${lowCount})` },
                { key: 'habis', label: `Habis (${outCount})` },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setStockStatusFilter(opt.key as typeof stockStatusFilter);
                    setPage(1);
                  }}
                  className={`px-2 py-0.5 rounded-badge text-[11px] transition-colors cursor-pointer ${
                    stockStatusFilter === opt.key
                      ? 'bg-surface text-text-main shadow-xs font-semibold'
                      : 'text-text-muted hover:text-text-main'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        }
        isLoading={isLoading}
        emptyMessage="Tidak ada barang ATK yang sesuai filter."
        csvFilename="katalog_persediaan_atk.csv"
        enableDynamicHeight={true}
        tableClassName="min-w-[1080px]"
        className="flex-1 min-h-0"
      />

      {/* Stock adjustment modal (Tambah/Kurangi Stok) */}
      <StockAdjustModal
        item={adjustItem}
        mode={adjustMode}
        onClose={() => {
          setAdjustItem(null);
          setAdjustMode(null);
        }}
        onSuccess={(updated) => {
          setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
        }}
      />

      {/* Item creation & edit modal */}
      <ItemUpsertModal
        itemToEdit={itemToEdit}
        isOpen={isUpsertOpen}
        onClose={() => {
          setIsUpsertOpen(false);
          setItemToEdit(null);
        }}
        existingItems={items}
        onSuccess={(savedItem, isNew) => {
          if (isNew) {
            setItems((prev) => [...prev, savedItem]);
          } else {
            setItems((prev) => prev.map((it) => (it.id === savedItem.id ? savedItem : it)));
          }
        }}
      />
    </PageContainer>
  );
}

