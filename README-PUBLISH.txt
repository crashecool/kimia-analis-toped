KIMIA ANALIS TOPED — PUBLIKASI NETLIFY + SUPABASE
=================================================

Yang diperlukan:
- Akun Supabase
- Akun GitHub
- Akun Netlify
- Node.js hanya diperlukan bila ingin menguji website di komputer

A. MEMBUAT DATABASE SUPABASE
1. Buka https://supabase.com/dashboard lalu buat New project.
2. Pilih region terdekat (Singapore cocok untuk Indonesia).
3. Buka SQL Editor > New query.
4. Salin seluruh isi supabase/schema.sql, lalu tekan Run.
5. Buka Authentication > Users > Add user.
6. Masukkan email admin dan password yang kuat. Aktifkan konfirmasi otomatis
   bila opsi tersebut tersedia. Email ini tidak tampil pada website.

B. MENGAMBIL TIGA KONFIGURASI SUPABASE
1. Buka Project Settings > API.
2. Catat Project URL.
3. Catat anon/publishable key.
4. Catat service_role/secret key.
5. Jangan menaruh service_role key dalam file atau GitHub. Kunci tersebut hanya
   dimasukkan ke Environment Variables milik Netlify.

C. MEMASUKKAN SOURCE KE GITHUB
1. Buat repository baru, misalnya kimia-analis-toped.
2. Unggah seluruh isi folder ini ke repository.
3. Jangan unggah node_modules, .next, .runtime, atau file .env. Semuanya sudah
   dimasukkan ke .gitignore.

D. PUBLIKASI DI NETLIFY
1. Buka https://app.netlify.com.
2. Pilih Add new project > Import an existing project > GitHub.
3. Pilih repository kimia-analis-toped.
4. Build command: npm run build
5. Biarkan publish directory dideteksi otomatis oleh Netlify.
6. Sebelum deploy, tambahkan Environment Variables berikut:

   NEXT_PUBLIC_SUPABASE_URL       = Project URL Supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY  = anon/publishable key Supabase
   SUPABASE_SERVICE_ROLE_KEY      = service_role/secret key Supabase

7. Tekan Deploy. Setelah selesai, buka alamat .netlify.app yang diberikan.

E. MENGISI KATALOG PERTAMA KALI
1. Buka https://ALAMAT-SITUS.netlify.app/admin.
2. Login memakai email dan password admin Supabase.
3. Impor PDF pricelist untuk membuat daftar material dasar.
4. Setelah itu unggah CSV hasil Sigma Scraper GUI per batch 500.
5. CSV dicocokkan berdasarkan material number; ukuran, SKU, CAS, nama, sinonim,
   deskripsi, dan status Ready/Cek Stok diperbarui otomatis.
6. Impor diproses massal per 200 baris agar stabil pada batas waktu Netlify.
   Jangan menutup halaman admin selama persentase masih berjalan.

F. UPDATE BERKALA
1. Jalankan Sigma Scraper GUI di komputer.
2. Pilih batch maksimal 500.
3. Setelah selesai, buka /admin pada website.
4. Pilih CSV batch tersebut dan tekan tombol pembaruan.
5. Tidak perlu deploy website ulang untuk memperbarui produk.

MEMPERBARUI SOURCE DI GITHUB
- Bila Anda menerima versi perbaikan, timpa file lama di repository GitHub
  dengan isi paket baru lalu lakukan commit. Netlify akan melakukan deploy
  ulang otomatis. Environment Variables yang sudah tersimpan tidak perlu
  dimasukkan kembali.

KEAMANAN
- Katalog dapat dibaca publik.
- Perubahan database hanya dapat melalui API server setelah login admin.
- service_role key tidak pernah dikirim ke browser.
- Jangan membagikan password admin atau service_role key.
