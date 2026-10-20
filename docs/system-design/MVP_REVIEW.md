# Review MVP terhadap PRD — 14 Oktober 2026

> **Diperbarui 18 Oktober 2026:** keputusan pemilik 18 Oktober mengubah kapasitas (100 + 50 daftar tunggu per tanggal, 400 bukan kuota), akun (satu registrasi per akun per hari), tanggal (H+1), dan nomor antrian (setelah pembayaran terverifikasi). Status A-1 s.d. A-4 dan D-x terkait ada di OPEN_DECISIONS bagian 6 s.d. 8. Isi di bawah dibiarkan sebagai riwayat; rinciannya di [RECONCILIATION_2026-10-18.md](RECONCILIATION_2026-10-18.md).

> **Pembaruan 18 Oktober 2026, tahap 2 (berlaku di atas banner sebelumnya).** Brief implementasi pemilik menetapkan: satu pendaftaran per akun per **tanggal layanan** (bukan per hari pengajuan) dan satu aplikasi belum selesai per akun; hold dibuat saat konfirmasi Rincian tanpa batas waktu; promosi daftar tunggu FIFO otomatis; NIK duplikat per tanggal layanan ditolak; 400 dihapus dari aturan bisnis dan kriteria penerimaan; pembayaran tidak dibangun. Model ini sudah dibangun di backend (migrasi 003, `/api/v1/service-dates`, `/api/v1/applications`). Status setiap butir: [OPEN_DECISIONS.md](OPEN_DECISIONS.md) bagian 10; desain backend: [REGISTRATION_BACKEND.md](REGISTRATION_BACKEND.md).

Persiapan sebelum run integrasi berikutnya dan sesi perbaikan MVP. **Alur integrasi penuh (frontend + backend + database) tidak dijalankan dalam review ini**; semua pemeriksaan di bawah berupa review kode dan pemeriksaan statis. Jangan menyatakan integrasi end-to-end berfungsi sebelum run berikutnya diverifikasi. Matriks UC lengkap tetap di [REQUIREMENTS_RESOLUTION.md](REQUIREMENTS_RESOLUTION.md) bagian B.

## 1. Akses fungsi token

| Hal | Keadaan | Dasar |
| --- | --- | --- |
| Pembuatan client/token | Hanya CLI `flask create-client` di server (juga `create-session`, `close-session`). Satu-satunya `INSERT INTO registration.principal` ada di `backend/app/commands.py` | `backend/README.md`: "Jangan menyediakan create-client sebagai endpoint publik" |
| Route HTTP | 9 route, tidak ada yang membuat client/token. Dikunci oleh `backend/tests/route_guard.py` (allowlist; gagal bila route baru ditambahkan tanpa ditinjau; terbukti gagal untuk `POST /api/v1/clients`) | Ditambahkan 14 Oktober |
| Pasien dan peran lain (mis. dokter) | Hanya menjangkau API HTTP, jadi tidak dapat membuat client di server | Akibat dua baris di atas |
| Admin | Ditafsirkan sebagai operator yang memegang akses shell server + kredensial database | **Tafsiran**, lihat A-1 |

Ambiguitas yang belum diputuskan (tidak diimplementasikan, tidak ditebak):

- **A-1 Peran "admin".** PRD hanya punya tujuh peran (Pasien, Petugas MCU, Dokter MCU, Petugas Unit, Dokter Unit, Manajemen, Editor). "Admin" di PRD hanya muncul sebagai "biaya admin". Jika admin dimaksudkan sebagai akun di aplikasi (misalnya untuk membuat client lewat web), perlu ditentukan siapa admin, cara login, dan apakah pembuatan client lewat web memang diinginkan.
- **A-2 "Free flow" dan "token review".** Istilah "free flow" tidak ada di PRD. Kemungkinan artinya: alur pasien publik tanpa login, alur individu yang "bebas mengatur paket" (UC02), atau alur pendaftaran gratis yang sudah historis. Panel "Token review" saat ini adalah satu-satunya cara pasien memakai `/patient/registration` (dan Manajemen memakai `/management/capacity`). Menyembunyikannya dari pasien akan mematikan alur registrasi MVP sampai ada login pasien. Panel tidak diubah.
- **A-3 Cakupan pembatasan.** Belum ada peran di backend: token principal mana pun setara. Membatasi layar atau aksi per peran (misalnya kapasitas hanya untuk Manajemen) memerlukan model peran/akun dulu (`DATABASE_DESIGN.md`: `role`, `account_role`; belum diterapkan di schema `registration`).
- **A-4 Pengerasan tambahan yang belum diputuskan.** Perintah untuk mencabut token (`enabled=false`) belum ada; role database terpisah untuk API (tanpa izin `INSERT` ke `registration.principal`) sesuai `SYSTEM_DESIGN.md` §8 adalah keputusan deployment yang masih terbuka.

