import React, { useRef, useEffect, useState, useCallback } from 'react'
import {
  Stage,
  Layer,
  Rect,
  Text,
  Image as KonvaImage,
  Line,
  Group,
  Transformer,
} from 'react-konva'
import type Konva from 'konva'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { createDefaultField } from '../../utils/defaults.js'
import type {
  FieldDefinition,
  FieldType,
  PageDefinition,
  PageBackgroundType,
} from '@template-goblin/types'

const FIELD_COLORS: Record<FieldType, { fill: string; stroke: string; text: string }> = {
  text: { fill: 'rgba(37,99,235,0.35)', stroke: '#60a5fa', text: '#ffffff' },
  image: { fill: 'rgba(22,163,74,0.35)', stroke: '#4ade80', text: '#ffffff' },
  table: { fill: 'rgba(217,119,6,0.35)', stroke: '#fb923c', text: '#ffffff' },
}

/** Label shown inside a field's bounding box on the canvas. */
function fieldCanvasLabel(field: FieldDefinition): string {
  // Defensive guard: a corrupt or in-flight migrated field may be missing
  // `source`. Render a visible fallback instead of crashing the canvas.
  if (!field.source) return `<legacy ${field.type}>`
  if (field.source.mode !== 'dynamic') return `<static ${field.type}>`
  if (!field.source.jsonKey) return `(${field.type})`
  const prefix = field.type === 'text' ? 'texts.' : field.type === 'image' ? 'images.' : 'tables.'
  return prefix + field.source.jsonKey
}

const SELECTED_STROKE = '#e94560'

function snap(value: number, gridSize: number, enabled: boolean): number {
  if (!enabled || gridSize <= 0) return value
  return Math.round(value / gridSize) * gridSize
}

let pageIdCounter = 0
function generatePageId(): string {
  pageIdCounter++
  return `page-${Date.now()}-${pageIdCounter}`
}

/**
 * Empty-state onboarding picker. Shown on page 0 when no background has been
 * chosen yet. Offers two options:
 *   - Upload image: reuses the existing upload flow (PageSizeDialog follows).
 *   - Solid color: HTML `<input type="color">` + hex input, applied to page 0
 *     as `backgroundType: 'color'` with the chosen `#RRGGBB`.
 * Defaults to `#FFFFFF` if the user hits Apply without touching the picker.
 */
