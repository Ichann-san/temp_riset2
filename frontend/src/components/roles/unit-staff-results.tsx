"use client";

// /unit-staff/results — Input hasil. One work panel: status filter with counts + finished examinations of this unit
// with "Input Data"; the template placeholder + temporary text field with "Kirim" to the unit doctor (DetailPane).
import { useState } from "react";
import { Block, Field } from "@/components/frame";
import {
  Actions, type Column, DetailEmpty, DetailHead, type Message, Notice, Placeholder, RecordTable, RowAction, Rows, Status, StatusFilter,
  Toolbar, WorkPanel, countOptions,
} from "@/components/roles/kit";
import { DetailPane } from "@/components/roles/detail-pane";
import { useSelection } from "@/components/roles/selection";
import { internal, site } from "@/content";
import { MY_UNIT, type ResultStatus, type UnitResult, patientByQueue, services, unitResults, visits } from "@/lib/mock-records";

type Row = UnitResult & { text: string };
const statuses: readonly ResultStatus[] = ["Menunggu input", "Menunggu verifikasi", "Terverifikasi"];
const copy = internal["unit-staff"].results;
const common = internal.common;

export function UnitStaffResults() {
  const unit = services[MY_UNIT];
  const [rows, setRows] = useState<Row[]>(() => unitResults.filter((result) => result.unit === MY_UNIT).map((result) => ({ ...result, text: "" })));
  const [filter, setFilter] = useState<ResultStatus | "">("");
  const { selected, select, headingRef, sheet, closeSheet } = useSelection(rows.find((row) => row.status === "Menunggu input")?.queue ?? null);
  const [message, setMessage] = useState<Message>(null);
  const [textError, setTextError] = useState(false);
  const current = rows.find((row) => row.queue === selected) ?? null;
  const person = current ? patientByQueue(current.queue) : undefined;
  const visit = current ? visits.find((item) => item.queue === current.queue && item.unit === MY_UNIT) : undefined;
  const shown = rows.filter((row) => !filter || row.status === filter);

  const open = (queue: string) => { setMessage(null); setTextError(false); select(queue); };
  const update = (patch: Partial<Row>) => setRows((all) => all.map((row) => (row.queue === selected ? { ...row, ...patch } : row)));
  const col = copy.list.columns;
  const columns: Column<Row>[] = [
    { label: col.queue, kind: "title", cell: (row) => <span className="tabular">{row.queue}</span> },
    { label: col.patient, cell: (row) => patientByQueue(row.queue)?.name ?? "—" },
    { label: col.exam, compact: true, cell: () => unit.name },
    { label: col.revision, kind: "num", compact: true, cell: (row) => row.revision || "—" },
    { label: common.status, kind: "status", cell: (row) => <Status>{row.status}</Status> },
    { label: common.action, kind: "action", cell: (row) => {
      const input = row.status === "Menunggu input";
      return <RowAction label={copy.list.actionLabel(input, row.queue)} current={row.queue === selected} onClick={() => open(row.queue)}>{input ? copy.list.input : common.actions.view}</RowAction>;
    } },
  ];
  const rowsCopy = copy.detail.rows;

  return <>
    <Block id="main" energy={4} protect="fluid">
      <WorkPanel id="exams" title={copy.list.title} description={`${unit.unit} · ${copy.list.description}`}
        tools={<Toolbar><StatusFilter legend={common.statusFilter} name="result-status" value={filter} onChange={setFilter}
          options={countOptions(rows, statuses, (row) => row.status, common.all)} /></Toolbar>}>
        <RecordTable labelledBy="exams" rows={shown} columns={columns} rowKey={(row) => row.queue} selected={selected} empty={copy.list.empty} bounded />
      </WorkPanel>
    </Block>
    <DetailPane label={copy.detail.label} open={sheet} onClose={closeSheet}>
      {!current || !person ? <DetailEmpty headingRef={headingRef} title={copy.detail.label} hint={copy.detail.emptyHint} /> : <>
        <DetailHead headingRef={headingRef} title={`${current.queue} · ${person.name}`} status={current.status} />
        <Rows items={[[rowsCopy.exam, unit.name], [rowsCopy.inAt, visit?.inAt ?? "—"], [rowsCopy.outAt, visit?.outAt ?? "—"], [rowsCopy.revision, current.revision || "—"]]} />
        <Placeholder title={copy.detail.template(unit.name)}>{copy.detail.templateNote}</Placeholder>
        {current.status === "Menunggu input" ? <form className="ws-form" noValidate onSubmit={(event) => {
          event.preventDefault();
          if (!current.text.trim()) { setTextError(true); setMessage({ tone: "error", text: site.messages.required }); return; }
          update({ status: "Menunggu verifikasi", revision: current.revision + 1 }); setTextError(false);
          setMessage({ tone: "info", text: copy.messages.sent });
        }}>
          <Field label={copy.detail.result} hint={common.temporaryField}>
            <textarea className="field" name="result" rows={4} value={current.text} aria-invalid={textError || undefined}
              onChange={(event) => { setTextError(false); update({ text: event.target.value }); }} />
          </Field>
          <Notice message={message} />
          <Actions><button type="submit" className="primary-button">{common.actions.send}</button></Actions>
        </form> : <>
          <Notice message={message} />
          <Actions><button type="button" className="primary-button" disabled>{copy.detail.sent}</button></Actions>
        </>}
      </>}
    </DetailPane>
  </>;
}
