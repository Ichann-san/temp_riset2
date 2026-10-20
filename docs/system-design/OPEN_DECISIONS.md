# Keputusan Terbuka yang Sudah Punya Wujud di UI

| Metadata | Nilai |
| --- | --- |
| Tanggal / status | 17 Oktober 2026 / audit Workstream 2 (hanya baca), menunggu jawaban pemilik produk |
| Cakupan | Kebutuhan yang belum jelas atau belum diputuskan **dan** sudah punya elemen atau alur di frontend saat ini (layar pasien, layar enam peran internal, area admin) |
| Kode yang diperiksa | Commit `d6261d5` ditambah perubahan Workstream 1 yang belum di-commit di `/staff/worklist` (UC12 Catatan waktu layanan digabung ke Worklist per unit, `/staff/timing` diarahkan ke sana) |
| Tidak mengubah | PRD, kode, atau dokumen lain. Dokumen ini tidak menjawab pertanyaan dan tidak menebak jawaban |

> **Pembaruan 18 Oktober 2026 (baca dulu).** Keputusan pemilik terbaru mengubah status sebagian butir di dokumen ini. OD-01 (nomor antrian terbit setelah pembayaran terverifikasi) dan OD-02 (registrasi hanya H+1, tanggal ditetapkan sistem) kini **diputuskan**. Kuota 400/hari, aturan 3 pendaftaran per akun, dan prefill "Diri sendiri" **digantikan** (kapasitas layanan 100 tempat utama + 50 daftar tunggu FIFO; satu registrasi per akun per hari; form pasien kosong). Pembayaran, katalog resmi (OD-09), dan smart queue **ditunda**. Status yang berlaku untuk setiap butir ada di bagian 6 dan 7, butir baru OD-74 s.d. OD-96 di bagian 8, dan pertanyaan yang benar-benar menahan implementasi (P-01 s.d. P-12) di [RECONCILIATION_2026-10-18.md](RECONCILIATION_2026-10-18.md) §9. Bagian 1 s.d. 5 di bawah adalah audit 17 Oktober 2026 dan dibiarkan apa adanya sebagai riwayat.

> **Pembaruan 18 Oktober 2026, tahap 2.** Brief implementasi pemilik menjawab P-01 s.d. P-12 dan model registrasi sudah dibangun di backend. Status terbaru dan apa yang dibangun, ditunda, atau belum terselesaikan ada di **bagian 10**; bagian 10 berlaku di atas bagian 6 s.d. 9.

## Cara kerja dan cara membaca

**Metode.** Setiap layar dan komponen di `frontend/src` dibaca bersama metadata `useCases` di `screens-patient.ts` dan `screens-internal.ts`, data pengganti di `lib/mock-*.ts`, teks demo yang tersembunyi di balik `NEXT_PUBLIC_DEMO_LABELS` (`lib/demo.ts`), dan apa yang benar-benar ditegakkan backend (`backend/app/registration.py`, migrasi `002`). Temuan dicocokkan dengan PRD (UC01 s.d. UC28, §1.2, §2.1, §2.3, §2.4), register R-01 s.d. R-18 dan pertanyaan Q1 s.d. Q15 (`REQUIREMENTS_RESOLUTION.md`), A-1 s.d. A-4 (`MVP_REVIEW.md`), keputusan terbuka di `SYSTEM_DESIGN.md` §11, rencana dan to-do di `docs/plans/`, serta riwayat commit. Satu baris = satu pertanyaan. Keputusan pemilik tanggal 16 dan 17 Oktober 2026 diperlakukan sebagai **sudah ditetapkan**; yang dicatat hanya sisa pertanyaannya.

**Catatan D-1 s.d. D-9.** `MVP_REVIEW.md` §6 (baris 84) hanya menyebut kelompoknya ("admin, login, batas akses, notifikasi, langkah vs tab, dan lainnya"); rincian per nomor tidak ada di repository. Hanya D-5 yang dijelaskan (`TODO-wireframe-v2.md` baris 23). Di kolom "Terkait", D-n ditulis menurut topik tersebut.

**Kolom.**
- **Prioritas**: Tinggi = menahan alur inti pasien dan beberapa peran sekaligus; Sedang = menahan satu fitur atau satu peran; Rendah = menahan detail perilaku atau teks. ID diurutkan menurut dampak: OD-01 berdampak paling besar.
- **Blokir**: **Backend** = perilaku atau data server tidak dapat dibangun sebelum diputuskan; **UI** = hanya teks atau tampilan; **Konten** = bahan dari RS (teks, gambar, daftar) tanpa keputusan perilaku.
- **Bukti**: `file` baris n. Singkatan di bawah.

| Singkatan | Berkas |
| --- | --- |
| PRD | `docs/Digitalisasi MCU RSUD Haji.md` |
| RR | `docs/system-design/REQUIREMENTS_RESOLUTION.md` |
| MVP | `docs/system-design/MVP_REVIEW.md` |
| SD | `docs/system-design/SYSTEM_DESIGN.md` |
| UIG | `docs/system-design/UI_GUIDE.md` |
| DBD | `docs/system-design/DATABASE_DESIGN.md` |
| RB | `docs/system-design/REGISTRATION_BACKEND.md` |
| SDR | `docs/system-design/README.md` |
| PLAN | `docs/plans/2026-10-16-wireframe-v2-desktop-design.md` |
| TODO | `docs/plans/TODO-wireframe-v2.md` |
| FER | `frontend/README.md` |
| FED | `frontend/DESIGN.md` |
| BER | `backend/README.md` |
| Komponen | `patient.tsx`, `patient-registration.tsx`, `patient-forms.tsx`, `patient-page.tsx`, `prototype.tsx`, `auth.tsx`, `workspace.tsx`, `capacity.tsx`, `registration.tsx` ada di `frontend/src/components/`; berkas peran internal (`staff-*.tsx`, `clinician-*.tsx`, `unit-*.tsx`, `management-*.tsx`, `editor-*.tsx`) di `frontend/src/components/roles/`; `mock-*.ts`, `identity-meta.ts`, `screens-*.ts` di `frontend/src/lib/` |

## 1. Urutan dampak (sepuluh teratas)

> Per 18 Oktober 2026 urutan ini tidak berlaku lagi: OD-01 dan OD-02 diputuskan, OD-04, OD-05, OD-08, dan OD-09 ditunda, OD-10 digantikan OD-83 s.d. OD-86. Lihat bagian 6 dan RECONCILIATION §9.

| ID | Pertanyaan singkat | Blokir |
| --- | --- | --- |
| OD-01 | Kapan nomor antrian MCU diterbitkan? | Backend |
| OD-02 | Apakah pasien memilih tanggal MCU saat registrasi? | Backend |
| OD-03 | Di langkah mana alur registrasi melewati sesi registrasi FIFO? | Backend |
| OD-04 | Berapa biaya admin dan bagaimana kaitannya dengan tagihan akhir? | Backend |
| OD-05 | Metode dan penyedia pembayaran biaya admin apa? | Backend |
| OD-06 | Bagaimana pasien membuat akun dan masuk, dan dari mana data profil? | Backend |
| OD-07 | Layar dan aksi mana yang dibatasi per peran, unit, dan kepemilikan? | Backend |
| OD-08 | Bagaimana sistem menentukan unit berikutnya dan urutan panggil? | Backend |
| OD-09 | Apa sumber resmi katalog paket, isi paket, dan harga? | Backend |
| OD-10 | Kapan pendaftaran berhenti dihitung sebagai "aktif" (kuota 3 orang per akun)? | Backend |

Daftar lengkap ada di bagian 2, dikelompokkan per area; di dalam setiap kelompok baris diurutkan menurut ID.

## 2. Daftar utama keputusan terbuka

### 2.1 Lintas peran: identitas dan akun

| ID | Terkait | Prioritas / blokir | Layar / komponen | Yang diimplementasikan sekarang | Yang belum jelas | Keputusan yang dibutuhkan | Bukti | Dampak jika tidak diputuskan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OD-06 | MVP §4 (identitas); D-n topik login; SD §8 | Tinggi / Backend | `/` (`auth.tsx` LoginForm); Beranda `/patient` (data akun); langkah 1 registrasi pilihan "Diri sendiri" | Login username + password terhadap 8 akun mockup yang ada di bundle browser; profil "Pasien Demo" mengisi pilihan "Diri sendiri"; tidak ada pembuatan akun | PRD mensyaratkan akun pengguna (UC07), tetapi cara membuat akun, pengenal login, dan asal data profil belum ditetapkan. SD §8 hanya menyebut password ber-hash atau penyedia identitas yang ditinjau | Bagaimana pasien membuat akun dan masuk: (a) akun ISLAH dengan password, atau (b) penyedia identitas yang ditinjau RS? Data profil "Diri sendiri" diisi dari mana? | PRD l.313; MVP l.61; SD l.174; TODO l.24; FER l.33; `mock-accounts.ts` l.5-21; `auth.tsx` l.48-72 | Prefill "Diri sendiri", kuota per akun, Riwayat, dan kepemilikan semua data pasien tidak punya dasar identitas |
| OD-07 | A-3; D-n topik batas akses | Tinggi / Backend | Semua ruang kerja (`AuthGate` di `auth.tsx`); `/management/capacity` (`capacity.tsx`) | Pembatasan halaman per peran hanya simulasi di browser; token review mana pun dapat membaca angka kapasitas | Belum ada model peran di backend; batas per unit (petugas dan dokter unit hanya unitnya) dan per kepemilikan data belum diputuskan | Layar dan aksi mana yang dibatasi per peran, per unit, dan per kepemilikan data? | MVP l.18, l.67, l.78; SD l.176; `auth.tsx` l.14-28; `capacity.tsx` l.56 | Tidak ada endpoint internal yang aman untuk dibuka; semua layar internal tetap mockup |
| OD-16 | Keputusan 17 Okt (satu antrian aktif per NIK); PRD Batasan 4 | Sedang / Backend | Langkah 1 `/patient/registration` (`patient-registration.tsx` validateDraft) | Pemeriksaan "NIK ini sudah memiliki antrian aktif di akun ini" hanya di dalam satu akun | Aturan satu antrian aktif per NIK sudah ditetapkan, tetapi perilaku bila NIK sudah aktif lewat **akun lain** tidak ditetapkan, termasuk apa yang boleh diberitahukan kepada pendaftar kedua | Bila NIK sudah punya pendaftaran aktif dari akun lain, apa yang terjadi dan informasi apa yang ditampilkan kepada pendaftar kedua? | TODO l.21-22; PRD l.168; `patient-registration.tsx` l.46; `mock-session.ts` l.122-123 | Pembatasan per NIK di backend (TODO l.22) tidak dapat memberi galat yang benar; risiko membuka data pendaftaran orang lain |
| OD-17 | UC01 flow 2; SD §11 (identity integration); PRD Asumsi 1 | Sedang / Backend | Langkah 1 registrasi; Ubah data di `/staff/patient` | Hanya validasi bentuk: NIK 16 digit, nomor WhatsApp, tanggal lahir tidak di masa depan | PRD meminta verifikasi "sesuai data divisi RR" dengan peringatan "Data [XXX] tidak sesuai, apakah anda tetap ingin lanjut?". Sistem acuan dan kontrak integrasi (RR/SIMRS, Dukcapil) belum ada | Data diri dicocokkan dengan sistem apa (RR/SIMRS, Dukcapil, atau belum ada pencocokan pada rilis awal), dan field mana yang dicocokkan? | PRD l.10, l.146, l.196-197; SD l.85, l.219; `patient-registration.tsx` l.25-37 | Peringatan "Data tidak sesuai" tidak dapat dibangun; verifikasi NIK berulang di loket (masalah PRD l.10) tetap terjadi |
| OD-43 | SD §8; D-n topik login | Sedang / Backend | `/` login yang sama untuk semua peran | Petugas, dokter, manajemen, dan editor masuk dengan username + password mockup | SD mengusulkan SSO/MFA rumah sakit bila tersedia; belum diputuskan, begitu pula siapa yang membuat akun internal | Apakah peran internal masuk dengan akun ISLAH sendiri atau SSO rumah sakit, dan siapa yang membuat dan menonaktifkan akun mereka? | SD l.174; MVP l.84; `mock-accounts.ts` l.15-20 | Otorisasi internal (OD-07) tidak dapat diimplementasikan |

### 2.2 Lintas peran: pembayaran dan katalog

| ID | Terkait | Prioritas / blokir | Layar / komponen | Yang diimplementasikan sekarang | Yang belum jelas | Keputusan yang dibutuhkan | Bukti | Dampak jika tidak diputuskan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OD-04 | Q5; R-07 | Tinggi / Backend | `/patient/registration/review` (Rincian), `/terms` butir 2, Riwayat | Rincian hanya berisi harga paket dan layanan contoh; tidak ada baris biaya admin. S&K: "Tarif dan cara pembayaran mengikuti ketentuan rumah sakit" | PRD mewajibkan biaya admin sebagai tanda awal penerimaan nomor, tetapi nominalnya dan apakah biaya itu mengurangi pelunasan akhir tidak disebut | Berapa nominal biaya admin, apakah sama untuk semua paket, dan apakah biaya itu diperhitungkan dalam tagihan akhir? | PRD l.23; RR R-07 l.26, Q5 l.264; SD l.48, l.215; `patient-registration.tsx` l.233, l.338-339 | Rincian (UC03) dan Riwayat menampilkan total yang tidak sesuai kenyataan; backend tagihan tidak dapat dibuat |
| OD-05 | Q5; R-07; PRD Asumsi 3 | Tinggi / Backend | Alur `/patient/registration/review` ke `/done` | Tidak ada langkah bayar; setelah "Kirim pendaftaran" langsung tampil "Pendaftaran berhasil" dan nomor | Kanal bayar belum dipilih; PRD hanya mengasumsikan database RS mendukung pembayaran digital | Metode dan penyedia pembayaran biaya admin apa yang dipakai, dan apakah pembayaran dilakukan di aplikasi atau di kasir RS? | PRD l.149-150, l.163-164; RR Q5 l.264, C.5 l.227; SD l.84, l.215; `patient-registration.tsx` l.323-327, l.354 | Alur sukses registrasi melewati pembayaran; status "menunggu pembayaran" tidak dapat dirancang |
| OD-09 | Q5 (sumber data paket/harga); UC02, UC28 | Tinggi / Backend | `/patient/registration/services`, `/editor/services`, detail `/staff/patient`, biaya jasa `/unit-doctor/review` | Paket Haji, Paket CPNS, Laboratorium, Cek mata, THT dengan harga contoh wireframe; isi Paket Haji "belum tersedia" | Daftar resmi paket dan layanan, isi tiap paket, dan harga belum diterima; sumber datanya (diisi Editor di ISLAH atau diambil dari sistem tarif RS) belum ditetapkan | Apa sumber resmi katalog (paket, isi paket, layanan satuan, harga): diisi Editor di ISLAH atau diambil dari sistem tarif RS? | RR Q5 l.264, B.1 l.49, l.82; MVP l.138; `mock-catalog.ts` l.5-17; `mock-records.ts` l.171-175 | Langkah Layanan, total biaya, rincian daftar ulang, dan biaya jasa unit tetap angka contoh |
| OD-19 | Q5; SD §11 (hold TTL) | Sedang / Backend | `/patient/registration/review`, `/done`, kotak antrian | Tidak ada status "menunggu pembayaran"; pendaftaran langsung aktif | Batas waktu membayar biaya admin dan akibatnya bila lewat tidak ditetapkan | Berapa lama pasien boleh menunda pembayaran biaya admin, dan apa yang terjadi pada kuota dan pendaftarannya bila lewat? | PRD l.23; SD l.51, l.165, l.213, l.215 | Kuota harian dapat terkunci oleh pendaftaran yang tidak dibayar |
| OD-30 | SD §5 butir 8, §11 | Sedang / Backend | `/clinician/review` (tombol Kirim) | Kirim hanya memeriksa ada tidaknya nomor WhatsApp | Apakah tagihan akhir yang belum lunas menahan pengiriman hasil | Apakah hasil MCU boleh dikirim sebelum pasien melunasi tagihan akhir? | PRD l.23; SD l.125, l.215; `clinician-review.tsx` l.31-34 | Syarat tombol Kirim dan status pembayaran pada draft hasil tidak dapat ditentukan |

