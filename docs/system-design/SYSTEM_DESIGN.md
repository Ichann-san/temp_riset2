# ISLAH MCU — System Design

> **Diperbarui 18 Oktober 2026:** baris "Mandatory H-1-only registration ... not retained" pada tabel baseline digantikan: pemilik menetapkan registrasi hanya untuk H+1 (tanggal ditetapkan sistem, Asia/Jakarta). Kapasitas 100 tempat utama + 50 daftar tunggu per tanggal layanan; durasi hold tidak ditetapkan dan tanpa pelepasan berbasis timer; nomor antrian setelah pembayaran terverifikasi; akun terpisah dari pasien (satu registrasi per akun per hari). Smart queue: [SMART_QUEUE_DESIGN.md](SMART_QUEUE_DESIGN.md). Isi di bawah dibiarkan sebagai riwayat; rinciannya di [RECONCILIATION_2026-10-18.md](RECONCILIATION_2026-10-18.md).

> Revisi 12 Oktober 2026: kapasitas registrasi dan implementasi minimum mengikuti [REGISTRATION_BACKEND.md](REGISTRATION_BACKEND.md). Batas 100 peserta/hari dan asumsi 10.000 akun pada baseline di bawah bersifat historis, tidak dipakai oleh backend registrasi terbaru.

| Metadata | Value |
| --- | --- |
| Date / status | 2026-10-08 / implementation baseline; hospital policy questions open |
| Source | `docs/Digitalisasi MCU RSUD Haji.md`, Chapters 1–3 and UC01–UC28 |
| Decision | User approved option 1 and PRD precedence |
| Authors / owner | Development team / hospital product owner, named owners to be assigned |
| Reviewers | Supervisor, MCU doctor, unit doctor, finance, hospital IT |
| Scope | Web registration through verified results, certificates, and management reporting |

## 1. Abstract

Build two role-specific Next.js web portals backed by one modular Flask codebase and PostgreSQL. PostgreSQL owns identity links, quotas, queues, examination results, billing, and audit records. Structured examination variations use validated JSONB; PDFs and uploads use private object storage. Background workers process imports, PDFs, and notifications from a durable database outbox.

The public portal exposes patient operations. The internal portal uses private ingress and staff authentication. Separate API deployments expose different route sets while reusing domain modules. Authorization remains mandatory on every request. Network separation reduces exposure; it does not make the internal system impossible to attack.

## 2. Goals and non-goals

### Goals

- One patient identity and one queue identifier per MCU visit, preserved across units.
- Enforce daily and examination-specific capacity without overselling under concurrent requests.
- Give patients one clear next action; give staff compact queues and reliable in/out controls.
- Separate physical examination completion, result verification, payment, and delivery states.
- Trace corrections, verifications, tariff changes, and document access.
- Support 100 patients/day initially, with seasonal web traffic handled independently of clinical capacity.

### Non-goals for the first release

- Microservices, Kubernetes, Cassandra, and a second authoritative patient database.
- Automated diagnosis or invented clinical sequencing rules.
- A selected payment vendor, SIMRS/RR/Dukcapil integration contract, or payroll calculation.
- A guarantee that all results finish the same day: this is the PRD service objective, dependent on clinical operations.

Ten thousand users is treated as an account population assumption, not measured simultaneous traffic. Confirm concurrency, peak requests, report size, and connection limits before sizing infrastructure.

## 3. Background and source authority

The PRD identifies duplicate registrations, fragmented unit data, unpredictable waits, and delayed result delivery. Its centralized database and seven operational roles are the baseline.

