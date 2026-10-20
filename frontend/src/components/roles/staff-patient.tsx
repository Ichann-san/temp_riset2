"use client";

// /staff/patient — Daftar ulang (validate re-registration, edit registration data). One work panel: search by booking
// number + status filter (with counts) + bookings table; the booking detail with "Ubah" and "Verifikasi" sits in a
// DetailPane (beside the table on wide screens, sheet on narrower ones). Tambah pasien (walk-in registration) is
// deferred: its entry point stays visible but disabled and marked "Belum tersedia"; it never creates a record.
import { useState } from "react";
import { Alert, Block, Field, Icon, SummaryBox } from "@/components/frame";
import { type IdentityKey, type IdentityValues, IdentityFields, checkIdentity } from "@/components/roles/identity";
import {
  Actions, type Column, DetailEmpty, DetailHead, type Message, Notice, RecordTable, RowAction, Rows, Status, StatusFilter, Toolbar,
  WorkPanel, countOptions,
} from "@/components/roles/kit";
import { DetailPane } from "@/components/roles/detail-pane";
import { useSelection } from "@/components/roles/selection";
import { internal, site } from "@/content";
import { maskNikTail } from "@/lib/format";
import { identityLabels } from "@/lib/identity-meta";
import { type Patient, costLines, packageLabel, patients, rupiah } from "@/lib/mock-records";

const statuses = ["Menunggu daftar ulang", "Terverifikasi"] as const;
type RowStatus = (typeof statuses)[number];
type Row = Patient & { status: RowStatus };

const copy = internal.staff.patient;
const common = internal.common;
const toValues = (row: Row): IdentityValues => ({ name: row.name, nik: row.nik, birthDate: row.birthDate, addressKtp: row.addressKtp, addressHome: row.addressHome, phone: row.phone, gender: row.gender, occupation: row.occupation });

