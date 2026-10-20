# Matriks Izin Peran, Unit, dan Kepemilikan (DRAFT untuk review)

| Metadata | Nilai |
| --- | --- |
| Tanggal / status | 18 Oktober 2026 / DRAFT. Semua baris berstatus **USULAN** kecuali yang ditandai **DITETAPKAN** dengan sumber |
| Untuk | Pemilik produk dan RS (operasional MCU, dokter MCU, dokter unit, keuangan, IT RS) |
| Dasar | Brief pemilik 18 Oktober 2026 (disingkat **B**, mis. B§9A; ringkasannya KP-01 s.d. KP-12 di [RECONCILIATION_2026-10-18.md](RECONCILIATION_2026-10-18.md) §2) sebagai otoritas tertinggi; PRD UC01 s.d. UC28; `SYSTEM_DESIGN.md` (SD), `DATABASE_DESIGN.md` (DBD), `UI_GUIDE.md` (UIG) sebagai rekomendasi desain; layar mockup sebagai bukti implementasi, bukan bukti kebijakan |
| Menjawab | OD-07 (pembatasan per peran, unit, kepemilikan) dan butir izin di B§9 bagian A s.d. G serta lintas peran |
| Pasangan | [OPEN_DECISIONS.md](OPEN_DECISIONS.md) bagian 6 s.d. 9 (status baru dan OD-74 s.d. OD-96), [RECONCILIATION_2026-10-18.md](RECONCILIATION_2026-10-18.md) |

## 1. Prinsip yang sudah ditetapkan

1. **Otorisasi ditegakkan di server pada setiap permintaan.** API internal produksi tidak boleh dibuka dengan pemeriksaan peran yang hanya ada di browser (B§9; SD §1: "Authorization remains mandatory on every request"). Menyembunyikan menu hanya kenyamanan (UIG §4). Permintaan yang tidak berhak ditolak server (403), bukan sekadar tidak ditampilkan.
2. **Tolak secara default.** Aksi yang tidak tercantum sebagai Izinkan atau Dengan syarat dianggap Tolak sampai pemilik memutuskan (USULAN; sejalan dengan SD §12 "never substitute a guessed default for a blocking financial or clinical rule").
3. **Tiga lapis pemeriksaan**: peran, unit (untuk Petugas Unit dan Dokter Unit), dan kepemilikan atau delegasi sumber daya (untuk pemegang akun) (SD §8).
4. **Mendaftarkan atau membayar tidak memberi akses hasil medis** (B§9A, DITETAPKAN).
5. **Peringatan duplikat tidak membuka data akun lain** (B§8, DITETAPKAN).
6. **Verifikasi pembayaran hanya dari hasil penyedia yang diverifikasi backend**; redirect browser atau tanda manual bukan bukti (B§6, DITETAPKAN).
7. **Aksi yang mengubah data klinis, identitas, kapasitas, atau pembayaran dicatat di audit** (aktor, peran yang dipakai, waktu, request ID, alasan bila wajib). Draft schema sudah menyediakan `audit_event.reason` (DBD; `database/001_schema.sql`).

## 2. Keadaan implementasi saat ini (bukti)

| Bagian | Keadaan | Sumber |
| --- | --- | --- |
| Backend | Satu jenis identitas: principal bertoken acak yang dibuat operator lewat CLI `create-client`. Tidak ada peran. Setiap token sah setara | `backend/app/__init__.py` (Bearer, `registration.principal`); MVP A-3 |
| Route | 9 route dikunci allowlist; tidak ada route pembuat client/token | `backend/tests/route_guard.py` |
| Kepemilikan | `GET /entries` dan `GET /entries/{id}` hanya milik principal pemegang token (404 untuk milik orang lain) | RR C.3, AC-10 |
| Frontend | `AuthGate` hanya simulasi di browser terhadap 8 akun mockup; admin mockup membuka semua ruang kerja | `frontend/src/components/auth.tsx` l.14-28 |
| Kapasitas | `/management/capacity` dapat dibaca token principal mana pun | MVP A-3; RR C.2 |
| Draft schema (belum diterapkan) | `role` (7 peran PRD), `account_role(account_id, role_code, unit_id)`, `patient_access(can_register, can_read_results, verified_at, revoked_at)`, `audit_event(reason)` | `database/001_schema.sql`, `database/002_seed.sql` |

Kesimpulan: belum ada otorisasi produksi. Matriks ini adalah masukan untuk model peran di backend, bukan deskripsi perilaku yang sudah ada.

## 3. Cara membaca dan mengisi

