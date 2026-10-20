# Rekonsiliasi Keputusan Pemilik 18 Oktober 2026 dengan Repository

| Metadata | Nilai |
| --- | --- |
| Tanggal / status | 18 Oktober 2026 / dokumen rekonsiliasi dan desain. **Tidak ada perubahan perilaku aplikasi pada tahap ini.** Tahap 2 (18 Oktober 2026): P-01 s.d. P-12 sudah dijawab pemilik dan model §5 dibangun (tanpa pembayaran); lihat [OPEN_DECISIONS.md](OPEN_DECISIONS.md) bagian 10 |
| Urutan otoritas | 1) keputusan eksplisit pemilik terbaru (brief 18 Oktober 2026, disingkat **B**, mis. B§4), 2) keputusan pemilik lain yang sejalan, 3) PRD, 4) rekomendasi desain, 5) implementasi dan mockup yang ada |
| Prinsip | Kode yang ada adalah bukti implementasi, bukan bukti kebijakan disetujui. Usulan diberi label **USULAN** dan tidak berlaku sampai pemilik menyetujui |
| Dokumen pasangan | [OPEN_DECISIONS.md](OPEN_DECISIONS.md) (status baru setiap OD dan OD-74 s.d. OD-96), [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md) (matriks izin untuk review), [SMART_QUEUE_DESIGN.md](SMART_QUEUE_DESIGN.md) (arah desain antrian klinis, implementasi ditunda) |
| Bukti | Analisis baca-saja atas `backend/`, `database/`, `frontend/src/` dan dokumen di `docs/`. Tidak ada server, migrasi, atau pengujian yang dijalankan untuk dokumen ini; klaim pengujian mengutip `backend/TEST_RESULTS.md` (12 dan 13 Oktober 2026) |

## 1. Ringkasan dalam bahasa sederhana

- **Pendaftaran hanya untuk besok.** Pada hari H rumah sakit membuka pendaftaran untuk pemeriksaan hari H+1. Pasien tidak memilih tanggal; sistem menetapkan dan menampilkannya.
- **Kapasitas layanan per tanggal: 100 tempat utama ditambah 50 daftar tunggu.** 100 tempat dipakai oleh pendaftaran yang sedang menunggu pembayaran (ditahan) dan yang sudah terkonfirmasi. 50 daftar tunggu adalah antrean cadangan FIFO, bukan 50 tempat pemeriksaan tambahan. Angka 400 bukan kuota harian lagi.
- **Tempat ditahan saat menunggu bayar, terpakai permanen setelah bayar terverifikasi.** Verifikasi tidak mengurangi kapasitas dua kali, dan tempat yang sudah terkonfirmasi tidak dipakai ulang hanya karena pasien selesai mengisi form, keluar halaman, atau selesai diperiksa.
- **Nomor antrian MCU resmi baru terbit setelah pembayaran terverifikasi.** Sebelum itu yang ada hanya kode pendaftaran. Pembayaran sendiri **belum dibangun** pada tahap ini.
- **Satu akun, satu pendaftaran per hari, satu pasien per pendaftaran.** Akun adalah penanggung jawab pengajuan (terverifikasi email), bukan harus pasiennya. Form pasien dimulai kosong.
- **Nama pasien yang sama memunculkan peringatan ringan**, tanpa membuka data akun lain dan tanpa penggabungan otomatis.

Yang sudah ada belum mengikuti aturan ini: backend masih memakai batas 400 dan antrean akses yang mendaur ulang tempat, sedangkan mockup frontend masih memakai 3 pendaftaran per akun, prefill "Diri sendiri", dan nomor antrian langsung terbit tanpa pembayaran. Bagian 4 merinci konfliknya.

## 2. Keputusan pemilik yang dikonfirmasi (B, 18 Oktober 2026)

