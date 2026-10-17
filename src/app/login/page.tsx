'use client';

// Login page with split layout (terminal image panel and centered clean form)
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';

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
    <main className="min-h-dvh bg-white lg:p-3 flex items-center justify-center">
      <div className="w-full max-w-[1920px] mx-auto grid grid-cols-1 lg:grid-cols-2 lg:gap-3 min-h-dvh lg:min-h-[calc(100dvh-24px)]">
        {/* Left column: Photo Panel (lg and above) */}
        <section className="hidden lg:flex relative overflow-hidden rounded-sheet bg-primary-dark select-none h-full min-h-[calc(100dvh-24px)] flex-col justify-between p-10">
          {/* Terminal background image with object-position 62% 50% */}
          <Image
            src="/images/tps-terminal.jpg"
            alt="Terminal Petikemas Surabaya"
            fill
            priority
            quality={80}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
            style={{ objectPosition: '62% 50%' }}
          />

          {/* Solid primary-dark overlay (approx 38% for crisp natural photo colors) */}
          <div className="absolute inset-0 bg-[#0B5A94]/38 z-10" />

          {/* Top content: White TPS logo */}
          <div className="relative z-20">
            <div className="relative h-11 w-52">
              <Image
                src="/logo/tps-white.png"
                alt="Logo Pelindo Terminal Petikemas TPS"
                fill
                className="object-contain object-left drop-shadow-sm"
                priority
              />
            </div>
          </div>

          {/* Bottom content: App title and description */}
          <div className="relative z-20 text-white max-w-lg">
            <h1 className="text-[32px] font-semibold tracking-tight text-white leading-tight drop-shadow-sm">
              SIMPATK
            </h1>
            <p className="mt-2 text-sm text-white/95 leading-relaxed drop-shadow-sm">
              Sistem Informasi Manajemen Permintaan ATK, General Affairs Pelindo Terminal Petikemas.
            </p>
          </div>
        </section>

        {/* Right column: Form Area */}
        <section className="flex flex-col justify-between items-center w-full px-6 py-8 sm:px-10 lg:px-8 min-h-dvh lg:min-h-[calc(100dvh-24px)] pb-[calc(env(safe-area-inset-bottom,0px)+24px)]">
          <div className="w-full max-w-[380px] my-auto flex flex-col">
            {/* Mobile / Tablet logo: centered color logo (< lg) */}
            <div className="lg:hidden mb-8 flex justify-center">
              <div className="relative h-10 w-52">
                <Image
                  src="/logo/pelindo-color.png"
                  alt="Logo Pelindo Terminal Petikemas"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="mb-6">
              <h2 className="text-[28px] font-semibold text-text-main tracking-tight leading-tight">
                Masuk
              </h2>
              <p className="text-sm text-text-muted mt-1.5 leading-normal">
                Masuk menggunakan akun yang telah terdaftar.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-[13px] font-medium text-text-main mb-1.5"
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
                  placeholder="nama@tps.co.id"
                  className="w-full rounded-control border border-border bg-bg px-3.5 text-base sm:text-sm text-text-main placeholder:text-text-muted/60 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary min-h-[44px] lg:min-h-[40px] lg:h-10"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-[13px] font-medium text-text-main mb-1.5"
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
                    placeholder="••••••••"
                    className="w-full rounded-control border border-border bg-bg pl-3.5 pr-10 text-base sm:text-sm text-text-main placeholder:text-text-muted/60 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary min-h-[44px] lg:min-h-[40px] lg:h-10"
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

              {/* Error container: preserves layout stability */}
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

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full inline-flex items-center justify-center rounded-control bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px] lg:min-h-[40px] lg:h-10 transition-colors cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Memproses
                    </>
                  ) : (
                    'Masuk'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Centered Small Footer */}
          <footer className="text-center text-xs text-text-muted py-2 mt-auto">
            General Affairs - Pelindo Terminal Petikemas
          </footer>
        </section>
      </div>
    </main>
  );
}
