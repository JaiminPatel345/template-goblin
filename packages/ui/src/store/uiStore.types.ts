/**
 * Type definitions for the UI store. Extracted from `uiStore.ts` so the store
 * implementation stays under the line cap (Hard Rule #11); re-exported from
 * `uiStore.ts` for backward-compatible imports.
 */

/** The current tool active in the UI */
export type ActiveTool = 'select' | 'addText' | 'addImage' | 'addLoop'

export type Theme = 'light' | 'dark'

export type MenuTab = 'file' | 'edit' | 'insert' | 'format' | 'view' | 'help'

export interface UiState {
  /** Light or dark theme */
  theme: Theme
  /** Currently selected field IDs */
  selectedFieldIds: string[]
  /** The active drawing/selection tool */
  activeTool: ActiveTool
  /** Whether the grid overlay is visible */
  showGrid: boolean
  /** Grid snap size in points */
  gridSize: number
  /** Canvas zoom level (1.0 = 100%) */
  zoom: number
  /** Whether the PDF preview panel is open */
  showPreview: boolean
  /** Whether the right panel is visible */
  showRightPanel: boolean
  /** Whether the left panel is visible */
  showLeftPanel: boolean
  /**
   * Whether the floating selection toolbar (#167) appears when a single
   * text field is selected. The toolbar's eye-off button flips this to
   * false; View → Selection toolbar flips it back. Persisted so the
   * preference survives reloads.
   */
  showSelectionToolbar: boolean
  /** Whether the page size dialog is open */
  showPageSizeDialog: boolean
  /**
   * Whether the Change Background dialog is open. Reuses `AddPageDialog`
   * in `mode="edit"` to update the current page's background (#58).
   */
  showChangeBgDialog: boolean
  /** Whether the font manager dialog is open */
  showFontManager: boolean
  /**
   * Which top-level tab is active in the menu bar (#128). The ribbon below
   * the tab strip shows that tab's controls. When null, no tab is active and
   * the ribbon is collapsed. Defaults to `'file'`.
   */
  activeMenuTab: MenuTab | null
  /**
   * Whether the ribbon row below the menu tabs is collapsed (QA BUG-16).
   * Defaults to false — the ribbon is visible. Toggled by:
   *  - clicking the currently-active menu tab (Office Online "double-
   *    click to hide ribbon" convention),
   *  - pressing Escape with no other dismissible target focused.
   * Clicking a NON-active tab always re-expands the ribbon.
   */
  ribbonCollapsed: boolean
  /**
   * Anchored Page Layout menu state (#61, follow-up).
   *
   * Mirrors the Word / Google Docs Insert → Header & Footer pattern:
   *  - `closed` — menu hidden.
   *  - `main` — the toolbar-anchored dropdown is showing the top-level
   *    items (Header / Footer / Page Number).
   *  - `flyout` — a sub-menu pane is open for one of the three targets;
   *    the top-level menu stays visible alongside it.
   */
  pageLayoutMenu:
    | { kind: 'closed' }
    | { kind: 'main' }
    | { kind: 'flyout'; target: 'header' | 'footer' | 'pageNumber' }
  /**
   * Which band's full settings modal is currently open. `null` when the
   * modal is closed. Independent of `pageLayoutMenu` — opening the modal
   * closes the menu, but the modal then lives until the user dismisses
   * it.
   */
  pageLayoutSettings: 'header' | 'footer' | 'pageNumber' | null
  /** Pending background image for page size dialog */
  pendingBackground: { dataUrl: string; buffer: ArrayBuffer; width: number; height: number } | null
  /** Context menu state */
  contextMenu: { x: number; y: number; fieldId: string } | null
  /** Which page is currently being viewed/edited (null = page 0) */
  currentPageId: string | null
  /** Whether a drawing operation is in progress */
  isDrawing: boolean
  /** Drawing start coordinates */
  drawStart: { x: number; y: number } | null

  /** Actions */
  setCurrentPage: (pageId: string | null) => void
  selectField: (id: string) => void
  selectFields: (ids: string[]) => void
  toggleFieldSelection: (id: string) => void
  clearSelection: () => void
  /**
   * Select a single field AND ensure the properties panel (left under
   * GH #19) is visible. This is the canonical "user picks an element"
   * action: a click on the canvas, a click on the structure-panel list,
   * or a double-click all ultimately reduce to this. Keeping the two
   * store updates in one action prevents selection+panel drift.
   */
  selectAndFocus: (id: string) => void
  setActiveTool: (tool: ActiveTool) => void
  setShowGrid: (show: boolean) => void
  setGridSize: (size: number) => void
  setZoom: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  /**
   * Compute and apply the zoom that fits the given page size inside the given
   * container (viewport) bounds with a small padding on every side.
   * Returns the new zoom. Clamped to [0.1, 5].
   */
  fitZoom: (
    containerW: number,
    containerH: number,
    pageW: number,
    pageH: number,
    padding?: number,
  ) => number
  setShowPreview: (show: boolean) => void
  setShowRightPanel: (show: boolean) => void
  setShowLeftPanel: (show: boolean) => void
  setShowSelectionToolbar: (show: boolean) => void
  setShowPageSizeDialog: (show: boolean) => void
  setShowChangeBgDialog: (show: boolean) => void
  setShowFontManager: (show: boolean) => void
  /** Switch the top-level menu tab (#128). The ribbon swaps to match. */
  setActiveMenuTab: (tab: UiState['activeMenuTab']) => void
  setRibbonCollapsed: (collapsed: boolean) => void
  /** Update the Page Layout menu state (toolbar-anchored dropdown). */
  setPageLayoutMenu: (
    next:
      | { kind: 'closed' }
      | { kind: 'main' }
      | { kind: 'flyout'; target: 'header' | 'footer' | 'pageNumber' },
  ) => void
  /** Open / close the full settings modal for one band or page number. */
  setPageLayoutSettings: (target: 'header' | 'footer' | 'pageNumber' | null) => void
  setPendingBackground: (bg: UiState['pendingBackground']) => void
  setContextMenu: (menu: UiState['contextMenu']) => void
  startDrawing: (x: number, y: number) => void
  stopDrawing: () => void
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}