| ID | Keputusan | Konsekuensi yang ditetapkan | Masih terbuka (lihat OPEN_DECISIONS) |
| --- | --- | --- | --- |
| KP-01 | Registrasi hanya untuk H+1 (B§3) | Tanpa pemilih tanggal; tanpa booking tanggal bebas; bukan registrasi hari yang sama; tanggal layanan tampil di ringkasan, konteks pembayaran, booking terkonfirmasi, dan riwayat; zona waktu Asia/Jakarta; tanggal yang sudah melekat tidak dihitung ulang saat lewat tengah malam; tidak memindah otomatis ke hari kerja berikutnya | Jam buka/tutup (OD-74), H+1 libur (OD-75), pengecualian operator (OD-76), bayar setelah jendela tutup (OD-77), hold melewati tengah malam (OD-78), siapa membuka registrasi (OD-33) |
| KP-02 | Kapasitas layanan 100 tempat utama + 50 daftar tunggu FIFO (B§4) | `hold sah + booking terkonfirmasi <= 100` per tanggal layanan; daftar tunggu tidak memakai tempat utama sampai diterima ke reservasi; 100 + 50 bukan 150 tempat; tanpa penerimaan overflow rekaan; tempat terkonfirmasi tidak didaur ulang | Penerimaan daftar tunggu (OD-82), pesan saat penuh (OD-91), perubahan kapasitas oleh Editor (OD-32), walk-in dan kolektif (OD-25, OD-35, OD-90) |
| KP-03 | Angka 400 adalah referensi kapasitas desain teknis (B§4) | Aturan "400 registrasi berhasil per hari" DIGANTIKAN; tanpa batas booking 400/hari; tanpa rate limit keras 400 request/hari; tanpa klaim 400 pengguna serentak sudah diuji | Dimensi teknis 400 (OD-81) |
| KP-04 | Lima konsep antrian dipisah (B§4) | A akses sementara ke proses registrasi, B tempat yang ditahan menunggu bayar, C booking terkonfirmasi, D daftar tunggu 50, E antrian pemeriksaan klinis tidak boleh berbagi penghitung | Apakah A tetap ada dan batasnya (OD-03) |
| KP-05 | Hold saat menunggu bayar, terpakai setelah bayar terverifikasi (B§5) | tersedia, lalu ditahan, lalu terkonfirmasi; konversi tidak menghitung dua kali; reservasi menyimpan aplikasi, akun, pasien, tanggal layanan, state, referensi pembayaran (bila ada); tanpa durasi hold rekaan; hitung mundur browser hanya tampilan | Masa hidup hold dan pelepasan (OD-19), transisi gagal/ulang/gangguan (OD-80), bayar setelah hold lepas (OD-79), refund (OD-21) |
| KP-06 | Nomor antrian MCU resmi terbit setelah pembayaran terverifikasi (B§6) | Empat pengenal dibedakan: kode pendaftaran, referensi pembayaran, tiket sesi registrasi, nomor antrian MCU resmi; verifikasi lewat backend tepercaya (redirect browser bukan bukti); notifikasi ganda tidak memakai kapasitas dua kali dan tidak menerbitkan nomor ganda; penerbitan nomor dan aktivasi antrian klinis setelah daftar ulang adalah dua peristiwa terpisah; validasi identitas di lokasi tetap ada | Format nomor (OD-69), dasar urutan nomor (OD-89), pengenal saat daftar ulang (OD-11, OD-58) |
| KP-07 | Pembayaran sepenuhnya online, **belum diimplementasikan** (B§6) | Tanpa gateway, nominal, metode, endpoint sukses palsu, asumsi tagihan akhir, refund otomatis, atau kebijakan bayar terlambat | Ditunda: OD-04, OD-05, OD-21, OD-29, OD-30, OD-40 |
| KP-08 | Akun dan pasien (B§7) | Setiap registrasi punya akun penanggung jawab; verifikasi email; akun boleh mendaftarkan pasien siapa pun; satu akun satu registrasi per hari; satu registrasi satu pasien; form pasien kosong; tanpa prefill dari akun; aturan 3 per akun dihapus; perbedaan "diri sendiri vs orang lain" tidak diperlukan; entitas Akun, Pasien, Registrasi terpisah; relasi akun ke registrasi dicatat | Metode login dan email (OD-06), hari acuan "satu per hari" (OD-83), tahap konsumsi jatah (OD-84), pemulihan jatah (OD-85), aplikasi belum selesai ganda (OD-86), anggota tersimpan dan hubungan (OD-66, OD-70) |
| KP-09 | Peringatan kemungkinan duplikat nama pasien (B§8) | Nama dinormalisasi (huruf besar/kecil, spasi berulang); kecocokan hanya kemungkinan; tanpa penggabungan atau pemindahan kepemilikan; tanpa membuka identitas, email, telepon, booking, atau nomor akun lain; pesan minimal | Tindak lanjut peringatan (OD-87), cakupan pencarian (OD-88), aturan keras per NIK (OD-16), ketersediaan NIK (OD-17) |
| KP-10 | Tujuh peran PRD tetap; otorisasi rinci belum diputuskan (B§9) | Matriks izin disiapkan untuk keputusan; otorisasi ditegakkan di server, bukan pemeriksaan peran di browser | Seluruh baris [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md), OD-07, OD-41, OD-43, OD-92 s.d. OD-96 |
| KP-11 | OD-09 (katalog resmi) dikeluarkan dari pembahasan saat ini (B§10) | Bukan izin menghapus fitur paket/layanan; tanpa isi paket, harga, biaya admin, nilai rujukan, atau tarif rekaan; tanpa integrasi katalog; harga contoh di mockup tidak pernah dipakai untuk tagihan sungguhan | Ditunda: OD-09, OD-34 |
| KP-12 | Smart queue hanya arah desain (B§11-13) | Tanpa mesin optimasi, layanan penjadwal, atau dependensi baru; FIFO registrasi tidak menjawab urutan klinis | Lihat [SMART_QUEUE_DESIGN.md](SMART_QUEUE_DESIGN.md); OD-08, OD-48, OD-49, OD-52 |

**USULAN pemilik yang belum disetujui (B§7), tidak boleh diterapkan sebagai aturan final:** cegah lebih dari satu aplikasi belum selesai per akun; konfirmasi pembayaran yang berhasil memakai jatah registrasi harian; percobaan ulang diperlakukan sebagai aplikasi yang sama; pembatalan dan kedaluwarsa diputuskan terpisah.

## 3. Keadaan repository saat ini (bukti)

### 3.1 Backend registrasi (Flask + PostgreSQL)

