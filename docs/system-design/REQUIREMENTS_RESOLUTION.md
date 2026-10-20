# Resolusi Kebutuhan, Keterlacakan, dan Cakupan Iterasi Web Registrasi

> **Diperbarui 18 Oktober 2026:** R-06 (maks. 400 peserta/hari sebagai kuota) dan R-10 (satu tempat aktif per akun; rencana 3 per akun + 1 per NIK) digantikan oleh keputusan pemilik: kapasitas layanan 100 tempat utama + 50 daftar tunggu FIFO per tanggal layanan, 400 hanya referensi teknis, satu registrasi per akun per hari dengan satu pasien. Q6 diputuskan (nomor antrian setelah pembayaran terverifikasi); registrasi hanya untuk H+1. Status semua Q dan OD ada di OPEN_DECISIONS bagian 6 s.d. 8. Isi di bawah dibiarkan sebagai riwayat; rinciannya di [RECONCILIATION_2026-10-18.md](RECONCILIATION_2026-10-18.md).

> **Pembaruan 18 Oktober 2026, tahap 2 (berlaku di atas banner sebelumnya).** Brief implementasi pemilik menetapkan: satu pendaftaran per akun per **tanggal layanan** (bukan per hari pengajuan) dan satu aplikasi belum selesai per akun; hold dibuat saat konfirmasi Rincian tanpa batas waktu; promosi daftar tunggu FIFO otomatis; NIK duplikat per tanggal layanan ditolak; 400 dihapus dari aturan bisnis dan kriteria penerimaan; pembayaran tidak dibangun. Model ini sudah dibangun di backend (migrasi 003, `/api/v1/service-dates`, `/api/v1/applications`). Status setiap butir: [OPEN_DECISIONS.md](OPEN_DECISIONS.md) bagian 10; desain backend: [REGISTRATION_BACKEND.md](REGISTRATION_BACKEND.md).

| Metadata | Nilai |
| --- | --- |
| Tanggal / status | 13 Oktober 2026 / usulan requirement engineer, menunggu review pemilik PRD |
| Sumber otoritatif | [PRD](../Digitalisasi%20MCU%20RSUD%20Haji.md) (UC01–UC28), dengan revisi kapasitas pada [REGISTRATION_BACKEND.md](REGISTRATION_BACKEND.md) |
| Kode yang diperiksa | `backend/app/*.py`, `backend/migrations/00{1,2}_*.sql`, `frontend/src/lib/workspaces.ts`, `frontend/src/app/**/page.tsx`, `graphify-out/GRAPH_REPORT.md` |
| Bukan sumber aturan | `design/` (historis). Angka polling 10–15 detik, p95 500 ms, RPO/RTO dll. di `SYSTEM_DESIGN.md` hanya usulan, bukan keputusan |

Dokumen ini tidak mengubah PRD. Perbaikan editorial di bawah adalah cara membaca PRD untuk implementasi sampai pemilik PRD memperbaruinya sendiri.

Klasifikasi: **E** = kesalahan editorial, dapat diselesaikan dari teks PRD sendiri. **K** = konflik yang diselesaikan oleh keputusan pengguna yang sudah ada. **T** = benar-benar terbuka, perlu konfirmasi stakeholder (pertanyaan di bagian E).

## A. Register resolusi