## 2. Graph dan GraphQL

- **Tidak ada implementasi GraphQL** di repository: tidak ada kode, skema, dependensi (`package.json`, `requirements.txt`), maupun dokumen desain yang menyebutnya. Desain yang disetujui memakai REST JSON di Flask (`SYSTEM_DESIGN.md`). GraphQL tidak ditambahkan karena perilakunya tidak ditetapkan.
- Graph yang ada adalah knowledge graph graphify (`graphify-out/`). Graph ini diperbarui secara inkremental (`/graphify --update`) agar mencerminkan kode dan dokumen terbaru. Graphify menyediakan query lewat CLI (`graphify query/path/explain`) dan server MCP opsional, **bukan** GraphQL.
- Belum dapat ditentukan: apakah yang dimaksud "graph-related GraphQL" adalah API GraphQL baru di atas data MCU, endpoint query untuk knowledge graph, atau pembaruan graphify saja.

## 3. Koneksi frontend–backend

Pemeriksaan statis (`create_app` + `url_map` Flask, tanpa database atau server) mencocokkan setiap panggilan `apiFetch` di frontend dengan route backend:

| Frontend | Panggilan | Route backend | Hasil |
| --- | --- | --- | --- |
| `registration.tsx` | `GET /sessions` | `sessions` | Cocok |
| `registration.tsx` | `GET /entries` | `my_entries` | Cocok |
| `registration.tsx` | `POST /sessions/{id}/entries` (+ `Idempotency-Key`) | `enter` | Cocok |
| `registration.tsx` | `GET /entries/{id}` | `entry_status` | Cocok |
| `registration.tsx` | `DELETE /entries/{id}` | `leave` | Cocok |
| `registration.tsx` | `POST /entries/{id}/submit` | `submit` | Cocok |
| `capacity.tsx` | `GET /sessions`, `GET /sessions/{id}` | `sessions`, `status` | Cocok |

- 8/8 panggilan cocok; tidak ada mismatch path/method. Field JSON backend (`ticket`, `own_entries`, `status`, bentuk error `{error:{code,message}}`) cocok dengan tipe di `frontend/src/lib/api.ts`.
- `GET /health` dan `GET /ready` tidak dipakai frontend; keduanya endpoint operasional, jadi bukan celah.
- ID UC per layar di `workspaces.ts` cocok dengan matriks B.2 untuk 23 layar (diperiksa sebelum perubahan navigasi §6; UC11 kini di `/staff/add-patient`).
- Tidak ada celah koneksi yang terkonfirmasi, sehingga tidak ada perbaikan koneksi. Layar placeholder memang belum punya backend (lihat bagian 4).
- Rewrite `/api/v1/*` di `next.config.ts` ditetapkan saat `next build`; set `ISLAH_API_ORIGIN` sebelum build untuk backend di luar `127.0.0.1:5000`.

## 4. MVP dibanding PRD

Ringkasan 35 UC (termasuk sub-UC): **3 sebagian** (UC01, UC03, UC26), **17 terhalang keputusan terbuka**, **15 belum dikerjakan**.

### Sesuai PRD
- Registrasi memakai sesi dengan kapasitas (PRD §1.2 Solusi 2) dan antrean tunggu; urutan FIFO.
- Satu transaksi per pasien per waktu (PRD §2.4 Batasan 4), diterapkan sebagai satu tempat aktif/tunggu per akun.
- Pemantauan kuota oleh Manajemen (UC26), sebatas kapasitas registrasi.
- Tujuh ruang kerja peran sesuai PRD, masing-masing menampilkan UC dan statusnya.