| Aspek | Perilaku sekarang | Bukti |
| --- | --- | --- |
| Model data | Schema `registration`: `principal` (pemegang token review buatan operator), `service_day` (kapasitas default 400, `CHECK 1..400`), `session` (tanggal layanan bebas diisi operator), `entry` (tiket akses: `active`/`waiting`/`left`/`cancelled`/`submitted`), `submission` (tanda terima, `day_slot 1..400`) | `backend/migrations/001_registration.sql:5-54` |
| 100 aktif + 50 tunggu | Batas **per sesi**, bukan per tanggal layanan; satu tanggal dapat punya beberapa sesi (pengujian membuka dua sesi pada satu tanggal) | `001_registration.sql:39`; `backend/tests/integration.py:197` |
| Daur ulang tempat | `submit` dan `leave` membebaskan tempat aktif lalu `fill_active` mempromosikan peserta tunggu berikutnya dalam transaksi yang sama | `backend/app/registration.py:38-48, 139-141` |
| Batas 400/hari | Satu-satunya batas per tanggal: `DAILY_CAPACITY_FULL` saat join dan submit; pengujian meloloskan 399 tanda terima melalui sesi 100 tempat | `registration.py:101-103, 132-134`; `integration.py:211-222` |
| Satu entri hidup per principal | Indeks migrasi 002 dan galat `ACTIVE_IN_OTHER_SESSION`; berlaku untuk tiket akses lintas sesi dan tanggal, berakhir saat submit | `backend/migrations/002_one_live_entry_per_principal.sql:12-13`; `registration.py:91-96` |
| Tanggal layanan | Diisi operator lewat `create-session --date` tanpa kaitan ke hari ini; tidak ada `Asia/Jakarta`; join tidak membandingkan tanggal dengan jam | `backend/app/commands.py:46-59`; `registration.py:82-112` |
| Akun dan pasien | Tidak ada entitas pasien; principal mewakili akun sekaligus peserta; API menolak body permintaan | `backend/app/routes.py:9-11` |
| Tanda terima | `submission.id` (UUID), didokumentasikan bukan nomor antrian; `day_slot` internal | `backend/README.md`; `REQUIREMENTS_RESOLUTION.md` R-08 |
| Bukti pengujian | Ledakan serentak 100, 50, dan 151 permintaan, urutan FIFO, idempotensi, dan batas 400 dalam balapan dua arah. **Tidak** membuktikan 400 pengguna serentak | `backend/TEST_RESULTS.md` |

### 3.2 Frontend dan mockup (Next.js)

Hanya `/patient/registration/session` (halaman uji sesi) dan `/management/capacity` yang memanggil backend. Seluruh alur registrasi pasien adalah mockup di `sessionStorage` tab.

| Aspek | Perilaku sekarang | Bukti |
| --- | --- | --- |
| Kuota akun | `MAX_ACTIVE = 3` ("versi B, 17 Okt"), layar "Kuota antrian akun penuh", penghitung "x dari 3" di Beranda | `frontend/src/lib/mock-session.ts:31-32`; `components/patient-registration.tsx:192-208`; `components/patient.tsx:84-117` |
| Diri sendiri vs orang lain | "Daftar untuk siapa?"; "Diri sendiri" menyalin profil akun ke identitas pasien; anggota tersimpan; field hubungan | `patient-registration.tsx:116, 135-168` |
| NIK | Penolakan keras NIK yang sudah aktif (hanya dalam akun yang sama); Tambah pasien menolak "NIK sudah terdaftar!"; Ubah data petugas tanpa pemeriksaan NIK; tidak ada peringatan nama | `patient-registration.tsx:46`; `components/roles/staff-add-patient.tsx:36-37` |
| Tanggal layanan | Tidak ada di data, ringkasan, layar selesai, kotak antrian, atau Riwayat; jam diformat zona perangkat dengan akhiran "WIB" | `mock-session.ts:12`; `lib/format.ts` |
| Nomor antrian | `exampleNumber` acak saat kirim; layar "Pendaftaran berhasil" dan "Nomor antrian Anda"; catatan "contoh" tersembunyi secara default | `patient-registration.tsx:65-70, 319, 347-350`; `lib/demo.ts:3` |
| Kotak antrian | "Antrian akun ini", setiap baris "Menunggu", tombol estimasi; pembatalan menyebut "nomor antrian dilepas dan kuota akun kembali" | `patient.tsx:31-50, 88-103` |
| Petugas | Tambah pasien langsung memberi "Nomor antrian"; Verifikasi daftar ulang menulis "pasien masuk antrian MCU dengan nomor ..." | `staff-add-patient.tsx:25-30`; `roles/staff-patient.tsx:113` |
| Angka 400 | Editor kalender (termasuk batas atas isian), Pendaftaran kolektif, `mock-records.ts`, metadata layar, tabel kapasitas backend; pesan "Kuota harian penuh, harap mengubah jadwal!" | `roles/editor-calendar.tsx:34, 60-61`; `roles/clinician-collective.tsx:27`; `lib/api.ts:47` |

## 4. Konflik dengan keputusan terbaru

