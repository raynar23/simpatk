# 📘 DOKUMENTASI METODOLOGI, TOOLS, & ALUR PEMBUATAN SIMPATK
**Sistem Informasi Manajemen Permintaan & Pengelolaan ATK — PT Terminal Petikemas Surabaya**
*(Disusun sebagai Buku Panduan Teknis & Bahan Penguasaan Materi Sidang / Tugas Akhir / Skripsi)*

---

## 📑 Daftar Isi
1. [Ringkasan Eksekutif & Latar Belakang Proyek](#1-ringkasan-eksekutif--latar-belakang-proyek)
2. [Metodologi Pengembangan Perangkat Lunak (SDLC)](#2-metodologi-pengembangan-perangkat-lunak-sdlc)
3. [Daftar Lengkap Tools & Teknologi (Tech Stack)](#3-daftar-lengkap-tools--teknologi-tech-stack)
4. [Alur & Tahapan Pembuatan Proyek (Step-by-Step)](#4-alur--tahapan-pembuatan-proyek-step-by-step)
5. [Arsitektur Sistem & Perancangan Basis Data (Database Design)](#5-arsitektur-sistem--perancangan-basis-data-database-design)
6. [Alur Proses Bisnis Sistem (Flowchart & Workflow)](#6-alur-proses-bisnis-sistem-flowchart--workflow)
7. [🎓 Kisi-Kisi Pertanyaan & Kunci Jawaban Sidang (FAQ Sidang)](#7--kisi-kisi-pertanyaan--kunci-jawaban-sidang-faq-sidang)

---

## 1. Ringkasan Eksekutif & Latar Belakang Proyek

### 1.1 Identitas Sistem
- **Nama Sistem**: SIMPATK (*Sistem Informasi Manajemen Permintaan dan Pengelolaan Alat Tulis Kantor*)
- **Instansi / Lokasi Studi Kasus**: PT Terminal Petikemas Surabaya (Subholding Pelindo Terminal Petikemas)
- **Pengguna Sistem**:
  1. **Admin General Affairs (GA)**: Pengelola persediaan fisik, penataan rak gudang, verifikator permintaan, pembuat laporan resmi, dan pengelola pengguna.
  2. **Divisi Pemohon (User)**: Seluruh divisi operasional, komersial, teknik, K3, dan administrasi di lingkungan PT Terminal Petikemas Surabaya yang memerlukan pasokan ATK.

### 1.2 Masalah Nyata di Lapangan (*Problem Statement*)
Sebelum adanya sistem SIMPATK:
1. **Pencatatan Konvensional & Risiko Kehilangan Data**: Permintaan ATK masih menggunakan nota kertas (*bon fisik*) atau pesan WhatsApp informal yang rawan tercecer, hilang, atau terselip.
2. **Ketiadaan Transparansi Status Permintaan**: Divisi pemohon tidak mengetahui apakah permintaannya sudah diproses, disetujui, atau barangnya sedang kosong, sehingga sering terjadi konfirmasi berulang kali ke bagian GA.
3. **Risiko *Stock-out* (Barang Habis Tiba-tiba)**: GA sulit memantau barang yang menipis secara *real-time*, sehingga pengadaan barang pengganti sering terlambat dan menghambat operasional dermaga/kantor.
4. **Rekapitulasi Laporan Bulanan Memakan Waktu Lama**: Menjelang tutup buku bulanan/tahunan, staf GA harus merekap tumpukan nota fisik satu per satu ke lembar kerja Excel manual, yang rawan terjadi selisih hitung (*human error*).

### 1.3 Solusi yang Dihadirkan SIMPATK
- Mengintegrasikan seluruh siklus hidup pengelolaan ATK ke dalam satu sistem berbasis web yang cepat, responsif, dan terpusat.
- Menyediakan *warning system* otomatis untuk stok menipis/habis dan penataan rak 1–4.
- Notifikasi lonceng berbasis database per akun pengguna (*real-time*).
- Otomasi pencetakan Berita Acara / Laporan PDF Resmi ber-kop surat PT Terminal Petikemas Surabaya dan ekspor CSV.

---

## 2. Metodologi Pengembangan Perangkat Lunak (SDLC)

> **Catatan Sidang:** Jika dosen penguji menanyakan metode pengembangan apa yang digunakan, Anda dapat menjelaskan bahwa proyek ini dikembangkan menggunakan **Metode SDLC Waterfall (Air Terjun)** yang dimodifikasi dengan pendekatan **Iterative/Prototyping** untuk mengakomodasi kebutuhan spesifik pengguna.

### Tahapan Metode Waterfall yang Diterapkan:

```
[1. Analisis Kebutuhan] ➡️ [2. Perancangan Sistem] ➡️ [3. Implementasi / Coding] ➡️ [4. Pengujian (Testing)] ➡️ [5. Deployment]
```

1. **Analisis Kebutuhan (*Requirements Analysis*)**:
   - Mengidentifikasi kebutuhan fungsional (form permintaan dinamis, kontrol stok rak, verifikasi admin, ekspor laporan, notifikasi lonceng) dan kebutuhan non-fungsional (kecepatan akses, tampilan modern responsif, keamanan data berjenjang).
2. **Perancangan Sistem (*System & Database Design*)**:
   - Merancang Entity Relationship Diagram (ERD) dengan tabel relasional PostgreSQL.
   - Merancang Role-Based Access Control (RBAC) membedakan hak akses Admin GA vs Divisi Pemohon.
   - Membuat *wireframe* dan desain antarmuka (*UI/UX Design*) dengan identitas korporat Pelindo/TPS.
3. **Implementasi (*Implementation & Coding*)**:
   - Penulisan skrip SQL, stored procedure, triggers, dan kebijakan Row Level Security (RLS) di Supabase.
   - Pembangunan komponen antarmuka web modern menggunakan Next.js App Router, TypeScript, dan Tailwind CSS.
4. **Pengujian (*Testing*)**:
   - Melakukan pengujian fungsionalitas menggunakan metode **Black Box Testing** (memastikan validasi form, pengurangan stok atomik, dan perlindungan routing middleware berjalan 100% tanpa celah).
5. **Penerapan & Pemeliharaan (*Deployment & Maintenance*)**:
   - Menerapkan aplikasi ke cloud hosting (Vercel) dan database terkelola (Supabase Cloud Serverless).

---

## 3. Daftar Lengkap Tools & Teknologi (Tech Stack)

Berikut rincian seluruh perangkat lunak, pustaka (*library*), dan teknologi yang digunakan dalam proyek ini:

| Kategori | Nama Tool / Teknologi | Fungsi dalam Proyek SIMPATK |
| :--- | :--- | :--- |
| **Bahasa Pemrograman** | **TypeScript** | Memberikan pengetikan data yang ketat (*Strict Type Safety*) pada kode JavaScript, sehingga mencegah terjadinya bug atau error saat aplikasi dijalankan. |
| **Framework Utama** | **Next.js 15 (App Router)** | Framework React modern terdepan di industri. Menggunakan arsitektur *Server Components* untuk kecepatan memuat data dan *Client Components* untuk interaktivitas pengguna. |
| **Library Antarmuka** | **React 19** | Pustaka dasar untuk membangun antarmuka web modular berbasis komponen (*reusable components*). |
| **Styling & Tampilan** | **Tailwind CSS** | Framework CSS utility-first untuk merancang antarmuka modern yang rapi, cepat, konsisten, dan sangat responsif pada perangkat HP maupun Laptop. |
| **Desain Ikon** | **Lucide React** | Paket ikon modern yang ringan, tajam, dan memiliki visual yang seragam di seluruh halaman aplikasi. |
| **Basis Data (Database)** | **Supabase (PostgreSQL 15)** | Sistem manajemen database relasional (RDBMS) tingkat perusahaan (*enterprise-grade*) berbasis cloud dengan performa tinggi, aman, dan berkapasitas besar. |
| **Otentikasi & Keamanan** | **Supabase Auth & RLS** | Mengelola sesi login pengguna dengan token JWT terenkripsi, dilengkapi *Row Level Security* (RLS) untuk membatasi hak akses data langsung di level database. |
| **Konektivitas Realtime** | **Supabase Realtime (WebSocket)** | Mengirimkan pembaruan data secara langsung tanpa perlu pengguna melakukan *refresh* halaman secara manual. |
| **Visualisasi Data** | **Recharts** | Membuat komponen grafik analitik modern (grafik garis tren volume permintaan dan diagram status pengajuan). |
| **Laporan & Cetak PDF** | **jsPDF & html2canvas** | Menghasilkan dokumen cetak laporan resmi berformat PDF lengkap dengan kop surat resmi PT Terminal Petikemas Surabaya, tabel rekapitulasi, dan kolom tanda tangan pengesahan. |
| **Pengolah Berkas CSV** | **PapaParse** | Mengonversi data database ke format berkas CSV/Excel secara instan untuk kebutuhan pembukuan eksternal. |
| **Lingkungan Kerja (Runtime)** | **Node.js (LTS)** | Lingkungan eksekusi JavaScript di sisi komputer/server lokal. |
| **Manajer Paket** | **npm (*Node Package Manager*)** | Mengelola pengunduhan, pembaruan, dan instalasi dependensi pustaka proyek. |
| **Version Control** | **Git & GitHub** | Melacak riwayat perubahan kode sumber (*commit history*) dan kolaborasi repositori berbasis cloud. |
| **Code Editor** | **Visual Studio Code (VS Code)** | Editor teks kode utama yang dilengkapi ekstensi Tailwind, TypeScript, dan SQL linting. |

---

## 4. Alur & Tahapan Pembuatan Proyek (Step-by-Step)

Jika penguji meminta Anda menceritakan **bagaimana proses pembuatan proyek ini dari nol sampai jadi**, berikut urutan kronologisnya:

```
Langkah 1: Inisialisasi Proyek & Desain Arsitektur
   ⬇️
Langkah 2: Perancangan Skema Database di Supabase
   ⬇️
Langkah 3: Pembuatan Logika Keamanan (RLS) & Stored Procedure (RPC)
   ⬇️
Langkah 4: Pembuatan Sistem Otentikasi & Proteksi Rute (Middleware)
   ⬇️
Langkah 5: Pembangunan Antarmuka Admin GA (Dashboard, Rak, Laporan)
   ⬇️
Langkah 6: Pembangunan Antarmuka Pemohon (Form Fleksibel & Riwayat)
   ⬇️
Langkah 7: Implementasi Notifikasi Lonceng Real-Time Per Akun
   ⬇️
Langkah 8: Pengujian Sistem (Testing) & Penyiapan Dokumentasi Klien
```

### Rincian Tiap Langkah:
1. **Inisialisasi Lingkungan Kerja**:
   - Membangun struktur proyek Next.js dengan App Router dan TypeScript menggunakan perintah `npx create-next-app`.
   - Mengonfigurasi Tailwind CSS dengan variabel warna korporat PT Terminal Petikemas Surabaya (Pelindo Navy `#0B5288`, Cyan Accent `#00A3DA`, dan Slate neutral).
2. **Perancangan Basis Data di Supabase**:
   - Membuat tabel utama: `profiles` (data pengguna dan divisi), `items` (katalog master ATK dan posisi rak), `requests` (transaksi permohonan ATK), dan `user_notification_state` (pencatatan waktu baca lonceng per akun).
   - Menambahkan tipe data ENUM: `app_role` (`admin`, `user`) dan `request_status` (`diproses`, `selesai`).
   - Membuat Sequence otomatis untuk nomor dokumen permintaan dengan format unik: `REQ-YYYY-XXXXX`.
3. **Penerapan Aturan Keamanan Database (RLS)**:
   - Mengaktifkan Row Level Security (RLS) di seluruh tabel:
     - User biasa **hanya bisa membaca dan membuat permohonan miliknya sendiri**.
     - Admin GA memiliki akses *full review* untuk seluruh data persediaan dan transaksi masuk.
   - Membuat fungsi keamanan `is_admin()` berbasis `SECURITY DEFINER` untuk mencegah kebocoran data.
4. **Implementasi Middleware & Otentikasi**:
   - Memasang `src/lib/supabase/middleware.ts` untuk memeriksa sesi aktif di setiap perpindahan halaman:
     - Pengguna yang belum login otomatis diarahkan ke `/login`.
     - Pengguna ber-role `user` diblokir jika mencoba mengakses folder `/admin/*`.
     - Pengguna ber-role `admin` yang mengakses `/user` otomatis dialihkan ke `/admin`.
5. **Pengembangan Modul Admin General Affairs (GA)**:
   - **Dashboard Analitik**: Menampilkan kartu KPI (Total Permintaan, Tingkat Penyelesaian, Barang Menipis, dan Total Nilai Persediaan dalam Rupiah).
   - **Manajemen Persediaan & Rak**: Pengelompokan barang berdasarkan Rak 1 s.d. Rak 4, fitur tambah barang baru, penyesuaian stok (*restock*), dan batas minimum stok.
   - **Verifikasi Permintaan**: Fitur pemeriksaan pengajuan masuk dan tombol serah terima barang yang otomatis memotong stok gudang.
   - **Modul Laporan**: Pemfilteran tanggal, ekspor data CSV, dan generator cetak PDF resmi ber-kop surat PT Terminal Petikemas Surabaya.
   - **Manajemen Akun Pengguna**: Menu pembuatan akun staf divisi baru langsung dari UI.
6. **Pengembangan Modul Divisi Pemohon (User)**:
   - **Form Pengajuan Dinamis**: Pemohon dapat memilih barang rekomendasi katalog ATK atau **menginputkan nama barang secara manual** jika barang belum ada di katalog, serta menentukan satuan sendiri (rim, lusin, buah, pak, kotak, botol, dll).
   - **Tabel Riwayat Mandiri**: Menampilkan daftar pengajuan lengkap dengan status warna (*badge* kuning: *Diproses*, badge hijau: *Selesai*), nomor referensi, tanggal selesai, dan catatan serah terima dari GA.
7. **Implementasi Sistem Notifikasi Lonceng Terpadu**:
   - Dirancang berbasis database pada tabel `user_notification_state`.
   - Admin mendapat notifikasi ketika ada pengajuan baru dari divisi.
   - Pemohon mendapat notifikasi ketika pengajuannya telah diselesaikan oleh Admin GA.
   - Status baca tersimpan permanen di database, sehingga tidak akan hilang atau muncul kembali setelah *refresh*, ganti komputer, maupun *logout-login*.
8. **Pengujian & Bundling Distribusi**:
   - Menguji alur sistem secara menyeluruh (*End-to-End*).
   - Mengemas skrip SQL menjadi berkas All-in-One 1-klik: `DATABASE_LENGKAP_SIMPATK.sql`.
   - Menyusun petunjuk instalasi ramah non-IT pada `PANDUAN_SETUP_CLIENT.md` dan mengemasnya dalam file arsip `.zip`.

---

## 5. Arsitektur Sistem & Perancangan Basis Data (Database Design)

### 5.1 Struktur Tabel Basis Data (ERD)

```
+------------------------------------+          +------------------------------------+
|            auth.users              |          |               items                |
|  (Tabel Bawaan Supabase Auth)      |          |  (Master Katalog ATK & Rak Gudang) |
+------------------------------------+          +------------------------------------+
| id (PK, UUID)                      |          | id (PK, UUID)                      |
| email                              |          | kode (Unique, e.g. ATK-001)        |
| encrypted_password                 |          | nama (Unique)                      |
+-----------------+------------------+          | kategori                           |
                  | 1                           | satuan                             |
                  |                             | stok (Integer >= 0)                |
                  | 1                           | stok_minimum (Integer >= 0)        |
+-----------------v------------------+          | harga_satuan (Integer)             |
|              profiles              |          | rak (Rak 1, Rak 2, Rak 3, Rak 4)   |
|   (Profil Pengguna & Role Akses)   |          | created_at                         |
+------------------------------------+          +-----------------+------------------+
| id (PK, FK -> auth.users.id)       |                            | 1
| role ('admin' / 'user')            |                            |
| nama_divisi (Text)                 |                            |
| email                              |                            | 0..*
| created_at                         |          +-----------------v------------------+
+-----------------+------------------+          |              requests              |
                  | 1                           |       (Transaksi Permintaan)       |
                  |                             +------------------------------------+
                  | 0..*                        | id (PK, UUID)                      |
+-----------------v------------------+          | nomor (Unique, e.g. REQ-2026-00001)|
|      user_notification_state       |          | user_id (FK -> profiles.id)        |
| (Status Waktu Baca Lonceng Akun)   |          | item_id (FK -> items.id, Nullable) |
+------------------------------------+          | nama_barang (Text, Bebas)          |
| user_id (PK, FK -> profiles.id)    |          | satuan (Text, Bebas)               |
| bell_read_at (Timestamptz)         |          | jumlah (Integer > 0)               |
| requests_badge_read_at             |          | keperluan (Text)                   |
| inventory_badge_read_at            |          | status ('diproses' / 'selesai')    |
| updated_at                         |          | catatan_ga (Text)                  |
+------------------------------------+          | created_at (Timestamptz)           |
                                                | completed_at (Timestamptz)         |
                                                +------------------------------------+
```

### 5.2 Hubungan Relasi Antar Tabel:
1. **`auth.users` ke `profiles`**: Relasi **One-to-One (1:1)**. Setiap akun yang terdaftar di sistem otentikasi memiliki tepat satu baris profil yang menentukan nama divisinya dan hak aksesnya (`admin` atau `user`).
2. **`profiles` ke `requests`**: Relasi **One-to-Many (1:N)**. Satu akun divisi pemohon dapat membuat banyak permohonan ATK.
3. **`items` ke `requests`**: Relasi **One-to-Many (1:N)** opsional (*Nullable*). Jika pemohon memilih barang dari katalog, relasi tersambung ke `item_id`. Jika pemohon menginput nama barang khusus secara manual, `item_id` bernilai null dan data tersimpan di kolom `nama_barang`.
4. **`profiles` ke `user_notification_state`**: Relasi **One-to-One (1:1)**. Mencatat riwayat waktu terakhir kali ikon lonceng diklik oleh akun yang bersangkutan.

---

## 6. Alur Proses Bisnis Sistem (Flowchart & Workflow)

Berikut alur kerja operasional permintaan ATK dari hulu ke hilir:

```
[Divisi Pemohon]                          [Sistem SIMPATK]                          [Admin General Affairs]
      |                                          |                                             |
      |--- 1. Login Akun Pemohon --------------->|                                             |
      |--- 2. Isi Form Permintaan ATK ---------->|                                             |
      |    (Input nama, jumlah, keperluan)       |                                             |
      |                                          |--- 3. Generate Nomor REQ-YYYY-XXXXX ------->|
      |                                          |--- 4. Munculkan Notifikasi Lonceng Baru --->|
      |                                          |                                             |
      |                                          |<-- 5. Buka Menu Permintaan Masuk -----------|
      |                                          |<-- 6. Verifikasi & Ambil Barang di Rak -----|
      |                                          |<-- 7. Klik 'Tandai Selesai' + Catatan ------|
      |                                          |                                             |
      |                                          |--- 8. Logika Database Terpicu:              |
      |                                          |      - Stok Gudang Terpotong Otomatis       |
      |                                          |      - Status Ubah ke 'Selesai'             |
      |                                          |      - Catat Tanggal Completed_at           |
      |                                          |                                             |
      |<-- 9. Lonceng Pemohon Menyala Hijau -----|                                             |
      |<-- 10. Ambil Barang di Kantor GA --------|                                             |
      |                                          |                                             |
      |                                          |<-- 11. Cetak Laporan PDF Ber-Kop Surat -----|
```

---

## 7. 🎓 Kisi-Kisi Pertanyaan & Kunci Jawaban Sidang (FAQ Sidang)

> Bagian ini adalah **"contekan cerdas"** jika Anda ditanya oleh dosen penguji atau pembimbing saat sidang:

### Q1: "Kenapa memilih teknologi Next.js dan Supabase? Kenapa tidak menggunakan PHP Native/CodeIgniter/Laravel dan MySQL biasa?"
**Kunci Jawaban:**
> *"Terima kasih atas pertanyaannya, Bapak/Ibu Penguji. Kami memilih Next.js dan Supabase dengan pertimbangan efisiensi dan arsitektur modern:*
> 1. *Next.js menggunakan React Server Components yang memproses render halaman di server sehingga aplikasi sangat cepat dibuka dan ramah perangkat mobile staf di lapangan.*
> 2. *Supabase menyediakan database PostgreSQL tingkat industri yang dilengkapi fitur keamanan Row Level Security (RLS) bawaan. Ini jauh lebih aman karena hak akses data diproteksi langsung di lapisan basis data, bukan hanya di level aplikasi.*
> 3. *Supabase sudah memiliki WebSocket Realtime engine bawaan, sehingga status perubahan permintaan dan notifikasi lonceng langsung terkirim seketika tanpa perlu server polling yang membebani memori server."*

---

### Q2: "Bagaimana Anda menjamin keamanan data? Apakah akun pemohon bisa mengintip data divisi lain atau memanipulasi stok admin?"
**Kunci Jawaban:**
> *"Keamanan sistem SIMPATK dilindungi melalui 3 lapis perlindungan (Defense-in-Depth):*
> 1. ***Lapis 1 (Middleware Otentikasi)***: Menggunakan token JWT terenkripsi. Seseorang yang mencoba langsung mengetikkan URL `/admin` di browser akan otomatis dicegat dan ditolak oleh middleware jika rolenya adalah `user`.*
> 2. ***Lapis 2 (Row Level Security / RLS di Database)***: Pada tabel `requests`, kami memasang aturan kebijakan SQL di mana pengguna hanya diizinkan menjalankan `SELECT` pada baris data yang memiliki `user_id = auth.uid()`. Artinya, secara arsitektur database, pengguna sama sekali tidak memiliki akses fisik untuk membaca data milik akun lain.*
> 3. ***Lapis 3 (Atomisitas Manipulasi Stok)***: Pengguna pemohon tidak memiliki hak izin UPDATE atau DELETE sama sekali terhadap tabel persediaan (`items`). Perubahan stok hanya bisa dieksekusi oleh Admin GA melalui fungsi aman `tandai_selesai` yang terdaftar sebagai Stored Procedure di database."*

---

### Q3: "Bagaimana cara sistem menangani jika barang yang diminta pemohon tidak ada di daftar katalog gudang?"
**Kunci Jawaban:**
> *"Pada form permohonan ATK, kami merancang fleksibilitas input:*
> - *Jika barang merupakan stok umum, pemohon dapat memilih dari rekomendasi katalog 24 item.*
> - *Namun jika divisi membutuhkan barang khusus (misalnya tinta plotter spesifik atau map audit khusus), pemohon dapat **mengetikkan nama barang secara manual** dan menentukan satuan kebutuhannya sendiri.*
> - *Sistem akan mencatatnya di kolom `nama_barang`. Saat Admin GA menerima permohonan tersebut, Admin dapat memverifikasi ketersediaannya atau melakukan pengadaan khusus tanpa terhambat oleh validasi kaku sistem lama."*

---

### Q4: "Bagaimana sistem menjaga agar stok barang di gudang tidak menjadi minus (angka negatif)?"
**Kunci Jawaban:**
> *"Kami memasang aturan integritas data ganda (*Double Layer Integrity Check*):*
> 1. *Di tingkat database PostgreSQL, kami menambahkan **CHECK constraint** pada kolom stok: `check (stok >= 0)`. PostgreSQL akan menolak secara otomatis setiap transaksi yang menyebabkan hasil stok di bawah angka nol.*
> 2. *Di tingkat logika aplikasi, sebelum Admin menyelesaikan permintaan, sistem melakukan validasi apakah jumlah barang yang diminta melebihi sisa stok di rak. Jika stok kurang, sistem akan menampilkan notifikasi peringatan agar Admin melakukan penyesuaian stok (restock) terlebih dahulu."*

---

### Q5: "Apa manfaat konkret sistem ini bagi PT Terminal Petikemas Surabaya?"
**Kunci Jawaban:**
> *"Secara operasional, SIMPATK memberikan 4 dampak positif nyata:*
> 1. ***Paperless & Ramah Lingkungan***: Mengeliminasi penggunaan bon/kertas pengajuan fisik.*
> 2. ***Efisiensi Waktu Rekapitulasi***: Pembuatan laporan bulanan yang sebelumnya memakan waktu berhari-hari kini selesai dalam 1 klik melalui fitur cetak PDF resmi dan ekspor CSV.*
> 3. ***Mencegah Keterlambatan Pengadaan***: Fitur deteksi stok menipis (status warna merah) memberi peringatan dini kepada GA sebelum stok barang habis total.*
> 4. ***Peningkatan Tata Kelola Gudang***: Fitur penempatan Rak 1 hingga Rak 4 mempercepat staf logistik GA dalam menemukan posisi fisik barang di gudang saat proses serah terima."*

---

*Dokumen ini disusun untuk melengkapi berkas teknis, laporan tugas akhir/skripsi, dan persiapan sidang sistem SIMPATK PT Terminal Petikemas Surabaya.*
