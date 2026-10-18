// User Account Settings: division profile summary, credential update, and system compliance
'use client';

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageContainer } from '@/components/layout/PageContainer';
import { useToast } from '@/components/ui/Toast';
import type { Profile } from '@/lib/types';

export default function UserPengaturanPage() {
  const supabase = createClient();
  const { showToast } = useToast();

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

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

    async function loadData() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          if (authData.user.email) {
            setUserEmail(authData.user.email);
          }

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

    loadData();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  // Handle password change
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

      showToast('Kata sandi akun divisi berhasil diperbarui.', 'success');
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
      title="Pengaturan Akun"
      subtitle="Kelola preferensi akun divisi dan keamanan kredensial akses."
    >
      <div className="h-full flex flex-col justify-between min-h-0 gap-4 overflow-y-auto pr-0.5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Panel Kiri: Profil Divisi Pemohon (Read-Only) */}
          <div className="bg-surface rounded-card border border-border p-5 flex flex-col justify-between">
            <div>
              <div className="pb-3 border-b border-border/70 mb-4">
                <h2 className="text-sm font-semibold text-text-main tracking-tight">
                  Profil Akun Divisi
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Informasi identitas unit kerja pemohon dalam sistem SIMPATK.
                </p>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-text-muted font-medium mb-1">
                    Nama Divisi Pemohon
                  </label>
                  <div className="rounded-control bg-bg px-3.5 py-2.5 font-semibold text-text-main border border-border/80">
                    {isLoadingProfile
                      ? 'Memuat data divisi...'
                      : profile?.nama_divisi || 'Memuat profil...'}
                  </div>
                </div>

                <div>
                  <label className="block text-text-muted font-medium mb-1">
                    Alamat Email Korporat
                  </label>
                  <div className="rounded-control bg-bg px-3.5 py-2.5 font-medium text-text-main border border-border/80">
                    {userEmail || 'Memuat email...'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-text-muted font-medium mb-1">
                      Peran Sistem
                    </label>
                    <div className="rounded-control bg-bg px-3.5 py-2 text-text-main font-semibold border border-border/80">
                      Divisi Pemohon
                    </div>
                  </div>

                  <div>
                    <label className="block text-text-muted font-medium mb-1">
                      Status Akun
                    </label>
                    <div className="rounded-control bg-success/10 text-success font-semibold px-3.5 py-2 border border-success/20">
                      Aktif
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-control bg-bg border border-border/70 text-[11px] text-text-muted leading-relaxed space-y-1">
                  <p className="font-medium text-text-main">Kebijakan Permintaan ATK:</p>
                  <p>
                    Semua pengajuan permintaan alat tulis kantor oleh divisi diproses langsung oleh General Affairs tanpa memerlukan alur persetujuan bertingkat, guna menjaga kelancaran operasional pelabuhan.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Panel Kanan: Form Keamanan & Ganti Kata Sandi */}
          <div className="bg-surface rounded-card border border-border p-5 flex flex-col justify-between">
            <div>
              <div className="pb-3 border-b border-border/70 mb-4">
                <h2 className="text-sm font-semibold text-text-main tracking-tight">
                  Perbarui Kata Sandi
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Tingkatkan keamanan akses dengan memperbarui kata sandi secara berkala.
                </p>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {/* Kata Sandi Baru */}
                <div>
                  <label
                    htmlFor="user-new-password"
                    className="block text-xs font-medium text-text-main mb-1.5"
                  >
                    Kata Sandi Baru <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="user-new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setPasswordError(null);
                      }}
                      placeholder="Minimal 6 karakter"
                      className="w-full rounded-control border border-border bg-bg pl-3.5 pr-10 py-2.5 text-xs text-text-main placeholder:text-text-muted/60 transition-colors focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted hover:text-text-main transition-colors cursor-pointer"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                      ) : (
                        <Eye className="w-4 h-4" strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Konfirmasi Kata Sandi */}
                <div>
                  <label
                    htmlFor="user-confirm-password"
                    className="block text-xs font-medium text-text-main mb-1.5"
                  >
                    Konfirmasi Kata Sandi Baru <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="user-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPasswordError(null);
                      }}
                      placeholder="Ulangi kata sandi baru"
                      className="w-full rounded-control border border-border bg-bg pl-3.5 pr-10 py-2.5 text-xs text-text-main placeholder:text-text-muted/60 transition-colors focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Sembunyikan konfirmasi kata sandi' : 'Tampilkan konfirmasi kata sandi'}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted hover:text-text-main transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                      ) : (
                        <Eye className="w-4 h-4" strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {passwordError && (
                  <div className="rounded-control bg-danger-soft border border-danger/20 p-2.5 text-xs text-danger leading-relaxed">
                    {passwordError}
                  </div>
                )}

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingPassword}
                    className="w-full inline-flex items-center justify-center rounded-control bg-primary hover:bg-primary-dark text-white px-4 py-2.5 text-xs font-semibold shadow-subtle transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {isSubmittingPassword ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                        <span>Menyimpan Kata Sandi...</span>
                      </>
                    ) : (
                      <span>Simpan Kata Sandi</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* System Version at Bottom */}
        <div className="mt-auto pt-6 text-center text-xs text-text-muted border-t border-border/40 select-none">
          <p className="font-medium text-text-main">
            SIMPATK Versi 2.0
          </p>
          <p className="text-[11px] mt-0.5">
            General Affairs &copy; 2026 PT Pelindo Terminal Petikemas TPS Surabaya. Hak cipta dilindungi.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
