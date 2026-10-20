import Link from "next/link";
import type { ReactNode } from "react";
import { AccountMenu, AuthGate } from "@/components/auth";
import { BrandLogo } from "@/components/brand-logo";
import { Compose, Icon, TitleBlock } from "@/components/frame";
import { type NavItem, ShellChrome } from "@/components/nav-menu";
import { site } from "@/content";
import { type Role, type Size, type Variant, landingHref, menuOf, screenHref, screenOf, workspaces } from "@/lib/workspaces";

export { Icon } from "@/components/frame";

export function Section({ title, description, action, children, className = "" }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`surface section ${className}`}><div className="section-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>{children}</section>;
}

export function EmptyState({ title, description = site.messages.emptyDefault }: { title: string; description?: string }) {
  return <div className="empty-state"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h3"/></svg><h3>{title}</h3><p>{description}</p></div>;
}

function navFor(role: Role | "admin", section?: string): NavItem[] {
  if (role === "admin") return [{ title: site.nav.admin.title, href: "/admin", current: true, hint: site.nav.admin.hint, slug: "admin" },
    ...(Object.keys(workspaces) as Role[]).map((key) => ({ title: workspaces[key].label, href: landingHref(key), current: false, hint: workspaces[key].description, slug: "workspace" }))];
  return menuOf(role).map((item) => ({ title: item.title, href: screenHref(role, item.slug), current: item.slug === (section ?? ""), hint: screenOf(role, item.slug)?.hint, slug: item.slug }));
}

function PatientFooter() {
  const { footer, brand } = site;
  return <footer className="patient-footer">
    <p><span>{footer.help}</span></p>
    <p><span>{brand.name} | {brand.institution}</span><span>{brand.copyright}</span></p>
  </footer>;
}

export type Crumb = { title: string; href: string };

/** Patient header: back (inner pages) or the ISLAH mark (Beranda) on the left, breadcrumb, account on the right. No drawer. */
function PatientHeader({ back, crumbs }: { back?: string; crumbs: Crumb[] }) {
  return <header className="app-header patient-header">
    {back ? <Link className="icon-button" href={back}><Icon name="back" /><span className="sr-only">{site.shell.back}</span></Link>
      : <Link href="/patient" className="brand-link" aria-label={site.shell.brandHome("Beranda")}><BrandLogo /></Link>}
    <nav className="crumbs" aria-label={site.shell.crumbs}><ol>{crumbs.map((crumb, index) => <li key={crumb.href}>
      {index < crumbs.length - 1 ? <Link href={crumb.href}>{crumb.title}</Link> : <span aria-current="page">{crumb.title}</span>}
    </li>)}</ol></nav>
    <AccountMenu role="patient" />
  </header>;
}

/**
 * One shell for every role (wireframe grammar): header (menu | back | none; patients: back + breadcrumb) → <main> container → <Compose> with the title
 * block first, then the page's blocks. Internal roles and admin switch screens through the header slot menu (nav-menu.tsx).
 */
export function AppShell({ role, section, title, subtitle, header = "menu", back, crumbs, compose = "center", size, anchored, align, footer, menuBackground = false, children }: {
  role: Role | "admin"; section?: string; title?: string; subtitle?: string; header?: "menu" | "back" | "none"; back?: string; crumbs?: Crumb[];
  compose?: Variant; size?: Size; anchored?: boolean; align?: "start"; footer?: boolean; menuBackground?: boolean; children: ReactNode;
}) {
  const internal = role !== "patient";
  const label = role === "admin" ? site.nav.adminRole : workspaces[role].label;
  return <AuthGate role={role}><div className="shell" data-kind={internal ? "internal" : "patient"} data-compose={compose} data-size={size} data-background={menuBackground ? "menu" : undefined}>
    {menuBackground && <div className="menu-lines" aria-hidden="true">
      {(["green", "maroon", "gold"] as const).flatMap((color) =>
        (["arc", "bend", "loop", "sweep"] as const).map((shape) =>
          <span key={`${color}-${shape}`} className="menu-line" data-color={color} data-shape={shape} />))}
    </div>}
    <a className="skip-link" href="#main-content">{site.shell.skipLink}</a>
    {header !== "none" && role === "patient" && crumbs && <PatientHeader back={header === "back" ? back : undefined} crumbs={crumbs} />}
    {header !== "none" && !(role === "patient" && crumbs) && <ShellChrome items={navFor(role, section)} back={header === "back" ? back : undefined}
      brandHref={role === "admin" ? "/admin" : landingHref(role)} label={label} role={role === "admin" ? undefined : role} />}
    <main id="main-content" className="main-content">
      <Compose variant={compose} size={size} anchored={anchored} align={align}>
        {title && <TitleBlock title={title} subtitle={subtitle} />}
        {children}
      </Compose>
    </main>
    {footer && <PatientFooter />}
  </div></AuthGate>;
}
