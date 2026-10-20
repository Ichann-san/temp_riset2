# MCU design package

**English diagrams, 19 October 2026:** [editable two-page draw.io file](ISLAH_SYSTEM_DESIGN.drawio), [page previews, opening instructions and validation](DIAGRAMS.md). Covers System Overview and Technical Architecture, with implemented, planned and undecided elements distinguished. For current registration rules, use [REGISTRATION_BACKEND.md](REGISTRATION_BACKEND.md): H+1, 100 main places plus 50 FIFO waiting places; historical capacity/session descriptions below are superseded.

**Rekonsiliasi keputusan pemilik 18 Oktober 2026:** [kapasitas 100 + 50 daftar tunggu, H+1, hold dan pembayaran, akun dan pasien, konflik dengan implementasi, urutan implementasi, pertanyaan pemblokir](RECONCILIATION_2026-10-18.md); [matriks izin untuk review](PERMISSION_MATRIX.md); [arah desain smart queue](SMART_QUEUE_DESIGN.md).

**Review MVP 14 Oktober 2026:** [akses token, graph/GraphQL, koneksi frontend–backend, dan selisih MVP terhadap PRD](MVP_REVIEW.md).

**Resolusi kebutuhan 13 Oktober 2026:** [register resolusi PRD, matriks UC → rute → endpoint, dan cakupan iterasi web registrasi](REQUIREMENTS_RESOLUTION.md).

**Revisi registrasi 12 Oktober 2026:** lihat [backend registrasi minimum](REGISTRATION_BACKEND.md). Untuk implementasi registrasi saat ini, revisi tersebut menggantikan batas 100/hari dan asumsi 10.000 pengguna dalam dokumen lama: 400 peserta/hari, 100 aktif + 50 tunggu per sesi dengan FIFO. Sekitar 400 request/hari tetap metrik terpisah.

Date: 2026-10-08. Status: approved architectural direction; implementation baseline for hospital review.

The current [PRD](../Digitalisasi%20MCU%20RSUD%20Haji.md) overrides conflicting earlier conversations and diagrams. The approved architecture is option 1: a modular Flask application with PostgreSQL as the authoritative database. These files specify the future system; they do not mean the existing prototype implements it.

Read in this order:

1. [System design](SYSTEM_DESIGN.md): scope, requirements, workflows, security, deployment, and unresolved hospital decisions.
2. [Detailed architecture](ARCHITECTURE.mmd): Mermaid flowchart; import as Mermaid in diagrams.net. [Database relationships](ERD.mmd) supplement it.
3. [UI guide](UI_GUIDE.md): role-based screens, components, interaction states, and hospital colors.
4. [Database design](DATABASE_DESIGN.md): schema ownership, invariants, and SQL execution instructions. SQL lives in [database](../../database).

Historical files under `design/diagrams` remain unchanged. Where their rules conflict with the PRD, use this package. Unknown payment, clinical sequencing, and integration policies remain explicit decisions, not invented requirements.

## Review ownership

| Reviewer | Review required |
| --- | --- |
| Supervisor and hospital product owner | Registration sessions, quotas, timeline, acceptance criteria |
| MCU and unit doctors | Result states, amendment rules, tariff authority, examination dependencies |
| MCU staff | Re-registration, walk-ins, exception handling, queues |
| Finance | Initial/final charges, payment reconciliation, refund and honorarium policy |
| Hospital IT | Identity integration, deployment/network, retention, backup/restore, account access |
| Development team | API contracts, SQL migrations, authorization, concurrency and load tests |

The SQL is an executable starting migration with synthetic rollback examples. It is not a production rollout, a full API implementation, or an authorization system by itself.

See [validation evidence and limits](VALIDATION.md) for the executed PostgreSQL and diagram checks.