| Kolom | Isi |
| --- | --- |
| ID | PA = pasien/pemegang akun, PM = Petugas MCU, PU = Petugas Unit, DU = Dokter Unit, DM = Dokter MCU, MJ = Manajemen, ED = Editor, LP = lintas peran |
| Default | **DITETAPKAN** (dengan sumber) bila PRD atau brief sudah memutuskan; selain itu **USULAN: Izinkan**, **USULAN: Tolak**, atau **USULAN: Dengan syarat** |
| Syarat dan cakupan | Akun sendiri, unit sendiri, ruangan yang ditugaskan, masa tugas, batas state |
| Alasan | Apakah aksi wajib disertai alasan tercatat |
| Audit | "Ya (ubah)" = sebelum/sesudah dicatat; "Ya (baca)" = setiap pembacaan dicatat; "Log akses" = cukup log akses biasa |
| Bukti | UC PRD, bagian brief atau SD, layar yang ada |
| Menjawab | OD atau Q terkait |
| Keputusan | Diisi pemilik: Setuju, atau Ubah dengan catatan |

## 4. Matriks

### A. Pasien / pemegang akun (B§9A)

| ID | Aksi | Default | Syarat dan cakupan | Alasan | Audit | Bukti | Menjawab | Keputusan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PA-01 | Membuat aplikasi registrasi untuk satu pasien, layanan H+1 | DITETAPKAN: Izinkan (B§7, B§3) | Email akun terverifikasi; satu registrasi = satu pasien; pasien boleh siapa saja dan tidak wajib cocok dengan profil akun; form pasien mulai kosong; tanggal layanan ditetapkan sistem (H+1); satu registrasi per akun per hari (cara hitung: OD-83, OD-84); hanya dalam jendela registrasi (OD-74) | Tidak | Ya (ubah); akun penanggung jawab dicatat | UC01; B§3, B§7; `/patient/registration` | OD-06, OD-10, OD-83 s.d. OD-86 | [ ] Setuju [ ] Ubah: |
| PA-02 | Melihat aplikasi dan registrasi yang diajukan akun sendiri (data registrasi, tanggal layanan, pembayaran) | DITETAPKAN: Izinkan (UC07) | Hanya registrasi dengan akun penanggung jawab = akun ini. Tidak termasuk hasil medis (PA-07). UC07 mensyaratkan akun telah menyelesaikan minimal satu MCU untuk "Riwayat" (OD-62) | Tidak | Log akses | UC07; B§3; backend `GET /entries` milik sendiri (RR AC-10) | OD-62 | [ ] Setuju [ ] Ubah: |
| PA-03 | Melihat status reservasi, pembayaran, dan nomor antrian resmi aplikasi sendiri | DITETAPKAN: Izinkan (UC03, UC04) | Nomor antrian resmi hanya ada setelah pembayaran terverifikasi (B§6); referensi aplikasi dan tiket sesi tidak boleh dilabeli nomor antrian; tanggal layanan selalu tampil (B§3) | Tidak | Log akses | UC03, UC04; B§6; kotak antrian `/patient` | OD-01, OD-11 | [ ] Setuju [ ] Ubah: |
| PA-04 | Mengubah identitas pasien pada aplikasi yang sudah diajukan | USULAN: Dengan syarat | USULAN: boleh selama aplikasi belum selesai (belum ada hold pembayaran); setelah booking terkonfirmasi hanya lewat Petugas MCU saat daftar ulang (UC10.1). Perubahan nama memicu ulang pemeriksaan duplikat nama (B§8) | USULAN: Tidak | Ya (ubah) | B§9A; UC10.1; belum ada layar ubah bagi pasien | OD-07; batas state belum punya OD | [ ] Setuju [ ] Ubah: |
| PA-05 | Membatalkan aplikasi belum selesai atau hold pembayaran | USULAN: Izinkan | Hanya akun penanggung jawab. Hold dilepas tepat sekali (aturan pelepasan: OD-19, OD-80). Pengaruh ke jatah harian: OD-85 | USULAN: Tidak (pilihan alasan opsional) | Ya (ubah) | UC01.1 (tambahan 17 Okt, RR B.1); `patient.tsx` QueueRow "Batalkan pendaftaran" | OD-20, OD-85 | [ ] Setuju [ ] Ubah: |
| PA-06 | Membatalkan booking terkonfirmasi (sudah dibayar) | USULAN: Dengan syarat | USULAN: hanya sebelum daftar ulang pada tanggal layanan. Tanpa refund otomatis (B§5, B§6). Nasib tempat utama: OD-22; nomor resmi: OD-23; jatah: OD-85 | USULAN: Ya (pilihan alasan) | Ya (ubah) | B§9A, B§14; UC01.1 | OD-20, OD-21, OD-22, OD-23 | [ ] Setuju [ ] Ubah: |
| PA-07 | Melihat atau mengunduh hasil MCU pasien yang didaftarkan akun | USULAN: Tolak sebagai default; Izinkan hanya dengan syarat | Mendaftarkan atau membayar tidak memberi akses (B§9A, DITETAPKAN). USULAN: izinkan bila akun terverifikasi sebagai pasien itu, atau memegang delegasi/persetujuan pasien yang terverifikasi dan belum dicabut (SD §8; draft `patient_access.can_read_results` mensyaratkan `verified_at`) | Tidak | Ya (baca, setiap unduhan) | B§9A; SD §8; UC07; PRD Solusi 9 | OD-14, OD-12 | [ ] Setuju [ ] Ubah: |
| PA-08 | Mengajukan surat keterangan | DITETAPKAN syarat waktu (UC06); USULAN untuk siapa pengajunya | DITETAPKAN: setelah MCU selesai dan hasil diterima; paling lambat 1 hari setelah hasil keluar (arti "1 hari": OD-45). USULAN: hanya akun yang punya akses hasil pasien itu (PA-07), untuk satu registrasi tertentu | Tidak | Ya (ubah) | UC06; `/patient/certificates` | OD-44, OD-45 | [ ] Setuju [ ] Ubah: |
| PA-09 | Mengakses riwayat setelah kepemilikan atau delegasi berubah | USULAN: Dengan syarat | USULAN: data registrasi dan pembayaran tetap terlihat bagi akun yang mengajukan (catatan tindakannya sendiri); akses hasil mengikuti delegasi yang berlaku saat ini dan berhenti saat dicabut | Tidak | Ya (ubah delegasi) | B§9A; SD §8 | OD-14, OD-62 | [ ] Setuju [ ] Ubah: |
| PA-10 | Mengirim ulasan dan aduan | DITETAPKAN: Izinkan setelah MCU selesai dan hasil diterima (UC08) | Aduan tentang aplikasi di luar syarat itu: terbuka (OD-63) | Tidak | Log akses | UC08; PRD Solusi 13; `/patient/feedback` | OD-63, OD-64 | [ ] Setuju [ ] Ubah: |
| PA-11 | Melihat data registrasi akun lain, termasuk lewat peringatan duplikat nama | DITETAPKAN: Tolak (B§8) | Peringatan tidak membuka identitas, email, telepon, booking, atau nomor antrian akun lain; tanpa penggabungan atau pemindahan kepemilikan otomatis | Tidak berlaku | Ya (peringatan yang muncul) | B§8 | OD-16, OD-87 | [ ] Setuju [ ] Ubah: |
| PA-12 | Memanggil API internal atau membuka ruang kerja peran lain | DITETAPKAN: Tolak (B§9) | Ditolak server, bukan hanya disembunyikan menu. SD §1, §4: permukaan API publik dan internal terpisah | Tidak berlaku | Ya (penolakan) | B§9; SD §1, §4; `AuthGate` saat ini hanya simulasi | OD-07 | [ ] Setuju [ ] Ubah: |

