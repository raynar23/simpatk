// Modal for adjusting stock (Tambah Stok or Kurangi Stok)
'use client';

import React, { useState } from 'react';
import { Plus, Minus, Loader2, AlertCircle } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import type { Item } from '@/lib/types';

interface StockAdjustModalProps {
  item: Item | null;
  mode: 'tambah' | 'kurangi' | null;
  onClose: () => void;
  onSuccess: (updatedItem: Item) => void;
}

export function StockAdjustModal({
  item,
  mode,
  onClose,
  onSuccess,
}: StockAdjustModalProps) {
  const supabase = createClient();
  const { showToast } = useToast();
  const [amount, setAmount] = useState<string>('1');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!item || !mode) return null;

  const isTambah = mode === 'tambah';
  const title = isTambah ? `Tambah Stok: ${item.nama}` : `Kurangi Stok: ${item.nama}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(amount, 10);

    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('Jumlah penyesuaian harus angka bulat lebih dari 0.');
      return;
    }

    if (!isTambah && qty > item.stok) {
      setErrorMsg(`Pengurangan tidak boleh melebihi sisa stok saat ini (${item.stok} ${item.satuan}).`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const rpcName = isTambah ? 'tambah_stok' : 'kurangi_stok';
      const { data, error } = await supabase.rpc(rpcName, {
        p_item_id: item.id,
        p_jumlah: qty,
      });

      if (error) {
        setErrorMsg(error.message || 'Gagal mengubah stok di database.');
        return;
      }

      showToast(
        `Stok ${item.nama} berhasil ${isTambah ? 'ditambah' : 'dikurangi'} ${qty} ${item.satuan}.`,
        'success'
      );

      onSuccess({
        ...item,
        stok: data?.stok ?? (isTambah ? item.stok + qty : item.stok - qty),
      });
      onClose();
    } catch {
      setErrorMsg('Terjadi kesalahan jaringan saat memperbarui stok.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={!!mode}
      onClose={onClose}
      title={title}
      description={`Stok fisik saat ini: ${item.stok} ${item.satuan} (Minimum: ${item.stok_minimum} ${item.satuan})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div>
          <label htmlFor="adjust_amount" className="block text-xs font-semibold text-text-main mb-1.5">
            Jumlah {isTambah ? 'Penambahan' : 'Pengurangan'} ({item.satuan})
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAmount((prev) => String(Math.max(1, (parseInt(prev, 10) || 1) - 1)))}
              className="w-9 h-9 rounded-control border border-border bg-bg hover:bg-surface flex items-center justify-center text-text-muted hover:text-text-main transition-colors cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              id="adjust_amount"
              type="number"
              min="1"
              max={!isTambah ? item.stok : undefined}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 text-center font-bold text-sm rounded-control border border-border bg-bg text-text-main py-1.5 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary min-h-[36px]"
              required
            />
            <button
              type="button"
              onClick={() => setAmount((prev) => String((parseInt(prev, 10) || 0) + 1))}
              className="w-9 h-9 rounded-control border border-border bg-bg hover:bg-surface flex items-center justify-center text-text-muted hover:text-text-main transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-2.5 rounded-control bg-danger-soft border border-danger/20 text-xs text-danger">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded-control border border-border hover:bg-bg text-text-muted hover:text-text-main transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-control text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer ${
              isTambah
                ? 'bg-primary hover:bg-primary-dark'
                : 'bg-danger hover:bg-danger/90'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>Konfirmasi {isTambah ? 'Tambah' : 'Kurangi'}</span>
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
