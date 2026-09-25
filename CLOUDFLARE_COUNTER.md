Database sudah dibuat: frizal-domain-db (61abb2ed-986a-48a0-8177-2502d8304fbe). wrangler.jsonc sudah dikonfigurasi. Lewati pembuatan database dan langsung login, terapkan migrasi, lalu deploy.

# Visitor counter Cloudflare Workers

1. Salin wrangler.example.jsonc menjadi wrangler.jsonc. Isi name dengan nama Worker situs yang sudah ada.
2. Jalankan npx wrangler login jika belum login.
3. Buat D1: npx wrangler d1 create frizal-domain-db
4. Isi database_id pada konfigurasi dari hasil perintah tadi. Binding harus DB.
5. Terapkan migrasi: npx wrangler d1 migrations apply frizal-domain-db --remote
6. Deploy ke Worker yang sama: npx wrangler deploy

Domain yang sudah terpasang tetap dikelola pada Worker yang sama; jangan mengganti nama Worker dengan nama baru. Jangan upload folder root sebagai aset secara manual tanpa mengecualikan tools, backup, dan konfigurasi. .assetsignore mengecualikannya ketika memakai Wrangler.

## Lokal
Salin konfigurasi dan isi dahulu. Jalankan npx wrangler d1 migrations apply frizal-domain-db --local kemudian npx wrangler dev. Server statis biasa tidak menjalankan /api/visitors. Counter lokal terpisah dari produksi.

## Aturan
Total adalah akumulasi kunjungan browser harian (hari UTC), bukan jumlah orang unik. Browser yang sama dihitung sekali per hari; refresh pada hari yang sama tidak menambah. ID acak disimpan di localStorage, tidak memakai IP. Jika penyimpanan browser diblokir, hanya baca angka tanpa menambah. Menghapus storage/incognito/perangkat lain akan dianggap browser baru. Ini counter sederhana, bukan anti-bot: otomatisasi yang membuat ID baru dapat menaikkan angka.

D1 menyimpan hash ID harian selama sekitar tiga hari, lalu membersihkannya saat kunjungan berikutnya. Total tidak dihapus. Unique constraint dan trigger membuat hitungan konsisten saat permintaan bersamaan. Saat API tidak tersedia, UI menampilkan belum tersedia.

Dokumentasi: https://developers.cloudflare.com/workers/static-assets/ dan https://developers.cloudflare.com/d1/wrangler-commands/