| # | Topik | Keadaan sekarang | Keputusan | Konflik dan akibat bila dibiarkan | Arah perbaikan (USULAN, belum dikerjakan) |
| --- | --- | --- | --- | --- | --- |
| K-01 | Logika kapasitas backend | Satu mekanisme: antrean akses per sesi yang mendaur ulang tempat; batas per tanggal hanya 400 | KP-02, KP-04 | Tidak ada tempat utama 100, tidak ada hold, tidak ada daftar tunggu layanan. Bila 400 dicabut tanpa model baru, tanda terima per tanggal tidak terbatas karena setiap submit membebaskan tempat dan mempromosikan orang berikutnya | Pisahkan A/B/C/D: tabel reservasi (`held`/`confirmed`) dengan invarian `held + confirmed <= 100` per tanggal dan tabel daftar tunggu (<= 50, FIFO) di bawah kunci PostgreSQL. Tiket akses A tidak lagi menciptakan inventaris |
| K-02 | Batas 400/hari | Default dan `CHECK` skema, `DAILY_CAPACITY_FULL`, layar "x/400", dokumen R-06 | KP-03 | Aturan yang sudah digantikan tetap menjadi satu-satunya batas | Cabut **setelah** invarian reservasi ada (sebelum itu pencabutan membuat tanda terima tidak terbatas). Jangan mengganti 400 menjadi 150 (menjadikan daftar tunggu bisa dibooking) atau 100 (tetap menghitung tanda terima belum bayar sebagai inventaris permanen) |
| K-03 | Satu entri hidup per principal | Membatasi tiket akses, berakhir saat submit, lintas semua tanggal, subjeknya token operator | KP-08 | Bukan "satu registrasi berhasil per akun per hari". Mengganti nama aturan akan diam-diam memutuskan OD-83 dan OD-84 | Pertahankan untuk A sementara (tidak berbahaya). Aturan akun dibangun di tabel aplikasi setelah OD-83, OD-84, OD-85, OD-86 dijawab |
| K-04 | Tiga pendaftaran per akun (UI) | `MAX_ACTIVE = 3` dan teks terkait | KP-08 | Bertentangan langsung | Hapus aturan 3 dan penghitungnya; ganti dengan pemeriksaan satu pendaftaran per akun untuk tanggal layanan (hari acuan menunggu OD-83) |
| K-05 | Prefill profil "Diri sendiri" | Profil akun disalin ke pasien; simpan balik ke profil | KP-08 | Bertentangan langsung | Langkah 1 dimulai kosong; tampilkan "Didaftarkan oleh {akun}". Anggota tersimpan dan field hubungan disembunyikan sampai OD-66 dan OD-70 diputuskan |
| K-06 | Duplikat NIK dan nama | Penolakan keras per NIK (pasien, dalam akun) dan Tambah pasien; tidak ada peringatan nama | KP-09 | Aturan keras NIK belum disetujui, tetapi juga tidak boleh dihapus diam-diam; peringatan nama belum ada | Tidak ada perubahan logika sebelum OD-16 diputuskan; perbaiki teks "antrian aktif" menjadi "pendaftaran aktif" dan tandai sebagai aturan sementara mockup. Peringatan nama dibangun setelah OD-87 dan OD-88 |
| K-07 | Tanggal layanan | Backend: tanggal bebas dari operator, tanpa H+1 dan tanpa Asia/Jakarta. Frontend: tanggal tidak ada; pesan "harap mengubah jadwal". `SYSTEM_DESIGN.md` §2 menyatakan "H-1-only registration ... not retained" | KP-01 | Pendaftaran untuk tanggal selain H+1 mungkin terjadi; teks mengandaikan pasien memilih tanggal; dokumen desain bertentangan | Tanggal layanan = hari ini Asia/Jakarta + 1, dibekukan saat ditetapkan, tampil di semua tempat yang diwajibkan; ganti pesan penuh (OD-91) |
| K-08 | Nomor antrian sebelum bayar | Mockup pasien dan Tambah pasien menerbitkan nomor langsung; disclaimer tersembunyi | KP-06, KP-07 | Aplikasi belum bayar tampil sebagai nomor antrian resmi | Ganti dengan "Kode pendaftaran" dan status "Menunggu pembayaran"; catatan tetap bahwa pembayaran online belum tersedia dan nomor terbit setelah pembayaran terverifikasi; tanpa tombol bayar, nominal, atau metode |
| K-09 | Kotak antrian dan pembatalan | Satu status "Menunggu" mencampur A s.d. E; teks pembatalan menjanjikan pengembalian kuota | KP-04, KP-05 | Menyatakan aturan yang belum disetujui dan mencampur konsep | Kotak "Pendaftaran akun ini" dengan status dari kosakata tetap; teks pembatalan netral tanpa klaim kuota, nomor, atau refund |
| K-10 | Verifikasi daftar ulang | Satu pesan menggabungkan penerbitan nomor dan aktivasi pemeriksaan | KP-06 | Dua peristiwa terpisah tercampur | Pesan "Identitas terverifikasi; pasien diaktifkan untuk pemeriksaan" |
| K-11 | Skema draf historis | `database/001_schema.sql`: `registration_hold.expires_at NOT NULL`, fungsi `reserve_capacity` dengan TTL, indeks keras satu kunjungan aktif per pasien | KP-05, KP-09 | Mengimpor apa adanya akan memaksakan durasi hold dan aturan keras per pasien | Pakai sebagai pola untuk B+C saja, tanpa TTL wajib dan tanpa indeks keras per pasien |
| K-12 | Tutup sesi membatalkan semua entri hidup | `close_session` membatalkan `active`/`waiting` | KP-05 | Bila dipakai untuk hold, akan diam-diam melepas hold yang menunggu bayar (OD-77 masih terbuka) | Jangan dipakai untuk reservasi; tutup jendela registrasi tidak melepas hold sampai OD-77 dan OD-19 diputuskan |
| K-13 | Dokumen yang menyatakan aturan lama sebagai keputusan | R-06, R-10, S-01 s.d. S-06, S-16 di OPEN_DECISIONS §3, README/DESIGN frontend, TODO wireframe, UI_GUIDE (langkah tanggal), SYSTEM_DESIGN, DATABASE_DESIGN, REGISTRATION_BACKEND | B§15 | Pembaca bisa mengira aturan lama masih berlaku | Sudah ditandai **Diperbarui/Digantikan 18 Oktober 2026** pada dokumen-dokumen itu tanpa menghapus riwayat (bagian 8) |

