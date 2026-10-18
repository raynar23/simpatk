// Admin Settings page: full professional layout with corporate profile, security update, user access, and system environment
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageContainer } from '@/components/layout/PageContainer';
import { useToast } from '@/components/ui/Toast';
import type { Profile } from '@/lib/types';

export default function AdminPengaturanPage() {
  const supabase = createClient();
  const { showToast } = useToast();

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [totalUserCount, setTotalUserCount] = useState<number>(2);

  // Password update form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Fetch current user, profile, and user count
  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
          const [profRes, countRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', authData.user.id).single(),
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
          ]);

          if (!ignore) {
            if (profRes.data) {
              setProfile(profRes.data as Profile);
            }
            if (countRes.count !== null && countRes.count > 0) {
              setTotalUserCount(countRes.count);
            }
          }
        }
      } catch {
        // Silent catch
      } finally {
        if (!ignore) setIsLoadingProfile(false);
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('Kata sandi baru minimal harus 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsSubmittingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setPasswordError(error.message || 'Gagal memperbarui kata sandi.');
        return;
      }

      showToast('Kata sandi Anda berhasil diperbarui.', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordError('Terjadi kesalahan jaringan saat memperbarui kata sandi.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  return (
    <PageContainer
      title="Pengaturan"
      subtitle="Kelola profil identitas korporat, kredensial autentikasi, dan konfigurasi sistem Admin GA"
      contentClassName="flex-1 min-h-0 flex flex-col justify-between overflow-y-auto space-y-4"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Kolom Kiri: Profil & Akses Pengguna */}
        <div className="space-y-4">
          {/* 1. Read-only Profile Card */}
          <div className="bg-surface rounded-card border border-border p-4.5 space-y-3.5">
            <div className="pb-2.5 border-b border-border flex items-center justify-between">
              <h3 className="text-xs font-semibold text-text-main">Profil Akun Admin GA</h3>
              <span className="text-[11px] font-mono text-primary font-medium">Aktif</span>
            </div>

            {isLoadingProfile ? (
              <div className="space-y-3">
                <div className="h-8 bg-border/40 rounded-badge animate-pulse" />
                <div className="h-8 bg-border/40 rounded-badge animate-pulse" />
                <div className="h-8 bg-border/40 rounded-badge animate-pulse" />
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[11px] text-text-muted block mb-1">Nama Divisi / Bagian</span>
                  <p className="font-semibold text-text-main bg-bg px-3 py-2 rounded-control border border-border">
                    {profile?.nama_divisi || 'General Affairs'}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] text-text-muted block mb-1">Alamat Email Terdaftar</span>
                  <p className="font-mono text-text-main bg-bg px-3 py-2 rounded-control border border-border">
                    {profile?.email || 'admin.ga@tps.co.id'}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] text-text-muted block mb-1">Hak Akses Sistem</span>
                  <div className="bg-bg px-3 py-2 rounded-control border border-border flex items-center justify-between">
                    <span className="font-semibold text-primary">Administrator GA (Penuh)</span>
                    <span className="text-[10px] bg-primary-soft text-primary px-2 py-0.5 rounded-badge font-semibold">
                      Role: Admin
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Pengelolaan Akses Pengguna */}
          <div className="bg-surface rounded-card border border-border p-4.5 space-y-3.5">
            <div className="pb-2.5 border-b border-border flex items-center justify-between">
              <h3 className="text-xs font-semibold text-text-main">Pengelolaan Akun Pengguna</h3>
              <span className="text-[11px] text-text-muted tabular-nums">{totalUserCount} Pengguna Terdaftar</span>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Sebagai Administrator GA, Anda memiliki hak akses penuh untuk mendaftarkan akun divisi pemohon baru, menentukan peranan sistem, dan memantau status pengguna yang aktif.
            </p>

            <div className="pt-1">
              <Link
                href="/admin/pengguna"
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-control border border-primary/30 bg-primary-soft hover:bg-primary-soft/80 text-primary text-xs font-semibold transition-colors cursor-pointer min-h-[34px]"
              >
                <span>Buka Pengelolaan Pengguna</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Keamanan Kata Sandi & Konfigurasi Sistem */}
        <div className="space-y-4">
          {/* 3. Change Password Form */}
          <div className="bg-surface rounded-card border border-border p-4.5 space-y-3.5">
            <div className="pb-2.5 border-b border-border">
              <h3 className="text-xs font-semibold text-text-main">Ganti Kata Sandi</h3>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-3 text-xs">
              {/* New Password */}
              <div>
                <label htmlFor="new_password" className="block text-xs font-semibold text-text-main mb-1">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <input
                    id="new_password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    className="w-full pl-3 pr-9 py-2 rounded-control border border-border bg-bg text-text-main placeholder:text-text-muted focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary min-h-[34px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-main cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirm_password" className="block text-xs font-semibold text-text-main mb-1">
                  Konfirmasi Kata Sandi Baru
                </label>
                <div className="relative">
                  <input
                    id="confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    required
                    className="w-full pl-3 pr-9 py-2 rounded-control border border-border bg-bg text-text-main placeholder:text-text-muted focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary min-h-[34px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-main cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="p-2.5 rounded-control bg-danger-soft border border-danger/20 text-xs text-danger">
                  {passwordError}
                </div>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSubmittingPassword || !newPassword || !confirmPassword}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-control bg-primary hover:bg-primary-dark active:scale-[0.99] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer min-h-[34px]"
                >
                  {isSubmittingPassword ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Memperbarui Kata Sandi...</span>
                    </>
                  ) : (
                    <span>Perbarui Kata Sandi</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* 4. Konfigurasi Lingkungan & Keamanan */}
          <div className="bg-surface rounded-card border border-border p-4.5 space-y-3">
            <div className="pb-2.5 border-b border-border">
              <h3 className="text-xs font-semibold text-text-main">Konfigurasi Sistem & Keamanan</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-text-muted">Zona Waktu Sistem</span>
                <span className="font-semibold text-text-main">Asia/Jakarta (WIB)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-text-muted">Format Waktu & Angka</span>
                <span className="font-semibold text-text-main">Bahasa Indonesia (id-ID)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-text-muted">Arsitektur Basis Data</span>
                <span className="font-semibold text-text-main">PostgreSQL 15 + RLS</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-text-muted">Keamanan Akses Klien</span>
                <span className="font-semibold text-success">Aktif (Role Definer)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Version Pinned at Bottom */}
      <p className="text-center text-xs text-text-muted select-none mt-auto pt-6 pb-2 shrink-0">
        SIMPATK Versi 2.0
      </p>
    </PageContainer>
  );
}
