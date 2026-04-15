import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from '../uiStore.js'

/* ---- helpers ---- */

/** Reset store to defaults before each test */
function resetStore(): void {
  useUiStore.setState({
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
    theme: 'light',
  })
}

/* ---- tests ---- */

describe('uiStore', () => {
  beforeEach(() => {
    resetStore()
  })

  /* -- Selection -- */

  describe('selectField', () => {
    it('sets selectedFieldIds to [id]', () => {
      useUiStore.getState().selectField('field-1')
      expect(useUiStore.getState().selectedFieldIds).toEqual(['field-1'])
    })

    it('replaces previous selection', () => {
      useUiStore.getState().selectField('field-1')
      useUiStore.getState().selectField('field-2')
      expect(useUiStore.getState().selectedFieldIds).toEqual(['field-2'])
    })
  })

  describe('selectFields', () => {
    it('sets multiple selected field IDs', () => {
      useUiStore.getState().selectFields(['field-1', 'field-2', 'field-3'])
      expect(useUiStore.getState().selectedFieldIds).toEqual(['field-1', 'field-2', 'field-3'])
    })

    it('replaces previous selection', () => {
      useUiStore.getState().selectField('field-x')
      useUiStore.getState().selectFields(['field-a', 'field-b'])
      expect(useUiStore.getState().selectedFieldIds).toEqual(['field-a', 'field-b'])
    })

    it('handles empty array', () => {
      useUiStore.getState().selectField('field-1')
      useUiStore.getState().selectFields([])
      expect(useUiStore.getState().selectedFieldIds).toEqual([])
    })
  })

  describe('toggleFieldSelection', () => {
    it('adds field when not selected', () => {
      useUiStore.getState().toggleFieldSelection('field-1')
      expect(useUiStore.getState().selectedFieldIds).toContain('field-1')
    })

    it('removes field when already selected', () => {
      useUiStore.getState().selectFields(['field-1', 'field-2'])
      useUiStore.getState().toggleFieldSelection('field-1')
      expect(useUiStore.getState().selectedFieldIds).toEqual(['field-2'])
    })

    it('can build up multi-selection through repeated toggles', () => {
      useUiStore.getState().toggleFieldSelection('field-1')
      useUiStore.getState().toggleFieldSelection('field-2')
      useUiStore.getState().toggleFieldSelection('field-3')
      expect(useUiStore.getState().selectedFieldIds).toEqual(['field-1', 'field-2', 'field-3'])
    })

    it('toggling all off results in empty selection', () => {
      useUiStore.getState().toggleFieldSelection('field-1')
      useUiStore.getState().toggleFieldSelection('field-1')
      expect(useUiStore.getState().selectedFieldIds).toEqual([])
    })
  })

  describe('clearSelection', () => {
    it('empties the selectedFieldIds array', () => {
      useUiStore.getState().selectFields(['field-1', 'field-2'])
      useUiStore.getState().clearSelection()
      expect(useUiStore.getState().selectedFieldIds).toEqual([])
    })

    it('is a no-op when already empty', () => {
      useUiStore.getState().clearSelection()
      expect(useUiStore.getState().selectedFieldIds).toEqual([])
    })
  })

  /* -- Active Tool -- */

  describe('setActiveTool', () => {
    it('changes the active tool', () => {
      useUiStore.getState().setActiveTool('addText')
      expect(useUiStore.getState().activeTool).toBe('addText')
    })

    it('clears isDrawing when tool changes', () => {
      useUiStore.getState().startDrawing(10, 20)
      expect(useUiStore.getState().isDrawing).toBe(true)
      useUiStore.getState().setActiveTool('addImage')
      expect(useUiStore.getState().isDrawing).toBe(false)
    })

    it('clears drawStart when tool changes', () => {
      useUiStore.getState().startDrawing(10, 20)
      expect(useUiStore.getState().drawStart).not.toBeNull()
      useUiStore.getState().setActiveTool('select')
      expect(useUiStore.getState().drawStart).toBeNull()
    })

    it('supports all tool types', () => {
      const tools = ['select', 'addText', 'addImage', 'addLoop'] as const
      for (const tool of tools) {
        useUiStore.getState().setActiveTool(tool)
        expect(useUiStore.getState().activeTool).toBe(tool)
      }
    })
  })

  /* -- Grid -- */

  describe('setShowGrid', () => {
    it('toggles grid visibility to true', () => {
      useUiStore.getState().setShowGrid(false)
      expect(useUiStore.getState().showGrid).toBe(false)
      useUiStore.getState().setShowGrid(true)
      expect(useUiStore.getState().showGrid).toBe(true)
    })

    it('toggles grid visibility to false', () => {
      useUiStore.getState().setShowGrid(false)
      expect(useUiStore.getState().showGrid).toBe(false)
    })
  })

  describe('setGridSize', () => {
    it('changes the grid size', () => {
      useUiStore.getState().setGridSize(10)
      expect(useUiStore.getState().gridSize).toBe(10)
    })

    it('accepts small values', () => {
      useUiStore.getState().setGridSize(1)
      expect(useUiStore.getState().gridSize).toBe(1)
    })

    it('accepts large values', () => {
      useUiStore.getState().setGridSize(50)
      expect(useUiStore.getState().gridSize).toBe(50)
    })
  })

  /* -- Zoom -- */

  describe('setZoom', () => {
    it('sets zoom to the given value', () => {
      useUiStore.getState().setZoom(2.0)
      expect(useUiStore.getState().zoom).toBe(2.0)
    })

    it('clamps zoom to minimum of 0.1', () => {
      useUiStore.getState().setZoom(0.01)
      expect(useUiStore.getState().zoom).toBeCloseTo(0.1)
    })

    it('clamps zoom to maximum of 5', () => {
      useUiStore.getState().setZoom(10)
      expect(useUiStore.getState().zoom).toBe(5)
    })

    it('clamps negative values to 0.1', () => {
      useUiStore.getState().setZoom(-1)
      expect(useUiStore.getState().zoom).toBeCloseTo(0.1)
    })

    it('allows exactly 0.1', () => {
      useUiStore.getState().setZoom(0.1)
      expect(useUiStore.getState().zoom).toBeCloseTo(0.1)
    })

    it('allows exactly 5', () => {
      useUiStore.getState().setZoom(5)
      expect(useUiStore.getState().zoom).toBe(5)
    })
  })

  describe('zoomIn', () => {
    it('increments zoom by 0.1', () => {
      useUiStore.getState().setZoom(1.0)
      useUiStore.getState().zoomIn()
      expect(useUiStore.getState().zoom).toBeCloseTo(1.1)
    })

    it('does not exceed maximum of 5', () => {
      useUiStore.getState().setZoom(4.95)
      useUiStore.getState().zoomIn()
      expect(useUiStore.getState().zoom).toBe(5)
    })

    it('does not exceed 5 when already at 5', () => {
      useUiStore.getState().setZoom(5)
      useUiStore.getState().zoomIn()
      expect(useUiStore.getState().zoom).toBe(5)
    })
  })

  describe('zoomOut', () => {
    it('decrements zoom by 0.1', () => {
      useUiStore.getState().setZoom(1.0)
      useUiStore.getState().zoomOut()
      expect(useUiStore.getState().zoom).toBeCloseTo(0.9)
    })

    it('does not go below minimum of 0.1', () => {
      useUiStore.getState().setZoom(0.15)
      useUiStore.getState().zoomOut()
      expect(useUiStore.getState().zoom).toBeCloseTo(0.1)
    })

    it('does not go below 0.1 when already at 0.1', () => {
      useUiStore.getState().setZoom(0.1)
      useUiStore.getState().zoomOut()
      expect(useUiStore.getState().zoom).toBeCloseTo(0.1)
    })
  })

  describe('resetZoom', () => {
    it('sets zoom to 1.0', () => {
      useUiStore.getState().setZoom(3.5)
      useUiStore.getState().resetZoom()
      expect(useUiStore.getState().zoom).toBe(1.0)
    })

    it('resets from a low zoom level', () => {
      useUiStore.getState().setZoom(0.2)
      useUiStore.getState().resetZoom()
      expect(useUiStore.getState().zoom).toBe(1.0)
    })
  })

  /* -- JSON Preview Mode -- */

  describe('setJsonPreviewMode', () => {
    it('switches to max mode', () => {
      useUiStore.getState().setJsonPreviewMode('max')
      expect(useUiStore.getState().jsonPreviewMode).toBe('max')
    })

    it('switches back to default mode', () => {
      useUiStore.getState().setJsonPreviewMode('max')
      useUiStore.getState().setJsonPreviewMode('default')
      expect(useUiStore.getState().jsonPreviewMode).toBe('default')
    })
  })

  /* -- Theme -- */

  describe('toggleTheme', () => {
    it('flips from light to dark', () => {
      useUiStore.setState({ theme: 'light' })
      useUiStore.getState().toggleTheme()
      expect(useUiStore.getState().theme).toBe('dark')
    })

    it('flips from dark to light', () => {
      useUiStore.setState({ theme: 'dark' })
      useUiStore.getState().toggleTheme()
      expect(useUiStore.getState().theme).toBe('light')
    })

    it('double toggle returns to original', () => {
      useUiStore.setState({ theme: 'light' })
      useUiStore.getState().toggleTheme()
      useUiStore.getState().toggleTheme()
      expect(useUiStore.getState().theme).toBe('light')
    })
  })

  /* -- Drawing -- */

  describe('startDrawing', () => {
    it('sets isDrawing to true and stores coordinates', () => {
      useUiStore.getState().startDrawing(100, 200)
      const state = useUiStore.getState()
      expect(state.isDrawing).toBe(true)
      expect(state.drawStart).toEqual({ x: 100, y: 200 })
    })

    it('stores zero coordinates', () => {
      useUiStore.getState().startDrawing(0, 0)
      expect(useUiStore.getState().drawStart).toEqual({ x: 0, y: 0 })
    })
  })

  describe('stopDrawing', () => {
    it('sets isDrawing to false and clears drawStart', () => {
      useUiStore.getState().startDrawing(10, 20)
      useUiStore.getState().stopDrawing()
      const state = useUiStore.getState()
      expect(state.isDrawing).toBe(false)
      expect(state.drawStart).toBeNull()
    })

    it('is a no-op when not drawing', () => {
      useUiStore.getState().stopDrawing()
      const state = useUiStore.getState()
      expect(state.isDrawing).toBe(false)
      expect(state.drawStart).toBeNull()
    })
  })

  /* -- Context Menu -- */

  describe('setContextMenu', () => {
    it('sets context menu with position and field ID', () => {
      useUiStore.getState().setContextMenu({ x: 150, y: 250, fieldId: 'field-1' })
      expect(useUiStore.getState().contextMenu).toEqual({ x: 150, y: 250, fieldId: 'field-1' })
    })

    it('replaces existing context menu', () => {
      useUiStore.getState().setContextMenu({ x: 10, y: 20, fieldId: 'field-1' })
      useUiStore.getState().setContextMenu({ x: 30, y: 40, fieldId: 'field-2' })
      expect(useUiStore.getState().contextMenu).toEqual({ x: 30, y: 40, fieldId: 'field-2' })
    })

    it('can set to null to clear', () => {
      useUiStore.getState().setContextMenu({ x: 10, y: 20, fieldId: 'field-1' })
      useUiStore.getState().setContextMenu(null)
      expect(useUiStore.getState().contextMenu).toBeNull()
    })
  })

  describe('clearContextMenu (via setContextMenu(null))', () => {
    it('clears the context menu', () => {
      useUiStore.getState().setContextMenu({ x: 100, y: 200, fieldId: 'field-1' })
      useUiStore.getState().setContextMenu(null)
      expect(useUiStore.getState().contextMenu).toBeNull()
    })
  })
})
