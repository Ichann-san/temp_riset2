# To-do: wireframe v2 (ditunda 17 Oktober 2026)

> **Diperbarui 18 Oktober 2026:** butir "Backend: maks. 3 orang per akun + satu per NIK" dan "Data profil akun pasien sebagai sumber prefill Diri sendiri" digantikan (satu registrasi per akun per hari; form pasien kosong; aturan NIK menunggu OD-16). Isi di bawah dibiarkan sebagai riwayat; rinciannya di [RECONCILIATION_2026-10-18.md](../system-design/RECONCILIATION_2026-10-18.md).

Status: implementasi wireframe v2 + desktop sadar-konten **diterima pemilik**. Rincian: [2026-10-16-wireframe-v2-desktop-design.md](2026-10-16-wireframe-v2-desktop-design.md) §6, [MVP_REVIEW.md](../system-design/MVP_REVIEW.md) §8.

## Menunggu keputusan pemilik
- [ ] Ejaan "WhatsApp pengguna tidak ditemukan!" (PRD: "Whatsapp").
- [ ] Penyimpangan kecil dari wireframe: tombol X alert di kanan + tautan "Daftar MCU"; radio "Tanpa paket"; kartu Non paket tidak bisa diciutkan; footer tanpa ikon WhatsApp, FAQ bukan tautan.
- [x] Default fase 4: Fitur Kami 2×2 di 320px; tabel antrian unit boleh scroll di ~1280px; token `--row-box` 30rem (diputuskan, lihat rancangan wireframe v2 §6).

## Menunggu konten RS
- [ ] Teks syarat dan ketentuan, gambar denah, opsi keperluan surat, isi Paket Haji, nomor kontak/FAQ.
- [ ] Layar menu/profil dan layar sukses (tidak ada di wireframe).

## Kosmetik
- [ ] Selisih ~4px judul dua kolom Home (hero-split).

## Keputusan terbuka lama
- [ ] Q1–Q15 (REQUIREMENTS_RESOLUTION.md), A-1–A-4 dan D-1–D-9 (MVP_REVIEW.md). Semua data masih mockup.

## Beranda pasien + arah visual (17 Oktober 2026)
Diterapkan di frontend (mockup): Beranda hub tanpa drawer, kotak antrian per akun (versi B, N = 3, satu antrian aktif per NIK), `/patient/tracking` → Beranda, registrasi "Daftar untuk siapa?" (diri sendiri terisi dari profil, orang lain + hubungan + simpan sebagai anggota), contoh isian ke placeholder, label demo di balik `NEXT_PUBLIC_DEMO_LABELS`, arah visual Opsi 1 (Montserrat, hijau RS #0E803F).
- [ ] Backend: ganti batas "satu entri hidup per akun" (`ACTIVE_IN_OTHER_SESSION`, migrasi 002) menjadi maks. 3 orang per akun + satu per NIK; entri perlu identitas orang (bukan hanya akun).
- [ ] Putuskan Q8/D-5: apakah pendaftar boleh melihat hasil MCU orang yang didaftarkannya (SYSTEM_DESIGN §8).
- [ ] Data profil akun pasien sungguhan (sumber prefill "Diri sendiri") dan halaman profil.
- [ ] Lint dan uji tata letak penuh (tahap pengujian berikutnya).

## Daftar keputusan terbuka (17 Oktober 2026)
Semua kebutuhan yang belum jelas dan sudah punya wujud di UI kini terkumpul di [OPEN_DECISIONS.md](../system-design/OPEN_DECISIONS.md) (73 butir OD-01 s.d. OD-73, urut dampak). Jawab di sana sebelum membangun perilaku yang bergantung padanya.
