"use client";

// /patient/registration/session: registration sent to the server (POST /api/v1/applications) with an operator-issued
// access token. The service date is the server's H+1 (Asia/Jakarta), shown and never chosen. Submitting holds a main
// place ("Menunggu pembayaran") or, when the 100 main places are taken, a FIFO waiting place ("Daftar tunggu"); both full
// is refused. No queue number, no payment: `reference` is a registration code. Manual refresh only, no polling.
import { type FormEvent, useRef, useState } from "react";
import { Section } from "@/components/shell";
import { Field, SelectField } from "@/components/fields";
import { ListCard } from "@/components/frame";
import { ErrorNotice, type Failure, TokenPanel, useReviewToken } from "@/components/review-token";
import { patientContent } from "@/content/patient";
import {
  type ApiResult, type Application, type PatientInput, type ServiceDate, apiFetch, errorFor, isRetryable, newIdempotencyKey,
} from "@/lib/api";
import { dateTimeOf, fullDay, timeOf } from "@/lib/format";
import { identityHints, identityLabels, identityPlaceholders, type IdentityField } from "@/lib/identity-meta";

const copy = patientContent.connected;
const statusOf = (application: Application) => patientContent.status[application.state];

// Form field (identity-meta key) → API key.
const apiKey: Record<IdentityField, keyof PatientInput> = {
  name: "name", nik: "nik", birthDate: "birth_date", addressKtp: "address_ktp", addressHome: "address_home",
  phone: "phone", gender: "gender", occupation: "occupation",
};
const fieldOrder: IdentityField[] = ["name", "nik", "birthDate", "addressKtp", "addressHome", "phone", "gender", "occupation"];
const unfinished = (application: Application) => application.state === "awaiting_payment" || application.state === "waiting";

