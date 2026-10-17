# Panduan Setup & Migrasi Database Supabase - SIMPATK

Dokumen ini memuat panduan eksekusi SQL secara berurutan pada dashboard Supabase (**simpatk**).

---

## Urutan Eksekusi SQL

| Urutan | Berkas SQL | Fungsi |
|---|---|---|
| **Langkah 1** | `supabase/schema.sql` | Skema dasar (tabel, enum, RLS, fungsi stok dasar). *Lewati jika sudah pernah dijalankan.* |
| **Langkah 2** | `supabase/migrations/002_features.sql` | Migrasi fitur baru: kode ATK (`ATK-001`), kategori, harga satuan, penomoran sequence (`REQ-YYYY-00001`), `catatan_ga`, dan indeks performa. |
| **Langkah 3** | `supabase/analytics.sql` | Fungsi RPC analitik admin: `dashboard_kpi()`, `request_trend()`, `top_items()`, `status_breakdown()`. |
| **Langkah 4** | *(Setup Akun & Profil)* | Memastikan akun `admin@tps.co.id` dan `ga@tps.co.id` terdaftar di Auth dan tabel `profiles`. |
| **Langkah 5** | `supabase/seed_v2.sql` | Mengosongkan data lama, mengisi 24 master barang ATK (7 berstatus menipis/habis), dan 140 riwayat permintaan realistis (180 hari). |

---

## Langkah 1: Jalankan `schema.sql` *(Khusus database baru)*
*Jika database Supabase Anda sudah memiliki tabel `profiles`, `items`, dan `requests`, lewati langkah ini dan langsung ke Langkah 2.*

1. Buka dashboard Supabase > menu **SQL Editor**.
2. Klik **New query**.
3. Salin seluruh isi [`supabase/schema.sql`](file:///Users/muhammadraynar/Documents/project%20order/SIMPATK/supabase/schema.sql) dan jalankan (**Run**).

---

## Langkah 2: Jalankan `migrations/002_features.sql`
1. Buka menu **SQL Editor** > **New query**.
2. Salin seluruh isi [`supabase/migrations/002_features.sql`](file:///Users/muhammadraynar/Documents/project%20order/SIMPATK/supabase/migrations/002_features.sql).
3. Klik tombol **Run**.
4. Output akan memodifikasi kolom `items` (kode, kategori, harga), menambahkan sequence nomor permintaan otomatis `requests.nomor`, menambahkan kolom `catatan_ga`, membuat indeks performa, serta memperbarui fungsi `tandai_selesai(p_request_id, p_catatan)`.

---

## Langkah 3: Jalankan `analytics.sql`
1. Buka menu **SQL Editor** > **New query**.
2. Salin seluruh isi [`supabase/analytics.sql`](file:///Users/muhammadraynar/Documents/project%20order/SIMPATK/supabase/analytics.sql).
3. Klik tombol **Run**.
4. Memasang 4 fungsi analitik aman (`security definer` dengan hak akses hanya untuk Admin GA):
   - `dashboard_kpi(p_days)`: Menghitung total permintaan periode berjalan vs sebelumnya, durasi penyelesaian, tingkat penyelesaian, barang menipis, dan nilai persediaan.
   - `request_trend(p_days)`: Agregasi tren volume permintaan harian (7/30 hari) atau bulanan (6 bulan).
   - `top_items(p_days, p_limit)`: Daftar 5 barang paling sering diminta.
   - `status_breakdown(p_days)`: Proporsi permintaan berstatus `diproses` vs `selesai`.

---

## Langkah 4: Pastikan Akun & Profil Pengguna Siap
Pastikan dua akun demo telah terdaftar di menu **Authentication** > **Users**:
1. `admin@tps.co.id` (Admin GA)
2. `ga@tps.co.id` (User Divisi A)

Dan profil keduanya terdaftar di tabel `profiles`. Jika belum, jalankan query berikut:

```sql
insert into public.profiles (id, role, nama_divisi)
select id, 'admin'::app_role, 'General Affairs'
from auth.users where email = 'admin@tps.co.id'
on conflict (id) do update set role = excluded.role, nama_divisi = excluded.nama_divisi;

insert into public.profiles (id, role, nama_divisi)
select id, 'user'::app_role, 'Divisi Operasional & Komersial'
from auth.users where email = 'ga@tps.co.id'
on conflict (id) do update set role = excluded.role, nama_divisi = excluded.nama_divisi;
```

---

## Langkah 5: Jalankan `seed_v2.sql`
1. Buka menu **SQL Editor** > **New query**.
2. Salin seluruh isi [`supabase/seed_v2.sql`](file:///Users/muhammadraynar/Documents/project%20order/SIMPATK/supabase/seed_v2.sql).
3. Klik tombol **Run**.
4. Output:
   - Data permintaan dan barang lama dikosongkan.
   - 24 barang ATK realistis dengan harga satuan dan stok minimum terisi.
   - Tepat 7 barang berstatus kritis (`stok <= stok_minimum`), di antaranya 2 barang berstok 0 (`Lakban Bening` dan `Gunting Kertas Besar`).
   - 140 permintaan berpenomoran urut (`REQ-YYYY-00001` dst) tersebar secara deterministik selama 180 hari terakhir (~90% selesai dengan durasi 2 jam - 2 hari, dan 5 permintaan aktif terbaru berstatus `diproses`).

---

## Langkah 6: Verifikasi Hasil Migrasi
Jalankan query verifikasi ini di SQL Editor untuk memastikan seluruh fungsi terpasang sempurna:

```sql
-- 1. Cek jumlah master barang dan stok menipis (harus 24 total, 7 menipis/habis)
select
  count(*) as total_barang,
  count(*) filter (where stok <= stok_minimum) as total_menipis,
  count(*) filter (where stok = 0) as total_habis,
  sum(stok * harga_satuan) as total_nilai_persediaan
from public.items;

-- 2. Cek jumlah permintaan dan status (harus 140 total: 135 selesai, 5 diproses)
select
  status,
  count(*) as total
from public.requests
group by status;

-- 3. Cek format penomoran permintaan terbaru
select nomor, status, created_at, completed_at, catatan_ga
from public.requests
order by created_at desc
limit 5;
```
