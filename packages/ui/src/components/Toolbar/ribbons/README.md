# @template-goblin/ui/src/components/Toolbar/ribbons

Categorized ribbon panels containing action buttons for file management, editing/history, element insertion, text formatting, and workspace viewing.

## Overview

Modular tab ribbon panes corresponding to top-level menu tabs (File, Edit, Insert, Format, View, Help) hosting specialized command actions and tool palettes.

## Interface

- `FileRibbon`: New, open, save, and template export actions
- `EditRibbon`: Undo, redo, cut, copy, paste, delete, and duplicate actions
- `InsertRibbon`: Text, image, table, hyperlink, and shape insertion buttons
- `FormatRibbon`: Alignment, distribution, layer arrangement, and group/ungroup actions
- `ViewRibbon`: Zoom controls, grid snap toggles, and panel visibility switches
- `HelpRibbon`: Documentation links, keyboard shortcut reference, and about dialog
- `TextStyleRibbonGroup`: Font family, size, bold, italic, underline, alignment, and color controls

## Invariants

- **Single Active Tab**: Only the ribbon panel matching `uiStore.activeMenuTab` is active and rendered in the DOM.
- **Selection Gating**: Selection-dependent tools disable when selection criteria are not met.

## Side Effects

- Triggers `templateStore` mutations (`undo`, `redo`, `reset`, `addField`).
- Dispatches `uiStore` state updates (`activeTool`, `zoom`, `grid`, dialog toggles).
- Triggers file picker dialogs via hidden input elements.

## Verification

- Run: `pnpm --filter template-goblin-ui test`
