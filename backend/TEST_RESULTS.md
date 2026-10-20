# Hasil pengujian backend registrasi

## Run 18 Oktober 2026: model tanggal layanan H+1 (migrasi 003)

Lingkungan: Windows 11 (laptop lokal, AMD Ryzen 7 8845HS, 16 thread logis, RAM 15,3 GB), Python 3.14.0, Flask 3.1.3, Psycopg 3.3.6, psycopg-pool 3.3.3, Waitress 3.0.2. PostgreSQL 18.3 **sementara** (initdb di folder scratch, `127.0.0.1:55450`, auth trust, dihentikan setelah pengujian), terpisah dari layanan PostgreSQL sistem. Zona waktu database uji sengaja `America/Los_Angeles`.

Perintah:

```powershell
$env:TEST_ADMIN_DSN = 'host=127.0.0.1 port=55450 dbname=postgres user=postgres'
.\.venv\Scripts\python.exe -B tests/integration.py   # 3 run berturut-turut: exit 0, 22 kelompok cek lulus tiap run (~15-16 dtk)
.\.venv\Scripts\python.exe -B tests/route_guard.py   # PASS
.\.venv\Scripts\python.exe -m pip check              # No broken requirements found.
```

Harness: database acak per run; dua proses `serve.py` (masing-masing 16 thread HTTP, pool DB maks. 8) per skenario dengan `ISLAH_ENV=test` dan `ISLAH_TEST_CLOCK`; request HTTP sungguhan dengan thread barrier; kunci `ISLAH_NIK_KEY` acak; data pasien sintetis. Uji tanggal memakai Flask test client in-process karena jamnya diubah di tengah uji. Setelah setiap skenario penghitung kapasitas dibandingkan dengan jumlah baris (aplikasi, reservasi) dan dicek tidak ada pasien tanpa aplikasi.

### Yang dibuktikan

