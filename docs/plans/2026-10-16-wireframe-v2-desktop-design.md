# Rancangan: wireframe v2 untuk semua halaman + desktop sadar-konten

Status: **disetujui pemilik 16 Oktober 2026** (pendekatan B + semua default). Sumber: wireframe Figma "RS Haji MCU" (12 frame mobile 402×874, bagian Pengguna), analisis repo, dan riset seam carving (caire, Avidan & Shamir 2007). Desain tim "RS Haji SAK – Nopal" tidak dipakai (isinya sistem keuangan, bukan MCU).

Prinsip: wireframe adalah **kerangka layout**, bukan gaya visual. Tampilan tetap memakai sistem visual yang ada (putih, hijau `#16801C`, marun, gold, Geist). Data tetap **mockup berlabel**. Tidak ada kebijakan RS, harga, atau data medis karangan selain nilai contoh dari wireframe.

## 1. Halaman pasien (12 frame)

| Frame | Route | Isi yang dibangun |
| --- | --- | --- |
| Login | `/` | Selamat datang, kartu ISLAH, username, password, Masuk (akun mockup) |
| Home 2 | `/patient` | Header menu/ISLAH/akun; alert "Tidak ada antrian saat ini" **atau** kartu nomor (tidak bersamaan); "Lihat Denah" → `/patient/map`; Fitur Kami 2×2; footer kontak (contoh) + FAQ + identitas, hanya di Home |
| Registrasi | `/patient/registration` | Form pendaftaran + field **Pekerjaan** (isian bebas); tombol **Lanjut** (wireframe tidak punya tombol) |
| TnR | `/patient/registration/terms` | Kotak syarat dan ketentuan + centang setuju + Lanjut |
| Layanan | `/patient/registration/services` | Kartu paket (radio, bisa dibuka), Non paket dan tambahan (centang), Total dihitung otomatis, Lanjut |
| Rincian | `/patient/registration/review` | Kotak Identitas, kotak Layanan dan biaya, Kirim |
| Dapat Nomor Antrian | `/patient/registration/done` | Tanpa header; kartu nomor besar; "Ketuk untuk lanjut" → Nomor Antrian |
| Nomor Antrian | `/patient/tracking` | Kartu nomor; tombol "Hitung Estimasi Waktu Tunggu" → hasil `--:-- WIB` (mockup) |
| Denah | `/patient/map` (baru) | Judul + area gambar (placeholder "Denah belum tersedia") |
| Aduan dan Ulasan | `/patient/feedback` | Jenis Pesan (Aduan/Ulasan), Nilai Pelayanan 5 bintang (radio), Pesan, Kirim, konfirmasi |
| Pengajuan Surat | `/patient/certificates` | Keperluan (Haji/CPNS/Lainnya, dari teks kartu Home), isian "Lainnya" kondisional, Kirim, konfirmasi |
| Riwayat | `/patient/results` | Daftar kartu riwayat dari sesi mockup (bisa lebih dari satu) |

Draft registrasi disimpan di sesi mockup sehingga back, back browser, dan reload tidak menghapus progres. Satu transaksi per pasien per waktu (PRD Batasan 4) tetap berlaku. Alur backend `/patient/registration/session` dipertahankan.

Celah wireframe yang diisi dengan default: tombol lanjut di Registrasi dan TnR, pemilihan paket dengan radio, total yang konsisten dengan pilihan, "Laboratorium", judul "Aduan dan Ulasan", "WhatsApp", tombol utama berwarna aktif (bukan abu yang tampak nonaktif). Ejaan mengikuti PRD dan wireframe: **antrian**.

## 2. Tata bahasa layout (semua halaman)

Urutan mobile: header (menu | back | tanpa header; ISLAH di tengah; akun di kanan) → judul di tengah (+ subjudul) → blok bertumpuk selebar konten → aksi utama selebar penuh di akhir (di-anchor ke bawah pada layar mobile bila halaman pendek).

