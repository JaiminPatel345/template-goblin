# Plan — Issue #61: Page-wide Header & Footer (Phase 1)

Branch: `feature/61-page-header-footer`
Issue: https://github.com/JaiminPatel345/template-goblin/issues/61
Labels: enhancement, v3

## 0. Scope (locked with user)

| Question           | Decision                                                                                                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — Divider        | **Style property** on band (auto-rendered at body-facing edge). Not placeable.                                                                                                               |
| B — PR scope       | **Full Phase 1** as proposed in the issue.                                                                                                                                                   |
| C — Page number UX | **Single `Show Page Number` toggle** with placement (header/footer), alignment (left/center/right), color, and numeralStyle (`arabic` / `roman`). NOT a field type. No pageCount in this PR. |

Phase 2 (drag-edit of fields inside bands on canvas, hard body-vs-band collision at drag time, odd/even variants) is **out of scope** here.

## 1. Schema (`@template-goblin/types`)

New types in `packages/types/src/template.ts`:

```ts
export interface PageBandDivider {
  color: string | null // hex; null = no divider
  width: number // pt
  /** Gap (pt) between divider and body content. */
  gap: number
}

export interface PageBandStyle {
  /** Band height in points. 0 ⇒ disabled / not rendered. */
  height: number
  backgroundColor: string | null
  divider: PageBandDivider | null
  paddingTop: number
  paddingBottom: number
  paddingLeft: number
  paddingRight: number
}

export interface PageBand {
  style: PageBandStyle
  /** Fields whose x/y are interpreted in BAND-LOCAL coords (origin = band top-left). */
  fields: FieldDefinition[]
  /** Default true. When false, the band is omitted on page index 0. */
  applyToFirstPage: boolean
}

export type PageNumberPlacement = 'header' | 'footer'
export type PageNumberAlign = 'left' | 'center' | 'right'
export type PageNumberNumeralStyle = 'arabic' | 'roman'

export interface PageNumberConfig {
  enabled: boolean
  placement: PageNumberPlacement
  align: PageNumberAlign
  color: string // hex
  numeralStyle: PageNumberNumeralStyle
  fontFamily: string
  fontSize: number
  /** Default false — paired with header.applyToFirstPage / footer.applyToFirstPage. */
  showOnFirstPage: boolean
}
```

Manifest additions (extends existing `TemplateManifest`):

```ts
export interface TemplateManifest {
  // ... existing ...
  header?: PageBand
  footer?: PageBand
  pageNumber?: PageNumberConfig
}
```

**Field-type set is unchanged** — bands carry the existing text / image fields. No `pageNumber` field type (per decision C).

`packages/types/src/index.ts` exports the new types.

A new helper `packages/types/src/pageNumber.ts` exports `toRoman(n: number): string` for the renderer (and a `formatPageNumber(n, style)` wrapper). Trivial, unit-testable, no deps.

## 2. Core renderer (`packages/core/src/`)

### Approach (PDFKit `bufferPages: true`)

`generate.ts` constructs the PDFDocument with `bufferPages: true` so pages don't flush before we finish writing the body. After the body iteration we run a single header/footer **stamp pass**:

```ts
const doc = new PDFDocument({ bufferPages: true, ... })

// ... existing body iteration (renderField for each page's fields) ...

if (manifest.header || manifest.footer || manifest.pageNumber?.enabled) {
  const { start, count } = doc.bufferedPageRange()
  for (let i = 0; i < count; i++) {
    doc.switchToPage(start + i)
    stampBands(doc, manifest, i, count, ...)
  }
}
doc.end()
```

### New module `packages/core/src/render/bands.ts`

```ts
export function stampBands(
  doc: PDFDocument,
  manifest: TemplateManifest,
  pageIndex: number,
  pageCount: number,
  pageWidth: number,
  pageHeight: number,
  data: InputJSON,
  fontMap: FontMap,
  resolvedImages: ResolvedImages,
): void
```

- Renders `manifest.header` at `y = 0` if defined and `(pageIndex > 0 || header.applyToFirstPage)`.
- Renders `manifest.footer` at `y = pageHeight - footer.style.height` under the same rule.
- Inside each band, iterates `band.fields` calling the same `renderField` used for body fields, **after translating their (x, y) into page coords** (add band origin). We do this by passing a `bandOffset` to `renderField`, OR by mapping the field to a copy with adjusted (x, y) — the latter is simpler and avoids changing the existing renderField signature.
- Renders the auto-divider line at the band's body-facing edge if `style.divider` is non-null.
- If `pageNumber.enabled` and `pageNumber.placement` matches the current band, draws the formatted number using the band's padding-respecting bounds + the configured align/color/font.

