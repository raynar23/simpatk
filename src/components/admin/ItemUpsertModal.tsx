// Modal form for creating a new ATK item or editing an existing catalog item
'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { RAK_DEFINITIONS, type RakKey, getItemRak, getDefaultRak, saveRakPlacement } from '@/lib/rakUtils';
import type { Item } from '@/lib/types';

export const ATK_CATEGORIES = [
  'Kertas',
  'Alat Tulis',
  'Perekat dan Pemotong',
  'Arsip dan Map',
  'Perlengkapan Meja',
  'Tinta dan Toner',
  'Lainnya',
] as const;

interface ItemUpsertModalProps {
  itemToEdit: Item | null;
  isOpen: boolean;
  onClose: () => void;
  existingItems: Item[];
  onSuccess: (item: Item, isNew: boolean) => void;
}

function ItemUpsertForm({
  itemToEdit,
  existingItems,
  onClose,
  onSuccess,
}: {
  itemToEdit: Item | null;
  existingItems: Item[];
  onClose: () => void;
  onSuccess: (item: Item, isNew: boolean) => void;
}) {
  const supabase = createClient();
  const { showToast } = useToast();

  const isEditing = !!itemToEdit;

  // Auto-generate next code ATK-XXX if creating new item
  const generateNextKode = () => {
    let maxNum = 0;
    existingItems.forEach((it) => {
      const match = it.kode?.match(/ATK-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `ATK-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const [kode, setKode] = useState(itemToEdit?.kode || generateNextKode());
  const [nama, setNama] = useState(itemToEdit?.nama || '');
  const [kategori, setKategori] = useState<string>(itemToEdit?.kategori || 'Kertas');
  const [rak, setRak] = useState<RakKey>(itemToEdit ? getItemRak(itemToEdit) : getDefaultRak('Kertas'));
  const [satuan, setSatuan] = useState(itemToEdit?.satuan || 'buah');
  const [stokAwal, setStokAwal] = useState<string>(String(itemToEdit?.stok ?? 10));
  const [stokMinimum, setStokMinimum] = useState<string>(String(itemToEdit?.stok_minimum ?? 5));
  const [hargaSatuan, setHargaSatuan] = useState<string>(String(itemToEdit?.harga_satuan ?? ''));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      setErrorMsg('Nama barang tidak boleh kosong.');
      return;
    }

    const minStock = parseInt(stokMinimum, 10);
    if (isNaN(minStock) || minStock < 0) {
      setErrorMsg('Batas minimum stok harus berupa angka non-negatif.');
      return;
    }

    const price = hargaSatuan.trim() ? parseInt(hargaSatuan, 10) : null;
    if (price !== null && (isNaN(price) || price < 0)) {
      setErrorMsg('Harga satuan harus berupa angka nominal yang valid.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (isEditing) {
        // Update item details
        const { data, error } = await supabase
          .from('items')
          .update({
            nama: nama.trim(),
            kategori,
            satuan: satuan.trim(),
            stok_minimum: minStock,
            harga_satuan: price,
          })
          .eq('id', itemToEdit.id)
          .select()
          .single();

        if (error) {
          setErrorMsg(error.message || 'Gagal memperbarui data barang.');
          return;
        }

        saveRakPlacement(data.id, rak);
        showToast(`Data ${data.nama} berhasil diperbarui.`, 'success');
        onSuccess(data as Item, false);
        onClose();
      } else {
        // Create new item
        const initialStock = parseInt(stokAwal, 10);
        if (isNaN(initialStock) || initialStock < 0) {
          setErrorMsg('Stok awal harus angka non-negatif.');
          setIsSubmitting(false);
          return;
        }

        const { data, error } = await supabase
          .from('items')
          .insert({
            kode: kode.trim(),
            nama: nama.trim(),
            kategori,
            satuan: satuan.trim(),
            stok: initialStock,
            stok_minimum: minStock,
            harga_satuan: price,
          })
          .select()
          .single();

        if (error) {
          setErrorMsg(error.message || 'Gagal menambahkan barang baru ke katalog.');
          return;
        }

        saveRakPlacement(data.id, rak);
        showToast(`Barang baru ${data.nama} (${data.kode}) berhasil ditambahkan.`, 'success');
        onSuccess(data as Item, true);
        onClose();
      }
    } catch {
      setErrorMsg('Terjadi kesalahan sistem saat menyimpan barang.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 pt-1 text-xs select-none">
      {/* Kode & Kategori Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="item_kode" className="block text-xs font-semibold text-text-main mb-1">
            Kode Barang
          </label>
          <input
            id="item_kode"
            type="text"
            value={kode}
            onChange={(e) => setKode(e.target.value.toUpperCase())}
            disabled={isEditing}
            className="w-full px-2.5 py-1.5 rounded-control border border-border bg-bg text-text-main font-mono text-xs focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
            required
          />
        </div>

        <div>
          <label htmlFor="item_kategori" className="block text-xs font-semibold text-text-main mb-1">
            Kategori
          </label>
          <div className="relative">
            <select
              id="item_kategori"
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              className="w-full appearance-none pl-3 pr-8.5 py-1.5 rounded-control border border-border bg-bg text-text-main text-xs focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {ATK_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted"
              strokeWidth={1.5}
            />
          </div>
        </div>
      </div>

      {/* Nama Barang */}
      <div>
        <label htmlFor="item_nama" className="block text-xs font-semibold text-text-main mb-1">
          Nama Barang
        </label>
        <input
          id="item_nama"
          type="text"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Contoh: Kertas HVS A4 80gr PaperOne"
          className="w-full px-2.5 py-1.5 rounded-control border border-border bg-bg text-text-main text-xs focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
          required
        />
      </div>

      {/* Penempatan Rak ATK */}
      <div>
        <label htmlFor="item_rak" className="block text-xs font-semibold text-text-main mb-1">
          Penempatan Rak Penyimpanan
        </label>
        <div className="relative">
          <select
            id="item_rak"
            value={rak}
            onChange={(e) => setRak(e.target.value as RakKey)}
            className="w-full appearance-none pl-3 pr-8.5 py-1.5 rounded-control border border-border bg-bg text-text-main text-xs focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            {RAK_DEFINITIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nama} ({r.zona})
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted"
            strokeWidth={1.5}
          />
        </div>
      </div>

      {/* Satuan & Harga Satuan */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="item_satuan" className="block text-xs font-semibold text-text-main mb-1">
            Satuan
          </label>
          <input
            id="item_satuan"
            type="text"
            value={satuan}
            onChange={(e) => setSatuan(e.target.value)}
            placeholder="rim, lusin, buah, box, dll."
            className="w-full px-2.5 py-1.5 rounded-control border border-border bg-bg text-text-main text-xs focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
            required
          />
        </div>

        <div>
          <label htmlFor="item_harga" className="block text-xs font-semibold text-text-main mb-1">
            Harga Satuan (Rp)
          </label>
          <input
            id="item_harga"
            type="number"
            min="0"
            value={hargaSatuan}
            onChange={(e) => setHargaSatuan(e.target.value)}
            placeholder="Contoh: 54000"
            className="w-full px-2.5 py-1.5 rounded-control border border-border bg-bg text-text-main text-xs focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
          />
        </div>
      </div>

      {/* Stock Fields */}
      <div className="grid grid-cols-2 gap-3">
        {!isEditing ? (
          <div>
            <label htmlFor="item_stok_awal" className="block text-xs font-semibold text-text-main mb-1">
              Stok Awal Fisik
            </label>
            <input
              id="item_stok_awal"
              type="number"
              min="0"
              value={stokAwal}
              onChange={(e) => setStokAwal(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-control border border-border bg-bg text-text-main text-xs focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
              required
            />
          </div>
        ) : (
          <div>
            <span className="block text-xs font-semibold text-text-main mb-1">
              Stok Saat Ini
            </span>
            <div className="px-2.5 py-1.5 rounded-control bg-bg/50 border border-border text-text-muted font-bold tabular-nums">
              {itemToEdit.stok} {itemToEdit.satuan}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="item_stok_min" className="block text-xs font-semibold text-text-main mb-1">
            Batas Minimum Stok
          </label>
          <input
            id="item_stok_min"
            type="number"
            min="0"
            value={stokMinimum}
            onChange={(e) => setStokMinimum(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-control border border-border bg-bg text-text-main text-xs focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
            required
          />
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-2.5 rounded-control bg-danger-soft border border-danger/20 text-xs text-danger">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Actions */}
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
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-control bg-primary hover:bg-primary-dark text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Menyimpan...</span>
            </>
          ) : (
            <span>{isEditing ? 'Simpan Perubahan' : 'Tambah ke Katalog'}</span>
          )}
        </button>
      </div>
    </form>
  );
}

export function ItemUpsertModal({
  itemToEdit,
  isOpen,
  onClose,
  existingItems,
  onSuccess,
}: ItemUpsertModalProps) {
  if (!isOpen) return null;

  const isEditing = !!itemToEdit;
  const title = isEditing ? `Ubah Data Barang: ${itemToEdit.kode}` : 'Tambah Barang ATK Baru';
  const description = isEditing
    ? 'Perbarui spesifikasi nama, kategori, satuan, harga, atau batas minimum stok.'
    : 'Daftarkan jenis alat tulis kantor baru ke dalam katalog inventaris operasional TPS.';

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} description={description}>
      <ItemUpsertForm
        key={itemToEdit ? itemToEdit.id : 'new-item'}
        itemToEdit={itemToEdit}
        existingItems={existingItems}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}