export function StaffPatient() {
  const [rows, setRows] = useState<Row[]>(() => patients.map((item) => ({ ...item, status: item.reRegistered ? "Terverifikasi" : "Menunggu daftar ulang" })));
  const [filter, setFilter] = useState<RowStatus | "">("Menunggu daftar ulang");
  const { selected, select, headingRef, sheet, closeSheet } = useSelection(null);
  const [query, setQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ values: IdentityValues; invalid: IdentityKey[]; error: string | null } | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const current = rows.find((row) => row.booking === selected) ?? null;
  const shown = rows.filter((row) => !filter || row.status === filter);

  const open = (booking: string) => { setEdit(null); setMessage(null); select(booking); };
  const update = (patch: Partial<Row>) => setRows((all) => all.map((row) => (row.booking === selected ? { ...row, ...patch } : row)));

  const columns: Column<Row>[] = [
    { label: copy.list.columns.booking, kind: "title", cell: (row) => row.booking },
    { label: copy.list.columns.name, cell: (row) => row.name },
    { label: copy.list.columns.package, compact: true, cell: packageLabel },
    { label: common.status, kind: "status", compact: true, cell: (row) => <Status>{row.status}</Status> },
    { label: common.action, kind: "action", cell: (row) => <RowAction label={copy.list.viewLabel(row.booking)} current={row.booking === selected} onClick={() => open(row.booking)}>{common.actions.view}</RowAction> },
  ];
  const cost = current ? costLines(current) : null;

  return <>
    <Block id="main" energy={4} protect="fluid">
      <WorkPanel id="booking-list" title={copy.list.title}
        actions={<div className="ws-unavailable">
          <button type="button" className="secondary-button" disabled aria-describedby="add-patient-note"><Icon name="plus" size={20} />{copy.addPatient}</button>
          <small id="add-patient-note">{common.unavailable}</small>
        </div>}
        tools={<Toolbar>
          <form className="ws-search" noValidate onSubmit={(event) => {
            event.preventDefault();
            const value = query.trim().toUpperCase();
            if (!value) { setSearchError(site.messages.required); return; }
            const found = rows.find((row) => row.booking === value);
            if (!found) { setSearchError(copy.list.notFound); return; }
            setSearchError(null); open(found.booking);
          }}>
            <Field label={copy.list.searchLabel} error={searchError ?? undefined}>
              <input className="field" name="booking" placeholder={copy.list.searchPlaceholder} value={query} autoComplete="off" aria-invalid={searchError ? true : undefined} onChange={(event) => setQuery(event.target.value)} />
            </Field>
            <button type="submit" className="primary-button">{common.actions.search}</button>
          </form>
          <StatusFilter legend={common.statusFilter} name="booking-status" value={filter} onChange={setFilter}
            options={countOptions(rows, statuses, (row) => row.status, common.all)} />
        </Toolbar>}>
        <RecordTable labelledBy="booking-list" rows={shown} columns={columns} rowKey={(row) => row.booking} selected={selected} empty={copy.list.empty} bounded />
      </WorkPanel>
    </Block>
    <DetailPane label={copy.detail.label} open={sheet} onClose={closeSheet}>
      {!current || !cost ? <DetailEmpty headingRef={headingRef} title={copy.detail.label} hint={copy.detail.emptyHint} /> : <>
        <DetailHead headingRef={headingRef} title={`${current.booking} · ${current.name}`} status={current.status} />
        {edit ? <form className="ws-form" noValidate aria-label={copy.detail.editTitle} onSubmit={(event) => {
          event.preventDefault();
          const problem = checkIdentity(edit.values);
          if (problem) { setEdit({ ...edit, invalid: problem.invalid, error: problem.message }); return; }
          update({ ...edit.values, nik: edit.values.nik.trim() }); setEdit(null);
          setMessage({ tone: "info", text: copy.messages.edited });
        }}>
          <h3>{copy.detail.editTitle}</h3>
          {edit.error && <Alert tone="error">{edit.error}</Alert>}
          <IdentityFields idPrefix="edit" values={edit.values} invalid={edit.invalid}
            onChange={(key, value) => setEdit({ ...edit, values: { ...edit.values, [key]: value }, invalid: edit.invalid.filter((item) => item !== key) })} />
          <Actions split>
            <button type="button" className="secondary-button" onClick={() => setEdit(null)}>{common.actions.cancel}</button>
            <button type="submit" className="primary-button">{common.actions.save}</button>
          </Actions>
        </form> : <SummaryBox title={copy.detail.identity} action={<button type="button" className="text-button" onClick={() => { setMessage(null); setEdit({ values: toValues(current), invalid: [], error: null }); }}>{common.actions.edit}</button>}>
          <Rows items={[
            [identityLabels.name, current.name], [identityLabels.nik, <span key="nik" className="tabular">{maskNikTail(current.nik)}</span>], [identityLabels.birthDate, current.birthDate],
            [identityLabels.gender, current.gender], [identityLabels.addressKtp, current.addressKtp], [identityLabels.addressHome, current.addressHome],
            [identityLabels.phone, current.phone], [identityLabels.occupation, current.occupation], [copy.detail.rows.queue, <span key="q" className="tabular">{current.queue}</span>],
          ]} />
        </SummaryBox>}
        <SummaryBox title={copy.detail.cost}>
          <ul className="lines">{cost.lines.map((line) => <li key={line.label}><span>{line.label}</span><span className="tabular">{rupiah(line.price)}</span></li>)}</ul>
          <div className="total"><span>{copy.detail.total}</span><strong className="tabular">{rupiah(cost.total)}</strong></div>
          <p className="ws-hint">{copy.detail.priceNote}</p>
        </SummaryBox>
        <Notice message={message} />
        <Actions>
          <button type="button" className="primary-button" disabled={current.status === "Terverifikasi" || !!edit} onClick={() => {
            update({ status: "Terverifikasi" });
            setMessage({ tone: "info", text: copy.messages.verified });
          }}>{current.status === "Terverifikasi" ? common.actions.verified : common.actions.verify}</button>
        </Actions>
      </>}
    </DetailPane>
  </>;
}
