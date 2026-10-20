# ISLAH MCU — UI Guide

> Full component audit, 19 October 2026: see [component inventory and assets](../plans/2026-10-19-component-style-audit.md). The shared minimalist styling now includes patient forms, all role workspaces, nested controls/states, local role illustrations and the existing hospital logo for application identity.

> Approved implementation update, 19 October 2026: the current frontend retains Montserrat and green `#0E803F` with canvas `#EFF7F3`. See [UI polish implementation](../plans/2026-10-19-ui-polish.md) for the current token sizes, unified filtered panels and dropdown interaction. This update supersedes earlier font/color suggestions below where they differ; it does not alter clinical or registration rules.

> **Diperbarui 18 Oktober 2026:** pasien tidak memilih tanggal (registrasi hanya untuk H+1, tanggal ditetapkan sistem dan ditampilkan); langkah tanggal/`QuotaDatePicker` untuk pasien tidak berlaku. Pengenal dibedakan: kode pendaftaran, referensi pembayaran, tiket sesi registrasi, dan nomor antrian MCU resmi (setelah pembayaran terverifikasi). Isi di bawah dibiarkan sebagai riwayat; rinciannya di [RECONCILIATION_2026-10-18.md](RECONCILIATION_2026-10-18.md).

Status: implementation guide, based on the current PRD and approved architecture. This is a component and interaction specification, not a generated interface or usability-test result.

## 1. Direction

A white, calm hospital service interface. Patients see progress and one next action. Staff see compact worklists, clear patient context, and fast explicit actions. Clinical screens prioritize accuracy over decoration. Use Indonesian labels and familiar hospital terms; internal technical status names never appear as patient instructions.

Local references inform reusable patterns, not copied branding:

| Reference | Reuse |
| --- | --- |
| `competition/caliber2026/website/src/styles/tokens.css` | Semantic tokens, shared spacing, status chips, sidebar structure |
| `work/kp_inbridge/laravel-jakon/resources/css/app.css` | Simple white panels, consistent form/table controls and responsive stacking |
| `work/kp_inbridge/project_maspetruk/src/app/globals.css` | Explicit labels, reusable admin controls, comfortable touch targets |

OpenDesign tools were unavailable in this session; this guide is based on source inspection and the PRD, not an OpenDesign-generated mockup.

## 2. Color and typography tokens

```css
:root {
  --brand-green: #16801C;
  --brand-maroon: #8B1C1A;
  --brand-gold: #CBB62D;
  --surface: #FFFFFF;
  --canvas: #F7F9F7;
  --text: #172033;
  --text-muted: #526052;
  --border: #CBD5CB;
  --action-primary: var(--brand-green);
  --action-primary-text: #FFFFFF;
  --danger: var(--brand-maroon);
  --attention-surface: #FFF8DB;
  --attention-text: #514300;
  --focus-ring: #16801C;
  --radius-control: 6px;
  --radius-panel: 10px;
  --space-unit: 4px;
}
```

White is the base. Green indicates primary actions and confirmed completion. Maroon marks destructive actions/errors sparingly. Gold is an accent/background with dark text; do not use gold text on white or white text on gold for normal labels. Status always includes a label/icon, not color alone. Verify actual component combinations against WCAG contrast requirements: 4.5:1 for ordinary text, 3:1 for large text ([W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)).

Calculated sRGB contrast against white: green 5.07:1, maroon 9.22:1, gold 2.05:1. Green and maroon support white normal-sized button text; gold does not. These calculations do not replace checking focus, disabled controls, overlays and actual rendered screens.

Use a system sans-serif stack for fast loading; optionally a locally hosted Inter font. Patient body text 16px, helper text at least 14px, headings 24–32px. Staff tables may use 14px with 20px line height. Queue numbers use tabular numerals and 32–48px text. Avoid all-caps paragraphs; uppercase normalization applies to identity fields required by PRD, while preserving the user's original input where audit is needed.

## 3. Layout and navigation

- Patient: mobile-first single column, 640–760px readable form width, compact top bar, at most four main destinations: Beranda, MCU Saya, Riwayat, Akun. A sticky next-action button must not hide content or keyboard focus.
- Staff: 240px sidebar, top bar with role/unit/presence, content width 1200–1440px. Worklists fill available width; patient identity remains visible beside the active task.
- Management: date filters and meaningful trend tables, with chart summaries when needed. Do not expose named clinical records by default.
- At narrow widths, patient rows become labeled summaries. Staff tables may scroll horizontally with a persistent patient column; do not squeeze clinical fields into unreadable cards.

## 4. Screen map by role

