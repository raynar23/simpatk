'use client';

// Login page with responsive split layout and friendly authentication feedback
import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrorMessage('Email atau kata sandi salah. Silakan periksa kembali.');
        } else {
          setErrorMessage('Gagal masuk ke sistem. Periksa koneksi internet Anda atau coba sesaat lagi.');
        }
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Fetch role to route user immediately
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        router.refresh();
        if (profile?.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/user');
        }
      }
    } catch {
      setErrorMessage('Terjadi kendala pada sistem. Silakan coba kembali.');
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh w-full">
      {/* Left panel: visible on large screens */}
      <section className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary-dark p-12 text-white">
        <div>
          <div className="relative h-12 w-64">
            <Image
              src="/logo/tps-white.png"
              alt="Logo Pelindo Terminal Petikemas"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </div>

        <div className="max-w-md">
          <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-white/15 text-white/95 mb-3 tracking-wide">
            Internal General Affairs
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            SIMPATK
          </h1>
          <p className="mt-3 text-sm text-white/80 leading-relaxed">
            Sistem Informasi Manajemen Permintaan Alat Tulis Kantor untuk divisi internal Pelindo Terminal Petikemas.
          </p>
        </div>

        <div className="text-xs text-white/60">
          PT Pelindo Terminal Petikemas &copy; 2025
        </div>
      </section>

      {/* Right panel: form for both mobile and desktop */}
      <section className="flex flex-1 flex-col items-center justify-center p-6 sm:p-10 bg-bg min-h-dvh">
        <div className="w-full max-w-sm">
          {/* Mobile brand header */}
          <div className="lg:hidden mb-8 text-center flex flex-col items-center">
            <div className="relative h-12 w-56 mb-4">
              <Image
                src="/logo/pelindo-color.png"
                alt="Logo Pelindo Terminal Petikemas"
                fill
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-xl font-semibold text-text-main tracking-tight">
              SIMPATK
            </h1>
            <p className="text-xs text-text-muted mt-1">
              Sistem Informasi Manajemen Permintaan ATK
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-surface rounded-card border border-border p-6 sm:p-8 shadow-subtle">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-text-main tracking-tight">
                Masuk ke Akun
              </h2>
              <p className="text-xs text-text-muted mt-1">
                Masukkan email dan kata sandi kedinasan Anda.
              </p>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="mb-5 rounded-control bg-danger-soft border border-danger/20 p-3 text-xs text-danger leading-relaxed"
              >
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-text-main mb-1.5"
                >
                  Alamat Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@tps.co.id"
                  className="w-full rounded-control border border-border bg-surface px-3 py-2 text-base sm:text-xs text-text-main placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px] sm:min-h-[36px] transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-text-main mb-1.5"
                >
                  Kata Sandi
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-control border border-border bg-surface px-3 py-2 text-base sm:text-xs text-text-main placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px] sm:min-h-[36px] transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full inline-flex items-center justify-center rounded-control bg-primary px-4 py-2 text-sm sm:text-xs font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px] sm:min-h-[36px] transition-colors cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Memproses Masuk...
                    </>
                  ) : (
                    'Masuk'
                  )}
                </button>
              </div>
            </form>
          </div>

          <p className="text-center text-xs text-text-muted mt-6">
            Bantuan akses atau reset akun hubungi General Affairs.
          </p>
        </div>
      </section>
    </main>
  );
}
