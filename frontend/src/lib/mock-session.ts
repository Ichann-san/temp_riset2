// Client-side session of this tab: signed-in username, the registration draft, the registrations submitted by this account,
// and feedback/certificate requests. Kept in this tab's sessionStorage only; nothing is sent to a server. Signing out or
// closing the tab clears it. Older stored shapes are normalized on read (see normalize()).
//
// Registration rules mirrored from the approved backend design (owner decisions 18 Oktober 2026):
// - the account is the responsible submitter, not necessarily the patient; every registration records its account;
// - the service date is Asia/Jakarta today + 1, assigned at submit and frozen on the registration (never recomputed);
// - submitting from Rincian puts the registration in "Menunggu pembayaran" with a registration code (never a queue number);
// - one unfinished registration (awaiting payment or waiting) per account; one active registration per account per service date;
// - a NIK may have only one active registration per service date (waiting, awaiting payment or confirmed);
// - cancelling before payment is allowed and permits a new attempt.
// This tab cannot hold capacity or see other accounts, so it never represents places, the waiting list or payment: no
// registration here reaches "Terkonfirmasi", and none carries a queue number.
import { useSyncExternalStore } from "react";
import type { ApplicationStatus } from "@/content/patient";
import { accountByUsername } from "@/lib/mock-accounts";
import { nextServiceDay } from "@/lib/format";

export type { ApplicationStatus } from "@/content/patient";
export type Identity = { name: string; nik: string; birthDate: string; addressKtp: string; addressHome: string; phone: string; gender: string; occupation: string };
/**
 * One submitted registration. account: username of the submitting account. serviceDate: "YYYY-MM-DD" (Asia/Jakarta), frozen
 * at submit. code: registration code ("REG-XXXXXX"), not a queue number. cancelledAt: set when the account cancelled it.
 */
export type Application = {
  code: string; account: string; identity: Identity; packageCode: string | null; services: string[]; total: number;
  serviceDate: string; status: ApplicationStatus; submittedAt: string; cancelledAt?: string;
};
/** Registration in progress; the patient form starts empty. Each step page derives its guard from this data. */
export type Draft = { identity: Identity; agreed: boolean; packageCode: string | null; services: string[] };
export type FeedbackEntry = { kind: string; rating: number; message: string; sentAt: string };
export type CertificateRequest = { purpose: string; detail: string; sentAt: string };
export type MockState = {
  username: string | null;
  applications: Application[]; // every registration submitted in this tab, newest first (Riwayat lists them all)
  draft: Draft;
  feedback: FeedbackEntry[];
  certificates: CertificateRequest[];
};

const statuses: ApplicationStatus[] = ["awaiting_payment", "waiting", "confirmed", "cancelled"];
/** Unfinished = submitted but not yet confirmed or cancelled. */
export const isUnfinished = (item: Application) => item.status === "awaiting_payment" || item.status === "waiting";
/** Active = counts for the per-date account rule and the NIK rule. */
export const isActive = (item: Application) => item.status !== "cancelled";
/** May be cancelled by the account (before payment). */
export const isCancellable = isUnfinished;

export const emptyIdentity: Identity = { name: "", nik: "", birthDate: "", addressKtp: "", addressHome: "", phone: "", gender: "", occupation: "" };
export const emptyDraft: Draft = { identity: emptyIdentity, agreed: false, packageCode: null, services: [] };
const empty: MockState = { username: null, applications: [], draft: emptyDraft, feedback: [], certificates: [] };

const KEY = "islah-session";
const listeners = new Set<() => void>();
let cache: MockState | null = null;

type Loose = Record<string, unknown>;
const isObject = (value: unknown): value is Loose => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown) => (typeof value === "string" ? value : "");
const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
const isDay = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

function toIdentity(value: unknown): Identity {
  const raw = isObject(value) ? value : {};
  return Object.fromEntries(Object.keys(emptyIdentity).map((key) => [key, text(raw[key])])) as Identity;
}

/**
 * Current shape only. Entries stored by the earlier flow (queue "number", no code, no service date, no status) cannot be
 * represented truthfully under the current rules, so they are not loaded.
 */
function toApplication(value: Loose): Application | null {
  if (typeof value.code !== "string" || !isDay(value.serviceDate) || typeof value.submittedAt !== "string") return null;
  const cancelledAt = typeof value.cancelledAt === "string" ? value.cancelledAt : undefined;
  const stored = statuses.find((status) => status === value.status) ?? "awaiting_payment";
  return {
    code: value.code, account: text(value.account), identity: toIdentity(value.identity),
    packageCode: typeof value.packageCode === "string" ? value.packageCode : null, services: strings(value.services),
    total: typeof value.total === "number" ? value.total : 0, serviceDate: value.serviceDate,
    status: cancelledAt ? "cancelled" : stored, submittedAt: value.submittedAt, ...(cancelledAt ? { cancelledAt } : {}),
  };
}

const toList = <T,>(value: unknown, item: (raw: Loose) => T | null) =>
  (Array.isArray(value) ? value : []).flatMap((raw) => { const parsed = isObject(raw) ? item(raw) : null; return parsed ? [parsed] : []; });

