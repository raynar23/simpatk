// Admin shopping list page for low stock procurement recommendations
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Printer,
  Download,
  CheckSquare,
  Square,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageContainer } from '@/components/layout/PageContainer';
import { formatRupiah, isLowStock } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import type { Item } from '@/lib/types';

interface ShoppingItem extends Item {
  saranBeli: number;
  estimasiBiaya: number;
}

export default function AdminDaftarBelanjaPage() {
  const supabase = createClient();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch low stock items
  useEffect(() => {
    let ignore = false;

    async function loadItems() {
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .order('stok', { ascending: true });

        if (ignore) return;
        if (error) {
          showToast('Gagal memuat persediaan barang.', 'error');
          return;
        }

        if (data) {
          setItems(data as Item[]);
          // Default select all low stock items
          const lowList = (data as Item[]).filter((it) => isLowStock(it.stok, it.stok_minimum));
          setSelectedIds(new Set(lowList.map((it) => it.id)));
        }
      } catch {
        if (!ignore) showToast('Gagal menghubungi server.', 'error');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadItems();

    return () => {
      ignore = true;
    };
  }, [supabase, showToast]);

  // Derive shopping items with formula: (stok_minimum * 2) - stok
  const shoppingList: ShoppingItem[] = useMemo(() => {
    return items
      .filter((it) => isLowStock(it.stok, it.stok_minimum))
      .map((it) => {
        const saranBeli = Math.max(1, it.stok_minimum * 2 - it.stok);
        const estimasiBiaya = saranBeli * (it.harga_satuan || 0);
        return {
          ...it,
          saranBeli,
          estimasiBiaya,
        };
      });
  }, [items]);

  // Selected totals
  const selectedItems = useMemo(() => {
    return shoppingList.filter((it) => selectedIds.has(it.id));
  }, [shoppingList, selectedIds]);

  const totalEstimatedCost = useMemo(() => {
    return selectedItems.reduce((acc, curr) => acc + curr.estimasiBiaya, 0);
  }, [selectedItems]);

  const isAllSelected = shoppingList.length > 0 && selectedIds.size === shoppingList.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(shoppingList.map((it) => it.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Export selected to CSV
  const handleExportCsv = () => {
    if (selectedItems.length === 0) return;

    const headers = [
      'Kode Barang',
      'Nama Barang',
      'Kategori',
      'Satuan',
      'Stok Saat Ini',
      'Stok Minimum',
      'Saran Jumlah Beli',
      'Harga Satuan (IDR)',
      'Estimasi Total Biaya (IDR)',
    ];

    const rows = selectedItems.map((it) => [
      `"${it.kode}"`,
      `"${it.nama.replace(/"/g, '""')}"`,
      `"${it.kategori}"`,
      `"${it.satuan}"`,
      it.stok,
      it.stok_minimum,
      it.saranBeli,
      it.harga_satuan || 0,
      it.estimasiBiaya,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `daftar_belanja_atk_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <PageContainer
      title="Daftar Belanja"
      subtitle="Rekomendasi otomatis untuk barang yang telah mencapai atau di bawah batas minimum stok"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={selectedItems.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-control border border-border bg-surface hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-text-main cursor-pointer min-h-[32px]"
          >
            <Download className="w-3.5 h-3.5 text-text-muted" />
            <span>Ekspor CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={selectedItems.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-control bg-primary hover:bg-primary-dark text-white shadow-xs transition-colors cursor-pointer min-h-[32px]"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Dokumen</span>
          </button>
        </div>
      }
      className="print:p-0 print:m-0"
    >
      {/* Printable Sheet Container */}
      <div className="bg-surface rounded-card border border-border flex-1 min-h-0 flex flex-col overflow-hidden print:border-none print:shadow-none">
        {/* Printable Official Header: Shown ONLY when printing */}
        <div className="hidden print:flex p-4 sm:p-6 border-b border-border bg-surface items-start justify-between">
          <div className="space-y-1">
            <div className="relative h-9 w-44 mb-1">
              <Image
                src="/logo/pelindo-color.png"
                alt="Logo Pelindo Terminal Petikemas"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
            <h1 className="text-base font-bold text-text-main tracking-tight uppercase">
              Rekomendasi Pengadaan Alat Tulis Kantor
            </h1>
            <p className="text-xs text-text-muted">
              Departemen General Affairs - PT Pelindo Terminal Petikemas
            </p>
          </div>
          <div className="text-right text-xs text-text-muted space-y-0.5">
            <p>
              Tanggal:{' '}
              <span className="font-semibold text-text-main">
                {new Intl.DateTimeFormat('id-ID', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'Asia/Jakarta',
                }).format(new Date())}
              </span>
            </p>
            <p>Formula Beli: (Min. Stok × 2) - Stok Saat Ini</p>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="h-8 bg-border/40 rounded-badge animate-pulse" />
              ))}
            </div>
          ) : shoppingList.length === 0 ? (
            <div className="py-12 text-center text-xs text-text-muted flex flex-col items-center gap-1">
              <p className="font-semibold text-text-main">Seluruh Stok Barang Terpenuhi</p>
              <p>Tidak ada barang yang berada pada batas minimum stok saat ini.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-bg text-text-muted text-[11px] uppercase border-b border-border">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center print:hidden">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="cursor-pointer text-text-main"
                      aria-label="Pilih semua barang"
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4 text-text-muted" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3 font-semibold">Kode</th>
                  <th className="py-2.5 px-3 font-semibold">Nama Barang</th>
                  <th className="py-2.5 px-3 font-semibold">Kategori</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Stok Fisik</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Min. Stok</th>
                  <th className="py-2.5 px-3 font-semibold text-right text-primary">Saran Beli</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Harga Satuan</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Estimasi Biaya</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-surface">
                {shoppingList.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const isOut = item.stok === 0;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => toggleSelectItem(item.id)}
                      className={`hover:bg-bg/40 transition-colors cursor-pointer ${
                        isSelected ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center print:hidden">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectItem(item.id);
                          }}
                          className="cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 text-text-muted" />
                          )}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-primary text-[11px]">
                        {item.kode}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-text-main">
                        <div className="flex items-center gap-1.5">
                          {isOut && (
                            <span className="text-[10px] px-1 py-0.2 bg-danger-soft text-danger border border-danger/20 rounded font-semibold">
                              Habis
                            </span>
                          )}
                          <span>{item.nama}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-text-muted text-[11px]">{item.kategori}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-bold text-danger">
                        {item.stok} <span className="font-normal text-text-muted">{item.satuan}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-text-muted">
                        {item.stok_minimum} {item.satuan}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-bold text-primary">
                        +{item.saranBeli} {item.satuan}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-text-main">
                        {item.harga_satuan ? formatRupiah(item.harga_satuan) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-text-main">
                        {item.estimasiBiaya > 0 ? formatRupiah(item.estimasiBiaya) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Selected Bottom Summary */}
        {shoppingList.length > 0 && (
          <div className="p-3.5 bg-bg border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            <div className="text-text-muted">
              <span>
                <strong className="text-text-main font-semibold">{selectedItems.length}</strong> dari{' '}
                {shoppingList.length} barang dipilih untuk pengadaan.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-text-muted">Total Estimasi Anggaran:</span>
              <span className="text-base font-bold text-primary tabular-nums">
                {formatRupiah(totalEstimatedCost)}
              </span>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

