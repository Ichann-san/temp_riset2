# Backend registrasi MCU (ISLAH)

Flask + PostgreSQL untuk pendaftaran MCU per tanggal layanan H+1, sesuai keputusan pemilik 18 Oktober 2026. Desain lengkap: [REGISTRATION_BACKEND.md](../docs/system-design/REGISTRATION_BACKEND.md). Hasil uji: [TEST_RESULTS.md](TEST_RESULTS.md).

> **18 Oktober 2026:** model sesi akses lama (100 aktif + 50 tunggu per sesi, `/sessions`, `/entries`, batas 400/hari, `create-session`/`close-session`) **dicabut** dari API dan CLI. Tabel dan data lamanya tidak diubah. Lihat bagian "Riwayat" di bawah.

Frontend memanggil backend same-origin melalui rewrite Next.js `/api/v1/*`. Backend tidak mengaktifkan CORS dan hanya mendengarkan `127.0.0.1`.

## Aturan yang ditegakkan

- Tanggal layanan = hari ini Asia/Jakarta + 1, dihitung di PostgreSQL. Pasien tidak memilih tanggal; tanggal melekat pada pendaftaran.
- Operator membuka pendaftaran H+1 lewat CLI; tanggal libur/tutup tidak dibuka dan tidak dipindah otomatis. Tidak ada jam buka/tutup (belum diputuskan).
- Per tanggal: 100 tempat utama (`held` menunggu pembayaran + `confirmed`) dan 50 daftar tunggu FIFO. Penuh keduanya: ditolak tanpa rekaman.
- Tempat utama ditahan saat konfirmasi akhir dari ringkasan (`awaiting_payment`). Tidak ada batas waktu hold; disconnect browser bukan pembatalan.
- Pembatalan sebelum bayar oleh pemilik melepas satu tempat dan mempromosikan peserta tunggu paling awal. Pembatalan aplikasi `confirmed` belum didukung.
- Satu aplikasi belum selesai (`waiting`/`awaiting_payment`) per akun; satu pendaftaran aktif per akun per tanggal; satu pendaftaran aktif per NIK per tanggal lintas akun (aturan sementara RS).
- Tidak ada pembayaran, konfirmasi publik, atau nomor antrian resmi. `reference` (`REG-XXXX-XXXX`) adalah kode pendaftaran.

Arsitektur: `Client HTTP → Waitress → Flask routes → modul domain → pool koneksi terbatas → PostgreSQL`. Modul: `app/routes.py` (HTTP), `app/applications.py` (pengiriman, pembatalan, promosi FIFO, baca milik sendiri), `app/service_dates.py` (H+1, kapasitas, operasi operator), `app/identity.py` (validasi form, HMAC NIK), `app/errors.py`, `app/db.py` (pool, transaksi), `app/commands.py` (CLI).

## Konfigurasi

| Variabel | Wajib | Arti |
| --- | --- | --- |
| `DATABASE_URL` | Ya | DSN libpq, tanpa kata sandi di repo (pakai pgpass/PGSERVICE) |
| `ISLAH_NIK_KEY` | Ya | Kunci HMAC NIK, hex minimal 32 byte (64 karakter). Startup gagal bila tidak ada atau terlalu pendek |
| `ISLAH_ENV=test` + `ISLAH_TEST_CLOCK` | Hanya pengujian | Jam tiruan ISO 8601 dengan zona (mis. `2099-03-01T03:00:00+00:00`). Ditolak saat startup tanpa `ISLAH_ENV=test` |
| `DB_POOL_MAX`, `DB_POOL_MAX_WAITING`, `DB_POOL_WAIT_SECONDS`, `HTTP_THREADS`, `HTTP_CONNECTION_LIMIT` | Tidak | Pengaman sumber daya (default 8, 32, 5 dtk, 16, 256), bukan target latensi |

**Pengelolaan kunci produksi masih perlu ditentukan RS/TI.** Untuk lokal gunakan `start.sh` di bawah: kunci dibuat sekali dan disimpan di `.local/nik.key`, kemudian dipakai ulang. Jangan membuat kunci acak baru setiap startup.

Simpan kunci yang sama untuk database yang sama: mengganti kunci membuat NIK lama tidak lagi terdeteksi sebagai duplikat (rotasi memerlukan desain versi kunci, belum dibuat). Jangan commit kunci. NIK lengkap tidak dapat dipulihkan dari database; bila kelak petugas memerlukannya, perlu keputusan kunci enkripsi tersendiri.

## Menjalankan sendiri

### Cara praktis lokal: Git Bash dari PowerShell

Prasyarat: PostgreSQL berjalan, database `mcu_registration` sudah ada, Git for Windows, serta `.venv` dengan dependencies terpasang. Jika belum: `py -m venv .venv`, lalu `.\.venv\Scripts\python.exe -m pip install -r requirements.txt`.