| # (brief M) | Skenario | Hasil |
| --- | --- | --- |
| Konfigurasi | Startup tanpa `ISLAH_NIK_KEY`, kunci terlalu pendek, jam tiruan di luar mode uji | Ketiganya ditolak saat startup |
| Migrasi | 001 + data lama; 002 dengan akun memegang dua tiket hidup; objek `registration.patient` liar sebelum 003 | 002 lalu 003 berhenti dengan pesan jelas, versi tetap 1, tidak ada data diubah; setelah dibereskan naik ke versi 3; `init-db` kedua "sudah tersedia"; baris `service_day`/`session`/`entry` lama identik sebelum dan sesudah |
| Tanggal | 23.59 WIB 1 Jan 2099 (16.59 UTC) | `today` 2099-01-01, H+1 2099-01-02 meskipun zona database Los Angeles |
| Tanggal | 00.00 WIB 2 Jan 2099 | H+1 menjadi 2099-01-03; aplikasi yang dibuat pukul 23.59 tetap 2099-01-02; replay kunci yang sama setelah tengah malam mengembalikan aplikasi yang sama |
| Tanggal | Body memuat tanggal lain / ringkasan basi | `SERVICE_DATE_CHANGED` dengan tanggal server; tanggal tidak dapat dipilih |
| Tanggal | H+1 belum dibuka; H+1 ditandai `no_service` | `REGISTRATION_NOT_OPEN` (`not_opened` / `no_service`); tidak ada baris untuk tanggal sesudahnya (tidak digeser) |
| Tanggal | `open-registration` untuk H+2 atau tanggal `no_service`; `mark-no-service` saat dibuka atau untuk tanggal lampau | Semua ditolak dengan kode jelas |
| Validasi | Field kosong/salah, NIK 15 digit, lahir di masa depan, field `relation`, tanpa kunci, bukan JSON | 400 dengan pesan form; NIK tidak digemakan; field hubungan ditolak |
| Normalisasi | Spasi berlebih, NIK berspasi, `+62 812-...` | Disimpan rapi; respons hanya `nik_last4`; `reference` bukan angka; tidak ada field antrian/pembayaran |
| (1)(2)(3) | 170 akun berbeda mengirim serentak ke dua proses | Tepat 100 `awaiting_payment`, 50 `waiting` (posisi 1-50), 20 `CAPACITY_FULL`; bertambah tepat 150 pasien, 150 aplikasi, 100 reservasi; retry yang ditolak tidak membuat baris |
| (8)(9) | Replay kunci sama; kunci baru saat masih belum selesai | 200 aplikasi sama; `UNFINISHED_APPLICATION` dengan referensi milik sendiri |
| (16) | Akun lain membaca/membatalkan | 404, state tidak berubah; daftar hanya milik sendiri |
| (4)(5) | Batalkan `awaiting_payment` | Tepat satu tempat dilepas; peserta tunggu paling awal menjadi `awaiting_payment` (`promoted_at` terisi, bukan `confirmed`); posisi lain maju |
| (8) | Batal diulang; dua proses membatalkan aplikasi yang sama bersamaan | Tidak ada pelepasan/promosi kedua |
| (7) | Batalkan `waiting` | Hanya `waiting - 1` |
| (10) | Akun yang membatalkan mengirim lagi | 201, masuk di belakang antrean |
| (6) | Pendatang baru saat ada tempat utama kosong dan antrean tidak kosong (tempat kosong disimulasikan lewat SQL `main_capacity=101`) | Tetap `waiting` di belakang |
| (9) | Satu akun berlomba dengan dua kunci di dua proses | Tepat satu 201, satu `UNFINISHED_APPLICATION` |
| Tutup | `close-registration` | Pendaftaran baru `REGISTRATION_NOT_OPEN closed`; `waiting`/`held` tetap; pembatalan tetap mempromosikan FIFO |
| (11) | 10 pasang akun, tiap pasang NIK sama, serentak di dua proses | Tepat satu sukses per NIK; yang kalah hanya menerima `{"code":"DUPLICATE_NIK","message":"NIK tersebut sudah memiliki pendaftaran untuk tanggal layanan ini."}` |
| (12) | Nama sama, NIK berbeda | Keduanya diterima |
| NIK | Pemegang NIK membatalkan sebelum bayar | Akun lain dapat mendaftarkan NIK itu |
| (13)(14) | Helper uji `confirm_for_test` (SQL di `tests/`) | Baris reservasi sama, `held - 1`/`confirmed + 1` (jumlah tetap), konfirmasi kedua tanpa efek; `main_available` tetap memperhitungkan terkonfirmasi; akun yang sama `ALREADY_REGISTERED_FOR_DATE`, NIK sama `DUPLICATE_NIK`, pembatalan `CANCEL_NOT_SUPPORTED` |
| Tanggal lain | Akun dengan booking terkonfirmasi dan NIK yang sama pada tanggal berikutnya | Diterima |
| Tempat terakhir | 99 terisi, dua akun berlomba | Tepat satu `awaiting_payment`, satu `waiting` |
| Tunggu terakhir | 49 tunggu, dua akun berlomba | Tepat satu `waiting`, satu `CAPACITY_FULL` |
| Backstop DB | `held+1` / `waiting+1` langsung saat penuh; aplikasi kedua dengan NIK sama lewat SQL | CHECK dan indeks `application_one_active_per_nik_date` menolak |
| (15) | Route dan CLI | Tidak ada route/perintah konfirmasi, bayar, atau antrian (`route_guard.py` mengunci allowlist route dan CLI) |
| NIK | Seluruh isi tabel baru dan log kedua proses API | Tidak ada NIK plaintext |
| Proses | Setelah run | Proses API berhenti, database uji terhapus (dicek: tidak ada `mcu_registration_test_%`) |

### Latensi aktual lokal (bukan SLA)

Diukur di klien dari sebelum request sampai body selesai dibaca, termasuk antre di Waitress, pool, dan kunci baris tanggal. Dua proses, satu mesin, loopback. p95 = elemen urut `floor((n-1)*0.95)`.

| Burst | Request | Run 1 median / p95 / maks (ms) | Run 2 | Run 3 |
| --- | ---: | --- | --- | --- |
| 170 akun serentak, satu tanggal | 170 | 726,5 / 1.028,95 / 1.060,02 | 728,86 / 1.036,65 / 1.064,91 | 746,69 / 1.028,3 / 1.056,89 |
| 10 pasang NIK sama | 20 | 220,45 / 257,92 / 261,11 | 190,79 / 245,8 / 247,61 | 246,79 / 268,05 / 268,44 |
| 98 akun serentak (mengisi tempat utama) | 98 | 476,05 / 682,77 / 707,77 | 504,87 / 767,43 / 788,13 | 466,05 / 691,81 / 723,51 |