### Skip-first-page rules

- `band.applyToFirstPage === false` → omit band on `pageIndex === 0`.
- `pageNumber.showOnFirstPage === false` → omit page number on `pageIndex === 0`.

These flags are independent: the header can render on page 0 while the page number does not (or vice-versa).

### Body-vs-band collision

The renderer **rejects** a manifest whose body fields overlap the band Y-ranges. Hook into `validateManifest.ts`: when `header` is present, every body field's bounding rect must have `y + height <= header.style.height` is FALSE — i.e. body `y >= header.style.height`. Symmetrically for footer (`y + height <= pageHeight - footer.style.height`).

### Page count footprint

Available via `doc.bufferedPageRange().count` in the stamp pass — no separate counting needed.

## 3. Canvas (`packages/ui/src/components/Canvas/`)

### Band visuals — `useBandVisuals.ts` (new)

A new effect (mirroring `usePageBoundsEnforcement.ts`) draws non-interactive band rectangles on the current page:

- Two `fabric.Rect` objects tagged `__isBand: true` (new flag in `fabric.d.ts`).
- Filled with `style.backgroundColor` (or transparent).
- A `fabric.Line` for the divider if `style.divider` is set.
- Auto-rebuilt on `header` / `footer` / page-meta changes.
- Sent to back (above page-bounds rect, below body fields).

Band field visuals are rendered in the same effect: each band field's group is positioned at `(bandOffset + field.x, bandOffset + field.y)` on the canvas, **and tagged `__isBandField: true`** so the field-reconciler in `useFabricSync.ts` ignores them (they belong to this band effect, not the main field array).

### Body-zone clamp — extend `clampToPage`

`usePageBoundsEnforcement.ts:clampToPage` currently clamps body fields to `[0, 0, pageW, pageH]`. We extend it to clamp to the **body zone**: `[0, headerH, pageW, pageH - footerH]`. The function takes the band heights as additional args. `wireSmartGuides` / `wireDragResizeEvents` continue to call it unchanged; `usePageBoundsEnforcement` passes the resolved heights.

Body fields whose existing `y` falls inside the band band area on first render of a header-enabled template don't get auto-moved — that's a destructive change. The canvas highlights them visually as a follow-up (Phase 2). The renderer validation surfaces the error explicitly.

### Page-number rendering on canvas

Identical math to the renderer:

- Position determined by `pageNumber.placement` (top/bottom band), `align`, and padding.
- Numeral rendered via the shared `formatPageNumber(n, style)`.
- Canvas shows page index of the currently-active page (so the user sees what a real PDF would).

## 4. Right panel (`packages/ui/src/components/RightPanel/`)

When no field is selected, replace the current placeholder text with a new `<PageLayoutPanel />`.

### `PageLayoutPanel.tsx` (new)

Sections:

