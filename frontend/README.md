# ISLAH - antarmuka MCU RSUD Haji

Frontend Next.js 16 (App Router, React 19) untuk layanan Medical Check Up RSUD Haji Provinsi Jawa Timur. Halaman awal (`/`) adalah login dengan akun per peran (lihat **Akun lokal**); admin dapat membuka semua ruang kerja.

> **Pembaruan UI 20 Oktober 2026.** Registrasi langsung menerbitkan **Nomor antrean pendaftaran** (`P-…`). Setelah petugas menyelesaikan daftar ulang, layar petugas menerbitkan **Nomor antrean MCU** (`MCU-…`). Biaya admin tidak menjadi tahap atau syarat penerbitan nomor pada alur UI ini. Beranda/menu memakai pola garis CSS hijau, marun, dan emas di latar paling belakang; langkah registrasi dan layar detail pasien tetap polos. [Keputusan dan batas implementasi](../docs/plans/2026-10-20-two-stage-queue-ui.md).

Perubahan tersebut berlaku pada state UI lokal. Backend dan jalur token masih memakai kontrak lama: referensi aplikasi bukan nomor antrean, dan belum ada API penerbitan kedua nomor atau sinkronisasi daftar ulang ke akun pasien. State petugas bersifat lokal dan tidak bertahan setelah reload. Ketentuan pembayaran dalam catatan 18 Oktober di bawah merupakan riwayat, bukan alur UI terbaru.

Uji alur UI terfokus (jalankan server pada port 3100 terlebih dahulu): `node scripts/queue-flow-check.mjs`. Menggunakan browser headless sementara, data sintetis, dan lebar 390/768/1440 piksel. Atur `BASE_URL` untuk port lain dan `SHOTS` untuk menyimpan tangkapan layar.

> **Status 18 Oktober 2026 (tahap 2).** Model registrasi pemilik sudah dibangun: tanggal layanan hanya H+1 (Asia/Jakarta, ditetapkan sistem, tanpa pemilih tanggal), form pasien mulai kosong, satu pendaftaran per akun per tanggal layanan, satu pendaftaran belum selesai per akun, NIK ganda pada tanggal yang sama ditolak, status "Menunggu pembayaran" dengan kode pendaftaran (bukan nomor antrian), daftar tunggu FIFO 50 di belakang 100 tempat utama. Pembayaran **tidak** dibangun. Semua label simulasi/demo/mockup/use case/nomor Q dihapus dari kode sumber (bukan disembunyikan); saklar `NEXT_PUBLIC_DEMO_LABELS` dan `src/lib/demo.ts` sudah dihapus. Status keputusan: [OPEN_DECISIONS.md](../docs/system-design/OPEN_DECISIONS.md) bagian 10.

## Dua jalur registrasi

| Jalur | Route | Data | Aturan |
| --- | --- | --- | --- |
| Alur pasien bertahap | `/patient/registration` → `/terms` → `/services` → `/review` → `/done` | Hanya di `sessionStorage` tab ini (`src/lib/mock-session.ts`); tidak dikirim | Form kosong; tanggal H+1 dihitung di browser (Asia/Jakarta), dibekukan saat dikirim; satu belum selesai per akun; satu per akun per tanggal; NIK ganda per tanggal ditolak dengan pesan generik; batal sebelum bayar. Tab ini tidak dapat menahan kapasitas, jadi tidak pernah menampilkan daftar tunggu atau terkonfirmasi |
| Pendaftaran dengan token | `/patient/registration/session` | Server: `POST /api/v1/applications` dengan token akses dari operator | Semua aturan ditegakkan backend, termasuk 100 tempat utama + 50 daftar tunggu dan promosi FIFO saat batal |

`/management/capacity` membaca angka kapasitas dari `GET /api/v1/service-dates/current` dan `/service-dates/{tanggal}`: tempat utama terpakai, menunggu pembayaran, terkonfirmasi, tersedia, daftar tunggu, status tanggal.

## Struktur

- **Konten terpusat (`src/content`)**: `SiteContent = { site, internal, patient }` di `src/content/index.ts`.
  - `site.ts`: merek, header/footer, label navigasi, pesan umum.
  - `internal.ts`: judul, petunjuk menu, deskripsi, judul panel, label kolom, pesan per layar enam peran internal dan admin.
  - `patient.ts`: semua teks portal pasien, label status pendaftaran (`status`), teks halaman pendaftaran dengan token (`connected`).
  - Yang tetap dinamis (tidak di konten): rekaman, nama, angka, status rekaman, tanggal/jam, kode pendaftaran, harga, angka kapasitas dari server, akun yang masuk. Pesan yang memuat nilai berbentuk fungsi kecil.
