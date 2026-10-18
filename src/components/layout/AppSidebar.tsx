// Unified collapsible sidebar (desktop 232px/64px) and mobile drawer (280px) for Admin & User
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  Boxes,
  ShoppingCart,
  FileText,
  Settings,
  Clock,
  BookOpen,
  LogOut,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useShell } from './ShellContext';
import { Tooltip } from '@/components/ui/Tooltip';

interface AppSidebarProps {
  role: 'admin' | 'user';
  divisionName?: string;
}

export function AppSidebar({ role, divisionName }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { isCollapsed, isMobileOpen, closeMobile } = useShell();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  const adminNav = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Permintaan', href: '/admin/permintaan', icon: ClipboardList },
    { label: 'Persediaan', href: '/admin/persediaan', icon: Boxes },
    { label: 'Daftar Belanja', href: '/admin/daftar-belanja', icon: ShoppingCart },
    { label: 'Laporan', href: '/admin/laporan', icon: FileText },
    { label: 'Pengaturan', href: '/admin/pengaturan', icon: Settings },
  ];

  const userNav = [
    { label: 'Dashboard', href: '/user', icon: LayoutDashboard },
    { label: 'Riwayat Permintaan', href: '/user/riwayat', icon: Clock },
    { label: 'Katalog ATK', href: '/user/katalog', icon: BookOpen },
    { label: 'Pengaturan', href: '/user/pengaturan', icon: Settings },
  ];

  const navItems = role === 'admin' ? adminNav : userNav;

  const isLinkActive = (href: string) => {
    if (href === '/admin' || href === '/user') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const renderNavList = (isCompact: boolean) => (
    <nav className="p-2 space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isLinkActive(item.href);

        const linkContent = (
          <Link
            key={item.href}
            href={item.href}
            onClick={closeMobile}
            className={`flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-control transition-colors ${
              isCompact ? 'justify-center px-2' : ''
            } ${
              active
                ? 'bg-white/15 text-white font-semibold'
                : 'text-white/75 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            {!isCompact && <span className="truncate">{item.label}</span>}
          </Link>
        );

        if (isCompact) {
          return (
            <Tooltip key={item.href} content={item.label} side="right">
              {linkContent}
            </Tooltip>
          );
        }

        return linkContent;
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (232px expanded, 64px collapsed, transition 180ms) */}
      <aside
        className={`hidden lg:flex flex-col justify-between shrink-0 bg-primary-dark text-white border-r border-primary-dark/80 select-none h-dvh sticky top-0 transition-[width] duration-[180ms] ease-out z-30 ${
          isCollapsed ? 'w-[64px]' : 'w-[232px]'
        }`}
      >
        <div>
          {/* Header Brand */}
          <div
            className={`h-[52px] border-b border-white/10 flex items-center ${
              isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
            }`}
          >
            {isCollapsed ? (
              <div className="relative h-7 w-7">
                <Image
                  src="/logo/pelindo-symbol.png"
                  alt="Pelindo Symbol"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative h-7 w-36">
                  <Image
                    src="/logo/tps-white.png"
                    alt="Logo Pelindo Terminal Petikemas TPS"
                    fill
                    className="object-contain object-left"
                    priority
                  />
                </div>
              </div>
            )}
          </div>

          {/* Nav List */}
          {renderNavList(isCollapsed)}
        </div>

        {/* Footer Account / Logout */}
        <div className="p-3 border-t border-white/10">
          {!isCollapsed ? (
            <div className="space-y-2">
              <div className="px-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {divisionName || (role === 'admin' ? 'General Affairs' : 'Divisi Pemohon')}
                </p>
                <p className="text-[11px] text-white/60 truncate uppercase tracking-wider mt-0.5">
                  {role === 'admin' ? 'Portal Admin' : 'Portal Pemohon'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-control text-white/80 hover:text-white hover:bg-white/10 border border-white/15 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Keluar</span>
              </button>
            </div>
          ) : (
            <Tooltip content="Keluar" side="right">
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Keluar"
                className="w-full flex items-center justify-center p-2 rounded-control text-white/80 hover:text-white hover:bg-white/10 border border-white/15 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </Tooltip>
          )}
        </div>
      </aside>

      {/* Mobile Drawer (< lg, 280px width, dim overlay, Esc / tap close) */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-180 select-none ${
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          onClick={closeMobile}
          aria-hidden="true"
        />

        {/* Drawer panel */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
          className={`fixed inset-y-0 left-0 w-[280px] bg-primary-dark text-white flex flex-col justify-between shadow-modal transition-transform duration-180 ease-out z-50 ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div>
            {/* Header */}
            <div className="h-[52px] px-4 border-b border-white/10 flex items-center justify-between">
              <div className="relative h-7 w-36">
                <Image
                  src="/logo/tps-white.png"
                  alt="Logo Pelindo Terminal Petikemas TPS"
                  fill
                  className="object-contain object-left"
                  priority
                />
              </div>
              <button
                type="button"
                onClick={closeMobile}
                aria-label="Tutup navigasi"
                className="w-8 h-8 rounded-control flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Nav list */}
            {renderNavList(false)}
          </div>

          {/* Footer Account Profile */}
          <div className="p-4 border-t border-white/10 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
            <div className="mb-3 px-1">
              <p className="text-xs font-semibold text-white truncate">
                {divisionName || (role === 'admin' ? 'General Affairs' : 'Divisi Pemohon')}
              </p>
              <p className="text-[11px] text-white/60 truncate uppercase tracking-wider mt-0.5">
                {role === 'admin' ? 'Portal Admin' : 'Portal Pemohon'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-control text-white hover:bg-white/10 border border-white/15 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
