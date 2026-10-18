-- SIMPATK: Schema migration for User Management (Pengelolaan Pengguna)
-- Adds email and created_at columns to profiles table, and creates administrative RPCs

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();

-- Backfill email from auth.users if available
do $$
begin
  update public.profiles p
  set email = u.email
  from auth.users u
  where p.id = u.id and p.email is null;
exception
  when others then
    -- Silently continue if auth schema is restricted
    null;
end $$;

-- 1. RPC to get comprehensive user list for Admin GA
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

-- 2. RPC to update user division or role
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
  set nama_divisi = p_nama_divisi,
      role = p_role
  where id = p_user_id;
end;
$$;

grant execute on function public.admin_update_user(uuid, text, public.app_role) to authenticated;
