---
'template-goblin-ui': minor
---

fix: QA bug follow-ups — ribbon click-outside, reactive undo state, table fit-to-data, crosshair cursor

Four follow-up fixes from the post-#157 QA pass, one branch, one commit per issue, all four verified live in Chrome via the MCP extension.

**#159 — Ribbon collapses on mousedown outside the toolbar.** The Escape + active-tab-toggle gates from #145 stay; a new window-level mousedown handler in `MenuTabBar` triggers the same collapse when the click lands outside `[data-testid="toolbar-shell"]`. Bails when a dialog is open.

**#160 — `canUndo` / `canRedo` reactive boolean state.** Promoted from imperative methods on the actions block to plain boolean fields on `TemplateState`. Kept in sync by `pushHistory` / `undo` / `redo` / `reset`. Components subscribe with `useTemplateStore((s) => s.canUndo)` and re-render automatically on every history change — no method call. `EditRibbon` migrated; legacy method form removed.

**#162 — "Fit to data" button on table fields.** New row in `LoopFieldProps` next to Max Rows. Computes `header + min(dataRows, maxRows) × rowHeight` and calls `resizeField` to shrink the field's bounding box. Solves the "large empty banded area below the data rows" complaint from QA without touching the renderer's intentional "user authors the rect" semantic.

**#164 — Crosshair cursor while a placing tool is active.** Inline style on the canvas container picks up `cursor: crosshair` when `activeTool` is `addText` / `addImage` / `addLoop`. Reinforces the hint banner from #134 with a tool-aware visual cue across the whole canvas region (not just inside the page bounds).

Tests: 4 new e2e specs (one per issue). 1 small migration of the existing templateStore.test.ts canUndo/canRedo method calls to the property form. Existing 515 UI tests still green.