1. **Header** — Enable toggle (sets `header` to default config or to `undefined`), Height (NumberInput), Padding (4 NumberInputs), Background colour (ColorPickerPopover, nullable), Divider (toggle + color + width + gap when on), `Apply to first page` (checkbox).
2. **Footer** — identical shape.
3. **Page Number** — Enable toggle. When on: Placement (segmented Header/Footer), Alignment (AlignButtonGroup left/center/right — reused from #42 split), Numeral Style (segmented Arabic / Roman), Font Family (select reusing the template's font list), Font Size (NumberInput), Color (ColorPickerPopover), Show on first page (checkbox).

Subcomponents:

- `HeaderFooterSection.tsx` — one shared component for header + footer (DRY).
- `PageNumberSection.tsx` — page-number controls.

Each section's onChange dispatches via the new store mutations.

### `RightPanel.tsx` wire-up

Replace the existing "Select a field…" branch with `<PageLayoutPanel />`.

## 5. Store (`packages/ui/src/store/templateStore.ts`)

New mutations following the existing `setMeta` pattern (lines 60–61, 402–418):

```ts
setHeader: (header: PageBand | undefined) => void
setHeaderStyle: (patch: Partial<PageBandStyle>) => void
setFooter: (footer: PageBand | undefined) => void
setFooterStyle: (patch: Partial<PageBandStyle>) => void
setPageNumber: (config: PageNumberConfig | undefined) => void
setPageNumberConfig: (patch: Partial<PageNumberConfig>) => void
```

All update `meta.updatedAt`. Header / footer / pageNumber live on the manifest (not under `meta`) so they slot in as top-level store state alongside `pages`, `fields`, etc. — extending `TemplateStoreState`. Persist them in `partialize` like other top-level state.

### Persist migration

`PERSIST_VERSION: 2 → 3`. New `migrateV2toV3` branch: pre-existing state has no `header` / `footer` / `pageNumber` keys → set them to `undefined`. **Migration is a no-op semantically** — feature is opt-in. Existing templates open exactly as before.

### Hard Rule #11 split

`templateStore.ts` is **992 LOC**, already over the cap. Per Rule #11 ("split as you touch"), this PR splits **only the parts it touches** — extract the header/footer/pageNumber mutations to a new module `packages/ui/src/store/headerFooterSlice.ts` that returns the mutation set; the main store composes it. We do NOT refactor the rest of the store.

This is the same restraint applied for #42 (where we declined to split `templateStore.ts`). The difference here: #42 didn't touch the slice at all; #61 adds new mutations directly to it, so the rule's trigger is met. Keeping the extraction local to our own additions keeps blast radius small.

## 6. Tests

### Unit (Vitest)

- `packages/types/__tests__/pageNumber.test.ts` — `toRoman(1..3999)`, `formatPageNumber(n, 'arabic' | 'roman')`.
- `packages/core/tests/render/bands.test.ts` — happy path render of header / footer; skip-first-page; pageNumber on header vs footer; align variants.
- `packages/core/tests/validateManifest.test.ts` — body-vs-band overlap → validation error.
- `packages/ui/src/components/Canvas/__tests__/bodyZoneClamp.test.ts` — `clampToPage` respects header / footer Y-bands.
- `packages/ui/src/store/__tests__/headerFooterSlice.test.ts` — mutations apply correctly; persist migration v2 → v3 leaves pre-existing templates untouched.

### E2E (Playwright)

- `packages/ui/e2e/header-footer.spec.ts`:
  - Open a new template, open Page Layout panel, enable header (height 40pt, with divider).
  - Toggle Show Page Number → footer / center / arabic.
  - Generate preview PDF (existing preview-dialog flow), download, and verify the page-bar text — match the renderer's expected page-number output.
  - Toggle `applyToFirstPage` off → re-render → assert page 1 missing header.

### Coverage acknowledgement

E2E is ~2 new specs. Unit covers the load-bearing math. Visual canvas/PDF parity is out of scope for snapshot in this PR — manual smoke after each round of changes.

## 7. Files touched (summary)

| File                                                            | Change                                                         |
| --------------------------------------------------------------- | -------------------------------------------------------------- |
| `packages/types/src/template.ts`                                | NEW types + manifest additions                                 |
| `packages/types/src/pageNumber.ts`                              | NEW — toRoman, formatPageNumber                                |
| `packages/types/src/index.ts`                                   | Export new types + helpers                                     |
| `packages/core/src/generate.ts`                                 | Switch to `bufferPages: true`; call `stampBands`               |
| `packages/core/src/render/bands.ts`                             | NEW — header/footer + page number stamping                     |
| `packages/core/src/validateManifest.ts`                         | Reject body-vs-band overlap                                    |
| `packages/ui/src/components/Canvas/fabric.d.ts`                 | `__isBand?`, `__isBandField?`                                  |
| `packages/ui/src/components/Canvas/useBandVisuals.ts`           | NEW — band rectangles + dividers + band fields                 |
| `packages/ui/src/components/Canvas/usePageBoundsEnforcement.ts` | `clampToPage` honours band Y-range                             |
| `packages/ui/src/components/Canvas/useFabricCanvas.ts`          | Wire `useBandVisuals`                                          |
| `packages/ui/src/components/RightPanel/PageLayoutPanel.tsx`     | NEW root panel                                                 |
| `packages/ui/src/components/RightPanel/HeaderFooterSection.tsx` | NEW shared band config                                         |
| `packages/ui/src/components/RightPanel/PageNumberSection.tsx`   | NEW page-number config                                         |
| `packages/ui/src/components/RightPanel/RightPanel.tsx`          | Render `PageLayoutPanel` when no selection                     |
| `packages/ui/src/store/headerFooterSlice.ts`                    | NEW slice — mutations                                          |
| `packages/ui/src/store/templateStore.ts`                        | Compose new slice; bump `PERSIST_VERSION`; add v2→v3 migration |
| `plans/61-page-header-footer.md`                                | this doc                                                       |
| Tests (5 new files)                                             | unit + e2e                                                     |

Every new source file targets ≤ 200 LOC. `PageLayoutPanel` is the biggest risk — if it bloats, push subsection state into the section files.

## 8. Risks / open notes

1. **`bufferPages: true` ripple.** Today `doc.end()` flushes pages incrementally. With buffering, memory grows with page count. For typical templates (≤ 50 pages) this is negligible. Documented; revisit if a stress test surfaces it.
2. **PDFKit version pin.** Confirm the installed PDFKit version supports `bufferedPageRange`/`switchToPage`. It does in 0.13+; the repo's `pdfkit` is current.
3. **Band fields' field-id namespace.** Band fields' IDs must remain globally unique across body fields too (we already enforce uniqueness in validateManifest — extending that check is one line).
4. **Header / footer height of 0.** If the user sets `height: 0`, we treat the band as absent (renderer + canvas no-op). Skipping requires the `enabled` toggle in the right panel to write `undefined` (vs height-0), so the manifest stays clean.
5. **Page number on page 0 with both `header.applyToFirstPage=false` and `pageNumber.showOnFirstPage=true`** — the page number's chosen band doesn't render on page 0, so we have nowhere to draw. Rule: if the chosen band is omitted on page 0, the page number is too. Documented in the renderer.

## 9. Implementation order

1. Types (schema + pageNumber helper + tests).
2. Store mutations + persist migration + tests.
3. Core renderer — `stampBands` + integration in `generate.ts` + bands tests.
4. validateManifest body-vs-band check + test.
5. Canvas band visuals + body-zone clamp + test.
6. Right panel sections (read-only first, then onChange wiring).
7. E2E specs.
8. Master QA on impl; manual smoke in browser.

## 10b. Master-QA fixes (applied before implementation)

QA found 9 concrete issues in the plan as first written. All accepted:

1. **`bufferPages: true` is already set** (`generate.ts:71`) — §2 is now just
   "add a stamp pass after the existing body loop"; nothing changes in
   construction. Risk #1 (memory growth) dropped — it's the status quo.
2. **`validateManifest` overlap rule is gated.** Only enforced when
   `manifest.header !== undefined` (resp. footer); pre-existing templates
   keep loading unchanged. Error code: new `FIELD_OVERLAPS_BAND` in the
   `INVALID_MANIFEST` family.
3. **Drop the `headerFooterSlice.ts` extraction.** Same Rule #15 vs #11
   tension from #42 — the slice extraction is theatre, doesn't bring
   templateStore under cap. Add the six mutations inline (~80 LOC).
   templateStore stays grandfathered; a real responsibility-aligned split
   is a follow-up issue.
4. **Extend `useFabricSync.ts:102` skip list** to include `__isBandField`,
   so the body-field reconciler doesn't remove band-field groups. New
   filter: `if (o.__fieldId && !o.__isGrid && !o.__isPageBounds && !o.__isBandField)`.
5. **No `PERSIST_VERSION` bump.** The additions are purely additive and
   zustand tolerates missing keys; bumping would force every existing
   template through `migratePersistedState` and emit a misleading
   `migrated from v2 to v3` info log on every load. Plan §5 updated to
   "no version change required".
6. **Pre-split `bands.ts` from the start** — orchestrator (`bands.ts`),
   page-number stamp (`pageNumberStamp.ts`), divider (`bandDivider.ts`).
   Each ≤ 120 LOC. `PageLayoutPanel` keeps its three-section split too.
7. **Validator rule for page-number placement:**
   `pageNumber.enabled && pageNumber.placement === 'header'` requires
   `header !== undefined` (and symmetrically for footer). Without this,
   the page number silently disappears. New error code:
   `PAGE_NUMBER_PLACEMENT_INVALID`. Unit-tested.
8. **PR body will call out two known deviations:**
   - Top-level `header` / `footer` / `pageNumber` on the manifest (vs the
     issue body's `meta.header` sketch). Done for parity with `fields` /
     `pages`. The pre-work comment on the issue uses the same top-level
     shape.
   - Page number as a toggle (decision C), not a field type as the
     comment's confirmed-decisions table initially recorded.
9. **Error code named** in §6 tests: `FIELD_OVERLAPS_BAND`.

## 10. Deferred (Phase 2 / follow-ups)

- Drag-and-drop creation / editing of fields INSIDE bands on canvas (this PR ships the data model and visual rendering; fields can be added via right panel field list — keep terse for v1, or defer entirely to phase 2).
- Page count (`{{pageCount}}` or "Page X of Y"). Easy add once pageNumber is in.
- Odd/even / first-page variant bands.
- Existing body-field auto-move when enabling a header on a populated template (current behaviour: validation error; user repositions).