### B. Petugas MCU (B§9B)

| ID | Aksi | Default | Syarat dan cakupan | Alasan | Audit | Bukti | Menjawab | Keputusan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PM-01 | Mencari registrasi dan mengidentifikasi pasien | DITETAPKAN: Izinkan (UC10) | DITETAPKAN: lewat nomor registrasi (UC10 flow 1). USULAN: cakupan dibatasi tanggal layanan hari ini; pencarian dengan nama atau NIK hanya bila pasien tidak membawa pengenal | Tidak | Ya (baca, untuk pencarian berbasis identitas) | UC10; `/staff/patient` | OD-11, OD-58 | [ ] Setuju [ ] Ubah: |
| PM-02 | Memvalidasi daftar ulang (Verifikasi) dan mengaktifkan antrian klinis | DITETAPKAN: Izinkan (UC10, B§6) | Hanya booking terkonfirmasi (pembayaran terverifikasi) untuk tanggal layanan hari ini; validasi identitas di lokasi wajib sebelum aktivasi (B§6) | Tidak | Ya (ubah) | UC10; B§6; `staff-patient.tsx` Verifikasi | OD-58, OD-60 | [ ] Setuju [ ] Ubah: |
| PM-03 | Mengoreksi data demografi pasien | DITETAPKAN: Izinkan saat daftar ulang (UC10.1); field: USULAN | USULAN: hanya selama daftar ulang pasien yang hadir. Perubahan paket/layanan tidak (DITUNDA bersama katalog, B§10) | USULAN: Ya untuk NIK, nama, tanggal lahir | Ya (ubah) | UC10.1; `staff-patient.tsx` Ubah (8 field termasuk NIK) | OD-59 | [ ] Setuju [ ] Ubah: |
| PM-04 | Menambah pasien walk-in | DITETAPKAN: Izinkan (UC11); syarat terbuka | Kapasitas: OD-25. Akun penanggung jawab dan aturan satu per hari: OD-61, OD-90. Nomor antrian vs pembayaran: OD-27. UC11 menolak "NIK sudah terdaftar" pada antrian terkini (bergantung OD-16) | Tidak | Ya (ubah) | UC11; `staff-add-patient.tsx` | OD-25, OD-27, OD-61, OD-90 | [ ] Setuju [ ] Ubah: |
| PM-05 | Menangani peringatan kemungkinan duplikat (melihat registrasi kandidat) | USULAN: Dengan syarat | USULAN: hanya untuk registrasi pada tanggal layanan terkait, demi verifikasi di lokasi; keputusan petugas dicatat. Cara tindak lanjut: OD-87 | USULAN: Ya | Ya (baca dan ubah) | B§8, B§9B | OD-87, OD-88 | [ ] Setuju [ ] Ubah: |
| PM-06 | Menggabungkan identitas pasien atau memindahkan kepemilikan | DITETAPKAN: Tolak otomatis (B§8). USULAN: penggabungan manual juga Tolak pada tahap ini | Tidak ada | Tidak berlaku | Tidak berlaku | B§8 | OD-87 | [ ] Setuju [ ] Ubah: |
| PM-07 | Membatalkan registrasi atas nama pasien | USULAN: Dengan syarat | USULAN: atas permintaan pasien/akun atau pasien tidak memenuhi syarat di lokasi. Tidak memindah ke tanggal lain (B§3 melarang pemindahan otomatis) | USULAN: Ya | Ya (ubah) | `OPEN_DECISIONS.md` §4 (belum punya UI); SD §11 | OD-20, OD-22 | [ ] Setuju [ ] Ubah: |
| PM-08 | Membuka kembali registrasi yang dibatalkan atau kedaluwarsa | USULAN: Tolak | USULAN: buat aplikasi baru yang melewati aturan kapasitas normal; membuka kembali berisiko melampaui 100 tempat utama (B§4) | Tidak berlaku | Tidak berlaku | B§9B, B§4 | OD-19 | [ ] Setuju [ ] Ubah: |
| PM-09 | Override kapasitas penuh, aturan satu per akun per hari, atau duplikat | USULAN: Tolak | Tidak boleh mengarang penerimaan overflow (B§4) | Bila kelak diizinkan: Ya | Ya (ubah) | B§4, B§9B | OD-25, LP-06 | [ ] Setuju [ ] Ubah: |
| PM-10 | Melihat status dan referensi pembayaran | USULAN: Dengan syarat | USULAN: hanya status (menunggu, terverifikasi) dan referensi untuk pasien tanggal layanan hari ini. Nominal ditunda (B§6) | Tidak | Log akses | B§6, B§9B | OD-04 | [ ] Setuju [ ] Ubah: |
| PM-11 | Mengubah data pembayaran atau menandai lunas secara manual | DITETAPKAN: Tolak sebagai bukti verifikasi (B§6) | Rekonsiliasi manual kelak: kebijakan terbuka (OD-79) | Tidak berlaku | Ya (penolakan) | B§6; SD §8 | OD-79 | [ ] Setuju [ ] Ubah: |
| PM-12 | Melihat worklist dan catatan waktu layanan semua unit | DITETAPKAN: Izinkan (UC09, UC12 "seluruh lingkup rumah sakit") | UC09 dipakai pada jam kerja | Tidak | Log akses | UC09, UC12; `/staff/worklist` | OD-54 | [ ] Setuju [ ] Ubah: |

