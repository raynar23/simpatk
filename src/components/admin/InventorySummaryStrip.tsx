// Clean, icon-free inventory summary strip conforming to unified stock definitions
'use client';

import React from 'react';
import { formatNumber } from '@/lib/utils';
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
  // Unified low stock definition: stok <= stok_minimum (includes 0)
  const lowStockCount = items.filter((it) => it.stok <= it.stok_minimum).length;
  const outOfStockCount = items.filter((it) => it.stok === 0).length;
  const totalPhysicalStock = items.reduce(
    (sum, it) => sum + (it.stok || 0),
    0
  );

  const cards = [
    {
      label: 'Total Jenis Barang',
      value: formatNumber(totalItems),
      sublabel: 'Katalog terdaftar',
      color: 'text-text-main',
    },
    {
      label: 'Stok Menipis',
      value: formatNumber(lowStockCount),
      sublabel: 'Pada atau di bawah minimum',
      color: 'text-warning',
    },
    {
      label: 'Stok Habis',
      value: formatNumber(outOfStockCount),
      sublabel: 'Perlu pengadaan segera',
      color: 'text-danger',
    },
    {
      label: 'Total Fisik ATK',
      value: formatNumber(totalPhysicalStock),
      sublabel: 'Akumulasi seluruh unit fisik',
      color: 'text-text-main',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 select-none">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-surface rounded-card border border-border p-3.5 flex flex-col justify-between"
        >
          <div className="text-text-muted mb-1">
            <span className="text-[11px] font-medium">{card.label}</span>
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
      ))}
    </div>
  );
}
