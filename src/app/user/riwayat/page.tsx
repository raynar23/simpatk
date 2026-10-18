// User Request History Ledger: comprehensive transaction tracking, status filtering, and timeline inspector
'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Inspector } from '@/components/ui/Inspector';
import { Timeline } from '@/components/ui/Timeline';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import type { RequestWithDetails } from '@/lib/types';

function UserRiwayatContent() {
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();

  const [userId, setUserId] = useState<string | null>(null);
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'diproses' | 'selesai'>('all');

  // Table pagination & sorting
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Inspector
  const [selectedRequest, setSelectedRequest] = useState<RequestWithDetails | null>(null);

  // Load user requests asynchronously
  useEffect(() => {
    let ignore = false;

    async function fetchRequests() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user || ignore) return;
        setUserId(authData.user.id);

        const { data, error } = await supabase
          .from('requests')
          .select('*, items(*)')
          .eq('user_id', authData.user.id)
          .order('created_at', { ascending: false });

        if (error) {
          if (!ignore) showToast('Gagal memuat riwayat pengajuan.', 'error');
          return;
        }

        if (!ignore && data) {
          setRequests(data as RequestWithDetails[]);
        }
      } catch {
        if (!ignore) showToast('Terjadi kesalahan saat memuat data riwayat.', 'error');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    fetchRequests();

    return () => {
      ignore = true;
    };
  }, [supabase, showToast]);

  // Realtime updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('user_riwayat_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
          filter: `user_id=eq.${userId}`,
        },
        async () => {
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
  }, [supabase, userId]);

  // Filtered & sorted dataset
  const filteredRequests = useMemo(() => {
    let result = [...requests];

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((r) => {
        const nomor = (r.nomor || '').toLowerCase();
        const nama = (r.items?.nama || '').toLowerCase();
        const kode = (r.items?.kode || '').toLowerCase();
        const keperluan = (r.keperluan || '').toLowerCase();
        return nomor.includes(q) || nama.includes(q) || kode.includes(q) || keperluan.includes(q);
      });
    }

    // Sorting
    result.sort((a, b) => {
      let valA: unknown = a[sortColumn as keyof RequestWithDetails];
      let valB: unknown = b[sortColumn as keyof RequestWithDetails];

      if (sortColumn === 'items.nama') {
        valA = a.items?.nama || '';
        valB = b.items?.nama || '';
      }

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      return sortDirection === 'asc' ? 1 : -1;
    });

    return result;
  }, [requests, statusFilter, searchQuery, sortColumn, sortDirection]);

  // Paginated data slice
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, page, pageSize]);

  // Summary KPI counts
  const summaryMetrics = useMemo(() => {
    let pending = 0;
    let completed = 0;
    let totalUnits = 0;

    requests.forEach((r) => {
      if (r.status === 'diproses') pending += 1;
      if (r.status === 'selesai') completed += 1;
      totalUnits += r.jumlah || 0;
    });

    return {
      total: requests.length,
      pending,
      completed,
      totalUnits,
    };
  }, [requests]);

  // Handle re-order
  const handleReorder = (item: RequestWithDetails) => {
    if (!item.items?.id) return;
    const params = new URLSearchParams({
      item: item.items.id,
      qty: String(item.jumlah || 1),
      reason: item.keperluan || '',
    });
    router.push(`/user?${params.toString()}`);
  };

  // Columns definition
  const columns: ColumnDef<RequestWithDetails>[] = [
    {
      id: 'nomor',
      header: 'Nomor Tiket',
      isSortable: true,
      cell: (row) => (
        <span className="font-semibold text-primary">
          {row.nomor || `REQ-${row.id.slice(0, 8)}`}
        </span>
      ),
    },
    {
      id: 'created_at',
      header: 'Waktu Pengajuan',
      isSortable: true,
      cell: (row) => (
        <span className="text-xs text-text-muted">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      id: 'items.nama',
      header: 'Nama & Kode Barang',
      isSortable: true,
      cell: (row) => (
        <div>
          <p className="font-medium text-text-main text-xs">
            {row.items?.nama || 'Barang Dihapus'}
          </p>
          {row.items?.kode && (
            <p className="text-[11px] text-text-muted font-mono">
              {row.items.kode}
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'jumlah',
      header: 'Kuantitas',
      isNumeric: true,
      isSortable: true,
      cell: (row) => (
        <span className="tabular-nums font-semibold text-text-main">
          {row.jumlah} <span className="text-xs font-normal text-text-muted">{row.items?.satuan || 'unit'}</span>
        </span>
      ),
    },
    {
      id: 'keperluan',
      header: 'Keperluan',
      cell: (row) => (
        <span className="line-clamp-1 text-xs text-text-muted max-w-[280px]">
          {row.keperluan}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      isSortable: true,
      cell: (row) => (
        <Badge variant={row.status === 'selesai' ? 'selesai' : 'diproses'}>
          {row.status === 'selesai' ? 'Selesai' : 'Sedang Diproses'}
        </Badge>
      ),
    },
  ];

  return (
    <PageContainer
      title="Riwayat Permintaan"
      subtitle="Buku catatan transaksi dan pelacakan seluruh pengajuan ATK divisi."
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/user"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-control text-xs font-semibold text-white bg-primary hover:bg-primary-dark transition-colors shadow-subtle"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajukan Permintaan Baru</span>
          </Link>
        </div>
      }
    >
      <div className="h-full flex flex-col gap-3.5 min-h-0">
        {/* Mini KPI Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="bg-surface rounded-card border border-border px-3.5 py-2.5 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-text-muted">Total Pengajuan</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-text-main tabular-nums">
                {isLoading ? '-' : summaryMetrics.total}
              </span>
              <span className="text-[10px] text-text-muted">tiket</span>
            </div>
          </div>

          <div className="bg-surface rounded-card border border-border px-3.5 py-2.5 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-text-muted">Sedang Diproses</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-warning tabular-nums">
                {isLoading ? '-' : summaryMetrics.pending}
              </span>
              <span className="text-[10px] text-text-muted">menunggu GA</span>
            </div>
          </div>

          <div className="bg-surface rounded-card border border-border px-3.5 py-2.5 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-text-muted">Selesai Diserahkan</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-success tabular-nums">
                {isLoading ? '-' : summaryMetrics.completed}
              </span>
              <span className="text-[10px] text-text-muted">terpenuhi</span>
            </div>
          </div>

          <div className="bg-surface rounded-card border border-border px-3.5 py-2.5 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-text-muted">Total Unit Barang</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-text-main tabular-nums">
                {isLoading ? '-' : summaryMetrics.totalUnits}
              </span>
              <span className="text-[10px] text-text-muted">akumulasi unit</span>
            </div>
          </div>
        </div>

        {/* DataTable Container */}
        <div className="flex-1 min-h-0 bg-surface rounded-card border border-border flex flex-col overflow-hidden">
          <DataTable
            columns={columns}
            data={paginatedData}
            totalCount={filteredRequests.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSortChange={(col, dir) => {
              setSortColumn(col);
              setSortDirection(dir);
            }}
            searchValue={searchQuery}
            onSearchChange={(val) => {
              setSearchQuery(val);
              setPage(1);
            }}
            searchPlaceholder="Cari nomor tiket, barang, atau keperluan..."
            filterControls={
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="inline-flex rounded-control bg-bg p-0.5 border border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('all');
                      setPage(1);
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-control transition-all ${
                      statusFilter === 'all'
                        ? 'bg-surface text-text-main shadow-subtle'
                        : 'text-text-muted hover:text-text-main'
                    }`}
                  >
                    Semua ({requests.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('diproses');
                      setPage(1);
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-control transition-all ${
                      statusFilter === 'diproses'
                        ? 'bg-surface text-text-main shadow-subtle'
                        : 'text-text-muted hover:text-text-main'
                    }`}
                  >
                    Diproses ({summaryMetrics.pending})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('selesai');
                      setPage(1);
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-control transition-all ${
                      statusFilter === 'selesai'
                        ? 'bg-surface text-text-main shadow-subtle'
                        : 'text-text-muted hover:text-text-main'
                    }`}
                  >
                    Selesai ({summaryMetrics.completed})
                  </button>
                </div>
              </div>
            }
            onRowClick={(row) => setSelectedRequest(row)}
            isLoading={isLoading}
            emptyMessage={
              searchQuery || statusFilter !== 'all'
                ? 'Tidak ada tiket pengajuan yang cocok dengan filter pencarian.'
                : 'Belum ada catatan riwayat permintaan.'
            }
            csvFilename={`riwayat-permintaan-divisi-${new Date().toISOString().slice(0, 10)}.csv`}
            enableDynamicHeight
            className="h-full border-0"
          />
        </div>
      </div>

      {/* Inspector Panel */}
      <Inspector
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title={selectedRequest?.nomor || 'Rincian Tiket'}
        subtitle={`Diajukan pada ${selectedRequest ? formatDate(selectedRequest.created_at) : ''}`}
        footer={
          selectedRequest && (
            <div className="flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={() => handleReorder(selectedRequest)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-control bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Ajukan Ulang Tiket Ini</span>
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
        {selectedRequest && (
          <div className="space-y-5 text-xs">
            {/* Status & Item Headline */}
            <div className="rounded-control bg-bg p-3 border border-border/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text-muted font-medium">Status Saat Ini</span>
                <Badge variant={selectedRequest.status === 'selesai' ? 'selesai' : 'diproses'}>
                  {selectedRequest.status === 'selesai' ? 'Selesai' : 'Sedang Diproses'}
                </Badge>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border/50">
                <span className="text-text-muted">Barang ATK</span>
                <span className="font-semibold text-text-main text-right">
                  {selectedRequest.items?.nama}
                </span>
              </div>
              {selectedRequest.items?.kode && (
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Kode Barang</span>
                  <span className="font-mono text-text-main">
                    {selectedRequest.items.kode}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Kuantitas Permintaan</span>
                <span className="font-semibold text-text-main">
                  {selectedRequest.jumlah} {selectedRequest.items?.satuan || 'unit'}
                </span>
              </div>
            </div>

            {/* Purpose */}
            <div>
              <span className="block text-text-muted font-medium mb-1">
                Keterangan Keperluan
              </span>
              <p className="rounded-control bg-bg border border-border/60 p-2.5 text-text-main leading-relaxed">
                {selectedRequest.keperluan}
              </p>
            </div>

            {/* GA Follow-up Notes */}
            {selectedRequest.catatan_ga && (
              <div>
                <span className="block text-text-muted font-medium mb-1">
                  Catatan Tindak Lanjut GA
                </span>
                <div className="rounded-control bg-primary-soft/40 border border-primary/20 p-2.5 text-text-main leading-relaxed">
                  {selectedRequest.catatan_ga}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div>
              <span className="block text-text-muted font-medium mb-2">
                Kronologi Penyelesaian
              </span>
              <Timeline
                createdAt={selectedRequest.created_at}
                status={selectedRequest.status}
                completedAt={selectedRequest.completed_at}
                catatanGa={selectedRequest.catatan_ga}
              />
            </div>
          </div>
        )}
      </Inspector>
    </PageContainer>
  );
}

export default function UserRiwayatPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      }
    >
      <UserRiwayatContent />
    </Suspense>
  );
}