Komponen dasar (`src/components/frame.tsx`): `Compose`, `Block`, `TitleBlock`, `Alert`, `BigNumberCard`, `FeatureGrid`, `Field`, `StarRating`, `ListCard`, `SummaryBox`, `MediaArea`, `BottomAction`. `EmptyState`, `ReviewInfo`, `DataTable`, `Section` tetap.

Halaman internal memakai tata bahasa yang sama: header dengan menu, judul, kartu nomor bila ada angka utama (misalnya "Nomor sedang dilayani"), daftar kartu di mobile dan tabel berbatas di desktop, aksi utama dengan label PRD (Verifikasi, Kirim, Ubah Kehadiran, Ubah Kuota). Tab dan strip angka diganti item menu dan kartu ringkasan. Pendaratan tetap langsung ke layar kerja utama. Data internal: **contoh berlabel** (default 2). Judul halaman internal dengan tabel lebar rata kiri di desktop (default 5).

## 3. Desktop: ekspansi sadar-konten ("caire terbalik")

- **Energi blok:** E4 tidak pernah diregangkan (aksi utama, nomor antrian, Total, tabel kerja); E3 tumbuh sampai batas proteksi (field, kartu, gambar); E2 boleh pindah ke track samping (judul, label, stepper); E1 pendukung (catatan, Info review, footer); E0 tempat lebar disisipkan (gutter, celah antar blok, celah anchored).
- **Proteksi (analog deteksi wajah):** `rigid` (tombol ≥44px, ≤ measure), `aspect` (kartu nomor, denah), `measure` (form ≤40rem, teks 68ch), `row` (label ↔ nilai ≤35rem), `grid` (item 10–17.5rem; tambah kolom, bukan melebar), `fluid` (tabel ≤ Σ kolom, cap 75rem). Ikatan yang tidak boleh dipisah: label ≡ field ≡ error, label ≡ nomor, Total ≡ aksi, centang setuju ≡ Lanjut.
- **Tahap container (bukan viewport):** c1 ≥ 600px (37.5rem), c2 ≥ 900px (56.25rem), c3 ≥ 1200px (75rem); naik ≈1,5× per tahap. Urutan operasi: lebarkan margin → skala terbatas → tambah kolom item berulang → lipat stack di celah termurah (prefix ke kiri, suffix ke kanan) → beri lebar ke blok fluid → berhenti dan pusatkan.
- **Aturan komposisi:** urutan DOM = urutan baca = urutan mobile di semua lebar (tanpa `order`, `dense`, `*-reverse`, DOM ganda); aksi utama tetap di akhir grupnya; tepi bersama tetap bersama; anchored-low dibatalkan di ≥ c1; header/footer dibatasi lebar komposisi.
- **Varian komposisi:** `center` (Login, TnR, Dapat Nomor, Nomor Antrian, Denah, Aduan, Surat), `hero-split` (Home: grup nomor kiri, fitur kanan, cap 65rem), `form-rail` (Registrasi: rail langkah kiri + form 40rem), `list-summary` (Layanan: daftar + ringkasan sticky; c3 paket | non paket), `pair` (Rincian, Admin), `rows` (Riwayat: kartu menjadi baris sejajar), `work` (internal: tabel berbatas, detail sticky di c3), `work-hero` (antrian unit: kartu sedang dilayani + daftar).
- **Shell:** menu hamburger di mobile; untuk peran internal menu dilipat menjadi rail kiri pada viewport ≥ 64rem. Pasien tetap memakai menu hamburger di semua lebar.

## 4. Fase dan pembagian file

