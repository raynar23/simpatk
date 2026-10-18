// Client helper for managing notification read state synchronized with database and long-lived session cookie

export interface UserNotificationState {
  bell_read_at: string;
  ack_pending?: number;
  ack_low_stock?: number;
}

const LOCAL_KEY = 'simpatk_notification_state_v1';

/**
 * Returns locally cached notification state immediately (optimistic UI),
 * then fetches the persistent state from database / server cookie.
 */
export function getLocalNotificationState(userId?: string): UserNotificationState | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = `${LOCAL_KEY}_${userId || 'default'}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Fetches the user notification state from the server/database.
 */
export async function fetchServerNotificationState(): Promise<UserNotificationState | null> {
  try {
    const res = await fetch('/api/notifications/state', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.state || null;
  } catch {
    return null;
  }
}

/**
 * Updates the user notification state in database, server cookie, and localStorage.
 */
export async function persistNotificationState(
  userId: string,
  updates: Partial<UserNotificationState>
): Promise<void> {
  if (typeof window === 'undefined') return;

  const current = getLocalNotificationState(userId) || {
    bell_read_at: new Date().toISOString(),
  };

  const next: UserNotificationState = {
    ...current,
    ...updates,
    bell_read_at: updates.bell_read_at || current.bell_read_at,
  };

  // 1. Save locally for instant reactivity
  try {
    const key = `${LOCAL_KEY}_${userId || 'default'}`;
    localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('simpatk_notif_sync', { detail: next }));
  } catch {
    // Ignore
  }

  // 2. Persist to API (Database + Long-lived Cookie)
  try {
    await fetch('/api/notifications/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
  } catch {
    // Graceful offline fallback
  }
}
