import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ActiveTool, Theme, UiState } from './uiStore.types.js'

// Re-export so existing `import { UiState } from './uiStore'` paths keep working.
export type { ActiveTool, Theme, UiState }

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
      showRightPanel: true,
      showLeftPanel: true,
      showSelectionToolbar: true,
      showPageSizeDialog: false,
      showChangeBgDialog: false,
      showFontManager: false,
      activeMenuTab: 'file' as const,
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
      setShowRightPanel: (show) => set({ showRightPanel: show }),
      setShowLeftPanel: (show) => set({ showLeftPanel: show }),
      setShowSelectionToolbar: (show) => set({ showSelectionToolbar: show }),
      setShowPageSizeDialog: (show) => set({ showPageSizeDialog: show }),
      setShowChangeBgDialog: (show) => set({ showChangeBgDialog: show }),
      setShowFontManager: (show) => set({ showFontManager: show }),
      setActiveMenuTab: (tab) =>
        set((s) => {
          const nextTab = s.activeMenuTab === tab ? null : tab
          return { activeMenuTab: nextTab, ribbonCollapsed: nextTab === null }
        }),
      setRibbonCollapsed: (ribbonCollapsed) =>
        set((s) => {
          if (ribbonCollapsed) {
            return { activeMenuTab: null, ribbonCollapsed: true }
          }
          const nextTab = s.activeMenuTab ?? 'file'
          return { activeMenuTab: nextTab, ribbonCollapsed: false }
        }),
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
      version: 4,
      // Only persist user preferences, not transient UI state
      partialize: (state) => ({
        theme: state.theme,
        showGrid: state.showGrid,
        gridSize: state.gridSize,
        showLeftPanel: state.showLeftPanel,
        showRightPanel: state.showRightPanel,
        showSelectionToolbar: state.showSelectionToolbar,
        currentPageId: state.currentPageId,
        // GH #84 follow-up: preserve zoom across refresh so the canvas
        // restores at whatever level the user was last looking at.
        zoom: state.zoom,
      }),
      // v1 → v2: removed the 'min' jsonPreviewMode value.
      // v2 → v3: removed jsonPreviewMode entirely (#90 collapsed Default/Max
      //   toggle into a single JSON + Max-Fill button). Strip the stale key
      //   from rehydrated state so it doesn't linger as dead persisted data.
      // v3 → v4: removed Max Fill + the JSON pin — the JSON panel is now a
      //   pure projection of the fields with per-value write-through, so
      //   `maxModeRepeatCount` (and the never-persisted `previewJsonText`)
      //   are gone.
      migrate: (persisted, version) => {
        const state = persisted as Record<string, unknown>
        if (version < 2) {
          if (state.jsonPreviewMode === 'min') state.jsonPreviewMode = 'default'
        }
        if (version < 3) {
          delete state.jsonPreviewMode
        }
        if (version < 4) {
          delete state.maxModeRepeatCount
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