Semua pengiriman satu tanggal diserialisasi pada baris kapasitas, sehingga latensi burst tumbuh dengan jumlah request serentak. Angka ini tidak mewakili jaringan RS, hosting produksi, atau 400 pengguna serentak (tidak diuji dan tidak dijanjikan).

### Yang tidak dibuktikan

Autentikasi akun produksi, identitas pasien nyata, pembayaran dan konfirmasi sungguhan, rotasi `ISLAH_NIK_KEY`, beban jaringan RS, disaster recovery, frontend (dikerjakan terpisah), perilaku setelah tanggal layanan lewat, dan uji dengan role database terbatas (pengujian memakai superuser instance sementara).

---

## Riwayat (digantikan): run 12-13 Oktober 2026, model sesi akses

> Hasil di bawah menguji model lama (100 aktif + 50 tunggu per sesi, batas 400/hari) yang dicabut pada 18 Oktober 2026. Disimpan sebagai bukti historis; tidak berlaku untuk API sekarang. Batas 400 bukan lagi kuota bisnis dan hasil ini tidak membuktikan 400 pengguna serentak.

Tanggal: 13 Oktober 2026 (run ulang setelah endpoint `GET /api/v1/entries`; run 12 Oktober memvalidasi aturan satu tempat per akun dan migrasi `002`). Lingkungan: Windows lokal, Python 3.14, PostgreSQL 18, Flask 3.1.3, Psycopg 3.3.6, Waitress 3.0.2.

Pengujian menggunakan dua proses API terpisah, masing-masing 16 thread HTTP dan pool DB maksimal delapan koneksi, ke instance PostgreSQL 18.3 sementara pada loopback port 55442 (run sebelumnya memakai port 55441 dan 55440). Request dikirim melalui HTTP sungguhan dengan thread barrier, bukan sekadar Flask test client. Flask test client digunakan tambahan untuk membuktikan pembacaan state dari application factory/pool baru.

### Hasil

| Skenario | Hasil |
| --- | --- |
| Migrasi dua kali dari database kosong | Versi 2; kedua kali tidak membuat ulang tabel |
| Rollback `002`, lalu satu akun memegang dua tiket aktif | `init-db` berhenti dengan pesan migrasi 002; versi tetap 1, tidak ada tiket dibatalkan otomatis |
| Setelah tiket ganda dikeluarkan | `init-db` naik ke versi 2 |
| 100 peserta masuk serentak | Tepat 100 active |
| Tambahan 50 peserta serentak | Tepat 50 waiting dengan posisi 1–50 |
| Peserta ke-151 saat penuh | HTTP 429, tidak menambah tiket |
| 151 peserta datang serentak ke sesi baru | Tepat 100 active, 50 waiting, satu 429 |
| Keluar dari active | Peserta waiting pertama dipromosikan |
| Peserta baru setelah promosi | Masuk di belakang antrean yang sudah ada |
| Submit dari active | Receipt tersimpan dan waiting berikutnya dipromosikan |
| Submit dari waiting | HTTP 409 |
| Retry masuk dan keluar | Tidak menggandakan tiket atau membebaskan slot dua kali |
| Retry submit | Receipt yang sama, tidak menghabiskan kuota dua kali |
| Kunci sama pada sesi berbeda | HTTP 409 konflik idempotensi |
| Identitas sama pada tanggal sama | Submission ganda lintas sesi ditolak |
| Satu akun masuk dua sesi serentak | Tepat satu `201`, satu `409 ACTIVE_IN_OTHER_SESSION` |
| Akun yang sama ke sesi tanggal lain saat masih memegang tempat | `409 ACTIVE_IN_OTHER_SESSION` |
| Akun berbeda memegang sesi lain | Diterima (`201`) |
| Setelah keluar dari tiket lama | Akun dapat masuk sesi lain (`201`) |
| Kontrol (manual, run 12 Oktober; tidak diulang): kode lama tanpa pengecekan, schema `002` | Race menghasilkan `500` + `201`; index menahan tiket ganda tetapi respons tidak layak, sehingga pengecekan di kode diperlukan |
| Token tidak ada / tiket milik orang lain | HTTP 401 / 404 |
| `GET /entries` tanpa token | HTTP 401 |
| `GET /entries` akun baru | `200 {"entries": []}` |
| `GET /entries` peserta waiting | Satu item, isi sama persis dengan `GET /entries/{id}` ditambah `session_label`/`service_date`; `waiting_position` 49 setelah promosi |
| `GET /entries` setelah submit | Item memuat receipt yang sama dengan respons submit |
| Keluar lalu masuk ulang (kunci baru) | Daftar terbaru dulu: tiket baru, lalu tiket lama; setelah keluar keduanya `left`, `waiting_position` null |
| Kepemilikan `GET /entries` | Daftar akun lain tidak memuat tiket tersebut |
| 21 kali masuk/keluar oleh satu akun | `GET /entries` mengembalikan 20 tiket terbaru, urut `sequence` menurun; parameter query diabaikan |
| UUID salah / body tidak didukung | HTTP 400 |
| Application factory/pool baru | State antrean tetap tersimpan |
| Penutupan sesi | Tiket aktif/tunggu dibatalkan; masuk baru ditolak |
| 399 submission lalu dua submit serentak lintas sesi | Hanya satu diterima; total tetap 400 |
| Peserta baru setelah kuota harian penuh | HTTP 409 DAILY_CAPACITY_FULL |
| Dependensi (`pip check`) | Tidak ada dependensi rusak |

