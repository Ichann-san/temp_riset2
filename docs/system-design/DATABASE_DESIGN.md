# ISLAH MCU — Database Design and SQL

> **Diperbarui 18 Oktober 2026:** batas 400 peserta/hari tidak lagi menjadi kuota. Pola `registration_hold`/`capacity_resource` di draft schema hanya dipakai sebagai pola untuk hold + booking (tanpa `expires_at` wajib dan tanpa indeks keras satu kunjungan aktif per pasien); daftar tunggu 50 per tanggal layanan perlu tabel sendiri. Lihat model target RECONCILIATION §5. Isi di bawah dibiarkan sebagai riwayat; rinciannya di [RECONCILIATION_2026-10-18.md](RECONCILIATION_2026-10-18.md).

> Revisi 12 Oktober 2026: backend registrasi minimum memakai schema terpisah `registration` dengan migrasi di `backend/migrations`, batas 400 peserta/hari, serta 100 aktif + 50 tunggu per sesi. Lihat [REGISTRATION_BACKEND.md](REGISTRATION_BACKEND.md). Dokumen/schema lengkap di bawah tetap draft historis; jangan gunakan script `database/001_schema.sql` untuk menyiapkan backend minimum ini.

## 1. Scope and format

The logical schema is documented here and in [ERD.mmd](ERD.mmd). The physical schema is [001_schema.sql](../../database/001_schema.sql), targeting PostgreSQL 18. DDL means Data Definition Language (tables, indexes, constraints); DML means Data Manipulation Language (insert, update, select, delete). Data management additionally includes authorization, retention, recovery, and migrations.

PostgreSQL is authoritative. JSONB stores versioned result schemas, validated result payloads, and small snapshots. It does not replace relational identity, money, quotas, or state. Files live in private object storage; SQL stores opaque object keys and integrity digests. No MongoDB/Cassandra is required by the approved option.

## 2. Domain dictionary

| Domain | Tables | Important relationships / ownership |
| --- | --- | --- |
| Identity/access | `account`, `role`, `account_role`, `auth_session`, `patient`, `patient_access`, `consent` | Account is a login; patient is a person. Delegation grants are explicit and revocable |
| Hospital/catalog | `unit`, `room`, `doctor_presence`, `service`, `service_version`, `package`, `package_item` | A service belongs to a unit; examination points to immutable version |
| Registration/capacity | `operating_day`, `registration_session`, `capacity_resource`, `registration_hold`, `hold_allocation`, `collective_import`, `visit` | Hold consumes capacity; conversion retains it; one visit per batch participant |
| Examination/queue | `examination`, `queue_assignment`, `examination_event` | Visit has selected services; one active assignment per visit; timestamps describe movement |
| Clinical results | `result_revision`, `result_verification`, `final_review`, `final_review_item` | Unit verification refers to exact revision; final review snapshots verified revisions |
| Finance | `charge`, `payment`, `payment_event` | Charges and payment transactions are separate; provider events deduplicated |
| Documents | `certificate_request`, `document`, `delivery` | Clinical issue state is separate from notification delivery |
| Governance | `feedback`, `audit_event`, `outbox_job`, `idempotency_record` | Durable work, resource access records, and safe request retries |

Every UUID identifies an internal resource; externally shown booking code and daily queue number are separate. The queue number is unique per service date and stable across units. UTC timestamps use `timestamptz`; hospital-date logic uses `Asia/Jakarta`. Amounts use `numeric(14,2)` with currency, never floating point.

Patient NIK uses encrypted bytes plus a keyed lookup digest and key version. Demo byte values are placeholders, not encryption examples. Do not duplicate plaintext NIK or detailed results into JSON snapshots, logs, outbox payloads, or idempotency responses. Normalize and validate identity according to the confirmed integration contract; uppercase constraints belong at the input/domain boundary rather than blanket uppercasing every text column.

## 3. State models

| Entity | States / rules |
| --- | --- |
| Hold | `active → converted` or `active → released`; expiry worker releases active expired holds |
| Visit | `booked → arrived → in_progress → completed`; cancellation policy requires hospital confirmation |
| Examination | `pending → ready → assigned → in_service → completed`; cancellation only under authorized policy |
| Queue assignment | `waiting → called → in_service → finished`; cancelled assignment allows a new assignment |
| Result revision | Draft (`submitted_at` null), submitted, verified through separate verification row |
| Final review | Versioned; one current review; prior review remains stored when superseded |
| Payment | Pending, settled, failed, reconciliation, refunded; permitted transitions are provider-aware |
| Delivery | Pending, sent, delivered, failed; “sent” does not prove patient receipt |

SQL state checks constrain vocabulary, not all allowed transitions. Backend services must enforce transition order, actor authority, and relationships in a transaction.

## 4. Capacity and booking transactions

`capacity_resource` represents daily, optional session, and service-specific capacity. `allocated` includes active holds and confirmed bookings. Daily capacity cannot exceed 100 in this baseline. Capacity resources are created by the editor workflow and validated against the parent day.

`reserve_capacity` locks the day and all specified resources, checks capacity, and increments them atomically. Duplicate actor/request-key calls return the same hold; changed request content is rejected. Resource sorting is deterministic. The function supports one quantity across all resources, appropriate to an individual or a collective group sharing services. Mixed-service batch reservation requires an extended per-resource quantity contract before use.

