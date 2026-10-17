-- SIMPATK: Seed initial inventory items and sample division requests.

-- Insert 12 initial office supply items (4 items below minimum stock for demo)
insert into public.items (nama, satuan, stok, stok_minimum)
values
  ('Pulpen Standard AE7 Hitam', 'kotak', 3, 5),
  ('Kertas HVS A4 80gr', 'rim', 8, 15),
  ('Spidol Boardmarker Hitam', 'buah', 4, 10),
  ('Lakban Bening 2 Inch', 'rol', 2, 5),
  ('Pensil 2B Faber-Castell', 'lusin', 12, 5),
  ('Stapler HD-10 MAX', 'buah', 7, 3),
  ('Isi Staples No. 10', 'kotak', 24, 10),
  ('Map Folio Snelhecter', 'pak', 15, 5),
  ('Buku Agenda Ekspedisi', 'buku', 10, 4),
  ('Penggaris Besi 30cm', 'buah', 8, 3),
  ('Gunting Kertas Besar', 'buah', 6, 2),
  ('Sticky Notes 3x3 Kuning', 'blok', 18, 5)
on conflict (nama) do update set
  satuan = excluded.satuan,
  stok = excluded.stok,
  stok_minimum = excluded.stok_minimum;

-- Seed 6 sample requests for Divisi A if user profile is already created
do $$
declare
  v_user_id uuid;
  v_item_pulpen uuid;
  v_item_kertas uuid;
  v_item_spidol uuid;
  v_item_staples uuid;
  v_item_map uuid;
  v_item_lakban uuid;
begin
  select id into v_user_id
  from public.profiles
  where role = 'user'
  order by id
  limit 1;

  if v_user_id is null then
    raise notice 'Akun user Divisi A belum ditemukan di tabel profiles. Buat user dan isi profiles terlebih dahulu.';
    return;
  end if;

  select id into v_item_pulpen from public.items where nama = 'Pulpen Standard AE7 Hitam';
  select id into v_item_kertas from public.items where nama = 'Kertas HVS A4 80gr';
  select id into v_item_spidol from public.items where nama = 'Spidol Boardmarker Hitam';
  select id into v_item_staples from public.items where nama = 'Isi Staples No. 10';
  select id into v_item_map from public.items where nama = 'Map Folio Snelhecter';
  select id into v_item_lakban from public.items where nama = 'Lakban Bening 2 Inch';

  delete from public.requests where user_id = v_user_id;

  insert into public.requests (user_id, item_id, jumlah, keperluan, status, created_at, completed_at)
  values
    (
      v_user_id,
      v_item_kertas,
      3,
      'Kebutuhan cetak laporan rekapitulasi peti kemas bulanan',
      'selesai',
      now() - interval '4 days',
      now() - interval '3 days'
    ),
    (
      v_user_id,
      v_item_pulpen,
      2,
      'Operasional loket gate pass dan administrasi dermaga',
      'selesai',
      now() - interval '3 days',
      now() - interval '2 days'
    ),
    (
      v_user_id,
      v_item_staples,
      5,
      'Penyusunan berkas invoice manifest ekspor impor',
      'selesai',
      now() - interval '2 days',
      now() - interval '1 day'
    ),
    (
      v_user_id,
      v_item_spidol,
      4,
      'Papan briefing pergantian shift operasional yard',
      'diproses',
      now() - interval '18 hours',
      null
    ),
    (
      v_user_id,
      v_item_lakban,
      2,
      'Pengemasan dokumen arsip audit tahunan',
      'diproses',
      now() - interval '5 hours',
      null
    ),
    (
      v_user_id,
      v_item_map,
      3,
      'Penyimpanan berkas pemeriksaan karantina peti kemas',
      'diproses',
      now() - interval '1 hour',
      null
    );

  raise notice 'Berhasil memasukkan 6 data permintaan contoh untuk akun Divisi A.';
end $$;
