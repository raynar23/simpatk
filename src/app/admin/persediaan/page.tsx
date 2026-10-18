// Admin inventory management page with summary strip, DataTable, stock adjustments, and item creation
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Minus, Edit, PackagePlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { InventorySummaryStrip } from '@/components/admin/InventorySummaryStrip';
import { StockAdjustModal } from '@/components/admin/StockAdjustModal';
import { ItemUpsertModal, ATK_CATEGORIES } from '@/components/admin/ItemUpsertModal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatRupiah, isLowStock } from '@/lib/utils';
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
  const [stockStatusFilter, setStockStatusFilter] = useState<'semua' | 'menipis' | 'habis' | 'normal'>('semua');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortColumn, setSortColumn] = useState<string>('kode');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

    return () => {
      ignore = true;
    };
  }, [supabase, showToast]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Category filter
    if (categoryFilter !== 'semua') {
      result = result.filter((it) => it.kategori === categoryFilter);
    }

    // Stock status filter
    if (stockStatusFilter === 'habis') {
      result = result.filter((it) => it.stok === 0);
    } else if (stockStatusFilter === 'menipis') {
      result = result.filter((it) => it.stok > 0 && isLowStock(it.stok, it.stok_minimum));
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
  }, [items, categoryFilter, stockStatusFilter, searchQuery, sortColumn, sortDirection]);

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
      cell: (row) => (
        <span className="font-mono font-semibold text-primary text-[11px]">
          {row.kode || 'ATK-000'}
        </span>
      ),
    },
    {
      id: 'nama',
      header: 'Nama Barang',
      accessorKey: 'nama',
      isSortable: true,
      cell: (row) => (
        <span className="font-medium text-text-main truncate max-w-[220px]">
          {row.nama}
        </span>
      ),
    },
    {
      id: 'kategori',
      header: 'Kategori',
      accessorKey: 'kategori',
      isSortable: true,
      cell: (row) => (
        <span className="text-text-muted text-[11px]">{row.kategori || 'Lainnya'}</span>
      ),
    },
    {
      id: 'satuan',
      header: 'Satuan',
      accessorKey: 'satuan',
      cell: (row) => <span className="text-text-muted text-xs">{row.satuan}</span>,
    },
    {
      id: 'stok',
      header: 'Stok',
      accessorKey: 'stok',
      isNumeric: true,
      isSortable: true,
      cell: (row) => {
        const isLow = row.stok <= row.stok_minimum;
        const isZero = row.stok === 0;
        return (
          <span
            className={`tabular-nums font-bold ${
              isZero ? 'text-danger' : isLow ? 'text-danger' : 'text-text-main'
            }`}
          >
            {row.stok}
          </span>
        );
      },
    },
    {
      id: 'stok_minimum',
      header: 'Min. Stok',
      accessorKey: 'stok_minimum',
      isNumeric: true,
      isSortable: true,
      cell: (row) => (
        <span className="tabular-nums text-text-muted text-xs">
          {row.stok_minimum}
        </span>
      ),
    },
    {
      id: 'harga_satuan',
      header: 'Harga Satuan',
      accessorKey: 'harga_satuan',
      isNumeric: true,
      isSortable: true,
      cell: (row) => (
        <span className="tabular-nums text-text-main text-xs">
          {row.harga_satuan ? formatRupiah(row.harga_satuan) : '-'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status Stok',
      cell: (row) => {
        if (row.stok === 0) return <Badge variant="habis" />;
        if (row.stok <= row.stok_minimum) return <Badge variant="menipis" />;
        return <Badge variant="normal" />;
      },
    },
    {
      id: 'actions',
      header: 'Aksi',
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
    <div className="p-3 sm:p-5 max-w-[1440px] mx-auto space-y-4 select-none">
      <div>
        <h2 className="text-sm font-semibold text-text-main tracking-tight">
          Katalog Persediaan ATK
        </h2>
        <p className="text-[11px] text-text-muted mt-0.5">
          Kelola stok fisik, sesuaikan kuantitas manual, dan daftarkan jenis alat tulis kantor
        </p>
      </div>

      {/* Summary metric strip */}
      <InventorySummaryStrip items={items} isLoading={isLoading} />

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={paginatedItems}
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
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Kategori Filter Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 text-xs rounded-control border border-border bg-bg text-text-main focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary min-h-[32px] cursor-pointer"
            >
              <option value="semua">Semua Kategori</option>
              {ATK_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Status Stok Filter Buttons */}
            <div className="inline-flex p-0.5 rounded-control bg-bg border border-border text-xs">
              {[
                { key: 'semua', label: 'Semua Stok' },
                { key: 'menipis', label: 'Menipis' },
                { key: 'habis', label: 'Habis (0)' },
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
        actionControls={
          <button
            type="button"
            onClick={() => {
              setItemToEdit(null);
              setIsUpsertOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-control bg-primary hover:bg-primary-dark text-white shadow-xs transition-colors cursor-pointer min-h-[32px]"
          >
            <PackagePlus className="w-3.5 h-3.5" />
            <span>Tambah Barang</span>
          </button>
        }
        isLoading={isLoading}
        emptyMessage="Tidak ada barang ATK yang sesuai filter."
        csvFilename="katalog_persediaan_atk.csv"
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
    </div>
  );
}