The API MUST derive the complete resource set from selected services/session; it must not trust browser-supplied resource IDs. The SQL primitive requires the daily resource, but does not infer missing service/session resources or check session opening times. The API checks actual selected date, policies, availability, active patient transaction, and authorization.

Conversion transaction: lock hold; require active and unexpired; verify payment policy; create participant visit(s) and examination snapshots; allocate a queue number under a per-date lock if eligible; mark hold converted; insert audit/outbox; commit. No second capacity increment. Initial payment may reference a hold before a visit exists; link to the resulting visit during conversion. Collective payment allocation remains open and needs an allocation table if one payment funds multiple participants.

Expiry/cancellation of an active hold calls `release_capacity`, which locks and decrements once. A converted hold is deliberately not releasable with this primitive. Cancellation after booking needs a separate audited per-visit release workflow, particularly for partial collective cancellation. Do not deploy cancellation until that policy and allocation ledger are implemented. Payment arriving after expiry must reconcile, not restore capacity automatically.

## 5. Enforced invariants and implementation boundaries

| Invariant | SQL baseline | Backend/migration work still required |
| --- | --- | --- |
| No negative/oversold resource | CHECKs plus transactional reserve/release functions | All callers use primitive; complete resource set and expiry job |
| One active MCU transaction per person | Partial unique index on patient visit | Define whether unpaid hold counts as active before visit creation |
| One doctor per occupied room | Partial unique index on active presence | Verify role, room/unit assignment, attendance policy |
| One physical room occupant | Partial unique index on `in_service` assignment | Require a room and active matching doctor for service start |
| One active assignment per visit | Partial unique index | Scheduler eligibility, safe next assignment and clinical constraints |
| Room, exam and visit relationship | Composite foreign keys | Service version belongs to assigned unit; validate in service layer |
| Verified content not overwritten | Trigger protects verified revision update/delete | Revoke verification deletion/update for runtime roles; amendments invalidate current final release |
| Final review uses verified rows | Foreign key to result verification | Same visit, latest revision, complete required services; transactional finalize |
| Provider callback not applied twice | Unique provider/event identifier | Signature/amount/currency verification and atomic settlement logic |
| Parent-linked documents | Foreign keys | Document, final review and certificate request belong to same visit |
| Calendar constraints | Local capacity checks | UC27 two-day cutoff; dependent quotas; cannot reduce below held/booked count |
| Catalog history | Versioned references and price snapshot | Restrict edits/deletes; UC28 booked-service editing block |
| Clinical access | Explicit access/role tables; no PUBLIC schema grants | API checks, least-privilege database roles, optional tested RLS policies |

The SQL intentionally does not pretend that table constraints implement full clinical workflows. Authenticated callers must never connect directly to the database. Functions are SECURITY INVOKER, not privilege-escalating wrappers. Deployment creates public-api, internal-api, worker, audit-reader and migration credentials with reviewed grants. No shared superuser runtime credentials. Audit records and verified clinical records need append-only grants before production. RLS is not configured by this baseline.

## 6. Files and execution

| File | Purpose | Persistence |
| --- | --- | --- |
| `001_schema.sql` | First migration: tables, indexes, reservation functions and verified-result guard | Creates schema once; fails if already present |
| `002_seed.sql` | Seven PRD roles and Haji/CPNS package names | Idempotent inserts; no clinical contents or prices |
| `003_dml_examples.sql` | Synthetic reserve/convert, outbox claim and reporting example | Entire file rolls back |
| `004_validation.sql` | Assertions for core capacity and integrity constraints | Entire file rolls back |

Run only on a new disposable database first. Supply connection settings through secure local environment/service configuration; do not put a production password in a command or repository.

```powershell
# From work\riset-2-mcu; PGHOST, PGPORT, PGUSER and PGDATABASE configured for test DB.
psql -X -v ON_ERROR_STOP=1 -f database/001_schema.sql
psql -X -v ON_ERROR_STOP=1 -f database/002_seed.sql
psql -X -v ON_ERROR_STOP=1 -f database/003_dml_examples.sql
psql -X -v ON_ERROR_STOP=1 -f database/004_validation.sql
```

After integration, manage migrations with Alembic and SQLAlchemy; do not rerun the initial script over an existing schema or use `create_all` as a migration strategy. DML examples use synthetic identity values and do not implement authentication or a real payment gateway. Seed package contents, reference ranges and prices only from hospital-approved data.

## 7. Data management

Use bounded queries and indexes matching worklists. Avoid broad GIN indexes over all sensitive JSONB initially; add narrow expression indexes only after query profiling. Store JSON schema version with service version and validate payloads in the application. Paginate audit/history. Aggregate TAT from authoritative events, distinguishing waiting, physical service, unit verification, final verification and delivery time.

Delete neither historical results nor financial rows casually. Implement policy-driven retention and de-identification with hospital approval, legal holds where required, and corresponding object lifecycle rules. Backups require encryption, restricted keys, restore exercises and a documented recovery owner. No retention period is invented here.

Honorarium split, certificate template versioning, notification consent details, refund accounting/allocation, multi-provider login and externally synchronized identities will need follow-up migrations after their contracts are approved. The base `charge` table records service amounts without claiming to be a general ledger or payroll system.
