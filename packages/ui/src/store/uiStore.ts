import { create } from 'zustand'
import { persist } from 'zustand/middleware'
/** The current tool active in the UI */
export type ActiveTool = 'select' | 'addText' | 'addImage' | 'addLoop'

/** JSON preview mode */
export type JsonPreviewMode = 'default' | 'max'

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
  /** JSON preview mode */
  jsonPreviewMode: JsonPreviewMode
  /** Max mode repeat count for text */
  maxModeRepeatCount: number
  /** Whether the right panel is visible */
  showRightPanel: boolean
  /** Whether the left panel is visible */
  showLeftPanel: boolean
  /** Whether the page size dialog is open */
  showPageSizeDialog: boolean
  /** Whether the font manager dialog is open */
  showFontManager: boolean
  /** Pending background image for page size dialog */
  pendingBackground: { dataUrl: string; buffer: ArrayBuffer; width: number; height: number } | null
  /** Context menu state */
  contextMenu: { x: number; y: number; fieldId: string } | null
  /** Whether a drawing operation is in progress */
  isDrawing: boolean
  /** Drawing start coordinates */
  drawStart: { x: number; y: number } | null

  /** Actions */
  selectField: (id: string) => void
  selectFields: (ids: string[]) => void
  toggleFieldSelection: (id: string) => void
  clearSelection: () => void
  setActiveTool: (tool: ActiveTool) => void
  setShowGrid: (show: boolean) => void
  setGridSize: (size: number) => void
  setZoom: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  setShowPreview: (show: boolean) => void
  setJsonPreviewMode: (mode: JsonPreviewMode) => void
  setMaxModeRepeatCount: (count: number) => void
  setShowRightPanel: (show: boolean) => void
  setShowLeftPanel: (show: boolean) => void
  setShowPageSizeDialog: (show: boolean) => void
  setShowFontManager: (show: boolean) => void
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
      jsonPreviewMode: 'default',
      maxModeRepeatCount: 5,
      showRightPanel: true,
      showLeftPanel: true,
      showPageSizeDialog: false,
      showFontManager: false,
      pendingBackground: null,
      contextMenu: null,
      isDrawing: false,
      drawStart: null,

      selectField: (id) => set({ selectedFieldIds: [id] }),
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
      setShowPreview: (show) => set({ showPreview: show }),
      setJsonPreviewMode: (mode) => set({ jsonPreviewMode: mode }),
      setMaxModeRepeatCount: (count) => set({ maxModeRepeatCount: count }),
      setShowRightPanel: (show) => set({ showRightPanel: show }),
      setShowLeftPanel: (show) => set({ showLeftPanel: show }),
      setShowPageSizeDialog: (show) => set({ showPageSizeDialog: show }),
      setShowFontManager: (show) => set({ showFontManager: show }),
      setPendingBackground: (bg) => set({ pendingBackground: bg }),
      setContextMenu: (menu) => set({ contextMenu: menu }),
      startDrawing: (x, y) => set({ isDrawing: true, drawStart: { x, y } }),
      stopDrawing: () => set({ isDrawing: false, drawStart: null }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'template-goblin-ui',
      version: 1,
      // Only persist user preferences, not transient UI state
      partialize: (state) => ({
        theme: state.theme,
        showGrid: state.showGrid,
        gridSize: state.gridSize,
        jsonPreviewMode: state.jsonPreviewMode,
        maxModeRepeatCount: state.maxModeRepeatCount,
        showLeftPanel: state.showLeftPanel,
        showRightPanel: state.showRightPanel,
      }),
    },
  ),
)
