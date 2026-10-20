# Backend registrasi: model tanggal layanan H+1 (18 Oktober 2026)

| Metadata | Nilai |
| --- | --- |
| Status | **Diimplementasikan** di `backend/` (migrasi `003_service_date_applications.sql`), diuji pada PostgreSQL 18.3 sementara melalui HTTP sungguhan (lihat [TEST_RESULTS.md](../../backend/TEST_RESULTS.md)) |
| Otoritas | Keputusan pemilik 18 Oktober 2026 (bagian A-I, M, N), menyelesaikan P-01..P-12 di [RECONCILIATION_2026-10-18.md](RECONCILIATION_2026-10-18.md) |
| Menggantikan | Model sesi akses 100 aktif + 50 tunggu per sesi dan batas 400/hari (riwayat di bagian 9) |
| Kontrak API | Endpoint, body, kode galat: [backend/README.md](../../backend/README.md) bagian "Endpoint" |

## 1. Ringkasan

- Pasien tidak memilih tanggal. Server menghitung hari ini dalam Asia/Jakarta **di PostgreSQL** dan menetapkan `service_date = hari ini + 1`. Tanggal itu melekat pada pendaftaran dan tidak dihitung ulang setelah tengah malam.
- Operator membuka pendaftaran H+1 secara eksplisit lewat CLI. Tanggal yang ditandai tidak ada layanan tidak dapat dibuka, dan tidak ada pemindahan otomatis ke tanggal lain. Jam buka/tutup belum diputuskan sehingga tidak ada jendela waktu.
- Per tanggal layanan: **100 tempat utama** (ditahan menunggu pembayaran + terkonfirmasi) dan **50 daftar tunggu** FIFO. 50 daftar tunggu bukan 50 pemeriksaan tambahan; tidak pernah ada 150 tempat yang dapat dikonfirmasi.
- Tempat utama ditahan saat pemohon mengirim konfirmasi akhir dari ringkasan (state `awaiting_payment`, "Menunggu pembayaran"). Mengisi form tidak menahan apa pun.
- Pembayaran **tidak** dibangun. Tidak ada endpoint/CLI konfirmasi, nomor antrian resmi, atau batas waktu hold. Konfirmasi hanya ada sebagai helper di kode pengujian.
- NIK disimpan hanya sebagai HMAC-SHA256 berkunci dan empat digit terakhir. Kuncinya adalah dependensi konfigurasi (`ISLAH_NIK_KEY`).

## 2. Entitas (dipisah sesuai keputusan E)

| Tabel (schema `registration`) | Isi | Catatan |
| --- | --- | --- |
| `principal` (lama) | Akun pengganti sementara: token review buatan operator (`create-client`) | Bukan akun produksi terverifikasi email; bukan identitas pasien |
| `service_date_capacity` | Satu baris per tanggal layanan: `main_capacity` 100, `waiting_capacity` 50, `status` (`open`/`closed`/`no_service`), penghitung `held`, `confirmed`, `waiting` | CHECK: `held + confirmed <= main_capacity`, `waiting <= waiting_capacity`, semua >= 0, `no_service` harus kosong |
| `patient` | Identitas dari form: nama, `nik_hmac`, `nik_last4`, tanggal lahir, alamat KTP, alamat domisili, telepon, jenis kelamin, pekerjaan | Satu baris per pendaftaran; tidak ada penggabungan atau pencarian lintas akun. Data sintetis saja pada tahap review |
| `application` | Pendaftaran: `reference` (kode `REG-XXXX-XXXX`, acak, bukan nomor antrian), `principal_id` (akun pengaju), `patient_id`, `service_date` (ditetapkan saat dibuat), `state`, `waiting_sequence` (FIFO tersimpan), kunci idempotensi, waktu | `nik_hmac` disalin dari pasien dan dijaga sama oleh foreign key komposit `(patient_id, nik_hmac)` agar indeks unik per tanggal dapat dibuat |
| `reservation` | Tempat utama: `held` / `confirmed` / `released`, `payment_reference` (selalu NULL sampai ada pembayaran) | Maksimal satu reservasi hidup per aplikasi; konfirmasi memakai baris yang sama |
| `session`, `entry`, `submission`, `service_day` (lama) | Model gerbang akses lama | Data dibiarkan apa adanya; tidak dibaca/ditulis API lagi (bagian 7) |

