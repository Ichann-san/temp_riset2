"use client";

// Wireframe registration flow, one route per frame: Form pendaftaran → Syarat dan ketentuan → Layanan → Rincian → Pendaftaran
// tercatat. The account is the responsible submitter; the patient form always starts empty. The draft lives in this tab's
// session (sessionStorage), so the header back button, browser back and reload keep progress. Every later step guards its
// prerequisites and replaces the URL with the first incomplete step. The service date is Jakarta today + 1, shown in every
// step and frozen on the registration at submit. Rules: lib/mock-session.ts.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { BigNumberCard, Block, BottomAction, Field, Icon, SelectField, SuccessPanel, SummaryBox } from "@/components/frame";
import { ApplicationFacts, CancelControl, StatusChip } from "@/components/patient";
import { patientContent } from "@/content/patient";
import { fullDay, jakartaDay, longDay, maskNik, nextServiceDay } from "@/lib/format";
import { identityHints, identityLabels, identityPlaceholders } from "@/lib/identity-meta";
import { extrasOf, hasChoice, linesOf, mockPackages, mockServices, packageByCode, rupiah, totalOf } from "@/lib/mock-catalog";
import {
  type Application, type Identity, type MockState, accountName, blockingApplication, isUnfinished, nikTaken, submitApplication, unfinishedOf, updateDraft, useMockState,
} from "@/lib/mock-session";

const reg = "/patient/registration";
const copy = patientContent.registration;
const appLabels = patientContent.application.labels;

type Errors = Partial<Record<keyof Identity, string>>;

/** Approved patient fields (wireframe): all required; NIK 16 digits; WhatsApp number; birth date not after today (WIB). */
export function validateIdentity(identity: Identity, today = jakartaDay()): Errors {
  const errors: Errors = {};
  const message = copy.errors;
  if (!identity.name.trim()) errors.name = message.name;
  if (!/^\d{16}$/.test(identity.nik)) errors.nik = message.nik;
  if (!identity.birthDate) errors.birthDate = message.birthDateMissing;
  else if (identity.birthDate > today) errors.birthDate = message.birthDateFuture;
  if (!identity.addressKtp.trim()) errors.addressKtp = message.addressKtp;
  if (!identity.addressHome.trim()) errors.addressHome = message.addressHome;
  if (!/^(\+62|62|0)8\d{7,11}$/.test(identity.phone.replace(/[\s-]/g, ""))) errors.phone = message.phone;
  if (!identity.gender) errors.gender = message.gender;
  if (!identity.occupation.trim()) errors.occupation = message.occupation;
  return errors;
}

/** Step 1 as a whole: identity, then the NIK rule for the service date. */
export function validateDraft(state: MockState, serviceDate: string, today = jakartaDay()): Errors {
  const errors = validateIdentity(state.draft.identity, today);
  if (!errors.nik && nikTaken(state, state.draft.identity.nik, serviceDate)) errors.nik = copy.duplicateNik;
  return errors;
}

/** First incomplete step before `step`, or null when the step may be shown. */
export function registrationGuard(state: MockState, step: "terms" | "services" | "review", serviceDate: string): string | null {
  const { agreed, packageCode, services } = state.draft;
  if (blockingApplication(state, serviceDate) || Object.keys(validateDraft(state, serviceDate)).length) return reg;
  if (step !== "terms" && !agreed) return `${reg}/terms`;
  if (step === "review" && !hasChoice(packageCode, services)) return `${reg}/services`;
  return null;
}

function useRedirect(target: string | null) {
  const router = useRouter();
  useEffect(() => { if (target) router.replace(target); }, [target, router]);
}

/** Service date shown in the flow (H+1, Asia/Jakarta), read once per page view. The registration freezes it at submit. */
const useServiceDay = () => useState(() => nextServiceDay())[0];

// Examples live in placeholders; a hint is kept only for a rule the value must follow (replaced by the error when invalid).
// Autofill stays off: the patient is not assumed to be the account holder.
const field = (key: keyof Identity, rest: { type?: string; inputMode?: "numeric" | "tel"; select?: string[] } = {}) =>
  ({ key, label: identityLabels[key], placeholder: identityPlaceholders[key], hint: identityHints[key], ...rest });
// Same labels, placeholders and hints as the staff forms (lib/identity-meta.ts).
const fields = [
  field("name"),
  field("nik", { inputMode: "numeric" }),
  field("birthDate", { type: "date" }),
  field("addressKtp"),
  field("addressHome"),
  field("phone", { type: "tel", inputMode: "tel" }),
  field("gender", { select: ["Laki-laki", "Perempuan"] }),
  field("occupation"),
];

