"use client";

// Record detail for the internal master-detail screens (block "aside"). Wide screens (≥ 80rem viewport):
// sticky panel beside the list. Narrower screens: the list stays alone and the selected record opens in the shared
// AppDialog (bottom sheet on phones, box on tablets), the same pop-up pattern as the patient pages.
import { type ReactNode, useSyncExternalStore } from "react";
import { AppDialog } from "@/components/app-dialog";
import { Block } from "@/components/frame";

const query = "(min-width: 80rem)";
const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
/** true when the detail fits beside the list; true on the server (screens render after the mock account loads). */
export const useWideDetail = () => useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => true);

export function DetailPane({ label, open, onClose, energy = 3, children }: {
  label: string; open: boolean; onClose: () => void; energy?: 2 | 3; children: ReactNode;
}) {
  const wide = useWideDetail();
  if (wide) return <Block id="aside" as="aside" energy={energy} protect="measure" label={label} className="ws-detail">{children}</Block>;
  return open ? <AppDialog title={label} onClose={onClose}><div className="ws-detail ws-detail-sheet">{children}</div></AppDialog> : null;
}
