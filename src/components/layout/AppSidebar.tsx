
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
  ArrowUpDown,
  Layers,
  type LucideIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useShell } from './ShellContext';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  fetchServerNotificationState,
  persistNotificationState,
} from '@/lib/notificationState';

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
  userId?: string;
}

export function AppSidebar({ role, divisionName, userId }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { isCollapsed, toggleCollapse, isMobileOpen, closeMobile, openCommandPalette } = useShell();

  const [pendingRequestsCount, setPendingRequestsCount] = useState<number | null>(null);
  const [lowStockCount, setLowStockCount] = useState<number | null>(null);
  const [userUpdatesCount, setUserUpdatesCount] = useState<number | null>(null);
  const [dismissedHrefs, setDismissedHrefs] = useState<Set<string>>(new Set());

  // Keep references to latest raw database values
  const rawPendingRef = React.useRef(0);
  const rawLowRef = React.useRef(0);

  // Fetch badge counts dynamically for Admin & User
  useEffect(() => {
    let ignore = false;

    async function loadCounts() {
      try {
        if (role === 'admin') {
          const [reqRes, itemsRes, serverState] = await Promise.all([
            supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'diproses'),
            supabase.from('items').select('stok, stok_minimum'),
            fetchServerNotificationState(),
          ]);

          if (ignore) return;

          const rawPending = reqRes.count || 0;
          rawPendingRef.current = rawPending;

          const rawLow = itemsRes.data
            ? itemsRes.data.filter((it) => it.stok <= it.stok_minimum).length
            : 0;
          rawLowRef.current = rawLow;

          // Check if user is currently on /admin/permintaan
          if (pathname.startsWith('/admin/permintaan')) {
            try {
              localStorage.setItem('simpatk_sidebar_ack_pending_count', String(rawPending));
            } catch {}
            setPendingRequestsCount(0);
            if (userId) persistNotificationState(userId, { ack_pending: rawPending });
          } else {
            const serverAck = serverState?.ack_pending;
            const ackPendingStr = typeof window !== 'undefined' ? localStorage.getItem('simpatk_sidebar_ack_pending_count') : null;
            const ackVal = serverAck !== undefined ? serverAck : ackPendingStr !== null ? Number(ackPendingStr) : null;
            if (ackVal !== null) {
              setPendingRequestsCount(Math.max(0, rawPending - ackVal));
            } else {
              setPendingRequestsCount(rawPending);
            }
          }

          // Check if user is currently on /admin/persediaan
          if (pathname.startsWith('/admin/persediaan')) {
            try {
              localStorage.setItem('simpatk_sidebar_ack_low_stock_count', String(rawLow));
            } catch {}
            setLowStockCount(0);
            if (userId) persistNotificationState(userId, { ack_low_stock: rawLow });
          } else {
            const serverAckLow = serverState?.ack_low_stock;
            const ackLowStr = typeof window !== 'undefined' ? localStorage.getItem('simpatk_sidebar_ack_low_stock_count') : null;
            const ackLowVal = serverAckLow !== undefined ? serverAckLow : ackLowStr !== null ? Number(ackLowStr) : null;
            if (ackLowVal !== null) {
              setLowStockCount(Math.max(0, rawLow - ackLowVal));
            } else {
              setLowStockCount(rawLow);
            }
          }
        } else {
          // User portal (Pemohon)
          if (!userId) return;

          if (pathname.startsWith('/user/riwayat')) {
            try {
              localStorage.setItem(`simpatk_sidebar_ack_user_riwayat_${userId}`, Date.now().toString());
            } catch {}
            setUserUpdatesCount(0);
          } else {
            const lastVisitStr = typeof window !== 'undefined' ? localStorage.getItem(`simpatk_sidebar_ack_user_riwayat_${userId}`) : null;
            const { data: userReqs } = await supabase
              .from('requests')
              .select('status, created_at, completed_at')
              .eq('user_id', userId);

            if (ignore) return;

            if (userReqs) {
              if (lastVisitStr) {
                const lastVisitMs = Number(lastVisitStr);
                const newUpdates = userReqs.filter((r) => {
                  const completedMs = r.completed_at ? new Date(r.completed_at).getTime() : 0;
                  const createdMs = new Date(r.created_at).getTime();
                  return completedMs > lastVisitMs || (r.status === 'selesai' && createdMs > lastVisitMs);
                }).length;
                setUserUpdatesCount(newUpdates);
              } else {
                const completed = userReqs.filter((r) => r.status === 'selesai').length;
                setUserUpdatesCount(completed);
              }
            }
          }
        }
      } catch {
        // Silent fallback
      }
    }

    loadCounts();

    return () => {
      ignore = true;
    };
  }, [supabase, role, userId, pathname]);

  // Realtime updates for sidebar notification counts
  useEffect(() => {
    const channel = supabase
      .channel('sidebar_notifications_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            if (role === 'admin' && !pathname.startsWith('/admin/permintaan')) {
              setPendingRequestsCount((prev) => (prev || 0) + 1);
            } else if (role === 'user' && payload.new.user_id === userId && !pathname.startsWith('/user/riwayat')) {
              setUserUpdatesCount((prev) => (prev || 0) + 1);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as { user_id: string; status: string };
            if (role === 'user' && updated.user_id === userId && updated.status === 'selesai' && !pathname.startsWith('/user/riwayat')) {
              setUserUpdatesCount((prev) => (prev || 0) + 1);
            }
          }
        }
      )
      .subscribe();

    const handleBellRead = () => {
      setPendingRequestsCount(0);
      if (userId) {
        persistNotificationState(userId, { ack_pending: rawPendingRef.current });
      }
    };

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.ack_pending !== undefined) {
        setPendingRequestsCount(Math.max(0, rawPendingRef.current - customEvent.detail.ack_pending));
      }
      if (customEvent.detail?.ack_low_stock !== undefined) {
        setLowStockCount(Math.max(0, rawLowRef.current - customEvent.detail.ack_low_stock));
      }
    };

    window.addEventListener('simpatk_bell_read', handleBellRead);
    window.addEventListener('simpatk_notif_sync', handleSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('simpatk_bell_read', handleBellRead);
      window.removeEventListener('simpatk_notif_sync', handleSync);
    };
  }, [supabase, role, userId, pathname]);

  // Handle clicking navigation link: dismiss notification badge immediately
  const handleNavClick = React.useCallback((href: string) => {
    closeMobile();
    setDismissedHrefs((prev) => new Set(prev).add(href));

    try {
      if (href === '/admin/permintaan') {
        setPendingRequestsCount(0);
        localStorage.setItem('simpatk_sidebar_ack_pending_count', String(rawPendingRef.current));
        if (userId) persistNotificationState(userId, { ack_pending: rawPendingRef.current });
      } else if (href === '/admin/persediaan') {
        setLowStockCount(0);
        localStorage.setItem('simpatk_sidebar_ack_low_stock_count', String(rawLowRef.current));
        if (userId) persistNotificationState(userId, { ack_low_stock: rawLowRef.current });
      } else if (href === '/user/riwayat') {
        setUserUpdatesCount(0);
        const timestamp = String(new Date().getTime());
        localStorage.setItem(`simpatk_sidebar_ack_user_riwayat_${userId || 'user'}`, timestamp);
      }
    } catch {}
  }, [closeMobile, userId]);

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
      groupLabel: '4 FITUR UTAMA GA',
      items: [
        {
          label: 'Persediaan',
          href: '/admin/persediaan',
          icon: Boxes,
          count: lowStockCount,
          countDanger: true,
        },
        {
          label: 'Permintaan',
          href: '/admin/permintaan',
          icon: ClipboardList,
          count: pendingRequestsCount,
        },
        {
          label: 'Pembaruan Stok',
          href: '/admin/pembaruan-stok',
          icon: ArrowUpDown,
        },
        {
          label: 'Penempatan ATK',
          href: '/admin/penempatan',
          icon: Layers,
        },
      ],
    },
    {
      groupLabel: 'LAPORAN & ANALISIS',
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
        {
          label: 'Riwayat Permintaan',
          href: '/user/riwayat',
          icon: Clock,
          count: userUpdatesCount,
        },
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

            // Hide notification badge if link is active, user dismissed it, or count is 0/null
            const showCount =
              !active &&
              !dismissedHrefs.has(item.href) &&
              item.count !== undefined &&
              item.count !== null &&
              item.count > 0;

            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => handleNavClick(item.href)}
                className={`h-10 flex items-center gap-3 px-3 rounded-control text-sm font-medium transition-colors cursor-pointer ${
                  isCompact ? 'justify-center px-0' : ''
                } ${
                  active
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="relative shrink-0 flex items-center justify-center">
                  <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
                  {isCompact && showCount && (
                    <span
                      className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ring-2 ring-primary-dark ${
                        item.countDanger ? 'bg-red-400' : 'bg-white'
                      }`}
                    />
                  )}
                </div>
                {!isCompact && (
                  <>
                    <span className="truncate flex-1">{item.label}</span>
                    {showCount && (
                      <span
                        className={`text-xs tabular-nums font-semibold shrink-0 select-none px-2 py-0.5 rounded-full ${
                          item.countDanger
                            ? 'bg-red-500/30 text-red-200 border border-red-400/40'
                            : 'bg-white/20 text-white'
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
              const tooltipLabel = showCount ? `${item.label} (${item.count})` : item.label;
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
            className={`min-h-[72px] border-b border-white/10 flex items-center shrink-0 transition-all ${
              isCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-5 py-4'
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
                <div className="relative h-11 w-44 my-1">
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
          <div className="shrink-0 p-3.5 border-b border-white/10">
            {!isCollapsed ? (
              <button
                type="button"
                onClick={openCommandPalette}
                className="w-full flex items-center px-3 py-2 rounded-control bg-white/10 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white transition-colors cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-white/70" strokeWidth={1.5} />
                  <span>Cari atau pindah ke...</span>
                </div>
              </button>
            ) : (
              <div className="flex justify-center">
                <Tooltip content="Cari atau pindah ke..." side="right">
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
                    {role === 'admin' ? 'Pengelola ATK (Role GA)' : 'Divisi Pemohon (User)'}
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
            <div className="min-h-[72px] px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="relative h-10 w-44 my-1">
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
            <div className="p-3.5 border-b border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => {
                  closeMobile();
                  openCommandPalette();
                }}
                className="w-full flex items-center px-3 py-2 rounded-control bg-white/10 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white transition-colors cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-white/70" strokeWidth={1.5} />
                  <span>Cari atau pindah ke...</span>
                </div>
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
                  {role === 'admin' ? 'Pengelola ATK (Role GA)' : 'Divisi Pemohon (User)'}
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