**Blok berikut untuk reset pengujian saja. Hentikan backend terlebih dahulu. Seluruh data registrasi lama, termasuk principal/token, pasien, aplikasi, dan kapasitas tanggal akan dihapus.** Skema, riwayat migrasi, dan tabel di luar registrasi dipertahankan. Reset tidak dijalankan otomatis oleh `start.sh`.

Copy-paste ke PowerShell sekali untuk reset dan konfigurasi lokal:

```powershell
cd C:\Users\maula\Documents\Code\work\riset-2-mcu\backend
$env:DATABASE_URL = 'host=127.0.0.1 port=5432 dbname=mcu_registration user=postgres'
$dbPassword = Read-Host 'Password PostgreSQL' -AsSecureString
$env:PGPASSWORD = [System.Net.NetworkCredential]::new('', $dbPassword).Password
psql -h 127.0.0.1 -p 5432 -U postgres -d mcu_registration -v ON_ERROR_STOP=1 -f .\reset-test-data.sql
if ($LASTEXITCODE -ne 0) { throw 'Reset gagal. Jangan lanjutkan setup.' }
New-Item -ItemType Directory -Force .\.local | Out-Null
@{ database_url = $env:DATABASE_URL; pgpassword = $env:PGPASSWORD } | ConvertTo-Json | Set-Content -Encoding UTF8 .\.local\settings.json
$gitBash = 'C:\Program Files\Git\bin\bash.exe'
& $gitBash ./start.sh init-db
if ($LASTEXITCODE -ne 0) { throw 'Inisialisasi gagal.' }
& $gitBash ./start.sh create-client --label local-review
if ($LASTEXITCODE -ne 0) { throw 'Pembuatan token gagal.' }
$nextDate = psql -h 127.0.0.1 -p 5432 -U postgres -d mcu_registration -At -c 'SELECT registration.current_service_date()'
if ($LASTEXITCODE -ne 0) { throw 'Gagal membaca H+1.' }
& $gitBash ./start.sh open-registration --date "$nextDate"
if ($LASTEXITCODE -ne 0) { throw 'Gagal membuka pendaftaran.' }
& $gitBash ./start.sh
```

Simpan token baru yang dicetak `create-client` untuk akses API/frontend. Token lama sudah tidak berlaku setelah reset. Password disimpan sebagai teks lokal di `.local/settings.json`; kunci disimpan terpisah di `.local/nik.key`. Keduanya diabaikan Git. Jaga berkas lokal ini dan jangan membagikannya. Jika kunci hilang tetapi masih ada data pasien, launcher menolak membuat kunci pengganti.

**Setiap ingin menjalankan backend berikutnya**, cukup:

```powershell
cd C:\Users\maula\Documents\Code\work\riset-2-mcu\backend
& 'C:\Program Files\Git\bin\bash.exe' ./start.sh
```

Gunakan Git Bash, bukan WSL. Dari terminal Git Bash sendiri: `bash ./start.sh`. Di PowerShell gunakan `& 'C:\Program Files\Git\bin\bash.exe' ./start.sh`; jangan gunakan `bash .\start.sh` karena Bash mengartikan backslash sebagai escape sehingga mencari `.start.sh`. Launcher memuat konfigurasi, menerapkan migrasi idempotent, lalu menjalankan Waitress pada `http://127.0.0.1:5000`. PowerShell tetap menunggu selama server berjalan. Uji `http://127.0.0.1:5000/api/v1/health` di terminal/browser lain. Hentikan dengan Ctrl+C. PostgreSQL harus sudah berjalan. Startup tidak menghapus data, membuat akun, maupun membuka tanggal layanan otomatis.

Untuk membuka H+1 pada hari berikutnya, cek `start.sh registration-status`, lalu jalankan `start.sh open-registration --date YYYY-MM-DD` melalui Git Bash seperti contoh di atas. Pembukaan tetap keputusan operator.

### Cara manual tanpa launcher

Prasyarat: Python 3.10+ dan PostgreSQL (diuji Python 3.14 / PostgreSQL 18.3). Server tidak menjalankan migrasi otomatis.

```powershell
cd C:\Users\maula\Documents\Code\work\riset-2-mcu\backend
# Jika .venv belum ada: py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
createdb -U postgres mcu_registration            # sekali saja
$env:DATABASE_URL = 'host=127.0.0.1 port=5432 dbname=mcu_registration user=postgres'
$env:ISLAH_NIK_KEY = '<64 karakter hex, lihat Konfigurasi>'
.\.venv\Scripts\python.exe -B -m flask --app app init-db               # menerapkan migrasi 001-003
.\.venv\Scripts\python.exe -B -m flask --app app create-client --label review-1   # mencetak token sekali
.\.venv\Scripts\python.exe -B -m flask --app app registration-status   # lihat H+1 menurut database
.\.venv\Scripts\python.exe -B -m flask --app app open-registration --date <H+1>
.\.venv\Scripts\python.exe -B serve.py
```

