// Shared site copy: brand, header and footer, navigation labels and hints, and messages every role reads.
//
// What belongs here (and in internal.ts / patient.ts): static displayed text that an editor may change without touching
// layout code: titles, descriptions, headings, hints, labels, button text, empty states, fixed messages. Messages that
// embed a value are small functions (the value is passed in, the sentence lives here).
// What stays dynamic (never copied here): records and anything computed from them: names, numbers, counts, statuses,
// dates and times, queue and booking numbers, prices, capacity figures from the backend, the signed-in account.
// Today those come from src/lib/mock-records.ts, mock-session.ts and the API; later from the backend.

export const site = {
  brand: {
    name: "ISLAH",
    mark: "I",
    product: "Medical Check Up RSUD Haji Provinsi Jawa Timur",
    institution: "RSUD Haji Provinsi Jawa Timur",
    copyright: "© 2026",
  },
  /** Browser tab title: "{screen} | ISLAH". */
  pageTitle: (screen: string) => `${screen} | ISLAH`,
  shell: {
    skipLink: "Lewati ke konten",
    back: "Kembali",
    close: "Tutup",
    crumbs: "Lokasi halaman",
    brandHome: (place: string) => `ISLAH, ${place}`,
    menuDescription: "Pilih halaman",
    menuLabel: (role: string) => `Menu ${role}`,
    changePage: (role: string) => `, ganti halaman ${role}`,
  },
  footer: {
    /** The help-desk number and FAQ are not provided by the hospital yet; add them here when they are. */
    help: "Kendala? Hubungi petugas MCU RSUD Haji.",
  },
  nav: {
    admin: { title: "Area admin", hint: "Akun dan ruang kerja setiap peran" },
    adminRole: "Admin",
  },
  messages: {
    required: "Mohon isi semua kolom!",
    invalid: "Data tidak valid!",
    unavailable: "Belum tersedia.",
    whatsappMissing: "WhatsApp pengguna tidak ditemukan!",
    nikLength: "NIK harus berjumlah 16 digit!",
    chooseGender: "Pilih jenis kelamin",
    emptyDefault: "Informasi akan ditampilkan di sini ketika tersedia.",
  },
} as const;

export type Site = typeof site;
