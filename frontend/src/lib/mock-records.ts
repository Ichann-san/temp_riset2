// Synthetic records for the internal role screens, standing in for backend data until the API exists. Not patient data,
// not RSUD policy. Names ("Pasien 07"), booking/queue numbers, phone numbers and clock times are synthetic. Services and
// packages follow the wireframe; prices come from mock-catalog.ts (placeholder numbers), not RSUD tariffs.
// No clinical result values or diagnoses. Capacity per service date: 100 main places + 50 waiting places (owner decision
// 18 Oktober 2026). Screens copy these arrays into React state; actions change that state only (nothing is stored or sent).

import { mockPackages, mockServices, rupiah } from "@/lib/mock-catalog";

export const SAMPLE_TODAY = { iso: "2026-10-16", label: "Jumat, 16 Oktober 2026" };
/** Capacity per service date: main places (pending payment + confirmed) and FIFO waiting places. */
export const MAIN_PLACES = 100;
export const WAITING_PLACES = 50;

export type ServiceCode = "lab" | "eye" | "ent";
export type PackageCode = "haji" | "cpns";

export const services: Record<ServiceCode, { name: string; unit: string }> = {
  lab: { name: "Laboratorium", unit: "Unit Laboratorium" },
  eye: { name: "Cek mata", unit: "Unit Mata" },
  ent: { name: "THT", unit: "Unit THT" },
};
export const serviceCodes = Object.keys(services) as ServiceCode[];
/** Paket Haji contents are not in the wireframe: null = unknown. */
export const packages: Record<PackageCode, { name: string; includes: ServiceCode[] | null }> = {
  haji: { name: "Paket Haji", includes: null },
  cpns: { name: "Paket CPNS", includes: ["lab", "eye"] },
};
/** Placeholder prices, single source: mock-catalog.ts. */
export const wireframePrice = Object.fromEntries([...mockPackages, ...mockServices].map((item) => [item.code, item.price])) as Record<PackageCode | ServiceCode, number>;
export { rupiah };

/** The unit the unit staff and unit doctor accounts work in. */
export const MY_UNIT: ServiceCode = "lab";
export const MY_ROOM = "Ruang 1";

export type Patient = {
  no: string; // "01"
  name: string; booking: string; queue: string;
  packageCode: PackageCode | null; extras: ServiceCode[];
  nik: string; birthDate: string; gender: string; addressKtp: string; addressHome: string; phone: string; occupation: string;
  reRegistered: boolean;
};

const patient = (no: string, packageCode: PackageCode | null, extras: ServiceCode[], gender: "Perempuan" | "Laki-laki", reRegistered = true): Patient => ({
  no, name: `Pasien ${no}`, booking: `P-0${no}`, queue: `0${no}`, packageCode, extras,
  nik: `00000000000000${no}`, birthDate: "1990-01-01", gender, addressKtp: `Jl. Mawar No. ${Number(no)}`, addressHome: `Jl. Mawar No. ${Number(no)}`,
  phone: `08xx-xxxx-00${no}`, occupation: "Karyawan swasta", reRegistered,
});

export const patients: Patient[] = [
  patient("01", "cpns", [], "Perempuan"),
  patient("02", null, ["ent"], "Laki-laki"),
  patient("03", "cpns", ["ent"], "Perempuan"),
  patient("04", null, ["lab"], "Laki-laki"),
  patient("05", null, ["lab", "eye"], "Perempuan"),
  patient("06", "cpns", [], "Laki-laki"),
  patient("07", "haji", [], "Perempuan", false),
  patient("08", "cpns", [], "Laki-laki", false),
  patient("09", null, ["lab"], "Perempuan"),
  patient("10", "cpns", [], "Laki-laki"),
  patient("11", null, ["lab"], "Perempuan"),
  patient("12", null, ["lab", "ent"], "Laki-laki"),
  patient("13", null, ["ent"], "Perempuan", false),
];
export const patientByQueue = (queue: string) => patients.find((item) => item.queue === queue);

