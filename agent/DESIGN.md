# DESIGN - Gaya Visual

Acuan utama: antarmuka aplikasi macOS / iOS yang profesional (tenang, rapi, padat informasi, hierarki jelas). Bukan tampilan template AI.

## Warna
Biru khas Pelindo sebagai warna utama. Nilai di bawah diperkirakan dari logo; cocokkan dengan logo yang disediakan jika ada selisih.

| Token | Nilai | Pemakaian |
|---|---|---|
| primary | #1175BB | Tombol utama, link, item aktif |
| primary-dark | #0B5A94 | Hover/pressed, panel sidebar gelap |
| primary-soft | #E8F2FA | Latar item aktif, badge info |
| accent | #E08F26 | Dipakai sangat hemat (aksen kecil), warna oranye logo |
| bg | #F5F5F7 | Latar halaman |
| surface | #FFFFFF | Kartu, tabel, form |
| border | #E5E5EA | Garis tipis 1px |
| text | #1D1D1F | Teks utama |
| text-muted | #6E6E73 | Teks sekunder |
| danger | #D70015 | Stok menipis |
| danger-soft | #FDECEE | Latar baris/badge stok menipis |
| success | #1E8E3E | Status Selesai |
| warning | #B26A00 | Status Diproses |

Dilarang: gradien ungu/pink/neon, gradien dekoratif, warna glow, bayangan berwarna.

## Logo
- Latar terang (halaman login, header terang): logo berwarna **Pelindo Terminal Petikemas**.
- Latar biru gelap (sidebar atau panel login): logo **monokrom putih TPS Surabaya**.
- Logo HUT-27 TPS tidak dipakai (khusus perayaan).
- Jangan ubah proporsi, warna, atau beri efek pada logo. Beri ruang kosong di sekelilingnya.

## Tipografi
- Font: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", sans-serif`. Perangkat Apple memakai SF Pro, perangkat lain memakai Inter.
- Muat Inter lewat `next/font` (self-host), bobot 400, 500, 600.
- Tipografi rapat ala macOS: ukuran dasar 13px, tinggi baris tabel 40px, judul halaman 20px semi-bold, judul bagian 14px semi-bold, label 12px.
- Gunakan `font-variant-numeric: tabular-nums` untuk semua angka stok, jumlah, dan nilai keuangan.
- Tanpa huruf kapital semua untuk judul; letter-spacing normal (judul besar boleh -0.01em).

## Bentuk, Panel, dan Bayangan
- Radius: kartu dan panel 10px, tombol dan input 8px, badge 6px. Maksimal 12px. Tidak ada bentuk pil kecuali segmented control.
- Kartu & Panel: border 1px `border-border`, TANPA bayangan (bayangan hanya untuk dialog dan dropdown). Pemisah memakai garis tipis; susun konten seperti panel macOS (header panel kecil, garis pemisah tipis), bukan kartu bertumpuk.
- Ikon KPI & Header: TANPA kotak ikon berwarna. Ikon polos 16px warna muted tanpa latar.
- Skala jarak 4px (4, 8, 12, 16, 20, 24). Padding kartu 14 sampai 16px.
- Tinggi kontrol (tombol, input) 32 sampai 36px.