| ID | Bukti (kutipan + bagian PRD) | Kls. | Resolusi / usulan resolusi | Dampak implementasi sekarang |
| --- | --- | --- | --- | --- |
| R-01 | Tidak ada UC yang ditautkan ke kode. Backend hanya punya `GET /sessions`, `GET /sessions/{id}`, `POST /sessions/{id}/entries`, `GET/DELETE /entries/{id}`, `POST /entries/{id}/submit` (`backend/app/routes.py`) | E (celah dokumentasi) | Diselesaikan oleh matriks di bagian B. Backend yang ada = **potongan UC01** (akses sesi registrasi, FIFO, tanda terima) + bacaan agregat untuk UC26. Metadata layar di `workspaces.ts` diberi daftar UC dan status (bagian C) | Setiap PR berikutnya menyebut ID UC. Layar menampilkan ID UC |
| R-02 | UC27 judul "Mengatur Waktu Kerja", deskripsi "mengubah hari atau tanggal libur pelayanan" (§2.1.7, §3.2.27); flow: "Menekan 'Ubah Kuota' … Menginput nilai kuota baru"; post-condition "Perubahan kuota yang dapat diisi" | E + T | Bagian editorial: flow UC27 tidak cocok dengan judul. Usulan: UC27 = Editor **menulis** kalender (hari libur) dan, bila dikonfirmasi, kuota; UC26 = Manajemen **membaca** kuota (read-only). Hubungan UC26↔UC27 = penulis↔pembaca data kuota yang sama. Apakah Editor boleh mengubah kuota, berapa nilainya, dan kuota layanan khusus mana: **terbuka (Q1, Q2)** | `/editor/calendar` tetap placeholder "menunggu keputusan". Sesi tetap dibuka/ditutup operator via CLI. Kapasitas harian di DB tetap 400 (`CHECK 1..400`), tanpa jalur ubah |
| R-03a | UC07 dan UC08 "Use Case Terkait: **UC16**. Mengirim Hasil MCU" (§3.2.7, §3.2.8); UC16 = "Membuat Surat Keterangan" | E | Dibaca sebagai **UC14** Mengirim Hasil MCU (cocok nama, §3.2.14) | Hanya matriks |
| R-03b | UC13 "Use Case Terkait: **UC15**. Mengirim Hasil MCU" (§3.2.13); UC15 = "Memasukkan Pendaftaran Kolektif" | E | Dibaca sebagai **UC14** | Hanya matriks |
| R-03c | UC22 "Use Case Terkait: … **UC18**. Mengubah Status Kehadiran" (§3.2.22); UC18 = "Input Hasil Layanan" | E | Dibaca sebagai **UC21** Mengubah Status Kehadiran (§3.2.21) | Hanya matriks |
| R-04 | UC15 "Memasukkan Pendaftaran Kolektif", deskripsi: "Dokter MCU dapat membuat surat keterangan tentang kesehatan pasien…" = identik dengan deskripsi UC16 (§3.2.15 vs §3.2.16) | E | Deskripsi UC15 dibaca dari §2.1.3: "Dokter MCU dapat mendaftarkan peserta kolektif seperti peserta haji dengan menginput file CSV berisikan data data pasien." Flow UC15 (tanggal, jumlah, CSV, akun sementara) sudah konsisten dengan teks ini. Detail impor tetap **terbuka (Q4)** | `/clinician/collective` placeholder "menunggu keputusan" |
| R-05 | §1.2 Solusi 9: "Hasil … diberikan secara digital melalui aplikasi berupa file .pdf … dapat selalu diunduh melalui aplikasi". UC14 post-condition: "Hasil MCU terkirim ke Whatsapp pasien". UC06, UC16, UC16.1, UC17 juga mensyaratkan hasil "melalui Whatsapp". UC07 (Riwayat) hanya memuat "data registrasi, tanggal, dan pembayaran" | T | Spesifikasi UC: kanal pengiriman = WhatsApp (UC14). Solusi 9 (PDF di aplikasi, dapat diunduh kapan pun) **tidak punya UC**. Usulan: keduanya berlaku: PDF tersimpan dan dapat diunduh di aplikasi, WhatsApp sebagai notifikasi/pengiriman. Lampiran vs tautan dan apakah unduh in-app menjadi bagian UC07: **terbuka (Q3)** | Tidak ada. Hasil dan notifikasi di luar cakupan. `/patient/results` placeholder |
| R-06 | §2.4 Batasan 5 "MCU hanya menerima 100 pasien per harinya"; UC26 pre-condition "Kuota MCU sudah ditetapkan dari awal (100)" | K | Diganti keputusan pengguna terbaru: maks **400 peserta/hari** (dihitung saat submit, lintas semua sesi pada tanggal itu), **100 aktif + 50 tunggu per sesi**, FIFO. "±400 request/hari" adalah asumsi beban, bukan rate limit. Angka 100 di PRD, `SYSTEM_DESIGN.md` §2, `DATABASE_DESIGN.md` §4 historis | Sudah diterapkan di backend (`service_day.capacity` default 400, slot 100/50). UI menampilkan angka dari API, tidak di-hardcode selain label 100/50 dari respons |
| R-07 | UC02 "Use Case Terkait: UC03 **Membayar Biaya Admin**"; UC03 berjudul "Melihat Rincian Pembayaran, Hasil Registrasi, dan Nomor Antrian Baru" (tanpa aksi bayar). §1.2 Solusi 3 mewajibkan bayar biaya admin | E + T | Rujukan dibaca sebagai UC03 (judul sebenarnya). Tidak ada UC untuk **membayar** biaya admin: celah kebutuhan, nominal/gateway/biaya admin **terbuka (Q5)** | Pembayaran di luar cakupan. UC03 hanya parsial: tanda terima review |
| R-08 | Penerbitan nomor antrian: UC03 "nomor antrian yang diberikan oleh sistem berdasar urutan registrasi"; Solusi 3 "biaya admin sebagai tanda awal penerimaan nomor antrian"; UC10 "memasukkan pasien ke dalam Smart Queue" | T | Saat nomor antrian MCU diterbitkan (registrasi, setelah bayar, atau daftar ulang) **terbuka (Q6)**. Wajib: posisi tunggu FIFO registrasi dan `submission.id` **bukan** nomor antrian MCU (UC04) | UI memakai istilah "posisi tunggu sesi registrasi" dan "tanda terima registrasi review"; dilarang memakai "nomor antrian" |
| R-09 | UC02, UC02.1, UC03: "Waktu sesi habis … 'Sesi anda telah habis!'" | T | Durasi dan arti "sesi" (sesi form pengguna atau sesi registrasi operator) belum diputuskan; tidak ada durasi, idle expiry, atau penutupan otomatis. **Terbuka (Q7)** | Tidak ada timer di UI. Tiket hanya berakhir karena keluar, submit, atau operator menutup sesi (`cancelled`) |
| R-10 | §2.3 Asumsi 2: "Pengguna … mendaftarkan orang lain sebagai pasien … orang tuanya"; §2.4 Batasan 4: "Satu pasien hanya dapat mengambil satu transaksi MCU per waktunya" | K + T | Diputuskan: satu akun (principal) = satu tempat aktif/tunggu lintas sesi (`409 ACTIVE_IN_OTHER_SESSION`); dua sesi sekaligus perlu dua akun. Principal belum terhubung ke pasien terverifikasi, jadi Batasan 4 per orang belum dijamin. Delegasi (satu akun untuk beberapa pasien) **terbuka (Q8)** | Sudah di backend (migrasi `002`). UI menampilkan pesan 409 |
| R-11 | UC20 "Use Case Terkait: UC20. Melihat Antrian Unit" (merujuk dirinya sendiri) | E | Dibaca sebagai UC19 (pasangan timbal balik, UC19 merujuk UC20) | Hanya matriks |
| R-12 | Notasi "UC0.2", "UC0.3", "UC0.4" (UC03, UC04, UC04.1, UC05) | E | Dibaca UC02, UC03, UC04 | Hanya matriks |
| R-13 | UC22 berjudul "**Memerifikasi** Hasil Pemeriksaan Unit"; §2.1.5 dan UC22.1 menulis "Memverifikasi" | E | Judul = "Memverifikasi Hasil Pemeriksaan Unit" | Tidak ada |
| R-14 | UC04 (Melihat Nomor Antrian) memakai deskripsi estimasi waktu tunggu yang sama dengan UC04.1; UC02.1 menyalin pre-condition UC02 ("memilih minimal 1 layanan") ke post-condition dan kolom Alternate Flow | E | UC04 = melihat nomor antrian aktif (sesuai flow-nya); estimasi hanya di UC04.1. UC02.1 = tampilan daftar layanan; exception = "Tidak ada layanan yang tersedia" dan "Waktu sesi habis" | Tidak ada (UC02/UC04 belum diimplementasikan) |
| R-15 | UC20 aktor "Petugas Unit Layanan & Dokter Unit Pelayanan"; §2.1.5 memuat "Melihat Antrian Unit" untuk Dokter Unit. `workspaces.ts` Dokter Unit tidak punya layar antrean. UC11 Menambah Pasien dan UC05 Melihat Denah juga tanpa layar khusus | E (celah layar) | Dicatat di matriks sebagai "tanpa layar". Usulan penempatan: UC20 Dokter Unit → layar baru `/unit-doctor/queue`; UC11 → `/staff/patient`; UC05 → `/patient/tracking`. Tidak dibuat pada iterasi ini | Tidak ada layar baru |
| R-16 | UC15 pre-condition "Kuota harian masih tersedia"; flow "memenuhi kuota harian selama sesi pengisian berlangsung"; UC11 menambah pasien walk-in | T | Apakah peserta kolektif dan walk-in memakai kuota 400/hari yang sama: **terbuka (Q4, Q14)** | Tidak ada; kuota hanya dikonsumsi `submit` |
| R-17 | `SYSTEM_DESIGN.md` §4/§9 mengusulkan polling 10–15 detik, p95 < 500 ms, cookie HttpOnly | K | Keputusan pengguna: interval polling, target latensi, Retry-After tidak ditetapkan. Iterasi ini: **refresh manual**, token review di memori (bukan login produksi). Angka di SYSTEM_DESIGN tetap usulan | Tidak ada polling otomatis, tidak ada auto-retry |
| R-18 | UC06 "paling lambat 1 hari setelah hasil MCU dikeluarkan" | T | Arti "1 hari" (hari kalender vs 24 jam) **terbuka (Q9)** | Tidak ada |

## B. Matriks keterlacakan

Status: **Implemented-partial** = sebagian alur ada (backend sudah; web pada iterasi ini). **Not implemented** = belum dikerjakan, tidak terhalang keputusan kebijakan. **Blocked** = menunggu keputusan terbuka (Q-nomor). Endpoint relatif terhadap `/api/v1`. **Mockup UI** (16 Okt) = layar sesuai wireframe/PRD dengan data contoh berlabel, hanya di browser (tanpa backend); status backend/produksi ditulis sesudahnya.

