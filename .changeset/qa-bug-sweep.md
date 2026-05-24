---
'template-goblin-ui': minor
---

fix: comprehensive QA bug sweep — 25 fixes, one branch, one commit per bug

Big QA pass covering performance, data-loss safety, UX clarity, and
keyboard / mouse / tooltip affordances. Every fix lands with an
e2e Playwright regression test so the bug can't return silently.

**P0 — Critical (data-loss / freeze):**

- `addPage()` guards against undefined / malformed page args (#131).
  Pushing `undefined` used to corrupt the pages array and wipe the
  template on next reload.
- `currentPageId` auto-initialises to `pages[0].id` on editor mount
  (#132). Previously left at `null` and only fixed by clicking the
  Page 1 tab.
- Grid collapses from **289 Fabric Line objects → 1 patterned Rect**
  (#133). Eliminates the ~30 s freeze after every interaction.
- `showGrid=false` reliably removes the grid Fabric object (#138).

**P1 — High (functional):**

- Drag-to-place hint banner appears when Text / Image / Table tool
  is active (#134). No more silent click resets.
- Dynamic ↔ Static field-mode flip preserves jsonKey + required
  via a session-local memo (#135).
- Enabling header / footer paints a visibly tinted band on canvas —
  was a near-invisible 0.5 px dashed stroke (#136).
- `saveTemplate` returns `{ droppedFieldIds }` and the Save handler
  alerts the user listing the lost fields (#137).
- Legacy (no-source) fields get a one-click 'Convert to new format'
  upgrade button in their properties panel (#139).
- Preview dialog documents the JSON-images / upload precedence
  inline (#140).

**P2-3 — Medium / display:**

- Static fields show their content in the left-panel list (truncated
  text, image filename, table row count) instead of `<static text>`
  (#141).
- UNGROUPED count updates on first field add — pinned with a test
  (#142).
- Table fitToContent + maxRows pinned for renderer survival (#143).
- Inline template-name editor in the top bar (#144). Renames the
  saved .tgbl filename live.
- Ribbon collapses on active-tab click and Escape (#145).
- canUndo() / canRedo() return booleans throughout the
  undo/redo round-trip (#146).

**UX polish:**

- Render button disables when required dynamic fields aren't
  supplied — JSON OR upload (#148).
- PDF Size Estimate InfoTip explains what's counted (#149).
- File → New confirmation gate pinned (#150).
- Lock button tooltip warns about the modal overlay before click
  (#151).
- Table fields get a visible orange type badge to match Text + Image
  (#152).
- JSON Preview panel labelled as '(sample / placeholder values)'
  so developers don't mistake the placeholder strings for runtime
  data (#153).
- Keyboard shortcut hints added to Open + Zoom tooltips (#155).
- InfoTip on table column Key + Label inputs spells out which one
  drives data binding vs display name (#156).

**Closed as duplicate:** UX-01 (#147) — superseded by #134.
**Deferred:** UX-08 (#154) — combining the onboarding steps needs
its own design pass.
