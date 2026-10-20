# MCU component styling audit

19 October 2026. Extends the approved minimalist UI polish to the full component hierarchy. Scope: presentation and existing interactions. Registration, capacity, payment, clinical and backend rules stay unchanged.

## Inspection and design

Captured 15 representative screens at 390px and 1440px before edits. Inspected current source, the existing hospital logo, and a contact sheet of all 21 Caliber avatars. Graphify supplied a component map; stale references were checked against current files.

Retain green MCU branding, white panels, mint canvas and local Montserrat. Use the 4px spacing scale, 12px panels, 8px controls, 6px statuses, 18px panel headings, 14px labels/table text and 13px supporting text. Patient controls retain 16px text. Avatars, numbered steps and success badges are deliberately circular; counters and progress indicators stay compact.

## Inventory and changes

Files below are relative to `frontend/src/components`. All levels were reviewed, including elements inherited from shared CSS; files need no individual edit when their shared component already supplies the corrected styling.

| Files | Components / nested elements | Treatment |
| --- | --- | --- |
| `shell.tsx`, `nav-menu.tsx`, `workspace.tsx`, `patient-page.tsx` | AppShell, PatientHeader, ShellChrome, Section, EmptyState, Workspace, AdminPage, titles, menu entries, account rows, footer, skip link | Hospital logo replaces letter mark. Consistent panel, text and menu styling; avatar in admin account rows. Routes, reading order and access checks preserved. |
| `auth.tsx`, `role-switcher.tsx` | LoginForm, AccountMenu, AuthGate, role select, avatar, popup, invalid credentials, loading/access notices, sign-out | Real hospital artwork, role avatar, bounded popup, consistent labels and controls. |
| `brand-logo.tsx`, `role-avatar.tsx` | Image primitives | Local images with explicit dimensions; contain logo / cover avatar. Decorative avatars keep meaning in textual role labels. |
| `frame.tsx` | Compose, Block, TitleBlock, Alert, BigNumberCard, ListCard, SummaryBox, MediaArea, BottomAction, SuccessPanel | Preserve composition grammar. Unified padding, headings, summary rows, semantic alerts and success panels. Remove decorative dot backgrounds and success shadows. |
| `fields.tsx` | Field, SelectField, StarRating, labels, hints, errors, inputs, selects, textareas, star radios | Reuse existing chevron for styled native selects. Preserve keyboard/mobile picker, values and form submission. Forward id, description and invalid state to the actual select. Align hover/focus/error/disabled/readonly states. |
| `status-filter.tsx`, `table-filters.tsx` | Combobox, listbox options, active/selected/count states, search, reset, result count | Retain shared filtering behavior; align spacing, shapes and popover shadow. |
| `roles/kit.tsx`, `roles/detail-pane.tsx`, `roles/selection.ts` | WorkPanel, RecordTable, Toolbar, Band, Counts, Rows, Status, RowAction, DetailHead/Empty, Notice, Actions, Placeholder, detail dialogs | Unified row actions, empty states, placeholders, summaries, status tones and quieter mobile selection. Sticky headers, scroll regions and dialog focus retained. |
| `patient.tsx`, `patient-dialog.tsx` | PatientHome, greeting, ApplicationRow/Facts, CancelControl, History, MapView, bento, status, intercepted dialogs | Greeting avatar; consistent cards, notes, destructive confirmation and history. Keep cancellation focus behavior. |
| `patient-registration.tsx` | RegistrationForm, StepRail, ServiceDate, TermsStep, ServicesStep, ReviewStep, DoneStep; radios/checkboxes, disclosures, included services, summaries | White form surface; consistent date, steps, selected packages, terms and final confirmation. Existing H+1 and identity rules unchanged. |
| `patient-forms.tsx` | FeedbackForm, CertificateForm, Sent; rating, conditional purpose, submitted summaries, validation | Shared surfaces, select, error and submitted states; responsive targets checked. |
| `registration.tsx`, `review-token.tsx`, `capacity.tsx` | Connected registration, token form/saved state, ErrorNotice/retry, loading, capacity query/counts/history | Shared Field and Alert replace inline presentation. API payloads, token lifetime, retry and manual-read behavior unchanged. |
| `roles/staff-patient.tsx`, `roles/staff-worklist.tsx`, `roles/identity.tsx` | Search/filter, identity editing, verification, prices, mini-tables, timings | Shared styling reaches nested fields/actions; gender select keeps its original value/callback. |
| `roles/clinician-review.tsx`, `roles/clinician-certificates.tsx`, `roles/clinician-collective.tsx` | Drafts, certificates, filters, mismatch confirmations, letter detail, deferred action | Preserve earlier table polish; shared states and hints now consistent. No deferred feature enabled. |
| `roles/unit-queue.tsx`, `roles/unit-staff-queue.tsx`, `roles/unit-doctor-queue.tsx`, `roles/unit-doctor-presence.tsx` | Serving number, queue, enter/exit, presence toggle/log, result links, notices | Consistent number cards, summaries, alerts and button states. Unit logic and calculations preserved. |
| `roles/unit-staff-results.tsx`, `roles/unit-doctor-review.tsx` | Result input, template, revisions, verification, honor field, validation, confirmation | Shared form/detail styling; no fee or verification rule changes. |
| `roles/management-reports.tsx`, `roles/management-feedback.tsx`, `roles/management-capacity.tsx` | Period inputs, summaries, feedback filters/details, capacity wrapper, chart placeholder | Unified panels and controls. Report calculations and filter behavior retained. |
| `roles/editor-calendar.tsx`, `roles/editor-services.tsx` | Date/service rows, status select, quota, locked form, service textarea, save states | Styled status select. Disabled quota uses a wrapping textarea so its complete 100 + 50 value remains visible; field name/value and disabled state retained. |
| `icon.tsx` | Existing icon family | Reused, including select chevrons; no new icon package/family. |

