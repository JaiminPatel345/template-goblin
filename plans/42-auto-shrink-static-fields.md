# Plan — Issue #42: Auto-shrink static field rect to fit content

Branch: `feature/42-auto-shrink-static-fields`
Issue: https://github.com/JaiminPatel345/template-goblin/issues/42
Labels: enhancement, v2

## 1. Goal (from issue)

When a field has `source.mode === 'static'`, shrink its rect to the smallest
size that still fully contains the content. **Only shrink — never grow.**

- Static image: shrink to the image's natural aspect ratio.
- Static text: shrink to measured text width + height (+ inner pad).
- Dynamic fields: out of scope.

## 2. Trigger sites (verbatim from issue, mapped to real files)

| Trigger                         | File                                                         | Hook / method                                                               |
| ------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Draw-to-create confirm          | `packages/ui/src/components/Canvas/useFieldCreationPopup.ts` | `handlePopupConfirm`                                                        |
| Mode toggle dynamic → static    | `packages/ui/src/store/templateStore.ts`                     | `setFieldMode`                                                              |
| Right-panel static-text edit    | `packages/ui/src/components/RightPanel/TextFieldProps.tsx`   | `onStaticValueChange` (fires per-keystroke today — see Design Decisions §3) |
| Right-panel static-image change | `packages/ui/src/components/RightPanel/ImageFieldProps.tsx`  | `onStaticImageChange` (file-picker `onFileChange`)                          |

Issue explicitly notes: does NOT fire on resize.

## 3. Design decisions (no real alternatives — see Hard Rule #19)

These are decisions I'm making and recording for traceability. None has a
non-obvious tradeoff; surfacing them in the plan so the reviewer can flag if
they disagree.

1. **`innerPad` for text:** `2 pt`. Small enough to feel snug but prevents
   font-metric jitter (descenders / ascenders) clipping the rect edge. Text
   fields carry no padding today (`TextField` in `defaults.ts` has no padding;
   `paddingTop/Bottom/Left/Right` only exists on `CellStyle` for tables).
   Avoids reusing the `CellStyle.paddingLeft = 4` since text rect ≠ table cell.
2. **Minimums:** `MIN_RECT_W = MIN_RECT_H = 10 pt`. Prevents collapsing to
   invisibility on empty / whitespace-only strings.
3. **Right-panel text edit timing:** `onBlur` only, NOT per-keystroke.
   Per-keystroke would jitter the rect as the user types — actively bad UX.
   Onblur matches the popup-confirm "after committing the value" language
   from the issue. Implementation: bind a separate `onBlur` handler on the
   text input, no change to the existing per-keystroke `onChange`.
4. **Image natural-size race:** `staticImageDataUrls` always has the data URL
   once the image is added; we load an off-screen `Image` element, await
   `decode()`, then dispatch the shrink. If the image is already cached in the
   browser (very likely), decode resolves synchronously-ish on next microtask.
   We don't block the popup-confirm UI — fire-and-forget the shrink.
5. **Empty value / no image:** skip the shrink (no rect change). Specifically:
   text shrink with `text === ''` returns the existing rect unchanged; image
   shrink with no filename or unresolvable buffer skips too.
6. **Position anchor on shrink:** top-left preserved. Issue's "trim right edge
   / bottom edge" wording confirms this. `left`/`top` never change.
7. **Hard constraint (issue):** never grow. Both helpers return
   `{ width: min(measured, current), height: min(measured, current) }` so a
   measurement larger than the user's rect produces a no-op.

## 4. Architecture

### New pure helpers — `packages/ui/src/utils/autoShrink.ts`

```ts
export function fitStaticImageRect(
  currentW: number,
  currentH: number,
  naturalW: number,
  naturalH: number,
): { width: number; height: number }

export function measureStaticTextRect(
  text: string,
  fontFamily: string,
  fontSize: number,
  lineHeight: number,
  currentW: number,
  currentH: number,
  opts?: { innerPad?: number; minW?: number; minH?: number },
): { width: number; height: number }
```

