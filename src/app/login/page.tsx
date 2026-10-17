'use client';

// Dynamic login page with full-bleed terminal backdrop on left and animated modern form card on right
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const emailInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Auto focus email input on mount
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

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
    <main className="min-h-dvh w-full flex flex-col lg:flex-row bg-[#F8FAFC]">
      {/* Left column: Full-bleed Photo Panel with right side drop shadow */}
      <section className="hidden lg:flex relative w-1/2 xl:w-[52%] min-h-dvh select-none overflow-hidden flex-col justify-between p-12 shrink-0 z-20 shadow-[14px_0_40px_rgba(0,0,0,0.18),4px_0_12px_rgba(0,0,0,0.08)] border-r border-black/10">
        {/* Terminal background image with object-position 62% 50% */}
        <Image
          src="/images/tps-terminal.jpg"
          alt="Terminal Petikemas Surabaya"
          fill
          priority
          quality={85}
          sizes="52vw"
          className="object-cover"
          style={{ objectPosition: '62% 50%' }}
        />

        {/* Dynamic multi-layer overlay for crisp contrast and vibrant colors */}
        <div className="absolute inset-0 bg-[#0B5A94]/25 z-10" />
        <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/70 via-black/25 to-transparent z-10" />
        <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10" />

        {/* Top Content: White TPS Logo */}
        <div className="relative z-20">
          <div className="relative h-11 w-56">
            <Image
              src="/logo/tps-white.png"
              alt="Logo Pelindo Terminal Petikemas TPS"
              fill
              className="object-contain object-left drop-shadow-md"
              priority
            />
          </div>
        </div>

        {/* Bottom Content: App Title, Description, and Feature Chips */}
        <div className="relative z-20 text-white max-w-lg space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-badge bg-primary text-white text-xs font-semibold tracking-wide uppercase shadow-sm">
            General Affairs
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white leading-tight drop-shadow-md">
            SIMPATK
          </h1>
          <p className="text-sm text-white/95 leading-relaxed drop-shadow-sm font-normal">
            Sistem Informasi Manajemen Permintaan ATK, General Affairs Pelindo Terminal Petikemas.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-white/90">
            <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-sm px-2.5 py-1 rounded-badge border border-white/15">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
              <span>Otomatisasi Disetujui</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-sm px-2.5 py-1 rounded-badge border border-white/15">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
              <span>Stok Fisik Realtime</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-sm px-2.5 py-1 rounded-badge border border-white/15">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
              <span>100% Paperless</span>
            </div>
          </div>
        </div>
      </section>

      {/* Right column: Form Area with Elevated Card & Refined Micro-interactions */}
      <section className="flex-1 flex flex-col justify-between items-center px-4 py-8 sm:px-8 lg:px-12 min-h-dvh bg-[#F8FAFC] pb-[calc(env(safe-area-inset-bottom,0px)+24px)] relative z-10">
        <div className="w-full max-w-[420px] my-auto">
          {/* Form Card Container with multi-layered side & elevation shadow */}
          <div className="relative bg-surface rounded-sheet border border-border/80 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.10),0_4px_16px_-2px_rgba(15,23,42,0.05),-8px_0_24px_-6px_rgba(17,117,187,0.08)] p-6 sm:p-9 transition-all overflow-hidden">
            {/* Top decorative primary gradient line */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-primary-light to-primary" />

            {/* Header with Color Pelindo Logo */}
            <div className="mb-6">
              <div className="relative h-10 w-48 mb-4">
                <Image
                  src="/logo/pelindo-color.png"
                  alt="Logo Pelindo Terminal Petikemas"
                  fill
                  className="object-contain object-left"
                  priority
                />
              </div>
              <h2 className="text-2xl font-bold text-text-main tracking-tight leading-tight">
                Masuk ke Akun
              </h2>
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                Gunakan akun kedinasan untuk mengakses portal permintaan ATK.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Field with Left Icon */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-text-main mb-1.5"
                >
                  Alamat Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                    <Mail className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <input
                    ref={emailInputRef}
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@tps.co.id"
                    className="w-full rounded-control border border-border bg-bg pl-10 pr-3.5 py-2.5 text-base sm:text-xs text-text-main placeholder:text-text-muted/60 transition-all hover:border-primary/40 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px] sm:min-h-[38px]"
                  />
                </div>
              </div>

              {/* Password Field with Left Icon and Show/Hide Button */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-text-main mb-1.5"
                >
                  Kata Sandi
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                    <Lock className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-control border border-border bg-bg pl-10 pr-10 py-2.5 text-base sm:text-xs text-text-main placeholder:text-text-muted/60 transition-all hover:border-primary/40 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px] sm:min-h-[38px]"
                  />
                  <button
                    type="button"
                    tabIndex={0}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted hover:text-text-main transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                    ) : (
                      <Eye className="w-4 h-4" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </div>

              {/* Error banner: preserves layout stability */}
              <div
                aria-live="polite"
                className={`transition-all duration-150 ${
                  errorMessage
                    ? 'opacity-100 max-h-20 pt-1'
                    : 'opacity-0 max-h-0 overflow-hidden pointer-events-none'
                }`}
              >
                {errorMessage && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-control bg-danger-soft border border-danger/20 px-3 py-2 text-xs text-danger leading-relaxed"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>

              {/* Submit Button with elevated glow shadow */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full inline-flex items-center justify-center rounded-control bg-primary hover:bg-primary-dark active:scale-[0.99] text-white px-4 py-2.5 text-xs font-semibold shadow-[0_4px_14px_rgba(17,117,187,0.30)] hover:shadow-[0_6px_20px_rgba(17,117,187,0.40)] transition-all disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px] sm:min-h-[42px] cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Memproses Masuk...
                    </>
                  ) : (
                    <>
                      <span>Masuk ke Sistem</span>
                      <ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.5} />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Enterprise Portal Identity Indicator */}
            <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-center gap-2 text-[11px] text-text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
              <span>Portal Resmi PT Pelindo Terminal Petikemas</span>
            </div>
          </div>
        </div>

        {/* Small Footer */}
        <footer className="text-center text-xs text-text-muted py-2 mt-4">
          General Affairs &bull; PT Pelindo Terminal Petikemas &copy; 2025
        </footer>
      </section>
    </main>
  );
}
