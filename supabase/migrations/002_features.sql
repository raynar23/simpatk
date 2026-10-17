-- SIMPATK: Schema migration for item codes, categories, pricing, request numbers, and GA notes.

-- Items table enhancements
alter table public.items add column if not exists kode text;

do $$
declare
  r record;
  v_idx integer := 1;
begin
  for r in select id from public.items where kode is null order by created_at, nama loop
    update public.items set kode = 'ATK-' || lpad(v_idx::text, 3, '0') where id = r.id;
    v_idx := v_idx + 1;
  end loop;
end $$;

alter table public.items alter column kode set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'items_kode_key') then
    alter table public.items add constraint items_kode_key unique (kode);
  end if;
end $$;

alter table public.items add column if not exists kategori text not null default 'Lainnya';

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

alter table public.items add column if not exists harga_satuan integer check (harga_satuan is null or harga_satuan >= 0);

-- Requests table sequence and number generator
create sequence if not exists public.request_number_seq start with 1 increment by 1;

create or replace function public.generate_request_number()
returns text
language sql
as $$
  select 'REQ-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.request_number_seq'::regclass)::text, 5, '0');
$$;

alter table public.requests add column if not exists nomor text default public.generate_request_number();

do $$
declare
  r record;
begin
  for r in select id from public.requests where nomor is null order by created_at loop
    update public.requests set nomor = public.generate_request_number() where id = r.id;
  end loop;
end $$;

alter table public.requests alter column nomor set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'requests_nomor_key') then
    alter table public.requests add constraint requests_nomor_key unique (nomor);
  end if;
end $$;

alter table public.requests add column if not exists catatan_ga text;

-- Indexes for performance
create index if not exists idx_requests_created_at on public.requests(created_at desc);
create index if not exists idx_requests_status on public.requests(status);
create index if not exists idx_requests_item_id on public.requests(item_id);
create index if not exists idx_items_kode on public.items(kode);
create index if not exists idx_items_kategori on public.items(kategori);

-- Overload tandai_selesai RPC to accept optional GA notes
drop function if exists public.tandai_selesai(uuid);
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