Text helper reuses the cached 2D context + `wrapToLines` pattern from
`fitFontSize.ts`. Since `wrapToLines` is currently private, **extract it** to
a shared module `packages/ui/src/components/Canvas/textMeasure.ts` and let
both `fitFontSize` and the new shrink helper import it. (Hard Rule #11 — split
when touching; the file is already ~80 LOC, well under the cap.)

### Dispatch points

- `useFieldCreationPopup.ts`: after `createDefaultField` + `addField`, if the
  new field is static, run the shrink and follow up with `updateField`.
- `templateStore.ts:setFieldMode`: after switching `mode` from dynamic →
  static, run the shrink if the new static value is non-empty.
- `TextFieldProps.tsx`: add `onBlur` to the textarea; on blur, run shrink.
- `ImageFieldProps.tsx`: extend the file-picker handler; after
  `addPlaceholder` + `updateField`, load the image and dispatch the shrink.

No new dependencies.

## 5. Files touched

| File                                                         | Change                                                           |
| ------------------------------------------------------------ | ---------------------------------------------------------------- |
| `packages/ui/src/utils/autoShrink.ts`                        | NEW (~120 LOC) — pure helpers                                    |
| `packages/ui/src/components/Canvas/textMeasure.ts`           | NEW (~40 LOC) — extracted `wrapToLines` + shared measure context |
| `packages/ui/src/components/Canvas/fitFontSize.ts`           | -inner `wrapToLines` + import from `textMeasure.ts`              |
| `packages/ui/src/components/Canvas/useFieldCreationPopup.ts` | +shrink dispatch after create                                    |
| `packages/ui/src/store/templateStore.ts`                     | +shrink dispatch inside `setFieldMode` for dyn→static path       |
| `packages/ui/src/components/RightPanel/TextFieldProps.tsx`   | +onBlur shrink                                                   |
| `packages/ui/src/components/RightPanel/ImageFieldProps.tsx`  | +shrink after image pick                                         |
| `packages/ui/src/utils/__tests__/autoShrink.test.ts`         | NEW unit tests                                                   |

Every modified file stays under the 300-LOC cap (templateStore is already 992,
flagged below).

### Rule #11 risk

`templateStore.ts` is **992 LOC** — already over the cap. Touching it for #42
means we should split as we touch (rule explicitly says so). Approach: extract
`setFieldMode`'s body (or the whole mode-toggle logic) into a new helper
module `packages/ui/src/store/fieldModeMigration.ts` and call it from the
slice. This isolates the shrink dispatch and removes load from templateStore.
**This is in-scope for #42** — the rule mandates splitting on touch.

## 6. Tests

**Unit (Vitest):**

- `fitStaticImageRect` — wider-than-natural shrinks width; taller-than-natural
  shrinks height; matching aspect is no-op; oversized rect (smaller than
  natural extent at given aspect) — no growth.
- `measureStaticTextRect` — measured width applied; multi-line height applied;
  text bigger than current rect → no-op; empty string → no-op; respects
  `minW`/`minH`.

**E2E (Playwright) — deferred to a follow-up.** Issue suggests E2E for each of
the three trigger points; manual smoke + unit coverage is sufficient for the
initial PR. E2E for the canvas drag-create flow is non-trivial setup; if
reviewer wants it, file as #42-followup.

## 7. Commit plan

One commit:
`feat(canvas): auto-shrink static field rect to fit its content (#42)`