State aplikasi: `awaiting_payment` (memegang 1 tempat utama `held`), `waiting` (memegang 1 tempat tunggu), `confirmed` (memegang 1 tempat utama `confirmed`; hanya lewat helper uji), `cancelled`.

Indeks unik parsial:

| Indeks | Aturan |
| --- | --- |
| `application_one_unfinished_per_principal` (`principal_id`) WHERE state IN (waiting, awaiting_payment) | Satu aplikasi belum selesai per akun, lintas tanggal |
| `application_one_active_per_principal_date` (`principal_id, service_date`) WHERE state IN (waiting, awaiting_payment, confirmed) | Satu pendaftaran aktif per akun per tanggal layanan; terkonfirmasi memakai jatah tanggal itu |
| `application_one_active_per_nik_date` (`service_date, nik_hmac`) WHERE state IN (waiting, awaiting_payment, confirmed) | Satu pendaftaran per NIK per tanggal layanan, lintas akun (aturan sementara rumah sakit, menunggu konsultasi) |
| `reservation_one_live_per_application` WHERE state IN (held, confirmed) | Tidak ada hold ganda |

## 3. Tanggal layanan

Fungsi SQL di migrasi 003: `registration.clock_now()` (sama dengan `now()`, kecuali pengaturan transaksi `islah.test_clock` diisi), `registration.jakarta_today()` (`clock_now() AT TIME ZONE 'Asia/Jakarta'`), `registration.current_service_date()` (hari ini + 1). Aplikasi hanya mengisi `islah.test_clock` bila `ISLAH_ENV=test` dan `ISLAH_TEST_CLOCK` diset (atau `TESTING` di factory); di luar itu startup ditolak. Zona waktu sesi database dan jam perangkat tidak berpengaruh (pengujian memakai zona database `America/Los_Angeles`).

Body pengiriman memuat `service_date` yang ditampilkan di ringkasan. Itu **bukan pilihan**: bila berbeda dari H+1 server (mis. dikirim setelah tengah malam) server menolak dengan `SERVICE_DATE_CHANGED` dan mengembalikan tanggal yang berlaku, sehingga pemohon tidak pernah terdaftar ke tanggal yang tidak ia lihat.

Perintah operator (CLI, bukan HTTP):

| Perintah | Perilaku |
| --- | --- |
| `open-registration --date D` | Hanya bila D = H+1 menurut database; menolak tanggal lain (`NOT_NEXT_DAY`) dan tanggal `no_service`. Membuat baris kapasitas 100/50 atau membuka ulang tanggal `closed` |
| `close-registration --date D` | Menutup penerimaan pendaftaran baru. **Tidak** membatalkan `waiting`, `awaiting_payment`, atau `confirmed` |
| `mark-no-service --date D [--undo]` | Menandai tanggal (>= H+1) libur/tutup sehingga tidak dapat dibuka; menolak bila pendaftaran sedang dibuka atau sudah ada pendaftaran aktif. `--undo` mengembalikan ke `closed` |
| `registration-status [--date D]` | Menampilkan hari ini, H+1, dan penghitung |

## 4. Transaksi pengiriman (`POST /api/v1/applications`)

Validasi format terjadi sebelum transaksi. Lalu dalam **satu transaksi pendek**: kunci baris principal, cek replay `Idempotency-Key` (body sama mengembalikan aplikasi yang sama, body berbeda `IDEMPOTENCY_CONFLICT`), cek aplikasi belum selesai milik akun (`UNFINISHED_APPLICATION`, merujuk aplikasi milik akun itu sendiri), cek tanggal (`SERVICE_DATE_CHANGED`), tanggal lahir tidak melewati hari ini, kunci baris `service_date_capacity` H+1 `FOR UPDATE`, cek status `open` (`REGISTRATION_NOT_OPEN`), cek pendaftaran aktif akun untuk tanggal itu (`ALREADY_REGISTERED_FOR_DATE`), cek NIK (`DUPLICATE_NIK`, pesan tetap "NIK tersebut sudah memiliki pendaftaran untuk tanggal layanan ini." tanpa data lain), lalu keputusan kapasitas:

