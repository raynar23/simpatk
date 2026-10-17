// Desktop navigation sidebar (232px width) for Admin GA workspace
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ClipboardList, Boxes, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface SidebarProps {
  divisionName?: string;
}

export function Sidebar({ divisionName = 'General Affairs' }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const navItems = [
    {
      label: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      isActive: pathname === '/admin',
    },
    {
      label: 'Permintaan',
      href: '/admin/permintaan',
      icon: ClipboardList,
      isActive: pathname.startsWith('/admin/permintaan'),
    },
    {
      label: 'Persediaan',
      href: '/admin/persediaan',
      icon: Boxes,
      isActive: pathname.startsWith('/admin/persediaan'),
    },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  return (
    <aside className="hidden lg:flex flex-col justify-between w-[232px] shrink-0 bg-primary-dark text-white border-r border-primary-dark select-none min-h-dvh fixed top-0 bottom-0 left-0 z-30">
      <div>
        {/* Brand header */}
        <div className="p-5 border-b border-white/10">
          <div className="relative h-9 w-40 mb-2">
            <Image
              src="/logo/tps-white.png"
              alt="Logo Pelindo Terminal Petikemas TPS"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          <div className="text-[11px] font-semibold tracking-wider text-white/70 uppercase">
            SIMPATK GA
          </div>
        </div>

        {/* Navigation menu */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-control transition-colors ${
                  item.isActive
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Account Profile and Logout */}
      <div className="p-4 border-t border-white/10">
        <div className="mb-3 px-1">
          <div className="text-xs font-medium text-white truncate">
            {divisionName}
          </div>
          <div className="text-[11px] text-white/60 truncate">
            Admin General Affairs
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-control text-white/80 hover:text-white hover:bg-white/10 border border-white/15 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
