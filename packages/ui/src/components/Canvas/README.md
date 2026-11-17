# @template-goblin/ui/src/components/Canvas

Interactive visual design surface orchestrating Fabric.js v6 canvas lifecycle, store-to-canvas synchronization, field rendering, drag/resize transforms, and page navigation.

## Overview

The primary WYSIWYG canvas area where users visually position, resize, rotate, and style template fields across pages. Integrates Fabric.js v6 with Zustand store state and custom rendering routines.

## Subdirectories & Boundaries

- [smartGuides](./smartGuides/README.md): Smart alignment guides engine providing magnetic snapping, visual axis guide lines, and equal-spacing detection.

## Interface

- `CanvasArea`: Main canvas wrapper component
- `ContextMenu`: Contextual right-click menu for field actions
- `PageBar`: Bottom page navigation bar with page addition and removal triggers
- `FloatingSelectionToolbar`: Context-aware quick action bar pinned to active selection
- `FieldCreationPopup`: Interactive modal for inserting configured text, image, and table fields
- `TableHeightModePicker`: Mode selector button group for table height modes with dark/light theme contrast
- `TableHeightHelpModal`: Comparison dialog explaining fixed, single-page dynamic, and multi-page behaviors
- `buildDynamicTableIndicators`: Constructs visual dashed boundary lines and badge on dynamic tables
- `AddPageDialog`: Modal dialog for selecting page sizes and adding new pages
- `useCanvasModel`: Custom hook managing active canvas state
- `useFabricCanvas`: Hook initializing and managing Fabric canvas lifecycle
- `useFabricSync`: Synchronization hook keeping Zustand stores and Fabric canvas objects aligned
- `createFieldGroup`, `applyFieldToGroup`, `groupToFieldPatch`: Fabric object transform functions
- `clampToPage`: Constrains objects within page bounding boundaries

## Invariants

- **Coordinate System**: Canvas operates in `1 pt = 1 unit` coordinate space with origin at top-left `(0, 0)`.
- **Bounding Box Strictness**: All placed elements must render inside their bounding rectangles and remain within page bounds.
- **Bi-directional Sync**: Canvas selection state is synchronized with `useUiStore` `selectedFieldIds`.

## Side Effects

- Mounts and disposes HTML5 Canvas via Fabric.js v6.
- Attaches keyboard, mouse, and resize event listeners.
- Dispatches field geometry mutations and selection updates to `templateStore` and `uiStore`.

## Verification

- Run: `pnpm --filter template-goblin-ui test`