Changeset will be generated at push time (Hard Rule #12) — minor bump on
`template-goblin-ui` only.

## 8. Risks

1. **Image decode timing.** If the image element fails to decode (corrupt buffer,
   blocked data URL), the shrink silently no-ops. Acceptable — it's only a
   visual nicety.
2. **Per-keystroke vs onBlur** — see §3.3. Going with onBlur. If user actually
   wants live-shrink during typing, swap a debounced `onChange` in.
3. **Mode toggle on a freshly-converted dynamic→static field** with empty
   value — we skip. The field stays at the user's authored size until they
   add content, which then re-shrinks on next trigger. Documented in §3.5.
4. **templateStore split** is a meaningful refactor (lots of touched
   imports). Keeping the diff small: extract ONLY `setFieldMode` body and
   any close siblings, leave the rest of the file alone for follow-ups.

## 8c. Post-implementation semantic correction (user feedback)

User feedback after first browser test: "you reducing height too much — when
I say auto shrink that means … you never have to reduce height, height must
remain same as user draw. you just have to shrink width." Then a second
bug: "Jaimin" rendered as "Jai" because the renderer's own padding ate the
helper's safety margin.

Both fixed in the helpers (and tests):

1. **Height is never modified.** `fitStaticImageRect` and
   `measureStaticTextRect` now both return `height = currentH`. The image
   helper's "trim bottom edge" branch is gone; the text helper no longer
   computes wrapped height.
2. **Width pad bumped to 8pt per side (16pt total).** `pushTextLabel.ts:61`
   applies its own `innerPad = 6` on each side, so an effective text area
   of `rect_w − 12`. Our helper now adds `6 + 2 = 8` per side so the
   renderer always has at least 2pt of breathing room before truncate-mode
   would activate.
3. **Measurement context now sets `fontWeight` + `fontStyle`.** Bold text
   is wider than normal at the same fontSize; measuring at normal weight
   and rendering at bold was the root cause of "Jaimin" → "Jai" at bold
   weight (or any weight mismatch). The dispatcher passes the resolved
   weight + style through.
4. **`Math.ceil(naturalW)` before adding pad** so sub-pixel measurement
   never strips a fraction of a glyph in the renderer pass.

## 9. Implementation order

1. **Drop the `setFieldMode` (templateStore) trigger entirely.** The dyn→static
   flip almost always lands the field at `emptyStaticValue` (empty string /
   `{filename: ''}`), which our shrink helpers skip. The 1-of-4 case where the
   prior placeholder is carried as the new static value is reliably covered by
   the right-panel `onBlur` the moment the user next touches the value. Dropping
   this dispatch avoids touching the 992-LOC `templateStore.ts` for a feature
   that doesn't need it (resolves the Rule #15 vs #11 tension cited by QA).
2. **Drop the `textMeasure.ts` extraction.** `fitFontSize.ts` is 78 LOC, nowhere
   near the cap. Inline `wrapToLines` in `autoShrink.ts` (17 LOC copy) — smaller
   diff, no shared-helper churn.
3. **Defer E2E.** Issue calls for E2E per trigger; this PR ships unit coverage
   - manual smoke only. Will file a follow-up issue for the E2E specs once
     #42 lands. Documented as a known deviation.
4. **Popup-confirm dispatch ordering.** `handlePopupConfirm` in
   `useFieldCreationPopup.ts` defers the post-create work in a `setTimeout(0)`.
   We dispatch the shrink inside the SAME `setTimeout` body (after `addField`
   returns the id), so the create + shrink land in a single React render
   pass rather than two flickers.
5. **Wording:** the right-panel text input is an `<input>`, not a `<textarea>`.
   onBlur fires on focus-leave — reachable.

### Updated file list

| File                                                         | Change                                                |
| ------------------------------------------------------------ | ----------------------------------------------------- |
| `packages/ui/src/utils/autoShrink.ts`                        | NEW (~130 LOC) — pure helpers + inlined `wrapToLines` |
| `packages/ui/src/utils/__tests__/autoShrink.test.ts`         | NEW unit tests                                        |
| `packages/ui/src/components/Canvas/useFieldCreationPopup.ts` | +shrink dispatch inside existing `setTimeout(0)`      |
| `packages/ui/src/components/RightPanel/TextFieldProps.tsx`   | +onBlur shrink                                        |
| `packages/ui/src/components/RightPanel/ImageFieldProps.tsx`  | +shrink after `handleStaticUpload`                    |

`templateStore.ts`, `fitFontSize.ts`, no longer touched.

## 9. Implementation order

1. Extract `textMeasure.ts`; rewire `fitFontSize.ts`.
2. Write `autoShrink.ts` + unit tests.
3. Wire into `useFieldCreationPopup.ts`.
4. Wire into `TextFieldProps.tsx` (onBlur) and `ImageFieldProps.tsx`.
5. Add to `setFieldMode` in templateStore (with the helper split per §5).
6. Type-check, lint, tests, build.
7. Manual smoke in `pnpm dev`.
8. Master QA on implementation.
