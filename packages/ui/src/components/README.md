# @template-goblin/ui/src/components

Top-level UI components directory containing shared application primitives, error boundaries, accessible tooltips, panel resize handles, and number inputs.

## Overview

Houses the core UI presentation components for the TemplateGoblin visual builder, encompassing panel layouts, dialogs, canvas wrappers, toolbars, and resilient error boundary handlers.

## Subdirectories & Boundaries

- [Canvas](./Canvas/README.md): Interactive visual design surface orchestrating Fabric.js v6 canvas lifecycle, field rendering, and drag/resize transforms.
- [Dialogs](./Dialogs/README.md): Accessible custom modal dialog provider implementing promise-based alert, confirm, and prompt dialogs.
- [LeftPanel](./LeftPanel/README.md): Properties inspector for editing field styling, rotation angle, and group attributes.
- [Preview](./Preview/README.md): Interactive PDF preview dialog allowing real-time JSON input payload editing and test image replacement.
- [RightPanel](./RightPanel/README.md): Field structure hierarchy, live two-way JSON data projections, and PDF size estimations.
- [Toolbar](./Toolbar/README.md): Primary application toolbar header composing menu tabs, ribbons, and modals.
- [icons](./icons/README.md): Shared inline SVG icon library satisfying the zero external icon dependency rule.

## Interface

- `ErrorBoundary`: Catches unhandled React render errors and renders recovery UI
- `installGlobalErrorHandlers`: Registers window error and rejection handlers
- `ResizeHandle`: Draggable divider for resizing left and right sidebar panels
- `Tooltip`: Accessible tooltip wrapper using Radix UI primitives
- `NumberInput`: Controlled numeric input with focus buffering and bounds validation

## Invariants

- **Error Boundary Protection**: Top-level and panel boundaries capture render exceptions to prevent complete UI crashes.
- **Controlled Number Buffering**: `NumberInput` buffers raw string typing during user focus to avoid premature `NaN` or unvalidated state in stores.

## Side Effects

- `installGlobalErrorHandlers`: Attaches `window.onerror` and `window.onunhandledrejection` listeners.
- `ResizeHandle`: Attaches `pointermove` and `pointerup` listeners to `window` during drag operations.

## Verification

- Run: `pnpm --filter template-goblin-ui test`
