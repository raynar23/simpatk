# PRD - Sistem Permintaan ATK (GA)

## Tujuan
Website internal untuk divisi mengajukan permintaan ATK ke General Affairs (GA), dan untuk GA mengelola permintaan serta persediaan ATK. Dipakai untuk demo sidang dan dapat diakses publik.

## Pengguna (hanya 2 akun)
| Role | Akun | Keterangan |
|---|---|---|
| Admin GA | 1 akun | Mengelola permintaan dan stok |
| User Divisi A | 1 akun | Mengajukan permintaan. 1 divisi = 1 akun |

Tidak ada fitur daftar akun. Akun dibuat manual atau lewat seed. Bahasa antarmuka: Indonesia.

## Alur Utama
1. Login. Sistem mengarahkan ke dashboard sesuai role.
2. User mengisi form: ATK (pilih dari daftar barang), Jumlah, Keperluan, lalu Kirim Permintaan.
3. Permintaan langsung berstatus **Diproses** dan masuk ke dashboard Admin GA (tanpa refresh halaman).
4. Setelah barang diantar, Admin GA menekan **Tandai Selesai**. Status menjadi **Selesai**.

## Aturan Bisnis (final, jangan diubah agent)
- Semua permintaan otomatis disetujui. Tidak ada approval atasan, tidak ada penolakan, tidak ada status Ditolak.
- Tidak ada batas jumlah permintaan.
- Hanya dua status: `diproses` dan `selesai`.
- Stok 100% manual dan terpisah dari status permintaan. Menandai Selesai TIDAK mengubah stok.
- Tambah Stok dipakai saat pembelian. Kurangi Stok dipakai saat barang diberikan ke divisi.
- Tidak ada riwayat perubahan stok.
- Tidak ada fitur lokasi/penempatan barang.
- Stok menipis: setiap barang punya `stok_minimum`. Jika `stok <= stok_minimum`, tampilkan merah.

## Fitur Admin GA
- Dashboard: ringkasan jumlah permintaan Diproses, total jenis barang, jumlah barang stok menipis; daftar permintaan terbaru.
- Permintaan: tabel permintaan masuk (tanggal, divisi, barang, jumlah, keperluan, status), filter status, tombol Tandai Selesai.
- Persediaan: tabel barang (nama, satuan, stok, stok minimum, status stok), pencarian, tombol Tambah Stok dan Kurangi Stok per barang, tombol Tambah Barang Baru (nama, satuan, stok awal, stok minimum).
- Kurangi Stok tidak boleh membuat stok negatif.

## Fitur User Divisi
- Dashboard: form permintaan dan daftar permintaan milik sendiri dengan status.
- Hanya melihat permintaan milik akunnya sendiri.

## Di Luar Cakupan
Approval berjenjang, penolakan, limit, riwayat stok, lokasi barang, registrasi, notifikasi email, laporan ekspor, multi-divisi.

## Data Demo (seed)
Minimal 10 barang ATK (Pulpen, Pensil, Kertas A4, Spidol, Stapler, Isi Staples, Map, Buku Tulis, Penggaris, Lakban). Sebagian dengan stok di bawah minimum agar warna merah terlihat saat demo. Beberapa permintaan contoh berstatus Diproses dan Selesai.

## Kriteria Sukses
- Demo end to end berjalan: user kirim permintaan, muncul langsung di Admin GA, ditandai selesai, user melihat status berubah.
- Tampilan terasa profesional dan rapi, mengesankan client GA.
- Semua data tersimpan di database sungguhan.
