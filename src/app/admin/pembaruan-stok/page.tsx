// Pembaruan Stok page: Dedicated interface for manual stock additions (restock/pembelian) and manual stock reductions (penyerahan/pemakaian)
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  ArrowUpDown,
  Plus,
  Minus,
  Search,
  CheckCircle2,
  AlertCircle,
  History,
  Package,
  Layers,
  Loader2,
  Calendar,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import { RakBadge } from '@/components/admin/RakBadge';
import { getItemRak, getSavedRakOverrides, type RakKey } from '@/lib/rakUtils';
import { formatDateShort, formatDate } from '@/lib/utils';
import type { Item } from '@/lib/types';

interface StockLogEntry {
  id: string;
  itemId: string;
  kode: string;
  nama: string;
  satuan: string;
  type: 'tambah' | 'kurangi';
  amount: number;
  finalStock: number;
  alasan: string;
  timestamp: string;
}

const STOCK_HISTORY_STORAGE_KEY = 'simpatk_stock_update_history_v1';

export default function AdminPembaruanStokPage() {
  const supabase = createClient();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [rakOverrides, setRakOverrides] = useState<Record<string, RakKey>>({});

  // Form states
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [mode, setMode] = useState<'tambah' | 'kurangi'>('tambah');
  const [amount, setAmount] = useState<string>('5');
  const [alasan, setAlasan] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search & history
  const [searchQuery, setSearchQuery] = useState('');
  const [historyLogs, setHistoryLogs] = useState<StockLogEntry[]>([]);

  // Load items and local stock adjustment log
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
          showToast('Gagal memuat daftar barang.', 'error');
          return;
        }

        if (data && data.length > 0) {
          setItems(data as Item[]);
          if (!selectedItemId) {
            setSelectedItemId(data[0].id);
          }
        }
      } catch {
        if (!ignore) showToast('Gagal menghubungi server.', 'error');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    fetchItems();
    setRakOverrides(getSavedRakOverrides());

    // Load history from localStorage
    try {
      const saved = localStorage.getItem(STOCK_HISTORY_STORAGE_KEY);
      if (saved) {
        setHistoryLogs(JSON.parse(saved));
      }
    } catch {
      // Ignored
    }

    return () => {
      ignore = true;
    };
  }, [supabase, showToast]);

  const selectedItem = useMemo(() => {
    return items.find((i) => i.id === selectedItemId) || null;
  }, [items, selectedItemId]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (it) =>
        it.nama.toLowerCase().includes(q) ||
        (it.kode || '').toLowerCase().includes(q) ||
        (it.kategori || '').toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      setErrorMsg('Pilih barang ATK yang ingin diperbarui.');
      return;
    }

    const qty = parseInt(amount, 10);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('Jumlah unit harus berupa angka positif lebih dari 0.');
      return;
    }

    if (mode === 'kurangi' && qty > selectedItem.stok) {
      setErrorMsg(
        `Pengurangan tidak boleh melebihi stok fisik saat ini (${selectedItem.stok} ${selectedItem.satuan}).`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const rpcName = mode === 'tambah' ? 'tambah_stok' : 'kurangi_stok';
      const { data, error } = await supabase.rpc(rpcName, {
        p_item_id: selectedItem.id,
        p_jumlah: qty,
      });

      if (error) {
        setErrorMsg(error.message || 'Gagal mengubah stok di database.');
        setIsSubmitting(false);
        return;
      }

      const updated = data as Item;

      // Update state
      setItems((prev) =>
        prev.map((it) => (it.id === updated.id ? { ...it, stok: updated.stok } : it))
      );

      // Record to history
      const newEntry: StockLogEntry = {
        id: `LOG-${Date.now()}`,
        itemId: selectedItem.id,
        kode: selectedItem.kode || 'ATK',
        nama: selectedItem.nama,
        satuan: selectedItem.satuan,
        type: mode,
        amount: qty,
        finalStock: updated.stok,
        alasan: alasan.trim() || (mode === 'tambah' ? 'Restock / Pembelian Baru' : 'Penyerahan Fisik ke Divisi'),
        timestamp: new Date().toISOString(),
      };

      const nextHistory = [newEntry, ...historyLogs.slice(0, 49)];
      setHistoryLogs(nextHistory);
      try {
        localStorage.setItem(STOCK_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
      } catch {
        // Ignored
      }

      showToast(
        `Berhasil ${mode === 'tambah' ? 'menambah' : 'mengurangi'} stok ${selectedItem.nama}: ${updated.stok} ${selectedItem.satuan}.`,
        'success'
      );

      setAlasan('');
    } catch {
      setErrorMsg('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer
      title="Pembaruan Stok"
      subtitle="Input penambahan stok pembelian baru atau pengurangan stok saat barang diserahkan ke divisi."
    >
      <div className="h-full flex flex-col gap-3.5 min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 min-h-0">
          {/* Left Panel: Form Pembaruan Stok */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="bg-surface rounded-card border border-border p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border">
                <div className="w-7 h-7 rounded-control bg-primary/10 text-primary flex items-center justify-center">
                  <ArrowUpDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-main">Form Penyesuaian Manual</h3>
                  <p className="text-[11px] text-text-muted">Kelola stok fisik secara mandiri oleh GA</p>
                </div>
              </div>

              {errorMsg && (
                <div className="mb-3 p-2.5 rounded-control bg-danger-bg border border-danger/30 text-danger text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Select Item */}
                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1.5">
                    Pilih Barang ATK
                  </label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => {
                      setSelectedItemId(e.target.value);
                      setErrorMsg(null);
                    }}
                    disabled={isLoading}
                    className="w-full text-xs rounded-control border border-border bg-bg text-text-main px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>
                        [{it.kode || 'ATK'}] {it.nama} (Stok: {it.stok} {it.satuan})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Item Summary Card */}
                {selectedItem && (
                  <div className="p-3 bg-bg rounded-control border border-border text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Kategori:</span>
                      <span className="font-semibold text-text-main">{selectedItem.kategori}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Penempatan Rak:</span>
                      <RakBadge rak={getItemRak(selectedItem, rakOverrides)} size="sm" />
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border">
                      <span className="text-text-muted">Stok Fisik Saat Ini:</span>
                      <span
                        className={`font-mono font-bold ${
                          selectedItem.stok <= selectedItem.stok_minimum
                            ? 'text-danger'
                            : 'text-text-main'
                        }`}
                      >
                        {selectedItem.stok} {selectedItem.satuan}
                      </span>
                    </div>
                  </div>
                )}

                {/* Mode: Tambah vs Kurangi */}
                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1.5">
                    Aksi Pembaruan
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMode('tambah')}
                      className={`p-2.5 rounded-control border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        mode === 'tambah'
                          ? 'bg-success/10 border-success text-success ring-1 ring-success'
                          : 'bg-surface border-border text-text-muted hover:border-border/80'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah (Beli/Restock)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('kurangi')}
                      className={`p-2.5 rounded-control border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        mode === 'kurangi'
                          ? 'bg-danger/10 border-danger text-danger ring-1 ring-danger'
                          : 'bg-surface border-border text-text-muted hover:border-border/80'
                      }`}
                    >
                      <Minus className="w-4 h-4" />
                      <span>Kurangi (Serah Terima)</span>
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1.5">
                    Jumlah {mode === 'tambah' ? 'Penambahan' : 'Pengurangan'} ({selectedItem?.satuan || 'unit'})
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Contoh: 10"
                      className="w-full text-xs rounded-control border border-border bg-bg text-text-main px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      {[1, 5, 10, 25].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAmount(String(preset))}
                          className="px-2 py-1.5 rounded-control border border-border bg-surface hover:bg-bg text-[11px] font-mono text-text-muted hover:text-text-main transition-colors cursor-pointer"
                        >
                          +{preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reason / Alasan */}
                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1.5">
                    Catatan / Keperluan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={alasan}
                    onChange={(e) => setAlasan(e.target.value)}
                    placeholder={
                      mode === 'tambah'
                        ? 'Misal: Pembelian restock vendor toko ATK'
                        : 'Misal: Diserahkan langsung ke Divisi Operasional'
                    }
                    className="w-full text-xs rounded-control border border-border bg-bg text-text-main px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedItem}
                  className={`w-full py-2.5 rounded-control text-xs font-semibold text-white shadow-subtle transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 ${
                    mode === 'tambah'
                      ? 'bg-success hover:bg-success/90'
                      : 'bg-primary hover:bg-primary-dark'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      {mode === 'tambah' ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                      <span>
                        Simpan {mode === 'tambah' ? 'Penambahan' : 'Pengurangan'} Stok
                      </span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Panel: Riwayat Pembaruan & Quick List */}
          <div className="lg:col-span-7 flex flex-col gap-3 min-h-0">
            {/* Quick Catalog Search */}
            <div className="bg-surface rounded-card border border-border p-3 flex items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari ATK untuk memilih barang dengan cepat..."
                  className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-control border border-border bg-bg text-text-main placeholder:text-text-muted/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            {/* Riwayat Log Pembaruan */}
            <div className="flex-1 bg-surface rounded-card border border-border flex flex-col min-h-0 shadow-xs">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-bold text-text-main">Riwayat Perubahan Stok</h4>
                </div>
                <span className="text-[11px] text-text-muted">{historyLogs.length} aktivitas tercatat</span>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-border/60">
                {historyLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-text-muted">
                    Belum ada riwayat penyesuaian manual pada sesi ini. Gunakan form di sebelah kiri untuk menambah atau mengurangi stok.
                  </div>
                ) : (
                  historyLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 hover:bg-bg/50 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-control flex items-center justify-center shrink-0 ${
                            log.type === 'tambah'
                              ? 'bg-success/10 text-success'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {log.type === 'tambah' ? (
                            <Plus className="w-4 h-4" />
                          ) : (
                            <Minus className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-semibold text-text-muted">
                              {log.kode}
                            </span>
                            <span className="text-xs font-semibold text-text-main truncate">
                              {log.nama}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-muted truncate mt-0.5">{log.alasan}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`font-mono text-xs font-bold ${
                            log.type === 'tambah' ? 'text-success' : 'text-primary'
                          }`}
                        >
                          {log.type === 'tambah' ? '+' : '-'}
                          {log.amount} {log.satuan}
                        </div>
                        <div className="text-[10px] text-text-muted tabular-nums mt-0.5">
                          Sisa: {log.finalStock} {log.satuan} &bull; {formatDateShort(log.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
