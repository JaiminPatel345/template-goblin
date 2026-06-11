# template-goblin-ui

## 2.5.1

### Patch Changes

- 834d25b: Docs: remove the "Under Construction" / "Pre-1.0" banners from the README of
  every published package — the packages are published and stable. The repo
  README gains an npm version badge in place of the construction notice.

## 2.5.0

### Minor Changes

- 03083eb: Text styling toolbar and WYSIWYG fixes (#167)
  - **UI:** Word/Canva-style floating selection toolbar with B/I/U/S toggles, font
    size, text colour, and text background colour, anchored to the selected text
    field. Added the same B/I/U/S group to the Format ribbon and the right panel.
  - **UI:** A rotation control in the selection toolbar — a compact trigger that
    opens a popover with a large draggable angle dial, a numeric input, and
    0/90/180/270 presets. Popovers now portal to `document.body` so they anchor
    on the canvas next to their trigger instead of drifting over the side panel.
  - **UI:** Theme toggle button on the navbar; the transparent / no-fill option
    now lives inside the colour picker.
  - **Types:** `TextFieldStyle.backgroundColor` for an optional text background.
  - **Core:** Render a text field's background colour, clip text to its box, and
    optically centre text (including overflowing text) so the generated PDF
    matches the canvas. Dropped the 6px text inset for true WYSIWYG.

## 2.4.0

### Minor Changes

- 1af398e: feat(canvas): auto-shrink static field rect width to fit content

  When the user commits a static text or static image field, automatically
  shrink its **width** so there's no wasted whitespace beyond the content.
  The user-drawn **height** is always preserved — it represents an
  intentional layout choice and is never auto-modified.
  - Static text: width = measured text width + 16pt internal pad (matches the
    renderer's own innerPad plus a 2pt-per-side safety margin so glyphs never
    clip into truncate-mode).
  - Static image: width = `naturalW × currentH / naturalH` so the image fills
    the user's chosen height at its natural aspect ratio.
  - Width never grows past what the user drew — if content already fills or
    overflows the rect, the existing overflow-mode (truncate / dynamic font)
    takes over.
  - Triggers on draw-to-create commit, right-panel text input blur, and
    right-panel image replacement. Does not fire on resize.
  - Holding the Alt-style "don't touch" — out of scope; the user can manually
    resize after the shrink.

  Closes #42.

- 7e1c991: feat(ui): Word-style menu + ribbon top bar redesign (#128)

  The single-row 657-line `Toolbar.tsx` crammed every action together with
  no grouping. Replaced with a two-row Word-style shell.

  **Row 1 — Menu tab strip:**
  File · Edit · Insert · Format · View · Help &nbsp;|&nbsp;
  pinned tools (Text · Image · Table) &nbsp;|&nbsp;
  Preview · Save · Lock

  **Row 2 — Ribbon:** swaps to match the active tab. Each tab's controls
  get a dedicated, always-visible row so common actions are one click
  away (Word ribbon model), and pinned Insert tools stay reachable from
  any tab.

  **Tab contents:**
  - **File** — New · Open · Change Background
  - **Edit** — Undo · Redo
  - **Insert** — Header · Footer · Page Number (each opens a settings
    popup containing the show/hide toggle + all options)
  - **Format** — Properties panel toggle · Font Manager
  - **View** — Toggle left/right panels · Snap · Zoom −/%/+ · Theme
  - **Help** — GitHub · Shortcuts

  **Page Number placement** can land in either Header or Footer
  regardless of whether the chosen band is currently enabled — the
  store's `ensureBandForPageNumber` helper auto-creates+enables the
  target band on placement pick. No "enable a header first" friction.

  **Pinned Insert tools** (Text / Image / Table) keep the same one-click
  draw-to-create UX from before and stay visible across every tab. Lock
  toggles template-wide; the pinned tools disable when locked.

  **File structure** under `Toolbar/`:
  - `Toolbar.tsx` — empty-state OR two-row shell (~120 LOC)
  - `MenuTabBar.tsx`, `RibbonBar.tsx`
  - `icons.tsx` — shared inline SVGs (Hard Rule #7)
  - `primitives/MenuButton.tsx`, `RibbonButton.tsx`, `RibbonGroup.tsx`
  - `ribbons/FileRibbon.tsx`, `EditRibbon.tsx`, `InsertRibbon.tsx`,
    `FormatRibbon.tsx`, `ViewRibbon.tsx`, `HelpRibbon.tsx`

  Themed with CSS variables (`--bg-secondary`, `--bg-tertiary`,
  `--text-primary`, `--accent`, …); every button is a `.tg-ribbon-btn`
  or `.tg-menu-tab` so Tailwind v4 preflight's base-layer
  `button { background-color: transparent }` doesn't strip the active
  highlight. Verified live in Chrome — menubar/ribbon/text/tab colours
  all flip correctly between light and dark themes.

  UI store gains a single new field: `activeMenuTab: 'file' | 'edit' |
'insert' | 'format' | 'view' | 'help'` (default `'insert'`).

  Comprehensive Playwright coverage in `e2e/navbar-redesign.spec.ts`
  (32 tests) hitting every visible button — happy path + edge cases:
  locked template, multi-tab swap, theme persistence, popup auto-create
  on placement pick, etc. Existing band/color/onboarding/page-dim/
  change-bg specs (5 specs touched) updated to the new selectors; full
  sweep: 87/88 pass / 1 unrelated skip.

  Closes #128.

- 056808f: feat(template): page-wide header, footer, and page number (#61)

  Templates can now define a page-wide **header** band, **footer** band, and
  **page number** that paint on every page (or every page except the first,
  via `applyToFirstPage`). Bands accept text and image fields, have their
  own padding / background colour / optional divider, and stamp on top of
  the body content via a buffered second pass in the PDF renderer so the
  final page count is known before they render.

  Highlights:
  - Manifest gains optional `header`, `footer`, and `pageNumber` blocks.
    Each band carries `enabled`, `style` (height, padding, background,
    divider), `fields`, and `applyToFirstPage`. Page-number config covers
    placement, alignment, colour, numeral style (`arabic`, `roman`,
    `arabic-paren`), font, font size, and `showOnFirstPage`.
  - New toolbar **Page Layout** anchored menu with `›` flyouts for
    Header / Footer / Page Number — toggle visibility from the flyout,
    open a per-band settings modal for fine controls.
  - Hide-band preserves the band's full style and migrates its fields
    into body with absolute coordinates so the user keeps editing them
    as normal elements. Show-band reclaims body fields whose bounding
    box still sits entirely inside the band's Y-strip (the user never
    moved them out) back into the band with band-local coordinates
    restored — keeps the validator clean on re-show. Fields the user
    explicitly moved out of the strip stay in body.
  - JSON Preview surfaces dynamic header/footer field keys in the same
    flat `texts` / `images` / `tables` / `links` buckets the renderer
    reads from, so canvas, JSON, and PDF stay in sync.
  - `setPageNumber` and `setPageNumberConfig` atomically enable the
    placement band so turning page numbers on (or switching placement)
    can't land in a state the validator rejects.
  - Canvas z-order: band chrome (background, divider, page-number text)
    paints below band field groups; the reconciler counts band visuals
    as ambient so a coloured band background never hides its own fields.
  - Defaults driven by QA: dividers default to disabled in both header
    and footer; when the user enables a divider it defaults to `gap: 0`
    (flush against the band edge); `pageNumber.showOnFirstPage` defaults
    to `true` so the page number is visible on a single-page template
    out of the box.
  - Renderer adds a band-stamp pass after the body loop using PDFKit's
    `bufferPages` + `bufferedPageRange` + `switchToPage`. New validator
    gates: `FIELD_OVERLAPS_BAND` when a body field intrudes into an
    enabled band's Y-strip, `PAGE_NUMBER_PLACEMENT_INVALID` when the
    chosen placement band isn't enabled, and `INVALID_MANIFEST` when
    a table-type field appears inside a band (text and image only).
    Disabled bands bypass overlap enforcement — they paint nothing at
    PDF time, so body fields living in their former Y-strip are
    legitimate page content.
  - Defence-in-depth page-dimension clamp: `setPageSize` and `updatePage`
    floor width/height at 1pt; `validateManifest` rejects non-finite or
    sub-1 page dimensions at PDF generation so a hand-edited `.tgbl` or
    a server endpoint can't crash PDFKit with a negative dimension.

  Closes #61.

- 83458fe: feat(preview): auto-inject placeholder base64 in JSON Preview + fix Render image type (#165)

  The JSON Preview panel used to emit the bare placeholder filename
  (or the literal `<base64-image-data>` for required-with-no-
  placeholder) for every dynamic image field. Developers reading the
  panel for the expected schema couldn't tell what the runtime image
  bucket actually contained, and the Preview dialog opened with
  the same too-thin shape.

  `generateExampleJson` now accepts an optional
  `imageDataUrls: Map<filename, dataUrl>`. When a dynamic image
  field's placeholder is in the map, the emitted value is the data
  URL's first 80 chars + a recognisable sentinel suffix
  `...<placeholder>` so the panel reads as real image data without
  flooding the textarea with multi-KB base64.

  `JsonPreview` and `PreviewDialog` both pass the existing
  `buildImageDataUrlMap(staticImageDataUrls, placeholderBuffers)`
  result into the generator. The right-panel pin + the Preview
  dialog now display the same shape.

  `PreviewDialog.handleRender` does two things to make Render work
  end-to-end:
  - Seeds every dynamic image field with the FULL data URL from
    the same map (was previously seeding the raw ArrayBuffer and
    relying on the parsed.images overlay to overwrite with a
    filename string — fragile and broke once the truncated value
    was preserved).
  - Skips parsed.images entries that end in the sentinel suffix so
    the user clicking Render without editing the JSON keeps the
    full placeholder data URL.

  Tests:
  - 8 new vitest cases in jsonGenerator.test.ts covering the
    truncation, the fallback-to-filename, the no-map case, the
    required-no-placeholder + non-required cases, and the
    `isPlaceholderImageSentinel` helper.
  - e2e/issue-165-preview-image-base64.spec.ts seeds a dynamic
    image field with a placeholder bitmap and asserts the JSON
    Preview textarea contains `images.<key>` with a
    `data:image/png;base64,…` prefix and `...<placeholder>` suffix.

  End-to-end verified in Chrome: JSON Preview shows the expected
  truncated base64 for the seeded image field. The previous
  'invalid data: expected Buffer / string, got object' error from
  Render is gone — the data URL flows cleanly into core.

  Closes #165.

- 4b7ce56: fix: QA bug follow-ups — ribbon click-outside, reactive undo state, table fit-to-data, crosshair cursor

  Four follow-up fixes from the post-#157 QA pass, one branch, one commit per issue, all four verified live in Chrome via the MCP extension.

  **#159 — Ribbon collapses on mousedown outside the toolbar.** The Escape + active-tab-toggle gates from #145 stay; a new window-level mousedown handler in `MenuTabBar` triggers the same collapse when the click lands outside `[data-testid="toolbar-shell"]`. Bails when a dialog is open.

  **#160 — `canUndo` / `canRedo` reactive boolean state.** Promoted from imperative methods on the actions block to plain boolean fields on `TemplateState`. Kept in sync by `pushHistory` / `undo` / `redo` / `reset`. Components subscribe with `useTemplateStore((s) => s.canUndo)` and re-render automatically on every history change — no method call. `EditRibbon` migrated; legacy method form removed.

  **#162 — "Fit to data" button on table fields.** New row in `LoopFieldProps` next to Max Rows. Computes `header + min(dataRows, maxRows) × rowHeight` and calls `resizeField` to shrink the field's bounding box. Solves the "large empty banded area below the data rows" complaint from QA without touching the renderer's intentional "user authors the rect" semantic.

  **#164 — Crosshair cursor while a placing tool is active.** Inline style on the canvas container picks up `cursor: crosshair` when `activeTool` is `addText` / `addImage` / `addLoop`. Reinforces the hint banner from #134 with a tool-aware visual cue across the whole canvas region (not just inside the page bounds).

  Tests: 4 new e2e specs (one per issue). 1 small migration of the existing templateStore.test.ts canUndo/canRedo method calls to the property form. Existing 515 UI tests still green.

- 43b2193: fix: comprehensive QA bug sweep — 25 fixes, one branch, one commit per bug

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

- 9509ff6: feat(ui): replace native alert / confirm / prompt with Radix-based custom dialog primitives (#158)

  Every browser-native dialog the app was firing (`window.alert`,
  `window.confirm`, `window.prompt`) is replaced by a token-styled
  custom equivalent built on `@radix-ui/react-dialog`. The new
  surface is consistent with the rest of the v3 chrome — same
  theme, same focus-trap a11y, same animations, same Esc / overlay-
  click semantics.

  **New primitives** in `packages/ui/src/components/Dialogs/`:
  - `<DialogProvider>` — wraps `<App />` in `main.tsx`, owns the
    single active dialog (no stacking; matches native).
  - `useDialogs()` — hook returning `{ alert, confirm, prompt }`.
    Each call returns a Promise that resolves cleanly on dismiss
    (no rejections):
    - `alert({ title, message, variant? })` → `Promise<void>`
    - `confirm({ title, message, destructive? })` → `Promise<boolean>`
    - `prompt({ title, label, validate? })` → `Promise<string | null>`
  - `<DialogShell>` (internal) + `<DialogButton>` (internal) —
    shared chrome + action buttons.

  **Replaced call-sites:**
  - `LeftPanel/FieldList` — group-name prompt now uses the
    PromptDialog with an inline validator (empty trim → error,
    OK disabled).
  - `Toolbar/ribbons/FileRibbon` — File → New confirmation +
    open-file error toast → ConfirmDialog + AlertDialog.
  - `Toolbar/MenuTabBar` — Save error + dropped-fields warning →
    AlertDialog (variants: danger / warning).
  - `Toolbar/Toolbar` — image-upload size / type / dimension
    errors → AlertDialog.
  - `Toolbar/FontManager` — font size + magic-byte errors,
    remove-in-use confirmation → Alert + ConfirmDialog.
  - `Toolbar/ribbons/HelpRibbon` — keyboard shortcut dump →
    AlertDialog with multi-line message.
  - `Canvas/usePageHandlers` — last-page delete confirmation →
    ConfirmDialog with destructive accent.
  - `hooks/useKeyboard` — Save / Open error toasts on Ctrl+S /
    Ctrl+O → AlertDialog.

  **Tests:**
  - `e2e/issue-158-dialog-primitives.spec.ts` — 3 tests covering
    PromptDialog (happy path + validation), AlertDialog
    (shortcuts).
  - `e2e/bug-09-save-drops-warn.spec.ts` (#137) and
    `e2e/ux-04-new-confirm.spec.ts` (#150) — updated to drive the
    new dialog via its testid instead of stubbing
    `window.alert` / `window.confirm`.

  No native dialog calls remain in `packages/ui/src/` outside test
  files. The Radix `react-dialog` dep was already installed for
  #64; this PR is the first real consumer of it.

- 64841e8: chore(ui): replace react-color SketchPicker with react-colorful (#121)

  `react-color`'s `SketchPicker` used the legacy `defaultProps` API on a
  function component, emitting a React-18 deprecation warning every time
  the picker opened. It also warm-loaded a heavy palette on first mount
  which froze the renderer for ~3-5 seconds.

  Swapped for `react-colorful` (5 KB, zero deps, actively maintained,
  modern API). Same affordance the user is used to per #121's
  "no visual redesign" caveat: Saturation/Value square + Hue slider +
  hex text input + the 10-swatch preset grid the SketchPicker carried
  (rendered ourselves since react-colorful ships only the picker
  primitive).

  Verified live in Chrome at localhost:4242: picker opens in **23 ms**
  (issue target was <100 ms), zero `defaultProps` warnings across the
  full flow, zero other console warnings. Preset swatches, hex input
  typing, the parent hex field, and the onboarding preview disc
  (GH #115) all stay in sync regardless of which surface the user
  edits from. Escape closes the popover without bubbling to the
  surrounding modal; outside click closes it.

- cd98487: feat(canvas): rotate any element via sidebar Angle input + canvas handle (#172)

  Adds `rotation` to every field type and surfaces it through both an
  "Angle (°)" input in the LeftPanel properties editor and Fabric's
  selection rotation handle. The two are kept in two-way sync, both
  pivot around the field's unrotated centre, and the rotation
  round-trips through `.tgbl` save/load and the PDF render path.

  Schema (@template-goblin/types)
  - `FieldBase.rotation?: number | null` — degrees, around the rect
    centre. `null` / `undefined` / `0` all render unrotated, so
    pre-rotation templates continue to load.

  UI (template-goblin-ui)
  - LeftPanel "Angle (°)" input; canvas rotation handle exposed on
    every field type (text, image, table).
  - Sidebar and canvas-handle inputs both pivot around the unrotated
    centre — no visual translation when angle changes. Schema
    invariant `(x, y) = unrotated top-left` survives every gesture.
  - Angles are normalised to `[0, 360)` at every consumer boundary so
    huge inputs (e.g. accidental pastes) don't cause Fabric's
    selection border to drift off the rendered content.
  - Bonus fix: clicking a solid-colour image field no longer paints
    its bgRect with the selection emphasis fill — the user's chosen
    colour is preserved, emphasis switches to stroke only.

  PDF renderer (template-goblin)
  - `renderField` wraps each draw block in `doc.save() / doc.rotate(angle,
{ origin: [cx, cy] }) / doc.restore()` when rotation is non-zero.
    Origin matches the UI's centre-pivot so canvas preview and
    generated PDF agree pixel-for-pixel.

  Closes #172. Supersedes #33.

- 280de05: feat(ui): v3 design system — Linear-style palette, unified outlined-button system, Radix tooltips (#64)

  Real top-to-bottom redesign of the editor chrome, not a repaint:

  **Design tokens (`packages/ui/src/styles/theme.css`)** — single source of
  truth for colour, spacing, typography, radius, shadow, motion, z-index,
  focus-ring, and control-sizing scales. Both light and dark themes live
  side by side, gated by `data-theme`. Replaces the previous split
  `@theme` + legacy-bridge blocks in `App.css`.

  **Palette swap** — hot-pink `#e94560` (which read as warning / error
  across every control it touched) traded for Linear-style indigo
  `#5E6AD2` (light) / `#7C87E0` (dark). Neutrals refined toward slate-cool
  in both themes; the yellow-tinted off-white `--bg-primary` is gone.
  Indigo also drives the focus ring and the new tooltip arrow.

  **Unified control system** — every interactive control shares one
  height (`--control-height-md = 28px`) and one icon size
  (`--icon-size-md = 16px`). The ribbon-button column-vs-row split that
  made the old toolbar look unsorted (Left/Right stacked vertically vs
  Snap label-only vs Zoom row-compact vs Light icon+text) is gone — every
  button is now a single horizontal row of icon + label, on the same
  baseline. Icon-only buttons collapse to a perfect 28×28 square.

  **Outlined-button idiom across the whole nav bar** — File / Edit /
  Insert / Format / View / Help tabs + Text / Image / Table pinned tools
  - Preview / Save / Lock CTAs all use one outlined-button system: 1 px
    border at rest, fills on hover, indigo soft-fill + indigo border when
    active. No 3 D inset shadow tricks. Same idiom Tailwind UI, shadcn,
    GitHub button-groups, and Stripe Dashboard use.

  **Distinct band icons** — Header (page + top bar), Footer (page +
  bottom bar), Page Number (page + bold `#`). The three previously
  shared one generic `PageLayoutIcon` glyph, which read as a copy-paste
  mistake.

  **Radix Tooltip** — added `@radix-ui/react-tooltip` and a token-styled
  `Tooltip` primitive. Every `RibbonButton` with a `title` wraps in the
  tooltip, with 600 ms open-delay (Linear / Figma / GitHub all sit in
  500–700 ms) and an arrow tinted to `--bg-elevated`. `@radix-ui/react-
dialog` is also installed in preparation for the upcoming dialog-
  system pass.

  **Snap toggle now visibly works** — `buildGridLines` was stroking the
  grid with `rgba(255,255,255,0.08)` (white-on-white on the default page
  background). Switched to `rgba(0,0,0,0.14)` — a thin lattice that
  reads on white, off-white, and lightly-coloured page backgrounds, and
  stays subtle on dark pages.

  **JSON Preview** — the code block sat on `--bg-primary` which is the
  deepest surface in dark mode, so it recessed into the panel instead of
  reading as a raised tile. Switched to `--bg-tertiary` with
  `--border-light`; same fix applies to the empty-state card. The
  `Format / Max Fill / Copy` mode buttons now use the same outlined-
  button selected treatment as everything else.

  **Affordances** — global `:focus-visible` ring driven by `--ring-color`,
  `::selection` tinted to the accent, `prefers-reduced-motion` flattens
  transitions, `color-scheme` hint so native form controls track the
  theme.

  Verified live in Chrome via the MCP extension across both themes — all
  ribbons, tooltips, Snap toggle, theme toggle, onboarding flow.

### Patch Changes

- d0781b9: fix(store): heal poisoned page dimensions on rehydrate (#113)

  Closes the final gap from #113. The write-time `clampPageDimension` in
  `setPageSize` / `updatePage` and the manifest validator at PDF generation
  already prevent NEW bad state, but anyone whose IndexedDB still carries
  `meta.width: -100` (or `null` from a pre-fix `NaN` round-tripping through
  JSON) would still rehydrate the bad value verbatim and crash the canvas
  on next load.

  `clampPersistedPageDimensions` now runs in the persist `getItem` adapter
  right after `JSON.parse`, walking `meta.width` / `meta.height` and every
  explicitly-set `pages[].width` / `pages[].height` through the same
  ≥ 1pt floor used on the write path. Anything non-numeric, non-finite,
  or below 1 heals to 1.

- 80ce7ef: fix(canvas): marquee selection mirrors Canva semantics — fully-contained only, no visual displacement (#109)

  Drag-from-empty-area marquee on the editor canvas now matches the
  mental model every document tool ships: only fields whose entire
  bounding rect lies inside the marquee are selected (partial overlap
  is rejected), and fields do not visually displace while or after
  the marquee.

  The whole fix is one Fabric init flag: `selectionFullyContained:
true` in `useFabricCanvas.ts`. Fabric v6 already handles both
  acceptance items behind that flag — selection criterion + the
  ActiveSelection coord-system bookkeeping. Verified live in Chrome
  via dispatched mouse events: `duringDelta` and `afterDelta` both
  empty, only the fully-contained field's id ends up in
  `__uiStore.selectedFieldIds`.

  Coverage:
  - `marqueeContains.ts` exports `rectFullyContains` + `selectFully
ContainedFieldIds` — pure helpers any future custom marquee impl
    (lasso, multi-zone) can reuse.
  - 13 vitest cases pin the helper's edge-contact semantics.
  - 3 e2e specs drive real `mousedown` / `mousemove` / `mouseup` on
    Fabric's upper-canvas element and assert (a) the flag is live,
    (b) fully-contained fields are selected with no displacement,
    (c) partial-edge straddling rejects the field.

  Closes #109.

- fa6e289: fix(ui): shorten 'Next: page size' button so it fits the onboarding card (#114)

  The default `max-w-md` onboarding card was narrow enough that the
  primary action clipped to "Next: page si..." on first paint. Per
  #114's preferred fix, shorten the label to "Next →" in both the
  onboarding picker and the symmetric `AddPageDialog` button. The arrow
  keeps the call-to-action obvious; the next step's "Choose page size"
  heading carries the context.

  Verified live in Chrome at localhost:4242: button reads "Next →",
  scrollWidth === clientWidth (60px), no clipping. The 4 new Playwright
  tests in `e2e/onboarding-next-button.spec.ts` pin the label, measure
  scrollWidth ≤ clientWidth at both default and 360px viewports, and
  confirm the click still advances to the page-size step.

  Related-branch fixes folded in:
  - 7 existing specs hard-coded the old label in `hasText:` matchers.
    Updated to `/Next →/`.
  - `change-background.spec.ts` still drove a native `<input type="color">`
    that the #121 picker swap removed — switched to the new
    `color-picker-swatch` + `color-picker-hex` testids.

- 13c667a: fix(ui): onboarding colour preview icon reflects selected colour (#115)

  The inner disc of the SVG above "Pick a background color" used to inherit
  `var(--text-muted)` via `currentColor` and stayed grey regardless of what
  the user typed in the hex field or clicked in the swatch. The disc's
  `fill` is now bound to the live colour state, gated on the same
  `#RRGGBB` regex the Apply handler uses — partial typing falls back to
  the muted theme tint so the icon doesn't flash arbitrary colours
  mid-keystroke. Disc enlarged from `r=3` to `r=6` so the preview reads
  from across the canvas.

  Also fixed two pre-existing regressions in `e2e/onboarding-to-canvas.spec.ts`
  uncovered while testing this branch: the spec drove the pre-#61 flow
  (click Apply directly after typing the hex) but the UI now has an
  intermediate "Next: page size" step, and the `getFabricBgColor` helper
  read `fabricCanvas.backgroundColor` which has been empty since the
  GH #46 multi-page refactor — it now reads `pages[0].backgroundColor`
  from the store with the Fabric property as a fallback.

- cd60ea6: feat(ui): inline validation + disabled Apply on invalid custom page dimensions (#112)

  The store-side clamp from #112's prior pass silently floored negative /
  zero / non-finite custom dimensions to 1pt — protecting state but leaving
  the user with no feedback about why the value they typed was rejected.
  This adds the missing UX layer the bug body asked for:
  - New `validateCustomDims(width, height)` helper in `PageSizePicker.tsx`
    returns per-field error messages plus a `hasError` convenience flag.
  - The shared `PageSizePicker` renders a red inline chip below each input
    ("Width must be at least 1 pt.", "Height must be at least 1 pt.",
    "Width must be a number." for non-finite values) with `aria-invalid`
    and `aria-describedby` on the input for screen-reader users.
  - All three primary-action surfaces gate on validation when the picker
    is in `'custom'` mode: `OnboardingPicker` Apply, `AddPageDialog`
    Add Page / Apply, and the toolbar `PageSizeDialog` Apply (which has
    its own non-picker inputs, so it inlines the same chips).
  - 10 unit tests on `validateCustomDims` (happy path, sub-1pt, zero,
    fractional, NaN, ±Infinity, single-side, both-side errors).
  - 5 Playwright tests on the onboarding flow covering the exact bug
    repro, recovery on correction, zero-equivalence, both-side errors,
    and switching back to a preset clearing the disabled state.

## 2.3.0

### Minor Changes

- 98fd283: feat(canvas): smart alignment guides while moving fields (Canva/PowerPoint-style)

  Render transient pink/cyan guide lines while a field is being dragged when its
  edges or centre align with another field's edges/centre or with the page
  edges/centre. Magnetic snap within 6 pt (zoom-aware, clamped to 6–24 pt).
  Equal-spacing bracket marks appear when the active field sits between two
  others with matching gaps. Hold Alt to disable snapping. Guides disappear on
  mouse release.

  Resize-time snap is intentionally deferred — guides render visually during
  resize but the active field's scale is not mutated. (#41)

## 2.2.0

### Minor Changes

- a006138: Add README

## 2.1.0

### Minor Changes

- 740933c: Table styling expansion (#76 and follow-ups):
  - **Transparent fills and borders** — `CellStyle.backgroundColor` and `borderColor` now accept `null` as a "transparent" sentinel. Header bg, row bg, cell borders can be opted out in the right panel; the PDFKit renderer and Fabric canvas both skip the corresponding fill/stroke when null.
  - **Table-level border** — new optional `TableFieldStyle.tableBorder: { color, width }` paints the outer perimeter independently of per-cell strokes. New tables default to a 1pt black perimeter with cell strokes off. Legacy templates without `tableBorder` keep their row-derived perimeter.
  - **Fit to content** — new optional `TableFieldStyle.fitToContent` (default `true`, including for legacy templates) ends the perimeter at the last rendered row instead of stretching to the field rect's full height.
  - **Canvas parity** — Fabric preview now paints the outer perimeter using `tableBorder` and respects `fitToContent`, so right-panel edits show live; per-column align overrides are also merged over `rowStyle` so body cells align correctly on canvas.
  - **Color picker** — replaced the native `<input type="color">` (which froze the page on some browsers) with an in-page SketchPicker popover via `react-color`.
  - **UI polish** — clearer labels (Header Text Color, Header Row Background, Row Text Color, Row Background, Cell Border, Table Border), themed border on the transparent "Clear / Color" toggle, and a collapsible Columns section in the table properties panel.

## 2.0.0

### Major Changes

- 688f31d: Add hyperlink support — clickable elements in generated PDFs (#87).

  Designers can attach a URL to any text, image, or table field via a new "Link" section in the Properties panel. Two flavours:
  - **Static**: a literal URL pinned in the manifest (`{ mode: 'static', url }`).
  - **Dynamic**: a `links[jsonKey]` lookup (`{ mode: 'dynamic', jsonKey }`) resolved per render so the URL can vary across runs. URLs live in their own top-level `links` bucket on `InputJSON` — separate from `texts` so they're visually distinct in the JSON preview and never get confused with rendered text content.

  Allowed protocols: `https`, `http`, `mailto`, `tel`. Anything else is rejected as `INVALID_DATA_TYPE` with field context. Empty / missing dynamic values render the field without a clickable region (no error). For tables, the link covers the whole table's bounding rect — there is no per-row or per-column variant in v1.

  ### Schema additions
  - `FieldBase.hyperlink?: Hyperlink` — optional on every field.
  - `InputJSON.links?: LinkInputs` — new top-level bucket (`Record<string, string>`) for runtime hyperlink URLs.
  - New `Hyperlink` discriminated union exported from `@template-goblin/types`.
  - New helpers: `isValidHyperlinkUrl`, `isStaticHyperlink`, `isDynamicHyperlink`.

  ### Why major

  This is an additive but cross-cutting schema change touching public types, manifest validation, runtime data validation, and PDF rendering. The schema additions are backward-compatible (the field is optional), but the SDK contract grows in a way library consumers will want to opt into deliberately, so we cut a major.

  ### Out of scope (deferred)
  - Per-cell or per-column links inside tables.
  - Anchor links inside the same PDF (`#named-dest`).
  - Click-tracking / analytics wrappers — designer's own concern.
  - A canvas adornment showing which fields are linked — UI-only follow-up.

- 71e441e: Migrate the editor canvas from Konva / react-konva to Fabric.js v6.

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

### Minor Changes

- f993c14: Add Page dialog UX (#47):
  - "Same as previous page" no longer routes through the size step. The
    new page commits immediately with the previous page's dimensions —
    consistent with what the option's label implies.
  - The size picker labels are country-neutral: "US Letter" / "US Legal"
    → "Letter" / "Legal". The underlying `PageSize` keys are unchanged.
  - Picking "Custom" no longer grows the dialog. The width/height inputs
    reserve their bounding box at all times (visibility-hidden,
    pointer-events-none, tab-skipped, aria-hidden when not selected) so
    the parent dialog stays anchored. The dialog also carries an explicit
    `minWidth` / `minHeight` so step transitions don't reflow the modal
    either.
  - When the user picks Image upload, the size picker now opens with a
    "Match image (W × H pt)" radio at the top, pre-selected with the
    uploaded image's natural pixel dimensions. That's the most sensible
    default for an image-bg page (no scaling, no crop, native aspect
    ratio).

- f1a9f33: Change Background button (#58):
  - Renamed the toolbar "BG" button to "Change Background" with a tooltip.
  - Clicking it now opens the same modal as "+ Add Page" (image / solid
    color / inherit) instead of going straight to a file picker. The
    user can change the current page's background to any of the three
    kinds, not only an image.
  - Fixed: changing to a new image now actually updates the canvas. The
    pre-fix path called the legacy `setBackground` action, which writes
    only `backgroundDataUrl` / `backgroundBuffer`; multi-page templates
    read per-page bytes from `pageBackgroundDataUrls`, so the canvas
    silently kept showing the old image. The new handler updates the
    current page entry via `updatePage` + `setPageBackground`.
  - In Change Background mode, the size step's "Same as previous"
    radio now reads "Same as Current (W × H pt)" — the radio's value is
    the current page's size in this flow, so "previous" was the wrong
    word. The Add Page flow keeps "Same as previous".

- 9e89550: Add a "Format" button to the right-panel JSON Preview header (#85). One click pretty-prints the textarea content with 2-space indentation; `Cmd/Ctrl+Shift+F` does the same from inside the textarea. Invalid JSON surfaces a brief inline error below the textarea (auto-clears after ~3 s) and leaves the user's edits untouched. Clicking Format on the unpinned auto-generated baseline is a no-op so the preview keeps tracking subsequent field-add / field-edit events on the canvas. Multi-line textareas in the right panel no longer auto-select-all on focus, so users can click in to edit one value without the buffer being wiped on the next keystroke.
- 1e13011: Static and placeholder field labels now render at the largest font size that fits their bounding rectangle and re-fit automatically when the field is resized. The previous implementation clipped labels to a sliver of their intended area (users saw "tiny vertical lines" instead of real text). Switched from `FabricText` + `clipPath` to a centred `Textbox` that wraps to the rect's width, with the font-size ceiling raised so big rects get big type. Closes #12.
- 17991be: Replace the auto-trigger Preview flow with an interactive dialog (#45).
  Clicking Preview now opens a modal that pre-fills a JSON editor with the
  same default values the auto-trigger used and lists every dynamic image
  field for optional file replacement (PNG / JPEG / WEBP, ≤10 MB). The
  existing render pipeline (`generatePreviewHtml`) runs only on Render and
  opens the result in a new tab as before. The JSON editor validates on
  input — Render is disabled while parse errors are present, and renderer
  errors surface inline instead of via `alert()`. ESC, click-outside, ✕
  close button, and Cancel all dismiss without rendering. Reset to
  defaults restores the auto-generated JSON.
- 38d85e7: Selected fields now show unmistakable visual feedback in both the canvas and the toolbar. On the canvas the field's background rect darkens (or the stroke widens for transparent-fill fields like static / image-with-placeholder) and switches to the per-type accent. In the toolbar, the Text / Image / Table button for the selected field's type flips to its full active state (solid accent background, white text) — identical weight to the drawing-tool-active state — so you can always see which field type is in play. Multi-type selection lights up multiple buttons simultaneously. Closes #10.
- 04309d0: Sidebar layout restructure. The styling / properties editor now lives in the **left** sidebar (it used to be on the right) and the structural tree — field + group list, JSON preview, and PDF size estimate — now lives in the **right** sidebar. Two hamburger buttons in the toolbar (one at each end) fully collapse the matching panel, and the canvas expands to fill any freed width. Selecting a field still auto-opens the panel that contains its properties; the collapse state persists across reloads via the existing `uiStore` persist. Closes #19.
- 93bc316: Solid-colour image fields now store a colour value directly instead of
  baking a 1×1 PNG asset (#81). Pre-fix, picking "solid colour" generated
  a tiny PNG and rendered it through `fit: contain`, which produced a
  square in the centre of any non-square rect. Now solid-colour fields
  fill the entire rectangle regardless of aspect ratio, with no image
  asset bundled in the `.tgbl`.

  API additions:
  - `ImageSourceValue` is now a discriminated union: `{ filename } |
{ color }`. Type guards `isImageFilenameValue` / `isImageColorValue`
    are exported.
  - Dynamic input accepts a string marker
    `<STATICIMAGE_COLOR_#hex>` in `images.<key>` — the renderer paints
    the field's rect that colour. New helpers exported:
    `parseImageColorMarker`, `isImageColorMarker`, `makeImageColorMarker`.

  UI:
  - The properties panel for a solid-colour static image field shows a
    Color picker; the Fit Mode dropdown + Placeholder upload are hidden
    (irrelevant for solid fills).
  - The field-creation popup's "Solid color" button no longer generates
    a 1×1 PNG; the colour is the value.

- c51726f: Properties panel now matches the field type × mode matrix and stays in sync with the canvas + JSON preview.
  - **GH #25 — sync.** The canvas label honours the field's own `style` (font family, size, weight, italic, underline, color, alignment, line-height) so editing any of these in the properties panel re-renders the field on the canvas immediately. The JSON preview now surfaces a dynamic field's `placeholder` as the example value (text string, image filename) so what you see in the panel matches the preview.
  - **GH #26 — mode toggle.** Every field's properties panel now starts with a Static / Dynamic toggle. Flipping it migrates the user's content across — `value ↔ placeholder` for text and image, the row array for tables — so nothing is silently lost. Static fields show a literal `Value` input; dynamic fields show `JSON Key` / `Required` / `Placeholder`. Auto-fit font size and Min Font Size are hidden on static text (they only matter for variable-content rows). Image fields, static or dynamic, never show font controls.

  Closes #25, closes #26.

- 5f6dc2f: Table fields now stay in sync with the right-panel properties (#38).
  The canvas draws a column grid (one vertical divider per column boundary,
  scaled proportionally to declared widths) plus a header band with
  per-column labels — adding, editing, removing, or reordering columns
  produces visible feedback on the next reconcile. Header style edits in
  the properties panel — `fontFamily`, `fontSize`, `fontWeight`,
  `fontStyle`, `textDecoration`, `color`, `backgroundColor`, `borderColor`,
  `borderWidth`, `align`, `paddingLeft`, `paddingRight` — flow through to
  the rendered header band. The JSON preview pane was already reactive;
  the canvas catching up closes the sync gap.

  Side-panel UX polish: clicking (or tabbing) into any input inside the
  properties / structure panels now auto-selects the existing value, so
  the next keystroke replaces it instead of appending. Click-and-drag
  selections are preserved (only collapsed-caret focuses trigger
  select-all).

- 8233842: Unified text-overflow contract — content NEVER crosses its rectangle on
  any surface (#91). Pre-fix the canvas could spill, the PDF appended a
  `…` ellipsis, and the properties panel had two redundant knobs
  ("Dynamic Font Size" checkbox + "Overflow Mode" dropdown).
  - **Truncate**: cuts characters from the end at a character boundary
    until the visible text fits the rect width. **No ellipsis.**
  - **Dynamic Font**: shrinks `fontSize` down to `fontSizeMin`, then
    truncates the rest at a character boundary. No ellipsis.
  - **Static text**: truncates unconditionally. The pre-#73 max-fit
    auto-grow for static text is reverted at the user's request.
  - **Schema**: `TextFieldStyle.fontSizeDynamic` removed. The single knob
    is `overflowMode`. Default flips to `'truncate'`.
  - **UI**: "Dynamic Font Size" checkbox is gone. "Min Font Size" renamed
    to "Minimum Font Size" and shown only when Overflow Mode = Dynamic
    Font.

- cb6d6fc: Init changeset

### Patch Changes

- 4707da8: The canvas reflects the right-panel JSON in real time (#79). Pre-fix the
  canvas reconciler rendered every field from design-time defaults — it
  never consulted `previewJsonText` or the auto-generated example. So
  adding rows to the JSON didn't grow the table on the canvas, editing a
  text value didn't repaint, and a freshly-added table painted "however
  many rows visually fit" instead of the 1 row in JSON. Now editing the
  JSON textarea updates the relevant field on the next render frame:
  text labels pull from `data.texts[jsonKey]`; tables render
  `data.tables[jsonKey]` rows clipped to `min(data length, maxRows,
rows-that-fit-in-the-rect)` per Hard Rule #10. Mid-edit unparseable
  JSON keeps the canvas non-blank via a last-good cache.
- 94a94b9: Native horizontal + vertical scrollbars on the canvas viewport when the
  page exceeds the visible area (#66). Pre-fix, zooming past fit just
  clipped the page off-screen and only space+drag pan (undiscoverable to
  plain users) could reach the hidden edges. The Fabric canvas is now
  sized to `pageWidth × zoom × pageHeight × zoom` inside an
  `overflow: auto` container, so the browser draws scrollbars natively and
  mouse wheel / shift+wheel / trackpad two-finger scroll all work. Space
  - drag pan keeps working — it now drives the container's
    `scrollLeft`/`scrollTop` so it tracks the scrollbar position. Window
    resize while zoomed in preserves the user's zoom and scroll position
    (only sub-fit zooms recompute).

- 022d2d4: Default new fields, columns, and preview fallbacks to centre alignment (#39). New text and table fields are now created with `align: 'center'` + `verticalAlign: 'middle'`. Adding a new column to a table stamps the same centred alignment explicitly so the sidebar and the rendered cell agree from the first paint. Existing templates loaded from disk are untouched — only newly-created fields/columns pick up the new default.
- df15e3d: Default canvas zoom to 100% on canvas mount and on every page switch / page-meta change (#84). Previously the canvas auto-fit-zoomed to the viewport, which caused the displayed zoom indicator to lie about the real paint size and made the +/- controls jump to whatever Fabric was actually rendering at. The reset effect now resizes the canvas synchronously to `meta.width × meta.height` so the indicator and the painted canvas always agree.
- f953bf3: Dynamic text fields are now WYSIWYG with the PDF (#73). Before, a dynamic
  text field with `fontSize: 12` rendered on the canvas at the auto-fit max
  size (often well above 12pt) while the sidebar showed 12 and the PDF
  printed 12 — three sources of truth, two of them wrong. The canvas and
  HTML preview now render dynamic text at the authored `fontSize`, never
  auto-growing past it. New fields default to `fontSizeDynamic: false` so
  authoring is honest from the first paint; users opt in to runtime
  shrinking when they expect overflow on real data. Editing `fontSize`,
  `maxRows`, or `lineHeight` from the properties panel no longer silently
  resizes the rect for dynamic fields — the author-drawn rectangle is
  preserved. Static text keeps the existing auto-fit-to-content behaviour.
- 72cf1cc: Fix the canvas appearing invisible on a first-time visit until a page refresh. The root cause was that `useFabricSync`'s effects (ResizeObserver in particular) depended on stable `RefObject` identities for the container and canvas, so when the onboarding picker unmounted and the canvas subtree mounted in its place, the observer stayed bound to the orphaned onboarding `<div>` and never reported the real canvas container's dimensions — Fabric kept its 800×600 fallback instead of resizing to the actual container. The Fabric canvas instance and container element are now mirrored into React state; every effect that used to depend on the ref objects now depends on those state mirrors, so they correctly re-run when the DOM swaps. Closes #17.
- 6bd5a10: Keep image fields anchored to their declared `(x, y)` when the user
  switches between pages and returns (#54). Previously the `FabricImage`
  child of any image field collapsed to the page's upper-left after a
  page-switch round-trip, only snapping back when the user clicked an
  element. The fix unifies the async image-load swap between
  `createFieldGroup` and `applyFieldToGroup` behind a shared
  `swapPlaceholderForImage` helper that performs the reset-to-origin →
  add → restore-position dance in both code paths. Adds an e2e regression
  suite asserting every field type stays put across multi-page navigation.
- 321d6ed: Fix `QuotaExceededError` when uploading a real-world image as a template background. The Zustand persist adapter used to serialise every image / font buffer into localStorage as base-64, duplicating bytes already stored in the matching `*DataUrl(s)` fields and trivially breaching the ~5 MB localStorage quota on the first real photo. The image buffers (`backgroundBuffer`, `pageBackgroundBuffers`, `staticImageBuffers`) are no longer written — they are reconstructed from their data-URL counterparts on rehydration so save-to-`.tgbl` and canvas rendering continue to see the ArrayBuffers they need. The setItem path also now catches storage failures and falls back to a minimal payload instead of throwing through Zustand. Closes #11.
- eeb8357: Fix a page-close bug where closing one image-backed page appeared to close every other page too. The canvas background resolver only handled the legacy/solid-colour cases when `currentPageId === null`; after `removePage` the handler set `currentPageId` back to null, and if the remaining page had an image background it was never surfaced — the user saw a blank canvas and read it as "both pages closed, back to onboarding." The resolver now also looks up an explicit `pages[0]` image when no current page is selected, and `handleRemovePage` now lands on whichever page ends up at index 0 instead of dropping to null. New store-level test matrix exercises every two-page background combination (colour/colour, colour/image, image/colour, image/image) × which tab is closed, plus a three-page "close middle" sweep. Closes #23.
- a6d053c: Preview now runs the real `generatePDF` instead of a parallel HTML
  pipeline (#86) — the bytes the user sees in the preview tab are
  byte-identical to what a library consumer gets from
  `generatePDF(template, data)`. Pre-fix the two renderers drifted on every
  detail (header height, row fitting, font metrics, table border behaviour,
  multi-page logic), so every renderer-level bug had to be fixed twice.

  `template-goblin` adds a new `"./browser"` subpath export — slim entry
  that re-exports `generatePDF`, `validateData`, `validateManifest`,
  `resolveValue`, and font-subsetting helpers without pulling in the
  fs-backed `loadTemplate` / `saveTemplate` chain. The package's main
  export is unchanged.

- 6c0092f: Fix placeholder-bitmap save→reopen round-trip (#50) and make the Image Settings Upload buttons visible at rest.
  - `openTemplate` now resolves placeholder bitmaps at `placeholders/<filename>` (matching where `saveTemplate` writes them) with a fallback to the bare path for legacy archives. Previously the loader looked at the bare filename only, so a `.tgbl` opened in a clean browser session lost every placeholder, the canvas fell back to filename text instead of the bitmap, and a re-save propagated the missing bytes downstream.
  - Both Upload buttons under "Image Settings" (static value picker and dynamic placeholder upload) now have a visible border + tertiary background so they look like buttons at rest. They previously used the bare `tg-btn` class which is fully transparent until hover.

- 2a9716f: The right-panel JSON preview and the Preview dialog now share a single
  edited JSON across both surfaces (#78). Previously the right-panel
  textarea kept the user's edits in local component state, so opening
  Preview re-ran `generateExampleJson` and showed the auto-generated
  example again — the user's edits silently vanished. The text now lives
  in `uiStore.previewJsonText` (transient, not persisted): both
  components read from it, both write to it, and the Preview dialog's
  Reset button clears the pin so both surfaces revert to the
  auto-generated example. The right panel grows a `Reset` button that
  appears once the user has pinned a value.
- 4d72275: Tables now always show their full perimeter, even when content overflows
  (#65). Pre-fix, when a table's row count exceeded the field rect (or the
  last data row would overrun the bottom edge), the rows extending past
  the rect got visually clipped along with their per-cell bottom borders,
  leaving an open-bottom table. The HTML preview wrapper now has
  `overflow: hidden` plus a `border` matching `rowStyle.borderColor` /
  `borderWidth`, and the PDFKit core renderer stamps the field-rect
  perimeter on top of any rendered rows (and at every page break in
  multi-page mode). Top, left, right, and bottom edges of the rect are
  guaranteed to render whenever the row border is non-zero.
- 19def61: Fix canvas zoom / scrollbar behaviour on page refresh and persist the user's zoom level across reloads (#84 follow-up).
  - Drop the ResizeObserver-driven auto-fit zoom — with #84's "default 100%" rule, the observer's "snap back to fit when current ≤ fit" behaviour was hiding the page's natural overflow on refresh, so scrollbars never appeared even when the page was bigger than the viewport.
  - Drop the zoom-sync effect's `fc.getZoom() === store.zoom` early-return — on a fresh refresh both read 1 by default, so the equality skipped the very `setDimensions(meta × 1)` call that gives the canvas its real size. The effect now resyncs `meta × zoom` on every dep change unconditionally.
  - Persist `zoom` in `uiStore` and skip the GH #84 reset on the very first valid post-hydration run, so reloading the editor restores the canvas at whatever zoom you were last viewing instead of snapping to 100%.
  - Remove `useFabricCanvas`'s post-mount `requestAnimationFrame` block; canvas dimension / zoom is now fully owned by the zoom-sync effect, so there's no second writer to fight the persisted zoom on mount.
