"use client";

// Patient Beranda (account, registration box, bento, Denah), Denah and Riwayat, plus the registration details and cancel
// control shared with the registration flow. Data comes from this tab's session (lib/mock-session.ts); copy from
// content/patient.ts.
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Block, Icon, ListCard, MediaArea } from "@/components/frame";
import { EmptyState } from "@/components/shell";
import { RoleAvatar } from "@/components/role-avatar";
import { patientContent } from "@/content/patient";
import { dateTimeOf, fullDay, maskNik, shortDay } from "@/lib/format";
import { linesOf } from "@/lib/mock-catalog";
import {
  type Application, accountName, applicationsOf, cancelApplication, isActive, isCancellable, unfinishedOf, useMockAccount, useMockState,
} from "@/lib/mock-session";

const copy = patientContent;
const labels = copy.application.labels;

export const servicesOf = (item: Application) => linesOf(item.packageCode, item.services).map((line) => line.name).join(", ") || "—";

export function StatusChip({ item }: { item: Application }) {
  return <span className="status-chip" data-state={item.status}>{copy.status[item.status]}</span>;
}

type Fact = keyof typeof labels;
/** Facts of one registration as a summary list with separate registration and MCU queue numbers. */
export function ApplicationFacts({ item, facts }: { item: Application; facts: Fact[] }) {
  const value: Record<Fact, ReactNode> = {
    registrationQueue: <span className="tabular">{item.registrationQueue ?? "Belum diterbitkan"}</span>,
    mcuQueue: <span className="tabular">{item.mcuQueue ?? "Diterbitkan setelah daftar ulang"}</span>,
    code: <span className="tabular">{item.code}</span>,
    status: copy.status[item.status],
    serviceDate: fullDay(item.serviceDate),
    patient: item.identity.name,
    nik: <span className="tabular">{maskNik(item.identity.nik)}</span>,
    services: servicesOf(item),
    submittedAt: dateTimeOf(item.submittedAt),
    submittedBy: accountName(item.account),
  };
  return <dl className="summary">{facts.map((key) => <div key={key} className="summary-row"><dt>{labels[key]}</dt><dd>{value[key]}</dd></div>)}</dl>;
}

