"use client";

// Antrian unit (view the unit queue; Masuk/Keluar for unit staff). Composition "work-hero": the number being served is
// the lead card (left from c2, with "Keluar" under it); the waiting numbers are the main table ("Masuk"). After
// "Keluar" the unit staff gets a direct link to Input hasil.
import Link from "next/link";
import { useState } from "react";
import { BigNumberCard, Block } from "@/components/frame";
import { Actions, type Column, type Message, Notice, RecordTable, RowAction, Status, WorkPanel } from "@/components/roles/kit";
import { internal } from "@/content";
import { MY_UNIT, type Visit, clockNow, patientByQueue, services, visitStatus, visits } from "@/lib/mock-records";

const copy = internal.unitQueue;

export function UnitQueue({ canMove }: { canMove: boolean }) {
  const [rows, setRows] = useState<Visit[]>(() => visits.filter((visit) => visit.unit === MY_UNIT));
  const [message, setMessage] = useState<Message>(null);
  const serving = rows.find((visit) => visitStatus(visit) === "Diperiksa");
  const waiting = rows.filter((visit) => visitStatus(visit) === "Menunggu");
  const done = rows.filter((visit) => visitStatus(visit) === "Selesai").length;
  const unit = services[MY_UNIT];
  const patch = (queue: string, change: Partial<Visit>) => setRows((all) => all.map((visit) => (visit.queue === queue ? { ...visit, ...change } : visit)));

  const columns: Column<Visit>[] = [
    { label: copy.columns.queue, kind: "title", cell: (visit) => <span className="tabular">{visit.queue}</span> },
    { label: copy.columns.patient, cell: (visit) => patientByQueue(visit.queue)?.name ?? "—" },
    { label: copy.columns.exam, compact: true, cell: () => unit.name },
    { label: copy.columns.queuedAt, kind: "num", compact: true, cell: (visit) => visit.queuedAt },
    { label: internal.common.status, kind: "status", compact: true, cell: (visit) => <Status>{visitStatus(visit)}</Status> },
    ...(canMove ? [{ label: internal.common.action, kind: "action", cell: (visit: Visit) => <RowAction label={copy.inLabel(visit.queue)} disabled={!!serving} onClick={() => {
      patch(visit.queue, { inAt: clockNow() }); setMessage({ tone: "info", text: copy.messages.entered(visit.queue, unit.unit) });
    }}>{copy.in}</RowAction> } satisfies Column<Visit>] : []),
  ];

  return <>
    <Block id="lead" energy={4} as="section" className="ws-hero" label={copy.serving}>
      <p className="ws-hero-unit">{unit.unit}</p>
      <BigNumberCard label={copy.serving} value={serving?.queue ?? "—"}
        hint={serving ? copy.servingHint(patientByQueue(serving.queue)?.name ?? "", serving.inAt ?? "") : copy.noServing} />
      <p className="ws-hint">{copy.tally(waiting.length, done)}</p>
      <Notice message={message} />
      {canMove && <Actions>
        <button type="button" className="primary-button" disabled={!serving} onClick={() => {
          if (!serving) return;
          patch(serving.queue, { outAt: clockNow() });
          setMessage({ tone: "info", text: copy.messages.left(serving.queue, unit.unit),
            action: <Link className="secondary-button" href="/unit-staff/results">{copy.messages.inputResult}</Link> });
        }}>{serving ? copy.outNumber(serving.queue) : copy.out}</button>
      </Actions>}
    </Block>
    <Block id="main" energy={4} protect="fluid">
      <WorkPanel id="waiting" title={copy.waiting} description={canMove ? copy.staffHint : copy.doctorHint}>
        <RecordTable labelledBy="waiting" rows={waiting} columns={columns} rowKey={(visit) => visit.queue} empty={copy.empty} bounded />
      </WorkPanel>
    </Block>
  </>;
}
