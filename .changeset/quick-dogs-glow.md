---
'template-goblin-ui': major
---

Migrate the editor canvas from Konva / react-konva to Fabric.js v6.

The canvas render layer has been rewritten end-to-end:

- `react-konva` and `konva` removed; `fabric@^6` added.
- `CanvasArea.tsx` reduced to a slim orchestrator that composes new hooks:
  `useFabricCanvas` (lifecycle + event wiring), `useFabricSync`
  (store↔canvas reconciliation, background, grid, zoom, resize observer),
  `useCanvasKeyboard` (shortcuts), and `usePageHandlers` (page CRUD,
  uploads, creation popup).
- Sub-components extracted to their own files: `OnboardingPicker.tsx`,
  `AddPageDialog.tsx`, `PageBar.tsx`.
- New helpers in `fabricUtils.ts`: `createFieldGroup`, `applyFieldToGroup`,
  `groupToFieldPatch`, `buildGridLines`, `centreViewport`, `fitZoomLevel`,
  `loadFabricImage`, `snap`, `toPagePt` / `fromPagePt`.
- Module augmentation in `fabric.d.ts` attaches `__fieldId` / `__fieldType`
  / `__isGrid` to `FabricObject` for the canonical canvas↔store join key.
- Selection / drag / resize / multi-select now use Fabric built-ins:
  `selectable`, `hasControls`, `preserveObjectStacking`, `ActiveSelection`,
  with `object:modified` as the single authoritative commit point. The
  shift+click multi-select bug (delta-only `opt.selected` mis-applied as
  full active set) is fixed by reading `canvas.getActiveObjects()` instead.
- Pan: space + left-drag, middle-mouse-drag, plain wheel scroll.
- Zoom: Ctrl/Cmd + wheel zoom-at-cursor, Ctrl/Cmd + 0 fit, Ctrl/Cmd + 1 reset.
- Schema (`@template-goblin/types`) and PDF generator (`template-goblin`) are
  untouched. PDFs still emit real vector text glyphs (selectable / searchable)
  via PDFKit. The `.tgbl` archive format is unchanged.

Spec updates: `specs/009-ui-canvas.md`, `specs/002-template-schema.md`,
`docs/superpowers/specs/2026-04-18-static-dynamic-fields-design.md` §13.
GH issue: #8.

Playwright e2e coverage: 62 parameterised tests
(`selection-and-move.spec.ts` — 1..5 fields × text-only + mixed types ×
selection / drag / resize / multi-select / left-panel / right-panel),
all green serial. Existing Vitest unit tests untouched (305 passing).