## Status & Badge
- Status memakai badge teks saja tanpa titik/pointer artifisial:
  - In Progress (diproses): kuning tua (#9A5B00), latar tint (#FFF8E6), border (#FFE2A4), radius 6px, 12px medium.
  - Completed (selesai): hijau (#1E8E3E), latar tint (#EBF7EE), border (#C8E9D0).
  - Low Stock (menipis): merah (#D70015), latar tint (#FDECEE), border danger/20.
  - Out of Stock (habis): merah tua (#9B0010), latar tint (#FBE8EA), border (#F2C2C6).
  - In Stock (aman): teks abu (#6E6E73) tanpa badge.

## Icon Whitelist (Anti AI Slop)
Ikon hanya diperbolehkan untuk elemen fungsional berikut:
1. Item navigasi sidebar.
2. Aksi toolbar (pencarian, notifikasi, menu akun).
3. Tombol aksi (Cetak, Ekspor, Tambah/Kurangi/Ubah Stok, tampilkan/sembunyikan kata sandi).
4. Panah tren KPI (`TrendingUp`, `TrendingDown`, `Minus`).

Dilarang keras memakai ikon pada:
- Judul halaman dan subjudul.
- Kartu KPI (tanpa ikon di sudut maupun kotak ikon).
- Header kartu / panel.
- Label tab / segmented control.
- Prefiks field input (tanpa Mail, Lock, Search di dalam field form biasa).
- Alert, info box, atau callout.
- Ikon dekoratif lainnya.

## Interaksi dan Gerak
- Transisi 120 sampai 180ms, easing ease-out. Tidak ada animasi mantul, scale berlebihan, glow, atau efek hover mencolok.
- Kursor standar. Gunakan cursor pointer hanya pada elemen yang benar-benar dapat diklik.
- Wajib ada: loading skeleton tipis, empty state rapi tanpa ilustrasi kartun, toast konfirmasi sederhana, validasi form jelas, fokus keyboard terlihat.

## Ciri AI Slop yang Dihindari
Radius terlalu besar (>12px), kartu bersusun dengan bayangan tebal, gradien dekoratif, glassmorphism berlebihan, emoji sebagai ikon, ilustrasi generik, hero besar bertulisan slogan, teks pemanis berlebihan, badge bergradasi, animasi masuk di semua elemen, pointer atau titik status artifisial (dot indicator / AI slop), kotak ikon berwarna di KPI card, penumpukan ikon di header/tab/input.

## Teks, Bahasa, dan Format Internasionalisasi
- Seluruh antarmuka menggunakan Bahasa Indonesia yang formal, baku, dan singkat sesuai PRD.md.
- Komentar kode ditulis dalam Bahasa Inggris singkat. Dilarang menggunakan emoji sama sekali.
- Pencegahan hydration error: root layout wajib `<html lang="id" translate="no">`.
- Semua format tanggal dan angka menggunakan `Intl` dengan locale `id-ID` dan `timeZone: 'Asia/Jakarta'` secara eksplisit agar output SSR server dan client identik.
- Satuan durasi seragam: waktu < 48 jam ditampilkan dalam jam (`X jam`), sedangkan >= 48 jam ditampilkan dalam hari dengan 1 desimal (`X.X hari`).
- Definisi status persediaan seragam:
  - Stok Menipis: `stok <= stok_minimum` (mencakup barang yang stoknya 0).
  - Stok Habis: `stok === 0`.
  - Pesan untuk barang habis di sisi user: "Permintaan tetap diterima".

## App Shell, Viewport, dan 100dvh (Zero Page Scroll)
- Target Viewport:
  - Utama: 1190x670 (laptop standar dengan toolbar browser).
  - Standar lain: 1366x680, 1440x800, dan 1920x950.
- Aturan 100dvh Zero Page Scroll (layar desktop lg+):
  - Shell `h-dvh max-h-dvh overflow-hidden`.
  - Area konten `flex-1 min-h-0 flex flex-col overflow-hidden`.
  - Halaman desktop lg+ TIDAK BOLEH memiliki vertical scrollbar pada halaman. DataTable mengisi sisa ruang vertikal (`flex-1 min-h-0`) dengan perhitungan baris otomatis (dynamic height / ResizeObserver, minimum 5 baris) dilengkapi pagination.
  - Cadangan mobile / layar sempit: di bawah tinggi 600px atau layar mobile (< lg), halaman diizinkan scroll internal (`overflow-y-auto`).

## Kontainer Halaman Seragam (PageContainer)
- Semua halaman (Admin dan User) wajib dibungkus komponen `PageContainer`.
- Lebar 100% area konten, padding horizontal 24px (`px-6`), lebar maksimal 1360px (`max-w-[1360px] mx-auto`).
- Header halaman seragam: tinggi tetap 56px (`h-14`), judul 20px semi-bold (`text-xl font-semibold`), subjudul 1 baris (`text-xs text-text-muted truncate`), dan slot aksi di sebelah kanan.
- Tidak ada halaman yang menetapkan `max-width` atau padding luar sendiri.

## Sidebar & Pencarian
- Lebar 264px saat terbuka, dapat diciutkan menjadi 72px (ikon saja).
- Logo Pelindo TPS Surabaya lebih besar (tinggi sekitar 40px).
- Tombol buka-tutup (ChevronsLeft / ChevronsRight) berada DI DALAM sidebar header di samping logo dengan tooltip "Ciutkan sidebar (Ctrl/Cmd+B)". Tidak ada tombol toggle sidebar di toolbar desktop.
- **Pencarian Cepat (Command Palette Trigger)**: Ditempatkan di dalam sidebar tepat di bawah header logo Pelindo dan di atas label grup `UTAMA`. Pada mode lebar (264px) menampilkan input tombol "Cari atau pindah ke... ⌘K", dan pada mode ciut (72px) menampilkan ikon pencarian dengan tooltip. Toolbar atas tidak memuat bar pencarian.
- Pada mobile (< lg), tombol hamburger di toolbar membuka drawer; drawer memuat tombol pencarian dan tombol tutup.
- Navigasi dikelompokkan dengan label teks kecil uppercase (jarak antar grup 20px):
  - `UTAMA`: Dashboard
  - `OPERASIONAL`: Permintaan, Persediaan, Daftar Belanja
  - `ANALISIS`: Laporan
  - `AKUN`: Pengguna (admin), Pengaturan
- Indikator data pada menu sidebar: angka kecil polos rata kanan tanpa bentuk pil (jumlah permintaan "Diproses" pada Permintaan, jumlah stok menipis dengan teks merah pada Persediaan).
- Bagian bawah sidebar: kartu profil akun elegan (`bg-white/[0.07] border border-white/10 rounded-card p-2.5`) dengan avatar circle (`w-8 h-8 rounded-full bg-white/20`) memuat ikon `User`, nama divisi, dan peran pengguna, serta tombol "Keluar". Teks versi dihapus dari sidebar footer agar rapi dan tidak bertabrakan dengan indikator dev browser di sudut kiri bawah.

## Dashboard Admin (3 Grafik, Filter Waktu Luas & 100vh)
- Header memuat SegmentedControl: `Ringkasan | Aktivitas`.
- Filter Waktu Luas & Kalender Interaktif:
  - Tombol Preset Cepat: `7 Hari`, `30 Hari`, `6 Bulan`, `1 Tahun`.
  - Tombol Navigasi Rentang: Mundur 1 periode (`ChevronLeft`) dan Maju 1 periode (`ChevronRight`).
  - Tombol Kalender: Menampilkan rentang aktif (misal `19 Sep 2026 – 18 Okt 2026`), jika diklik membuka modal Dialog "Pilih Rentang Tanggal" dengan opsi pintasan cepat, pemilih tanggal mulai (`Tanggal Mulai`) dan selesai (`Tanggal Selesai`), serta preview durasi.
  - **Sinkronisasi 100% Penuh**: Setiap kali filter diterapkan (preset, navigasi mundur/maju, maupun rentang kustom), seluruh 5 kartu KPI dan ketiga grafik chart secara ketat menghitung ulang dan menampilkan data sesuai periode yang dipilih.
- Tab Ringkasan memuat 5 KPI ringkas dan 3 grafik yang tertata rapi dalam 100vh:
  - **Baris 1**: Dua grafik berdampingan (`grid grid-cols-1 lg:grid-cols-2 gap-3`):
    1. **Tren Permintaan**: LineChart dengan bucketing adaptif (harian untuk <= 10 hari, per 3 hari untuk <= 35 hari, mingguan untuk <= 90 hari, dan bulanan untuk 6 bulan / 1 tahun; periode ini `#1175BB`, periode lalu garis putus-putus abu-abu `#94A3B8`).
    2. **Status Permintaan**: Pie/Donut Chart (Selesai `#1175BB`, Diproses `#9CC9EA`), total transaksi periode di tengah, legenda dengan jumlah transaksi dan persentase yang identik dengan KPI.
  - **Baris 2**: Satu grafik full 1 baris (`w-full`):
    3. **Top 5 Barang Paling Diminta**: BarChart horizontal 1 baris penuh, dengan akumulasi kuantitas barang yang diminta pada periode terpilih, nama barang tampil utuh tanpa terpotong.
- Tab Aktivitas: dua panel DataTable dengan pagination independen (Permintaan Terbaru & Barang Stok Menipis).
- Seluruh halaman Dashboard tetap pas dalam viewport 100vh tanpa scroll halaman vertikal pada desktop lg+.

## Halaman Pengguna & Pengaturan
- **Pengelolaan Pengguna (`/admin/pengguna`)**:
  - Halaman untuk Administrator GA mengelola akun divisi pemohon dan kredensial hak akses.
  - Memuat 3 metrik mini (Total Pengguna, Divisi Pemohon, Administrator GA).
  - Search bar & filter peran (Semua, Divisi Pemohon, Admin GA).
  - `DataTable` berpaginasi dinamis (100dvh compliance) memuat daftar divisi, email, peran, dan waktu pendaftaran.
  - Modal Tambah Pengguna Baru: Nama divisi, email `@tps.co.id`, kata sandi awal, dan peran sistem.
- **Pengaturan (`/admin/pengaturan`)**:
  - Tampilan penuh dan padat dalam grid 2 kolom:
    - Kolom Kiri: Profil Akun Admin GA dan Ringkasan Akun Pengguna (dengan tombol cepat "Buka Pengelolaan Pengguna").
    - Kolom Kanan: Formulir Ganti Kata Sandi dan Konfigurasi Lingkungan Sistem (WIB Asia/Jakarta, locale id-ID, RLS Definer).
- **Penempatan Versi Sistem**:
  - Teks versi ("SIMPATK Versi 2.0" / "Versi 2.0") wajib ditempatkan di posisi paling bawah (`mt-auto`) pada setiap halaman dan sidebar footer, tidak boleh mengambang di tengah layar.
- **Daftar Belanja**: Logo dan judul dokumen dinonaktifkan di layar (`hidden print:flex`), hanya muncul pada saat dicetak (print stylesheet).

## Halaman Laporan Operasional (/admin/laporan)
- Terdiri atas 4 modul pelaporan mandiri yang terpisah dan interaktif:
  1. **Riwayat Transaksi Permintaan**: Buku besar transaksi detail dengan nomor tiket, waktu pengajuan, divisi pemohon, nama & kode barang, kuantitas, status, durasi pengerjaan, dan tombol modal "Lihat Laporan".
  2. **Rekapitulasi Periode & Kinerja**: Agregasi performa pemenuhan tiket per bulan, persentase penyelesaian, rata-rata durasi pengerjaan, total unit terdistribusi, dan modal inspeksi rincian bulan.
  3. **Konsumsi & Distribusi Barang**: Akumulasi kuantitas unit diminta per item ATK, frekuensi tiket, rata-rata per pengajuan, dan estimasi nilai distribusi (Rp).
  4. **Posisi Persediaan Fisik**: Audit saldo fisik inventaris, batas aman minimum, status stok (Aman/Menipis/Habis), harga satuan, dan estimasi valuasi fisik (Rp).
- Filter Waktu Luas: Mendukung pilihan preset `7 Hari`, `30 Hari`, `6 Bulan`, `1 Tahun`, `2 Tahun`, navigasi rentang mundur/maju, serta pemilih kalender tanggal kustom (`Asia/Jakarta`).
- Setiap jenis laporan dilengkapi kartu metrik ringkasan mini, tabel terpaginasi dinamis, tombol modal "Lihat Laporan", dan tombol aksi "Unduh CSV" mandiri untuk ekspor data langsung ke Excel.

## Halaman Login
- Struktur: Layar terbagi dua pada laptop (lg, 1024px ke atas). Sisi kiri foto terminal penuh (full-bleed, 0 padding, 0 margin ke tepi layar) dengan bayangan samping (side drop shadow) yang jatuh ke area kanan. Sisi kanan area form dengan latar lembut #F8FAFC.
- Panel Foto: Foto /images/tps-terminal.jpg mengisi penuh tinggi layar (100dvh) dengan object-cover dan object-position 62% 50%. Overlay bertingkat (solid primary-dark 25% + gradien hitam halus). Tag General Affairs, judul "SIMPATK" (36px), deskripsi dalam Bahasa Indonesia, serta pilar utama (Otomatis, Persediaan Fisik Realtime, 100% Nirkertas).
- Area Form: Terpusat vertikal dan horizontal. Spasi lega (mb-9) antara logo Pelindo TPS dan judul "Login". Form input Alamat Email dan Kata Sandi tanpa ikon prefiks di dalam input. Tombol submit "Login". Footer dinamis "SIMPATK Versi 2.0".
- Error Banner: Latar danger-soft, teks danger, tanpa ikon, aria-live="polite", layout stabil tanpa melompat.
- Tablet dan HP (< lg): Panel foto disembunyikan. Form tampil penuh dengan logo berwarna di atas, padding aman safe-area.

