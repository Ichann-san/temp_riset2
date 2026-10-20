"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import type { UiError } from "@/lib/api";
import { Alert, Field } from "@/components/frame";

// Access token for the registration API (issued by an operator with `flask create-client`). Lives in React state only:
// never in localStorage, sessionStorage, cookies, IndexedDB, the URL, or the console. It survives <Link> navigation and
// is lost on reload.
type TokenContext = { token: string | null; setToken: (token: string) => void; clearToken: () => void };

const ReviewTokenContext = createContext<TokenContext | null>(null);

export function ReviewTokenProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  return <ReviewTokenContext.Provider value={{ token, setToken: (value) => setTokenState(value), clearToken: () => setTokenState(null) }}>
    {children}
  </ReviewTokenContext.Provider>;
}

export function useReviewToken() {
  const context = useContext(ReviewTokenContext);
  if (!context) throw new Error("ReviewTokenProvider missing");
  return context;
}

/** Password input + "Hapus token". `onSaved` receives the new token so callers can load data immediately. */
export function TokenPanel({ onSaved, onCleared }: { onSaved?: (token: string) => void; onCleared?: () => void }) {
  const { token, setToken, clearToken } = useReviewToken();
  if (token) {
    return <div className="token-actions">
      <p>Token akses tersimpan di memori halaman ini saja dan hilang saat halaman dimuat ulang.</p>
      <button type="button" className="secondary-button" onClick={() => { clearToken(); onCleared?.(); }}>Hapus token</button>
    </div>;
  }
  return <form className="token-form" onSubmit={(event) => {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("access-token") as HTMLInputElement;
    const value = input.value.trim();
    input.value = "";
    if (!value) return;
    setToken(value);
    onSaved?.(value);
  }}>
    <Field label="Token akses dari operator">
      <input className="field" name="access-token" type="password" autoComplete="off" required />
    </Field>
    <button type="submit" className="primary-button">Gunakan token</button>
  </form>;
}

export type Failure = UiError & { retry?: () => void };

/** Error of the last API call; "Ulangi" only when the outcome was not definitive (network, 5xx). */
export function ErrorNotice({ error, busy }: { error: Failure | null; busy: boolean }) {
  if (!error) return null;
  return <Alert tone="error" action={error.retry && <button type="button" className="secondary-button" disabled={busy} onClick={error.retry}>Ulangi</button>}>
    <p>{error.message}{error.requestId && <> Kode: <code>{error.requestId}</code></>}</p>
  </Alert>;
}
