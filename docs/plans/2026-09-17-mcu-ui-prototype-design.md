# ISLAH MCU UI prototype design

## Scope

Build a static Next.js prototype for the four roles described by the PRD: patient, staff, healthcare professional, and management. The prototype uses illustrative data only and has no backend, authentication, database, payment processing, QR scanning, file download, or data mutation.

## Structure

- `/` - role selection and prototype entry.
- `/patient` with package, registration, tracking, and result views.
- `/staff` with worklist, patient result entry, and station status views.
- `/clinician` with consolidated result verification.
- `/management` with operational overview and detailed reports.

Navigation works so the team can review the prototype as an application. Controls that would change data are visibly marked as prototype-only or disabled.

## Design direction

Use a calm clinical operations interface: cool white surfaces, deep navy text, a restrained teal accent, strong typographic hierarchy, light borders, and minimal elevation. Patient views are spacious and guided. Operational views are denser and favor rows, timelines, and compact metrics. Containers use a consistent 14px radius; pills are reserved for status and small controls.

## Responsive behavior

Desktop uses a persistent sidebar and structured content grid. Mobile changes to a compact header, horizontally scrollable role navigation, single-column content, and stacked records instead of wide tables.

## Completion criteria

- Every PRD capability is represented in an appropriate role interface.
- All data is clearly illustrative.
- Main and supporting prototype routes render on desktop and mobile.
- No backend or external service is required.
- Lint and production build pass.
- A visual inspection finds no clipping, overflow, unreadable copy, or broken hierarchy.
