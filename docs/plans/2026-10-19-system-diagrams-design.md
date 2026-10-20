# Approved system diagram design

Date: 19 October 2026.

The owner approved option 2: one editable diagrams.net file containing two English pages.

1. **System Overview:** actors, individual registration, planned collective intake, payment, arrival, clinical routing, examinations, unit and final verification, documents, notifications, reporting and configuration.
2. **Technical Architecture:** Next.js portals, target public/private access boundaries, a shared modular Flask codebase, bounded database connections, PostgreSQL, planned private storage and workers, external interfaces, operations, and an inset showing the current local registration implementation.

Use restrained green, amber and neutral status colors, white background, labeled rectangular components, visible boundaries and manually routed orthogonal connectors. The user-supplied architecture screenshot informs grouping and connection style; it does not select an infrastructure vendor or imply Atlassian components belong in this project.

Implemented code, planned deployments/capabilities and unresolved hospital decisions must remain distinct. Current registration decisions take precedence over historical design paragraphs: H+1, 100 main places including held and confirmed reservations, 50 FIFO waiting places, final-submit holds, cancellation-based release/promotion, no implemented hold timer and no payment confirmation endpoint.

No application code, backend policy, production integration, latency target or infrastructure resource count is changed by this documentation task. Production authentication and clinical scheduling remain explicitly unfinished.

Deliverables and validation: [Diagram guide](../system-design/DIAGRAMS.md).