/** "Batalkan pendaftaran" with an inline confirmation (focus on "Tidak", the safe choice). Only before re-registration. */
export function CancelControl({ item, onCancelled }: { item: Application; onCancelled: (message: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  // The registration box keeps its size, so bring the confirmation into view inside it; return focus when it closes.
  useEffect(() => {
    if (confirming) {
      confirmRef.current?.scrollIntoView({ block: "nearest" });
      confirmRef.current?.querySelector("button")?.focus({ preventScroll: true });
    } else if (wasConfirming.current) openRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);
  if (!isCancellable(item)) return null;
  const { cancel } = copy.application;
  return confirming
    ? <div ref={confirmRef} className="queue-confirm" role="group" aria-label={cancel.groupLabel(item.code)}>
      <p>{cancel.question(item.code, item.identity.name, fullDay(item.serviceDate))}</p>
      <div className="queue-confirm-actions">
        <button type="button" className="secondary-button" onClick={() => setConfirming(false)}>{cancel.keep}</button>
        <button type="button" className="danger-button" onClick={() => { cancelApplication(item.code); onCancelled(cancel.done(item.code)); }}>{cancel.confirm}</button>
      </div>
    </div>
    : <button ref={openRef} type="button" className="text-button danger-text" onClick={() => setConfirming(true)}>{cancel.action}</button>;
}

/** One registration in the Beranda box: service date, patient, code and status; opening it shows details and cancel. */
function ApplicationRow({ item, onCancelled }: { item: Application; onCancelled: (message: string) => void }) {
  return <details className="queue-row">
    <summary>
      <span className="queue-date"><small>{copy.home.box.dateLabel}</small><strong className="tabular">{shortDay(item.serviceDate)}</strong></span>
      <span className="queue-who"><span>{item.identity.name}</span><span className="queue-meta"><small className="tabular">{item.registrationQueue ? `${labels.registrationQueue}: ${item.registrationQueue}` : item.code}</small><StatusChip item={item} /></span></span>
      <Icon name="chevron" size={18} />
    </summary>
    <div className="queue-detail">
      <ApplicationFacts item={item} facts={["registrationQueue", "mcuQueue", "code", "serviceDate", "services", "submittedAt", "submittedBy"]} />
      {!item.mcuQueue && <p className="app-note">{copy.application.queueNote}</p>}
      <CancelControl item={item} onCancelled={onCancelled} />
    </div>
  </details>;
}

/**
 * Beranda: account info and the registration box on top, then the bento (left on desktop) and Denah (right).
 * Riwayat, Surat Keterangan, Aduan dan Ulasan and Denah open as pop-ups over Beranda (intercepted routes, app/patient/@modal).
 */
export function PatientHome() {
  const state = useMockState();
  const account = useMockAccount();
  const [notice, setNotice] = useState("");
  const boxHeading = useRef<HTMLHeadingElement>(null);
  if (!state) return null;
  const { home } = copy;
  const mine = applicationsOf(state);
  const current = mine.filter(isActive);
  const busy = !!unfinishedOf(state);
  // The cancelled row leaves the box; keep keyboard focus in the box and announce the result.
  const cancelled = (message: string) => { setNotice(message); boxHeading.current?.focus(); };
  return <>
    <Block id="account" energy={2} as="section" className="home-account" label={home.accountLabel}>
      <div className="account-greeting"><RoleAvatar role={account?.role ?? "patient"} size="lg" /><div className="account-hello">
        <h1>{home.greeting(account?.name ?? accountName(state.username ?? ""))}</h1>
        <p>{home.tagline}</p>
      </div></div>
      {state.username && <dl className="account-facts">
        <div><dt>{home.accountFacts.username}</dt><dd>{state.username}</dd></div>
      </dl>}
    </Block>

    <Block id="queue" energy={4} as="section" className="queue-box" label={home.box.title}>
      <div className="queue-box-head">
        <h2 ref={boxHeading} tabIndex={-1}>{home.box.title}</h2>
      </div>
      {/* Fixed height whatever the number of registrations and opened rows: extra content scrolls inside, the page keeps its own scroll. */}
      <div className="queue-scroll" role="region" aria-label={home.box.listLabel} tabIndex={current.length ? 0 : undefined}>
        {current.length
          ? <ul className="queue-list">
            {current.map((item) => <li key={item.code}><ApplicationRow item={item} onCancelled={cancelled} /></li>)}
          </ul>
          : <div className="queue-empty">
            <p>{home.box.empty}</p>
            <Link href="/patient/registration" className="secondary-button">{home.box.emptyAction} <Icon name="next" size={18} /></Link>
          </div>}
      </div>
      <p className="sr-only" role="status">{notice}</p>
    </Block>

    <Block id="features" energy={3} as="section" className="home-bento" label={home.servicesLabel}>
      <ul className="bento" data-protect="grid">{home.bento.map((item) => {
        const registrationBusy = item.key === "registration" && busy;
        return <li key={item.key} data-bento={item.key}>
          <Link href={item.href} className="bento-card">
            <span className="bento-icon"><Icon name={item.icon} /></span>
            <strong>{item.title}</strong>
            <span className="bento-text">{registrationBusy ? home.registrationBusy.text : item.text}</span>
            {item.key === "history" && <span className="bento-recent">{mine.length
              ? mine.slice(0, 3).map((entry) => <span key={entry.code} data-cancelled={entry.status === "cancelled" ? true : undefined}>
                <b className="tabular">{shortDay(entry.serviceDate)}</b>{entry.identity.name}{entry.status === "cancelled" && ` · ${copy.status.cancelled}`}
              </span>)
              : <span>{home.historyEmpty}</span>}</span>}
            <span className="bento-foot"><span>{registrationBusy ? home.registrationBusy.action : item.action}</span><Icon name="arrow" size={18} /></span>
          </Link>
        </li>;
      })}</ul>
    </Block>

    <Block id="map" energy={3} as="section" className="home-map" label={home.map.label}>
      <Link href="/patient/map" className="map-card">
        <span className="map-preview" aria-hidden="true"><Icon name="map" size={28} /></span>
        <span className="map-text"><strong>{home.map.title}</strong><span>{home.map.text}</span></span>
        <span className="bento-foot"><span>{home.map.action}</span><Icon name="arrow" size={18} /></span>
      </Link>
    </Block>
  </>;
}

/** Frame "Denah": image area; the hospital floor plan is not available yet. */
export function MapView() {
  return <Block id="main" energy={3} className="map-main">
    <MediaArea label={copy.mapView.placeholder} />
    <p className="page-note">{copy.mapView.note}</p>
  </Block>;
}

/** Frame "Riwayat": one card per registration of this account, newest first, titled by service date. */
export function History() {
  const state = useMockState();
  if (!state) return null;
  const mine = applicationsOf(state);
  const { history } = copy;
  if (!mine.length) return <Block id="list" energy={3} className="history-empty">
    <EmptyState title={history.emptyTitle} description={history.emptyText} />
    <Link href="/patient/registration" className="primary-button">{history.emptyAction}</Link>
  </Block>;
  return <Block id="list" energy={3}>
    <ol className="history-list">{mine.map((item) => <li key={item.code}>
      <ListCard title={history.title(fullDay(item.serviceDate))} status={copy.status[item.status]} tone={item.status === "cancelled" ? "muted" : undefined} meta={[
        [labels.patient, item.identity.name],
        [labels.registrationQueue, item.registrationQueue ?? "Belum diterbitkan"],
        [labels.mcuQueue, item.mcuQueue ?? "Diterbitkan setelah daftar ulang"],
        [labels.code, <span key="c" className="tabular">{item.code}</span>],
        [labels.submittedAt, dateTimeOf(item.submittedAt)],
        [labels.services, servicesOf(item)],
      ]} />
    </li>)}</ol>
  </Block>;
}
