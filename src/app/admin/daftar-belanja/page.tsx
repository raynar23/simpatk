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
import { isLowStock } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import type { Item } from '@/lib/types';

interface ShoppingItem extends Item {
  saranBeli: number;
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

        if (error) throw error;

        if (!ignore && data) {
          setItems(data as Item[]);
          // Pre-select all low stock items
          const lowStockIds = (data as Item[])
            .filter((i) => isLowStock(i.stok, i.stok_minimum))
            .map((i) => i.id);
          setSelectedIds(new Set(lowStockIds));
        }
      } catch (err) {
        console.error('Failed to load items for shopping list:', err);
        showToast('Gagal memuat rekomendasi belanja', 'error');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadItems();

    return () => {
      ignore = true;
    };
  }, [supabase, showToast]);

  // Compute shopping recommendations
  const shoppingList: ShoppingItem[] = useMemo(() => {
    return items
      .filter((i) => isLowStock(i.stok, i.stok_minimum))
      .map((i) => {
        // Formula: Target = 2 * stok_minimum. Saran Beli = Math.max(0, Target - stok)
        const target = i.stok_minimum * 2;
        const saranBeli = Math.max(target - i.stok, 0);

        return {
          ...i,
          saranBeli,
        };
      })
      .filter((i) => i.saranBeli > 0);
  }, [items]);

  const selectedItems = useMemo(() => {
    return shoppingList.filter((item) => selectedIds.has(item.id));
  }, [shoppingList, selectedIds]);

  const isAllSelected =
    shoppingList.length > 0 && selectedIds.size === shoppingList.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(shoppingList.map((i) => i.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleExportCsv = () => {
    if (selectedItems.length === 0) return;

    try {
      const headers = [
        'Kode',
        'Nama Barang',
        'Kategori',
        'Stok Fisik',
        'Stok Minimum',
        'Satuan',
        'Saran Pembelian',
      ];

      const rows = selectedItems.map((item) => [
        `"${item.kode}"`,
        `"${item.nama.replace(/"/g, '""')}"`,
        `"${item.kategori}"`,
        item.stok,
        item.stok_minimum,
        `"${item.satuan}"`,
        item.saranBeli,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join(
        '\n'
      );
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `daftar-belanja-atk-${new Date().toISOString().split('T')[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`Berhasil mengekspor ${selectedItems.length} barang`, 'success');
    } catch (err) {
      console.error('Export CSV error:', err);
      showToast('Gagal mengekspor CSV', 'error');
    }
  };

  const handlePrint = () => {
    try {
      document.title = 'SIMPATK - PT Terminal Petikemas Surabaya Daftar Belanja';
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
      } else {
        alert('Fitur cetak dokumen tidak didukung oleh browser ini. Silakan buka melalui browser Chrome atau Safari.');
      }
    } catch (err) {
      console.error('Print error:', err);
    }
  };

  return (
    <PageContainer
      title="Daftar Belanja"
      subtitle="Rekomendasi otomatis untuk barang yang telah mencapai atau di bawah batas minimum stok"
      actions={
        <div className="flex items-center gap-2 flex-wrap print:hidden">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={selectedItems.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-control border border-border bg-surface hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-text-main cursor-pointer min-h-[36px] sm:min-h-[32px] touch-manipulation select-none"
          >
            <Download className="w-3.5 h-3.5 text-text-muted" />
            <span>Ekspor CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={selectedItems.length === 0}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-control bg-primary hover:bg-primary-dark active:scale-[0.98] text-white shadow-xs transition-all cursor-pointer min-h-[38px] sm:min-h-[34px] touch-manipulation select-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Dokumen</span>
          </button>
        </div>
      }
      className="print:p-0 print:m-0"
    >
      {/* Printable Sheet Container */}
      <div className="bg-surface rounded-card border border-border flex-1 min-h-0 flex flex-col overflow-hidden print:border-none print:shadow-none print:bg-white print:overflow-visible">
        {/* Printable Official Header: Shown ONLY when printing (Standard Dokumen RKS / RAB Pelindo) */}
        <div className="hidden print:flex flex-col gap-1.5 pt-2 pb-6 mb-8 border-b-2 border-black bg-white">
          {/* Top Row: Information on Left, Logo on Right */}
          <div className="flex items-start justify-between gap-4">
            {/* Pojok Atas Kiri: Tanggal Cetak & Formula Beli */}
            <div className="text-left text-xs text-text-muted space-y-1.5 pt-3">
              <p className="text-xs">
                Tanggal Cetak:{' '}
                <span className="font-semibold text-text-main">
                  {new Intl.DateTimeFormat('id-ID', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'Asia/Jakarta',
                  }).format(new Date())}
                </span>
              </p>
              <p className="text-xs">
                Formula Beli:{' '}
                <span className="font-semibold text-text-main">
                  (Min. Stok * 2) - Stok Saat Ini
                </span>
              </p>
            </div>

            {/* Pojok Atas Kanan: Logo Pelindo TPS (diperbesar 50%, tanpa terpotong & padding terkompensasi) */}
            <div className="relative h-[72px] w-64 sm:w-72 shrink-0 pr-1">
              <Image
                src="/logo/pelindo-color.png"
                alt="Logo PT Terminal Petikemas Surabaya"
                fill
                className="object-contain object-right"
                priority
              />
            </div>
          </div>

          {/* Document Title Block */}
          <div className="pt-1.5 border-t border-gray-200">
            <h1 className="text-lg font-bold text-text-main tracking-tight uppercase">
              Daftar Belanja Pengadaan Alat Tulis Kantor
            </h1>
            <p className="text-xs text-text-muted mt-1">
              Departemen General Affairs - PT Terminal Petikemas Surabaya
            </p>
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
            <table className="w-full min-w-[700px] text-left text-xs border-collapse print:min-w-0 print:w-full">
              <thead className="bg-bg text-text-muted text-[11px] uppercase border-b border-border">
                <tr>
                  <th className="py-2.5 px-3 w-10 min-w-[40px] text-center print:hidden">
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
                  <th className="py-2.5 px-3 font-semibold min-w-[90px] whitespace-nowrap">Kode</th>
                  <th className="py-2.5 px-3 font-semibold min-w-[280px]">Nama Barang</th>
                  <th className="py-2.5 px-3 font-semibold min-w-[130px] whitespace-nowrap">Kategori</th>
                  <th className="py-2.5 px-3 font-semibold text-center min-w-[95px] whitespace-nowrap">Stok Fisik</th>
                  <th className="py-2.5 px-3 font-semibold text-center min-w-[95px] whitespace-nowrap">Min. Stok</th>
                  <th className="py-2.5 px-3 font-semibold text-center text-primary min-w-[100px] whitespace-nowrap">Saran Beli</th>
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
                      <td className="py-2.5 px-3 text-center print:hidden whitespace-nowrap">
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
                      <td className="py-2.5 px-3 font-mono font-semibold text-primary text-[11px] whitespace-nowrap">
                        {item.kode}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-text-main min-w-[280px]">
                        <div className="flex items-center gap-2">
                          {isOut && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-danger-soft text-danger border border-danger/20 rounded font-semibold whitespace-nowrap shrink-0">
                              Habis
                            </span>
                          )}
                          <span className="leading-snug">{item.nama}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-text-muted text-[11px] whitespace-nowrap">{item.kategori}</td>
                      <td className="py-2.5 px-3 text-center tabular-nums font-bold text-danger whitespace-nowrap">
                        {item.stok} <span className="font-normal text-text-muted">{item.satuan}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums text-text-muted whitespace-nowrap">
                        {item.stok_minimum} {item.satuan}
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums font-bold text-primary whitespace-nowrap">
                        +{item.saranBeli} {item.satuan}
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
          <div className="p-3.5 bg-bg border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 print:border-t-2 print:border-black print:bg-white print:pt-6 print:mt-6">
            <div className="text-text-muted">
              <span>
                <strong className="text-text-main font-semibold">{selectedItems.length}</strong> dari{' '}
                {shoppingList.length} barang dipilih untuk pengadaan.
              </span>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
