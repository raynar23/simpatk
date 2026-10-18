-- SIMPATK Migration 004: Add physical rack location (Rak 1, Rak 2, Rak 3, Rak 4) to items table
-- Run this in the Supabase SQL Editor if you wish to persist rak column directly in the database.

-- 1. Add column if not exists
alter table public.items add column if not exists rak text default 'Rak 1';

-- 2. Backfill existing items based on category
update public.items
set rak = 'Rak 1'
where kategori in ('Kertas', 'Tinta dan Toner');

update public.items
set rak = 'Rak 2'
where kategori in ('Alat Tulis');

update public.items
set rak = 'Rak 3'
where kategori in ('Perekat dan Pemotong');

update public.items
set rak = 'Rak 4'
where kategori in ('Arsip dan Map', 'Perlengkapan Meja', 'Lainnya')
   or kategori is null;

-- 3. Set not null constraint
alter table public.items alter column rak set not null;

-- 4. Add check constraint
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'items_rak_check') then
    alter table public.items add constraint items_rak_check
      check (rak in ('Rak 1', 'Rak 2', 'Rak 3', 'Rak 4'));
  end if;
end $$;

-- 5. Create index for fast rack-based filtering
create index if not exists idx_items_rak on public.items(rak);
