# SIMPATK - Sistem Informasi Manajemen Permintaan ATK

Sistem Informasi Manajemen Permintaan Alat Tulis Kantor (ATK) internal divisi untuk **General Affairs, PT Terminal Petikemas Surabaya**.

Aplikasi ini memfasilitasi pengajuan kebutuhan ATK oleh divisi operasional ke General Affairs secara langsung, pemantauan status pemrosesan secara *realtime*, serta pencatatan dan pengelolaan persediaan fisik ATK dengan standar antarmuka profesional bergaya macOS dan iOS.

---

## Fitur Utama

### 1. Autentikasi & Otorisasi Berbasis Peran
- **Admin GA**: Mengelola antrean permintaan barang, menandai permintaan selesai, serta menambah dan mengurangi stok barang secara atomik.
- **User Divisi**: Mengajukan permintaan kebutuhan ATK dan memantau riwayat pengajuan milik divisinya secara *realtime*.
- Pembatasan rute ketat via Next.js Middleware (*cross-role protection*).

### 2. Antarmuka Responsif (Mobile-First)
- **Desktop (Laptop/PC)**: Navigasi sidebar 232px, tabel bergaya macOS, metrik statistik, dan modal dialog sheet di tengah layar.
- **Mobile (Smartphone)**: Navigasi tab bar bawah bergaya iOS, tampilan kartu ringkas tanpa *horizontal scroll*, kontrol sentuh ramah jari (min. 44px), serta *bottom sheet* modal.

### 3. Keamanan & Logika Database Atomik
- **Row Level Security (RLS)** aktif di seluruh tabel database Supabase PostgreSQL.
- **RPC Atomik**: Fungsi `tambah_stok` dan `kurangi_stok` dengan penguncian baris (`FOR UPDATE`) untuk mencegah *race condition* dan menjamin stok tidak pernah bernilai negatif.
- **Supabase Realtime**: Permintaan baru dan perubahan status langsung diperbarui pada layar tanpa memerlukan *refresh* manual.

---

## Teknologi

- **Frontend Framework**: Next.js (App Router)
- **Bahasa**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4 & CSS Variables Design Tokens
- **Icons**: Lucide React
- **Backend & Database**: Supabase (PostgreSQL, Supabase Auth, Realtime, RPC, Storage)
- **Client Library**: `@supabase/ssr`

---

## Panduan Instalasi Lokal

### 1. Klon Repositori
```bash
git clone https://github.com/raynar23/simpatk.git
cd simpatk
```

### 2. Instal Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Salin berkas template environment:
```bash
cp .env.example .env.local
```
Buka `.env.local` dan isi URL serta Kunci Anonim dari proyek Supabase Anda:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Setup Database Supabase
Ikuti panduan langkah demi langkah yang terdapat pada berkas [supabase/README.md](supabase/README.md):
1. Jalankan `supabase/schema.sql` di SQL Editor Supabase.
2. Buat akun demo di Authentication > Users:
   - General Affairs (Admin GA - Akses 4 Fitur Utama): `admin@tps.co.id`
   - User Divisi Pemohon: `ga@tps.co.id` (atau buat user baru seperti `divisi.a@tps.co.id`)
   *(Tips: Jika akun `ga@tps.co.id` ingin dijadikan role General Affairs, jalankan query: `UPDATE public.profiles SET role = 'admin', nama_divisi = 'General Affairs' WHERE id IN (SELECT id FROM auth.users WHERE email = 'ga@tps.co.id');`)*
3. Isi tabel `profiles` sesuai instruksi di README supabase.
4. Jalankan `supabase/seed_v2.sql` untuk memuat data inventaris barang ATK dan riwayat permintaan.

### 5. Jalankan Aplikasi
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## Panduan Deploy ke Vercel

1. **Push ke GitHub**: Pastikan perubahan kode telah berada di branch `main` repositori GitHub.
2. **Import Proyek di Vercel**:
   - Masuk ke dashboard [Vercel](https://vercel.com).
   - Klik **Add New** > **Project** > Import repositori `simpatk`.
3. **Konfigurasi Environment Variables**:
   Pada pengaturan deployment Vercel, tambahkan dua variabel berikut:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL Supabase proyek Anda.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon / public key Supabase proyek Anda.
4. **Deploy**: Klik tombol **Deploy**. Aplikasi akan otomatis di-build dan siap digunakan.

---

## Hak Cipta
PT Terminal Petikemas Surabaya &copy; 2026.
