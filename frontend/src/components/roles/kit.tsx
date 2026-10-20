// Shared work blocks for the internal role screens. No hooks here, so AdminPage (server) can use them too.
// Screen grammar (same for every role, see styles/internal.css): title → optional upper band (summary areas side by
// side, filling the track) → ONE work panel (heading, optional head actions, toolbar with search / StatusFilter, then a
// RecordTable that fills the panel) → detail beside the table from c3 (DetailPane) or as a sheet below that.
// Tables: ONE semantic <table> per list (explicit ARIA roles, so semantics survive the display change). Below the c1
// container step (37.5rem) each row is laid out as a list card; from c1 it is a real table.
import type { ReactNode, RefObject } from "react";
import { Alert, SummaryBox } from "@/components/frame";
import type { FilterOption } from "@/components/status-filter";
export { StatusFilter, type FilterOption } from "@/components/status-filter";

/** compact: on the phone card layout the cell takes half a row (label above value), so short values pair up. */
export type Column<R> = { label: string; cell: (row: R) => ReactNode; kind?: "title" | "status" | "action" | "num" | "text"; compact?: boolean };

/**
 * width "fill" (default): from c1 the table fills its panel; "fit": it hugs the sum of its columns (small reference tables).
 * bounded: from c1 the table scrolls inside its own box (sticky header and first column), so a long list does not
 * stretch the page; the height comes from --table-max-h (default in internal.css).
 */
export function RecordTable<R>({ labelledBy, rows, columns, rowKey, selected, empty, bounded, width = "fill" }: {
  labelledBy: string; rows: R[]; columns: Column<R>[]; rowKey: (row: R) => string; selected?: string | null; empty: string;
  bounded?: boolean; width?: "fill" | "fit";
}) {
  return <div className="ws-table" data-bounded={bounded || undefined} data-width={width} role="region" aria-labelledby={labelledBy} tabIndex={0}>
    <table role="table" aria-labelledby={labelledBy}>
      <thead role="rowgroup"><tr role="row">{columns.map((column) =>
        <th key={column.label} role="columnheader" scope="col" data-kind={column.kind}>{column.label}</th>)}</tr></thead>
      <tbody role="rowgroup">{rows.length === 0
        ? <tr role="row"><td role="cell" colSpan={columns.length} data-kind="empty">{empty}</td></tr>
        : rows.map((row) => {
          const key = rowKey(row);
          return <tr key={key} role="row" data-selected={selected === key || undefined}>{columns.map((column) =>
            <td key={column.label} role="cell" data-label={column.label} data-kind={column.kind} data-compact={column.compact || undefined}>{column.cell(row)}</td>)}</tr>;
        })}</tbody>
    </table>
  </div>;
}

/**
 * A titled work area: heading (+ one-line description) on the left, head actions on the right of the same row, then the
 * toolbar (search, filters) and the content. Fills its block, so the actions sit at the table's right edge.
 */
export function WorkPanel({ id, title, description, actions, tools, children }: {
  id: string; title: string; description?: ReactNode; actions?: ReactNode; tools?: ReactNode; children: ReactNode;
}) {
  return <section className="ws-panel" aria-labelledby={id}>
    <div className="ws-panel-head">
      <div className="ws-panel-title"><h2 id={id}>{title}</h2>{description && <p className="ws-panel-desc">{description}</p>}</div>
      {actions && <div className="ws-panel-actions">{actions}</div>}
    </div>
    {tools}
    {children}
  </section>;
}

/** Toolbar row above a table: search form, filters, a live row count. Wraps on narrow panels. */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="ws-tools">{children}</div>;
}

/** Options for a StatusFilter: "Semua" plus one option per value, each with its row count. */
export function countOptions<R, T extends string>(rows: R[], values: readonly T[], of: (row: R) => T, all: string): FilterOption<T | "">[] {
  return [{ value: "", label: all, count: rows.length }, ...values.map((value) => ({ value, label: value, count: rows.filter((row) => of(row) === value).length }))];
}

/** Summary areas side by side (upper band), filling the track: SummaryBox / Counts / small forms as children. */
export function Band({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`ws-band ${className}`.trim()}>{children}</div>;
}

/** Label/number pairs in a SummaryBox (upper band). */
export function Counts({ title, action, items }: { title: string; action?: ReactNode; items: [label: string, value: ReactNode][] }) {
  return <SummaryBox title={title} action={action}><dl className="ws-counts">{items.map(([label, value]) =>
    <div key={label}><dt>{label}</dt><dd className="tabular">{value}</dd></div>)}</dl></SummaryBox>;
}

export function Status({ children }: { children: string }) {
  return <span className="status-chip" data-status={children}>{children}</span>;
}

/** Label/value rows (SummaryBox or detail body). */
export function Rows({ items }: { items: [label: string, value: ReactNode][] }) {
  return <dl className="summary">{items.map(([label, value]) => <div key={label} className="summary-row"><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

/** Stand-in for content that does not exist yet (template, chart). */
export function Placeholder({ title, children }: { title: string; children: ReactNode }) {
  return <div className="ws-placeholder"><strong>{title}</strong><span>{children}</span></div>;
}

/** "Lihat"-style button in a table row; aria-current marks the row shown in the detail. */
export function RowAction({ label, current, disabled, onClick, children }: { label: string; current?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" className="secondary-button ws-row-button" aria-current={current || undefined} aria-label={label} disabled={disabled} onClick={onClick}>{children}</button>;
}

type HeadingRef = RefObject<HTMLHeadingElement | null>;

/** Detail heading (focus target after selecting a row) with the record's status chip. */
export function DetailHead({ headingRef, title, status }: { headingRef?: HeadingRef; title: string; status?: string }) {
  return <div className="ws-detail-head"><h2 ref={headingRef} tabIndex={-1}>{title}</h2>{status && <Status>{status}</Status>}</div>;
}

/** Detail before anything is selected: heading + one hint line. */
export function DetailEmpty({ headingRef, title, hint }: { headingRef?: HeadingRef; title: string; hint: string }) {
  return <><h2 ref={headingRef} tabIndex={-1}>{title}</h2><p className="ws-hint">{hint}</p></>;
}

export type Message = { tone: "info" | "warn" | "error"; text: string; action?: ReactNode } | null;

/** Result line of the last action (status alert); renders nothing without a message. */
export function Notice({ message }: { message: Message }) {
  return message ? <Alert tone={message.tone} action={message.action}>{message.text}</Alert> : null;
}

/** Action row at the end of a form or detail: full width; split = two equal buttons (Batal | confirm). */
export function Actions({ split, children }: { split?: boolean; children: ReactNode }) {
  return <div className="ws-actions" data-split={split || undefined}>{children}</div>;
}

export const dateLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
