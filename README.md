# POS Kasir Kedai Yumnaa v1

Aplikasi POS kasir berbasis web statis untuk Kedai Yumnaa.

## Cara menjalankan

Buka `index.html` di browser.

Untuk fitur PWA lengkap seperti install ke home screen dan offline cache, jalankan dari server lokal atau hosting HTTPS, lalu buka dari Chrome Android.

## Struktur

- `data/menu.js` berisi data menu dan harga. Edit file ini untuk update menu.
- `assets/js/app.js` berisi logika kategori, search, keranjang, checkout, struk, transaksi, dan ranking terlaris.
- `assets/js/pwa.js` berisi registrasi service worker dan tombol install PWA.
- `assets/js/adapters/printer-bluetooth.js` disiapkan untuk printer thermal Bluetooth Android di v2.
- `assets/js/adapters/google-sheets-sync.js` disiapkan untuk sinkronisasi Google Sheets saat online.
- `assets/css/styles.css` berisi tampilan mobile friendly.
- `manifest.json` dan `sw.js` berisi konfigurasi PWA dan cache offline.

## Penyimpanan

Data keranjang, open bill, transaksi lunas, dan total qty terjual sepanjang waktu disimpan di `localStorage` browser.
Bill yang sudah `PAID / LUNAS` juga masuk antrean sinkronisasi lokal `kedai-yumnaa-v1-sync-queue`.

## Install di Android

1. Buka URL aplikasi di Chrome Android.
2. Tunggu tombol `Install` muncul, atau pilih menu Chrome `Add to Home screen`.
3. Setelah terpasang, aplikasi terbuka dalam mode standalone tanpa address bar browser.

## Offline first

Service worker menyimpan app shell, data menu, CSS, JS, manifest, dan icon. Setelah dibuka minimal sekali dari URL yang valid, aplikasi tetap bisa dibuka saat internet mati.

## Open Bill / Tab Meja

- `Buka Bill Baru` membuat bill berstatus `OPEN / BELUM BAYAR` dari nomor meja atau nama customer.
- `Tambah ke Bill Aktif` menyimpan keranjang sebagai batch pesanan di bill yang sedang dipilih.
- Batch pertama mencetak struk kitchen `PESANAN PERTAMA`.
- Batch berikutnya mencetak hanya item tambahan dengan label `PESANAN TAMBAHAN`.
- `Lihat Bill Aktif` menampilkan semua bill OPEN dan bisa dicari berdasarkan meja/customer.
- `Bayar / Tutup Bill` mengubah status menjadi `PAID / LUNAS` dan mencetak struk customer final.
- Item yang sudah terkirim ke kitchen bisa dikoreksi dengan status `Dibatalkan`, bukan dihapus diam-diam.

## Catatan v1

- Menu kategori `MINUMAN` dan `BLENDER SERIES` otomatis menampilkan kolom `Keterangan rasa` di keranjang dan nota.
- Open bill menyimpan batch pesanan dan menaikkan ranking menu berdasarkan total qty terjual sepanjang waktu.
- Tombol cetak tersedia untuk struk customer dan kitchen.