export const packageLabel = (item: Pick<Patient, "packageCode">) => (item.packageCode ? packages[item.packageCode].name : "Non paket");
/** Services the patient will visit; null when the package contents are not known yet (Paket Haji). */
export function plannedServices(item: Pick<Patient, "packageCode" | "extras">): ServiceCode[] | null {
  const included = item.packageCode ? packages[item.packageCode].includes : [];
  if (included === null) return null;
  return [...new Set([...included, ...item.extras])];
}
/** Cost lines: the package (if any) plus extras it does not already include. */
export function costLines(item: Pick<Patient, "packageCode" | "extras">) {
  const included = item.packageCode ? packages[item.packageCode].includes ?? [] : [];
  const lines: { label: string; price: number }[] = item.packageCode ? [{ label: packages[item.packageCode].name, price: wireframePrice[item.packageCode] }] : [];
  for (const code of item.extras) if (!included.includes(code)) lines.push({ label: services[code].name, price: wireframePrice[code] });
  return { lines, total: lines.reduce((sum, line) => sum + line.price, 0) };
}

// ---------- Unit visits (queue + service times). Clock times on SAMPLE_TODAY. ----------
export type VisitStatus = "Menunggu" | "Diperiksa" | "Selesai";
export type Visit = { queue: string; unit: ServiceCode; queuedAt: string; inAt?: string; outAt?: string };
export const visitStatus = (visit: Visit): VisitStatus => (visit.outAt ? "Selesai" : visit.inAt ? "Diperiksa" : "Menunggu");

export const visits: Visit[] = [
  { queue: "009", unit: "lab", queuedAt: "07.20", inAt: "07.28", outAt: "07.38" },
  { queue: "010", unit: "lab", queuedAt: "07.22", inAt: "07.38", outAt: "07.50" },
  { queue: "001", unit: "lab", queuedAt: "07.30", inAt: "07.50", outAt: "08.01" },
  { queue: "003", unit: "lab", queuedAt: "07.35", inAt: "08.01", outAt: "08.12" },
  { queue: "004", unit: "lab", queuedAt: "07.50", inAt: "08.12", outAt: "08.22" },
  { queue: "005", unit: "lab", queuedAt: "08.02", inAt: "08.22" },
  { queue: "006", unit: "lab", queuedAt: "08.10" },
  { queue: "011", unit: "lab", queuedAt: "08.15" },
  { queue: "012", unit: "lab", queuedAt: "08.18" },
  { queue: "002", unit: "ent", queuedAt: "07.40", inAt: "07.58", outAt: "08.12" },
  { queue: "010", unit: "eye", queuedAt: "07.51", inAt: "07.55", outAt: "08.08" },
  { queue: "001", unit: "eye", queuedAt: "08.02", inAt: "08.08", outAt: "08.20" },
  { queue: "003", unit: "eye", queuedAt: "08.13", inAt: "08.20" },
];

const minutes = (clock: string) => { const [h, m] = clock.split(".").map(Number); return h * 60 + m; };
export const minutesBetween = (from?: string, to?: string) => (from && to ? minutes(to) - minutes(from) : null);
export const formatMinutes = (value: number | null) => (value === null ? "—" : `${value} menit`);
export const average = (values: number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null);
// Per-visit metrics from the clock times (definitions depend on Masuk/Keluar): wait = queued to in,
// exam = in to out, TAT = queued to out. averageOf skips visits where the metric is not known yet.
export const waitMinutes = (visit: Visit) => minutesBetween(visit.queuedAt, visit.inAt);
export const examMinutes = (visit: Visit) => minutesBetween(visit.inAt, visit.outAt);
export const tatMinutes = (visit: Visit) => minutesBetween(visit.queuedAt, visit.outAt);
export const averageOf = (list: Visit[], metric: (visit: Visit) => number | null) => average(list.flatMap((visit) => metric(visit) ?? []));