Shared styles stay in `globals.css`, `patient.css` and `internal.css`. No competing theme, backend change or new dependency.

## Role assets

Caliber actually contains 21 SVG avatars: seven character groups with variants `a`, `b`, `c`. These are generic illustrations, not six hospital-specific portraits. Eight existing account roles (including admin) use eight distinct files:

| Role | Caliber file |
| --- | --- |
| Patient | `user-01a.svg` |
| MCU staff | `user-04b.svg` |
| MCU doctor | `user-02a.svg` |
| Unit staff | `user-06b.svg` |
| Unit doctor | `user-05a.svg` |
| Management | `user-07b.svg` |
| Editor | `user-03c.svg` |
| Admin | `user-02c.svg` |

Source: workspace `competition/caliber2026/website/public/avatars`; selected files copied byte-for-byte to `frontend/public/images/roles`. Mapping lives in `role-avatar.tsx`. Images identify UI roles, not actual personnel, uniforms or demographic requirements.

## Hospital identity

Existing `frontend/src/assets/logo.png` (RSUD Haji Provinsi Jawa Timur) is used intact in login/header through BrandLogo. The supplied source is not overwritten. Existing Next file conventions provide `src/app/icon.png` (512px), `src/app/apple-icon.png` (180px), and replaced `src/app/favicon.ico` (16/32/48/256px). Derived files remove only exterior white margin, retain the entire artwork and wordmark, and fit it on a white square. RGBA PNG entries inside ICO are required by Next's decoder. No alternate hospital artwork or Caliber company branding used.

## Verification

- ESLint, TypeScript and final production build passed. `git diff --check` passed (only the repository's usual LF/CRLF conversion notices).
- Full route audit: 29 routes at 390/768/1024/1440px, with no overflow, unexpected runtime/console errors or prohibited development labels. Expected registration guards/retired-route redirects remained intact.
- Focused final browser suites: 247 passing assertions (82 table/shared dropdown regression checks, 58 worklist/feedback checks, 85 component-state checks, 22 final interaction checks). Included 320px layouts; all eight role avatars; native select labels/values/descriptions; invalid hover; focus restoration; ratings; conditional certificate fields; registration through confirmation; cancellation; presence/queue actions; disabled/locked states; reduced motion; icon routes and byte-for-byte avatar integrity.
- The invalid-field hover issue found during testing was fixed, then the focused suites rerun. API error/retry presentation used an intercepted synthetic response; no backend or real patient data was accessed for that check.
- Desktop/mobile screenshots and intermediate form/dialog states were visually inspected. A screenshot captured during navigation animation was recaptured after motion completed; dialog opacity and bounds were verified.
- Temporary screenshots and browser fixtures remain outside the repository. Browser automation is not a substitute for manual screen-reader/usability testing.

## Content still unavailable

Actual hospital floor plan, unit result templates, final certificate/draft artwork and hourly queue chart remain existing placeholders, now styled consistently. No clinical content is invented. Collective/walk-in additions and payment remain deferred.
