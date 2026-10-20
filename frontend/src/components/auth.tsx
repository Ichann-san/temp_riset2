"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { RoleSwitcher } from "@/components/role-switcher";
import { BrandLogo } from "@/components/brand-logo";
import { RoleAvatar } from "@/components/role-avatar";
import { type AccountRole, findAccount, landingFor, roleLabel } from "@/lib/mock-accounts";
import { mockSignIn, mockSignOut, useMockAccount } from "@/lib/mock-session";
import type { Role } from "@/lib/workspaces";

/** Client-side access check, not security: signed-out visitors go to login; other roles see a notice. Admin may open every workspace. */
export function AuthGate({ role, children }: { role: AccountRole; children: ReactNode }) {
  const account = useMockAccount();
  const router = useRouter();
  useEffect(() => { if (account === null) router.replace("/"); }, [account, router]);
  if (!account) return <p className="gate-note" role="status">Memuat akun…</p>;
  if (account.role !== role && account.role !== "admin") {
    return <main className="gate">
      <h1>Halaman ini untuk peran {roleLabel(role)}</h1>
      <p>Akun {account.name} ({roleLabel(account.role)}) tidak memiliki akses ke halaman ini.</p>
      <Link className="primary-button" href={landingFor(account)}>Kembali ke ruang kerja saya</Link>
    </main>;
  }
  return children;
}

export function AccountMenu({ role }: { role?: Role }) {
  const account = useMockAccount();
  const router = useRouter();
  if (!account) return null;
  return <details className="account-menu">
    <summary aria-label={`Akun ${account.name}`}><RoleAvatar role={account.role} />
      <span className="account-text"><strong>{account.name}</strong><small>{roleLabel(account.role)}</small></span></summary>
    <div className="menu-panel">
      <div className="account-panel-head"><RoleAvatar role={account.role} /><p><strong>{account.name}</strong><small>{roleLabel(account.role)}</small></p></div>
      {account.role === "admin" && <>
        <Link href="/admin">Area admin</Link>
        <RoleSwitcher role={role} />
      </>}
      <button type="button" className="primary-button" onClick={() => { mockSignOut(); router.replace("/"); }}>Keluar</button>
    </div>
  </details>;
}

/** Wireframe "Login": Welcome, ISLAH, username, password, submit. */
export function LoginForm() {
  const account = useMockAccount();
  const router = useRouter();
  const [error, setError] = useState(false);
  useEffect(() => { if (account) router.replace(landingFor(account)); }, [account, router]);
  return <main className="login">
    <h1>Selamat datang</h1>
    <form className="surface login-card" onSubmit={(event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const found = findAccount((form.elements.namedItem("username") as HTMLInputElement).value, (form.elements.namedItem("password") as HTMLInputElement).value);
      setError(!found);
      if (found) mockSignIn(found.username);
    }}>
      <div className="login-head"><BrandLogo large /><p className="login-brand">ISLAH</p>
        <p className="login-sub">Medical Check Up RSUD Haji Provinsi Jawa Timur</p></div>
      <label>Username<input className="field" name="username" autoComplete="username" required aria-invalid={error || undefined} /></label>
      <label>Password<input className="field" name="password" type="password" autoComplete="current-password" required aria-invalid={error || undefined} /></label>
      {error && <p className="field-error" role="alert">Username atau password salah.</p>}
      <button type="submit" className="primary-button">Masuk</button>
    </form>
  </main>;
}