### B.1 UC → peran → rute → endpoint

| UC | Nama | Aktor | Rute frontend | Endpoint backend (nyata) | Status |
| --- | --- | --- | --- | --- | --- |
| UC01 | Melakukan Registrasi | Pengguna | `/patient/registration`, `/patient/registration/terms`; backend: `/patient/registration/session` | `GET /sessions`, `GET /sessions/{id}`, `POST /sessions/{id}/entries`, `GET /entries` (baru, C.3), `GET /entries/{id}`, `DELETE /entries/{id}`, `POST /entries/{id}/submit` | Implemented-partial (backend, `/session`): akses sesi + FIFO + tanda terima. Mockup UI: form data diri + Pekerjaan, syarat dan ketentuan. Data diri/NIK/T&C produksi: Blocked (identitas, Q8) |
| UC01.1 | Membatalkan Pendaftaran (**tambahan 17 Okt 2026**, tidak ada di PRD) | Pengguna | `/patient` (kotak antrian akun → buka baris → Batalkan pendaftaran) | — (backend punya `DELETE /entries/{id}` untuk sesi registrasi, belum untuk pendaftaran MCU) | Mockup UI: pembatalan dengan konfirmasi; nomor dilepas, kuota akun kembali, riwayat tetap dengan status Dibatalkan. Batas waktu pembatalan dan pengembalian biaya: terbuka (Q5) |
| UC02 | Memilih Paket Layanan | Pengguna | `/patient/registration/services` (`/patient/packages` redirect) | — | Mockup UI (harga contoh wireframe); data paket/harga: Blocked (Q5) |
| UC02.1 | Melihat Paket Layanan | Pengguna | `/patient/registration/services` | — | Mockup UI; data paket/harga: Blocked (Q5) |
| UC03 | Melihat Rincian Pembayaran, Hasil Registrasi, Nomor Antrian Baru | Pengguna | `/patient/registration/review`, `/patient/registration/done`; tanda terima: `/patient/registration/session` | `POST /entries/{id}/submit`, `GET /entries/{id}` (`submission`) | Implemented-partial (backend): tanda terima review saja. Mockup UI: rincian + nomor contoh 3 digit. Rincian bayar, nomor antrian: Blocked (Q5, Q6) |
| UC04 | Melihat Nomor Antrian | Pengguna | `/patient`, `/patient/tracking` | — | Mockup UI (nomor contoh); Blocked (Q6) |
| UC04.1 | Melihat Estimasi Waktu Tunggu | Pengguna | `/patient/tracking` | — | Mockup UI (`--:-- WIB`, tidak dihitung); Blocked (algoritma antrian klinis, Q12) |
| UC05 | Melihat Denah | Pengguna | `/patient/map` (baru; tombol Lihat Denah di `/patient`) | — | Mockup UI: area gambar placeholder; gambar denah RS belum tersedia (R-15) |
| UC06 | Mengajukan Permohonan Surat Keterangan | Pengguna | `/patient/certificates` | — | Mockup UI (form Keperluan, tidak dikirim); Blocked (Q9, Q11) |
| UC07 | Melihat Riwayat MCU | Pengguna | `/patient/results` | — | Mockup UI (riwayat pendaftaran contoh); produksi butuh akun pasien; PDF hasil (Q3) |
| UC08 | Mengajukan Ulasan dan Aduan | Pengguna | `/patient/feedback` | — | Mockup UI (form wireframe, tidak dikirim); backend Not implemented |
| UC09 | Melihat Worklist Pasien per Unit | Petugas MCU | `/staff/worklist` | — | Mockup UI (hanya baca); Blocked (Q12) |
| UC10 | Memvalidasi Registrasi Ulang | Petugas MCU | `/staff/patient` | — | Mockup UI; Blocked (identitas, Q6) |
| UC10.1 | Mengubah Data Registrasi Pasien | Petugas MCU | `/staff/patient` | — | Mockup UI (Ubah hanya tampilan); Blocked (identitas) |
| UC11 | Menambah Pasien | Petugas MCU | `/staff/patient` (pop-up Tambah pasien; `/staff/add-patient` diarahkan ke sini sejak 17 Okt) | — | Mockup UI; Blocked (Q14; nomor antrian Q6) |
| UC12 | Melihat Catatan Waktu Layanan | Petugas MCU | `/staff/worklist` (digabung dengan UC09 sejak 17 Okt; `/staff/timing` diarahkan ke sini) | — | Mockup UI (hanya baca); backend Not implemented (bergantung UC19) |
| UC13 | Memverifikasi Hasil MCU | Dokter MCU | `/clinician/review` | — | Mockup UI; backend Not implemented |
| UC13.1 | Melihat Hasil MCU | Dokter MCU | `/clinician/review` | — | Mockup UI; format hasil/PDF menunggu (Q3) |
| UC14 | Mengirim Hasil MCU | Dokter MCU | `/clinician/review` | — | Mockup UI; Blocked (Q3, Q11) |
| UC15 | Memasukkan Pendaftaran Kolektif | Dokter MCU | `/clinician/collective` | — | Mockup UI (file tidak dibaca); Blocked (Q4) |
| UC16 | Membuat Surat Keterangan | Dokter MCU | `/clinician/certificates` | — | Mockup UI; backend Not implemented (template surat belum ada) |
| UC16.1 | Melihat Permohonan Surat Keterangan | Dokter MCU | `/clinician/certificates` | — | Mockup UI; backend Not implemented |
| UC17 | Mengirim Surat Keterangan | Dokter MCU | `/clinician/certificates` | — | Mockup UI; Blocked (Q11) |
| UC18 | Input Hasil Layanan | Petugas Unit | `/unit-staff/results` | — | Mockup UI; backend Not implemented (template hasil per unit belum disetujui) |
| UC19 | Mengonfirmasi Arus Keluar Masuk | Petugas Unit | `/unit-staff/queue` | — | Mockup UI (Masuk/Keluar hanya mengubah tampilan); Blocked (Q12) |
| UC20 | Melihat Antrian Unit | Petugas Unit, Dokter Unit | `/unit-staff/queue`, `/unit-doctor/queue` | — | Mockup UI; Blocked (Q12) |
| UC21 | Mengubah Status Kehadiran | Dokter Unit | `/unit-doctor/presence` | — | Mockup UI; backend Not implemented (data unit/ruangan) |
| UC22 | Memverifikasi Hasil Pemeriksaan Unit | Dokter Unit | `/unit-doctor/review` | — | Mockup UI; backend Not implemented |
| UC22.1 | Melihat Hasil Pemeriksaan Unit | Dokter Unit | `/unit-doctor/review` | — | Mockup UI; backend Not implemented |
| UC22.2 | Konfirmasi Tarif | Dokter Unit | `/unit-doctor/review` | — | Mockup UI (harga contoh); Blocked (Q13) |
| UC23 | Melihat Laporan per Unit | Manajemen | `/management/reports` | — | Mockup UI (angka dari jam contoh); backend Not implemented (bergantung UC19) |
| UC24 | Melihat Laporan Antrian | Manajemen | `/management/reports` | — | Mockup UI (filter periode); backend Not implemented (bergantung UC19) |
| UC25 | Melihat Laporan Kepuasan dan Aduan | Manajemen | `/management/feedback` | — | Mockup UI (contoh); backend Not implemented (bergantung UC08) |
| UC26 | Memantau Kuota Layanan | Manajemen | `/management/capacity` | `GET /sessions`, `GET /sessions/{id}` | Implemented-partial: kapasitas registrasi saja. Kuota layanan khusus: Blocked (Q2) |
| UC27 | Mengatur Waktu Kerja | Editor | `/editor/calendar` | — (sesi via CLI `create-session`/`close-session`, bukan UC27) | Mockup UI; Blocked (Q1) |
| UC28 | Mengubah Informasi Pelayanan | Editor | `/editor/services` | — | Mockup UI (paket/harga contoh); Blocked (Q5) |