/** "Tanggal pemeriksaan" line shown in every step (assigned by the system, not chosen). */
function ServiceDateLine({ serviceDate }: { serviceDate: string }) {
  return <p className="reg-date"><span>{copy.serviceDate.label}</span><strong>{fullDay(serviceDate)}</strong><small>{copy.serviceDate.hint}</small></p>;
}

function StepRail({ serviceDate, account }: { serviceDate: string; account: string }) {
  return <Block id="rail" energy={2} className="reg-rail">
    <p className="reg-step-count" id="reg-steps-label">{copy.stepCount(1, copy.steps.length, copy.steps[0])}</p>
    <ol className="reg-steps" aria-labelledby="reg-steps-label">{copy.steps.map((label, index) =>
      <li key={label} aria-current={index === 0 ? "step" : undefined}><span className="reg-step-name">{label}</span></li>)}</ol>
    <ServiceDateLine serviceDate={serviceDate} />
    <p className="reg-by">{copy.submittedBy(account)}</p>
  </Block>;
}

/** Frame "Registrasi": the empty patient form, or the registration that blocks a new one (with cancel). */
export function RegistrationForm() {
  const state = useMockState();
  const router = useRouter();
  const serviceDate = useServiceDay();
  const [tried, setTried] = useState(false);
  const [notice, setNotice] = useState("");
  const [today] = useState(() => jakartaDay());
  const formRef = useRef<HTMLFormElement>(null);
  // After a cancel the form replaces the blocking panel: move focus to its first field.
  useEffect(() => { if (notice) formRef.current?.querySelector<HTMLElement>("input, select")?.focus(); }, [notice]);
  if (!state) return null;
  const account = accountName(state.username ?? "");
  const blocking = blockingApplication(state, serviceDate);
  if (blocking) return <Blocked item={blocking} serviceDate={serviceDate} account={account} onCancelled={setNotice} />;

  const { identity } = state.draft;
  // The duplicate NIK message shows at once (e.g. after a redirect from a later step); empty-field errors after "Lanjut".
  const errors: Errors = tried ? validateDraft(state, serviceDate, today)
    : nikTaken(state, identity.nik, serviceDate) ? { nik: copy.duplicateNik } : {};
  const invalid = tried && Object.keys(errors).length > 0;
  const change = (key: keyof Identity) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    updateDraft({ identity: { ...identity, [key]: key === "nik" ? event.target.value.replace(/\D/g, "").slice(0, 16) : event.target.value } });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTried(true);
    const first = Object.keys(validateDraft(state, serviceDate, today))[0];
    if (first) { event.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus(); return; }
    router.push(`${reg}/terms`);
  };

  return <>
    <StepRail serviceDate={serviceDate} account={account} />
    <Block id="form" energy={3} protect="measure">
      <form ref={formRef} id="registration-form" className="form-stack" noValidate onSubmit={submit}>
        {notice && <p className="form-note" role="status">{notice}</p>}
        {fields.map(({ key, label, type, inputMode, placeholder, hint, select }) =>
          <Field key={key} label={label} hint={errors[key] ? undefined : hint} error={errors[key]}>
            {select
              ? <SelectField name={key} required aria-invalid={!!errors[key]} autoComplete="off" value={identity[key]} onChange={change(key)}>
                <option value="">{copy.selectPrefix} {label.toLowerCase()}</option>{select.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              : <input className="field" name={key} type={type ?? "text"} inputMode={inputMode} autoComplete="off" required aria-invalid={!!errors[key]}
                placeholder={placeholder} maxLength={key === "nik" ? 16 : undefined} max={type === "date" ? today : undefined} value={identity[key]} onChange={change(key)} />}
          </Field>)}
      </form>
    </Block>
    <BottomAction>
      {invalid && <p className="field-error" role="alert">{copy.formIncomplete}</p>}
      <button type="submit" form="registration-form" className="primary-button">{copy.next}</button>
    </BottomAction>
  </>;
}

/** One unfinished registration per account, one active registration per account per service date: show it instead of a form. */
function Blocked({ item, serviceDate, account, onCancelled }: { item: Application; serviceDate: string; account: string; onCancelled: (message: string) => void }) {
  const unfinished = isUnfinished(item);
  const { blocked } = copy;
  return <>
    <StepRail serviceDate={serviceDate} account={account} />
    <Block id="form" energy={3} protect="measure">
      <section className="surface section stack" aria-labelledby="reg-blocked">
        <div className="row-between"><h2 id="reg-blocked">{unfinished ? blocked.unfinishedTitle : blocked.sameDateTitle}</h2><StatusChip item={item} /></div>
        <p>{unfinished ? blocked.unfinishedText : blocked.sameDateText}</p>
        <ApplicationFacts item={item} facts={["registrationQueue", "mcuQueue", "code", "serviceDate", "patient", "services", "submittedAt"]} />
        {!item.mcuQueue && <p className="app-note">{patientContent.application.queueNote}</p>}
        <CancelControl item={item} onCancelled={onCancelled} />
      </section>
    </Block>
    <BottomAction>
      <Link href="/patient" className="primary-button">{blocked.back}</Link>
    </BottomAction>
  </>;
}