### 2.3 Lintas peran: nomor antrian dan antrian klinis

| ID | Terkait | Prioritas / blokir | Layar / komponen | Yang diimplementasikan sekarang | Yang belum jelas | Keputusan yang dibutuhkan | Bukti | Dampak jika tidak diputuskan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OD-01 | Q6; R-08; SD §11 | Tinggi / Backend | `/patient/registration/done`, kotak antrian `/patient`; Verifikasi di `/staff/patient`; pop-up Tambah pasien | Nomor contoh 3 digit acak terbit saat "Kirim pendaftaran"; layar petugas juga menyebut nomor saat Verifikasi dan saat Tambah pasien | PRD menyebut tiga saat berbeda: berdasar urutan registrasi (UC03), setelah biaya admin dibayar (Solusi 3), dan masuk Smart Queue saat daftar ulang (UC10) | Kapan nomor antrian MCU diterbitkan: (a) saat pendaftaran online dikirim, (b) setelah biaya admin dibayar, atau (c) saat daftar ulang di loket? | PRD l.23, l.237, l.360; RR R-08 l.27, Q6 l.265; SD l.119, l.214; `patient-registration.tsx` l.72-77, l.323-327; `staff-patient.tsx` l.111-114; `staff-add-patient.tsx` l.30 | Layar Dapat Nomor Antrian, kotak antrian, daftar ulang, dan semua antrian unit memakai nomor tanpa arti yang pasti; backend antrian tidak dapat dirancang |
| OD-08 | Q12; SD §11 | Tinggi / Backend | `/staff/worklist`, `/unit-staff/queue`, `/unit-doctor/queue`, estimasi di kotak antrian `/patient` | Urutan antrian unit mengikuti jam contoh; petugas boleh menekan Masuk pada nomor mana pun; estimasi tampil `--:-- WIB` | Aturan penempatan pasien ke unit berikutnya, urutan pemeriksaan, jeda wajib (misalnya lab), dan prioritas belum ada | Bagaimana sistem menentukan unit berikutnya dan urutan panggil per unit, dan siapa yang menyetujui aturan klinisnya? | PRD l.28-29, l.60-61; RR Q12 l.271; SD l.52, l.136-138, l.217; `unit-queue.tsx` l.46; `patient.tsx` l.47 | Worklist, antrian unit, estimasi, dan denah penunjuk tidak dapat dihitung |
| OD-11 | PRD Solusi 1; UC03; UC10 | Tinggi / Backend | `/staff/patient` (cari "Nomor registrasi", contoh `B-007`), `/clinician/review`, `/clinician/certificates`; pasien hanya melihat "Nomor antrian" | Dua pengenal: nomor registrasi `B-0xx` dan nomor antrian `0xx`; pasien tidak pernah melihat nomor registrasi | Solusi 1 menjanjikan satu nomor sepanjang proses, sedangkan UC03 dan UC10 memakai "nomor registrasi" | Apakah nomor registrasi dan nomor antrian adalah satu nomor yang sama? Bila berbeda, nomor mana yang dilihat pasien dan dipakai petugas saat daftar ulang? | PRD l.19, l.242, l.359; `mock-records.ts` l.184-196; `staff-patient.tsx` l.37, l.68-69, l.101; `clinician-review.tsx` l.64 | Petugas mencari dengan nomor yang tidak dimiliki pasien; skema nomor di backend tidak dapat ditetapkan |
| OD-69 | Q6 | Rendah / Backend | `/patient/registration/done`, kotak antrian, semua tabel internal | Nomor 3 digit acak, unik hanya di dalam akun (bentuk "XXX" dari wireframe) | Format resmi dan apakah nomor direset per tanggal layanan | Apa format nomor antrian MCU (jumlah digit, awalan bila ada, direset per hari atau tidak)? | PRD l.242; MVP l.109, l.126; `patient-registration.tsx` l.72-77 | Nomor contoh dapat dikira resmi; aturan keunikan di backend tidak dapat ditetapkan |

### 2.4 Lintas peran: notifikasi WhatsApp, PDF hasil, data dan privasi, kesegaran data

| ID | Terkait | Prioritas / blokir | Layar / komponen | Yang diimplementasikan sekarang | Yang belum jelas | Keputusan yang dibutuhkan | Bukti | Dampak jika tidak diputuskan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OD-12 | Q3; R-05 | Sedang / Backend | `/clinician/review` (Kirim), `/patient/results` (Riwayat) | Kirim hanya mengubah status menjadi "Terkirim"; draft hasil berupa placeholder; Riwayat tanpa unduhan | WhatsApp (UC14) dan PDF yang selalu dapat diunduh di aplikasi (Solusi 9) belum dipadukan; lampiran atau tautan belum dipilih | Bagaimana hasil diserahkan: (a) PDF sebagai lampiran WhatsApp, (b) tautan WhatsApp ke aplikasi yang memerlukan login, atau (c) keduanya; dan apakah unduhan termasuk Riwayat (UC07)? | PRD l.34-35, l.446; RR R-05 l.24, Q3 l.262; SD l.126; `clinician-review.tsx` l.33, l.69; `screens-patient.ts` l.23 | Format draft hasil, tombol unduh di Riwayat, dan pembuatan PDF di backend tertahan |
| OD-13 | Q11 | Sedang / Backend | Kirim di `/clinician/review` dan `/clinician/certificates`; konfirmasi pengajuan surat pasien | Kirim menandai terkirim; galat "WhatsApp pengguna tidak ditemukan!" disimulasikan dari data contoh | Penyedia WhatsApp dan cara mencatat persetujuan pasien untuk menerima pesan belum ditetapkan | Penyedia WhatsApp mana yang dipakai, dan bagaimana persetujuan pasien untuk menerima pesan dicatat? | RR Q11 l.270; SD l.86, l.222; `clinician-review.tsx` l.32-33; `clinician-certificates.tsx` l.70-71; `patient-forms.tsx` l.97 | Pengiriman hasil dan surat tidak dapat dibangun; status "Terkirim" tidak dapat diverifikasi |
| OD-14 | Q8; D-5 | Sedang / Backend | Kotak antrian `/patient` (baris orang lain), `/patient/results` | Pemilik akun melihat nomor, layanan, dan biaya orang yang ia daftarkan dan dapat membatalkannya; hasil belum ada | Apakah pendaftar juga boleh melihat dan mengunduh hasil MCU orang yang ia daftarkan; SD §8 mensyaratkan delegasi terverifikasi | Apakah pemilik akun boleh melihat hasil MCU orang yang ia daftarkan: (a) tidak, (b) hanya dengan delegasi yang diverifikasi, atau (c) selalu? | TODO l.23; RR Q8 l.267; SD l.176; `patient.tsx` l.24-60, l.150-167 | Riwayat dan pengiriman hasil tidak dapat menentukan penerima yang sah |
| OD-15 | Q11 (sebagian); UC14 | Sedang / Backend | Field "Nomor telepon (WhatsApp)" per orang di langkah 1; nomor akun di Beranda | Setiap orang yang didaftarkan punya nomor WhatsApp sendiri; akun juga menampilkan nomornya | Ke nomor mana hasil, surat, dan pemberitahuan dikirim bila pasien didaftarkan orang lain | Bila pasien didaftarkan orang lain, pesan WhatsApp dikirim ke nomor pasien, nomor pemilik akun, atau keduanya? | PRD l.147-148, l.446; `identity-meta.ts` l.7; `patient-registration.tsx` l.83-92; `patient.tsx` l.87 | Pesan medis dapat terkirim ke orang yang tidak berhak; terkait langsung dengan OD-14 |
| OD-42 | PRD §2.2 Performa; R-17; SD §9 | Sedang / Backend | Kotak antrian `/patient`; antrian unit; `/management/capacity` (Muat ulang) | Semua angka statis; kapasitas dibaca ulang hanya saat tombol ditekan | PRD meminta antrian "real time"; angka 10 s.d. 15 detik di SD hanya usulan dan R-17 hanya berlaku untuk iterasi review | Seberapa segar data antrian wajib tampil bagi pasien dan petugas di produksi, dan apakah pembaruan otomatis wajib? | PRD l.131; RR R-17 l.36; SD l.114, l.189 | Pilihan teknis (polling atau push) dan beban server tidak dapat dihitung |
| OD-66 | SD §8 (consent, retensi) | Rendah / Backend | Langkah 1: "Data tersimpan" dan "Simpan sebagai anggota untuk pendaftaran berikutnya" | Data lengkap orang lain (NIK, alamat, WhatsApp) disimpan di akun pendaftar | Persetujuan dari orang yang datanya disimpan dan masa simpannya belum ditetapkan | Apakah penyimpanan data orang lain sebagai anggota memerlukan persetujuan orang itu, dan berapa lama data disimpan? | SD l.176, l.180, l.222; `patient-registration.tsx` l.158-166, l.185-188; `mock-session.ts` l.129-137 | Fitur anggota tersimpan dapat bertentangan dengan kebijakan privasi RS |
| OD-71 | TODO (ejaan) | Rendah / UI | Pesan galat di `/clinician/review` dan `/clinician/certificates` | "WhatsApp pengguna tidak ditemukan!" | PRD menulis "Whatsapp" | Apakah pesan galat memakai ejaan "WhatsApp" atau teks PRD apa adanya? | TODO l.6; PRD l.449; PLAN l.26; `clinician-review.tsx` l.32 | Hanya teks |

### 2.5 Pasien: registrasi

| ID | Terkait | Prioritas / blokir | Layar / komponen | Yang diimplementasikan sekarang | Yang belum jelas | Keputusan yang dibutuhkan | Bukti | Dampak jika tidak diputuskan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OD-02 | UC01; SD §11 (registration windows) | Tinggi / Backend | Alur 4 langkah `/patient/registration` s.d. `/review` (`patient-registration.tsx`); kalender `/editor/calendar` | Tidak ada langkah memilih tanggal atau sesi MCU; pendaftaran langsung mendapat nomor tanpa tanggal layanan. Backend sesi dan kalender Editor sudah memakai tanggal | PRD menyebut "kuota ... di hari yang dituju" dan pesan "harap mengubah jadwal"; UIG mengusulkan langkah tanggal/sesi; wireframe v2 yang disetujui tidak memuat langkah tanggal | Apakah pasien memilih tanggal MCU saat registrasi? Bila ya, berapa jauh ke depan tanggal boleh dipilih; bila tidak, siapa yang menentukan tanggalnya? | PRD l.191, l.197; UIG l.95; PLAN l.13-17; RR l.208; `mock-records.ts` l.316-326 | Kuota harian 400, kalender Editor, Riwayat, dan nomor antrian tidak dapat dikaitkan ke tanggal layanan |
| OD-03 | R-10; RB; A-2 | Tinggi / Backend | `/patient/registration/session` (`registration.tsx`) terpisah dari alur mockup `/patient/registration` | Antrian sesi FIFO (100 aktif + 50 tunggu) hanya ada di halaman uji terpisah yang tautannya dikomentari; alur 4 langkah tidak melewati sesi | Titik masuk sesi dalam alur belum ditetapkan. TODO l.22 sudah menetapkan bahwa entri sesi memuat identitas orang | Pada langkah mana pasien masuk sesi registrasi FIFO (sebelum mengisi data, sebelum memilih layanan, atau saat kirim), dan apa yang terjadi pada isian bila pasien masih di posisi tunggu? | PRD l.20-21; RB l.11; RR C.1 l.156; TODO l.22; `patient-page.tsx` l.20, l.48-50 | Backend sesi yang sudah teruji tidak tersambung ke alur produk; perubahan ke 3 orang per akun tidak dapat dirancang |
| OD-10 | Keputusan 17 Okt (N = 3); PRD Batasan 4 | Tinggi / Backend | Kotak antrian `/patient`; layar "Kuota antrian akun penuh" di `/patient/registration` | Pendaftaran tetap aktif sampai dibatalkan; pesan: "Anda dapat mendaftar lagi setelah salah satu antrian selesai" | Peristiwa yang mengakhiri status aktif tidak ditetapkan (DBD memakai tahap `booked`, `arrived`, `in_progress`, `completed`) | Kapan pendaftaran berhenti menghitung kuota akun dan kuota per NIK: setelah semua pemeriksaan selesai, setelah hasil dikirim, atau setelah tanggal layanan lewat (termasuk bila tidak hadir)? | TODO l.21; PRD l.168; DBD l.33; `patient-registration.tsx` l.205; `mock-session.ts` l.31, l.122-124 | Kuota akun dapat penuh selamanya; backend tidak tahu kapan batas per NIK dilepas |
| OD-18 | Q7; R-09 | Sedang / Backend | Seluruh alur `/patient/registration` (draft di sessionStorage) | Draft bertahan tanpa batas waktu selama tab terbuka; pesan "Sesi anda telah habis!" tidak pernah muncul | Arti "sesi" (form pengguna atau sesi registrasi), lamanya, dan nasib tempat aktif yang ditinggalkan | Apa yang dimaksud "waktu sesi habis" pada UC02, UC02.1, dan UC03, berapa lama, dan apakah tempat aktif di sesi registrasi dilepas otomatis? | PRD l.214, l.230, l.245; RR R-09 l.28, Q7 l.266; SD l.51; BER l.33 | Tempat aktif dapat tertahan tanpa batas; pesan galat PRD tidak dapat dipicu |
| OD-47 | UC01 pre-condition; MVP §8 (konten) | Sedang / Konten | `/patient/registration/terms` | Empat butir teks pengganti (pendaftaran, biaya, pelaksanaan, data pribadi), termasuk aturan 3 orang per akun | Teks syarat dan ketentuan resmi dari RS belum ada | Apa teks syarat dan ketentuan resmi yang harus disetujui pasien? | PRD l.19, l.191; MVP l.138; TODO l.11; `patient-registration.tsx` l.228-238 | Persetujuan pasien tidak berdasar pada isi resmi; registrasi produksi tidak dapat dibuka |
| OD-70 | Keputusan 17 Okt ("orang lain + hubungan") | Rendah / UI | Langkah 1: "Hubungan dengan pemilik akun" | Pilihan: Orang tua, Anak, Pasangan, Saudara, Lainnya | Keputusan menyebut hubungan tanpa daftar nilai | Apa daftar pilihan hubungan yang resmi? | TODO l.21; `mock-session.ts` l.33; `patient-registration.tsx` l.167-171 | Hanya teks, kecuali bila akses hasil (OD-14) kelak bergantung pada hubungan |
| OD-72 | TODO (penyimpangan wireframe) | Rendah / UI | `/patient/registration/services`; footer Beranda (`prototype.tsx`) | Radio "Tanpa paket"; kartu Non paket tidak dapat diciutkan; footer tanpa ikon WhatsApp dan FAQ bukan tautan. Butir "tombol X alert" di TODO sudah tidak berlaku karena alert diganti kotak antrian | Persetujuan pemilik atas penyimpangan kecil yang masih ada (dicatat sebagai satu butir persetujuan di TODO) | Apakah penyimpangan yang tersisa (radio Tanpa paket, kartu Non paket, footer) disetujui? | TODO l.7; `patient-registration.tsx` l.280-295; `prototype.tsx` l.38-43; `patient.tsx` l.4 | Hanya tampilan |

### 2.6 Pasien: antrian dan pembatalan

