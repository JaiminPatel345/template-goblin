# Spec 009 — UI Canvas

## Status

Draft. Creation-popup flow introduced in design 2026-04-18 §8; full spec comes with the Phase 4 implementation plan. Updated 2026-04-19 for the Konva → Fabric.js rendering-engine migration.

## Summary

The UI canvas is the central workspace of the `template-goblin-ui` builder application. Built with React and Fabric.js (v6), it provides a visual drag-and-drop environment where designers place and manipulate template fields on top of a background image. The canvas matches the PDF page dimensions, supports zoom controls, snap-to-grid alignment, z-index ordering, element selection with resize handles, multi-select via Shift+click (or drag-rectangle, Fabric's built-in group selection), and a right-click context menu for common operations. The background image upload flow includes a PageSizeDialog for choosing page dimensions and automatic image compression with size feedback.

The rendering engine is Fabric.js v6, attached to a plain HTML `<canvas>` element. A `fabric.Canvas` instance is created in a `useEffect` with a ref and disposed on unmount. Each field is represented as a `fabric.Group` containing its coloured background `fabric.Rect`, an optional `fabric.Image` (static or placeholder), and an optional `fabric.Text` (label). Fabric objects carry a custom `__fieldId` property that ties them back to the `FieldDefinition` in `templateStore`; the store remains the single source of truth and Fabric objects are transient view state rebuilt from the store on load. Selection, multi-select, drag, and resize are Fabric built-ins (`selectable: true`, `canvas.selection = true`, corner controls, `object:modified` event). No separate Transformer node is required.

## Requirements

- [ ] REQ-001: Canvas is rendered using `fabric` (Fabric.js v6) inside the main application layout. Binding is a plain `<canvas>` HTML element; a `fabric.Canvas` instance is created inside a React `useEffect` using a `ref` to the element, and disposed via `canvas.dispose()` on unmount. Fabric is imported as `import * as fabric from 'fabric'` (v6 ESM). No React binding library is used — Fabric objects are managed imperatively and React state flows through the Zustand stores.
- [ ] REQ-002: Canvas dimensions match the PDF page size defined in `manifest.meta.width` and `manifest.meta.height` (in points)
- [ ] REQ-003: Canvas is scaled to fit the available screen area with zoom controls (zoom in, zoom out, fit to screen, zoom percentage display)
- [ ] REQ-004: User must choose a background before placing fields. The onboarding picker (shown when `pages[0]` has no background) offers two options: **Upload image** (existing flow) or **Solid color** (HTML `<input type="color">` + hex text input, default `#FFFFFF`). Choosing a solid color sets `pages[0].backgroundType = 'color'` with `backgroundColor = '#RRGGBB'` and `backgroundFilename = null`.
- [ ] REQ-005: On background image upload, display a PageSizeDialog that detects image dimensions and offers page size options: Match Image, A4 (595x842 pt), A3 (842x1191 pt), US Letter (612x792 pt), US Legal (612x1008 pt), Custom (user enters width and height in pt)
- [ ] REQ-006: "Match Image" converts image pixel dimensions to points at 72 DPI (1 px = 1 pt at 72 DPI)
- [ ] REQ-007: Background image is compressed on upload using a lightweight browser-based compressor; display original size vs compressed size to the user
- [ ] REQ-008: Snap-to-grid is configurable with a default grid size of 5 pt; when enabled, element positions and sizes snap to the nearest grid point
- [ ] REQ-009: Grid lines are displayed lightly on the canvas when snap-to-grid is enabled
- [ ] REQ-010: Snap-to-grid can be toggled on/off via the toolbar
- [ ] REQ-011: Elements can be selected by clicking on them. Every field `fabric.Group` is configured with `selectable: true`, `hasControls: true`, `hasBorders: true`, `lockScalingFlip: true`. Fabric draws corner + edge resize handles automatically; no separate Transformer node exists. Selection flow: `canvas.on('mouse:down', opt => ...)` reads `canvas.getActiveObject()` (or `opt.target`) to resolve the selected field by its `__fieldId` property and forwards to `uiStore.selectField(id)`. Clicking empty space triggers Fabric's built-in `canvas.discardActiveObject()` and clears `selectedFieldIds` via the `selection:cleared` event.
- [ ] REQ-012: Elements can be moved by dragging. Fabric handles drag natively once `selectable: true` and `evented: true` are set; no manual drag bookkeeping is required. Position updates stream during drag via `object:moving` (for live right-panel feedback), and the authoritative commit to `templateStore.updateField` happens on `object:modified` (fired once when the user releases the pointer). Fabric distinguishes click vs drag natively via an internal movement threshold — no manual `dragDistance` equivalent is needed.
- [ ] REQ-013: Elements can be resized by dragging Fabric's built-in corner/edge controls. `object:scaling` streams live dimension updates (the renderer converts `scaleX`/`scaleY` back to `width`/`height` before calling `setCoords`); the authoritative commit happens on `object:modified`. Rotation is disabled by default (`lockRotation: true`) for v1 — templates are rectangular regions, not rotated ones.
- [ ] REQ-014: Z-index ordering: elements with higher `zIndex` render on top of elements with lower `zIndex`
- [ ] REQ-015: Z-index can be changed via the right panel or the right-click context menu
- [ ] REQ-016: Right-click context menu on an element provides: Bring Forward (+1 zIndex), Send Backward (-1 zIndex), Bring to Front (max zIndex), Send to Back (min zIndex), Delete, Duplicate
- [ ] REQ-017: Multi-select via Shift+click: clicking an element while holding Shift adds/removes it from the selection
- [ ] REQ-018: All selected elements can be moved together by dragging any one of them
- [ ] REQ-019: All selected elements can be deleted together (Delete key or context menu)
- [ ] REQ-020: Canvas state is managed via Zustand store (`templateStore`)
- [ ] REQ-021: UI state (selected field, panel visibility, zoom level, current page) is managed via Zustand store (`uiStore`)
- [ ] REQ-022: A page tab bar is displayed at the bottom of the canvas, showing one tab per user-defined page labeled "Page 1", "Page 2", etc.
- [ ] REQ-023: Clicking a page tab switches the canvas to display that page's background and only the fields assigned to that page (matching `pageId`)
- [ ] REQ-024: The currently active page tab is visually highlighted (e.g., bold text, underline, or distinct background color)
- [ ] REQ-025: An "Add Page" button (e.g., a "+" icon) is displayed at the end of the page tab bar. Clicking it opens a background choice dialog with three options: Upload Image, Solid Color, or Inherit from Previous
- [ ] REQ-026: The "Inherit from Previous" option is disabled when the new page would be the first page (index 0)
- [ ] REQ-027: When a new page is added, the canvas automatically switches to the new page
- [ ] REQ-028: Page tabs support right-click context menu with "Delete Page" and "Duplicate Page" options
- [ ] REQ-029: Every page tab (including Page 1) renders a small "X" close button adjacent to its label. Clicking the X deletes that page. When `pages.length > 1`, the field reassignment / re-indexing rules of REQ-023/REQ-031 apply. When the page being deleted is the last remaining page (`pages.length === 1` counting the implicit page 0), the user is first shown a `window.confirm` with the message "Deleting the last page will clear all fields and settings. Continue?"; on OK the entire template is reset to its empty-state defaults and the onboarding picker (REQ-034) is shown; on Cancel nothing changes.
- [ ] REQ-030: Page tabs support drag-and-drop reordering. When pages are reordered, `index` values are renumbered and any page with `backgroundType: "inherit"` at index 0 prompts the user to choose a new background
- [ ] REQ-031: When the canvas is on a specific page, newly added fields are automatically assigned to the current page's `pageId`
- [ ] REQ-032: The background choice dialog for "Upload Image" includes image compression and shows original vs compressed size (same flow as the existing background upload in REQ-007)
- [ ] REQ-033: The background choice dialog for "Solid Color" includes a color picker defaulting to `#FFFFFF`
- [ ] REQ-036: Canvas viewport centring — at any zoom level the visible page is centred within the viewport when the page fits, and symmetrically pannable when it does not. Implementation: the HTML `<canvas>` element is sized to the viewport (CSS `width: 100%; height: 100%`); the Fabric zoom/pan state lives entirely in `canvas.viewportTransform` (a 6-element affine matrix `[a, b, c, d, e, f]`). No outer `overflow: auto` scroll container is used — Fabric paints the page at the current viewport transform and the pan/zoom operations in REQ-035 / REQ-037..043 mutate that matrix. On `window resize` or page-size change, the viewport transform is re-centred using `canvas.setViewportTransform([zoom, 0, 0, zoom, (canvasPxWidth - pageWidth*zoom)/2, (canvasPxHeight - pageHeight*zoom)/2])`. A Jest unit test pins the invariant `|leftOverflow - rightOverflow| < ε` for a sweep of zoom levels against this helper.
- [ ] REQ-035: Canvas pan — when the zoomed canvas overflows the viewport, the user may pan the view in one of two ways: (a) press and hold the spacebar, then press-drag with the left mouse button; or (b) press-drag with the middle mouse button at any time. Implementation uses Fabric's `mouse:down` / `mouse:move` / `mouse:up` events on the canvas. On space-down (or middle-button-down) the handler sets a `panning` flag, flips `canvas.selection = false` and `canvas.defaultCursor = 'grabbing'`, and on subsequent `mouse:move` events increments `canvas.viewportTransform[4] += e.movementX; canvas.viewportTransform[5] += e.movementY; canvas.requestRenderAll()`. On release it restores `selection: true` and the cursor. While pan-mode is available (spacebar held) the cursor is `grab`; while actively panning it is `grabbing`. Pan mode is suppressed while the keyboard focus is inside an `<input>` / `<textarea>` / contenteditable element so typing a space does not hijack the cursor.
- [ ] REQ-034: First-time onboarding picker: when the app launches with an empty `pages[0]` (no image, no color), the canvas area shows a picker with two side-by-side buttons: "Upload image" and "Solid color". Selecting "Solid color" reveals an inline `<input type="color">` plus a monospace hex text input (default `#FFFFFF`), a Back button to return to the two-button state, and an Apply button that commits the chosen color. On Apply, the store writes `pages[0]` with `backgroundType: 'color'`, `backgroundColor: <lowercased hex>`, `backgroundFilename: null`, and clears any legacy `backgroundDataUrl`/`backgroundBuffer`. After Apply the canvas transitions to the standard drawing state with the solid color applied via `canvas.backgroundColor = color` (Fabric's native canvas-level background) and `canvas.renderAll()`, and field-creation tools (Text/Image/Table) become enabled.
- [ ] REQ-037: Zoom binding — `Ctrl + wheel` (or `Cmd + wheel` on macOS) zooms the canvas. Implementation uses Fabric's built-in `canvas.on('mouse:wheel', opt => ...)` handler. The event's `opt.e.deltaY` controls direction; `deltaY < 0` increases zoom, `deltaY > 0` decreases. Trackpad pinch-zoom emits synthetic `wheel` events with `ctrlKey: true` and is handled by the same code path. Zoom is clamped to `[0.1, 5]`. `opt.e.preventDefault(); opt.e.stopPropagation()` is called so the page itself does not scroll.
- [ ] REQ-038: Zoom-at-cursor — zoom operations anchor on the pointer position, not the canvas center. Implemented via Fabric's `canvas.zoomToPoint(point, newZoom)` where `point` is a `fabric.Point` constructed from `opt.e.offsetX` / `opt.e.offsetY` (the pointer location in canvas-element coordinates). `zoomToPoint` updates both the scale and the translation components of `canvas.viewportTransform` so the canvas pixel under the cursor before the zoom remains under the cursor after. No manual `scrollLeft`/`scrollTop` arithmetic is required — that scroll-container pattern is retired with the Konva migration.
- [ ] REQ-039: Wheel pan binding — plain `wheel` (no modifier) pans the canvas vertically. `Shift + wheel` pans horizontally. Neither action changes zoom. In the same `mouse:wheel` handler as REQ-037 the code branches on `opt.e.ctrlKey`/`opt.e.metaKey`: if a modifier is present it zooms (REQ-037); otherwise it pans by mutating `canvas.viewportTransform[4]` (x) or `[5]` (y) by `-opt.e.deltaY` (and `-opt.e.deltaX` for horizontal trackpad gestures or shift+wheel) and calls `canvas.requestRenderAll()`. Default browser behaviour is prevented throughout.
- [ ] REQ-040: Canvas element lifecycle — the `fabric.Canvas` instance MUST be created when the host HTML `<canvas>` element mounts and disposed when it unmounts. The onboarding state and the drawing state mount the host element under different React subtrees; implementation MUST use a ref-callback (`ref={setCanvasRef}`) that, on assignment to a new non-null element, disposes the previous instance (if any) with `canvas.dispose()` and creates a fresh `new fabric.Canvas(el, { selection: true, preserveObjectStacking: true, ... })`. A bare `useEffect([])` pattern is forbidden — it attaches to the first element and never rebinds, producing a dead canvas after onboarding.
- [ ] REQ-041: Zoom-to-fit — `Ctrl/Cmd + 0` scales the canvas so the current page fits the visible viewport with a small padding (≥16 pt on each side) and centres the result. Wired into the global keyboard hook. Implementation: compute `fitZoom = min((canvasPxWidth - 2*pad) / pageWidth, (canvasPxHeight - 2*pad) / pageHeight)` then call `canvas.setViewportTransform([fitZoom, 0, 0, fitZoom, (canvasPxWidth - pageWidth*fitZoom)/2, (canvasPxHeight - pageHeight*fitZoom)/2])`.
- [ ] REQ-042: Zoom-to-100% — `Ctrl/Cmd + 1` resets zoom to `1.0`. The viewport centre remains at the same page point after reset: read the page-coordinate point at the viewport centre, call `canvas.setZoom(1)`, then `canvas.absolutePan(...)` so that point is re-centred.
- [ ] REQ-043: Cursor styles — while `spacebar` is held (pan-available state) `canvas.defaultCursor` and `canvas.hoverCursor` are set to `'grab'`; while actively panning (middle-drag or space-left-drag) they are `'grabbing'`; when a field-draw tool is active they are `'crosshair'`; otherwise `'default'` (for `defaultCursor`) and `'move'` (for `hoverCursor`, Fabric default over selectable objects). `canvas.renderAll()` is not required for cursor updates — Fabric applies them on the next event.
- [ ] REQ-044: Rectangle label content — inside each field's bounding rectangle the canvas shows content text (not a type badge). For dynamic fields it uses `source.placeholder` when set, else `source.jsonKey`. For static fields it uses the literal `source.value` (or a short excerpt when the value is long). The field-type classification stays visible in the left-panel list badge and in the Toolbar; it is never repeated inside the rectangle.
- [ ] REQ-045: Rectangle label auto-fit — label font size scales to fit the bounding rectangle. The rendered text width must not exceed `rectWidth - 2 * padding`, and the rendered height must not exceed `rectHeight - 2 * padding`. Implementation: construct a `fabric.Text` with the candidate `fontSize` and read `text.width` / `text.height` (Fabric measures these on construction using the canvas 2D context); binary-search or measure-and-shrink the font size; cap at `min(48 pt, rectHeight * 0.8)` to avoid comically large labels. The label `fabric.Text` is added as a child of the field's `fabric.Group` so it moves / scales with the field.
- [ ] REQ-046: Per-type color tokens — the set of visual tokens for each field type (text, image, table) is defined once in `packages/ui/src/theme/fieldColors.ts` and consumed by both the Toolbar buttons and the Canvas rectangle fills. Each token bundle contains: `fill` (low-opacity rect background), `stroke` (rect border), `text` (label color), `toolbarBg` and `toolbarFg`. Palette choices must preserve accessible contrast (WCAG AA) between `text` and the underlying page.
- [ ] REQ-047: Conditional rect fill — the canvas omits the coloured fill rectangle when it would occlude more useful content:
  - Image field with a resolvable placeholder image (dynamic `source.placeholder.filename` OR static `source.value.filename` whose bytes are loaded): render a `fabric.Image` directly inside the field's `fabric.Group`, skip the coloured `fabric.Rect` fill (or construct the Rect with `fill: 'transparent'`).
  - Any field with `source.mode === 'static'`: skip the coloured fill regardless of type (static content renders inline via the label branch for text, inline image for image, inline table for table).
  - In both cases the selection border outline is retained (Fabric draws it around the Group's bounding box when selected; the Group retains `hasBorders: true`) so the field remains visibly selectable.
- [ ] REQ-048: Canvas object-to-field binding — every field rendered on the Fabric canvas is a single `fabric.Group` carrying a custom property `__fieldId: string` that matches the `FieldDefinition.id` in `templateStore`. The Group's children are: (1) a `fabric.Rect` for the background fill / border (per REQ-046 / REQ-047); (2) optionally a `fabric.Image` (for image fields with a resolvable source); (3) optionally a `fabric.Text` or `fabric.IText` for the label (text fields and dynamic-field labels). Group-level properties: `subTargetCheck: false` (children are not individually targetable), `lockRotation: true`, `lockScalingFlip: true`, `originX: 'left'`, `originY: 'top'`.
- [ ] REQ-049: Canvas object stacking — `canvas.preserveObjectStacking = true` MUST be set on the Fabric canvas so that selecting an object does NOT bring it to the front. The authoritative z-index is `FieldDefinition.zIndex`; on each store→canvas sync pass the renderer calls `canvas.moveTo(group, zIndex)` (or sorts by `zIndex` before re-adding) to keep visual order aligned with the data model.
- [ ] REQ-050: Store→canvas sync — the canvas is rebuilt from `templateStore.fields` via a reconciling effect. On each relevant store change the renderer diffs current Fabric `Group`s (keyed by `__fieldId`) against `fields`: missing ids are constructed and added; removed ids are `canvas.remove(group)`'d; updated ids have their properties patched in place (no remove+add — that would break the active selection). Static `FieldDefinition` values such as `x`, `y`, `width`, `height`, `zIndex`, and mode-specific content are the inputs; no Fabric-specific state persists across reloads.
- [ ] REQ-051: Canvas→store commit — user-driven mutations (drag, resize) commit to the store on `object:modified` (fired once when the user releases the pointer). The handler reads `group.left`, `group.top`, `group.width * group.scaleX`, `group.height * group.scaleY`, then calls `group.set({ width: newW, height: newH, scaleX: 1, scaleY: 1 }); group.setCoords();` to normalise the group back to unit scale, and finally dispatches `templateStore.updateField(fieldId, { x, y, width, height })`. Live streaming events (`object:moving`, `object:scaling`) may update the right panel for feedback but MUST NOT write to the store on every frame.
- [ ] REQ-052: Click outside deselects — clicking the empty area of the canvas clears the selection. This is Fabric's default behaviour: `mouse:down` with no `target` triggers `canvas.discardActiveObject()` and emits `selection:cleared`, which the renderer listens for and dispatches `uiStore.clearSelection()`. No additional handler code is required beyond the `selection:cleared` forwarder.
- [ ] REQ-053: Multi-select via drag rectangle — Fabric's built-in group selection (`canvas.selection = true`) allows the user to drag-select across empty canvas space, producing a temporary `fabric.ActiveSelection`. The renderer listens for `selection:created` and `selection:updated`; when the active object is an `ActiveSelection`, it reads `selection.getObjects()` and dispatches their `__fieldId`s to `uiStore.selectField(id, true)` in batch. Shift+click likewise goes through `selection:updated` — no manual modifier handling is needed in the renderer.
- [ ] REQ-054: Object events bubble to canvas — per-object handlers (e.g. `group.on('mousedblclick', ...)` for double-click → open right panel) attach at object construction time. To stop a canvas-level handler from also firing, the object handler calls `opt.e.stopPropagation()` on the underlying DOM event; setting `evented: false` on a child disables all event delivery to it. Fabric's own event system replaces the Konva `e.cancelBubble = true` idiom.

## Behaviour

### Happy path

1. User opens the application and sees an empty canvas area with a prompt to upload a background image
2. User clicks "Upload BG" in the toolbar and selects an image file
3. PageSizeDialog appears showing detected image dimensions (e.g. "Your image is 2480x3508 pixels") and page size options
4. User selects a page size (e.g. A4). Canvas dimensions are set to 595x842 pt. Background image is scaled to fill the canvas.
5. Original vs compressed image size is displayed (e.g. "Original: 2.4 MB, Compressed: 340 KB")
6. Canvas displays the background image. Grid lines appear if snap-to-grid is enabled. The page tab bar at the bottom shows "Page 1" as the active tab with an "Add Page" button.
7. User adds fields (text, image, table) by drawing rectangles on the canvas. The creation popup (design 2026-04-18 §8.1) opens on mouse-up; on confirm the new field is assigned to the current page.
8. User selects a field, sees resize handles, moves/resizes it. Right panel updates to show the field's properties.
9. User right-clicks a field, sees context menu, reorders z-index or duplicates/deletes the field.
10. User Shift+clicks multiple fields, drags them together.
11. User clicks the "Add Page" button. A dialog appears with options: Upload Image, Solid Color, or Inherit from Previous.
12. User selects "Solid Color" and picks a light blue color. A new page is created and the canvas switches to "Page 2" showing the solid color background.
13. User adds fields to Page 2. The page tab bar shows "Page 1" and "Page 2" tabs; "Page 2" is highlighted as active.
14. User clicks the "Page 1" tab. Canvas switches back to Page 1, showing only Page 1's fields and background.
15. User drags the "Page 2" tab before "Page 1" to reorder. Pages are renumbered. Since the former Page 2 (now Page 1) does not use "inherit", reordering succeeds.

### Edge cases

- User tries to add a field before uploading a background image: show a message prompting them to upload a background first (or allow it if the design decision is to permit no-background templates)
- User uploads a very small image (e.g. 10x10 px): PageSizeDialog still works; "Match Image" produces a very small page. Consider showing a warning.
- User uploads a very large image (e.g. 50 MB): compression should handle this; show a progress indicator during compression
- Zoom at extreme levels: enforce minimum (e.g. 10%) and maximum (e.g. 500%) zoom limits
- Canvas area smaller than page size at 100% zoom: page is scrollable or auto-zoomed to fit
- Dragging an element to the edge of the canvas: element position is clamped to canvas bounds (elements cannot be placed outside the page area)
- Deleting all fields: canvas returns to just the background image
- Replacing the background image: show PageSizeDialog again; if page size changes, warn that field positions may need adjustment
- Snap-to-grid toggled while elements are selected: element positions do not retroactively snap; only future moves/resizes snap
- User attempts to delete the last remaining page: the "Delete Page" context menu option is disabled
- User reorders a page with `backgroundType: "inherit"` to index 0: a dialog prompts the user to choose a new background type (image or color)
- User deletes a page that is the inherit source for the next page: the next page's inherit resolves to its new predecessor, or if none exists, the user is prompted
- Many pages (e.g., 20+): the page tab bar should be horizontally scrollable
- User switches pages while elements are selected: selection is cleared (selected fields may not exist on the new page)

### Error conditions

- Unsupported image format uploaded: show an error message listing supported formats (PNG, JPEG, WebP)
- Image file is corrupted or cannot be read: show an error message
- Browser runs out of memory with very large images: gracefully handle with an error message suggesting a smaller image

## Input / Output

### Zustand Store -- `templateStore`

```ts
interface TemplateStore {
  manifest: TemplateManifest | null
  pages: PageDefinition[]
  pageBackgrounds: Map<string, string | null> // pageId -> data URL for canvas display (null for color-only)
  pageBackgroundsCompressed: Map<string, Blob | null> // pageId -> compressed image for saving
  fields: FieldDefinition[]
  groups: Group[]
  fonts: FontDefinition[]

  // Page Actions
  addPage(
    backgroundType: 'image' | 'color' | 'inherit',
    options?: { image?: File; color?: string },
  ): Promise<string> // returns new page id
  removePage(pageId: string): void
  reorderPages(pageIds: string[]): void // new order of page ids
  updatePageBackground(
    pageId: string,
    backgroundType: 'image' | 'color' | 'inherit',
    options?: { image?: File; color?: string },
  ): Promise<void>
  duplicatePage(pageId: string): Promise<string> // returns new page id

  // Background Actions (first page / legacy)
  setBackground(image: File, pageSize: PageSizeOption): Promise<void>

  // Field Actions
  addField(field: FieldDefinition): void // field.pageId is set to the current page
  updateField(id: string, updates: Partial<FieldDefinition>): void
  removeField(id: string): void
  duplicateField(id: string): void
  reorderZIndex(id: string, action: 'forward' | 'backward' | 'front' | 'back'): void
  moveFields(ids: string[], deltaX: number, deltaY: number): void
}
```

### Zustand Store -- `uiStore`

```ts
interface UIStore {
  selectedFieldIds: string[]
  currentPageId: string | null // the currently displayed page
  zoom: number // percentage, e.g. 100
  snapToGrid: boolean
  gridSize: number // default 5
  contextMenu: { x: number; y: number; fieldId: string } | null
  pageContextMenu: { x: number; y: number; pageId: string } | null

  // Actions
  selectField(id: string, multi?: boolean): void
  clearSelection(): void
  setCurrentPage(pageId: string): void
  setZoom(zoom: number): void
  toggleSnapToGrid(): void
  setGridSize(size: number): void
  showContextMenu(x: number, y: number, fieldId: string): void
  hideContextMenu(): void
  showPageContextMenu(x: number, y: number, pageId: string): void
  hidePageContextMenu(): void
}
```

### PageSizeDialog Input

```ts
interface PageSizeDialogProps {
  imageWidth: number // detected image width in pixels
  imageHeight: number // detected image height in pixels
  onConfirm(pageSize: PageSizeOption, width: number, height: number): void
  onCancel(): void
}

type PageSizeOption = 'A4' | 'A3' | 'Letter' | 'Legal' | 'Custom' | 'MatchImage'
```

## Acceptance Criteria

- [ ] AC-001: Canvas renders using Fabric.js v6 (a `fabric.Canvas` attached to an HTML `<canvas>` element) and displays the background image via `canvas.setBackgroundImage(...)` (or, for solid colour backgrounds, `canvas.backgroundColor = '#RRGGBB'`)
- [ ] AC-002: Uploading a background image triggers the PageSizeDialog with detected image dimensions
- [ ] AC-003: Selecting "A4" in PageSizeDialog sets canvas dimensions to 595x842 pt
- [ ] AC-004: Selecting "Match Image" converts pixel dimensions to pt at 72 DPI and uses those as canvas dimensions
- [ ] AC-005: Background image compression runs on upload and the original vs compressed size is displayed to the user
- [ ] AC-006: Canvas is scaled to fit the screen; zoom in/out controls adjust the scale; zoom percentage is displayed
- [ ] AC-007: When snap-to-grid is enabled, moving an element snaps its position to the nearest multiple of the grid size (default 5 pt)
- [ ] AC-008: Grid lines are visible on the canvas when snap-to-grid is enabled and hidden when disabled
- [ ] AC-009: Clicking an element selects it and shows resize handles at corners and midpoints of edges
- [ ] AC-010: Dragging a selected element moves it; the right panel reflects the updated position in real-time
- [ ] AC-011: Dragging a resize handle resizes the element; the right panel reflects the updated dimensions in real-time
- [ ] AC-012: Right-clicking an element shows a context menu with: Bring Forward, Send Backward, Bring to Front, Send to Back, Delete, Duplicate
- [ ] AC-013: "Bring Forward" increments the element's zIndex by 1; "Send Backward" decrements by 1 (minimum 0)
- [ ] AC-014: "Bring to Front" sets zIndex to the highest value + 1; "Send to Back" sets zIndex to 0 and shifts others up
- [ ] AC-015: "Delete" removes the element from the canvas and the store
- [ ] AC-016: "Duplicate" creates a copy of the element offset by (10, 10) pt with a new unique id
- [ ] AC-017: Shift+clicking elements adds/removes them from the current selection
- [ ] AC-018: Dragging any element in a multi-selection moves all selected elements together, maintaining their relative positions
- [ ] AC-019: Pressing Delete with multiple elements selected removes all of them
- [ ] AC-020: Elements render in z-index order -- higher zIndex elements appear on top of lower ones
- [ ] AC-021: A page tab bar is displayed at the bottom of the canvas with one tab per user-defined page
- [ ] AC-022: Clicking a page tab switches the canvas to that page, displaying only fields with matching `pageId`
- [ ] AC-023: The active page tab is visually distinguished from inactive tabs
- [ ] AC-024: The "Add Page" button at the end of the tab bar opens a background choice dialog with Upload Image, Solid Color, and Inherit from Previous options
- [ ] AC-025: Selecting "Upload Image" in the background choice dialog triggers image upload with compression, then creates the new page
- [ ] AC-026: Selecting "Solid Color" shows a color picker; confirming creates a new page with a solid color background
- [ ] AC-027: "Inherit from Previous" is disabled when the new page would be the first page
- [ ] AC-028: After adding a new page, the canvas switches to it automatically
- [ ] AC-029: Right-clicking a page tab shows a context menu with "Delete Page" and "Duplicate Page"
- [ ] AC-030: Every page tab (including Page 1) has an "X" close button. Clicking it on a non-last page removes that page and re-indexes the rest. Clicking it on the last page opens a confirmation dialog; confirming resets the template to its empty state and returns to the onboarding picker.
- [ ] AC-031: Newly added fields are assigned the `pageId` of the currently active page
- [ ] AC-032: Switching pages clears the current field selection
- [ ] AC-033: Page tabs can be reordered via drag-and-drop; indices are renumbered after reordering
- [ ] AC-034: If a page with `backgroundType: "inherit"` is dragged to index 0, a dialog prompts the user to choose a new background type
- [ ] AC-035: With the canvas zoomed above 100% the user can hold spacebar + drag with the left mouse button (or drag with the middle mouse button) to pan the view. The cursor shows `grab` while spacebar is held and `grabbing` while actively panning. Space-pan is suppressed while typing in an input/textarea.
- [ ] AC-036: At any zoom level the canvas viewport centring is symmetric: calling the `centreViewport(zoom, pageWidth, pageHeight, canvasPxWidth, canvasPxHeight)` helper (Fabric re-implementation of the retired `scrollBounds.ts` helper) produces a `viewportTransform` whose translation components satisfy `|leftMargin - rightMargin| < ε` and `|topMargin - bottomMargin| < ε` for a range of zoom levels. Regression reference: `packages/ui/src/utils/centreViewport.ts` and its unit test.
- [ ] AC-037: Holding `Ctrl` (or `Cmd` on macOS) and rolling the scroll wheel over the canvas changes the zoom level. Scrolling up increases zoom, scrolling down decreases it. Zoom is clamped to `[0.1, 5]`. The page itself does not scroll during this gesture.
- [ ] AC-038: Trackpad pinch-zoom (which emits `wheel` events with `ctrlKey: true`) changes the zoom smoothly using the same handler as AC-037. No separate gesture listener is required.
- [ ] AC-039: Zoom respects the cursor position: zooming with the cursor over a point of the canvas keeps that point visually stationary under the cursor after the zoom change. Test: place a distinctive feature at canvas coordinate (200, 200); zoom in with the cursor on that feature; assert the feature's screen position before zoom == after zoom ± 2 px.
- [ ] AC-040: Plain scroll wheel (no modifier) scrolls the canvas vertically by the wheel `deltaY`. `Shift` + wheel scrolls horizontally. Neither gesture changes zoom. When the cursor is over the canvas, the browser's default page scroll is prevented.
- [ ] AC-041: The canvas wheel listener survives onboarding → canvas transitions. Test: launch the app in onboarding state, complete onboarding via solid color, then scroll-wheel with `Ctrl` held over the canvas and assert zoom changes. The bug fixed here is the old `useEffect([])`-attaches-once pattern that bound to the unmounted onboarding container.
- [ ] AC-042: `Ctrl/Cmd + 0` fits the current page to the visible viewport with ≥16 pt padding per side and centres the result.
- [ ] AC-043: `Ctrl/Cmd + 1` resets zoom to exactly `1.0`; the viewport centre remains at the same canvas point after reset.
- [ ] AC-044: Field rectangle label text matches `placeholder` (dynamic) or `value` (static); a type badge never appears inside the rectangle. Regression reference: `packages/ui/src/components/Canvas/__tests__/fieldLabel.test.ts`.
- [ ] AC-045: Field rectangle label font size auto-fits the rectangle (≥ 8 pt, ≤ `min(48 pt, rectHeight * 0.8)`). Label never renders outside the rectangle bounds. Covered in `fieldLabel.test.ts`.
- [ ] AC-046: Toolbar buttons and canvas rectangle fills for the same field type resolve to the same CSS token object exported from `packages/ui/src/theme/fieldColors.ts`. Regression reference: `packages/ui/src/theme/__tests__/fieldColors.test.ts`.
- [ ] AC-047: An image field with a present placeholder renders a `fabric.Image` (inside its `fabric.Group`) and no coloured `fabric.Rect` fill. A static field (any type) renders no coloured fill `fabric.Rect`. Regression reference: `packages/ui/src/components/Canvas/__tests__/rectFill.test.ts`.
- [ ] AC-048: Clicking on empty canvas area (away from any `fabric.Group`) fires `selection:cleared` and clears `uiStore.selectedFieldIds`. Fabric default behaviour — no custom handler required beyond the `selection:cleared` forwarder.
- [ ] AC-049: Drag-selecting a rectangle across empty canvas produces a `fabric.ActiveSelection` containing the intersected `fabric.Group`s; their `__fieldId`s are forwarded to `uiStore.selectField(id, true)`. Shift+click over an unselected field adds it to the active selection via Fabric's built-in modifier handling.
- [ ] AC-050: Releasing a drag (or resize) fires `object:modified` exactly once; the handler commits `{ x, y, width, height }` to `templateStore.updateField`. Intermediate `object:moving` / `object:scaling` events do NOT write to the store. Regression reference: a Playwright test that drags a field across the canvas asserts the store is updated once per drag, not per frame.
- [ ] AC-051: `canvas.preserveObjectStacking = true`: when a field is selected, its z-order relative to other fields does not change. Regression test: render three overlapping fields with distinct `zIndex`, click the bottom one, assert the visible stacking order in a canvas snapshot matches `zIndex` order both before and after selection.
- [ ] AC-052: Canvas lifecycle: launching the app in the onboarding state, completing onboarding via solid color, then selecting a drawing tool produces a live `fabric.Canvas` on the drawing-state element. Clicking the canvas creates a new field (via the element-creation popup flow). The previous bug — where `useEffect([])` attached Fabric to the onboarding canvas and never rebound — is prevented by the ref-callback pattern in REQ-040.

## Dependencies

- Spec 002 — Template Schema (manifest structure, field definitions, page size options, `PageDefinition`, `pageId`)
- Spec 006 — Multi-Page (user-defined pages, page backgrounds, page ordering)

## Notes

- The rendering engine is Fabric.js v6. A single `fabric.Canvas` instance is attached to a plain HTML `<canvas>` element inside `CanvasArea.tsx`. There is no "Stage" / "Layer" concept in Fabric — objects are stored in a single flat list per canvas, with z-order controlled by list index (`canvas.moveTo(obj, index)`, `canvas.bringToFront(obj)`, `canvas.sendToBack(obj)`).
- Each field is a `fabric.Group` (see REQ-048) containing its `fabric.Rect` fill, optional `fabric.Image`, and optional `fabric.Text`. Resize handles are drawn by Fabric on the active object automatically — no separate Transformer / SelectionHandles component exists.
- Zoom is implemented by mutating `canvas.viewportTransform` (or calling `canvas.zoomToPoint`, `canvas.setZoom`). Individual objects are NOT resized when zoom changes; they keep their page-coordinate size and Fabric's viewport transform handles the visual scaling.
- Open question: should elements be allowed outside the canvas bounds during drag (with clamping on release) or should they be clamped in real-time during drag? Fabric exposes `object:moving` where clamping can be applied by mutating `group.left`/`group.top` mid-drag.
- Open question: should the canvas support keyboard arrow keys for nudging selected elements by 1 pt (or by grid size when snap is enabled)? Implementable via a window-level keydown handler that reads `canvas.getActiveObjects()` and patches the store.
- Consider using `browser-image-compression` for the background image compression, as suggested in the prompt. Evaluate bundle size impact.
- The canvas component tree: `CanvasArea.tsx` (main; owns the `<canvas>` element and the `fabric.Canvas` instance), `fabricCanvas/` utils directory for the renderer logic (`buildFieldGroup.ts`, `reconcileFields.ts`, `centreViewport.ts`, `handlers.ts`), `GridOverlay.tsx` (grid lines — implemented as a non-selectable `fabric.Line` group or as a CSS background on the `<canvas>` wrapper), `ContextMenu.tsx` (right-click menu), `PageTabBar.tsx` (page navigation tabs), `BackgroundChoiceDialog.tsx` (background type selection for new pages). The old `FieldRenderer.tsx` / `SelectionHandles.tsx` files are superseded by the imperative Fabric renderer.
- The page tab bar sits below the Fabric canvas element, outside the canvas rendering area. It is a standard React component (not a Fabric object).
- When many pages exist, the tab bar should be horizontally scrollable with overflow indicators (e.g., fade or arrow buttons at the edges).

## F-Mapping (Fabric ↔ FieldDefinition)

| Fabric construct                                    | Template-schema mapping                                                                                         |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `fabric.Group` (with `__fieldId` custom prop)       | One `FieldDefinition` of any type                                                                               |
| `fabric.Rect` (child of the Group)                  | The visible bounds: `field.x`, `field.y`, `field.width`, `field.height`, plus stroke/fill from `fieldColors.ts` |
| `fabric.Text` (child of the Group)                  | `TextField.label` (or resolved `source.value` / `source.placeholder`)                                           |
| `fabric.Image` (child of the Group)                 | `ImageField` static (`source.value.filename`) or placeholder (`source.placeholder.filename`)                    |
| `fabric.Group` of cell sub-objects                  | `TableField` rendered content                                                                                   |
| `canvas.backgroundImage` / `canvas.backgroundColor` | `PageDefinition.backgroundFilename` / `backgroundColor`                                                         |
| `canvas.viewportTransform`                          | `uiStore.zoom` + pan offset (not persisted to schema)                                                           |

The `__fieldId` custom property is the join key between the transient Fabric object tree and the canonical `templateStore.fields` array. At save time the UI does NOT serialise Fabric's JSON — it serialises `templateStore` (the `FieldDefinition[]`) into `manifest.json`. At load time the UI rebuilds Fabric objects from `FieldDefinition[]`.