## 5. Model target (desain, belum dibangun)

### 5.1 Entitas dan penghitung

| Kode | Konsep | Rekaman (bentuk USULAN) | Batas | Status |
| --- | --- | --- | --- | --- |
| A | Akses sementara ke proses registrasi (tiket sesi registrasi) | `entry` yang ada, dipersempit; tanpa data pasien | Gerbang opsional | Ada tidaknya dan ukurannya OD-03. 100/50 di brief adalah kapasitas layanan, bukan batas akses |
| - | Akun | Identitas masuk, email terverifikasi, status | - | Ditetapkan (KP-08). Untuk tahap review, principal buatan operator dapat menjadi pengganti sementara bila disetujui |
| - | Pasien | Identitas yang diajukan (form kosong), nama ternormalisasi untuk peringatan | - | Ditetapkan terpisah dari akun. Field dan NIK terbuka |
| - | Aplikasi/registrasi | Kode pendaftaran, akun pengaju, pasien, tanggal layanan (ditetapkan saat dibuat, tidak dihitung ulang), state | - | Ditetapkan field intinya (KP-08) |
| B | Tempat ditahan menunggu bayar | `reservation` state `held`, terkait aplikasi, akun, pasien, tanggal layanan, referensi pembayaran (kosong sampai pembayaran ada) | Masuk hitungan 100 | Ditetapkan (KP-05) |
| C | Booking terkonfirmasi | Baris `reservation` yang sama berpindah ke `confirmed`, tanpa pengurangan kedua | Masuk hitungan 100, permanen untuk tanggal itu | Ditetapkan; implementasi ikut pembayaran yang ditunda |
| D | Daftar tunggu | `waiting_list` per aplikasi: tanggal layanan, urutan FIFO, state | <= 50 per tanggal layanan; tidak memakai tempat utama | Ditetapkan 50 dan FIFO. Cakupan per tanggal layanan adalah tafsiran USULAN dari "service-date capacity" |
| E | Antrian pemeriksaan klinis | Tabel kunjungan/penugasan kelak | Per unit | Ditunda (KP-12) |
| - | Nomor antrian MCU resmi | Satu per reservasi terkonfirmasi, unik per tanggal layanan | - | Terbit setelah bayar terverifikasi; format dan urutan terbuka |

Invarian (ditetapkan): untuk setiap tanggal layanan, `jumlah reservation (held, confirmed) <= 100` dan `jumlah waiting_list (waiting) <= 50`; `tempat utama tersedia = 100 - held - confirmed`.

Penegakan (USULAN, pilihan belum diputuskan): baris kapasitas per tanggal yang dikunci `FOR UPDATE` dengan `CHECK (held + confirmed <= main_capacity)`, atau slot dengan indeks unik parsial per tanggal (pola yang sudah terbukti di backend ini). Baris reservasi menjadi sumber kebenaran; tidak ada penghitung di memori proses.

### 5.2 State aplikasi

| Transisi | Arti | Status |
| --- | --- | --- |
| baru menjadi `draft` | Akun memulai aplikasi untuk H+1; tanggal layanan ditetapkan saat ini (Asia/Jakarta) | Ditetapkan (H+1, akun dicatat). Hubungan dengan gerbang A: OD-03 |
| `draft` menjadi `submitted` | Form pasien lengkap dikirim; meminta reservasi | USULAN bahwa hold diminta di sini (pertanyaan P-02) |
| `submitted` menjadi `reserved` | Tempat utama tersedia, hold dibuat | Ditetapkan (hold saat menunggu bayar) |
| `submitted` menjadi `waitlisted` | Tempat utama penuh, daftar tunggu < 50 | Ditetapkan (FIFO) |
| `submitted` menjadi `rejected_full` | Tempat utama dan daftar tunggu penuh | Ditetapkan (tanpa overflow); pesannya OD-91 |
| `waitlisted` menjadi `reserved` | Diterima ke hold setelah ada tempat dilepas | Urutan FIFO ditetapkan; pemicunya terbuka (OD-82) |
| `reserved` menjadi `confirmed` | Pembayaran terverifikasi | Ditetapkan; ditunda bersama pembayaran |
| `reserved` menjadi `released` | Batal eksplisit, gagal bayar, atau masa hold habis | Terbuka per penyebab (OD-19, OD-80) |
| `confirmed` menjadi `cancelled` | Pembatalan setelah terkonfirmasi | Terbuka (OD-20, OD-22, OD-85) |
| `confirmed` menjadi daftar ulang lalu aktif klinis | Validasi identitas di lokasi, lalu aktivasi antrian | Ditetapkan sebagai dua peristiwa; ditunda |
| peringatan duplikat nama | Penanda, bukan state | Ditetapkan sebagai peringatan; tindak lanjut OD-87 |

