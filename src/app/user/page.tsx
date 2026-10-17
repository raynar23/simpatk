// User division workspace featuring request submission form and realtime request history
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Send,
  ClipboardList,
  Building2,
  Package,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import type { Item, Profile, RequestWithDetails } from '@/lib/types';

export default function UserDashboardPage() {
  const supabase = createClient();
  const { showToast } = useToast();

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [myRequests, setMyRequests] = useState<RequestWithDetails[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);

  // Form states
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [jumlah, setJumlah] = useState<string>('1');
  const [keperluan, setKeperluan] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load user profile and inventory items for the dropdown
  const loadInitialData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData as Profile);
      }

      // 2. Fetch available items
      const { data: itemsData } = await supabase
        .from('items')
        .select('*')
        .order('nama', { ascending: true });

      if (itemsData && itemsData.length > 0) {
        setItems(itemsData as Item[]);
        setSelectedItemId(itemsData[0].id);
      }
    } catch {
      showToast('Gagal memuat profil akun.', 'error');
    } finally {
      setIsLoadingProfile(false);
    }
  }, [supabase, showToast]);

  // Load user request history
  const loadRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('requests')
        .select('*, items(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        showToast('Gagal memuat riwayat permintaan.', 'error');
        return;
      }

      setMyRequests((data as RequestWithDetails[]) || []);
    } catch {
      showToast('Gagal memuat riwayat permintaan.', 'error');
    } finally {
      setIsLoadingRequests(false);
    }
  }, [supabase, showToast]);

  useEffect(() => {
    loadInitialData();
    loadRequests();
  }, [loadInitialData, loadRequests]);

  // Realtime subscription for request updates (e.g. status changes marked by admin)
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('user-requests-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
          filter: `user_id=eq.${profile.id}`,
        },
        async (payload) => {
          if (payload.eventType === 'UPDATE') {
            setMyRequests((prev) =>
              prev.map((req) =>
                req.id === payload.new.id
                  ? {
                      ...req,
                      status: payload.new.status,
                      completed_at: payload.new.completed_at,
                    }
                  : req
              )
            );
            if (payload.new.status === 'selesai') {
              showToast('Permintaan ATK Anda telah ditandai Selesai oleh GA.', 'success');
            }
          } else if (payload.eventType === 'INSERT') {
            loadRequests();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, profile, loadRequests, showToast]);

  // Submit new request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const parsedJumlah = parseInt(jumlah, 10);
    if (isNaN(parsedJumlah) || parsedJumlah <= 0) {
      setFormError('Jumlah barang harus lebih dari 0.');
      return;
    }

    if (!keperluan.trim()) {
      setFormError('Keperluan permintaan wajib diisi.');
      return;
    }

    if (!selectedItemId) {
      setFormError('Silakan pilih jenis barang ATK.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const { data, error } = await supabase
        .from('requests')
        .insert({
          user_id: profile.id,
          item_id: selectedItemId,
          jumlah: parsedJumlah,
          keperluan: keperluan.trim(),
          status: 'diproses',
          completed_at: null,
        })
        .select('*, items(*)')
        .single();

      if (error) {
        setFormError(error.message);
        return;
      }

      showToast('Permintaan ATK berhasil dikirim ke General Affairs.', 'success');

      // Update state and reset form
      if (data) {
        setMyRequests((prev) => [data as RequestWithDetails, ...prev]);
      }
      setJumlah('1');
      setKeperluan('');
    } catch {
      setFormError('Gagal mengirimkan permintaan. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedItem = items.find((i) => i.id === selectedItemId);

  return (
    <div className="space-y-6">
      {/* Section 1: Request Submission Card */}
      <section className="bg-surface rounded-card border border-border p-5 sm:p-6 shadow-subtle">
        <div className="border-b border-border pb-4 mb-5">
          <h1 className="text-lg font-semibold text-text-main tracking-tight">
            Pengajuan Permintaan ATK
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Permintaan otomatis disetujui dan langsung masuk ke antrean pemrosesan tim General Affairs.
          </p>
        </div>

        {formError && (
          <div className="mb-4 p-3 rounded-control bg-danger-soft border border-danger/20 text-danger text-xs leading-relaxed">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmitRequest} className="space-y-4">
          {/* Readonly Division */}
          <div>
            <label className="block text-xs font-medium text-text-main mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />
              <span>Divisi Pemohon</span>
            </label>
            <input
              type="text"
              readOnly
              disabled
              value={isLoadingProfile ? 'Memuat profil...' : profile?.nama_divisi || 'Divisi Operasional & Komersial'}
              className="w-full rounded-control border border-border bg-bg/80 px-3 py-2 text-base sm:text-xs text-text-main font-medium min-h-[44px] sm:min-h-[36px] sm:h-9 cursor-not-allowed select-none"
            />
          </div>

          {/* Item Selector */}
          <div>
            <label htmlFor="atk-select" className="block text-xs font-medium text-text-main mb-1.5 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />
              <span>Pilih Barang ATK</span>
            </label>
            <Select
              id="atk-select"
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              disabled={items.length === 0}
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nama} ({item.satuan})
                </option>
              ))}
            </Select>
          </div>

          {/* Quantity & Purpose Grid (1 col on mobile, 2 cols on md) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <Input
                id="jumlah"
                type="number"
                min="1"
                label={`Jumlah (${selectedItem?.satuan || 'satuan'})`}
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                required
              />
            </div>
            <div className="md:col-span-2">
              <Textarea
                id="keperluan"
                label="Keperluan Penggunaan"
                placeholder="Contoh: Operasional gate pass peti kemas shift malam"
                rows={2}
                value={keperluan}
                onChange={(e) => setKeperluan(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="w-full sm:w-auto px-6 cursor-pointer"
            >
              <Send className="w-4 h-4 mr-2" strokeWidth={1.5} />
              <span>Kirim Permintaan</span>
            </Button>
          </div>
        </form>
      </section>

      {/* Section 2: Request History Card & Table */}
      <section className="bg-surface rounded-card border border-border shadow-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-text-main">
              Riwayat Permintaan Saya
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Daftar pengajuan ATK oleh divisi Anda beserta status pemrosesan
            </p>
          </div>
          <span className="text-xs text-text-muted">
            Total: <strong className="text-text-main tabular-nums">{myRequests.length}</strong>
          </span>
        </div>

        {isLoadingRequests ? (
          <div className="p-5 space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : myRequests.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={ClipboardList}
              title="Belum ada riwayat permintaan"
              description="Formulir di atas dapat digunakan untuk mengajukan barang ATK pertama Anda."
            />
          </div>
        ) : (
          <div>
            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg text-text-muted border-b border-border font-medium">
                  <tr>
                    <th className="py-3 px-4">Tanggal Pengajuan</th>
                    <th className="py-3 px-4">Nama Barang</th>
                    <th className="py-3 px-4 text-right">Jumlah</th>
                    <th className="py-3 px-4">Keperluan</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {myRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-bg/60 transition-colors">
                      <td className="py-3 px-4 text-text-muted whitespace-nowrap">
                        {formatDate(req.created_at)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-text-main">
                        {req.items?.nama || 'Barang ATK'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-text-main tabular-nums whitespace-nowrap">
                        {req.jumlah} {req.items?.satuan || 'pcs'}
                      </td>
                      <td className="py-3 px-4 text-text-muted max-w-[240px] truncate">
                        {req.keperluan}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <Badge variant={req.status === 'selesai' ? 'selesai' : 'diproses'}>
                          {req.status === 'selesai' ? 'Selesai' : 'Diproses'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (< md) */}
            <div className="md:hidden divide-y divide-border/60">
              {myRequests.map((req) => (
                <div key={req.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-text-main leading-snug">
                      {req.items?.nama || 'Barang ATK'}
                    </span>
                    <Badge variant={req.status === 'selesai' ? 'selesai' : 'diproses'}>
                      {req.status === 'selesai' ? 'Selesai' : 'Diproses'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>
                      Jumlah: <strong className="text-text-main tabular-nums">{req.jumlah} {req.items?.satuan || 'pcs'}</strong>
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {formatDate(req.created_at)}
                    </span>
                  </div>

                  <div className="text-xs text-text-muted bg-bg/70 p-2 rounded-control">
                    <span className="font-medium text-text-main">Keperluan: </span>
                    {req.keperluan}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
