// Editable patient-facing copy (Beranda, registration flow, Riwayat, Denah, forms, dialogs, terms). Brand, header and footer
// copy shared by every role lives in site.ts.
// Static text only: applications, account names, service dates, registration codes and times stay dynamic and come from
// the session state (src/lib/mock-session.ts) and the formatters (src/lib/format.ts). Identity field labels, placeholders
// and hints are shared with the staff forms and live in src/lib/identity-meta.ts.
import type { IconName } from "@/components/icon";

/* ───── Types ───── */

export type ApplicationStatus = "awaiting_payment" | "waiting" | "confirmed" | "cancelled";

export interface BentoItem {
  key: "registration" | "history" | "certificates" | "feedback";
  title: string;
  text: string;
  action: string;
  href: string;
  icon: IconName;
}

export interface TermsSection {
  title: string;
  text: string;
}

export interface DialogCopy {
  title: string;
  description: string;
}

export interface PatientContent {
  /** Fixed status vocabulary of a registration (mirrors the backend states). */
  status: Record<ApplicationStatus, string>;
  home: {
    greeting: (name: string) => string;
    tagline: string;
    accountLabel: string;
    accountFacts: { username: string };
    box: { title: string; listLabel: string; dateLabel: string; empty: string; emptyAction: string };
    bento: BentoItem[];
    registrationBusy: { text: string; action: string };
    historyEmpty: string;
    servicesLabel: string;
    map: { title: string; text: string; action: string; label: string };
  };
  application: {
    labels: { code: string; status: string; serviceDate: string; patient: string; nik: string; services: string; submittedAt: string; submittedBy: string };
    paymentNote: string;
    cancel: {
      action: string;
      question: (code: string, name: string, serviceDate: string) => string;
      groupLabel: (code: string) => string;
      keep: string;
      confirm: string;
      done: (code: string) => string;
    };
  };
  registration: {
    steps: string[];
    stepCount: (index: number, total: number, label: string) => string;
    serviceDate: { label: string; hint: string };
    submittedBy: (account: string) => string;
    formIncomplete: string;
    next: string;
    selectPrefix: string;
    errors: {
      name: string; nik: string; birthDateMissing: string; birthDateFuture: string; addressKtp: string; addressHome: string;
      phone: string; gender: string; occupation: string;
    };
    /** Temporary hospital policy (owner decision G, 18 Oktober 2026), exact wording. */
    duplicateNik: string;
    blocked: {
      unfinishedTitle: string;
      unfinishedText: string;
      sameDateTitle: string;
      sameDateText: string;
      back: string;
    };
    terms: { regionLabel: string; sections: TermsSection[]; agree: string; agreeError: string };
    services: {
      packages: string; extras: string; showContents: string; contentsMissing: string; noPackage: string; included: string;
      summaryLabel: string; total: string; choiceError: string;
    };
    review: {
      registrationBox: string; identityBox: string; servicesBox: string; edit: string; editIdentity: string; editServices: string;
      rows: { name: string; nik: string; birthDate: string; addressKtp: string; addressHome: string; phone: string; gender: string; occupation: string };
      submit: string; sending: string; dateChanged: (serviceDate: string) => string;
    };
    done: { srHeading: string; heading: string; text: string; back: string };
  };
  history: { emptyTitle: string; emptyText: string; emptyAction: string; title: (serviceDate: string) => string };
  mapView: { placeholder: string; note: string };
  feedback: {
    kind: string; kindPlaceholder: string; kinds: string[]; rating: string; message: string; messagePlaceholder: string;
    errors: { kind: string; rating: string; message: string; form: string };
    submit: string; sentTitle: string; sentText: (kind: string) => string; again: string; ratingValue: (rating: number) => string;
  };
  certificate: {
    purpose: string; purposePlaceholder: string; purposes: string[]; other: string; otherLabel: string; otherPlaceholder: string;
    errors: { purpose: string; detail: string; form: string };
    submit: string; sentTitle: string; sentText: string; again: string; otherValue: (detail: string) => string;
  };
  sent: { close: string; back: string };
  dialogs: { results: DialogCopy; certificates: DialogCopy; feedback: DialogCopy; map: DialogCopy };
  /** /patient/registration/session: registration sent to the server with an operator-issued access token. */
  connected: {
    token: { title: string; description: string };
    date: { title: string; label: string; status: string; open: string; closed: string; note: string };
    readAt: (time: string) => string;
    reload: string;
    current: { title: string; status: string; code: string; position: string; heldNote: string; waitingNote: string; cancel: string };
    form: { title: string; description: string; chooseGender: string; note: string; submit: string };
    history: { title: string; created: string };
  };
}

