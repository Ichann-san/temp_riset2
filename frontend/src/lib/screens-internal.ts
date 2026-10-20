// Internal role workspaces (Petugas MCU, Dokter MCU, Petugas Unit, Dokter Unit, Manajemen, Editor).
// One screen = one route /{role}/{slug}; the menu lists every screen of a role (menuOf), the first one is the landing
// screen (next.config.ts redirects role roots there). Copy (labels, titles, hints, descriptions) comes from
// src/content/internal.ts; this file only adds routing and the composition variant. Each screen's blocks live in
// src/components/roles/*; records in src/lib/mock-records.ts.
import { internal } from "@/content";
import type { Role, Screen, Variant, Workspace } from "@/lib/screen-types";

type InternalRole = Exclude<Role, "patient">;
type ScreenCopy = { title: string; hint: string; description: string };

const screen = (slug: string, copy: ScreenCopy, compose: Variant = "work"): Screen =>
  ({ slug, title: copy.title, hint: copy.hint, description: copy.description, compose });

function workspace(role: InternalRole, screens: Screen[]): Workspace {
  const { label, description } = internal[role];
  return { label, description, groups: [{ title: label, description, tabs: screens.map((item) => item.slug) }], screens };
}

const c = internal;
export const internalWorkspaces: Record<InternalRole, Workspace> = {
  staff: workspace("staff", [screen("patient", c.staff.patient), screen("worklist", c.staff.worklist)]),
  clinician: workspace("clinician", [screen("review", c.clinician.review), screen("certificates", c.clinician.certificates), screen("collective", c.clinician.collective)]),
  "unit-staff": workspace("unit-staff", [screen("queue", c["unit-staff"].queue, "work-hero"), screen("results", c["unit-staff"].results)]),
  "unit-doctor": workspace("unit-doctor", [screen("review", c["unit-doctor"].review), screen("queue", c["unit-doctor"].queue, "work-hero"), screen("presence", c["unit-doctor"].presence, "work-hero")]),
  management: workspace("management", [screen("reports", c.management.reports), screen("capacity", c.management.capacity), screen("feedback", c.management.feedback)]),
  editor: workspace("editor", [screen("calendar", c.editor.calendar), screen("services", c.editor.services)]),
};