Server mendengarkan `127.0.0.1:5000`; cek `/api/v1/health` dan `/api/v1/ready` (503 `migration_required` sampai migrasi 003 diterapkan). Hentikan dengan Ctrl+C. Database yang dipakai server lama perlu `init-db` ulang dan `ISLAH_NIK_KEY` sebelum server baru dijalankan.

## Perintah operator (CLI, tidak ada versi HTTP)

| Perintah | Perilaku |
| --- | --- |
| `init-db` | Menerapkan migrasi tertunda dalam satu transaksi; idempotent. Migrasi 002/003 berhenti dengan pesan jelas bila data/objek yang ada bertentangan, tanpa mengubah data |
| `create-client --label L` | Membuat principal review (pengganti akun sementara) dan mencetak token sekali. Bukan akun produksi, bukan identitas pasien |
| `open-registration --date D` | Membuka penerimaan untuk D hanya bila D = H+1 (Asia/Jakarta, menurut database); menolak tanggal lain dan tanggal `no_service`; dapat membuka ulang tanggal H+1 yang `closed` |
| `close-registration --date D` | Menghentikan pendaftaran baru; `waiting`, `awaiting_payment`, `confirmed` tetap (tidak ada yang dibatalkan) |
| `mark-no-service --date D [--undo]` | Menandai D (>= H+1) libur/tutup sehingga tidak dapat dibuka; ditolak bila sedang dibuka atau sudah ada pendaftaran aktif. `--undo` mengembalikan ke `closed` |
| `registration-status [--date D]` | Hari ini, H+1, status, dan penghitung |

Jalankan dengan `.\.venv\Scripts\python.exe -B -m flask --app app <perintah>`. Tidak ada perintah konfirmasi atau pembayaran.

## Endpoint (`/api/v1`)

Semua kecuali `health`/`ready` memerlukan `Authorization: Bearer <token>`. Galat: `{"error": {"code", "message", ...}}`.

| Endpoint | Hasil |
| --- | --- |
| `GET /service-dates/current` | `today`, `service_date` (H+1), `status` (`open`/`closed`/`no_service`/`not_opened`), `accepting_applications`, `main_capacity`, `held`, `confirmed`, `main_available`, `waiting`, `waiting_capacity`, `waiting_available` |
| `GET /service-dates/{YYYY-MM-DD}` | Objek yang sama tanpa `today`, untuk layar kapasitas. Hanya angka. Pembatasan per peran ditunda |
| `POST /applications` | Konfirmasi akhir. Header `Idempotency-Key` wajib; body `{"service_date", "patient": {name, nik, birth_date, address_ktp, address_home, phone, gender, occupation}}`. `201` `awaiting_payment` atau `waiting`; `200` replay kunci+body yang sama |
| `GET /applications` | `{applications: [...]}` milik sendiri, terbaru dulu, maks. 20 |
| `GET /applications/{id}` | Milik sendiri; `404` untuk milik akun lain |
| `POST /applications/{id}/cancel` | Tanpa body; aman diulang. `awaiting_payment`/`waiting` menjadi `cancelled` (+ promosi FIFO); `confirmed` ditolak `CANCEL_NOT_SUPPORTED` |

Objek aplikasi: `id`, `reference`, `service_date`, `state`, `main_place` (`held`/`confirmed`/null), `waiting_position`, `patient` (`name`, `nik_last4`, `birth_date`, `address_ktp`, `address_home`, `phone`, `gender`, `occupation`), `created_at`, `promoted_at`, `confirmed_at`, `cancelled_at`, `updated_at`. NIK lengkap tidak pernah dikembalikan.

Validasi pasien (sama dengan form frontend): nama, alamat KTP, alamat domisili, pekerjaan wajib (spasi dirapikan; maks. 100/200/200/100 karakter); NIK tepat 16 digit; tanggal lahir `YYYY-MM-DD` tidak melewati hari ini; telepon `^(\+62|62|0)8\d{7,11}$` setelah spasi/tanda hubung dibuang; jenis kelamin `Laki-laki`/`Perempuan`. Field lain (mis. hubungan, "diri sendiri") ditolak `INVALID_BODY`.

