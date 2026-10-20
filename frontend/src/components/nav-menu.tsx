"use client";

// Header for internal roles and admin, built like the patient header: ISLAH mark + "slot" (the current screen) on the
// left, account on the right. The slot is a button (▾) that drops the role menu down from the header: a top sheet on
// phones, a panel under the slot from 37.5rem (AppDialog placement "top"). Patients see the same slot as a plain
// "Beranda" (they have no other screens), so every role reads the header the same way. Approved 17 Oktober 2026.
import Link from "next/link";
import { useState } from "react";
import { AppDialog } from "@/components/app-dialog";
import { AccountMenu } from "@/components/auth";
import { BrandLogo } from "@/components/brand-logo";
import { Icon, type IconName } from "@/components/icon";
import { site } from "@/content";
import type { Role } from "@/lib/screen-types";

export type NavItem = { title: string; href: string; current: boolean; hint?: string; slug?: string };

const icons: Record<string, IconName> = {
  patient: "register", worklist: "list", review: "check", certificates: "letter", collective: "users",
  queue: "list", results: "edit", presence: "user", reports: "chart", capacity: "gauge", feedback: "chat",
  calendar: "calendar", services: "edit", admin: "grid", workspace: "grid",
};

export function ShellChrome({ items, back, brandHref, label, role }: {
  items: NavItem[]; back?: string; brandHref: string; label: string; role?: Role;
}) {
  const [open, setOpen] = useState(false);
  const current = items.find((item) => item.current);
  const choices = items.length > 1;
  return <>
    <header className="app-header slot-header">
      {back ? <Link className="icon-button" href={back}><Icon name="back" /><span className="sr-only">{site.shell.back}</span></Link>
        : <Link href={brandHref} className="brand-link" aria-label={site.shell.brandHome(label)}><BrandLogo /></Link>}
      {choices
        ? <button type="button" className="slot-button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
          <span>{current?.title ?? label}</span><Icon name="chevron" size={18} /><span className="sr-only">{site.shell.changePage(label)}</span>
        </button>
        : <span className="slot-label">{current?.title ?? label}</span>}
      <AccountMenu role={role} />
    </header>
    {open && <AppDialog placement="top" title={label} description={site.shell.menuDescription} onClose={() => setOpen(false)}>
      <nav aria-label={site.shell.menuLabel(label)}>
        <ul className="slot-menu">{items.map((item) => <li key={item.href}>
          <Link href={item.href} aria-current={item.current ? "page" : undefined} onClick={() => setOpen(false)}>
            <span className="slot-menu-icon"><Icon name={icons[item.slug ?? ""] ?? "next"} /></span>
            <span className="slot-menu-text"><strong>{item.title}</strong>{item.hint && <small>{item.hint}</small>}</span>
            {item.current && <Icon name="check" size={20} />}
          </Link>
        </li>)}</ul>
      </nav>
    </AppDialog>}
  </>;
}