1. `waiting = 0` dan `held + confirmed < 100`: aplikasi `awaiting_payment` + reservasi `held`, `held + 1`.
2. selain itu bila `waiting < 50`: aplikasi `waiting` dengan `waiting_sequence` berikutnya, `waiting + 1`. Pendatang baru tidak pernah melewati peserta tunggu.
3. selain itu: `CAPACITY_FULL`; tidak ada baris yang dibuat.

Urutan kunci di seluruh kode: principal, baris kapasitas tanggal, baris aplikasi. Tidak ada transaksi atau koneksi yang tetap terbuka setelah request; tidak ada penghitung di memori proses. Pelanggaran indeks unik/CHECK (yang seharusnya tidak terjadi karena kunci) dipetakan ke galat domain yang sama.

## 5. Pembatalan dan promosi FIFO (`POST /api/v1/applications/{id}/cancel`)

Hanya pemilik. Kunci baris kapasitas tanggal aplikasi, lalu baris aplikasi.

| State awal | Hasil |
| --- | --- |
| `awaiting_payment` | `cancelled`, reservasi `released`, `held - 1`; dalam transaksi yang sama peserta `waiting` paling awal (menurut `waiting_sequence`) menjadi `awaiting_payment` dengan reservasi `held` baru, `held + 1`, `waiting - 1`, selama `held + confirmed < 100`. Yang dipromosikan **tidak** terkonfirmasi dan tidak mendapat nomor antrian |
| `waiting` | `cancelled`, `waiting - 1` saja |
| `cancelled` | Dikembalikan apa adanya; tidak ada pelepasan kedua (aman diulang, juga bila dua proses membatalkan bersamaan) |
| `confirmed` | `409 CANCEL_NOT_SUPPORTED`; pembatalan setelah pembayaran terverifikasi belum diputuskan |

Setelah pembatalan sebelum bayar, akun boleh mengirim lagi (dengan kunci baru). Promosi tetap berjalan setelah penerimaan ditutup, karena peserta tunggu yang sudah diterima tetap berhak.

## 6. Perlindungan NIK dan data pasien

- NIK dinormalisasi (spasi di tepi dibuang, tepat 16 digit ASCII), lalu `nik_hmac = HMAC-SHA256(ISLAH_NIK_KEY, "nik" || 0x00 || NIK)` dan `nik_last4`. Plaintext NIK tidak disimpan di tabel baru, tidak dicatat di log, tidak muncul di galat atau respons. Pengujian memeriksa isi seluruh tabel baru dan log kedua proses API.
- Kunci: `ISLAH_NIK_KEY` (hex, minimal 32 byte). Startup gagal tanpa kunci (kecuali factory dipanggil dengan `TESTING`, yang memakai kunci acak sementara). Pengujian membuat kunci acak per run.
- **Dependensi konfigurasi yang belum diputuskan RS/TI:** siapa yang membuat, menyimpan, dan memutar kunci. Mengganti kunci membuat HMAC lama tidak lagi cocok, sehingga duplikat lama tidak terdeteksi; rotasi memerlukan desain versi kunci yang belum dibuat. Bila petugas kelak perlu melihat NIK lengkap, diperlukan keputusan kunci enkripsi (bukan HMAC) yang tidak tercakup di sini.
- Field lain (nama, tanggal lahir, alamat, telepon, jenis kelamin, pekerjaan) disimpan setelah normalisasi (spasi dirapikan, telepon tanpa spasi/tanda hubung, tanpa ubah huruf) dan tidak dicatat di log. Pemilik aplikasi dapat membacanya kembali; akun lain tidak.
- Fingerprint idempotensi juga HMAC berkunci, bukan hash polos dari body.

