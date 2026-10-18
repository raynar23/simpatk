// Inventory summary strip displaying total items, low stock, out of stock, and valuation
import React from 'react';
import { Boxes, AlertTriangle, XCircle, Banknote } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import type { Item } from '@/lib/types';

interface InventorySummaryStripProps {
  items: Item[];
  isLoading: boolean;
}

export function InventorySummaryStrip({ items, isLoading }: InventorySummaryStripProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 select-none">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="h-20 bg-surface rounded-card border border-border p-3 animate-pulse flex flex-col justify-between"
          >
            <div className="h-3 w-20 bg-border/60 rounded-badge" />
            <div className="h-6 w-14 bg-border/80 rounded-badge" />
          </div>
        ))}
      </div>
    );
  }

  const totalItems = items.length;
  const lowStockCount = items.filter((it) => it.stok > 0 && it.stok <= it.stok_minimum).length;
  const outOfStockCount = items.filter((it) => it.stok === 0).length;
  const totalValuation = items.reduce(
    (sum, it) => sum + (it.stok || 0) * (it.harga_satuan || 0),
    0
  );

  const cards = [
    {
      label: 'Total Jenis Barang',
      value: totalItems.toLocaleString('id-ID'),
      sublabel: 'Katalog terdaftar',
      icon: Boxes,
      color: 'text-primary',
    },
    {
      label: 'Stok Menipis',
      value: lowStockCount.toLocaleString('id-ID'),
      sublabel: 'Mendekati batas minimum',
      icon: AlertTriangle,
      color: 'text-warning',
    },
    {
      label: 'Stok Habis (0)',
      value: outOfStockCount.toLocaleString('id-ID'),
      sublabel: 'Perlu pengadaan segera',
      icon: XCircle,
      color: 'text-danger',
    },
    {
      label: 'Nilai Persediaan',
      value: formatRupiah(totalValuation),
      sublabel: 'Total estimasi aset fisik',
      icon: Banknote,
      color: 'text-text-main',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 select-none">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-surface rounded-card border border-border p-3.5 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-text-muted mb-1">
              <span className="text-[11px] font-medium">{card.label}</span>
              <Icon className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
            </div>
            <div className="flex items-baseline justify-between gap-1 my-0.5">
              <span className={`text-xl font-bold tabular-nums tracking-tight ${card.color}`}>
                {card.value}
              </span>
            </div>
            <span className="text-[10px] text-text-muted truncate mt-0.5">
              {card.sublabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}