### Latensi aktual lokal

Diukur dari sebelum request HTTP sampai body respons selesai dibaca. Termasuk antrean server/DB; tidak termasuk waktu menunggu barrier sebelum request. Satu run, tidak mewakili SLA, performa internet RS, atau kapasitas hosting produksi. Test sengaja mengirim lebih dari 400 request untuk menguji batas 400 peserta; keduanya bukan satu ukuran.

| Burst | Request | Median | p95 sampel | Maksimum |
| --- | ---: | ---: | ---: | ---: |
| Tempat aktif | 100 | 668,77 ms | 920,61 ms | 957,83 ms |
| Tempat tunggu | 50 | 186,71 ms | 308,55 ms | 329,98 ms |
| Seluruh kedatangan sekaligus | 151 | 460,25 ms | 835,06 ms | 884,47 ms |

Run 12 Oktober (setelah migrasi `002`, sebelum `GET /entries`): median/p95/maks 609,38/820,97/854,01 ms (100), 164,16/257,76/278,74 ms (50), 382,87/667,06/723,16 ms (151). Run sebelum migrasi `002`: median/p95/maks 772,41/1.136,63/1.176,54 ms (100), 328,76/603,06/639,29 ms (50), 883,12/1.535,67/1.614,64 ms (151). Burst di atas tidak memanggil `GET /entries`; endpoint baru tidak diukur latensinya secara terpisah. Selisih antar-run menunjukkan variasi mesin lokal, bukan peningkatan performa yang dapat dijanjikan.

p95 memakai elemen urut indeks `floor((n-1)*0.95)`; bukan estimasi persentil populasi. Tidak ada batas latensi buatan untuk menyatakan lulus. Kelulusan mengacu pada integritas kapasitas, FIFO, status HTTP yang diharapkan, dan transaksi.

### Pembersihan dan batas bukti

Harness menghentikan serta menunggu dua subprocess API, menutup pool aplikasi, dan menghapus database acak yang dibuatnya melalui blok `finally`. Instance PostgreSQL sementara juga sudah dihentikan setelah pengujian; tidak ada database `mcu_registration_test_%` tersisa sebelum dihentikan. Server frontend sebelumnya sudah dihentikan. Tidak menjalankan backend untuk ditinggalkan aktif.

Belum diuji oleh harness ini: autentikasi produksi, identitas pasien sungguhan, load internet RS, pembayaran, disaster recovery, browser/frontend (diverifikasi terpisah secara live, lihat `../docs/system-design/REQUIREMENTS_RESOLUTION.md` bagian "Verifikasi akhir"), expiry sesi, dan migrasi data dari draft schema MCU. Semua itu di luar tahap backend minimum. Jalankan ulang `tests/integration.py` pada instance PostgreSQL uji untuk mereproduksi pengujian.