Endpoint/perintah tanpa UC: `GET /health`, `GET /ready` (operasional); CLI `init-db`, `create-client` (principal review), `create-session`, `close-session` (operasional sesi, PRD §1.2 Solusi 2).

#### UC01.1 Membatalkan Pendaftaran (usulan tambahan)

PRD (UC01–UC28) tidak memuat pembatalan atau penghapusan pendaftaran. Ditambahkan 17 Oktober 2026 atas permintaan pemilik.

| Bagian | Isi |
| --- | --- |
| Deskripsi | Pengguna membatalkan pendaftaran MCU yang masih aktif, untuk dirinya atau orang lain yang ia daftarkan dari akunnya. |
| Aktor | Pengguna (pemilik akun yang mendaftarkan) |
| Use Case Terkait | UC01 Melakukan Registrasi, UC04 Melihat Nomor Antrian |
| Pre-Conditions | Pendaftaran berstatus aktif (menunggu) di akun pengguna |
| Post-Conditions | Nomor antrian dilepas, kuota akun bertambah satu, riwayat (UC07) mencatat pendaftaran sebagai Dibatalkan |
| Flow of Events | 1. Pengguna membuka baris antrian di Beranda dan menekan "Batalkan pendaftaran". 2. Sistem meminta konfirmasi. 3. Pengguna memilih "Ya, batalkan". 4. Sistem membatalkan pendaftaran dan memperbarui kotak antrian. |
| Alternate Flow/Exception | Pengguna memilih "Tidak": tidak ada perubahan. Pendaftaran sudah dilayani/selesai: tidak dapat dibatalkan (aturan RS menunggu). |
| Terbuka | Batas waktu pembatalan, pengembalian biaya admin (Q5), dan dampak ke nomor antrian orang lain (Q6). |

### B.2 Cakupan rute (setiap rute muncul minimal sekali)

**Pembaruan 14 Oktober 2026:** navigasi dikelompokkan menjadi tujuan + tab (lihat [MVP_REVIEW.md](MVP_REVIEW.md) §6). Root peran selain pasien dan rute yang digabung kini redirect 307 lewat `frontend/next.config.ts`.

**Pembaruan 16 Oktober 2026:** wireframe v2 (12 frame) dan kerangka layout yang sama untuk semua peran (lihat [MVP_REVIEW.md](MVP_REVIEW.md) §8). Registrasi dipecah per frame, `/patient/map` baru, layar internal menjadi Mockup UI dengan contoh berlabel.

| Rute | UC | Perlakuan iterasi ini |
| --- | --- | --- |
| `/` | — | Login mockup per peran (frame Login) |
| `/admin` | — | Area admin mockup: daftar ruang kerja dan akun |
| `/patient` | UC01.1, UC04, UC04.1, UC05 | Mockup UI Beranda hub (17 Okt): info akun, kotak antrian akun berukuran tetap (maks. 3 orang, estimasi, batalkan), bento, Denah; Riwayat, Surat, Aduan dan Ulasan, Denah terbuka sebagai pop-up (intercepting route) |
| `/patient/registration` | UC01 | Mockup UI frame Registrasi (langkah 1 dari 4) |
| `/patient/registration/terms` | UC01 | Mockup UI frame TnR (baru, 16 Okt) |
| `/patient/registration/services` | UC02, UC02.1 | Mockup UI frame Layanan (baru, 16 Okt) |
| `/patient/registration/review` | UC03 | Mockup UI frame Rincian (baru, 16 Okt) |
| `/patient/registration/done` | UC03 | Mockup UI frame Dapat Nomor Antrian (baru, 16 Okt) |
| `/patient/registration/session` | UC01, UC03 | **Dibangun** (C.1): akses sesi backend |
| `/patient/packages` | UC02, UC02.1 | Redirect ke `/patient/registration` |
| `/patient/tracking` | UC04, UC04.1 | Mockup UI frame Nomor Antrian |
| `/patient/map` | UC05 | Mockup UI frame Denah (baru, 16 Okt) |
| `/patient/results` | UC07 (+ Solusi 9) | Mockup UI frame Riwayat |
| `/patient/certificates` | UC06 | Mockup UI frame Pengajuan Surat |
| `/patient/feedback` | UC08 | Mockup UI frame Aduan dan Ulasan |
| `/staff` | — | Redirect ke `/staff/patient` |
| `/staff/worklist` | UC09 | Mockup UI |
| `/staff/patient` | UC10, UC10.1 | Mockup UI |
| `/staff/stations` | UC09 (Solusi 4, 11) | Redirect ke `/staff/worklist` (digabung) |
| `/staff/add-patient` | UC11 | Redirect ke `/staff/patient` (Tambah pasien menjadi pop-up, 17 Okt) |
| `/staff/timing` | UC12 | Redirect ke `/staff/worklist` (Catatan waktu layanan digabung ke Worklist per unit, 17 Okt) |
| `/clinician` | — | Redirect ke `/clinician/review` |
| `/clinician/review` | UC13, UC13.1, UC14 | Mockup UI |
| `/clinician/collective` | UC15 | Mockup UI |
| `/clinician/certificates` | UC16, UC16.1, UC17 | Mockup UI |
| `/unit-staff` | — | Redirect ke `/unit-staff/queue` |
| `/unit-staff/queue` | UC19, UC20 | Mockup UI |
| `/unit-staff/results` | UC18 | Mockup UI |
| `/unit-doctor` | — | Redirect ke `/unit-doctor/review` |
| `/unit-doctor/queue` | UC20 | Mockup UI |
| `/unit-doctor/presence` | UC21 | Mockup UI |
| `/unit-doctor/review` | UC22, UC22.1, UC22.2 | Mockup UI |
| `/unit-doctor/charges` | UC22.2 | Redirect ke `/unit-doctor/review` (digabung) |
| `/management` | — | Redirect ke `/management/reports` |
| `/management/reports` | UC23, UC24 | Mockup UI |
| `/management/capacity` | UC26 | **Dibangun** (C.2) |
| `/management/feedback` | UC25 | Mockup UI |
| `/editor` | — | Redirect ke `/editor/calendar` |
| `/editor/calendar` | UC27 | Mockup UI |
| `/editor/services` | UC28 | Mockup UI |