### Berbeda dari PRD
| Hal | PRD | MVP sekarang | Dasar perbedaan |
| --- | --- | --- | --- |
| Kuota harian | 100 pasien/hari (§2.4, UC26) | 400 peserta/hari, 100 aktif + 50 tunggu per sesi | Keputusan pengguna (R-06) |
| Identitas | Akun pengguna, data diri, NIK/RR, T&C (UC01) | Token review per principal dari CLI; tanpa data diri | Login produksi belum diputuskan |
| Hasil registrasi | Rincian bayar + nomor antrian (UC03) | Tanda terima review; bukan nomor antrian/bukti bayar | Q5, Q6 terbuka |
| Biaya admin | Dibayar sebelum nomor antrian (Solusi 3) | Tidak ada | Tidak ada UC bayar (R-07) |
| Pengaturan sesi/kuota | Editor via aplikasi (UC27) | Operator via CLI | UC27 terbuka (R-02, Q1) |
| Batas waktu sesi | "Waktu sesi habis" (UC02, UC03) | Tidak ada timer; sesi ditutup operator | Q7 terbuka |
| Mendaftarkan orang lain | Diizinkan (§2.3 Asumsi 2) | Satu akun = satu tempat; dua orang perlu dua akun | Keputusan pengguna + Q8 |
| Otorisasi peran | Tersirat per peran | Pemilih peran hanya navigasi; token mana pun dapat membaca kapasitas | Belum ada model peran (A-3) |

### Belum tercakup
- **Terhalang keputusan (17):** UC02, UC02.1 (paket/harga), UC04 (nomor antrian), UC04.1 (estimasi), UC06 (surat), UC09 (worklist), UC10, UC10.1 (daftar ulang/identitas), UC11 (walk-in), UC14 (kirim hasil), UC15 (kolektif), UC17 (kirim surat), UC19, UC20 (antrean unit), UC22.2 (tarif), UC27 (waktu kerja/kuota), UC28 (informasi layanan).
- **Belum dikerjakan (15):** UC05 (denah), UC07 (riwayat), UC08 (ulasan/aduan), UC12 (catatan waktu), UC13, UC13.1 (verifikasi akhir), UC16, UC16.1 (surat keterangan), UC18 (input hasil), UC21 (kehadiran dokter), UC22, UC22.1 (verifikasi unit), UC23, UC24 (laporan), UC25 (laporan kepuasan).
- UC tanpa layar: UC05 (denah). UC11 dan UC20 untuk Dokter Unit mendapat layar pada §6.

## 5. Bahan sesi perbaikan berikutnya (belum dikerjakan)

1. Jalankan run integrasi penuh dan catat hasilnya sebelum menyatakan integrasi berfungsi.
2. Putuskan A-1 s.d. A-3: definisi admin, login/peran, dan layar/aksi mana yang dibatasi per peran. Setelah itu baru batasi `/management/capacity` dan panel token.
3. Putuskan A-4: perintah cabut token dan role database terpisah untuk API.
4. Jawab pertanyaan terbuka Q1–Q15 (`REQUIREMENTS_RESOLUTION.md` bagian E), terutama Q5/Q6 (biaya admin, nomor antrian) yang menahan UC01–UC04.
5. Tentukan maksud "graph/GraphQL" (bagian 2) sebelum menambah API apa pun.

## 6. Perubahan navigasi dan tata letak (14 Oktober 2026)

Rekomendasi 1–7 dari review koreksi pengguna dan catatan QA dikerjakan **hanya di frontend**; tidak ada perubahan backend, akses, login, atau peran. Keputusan D-1 s.d. D-9 (admin, login, batas akses, notifikasi, langkah vs tab, dan lainnya) tetap terbuka.

| No. | Rekomendasi | Implementasi |
| --- | --- | --- |
| 1 | Satu sumber navigasi | Kartu akses cepat dan grid layanan dihapus. Menu = tujuan (grup); layar terkait menjadi tab berupa tautan rute sehingga URL dan tombol back tetap bekerja |
| 2 | Aksi utama di atas | Blok "Use case dan status" dan catatan akun dummy dipindah ke **Info review** yang dapat diciutkan di bawah halaman. Beranda pasien diawali satu tombol **Daftar MCU** |
| 3 | Dashboard berbeda per peran | Pasien: Beranda dengan langkah berikutnya. Peran lain langsung mendarat di layar kerja utamanya (Daftar ulang, Verifikasi hasil, Antrean unit, Verifikasi hasil & tarif, Laporan, Pengaturan layanan); root peran redirect ke sana |
| 4 | Strip angka ringkas | Kartu metrik besar diganti satu strip "label —" per grup (misalnya Petugas Unit: nomor sedang dilayani, menunggu di unit, menunggu hasil dokter). "—" berarti belum ada data |
| 5 | Gabung halaman dengan tab | Menu dari 30 entri (7 dashboard + 23 layar) menjadi 12 tujuan: Pasien 4, Petugas MCU 2, Dokter MCU 2, Petugas Unit 1, Dokter Unit 1, Manajemen 1, Editor 1. "Status unit" digabung ke "Per unit" (UC09); "Konfirmasi biaya" digabung ke "Verifikasi hasil & tarif" (UC22.2 sub-UC dari UC22) |
| 6 | Antrean untuk Dokter Unit | Tab baru `/unit-doctor/queue` (UC20). Tab baru `/staff/add-patient` (UC11) juga ditambahkan sesuai tabel struktur |
| 7 | Navigasi pasien maks. 4 tujuan | Pasien memakai top bar + 4 tujuan (Beranda, Daftar MCU, MCU Saya, Riwayat) dan satu kolom 760px; peran lain tetap sidebar |

