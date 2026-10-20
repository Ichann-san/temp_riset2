import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Block } from "@/components/frame";
import { AppShell } from "@/components/shell";
import { RoleAvatar } from "@/components/role-avatar";
import { type Column, RecordTable, WorkPanel } from "@/components/roles/kit";
import { internal, site } from "@/content";
import { type MockAccount, mockAccounts, roleLabel } from "@/lib/mock-accounts";
import { type Role, landingHref, screenOf, workspaces } from "@/lib/workspaces";

type InternalRole = Exclude<Role, "patient">;

const screenFor = (role: InternalRole, section: string) => {
  const screen = screenOf(role, section);
  if (!screen) throw new Error(`Unknown screen ${role}/${section}`);
  return screen;
};

/** Browser tab title of an internal screen: "{title} | ISLAH". */
export const workspaceMetadata = (role: InternalRole, section: string): Metadata => ({ title: site.pageTitle(screenFor(role, section).title) });

/**
 * Internal role screen (wireframe grammar): title block (screen title + description, left-aligned), then the screen's
 * own blocks (children: one composition from components/roles, e.g. lead, main, aside). The composition variant comes
 * from screens-internal.ts ("work" or "work-hero").
 */
export function Workspace({ role, section, children }: { role: InternalRole; section: string; children: ReactNode }) {
  const screen = screenFor(role, section);
  return <AppShell role={role} section={section} title={screen.title} subtitle={screen.description} compose={screen.compose ?? "work"} align="start">
    {children}
  </AppShell>;
}

const copy = internal.admin;
const homeOf = (account: MockAccount) => (account.role === "admin" ? "/admin" : landingHref(account.role));
const accountColumns: Column<MockAccount>[] = [
  { label: copy.accounts.columns.username, kind: "title", cell: (account) => <code>{account.username}</code> },
  { label: copy.accounts.columns.name, cell: (account) => <span className="account-cell"><RoleAvatar role={account.role} size="sm" />{account.name}</span> },
  { label: copy.accounts.columns.role, compact: true, cell: (account) => roleLabel(account.role) },
  { label: copy.accounts.columns.workspace, compact: true, cell: (account) =>
    <Link className="ws-link" href={homeOf(account)}>{account.role === "admin" ? site.nav.admin.title : workspaces[account.role].label}</Link> },
];

/** Admin area (composition "work"): one table of accounts, each with a link to its role's workspace. Admin is not a PRD role. */
export function AdminPage() {
  return <AppShell role="admin" title={copy.title} subtitle={copy.description} compose="work" align="start">
    <Block id="main" energy={3} protect="fluid">
      <WorkPanel id="admin-accounts" title={copy.accounts.title} description={copy.accounts.description}>
        <RecordTable labelledBy="admin-accounts" rows={mockAccounts} columns={accountColumns} rowKey={(account) => account.username} empty={copy.accounts.empty} width="fit" />
      </WorkPanel>
    </Block>
  </AppShell>;
}
