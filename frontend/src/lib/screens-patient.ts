// Patient portal following the "RS Haji MCU" wireframe (12 frames, Pengguna). Requirement traceability lives in the docs
// (docs/system-design/REQUIREMENTS_RESOLUTION.md), not in the UI.
import type { Workspace } from "@/lib/screen-types";

const reg = "/patient/registration";

export const patientWorkspace: Workspace = {
  label: "Pasien", description: "Pendaftaran, perjalanan pemeriksaan, dan hasil MCU Anda.",
  menu: [
    { title: "Beranda", slug: "" }, { title: "Registrasi", slug: "registration" },
    { title: "Denah", slug: "map" }, { title: "Riwayat", slug: "results" }, { title: "Pengajuan surat", slug: "certificates" },
    { title: "Aduan dan ulasan", slug: "feedback" },
  ],
  groups: [],
  screens: [
    { slug: "", title: "Beranda", description: "Akun, pendaftaran akun ini, layanan MCU, dan denah.", header: "menu", compose: "home", untitled: true },
    { slug: "registration", title: "Form pendaftaran", subtitle: "Mohon isi data pasien dengan jujur dan lengkap", description: "Langkah 1 dari 4: data diri pasien.", header: "back", back: "/patient", compose: "form-rail" },
    { slug: "registration/terms", title: "Syarat dan ketentuan", subtitle: "Langkah 2 dari 4", description: "Baca dan setujui sebelum memilih layanan.", header: "back", back: reg, compose: "center", size: "text" },
    { slug: "registration/services", title: "Layanan", subtitle: "Langkah 3 dari 4", description: "Pilih paket atau layanan pemeriksaan.", header: "back", back: `${reg}/terms`, compose: "list-summary" },
    { slug: "registration/review", title: "Rincian", subtitle: "Langkah 4 dari 4", description: "Periksa kembali sebelum mengirim pendaftaran.", header: "back", back: `${reg}/services`, compose: "pair", anchored: true },
    { slug: "registration/done", title: "Pendaftaran tercatat", description: "Pendaftaran menunggu pembayaran.", header: "none", compose: "center", size: "hero", untitled: true },
    { slug: "registration/session", title: "Pendaftaran dengan token", description: "Kirim pendaftaran ke server dengan token akses dari operator.", header: "back", back: reg, compose: "center" },
    { slug: "map", title: "Denah", description: "Denah ruang pemeriksaan RSUD Haji.", header: "back", back: "/patient", compose: "center", size: "wide" },
    { slug: "results", title: "Riwayat", description: "Semua pendaftaran MCU akun ini.", header: "back", back: "/patient", compose: "rows" },
    { slug: "certificates", title: "Pengajuan surat", description: "Untuk haji, CPNS, dan kebutuhan lainnya.", header: "back", back: "/patient", compose: "center", size: "narrow", anchored: true },
    { slug: "feedback", title: "Aduan dan ulasan", description: "Sampaikan keluhan dan apresiasi untuk layanan kami.", header: "back", back: "/patient", compose: "center", size: "narrow" },
  ],
};