## 7. Bagian lama yang dicabut

- Route `/api/v1/sessions*` dan `/api/v1/entries*` dihapus dari API dan allowlist (`tests/route_guard.py`). Gerbang akses per sesi (100 aktif + 50 tunggu), aturan satu tiket hidup per principal, dan batas `DAILY_CAPACITY_FULL`/400 tidak lagi berada di depan alur baru dan tidak menjadi kuota kedua.
- CLI `create-session` dan `close-session` dihapus; perilaku "tutup sesi membatalkan entri hidup" tidak diterapkan ke aplikasi/hold. Penutupan penerimaan sekarang `close-registration`, yang tidak membatalkan apa pun.
- Tabel `service_day`, `session`, `entry`, `submission` dan migrasi 001/002 tidak diubah (forward-only); datanya tetap ada sebagai riwayat. Pengujian membuktikan baris lama identik sebelum dan sesudah migrasi 003.
- Migrasi 003 menolak berjalan bila tabel barunya sudah ada di luar riwayat migrasi, tanpa mengubah data.

## 8. Status keputusan

| Kategori | Butir |
| --- | --- |
| Dikonfirmasi dan diimplementasikan | H+1 Asia/Jakarta dari server; dibuka operator; tanpa pemindahan tanggal; 100 + 50 FIFO per tanggal; hold saat konfirmasi akhir; pelepasan hold oleh pembatalan pemilik dan promosi FIFO; satu aplikasi belum selesai per akun; satu pendaftaran aktif per akun per tanggal; tolak NIK ganda per tanggal lintas akun (aturan sementara); principal operator sebagai pengganti akun; konfirmasi hanya helper uji |
| Digantikan | 400 pendaftaran/hari dan `DAILY_CAPACITY_FULL`; gerbang 100 aktif + 50 tunggu per sesi; tiga pendaftaran per akun; target 400 request serentak (tidak diimplementasikan atau dijanjikan) |
| Ditunda (tidak dibangun) | Pembayaran dan referensi pembayaran, nomor antrian resmi, autentikasi akun produksi/email, otorisasi per peran (endpoint kapasitas dapat dibaca token mana pun), penjadwalan klinis, walk-in, pendaftaran kolektif, katalog/harga resmi, penyimpanan pilihan paket/layanan dan persetujuan S&K, konfigurasi kapasitas oleh Editor |
| Belum diputuskan | Jam buka/tutup pendaftaran; durasi hold/kedaluwarsa idle (saat ini tidak ada); gagal/terlambat bayar; pembatalan setelah bayar terverifikasi (ditolak `CANCEL_NOT_SUPPORTED`); nasib `waiting`/`awaiting_payment` setelah penerimaan ditutup atau tanggal layanan lewat (saat ini dibiarkan, promosi tetap berjalan); perilaku penutupan oleh operator selain menghentikan pendaftaran baru; penyediaan/rotasi `ISLAH_NIK_KEY` dan akses NIK lengkap; aturan NIK final setelah konsultasi RS |

## 9. Riwayat: revisi 12 Oktober 2026 (digantikan)

> Isi di bawah adalah desain lama, dibiarkan sebagai riwayat. Tidak berlaku lagi sejak migrasi 003.

Permintaan saat itu menetapkan sekitar 400 request HTTP/hari, maksimal 400 peserta/hari, 100 tempat aktif per sesi, dan 50 tempat tunggu per sesi, dengan FIFO. Tempat aktif adalah izin mengakses proses registrasi; keluar atau submit melepaskan tempat dan mempromosikan FIFO; satu akun hanya memegang satu tempat aktif/tunggu (migrasi 002); kuota harian 400 diambil saat submit. Operator membuat sesi dengan tanggal bebas dan menutup sesi dengan membatalkan tiket hidup. Identitas hanya akun review bertoken; tidak menerima data pasien. Model ini mendaur ulang tempat akses sehingga tidak dapat membatasi pendaftaran per tanggal tanpa angka 400 (konflik K-01 s.d. K-03, K-12 di rekonsiliasi), dan karena itu digantikan.