| ID | Terkait | Prioritas / blokir | Layar / komponen | Yang diimplementasikan sekarang | Yang belum jelas | Keputusan yang dibutuhkan | Bukti | Dampak jika tidak diputuskan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OD-20 | UC01.1 (Terbuka); SD §11 | Sedang / Backend | Kotak antrian `/patient`: "Batalkan pendaftaran" (`patient.tsx` QueueRow) | Pembatalan dengan konfirmasi dapat dilakukan kapan saja selama baris aktif | Batas waktu pembatalan belum ditetapkan; aturan "sudah dilayani tidak dapat dibatalkan" menunggu RS | Sampai kapan pasien boleh membatalkan pendaftaran? | RR l.48, l.98-99; SD l.218; DBD l.33; `patient.tsx` l.49-57 | Tombol Batalkan tidak dapat diberi aturan; backend pembatalan tertahan |
| OD-21 | Q5; UC01.1 | Sedang / Backend | Konfirmasi pembatalan di kotak antrian | Teks konfirmasi tidak menyebut biaya | Pengembalian biaya admin saat dibatalkan | Apakah biaya admin dikembalikan saat pasien membatalkan (penuh, sebagian, atau tidak), dan lewat jalur apa? | RR l.99, Q5 l.264; SD l.215; BER l.32 | Teks konfirmasi dan alur keuangan pembatalan tidak dapat dibuat |
| OD-22 | UC01.1; SD §11 (quota return) | Sedang / Backend | Konfirmasi pembatalan | "Nomor antrian dilepas dan kuota akun kembali"; kuota harian tidak disebut | Apakah kuota harian 400 (dan kuota layanan khusus) dikembalikan dan dapat diambil pendaftar lain | Saat pendaftaran dibatalkan, apakah kuota harian tanggal itu dikembalikan dan dapat dipakai pendaftar lain? | SD l.165, l.218; RR l.96; `patient.tsx` l.51 | Kapasitas harian dapat berkurang permanen atau terjual berlebih |
| OD-23 | UC01.1; Q6 | Sedang / Backend | Konfirmasi pembatalan | Nomor yang dibatalkan dilepas; nomor lain tidak berubah | Dampak pembatalan ke nomor antrian orang lain | Apakah nomor yang dilepas dipakai ulang, dan apakah nomor peserta lain tetap atau bergeser? | RR l.99 | Nomor dapat ganda atau melompat tanpa aturan |
| OD-24 | UC04; UC04.1 | Sedang / Backend | Kotak antrian `/patient` (QueueRow) | Setiap baris selalu berstatus "Menunggu"; isi: layanan, jam daftar, tombol estimasi | PRD meminta pasien melihat nomor antrian terkini, unit pemeriksaan saat ini, dan unit yang harus ditunggu; status yang ditampilkan setelah daftar ulang belum ditetapkan | Status dan informasi apa yang wajib dilihat pasien per pendaftaran setelah daftar ulang (misalnya unit saat ini, nomor yang sedang dilayani, unit berikutnya)? | PRD l.60-61, l.251, l.265; DBD l.33; `patient.tsx` l.37-38 | Kotak antrian berhenti berguna setelah pasien tiba di RS |
| OD-48 | UC04.1; Q12 | Rendah / Backend | Kotak antrian: "Hitung estimasi waktu tunggu" lalu "Estimasi selesai --:-- WIB" | Label menyebut jam selesai | PRD menyebut estimasi waktu tunggu "di setiap unit" dan "di unit saat ini", sedangkan UI menampilkan "estimasi selesai"; satuan (jam, menit, rentang) belum ditetapkan | Apa yang diestimasi untuk pasien: waktu tunggu di unit saat ini, waktu tunggu per unit, atau perkiraan jam selesai seluruh MCU? | PRD l.265, l.270, l.273; SD l.138; `patient.tsx` l.46-48 | Teks estimasi dapat menjanjikan hal yang berbeda dari PRD |

### 2.7 Pasien: denah, riwayat, surat, aduan, beranda

| ID | Terkait | Prioritas / blokir | Layar / komponen | Yang diimplementasikan sekarang | Yang belum jelas | Keputusan yang dibutuhkan | Bukti | Dampak jika tidak diputuskan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OD-44 | UC06; keputusan 17 Okt (3 orang per akun) | Sedang / Backend | `/patient/certificates` (pop-up Surat Keterangan) | Form hanya "Keperluan" (dan isian "Lainnya"); tidak memilih orang atau kunjungan MCU | Dengan beberapa orang per akun, pengajuan surat belum terkait ke pasien dan hasil MCU tertentu | Bagaimana pengajuan surat dikaitkan ke satu pasien dan satu kunjungan MCU tertentu dalam akun? | PRD l.298; `patient-forms.tsx` l.86-125; `mock-session.ts` l.19; `clinician-certificates.tsx` l.51 | Dokter MCU tidak tahu hasil mana yang menjadi dasar surat; tenggat (OD-45) tidak dapat dihitung |
| OD-45 | Q9; R-18 | Sedang / Backend | `/patient/certificates` | Pengajuan selalu diterima | "Paling lambat 1 hari setelah hasil MCU dikeluarkan": 24 jam atau hari kalender | Apakah batas "1 hari" berarti 24 jam sejak hasil dikirim atau sampai akhir hari kalender berikutnya? | PRD l.298, l.303; RR R-18 l.37, Q9 l.268; SD l.220 | Pesan "Waktu permohonan telah usai!" tidak dapat diterapkan |
| OD-46 | UC06, UC16; MVP §8 (konten) | Sedang / Backend + konten | Pilihan "Keperluan" di `/patient/certificates`; "Template surat" di `/clinician/certificates` | Pilihan Haji, CPNS, Lainnya diturunkan dari teks kartu Beranda; template diganti isian teks bebas | Daftar jenis surat resmi dan template per jenis belum diterima | Jenis surat keterangan apa saja yang dilayani, dan apa template resmi setiap jenis? | PRD l.85, l.471, l.479; PLAN l.21; MVP l.138; TODO l.11; `patient-forms.tsx` l.82-83; `clinician-certificates.tsx` l.52 | "Validasi dan Simpan" tidak menghasilkan surat yang sah |
| OD-49 | UC05; PRD Solusi 7 | Rendah / Backend | `/patient/map` (pop-up Denah), kartu Denah di Beranda | Denah dapat dibuka siapa saja kapan saja; isi placeholder | PRD: denah menunjukkan arah ke unit tujuan dari posisi terakhir dan hanya untuk pasien yang sedang dalam antrian ("Tidak ada antrian saat ini") | Apakah denah berupa gambar statis untuk semua pengguna, atau harus menunjukkan rute ke unit berikutnya pasien (bergantung OD-08)? | PRD l.30-31, l.284-288; RR B.1 l.54; `patient.tsx` l.126-142 | Kartu Denah dapat tidak memenuhi UC05 |
| OD-50 | R-15 | Rendah / Konten | `/patient/map` | "Denah belum tersedia" | Gambar denah ruang pemeriksaan MCU dari RS | Denah resmi mana yang dipakai dan siapa yang menyediakannya? | RR R-15 l.34, B.1 l.54; MVP l.138; TODO l.11; `patient.tsx` l.137-142 | Halaman Denah tetap kosong |
| OD-62 | UC07 | Rendah / Backend | `/patient/results` (pop-up Riwayat), kotak "Riwayat" di bento Beranda | Semua pendaftaran akun tampil, termasuk yang Dibatalkan dan yang belum dilaksanakan; judul kartu = waktu kirim | PRD: riwayat berisi data registrasi, tanggal, dan pembayaran, dengan syarat akun telah menyelesaikan minimal satu MCU | Apa yang masuk Riwayat: semua pendaftaran (termasuk dibatalkan dan yang belum dilaksanakan) atau hanya MCU yang sudah dilaksanakan? | PRD l.64, l.313-317; `patient.tsx` l.118-120, l.144-167 | Riwayat dapat menampilkan data yang berbeda dari maksud UC07 |
| OD-63 | UC08; PRD Solusi 13 | Rendah / Backend | `/patient/feedback` (pop-up Aduan dan Ulasan) | Form dapat dikirim kapan saja, tanpa syarat riwayat MCU | UC08 mensyaratkan MCU selesai dan hasil diterima (galat "Tidak ada riwayat yang tersedia!"), sedangkan Solusi 13 juga menerima aduan tentang aplikasi | Apakah ulasan dan aduan hanya boleh dikirim setelah MCU selesai, atau aduan tentang aplikasi boleh dikirim kapan saja? | PRD l.42-43, l.65, l.327, l.332; `patient-forms.tsx` l.36-80 | Syarat akses form tidak dapat ditetapkan |
| OD-64 | UC08; UC25 | Rendah / Backend | `/patient/feedback`; `/management/feedback` | Field: jenis (Aduan/Ulasan), nilai 1 s.d. 5, pesan; tidak terkait kunjungan atau unit | Solusi 13 membedakan aduan aplikasi dan aduan layanan; UC25 meminta laporan "gap digitalisasi" | Apakah ulasan/aduan harus dikaitkan ke kunjungan dan unit tertentu, dan apakah dibedakan antara aplikasi dan layanan? | PRD l.43, l.116, l.644; `patient-forms.tsx` l.64-68; `management-feedback.tsx` l.40-50 | Laporan Manajemen per unit atau per kategori tidak dapat dibuat |
| OD-73 | MVP §8 (konten) | Rendah / Konten | Footer Beranda (`prototype.tsx` PatientFooter) | "Kendala? Hubungi WhatsApp 08xx-xxxx-xxxx", "FAQ menyusul" | Nomor kontak resmi dan isi FAQ | Nomor kontak dan isi FAQ resmi apa yang ditampilkan? | MVP l.138; TODO l.11; `prototype.tsx` l.40 | Pasien tidak punya kanal bantuan nyata |

### 2.8 Petugas MCU

| ID | Terkait | Prioritas / blokir | Layar / komponen | Yang diimplementasikan sekarang | Yang belum jelas | Keputusan yang dibutuhkan | Bukti | Dampak jika tidak diputuskan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OD-25 | Q14; R-16 | Sedang / Backend | Pop-up Tambah pasien di `/staff/patient` (`staff-add-patient.tsx`) | Pasien walk-in langsung mendapat nomor tanpa pemeriksaan kuota | Apakah walk-in memakai kuota 400/hari yang sama | Apakah pasien walk-in memakai kuota harian 400 yang sama dengan registrasi online, dan apa yang terjadi bila kuota penuh? | RR R-16 l.35, Q14 l.273; SD l.218; `staff-add-patient.tsx` l.32-40 | Kuota harian tidak dapat dijaga bila loket menambah pasien |
| OD-26 | UC11 | Sedang / Backend | Pop-up Tambah pasien | Form hanya data diri; tidak ada paket atau layanan | UC11 tidak menyebut pemilihan layanan untuk walk-in | Apakah petugas memilih paket/layanan pasien walk-in di Tambah pasien, atau di langkah lain? | PRD l.381-393; `staff-add-patient.tsx` l.23, l.42-44 | Walk-in masuk antrian tanpa daftar pemeriksaan; worklist dan tagihannya kosong |
| OD-27 | UC11; PRD Solusi 3 | Sedang / Backend | Pop-up Tambah pasien | Tidak ada pembayaran; nomor langsung tampil | Solusi 3 mengaitkan biaya admin dengan penerimaan nomor, UC11 tidak menyebut biaya | Apakah pasien walk-in membayar biaya admin, dan di mana? | PRD l.23, l.388; `staff-add-patient.tsx` l.30 | Alur loket tidak sejalan dengan alur online |
| OD-54 | UC12; UC23 | Rendah / Backend | `/staff/worklist` (catatan waktu, UC12 digabung oleh Workstream 1); `/management/reports` | Tunggu = mulai menunggu sampai Masuk; TAT = mulai menunggu sampai Keluar, dihitung dari jam contoh | Peristiwa "mulai menunggu" belum didefinisikan, begitu pula TAT keseluruhan alur | Kapan waktu tunggu suatu unit mulai dihitung, dan apa definisi TAT per unit dan TAT keseluruhan MCU? | PRD l.114, l.399, l.614; `management-reports.tsx` l.65; `screens-internal.ts` (useCases UC12, UC23) | Laporan Petugas MCU dan Manajemen dapat berbeda arti; backend tidak tahu peristiwa apa yang dicatat |
| OD-58 | UC10; PRD Asumsi 5 | Rendah / Backend | `/staff/patient` (field "Nomor registrasi" + Cari) | Petugas mengetik nomor registrasi | PRD menyebut "pasien yang dipanggil" serta pemindai barcode dan kios mandiri; cara memanggil dan mengenali pasien belum ditetapkan | Bagaimana pasien dikenali saat daftar ulang: nomor diketik, kode dipindai, atau melalui kios mandiri? | PRD l.153-154, l.359; SD l.50; `staff-patient.tsx` l.60-72 | Bukti pendaftaran yang dibawa pasien dan perangkat loket tidak dapat ditentukan |
| OD-59 | UC10.1 | Rendah / Backend | `/staff/patient` (Ubah) | Ubah mencakup 8 field identitas termasuk NIK; layanan dan biaya tidak dapat diubah | PRD: petugas "mengubah hingga menginput data pasien"; apakah termasuk paket/layanan tidak jelas | Data apa yang boleh diubah petugas saat daftar ulang: identitas saja, atau juga paket/layanan beserta biayanya? | PRD l.73, l.367, l.376; `staff-patient.tsx` l.82-108 | Perubahan layanan di loket tidak tercatat atau perubahan identitas tidak terkendali |
| OD-60 | SD §11 (no-show) | Rendah / Backend | `/staff/patient` ("Booking hari ini", "Booking menunggu daftar ulang") | Booking yang tidak daftar ulang tetap di daftar | Perlakuan pasien yang tidak datang, terlambat, atau datang di tanggal lain | Apa yang terjadi pada pendaftaran yang tidak melakukan daftar ulang pada tanggalnya, dan apakah kuotanya dikembalikan? | SD l.218; DBD l.33; `staff-patient.tsx` l.49-53, l.59 | Daftar menunggu daftar ulang menumpuk; kuota akun pasien (OD-10) tidak pernah lepas |
| OD-61 | UC11 | Rendah / Backend | Pop-up Tambah pasien | Yang tercatat hanya nama, NIK, nomor; tidak ada akun | Apakah walk-in mendapat akses aplikasi untuk antrian, riwayat, dan hasil | Apakah pasien walk-in dibuatkan akun aplikasi atau ditautkan ke akun yang sudah ada? | PRD l.313, l.383-388; `staff-add-patient.tsx` l.12, l.38 | Walk-in tidak dapat melihat antrian atau mengunduh hasil |

### 2.9 Dokter MCU

