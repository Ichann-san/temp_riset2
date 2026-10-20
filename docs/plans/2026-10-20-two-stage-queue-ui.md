# Two-stage queue UI

Approved by the owner on 20 October 2026. This decision supersedes earlier UI requirements that tied queue-number issuance to an administration payment. “BA admin” was confirmed to mean “biaya admin”.

## User-visible flow

1. Submit registration. Immediately display **Nomor antrean pendaftaran** and the assigned H+1 service date.
2. Bring that number to the hospital for identity checks and re-registration.
3. Staff finish re-registration. Only then display **Nomor antrean MCU** and mark the patient ready for examinations.

The application reference remains a separate identifier. No administration-payment screen, payment prerequisite or “Menunggu pembayaran” label remains in this UI flow. Examination prices and other financial features are outside this change.

The browser-only registration uses `registrationQueue` and nullable `mcuQueue`, with separate `registered` and `re_registered` states. Old saved registrations lacking a queue number remain readable without relabeling their application reference as a queue number. `P-001` and `MCU-001` are presentation formats, not approved hospital-wide numbering contracts. Local allocation includes cancelled numbers when choosing the next registration number, so cancellation does not reuse them in the same tab/date.

## Background

Use four static CSS line templates in green, maroon, and gold (12 combinations) on a transparent layer behind the content. Some curves cross the middle; others frame the edges. Mobile retains a smaller selection. No animation, extra dependency, foreground overlay or pointer target. Content surfaces remain opaque. Disable the decoration for printing and forced-colors mode.

Scope: patient Beranda, the admin menu, and internal workspace destinations explicitly listed in each role's menu. Internal list/workspace pages serve as submenu landings. Registration steps, patient detail/form pages, login and dialog surfaces do not acquire this background. A patient dialog opened over Beranda naturally retains the underlying Beranda decoration.

## Boundaries

This is a frontend change. No backend, migration, capacity rule or payment integration is changed. The token-connected registration screen still receives the old backend states; it describes a held place neutrally and explicitly says server queue-number issuance is unavailable. A server registration reference or FIFO waiting position is never presented as either queue number.

Patient registrations live in tab session storage; internal staff actions still use the existing independent in-memory records. Staff verification updates its local record and issues an MCU number once. It does not update a patient's separate session, create an actual clinical queue entry or survive a reload. Production must implement transactional numbering, re-registration authorization and synchronization before this becomes an operational hospital workflow.
