# System and architecture diagrams

Updated: 19 October 2026. Language: English.

## Editable file

For a simple, unstyled single-page architecture frame, open [ISLAH_SIMPLE_ARCHITECTURE.drawio](ISLAH_SIMPLE_ARCHITECTURE.drawio). It uses black rectangular boxes and connectors, grouped into Presentation, Service, Data, and External Systems layers. All text is English. Planned capabilities are labeled explicitly; the current local implementation is summarized in the footer. This is a simplified target architecture, not a detailed deployment or security-boundary diagram. The detailed two-page file below is preserved.

Open [ISLAH_SYSTEM_DESIGN.drawio](ISLAH_SYSTEM_DESIGN.drawio) in diagrams.net / draw.io using **File > Open From > Device**, or open it with the desktop application. Select the page tabs at the bottom:

1. **01 — System Overview:** end-to-end service capabilities and participating roles; registration rules and unresolved hospital policies.
2. **02 — Technical Architecture:** target access/deployment boundaries, modular Flask application, PostgreSQL, planned storage/workers/integrations, and the current local registration chain.

This is an uncompressed native diagrams.net XML document. Boxes, labels and connectors are individually editable; neither page is a flattened screenshot. Coordinates and connector waypoints are already arranged. Automatic layout is unnecessary.

## Preview files

| Page | PNG | Scalable SVG |
| --- | --- | --- |
| System Overview | [Preview](previews/system-overview.png) | [Vector preview](previews/system-overview.svg) |
| Technical Architecture | [Preview](previews/technical-architecture.png) | [Vector preview](previews/technical-architecture.svg) |

Previews are snapshots generated from the same diagram coordinates and text. After manually editing the `.drawio` file, export new PNG/SVG previews from diagrams.net to keep them synchronized.

## Reading the diagrams

- **Green:** implemented code or registration behavior. A green database box does not mean the planned clinical schema is implemented; the label specifies the distinction.
- **Amber:** planned capability, deployment split or integration. Existing UI screens do not establish that the corresponding backend exists.
- **Gray:** unresolved provider or hospital policy. Actor and explanatory cards use neutral styling.
- **Solid connectors:** current implementation relationship. **Dashed connectors:** target/planned relationship. Arrowheads indicate direction; two arrowheads indicate interaction in both directions.
- Containers show system/code/access boundaries. The shared Flask module box denotes reusable application code, not an additional network service.

The overview is a design-level service journey, not an executable workflow or a BPMN model. In particular, physical examination completion, result verification, payment and notification are separate states. A patient can continue to another eligible examination while result verification proceeds separately.

## Source authority and scope

Current source authority:

1. Latest explicit owner decisions, implemented in [Registration backend](REGISTRATION_BACKEND.md) and documented in [backend/README.md](../../backend/README.md).
2. [Decision reconciliation](RECONCILIATION_2026-10-18.md) and [open decisions](OPEN_DECISIONS.md), with their latest updates taking precedence over historical sections.
3. [System design](SYSTEM_DESIGN.md), [architecture baseline](ARCHITECTURE.mmd), [database design](DATABASE_DESIGN.md), [smart queue design](SMART_QUEUE_DESIGN.md) and the PRD for the remaining planned capabilities.
4. Current `frontend/next.config.ts`, backend entrypoint and registration modules, checked as implementation evidence.

The diagrams preserve H+1 registration using Asia/Jakarta, 100 main places (held + confirmed), and 50 FIFO waiting places. Waiting places are not 50 additional confirmed examination places. The former access-session model and the 400/day estimate are not active architecture requirements. No concurrency or latency guarantee is introduced.

Currently, Next.js rewrites same-origin `/api/v1/*` calls to Waitress/Flask at `127.0.0.1:5000`; PostgreSQL owns registration transactions. Operator-issued review tokens are not production accounts. Public/private deployment separation, staff authorization, clinical backend modules, payment verification, official queue-number issuance, object storage, outbox workers and production integrations remain planned.

The payment gateway is deliberately provider-neutral. No fee, hold timeout, hosting vendor, replica count, medical ordering rule or integration contract is selected here. Collective allocation/account/payment rules remain unresolved. MongoDB/Cassandra, Kubernetes and a microservice decomposition are not added to the approved PostgreSQL/modular-Flask architecture.

## Validation and limits

- Parsed the final `.drawio` XML: exactly two named pages, unique cell IDs, valid source/target references and bounded geometry.
- Checked all connectors are orthogonal and terminate on their source/target boundaries. No connector segments pass through unrelated component-card interiors.
- Final document: 66 native vertices and 36 editable connectors across both pages.
- Rendered SVG previews in Chromium; measured every text line against its allocated width. No text overflow detected. PNG previews visually inspected; labels repositioned to avoid obscuring components/connectors.
- Previews are generated from the common geometry model, not an export from the diagrams.net editor. A live editor import/export round trip was not performed because no local draw.io executable was available.
- No application server, database, migration or external integration was started or changed. Temporary rendering browsers were closed after verification.