| ID | Terkait | Prioritas / blokir | Layar / komponen | Yang diimplementasikan sekarang | Yang belum jelas | Keputusan yang dibutuhkan | Bukti | Dampak jika tidak diputuskan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OD-35 | Q4; R-16 | Sedang / Backend | `/clinician/collective` (`clinician-collective.tsx`) | Ringkasan "Kolektif memakai kuota yang sama: Menunggu keputusan (Q4)" | Apakah batch kolektif memotong kuota 400/hari | Apakah peserta kolektif memakai kuota harian 400 yang sama, dan apa yang terjadi bila jumlah peserta melebihi sisa kuota? | PRD l.459, l.462; RR R-16 l.35, Q4 l.263; `clinician-collective.tsx` l.27 | Validasi tanggal dan jumlah peserta tidak dapat ditetapkan |
| OD-36 | Q4 | Sedang / Backend | `/clinician/collective` (file .csv) | Hanya nama file yang diperiksa; isi tidak dibaca | Kolom wajib dan format CSV | Apa format CSV resmi (kolom, urutan, format tanggal dan NIK)? | PRD l.463-465; RR Q4 l.263; `clinician-collective.tsx` l.56-57 | Galat "Data tidak valid pada baris [X]" tidak dapat dibangun |
| OD-37 | Q4; SD §11 | Sedang / Backend | `/clinician/collective` | Batch langsung berstatus "Diterima (mockup)" | Perlakuan bila sebagian baris tidak valid | Bila sebagian baris CSV tidak valid, apakah seluruh batch ditolak atau baris yang valid tetap didaftarkan? | RR Q4 l.263; SD l.130, l.221; UIG l.109; `clinician-collective.tsx` l.44 | Status batch dan laporan galat tidak dapat dirancang |
| OD-38 | Q4; SD §5 (collective) | Sedang / Backend | `/clinician/collective` | Tidak ada akun yang dibuat dan tidak ada file unduhan | PRD meminta akun sementara dan CSV kredensial yang dapat diunduh; SD mengusulkan undangan aktivasi sekali pakai yang perlu persetujuan | Bagaimana peserta kolektif mendapat akses: (a) akun sementara dengan kredensial dalam CSV sesuai PRD, atau (b) undangan aktivasi sekali pakai sesuai usulan SD? | PRD l.460, l.464; SD l.132, l.221; UIG l.109 | Peserta kolektif tidak dapat melihat antrian, riwayat, atau hasil |
| OD-39 | UC15; UC02 | Sedang / Backend | `/clinician/collective` | Form: tanggal, jumlah, file; tanpa paket | UC02 menyebut paket bebas hanya untuk pendaftar individu non institusional; paket peserta kolektif tidak disebut | Paket dan layanan peserta kolektif ditentukan dari mana: satu paket per batch atau per baris CSV? | PRD l.207, l.462-464; `clinician-collective.tsx` l.50-58 | Worklist dan tagihan peserta kolektif kosong |
| OD-40 | DBD (alokasi pembayaran kolektif) | Sedang / Backend | `/clinician/collective` | Tidak ada biaya | Siapa yang membayar biaya admin dan tagihan peserta kolektif | Siapa yang membayar biaya admin dan tagihan peserta kolektif (peserta atau institusi), dan apakah satu pembayaran boleh menutup banyak peserta? | DBD l.51; PRD l.23 | Model pembayaran kolektif tidak dapat dibuat |
| OD-55 | UC13; UC22 | Rendah / Backend | `/clinician/review`, `/unit-doctor/review` | Peringatan "Data tidak sesuai, apakah anda yakin memverifikasi?" muncul dari tanda `mismatch` pada data contoh | Kondisi yang membuat sistem mendeteksi ketidaksesuaian data tidak didefinisikan | Ketidaksesuaian data apa yang wajib dideteksi sistem sebelum verifikasi? | PRD l.421, l.580; `clinician-review.tsx` l.70, l.80; `unit-doctor-review.tsx` l.34, l.75 | Peringatan PRD hanya dapat dibangun sebagai tanda manual |

### 2.10 Petugas Unit

| ID | Terkait | Prioritas / blokir | Layar / komponen | Yang diimplementasikan sekarang | Yang belum jelas | Keputusan yang dibutuhkan | Bukti | Dampak jika tidak diputuskan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OD-28 | UC18; UC22.1; UC13.1 | Sedang / Backend | `/unit-staff/results`, `/unit-doctor/review`, `/clinician/review` | Isian teks bebas sementara; nilai hasil tidak ditampilkan | Template hasil per unit (field, satuan, nilai rujukan) belum disetujui dan pemiliknya belum ditunjuk | Siapa yang menetapkan template hasil per unit, dan untuk unit mana saja template dibutuhkan pada rilis pertama? | PRD l.522; RR B.1 l.70; `unit-staff-results.tsx` l.57; `unit-doctor-review.tsx` l.69; `clinician-review.tsx` l.69 | Input hasil, verifikasi unit, draft hasil, dan PDF tidak dapat dibangun |
| OD-52 | UC19; SD §5 (queue scheduling) | Rendah / Backend | `/unit-staff/queue` (`unit-queue.tsx`) | Masuk nonaktif selama ada satu nomor "Diperiksa"; satu nomor dilayani per unit | SD memodelkan beberapa ruangan per unit; PRD tidak menyebut jumlah ruangan atau pemeriksa paralel | Apakah satu unit dapat melayani lebih dari satu pasien sekaligus, dan apakah antrian dicatat per unit atau per ruangan? | SD l.136; PRD l.96-97; `unit-queue.tsx` l.26-27, l.37-42 | Kontrol Masuk/Keluar dan kartu "Nomor sedang dilayani" salah untuk unit dengan beberapa ruangan |
| OD-53 | Q12; SD §5 (override) | Rendah / Backend | `/unit-staff/queue` (Masuk per baris) | Petugas boleh menekan Masuk pada nomor mana pun | SD mengusulkan rekomendasi sistem dengan pengecualian oleh petugas yang diaudit; belum disetujui | Apakah petugas unit boleh memanggil nomor di luar urutan sistem, dan apakah alasannya wajib dicatat? | SD l.138; PRD l.165-166; `unit-queue.tsx` l.26-27 | Urutan antrian tidak dapat ditegakkan atau diaudit |

### 2.11 Dokter Unit

| ID | Terkait | Prioritas / blokir | Layar / komponen | Yang diimplementasikan sekarang | Yang belum jelas | Keputusan yang dibutuhkan | Bukti | Dampak jika tidak diputuskan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OD-29 | Q13; SD §11 | Sedang / Backend | `/unit-doctor/review` (field "Biaya jasa (Rp)") | Field terisi harga contoh layanan; dokter dapat mengubah; nilai 0 memicu peringatan PRD | Apakah yang dikonfirmasi adalah harga layanan, honorarium dokter, atau penyesuaian; siapa yang berwenang memberi diskon | Apa yang dikonfirmasi dokter unit pada UC22.2 (harga layanan, honorarium, atau keduanya), dan siapa yang berwenang mengubah atau memberi diskon? | PRD l.600, l.607-608; RR Q13 l.272; SD l.54, l.216; UIG l.105; `unit-doctor-review.tsx` l.20, l.71 | Tagihan akhir dan laporan keuangan tidak dapat dihitung |
| OD-51 | UC21 | Rendah / Backend | `/unit-doctor/presence`; semua layar unit | Unit dan ruangan contoh ("Unit Laboratorium", "Ruang contoh 1") | Daftar resmi unit dan ruangan MCU serta afiliasi dokter ke unit/ruangan belum ada | Apa daftar resmi unit dan ruangan MCU, dan bagaimana dokter unit ditautkan ke unit dan ruangannya? | PRD l.562; RR B.1 l.73; `mock-records.ts` l.180-182; `unit-doctor-presence.tsx` l.27-29 | Kehadiran dokter, antrian unit, dan denah tidak punya data acuan |
| OD-56 | UC22; SD §5 (corrections); SDR (amendment rules) | Rendah / Backend | `/unit-staff/results` (kolom Revisi), `/unit-doctor/review`, `/clinician/review` | Revisi bertambah saat petugas mengirim; dokter hanya punya tombol Verifikasi | Tidak ada aturan mengembalikan hasil untuk diperbaiki atau merevisi hasil yang sudah diverifikasi atau dikirim | Siapa yang boleh mengembalikan hasil untuk diperbaiki, dan apakah hasil yang sudah diverifikasi atau dikirim boleh direvisi? | SDR l.27; SD l.124; UIG l.105; `unit-staff-results.tsx` l.61 | Tidak ada jalur koreksi; hasil yang salah hanya dapat diverifikasi atau dibiarkan |
| OD-57 | UC22 | Rendah / Backend | `/unit-doctor/review` | Pesan "Kode bar verifikasi: format belum ditetapkan" | Isi kode bar, tempat dicetak, dan informasi yang terlihat saat dipindai | Apa yang dikodekan kode bar verifikasi dokter unit, di mana ditampilkan, dan informasi apa yang terlihat saat dipindai? | PRD l.105, l.572, l.577; SD l.180; `unit-doctor-review.tsx` l.37 | Verifikasi unit tidak menghasilkan bukti yang dapat diperiksa |

### 2.12 Manajemen

| ID | Terkait | Prioritas / blokir | Layar / komponen | Yang diimplementasikan sekarang | Yang belum jelas | Keputusan yang dibutuhkan | Bukti | Dampak jika tidak diputuskan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OD-31 | Q2; R-02; PRD Solusi 8 | Sedang / Backend | `/management/capacity` (filter "Layanan khusus" nonaktif; `capacity.tsx`) | Filter nonaktif; baris "Kuota layanan khusus: Menunggu keputusan (Q2)" | Layanan berkuota khusus dan nilainya | Layanan mana yang berkuota khusus (psikiatri, EKG wanita, lainnya) dan berapa kuotanya per hari? | PRD l.32-33, l.659, l.666-667; RR Q2 l.261; `management-capacity.tsx` l.10-14; `capacity.tsx` l.53 | UC26 tetap parsial; aturan UC27 "kuota MCU tidak lebih sedikit dari kuota layanan khusus" tidak dapat diperiksa |
| OD-65 | UC25; SD §8 | Rendah / Backend | `/management/feedback` | "Identitas pengirim tidak ditampilkan" | Apakah Manajemen boleh melihat identitas pengirim aduan untuk tindak lanjut | Apakah ulasan dan aduan bersifat anonim bagi Manajemen, atau identitas pengirim boleh dilihat (dan oleh siapa)? | SD l.176; `management-feedback.tsx` l.64 | Tindak lanjut aduan dan aturan privasi tidak jelas |
| OD-67 | UC24 | Rendah / Backend | `/management/reports` (panel "Peta antrian per jam") | Placeholder "Grafik bottleneck harian/bulanan belum tersedia"; filter periode | Arti "peta antrian" dan definisi "bottleneck" | Apa yang dimaksud peta antrian dan bottleneck pada UC24 (ukuran, satuan waktu, dan ambangnya)? | PRD l.115, l.629; RR B.1 l.78; `management-reports.tsx` l.80 | Laporan antrian hanya berupa tabel rata-rata |

### 2.13 Editor

| ID | Terkait | Prioritas / blokir | Layar / komponen | Yang diimplementasikan sekarang | Yang belum jelas | Keputusan yang dibutuhkan | Bukti | Dampak jika tidak diputuskan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OD-32 | Q1; R-02 | Sedang / Backend | `/editor/calendar` (`editor-calendar.tsx`) | Editor dapat mengubah Buka/Libur dan kuota per tanggal (paling banyak 400, tidak di bawah jumlah terdaftar) | Judul UC27 = hari libur, flow = ubah kuota; boleh tidaknya Editor mengubah dan menurunkan kuota | Apakah Editor boleh mengubah kuota per tanggal selain hari libur, dan bolehkah kuota diturunkan di bawah 400? | PRD l.674, l.678-682; RR R-02 l.19, Q1 l.260; `editor-calendar.tsx` l.49, l.60 | Field Kuota di kalender dapat hilang atau berubah aturan; backend `CHECK 1..400` tidak punya jalur ubah |
| OD-33 | R-02; SD §11; BER | Sedang / Backend | `/editor/calendar`; `/patient/registration/session`; `/management/capacity` | Sesi registrasi dibuka dan ditutup operator lewat CLI; kalender Editor tidak mengenal sesi | Siapa yang membuka dan menutup sesi, serta kapan registrasi untuk suatu tanggal dibuka dan ditutup | Siapa yang mengatur sesi registrasi (Editor lewat aplikasi atau operator), dan kapan registrasi untuk suatu tanggal dibuka dan ditutup? | PRD l.20-21; RR B.1 l.81; SD l.213; RB l.5; BER l.121 | Pasien tidak tahu kapan dapat mendaftar; sesi tetap memerlukan operator server |
| OD-34 | UC28; Q5 | Sedang / Backend | `/editor/services` (`editor-services.tsx`) | Editor hanya dapat mengubah nama dan informasi; harga dan isi paket tampil tetapi tidak dapat diubah; tidak ada tambah atau hapus layanan | PRD §2.1.7: Editor dapat "menambah, mengurangi, atau mengubah" informasi layanan; kewenangan atas harga dan isi paket belum jelas | Apakah Editor boleh menambah dan menghapus layanan/paket serta mengubah harga dan isi paket, atau sebagian dikelola pihak lain? | PRD l.124, l.689-698; RR B.1 l.82; `editor-services.tsx` l.26, l.53-60 | Halaman Informasi layanan tidak lengkap; katalog (OD-09) tidak punya pengelola |

### 2.14 Admin

| ID | Terkait | Prioritas / blokir | Layar / komponen | Yang diimplementasikan sekarang | Yang belum jelas | Keputusan yang dibutuhkan | Bukti | Dampak jika tidak diputuskan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OD-41 | A-1; D-n topik admin (D-1 s.d. D-4) | Sedang / Backend | `/admin` (`workspace.tsx` AdminPage); menu akun "Area admin" dan "Tinjau sebagai" | Akun admin mockup membuka semua ruang kerja; subjudul "Fitur admin belum ditetapkan" | PRD tidak punya peran Admin; siapa pemegangnya, cara masuk, dan kewenangannya belum ditetapkan | Apakah ada peran Admin di aplikasi? Bila ya, siapa pemegangnya dan apa kewenangannya (misalnya mengelola akun petugas)? | MVP l.16, l.115; FER l.37; `workspace.tsx` l.32-34; `auth.tsx` l.20, l.39-42 | Pembuatan akun dan token tetap lewat CLI; area admin tidak dapat dipertahankan atau dihapus dengan dasar |
| OD-68 | A-2 | Rendah / UI | `/patient/registration/session` (panel "Token review") | Halaman uji sesi tetap ada, tetapi tautannya di Info review dikomentari sehingga hanya dapat dibuka langsung | Arti "free flow" dan nasib panel token review setelah ada login pasien | Apakah panel "Token review" dan halaman uji sesi dipertahankan untuk review, disembunyikan, atau dihapus? | MVP l.17; `patient-page.tsx` l.20, l.48-50; `screens-patient.ts` l.21 | Jalur uji backend dapat hilang tanpa sengaja atau tetap terbuka bagi pasien |

## 3. Tampak terbuka di UI, tetapi sudah ditetapkan

> Per 18 Oktober 2026 enam baris di tabel ini digantikan (angka 400, maks. 3 per akun, rencana backend 3 per akun + 1 per NIK, sebagian UC01.1, prefill "Diri sendiri", nomor berdasarkan urutan registrasi). Status yang berlaku ada di bagian 7.

Butir berikut tidak perlu ditanyakan lagi. Sisa pertanyaannya, bila ada, disebut di kolom terakhir.

