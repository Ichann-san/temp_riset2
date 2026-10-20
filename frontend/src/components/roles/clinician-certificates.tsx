"use client";

// /clinician/certificates — Permohonan surat keterangan (view, create, send). One work panel: status filter with
// counts + requests table with "Lihat"; request detail + letter field with "Validasi dan Simpan", then "Kirim" (DetailPane).
import { useState } from "react";
import { Block, Field } from "@/components/frame";
import {
  Actions, type Column, DetailEmpty, DetailHead, type Message, Notice, Placeholder, RecordTable, RowAction, Rows, Status,
  WorkPanel, countOptions,
} from "@/components/roles/kit";
import { TableFilters } from "@/components/table-filters";
import { DetailPane } from "@/components/roles/detail-pane";
import { useSelection } from "@/components/roles/selection";
import { internal, site } from "@/content";
import { type CertificateRequest, type CertificateStatus, certificateRequests } from "@/lib/mock-records";

type Row = CertificateRequest & { letter: string };
const statuses: readonly CertificateStatus[] = ["Menunggu", "Tervalidasi", "Terkirim"];
const copy = internal.clinician.certificates;
const common = internal.common;

export function ClinicianCertificates() {
  const [rows, setRows] = useState<Row[]>(() => certificateRequests.map((request) => ({ ...request, letter: "" })));
  const [filter, setFilter] = useState<CertificateStatus | "">("");
  const [search, setSearch] = useState("");
  const { selected, select, headingRef, sheet, closeSheet } = useSelection(certificateRequests.find((request) => request.status === "Menunggu")?.id ?? null);
  const [message, setMessage] = useState<Message>(null);
  const [letterError, setLetterError] = useState(false);
  const query = search.trim().toLocaleLowerCase("id");
  const searched = rows.filter((row) => `${row.name} ${row.booking}`.toLocaleLowerCase("id").includes(query));
  const shown = searched.filter((row) => !filter || row.status === filter);
  const current = shown.find((row) => row.id === selected) ?? null;
  const changeSearch = (value: string) => { setSearch(value); setMessage(null); setLetterError(false); closeSheet(); };
  const changeFilter = (value: CertificateStatus | "") => { setFilter(value); setMessage(null); setLetterError(false); closeSheet(); };

  const open = (id: string) => { setMessage(null); setLetterError(false); select(id); };
  const update = (patch: Partial<Row>) => setRows((all) => all.map((row) => (row.id === selected ? { ...row, ...patch } : row)));
  const col = copy.list.columns;
  const columns: Column<Row>[] = [
    { label: col.name, kind: "title", cell: (row) => row.name },
    { label: col.booking, compact: true, cell: (row) => row.booking },
    { label: col.purpose, compact: true, cell: (row) => row.purpose },
    { label: common.status, kind: "status", compact: true, cell: (row) => <Status>{row.status}</Status> },
    { label: common.action, kind: "action", cell: (row) => <RowAction label={copy.list.viewLabel(row.name)} current={row.id === selected} onClick={() => open(row.id)}>{common.actions.view}</RowAction> },
  ];
  const rowsCopy = copy.detail.rows;

  return <>
    <Block id="main" energy={4} protect="fluid">
      <WorkPanel id="requests" title={copy.list.title}
        tools={<TableFilters search={search} onSearch={changeSearch} placeholder={common.table.searchCertificates}
          status={filter} onStatus={changeFilter} options={countOptions(searched, statuses, (row) => row.status, common.all)} count={shown.length}
          onReset={() => { changeSearch(""); changeFilter(""); }} />}>
        <RecordTable labelledBy="requests" rows={shown} columns={columns} rowKey={(row) => row.id} selected={selected}
          empty={rows.length ? common.table.noMatch : copy.list.empty} bounded />
      </WorkPanel>
    </Block>
    <DetailPane label={copy.detail.label} open={sheet} onClose={closeSheet}>
      {!current ? <DetailEmpty headingRef={headingRef} title={copy.detail.label} hint={copy.detail.emptyHint} /> : <>
        <DetailHead headingRef={headingRef} title={current.name} status={current.status} />
        <Rows items={[[rowsCopy.id, current.id], [rowsCopy.booking, current.booking], [rowsCopy.phone, current.phone], [rowsCopy.purpose, current.purpose], [rowsCopy.requestedAt, current.requestedAt]]} />
        <Placeholder title={copy.detail.template}>{copy.detail.templateNote}</Placeholder>
        {current.status === "Menunggu" ? <form className="ws-form" noValidate onSubmit={(event) => {
          event.preventDefault();
          if (!current.letter.trim()) { setLetterError(true); setMessage({ tone: "error", text: site.messages.required }); return; }
          update({ status: "Tervalidasi" }); setLetterError(false);
          setMessage({ tone: "info", text: copy.messages.saved });
        }}>
          <Field label={copy.detail.letter} hint={common.temporaryField}>
            <textarea className="field" name="letter" rows={4} value={current.letter} aria-invalid={letterError || undefined}
              onChange={(event) => { setLetterError(false); update({ letter: event.target.value }); }} />
          </Field>
          <Notice message={message} />
          <Actions><button type="submit" className="primary-button">{copy.detail.save}</button></Actions>
        </form> : <>
          <Notice message={message} />
          <Actions>
            {current.status === "Tervalidasi"
              ? <button type="button" className="primary-button" onClick={() => {
                if (!current.whatsappFound) { setMessage({ tone: "error", text: site.messages.whatsappMissing }); return; }
                update({ status: "Terkirim" }); setMessage({ tone: "info", text: copy.messages.sent });
              }}>{common.actions.send}</button>
              : <button type="button" className="primary-button" disabled>{common.actions.sent}</button>}
          </Actions>
        </>}
      </>}
    </DetailPane>
  </>;
}