### C. Petugas Unit (B§9C)

| ID | Aksi | Default | Syarat dan cakupan | Alasan | Audit | Bukti | Menjawab | Keputusan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PU-01 | Melihat antrian dan pasien yang ditugaskan ke unitnya | DITETAPKAN: Izinkan (UC20) | USULAN: hanya unit yang ditugaskan ke akun (draft `account_role.unit_id`); daftar menampilkan nomor (UC20), identitas tampil saat pasien dipilih untuk Masuk | Tidak | Log akses | UC20; `unit-queue.tsx` | OD-93 | [ ] Setuju [ ] Ubah: |
| PU-02 | Mencatat Masuk dan Keluar pasien | DITETAPKAN: Izinkan (UC19) | DITETAPKAN: pasien sudah daftar ulang dan ada di antrian (UC19); status antrian berubah hanya setelah konfirmasi petugas (PRD §2.4 Batasan 3). USULAN: unit sendiri saja; pemeriksaan versi agar tidak saling menimpa | Tidak (di luar urutan: LP-06) | Ya (ubah) | UC19; `unit-queue.tsx` (Masuk dapat ditekan pada nomor mana pun) | OD-52, OD-53 | [ ] Setuju [ ] Ubah: |
| PU-03 | Mengisi dan mengirim hasil | DITETAPKAN: Izinkan (UC18) | DITETAPKAN: setelah pasien dikonfirmasi masuk unit (UC18). USULAN: hanya pemeriksaan milik unitnya, sesuai template berversi (OD-28) | Tidak | Ya (ubah, per revisi) | UC18; `unit-staff-results.tsx` | OD-28 | [ ] Setuju [ ] Ubah: |
| PU-04 | Mengubah draft sebelum dikirim | USULAN: Izinkan | Petugas unit yang sama | Tidak | Ya (ubah) | B§9C; DBD §3 (draft = belum `submitted_at`) | OD-56 | [ ] Setuju [ ] Ubah: |
| PU-05 | Mengubah hasil yang sudah dikirim tetapi belum diverifikasi | USULAN: Dengan syarat | USULAN: hanya bila dikembalikan Dokter Unit (DU-05) atau dengan alasan; selalu sebagai revisi baru | USULAN: Ya | Ya (ubah) | B§9C; SD §5 butir 7 | OD-56 | [ ] Setuju [ ] Ubah: |
| PU-06 | Mengubah hasil yang sudah diverifikasi | USULAN: Tolak langsung | Koreksi lewat revisi baru dan verifikasi ulang (LP-07) | Tidak berlaku | Ya (penolakan) | SD §5 butir 7; DBD §5 (trigger melindungi revisi terverifikasi) | OD-56 | [ ] Setuju [ ] Ubah: |
| PU-07 | Membaca hasil unit lain | USULAN: Tolak | Pengecualian bila prasyarat klinis membutuhkannya (perlu aturan klinis yang disetujui) | Tidak | Ya (baca) | B§9C | OD-07 | [ ] Setuju [ ] Ubah: |
| PU-08 | Bertugas di lebih dari satu unit | USULAN: Dengan syarat | Hanya lewat penugasan unit eksplisit (LP-03); tetap atau mengikuti jadwal: OD-93 | Tidak | Ya (ubah penugasan) | B§9C; draft `account_role` | OD-93 | [ ] Setuju [ ] Ubah: |

