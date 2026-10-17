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
- Ukuran dasar 14px, tabel 13px, judul halaman 22px semi-bold, judul bagian 15px semi-bold. Teks kecil minimal 12px.
- Gunakan `font-variant-numeric: tabular-nums` untuk angka stok dan jumlah.
- Tanpa huruf kapital semua untuk judul; letter-spacing normal (judul besar boleh -0.01em).

## Bentuk dan Jarak
- Radius: kartu dan panel 10px, tombol dan input 8px, badge 6px. Maksimal 12px. Tidak ada bentuk pil kecuali segmented control.
- Garis tipis 1px `border`. Bayangan sangat halus (`0 1px 2px rgba(0,0,0,0.06)`), tanpa bayangan besar.
- Skala jarak 4px (4, 8, 12, 16, 24, 32). Padding kartu 16 sampai 20px.
- Tinggi kontrol (tombol, input) 32 sampai 36px.

## Layout (gaya Mac)
- Layar lebar: sidebar kiri 232px (biru gelap `primary-dark` dengan logo putih, atau abu muda ala Finder), konten di kanan dengan toolbar atas tipis (judul halaman, pencarian, tindakan).
- Item sidebar aktif: latar `primary-soft` atau putih transparan 12%, bukan blok warna tebal.
- Tabel gaya daftar macOS: header kecil abu, baris dengan garis pemisah tipis, tanpa zebra mencolok, hover baris sangat halus.
- Form dalam grup bergaya iOS (label kiri/atas, input bersih, fokus cincin biru 2px).
- Dialog (Tambah Stok, Kurangi Stok, Tambah Barang) gaya sheet: tengah layar, latar redup, radius 12px.
- Layar kecil: sidebar menjadi tab bar bawah bergaya iOS.
- Status memakai badge kecil dengan titik warna: Diproses (kuning tua), Selesai (hijau). Stok menipis: badge dan baris merah lembut dengan teks `danger`.

## Icon
- Satu set saja: Lucide, stroke 1.5, ukuran 16 atau 18px, warna ikut teks. Tanpa emoji di mana pun (UI, teks, toast, data seed, komentar).
- Icon hanya sebagai pendamping label, tidak dibuat dekoratif besar.

## Interaksi dan Gerak
- Transisi 120 sampai 180ms, easing ease-out. Tidak ada animasi mantul, scale berlebihan, glow, atau efek hover mencolok.
- Kursor standar. Gunakan cursor pointer hanya pada elemen yang benar-benar dapat diklik, tanpa efek tambahan.
- Wajib ada: loading skeleton tipis, empty state yang rapi (teks singkat, tanpa ilustrasi kartun), toast konfirmasi sederhana, validasi form jelas, fokus keyboard terlihat.

## Ciri AI Slop yang Dihindari
Radius terlalu besar, kartu bersusun dengan bayangan tebal, gradien dekoratif, glassmorphism berlebihan, emoji sebagai ikon, ilustrasi generik, hero besar bertulisan slogan, teks pemanis berlebihan, badge bergradasi, animasi masuk di semua elemen.

## Teks
Bahasa Indonesia baku, singkat, to the point. Contoh label: "Kirim Permintaan", "Tandai Selesai", "Tambah Stok", "Kurangi Stok", "Stok Menipis".