export function Registration() {
  const { token, clearToken } = useReviewToken();
  const [serviceDate, setServiceDate] = useState<ServiceDate | null>(null);
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PatientInput, string>>>({});
  const [readAt, setReadAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Failure | null>(null);
  const busyRef = useRef(false);
  // Idempotency-Key of the current submission: kept until a definitive answer, reused on Ulangi.
  const attempt = useRef<{ body: string; key: string } | null>(null);

  async function call<T>(t: string, path: string, init?: { method?: string; idempotencyKey?: string; body?: unknown }) {
    const result = await apiFetch<T>(t, path, init);
    if (result.status === 401) clearToken();
    return result;
  }
  async function guarded(fn: () => Promise<void>) {
    if (busyRef.current) return; // a double click never sends a second request
    busyRef.current = true; setBusy(true); setError(null);
    try { await fn(); } finally { busyRef.current = false; setBusy(false); }
  }
  const fail = (result: ApiResult<unknown>, retry: () => void) => setError({ ...errorFor(result), retry: isRetryable(result) ? retry : undefined });

  const refresh = async (t: string) => {
    const date = await call<ServiceDate>(t, "/service-dates/current");
    if (!date.ok) return fail(date, () => void load(t));
    const own = await call<{ applications: Application[] }>(t, "/applications");
    if (!own.ok) return fail(own, () => void load(t));
    setServiceDate(date.data); setApplications(own.data.applications);
    setReadAt(`${timeOf(new Date().toISOString())} WIB`);
  };
  const load = (t: string) => guarded(() => refresh(t));

  const submit = (t: string, patient: PatientInput) => guarded(async () => {
    if (!serviceDate) return;
    const body = { service_date: serviceDate.service_date, patient };
    const serialized = JSON.stringify(body);
    if (attempt.current?.body !== serialized) attempt.current = { body: serialized, key: newIdempotencyKey() };
    const result = await call<Application>(t, "/applications", { method: "POST", idempotencyKey: attempt.current.key, body });
    if (isRetryable(result)) return fail(result, () => void submit(t, patient)); // same key on Ulangi
    attempt.current = null;
    if (result.ok) { setFieldErrors({}); return refresh(t); }
    setFieldErrors(result.code === "VALIDATION_FAILED" ? result.fields ?? {} : {});
    fail(result, () => void submit(t, patient));
    if (result.code && ["SERVICE_DATE_CHANGED", "REGISTRATION_NOT_OPEN", "UNFINISHED_APPLICATION", "ALREADY_REGISTERED_FOR_DATE", "CAPACITY_FULL"].includes(result.code)) {
      const message = errorFor(result);
      await refresh(t);
      setError(message);
    }
  });

  const cancel = (t: string, application: Application) => guarded(async () => {
    const result = await call<Application>(t, `/applications/${application.id}/cancel`, { method: "POST" });
    if (!result.ok) return fail(result, () => void cancel(t, application));
    await refresh(t);
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const data = new FormData(event.currentTarget);
    const patient = Object.fromEntries(fieldOrder.map((field) => [apiKey[field], String(data.get(field) ?? "")])) as PatientInput;
    void submit(token, patient);
  }

  const current = applications?.find(unfinished);

  return <>
    <Section title={copy.token.title} description={copy.token.description}>
      <TokenPanel onSaved={(t) => { attempt.current = null; void load(t); }}
        onCleared={() => { setServiceDate(null); setApplications(null); setError(null); setFieldErrors({}); attempt.current = null; }} />
      <ErrorNotice error={error} busy={busy} />
    </Section>

    {token && serviceDate && applications && <Section title={copy.date.title} description={readAt ? copy.readAt(readAt) : undefined}
      action={<button type="button" className="secondary-button" disabled={busy} onClick={() => load(token)}>{copy.reload}</button>}>
      <dl className="summary">
        <div className="summary-row"><dt>{copy.date.label}</dt><dd>{fullDay(serviceDate.service_date)}</dd></div>
        <div className="summary-row"><dt>{copy.date.status}</dt><dd>{serviceDate.accepting_applications ? copy.date.open : copy.date.closed}</dd></div>
      </dl>
      <p className="page-note">{copy.date.note}</p>
    </Section>}

    {token && current && <Section title={copy.current.title}>
      <dl className="summary">
        <div className="summary-row"><dt>{copy.current.status}</dt><dd><span className="status-chip">{statusOf(current)}</span></dd></div>
        <div className="summary-row"><dt>{copy.current.code}</dt><dd><code>{current.reference}</code></dd></div>
        <div className="summary-row"><dt>{copy.date.label}</dt><dd>{fullDay(current.service_date)}</dd></div>
        <div className="summary-row"><dt>{identityLabels.name}</dt><dd>{current.patient.name}</dd></div>
        <div className="summary-row"><dt>{identityLabels.nik}</dt><dd className="tabular">{`************${current.patient.nik_last4}`}</dd></div>
        {current.waiting_position !== null && <div className="summary-row"><dt>{copy.current.position}</dt><dd className="tabular">{current.waiting_position}</dd></div>}
      </dl>
      <p className="page-note">{current.state === "waiting" ? copy.current.waitingNote : copy.current.heldNote}</p>
      <div className="form-footer">
        <button type="button" className="secondary-button" disabled={busy} onClick={() => cancel(token, current)}>{copy.current.cancel}</button>
      </div>
    </Section>}

    {token && serviceDate && applications && !current && serviceDate.accepting_applications && <Section title={copy.form.title} description={copy.form.description}>
      <form className="registration-fields" onSubmit={onSubmit} noValidate>
        {fieldOrder.map((field) => <Field key={field} label={identityLabels[field]} hint={identityHints[field]} error={fieldErrors[apiKey[field]]}>
          {field === "gender"
            ? <SelectField name={field} defaultValue="" required>
              <option value="" disabled>{copy.form.chooseGender}</option><option>Laki-laki</option><option>Perempuan</option>
            </SelectField>
            : <input className="field" name={field} required placeholder={identityPlaceholders[field]}
              type={field === "birthDate" ? "date" : field === "phone" ? "tel" : "text"}
              inputMode={field === "nik" ? "numeric" : undefined} maxLength={field === "nik" ? 16 : undefined} autoComplete="off" />}
        </Field>)}
        <div className="form-footer" style={{ gridColumn: "1 / -1" }}>
          <p>{copy.form.note}</p>
          <button type="submit" className="primary-button" disabled={busy}>{copy.form.submit}</button>
        </div>
      </form>
    </Section>}

    {token && applications && applications.length > 0 && <Section title={copy.history.title}>
      <ol className="history-list">{applications.map((item) => <li key={item.id}><ListCard title={fullDay(item.service_date)} status={statusOf(item)}
        tone={item.state === "cancelled" ? "muted" : undefined} meta={[
          [copy.current.code, <span key="c" className="tabular">{item.reference}</span>], [identityLabels.name, item.patient.name], [copy.history.created, dateTimeOf(item.created_at)],
        ]} /></li>)}</ol>
    </Section>}
  </>;
}