| Kode | HTTP | Arti |
| --- | --- | --- |
| `INVALID_IDEMPOTENCY_KEY`, `INVALID_BODY`, `VALIDATION_FAILED` (`fields`), `INVALID_ID`, `INVALID_DATE`, `UNEXPECTED_BODY` | 400 | Request tidak valid; nilai tidak pernah digemakan |
| `UNAUTHORIZED` | 401 | Token tidak ada/tidak valid |
| `NOT_FOUND` | 404 | Tidak ada atau bukan milik pemanggil |
| `SERVICE_DATE_CHANGED` (`service_date`) | 409 | Ringkasan memuat tanggal lama (mis. lewat tengah malam) |
| `REGISTRATION_NOT_OPEN` (`service_date`, `status`) | 409 | H+1 belum dibuka, sudah ditutup, atau tidak ada layanan |
| `UNFINISHED_APPLICATION` (`application`) | 409 | Akun masih punya aplikasi belum selesai (dikembalikan, milik sendiri) |
| `ALREADY_REGISTERED_FOR_DATE` (`application`) | 409 | Akun sudah punya pendaftaran aktif/terkonfirmasi untuk tanggal itu |
| `DUPLICATE_NIK` | 409 | "NIK tersebut sudah memiliki pendaftaran untuk tanggal layanan ini." tanpa data lain |
| `CAPACITY_FULL` | 409 | 100 + 50 penuh; tidak ada rekaman |
| `IDEMPOTENCY_CONFLICT` | 409 | Kunci sudah dipakai untuk body lain |
| `CANCEL_NOT_SUPPORTED` | 409 | Aplikasi terkonfirmasi tidak dapat dibatalkan (belum diputuskan) |
| `TEMPORARILY_UNAVAILABLE` | 503 | Pool/lock sibuk; ulangi dengan kunci sama lalu baca `GET /applications` |

Contoh PowerShell:

```powershell
$base = 'http://127.0.0.1:5000/api/v1'
$auth = @{ Authorization = "Bearer $(Read-Host 'Token')" }
$day = (Invoke-RestMethod "$base/service-dates/current" -Headers $auth).service_date
$body = @{ service_date = $day; patient = @{ name = 'Peserta Sintetis'; nik = '3578000000000001'; birth_date = '1990-05-01';
  address_ktp = 'Jl. Contoh 1, Surabaya'; address_home = 'Jl. Contoh 1, Surabaya'; phone = '081234567890';
  gender = 'Perempuan'; occupation = 'Guru' } } | ConvertTo-Json
$app = Invoke-RestMethod "$base/applications" -Method Post -Headers ($auth + @{ 'Idempotency-Key' = [guid]::NewGuid().ToString() }) -ContentType 'application/json' -Body $body
Invoke-RestMethod "$base/applications" -Headers $auth
Invoke-RestMethod "$base/applications/$($app.id)/cancel" -Method Post -Headers $auth
```

Gunakan data sintetis saja; token operator bukan identitas pasien yang terverifikasi.

## Resource dan latensi

Default lokal: 16 thread HTTP, maks. 256 koneksi HTTP, pool 1-8 koneksi DB, maks. 32 menunggu pool (5 dtk), lock DB 5 dtk, statement 10 dtk, body 4 KiB. Semua pengiriman untuk satu tanggal diserialisasi sebentar pada baris kapasitas tanggal itu. Tidak ada I/O eksternal dalam transaksi. Respons memuat `Cache-Control: no-store`, `X-Request-ID`, `Server-Timing`. Tidak ada SLA; angka di TEST_RESULTS adalah satu mesin lokal.

## Pengujian

Gunakan instance PostgreSQL khusus uji (role dengan CREATEDB). Harness membuat database acak `mcu_registration_test_*`, menjalankan dua proses API per skenario dengan jam tiruan, lalu menghentikan proses dan menghapus database itu di `finally`. Kunci NIK acak dibuat per run.

```powershell
$env:TEST_ADMIN_DSN = 'host=127.0.0.1 port=55450 dbname=postgres user=postgres'
.\.venv\Scripts\python.exe -B tests/integration.py
.\.venv\Scripts\python.exe -B tests/route_guard.py     # allowlist route/CLI, tanpa database
```

Instance sementara dapat dibuat dengan `initdb -D <folder> -U postgres -A trust` lalu `pg_ctl -D <folder> -o "-p 55450 -c listen_addresses=127.0.0.1" start`, dan dihentikan dengan `pg_ctl -D <folder> stop`. Jangan arahkan ke database aplikasi.

## Riwayat

Sampai 13 Oktober 2026 backend ini memakai sesi akses (100 aktif + 50 tunggu per sesi, FIFO, `Idempotency-Key`, satu tiket hidup per akun dengan migrasi 002) dan batas 400 submission per tanggal. Route `/sessions*`, `/entries*` dan CLI `create-session`/`close-session` dihapus pada 18 Oktober 2026 karena tidak boleh menjadi kuota kedua dan karena penutupan sesi membatalkan tiket hidup. Tabel `service_day`, `session`, `entry`, `submission` tetap ada dengan datanya, tidak dibaca atau ditulis API. Hasil uji model lama disimpan sebagai riwayat di TEST_RESULTS.md.
