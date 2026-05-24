import { create } from 'zustand'
import { persist } from 'zustand/middleware'
/** The current tool active in the UI */
export type ActiveTool = 'select' | 'addText' | 'addImage' | 'addLoop'

export type Theme = 'light' | 'dark'

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
  /**
   * How many times the per-text "It works in my machine " phrase repeats
   * when the user clicks **Max Fill** (#90). Pre-#90 this also drove the
   * removed Default/Max toggle's max output; the toggle is gone, but the
   * repeat count still parameterises Max Fill's snapshot.
   */
  maxModeRepeatCount: number
  /**
   * User-edited JSON for the preview pipeline (#78). `null` means "use the
   * auto-generated example" — both the right-panel JsonPreview textarea and
   * the PreviewDialog's JSON editor read from this field, so an edit in
   * either surface flows to the other. Transient (not persisted) — a fresh
   * session starts unpinned, showing the auto-generated example.
   */
  previewJsonText: string | null
  /** Whether the right panel is visible */
  showRightPanel: boolean
  /** Whether the left panel is visible */
  showLeftPanel: boolean
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
   * the tab strip shows that tab's controls. Defaults to `'insert'` —
   * empty canvases bias toward "add something next".
   */
  activeMenuTab: 'file' | 'edit' | 'insert' | 'format' | 'view' | 'help'
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
  setMaxModeRepeatCount: (count: number) => void
  /**
   * Set the user-pinned preview JSON. Pass `null` to clear (revert to the
   * auto-generated example).
   */
  setPreviewJsonText: (text: string | null) => void
  setShowRightPanel: (show: boolean) => void
  setShowLeftPanel: (show: boolean) => void
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

function getSystemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: getSystemTheme(),
      selectedFieldIds: [],
      activeTool: 'select',
      showGrid: true,
      gridSize: 5,
      zoom: 1.0,
      showPreview: false,
      maxModeRepeatCount: 5,
      previewJsonText: null,
      showRightPanel: true,
      showLeftPanel: true,
      showPageSizeDialog: false,
      showChangeBgDialog: false,
      showFontManager: false,
      activeMenuTab: 'insert' as const,
      ribbonCollapsed: false,
      pageLayoutMenu: { kind: 'closed' },
      pageLayoutSettings: null,
      pendingBackground: null,
      contextMenu: null,
      currentPageId: null,
      isDrawing: false,
      drawStart: null,

      selectField: (id) => set({ selectedFieldIds: [id] }),
      // The properties panel lives on the LEFT under the GH #19 layout —
      // picking a field must make the left panel visible so the user can
      // see and edit its properties. (Pre-#19 this flipped showRightPanel.)
      selectAndFocus: (id) => set({ selectedFieldIds: [id], showLeftPanel: true }),
      selectFields: (ids) => set({ selectedFieldIds: ids }),
      toggleFieldSelection: (id) =>
        set((state) => {
          if (state.selectedFieldIds.includes(id)) {
            return { selectedFieldIds: state.selectedFieldIds.filter((fid) => fid !== id) }
          }
          return { selectedFieldIds: [...state.selectedFieldIds, id] }
        }),
      clearSelection: () => set({ selectedFieldIds: [] }),
      setActiveTool: (tool) => set({ activeTool: tool, isDrawing: false, drawStart: null }),
      setShowGrid: (show) => set({ showGrid: show }),
      setGridSize: (size) => set({ gridSize: size }),
      setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
      zoomIn: () => set((s) => ({ zoom: Math.min(5, s.zoom + 0.1) })),
      zoomOut: () => set((s) => ({ zoom: Math.max(0.1, s.zoom - 0.1) })),
      resetZoom: () => set({ zoom: 1.0 }),
      fitZoom: (containerW, containerH, pageW, pageH, padding = 16) => {
        if (pageW <= 0 || pageH <= 0 || containerW <= 0 || containerH <= 0) {
          return 1.0
        }
        const scaleX = (containerW - padding * 2) / pageW
        const scaleY = (containerH - padding * 2) / pageH
        const fit = Math.min(scaleX, scaleY)
        const clamped = Math.max(0.1, Math.min(5, fit))
        set({ zoom: clamped })
        return clamped
      },
      setShowPreview: (show) => set({ showPreview: show }),
      setMaxModeRepeatCount: (count) => set({ maxModeRepeatCount: count }),
      setPreviewJsonText: (text) => set({ previewJsonText: text }),
      setShowRightPanel: (show) => set({ showRightPanel: show }),
      setShowLeftPanel: (show) => set({ showLeftPanel: show }),
      setShowPageSizeDialog: (show) => set({ showPageSizeDialog: show }),
      setShowChangeBgDialog: (show) => set({ showChangeBgDialog: show }),
      setShowFontManager: (show) => set({ showFontManager: show }),
      setActiveMenuTab: (tab) =>
        set((s) => {
          // QA BUG-16: clicking the already-active tab collapses the
          // ribbon (Office Online convention). Clicking a different tab
          // re-expands.
          if (s.activeMenuTab === tab) {
            return { ribbonCollapsed: !s.ribbonCollapsed }
          }
          return { activeMenuTab: tab, ribbonCollapsed: false }
        }),
      setRibbonCollapsed: (ribbonCollapsed) => set({ ribbonCollapsed }),
      setPageLayoutMenu: (next) => set({ pageLayoutMenu: next }),
      setPageLayoutSettings: (target) =>
        set((state) => ({
          // Opening a settings modal also closes the menu — the modal owns
          // focus from that point on.
          pageLayoutMenu: target ? { kind: 'closed' } : state.pageLayoutMenu,
          pageLayoutSettings: target,
        })),
      setPendingBackground: (bg) => set({ pendingBackground: bg }),
      setContextMenu: (menu) => set({ contextMenu: menu }),
      setCurrentPage: (pageId) => set({ currentPageId: pageId }),
      startDrawing: (x, y) => set({ isDrawing: true, drawStart: { x, y } }),
      stopDrawing: () => set({ isDrawing: false, drawStart: null }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'template-goblin-ui',
      version: 3,
      // Only persist user preferences, not transient UI state
      partialize: (state) => ({
        theme: state.theme,
        showGrid: state.showGrid,
        gridSize: state.gridSize,
        maxModeRepeatCount: state.maxModeRepeatCount,
        showLeftPanel: state.showLeftPanel,
        showRightPanel: state.showRightPanel,
        currentPageId: state.currentPageId,
        // GH #84 follow-up: preserve zoom across refresh so the canvas
        // restores at whatever level the user was last looking at.
        zoom: state.zoom,
      }),
      // v1 → v2: removed the 'min' jsonPreviewMode value.
      // v2 → v3: removed jsonPreviewMode entirely (#90 collapsed Default/Max
      //   toggle into a single JSON + Max-Fill button). Strip the stale key
      //   from rehydrated state so it doesn't linger as dead persisted data.
      migrate: (persisted, version) => {
        const state = persisted as Record<string, unknown>
        if (version < 2) {
          if (state.jsonPreviewMode === 'min') state.jsonPreviewMode = 'default'
        }
        if (version < 3) {
          delete state.jsonPreviewMode
        }
        return state
      },
    },
  ),
)

// Expose for Playwright / dev-mode inspection (mirrors `__fabricCanvas` +
// `__templateStore`). Lets e2e tests assert UI-store state directly.
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  ;(window as unknown as { __uiStore?: typeof useUiStore }).__uiStore = useUiStore
}
