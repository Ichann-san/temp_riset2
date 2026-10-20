"use client";

// Pop-up for patient content opened from Beranda (Riwayat, Surat Keterangan, Aduan dan Ulasan, Denah). Rendered by the
// intercepted routes in app/patient/@modal, so the URL still changes: browser back closes it, a refresh or a shared link opens
// the full page. The dialog itself is the shared AppDialog (box on desktop, sheet on phones).
import { useRouter } from "next/navigation";
import { type ReactNode, createContext, useCallback, useContext, useRef } from "react";
import { AppDialog } from "@/components/app-dialog";
import { Compose } from "@/components/frame";
import type { Size, Variant } from "@/lib/screen-types";

const DialogClose = createContext<(() => void) | null>(null);
/** Close function when rendered inside a pop-up, otherwise null (full page). */
export const useDialogClose = () => useContext(DialogClose);
export const DialogCloseProvider = DialogClose.Provider;

export function PatientDialog({ title, description, compose = "center", size = "narrow", children }: {
  title: string; description?: string; compose?: Variant; size?: Size; children: ReactNode;
}) {
  const router = useRouter();
  const closing = useRef(false);
  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    router.back();
  }, [router]);
  return <AppDialog title={title} description={description} size={compose === "rows" ? "wide" : undefined} onClose={close}>
    <DialogClose.Provider value={close}><Compose variant={compose} size={size}>{children}</Compose></DialogClose.Provider>
  </AppDialog>;
}