| Topic | Current baseline | Earlier rule superseded or unresolved |
| --- | --- | --- |
| Registration date/sessions | Configurable registration sessions and hospital calendar | Mandatory H-1-only registration and no sessions are not retained |
| Quota | Maximum 100 patients/day; service-specific capacity | No fixed 60/66 collective allocation without new approval |
| Initial payment | Admin fee before queue-number acceptance; final settlement after services | Earlier entirely free registration is not the current baseline |
| Collective registration | MCU doctor imports CSV (UC15) | Client-managed upload role and XLSX support are not assumed |
| Queue activation | Staff validates re-registration (UC10) | QR room entry and forced no-exit policy are not prerequisites |
| Hold timeout | Configurable, server-enforced, duration to be decided | Do not hard-code the former two-minute rule |
| Examination ordering | Eligible next unit selected using approved constraints | No universal lab two-hour interval or fixed test order inferred |
| Packages | Haji, CPNS, non-package; optional additional services | Optional tests are not exclusive to regular/non-package |
| Charges | Unit doctor confirms service tariff (UC22.2) | Honorarium decomposition/discount authority needs finance confirmation |
| Verification | Unit doctor verifies; MCU doctor verifies final result | Do not require exactly two individual doctors per unit |

PRD inconsistencies are recorded, not silently resolved: UC03 title versus payment description; UC15 copy-pasted description versus CSV flow; UC27 work-time title versus calendar/quota flow. Detailed flows and Chapter 1.2 guide this design, subject to hospital review.

### Requirement traceability

| PRD | Module | Main acceptance condition |
| --- | --- | --- |
| UC01–03 | Registration, catalog, billing | Validated identity, at least one service, server-priced summary |
| UC04–05 | Queue, location | Own current number, updated estimate, assigned room and map |
| UC06–08 | Documents, history, feedback | Authorized history; eligible certificate request; post-service feedback |
| UC09–12 | MCU operations | Staff recheck/correct registration; worklist; event-based service times |
| UC13–17 | Final verification, import, documents | All unit results verified; collective validation; controlled PDF delivery |
| UC18–22 | Unit operations | Staff entry/in-out; doctor presence, verification barcode and tariff confirmation |
| UC23–26 | Reporting | Aggregated TAT, bottlenecks, feedback and specialty capacity |
| UC27–28 | Administration | Calendar constraints; safe service catalog updates |

## 4. Proposed architecture

See [ARCHITECTURE.mmd](ARCHITECTURE.mmd).

| Component | Responsibility | Failure behavior |
| --- | --- | --- |
| Public Next.js portal | Registration, payment status, queue, maps, own results | Preserve non-sensitive form progress in memory; show retry/stale state |
| Internal Next.js portal | Staff and doctor worklists, verification, management | Show stale banner; disable uncertain mutations until server reconciliation |
| Public API / internal API | Separate Flask entrypoints, shared modules, request authorization | Structured errors, idempotent retry, no public staff routes |
| PostgreSQL | Transactional source of truth; sessions; outbox; JSONB templates/results | Fail closed for writes; recover using tested backups/failover |
| Worker | CSV processing, PDFs, delivery, expiry and reports | Retry with backoff; dead-letter status; operator replay |
| Object storage | Private uploads, PDFs, map assets | Keep document generation pending; never mark delivery successful early |
| Payment gateway | Provider TBD; signed events and reconciliation | Pending state; retries and finance review; never infer success from redirect |
| Identity adapter | RR/SIMRS/Dukcapil interface TBD | Explicit pending/manual verification path approved by hospital |
| WhatsApp adapter | Result/certificate notification | Track retry/failure independently of verified result |

### Modular code structure

```text
backend/
  app/
    __init__.py                 # create_app(config, surface)
    api/{public,internal,webhooks}/
    modules/
      identity/ catalog/ registration/ queue/ examinations/
      billing/ documents/ notifications/ reporting/ audit/
    infrastructure/            # SQLAlchemy, storage, adapters, worker
    common/                    # errors, authorization, clock, idempotency
  migrations/ tests/
frontend/                      # current prototype; migration planned
  apps/{patient,staff}/         # proposed target, not created by this design
  packages/{ui,tokens,api}/
```

