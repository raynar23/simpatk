// Realtime notifications dropdown derived from requests with dynamic count and mark-as-read persistence
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCircle2, Clock, Check } from 'lucide-react';
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
  isUnread: boolean;
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
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const storageKey = `simpatk_bell_last_read_${role}_${userId || 'admin'}`;

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

  // Fetch initial latest notifications and calculate unread count
  useEffect(() => {
    let ignore = false;

    async function loadNotifications() {
      try {
        const storedTimeStr = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
        const lastReadMs = storedTimeStr ? Number(storedTimeStr) : null;

        if (role === 'admin') {
          const [reqRes, pendingRes] = await Promise.all([
            supabase
              .from('requests')
              .select('id, nomor, status, created_at, completed_at, items(nama), profiles(nama_divisi)')
              .order('created_at', { ascending: false })
              .limit(10),
            supabase
              .from('requests')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'diproses'),
          ]);

          if (ignore) return;

          if (reqRes.data) {
            const now = Date.now();
            const items: NotificationItem[] = reqRes.data.map((r) => {
              const createdMs = new Date(r.created_at).getTime();
              const isUnread =
                lastReadMs !== null
                  ? createdMs > lastReadMs
                  : r.status === 'diproses';

              return {
                id: r.id,
                nomor: r.nomor || 'REQ',
                item_nama: (r.items as unknown as { nama: string })?.nama || 'Barang ATK',
                status: r.status,
                created_at: r.created_at,
                completed_at: r.completed_at,
                nama_divisi: (r.profiles as unknown as { nama_divisi: string })?.nama_divisi,
                timeAgo: calculateRelativeTime(r.created_at, now),
                isUnread,
              };
            });

            setNotifications(items);

            if (lastReadMs !== null) {
              const count = items.filter((it) => it.isUnread).length;
              setUnreadCount(count);
            } else {
              setUnreadCount(pendingRes.count || items.filter((it) => it.status === 'diproses').length);
            }
          }
        } else {
          // User (Pemohon)
          if (!userId) return;

          const { data } = await supabase
            .from('requests')
            .select('id, nomor, status, created_at, completed_at, items(nama), profiles(nama_divisi)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

          if (ignore) return;

          if (data) {
            const now = Date.now();
            const items: NotificationItem[] = data.map((r) => {
              const createdMs = new Date(r.created_at).getTime();
              const completedMs = r.completed_at ? new Date(r.completed_at).getTime() : 0;
              const isUnread =
                lastReadMs !== null
                  ? createdMs > lastReadMs || completedMs > lastReadMs
                  : r.status === 'selesai' && now - (completedMs || createdMs) < 7 * 86400000;

              return {
                id: r.id,
                nomor: r.nomor || 'REQ',
                item_nama: (r.items as unknown as { nama: string })?.nama || 'Barang ATK',
                status: r.status,
                created_at: r.created_at,
                completed_at: r.completed_at,
                nama_divisi: (r.profiles as unknown as { nama_divisi: string })?.nama_divisi,
                timeAgo: calculateRelativeTime(r.created_at, now),
                isUnread,
              };
            });

            setNotifications(items);
            const count = items.filter((it) => it.isUnread).length;
            setUnreadCount(count);
          }
        }
      } catch {
        // Fallback gracefully
      }
    }

    loadNotifications();

    return () => {
      ignore = true;
    };
  }, [role, userId, supabase, storageKey]);

  // Realtime subscription for incoming request updates
  useEffect(() => {
    const channel = supabase
      .channel('realtime_requests_notifications_bell')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            if (role === 'admin' || (role === 'user' && payload.new.user_id === userId)) {
              setUnreadCount((prev) => prev + 1);
              const { data } = await supabase
                .from('requests')
                .select('id, nomor, status, created_at, completed_at, items(nama), profiles(nama_divisi)')
                .eq('id', payload.new.id)
                .single();

              if (data) {
                const now = Date.now();
                const newItem: NotificationItem = {
                  id: data.id,
                  nomor: data.nomor || 'REQ',
                  item_nama: (data.items as unknown as { nama: string })?.nama || 'Barang ATK',
                  status: data.status,
                  created_at: data.created_at,
                  completed_at: data.completed_at,
                  nama_divisi: (data.profiles as unknown as { nama_divisi: string })?.nama_divisi,
                  timeAgo: calculateRelativeTime(data.created_at, now),
                  isUnread: true,
                };
                setNotifications((prev) => [newItem, ...prev.slice(0, 9)]);
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as { id: string; user_id: string; status: string; completed_at?: string };
            if (role === 'user' && updated.user_id === userId && updated.status === 'selesai') {
              setUnreadCount((prev) => prev + 1);
            }
            setNotifications((prev) =>
              prev.map((item) =>
                item.id === updated.id
                  ? {
                      ...item,
                      status: updated.status,
                      completed_at: updated.completed_at || item.completed_at,
                      isUnread: role === 'user' && updated.user_id === userId ? true : item.isUnread,
                    }
                  : item
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, userId, supabase]);

  // Mark all notifications as read: clears badge and persists timestamp
  const markAllAsRead = useCallback(() => {
    setUnreadCount(0);
    try {
      localStorage.setItem(storageKey, Date.now().toString());
      window.dispatchEvent(new CustomEvent('simpatk_bell_read'));
    } catch {
      // Ignore
    }
    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        isUnread: false,
      }))
    );
  }, [storageKey]);

  const handleOpenDropdown = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      // Clear notification count on click
      markAllAsRead();
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
    markAllAsRead();
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
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center tabular-nums shadow-xs animate-in zoom-in-75 duration-150">
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
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-[10px] text-text-muted hover:text-primary font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Check className="w-3 h-3" />
              <span>Tandai dibaca</span>
            </button>
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
                  className={`w-full p-3 text-left transition-colors flex items-start gap-2.5 cursor-pointer ${
                    item.isUnread ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-bg/60'
                  }`}
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
                      <div className="flex items-center gap-1.5 truncate">
                        {item.isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
                        )}
                        <span className="text-[11px] font-semibold text-text-main truncate font-mono">
                          {item.nomor}
                        </span>
                      </div>
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
                markAllAsRead();
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