Semua UC kini punya layar: UC05 di `/patient/map` (16 Oktober); UC11 dan UC20 untuk Dokter Unit sejak 14 Oktober.

## C. Cakupan iterasi ini

### C.1 Pasien — `/patient/registration` (UC01 parsial, UC03 tanda terima)

Alur: masukkan token review → daftar sesi terbuka → masuk → status tiket (`active`/`waiting` + posisi FIFO) → **Perbarui status** (manual) → **Keluar** atau **Kirim pendaftaran** (hanya `active`) → tanda terima. Pemulihan setelah reload: masukkan token lagi → `GET /entries` → tiket terbaru ditampilkan dan dapat dilanjutkan.

| State tiket | Tampilan | Aksi aktif |
| --- | --- | --- |
| `active` | "Anda memegang tempat aktif di sesi {label}, {tanggal}." | Kirim pendaftaran, Keluar, Perbarui status |
| `waiting` | "Posisi tunggu ke-{waiting_position} (FIFO), per {jam baca}." Tanpa estimasi waktu | Keluar, Perbarui status. Kirim nonaktif |
| `submitted` | Tanda terima: `submission.id`, `service_date`, `submitted_at`. Catatan: "Tanda terima registrasi review: bukan nomor antrian MCU, bukti bayar, atau booking klinis" | — |
| `left` | "Anda telah keluar dari antrian sesi ini." | Kembali ke daftar sesi |
| `cancelled` | "Sesi ditutup operator; tempat Anda dibatalkan." | Kembali ke daftar sesi |

Aturan UI: tanpa timer, tanpa polling otomatis, tanpa estimasi waktu, tanpa field identitas/paket/pembayaran. Tombol nonaktif selama request berjalan.

### C.2 Manajemen — `/management/capacity` (UC26 parsial, read-only)

`GET /sessions` lalu `GET /sessions/{id}` per sesi. Tabel per sesi: label, tanggal, state, `active`/`active_capacity` (100), `waiting`/`waiting_capacity` (50), kebijakan `FIFO`. Ringkasan per tanggal: `daily_submitted`/`daily_capacity` (400). Tombol **Muat ulang** + jam baca. Tanpa identitas peserta. Baris "Kuota layanan khusus (psikiatri, EKG wanita)": "menunggu keputusan" (Q2).

Batasan yang diketahui, **bukan fitur**: otorisasi hanya token review; belum ada peran, sehingga token principal mana pun dapat membaca angka agregat ini. `GET /sessions` hanya mengembalikan sesi terbuka (maks 100), jadi tanggal tanpa sesi terbuka tidak terlihat.

### C.3 Kontrak HTTP

Browser memanggil **same-origin** `/api/v1/*`; `next.config.ts` me-rewrite ke backend (`ISLAH_API_ORIGIN`, default `http://127.0.0.1:5000`, variabel sisi server, bukan `NEXT_PUBLIC_*`). Tanpa CORS. Backend tetap hanya mendengarkan `127.0.0.1:5000`. Rewrite didokumentasikan di `frontend/node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/rewrites.md` (Next 16; baca sebelum menulis kode). Semua request: `Authorization: Bearer <token>`, `cache: "no-store"`, tanpa body.

| Method & path | Status sukses | Respons (field yang dipakai UI) |
| --- | --- | --- |
| `GET /sessions` | 200 | `{sessions:[{id,label,service_date,state}]}`, hanya `open`, maks 100 |
| `GET /sessions/{id}` | 200 | `{id,label,service_date,state,daily_capacity,daily_submitted,active,waiting,active_capacity:100,waiting_capacity:50,policy:"FIFO"}` |
| `POST /sessions/{id}/entries` + `Idempotency-Key` | 201 baru; 200 replay/tiket aktif yang sama | Entry (di bawah) |
| `GET /entries/{id}` | 200 | Entry |
| `DELETE /entries/{id}` | 200 (aman diulang) | Entry, `state:"left"` |
| `POST /entries/{id}/submit` | 200 (retry = tanda terima sama) | Entry, `state:"submitted"`, `submission` terisi |
| **`GET /entries` (baru)** | 200 | `{entries:[Entry + session_label, service_date]}` |

Entry = `{id, session_id, state, joined_at, activated_at, finished_at, waiting_position (null kecuali waiting), submission: null | {id, service_date, submitted_at}}`.

**Spesifikasi `GET /api/v1/entries` (perubahan backend satu-satunya):**
- Hanya tiket milik principal pemegang token (`principal_id = g.principal_id`); tanpa parameter; parameter query diabaikan.
- Urut terbaru dulu (`sequence DESC`); maksimal **20** baris (batas teknis, bukan kebijakan; sejenis `LIMIT 100` di `GET /sessions`).
- Field = field `GET /entries/{id}` ditambah `session_label` dan `service_date` sesi. Tidak mengembalikan `principal_id`, `request_key`, `sequence`, nomor slot.
- Transaksi `REPEATABLE READ READ ONLY`, sama seperti `GET /entries/{id}`; `waiting_position` dihitung dengan cara yang sama.
- Kosong → `200 {entries: []}`. Tanpa/token salah → 401. Pool/DB sibuk → 503.
- Ditambahkan ke `backend/tests/integration.py`: kepemilikan, urutan, batas 20, field, 401, daftar kosong.

**Kesalahan → pesan UI (Bahasa Indonesia sederhana):**

| HTTP | `error.code` | Pesan UI | Perilaku UI |
| --- | --- | --- | --- |
| 400 | `INVALID_ID`, `INVALID_IDEMPOTENCY_KEY`, `UNEXPECTED_BODY` | "Permintaan tidak valid. Muat ulang halaman lalu coba lagi." | Tampilkan `X-Request-ID` |
| 401 | `UNAUTHORIZED` | "Token review tidak ada atau tidak valid. Masukkan token dari operator." | Hapus token dari memori, kembali ke form token |
| 404 | `NOT_FOUND` | "Sesi atau tiket tidak ditemukan untuk akun ini." | Kembali ke daftar sesi |
| 409 | `SESSION_CLOSED` | "Sesi registrasi sudah ditutup operator." | Muat ulang daftar sesi |
| 409 | `NOT_ACTIVE` | "Pendaftaran hanya dapat dikirim saat Anda memegang tempat aktif. Perbarui status untuk melihat posisi Anda." | — |
| 409 | `ALREADY_REGISTERED` | "Akun ini sudah memiliki pendaftaran pada tanggal tersebut." | — |
| 409 | `DAILY_CAPACITY_FULL` | "Kuota harian penuh, harap mengubah jadwal!" (teks UC01) | — |
| 409 | `ACTIVE_IN_OTHER_SESSION` | "Akun ini masih memegang tempat di sesi lain. Keluar atau kirim pendaftaran di sesi tersebut terlebih dahulu." | Tampilkan tiket hidup dari `GET /entries` |
| 409 | `IDEMPOTENCY_CONFLICT` | "Percobaan sebelumnya terkait sesi lain. Silakan mulai lagi." | Buang kunci; percobaan berikutnya kunci baru |
| 429 | `SESSION_CAPACITY_FULL` | "Sesi ini penuh: 100 tempat aktif dan 50 tempat tunggu sudah terisi." | Tanpa retry otomatis, tanpa hitung mundur |
| 503 | `TEMPORARILY_UNAVAILABLE` | "Server sedang sibuk. Tekan Ulangi." — pada aksi Masuk ditambah "Permintaan diulang dengan kunci yang sama." | Tombol Ulangi; Masuk memakai kunci yang sama |
| 5xx lain / jaringan putus | `INTERNAL_ERROR` / — | "Terjadi kesalahan. Sebutkan kode {X-Request-ID} kepada tim." Untuk masuk: sama seperti 503 | Untuk masuk: ulangi dengan kunci sama, lalu cek `GET /entries` |

