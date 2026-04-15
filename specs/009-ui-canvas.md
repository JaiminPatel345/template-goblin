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
- [ ] REQ-021: UI state (selected field, panel visibility, zoom level, current page) is managed via Zustand store (`uiStore`)
- [ ] REQ-022: A page tab bar is displayed at the bottom of the canvas, showing one tab per user-defined page labeled "Page 1", "Page 2", etc.
- [ ] REQ-023: Clicking a page tab switches the canvas to display that page's background and only the fields assigned to that page (matching `pageId`)
- [ ] REQ-024: The currently active page tab is visually highlighted (e.g., bold text, underline, or distinct background color)
- [ ] REQ-025: An "Add Page" button (e.g., a "+" icon) is displayed at the end of the page tab bar. Clicking it opens a background choice dialog with three options: Upload Image, Solid Color, or Inherit from Previous
- [ ] REQ-026: The "Inherit from Previous" option is disabled when the new page would be the first page (index 0)
- [ ] REQ-027: When a new page is added, the canvas automatically switches to the new page
- [ ] REQ-028: Page tabs support right-click context menu with "Delete Page" and "Duplicate Page" options
- [ ] REQ-029: The "Delete Page" option is disabled when only one page remains
- [ ] REQ-030: Page tabs support drag-and-drop reordering. When pages are reordered, `index` values are renumbered and any page with `backgroundType: "inherit"` at index 0 prompts the user to choose a new background
- [ ] REQ-031: When the canvas is on a specific page, newly added fields are automatically assigned to the current page's `pageId`
- [ ] REQ-032: The background choice dialog for "Upload Image" includes image compression and shows original vs compressed size (same flow as the existing background upload in REQ-007)
- [ ] REQ-033: The background choice dialog for "Solid Color" includes a color picker defaulting to `#FFFFFF`

## Behaviour

### Happy path

1. User opens the application and sees an empty canvas area with a prompt to upload a background image
2. User clicks "Upload BG" in the toolbar and selects an image file
3. PageSizeDialog appears showing detected image dimensions (e.g. "Your image is 2480x3508 pixels") and page size options
4. User selects a page size (e.g. A4). Canvas dimensions are set to 595x842 pt. Background image is scaled to fill the canvas.
5. Original vs compressed image size is displayed (e.g. "Original: 2.4 MB, Compressed: 340 KB")
6. Canvas displays the background image. Grid lines appear if snap-to-grid is enabled. The page tab bar at the bottom shows "Page 1" as the active tab with an "Add Page" button.
7. User adds fields (text, image, loop) by drawing rectangles on the canvas. Each field is automatically assigned to the current page.
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
- [ ] AC-021: A page tab bar is displayed at the bottom of the canvas with one tab per user-defined page
- [ ] AC-022: Clicking a page tab switches the canvas to that page, displaying only fields with matching `pageId`
- [ ] AC-023: The active page tab is visually distinguished from inactive tabs
- [ ] AC-024: The "Add Page" button at the end of the tab bar opens a background choice dialog with Upload Image, Solid Color, and Inherit from Previous options
- [ ] AC-025: Selecting "Upload Image" in the background choice dialog triggers image upload with compression, then creates the new page
- [ ] AC-026: Selecting "Solid Color" shows a color picker; confirming creates a new page with a solid color background
- [ ] AC-027: "Inherit from Previous" is disabled when the new page would be the first page
- [ ] AC-028: After adding a new page, the canvas switches to it automatically
- [ ] AC-029: Right-clicking a page tab shows a context menu with "Delete Page" and "Duplicate Page"
- [ ] AC-030: "Delete Page" removes the page and all its fields; it is disabled when only one page remains
- [ ] AC-031: Newly added fields are assigned the `pageId` of the currently active page
- [ ] AC-032: Switching pages clears the current field selection
- [ ] AC-033: Page tabs can be reordered via drag-and-drop; indices are renumbered after reordering
- [ ] AC-034: If a page with `backgroundType: "inherit"` is dragged to index 0, a dialog prompts the user to choose a new background type

## Dependencies

- Spec 002 — Template Schema (manifest structure, field definitions, page size options, `PageDefinition`, `pageId`)
- Spec 006 — Multi-Page (user-defined pages, page backgrounds, page ordering)

## Notes

- The react-konva `Stage` and `Layer` components form the canvas structure. Each field is a Konva `Group` containing the visual representation and resize handles.
- Zoom is implemented by scaling the Konva Stage, not by resizing individual elements.
- Open question: should elements be allowed outside the canvas bounds during drag (with clamping on release) or should they be clamped in real-time during drag?
- Open question: should the canvas support keyboard arrow keys for nudging selected elements by 1 pt (or by grid size when snap is enabled)?
- Consider using `browser-image-compression` for the background image compression, as suggested in the prompt. Evaluate bundle size impact.
- The canvas component tree: `CanvasArea.tsx` (main), `FieldRenderer.tsx` (renders individual fields), `SelectionHandles.tsx` (resize handles), `GridOverlay.tsx` (grid lines), `ContextMenu.tsx` (right-click menu), `PageTabBar.tsx` (page navigation tabs), `BackgroundChoiceDialog.tsx` (background type selection for new pages).
- The page tab bar sits below the Konva Stage, outside the canvas rendering area. It is a standard React component (not a Konva element).
- When many pages exist, the tab bar should be horizontally scrollable with overflow indicators (e.g., fade or arrow buttons at the edges).
