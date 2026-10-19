// Top header bar for User Divisi layout with brand logo and account action
'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface UserHeaderProps {
  divisionName?: string;
}

export function UserHeader({ divisionName = 'Divisi Operasional & Komersial' }: UserHeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-border">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative h-8 w-36 sm:w-44">
            <Image
              src="/logo/pelindo-color.png"
              alt="Logo PT Terminal Petikemas Surabaya"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          <span className="hidden sm:inline-block text-xs font-semibold text-text-muted border-l border-border pl-3">
            SIMPATK
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-text-main leading-tight truncate max-w-[200px]">
              {divisionName}
            </div>
            <div className="text-[11px] text-text-muted">Divisi Pemohon</div>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-medium text-text-muted hover:text-text-main hover:bg-bg border border-border transition-colors cursor-pointer min-h-[44px] sm:min-h-[32px]"
          >
            <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
}
