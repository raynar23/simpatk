
// Unified collapsible sidebar (desktop 264px/72px) and mobile drawer (280px) for Admin & User
'use client';

import React, { useState, useEffect } from 'react';
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
  Users,
  Search,
  Clock,
  BookOpen,
  LogOut,
  User,
  X,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useShell } from './ShellContext';
import { Tooltip } from '@/components/ui/Tooltip';

interface NavItemDef {
  label: string;
  href: string;
  icon: LucideIcon;
  count?: number | null;
  countDanger?: boolean;
}

interface NavGroupDef {
  groupLabel: string;
  items: NavItemDef[];
}

interface AppSidebarProps {
  role: 'admin' | 'user';
  divisionName?: string;
}

export function AppSidebar({ role, divisionName }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { isCollapsed, toggleCollapse, isMobileOpen, closeMobile, openCommandPalette } = useShell();

  const [pendingRequestsCount, setPendingRequestsCount] = useState<number | null>(null);
  const [lowStockCount, setLowStockCount] = useState<number | null>(null);

  // Fetch badge counts for Admin (pending requests & low stock items)
  useEffect(() => {
    if (role !== 'admin') return;
    let ignore = false;

    async function loadCounts() {
      try {
        const [reqRes, itemsRes] = await Promise.all([
          supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'diproses'),
          supabase.from('items').select('stok, stok_minimum'),
        ]);

        if (ignore) return;

        if (reqRes.count !== null) {
          setPendingRequestsCount(reqRes.count);
        }

        if (itemsRes.data) {
          // Unified low stock definition: stok <= stok_minimum (including 0)
          const low = itemsRes.data.filter((it) => it.stok <= it.stok_minimum).length;
          setLowStockCount(low);
        }
      } catch {
        // Silent fallback
      }
    }

    loadCounts();

    return () => {
      ignore = true;
    };
  }, [supabase, role, pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  const isLinkActive = (href: string) => {
    if (href === '/admin' || href === '/user') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const adminNavGroups: NavGroupDef[] = [
    {
      groupLabel: 'UTAMA',
      items: [
        { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      ],
    },
    {
      groupLabel: 'OPERASIONAL',
      items: [
        {
          label: 'Permintaan',
          href: '/admin/permintaan',
          icon: ClipboardList,
          count: pendingRequestsCount,
        },
        {
          label: 'Persediaan',
          href: '/admin/persediaan',
          icon: Boxes,
          count: lowStockCount,
          countDanger: true,
        },
        {
          label: 'Daftar Belanja',
          href: '/admin/daftar-belanja',
          icon: ShoppingCart,
        },
      ],
    },
    {
      groupLabel: 'ANALISIS',
      items: [
        { label: 'Laporan', href: '/admin/laporan', icon: FileText },
      ],
    },
    {
      groupLabel: 'AKUN',
      items: [
        { label: 'Pengguna', href: '/admin/pengguna', icon: Users },
        { label: 'Pengaturan', href: '/admin/pengaturan', icon: Settings },
      ],
    },
  ];

  const userNavGroups: NavGroupDef[] = [
    {
      groupLabel: 'UTAMA',
      items: [
        { label: 'Dashboard', href: '/user', icon: LayoutDashboard },
      ],
    },
    {
      groupLabel: 'OPERASIONAL',
      items: [
        { label: 'Riwayat Permintaan', href: '/user/riwayat', icon: Clock },
        { label: 'Katalog ATK', href: '/user/katalog', icon: BookOpen },
      ],
    },
    {
      groupLabel: 'AKUN',
      items: [
        { label: 'Pengaturan', href: '/user/pengaturan', icon: Settings },
      ],
    },
  ];

  const navGroups = role === 'admin' ? adminNavGroups : userNavGroups;

  const renderNavList = (isCompact: boolean) => (
    <nav className="p-3 space-y-5">
      {navGroups.map((group) => (
        <div key={group.groupLabel} className="space-y-1">
          {!isCompact ? (
            <p className="px-3 text-[10px] font-semibold text-white/45 tracking-wider uppercase mb-1.5 select-none">
              {group.groupLabel}
            </p>
          ) : (
            <div className="h-2" />
          )}

          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isLinkActive(item.href);

            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className={`h-10 flex items-center gap-3 px-3 rounded-control text-sm font-medium transition-colors cursor-pointer ${
                  isCompact ? 'justify-center px-0' : ''
                } ${
                  active
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
                {!isCompact && (
                  <>
                    <span className="truncate flex-1">{item.label}</span>
                    {item.count !== undefined && item.count !== null && item.count > 0 && (
                      <span
                        className={`text-xs tabular-nums font-semibold shrink-0 select-none ${
                          item.countDanger ? 'text-red-300' : 'text-white/80'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );

            if (isCompact) {
              const tooltipLabel = item.count ? `${item.label} (${item.count})` : item.label;
              return (
                <Tooltip key={item.href} content={tooltipLabel} side="right">
                  {linkContent}
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (264px expanded, 72px collapsed, 180ms ease-out) */}
      <aside
        className={`hidden lg:flex flex-col justify-between shrink-0 bg-primary-dark text-white border-r border-primary-dark/80 select-none h-dvh sticky top-0 transition-[width] duration-[180ms] ease-out z-30 ${
          isCollapsed ? 'w-[72px]' : 'w-[264px]'
        }`}
      >
        <div className="flex flex-col min-h-0 overflow-y-auto">
          {/* Header Brand + Inside Toggle Button */}
          <div
            className={`h-14 border-b border-white/10 flex items-center shrink-0 ${
              isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
            }`}
          >
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-1.5">
                <Tooltip content="Perluas sidebar (Ctrl/Cmd+B)" side="right">
                  <button
                    type="button"
                    onClick={toggleCollapse}
                    aria-label="Perluas sidebar"
                    className="w-9 h-9 rounded-control flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <ChevronsRight className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </Tooltip>
              </div>
            ) : (
              <>
                <div className="relative h-10 w-44">
                  <Image
                    src="/logo/tps-white.png"
                    alt="Logo Pelindo Terminal Petikemas TPS"
                    fill
                    className="object-contain object-left"
                    priority
                  />
                </div>
                <Tooltip content="Ciutkan sidebar (Ctrl/Cmd+B)" side="bottom">
                  <button
                    type="button"
                    onClick={toggleCollapse}
                    aria-label="Ciutkan sidebar"
                    className="w-8 h-8 rounded-control flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <ChevronsLeft className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </Tooltip>
              </>
            )}
          </div>

          {/* Search Trigger Button below Logo & above UTAMA */}
          <div className="shrink-0 p-2.5 border-b border-white/10">
            {!isCollapsed ? (
              <button
                type="button"
                onClick={openCommandPalette}
                className="w-full flex items-center justify-between px-3 py-2 rounded-control bg-white/10 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white transition-colors cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-white/70" strokeWidth={1.5} />
                  <span>Cari atau pindah ke...</span>
                </div>
                <kbd className="text-[10px] font-mono text-white/70 bg-white/10 px-1.5 py-0.5 rounded-badge border border-white/10">
                  ⌘K
                </kbd>
              </button>
            ) : (
              <div className="flex justify-center">
                <Tooltip content="Cari atau pindah ke... (⌘K)" side="right">
                  <button
                    type="button"
                    onClick={openCommandPalette}
                    aria-label="Cari atau pindah ke..."
                    className="w-9 h-9 rounded-control flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                  >
                    <Search className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </Tooltip>
              </div>
            )}
          </div>

          {/* Grouped Nav List */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {renderNavList(isCollapsed)}
          </div>
        </div>

        {/* Footer Account / Logout Profile Card */}
        <div className="p-3 border-t border-white/10 shrink-0">
          {!isCollapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 p-2 rounded-card bg-white/[0.07] border border-white/10 shadow-xs">
                <div className="w-8 h-8 rounded-full bg-white/20 border border-white/25 flex items-center justify-center text-white shrink-0 shadow-inner">
                  <User className="w-4 h-4 text-white" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate leading-tight">
                    {divisionName || (role === 'admin' ? 'General Affairs' : 'Divisi Pemohon')}
                  </p>
                  <p className="text-[10px] text-white/65 truncate uppercase tracking-wider font-mono mt-0.5 leading-tight">
                    {role === 'admin' ? 'Admin GA' : 'Divisi Pemohon'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-control text-white/80 hover:text-white hover:bg-white/10 border border-white/15 transition-colors cursor-pointer min-h-[32px]"
              >
                <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Keluar</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Tooltip content={divisionName || (role === 'admin' ? 'Admin GA' : 'Divisi Pemohon')} side="right">
                <div className="w-9 h-9 rounded-full bg-white/20 border border-white/25 flex items-center justify-center text-white shrink-0 cursor-default shadow-xs">
                  <User className="w-4 h-4 text-white" strokeWidth={1.8} />
                </div>
              </Tooltip>
              <Tooltip content="Keluar" side="right">
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Keluar"
                  className="w-9 h-9 flex items-center justify-center rounded-control text-white/80 hover:text-white hover:bg-white/10 border border-white/15 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Drawer (< lg, 280px width, dim overlay) */}
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
          <div className="flex flex-col min-h-0 overflow-y-auto">
            {/* Header with Close Button */}
            <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="relative h-9 w-40">
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

            {/* Quick Search in Mobile Drawer */}
            <div className="p-3 border-b border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => {
                  closeMobile();
                  openCommandPalette();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-control bg-white/10 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white transition-colors cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-white/70" strokeWidth={1.5} />
                  <span>Cari atau pindah ke...</span>
                </div>
                <kbd className="text-[10px] font-mono text-white/70 bg-white/10 px-1.5 py-0.5 rounded-badge border border-white/10">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Nav list */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {renderNavList(false)}
            </div>
          </div>

          {/* Footer Account Profile Card */}
          <div className="p-4 border-t border-white/10 shrink-0 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] space-y-2.5">
            <div className="flex items-center gap-3 p-2.5 rounded-card bg-white/[0.07] border border-white/10">
              <div className="w-9 h-9 rounded-full bg-white/20 border border-white/25 flex items-center justify-center text-white shrink-0 shadow-inner">
                <User className="w-4 h-4 text-white" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate leading-tight">
                  {divisionName || (role === 'admin' ? 'General Affairs' : 'Divisi Pemohon')}
                </p>
                <p className="text-[10px] text-white/65 truncate uppercase tracking-wider font-mono mt-0.5 leading-tight">
                  {role === 'admin' ? 'Admin GA' : 'Divisi Pemohon'}
                </p>
              </div>
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
