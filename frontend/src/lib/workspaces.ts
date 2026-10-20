// Role workspaces: patient screens (screens-patient.ts) and internal roles (screens-internal.ts).
import type { Role, Workspace } from "@/lib/screen-types";
import { internalWorkspaces } from "@/lib/screens-internal";
import { patientWorkspace } from "@/lib/screens-patient";

export type { Group, Role, Screen, Size, Variant, Workspace } from "@/lib/screen-types";

export const workspaces: Record<Role, Workspace> = { patient: patientWorkspace, ...internalWorkspaces };

export const screenHref = (role: Role, slug: string) => (slug ? `/${role}/${slug}` : `/${role}`);
export const screenOf = (role: Role, slug: string) => workspaces[role].screens.find((screen) => screen.slug === slug);
// Patients land on Beranda; other roles land directly on their first work screen (role roots redirect there, see next.config.ts).
export const landingHref = (role: Role) => (workspaces[role].menu ? `/${role}` : screenHref(role, workspaces[role].groups[0].tabs[0]));
// Menu destinations: explicit menu, else every screen of the role's groups in order (tabs become menu entries).
export const menuOf = (role: Role) => workspaces[role].menu
  ?? workspaces[role].groups.flatMap((group) => group.tabs).map((slug) => ({ title: screenOf(role, slug)?.title ?? slug, slug }));