| Hal yang terlihat di UI | Keputusan yang sudah ada | Sumber | Sisa terbuka |
| --- | --- | --- | --- |
| Angka 400 di kalender Editor dan pendaftaran kolektif, padahal PRD menyebut 100/hari | Maks. 400 peserta/hari, 100 aktif + 50 tunggu per sesi, FIFO | RR R-06 l.25; RB l.3, l.5; BER l.7-13 | OD-32 (perubahan kuota oleh Editor) |
| Kotak antrian "maks. 3", pilihan "Diri sendiri" dinonaktifkan bila sudah antri | Maks. 3 orang aktif per akun, satu antrian aktif per NIK (versi B) | TODO l.21; FER l.5; `mock-session.ts` l.31 | OD-10, OD-16 |
| Backend masih menolak entri kedua per akun (`ACTIVE_IN_OTHER_SESSION`) | Perubahan ke 3 orang per akun + 1 per NIK sudah diputuskan; tinggal pekerjaan backend | TODO l.22; RR R-10 l.29; `backend/app/registration.py` l.95 | OD-03 (titik masuk sesi) |
| Tombol "Batalkan pendaftaran" | UC01.1 ditambahkan: pelaku pemilik akun, konfirmasi, nomor dilepas, kuota akun kembali, Riwayat mencatat "Dibatalkan" | RR l.48, l.86-99 | OD-20 s.d. OD-23 |
| Beranda tanpa halaman Nomor Antrian | Beranda hub; kotak antrian menggantikan `/patient/tracking` | TODO l.21; FER l.5; RR B.2 l.111 | OD-24 |
| Langkah 1 "Daftar untuk siapa?" | Diri sendiri terisi dari profil; orang lain + hubungan + simpan sebagai anggota | TODO l.21; FER l.5 | OD-06 (asal profil), OD-66, OD-70 |
| Riwayat, Surat, Aduan, Denah terbuka sebagai pop-up | Disetujui 17 Oktober 2026 | FER l.5; FED l.9 | Tidak ada |
| Tambah pasien sebagai pop-up Daftar ulang | Disetujui; `/staff/add-patient` diarahkan ke `/staff/patient` | FER l.7; RR B.1 l.61 | OD-25 s.d. OD-27, OD-61 |
| Arah visual dan menu slot di header peran internal | "Minimal institusional" dan header slot menu disetujui | FED l.5, l.9; FER l.7; commit `9aad522` | Tidak ada |
| Registrasi bertahap per halaman (D-n topik "langkah vs tab") | Wireframe v2 yang disetujui memecah registrasi per frame; catatan "langkah bertahap tetap terbuka" di MVP §6 sudah tergantikan | PLAN l.3, l.13-17; MVP l.96, l.125 | Tidak ada |
| Fitur Kami 2x2 di 320px, tabel antrian unit boleh menggulir di sekitar 1280px, `--row-box: 30rem` | Keputusan pemilik fase 4. TODO l.8 masih mencantumkannya sebagai menunggu, tetapi dua sumber lain mencatat keputusan | PLAN l.71-75; MVP l.132 | Tidak ada (TODO l.8 perlu dicentang) |
| Ejaan "antrian", "Laboratorium", "Aduan dan ulasan" | Ditetapkan mengikuti PRD dan wireframe | PLAN l.26; MVP l.126 | OD-71 (hanya "WhatsApp") |
| Field "Pekerjaan" pada form identitas | Bagian frame Registrasi wireframe v2 | PLAN l.13; RR B.1 l.47 | Tidak ada |
| Input tidak diubah ke huruf kapital | PRD sudah mensyaratkan huruf kapital; DBD menempatkannya di batas input/domain. Ini celah implementasi, bukan pertanyaan | PRD l.19, l.191; DBD l.26 | Tidak ada |
| Tanda terima sesi registrasi di `/patient/registration/session` | Posisi tunggu sesi dan tanda terima bukan nomor antrian MCU | RR R-08 l.27, C.1 l.162 | OD-01 |
| Nomor antrian di kotak antrian | Nomor diberikan berdasarkan urutan registrasi | PRD l.59, l.237 | OD-01 (kapan terbit), OD-69 (format) |
| Tombol "Hitung estimasi waktu tunggu" | Estimasi dihitung saat pasien menekan tombol; galat "Gagal menghitung estimasi" | PRD l.273-274 | OD-08, OD-48 |
| Form Surat dapat dikirim kapan saja | Surat hanya setelah MCU selesai, beserta pesan galatnya (UI belum menegakkan) | PRD l.298, l.303 | OD-44, OD-45 |
| Kalender Editor menolak tanggal kurang dari 2 hari dan kuota di bawah jumlah terdaftar | Aturan pre-condition UC27 | PRD l.678; `editor-calendar.tsx` l.47-49 | OD-31, OD-32 |
| Informasi layanan dikunci bila ada pendaftar | Pre-condition UC28 | PRD l.693; `editor-services.tsx` l.52 | OD-34 |
| Peringatan "Data tidak sesuai ..." dan "Pasien tidak membayar anda ..." | Teks peringatan ditetapkan PRD | PRD l.421, l.580, l.608 | OD-55 (kondisi deteksi) |
| Status kehadiran dokter unit | Satu dokter bertugas per tempat; verifikasi hanya saat dokter bertugas (UI belum mengaitkan keduanya) | PRD l.566, l.576 | OD-51 |
| Tidak ada pembaruan otomatis; tombol "Muat ulang" | Iterasi review: tanpa polling dan tanpa timer | RR R-17 l.36 | OD-42 (produksi) |
| Layar Antrian unit untuk Dokter Unit dan Tambah pasien di Daftar ulang | Bagian layar dari Q14 sudah terjawab oleh implementasi 14 dan 17 Oktober | RR R-15 l.34, B.2 l.128, l.138; MVP l.94 | OD-25 (bagian kuota Q14) |

## 4. Kebutuhan terbuka yang belum punya UI (di luar audit ini)

Hanya disebut agar tidak tercampur dengan daftar utama.

- Layar dan alur pembayaran biaya admin, status pembayaran, webhook, dan rekonsiliasi (RR R-07 l.26, SD l.84, l.169).
- Tagihan akhir dan pelunasan setelah semua layanan, termasuk tampilannya ke pasien (PRD l.23, SD l.125).
- Pembuatan akun pasien, lupa password, halaman profil, dan pengelolaan anggota tersimpan (TODO l.12, l.24).
- Pengingat giliran untuk pasien (PRD Solusi 6, l.29).
- Pencabutan token review dan role database terpisah untuk API (A-4, MVP l.19).
- Arti "graph/GraphQL" (MVP l.25).
- Sizing dan SLA (Q10, RR l.269); hosting, retensi, dan backup (Q15, RR l.274).
- Laporan "gap digitalisasi" pada UC25 (PRD l.116, l.644).
- Pemeriksaan publik kode bar verifikasi (SD l.180).
- Antarmuka kios mandiri (PRD Asumsi 5, l.154); cara identifikasi di loket ada di OD-58.
- Pembatalan atau pemindahan jadwal oleh petugas atas nama pasien (SD l.218).
- Pemberitahuan dan penutupan otomatis sesi saat kuota harian penuh (RB l.11).
- Proses manual saat sistem tidak tersedia (SD l.197).

## 5. Rekap

| Area | Jumlah | Backend | UI atau konten saja |
| --- | --- | --- | --- |
| Lintas peran: identitas dan akun | 5 | 5 | 0 |
| Lintas peran: pembayaran dan katalog | 5 | 5 | 0 |
| Lintas peran: nomor antrian dan antrian klinis | 4 | 4 | 0 |
| Lintas peran: WhatsApp, PDF, privasi, kesegaran data | 7 | 6 | 1 |
| Pasien: registrasi | 7 | 4 | 3 |
| Pasien: antrian dan pembatalan | 6 | 6 | 0 |
| Pasien: denah, riwayat, surat, aduan, beranda | 9 | 7 | 2 |
| Petugas MCU | 8 | 8 | 0 |
| Dokter MCU | 7 | 7 | 0 |
| Petugas Unit | 3 | 3 | 0 |
| Dokter Unit | 4 | 4 | 0 |
| Manajemen | 3 | 3 | 0 |
| Editor | 3 | 3 | 0 |
| Admin | 2 | 1 | 1 |
| **Total** | **73** | **66** | **7** |

Prioritas: Tinggi 11 (OD-01 s.d. OD-11), Sedang 36 (OD-12 s.d. OD-47), Rendah 26 (OD-48 s.d. OD-73). Butir yang sudah ditetapkan (bagian 3): 24.

## 6. Reklasifikasi 18 Oktober 2026 (OD-01 s.d. OD-73)

Brief pemilik 18 Oktober 2026 (otoritas tertinggi; ringkasan KP-01 s.d. KP-12 di [RECONCILIATION_2026-10-18.md](RECONCILIATION_2026-10-18.md) §2) mengubah status sebagian butir di bagian 1 s.d. 3. Baris lama di atas **tidak dihapus** agar riwayatnya tetap terbaca; status yang berlaku sekarang ada di bagian ini. ID baris matriks izin (PA-, PM-, PU-, DU-, DM-, MJ-, ED-, LP-) merujuk ke [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md).

### 6.1 Arti status

| Status | Arti |
| --- | --- |
| DIPUTUSKAN | Brief menjawab pertanyaan inti. Bagian brief disebut. Sisa yang lebih sempit dipindah ke ID lain |
| DIGANTIKAN | Dasar pertanyaan (angka atau aturan lama) tidak berlaku lagi. Disebut penggantinya. Bila masih ada pertanyaan, dinyatakan ulang dengan dasar baru |
| DITUNDA | Brief mengeluarkan topik dari pembahasan atau implementasi tahap ini: pembayaran (B§6), katalog OD-09 (B§10), smart queue (B§11-13). Pertanyaan tetap tercatat, tidak dijawab |
| MENUNGGU KEPUTUSAN | Masih terbuka, dan brief menyentuh atau mempersempitnya. Sisa pertanyaan dinyatakan ulang |
| TIDAK BERUBAH | Brief tidak menyentuh. Pertanyaan tetap seperti di `OPEN_DECISIONS.md` (tetap terbuka) |

**Blokir backend**: "ya" = perilaku atau data server pada area itu tidak dapat dibangun sebelum dijawab. "tidak" = tidak menahan, atau areanya ditunda pada tahap ini. Keterangan singkat di dalam kurung.

"B konteks" = bagian konteks pengembangan pada brief (tanpa nomor), dirangkum di RECONCILIATION §3.

### 6.2 Status OD-01 s.d. OD-73

