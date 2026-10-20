"use client";

// /unit-doctor/presence — Status kehadiran. Composition "work-hero" like Antrian unit: the presence card with
// "Ubah Kehadiran" is the lead (left from c2); today's check-in log from the button presses is the main table.
import { useState } from "react";
import { Block, SummaryBox } from "@/components/frame";
import { Actions, type Column, type Message, Notice, RecordTable, Rows, Status, WorkPanel } from "@/components/roles/kit";
import { internal } from "@/content";
import { MY_ROOM, MY_UNIT, clockNow, services } from "@/lib/mock-records";

type Entry = { id: number; inAt: string; outAt?: string };
const copy = internal["unit-doctor"].presence;
const columns: Column<Entry>[] = [
  { label: copy.log.columns.inAt, kind: "title", cell: (entry) => <span className="tabular">{entry.inAt}</span> },
  { label: copy.log.columns.outAt, kind: "num", cell: (entry) => entry.outAt ?? "—" },
];

export function UnitDoctorPresence() {
  const [log, setLog] = useState<Entry[]>([]);
  const [message, setMessage] = useState<Message>(null);
  const open = log.find((entry) => !entry.outAt);
  const unit = services[MY_UNIT];

  return <>
    <Block id="lead" energy={4} as="section" className="ws-hero" label={copy.card}>
      <SummaryBox title={copy.card}>
        <Rows items={[[copy.rows.unit, unit.unit], [copy.rows.room, MY_ROOM], [copy.rows.status, <Status key="s">{open ? copy.on : copy.off}</Status>], [copy.rows.since, open?.inAt ?? "—"]]} />
      </SummaryBox>
      <Notice message={message} />
      <Actions>
        <button type="button" className="primary-button" onClick={() => {
          const time = clockNow();
          setLog(open ? log.map((entry) => (entry === open ? { ...entry, outAt: time } : entry)) : [...log, { id: log.length + 1, inAt: time }]);
          setMessage({ tone: "info", text: copy.changed });
        }}>{copy.change}</button>
      </Actions>
    </Block>
    <Block id="main" energy={3} protect="fluid">
      <WorkPanel id="presence-log" title={copy.log.title}>
        <RecordTable labelledBy="presence-log" rows={log} columns={columns} rowKey={(entry) => String(entry.id)} empty={copy.log.empty} />
      </WorkPanel>
    </Block>
  </>;
}
