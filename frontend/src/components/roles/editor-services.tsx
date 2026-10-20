"use client";

// /editor/services — Informasi layanan. Packages and services with "Ubah" (main), edit form with "Ubah Informasi" in
// the DetailPane. PRD pre-condition: no patient registered on the service. Prices are placeholders, not RS tariffs.
import { useState } from "react";
import { Alert, Block, Field } from "@/components/frame";
import { Actions, type Column, DetailEmpty, DetailHead, type Message, Notice, RecordTable, RowAction, Rows, WorkPanel } from "@/components/roles/kit";
import { DetailPane } from "@/components/roles/detail-pane";
import { useSelection } from "@/components/roles/selection";
import { internal } from "@/content";
import { type ServiceInfo, rupiah, serviceInfo, wireframePrice } from "@/lib/mock-records";

const copy = internal.editor.services;
const common = internal.common;

export function EditorServices() {
  const [items, setItems] = useState<ServiceInfo[]>(serviceInfo);
  const { selected, select, headingRef, sheet, closeSheet } = useSelection(serviceInfo.find((item) => item.pending === 0)?.code ?? null);
  const current = items.find((item) => item.code === selected) ?? null;
  const [form, setForm] = useState({ name: current?.name ?? "", info: current?.info ?? "" });
  const [message, setMessage] = useState<Message>(null);
  const [invalid, setInvalid] = useState<string[]>([]);

  const open = (item: ServiceInfo) => { setMessage(null); setInvalid([]); setForm({ name: item.name, info: item.info }); select(item.code); };
  const col = copy.list.columns;
  const columns: Column<ServiceInfo>[] = [
    { label: col.name, kind: "title", cell: (item) => item.name },
    { label: col.kind, compact: true, cell: (item) => item.kind },
    { label: col.includes, kind: "text", cell: (item) => item.includes },
    { label: col.price, kind: "num", compact: true, cell: (item) => rupiah(wireframePrice[item.code]) },
    { label: col.pending, kind: "num", compact: true, cell: (item) => item.pending },
    { label: common.action, kind: "action", cell: (item) => <RowAction label={copy.list.editLabel(item.name)} current={item.code === selected} onClick={() => open(item)}>{common.actions.edit}</RowAction> },
  ];
  const locked = !!current && current.pending > 0;

  return <>
    <Block id="main" energy={4} protect="fluid">
      <WorkPanel id="services" title={copy.list.title} description={copy.list.description}>
        <RecordTable labelledBy="services" rows={items} columns={columns} rowKey={(item) => item.code} selected={selected} empty={copy.list.empty} bounded />
      </WorkPanel>
    </Block>
    <DetailPane label={copy.detail.label} open={sheet} onClose={closeSheet}>
      {!current ? <DetailEmpty headingRef={headingRef} title={copy.detail.emptyTitle} hint={copy.detail.emptyHint} /> : <form className="ws-form" noValidate onSubmit={(event) => {
        event.preventDefault();
        const empty = (["name", "info"] as const).filter((key) => !form[key].trim());
        if (empty.length) { setInvalid([...empty]); setMessage({ tone: "error", text: copy.messages.required }); return; }
        setItems(items.map((item) => (item.code === current.code ? { ...item, name: form.name.trim(), info: form.info.trim() } : item)));
        setInvalid([]); setMessage({ tone: "info", text: copy.messages.saved(form.name.trim()) });
      }}>
        <DetailHead headingRef={headingRef} title={current.name} status={current.kind} />
        <Rows items={[[col.includes, current.includes], [col.price, rupiah(wireframePrice[current.code])], [col.pending, current.pending]]} />
        {locked && <Alert tone="warn">{copy.detail.locked}</Alert>}
        <Field label={copy.detail.name}>
          <input className="field" name="name" value={form.name} disabled={locked} aria-invalid={invalid.includes("name") || undefined}
            onChange={(event) => { setInvalid(invalid.filter((key) => key !== "name")); setForm({ ...form, name: event.target.value }); }} />
        </Field>
        <Field label={copy.detail.info}>
          <textarea className="field" name="info" rows={4} value={form.info} disabled={locked} aria-invalid={invalid.includes("info") || undefined}
            onChange={(event) => { setInvalid(invalid.filter((key) => key !== "info")); setForm({ ...form, info: event.target.value }); }} />
        </Field>
        <Notice message={message} />
        <Actions><button type="submit" className="primary-button" disabled={locked}>{copy.detail.submit}</button></Actions>
      </form>}
    </DetailPane>
  </>;
}