### 5.3 Efek kapasitas per transisi reservasi

| Transisi | Efek | Status |
| --- | --- | --- |
| tersedia menjadi `held` | held +1, dijaga invarian | Ditetapkan |
| `held` menjadi `confirmed` | held -1 dan confirmed +1 dalam satu langkah atomik | Ditetapkan |
| `held` menjadi `released` | held -1 | Terbuka (penyebab dan pelakunya) |
| `confirmed` setelah nomor terbit, form selesai, keluar halaman, pemeriksaan selesai | **Tidak ada**; tempat tetap terpakai | Ditetapkan |
| `confirmed` menjadi `cancelled` | confirmed -1 atau tetap | Terbuka |
| Notifikasi pembayaran ganda | Tidak ada efek kedua: peristiwa disimpan dengan kunci unik penyedia, transisi `held` ke `confirmed` hanya bila tepat satu baris berubah, nomor unik per reservasi | Ditetapkan prinsipnya; desain rinci menunggu kontrak penyedia |

## 6. Kasus tepi (B§14), tanpa jawaban rekaan

| Kasus | Keadaan backend sekarang | Status keputusan |
| --- | --- | --- |
| Dua pemohon berebut tempat utama terakhir | Pola kunci per tanggal sudah ada dan teruji untuk slot akses; belum ada tempat utama | Perilaku ditetapkan oleh invarian (tepat satu mendapat hold); implementasi menunggu tabel reservasi |
| Peserta daftar tunggu berhak atas tempat yang dilepas | `fill_active` mempromosikan ke akses, termasuk saat submit (salah menurut aturan baru) | Pemicu OD-82 |
| Pembayaran terverifikasi dua kali | Tidak ada pembayaran | Prinsip idempotensi ditetapkan (KP-06); ditunda |
| Callback datang setelah browser ditutup | Semua transisi butuh token pengguna | Desain harus mengizinkan transisi terverifikasi dari server tanpa sesi pengguna; ditunda |
| Pembayaran berhasil setelah reservasi tidak berlaku | Tidak ada | OD-79 |
| Jendela registrasi tutup saat pembayaran tertunda | `close-session` akan membatalkan semua entri hidup | OD-77; jangan dipakai untuk hold (K-12) |
| H+1 tutup atau libur | Tidak ada kalender; operator bebas membuat sesi | OD-75; tanpa pemindahan otomatis |
| Coba ulang setelah timeout padahal transaksi pertama sudah commit | Ditangani untuk akses dan tanda terima (Idempotency-Key) | Pola dipertahankan; untuk aplikasi: OD-80 |
| Akun mencoba aplikasi lain saat satu belum selesai | Hanya tiket akses yang dijaga | OD-86 (USULAN pemilik belum disetujui) |
| Kemungkinan pasien duplikat di akun lain | Backend tidak menerima data pasien | OD-87, OD-88 |
| Booking terkonfirmasi dibatalkan | Tanda terima tidak dapat dibatalkan | OD-20, OD-22 |
| Pasien selesai MCU | Analog sekarang salah: submit membebaskan tempat | Ditetapkan: tidak ada daur ulang |

Semua transisi kapasitas kelak memakai transaksi PostgreSQL; tidak ada penghitung lokal proses sebagai sumber kebenaran.

## 7. Urutan implementasi tahap berikutnya (setelah disetujui)

Setiap langkah kecil, satu diff yang dapat ditinjau, dengan pengujian. Tidak termasuk: pembayaran, autentikasi email, penegakan duplikat, smart queue, atau perubahan frontend luas.

### 7.1 Backend