/** Accepts any stored JSON, including older shapes (single `registration`, `active`/`history`, profile, members, forSelf). */
function normalize(value: unknown): MockState {
  const raw = isObject(value) ? value : {};
  const draft = isObject(raw.draft) ? raw.draft : {};
  return {
    username: typeof raw.username === "string" ? raw.username : null,
    applications: toList(raw.applications, toApplication),
    draft: {
      // Older drafts may hold the prefilled account profile; the patient form now always starts empty.
      identity: draft.forSelf === true ? emptyIdentity : toIdentity(draft.identity),
      agreed: draft.agreed === true, packageCode: typeof draft.packageCode === "string" ? draft.packageCode : null, services: strings(draft.services),
    },
    feedback: toList(raw.feedback, (item) => typeof item.message === "string" ? { kind: text(item.kind), rating: Number(item.rating) || 0, message: item.message, sentAt: text(item.sentAt) } : null),
    certificates: toList(raw.certificates, (item) => typeof item.purpose === "string" ? { purpose: item.purpose, detail: text(item.detail), sentAt: text(item.sentAt) } : null),
  };
}

function read(): MockState {
  if (!cache) {
    try { cache = normalize(JSON.parse(sessionStorage.getItem(KEY) ?? "{}")); } catch { cache = empty; }
  }
  return cache;
}

function write(next: MockState) {
  cache = next;
  try {
    if (next.username) sessionStorage.setItem(KEY, JSON.stringify(next)); else sessionStorage.removeItem(KEY);
  } catch { /* storage unavailable: state still works for this page view */ }
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** null until the browser state is read (server render and hydration). */
export const useMockState = () => useSyncExternalStore(subscribe, read, () => null);

/** undefined = still loading, null = signed out. */
export function useMockAccount() {
  const state = useMockState();
  if (!state) return undefined;
  return state.username ? accountByUsername(state.username) ?? null : null;
}

export const mockSignIn = (username: string) => write({ ...empty, username });
export const mockSignOut = () => write(empty);

/** Display name of the submitting account ("Pasien"), falling back to the username. */
export const accountName = (username: string) => accountByUsername(username)?.name ?? username;

/** Registrations of the signed-in account, newest first. */
export const applicationsOf = (state: MockState) => state.applications.filter((item) => item.account === state.username);
/** The account's unfinished registration, if any (at most one). */
export const unfinishedOf = (state: MockState) => applicationsOf(state).find(isUnfinished);
/** What prevents a new registration for `serviceDate`: the unfinished one, or an active one on the same service date. */
export const blockingApplication = (state: MockState, serviceDate: string) =>
  unfinishedOf(state) ?? applicationsOf(state).find((item) => isActive(item) && item.serviceDate === serviceDate);

/** NIK rule (temporary hospital policy): another active registration with this NIK on the same service date, any account. */
export const nikTaken = (state: MockState, nik: string, serviceDate: string) =>
  !!nik && state.applications.some((item) => isActive(item) && item.serviceDate === serviceDate && item.identity.nik === nik);

export const updateDraft = (patch: Partial<Draft>) => { const state = read(); write({ ...state, draft: { ...state.draft, ...patch } }); };

const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I
function newCode(used: Set<string>) {
  let code = "";
  while (!code || used.has(code)) {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    code = `REG-${Array.from(bytes, (byte) => codeAlphabet[byte % codeAlphabet.length]).join("")}`;
  }
  return code;
}

export type SubmitResult = { ok: true; application: Application } | { ok: false; reason: "blocked" | "duplicate_nik" };

/**
 * Final confirmation from Rincian. Assigns and freezes the service date, re-checks the account and NIK rules against the
 * current state, records the registration as "Menunggu pembayaran" and starts a new empty draft.
 */
export function submitApplication(input: { identity: Identity; packageCode: string | null; services: string[]; total: number }, now: Date = new Date()): SubmitResult {
  const state = read();
  if (!state.username) return { ok: false, reason: "blocked" };
  const serviceDate = nextServiceDay(now);
  if (blockingApplication(state, serviceDate)) return { ok: false, reason: "blocked" };
  if (nikTaken(state, input.identity.nik, serviceDate)) return { ok: false, reason: "duplicate_nik" };
  const application: Application = {
    ...input, code: newCode(new Set(state.applications.map((item) => item.code))), account: state.username,
    serviceDate, status: "awaiting_payment", submittedAt: now.toISOString(),
  };
  write({ ...state, applications: [application, ...state.applications], draft: emptyDraft });
  return { ok: true, application };
}

/** Cancels an unfinished registration of this account; Riwayat keeps it as "Dibatalkan". */
export function cancelApplication(code: string) {
  const state = read();
  const cancelledAt = new Date().toISOString();
  write({
    ...state,
    applications: state.applications.map((item) =>
      item.code === code && item.account === state.username && isCancellable(item) ? { ...item, status: "cancelled", cancelledAt } : item),
  });
}

export const saveFeedback = (entry: FeedbackEntry) => { const state = read(); write({ ...state, feedback: [entry, ...state.feedback] }); };
export const saveCertificateRequest = (entry: CertificateRequest) => { const state = read(); write({ ...state, certificates: [entry, ...state.certificates] }); };
