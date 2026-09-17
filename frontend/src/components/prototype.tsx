import Link from "next/link";
import type { ReactNode } from "react";

export type Tone = "success" | "warning" | "danger" | "neutral" | "accent";

const toneClass: Record<Tone, string> = {
  success: "bg-emerald-50 text-emerald-800",
  warning: "bg-amber-50 text-amber-800",
  danger: "bg-red-50 text-red-800",
  neutral: "bg-slate-100 text-slate-700",
  accent: "bg-teal-50 text-teal-800",
};

export function Status({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-semibold ${toneClass[tone]}`}>{children}</span>;
}

export function PrototypeNote() {
  return <div className="flex items-center gap-2 text-xs font-medium text-[#5d707a]"><span className="h-2 w-2 rounded-full bg-[#087f73]" aria-hidden="true" />Data ilustrasi untuk prototype</div>;
}

export function Section({ title, description, action, children, className = "" }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`surface p-5 sm:p-6 ${className}`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-base font-bold tracking-[-0.01em] text-[#102a37]">{title}</h2>{description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-[#5d707a]">{description}</p> : null}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="min-w-0 border-t border-[#dce5e8] pt-4"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6b7d85]">{label}</p><p className="tabular mt-2 text-2xl font-bold tracking-[-0.03em] text-[#102a37]">{value}</p>{detail ? <p className="mt-1 text-xs leading-5 text-[#5d707a]">{detail}</p> : null}</div>;
}

export function ProgressSteps({ items }: { items: { label: string; detail: string; state: "done" | "active" | "upcoming" }[] }) {
  return <ol className="space-y-0">{items.map((item, index) => <li key={item.label} className="grid grid-cols-[28px_1fr] gap-3"><div className="flex flex-col items-center"><span className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${item.state === "done" ? "border-[#087f73] bg-[#087f73] text-white" : item.state === "active" ? "border-[#087f73] bg-[#e3f4f1] text-[#075f58]" : "border-[#c9d6da] bg-white text-[#71838b]"}`}>{index + 1}</span>{index < items.length - 1 ? <span className="h-9 w-px bg-[#dce5e8]" aria-hidden="true" /> : null}</div><div className="pb-5"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-[#183844]">{item.label}</p>{item.state === "active" ? <Status tone="accent">Berlangsung</Status> : null}</div><p className="mt-1 text-xs leading-5 text-[#62757e]">{item.detail}</p></div></li>)}</ol>;
}

export function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[640px] border-collapse text-left"><thead><tr className="border-b border-[#dce5e8]">{headers.map((header) => <th key={header} className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-[#6b7d85]">{header}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-[#e7edef] last:border-0">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-3.5 text-sm text-[#294651]">{cell}</td>)}</tr>)}</tbody></table></div>;
}

export function MiniBars({ items }: { items: { label: string; value: number; display: string; tone?: "accent" | "warning" }[] }) {
  return <div className="space-y-4">{items.map((item) => <div key={item.label}><div className="mb-1.5 flex items-center justify-between gap-4 text-sm"><span className="font-medium text-[#294651]">{item.label}</span><span className="tabular text-xs font-semibold text-[#536a74]">{item.display}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#e7edef]"><div className={`h-full rounded-full ${item.tone === "warning" ? "bg-[#d49328]" : "bg-[#087f73]"}`} style={{ width: `${item.value}%` }} /></div></div>)}</div>;
}

type Role = "patient" | "staff" | "clinician" | "management";
const roleMeta: Record<Role, { label: string; title: string; nav: { label: string; href: string }[] }> = {
  patient: { label: "Portal Pasien", title: "Rina Pratama", nav: [{ label: "Ringkasan", href: "/patient" }, { label: "Paket MCU", href: "/patient/packages" }, { label: "Registrasi", href: "/patient/registration" }, { label: "Lacak MCU", href: "/patient/tracking" }, { label: "Hasil & riwayat", href: "/patient/results" }] },
  staff: { label: "Dashboard Petugas", title: "Petugas Laboratorium", nav: [{ label: "Ringkasan", href: "/staff" }, { label: "Worklist", href: "/staff/worklist" }, { label: "Input hasil", href: "/staff/patient" }, { label: "Status stasiun", href: "/staff/stations" }] },
  clinician: { label: "Verifikasi Klinis", title: "dr. Maya Sari", nav: [{ label: "Daftar verifikasi", href: "/clinician" }, { label: "Tinjau hasil", href: "/clinician/review" }] },
  management: { label: "Dashboard Manajemen", title: "Manajemen MCU", nav: [{ label: "Ringkasan", href: "/management" }, { label: "Laporan", href: "/management/reports" }] },
};

export function AppShell({ role, active, title, description, children }: { role: Role; active: string; title: string; description: string; children: ReactNode }) {
  const meta = roleMeta[role];
  return <div className="min-h-[100dvh] bg-[#f4f7f8] lg:grid lg:grid-cols-[248px_1fr]"><aside className="border-b border-[#dce5e8] bg-[#0f2f3a] text-white lg:sticky lg:top-0 lg:h-[100dvh] lg:border-b-0"><div className="flex h-16 items-center justify-between px-5 lg:h-auto lg:block lg:px-6 lg:py-7"><Link href="/" className="flex items-center gap-3 rounded-md"><span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#31b7a6] text-sm font-black text-[#082b31]">I</span><span><span className="block text-lg font-bold tracking-[-0.03em]">ISLAH</span><span className="hidden text-[11px] text-[#b9ccd1] lg:block">RSUD Haji Jawa Timur</span></span></Link><Status tone="accent">Prototype</Status></div><nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:px-4 lg:pb-0" aria-label={meta.label}>{meta.nav.map((item) => <Link key={item.href} href={item.href} className={`block shrink-0 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors lg:px-4 ${active === item.href ? "bg-white text-[#12323d]" : "text-[#c9d8dc] hover:bg-white/10 hover:text-white"}`}>{item.label}</Link>)}</nav><div className="mt-auto hidden border-t border-white/10 p-5 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block"><p className="text-xs text-[#9db6bd]">Masuk sebagai</p><p className="mt-1 text-sm font-semibold text-white">{meta.title}</p><Link href="/" className="mt-3 inline-block text-xs font-semibold text-[#63d2c4] underline decoration-transparent underline-offset-4 hover:decoration-current">Ganti peran</Link></div></aside><main className="min-w-0"><header className="border-b border-[#dce5e8] bg-white px-5 py-5 sm:px-8 lg:px-10"><div className="mx-auto flex max-w-[1320px] flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-bold tracking-[-0.035em] text-[#102a37] sm:text-3xl">{title}</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-[#5d707a]">{description}</p></div><PrototypeNote /></div></header><div className="mx-auto max-w-[1320px] p-5 sm:p-8 lg:p-10">{children}</div></main></div>;
}

export function StaticAction({ children, secondary = false }: { children: ReactNode; secondary?: boolean }) {
  return <button type="button" className={`prototype-button ${secondary ? "secondary" : ""}`} aria-describedby="prototype-action-note">{children}</button>;
}

export function PrototypeActionNote() {
  return <p id="prototype-action-note" className="mt-3 text-xs leading-5 text-[#687b83]">Tampilan prototype — tindakan ini belum terhubung ke sistem.</p>;
}
