-- ==============================================================================
-- SIMPATK (Sistem Informasi Manajemen Permintaan & Pengelolaan ATK)
-- DATABASE MASTER SETUP - ALL-IN-ONE (1-CLICK SETUP)
-- ==============================================================================
-- File ini berisi seluruh skema database, tabel, relasi, fungsi RPC, RLS, 
-- dan data katalog ATK awal.
-- Cukup COPY & PASTE seluruh isi file ini ke menu:
-- Supabase Dashboard -> SQL Editor -> Klik "New query" -> Paste -> Klik "RUN".
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENUM TIPE DATA
-- ------------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'user');
  end if;

  if not exists (select 1 from pg_type where typname = 'request_status') then
    create type public.request_status as enum ('diproses', 'selesai');
  end if;
end $$;

-- ------------------------------------------------------------------------------
-- 2. TABEL PROFILES (PENGGUNA & DIVISI)
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  nama_divisi text not null,
  email text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------------------
-- 3. TABEL ITEMS (MASTER KATALOG ATK & STOK)
-- ------------------------------------------------------------------------------
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  nama text not null unique,
  kategori text not null default 'Lainnya',
  satuan text not null default 'pcs',
  stok integer not null default 0 check (stok >= 0),
  stok_minimum integer not null default 0 check (stok_minimum >= 0),
  harga_satuan integer check (harga_satuan is null or harga_satuan >= 0),
  rak text not null default 'Rak 1' check (rak in ('Rak 1', 'Rak 2', 'Rak 3', 'Rak 4')),
  created_at timestamptz not null default now()
);

-- Constraint kategori check
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'items_kategori_check') then
    alter table public.items add constraint items_kategori_check
      check (kategori in (
        'Kertas',
        'Alat Tulis',
        'Perekat dan Pemotong',
        'Arsip dan Map',
        'Perlengkapan Meja',
        'Tinta dan Toner',
        'Lainnya'
      ));
  end if;
end $$;

-- ------------------------------------------------------------------------------
-- 4. SEQUENCE & FUNGSI NOMOR PERMINTAAN ATK (REQ-YYYY-XXXXX)
-- ------------------------------------------------------------------------------
create sequence if not exists public.request_number_seq start with 1 increment by 1;

create or replace function public.generate_request_number()
returns text
language sql
as $$
  select 'REQ-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.request_number_seq'::regclass)::text, 5, '0');
$$;