/* ───── Content ───── */

export const patientContent: PatientContent = {
  status: {
    awaiting_payment: "Menunggu pembayaran",
    waiting: "Daftar tunggu",
    confirmed: "Terkonfirmasi",
    cancelled: "Dibatalkan",
  },

  // Beranda
  home: {
    greeting: (name) => `Halo, ${name}`,
    tagline: "Layanan Medical Check Up RSUD Haji Provinsi Jawa Timur",
    accountLabel: "Akun",
    accountFacts: { username: "Username" },
    box: { title: "Pendaftaran akun ini", listLabel: "Daftar pendaftaran akun ini", dateLabel: "Pemeriksaan", empty: "Belum ada pendaftaran.", emptyAction: "Daftar MCU" },
    bento: [
      { key: "registration", title: "Registrasi MCU", text: "Daftarkan satu pasien untuk pemeriksaan besok.", action: "Mulai daftar", href: "/patient/registration", icon: "register" },
      { key: "history", title: "Riwayat", text: "Semua pendaftaran MCU akun ini.", action: "Lihat riwayat", href: "/patient/results", icon: "history" },
      { key: "certificates", title: "Surat Keterangan", text: "Ajukan surat untuk haji, CPNS, atau keperluan lain.", action: "Ajukan surat", href: "/patient/certificates", icon: "letter" },
      { key: "feedback", title: "Aduan dan Ulasan", text: "Sampaikan keluhan atau apresiasi layanan.", action: "Tulis pesan", href: "/patient/feedback", icon: "chat" },
    ],
    registrationBusy: { text: "Akun ini sudah memiliki pendaftaran yang belum selesai.", action: "Lihat pendaftaran" },
    historyEmpty: "Belum ada riwayat.",
    servicesLabel: "Layanan",
    map: { title: "Denah", text: "Lokasi ruang pemeriksaan MCU di RSUD Haji.", action: "Lihat denah", label: "Denah" },
  },

  // One registration (Beranda box, registration page, done screen)
  application: {
    labels: {
      code: "Kode pendaftaran", status: "Status", serviceDate: "Tanggal pemeriksaan", patient: "Pasien", nik: "NIK",
      services: "Layanan", submittedAt: "Dikirim", submittedBy: "Didaftarkan oleh",
    },
    paymentNote: "Pembayaran online belum tersedia. Nomor antrian MCU diberikan setelah pembayaran terverifikasi.",
    cancel: {
      action: "Batalkan pendaftaran",
      question: (code, name, serviceDate) => `Batalkan pendaftaran ${code} atas nama ${name} untuk tanggal pemeriksaan ${serviceDate}?`,
      groupLabel: (code) => `Konfirmasi pembatalan ${code}`,
      keep: "Tidak",
      confirm: "Ya, batalkan",
      done: (code) => `Pendaftaran ${code} dibatalkan.`,
    },
  },

  // Registration flow: Data diri → Syarat dan ketentuan → Layanan → Rincian → Pendaftaran tercatat
  registration: {
    steps: ["Data diri", "Syarat dan ketentuan", "Layanan", "Rincian"],
    stepCount: (index, total, label) => `Langkah ${index} dari ${total}: ${label}`,
    serviceDate: { label: "Tanggal pemeriksaan", hint: "Ditetapkan sistem: hari berikutnya (WIB)." },
    submittedBy: (account) => `Didaftarkan oleh ${account}`,
    formIncomplete: "Mohon mengisi semua informasi yang diperlukan!",
    next: "Lanjut",
    selectPrefix: "Pilih",
    errors: {
      name: "Isi nama lengkap.",
      nik: "NIK harus berjumlah 16 digit!",
      birthDateMissing: "Isi tanggal lahir.",
      birthDateFuture: "Tanggal lahir tidak boleh melewati hari ini.",
      addressKtp: "Isi alamat sesuai KTP.",
      addressHome: "Isi alamat domisili.",
      phone: "Gunakan nomor WhatsApp yang valid, misalnya 08xxxxxxxxxx.",
      gender: "Pilih jenis kelamin.",
      occupation: "Isi pekerjaan.",
    },
    duplicateNik: "NIK tersebut sudah memiliki pendaftaran untuk tanggal layanan ini.",
    blocked: {
      unfinishedTitle: "Pendaftaran belum selesai",
      unfinishedText: "Satu akun hanya dapat memiliki satu pendaftaran yang belum selesai. Batalkan pendaftaran ini bila ingin mendaftar ulang.",
      sameDateTitle: "Sudah terdaftar untuk tanggal ini",
      sameDateText: "Satu akun dapat mendaftarkan satu pasien untuk satu tanggal layanan.",
      back: "Kembali ke beranda",
    },
    terms: {
      regionLabel: "Isi syarat dan ketentuan",
      sections: [
        { title: "1. Pendaftaran", text: "Satu akun dapat mendaftarkan satu pasien untuk satu tanggal layanan. Pasien tidak harus pemilik akun. Isi data pasien dengan benar dan lengkap sesuai KTP." },
        { title: "2. Tanggal pemeriksaan", text: "Tanggal pemeriksaan ditetapkan oleh sistem, yaitu hari berikutnya setelah pendaftaran dikirim (WIB). Tanggal tidak dapat dipilih dan tidak berubah setelah pendaftaran tercatat." },
        { title: "3. Biaya dan pembayaran", text: "Tarif dan cara pembayaran mengikuti ketentuan rumah sakit. Nomor antrian MCU diberikan setelah pembayaran terverifikasi." },
        { title: "4. Pelaksanaan pemeriksaan", text: "Ketentuan kehadiran dan persiapan pemeriksaan mengikuti dokumen rumah sakit." },
        { title: "5. Data pribadi", text: "Data pasien disimpan dan dipakai sesuai kebijakan privasi rumah sakit." },
      ],
      agree: "Saya telah membaca dan menyetujui syarat dan ketentuan.",
      agreeError: "Centang persetujuan untuk melanjutkan.",
    },
    services: {
      packages: "Paket", extras: "Non paket dan tambahan", showContents: "Lihat isi paket", contentsMissing: "Isi paket belum tersedia.",
      noPackage: "Tanpa paket", included: " (termasuk paket)", summaryLabel: "Ringkasan biaya", total: "Total biaya",
      choiceError: "Pilih satu paket atau minimal satu layanan.",
    },
    review: {
      registrationBox: "Pendaftaran", identityBox: "Identitas pasien", servicesBox: "Layanan dan biaya", edit: "Ubah",
      editIdentity: " identitas pasien", editServices: " layanan",
      rows: {
        name: "Nama", nik: "NIK", birthDate: "Tanggal lahir", addressKtp: "Alamat KTP", addressHome: "Alamat domisili",
        phone: "WhatsApp", gender: "Jenis kelamin", occupation: "Pekerjaan",
      },
      submit: "Kirim pendaftaran",
      sending: "Mengirim pendaftaran…",
      dateChanged: (serviceDate) => `Tanggal pemeriksaan diperbarui menjadi ${serviceDate}. Periksa kembali sebelum mengirim.`,
    },
    done: {
      srHeading: "Pendaftaran MCU",
      heading: "Pendaftaran tercatat",
      text: "Pendaftaran ini juga tampil di Beranda.",
      back: "Kembali ke beranda",
    },
  },

  // Riwayat
  history: {
    emptyTitle: "Belum ada pendaftaran.",
    emptyText: "Riwayat muncul setelah Anda mengirim pendaftaran MCU.",
    emptyAction: "Daftar MCU",
    title: (serviceDate) => `Pemeriksaan ${serviceDate}`,
  },

  // Denah
  mapView: { placeholder: "Denah belum tersedia", note: "Gambar denah ruang pemeriksaan dari rumah sakit belum tersedia." },

  // Aduan dan ulasan
  feedback: {
    kind: "Jenis pesan", kindPlaceholder: "Pilih jenis pesan", kinds: ["Aduan", "Ulasan"], rating: "Nilai pelayanan", message: "Pesan",
    messagePlaceholder: "Ceritakan pengalaman atau keluhan Anda",
    errors: { kind: "Pilih jenis pesan.", rating: "Pilih nilai pelayanan, 1 sampai 5 bintang.", message: "Tulis pesan Anda.", form: "Mohon isi sesuai ketentuan!" },
    submit: "Kirim", sentTitle: "Terima kasih", sentText: (kind) => `${kind} Anda sudah kami terima.`, again: "Tulis pesan lain",
    ratingValue: (rating) => `${rating} dari 5`,
  },

  // Pengajuan surat (options follow the Beranda card text "Untuk haji, CPNS, dan kebutuhan lainnya")
  certificate: {
    purpose: "Keperluan", purposePlaceholder: "Pilih keperluan", purposes: ["Haji", "CPNS", "Lainnya"], other: "Lainnya",
    otherLabel: "Keperluan lainnya", otherPlaceholder: "Tulis keperluan di sini",
    errors: { purpose: "Pilih keperluan surat.", detail: "Tulis keperluan surat.", form: "Mohon isi seluruh data!" },
    submit: "Kirim", sentTitle: "Pengajuan surat tercatat", sentText: "Pengajuan surat sudah kami terima.", again: "Ajukan surat lain",
    otherValue: (detail) => `Lainnya: ${detail}`,
  },

  sent: { close: "Tutup", back: "Kembali ke beranda" },

  // Pop-ups opened from Beranda (app/patient/@modal)
  dialogs: {
    results: { title: "Riwayat", description: "Semua pendaftaran MCU akun ini." },
    certificates: { title: "Pengajuan surat", description: "Untuk haji, CPNS, atau keperluan lain." },
    feedback: { title: "Aduan dan ulasan", description: "Sampaikan keluhan atau apresiasi layanan." },
    map: { title: "Denah", description: "Lokasi ruang pemeriksaan MCU di RSUD Haji." },
  },

  // Registration through the server (access token from an operator)
  connected: {
    token: { title: "Token akses", description: "Masukkan token akses dari operator untuk mendaftar melalui server." },
    date: {
      title: "Tanggal layanan", label: "Tanggal pemeriksaan", status: "Pendaftaran", open: "Dibuka", closed: "Belum dibuka atau sudah ditutup",
      note: "Tanggal pemeriksaan ditetapkan sistem, yaitu hari berikutnya (WIB), dan tidak dapat dipilih.",
    },
    readAt: (time) => `Diperbarui pukul ${time}.`,
    reload: "Perbarui status",
    current: {
      title: "Pendaftaran akun ini", status: "Status", code: "Kode pendaftaran", position: "Urutan daftar tunggu",
      heldNote: "Tempat pemeriksaan ditahan untuk pendaftaran ini. Pembayaran online belum tersedia. Nomor antrian MCU diberikan setelah pembayaran terverifikasi.",
      waitingNote: "Pendaftaran ini ada di daftar tunggu. Bila tempat pemeriksaan tersedia, pendaftaran dipindahkan sesuai urutan dan statusnya menjadi Menunggu pembayaran. Selama di daftar tunggu tidak ada pembayaran yang diminta.",
      cancel: "Batalkan pendaftaran",
    },
    form: {
      title: "Data pasien", description: "Pasien tidak harus pemilik akun. Isi data pasien sesuai KTP.", chooseGender: "Pilih jenis kelamin",
      note: "Satu akun dapat mendaftarkan satu pasien untuk satu tanggal layanan. Kirim pendaftaran adalah konfirmasi akhir.",
      submit: "Kirim pendaftaran",
    },
    history: { title: "Riwayat pendaftaran", created: "Dikirim" },
  },
};
