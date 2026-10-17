-- SIMPATK: Seed v2 with 24 realistic catalog items and 140 deterministic requests over 180 days.

-- 1. Reset existing requests and items
delete from public.requests;
delete from public.items;

-- Reset request number sequence
select setval('public.request_number_seq', 1, false);

-- 2. Insert 24 realistic ATK items across all 7 categories
-- Exactly 7 items have stok <= stok_minimum (with 2 items out of stock: stok = 0)
insert into public.items (kode, nama, kategori, satuan, stok, stok_minimum, harga_satuan)
values
  -- Kertas
  ('ATK-001', 'Kertas HVS A4 80gr PaperOne', 'Kertas', 'rim', 6, 15, 54000),      -- Menipis (1)
  ('ATK-002', 'Kertas HVS F4 75gr SiDU', 'Kertas', 'rim', 18, 10, 52000),
  ('ATK-003', 'Kertas Continuous Form 9.5x11 2 Ply', 'Kertas', 'box', 5, 3, 185000),

  -- Alat Tulis
  ('ATK-004', 'Pulpen Standard AE7 Hitam 0.5mm', 'Alat Tulis', 'lusin', 3, 8, 26000), -- Menipis (2)
  ('ATK-005', 'Pulpen Pilot G2 0.7mm Biru', 'Alat Tulis', 'lusin', 12, 6, 165000),
  ('ATK-006', 'Pensil 2B Faber-Castell', 'Alat Tulis', 'lusin', 14, 5, 48000),
  ('ATK-007', 'Spidol Boardmarker Snowman Hitam', 'Alat Tulis', 'buah', 4, 10, 9500), -- Menipis (3)
  ('ATK-008', 'Spidol Permanen Jumbo Hitam', 'Alat Tulis', 'buah', 15, 6, 12000),
  ('ATK-009', 'Stabilo Boss Original Kuning', 'Alat Tulis', 'buah', 9, 5, 11500),

  -- Perekat dan Pemotong
  ('ATK-010', 'Lakban Bening 2 Inch x 100 Yard', 'Perekat dan Pemotong', 'rol', 0, 6, 14000), -- Habis (4)
  ('ATK-011', 'Lakban Cokelat Packing 2 Inch', 'Perekat dan Pemotong', 'rol', 12, 5, 14500),
  ('ATK-012', 'Gunting Kertas Besar Stainless 8 Inch', 'Perekat dan Pemotong', 'buah', 0, 3, 22000), -- Habis (5)
  ('ATK-013', 'Cutter Besar L-500 Joyko', 'Perekat dan Pemotong', 'buah', 8, 4, 16000),
  ('ATK-014', 'Double Tape Foam 1 Inch 3M', 'Perekat dan Pemotong', 'rol', 7, 4, 21000),

  -- Arsip dan Map
  ('ATK-015', 'Map Ordner Bantex Folio 7cm Biru', 'Arsip dan Map', 'buah', 20, 8, 38000),
  ('ATK-016', 'Map Snelhecter Plastik Folio Merah', 'Arsip dan Map', 'lusin', 5, 8, 36000), -- Menipis (6)
  ('ATK-017', 'Map Gantung Pendaflex Folio', 'Arsip dan Map', 'pak', 8, 4, 65000),

  -- Perlengkapan Meja
  ('ATK-018', 'Stapler HD-10 MAX Tokyo', 'Perlengkapan Meja', 'buah', 11, 5, 24000),
  ('ATK-019', 'Isi Staples No. 10 MAX', 'Perlengkapan Meja', 'kotak', 7, 12, 4500),   -- Menipis (7)
  ('ATK-020', 'Paper Clip No. 3 Joyko', 'Perlengkapan Meja', 'kotak', 18, 8, 3500),
  ('ATK-021', 'Binder Clip No. 155 Joyko', 'Perlengkapan Meja', 'kotak', 14, 8, 11000),

  -- Tinta dan Toner
  ('ATK-022', 'Tinta Printer Epson 003 Black', 'Tinta dan Toner', 'botol', 6, 5, 88000),
  ('ATK-023', 'Toner HP LaserJet 85A (CE285A)', 'Tinta dan Toner', 'buah', 3, 2, 340000),

  -- Lainnya
  ('ATK-024', 'Baterai Alkaline AA 4s', 'Lainnya', 'pak', 16, 6, 32000);