Pilihan yang diambil di dalam batas rekomendasi: Daftar MCU memakai **tab** (saran pengguna); langkah bertahap tetap pertanyaan terbuka. Kehadiran Dokter Unit tetap tab, bukan tombol header, karena check-in membutuhkan data unit/ruangan. Manajemen mendapat filter periode yang dinonaktifkan sampai data tersedia. Label kecil di atas judul (eyebrow) dan border tebal di sisi kartu dihapus.

Verifikasi (tanpa backend; alur integrasi tidak dijalankan): `npm run lint` dan `npm run build` lulus; 25 halaman `200` dan 8 redirect `307` pada `next start`; emulasi perangkat CDP: 25/25 halaman tanpa overflow horizontal pada 390px dan 1366px, tanpa error/warning console; detektor Impeccable 0 temuan. Komponen API (`registration.tsx`, `capacity.tsx`, `review-token.tsx`, `api.ts`) tidak diubah.

## 7. Wireframe pasien dan akun mockup (15 Oktober 2026)

Arahan pengguna: ikuti wireframe Figma "RS Haji MCU" (bagian Pengguna) sebagai kerangka, tampilan tetap memakai desain yang ada, data cukup mockup, dan sediakan akun mockup per peran. Desain tim "RS Haji SAK – Nopal" hanya direview: isinya layar sistem keuangan RSUD (hasil Google Stitch), bukan MCU, sehingga tidak dipakai.

| Frame wireframe | Implementasi |
| --- | --- |
| Login | `/`: form username/password terhadap akun mockup per peran, lalu ke halaman awal peran |
| Home 2 | `/patient`: header menu/ISLAH/akun, pemberitahuan "Tidak ada antrean saat ini", kartu nomor antrean, Lihat denah, Fitur kami 2×2, footer kontak (contoh) |
| Registrasi, TnR, Layanan, Rincian | `/patient/registration`: satu alur bertahap (4 langkah) dengan validasi; paket Haji/CPNS dan layanan tambahan memakai harga contoh wireframe; layanan yang sudah termasuk paket dinonaktifkan; total dihitung |
| Dapat Nomor Antrian | Langkah akhir registrasi: nomor contoh `A-xxx`, "Ketuk untuk lanjut" |
| Nomor Antrian | `/patient/tracking`: nomor, tombol estimasi (`--:-- WIB`, belum dihitung), denah placeholder |
| Aduan dan Ulasan | `/patient/feedback`: form mockup minimal (jenis, pesan) karena frame wireframe masih salinan form pendaftaran |

Penyesuaian bahasa: "Terms and Regulation" menjadi "Syarat dan ketentuan" (dengan centang persetujuan), "Laborarium" menjadi "Laboratorium", "SUBMIT" menjadi "Lanjut"/"Kirim pendaftaran", dan judul fitur memakai huruf kalimat. Riwayat MCU dan surat keterangan tidak punya frame; keduanya memakai pola yang sama.

Akses sesi registrasi yang tersambung backend dipindah ke `/patient/registration/session` (ditautkan dari Info review) agar tetap dapat diuji. Peran internal tidak ada di wireframe dan tidak diubah, kecuali login mockup dan menu akun. Admin mendarat di `/admin` dan dapat membuka semua ruang kerja; fitur admin sendiri belum ditetapkan (D-1 s.d. D-4 tetap terbuka).

Verifikasi (tanpa backend; alur integrasi tidak dijalankan): `npm run lint` dan `npm run build` lulus (26 rute); uji CDP pada 390px meliputi login salah/benar, alur registrasi lengkap (validasi, total Rp1.299.999 untuk CPNS + THT, NIK tersamar, nomor contoh), nomor tampil di beranda/nomor antrean/riwayat, satu transaksi per waktu, form aduan, isi `sessionStorage`, blokir pasien dari halaman staf, keluar, halaman awal 8 akun, akses admin; tanpa overflow horizontal pada 12 halaman; tanpa error/warning console; detektor Impeccable 0 temuan.