// ---------- Unit results. Result content is never shown: unit templates are not approved yet. ----------
export type ResultStatus = "Menunggu input" | "Menunggu verifikasi" | "Terverifikasi";
export type UnitResult = { queue: string; unit: ServiceCode; revision: number; status: ResultStatus; mismatch?: boolean };
export const unitResults: UnitResult[] = [
  { queue: "009", unit: "lab", revision: 2, status: "Menunggu verifikasi", mismatch: true },
  { queue: "010", unit: "lab", revision: 1, status: "Terverifikasi" },
  { queue: "001", unit: "lab", revision: 1, status: "Terverifikasi" },
  { queue: "003", unit: "lab", revision: 1, status: "Menunggu verifikasi" },
  { queue: "004", unit: "lab", revision: 0, status: "Menunggu input" },
  { queue: "002", unit: "ent", revision: 1, status: "Terverifikasi" },
  { queue: "010", unit: "eye", revision: 1, status: "Terverifikasi" },
  { queue: "001", unit: "eye", revision: 1, status: "Terverifikasi" },
];

// ---------- Final MCU drafts: patients who finished every planned unit. ----------
export type DraftStatus = "Menunggu verifikasi unit" | "Menunggu verifikasi akhir" | "Terverifikasi" | "Terkirim";
export type McuDraft = { queue: string; status: DraftStatus; mismatch?: boolean; whatsappFound: boolean };
export function finishedPatients() {
  return patients.filter((item) => {
    const planned = plannedServices(item);
    return item.reRegistered && planned !== null && planned.length > 0
      && planned.every((unit) => visits.some((visit) => visit.queue === item.queue && visit.unit === unit && visitStatus(visit) === "Selesai"));
  });
}
export const unitChecks = (queue: string) => unitResults.filter((result) => result.queue === queue);
export const mcuDrafts: McuDraft[] = finishedPatients().map((item) => {
  const checks = unitChecks(item.queue);
  const complete = checks.length > 0 && checks.every((check) => check.status === "Terverifikasi") && checks.length === plannedServices(item)?.length;
  return { queue: item.queue, status: complete ? "Menunggu verifikasi akhir" : "Menunggu verifikasi unit", mismatch: item.queue === "010", whatsappFound: item.queue !== "002" };
});

// ---------- Certificate requests. Purposes follow the patient frame (Haji, CPNS, Lainnya). ----------
export type CertificateStatus = "Menunggu" | "Tervalidasi" | "Terkirim";
export type CertificateRequest = { id: string; name: string; booking: string; phone: string; purpose: string; requestedAt: string; status: CertificateStatus; whatsappFound: boolean };
export const certificateRequests: CertificateRequest[] = [
  { id: "S-001", name: "Pasien 21", booking: "B-021", phone: "08xx-xxxx-0021", purpose: "Haji", requestedAt: "14 Okt 2026", status: "Menunggu", whatsappFound: true },
  { id: "S-002", name: "Pasien 22", booking: "B-022", phone: "08xx-xxxx-0022", purpose: "CPNS", requestedAt: "14 Okt 2026", status: "Menunggu", whatsappFound: false },
  { id: "S-003", name: "Pasien 23", booking: "B-023", phone: "08xx-xxxx-0023", purpose: "Lainnya: keperluan kerja", requestedAt: "15 Okt 2026", status: "Tervalidasi", whatsappFound: true },
  { id: "S-004", name: "Pasien 24", booking: "B-024", phone: "08xx-xxxx-0024", purpose: "CPNS", requestedAt: "13 Okt 2026", status: "Terkirim", whatsappFound: true },
];

// ---------- Collective registration batches. ----------
export type Batch = { id: string; date: string; count: number; status: string };
export const batches: Batch[] = [
  { id: "K-001", date: "2026-10-23", count: 20, status: "Terdaftar" },
  { id: "K-002", date: "2026-10-30", count: 15, status: "Terdaftar" },
];

