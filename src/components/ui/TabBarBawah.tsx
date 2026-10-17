// Mobile bottom tab bar for Admin GA workspace
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, Boxes } from 'lucide-react';

export function TabBarBawah() {
  const pathname = usePathname();

  const tabs = [
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

  return (
    <nav
      aria-label="Navigasi bawah mobile"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border flex items-center justify-around px-2 pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+6px)] shadow-modal select-none"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors ${
              tab.isActive
                ? 'text-primary font-semibold'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Icon className="w-5 h-5 mb-0.5" strokeWidth={tab.isActive ? 2 : 1.5} />
            <span className="text-[10px] leading-tight tracking-tight">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