/** Frame "TnR": terms box, agreement checkbox bonded to Lanjut. */
export function TermsStep() {
  const state = useMockState();
  const router = useRouter();
  const serviceDate = useServiceDay();
  const [tried, setTried] = useState(false);
  const target = state && registrationGuard(state, "terms", serviceDate);
  useRedirect(target);
  if (!state || target) return null;
  const agreed = state.draft.agreed;
  const { terms } = copy;
  return <>
    <Block id="main" energy={3} protect="measure" className="reg-terms">
      <ServiceDateLine serviceDate={serviceDate} />
      <div className="terms-box" role="region" aria-label={terms.regionLabel} tabIndex={0}>
        {terms.sections.map((section) => <section key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>)}
      </div>
    </Block>
    <BottomAction>
      <label className="check reg-agree">
        <input type="checkbox" name="agree" checked={agreed} aria-invalid={tried && !agreed} onChange={(event) => updateDraft({ agreed: event.target.checked })} />
        <span>{terms.agree}</span>
      </label>
      {tried && !agreed && <p className="field-error" role="alert">{terms.agreeError}</p>}
      <button type="button" className="primary-button" onClick={() => (agreed ? router.push(`${reg}/services`) : setTried(true))}>{copy.next}</button>
    </BottomAction>
  </>;
}

/** Frame "Layanan": package radio cards, add-on checkboxes, total bonded to Lanjut (sticky summary from c2). */
export function ServicesStep() {
  const state = useMockState();
  const router = useRouter();
  const serviceDate = useServiceDay();
  const [tried, setTried] = useState(false);
  const target = state && registrationGuard(state, "services", serviceDate);
  useRedirect(target);
  if (!state || target) return null;
  const { packageCode, services } = state.draft;
  const chosen = packageByCode(packageCode);
  const valid = hasChoice(packageCode, services);
  const text = copy.services;
  const toggle = (code: string, on: boolean) => updateDraft({ services: on ? [...services.filter((item) => item !== code), code] : services.filter((item) => item !== code) });
  return <>
    <Block id="lists" energy={3}>
      <fieldset className="choice-list">
        <legend>{text.packages}</legend>
        {mockPackages.map((item) => <div key={item.code} className="package-card">
          <label className="choice-head">
            <input type="radio" name="package" value={item.code} checked={packageCode === item.code} onChange={() => updateDraft({ packageCode: item.code })} />
            <span>{item.name}</span><strong className="tabular">{rupiah(item.price)}</strong>
          </label>
          <details className="package-items">
            <summary>{text.showContents} <Icon name="chevron" size={18} /></summary>
            {item.includes.length
              ? <ul className="lines">{linesOf(null, item.includes).map((line) => <li key={line.name}><span>{line.name}</span><span className="tabular">{rupiah(line.price)}</span></li>)}</ul>
              : <p className="page-note">{text.contentsMissing}</p>}
          </details>
        </div>)}
        <div className="package-card">
          <label className="choice-head">
            <input type="radio" name="package" value="" checked={!chosen} onChange={() => updateDraft({ packageCode: null })} /><span>{text.noPackage}</span>
          </label>
        </div>
      </fieldset>
      <fieldset className="choice-list">
        <legend>{text.extras}</legend>
        <div className="service-rows">{mockServices.map((service) => {
          const included = !!chosen?.includes.includes(service.code);
          return <label key={service.code} className="choice-head" data-included={included || undefined}>
            <input type="checkbox" name="services" value={service.code} disabled={included} checked={included || services.includes(service.code)}
              onChange={(event) => toggle(service.code, event.target.checked)} />
            <span>{service.name}{included && <small>{text.included}</small>}</span><strong className="tabular">{rupiah(service.price)}</strong>
          </label>;
        })}</div>
      </fieldset>
    </Block>
    <Block id="summary" energy={4} protect="rigid" as="section" label={text.summaryLabel} className="reg-summary">
      <ServiceDateLine serviceDate={serviceDate} />
      <p className="total"><span>{text.total}</span><strong className="tabular" aria-live="polite">{rupiah(totalOf(packageCode, services))}</strong></p>
      {tried && !valid && <p className="field-error" role="alert">{text.choiceError}</p>}
      <button type="button" className="primary-button" onClick={() => (valid ? router.push(`${reg}/review`) : setTried(true))}>{copy.next}</button>
    </Block>
  </>;
}

