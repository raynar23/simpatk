-- SIMPATK: Database schema, RLS policies, and RPC functions.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'user');
  end if;

  if not exists (select 1 from pg_type where typname = 'request_status') then
    create type public.request_status as enum ('diproses', 'selesai');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null,
  nama_divisi text not null
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  satuan text not null default 'pcs',
  stok integer not null default 0 check (stok >= 0),
  stok_minimum integer not null default 0 check (stok_minimum >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  jumlah integer not null check (jumlah > 0),
  keperluan text not null,
  status public.request_status not null default 'diproses',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_requests_status_created_at on public.requests(status, created_at desc);
create index if not exists idx_requests_user_id on public.requests(user_id);
create index if not exists idx_requests_item_id on public.requests(item_id);

-- Check if current authenticated user has admin role
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

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.requests enable row level security;

-- Clean existing policies for idempotency
drop policy if exists "profiles_select_policy" on public.profiles;
drop policy if exists "profiles_admin_manage" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "Pengguna dapat membaca profil sendiri atau admin membaca semua" on public.profiles;
drop policy if exists "Admin dapat mengelola semua profil" on public.profiles;
drop policy if exists "Pengguna dapat membuat profil sendiri" on public.profiles;

drop policy if exists "items_select_policy" on public.items;
drop policy if exists "items_admin_insert" on public.items;
drop policy if exists "items_admin_update" on public.items;
drop policy if exists "Pengguna login dapat melihat items" on public.items;
drop policy if exists "Hanya admin dapat menambah items" on public.items;
drop policy if exists "Hanya admin dapat memperbarui items" on public.items;

drop policy if exists "requests_select_policy" on public.requests;
drop policy if exists "requests_user_insert" on public.requests;
drop policy if exists "Pengguna dapat melihat permintaan miliknya atau admin melihat semua" on public.requests;
drop policy if exists "User dapat membuat permintaan miliknya" on public.requests;
drop policy if exists "Admin dapat memperbarui status permintaan" on public.requests;

-- Users can read their own profile; admins can read all profiles to display division names
create policy "profiles_select_policy"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

-- Allow initial profile creation for authenticated user or admin
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid() or public.is_admin());

-- Allow admin full profile management
create policy "profiles_admin_manage"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Any authenticated user can view inventory items
create policy "items_select_policy"
  on public.items for select
  to authenticated
  using (true);

-- Only admins can directly insert inventory items
create policy "items_admin_insert"
  on public.items for insert
  to authenticated
  with check (public.is_admin());

-- Only admins can directly update inventory items
create policy "items_admin_update"
  on public.items for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Users see their own requests; admins see all requests
create policy "requests_select_policy"
  on public.requests for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Users can only insert new requests for themselves with status 'diproses' and null completed_at
create policy "requests_user_insert"
  on public.requests for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'diproses'
    and completed_at is null
  );

-- Note: No direct UPDATE/DELETE policies on requests. Status changes must go through tandai_selesai RPC.

-- Atomically increment item stock
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

-- Atomically decrement item stock with row locking to prevent negative stock
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

  -- Lock row to avoid concurrency race conditions
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

-- Mark request as finished without altering item stock
create or replace function public.tandai_selesai(
  p_request_id uuid
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
      completed_at = coalesce(completed_at, now())
  where id = p_request_id
  returning * into v_request;

  if not found then
    raise exception 'Permintaan dengan ID % tidak ditemukan.', p_request_id;
  end if;

  return v_request;
end;
$$;

grant execute on function public.tandai_selesai(uuid) to authenticated;

-- Enable Supabase Realtime for requests
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
