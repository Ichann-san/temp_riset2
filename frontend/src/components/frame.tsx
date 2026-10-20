// Layout building blocks from the "RS Haji MCU" wireframe grammar, plus the content-aware desktop method
// (docs/plans/2026-10-16-wireframe-v2-desktop-design.md §3). No hooks here: usable from server and client components.
//
// Block ids per composition variant (each id is a grid area; give every direct child of <Compose> one of these):
//   center       title, main, action, meta            (single track; size = form | narrow | hero | text | wide)
//   hero-split   title, queue, features, meta         (≥900px: queue group left, features right)
//   form-rail    title, rail, form, meta              (≥900px: rail left of the form; rail = step list)
//   list-summary title, lists, summary, meta          (≥900px: sticky summary right; ≥1200px: lists split in two columns)
//   pair         title, a, b, action, meta            (≥900px: a | b, action under b)
//   rows         title, list, meta                    (≥900px: wider track for row cards)
//   work         title, lead, main, aside, meta       (internal; ≥1200px: sticky aside when present)
//   work-hero    title, lead, main, meta              (internal; ≥900px: lead card left, main right)
// DOM order is the reading order at every width: never use CSS order/dense/reverse.
import Link from "next/link";
import type { ReactNode } from "react";
import type { Size, Variant } from "@/lib/screen-types";

import { Icon } from "@/components/icon";
export { Icon, type IconName } from "@/components/icon";

export function Compose({ variant = "center", size, anchored, align, children }: { variant?: Variant; size?: Size; anchored?: boolean; align?: "start"; children: ReactNode }) {
  return <div className="compose" data-compose={variant} data-size={size} data-anchored={anchored || undefined} data-align={align}>{children}</div>;
}

export type Energy = 0 | 1 | 2 | 3 | 4;
export type Protect = "rigid" | "aspect" | "measure" | "row" | "grid" | "fluid";
type BlockTag = "div" | "section" | "aside" | "article" | "nav";
/** One composition block. id = grid area of the variant; energy/protect/bond encode the desktop rules for the layout check. */
export function Block({ id, energy, protect, bond, primary, as: Tag = "div", label, className, children }: {
  id: string; energy?: Energy; protect?: Protect; bond?: "next"; primary?: boolean; as?: BlockTag; label?: string; className?: string; children: ReactNode;
}) {
  return <Tag data-block={id} data-energy={energy} data-protect={protect} data-bond={bond} data-primary={primary || undefined} aria-label={label} className={className}>{children}</Tag>;
}

export function TitleBlock({ title, subtitle }: { title: string; subtitle?: string }) {
  return <Block id="title" energy={2} className="title-block"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</Block>;
}

export function Alert({ tone = "info", children, action }: { tone?: "info" | "warn" | "error"; children: ReactNode; action?: ReactNode }) {
  return <div className="alert" data-tone={tone} role={tone === "error" ? "alert" : "status"}><div>{children}</div>{action}</div>;
}

/** Wireframe "NOMOR ANTRIAN" card: optional label (the wireframe often puts it above the card), big value, hint; a link when href is given. */
export function BigNumberCard({ label, value, hint, href, size = "md" }: { label?: string; value: string; hint?: string; href?: string; size?: "md" | "lg" }) {
  const body = <>{label && <span className="big-number-label">{label}</span>}<strong className="big-number-value tabular">{value}</strong>{hint && <span className="big-number-hint">{hint}</span>}</>;
  return href ? <Link href={href} className="big-number" data-size={size} data-protect="aspect">{body}</Link>
    : <div className="big-number" data-size={size} data-protect="aspect">{body}</div>;
}


// Field and StarRating need useId (client): see fields.tsx.
export { Field, SelectField, StarRating } from "@/components/fields";

export function ListCard({ title, status, tone, meta, children }: { title: ReactNode; status?: string; tone?: "muted"; meta?: [string, ReactNode][]; children?: ReactNode }) {
  return <article className="list-card" data-tone={tone}>
    <div className="list-card-head"><h2>{title}</h2>{status && <span className="status-chip">{status}</span>}</div>
    {meta && <dl className="summary">{meta.map(([key, value]) => <div key={key} className="summary-row"><dt>{key}</dt><dd>{value}</dd></div>)}</dl>}
    {children}
  </article>;
}

export function SummaryBox({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="summary-box"><div className="row-between"><h2>{title}</h2>{action}</div>{children}</section>;
}

/** Large image area (Denah, documents). Placeholder label until a real image exists. */
export function MediaArea({ label, children }: { label: string; children?: ReactNode }) {
  return <div className="media-area" data-protect="aspect" role="img" aria-label={label}>{children ?? <span>{label}</span>}</div>;
}

/** Success state shared by every role: check badge, heading, short text, then the result (e.g. a BigNumberCard) and actions. */
export function SuccessPanel({ title, text, headingId, children, actions }: { title: string; text?: ReactNode; headingId?: string; children?: ReactNode; actions?: ReactNode }) {
  return <div className="success-panel" role="status">
    <span className="done-badge" aria-hidden="true"><Icon name="check" size={28} /></span>
    <div className="done-head"><h2 id={headingId} tabIndex={-1}>{title}</h2>{text && <p>{text}</p>}</div>
    {children}
    {actions && <div className="success-actions">{actions}</div>}
  </div>;
}

/** Primary action: last block of its group, full width of the track, anchored low on short mobile screens. */
export function BottomAction({ children }: { children: ReactNode }) {
  return <Block id="action" energy={4} protect="rigid" primary className="bottom-action">{children}</Block>;
}