| OD | Judul lama (singkat) | Status baru | Dasar | Sisa pertanyaan | Blokir backend |
| --- | --- | --- | --- | --- | --- |
| OD-01 | Kapan nomor antrian MCU terbit | DIPUTUSKAN | B§6: nomor antrian MCU resmi terbit hanya setelah pembayaran biaya admin terverifikasi. Penerbitan nomor dan aktivasi antrian klinis setelah daftar ulang adalah dua peristiwa terpisah | Saat terbit sudah dijawab. Format di OD-69, dasar urutan nomor di OD-89 | tidak (keputusan ada; implementasi ikut tertahan pembayaran yang DITUNDA) |
| OD-02 | Apakah pasien memilih tanggal MCU | DIPUTUSKAN | B§3: registrasi hanya untuk H+1; pasien tidak memilih tanggal; sistem menetapkan dan menampilkan tanggal layanan di ringkasan, konteks pembayaran, booking terkonfirmasi, dan riwayat; Asia/Jakarta; tanggal yang sudah melekat pada aplikasi atau hold tidak dihitung ulang saat lewat tengah malam | Sisa dipecah ke OD-74 (jam buka/tutup), OD-75 (H+1 libur), OD-76 (registrasi pengecualian), OD-77 (pembayaran setelah jendela tutup), OD-78 (melewati tengah malam) | tidak (sisa di OD-74 s.d. OD-78) |
| OD-03 | Titik masuk sesi FIFO dalam alur | MENUNGGU KEPUTUSAN | B§4 memisahkan A (akses sementara ke proses registrasi), B (hold saat menunggu bayar), C (booking terkonfirmasi), D (daftar tunggu 50), E (antrian klinis); kelimanya tidak boleh berbagi penghitung | Dinyatakan ulang: (1) Apakah tahap akses sementara A tetap dipakai? (2) Bila ya, berapa batasnya? Backend sekarang memakai 100 aktif + 50 tunggu per sesi untuk A, sedangkan B§4 memakai 100 + 50 untuk kapasitas layanan; keduanya tidak boleh disamakan. (3) Di langkah mana pemohon masuk A, dan apa yang terjadi pada isian bila pemohon masih menunggu di A? | ya |
| OD-04 | Nominal biaya admin, kaitan dengan tagihan akhir | DITUNDA | B§6: tanpa nominal rekaan; tanpa asumsi dampak biaya admin ke tagihan akhir; pembayaran belum diimplementasikan | Tetap: nominal, sama untuk semua paket atau tidak, dan perhitungannya pada tagihan akhir | tidak (ditunda) |
| OD-05 | Metode dan penyedia pembayaran | DITUNDA | B§6: pembayaran dimaksudkan sepenuhnya online (sebagian terjawab: bukan di kasir RS); tanpa gateway atau metode rekaan. Sudah ditetapkan juga: verifikasi lewat backend tepercaya, redirect browser bukan bukti | Tetap: penyedia dan metode | tidak (ditunda) |
| OD-06 | Cara membuat akun, masuk, asal data profil | MENUNGGU KEPUTUSAN | B§7: setiap registrasi punya akun; verifikasi email dikonfirmasi; akun = penanggung jawab pengajuan, bukan harus pasien; form pasien mulai kosong; tanpa prefill identitas pasien dari akun. Bagian "asal data profil Diri sendiri" gugur | Dinyatakan ulang: password atau metode masuk lain? Penyedia email dan masa berlaku token verifikasi? Pemulihan akun dan ganti email? Apakah email wajib terverifikasi sebelum aplikasi pertama dibuat? | ya |
| OD-07 | Pembatasan per peran, unit, kepemilikan | MENUNGGU KEPUTUSAN | B§9: tujuh peran PRD; otorisasi rinci belum diputuskan; matriks izin disiapkan; API internal produksi tidak boleh bergantung pada pemeriksaan peran di browser | Dijawab per baris di [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md) (PA, PM, PU, DU, DM, MJ, ED, LP) | ya |
| OD-08 | Unit berikutnya dan urutan panggil | DITUNDA | B§11-13: smart queue hanya arah desain; tanpa mesin optimasi, layanan penjadwal, atau dependensi baru; FIFO registrasi tidak menjawab urutan klinis | Tetap tercatat beserta data yang dibutuhkan (B§11). Pemilihan pasien berikutnya secara manual selama smart queue ditunda: OD-53 | tidak (ditunda) |
| OD-09 | Sumber resmi katalog paket dan harga | DITUNDA | B§10: dikeluarkan dari pembahasan; bukan izin menghapus fitur paket/layanan; tanpa isi paket, harga, biaya admin, nilai rujukan, atau tarif rekaan | Tetap: sumber katalog | tidak (ditunda) |
| OD-10 | Kapan pendaftaran berhenti "aktif" (kuota 3 per akun) | DIGANTIKAN | B§7: aturan 3 pendaftaran per akun dihapus, diganti satu registrasi per akun per hari dengan satu pasien per registrasi | Pertanyaan semula gugur. Pengganti: OD-83 (hari pengajuan atau hari layanan), OD-84 (tahap konsumsi jatah), OD-85 (pemulihan jatah), OD-86 (aplikasi belum selesai). Bagian "kuota per NIK" pindah ke OD-16 | tidak (diganti OD-83 s.d. OD-86) |
| OD-11 | Nomor registrasi vs nomor antrian | MENUNGGU KEPUTUSAN | B§6 membedakan empat pengenal: referensi aplikasi/registrasi, referensi pembayaran, tiket sesi registrasi, nomor antrian MCU resmi; label tidak boleh dipertukarkan | Dipersempit: pengenalnya memang berbeda. Sisa: pengenal mana yang dipakai petugas untuk mencari saat daftar ulang (UC10 menyebut "nomor registrasi"), dan apakah pasien melihat referensi aplikasi selain nomor antrian resmi? | tidak (skema dapat menyimpan keempatnya; sisa = tampilan dan pencarian) |
| OD-12 | Bentuk penyerahan hasil (PDF, WhatsApp) | TIDAK BERUBAH | Tidak disentuh brief | Tetap seperti OD-12 | ya |
| OD-13 | Penyedia WhatsApp dan persetujuan | TIDAK BERUBAH | Tidak disentuh brief | Tetap | ya |
| OD-14 | Akses hasil oleh pemilik akun yang mendaftarkan | MENUNGGU KEPUTUSAN | B§9A: jangan menganggap membayar atau mendaftarkan memberi akses hasil; B§7: pasien boleh berbeda dari pemilik akun | Dipersempit: opsi (c) "selalu" tidak boleh menjadi default tanpa keputusan. Sisa: (a) tidak pernah, atau (b) hanya dengan delegasi atau persetujuan pasien yang diverifikasi, dan bagaimana verifikasinya? Lihat matriks PA-07 | ya |
| OD-15 | Nomor WhatsApp tujuan bila didaftarkan orang lain | TIDAK BERUBAH | B§7 menegaskan pasien boleh berbeda dari akun, sehingga pertanyaan makin relevan, tetapi tidak menjawabnya | Tetap | ya |
| OD-16 | NIK sudah aktif lewat akun lain | MENUNGGU KEPUTUSAN | B§8: aturan keras "satu pendaftaran aktif per NIK" tidak boleh dipertahankan hanya karena mockup memakainya dan tidak boleh dihapus diam-diam; konflik ditandai; dilarang membuka identitas, email, telepon, booking, atau nomor antrian akun lain | Dinyatakan ulang: apakah aturan keras satu pendaftaran aktif per NIK tetap berlaku lintas akun, diganti peringatan duplikat nama (B§8), atau keduanya? Bila tetap: pesan apa untuk pendaftar kedua tanpa membuka data akun lain? | ya |
| OD-17 | Pencocokan data diri dengan sistem acuan | MENUNGGU KEPUTUSAN | B§8 menambah pertanyaan terbuka: apakah NIK tersedia dan divalidasi | Dinyatakan ulang: apakah NIK wajib diisi pada form pasien? Bila wajib, divalidasi terhadap apa (format saja, RR/SIMRS, atau Dukcapil) dan field mana yang dicocokkan? | ya |
| OD-18 | Arti "waktu sesi habis" | MENUNGGU KEPUTUSAN | B§4 (A berbeda dari B); B§5 (hitung mundur browser hanya tampilan; tanpa pelepasan berbasis timer sebelum diputuskan; durasi dua menit tidak disetujui) | Dinyatakan ulang: pesan "Sesi anda telah habis!" (UC02, UC02.1, UC03) merujuk berakhirnya akses sementara A, berakhirnya hold B (OD-19), atau berakhirnya sesi login? Berapa lama masing-masing? | ya |
| OD-19 | Batas waktu membayar dan nasib kuota | MENUNGGU KEPUTUSAN | B§5: model tersedia, ditahan (menunggu bayar), terkonfirmasi setelah bayar terverifikasi; verifikasi tidak mengurangi kapasitas dua kali; masa hold, batas waktu bayar, dan pelepasan saat batal eksplisit belum diputuskan; tanpa pelepasan otomatis berbasis timer | Dinyatakan ulang: berapa masa hidup hold pembayaran, peristiwa apa yang melepas hold (batal eksplisit, gagal bayar, kedaluwarsa), dan siapa atau apa yang menjalankan pelepasan? Masa hidup hold dicatat di sini, tidak dibuat ID baru | ya (pelepasan hold) |
| OD-20 | Batas pembatalan oleh pasien | MENUNGGU KEPUTUSAN | B§9A (pembatalan aplikasi atau booking terkonfirmasi masuk matriks); B§5 (pelepasan saat batal eksplisit terbuka); B§14 (booking terkonfirmasi dibatalkan) | Dinyatakan ulang untuk dua objek: (1) aplikasi belum selesai atau hold, (2) booking terkonfirmasi. Sampai state apa masing-masing boleh dibatalkan akun? Lihat matriks PA-05, PA-06 | ya |
| OD-21 | Pengembalian biaya admin saat batal | DITUNDA | B§5, B§6: tanpa refund otomatis; kebijakan refund terbuka; pembayaran ditunda | Tetap | tidak (ditunda) |
| OD-22 | Kuota harian 400 kembali saat batal | DIGANTIKAN | B§4: 400 bukan kuota harian. Kapasitas layanan = 100 tempat utama (hold sah + booking terkonfirmasi <= 100) + 50 daftar tunggu FIFO | Dinyatakan ulang: bila booking terkonfirmasi dibatalkan sebelum tanggal layanan, apakah tempat utamanya kembali tersedia, ditawarkan ke daftar tunggu (OD-82), atau tetap terpakai? B§4 melarang daur ulang tempat karena form selesai, keluar halaman, nomor terbit, atau pemeriksaan selesai, tetapi tidak mengatur pembatalan | ya |
| OD-23 | Nomor dipakai ulang, nomor lain bergeser | MENUNGGU KEPUTUSAN | B§6: nomor resmi baru ada setelah pembayaran terverifikasi; aplikasi belum bayar tidak punya nomor | Dipersempit: hanya untuk pembatalan booking yang sudah punya nomor resmi. Apakah nomor itu dipakai ulang, dan apakah nomor lain tetap? | tidak (tahap ini; penerbitan nomor tertahan pembayaran) |
| OD-24 | Informasi pasien setelah daftar ulang | TIDAK BERUBAH | Bagian "unit berikutnya" bergantung OD-08 (DITUNDA) | Tetap | ya |
| OD-25 | Walk-in memakai kuota 400 | DIGANTIKAN | B§4: 400 bukan kuota; tidak boleh mengarang penerimaan overflow | Dinyatakan ulang: apakah walk-in mengambil satu dari 100 tempat utama tanggal itu (langsung terkonfirmasi atau lewat hold)? Bila 100 tempat penuh: ditolak, masuk daftar tunggu, atau lainnya? Akun penanggung jawab dan aturan satu per hari: OD-90 | ya |
| OD-26 | Pemilihan layanan walk-in | TIDAK BERUBAH | Isi katalog DITUNDA (B§10), tetapi letak langkah pemilihan tetap pertanyaan | Tetap | ya |
| OD-27 | Walk-in membayar biaya admin | MENUNGGU KEPUTUSAN | B§6: nomor resmi hanya setelah pembayaran terverifikasi; pembayaran sepenuhnya online. Bertentangan dengan UC11 (post-condition menampilkan nomor antrian segera) dan pop-up Tambah pasien saat ini | Dinyatakan ulang: apakah aturan B§6 berlaku untuk walk-in? Bila ya, bagaimana walk-in membayar bila pembayaran sepenuhnya online? Bila tidak, pengecualian ini perlu keputusan eksplisit. Nominal dan metode tetap DITUNDA | ya |
| OD-28 | Template hasil per unit | TIDAK BERUBAH | B§10 melarang mengarang nilai rujukan, tetapi tidak menjawab siapa pemilik template | Tetap | ya |
| OD-29 | Arti konfirmasi tarif dokter unit | DITUNDA | B§6 (tanpa asumsi tagihan akhir), B§10 (tanpa tarif dan implementasi harga) | Tetap. Hak aksinya dicatat di matriks DU-06, DU-07 | tidak (ditunda) |
| OD-30 | Hasil dikirim sebelum lunas | DITUNDA | B§6 (pembayaran ditunda; tanpa asumsi tagihan akhir) | Tetap | tidak (ditunda) |
| OD-31 | Layanan berkuota khusus | TIDAK BERUBAH | B§4 tidak menyebut kuota layanan khusus; aturan UC27 "kuota MCU tidak lebih sedikit dari kuota layanan khusus" tetap | Tetap | ya |
| OD-32 | Editor mengubah kuota, turun di bawah 400 | DIGANTIKAN | B§4: 400 bukan batas registrasi; kapasitas utama dikonfigurasi (100) + 50 daftar tunggu | Dinyatakan ulang: apakah Editor boleh mengubah kapasitas utama dan daftar tunggu per tanggal? Boleh menaikkan di atas 100? Bila menurunkan, apakah batas bawahnya hold sah + booking terkonfirmasi (UC27: tidak di bawah jumlah terdaftar)? Lihat matriks ED-02 | ya |
| OD-33 | Siapa mengatur sesi, kapan registrasi dibuka/tutup | MENUNGGU KEPUTUSAN | B§3: RS membuka registrasi pada hari H untuk layanan H+1 | Dipersempit: hubungan tanggal sudah ditetapkan. Sisa: siapa membuka dan menutup registrasi (Editor di aplikasi, operator, atau terjadwal otomatis)? Jam: OD-74. Pengecualian: OD-76 | ya |
| OD-34 | Kewenangan Editor atas layanan, harga, isi paket | DITUNDA | B§10 (katalog dan harga ditunda); B§9G memasukkan hak Editor ke matriks | Tetap. Hak aksinya dicatat di matriks ED-03, ED-04 | tidak (ditunda) |
| OD-35 | Kolektif memakai kuota 400 | DIGANTIKAN | B§4 (400 bukan kuota); B§7 (satu registrasi per akun per hari) | Dinyatakan ulang: apakah peserta kolektif mengambil tempat dari 100 tempat utama tanggal itu, dan apa yang terjadi bila jumlah peserta melebihi sisa tempat (tolak seluruh batch, terima sebagian, daftar tunggu)? Akun penanggung jawab, aturan satu per hari, dan tanggal: OD-90 | ya |
| OD-36 | Format CSV kolektif | TIDAK BERUBAH | Tidak disentuh brief | Tetap | ya |
| OD-37 | Batch sebagian tidak valid | TIDAK BERUBAH | Tidak disentuh brief | Tetap | ya |
| OD-38 | Akses aplikasi peserta kolektif | MENUNGGU KEPUTUSAN | B§7: akun memerlukan verifikasi email; email membuktikan kendali email, bukan identitas pasien | Dipersempit: akun sementara dengan kredensial di CSV (UC15) tidak sejalan dengan verifikasi email. Sisa: apakah peserta kolektif mendapat akun (undangan aktivasi ke email masing-masing, akun institusi, atau tanpa akun)? | ya |
| OD-39 | Paket peserta kolektif | TIDAK BERUBAH | Isi katalog DITUNDA (B§10), tetapi struktur per batch atau per baris tetap pertanyaan | Tetap | ya |
| OD-40 | Siapa membayar kolektif | DITUNDA | B§6 | Tetap | tidak (ditunda) |
| OD-41 | Ada tidaknya peran Admin | MENUNGGU KEPUTUSAN | B§9: tujuh peran PRD; siapa membuat/menonaktifkan akun internal dan siapa memberi peran dan penugasan unit masih terbuka | Dipersempit: Admin bukan salah satu tujuh peran PRD. Sisa: fungsi pengelolaan akun internal dijalankan oleh peran kedelapan di aplikasi, operator di luar aplikasi, atau sistem RS (SSO)? Lihat matriks LP-02, LP-03 | ya |
| OD-42 | Kesegaran data antrian | TIDAK BERUBAH | Tidak disentuh brief (B§4 hanya melarang klaim 400 pengguna serentak sudah diuji) | Tetap | ya |
| OD-43 | Login internal; siapa membuat dan menonaktifkan akun internal | MENUNGGU KEPUTUSAN | B§9 bagian lintas peran | Tetap: akun ISLAH sendiri atau SSO RS. Siapa membuat dan menonaktifkan akun dinyatakan ulang di matriks LP-02 | ya |
| OD-44 | Kaitan pengajuan surat ke pasien dan kunjungan | MENUNGGU KEPUTUSAN | Dasar "3 orang per akun" DIGANTIKAN (B§7), tetapi satu akun tetap dapat mendaftarkan pasien berbeda pada hari berbeda; B§9A memasukkan pengajuan surat ke matriks | Dinyatakan ulang: permohonan surat dikaitkan ke registrasi (kunjungan) mana, dan siapa boleh mengajukan: akun pengaju, pasien, atau hanya akun yang punya akses hasil (matriks PA-08)? | ya |
| OD-45 | Arti "1 hari" untuk surat | TIDAK BERUBAH | Tidak disentuh brief | Tetap | ya |
| OD-46 | Jenis dan template surat | TIDAK BERUBAH | Tidak disentuh brief | Tetap | ya (konten) |
| OD-47 | Teks syarat dan ketentuan | TIDAK BERUBAH | Catatan: teks pengganti sekarang memuat aturan 3 orang per akun yang DIGANTIKAN B§7 | Tetap | tidak (konten) |
| OD-48 | Apa yang diestimasi untuk pasien | DITUNDA | B§11-13: estimasi bergantung model smart queue; rumus kandidat hanya penjelasan, belum disetujui. B§11 memisahkan travel time, waiting time, exam duration | Tetap | tidak (ditunda) |
| OD-49 | Denah statis vs rute | DITUNDA | B§11-13 (rute ke unit berikutnya bergantung OD-08) | Sisa untuk tahap ini: apakah rilis awal cukup denah statis? | tidak (ditunda) |
| OD-50 | Gambar denah resmi | TIDAK BERUBAH | Tidak disentuh brief | Tetap | tidak (konten) |
| OD-51 | Daftar unit/ruangan dan afiliasi dokter | TIDAK BERUBAH | B§11 mencatat RS berencana memberi jumlah dan nama unit untuk smart queue, belum ada datanya | Tetap | ya |
| OD-52 | Satu unit melayani lebih dari satu pasien | MENUNGGU KEPUTUSAN | B§11: masukan RS yang direncanakan menyebut "kapasitas satu pasien sekaligus per unit" untuk desain smart queue (arah desain, belum kebijakan antrian unit) | Dipersempit. USULAN: perlakukan kapasitas satu per unit juga untuk antrian unit manual setelah pemilik mengonfirmasi tidak ada unit dengan ruangan paralel. Sisa: konfirmasi itu, dan apakah antrian dicatat per unit atau per ruangan | ya |
| OD-53 | Memanggil di luar urutan, alasan wajib | MENUNGGU KEPUTUSAN | B§9 lintas peran (siapa boleh override antrian; aksi mana wajib alasan); B§11 (pencatatan override) | Dinyatakan ulang di matriks LP-06. Tambahan: selama smart queue ditunda, apakah petugas unit memilih pasien berikutnya secara manual dari daftar antrian unit? | ya |
| OD-54 | Definisi waktu tunggu dan TAT | MENUNGGU KEPUTUSAN | B§11 memisahkan travel time, lead time, waiting time, exam duration; masuk dan keluar yang dikonfirmasi petugas adalah peristiwa otoritatif | Dipersempit: kosakata tersedia. Sisa: kapan waiting time di suatu unit mulai (keluar dari unit sebelumnya, tiba di unit, atau ditugaskan ke unit), dan definisi TAT keseluruhan MCU | ya |
| OD-55 | Ketidaksesuaian data yang dideteksi | TIDAK BERUBAH | Tidak disentuh brief | Tetap | ya |
| OD-56 | Mengembalikan hasil, revisi hasil terverifikasi | MENUNGGU KEPUTUSAN | B§9C, B§9D, B§9E, B§9 lintas peran (koreksi draft dan hasil terkirim, kembalikan untuk koreksi, minta amandemen, cabut atau gantikan hasil terbit, siapa mengamandemen hasil terverifikasi) | Dinyatakan ulang di matriks PU-05, PU-06, DU-05, DM-03, DM-07, LP-07 | ya |
| OD-57 | Isi kode bar verifikasi | TIDAK BERUBAH | Tidak disentuh brief | Tetap | ya |
| OD-58 | Cara mengenali pasien saat daftar ulang | MENUNGGU KEPUTUSAN | B§6: validasi identitas dan registrasi di lokasi tetap wajib sebelum aktivasi antrian klinis; empat pengenal dibedakan | Dipersempit: validasi di lokasi tetap ada. Sisa: pengenal apa yang dibawa pasien (nomor antrian resmi, referensi aplikasi, kode pindai) dan perangkat apa yang dipakai? | ya |
| OD-59 | Data yang boleh diubah petugas saat daftar ulang | MENUNGGU KEPUTUSAN | B§9B (koreksi demografi masuk matriks) | Dinyatakan ulang di matriks PM-03: field mana (termasuk NIK dan nama) dan apakah wajib alasan. Perubahan paket/layanan ikut DITUNDA bersama katalog | ya |
| OD-60 | Pasien tidak hadir atau terlambat | MENUNGGU KEPUTUSAN | B§4: booking terkonfirmasi tetap memakai kapasitas tanggal layanannya; dasar "kuota akun" (OD-10) DIGANTIKAN; B§3 melarang pemindahan otomatis ke hari kerja berikutnya | Dinyatakan ulang: status apa untuk booking yang tidak daftar ulang pada tanggalnya? Boleh dilayani di tanggal lain (dengan registrasi baru)? Apakah jatah harian akun terpengaruh (OD-85)? | ya |
| OD-61 | Akun untuk pasien walk-in | MENUNGGU KEPUTUSAN | B§7: setiap registrasi punya akun penanggung jawab | Dinyatakan ulang: akun mana yang tercatat sebagai penanggung jawab registrasi walk-in (akun petugas, akun pasien yang ada, atau akun baru), dan bagaimana walk-in mendapat akses antrian dan hasil? Lihat OD-90 | ya |
| OD-62 | Isi Riwayat | MENUNGGU KEPUTUSAN | B§3: tanggal layanan wajib tampil di riwayat terkait; B§9A: akses riwayat setelah kepemilikan atau delegasi berubah | Dipersempit: Riwayat menampilkan tanggal layanan. Sisa: apakah aplikasi yang dibatalkan, belum dibayar, atau hold kedaluwarsa ikut tampil? Akses setelah delegasi berubah: matriks PA-09 | ya |
| OD-63 | Syarat mengirim aduan/ulasan | TIDAK BERUBAH | Tidak disentuh brief | Tetap | ya |
| OD-64 | Kaitan aduan ke kunjungan/unit | TIDAK BERUBAH | Tidak disentuh brief | Tetap | ya |
| OD-65 | Identitas pengirim aduan bagi Manajemen | MENUNGGU KEPUTUSAN | B§9F (identitas level pasien, aduan dan konten sensitif) | Dinyatakan ulang di matriks MJ-02, MJ-04 | ya |
| OD-66 | Menyimpan data orang lain sebagai anggota | MENUNGGU KEPUTUSAN | B§7: form pasien mulai kosong; tanpa prefill dari akun; perbedaan diri sendiri vs orang lain tidak diperlukan | Dinyatakan ulang: apakah fitur "Simpan sebagai anggota" dipertahankan? Mengisi form dari anggota tersimpan dapat dianggap prefill dari akun, yang bertentangan dengan "form mulai kosong". Bila dipertahankan: persetujuan orang itu dan masa simpan | ya |
| OD-67 | Arti peta antrian dan bottleneck | TIDAK BERUBAH | B§13 mendaftar metrik simulasi smart queue (rata-rata dan p95 tunggu, dll.), bukan definisi UC24 | Tetap | ya |
| OD-68 | Panel token review dan halaman uji sesi | TIDAK BERUBAH | Catatan: tanda terima sesi tidak boleh disebut booking berbayar atau nomor antrian resmi (B konteks, B§6) | Tetap | tidak (UI) |
| OD-69 | Format nomor antrian | TIDAK BERUBAH | Tidak disentuh brief; kini berlaku untuk nomor resmi setelah pembayaran (B§6) | Tetap | tidak (tahap ini; bergantung pembayaran) |
| OD-70 | Daftar pilihan hubungan | MENUNGGU KEPUTUSAN | B§7: perbedaan diri sendiri vs orang lain tidak diperlukan; dasar keputusan 17 Oktober "orang lain + hubungan" tergantikan | Dinyatakan ulang: apakah field "Hubungan dengan pemilik akun" tetap dikumpulkan untuk setiap pasien? Bila ya, daftar nilainya (termasuk nilai untuk pasien = pemilik akun) | tidak (UI), kecuali OD-14 kelak bergantung pada hubungan |
| OD-71 | Ejaan "WhatsApp" | TIDAK BERUBAH | Tidak disentuh brief | Tetap | tidak |
| OD-72 | Penyimpangan kecil wireframe | TIDAK BERUBAH | Tidak disentuh brief | Tetap | tidak |
| OD-73 | Nomor kontak dan FAQ | TIDAK BERUBAH | Tidak disentuh brief | Tetap | tidak |