### D. Dokter Unit (B§9D)

| ID | Aksi | Default | Syarat dan cakupan | Alasan | Audit | Bukti | Menjawab | Keputusan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DU-01 | Check in/out kehadiran di ruang | DITETAPKAN: Izinkan (UC21) | DITETAPKAN: dokter terafiliasi ke satu unit dan ruangan; satu dokter bertugas per tempat ("Telah ada dokter lain yang bertugas!") | Tidak | Ya (ubah) | UC21; `unit-doctor-presence.tsx` | OD-51 | [ ] Setuju [ ] Ubah: |
| DU-02 | Melihat antrian unit | DITETAPKAN: Izinkan (UC20) | USULAN: unit afiliasi saja | Tidak | Log akses | UC20; `/unit-doctor/queue` | OD-93 | [ ] Setuju [ ] Ubah: |
| DU-03 | Melihat hasil pemeriksaan unit | DITETAPKAN: Izinkan saat bertugas (UC22.1) | Unit afiliasi; hasil yang sudah dikirim petugas | Tidak | Ya (baca) | UC22.1; `/unit-doctor/review` | OD-93 | [ ] Setuju [ ] Ubah: |
| DU-04 | Memverifikasi hasil unit | DITETAPKAN: Izinkan saat bertugas (UC22) | DITETAPKAN: hasil sudah dikirim petugas; dokter bertugas. USULAN: revisi terkini saja; tidak memverifikasi hasil yang ia masukkan sendiri (LP-04) | Tidak (peringatan "Data tidak sesuai" butuh konfirmasi) | Ya (ubah) | UC22; SD §6 (`POST /results/{id}/verify`: assigned on-duty unit doctor) | OD-55, OD-57 | [ ] Setuju [ ] Ubah: |
| DU-05 | Mengembalikan hasil untuk diperbaiki | USULAN: Izinkan | Unit afiliasi, saat bertugas | USULAN: Ya | Ya (ubah) | B§9D; UIG §5 VerificationPanel (reject-with-reason) | OD-56 | [ ] Setuju [ ] Ubah: |
| DU-06 | Mengonfirmasi biaya jasa | DITETAPKAN sebagai aksi (UC22.2); implementasi DITUNDA (B§6, B§10) | DITETAPKAN: pasien selesai di unit tempat dokter bertugas; dokter bertugas; biaya 0 memicu peringatan PRD | Tidak | Ya (ubah) | UC22.2; `unit-doctor-review.tsx` field "Biaya jasa (Rp)" | OD-29 | [ ] Setuju [ ] Ubah: |
| DU-07 | Menyesuaikan komponen honorarium atau memberi diskon | USULAN: Tolak sampai keuangan memutuskan | Tidak ada | Bila kelak diizinkan: Ya | Ya (ubah) | B§9D; SD §11; UIG §6 | OD-29 | [ ] Setuju [ ] Ubah: |
| DU-08 | Bertindak di luar unit afiliasi atau di luar masa tugas | DITETAPKAN: Tolak untuk lihat hasil, verifikasi, dan tarif di luar masa tugas (UC22, UC22.1, UC22.2). USULAN: Tolak untuk unit lain | Tidak ada | Tidak berlaku | Ya (penolakan) | UC22, UC22.1, UC22.2 | OD-93 | [ ] Setuju [ ] Ubah: |

### E. Dokter MCU (B§9E)

