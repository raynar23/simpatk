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
  PenLine,
  Pencil,
  Paperclip,
  Scissors,
  Folder,
  Ruler,
  Package,
  StickyNote,
  FileText,
  Highlighter,
  BookOpen,
  Check,
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
          setErrorMessage('Gagal masuk. Periksa koneksi internet Anda dan coba lagi.');
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
      setErrorMessage('Terjadi kesalahan sistem. Silakan coba lagi.');
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-dvh w-full flex flex-col lg:flex-row bg-[#0B5288]">
      {/* Left column: Full-bleed TPS Photo Panel (50% equal width on desktop, seamless borderless transition) */}
      <section className="hidden lg:flex relative w-full lg:w-1/2 min-h-dvh select-none overflow-hidden flex-col justify-between p-12 shrink-0 z-20">
        {/* Terminal background image with object-position 62% 50% */}
        <Image
          src="/images/tps-terminal.jpg"
          alt="Terminal Petikemas Surabaya"
          fill
          priority
          quality={85}
          sizes="50vw"
          className="object-cover"
          style={{ objectPosition: '62% 50%' }}
        />

        {/* Multi-layer overlay for crisp contrast and vibrant Pelindo blue corporate depth */}
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-badge bg-primary text-white text-xs font-semibold tracking-wide uppercase shadow-xs">
            General Affairs
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white leading-tight drop-shadow-md">
            SIMPATK
          </h1>
          <p className="text-sm text-white/95 leading-relaxed drop-shadow-sm font-normal">
            Sistem Informasi Permintaan Alat Tulis Kantor, General Affairs Pelindo Terminal Petikemas.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-2.5 text-xs text-white/95">
            <div className="inline-flex items-center gap-1.5 bg-black/25 backdrop-blur-sm px-2.5 py-1 rounded-badge border border-white/15 shadow-xs">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
              </span>
              <span>Alur Otomatis</span>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-black/25 backdrop-blur-sm px-2.5 py-1 rounded-badge border border-white/15 shadow-xs">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
              </span>
              <span>Stok Fisik Realtime</span>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-black/25 backdrop-blur-sm px-2.5 py-1 rounded-badge border border-white/15 shadow-xs">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
              </span>
              <span>100% Tanpa Kertas</span>
            </div>
          </div>
        </div>
      </section>

      {/* Right column: Form Area on corporate blue canvas with decorative ATK icons and elevated card */}
      <section className="w-full lg:w-1/2 flex flex-col justify-between items-center px-6 xs:px-8 sm:px-10 lg:px-12 min-h-dvh bg-gradient-to-br from-[#0E63A1] via-[#1175BB] to-[#0B5288] pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-[calc(env(safe-area-inset-top,0px)+20px)] relative z-10 overflow-hidden">
        {/* Ambient subtle light glows for corporate depth */}
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-white/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-[#38BDF8]/20 blur-3xl pointer-events-none" />

        {/* Decorative ATK Icons Background Watermark on Corporate Blue */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0" aria-hidden="true">
          {/* Top Left Area */}
          <div className="absolute top-6 left-8 text-white/[0.12] -rotate-12">
            <PenLine className="w-20 h-20" strokeWidth={1.3} />
          </div>
          <div className="absolute top-40 left-6 text-white/[0.14] rotate-45">
            <Paperclip className="w-14 h-14" strokeWidth={1.3} />
          </div>
          <div className="absolute top-20 left-1/3 text-white/[0.10] rotate-12">
            <StickyNote className="w-16 h-16" strokeWidth={1.3} />
          </div>

          {/* Top Right Area */}
          <div className="absolute top-10 right-10 text-white/[0.12] rotate-12">
            <FileText className="w-20 h-20" strokeWidth={1.3} />
          </div>
          <div className="absolute top-44 right-8 text-white/[0.14] -rotate-45">
            <Scissors className="w-16 h-16" strokeWidth={1.3} />
          </div>

          {/* Middle Side Accents */}
          <div className="absolute top-1/2 -translate-y-16 left-6 text-white/[0.11] -rotate-15">
            <Ruler className="w-18 h-18" strokeWidth={1.3} />
          </div>
          <div className="absolute top-1/2 -translate-y-6 right-8 text-white/[0.12] rotate-20">
            <Folder className="w-16 h-16" strokeWidth={1.3} />
          </div>

          {/* Bottom Left Area */}
          <div className="absolute bottom-28 left-8 text-white/[0.12] rotate-45">
            <Pencil className="w-16 h-16" strokeWidth={1.3} />
          </div>
          <div className="absolute bottom-8 left-16 text-white/[0.11] -rotate-12">
            <BookOpen className="w-18 h-18" strokeWidth={1.3} />
          </div>

          {/* Bottom Right Area */}
          <div className="absolute bottom-32 right-8 text-white/[0.12] -rotate-12">
            <Highlighter className="w-16 h-16" strokeWidth={1.3} />
          </div>
          <div className="absolute bottom-8 right-12 text-white/[0.14] rotate-12">
            <Package className="w-20 h-20" strokeWidth={1.3} />
          </div>
        </div>

        {/* Center Form Container (Elevated White Card on Blue Canvas) */}
        <div className="w-full max-w-[360px] xs:max-w-[390px] sm:max-w-[420px] my-auto relative z-10 py-6 sm:py-8">
          <div className="relative bg-white rounded-2xl border border-white/90 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.32),0_10px_20px_-5px_rgba(11,90,148,0.25)] p-7 sm:p-9 transition-all overflow-hidden">
            {/* Top decorative gradient line */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary-dark via-[#38BDF8] to-primary-dark" />

            {/* Header with Color Pelindo Logo at Top-Right */}
            <div className="mb-6 sm:mb-7">
              <div className="flex items-center justify-end mb-4 sm:mb-6">
                <div className="relative h-10 w-44 sm:w-48">
                  <Image
                    src="/logo/pelindo-color.png"
                    alt="Logo Pelindo Terminal Petikemas"
                    fill
                    className="object-contain object-right"
                    priority
                  />
                </div>
              </div>
              <h2 className="text-2xl sm:text-[26px] font-bold text-text-main tracking-tight leading-tight">
                Masuk
              </h2>
              <p className="text-xs text-text-muted mt-2 leading-relaxed">
                Masukkan email dan kata sandi korporat untuk mengakses sistem SIMPATK.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-text-main mb-1.5"
                >
                  Email
                </label>
                <input
                  ref={emailInputRef}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@tps.co.id"
                  className="w-full rounded-control border border-border bg-bg px-3.5 py-2.5 text-base sm:text-xs text-text-main placeholder:text-text-muted/60 transition-colors hover:border-primary/40 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px] sm:min-h-[40px]"
                />
              </div>

              {/* Password Field with Show/Hide Button */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-text-main mb-1.5"
                >
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    className="w-full rounded-control border border-border bg-bg pl-3.5 pr-10 py-2.5 text-base sm:text-xs text-text-main placeholder:text-text-muted/60 transition-colors hover:border-primary/40 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px] sm:min-h-[40px]"
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

              {/* Error banner */}
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
                    className="rounded-control bg-danger-soft border border-danger/20 px-3 py-2 text-xs text-danger leading-relaxed"
                  >
                    {errorMessage}
                  </div>
                )}
              </div>

              {/* Submit Button (Primary token #1175BB with corporate glow shadow) */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full inline-flex items-center justify-center rounded-control bg-primary hover:bg-primary-dark active:scale-[0.99] text-white px-4 py-2.5 text-xs font-semibold shadow-[0_4px_14px_rgba(17,117,187,0.35)] hover:shadow-[0_6px_20px_rgba(17,117,187,0.45)] transition-all disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px] sm:min-h-[42px] cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <span>Masuk</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-white/85 py-2 mt-4 font-normal tracking-wide drop-shadow-sm relative z-10">
          General Affairs - PT Pelindo Terminal Petikemas (c) 2026
        </footer>
      </section>
    </main>
  );
}