## Responsif (laptop dan mobile sama pentingnya)
- Pendekatan mobile-first. Breakpoint Tailwind: dasar (di bawah 640px, HP), sm 640, md 768, lg 1024 (laptop), xl 1280. Konten dibatasi lebar maksimal 1200px dan berada di tengah pada layar lebar.
- Navigasi: lg ke atas memakai sidebar kiri 232px. Di bawah lg, sidebar disembunyikan. Admin memakai tab bar bawah bergaya iOS (Dashboard, Permintaan, Persediaan) dengan padding safe-area (env(safe-area-inset-bottom)). User hanya punya satu halaman, jadi memakai bar atas sederhana berisi logo dan menu akun (Keluar), tanpa tab bar.
- Tabel: md ke atas tampil sebagai tabel. Di bawah md, setiap baris menjadi kartu daftar ringkas (baris judul: barang dan status, baris bawah: jumlah, divisi, tanggal, tombol aksi). Dilarang scroll horizontal pada halaman maupun tabel di HP.
- Dialog: md ke atas dialog di tengah layar. Di bawah md menjadi bottom sheet (menempel di bawah, lebar penuh, radius atas 12px, tinggi maksimal 90dvh, bisa di-scroll, tombol aksi tetap terlihat).
- Kontrol sentuh: di HP tinggi tombol dan input minimal 44px dan ukuran font input 16px (mencegah zoom otomatis di iOS). Di laptop tetap 32 sampai 36px sesuai DESIGN.md.
- Grid: StatTile 1 kolom di HP, 3 kolom mulai sm. Toolbar halaman (pencarian, tombol, SegmentedControl) disusun menumpuk di HP, SegmentedControl lebar penuh. Form user satu kolom di HP, dua kolom (Jumlah dan Keperluan) boleh mulai md.
- Panel login: panel biru kiri hanya tampil mulai lg; di bawah itu hanya form dengan logo berwarna di atas.
- Teknis: meta viewport yang benar, gunakan dvh bukan vh untuk tinggi layar penuh, tidak ada elemen yang melebihi lebar layar, teks tidak terpotong, jarak antar elemen tetap lega di 360px.
- Verifikasi: setiap halaman diperiksa di lebar 360, 390, 768, 1024, dan 1440px (gunakan browser bila tersedia) sebelum tahap dinyatakan selesai. Laporkan hasilnya singkat.

## Halaman Login
- Struktur: Layar terbagi dua pada laptop (lg, 1024px ke atas). Sisi kiri foto terminal penuh (full-bleed, 0 padding, 0 margin ke tepi layar) dengan bayangan samping (side drop shadow) yang jatuh ke area kanan untuk kedalaman visual yang kuat. Sisi kanan area form dengan latar lembut #F8FAFC.
- Panel Foto: Foto /images/tps-terminal.jpg mengisi penuh tinggi layar (100dvh) dengan object-cover dan object-position 62% 50%. Overlay bertingkat (solid primary-dark 25% + gradien hitam halus di atas dan bawah) sehingga warna asli derek kuning dan langit tetap menyala. Panel memiliki z-20 dengan drop shadow samping (14px 0 40px rgba(0,0,0,0.18)) dan border pembatas halus. Kiri atas: logo monokrom putih TPS Surabaya. Kiri bawah: tag General Affairs, judul "SIMPATK" (36px), deskripsi 14px, serta indikator fitur (Otomatisasi Disetujui, Stok Fisik Realtime, 100% Paperless).
- Area Form: Terpusat secara vertikal dan horizontal. Menggunakan kartu terangkat modern (radius 12px, border 1px border-border, bayangan elevasi dan bayangan samping berlapis [0 20px 50px -12px rgba(15,23,42,0.10), -8px 0 24px -6px rgba(17,117,187,0.08)], garis aksen gradien biru Pelindo di bagian atas kartu). Header kartu menampilkan logo berwarna Pelindo, judul "Masuk ke Akun", dan subjudul informatif.
- Kontrol Input & Tombol: Input email dan kata sandi bersih dan terfokus, dilengkapi icon pendamping (Mail, Lock) di sisi kiri, toggle intip (Eye/EyeOff) di sisi kanan, serta ring fokus biru 2px. Tombol "Masuk ke Sistem" tampil menonjol dengan bayangan aksen biru Pelindo (shadow-[0_4px_14px_rgba(17,117,187,0.30)]), transisi aktif, dan indikator loader animasi saat proses masuk.
- Widget Verifikasi Kedinasan: Bagian bawah kartu dilengkapi widget verifikasi keamanan kedinasan (icon ShieldCheck dalam lingkaran biru lembut, label "Portal Resmi Kedinasan", sublabel "General Affairs • Pelindo TPS", serta badge status "Terverifikasi" berlatar hijau lembut dengan titik berdenyut).
- Error Banner: Latar danger-soft, teks danger, icon AlertCircle 16px, aria-live="polite", layout stabil tanpa melompat.
- Footer Form: Teks kecil rata tengah di dasar form (12px text-muted): "General Affairs • PT Pelindo Terminal Petikemas © 2025".
- Tablet dan HP (< lg): Panel foto disembunyikan. Form tampil penuh dengan logo berwarna di atas, padding aman safe-area.