/** Frame "Rincian": registration (service date, account), patient identity and services with "Ubah", then the final confirmation. */
export function ReviewStep() {
  const state = useMockState();
  const router = useRouter();
  const [serviceDate, setServiceDate] = useState(() => nextServiceDay());
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const target = state && !submitting ? registrationGuard(state, "review", serviceDate) : null;
  useRedirect(target);
  if (!state || target) return null;
  const text = copy.review;
  if (submitting) return <Block id="a"><p role="status" className="page-note">{text.sending}</p></Block>;

  const { identity, packageCode, services } = state.draft;
  const total = totalOf(packageCode, services);
  const rows: [string, string][] = [
    [text.rows.name, identity.name], [text.rows.nik, maskNik(identity.nik)], [text.rows.birthDate, longDay(identity.birthDate)],
    [text.rows.addressKtp, identity.addressKtp], [text.rows.addressHome, identity.addressHome], [text.rows.phone, identity.phone],
    [text.rows.gender, identity.gender], [text.rows.occupation, identity.occupation],
  ];
  const submit = () => {
    const now = new Date();
    // The date shown is the date sent: if the day changed in Jakarta while this page was open, show the new date first.
    const current = nextServiceDay(now);
    if (current !== serviceDate) { setServiceDate(current); setNotice(text.dateChanged(fullDay(current))); return; }
    setSubmitting(true);
    const result = submitApplication({ identity, packageCode, services: extrasOf(packageCode, services), total }, now);
    // A refused submission changes nothing; step 1 shows why (blocking registration or the NIK rule).
    router.replace(result.ok ? `${reg}/done` : reg);
  };
  return <>
    <Block id="a" energy={3} className="review-stack">
      <SummaryBox title={text.registrationBox}>
        <dl className="summary">
          <div className="summary-row"><dt>{appLabels.serviceDate}</dt><dd>{fullDay(serviceDate)}</dd></div>
          <div className="summary-row"><dt>{appLabels.submittedBy}</dt><dd>{accountName(state.username ?? "")}</dd></div>
        </dl>
      </SummaryBox>
      <SummaryBox title={text.identityBox} action={<Link href={reg} className="edit-link">{text.edit}<span className="sr-only">{text.editIdentity}</span></Link>}>
        <dl className="summary">{rows.map(([key, value]) => <div key={key} className="summary-row"><dt>{key}</dt><dd className={key === text.rows.nik ? "tabular" : undefined}>{value}</dd></div>)}</dl>
      </SummaryBox>
    </Block>
    <Block id="b" energy={3}>
      <SummaryBox title={text.servicesBox} action={<Link href={`${reg}/services`} className="edit-link">{text.edit}<span className="sr-only">{text.editServices}</span></Link>}>
        <ul className="lines">{linesOf(packageCode, services).map((line) => <li key={line.name}><span>{line.name}</span><span className="tabular">{rupiah(line.price)}</span></li>)}</ul>
        <p className="total"><span>{copy.services.total}</span><strong className="tabular">{rupiah(total)}</strong></p>
      </SummaryBox>
    </Block>
    <BottomAction>
      {notice && <p className="form-note" role="status">{notice}</p>}
      <button type="button" className="primary-button" onClick={submit}>{text.submit}</button>
    </BottomAction>
  </>;
}

/** Registration succeeds immediately; the MCU queue number remains unavailable until re-registration. */
export function DoneStep() {
  const state = useMockState();
  const latest = state ? unfinishedOf(state) : undefined;
  useRedirect(state && !latest ? reg : null);
  useEffect(() => { if (latest) document.getElementById("done-heading")?.focus(); }, [latest]);
  if (!latest) return null;
  const { done } = copy;
  return <Block id="main" energy={4} className="done-main">
    <h1 className="sr-only">{done.srHeading}</h1>
    <SuccessPanel title={done.heading} headingId="done-heading" text={done.text}
      actions={<Link href="/patient" className="primary-button">{done.back}</Link>}>
      <div className="done-card">
        <StatusChip item={latest} />
        <BigNumberCard label={appLabels.registrationQueue} value={latest.registrationQueue ?? "Belum diterbitkan"} hint="Bawa nomor ini saat daftar ulang di rumah sakit." />
        <ApplicationFacts item={latest} facts={["mcuQueue", "code", "serviceDate", "patient", "submittedBy"]} />
        <p className="app-note">{patientContent.application.queueNote}</p>
      </div>
    </SuccessPanel>
  </Block>;
}
