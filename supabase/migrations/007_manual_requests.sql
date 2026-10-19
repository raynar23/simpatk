-- SIMPATK: Schema migration for manual ATK item requests by applicant role
-- This allows applicant users to freely input custom non-catalog items

-- 1. Make item_id nullable on requests table
alter table public.requests alter column item_id drop not null;

-- 2. Add columns for manual item name and unit
alter table public.requests add column if not exists nama_barang text;
alter table public.requests add column if not exists satuan text;

-- 3. Backfill existing requests from items table if nama_barang is null
update public.requests r
set nama_barang = i.nama,
    satuan = coalesce(r.satuan, i.satuan)
from public.items i
where r.item_id = i.id
  and r.nama_barang is null;

-- 4. Create index for fast searching by item name
create index if not exists idx_requests_nama_barang on public.requests(nama_barang);
