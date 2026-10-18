// 52px top toolbar with sidebar toggles, breadcrumb, quick search trigger, notifications, and user menu
'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Menu,
  PanelLeft,
  Search,
  Settings,
  LogOut,
  ChevronDown,
  User,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useShell } from './ShellContext';
import { NotificationsDropdown } from './NotificationsDropdown';
import { Tooltip } from '@/components/ui/Tooltip';

interface AppToolbarProps {
  role: 'admin' | 'user';
  title?: string;
  divisionName?: string;
  userId?: string;
}

export function AppToolbar({
  role,
  title = 'Dashboard',
  divisionName,
  userId,
}: AppToolbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const { toggleCollapse, toggleMobile, openCommandPalette } = useShell();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close account menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  return (
    <header className="h-[52px] shrink-0 sticky top-0 z-20 bg-surface/95 backdrop-blur-md border-b border-border flex items-center justify-between px-3 sm:px-4 select-none">
      {/* Left: Sidebar Toggle and Breadcrumb / Page Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Mobile Hamburger (< lg) */}
        <button
          type="button"
          onClick={toggleMobile}
          aria-label="Buka menu navigasi"
          className="lg:hidden w-8 h-8 rounded-control flex items-center justify-center text-text-muted hover:text-text-main hover:bg-bg transition-colors cursor-pointer"
        >
          <Menu className="w-4 h-4" strokeWidth={1.5} />
        </button>

        {/* Desktop Sidebar Collapse Toggle (lg+) */}
        <div className="hidden lg:block">
          <Tooltip content="Ciutkan/Perluas Sidebar (Cmd+B)" side="bottom">
            <button
              type="button"
              onClick={toggleCollapse}
              aria-label="Ciutkan atau perluas sidebar"
              className="w-8 h-8 rounded-control flex items-center justify-center text-text-muted hover:text-text-main hover:bg-bg transition-colors cursor-pointer"
            >
              <PanelLeft className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </Tooltip>
        </div>

        {/* Vertical divider */}
        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Page Title (20px semi-bold) */}
        <h1 className="text-sm sm:text-base font-semibold text-text-main tracking-tight truncate">
          {title}
        </h1>
      </div>

      {/* Center: Command Palette Trigger Button (Ctrl/Cmd+K) */}
      <div className="flex-1 max-w-xs mx-4 hidden md:block">
        <button
          type="button"
          onClick={openCommandPalette}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-control border border-border bg-bg text-text-muted hover:border-primary/40 hover:bg-surface transition-colors cursor-pointer text-xs"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Cari atau pindah ke...</span>
          </div>
          <kbd className="text-[10px] font-mono text-text-muted bg-surface border border-border px-1.5 py-0.5 rounded-badge">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Search Mobile Icon, Notifications, and Account Menu */}
      <div className="flex items-center gap-1.5">
        {/* Mobile Search Icon */}
        <button
          type="button"
          onClick={openCommandPalette}
          aria-label="Buka pencarian cepat"
          className="md:hidden w-8 h-8 rounded-control flex items-center justify-center text-text-muted hover:text-text-main hover:bg-bg transition-colors cursor-pointer"
        >
          <Search className="w-4 h-4" strokeWidth={1.5} />
        </button>

        {/* Notifications Dropdown */}
        <NotificationsDropdown role={role} userId={userId} />

        {/* User Account Menu Dropdown */}
        <div ref={accountMenuRef} className="relative inline-block text-left">
          <button
            type="button"
            onClick={() => setIsAccountMenuOpen((prev) => !prev)}
            aria-expanded={isAccountMenuOpen}
            className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-control hover:bg-bg transition-colors cursor-pointer border border-transparent hover:border-border text-xs"
          >
            <div className="w-6 h-6 rounded-full bg-primary-soft text-primary flex items-center justify-center text-[11px] font-semibold">
              <User className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
            <div className="text-left hidden xl:block min-w-0 max-w-[130px]">
              <p className="text-xs font-semibold text-text-main truncate leading-tight">
                {divisionName || (role === 'admin' ? 'General Affairs' : 'Divisi Pemohon')}
              </p>
              <p className="text-[10px] text-text-muted truncate capitalize">
                {role === 'admin' ? 'Admin GA' : 'Pemohon'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />
          </button>

          {isAccountMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-56 bg-surface rounded-card border border-border shadow-modal z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100 text-xs">
              {/* Account summary */}
              <div className="px-3 py-2 border-b border-border bg-bg/40">
                <p className="font-semibold text-text-main truncate">
                  {divisionName || (role === 'admin' ? 'General Affairs' : 'Divisi Pemohon')}
                </p>
                <p className="text-[11px] text-text-muted">
                  {role === 'admin' ? 'Akun Admin GA' : 'Akun Divisi Pemohon'}
                </p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <Link
                  href={role === 'admin' ? '/admin/pengaturan' : '/user/pengaturan'}
                  onClick={() => setIsAccountMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-1.5 text-text-main hover:bg-bg transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />
                  <span>Pengaturan</span>
                </Link>
              </div>

              <div className="border-t border-border pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-danger hover:bg-danger-soft transition-colors cursor-pointer text-left"
                >
                  <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Keluar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
