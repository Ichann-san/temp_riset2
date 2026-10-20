// Same-origin client for the registration API (/api/v1, proxied by next.config.ts). Contract: backend/README.md.
// The token is passed in per call and never logged, stored, or put in URLs/messages.

export type ApplicationState = "awaiting_payment" | "waiting" | "confirmed" | "cancelled";
export type ApplicationPatient = {
  name: string; nik_last4: string; birth_date: string; address_ktp: string; address_home: string;
  phone: string; gender: string; occupation: string;
};
/** One registration application of the calling account. `reference` is a registration code, never a queue number. */
export type Application = {
  id: string; reference: string; service_date: string; state: ApplicationState;
  main_place: "held" | "confirmed" | null; waiting_position: number | null; patient: ApplicationPatient;
  created_at: string; promoted_at: string | null; confirmed_at: string | null; cancelled_at: string | null; updated_at: string;
};
export type ServiceDateStatus = "open" | "closed" | "no_service" | "not_opened";
/** Capacity of one service date: held + confirmed <= main_capacity, waiting <= waiting_capacity. */
export type ServiceDate = {
  today?: string; service_date: string; status: ServiceDateStatus; accepting_applications: boolean;
  main_capacity: number | null; held: number; confirmed: number; main_available: number | null;
  waiting: number; waiting_capacity: number | null; waiting_available: number | null;
};
/** Body of POST /applications: the approved patient form fields (snake_case). */
export type PatientInput = {
  name: string; nik: string; birth_date: string; address_ktp: string; address_home: string; phone: string; gender: string; occupation: string;
};

export type ApiError = { code: string | null; message: string | null; fields?: Record<string, string>; application?: Application; service_date?: string };
export type ApiResult<T> =
  | { ok: true; status: number; data: T; requestId: string | null }
  | ({ ok: false; status: number; requestId: string | null } & ApiError);

export async function apiFetch<T>(token: string, path: string, init: { method?: string; idempotencyKey?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method: init.method ?? "GET", headers, cache: "no-store", body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    return { ok: false, status: 0, code: null, message: null, requestId: null }; // network failure
  }
  const requestId = response.headers.get("X-Request-ID") || null;
  let body: unknown = null;
  try { body = await response.json(); } catch { body = null; }
  if (response.ok && body) return { ok: true, status: response.status, data: body as T, requestId };
  const error = ((body as { error?: Record<string, unknown> } | null)?.error ?? {}) as Record<string, unknown>;
  return {
    ok: false, status: response.status, requestId,
    code: typeof error.code === "string" ? error.code : null,
    message: typeof error.message === "string" ? error.message : null,
    fields: typeof error.fields === "object" && error.fields ? error.fields as Record<string, string> : undefined,
    application: typeof error.application === "object" && error.application ? error.application as Application : undefined,
    service_date: typeof error.service_date === "string" ? error.service_date : undefined,
  };
}

const messages: Record<string, string> = {
  INVALID_ID: "Permintaan tidak valid. Muat ulang halaman lalu coba lagi.",
  INVALID_BODY: "Permintaan tidak valid. Muat ulang halaman lalu coba lagi.",
  INVALID_IDEMPOTENCY_KEY: "Permintaan tidak valid. Muat ulang halaman lalu coba lagi.",
  UNEXPECTED_BODY: "Permintaan tidak valid. Muat ulang halaman lalu coba lagi.",
  INVALID_DATE: "Tanggal tidak valid.",
  UNAUTHORIZED: "Token akses tidak ada atau tidak valid. Masukkan token dari operator.",
  NOT_FOUND: "Pendaftaran tidak ditemukan.",
  VALIDATION_FAILED: "Mohon periksa kembali data pasien.",
  SERVICE_DATE_CHANGED: "Tanggal pemeriksaan sudah berganti. Muat ulang ringkasan lalu konfirmasi lagi.",
  REGISTRATION_NOT_OPEN: "Pendaftaran untuk tanggal pemeriksaan ini belum dibuka atau sudah ditutup.",
  UNFINISHED_APPLICATION: "Akun ini masih memiliki pendaftaran yang belum selesai.",
  ALREADY_REGISTERED_FOR_DATE: "Akun ini sudah memiliki pendaftaran untuk tanggal pemeriksaan ini.",
  DUPLICATE_NIK: "NIK tersebut sudah memiliki pendaftaran untuk tanggal layanan ini.",
  CAPACITY_FULL: "Tempat pemeriksaan dan daftar tunggu untuk tanggal ini sudah penuh.",
  IDEMPOTENCY_CONFLICT: "Permintaan ini bertabrakan dengan pengiriman sebelumnya. Muat ulang halaman lalu coba lagi.",
  CANCEL_NOT_SUPPORTED: "Pendaftaran yang sudah terkonfirmasi belum dapat dibatalkan di aplikasi.",
  TEMPORARILY_UNAVAILABLE: "Server sedang sibuk. Tekan Ulangi.",
};

/** True when the outcome is not definitive (retry with the same Idempotency-Key). */
export function isRetryable(result: ApiResult<unknown>) {
  return !result.ok && (result.status === 0 || result.status >= 500);
}

export type UiError = { message: string; requestId: string | null };

export function errorFor(result: ApiResult<unknown>): UiError {
  if (result.ok) return { message: "", requestId: null };
  if (result.status === 401) return { message: messages.UNAUTHORIZED, requestId: null };
  if (result.code && messages[result.code]) return { message: messages[result.code], requestId: result.status >= 500 ? result.requestId : null };
  if (result.status === 0) return { message: "Terjadi kesalahan: koneksi ke server terputus.", requestId: null };
  return {
    message: result.requestId ? `Terjadi kesalahan. Sebutkan kode ${result.requestId} kepada tim.` : "Terjadi kesalahan. Server tidak memberikan kode permintaan.",
    requestId: null,
  };
}

/** crypto.randomUUID needs a secure context; fall back to getRandomValues (UUID v4). */
export function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