## 7. Reklasifikasi bagian 3 "sudah ditetapkan" (S-01 s.d. S-24)

Nomor S mengikuti urutan baris pada bagian 3 `OPEN_DECISIONS.md`.

| S | Hal (singkat) | Keputusan lama | Status baru | Dasar | Sisa terbuka |
| --- | --- | --- | --- | --- | --- |
| S-01 | Angka 400 di kalender Editor dan kolektif | Maks. 400 peserta/hari, 100 aktif + 50 tunggu per sesi, FIFO (R-06) | DIGANTIKAN | B§4: 400 hanya referensi kapasitas desain teknis, bukan jatah registrasi harian; dilarang sebagai batas booking harian atau rate limit harian. Kapasitas layanan = 100 tempat utama + 50 daftar tunggu FIFO, dibaca per tanggal layanan (B§4 "service-date capacity"). FIFO untuk daftar tunggu tetap | OD-81 (arti teknis 400), OD-03 (batas akses sesi A), OD-32 (perubahan kapasitas oleh Editor) |
| S-02 | Kotak antrian "maks. 3", pilihan "Diri sendiri" | Maks. 3 orang aktif per akun, satu antrian aktif per NIK (versi B) | DIGANTIKAN | B§7: satu registrasi per akun per hari; perbedaan diri sendiri vs orang lain dihapus. Bagian NIK tidak dihapus diam-diam: menjadi MENUNGGU KEPUTUSAN (B§8) | OD-16, OD-83 s.d. OD-86 |
| S-03 | Backend menolak entri kedua per akun (`ACTIVE_IN_OTHER_SESSION`) | Perubahan ke 3 orang per akun + 1 per NIK sudah diputuskan; tinggal pekerjaan backend | DIGANTIKAN | B§7: aturan 3 per akun tidak dipertahankan; "satu tiket hidup per principal" (migrasi 002) tidak setara dengan "satu registrasi berhasil per akun per hari", perlu migrasi yang dijelaskan, bukan sekadar mengganti nama aturan | OD-03, OD-83 s.d. OD-86 |
| S-04 | Tombol "Batalkan pendaftaran" | UC01.1: pemilik akun membatalkan, nomor dilepas, kuota akun kembali, Riwayat mencatat "Dibatalkan" | DIGANTIKAN (sebagian) | Tetap: UC01.1 ada dan Riwayat mencatat "Dibatalkan". Gugur: "kuota akun kembali" (aturan 3 per akun dihapus, B§7; pemulihan jatah terbuka) dan "nomor dilepas" untuk aplikasi belum bayar (belum punya nomor resmi, B§6) | OD-20, OD-22, OD-23, OD-85 |
| S-05 | Beranda tanpa halaman Nomor Antrian | Beranda hub; kotak antrian menggantikan `/patient/tracking` | TIDAK BERUBAH | Tata letak tidak disentuh. Catatan: label "nomor antrian" pada aplikasi belum bayar bertentangan dengan B§6 | OD-24 |
| S-06 | Langkah 1 "Daftar untuk siapa?" | Diri sendiri terisi dari profil; orang lain + hubungan + simpan sebagai anggota | DIGANTIKAN | B§7: form pasien mulai kosong; tanpa prefill dari akun; tanpa perbedaan diri sendiri vs orang lain; pasien tidak wajib cocok dengan profil akun | OD-66, OD-70 |
| S-07 | Riwayat, Surat, Aduan, Denah sebagai pop-up | Disetujui 17 Oktober | TIDAK BERUBAH | Tidak disentuh brief | Tidak ada |
| S-08 | Tambah pasien sebagai pop-up Daftar ulang | Disetujui | TIDAK BERUBAH | Tata letak tidak disentuh | OD-25, OD-26, OD-27, OD-61, OD-90 |
| S-09 | Arah visual dan menu slot internal | Disetujui | TIDAK BERUBAH | Tidak disentuh brief | Tidak ada |
| S-10 | Registrasi bertahap per halaman | Wireframe v2 | TIDAK BERUBAH | Catatan: B§3 meniadakan langkah pemilihan tanggal; tanggal layanan cukup ditampilkan di ringkasan | Tidak ada |
| S-11 | Fitur Kami 2x2 di 320px, tabel menggulir, `--row-box` | Keputusan fase 4 | TIDAK BERUBAH | Tidak disentuh brief | Tidak ada |
| S-12 | Ejaan "antrian", "Laboratorium", "Aduan dan ulasan" | Mengikuti PRD dan wireframe | TIDAK BERUBAH | Tidak disentuh brief | OD-71 |
| S-13 | Field "Pekerjaan" | Bagian frame Registrasi | TIDAK BERUBAH | Tidak disentuh brief | Tidak ada |
| S-14 | Input tidak diubah ke huruf kapital | PRD mensyaratkan huruf kapital (celah implementasi) | TIDAK BERUBAH | Sejalan dengan normalisasi huruf pada pemeriksaan duplikat nama (B§8) | Tidak ada |
| S-15 | Tanda terima sesi registrasi | Posisi tunggu sesi dan tanda terima bukan nomor antrian MCU | DIPUTUSKAN | Dikuatkan B§6: tiket sesi registrasi berbeda dari nomor antrian MCU resmi | Tidak ada |
| S-16 | Nomor antrian di kotak antrian | Nomor diberikan berdasarkan urutan registrasi (PRD UC03) | DIGANTIKAN | B§6: nomor resmi terbit setelah pembayaran terverifikasi, bukan saat registrasi | OD-89 (dasar urutan nomor), OD-69 |
| S-17 | Tombol "Hitung estimasi waktu tunggu" | Dihitung saat ditekan; pesan galat PRD | TIDAK BERUBAH | Teks PRD tetap; perhitungannya DITUNDA (B§11-13) | OD-08, OD-48 |
| S-18 | Form Surat dapat dikirim kapan saja | Surat hanya setelah MCU selesai | TIDAK BERUBAH | Tidak disentuh brief | OD-44, OD-45 |
| S-19 | Kalender Editor: tolak tanggal < 2 hari dan kuota di bawah terdaftar | Pre-condition UC27 | TIDAK BERUBAH | Aturan UC27 tetap. Catatan: batas atas 400 di layar kalender DIGANTIKAN B§4; "jumlah terdaftar" sebaiknya dibaca hold sah + booking terkonfirmasi (USULAN) | OD-31, OD-32, OD-75 |
| S-20 | Informasi layanan dikunci bila ada pendaftar | Pre-condition UC28 | TIDAK BERUBAH | Aturan PRD tetap; implementasi katalog DITUNDA (B§10) | OD-34 |
| S-21 | Peringatan "Data tidak sesuai" dan "Pasien tidak membayar anda" | Teks ditetapkan PRD | TIDAK BERUBAH | Tidak disentuh brief | OD-55 |
| S-22 | Status kehadiran dokter unit | Satu dokter bertugas per tempat; verifikasi hanya saat bertugas | TIDAK BERUBAH | Dipakai sebagai baris DITETAPKAN di matriks DU-01, DU-04, DU-08 | OD-51, OD-93 |
| S-23 | Tanpa pembaruan otomatis; tombol "Muat ulang" | Iterasi review: tanpa polling dan timer | TIDAK BERUBAH | Sejalan dengan B§5 (hitung mundur browser hanya tampilan) | OD-42 |
| S-24 | Layar Antrian unit Dokter Unit dan Tambah pasien | Bagian layar Q14 sudah terjawab | TIDAK BERUBAH | Bagian kuota Q14 (OD-25) DIGANTIKAN B§4 | OD-25 |

## 8. Butir terbuka baru dari brief 18 Oktober 2026 (OD-74 s.d. OD-96)

Butir yang diminta tetapi sudah tercakup baris lama, agar tidak ganda: masa hidup hold = OD-19 (dinyatakan ulang); siapa membuka/menutup registrasi = OD-33; ketersediaan dan validasi NIK = OD-17; aturan keras per NIK = OD-16; metode login, penyedia email, token, pemulihan = OD-06; pembatalan booking terkonfirmasi dan nasib tempatnya = OD-20, OD-22.

