// Admin request master-detail page with DataTable, Realtime updates, and Inspector slide-over
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { RequestInspector } from '@/components/admin/RequestInspector';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatDateShort } from '@/lib/utils';
import type { RequestWithDetails } from '@/lib/types';

export default function AdminPermintaanPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestWithDetails | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Filters and pagination state
  const [statusFilter, setStatusFilter] = useState<'semua' | 'diproses' | 'selesai'>('semua');
  const [dateRangeFilter, setDateRangeFilter] = useState<'semua' | '7' | '30' | 'month'>('semua');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Initial fetch all requests
  useEffect(() => {
    let ignore = false;

    async function loadRequests() {
      try {
        const { data, error } = await supabase
          .from('requests')
          .select('*, items(*), profiles(*)')
          .order('created_at', { ascending: false });

        if (ignore) return;
        if (error) {
          showToast('Gagal memuat data permintaan.', 'error');
          return;
        }

        if (data) {
          setRequests(data as RequestWithDetails[]);
          // If initial search param query matches a single request, auto-open it
          const initialQ = searchParams.get('q');
          if (initialQ) {
            const found = (data as RequestWithDetails[]).find((r) => r.nomor === initialQ);
            if (found) {
              setSelectedRequest(found);
              setIsInspectorOpen(true);
            }
          }
        }
      } catch {
        if (!ignore) showToast('Gagal menghubungi server.', 'error');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadRequests();

    return () => {
      ignore = true;
    };
  }, [supabase, showToast, searchParams]);

  // Realtime subscription for requests table
  useEffect(() => {
    const channel = supabase
      .channel('admin-requests-realtime-sub')
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
              const newReq = data as RequestWithDetails;
              setRequests((prev) => [newReq, ...prev.filter((r) => r.id !== newReq.id)]);
              setHighlightedId(newReq.id);
              showToast(`Permintaan baru masuk: ${newReq.nomor || 'ATK'}`, 'info');
              setTimeout(() => setHighlightedId(null), 3000);
            }
          } else if (payload.eventType === 'UPDATE') {
            setRequests((prev) =>
              prev.map((r) =>
                r.id === payload.new.id
                  ? {
                      ...r,
                      status: payload.new.status,
                      completed_at: payload.new.completed_at,
                      catatan_ga: payload.new.catatan_ga,
                    }
                  : r
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

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    let result = [...requests];

    // Status filter
    if (statusFilter !== 'semua') {
      result = result.filter((r) => r.status === statusFilter);
    }

    // Date range filter
    if (dateRangeFilter !== 'semua') {
      const now = new Date();
      if (dateRangeFilter === '7') {
        const threshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        result = result.filter((r) => new Date(r.created_at) >= threshold);
      } else if (dateRangeFilter === '30') {
        const threshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        result = result.filter((r) => new Date(r.created_at) >= threshold);
      } else if (dateRangeFilter === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        result = result.filter((r) => new Date(r.created_at) >= startOfMonth);
      }
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.nomor?.toLowerCase().includes(q) ||
          r.items?.nama?.toLowerCase().includes(q) ||
          r.items?.kode?.toLowerCase().includes(q) ||
          r.keperluan?.toLowerCase().includes(q) ||
          r.profiles?.nama_divisi?.toLowerCase().includes(q)
      );
    }

    // Sorting
    result.sort((a, b) => {
      let valA: unknown = a[sortColumn as keyof RequestWithDetails];
      let valB: unknown = b[sortColumn as keyof RequestWithDetails];

      if (sortColumn === 'items') {
        valA = a.items?.nama || '';
        valB = b.items?.nama || '';
      } else if (sortColumn === 'profiles') {
        valA = a.profiles?.nama_divisi || '';
        valB = b.profiles?.nama_divisi || '';
      }

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      const comp = valA < valB ? -1 : 1;
      return sortDirection === 'asc' ? comp : -comp;
    });

    return result;
  }, [requests, statusFilter, dateRangeFilter, searchQuery, sortColumn, sortDirection]);

  // Paginated slice
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  // Column definitions for DataTable
  const columns: ColumnDef<RequestWithDetails>[] = [
    {
      id: 'nomor',
      header: 'Nomor',
      accessorKey: 'nomor',
      isSortable: true,
      cell: (row) => (
        <span className="font-mono font-semibold text-primary text-[11px]">
          {row.nomor || 'REQ'}
        </span>
      ),
    },
    {
      id: 'created_at',
      header: 'Tanggal',
      accessorKey: 'created_at',
      isSortable: true,
      cell: (row) => (
        <span className="text-text-muted tabular-nums whitespace-nowrap">
          {formatDateShort(row.created_at)}
        </span>
      ),
    },
    {
      id: 'profiles',
      header: 'Divisi Pemohon',
      cell: (row) => (
        <span className="font-medium text-text-main truncate">
          {row.profiles?.nama_divisi || 'Divisi Pemohon'}
        </span>
      ),
    },
    {
      id: 'items',
      header: 'Nama Barang ATK',
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-medium text-text-main truncate">{row.items?.nama || '-'}</p>
          <p className="text-[10px] text-text-muted font-mono">{row.items?.kode}</p>
        </div>
      ),
    },
    {
      id: 'jumlah',
      header: 'Jumlah',
      accessorKey: 'jumlah',
      isNumeric: true,
      isSortable: true,
      cell: (row) => (
        <span className="tabular-nums font-semibold text-text-main">
          {row.jumlah} <span className="font-normal text-text-muted">{row.items?.satuan}</span>
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      isNumeric: true,
      isSortable: true,
      cell: (row) => <Badge variant={row.status as 'diproses' | 'selesai'} />,
    },
  ];

  const handleRowClick = (row: RequestWithDetails) => {
    setSelectedRequest(row);
    setIsInspectorOpen(true);
  };

  const handleCompletedSuccess = (updated: RequestWithDetails) => {
    setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setSelectedRequest(updated);
  };

  return (
    <PageContainer
      title="Permintaan"
      subtitle="Kelola dan pantau proses serah terima barang operasional seluruh divisi"
    >
      {/* Main DataTable Master View */}
      <DataTable
        columns={columns}
        data={paginatedData}
        totalCount={filteredData.length}
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
        searchPlaceholder="Cari nomor, barang, keperluan, atau divisi..."
        filterControls={
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Status Filter */}
            <div className="inline-flex p-0.5 rounded-control bg-bg border border-border text-xs">
              {[
                { key: 'semua', label: 'Semua Status' },
                { key: 'diproses', label: 'Diproses' },
                { key: 'selesai', label: 'Selesai' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(opt.key as typeof statusFilter);
                    setPage(1);
                  }}
                  className={`px-2 py-0.5 rounded-badge text-[11px] transition-colors cursor-pointer ${
                    statusFilter === opt.key
                      ? 'bg-surface text-text-main shadow-xs font-semibold'
                      : 'text-text-muted hover:text-text-main'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Date Range Filter with balanced chevron and calendar icon */}
            <div className="relative inline-flex items-center">
              <Calendar
                className="pointer-events-none absolute left-2.5 w-3.5 h-3.5 text-text-muted"
                strokeWidth={1.5}
              />
              <select
                value={dateRangeFilter}
                onChange={(e) => {
                  setDateRangeFilter(e.target.value as typeof dateRangeFilter);
                  setPage(1);
                }}
                className="appearance-none pl-8 pr-8.5 py-1.5 text-xs rounded-control border border-border bg-bg text-text-main focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary min-h-[32px] cursor-pointer"
                title="Filter rentang waktu permintaan"
              >
                <option value="semua">Semua Waktu</option>
                <option value="7">7 Hari Terakhir</option>
                <option value="30">30 Hari Terakhir</option>
                <option value="month">Bulan Ini</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 w-3.5 h-3.5 text-text-muted"
                strokeWidth={1.5}
              />
            </div>
          </div>
        }
        onRowClick={handleRowClick}
        isLoading={isLoading}
        emptyMessage="Tidak ada permintaan yang sesuai kriteria filter."
        csvFilename="daftar_permintaan_atk.csv"
        enableDynamicHeight={true}
        className={`flex-1 min-h-0 ${highlightedId ? 'ring-2 ring-primary/40 transition-all' : ''}`}
      />

      {/* Detail Slide-over Inspector */}
      <RequestInspector
        request={selectedRequest}
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        onCompletedSuccess={handleCompletedSuccess}
      />
    </PageContainer>
  );
}
