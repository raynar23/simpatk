// Admin Settings page: read-only corporate profile, secure password update, and system version info
'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import type { Profile } from '@/lib/types';

export default function AdminPengaturanPage() {
  const supabase = createClient();
  const { showToast } = useToast();

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Password update form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Fetch current user and profile
  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
          const { data: profData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          if (!ignore && profData) {
            setProfile(profData as Profile);
          }
        }
      } catch {
        // Silent catch
      } finally {
        if (!ignore) setIsLoadingProfile(false);
      }
    }

    loadProfile();

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
    <div className="p-3 sm:p-5 max-w-[960px] mx-auto space-y-5 select-none">
      <div>
        <h2 className="text-sm font-semibold text-text-main tracking-tight flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span>Pengaturan Akun & Keamanan</span>
        </h2>
        <p className="text-[11px] text-text-muted mt-0.5">
          Kelola profil identitas korporat dan kredensial autentikasi sistem Admin GA
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Read-only Profile Card */}
        <div className="bg-surface rounded-card border border-border p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <User className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-semibold text-text-main">Profil Akun Admin GA</h3>
          </div>

          {isLoadingProfile ? (
            <div className="space-y-3">
              <div className="h-8 bg-border/40 rounded-badge animate-pulse" />
              <div className="h-8 bg-border/40 rounded-badge animate-pulse" />
              <div className="h-8 bg-border/40 rounded-badge animate-pulse" />
            </div>
          ) : (
            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-[11px] text-text-muted block mb-0.5">Nama Divisi / Bagian</span>
                <p className="font-semibold text-text-main bg-bg px-3 py-2 rounded-control border border-border">
                  {profile?.nama_divisi || 'General Affairs'}
                </p>
              </div>

              <div>
                <span className="text-[11px] text-text-muted block mb-0.5">Alamat Email Terdaftar</span>
                <p className="font-mono text-text-main bg-bg px-3 py-2 rounded-control border border-border">
                  {profile?.email || 'admin.ga@tps.co.id'}
                </p>
              </div>

              <div>
                <span className="text-[11px] text-text-muted block mb-0.5">Hak Akses Sistem</span>
                <div className="flex items-center gap-2 bg-bg px-3 py-2 rounded-control border border-border">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-primary">Administrator GA (Penuh)</span>
                </div>
              </div>

              <p className="text-[11px] text-text-muted leading-relaxed pt-1">
                Data profil identitas dikelola langsung oleh administrator sistem TI Pelindo Terminal Petikemas.
              </p>
            </div>
          )}
        </div>

        {/* 2. Change Password Form */}
        <div className="bg-surface rounded-card border border-border p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <KeyRound className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-semibold text-text-main">Ganti Kata Sandi</h3>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-3.5 text-xs">
            {/* New Password */}
            <div>
              <label htmlFor="new_password" className="block text-xs font-semibold text-text-main mb-1">
                Kata Sandi Baru
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  id="new_password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  className="w-full pl-9 pr-9 py-2 rounded-control border border-border bg-bg text-text-main placeholder:text-text-muted focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary min-h-[36px]"
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
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  id="confirm_password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  required
                  className="w-full pl-9 pr-9 py-2 rounded-control border border-border bg-bg text-text-main placeholder:text-text-muted focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary min-h-[36px]"
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
              <div className="flex items-center gap-2 p-2.5 rounded-control bg-danger-soft border border-danger/20 text-xs text-danger">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmittingPassword || !newPassword || !confirmPassword}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-control bg-primary hover:bg-primary-dark active:scale-[0.99] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer min-h-[36px]"
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
      </div>

      {/* 3. System Information Card */}
      <div className="bg-surface rounded-card border border-border p-5 space-y-3 text-xs select-none">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Info className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-semibold text-text-main">Informasi Sistem SIMPATK</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
          <div>
            <span className="text-[11px] text-text-muted block">Versi Aplikasi</span>
            <span className="font-semibold text-text-main">SIMPATK v2.0 Enterprise</span>
          </div>
          <div>
            <span className="text-[11px] text-text-muted block">Entitas Korporat</span>
            <span className="font-semibold text-text-main">PT Pelindo Terminal Petikemas</span>
          </div>
          <div>
            <span className="text-[11px] text-text-muted block">Arsitektur Database</span>
            <span className="font-semibold text-text-main">PostgreSQL 15 + RLS Definer</span>
          </div>
          <div>
            <span className="text-[11px] text-text-muted block">Status Sistem</span>
            <span className="font-semibold text-success flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success" />
              Operasional Normal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
