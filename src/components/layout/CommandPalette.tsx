// Global search and command palette (Ctrl+K / Cmd+K)
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  ClipboardList,
  Boxes,
  ShoppingCart,
  FileText,
  Clock,
  BookOpen,
  Settings,
  Users,
  ArrowRight,
  Package,
  FileSpreadsheet,
} from 'lucide-react';
import { useShell } from './ShellContext';
import { createClient } from '@/lib/supabase/client';

interface CommandPaletteProps {
  role: 'admin' | 'user';
}

interface SearchItem {
  id: string;
  kode: string;
  nama: string;
  kategori: string;
  satuan: string;
}

interface SearchRequest {
  id: string;
  nomor: string;
  status: string;
  item_nama?: string;
}

function CommandPaletteModal({
  role,
  onClose,
}: {
  role: 'admin' | 'user';
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SearchItem[]>([]);
  const [requests, setRequests] = useState<SearchRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search items and requests when query changes
  useEffect(() => {
    if (!query.trim()) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      const supabase = createClient();
      const q = `%${query.trim()}%`;

      try {
        const { data: itemData } = await supabase
          .from('items')
          .select('id, kode, nama, kategori, satuan')
          .or(`nama.ilike.${q},kode.ilike.${q}`)
          .limit(4);

        const { data: reqData } = await supabase
          .from('requests')
          .select('id, nomor, status, items(nama)')
          .or(`nomor.ilike.${q},keperluan.ilike.${q}`)
          .limit(4);

        if (!cancelled) {
          if (itemData) setItems(itemData);
          if (reqData) {
            setRequests(
              reqData.map((r) => ({
                id: r.id,
                nomor: r.nomor,
                status: r.status,
                item_nama: (r.items as unknown as { nama: string })?.nama,
              }))
            );
          }
        }
      } catch {
        // Silent catch for search errors
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const adminNav = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Permintaan', href: '/admin/permintaan', icon: ClipboardList },
    { label: 'Persediaan', href: '/admin/persediaan', icon: Boxes },
    { label: 'Daftar Belanja', href: '/admin/daftar-belanja', icon: ShoppingCart },
    { label: 'Laporan', href: '/admin/laporan', icon: FileText },
    { label: 'Pengguna', href: '/admin/pengguna', icon: Users },
    { label: 'Pengaturan', href: '/admin/pengaturan', icon: Settings },
  ];

  const userNav = [
    { label: 'Dashboard', href: '/user', icon: LayoutDashboard },
    { label: 'Riwayat Permintaan', href: '/user/riwayat', icon: Clock },
    { label: 'Katalog ATK', href: '/user/katalog', icon: BookOpen },
    { label: 'Pengaturan', href: '/user/pengaturan', icon: Settings },
  ];

  const navLinks = role === 'admin' ? adminNav : userNav;
  const filteredNav = navLinks.filter((n) =>
    n.label.toLowerCase().includes(query.toLowerCase())
  );

  const displayedItems = query.trim() ? items : [];
  const displayedRequests = query.trim() ? requests : [];

  const handleNavigate = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto select-none p-4 sm:p-6 md:p-20 flex justify-center items-start">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Palette Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pencarian Cepat Perintah"
        className="relative w-full max-w-xl bg-surface rounded-card border border-border shadow-modal overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-border bg-surface">
          <Search className="w-4 h-4 text-text-muted shrink-0 mr-3" strokeWidth={1.5} />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik perintah, halaman, nama barang, atau nomor permintaan..."
            className="w-full text-xs text-text-main placeholder:text-text-muted bg-transparent focus:outline-none"
          />
          <kbd className="hidden sm:inline-block text-[10px] font-mono text-text-muted bg-bg border border-border px-1.5 py-0.5 rounded-badge">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-3 text-xs">
          {/* Navigation Section */}
          {filteredNav.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                Navigasi
              </div>
              <div className="space-y-0.5 mt-1">
                {filteredNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => handleNavigate(item.href)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-control text-text-main hover:bg-bg transition-colors text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" strokeWidth={1.5} />
                        <span>{item.label}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Catalog Items Section */}
          {displayedItems.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                Daftar Barang ATK
              </div>
              <div className="space-y-0.5 mt-1">
                {displayedItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      handleNavigate(
                        role === 'admin'
                          ? `/admin/persediaan?q=${encodeURIComponent(item.kode)}`
                          : `/user/katalog?q=${encodeURIComponent(item.kode)}`
                      )
                    }
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-control text-text-main hover:bg-bg transition-colors text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Package className="w-4 h-4 text-text-muted shrink-0" strokeWidth={1.5} />
                      <div className="min-w-0 truncate">
                        <span className="font-semibold text-primary mr-1.5 font-mono text-[11px]">
                          {item.kode}
                        </span>
                        <span>{item.nama}</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-text-muted shrink-0 ml-2">
                      {item.kategori}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Requests Section */}
          {displayedRequests.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                Permintaan
              </div>
              <div className="space-y-0.5 mt-1">
                {displayedRequests.map((req) => (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() =>
                      handleNavigate(
                        role === 'admin'
                          ? `/admin/permintaan?q=${encodeURIComponent(req.nomor)}`
                          : `/user/riwayat?q=${encodeURIComponent(req.nomor)}`
                      )
                    }
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-control text-text-main hover:bg-bg transition-colors text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileSpreadsheet className="w-4 h-4 text-text-muted shrink-0" strokeWidth={1.5} />
                      <div className="min-w-0 truncate">
                        <span className="font-semibold text-text-main mr-1.5 font-mono text-[11px]">
                          {req.nomor}
                        </span>
                        {req.item_nama && (
                          <span className="text-text-muted">{req.item_nama}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-text-muted uppercase font-medium">
                      {req.status === 'selesai' ? 'Selesai' : 'Diproses'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty / Loading State */}
          {isLoading && (
            <div className="py-6 text-center text-text-muted text-xs">
              Mencari...
            </div>
          )}

          {!isLoading && query.trim() && filteredNav.length === 0 && displayedItems.length === 0 && displayedRequests.length === 0 && (
            <div className="py-8 text-center text-text-muted text-xs">
              Tidak ditemukan hasil untuk &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-3 py-2 border-t border-border bg-bg/50 text-[11px] text-text-muted flex items-center justify-between">
          <span>Navigasi dengan mouse atau tombol panah</span>
          <div className="flex items-center gap-2">
            <span>Buka: Enter</span>
            <span>Tutup: ESC</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CommandPalette({ role }: CommandPaletteProps) {
  const { isCommandPaletteOpen, closeCommandPalette } = useShell();

  if (!isCommandPaletteOpen) return null;

  return <CommandPaletteModal role={role} onClose={closeCommandPalette} />;
}