- **Shell:** `src/components/shell.tsx` (`AppShell`, `Section`, `EmptyState`, footer beranda), `nav-menu.tsx` (header dengan slot menu), `app-dialog.tsx` (pop-up bersama), `roles/detail-pane.tsx` (detail: panel samping ≥ 64rem atau sheet).
- **Blok kerja bersama peran internal (`src/components/roles/kit.tsx`)**: `WorkPanel` (judul + aksi di baris yang sama, toolbar, isi), `Toolbar`, `StatusFilter` + `countOptions` (chip filter dengan jumlah), `RecordTable` (`width`, `bounded`, `Column.compact`; kartu di bawah c1, tabel dari c1), `Band` (kotak ringkasan atas), `Counts`, `Rows`, `Status`, `RowAction`, `DetailHead`, `DetailEmpty`, `Notice`, `Actions`, `Placeholder`. Tata bahasa setiap layar internal: judul → band atas opsional → satu panel kerja → detail.
- **Komponen dasar:** `src/components/frame.tsx`: `Compose`, `Block`, `TitleBlock`, `Alert`, `BigNumberCard`, `Field`/`StarRating`, `ListCard`, `SummaryBox`, `MediaArea`, `SuccessPanel`, `BottomAction`.
- **Varian komposisi dan route:** `src/lib/screens-patient.ts`, `src/lib/screens-internal.ts` (judul dari konten), digabung di `workspaces.ts`.
- **Container query:** c1 ≥ 37.5rem, c2 ≥ 56.25rem, c3 ≥ 75rem. Urutan DOM = urutan baca di semua lebar.
- **Tombol:** `primary-button`, `secondary-button`, `icon-button`, `text-button`, `danger-button`.
- **Format:** `src/lib/format.ts` (zona `Asia/Jakarta`: `jakartaDay`, `nextServiceDay`, `fullDay`, `shortDay`, `timeOf`, `dateTimeOf`, NIK tersamar).
- **API:** `src/lib/api.ts` (tipe `Application`, `ServiceDate`, `PatientInput`; pesan kesalahan per kode), token di `src/components/review-token.tsx`, halaman server di `src/components/registration.tsx` dan `capacity.tsx`.

## Menjalankan di localhost

```powershell
cd C:\Users\maula\Documents\Code\work\riset-2-mcu\frontend
npm ci
npm run dev
```

Buka http://localhost:3000. Tanpa backend semua layar berjalan kecuali `/patient/registration/session` dan `/management/capacity` (memerlukan backend). Jika port 3000 dipakai: `npm run dev -- --port 3001`.

## Akun lokal

Login di `/` memakai akun per peran. **Bukan autentikasi:** username dan password ada di bundle browser dan tidak melindungi apa pun. Sesi (username dan pendaftaran di alur bertahap) disimpan di `sessionStorage` tab ini (kunci `islah-session`) dan dihapus saat **Keluar** atau tab ditutup.

| Peran | Username | Password | Halaman awal |
| --- | --- | --- | --- |
| Admin | `admin` | `admin123` | `/admin`; dapat membuka semua ruang kerja lewat **Tinjau sebagai** |
| Pasien | `pasien` | `pasien123` | `/patient` |
| Petugas MCU | `petugas.mcu` | `petugas123` | `/staff/patient` |
| Dokter MCU | `dokter.mcu` | `dokter123` | `/clinician/review` |
| Petugas Unit | `petugas.unit` | `unit123` | `/unit-staff/queue` |
| Dokter Unit | `dokter.unit` | `dokterunit123` | `/unit-doctor/review` |
| Manajemen | `manajemen` | `manajemen123` | `/management/reports` |
| Editor | `editor` | `editor123` | `/editor/calendar` |

Akun selain admin hanya membuka halaman perannya; ini bukan batas keamanan. Sumber: `src/lib/mock-accounts.ts`. Gunakan data sintetis saja.

## Menjalankan bersama backend

Browser hanya memanggil origin Next `/api/v1/*`; `next.config.ts` me-rewrite ke `ISLAH_API_ORIGIN` (default `http://127.0.0.1:5000`, variabel sisi server). Rewrite ditetapkan saat `next build`, jadi set variabel sebelum build **dan** start.

```powershell
# Backend (lihat ../backend/README.md): ISLAH_NIK_KEY (64 hex) dan DATABASE_URL wajib
.\.venv\Scripts\flask.exe --app app init-db
.\.venv\Scripts\flask.exe --app app create-client --label akun-a     # mencetak bearer_token sekali
.\.venv\Scripts\flask.exe --app app registration-status             # menampilkan H+1
.\.venv\Scripts\flask.exe --app app open-registration --date <H+1>
.\.venv\Scripts\python.exe -B serve.py

# Frontend
$env:ISLAH_API_ORIGIN = 'http://127.0.0.1:5000'
npm run dev        # atau npm run build; npm run start
```

Tempel `bearer_token` di kolom **Token akses**. Token hanya disimpan di state React (hilang saat reload), tidak di localStorage/sessionStorage/cookie/URL; respons 401 menghapusnya. Setelah reload, masukkan token lagi; pendaftaran dipulihkan lewat `GET /api/v1/applications`. Pengiriman memakai satu `Idempotency-Key` per isi form dan memakainya ulang saat **Ulangi** setelah 503/5xx/jaringan putus.

## Yang belum ada

Pembayaran (gateway, biaya, tandai lunas, refund), nomor antrian MCU resmi, login produksi, otorisasi per peran di backend (token mana pun dapat membaca angka kapasitas), walk-in dan kolektif (tombol **Tambah pasien** dan form kolektif tampil nonaktif "Belum tersedia"), katalog dan harga resmi (harga ditandai "Harga sementara, belum ditetapkan RS"; paket tidak dikirim ke backend), nomor bantuan dan FAQ di footer. Layar internal memakai data sintetis dari `src/lib/mock-records.ts`; aksinya hanya mengubah tampilan.

## Verifikasi

```powershell
npm run lint
npx tsc --noEmit -p .
npm run build
```

Cek responsif (dev server harus berjalan): `npm run check:ui` membuka setiap route di `src/app` dengan akun perannya pada lebar 390, 768, 1024, dan 1440 px, lalu melaporkan overflow horizontal, error console, label terlarang yang terlihat, dan redirect. Atur `WIDTHS`, `BASE_URL`, `BROWSER`, `CDP_PORT`, atau `SHOTS=<folder>`.

Sumber desain: `../docs/system-design/`. Arah visual "Minimal institusional": hijau RS `#0E803F`, latar mint `#EFF7F3`, marun `#8B1C1A`, gold `#CBB62D`, font Montserrat lokal (lihat `DESIGN.md`).