| ID | Aksi | Default | Syarat dan cakupan | Alasan | Audit | Bukti | Menjawab | Keputusan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DM-01 | Membaca hasil MCU terkonsolidasi | DITETAPKAN: Izinkan (UC13.1) | DITETAPKAN: semua hasil unit terkirim dan terverifikasi; pasien selesai semua tahap. USULAN: semua pasien MCU, tanpa batas unit | Tidak | Ya (baca) | UC13.1; `/clinician/review` | OD-28 | [ ] Setuju [ ] Ubah: |
| DM-02 | Verifikasi akhir | DITETAPKAN: Izinkan (UC13) | Sama dengan DM-01; peringatan "Data tidak sesuai" (kondisi deteksi: OD-55) | Tidak | Ya (ubah) | UC13 | OD-55 | [ ] Setuju [ ] Ubah: |
| DM-03 | Meminta amandemen hasil ke unit | USULAN: Izinkan | Dikembalikan ke unit terkait; status final batal sampai verifikasi ulang | USULAN: Ya | Ya (ubah) | B§9E; SD §5 butir 7 | OD-56 | [ ] Setuju [ ] Ubah: |
| DM-04 | Mengirim hasil MCU | DITETAPKAN: Izinkan (UC14) | DITETAPKAN: hasil sudah diverifikasi Dokter MCU. Kanal: OD-12, OD-13; penerima: OD-15; syarat pelunasan: OD-30 (DITUNDA) | Tidak | Ya (ubah, pengiriman) | UC14; `clinician-review.tsx` Kirim | OD-12, OD-13, OD-15, OD-30 | [ ] Setuju [ ] Ubah: |
| DM-05 | Membuat, memvalidasi, dan mengirim surat keterangan | DITETAPKAN: Izinkan (UC16, UC16.1, UC17) | Ada permohonan; pasien sudah menerima hasil; template: OD-46 | Tidak | Ya (ubah) | UC16, UC16.1, UC17; `/clinician/certificates` | OD-44, OD-46 | [ ] Setuju [ ] Ubah: |
| DM-06 | Mendaftarkan peserta kolektif | DITETAPKAN: Izinkan (UC15) | Kapasitas: OD-35. Akun penanggung jawab, aturan satu per hari, dan tanggal (UC15 memasukkan tanggal vs B§3 H+1): OD-90. Akses peserta: OD-38 | Tidak | Ya (ubah) | UC15; `/clinician/collective` | OD-35 s.d. OD-40, OD-90 | [ ] Setuju [ ] Ubah: |
| DM-07 | Mencabut atau menggantikan hasil yang sudah terbit | USULAN: Dengan syarat | USULAN: hanya Dokter MCU; lewat revisi baru; dokumen lama tetap dapat dikenali sebagai digantikan (SD §5 butir 7); pemberitahuan ke penerima: kebijakan terbuka | USULAN: Ya | Ya (ubah) | B§9E; SD §5 | OD-56 | [ ] Setuju [ ] Ubah: |

### F. Manajemen (B§9F)

| ID | Aksi | Default | Syarat dan cakupan | Alasan | Audit | Bukti | Menjawab | Keputusan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MJ-01 | Melihat laporan agregat dan kuota | DITETAPKAN: Izinkan (UC23, UC24, UC25, UC26) | USULAN: tanpa identitas pasien | Tidak | Log akses | UC23 s.d. UC26; `/management/*`; `capacity.tsx` saat ini terbaca token mana pun (MVP A-3) | OD-31, OD-67 | [ ] Setuju [ ] Ubah: |
| MJ-02 | Melihat identitas level pasien | USULAN: Tolak | SD §8 dan UIG §3: Manajemen normalnya melihat data agregat (rekomendasi desain) | Bila kelak diizinkan: Ya | Ya (baca) | B§9F; SD §8; UIG §3 | OD-07, OD-65 | [ ] Setuju [ ] Ubah: |
| MJ-03 | Membaca isi ulasan dan aduan | DITETAPKAN: Izinkan (UC25: detail per aduan dan ulasan) | USULAN: identitas pengirim disembunyikan (MJ-04) | Tidak | Log akses | UC25; `management-feedback.tsx` | OD-64 | [ ] Setuju [ ] Ubah: |
| MJ-04 | Melihat identitas pengirim aduan | USULAN: Tolak (atau Dengan syarat untuk tindak lanjut aduan) | Bila diizinkan: hanya untuk aduan yang ditindaklanjuti | USULAN: Ya | Ya (baca) | B§9F; `management-feedback.tsx` "Identitas pengirim tidak ditampilkan" | OD-65 | [ ] Setuju [ ] Ubah: |
| MJ-05 | Mengekspor data | USULAN: Dengan syarat | USULAN: hanya agregat; tanpa NIK; aman dari formula spreadsheet (SD §8) | USULAN: Ya untuk ekspor di luar agregat | Ya (ekspor) | B§9F | OD-95 | [ ] Setuju [ ] Ubah: |
| MJ-06 | Melihat detail klinis atau keuangan | USULAN: Tolak kecuali diberi kewenangan khusus | Kewenangan khusus: siapa memberi, untuk berapa lama | Ya | Ya (baca) | B§9F | OD-07 | [ ] Setuju [ ] Ubah: |

### G. Editor (B§9G)

