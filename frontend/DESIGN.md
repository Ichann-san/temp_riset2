# ISLAH design system

## Direction

ISLAH uses a calm clinical operations interface. It should feel trustworthy, direct, and easy to scan in a busy hospital. Patient surfaces prioritize guidance and the next action; staff, clinician, and management surfaces increase information density without changing the visual language.

## Color

- Canvas: `#f4f7f8`
- Surface: `#ffffff`
- Primary text: `#102a37`
- Secondary text: `#5d707a`
- Border: `#dce5e8`
- Accent: `#087f73`
- Accent dark: `#075f58`
- Accent soft: `#e3f4f1`
- Warning: `#9a5b0a` on `#fff4d8`
- Danger: `#a13838` on `#fdebec`

Use teal for primary action, active navigation, and operational progress. Use semantic colors only for states. Avoid decorative gradients.

## Typography

Use the locally bundled Geist variable font. Headings use bold weight and tight tracking between `-0.025em` and `-0.04em`. Body text stays between 14 and 18px with generous line height. Numeric operational data uses tabular numerals.

## Shape and elevation

- Content containers: 14px radius.
- Inputs and buttons: 10px radius.
- Status labels: full pill.
- Use borders and whitespace for hierarchy. Avoid stacking shadows and borders.
- Large accent panels may use solid teal without elevation.

## Layout

Desktop role surfaces use a 248px persistent sidebar and a content area capped at 1320px. Mobile uses a compact header and horizontal role navigation. Dashboard grids collapse to a single column on small screens. Wide operational tables scroll horizontally.

## Components

- `AppShell` owns product identity, role navigation, prototype labeling, and page hierarchy.
- `Section` groups related information on a white surface.
- `Metric` presents operational values with a label and short context.
- `Status` uses semantic tone and is reserved for compact state labels.
- `ProgressSteps` shows sequential patient progress.
- `DataTable` handles dense operational records.
- `MiniBars` provides simple comparative visualization without chart dependencies.
- `StaticAction` looks actionable but is identified as prototype-only where it would mutate data.

## Content rules

Use Indonesian interface copy. Put the next action before secondary detail. Label all sample data as illustrative. Do not imply that prototype controls submit, scan, pay, download, verify, or store information. Do not use real patient data.

## Accessibility

Maintain visible keyboard focus, readable contrast, 44px minimum controls, descriptive headings, and responsive reflow. Respect reduced-motion preferences. Tables require clear headers and horizontal overflow handling.