## 8. Wireframe v2 dan desktop untuk semua peran (16 Oktober 2026)

Rancangan dan keputusan: [`docs/plans/2026-10-16-wireframe-v2-desktop-design.md`](../plans/2026-10-16-wireframe-v2-desktop-design.md) (disetujui pemilik). Hanya frontend; backend, akses, dan login produksi tidak berubah. Bagian ini menggantikan rincian layar §7.

| Hal | Hasil |
| --- | --- |
| Wireframe v2 (12 frame) | Login, Home 2, Registrasi, TnR, Layanan, Rincian, Dapat Nomor Antrian, Nomor Antrian, Denah, Aduan dan Ulasan, Pengajuan Surat, Riwayat. Route baru `/patient/map`; registrasi dipecah per frame: `/patient/registration` → `/terms` → `/services` → `/review` → `/done`. Draft bertahan saat back dan reload (sesi mockup tab ini) |
| Isi celah wireframe | Tombol Lanjut di Registrasi dan TnR, centang setuju, paket dengan radio, total konsisten dengan pilihan, Home menampilkan pemberitahuan **atau** kartu nomor (tidak bersamaan), nomor contoh 3 digit, estimasi `--:-- WIB` belum dihitung (Q12), denah "belum tersedia" (R-15). Ejaan: "antrian", "Laboratorium", "WhatsApp", "Aduan dan ulasan" |
| Tata bahasa layout untuk semua peran | Satu kerangka: header (menu/back/tanpa header, ISLAH, akun) → judul → blok bertumpuk → aksi utama di akhir. Komponen dasar di `src/components/frame.tsx`. 17 layar internal + `/admin` memakai kerangka yang sama dengan contoh berlabel ("Data contoh"), label aksi PRD, dan Q-nomor terbuka di Info review |
| Metode desktop | Ekspansi sadar-konten: lebar ditambahkan di gutter dan celah, blok dilindungi (`rigid`, `aspect`, `measure`, `row`, `grid`, `fluid`), tahap container c1/c2/c3 (37.5/56.25/75rem), varian komposisi `center`, `hero-split`, `form-rail`, `list-summary`, `pair`, `rows`, `work`, `work-hero`. Urutan DOM = urutan baca di semua lebar. Menu internal menjadi rail kiri ≥ 64rem |

Verifikasi (tanpa backend; alur integrasi tidak dijalankan): fase 2 92/92 lulus (alur 12 frame), fase 3 265/265 lulus (layar internal dan admin), fase 4 0 FAIL untuk 44 kombinasi route × akun pada 9 lebar (320, 390, 600, 768, 900, 1024, 1280, 1440, 1920): tanpa overflow, urutan blok sama, proteksi dan ikatan blok terjaga, 9 redirect 307. Pemeriksaan akhir per frame terhadap wireframe: 12/12 lulus dengan penyimpangan yang disengaja. `npm run lint`, `npx tsc --noEmit`, `npm run build` (32 route) lulus.

Keputusan pemilik: Fitur Kami tetap 2×2 pada 320px; tabel antrian unit boleh menggulir di dalam wrapper-nya pada c2 (±1280px); `--row-box: 30rem` adalah track standar kotak label ↔ nilai.

Masih terbuka:

- Semua data pasien dan internal tetap **mockup** (sessionStorage tab, tidak dikirim). Yang tersambung backend tetap hanya `/patient/registration/session` (UC01/UC03 parsial) dan `/management/capacity` (UC26 parsial).
- Q1–Q15 (`REQUIREMENTS_RESOLUTION.md` bagian E), terutama Q5/Q6 (biaya, nomor antrian), Q12 (antrian klinis dan estimasi), Q3/Q11 (hasil dan WhatsApp).
- Konten dari RS: teks syarat dan ketentuan, gambar denah, daftar keperluan surat selain Haji/CPNS/Lainnya, isi Paket Haji, nomor kontak dan FAQ di footer.
- Wireframe belum punya layar menu/profil, sukses kirim surat/aduan, dan layar peran internal; bentuk saat ini adalah default tim.
- A-1 s.d. A-4 dan D-1 s.d. D-9 (admin, login, batas akses) tetap terbuka.

## 9. Model registrasi pemilik dan layout peran (18-19 Oktober 2026, tahap 2)