| ID | Aksi | Default | Syarat dan cakupan | Alasan | Audit | Bukti | Menjawab | Keputusan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ED-01 | Mengatur hari libur atau tutup layanan | DITETAPKAN: Izinkan (UC27) | DITETAPKAN: minimal 2 hari dari hari pengubahan; tidak lebih sedikit dari jumlah pasien terdaftar (UC27). Kaitan dengan registrasi H+1: OD-75 | Tidak | Ya (ubah) | UC27; `editor-calendar.tsx` | OD-75 | [ ] Setuju [ ] Ubah: |
| ED-02 | Mengubah kapasitas per tanggal (100 tempat utama, 50 daftar tunggu) | USULAN: Dengan syarat | UC27 (flow "Ubah Kuota"). USULAN: tidak di bawah hold sah + booking terkonfirmasi; tidak mengubah 100 + 50 menjadi 150 tempat yang dapat dibooking (B§4). Menaikkan di atas 100: terbuka | USULAN: Ya | Ya (ubah) | UC27; B§4, B§9G; `editor-calendar.tsx` (batas 400 di layar DIGANTIKAN B§4) | OD-32 | [ ] Setuju [ ] Ubah: |
| ED-03 | Menambah, mengubah, menghapus paket/layanan dan versinya | DITETAPKAN sebagai aksi (UC28); implementasi DITUNDA (B§10) | DITETAPKAN: tidak ada pasien terdaftar pada layanan saat diubah (UC28) | Tidak | Ya (ubah) | UC28; `editor-services.tsx` | OD-34, OD-09 | [ ] Setuju [ ] Ubah: |
| ED-04 | Mengubah harga | USULAN: Tolak sampai kewenangan diberikan keuangan; DITUNDA (B§10) | Tidak ada | Ya | Ya (ubah) | B§9G, B§10 | OD-34 | [ ] Setuju [ ] Ubah: |
| ED-05 | Mengubah konfigurasi setelah registrasi ada | DITETAPKAN: batas UC27 dan UC28 | Kalender/kuota: minimal 2 hari, tidak di bawah terdaftar; layanan: dikunci bila ada pendaftar | USULAN: Ya | Ya (ubah) | UC27, UC28 | OD-32, OD-34 | [ ] Setuju [ ] Ubah: |
| ED-06 | Menerbitkan perubahan langsung atau meminta persetujuan | USULAN: langsung untuk kalender dalam batas UC27; persetujuan untuk katalog dan harga (DITUNDA) | Siapa penyetuju: terbuka | Tidak | Ya (ubah) | B§9G | OD-34 | [ ] Setuju [ ] Ubah: |
| ED-07 | Membaca data pasien atau hasil klinis | USULAN: Tolak | SD §8: "Editors cannot read clinical results" (rekomendasi desain) | Tidak berlaku | Ya (penolakan) | SD §8 | OD-07 | [ ] Setuju [ ] Ubah: |

### H. Lintas peran (B§9 bagian cross-cutting)

| ID | Aksi | Default | Syarat dan cakupan | Alasan | Audit | Bukti | Menjawab | Keputusan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LP-01 | Menegakkan otorisasi | DITETAPKAN: setiap permintaan API diotorisasi di server (B§9; SD §1) | Peran + unit + kepemilikan; tolak secara default | Tidak berlaku | Ya (penolakan 403) | B§9; SD §1, §8; `route_guard.py` | OD-07 | [ ] Setuju [ ] Ubah: |
| LP-02 | Membuat dan menonaktifkan akun internal | USULAN: Dengan syarat | USULAN: pihak yang ditunjuk RS lewat proses tercatat (bukan salah satu tujuh peran PRD). Saat ini: operator dengan akses shell lewat CLI `create-client`; pencabutan token belum ada (MVP A-4) | USULAN: Ya | Ya (ubah) | B§9; MVP A-1, A-4; `route_guard.py` | OD-41, OD-43 | [ ] Setuju [ ] Ubah: |
| LP-03 | Memberi peran dan penugasan unit | USULAN: Dengan syarat | USULAN: oleh pihak yang sama dengan LP-02; tidak boleh memberi peran kepada diri sendiri | USULAN: Ya | Ya (ubah) | B§9; draft `account_role` | OD-41, OD-93 | [ ] Setuju [ ] Ubah: |
| LP-04 | Beberapa peran dalam satu akun | USULAN: Dengan syarat | USULAN: akun memilih ruang kerja eksplisit (UIG §4); server memeriksa peran yang dibutuhkan per aksi dan mencatat peran yang dipakai; orang yang sama tidak memasukkan dan memverifikasi hasil yang sama | Tidak | Ya (peran yang dipakai) | B§9; UIG §4 | OD-92 | [ ] Setuju [ ] Ubah: |
| LP-05 | Izin unit: tetap atau mengikuti jadwal tugas | USULAN: penugasan unit tetap untuk melihat; kehadiran bertugas untuk lihat hasil, verifikasi, dan tarif Dokter Unit (DITETAPKAN UC22, UC22.1, UC22.2) | Petugas Unit: terbuka | Tidak | Ya (ubah penugasan) | B§9; UC21, UC22 | OD-93 | [ ] Setuju [ ] Ubah: |
| LP-06 | Override urutan antrian unit | USULAN: Dengan syarat (Petugas Unit) | Selama smart queue ditunda, urutan dipilih manual; panggilan di luar urutan antrian unit dicatat | USULAN: Ya | Ya (ubah) | B§9, B§11; SD §5; `unit-queue.tsx` | OD-53 | [ ] Setuju [ ] Ubah: |
| LP-07 | Mengamandemen hasil terverifikasi | USULAN: Dengan syarat | USULAN: revisi baru oleh Petugas Unit setelah dikembalikan; verifikasi ulang Dokter Unit; status final dibatalkan dan ditinjau ulang Dokter MCU; dokumen lama ditandai digantikan | USULAN: Ya | Ya (ubah) | B§9; SD §5 butir 7 | OD-56 | [ ] Setuju [ ] Ubah: |
| LP-08 | Menentukan aksi yang wajib alasan | USULAN: daftar | USULAN: koreksi identitas oleh petugas (PM-03), pembatalan oleh petugas (PM-07), duplikat (PM-05), override antrian (LP-06), pengembalian dan amandemen hasil (PU-05, DU-05, DM-03, DM-07), perubahan kapasitas (ED-02), pembatalan booking terkonfirmasi (PA-06), registrasi pengecualian (OD-76), akses identitas oleh Manajemen bila diizinkan (MJ-02, MJ-04) | Tidak berlaku | Alasan disimpan di audit (draft `audit_event.reason`) | B§9; UIG §5 ConfirmationDialog | OD-96 | [ ] Setuju [ ] Ubah: |
| LP-09 | Membaca log audit | USULAN: Dengan syarat (pembaca audit yang ditunjuk) | USULAN: bukan Manajemen secara default; pembacaan log juga dicatat | Tidak | Ya (baca) | B§9; SD §8; DBD §5 (kredensial audit-reader) | OD-94 | [ ] Setuju [ ] Ubah: |
| LP-10 | Mengekspor data (semua peran) | USULAN: Dengan syarat | USULAN: tahap ini tanpa ekspor level pasien; ekspor agregat untuk Manajemen (MJ-05) | USULAN: Ya | Ya (ekspor) | B§9 | OD-95 | [ ] Setuju [ ] Ubah: |

