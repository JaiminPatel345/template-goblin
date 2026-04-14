# Spec 009 — UI Canvas

## Status

Draft

## Summary

The UI canvas is the central workspace of the `template-goblin-ui` builder application. Built with React and react-konva, it provides a visual drag-and-drop environment where designers place and manipulate template fields on top of a background image. The canvas matches the PDF page dimensions, supports zoom controls, snap-to-grid alignment, z-index ordering, element selection with resize handles, multi-select via Shift+click, and a right-click context menu for common operations. The background image upload flow includes a PageSizeDialog for choosing page dimensions and automatic image compression with size feedback.

## Requirements

- [ ] REQ-001: Canvas is rendered using `react-konva` (Konva.js React bindings) inside the main application layout
- [ ] REQ-002: Canvas dimensions match the PDF page size defined in `manifest.meta.width` and `manifest.meta.height` (in points)
- [ ] REQ-003: Canvas is scaled to fit the available screen area with zoom controls (zoom in, zoom out, fit to screen, zoom percentage display)
- [ ] REQ-004: User must upload a background image before placing fields -- the background image is the base layer of the canvas
- [ ] REQ-005: On background image upload, display a PageSizeDialog that detects image dimensions and offers page size options: Match Image, A4 (595x842 pt), A3 (842x1191 pt), US Letter (612x792 pt), US Legal (612x1008 pt), Custom (user enters width and height in pt)
- [ ] REQ-006: "Match Image" converts image pixel dimensions to points at 72 DPI (1 px = 1 pt at 72 DPI)
- [ ] REQ-007: Background image is compressed on upload using a lightweight browser-based compressor; display original size vs compressed size to the user
- [ ] REQ-008: Snap-to-grid is configurable with a default grid size of 5 pt; when enabled, element positions and sizes snap to the nearest grid point
- [ ] REQ-009: Grid lines are displayed lightly on the canvas when snap-to-grid is enabled
- [ ] REQ-010: Snap-to-grid can be toggled on/off via the toolbar
- [ ] REQ-011: Elements can be selected by clicking on them; the selected element shows resize handles at corners and edges
- [ ] REQ-012: Elements can be moved by dragging; position updates in real-time on the canvas and in the right panel
- [ ] REQ-013: Elements can be resized by dragging resize handles; dimensions update in real-time
- [ ] REQ-014: Z-index ordering: elements with higher `zIndex` render on top of elements with lower `zIndex`
- [ ] REQ-015: Z-index can be changed via the right panel or the right-click context menu
- [ ] REQ-016: Right-click context menu on an element provides: Bring Forward (+1 zIndex), Send Backward (-1 zIndex), Bring to Front (max zIndex), Send to Back (min zIndex), Delete, Duplicate
- [ ] REQ-017: Multi-select via Shift+click: clicking an element while holding Shift adds/removes it from the selection
- [ ] REQ-018: All selected elements can be moved together by dragging any one of them
- [ ] REQ-019: All selected elements can be deleted together (Delete key or context menu)
- [ ] REQ-020: Canvas state is managed via Zustand store (`templateStore`)
- [ ] REQ-021: UI state (selected field, panel visibility, zoom level) is managed via Zustand store (`uiStore`)

## Behaviour

### Happy path

1. User opens the application and sees an empty canvas area with a prompt to upload a background image
2. User clicks "Upload BG" in the toolbar and selects an image file
3. PageSizeDialog appears showing detected image dimensions (e.g. "Your image is 2480x3508 pixels") and page size options
4. User selects a page size (e.g. A4). Canvas dimensions are set to 595x842 pt. Background image is scaled to fill the canvas.
5. Original vs compressed image size is displayed (e.g. "Original: 2.4 MB, Compressed: 340 KB")
6. Canvas displays the background image. Grid lines appear if snap-to-grid is enabled.
7. User adds fields (text, image, loop) by drawing rectangles on the canvas
8. User selects a field, sees resize handles, moves/resizes it. Right panel updates to show the field's properties.
9. User right-clicks a field, sees context menu, reorders z-index or duplicates/deletes the field.
10. User Shift+clicks multiple fields, drags them together.

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

### Error conditions

- Unsupported image format uploaded: show an error message listing supported formats (PNG, JPEG, WebP)
- Image file is corrupted or cannot be read: show an error message
- Browser runs out of memory with very large images: gracefully handle with an error message suggesting a smaller image

## Input / Output

### Zustand Store -- `templateStore`

```ts
interface TemplateStore {
  manifest: TemplateManifest | null
  backgroundImage: string | null // data URL for canvas display
  backgroundImageCompressed: Blob | null // compressed image for saving
  fields: FieldDefinition[]
  groups: Group[]
  fonts: FontDefinition[]

  // Actions
  setBackground(image: File, pageSize: PageSizeOption): Promise<void>
  addField(field: FieldDefinition): void
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
  zoom: number // percentage, e.g. 100
  snapToGrid: boolean
  gridSize: number // default 5
  contextMenu: { x: number; y: number; fieldId: string } | null

  // Actions
  selectField(id: string, multi?: boolean): void
  clearSelection(): void
  setZoom(zoom: number): void
  toggleSnapToGrid(): void
  setGridSize(size: number): void
  showContextMenu(x: number, y: number, fieldId: string): void
  hideContextMenu(): void
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

- [ ] AC-001: Canvas renders using react-konva and displays the background image as the base layer
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

## Dependencies

- Spec 002 — Template Schema (manifest structure, field definitions, page size options)

## Notes

- The react-konva `Stage` and `Layer` components form the canvas structure. Each field is a Konva `Group` containing the visual representation and resize handles.
- Zoom is implemented by scaling the Konva Stage, not by resizing individual elements.
- Open question: should elements be allowed outside the canvas bounds during drag (with clamping on release) or should they be clamped in real-time during drag?
- Open question: should the canvas support keyboard arrow keys for nudging selected elements by 1 pt (or by grid size when snap is enabled)?
- Consider using `browser-image-compression` for the background image compression, as suggested in the prompt. Evaluate bundle size impact.
- The canvas component tree: `CanvasArea.tsx` (main), `FieldRenderer.tsx` (renders individual fields), `SelectionHandles.tsx` (resize handles), `GridOverlay.tsx` (grid lines), `ContextMenu.tsx` (right-click menu).