-- 3. Seed deterministic ~140 requests for Divisi A
do $$
declare
  v_user_id uuid;
  v_item_ids uuid[];
  v_item_count integer;
  v_keperluan text[] := array[
    'Kebutuhan cetak laporan rekapitulasi peti kemas bulanan',
    'Operasional loket gate pass dan administrasi dermaga',
    'Penyusunan berkas invoice manifest ekspor impor',
    'Papan briefing pergantian shift operasional yard',
    'Pengemasan dokumen arsip audit tahunan',
    'Administrasi verifikasi dokumen custom clearance',
    'Checklist harian kelaikan crane dermaga barat',
    'Pencatatan serah terima muatan kontainer reefers',
    'Penyusunan form inspeksi keselamatan kerja K3',
    'Dokumentasi manifest muatan kapal peti kemas domestik'
  ];
  v_catatan text[] := array[
    'Diserahkan langsung ke staf administrasi operasional.',
    'Telah diambil oleh perwakilan divisi pemohon.',
    'Barang diserahkan lengkap dalam kondisi baik.',
    'Konfirmasi penerimaan via loket General Affairs.',
    null,
    null
  ];
  v_days_ago numeric;
  v_dow integer;
  v_created timestamptz;
  v_completed timestamptz;
  v_status public.request_status;
  v_jumlah integer;
  v_item_id uuid;
  v_nomor text;
  v_catatan_val text;
  v_req_num integer := 1;
  i integer;
begin
  -- Set deterministic random seed
  perform setseed(0.314159);

  select id into v_user_id
  from public.profiles
  where role = 'user'
  limit 1;

  if v_user_id is null then
    raise notice 'Profil user Divisi A belum ditemukan. Buat akun dan profil terlebih dahulu.';
    return;
  end if;

  select array_agg(id order by kode) into v_item_ids from public.items;
  v_item_count := array_length(v_item_ids, 1);

  -- Generate 140 requests distributed over 180 days
  for i in 1..140 loop
    -- Bias timestamps towards weekdays (Mon-Fri)
    -- Calculate days ago spreading between 0.1 and 179 days
    v_days_ago := 179.0 * (1.0 - (i::numeric / 140.0)) + (random() * 2.0 - 1.0);
    if v_days_ago < 0.1 then
      v_days_ago := 0.1 + (random() * 0.8);
    end if;

    v_created := now() - (v_days_ago || ' days')::interval;

    -- If weekend, shift by 1-2 days to land on weekday 85% of time
    v_dow := extract(dow from v_created);
    if (v_dow = 0 or v_dow = 6) and random() > 0.15 then
      v_created := v_created - interval '1 day';
    end if;

    -- Pick item with higher weight on high-turnover items (A4 paper, AE7 pen, boardmarker)
    if random() < 0.35 then
      v_item_id := v_item_ids[1 + floor(random() * 4)::integer];
    else
      v_item_id := v_item_ids[1 + floor(random() * v_item_count)::integer];
    end if;

    -- Quantity between 1 and 6
    v_jumlah := 1 + floor(random() * 5)::integer;

    -- Last 5 requests (most recent) are 'diproses', all earlier ~135 requests are 'selesai'
    if i >= 136 then
      v_status := 'diproses';
      v_completed := null;
      v_catatan_val := null;
    else
      v_status := 'selesai';
      -- Completed between 2 hours and 48 hours after creation
      v_completed := v_created + ((2.0 + random() * 44.0) || ' hours')::interval;
      if v_completed > now() then
        v_completed := now() - interval '15 minutes';
      end if;
      v_catatan_val := v_catatan[1 + floor(random() * array_length(v_catatan, 1))::integer];
    end if;

    v_nomor := 'REQ-' || to_char(v_created, 'YYYY') || '-' || lpad(v_req_num::text, 5, '0');
    v_req_num := v_req_num + 1;

    insert into public.requests (
      nomor,
      user_id,
      item_id,
      jumlah,
      keperluan,
      status,
      created_at,
      completed_at,
      catatan_ga
    )
    values (
      v_nomor,
      v_user_id,
      v_item_id,
      v_jumlah,
      v_keperluan[1 + floor(random() * array_length(v_keperluan, 1))::integer],
      v_status,
      v_created,
      v_completed,
      v_catatan_val
    );
  end loop;

  -- Advance sequence value past generated count
  perform setval('public.request_number_seq', v_req_num);
end $$;
