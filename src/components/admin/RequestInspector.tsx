// Inspector slide-over for request details, timeline, and completion handover action
'use client';

import React, { useState } from 'react';
import {
  Package,
  Building2,
  Calendar,
  CheckCircle2,
  FileText,
  Loader2,
} from 'lucide-react';
import { Inspector } from '@/components/ui/Inspector';
import { Timeline } from '@/components/ui/Timeline';
import { Badge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { formatDate, parseRequestKeperluan } from '@/lib/utils';
import type { RequestWithDetails } from '@/lib/types';

interface RequestInspectorProps {
  request: RequestWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onCompletedSuccess: (updatedRequest: RequestWithDetails) => void;
}

function RequestInspectorContent({
  request,
  onClose,
  onCompletedSuccess,
}: {
  request: RequestWithDetails;
  onClose: () => void;
  onCompletedSuccess: (updatedRequest: RequestWithDetails) => void;
}) {
  const supabase = createClient();
  const { showToast } = useToast();
  const [catatan, setCatatan] = useState(request.catatan_ga || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!request) return null;

  const isPending = request.status === 'diproses';

  const handleTandaiSelesai = async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('tandai_selesai', {
        p_request_id: request.id,
        p_catatan: catatan.trim() ? catatan.trim() : null,
      });

      if (error) {
        showToast(error.message || 'Gagal menandai permintaan selesai.', 'error');
        return;
      }

      showToast(`Permintaan ${request.nomor || 'ATK'} telah ditandai selesai.`, 'success');
      onCompletedSuccess({
        ...request,
        status: 'selesai',
        completed_at: data?.completed_at || new Date().toISOString(),
        catatan_ga: catatan.trim() || request.catatan_ga,
      });
    } catch {
      showToast('Terjadi kesalahan sistem saat memperbarui status.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Inspector
      isOpen={true}
      onClose={onClose}
      title={request.nomor || 'Detail Permintaan'}
      subtitle={`Diajukan pada ${formatDate(request.created_at)}`}
      footer={
        isPending ? (
          <button
            type="button"
            onClick={handleTandaiSelesai}
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-control bg-primary hover:bg-primary-dark active:scale-[0.99] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer min-h-[38px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan Serah Terima...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Tandai Selesai Serah Terima</span>
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-success py-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Permintaan ini telah selesai diserahkan</span>
          </div>
        )
      }
    >
      <div className="space-y-6">
        {/* Status & Summary header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <span className="text-xs text-text-muted">Status Saat Ini</span>
          <Badge variant={request.status as 'diproses' | 'selesai'} />
        </div>

        {/* Division and Requester Card */}
        <div className="rounded-control bg-bg border border-border/80 p-3 space-y-2">
          <div className="flex items-center gap-2 text-text-muted text-[11px] font-semibold uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5" />
            <span>Pemohon & Divisi</span>
          </div>
          <div className="text-xs">
            <p className="font-semibold text-text-main">
              {request.profiles?.nama_divisi || 'Divisi Pemohon'}
            </p>
            <p className="text-text-muted text-[11px] mt-0.5">
              Email: {request.profiles?.email || '-'}
            </p>
          </div>
        </div>

        {/* Item Specification Details */}
        <div className="rounded-control bg-bg border border-border/80 p-3 space-y-2">
          <div className="flex items-center gap-2 text-text-muted text-[11px] font-semibold uppercase tracking-wider">
            <Package className="w-3.5 h-3.5" />
            <span>Spesifikasi Barang ATK</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Kode Barang:</span>
              <span className="font-mono font-semibold text-primary text-[11px]">
                {request.items?.kode || 'Non-Katalog'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Nama Barang:</span>
              <span className="font-medium text-text-main text-right">
                {request.nama_barang ||
                  parseRequestKeperluan(request.keperluan, request.items?.satuan, request.items?.nama).namaBarang ||
                  request.items?.nama ||
                  '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Kategori:</span>
              <span className="text-text-main">{request.items?.kategori || 'Manual / Permintaan Khusus'}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-border/50 font-medium">
              <span className="text-text-muted">Jumlah Diminta:</span>
              <span className="text-sm font-bold text-text-main tabular-nums">
                {request.jumlah}{' '}
                {parseRequestKeperluan(request.keperluan, request.items?.satuan, request.items?.nama).satuan}
              </span>
            </div>
          </div>
        </div>

        {/* Purpose / Keperluan */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-text-muted text-[11px] font-semibold uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5" />
            <span>Keperluan Operasional</span>
          </div>
          <p className="text-xs text-text-main bg-surface p-3 rounded-control border border-border leading-relaxed">
            {parseRequestKeperluan(request.keperluan).cleanKeperluan || 'Tidak ada keterangan keperluan operasional.'}
          </p>
        </div>

        {/* Milestone Timeline */}
        <div className="space-y-2 pt-1 border-t border-border/80">
          <div className="flex items-center gap-2 text-text-muted text-[11px] font-semibold uppercase tracking-wider mb-3">
            <Calendar className="w-3.5 h-3.5" />
            <span>Riwayat Progres Permintaan</span>
          </div>
          <Timeline
            createdAt={request.created_at}
            status={request.status as 'diproses' | 'selesai'}
            completedAt={request.completed_at}
            catatanGa={request.catatan_ga}
          />
        </div>

        {/* Optional GA Handover Notes Input (Editable when Diproses) */}
        {isPending && (
          <div className="space-y-1.5 pt-2 border-t border-border/80">
            <label
              htmlFor="catatan_ga_input"
              className="block text-xs font-semibold text-text-main"
            >
              Catatan Serah Terima GA (Opsional)
            </label>
            <textarea
              id="catatan_ga_input"
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Diterima oleh staf administrasi operasional TPS..."
              className="w-full p-2.5 text-xs rounded-control border border-border bg-bg text-text-main placeholder:text-text-muted focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors resize-none"
            />
          </div>
        )}
      </div>
    </Inspector>
  );
}

export function RequestInspector({
  request,
  isOpen,
  onClose,
  onCompletedSuccess,
}: RequestInspectorProps) {
  if (!isOpen || !request) return null;

  return (
    <RequestInspectorContent
      key={request.id}
      request={request}
      onClose={onClose}
      onCompletedSuccess={onCompletedSuccess}
    />
  );
}