**Idempotensi:** satu `Idempotency-Key` (`crypto.randomUUID()`) per percobaan masuk ke satu sesi. Disimpan di memori sampai respons definitif (2xx atau 4xx). Diulang dengan kunci yang sama setelah 503, timeout, atau jaringan putus. Masuk ulang setelah `left`/`cancelled` memakai kunci baru. Klik ganda tidak mengirim request kedua. `DELETE` dan `submit` aman diulang tanpa kunci.

**Token:** hanya di state React (context klien di root layout, bertahan saat navigasi `Link`, hilang saat reload). Tidak pernah di `localStorage`, `sessionStorage`, cookie, IndexedDB, URL/query, atau log/console/pesan error. Input `type="password"`, `autocomplete="off"`, tombol "Hapus token".

### C.4 Layar lain

Setiap layar placeholder menampilkan ID UC dan status dari B.1: "belum diimplementasikan" atau "menunggu keputusan: {topik}". Tanpa data rekaan; semua aksi nonaktif. Implementasi: tambah field `useCases` dan `status` pada metadata `Screen` di `workspaces.ts`.

**Diperbarui 16 Oktober 2026:** layar lain kini Mockup UI dengan contoh berlabel ("Data contoh", "(contoh)") dan aksi yang hanya mengubah tampilan; ID UC, status, dan Q-nomor terbuka tetap di Info review (`useCases` di `screens-patient.ts` dan `screens-internal.ts`).

### C.5 Di luar cakupan (eksplisit)

Pembayaran/biaya admin, NIK/identitas pasien, data paket/harga, antrean klinis/nomor antrian MCU/estimasi, hasil dan PDF, notifikasi WhatsApp, impor kolektif, pengelolaan kalender/sesi via web (sesi tetap CLI), login/otorisasi peran produksi, polling otomatis, timer sesi, deployment.

## D. Kriteria penerimaan

Persiapan boleh memakai skrip HTTP/CLI (mis. mengisi 150 tempat); verifikasi hasil dilakukan di browser kecuali disebut lain.

| AC | Given | When | Then |
| --- | --- | --- | --- |
| AC-01 Alur utama | Sesi terbuka S, token A valid tanpa tiket | A memasukkan token, memilih S, Masuk, lalu Kirim | Tiket `active`, lalu `submitted` dengan `submission.id`, tanggal, waktu + catatan "bukan nomor antrian MCU…" |
| AC-02 FIFO & promosi | S berisi 100 `active`; B masuk | B melihat status; satu peserta aktif keluar/submit; B menekan Perbarui status | Awalnya `waiting` posisi 1 (sama dengan `GET /entries/{id}`); setelah refresh `active`. Tidak ada polling otomatis |
| AC-03 Peserta ke-151 | S berisi 100 aktif + 50 tunggu | Akun ke-151 menekan Masuk | Pesan `SESSION_CAPACITY_FULL`; `GET /sessions/{id}` tetap 100/50; tidak ada retry otomatis |
| AC-04 Satu tempat per akun | A memegang tempat di S1 | A masuk S2 | Pesan `ACTIVE_IN_OTHER_SESSION`; tiket A di S1 tidak berubah dan ditampilkan |
| AC-05 Submit hanya active | Tiket A `waiting` | A melihat aksi; request submit dipaksa | Tombol Kirim nonaktif; API → 409 `NOT_ACTIVE` dengan pesan yang dipetakan |
| AC-06 Retry idempoten | Respons masuk gagal (503 atau jaringan putus) | A menekan Ulangi; juga klik ganda pada Masuk | Panel network: `Idempotency-Key` sama; hanya satu tiket; jumlah `active+waiting` naik tepat 1 |
| AC-07 Keluar | A `active`, B `waiting` posisi 1 | A Keluar, ulangi Keluar, B Perbarui status | A `left` (ulang aman), B `active`, hitungan berkurang/promosi tepat sekali |
| AC-08 Token hilang/salah | — | Tanpa token, atau token salah | Tidak ada aksi sebelum token diisi; 401 → pesan, token dihapus dari memori |
| AC-09 Pemulihan reload | A punya tiket `waiting` atau `submitted` | Reload, masukkan token A lagi | `GET /entries` menampilkan tiket terbaru dulu dengan label sesi dan tanggal; aksi yang berlaku dapat dilanjutkan |
| AC-10 Kepemilikan | Tiket milik A | B memanggil `GET /entries/{idA}` dan `GET /entries` | 404 "tidak ditemukan"; daftar B tidak memuat tiket A |
| AC-11 Kontrak `GET /entries` | Integrasi backend | Uji dijalankan | Owner-only, `sequence DESC`, ≤ 20, field sesuai C.3, 401 tanpa token, `[]` bila kosong |
| AC-12 Sesi ditutup | A `active` di S | Operator `close-session S`; A Perbarui status lalu mencoba Masuk/Kirim | Tiket `cancelled`; `SESSION_CLOSED` saat masuk/kirim |
| AC-13 Pemetaan pesan | — | Respons setiap kode di C.3 (uji manual atau unit) | Pesan Indonesia sesuai tabel; 503 pada Masuk menyebut "kunci yang sama" (aksi lain tidak); DAILY_CAPACITY_FULL = teks UC01 |
| AC-14 Kapasitas manajemen | Sesi dengan tiket aktif/tunggu/submit | Buka `/management/capacity`, Muat ulang | Angka sama persis dengan JSON `GET /sessions/{id}`; tanpa identitas; catatan batasan otorisasi tampil |
| AC-15 Placeholder | — | Buka setiap rute lain di B.2 | Menampilkan ID UC dan status; tanpa baris data; aksi nonaktif |
| AC-16 Same-origin | Backend 127.0.0.1:5000, Next berjalan | Jalankan alur AC-01 | Semua request browser ke origin Next `/api/v1/*`; tanpa header CORS; header Authorization diteruskan |
| AC-17 Penyimpanan token | Setelah AC-01 dan AC-09 | Periksa DevTools Application + URL + console | Token tidak ada di localStorage/sessionStorage/cookie/IndexedDB/URL/console |
| AC-18 Build frontend | — | `npm run lint` dan `npm run build` | Keduanya lulus |
| AC-19 Uji backend | Instance PostgreSQL uji | `python -B tests/integration.py` | Lulus, termasuk kasus `GET /entries` |
| AC-20 Pembersihan | Pengujian selesai | Periksa proses dan DB | Next, Waitress, PostgreSQL sementara berhenti; tidak ada DB `mcu_registration_test_%` |

