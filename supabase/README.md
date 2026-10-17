# Panduan Setup Database Supabase - SIMPATK

Ikuti 5 langkah berurutan di bawah ini pada dashboard project Supabase (**simpatk**).

---

## Langkah 1: Jalankan `schema.sql`
1. Buka dashboard Supabase > menu **SQL Editor**.
2. Klik **New query**.
3. Salin seluruh isi file [`supabase/schema.sql`](file:///Users/muhammadraynar/Documents/project%20order/SIMPATK/supabase/schema.sql) lalu paste ke editor.
4. Klik tombol **Run**.
5. Pastikan output menyatakan `Success. No rows returned`.

---

## Langkah 2: Buat 2 Akun Pengguna di Supabase Auth
Buka menu **Authentication** > **Users** > klik **Add user** > **Create user**:

### Akun 1: Admin GA
- **Email**: `admin@tps.co.id`
- **Password**: *(tentukan kata sandi Anda sendiri)*
- **Auto Confirm User?**: Centang / Aktifkan (Yes)

### Akun 2: User Divisi A
- **Email**: `ga@tps.co.id`
- **Password**: *(tentukan kata sandi Anda sendiri)*
- **Auto Confirm User?**: Centang / Aktifkan (Yes)

Setelah dibuat, salin nilai **User UID** dari masing-masing akun tersebut.

---

## Langkah 3: Isi Data Profil Pengguna (`profiles`)
Buka menu **SQL Editor** > **New query**. Ganti string `'PASTE_UID_ADMIN_DI_SINI'` dan `'PASTE_UID_USER_DI_SINI'` dengan UID asli dari Langkah 2:

```sql
-- Isi profile untuk Admin GA
insert into public.profiles (id, role, nama_divisi)
values
  ('PASTE_UID_ADMIN_DI_SINI', 'admin', 'General Affairs')
on conflict (id) do update set
  role = excluded.role,
  nama_divisi = excluded.nama_divisi;

-- Isi profile untuk User Divisi A
insert into public.profiles (id, role, nama_divisi)
values
  ('PASTE_UID_USER_DI_SINI', 'user', 'Divisi Operasional & Komersial')
on conflict (id) do update set
  role = excluded.role,
  nama_divisi = excluded.nama_divisi;
```

Klik **Run** dan pastikan kedua profil tersimpan.

> **Alternatif Cepat (Otomatis berdasarkan email pengguna)**:
> Jika kedua akun dibuat persis dengan email di atas, Anda bisa langsung menjalankan query ini tanpa menyalin UID manual:
> ```sql
> insert into public.profiles (id, role, nama_divisi)
> select id, 'admin'::app_role, 'General Affairs'
> from auth.users where email = 'admin@tps.co.id'
> on conflict (id) do update set role = excluded.role, nama_divisi = excluded.nama_divisi;
>
> insert into public.profiles (id, role, nama_divisi)
> select id, 'user'::app_role, 'Divisi Operasional & Komersial'
> from auth.users where email = 'ga@tps.co.id'
> on conflict (id) do update set role = excluded.role, nama_divisi = excluded.nama_divisi;
> ```

---

## Langkah 4: Jalankan `seed.sql`
1. Buka menu **SQL Editor** > **New query**.
2. Salin seluruh isi file [`supabase/seed.sql`](file:///Users/muhammadraynar/Documents/project%20order/SIMPATK/supabase/seed.sql) lalu paste ke editor.
3. Klik **Run**.
4. Output akan memuat 12 data barang ATK (4 berstatus stok menipis) dan 6 data permintaan contoh untuk akun Divisi A.

---

## Langkah 5: Cara Mengecek Row Level Security (RLS) Bekerja
Jalankan query uji berikut di SQL Editor untuk memverifikasi keamanan data:

```sql
-- 1. Uji fungsi helper admin
select public.is_admin(); -- Mengembalikan false jika dijalankan tanpa sesi autentikasi admin

-- 2. Uji fungsi kurangi_stok tanpa otorisasi admin (wajib menghasilkan error)
do $$
declare
  v_item_id uuid;
begin
  select id into v_item_id from public.items limit 1;
  perform public.kurangi_stok(v_item_id, 1);
end $$;
-- Output yang diharapkan: "ERROR: Akses ditolak: Hanya Admin GA yang berhak mengurangi stok barang."

-- 3. Uji fungsi tambah_stok tanpa otorisasi admin (wajib menghasilkan error)
do $$
declare
  v_item_id uuid;
begin
  select id into v_item_id from public.items limit 1;
  perform public.tambah_stok(v_item_id, 5);
end $$;
-- Output yang diharapkan: "ERROR: Akses ditolak: Hanya Admin GA yang berhak menambah stok barang."

-- 4. Uji fungsi tandai_selesai tanpa otorisasi admin (wajib menghasilkan error)
do $$
declare
  v_req_id uuid;
begin
  select id into v_req_id from public.requests limit 1;
  perform public.tandai_selesai(v_req_id);
end $$;
-- Output yang diharapkan: "ERROR: Akses ditolak: Hanya Admin GA yang berhak menandai permintaan selesai."
```

Catatan Keamanan RLS Tambahan:
- **Tabel `profiles`**: Pengguna membaca profil sendiri, admin membaca semua baris (untuk menampilkan nama divisi di dashboard admin).
- **Tabel `requests`**: Pengguna hanya dapat INSERT dengan status `'diproses'`, `completed_at` NULL, dan `user_id` milik sendiri. Tidak ada izin UPDATE/DELETE langsung; perubahan status ke selesai hanya dapat dilakukan via fungsi RPC `tandai_selesai`.

