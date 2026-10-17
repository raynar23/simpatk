// Admin request management page with status tabs, confirmation dialog, and Supabase Realtime
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  Calendar,
  Building2,
  Layers,
  FileText,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AdminToolbar } from '@/components/ui/AdminToolbar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import type { RequestWithDetails, RequestStatus } from '@/lib/types';

export default function AdminPermintaanPage() {
  const supabase = createClient();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [filterStatus, setFilterStatus] = useState<'semua' | RequestStatus>('semua');
  const [selectedRequest, setSelectedRequest] = useState<RequestWithDetails | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Fetch all requests
  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*, items(*), profiles(*)')
        .order('created_at', { ascending: false });

      if (error) {
        showToast('Gagal memuat data permintaan.', 'error');
        return;
      }
      setRequests((data as RequestWithDetails[]) || []);
    } catch {
      showToast('Gagal menghubungi server.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, showToast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Realtime subscription for requests table
  useEffect(() => {
    const channel = supabase
      .channel('admin-requests-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch complete row with relations
            const { data } = await supabase
              .from('requests')
              .select('*, items(*), profiles(*)')
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setRequests((prev) => [data as RequestWithDetails, ...prev.filter((r) => r.id !== data.id)]);
              setHighlightedId(data.id);
              showToast('Permintaan baru diterima dari divisi operasional.', 'info');
              setTimeout(() => setHighlightedId(null), 2500);
            }
          } else if (payload.eventType === 'UPDATE') {
            setRequests((prev) =>
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
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, showToast]);

  // Status counts for SegmentedControl
  const counts = useMemo(() => {
    const total = requests.length;
    const diproses = requests.filter((r) => r.status === 'diproses').length;
    const selesai = requests.filter((r) => r.status === 'selesai').length;
    return { total, diproses, selesai };
  }, [requests]);

  // Filtered requests based on active tab
  const filteredRequests = useMemo(() => {
    if (filterStatus === 'semua') return requests;
    return requests.filter((r) => r.status === filterStatus);
  }, [requests, filterStatus]);

  // Mark request as finished using tandai_selesai RPC
  const handleConfirmSelesai = async () => {
    if (!selectedRequest) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase.rpc('tandai_selesai', {
        p_request_id: selectedRequest.id,
      });

      if (error) {
        showToast(error.message || 'Gagal menandai permintaan selesai.', 'error');
        return;
      }

      showToast('Permintaan berhasil ditandai selesai.', 'success');
      // Update local state immediately
      setRequests((prev) =>
        prev.map((r) =>
          r.id === selectedRequest.id
            ? { ...r, status: 'selesai', completed_at: new Date().toISOString() }
            : r
        )
      );
      setSelectedRequest(null);
    } catch {
      showToast('Terjadi kendala pada sistem.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <AdminToolbar
        title="Daftar Permintaan ATK"
        subtitle="Kelola dan verifikasi status pengajuan ATK dari divisi operasional"
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-6 space-y-4">
        {/* Filter Tab Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <SegmentedControl
            options={[
              { value: 'semua', label: 'Semua', count: counts.total },
              { value: 'diproses', label: 'Diproses', count: counts.diproses },
              { value: 'selesai', label: 'Selesai', count: counts.selesai },
            ]}
            value={filterStatus}
            onChange={(val) => setFilterStatus(val)}
          />

          <div className="text-xs text-text-muted">
            Menampilkan <strong className="text-text-main tabular-nums">{filteredRequests.length}</strong> permintaan
          </div>
        </div>

        {/* Requests Container */}
        <div className="bg-surface rounded-card border border-border shadow-subtle overflow-hidden">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={ClipboardList}
                title="Tidak ada permintaan"
                description={
                  filterStatus === 'semua'
                    ? 'Belum ada permintaan ATK yang tercatat di sistem.'
                    : `Tidak ada permintaan dengan status ${filterStatus}.`
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
                      <th className="py-3 px-4">Tanggal Pengajuan</th>
                      <th className="py-3 px-4">Divisi Pemohon</th>
                      <th className="py-3 px-4">Nama Barang</th>
                      <th className="py-3 px-4 text-right">Jumlah</th>
                      <th className="py-3 px-4">Keperluan</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredRequests.map((req) => {
                      const isHighlighted = req.id === highlightedId;
                      return (
                        <tr
                          key={req.id}
                          className={`transition-colors duration-500 ${
                            isHighlighted
                              ? 'bg-primary-soft/60'
                              : 'hover:bg-bg/60'
                          }`}
                        >
                          <td className="py-3 px-4 text-text-muted whitespace-nowrap">
                            {formatDate(req.created_at)}
                          </td>
                          <td className="py-3 px-4 font-medium text-text-main max-w-[150px] truncate">
                            {req.profiles?.nama_divisi || 'Divisi Pemohon'}
                          </td>
                          <td className="py-3 px-4 text-text-main max-w-[180px] truncate font-medium">
                            {req.items?.nama || 'Barang ATK'}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-text-main tabular-nums whitespace-nowrap">
                            {req.jumlah} {req.items?.satuan || 'pcs'}
                          </td>
                          <td className="py-3 px-4 text-text-muted max-w-[220px] truncate">
                            {req.keperluan}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <Badge
                              variant={
                                req.status === 'selesai' ? 'selesai' : 'diproses'
                              }
                            >
                              {req.status === 'selesai' ? 'Selesai' : 'Diproses'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {req.status === 'diproses' ? (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => setSelectedRequest(req)}
                                className="cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
                                Tandai Selesai
                              </Button>
                            ) : (
                              <span className="text-[11px] text-text-muted italic">
                                Selesai
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View (< md) */}
              <div className="md:hidden divide-y divide-border/60">
                {filteredRequests.map((req) => {
                  const isHighlighted = req.id === highlightedId;
                  return (
                    <div
                      key={req.id}
                      className={`p-4 space-y-2.5 transition-colors duration-500 ${
                        isHighlighted ? 'bg-primary-soft/60' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-text-main leading-snug">
                          {req.items?.nama || 'Barang ATK'}
                        </span>
                        <Badge
                          variant={
                            req.status === 'selesai' ? 'selesai' : 'diproses'
                          }
                        >
                          {req.status === 'selesai' ? 'Selesai' : 'Diproses'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-text-muted pt-1">
                        <div>
                          <span className="block text-[11px] text-text-muted/80">Jumlah:</span>
                          <span className="font-semibold text-text-main tabular-nums">
                            {req.jumlah} {req.items?.satuan || 'pcs'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[11px] text-text-muted/80">Divisi:</span>
                          <span className="font-medium text-text-main truncate block">
                            {req.profiles?.nama_divisi || 'Divisi Pemohon'}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-text-muted bg-bg/70 p-2 rounded-control">
                        <span className="font-medium text-text-main">Keperluan: </span>
                        {req.keperluan}
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[11px] text-text-muted">
                          {formatDate(req.created_at)}
                        </span>
                        {req.status === 'diproses' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => setSelectedRequest(req)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />
                            Tandai Selesai
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Tandai Selesai */}
      <Dialog
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title="Tandai Permintaan Selesai"
        description="Konfirmasi bahwa barang ATK telah diserahkan secara fisik."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setSelectedRequest(null)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmSelesai}
              isLoading={isSubmitting}
            >
              Konfirmasi Selesai
            </Button>
          </>
        }
      >
        {selectedRequest && (
          <div className="space-y-3 text-xs">
            <div className="rounded-control bg-bg p-3 border border-border space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-text-muted shrink-0" strokeWidth={1.5} />
                <span className="font-semibold text-text-main text-sm">
                  {selectedRequest.items?.nama}
                </span>
              </div>
              <div className="flex items-center gap-2 text-text-muted">
                <Building2 className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span>
                  Divisi: <strong className="text-text-main">{selectedRequest.profiles?.nama_divisi}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-text-muted">
                <Calendar className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span>
                  Jumlah: <strong className="text-text-main tabular-nums">{selectedRequest.jumlah} {selectedRequest.items?.satuan}</strong>
                </span>
              </div>
              <div className="flex items-start gap-2 text-text-muted pt-1 border-t border-border">
                <FileText className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.5} />
                <span>Keperluan: {selectedRequest.keperluan}</span>
              </div>
            </div>

            <p className="text-[11px] text-text-muted leading-relaxed">
              Catatan: Status permintaan akan diperbarui menjadi <strong>Selesai</strong>. Sesuai aturan bisnis, tindakan ini tidak mengurangi jumlah stok persediaan secara otomatis.
            </p>
          </div>
        )}
      </Dialog>
    </div>
  );
}