| Langkah | Pekerjaan | Pemeriksaan penerimaan | Status |
| --- | --- | --- | --- |
| BE-1 | Satu sumber tanggal: hari ini Asia/Jakarta dihitung di SQL; tanggal layanan = hari ini + 1; jam dapat disuntik untuk pengujian | Pengujian pada 23.59 dan 00.00 WIB serta perangkat UTC memberi H+1 yang benar; tanggal tersimpan tidak berubah setelah tengah malam | Aman sekarang |
| BE-2 | Tegakkan H+1 saat masuk registrasi; `create-session` menolak atau memperingatkan tanggal selain H+1 | Galat jelas untuk tanggal lain | Aturan inti aman sekarang; jam, libur, pengecualian menunggu OD-74 s.d. OD-76 |
| BE-3 | Migrasi kapasitas per tanggal: tempat utama 100, daftar tunggu 50, penanda buka/tutup yang diisi operator; tanpa angka 400 baru | Migrasi menolak data tidak konsisten | Aman sekarang dengan konstanta; konfigurasi oleh Editor menunggu OD-32 |
| BE-4 | Migrasi reservasi dan daftar tunggu dengan invarian dan FIFO <= 50, serta fungsi layanan internal "minta reservasi" (hasil: ditahan, daftar tunggu, atau penuh) | Uji konkurensi: 100 permintaan serentak menjadi 100 hold, 50 berikutnya daftar tunggu 1 s.d. 50, berikutnya penuh; dua pemohon untuk tempat terakhir menghasilkan tepat satu hold; penghitung sama dengan jumlah baris | Primitif aman sekarang; titik pembuatan hold menunggu P-02 |
| BE-5 | Migrasi pasien dan aplikasi, endpoint draf dan kirim untuk H+1 | Form kosong; akun tercatat; satu pasien per aplikasi; tidak ada nomor antrian di respons | Menunggu P-05 (field pasien) dan P-07 (pengganti akun) |
| BE-6 | Hentikan daur ulang: submit tiket A tidak lagi membuat inventaris | 1.000 siklus submit/keluar pada A tidak pernah menaikkan held + confirmed di atas 100 | Setelah BE-4 dan BE-5; ukuran A menunggu P-01 |
| BE-7 | Cabut batas 400 dari alur baru; laporan kapasitas memisahkan A dari tempat utama dan daftar tunggu | Tidak ada jalur kode yang memakai 400 sebagai batas | Hanya setelah BE-4 |
| BE-8 | Aturan akun (satu per hari, aplikasi belum selesai) | Indeks unik parsial dan uji percobaan ganda serentak | Menunggu P-04 |
| BE-9 | Pelepasan hold dan penerimaan daftar tunggu | - | Menunggu P-03 dan pembayaran |
| BE-10 | Peringatan duplikat nama (pencarian sisi server tanpa membuka data) | - | Menunggu P-06 |
| BE-11 | Primitif konfirmasi dan nomor antrian idempoten | - | Ditunda bersama pembayaran; uji-saja tanpa endpoint hanya bila disetujui (P-03) |
| BE-12 | Bukti beban untuk referensi 400 | Rencana uji menyebut dimensi yang diukur | Menunggu OD-81 |

### 7.2 Frontend (mockup, tetap di `sessionStorage` sampai backend siap)

| Langkah | Pekerjaan | Status |
| --- | --- | --- |
| FE-1 | Helper waktu Asia/Jakarta untuk semua format tanggal/jam dan H+1 | Aman sekarang |
| FE-2 | Hapus angka 400 dari teks (Editor, Kolektif, metadata), ganti pesan "harap mengubah jadwal", buat catatan contoh tetap tampil | Aman sekarang untuk teks; semantik kuota Editor menunggu OD-32 |
| FE-3 | Hapus pilihan "Daftar untuk siapa?" dan prefill profil; form kosong; "Didaftarkan oleh {akun}" | Aman sekarang; anggota tersimpan menunggu P-08 |
| FE-4 | Tanggal layanan H+1 dibekukan dan ditampilkan di Rincian, layar selesai, kotak, dan Riwayat | Aman sekarang; perilaku melewati tengah malam menunggu OD-78 |
| FE-5 | Ganti nomor antrian contoh dengan "Kode pendaftaran" dan status "Menunggu pembayaran" | Ganti label aman sekarang; apakah mockup tetap membuat aplikasi belum bayar menunggu P-09 |
| FE-6 | Kotak "Pendaftaran akun ini" dengan status tetap; estimasi hanya untuk state klinis | Aman sekarang |
| FE-7 | Ganti aturan 3 per akun dengan satu pendaftaran per akun untuk tanggal layanan | Penghapusan aman; pemulihan setelah batal menunggu P-04 |
| FE-8 | Teks pembatalan netral; batal hanya untuk "Menunggu pembayaran" | Teks aman; ruang lingkup batal menunggu P-04 dan OD-20 |
| FE-9 | Teks syarat dan ketentuan hanya memuat aturan yang dikonfirmasi | Aman sekarang |
| FE-10 | Aturan NIK: teks "pendaftaran aktif", tandai sementara, tanpa ubah logika | Aman; logika menunggu OD-16 |
| FE-11 | Komponen peringatan duplikat nama | Komponen aman; perilaku menunggu P-06; pencarian sungguhan butuh backend |
| FE-12 | Teks petugas: verifikasi menjadi "diaktifkan untuk pemeriksaan"; Tambah pasien tanpa nomor antrian | Verifikasi aman; Tambah pasien menunggu P-10 |
| FE-13 | Sambungkan alur pasien ke backend; layar kapasitas menampilkan tempat utama, hold, terkonfirmasi, daftar tunggu | Menunggu BE-1 s.d. BE-7 |

**Langkah paling aman berikutnya dalam cakupan yang disepakati:** BE-1 sampai BE-4 di backend (tanggal H+1 Asia/Jakarta, kapasitas per tanggal, reservasi dan daftar tunggu dengan invarian dan uji konkurensi), serta FE-1 s.d. FE-6 dan FE-9 di frontend (koreksi label dan tanggal tanpa pura-pura ada pembayaran). Semuanya tidak bergantung pada keputusan yang belum dijawab.

