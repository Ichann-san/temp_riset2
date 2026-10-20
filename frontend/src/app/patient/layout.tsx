import type { ReactNode } from "react";

// `modal` (app/patient/@modal) shows Riwayat, Surat Keterangan, Aduan dan Ulasan and Denah as pop-ups over Beranda when they
// are opened by client-side navigation; a direct visit or refresh renders the full page in `children` instead.
export default function PatientLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return <>{children}{modal}</>;
}
