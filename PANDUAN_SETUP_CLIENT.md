# 📦 Panduan Instalasi & Penggunaan SIMPATK
**Sistem Informasi Manajemen Permintaan & Pengelolaan ATK (PT Terminal Petikemas Surabaya)**

Panduan ini disusun secara praktis dan mudah dipahami untuk pengguna awam (non-IT). Cukup ikuti 3 langkah berikut untuk menjalankan sistem secara lokal atau menghubungkannya ke database.

---

## 🚀 Ringkasan Cepat (3 Langkah)

### Langkah 1: Siapkan Database di Supabase (Gratis & 1 Klik)
1. Buka situs [https://supabase.com](https://supabase.com) dan login/daftar akun gratis.
2. Klik tombol **New Project** (beri nama project, misal: `SIMPATK`, buat password database, dan pilih region terdekat seperti *Singapore*).
3. Setelah project selesai dibuat, buka menu **SQL Editor** (ikon terminal/kode di sidebar kiri).
4. Klik **New query**, lalu buka file **`DATABASE_LENGKAP_SIMPATK.sql`** yang ada di dalam folder ini:
   - Salin (**Copy**) semua isinya, lalu tempel (**Paste**) ke SQL Editor Supabase.
   - Klik tombol **Run** (warna hijau di pojok kanan bawah).
   - *Selesai! Seluruh tabel, fungsi, keamanan data, dan 24 data katalog ATK awal sudah langsung terpasang 100%.*

---

### Langkah 2: Hubungkan Project ke Supabase
1. Di dashboard Supabase, buka menu **Project Settings** (ikon gerigi di kiri bawah) -> pilih **API**.
2. Salin 2 data penting:
   - **Project URL** (contoh: `https://xyzcompany.supabase.co`)
   - **Project API Keys (anon / public)** (contoh: `eyJhbGciOi...`)
3. Buka folder project ini di komputer Anda:
   - Cari file bernama **`.env.example`**, lalu salin/duplikat dan ubah namanya menjadi **`.env.local`**.
   - Buka file **`.env.local`** tersebut menggunakan Notepad / Text Editor, lalu isi URL dan API Key tadi:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=masukkan_anon_key_anda_disini
     ```
   - Simpan file tersebut.

---

### Langkah 3: Jalankan Aplikasi di Komputer
Pastikan komputer Anda sudah terpasang **Node.js** (unduh gratis di [nodejs.org](https://nodejs.org) jika belum ada).

1. Buka terminal / Command Prompt (CMD) di folder project ini.
2. Jalankan perintah instalasi berikut:
   ```bash
   npm install
   ```
3. Setelah selesai, jalankan aplikasi dengan perintah:
   ```bash
   npm run dev
   ```
4. Buka browser Anda (Google Chrome / Edge) dan kunjungi:
   👉 **`http://localhost:3000`**

---

## 👥 Akun Bawaan & Hak Akses (Role)

Aplikasi memiliki 2 role utama dengan alur kerja terintegrasi:

| Role | Email Demo | Password Demo | Hak Akses & Fungsi |
| :--- | :--- | :--- | :--- |
| **Admin General Affairs (GA)** | `admin@tps.co.id` | `Admin123!` | Kelola stok persediaan ATK, penempatan rak 1–4, verifikasi permintaan masuk, serah terima barang, ekspor laporan berkala & PDF cetak resmi, serta pengelolaan akun pengguna. |
| **Divisi Pemohon (User)** | `pemohon@tps.co.id` | `User123!` | Mengajukan permintaan ATK dengan nama barang bebas (input manual) atau memilih rekomendasi, menentukan satuan sendiri, memantau riwayat & status pengajuan secara *real-time*. |

> **Catatan Pembuatan Akun Baru:**
> - Akun baru dapat langsung didaftarkan melalui menu **Pengelolaan Pengguna** di dashboard Admin GA, atau melalui menu pendaftaran akun Supabase Auth.
> - Setiap akun secara otomatis terhubung ke sistem notifikasi lonceng independen per akun.

---

## 📁 Struktur Berkas Utama

- **`DATABASE_LENGKAP_SIMPATK.sql`**: Skrip master database mandiri (All-in-One) untuk inisialisasi Supabase 1 kali klik.
- **`src/app/`**: Kode antarmuka Next.js (Dashboard Admin, Form Pemohon, Riwayat, Laporan, Pengaturan).
- **`src/components/`**: Komponen UI modern, grafik analitik, kartu metrik stok, tabel data interaktif, dan modal.
- **`supabase/`**: Berkas migrasi database per modul dan data awal (*seed*).
- **`.env.example`**: Contoh format variabel lingkungan.

---
*Dikembangkan dengan Next.js, TailwindCSS, dan Supabase Database Engine.*
