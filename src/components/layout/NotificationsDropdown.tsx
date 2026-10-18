// Realtime notifications dropdown derived from requests without extra tables
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCircle2, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface NotificationsDropdownProps {
  role: 'admin' | 'user';
  userId?: string;
}

interface NotificationItem {
  id: string;
  nomor: string;
  item_nama: string;
  status: string;
  created_at: string;
  completed_at?: string | null;
  nama_divisi?: string;
  timeAgo: string;
}

function calculateRelativeTime(timestamp: string, baseNow: number): string {
  try {
    const diffMinutes = Math.floor((baseNow - new Date(timestamp).getTime()) / 60000);
    if (diffMinutes < 1) return 'Baru saja';
    if (diffMinutes < 60) return `${diffMinutes}m lalu`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}j lalu`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}h lalu`;
  } catch {
    return '';
  }
}

export function NotificationsDropdown({ role, userId }: NotificationsDropdownProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch initial latest 5 requests
  useEffect(() => {
    const fetchLatest = async () => {
      let query = supabase
        .from('requests')
        .select('id, nomor, status, created_at, completed_at, items(nama), profiles(nama_divisi)')
        .order('created_at', { ascending: false })
        .limit(5);

      if (role === 'user' && userId) {
        query = query.eq('user_id', userId);
      }

      const { data } = await query;
      if (data) {
        const now = Date.now();
        setNotifications(
          data.map((r) => ({
            id: r.id,
            nomor: r.nomor || 'REQ',
            item_nama: (r.items as unknown as { nama: string })?.nama || 'ATK Item',
            status: r.status,
            created_at: r.created_at,
            completed_at: r.completed_at,
            nama_divisi: (r.profiles as unknown as { nama_divisi: string })?.nama_divisi,
            timeAgo: calculateRelativeTime(r.created_at, now),
          }))
        );
      }
    };

    fetchLatest();
  }, [role, userId, supabase]);

  // Realtime subscription for incoming request updates
  useEffect(() => {
    const channel = supabase
      .channel('realtime_requests_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            if (role === 'admin') {
              setUnreadCount((prev) => prev + 1);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as { user_id: string; status: string };
            if (role === 'user' && updated.user_id === userId && updated.status === 'selesai') {
              setUnreadCount((prev) => prev + 1);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, userId, supabase]);

  const handleOpenDropdown = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      setUnreadCount(0);
      const now = Date.now();
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          timeAgo: calculateRelativeTime(item.created_at, now),
        }))
      );
    }
  };

  const handleItemClick = (item: NotificationItem) => {
    setIsOpen(false);
    if (role === 'admin') {
      router.push(`/admin/permintaan?q=${encodeURIComponent(item.nomor)}`);
    } else {
      router.push(`/user/riwayat?q=${encodeURIComponent(item.nomor)}`);
    }
  };

  return (
    <div ref={dropdownRef} className="relative inline-block text-left select-none">
      <button
        type="button"
        onClick={handleOpenDropdown}
        aria-label="Lihat notifikasi"
        aria-expanded={isOpen}
        className="relative w-8 h-8 rounded-control flex items-center justify-center text-text-muted hover:text-text-main hover:bg-bg transition-colors cursor-pointer"
      >
        <Bell className="w-4 h-4" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-80 bg-surface rounded-card border border-border shadow-modal z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border bg-bg/40">
            <span className="text-xs font-semibold text-text-main">
              Aktivitas Terbaru
            </span>
            <span className="text-[10px] text-text-muted font-medium">
              5 permintaan terakhir
            </span>
          </div>

          {/* Notifications List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-border/60">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">
                Tidak ada notifikasi terbaru
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className="w-full p-3 text-left hover:bg-bg/60 transition-colors flex items-start gap-2.5 cursor-pointer"
                >
                  <div className="mt-0.5 shrink-0">
                    {item.status === 'selesai' ? (
                      <CheckCircle2 className="w-4 h-4 text-success" strokeWidth={1.5} />
                    ) : (
                      <Clock className="w-4 h-4 text-warning" strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-semibold text-text-main truncate font-mono">
                        {item.nomor}
                      </span>
                      <span className="text-[10px] text-text-muted shrink-0 tabular-nums">
                        {item.timeAgo}
                      </span>
                    </div>
                    <p className="text-xs text-text-main truncate mt-0.5">
                      {item.item_nama}
                    </p>
                    {item.nama_divisi && role === 'admin' && (
                      <p className="text-[10px] text-text-muted truncate">
                        {item.nama_divisi}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-border bg-bg/30 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push(role === 'admin' ? '/admin/permintaan' : '/user/riwayat');
              }}
              className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
            >
              Lihat Semua Permintaan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