function OnboardingPicker({
  isDragOver,
  onDrop,
  onDragOver,
  onDragLeave,
  onChooseImage,
  onChooseColor,
  fileInputRef,
  onFileChange,
  containerRef,
}: {
  isDragOver: boolean
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onChooseImage: () => void
  onChooseColor: (hex: string) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  containerRef: React.RefObject<HTMLDivElement | null>
}) {
  const [mode, setMode] = useState<'choose' | 'color'>('choose')
  const [color, setColor] = useState('#ffffff')

  return (
    <div
      ref={(el) => {
        // Imperatively forward the ref so we can accept the mutable
        // `RefObject<T | null>` shape without fighting the JSX `LegacyRef`
        // typing.
        if (containerRef && typeof containerRef === 'object') {
          ;(containerRef as { current: HTMLDivElement | null }).current = el
        }
      }}
      className={`tg-upload-zone ${isDragOver ? 'tg-upload-zone--active' : ''}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <div className="tg-upload-content">
        {mode === 'choose' && (
          <>
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <h2 className="tg-upload-title">Choose a background</h2>
            <p className="tg-upload-subtitle">Upload an image or start with a solid color.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
              <button
                className="tg-btn tg-btn--primary tg-upload-btn"
                onClick={onChooseImage}
                data-testid="onboarding-upload-image"
              >
                Upload image
              </button>
              <button
                className="tg-btn tg-upload-btn"
                onClick={() => setMode('color')}
                data-testid="onboarding-solid-color"
              >
                Solid color
              </button>
            </div>
            <input
              ref={(el) => {
                if (fileInputRef && typeof fileInputRef === 'object') {
                  ;(fileInputRef as { current: HTMLInputElement | null }).current = el
                }
              }}
              type="file"
              accept="image/*"
              hidden
              onChange={onFileChange}
            />
            <p className="tg-upload-hint">
              Drag and drop an image here too — supports PNG, JPG, WEBP.
            </p>
          </>
        )}

        {mode === 'color' && (
          <>
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
            <h2 className="tg-upload-title">Pick a background color</h2>
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 8,
              }}
            >
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ width: 56, height: 40, border: 'none', cursor: 'pointer' }}
                data-testid="onboarding-color-input"
              />
              <input
                type="text"
                className="tg-input"
                value={color}
                onChange={(e) => {
                  const v = e.target.value
                  // Accept partial typing; validate & persist only on Apply.
                  setColor(v)
                }}
                style={{ width: 100, fontFamily: 'monospace' }}
                maxLength={7}
                data-testid="onboarding-color-hex"
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
              <button className="tg-btn" onClick={() => setMode('choose')}>
                Back
              </button>
              <button
                className="tg-btn tg-btn--primary"
                onClick={() => {
                  // Normalise: default to white if the user cleared the input,
                  // and lowercase the hex for consistency.
                  const hex = /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : '#ffffff'
                  onChooseColor(hex)
                }}
                data-testid="onboarding-color-apply"
              >
                Apply
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** Inline dialog for adding a new page */
function AddPageDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (bgType: PageBackgroundType, bgColor?: string, bgFile?: File) => void
}) {
  const [mode, setMode] = useState<'choose' | 'color'>('choose')
  const [color, setColor] = useState('#ffffff')
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="tg-dialog-overlay" onClick={onClose}>
      <div className="tg-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="tg-dialog-title">Add New Page</h3>
        <p>Choose a background for the new page:</p>

        {mode === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              className="tg-btn"
              style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              Upload new image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onAdd('image', undefined, file)
                e.target.value = ''
              }}
            />

            <button
              className="tg-btn"
              style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
              onClick={() => onAdd('inherit')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="2" width="20" height="20" rx="2" />
                <path d="M7 12h10M12 7v10" />
              </svg>
              Same as previous page
            </button>

            <button
              className="tg-btn"
              style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
              onClick={() => setMode('color')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
              Solid color
            </button>
          </div>
        )}

        {mode === 'color' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Color:</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ width: '48px', height: '32px', border: 'none', cursor: 'pointer' }}
              />
              <span
                style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}
              >
                {color}
              </span>
            </div>
            <div className="tg-dialog-actions">
              <button className="tg-btn" onClick={() => setMode('choose')}>
                Back
              </button>
              <button className="tg-btn tg-btn--primary" onClick={() => onAdd('color', color)}>
                Add Page
              </button>
            </div>
          </div>
        )}

        {mode === 'choose' && (
          <div className="tg-dialog-actions">
            <button className="tg-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function CanvasArea() {
  const meta = useTemplateStore((s) => s.meta)
  const fields = useTemplateStore((s) => s.fields)
  const pages = useTemplateStore((s) => s.pages)
  const backgroundDataUrl = useTemplateStore((s) => s.backgroundDataUrl)
  const pageBackgroundDataUrls = useTemplateStore((s) => s.pageBackgroundDataUrls)
  const pageBackgroundBuffers = useTemplateStore((s) => s.pageBackgroundBuffers)
  const addField = useTemplateStore((s) => s.addField)
  const moveField = useTemplateStore((s) => s.moveField)
  const resizeField = useTemplateStore((s) => s.resizeField)
  const addPage = useTemplateStore((s) => s.addPage)
  const removePage = useTemplateStore((s) => s.removePage)
  const setPage0BackgroundColor = useTemplateStore((s) => s.setPage0BackgroundColor)

  const activeTool = useUiStore((s) => s.activeTool)
  const selectedFieldIds = useUiStore((s) => s.selectedFieldIds)
  const showGrid = useUiStore((s) => s.showGrid)
  const gridSize = useUiStore((s) => s.gridSize)
  const zoom = useUiStore((s) => s.zoom)
  const setZoom = useUiStore((s) => s.setZoom)
  const isDrawing = useUiStore((s) => s.isDrawing)
  const drawStart = useUiStore((s) => s.drawStart)
  const selectField = useUiStore((s) => s.selectField)
  const clearSelection = useUiStore((s) => s.clearSelection)
  const toggleFieldSelection = useUiStore((s) => s.toggleFieldSelection)
  const setContextMenu = useUiStore((s) => s.setContextMenu)
  const startDrawing = useUiStore((s) => s.startDrawing)
  const stopDrawing = useUiStore((s) => s.stopDrawing)
  const setActiveTool = useUiStore((s) => s.setActiveTool)
  const setPendingBackground = useUiStore((s) => s.setPendingBackground)
  const setShowPageSizeDialog = useUiStore((s) => s.setShowPageSizeDialog)
  const currentPageId = useUiStore((s) => s.currentPageId)
  const setCurrentPage = useUiStore((s) => s.setCurrentPage)

  const stageRef = useRef<Konva.Stage | null>(null)
  const transformerRef = useRef<Konva.Transformer | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [drawRect, setDrawRect] = useState<{ x: number; y: number; w: number; h: number } | null>(
    null,
  )
  const [isDragOver, setIsDragOver] = useState(false)
  const [showAddPageDialog, setShowAddPageDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Resolve the current page's effective background data URL.
  // For backward compat: if no pages array, use legacy backgroundDataUrl.
  const resolveCurrentBgDataUrl = useCallback((): string | null => {
    // No pages defined — legacy single-page mode
    if (pages.length === 0) return backgroundDataUrl

    // Page 0 (null) — use legacy background
    if (currentPageId === null) return backgroundDataUrl

    const page = pages.find((p) => p.id === currentPageId)
    if (!page) return backgroundDataUrl

    if (page.backgroundType === 'image') {
      return pageBackgroundDataUrls.get(page.id) ?? null
    }

    if (page.backgroundType === 'inherit') {
      // Walk back to find the nearest non-inherit page
      for (let i = page.index - 1; i >= 0; i--) {
        const prev = pages.find((p) => p.index === i)
        if (!prev) continue
        if (prev.backgroundType === 'image') {
          return pageBackgroundDataUrls.get(prev.id) ?? null
        }
        if (prev.backgroundType === 'color') {
          return null // color pages have no image
        }
        // continue if also 'inherit'
      }
      // Fell through to page 0 legacy
      return backgroundDataUrl
    }

    // backgroundType === 'color' — no image, color is handled by the Rect
    return null
  }, [pages, currentPageId, backgroundDataUrl, pageBackgroundDataUrls])

  // Resolve the current page's background color (for 'color' type pages).
  // Page 0 (the implicit first page, `currentPageId === null`) may now also
  // be a color page if the user picked "Solid color" during onboarding — in
  // that case the page lives in `pages` at index 0 with no legacy
  // `backgroundDataUrl` set.
  const resolveCurrentBgColor = useCallback((): string | null => {
    if (pages.length === 0) return null

    if (currentPageId === null) {
      const page0 = pages.find((p) => p.index === 0)
      if (page0 && page0.backgroundType === 'color') return page0.backgroundColor
      return null
    }

    const page = pages.find((p) => p.id === currentPageId)
    if (!page) return null

    if (page.backgroundType === 'color') return page.backgroundColor
    return null
  }, [pages, currentPageId])

  const currentBgDataUrl = resolveCurrentBgDataUrl()
  const currentBgColor = resolveCurrentBgColor()

  // Load background image for the current page
  useEffect(() => {
    if (!currentBgDataUrl) {
      setBgImage(null)
      return
    }
    const img = new window.Image()
    img.src = currentBgDataUrl
    img.onload = () => setBgImage(img)
  }, [currentBgDataUrl])

  // Auto-fit zoom only when background first loads (not on every resize)
  const hasAutoFitted = useRef(false)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const hasBg = currentBgDataUrl || currentBgColor
    if (hasBg && meta.width > 0 && meta.height > 0 && !hasAutoFitted.current) {
      const w = el.clientWidth
      const h = el.clientHeight
      const padding = 40
      const scaleX = (w - padding * 2) / meta.width
      const scaleY = (h - padding * 2) / meta.height
      const fitZoom = Math.min(scaleX, scaleY, 2)
      setZoom(Math.max(0.1, fitZoom))
      hasAutoFitted.current = true
    }

    if (!hasBg) {
      hasAutoFitted.current = false
    }

    return undefined
  }, [currentBgDataUrl, currentBgColor, meta.width, meta.height])

  // Filter fields by current page
  const pageFields = fields.filter((f) => {
    // null pageId means page 0 — show when currentPageId is null
    if (currentPageId === null) return f.pageId === null || f.pageId === undefined
    return f.pageId === currentPageId
  })

  // Attach Transformer to selected nodes
  useEffect(() => {
    const tr = transformerRef.current
    const stage = stageRef.current
    if (!tr || !stage) return

    if (meta.locked) {
      tr.nodes([])
      return
    }

    const nodes: Konva.Node[] = selectedFieldIds
      .map((id) => stage.findOne(`#field-${id}`))
      .filter(Boolean) as Konva.Node[]

    tr.nodes(nodes)
    tr.getLayer()?.batchDraw()
  }, [selectedFieldIds, pageFields, meta.locked])

  // Scroll-to-zoom: native non-passive listener to prevent page scroll
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      e.stopPropagation()
      const currentZoom = useUiStore.getState().zoom
      const delta = e.deltaY > 0 ? -0.05 : 0.05
      const newZoom = Math.max(0.1, Math.min(5, currentZoom + delta))
      useUiStore.getState().setZoom(newZoom)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Pan state: activated either by (a) middle mouse button down, or
  // (b) spacebar held + left mouse button down. Canva uses spacebar; Figma
  // uses spacebar. We support both that and the middle-click shortcut.
  const [isPanning, setIsPanning] = useState(false)
  const [spacePanMode, setSpacePanMode] = useState(false)
  const panStart = useRef<{ x: number; y: number } | null>(null)

  // Global keyboard listener for spacebar → pan-mode toggle. Ignores key
  // presses that originate from inputs/textareas so typing a space in a text
  // field doesn't hijack the canvas cursor.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== 'Space') return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
      // Only prevent page scroll when we're about to consume space for pan.
      e.preventDefault()
      setSpacePanMode(true)
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code !== 'Space') return
      setSpacePanMode(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle mouse button OR (left button + space-pan-mode) starts panning.
      const isMiddle = e.button === 1
      const isLeftWithSpace = e.button === 0 && spacePanMode
      if (isMiddle || isLeftWithSpace) {
        e.preventDefault()
        setIsPanning(true)
        panStart.current = { x: e.clientX, y: e.clientY }
      }
    },
    [spacePanMode],
  )

  const handleMouseMovePan = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning || !panStart.current) return
      const container = containerRef.current
      if (!container) return

      const dx = e.clientX - panStart.current.x
      const dy = e.clientY - panStart.current.y
      container.scrollLeft -= dx
      container.scrollTop -= dy
      panStart.current = { x: e.clientX, y: e.clientY }
    },
    [isPanning],
  )

  const handleMouseUpPan = useCallback(() => {
    setIsPanning(false)
    panStart.current = null
  }, [])

  const locked = meta.locked
  const stageW = meta.width * zoom
  const stageH = meta.height * zoom
  const isPlacing =
    activeTool === 'addText' || activeTool === 'addImage' || activeTool === 'addLoop'
  const sortedFields = [...pageFields].sort((a, b) => a.zIndex - b.zIndex)

  const getPointerPos = useCallback((): { x: number; y: number } | null => {
    const stage = stageRef.current
    if (!stage) return null
    const pointer = stage.getPointerPosition()
    if (!pointer) return null
    return { x: pointer.x / zoom, y: pointer.y / zoom }
  }, [zoom])

  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (locked) return
      if (e.evt.button === 2) return

      const clickedOnEmpty =
        e.target === e.target.getStage() ||
        e.target.name() === 'bg-image' ||
        e.target.name() === 'bg-rect'

      if (isPlacing && clickedOnEmpty) {
        const pos = getPointerPos()
        if (!pos) return
        const sx = snap(pos.x, gridSize, showGrid)
        const sy = snap(pos.y, gridSize, showGrid)
        startDrawing(sx, sy)
        setDrawRect({ x: sx, y: sy, w: 0, h: 0 })
        return
      }

      if (clickedOnEmpty) clearSelection()
    },
    [locked, isPlacing, getPointerPos, gridSize, showGrid, startDrawing, clearSelection],
  )

  const handleStageMouseMove = useCallback(() => {
    if (!isDrawing || !drawStart) return
    const pos = getPointerPos()
    if (!pos) return
    const sx = snap(pos.x, gridSize, showGrid)
    const sy = snap(pos.y, gridSize, showGrid)
    setDrawRect({
      x: Math.min(drawStart.x, sx),
      y: Math.min(drawStart.y, sy),
      w: Math.abs(sx - drawStart.x),
      h: Math.abs(sy - drawStart.y),
    })
  }, [isDrawing, drawStart, getPointerPos, gridSize, showGrid])

  const handleStageMouseUp = useCallback(() => {
    if (!isDrawing || !drawRect || !drawStart) return

    const { x, y, w, h } = drawRect
    if (w >= 10 && h >= 10) {
      const toolToType: Record<string, FieldType> = {
        addText: 'text',
        addImage: 'image',
        addLoop: 'table',
      }
      const fieldType = toolToType[activeTool]
      if (fieldType) {
        createField(fieldType, x, y, w, h)

        // Auto-select the newly created field so user can edit its details
        setTimeout(() => {
          const currentFields = useTemplateStore.getState().fields
          const newField = currentFields[currentFields.length - 1]
          if (newField) {
            selectField(newField.id)
          }
        }, 0)
      }
    }

    stopDrawing()
    setDrawRect(null)
    setActiveTool('select')
  }, [isDrawing, drawRect, drawStart, activeTool, selectField])

  const createField = useCallback(
    (type: FieldType, x: number, y: number, width: number, height: number) => {
      // `addField` in the store generates the final id; pass empty string here.
      const field = createDefaultField(type, {
        id: '',
        groupId: null,
        pageId: currentPageId,
        x,
        y,
        width,
        height,
        zIndex: fields.length,
      })
      addField(field)
    },
    [addField, fields.length, currentPageId],
  )

  const handleFieldClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>, fieldId: string) => {
      if (locked) return
      e.cancelBubble = true
      if (e.evt.shiftKey) toggleFieldSelection(fieldId)
      else selectField(fieldId)
    },
    [locked, selectField, toggleFieldSelection],
  )

  const handleFieldDblClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>, fieldId: string) => {
      if (locked) return
      e.cancelBubble = true
      // Double-click toggles: deselect if already selected, select if not
      if (selectedFieldIds.includes(fieldId)) {
        clearSelection()
      } else {
        selectField(fieldId)
      }
    },
    [locked, selectedFieldIds, selectField, clearSelection],
  )

  const handleFieldDragEnd = useCallback(
    (fieldId: string, node: Konva.Node) => {
      if (locked) return
      const x = snap(node.x(), gridSize, showGrid)
      const y = snap(node.y(), gridSize, showGrid)
      node.position({ x, y })
      moveField(fieldId, x, y)
    },
    [locked, gridSize, showGrid, moveField],
  )

  const handleContextMenu = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>, fieldId: string) => {
      e.evt.preventDefault()
      e.cancelBubble = true
      setContextMenu({ x: e.evt.clientX, y: e.evt.clientY, fieldId })
    },
    [setContextMenu],
  )

  // --- File upload handler (for empty state + drag-and-drop) ---
  function handleFileUpload(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const img = new window.Image()
      img.onload = () => {
        const bufReader = new FileReader()
        bufReader.onload = () => {
          setPendingBackground({
            dataUrl,
            buffer: bufReader.result as ArrayBuffer,
            width: img.naturalWidth,
            height: img.naturalHeight,
          })
          setShowPageSizeDialog(true)
        }
        bufReader.readAsArrayBuffer(file)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleFileUpload(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave() {
    setIsDragOver(false)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
    e.target.value = ''
  }

  // --- Add page handler ---
  //
  // "Same as previous" (bgType === 'inherit') is treated as a one-time
  // SNAPSHOT of the current previous page's background, NOT a live reference.
  // This matches user expectation: if the previous page changes or is deleted
  // later, the snapshotted page keeps its original look. (Fix for
  // BUG-F — removing the middle page silently changed downstream pages when
  // they stored backgroundType: 'inherit'.)
  function handleAddPage(bgType: PageBackgroundType, bgColor?: string, bgFile?: File) {
    setShowAddPageDialog(false)
    const pageId = generatePageId()
    const index = pages.length

    // Resolve "same as previous" into a concrete snapshot of the previous page.
    if (bgType === 'inherit') {
      const prev = pages[pages.length - 1]
      if (prev) {
        // Walk back through any previous inherit chain to the nearest concrete page.
        let source: PageDefinition | undefined = prev
        let cursor = pages.length - 1
        while (source && source.backgroundType === 'inherit' && cursor > 0) {
          cursor -= 1
          source = pages[cursor]
        }
        if (source && source.backgroundType === 'color') {
          const snap: PageDefinition = {
            id: pageId,
            index,
            backgroundType: 'color',
            backgroundColor: source.backgroundColor,
            backgroundFilename: null,
          }
          addPage(snap)
          setCurrentPage(pageId)
          return
        }
        if (source && source.backgroundType === 'image' && source.backgroundFilename) {
          // Reuse the previous page's image buffer + data URL so the snapshot
          // survives the source page being edited or deleted later.
          const prevDataUrl = pageBackgroundDataUrls.get(source.id) ?? null
          const prevBuffer = pageBackgroundBuffers.get(source.id) ?? null
          const snap: PageDefinition = {
            id: pageId,
            index,
            backgroundType: 'image',
            backgroundColor: null,
            backgroundFilename: `backgrounds/${pageId}.png`,
          }
          if (prevDataUrl && prevBuffer) {
            // Clone the ArrayBuffer so the store owns an independent copy.
            const cloned = prevBuffer.slice(0)
            addPage(snap, prevDataUrl, cloned)
          } else {
            addPage(snap)
          }
          setCurrentPage(pageId)
          return
        }
      }
      // No resolvable previous page — fall back to a white solid color.
      const fallback: PageDefinition = {
        id: pageId,
        index,
        backgroundType: 'color',
        backgroundColor: '#ffffff',
        backgroundFilename: null,
      }
      addPage(fallback)
      setCurrentPage(pageId)
      return
    }

    const page: PageDefinition = {
      id: pageId,
      index,
      backgroundType: bgType,
      backgroundColor: bgType === 'color' ? (bgColor ?? '#ffffff') : null,
      backgroundFilename: bgType === 'image' ? `backgrounds/${pageId}.png` : null,
    }

    if (bgType === 'image' && bgFile) {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const bufReader = new FileReader()
        bufReader.onload = () => {
          const buffer = bufReader.result as ArrayBuffer
          addPage(page, dataUrl, buffer)
          setCurrentPage(pageId)
        }
        bufReader.readAsArrayBuffer(bgFile)
      }
      reader.readAsDataURL(bgFile)
    } else {
      addPage(page)
      setCurrentPage(pageId)
    }
  }

  const reset = useTemplateStore((s) => s.reset)

  // --- Remove page handler ---
  //
  // Behaviour:
  //   - Non-last page (including the explicit page 0 PageDefinition when other
  //     pages exist): remove as today; fields on that page are reassigned to
  //     page 0 by the store's `removePage`, and remaining pages re-index.
  //   - Last page in the template (i.e. the user is about to delete the ONLY
  //     page the canvas is rendering): prompt for confirmation and, on OK,
  //     reset the whole template to the empty onboarding state so the user
  //     starts fresh from the background picker.
  //
  // "Last page" detection:
  //   Page 0 is implicit when `pages` is empty OR when `pages` contains no
  //   entry with `index === 0`. In either case the legacy single-page canvas
  //   counts as 1. Total visible pages = 1 (implicit page 0) + pages.length if
  //   page 0 is implicit, otherwise = pages.length (page 0 is explicit).
  function handleRemovePage(pageId: string | null) {
    const page0IsExplicit = pages.some((p) => p.index === 0)
    const visiblePageCount = page0IsExplicit ? pages.length : 1 + pages.length

    if (visiblePageCount <= 1) {
      const ok = window.confirm(
        'Deleting the last page will clear all fields and settings. Continue?',
      )
      if (!ok) return
      reset()
      setCurrentPage(null)
      clearSelection()
      return
    }

    // Non-last: delete as today.
    if (pageId === null) {
      // Deleting the implicit page 0 — promote the next page to page 0 by
      // clearing its pageId reference. `removePage` only handles explicit
      // PageDefinitions, so for page 0 we just clear its fields + legacy bg.
      const state = useTemplateStore.getState()
      const nextFields = state.fields.filter((f) => f.pageId !== null)
      state.loadFromManifest(
        state.meta,
        nextFields,
        state.fonts,
        state.groups,
        null,
        null,
        state.fontBuffers,
        state.placeholderBuffers,
        state.pages,
        state.pageBackgroundDataUrls,
        state.pageBackgroundBuffers,
      )
      setCurrentPage(state.pages[0]?.id ?? null)
      clearSelection()
      return
    }

    removePage(pageId)
    setCurrentPage(null)
    clearSelection()
  }

  // --- Grid ---
  const renderGrid = useCallback(() => {
    if (!showGrid) return null
    const lines: React.ReactElement[] = []
    for (let x = 0; x <= meta.width; x += gridSize) {
      lines.push(
        <Line
          key={`gv-${x}`}
          points={[x, 0, x, meta.height]}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1 / zoom}
          listening={false}
        />,
      )
    }
    for (let y = 0; y <= meta.height; y += gridSize) {
      lines.push(
        <Line
          key={`gh-${y}`}
          points={[0, y, meta.width, y]}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1 / zoom}
          listening={false}
        />,
      )
    }
    return lines
  }, [showGrid, meta.width, meta.height, gridSize, zoom])

  // --- Page navigation bar ---
  const renderPageBar = () => {
    // Only show when there is a background (canvas mode)
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          padding: '6px 12px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
          overflowX: 'auto',
        }}
      >
        {/* Page 0 tab (legacy/implicit first page). X button now rendered here
            too so the user can drop page 1 without opening a hidden menu. */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            className={`tg-btn ${currentPageId === null ? 'tg-btn--active' : ''}`}
            style={{ fontSize: '11px', padding: '4px 12px' }}
            onClick={() => {
              setCurrentPage(null)
              clearSelection()
            }}
          >
            Page 1
          </button>
          <button
            className="tg-btn tg-btn--danger"
            style={{ fontSize: '10px', padding: '2px 6px', marginLeft: '2px' }}
            title="Remove this page"
            data-testid="remove-page-1"
            onClick={() => handleRemovePage(null)}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Explicit pages */}
        {pages.map((page, idx) => (
          <div key={page.id} style={{ display: 'flex', alignItems: 'center' }}>
            <button
              className={`tg-btn ${currentPageId === page.id ? 'tg-btn--active' : ''}`}
              style={{ fontSize: '11px', padding: '4px 12px' }}
              onClick={() => {
                setCurrentPage(page.id)
                clearSelection()
              }}
            >
              Page {idx + 2}
            </button>
            <button
              className="tg-btn tg-btn--danger"
              style={{ fontSize: '10px', padding: '2px 6px', marginLeft: '2px' }}
              title="Remove this page"
              onClick={() => handleRemovePage(page.id)}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}

        {/* Add page button */}
        <button
          className="tg-btn"
          style={{ fontSize: '11px', padding: '4px 10px', marginLeft: '4px' }}
          onClick={() => setShowAddPageDialog(true)}
          title="Add new page"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Page
        </button>
      </div>
    )
  }

  // ===== EMPTY STATE: No background chosen (page 0 has no image and no color) =====
  // Page 0 is "empty" when:
  //   - there's no legacy backgroundDataUrl, AND
  //   - there's no explicit page-0 PageDefinition of type 'color'.
  const page0 = pages.find((p) => p.index === 0)
  const page0IsColor = page0?.backgroundType === 'color'
  if (!backgroundDataUrl && !page0IsColor) {
    return (
      <OnboardingPicker
        isDragOver={isDragOver}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onChooseImage={() => fileInputRef.current?.click()}
        onChooseColor={(hex) => {
          setPage0BackgroundColor(hex)
        }}
        fileInputRef={fileInputRef}
        onFileChange={handleInputChange}
        containerRef={containerRef}
      />
    )
  }

  // ===== CANVAS STATE: Background uploaded =====
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMovePan}
        onMouseUp={handleMouseUpPan}
        onMouseLeave={handleMouseUpPan}
        style={{
          width: '100%',
          flex: 1,
          // Fix for Workstream 5 (left-side zoom clipping): plain
          // `justify-content: center` + `align-items: center` with
          // `overflow: auto` has a long-standing bug where, when the flex
          // item is larger than the container, the overflow on the start
          // side (left/top) is unreachable — flex centers the item and
          // distributes negative free space only on the end side. The
          // `safe` keyword tells the browser to fall back to `start`
          // alignment when overflow would otherwise clip content, yielding
          // symmetric scrollbars on both axes at high zoom.
          display: 'flex',
          justifyContent: 'safe center',
          alignItems: 'safe center',
          cursor: isPanning ? 'grabbing' : spacePanMode ? 'grab' : undefined,
          overflow: 'auto',
          background: 'var(--canvas-bg)',
          minHeight: 0,
        }}
      >
        <div data-testid="canvas-stage-wrapper" style={{ flexShrink: 0 }}>
          <Stage
            ref={stageRef}
            width={stageW}
            height={stageH}
            scaleX={zoom}
            scaleY={zoom}
            style={{
              cursor: isPlacing ? 'crosshair' : 'default',
              boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
            }}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
            onContextMenu={(e) => e.evt.preventDefault()}
          >
            <Layer>
              {/* Background: image or solid color */}
              {bgImage ? (
                <KonvaImage
                  name="bg-image"
                  image={bgImage}
                  x={0}
                  y={0}
                  width={meta.width}
                  height={meta.height}
                  listening={!isPlacing}
                />
              ) : (
                <Rect
                  name="bg-rect"
                  x={0}
                  y={0}
                  width={meta.width}
                  height={meta.height}
                  fill={currentBgColor ?? '#ffffff'}
                />
              )}

              {/* Grid overlay */}
              {renderGrid()}

              {/* Fields for current page */}
              {sortedFields.map((field) => {
                const colors = FIELD_COLORS[field.type]
                const isSelected = selectedFieldIds.includes(field.id)

                return (
                  <Group
                    key={field.id}
                    id={`field-${field.id}`}
                    x={field.x}
                    y={field.y}
                    draggable={!locked}
                    onClick={(e) => handleFieldClick(e, field.id)}
                    onDblClick={(e) => handleFieldDblClick(e, field.id)}
                    onTap={(e) =>
                      handleFieldClick(e as unknown as Konva.KonvaEventObject<MouseEvent>, field.id)
                    }
                    onDblTap={(e) =>
                      handleFieldDblClick(
                        e as unknown as Konva.KonvaEventObject<MouseEvent>,
                        field.id,
                      )
                    }
                    onDragStart={() => {
                      // Select the field when drag starts — ensures Transformer
                      // attaches to the dragged field, not a previously selected one
                      if (!selectedFieldIds.includes(field.id)) {
                        selectField(field.id)
                      }
                    }}
                    onDragEnd={(e) => {
                      const group = e.target
                      handleFieldDragEnd(field.id, group)
                    }}
                    onTransformEnd={(e) => {
                      if (locked) return
                      const node = e.target
                      const scaleX = node.scaleX()
                      const scaleY = node.scaleY()
                      const newWidth = snap(Math.max(20, node.width() * scaleX), gridSize, showGrid)
                      const newHeight = snap(
                        Math.max(20, node.height() * scaleY),
                        gridSize,
                        showGrid,
                      )
                      // Reset scale
                      node.scaleX(1)
                      node.scaleY(1)
                      // Update store
                      moveField(
                        field.id,
                        snap(node.x(), gridSize, showGrid),
                        snap(node.y(), gridSize, showGrid),
                      )
                      resizeField(field.id, newWidth, newHeight)
                    }}
                    onContextMenu={(e) => handleContextMenu(e, field.id)}
                  >
                    <Rect
                      width={field.width}
                      height={field.height}
                      fill={colors.fill}
                      stroke={isSelected ? SELECTED_STROKE : colors.stroke}
                      strokeWidth={isSelected ? 2 / zoom : 1 / zoom}
                      cornerRadius={2 / zoom}
                      listening={true}
                      onClick={(e) => handleFieldClick(e, field.id)}
                    />
                    <Text
                      text={fieldCanvasLabel(field)}
                      x={4 / zoom}
                      y={4 / zoom}
                      fontSize={11 / zoom}
                      fontFamily="sans-serif"
                      fill={colors.text}
                      width={field.width - 8 / zoom}
                      ellipsis={true}
                      wrap="none"
                      listening={false}
                    />
                    <Text
                      text={field.type.toUpperCase()}
                      x={4 / zoom}
                      y={field.height - 16 / zoom}
                      fontSize={9 / zoom}
                      fontFamily="sans-serif"
                      fontStyle="bold"
                      fill={colors.text}
                      opacity={0.7}
                      listening={false}
                    />
                  </Group>
                )
              })}

              {/* Draw-to-place rectangle */}
              {isDrawing && drawRect && (
                <Rect
                  x={drawRect.x}
                  y={drawRect.y}
                  width={drawRect.w}
                  height={drawRect.h}
                  fill="rgba(233,69,96,0.15)"
                  stroke="#e94560"
                  strokeWidth={1 / zoom}
                  dash={[6 / zoom, 3 / zoom]}
                  listening={false}
                />
              )}

              {/* Transformer */}
              <Transformer
                ref={transformerRef}
                borderStroke={SELECTED_STROKE}
                borderStrokeWidth={1.5 / zoom}
                anchorStroke={SELECTED_STROKE}
                anchorFill="#ffffff"
                anchorSize={8 / zoom}
                anchorCornerRadius={2 / zoom}
                rotateEnabled={false}
                keepRatio={false}
                ignoreStroke={true}
                boundBoxFunc={(_oldBox, newBox) => {
                  const width = Math.max(20, newBox.width)
                  const height = Math.max(20, newBox.height)
                  return { ...newBox, width, height }
                }}
                enabledAnchors={[
                  'top-left',
                  'top-center',
                  'top-right',
                  'middle-left',
                  'middle-right',
                  'bottom-left',
                  'bottom-center',
                  'bottom-right',
                ]}
              />
            </Layer>
          </Stage>
        </div>
      </div>

      {/* Page navigation bar */}
      {renderPageBar()}

      {/* Add page dialog */}
      {showAddPageDialog && (
        <AddPageDialog onClose={() => setShowAddPageDialog(false)} onAdd={handleAddPage} />
      )}
    </div>
  )
}