| ID | Topik | Dasar | Pertanyaan | Catatan / USULAN | Blokir backend | Terkait |
| --- | --- | --- | --- | --- | --- | --- |
| OD-74 | Jam buka dan tutup registrasi H | B§3 | Pukul berapa (Asia/Jakarta) registrasi untuk layanan H+1 dibuka dan ditutup pada hari H, dan apakah sama setiap hari? | Tanpa usulan nilai | ya | OD-33 |
| OD-75 | H+1 hari libur atau layanan tutup | B§3, B§14 | Bila H+1 libur atau layanan tutup, apakah registrasi pada hari H tidak dibuka? Apa yang ditampilkan ke pemohon? | B§3 melarang memindah otomatis ke hari kerja berikutnya. USULAN: registrasi tidak dibuka dan pemohon melihat pemberitahuan, menunggu konfirmasi | ya | OD-33, UC27 |
| OD-76 | Registrasi pengecualian oleh operator | B§3 | Apakah operator boleh membuka registrasi di luar jadwal biasa (jam lain atau tanggal layanan lain)? Siapa, dengan alasan apa, dan apakah diaudit? | Tanpa usulan | ya | OD-41, LP-08 |
| OD-77 | Pembayaran terverifikasi setelah jendela registrasi tutup | B§3, B§14 | Bila hold masih sah saat jendela tutup dan pembayaran terverifikasi setelahnya, apakah booking dikonfirmasi? | Pembayaran ditunda; yang dibutuhkan sekarang hanya kontrak transisi | ya (desain transisi) | OD-19 |
| OD-78 | Hold atau aplikasi melewati tengah malam | B§3, B§7 | Apakah hold pembayaran atau aplikasi belum selesai boleh melewati pergantian tanggal (Asia/Jakarta)? Bila tidak, apa yang terjadi saat tengah malam? | Sudah ditetapkan B§3: tanggal layanan yang sudah melekat tidak dihitung ulang diam-diam | ya | OD-19, OD-86 |
| OD-79 | Pembayaran berhasil setelah hold tidak berlaku | B§5, B§14 | Bila penyedia melaporkan sukses setelah hold dilepas, apa perlakuannya (rekonsiliasi manual, konfirmasi bila masih ada tempat, pengembalian dana)? | B§5 melarang refund otomatis dan kebijakan pembayaran terlambat rekaan. SD §7 (rekomendasi desain): masuk rekonsiliasi, tidak oversell | tidak (tahap ini; pembayaran ditunda) | OD-21 |
| OD-80 | Transisi hold lain | B§5, B§14 | Apakah gagal bayar melepas hold? Boleh mencoba ulang pembayaran dalam hold yang sama? Bagaimana pemulihan setelah gangguan penyedia atau backend? Bagaimana menangani percobaan ulang setelah timeout padahal transaksi pertama sudah commit? | USULAN pemilik di B§7 (belum disetujui): percobaan ulang = aplikasi yang sama | ya (idempotensi pembuatan aplikasi); bagian pembayaran ditunda | OD-19 |
| OD-81 | Arti teknis angka 400 | B§4 | 400 adalah referensi kapasitas desain teknis. Dimensinya apa: request per periode (berapa periodenya), pengguna serentak, koneksi, atau lainnya? | Dilarang: batas booking 400/hari, rate limit keras 400 request HTTP/hari, klaim 400 pengguna serentak sudah diuji | tidak (fungsi); ya untuk sizing dan uji beban | Q10, OD-42 |
| OD-82 | Penerimaan peserta daftar tunggu | B§4, B§14 | Saat tempat utama dilepas, bagaimana peserta daftar tunggu FIFO diterima: otomatis dibuatkan hold, diberi tahu dan harus menerima dalam batas waktu, atau lainnya? Apa yang terjadi pada peserta daftar tunggu yang tidak pernah diterima saat jendela tutup atau tanggal lewat? Apakah posisi daftar tunggu memakai jatah harian akun? | B§4 ditetapkan: daftar tunggu tidak memakai tempat utama sampai diterima ke reservasi; 100 + 50 bukan 150 tempat; tanpa penerimaan overflow | ya | OD-22, OD-84, OD-91 |
| OD-83 | "Satu per hari" diukur pada hari apa | B§7 | Apakah satu registrasi per akun per hari dihitung per hari pengajuan (H) atau per tanggal layanan (H+1)? | Pada alur H+1 biasa keduanya bergeser satu hari secara konsisten; berbeda bila ada registrasi pengecualian (OD-76) atau melewati tengah malam (OD-78). Backend sekarang menolak submission kedua per principal per `service_date` (`ALREADY_REGISTERED`), tetapi principal belum akun terverifikasi dan submission bukan booking terkonfirmasi | ya | OD-10 |
| OD-84 | Tahap konsumsi jatah harian akun | B§7 | Pada tahap apa jatah satu registrasi per hari terpakai: aplikasi dibuat, hold dibuat, atau pembayaran terverifikasi? | USULAN pemilik di B§7 (belum disetujui): konfirmasi pembayaran yang berhasil memakai jatah | ya | OD-10, OD-86 |
| OD-85 | Pemulihan jatah harian | B§7 | Apakah gagal bayar, hold kedaluwarsa, pembatalan sebelum bayar, dan pembatalan setelah pembayaran terkonfirmasi mengembalikan jatah akun untuk hari itu? | B§7: pembatalan dan kedaluwarsa diputuskan terpisah | ya | OD-20, OD-60 |
| OD-86 | Lebih dari satu aplikasi belum selesai per akun | B§7, B§14 | Apakah satu akun boleh punya lebih dari satu aplikasi belum selesai sekaligus? Apa yang terjadi bila akun memulai aplikasi baru saat aplikasi lain belum selesai? | USULAN pemilik di B§7 (belum disetujui): cegah lebih dari satu aplikasi belum selesai per akun | ya | OD-03, OD-84 |
| OD-87 | Tindak lanjut peringatan duplikat nama | B§8 | Setelah peringatan muncul: pemohon boleh langsung lanjut, wajib centang pernyataan, atau perlu ditinjau petugas? | B§8 ditetapkan: kecocokan nama hanya kemungkinan duplikat; tanpa penggabungan atau pemindahan kepemilikan otomatis; tanpa membuka data akun lain; pesan minimal. Penegakan duplikat tidak dibangun pada tahap ini (B§15) | ya (saat fitur dibangun) | OD-16, PM-05 |
| OD-88 | Cakupan pencarian duplikat nama | B§8 | Registrasi mana yang dibandingkan: tanggal layanan yang sama, aplikasi belum selesai, booking terkonfirmasi, riwayat? Apakah normalisasi lain (tanda baca, gelar) dipakai? | B§8 ditetapkan: normalisasi huruf besar/kecil dan spasi berulang | ya (saat fitur dibangun) | OD-16, OD-17 |
| OD-89 | Dasar urutan nomor antrian resmi | B§6; PRD UC03 | PRD UC03 menyebut nomor "berdasar urutan registrasi", sedangkan B§6 menerbitkan nomor setelah pembayaran terverifikasi. Urutan nomor mengikuti waktu aplikasi, waktu verifikasi pembayaran, atau lainnya? | Tanpa usulan | tidak (tahap ini; bergantung pembayaran) | OD-01, OD-69 |
| OD-90 | Registrasi oleh petugas: walk-in dan kolektif | B§3, B§7; PRD UC11, UC15 | Bila Petugas MCU menambah walk-in atau Dokter MCU mengimpor kolektif: akun mana yang tercatat sebagai penanggung jawab? Apakah aturan satu registrasi per akun per hari berlaku (akan memblokir impor banyak peserta oleh satu akun)? Apakah aturan H+1 berlaku (walk-in datang di hari layanan itu sendiri; UC15 memasukkan tanggal)? | Konflik antara B§3/B§7 dan UC11/UC15 ditandai, tidak diselesaikan | ya | OD-25, OD-35, OD-38, OD-61 |
| OD-91 | Perilaku dan pesan saat tempat utama penuh | B§3, B§4; PRD UC01 | Pesan UC01 "Kuota harian penuh, harap mengubah jadwal!" mengandaikan pasien dapat mengubah tanggal, padahal B§3 meniadakan pilihan tanggal. Saat 100 tempat utama penuh, apakah pemohon otomatis ditawari daftar tunggu? Bila daftar tunggu juga penuh, pesan apa yang ditampilkan? | Tanpa usulan teks | ya (alur daftar tunggu); teks = UI | OD-82 |
| OD-92 | Beberapa peran dalam satu akun | B§9 lintas peran | Apakah satu akun internal boleh memegang beberapa peran (mis. Petugas Unit dan Dokter Unit)? Bila ya, apakah orang yang sama boleh memasukkan dan memverifikasi hasil yang sama? | `UI_GUIDE.md` §4 mengandaikan akun berperan ganda memilih ruang kerja (rekomendasi desain) | ya | LP-04 |
| OD-93 | Izin unit: tetap atau mengikuti jadwal tugas | B§9C, B§9D, B§9 lintas peran | Apakah izin Petugas Unit dan Dokter Unit atas suatu unit melekat permanen pada penugasan, atau hanya selama jadwal/kehadiran bertugas? Boleh lebih dari satu unit? | PRD sudah menetapkan "dokter dalam keadaan bertugas" untuk lihat hasil, verifikasi, dan tarif (UC22, UC22.1, UC22.2) | ya | OD-51, PU-08, DU-08, LP-05 |
| OD-94 | Pembaca log audit | B§9 lintas peran | Siapa boleh membaca log audit (siapa membaca, mengubah, mengekspor data sensitif), dan apakah pembacaan log juga diaudit? | SD §8 dan DBD §5 menyebut kredensial audit-reader terpisah (rekomendasi desain) | ya (sebelum produksi) | LP-09 |
| OD-95 | Cakupan ekspor data | B§9F, B§9 lintas peran | Peran mana boleh mengekspor, data apa (agregat, level pasien, klinis, keuangan), format apa, dan apakah perlu persetujuan? | Tanpa usulan selain di matriks | tidak (tahap ini) | MJ-05, LP-10 |
| OD-96 | Aksi yang wajib alasan | B§9 lintas peran | Aksi mana yang wajib disertai alasan tercatat? | Daftar USULAN di matriks LP-08 | ya | OD-53, OD-56 |

## 9. Ringkasan status 18 Oktober 2026

| Status | OD-01 s.d. OD-73 | S-01 s.d. S-24 |
| --- | --- | --- |
| DIPUTUSKAN | 2 (OD-01, OD-02) | 1 (S-15) |
| DIGANTIKAN | 5 (OD-10, OD-22, OD-25, OD-32, OD-35) | 6 (S-01, S-02, S-03, S-04 sebagian, S-06, S-16) |
| DITUNDA | 11 (OD-04, OD-05, OD-08, OD-09, OD-21, OD-29, OD-30, OD-34, OD-40, OD-48, OD-49) | 0 |
| MENUNGGU KEPUTUSAN | 29 | 0 |
| TIDAK BERUBAH | 26 | 17 |
| **Total** | **73** | **24** |

MENUNGGU KEPUTUSAN: OD-03, 06, 07, 11, 14, 16, 17, 18, 19, 20, 23, 27, 33, 38, 41, 43, 44, 52, 53, 54, 56, 58, 59, 60, 61, 62, 65, 66, 70.
TIDAK BERUBAH: OD-12, 13, 15, 24, 26, 28, 31, 36, 37, 39, 42, 45, 46, 47, 50, 51, 55, 57, 63, 64, 67, 68, 69, 71, 72, 73.

Butir baru: 23 (OD-74 s.d. OD-96), semuanya MENUNGGU KEPUTUSAN.

## 10. Keputusan pemilik 18 Oktober 2026 (tahap 2) dan status implementasi

Sumber: brief implementasi pemilik 18 Oktober 2026 (disingkat **K**, bagian K-A s.d. K-N). Brief ini menjawab P-01 s.d. P-12 di [RECONCILIATION_2026-10-18.md](RECONCILIATION_2026-10-18.md) §9 dan berotoritas di atas bagian 6 s.d. 9. Bagian 1 s.d. 9 dibiarkan sebagai riwayat; status yang berlaku untuk butir di bawah adalah status di tabel ini.

Arti kolom **Implementasi**: DIBANGUN = ada di kode dan diuji (lihat `backend/TEST_RESULTS.md`); DITUNDA = sengaja tidak dibangun pada iterasi ini; BELUM TERSELESAIKAN = keputusan belum ada, kode tidak menebak.

### 10.1 Jawaban atas P-01 s.d. P-12

| P | Jawaban pemilik (K) | Implementasi |
| --- | --- | --- |
| P-01 gerbang akses | Tidak ada gerbang admisi kedua. Sesi registrasi (100 aktif + 50 tunggu per sesi) dihapus (K-A) | DIBANGUN: route `/sessions*` dan `/entries*` dihapus; data lama tetap di database |
| P-02 kapan tempat ditahan | Saat konfirmasi akhir dari Rincian (K-C) | DIBANGUN: `POST /api/v1/applications` |
| P-03 pelepasan hold dan penerimaan daftar tunggu | Hanya pembatalan oleh akun sebelum bayar yang melepas hold. Tanpa batas waktu, tanpa aturan 2 menit. Pendaftar tunggu FIFO paling awal otomatis dipromosikan ke "Menunggu pembayaran" (bukan terkonfirmasi, tanpa nomor antrian) dalam transaksi yang sama. Pendatang baru tidak menyalip pendaftar tunggu (K-D) | DIBANGUN. Gagal bayar, bayar terlambat, refund, batal setelah bayar: BELUM TERSELESAIKAN |
| P-04 satu per akun | Satu pendaftaran per akun per **tanggal layanan**; satu aplikasi belum selesai per akun; pembayaran terverifikasi memakai jatah; batal sebelum bayar boleh mencoba lagi; percobaan ulang merujuk aplikasi yang sama (K-E). Aturan 3 per akun tidak berlaku | DIBANGUN (idempotency key + indeks unik parsial) |
| P-05 field pasien | Field persis form yang disetujui: nama, NIK, tanggal lahir, alamat KTP, alamat domisili, telepon, jenis kelamin, pekerjaan. Form mulai kosong. Data sintetis saja (K-F) | DIBANGUN. NIK disimpan sebagai HMAC-SHA256 (`ISLAH_NIK_KEY`) + 4 digit terakhir; tidak ada NIK utuh di tabel, log, atau respons |
| P-06 duplikat | Tolak NIK yang sudah punya pendaftaran waiting/awaiting/confirmed pada tanggal layanan yang sama, di seluruh akun. Bukan pencocokan nama. Pesan generik "NIK tersebut sudah memiliki pendaftaran untuk tanggal layanan ini." Kebijakan RS sementara (K-G) | DIBANGUN, aman dari balapan (indeks unik parsial) |
| P-07 principal buatan operator | Boleh sementara sebagai pengganti akun; pemeriksaan kepemilikan tetap; account id tidak diterima dari klien; tidak membangun sistem autentikasi baru (K-H) | DIBANGUN (token `flask create-client`) |
| P-08 anggota tersimpan dan hubungan | Dihapus bersama pilihan diri sendiri/orang lain dan prefill (K-F) | DIBANGUN di frontend |
| P-09 status tanpa pembayaran | Aplikasi dicatat "Menunggu pembayaran" dengan kode pendaftaran; kode bukan nomor antrian (K-C, K-I) | DIBANGUN. Apakah kode yang sama dipakai petugas saat daftar ulang: BELUM TERSELESAIKAN |
| P-10 walk-in dan kolektif | Ditunda (K-K) | DITUNDA |
| P-11 jendela registrasi | Hanya H+1 Asia/Jakarta, ditetapkan server, tanpa pemilih tanggal; tanggal tidak dihitung ulang setelah tengah malam; operator membuka registrasi secara eksplisit; bila H+1 libur registrasi tidak dibuka dan tidak digeser. Jam buka/tutup tidak ditentukan (K-B) | DIBANGUN (CLI `open-registration`, `close-registration`, `mark-no-service`). Tidak ada jam buka/tutup di kode |
| P-12 angka 400 | 400 dihapus dari aturan bisnis dan kriteria penerimaan. Tidak menjanjikan 400 pengguna serentak; tidak diganti 150. Hasil uji lama disimpan sebagai riwayat (K-A) | DIBANGUN (dokumen dan kode). Uji baru melaporkan latensi beserta lingkungannya, tanpa klaim konkurensi |

### 10.2 Perubahan status butir OD

| ID | Status baru | Dasar | Catatan |
| --- | --- | --- | --- |
| OD-03 | DIGANTIKAN | K-A | Tidak ada sesi registrasi FIFO di alur |
| OD-06 | DITUNDA (login produksi) | K-H, K-K | Principal operator sebagai akun sementara |
| OD-11 | MENUNGGU KEPUTUSAN (sebagian) | K-I | Kode pendaftaran ≠ nomor antrian sudah ditetapkan; pengenal untuk daftar ulang belum |
| OD-16 | DIPUTUSKAN | K-G | Tolak per NIK per tanggal layanan |
| OD-17 | MENUNGGU KEPUTUSAN | – | Hanya validasi bentuk NIK; tidak ada pencocokan ke sistem acuan |
| OD-19 | DIPUTUSKAN (sebelum pembayaran) | K-C, K-D | Tanpa batas waktu hold. Bagian pembayaran DITUNDA |
| OD-20 | DIPUTUSKAN sebagian | K-D | Batal sebelum bayar boleh; batal setelah bayar BELUM TERSELESAIKAN (API mengembalikan `CANCEL_NOT_SUPPORTED`) |
| OD-33 | DIPUTUSKAN sebagian | K-B | Operator membuka/menutup lewat CLI. Peran operator di produksi dan jam: belum |
| OD-66, OD-70 | DIPUTUSKAN (dihapus) | K-F | |
| OD-74 | BELUM TERSELESAIKAN | K-B | Jam tidak ditentukan; kode tidak memakai jam |
| OD-75 | DIPUTUSKAN | K-B | Tidak dibuka, tidak digeser |
| OD-76 | MENUNGGU KEPUTUSAN | – | Registrasi pengecualian tidak didukung |
| OD-78 | DIPUTUSKAN sebagian | K-B | Tanggal yang melekat tidak dihitung ulang. Nasib aplikasi setelah tanggal layanan lewat: BELUM TERSELESAIKAN (dibiarkan apa adanya) |
| OD-80 | DIPUTUSKAN sebagian | K-E | Percobaan ulang = aplikasi yang sama. Bagian pembayaran DITUNDA |
| OD-81 | DITUTUP | K-A | 400 bukan aturan bisnis |
| OD-82 | DIPUTUSKAN sebagian | K-D | Promosi otomatis FIFO ke "Menunggu pembayaran". Nasib pendaftar tunggu yang tidak pernah dipromosikan: BELUM TERSELESAIKAN |
| OD-83, OD-84, OD-86 | DIPUTUSKAN | K-E | |
| OD-85 | DIPUTUSKAN sebagian | K-E | Batal sebelum bayar memulihkan; gagal bayar dan batal setelah bayar belum |
| OD-87, OD-88 | DIGANTIKAN | K-G | Tidak ada pemeriksaan duplikat nama |
| OD-90 | DITUNDA | K-K | Walk-in dan kolektif |
| OD-91 | DIPUTUSKAN | K-C | Penuh → otomatis daftar tunggu; keduanya penuh → ditolak dengan pesan jelas |
| OD-09 | DITUNDA (dikeluarkan dari pembahasan) | K-K | UI paket tetap ada; paket/layanan tidak dikirim ke backend |

Butir lain di bagian 6 s.d. 8 tidak berubah statusnya.

### 10.3 Ditunda dan belum terselesaikan (ringkas)

- **Ditunda (sengaja tidak dibangun):** gateway pembayaran, biaya, tombol atau endpoint "tandai lunas", refund; login produksi dan verifikasi email; otorisasi rinci per peran (endpoint kapasitas dapat dibaca token mana pun); smart scheduling; walk-in; kolektif; katalog dan harga resmi; penyimpanan paket, layanan, dan persetujuan syarat.
- **Belum terselesaikan (kode tidak menebak):** kegagalan dan keterlambatan bayar; refund; pembatalan setelah bayar; jam buka/tutup; nasib aplikasi dan pendaftar tunggu setelah tanggal layanan lewat; perilaku setelah `close-registration` (aplikasi yang ada tetap, promosi tetap berjalan); pengenal untuk daftar ulang; nomor antrian resmi (OD-89).
- **Label UI:** semua label simulasi/demo/mockup/prototype/use case/UC dan label review teknis dihapus dari kode sumber frontend, termasuk saklar `NEXT_PUBLIC_DEMO_LABELS` (K-J).
