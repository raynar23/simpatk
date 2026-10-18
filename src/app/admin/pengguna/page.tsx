// Admin GA User Management page (Pengelolaan Pengguna) conforming to 100dvh and PageContainer standards
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Eye, EyeOff, Loader2, ChevronDown } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import type { Profile, AppRole } from '@/lib/types';

interface UserAccount extends Profile {
  email: string;
  created_at?: string;
}

export default function AdminPenggunaPage() {
  const { showToast } = useToast();

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [namaDivisi, setNamaDivisi] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AppRole>('user');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Initial load users
  useEffect(() => {
    let ignore = false;

    async function fetchUsers() {
      try {
        const res = await fetch('/api/admin/users');
        const data = await res.json();
        if (!ignore && res.ok && data.users) {
          setUsers(data.users);
        } else if (!ignore) {
          setUsers([
            {
              id: '1',
              nama_divisi: 'General Affairs',
              email: 'admin.ga@tps.co.id',
              role: 'admin',
              created_at: new Date().toISOString(),
            },
            {
              id: '2',
              nama_divisi: 'Divisi Operasional & Komersial',
              email: 'ga@tps.co.id',
              role: 'user',
              created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
            },
          ]);
        }
      } catch {
        if (!ignore) {
          showToast('Gagal memuat daftar pengguna.', 'error');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    fetchUsers();

    return () => {
      ignore = true;
    };
  }, [showToast]);

  // Refresh users on demand after mutation
  const refreshUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      }
    } catch {
      showToast('Gagal memuat daftar pengguna.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // KPI Metrics
  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const userCount = users.filter((u) => u.role === 'user').length;

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.nama_divisi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Paginated users
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!namaDivisi.trim()) {
      setFormError('Nama divisi wajib diisi.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setFormError('Alamat email tidak valid.');
      return;
    }

    if (password.length < 6) {
      setFormError('Kata sandi awal minimal harus 6 karakter.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_divisi: namaDivisi.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Gagal menambahkan pengguna baru.');
        return;
      }

      showToast(`Pengguna untuk ${namaDivisi} berhasil ditambahkan.`, 'success');
      setIsModalOpen(false);
      setNamaDivisi('');
      setEmail('');
      setPassword('');
      setRole('user');
      refreshUsers();
    } catch {
      setFormError('Terjadi kesalahan jaringan saat menyimpan data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // DataTable Columns definition
  const columns: ColumnDef<UserAccount>[] = [
    {
      id: 'nama_divisi',
      header: 'Nama Divisi / Bagian',
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-text-main text-xs">{row.nama_divisi}</span>
          <span className="text-[11px] text-text-muted font-mono truncate">{row.id.slice(0, 8)}...</span>
        </div>
      ),
    },
    {
      id: 'email',
      header: 'Alamat Email',
      cell: (row) => (
        <span className="font-mono text-xs text-text-main select-all">
          {row.email || '-'}
        </span>
      ),
    },
    {
      id: 'role',
      header: 'Hak Akses',
      cell: (row) => (
        row.role === 'admin' ? (
          <Badge variant="info">
            Administrator GA
          </Badge>
        ) : (
          <Badge variant="normal">
            Divisi Pemohon
          </Badge>
        )
      ),
    },
    {
      id: 'created_at',
      header: 'Terdaftar Sejak',
      cell: (row) => (
        <span className="text-xs text-text-muted tabular-nums">
          {row.created_at ? formatDate(row.created_at) : 'Terdaftar'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status Akun',
      cell: () => (
        <Badge variant="selesai">
          Aktif
        </Badge>
      ),
    },
  ];

  const headerActions = (
    <button
      type="button"
      onClick={() => {
        setFormError(null);
        setIsModalOpen(true);
      }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control bg-primary hover:bg-primary-dark active:scale-[0.99] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer min-h-[34px]"
    >
      <Plus className="w-3.5 h-3.5" strokeWidth={2} />
      <span>Tambah Pengguna</span>
    </button>
  );

  return (
    <PageContainer
      title="Pengguna"
      subtitle="Daftar akun divisi pemohon dan hak akses administrator SIMPATK"
      actions={headerActions}
      contentClassName="space-y-3.5 flex-1 min-h-0 flex flex-col overflow-hidden"
    >
      {/* 1. Compact Metric Strip (3 Mini Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
        <div className="bg-surface rounded-card border border-border p-3 flex items-center justify-between">
          <span className="text-xs text-text-muted">Total Pengguna</span>
          <span className="text-lg font-bold text-text-main tabular-nums">{totalUsers}</span>
        </div>
        <div className="bg-surface rounded-card border border-border p-3 flex items-center justify-between">
          <span className="text-xs text-text-muted">Divisi Pemohon</span>
          <span className="text-lg font-bold text-text-main tabular-nums">{userCount}</span>
        </div>
        <div className="bg-surface rounded-card border border-border p-3 flex items-center justify-between">
          <span className="text-xs text-text-muted">Administrator GA</span>
          <span className="text-lg font-bold text-primary tabular-nums">{adminCount}</span>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
        <div className="w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Cari divisi atau email..."
            className="w-full px-3 py-1.5 text-xs rounded-control border border-border bg-surface text-text-main placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary min-h-[34px]"
          />
        </div>

        <div className="inline-flex p-0.5 rounded-control bg-bg border border-border text-xs self-start sm:self-auto">
          {[
            { key: 'all', label: `Semua (${totalUsers})` },
            { key: 'user', label: `Divisi Pemohon (${userCount})` },
            { key: 'admin', label: `Admin GA (${adminCount})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setRoleFilter(tab.key as 'all' | 'admin' | 'user');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-badge text-xs font-medium transition-colors cursor-pointer ${
                roleFilter === tab.key
                  ? 'bg-surface text-text-main shadow-xs font-semibold'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Paginated DataTable filling available height (100dvh compliance) */}
      <div className="flex-1 min-h-0 flex flex-col">
        <DataTable
          columns={columns}
          data={paginatedUsers}
          totalCount={filteredUsers.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          isLoading={isLoading}
          enableDynamicHeight={true}
          emptyMessage="Tidak ada pengguna yang sesuai dengan kriteria pencarian"
          className="flex-1 min-h-0"
        />
      </div>

      {/* Version Pinned at Bottom */}
      <p className="text-center text-xs text-text-muted select-none mt-auto shrink-0 pb-1">
        SIMPATK Versi 2.0
      </p>

      {/* 4. Modal Tambah Pengguna Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-user-title"
            className="w-full max-w-md bg-surface rounded-card border border-border shadow-modal p-5 space-y-4 text-xs"
          >
            <div className="pb-3 border-b border-border flex items-center justify-between">
              <h3 id="modal-user-title" className="text-sm font-semibold text-text-main">
                Tambah Pengguna Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text-main text-xs px-2 py-1 rounded-control hover:bg-bg cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              {/* Nama Divisi */}
              <div>
                <label htmlFor="modal_divisi" className="block text-xs font-semibold text-text-main mb-1">
                  Nama Divisi / Bagian
                </label>
                <input
                  id="modal_divisi"
                  type="text"
                  value={namaDivisi}
                  onChange={(e) => setNamaDivisi(e.target.value)}
                  placeholder="Contoh: Divisi Keuangan & Akuntansi"
                  required
                  className="w-full px-3 py-2 rounded-control border border-border bg-bg text-text-main placeholder:text-text-muted focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary min-h-[36px]"
                />
              </div>

              {/* Alamat Email */}
              <div>
                <label htmlFor="modal_email" className="block text-xs font-semibold text-text-main mb-1">
                  Alamat Email Akun
                </label>
                <input
                  id="modal_email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama.divisi@tps.co.id"
                  required
                  className="w-full px-3 py-2 rounded-control border border-border bg-bg text-text-main placeholder:text-text-muted focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary min-h-[36px]"
                />
              </div>

              {/* Kata Sandi Awal */}
              <div>
                <label htmlFor="modal_pass" className="block text-xs font-semibold text-text-main mb-1">
                  Kata Sandi Awal
                </label>
                <div className="relative">
                  <input
                    id="modal_pass"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    className="w-full pl-3 pr-9 py-2 rounded-control border border-border bg-bg text-text-main placeholder:text-text-muted focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary min-h-[36px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-main cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Hak Akses / Peran */}
              <div>
                <label htmlFor="modal_role" className="block text-xs font-semibold text-text-main mb-1">
                  Hak Akses Sistem
                </label>
                <div className="relative">
                  <select
                    id="modal_role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as AppRole)}
                    className="w-full appearance-none pl-3 pr-8.5 py-2 rounded-control border border-border bg-bg text-text-main focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary min-h-[36px] cursor-pointer"
                  >
                    <option value="user">Divisi Pemohon (Permintaan ATK)</option>
                    <option value="admin">Administrator GA (Kelola Lengkap)</option>
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted"
                    strokeWidth={1.5}
                  />
                </div>
              </div>

              {formError && (
                <div className="p-2.5 rounded-control bg-danger-soft border border-danger/20 text-xs text-danger">
                  {formError}
                </div>
              )}

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-control border border-border text-text-muted hover:text-text-main hover:bg-bg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-control bg-primary hover:bg-primary-dark text-white font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer min-h-[34px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Pengguna</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
