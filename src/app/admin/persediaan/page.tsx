// Admin inventory management page with live search, stock adjustment RPCs, and item creation
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Minus,
  Search,
  PackagePlus,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AdminToolbar } from '@/components/ui/AdminToolbar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { isLowStock } from '@/lib/utils';
import type { Item } from '@/lib/types';

export default function AdminPersediaanPage() {
  const supabase = createClient();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [modalType, setModalType] = useState<'tambah' | 'kurangi' | 'baru' | null>(null);

  // Form inputs
  const [adjustAmount, setAdjustAmount] = useState<string>('1');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New item form
  const [newNama, setNewNama] = useState('');
  const [newSatuan, setNewSatuan] = useState('pcs');
  const [newStokAwal, setNewStokAwal] = useState('0');
  const [newStokMinimum, setNewStokMinimum] = useState('5');

  // Load items from Supabase on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchItems() {
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .order('nama', { ascending: true });

        if (error) {
          if (isMounted) showToast('Gagal memuat katalog barang.', 'error');
          return;
        }
        if (isMounted) setItems((data as Item[]) || []);
      } catch {
        if (isMounted) showToast('Gagal menghubungi server.', 'error');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchItems();

    return () => {
      isMounted = false;
    };
  }, [supabase, showToast]);

  // Filtered items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (it) => it.nama.toLowerCase().includes(q) || it.satuan.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  // Handle Tambah Stok RPC
  const handleTambahStok = async () => {
    if (!activeItem) return;
    const amount = parseInt(adjustAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setFormError('Jumlah penambahan harus lebih dari 0.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const { data, error } = await supabase.rpc('tambah_stok', {
        p_item_id: activeItem.id,
        p_jumlah: amount,
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      showToast(`Stok ${activeItem.nama} berhasil ditambah ${amount} ${activeItem.satuan}.`, 'success');
      setItems((prev) => prev.map((it) => (it.id === activeItem.id ? (data as Item) : it)));
      closeModal();
    } catch {
      setFormError('Terjadi kendala saat menambah stok.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Kurangi Stok RPC
  const handleKurangiStok = async () => {
    if (!activeItem) return;
    const amount = parseInt(adjustAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setFormError('Jumlah pengurangan harus lebih dari 0.');
      return;
    }

    if (amount > activeItem.stok) {
      setFormError(`Jumlah melebihi stok saat ini (${activeItem.stok} ${activeItem.satuan}).`);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const { data, error } = await supabase.rpc('kurangi_stok', {
        p_item_id: activeItem.id,
        p_jumlah: amount,
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      showToast(`Stok ${activeItem.nama} berhasil dikurangi ${amount} ${activeItem.satuan}.`, 'success');
      setItems((prev) => prev.map((it) => (it.id === activeItem.id ? (data as Item) : it)));
      closeModal();
    } catch {
      setFormError('Terjadi kendala saat mengurangi stok.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Tambah Barang Baru
  const handleTambahBarangBaru = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim()) {
      setFormError('Nama barang wajib diisi.');
      return;
    }

    const stok = parseInt(newStokAwal, 10);
    const minStok = parseInt(newStokMinimum, 10);

    if (isNaN(stok) || stok < 0) {
      setFormError('Stok awal minimal 0.');
      return;
    }

    if (isNaN(minStok) || minStok < 0) {
      setFormError('Stok minimum minimal 0.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const { data, error } = await supabase
        .from('items')
        .insert({
          nama: newNama.trim(),
          satuan: newSatuan.trim().toLowerCase() || 'pcs',
          stok: stok,
          stok_minimum: minStok,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          setFormError('Barang dengan nama ini sudah terdaftar.');
        } else {
          setFormError(error.message);
        }
        return;
      }

      showToast(`Barang ${newNama} berhasil ditambahkan ke katalog.`, 'success');
      setItems((prev) => [data as Item, ...prev].sort((a, b) => a.nama.localeCompare(b.nama)));
      closeModal();
    } catch {
      setFormError('Gagal menyimpan barang baru.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setActiveItem(null);
    setModalType(null);
    setAdjustAmount('1');
    setFormError(null);
    setNewNama('');
    setNewSatuan('pcs');
    setNewStokAwal('0');
    setNewStokMinimum('5');
  };

  return (
    <div>
      <AdminToolbar
        title="Persediaan ATK"
        subtitle="Kelola katalog barang, pantau ketersediaan, dan catat perubahan stok"
        actions={
          <Button
            variant="primary"
            onClick={() => {
              closeModal();
              setModalType('baru');
            }}
          >
            <PackagePlus className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
            <span>Tambah Barang</span>
          </Button>
        }
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-6 space-y-4">
        {/* Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari barang atau satuan..."
              className="w-full rounded-control border border-border bg-surface pl-9 pr-3 py-2 text-base sm:text-xs text-text-main placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px] sm:min-h-[36px] transition-colors"
            />
          </div>

          <div className="text-xs text-text-muted">
            Total terdaftar: <strong className="text-text-main tabular-nums">{filteredItems.length}</strong> jenis
          </div>
        </div>

        {/* Inventory List */}
        <div className="bg-surface rounded-card border border-border shadow-subtle overflow-hidden">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Boxes}
                title="Barang tidak ditemukan"
                description={
                  searchQuery
                    ? `Tidak ada barang yang cocok dengan kata kunci "${searchQuery}".`
                    : 'Belum ada barang ATK terdaftar di sistem.'
                }
                action={
                  searchQuery ? (
                    <Button variant="secondary" size="sm" onClick={() => setSearchQuery('')}>
                      Hapus Pencarian
                    </Button>
                  ) : null
                }
              />
            </div>
          ) : (
            <div>
              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-bg text-text-muted border-b border-border font-medium">
                    <tr>
                      <th className="py-3 px-4">Nama Barang</th>
                      <th className="py-3 px-4">Satuan</th>
                      <th className="py-3 px-4 text-right">Stok Saat Ini</th>
                      <th className="py-3 px-4 text-right">Stok Minimum</th>
                      <th className="py-3 px-4 text-center">Status Stok</th>
                      <th className="py-3 px-4 text-right">Aksi Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredItems.map((item) => {
                      const low = isLowStock(item.stok, item.stok_minimum);
                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            low ? 'bg-danger-soft/20 hover:bg-danger-soft/35' : 'hover:bg-bg/60'
                          }`}
                        >
                          <td className="py-3 px-4 font-medium text-text-main">
                            {item.nama}
                          </td>
                          <td className="py-3 px-4 text-text-muted">{item.satuan}</td>
                          <td
                            className={`py-3 px-4 text-right font-bold tabular-nums whitespace-nowrap ${
                              low ? 'text-danger' : 'text-text-main'
                            }`}
                          >
                            {item.stok}
                          </td>
                          <td className="py-3 px-4 text-right text-text-muted tabular-nums whitespace-nowrap">
                            {item.stok_minimum}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <Badge variant={low ? 'menipis' : 'normal'}>
                              {low ? 'Stok Menipis' : 'Normal'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setActiveItem(item);
                                  setAdjustAmount('1');
                                  setFormError(null);
                                  setModalType('tambah');
                                }}
                                title="Tambah stok"
                              >
                                <Plus className="w-3.5 h-3.5 mr-1 text-primary" strokeWidth={1.5} />
                                Tambah
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setActiveItem(item);
                                  setAdjustAmount('1');
                                  setFormError(null);
                                  setModalType('kurangi');
                                }}
                                title="Kurangi stok"
                                disabled={item.stok === 0}
                              >
                                <Minus className="w-3.5 h-3.5 mr-1 text-danger" strokeWidth={1.5} />
                                Kurang
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View (< md) */}
              <div className="md:hidden divide-y divide-border/60">
                {filteredItems.map((item) => {
                  const low = isLowStock(item.stok, item.stok_minimum);
                  return (
                    <div
                      key={item.id}
                      className={`p-4 space-y-3 transition-colors ${
                        low ? 'bg-danger-soft/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-text-main leading-tight">
                          {item.nama}
                        </span>
                        <Badge variant={low ? 'menipis' : 'normal'}>
                          {low ? 'Stok Menipis' : 'Normal'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-bg/60 p-2.5 rounded-control">
                        <div>
                          <span className="block text-[11px] text-text-muted">Stok Saat Ini:</span>
                          <span
                            className={`text-base font-bold tabular-nums ${
                              low ? 'text-danger' : 'text-text-main'
                            }`}
                          >
                            {item.stok} <span className="text-xs font-normal text-text-muted">{item.satuan}</span>
                          </span>
                        </div>
                        <div>
                          <span className="block text-[11px] text-text-muted">Batas Minimum:</span>
                          <span className="text-base font-semibold text-text-muted tabular-nums">
                            {item.stok_minimum} <span className="text-xs font-normal">{item.satuan}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          onClick={() => {
                            setActiveItem(item);
                            setAdjustAmount('1');
                            setFormError(null);
                            setModalType('tambah');
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1 text-primary" strokeWidth={1.5} />
                          Tambah Stok
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          onClick={() => {
                            setActiveItem(item);
                            setAdjustAmount('1');
                            setFormError(null);
                            setModalType('kurangi');
                          }}
                          disabled={item.stok === 0}
                        >
                          <Minus className="w-4 h-4 mr-1 text-danger" strokeWidth={1.5} />
                          Kurangi Stok
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Tambah Stok */}
      <Dialog
        isOpen={modalType === 'tambah' && !!activeItem}
        onClose={closeModal}
        title="Tambah Stok Barang"
        description="Pencatatan penambahan stok akibat pembelian atau pasokan baru."
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={isSubmitting}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleTambahStok} isLoading={isSubmitting}>
              Simpan Penambahan
            </Button>
          </>
        }
      >
        {activeItem && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-bg rounded-control border border-border space-y-1">
              <div className="text-xs text-text-muted">Barang yang dipilih:</div>
              <div className="text-sm font-semibold text-text-main">{activeItem.nama}</div>
              <div className="text-xs text-text-muted pt-1">
                Stok saat ini: <strong className="text-text-main tabular-nums">{activeItem.stok} {activeItem.satuan}</strong>
              </div>
            </div>

            <Input
              id="tambah-jumlah"
              type="number"
              min="1"
              label={`Jumlah Penambahan (${activeItem.satuan})`}
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              error={formError || undefined}
              required
            />
          </div>
        )}
      </Dialog>

      {/* Modal Kurangi Stok */}
      <Dialog
        isOpen={modalType === 'kurangi' && !!activeItem}
        onClose={closeModal}
        title="Kurangi Stok Barang"
        description="Pencatatan pengurangan stok saat barang diberikan ke divisi pemohon."
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={isSubmitting}>
              Batal
            </Button>
            <Button variant="danger" onClick={handleKurangiStok} isLoading={isSubmitting}>
              Konfirmasi Pengurangan
            </Button>
          </>
        }
      >
        {activeItem && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-bg rounded-control border border-border space-y-1">
              <div className="text-xs text-text-muted">Barang yang dipilih:</div>
              <div className="text-sm font-semibold text-text-main">{activeItem.nama}</div>
              <div className="text-xs text-text-muted pt-1">
                Stok saat ini: <strong className="text-text-main tabular-nums">{activeItem.stok} {activeItem.satuan}</strong>
              </div>
            </div>

            <Input
              id="kurang-jumlah"
              type="number"
              min="1"
              max={activeItem.stok}
              label={`Jumlah Pengurangan (${activeItem.satuan})`}
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              error={formError || undefined}
              required
            />

            <p className="text-[11px] text-text-muted">
              Perhatian: Pengurangan tidak dapat melebihi stok yang tersedia saat ini.
            </p>
          </div>
        )}
      </Dialog>

      {/* Modal Tambah Barang Baru */}
      <Dialog
        isOpen={modalType === 'baru'}
        onClose={closeModal}
        title="Tambah Barang Baru"
        description="Mendaftarkan barang ATK baru ke dalam basis data persediaan."
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={isSubmitting}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleTambahBarangBaru} isLoading={isSubmitting}>
              Daftarkan Barang
            </Button>
          </>
        }
      >
        <form onSubmit={handleTambahBarangBaru} className="space-y-3.5 text-xs">
          {formError && (
            <div className="p-2.5 rounded-control bg-danger-soft border border-danger/20 text-danger text-xs">
              {formError}
            </div>
          )}

          <Input
            id="nama-barang"
            label="Nama Barang ATK"
            placeholder="Contoh: Kertas HVS F4 70gr"
            value={newNama}
            onChange={(e) => setNewNama(e.target.value)}
            required
          />

          <Input
            id="satuan-barang"
            label="Satuan Barang"
            placeholder="Contoh: pcs, rim, kotak, rol, lusin"
            value={newSatuan}
            onChange={(e) => setNewSatuan(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="stok-awal"
              type="number"
              min="0"
              label="Stok Awal"
              value={newStokAwal}
              onChange={(e) => setNewStokAwal(e.target.value)}
              required
            />
            <Input
              id="stok-minimum"
              type="number"
              min="0"
              label="Batas Stok Minimum"
              value={newStokMinimum}
              onChange={(e) => setNewStokMinimum(e.target.value)}
              required
            />
          </div>
        </form>
      </Dialog>
    </div>
  );
}
