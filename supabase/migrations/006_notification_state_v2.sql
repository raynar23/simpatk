-- SIMPATK Migration 006: Notification State v2 (Per-Account Database Persistence)
-- Migration ini aman dijalankan berulang kali (idempotent: create/alter if not exists).
-- Jalankan skrip ini di SQL Editor dashboard Supabase.

-- 1. Pastikan tabel user_notification_state ada dengan struktur v2
create table if not exists public.user_notification_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bell_read_at timestamptz not null default now(),
  ack_requests_at timestamptz not null default now(),
  ack_low_stock_ids uuid[] not null default '{}'::uuid[],
  updated_at timestamptz not null default now()
);

-- 2. Alter column if not exists (jika tabel sebelumnya dibuat dari migrasi 005)
alter table public.user_notification_state
  add column if not exists bell_read_at timestamptz not null default now();

alter table public.user_notification_state
  add column if not exists ack_requests_at timestamptz not null default now();

alter table public.user_notification_state
  add column if not exists ack_low_stock_ids uuid[] not null default '{}'::uuid[];

alter table public.user_notification_state
  add column if not exists updated_at timestamptz not null default now();

-- Migrasikan data kolom lama jika ada
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_notification_state'
      and column_name = 'bell_read_at'
  ) then
    update public.user_notification_state
    set ack_requests_at = bell_read_at
    where ack_requests_at is null;
  end if;
end $$;

-- 3. Enable RLS
alter table public.user_notification_state enable row level security;

-- Bersihkan policy lama untuk idempotensi
drop policy if exists "user_notification_state_select" on public.user_notification_state;
drop policy if exists "user_notification_state_upsert" on public.user_notification_state;
drop policy if exists "user_notification_state_all" on public.user_notification_state;

-- Policy RLS: Hanya akun sendiri yang bisa membaca status notifikasinya
create policy "user_notification_state_select"
  on public.user_notification_state for select
  to authenticated
  using (user_id = auth.uid());

-- Policy RLS: Hanya akun sendiri yang bisa mengubah/menyimpan status miliknya
create policy "user_notification_state_all"
  on public.user_notification_state for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 4. RPC: ack_notification(p_kind text)
-- Menggunakan server timestamp now() dan auth.uid() (anti manipulasi client/browser time)
create or replace function public.ack_notification(p_kind text)
returns public.user_notification_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_res public.user_notification_state;
  v_current_low_stock_ids uuid[];
begin
  if v_uid is null then
    raise exception 'Unauthorized: authentication required';
  end if;

  -- Pastikan baris state user sudah ada (upsert default)
  insert into public.user_notification_state (
    user_id,
    bell_read_at,
    ack_requests_at,
    ack_low_stock_ids,
    updated_at
  )
  values (
    v_uid,
    now(),
    now(),
    '{}'::uuid[],
    now()
  )
  on conflict (user_id) do nothing;

  -- Eksekusi berdasarkan jenis notifikasi yang diakui (ack)
  if p_kind in ('bell', 'lonceng') then
    update public.user_notification_state
    set bell_read_at = now(),
        updated_at = now()
    where user_id = v_uid
    returning * into v_res;

  elsif p_kind in ('requests', 'permintaan') then
    update public.user_notification_state
    set ack_requests_at = now(),
        updated_at = now()
    where user_id = v_uid
    returning * into v_res;

  elsif p_kind in ('low_stock', 'persediaan') then
    -- Rekam ID seluruh barang yang sedang menipis/habis saat ini (stok <= stok_minimum)
    select coalesce(array_agg(id), '{}'::uuid[])
    into v_current_low_stock_ids
    from public.items
    where stok <= stok_minimum;

    update public.user_notification_state
    set ack_low_stock_ids = v_current_low_stock_ids,
        updated_at = now()
    where user_id = v_uid
    returning * into v_res;

  else
    raise exception 'Unknown notification kind: %. Gunakan "bell", "requests", atau "low_stock".', p_kind;
  end if;

  return v_res;
end;
$$;

-- 5. Trigger otomatis: Keluarkan barang dari ack_low_stock_ids jika stoknya sudah pulih (stok > stok_minimum)
-- Hal ini memastikan jika di masa depan stok barang tersebut menipis kembali, badge peringatan akan muncul kembali.
create or replace function public.prune_recovered_low_stock_ids()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stok > new.stok_minimum and (old.stok is null or old.stok <= old.stok_minimum) then
    update public.user_notification_state
    set ack_low_stock_ids = array_remove(ack_low_stock_ids, new.id),
        updated_at = now()
    where new.id = any(ack_low_stock_ids);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prune_recovered_low_stock_ids on public.items;
create trigger trg_prune_recovered_low_stock_ids
  after update of stok, stok_minimum on public.items
  for each row
  execute function public.prune_recovered_low_stock_ids();

-- 6. Hak Akses (Grants)
grant select, insert, update on public.user_notification_state to authenticated;
grant execute on function public.ack_notification(text) to authenticated;
