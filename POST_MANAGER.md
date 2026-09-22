# Frizal Domain Post Manager

Memerlukan Python 3.10+ dengan Tkinter (tersedia pada installer standar Python untuk Windows). Tidak memerlukan pip/dependensi tambahan.

Jalankan dari folder proyek:

```powershell
python post_manager.py
```

1. Pilih Game atau Blog.
2. Klik Tambah post atau pilih post lalu Edit.
3. Isi judul, ID unik, tanggal publish, game, seri, platform, pin, dan isi artikel.
4. Tab Media mengatur gambar/YouTube. Pilih gambar untuk menyalinnya ke images/<id-post>/. Naik/Turun mengatur urutan carousel.
5. Tab Item & link mengatur tipe (pisahkan dengan koma), deskripsi, dan nama accordion. Di dalam setiap item terdapat tab Link dan Riwayat versi.
6. Klik Terapkan untuk menyimpan ke draft, lalu Simpan tab ini (Ctrl+S) untuk menulis games.js atau blog.js. Simpan kedua tab jika keduanya berubah.
7. Muat ulang halaman situs. Commit/push dilakukan sendiri seperti biasa.

Backup otomatis ada di .post-manager-backups. File yang berubah di luar aplikasi tidak ditimpa: salin draft yang diperlukan sebelum Muat ulang. Field data tambahan yang tidak dikenal tetap dipertahankan.

Gambar yang diimpor langsung disalin, sehingga batal mengedit bisa meninggalkan gambar yang belum digunakan. Menghapus post tidak menghapus gambar. Duplikat post memakai media asli sampai Anda menggantinya. Setelah mengubah ID, terapkan dan buka lagi editor sebelum impor media agar folder mengikuti ID baru.

Format sumber: assignment window.PROJECTS/window.BLOG_POSTS berisi JSON (seperti file situs sekarang). JavaScript dinamis, komentar di dalam array, dan trailing comma tidak didukung; aplikasi menampilkan error tanpa menulis file.

Pengujian penyimpanan:

```powershell
python -m unittest test_post_manager.py
```
