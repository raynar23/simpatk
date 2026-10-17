# ARCHITECTURE

## Stack (biaya Rp0)
| Lapisan | Pilihan |
|---|---|
| Bahasa | TypeScript |
| Framework | Next.js (App Router) |
| Styling | Tailwind CSS |
| Icon | lucide-react |
| Database | Supabase PostgreSQL (free tier) |
| Auth | Supabase Auth (email + password) |
| Realtime | Supabase Realtime (permintaan baru muncul di Admin GA tanpa refresh) |
| Hosting | Vercel (free tier), deploy dari GitHub |

Nama project Supabase: `simpatk`.

## Struktur Halaman
```
/login
/admin                 dashboard Admin GA
/admin/permintaan      daftar permintaan masuk
/admin/persediaan      daftar stok
/user                  dashboard user: form + daftar permintaan sendiri
```
Middleware: belum login diarahkan ke `/login`; role `user` tidak boleh membuka `/admin/*`; role `admin` yang membuka `/user` diarahkan ke `/admin`.

## Skema Database (3 tabel)
```sql
create type app_role as enum ('admin', 'user');
create type request_status as enum ('diproses', 'selesai');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null,
  nama_divisi text not null          -- contoh: 'General Affairs', 'Divisi A'
);

create table items (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  satuan text not null default 'pcs',
  stok integer not null default 0 check (stok >= 0),
  stok_minimum integer not null default 0 check (stok_minimum >= 0),
  created_at timestamptz not null default now()
);

create table requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  item_id uuid not null references items(id),
  jumlah integer not null check (jumlah > 0),
  keperluan text not null,
  status request_status not null default 'diproses',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
```
Status stok dihitung di aplikasi: `stok <= stok_minimum` berarti menipis (merah). Tidak ada tabel riwayat stok.

## Row Level Security
- Aktifkan RLS di semua tabel.
- `profiles`: pengguna membaca profil sendiri (`id = auth.uid()`); admin boleh SELECT semua baris (`is_admin()`) agar nama divisi pengirim tampil di dashboard admin.
- `items`: semua pengguna login boleh SELECT; hanya admin boleh INSERT/UPDATE.
- `requests`: user hanya SELECT miliknya (`user_id = auth.uid()`); admin boleh SELECT semua (`is_admin()`). INSERT hanya boleh dilakukan user dengan `WITH CHECK (user_id = auth.uid() and status = 'diproses' and completed_at is null)`. User dan admin tidak memiliki izin UPDATE/DELETE langsung; perubahan status ke selesai hanya melalui fungsi RPC `tandai_selesai`.
- Gunakan fungsi helper `is_admin()` (security definer) agar policy tidak rekursif.
- Aktifkan Realtime pada tabel `requests`.

## Logika Stok
- Tambah Stok: `stok = stok + n` (n > 0).
- Kurangi Stok: `stok = stok - n`, tolak jika hasil < 0 (tampilkan pesan jelas).
- Lakukan lewat satu operasi atomik (RPC/fungsi SQL), bukan baca-lalu-tulis dari klien.
- Tandai Selesai hanya mengubah `status` dan `completed_at`. Tidak menyentuh stok.

## Environment
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
Jangan pernah memakai atau menampilkan `service_role` key di kode klien. Jangan commit `.env.local`.

## Seed
Buat `supabase/seed.sql` dan `supabase/README.md` berisi langkah: buat 2 user di Supabase Auth (admin GA dan Divisi A), isi `profiles`, isi `items` dan contoh `requests`. Kredensial demo ditulis di README, tidak ditampilkan di halaman login.

## Deploy
1. Push ke GitHub. 2. Import ke Vercel. 3. Isi environment variable. 4. Deploy.
Catatan: free tier Supabase menidurkan project yang lama tidak dipakai; buka aplikasi beberapa hari sebelum demo.

## Struktur Folder (saran)
```
src/app/(auth)/login
src/app/admin/...
src/app/user/...
src/components/ui
src/lib/supabase (client.ts, server.ts)
src/lib/types.ts
supabase/ (schema.sql, seed.sql, README.md)
```