### D.2 Kriteria penerimaan tahap 2 (18 Oktober 2026)

Menggantikan AC yang memakai sesi registrasi, kuota 400/hari, atau `DAILY_CAPACITY_FULL`. Angka 400 bukan kriteria penerimaan.

| AC | Kriteria | Bukti |
| --- | --- | --- |
| AC2-01 | Tanggal layanan = H+1 Asia/Jakarta dari server; klien tidak dapat memilih; tanggal yang melekat tidak dihitung ulang setelah tengah malam | `backend/TEST_RESULTS.md` (tanggal), e2e UI |
| AC2-02 | Registrasi hanya bila operator membuka tanggal; H+1 `no_service` tidak dibuka dan tidak digeser | `TEST_RESULTS.md` |
| AC2-03 | `held + confirmed <= 100`, `waiting <= 50` di bawah balapan (170 kiriman serentak: 100 + 50 + 20 ditolak) | `TEST_RESULTS.md` |
| AC2-04 | Pendatang baru tidak menyalip daftar tunggu; batal sebelum bayar mempromosikan yang paling awal ke menunggu pembayaran dalam transaksi yang sama | `TEST_RESULTS.md`, e2e UI |
| AC2-05 | Satu belum selesai per akun; satu per akun per tanggal layanan; percobaan ulang dengan kunci sama mengembalikan aplikasi yang sama | `TEST_RESULTS.md` |
| AC2-06 | NIK ganda pada tanggal yang sama ditolak lintas akun dengan pesan persis, aman dari balapan, tanpa NIK utuh di tabel, log, atau respons | `TEST_RESULTS.md`, e2e UI |
| AC2-07 | Tanpa pembayaran, nomor antrian, atau jalur "tandai lunas" di API, CLI, dan UI | `tests/route_guard.py`, e2e UI |
| AC2-08 | Form pasien kosong, field persis form yang disetujui, tanpa diri sendiri/orang lain/anggota/hubungan | uji alur pasien, e2e UI |
| AC2-09 | Tidak ada label simulasi/demo/mockup/prototype/use case/UC/nomor Q di UI; tidak ada saklar untuk memunculkannya | `npm run check:ui`, grep kode sumber |

## E. Pertanyaan terbuka untuk stakeholder

| Q | Pertanyaan | Pemilik |
| --- | --- | --- |
| Q1 | UC27: hanya hari libur/waktu kerja, atau juga mengubah kuota? Jika kuota, boleh menurunkan kapasitas harian di bawah 400 per tanggal? | Pemilik PRD, operasional |
| Q2 | UC26: layanan khusus mana yang berkuota (psikiatri, EKG wanita, lainnya) dan berapa? | Operasional MCU, dokter unit |
| Q3 | Hasil: WhatsApp (UC14) dan/atau PDF unduh di aplikasi (Solusi 9)? Lampiran atau tautan? Unduh in-app masuk UC07? | Dokter MCU, IT |
| Q4 | UC15: konfirmasi deskripsi pengganti; kolektif memakai kuota 400/hari yang sama? Format CSV, akun sementara, sukses parsial? | Dokter MCU, IT |
| Q5 | Belum ada UC "Membayar Biaya Admin": nominal, gateway, biaya admin, refund? Sumber data paket/harga? | Keuangan, pemilik PRD |
| Q6 | Kapan nomor antrian MCU terbit: saat registrasi (UC03), setelah bayar admin (Solusi 3), atau saat daftar ulang (UC10)? | Operasional MCU |
| Q7 | "Waktu sesi habis" (UC02/UC02.1/UC03): sesi apa, berapa lama, apa yang terjadi pada tempat aktif yang ditinggalkan? | Operasional |
| Q8 | Delegasi: boleh satu akun mendaftarkan beberapa orang (Asumsi 2), mengingat aturan satu tempat per akun? | Pemilik PRD, IT |
| Q9 | "Paling lambat 1 hari" (UC06): hari kalender atau 24 jam? | Dokter MCU |
| Q10 | ±400 request/hari vs ≥800 request untuk 400 peserta: angka mana untuk sizing? Target latensi/SLA? | Supervisor, IT |
| Q11 | Penyedia notifikasi WhatsApp dan persetujuan pasien | IT |
| Q12 | Algoritma antrean klinis, interval lab, urutan pemeriksaan | Dokter unit |
| Q13 | Honorarium, diskon, kewenangan tarif (UC22.2) | Keuangan, dokter |
| Q14 | UC11 walk-in: memakai kuota 400/hari? Layar di `/staff/patient`? Perlu layar antrean untuk Dokter Unit (UC20)? | Operasional MCU |
| Q15 | Hosting, SLA, retensi, backup | IT RS |

## Verifikasi akhir (13 Oktober 2026)

Verifikasi independen oleh requirement engineer terhadap working tree yang belum di-commit (backend `own_entries`/`GET /entries`, frontend `api.ts`, `review-token.tsx`, `registration.tsx`, `capacity.tsx`, `workspaces.ts`, `workspace.tsx`, `next.config.ts`). Lingkungan: cluster PostgreSQL 18.3 sementara milik verifikator (127.0.0.1:55444), Waitress `serve.py --port 5002`, `next build` + `next start -p 3002` dengan `ISLAH_API_ORIGIN=http://127.0.0.1:5002` saat build dan start, Edge headless via CDP (port 9444). Semua request uji melewati origin Next `:3002`. Akun uji: 2 lewat `create-client` dan 160 principal pengisi yang dibuat langsung lewat SQL (hash SHA-256 token uji). Untuk AC-13 (`DAILY_CAPACITY_FULL`), kapasitas tanggal uji 2026-10-20 diturunkan ke 1 lewat SQL, khusus uji.

Metode: **live** = dijalankan dan diamati; **review** = pemeriksaan kode/diff.