| Role | Screens | Primary action |
| --- | --- | --- |
| Patient | Login, participant identity, service selection, date/session, review/payment, visit tracking/map, results/history, certificate request, feedback | Continue the current visit task |
| MCU staff | Today's worklist, booking search, re-registration/correction, add patient, service-time log | Validate arrival |
| MCU doctor | Final review inbox, collective CSV import, certificate requests/templates | Verify complete MCU result |
| Unit staff | Unit queue, patient in/out, result form | Record service and submit result |
| Unit doctor | Presence/room, verification inbox, result detail, tariff confirmation | Verify current result revision |
| Management | TAT, bottlenecks, quotas, reviews/complaints | Find operational exceptions |
| Editor | Calendar/quota, packages/services, catalog versions | Publish a valid future configuration |

An account with several roles chooses an explicit workspace. Hiding menu items is convenience; backend authorization provides security.

## 5. Component contracts

| Component | Variants and required behavior |
| --- | --- |
| Button | Primary, secondary, text, danger; 44px patient touch target; loading prevents duplicate submission |
| Field | Persistent label, example, required marker, field error; supports keyboard and screen readers |
| ParticipantSummary | Name, masked NIK, date of birth, relationship; expandable details only when authorized |
| PackageSelector | Haji / CPNS / non-package, included tests, optional additions, server-priced breakdown |
| QuotaDatePicker | Open/closed/full/selected; session label; no invented available dates |
| HoldTimer | Server expiry, descriptive warning and retry; accessible announcements at milestones |
| QueueStatus | Persistent visit number, next unit/room, estimate range, last update, stale/error state |
| WorklistTable | Bounded pagination, search/filter, explicit empty state, state text and patient context |
| ClinicalResultForm | Template version, units/reference fields when approved, draft/submit, field validation |
| VerificationPanel | Current revision, author/time, completeness checklist, reject-with-reason or verify |
| ChargeBreakdown | Initial charge, service charges, approved adjustments, paid amount, balance; no guessed honorarium rules |
| DocumentCard | Type/version, issuer/date, current/superseded, authorized download |
| StatusNotice | Inline success/error/stale/permission feedback with next action |
| ConfirmationDialog | Consequence and patient context; required reason for overrides/corrections |

Shared components receive typed props and semantic variants. Pages compose them rather than duplicating CSS. Keep tokens separate from components and domain-specific behavior. Do not accept arbitrary HTML in clinical templates. Form schemas and API types are versioned alongside the backend contract.

## 6. Critical interaction flows

### Registration

Participant → services → date/session → review → initial payment/status. Keep a visible step indicator and allow back navigation before confirmation. Show package inclusions and optional additions separately. Do not request the same identity twice. Display available quota as advisory until the server creates a hold. On expiry, explain what happened and offer to recheck availability; never show booking success based only on a browser timer or payment redirect.

### Arrival and examination

After staff re-registration, the patient sees “Tujuan berikutnya”, room name, map, estimated wait range, and last update. Display “Menunggu penetapan ruangan” when unassigned. Do not expose other patients' names in public queue views.

Unit staff sees one selected patient, required examination, and explicit Masuk/Keluar controls. Confirm the patient before writing. Keep examination state separate from result-submission state. A failed request shows “Belum tersimpan”; don't optimistically announce clinical completion.

### Verification and payment

Doctor sees the submitted revision and differences from a previous revision. Verify requires a clear confirmation; corrections create a new revision. Stale data forces refresh instead of overwriting another user's work. Tariff confirmation shows server-provided amounts and adjustment reason; zero triggers the PRD warning. Do not implement a “free all charges” switch. Honorarium adjustment authority remains a finance decision.

### Collective import

Choose date/count → hold capacity → upload CSV → show valid/error counts and row-level corrections → review → commit once. Show hold expiry throughout. Error exports mask unnecessary identity fields and escape spreadsheet formulas. Never silently book a subset or another date. Pending-account activation replaces password export only after hospital approval.

## 7. States and accessibility

Every data screen defines loading, empty, success, validation error, forbidden, unavailable, and stale states. Inline success remains visible after an important save; toast messages alone are insufficient. Poll only while visible, back off after errors, and preserve current keyboard focus. Do not re-sort a worklist underneath a focused action without notice.

Keyboard users can reach every control with visible focus. Dialogs trap and restore focus. Errors are associated with fields and summarized at the top. Announce queue updates politely without repeatedly reading the whole page. Respect reduced motion, support 200% zoom, test 320px width, and avoid animations on clinical status changes. Large touch targets and explicit labels take priority over icon-only controls.

## 8. Acceptance checklist

- Patient completes booking on mobile without horizontal scrolling or duplicate entry.
- Staff can identify patient, unit and current state before every mutation.
- Expired session/hold, full quota and payment-pending states have clear recovery actions.
- Result revision conflicts and unsaved changes cannot disappear silently.
- Unauthorized document links fail even if copied to another account.
- Brand colors pass contrast checks in actual components; gold never carries small white text.
- Screen-reader, keyboard, zoom and stale-data checks pass on the principal flows.
- UI contains synthetic data in demos; clinical records never enter analytics/session replay.
