# 📦 PANDUAN LENGKAP SETUP & INSTALASI SIMPATK
**Sistem Informasi Manajemen Permintaan & Pengelolaan ATK — PT Terminal Petikemas Surabaya**

Panduan ini disusun secara bertahap, runtut, dan mudah dipahami untuk pengguna umum (bahkan jika Anda **bukan orang IT**). Cukup ikuti langkah demi langkah di bawah ini untuk mengekstrak, menyiapkan database, dan menjalankan aplikasi di komputer Anda.

---

## 📋 Daftar Isi Langkah Pengerjaan
1. [Langkah 1: Ekstrak / Unzip File Proyek](#-langkah-1-ekstrak--unzip-file-proyek)
2. [Langkah 2: Menyiapkan Database di Supabase (Gratis & 1 Klik)](#-langkah-2-menyiapkan-database-di-supabase-gratis--1-klik)
3. [Langkah 3: Menghubungkan Proyek ke Database (.env.local)](#-langkah-3-menghubungkan-proyek-ke-database-envlocal)
4. [Langkah 4: Memasang Node.js (Prasyarat Aplikasi)](#-langkah-4-memasang-nodejs-prasyarat-aplikasi)
5. [Langkah 5: Menjalankan Aplikasi di Komputer](#-langkah-5-menjalankan-aplikasi-di-komputer)
6. [Langkah 6: Login & Hak Akses Akun Pengguna](#-langkah-6-login--hak-akses-akun-pengguna)
7. [💡 Tanya Jawab & Solusi Kendala (Troubleshooting)](#-tanya-jawab--solusi-kendala-troubleshooting)

---

## 🗂️ Langkah 1: Ekstrak / Unzip File Proyek

File yang Anda terima berbentuk berkas arsip zip bernama `SIMPATK_LENGKAP_v1.0.0.zip`. Sebelum digunakan, file ini harus diekstrak terlebih dahulu.

### Cara Ekstrak di Windows:
1. Temukan file **`SIMPATK_LENGKAP_v1.0.0.zip`** di folder Download komputer Anda.
2. Klik kanan pada file tersebut, lalu pilih menu **Extract All...** (atau **Ekstrak Semua**).
3. Akan muncul jendela baru; klik tombol **Extract** di bagian bawah.
4. Tunggu beberapa saat hingga proses selesai. Folder baru bernama **`SIMPATK`** akan terbuka secara otomatis.

### Cara Ekstrak di macOS (Mac):
1. Temukan file **`SIMPATK_LENGKAP_v1.0.0.zip`**.
2. Klik dua kali (*double-click*) pada file zip tersebut.
3. macOS akan otomatis mengekstraknya menjadi folder **`SIMPATK`**.

> **Penting:** Pastikan seluruh langkah selanjutnya dilakukan di dalam folder hasil ekstraksi ini.

---

## 🗄️ Langkah 2: Menyiapkan Database di Supabase (Gratis & 1 Klik)

Aplikasi SIMPATK menggunakan database online Supabase yang aman, berkecepatan tinggi, dan dapat digunakan secara gratis.

### 1. Buat Akun & Project Baru di Supabase
1. Buka browser (Google Chrome, Edge, dll) lalu buka: [https://supabase.com](https://supabase.com).
2. Klik tombol **Start your project** atau **Sign In** (Anda bisa mendaftar gratis menggunakan akun Google / GitHub).
3. Setelah masuk ke halaman dashboard, klik tombol hijau **New Project**.
4. Isi data pembuatan project:
   - **Name**: Ketik `SIMPATK` (atau nama lain yang Anda inginkan).
   - **Database Password**: Buat password yang kuat dan catat password ini.
   - **Region**: Pilih yang terdekat, misalnya **Singapore (ap-southeast-1)**.
5. Klik tombol **Create new project**.
6. Tunggu sekitar 1–2 menit sampai pembuatan database selesai (indikator status di pojok kiri atas berubah menjadi hijau / aktif).

---

### 2. Eksekusi Skrip Database Master (1 Klik)
Di dalam folder proyek hasil ekstrak, terdapat file bernama **`DATABASE_LENGKAP_SIMPATK.sql`**. File ini memuat seluruh skema tabel, logika stok, 24 katalog ATK awal, dan akun demo otomatis.

1. Buka file **`DATABASE_LENGKAP_SIMPATK.sql`** di komputer Anda:
   - **Pengguna Windows:** Klik kanan file `DATABASE_LENGKAP_SIMPATK.sql` -> pilih **Open with** -> pilih **Notepad** (Catatan).
   - **Pengguna Mac:** Buka dengan aplikasi **TextEdit** atau Text Editor pilihan Anda.
   - Tekan tombol **`Ctrl + A`** (atau **`Cmd + A`** di Mac) untuk menyeleksi seluruh isi teks, lalu tekan **`Ctrl + C`** (atau **`Cmd + C`**) untuk menyalin (**Copy**).
2. Kembali ke dashboard Supabase Anda di browser:
   - Pada bilah menu hitam di sebelah kiri, klik ikon **SQL Editor** (ikon berbentuk terminal `>_`).
   - Klik tombol **+ New query** di bagian atas.
   - Klik di area teks yang kosong, lalu tekan **`Ctrl + V`** (atau **`Cmd + V`**) untuk menempelkan (**Paste**) seluruh kode SQL tadi.
   - Klik tombol hijau **RUN** di pojok kanan bawah.
3. Tunggu beberapa detik hingga muncul keterangan hijau: **`Success. No rows returned`**.

🎉 **Selamat!** Seluruh struktur database, aturan keamanan, 24 barang ATK, dan akun login demo sudah 100% terpasang dengan sempurna di database Anda!

---

## 🔑 Langkah 3: Menghubungkan Proyek ke Database (.env.local)

Agar aplikasi SIMPATK di komputer Anda dapat membaca dan menyimpan data ke Supabase, masukkan kredensial API Supabase ke file konfigurasi.

### 1. Ambil Kunci Kredensial dari Supabase:
1. Di dashboard project Supabase Anda, klik menu **Project Settings** (ikon roda gigi ⚙️ di pojok kiri bawah).
2. Klik submenu **API** (atau **Data API**).
3. Anda akan melihat dua informasi penting berikut:
   - **Project URL**: Berupa alamat tautan (contoh: `https://abcdefghijklm.supabase.co`).
   - **Project API Keys** -> bagian **`anon` / `public`**: Berupa kode teks panjang (contoh: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`).
4. Klik tombol **Copy** di samping masing-masing data tersebut.

### 2. Buat File Konfigurasi di Komputer:
1. Buka folder proyek **`SIMPATK`** di komputer Anda.
2. Cari file bernama **`.env.example`**.
3. Salin (*copy-paste*) file tersebut di folder yang sama, lalu ubah namanya menjadi **`.env.local`**.
   > *Tips untuk Windows:* Pastikan nama filenya tepat `.env.local` (bukan `.env.local.txt`). Jika di komputer Anda belum menampilkan ekstensi berkas, Anda cukup me-rename `.env.example` menjadi `.env.local`.
4. Buka file **`.env.local`** tersebut menggunakan **Notepad** atau text editor.
5. Ganti teks petunjuk dengan Project URL dan Anon Key asli milik Anda dari langkah sebelumnya:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklm.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.contoh_kode_anon_key_anda
   ```
6. Simpan file tersebut (**`Ctrl + S`** di Windows atau **`Cmd + S`** di Mac).

---

## 💻 Langkah 4: Memasang Node.js (Prasyarat Aplikasi)

Aplikasi SIMPATK berjalan di atas lingkungan Node.js. Jika komputer Anda belum pernah memasang Node.js:

1. Kunjungi situs resmi: [https://nodejs.org](https://nodejs.org).
2. Unduh versi **LTS (Recommended for Most Users)** yang sesuai dengan sistem operasi komputer Anda (Windows / macOS).
3. Buka file installer yang baru saja diunduh, lalu ikuti instruksi pemasangan di layar (cukup klik **Next** -> **Next** -> **Install** -> **Finish**).
4. Setelah instalasi selesai, Node.js sudah siap digunakan di komputer Anda.

---

## 🚀 Langkah 5: Menjalankan Aplikasi di Komputer

Kini saatnya menyalakan aplikasi SIMPATK:

### 1. Buka Terminal / Command Prompt di Folder SIMPATK
- **Cara Termudah di Windows:**
  1. Buka folder **`SIMPATK`** di File Explorer.
  2. Klik pada **kolom alamat folder** (*address bar*) di bagian atas (tempat yang menampilkan lokasi folder).
  3. Ketik tulisan: `cmd` lalu tekan tombol **Enter** di keyboard.
  4. Jendela Command Prompt hitam akan otomatis terbuka tepat di dalam folder SIMPATK.
- **Cara di macOS (Mac):**
  1. Buka Finder, cari folder **`SIMPATK`**.
  2. Klik kanan pada folder tersebut, lalu pilih menu **New Terminal at Folder** (atau buka aplikasi Terminal dan ketik `cd` diikuti spasi lalu seret folder SIMPATK ke Terminal dan tekan Enter).

---

### 2. Pasang Komponen Aplikasi (Cukup 1 Kali Saja)
Di jendela Command Prompt / Terminal yang terbuka, ketik perintah berikut:
```bash
npm install
```
Tekan tombol **Enter**. Komputer akan mengunduh paket pendukung yang dibutuhkan aplikasi. Tunggu hingga proses selesai (biasanya memakan waktu 1–2 menit).

---

### 3. Nyalakan Server Aplikasi
Setelah proses `npm install` selesai, jalankan perintah ini:
```bash
npm run dev
```
Tekan tombol **Enter**. Dalam beberapa detik akan muncul keterangan hijau:
`ready - started server on 0.0.0.0:3000, url: http://localhost:3000`

---

### 4. Buka Aplikasi di Browser
Buka browser favorit Anda (Google Chrome / Microsoft Edge / Mozilla Firefox), lalu ketikkan alamat berikut di bilah alamat (*address bar*):
👉 **`http://localhost:3000`**

Halaman Login SIMPATK PT Terminal Petikemas Surabaya akan langsung tampil di layar monitor Anda!

---

## 👥 Langkah 6: Login & Hak Akses Akun Pengguna

Database Anda sudah otomatis memiliki dua akun demo resmi yang siap langsung digunakan tanpa perlu mendaftar ulang:

### 1. Akun Admin General Affairs (GA)
- **Email**: `admin@tps.co.id`
- **Kata Sandi**: `Admin123!`
- **Wewenang & Fitur:**
  - Melihat Dashboard KPI Stok, Grafik Tren Permintaan, dan Rasio Penyelesaian.
  - Memverifikasi pengajuan permintaan ATK dari divisi pemohon.
  - Melakukan serah terima barang (stok gudang otomatis berkurang).
  - Manajemen penempatan ATK pada Rak 1 hingga Rak 4.
  - Manajemen stok fisik & pengisian ulang (*restock*).
  - Ekspor laporan rekapitulasi data (CSV/Excel) dan cetak berkas PDF resmi ber-kop surat TPS.
  - Mengelola dan menambahkan akun pengguna divisi baru di menu **Pengelolaan Pengguna**.

### 2. Akun Divisi Pemohon (User Divisi)
- **Email**: `pemohon@tps.co.id`
- **Kata Sandi**: `User123!`
- **Wewenang & Fitur:**
  - Mengajukan permohonan ATK baru dengan input nama barang bebas (manual) atau memilih rekomendasi katalog.
  - Menentukan satuan dan jumlah kebutuhan sendiri secara fleksibel.
  - Memantau status pengajuan secara langsung (*real-time*): status *Diproses* atau *Selesai*.
  - Riwayat permintaan mandiri lengkap dengan pencatatan tanggal selesai dan keterangan serah terima dari GA.

---

## 💡 Tanya Jawab & Solusi Kendala (Troubleshooting)

### Q1: Bagaimana cara mematikan server aplikasi jika sudah selesai digunakan?
> **Jawaban:** Cukup buka jendela Command Prompt / Terminal tempat Anda menjalankan `npm run dev`, lalu tekan tombol kombinasi **`Ctrl + C`** di keyboard. Jika muncul pertanyaan `Terminate batch job (Y/N)?`, ketik huruf `Y` lalu tekan **Enter**.

### Q2: Muncul pesan error "Port 3000 is in use"?
> **Jawaban:** Itu berarti ada aplikasi lain atau tab terminal lain yang sedang memakai port 3000. Jangan khawatir, sistem Next.js biasanya otomatis akan menggunakan port alternatif yaitu port 3001. Silakan buka alamat: **`http://localhost:3001`** di browser Anda.

### Q3: Saat menjalankan perintah di terminal muncul error "'npm' is not recognized..."?
> **Jawaban:** Komputer Anda belum mendeteksi Node.js. Pastikan Anda sudah mengunduh dan menginstal Node.js dari [nodejs.org](https://nodejs.org). Jika baru saja diinstal, tutup jendela Command Prompt/Terminal yang sedang terbuka, lalu buka kembali jendela yang baru agar komputer membaca program yang baru diinstal.

### Q4: Mengapa saat login muncul pesan "Email atau kata sandi salah"?
> **Jawaban:** 
> 1. Pastikan Anda sudah menjalankan seluruh skrip **`DATABASE_LENGKAP_SIMPATK.sql`** dan muncul tanda sukses di menu SQL Editor Supabase.
> 2. Pastikan file **`.env.local`** sudah terisi dengan benar (tidak ada spasi di awal atau akhir nilai `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
> 3. Jika baru saja mengubah file `.env.local`, matikan server (`Ctrl + C`) lalu jalankan kembali perintah `npm run dev`.

### Q5: Apakah saya bisa mendaftarkan akun baru untuk staf atau divisi lain?
> **Jawaban:** Tentu saja! Anda bisa masuk sebagai Admin GA (`admin@tps.co.id`), buka menu **Pengelolaan Pengguna** di sidebar kiri, lalu klik tombol **Tambah Pengguna Baru**. Akun yang dibuat akan langsung dapat digunakan untuk login.

---

*SIMPATK — Dikembangkan khusus dengan performa tinggi, tampilan modern responsif, dan keamanan data terintegrasi untuk PT Terminal Petikemas Surabaya.*
