# Fabric.js Migration — Handoff Document

**For:** any AI assistant picking up the canvas-engine migration.
**Date:** 2026-04-19.
**Repo:** `/home/jaimin/My/Dev/Projects/fun/template-goblin` (branch `main`, GitHub: `JaiminPatel345/template-goblin`)
**User:** Jaimin Detroja (jaimin@zupple.technology)

> **TL;DR:** We are halfway through migrating the editor canvas from **Konva / react-konva** to **Fabric.js v6**. Specs are updated, deps are installed, scaffolding (`fabricUtils.ts` + `fabric.d.ts`) is landed. The remaining work is rewriting `packages/ui/src/components/Canvas/CanvasArea.tsx` (1632 lines) to use Fabric instead of Konva, then updating Playwright tests and removing Konva deps.

---

## 1. Project overview

TemplateGoblin is an **open-source PDF template engine**:

- **Monorepo** (Turborepo + pnpm): `packages/types`, `packages/core` (`template-goblin` npm lib), `packages/ui` (`template-goblin-ui` React + Vite app).
- Designer uses the **UI** (visual editor) to lay out template fields on top of a background image or solid colour.
- Template is saved as a `.tgbl` file (a ZIP archive containing `manifest.json`, `backgrounds/*`, `placeholders/*`, `images/*`, `fonts/*`).
- Consumers use the **core** npm library (Node.js + PDFKit) to feed a `.tgbl` + `InputJSON` and generate PDFs at scale.
- **Field schema** (`packages/types/src/template.ts`):
  - Each field is `TextField | ImageField | TableField`
  - Discriminator: `source: FieldSource<V>` = `{ mode: 'static', value: V }` OR `{ mode: 'dynamic', jsonKey, required, placeholder }`
  - Static = baked into every PDF; dynamic = fed from `InputJSON` at generation time.

The schema is the **contract**. We are NOT changing it in this migration — only the render engine inside the editor.

---

## 2. Why we are migrating Konva → Fabric.js

The user spent many iterations fighting hit-detection / click-vs-drag / multi-select bugs in the Konva-based canvas. Summary of what went wrong:

- Konva's `click` event requires mousedown+mouseup on the same shape within `dragDistance` px. Any micro-drift converted clicks into aborted drags and swallowed selection.
- Workarounds (setting `Konva.dragDistance = 5`, `onMouseDown` instead of `onClick`, dedicated hit rects) each fixed one symptom but introduced others (shift+click toggle-double-fire, static fields un-hittable when fill was undefined, etc.).
- Eventual passing state had 62 green Playwright tests but the user still reported bugs in the live UI ("only first N fields selectable, drag moves the wrong field").

Fabric.js provides click/drag/multi-select/resize **built-in** as industry-standard behaviours. It's the same philosophy as Polotno (which is built on Fabric). Fabric is MIT-licensed — no production licensing cost. Fabric also renders to real HTML canvas (not SVG); texts drawn by Fabric are canvas pixels, but the **PDF pipeline is completely separate** and writes real vector text glyphs via PDFKit — selectable, copy-pasteable text in generated PDFs is preserved.

---

## 3. What the user wants — workflow rules

These are saved in memory at `/home/jaimin/.claude/projects/-home-jaimin-My-Dev-Projects-fun-template-goblin/memory/` and MUST be honoured:

1. **Bug/improvement reports go through a Reviewer flow.** When the user reports a bug, the Reviewer validates, updates specs, creates a GitHub issue via `gh issue create --repo JaiminPatel345/template-goblin`, then routes to Dev + QA. The user manually closes the issue when verified.
2. **No `bugs.md` file anymore.** All tracking is on GitHub Issues. `bugs.md` was deleted in commit `426e4ce`.
3. **Do not commit fixes until the user manually verifies** them in the running UI. Stage changes, ask the user to reload `pnpm --filter template-goblin-ui dev`, get their OK, then commit.
4. **Commits:** conventional prefixes (`feat` / `fix` / `test` / `docs` / `chore` / `refactor` / `spec`). No co-author tag. No `--no-verify` / `--no-gpg-sign` flags. Husky pre-commit runs ESLint + Prettier on staged files.
5. **For long implementation work, prefer direct editing** over subagents unless the user says otherwise. The user has explicitly asked "why don't you directly edit" when I dispatched Dev agents.
6. **When stuck, use the internet.** (Reference Konva/Fabric docs, Stack Overflow, etc.)
7. **Model preferences:**
   - Dev (implement): **sonnet** with max effort
   - Reviewer: **opus** with high effort
   - QA: **opus** (user asked what's best; Opus reasoning is better for careful spec parsing and edge cases)

---

## 4. Spec + doc state (already updated for Fabric)

Commits `22a51fd`, `e078d7f`, `1c0dab8`:

- `specs/009-ui-canvas.md` — full Konva→Fabric rewrite. REQ-001 (Fabric v6 + plain `<canvas>` + `useEffect` lifecycle), REQ-011/012/013 (selection/drag/resize via Fabric built-ins), REQ-034 (onboarding), REQ-035..043 (pan, zoom, keyboard shortcuts), REQ-044..047 (IMP-1..4 label + fill rules in Fabric terms), **new REQ-048..054** (`__fieldId` binding, `preserveObjectStacking`, store↔canvas reconciliation, click-outside deselect, drag-rectangle multi-select, event propagation rules, dispose on unmount). Matching AC-048..052. Added **F-Mapping** section explaining how a `FieldDefinition` becomes a `fabric.Group` with children.
- `specs/002-template-schema.md` — added Notes paragraph + F-Mapping pointer. Schema shape unchanged.
- `docs/superpowers/specs/2026-04-18-static-dynamic-fields-design.md` — added §13 "Render engine" clarifying that `FieldSource<V>` is engine-agnostic.

spec 013 was grepped and is Konva-free.

---

## 5. GitHub issue tracking

- **#8** — _"Migrate editor canvas from Konva to Fabric.js"_ — the epic. Label: `enhancement`. URL: https://github.com/JaiminPatel345/template-goblin/issues/8
- Other open issues (unrelated): #1 (selection bug that triggered the migration), #2 (zoom not working, largely fixed pre-migration), #3..#6 (IMP-1..4 pending user verification), #7 (CI deploy).

---

## 6. What's been committed this session

| Commit    | Description                                                                                                                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0467a42` | `chore(ui): add fabric@6 dep for canvas engine swap` — `pnpm --filter template-goblin-ui add fabric`; fabric@6.9.1 in package.json, lockfile updated. Konva deps still present (remove at the end, step 7).                     |
| `80b8e54` | `feat(ui): fabric util helpers — field↔group mapping + coord conversion` — `fabric.d.ts` (module augmentation adding `__fieldId`, `__fieldType`, `__isGrid` props to `FabricObject`) + `fabricUtils.ts` (601 lines of helpers). |

---

## 7. `fabricUtils.ts` — what's in the scaffolding

Located at `packages/ui/src/components/Canvas/fabricUtils.ts`. All public exports:

- `toPagePt(x, y): Point` / `fromPagePt(x, y): Point` — coord-system helpers. Currently no-op (1 canvas unit = 1 pt). Indirection exists so future DPI/zoom math is isolated.
- `snap(value, gridSize, enabled): number` — grid snap helper, matches existing store semantics.
- `ImageResolver = (filename: string) => string | null` — type for async image lookup.
- `createFieldGroup(field, resolveImage): Group` — builds a `fabric.Group` with:
  - Background `fabric.Rect` (full field bounds, tint per FIELD_COLORS, `listening: true`, no stroke leak)
  - Optional `fabric.FabricImage` (if field is an image field and `resolveImage(filename)` returns a URL)
  - Optional `fabric.FabricText` (max-fit label inside the rect)
  - Custom `__fieldId`, `__fieldType` on the Group
  - `lockRotation: true`, `selectable: true`, `hasControls: true`, `subTargetCheck: true`
  - `cornerSize: 8, cornerStyle: 'rect', transparentCorners: false`
- `applyFieldToGroup(group, field, resolveImage): void` — patches an existing Group to match new field props (used during reconciliation; avoids remove+re-add which breaks selection).
- `groupToFieldPatch(group): { x, y, width, height }` — reads modified Group back into a partial field update. Multiplies `width * scaleX` / `height * scaleY`, resets scale to 1, calls `setCoords()`.
- `buildGridLines(pageWidth, pageHeight, gridSize): Line[]` — returns an array of non-selectable, non-evented `fabric.Line`s for the snap-to-grid overlay.
- `centreViewport(canvas, pageW, pageH): void` — resets pan so the page is centred.
- `fitZoomLevel(containerW, containerH, pageW, pageH, padding): number` — computes the zoom level for Ctrl+0 (fit to viewport with `padding` pt on each side).
- `loadFabricImage(dataUrlOrFilename): Promise<HTMLImageElement>` — async loader used by image field reconciliation.

The module augmentation in `fabric.d.ts`:

```ts
export {} // ← CRITICAL: makes this file a module, so `declare module` augments rather than shadows
declare module 'fabric' {
  interface FabricObject {
    __fieldId?: string
    __fieldType?: string
    __isGrid?: boolean
  }
}
```

Without the `export {}` line, TS treats the `declare module 'fabric'` block as a fresh ambient declaration that SHADOWS the package's types — all fabric named exports (`Rect`, `Group`, etc.) disappear. I hit this bug and fixed it; the `export {}` pin is essential.

---

## 8. CanvasArea.tsx — what needs to change

**File:** `packages/ui/src/components/Canvas/CanvasArea.tsx` (1632 lines).

### 8.1 Structure of the existing file

| Lines     | Section                                                                                                                         | Keep as-is?                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1–12      | Imports (react-konva, konva)                                                                                                    | **Replace** — import `fabric` instead                                                          |
| 14–30     | Imports (stores, types, popup)                                                                                                  | Keep                                                                                           |
| 41–102    | `getMeasureCtx`, `wrapTextToLines`, `fitFontSize`                                                                               | Keep (pure utilities, engine-agnostic)                                                         |
| 104–109   | `SELECTED_STROKE`, `snap` helper                                                                                                | Keep                                                                                           |
| 111–115   | `generatePageId`                                                                                                                | Keep                                                                                           |
| 125–273   | `OnboardingPicker` component                                                                                                    | **Keep verbatim** — pure React, no Konva                                                       |
| 275–403   | `AddPageDialog` component                                                                                                       | **Keep verbatim** — pure React, no Konva                                                       |
| 405–440   | Main `CanvasArea` — store subscriptions                                                                                         | Keep                                                                                           |
| 441–444   | `stageRef`, `transformerRef`, `containerRef`                                                                                    | **Replace** — add `canvasElRef`, `fabricRef`                                                   |
| 445–451   | Local state (bgImage, drawRect, isDragOver, fileInputRef, showAddPageDialog)                                                    | Keep                                                                                           |
| 453–512   | `resolveCurrentBgDataUrl`, `resolveCurrentBgColor`                                                                              | Keep                                                                                           |
| 515–523   | `bgImage` loading `useEffect`                                                                                                   | Keep (but feed into fabric.Image now)                                                          |
| 527–548   | Auto-fit zoom `useEffect`                                                                                                       | Keep (uses `setZoom` which is store, engine-agnostic)                                          |
| 550–610   | `placeholderImages` map + effect                                                                                                | Keep (engine-agnostic — the map's HTMLImageElements will be wrapped in `fabric.FabricImage`)   |
| ~618–767  | Pan/zoom state + handlers (Konva wheel, space-pan, middle-drag)                                                                 | **Rewrite** for fabric canvas events                                                           |
| ~769–811  | `isPlacing`, `pageFields`, `getPointerPos`, `handleStageMouseDown`, `handleStageMouseMove`, `handleStageMouseUp` — drawing flow | **Rewrite** for fabric canvas events                                                           |
| ~813–920  | `handlePopupConfirm`, `handlePopupCancel`, `handleFieldClick`, `handleFieldDblClick`                                            | Keep the logic; rewire events to fabric                                                        |
| ~947–960  | `handleFieldDragEnd`                                                                                                            | **Rewrite** — use `canvas.on('object:modified')` instead                                       |
| ~962–1110 | Add-page / remove-page / file-upload handlers, `onboarding color chooser                                                        | Keep verbatim                                                                                  |
| 1171–1198 | `renderGrid` (returns Konva Lines)                                                                                              | **Replace** — use `buildGridLines` from fabricUtils, added to the canvas as a group            |
| 1200–1296 | `renderPageBar` (pure React)                                                                                                    | Keep verbatim                                                                                  |
| 1298–1321 | Empty-state return (OnboardingPicker)                                                                                           | Keep verbatim                                                                                  |
| 1323–1610 | Canvas JSX (Stage/Layer/Group/Rect/Transformer)                                                                                 | **Replace** — a single `<canvas ref={canvasElRef}>` element, wrapped by the same container div |

### 8.2 Fabric event wiring — target behaviour

Once `fabric.Canvas` is created in a `useEffect`, wire these events:

```ts
const fc = new fabric.Canvas(el, {
  width: meta.width,
  height: meta.height,
  selection: true,
  preserveObjectStacking: true,
  backgroundColor: currentBgColor ?? '#ffffff',
  controlsAboveOverlay: true,
})

// SELECTION
fc.on('selection:created', (opt) => syncSelectionFromFabric(opt.selected ?? []))
fc.on('selection:updated', (opt) => syncSelectionFromFabric(opt.selected ?? []))
fc.on('selection:cleared', () => clearSelection())

// DRAG + RESIZE — single authoritative commit
fc.on('object:modified', (opt) => {
  const g = opt.target as fabric.Group | null
  if (!g?.__fieldId) return
  const patch = groupToFieldPatch(g)
  moveField(g.__fieldId, patch.x, patch.y)
  resizeField(g.__fieldId, patch.width, patch.height)
})

// DRAW-TO-CREATE
fc.on('mouse:down', (opt) => {
  if (!isPlacing) return // only when a draw tool is active
  // create preview Rect at pointer, subscribe to mouse:move/mouse:up
})

// WHEEL — zoom (ctrl/meta) or scroll (plain / shift)
fc.on('mouse:wheel', (opt) => {
  const e = opt.e as WheelEvent
  e.preventDefault()
  if (e.ctrlKey || e.metaKey) {
    const newZoom = clamp(fc.getZoom() * (e.deltaY > 0 ? 0.9 : 1.1), 0.1, 5)
    fc.zoomToPoint({ x: e.offsetX, y: e.offsetY }, newZoom)
    setZoom(newZoom) // mirror to store
  } else if (e.shiftKey) {
    fc.viewportTransform[4] -= e.deltaY
    fc.requestRenderAll()
  } else {
    fc.viewportTransform[5] -= e.deltaY
    fc.requestRenderAll()
  }
})

// CLEANUP
return () => {
  fc.dispose()
}
```

**Keyboard shortcuts** stay at the window level (already exist for space-pan, Ctrl+0, Ctrl+1). Space-drag: toggle `fc.defaultCursor` / `fc.hoverCursor` and implement via manual mousedown+mousemove on the HTMLCanvasElement.

### 8.3 Reconciliation useEffect

```ts
useEffect(() => {
  const fc = fabricRef.current
  if (!fc) return
  const existing = new Map<string, fabric.Group>()
  fc.getObjects().forEach((o) => {
    if (o.__fieldId) existing.set(o.__fieldId, o as fabric.Group)
  })
  // Add / update
  pageFields.forEach((field) => {
    const g = existing.get(field.id)
    if (g) {
      applyFieldToGroup(g, field, resolveImage)
      existing.delete(field.id)
    } else {
      fc.add(createFieldGroup(field, resolveImage))
    }
  })
  // Remove groups no longer in the page
  existing.forEach((g) => fc.remove(g))
  fc.requestRenderAll()
}, [pageFields, placeholderImages, staticImageDataUrls])
```

A separate useEffect mirrors store selectedFieldIds → `fc.setActiveObject(group)`:

```ts
useEffect(() => {
  const fc = fabricRef.current
  if (!fc) return
  if (selectedFieldIds.length === 0) {
    fc.discardActiveObject()
  } else if (selectedFieldIds.length === 1) {
    const g = fc.getObjects().find((o) => o.__fieldId === selectedFieldIds[0])
    if (g) fc.setActiveObject(g)
  } else {
    const sel = selectedFieldIds
      .map((id) => fc.getObjects().find((o) => o.__fieldId === id))
      .filter(Boolean) as fabric.FabricObject[]
    fc.setActiveObject(new fabric.ActiveSelection(sel, { canvas: fc }))
  }
  fc.requestRenderAll()
}, [selectedFieldIds])
```

### 8.4 Snap to grid

In `object:moving` / `object:scaling`:

```ts
fc.on('object:moving', (opt) => {
  const obj = opt.target
  if (!obj) return
  obj.set({
    left: snap(obj.left ?? 0, gridSize, showGrid),
    top: snap(obj.top ?? 0, gridSize, showGrid),
  })
})
```

### 8.5 Select-on-mousedown (Figma style — critical)

Fabric's default is select-on-click AFTER mouseup. For drag-to-also-select ergonomics, add:

```ts
fc.on('mouse:down', (opt) => {
  const target = opt.target
  if (!target || !target.__fieldId) return
  // already handled by Fabric's internal selection, but we MUST call our
  // `selectAndFocus(id)` store action to open the right panel atomically.
  if (opt.e.shiftKey) toggleFieldSelection(target.__fieldId)
  else selectAndFocus(target.__fieldId)
})
```

### 8.6 JSX shape after rewrite

```tsx
return (
  <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
    <div
      ref={containerRef}
      style={{ flex: 1, overflow: 'auto', background: 'var(--canvas-bg)', ... }}
    >
      <div data-testid="canvas-stage-wrapper" style={{ flexShrink: 0 }}>
        <canvas ref={canvasElRef} />
      </div>
    </div>

    {renderPageBar()}

    {showAddPageDialog && (
      <AddPageDialog onClose={() => setShowAddPageDialog(false)} onAdd={handleAddPage} />
    )}

    {pendingDraft && (
      <FieldCreationPopup draft={pendingDraft} onCancel={handlePopupCancel} onConfirm={handlePopupConfirm} />
    )}
  </div>
)
```

---

## 9. Remaining work — step-by-step

Do these in order. Each step gets its own conventional commit.

### Step 1 — rewrite `CanvasArea.tsx`

- Replace the imports (react-konva / konva → fabric).
- Remove `stageRef`, `transformerRef`; add `canvasElRef`, `fabricRef`, `fabricMgrRef` (optional helper object).
- Remove Konva-specific state (`isPanning`, `spacePanMode`, etc. for pan — re-implement via fabric viewport).
- Remove `getPointerPos`, `handleStageMouseDown`, `handleStageMouseMove`, `handleStageMouseUp` — the draw flow moves into fabric event handlers.
- Remove `handleFieldClick`, `handleFieldDblClick`, `handleFieldDragEnd` — merge into fabric event handlers.
- Remove the entire Stage/Layer/Group tree (lines ~1358–1610). Replace with a single `<canvas ref={canvasElRef} />` inside the existing wrapper div.
- Add:
  - `useEffect` that creates `fabric.Canvas` once, wires all events, returns `fc.dispose()` cleanup.
  - `useEffect` that reconciles `pageFields` → fabric objects.
  - `useEffect` that mirrors `selectedFieldIds` → `fc.setActiveObject()`.
  - `useEffect` that syncs `zoom` → `fc.setZoom()`.
  - `useEffect` that syncs `currentBgColor` / `bgImage` → fabric background.
  - `useEffect` that toggles grid lines on `showGrid`.
- Preserve:
  - All store subscriptions
  - `resolveCurrentBgDataUrl` / `resolveCurrentBgColor`
  - `bgImage` loading logic
  - `placeholderImages` map + effect
  - Auto-fit zoom effect
  - `pendingDraft` state + `handlePopupConfirm` / `handlePopupCancel`
  - Add-page / remove-page handlers and dialogs
  - `renderPageBar`
  - `OnboardingPicker` component verbatim
  - `AddPageDialog` component verbatim

The file will likely shrink from 1632 to ~900–1000 lines.

### Step 2 — update `main.tsx`

Remove:

```ts
import Konva from 'konva'
Konva.dragDistance = 5
```

Fabric has its own click/drag threshold; no equivalent needed.

### Step 3 — sweep remaining Konva imports

```bash
grep -rn "from 'konva'\|from 'react-konva'\|import.*konva" packages/ui/src
```

Expected: zero hits after Step 1. If anything else appears, port it.

### Step 4 — update existing Playwright tests

Current e2e tests (`e2e/*.spec.ts`) read from `Konva.stages[0]` via `window.Konva`. Fabric instances live on the DOM canvas — find them via `canvas.__fabric` or by exposing the canvas on `window` in dev mode.

Recommended pattern: in `CanvasArea.tsx` dev-mode, attach the fabric canvas to window:

```ts
if (import.meta.env.DEV) {
  ;(window as unknown as { __fabricCanvas?: fabric.Canvas }).__fabricCanvas = fc
}
```

Then in tests:

```ts
async function readSelection(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    interface FabricLike {
      getActiveObjects(): Array<{ __fieldId?: string }>
    }
    const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
    return (fc?.getActiveObjects() ?? []).map((o) => o.__fieldId).filter(Boolean) as string[]
  })
}
```

Files to update:

- `e2e/selection-and-move.spec.ts` — parameterised sweep over 1..5 fields, text-only + mixed. Already thorough; just swap the Konva reads.
- `e2e/pan.spec.ts`, `e2e/zoom.spec.ts`, `e2e/zoom-scroll-bounds.spec.ts` — Konva-specific tests. Either rewrite for fabric semantics or delete and re-author based on the new Fabric pan/zoom implementation.

### Step 5 — update Vitest tests

These exist under `packages/ui/src/**/__tests__/*.test.ts`. Most are store-level or theme-level and don't touch Konva. Audit:

```bash
grep -rln "konva\|Konva" packages/ui/src/**/__tests__/ 2>/dev/null
```

Any hits need rewriting or deletion. `fieldHitMath.test.ts` is a pure-math test that still applies (it tests a logical invariant, not Konva-specific behaviour).

### Step 6 — run full verification

```bash
pnpm type-check
pnpm lint
pnpm test          # Vitest
# Playwright (requires dev server):
pnpm --filter template-goblin-ui test:e2e
```

All must be green before moving to Step 7.

### Step 7 — remove Konva deps

```bash
pnpm --filter template-goblin-ui remove konva react-konva
```

Commit message: `chore(ui): remove konva and react-konva — superseded by Fabric.js`

### Step 8 — ask user to manually verify

Do NOT close GH issue #8 automatically. Per user's saved rule, only the user closes issues after manual verification in the running UI. In your PR / summary, list the manual smoke-test steps:

1. Fresh start → solid-color onboarding → canvas renders.
2. Draw a text field → popup appears → Create → field visible.
3. Click field → selected + right panel opens.
4. Drag field → moves.
5. Resize handle → commits new size on release.
6. Shift+click second field → multi-selected.
7. Ctrl+scroll → zoom at cursor.
8. Space+drag → pan.
9. Ctrl+0 → zoom to fit. Ctrl+1 → zoom 100%.
10. Add page → switch pages → delete non-last page → works.
11. Save template → open .tgbl → fields load correctly in fabric canvas.

---

## 10. Gotchas and lessons learned

### 10.1 Fabric v6 module augmentation MUST have a top-level import/export

If `fabric.d.ts` contains only `declare module 'fabric' {...}` with NO imports and no `export {}`, TypeScript treats it as an **ambient declaration** that SHADOWS the real fabric module. Symptoms: `TS2305: Module '"fabric"' has no exported member 'Rect'` (etc.) everywhere.

Fix: the file must start with at least `export {}` (or any `import` statement) so it's a module, then `declare module 'fabric' { ... }` augments.

Already fixed in the committed `fabric.d.ts`.

### 10.2 Konva Group has no intrinsic width/height

Reading `node.width()` / `node.height()` on a Konva Group returns 0 (Groups are just containers). During the original Konva resize handler I multiplied `0 * scaleX = 0 → clamped to 20`, collapsing every resize to the minimum. Fabric Groups DO have width/height so this isn't an issue — but watch for the same pattern if any Konva-era bug report mentions it.

### 10.3 `e.cancelBubble = true` in Konva's mousedown BREAKS Fabric-equivalent drag

In Konva I learned: `e.cancelBubble = true` in a field's `onMouseDown` handler prevented Konva's internal drag engine from seeing the event, making fields un-draggable. Fabric doesn't have this exact pattern (no bubble-cancel on mouse events by default), but be aware: in `canvas.on('mouse:down', opt => opt.e.stopPropagation())` you can break Fabric's drag too.

Best practice: do NOT stop propagation on fabric mouse events unless there's a specific reason.

### 10.4 Konva click vs drag ambiguity

In Konva: `click` only fires when mousedown+mouseup happen on the same shape AND the pointer moved less than `Konva.dragDistance`. Default is 0, so ANY drift = aborted drag = no click.

Fabric: handles this internally — `object:moving` vs `mouse:up` without movement. Don't re-introduce a manual threshold.

### 10.5 `selectAndFocus` store action

There's a `selectAndFocus(id)` action on `uiStore` that atomically does `{ selectedFieldIds: [id], showRightPanel: true }`. Use this from fabric `mouse:down` handlers, NOT `selectField(id)` + `setShowRightPanel(true)` separately. The single-action pattern prevents "selection happens but panel stays hidden" bugs.

### 10.6 onMouseDown AND onClick double-fire

In my previous Konva attempts I had both `onMouseDown` and `onClick` calling the selection action. For a plain click this was idempotent, but for shift+click (which uses `toggleFieldSelection`) it fired the toggle twice = net zero = silently failing multi-select. In Fabric, pick ONE event (`mouse:down` is the right one for select-on-press semantics).

### 10.7 Playwright tests need live dev server

```bash
pnpm --filter template-goblin-ui test:e2e
```

This invokes Playwright's `webServer` block in `e2e/playwright.config.ts`, which runs `pnpm dev` if the dev server isn't already running. If tests hang, check that port 4242 is free. Chromium is already installed at `~/.cache/ms-playwright/chromium_headless_shell-1217`.

### 10.8 UI package pre-existing type errors

Before the Fabric migration, `packages/ui/src/utils/{jsonGenerator,previewGenerator,sizeEstimator}.ts` had type errors left over from the Phase 1 refactor. Phase 4 of the larger plan was going to address them. They may resurface or be unaffected by the migration — keep an eye out.

### 10.9 Konva + Fabric parallel install is fine

Both libs are installed during the migration. They don't conflict — Konva is used only by the current `CanvasArea.tsx`, Fabric by `fabricUtils.ts` (not yet wired into a rendering component). After Step 1 + Step 7, Konva is gone entirely.

---

## 11. Key file locations

| Purpose                                    | Path                                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| Editor shell                               | `packages/ui/src/App.tsx`                                                     |
| Entry + Konva.dragDistance (to be removed) | `packages/ui/src/main.tsx`                                                    |
| **Canvas to rewrite**                      | `packages/ui/src/components/Canvas/CanvasArea.tsx`                            |
| Fabric helpers (ready)                     | `packages/ui/src/components/Canvas/fabricUtils.ts`                            |
| Fabric types (ready)                       | `packages/ui/src/components/Canvas/fabric.d.ts`                               |
| Field creation popup (engine-agnostic)     | `packages/ui/src/components/Canvas/FieldCreationPopup.tsx`                    |
| Field colour tokens                        | `packages/ui/src/theme/fieldColors.ts`                                        |
| Template store                             | `packages/ui/src/store/templateStore.ts`                                      |
| UI store (selectAndFocus, zoom, etc.)      | `packages/ui/src/store/uiStore.ts`                                            |
| Save/open (.tgbl)                          | `packages/ui/src/utils/saveOpen.ts`                                           |
| Schema types                               | `packages/types/src/template.ts`, `source.ts`, `errors.ts`, `input.ts`        |
| Core PDF library                           | `packages/core/src/generate.ts`, `load.ts`, `render/*.ts`                     |
| Canvas spec                                | `specs/009-ui-canvas.md`                                                      |
| Schema spec                                | `specs/002-template-schema.md`                                                |
| Design doc                                 | `docs/superpowers/specs/2026-04-18-static-dynamic-fields-design.md`           |
| Playwright tests                           | `packages/ui/e2e/*.spec.ts`                                                   |
| Playwright config                          | `packages/ui/e2e/playwright.config.ts`                                        |
| Memory (workflow rules)                    | `~/.claude/projects/-home-jaimin-My-Dev-Projects-fun-template-goblin/memory/` |

---

## 12. Important commits (reverse chronological)

```
80b8e54 feat(ui): fabric util helpers — field<->group mapping + coord conversion
0467a42 chore(ui): add fabric@6 dep for canvas engine swap
1c0dab8 docs(design): note Fabric.js migration is orthogonal to static/dynamic design
e078d7f spec(002): note Fabric.js is the editor engine; schema is engine-agnostic
22a51fd spec(009): migrate UI canvas spec from Konva to Fabric.js
```

---

## 13. Running the project

```bash
cd /home/jaimin/My/Dev/Projects/fun/template-goblin

# install (already done)
pnpm install

# dev server
pnpm --filter template-goblin-ui dev     # http://localhost:4242

# type check
pnpm type-check

# unit tests (Vitest)
pnpm test

# Playwright e2e (requires dev server OR will spawn one)
pnpm --filter template-goblin-ui test:e2e

# build
pnpm build
```

---

## 14. How to continue — suggested next session

1. **Read this entire document** before touching code.
2. **Read the updated `specs/009-ui-canvas.md`** — it's the contract.
3. **Read `packages/ui/src/components/Canvas/fabricUtils.ts`** — the helpers you'll use.
4. **Open `CanvasArea.tsx` with a map** — use §8.1 of this doc to know which sections to preserve vs replace.
5. **Write the new `CanvasArea.tsx` in one Write call** — don't try to surgically edit a 1632-line file; replacing it wholesale with a ~900-line Fabric version is cleaner.
6. **Run `pnpm type-check`** — fix cascading errors.
7. **Run `pnpm test`** — Vitest should be green.
8. **Run `pnpm --filter template-goblin-ui test:e2e` IF you've updated the Konva-specific tests** — otherwise they'll fail loudly.
9. **Ask the user to `pnpm --filter template-goblin-ui dev`** and walk through the §9 Step 8 smoke-test list.
10. **Only commit after the user says "works"**. Per §3 rule 3.
11. **Step 7 (remove Konva)** comes LAST, after everything is green + user-verified.

---

## 15. If you get stuck

- **Fabric docs**: https://fabricjs.com/ (v6) — especially Events, Groups, Transform, Viewport.
- **Konva → Fabric migration tips**: search "fabric.js equivalent of konva X".
- **Stack Overflow**: both libs have active tags.
- **Spec 009 F-Mapping section** (end of the file) is the authoritative mapping table.
- If a feature in Konva has no clear Fabric equivalent, flag it as an open question in a PR comment — don't invent behaviour that contradicts the spec.

---

## 16. What NOT to do

- Do NOT touch `packages/core/**`, `packages/types/**` — the schema and PDF pipeline are out of scope.
- Do NOT change the save/load format — `.tgbl` archive is a contract.
- Do NOT introduce a React-Konva wrapper for Fabric — there isn't a mature one. Use raw fabric + `useEffect`.
- Do NOT auto-close GitHub issues — only the user does that after verification.
- Do NOT use subagents unless the user asks. Direct editing is preferred.
- Do NOT commit before the user confirms the UI works. Stage changes, let them verify, then commit.

---

Good luck. The hard parts (schema design, fabric scaffolding, spec rewrite, GH issue) are done. The remaining work is mechanical translation of Konva event patterns to Fabric event patterns, guided by the docs + the F-Mapping table in spec 009.
