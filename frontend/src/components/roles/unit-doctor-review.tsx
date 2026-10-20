"use client";

// /unit-doctor/review — Verifikasi hasil unit (verify, view result, confirm fee). One work panel: status filter with
// counts + results sent by unit staff with "Lihat hasil"; result placeholder, fee field and "Verifikasi" with the PRD
// warnings (mismatch, fee 0) as an inline confirmation (DetailPane, beside the table from c2).
import { useState } from "react";
import { Alert, Block, Field } from "@/components/frame";
import {
  Actions, type Column, DetailEmpty, DetailHead, type Message, Notice, Placeholder, RecordTable, RowAction, Rows, Status, StatusFilter,
  Toolbar, WorkPanel, countOptions,
} from "@/components/roles/kit";
import { DetailPane } from "@/components/roles/detail-pane";
import { useSelection } from "@/components/roles/selection";
import { internal, site } from "@/content";
import { MY_UNIT, type ResultStatus, type UnitResult, packageLabel, patientByQueue, rupiah, services, unitResults, wireframePrice } from "@/lib/mock-records";

type Row = UnitResult & { fee: string };
type Confirm = "mismatch" | "zero" | null;
const statuses: readonly ResultStatus[] = ["Menunggu verifikasi", "Terverifikasi"];
const copy = internal["unit-doctor"].review;
const common = internal.common;

export function UnitDoctorReview() {
  const unit = services[MY_UNIT];
  const [rows, setRows] = useState<Row[]>(() => unitResults.filter((result) => result.unit === MY_UNIT && result.status !== "Menunggu input")
    .map((result) => ({ ...result, fee: String(wireframePrice[MY_UNIT]) })));
  const [filter, setFilter] = useState<ResultStatus | "">("");
  const { selected, select, headingRef, sheet, closeSheet } = useSelection(rows.find((row) => row.status === "Menunggu verifikasi")?.queue ?? null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [message, setMessage] = useState<Message>(null);
  const current = rows.find((row) => row.queue === selected) ?? null;
  const person = current ? patientByQueue(current.queue) : undefined;
  const shown = rows.filter((row) => !filter || row.status === filter);

  const open = (queue: string) => { setMessage(null); setConfirm(null); select(queue); };
  const update = (patch: Partial<Row>) => setRows((all) => all.map((row) => (row.queue === selected ? { ...row, ...patch } : row)));
  // Order of checks: data mismatch warning, then fee 0 warning; each needs an explicit "Ya".
  const proceed = (from: Confirm) => {
    if (!current) return;
    const fee = Number(current.fee);
    if (current.fee.trim() === "" || !Number.isFinite(fee) || fee < 0) { setConfirm(null); setMessage({ tone: "error", text: site.messages.invalid }); return; }
    if (from === null && current.mismatch) { setMessage(null); setConfirm("mismatch"); return; }
    if (from !== "zero" && fee === 0) { setMessage(null); setConfirm("zero"); return; }
    update({ status: "Terverifikasi" }); setConfirm(null);
    setMessage({ tone: "info", text: copy.messages.verified(rupiah(fee)) });
  };
  const col = copy.list.columns;
  const columns: Column<Row>[] = [
    { label: col.queue, kind: "title", cell: (row) => <span className="tabular">{row.queue}</span> },
    { label: col.patient, cell: (row) => patientByQueue(row.queue)?.name ?? "—" },
    { label: col.exam, compact: true, cell: () => unit.name },
    { label: col.revision, kind: "num", compact: true, cell: (row) => row.revision },
    { label: common.status, kind: "status", cell: (row) => <Status>{row.status}</Status> },
    { label: common.action, kind: "action", cell: (row) => <RowAction label={copy.list.viewLabel(row.queue)} current={row.queue === selected} onClick={() => open(row.queue)}>{copy.list.view}</RowAction> },
  ];
  const pending = current?.status === "Menunggu verifikasi";

  return <>
    <Block id="main" energy={4} protect="fluid">
      <WorkPanel id="unit-results" title={copy.list.title} description={`${unit.unit} · ${copy.list.description}`}
        tools={<Toolbar><StatusFilter legend={common.statusFilter} name="unit-result-status" value={filter} onChange={setFilter}
          options={countOptions(rows, statuses, (row) => row.status, common.all)} /></Toolbar>}>
        <RecordTable labelledBy="unit-results" rows={shown} columns={columns} rowKey={(row) => row.queue} selected={selected} empty={copy.list.empty} bounded />
      </WorkPanel>
    </Block>
    <DetailPane label={copy.detail.label} open={sheet} onClose={closeSheet}>
      {!current || !person ? <DetailEmpty headingRef={headingRef} title={copy.detail.label} hint={copy.detail.emptyHint} /> : <>
        <DetailHead headingRef={headingRef} title={`${current.queue} · ${person.name}`} status={current.status} />
        <Rows items={[[copy.detail.rows.exam, unit.name], [copy.detail.rows.package, packageLabel(person)], [copy.detail.rows.revision, current.revision]]} />
        <Placeholder title={copy.detail.result(unit.name)}>{copy.detail.resultNote}</Placeholder>
        <form className="ws-form" noValidate onSubmit={(event) => { event.preventDefault(); proceed(null); }}>
          <Field label={copy.detail.fee}>
            <input className="field tabular" name="fee" type="number" min={0} inputMode="numeric" value={current.fee} disabled={!pending}
              onChange={(event) => { setConfirm(null); update({ fee: event.target.value }); }} />
          </Field>
          {confirm === "mismatch" && <Alert tone="warn">{common.mismatch}</Alert>}
          {confirm === "zero" && <Alert tone="warn">{copy.detail.zeroFee}</Alert>}
          <Notice message={message} />
          <Actions split={!!confirm}>
            {!pending ? <button type="button" className="primary-button" disabled>{common.actions.verified}</button>
              : confirm ? <>
                <button type="button" className="secondary-button" onClick={() => setConfirm(null)}>{common.actions.cancel}</button>
                <button type="button" className="primary-button" onClick={() => proceed(confirm)}>{common.actions.proceed}</button>
              </> : <button type="submit" className="primary-button">{common.actions.verify}</button>}
          </Actions>
        </form>
      </>}
    </DetailPane>
  </>;
}