| AC | Hasil | Bukti | Metode |
| --- | --- | --- | --- |
| AC-01 | PASS | Token A → Masuk rv-s1 → `201 active` → Kirim → tanda terima `0b7bb075…`, tanggal 2026-10-20, waktu kirim, catatan "bukan nomor antrian MCU, bukti bayar, atau booking klinis" | live (browser) |
| AC-02 | PASS | Akun B masuk sesi berisi 100 aktif → "Posisi tunggu ke-1 (FIFO)", sama dengan `GET /entries`. Satu peserta aktif keluar (API); tampilan B tetap "Dibaca pukul 01.06.58" sampai tombol ditekan, lalu "tempat aktif". Tidak ada `setInterval`/`setTimeout` di `src` | live + review |
| AC-03 | PASS | Setelah 100 + 50, akun ke-151 di UI → satu POST `429`, pesan "Sesi ini penuh: 100 tempat aktif dan 50 tempat tunggu sudah terisi."; tanpa tombol Ulangi; tidak ada request lanjutan selama 4 detik; `GET /sessions/{id}` tetap 100/50 | live |
| AC-04 | PASS | A aktif di rv-s1, Masuk rv-s2 → `409`, pesan `ACTIVE_IN_OTHER_SESSION`; tiket rv-s1 tetap ditampilkan (dibaca dari `GET /entries`) | live |
| AC-05 | PASS | B `waiting`: tombol "Kirim pendaftaran" `disabled=true`; submit langsung via API → `409 NOT_ACTIVE` | live (UI + API) |
| AC-06 | PASS | Backend dimatikan → Masuk → proxy `500`, pesan "… Tekan Ulangi; permintaan diulang dengan kunci yang sama." Backend dinyalakan → Ulangi (diklik dua kali) → satu POST dengan kunci sama `dd8be1f2…` → `201`; jumlah aktif sesi naik 0 → 1. Klik ganda Masuk di AC-01 hanya menghasilkan satu POST. Replay API dengan kunci sama → `201` lalu `200` dengan ID sama | live |
| AC-07 | PASS | B (aktif) Keluar → "Anda telah keluar"; DELETE diulang → `200 left`; peserta tunggu berikutnya (pengisi #101) menjadi `active`; tunggu 50 → 48 sesuai dua promosi | live |
| AC-08 | PASS | Sebelum token hanya tombol "Gunakan token"; token salah → `401`, pesan token tidak valid, form token muncul lagi (token dihapus dari memori) | live |
| AC-09 | PASS | Reload → form token kosong, bagian tiket tidak tampil; token A dimasukkan lagi → `GET /entries` → tiket `active` rv-s1 dipulihkan dan dapat di-submit | live |
| AC-10 | PASS | B: `GET` dan `DELETE /entries/{tiket A}` → `404 NOT_FOUND`; `GET /entries` B hanya berisi tiket B | live (API) |
| AC-11 | PASS | `tests/integration.py` memeriksa owner-only, `sequence DESC`, batas 20 (21 siklus), field, receipt, 401, `[]` | live (harness) |
| AC-12 | PASS | `flask close-session` rv-s2 saat akun pengisi #152 aktif → Perbarui status → "Sesi ditutup operator; tempat Anda dibatalkan."; Masuk pada baris lama → `SESSION_CLOSED` dan daftar sesi dimuat ulang (rv-s2 hilang); submit tiket `cancelled` via API → `409 SESSION_CLOSED` | live |
| AC-13 | PASS | Teks di `src/lib/api.ts` sama dengan tabel C.3. Diamati di UI: `UNAUTHORIZED`, `ACTIVE_IN_OTHER_SESSION`, `ALREADY_REGISTERED`, `SESSION_CAPACITY_FULL`, `SESSION_CLOSED`, `DAILY_CAPACITY_FULL` (teks UC01), 5xx/jaringan. Kode `INVALID_ID`, `INVALID_IDEMPOTENCY_KEY`, `NOT_ACTIVE`, `NOT_FOUND`, `IDEMPOTENCY_CONFLICT` dipicu via API dan pemetaannya diperiksa di kode; `503 TEMPORARILY_UNAVAILABLE` hanya review | live + review |
| AC-14 | PASS | `/management/capacity`: rv-s1 0/100, 0/50; rv-fill 100/100, 48/50, FIFO; 2026-10-20 1/1; 2026-10-21 0/400; sama persis dengan JSON `GET /sessions/{id}`. Tanpa label/ID peserta; catatan batasan otorisasi tampil; baris kuota layanan khusus "Menunggu keputusan (Q2)" | live |
| AC-15 | PASS | 31/31 rute `200`. 23 layar menampilkan blok "Use case dan status" dengan ID UC sama persis dengan B.2; 8 dashboard menampilkan ID UC pada tautan layar. 21 placeholder: 0 tombol/input aktif di `<main>`, tabel hanya baris empty state | live (HTTP) + review |
| AC-16 | PASS | Semua request browser ke `http://127.0.0.1:3002/api/v1/*`; tidak ada header `access-control-*` (juga untuk preflight `OPTIONS` dengan Origin asing); header Authorization diteruskan proxy (`200` dengan token valid) | live |
| AC-17 | PASS | Setelah alur dan reload: localStorage/sessionStorage `{}`, cookie kosong, IndexedDB kosong, URL tanpa token, HTML tanpa token, console kosong. Token tidak ditemukan di log Next/Waitress/Edge maupun di `.next`. Input `type=password`, `autocomplete=off` | live + review |
| AC-18 | PASS | `npm run lint` exit 0; `npm run build` exit 0 (34 halaman statis) | live |
| AC-19 | PASS | `backend/tests/integration.py` dengan `TEST_ADMIN_DSN` ke cluster verifikator: `checks: PASS …` termasuk `GET /entries` | live |
| AC-20 | PASS | Next, Waitress, Edge dihentikan (taskkill pada PID milik verifikator); cluster `pg_ctl -m fast stop`; port 3002, 5002, 9444, 55444 tidak lagi LISTEN; 0 database `mcu_registration_test_%` sebelum cluster dihentikan. Proses/cluster engineer lain tidak disentuh | live |

### Temuan

Tidak ada cacat yang menggagalkan AC. Catatan untuk ditindaklanjuti (tidak memblokir):

| ID | Lokasi | Catatan | Usulan |
| --- | --- | --- | --- |
| V-1 | `frontend/src/lib/api.ts:51,64` | Pesan 503 menyebut "diulang dengan kunci yang sama" juga untuk Perbarui status/Keluar/Kirim, yang tidak memakai kunci (perilaku ulang tetap aman) | Frontend: untuk aksi non-masuk cukup "Server sedang sibuk. Tekan Ulangi." **Diperbaiki 13 Oktober:** pesan umum kini netral; keterangan kunci hanya pada jalur Masuk (`registration.tsx`). |
| V-2 | Proxy Next | Saat backend mati, proxy mengembalikan `500` tanpa `X-Request-ID` (bukan 503). UI memperlakukannya sebagai dapat diulang dengan kunci sama, sesuai baris "5xx lain / jaringan putus" di C.3 | Tidak perlu perubahan; dicatat untuk operasional |
| V-3 | `registration.tsx` | Tombol Masuk tetap aktif saat memegang tiket; server menolak (`409 ACTIVE_IN_OTHER_SESSION`) atau mengembalikan tiket yang sama (`200`). Aman, sengaja untuk AC-04 | Pertimbangan UX berikutnya |
| V-4 | `capacity.tsx:23` | Satu `GET /sessions/{id}` per sesi secara paralel (maks 100) | Diterima untuk review; endpoint agregat bila jumlah sesi besar |

Dokumen yang diperbarui saat verifikasi: kalimat basi di `backend/README.md` (paragraf pertama), `backend/TEST_RESULTS.md` (cakupan "belum diuji"), `docs/system-design/REGISTRATION_BACKEND.md` (paragraf terakhir), dan `frontend/PRODUCT.md`.