Dasar: brief implementasi pemilik 18 Oktober 2026 (status per butir di [OPEN_DECISIONS.md](OPEN_DECISIONS.md) bagian 10). Bagian ini menggantikan §1 (token), §3 (koneksi), §7 dan §8 untuk hal yang disebut di bawah.

| Area | Hasil |
| --- | --- |
| Backend | Migrasi 003 (maju saja; data sesi lama tidak dihapus). `GET /service-dates/current`, `GET /service-dates/{tanggal}`, `POST /applications` (Idempotency-Key), `GET /applications`, `GET /applications/{id}`, `POST /applications/{id}/cancel`. Route `/sessions*` dan `/entries*` dihapus. Kapasitas 100 tempat utama + 50 daftar tunggu FIFO per tanggal layanan; promosi FIFO dalam transaksi pembatalan; NIK disimpan sebagai HMAC (`ISLAH_NIK_KEY` wajib). CLI operator: `open-registration`, `close-registration`, `mark-no-service`, `registration-status`. Rincian: [REGISTRATION_BACKEND.md](REGISTRATION_BACKEND.md), `backend/TEST_RESULTS.md` |
| Alur pasien bertahap | Form kosong, tanpa diri sendiri/orang lain, prefill, anggota tersimpan, hubungan. Tanggal H+1 ditampilkan di setiap langkah dan dibekukan saat kirim. Hasil: "Pendaftaran tercatat", status "Menunggu pembayaran", kode pendaftaran; tanpa nomor antrian. Beranda menampilkan "Pendaftaran akun ini" dengan batal sebelum bayar. Data tetap di `sessionStorage` |
| Pendaftaran dengan token | `/patient/registration/session` memakai API baru: tanggal dari server, form field yang disetujui, pesan validasi server per field, status menunggu pembayaran/daftar tunggu dengan urutan, batal, riwayat |
| Kapasitas | `/management/capacity` menampilkan tanggal layanan berikutnya dan tanggal pilihan: terpakai/100, menunggu pembayaran, terkonfirmasi, tersedia, daftar tunggu/50, status. Tanpa angka 400 |
| Layout peran internal | Satu tata bahasa (judul → band atas → satu panel kerja → detail) dengan blok bersama di `roles/kit.tsx`. Kotak hitungan yang mengulang kolom status diganti filter chip dengan jumlah. Tambah pasien dan kolektif tampil nonaktif "Belum tersedia" |
| Konten | `src/content` (`site`, `internal`, `patient`) sebagai `SiteContent`; layar hanya menyusun tata letak dan data |
| Label | Label simulasi/demo/mockup/prototype/use case/UC/Data contoh/Info review/nomor Q dihapus dari kode sumber; `NEXT_PUBLIC_DEMO_LABELS` dan `src/lib/demo.ts` dihapus; nama akun netral |

Verifikasi yang dijalankan (19 Oktober 2026, laptop lokal Windows 11, Edge headless via CDP):

- Backend: `tests/integration.py` 3 run lulus (22 kelompok cek), `tests/route_guard.py` lulus, `pip check` bersih. Hasil dan latensi beserta lingkungannya: `backend/TEST_RESULTS.md`. Tidak ada klaim konkurensi 400.
- Frontend: `npm run lint`, `npx tsc --noEmit`, `npm run build` (36 route) lulus. `npm run check:ui` 29 route × 4 lebar tanpa masalah (overflow, error console, label terlarang). Uji alur pasien bertahap 104 cek lulus pada 390 dan 1440 px.
- End-to-end UI + backend (PostgreSQL 18.3 sementara, backend `ISLAH_ENV=test` dengan jam tetap 18 Oktober 2026 10.00 WIB, dihentikan setelah uji): 17 cek lulus: token, tanggal H+1 tanpa pemilih, form kosong, validasi NIK dari server, menunggu pembayaran dengan kode dan NIK tersamar, form tersembunyi saat ada pendaftaran belum selesai, NIK ganda ditolak dengan pesan persis, 99 pengisi sintetis lewat API, akun kedua masuk daftar tunggu urutan 1, pembatalan akun pertama mempromosikan akun kedua ke menunggu pembayaran, layar kapasitas 100/100 dan 0/50, tanggal lain "Belum dibuka", tanpa error console.

Keterbatasan: alur bertahap tidak memanggil backend (keputusan menyambungkannya belum ada); keyboard diuji lewat urutan DOM dan fokus dialog, bukan pembaca layar; tidak ada uji beban baru di luar `TEST_RESULTS.md`.
