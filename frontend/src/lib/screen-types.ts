// UI metadata types only. No patient, clinical, financial or operational records.
export type Role = "patient" | "staff" | "clinician" | "unit-staff" | "unit-doctor" | "management" | "editor";
// Composition variants of the content-aware desktop method (docs/plans/2026-10-16-wireframe-v2-desktop-design.md §3).
export type Variant = "center" | "home" | "hero-split" | "form-rail" | "list-summary" | "pair" | "rows" | "work" | "work-hero";
// Track size for single-track variants: form 40rem, narrow 35rem, hero 30rem, text 68ch, wide 69rem.
export type Size = "form" | "narrow" | "hero" | "text" | "wide";
// One screen = one route /{role}/{slug}. header: wireframe header variant; back: target of the back button.
// subtitle: line under the title block; anchored: primary action anchored low on short mobile screens (cancelled from c1);
// untitled: no title block, the page renders its own h1 (wireframe frames without a page title).
export type Screen = {
  slug: string; title: string; description: string;
  header?: "menu" | "back" | "none"; back?: string; compose?: Variant; size?: Size;
  subtitle?: string; anchored?: boolean; untitled?: boolean;
  hint?: string; // one line under the screen name in the header slot menu (internal roles)
};
// A group is one navigation destination; its screens are tabs (menu entries in order).
export type Group = { title: string; description: string; tabs: string[] };
// menu = explicit menu destinations (slug "" = role home); without it the menu lists the role's screens.
export type Workspace = { label: string; description: string; menu?: { title: string; slug: string }[]; groups: Group[]; screens: Screen[] };
