"use client";

// /clinician/review — Verifikasi hasil MCU (verify, view draft, send). One work panel: status filter with counts +
// drafts table with "Lihat"; draft detail with "Verifikasi", then "Kirim" in the DetailPane (beside the table from c2).
import { useState } from "react";
import { Alert, Block, SummaryBox } from "@/components/frame";
import {
  Actions, type Column, DetailEmpty, DetailHead, type Message, Notice, Placeholder, RecordTable, RowAction, Rows, Status,
  WorkPanel, countOptions,
} from "@/components/roles/kit";
import { TableFilters } from "@/components/table-filters";
import { DetailPane } from "@/components/roles/detail-pane";
import { useSelection } from "@/components/roles/selection";
import { internal, site } from "@/content";
import { type DraftStatus, type McuDraft, mcuDrafts, packageLabel, patientByQueue, services, unitChecks } from "@/lib/mock-records";

const statuses: readonly DraftStatus[] = ["Menunggu verifikasi akhir", "Menunggu verifikasi unit", "Terverifikasi", "Terkirim"];
const copy = internal.clinician.review;
const common = internal.common;
const nameOf = (draft: McuDraft) => patientByQueue(draft.queue)?.name ?? draft.queue;

const completeness = (queue: string) => {
  const checks = unitChecks(queue);
  return copy.list.completeness(checks.filter((check) => check.status === "Terverifikasi").length, checks.length);
};

export function ClinicianReview() {
  const [drafts, setDrafts] = useState<McuDraft[]>(mcuDrafts);
  const [filter, setFilter] = useState<DraftStatus | "">("");
  const [search, setSearch] = useState("");
  const { selected, select, headingRef, sheet, closeSheet } = useSelection(mcuDrafts.find((draft) => draft.status === "Menunggu verifikasi akhir")?.queue ?? null);
  const [message, setMessage] = useState<Message>(null);
  const [confirming, setConfirming] = useState(false);
  const query = search.trim().toLocaleLowerCase("id");
  const searched = drafts.filter((draft) => `${nameOf(draft)} ${draft.queue}`.toLocaleLowerCase("id").includes(query));
  const shown = searched.filter((draft) => !filter || draft.status === filter);
  const current = shown.find((draft) => draft.queue === selected) ?? null;
  const person = current ? patientByQueue(current.queue) : undefined;
  const changeSearch = (value: string) => { setSearch(value); setMessage(null); setConfirming(false); closeSheet(); };
  const changeFilter = (value: DraftStatus | "") => { setFilter(value); setMessage(null); setConfirming(false); closeSheet(); };

  const open = (queue: string) => { setMessage(null); setConfirming(false); select(queue); };
  const setStatus = (status: DraftStatus) => setDrafts((all) => all.map((draft) => (draft.queue === selected ? { ...draft, status } : draft)));
  const verify = () => { setStatus("Terverifikasi"); setConfirming(false); setMessage({ tone: "info", text: copy.messages.verified }); };
  const send = () => {
    if (!current?.whatsappFound) { setMessage({ tone: "error", text: site.messages.whatsappMissing }); return; }
    setStatus("Terkirim"); setMessage({ tone: "info", text: copy.messages.sent });
  };

  const columns: Column<McuDraft>[] = [
    { label: copy.list.columns.patient, kind: "title", cell: nameOf },
    { label: copy.list.columns.queue, kind: "num", compact: true, cell: (draft) => draft.queue },
    { label: copy.list.columns.completeness, kind: "num", compact: true, cell: (draft) => completeness(draft.queue) },
    { label: common.status, kind: "status", cell: (draft) => <Status>{draft.status}</Status> },
    { label: common.action, kind: "action", cell: (draft) => <RowAction label={copy.list.viewLabel(nameOf(draft))} current={draft.queue === selected} onClick={() => open(draft.queue)}>{common.actions.view}</RowAction> },
  ];

  return <>
    <Block id="main" energy={4} protect="fluid">
      <WorkPanel id="drafts" title={copy.list.title} description={copy.list.description}
        tools={<TableFilters search={search} onSearch={changeSearch} placeholder={common.table.searchDrafts}
          status={filter} onStatus={changeFilter} options={countOptions(searched, statuses, (draft) => draft.status, common.all)} count={shown.length}
          onReset={() => { changeSearch(""); changeFilter(""); }} />}>
        <RecordTable labelledBy="drafts" rows={shown} columns={columns} rowKey={(draft) => draft.queue} selected={selected}
          empty={drafts.length ? common.table.noMatch : copy.list.empty} bounded />
      </WorkPanel>
    </Block>
    <DetailPane label={copy.detail.label} open={sheet} onClose={closeSheet}>
      {!current || !person ? <DetailEmpty headingRef={headingRef} title={copy.detail.emptyTitle} hint={copy.detail.emptyHint} /> : <>
        <DetailHead headingRef={headingRef} title={person.name} status={current.status} />
        <Rows items={[[copy.detail.rows.booking, person.booking], [copy.detail.rows.queue, person.queue], [copy.detail.rows.package, packageLabel(person)], [copy.detail.rows.whatsapp, person.phone]]} />
        <SummaryBox title={copy.detail.unitChecks}>
          <ul className="lines">{unitChecks(person.queue).map((check) =>
            <li key={check.unit}><span>{services[check.unit].unit}</span><Status>{check.status}</Status></li>)}</ul>
        </SummaryBox>
        <Placeholder title={copy.detail.draft}>{copy.detail.draftNote}</Placeholder>
        {confirming && <Alert tone="warn">{common.mismatch}</Alert>}
        <Notice message={message} />
        {current.status === "Menunggu verifikasi unit" && <p className="ws-hint">{copy.detail.waitingUnit}</p>}
        <Actions split={confirming}>
          {current.status === "Menunggu verifikasi unit" && <button type="button" className="primary-button" disabled>{common.actions.verify}</button>}
          {current.status === "Menunggu verifikasi akhir" && (confirming ? <>
            <button type="button" className="secondary-button" onClick={() => setConfirming(false)}>{common.actions.cancel}</button>
            <button type="button" className="primary-button" onClick={verify}>{common.actions.confirmVerify}</button>
          </> : <button type="button" className="primary-button" onClick={() => { if (!current.mismatch) { verify(); return; } setMessage(null); setConfirming(true); }}>{common.actions.verify}</button>)}
          {current.status === "Terverifikasi" && <button type="button" className="primary-button" onClick={send}>{common.actions.send}</button>}
          {current.status === "Terkirim" && <button type="button" className="primary-button" disabled>{common.actions.sent}</button>}
        </Actions>
      </>}
    </DetailPane>
  </>;
}