| Fase | Isi | Pemilik file |
| --- | --- | --- |
| 1 | Fondasi: `frame.tsx`, shell (`prototype.tsx`, `nav-menu.tsx`), token CSS (font dasar 16px, gutter, measure), container `page`, varian komposisi, `workspaces.ts` dipecah ke `screens-patient.ts` dan `screens-internal.ts` | koordinator |
| 2 | 12 frame pasien, sub-route registrasi, sesi mockup (draft, riwayat) | subagent A: `patient*.tsx`, `screens-patient.ts`, `mock-session.ts`, `mock-catalog.ts`, `styles/patient.css`, `app/patient/**` |
| 3 | 17 layar internal + admin | subagent B: `components/roles/**`, `workspace.tsx`, `screens-internal.ts`, `mock-records.ts`, `styles/internal.css`, `app/{staff,clinician,unit-staff,unit-doctor,management,editor,admin}/**` |
| 4 | Verifikasi tata letak (skrip CDP) dan penyetelan varian | subagent C |
| 5 | Pemeriksaan akhir terhadap wireframe + dokumen | requirement checker |

## 5. Verifikasi

`npm run lint`, `npm run build`; semua route 200 dan redirect 307; alur wireframe ujung ke ujung; pada 320/390/600/768/900/1024/1280/1440/1920: tanpa overflow horizontal, tanpa `order`/`dense`/`reverse`, urutan blok DOM sama di semua lebar, blok terlindungi dalam batas, ikatan menempel, aksi utama ≤48px dari blok sebelumnya di ≥ c1, stop rule terpusat; screenshot 390/768/1024/1440/1920; tanpa error console; detektor Impeccable.

## 6. Hasil implementasi (16 Oktober 2026)

Fase 1–5 selesai; tidak ada perubahan backend.

| Fase | Hasil |
| --- | --- |
| 1 | `frame.tsx` (komponen dasar di atas), shell `prototype.tsx` + `nav-menu.tsx` (satu `<nav>`: drawer di mobile, rail kiri untuk peran internal ≥ 64rem), token dan varian komposisi di `globals.css`, container `page` (c1 37.5rem, c2 56.25rem, c3 75rem), `workspaces.ts` dipecah ke `screens-patient.ts` dan `screens-internal.ts` |
| 2 | 12 frame pasien + sub-route registrasi `terms`, `services`, `review`, `done` dan route baru `/patient/map`; sesi mockup (draft, riwayat, aduan, surat) di `mock-session.ts` |
| 3 | 17 layar internal + `/admin` dengan contoh berlabel ("Data contoh"), label aksi PRD, dan Q-nomor terbuka di Info review. Tabel kerja memakai `RecordTable` (`components/roles/kit.tsx`) |
| 4 | Penyetelan varian dan pemeriksaan tata letak otomatis |
| 5 | Pemeriksaan per frame terhadap wireframe dan pembaruan dokumen |

Keputusan pemilik atas pertanyaan fase 4:

- **Fitur Kami tetap 2×2 pada 320px** (sesuai wireframe), walaupun kartu menjadi ±138px, di bawah batas `grid` 10rem.
- **Tabel antrian unit boleh menggulir di dalam wrapper-nya pada c2** (viewport ±1280px, `/unit-staff/queue` dan `/unit-doctor/queue`); di luar itu tabel tetap tanpa gulir di c2+.
- **`--row-box: 30rem` adalah track standar untuk kotak label ↔ nilai** (Rincian, daftar Layanan, Riwayat, detail samping); tetap di bawah batas `row` 35rem.

Verifikasi: fase 2 92/92 lulus; fase 3 265/265 lulus; fase 4 0 FAIL untuk 44 kombinasi route × akun pada 9 lebar (320–1920), termasuk 9 redirect 307, tanpa `order`/`dense`/`reverse` di CSS, 160 screenshot (390/768/1024/1440/1920). Pemeriksaan akhir fase 5: 12 frame lulus dengan penyimpangan yang disengaja (bahasa Indonesia, tombol lanjut, alert *atau* kartu nomor, contoh berlabel); dua perbaikan teks kecil ("antrian", "WhatsApp"). `npm run lint`, `npx tsc --noEmit`, `npm run build` (32 route) lulus.
