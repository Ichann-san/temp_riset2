// /clinician/collective — Pendaftaran kolektif. Batches table (main) and the new-batch form (aside). Collective
// registration is deferred (owner decision 18 Oktober 2026): the form keeps its fields so the function stays visible,
// but it is disabled and marked "Belum tersedia"; nothing is recorded.
import { Block, Field } from "@/components/frame";
import { Actions, type Column, RecordTable, Status, WorkPanel, dateLabel } from "@/components/roles/kit";
import { internal } from "@/content";
import { type Batch, batches } from "@/lib/mock-records";

const copy = internal.clinician.collective;
const columns: Column<Batch>[] = [
  { label: copy.list.columns.batch, kind: "title", cell: (batch) => batch.id },
  { label: copy.list.columns.date, compact: true, cell: (batch) => dateLabel(batch.date) },
  { label: copy.list.columns.count, kind: "num", compact: true, cell: (batch) => batch.count },
  { label: internal.common.status, kind: "status", compact: true, cell: (batch) => <Status>{batch.status}</Status> },
];

export function ClinicianCollective() {
  return <>
    <Block id="main" energy={4} protect="fluid">
      <WorkPanel id="batches" title={copy.list.title}>
        <RecordTable labelledBy="batches" rows={batches} columns={columns} rowKey={(batch) => batch.id} empty={copy.list.empty} bounded />
      </WorkPanel>
    </Block>
    <Block id="aside" as="aside" energy={3} protect="measure" label={copy.form.title} className="ws-detail">
      <form className="ws-form" aria-labelledby="collective-form" aria-describedby="collective-unavailable">
        <div className="ws-detail-head"><h2 id="collective-form">{copy.form.title}</h2><span id="collective-unavailable"><Status>{internal.common.unavailable}</Status></span></div>
        <fieldset className="ws-fieldset" disabled>
          <Field label={copy.form.date}><input className="field" type="date" name="date" /></Field>
          <Field label={copy.form.count}><input className="field" type="number" name="count" min={1} inputMode="numeric" /></Field>
          <Field label={copy.form.file}><input className="field" type="file" name="csv" accept=".csv,text/csv" /></Field>
          <Actions><button type="submit" className="primary-button">{internal.common.actions.send}</button></Actions>
        </fieldset>
      </form>
    </Block>
  </>;
}
