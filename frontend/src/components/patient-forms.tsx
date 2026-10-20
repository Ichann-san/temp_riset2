"use client";

// Frames "Aduan dan Ulasan" and "Pengajuan Surat". Submissions are kept in this tab's session only; copy from content/patient.ts.
import Link from "next/link";
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { Block, BottomAction, Field, SelectField, StarRating } from "@/components/frame";
import { useDialogClose } from "@/components/patient-dialog";
import { patientContent } from "@/content/patient";
import { saveCertificateRequest, saveFeedback } from "@/lib/mock-session";

/** Confirmation that replaces a form after Kirim; focus moves to its heading so the change is announced. */
function Sent({ title, rows, children, again, onAgain }: { title: string; rows: [string, string][]; children: ReactNode; again: string; onAgain: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const close = useDialogClose();
  useEffect(() => { heading.current?.focus(); }, []);
  return <>
    <Block id="main" energy={3} protect="measure">
      <section className="surface section stack sent-panel" aria-labelledby="sent-title">
        <h2 id="sent-title" ref={heading} tabIndex={-1}>{title}</h2>
        {children}
        <dl className="summary">{rows.map(([key, value]) => <div key={key} className="summary-row"><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
      </section>
    </Block>
    <BottomAction>
      <button type="button" className="secondary-button" onClick={onAgain}>{again}</button>
      {close ? <button type="button" className="primary-button" onClick={close}>{patientContent.sent.close}</button>
        : <Link href="/patient" className="primary-button">{patientContent.sent.back}</Link>}
    </BottomAction>
  </>;
}

// First invalid control in DOM order; the star rating has no aria-invalid, so its first radio stands in when its error shows.
const focusFirstInvalid = (form: HTMLFormElement) => form.querySelector<HTMLElement>("[aria-invalid='true'], .star-rating:has(.field-error) input")?.focus();

/** Wireframe "Aduan dan Ulasan" (title typo "Alasan" fixed): Jenis pesan, Nilai pelayanan (5 radio stars), Pesan, Kirim. */
export function FeedbackForm() {
  const text = patientContent.feedback;
  const [kind, setKind] = useState("");
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState(false);
  const errors = tried ? {
    kind: kind ? undefined : text.errors.kind,
    rating: rating ? undefined : text.errors.rating,
    message: message.trim() ? undefined : text.errors.message,
  } : {};
  const invalid = !kind || !rating || !message.trim();

  if (sent) return <Sent title={text.sentTitle} again={text.again} onAgain={() => { setKind(""); setRating(0); setMessage(""); setTried(false); setSent(false); }}
    rows={[[text.kind, kind], [text.rating, text.ratingValue(rating)], [text.message, message.trim()]]}>
    <p>{text.sentText(kind)}</p>
  </Sent>;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTried(true);
    if (invalid) { const form = event.currentTarget; requestAnimationFrame(() => focusFirstInvalid(form)); return; }
    saveFeedback({ kind, rating, message: message.trim(), sentAt: new Date().toISOString() });
    setSent(true);
  };
  return <>
    <Block id="main" energy={3} protect="measure">
      <form id="feedback-form" className="form-stack" noValidate onSubmit={submit}>
        <Field label={text.kind} error={errors.kind}>
          <SelectField name="kind" required aria-invalid={!!errors.kind} value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="">{text.kindPlaceholder}</option>{text.kinds.map((item) => <option key={item}>{item}</option>)}
          </SelectField>
        </Field>
        <StarRating legend={text.rating} name="rating" value={rating} onChange={setRating} error={errors.rating} />
        <Field label={text.message} error={errors.message}>
          <textarea className="field feedback-message" name="message" rows={6} required aria-invalid={!!errors.message} placeholder={text.messagePlaceholder} value={message} onChange={(event) => setMessage(event.target.value)} />
        </Field>
      </form>
    </Block>
    <BottomAction>
      {tried && invalid && <p className="field-error" role="alert">{text.errors.form}</p>}
      <button type="submit" form="feedback-form" className="primary-button">{text.submit}</button>
    </BottomAction>
  </>;
}

/** Wireframe "Pengajuan Surat": Keperluan, conditional free text (required only for Lainnya), Kirim anchored low on mobile. */
export function CertificateForm() {
  const text = patientContent.certificate;
  const [purpose, setPurpose] = useState("");
  const [detail, setDetail] = useState("");
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState(false);
  const other = purpose === text.other;
  const errors = tried ? { purpose: purpose ? undefined : text.errors.purpose, detail: other && !detail.trim() ? text.errors.detail : undefined } : {};
  const invalid = !purpose || (other && !detail.trim());

  if (sent) return <Sent title={text.sentTitle} again={text.again} onAgain={() => { setPurpose(""); setDetail(""); setTried(false); setSent(false); }}
    rows={[[text.purpose, other ? text.otherValue(detail.trim()) : purpose]]}>
    <p>{text.sentText}</p>
  </Sent>;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTried(true);
    if (invalid) { const form = event.currentTarget; requestAnimationFrame(() => focusFirstInvalid(form)); return; }
    saveCertificateRequest({ purpose, detail: other ? detail.trim() : "", sentAt: new Date().toISOString() });
    setSent(true);
  };
  return <>
    <Block id="main" energy={3} protect="measure">
      <form id="certificate-form" className="form-stack" noValidate onSubmit={submit}>
        <Field label={text.purpose} error={errors.purpose}>
          <SelectField name="purpose" required aria-invalid={!!errors.purpose} value={purpose} onChange={(event) => setPurpose(event.target.value)}>
            <option value="">{text.purposePlaceholder}</option>{text.purposes.map((item) => <option key={item}>{item}</option>)}
          </SelectField>
        </Field>
        {other && <Field label={text.otherLabel} error={errors.detail}>
          <input className="field" name="detail" required aria-invalid={!!errors.detail} placeholder={text.otherPlaceholder} value={detail} onChange={(event) => setDetail(event.target.value)} />
        </Field>}
      </form>
    </Block>
    <BottomAction>
      {tried && invalid && <p className="field-error" role="alert">{text.errors.form}</p>}
      <button type="submit" form="certificate-form" className="primary-button">{text.submit}</button>
    </BottomAction>
  </>;
}