// ---------- Feedback. Messages are synthetic. ----------
export type FeedbackKind = "Ulasan" | "Aduan";
export type Feedback = { id: string; date: string; kind: FeedbackKind; rating: number; message: string };
export const feedback: Feedback[] = [
  { id: "U-001", date: "16 Okt 2026", kind: "Ulasan", rating: 5, message: "Petugas daftar ulang menjelaskan alur dengan jelas." },
  { id: "U-002", date: "16 Okt 2026", kind: "Aduan", rating: 2, message: "Menunggu lama di depan ruang pemeriksaan tanpa informasi nomor yang dipanggil." },
  { id: "U-003", date: "15 Okt 2026", kind: "Ulasan", rating: 4, message: "Nomor antrian di aplikasi memudahkan." },
  { id: "U-004", date: "15 Okt 2026", kind: "Aduan", rating: 3, message: "Halaman registrasi sulit dibaca di layar ponsel kecil." },
  { id: "U-005", date: "14 Okt 2026", kind: "Ulasan", rating: 5, message: "Ruang tunggu bersih dan nyaman." },
  { id: "U-006", date: "13 Okt 2026", kind: "Aduan", rating: 1, message: "Hasil belum diterima melalui WhatsApp." },
];

// ---------- Calendar. Synthetic service dates; opening days are not RSUD policy. ----------
export type ServiceDay = { iso: string; label: string; open: boolean; quota: number; registered: number };
export const serviceDays: ServiceDay[] = [
  { iso: "2026-10-16", label: "Jum, 16 Okt 2026", open: true, quota: MAIN_PLACES, registered: patients.length },
  { iso: "2026-10-19", label: "Sen, 19 Okt 2026", open: true, quota: MAIN_PLACES, registered: 48 },
  { iso: "2026-10-20", label: "Sel, 20 Okt 2026", open: true, quota: MAIN_PLACES, registered: 31 },
  { iso: "2026-10-21", label: "Rab, 21 Okt 2026", open: true, quota: MAIN_PLACES, registered: 9 },
  { iso: "2026-10-22", label: "Kam, 22 Okt 2026", open: false, quota: 0, registered: 0 },
  { iso: "2026-10-23", label: "Jum, 23 Okt 2026", open: true, quota: MAIN_PLACES, registered: 20 },
  { iso: "2026-10-26", label: "Sen, 26 Okt 2026", open: true, quota: MAIN_PLACES, registered: 0 },
];
/** PRD pre-condition: changes only for dates at least 2 days after the day of the change. */
export const daysFromToday = (iso: string) => Math.round((Date.parse(iso) - Date.parse(SAMPLE_TODAY.iso)) / 86_400_000);

// ---------- Service information. Pending registrations are synthetic numbers (PRD pre-condition: no edits while > 0). ----------
export type ServiceInfo = { code: PackageCode | ServiceCode; name: string; kind: "Paket" | "Non paket"; includes: string; info: string; pending: number };
export const serviceInfo: ServiceInfo[] = [
  { code: "haji", name: "Paket Haji", kind: "Paket", includes: "Belum tersedia", info: "Informasi Paket Haji.", pending: 3 },
  { code: "cpns", name: "Paket CPNS", kind: "Paket", includes: "Laboratorium, Cek mata", info: "Informasi Paket CPNS.", pending: 5 },
  { code: "lab", name: "Laboratorium", kind: "Non paket", includes: "—", info: "Informasi layanan Laboratorium.", pending: 0 },
  { code: "eye", name: "Cek mata", kind: "Non paket", includes: "—", info: "Informasi layanan Cek mata.", pending: 0 },
  { code: "ent", name: "THT", kind: "Non paket", includes: "—", info: "Informasi layanan THT.", pending: 2 },
];

export const clockNow = () => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