## 8. Dokumen yang diperbarui pada pass ini

| Dokumen | Perubahan |
| --- | --- |
| `OPEN_DECISIONS.md` | Bagian pembaruan 18 Oktober: status baru setiap OD-01 s.d. OD-73 dan S-01 s.d. S-24, butir baru OD-74 s.d. OD-96, daftar pemblokir baru. Baris lama tidak dihapus |
| `PERMISSION_MATRIX.md` (baru) | Matriks izin 65 baris, ditandai DITETAPKAN atau USULAN, untuk dicentang pemilik |
| `SMART_QUEUE_DESIGN.md` (baru) | Arah desain antrian klinis; implementasi ditunda |
| `REQUIREMENTS_RESOLUTION.md`, `REGISTRATION_BACKEND.md`, `SYSTEM_DESIGN.md`, `DATABASE_DESIGN.md`, `UI_GUIDE.md`, `MVP_REVIEW.md`, `docs/system-design/README.md`, `backend/README.md`, `backend/TEST_RESULTS.md`, `frontend/README.md`, `frontend/DESIGN.md`, `docs/plans/TODO-wireframe-v2.md` | Catatan pembaruan di bagian atas yang menandai aturan lama sebagai digantikan dan menunjuk ke dokumen ini; isi lama tetap untuk riwayat |

## 9. Pertanyaan yang benar-benar menahan implementasi

Hanya pertanyaan yang menahan langkah berikutnya. Daftar lengkap ada di OPEN_DECISIONS.

| ID | Pertanyaan | Menahan | OD terkait |
| --- | --- | --- | --- |
| P-01 | Apakah gerbang akses sementara (A) tetap dipakai? Bila ya, berapa batasnya dan per apa (sesi atau tanggal), dan boleh lebih dari satu sesi per tanggal? | BE-6, alur masuk registrasi | OD-03 |
| P-02 | Kapan tempat utama mulai ditahan: saat form pasien dikirim, atau saat aplikasi dimulai? | BE-4 (pemasangan), BE-5 | OD-19 |
| P-03 | Sebelum pembayaran ada, apa yang boleh melepas hold (batal oleh akun, tindakan operator, atau tidak ada)? Bagaimana peserta daftar tunggu diterima saat ada tempat dilepas (hold otomatis, tawaran yang harus diterima, atau operator)? Bolehkah primitif "konfirmasi" khusus pengujian tanpa endpoint dibuat untuk membuktikan tidak ada hitung ganda? | BE-9, BE-11 | OD-19, OD-80, OD-82 |
| P-04 | "Satu registrasi per akun per hari": dihitung per hari pengajuan atau tanggal layanan, terpakai pada tahap apa, dipulihkan oleh apa, dan apakah usulan "satu aplikasi belum selesai per akun" disetujui? | BE-8, FE-7, FE-8 | OD-83 s.d. OD-86 |
| P-05 | Field pasien mana yang diterima backend pada tahap ini, dan bolehkah identitas pasien disimpan di bawah token review buatan operator sebelum verifikasi email ada? | BE-5 | OD-06, OD-17 |
| P-06 | Aturan keras satu pendaftaran aktif per NIK: tetap, menjadi peringatan, atau dihapus? Setelah peringatan nama: boleh lanjut, wajib centang, atau ditinjau petugas, dan registrasi mana yang dibandingkan? | BE-10, FE-10, FE-11 | OD-16, OD-87, OD-88 |
| P-07 | Bolehkah principal buatan operator menjadi pengganti akun pengaju sampai akun terverifikasi email ada? | BE-5 | OD-06 |
| P-08 | Apakah fitur anggota tersimpan dan field hubungan dipertahankan (dengan persetujuan orang itu), atau dihapus? | FE-3 | OD-66, OD-70 |
| P-09 | Selama pembayaran belum ada, apakah mockup tetap mencatat aplikasi berstatus "Menunggu pembayaran" dengan "Kode pendaftaran", atau berhenti di Rincian? Apakah kode itu sama dengan pengenal yang dipakai petugas saat daftar ulang? | FE-5 | OD-11 |
| P-10 | Walk-in dan kolektif: akun penanggung jawabnya, apakah aturan H+1 dan satu per hari berlaku, apakah memakai 100 tempat utama, dan apakah walk-in harus membayar sebelum mendapat nomor resmi? | FE-12, alur Tambah pasien | OD-25, OD-27, OD-35, OD-90 |
| P-11 | Jam buka/tutup registrasi H+1, siapa membuka tanggal, dan perilaku bila H+1 tutup | BE-2 (bagian jendela) | OD-33, OD-74, OD-75 |
| P-12 | Dimensi teknis angka 400 | BE-12 (uji beban dan cara melaporkannya) | OD-81 |

Pertanyaan izin per peran ada di bagian 5 [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md); pertanyaan smart queue ada di [SMART_QUEUE_DESIGN.md](SMART_QUEUE_DESIGN.md). Keduanya tidak menahan langkah BE-1 s.d. BE-4.