-- ------------------------------------------------------------------------------
-- 5. TABEL REQUESTS (PERMINTAAN ATK)
-- ------------------------------------------------------------------------------
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  nomor text not null unique default public.generate_request_number(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  nama_barang text,
  satuan text,
  jumlah integer not null check (jumlah > 0),
  keperluan text not null,
  status public.request_status not null default 'diproses',
  catatan_ga text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ------------------------------------------------------------------------------
-- 6. TABEL USER_NOTIFICATION_STATE (STATUS NOTIFIKASI PER AKUN)
-- ------------------------------------------------------------------------------
create table if not exists public.user_notification_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bell_read_at timestamptz not null default now(),
  ack_requests_at timestamptz not null default now(),
  ack_low_stock_ids uuid[] not null default '{}'::uuid[],
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------------------
-- 7. INDEX UNTUK PERFORMA
-- ------------------------------------------------------------------------------
create index if not exists idx_requests_status_created_at on public.requests(status, created_at desc);
create index if not exists idx_requests_user_id on public.requests(user_id);
create index if not exists idx_requests_item_id on public.requests(item_id);
create index if not exists idx_requests_nama_barang on public.requests(nama_barang);
create index if not exists idx_items_kode on public.items(kode);
create index if not exists idx_items_kategori on public.items(kategori);
create index if not exists idx_items_rak on public.items(rak);

-- ------------------------------------------------------------------------------
-- 8. FUNGSI LOGIKA & RPC (REMOTE PROCEDURE CALLS)
-- ------------------------------------------------------------------------------

-- 8.1 Cek apakah user saat ini adalah admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- 8.2 Tambah stok barang (Khusus Admin GA)
create or replace function public.tambah_stok(
  p_item_id uuid,
  p_jumlah integer
)
returns public.items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.items;
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak: Hanya Admin GA yang berhak menambah stok barang.';
  end if;

  if p_jumlah is null or p_jumlah <= 0 then
    raise exception 'Jumlah penambahan stok harus lebih besar dari 0.';
  end if;

  update public.items
  set stok = stok + p_jumlah
  where id = p_item_id
  returning * into v_item;

  if not found then
    raise exception 'Barang dengan ID % tidak ditemukan.', p_item_id;
  end if;

  return v_item;
end;
$$;

grant execute on function public.tambah_stok(uuid, integer) to authenticated;

-- 8.3 Kurangi stok barang (Khusus Admin GA)
create or replace function public.kurangi_stok(
  p_item_id uuid,
  p_jumlah integer
)
returns public.items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_stok integer;
  v_item public.items;
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak: Hanya Admin GA yang berhak mengurangi stok barang.';
  end if;

  if p_jumlah is null or p_jumlah <= 0 then
    raise exception 'Jumlah pengurangan stok harus lebih besar dari 0.';
  end if;

  select stok into v_current_stok
  from public.items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Barang dengan ID % tidak ditemukan.', p_item_id;
  end if;

  if v_current_stok - p_jumlah < 0 then
    raise exception 'Pengurangan ditolak: Stok tidak mencukupi (stok saat ini: %, pengurangan diminta: %).', v_current_stok, p_jumlah;
  end if;

  update public.items
  set stok = stok - p_jumlah
  where id = p_item_id
  returning * into v_item;

  return v_item;
end;
$$;

grant execute on function public.kurangi_stok(uuid, integer) to authenticated;

-- 8.4 Tandai Permintaan Selesai & Serah Terima (Khusus Admin GA)
create or replace function public.tandai_selesai(
  p_request_id uuid,
  p_catatan text default null
)
returns public.requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.requests;
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak: Hanya Admin GA yang berhak menandai permintaan selesai.';
  end if;

  update public.requests
  set status = 'selesai',
      completed_at = coalesce(completed_at, now()),
      catatan_ga = coalesce(p_catatan, catatan_ga)
  where id = p_request_id
  returning * into v_request;

  if not found then
    raise exception 'Permintaan dengan ID % tidak ditemukan.', p_request_id;
  end if;

  return v_request;
end;
$$;

grant execute on function public.tandai_selesai(uuid, text) to authenticated;

-- 8.5 Pengelolaan Akun Pengguna oleh Admin
create or replace function public.get_users_list()
returns table (
  id uuid,
  email text,
  role public.app_role,
  nama_divisi text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak: Hanya Admin GA yang berhak mengelola akun pengguna.';
  end if;

  return query
  select
    p.id,
    coalesce(p.email, u.email::text, 'user@tps.co.id') as email,
    p.role,
    p.nama_divisi,
    coalesce(p.created_at, u.created_at, now()) as created_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  order by p.created_at desc;
end;
$$;

grant execute on function public.get_users_list() to authenticated;

create or replace function public.admin_update_user(
  p_user_id uuid,
  p_nama_divisi text,
  p_role public.app_role default 'user'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak: Hanya Admin GA yang berhak memperbarui data pengguna.';
  end if;

  update public.profiles
  set nama_divisi = coalesce(p_nama_divisi, nama_divisi),
      role = coalesce(p_role, role)
  where id = p_user_id;

  if not found then
    raise exception 'Pengguna dengan ID % tidak ditemukan.', p_user_id;
  end if;
end;
$$;

grant execute on function public.admin_update_user(uuid, text, public.app_role) to authenticated;

-- 8.6 Status Notifikasi Lonceng & Sidebar (ack_notification)
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

grant execute on function public.ack_notification(text) to authenticated;

-- 8.7 Trigger Otomatis: Reset notifikasi barang pulih
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

-- ------------------------------------------------------------------------------
-- 9. KEAMANAN & ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.requests enable row level security;
alter table public.user_notification_state enable row level security;

-- Profiles Policies
drop policy if exists "profiles_select_policy" on public.profiles;
create policy "profiles_select_policy"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_admin_manage" on public.profiles;
create policy "profiles_admin_manage"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Items Policies
drop policy if exists "items_select_policy" on public.items;
create policy "items_select_policy"
  on public.items for select
  to authenticated
  using (true);

drop policy if exists "items_admin_insert" on public.items;
create policy "items_admin_insert"
  on public.items for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "items_admin_update" on public.items;
create policy "items_admin_update"
  on public.items for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Requests Policies
drop policy if exists "requests_select_policy" on public.requests;
create policy "requests_select_policy"
  on public.requests for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "requests_user_insert" on public.requests;
create policy "requests_user_insert"
  on public.requests for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'diproses'
    and completed_at is null
  );

-- Notification State Policies
drop policy if exists "user_notification_state_select" on public.user_notification_state;
create policy "user_notification_state_select"
  on public.user_notification_state for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "user_notification_state_all" on public.user_notification_state;
create policy "user_notification_state_all"
  on public.user_notification_state for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on public.user_notification_state to authenticated;

-- ------------------------------------------------------------------------------
-- 10. ENABLE REALTIME
-- ------------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'requests'
  ) then
    alter publication supabase_realtime add table public.requests;
  end if;
end $$;

-- ------------------------------------------------------------------------------
-- 11. DATA AWAL (SEED KATALOG 24 BARANG ATK LENGKAP & RAK)
-- ------------------------------------------------------------------------------
insert into public.items (kode, nama, kategori, satuan, stok, stok_minimum, harga_satuan, rak, created_at)
values
  -- Kertas (Rak 1)
  ('ATK-001', 'Kertas HVS A4 80gr PaperOne', 'Kertas', 'rim', 6, 15, 54000, 'Rak 1', now() - interval '3 days'),
  ('ATK-002', 'Kertas HVS F4 75gr SiDU', 'Kertas', 'rim', 18, 10, 52000, 'Rak 1', now() - interval '5 days'),
  ('ATK-003', 'Kertas Continuous Form 9.5x11 2 Ply', 'Kertas', 'box', 5, 3, 185000, 'Rak 1', now() - interval '12 days'),

  -- Alat Tulis (Rak 2)
  ('ATK-004', 'Pulpen Standard AE7 Hitam 0.5mm', 'Alat Tulis', 'lusin', 3, 8, 26000, 'Rak 2', now() - interval '2 days'),
  ('ATK-005', 'Pulpen Pilot G2 0.7mm Biru', 'Alat Tulis', 'lusin', 12, 6, 165000, 'Rak 2', now() - interval '20 days'),
  ('ATK-006', 'Pensil 2B Faber-Castell', 'Alat Tulis', 'lusin', 14, 5, 48000, 'Rak 2', now() - interval '40 days'),
  ('ATK-007', 'Spidol Boardmarker Snowman Hitam', 'Alat Tulis', 'buah', 4, 10, 9500, 'Rak 2', now() - interval '1 day'),
  ('ATK-008', 'Spidol Permanen Jumbo Hitam', 'Alat Tulis', 'buah', 15, 6, 12000, 'Rak 2', now() - interval '65 days'),
  ('ATK-009', 'Stabilo Boss Original Kuning', 'Alat Tulis', 'buah', 9, 5, 11500, 'Rak 2', now() - interval '85 days'),

  -- Perekat dan Pemotong (Rak 3)
  ('ATK-010', 'Lakban Bening 2 Inch x 100 Yard', 'Perekat dan Pemotong', 'rol', 0, 6, 14000, 'Rak 3', now() - interval '4 days'),
  ('ATK-011', 'Lakban Cokelat Packing 2 Inch', 'Perekat dan Pemotong', 'rol', 12, 5, 14500, 'Rak 3', now() - interval '95 days'),
  ('ATK-012', 'Gunting Kertas Besar Stainless 8 Inch', 'Perekat dan Pemotong', 'buah', 0, 3, 22000, 'Rak 3', now() - interval '15 days'),
  ('ATK-013', 'Cutter Besar L-500 Joyko', 'Perekat dan Pemotong', 'buah', 8, 4, 16000, 'Rak 3', now() - interval '110 days'),
  ('ATK-014', 'Double Tape Foam 1 Inch 3M', 'Perekat dan Pemotong', 'rol', 7, 4, 21000, 'Rak 3', now() - interval '130 days'),

  -- Arsip dan Map (Rak 4)
  ('ATK-015', 'Map Ordner Bantex Folio 7cm Biru', 'Arsip dan Map', 'buah', 20, 8, 38000, 'Rak 4', now() - interval '6 days'),
  ('ATK-016', 'Map Snelhecter Plastik Folio Merah', 'Arsip dan Map', 'lusin', 5, 8, 36000, 'Rak 4', now() - interval '25 days'),
  ('ATK-017', 'Map Gantung Pendaflex Folio', 'Arsip dan Map', 'pak', 8, 4, 65000, 'Rak 4', now() - interval '140 days'),

  -- Perlengkapan Meja (Rak 4)
  ('ATK-018', 'Stapler HD-10 MAX Tokyo', 'Perlengkapan Meja', 'buah', 11, 5, 24000, 'Rak 4', now() - interval '150 days'),
  ('ATK-019', 'Isi Staples No. 10 MAX', 'Perlengkapan Meja', 'kotak', 7, 12, 4500, 'Rak 4', now() - interval '18 days'),
  ('ATK-020', 'Paper Clip No. 3 Joyko', 'Perlengkapan Meja', 'kotak', 18, 8, 3500, 'Rak 4', now() - interval '160 days'),
  ('ATK-021', 'Binder Clip No. 155 Joyko', 'Perlengkapan Meja', 'kotak', 14, 8, 11000, 'Rak 4', now() - interval '170 days'),

  -- Tinta dan Toner (Rak 1)
  ('ATK-022', 'Tinta Printer Epson 003 Black', 'Tinta dan Toner', 'botol', 6, 5, 88000, 'Rak 1', now() - interval '22 days'),
  ('ATK-023', 'Toner HP LaserJet 85A (CE285A)', 'Tinta dan Toner', 'buah', 3, 2, 340000, 'Rak 1', now() - interval '175 days'),

  -- Lainnya (Rak 4)
  ('ATK-024', 'Baterai Alkaline AA 4s', 'Lainnya', 'pak', 16, 6, 32000, 'Rak 4', now() - interval '180 days')
on conflict (kode) do update
set nama = excluded.nama,
    kategori = excluded.kategori,
    satuan = excluded.satuan,
    stok = excluded.stok,
    stok_minimum = excluded.stok_minimum,
    harga_satuan = excluded.harga_satuan,
    rak = excluded.rak;

-- ==============================================================================
-- SELESAI: Database SIMPATK siap 100% digunakan!
-- ==============================================================================
