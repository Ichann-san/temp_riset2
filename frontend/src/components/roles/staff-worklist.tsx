"use client";

// /staff/worklist — Worklist per unit with Catatan waktu layanan (merged 17 Oktober 2026; /staff/timing redirects
// here). Read-only, one compact screen:
//   lead  three adjacent areas: Status hari ini (patient counts + unit visit totals), Status unit (per unit: sedang
//         dilayani, menunggu, selesai), Rata-rata waktu per unit (tunggu / pemeriksaan, from the example clock times)
//   main  ONE table: worklist + time log per unit visit, search and unit filter applied on change; from c1 the table scrolls
//         inside its own bounded box (sticky header), below c1 it is the RecordTable card list.
// Every number comes from mock-records.ts (visits, patients); nothing is estimated. Durations depend on Masuk/Keluar.
import { useState } from "react";
import { Block, SummaryBox } from "@/components/frame";
import { TableFilters } from "@/components/table-filters";
import { type Column, RecordTable, Status, WorkPanel, dateLabel } from "@/components/roles/kit";
import { internal } from "@/content";
import {
  SAMPLE_TODAY, type ServiceCode, type Visit, averageOf, examMinutes, finishedPatients, formatMinutes, packageLabel,
  patientByQueue, patients, serviceCodes, services, visitStatus, visits, waitMinutes,
} from "@/lib/mock-records";

type Filter = ServiceCode | "";

const unitName = (code: ServiceCode) => services[code].unit.replace(/^Unit /, "");
const minutesCell = (value: number | null) => (value === null ? "—" : String(value));
const visitStatuses = ["Menunggu", "Diperiksa", "Selesai"] as const;
const countBy = (list: Visit[], status: ReturnType<typeof visitStatus>) => list.filter((visit) => visitStatus(visit) === status).length;

const copy = internal.staff.worklist;
const col = copy.list.columns;
const columns: Column<Visit>[] = [
  { label: col.queue, kind: "title", cell: (visit) => <span className="tabular">{visit.queue}</span> },
  { label: col.patient, cell: (visit) => patientByQueue(visit.queue)?.name ?? "—" },
  { label: col.package, compact: true, cell: (visit) => { const item = patientByQueue(visit.queue); return item ? packageLabel(item) : "—"; } },
  { label: col.unit, compact: true, cell: (visit) => unitName(visit.unit) },
  { label: internal.common.status, kind: "status", compact: true, cell: (visit) => <Status>{visitStatus(visit)}</Status> },
  { label: col.queuedAt, kind: "num", compact: true, cell: (visit) => visit.queuedAt },
  { label: col.inAt, kind: "num", compact: true, cell: (visit) => visit.inAt ?? "—" },
  { label: col.outAt, kind: "num", compact: true, cell: (visit) => visit.outAt ?? "—" },
  { label: col.wait, kind: "num", compact: true, cell: (visit) => formatMinutes(waitMinutes(visit)) },
  { label: col.exam, kind: "num", compact: true, cell: (visit) => formatMinutes(examMinutes(visit)) },
];

/** Small per-unit table for the upper areas (real table at every width: 3 rows stay readable on phones). */
function UnitTable({ caption, headers, rows, current }: {
  caption: string; headers: readonly string[]; rows: { code: ServiceCode; cells: string[] }[]; current: Filter;
}) {
  return <table className="wl-mini">
    <caption className="sr-only">{caption}</caption>
    <thead><tr><th scope="col">{copy.unit}</th>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
    <tbody>{rows.map((row) =>
      <tr key={row.code} data-selected={current === row.code || undefined}>
        <th scope="row">{unitName(row.code)}</th>
        {row.cells.map((cell, index) => <td key={headers[index]} className="tabular">{cell}</td>)}
      </tr>)}</tbody>
  </table>;
}

export function StaffWorklist() {
  const [filter, setFilter] = useState<Filter>("");
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase("id");
  const searched = visits.filter((visit) => `${patientByQueue(visit.queue)?.name ?? ""} ${visit.queue}`.toLocaleLowerCase("id").includes(query));
  const rows = searched.filter((visit) => !filter || visit.unit === filter);
  const finished = finishedPatients().length;
  const reRegistered = patients.filter((item) => item.reRegistered).length;
  const perUnit = serviceCodes.map((code) => ({ code, list: visits.filter((visit) => visit.unit === code) }));

  return <>
    <Block id="lead" energy={3} className="wl-upper">
      <SummaryBox title={copy.today.title} action={<span className="ws-hint tabular">{dateLabel(SAMPLE_TODAY.iso)}</span>}>
        <dl className="wl-today">
          <div><dt>{copy.today.rows.waiting}</dt><dd className="tabular">{patients.length - reRegistered}</dd></div>
          <div><dt>{copy.today.rows.inExam}</dt><dd className="tabular">{reRegistered - finished}</dd></div>
          <div><dt>{copy.today.rows.finished}</dt><dd className="tabular">{finished}</dd></div>
        </dl>
        <div className="wl-visits">
          <h3 id="wl-visits">{copy.today.visits}</h3>
          <dl aria-labelledby="wl-visits">
            {visitStatuses.map((status) => <div key={status}><dt>{status}</dt><dd className="tabular">{countBy(visits, status)}</dd></div>)}
          </dl>
        </div>
      </SummaryBox>
      <SummaryBox title={copy.unitStatus.title}>
        <UnitTable caption={copy.unitStatus.title} current={filter} headers={copy.unitStatus.headers}
          rows={perUnit.map(({ code, list }) => ({ code, cells: [
            list.find((visit) => visitStatus(visit) === "Diperiksa")?.queue ?? "—",
            String(countBy(list, "Menunggu")),
            String(countBy(list, "Selesai")),
          ] }))} />
      </SummaryBox>
      <SummaryBox title={copy.averages.title}>
        <UnitTable caption={copy.averages.caption} current={filter} headers={copy.averages.headers}
          rows={perUnit.map(({ code, list }) => ({ code, cells: [
            minutesCell(averageOf(list, waitMinutes)),
            minutesCell(averageOf(list, examMinutes)),
          ] }))} />
      </SummaryBox>
    </Block>
    <Block id="main" energy={4} protect="fluid" className="wl-main">
      <WorkPanel id="worklist" title={copy.list.title} tools={
        <TableFilters search={search} onSearch={setSearch} placeholder={internal.common.table.searchWorklist}
          status={filter} onStatus={setFilter} filterLabel={copy.list.filter} count={rows.length}
          options={[
            { value: "", label: copy.list.allUnits, count: searched.length },
            ...serviceCodes.map((code) => ({ value: code, label: services[code].unit, count: searched.filter((visit) => visit.unit === code).length })),
          ]}
          onReset={() => { setSearch(""); setFilter(""); }} />}>
        <RecordTable labelledBy="worklist" rows={rows} columns={columns} rowKey={(visit) => `${visit.queue}-${visit.unit}`}
          empty={search || filter ? internal.common.table.noMatch : copy.list.empty} bounded />
      </WorkPanel>
    </Block>
  </>;
}
