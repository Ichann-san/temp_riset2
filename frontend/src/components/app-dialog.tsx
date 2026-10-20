"use client";

// Shared pop-up for every role: native <dialog> (focus moves inside, Esc closes, the page behind is inert).
// Box in the middle on wide screens, sheet from the bottom on phones (styles: .app-dialog in globals.css).
// Used by PatientDialog (patient pop-ups on routes), DetailPane (record details) and Tambah pasien.
import { type ReactNode, useEffect, useId, useRef } from "react";
import { Icon } from "@/components/frame";
import { site } from "@/content";

/** placement "top": drops down from the header (navigation menus); default: centred box / bottom sheet (content). */
export function AppDialog({ title, description, size, placement, onClose, children }: {
  title: string; description?: string; size?: "wide"; placement?: "top"; onClose: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    // React removes the dialog before this effect's cleanup runs, so the browser cannot restore focus: do it here.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (dialog && !dialog.open) dialog.showModal();
    // Start where the user is: a record detail's heading (tabIndex -1) or the current menu item, not the close button.
    dialog?.querySelector<HTMLElement>(".dialog-body [tabindex='-1'], .dialog-body [aria-current='page']")?.focus();
    return () => {
      dialog?.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={ref} className="app-dialog" data-size={size} data-placement={placement} aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dialog-head">
      <div><h2 id={titleId}>{title}</h2>{description && <p>{description}</p>}</div>
      <button type="button" className="icon-button" onClick={onClose}><Icon name="close" /><span className="sr-only">{site.shell.close}</span></button>
    </div>
    <div className="dialog-body">{children}</div>
  </dialog>;
}