## 5. Pertanyaan izin yang paling menahan backend

Diurutkan menurut dampak pada tahap backend berikut (registrasi H+1, kapasitas, akun, dan endpoint internal pertama).

1. **Siapa membuat, menonaktifkan, dan memberi peran akun internal, dan cara masuknya** (akun ISLAH sendiri atau SSO RS)? Tanpa ini tidak ada endpoint internal yang aman untuk dibuka. LP-02, LP-03; OD-41, OD-43.
2. **Penugasan unit: tetap atau mengikuti jadwal tugas, dan boleh lebih dari satu unit?** Menentukan bentuk pemeriksaan unit di setiap endpoint Petugas Unit dan Dokter Unit. LP-05, PU-08, DU-08; OD-93.
3. **Akses hasil bagi akun yang mendaftarkan**: tidak pernah, atau hanya dengan delegasi terverifikasi (dan bagaimana verifikasinya)? Menentukan endpoint unduh dokumen dan model `patient_access`. PA-07, PA-09; OD-14.
4. **Hak membatalkan per state**: aplikasi belum selesai, hold, booking terkonfirmasi; oleh akun atau petugas. Menentukan transisi kapasitas dan jatah. PA-05, PA-06, PM-07; OD-20, OD-22, OD-85.
5. **Sampai state apa identitas pasien boleh diubah akun, dan field apa yang boleh dikoreksi Petugas MCU** (termasuk NIK dan nama, dengan alasan)? PA-04, PM-03; OD-59.
6. **Registrasi oleh petugas (walk-in, kolektif): akun penanggung jawab dan berlaku tidaknya aturan satu per akun per hari dan H+1.** PM-04, DM-06; OD-90, OD-61.
7. **Rantai koreksi hasil**: siapa mengembalikan, siapa mengamandemen hasil terverifikasi, siapa mencabut atau menggantikan hasil terbit. PU-05, PU-06, DU-05, DM-03, DM-07, LP-07; OD-56.
8. **Beberapa peran per akun dan pemisahan tugas** (orang yang sama memasukkan dan memverifikasi). LP-04; OD-92.
9. **Daftar aksi yang wajib alasan dan siapa membaca log audit.** LP-08, LP-09; OD-96, OD-94.
10. **Batas Manajemen dan Editor**: identitas level pasien, identitas pengirim aduan, ekspor, dan apakah Editor boleh mengubah kapasitas 100/50 per tanggal. MJ-02, MJ-04, MJ-05, ED-02; OD-65, OD-95, OD-32.

## 6. Yang tidak dilakukan draft ini

- Tidak memutuskan kebijakan: setiap baris USULAN menunggu centang pemilik.
- Tidak menambah peran di luar tujuh peran PRD. Fungsi "pengelola akun" (LP-02, LP-03) dicatat sebagai fungsi yang perlu pemilik, bukan peran baru (A-1, OD-41).
- Tidak mengatur pembayaran, katalog, harga, atau smart queue di luar mencatat haknya; ketiganya DITUNDA (B§6, B§10, B§11-13).
