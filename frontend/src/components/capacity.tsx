"use client";

// Registration capacity of a service date, read-only: numbers exactly as GET /service-dates/{current|date} returns them.
// Rule (owner decision 18 Oktober 2026): 100 main places (held + confirmed) and 50 FIFO waiting places per service date.
import { useRef, useState } from "react";
import { Band, Counts, Status, WorkPanel } from "@/components/roles/kit";
import { ErrorNotice, type Failure, TokenPanel, useReviewToken } from "@/components/review-token";
import { internal } from "@/content";
import { type ServiceDate, apiFetch, errorFor, isRetryable } from "@/lib/api";
import { fullDay, timeOf } from "@/lib/format";

const copy = internal.management.capacity;
const count = (value: number | null) => (value === null ? "—" : value);

export function Capacity() {
  const { token, clearToken } = useReviewToken();
  const [current, setCurrent] = useState<ServiceDate | null>(null);
  const [other, setOther] = useState<ServiceDate | null>(null);
  const [readAt, setReadAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Failure | null>(null);
  const busyRef = useRef(false);

  async function read(t: string, path: string, done: (data: ServiceDate) => void, retry: () => void) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(null);
    try {
      const result = await apiFetch<ServiceDate>(t, path);
      if (!result.ok) {
        if (result.status === 401) clearToken();
        return setError({ ...errorFor(result), retry: isRetryable(result) ? retry : undefined });
      }
      done(result.data);
      setReadAt(`${timeOf(new Date().toISOString())} WIB`);
    } finally { busyRef.current = false; setBusy(false); }
  }
  const loadCurrent = (t: string) => read(t, "/service-dates/current", setCurrent, () => void loadCurrent(t));
  const loadDate = (t: string, date: string) => read(t, `/service-dates/${date}`, setOther, () => void loadDate(t, date));

  const card = (title: string, data: ServiceDate) => <Counts key={title} title={title} items={[
    [copy.fields.serviceDate, fullDay(data.service_date)],
    [copy.fields.status, <Status key="s">{copy.status[data.status]}</Status>],
    [copy.fields.main, `${data.held + data.confirmed} / ${count(data.main_capacity)}`],
    [copy.fields.held, data.held],
    [copy.fields.confirmed, data.confirmed],
    [copy.fields.mainAvailable, count(data.main_available)],
    [copy.fields.waiting, `${data.waiting} / ${count(data.waiting_capacity)}`],
    [copy.fields.waitingAvailable, count(data.waiting_available)],
  ]} />;

  return <>
    <WorkPanel id="capacity-token" title={copy.token.title} description={copy.token.description}>
      <TokenPanel onSaved={(t) => { setCurrent(null); setOther(null); void loadCurrent(t); }}
        onCleared={() => { setCurrent(null); setOther(null); setError(null); }} />
      <ErrorNotice error={error} busy={busy} />
    </WorkPanel>
    {token && <WorkPanel id="capacity-dates" title={copy.panel.title} description={readAt ? copy.panel.readAt(readAt) : copy.panel.description}
      actions={<button type="button" className="secondary-button" disabled={busy} onClick={() => loadCurrent(token)}>{copy.panel.reload}</button>}
      tools={<form className="ws-tools" onSubmit={(event) => {
        event.preventDefault();
        const date = (event.currentTarget.elements.namedItem("capacity-date") as HTMLInputElement).value;
        if (date) void loadDate(token, date);
      }}>
        <label>{copy.panel.otherDate} <input className="field" type="date" name="capacity-date" required /></label>
        <button type="submit" className="secondary-button" disabled={busy}>{copy.panel.show}</button>
      </form>}>
      {current === null ? <p className="page-note">{copy.panel.empty}</p> : <Band>
        {card(copy.panel.current, current)}
        {other && other.service_date !== current.service_date && card(copy.panel.other, other)}
      </Band>}
      <p className="page-note">{copy.panel.rule}</p>
    </WorkPanel>}
  </>;
}
