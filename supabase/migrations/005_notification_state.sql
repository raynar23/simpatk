-- SIMPATK Migration 005: Persistent notification state table per user account
-- Jalankan skrip ini di SQL Editor Supabase untuk sinkronisasi permanen status baca notifikasi.

create table if not exists public.user_notification_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bell_read_at timestamptz not null default now(),
  ack_pending integer not null default 0,
  ack_low_stock integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.user_notification_state enable row level security;

-- Clean existing policies for idempotency
drop policy if exists "user_notification_state_select" on public.user_notification_state;
drop policy if exists "user_notification_state_upsert" on public.user_notification_state;

-- Policy: Authenticated users can read their own notification state
create policy "user_notification_state_select"
  on public.user_notification_state for select
  to authenticated
  using (user_id = auth.uid());

-- Policy: Authenticated users can insert/update their own notification state
create policy "user_notification_state_upsert"
  on public.user_notification_state for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Grant access
grant select, insert, update on public.user_notification_state to authenticated;
