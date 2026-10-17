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

## Icon
- Satu set saja: Lucide, stroke 1.5, ukuran 16 atau 18px, warna ikut teks. Tanpa emoji di mana pun.
- Icon hanya sebagai pendamping label atau navigasi, tidak dibuat dekoratif besar dengan latar berwarna.

## Interaksi dan Gerak
- Transisi 120 sampai 180ms, easing ease-out. Tidak ada animasi mantul, scale berlebihan, glow, atau efek hover mencolok.
- Kursor standar. Gunakan cursor pointer hanya pada elemen yang benar-benar dapat diklik.
- Wajib ada: loading skeleton tipis, empty state rapi tanpa ilustrasi kartun, toast konfirmasi sederhana, validasi form jelas, fokus keyboard terlihat.

## Ciri AI Slop yang Dihindari
Radius terlalu besar, kartu bersusun dengan bayangan tebal, gradien dekoratif, glassmorphism berlebihan, emoji sebagai ikon, ilustrasi generik, hero besar bertulisan slogan, teks pemanis berlebihan, badge bergradasi, animasi masuk di semua elemen, pointer atau titik status artifisial (dot indicator / AI slop), kotak ikon berwarna di KPI card.

## Teks & Bahasa
Seluruh antarmuka menggunakan Bahasa Inggris profesional, baku, dan singkat. Contoh label: "Submit Request", "Mark as Completed", "Add Stock", "Deduct Stock", "Low Stock", "Out of Stock", "Login", "Dashboard", "Inventory", "Requests", "Shopping List", "Reports", "Settings". Aturan ini berlaku untuk semua tombol, dialog, tabel, filter, dan pesan sistem.

## App Shell & Navigasi (100dvh)
- App shell tinggi 100dvh tanpa scroll halaman (overflow-hidden); hanya panel tertentu yang boleh scroll internal (overflow-y-auto). Dirancang untuk viewport minimal 1280x680; di bawah 640px tinggi layar, izinkan scroll halaman sebagai cadangan agar konten tidak terpotong.
- Sidebar (Admin dan User memakai komponen yang sama):
  - Desktop (lg+): 232px saat terbuka, dapat diciutkan menjadi 64px (ikon saja dengan tooltip) lewat tombol PanelLeft di toolbar dan shortcut Ctrl/Cmd+B. Status disimpan di localStorage (try/catch), transisi 180ms.
  - Mobile (< lg): drawer dari kiri (280px, overlay redup, tutup lewat tombol, ESC, ketuk overlay, atau pindah halaman, fokus terjaga, scroll body dikunci), dibuka dari tombol hamburger di toolbar.
  - Tab bar bawah HP telah DIHAPUS.
- Toolbar atas (52px): toggle sidebar (PanelLeft / hamburger), judul/breadcrumb, pencarian cepat (Ctrl/Cmd+K membuka command palette: pindah halaman, cari barang, cari nomor permintaan), ikon notifikasi dengan jumlah kejadian realtime (5 riwayat terbaru), menu akun (nama divisi, peran, Settings, Logout).

## Halaman Login
- Struktur: Layar terbagi dua pada laptop (lg, 1024px ke atas). Sisi kiri foto terminal penuh (full-bleed, 0 padding, 0 margin ke tepi layar) dengan bayangan samping (side drop shadow) yang jatuh ke area kanan. Sisi kanan area form dengan latar lembut #F8FAFC.
- Panel Foto: Foto /images/tps-terminal.jpg mengisi penuh tinggi layar (100dvh) dengan object-cover dan object-position 62% 50%. Overlay bertingkat (solid primary-dark 25% + gradien hitam halus). Tag General Affairs, judul "SIMPATK" (36px), deskripsi dalam bahasa Inggris, serta indikator fitur (Automated Workflow, Realtime Physical Stock, 100% Paperless).
- Area Form: Terpusat secara vertikal dan horizontal. Spasi lega (mb-9) antara logo Pelindo TPS dan judul "Login". Form input Email Address dan Password dengan ikon pendamping. Tombol submit berlabel "Login". Footer dinamis menggunakan tahun berjalan `new Date().getFullYear()`.
- Error Banner: Latar danger-soft, teks danger, icon AlertCircle 16px, aria-live="polite", layout stabil tanpa melompat.
- Tablet dan HP (< lg): Panel foto disembunyikan. Form tampil penuh dengan logo berwarna di atas, padding aman safe-area.