Routes validate input and permissions, services enforce workflows, repositories execute transactions, adapters isolate external vendors. Keep dependencies explicit; avoid a generic repository framework or splitting every module into a network service. Flask application factories support isolated configuration and testing ([Flask documentation](https://flask.palletsprojects.com/en/stable/patterns/appfactories/)).

### Rendering and scaling

Use client-rendered authenticated workspaces fetching JSON from Flask. Next.js may serve a static public shell; `use client` alone does not mean all initial HTML is client-only ([Next.js documentation](https://nextjs.org/docs/app/getting-started/server-and-client-components)). Never embed patient data in shared CDN caches. Same-origin API routing permits HttpOnly cookies without exposing tokens to browser storage.

Docker packages API and worker consistently. Compose is suitable for development and a controlled single-host pilot, but is not high availability by itself ([Docker production guide](https://docs.docker.com/compose/how-tos/production/)). Production recommendation: managed container platform, load balancer, minimum two stateless API replicas if availability requires it, bounded autoscaling, private managed PostgreSQL with pooled connections, separate worker concurrency. Provider/on-premise placement remains open.

Start live views with conditional polling every 10–15 seconds while visible, plus refresh after writes. This is a proposed interpretation of “real time,” subject to acceptance. At 10,000 concurrent viewers, ten-second polling alone is about 1,000 requests/second; do not assume it is cheap. Introduce authenticated SSE if latency or measured traffic justifies it. Autoscaling does not increase the hospital's 100-patient clinical limit.

## 5. Request and patient lifecycle

1. Patient logs in, selects self/authorized dependent, validates identity, accepts recorded terms, selects date/session and package plus optional services. Server resolves prices and service versions.
2. Transaction holds daily/session/service capacity. Payment adapter creates the initial charge. On verified settlement, convert the hold to a booking and allocate the persistent visit queue number. Exact number issuance versus on-site activation needs hospital confirmation; number allocation and active queue eligibility remain separate.
3. Patient arrives. MCU staff rechecks booking and identity and activates the visit. A booking alone does not assign the patient to a clinical room.
4. Scheduler chooses an eligible outstanding examination and room. Staff confirms in/out. Movement and timestamps update the next-unit view and wait estimate.
5. Unit staff submits results against a versioned template. On-duty unit doctor verifies the submitted revision and confirms tariff. A unique verification token is issued; scanning exposes only authorized verification metadata.
6. Patient may move to another eligible examination while previous results await verification. Physical room release and data approval must not share one blocking state.
7. MCU doctor finalizes only when all required services are completed and their current result revisions verified. Corrections after verification require a new revision and explicit re-verification; previously released PDFs remain identifiable as superseded.
8. Final bill reconciles approved service charges and the initial payment without double charging. Whether unpaid bills block result release is unresolved; model the states separately.
9. Generate a versioned PDF and notify through WhatsApp. Recommended delivery is an authenticated portal link rather than a permanent public PDF URL; confirm attachment policy with hospital. Patient accesses history and may request a certificate within the PRD's one-day window. Calendar-day versus 24-hour semantics require confirmation.

### Collective registration

MCU doctor selects date and participant count, reserves capacity, uploads CSV, and reviews per-row validation errors. Proposed behavior is all-or-nothing booking for a validated batch; any partial acceptance or rollover needs explicit UI and hospital agreement. Never silently move patients to another day. Hold duration is configurable and visible. Duplicate identities reuse patients rather than creating duplicate clinical records.

UC15 mentions temporary accounts and credentials CSV. Recommended security adjustment: create pending accounts with short-lived one-time activation invitations, not reusable plaintext passwords in CSV. This deviation requires approval before implementation. An existing account must not be overwritten by an import.

### Queue scheduling

Model a network of unit queues with multiple rooms/servers, not one universal single-server queue. The scheduler is a policy module within the backend. Hard constraints first: required exam, presence/room capacity, completed prerequisites, earliest eligible time, visit active, and no other assignment in progress. Then rank eligible choices using estimated wait, service duration and aging; use arrival order as a deterministic tie-breaker. All weights and clinical constraints require operational validation. “Best fit” alone is not a complete policy and shortest-job-first can starve long exams.

Assign under a transaction with row locks; reserve one target, return a reason and estimate range, permit audited staff override. Result-verification delay is distinct from physical service time. No two-hour lab rule is active until the hospital specifies applicable test, interval anchor, and permitted intervening tests. Simulate historical/synthetic arrivals before enabling automatic routing; launch initially with staff-confirmed recommendations.

## 6. API and data contracts

All endpoints use `/api/v1`, UUID resource IDs, UTC ISO timestamps, operational date in `Asia/Jakarta`, pagination and bounded filters. Browser requests carry a correlation ID. Mutating retryable requests use an `Idempotency-Key` scoped to actor and action. State-changing requests use CSRF protection with cookie sessions.

| Surface | Example endpoint | Access / contract |
| --- | --- | --- |
| Public | `POST /registration-holds` | Linked participant; date/session/services; returns hold expiry and server quote |
| Public | `POST /bookings` | Valid hold and payment policy; idempotent confirmation |
| Public | `GET /me/visits/{id}` | Verified participant access; queue, next room, freshness timestamp |
| Public | `GET /me/documents/{id}/download` | Ownership/delegation check, short-lived private download |
| Public | `POST /visits/{id}/certificate-requests` | Result issued, deadline and authorization checked |
| Internal | `POST /visits/{id}/check-in` | MCU staff; validated identity and booking |
| Internal | `POST /examinations/{id}/events` | Assigned unit staff; expected version, IN/OUT event |
| Internal | `POST /examinations/{id}/result-revisions` | Unit staff; template version, typed payload |
| Internal | `POST /results/{id}/verify` | Assigned on-duty unit doctor; current revision only |
| Internal | `POST /visits/{id}/finalize` | MCU doctor; all required results verified |
| Internal | `POST /collective-imports` | MCU doctor; bounded CSV, validation-only preview before commit |
| Internal | `PATCH /calendar/{date}` | Editor; two-day rule and existing capacity checked |
| Webhook | `POST /payments/events` | Provider signature, replay protection, event uniqueness |

Errors: `401` expired authentication, `403` forbidden, `409` capacity/stale version/state conflict, `422` field errors, `429` retry later, `503` dependency unavailable. Example: `{"error":{"code":"CAPACITY_FULL","message":"Kuota tanggal ini penuh","fields":{}},"request_id":"..."}`. Do not echo identity numbers or result values into operational logs.

## 7. Consistency, idempotency, and replay

- PostgreSQL transactions own quota allocation, payment application, and queue assignment. Lock daily capacity before session and service capacity in a consistent order. See [PostgreSQL locking](https://www.postgresql.org/docs/current/explicit-locking.html).
- Hold reservation consumes capacity immediately. Booking conversion preserves consumed capacity. Expiry/cancellation releases it once. All paths share the same locked resource rows; a browser countdown cannot enforce capacity.
- Store price/package/template snapshots. Mutable catalog changes cannot rewrite past clinical or financial records.
- Optimistic version checks prevent two operators overwriting the same examination. Unique constraints prevent multiple active visits or room occupants.
- Transactional outbox inserts in the same commit as domain changes. Workers claim leased jobs with `FOR UPDATE SKIP LOCKED`, retry after lease expiry, and use destination idempotency. Delivery is at-least-once, not exactly-once.
- Payment event IDs and provider references are unique. Validate signature, amount, currency and merchant before applying. Late payment after hold expiry enters reconciliation; do not oversell or silently confirm.
- Database changes use versioned migrations and expand/contract rollout. Restore tests include object versions and key access, not only SQL.

## 8. Security and privacy

Public, staff, worker and migration processes have separate credentials. Database and object storage have no public ingress. Staff uses hospital SSO/MFA where available and private network access; patient authentication uses secure password hashing or a reviewed identity provider. Sessions are revocable, expire server-side, and cookies are Secure/HttpOnly/SameSite with CSRF protection. No tokens or medical results in localStorage.

Apply role + unit + resource ownership authorization. Registering another person does not automatically grant indefinite access to their medical results: explicit verified delegation is needed. Management normally sees aggregated data. Editors cannot read clinical results; doctors cannot edit payment provider settlements. Audit who changed/read/exported sensitive records, purpose, time and request ID.

Encrypt transport, disks and backups. Store NIK encrypted with managed keys and a keyed normalized lookup digest; do not use plain SHA-256 for predictable NIK values. Key rotation needs version tracking and a migration plan. Validate result JSON against approved versioned schemas. CSV limits, content checks, malware scanning and safe spreadsheet export prevent unsafe uploads/formula injection. Untrusted files remain quarantined until accepted.

Verification QR/barcodes use opaque random identifiers, not NIK or medical payloads. Public verification discloses only approved minimal validity metadata; result downloads require authorization. Retention, consent text, delegation, incident response and residency require hospital IT/policy review; no legal compliance claim is made here.

## 9. Operational readiness

The following are proposed targets, not measured guarantees or PRD facts.

| Signal | Initial target / response | Owner |
| --- | --- | --- |
| Ordinary API latency | p95 under 500 ms excluding external providers, at agreed pilot load | Backend |
| Queue freshness | Under 15 seconds in pilot; stale banner after 30 seconds | Product + frontend |
| Availability | Agree monthly target before production; suggested 99.5% pilot | Hospital IT |
| Recovery | Proposed RPO 15 minutes, RTO 4 hours; prove by restore exercise | Hospital IT |
| Correctness | Zero oversold quota, duplicate active visits, unauthorized result access | Backend + QA |
| Worker/payment | Alert on stuck jobs, repeated failure, unreconciled payment | Operations + finance |

Collect API errors/latency, DB pool saturation/locks, expired holds, quota rejection, queue age, service duration, verification lag, and delivery failures. Use de-identified logs and bounded audit access. Back up PostgreSQL with point-in-time recovery and version objects; test restoration before launch.

Launch gates: role/ownership denial tests; simultaneous final-slot and room-assignment tests; payment duplicate/out-of-order callback tests; import duplicate and rollback tests; result amendment/finalization tests; accessible mobile workflow review; peak load agreed and tested; outage and restore rehearsal; hospital acceptance of all blocking policies below. During outages, follow an approved manual downtime process and reconcile records afterward; do not invent offline medical writes.

## 10. Alternatives considered

| Approach | Trade-off / decision |
| --- | --- |
| Modular Flask + PostgreSQL | Approved. Strong transactions and simpler operations; JSONB covers variable structured results |
| PostgreSQL + MongoDB | Adds dual-write/reconciliation and ownership complexity; no demonstrated requirement yet |
| Independent microservices / Cassandra | Operational cost and consistency complexity disproportionate to initial clinical volume |

JSONB remains transactional and indexable ([PostgreSQL JSON types](https://www.postgresql.org/docs/17/datatype-json.html)). It is not an excuse to store unvalidated clinical data. “Data transfer” is an API/messaging responsibility, not a reason to add a second database.

## 11. Open decisions

| Decision | Owner | Blocks |
| --- | --- | --- |
| Registration windows, session meaning/capacity and hold TTL | Hospital operations | Booking release |
| Exact queue-number issuance and active ordering | MCU operations | Queue release |
| Initial fee, remaining bill, refunds, release when unpaid | Finance | Live payments |
| Honorarium versus other charges and discount authority | Finance + doctors | Tariff editing |
| Clinical prerequisites, time gaps and routing overrides | Unit doctors | Automatic scheduler |
| Walk-in treatment, cancellation/no-show and quota return | MCU operations | Exception flows |
| Identity integration and dependent access proof | Hospital IT | Identity synchronization |
| Certificate one-day deadline interpretation | MCU doctor | Deadline enforcement |
| Collective partial success, rollover and activation invitations | MCU doctor + IT | Collective import |
| Hosting, concurrency, retention and notification consent | Hospital IT | Production deployment |

## 12. Decisions and implementation sequence

The architecture and source precedence are approved. Deliverables are organized in the requested four stages; they are not approval for production payment processing or clinical automation.

Implement vertical slices: (1) authentication/catalog/permissions, (2) identity and capacity-safe booking, (3) staff re-registration and unit movement, (4) result revisions and verification, (5) provider-specific payments and documents, (6) collective import/certificates/reporting. Each slice includes role denial tests, workflow tests, UI states, and hospital acceptance. Use feature flags for unresolved policies; never substitute a guessed default for a blocking financial or clinical rule.
