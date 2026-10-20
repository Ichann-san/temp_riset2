"use client";

// /management/reports — Laporan unit dan antrian. Upper band: period form | queue summary (side by side, filling the
// track). Main: ONE per-unit table that carries every unit figure (no detail pane repeating the row), then the hourly
// queue-map placeholder. All numbers are derived from the visits in mock-records.ts; metric definitions depend on
// Masuk/Keluar.
import { useState } from "react";
import { Alert, Block, Field, SummaryBox } from "@/components/frame";
import { Band, type Column, Counts, Placeholder, RecordTable, Status, WorkPanel } from "@/components/roles/kit";
import { internal, site } from "@/content";
import { SAMPLE_TODAY, type ServiceCode, averageOf, formatMinutes, serviceCodes, services, tatMinutes, visitStatus, visits, waitMinutes } from "@/lib/mock-records";

type UnitRow = { code: ServiceCode; count: number; done: number; waitingNow: number; wait: number | null; tat: number | null };
const copy = internal.management.reports;

function unitRow(code: ServiceCode): UnitRow {
  const list = visits.filter((visit) => visit.unit === code);
  return {
    code, count: list.length, done: list.filter((visit) => visitStatus(visit) === "Selesai").length,
    waitingNow: list.filter((visit) => visitStatus(visit) === "Menunggu").length,
    wait: averageOf(list, waitMinutes),
    tat: averageOf(list, tatMinutes),
  };
}

export function ManagementReports() {
  const [from, setFrom] = useState(SAMPLE_TODAY.iso);
  const [to, setTo] = useState(SAMPLE_TODAY.iso);
  const [range, setRange] = useState({ from: SAMPLE_TODAY.iso, to: SAMPLE_TODAY.iso });
  const [formError, setFormError] = useState<string | null>(null);
  const available = range.from <= SAMPLE_TODAY.iso && SAMPLE_TODAY.iso <= range.to;
  const rows = available ? serviceCodes.map(unitRow) : [];
  const slowest = rows.reduce<UnitRow | null>((best, row) => (row.wait !== null && (best?.wait ?? -1) < row.wait ? row : best), null);
  const col = copy.list.columns;
  const columns: Column<UnitRow>[] = [
    { label: col.unit, kind: "title", cell: (row) => <span className="ws-cell-with-chip">{services[row.code].unit}{slowest?.code === row.code && <Status>{copy.list.slowest}</Status>}</span> },
    { label: col.visits, kind: "num", compact: true, cell: (row) => row.count },
    { label: col.done, kind: "num", compact: true, cell: (row) => row.done },
    { label: col.waitingNow, kind: "num", compact: true, cell: (row) => row.waitingNow },
    { label: col.wait, kind: "num", compact: true, cell: (row) => formatMinutes(row.wait) },
    { label: col.tat, kind: "num", compact: true, cell: (row) => formatMinutes(row.tat) },
  ];
  const summary = copy.summary;

  return <>
    <Block id="lead" energy={2}>
      <Band>
        <SummaryBox title={copy.period.title}>
          <form className="ws-period" noValidate aria-label={copy.period.title} onSubmit={(event) => {
            event.preventDefault();
            if (!from || !to) { setFormError(site.messages.required); return; }
            setFormError(null); setRange(from <= to ? { from, to } : { from: to, to: from });
          }}>
            <Field label={copy.period.from}><input className="field" type="date" name="from" value={from} onChange={(event) => setFrom(event.target.value)} /></Field>
            <Field label={copy.period.to}><input className="field" type="date" name="to" value={to} onChange={(event) => setTo(event.target.value)} /></Field>
            <button type="submit" className="primary-button">{internal.common.actions.show}</button>
            {formError && <p className="field-error" role="alert">{formError}</p>}
          </form>
        </SummaryBox>
        {available ? <Counts title={summary.title(SAMPLE_TODAY.label)} items={[
          [summary.visits, visits.length], [summary.done, visits.filter((visit) => visitStatus(visit) === "Selesai").length],
          [summary.wait, formatMinutes(averageOf(visits, waitMinutes))], [summary.slowest, slowest ? services[slowest.code].unit : "—"],
        ]} /> : <Alert tone="error">{copy.unavailable}</Alert>}
      </Band>
    </Block>
    <Block id="main" energy={4} protect="fluid">
      <div className="ws-stack">
        <WorkPanel id="unit-report" title={copy.list.title} description={copy.list.description}>
          <RecordTable labelledBy="unit-report" rows={rows} columns={columns} rowKey={(row) => row.code} empty={copy.unavailable} />
        </WorkPanel>
        <Placeholder title={copy.chart.title}>{copy.chart.note}</Placeholder>
      </div>
    </Block>
  </>;
}
