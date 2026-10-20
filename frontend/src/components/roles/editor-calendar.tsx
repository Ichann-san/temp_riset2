"use client";

// /editor/calendar — Waktu kerja dan kuota. The rules are one hint line under the panel heading; service dates table
// with "Ubah" (main); edit form in the DetailPane. PRD rule kept: change only dates at least 2 days ahead. Capacity per
// date is 100 main places + 50 waiting places; whether and how the editor may change it is still open, so the quota is
// shown read-only with a neutral hint (no invented rule).
import { useState } from "react";
import { Alert, Block, Field, SelectField } from "@/components/frame";
import { Actions, type Column, DetailEmpty, DetailHead, type Message, Notice, RecordTable, RowAction, Status, WorkPanel } from "@/components/roles/kit";
import { DetailPane } from "@/components/roles/detail-pane";
import { useSelection } from "@/components/roles/selection";
import { internal } from "@/content";
import { MAIN_PLACES, SAMPLE_TODAY, type ServiceDay, WAITING_PLACES, daysFromToday, serviceDays } from "@/lib/mock-records";

const copy = internal.editor.calendar;
const common = internal.common;
const statusOf = (open: boolean) => (open ? copy.list.open : copy.list.closed);

export function EditorCalendar() {
  const [days, setDays] = useState<ServiceDay[]>(serviceDays);
  const { selected, select, headingRef, sheet, closeSheet } = useSelection(serviceDays.find((day) => daysFromToday(day.iso) >= 2)?.iso ?? null);
  const current = days.find((day) => day.iso === selected) ?? null;
  const [open, setOpen] = useState(current?.open ?? true);
  const [message, setMessage] = useState<Message>(null);
  const editable = current ? daysFromToday(current.iso) >= 2 : false;

  const choose = (day: ServiceDay) => { setMessage(null); setOpen(day.open); select(day.iso); };
  const columns: Column<ServiceDay>[] = [
    { label: copy.list.columns.date, kind: "title", cell: (day) => day.label },
    { label: common.status, kind: "status", compact: true, cell: (day) => <Status>{statusOf(day.open)}</Status> },
    { label: copy.list.columns.registered, kind: "num", compact: true, cell: (day) => (day.open ? day.registered : "—") },
    { label: common.action, kind: "action", cell: (day) => <RowAction label={copy.list.editLabel(day.label)} current={day.iso === selected} onClick={() => choose(day)}>{common.actions.edit}</RowAction> },
  ];

  return <>
    <Block id="main" energy={4} protect="fluid">
      <WorkPanel id="days" title={copy.list.title} description={copy.list.rules(SAMPLE_TODAY.label, MAIN_PLACES, WAITING_PLACES)}>
        <RecordTable labelledBy="days" rows={days} columns={columns} rowKey={(day) => day.iso} selected={selected} empty={copy.list.empty} bounded />
      </WorkPanel>
    </Block>
    <DetailPane label={copy.detail.label} open={sheet} onClose={closeSheet}>
      {!current ? <DetailEmpty headingRef={headingRef} title={copy.detail.label} hint={copy.detail.emptyHint} /> : <form className="ws-form" noValidate onSubmit={(event) => {
        event.preventDefault();
        if (!editable) { setMessage({ tone: "error", text: copy.detail.tooSoonError }); return; }
        setDays(days.map((day) => (day.iso === current.iso ? { ...day, open } : day)));
        setMessage({ tone: "info", text: copy.messages.saved(current.label) });
      }}>
        <DetailHead headingRef={headingRef} title={current.label} status={statusOf(current.open)} />
        {!editable && <Alert tone="warn">{copy.detail.tooSoon}</Alert>}
        <Field label={copy.detail.status}>
          <SelectField name="open" value={open ? "open" : "closed"} disabled={!editable} onChange={(event) => setOpen(event.target.value === "open")}>
            <option value="open">{copy.list.open}</option><option value="closed">{copy.list.closed}</option>
          </SelectField>
        </Field>
        <Field label={copy.detail.quota} hint={copy.detail.quotaHint}>
          <textarea className="field tabular" name="quota" value={copy.detail.quotaValue(MAIN_PLACES, WAITING_PLACES)} rows={2} readOnly disabled />
        </Field>
        <Notice message={message} />
        <Actions><button type="submit" className="primary-button" disabled={!editable}>{copy.detail.save}</button></Actions>
      </form>}
    </DetailPane>
  </>;
}
