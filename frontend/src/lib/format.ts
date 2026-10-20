// Display formatting shared by the patient and internal screens (id-ID locale). Pure functions, no React.
// Times and "today" follow the hospital's time zone (Asia/Jakarta, WIB), whatever the device's own zone is.

export const SERVICE_TIME_ZONE = "Asia/Jakarta";

/** "2026-10-17" for a Date in the device's local time (kept for existing callers; prefer jakartaDay). */
export const isoDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const dayParts = new Intl.DateTimeFormat("en-CA", { timeZone: SERVICE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

/** Calendar day in Asia/Jakarta as "YYYY-MM-DD" (default: now). */
export function jakartaDay(date: Date = new Date()) {
  const parts = Object.fromEntries(dayParts.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** "YYYY-MM-DD" plus `days` calendar days (pure calendar arithmetic, no time-zone shift). */
export function addDays(day: string, days: number) {
  const [y, m, d] = day.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

/** Service date assigned to a new registration: Jakarta today + 1 (H+1). Never chosen by the patient. */
export const nextServiceDay = (now: Date = new Date()) => addDays(jakartaDay(now), 1);

const asUtcDate = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return y && m && d ? new Date(Date.UTC(y, m - 1, d)) : null;
};

/** "16 Oktober 2026" for a YYYY-MM-DD day (no time-zone shift). */
export function longDay(day: string) {
  const date = asUtcDate(day);
  return date ? date.toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "UTC" }) : day;
}

/** "Senin, 19 Oktober 2026" for a YYYY-MM-DD day (no time-zone shift). */
export function fullDay(day: string) {
  const date = asUtcDate(day);
  return date ? date.toLocaleDateString("id-ID", { dateStyle: "full", timeZone: "UTC" }) : day;
}

/** "19 Okt" for a YYYY-MM-DD day (no time-zone shift). */
export function shortDay(day: string) {
  const date = asUtcDate(day);
  return date ? date.toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }) : day;
}

const readDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** "08.15" (Asia/Jakarta) for an ISO timestamp, "—" when it cannot be read. Callers add " WIB" when they show the zone. */
export const timeOf = (iso: string) => {
  const date = readDate(iso);
  return date ? date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: SERVICE_TIME_ZONE }) : "—";
};

/** "17 Oktober 2026 pukul 15.32 WIB" (Asia/Jakarta) for an ISO timestamp. */
export const dateTimeOf = (iso: string) => {
  const date = readDate(iso);
  return date ? `${date.toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: SERVICE_TIME_ZONE })} WIB` : "Tanggal tidak diketahui";
};

/** Patient-facing NIK: first 4 and last 4 digits ("3578********0001"). */
export const maskNik = (nik: string) => (nik.length === 16 ? `${nik.slice(0, 4)}********${nik.slice(-4)}` : "—");
/** Staff-facing NIK: only the last 4 digits ("************0007"). */
export const maskNikTail = (nik: string) => `${"*".repeat(Math.max(0, nik.length - 4))}${nik.slice(-4)}`;
