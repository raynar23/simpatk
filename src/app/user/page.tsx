// User Dashboard: Requisition submission workspace, KPI summary strip, and latest requests ledger
'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Send,
  Plus,
  Minus,
  ExternalLink,
  BookOpen,
  Clock,
  Layers,
  Loader2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Inspector } from '@/components/ui/Inspector';
import { Timeline } from '@/components/ui/Timeline';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatDate, parseRequestKeperluan } from '@/lib/utils';
import type { Item, RequestWithDetails } from '@/lib/types';

function UserDashboardContent() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { showToast } = useToast();

  const itemParam = searchParams.get('item') || '';
  const qtyParam = searchParams.get('qty');
  const unitParam = searchParams.get('unit') || '';
  const reasonParam = searchParams.get('reason') || '';

  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states initialized directly from search parameters if present
  const [selectedItemId, setSelectedItemId] = useState<string>(itemParam);
  const [jumlah, setJumlah] = useState<number>(() =>
    qtyParam && !isNaN(Number(qtyParam)) ? Math.max(1, Number(qtyParam)) : 1
  );
  const [satuan, setSatuan] = useState<string>(unitParam);
  const [keperluan, setKeperluan] = useState<string>(reasonParam);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Mobile active tab ('form' | 'table')
  const [mobileTab, setMobileTab] = useState<'form' | 'table'>('form');

  // Selected request for inspector
  const [selectedRequest, setSelectedRequest] = useState<RequestWithDetails | null>(null);

  // Table pagination
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // Selected item reference
  const selectedItem = useMemo(() => {
    return items.find((it) => it.id === selectedItemId) || null;
  }, [items, selectedItemId]);

  // Load items and user requests asynchronously after mount
  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user || ignore) return;
        setUserId(authData.user.id);

        const [itemsRes, reqRes] = await Promise.all([
          supabase.from('items').select('*').order('nama', { ascending: true }),
          supabase
            .from('requests')
            .select('*, items(*)')
            .eq('user_id', authData.user.id)
            .order('created_at', { ascending: false }),
        ]);

        if (!ignore) {
          if (itemsRes.data) {
            setItems(itemsRes.data as Item[]);
          }
          if (reqRes.data) {
            setRequests(reqRes.data as RequestWithDetails[]);
          }
        }
      } catch {
        if (!ignore) showToast('Terjadi kesalahan saat memuat data.', 'error');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, [supabase, showToast]);

  // Realtime subscription for request updates (e.g. GA marks as completed)
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('user_requests_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as RequestWithDetails;
            if (updated.status === 'selesai') {
              showToast(
                `Permintaan ${updated.nomor || ''} telah diselesaikan oleh GA.`,
                'success'
              );
            }
          }
          // Refresh list asynchronously
          const { data } = await supabase
            .from('requests')
            .select('*, items(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (data) {
            setRequests(data as RequestWithDetails[]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, showToast]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedItemId) {
      setFormError('Silakan pilih barang ATK terlebih dahulu.');
      return;
    }

    if (!jumlah || jumlah < 1) {
      setFormError('Jumlah permintaan minimal 1.');
      return;
    }

    if (!keperluan.trim()) {
      setFormError('Harap cantumkan keperluan pengajuan ATK.');
      return;
    }

    if (!userId) {
      setFormError('Sesi pengguna tidak valid. Silakan muat ulang halaman.');
      return;
    }

    setIsSubmitting(true);

    const trimmedSatuan = satuan.trim() || selectedItem?.satuan || 'pcs';
    const finalKeperluan = `[Satuan: ${trimmedSatuan}] ${keperluan.trim()}`;

    try {
      const { data, error } = await supabase
        .from('requests')
        .insert({
          user_id: userId,
          item_id: selectedItemId,
          jumlah,
          keperluan: finalKeperluan,
          status: 'diproses',
        })
        .select('*, items(*)')
        .single();

      if (error) {
        setFormError('Gagal mengirimkan permintaan: ' + error.message);
        return;
      }

      showToast('Permintaan ATK berhasil diajukan.', 'success');

      // Prepend to requests list
      if (data) {
        setRequests((prev) => [data as RequestWithDetails, ...prev]);
      }

      // Reset form
      setSelectedItemId('');
      setJumlah(1);
      setSatuan('');
      setKeperluan('');
      setPage(1);

      // On mobile switch to table view to see the new request
      setMobileTab('table');
    } catch {
      setFormError('Terjadi kesalahan jaringan saat mengirim permintaan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stepper handlers
  const handleIncrement = () => setJumlah((prev) => prev + 1);
  const handleDecrement = () => setJumlah((prev) => Math.max(1, prev - 1));

  // Compute KPI metrics for current calendar month
  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalMonth = 0;
    let pendingCount = 0;
    let completedMonth = 0;

    requests.forEach((req) => {
      const d = new Date(req.created_at);
      const isThisMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;

      if (isThisMonth) {
        totalMonth += 1;
      }

      if (req.status === 'diproses') {
        pendingCount += 1;
      }

      if (req.status === 'selesai') {
        const compDate = req.completed_at ? new Date(req.completed_at) : d;
        if (compDate.getMonth() === currentMonth && compDate.getFullYear() === currentYear) {
          completedMonth += 1;
        }
      }
    });

    return { totalMonth, pendingCount, completedMonth };
  }, [requests]);

  // Paginated requests for compact table
  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * pageSize;
    return requests.slice(start, start + pageSize);
  }, [requests, page, pageSize]);

  // DataTable columns
  const columns: ColumnDef<RequestWithDetails>[] = [
    {
      id: 'nomor',
      header: 'Nomor Tiket',
      accessorKey: 'nomor',
      className: 'min-w-[120px]',
      csvValue: (row) => row.nomor || `REQ-${row.id.slice(0, 8)}`,
      cell: (row) => (
        <span className="font-semibold text-primary tracking-tight whitespace-nowrap">
          {row.nomor || `REQ-${row.id.slice(0, 8)}`}
        </span>
      ),
    },
    {
      id: 'tanggal',
      header: 'Waktu Pengajuan',
      accessorKey: 'created_at',
      className: 'min-w-[130px] whitespace-nowrap',
      csvValue: (row) => formatDate(row.created_at),
      cell: (row) => (
        <span className="text-xs text-text-muted whitespace-nowrap">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      id: 'barang',
      header: 'Barang & Kuantitas',
      className: 'min-w-[220px]',
      csvValue: (row) => {
        const { satuan: unit } = parseRequestKeperluan(row.keperluan, row.items?.satuan);
        return `${row.items?.nama || 'Barang Dihapus'}${
          row.items?.kode ? ` (${row.items.kode})` : ''
        } - ${row.jumlah} ${unit}`;
      },
      cell: (row) => {
        const { satuan: unit } = parseRequestKeperluan(row.keperluan, row.items?.satuan);
        return (
          <div className="min-w-0 py-0.5">
            <p className="font-medium text-text-main text-xs leading-snug">
              {row.items?.nama || 'Barang Dihapus'}
            </p>
            <p className="text-[11px] text-text-muted mt-0.5 font-medium">
              {row.jumlah} {unit}
            </p>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      align: 'center',
      className: 'min-w-[105px]',
      csvValue: (row) => (row.status === 'selesai' ? 'Selesai' : 'Diproses'),
      cell: (row) => (
        <div className="flex justify-center">
          <Badge variant={row.status === 'selesai' ? 'selesai' : 'diproses'}>
            {row.status === 'selesai' ? 'Selesai' : 'Diproses'}
          </Badge>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title="Dashboard Permintaan"
      subtitle="Pengajuan dan pemantauan status alat tulis kantor divisi operasional."
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/user/riwayat"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold text-text-main bg-surface border border-border hover:bg-bg transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-text-muted" />
            <span>Riwayat Pengajuan</span>
          </Link>
        </div>
      }
    >
      <div className="h-full flex flex-col gap-3.5 min-h-0">
        {/* Strip 3 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          <div className="bg-surface rounded-card border border-border px-4 py-3 flex flex-col justify-between">
            <span className="text-xs font-medium text-text-muted">
              Total Diajukan Bulan Ini
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-text-main tabular-nums">
                {isLoading ? '-' : metrics.totalMonth}
              </span>
              <span className="text-[11px] text-text-muted font-normal">
                tiket pengajuan
              </span>
            </div>
          </div>

          <div className="bg-surface rounded-card border border-border px-4 py-3 flex flex-col justify-between">
            <span className="text-xs font-medium text-text-muted">
              Sedang Diproses
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-warning tabular-nums">
                {isLoading ? '-' : metrics.pendingCount}
              </span>
              <span className="text-[11px] text-text-muted font-normal">
                disiapkan GA
              </span>
            </div>
          </div>

          <div className="bg-surface rounded-card border border-border px-4 py-3 flex flex-col justify-between">
            <span className="text-xs font-medium text-text-muted">
              Selesai Bulan Ini
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-success tabular-nums">
                {isLoading ? '-' : metrics.completedMonth}
              </span>
              <span className="text-[11px] text-text-muted font-normal">
                serah terima selesai
              </span>
            </div>
          </div>
        </div>

        {/* Mobile View Toggle Segmented Control (hidden on lg+) */}
        <div className="lg:hidden flex rounded-control bg-bg p-0.5 border border-border shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab('form')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-control transition-all ${
              mobileTab === 'form'
                ? 'bg-surface text-text-main shadow-subtle'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            Form Pengajuan
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('table')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-control transition-all ${
              mobileTab === 'table'
                ? 'bg-surface text-text-main shadow-subtle'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            Permintaan Terbaru ({requests.length})
          </button>
        </div>

        {/* Two-Column Responsive Workspace */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 overflow-y-auto lg:overflow-hidden">
          {/* Left Column: Form Permintaan ATK */}
          <div
            className={`w-full lg:w-[420px] xl:w-[460px] shrink-0 bg-surface rounded-card border border-border p-4 sm:p-5 flex flex-col min-h-0 overflow-y-auto ${
              mobileTab === 'table' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <div className="pb-3 border-b border-border/70 mb-4 shrink-0">
              <h2 className="text-sm font-semibold text-text-main tracking-tight">
                Form Permintaan ATK
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Pilih barang inventaris dan cantumkan jumlah keperluan.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-3.5">
                {/* Item Selection */}
                <div>
                  <label htmlFor="item-select" className="block text-xs font-medium text-text-main mb-1.5">
                    Pilih Barang ATK <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="item-select"
                      value={selectedItemId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedItemId(val);
                        setFormError(null);
                        const matched = items.find((i) => i.id === val);
                        if (matched && !satuan) {
                          setSatuan(matched.satuan || 'pcs');
                        }
                      }}
                      className="w-full appearance-none pl-3 pr-8.5 py-2 text-xs rounded-control border border-border bg-bg text-text-main transition-colors focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer min-h-[38px]"
                    >
                      <option value="">-- Pilih Barang ATK --</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.kode ? `[${it.kode}] ` : ''}{it.nama}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted"
                      strokeWidth={1.5}
                    />
                  </div>
                </div>

                {/* Category Context (Zero Stock Info) */}
                {selectedItem && (
                  <div className="rounded-control bg-bg/80 border border-border p-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Kategori Barang:</span>
                      <span className="font-semibold text-text-main">{selectedItem.kategori || 'Umum'}</span>
                    </div>
                  </div>
                )}

                {/* Quantity and Custom Satuan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="jumlah-input" className="block text-xs font-medium text-text-main mb-1.5">
                      Jumlah Permintaan <span className="text-danger">*</span>
                    </label>
                    <div className="inline-flex items-center w-full rounded-control border border-border bg-bg overflow-hidden min-h-[38px]">
                      <button
                        type="button"
                        onClick={handleDecrement}
                        disabled={jumlah <= 1}
                        className="px-3 py-2 text-text-muted hover:text-text-main hover:bg-surface disabled:opacity-40 transition-colors cursor-pointer"
                        aria-label="Kurangi jumlah"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        id="jumlah-input"
                        type="number"
                        min="1"
                        value={jumlah}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setJumlah(isNaN(val) ? 1 : Math.max(1, val));
                        }}
                        className="flex-1 text-center bg-transparent text-xs font-semibold text-text-main focus:outline-none tabular-nums py-2"
                      />
                      <button
                        type="button"
                        onClick={handleIncrement}
                        className="px-3 py-2 text-text-muted hover:text-text-main hover:bg-surface transition-colors cursor-pointer"
                        aria-label="Tambah jumlah"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="satuan-input" className="block text-xs font-medium text-text-main mb-1.5">
                      Satuan Barang <span className="text-danger">*</span>
                    </label>
                    <input
                      id="satuan-input"
                      type="text"
                      list="satuan-suggestions"
                      value={satuan}
                      onChange={(e) => setSatuan(e.target.value)}
                      placeholder="pcs, box, rim, lusin..."
                      className="w-full rounded-control border border-border bg-bg px-3 py-2 text-xs text-text-main placeholder:text-text-muted/60 transition-colors focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[38px]"
                      required
                    />
                    <datalist id="satuan-suggestions">
                      <option value="pcs" />
                      <option value="buah" />
                      <option value="box" />
                      <option value="rim" />
                      <option value="pack" />
                      <option value="lusin" />
                      <option value="lembar" />
                      <option value="roll" />
                      <option value="set" />
                    </datalist>
                  </div>
                </div>

                {/* Keperluan / Purpose */}
                <div>
                  <label htmlFor="keperluan-input" className="block text-xs font-medium text-text-main mb-1.5">
                    Keperluan Pengajuan <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="keperluan-input"
                    rows={3}
                    required
                    value={keperluan}
                    onChange={(e) => {
                      setKeperluan(e.target.value);
                      setFormError(null);
                    }}
                    placeholder="Contoh: Kebutuhan administrasi operasional loket gerbang dermaga..."
                    className="w-full rounded-control border border-border bg-bg p-3 text-xs text-text-main placeholder:text-text-muted/60 transition-colors focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>

                {/* Error Banner */}
                {formError && (
                  <div className="rounded-control bg-danger-soft border border-danger/20 p-2.5 text-xs text-danger leading-relaxed">
                    {formError}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="w-full inline-flex items-center justify-center rounded-control bg-primary hover:bg-primary-dark text-white px-4 py-2.5 text-xs font-semibold shadow-subtle transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      <span>Mengirim Permintaan...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-2" />
                      <span>Kirim Permintaan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Tabel Permintaan Terbaru Saya */}
          <div
            className={`flex-1 min-w-0 bg-surface rounded-card border border-border flex flex-col min-h-0 overflow-hidden ${
              mobileTab === 'form' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-text-main tracking-tight">
                  Permintaan Terbaru Saya
                </h2>
                <p className="text-xs text-text-muted">
                  Pelacakan real-time serah terima barang operasional.
                </p>
              </div>

              <Link
                href="/user/riwayat"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
              >
                <span>Lihat Semua</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <DataTable
                columns={columns}
                data={paginatedRequests}
                exportData={requests}
                totalCount={requests.length}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                isLoading={isLoading}
                csvFilename="permintaan_terbaru_saya.csv"
                emptyMessage="Belum ada riwayat pengajuan ATK."
                onRowClick={(row) => setSelectedRequest(row)}
                className="h-full border-0"
                tableClassName="min-w-[650px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Inspector Panel for Selected Request */}
      <Inspector
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title={selectedRequest?.nomor || 'Rincian Permintaan'}
        subtitle={`Diajukan pada ${selectedRequest ? formatDate(selectedRequest.created_at) : ''}`}
        footer={
          selectedRequest && (
            <div className="flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={() => {
                  const req = selectedRequest;
                  setSelectedRequest(null);
                  if (req.items?.id) {
                    setSelectedItemId(req.items.id);
                    setJumlah(req.jumlah);
                    setKeperluan(req.keperluan);
                    setMobileTab('form');
                    showToast('Data pengajuan telah disalin ke formulir.', 'info');
                  }
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-control bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajukan Ulang</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-3 py-2 rounded-control border border-border hover:bg-bg text-text-main text-xs font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          )
        }
      >
        {selectedRequest && (() => {
          const parsed = parseRequestKeperluan(selectedRequest.keperluan, selectedRequest.items?.satuan);
          return (
            <div className="space-y-5 text-xs">
              {/* Status & Item Headline */}
              <div className="rounded-control bg-bg p-3 border border-border/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-text-muted font-medium">Status Pengajuan</span>
                  <Badge variant={selectedRequest.status === 'selesai' ? 'selesai' : 'diproses'}>
                    {selectedRequest.status === 'selesai' ? 'Selesai' : 'Sedang Diproses'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  <span className="text-text-muted">Barang</span>
                  <span className="font-semibold text-text-main text-right">
                    {selectedRequest.items?.nama}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Kuantitas</span>
                  <span className="font-semibold text-text-main">
                    {selectedRequest.jumlah} {parsed.satuan}
                  </span>
                </div>
              </div>

              {/* Purpose */}
              <div>
                <span className="block text-text-muted font-medium mb-1">
                  Keperluan
                </span>
                <p className="rounded-control bg-bg border border-border/60 p-2.5 text-text-main leading-relaxed">
                  {parsed.cleanKeperluan}
                </p>
              </div>

            {/* GA Follow-up Notes (if any) */}
            {selectedRequest.catatan_ga && (
              <div>
                <span className="block text-text-muted font-medium mb-1">
                  Catatan General Affairs
                </span>
                <div className="rounded-control bg-primary-soft/40 border border-primary/20 p-2.5 text-text-main leading-relaxed">
                  {selectedRequest.catatan_ga}
                </div>
              </div>
            )}

              {/* Timeline progression */}
              <div>
                <span className="block text-text-muted font-medium mb-2">
                  Kronologi & Riwayat Status
                </span>
                <Timeline
                  createdAt={selectedRequest.created_at}
                  status={selectedRequest.status}
                  completedAt={selectedRequest.completed_at}
                  catatanGa={selectedRequest.catatan_ga}
                />
              </div>
            </div>
          );
        })()}
      </Inspector>
    </PageContainer>
  );
}

export default function UserDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      }
    >
      <UserDashboardContent />
    </Suspense>
  );
}
