// One source for the identity form text, so patient registration and the staff forms (Tambah pasien, Ubah data)
// read the same: examples live in placeholders, and a hint is kept only for a rule the value must follow.
export type IdentityField = "name" | "nik" | "birthDate" | "addressKtp" | "addressHome" | "phone" | "gender" | "occupation";

export const identityLabels: Record<IdentityField, string> = {
  name: "Nama lengkap", nik: "NIK", birthDate: "Tanggal lahir", addressKtp: "Alamat KTP", addressHome: "Alamat domisili",
  phone: "Nomor telepon (WhatsApp)", gender: "Jenis kelamin", occupation: "Pekerjaan",
};

export const identityPlaceholders: Partial<Record<IdentityField, string>> = {
  name: "Sesuai KTP",
  nik: "Misalnya: 3578xxxxxxxxxxxx",
  addressKtp: "Misalnya: Jl. Manyar Kertoadi, Surabaya",
  addressHome: "Alamat tempat tinggal saat ini",
  phone: "Misalnya: 0812 3456 7890",
  occupation: "Misalnya: Guru, karyawan swasta",
};

export const identityHints: Partial<Record<IdentityField, string>> = { nik: "16 digit angka sesuai KTP." };
