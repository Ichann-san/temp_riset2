# Design package validation

Date: 2026-10-08.

Source PRD SHA-256: `64DCF093C1042E801B107425B350049CD305AF7C7EDAF6B388BCDC2B9E5446EF`.

## Executed checks

- Created a disposable PostgreSQL 18 cluster on loopback port 55439. Existing databases were not used. Server stopped after tests.
- Ran `001_schema.sql`, `002_seed.sql`, `003_dml_examples.sql`, and `004_validation.sql` with `ON_ERROR_STOP=1`; all succeeded.
- Assertions passed for capacity exhaustion, same-request replay, changed-request rejection, idempotent release, duplicate active visit rejection, duplicate doctor presence rejection, and immutable verified result content.
- Ran two independent `psql` transactions concurrently against one remaining slot. Exactly one committed; the other returned `CAPACITY_FULL`; allocated capacity remained one.
- DML examples and invariant fixtures rolled back. The concurrent fixture remained only in the disposable cluster.
- Checked local Markdown link targets; all resolved.
- Calculated brand/white contrast: green 5.07:1; maroon 9.22:1; gold 2.05:1.
- Rendered both `.mmd` files using Mermaid CLI and local headless Chrome; inspected the images and corrected the architecture's notification loop layout. Rendering directly in diagrams.net was not tested; its bundled Mermaid version may differ.

## Limits

These checks validate the initial schema and named invariants. They do not validate an implemented API, production grants, payment provider behavior, browser accessibility, clinical policy, load capacity, or disaster recovery. No application behavior was changed by this documentation package. Review the implementation boundaries in DATABASE_DESIGN.md before integrating SQL.
